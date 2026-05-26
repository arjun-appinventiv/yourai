# FRD — Unified Intents

> **Audience:** dev team building the YourAI backend at
> `youraillc-pwa-dev.appskeeper.in`. Replaces the prior 4-table mental
> model (chat intents · intent detector · SA bot persona · workflow
> operations) with **one** intents table and two visibility toggles.
>
> **Status:** wireframe-side implementation shipped 2026-05-26 across
> 5 phases (commits `872ad49..` on `yourai/main`). Reference spec for
> backend.

---

## 1. The core idea

There is ONE intents table. Each row has two visibility toggles:

- `chatVisible` — appears in the chat intent dropdown.
- `workflowVisible` — appears in the Workflow Builder's operation picker.

Adding a new workflow operation = SA admin toggles `workflowVisible` on an
intent. No code deploy. Existing intents toggle in/out of each surface
without engineering.

```
                  ┌──────────────────────────────────┐
                  │       INTENTS TABLE (one)        │
                  │  id · label · systemPrompt ·     │
                  │  keywords · chatVisible ·        │
                  │  workflowVisible · ...           │
                  └──────────────────────────────────┘
                       │                       │
              chat dropdown            Workflow Builder op picker
            filter chatVisible        filter workflowVisible
```

## 2. Row shape

```ts
interface Intent {
  id: string;                    // 'general_chat', 'contract_review', etc.
  label: string;                 // Display name in dropdowns + SA editor
  description: string;           // One-line subtitle
  systemPrompt: string;          // Full LLM system prompt
  tonePrompt?: string;           // Optional tone overlay (SA-editable)
  keywords: string[];            // Anchors for client-side auto-detect
  chatVisible: boolean;
  workflowVisible: boolean;
  outputSchema?: string;         // JSON schema (response_format gate)
  openingBehaviour: 'start_immediately' | 'ask_for_document' | 'ask_clarifying_question';
  autoAppendAtWorkflowEnd?: boolean;  // Generate Report sets this true
  sourcePill?: 'kb' | 'doc' | 'workspace' | 'local' | 'none';
  sortOrder: number;
  enabled: boolean;              // Tenant-level kill switch
}
```

## 3. Default set (15 intents)

| id | label | chat | workflow | notes |
|---|---|---|---|---|
| `general_chat` | General Chat | ✅ | ❌ | Conversational fallback |
| `legal_qa` | Legal Q&A | ✅ | ❌ | Free-form Q&A with citations |
| `find_document` | Find Document | ✅ | ❌ | Client-only vault search |
| `contract_review` | Contract Review | ✅ | ✅ | Triage / Deep-dive / Playbook-check |
| `clause_analysis` | Clause Analysis | ✅ | ✅ | Replaces workflow op `analyse_clauses` |
| `clause_comparison` | Clause Comparison | ✅ | ✅ | Replaces workflow op `compare_against_standard` |
| `risk_assessment` | Risk Assessment | ✅ | ✅ | Severity-ranked findings |
| `document_summarisation` | Document Summarisation | ✅ | ✅ | Legal-memo / stakeholder / TLDR modes |
| `case_law_analysis` | Case Law Analysis | ✅ | ✅ | 9-section brief structure |
| `legal_research` | Legal Research | ✅ | ✅ | Replaces workflow op `research_precedents` |
| `compliance_check` | Compliance Check | ✅ | ✅ | Framework gap analysis |
| `due_diligence` | Due Diligence | ✅ | ✅ | M&A / financing issues memo |
| `document_drafting` | Document Drafting | ✅ | ❌ | NDA / MSA / clause drafting |
| `email_letter_drafting` | Email & Letter Drafting | ✅ | ❌ | Demand letters, status updates |
| `read_documents` | Read Documents | ❌ | ✅ | Workflow primitive — parse/structure |
| `generate_report` | Generate Report | ❌ | ✅ | Workflow synthesis · `autoAppendAtWorkflowEnd: true` |

## 4. Backend API contract (proposed)

```
GET    /api/v1/intents              → Intent[]                   (all enabled)
GET    /api/v1/intents/:id          → Intent
POST   /api/v1/intents              → Intent                     (SA only)
PATCH  /api/v1/intents/:id          → Intent                     (SA only)
DELETE /api/v1/intents/:id          → 204                        (SA only — soft delete by setting enabled=false)

GET    /api/v1/intents/chat         → Intent[] where chatVisible
GET    /api/v1/intents/workflow     → Intent[] where workflowVisible
```

