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
  BookOpen, ShieldCheck, Star, ArrowLeft, ArrowRight, TrendingUp,
  CheckCircle2, XCircle, Sparkles,
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
  isFavouriteTemplate, toggleFavouriteTemplate,
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
  // Tick so the star icon re-renders instantly after toggle
  const [favTick, setFavTick] = useState(0);

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

  // Aggregate stats for the hero strip
  const runsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return recentRuns.filter((r) => {
      const when = r.completedAt ? new Date(r.completedAt).getTime() : new Date(r.startedAt).getTime();
      return when >= weekAgo;
    }).length;
  }, [recentRuns]);

  const avgRunSeconds = useMemo(() => {
    if (templates.length === 0) return 0;
    const total = templates.reduce((a, t) => a + (t.estimatedTotalSeconds || 0), 0);
    return Math.round(total / templates.length);
  }, [templates]);

  // Featured = platform workflows; everything else is "your library"
  const featuredTemplates = useMemo(() => filtered.filter((t) => t.visibility === 'platform'), [filtered]);
  const libraryTemplates  = useMemo(() => filtered.filter((t) => t.visibility !== 'platform'), [filtered]);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: '#FAF6EE',
      minWidth: 0, minHeight: 0, overflow: 'hidden',
    }}>
      {/* ─── Breadcrumb bar (back-to-chat, consistent with Workspaces/Team) ─── */}
      <div style={{
        padding: '12px 36px',
        borderBottom: '1px solid rgba(10,36,99,0.06)',
        background: '#FDFBF5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', marginLeft: -10, borderRadius: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 13,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--navy)'; (e.currentTarget as HTMLButtonElement).style.background = '#F3ECDD'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <ArrowLeft size={14} /> Back to chat
        </button>
        {canCreateWorkflow(ctx) && (
          <button
            onClick={onCreateNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 6px rgba(10,36,99,0.14)' }}
          >
            <Plus size={14} /> New Workflow
          </button>
        )}
      </div>

      {/* ─── Hero — title + stats row ─── */}
      <div style={{
        padding: '28px 36px 20px',
        borderBottom: '1px solid rgba(10,36,99,0.06)',
        background: 'linear-gradient(180deg, #FDFBF5 0%, #FAF6EE 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 340px', minWidth: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(201,168,76,0.14)',
              border: '1px solid rgba(201,168,76,0.3)',
              fontSize: 11, letterSpacing: '0.06em', fontWeight: 600, color: '#8A6D1F',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              <Sparkles size={11} /> AI Pipelines
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, color: 'var(--navy)', margin: 0, lineHeight: 1.1 }}>
              Workflows
            </h1>
            <p style={{ fontSize: 14, color: '#374151', marginTop: 8, lineHeight: 1.55, maxWidth: 560 }}>
              Chain multiple AI steps into a reusable pipeline — read documents, analyse clauses, check compliance, and produce a structured report, all with one click.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <StatTile icon={Zap}        value={templates.length} label="Templates" />
            <StatTile icon={TrendingUp} value={runsThisWeek}      label="Runs / week" />
            <StatTile icon={Clock}      value={`~${avgRunSeconds}s`} label="Avg duration" />
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
                isFav={(favTick, isFavouriteTemplate(currentUserId, t.id))}
                onToggleFav={() => { toggleFavouriteTemplate(currentUserId, t.id); setFavTick((n) => n + 1); }}
              />
            ))}
          </div>
        )}

        {/* ─── Recent runs ─── */}
        {recentRuns.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--navy)', lineHeight: 1.2 }}>
                  Recent runs
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  Your last {recentRuns.length} workflow{recentRuns.length !== 1 ? 's' : ''}.
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
              {recentRuns.map((r) => {
                const ok = r.status === 'complete';
                const dur = r.steps.reduce((a, s) => a + (s.durationSeconds || 0), 0);
                const docs = r.uploadedDocs?.length || 0;
                return (
                  <div
                    key={r.id}
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(10,36,99,0.08)',
                      borderLeft: `3px solid ${ok ? '#5CA868' : r.status === 'failed' ? '#C65454' : '#9CA3AF'}`,
                      borderRadius: 12,
                      padding: '14px 16px',
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {ok ? <CheckCircle2 size={14} style={{ color: '#5CA868' }} /> : <XCircle size={14} style={{ color: '#C65454' }} />}
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.templateName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#6B7280' }}>
                      <span>{ok ? 'Completed' : r.status === 'failed' ? 'Failed' : 'Cancelled'}</span>
                      <span>·</span>
                      <span>{relativeFrom(r.completedAt || r.startedAt)}</span>
                      <span>·</span>
                      <span>{dur}s total</span>
                      {docs > 0 && (<><span>·</span><span>{docs} doc{docs !== 1 ? 's' : ''}</span></>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Hero stat tile ─── */
function StatTile({ icon: Icon, value, label }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; value: number | string; label: string }) {
  return (
    <div style={{
      padding: '12px 18px', minWidth: 110,
      borderRadius: 12, border: '1px solid rgba(10,36,99,0.08)',
      background: '#FFFFFF',
      boxShadow: '0 1px 3px rgba(10,36,99,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8A6D1F', marginBottom: 4 }}>
        <Icon size={12} />
        <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--navy)', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

/* ─── Practice-area theming — subtle tint on each card ─── */
const PRACTICE_THEME: Record<string, { accent: string; bg: string; iconBg: string }> = {
  'Legal':              { accent: '#1E3A8A', bg: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFF 100%)', iconBg: '#DDE6FE' },
  'Litigation':         { accent: '#7C2D12', bg: 'linear-gradient(135deg, #FEF3E8 0%, #FFFBF5 100%)', iconBg: '#FED7AA' },
  'Compliance & Audit': { accent: '#991B1B', bg: 'linear-gradient(135deg, #FEF2F2 0%, #FFFBFB 100%)', iconBg: '#FECACA' },
  'Corporate':          { accent: '#0F766E', bg: 'linear-gradient(135deg, #ECFDF5 0%, #F7FEFB 100%)', iconBg: '#CCFBF1' },
  'Tax':                { accent: '#5B21B6', bg: 'linear-gradient(135deg, #F5F3FF 0%, #FBFAFE 100%)', iconBg: '#DDD6FE' },
  'Employment':         { accent: '#B45309', bg: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)', iconBg: '#FDE68A' },
  'Real Estate':        { accent: '#065F46', bg: 'linear-gradient(135deg, #ECFDF5 0%, #F7FEFB 100%)', iconBg: '#A7F3D0' },
  'IP & Tech':          { accent: '#1E40AF', bg: 'linear-gradient(135deg, #EFF6FF 0%, #FAFCFF 100%)', iconBg: '#BFDBFE' },
};
function themeFor(area: string) {
  return PRACTICE_THEME[area] || { accent: '#0A2463', bg: 'linear-gradient(135deg, #F3ECDD 0%, #FAF6EE 100%)', iconBg: '#F0E7D2' };
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
  isFav: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onRun: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleFav: () => void;
}

function WorkflowCard({ template, ctx, isRunning, isFav, menuOpen, onToggleMenu, onCloseMenu, onRun, onEdit, onDuplicate, onDelete, onToggleFav }: CardProps) {
  const badge = VISIBILITY_BADGE[template.visibility];
  const canEdit = canEditTemplate(template, ctx);
  const canDelete = canDeleteTemplate(template, ctx);
  const isDraftByMe = template.status === 'draft' && template.createdBy === ctx.userId;
  const theme = themeFor(template.practiceArea);

  // Operation flow preview — render every step's icon with arrow separators.
  // Gives a visual pipeline preview so users can tell at a glance what
  // the workflow does, not just read a description.
  const flowOps = template.steps.slice(0, 5);
  const flowRemaining = Math.max(0, template.steps.length - flowOps.length);

  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid rgba(10,36,99,0.08)',
        background: '#FFFFFF',
        display: 'flex', flexDirection: 'column',
        minHeight: 300,
        overflow: 'hidden',
        transition: 'all 0.18s ease',
        boxShadow: '0 1px 3px rgba(10,36,99,0.03)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(10,36,99,0.1)'; e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(10,36,99,0.03)'; e.currentTarget.style.borderColor = 'rgba(10,36,99,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* ── Themed header tile ── */}
      <div style={{
        padding: '16px 18px 14px',
        background: theme.bg,
        borderBottom: `1px solid ${theme.accent}22`,
        position: 'relative',
      }}>
        {/* Accent stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: theme.accent }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: theme.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <Zap size={18} style={{ color: theme.accent }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.accent }}>
              {template.practiceArea}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginTop: 2 }}>
              {template.name}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
              title={isFav ? 'Remove from favourites' : 'Add to favourites — appears in chat empty state'}
              style={{ padding: 6, borderRadius: 6, background: 'none', border: '1px solid transparent', cursor: 'pointer', display: 'flex' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Star size={15} style={{ color: isFav ? '#E0A12E' : 'var(--text-muted)', fill: isFav ? '#E0A12E' : 'transparent' }} />
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={onToggleMenu}
                title="More actions"
                style={{ padding: 6, borderRadius: 6, background: 'none', border: '1px solid transparent', cursor: 'pointer', display: 'flex' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
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
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <span
            title={template.visibility === 'platform' ? 'Maintained by YourAI' : template.visibility === 'org' ? 'Shared with your organisation' : 'Only visible to you'}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontWeight: 600, letterSpacing: '0.02em' }}
          >
            {badge.label}
          </span>
          {isDraftByMe && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontWeight: 500, border: '1px solid #FDE68A' }}>Draft</span>
          )}
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.6)', color: '#374151', border: '1px solid rgba(0,0,0,0.08)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} /> {template.steps.length} steps · ~{template.estimatedTotalSeconds}s
          </span>
        </div>
      </div>

      {/* ── Pipeline preview ── */}
      <div style={{ padding: '14px 18px 0' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 10 }}>
          Pipeline
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {flowOps.map((s, i) => {
            const cfg = OPERATION_CONFIG[s.operation];
            const OpIcon = OP_ICON[s.operation];
            return (
              <React.Fragment key={s.id}>
                <div
                  title={cfg?.label || s.operation}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: '#F9FAFB', border: '1px solid #E5E7EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <OpIcon size={14} style={{ color: theme.accent }} />
                </div>
                {i < flowOps.length - 1 && (
                  <ArrowRight size={10} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
          {flowRemaining > 0 && (
            <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 4 }}>
              +{flowRemaining} more
            </span>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      <p
        style={{
          fontSize: 13, color: '#374151',
          lineHeight: 1.55, margin: '12px 18px 0',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden', textOverflow: 'ellipsis',
          minHeight: 40,
          flex: 1,
        }}
      >
        {template.description || <span style={{ fontStyle: 'italic', color: '#9CA3AF' }}>No description.</span>}
      </p>

      {/* ── Footer ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 18px', marginTop: 14, borderTop: '1px solid #F3F0E8' }}>
        <span style={{ fontSize: 11, color: '#6B7280' }}>
          Updated {relativeFrom(template.updatedAt)}
        </span>
        <button
          onClick={onRun}
          disabled={isRunning}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 20px', borderRadius: 10,
            backgroundColor: isRunning ? '#9CA3AF' : theme.accent,
            color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.8 : 1,
            boxShadow: isRunning ? 'none' : `0 2px 8px ${theme.accent}33`,
            transition: 'all 150ms ease',
          }}
        >
          {isRunning ? <><Loader size={12} className="animate-spin" /> Running…</> : <>Run <ArrowRight size={13} /></>}
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
