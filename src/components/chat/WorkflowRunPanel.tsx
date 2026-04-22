/* ─────────────── Workflow Run Panel (multi-run) ───────────────
 *
 * Right-docked panel that shows ALL active and recently finished
 * workflow runs. Users can kick off multiple workflows in parallel
 * and monitor them side-by-side, Cursor-style.
 *
 * Layout:
 *   ┌──────────────────────────────┐
 *   │ WORKFLOW RUNS (2 active)     │
 *   │                              │
 *   │ ▼ Due Diligence · Running… ◉ │  ← auto-expanded while running
 *   │   [ProgressCard]             │
 *   │                              │
 *   │ ▶ Contract Risk · Running… ◉ │  ← collapsed by user
 *   │                              │
 *   │ ▶ NDA Checker · Complete ✓   │  ← collapsed by default on done
 *   │                              │
 *   │ ▶ Compliance Audit · Failed ✗│
 *   └──────────────────────────────┘
 *
 * State model:
 *   - Lists runs from localStorage (listRuns), newest first
 *   - Filters to the current user and to status ∈ running|complete|failed
 *     within the last 24 hours (older runs live on the Workflow Templates
 *     page "Recent runs" section)
 *   - Subscribes to each visible running run so progress updates live
 *   - Expands running runs by default; user can collapse
 *   - Completed/failed runs start collapsed; user can expand to see report
 */

import React, { useEffect, useMemo, useState } from 'react';
import { X, ChevronDown, ChevronRight, Loader, CheckCircle2, XCircle, Zap, Maximize2, Minimize2 } from 'lucide-react';
import { listRuns, getRun, type WorkflowRun } from '../../lib/workflow';
import { subscribeRun } from '../../lib/workflowRunner';
import WorkflowProgressCard from './WorkflowProgressCard';
import WorkflowReportCard from './WorkflowReportCard';

interface Props {
  userId: string;
  onClose: () => void;
  /** Optional: run id to auto-expand (e.g. the one we just started) */
  focusRunId?: string | null;
}

function runBucket(r: WorkflowRun): 'running' | 'complete' | 'failed' | 'cancelled' {
  return r.status;
}

