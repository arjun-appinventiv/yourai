# PROGRESS.md — YourAI current state

> Living document. Update at the end of each working session. Read at the start of each session.

---

## What's built and working

### Tenant chat (`/chat`)
- Full chat UI with message bubbles, streaming responses, source badges
- Intent dropdown (empty-state pills + collapsed pill when conversation active)
- Auto-switch from `general_chat` to a specific intent on first message (detected via keywords, drops a "Switched to X mode" system note)
- Smart suggestion banners (single + tied-match multi-pick) debounced 600ms as user types
- Mid-thread intent switch is seamless — no "start fresh conversation" interruption
- 7 intent response cards (SummaryCard, ComparisonCard, CaseBriefCard, ResearchBriefCard, RiskMemoCard, ClauseAnalysisCard, TimelineCard) with unified editorial shell (`src/components/chat/cards/EditorialShell.tsx`)
- Demo slash commands: `/demo-summary`, `/demo-comparison`, `/demo-brief`, `/demo-research`, `/demo-risk`, `/demo-clauses`, `/demo-timeline`
- Edge function at `api/chat.ts` forces JSON via `response_format: json_object` when intent is a card intent; falls back to markdown if JSON parse fails
- Off-topic guardrail calibrated to default to answering legitimate legal questions

### Chat empty state (2026-04-24 pass)
- Content anchored via `padding-top: 14vh` inside an 880px max-width centred column — no flexbox centering (earlier attempt produced large dead zones)
- Compact hero as a tight unit: 36px gold sparkle → DM Serif heading → subtitle
- 3 prompt cards with gold-tinted 36px icon circles, 2-line description clamp, hover = border shift + translateY(-1px) + soft shadow
- Favourites row: uppercase `⚡ FAVOURITES` label + chips + `View all N →` on one line (hidden when 0 favourites)
- "One attachment per chat" restored as a compact gold-accent info strip (bolded title inline with explanation)
- Intent pills attach to the input (8px gap above, 6px below)
- Input placeholder: "Ask anything about your documents or Alaska law…"
- Bottom disclaimer: "YourAI may produce inaccurate information. Always verify critical outputs. Private & encrypted."

### Sidebar (2026-04-24 pass)
- Header: just the YourAI wordmark (green online dot + user-initial avatar removed)
- Top-level Search Chats input drives the thread search state
- New Chat restyled as navy-filled CTA with ⌘N shortcut badge
- Workspace section: Dashboard (Org Admin), Workspaces, Clients (Org Admin), **Invite Team** (all non-External users — widened from Org-Admin-only so the CTA stays discoverable)
- Knowledge section: Document vault, Knowledge packs, Workflows, Prompt templates
- Admin section: Audit Logs, Billing (Org Admin)
- Recent Chats with dimmed search glyph (the top-level Search Chats already covers it)

### Top bar
- Small `YourAI` wordmark on top-left (balances the right side)
- Doc counter + subtle vertical divider + `< Main Site` link grouped together
- Search box on the far right

