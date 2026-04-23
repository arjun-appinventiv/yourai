/* ─── Workflow Step Executor ───────────────────────────────────────────
 *
 * Sends a single workflow step to the OpenAI proxy at /api/chat (Edge
 * function) and returns the full accumulated output string. Each step
 * uses an operation-specific system prompt (see workflowPrompts.ts)
 * and has access to prior step outputs for chaining.
 *
 * Fallback: if the Edge function is unreachable (offline, dev server
 * without the env key, timeout), returns a short, honest placeholder
 * the caller can surface instead of crashing the run.
 */

import type { WorkflowRun, WorkflowTemplate, StepSource, WorkflowOperation } from './workflow';
import { buildStepMessages } from './workflowPrompts';

export interface ExecuteStepResult {
  output: string;
  source: StepSource;
  usedFallback: boolean;
}

export interface ExecuteStepInput {
  run: WorkflowRun;
  templateStep: WorkflowTemplate['steps'][number];
  template: WorkflowTemplate;
  stepIndex: number;
  workspaceName: string | null;
}

const STEP_TIMEOUT_MS = 90_000;

/**
 * Execute a single step by calling /api/chat with operation-specific
 * prompts, uploaded docs, and prior step outputs. Returns accumulated
 * streamed output.
 */
export async function executeWorkflowStep(input: ExecuteStepInput): Promise<ExecuteStepResult> {
  const { run, templateStep, template, stepIndex, workspaceName } = input;

  // Determine the source label for the report card (priority: uploads >
  // reference doc > workspace KB > global KB).
  const readyDocs = run.uploadedDocs.filter((d) => d.status === 'ready' && d.content && d.content.trim().length > 0);
  const hasRunUploads = readyDocs.length > 0;
  const hasRef = !!templateStep.referenceDoc;
  const inWorkspace = !!run.workspaceId;
  let source: StepSource;
  if (hasRunUploads) source = 'uploaded_doc';
  else if (hasRef) source = 'reference_doc';
  else if (inWorkspace) source = 'workspace_kb';
  else source = 'global_kb';

  // Prior step outputs — only the ones that completed with content.
  const priorStepOutputs = run.steps
    .slice(0, stepIndex)
    .filter((s) => s.status === 'complete' && s.output && s.output.trim().length > 0)
    .map((s) => ({
      stepName: s.name || '(unnamed step)',
      operation: s.operation as WorkflowOperation,
      output: s.output || '',
    }));

  // Build the messages[] payload using the operation-specific system
  // prompt + assembled user message.
  const messages = buildStepMessages({
    operation: templateStep.operation,
    stepName: templateStep.name || '',
    stepNumber: stepIndex + 1,
    totalSteps: template.steps.length,
    userInstruction: templateStep.instruction || '',
    uploadedDocs: readyDocs.map((d) => ({ name: d.name, content: d.content || '' })),
    referenceDoc: templateStep.referenceDoc
      ? { name: templateStep.referenceDoc.name, content: templateStep.referenceDoc.content || '' }
      : null,
    workspaceName: workspaceName,
    priorStepOutputs,
  });

  // Fire the Edge function call.
  let accumulated = '';
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort('timeout'), STEP_TIMEOUT_MS);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: 'gpt-4o-mini',
        temperature: 0.35,
        max_tokens: 1800,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await safeText(res);
      // 500 with "not configured" → offline demo mode
      if (res.status === 500 && /not configured/i.test(errText)) {
        clearTimeout(timeoutHandle);
        return { output: fallbackOutput(templateStep, 'The OpenAI key is not configured on the server.'), source, usedFallback: true };
      }
      throw new Error(`LLM call failed (${res.status}): ${errText.slice(0, 140)}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('No response body from /api/chat.');
    }
    const decoder = new TextDecoder();
    // The Edge function streams plain text chunks.
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
    }
    // Flush any trailing bytes
    accumulated += decoder.decode();

    clearTimeout(timeoutHandle);

    if (!accumulated.trim()) {
      return { output: fallbackOutput(templateStep, 'The LLM returned an empty response.'), source, usedFallback: true };
    }

    return { output: accumulated, source, usedFallback: false };
  } catch (err: any) {
    clearTimeout(timeoutHandle);
    const msg = String(err?.message || err || '');
    // Network / abort / offline fallback — never crash the run
    if (/abort|timeout|Failed to fetch|network|AbortError/i.test(msg)) {
      return { output: fallbackOutput(templateStep, 'The AI backend didn\'t respond in time.'), source, usedFallback: true };
    }
    // Re-throw real errors so the runner marks the step failed
    throw err;
  }
}

async function safeText(res: Response): Promise<string> {
  try { return await res.text(); } catch { return ''; }
}

function fallbackOutput(
  templateStep: WorkflowTemplate['steps'][number],
  reason: string,
): string {
  return [
    `**Not completed — ${reason}**`,
    ``,
    `This step was supposed to run the **${templateStep.operation.replace(/_/g, ' ')}** operation`,
    `with the instruction: _${templateStep.instruction || '(operation default)'}_.`,
    ``,
    `Retry the step once the AI backend is reachable, or configure the OpenAI key on the server.`,
  ].join('\n');
}

/* ─── Pre-flight: classify uploaded documents ─────────────────────────
 *
 * Optional lightweight pre-run classification to help the downstream
 * steps + warn the user if the uploaded documents don't match what the
 * workflow typically expects. Returns a one-line classification per doc.
 */

export interface DocClassification {
  name: string;
  type: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Quick classification via one LLM call — lightweight, cheap, and only
 * used to populate a pre-run warning in the UI. Not wired into the
 * per-step prompts (those do their own classification on the fly).
 */
export async function classifyDocs(docs: Array<{ name: string; content: string | null }>): Promise<DocClassification[]> {
  const ready = docs.filter((d) => d.content && d.content.trim().length > 50);
  if (ready.length === 0) return [];

  const summary = ready.map((d) => {
    const snippet = (d.content || '').slice(0, 600).replace(/\s+/g, ' ');
    return `- ${d.name}: ${snippet}`;
  }).join('\n');

  const system = `You are a legal document classifier. Given short snippets of uploaded documents, classify each one into a single category: "contract", "NDA", "lease", "agreement", "court filing", "memo", "financial statement", "board minute", "policy", "email", "regulation", "case law", or "other". Respond with JSON only.`;

  const user = `Classify each of these documents:\n\n${summary}\n\nRespond as a JSON array of {name, type, confidence} objects. Confidence is "high" | "medium" | "low". Example: [{"name":"abc.pdf","type":"NDA","confidence":"high"}]`;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 500,
      }),
    });
    if (!res.ok) return [];
    const reader = res.body?.getReader();
    if (!reader) return [];
    const decoder = new TextDecoder();
    let accumulated = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
    }
    accumulated += decoder.decode();

    // Extract JSON array (trim code fences if present)
    const jsonMatch = accumulated.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is DocClassification =>
      p && typeof p.name === 'string' && typeof p.type === 'string'
    );
  } catch {
    return [];
  }
}
