import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Copy,
  Edit3,
  FileOutput,
  FileText,
  GitCompare,
  Loader,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import { useToast } from '../../components/Toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import {
  type PermissionContext,
  type WorkflowOperation,
  type WorkflowRun,
  type WorkflowTemplate,
  OPERATION_CONFIG,
  canCreateWorkflow,
  canDeleteTemplate,
  canEditTemplate,
  getActiveRunId,
  getRun,
  isFavouriteTemplate,
  listRuns,
  listTemplatesForUser,
  seedTemplatesIfEmpty,
  toggleFavouriteTemplate,
} from '../../lib/workflow';
import { MOCK_WORKFLOW_TEMPLATES } from '../../lib/mockWorkflows';

const OP_ICON: Record<
  WorkflowOperation,
  React.ComponentType<{ size?: number; style?: React.CSSProperties }>
> = {
  read_documents: FileText,
  analyse_clauses: Search,
  compare_against_standard: GitCompare,
  generate_report: FileOutput,
  research_precedents: BookOpen,
  compliance_check: ShieldCheck,
};

const VISIBILITY_BADGE = {
  platform: { bg: 'var(--navy)', color: '#FFFFFF', border: 'var(--navy)', label: 'Platform' },
  org: { bg: 'rgba(11,29,58,0.06)', color: 'var(--navy)', border: 'var(--ice)', label: 'Your Org' },
  personal: { bg: 'var(--ice-warm)', color: 'var(--slate)', border: 'var(--ice)', label: 'Yours' },
} as const;

const PRACTICE_THEME: Record<string, { accent: string; bg: string; iconBg: string; tint: string }> = {
  Legal: {
    accent: 'var(--navy-light)',
    bg: 'linear-gradient(180deg, #F7F9FC 0%, #FFFFFF 100%)',
    iconBg: '#EDF2F7',
    tint: '#F7F9FC',
  },
  'Compliance & Audit': {
    accent: 'var(--gold)',
    bg: 'linear-gradient(180deg, #FBF8EF 0%, #FFFFFF 100%)',
    iconBg: 'rgba(201,168,76,0.14)',
    tint: '#FCFAF4',
  },
  default: {
    accent: 'var(--navy)',
    bg: 'linear-gradient(180deg, #F7F9FC 0%, #FFFFFF 100%)',
    iconBg: '#E8EEF4',
    tint: '#F8FAFC',
  },
};

const STEP_TYPE_DESCRIPTIONS: Record<string, string> = {
  read_documents: 'processes your uploaded files',
  analyse_clauses: 'identifies non-standard terms',
  compare_against_standard: 'benchmarks against your playbook',
  generate_report: 'produces your final output',
  research_precedents: 'looks up relevant precedents and supporting authority',
  compliance_check: 'checks materials against compliance requirements',
  custom: 'runs a custom step',
};

type FilterKey = 'all' | 'platform' | 'org' | 'personal';
type SortMode = 'default' | 'duration';
type DrawerSection = 'overview' | 'recent-runs';

export interface WorkflowsPanelProps {
  onClose: () => void;
  onCreateNew: () => void;
  onRun: (template: WorkflowTemplate) => void;
  onEdit: (template: WorkflowTemplate) => void;
  onDuplicate: (template: WorkflowTemplate) => void;
  onDelete: (id: string) => void;
}

function formatRelativeDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || Number.isNaN(seconds)) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatInitials(name?: string): string {
  if (!name) return 'YA';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function themeFor(practiceArea: string) {
  return PRACTICE_THEME[practiceArea] || PRACTICE_THEME.default;
}

function getRunDuration(run: WorkflowRun, template: WorkflowTemplate): number {
  const fromSteps = run.steps.reduce((sum, step) => sum + (step.durationSeconds || 0), 0);
  return fromSteps || template.estimatedTotalSeconds || 0;
}

function getRunActorName(run: WorkflowRun, currentUserId: string, currentUserName: string): string {
  if (run.userId === currentUserId) return currentUserName || 'You';
  const fallback = run.userId.replace(/^user-/, '').replace(/^m-/, '').replace(/[-_]/g, ' ');
  return fallback
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function getLastRunLabel(template: WorkflowTemplate, currentUserId: string, sortedRuns: WorkflowRun[]) {
  const templateRuns = sortedRuns.filter((run) => run.templateId === template.id);
  const userRun = templateRuns.find((run) => run.userId === currentUserId);
  const anyRun = templateRuns[0];

  if (userRun) {
    return `Last run by you · ${formatRelativeDate(userRun.completedAt || userRun.startedAt)}`;
  }
  if (anyRun) {
    return `Last run · ${formatRelativeDate(anyRun.completedAt || anyRun.startedAt)}`;
  }
  return 'Never run — be the first';
}

function describeStep(step: WorkflowTemplate['steps'][number], index: number) {
  const config = OPERATION_CONFIG[step.operation];
  const base = STEP_TYPE_DESCRIPTIONS[step.operation] || STEP_TYPE_DESCRIPTIONS.custom;
  return `Step ${index + 1}: ${config?.label || step.name} — ${base}. ${step.instruction}`;
}

export default function WorkflowsPanel({
  onClose,
  onCreateNew,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
}: WorkflowsPanelProps) {
  const navigate = useNavigate();
  const showToast = useToast();
  const { operator } = useAuth();
  const { currentRole, isOrgAdmin, isExternalUser } = useRole();

  const currentUserId = operator?.id || 'user-ryan';
  const currentUserName = operator?.name || 'You';

  const ctx: PermissionContext = useMemo(() => ({
    userId: currentUserId,
    isSuperAdmin: false,
    isOrgAdmin,
    isExternalUser,
  }), [currentUserId, isOrgAdmin, isExternalUser]);

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [recentRunsOnly, setRecentRunsOnly] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [drawerSection, setDrawerSection] = useState<DrawerSection>('overview');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const platformCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    seedTemplatesIfEmpty(MOCK_WORKFLOW_TEMPLATES);
    setTemplates(listTemplatesForUser(currentUserId, currentRole));
    const allRuns = listRuns().sort((a, b) => {
      const aTime = new Date(a.completedAt || a.startedAt).getTime();
      const bTime = new Date(b.completedAt || b.startedAt).getTime();
      return bTime - aTime;
    });
    setRuns(allRuns);
    const activeRunId = getActiveRunId();
    if (activeRunId) {
      const activeRun = getRun(activeRunId);
      if (activeRun?.status === 'running') setActiveTemplateId(activeRun.templateId);
    }
  }, [currentRole, currentUserId]);

  if (isExternalUser) return null;

  const counts = useMemo(() => ({
    all: templates.length,
    platform: templates.filter((template) => template.visibility === 'platform').length,
    org: templates.filter((template) => template.visibility === 'org').length,
    personal: templates.filter((template) => template.visibility === 'personal' && template.createdBy === currentUserId).length,
  }), [currentUserId, templates]);

  const userRunsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return runs.filter((run) => {
      const at = new Date(run.completedAt || run.startedAt).getTime();
      return run.userId === currentUserId && at >= weekAgo;
    });
  }, [currentUserId, runs]);

  const avgDuration = useMemo(() => {
    if (!templates.length) return 0;
    return Math.round(
      templates.reduce((sum, template) => sum + (template.estimatedTotalSeconds || 0), 0) / templates.length,
    );
  }, [templates]);

  const popularTemplateId = useMemo(() => {
    const counts = new Map<string, number>();
    runs.forEach((run) => {
      counts.set(run.templateId, (counts.get(run.templateId) || 0) + 1);
    });
    const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return ranked && ranked[1] > 0 ? ranked[0] : null;
  }, [runs]);

  const filteredTemplates = useMemo(() => {
    let next = templates.filter((template) => {
      if (filter === 'all') return true;
      if (filter === 'personal') return template.visibility === 'personal' && template.createdBy === currentUserId;
      return template.visibility === filter;
    });

    if (recentRunsOnly) {
      const recentIds = new Set(userRunsThisWeek.map((run) => run.templateId));
      next = next.filter((template) => recentIds.has(template.id));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      next = next.filter((template) =>
        template.name.toLowerCase().includes(q) ||
        template.practiceArea.toLowerCase().includes(q) ||
        (template.description || '').toLowerCase().includes(q) ||
        (template.outputLabel || '').toLowerCase().includes(q),
      );
    }

    if (sortMode === 'duration') {
      next = [...next].sort((a, b) => (a.estimatedTotalSeconds || 0) - (b.estimatedTotalSeconds || 0));
    }

    return next;
  }, [currentUserId, filter, recentRunsOnly, search, sortMode, templates, userRunsThisWeek]);

  const handleDashboardBack = () => {
    onClose();
  };

  const resetTransientState = () => {
    setRecentRunsOnly(false);
    setSortMode('default');
  };

  const handleTabChange = (nextFilter: FilterKey) => {
    setFilter(nextFilter);
    resetTransientState();
  };

  const openDrawer = (template: WorkflowTemplate, section: DrawerSection = 'overview') => {
    setSelectedTemplate(template);
    setDrawerSection(section);
  };

  const handleRunWorkflow = (template: WorkflowTemplate) => {
    setSelectedTemplate(null);
    onRun(template);
  };

  const handleToggleFavourite = (template: WorkflowTemplate) => {
    const nowStarred = toggleFavouriteTemplate(currentUserId, template.id);
    setTemplates((prev) => [...prev]);
    setSelectedTemplate((prev) => (prev?.id === template.id ? { ...prev } : prev));

    if (nowStarred) {
      showToast({
        message: 'Saved to favourites.',
        actionLabel: 'View on your dashboard →',
        onAction: () => navigate('/app/dashboard'),
      });
      return;
    }

    showToast('Removed from favourites.');
  };

  const handleRunsMetricClick = () => {
    if (userRunsThisWeek.length > 0) {
      setRecentRunsOnly(true);
      setSortMode('default');
      return;
    }
    const firstPlatform = templates.find((template) => template.visibility === 'platform');
    if (firstPlatform) {
      platformCardRefs.current[firstPlatform.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const emptyState = (
    <div
      style={{
        padding: '42px 28px',
        borderRadius: 16,
        border: '1px solid var(--ice)',
        background: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(11,29,58,0.04)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: 'var(--text-primary)' }}>
        No workflows match this view
      </div>
      <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        Try a different tab or search, or create a new workflow to get started.
      </p>
      {canCreateWorkflow(ctx) && (
        <button
          type="button"
          onClick={onCreateNew}
          style={{
            marginTop: 18,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 10,
            background: 'var(--navy)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Plus size={14} /> New Workflow
        </button>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          background: '#FBFAF7',
        }}
      >
        <div
          style={{
            padding: '12px 28px',
            borderBottom: '1px solid var(--ice)',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleDashboardBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 13px',
              borderRadius: 7,
              background: '#fff',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 400,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--navy)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--navy)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
          >
            <ArrowLeft size={13} /> Back to chat
          </button>

          {canCreateWorkflow(ctx) && (
            <button
              type="button"
              onClick={onCreateNew}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              padding: '8px 16px',
              borderRadius: 10,
              backgroundColor: 'var(--navy)',
              color: 'white',
              border: 'none',
              fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(10,36,99,0.14)',
              }}
            >
              <Plus size={14} /> New Workflow
            </button>
          )}
        </div>

        <div
          style={{
            padding: '30px 28px 22px',
            borderBottom: '1px solid var(--ice)',
            background: '#FBFAF7',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 340px', minWidth: 0 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.22)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                  color: 'var(--gold)',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                <Sparkles size={11} /> AI Pipelines
              </div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 500, color: 'var(--text-primary)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.8px' }}>
                Workflows
              </h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.55, maxWidth: 700 }}>
                Chain multiple AI steps into a reusable pipeline — read documents, analyse clauses, check compliance, and produce a structured report, all with one click.
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 14,
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--ice)',
                  background: '#FFFFFF',
                  color: 'var(--navy)',
                  fontSize: 12,
                  fontWeight: 600,
                  boxShadow: '0 1px 3px rgba(11,29,58,0.04)',
                }}
              >
                Running in: Global / Main Site
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
              <StatTile
                icon={Zap}
                value={templates.length}
                label="Templates"
                interactive
                onClick={() => handleTabChange('all')}
                tooltip="View all available workflows"
              />
              <StatTile
                icon={TrendingUp}
                value={userRunsThisWeek.length}
                label={userRunsThisWeek.length > 0 ? 'Runs / week' : 'No runs yet'}
                interactive
                onClick={handleRunsMetricClick}
                tooltip={userRunsThisWeek.length > 0 ? 'Filter to recently run workflows' : 'Run a workflow to start tracking'}
              />
              <StatTile
                icon={Clock}
                value={`~${avgDuration}s`}
                label="Avg duration"
                interactive
                onClick={() => {
                  setSortMode('duration');
                  setRecentRunsOnly(false);
                }}
                tooltip="Sort by duration"
              />
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div
              style={{
                display: 'inline-flex',
                border: '1px solid #e2e3e7',
                borderRadius: 9,
                background: '#fff',
                padding: 3,
                flexWrap: 'wrap',
              }}
            >
              <FilterPill label="All" count={counts.all} active={filter === 'all'} tooltip="All available workflows" onClick={() => handleTabChange('all')} />
              <FilterPill label="Platform" count={counts.platform} active={filter === 'platform'} tooltip="Maintained by YourAI" onClick={() => handleTabChange('platform')} />
              <FilterPill label="Your Org" count={counts.org} active={filter === 'org'} tooltip="Shared across your organisation" onClick={() => handleTabChange('org')} />
              <FilterPill label="Yours" count={counts.personal} active={filter === 'personal'} tooltip="Visible only to you" onClick={() => handleTabChange('personal')} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid var(--ice)',
                  background: '#fff',
                  padding: '0 12px',
                  boxShadow: '0 1px 3px rgba(11,29,58,0.04)',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Sort</span>
                <select
                  value={sortMode}
                  onChange={(e) => {
                    const next = e.target.value as SortMode;
                    setSortMode(next);
                    setRecentRunsOnly(false);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--navy)',
                    fontSize: 12,
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="default">Recommended</option>
                  <option value="duration">Duration (shortest first)</option>
                </select>
              </div>

              <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 360 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workflows..."
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid var(--ice)',
                  paddingLeft: 36,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#fff',
                  color: 'var(--navy)',
                  boxShadow: '0 1px 3px rgba(11,29,58,0.04)',
                }}
              />
              </div>
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            emptyState
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  ref={(node) => {
                    if (template.visibility === 'platform') platformCardRefs.current[template.id] = node;
                  }}
                  style={{ display: 'flex', height: '100%' }}
                >
                  <WorkflowCard
                    template={template}
                    ctx={ctx}
                    isRunning={activeTemplateId === template.id}
                    isFav={isFavouriteTemplate(currentUserId, template.id)}
                    menuOpen={menuOpenFor === template.id}
                    lastRunLabel={getLastRunLabel(template, currentUserId, runs)}
                    isPopular={popularTemplateId === template.id}
                    onOpenDetails={() => openDrawer(template)}
                    onOpenRunHistory={() => openDrawer(template, 'recent-runs')}
                    onRun={() => handleRunWorkflow(template)}
                    onEdit={() => {
                      onEdit(template);
                      setMenuOpenFor(null);
                    }}
                    onDuplicate={() => {
                      onDuplicate(template);
                      setMenuOpenFor(null);
                      setTemplates(listTemplatesForUser(currentUserId, currentRole));
                    }}
                    onDelete={() => {
                      onDelete(template.id);
                      setMenuOpenFor(null);
                      setTemplates(listTemplatesForUser(currentUserId, currentRole));
                    }}
                    onToggleFav={() => handleToggleFavourite(template)}
                    onToggleMenu={() => setMenuOpenFor((prev) => (prev === template.id ? null : template.id))}
                    onCloseMenu={() => setMenuOpenFor(null)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <WorkflowDetailDrawer
          template={selectedTemplate}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          initialSection={drawerSection}
          runs={runs}
          onClose={() => setSelectedTemplate(null)}
          onRun={(template) => handleRunWorkflow(template)}
        />
      </div>
    </TooltipProvider>
  );
}

