/* ─────────────── Workflow Report Card ───────────────
 *
 * Renders below the completed WorkflowProgressCard and stays in chat
 * history as the permanent deliverable. Contains the executive summary
 * (the Generate Report step output, if present), a collapsible section
 * per remaining step, a documents-processed row with partial-failure
 * warning when applicable, and a Download PDF action that opens a
 * printable window the user can save via the browser's Save-as-PDF.
 */

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Briefcase, Database, FileText, ChevronDown, AlertTriangle,
  Check, X as XIcon, Download, RefreshCw,
  FileText as FileTextIcon, Search as SearchIcon, GitCompare,
  FileOutput, BookOpen, ShieldCheck,
} from 'lucide-react';
import {
  type WorkflowReport, type WorkflowOperation, type WorkflowReportStep,
  OPERATION_CONFIG,
} from '../../lib/workflow';

const OP_ICON: Record<WorkflowOperation, React.ComponentType<{ size?: number }>> = {
  read_documents: FileTextIcon,
  analyse_clauses: SearchIcon,
  compare_against_standard: GitCompare,
  generate_report: FileOutput,
  research_precedents: BookOpen,
  compliance_check: ShieldCheck,
};

const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

function relativeFrom(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) {
    const hrs = Math.floor(diff / 3_600_000);
    if (hrs < 1) {
      const mins = Math.floor(diff / 60_000);
      return mins <= 0 ? 'just now' : `${mins} min${mins === 1 ? '' : 's'} ago`;
    }
    return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  }
  if (days < 2) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

function formatRunAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export interface WorkflowReportCardProps {
  report: WorkflowReport;
  userName?: string;
  /** Retry handler if a step failed — parent wires this to workflowRunner.retryStep. */
  onRetryStep?: (stepIndex: number) => void;
}

