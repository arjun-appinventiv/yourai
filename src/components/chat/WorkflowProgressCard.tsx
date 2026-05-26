/* ─────────────── Workflow Progress Card ───────────────
 *
 * Renders live step-by-step progress for a WorkflowRun inside the chat
 * thread where it was started. Subscribes to runner state so updates
 * arrive even if the user navigates away and returns.
 *
 * Step states:
 *   pending   → grey circle
 *   running   → spinner, navy name, elapsed counter
 *   complete  → green check, duration, collapsed output (click to expand)
 *   failed    → red X, error line, Retry step button
 *   cancelled → grey dash, 'Cancelled'
 *
 * On full completion, the card transitions to a compact 'complete'
 * header and renders a WorkflowReportCard directly below (Part 5).
 */

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Briefcase, Database, Check, X, Loader, AlertCircle,
  ChevronDown, Minus, CircleDashed,
  FileText as FileTextIcon, Search as SearchIcon, GitCompare,
  FileOutput, BookOpen, ShieldCheck,
} from 'lucide-react';
import {
  type WorkflowRun, type WorkflowRunStep, type WorkflowTemplate,
  type WorkflowOperation,
  getRun, getTemplate,
} from '../../lib/workflow';
import { subscribeRun, cancelRun } from '../../lib/workflowRunner';

const OP_ICON: Record<WorkflowOperation, React.ComponentType<{ size?: number }>> = {
  read_documents: FileTextIcon,
  analyse_clauses: SearchIcon,
  compare_against_standard: GitCompare,
  generate_report: FileOutput,
  research_precedents: BookOpen,
  compliance_check: ShieldCheck,
};

export interface WorkflowProgressCardProps {
  runId: string;
  workspaceName?: string | null;
  onComplete?: (run: WorkflowRun) => void;
  /**
   * When 'embedded', the card renders with no outer chrome (no border,
   * no accent stripe, no border-radius, no shadow) and skips its own
   * header — it assumes a parent (e.g. RunRow in the Run Panel) is
   * providing those. Default 'standalone' renders the full card.
   */
  variant?: 'standalone' | 'embedded';
  /** Compact panel mode: keeps chrome but adds step-count strip, mini progress bar, and estimated remaining. */
  panelMode?: boolean;
}

