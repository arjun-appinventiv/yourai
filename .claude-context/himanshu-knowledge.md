# Himanshu's project knowledge — YourAI

> Senior QA engineer's working brain dump on YourAI. Read at the start of every Himanshu invocation. Update at the end of each run.
>
> Companion file: `.claude-context/ai-chat-regression-set.md` — seeded prompt set for chat regression sweeps.

---

## 1. Project overview

**YourAI** — private, single-tenant AI platform for US law firms. Attorneys (Internal Users) and paralegals chat with legal documents, run multi-step AI workflows, browse a curated knowledge base, and get outputs as summaries, risk memos, clause analyses, timelines, and research briefs. Two staff-facing portals plus the tenant chat surface live in one repo.

- **Tenant chat** — `/chat`, `/chat/home`, `/chat/workspaces`, `/chat/workspaces/:id` — what end users see.
- **Super Admin** — `/super-admin/*` — YourAI staff administer tenants, users, global KB, bot persona.
- **Org Admin** — `/app/*` — tenant admin manages their own firm (workspaces, vault, KP, billing, audit).

Production URL: `https://yourai-black.vercel.app`. Vercel deploys the `yourai/main` branch; the working branch is currently `claude/great-banach`. Merge ritual: branch into `tmp` from `yourai/main`, merge `--no-ff`, push `tmp:main`. Never push to `origin` (stale `scope-creator-ai` repo).

Roles: `SUPER_ADMIN`, `ORG_ADMIN`, `INTERNAL_USER`, `EXTERNAL_USER`. External users have NO workflow access, no `/chat/home` — they land in `/chat/workspaces` after login.

Sprint context (from team memory): Sprint 1 active, 20 user stories. Wireframe is built; the team is iteratively wiring backend pieces and showing the prod build to clients (Wendy attorney, Ryan Hoke, Michael advisor, Ryan Robertson).

---

## 2. Architecture map

### 2.1 Frontend — Vite + React + TypeScript (mixed with .jsx)

