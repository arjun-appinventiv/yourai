// ─── Workflow module — data model + mock-API surface ────────────────────
//
// Workflows are multi-step AI pipelines. A user picks a template, uploads
// their working documents, and each step runs in sequence against the
// right knowledge source. Every mutation is shaped like the real REST
// endpoint it will eventually hit — swap the localStorage body for fetch
// in Sprint 2 without touching the UI.

/* ─── Operations ─────────────────────────────────────────────────────── */

export type WorkflowOperation =
  | 'read_documents'
  | 'analyse_clauses'
  | 'compare_against_standard'
  | 'generate_report'
  | 'research_precedents'
  | 'compliance_check';

export interface OperationConfigEntry {
  label: string;
  description: string;
  icon: string;                 // lucide-react icon name
  color: string;                // Tailwind classes for the pill
  instructionLabel: string;     // field label in the builder
  instructionPlaceholder: string;
}

export const OPERATION_CONFIG: Record<WorkflowOperation, OperationConfigEntry> = {
  read_documents: {
    label: 'Read Documents',
    description: 'Upload and process documents so AI can understand them',
    icon: 'FileText',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    instructionLabel: 'What types of documents should be processed?',
    instructionPlaceholder: 'e.g. All executed contracts and amendments attached as exhibits.',
  },
  analyse_clauses: {
    label: 'Analyse Clauses',
    description: 'Identify and analyse individual clauses in depth',
    icon: 'Search',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    instructionLabel: 'What should the AI look for in each clause?',
    instructionPlaceholder: 'e.g. Flag non-standard clauses, unusual limits, one-sided terms.',
  },
  compare_against_standard: {
    label: 'Compare Against Standard',
    description: 'Compare against market terms, playbooks, or firm standards',
    icon: 'GitCompare',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    instructionLabel: 'What standard should the AI compare against?',
    instructionPlaceholder: 'e.g. The firm\u2019s standard NDA playbook. Flag any deviation.',
  },
  generate_report: {
    label: 'Generate Report',
    description: 'Produce a risk memo, summary, or structured report',
    icon: 'FileOutput',
    color: 'bg-green-50 text-green-700 border-green-200',
    instructionLabel: 'What should the report include?',
    instructionPlaceholder: 'e.g. Executive summary, findings by severity, recommended actions.',
  },
  research_precedents: {
    label: 'Research Precedents',
    description: 'Find relevant case law and legal precedents',
    icon: 'BookOpen',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    instructionLabel: 'What precedents or case law should be researched?',
    instructionPlaceholder: 'e.g. Force majeure precedents in NY commercial contracts since 2020.',
  },
  compliance_check: {
    label: 'Compliance Check',
    description: 'Check against policies and generate gap analysis',
    icon: 'ShieldCheck',
    color: 'bg-red-50 text-red-700 border-red-200',
    instructionLabel: 'Which policies or regulations should be checked?',
    instructionPlaceholder: 'e.g. SOC 2 controls, HIPAA privacy rule, state bar advertising rules.',
  },
};

export const OPERATIONS_IN_ORDER: WorkflowOperation[] = [
  'read_documents',
  'analyse_clauses',
  'compare_against_standard',
  'research_precedents',
  'compliance_check',
  'generate_report',
];

/* ─── Core types ─────────────────────────────────────────────────────── */

export interface ReferenceDoc {
  type: 'upload' | 'vault' | 'knowledge_pack';
  name: string;
  content: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  operation: WorkflowOperation;
  instruction: string;
  referenceDoc: ReferenceDoc | null;
  estimatedSeconds: number;
}

export type WorkflowVisibility = 'platform' | 'org' | 'personal';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  practiceArea: string;
  steps: WorkflowStep[];
  status: 'active' | 'draft';
  visibility: WorkflowVisibility;
  createdBy: string;
  createdByName: string;
  updatedAt: string;           // ISO
  estimatedTotalSeconds: number;
}

/* ─── Run-time types ─────────────────────────────────────────────────── */

