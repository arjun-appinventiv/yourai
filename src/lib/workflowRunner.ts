// ─── Workflow Runner ───────────────────────────────────────────────
//
// Module-level singleton that executes a WorkflowRun step-by-step in
// the background. Components subscribe to run state via `subscribeRun`;
// the runner keeps going even if every subscriber unmounts (user
// navigates away mid-run) and only halts on cancel or completion.
//
// Runs are persisted to localStorage on every state change via
// upsertRun / setActiveRunId, so the sidebar indicator and remounted
// progress cards can always pick up where they left off within the
// same browser session. (Runs do NOT survive a hard page reload —
// demo-only behaviour. Production would back this with a server queue.)

import {
  type WorkflowRun, type WorkflowRunStep, type WorkflowTemplate,
  type UploadedDoc, type StepSource, type WorkflowReport, type WorkflowReportStep,
  upsertRun, getRun, setActiveRunId,
} from './workflow';
import { executeWorkflowStep } from './workflowExecutor';

/* ─── Options passed to a run ─── */
export interface RunOptions {
  template: WorkflowTemplate;
  uploadedDocs: UploadedDoc[];
  userId: string;
  userName: string;
  workspaceId: string | null;
  workspaceName: string | null;
}

/* ─── Subscription plumbing ─── */
const subscribers = new Map<string, Set<(run: WorkflowRun) => void>>();
const cancelFlags = new Map<string, () => void>();   // runId → cancel fn

function notify(runId: string, run: WorkflowRun): void {
  const set = subscribers.get(runId);
  if (!set) return;
  set.forEach((cb) => { try { cb(run); } catch { /* ignore */ } });
}

export function subscribeRun(runId: string, cb: (run: WorkflowRun) => void): () => void {
  let set = subscribers.get(runId);
  if (!set) { set = new Set(); subscribers.set(runId, set); }
  set.add(cb);
  return () => { set!.delete(cb); };
}

export function cancelRun(runId: string): void {
  const fn = cancelFlags.get(runId);
  if (fn) fn();
}

/* ─── Core run ─────────────────────────────────────────────────────── */

export function startRun(opts: RunOptions): WorkflowRun {
  const now = () => new Date().toISOString();
  const { template, uploadedDocs, userId, workspaceId, workspaceName } = opts;

  const runSteps: WorkflowRunStep[] = template.steps.map((s) => ({
    stepId: s.id,
    name: s.name || template.steps[0]?.name || 'Step',
    operation: s.operation,
    status: 'pending',
    startedAt: null,
    completedAt: null,
    durationSeconds: null,
    output: null,
    error: null,
    sourceUsed: null,
  }));

  const run: WorkflowRun = {
    id: `run-${Date.now()}`,
    templateId: template.id,
    templateName: template.name,
    userId,
    workspaceId,
    status: 'running',
    currentStepIndex: 0,
    steps: runSteps,
    uploadedDocs,
    startedAt: now(),
    completedAt: null,
    reportCardData: null,
  };

  upsertRun(run);
  setActiveRunId(run.id);
  notify(run.id, run);

  let cancelled = false;
  cancelFlags.set(run.id, () => { cancelled = true; });

  // Drive steps sequentially.
  (async () => {
    for (let i = 0; i < template.steps.length; i++) {
      if (cancelled) break;

      const tStep = template.steps[i];
      const startISO = now();
      run.currentStepIndex = i;
      run.steps[i] = { ...run.steps[i], status: 'running', startedAt: startISO };
      upsertRun(run);
      notify(run.id, run);

      const t0 = Date.now();

      try {
        const { output, source } = await executeStep(run, tStep, opts);
        const durationSeconds = Math.max(1, Math.round((Date.now() - t0) / 1000));
        run.steps[i] = {
          ...run.steps[i],
          status: 'complete',
          output,
          sourceUsed: source,
          completedAt: now(),
          durationSeconds,
        };
      } catch (err: any) {
        const durationSeconds = Math.max(1, Math.round((Date.now() - t0) / 1000));
        run.steps[i] = {
          ...run.steps[i],
          status: 'failed',
          error: err?.message || 'Step failed',
          completedAt: now(),
          durationSeconds,
        };
        run.status = 'failed';
        upsertRun(run);
        notify(run.id, run);
        setActiveRunId(null);
        cancelFlags.delete(run.id);
        return; // stop on first failure — user can retry per step
      }

      upsertRun(run);
      notify(run.id, run);
    }

    if (cancelled) {
      run.status = 'cancelled';
      run.completedAt = now();
    } else {
      run.status = 'complete';
      run.completedAt = now();
      run.reportCardData = buildReport(run, template, workspaceName);
    }

    upsertRun(run);
    notify(run.id, run);
    setActiveRunId(null);
    cancelFlags.delete(run.id);
  })();

  return run;
}

/* ─── Retry a single failed step ─── */

