/* ─────────────── Workflow Templates Picker ───────────────
 *
 * Modal overlay — matches the Knowledge Packs panel layout: 900px wide,
 * sticky header, filter pills, search, list of cards. Dispatches to the
 * parent for Run / Edit / Duplicate / Delete / Create actions so the
 * parent controls modal chrome and which surface the workflow runs on
 * (workspace vs main chat).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Plus, Search, MoreVertical, Edit3, Copy, Trash2,
  Clock, Loader, Zap, Briefcase as BriefcaseIcon,
  FileText, Search as SearchIcon, GitCompare, FileOutput,
  BookOpen, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import {
  type WorkflowTemplate, type WorkflowVisibility, type WorkflowOperation,
  type WorkflowRun,
  type PermissionContext,
  OPERATION_CONFIG,
  listTemplatesForUser, seedTemplatesIfEmpty, getActiveRunId, getRun,
  listRuns,
  canCreateWorkflow, canEditTemplate, canDeleteTemplate,
} from '../../lib/workflow';
import { MOCK_WORKFLOW_TEMPLATES } from '../../lib/mockWorkflows';

/* ─── Icon map — keeps OPERATION_CONFIG's icon string → component ─── */
const OP_ICON: Record<WorkflowOperation, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  read_documents:           FileText,
  analyse_clauses:          SearchIcon,
  compare_against_standard: GitCompare,
  generate_report:          FileOutput,
  research_precedents:      BookOpen,
  compliance_check:         ShieldCheck,
};

