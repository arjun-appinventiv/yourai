import React, { useMemo } from 'react';
import { Copy, Download, FileText, ListTree, ScrollText } from 'lucide-react';
import { type WorkflowReport } from '../../../lib/workflow';
import { openWorkflowReportPrintableWindow } from '../WorkflowReportCard';
import StatusBadge from './StatusBadge';

export default function WorkflowArtifactCard({
  report,
}: {
  report: WorkflowReport | null;
}) {

  const findings = useMemo(() => extractFindings(report?.summary || ''), [report?.summary]);

  if (!report) {
    return (
      <div style={cardStyle}>
        <div style={headerBandStyle}>
          <div style={overlineStyle}>Final report</div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          Final report is being prepared
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          As each workflow step completes, the final report, step outputs, and logs will collect here.
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerBandStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={overlineStyle}>Final report</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {report.workflowName}
            </div>
          </div>
          <StatusBadge label={report.knowledgeSource === 'workspace' ? `${report.workspaceName || 'Workspace'} KB` : 'Global KB'} variant="source" />
        </div>
      </div>

      <div style={contentGridStyle}>
        <SectionCard label="Documents analysed">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {report.docsProcessed.length > 0 ? report.docsProcessed.map((doc) => (
              <StatusBadge key={doc} label={doc} variant="artifact" />
            )) : <span style={mutedTextStyle}>No documents processed yet.</span>}
          </div>
        </SectionCard>

        <SectionCard label="Findings summary">
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.75 }}>
            {findings.map((finding, index) => <li key={`${finding}-${index}`}>{finding}</li>)}
          </ul>
        </SectionCard>

        <SectionCard label="Generated artifacts">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <ArtifactChip icon={<FileText size={13} />} label="Final report" />
            <ArtifactChip icon={<ListTree size={13} />} label="Step outputs" />
            <ArtifactChip icon={<ScrollText size={13} />} label="Logs" />
          </div>
        </SectionCard>
      </div>

      <div style={{ height: 1, background: 'rgba(201,168,76,0.18)', margin: '2px 0 16px' }} />

      <div style={footerStyle}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', flexShrink: 0 }}>
          Actions
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flex: 1, minWidth: 0 }}>
          <button onClick={() => copyText(report.summary || findings.join('\n'))} style={secondaryButtonStyle}>
            <Copy size={12} /> Copy summary
          </button>
          <button onClick={() => openWorkflowReportPrintableWindow(report)} style={primaryButtonStyle}>
            <Download size={12} /> Open Report
          </button>
        </div>
      </div>

    </div>
  );
}

function ArtifactChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid rgba(201,168,76,0.16)',
        background: 'rgba(201,168,76,0.06)',
        color: 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {icon}
      {label}
    </span>
  );
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid rgba(201,168,76,0.14)',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.78)',
        padding: 14,
      }}
    >
      <div style={sectionLabelStyle}>{label}</div>
      {children}
    </div>
  );
}

function extractFindings(summary: string) {
  const cleaned = summary.replace(/_+/g, '').trim();
  const listMatches = cleaned.split('\n').map((line) => line.trim()).filter((line) => /^[-*]|\d+\./.test(line));
  if (listMatches.length > 0) return listMatches.slice(0, 3).map((line) => line.replace(/^[-*]\s*|\d+\.\s*/, ''));
  const sentences = cleaned.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
  return (sentences.length > 0 ? sentences : ['Demo result generated. Connect an LLM backend to return live analysis for this workflow.']).slice(0, 3);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(201,168,76,0.16)',
  borderRadius: 20,
  background: 'linear-gradient(180deg, rgba(251,248,239,0.76) 0%, #FFFFFF 18%, #FFFFFF 100%)',
  padding: 20,
  boxShadow: '0 2px 8px rgba(11,29,58,0.04)',
};

const overlineStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-tertiary)',
  marginBottom: 4,
};

const headerBandStyle: React.CSSProperties = {
  padding: '2px 0 14px',
  marginBottom: 16,
  borderBottom: '1px solid rgba(201,168,76,0.18)',
};

const contentGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  marginBottom: 16,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-tertiary)',
  marginBottom: 6,
};

const mutedTextStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: 'var(--text-secondary)',
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'nowrap',
  borderTop: '1px solid rgba(201,168,76,0.16)',
  paddingTop: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid var(--brand-navy)',
  background: 'var(--brand-navy)',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid rgba(201,168,76,0.16)',
  background: '#FFFFFF',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
