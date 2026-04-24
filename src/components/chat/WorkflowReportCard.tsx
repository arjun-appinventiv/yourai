/* ─────────────── Workflow Report Card — document-style (Option D) ─────
 *
 * Renders a completed workflow run as a finished legal memo rather than
 * a dashboard card. No accent stripes, no bordered chrome — just the
 * deliverable. The per-step audit trail (which docs were processed,
 * what each step found, failed docs) lives behind a "View audit log"
 * link that opens a modal.
 *
 * Mental model: the user just ran a pipeline; this is what they'd hand
 * to a partner. Everything that's "how we got here" is secondary.
 */

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Briefcase, Database, FileText, ChevronDown, AlertTriangle,
  X as XIcon, Download, RefreshCw, History, Check,
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

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

export interface WorkflowReportCardProps {
  report: WorkflowReport;
  userName?: string;
  /** Retry handler if a step failed — parent wires this to workflowRunner.retryStep. */
  onRetryStep?: (stepIndex: number) => void;
}

export default function WorkflowReportCard({ report, userName, onRetryStep }: WorkflowReportCardProps) {
  const [auditOpen, setAuditOpen] = useState(false);

  // Split the final generate_report step out as the hero summary; the rest
  // become the audit log entries.
  const { heroStep } = useMemo(() => {
    const idxFromEnd = [...report.steps].reverse().findIndex(
      (s) => s.operation === 'generate_report' && s.status === 'complete' && s.output,
    );
    if (idxFromEnd === -1) {
      return { heroStep: null as WorkflowReportStep | null };
    }
    const heroIdx = report.steps.length - 1 - idxFromEnd;
    return { heroStep: report.steps[heroIdx] };
  }, [report.steps]);

  const summary = heroStep?.output
    || [...report.steps].reverse().find((s) => s.status === 'complete' && s.output)?.output
    || '';

  const hasPartialFailure = (report.failedDocs && report.failedDocs.length > 0) || false;
  const inWorkspace = report.knowledgeSource === 'workspace';
  const docCount = report.docsProcessed.length;

  const handleDownloadPDF = () => openPrintableWindow(report, userName);

  return (
    <>
      <div
        style={{
          background: '#FFFFFF',
          padding: '28px 32px 24px',
          maxWidth: 760,
          margin: '0 auto',
          fontFamily: "'DM Sans', sans-serif",
          color: 'var(--text-primary)',
        }}
      >
        {/* Eyebrow */}
        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 10 }}>
          Workflow report · {report.practiceArea} · {formatDate(report.runAt)}
        </div>

        {/* Title */}
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: '#0B1D3A', margin: '0 0 8px 0', lineHeight: 1.15, fontWeight: 400, letterSpacing: '-0.01em' }}>
          {report.workflowName}
        </h2>

        {/* Meta caption — one line under the title */}
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.55, marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {inWorkspace
            ? <><Briefcase size={12} style={{ color: '#6B7280' }} /> <span>{report.workspaceName || 'Workspace'} + Global KB</span></>
            : <><Database size={12} style={{ color: '#6B7280' }} /> <span>Global KB</span></>
          }
          <span style={{ color: '#D1D5DB' }}>·</span>
          <span>{docCount} document{docCount === 1 ? '' : 's'} analysed</span>
          {hasPartialFailure && (
            <>
              <span style={{ color: '#D1D5DB' }}>·</span>
              <span style={{ color: '#B45309' }}>{report.failedDocs!.length} could not be read</span>
            </>
          )}
          <span style={{ color: '#D1D5DB' }}>·</span>
          <span>{report.durationSeconds}s runtime</span>
        </div>

        {/* Partial failure gentle note */}
        {hasPartialFailure && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#6B4E1F', lineHeight: 1.55, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertTriangle size={13} style={{ color: '#C9A84C', flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>{report.failedDocs!.length} document{report.failedDocs!.length !== 1 ? 's' : ''}</strong>{' '}
              could not be parsed and {report.failedDocs!.length === 1 ? 'was' : 'were'} excluded from this analysis. The report continues with what could be processed.
            </span>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: '#F3F0E8', margin: '22px 0 24px' }} />

        {/* Summary — editorial prose */}
        {summary ? (
          <div style={{ fontSize: 15, color: '#1F2937', lineHeight: 1.8 }}>
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#0B1D3A', fontWeight: 400, margin: '0 0 14px 0', lineHeight: 1.25 }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: '#0B1D3A', fontWeight: 400, margin: '24px 0 10px 0', lineHeight: 1.3 }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ fontSize: 14, color: '#0B1D3A', fontWeight: 600, margin: '18px 0 8px 0', letterSpacing: '0.01em' }}>{children}</h3>,
                p:  ({ children }) => <p style={{ margin: '0 0 14px 0' }}>{children}</p>,
                ul: ({ children }) => <ul style={{ paddingLeft: 22, margin: '8px 0 14px 0' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ paddingLeft: 22, margin: '8px 0 14px 0' }}>{children}</ol>,
                li: ({ children }) => <li style={{ marginBottom: 6, lineHeight: 1.75 }}>{children}</li>,
                strong: ({ children }) => <strong style={{ color: '#0B1D3A', fontWeight: 600 }}>{children}</strong>,
                em: ({ children }) => <em style={{ color: '#374151' }}>{children}</em>,
                blockquote: ({ children }) => (
                  <blockquote style={{ borderLeft: '3px solid #C9A84C', paddingLeft: 16, margin: '14px 0', fontStyle: 'italic', color: '#4B5563' }}>
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, background: '#F3F4F6', padding: '1px 6px', borderRadius: 4, color: '#1F2937' }}>{children}</code>,
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No summary was produced by the final step. Open the audit log to see per-step findings.
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid #F3F0E8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.02em' }}>
            Generated {relativeFrom(report.runAt)}{userName ? ` · ${userName}` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setAuditOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, background: 'transparent', color: 'var(--text-muted)', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--navy)'; (e.currentTarget as HTMLElement).style.background = '#F3ECDD'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <History size={13} /> View audit log
            </button>
            <button
              onClick={handleDownloadPDF}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#fff', color: 'var(--navy)', border: '1px solid var(--navy)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            >
              <Download size={12} /> Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Audit log modal — shows docs processed + per-step findings */}
      {auditOpen && (
        <AuditLogModal
          report={report}
          onClose={() => setAuditOpen(false)}
          onRetryStep={onRetryStep}
        />
      )}
    </>
  );
}