export default function WorkflowReportCard({ report, userName, onRetryStep }: WorkflowReportCardProps) {
  // Split the final generate_report step out as the hero summary; the rest
  // become collapsible findings.
  const { heroStep, otherSteps } = useMemo(() => {
    const idxFromEnd = [...report.steps].reverse().findIndex(
      (s) => s.operation === 'generate_report' && s.status === 'complete' && s.output,
    );
    if (idxFromEnd === -1) {
      return { heroStep: null as WorkflowReportStep | null, otherSteps: report.steps };
    }
    const heroIdx = report.steps.length - 1 - idxFromEnd;
    const others = report.steps.filter((_, i) => i !== heroIdx);
    return { heroStep: report.steps[heroIdx], otherSteps: others };
  }, [report.steps]);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  const hasPartialFailure = (report.failedDocs && report.failedDocs.length > 0) || false;
  const inWorkspace = report.knowledgeSource === 'workspace';

  const handleDownloadPDF = () => openPrintableWindow(report, userName);

  return (
    <div
      style={{
        border: '1px solid var(--border)', borderRadius: 12, background: '#fff',
        overflow: 'hidden', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Gold accent stripe (matches intent response cards) */}
      <div style={{ height: 3, background: 'linear-gradient(to right, #C9A84C, #E8C96A)' }} />

      {/* Header */}
      <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 8 }}>
              Workflow Report
            </div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: '#0B1D3A', margin: 0, lineHeight: 1.3, fontWeight: 400 }}>
              {report.workflowName}
            </h3>
            <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 8 }}>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--ice-warm)', color: 'var(--navy)', border: '1px solid var(--border)', fontWeight: 500 }}>
                {report.practiceArea}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>
                {report.steps.length} steps · {report.durationSeconds}s
              </span>
            </div>
          </div>

          {/* Knowledge source badge */}
          <div style={{ flexShrink: 0 }}>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontFamily: MONO, fontSize: 9, letterSpacing: '0.04em',
                padding: '4px 10px', borderRadius: 999,
                border: `1px solid ${inWorkspace ? '#BFDBFE' : '#A7F3D0'}`,
                background: inWorkspace ? '#EFF6FF' : '#ECFDF5',
                color: inWorkspace ? '#1D4ED8' : '#065F46',
                whiteSpace: 'nowrap',
              }}
            >
              {inWorkspace ? <Briefcase size={10} /> : <Database size={10} />}
              {inWorkspace && report.workspaceName ? `${report.workspaceName} + Global KB` : 'Global KB'}
            </span>
          </div>
        </div>
      </div>

      {/* Partial doc failure warning */}
      {hasPartialFailure && (
        <div style={{ padding: '12px 28px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#6B4E1F', lineHeight: 1.55 }}>
          <AlertTriangle size={14} style={{ color: '#C9A84C', flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>{report.failedDocs!.length} document{report.failedDocs!.length !== 1 ? 's' : ''} could not be read</strong> and {report.failedDocs!.length === 1 ? 'was' : 'were'} excluded from this analysis. The report continues with the documents that did process.
          </div>
        </div>
      )}

      {/* Documents processed */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8 }}>
          Documents analysed
        </div>
        {report.docsProcessed.length === 0 && !hasPartialFailure ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No documents were processed in this run.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {report.docsProcessed.map((name, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                <FileText size={10} />
                {name}
              </span>
            ))}
            {(report.failedDocs || []).map((name, i) => (
              <span
                key={`f-${i}`}
                title="Could not read this file. It may be a scanned image without a text layer."
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#FEF7F7', color: '#C65454', border: '1px solid #F9E7E7' }}
              >
                <XIcon size={10} />
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Executive summary */}
      {heroStep && heroStep.output ? (
        <div style={{ padding: '22px 28px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 10 }}>
            Executive Summary
          </div>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: '#0B1D3A', fontWeight: 400, margin: '0 0 10px 0' }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: '#0B1D3A', fontWeight: 400, margin: '16px 0 8px 0' }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ fontSize: 14, color: '#0B1D3A', fontWeight: 600, margin: '12px 0 6px 0' }}>{children}</h3>,
                p:  ({ children }) => <p style={{ margin: '0 0 10px 0' }}>{children}</p>,
                ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '6px 0 10px 0' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: '6px 0 10px 0' }}>{children}</ol>,
                li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                strong: ({ children }) => <strong style={{ color: '#0B1D3A', fontWeight: 600 }}>{children}</strong>,
              }}
            >
              {heroStep.output}
            </ReactMarkdown>
          </div>
        </div>
      ) : null}

      {/* Step findings */}
      {otherSteps.length > 0 && (
        <div>
          <div style={{ padding: '16px 28px 8px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF' }}>
              Step findings
            </div>
          </div>
          {otherSteps.map((step, i) => (
            <FindingSection
              key={i}
              step={step}
              index={report.steps.indexOf(step)}
              expanded={expanded.has(i)}
              onToggle={() => toggle(i)}
              onRetry={onRetryStep ? () => onRetryStep(report.steps.indexOf(step)) : undefined}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '14px 28px', background: '#F9FAFB', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>
          Generated {relativeFrom(report.runAt)}{userName ? ` · ${userName}` : ''}
        </div>
        <button
          onClick={handleDownloadPDF}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            background: '#fff', color: 'var(--navy)',
            border: '1px solid var(--navy)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Download size={12} /> Download PDF
        </button>
      </div>
    </div>
  );
}

/* ─── Per-step collapsible section ─── */

function FindingSection({ step, index, expanded, onToggle, onRetry }: {
  step: WorkflowReportStep;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onRetry?: () => void;
}) {
  const cfg = OPERATION_CONFIG[step.operation];
  const Icon = OP_ICON[step.operation];
  const isFailed = step.status === 'failed';

  const sourceStyle = (label: string) => {
    if (label === 'workspace docs' || label === 'run uploads') {
      return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
    }
    if (label === 'reference doc') {
      return { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' };
    }
    return { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' };
  };
  const src = sourceStyle(step.sourceUsed);

  return (
    <div style={{ borderTop: '1px solid #F3F4F6' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 28px',
          cursor: 'pointer', userSelect: 'none',
          background: 'transparent',
          transition: 'background-color 100ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--navy)', color: '#C9A84C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: MONO, fontSize: 10, fontWeight: 600, flexShrink: 0,
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>

        <span className={cfg.color} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 500, border: '1px solid' }}>
          <Icon size={10} /> {cfg.label}
        </span>

        <span style={{ fontSize: 13, fontWeight: 500, color: isFailed ? '#C65454' : 'var(--text-primary)', flex: 1, minWidth: 0 }}>
          {step.name || 'Step'}
        </span>

        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: src.bg, color: src.color, border: `1px solid ${src.border}`, fontFamily: MONO }}>
          {step.sourceUsed}
        </span>

        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, flexShrink: 0 }}>
          {step.durationSeconds}s
        </span>

        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms', flexShrink: 0 }} />
      </div>

      {expanded && (
        <div style={{ padding: '0 28px 18px 64px' }}>
          {isFailed ? (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF7F7', border: '1px solid #F9E7E7', fontSize: 12, color: '#6B1E1E', lineHeight: 1.55 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>This step did not complete.</div>
              <div style={{ marginBottom: onRetry ? 10 : 0 }}>{step.output || 'No output was produced.'}</div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                >
                  <RefreshCw size={11} /> Retry this step
                </button>
              )}
            </div>
          ) : step.output ? (
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.75 }}>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, color: '#0B1D3A', fontWeight: 400, margin: '0 0 8px 0' }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ fontSize: 14, color: '#0B1D3A', fontWeight: 600, margin: '10px 0 6px 0' }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontSize: 13, color: '#0B1D3A', fontWeight: 600, margin: '8px 0 4px 0' }}>{children}</h3>,
                  p:  ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '4px 0 8px 0' }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '4px 0 8px 0' }}>{children}</ol>,
                  li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
                  strong: ({ children }) => <strong style={{ color: '#0B1D3A', fontWeight: 600 }}>{children}</strong>,
                }}
              >
                {step.output}
              </ReactMarkdown>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No findings identified in this step.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Printable PDF output ──────────────────────────────────────────
 *
 * Uses the browser's native Save-as-PDF. We open a new window, write a
 * fully-styled HTML document matching the on-screen card, and call
 * window.print(). No runtime dependency, no page-break surprises
 * because we control the print styles.
 */