export default function WorkflowRunPanel({ userId, onClose, focusRunId }: Props) {
  const [tick, setTick] = useState(0); // forces re-read of listRuns on subscription ticks
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(focusRunId ? [focusRunId] : []));
  // Fullscreen — overlays everything, takes whole viewport. Useful when the
  // user is drilling into a long Report and wants reading room.
  const [fullscreen, setFullscreen] = useState(false);

  // Pull runs fresh on each tick
  const runs = useMemo<WorkflowRun[]>(() => {
    const all = listRuns().filter((r) => r.userId === userId);
    const DAY = 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - DAY;
    const recent = all.filter((r) => {
      if (r.status === 'running') return true;
      const when = r.completedAt ? new Date(r.completedAt).getTime() : new Date(r.startedAt).getTime();
      return when >= cutoff;
    });
    // Running first, then by most recent start
    return recent.sort((a, b) => {
      const ar = a.status === 'running' ? 0 : 1;
      const br = b.status === 'running' ? 0 : 1;
      if (ar !== br) return ar - br;
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tick]);

  // Subscribe to all running runs so progress updates bump `tick`
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    for (const r of runs) {
      if (r.status !== 'running') continue;
      unsubs.push(subscribeRun(r.id, () => setTick((n) => n + 1)));
    }
    return () => { unsubs.forEach((u) => u()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs.map((r) => r.id + r.status).join('|')]);

  // Auto-expand any new running run that wasn't in the set yet
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const r of runs) {
        if (r.status === 'running' && !next.has(r.id) && !prev.has(r.id)) {
          next.add(r.id);
        }
      }
      if (focusRunId && !next.has(focusRunId)) next.add(focusRunId);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs.length, focusRunId]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const activeCount = runs.filter((r) => r.status === 'running').length;

  return (
    <div
      style={fullscreen ? {
        position: 'fixed', inset: 0, zIndex: 90,
        background: '#FAFBFC',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 0 1px var(--border)',
      } : {
        width: 480, flexShrink: 0,
        background: '#FAFBFC',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        minHeight: 0,
        boxShadow: '-4px 0 16px rgba(10,36,99,0.04)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4B5563' }}>
            Workflow Runs
          </div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--navy)', marginTop: 2 }}>
            {runs.length === 0 ? 'No recent runs' : activeCount > 0 ? `${activeCount} running · ${runs.length - activeCount} recent` : `${runs.length} recent`}
          </div>
        </div>
        <button
          onClick={() => setFullscreen((v) => !v)}
          title={fullscreen ? 'Exit fullscreen' : 'Expand to fullscreen'}
          style={{ padding: 8, borderRadius: 8, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', display: 'flex' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
        >
          {fullscreen ? <Minimize2 size={15} style={{ color: '#4B5563' }} /> : <Maximize2 size={15} style={{ color: '#4B5563' }} />}
        </button>
        <button
          onClick={onClose}
          title="Close"
          style={{ padding: 8, borderRadius: 8, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', display: 'flex' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
        >
          <X size={16} style={{ color: '#4B5563' }} />
        </button>
      </div>

      {/* Body — list of runs */}
      <div style={{ flex: 1, overflowY: 'auto', padding: fullscreen ? '20px 20px 40px' : '14px 14px 32px' }}>
        {runs.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: fullscreen ? 880 : 'none', margin: fullscreen ? '0 auto' : 0 }}>
            {runs.map((r) => (
              <RunRow
                key={r.id}
                run={r}
                isExpanded={expanded.has(r.id)}
                onToggle={() => toggle(r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#4B5563' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <Zap size={22} style={{ color: 'var(--navy)' }} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
        No workflow runs yet
      </div>
      <div style={{ fontSize: 12, marginTop: 6, maxWidth: 300, margin: '6px auto 0', lineHeight: 1.55 }}>
        Kick off a workflow from the Workflow Templates page and it will appear here. You can run multiple in parallel.
      </div>
    </div>
  );
}

/* ─── Individual run row — collapsible header + expanded body ─── */
function RunRow({ run, isExpanded, onToggle }: { run: WorkflowRun; isExpanded: boolean; onToggle: () => void }) {
  const isRunning = run.status === 'running';
  const isComplete = run.status === 'complete';
  const isFailed = run.status === 'failed';
  const isCancelled = run.status === 'cancelled';

  const accent =
    isRunning ? 'var(--navy)' :
    isComplete ? '#5CA868' :
    isFailed ? '#C65454' :
    '#9CA3AF';

  const bg =
    isRunning ? '#FFFFFF' :
    isComplete ? '#F5FBF6' :
    isFailed ? '#FBF4F4' :
    '#F9FAFB';

  const statusText =
    isRunning ? `Running · step ${Math.min((run.currentStepIndex ?? 0) + 1, run.steps.length)}/${run.steps.length}` :
    isComplete ? `Complete · ${run.steps.length} step${run.steps.length !== 1 ? 's' : ''}` :
    isFailed ? 'Failed' :
    'Cancelled';

  const StatusIcon = isRunning ? Loader : isComplete ? CheckCircle2 : isFailed ? XCircle : XCircle;

  return (
    <div style={{ border: `1px solid ${isRunning ? '#DDE6F5' : 'var(--border)'}`, borderRadius: 12, background: bg, overflow: 'hidden' }}>
      {/* Collapsible header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {isExpanded
          ? <ChevronDown size={14} style={{ color: '#4B5563', flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ color: '#4B5563', flexShrink: 0 }} />
        }
        <StatusIcon
          size={14}
          className={isRunning ? 'animate-spin' : ''}
          style={{ color: accent, flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {run.templateName}
          </div>
          <div style={{ fontSize: 11, color: '#4B5563', marginTop: 1 }}>
            {statusText}
          </div>
        </div>
        {/* Mini progress bar for running runs */}
        {isRunning && (
          <div style={{ width: 48, height: 3, borderRadius: 2, background: '#E5E7EB', overflow: 'hidden', flexShrink: 0 }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round(((run.currentStepIndex ?? 0) / Math.max(1, run.steps.length)) * 100)}%`,
                background: accent,
                transition: 'width 300ms ease',
              }}
            />
          </div>
        )}
      </button>

      {/* Expanded body: ProgressCard + (if complete) ReportCard */}
      {isExpanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <WorkflowProgressCard runId={run.id} workspaceName={null} />
            {run.status === 'complete' && run.reportCardData && (
              <WorkflowReportCard report={run.reportCardData} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