function StatTile({
  icon: Icon,
  value,
  label,
  interactive = false,
  onClick,
  tooltip,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  value: number | string;
  label: string;
  interactive?: boolean;
  onClick?: () => void;
  tooltip?: string;
}) {
  const [hovered, setHovered] = useState(false);

  const content = (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '14px 18px',
        minWidth: 136,
        borderRadius: 16,
        border: '1px solid var(--ice)',
        background: '#FFFFFF',
        boxShadow: hovered && interactive ? '0 4px 16px rgba(11,29,58,0.06)' : '0 1px 3px rgba(11,29,58,0.04)',
        cursor: interactive ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', marginBottom: 8 }}>
        <Icon size={12} />
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
            textDecoration: hovered && interactive ? 'underline' : 'none',
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
    </button>
  );

  if (!tooltip) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function FilterPill({
  label,
  count,
  active,
  tooltip,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tooltip?: string;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 6,
        border: 'none',
        background: active ? 'var(--gold-bg)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: 12.5,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 120ms',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: active ? 600 : 400,
          color: active ? 'var(--text-primary)' : 'var(--text-muted)',
          opacity: 0.75,
        }}
      >
        {count}
      </span>
    </button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

interface CardProps {
  template: WorkflowTemplate;
  ctx: PermissionContext;
  isRunning: boolean;
  isFav: boolean;
  menuOpen: boolean;
  lastRunLabel: string;
  isPopular: boolean;
  onOpenDetails: () => void;
  onOpenRunHistory: () => void;
  onRun: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleFav: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
}

function WorkflowCard({
  template,
  ctx,
  isRunning,
  isFav,
  menuOpen,
  lastRunLabel,
  isPopular,
  onOpenDetails,
  onOpenRunHistory,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFav,
  onToggleMenu,
  onCloseMenu,
}: CardProps) {
  const badge = VISIBILITY_BADGE[template.visibility];
  const theme = themeFor(template.practiceArea);
  const canEdit = canEditTemplate(template, ctx);
  const canDelete = canDeleteTemplate(template, ctx);
  const flowOps = template.steps.slice(0, 5);
  const flowRemaining = Math.max(0, template.steps.length - flowOps.length);
  const requiredDocs = template.requiredDocs?.length ? template.requiredDocs : ['1 document'];
  const [bodyHovered, setBodyHovered] = useState(false);
  const [starHovered, setStarHovered] = useState(false);

  return (
    <div
      style={{
        borderRadius: 16,
        border: bodyHovered ? '1px solid var(--navy-light)' : '1px solid var(--ice)',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 352,
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        boxShadow: bodyHovered ? '0 4px 16px rgba(11,29,58,0.06)' : '0 1px 3px rgba(11,29,58,0.04)',
        transition: 'background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease',
        transform: bodyHovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onOpenDetails}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenDetails();
          }
        }}
        onMouseEnter={() => setBodyHovered(true)}
        onMouseLeave={() => setBodyHovered(false)}
        style={{ cursor: 'pointer', outline: 'none' }}
      >
        <div
          style={{
            padding: '20px 20px 16px',
            background: theme.bg,
            borderBottom: '1px solid var(--ice)',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: theme.accent, opacity: 0.9 }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: theme.iconBg,
                border: '1px solid rgba(11,29,58,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Zap size={18} style={{ color: theme.accent }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.accent }}>
                {template.practiceArea}
              </div>
              <div
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: 19,
                  fontWeight: 500,
                  letterSpacing: '-0.3px',
                  color: bodyHovered ? 'var(--gold)' : 'var(--text-primary)',
                  lineHeight: 1.15,
                  marginTop: 4,
                  transition: 'color 150ms ease',
                }}
              >
                {template.name}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFav();
                    }}
                    onMouseEnter={() => setStarHovered(true)}
                    onMouseLeave={() => setStarHovered(false)}
                    style={{
                      padding: 6,
                      borderRadius: 8,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                  >
                    <Star
                      size={15}
                      style={{
                        color: '#EF9F27',
                        fill: isFav ? '#EF9F27' : starHovered ? 'rgba(239,159,39,0.4)' : 'transparent',
                        opacity: isFav && starHovered ? 0.7 : 1,
                        transition: 'fill 150ms ease, opacity 150ms ease',
                      }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFav ? 'Remove from favourites' : 'Save to favourites — appears on your dashboard'}
                </TooltipContent>
              </Tooltip>

              {template.visibility !== 'platform' && (
                <div style={{ position: 'relative' }}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleMenu();
                        }}
                        style={{
                          padding: 6,
                          borderRadius: 8,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                        }}
                      >
                        <MoreVertical size={14} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>More options</TooltipContent>
                  </Tooltip>

                  {menuOpen && (
                    <>
                      <div onClick={onCloseMenu} style={{ position: 'fixed', inset: 0, zIndex: 65 }} />
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          right: 0,
                          width: 184,
                          background: '#fff',
                          border: '1px solid var(--ice)',
                          borderRadius: 12,
                          boxShadow: '0 8px 24px rgba(10,36,99,0.12)',
                          overflow: 'hidden',
                          zIndex: 66,
                        }}
                      >
                        {canEdit && <MenuItem icon={Edit3} label="Edit" onClick={onEdit} />}
                        <MenuItem icon={Copy} label="Duplicate" onClick={onDuplicate} />
                        {canDelete && <MenuItem icon={Trash2} label="Delete" danger onClick={onDelete} />}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            {lastRunLabel.startsWith('Last run by you') && (
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: '#FFFFFF',
                  color: 'var(--slate)',
                  border: '1px solid var(--ice)',
                  fontWeight: 600,
                }}
              >
                Last run by you
              </span>
            )}
            {isPopular && (
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: '#FFFFFF',
                  color: 'var(--slate)',
                  border: '1px solid var(--ice)',
                  fontWeight: 600,
                }}
              >
                Popular in your org
              </span>
            )}
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 999,
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
                fontWeight: 700,
              }}
            >
              {badge.label}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 999,
                background: '#FFFFFF',
                color: 'var(--slate)',
                border: '1px solid var(--ice)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Clock size={10} /> {template.steps.length} steps · ~{template.estimatedTotalSeconds}s
            </span>
          </div>
        </div>

        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
            Pipeline
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {flowOps.map((step, index) => {
              const OpIcon = OP_ICON[step.operation];
              const tooltip = `Step ${index + 1}: ${OPERATION_CONFIG[step.operation]?.label || step.name} — ${STEP_TYPE_DESCRIPTIONS[step.operation] || STEP_TYPE_DESCRIPTIONS.custom}`;
              return (
                <React.Fragment key={step.id}>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: '#FFFFFF',
                          border: '1px solid var(--ice)',
                          boxShadow: '0 1px 2px rgba(11,29,58,0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <OpIcon size={14} style={{ color: theme.accent }} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{tooltip}</TooltipContent>
                  </Tooltip>
                  {index < flowOps.length - 1 && <ArrowRight size={10} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
                </React.Fragment>
              );
            })}
            {flowRemaining > 0 && (
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>
                +{flowRemaining} more
              </span>
            )}
          </div>

          <div className="output-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <span className="output-prefix" style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Output:</span>
            <span className="output-value" style={{ fontSize: 11, color: 'var(--slate)' }}>
              {template.outputLabel || 'Structured workflow report'}
            </span>
          </div>

          <div className="docs-needed" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span className="docs-label" style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Needs:</span>
            <span className="docs-value" style={{ fontSize: 11, color: 'var(--slate)' }}>
              {requiredDocs.join(', ')}
            </span>
          </div>
        </div>

        <p
          style={{
            fontSize: 13,
            color: 'var(--slate)',
            lineHeight: 1.6,
            margin: '14px 20px 0',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as any,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minHeight: 62,
            paddingBottom: 16,
          }}
        >
          {template.description}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, padding: '16px 20px 18px', borderTop: '1px solid var(--ice)', marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onOpenRunHistory}
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {lastRunLabel}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <button
                type="button"
                onClick={onOpenRunHistory}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}
              >
                View run history →
              </button>
            </TooltipContent>
          </Tooltip>

          <button
            type="button"
            onClick={onOpenDetails}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--navy)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              lineHeight: 1.5,
            }}
          >
            Preview what this produces →
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {template.visibility === 'platform' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onDuplicate}
                  style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: 'var(--navy)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  lineHeight: 1.5,
                }}
              >
                Duplicate workflow →
                </button>
              </TooltipTrigger>
              <TooltipContent>Creates a copy in your personal workflows</TooltipContent>
            </Tooltip>
          )}

          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onRun}
                disabled={isRunning}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  borderRadius: 12,
                  backgroundColor: isRunning ? 'var(--muted)' : 'var(--navy)',
                  color: '#fff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  opacity: isRunning ? 0.8 : 1,
                  boxShadow: isRunning ? 'none' : '0 6px 16px rgba(11,29,58,0.16)',
                }}
              >
                {isRunning ? <><Loader size={12} className="animate-spin" /> Running…</> : <>Run <ArrowRight size={13} /></>}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {`Run ${template.name} · ~${template.estimatedTotalSeconds}s · needs ${requiredDocs.join(', ')}`}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function WorkflowDetailDrawer({
  template,
  currentUserId,
  currentUserName,
  initialSection,
  runs,
  onClose,
  onRun,
}: {
  template: WorkflowTemplate | null;
  currentUserId: string;
  currentUserName: string;
  initialSection: DrawerSection;
  runs: WorkflowRun[];
  onClose: () => void;
  onRun: (template: WorkflowTemplate) => void;
}) {
  const recentRunsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (template && initialSection === 'recent-runs' && recentRunsRef.current) {
      recentRunsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [initialSection, template]);

  if (!template) return null;

  const badge = VISIBILITY_BADGE[template.visibility];
  const templateRuns = runs
    .filter((run) => run.templateId === template.id)
    .slice(0, 3);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7,14,26,0.18)',
          zIndex: 80,
        }}
      />
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 420,
          maxWidth: 'calc(100vw - 24px)',
          height: '100vh',
          background: '#fff',
          zIndex: 81,
          boxShadow: '-12px 0 32px rgba(7,14,26,0.14)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slide-in-from-right-2 0.2s ease',
        }}
      >
        <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid var(--ice)', background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FBFD 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 500, lineHeight: 1.15, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                {template.name}
              </h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                    fontWeight: 700,
                  }}
                >
                  {badge.label}
                </span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--ice-warm)', color: 'var(--slate)', border: '1px solid var(--ice)', fontWeight: 600 }}>
                  {template.practiceArea}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: '1px solid var(--ice)',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px 28px', background: '#FFFFFF' }}>
          <DrawerSection title="What you'll get">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Output type
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
              {template.outputLabel || 'Structured workflow report'}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--slate)' }}>
              {template.description}
            </p>
          </DrawerSection>

          <DrawerSection title="What you need">
            {(template.requiredDocs?.length ? template.requiredDocs : ['1 document']).map((doc) => (
              <div key={doc} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--slate)', lineHeight: 1.5, marginTop: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--gold)', marginTop: 7, flexShrink: 0 }} />
                <span>{doc}</span>
              </div>
            ))}
          </DrawerSection>

          <DrawerSection title="Steps">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {template.steps.map((step, index) => {
                const Icon = OP_ICON[step.operation];
                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: '#F4F6F9', border: '1px solid #E8EEF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} style={{ color: '#3D5A80' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {index + 1}. {step.name}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.6, color: 'var(--slate)' }}>
                        {describeStep(step, index)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DrawerSection>

          <div ref={recentRunsRef}>
            <DrawerSection title="Recent runs">
              {templateRuns.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {templateRuns.map((run) => (
                    <div
                      key={run.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: '1px solid var(--ice)',
                        background: 'var(--ice-warm)',
                        fontSize: 13,
                        color: 'var(--slate)',
                      }}
                    >
                      {`Run by ${formatInitials(getRunActorName(run, currentUserId, currentUserName))} · ${formatRelativeDate(run.completedAt || run.startedAt)} · ${formatDuration(getRunDuration(run, template))}`}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  No runs yet — be the first.
                </div>
              )}
            </DrawerSection>
          </div>
        </div>

        <div style={{ padding: '16px 24px 22px', borderTop: '1px solid var(--ice)', background: '#FFFFFF' }}>
          <button
            type="button"
            onClick={() => onRun(template)}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 18px',
              borderRadius: 12,
              background: 'var(--navy)',
              color: '#fff',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Run <ArrowRight size={14} />
          </button>
        </div>
      </aside>
    </>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        fontSize: 12,
        color: danger ? 'var(--gold)' : 'var(--slate)',
      }}
      onMouseEnter={(event) => { event.currentTarget.style.background = 'var(--ice-warm)'; }}
      onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={13} style={{ color: danger ? '#C65454' : 'var(--text-muted)' }} />
      <span>{label}</span>
    </div>
  );
}