export default function WorkflowProgressCard({ runId, workspaceName, onComplete, variant = 'standalone', panelMode = false }: WorkflowProgressCardProps) {
  const [run, setRun] = useState<WorkflowRun | null>(() => getRun(runId));
  const [template, setTemplate] = useState<WorkflowTemplate | null>(() => run ? getTemplate(run.templateId) : null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0); // seconds since currently-running step started
  const completeFiredRef = useRef(false);

  /* Subscribe + seed */
  useEffect(() => {
    const initial = getRun(runId);
    setRun(initial);
    if (initial) setTemplate(getTemplate(initial.templateId));
    const unsub = subscribeRun(runId, (r) => {
      setRun({ ...r });
    });
    return () => unsub();
  }, [runId]);

  /* Tick the elapsed counter for the running step */
  useEffect(() => {
    if (!run) return;
    if (run.status !== 'running') { setElapsed(0); return; }
    const step = run.steps[run.currentStepIndex];
    if (!step || step.status !== 'running' || !step.startedAt) { setElapsed(0); return; }
    const start = new Date(step.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [run]);

  /* Fire onComplete once */
  useEffect(() => {
    if (!run) return;
    if (run.status === 'complete' && !completeFiredRef.current) {
      completeFiredRef.current = true;
      onComplete?.(run);
    }
  }, [run, onComplete]);

  if (!run || !template) {
    return null;
  }

  const inWorkspace = !!run.workspaceId;
  const completedCount = run.steps.filter((s) => s.status === 'complete').length;
  const total = run.steps.length;
  const progressPct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const isDone = run.status === 'complete';
  const isFailed = run.status === 'failed';
  const isCancelled = run.status === 'cancelled';
  const estimatedRemaining = Math.max(
    0,
    Math.round(((template.estimatedTotalSeconds || 0) / Math.max(1, total)) * Math.max(0, total - completedCount)),
  );

  const totalDuration = run.steps.reduce((a, s) => a + (s.durationSeconds || 0), 0);

  const isEmbedded = variant === 'embedded';

  /* ─── Render ─── */
  return (
    <div
      style={isEmbedded ? {
        background: 'transparent',
      } : {
        border: '1px solid var(--border)', borderRadius: 12, background: '#fff',
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(10,36,99,0.04)',
      }}
    >
      {/* Accent stripe — only in standalone */}
      {!isEmbedded && (
        <div style={{ height: 3, background: isDone ? '#2A9D6E' : isFailed ? '#C44F4F' : 'var(--brand-navy)' }} />
      )}

      {/* Header — skipped in embedded mode (parent RunRow renders its own) */}
      {!isEmbedded && (
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Briefcase size={16} style={{ color: 'var(--navy)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
              {template.name}
            </h4>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--ice-warm)', color: 'var(--navy)', border: '1px solid var(--border)', fontWeight: 500 }}>
              {template.practiceArea}
            </span>
            {isDone && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#E7F3E9', color: '#5CA868', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Check size={10} /> Complete · {totalDuration}s
              </span>
            )}
            {isFailed && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#F9E7E7', color: '#C65454', fontWeight: 600 }}>
                Failed
              </span>
            )}
            {isCancelled && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#F3F4F6', color: '#6B7280', fontWeight: 600 }}>
                Cancelled
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            {inWorkspace ? (
              <span className="flex items-center gap-1"><Briefcase size={11} /> {workspaceName || 'Workspace'}</span>
            ) : (
              <span className="flex items-center gap-1"><Database size={11} /> Global KB</span>
            )}
            <span>·</span>
            <span>{completedCount} of {total} complete</span>
          </div>
        </div>

        {run.status === 'running' && (
          <div style={{ flexShrink: 0 }}>
            {confirmingCancel ? (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stop this workflow? Progress will be lost.</span>
                <button onClick={() => setConfirmingCancel(false)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)' }}>
                  Keep running
                </button>
                <button
                  onClick={() => { cancelRun(runId); setConfirmingCancel(false); }}
                  style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#C65454', color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                >
                  Stop workflow
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingCancel(true)}
                style={{
                  display: 'block',
                  width: panelMode ? '100%' : 'auto',
                  textAlign: 'center',
                  fontSize: 11,
                  color: panelMode ? 'var(--text-tertiary)' : '#C65454',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  marginTop: panelMode ? 4 : 0,
                }}
              >
                {panelMode ? 'Cancel run' : 'Cancel'}
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {panelMode && run.status === 'running' && (
        <div style={{ padding: '0 18px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--text-tertiary)', paddingBottom: 6 }}>
            <span>{template.practiceArea} · {run.workspaceId ? 'Workspace KB' : 'Global KB'}</span>
            <span>{completedCount} / {total} steps</span>
          </div>
          <div style={{ height: 2, background: 'var(--border-default)', margin: '0 0 6px', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--brand-navy)', borderRadius: 2, transition: 'width 0.4s ease', width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Steps */}
      <div style={{ padding: isEmbedded ? '4px 0 8px' : '0 18px 12px' }}>
        {run.steps.map((step, i) => (
          <StepRow
            key={step.stepId}
            step={step}
            index={i}
            panelMode={panelMode}
            elapsed={i === run.currentStepIndex && step.status === 'running' ? elapsed : null}
            expanded={expandedSteps.has(step.stepId)}
            onToggle={() => setExpandedSteps((prev) => {
              const next = new Set(prev);
              if (next.has(step.stepId)) next.delete(step.stepId); else next.add(step.stepId);
              return next;
            })}
          />
        ))}
      </div>

      {panelMode && run.status === 'running' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)', padding: '0 10px 8px' }}>
          <span>Started {formatTime(run.startedAt)}</span>
          <span>~{estimatedRemaining}s remaining</span>
        </div>
      )}

      {/* Progress bar — only in standalone; RunRow renders its own in embedded mode */}
      {!panelMode && !isEmbedded && !isDone && !isCancelled && (
        <div style={{ padding: '0 18px 14px' }}>
          <div style={{ height: 4, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`, height: '100%',
              background: isFailed ? '#C44F4F' : 'var(--brand-navy)',
              transition: 'width 400ms',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Step row ─── */

interface StepRowProps {
  step: WorkflowRunStep;
  index: number;
  elapsed: number | null;
  expanded: boolean;
  onToggle: () => void;
  panelMode: boolean;
}

function StepRow({ step, index, elapsed, expanded, onToggle, panelMode }: StepRowProps) {
  const IconComp = OP_ICON[step.operation];

  const indicator = (() => {
    if (panelMode) {
      if (step.status === 'complete') return (
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#EAF3DE', color: '#3B6D11', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          <Check size={11} strokeWidth={3} />
        </div>
      );
      if (step.status === 'running') return (
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--brand-navy)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, animation: 'pulse 1.2s ease-in-out infinite' }}>
          {index + 1}
        </div>
      );
      if (step.status === 'pending') return (
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-surface-alt)', border: '1px solid var(--text-tertiary)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
          {index + 1}
        </div>
      );
    }
    if (step.status === 'pending')   return <CircleDashed size={16} style={{ color: '#D1D5DB' }} />;
    if (step.status === 'running')   return <Loader size={16} className="animate-spin" style={{ color: 'var(--navy)' }} />;
    if (step.status === 'complete')  return <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#5CA868', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={10} color="#fff" strokeWidth={3} /></div>;
    if (step.status === 'failed')    return <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#C65454', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={10} color="#fff" strokeWidth={3} /></div>;
    return <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={10} color="#9CA3AF" /></div>;
  })();

  const nameColor =
    step.status === 'failed' ? '#C65454' :
    step.status === 'running' ? 'var(--text-primary)' :
    step.status === 'pending' || step.status === 'skipped' ? 'var(--text-tertiary)' :
    panelMode && step.status === 'complete' ? 'var(--text-secondary)' :
    'var(--text-primary)';

  const clickable = step.status === 'complete' && !!step.output;

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
      <div
        onClick={clickable ? onToggle : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: clickable ? 'pointer' : 'default',
        }}
      >
        <div style={{ flexShrink: 0 }}>{indicator}</div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', flexShrink: 0 }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <IconComp size={12} />
          <span style={{ fontSize: 13, fontWeight: step.status === 'running' ? 600 : 500, color: nameColor }}>
            {step.name || 'Step'}
          </span>
          {step.status === 'running' && elapsed !== null && (
            <span style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-muted)' }}>
              Running… {elapsed}s
            </span>
          )}
          {!panelMode && step.status === 'complete' && step.durationSeconds != null && (
            <span style={{ fontSize: 11, color: '#5CA868', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              {step.durationSeconds}s
            </span>
          )}
          {step.status === 'skipped' && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Skipped</span>
          )}
        </div>
        {panelMode && step.status === 'complete' && step.durationSeconds != null && (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{step.durationSeconds}s</span>
        )}
        {panelMode && step.status === 'running' && (
          <span style={{ width: 12, height: 12, border: '1.5px solid #E8EEF4', borderTopColor: '#0B1D3A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0, display: 'inline-block' }} />
        )}
        {!panelMode && clickable && (
          <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms', flexShrink: 0 }} />
        )}
      </div>

      {/* Failed state body */}
      {step.status === 'failed' && (
        <div style={{ marginTop: 8, marginLeft: 26, padding: '8px 12px', borderRadius: 8, background: '#FEF7F7', border: '1px solid #F9E7E7', fontSize: 12, color: '#6B1E1E', lineHeight: 1.55 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <AlertCircle size={12} style={{ color: '#C65454', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              {step.error || 'This step did not complete.'}
            </div>
          </div>
        </div>
      )}

      {/* Expanded output for complete steps */}
      {step.status === 'complete' && expanded && step.output && (
        <div style={{ marginTop: 8, marginLeft: 26, padding: '10px 14px', borderRadius: 8, background: '#FBFAF7', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.7 }}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p style={{ margin: '0 0 6px 0' }}>{children}</p>,
              strong: ({ children }) => <strong style={{ color: 'var(--navy)' }}>{children}</strong>,
            }}
          >
            {step.output}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'just now';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