### Workflows — picker, builder, panel (2026-04-24 aashna-reviewed pass, picker + builder rewritten 2026-04-25 from aashna's chat-mode mockups)
- **Picker (2026-04-25 redesign)**: gold `AI PIPELINES` eyebrow pill + DM Serif title + outlined navy `Running in: Global / Main Site` context pill; right-side StatTiles restacked (uppercase mono label on top, 22px navy value below); filter pills replaced by underline-active tabs with count chip beside each label; rounded-pill search box; **single unified grid** (Featured/Your-Library section split removed) at `repeat(auto-fill, minmax(340px, 1fr))` — no maxWidth cap, naturally reflows from 3 cards across at desktop to 2 / 1 at narrower sizes. Card chrome: practice-area accent restored as a 3px coloured top stripe (Legal=indigo, Compliance=red, Corporate=teal, etc.), 32×32 icon tile, theme-tinted practice-area eyebrow, navy-filled Platform pill, gray-outlined Yours/Your-Org pills, `Clock · N steps · ~Xs` pill, **PIPELINE** section with 28×28 op-icon tiles connected by `→` arrows + `+N more` overflow, 2-line description, `Updated X / Run →` footer. Breadcrumb is `← Dashboard` (was `Back to chat`).
- **Builder (2026-04-25 full rewrite from 8 aashna mockups)**: top bar stripped to `← Workflows` breadcrumb + outlined `Cancel` only; **centered hero** below it on a warm-lilac gradient with DM Serif 34 title (`New Workflow` / `Edit Workflow`), context-aware subtitle (`First, tell us about this workflow.` vs `Now, add the steps this workflow should run.`), and a horizontal two-step pill indicator with a connecting rule — pills are navy-filled (active), gold-ring + check (done), or neutral-outlined (idle/disabled). Body sits in a centered 720px white rounded panel; primary CTAs (`Continue to Pipeline →` / `← Back to details` + `Save workflow`) live inside the panel footer, not the top bar. Section labels (`WORKFLOW DETAILS`, `WORKFLOW STEPS`) are uppercase mono. Details fields single-column: Workflow name with gold `*` + live counter; Practice area; Status (org-admin only) as Active/Draft segmented pill with helper strip; Description with `(N/300) (optional)` muted in label + helper; Visibility radio cards. Step card: navy-filled numbered circle (was gray), drag-handle only when >1 step, op pill on top with `~Xs · <description>` inline, separated Step name and Document type instructions inputs each with their own helper + bottom-right counter, Advanced options is a rounded pill toggle that tints navy when expanded; reference-doc panel is a warm-beige inset with taller navy-filled tabs. Footer strip is a 3-col grid: `Add Step` left · `N / 8 steps` centre · `Estimated total: ~Xs` right.
- **Pre-Run Modal**: workflow name + practice area chip + steps/duration on one header row; knowledge source banner (blue in workspace, neutral in main chat); yellow sibling warning when workspace has no docs; upload dropzone with drag+click; Run enabled once at least one upload is Ready. **Pre-flight classification banner** (since 2026-04-24): per-row uppercase type chip + "Identified: 2 contracts, 1 memo" summary.
- **Run Panel**: 480px right-docked, flat white body (was cream), `variant="embedded"` prop on `WorkflowProgressCard` collapses the double-card nesting (RunRow is now the single card), header hierarchy flipped (dynamic count = eyebrow, static "Workflow runs" = title), 3px accent left border + 3px progress ruler under header; fullscreen toggle with 880px content column
- **Favourites**: per-user ⭐ toggle, stored under `yourai_workflow_favourites_v1`, surfaces top 4 in the chat empty-state launcher

### Workflows — real LLM execution (NEW 2026-04-24)
- **`src/lib/workflowPrompts.ts`** — per-operation system prompts (6 ops: `read_documents`, `analyse_clauses`, `compare_against_standard`, `research_precedents`, `compliance_check`, `generate_report`) + a shared anti-hallucination ruleset + the "Not covered by supplied documents." vague-doc protocol baked into every operation
- **`src/lib/workflowExecutor.ts`** — POSTs each step to `/api/chat` (Edge) with a full `messages[]` payload: operation system prompt + assembled user message (step metadata, user instruction, prior step outputs capped at 3500 chars each, uploaded docs capped at 8000 chars each, optional reference doc, workspace context). Streams the response via `ReadableStream`, 90s timeout with `AbortController`
- **`workflowRunner.ts`** delegates `executeStep()` to the new executor; the broken `callLLM` client-fallback path is gone (it required a browser-side `VITE_OPENAI_API_KEY` that was never set in prod — workflows silently mock-ran before this)
- **Prior-step chaining** — step N sees a structured summary of every completed step 1..N−1 so the Generate Report step gets a real synthesis, not a re-analysis
- **`classifyDocs()`** helper exported for a future pre-flight classification UI (not yet wired into PreRunModal)

### Pre-Run pre-flight document classification (2026-04-24)
- `classifyDocs()` now wired into `PreRunModal` — fires automatically once all uploads reach Ready
- Per-row detected-type chip (uppercase small pill: "NDA", "CONTRACT", "LEASE", etc.) inline under each upload's filename
- Summary banner beneath the upload list: "Identifying document types…" → "**Identified:** 2 contracts, 1 memo"
- Advisory only — never blocks Run. Silently returns `[]` on failure so offline/demo mode is unaffected
- Spec origin: Stage 1 of the `FRD_Incorrect_Document_Handling.docx` three-stage protocol

