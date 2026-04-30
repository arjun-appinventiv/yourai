# PROGRESS.md — YourAI current state

> Living document. Update at the end of each working session. Read at the start of each session.

---

## What's built and working

### Tenant chat (`/chat`) — landing surface
- **General Chat is the post-login landing surface** for non-external users (was `/chat/home` tile launcher; that screen was retired 2026-04-30 because it added an extra click without surfacing anything the chat empty state doesn't already cover). Externals still land on `/chat/workspaces`.
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

### Tile-based home (`/chat/home`) — NEW 2026-04-27
- Login default for non-externals now lands on `/chat/home` (was `/chat`). Externals still land on `/chat/workspaces`.
- Six tiles, role-aware: General Chat · Workspaces · Document Vault · Workflows · Knowledge Packs · Invite Team. Each tile sets the matching panel's show-flag and (where applicable) navigates.
- Hero: gold sparkle eyebrow + DM Serif H1 ("Hi {name}, what would you like to do?") + caption pointing to the new sidebar Home button.
- Tile chrome (per aashna review 2026-04-27): page surface `#F4F5F7` (one step darker than card so the edge has something to push against), card border 1.5px `#DCE0E6`, etched static box-shadow, accent stripe demoted to 2px @ 0.55 opacity that saturates only on hover, hover lifts shadow depth (no border-colour swap — that read as "selected").
- Implementation: `HomeTileLauncher` component lives inside `ChatView.jsx` and renders when `initialView === 'home'`. The chat-main-area display:none condition gates whichever panel is open.

### Sidebar refresh — NEW 2026-04-27
- New **Home** entry at the top of the workspace section → `/chat/home`.
- Old **Dashboard** renamed → **Chat** (now opens `/chat`, the General Chat surface).
- Active highlight is **dynamic**: `sidebarActiveKey` is derived from `initialView` + the show*Panel flags. Full-page panels (Vault / Packs / Workflows / Workspaces / Team / Prompts / Clients) take precedence over the underlying chat / home. Was previously hard-coded `active: true` on Home and never flipped.

### Onboarding restructure — NEW 2026-04-27 (Wendy P1 + P2)
- Cut to **two steps: Plan → Payment**. Role / practice area / firm size / primary state collection moved out of the active flow (renderStep1..4 stay defined for an eventual post-onboarding profile nudge). Wendy: "Now do I not trust those numbers because of the answers I gave?"
- **Invited-user fast path**: `/chat/signup?invited=1&email=...&firm=...` marks the email pre-verified, locks both email and firm name (helper copy: "Set by the colleague who invited you — can't be changed"), skips the survey + payment entirely, lands directly on `/chat/home` with `viaInvite: true` stamped on the user profile.

### Document Vault — full-page two-pane redesign (Aashna review 2026-04-27)
- Was a 900px centered modal. Now a full-page surface mounted as a flex peer to the chat-main-area (same template as `WorkspacesPage` / `TeamPage`).
- **Left rail** (280px, fixed): LIBRARY eyebrow → "All documents" pinned row → FOLDERS eyebrow → recursive folder tree with chevron expand/collapse, 16px depth indent, navy-tinted active row. Auto-expands ancestors of the active folder so the tree always reveals where the user is. Sticky "+ New folder" footer.
- **Main area**: hero (eyebrow VAULT + DM Serif H1 = current folder name, caption walks parent breadcrumb) → sticky 56px toolbar → subfolder chip strip (horizontal pill chips, not a 220px tile grid) → documents table (6 cols at root: Name / Owner / Folder / Size / Modified / Actions; 5 cols inside a folder).
- Owner pills, "from chat" badges, Edit / Delete / Share-org-wide all collapsed into a row-hover **kebab menu** so the row stays scannable.
- Empty state: 56px circular icon + serif headline + ghost/primary CTA pair (Upload folder / + Document). Copy varies for root vs in-folder vs no-search-match.

### Document Vault — folders, recursive upload, real content (Wendy P3 / P4 / P5)
- **Nested folders** (subfolders): `VaultFolder.parentId` (nullable). Tree walk + breadcrumb that walks the parent trail (`All folders › Contracts › Acme Corp › MSA`). Default seed includes `Contracts › Acme Corp › MSA & Schedules` so nesting is visible day-one. Deleting a folder re-parents its direct children to the deleted folder's parent (no orphan subtree).
- **Recursive folder upload**: new "Upload folder" button uses `webkitdirectory`; walks each `File.webkitRelativePath`, recreates the directory tree, dedupes by name+parent. Toast confirms "Uploaded N files with folder structure preserved".
- **UI labels**: `+ Folder` / `+ Document` (was "New Folder" / "New Document") per Wendy's "just folders. like an explorer."
- **Real PDFs as seed docs**: 4 actual PDFs in `public/sample-docs/` (MSA, Employee Handbook, Series B Term Sheet, Schedule A SLAs), generated from `src/data/sampleVaultContent.ts` via `/tmp/gen-sample-pdfs.py` (fpdf2). Each `DEFAULT_DOCUMENT_VAULT` entry now carries `content` (extracted text the AI reads when "Use" is clicked) + `sampleUrl` (the public path to the PDF for download/view). localStorage seed key bumped to `yourai_document_vault_v2` to force re-seed.
- **EditDocumentModal** folder dropdown shows depth-indented full path (`↳ Acme Corp` under `Contracts`) so a user can pick a nested folder unambiguously.

### Document Vault — Find / Search inside the page (P8 v1 — Option 2)
- The toolbar **search input is now the dual-purpose Search + Ask-anything bar** — gold sparkle icon, placeholder *"Search or ask — try 'biggest file I have'"*. Plain typing → live substring filter (existing). Pressing Enter or clicking the **Ask ✨** button that appears once you type → routes the query through an LLM-backed NL parser that returns a structured filter JSON (`search`, `dateFilter`, `uploaderId`, `fileType`, `sortBy`, `limit`, `explanation`). The parsed filter is applied to the existing memo. Gold callout below the toolbar shows the model's one-sentence interpretation.
- **Filter chip row** under the hero: Date · Uploaded by · Type · Sort. Each is a pill with a popover (shared `<FilterChip/>` component). "Clear filters" pill appears when any filter is non-default. "Top N" badge surfaces when the parser set a `limit`.
- **Today's bug fix**: typing in the bar OR clicking "All documents" in the tree now drops the AI-set transient filters (`resultLimit`, `askExplanation`, sort reset to `recent`). Explicit chip filters (date / uploader / type) stay set. Without this, "biggest file → top 1" stuck even after the user navigated back to All documents.
- Search currently checks **name + description + fileName** only — NOT content. Adding content is a 1-line change; trade-off documented.

### Knowledge Packs — full-page redesign (Aashna review 2026-04-27)
- Same outer shell as Vault but the body is a card grid (packs are destinations, not files). PackRow flipped horizontal → **vertical** layout: header row (icon + title + ownership pill + kebab menu) → 2-line description clamp → footer (doc/link counts + share-org-wide toggle + Use button).
- The "BY OWNER" facet rail moved to a **toolbar dropdown chip** (`Owner: All ▾`) — opens a popover with avatar list + counts. Independent of scope so they compose.
- Pinned scopes (All / Org-wide / Mine) moved into a **segmented control** in the toolbar.
- Edit / Delete moved into a row-hover kebab so they don't compete with the primary "Use" CTA.

### Additive uploads — supersedes one-upload-per-chat rule (Wendy P7)
- Old DEC-095 Option C policy (one upload per conversation, banner-prompt on second) is **gone**. Uploads now flow into `pendingAttachments` mid-thread without blocking.
- The send pipeline **appends** new docs to `sessionDocContext` rather than replacing. Each new doc is labelled `Document N (added HH:MM): filename.pdf` in the system prompt so the model can disambiguate "originally uploaded" from "added mid-thread".
- After an additive upload, an **inline system note** appears in the thread:
  - *"Added contract.pdf · Document 3 — New topic? Start fresh →"*
  - The "Start fresh" link dispatches a window event (`yourai:start-new-chat`); ChatView listens at the top level and calls `handleNewThread`. Soft escape hatch, no modal.
- Stale "One attachment per chat" callout removed from the chat empty state and the onboarding payment-confirm screen.

### Doc-inlining for `/api/chat` — bug class fixed today
- The Edge function only sees `body.message` + `body.history` + `intent`. Attached file text doesn't travel unless we **stitch it INTO the message string** ourselves. Without this, "Read this doc" with an attached PDF surfaced the MISSING_DOCUMENT_HANDLING reply ("upload using the + button…").
- The send pipeline now builds a merged doc context BEFORE the fetch and prepends `[Documents attached to this conversation]\n…\n\n[User question]\n` to the message. Covers:
  - new `pendingAttachments` (real file uploads)
  - `sessionDocContext` (continuing a thread with previously-attached docs)
  - `activeVaultDocument` (vault doc selected via "Use" — uses the seeded `content` field, falls back to description for user-created vault docs without content)
  - `activeVaultFolder` (folder attached — concatenates each child's content, capped per-doc)
- Edge cases handled: extraction in-flight (placeholder line acknowledging the file by name) and empty `trimmed` text (substitutes a default review question so the Edge's `body.message.trim()` length-guard passes).

### YourVault rename + table reshape + modal field-order (2026-04-29)
- **YourVault** is the new user-facing name for the former Document Vault: portal-wide string rename across sidebar entries, page titles, modal headers, tile labels, and error / help copy. Code symbols (`documentVault`, `DocumentVaultPanel`, `setShowDocumentVaultPanel`, `yourai_document_vault_v2`) stay unchanged so the rename is a string-level patch only. The single-word source pill `Vault` on `FileResultsCard` is deliberately left as-is — it's a different label from the portal name.
- **Root-view column order** is now **Folder → Name → Owner → Size → Modified → Actions** per Ryan Robertson's "case file" framing — Folder is the primary identifier (DM Sans 14 px / weight 600 / navy), click jumps to the folder via the existing `setCurrentFolderId`. Inside-folder 5-col view unchanged (Folder column hidden; the breadcrumb already conveys it).
- **New Document modal** field order changed to **Folder → Document name → Description → File** so the user picks where it goes before naming it. Depth-indented folder dropdown (`↳ Acme Corp` under `Contracts`) preserved.
- **Toolbar cleanup**: the `Sort: Recently uploaded ▾` pill and the `FOLDERS` / `SUBFOLDERS` chip strip below the toolbar were both removed. The left-rail folder tree is the single source of folder navigation now — no chip duplicate, no in-page sort affordance (column-header sort can come back later if asked).

### Chat empty-state restructure (Ryan's spec, 2026-04-29)
- Full layout rewrite per Ryan's sticky-note feedback. New vertical rhythm: hero (`paddingTop: 12vh` after Aashna polish, was 8vh) → big primary chat input directly under hero → drop-files tile under input → merged icon-pill row → trust footer.
- **Inside the input row**: Source dropdown (`General Chat` / `Workspace ▸` / `YourVault ▸`, replaces the old `+` attach button) + textarea + Knowledge Pack dropdown + send button. Skipped per PM call: Google Drive option, model selector, NotebookLM-style "search the web" surface (different product paradigm).
- **Drop-files tile** under the input uses the existing `handleAttachFiles(files, 'doc')` pipeline — same downstream as the legacy `+ AttachMenu` (pendingAttachments → sessionDocContext → vault auto-add → file-text extraction). Tile auto-hides once `pendingAttachments.length > 0`. Final shape is a single ~44 px inline strip (icon + primary line + helper on one row), not the over-specified 96 px stacked block from the first cut.
- **Merged icon-pill row** replaces the old 3 prompt cards + plain text intent pill row. One row of pills with icons, in order: General Chat (default) → Review a contract / Summarise a document / Draft an email (these pre-fill the input AND set active intent) → Legal Research → Case Law Analysis → "More operations ▾" (overflow). PM kept the verbose "More operations" label despite Aashna's "More" / "More tasks" pushback.
- **Aashna's P1 polish** (initially shipped as `/chatviewv2` standalone preview slug for A/B with Ryan, then promoted to `/chat` after PM approval — `/chatviewv2`, `EmptyStateAashna`, `emptyStateVariant`, `isAashnaNarrow`, `isAashnaMobile` all deleted on promotion): hero `paddingTop` 8vh → 12vh; greeting `text-4xl sm:text-5xl` → `text-5xl sm:text-6xl`; vertical rhythm 16/12/18 → 40/28/28 px; `<900px` viewport caps the merged-pill row at 4 visible (rest pushes to "More operations" overflow); `<768px` viewport stacks the input row vertically (Source pill row → textarea rows=3 minHeight 72 → KP+send right-aligned sub-row).
- **Active pill is a solid navy fill**: Aashna recommended navy outline + 6% tint so the send button would be the only solid-navy attractor; PM preferred the solid-navy fill for a stronger active-state cue. Same shape as before the polish round (solid navy bg, white text, soft drop-shadow). PM had final call.
- **Pre-fill auto-grow fix**: clicking an action pill calls `setInput(promptText)` which doesn't fire the textarea's `onInput` handler, so the existing auto-grow logic never recalculated and long pre-filled prompts clipped at one row. Fix: a `useEffect` watching `input` resizes the textarea to `scrollHeight` (capped at 140 px to match the inline cap). See CLAUDE.md gotcha for the broader rule.
- **Intent-pick override fix**: clicking an action pill on the empty state didn't reflect in the populated chat's collapsed intent pill after sending. Two auto-switch paths inside `sendMessage` (find_document pre-flight at ~line 4330, hard-intent guardrail at ~line 4439) silently overwrote the user's deliberate selection whenever `activeIntent === 'general_chat'`. Fix: a new `hasManualIntentPick` flag — both auto-switch paths now gate on `!hasManualIntentPick && activeIntent === 'general_chat' && …`. Flag is set wherever the user explicitly picks (empty-state merged pill row, More-overflow dropdown, populated-chat collapsed pill dropdown, suggestion-banner single accept, suggestion-banner multi-pick) and cleared in `handleNewThread`. See CLAUDE.md gotcha for the rule.

### "Search my docs" toggle replaces Search Within dropdown (2026-04-30 evening)
The three-scope Search Within dropdown (File Search / YourVault / Workspaces) shipped earlier this evening was simplified again the same hour. PM read: "📁 YourVault — so complicated." The "scope" mental model is too abstract for attorneys; users overlap it confusingly with the drop zone. Replaced with a single verb toggle:
- **🔍 Search my docs** — outlined pill (off, default) → navy-filled pill (on). When ON, the YourVault retrieval branch in `sendMessage` runs (token-overlap relevance across name + description + fileName + content, top-5 docs, 6 K char cap) and inlines matches into the next send. When OFF, behaviour is exactly today's File Search (chat with whatever's attached).
- **Workspaces moved out of the chat-input control entirely.** It lives in the sidebar as plain navigation — that's where users go to switch matters. Removing it from the chat input deletes the "what does Workspaces mean here?" cognitive load.
- State: `searchScope: 'files' | 'vault' | 'workspaces'` retired; replaced with `searchMyDocs: boolean`. Old plumbing (`isSourceMenuOpen`, `sourceMenuRef`, `SCOPE_META`, `SCOPE_OPTIONS`) deleted.
- Default is OFF — most chats are about an attached file, not a vault search. The toggle is one click away when needed.

### Intent dropdowns — verb buckets (2026-04-30 evening)
Both intent dropdowns (the populated-chat collapsed-pill dropdown + the empty-state "More operations" overflow) were a flat list of 13 intents, mixed verbs and nouns. Reorganised into four verb-led buckets with uppercase mono section headers (matching the existing dropdown chrome):
- **DEFAULT** — General Chat
- **ASK & RESEARCH** — Legal Q&A, Legal Research, Case Law Analysis, Find Document
- **ANALYZE** — Contract Review, Clause Analysis, Clause Comparison, Risk Assessment, Document Summarisation, Timeline
- **DRAFT** — Document Drafting, Email & Letter Drafting

`INTENT_BUCKETS` + `groupIntentsByBucket()` exported from `src/lib/intents.ts` so both dropdowns render from the same source. Empty buckets are filtered out — the More overflow shows only the buckets that contain non-pill intents (DEFAULT auto-disappears since General Chat is always a top-level pill on the empty state).

### Textarea scrollbar artefact suppressed (2026-04-30 evening)
A persistent vertical scrollbar appeared between the chat textarea and the KP dropdown on macOS systems with "Always show scrollbars" enabled, even at empty content. Fixed via two CSS rules on the existing `no-focus-ring` class: `::-webkit-scrollbar { width: 0 }` and `scrollbar-width: none`. Scroll still works (mouse-wheel + arrow keys) when content overflows the maxHeight cap; only the visual track is hidden.

### Tile-based home retired — General Chat is the landing surface (2026-04-30)
- The `/chat/home` tile launcher screen (six tiles: General Chat / Workspaces / YourVault / Workflows / Knowledge Packs / Invite Team) was removed. Non-external users now land directly on `/chat` (General Chat); externals still go to `/chat/workspaces`. The empty-state pill row + Search Within dropdown surface the same entry points the tiles used to without an extra click.
- Touchpoints: `App.jsx` route deleted; `RouteTitle.jsx` entry deleted; `Login.jsx` / `SignUp.jsx` / `Onboarding.jsx` post-flow navigates updated; `ChatView.jsx` lost its `HomeTileLauncher` function (~140 lines), the `ArrowRight` lucide alias, the sidebar Home item + `onGoHome` prop, the `initialView === 'home'` branch in `sidebarActiveKey`, and the conditional render block.

### Search Within dropdown — replaces per-item Source picker (2026-04-30)
Driven by the scaling problem on the prior design: the `Workspace ▸` and `YourVault ▸` submenus enumerated every workspace / every vault doc, which broke at 30+ matters or 100+ docs (and hover-style submenus are fragile on touch). New design swaps "pick an item" for "pick a scope" — bounded set of three options that never grows.
- **`SEARCH WITHIN` dropdown** with three flat scopes:
  - **🔍 File Search** (default) — "Attached files in this chat — fastest, most precise."
  - **📁 YourVault** — "Your full private corpus across folders and matters."
  - **💼 Workspaces** — "Shared org content across all workspaces you can access."
- **YourVault scope wiring**: when picked + the user has no explicit attachment + types a question, `sendMessage` runs a token-overlap relevance score across `name + description + fileName + content` for every vault entry, picks top-5 matches (cap 6 K chars per doc), and inlines them under the existing `[Documents attached to this conversation]` header. Stop-word filtered, word-boundary regex matched, score capped per token to keep one long doc from monopolising. **No backend dep** — works against the existing `documentVault` localStorage. RAG/pgvector swaps in cleanly later (see `.claude-context/vault-content-rag-plan.md`) without UI churn.
- **Workspaces scope is a route**: clicking it navigates the user into `/chat/workspaces` (Workspaces page) rather than scoping `/chat` against all org content. Confidentiality between matters is non-negotiable for law firms; cross-workspace search from the firm-wide chat surface is a footgun. Each workspace chat already RAG's within its own corpus.
- **Knowledge Pack dropdown** (`No pack ▾`) stays separate alongside Search Within. KPs are deliberate user-curated bundles (≤20 realistic) so the listing problem doesn't apply; can revisit when content RAG lands.
- **Drop zone persists into active chat** (per the design callout "Drop zone persists into active chat. Files become inline pills"). Both prior gates (`showEmptyState` AND `pendingAttachments.length === 0`) dropped — the tile renders below the input throughout the conversation. Padding shrinks (10 / 14 → 6 / 12) and helper text drops in populated state for a less prominent footprint. Label flips to `Add another file (N attached)` when files are attached. The chip row above the input handles per-file removal via the existing X button on each pill.
- **Auto-save chat-attached files into YourVault** — already partially wired (vault metadata entry created on attach). Bug fix: extracted text content now also lands in the vault entry's `content` field, so YourVault-scope retrieval can actually find chat-attached docs later. New `vaultIdByFileName` map tracks each file's vault entry; the extraction `.then()` backfills content (only if the entry didn't already have a richer copy). Drop-zone helper text now includes "saved to YourVault" so users know files persist.
- Removed state: `isSourceWorkspaceSubOpen`, `isSourceVaultSubOpen`. New state: `searchScope` (`'files' | 'vault' | 'workspaces'`, default `'files'`). `searchScope` persists across the thread — switching scope mid-conversation is not yet supported (start a new chat to reset).

### Chat search — extended to message content (2026-04-29)
- Sidebar `Search Chats` was title-only. Now case-insensitive matches across title OR preview OR any message body in the thread. When the hit was on a message body, the row's standard `updatedAt · N msgs` meta line is replaced by an italic 80-char snippet preview centred on the match.
- Messages are sourced from `messages` for the active thread, `threadMessagesRef.current[id]` for inactive live threads, and fall back to `THREAD_MESSAGES[id]` for seed threads. Single search affordance — extended in place rather than as a new surface.

### FRD authoring formalised — `docs/frd-template.md` + first FRD (2026-04-29)
- New `docs/frd-template.md` formalises FRD authoring: 10-section template, copy-paste skeleton, style conventions, QA scenario format, anti-patterns, 11-step workflow. Audience is PM / QA / strategist — no code, no file paths.
- First FRD authored against the template: `docs/extracted/FRD_Intent_Cards.md` (615 lines, all 8 cards, 46 QA scenarios). Markdown first; `.docx` conversion happens after sign-off via the docx skill.
- Use phrase: *"Create an FRD for `<module>` using `docs/frd-template.md`."*

### Other 2026-04-27 fixes
- **Dual-panel render bug**: navigating from one full-page panel to another rendered both side-by-side because each open-handler only zeroed a subset of sibling flags. Added a `closeAllPanels()` helper called by every Sidebar + HomeTileLauncher open-handler.
- **Case Workspaces home tile bug**: home tile's `onOpenWorkspaces` wasn't calling `setShowWorkspacesPanel(true)` before navigate. Same component instance kept the workspaces=false state from `closeAllPanels`. Fixed by setting the flag explicitly.
- **Sidebar Knowledge Packs link blanked the app**: missing `User` lucide-react import. Caught via CDP click-test → `ReferenceError: User is not defined` in the panel render.
- **SA Bot Persona cleanup**: removed two unconfirmed wireframe blocks — *Message Routing Flow* and *Per-Persona Response Format*.
- **Workspaces rename**: `Workspaces → Case Workspaces → Workspaces` (renamed earlier in the day per Wendy's "client files" mental model, then reverted on Arjun's call). Tile description softened to "per-matter workspaces".

---

## What's currently in progress

*(Arjun is showing the prod build to the client — Wendy attorney + Ryan Hoke / Robertson — and iterating off their feedback in real time.)*

- **Ryan Robertson's empty-state spec** (2026-04-29 sticky-note round) is the active driver: the new chat empty state with hero → big input → drop-tile → merged icon-pill row + Source dropdown is shipped on `/chat`. Aashna's P1 polish has been promoted from the `/chatviewv2` preview slug. The capability-grid attempt earlier in the day was reverted same-day after PM pushback ("the entire page is too god damn long, this is so wrong.") — see the do-not-reintroduce note in CLAUDE.md.
- **Vault rebrand to YourVault** is shipped portal-wide on the user-facing strings; code symbols (`documentVault`, `DocumentVaultPanel`, etc.) and storage keys deliberately left unchanged so the patch is string-level.
- **Wendy's P-list** from the 2026-04-27 client interview remains a parallel driver. Shipped to date: P1, P2, P3, P4, P5, P7 + the Aashna-led full-page redesign of YourVault & KP + the Find/Search-in-YourVault feature (P8 v1 — Option 2). Backlog: P6 (Workspaces rename — done then reverted, currently *not* renamed), P8.2/P8.3/P8.4 (content RAG, metadata enrichment, large-library indexing), P9 (default state-law KP), P10 (Lexus / West integration), P11 (default-open-within-firm flag flip), P12 (large-file 500-page strategy).
- **YourVault Find search currently grep's name + description + fileName only — NOT content**. Adding `d.content` to the filter is a 1-line change; trade-off is client-side substring across N×100K-char strings gets laggy at scale, so it's deferred until the first user complains or until the backend lands.
- **Sample seed docs are now real PDFs with extracted content** stamped onto each entry. Future doc additions to the seed need to go through the same pipeline (`/tmp/gen-sample-pdfs.py` reads `src/data/sampleVaultContent.ts`, regenerates `public/sample-docs/*.pdf`).
- **`hasManualIntentPick` pattern in main `ChatView`** now gates the auto-switch paths against deliberate user picks. The agent that fixed today's bug flagged that `WorkspaceChatView` may need the same treatment — not yet done, watch for a similar regression there.

---

## What's next

Short list of probable next priorities based on today's direction — **user should confirm or reorder**:

0. **Send the Delivery Tracker to FE / BE / AI/Python leads** so they can fill in their team-specific cells (Owner / Status / Start / ETA / Effort). Weekly stand-up will read across the file. Optional follow-up: build a Sprint Plan cover sheet (option C hybrid) once leads have entered ETAs.
1. **YourVault scope mid-thread switching**: today `searchScope` persists for the whole thread because the populated-chat input has no Search Within dropdown. Either add the dropdown to populated chat, or auto-reset to `files` after the first send and document it. Pick one once Wendy / Ryan see the new flow live.
2. **Extend the `hasManualIntentPick` pattern to `WorkspaceChatView`** if the same auto-switch-overrides-manual-pick regression surfaces there — workspace chat has its own intent-detection code path that hasn't been audited for this yet. Flagged by the agent that fixed today's main-chat bug.
3. **P9 — default state-law KP** auto-attached based on the user's primary state from onboarding. Simple swap-on-chat-start.
4. **P11 — default-open-within-firm access flag** for workspaces. Role-based gates stay in the admin panel for compliance, but default flips to "everyone in the firm sees everything".
5. **P8.3 — metadata enrichment** on uploads: page count (best-effort PDF parse), `lastModifiedAt`, auto-stamp `workspaceId` on workspace-attached docs. Without these, "files over 200 pages" or "files in Acme matter" can't be answered.
6. **P10 — Lexus / West integration** (Karish to scope). Wendy's pushback: scraping is risky; firms already pay for these. Backend-dependent.
7. **P12 — large-file strategy** for 500-page PDFs (family-law app-close exports). Auto-chunking + per-case MD summary index. Hog mentioned an open-source memory system for this.
8. **P8.4 — content semantic search** (pgvector ingestion pipeline). Prerequisite: backend wired.
9. **Author the next FRD against `docs/frd-template.md`** — Workspaces or Knowledge Packs are the natural next candidates now that the template is shaken out on Intent Cards.
10. Second-pass workflow operation prompt tightening once Arjun shares real test output.
11. Audit any remaining `callLLM` callers (final grep across `src/`).
12. Server-backed favourites (currently localStorage-only).
13. External-user single-workspace auto-redirect.
14. Reconcile the 3 sources of truth for intents (`intents.ts` / `intentDetector.ts` / `GlobalKnowledgeBase.jsx DEFAULT_INTENTS`).
15. Server-side fix for the JSON-schema-with-no-document failure mode at the Edge.

---

## Blockers / open questions

- **Test results from Arjun** on the new real-execution path are the primary blocker for the next iteration of operation prompts.
- **Is the Intent management module actually wanted?** Asked in an earlier session, then "Stop" before implementation. Still limbo.
- **Backend folder status** (`backend/` with Prisma + SQLite): intended, deprecated, or pending wiring? Production chat bypasses it.
- **Document Vault / Knowledge Pack → workflow step linking** — a step can attach a reference doc via the Vault picker in the builder, but the broader "my workspace docs should auto-flow to steps that need them" story isn't designed yet.

---

## Recent decisions and why

Reverse chronological. Each entry: *decision — rationale — date*.

- **PM deliverables split: WBS = static scope reference, Delivery Tracker = mutable working doc** (2026-04-30) — different audiences, different granularities, different mutation cadence. WBS is treated as the single source of truth for what's in the product (PM + advisor audience, ~550 implementation-bullet features for YourAI). Delivery Tracker is the live working doc engineering leads write into weekly (~257 PM-level capability rows after rollup). Don't try to bolt timeline columns onto the WBS — the WBS bullets are co-located in one cell and can't be tracked row-by-row, and WBS only has one Status column whereas the tracker needs per-team accountability. Format specs for both live in `.claude-context/wbs-format.md` and `.claude-context/delivery-tracker-format.md`.

- **Tracker features must be PM-level user capabilities, not implementation chrome** (2026-04-30) — first pass exploded WBS bullets into tracker rows verbatim (471 platform rows). PM rejected: *"there's one row 'Tile chrome: page surface #F4F5F7, 1.5px #DCE0E6 border, etched static box-shadow' — way way technical and too granular."* Re-rolled to ~3-6 features per sub-module, each a user-facing verb-noun ("Email + password login", "Generate risk memo with severity findings"). Removed: CSS, hex codes, font names, defensive guards, library internals, persistence-key names. Kept Notes column for engineering-state context (mock vs real, recent commits) — useful when leads open a row. Engineering sheets (API & Backend, AI · Python) stay at engineering granularity because their audience is technical leads — endpoint paths and capability internals are the right unit there.

- **Auto-switch must respect manual user picks** (2026-04-29) — bug PM caught: clicking an action pill on `/chat` empty state didn't reflect in the populated chat's collapsed intent pill after sending. Root cause: `sendMessage`'s two auto-switch paths (`find_document` pre-flight + hard-intent guardrail) silently overrode the user's deliberate selection whenever `activeIntent === 'general_chat'`. Fix: `hasManualIntentPick` flag gates both auto-switches; flag set wherever the user explicitly picks (empty-state pill row, More-overflow dropdown, populated-chat collapsed pill dropdown, suggestion banner accepts) and cleared in `handleNewThread`. Same pattern should apply to any future feature where auto-detection might conflict with deliberate user state.

- **Chat search: extend in place, don't add a new surface** (2026-04-29) — sidebar `Search Chats` was title-only. PM gave the choice: keyword search vs title search. Picked extension over a new surface — the sidebar is where users already look. Now case-insensitive matches across title OR preview OR any message body in the thread; matched-on-body rows show an italic 80-char snippet preview in place of the standard meta line. Source order: `messages` (active thread) → `threadMessagesRef.current[id]` (inactive live threads) → `THREAD_MESSAGES[id]` (seed threads).

- **Active pill stays solid navy fill** (2026-04-29) — Aashna recommended navy outline + 6% tint so the send button would be the only solid-navy attractor on the empty state. PM preferred the solid-navy fill for a stronger active-state cue. PM has final call.

- **Aashna polish promoted from `/chatviewv2` preview slug to `/chat`** (2026-04-29) — first shipped at standalone preview URL so PM could A/B with Ryan side-by-side; promoted to default after PM approval. Preview route, `EmptyStateAashna` duplicate component, `emptyStateVariant` prop, and `isAashnaNarrow`/`isAashnaMobile` aliases all deleted on promotion. Single source of truth.

- **NotebookLM-style "Add sources" modal — discussed and skipped** (2026-04-29) — Ryan shared NotebookLM's modal as inspiration. Recommendation declined: different product paradigm (NotebookLM = build a corpus then question; YourAI = ask first, attach when needed), and the project has actively pulled away from modals (Vault and KP both moved from 900 px modals to full-page surfaces). Borrow targeted ideas (multi-source chip pattern) when web search / Westlaw / Lexis ships under P10.

- **Capability-grid empty state attempt — shipped then reverted same day** (2026-04-29) — first attempt at the chat empty-state restructure was a 4-col grid surfacing all 13 intents grouped by Analyze / Draft & Summarize / Research / Find, plus a slim Quick Start strip and a chip-in-input for active intent. PM reaction after seeing it live: *"the entire page is too god damn long, this is so wrong."* Reverted via `git revert`. **Do not reintroduce** the capability grid OR the chip-in-input pattern — both are on CLAUDE.md's do-not-reintroduce list now.

- **`+` attach button replaced with Source dropdown + KP dropdown on empty state** (2026-04-29) — per Ryan's spec. Source options: `General Chat` / `Workspace ▸` / `YourVault ▸` (Google Drive skipped). Knowledge Pack lives in a separate dropdown. Drop-files tile under the input handles file uploads via the existing `handleAttachFiles` pipeline (auto-hides once `pendingAttachments.length > 0`). Single mental model for "where does this conversation pull context from" on the empty state.

- **Merged icon-pill row replaces 3 prompt cards + plain text intent pills** (2026-04-29) — per Ryan's "make these larger pills similar to the others, but with an icon." Merged interpretation: one row, icons everywhere. Order: General Chat (default) → 3 ex-action cards (Review a contract / Summarise a document / Draft an email — these pre-fill the input AND set active intent) → Legal Research → Case Law Analysis → "More operations ▾" overflow.

- **"More operations" label kept** (2026-04-29) — Aashna pushed back on the label as "engineer-speak vs brand voice" and suggested "More tasks" or just "More". PM kept "More operations" — clearer affordance for users discovering the rest of the intent list. PM had final call.

- **Folder is the primary identifier on YourVault table** (2026-04-29) — per Ryan Robertson's "case file" framing. Root-view column order: Folder → Name → Owner → Size → Modified → Actions. Folder cell bolded (DM Sans 14 px / weight 600 / navy). Click jumps to folder. Inside-folder 5-col view unchanged.

- **YourVault toolbar lost the Sort pill and the subfolder chip strip** (2026-04-29) — both removed. Folders are already in the left-rail tree; the chip strip was a duplicate. Sort defaults to recent silently — column-header sort can come back later if asked, but the inline pill was visual noise.

- **YourVault rename portal-wide; code symbols unchanged** (2026-04-29) — every user-facing "Document Vault" / "Document vault" / "DOCUMENT VAULT" string renamed to "YourVault" (matches the YourAI single-word brand pattern). Code symbols (`documentVault`, `DocumentVaultPanel`, `setShowDocumentVaultPanel`, `documentVaultStore`, file paths, storage keys) explicitly left unchanged so the rename is a string-level patch only.

- **Vault search lives INSIDE the vault page, not as a new "Find" surface** (2026-04-28) — Aashna's critique: "users who think of vault as 'my folders' shouldn't have to learn a second noun called Find." The toolbar's existing search input was promoted to a dual-purpose Search + Ask-anything bar; filter chips sit below the hero. Zero new sidebar entry, zero new vocabulary. Option 2 in the P8 plan.

- **AI-set transient filters clear on user typing or All-documents click** (2026-04-28) — bug Arjun caught: "biggest file" set `resultLimit=1` + `sortBy=size-desc`; subsequent navigation back to All documents kept those filters silently, so the table showed 1 row while the tab said "All 7". Now typing in the search bar (or clicking All-documents in the tree) drops `resultLimit`, `askExplanation`, and resets `sortBy`. Explicit chip filters (date / uploader / type) stay because those are deliberate user choices.

- **Sample seed vault docs are now actual PDFs with extracted content** (2026-04-27) — Arjun's call: "transform sample files into actual files". Wrote 4 realistic legal docs (MSA, Employee Handbook, Series B Term Sheet, MSA Schedule A) as content strings in `src/data/sampleVaultContent.ts`, regenerated as real PDFs via `/tmp/gen-sample-pdfs.py` (fpdf2), dropped in `public/sample-docs/`. Each `DEFAULT_DOCUMENT_VAULT` entry carries the inline `content` (so the AI reads the full text when "Use" is clicked) plus `sampleUrl` (so future download/view buttons work). Bumped localStorage seed key `yourai_document_vault_v2` to force re-seed.

- **Workspaces ↔ Case Workspaces ↔ Workspaces** (2026-04-27 / 2026-04-28) — Wendy's interview suggested "client files" mental model; renamed sidebar/home-tile/page-headers to "Case Workspaces" early afternoon, then Arjun reverted to plain "Workspaces" same evening. Tile description softened to "per-matter workspaces" to reach Wendy's mental model without forcing the noun.

- **Doc content stitched into the Edge message body** (2026-04-27) — `/api/chat` only sees `body.message` + `body.history` + `intent`. The attached file's extracted text was being computed client-side but only fed to the dead `callLLM` fallback, never to the Edge. Bot saw "Read this doc" with zero document content and hit MISSING_DOCUMENT_HANDLING. New rule: **always inline doc context into the user message** under a `[Documents attached to this conversation]` header before the fetch. Mirrors the pattern WorkspaceChatView already uses. Covers pendingAttachments, sessionDocContext, activeVaultDocument, activeVaultFolder.

- **Additive uploads — supersedes the one-upload-per-chat rule (DEC-095 retired)** (2026-04-27) — Wendy's friction: "even though we upload documents into the vault I still have to attach them to the conversation?" The old block on uploading a second doc mid-thread is gone. New docs APPEND to `sessionDocContext` rather than replace, get labelled `Document N (added HH:MM)` in the system prompt so the model can disambiguate, and an inline system note appears in the thread offering a one-click "Start a new chat →" escape hatch (window event dispatched from the note → ChatView listens at the top level → calls `handleNewThread`). Considered the prompt-yes/no version Arjun proposed and rejected: too much friction in the happy case (most additive uploads ARE related).

- **Tile-based home at `/chat/home`** (2026-04-27) — Wendy: "didn't understand what to do here." Replaces the empty-state-with-prompt-pills as the front door for non-external users. Six role-aware tiles. `HomeTileLauncher` lives inside ChatView and renders when `initialView === 'home'`; the chat-main-area display:none condition gates whichever full-page panel is open. Login default redirected here for non-externals; externals still go to `/chat/workspaces`.

- **Sidebar Home + Chat + dynamic active state** (2026-04-27) — added Home entry at top of workspace section, renamed Dashboard → Chat (matches what end users called it), and made `active` derive from `sidebarActiveKey` (computed from `initialView` + show*Panel flags). Previously the Home item was hard-coded `active: true` and never flipped. Full-page panels (Vault / Packs / Workflows / Workspaces / Team / Prompts / Clients) take precedence over the underlying chat / home in the precedence chain.

- **Onboarding cut to Plan → Payment only; invited-user fast path** (2026-04-27) — Wendy + Ryan call: survey-before-pricing creates a trust problem ("now do I not trust those numbers because of the answers I gave?"). Role / practice / firm-size / state collection moved out of the active flow. Invited users (`?invited=1&email=…&firm=…`) skip OTP, get email + firm name locked, skip survey + payment entirely (org admin already configured), land on `/chat/home`.

- **Document Vault gets nested folders + recursive folder upload + label cleanup** (2026-04-27) — Wendy: "folders and subfolders ... like Explorer." `VaultFolder.parentId` enables nesting; default seed has `Contracts › Acme Corp › MSA & Schedules`. New "Upload folder" button uses `webkitdirectory`; walks `webkitRelativePath` and recreates the tree. Buttons relabelled to `+ Folder` / `+ Document` (was "New Folder" / "New Document"). Deleting a folder re-parents its children to the deleted folder's parent (no orphan subtree).

- **Vault + Knowledge Packs become full-page surfaces (Aashna review)** (2026-04-27) — both panels graduated from 900px modals to full-page two-pane Finder layouts (left rail + main with hero/toolbar/table). Vault rail = recursive folder tree; KP rail = filter facets (now moved to the toolbar dropdown). Aashna's call: "modals are for short blocking decisions; file management is exploration. The 900px chrome was the bottleneck, not the data density."

- **PackRow flipped horizontal → vertical** (2026-04-27) — Aashna fix: at 320px card width the horizontal action cluster ate ~158px and squeezed the description to ~62px ("Standard / NDA / clauses, / review"). Vertical layout: header (icon + title + kebab) → 2-line description clamp → footer (counts + share-toggle + Use). Edit + Delete moved into the kebab so they don't compete with Use.

- **closeAllPanels() helper for full-page panel mutual exclusion** (2026-04-27) — bug Arjun caught: clicking Workflows then Knowledge Packs rendered both side-by-side because each open-handler only zeroed a subset of sibling flags. The helper clears all 8 sibling states in one call; every Sidebar + HomeTileLauncher open-handler calls it before setting its target.

- **SA Bot Persona: removed Message Routing Flow + Per-Persona Response Format** (2026-04-26 / 27) — both were DRAFT wireframe blocks that never reflected production behaviour. Tagged with confidence comments ("3/10, not confirmed by Ryan"). Stripped to keep the panel honest about what's actually wired.

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

**2026-04-30 (evening)** — Two product changes back to back. **(1) Tile-based home retired**: `/chat/home` deleted; non-external users now land on `/chat` (General Chat) directly; externals still go to `/chat/workspaces`. PM rationale: the tile launcher added an extra click without surfacing anything the chat empty state doesn't already cover (intent pills, Source dropdown, drop zone). Six files touched: `App.jsx` route gone, `RouteTitle.jsx` entry gone, `Login.jsx` / `SignUp.jsx` / `Onboarding.jsx` post-flow navigates updated, `ChatView.jsx` lost its `HomeTileLauncher` function (~140 lines), the `ArrowRight` lucide alias, the sidebar Home item, the `onGoHome` prop, the `initialView === 'home'` branch in `sidebarActiveKey`, and the conditional render block. **(2) Search Within dropdown** replaces the per-item Source picker. Old design enumerated workspaces / vault docs in submenus and broke at scale (30+ matters, 100+ docs). New design picks a *scope*, not an item: File Search (default — current chat attachments), YourVault (private corpus search), Workspaces (routes to Workspaces page — strict scoping per matter for confidentiality). YourVault scope is wired with client-side token-overlap retrieval across `name + description + fileName + content` — top-5 matches, 6 K char cap per doc, stop-word filtered, word-boundary matched. Drop zone now persists into active chat (label flips to `Add another file (N attached)` when files exist) and chat-attached files now auto-save into YourVault with extracted text content (so future YourVault-scope retrieval can find them). KP dropdown stays separate alongside Search Within (KPs are bounded user-curated bundles, no scaling problem). Build passes, prod bundle hash to verify after deploy.

**2026-04-30** — Non-code session focused on PM deliverables. Generated **`YourAI_WBS.xlsx`** — Work Breakdown Structure scope reference: 5 sheets (Overview + Tenant Chat + Super Admin + Org Admin + Shared & Infra), 35 modules / 85 sub-modules / 550 features, 86.7% completion weighted. Saved to `/Users/admin/Downloads/scope-creator-ai/.claude/worktrees/great-banach/YourAI_WBS.xlsx` and Desktop. Then generated **`YourAI_Delivery_Tracker.xlsx`** — feature-level delivery tracker for FE / BE / AI engineering leads to fill in: 7 sheets (Instructions + Tenant Chat + Super Admin + Org Admin + API & Backend + AI · Python + RAID). First-pass v1 was 471 platform feature rows exploded from WBS bullets — too granular ("As a PM, i want feature wise clarity, this is way way technical"). Re-rolled to v2 at PM-level: **257 platform feature rows** (137 Tenant Chat + 61 SA + 59 Org), each row a user-facing capability not an implementation chrome bullet. Pre-tagged with team ownership / priority / phase / dependencies; FE / BE / AI status & dates blank for leads. Engineering sheets (89 API endpoints, 90 AI tasks across 17 capabilities, 27 RAID entries) deliberately stay at engineering granularity — different audience. Status dropdowns + conditional formatting (Done=green / In Progress=yellow / Blocked=red / In Review=blue) + auto-filters + freeze panes set up so the file is usable for stand-ups out of the box. Saved both Excel files to Desktop. Then captured **format specs** for both deliverables in `.claude-context/wbs-format.md` and `.claude-context/delivery-tracker-format.md` so future sessions can reproduce the structure without re-deriving. CLAUDE.md `.claude-context/` index updated to reference both new docs (also fixed drift by adding 3 previously-orphaned context files: `vault-content-rag-plan.md`, `himanshu-knowledge.md`, `ai-chat-regression-set.md`). Reference Python builders in `/tmp/build_wbs.py`, `/tmp/build_tracker.py`, `/tmp/build_tracker_v2.py`. Granularity convention discovered: for tracker docs, features must be PM-level user-facing capabilities (~3-6 per sub-module), NOT implementation-level chrome (CSS, hex codes, library internals, defensive guards). Implementation chrome belongs in WBS Notes column or in nothing at all.

**2026-04-29** — Heavy day across multiple surfaces. **YourVault** rename portal-wide (sidebar / page titles / modal headers / tile labels / route titles); code symbols + storage keys deliberately untouched. **YourVault table** root-view column order changed to **Folder → Name → Owner → Size → Modified → Actions** with Folder bolded as the primary "case file" identifier (Ryan Robertson framing). **New Document modal** field order changed to **Folder → Document name → Description → File**. **YourVault toolbar cleanup** — Sort pill and the duplicate `FOLDERS` chip strip both removed (left rail is the single folder-nav surface). **Chat empty-state restructure (Ryan's spec)** — full layout rewrite: hero → big primary input under hero → drop-files tile → merged icon-pill row → trust footer. Source dropdown (`General Chat` / `Workspace ▸` / `YourVault ▸`) replaces the `+` attach button; KP dropdown sits alongside. Skipped per PM call: Google Drive option, model selector, NotebookLM-style "search the web" surface. **Capability-grid attempt earlier in the day was reverted same-day** after the PM saw it live ("the entire page is too god damn long, this is so wrong") — chip-in-input pattern reverted at the same time; both added to CLAUDE.md's do-not-reintroduce list. **Aashna's P1 polish** initially shipped at the standalone `/chatviewv2` preview slug for A/B with Ryan, then promoted to `/chat` and the preview surface deleted (component, route, prop, viewport-state aliases all gone): hero `paddingTop` 8vh → 12vh, larger greeting, vertical rhythm 16/12/18 → 40/28/28 px, `<900px` viewport caps the merged-pill row at 4 visible, `<768px` viewport stacks the input row vertically. **Active pill reverted to solid navy fill** (Aashna recommended outline; PM had final call). **Intent-pick override fix** — `sendMessage`'s two auto-switch paths were silently overriding manual user picks; new `hasManualIntentPick` flag gates both auto-switches and is set wherever the user explicitly picks an intent (cleared in `handleNewThread`). **Chat search** extended from title-only to title-OR-preview-OR-message-content, case-insensitive; matched-on-body rows show an italic 80-char snippet preview in place of the standard meta line. **Pre-fill auto-grow fix** — `setInput()` programmatic value updates don't fire the textarea's `onInput`, so a `useEffect` watching `input` now runs the auto-resize. **Drop-files tile shrunk** from a 96 px stacked block to a single ~44 px inline strip. **More pill renamed to "More operations"**. **FRD authoring formalised** with `docs/frd-template.md`; first FRD authored against it is `docs/extracted/FRD_Intent_Cards.md` (615 lines, all 8 cards, 46 QA scenarios). **Vercel webhook hiccup** caught and resolved by an empty-commit retrigger after a normal push silently failed to flip the prod bundle. CLAUDE.md updated with two new gotchas (programmatic setState doesn't fire DOM events; auto-switch must respect manual picks), the Vercel webhook retrigger pattern, and a do-not-reintroduce list (capability grid, chip-in-input, NotebookLM-style sources modal). Final prod bundle: `index-DgbYKmFd.js`.

**2026-04-28** — Authored `docs/extracted/intent-cards.md`, a per-card scope reference covering all 8 intent-card components (intent ID, trigger, source pill, accent color, shell, data shape, render structure, populated / empty / partial states, edge cases, source files) plus the shared chrome shells. Then unified all 8 cards on a single `EditorialShell` — `SummaryCard` (gold), `ComparisonCard` (navy), `CaseBriefCard` (green), `ResearchBriefCard` (indigo), and `FileResultsCard` (teal) migrated off the older `CardShell` / `CardHeader` / `CardFooter` trio onto `EditorialShell` + `EditorialHeader` + `EditorialFooter`. `EditorialShell` now accepts an `accentColor` prop (defaults to gold so the existing Risk / Clause / Timeline cards render unchanged); per-intent accent tokens exported as `ACCENTS.gold | navy | green | indigo | teal`. Body padding standardised to `26 32 28`, source pill prop renamed `type` → `kind` across migrated cards, footer pattern unified on text-only `EditorialFooter`. FileResultsCard cleanup: dropped the synthetic `Personal vault · N matches` sourceName, dropped the trio of inline button style objects in favour of one shared `InlineButton` component (variant `primary | outline`), unified body padding between empty-state and result-row variants. Deleted `CardShell.tsx` / `CardHeader.tsx` / `CardFooter.tsx` — no remaining importers in the intent-card system. Resolves "What's next #13".

**2026-04-28** — Shipped P8 MVP **find-document intent** for in-chat vault search: explicit "Find Document" pill in the intent dropdown plus keyword auto-switch (find / search / where is / do I have / show me / list, anchored on file/doc/document). New `FileResultsCard` renders state-aware variants (empty vault, empty query, no match, 1 / 2-5 / top 5 of N) with teal accent; ChatView short-circuits the `/api/chat` fetch when the intent fires, runs a substring filter over name + description + fileName + folder breadcrumb across the personal vault, and routes the row `Use` button through the existing `handleSelectVaultDocument` (clean since this morning's bug-fix commit) via window events.

**2026-04-28** — Reverted "Case Workspaces" → "Workspaces". Removed the stale "One attachment per chat" gold callout from the chat empty state and the onboarding payment-confirm screen (the rule was killed yesterday). Fixed the persistent-filter bug in Vault search: typing in the bar or clicking "All documents" in the tree now drops AI-set transient filters (`resultLimit`, `askExplanation`, sort), while explicit chip filters (date / uploader / type) stay set. Bundle hash on prod: `index-DySlL7FR.js`.

**2026-04-27** — Big day. Six commits ahead of `yourai/main` at peak, before merging in batches. Across the day shipped: nested folders + recursive upload + UI label cleanup in Vault (Wendy P3 / P4 / P5), onboarding restructure + invited-user fast path (P1 / P2), tile-based home at `/chat/home` with role-aware tiles + the sidebar Home button + Dashboard→Chat rename + dynamic active state, full-page two-pane redesign of Vault & Knowledge Packs per Aashna review (left rail + hero + table; kebab menu for row actions; pack cards flipped to vertical), Workspaces ↔ Case Workspaces rename (later reverted), additive uploads with inline "Start fresh →" escape hatch (Wendy P7, supersedes DEC-095), the doc-inlining fix that finally pipes file content into the Edge message body (covers pendingAttachments, sessionDocContext, activeVaultDocument, activeVaultFolder), `closeAllPanels()` helper for full-page panel mutual exclusion, the Vault Find/Search-in-page feature with filter chips + Ask-anything NL parser (P8 v1, Option 2), and **real PDFs as seed vault docs** (4 actual files in `public/sample-docs/` + `content` field stamped on each entry so the AI grounds in the real text). Bumped localStorage seed key to `yourai_document_vault_v2`. Bundle hash on prod: `index-Bk1nY4mu.js`.

**2026-04-25** — Aashna sent two fresh batches of mockup PDFs (picker chat-mode + 8 builder views). Rewrote the **Workflows picker** (single unified grid with no maxWidth cap, AI PIPELINES eyebrow, Running-in pill, restacked StatTiles, underline filter tabs, restored practice-area top stripe, PIPELINE op-icon row) and the **Workflow Builder** end-to-end (centered hero with step-pill indicator, white rounded panel body, navy step-number circles, in-panel CTAs, uppercase mono section labels, warm-beige reference-doc inset). Then fixed three connected runtime issues: (1) all 7 intent cards now render a friendly "No document supplied" empty-state instead of grids of `—` dashes when the LLM returns a schema-shaped envelope with no data; (2) Edge `api/chat.ts` system prompt got a `MISSING DOCUMENT HANDLING` branch so the bot asks for an upload instead of off-topic-refusing legitimate analysis requests; (3) `WorkspaceChatView` was still calling the dead `callLLM` path — routed it through `/api/chat` like everything else. Also cleaned up `ChatView`'s misleading "No LLM backend available" fallback so real Edge errors surface verbatim, dropped vestigial `credentials: 'include'`, added trailing decoder flush. Prod HEAD tracking `yourai/main` — verify with `curl -s https://yourai-black.vercel.app/chat | grep -oE 'index-[A-Za-z0-9_-]+\.js'`.

**2026-04-24 (afternoon)** — Follow-up session: applied aashna's round-3 fixes (picker grid `maxWidth: 960` cap on all three sections — *later removed in 2026-04-25 picker rewrite* — + audit-log modal step-number neutralisation with soft gray pill + dropped duplicate operation label in subtitle), wired `classifyDocs()` into `PreRunModal` (auto-classification on upload ready, per-row uppercase type chip, summary banner), and v2-tightened all 6 workflow operation prompts with word targets + citation hedging + explicit table syntax + findings-vs-actions distinctness rule.

**2026-04-24** — Session focused on: empty-state anchor + 880px container rewrite, sidebar refresh (Search Chats, ⌘N New Chat, Invite Team widened), full aashna-led UX pass across Workflows panel + Builder + Run Panel, real LLM execution via `/api/chat` (workflowPrompts + workflowExecutor), document-style report (Option D), and three FRDs on Desktop (Workflows, Workflow Operations, Incorrect Document Handling).
