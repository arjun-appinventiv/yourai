import { useEffect, useState, useRef, useCallback } from 'react';
import { getBlockReason, type BlockReason, logout } from './auth';

export type SessionState =
  | { status: 'active' }
  | { status: 'blocked'; reason: Exclude<BlockReason, null> }
  | { status: 'idle-warning' }
  | { status: 'timed-out' };

// Note: the previous implementation included a 'superseded' state that kicked
// the user out if the same account was used elsewhere. That was a mistake —
// one account should work across multiple tabs, portals, and devices without
// friction. The session-token registry (`claimSession` / `releaseSession` in
// lib/auth) is still wired for future use but is no longer enforced here.

interface SessionGuardOptions {
  /** Session idle timeout in ms. Default: 30 minutes. Set to 0 to disable. */
  idleTimeoutMs?: number;
  /** How long before timeout to show the warning modal. Default: 2 minutes. */
  warningLeadMs?: number;
  /** How often to poll for block status. Default: 30 seconds. */
  blockPollMs?: number;
  /** Optional callback fired once on first block detection (for cleanup). */
  onBlocked?: (reason: Exclude<BlockReason, null>) => void;
  /** Optional callback fired once when idle timeout fires. */
  onTimedOut?: () => void;
}

/**
 * YourAI session guard hook — centralises three concerns:
 *  1. Detects when the Super Admin blocks the user or their tenant
 *     (polling + cross-tab storage events + window-focus check)
 *  2. Tracks user idle time and triggers an inactivity timeout
 *  3. Exposes a single state so the consumer can render the right screen
 *
 * Returns { state, stayActive, signOut } — the consumer decides how to render
 * the blocked / idle-warning / timed-out states.
 */
export function useSessionGuard(options: SessionGuardOptions = {}) {
  const {
    idleTimeoutMs = 30 * 60 * 1000,   // 30 min
    warningLeadMs = 2 * 60 * 1000,    // 2 min
    blockPollMs = 30 * 1000,           // 30 s
    onBlocked,
    onTimedOut,
  } = options;

  const [state, setState] = useState<SessionState>({ status: 'active' });
  const lastActivityRef = useRef<number>(Date.now());
  const onBlockedFiredRef = useRef<boolean>(false);
  const onTimedOutFiredRef = useRef<boolean>(false);

  // ─── Helper: read current user email ─────────────────────────────────
  const getEmail = () => {
    try { return localStorage.getItem('yourai_current_email') || ''; } catch { return ''; }
  };

  // ─── Block detection ─────────────────────────────────────────────────
  // Only checks if the user or their tenant has been blocked by a Super-Admin.
  // Concurrent sessions (same account on multiple tabs / devices) are intentionally
  // allowed — see the comment on SessionState above.
  const checkBlock = useCallback(() => {
    const email = getEmail();
    if (!email) return;

    const reason = getBlockReason(email);
    if (reason) {
      setState((prev) => prev.status === 'blocked' ? prev : { status: 'blocked', reason });
      if (!onBlockedFiredRef.current) {
        onBlockedFiredRef.current = true;
        try { onBlocked?.(reason); } catch { /* ignore */ }
      }
    }
  }, [onBlocked]);

  // Poll + focus + cross-tab storage event (for block detection only)
  useEffect(() => {
    checkBlock();
    const interval = setInterval(checkBlock, blockPollMs);
    const onFocus = () => checkBlock();
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'yourai_mgmt_users' ||
        e.key === 'yourai_mgmt_tenants' ||
        e.key === null
      ) {
        checkBlock();
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [checkBlock, blockPollMs]);

  // ─── Idle timeout ─────────────────────────────────────────────────────
  useEffect(() => {
    if (idleTimeoutMs <= 0) return;

    const bump = () => {
      lastActivityRef.current = Date.now();
      // If we were showing an idle warning and the user touched something, clear it
      setState((prev) => prev.status === 'idle-warning' ? { status: 'active' } : prev);
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, bump, { passive: true }));

    const tick = setInterval(() => {
      // Never override blocked state with idle transitions
      setState((prev) => {
        if (prev.status === 'blocked' || prev.status === 'timed-out') return prev;
        const idleFor = Date.now() - lastActivityRef.current;
        if (idleFor >= idleTimeoutMs) {
          if (!onTimedOutFiredRef.current) {
            onTimedOutFiredRef.current = true;
            try { onTimedOut?.(); } catch { /* ignore */ }
          }
          return { status: 'timed-out' };
        }
        if (idleFor >= idleTimeoutMs - warningLeadMs) {
          return prev.status === 'idle-warning' ? prev : { status: 'idle-warning' };
        }
        return prev;
      });
    }, 5000);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, bump));
      clearInterval(tick);
    };
  }, [idleTimeoutMs, warningLeadMs, onTimedOut]);

  // ─── Consumer actions ────────────────────────────────────────────────
  const stayActive = useCallback(() => {
    lastActivityRef.current = Date.now();
    setState({ status: 'active' });
  }, []);

  const signOut = useCallback(async () => {
    try { await logout(); } catch { /* ignore */ }
    try {
      localStorage.removeItem('yourai_current_email');
      localStorage.removeItem('yourai_user_profile');
    } catch { /* ignore */ }
  }, []);

  return { state, stayActive, signOut };
}
