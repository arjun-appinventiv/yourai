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

### Workflows — picker, builder, panel (2026-04-24 aashna-reviewed pass)
- **Picker**: compact hero (16/14 padding, 22px title, no gold eyebrow chip), flat inline StatTile (no borders/bg), Featured vs Your library sections under thin 11px uppercase labels, card grid `auto-fit minmax(300px)`, neutral card chrome (no accent stripe, white header, navy Run button regardless of practice area), muted practice-area eyebrow, ice-warm 44px icon tile, Recent runs card without colored border
- **Builder**: single top bar with segmented control (Details | Pipeline), no floating wizard pills, ghost Cancel, step card with soft neutral step-number badge (26×26, `#F3F4F6`/`#6B7280`), proper bordered name input (no dashed underline), inline char counter in the label row, rows=3 textarea, advanced options with dashed top border, body maxWidth 720
- **Pre-Run Modal**: workflow name + practice area chip + steps/duration on one header row; knowledge source banner (blue in workspace, neutral in main chat); yellow sibling warning when workspace has no docs; upload dropzone with drag+click; Run enabled once at least one upload is Ready
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

*(Arjun is test-driving the new real-execution path; feedback incoming.)*

- **Workflow execution live in prod** — as of 2026-04-24 every step really calls OpenAI via `/api/chat`. Operation prompts received an initial principled tightening on 2026-04-24 (word targets, table syntax, citation hedging, findings/actions distinctness). A second, test-output-driven tightening is still pending Arjun's real-workflow feedback.

---

## What's next

Short list of probable next priorities based on today's direction — **user should confirm or reorder**:

1. Second-pass prompt tightening once Arjun shares real test output (the first pass was principled/blind).
2. Server-backed favourites (currently localStorage-only → don't sync across devices).
3. External-user single-workspace auto-redirect (from prior session's punch list).
4. Reconcile the 3 sources of truth for intents (`intents.ts` / `intentDetector.ts` / `GlobalKnowledgeBase.jsx DEFAULT_INTENTS`).
5. Migrate the 4 older intent cards (Summary, Comparison, CaseBrief, Research) to `EditorialShell`.

---

## Blockers / open questions

- **Test results from Arjun** on the new real-execution path are the primary blocker for the next iteration of operation prompts.
- **Is the Intent management module actually wanted?** Asked in an earlier session, then "Stop" before implementation. Still limbo.
- **Backend folder status** (`backend/` with Prisma + SQLite): intended, deprecated, or pending wiring? Production chat bypasses it.
- **Document Vault / Knowledge Pack → workflow step linking** — a step can attach a reference doc via the Vault picker in the builder, but the broader "my workspace docs should auto-flow to steps that need them" story isn't designed yet.

---

## Recent decisions and why

Reverse chronological. Each entry: *decision — rationale — date*.

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

**2026-04-24 (afternoon)** — Follow-up session: applied aashna's round-3 fixes (picker grid `maxWidth: 960` cap on all three sections + audit-log modal step-number neutralisation with soft gray pill + dropped duplicate operation label in subtitle), wired `classifyDocs()` into `PreRunModal` (auto-classification on upload ready, per-row uppercase type chip, summary banner), and v2-tightened all 6 workflow operation prompts with word targets + citation hedging + explicit table syntax + findings-vs-actions distinctness rule. Prod HEAD tracking `yourai/main` — verify with `curl -s https://yourai-black.vercel.app/chat | grep -oE 'index-[A-Za-z0-9_-]+\.js'`.

**2026-04-24** — Session focused on: empty-state anchor + 880px container rewrite, sidebar refresh (Search Chats, ⌘N New Chat, Invite Team widened), full aashna-led UX pass across Workflows panel + Builder + Run Panel, real LLM execution via `/api/chat` (workflowPrompts + workflowExecutor), document-style report (Option D), and three FRDs on Desktop (Workflows, Workflow Operations, Incorrect Document Handling).
