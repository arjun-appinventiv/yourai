// ─── Chat session timer (AI-time meter) ────────────────────────────
//
// Module-level singleton — the timer must survive component re-renders
// and Sidebar-driven panel swaps. Mirrors the workflowRunner subscribe
// pattern: components subscribe, the singleton notifies on every tick
// and on state changes.
//
// Lifecycle, per the design:
//   • idle      — no chat session active
//   • running   — actively counting (user sent a message recently)
//   • paused    — 2 min idle reached, accumulated seconds frozen
//
// One timer at a time (CosmoLex model). Chat sessions are inherently
// serial — starting a new thread finalizes the prior one and opens the
// BillingDraftModal.

type Status = 'idle' | 'running' | 'paused';

const IDLE_PAUSE_MS = 2 * 60 * 1000;

interface State {
  status: Status;
  threadId: string | null;
  threadTitle: string | null;
  startedAt: string | null;            // ISO of first activity
  lastActivityAt: number;              // epoch ms
  accumulatedSeconds: number;          // committed active seconds
  runningSegmentStart: number | null;  // epoch ms; null when paused/idle
}

let state: State = {
  status: 'idle',
  threadId: null,
  threadTitle: null,
  startedAt: null,
  lastActivityAt: 0,
  accumulatedSeconds: 0,
  runningSegmentStart: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((l) => {
    try { l(); } catch { /* swallow */ }
  });
}

export function subscribeTimer(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function commitRunningSegment(at: number): void {
  if (state.runningSegmentStart != null) {
    const delta = Math.max(0, Math.floor((at - state.runningSegmentStart) / 1000));
    state.accumulatedSeconds += delta;
    state.runningSegmentStart = null;
  }
}

export interface TimerSnapshot {
  status: Status;
  elapsedSeconds: number;
  threadId: string | null;
  threadTitle: string | null;
  startedAt: string | null;
  hasSession: boolean;
}

export function getTimerSnapshot(): TimerSnapshot {
  const now = Date.now();
  let elapsed = state.accumulatedSeconds;
  if (state.status === 'running' && state.runningSegmentStart != null) {
    elapsed += Math.max(0, Math.floor((now - state.runningSegmentStart) / 1000));
  }
  return {
    status: state.status,
    elapsedSeconds: elapsed,
    threadId: state.threadId,
    threadTitle: state.threadTitle,
    startedAt: state.startedAt,
    hasSession: state.status !== 'idle' || state.accumulatedSeconds > 0,
  };
}

// Call on every send / activity. If the timer is idle for the given
// thread it boots; if it was paused (idle-detection), it resumes.
export function startOrResumeTimer(threadId: string, threadTitle?: string): void {
  const now = Date.now();
  // Different thread coming in without an explicit finalize — the caller
  // forgot to finalize. Treat the new thread as a fresh session and DROP
  // the prior one (better than billing the wrong matter).
  if (state.threadId && state.threadId !== threadId) {
    discardTimer();
  }
  if (!state.threadId) {
    state.threadId = threadId;
    state.threadTitle = threadTitle || null;
    state.startedAt = new Date(now).toISOString();
  } else if (threadTitle && !state.threadTitle) {
    state.threadTitle = threadTitle;
  }
  if (state.status !== 'running') {
    state.runningSegmentStart = now;
    state.status = 'running';
  }
  state.lastActivityAt = now;
  notify();
}

// Lighter-touch: bot reply landed, user is reading. Don't restart the
// running segment but DO bump lastActivityAt so idle-detection waits.
export function recordActivity(): void {
  if (state.status === 'idle') return;
  state.lastActivityAt = Date.now();
  notify();
}

export function pauseTimerIfIdle(): void {
  if (state.status !== 'running') return;
  const now = Date.now();
  if (now - state.lastActivityAt >= IDLE_PAUSE_MS) {
    // Freeze accumulated time at the moment of last activity (don't
    // count the 2 idle minutes — that's the whole point).
    commitRunningSegment(state.lastActivityAt);
    state.status = 'paused';
    notify();
  }
}

export function manualPauseTimer(): void {
  if (state.status !== 'running') return;
  commitRunningSegment(Date.now());
  state.status = 'paused';
  notify();
}

export function manualResumeTimer(): void {
  if (state.status !== 'paused') return;
  state.runningSegmentStart = Date.now();
  state.lastActivityAt = Date.now();
  state.status = 'running';
  notify();
}

export interface FinalizedSession {
  threadId: string;
  threadTitle: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
}

// Stop the timer and return the captured session for the draft modal.
// Returns null if there's nothing to bill (no session ever started).
export function finalizeTimer(): FinalizedSession | null {
  if (!state.threadId || state.accumulatedSeconds === 0 && state.runningSegmentStart == null) {
    return null;
  }
  const now = Date.now();
  commitRunningSegment(now);
  const result: FinalizedSession = {
    threadId: state.threadId,
    threadTitle: state.threadTitle,
    startedAt: state.startedAt!,
    endedAt: new Date(now).toISOString(),
    durationSeconds: state.accumulatedSeconds,
  };
  resetState();
  return result;
}

export function discardTimer(): void {
  resetState();
  notify();
}

function resetState(): void {
  state = {
    status: 'idle',
    threadId: null,
    threadTitle: null,
    startedAt: null,
    lastActivityAt: 0,
    accumulatedSeconds: 0,
    runningSegmentStart: null,
  };
}

// ─── Tick loop ─────────────────────────────────────────────────────
// Drives both the visible HH:MM:SS pill (notify every 1 s so seconds
// tick over) and idle-pause detection. Idempotent — call any number
// of times.
let tickHandle: number | null = null;

export function ensureTickLoop(): void {
  if (tickHandle != null || typeof window === 'undefined') return;
  tickHandle = window.setInterval(() => {
    pauseTimerIfIdle();
    // Even when idle/paused we don't strictly need to notify, but the
    // cost is one Set-iteration per second and it keeps subscribers
    // accurate when a paused-banner is showing relative-time text.
    notify();
  }, 1000);
}

export function stopTickLoop(): void {
  if (tickHandle != null) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
}
