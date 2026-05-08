import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Maximize2, Minimize2, X } from 'lucide-react';
import { listRuns, type WorkflowRun } from '../../lib/workflow';
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

type FilterState = 'all' | 'running' | 'complete';

export default function WorkflowRunPanel({ userId, onClose, focusRunId }: Props) {
  const [tick, setTick] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterState>('all');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(focusRunId || null);

  const runs = useMemo<WorkflowRun[]>(() => {
    const all = listRuns().filter((run) => run.userId === userId);
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    return all
      .filter((run) => {
        if (run.status === 'failed') return false;
        if (run.status === 'running') return true;
        const time = run.completedAt ? new Date(run.completedAt).getTime() : new Date(run.startedAt).getTime();
        return time >= cutoff;
      })
      .sort((a, b) => {
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
    return false;
  });

  const expandedVisible = expandedRunId
    ? filteredRuns.find((run) => run.id === expandedRunId) || null
    : null;

  const visibleRuns = expandedVisible ? [expandedVisible] : filteredRuns;

  const counts = {
    running: runs.filter((run) => run.status === 'running').length,
    complete: runs.filter((run) => run.status === 'complete').length,
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
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Workflow Runs</div>
            <div style={{ fontSize: 22, fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', lineHeight: 1.1, marginTop: 2 }}>
              {runs.length} recent
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 2 }}>
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
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visibleRuns.length === 0 ? (
          <div style={{ border: '1px solid var(--border-default)', borderRadius: 14, background: '#FFFFFF', padding: 18, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            No workflow runs match this filter yet.
          </div>
        ) : (
          visibleRuns.map((run) => (
            <WorkflowRunCard
              key={run.id}
              run={run}
              isExpanded={expandedRunId === run.id}
              onToggle={() => setExpandedRunId((current) => current === run.id ? null : run.id)}
            />
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
  variant: 'running' | 'complete';
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