### Workflow operation prompts — v2 tightening (2026-04-24, blind)
Prompt overhaul in `src/lib/workflowPrompts.ts` BEFORE real test feedback. Principled-defaults pass:
- Base rules gained: "don't restate the instruction", "don't hedge with filler", concrete citation format `[Doc: filename, §X]`, blockquote for top takeaway
- Per-operation word targets (250 / 400–700 / 300–500 depending on op) — gives the LLM a natural stopping point
- `analyse_clauses` → priority-ordered (HIGH first), cap at 15 clauses, require short quote when a phrase drives the risk
- `compare_against_standard` → explicit pipe-syntax table shape, per-cell ≤25 word cap, 5-value Delta whitelist
- `generate_report` → synthesis-not-re-analysis framing, findings vs. actions must be distinct (actions = what to DO)
- `research_precedents` → "no live Westlaw/Lexis access — hedge over fabricate" rule, two-format structure (verified vs. principle-only)
- `compliance_check` → 11-framework whitelist, pipe-syntax control table, "don't cite sections you're not confident about"

### Intent card empty-states (2026-04-25)
All seven intent cards now detect "schema-shaped envelope with no real data" — the artefact of `response_format: json_object` forcing the LLM to return JSON even when the user supplied no document — and render a friendly empty-state in the same shell instead of a grid of `—` dashes / "0 clauses" / "No dated events found".

- **SummaryCard / ComparisonCard / CaseBriefCard / RiskMemoCard / ClauseAnalysisCard / TimelineCard**: empty state says "No document supplied" with a paragraph telling the user to upload via the **+** button + a muted hint pointing to a sibling intent (Risk Memo ↔ Clause Analysis, Legal Research for citation lookups, Case Brief for documents without dates).
- **ResearchBriefCard**: KB-backed, so the empty state asks for a more specific question instead — example query included ("Force majeure precedents in New York commercial leases, 2020–present").
- Hardened `RiskMemoCard` / `ClauseAnalysisCard` / `TimelineCard` with `Array.isArray` guards on their array fields (`findings` / `clauses` / `events`) so a stray `undefined` from the LLM can't blow up the render.

