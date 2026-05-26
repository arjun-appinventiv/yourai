import React from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { getTemplate, type WorkflowRun } from '../../../lib/workflow';
import StatusBadge from './StatusBadge';
import WorkflowStepTimeline from './WorkflowStepTimeline';
import WorkflowArtifactCard from './WorkflowArtifactCard';

export default function WorkflowRunCard({
  run,
  isExpanded,
  onToggle,
}: {
  run: WorkflowRun;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const template = getTemplate(run.templateId);
  if (!template) return null;

  const duration = run.steps.reduce((sum, step) => sum + (step.durationSeconds || 0), 0);
  const completedCount = run.steps.filter((step) => step.status === 'complete').length;
  const demoMode = run.steps.some((step) => step.output?.includes('offline demo mode'));
  const status = getRunStatus(run);
  const runningStepIndex = run.steps.findIndex((step) => step.status === 'running');
  const currentStepNumber = runningStepIndex >= 0 ? runningStepIndex + 1 : Math.min(completedCount + 1, run.steps.length);
  const isRunning = run.status === 'running';
  const progressPercent = run.steps.length > 0
    ? run.status === 'complete'
      ? 100
      : Math.max(8, Math.round(((completedCount + (runningStepIndex >= 0 ? 0.45 : 0)) / run.steps.length) * 100))
    : 0;

  return (
    <div
      style={{
        border: '1px solid var(--border-default)',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#FFFFFF',
        boxSizing: 'border-box',
        boxShadow: isExpanded
          ? `inset 3px 0 0 ${isRunning ? 'var(--brand-navy)' : '#2A9D6E'}, 0 4px 16px rgba(11,29,58,0.06)`
          : '0 1px 3px rgba(11,29,58,0.04)',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: isExpanded ? '10px 14px' : '14px 14px 12px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: isExpanded ? 3 : 6 }}>
              {isRunning && <Loader2 size={14} color="#0B1D3A" className="animate-spin" />}
              <span style={{ fontSize: isExpanded ? 13 : 15, fontWeight: 600, color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {run.templateName}
              </span>
              <StatusBadge label={template.practiceArea} variant="category" />
              {!isExpanded && <StatusBadge label={status.label} variant={status.variant} />}
              {!isExpanded && demoMode && <StatusBadge label="Demo mode" variant="demo" />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: isExpanded ? 10.5 : 11, color: 'var(--text-tertiary)' }}>
              {run.status === 'running' ? (
                <>
                  <span>Running</span>
                  <span>•</span>
                  <span>step {currentStepNumber}/{run.steps.length}</span>
                  <span>•</span>
                </>
              ) : (
                <>
                  <span>{duration || '—'}s</span>
                  <span>•</span>
                  <span>{completedCount} of {run.steps.length} complete</span>
                  <span>•</span>
                </>
              )}
              <StatusBadge label={run.workspaceId ? 'Workspace KB' : 'Global KB'} variant="source" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isExpanded ? <ChevronDown size={16} color="#8899AB" /> : <ChevronRight size={16} color="#8899AB" />}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div
          style={{
            borderTop: '1px solid var(--border-default)',
            padding: 14,
            display: 'grid',
            gap: 14,
            background: '#FBFCFD',
            maxHeight: '70vh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          <div
            style={{
              border: '1px solid rgba(201,168,76,0.22)',
              borderRadius: 16,
              padding: 16,
              background: isRunning
                ? 'linear-gradient(135deg, rgba(201,168,76,0.16) 0%, rgba(255,255,255,0.98) 42%, rgba(212,185,106,0.10) 100%)'
                : 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(255,255,255,0.98) 52%, rgba(42,157,110,0.08) 100%)',
              boxShadow: '0 1px 3px rgba(11,29,58,0.04)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 10 }}>
              {isRunning ? 'Live execution' : 'Run summary'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, alignItems: 'start', marginBottom: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  {isRunning && <Loader2 size={14} color="#0B1D3A" className="animate-spin" />}
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {run.templateName}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {isRunning ? `Running · step ${currentStepNumber}/${run.steps.length}` : `Complete · ${run.steps.length} steps`}
                  </span>
                  <span>•</span>
                  <span>{completedCount} of {run.steps.length} complete</span>
                  <span>•</span>
                  <span>{duration || '—'}s</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <StatusBadge label={template.practiceArea} variant="category" />
                <StatusBadge label={status.label} variant={status.variant} />
              </div>
            </div>

            <div
              aria-label={`${progressPercent}% complete`}
              style={{
                height: 8,
                borderRadius: 999,
                background: 'rgba(11,29,58,0.08)',
                overflow: 'hidden',
                position: 'relative',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: isRunning
                    ? 'linear-gradient(90deg, #C9A84C 0%, #D4B96A 52%, rgba(255,255,255,0.98) 100%)'
                    : 'linear-gradient(90deg, #8DC6A7 0%, #2A9D6E 100%)',
                  transition: 'width 0.35s ease',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <SummaryStat
                label="Knowledge"
                value={run.workspaceId ? 'Workspace KB' : 'Global KB'}
                trailingBadge={<StatusBadge label={run.workspaceId ? 'Workspace KB' : 'Global KB'} variant="source" />}
              />
              <SummaryStat
                label="Progress"
                value={`${progressPercent}% progress`}
              />
            </div>
          </div>

          {demoMode && (
            <div style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(201,168,76,0.18)', background: 'rgba(201,168,76,0.08)', color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.65 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Demo mode.</strong> This run used demo outputs. Connect the LLM backend to generate real workflow results.
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border-default)', margin: '2px 2px 6px' }} />

          <div
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 14,
              background: '#FFFFFF',
              padding: 14,
              boxShadow: '0 1px 3px rgba(11,29,58,0.04)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Step timeline
            </div>
            <WorkflowStepTimeline run={run} template={template} />
          </div>

          <div style={{ height: 1, background: 'var(--border-default)', margin: '2px 2px 6px' }} />

          <div
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 14,
              background: '#FFFFFF',
              padding: 18,
              boxShadow: '0 1px 3px rgba(11,29,58,0.04)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Output / Report
            </div>
            <WorkflowArtifactCard report={run.reportCardData} />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  trailingBadge,
}: {
  label: string;
  value: string;
  trailingBadge?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: '1px solid rgba(11,29,58,0.08)',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.72)',
        padding: '10px 12px',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
        {label}
      </div>
      {trailingBadge || (
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {value}
        </div>
      )}
    </div>
  );
}

function getRunStatus(run: WorkflowRun) {
  if (run.status === 'running') return { label: 'Running', variant: 'running' as const };
  if (run.status === 'complete') return { label: 'Complete', variant: 'complete' as const };
  return { label: 'Complete', variant: 'complete' as const };
}