/* ─── Audit log modal ─────────────────────────────────────────────── */

function AuditLogModal({ report, onClose, onRetryStep }: {
  report: WorkflowReport;
  onClose: () => void;
  onRetryStep?: (stepIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 80, backdropFilter: 'blur(4px)' }} />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 'min(680px, 92vw)', maxHeight: '86vh', background: '#fff',
          borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          zIndex: 81, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 4 }}>
              Audit log
            </div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#0B1D3A', fontWeight: 400, lineHeight: 1.3 }}>
              {report.workflowName}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
            <XIcon size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 20px' }}>
          {/* Documents processed */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8 }}>
              Documents analysed
            </div>
            {report.docsProcessed.length === 0 && !(report.failedDocs && report.failedDocs.length > 0) ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No documents were uploaded for this run.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {report.docsProcessed.map((name, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>
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

          {/* Per-step findings */}
          <div>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8 }}>
              Step findings
            </div>
            {report.steps.map((step, i) => (
              <AuditStepRow
                key={i}
                step={step}
                index={i}
                expanded={expanded.has(i)}
                onToggle={() => toggle(i)}
                onRetry={onRetryStep ? () => { onRetryStep(i); onClose(); } : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Per-step collapsible row (inside the audit modal) ─── */

function AuditStepRow({ step, index, expanded, onToggle, onRetry }: {
  step: WorkflowReportStep;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onRetry?: () => void;
}) {
  const cfg = OPERATION_CONFIG[step.operation];
  const Icon = OP_ICON[step.operation];
  const isFailed = step.status === 'failed';
  // Only show operation label in subtitle when step.name has an explicit
  // override — otherwise the title already shows it and the subtitle echoes.
  const hasDistinctTitle = !!step.name && step.name !== cfg?.label;

  return (
    <div style={{ borderTop: index === 0 ? 'none' : '1px solid #F3F4F6', padding: '12px 0' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 26, height: 26, padding: '0 7px', borderRadius: 6,
          background: '#F3F4F6', color: '#6B7280',
          fontSize: 11, fontWeight: 600,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          flexShrink: 0,
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <Icon size={13} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: isFailed ? '#C65454' : '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {step.name || cfg?.label || 'Step'}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
            {hasDistinctTitle && <>{cfg?.label || step.operation.replace(/_/g, ' ')} · </>}
            {step.sourceUsed} · {step.durationSeconds}s
            {isFailed && <> · <span style={{ color: '#C65454' }}>failed</span></>}
          </div>
        </div>
        <ChevronDown size={13} style={{ color: '#9CA3AF', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms', flexShrink: 0 }} />
      </button>

      {expanded && (
        <div style={{ marginTop: 10, marginLeft: 28, padding: '12px 14px', borderRadius: 8, background: '#FBFAF7', border: '1px solid var(--border)', fontSize: 13, color: '#1F2937', lineHeight: 1.7 }}>
          {step.output ? (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                strong: ({ children }) => <strong style={{ color: 'var(--navy)' }}>{children}</strong>,
                h1: ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 600, margin: '10px 0 6px 0' }}>{children}</h3>,
                h2: ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 600, margin: '10px 0 6px 0' }}>{children}</h3>,
                h3: ({ children }) => <h4 style={{ fontSize: 12, fontWeight: 600, margin: '8px 0 4px 0' }}>{children}</h4>,
                ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '4px 0 8px 0' }}>{children}</ul>,
                li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
              }}
            >
              {step.output}
            </ReactMarkdown>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No output for this step.</div>
          )}
          {isFailed && onRetry && (
            <button
              onClick={onRetry}
              style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
            >
              <RefreshCw size={11} /> Retry step
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Printable (Save-as-PDF) window ─────────────────────────────── */

function openPrintableWindow(report: WorkflowReport, userName?: string): void {
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) return;

  const esc = (s: string) => (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const summary = [...report.steps].reverse().find(
    (s) => s.operation === 'generate_report' && s.status === 'complete' && s.output
  )?.output
    || [...report.steps].reverse().find((s) => s.status === 'complete' && s.output)?.output
    || '';

  // Naive markdown → HTML (enough for print)
  const md = (raw: string) => {
    let out = esc(raw);
    out = out.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    out = out.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    out = out.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Simple bullet list handling
    out = out.replace(/(^|\n)([-*] .+(\n[-*] .+)*)/g, (_m, pre, block) => {
      const items = block.split(/\n/).map((l: string) => l.replace(/^[-*] /, '')).map((li: string) => `<li>${li}</li>`).join('');
      return `${pre}<ul>${items}</ul>`;
    });
    out = out.replace(/\n\n/g, '</p><p>');
    return `<p>${out}</p>`;
  };

  const docsRow = report.docsProcessed.length > 0
    ? report.docsProcessed.map((d) => `<span class="doc">${esc(d)}</span>`).join(' ')
    : '<span class="muted">No documents were uploaded for this run.</span>';

  const failedRow = (report.failedDocs || []).length > 0
    ? `<div class="warn">${report.failedDocs!.length} document${report.failedDocs!.length !== 1 ? 's' : ''} could not be parsed: ${report.failedDocs!.map(esc).join(', ')}.</div>`
    : '';

  const stepsMarkup = report.steps.map((s, i) => {
    const opLabel = (s.operation || '').replace(/_/g, ' ');
    return `
      <section class="step">
        <div class="step-head">
          <span class="step-num">${String(i + 1).padStart(2, '0')}</span>
          <strong>${esc(s.name || opLabel)}</strong>
          <span class="muted">· ${esc(opLabel)} · ${esc(s.sourceUsed || '')} · ${s.durationSeconds || 0}s${s.status === 'failed' ? ' · failed' : ''}</span>
        </div>
        <div class="step-body">${s.output ? md(s.output) : '<p class="muted"><em>No output.</em></p>'}</div>
      </section>
    `;
  }).join('');

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(report.workflowName)} — Workflow Report</title>
<style>
  :root { --ink: #0B1D3A; --muted: #6B7280; --border: #E5E7EB; --accent: #C9A84C; }
  * { box-sizing: border-box; }
  body { font-family: 'DM Sans', -apple-system, Segoe UI, Roboto, sans-serif; color: #1F2937; max-width: 760px; margin: 32px auto; padding: 0 28px; line-height: 1.7; }
  .eyebrow { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
  h1.title { font-family: 'DM Serif Display', 'Cormorant Garamond', Georgia, serif; font-size: 32px; color: var(--ink); margin: 0 0 8px; font-weight: 400; letter-spacing: -0.01em; line-height: 1.12; }
  .caption { font-size: 13px; color: var(--muted); }
  .caption span + span::before { content: " · "; color: #D1D5DB; }
  .warn { margin-top: 12px; padding: 10px 12px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; font-size: 12px; color: #6B4E1F; }
  .divider { height: 1px; background: #F3F0E8; margin: 24px 0; }
  h1, h2, h3 { color: var(--ink); font-weight: 600; }
  h2 { font-family: 'DM Serif Display', Georgia, serif; font-size: 20px; font-weight: 400; margin: 24px 0 10px; }
  h3 { font-size: 15px; margin: 18px 0 8px; }
  p { margin: 0 0 12px; font-size: 14px; }
  ul { margin: 8px 0 12px; padding-left: 22px; }
  li { margin-bottom: 4px; }
  strong { color: var(--ink); }
  section.audit-head { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-top: 32px; margin-bottom: 8px; }
  .docs-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .doc { display: inline-block; font-size: 11px; padding: 3px 10px; border-radius: 999px; background: #F3F4F6; border: 1px solid var(--border); color: #374151; }
  section.step { padding: 12px 0; border-top: 1px solid #F3F4F6; }
  section.step:first-of-type { border-top: none; }
  .step-head { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 4px; }
  .step-num { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--muted); }
  .step-body { font-size: 13px; color: #1F2937; padding-left: 26px; }
  .muted { color: var(--muted); font-weight: 400; }
  .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #F3F0E8; font-size: 11px; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.02em; }
  @media print {
    body { margin: 0.5in; padding: 0; }
    .noprint { display: none; }
  }
</style>
</head>
<body>
  <div class="eyebrow">Workflow report · ${esc(report.practiceArea)} · ${esc(formatDate(report.runAt))}</div>
  <h1 class="title">${esc(report.workflowName)}</h1>
  <div class="caption">
    <span>${report.knowledgeSource === 'workspace' ? `${esc(report.workspaceName || 'Workspace')} + Global KB` : 'Global KB'}</span>
    <span>${report.docsProcessed.length} document${report.docsProcessed.length === 1 ? '' : 's'} analysed</span>
    <span>${report.durationSeconds}s runtime</span>
  </div>
  ${failedRow}
  <div class="divider"></div>
  ${md(summary)}
  <section class="audit-head">Audit log</section>
  <div class="docs-row">${docsRow}</div>
  ${stepsMarkup}
  <div class="footer">Generated ${esc(formatDate(report.runAt))}${userName ? ' · ' + esc(userName) : ''}</div>
  <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}
