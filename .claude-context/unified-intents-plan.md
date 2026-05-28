# Unified Intents — architecture plan

**Keyword:** `unified-intents`

> Save reference for the SA-Bot-Persona-as-one-source-of-truth restructure
> proposed by Arjun on 2026-05-20. Load this file via
> `@.claude-context/unified-intents-plan.md` when picking the work up.

> **STATUS: SHIPPED 2026-05-28** (wireframe). All 6 phases live on
> `yourai/main`. `src/lib/intentsStore.ts` is the registry; `intents.ts`
> + `intentDetector.ts` derive from it; SA Bot Persona shadow-writes +
> has Chat/Workflow toggles; Workflow Builder filters by `workflowVisible`;
> `workflowPrompts.ts` resolves prompts from the store. **Remaining:**
> Phase 6 cleanup (delete the legacy `DEFAULT_INTENTS` / `LEGACY_INTENT_DEFAULTS`
> / `LEGACY_OPERATION_SYSTEM_PROMPTS` fallback constants — kept for rollback,
> delete once prod is proven stable). `docs/extracted/FRD_Unified_Intents.md`
> is the dev-team spec — **ON HOLD, don't share until Arjun says go.**
> Implementation deviated from the plan below in one way: rather than
> rewriting the SA editor UI, Phase 2 keeps the legacy persona shape and
> bridges via `intentFromPersonaOp` / `intentsFromPersonaOps` (a
> shadow-write), and Phases 3-5 keep the old modules as thin
> derive-from-store views with `LEGACY_*` fallbacks instead of deleting
> them outright. Net: same architecture, gentler migration.

---

## The core idea (Arjun's framing)

There is **one intents registry**, edited from SA Bot Persona. Each
intent has two visibility toggles:

- **`Visible in Chat`** — shows up in the chat intent dropdown.
- **`Visible in Workflow Builder`** — shows up as an operation in the
  Workflow Builder's step picker.

So adding a new workflow operation = SA admin clicks a toggle. No code
deploy. The workflow Builder's operation dropdown is just
`intents.filter(i => i.workflowVisible)`. The chat intent dropdown is
just `intents.filter(i => i.chatVisible)`. Same intent record powers
both surfaces with the same system prompt and the same output shape.

---

## Why this is the right call

1. **Collapses 4 drifting sources into 1.** Today the same operation
   lives in `src/lib/intents.ts` + `src/lib/intentDetector.ts` +
   `src/pages/super-admin/GlobalKnowledgeBase.jsx DEFAULT_INTENTS` +
   `src/lib/workflowPrompts.ts`. CLAUDE.md gotcha #6 documents the
   drift. Unifying kills the bug class.

2. **New workflow ops without engineering.** SA admin creates an intent
   → toggles workflow-visible → it's instantly available in the
   Builder. Today this requires editing `WorkflowOperation` union +
   `OPERATION_CONFIG` + adding a system prompt + UI dropdown. Code
   deploy per new op.

3. **The workflow executor becomes operation-agnostic.** Instead of
   `switch (step.operation) {...}`, it just calls the LLM with
   `intent.systemPrompt` and parses `intent.outputSchema`. Plug-and-play
   primitive.

4. **Dev-team handoff collapses.** One intents CRUD API + one executor
   + workflows = "run intents in sequence with prior-output chaining."
   That's a 5-day backend build, not a 3-week one. (Currently the dev
   team has to wire two separate dispatch paths — chat intents and
   workflow operations — and keep their prompts in sync.)

5. **Standardization Phase B ships automatically.** Per-operation output
   SHAPE becomes a stored field on each intent; chat cards and workflow
   report sections render from the same shape. No more chat-emits-JSON
   vs workflow-emits-markdown divergence.

---

## Wrinkles to handle in implementation

