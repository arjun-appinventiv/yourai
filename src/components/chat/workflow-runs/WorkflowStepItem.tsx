import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Eye,
  FileOutput,
  FileText,
  GitCompare,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { type WorkflowOperation, type WorkflowRunStep, type WorkflowStep, OPERATION_CONFIG } from '../../../lib/workflow';
import StatusBadge from './StatusBadge';

export default function WorkflowStepItem({
  step,
  stepNumber,
  isLast,
  templateStep,
  elapsed,
}: {
  step: WorkflowRunStep;
  stepNumber: number;
  isLast?: boolean;
  templateStep?: WorkflowStep;
  elapsed: number | null;
}) {
  // PM 2026-05-20: action row trimmed to "Copy output" only — Retry step,
  // Edit input, and View details were all dropped. So no editor state and
  // no expand-on-click handlers besides the row's own collapse toggle.
  const [expanded, setExpanded] = useState(step.status === 'running' || step.status === 'failed');
  const [logsOpen, setLogsOpen] = useState(false);

  useEffect(() => {
    if (step.status === 'running' || step.status === 'failed') setExpanded(true);
  }, [step.status]);

  const state = getStepState(step);
  const operationMeta = OPERATION_CONFIG[step.operation];
  const OperationIcon = getOperationIcon(step.operation);
  const displayTitle = getDisplayTitle(step, templateStep, operationMeta.label);
  const sanitizedOutput = sanitizeOutput(step.output);
  const livePreview = useMemo(() => {
    if (step.status === 'running') {
      return [
        `Step ${String(stepNumber).padStart(2, '0')} is currently generating output.`,
        '',
        `Current focus: ${templateStep?.instruction || 'Using the saved workflow instruction for this step.'}`,
        '',
        `${elapsed ?? 0}s elapsed. Partial output will appear here as the run progresses.`,
      ].join('\n');
    }
    if (step.status === 'pending') return 'This step is queued and will run when the previous step completes.';
    if (step.status === 'failed') return step.error || 'This step failed before an output preview could be generated.';
    return sanitizedOutput || 'Demo result generated. Connect an LLM backend to return live analysis for this step.';
  }, [elapsed, sanitizedOutput, step.error, step.status, stepNumber, templateStep?.instruction]);

  return (
    <div style={{ position: 'relative', paddingLeft: 34 }}>
      {!isLast && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 16,
            top: 42,
            bottom: -14,
            width: 1,
            background: 'var(--border-default)',
          }}
        />
      )}
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 16,
          background: expanded ? '#FFFFFF' : 'var(--bg-surface-alt)',
          overflow: 'hidden',
          boxShadow: expanded ? '0 2px 8px rgba(11,29,58,0.04)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
        }}
      >
      <button
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0,1fr) auto auto',
          alignItems: 'center',
          gap: 12,
          padding: expanded ? '14px 14px 12px 10px' : '12px 12px 12px 8px',
          border: 'none',
          background: expanded ? 'rgba(244,246,249,0.45)' : 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {state !== 'running' && <StepIndicator state={state} stepNumber={stepNumber} />}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              border: '1px solid var(--border-default)',
              background: expanded ? '#FFFFFF' : 'rgba(255,255,255,0.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: getOperationAccent(step.operation),
              boxShadow: expanded ? '0 1px 3px rgba(11,29,58,0.04)' : 'none',
              flexShrink: 0,
            }}
          >
            <OperationIcon size={15} strokeWidth={1.8} />
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              Step {String(stepNumber).padStart(2, '0')}
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-default)' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>
              {step.status === 'running' ? 'In progress' : stepStatusLabel(state)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: state === 'queued' ? 'var(--text-secondary)' : 'var(--text-primary)', lineHeight: 1.35 }}>
              {displayTitle}
            </span>
            <StatusBadge label={stepStatusLabel(state)} variant={statusToBadgeVariant(state)} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 520 }}>
            {operationMeta.description}
          </div>
          {step.status === 'running' && (
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 4, borderRadius: 999, background: 'rgba(11,29,58,0.08)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(92, Math.max(14, ((elapsed ?? 0) % 4) * 22 + 14))}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #C9A84C 0%, #D4B96A 52%, rgba(255,255,255,0.98) 100%)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 500, alignSelf: 'start', paddingTop: 2 }}>
          {step.durationSeconds ? `${step.durationSeconds}s` : elapsed !== null ? `${elapsed}s` : '—'}
        </div>
        <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }} />
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 16px 18px', display: 'grid', gap: 12, background: '#FFFFFF' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            <MetaStat label="Status" value={stepStatusLabel(state)} />
            <MetaStat label="Duration" value={step.durationSeconds ? `${step.durationSeconds}s` : elapsed !== null ? `${elapsed}s elapsed` : 'Not started'} />
            <MetaStat label="Tool" value={sanitizedOutput ? 'Workflow runner' : 'Demo runner'} />
          </div>

          <div style={{ height: 1, background: 'var(--border-default)' }} />

          <DetailBlock
            label="What this step did"
            emphasize
            content={operationMeta.description}
          />

          <DetailBlock
            label="Context"
            content={
              <div style={bodyTextStyle}>
                {templateStep?.instruction || 'No custom input was provided for this step.'}
              </div>
            }
          />

          <DetailBlock
            label="Action"
            content={
              <div style={bodyTextStyle}>
                {buildActionLabel(step.operation)}
                <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  Tool / model: {sanitizedOutput ? 'YourAI workflow runner' : 'Demo runner'}
                </div>
              </div>
            }
          />

          <DetailBlock
            label="Output"
            content={
              <div style={bodyTextStyle}>
                {step.status === 'running' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, color: 'var(--text-primary)', fontWeight: 500 }}>
                    <Loader2 size={12} className="animate-spin" />
                    Live output preview
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>{livePreview}</div>
              </div>
            }
          />

          <div style={{ height: 1, background: 'var(--border-default)' }} />

          <div style={{ border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--bg-surface-alt)', overflow: 'hidden' }}>
            <button
              onClick={() => setLogsOpen((prev) => !prev)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Eye size={12} />
                View logs
              </span>
              <ChevronDown size={13} style={{ transform: logsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }} />
            </button>
            {logsOpen && (
              <div style={{ padding: '0 12px 12px', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
                <div>Status: {stepStatusLabel(state)}</div>
                <div>Operation: {operationMeta.label}</div>
                <div>Duration: {step.durationSeconds ? `${step.durationSeconds}s` : elapsed !== null ? `${elapsed}s elapsed` : 'Not started'}</div>
                <div>Source: {step.sourceUsed || 'Workflow default source'}</div>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border-default)' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 2 }}>
            <button onClick={() => copyText(sanitizedOutput || livePreview)} style={actionTileStyle}>
              <Copy size={12} /> Copy output
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function StepIndicator({ state, stepNumber }: { state: ReturnType<typeof getStepState>; stepNumber: number }) {
  if (state === 'completed') {
    return (
      <div aria-label={`Step ${stepNumber} completed`} style={indicatorBase('#EAF3DE', '#2A9D6E')}>
        <Check size={11} strokeWidth={3} color="#2A9D6E" />
      </div>
    );
  }
  if (state === 'running') {
    return (
      <div aria-label={`Step ${stepNumber} running`} style={indicatorBase('rgba(11,29,58,0.08)', 'var(--brand-navy)')}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-navy)', animation: 'pulse 1.2s ease-in-out infinite' }} />
      </div>
    );
  }
  if (state === 'failed') {
    return (
      <div aria-label={`Step ${stepNumber} failed`} style={indicatorBase('rgba(196,79,79,0.12)', '#C44F4F')}>
        <AlertCircle size={11} color="#C44F4F" />
      </div>
    );
  }
  if (state === 'needs_approval') {
    return (
      <div aria-label={`Step ${stepNumber} needs approval`} style={indicatorBase('rgba(124,58,237,0.10)', '#6D28D9')}>
        <Sparkles size={10} color="#6D28D9" />
      </div>
    );
  }
  return (
    <div aria-label={`Step ${stepNumber} queued`} style={indicatorBase('var(--bg-surface-alt)', 'var(--text-tertiary)', true)}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-tertiary)' }}>{String(stepNumber).padStart(2, '0')}</span>
    </div>
  );
}

function indicatorBase(background: string, borderColor: string, outline = false): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background,
    border: outline ? `1px solid ${borderColor}` : '1px solid transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}

function DetailBlock({
  label,
  content,
  emphasize = false,
}: {
  label: string;
  content: React.ReactNode;
  emphasize?: boolean;
}) {
  return <DetailBlockInner label={label} content={content} emphasize={emphasize} />;
}

function DetailBlockInner({
  label,
  content,
  emphasize,
}: {
  label: string;
  content: React.ReactNode;
  emphasize: boolean;
}) {
  return (
    <div style={{ border: '1px solid var(--border-default)', borderRadius: 12, background: emphasize ? '#FFFFFF' : 'var(--bg-surface-alt)', padding: emphasize ? '14px 14px 12px' : '12px 12px 10px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: emphasize ? 10 : 8 }}>
        {label}
      </div>
      {typeof content === 'string' ? (
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: emphasize ? 17 : 12.5,
            lineHeight: emphasize ? 1.45 : 1.7,
            fontWeight: emphasize ? 500 : 400,
            color: emphasize ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          {content}
        </div>
      ) : content}
    </div>
  );
}

function getStepState(step: WorkflowRunStep) {
  if (step.status === 'failed') return 'failed';
  if (step.status === 'running') return 'running';
  if (step.status === 'complete') {
    return step.output?.toLowerCase().includes('approval') ? 'needs_approval' : 'completed';
  }
  return 'queued';
}

function getDisplayTitle(step: WorkflowRunStep, templateStep: WorkflowStep | undefined, fallback: string) {
  const raw = (step.name || templateStep?.name || '').trim();
  if (!raw) return fallback;
  if (/^implement\s+\d+$/i.test(raw)) return fallback;
  if (/^step\s+\d+$/i.test(raw)) return fallback;
  return raw;
}

function stepStatusLabel(state: ReturnType<typeof getStepState>) {
  if (state === 'completed') return 'Completed';
  if (state === 'running') return 'Running';
  if (state === 'failed') return 'Failed';
  if (state === 'needs_approval') return 'Needs approval';
  return 'Queued';
}

function buildActionLabel(operation: WorkflowOperation) {
  const meta = OPERATION_CONFIG[operation];
  return meta?.description || operation.replace(/_/g, ' ');
}

function getOperationIcon(operation: WorkflowOperation) {
  switch (operation) {
    case 'read_documents':
      return FileText;
    case 'analyse_clauses':
      return Search;
    case 'compare_against_standard':
      return GitCompare;
    case 'generate_report':
      return FileOutput;
    case 'research_precedents':
      return BookOpen;
    case 'compliance_check':
      return ShieldCheck;
    default:
      return Sparkles;
  }
}

function getOperationAccent(operation: WorkflowOperation) {
  switch (operation) {
    case 'read_documents':
      return '#3D5A80';
    case 'analyse_clauses':
      return '#6D28D9';
    case 'compare_against_standard':
      return 'var(--brand-gold)';
    case 'generate_report':
      return '#2A9D6E';
    case 'research_precedents':
      return '#4F46E5';
    case 'compliance_check':
      return '#C44F4F';
    default:
      return 'var(--text-secondary)';
  }
}

function statusToBadgeVariant(state: ReturnType<typeof getStepState>) {
  if (state === 'completed') return 'complete' as const;
  if (state === 'running') return 'running' as const;
  if (state === 'failed') return 'failed' as const;
  if (state === 'needs_approval') return 'needs_review' as const;
  return 'neutral' as const;
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--border-default)',
        background: 'var(--bg-surface-alt)',
        borderRadius: 10,
        padding: '8px 10px',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, minWidth: 0 }}>
        {value}
      </div>
    </div>
  );
}

function sanitizeOutput(output?: string | null) {
  if (!output) return '';
  if (output.includes('offline demo mode')) {
    return 'Demo result generated. Connect an LLM backend to return live analysis for this step.';
  }
  return output
    .replace(/_+/g, '')
    .replace(/\*\*(Operation|Instruction):\*\*.*$/gms, '')
    .trim();
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

const bodyTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  lineHeight: 1.7,
};

const actionTileStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  minHeight: 36,
  padding: '8px 16px',
  borderRadius: 10,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-surface-alt)',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};