- **Routing**: React Router v6, `BrowserRouter`. See `src/App.jsx` for the full route table.
- **State**: React state + localStorage mock-API pattern (every `lib/*.ts` mock function is shaped like the REST endpoint it'll eventually become — swap impls without touching UI).
- **Auth + role**: `src/context/AuthContext.jsx` + `src/context/RoleContext.tsx`; localStorage-backed session, no real Cognito wired yet.
- **Styling**: design tokens in `src/index.css` (`--navy`, `--gold`, `--ice-warm`, `--border`, etc.). DM Serif Display (decorative titles), DM Sans (body), IBM Plex Mono (mono labels — referenced but the font itself isn't loaded; falls back to `ui-monospace`).
- **Icons**: `lucide-react`. Missing import = `ReferenceError` blanks the whole app at render time (no CI for this).

### 2.2 Backend layer

There are TWO backend stories in this repo. Tests should know which is real.

- **REAL (production)** — Vercel Edge Functions in `api/`:
  - `api/chat.ts` — OpenAI proxy. Accepts `{message, history, intent, system?}` (UI shape) OR legacy `{messages: [...]}` (workflow shape). Forces `response_format: json_object` when `intent` is a card intent. Streams plain text back. Runs on the Edge runtime.
  - `api/frd-generate.ts` — separate FRD generator endpoint.
- **EXPERIMENTAL (NOT wired to prod)** — `backend/` folder contains a Prisma+SQLite (`dev.db`) scaffold. Production chat does **NOT** hit it. Status is unclear — listed under blockers as a question for Ryan.

### 2.3 LLM call shape

- Model: hard-coded `gpt-4o-mini` in `api/chat.ts` (default) and `workflowExecutor.ts` (explicit override).
- Single critical external dependency: OpenAI Chat Completions API.
- Server-side key only — never exposed to the client. Edge function reads `process.env.OPENAI_API_KEY`. Returns 500 with `"AI service is not configured on the server."` if missing.
- Streaming: SSE upstream → plain `text/plain` chunks downstream (so the client's `ReadableStream` reader stays simple).

### 2.4 The dead client-fallback path

`src/lib/llm-client.ts` defines `callLLM` — a browser-side OpenAI call that needs `VITE_OPENAI_API_KEY`. **As of 2026-04-25, no production code path uses it.** It only matters if a dev sets the env var deliberately. Symptoms of regressing back to it: bot says either "Something went wrong reaching the AI" (workspace path) or "No LLM backend available. Please configure the API key…" (the latter copy was removed but watch for its return).

### 2.5 Role / context system

- `RoleProvider` in `src/context/RoleContext.tsx` — currently just exposes the user's role (one of the 4) so sidebar / home tiles / workflow access can gate.
- Bot Persona config is SA-side only and lives in `yourai_bot_persona` localStorage. The Edge function does **NOT** read it — production chat uses the Edge's hardcoded prompt + per-intent JSON schema only. Persona only affects the dead `callLLM` path.

---

## 3. AI chat system internals (deep)

### 3.1 The 3 sources of truth for intents (DRIFT WARNING — gotcha #6)

When adding/editing an intent, ALL THREE need updates:

1. **`src/lib/intents.ts`** — `INTENTS[]` list (id + label) + `getIntentLabel()` / `getIntentId()` helpers. Currently 13 intents: `general_chat`, `contract_review`, `legal_research`, `document_drafting`, `document_summarisation`, `case_law_analysis`, `clause_comparison`, `email_letter_drafting`, `legal_qa`, `risk_assessment`, `clause_analysis`, `timeline_extraction`, `find_document`.
2. **`src/lib/intentDetector.ts`** — `INTENT_DEFAULTS` keyword map + `PRIORITY_ORDER`. `detectIntent()` runs frontend-only keyword matching: most-keyword-matches wins, ties broken by priority order. `find_document` sits highest in priority so vault-search anchors don't lose to `legal_qa`'s "what is" / "explain" patterns.
3. **`src/pages/super-admin/GlobalKnowledgeBase.jsx`** — `DEFAULT_INTENTS` constant inside the SA Bot Persona editor. Drifted historically.

### 3.2 Card schemas — `CARD_SCHEMAS` in `api/chat.ts`

Per-intent JSON schema strings injected as a system message when the client tags a request with one of the 7 LLM-backed card intents:

| Intent | Card | Source pill |
|---|---|---|
| `document_summarisation` | `SummaryCard` | doc / kb |
| `clause_comparison` | `ComparisonCard` | doc / workspace |
| `case_law_analysis` | `CaseBriefCard` | doc / kb |
| `legal_research` | `ResearchBriefCard` | kb (always) |
| `risk_assessment` | `RiskMemoCard` | doc |
| `clause_analysis` | `ClauseAnalysisCard` | doc |
| `timeline_extraction` | `TimelineCard` | doc |

Plus the 8th card intent which is **client-only** (no Edge round-trip):

| Intent | Card | Notes |
|---|---|---|
| `find_document` | `FileResultsCard` | Pure local vault filter, short-circuits in `ChatView.sendMessage` before fetch. |

`legal_qa` is deliberately NOT card-ified — Q&A stays as prose.

### 3.3 System prompt structure (Edge `api/chat.ts`)

The default system prompt has four conceptual sections:

1. **IN SCOPE — ANSWER NORMALLY** — long enumeration: law, statutes, FRCP/FRE/etc., case law, contracts, compliance, litigation, ethics, jurisdictional. Bias: "When in doubt, ANSWER."
2. **OUT OF SCOPE — REFUSE ONLY THESE** — narrow list: celebrity trivia, sports, entertainment, cooking, weather, dating, medical, travel, casual chit-chat. Refusal copy: *"I'm a legal assistant and can only help with legal matters. Is there a contract, regulation, or case I can help you with?"*
3. **MISSING DOCUMENT HANDLING** — added 2026-04-25. When user asks for review/summarise/compare/analyse/extract clauses/timeline/risk memo BUT no doc content appears anywhere → reply with a short upload-prompt that echoes the user's task back, ≤50 words. Prevents off-topic refusal on legitimate analysis requests.
4. **General accuracy guardrail** — concise, accurate, cite jurisdictions, never fabricate case names / statute numbers / regulatory citations.

When a card intent is active, an ADDITIONAL system message gets `unshift`ed with the JSON-only schema instruction. Combined with `response_format: json_object` on the OpenAI call, this guarantees parseable JSON output.

### 3.4 Anti-hallucination guardrails

- Edge prompt: "never fabricate case names, statute numbers, or regulatory citations."
- Workflow prompt base rules: "Never fabricate facts, citations, case names, statute numbers, regulatory sections, or clauses that aren't explicitly in the supplied documents or prior step outputs."
- **Vague-doc protocol** — every workflow operation prompt contains the LITERAL sentence: *"Not covered by supplied documents."* (with a leading `**` bold marker in the prompt). When the docs don't contain what the step needs, output MUST begin with that exact sentence + a one-sentence reason, then partial analysis. **QA tests check for the literal string — don't rephrase.**

### 3.5 Edge function flow per request (UI shape)

1. Read JSON body. Reject 400 with shape diagnostics if neither `messages[]` (legacy) nor `message` (UI) is present.
2. Build system message — either body.system (override) or the 4-section default.
3. Filter `body.history` to valid role/content shapes, append.
4. Push the user message.
5. If `body.intent` is a card-intent key in `CARD_SCHEMAS`, unshift the JSON-only schema instruction.
6. POST to `https://api.openai.com/v1/chat/completions` with `model: 'gpt-4o-mini'`, `temperature: 0.7` (default), `max_tokens: 2048` (default), `stream: true`, optional `response_format: { type: 'json_object' }` when card intent active.
7. Translate OpenAI SSE → plain text chunks. SSE frame separator is `\n\n`. Skip `[DONE]`.
8. On non-2xx upstream, friendly error mapping: rate-limit → busy, 401 → unavailable, context-length → too-long, model-not-found → unavailable, network/timeout → too-long.
9. Response headers include `X-Source-Type: AI_GENERATED` (used by client SourceBadge logic).

### 3.6 Card empty-state pattern (CRITICAL)

`response_format: json_object` forces the LLM to return JSON even when the user supplied no document. Result: a schema-shaped envelope with empty strings, empty arrays, zero counts. Without detection, cards render a grid of `—` dashes — chat reads as broken.

**Detection rule (uniform across all 7 cards)**:
> All schema-required string fields blank AND no `documentName` AND empty arrays.

When detected, render the card's normal shell with:
- Header retargeted to "No document supplied" / "No documents to compare" / "Not enough to research yet"
- Action paragraph telling user to upload via the **+** button
- Muted hint paragraph pointing to a sibling intent
- Footer with `sourceType="none"` / `sourceName="—"`

Per-card `isEmpty` checks (current as of 2026-04-25):

| Card | Condition |
|---|---|
| `SummaryCard` | `!hasExecSummary && !hasAnyMeta && points.length === 0 && !data?.documentName` |
| `ComparisonCard` | `rows.length === 0 && !data?.doc1Name && !data?.doc2Name && !data?.recommendation` |
| `CaseBriefCard` | `rows.length === 0 && !hasPrecedence && !data?.caseName && !data?.application` |
| `ResearchBriefCard` | `sections.length === 0 && !data?.topic` |
| `RiskMemoCard` | `findings.length === 0 && !data?.matterName?.trim() && !data?.executiveSummary?.trim() && !data?.documentName?.trim()` |
| `ClauseAnalysisCard` | `clauses.length === 0 && !data?.matterName?.trim() && !data?.documentName?.trim()` |
| `TimelineCard` | `events.length === 0 && !data?.matterName?.trim() && !data?.documentName?.trim()` |

`ResearchBriefCard` is the odd one out — KB-backed, so its empty state is "your question was too vague" with a worked example query, not "upload a document".

`Array.isArray()` guards on `findings` / `clauses` / `events` are mandatory on the 3 EditorialShell cards. Without them, undefined arrays from the LLM crash the render.

### 3.7 Additive uploads + doc-inlining pipeline (2026-04-27)

The old "one upload per chat" rule (DEC-095 Option C) is GONE. Current pipeline:

1. New uploads APPEND to `sessionDocContext` rather than replace.
2. Each new doc gets labelled `Document N (added HH:MM): filename` in the system prompt so the model can disambiguate originally-uploaded vs added-mid-thread.
3. Inline thread note appears: *"Added contract.pdf · Document 3 — New topic? Start fresh →"*. The "Start fresh" link dispatches `yourai:start-new-chat` window event; ChatView listens at top level → calls `handleNewThread`.
4. **Doc content MUST be stitched INTO the message body** — Edge only sees `body.message` + `body.history` + `intent`. Side channels (`contextLayers`) don't reach the Edge. Pipeline builds:
   ```
   [Documents attached to this conversation]
   <stitched content>

   [User question]
   <trimmed user message>
   ```
   Sources stitched in: `pendingAttachments` (real uploads), `sessionDocContext` (continuing thread), `activeVaultDocument` (Use clicked — uses the `content` field; falls back to `description` for user-created docs without content), `activeVaultFolder` (folder attached, concatenates each child's content, capped per-doc).
5. Edge cases: extraction in-flight = placeholder line acknowledging file by name; empty trimmed text = substitutes a default review question so the Edge's `body.message.trim()` length-guard passes.

**Symptom of regressing**: bot says "I'd be glad to review that document. Upload using the + button…" even though a doc is visibly attached.

### 3.8 The new `find_document` intent (2026-04-28 MVP)

Client-only — no LLM round-trip. ChatView's `sendMessage` short-circuits before the `/api/chat` fetch when active intent is `find_document`. Detection is two-layer:

1. Explicit "Find Document" pill in the intent dropdown.
2. Keyword auto-switch from `general_chat` (verb anchor: find / search / where is / do I have / show me / list; noun anchor: file/files/doc/docs/document/documents).

Trigger-word stripping in `stripFindDocTriggers()` removes the verb prefix, articles, noun anchors, and trailing vault-context phrases ("from my document vault" → consumed before "from my vault"). So:

- `"find Series B term sheet from my document vault"` → searches for `"series b term sheet"`.
- `"do i have any docs about acme?"` → searches for `"acme"` (trailing `?` stripped first).
- `"where's my MSA"` → searches for `"msa"`.

Filter checks `name + description + fileName + folderPath` (NOT content — yet). Returns top 5 + total count. `FileResultsCard` renders state-aware variants:

- Empty vault → "Your vault is empty"
- Empty query (after stripping) → "What file are you looking for?"
- 0 matches → "No files match"
- 1 result → single prominent row
- 2-5 results → all rows, each with Use
- &gt;5 results → top 5 + "View all N in Vault →" footer

Row Use button dispatches `yourai:vault-use-doc` window event; ChatView listens and routes through existing `handleSelectVaultDocument`.

---

## 4. Workflows system

### 4.1 Three-file architecture

```
src/lib/workflowPrompts.ts   ← per-operation system prompts + buildStepMessages()
src/lib/workflowExecutor.ts  ← POSTs to /api/chat, streams back
src/lib/workflowRunner.ts    ← orchestrator: iterates steps, handles cancel/retry, persists runs
```

`workflowRunner` is a module-level singleton that survives component unmount via subscribe/unsubscribe — runs continue if the user navigates away. Persists to `yourai_workflow_runs_v1`.

### 4.2 The 6 operations (NOT 7)

Defined in `WorkflowOperation` union (`src/lib/workflow.ts`) — `read_documents`, `analyse_clauses`, `compare_against_standard`, `research_precedents`, `compliance_check`, `generate_report`. Some FRDs reference 7 (counting `update_knowledge_base`); that operation is FRD-level conceptual and not yet implemented in code. Don't write tests against `update_knowledge_base` outputs.

`OPERATIONS_IN_ORDER` reorders for UI display: read → analyse → compare → research → compliance → report.

### 4.3 Per-step flow

1. Runner calls `executeWorkflowStep(input)` with run state, template step, step index, workspace name.
2. Source label resolved by priority: `uploaded_doc` &gt; `reference_doc` &gt; `workspace_kb` &gt; `global_kb`.
3. Prior-step outputs collected from completed earlier steps (capped at ~3500 chars each).
4. `buildStepMessages` produces `[systemPrompt, userMessage]`:
   - System: operation-specific prompt + shared anti-hallucination block.
   - User: step metadata + user instruction + prior outputs + uploaded docs (capped ~8000 chars each) + optional reference doc (capped ~6000 chars) + workspace context.
5. POST to `/api/chat` with `{messages, model: 'gpt-4o-mini', temperature: 0.35, max_tokens: 1800}`. 90s timeout via `AbortController`.
6. Read `ReadableStream`, accumulate chunks, **trailing decoder.decode() flush** at end.
7. Return `{output, source, usedFallback}` to the runner.

### 4.4 Prior-step chaining

Step N receives a structured summary of steps 1..N−1. The Generate Report step is a SYNTHESIS (not a re-analysis) — it operates on prior outputs, not the raw documents.

### 4.5 Vague-doc protocol (verbatim)

Every operation prompt contains:

> "If the supplied documents don't cover what this step asks for, begin your response with: **\"Not covered by supplied documents.\"** followed by a one-sentence reason, then provide whatever partial analysis IS possible from what WAS supplied."

QA tests should check for the LITERAL `"Not covered by supplied documents."` sentence.

### 4.6 Pre-flight classification (Stage 1 of FRD_Incorrect_Document_Handling)

`workflowExecutor.classifyDocs()` is wired into `PreRunModal` since 2026-04-24. Auto-fires once all uploads reach Ready. Per-row uppercase chip ("NDA", "CONTRACT", "LEASE") + summary banner ("Identified: 2 contracts, 1 memo"). Advisory only — never blocks Run. Silently returns `[]` on failure so offline/demo mode is unaffected.

---

## 5. Frontend components

### 5.1 Sidebar (`src/components/Sidebar.jsx`)

Header is just the YourAI wordmark. Sections (top to bottom):

- **Workspace**: Home (top), Chat, Workspaces, Clients (Org Admin), Invite Team (all non-External).
- **Knowledge**: Document Vault, Knowledge Packs, Workflows, Prompt Templates.
- **Admin**: Audit Logs, Billing (Org Admin).
- **Recent Chats** at bottom with dimmed search glyph.

Top-level Search Chats input drives thread search. New Chat = navy-filled CTA with ⌘N badge. Active state is dynamic (`sidebarActiveKey`) — full-page panels (Vault / Packs / Workflows / Workspaces / Team / Prompts / Clients) take precedence over the underlying chat / home.

### 5.2 Tile-based home `/chat/home` (HomeTileLauncher)

NOT a separate component file — lives inside `ChatView.jsx` and renders when `initialView === 'home'`. Login default for non-externals. Six role-aware tiles: General Chat, Workspaces, Document Vault, Workflows, Knowledge Packs, Invite Team. Hero: gold sparkle eyebrow + DM Serif H1 ("Hi {name}, what would you like to do?").

Tile chrome (Aashna review 2026-04-27): page surface `#F4F5F7`, card border 1.5px `#DCE0E6`, etched static box-shadow, accent stripe 2px @ 0.55 opacity that saturates on hover. Hover lifts shadow depth (no border-colour swap — that read as "selected").

### 5.3 Workspaces panel

`WorkspacesPanel.jsx` — full-page panel (was modal). Reverted from "Case Workspaces" rename on 2026-04-28; tile description softened to "per-matter workspaces" instead. WorkspaceChatView at `/chat/workspaces/:id` is the per-workspace chat surface.

### 5.4 Document Vault — full-page two-pane redesign (2026-04-27)

- **Left rail (280px)**: LIBRARY eyebrow → "All documents" pinned row → FOLDERS eyebrow → recursive folder tree with chevron expand/collapse, 16px depth indent. Auto-expands ancestors of the active folder. Sticky "+ New folder" footer.
- **Main area**: hero (eyebrow VAULT + DM Serif H1 = current folder name, caption walks parent breadcrumb) → sticky 56px toolbar → subfolder chip strip → documents table (6 cols at root, 5 inside a folder).
- **Toolbar search input** is now the dual-purpose Search + Ask-anything bar — gold sparkle icon, plain typing → live substring filter, Enter / "Ask ✨" button → LLM-backed NL parser.
- **Filter chips** under hero: Date · Uploaded by · Type · Sort. "Clear filters" pill when any is non-default. "Top N" pill when parser set a `limit`.
- **Search currently checks `name + description + fileName` only — NOT content.** `d.content` is bundled but not in the filter (1-line change deferred).
- **Transient vs sticky filters**: `resultLimit`, `askExplanation`, `sortBy` clear on user typing or All-documents click. Date / uploader / type chips stay set (deliberate user choice).
- Owner pills, "from chat" badges, Edit / Delete / Share-org-wide collapsed into a row-hover kebab menu.
- **Nested folders** via `VaultFolder.parentId`. Default seed: `Contracts › Acme Corp › MSA & Schedules`.
- **Recursive folder upload**: "Upload folder" button uses `webkitdirectory`. Walks `webkitRelativePath`, recreates the tree, dedupes by name+parent.

### 5.5 Knowledge Packs — full-page redesign (2026-04-27)

Same outer shell as Vault but body is a card grid. PackRow flipped horizontal → vertical: header (icon + title + ownership pill + kebab) → 2-line description clamp → footer (counts + share-org-wide toggle + Use). "BY OWNER" facet moved to a toolbar dropdown chip. Edit / Delete in row-hover kebab.

### 5.6 Workflow surfaces

- **Picker** (`WorkflowsPanel.tsx`): single unified grid (no Featured/Library split, no maxWidth cap), `repeat(auto-fill, minmax(340px, 1fr))`. AI PIPELINES eyebrow + DM Serif title + outlined Running-in pill. Underline-active filter tabs with count chips. Card chrome: 3px coloured top stripe, 32×32 icon tile, theme-tinted practice-area eyebrow, `Clock · N steps · ~Xs` pill, PIPELINE op-icon row + `+N more` overflow.
- **Builder** (`WorkflowBuilder.tsx`): centred hero on warm-lilac gradient + DM Serif 34 title + two-step pill indicator. Body in 720px white rounded panel. CTAs in panel footer. Single-column details fields. Step card has navy-filled numbered circle, drag-handle when &gt;1 step, separated Step name + Document type instructions inputs, Advanced options pill toggle, warm-beige reference-doc inset.
- **Pre-Run Modal** (`PreRunModal.tsx`): workflow + practice area chip + steps/duration row. Knowledge source banner. Yellow sibling warning when workspace has no docs. Upload dropzone + drag/click. **Pre-flight classification banner** since 2026-04-24 (per-row type chip + "Identified: 2 contracts, 1 memo").
- **Run Panel** (`WorkflowRunPanel.tsx`): 480px right-docked, flat white. `variant="embedded"` on `WorkflowProgressCard` collapses double-card nesting. 3px accent left border + 3px progress ruler. Fullscreen toggle with 880px content column.
- **Report Card** (`WorkflowReportCard.tsx`): document-style — no outer border, no accent stripe, 760px centred column. Eyebrow + DM Serif 30px title + meta caption. Executive Summary as editorial prose. Footer: Generated &lt;relative&gt; · View audit log · Download PDF.
- **Audit log modal**: per-step markdown output (collapsible) + Documents analysed pills + Retry for failed steps.

### 5.7 Intent dropdown + suggestion banners

Empty-state pills + collapsed pill when conversation active. Smart suggestion banners (single + tied-match multi-pick) debounced 600ms as user types. Mid-thread intent switch is seamless — no "start fresh conversation" interrupt (DEC-093 retired).

### 5.8 Intent cards (8 total)

In `src/components/chat/cards/`. **In flight as of 2026-04-28**: another agent is migrating the older 4 (Summary / Comparison / CaseBrief / Research) from `CardShell` to `EditorialShell`. The newer 3 (Risk / Clause / Timeline) are already on EditorialShell. The 8th (`FileResultsCard`) uses CardShell.

| Card | Shell | Source pill | Notes |
|---|---|---|---|
| `SummaryCard` | CardShell | doc/kb | In-flight migration to EditorialShell |
| `ComparisonCard` | CardShell | doc/workspace | In-flight |
| `CaseBriefCard` | CardShell | doc/kb | In-flight |
| `ResearchBriefCard` | CardShell | kb | In-flight; KB-backed empty state different |
| `RiskMemoCard` | EditorialShell | doc | Already migrated |
| `ClauseAnalysisCard` | EditorialShell | doc | Already migrated |
| `TimelineCard` | EditorialShell | doc | Already migrated |
| `FileResultsCard` | CardShell | local | Client-only; teal accent |

**Don't pin specific line refs in the cards/ folder until the migration settles.** The architecture description here is canonical, the per-card line numbers are not.

### 5.9 ChatView (`src/pages/chatbot/ChatView.jsx`) — 6178 lines

Single monster component. Grep ruthlessly. Approximate sections (line refs may shift):

- ~217–305 — DEFAULT_DOCUMENT_VAULT + DEFAULT_DOCUMENT_VAULT_FOLDERS (seed)
- ~3450–3470 — card dispatch in MessageBubble render
- ~3990 — vault seeding on mount
- ~4220 — yourai:vault-use-doc / yourai:vault-browse window listeners (FileResultsCard)
- ~4326 — `/demo-*` slash command map
- ~4359–4512 — find_document short-circuit + trigger-word stripping
- ~4525 — auto-switch from general_chat
- ~4555 — doc-inlining into messageForEdge
- ~4670 — fetch /api/chat
- ~5103 — handleSelectVaultDocument
- ~6149 — DocumentVaultPanel onSelect
- HomeTileLauncher renders inside this same component when `initialView === 'home'`.
- DocumentVaultPanel renders inside the same file (not extracted).

---

## 6. Critical user flows

These are the top journeys that MUST always work. They form the core sanity-check pass.

1. **Login → home**: log in as INTERNAL_USER → land on `/chat/home` → see 6 role-aware tiles, sidebar Home highlighted, top-bar wordmark + doc counter + Main Site link visible.
2. **Ask a card-intent question with a vault doc attached**:
   - Open Vault, click "Use" on Acme MSA.
   - Switch active intent to Risk Assessment (or let auto-switch fire).
   - Ask "what's the indemnification cap in this contract?" → expect RiskMemoCard with finding citing §7.1 + 12-month-fees language.
3. **Run a workflow end-to-end**:
   - Sidebar → Workflows → pick a template (e.g. "Contract review pipeline").
   - PreRunModal: drag in MSA + Schedule A → wait for Ready + classification chips → Run.
   - Run Panel slides in from right; steps stream in sequence; final Report card renders document-style.
   - Audit log + Download PDF both work.
4. **Vault upload + folder navigation**:
   - Open Vault → click into Contracts → Acme Corp → MSA & Schedules. Breadcrumb walks the parent trail.
   - "+ Folder" creates a subfolder; "+ Document" opens upload dialog; "Upload folder" opens directory picker (webkitdirectory).
5. **Find-document inline search**:
   - Type "find Series B term sheet from my document vault" in main chat → FileResultsCard renders 1 row → click Use → vault doc attaches to thread.
6. **Additive mid-thread upload**:
   - In an active thread with one doc attached, drag a second doc into the input → no block; new doc appended; inline note "Added X · Document N — New topic? Start fresh →" appears; clicking the link starts a new chat.
7. **Off-topic refusal**: ask "what's LeBron James's height" → expect the literal one-sentence refusal copy.
8. **Vault Ask-anything**: in Vault toolbar type "biggest file I have" → click Ask ✨ → table narrows to top 1 by size, gold callout shows interpretation, "Top 1" pill in chip row. Click "All documents" → transient filters drop, table returns to full set.

---

## 7. Demo-critical surfaces

What the team has shown clients and what's in active demo rotation. Extra coverage on these.

### 7.1 What was demoed to Wendy on 2026-04-27

- Onboarding cut to Plan → Payment (P1).
- Invited-user fast path (P2).
- Document Vault with nested folders + recursive upload + UI labels (P3 / P4 / P5).
- Tile-based home `/chat/home` for non-externals.
- Sidebar Home button + dynamic active state.
- Vault + KP full-page redesigns (Aashna review).
- Real PDFs as seed vault docs — Acme MSA, Employee Handbook 2026, Series B Term Sheet, MSA Schedule A.
- Additive uploads with "Start fresh →" escape hatch (P7).
- Doc-inlining fix (file content actually reaches the Edge).

### 7.2 What was demoed today (2026-04-28)

- Find Document MVP — explicit pill + keyword auto-switch + trigger-word stripping + FileResultsCard variants.
- Vault Use bug fix (handleSelectVaultDocument cleaned up).
- TDZ hotfix (just hit today — see gotcha #3 below).
- Trailing-phrase hotfix in `stripFindDocTriggers` ("from my document vault" handled before "from my vault").
- Workspaces revert to plain "Workspaces" name.
- Stale "One attachment per chat" callout removed from chat empty state and onboarding payment-confirm screen.
- Transient-filter clear bug fix in Vault.

### 7.3 Always-client-facing

- The 4 seed PDFs are visible in vault from first load. Bot can analyse them when "Use" is clicked.
- Sample queries that should always work (Wendy demo plan):
  - *"what's the indemnification cap in the Acme MSA?"* → §7.1 with 12-month-fees language.
  - *"summarise the Employee Handbook"* → SummaryCard with PTO / remote / conduct sections.
  - *"key dates in the Series B term sheet"* → TimelineCard with closing / liquidation / conversion events.

### 7.4 SA Bot Persona (limbo)

Tab still exists in the SA portal but the prod chat does NOT use the SA-edited prompts. The "Message Routing Flow" + "Per-Persona Response Format" wireframe blocks were stripped 2026-04-26/27 to keep the panel honest. If a SA user changes the persona and tests in prod, expect no behavioural change — they need to test in the local dev env with `VITE_OPENAI_API_KEY` set.

---

## 8. Known fragile areas

### 8.1 The 4000+ line `ChatView.jsx`

6178 lines as of today. Grep ruthlessly. Don't whole-file Read. Touching state-management or the send-pipeline order risks regressing find_document, doc-inlining, additive uploads, or the suggestion banner debounce.

### 8.2 Missing-icon-import production-blank trap (gotcha #3)

Missing lucide-react import = `ReferenceError` at render time, blanks the whole app. TS doesn't check JSX symbol scope, build passes. Past incidents: `listRuns`, `ArrowRight`, `User` (KP page). Smoke test: headless Chrome + `--enable-logging=stderr` to catch ReferenceErrors after deploy.

### 8.3 TDZ in useEffect deps (just hit today)

Reference an as-yet-undeclared `const` inside a `useEffect` deps array → ReferenceError thrown at render time before the const is initialised. Hot today, fixed in a hotfix commit. Watch for it whenever shuffling effects around large component bodies.

### 8.4 3 sources of truth for intents (gotcha #6)

`intents.ts` + `intentDetector.ts` + `GlobalKnowledgeBase.jsx DEFAULT_INTENTS`. Drift accumulates silently — a new intent in `intents.ts` won't auto-switch without keywords in `intentDetector.ts`, won't show up in SA persona editor without `DEFAULT_INTENTS`. **Update all three when adding/changing.** Backlog item #12 in PROGRESS.

### 8.5 Vercel preview 401 vs prod 200 (gotcha #21)

Preview-branch URLs (`*-claude-great-banach.vercel.app`) return 401 with `{"error":"Not authenticated"}` JSON. Production URL (`https://yourai-black.vercel.app`) is unprotected. If a tester reports "AI service returned 401. Not authenticated" — first thing to check is whether they're on a preview URL.

### 8.6 `fpdf2.multi_cell()` cursor x-position trap (gotcha #22)

After `pdf.multi_cell(0, h, line)`, cursor x sits at the right margin. The next `multi_cell(0, h, line)` reads `w=0` as "remaining width from current x" = 0 → throws "Not enough horizontal space to render a single character". Fix: `pdf.set_x(pdf.l_margin); pdf.multi_cell(pdf.epw, h, line)` before each call. Relevant only if anyone re-runs `/tmp/gen-sample-pdfs.py`.

### 8.7 Mac screenshot U+202F char (gotcha #18)

Mac screenshot filenames sometimes contain U+202F (narrow no-break space) instead of ASCII space between minute digits and "PM". `ls` shows them but `cp` / `Read` fail. Workaround: copy via shell glob or `tr -d $'\xe2\x80\xaf'`.

### 8.8 Streaming-decoder trailing-flush requirement (gotcha #19)

After the `while (true) { reader.read() }` loop ends, call `decoder.decode()` once more to flush partial multibyte UTF-8 at chunk boundaries. All four streaming consumers (`workflowExecutor`, `ChatView`, `WorkspaceChatView`, `classifyDocs`) do this — match the pattern when adding a new one. Symptom: dropped final byte of a multibyte char visible as broken glyph at the end of streamed responses.

### 8.9 CSS grid `auto-fill` ghost columns (gotcha #10)

`repeat(auto-fill, minmax(300px, 1fr))` at 1440px viewport with only 2 cards leaves a ~40% blank band on the right. For sections that often render few items, use `auto-fit` (collapses empty tracks) or cap `maxWidth` on the container. Workflows picker hit this; uses `auto-fill` deliberately at `minmax(340px, 1fr)` with no cap because aashna's design wants the grid to always feel populated at 3-across.

### 8.10 DM Serif decorative-only rule (gotcha #12)

DM Serif Display is decorative — reserve for hero titles and section headers. NEVER use for live status strings or dynamic counts ("2 running · 3 recent") — those should be DM Sans. Run Panel header once broke this rule and read as decorative when it needed to read as data.

### 8.11 Same-component route reuse (gotcha #20)

`/chat/home` and `/chat/workspaces` both render `<ChatView>` with different `initialView` props. The component instance is REUSED — state initialised from `useState(initialView === 'workspaces')` does NOT re-init on the new prop. Fix: handlers that route between same-component routes must `setShowXxxPanel(true)` explicitly before navigating.

### 8.12 Vestigial `credentials: 'include'` (gotcha #17)

Drop it on any `fetch('/api/chat', …)` call. Same-origin, doesn't read cookies, was a known source of edge-cache weirdness.

### 8.13 `closeAllPanels()` mutual-exclusion helper (gotcha — listed in conventions)

Every Sidebar + HomeTileLauncher open-handler MUST call `closeAllPanels()` before setting its target flag — otherwise two full-page panels render side-by-side as flex peers. Real bug seen 2026-04-27.

### 8.14 Empty-state anchor via padding-top, not flexbox (gotcha #11)

Container with `flex: 1; justify-content: center` produces huge dead zones. Use `padding-top: 14vh` inside a fixed max-width centred column. Pattern ships on the chat empty state.

---

## 9. Test infrastructure

**There is NONE automated.** No Jest, Vitest, Playwright, Cypress, headless browser config in package.json. No `tests/` or `__tests__/` directory.

QA reference is `YourAI-Test-Suite.md` (627 lines, dated 2026-04-14) — a manual test-spec document with intent-by-intent and module-by-module scenarios.

**Implications for me as Himanshu**:

- DEEP testing means walking the suite manually, looking at code paths, generating new prompts, and producing observed-vs-expected reports — NOT running `npm test`.
- SANITY testing = manual smoke through the critical flows, plus 3-5 representative chat prompts, plus checking dev-server start + key page render via curl + headless Chrome ReferenceError sniffing.
- I CANNOT actually fire `/api/chat` requests from this agent — no headless browser, no dev server here. I can only read code and validate the prompts in the regression set against what the code claims to do. Real exec must be by Arjun in the prod browser.
- Build / type checking via `npm run build` IS available if needed — but the project ships .jsx that bypasses TS, so a green build doesn't prove anything beyond TS-checked surfaces.

**Smoke pattern after deploy** (gotcha #8): `curl -s <url>` to get bundle hash, then `/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --headless --dump-dom <url>` with `--enable-logging=stderr` to catch ReferenceErrors. This is the existing safety net.

---

## 10. Test data / fixtures

### 10.1 Sample vault content (`src/data/sampleVaultContent.ts`)

4 seed docs with realistic legal text, keyed by `id` matching `DEFAULT_DOCUMENT_VAULT`:

- **id `1`** — `MSA_Acme_Corp_v4.pdf` — full Master Services Agreement. Has §6 indemnification, §7 limitation of liability (cap = 12 months of fees), §7.3 IP indemnity uncapped flag, §3 termination, §4 confidentiality, §11 governing law (NY). 2.4 MB.
- **id `2`** — `Employee_Handbook_2026.pdf` — current handbook with PTO, remote work, conduct policies. 3.8 MB.
- **id `3`** — `SeriesB_TermSheet_Signed.pdf` — executed term sheet for Series B financing with Ridgeline Ventures. 0.6 MB.
- **id `4`** (nested) — `MSA_Acme_ScheduleA_SLAs.pdf` — schedule A SLAs, lives under Contracts › Acme Corp › MSA & Schedules.

### 10.2 Real PDFs (`public/sample-docs/`)

Generated from `sampleVaultContent.ts` via `/tmp/gen-sample-pdfs.py` (uses `fpdf2` — `python3 -m pip install --user fpdf2`). When sample text changes, re-run the script. Vite copies `public/` into `dist/` automatically.

### 10.3 Default seed in `ChatView.jsx`

`DEFAULT_DOCUMENT_VAULT` (~line 217) — array of vault doc objects with `id`, `name`, `description`, `fileName`, `fileSize`, `createdAt`, `ownerId`, `ownerName`, `isGlobal`, `folderId`, `content` (from sampleVaultContent), `sampleUrl`. `DEFAULT_DOCUMENT_VAULT_FOLDERS` (~line 273) — folder seed including the nested `Contracts › Acme Corp › MSA & Schedules` chain.

### 10.4 LocalStorage seed key

- Vault docs: `yourai_document_vault_v2` (bumped 2026-04-27 to force re-seed with `content` and `sampleUrl`).
- Vault folders: `yourai_document_vault_folders_v1`.
- Workflow runs: `yourai_workflow_runs_v1`.
- Workflow templates: `yourai_workflow_templates_v1`.
- Workflow active run: `yourai_workflow_active_run_v1`.
- Workflow favourites: `yourai_workflow_favourites_v1`.
- Workspace threads: `yourai_ws_threads_v2`.
- Workspaces: `yourai_ws_workspaces_v2`.
- Bot persona (SA): `yourai_bot_persona`.

### 10.5 Mock card data

`src/lib/mockCardData.ts` — used by the `/demo-*` slash commands in chat (`/demo-summary`, `/demo-comparison`, `/demo-casebrief` / `/demo-brief`, `/demo-research`, `/demo-risk`, `/demo-clauses`, `/demo-timeline`). Fires fully-populated cards locally without an LLM round-trip — useful for smoke-testing card render without burning API quota.

---

## 11. External dependencies

- **OpenAI Chat Completions API** — single critical external call. Model: `gpt-4o-mini`. Reached via the Edge function (`api/chat.ts`). All chat + workflow execution depends on this.
- **Cognito** — planned, not wired. Auth is currently localStorage-backed mock.
- **S3** — planned, not wired. Uploads currently go into in-memory + localStorage state.
- **CourtListener** — `src/lib/courtlistener.ts` exists but I haven't traced whether prod uses it actively (low priority for QA today).
- **Vercel** — hosts deploy + serves the Edge function. Production Vercel pulls from `yourai/main`. Preview deploys are protected with 401 (gotcha #21).

---

## 12. Recent commit history worth knowing

### 2026-04-27 mega-day

Six commits ahead of `yourai/main` at peak. Aggregate scope across the day: P1 (onboarding cut), P2 (invited fast path), P3 (nested folders), P4 (recursive folder upload), P5 (UI label cleanup), P7 (additive uploads + doc-inlining), Aashna full-page redesigns of Vault + KP, sample PDFs as real seed docs, `closeAllPanels()` helper, tile home `/chat/home`, sidebar Home button + dynamic active state + Dashboard→Chat rename, onboarding restructure. Bundle hash on prod after merge: `index-Bk1nY4mu.js`.

### 2026-04-28

Workspaces revert (Case Workspaces → Workspaces). Stale "One attachment per chat" callout removed (chat empty state + onboarding payment-confirm). Vault transient-filter persistent bug fix. Find Document MVP shipped (intent + keyword auto-switch + FileResultsCard + trigger-word stripping with trailing-phrase support). Vault Use bug fix. TDZ hotfix. Trailing-phrase hotfix. Bundle hash on prod: `index-DySlL7FR.js`.

### Merge-to-main ritual

```
git fetch yourai main
git checkout -B tmp yourai/main
git merge --no-ff claude/great-banach
git push yourai tmp:main
```

Production URL: `https://yourai-black.vercel.app`.

---

## 13. Storage keys (full inventory)

All `yourai_*` prefixed, with `_v1` / `_v2` suffixes to dodge collisions with prior iterations. Bumping the suffix forces re-seed for users with stale entries.

```
yourai_active_*          (active intent / KP / vault doc state)
yourai_bot_persona
yourai_courtlistener_*
yourai_current_*
yourai_document_vault_v2          ← bumped 2026-04-27
yourai_document_vault_folders_v1
yourai_mgmt_*
yourai_my_session_*
yourai_registered_*
yourai_sidebar_knowledge_*
yourai_sidebar_workspace_*
yourai_user_*
yourai_workflow_active_run_v1
yourai_workflow_favourites_v1
yourai_workflow_runs_v1
yourai_workflow_templates_v1
yourai_ws_threads_v2
yourai_ws_workspaces_v2
```

Bumping rule: if you add new fields to seed entries that should reach existing testers, bump the version (`_v3`).

---

## 14. Routes (full inventory)

From `src/App.jsx`:

### Tenant chat
- `/chat` — General chat (ChatView, default initialView)
- `/chat/home` — Tile launcher (ChatView with initialView="home"), default for non-externals
- `/chat/workspaces` — Workspaces panel (ChatView with initialView="workspaces"), default for externals
- `/chat/workspaces/:id` — Per-workspace chat (WorkspaceChatView, separate component)
- `/chat/login`, `/chat/signup`, `/chat/forgot-password`, `/chat/reset-password`, `/chat/onboarding`

### Super Admin
- `/super-admin/dashboard`, `/tenants`, `/users`, `/billing`, `/usage`, `/compliance`, `/static-content`, `/integrations`, `/knowledge-base`, `/workflows`, `/notifications`, `/settings`, `/user-stories`, `/bot-tester`, `/frd-generator`
- Auth: `/super-admin/login`, `/verify-otp`, `/forgot-password`, `/reset-password`

### Org Admin
- `/app/dashboard`, `/workspaces`, `/workspaces/:id`, `/vault`, `/workflows`, `/knowledge-packs`, `/clients`, `/messages`, `/users`, `/billing`, `/audit-logs`, `/usage`, `/profile`, `/settings`, `/prompt-templates`, `/reminders`

### Misc
- `/` → redirects to `/super-admin/dashboard`
- `/mock/restructure` — RestructureMock prototype page

---

## 15. In-flight work to be aware of

Per the heads-up at setup time:

- `src/components/chat/cards/*` — another agent is migrating intent cards from `CardShell` to `EditorialShell`. The 4 older cards (Summary / Comparison / CaseBrief / Research) are mid-migration. Treat the cards/ folder architecture as canonical here, but do NOT pin specific line refs that may shift.
- `docs/extracted/intent-cards.md` — being written by the same agent. Do not edit.
- Tail of `CLAUDE.md` and `PROGRESS.md` may be edited too. Read-only here.

If during testing I read a card file and notice an `isEmpty` check that doesn't match what `card-empty-state-pattern.md` describes, flag as "in flight as of 2026-04-28" rather than treating it as a regression.

---

## 16. Open questions / blockers (carry-over from PROGRESS.md)

- Test results from Arjun on the new real-execution workflow path — primary blocker for next iteration of operation prompts.
- Is the Intent management module actually wanted? (Asked in earlier session, then "Stop" before implementation.)
- Backend folder status (`backend/` with Prisma + SQLite): intended, deprecated, or pending wiring?
- Document Vault / Knowledge Pack → workflow step linking — broader "my workspace docs auto-flow to steps that need them" story not yet designed.

---

## 17. Working principles (mine, as Himanshu)

- Skeptical by default. Tests that "look fine" without actually running aren't tests.
- For AI chat, assume the LLM will misbehave. Actively try to break it.
- Don't pad reports. If everything passed, report is short.
- Distinguish "broken" from "ugly." I'm QA, not design.
- Reproduce a bug before reporting it.
- If I can't test something (no dev server, no API key, no headless browser in this agent env), say so explicitly. Never mark "passed" what I didn't verify.
- For prompt regressions: cross-check the actual response against the LITERAL strings the prompts promise (`"Not covered by supplied documents."`, the off-topic refusal copy, the MISSING_DOCUMENT_HANDLING upload-prompt copy).

---

## Last updated

**2026-04-28** — First-time setup. Created from a comprehensive sweep of CLAUDE.md, PROGRESS.md, all `.claude-context/*` files, `api/chat.ts`, `src/lib/intents.ts`, `src/lib/intentDetector.ts`, `src/lib/workflowPrompts.ts`, `src/lib/workflowExecutor.ts`, `src/components/chat/cards/IntentCard.tsx`, `src/components/chat/cards/FileResultsCard.tsx`, `src/data/sampleVaultContent.ts`, `src/App.jsx`, and key sections of `src/pages/chatbot/ChatView.jsx`. Cards folder partially in flight (older 4 mid-migration to EditorialShell).