export interface UploadedDoc {
  id: string;
  name: string;
  size: number;
  type: string;                 // extension, lowercase, no dot
  status: 'processing' | 'ready' | 'failed';
  content: string | null;
}

export type RunStepStatus = 'pending' | 'running' | 'complete' | 'failed' | 'skipped';
export type RunStatus = 'running' | 'complete' | 'failed' | 'cancelled';
export type StepSource = 'workspace_kb' | 'global_kb' | 'reference_doc' | 'uploaded_doc' | null;

export interface WorkflowRunStep {
  stepId: string;
  name: string;
  operation: WorkflowOperation;
  status: RunStepStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  output: string | null;
  error: string | null;
  sourceUsed: StepSource;
}

export interface WorkflowRun {
  id: string;
  templateId: string;
  templateName: string;
  userId: string;
  workspaceId: string | null;
  status: RunStatus;
  currentStepIndex: number;
  steps: WorkflowRunStep[];
  uploadedDocs: UploadedDoc[];
  startedAt: string;
  completedAt: string | null;
  reportCardData: WorkflowReport | null;
}

/* ─── Report (the final deliverable rendered in chat) ────────────────── */

export interface WorkflowReportStep {
  name: string;
  operation: WorkflowOperation;
  output: string;
  sourceUsed: string;
  durationSeconds: number;
  status: 'complete' | 'failed' | 'skipped';
}

export interface WorkflowReport {
  workflowName: string;
  practiceArea: string;
  runAt: string;
  durationSeconds: number;
  docsProcessed: string[];
  failedDocs?: string[];
  knowledgeSource: 'workspace' | 'global';
  workspaceName: string | null;
  steps: WorkflowReportStep[];
  summary: string;
}

/* ─── Storage + helpers ──────────────────────────────────────────────── */