Detection pattern is uniform: **all schema-required fields blank AND no document name AND empty arrays** → render empty state. See [Card empty-state pattern](#card-empty-state-pattern) at the bottom of the conventions section, plus `.claude-context/card-empty-state-pattern.md`.

### Edge: missing-document handling in chat (2026-04-25)
`api/chat.ts` system prompt gained a `MISSING DOCUMENT HANDLING` block. When the user asks for a document-analysis task (Review / Summarise / Compare / Analyse / Timeline / Risk memo) but no document content appears anywhere in the conversation, the assistant now replies with a short upload-prompt that echoes the user's task back ("I'd be glad to review that contract for one-sided provisions… Upload the document using the + button…"), capped at ~50 words. Previously the LLM fell through to the generic off-topic refusal copy ("I'm a legal assistant and can only help with legal matters…"), which read as the bot rejecting a perfectly legitimate request. Pure prompt copy change — no schemas or code paths touched.

### WorkspaceChatView routed through Edge (2026-04-25)
Workspace chats were throwing "Something went wrong reaching the AI" on every message because `WorkspaceChatView.tsx` was still calling `callLLM` (the client-side fallback that needs `VITE_OPENAI_API_KEY`, never set in prod). Same class of bug as the main `ChatView` had on 2026-04-21 — this surface was missed in that fix. Replaced the `callLLM` call with a direct `fetch('/api/chat')` using the same streaming pattern the main chat and `workflowExecutor` already use; any ephemeral / workspace document context is inlined into the user message so the Edge can see it. SourceBadge logic downstream unchanged. **No code path in production now uses `callLLM`** — the file in `src/lib/llm-client.ts` is dead in prod and only hangs on for hypothetical dev environments that set `VITE_OPENAI_API_KEY` deliberately.

### ChatView error surfacing (2026-04-25)
The main `ChatView` fetch was wrapped in a silent try/catch that funnelled every Edge failure into a "client-side Groq fallback" path, which always failed in prod (no `VITE_OPENAI_API_KEY`) and showed the misleading "No LLM backend available. Please configure the API key…" copy regardless of what actually went wrong. Now:
- Captures the actual reason (non-2xx status + body excerpt, empty body, network error, AbortError) in an `edgeError` string.
- Shows that captured reason as the bot's error message ("AI service returned 503…", "Could not reach the AI service: <real JS error>…") instead of the misleading fallback line.
- Distinguishes `AbortError` (silent — user-initiated, e.g. session-guard timeout) from real network errors.
- Logs a `[ChatView] /api/chat fetch failed: <err>` line to DevTools console for debugging.
- Trailing decoder flush added so multibyte UTF-8 boundaries at chunk edges no longer drop characters.
- Dropped vestigial `credentials: 'include'` flag — request is same-origin, doesn't need cookies, and the flag was a known source of edge-cache weirdness.

### Workflow Report card (Option D — 2026-04-24)
- Document-style render: no outer border, no accent stripe, 760px centred column
- Eyebrow: `WORKFLOW REPORT · <practice area> · <date>` mono uppercase muted
- Title: DM Serif 30px
- Meta caption: knowledge source · doc count · optional partial-failure note · runtime
- Partial-failure gentle warning when any uploads failed to parse
- Executive Summary as editorial prose (DM Serif headings, DM Sans body, gold-rail blockquotes)
- Footer: Generated <relative> on left, `View audit log` (ghost) + `Download PDF` (outlined navy) on right
- **Audit log modal** holds the per-step markdown output (collapsible) + Documents analysed pills + Retry for failed steps
- **Download PDF** opens a clean printable HTML window (browser's native Save-as-PDF)

### Knowledge & Document surfaces
- Knowledge Packs panel (create, edit, delete, select as active for chat)
- Document Vault panel (upload, select as active, role-scoped visibility)
- Both are **independent** of intent — no auto-attach on intent change

### Super Admin portal
- Tenant Management, User Management, Global Knowledge Base (with Bot Persona tab), Workflow Templates, Billing, Usage, Compliance, Static Content, Report Templates, Knowledge Base, Integrations, Notifications, Reports, Settings, User Stories (15 screens per README)
- Bot Persona editor: 12 operation templates, editable system/tone prompts, keyword lists (≤20 per op), enable/disable toggle, ON/OFF pill

### Auth
- Login, signup, forgot-password, OTP, reset-password flows
- Role-aware redirects (external users → workspaces, others → `/chat`)

### FRDs on Desktop + `docs/extracted/`
- `FRD_Tenant_Management.docx` — original module (Arjun's reference)
- `FRD_Intent_System.docx` — chat intents end-to-end (2026-04-23)
- `FRD_Workflows.docx` — Workflows module surfaces (8 features + 75 QA test scenarios)
- `FRD_Workflow_Operations.docx` — the 7 operations, including Update Knowledge Base (engineering/behaviour behind each, for PMs and QA)
- `FRD_Incorrect_Document_Handling.docx` — 9-category taxonomy of mismatched uploads + three-stage protocol (Pre-Run → per-step → Report) + 9 worked scenarios + 30 QA tests

### Sub-agents
- `.claude/agents/aashna.md` — senior UX designer persona (Linear / Stripe / Vercel background) used for layout / hierarchy / spacing audits. Output format = diagnosis + prioritized fixes + paste-ready Claude Code implementation prompt. Invoked via the general-purpose agent this session; direct invocation after a Claude Code reload.

---

## What's currently in progress

*(Arjun is test-driving — picker, builder, chat, and workspace surfaces. Feedback incoming.)*

- **Workflow execution live in prod** — as of 2026-04-24 every step really calls OpenAI via `/api/chat`. Operation prompts received an initial principled tightening on 2026-04-24 (word targets, table syntax, citation hedging, findings/actions distinctness). A second, test-output-driven tightening is still pending Arjun's real-workflow feedback.
- **Workflows picker + builder UX** redesigned 2026-04-25 from aashna's chat-mode mockup PDFs. Live in prod. Awaiting any further round-by-round feedback.
- **Card empty-states** (all 7 intent cards) and the Edge `MISSING DOCUMENT HANDLING` branch shipped together 2026-04-25 to fix the "blank card" / "off-topic refusal" failure modes when a document-analysis intent fires without a document. Both layers are needed because the LLM sometimes returns valid empty JSON (caught by the cards) and sometimes prose (caught by the Edge prompt branch).

---

## What's next

Short list of probable next priorities based on today's direction — **user should confirm or reorder**:

1. Second-pass prompt tightening once Arjun shares real test output (the first pass was principled/blind).
2. **Audit any remaining `callLLM` callers** — confirmed three surfaces fixed (workflowExecutor, WorkspaceChatView, ChatView fallback removed). Need a final grep across `src/` to confirm nothing else still routes through the dead client-side path.
3. Server-backed favourites (currently localStorage-only → don't sync across devices).
4. External-user single-workspace auto-redirect (from prior session's punch list).
5. Reconcile the 3 sources of truth for intents (`intents.ts` / `intentDetector.ts` / `GlobalKnowledgeBase.jsx DEFAULT_INTENTS`).
6. Migrate the 4 older intent cards (Summary, Comparison, CaseBrief, Research) to `EditorialShell`. Note: empty-states now exist on both shell types, so this is purely visual unification rather than a behaviour fix.
7. Server-side fix for the JSON-schema-with-no-document failure mode at the Edge — the cards + prompt patches handle it cosmetically, but the Edge could detect "card intent + no doc content in messages" and skip the schema injection entirely, returning prose directly. Cleaner long-term than the two-layer band-aid.

---

## Blockers / open questions

- **Test results from Arjun** on the new real-execution path are the primary blocker for the next iteration of operation prompts.
- **Is the Intent management module actually wanted?** Asked in an earlier session, then "Stop" before implementation. Still limbo.
- **Backend folder status** (`backend/` with Prisma + SQLite): intended, deprecated, or pending wiring? Production chat bypasses it.
- **Document Vault / Knowledge Pack → workflow step linking** — a step can attach a reference doc via the Vault picker in the builder, but the broader "my workspace docs should auto-flow to steps that need them" story isn't designed yet.

---

## Recent decisions and why

Reverse chronological. Each entry: *decision — rationale — date*.

- **Picker is a single unified grid, no Featured/Library section split, no maxWidth cap** (2026-04-25) — aashna's chat-mode mockup showed cards in a single grid that fills the available width. Earlier compromise of `maxWidth: 960` + section headers fought the design at every viewport: 2 cards of cramped 340px on a 1440px screen. New rule: `repeat(auto-fill, minmax(340px, 1fr))`, no cap. Reflows from 3-across at desktop to 2 / 1 naturally.

- **Builder: centred hero + step-pill indicator, not segmented control** (2026-04-25) — earlier "single top bar with segmented Details | Pipeline" pattern read as a settings sub-nav. Aashna's mockup shows the wizard as a centred hero — title + subtitle + two large pill steps with a connecting rule, on a warm gradient. Pills shift state (idle / active = navy fill / done = gold ring + check). Body sits in a 720px white rounded panel below it; primary CTAs live inside the panel footer instead of the top bar. Reads as a wizard, not a settings page.

- **Card empty-state pattern: detect schema-shaped envelopes with no real data** (2026-04-25) — when a card intent fires without an attached document, the Edge still enforces `response_format: json_object`, so the LLM produces a JSON envelope with empty strings and empty arrays. Each card now checks "all schema-required fields blank AND no document name AND empty arrays" and renders a single inline empty-state ("No document supplied" + upload nudge + sibling-intent hint) inside its normal shell. Fixes the broken-grid look without needing a server-side change. Companion to the Edge `MISSING DOCUMENT HANDLING` prompt branch (next decision).

- **Edge `MISSING DOCUMENT HANDLING` system-prompt branch** (2026-04-25) — when the LLM returns prose instead of JSON for a no-document analysis request, the off-topic refusal copy was firing ("I'm a legal assistant and can only help with legal matters…") because the system prompt had no case for "legal request, but nothing to work with". Added an explicit branch that tells the assistant: if a document-analysis request arrives without a document, reply with a short upload-prompt that echoes the user's task back, capped at ~50 words. Both layers (this + card empty-states) needed because the LLM picks either response shape unpredictably.

- **WorkspaceChatView routed through `/api/chat`, not `callLLM`** (2026-04-25) — every workspace chat message was throwing "Something went wrong reaching the AI" because this surface was still on the dead client-fallback path. Fixed by mirroring the Edge-streaming pattern that `ChatView` and `workflowExecutor` already use; document context is inlined into the user message. **No code path in production now uses `callLLM`** — the file is dead in prod and only kept around for hypothetical dev environments that set `VITE_OPENAI_API_KEY` deliberately.

- **`ChatView` surfaces real Edge errors instead of "No LLM backend available"** (2026-04-25) — the silent try/catch + dead client-side Groq fallback was masking every real failure (Vercel 503, network blip, body-shape mismatch) behind one misleading copy line. Now the catch captures the actual reason — non-2xx status + body excerpt, network error name, `AbortError` (silent for user-initiated aborts) — and shows it as the bot's error message. Also drops `credentials: 'include'` (vestigial, same-origin request) and adds a trailing decoder flush so multibyte UTF-8 at chunk boundaries doesn't drop characters. Fallback line retained as a neutral last resort if nothing was captured.

- **Invite Team widened from Org-Admin-only to all non-External users** (2026-04-24) — the CTA was missing from some sessions due to role-resolution flakiness; moving the gate down so the entry is always discoverable. The Team page itself can still enforce who can actually invite.

- **Document-style final report (Option D)** (2026-04-24) — picked over card / progressive-disclosure / two-card-split alternatives because the legal-memo mental model ("this is what I hand to a partner") wants the deliverable to look like a document, not a dashboard widget. Audit trail moved to a View audit log modal so the top-level surface stays focused.

- **Workflows execute for real via `/api/chat`** (2026-04-24) — the prior runner called `callLLM` (the client fallback) which needs a browser-side `VITE_OPENAI_API_KEY` never set in prod, so workflows always fell through to the honest "offline" placeholder. New path: `workflowExecutor.ts` POSTs `messages[]` directly to the Edge function with per-operation system prompts. One OpenAI key on the server handles all of it.

- **"Not covered by supplied documents." protocol for vague docs** (2026-04-24) — baked into every operation's system prompt verbatim. When the uploads don't contain what the step needs, the step's output MUST begin with that literal sentence + a one-sentence reason, then produce whatever partial analysis is possible. Chosen over pre-flight refusal because the user has the right to attempt a run; the platform's job is to degrade gracefully, never fabricate.

- **Empty state anchored via padding-top 14vh, not flexbox centering** (2026-04-24) — earlier flexbox-centered and flex-end attempts produced huge dead zones (content either pinned to one edge or floated mid-viewport). Padding-top anchor with an 880px max-width centred column gives a predictable, intentional position ≈15% from the top.

- **All workflow cards share one palette** (2026-04-24) — aashna's `single-accent-per-card` rule. Practice-area eyebrow → muted gray. Icon tile → ice-warm + neutral border. Icon colour → navy. Run button → navy always, regardless of practice area. The only accent is the gold sparkle on the hero.

- **Pipeline subsection deleted from workflow cards** (2026-04-24) — duplicated the step count + duration already shown in the header badge, cost 50px per card, contributed nothing new. Fill-or-kill.

- **`WorkflowProgressCard` gets a `variant="embedded"` prop** (2026-04-24) — when rendered inside a Run Panel `RunRow`, the outer chrome (border, radius, shadow, accent stripe, header) is suppressed so RunRow is the single card. Solves the earlier double-card nesting that looked like a product from a different design system.

- **One primary CTA per screen** (2026-04-24) — Workflow Builder had a top-bar Continue/Save AND a bottom-row duplicate. Dropped the bottom row; the top-bar CTA is the single primary action.

- **Aashna sub-agent** (2026-04-24) — added `.claude/agents/aashna.md` as a dedicated senior-designer persona for UX audits. Output format is diagnosis + prioritized fixes + paste-ready Claude Code prompts. Used three times this session for targeted rounds.

- **Drop "start fresh conversation" interrupt on intent change** (2026-04-23) — forcing a new thread per intent contradicts how lawyers work (one matter mixes summary → research → draft → compare). Intent changes now apply to the next message only; everything else carries forward.

- **Force JSON via `response_format: json_object` for card intents** (2026-04-23) — the LLM was ignoring "return JSON only" prose instructions and occasionally emitting markdown. OpenAI's native structured-output flag is the reliable way. Fallback to markdown on parse failure via `tryParseCardData` returning null.

- **Loosen off-topic guardrail** (2026-04-23) — prior guardrail refused legitimate legal questions like "federal rules of California." Rewrote to enumerate IN-scope (procedural rules, case law, contracts, compliance, ethics, jurisdictional) and OUT-of-scope (celebrity trivia, sports, cooking, etc.), with explicit bias "when in doubt, ANSWER."

- **Workflow run panel = right-docked, not inline chat bubble** (2026-04-23) — long pipelines shouldn't compete with chat conversation bubbles. Panel slides in from the right; chat flexes narrower. Fullscreen toggle for reading long reports. Sidebar running-strip is the minimized state.

- **Multiple concurrent workflow runs allowed** (2026-04-23) — removed the "already running" alert. Legal users want to kick off 3 pipelines in parallel and monitor side-by-side. Sidebar strip shows the count.

- **Per-user workflow favourites stored separately from the template** (2026-04-22) — favouriting a platform template shouldn't mutate the shared record. Stored under `yourai_workflow_favourites_v1` keyed by user id.

- **Drafts hidden from non-owners in the workflow picker** (2026-04-22) — half-finished templates shouldn't appear in anyone else's list.

- **Merge to `yourai/main` for production** (2026-04-22) — `origin` is the wrong remote. Production Vercel deploys from `yourai/main`. Ship ritual is merge-no-ff into a throwaway `tmp` branch, push `tmp:main`.

- **`/api/chat` body shape accepts client's `{message, history, intent, ...}`** (2026-04-21) — prior mismatch (Edge expected `messages[]` and returned SSE; client sent `{message}` and checked for `text/plain`) caused every request to fall through to a never-configured client-side fallback.

- **Drop the inline `WorkflowThreadEntry` in chat messages** — workflow runs now live only in the right Run Panel. Legacy `sender:'workflow'` messages render null so old threads don't show ghost cards.

---

## Last updated

**2026-04-25** — Aashna sent two fresh batches of mockup PDFs (picker chat-mode + 8 builder views). Rewrote the **Workflows picker** (single unified grid with no maxWidth cap, AI PIPELINES eyebrow, Running-in pill, restacked StatTiles, underline filter tabs, restored practice-area top stripe, PIPELINE op-icon row) and the **Workflow Builder** end-to-end (centered hero with step-pill indicator, white rounded panel body, navy step-number circles, in-panel CTAs, uppercase mono section labels, warm-beige reference-doc inset). Then fixed three connected runtime issues: (1) all 7 intent cards now render a friendly "No document supplied" empty-state instead of grids of `—` dashes when the LLM returns a schema-shaped envelope with no data; (2) Edge `api/chat.ts` system prompt got a `MISSING DOCUMENT HANDLING` branch so the bot asks for an upload instead of off-topic-refusing legitimate analysis requests; (3) `WorkspaceChatView` was still calling the dead `callLLM` path — routed it through `/api/chat` like everything else. Also cleaned up `ChatView`'s misleading "No LLM backend available" fallback so real Edge errors surface verbatim, dropped vestigial `credentials: 'include'`, added trailing decoder flush. Prod HEAD tracking `yourai/main` — verify with `curl -s https://yourai-black.vercel.app/chat | grep -oE 'index-[A-Za-z0-9_-]+\.js'`.

**2026-04-24 (afternoon)** — Follow-up session: applied aashna's round-3 fixes (picker grid `maxWidth: 960` cap on all three sections — *later removed in 2026-04-25 picker rewrite* — + audit-log modal step-number neutralisation with soft gray pill + dropped duplicate operation label in subtitle), wired `classifyDocs()` into `PreRunModal` (auto-classification on upload ready, per-row uppercase type chip, summary banner), and v2-tightened all 6 workflow operation prompts with word targets + citation hedging + explicit table syntax + findings-vs-actions distinctness rule.

**2026-04-24** — Session focused on: empty-state anchor + 880px container rewrite, sidebar refresh (Search Chats, ⌘N New Chat, Invite Team widened), full aashna-led UX pass across Workflows panel + Builder + Run Panel, real LLM execution via `/api/chat` (workflowPrompts + workflowExecutor), document-style report (Option D), and three FRDs on Desktop (Workflows, Workflow Operations, Incorrect Document Handling).
