import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Maximize2, Minimize2, Trash2, X } from 'lucide-react';
import { clearAllRuns, deleteRun, listRuns, type WorkflowRun } from '../../lib/workflow';
import { subscribeRun } from '../../lib/workflowRunner';
import StatusBadge from './workflow-runs/StatusBadge';
import WorkflowRunCard from './workflow-runs/WorkflowRunCard';

interface Props {
  userId: string;
  onClose: () => void;
  focusRunId?: string | null;
  onSummariseInChat?: (prompt: string) => void;
  onRunAnother?: () => void;
}

type FilterState = 'all' | 'running' | 'complete' | 'failed';

export default function WorkflowRunPanel({ userId, onClose, focusRunId }: Props) {
  const [tick, setTick] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterState>('all');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(focusRunId || null);
  const [confirmClear, setConfirmClear] = useState(false);

  const runs = useMemo<WorkflowRun[]>(() => {
    return listRuns()
      .filter((run) => run.userId === userId)
      .sort((a, b) => {
        // Running always floats to the top
        const aRank = a.status === 'running' ? 0 : 1;
        const bRank = b.status === 'running' ? 0 : 1;
        if (aRank !== bRank) return aRank - bRank;
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, userId]);

  useEffect(() => {
    const unsubs = runs
      .filter((run) => run.status === 'running')
      .map((run) => subscribeRun(run.id, () => setTick((value) => value + 1)));
    return () => { unsubs.forEach((unsubscribe) => unsubscribe()); };
  }, [runs]);

  useEffect(() => {
    if (focusRunId) {
      setExpandedRunId(focusRunId);
      return;
    }
    setExpandedRunId((current) => {
      if (current && runs.some((run) => run.id === current)) return current;
      const running = runs.find((run) => run.status === 'running');
      return running?.id || runs[0]?.id || null;
    });
  }, [focusRunId, runs]);

  const filteredRuns = runs.filter((run) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'running') return run.status === 'running';
    if (activeFilter === 'complete') return run.status === 'complete';
    if (activeFilter === 'failed') return run.status === 'failed' || run.status === 'cancelled';
    return false;
  });

  const expandedVisible = expandedRunId
    ? filteredRuns.find((run) => run.id === expandedRunId) || null
    : null;

  const visibleRuns = expandedVisible ? [expandedVisible] : filteredRuns;

  const counts = {
    running: runs.filter((run) => run.status === 'running').length,
    complete: runs.filter((run) => run.status === 'complete').length,
    failed: runs.filter((run) => run.status === 'failed' || run.status === 'cancelled').length,
  };

  const handleDeleteRun = (runId: string) => {
    deleteRun(runId);
    if (expandedRunId === runId) setExpandedRunId(null);
    setTick((v) => v + 1);
  };

  const handleClearAll = () => {
    clearAllRuns();
    setExpandedRunId(null);
    setConfirmClear(false);
    setTick((v) => v + 1);
  };

  return (
    <aside
      id="workflow-run-panel"
      style={fullscreen ? fullscreenStyle : dockedStyle}
      aria-label="Workflow Runs"
    >
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Run History</div>
            <div style={{ fontSize: 22, fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', lineHeight: 1.1, marginTop: 2 }}>
              {runs.length} {runs.length === 1 ? 'run' : 'runs'} total
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 2 }}>
            {runs.length > 0 && !confirmClear && (
              <IconButton
                label="Clear all history"
                onClick={() => setConfirmClear(true)}
                icon={<Trash2 size={15} />}
              />
            )}
            <IconButton
              label="Show all runs"
              onClick={() => setActiveFilter('all')}
              icon={<Filter size={15} />}
            />
            <IconButton
              label={fullscreen ? 'Collapse panel' : 'Expand panel'}
              onClick={() => setFullscreen((prev) => !prev)}
              icon={fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            />
            <IconButton
              label="Close panel"
              onClick={onClose}
              icon={<X size={15} />}
            />
          </div>
        </div>

        {confirmClear && (
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: '#991B1B' }}>
            Clear all {runs.length} run{runs.length !== 1 ? 's' : ''}?{' '}
            <button type="button" onClick={handleClearAll} style={{ fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13 }}>Yes, clear</button>
            {' · '}
            <button type="button" onClick={() => setConfirmClear(false)} style={{ color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13 }}>Cancel</button>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <FilterPill
            label={`Running ${counts.running}`}
            variant="running"
            active={activeFilter === 'running'}
            onClick={() => setActiveFilter(activeFilter === 'running' ? 'all' : 'running')}
          />
          <FilterPill
            label={`Completed ${counts.complete}`}
            variant="complete"
            active={activeFilter === 'complete'}
            onClick={() => setActiveFilter(activeFilter === 'complete' ? 'all' : 'complete')}
          />
          {counts.failed > 0 && (
            <FilterPill
              label={`Failed ${counts.failed}`}
              variant="failed"
              active={activeFilter === 'failed'}
              onClick={() => setActiveFilter(activeFilter === 'failed' ? 'all' : 'failed')}
            />
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visibleRuns.length === 0 ? (
          <div style={{ border: '1px solid var(--border-default)', borderRadius: 14, background: '#FFFFFF', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {runs.length === 0
                ? 'No runs yet — run a workflow to see history here.'
                : 'No runs match this filter.'}
            </div>
          </div>
        ) : (
          visibleRuns.map((run) => (
            <div key={run.id} style={{ position: 'relative' }}>
              <WorkflowRunCard
                run={run}
                isExpanded={expandedRunId === run.id}
                onToggle={() => setExpandedRunId((current) => current === run.id ? null : run.id)}
              />
              {/* Per-run delete — only shown on non-running runs */}
              {run.status !== 'running' && (
                <button
                  type="button"
                  title="Delete this run"
                  onClick={() => handleDeleteRun(run.id)}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    border: '1px solid var(--border-default)',
                    background: '#fff',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    opacity: 0.7,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.color = '#DC2626'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function IconButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        border: '1px solid var(--border-default)',
        background: '#FFFFFF',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {icon}
    </button>
  );
}

function FilterPill({
  label,
  variant,
  active,
  onClick,
}: {
  label: string;
  variant: 'running' | 'complete' | 'failed';
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        transform: active ? 'translateY(-1px)' : 'none',
      }}
      aria-pressed={active}
    >
      <StatusBadge label={label} variant={variant} />
    </button>
  );
}

const dockedStyle: React.CSSProperties = {
  width: 500,
  flexShrink: 0,
  background: '#FAFBFC',
  borderLeft: '1px solid var(--border-default)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  boxShadow: '-4px 0 16px rgba(11,29,58,0.04)',
};

const fullscreenStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 90,
  background: '#FAFBFC',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 0 0 1px var(--border-default)',
};

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  padding: '16px 18px 14px',
  borderBottom: '1px solid var(--border-default)',
  background: '#FFFFFF',
  display: 'grid',
  gap: 0,
  flexShrink: 0,
};