/* ─── Relative date helper (mirrors the one in WorkspacesPage) ─── */
function relativeFrom(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

/* ─── Visibility badge styling ─── */
const VISIBILITY_BADGE: Record<WorkflowVisibility, { bg: string; color: string; border: string; label: string }> = {
  platform: { bg: '#0A2463',  color: '#FFFFFF', border: '#0A2463',  label: 'Platform' },
  org:      { bg: '#EFF6FF',  color: '#1D4ED8', border: '#BFDBFE',  label: 'Your Org' },
  personal: { bg: '#F3F4F6',  color: '#6B7280', border: '#E5E7EB',  label: 'Yours' },
};

type FilterKey = 'all' | WorkflowVisibility;

export interface WorkflowsPanelProps {
  onClose: () => void;
  onCreateNew: () => void;
  onRun: (template: WorkflowTemplate) => void;
  onEdit: (template: WorkflowTemplate) => void;
  onDuplicate: (template: WorkflowTemplate) => void;
  onDelete: (id: string) => void;
}

export default function WorkflowsPanel({ onClose, onCreateNew, onRun, onEdit, onDuplicate, onDelete }: WorkflowsPanelProps) {
  const { operator } = useAuth();
  const { currentRole, isOrgAdmin, isExternalUser } = useRole();

  // Clients (External Users) never access Workflows. Belt-and-suspenders
  // with the upstream sidebar gate — if this panel somehow mounts for an
  // External (stale URL, deep link, etc.) it renders nothing and closes.
  useEffect(() => {
    if (isExternalUser) onClose();
  }, [isExternalUser, onClose]);
  if (isExternalUser) return null;

  const currentUserId = operator?.id || 'user-ryan';

  // PermissionContext shape the lib/workflow helpers accept.
  // Super-Admin detection for the tenant app isn't wired up yet — ORG_ADMIN
  // is the highest level a user can be inside /chat. So isSuperAdmin=false
  // here; the SA portal would supply its own version of this component.
  const ctx: PermissionContext = useMemo(() => ({
    userId: currentUserId,
    isSuperAdmin: false,
    isOrgAdmin,
    isExternalUser,
  }), [currentUserId, isOrgAdmin, isExternalUser]);

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  // Snapshot the active-run info once so the picker can visually dim the
  // corresponding card's Run button. Changing activeRunId during the
  // lifetime of this modal is rare; re-reading on close is enough.
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<WorkflowRun | null>(null);
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([]);

  useEffect(() => {
    seedTemplatesIfEmpty(MOCK_WORKFLOW_TEMPLATES);
    refresh();
    const rid = getActiveRunId();
    if (rid) {
      const run = getRun(rid);
      if (run && (run.status === 'running')) {
        setActiveTemplateId(run.templateId);
        setActiveRun(run);
      }
    }
    // Last 5 finished runs for the "Recent runs" strip
    const all = listRuns()
      .filter((r) => r.status !== 'running' && r.userId === currentUserId)
      .slice(0, 5);
    setRecentRuns(all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => {
    setTemplates(listTemplatesForUser(currentUserId, currentRole));
  };

  // Externals see only Platform templates — the filter pills would be
  // mostly empty buckets. Skip them entirely and rely on the upstream
  // visibility filter to keep things clean.
  const showFilters = !isExternalUser;

  // Counts per bucket before search narrows things further, so the pill
  // numbers stay stable while the user types.
  const counts = useMemo(() => ({
    all: templates.length,
    platform: templates.filter((t) => t.visibility === 'platform').length,
    org:      templates.filter((t) => t.visibility === 'org').length,
    personal: templates.filter((t) => t.visibility === 'personal' && t.createdBy === currentUserId).length,
  }), [templates, currentUserId]);

  const scoped = useMemo(() => {
    if (filter === 'all') return templates;
    if (filter === 'personal') return templates.filter((t) => t.visibility === 'personal' && t.createdBy === currentUserId);
    return templates.filter((t) => t.visibility === filter);
  }, [templates, filter, currentUserId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return scoped;
    const q = search.toLowerCase();
    return scoped.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.practiceArea || '').toLowerCase().includes(q),
    );
  }, [scoped, search]);

  const handleDelete = (t: WorkflowTemplate) => {
    if (!confirm(`Delete "${t.name}"? This can't be undone.`)) return;
    onDelete(t.id);
    setMenuOpenFor(null);
    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: '#FAF6EE', // warm ivory — signals "different module" from chat
      minWidth: 0, minHeight: 0, overflow: 'hidden',
    }}>
      {/* ─── Page header ─── */}
      <div style={{
        padding: '22px 36px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg, #FDFBF5 0%, #FAF6EE 100%)',
      }}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'var(--navy)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Zap size={22} style={{ color: '#C9A84C' }} />
            </div>
            <div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'var(--navy)', margin: 0, lineHeight: 1.2 }}>
                Workflow Templates
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                Multi-step AI pipelines you can run over your documents. {templates.length} template{templates.length !== 1 ? 's' : ''} available.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            {canCreateWorkflow(ctx) && (
              <button
                onClick={onCreateNew}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 6px rgba(10,36,99,0.14)' }}
              >
                <Plus size={15} /> New Workflow
              </button>
            )}
            <button
              onClick={onClose}
              title="Back to chat"
              style={{ padding: 8, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F3ECDD'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <X size={20} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Scroll area ─── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 36px 36px' }}>
        {/* Running-now banner */}
        {activeRun && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', marginBottom: 20,
            background: '#FFFFFF',
            border: '1px solid #F3E4BC',
            borderLeft: '3px solid #C9A84C',
            borderRadius: 10,
            boxShadow: '0 2px 8px rgba(201,168,76,0.08)',
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              border: '2px solid #C9A84C', borderTopColor: 'transparent',
              animation: 'spin 0.9s linear infinite', flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
                Running now: {activeRun.templateName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Step {Math.min((activeRun.currentStepIndex ?? 0) + 1, activeRun.steps.length)} of {activeRun.steps.length} · started {relativeFrom(activeRun.startedAt)}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ fontSize: 12, color: 'var(--navy)', background: 'transparent', border: '1px solid var(--navy)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}
            >
              View run →
            </button>
          </div>
        )}

        {/* Filter pills + search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          {showFilters && (
            <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
              <FilterPill label="All"       count={counts.all}      active={filter === 'all'}      onClick={() => setFilter('all')} />
              <FilterPill label="Platform"  count={counts.platform} active={filter === 'platform'} onClick={() => setFilter('platform')} />
              <FilterPill label="Your Org"  count={counts.org}      active={filter === 'org'}      onClick={() => setFilter('org')} />
              <FilterPill label="Yours"     count={counts.personal} active={filter === 'personal'} onClick={() => setFilter('personal')} />
            </div>
          )}
          <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 360, marginLeft: 'auto' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workflows..."
              style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid var(--border)', paddingLeft: 36, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
            />
          </div>
        </div>

        {/* ─── Card grid ─── */}
        {filtered.length === 0 ? (
          <EmptyState
            searchActive={!!search.trim()}
            canCreate={canCreateWorkflow(ctx)}
            onCreate={onCreateNew}
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16,
          }}>
            {filtered.map((t) => (
              <WorkflowCard
                key={t.id}
                template={t}
                ctx={ctx}
                isRunning={activeTemplateId === t.id}
                menuOpen={menuOpenFor === t.id}
                onToggleMenu={() => setMenuOpenFor((x) => (x === t.id ? null : t.id))}
                onCloseMenu={() => setMenuOpenFor(null)}
                onRun={() => onRun(t)}
                onEdit={() => { onEdit(t); setMenuOpenFor(null); }}
                onDuplicate={() => { onDuplicate(t); setMenuOpenFor(null); }}
                onDelete={() => handleDelete(t)}
              />
            ))}
          </div>
        )}

        {/* ─── Recent runs ─── */}
        {recentRuns.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--text-muted)',
              marginBottom: 12,
            }}>
              <Clock size={12} /> Recent runs
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {recentRuns.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderTop: i === 0 ? 'none' : '1px solid #F3F0E8',
                    fontSize: 13,
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: r.status === 'complete' ? '#5CA868' : r.status === 'failed' ? '#C65454' : '#9CA3AF',
                    flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.templateName}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {r.status === 'complete' ? 'Completed' : r.status === 'failed' ? 'Failed' : 'Cancelled'} · {relativeFrom(r.completedAt || r.startedAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Filter pill ─── */
function FilterPill({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
        border: '1px solid ' + (active ? 'var(--navy)' : 'var(--border)'),
        background: active ? 'var(--navy)' : '#fff',
        color: active ? '#fff' : 'var(--text-secondary)',
        fontSize: 12, fontWeight: 500, transition: 'all 120ms',
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, padding: '0 6px', borderRadius: 999, background: active ? 'rgba(255,255,255,0.18)' : 'var(--ice-warm)', color: active ? '#fff' : 'var(--text-primary)', minWidth: 20, textAlign: 'center' }}>
        {count}
      </span>
    </button>
  );
}