Tenant scope: each firm has its own copy of the table seeded from the
platform defaults. SA edits at the platform level become the new
defaults for future tenants; existing tenants are unaffected.

## 5. Migration table (rename map)

Old ids the wireframe + persisted workflow templates may still contain:

```
analyse_clauses          → clause_analysis
compare_against_standard → clause_comparison
research_precedents      → legal_research
```

Read-time migration: when a workflow template's step references one of
the old ids, translate to the new id before resolving the prompt.
Code reference: `OPERATION_MIGRATION` constant in
`src/lib/intentsStore.ts`.

## 6. Executor pattern (workflow runs)

The executor becomes operation-agnostic:

```ts
const intent = intentsTable.find(i => i.id === step.intentId);
const messages = [
  { role: 'system', content: intent.systemPrompt },
  { role: 'user',   content: buildUserMessage(step, priorOutputs, docs) },
];
return openai.chat.completions.create({ messages, response_format: intent.outputSchema ? { type: 'json_object' } : undefined });
```

No switch statement on operation type. New workflow ops require zero
executor changes once the intent record exists.

## 7. Generate Report invariant

Workflows must end with `generate_report`. The system enforces this at
runner load: if the template's last step isn't the auto-append intent
(`autoAppendAtWorkflowEnd: true`), append one with a default
instruction. Code reference: `ensureGenerateReportLast()` in
`src/lib/workflow.ts`.

## 8. Output schemas (response_format)

For card-rendering intents (Risk Memo, Summary, Comparison, Case Brief,
Research, Clause Analysis), the Edge sets `response_format:
{ type: 'json_object' }` and prepends a schema instruction. The schema
is a stored field on the intent (`outputSchema`). The client sends the
intent id with each chat request; the Edge / server resolves the
schema from the intents table.

## 9. Source-of-truth lifecycle (wireframe → backend)

| Stage | Source | Edit surface |
|---|---|---|
| **Today** (wireframe) | `localStorage[yourai_intents_v1]` | SA Bot Persona editor (writes via `saveIntents()` in `src/lib/intentsStore.ts`) |
| **Phase 1 backend** | Postgres `intents` table | SA Bot Persona UI POSTs to `/api/v1/intents/:id` |
| **Phase 2 backend** | Same | SA edits propagate live via SSE / refetch |

The wireframe's `intentsStore.ts` is the staging area — its shape is
what the backend table should mirror.

## 10. Removed concepts

Three concepts the prior architecture used that this unification deletes:

- **Separate workflow operation enum** — the `WorkflowOperation` union
  in `src/lib/workflow.ts` is now redundant; ids are just strings.
- **Per-operation hardcoded system prompts** — `OPERATION_SYSTEM_PROMPTS`
  in `workflowPrompts.ts` is a fallback only; the canonical prompt is
  on the intent record.
- **Drift across 4 registries** — `INTENTS[]`, `INTENT_DEFAULTS`,
  `DEFAULT_INTENTS` (SA), and `OPERATION_SYSTEM_PROMPTS` are no longer
  separate sources. They all view the same data.

## 11. Implementation reference (wireframe code paths)

Files touched in the wireframe (read these for the pattern, not the prod
shape):

- `src/lib/intentsStore.ts` — schema + helpers + lean seed
- `src/pages/super-admin/GlobalKnowledgeBase.jsx` — SA editor shadow-writes
- `src/lib/intents.ts` — chat-side view (filters `chatVisible`)
- `src/lib/intentDetector.ts` — keyword classifier reads from store
- `src/lib/workflow.ts` — `getWorkflowOperations()` derived view
- `src/lib/workflowPrompts.ts` — `getSystemPromptForOperation()` store-first lookup

## 12. Open items for backend

- **Outputs schemas as JSON, not strings** — current store holds
  `outputSchema` as a free-form string; backend should validate as JSON
  schema and reject malformed updates.
- **Audit log per intent edit** — every SA write to an intent record
  should fire an audit log entry (operator, before, after, timestamp).
- **Per-tenant overrides** — the SA edit surface should support both
  platform-default edits (apply to new tenants) and tenant-specific
  overrides (apply to one firm only). Current wireframe is tenant-local
  only.
- **Card output schemas** — port the chat-side `CARD_SCHEMAS` from
  `api/chat.ts` into the intents table's `outputSchema` field; remove
  the hardcoded schema from the Edge function.

---

*Generated 2026-05-26 alongside the unified-intents implementation. See
`.claude-context/unified-intents-plan.md` (wireframe-side plan) for the
ship-phase breakdown.*
