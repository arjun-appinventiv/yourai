/* ─────────────── Pre-Run Modal ───────────────
 *
 * Triggered when the user clicks Run on a workflow card. Shows the
 * steps preview, knowledge-source banner (workspace vs global), and a
 * drag-drop zone for the working documents the workflow will analyse.
 *
 * On confirm: closes itself + WorkflowsPanel, starts a run via
 * startRun(), and returns the WorkflowRun to the caller so the chat
 * can drop a WorkflowProgressCard into the current thread.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Plus, FileText, Clock,
  UploadCloud, Loader, AlertTriangle, CheckCircle, Trash2,
  FileText as FileTextIcon, Search as SearchIcon, GitCompare,
  FileOutput, BookOpen, ShieldCheck, ArrowRight, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  type WorkflowTemplate, type UploadedDoc, type WorkflowOperation,
  OPERATION_CONFIG,
} from '../../lib/workflow';
import { startRun } from '../../lib/workflowRunner';
import { extractFileText } from '../../lib/file-parser';
import { classifyDocs, type DocClassification } from '../../lib/workflowExecutor';

const OP_ICON: Record<WorkflowOperation, React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>> = {
  read_documents: FileTextIcon,
  analyse_clauses: SearchIcon,
  compare_against_standard: GitCompare,
  generate_report: FileOutput,
  research_precedents: BookOpen,
  compliance_check: ShieldCheck,
};

const ACCEPTED = ['pdf', 'docx', 'xlsx', 'txt'];
const MAX_BYTES = 100 * 1024 * 1024;

export interface PreRunModalProps {
  template: WorkflowTemplate;
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceHasDocs?: boolean;
  onCancel: () => void;
  onStarted: (runId: string) => void;
  onToast?: (msg: string) => void;
}

export default function PreRunModal({ template, workspaceId, workspaceName, workspaceHasDocs, onCancel, onStarted, onToast }: PreRunModalProps) {
  const { operator } = useAuth();
  const currentUserId = operator?.id || 'user-ryan';
  const currentUserName = operator?.name || 'You';

  const [uploads, setUploads] = useState<UploadedDoc[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(template.steps[0]?.id || null);
  const [runAttempted, setRunAttempted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Keyed by upload name — stable across re-renders, tolerates id churn.
  const [classifications, setClassifications] = useState<Record<string, DocClassification>>({});
  const [classifying, setClassifying] = useState(false);

  const inWorkspace = !!workspaceId;
  const workspaceHasNoDocs = inWorkspace && workspaceHasDocs === false;

  const anyProcessing = uploads.some((d) => d.status === 'processing');
  const anyReady = uploads.some((d) => d.status === 'ready');
  const canRun = !anyProcessing && uploads.length > 0;

  const requestClose = () => {
    if (uploads.length > 0) {
      const confirmed = window.confirm('Close this workflow run setup? Your uploaded files will be removed from this draft.');
      if (!confirmed) return;
    }
    onCancel();
  };

  // Pre-flight classification — fires once all uploads finish processing,
  // only for ready docs we haven't classified yet. Advisory only; never
  // blocks Run. See FRD_Incorrect_Document_Handling Stage 1.
  useEffect(() => {
    if (anyProcessing) return;
    const unclassified = uploads.filter(
      (u) => u.status === 'ready' && u.content && u.content.trim().length > 50 && !classifications[u.name]
    );
    if (unclassified.length === 0) return;
    let cancelled = false;
    setClassifying(true);
    classifyDocs(unclassified.map((u) => ({ name: u.name, content: u.content })))
      .then((results) => {
        if (cancelled) return;
        setClassifications((prev) => {
          const next = { ...prev };
          results.forEach((r) => { next[r.name] = r; });
          return next;
        });
      })
      .finally(() => { if (!cancelled) setClassifying(false); });
    return () => { cancelled = true; };
  }, [uploads, anyProcessing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aggregate detected-type summary — "Identified: 2 contracts, 1 memo"
  const classificationSummary = React.useMemo(() => {
    const entries = Object.values(classifications);
    if (entries.length === 0) return '';
    const counts = new Map<string, number>();
    entries.forEach((c) => counts.set(c.type, (counts.get(c.type) || 0) + 1));
    return Array.from(counts.entries())
      .map(([type, n]) => `${n} ${type}${n === 1 ? '' : 's'}`)
      .join(', ');
  }, [classifications]);

  const handleFilesPicked = async (files: FileList | File[]) => {
    const picked = Array.from(files);
    for (const f of picked) {
      const ext = f.name.lastIndexOf('.') !== -1 ? f.name.slice(f.name.lastIndexOf('.') + 1).toLowerCase() : '';
      const id = `up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (!ACCEPTED.includes(ext)) {
        setUploads((prev) => [...prev, { id, name: f.name, size: f.size, type: ext, status: 'failed', content: `Unsupported file type. Upload PDF, DOCX, XLSX, or TXT.` }]);
        continue;
      }
      if (f.size > MAX_BYTES) {
        setUploads((prev) => [...prev, { id, name: f.name, size: f.size, type: ext, status: 'failed', content: `File exceeds the 100 MB limit.` }]);
        continue;
      }

      // Dedupe by filename — matches workspace-upload dedupe behaviour.
      if (uploads.some((x) => x.name === f.name)) continue;

      const pending: UploadedDoc = { id, name: f.name, size: f.size, type: ext, status: 'processing', content: null };
      setUploads((prev) => [...prev, pending]);

      try {
        const res = await extractFileText(f);
        setUploads((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'ready', content: res?.text || '' } : x)));
      } catch {
        setUploads((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'failed', content: 'We could not read this file. Try a different file or format.' } : x)));
      }
    }
  };

  const removeUpload = (id: string) => setUploads((prev) => prev.filter((x) => x.id !== id));

  const handleRun = () => {
    setRunAttempted(true);
    if (!canRun) return;
    // Only ready docs go into the run. Failed docs are excluded but
    // surfaced in the report card as partial-failure warnings.
    const readyDocs = uploads.filter((d) => d.status === 'ready');
    const allRelevant = uploads.filter((d) => d.status === 'ready' || d.status === 'failed');

    const run = startRun({
      template,
      uploadedDocs: allRelevant,
      userId: currentUserId,
      userName: currentUserName,
      workspaceId,
      workspaceName,
    });
    onStarted(run.id);
    onToast?.(`${template.name} started`);
  };

  const fileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div onClick={requestClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 560, maxHeight: '88vh', background: '#fff',
          borderRadius: 16, boxShadow: '0 20px 60px rgba(11,29,58,0.18)',
          zIndex: 71, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <button
              onClick={requestClose}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            >
              ← Back to Workflows
            </button>
            <button onClick={() => onToast?.('Editing is available from the Workflows builder.')} style={headerLinkStyle}>
              Edit workflow
            </button>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                {template.name}
              </h3>
              <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: 420 }}>
                {template.description || `Analyse ${template.practiceArea.toLowerCase()} documents to identify risks and generate a structured report.`}
              </p>
              <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 6 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--ice-warm)', color: 'var(--navy)', border: '1px solid var(--border)', fontWeight: 500 }}>
                  {template.practiceArea}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> {template.steps.length} steps · ~{template.estimatedTotalSeconds}s estimated
                </span>
              </div>
            </div>
            <button onClick={requestClose} className="p-1.5 rounded-lg hover:bg-gray-100" style={{ flexShrink: 0 }}>
              <X size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 10px' }}>
          {/* Sibling warning (no nested banner) */}
          {workspaceHasNoDocs && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A', color: '#6B4E1F', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.45 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              <span>This workspace has no documents yet — steps will fall back to global KB.</span>
            </div>
          )}

          {/* Steps preview — expandable vertical list */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Workflow Steps
            </div>
            <div style={{ display: 'grid', gap: 8, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 14, top: 16, bottom: 16, width: 1, background: 'var(--border)', opacity: 0.9 }} />
              {template.steps.map((s, i) => {
                const cfg = OPERATION_CONFIG[s.operation];
                const Icon = OP_ICON[s.operation];
                const expanded = expandedStepId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setExpandedStepId((prev) => (prev === s.id ? null : s.id))}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto minmax(0,1fr) auto',
                      gap: 12,
                      alignItems: 'start',
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: expanded ? '#FFFFFF' : 'var(--ice-warm)',
                      border: `1px solid ${expanded ? 'rgba(11,29,58,0.16)' : 'var(--border)'}`,
                      boxShadow: expanded ? '0 2px 8px rgba(11,29,58,0.06)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 10.5,
                          fontWeight: 600,
                          border: '1px solid rgba(201,168,76,0.38)',
                          background: 'linear-gradient(180deg, rgba(212,185,106,0.18) 0%, rgba(201,168,76,0.08) 100%)',
                          color: 'var(--brand-gold)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
                        }}>
                          <Icon size={10} /> {cfg.label}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {cfg.label}
                        </span>
                      </div>
                      {expanded && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                          {cfg.description}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 2 }}>{expanded ? '−' : '+'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload documents */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Upload your working documents
              </div>
              <span style={{ fontSize: 10, color: 'var(--status-error, #C44F4F)', fontWeight: 600 }}>* Required</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: 1.55 }}>
              These are the documents the workflow will analyse. Upload all relevant files before running.
            </p>
            {runAttempted && !anyReady && (
              <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(196,84,84,0.08)', border: '1px solid rgba(196,84,84,0.18)', color: '#A33F3F', fontSize: 12 }}>
                Add at least one valid file before running this workflow.
              </div>
            )}

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files) handleFilesPicked(e.dataTransfer.files); }}
              style={{
                padding: '20px 18px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                border: `1.5px dashed ${dragActive ? '#C9A84C' : 'var(--border)'}`,
                background: dragActive ? 'rgba(201,168,76,0.08)' : '#FFFFFF',
                transition: 'all 120ms',
              }}
            >
              <UploadCloud size={32} style={{ margin: '0 auto 10px', color: dragActive ? '#C9A84C' : 'var(--navy)', opacity: 0.85 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Drag files here to upload</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>PDF, DOCX, XLSX, TXT · up to 100 MB each</div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', fontSize: 12, fontWeight: 500, color: 'var(--navy)', cursor: 'pointer' }}
              >
                or browse files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.txt"
                style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files) handleFilesPicked(e.target.files); e.target.value = ''; }}
              />
            </div>

            {uploads.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {uploads.map((u) => (
                  <UploadRow
                    key={u.id}
                    upload={u}
                    classification={classifications[u.name]}
                    onRemove={() => removeUpload(u.id)}
                    sizeStr={fileSize(u.size)}
                  />
                ))}
              </div>
            )}

            {/* Pre-flight classification summary — advisory, only shown once at
                least one doc has been classified. */}
            {(classifying || classificationSummary) && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 8,
                background: '#F8FAFF', border: '1px solid #DBEAFE',
                fontSize: 11, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.45,
              }}>
                {classifying
                  ? <><Loader size={11} className="animate-spin" /> <span>Identifying document types…</span></>
                  : <><CheckCircle size={11} style={{ color: '#1D4ED8' }} /> <span><strong>Identified:</strong> {classificationSummary}</span></>
                }
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Takes ~{template.estimatedTotalSeconds}s • No changes will be made to your documents
          </div>
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            <button onClick={requestClose} style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>
              Cancel
            </button>
            <button
              onClick={handleRun}
              disabled={!canRun}
              title={!canRun && !anyProcessing ? 'Upload at least one document to run' : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 10, border: 'none',
                background: canRun ? 'var(--navy)' : '#9CA3AF',
                color: '#fff', fontSize: 13, fontWeight: 500,
                cursor: canRun ? 'pointer' : 'not-allowed',
              }}
            >
              {anyProcessing ? <><Loader size={13} className="animate-spin" /> Processing files…</> : <><Plus size={13} /> Run Workflow</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function UploadRow({ upload, classification, onRemove, sizeStr }: {
  upload: UploadedDoc;
  classification?: DocClassification;
  onRemove: () => void;
  sizeStr: string;
}) {
  const statusBadge = (() => {
    if (upload.status === 'ready')      return { bg: '#E7F3E9', color: '#5CA868', label: 'Ready',      Icon: CheckCircle };
    if (upload.status === 'failed')     return { bg: '#F9E7E7', color: '#C65454', label: 'Failed',     Icon: AlertTriangle };
    return                                     { bg: '#FBEED5', color: '#E8A33D', label: 'Processing', Icon: Loader };
  })();
  const { Icon } = statusBadge;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 10px', borderRadius: 10, background: upload.status === 'failed' ? '#FEF7F7' : 'var(--ice-warm)', border: `1px solid ${upload.status === 'failed' ? '#F9E7E7' : 'var(--border)'}` }}>
      <FileText size={13} style={{ color: 'var(--navy)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upload.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>{upload.type.toUpperCase()} · {sizeStr}</span>
          {upload.status === 'failed' && upload.content && (
            <div style={{ fontSize: 10.5, color: '#A33F3F', marginTop: 6, lineHeight: 1.5, width: '100%' }}>
              {upload.content}
            </div>
          )}
          {classification && (
            <span
              title={`Detected ${classification.type} (${classification.confidence} confidence)`}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '1px 7px', borderRadius: 999,
                background: '#EFF6FF', color: '#1D4ED8',
                border: '1px solid #DBEAFE',
                fontSize: 9, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
              }}
            >
              {classification.type}
            </span>
          )}
        </div>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: statusBadge.bg, color: statusBadge.color, fontSize: 10, fontWeight: 500 }}>
        <Icon size={10} className={upload.status === 'processing' ? 'animate-spin' : ''} />
        {statusBadge.label}
      </span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', flexShrink: 0, display: 'flex' }}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}


const headerLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};