- **Two pipeline primitives are workflow-only, not user-facing chat
  intents:** `read_documents` (parsing step) and `generate_report`
  (synthesis step). Solve with the parallel `chatVisible: false`
  toggle. Defaults: most intents are chat-visible TRUE,
  workflow-visible FALSE. These two flip the inverse.

- **Three intents are chat-only:** `general_chat`, `legal_qa`, and
  `find_document`. All have `workflowVisible: false`. Reasoning:
  - `general_chat` — conversational, no structured output
  - `legal_qa` — free-form Q&A, no card / no workflow step shape
  - `find_document` — local vault search, no LLM round-trip

- **Generate Report's auto-append invariant stays** (the one shipped
  2026-05-20 via `ensureGenerateReportLast`). In the unified registry
  it becomes a property of the intent record:
  `autoAppendAtWorkflowEnd: true`. The runner reads it and enforces.
  Today it's hardcoded against the literal `'generate_report'` string;
  the registry-driven version is more flexible (if we ever want a
  different "always last step" intent, it's a toggle).

- **Keyword detection is chat-only metadata.** The classifier (LLM-
  based) only fires on user chat input. Workflows execute deterministic
  step sequences. So `keywords[]` lives on the intent but is only
  consumed by the chat path.

---

## Final intent set (post-unification)

| Intent | Chat | Workflow | Notes |
|---|---|---|---|
| `general_chat` | ✅ | ❌ | Chat utility, conversational |
| `legal_qa` | ✅ | ❌ | Free-form Q&A |
| `find_document` | ✅ | ❌ | Vault search, client-only |
| `document_summarisation` | ✅ | ✅ | Both |
| `clause_analysis` (= workflow's `analyse_clauses`) | ✅ | ✅ | Merge |
| `clause_comparison` (= workflow's `compare_against_standard`) | ✅ | ✅ | Merge |
| `legal_research` (= workflow's `research_precedents`) | ✅ | ✅ | Merge |
| `compliance_check` | ✅ | ✅ | Add to chat (it's workflow-only today) |
| `risk_assessment` | ✅ | ✅ | Add to workflow (it's chat-only today) |
| `timeline_extraction` | ✅ | ✅ | Both |
| `case_law_analysis` | ✅ | ✅ | Both |
| `contract_review` | ✅ | ✅ | Both |
| `document_drafting` | ✅ | ✅ | Add to workflow |
| `email_letter_drafting` | ✅ | ✅ | Add to workflow |
| `read_documents` | ❌ | ✅ | Workflow primitive |
| `generate_report` | ❌ | ✅ | Workflow synthesis, auto-appended at end |

So ~16 intents in the unified registry, ~13 chat-visible, ~13 workflow-
visible (with overlap of ~11).

---

## Ship phases

Total effort: ~5–7 focused days. Each phase ships independently.

### Phase 1 — Schema & storage (1 day)
- Define the unified `Intent` interface (id, label, description,
  systemPrompt, tonePrompt, keywords, chatVisible, workflowVisible,
  outputSchema, openingBehaviour, autoAppendAtWorkflowEnd, surfacePill,
  sortOrder, enabled).
- Add `src/lib/intentsStore.ts` (mirrors `documentVaultStore` /
  `knowledgePackStore`): `loadIntents`, `saveIntents`,
  `seedIntentsIfEmpty`. localStorage key `yourai_intents_v1`.
- Author the seed JSON: the 16 entries above, with each one's existing
  prompt + output schema migrated from the current 4 sources.

### Phase 2 — SA Bot Persona becomes the editor (1 day)
- `GlobalKnowledgeBase.jsx` Bot Persona tab reads from + writes to
  `intentsStore`.
- New columns in the intent editor: Chat-visible toggle, Workflow-
  visible toggle, Auto-append (visible only on the relevant intent),
  output schema field (text area), enabled flag.
- Drop the in-file `DEFAULT_INTENTS` constant (one of the 4 sources)
  in favour of the store seed.

### Phase 3 — Chat reads from the registry (1 day)
- `intentDetector.ts` reads keywords from the store instead of its
  internal `INTENT_DEFAULTS`.
- `src/lib/intents.ts` `INTENTS[]` becomes a thin wrapper that filters
  the store on `chatVisible`.
- Edge function `api/chat.ts` `CARD_SCHEMAS` becomes intent-driven —
  schema lookup by intent id from the store (intents pass through the
  client now since the Edge only sees the user-supplied intent id).

### Phase 4 — Workflow Builder reads from the registry (1 day)
- `OPERATION_CONFIG` in `workflow.ts` becomes a derived view over
  `intents.filter(workflowVisible)`.
- Workflow Builder's operation dropdown lists those entries.
- Step type stays `WorkflowOperation` but is typed as `IntentId` (the
  string id from the registry, not a hardcoded union).
- `ensureGenerateReportLast` reads the `autoAppendAtWorkflowEnd` flag
  instead of hardcoding the string `'generate_report'`.

### Phase 5 — Executor becomes operation-agnostic (1–2 days)
- `workflowExecutor.ts` `buildStepMessages` looks up the intent's
  systemPrompt from the store; no more `OPERATION_SYSTEM_PROMPTS`
  switch in `workflowPrompts.ts`.
- Per-operation output SHAPE (Phase B of the standardization rebuild)
  now lives on the intent record — workflow steps emit JSON matching
  `intent.outputSchema`, the report card renders each step from its
  schema (or the same `cardToMarkdown.ts` serializers the chat card
  panel uses, since the schema is identical).

### Phase 6 — Cleanup + dev-team handoff doc (1 day)
- Delete `src/lib/workflowPrompts.ts` (now redundant).
- Delete `INTENT_DEFAULTS` from `intentDetector.ts` (now redundant).
- Delete `DEFAULT_INTENTS` from `GlobalKnowledgeBase.jsx` (now
  redundant).
- Write `docs/extracted/FRD_Unified_Intents.md` for the dev team
  describing the new architecture: one intents table, two visibility
  toggles, executor pattern.

---

## What gets deleted

When this lands, these files / blocks go away:
- `src/lib/workflowPrompts.ts` — prompts move to intent records
- `intentDetector.ts` `INTENT_DEFAULTS` — keywords move to intent
  records
- `GlobalKnowledgeBase.jsx` `DEFAULT_INTENTS` — replaced by the seed
- The `WorkflowOperation` union in `workflow.ts` — replaced by
  `IntentId = string`
- The `OPERATION_CONFIG` hardcoded record — derived from the store

Net code reduction: ~600–800 lines removed, ~300 lines added (the
store + UI for the toggles). Negative LOC. Plus the dev team has a
single contract to build to.

---

## Dependencies on already-shipped work

- ✅ `ensureGenerateReportLast` (shipped 2026-05-20) — becomes
  registry-driven via `autoAppendAtWorkflowEnd` in Phase 4.
- ✅ Step-name = operation label (shipped 2026-05-20) — step name
  becomes intent label, same idea.
- ✅ The 6 → N operations rework — happens automatically once
  the Builder reads from the registry.

---

## Open question (decide before Phase 1)

The Edge function `api/chat.ts` currently injects per-intent JSON
schemas as a system message and forces `response_format: json_object`.
With the registry-driven approach, the schema needs to reach the Edge
somehow. Two options:

- **(a)** Client sends the schema in the request body alongside the
  intent id (Edge doesn't need to know about the registry).
- **(b)** Edge reads from a shared store (requires server-side state /
  the dev team's real backend).

(a) is the lazy fix that keeps the wireframe self-contained. (b) is
the production model. Recommend (a) for the wireframe rebuild; the
dev team's backend lands (b) naturally.

---

## When to invoke

Next time Arjun says **"unified intents"** (or references the keyword),
load this file via `@.claude-context/unified-intents-plan.md` and pick
up from Phase 1.