/* ─── Empty state ─── */
function EmptyState({ searchActive, canCreate, onCreate }: { searchActive: boolean; canCreate: boolean; onCreate: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--text-muted)' }}>
      <BriefcaseIcon size={36} style={{ margin: '0 auto 14px', opacity: 0.4, color: 'var(--text-muted)' }} />
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
        {searchActive ? 'No workflows match your search.' : 'No workflows yet'}
      </div>
      {!searchActive && (
        <div style={{ fontSize: 12, marginTop: 6, maxWidth: 380, margin: '6px auto 0', lineHeight: 1.55 }}>
          Workflows let you run a sequence of AI tasks over your documents and get a compiled report at the end.
        </div>
      )}
      {!searchActive && canCreate && (
        <button
          onClick={onCreate}
          style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          <Plus size={14} /> New Workflow
        </button>
      )}
    </div>
  );
}

/* ─── Workflow card ─── */
interface CardProps {
  template: WorkflowTemplate;
  ctx: PermissionContext;
  isRunning: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onRun: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function WorkflowCard({ template, ctx, isRunning, menuOpen, onToggleMenu, onCloseMenu, onRun, onEdit, onDuplicate, onDelete }: CardProps) {
  const badge = VISIBILITY_BADGE[template.visibility];
  const canEdit = canEditTemplate(template, ctx);
  const canDelete = canDeleteTemplate(template, ctx);
  const isDraftByMe = template.status === 'draft' && template.createdBy === ctx.userId;

  // Step pills — show the first 3 operations so users get a quick
  // "this is what this workflow does" glance.
  const pills = template.steps.slice(0, 3);
  const remaining = Math.max(0, template.steps.length - pills.length);

  return (
    <div
      style={{
        padding: '18px 18px 16px',
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: '#fff',
        display: 'flex', flexDirection: 'column',
        minHeight: 220,
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(10,36,99,0.08)'; e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Top row: avatar + title + menu */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={18} style={{ color: 'var(--navy)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>
            {template.name}
          </div>
          <div className="flex items-center gap-1 flex-wrap" style={{ marginTop: 4 }}>
            <span
              title={template.visibility === 'platform' ? 'Maintained by YourAI' : template.visibility === 'org' ? 'Shared with your organisation' : 'Only visible to you'}
              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontWeight: 600, letterSpacing: '0.02em' }}
            >
              {badge.label}
            </span>
            <PracticeAreaBadge area={template.practiceArea} />
            {isDraftByMe && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontWeight: 500, border: '1px solid #FDE68A' }}>Draft</span>
            )}
          </div>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={onToggleMenu}
            title="More actions"
            style={{ padding: 6, borderRadius: 6, background: 'none', border: '1px solid transparent', cursor: 'pointer', display: 'flex' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
          >
            <MoreVertical size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
          {menuOpen && (
            <>
              <div onClick={onCloseMenu} style={{ position: 'fixed', inset: 0, zIndex: 65 }} />
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                  width: 180, background: '#fff',
                  border: '1px solid var(--border)', borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(10,36,99,0.12)', overflow: 'hidden', zIndex: 66,
                }}
              >
                {canEdit && <MenuItem icon={Edit3} label="Edit" onClick={onEdit} />}
                <MenuItem icon={Copy} label="Duplicate" onClick={onDuplicate} />
                {canDelete && <MenuItem icon={Trash2} label="Delete" danger onClick={onDelete} />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 13, color: 'var(--text-muted)',
          lineHeight: 1.55, margin: 0,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden', textOverflow: 'ellipsis',
          minHeight: 40, // reserve 2-line height so grid rows align
        }}
      >
        {template.description || <span style={{ fontStyle: 'italic' }}>No description.</span>}
      </p>

      {/* Step summary + pills */}
      <div style={{ marginTop: 12, flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
          <Clock size={11} /> {template.steps.length} step{template.steps.length !== 1 ? 's' : ''} · ~{template.estimatedTotalSeconds}s
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {pills.map((s) => (
            <OperationPill key={s.id} operation={s.operation} />
          ))}
          {remaining > 0 && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }}>
              + {remaining} more
            </span>
          )}
        </div>
      </div>

      {/* Footer row: last updated + Run button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F0E8' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Updated {relativeFrom(template.updatedAt)}
        </span>
        <button
          onClick={onRun}
          disabled={isRunning}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 20px', borderRadius: 8,
            backgroundColor: isRunning ? '#9CA3AF' : 'var(--navy)',
            color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 500,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.8 : 1,
          }}
        >
          {isRunning ? <><Loader size={12} className="animate-spin" /> Running…</> : <>Run Workflow →</>}
        </button>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, danger, onClick }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', cursor: 'pointer',
        fontSize: 12, color: danger ? '#C65454' : 'var(--text-secondary)',
        transition: 'background 100ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ice-warm)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={13} style={{ color: danger ? '#C65454' : 'var(--text-muted)' }} />
      <span>{label}</span>
    </div>
  );
}

function PracticeAreaBadge({ area }: { area: string }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--ice-warm)', color: 'var(--navy)', border: '1px solid var(--border)', fontWeight: 500 }}>
      {area}
    </span>
  );
}

function OperationPill({ operation }: { operation: WorkflowOperation }) {
  const cfg = OPERATION_CONFIG[operation];
  const Icon = OP_ICON[operation];
  return (
    <span
      title={cfg.description}
      className={cfg.color}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, padding: '2px 8px', borderRadius: 999,
        fontWeight: 500, border: '1px solid',
      }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}