function openPrintableWindow(report: WorkflowReport, userName?: string): void {
  const win = window.open('', '_blank', 'width=920,height=1100');
  if (!win) return;

  const sourceLabel = report.knowledgeSource === 'workspace' && report.workspaceName
    ? `${report.workspaceName} + Global KB`
    : 'Global KB';

  const heroIdx = [...report.steps].reverse().findIndex((s) => s.operation === 'generate_report' && s.status === 'complete' && s.output);
  const heroStep = heroIdx === -1 ? null : report.steps[report.steps.length - 1 - heroIdx];
  const otherSteps = heroStep ? report.steps.filter((s) => s !== heroStep) : report.steps;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(report.workflowName)} — Workflow Report</title>
<style>
  :root { --navy: #0B1D3A; --gold: #C9A84C; --muted: #6B7280; --border: #E4E7EC; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 40px 48px; color: #1F2937; font-size: 12.5pt; line-height: 1.6; background: #fff; }
  h1, h2, h3 { font-family: 'DM Serif Display', Georgia, serif; font-weight: 400; color: var(--navy); }
  h1 { font-size: 26pt; margin: 0 0 4pt; }
  h2 { font-size: 16pt; margin: 22pt 0 8pt; page-break-after: avoid; }
  h3 { font-size: 13pt; margin: 14pt 0 4pt; page-break-after: avoid; }
  .tag { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 9pt; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); }
  .meta { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 9pt; color: var(--muted); }
  .pill { display: inline-block; padding: 2pt 8pt; border-radius: 999px; font-size: 9pt; margin-right: 4pt; border: 1px solid var(--border); background: #F9FAFB; color: var(--navy); }
  .divider { border-top: 1px solid var(--border); margin: 18pt 0; }
  .doc-pill { display: inline-block; padding: 2pt 8pt; border-radius: 999px; font-size: 9pt; margin: 0 4pt 4pt 0; border: 1px solid #BFDBFE; background: #EFF6FF; color: #1D4ED8; }
  .doc-pill.failed { border-color: #F9E7E7; background: #FEF7F7; color: #C65454; text-decoration: line-through; }
  .warning { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6pt; padding: 10pt 14pt; font-size: 10.5pt; color: #6B4E1F; margin: 14pt 0; }
  .step { border-top: 1px solid #F3F4F6; padding: 14pt 0 10pt; page-break-inside: avoid; }
  .step-header { display: flex; align-items: center; gap: 10pt; margin-bottom: 6pt; }
  .step-num { display: inline-block; width: 22pt; height: 22pt; line-height: 22pt; border-radius: 50%; background: var(--navy); color: var(--gold); font-family: 'IBM Plex Mono', monospace; font-size: 9pt; text-align: center; }
  .step-name { font-weight: 600; color: var(--navy); font-size: 12pt; }
  .step-source { font-family: 'IBM Plex Mono', monospace; font-size: 8.5pt; color: var(--muted); margin-left: auto; }
  .step-body { padding-left: 32pt; font-size: 11pt; color: #374151; }
  .step-body p  { margin: 0 0 8pt; }
  .step-body ul { padding-left: 18pt; margin: 4pt 0 8pt; }
  .step-body li { margin-bottom: 3pt; }
  .step-body strong { color: var(--navy); }
  .footer { margin-top: 28pt; padding-top: 14pt; border-top: 1px solid var(--border); font-size: 9pt; color: var(--muted); font-family: 'IBM Plex Mono', monospace; }
  @media print {
    body { padding: 36pt 42pt; }
    button { display: none; }
  }
</style>
</head>
<body>
  <div class="tag">Workflow Report</div>
  <h1>${escapeHtml(report.workflowName)}</h1>
  <div class="meta" style="margin-top:6pt;">
    <span class="pill">${escapeHtml(report.practiceArea)}</span>
    ${escapeHtml(`${report.steps.length} steps · ${report.durationSeconds}s · Source: ${sourceLabel}`)}
  </div>

  ${report.failedDocs && report.failedDocs.length > 0 ? `
    <div class="warning">
      <strong>${report.failedDocs.length} document${report.failedDocs.length !== 1 ? 's' : ''} could not be read</strong>
      and ${report.failedDocs.length === 1 ? 'was' : 'were'} excluded from this analysis.
    </div>
  ` : ''}

  <div class="divider"></div>
  <div class="meta" style="margin-bottom:6pt;">Documents analysed</div>
  <div>
    ${report.docsProcessed.map((n) => `<span class="doc-pill">${escapeHtml(n)}</span>`).join('')}
    ${(report.failedDocs || []).map((n) => `<span class="doc-pill failed">${escapeHtml(n)}</span>`).join('')}
    ${report.docsProcessed.length === 0 && (!report.failedDocs || report.failedDocs.length === 0) ? `<span class="meta">No documents processed.</span>` : ''}
  </div>

  ${heroStep && heroStep.output ? `
    <h2>Executive Summary</h2>
    <div class="step-body">${markdownToHtml(heroStep.output)}</div>
  ` : ''}

  ${otherSteps.length > 0 ? `
    <h2>Step Findings</h2>
    ${otherSteps.map((s, i) => `
      <div class="step">
        <div class="step-header">
          <span class="step-num">${String(report.steps.indexOf(s) + 1).padStart(2, '0')}</span>
          <span class="step-name">${escapeHtml(s.name || 'Step')}</span>
          <span class="step-source">${escapeHtml(s.sourceUsed)} · ${s.durationSeconds}s</span>
        </div>
        <div class="step-body">${
          s.status === 'failed'
            ? `<em>This step did not complete. ${escapeHtml(s.output || '')}</em>`
            : s.output
              ? markdownToHtml(s.output)
              : `<em>No findings identified.</em>`
        }</div>
      </div>
    `).join('')}
  ` : ''}

  <div class="footer">
    Generated ${escapeHtml(formatRunAt(report.runAt))}${userName ? ` · ${escapeHtml(userName)}` : ''} · YourAI Workflow
  </div>

  <script>
    window.onload = () => { setTimeout(() => window.print(), 120); };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

/* Lightweight markdown → HTML for the print window (headings, para,
   lists, bold, italic). We keep this intentionally tiny — the print
   doc never executes user-controlled JS, and the report markdown has
   already gone through an LLM response. Safe enough for PDF export. */
function markdownToHtml(md: string): string {
  let html = escapeHtml(md);
  // headings
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#\s+(.+)$/gm, '<h3>$1</h3>');
  // bold + italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // lists (very light — each bullet-line becomes <li>)
  const lines = html.split(/\n/);
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    const m = line.match(/^[-*]\s+(.+)$/);
    if (m) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${m[1]}</li>`);
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      if (line.trim() === '') out.push(''); else out.push(`<p>${line}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
