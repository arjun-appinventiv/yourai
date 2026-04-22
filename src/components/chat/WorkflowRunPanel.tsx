/* ─────────────── Workflow Run Panel ───────────────
 *
 * Right-docked panel that shows the active (or most recently finished)
 * workflow run. Replaces the old inline "workflow message bubble"
 * pattern — the run now lives in its own surface so the chat stays
 * pure conversation while a long pipeline runs alongside.
 *
 * States:
 *   • running / failed / cancelled → WorkflowProgressCard
 *   • complete                     → ProgressCard collapsed as audit
 *                                     trail + ReportCard below
 *
 * Open/close is owned by the parent (ChatView). Minimising this panel
 * just hides it — the sidebar running-strip remains as the "expand me"
 * handle, and state keeps living in the runner singleton.
 */

import React, { useEffect, useState } from 'react';
import { X, Minimize2 } from 'lucide-react';
import { getRun, type WorkflowRun } from '../../lib/workflow';
import { subscribeRun } from '../../lib/workflowRunner';
import WorkflowProgressCard from './WorkflowProgressCard';
import WorkflowReportCard from './WorkflowReportCard';

interface Props {
  runId: string;
  onClose: () => void;
}

export default function WorkflowRunPanel({ runId, onClose }: Props) {
  const [run, setRun] = useState<WorkflowRun | null>(() => getRun(runId));

  useEffect(() => {
    setRun(getRun(runId));
    const unsub = subscribeRun(runId, (r) => setRun({ ...r }));
    return () => unsub();
  }, [runId]);

  return (
    <div
      style={{
        width: 480,
        flexShrink: 0,
        background: '#FAFBFC',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        boxShadow: '-4px 0 16px rgba(10,36,99,0.04)',
      }}
    >
      {/* ─── Header ─── */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--text-muted)',
            }}
          >
            Workflow Run
          </div>
          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 17, color: 'var(--navy)', marginTop: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {run?.templateName || 'Loading…'}
          </div>
        </div>
        <button
          onClick={onClose}
          title="Minimise — reopen from the sidebar"
          style={{
            padding: 8, borderRadius: 8, background: 'transparent',
            border: '1px solid transparent', cursor: 'pointer', display: 'flex',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
        >
          <Minimize2 size={15} style={{ color: 'var(--text-muted)' }} />
        </button>
        <button
          onClick={onClose}
          title="Close"
          style={{
            padding: 8, borderRadius: 8, background: 'transparent',
            border: '1px solid transparent', cursor: 'pointer', display: 'flex',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
        >
          <X size={15} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* ─── Body ─── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 28px' }}>
        {!run ? (
          <div style={{ padding: '36px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            This run is no longer available. Start a new one from Workflow Templates.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <WorkflowProgressCard runId={runId} workspaceName={null} />
            {run.status === 'complete' && run.reportCardData && (
              <WorkflowReportCard report={run.reportCardData} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