export async function retryStep(runId: string, stepIndex: number, opts: RunOptions): Promise<void> {
  const run = getRun(runId);
  if (!run) return;
  const tStep = opts.template.steps[stepIndex];
  if (!tStep) return;

  run.steps[stepIndex] = {
    ...run.steps[stepIndex],
    status: 'running',
    startedAt: new Date().toISOString(),
    error: null,
  };
  run.status = 'running';
  run.currentStepIndex = stepIndex;
  upsertRun(run);
  setActiveRunId(run.id);
  notify(run.id, run);

  const t0 = Date.now();
  try {
    const { output, source } = await executeStep(run, tStep, opts);
    const durationSeconds = Math.max(1, Math.round((Date.now() - t0) / 1000));
    run.steps[stepIndex] = {
      ...run.steps[stepIndex],
      status: 'complete',
      output,
      sourceUsed: source,
      completedAt: new Date().toISOString(),
      durationSeconds,
    };

    // Continue remaining steps from stepIndex+1
    for (let i = stepIndex + 1; i < opts.template.steps.length; i++) {
      run.currentStepIndex = i;
      run.steps[i] = { ...run.steps[i], status: 'running', startedAt: new Date().toISOString() };
      upsertRun(run);
      notify(run.id, run);
      const tt = Date.now();
      try {
        const { output: o2, source: s2 } = await executeStep(run, opts.template.steps[i], opts);
        run.steps[i] = {
          ...run.steps[i],
          status: 'complete',
          output: o2,
          sourceUsed: s2,
          completedAt: new Date().toISOString(),
          durationSeconds: Math.max(1, Math.round((Date.now() - tt) / 1000)),
        };
      } catch (err: any) {
        run.steps[i] = {
          ...run.steps[i],
          status: 'failed',
          error: err?.message || 'Step failed',
          completedAt: new Date().toISOString(),
          durationSeconds: Math.max(1, Math.round((Date.now() - tt) / 1000)),
        };
        run.status = 'failed';
        upsertRun(run);
        notify(run.id, run);
        setActiveRunId(null);
        return;
      }
      upsertRun(run);
      notify(run.id, run);
    }

    run.status = 'complete';
    run.completedAt = new Date().toISOString();
    run.reportCardData = buildReport(run, opts.template, opts.workspaceName);
    upsertRun(run);
    notify(run.id, run);
    setActiveRunId(null);
  } catch (err: any) {
    const durationSeconds = Math.max(1, Math.round((Date.now() - t0) / 1000));
    run.steps[stepIndex] = {
      ...run.steps[stepIndex],
      status: 'failed',
      error: err?.message || 'Step failed',
      completedAt: new Date().toISOString(),
      durationSeconds,
    };
    run.status = 'failed';
    upsertRun(run);
    notify(run.id, run);
    setActiveRunId(null);
  }
}

/* ─── Step execution — delegates to workflowExecutor ──────────────── */

async function executeStep(
  run: WorkflowRun,
  tStep: WorkflowTemplate['steps'][number],
  opts: RunOptions,
): Promise<{ output: string; source: StepSource }> {
  const { output, source } = await executeWorkflowStep({
    run,
    templateStep: tStep,
    template: opts.template,
    stepIndex: run.currentStepIndex,
    workspaceName: opts.workspaceName,
  });
  return { output, source };
}

/* ─── Report builder ───────────────────────────────────────────────── */

function buildReport(run: WorkflowRun, template: WorkflowTemplate, workspaceName: string | null): WorkflowReport {
  const reportSteps: WorkflowReportStep[] = run.steps.map((s) => ({
    name: s.name,
    operation: s.operation,
    output: s.output || '',
    sourceUsed: sourceLabel(s.sourceUsed),
    durationSeconds: s.durationSeconds || 0,
    status: (s.status === 'complete' || s.status === 'failed' || s.status === 'skipped') ? s.status : 'complete',
  }));

  // Use the last completed Generate Report step as the summary, or the
  // last completed step of any kind as a fallback.
  const reportStep = [...reportSteps].reverse().find((s) => s.operation === 'generate_report' && s.status === 'complete');
  const fallback = [...reportSteps].reverse().find((s) => s.status === 'complete');
  const summary = reportStep?.output || fallback?.output || '';

  const failedDocs = run.uploadedDocs.filter((d) => d.status === 'failed').map((d) => d.name);
  const docsProcessed = run.uploadedDocs.filter((d) => d.status === 'ready').map((d) => d.name);

  const totalSec = run.steps.reduce((a, s) => a + (s.durationSeconds || 0), 0);

  return {
    workflowName: template.name,
    practiceArea: template.practiceArea,
    runAt: run.startedAt,
    durationSeconds: totalSec,
    docsProcessed,
    failedDocs: failedDocs.length > 0 ? failedDocs : undefined,
    knowledgeSource: run.workspaceId ? 'workspace' : 'global',
    workspaceName: workspaceName,
    steps: reportSteps,
    summary,
  };
}

function sourceLabel(s: StepSource): string {
  if (s === 'uploaded_doc') return 'run uploads';
  if (s === 'reference_doc') return 'reference doc';
  if (s === 'workspace_kb') return 'workspace docs';
  if (s === 'global_kb') return 'global KB';
  return 'none';
}