const TEMPLATES_KEY = 'yourai_workflow_templates_v1';
const RUNS_KEY      = 'yourai_workflow_runs_v1';
const ACTIVE_RUN_KEY = 'yourai_workflow_active_run_v1';

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch { return fallback; }
}
function writeStore(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

/* Templates ─────────────────────────────────────────────────────────── */

export function listTemplates(): WorkflowTemplate[] {
  return readStore<WorkflowTemplate[]>(TEMPLATES_KEY, []);
}

export function saveTemplates(list: WorkflowTemplate[]): void {
  writeStore(TEMPLATES_KEY, list);
}

export function seedTemplatesIfEmpty(seed: WorkflowTemplate[]): void {
  const existing = readStore<WorkflowTemplate[] | null>(TEMPLATES_KEY, null);
  if (existing && existing.length > 0) return;
  writeStore(TEMPLATES_KEY, seed);
}

export function getTemplate(id: string): WorkflowTemplate | null {
  return listTemplates().find((t) => t.id === id) || null;
}

/**
 * Role-aware visibility filter for the picker.
 *   SA            → every template
 *   Org Admin     → platform + org + own personal
 *   Internal User → platform + org + own personal
 *   External User → none — Workflows is hidden for clients entirely
 */
export function listTemplatesForUser(
  userId: string,
  role: 'ORG_ADMIN' | 'INTERNAL_USER' | 'EXTERNAL_USER' | 'SUPER_ADMIN' | string,
): WorkflowTemplate[] {
  if (role === 'EXTERNAL_USER') return [];
  const all = listTemplates();
  if (role === 'SUPER_ADMIN') return all;
  return all.filter((t) =>
    t.visibility === 'platform' ||
    t.visibility === 'org' ||
    (t.visibility === 'personal' && t.createdBy === userId),
  );
}

export interface NewTemplateInput {
  name: string;
  description?: string;
  practiceArea: string;
  steps: WorkflowStep[];
  status?: 'active' | 'draft';
  visibility: WorkflowVisibility;
  createdBy: string;
  createdByName: string;
}

/** POST /api/workflows */
export function createTemplate(input: NewTemplateInput): WorkflowTemplate {
  const now = new Date().toISOString();
  const estimatedTotalSeconds = input.steps.reduce((a, s) => a + (s.estimatedSeconds || 0), 0);
  const t: WorkflowTemplate = {
    id: `wf-${Date.now()}`,
    name: input.name.trim(),
    description: (input.description || '').trim(),
    practiceArea: input.practiceArea,
    steps: input.steps,
    status: input.status || 'active',
    visibility: input.visibility,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    updatedAt: now,
    estimatedTotalSeconds,
  };
  const all = listTemplates();
  saveTemplates([t, ...all]);
  return t;
}

/** PUT /api/workflows/:id */
export function updateTemplate(id: string, patch: Partial<WorkflowTemplate>): WorkflowTemplate | null {
  const all = listTemplates();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const steps = patch.steps || all[idx].steps;
  const estimatedTotalSeconds = steps.reduce((a, s) => a + (s.estimatedSeconds || 0), 0);
  const next = { ...all[idx], ...patch, steps, estimatedTotalSeconds, updatedAt: new Date().toISOString() };
  all[idx] = next;
  saveTemplates(all);
  return next;
}

/** DELETE /api/workflows/:id */
export function deleteTemplate(id: string): boolean {
  const all = listTemplates();
  const next = all.filter((t) => t.id !== id);
  if (next.length === all.length) return false;
  saveTemplates(next);
  return true;
}

/** POST /api/workflows/:id/duplicate (shallow copy as personal) */
export function duplicateTemplate(id: string, userId: string, userName: string): WorkflowTemplate | null {
  const src = getTemplate(id);
  if (!src) return null;
  const copy: WorkflowTemplate = {
    ...src,
    id: `wf-${Date.now()}`,
    name: `${src.name} (Copy)`,
    visibility: 'personal',
    createdBy: userId,
    createdByName: userName,
    updatedAt: new Date().toISOString(),
    steps: src.steps.map((s) => ({ ...s, id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
  };
  saveTemplates([copy, ...listTemplates()]);
  return copy;
}

/* Runs ──────────────────────────────────────────────────────────────── */

export function listRuns(): WorkflowRun[] {
  return readStore<WorkflowRun[]>(RUNS_KEY, []);
}
export function saveRuns(list: WorkflowRun[]): void {
  writeStore(RUNS_KEY, list);
}
export function getRun(id: string): WorkflowRun | null {
  return listRuns().find((r) => r.id === id) || null;
}
export function upsertRun(run: WorkflowRun): void {
  const all = listRuns();
  const idx = all.findIndex((r) => r.id === run.id);
  if (idx === -1) all.unshift(run); else all[idx] = run;
  saveRuns(all);
}

/* Active-run guard — one workflow at a time per user.
   The active run id is mirrored to its own key for cheap reads from
   anywhere in the app (sidebar indicator, run-start guard, etc). */

export function getActiveRunId(): string | null {
  try { return localStorage.getItem(ACTIVE_RUN_KEY); } catch { return null; }
}
export function setActiveRunId(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(ACTIVE_RUN_KEY);
    else localStorage.setItem(ACTIVE_RUN_KEY, id);
  } catch { /* ignore */ }
}

/* Permission helpers used by UI ─────────────────────────────────────── */

export interface PermissionContext {
  userId: string;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  isExternalUser: boolean;
}

export function canCreateWorkflow(ctx: PermissionContext): boolean {
  return !ctx.isExternalUser; // Externals cannot create
}

export function canEditTemplate(t: WorkflowTemplate, ctx: PermissionContext): boolean {
  if (t.visibility === 'platform') return ctx.isSuperAdmin;
  if (t.visibility === 'org')      return ctx.isOrgAdmin;
  return t.createdBy === ctx.userId; // personal — owner only
}

export function canDeleteTemplate(t: WorkflowTemplate, ctx: PermissionContext): boolean {
  return canEditTemplate(t, ctx);
}

export function visibilityOptionsForRole(ctx: PermissionContext): WorkflowVisibility[] {
  if (ctx.isSuperAdmin) return ['personal', 'platform'];
  if (ctx.isOrgAdmin)   return ['personal', 'org'];
  return ['personal'];
}
