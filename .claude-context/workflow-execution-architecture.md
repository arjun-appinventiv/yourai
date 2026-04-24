# Workflow Execution Architecture — reference note

> Snapshot of the pattern established 2026-04-24 when workflows went from mock-only to real LLM execution.

## Why this file exists

Before 2026-04-24 the `workflowRunner` called `callLLM` (the client-side fallback in `src/lib/llm-client.ts`) which required a browser-side `VITE_OPENAI_API_KEY`. That key was **never set in production**. Every workflow run silently fell through to a "Not completed — offline demo mode" placeholder.

This note documents the new pattern so it stays intact next time someone touches workflow code.

---

## The three files you care about

```
src/lib/workflowPrompts.ts   ← per-operation system prompts + message builder
src/lib/workflowExecutor.ts  ← POSTs to /api/chat, streams back, returns text
src/lib/workflowRunner.ts    ← orchestrator: iterates steps, calls executor, handles cancel/retry
```

## The flow per step

1. `workflowRunner.executeStep(run, tStep, opts)` delegates to `workflowExecutor.executeWorkflowStep(...)`.
2. `executeWorkflowStep` builds `messages[]` via `workflowPrompts.buildStepMessages(...)`:
   - `messages[0]` = operation-specific system prompt (6 variants keyed off `tStep.operation`).
   - `messages[1]` = assembled user message: step metadata + user instruction + prior-step outputs + uploaded docs + optional reference doc + workspace context.
3. POST to `/api/chat` as `{ messages, model: 'gpt-4o-mini', temperature: 0.35, max_tokens: 1800 }`.
4. Read the `ReadableStream` response, accumulate chunks into a single markdown string.
5. Return `{ output, source, usedFallback }` to the runner, which writes to `run.steps[i]`.

## Cap everything

Token-budget safety is in the message builder, not at the Edge:

- Each prior step output capped at **~3500 chars** before chaining.
- Each uploaded document capped at **~8000 chars**.
- Reference documents capped at **~6000 chars**.

These caps are deliberately generous. If the model 400s on length, shrink these before changing models.

## Operation prompts: the six

Each prompt in `workflowPrompts.ts` shares the same **anti-hallucination rules** block at the bottom. The operation-specific part above it is:

- **`read_documents`** — classify + structure each uploaded doc (type, parties, dates, structure, extractable facts).
- **`analyse_clauses`** — clause-by-clause breakdown (name, summary, assessment, risk level). Skip categories where there are no clauses.
- **`compare_against_standard`** — comparison table (Subject vs Reference / Market) focused on 6–12 material differences.
- **`research_precedents`** — governing jurisdiction + statutes + case law, each with citations or "citation to verify" hedge.
- **`compliance_check`** — framework-based gap analysis (controls evaluated + evidence + severity + remediation).
- **`generate_report`** — final synthesis: header paragraph + key findings + risk rating + recommended actions.

## The vague-doc protocol — verbatim

Every operation's system prompt contains:

> If the supplied documents don't cover what this step asks for, begin your response with: **"Not covered by supplied documents."** followed by a one-sentence reason, then provide whatever partial analysis IS possible from what WAS supplied.

The sentence is literal. QA tests check for that exact string. Don't rewrite it unless you update every test too.

## Extending

### Adding a new operation
1. Add the `WorkflowOperation` union in `src/lib/workflow.ts`.
2. Add the operation's system prompt to `OPERATION_SYSTEM_PROMPTS` in `workflowPrompts.ts`.
3. Add an icon mapping in `OP_ICON` wherever it's used (WorkflowsPanel, WorkflowBuilder, WorkflowProgressCard, WorkflowReportCard).
4. Add the operation to `OPERATION_CONFIG` (label, description, etc.).
5. The executor is operation-agnostic; no changes needed there.

### Adding a new model option
`executeWorkflowStep` sends `model: 'gpt-4o-mini'` hardcoded today. If per-workflow or per-step model selection becomes a requirement, plumb it through `ExecuteStepInput` (currently just `run`, `templateStep`, `template`, `stepIndex`, `workspaceName`).

### Pre-flight classification
`workflowExecutor.classifyDocs(docs)` is exported and functional but not yet wired into `PreRunModal`. Spec is in the session transcript and in `FRD_Incorrect_Document_Handling.docx` Stage 1.

## What NOT to use

- **Do not call `callLLM`** from any new workflow / AI feature. It's the client-side fallback path, needs `VITE_OPENAI_API_KEY` which is never set, and the "offline demo mode" placeholder will be the silent result.
- **Do not build prompts inline inside `workflowRunner`** — operation prompts belong in `workflowPrompts.ts`. Runner stays a pure orchestrator.
- **Do not skip the anti-hallucination block** in any operation prompt. It's one copy-paste; don't leave a new operation without it.

## Related files

- `api/chat.ts` — the Edge function the executor hits. Accepts `body.messages[]` (preferred for workflows) OR `body.message` + `body.system` + `body.history` (used by the chat UI).
- `src/components/chat/WorkflowProgressCard.tsx` — renders the live step list. Takes a `variant="embedded"` prop when rendered inside the Run Panel's `RunRow` (suppresses outer chrome).
- `src/components/chat/WorkflowReportCard.tsx` — document-style final report (Option D). Opens an audit-log modal for per-step output + a printable PDF window.

## Testing

- `docs/extracted/FRD_Incorrect_Document_Handling.docx` has the 30-case QA test matrix, grouped by stage (Pre-Run / per-step / Report).
- The smoke-test pattern for "did my workflow code change break prod" is the same headless-Chrome `curl + --dump-dom` pattern documented in CLAUDE.md gotcha #8.
