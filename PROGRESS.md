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

### Workflows (`/chat/workflows`-equivalent, surfaced from sidebar)
- Full-page picker with stats hero (templates · runs/week · avg duration), per-practice-area color theming, pipeline preview row per card, recent-runs grid at the bottom
- Full-page step-wise Builder wizard (Details → Pipeline → Save) — full-page, no slide-over
- Multi-run support: kick off multiple workflows concurrently, all visible in a right-docked Run Panel
- Run Panel has fullscreen toggle, per-run collapsible rows, auto-expands newly-started runs
- Sidebar running-strip shows active run count and is clickable to reopen the panel
- Favorites: per-user ⭐ toggle on each card, surfaces in chat empty-state as quick launcher

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

---

## What's currently in progress

*(Needs confirmation from user — flagging assumptions below. See open questions.)*

- **Intent system — as a first-class module**: the user has asked about mirroring the Workflows full-page pattern for intents (create/edit/delete intents, link to KP/DV defaults, etc.). I drafted a plan but was stopped before implementing. **Status: not started; awaiting go-ahead.** Reference: `docs/extracted/intent-features.md` §8 for the discrepancies that would drive the rebuild.

- **FRD authoring**: Intent System FRD was just written (2026-04-23) and saved to both `docs/extracted/intent-features.md` and `~/Desktop/Intent_System_FRD.md`. This is complete.

---

## What's next

Short list of probable next priorities based on recent direction — **user should confirm or reorder**:

1. Decide whether to build the full Intents management module (like Workflows) or keep the current intent system as library-only.
2. Migrate the 4 older intent cards (Summary, Comparison, CaseBrief, Research) to `EditorialShell` so they match the 3 new ones visually.
3. Wire Intent → Knowledge Pack / Vault Doc defaults (currently no connection; changing intent never changes attached KP/DV).
4. Reconcile the three sources of truth for intents (`intents.ts` / `intentDetector.ts` / `GlobalKnowledgeBase.jsx DEFAULT_INTENTS`).
5. External-user routing polish: if an external user belongs to exactly one workspace, send them straight to that workspace's chat view (mentioned in an earlier request, not yet implemented).

---

## Blockers / open questions

*(Items I'm not certain about — please clarify before the next session acts on them.)*

- **Is the Intent management module actually wanted?** You asked me to build it, then said "Stop" before implementation. Unclear whether the scope was right, the timing was wrong, or you decided the library approach is sufficient.
- **Is `docs/bot-persona-scope.md` still authoritative?** Its header says "DRAFT — Pending Ryan Hoke visual review" dated 2026-04-10. Don't know if that review happened or what changed.
- **What's the current sprint focus?** Auto-memory references "Sprint 1: 20 user stories, wireframe built, wiring backend" but I don't know where in Sprint 1 we are.
- **External single-workspace auto-redirect** — was flagged as a want in a recent message, but I haven't implemented or confirmed specs.
- **Backend folder status**: `backend/` with Prisma + SQLite exists but production chat bypasses it and hits the Edge function directly. Intended? Being deprecated? Or pending wiring?

---

## Recent decisions and why

Reverse chronological. Each entry: *decision — rationale — date*.

- **Drop "start fresh conversation" interrupt on intent change** (2026-04-23) — forcing a new thread per intent contradicts how lawyers work (one matter mixes summary → research → draft → compare). Intent changes now apply to the next message only; everything else carries forward.

- **Force JSON via `response_format: json_object` for card intents** (2026-04-23) — the LLM was ignoring "return JSON only" prose instructions and occasionally emitting markdown. OpenAI's native structured-output flag is the reliable way. Fallback to markdown on parse failure via `tryParseCardData` returning null.

- **Loosen off-topic guardrail** (2026-04-23) — prior guardrail refused legitimate legal questions like "federal rules of California." Rewrote to enumerate IN-scope (procedural rules, case law, contracts, compliance, ethics, jurisdictional) and OUT-of-scope (celebrity trivia, sports, cooking, etc.), with explicit bias "when in doubt, ANSWER."

- **Workflow run panel = right-docked, not inline chat bubble** (2026-04-23) — long pipelines shouldn't compete with chat conversation bubbles. Panel slides in from the right; chat flexes narrower. Fullscreen toggle for reading long reports. Sidebar running-strip is the minimized state.

- **Multiple concurrent workflow runs allowed** (2026-04-23) — removed the "already running" alert. Legal users want to kick off 3 pipelines in parallel and monitor side-by-side. Sidebar strip shows the count.

- **Per-user workflow favourites stored separately from the template** (2026-04-22) — favouriting a platform template shouldn't mutate the shared record. Stored under `yourai_workflow_favourites_v1` keyed by user id.

- **Drafts hidden from non-owners in the workflow picker** (2026-04-22) — half-finished templates shouldn't appear in anyone else's list.

- **Merge to `yourai/main` for production** (2026-04-22) — `origin` is the wrong remote. Production Vercel deploys from `yourai/main`. Ship ritual is merge-no-ff into a throwaway `tmp` branch, push `tmp:main`.

- **`/api/chat` body shape accepts client's `{message, history, intent, ...}`** (2026-04-21) — prior mismatch (Edge expected `messages[]` and returned SSE; client sent `{message}` and checked for `text/plain`) caused every request to fall through to a never-configured client-side fallback, surfacing "No LLM backend available" even though `OPENAI_API_KEY` was set.

- **Drop the inline `WorkflowThreadEntry` in chat messages** — workflow runs now live only in the right Run Panel. Legacy `sender:'workflow'` messages render null so old threads don't show ghost cards.

---

## Last updated

**2026-04-23** — Session focused on: intent system FRD authoring, intent JSON dispatch fix, off-topic guardrail calibration, "start fresh" interrupt removal. Production live on commit `aad41bb` (or later — check `yourai/main` HEAD).
