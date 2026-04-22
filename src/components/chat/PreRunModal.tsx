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

import React, { useRef, useState } from 'react';
import {
  X, Plus, Briefcase, Database, FileText, Clock,
  UploadCloud, Loader, AlertTriangle, CheckCircle, Trash2,
  FileText as FileTextIcon, Search as SearchIcon, GitCompare,
  FileOutput, BookOpen, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  type WorkflowTemplate, type UploadedDoc, type WorkflowOperation,
  OPERATION_CONFIG,
} from '../../lib/workflow';
import { startRun } from '../../lib/workflowRunner';
import { extractFileText } from '../../lib/file-parser';

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const inWorkspace = !!workspaceId;
  const workspaceHasNoDocs = inWorkspace && workspaceHasDocs === false;

  const anyProcessing = uploads.some((d) => d.status === 'processing');
  const anyReady = uploads.some((d) => d.status === 'ready');
  const canRun = !anyProcessing && uploads.length > 0;

  const handleFilesPicked = async (files: FileList | File[]) => {
    const picked = Array.from(files);
    for (const f of picked) {
      const ext = f.name.lastIndexOf('.') !== -1 ? f.name.slice(f.name.lastIndexOf('.') + 1).toLowerCase() : '';
      const id = `up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (!ACCEPTED.includes(ext)) {
        setUploads((prev) => [...prev, { id, name: f.name, size: f.size, type: ext, status: 'failed', content: null }]);
        continue;
      }
      if (f.size > MAX_BYTES) {
        setUploads((prev) => [...prev, { id, name: f.name, size: f.size, type: ext, status: 'failed', content: null }]);
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
        setUploads((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'failed' } : x)));
      }
    }
  };

  const removeUpload = (id: string) => setUploads((prev) => prev.filter((x) => x.id !== id));

  const handleRun = () => {
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
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 520, maxHeight: '88vh', background: '#fff',
          borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          zIndex: 71, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                {template.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 6 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--ice-warm)', color: 'var(--navy)', border: '1px solid var(--border)', fontWeight: 500 }}>
                  {template.practiceArea}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> {template.steps.length} steps · ~{template.estimatedTotalSeconds}s estimated
                </span>
              </div>
            </div>
            <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100" style={{ flexShrink: 0 }}>
              <X size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 8px' }}>
          {/* Knowledge source */}
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 16,
            display: 'flex', alignItems: 'flex-start', gap: 10,
            ...(inWorkspace
              ? { background: '#EFF6FF', border: '1px solid #BFDBFE' }
              : { background: '#F3F4F6', border: '1px solid #E5E7EB' }),
          }}>
            {inWorkspace
              ? <Briefcase size={14} style={{ color: '#1D4ED8', flexShrink: 0, marginTop: 2 }} />
              : <Database size={14} style={{ color: '#6B7280', flexShrink: 0, marginTop: 2 }} />
            }
            <div style={{ fontSize: 12, lineHeight: 1.55, color: inWorkspace ? '#1E3A8A' : 'var(--text-secondary)' }}>
              {inWorkspace ? (
                <>
                  <strong>{workspaceName}</strong> — workspace documents are the primary knowledge source, supplemented by the YourAI global knowledge base.
                  {workspaceHasNoDocs && (
                    <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A', color: '#6B4E1F', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={11} />
                      <span>This workspace has no documents yet — steps will fall back to global KB.</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  Running from main chat — uses the <strong>YourAI global knowledge base</strong>. For case-specific results, run this workflow from inside a workspace.
                </>
              )}
            </div>
          </div>

          {/* Steps preview */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Workflow Steps
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {template.steps.map((s, i) => {
                const cfg = OPERATION_CONFIG[s.operation];
                const Icon = OP_ICON[s.operation];
                return (
                  <div key={s.id} className="flex items-center gap-2" style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <span className={cfg.color} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 500, border: '1px solid' }}>
                      <Icon size={10} /> {cfg.label}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.name || <em style={{ color: 'var(--text-muted)' }}>unnamed</em>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upload documents */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Upload your working documents
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: 1.55 }}>
              These are the documents the workflow will analyse. Upload all relevant files before running.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files) handleFilesPicked(e.dataTransfer.files); }}
              style={{
                padding: '24px 18px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                border: `2px dashed ${dragActive ? '#C9A84C' : 'var(--border)'}`,
                background: dragActive ? '#FDF6E3' : '#FBFAF7',
                transition: 'all 120ms',
              }}
            >
              <UploadCloud size={24} style={{ margin: '0 auto 8px', color: dragActive ? '#C9A84C' : 'var(--navy)', opacity: 0.8 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Drag files here or click to browse</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>PDF, DOCX, XLSX, TXT · up to 100 MB each</div>
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
                  <UploadRow key={u.id} upload={u} onRemove={() => removeUpload(u.id)} sizeStr={fileSize(u.size)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
            ~{template.estimatedTotalSeconds}s estimated
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>
              Cancel
            </button>
            <button
              onClick={handleRun}
              disabled={!canRun}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 8, border: 'none',
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

function UploadRow({ upload, onRemove, sizeStr }: { upload: UploadedDoc; onRemove: () => void; sizeStr: string }) {
  const statusBadge = (() => {
    if (upload.status === 'ready')      return { bg: '#E7F3E9', color: '#5CA868', label: 'Ready',      Icon: CheckCircle };
    if (upload.status === 'failed')     return { bg: '#F9E7E7', color: '#C65454', label: 'Failed',     Icon: AlertTriangle };
    return                                     { bg: '#FBEED5', color: '#E8A33D', label: 'Processing', Icon: Loader };
  })();
  const { Icon } = statusBadge;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: upload.status === 'failed' ? '#FEF7F7' : 'var(--ice-warm)', border: `1px solid ${upload.status === 'failed' ? '#F9E7E7' : 'var(--border)'}` }}>
      <FileText size={13} style={{ color: 'var(--navy)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upload.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{upload.type.toUpperCase()} · {sizeStr}</div>
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
