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
- Workspace section: Dashboard (Org Admin — opens OrgDashboardPanel, org admins' landing surface on `/chat`), Workspaces, Clients (Org Admin), **Invite Team** (all non-External users — widened from Org-Admin-only so the CTA stays discoverable)
- Knowledge section: Document vault, Knowledge packs, Workflows, Prompt templates
- Admin section: Audit Logs, Billing (Org Admin)
- Recent Chats with dimmed search glyph (the top-level Search Chats already covers it)

### Top bar / TopNav model selector (2026-05-09)
- Small `YourAI` wordmark on top-left (balances the right side)
- Doc counter + subtle vertical divider + `< Main Site` link grouped together
- Search box on the far right
- **`TopNav` model selector** (all users, all roles): `YourAI · {model name}` pill always visible. Hamburger is `md:hidden` (mobile only — moved there when model selector was added). 4-model dropdown: Claude 3.7 Sonnet (Default) / Claude 3.5 Haiku (Fast) / GPT-4o / Gemini 1.5 Pro. UI only — no backend wiring. Closes on outside click.

### Org Admin Dashboard (2026-05-09)
- **`OrgDashboardPanel`** in `ChatView.jsx` — org admins' first view on `/chat` (replaces the general chat empty state for that role).
- 4 stat cards from live ChatView state: Workspaces / Team Members / Vault Documents / Knowledge Packs.
- Quick actions (directly below metrics): New Workspace → Workspaces panel; Upload Documents → Document Vault; Add Team Member → Invite Team.
- Plan Usage bars: Workspaces / Vault Docs / Knowledge Packs / Team Members (limits: 10 / 2000 / 10 / 25).
- Activity Feed + Plan Usage two-column layout below quick actions.
- Follows the standard full-page sibling panel pattern — in `closeAllPanels()`, in "hide chat" condition.

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

### Knowledge Packs — full lifecycle + real grounding (2026-05-06)
- Browse, create, edit, delete; org-wide vs personal scope; share toggle
- Pack docs carry real `content` (extracted text). Seed packs ship with realistic legal text via `src/data/samplePackContent.ts` (NDA template + risk checklist + redline; M&A diligence checklist + Meridian precedent + indemnification clauses; CA Labor Code summary + § 16600 / Edwards rule; GDPR + CCPA)
- Custom packs: when a user uploads a doc into a pack, real text extraction runs via `extractFileText` (`src/lib/file-parser.ts`) — same parser the chat attach pipeline uses. Was a status-pill timer only before 2026-05-06
- Active pack content inlined into `messageForEdge` under a `[Knowledge Pack reference for this conversation]` header so the Edge model can ground answers in real pack text. Per-doc cap 5,000 chars
- Persistence: `knowledgePacks` state hydrates from / saves to localStorage under `yourai_knowledge_packs_v1` via `src/lib/knowledgePackStore.ts` (mirrors `documentVaultStore.ts` pattern). Refresh no longer wipes user-created packs
- Source pill on a pack-grounded answer reads "Answered from: {pack name}"
- Independent of intent — changing intent never changes the active pack
- Sprint-2 follow-ups: link fetching (links save metadata-only today, no grounding); promoting Mine packs to org-wide via the share toggle

### Document Vault
- Upload, select as active, role-scoped visibility (Mine / Org-wide), nested folders, recursive upload
- Real PDFs as seed docs + extracted text on every entry (see vault-specific sections below)
- Independent of intent

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

### Chat empty-state input — final shape (2026-04-30 → 2026-05-01)
Iterated through three stepping-stones in one evening (per-item submenus → three-scope dropdown → verb toggle pair) before landing on the simplest shape that actually fits user mental models. Final wire:

```
[ + ▾ ]   [textarea]   [No pack ▾]   [↑]
   │
   └── popover: FROM YOUR VAULT
       ┌─ search input (always on, autofocus) ──┐
       ├─ Detach X (only when one is pinned) ──┤
       ├─ doc list with folder breadcrumb ─────┤
       └─ Open YourVault → ────────────────────┘

[ Drop files or click to upload  · saved to YourVault ]   ← persists in chat
```

- **+ button** — single attach affordance. Default = `+`. With a doc pinned = `+ Attached` with navy ring/tint. Click = popover with always-on search input + filtered list of every YourVault doc + footer link to the full Vault page. No toggle, no scope picker, no submenus, no AI auto-retrieve mode. User searches by name or folder, clicks to pin, the doc lives as `activeVaultDocument` and gets inlined into the next send.
- **Drop zone** — persists *throughout* the conversation (both the `showEmptyState` and `pendingAttachments.length === 0` gates were dropped). Label flips to `Add another file (N attached)` once files exist. Files dropped here flow through `handleAttachFiles` → render as removable chips above the input AND auto-save into YourVault with their extracted text content (`vaultIdByFileName` map; extraction `.then()` backfills the entry's `content` if it wasn't already populated). One drop, the file lives in the corpus forever.
- **KP dropdown** stays separate to the right of the textarea, now with the same search-first picker pattern (sticky search input only when >5 packs; "Manage knowledge packs →" footer routes to the full KP page).
- **Verb-bucketed intent dropdowns** — `src/lib/intents.ts` exports `INTENT_BUCKETS` (DEFAULT / ASK & RESEARCH / ANALYZE / DRAFT) + `groupIntentsByBucket()` that filters empty buckets and preserves canonical order. Both the populated-chat collapsed-pill dropdown and the empty-state "More operations" overflow render from this. Headers are 11 px / 700 weight / `--text-primary` with 0.14em tracking; non-first buckets get a navy 2% wash + 1 px top-border.
- **Textarea scrollbar artefact suppressed** — a vertical scrollbar appeared between the textarea and the KP dropdown on macOS "Always show scrollbars" mode. Hidden via `::-webkit-scrollbar { width: 0 }` + `scrollbar-width: none` on the existing `.no-focus-ring` class. Scroll still works (mouse-wheel + arrow keys) when content overflows the maxHeight cap.

What got deleted in the iteration:
- `searchScope: 'files' | 'vault' | 'workspaces'` state and the three-option `SCOPE_META` dropdown (too abstract — users don't think in scopes)
- `searchMyDocs: boolean` toggle and the `vaultScopeContext` token-overlap retrieval branch in `sendMessage` (overengineered — users want to find a specific doc, not toggle an AI auto-retrieve mode)
- The two-pill side-by-side layout (Search my docs + From YourVault) (too much weight on the input row)
- `isSourceMenuOpen`, `isSourceWorkspaceSubOpen`, `isSourceVaultSubOpen`, `sourceMenuRef`, `SCOPE_OPTIONS` and the per-item submenu enumerations

### Card-intent artifact panel — chip + right rail + markdown (2026-05-04)
- Card responses (Risk Memo, Summary, Comparison, Case Brief, Research, Clause Analysis, Timeline) render as a **compact chip** in chat (eyebrow + DM Serif title + Open / Viewing pill) plus a **540 px right-docked artifact panel** that auto-opens on first arrival. Panel is a sibling of chat-main — chat shrinks; not an overlay.
- Header: eyebrow + label + Copy-as-Markdown / Fullscreen / Close. Fullscreen mode renders as a centered ~720 px column.
- Body is **plain markdown via ReactMarkdown** — no card chrome, no pills, no tiles, no gold rails. Per-intent serializers in `src/lib/cardToMarkdown.ts` turn each card's structured JSON into a clean memo (h1 + meta line + h2 sections + bullets + plain blockquotes).
- `pickTitle(d, fallbackLabel)` rejects generic LLM-emitted titles (`Risk Assessment of Uploaded Documents`, `Untitled case`, `Legal Inquiry`, `This document`) and falls back to documentName / sourceName / intent label.
- `find_document` keeps inline FileResultsCard rendering — search results read better in the conversation flow.
- Click chip → reopens panel. Switching demos (`/demo-risk` → `/demo-summary`) updates the panel to the new artifact.
- New files: `src/components/chat/IntentArtifactPanel.tsx` (~190 lines), `src/lib/cardToMarkdown.ts` (~340 lines).
- Convention reference: `.claude-context/artifact-panel-pattern.md`.

### Doc-source confirmation when card intent + already-attached docs (2026-05-04)
- When user asks for a card analysis with documents in session context, bot pauses and asks **as plain prose** (not a styled card):
  > *I see you have **{Doc Name}** attached. Should I run **{Intent Label}** on this document, or would you like to upload a new one?*
  >
  > Yes, use it · I'll upload a new one
- Two inline `<a>` text links — `Yes, use it` (navy) and `I'll upload a new one` (muted secondary). Click "Yes" → re-fires `sendMessage` with `skipDocConfirmation: true`. Click "Upload new" → swaps message to "OK — drop the new document via the + button…".
- **Gate uses `willBeCardIntent`** (computed via `detectIntent` look-ahead) instead of the live `activeIntent`, so the confirmation also fires when the user is on General Chat and types "Do clause analysis of attached doc". The auto-switch happens AFTER the confirmation, not before.
- Intent label in the prose comes from `willBeCardIntent` so the user sees "Should I run **Clause Analysis** on these" even before the visible intent pill flips.

### Chit-chat → LLM, not static replies (2026-05-04)
- Card intent + chit-chat ("hi", "how are you", "what can you do") + no doc → would have hit the JSON-card path with response_format forcing a schema → empty-state card. Now intercepted client-side: `edgeIntent` flips to `'general_chat'` (so Edge does NOT force JSON), `messageForEdge` gets a context preamble naming the active card intent + telling the LLM to respond warmly + remind the user what to upload, prose only, ≤80 words.
- User's chat bubble shows the original message; only the Edge sees the augmented version. Bot-message metadata flips to `intent: 'general_chat'` when override fires so downstream filters / card dispatchers don't try to render this as structured.
- Detection regex (`CHIT_CHAT_RE` + `ANALYSIS_VERBS` heuristic) covers ~40 patterns plus a length-≤60-with-no-analysis-verb fallback.

### `extractionPromisesRef` — await text extraction before send (2026-05-04)
- `extractFileText` is async; first-turn sends used to ship a `[File: …] Text extraction is still in progress…` placeholder and the LLM read it as "no doc attached".
- New `useRef<Map<attachmentId, Promise<text>>>()`. `handleAttachFiles` stores each promise. `sendMessage` awaits unresolved promises (12 s max) for the current `pendingAttachments` before assembling `messageForEdge`, then re-resolves content from promise return values (state may not have applied within the same async tick).
- When adding new code paths that read `pendingAttachments[i].content`, check this ref.

### Lovable references purged (2026-05-04)
- `vite.config.ts` (lovable-tagger import + plugin removed), `package.json` (devDep dropped), `package-lock.json` (regenerated), `README.md` (rewrote intro), `CLAUDE.md` (one-line description updated). Zero `lovable` matches in tracked files.

### Tile-based home retired — General Chat is the landing surface (2026-04-30)
- The `/chat/home` tile launcher screen (six tiles: General Chat / Workspaces / YourVault / Workflows / Knowledge Packs / Invite Team) was removed. Non-external users now land directly on `/chat` (General Chat); externals still go to `/chat/workspaces`. The empty-state pill row + drop zone + `+` attach surface the same entry points the tiles used to without the extra click.
- A `Navigate to="/chat" replace` route catches stale `/chat/home` bookmarks so they don't render an empty body (React Router has no other catch-all).
- Touchpoints: `App.jsx` route deleted + redirect added; `RouteTitle.jsx` entry deleted; `Login.jsx` / `SignUp.jsx` / `Onboarding.jsx` post-flow navigates updated; `ChatView.jsx` lost its `HomeTileLauncher` function (~140 lines), the `ArrowRight` lucide alias, the sidebar Home item + `onGoHome` prop, the `initialView === 'home'` branch in `sidebarActiveKey`, and the conditional render block.

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

### External user routing + workspace sidebar Sign out (2026-05-05)
- **External users always land on `/chat/workspaces`** regardless of how many workspaces they have. The prior single-workspace short-circuit in `ChatView`'s external-user routing effect (route straight to `/chat/workspaces/:id` when the user had exactly one assigned workspace) is gone. The list page is the stable landing surface for every external user — it's also the only surface that exposes the main `Sidebar` (with its profile menu + Sign out).
- **`WorkspaceSidebar` (in `WorkspaceChatView.tsx`) now has a footer with user identity + Sign out** for every role. Footer order: avatar circle (initials) + name + email → conditional `Workspace Settings` (only when `canManageWorkspace`) → `Sign out` (always). Sign out path mirrors the main `Sidebar`: `useAuth().logout()` → `navigate('/chat/login')`. Internal users navigating into a workspace had the same gap as externals — fix is symmetric across roles.

---

## What's currently in progress

*(Arjun is showing the prod build to the client — Wendy attorney + Ryan Hoke / Robertson — and iterating off their feedback in real time. Parallel track: dev team has ingested the wireframe and is building the real backend at `youraillc-pwa-dev.appskeeper.in`; Arjun is now QA-ing their build and feeding bugs / prompt rewrites back to them.)*

- **Dev team handoff cycle is now live** (2026-05-18 → 2026-05-19): three deliverables on Desktop for them — `YourAI_Chat_Bug_Report.docx` (14 bugs from QA pass, 6 P0), `YourAI_Bot_Persona_Prompts.docx` (lean field-values doc for their SA Bot Persona view), `YourAI_Chat_Vault_Test_Suite.md` (176-case autonomous regression suite for Claude Code + Playwright). Awaiting their first iteration on the P0s (grounding-gate refusal on every prompt, vault upload 500, drafting refused as security event, no multi-turn memory).

- **Full-page panel chrome is now uniform across Vault / KP / Workspaces / Workflows** (2026-05-11): warm `#FBFAF7` outer surface + `#fff` top bar + 12×28 top-bar padding + 28px hero/scroll padding. Segmented filter pills (Workflows / Prompt Templates / KP / Vault scope tabs) all share the same chrome — white container + 1px `#e2e3e7` border + gold-bg active.
- **Org Admin Dashboard build-out (2026-05-09 → 2026-05-11)**: `OrgDashboardPanel` ships 4 live stat cards + quick actions + Activity Feed + Plan Usage + Cost by Client donut + Top Workflows / Top Users visual cards. Most content beyond the live counts is mocked from `data/mockData.js` — wire to real telemetry once backend lands.
- **In-portal `BillingPanel` for org admins (2026-05-11)**: replaces the prior `/app/billing` redirect. Same full-page sibling pattern as `OrgDashboardPanel`. Content mirrors `OrgBilling.jsx`.
- **Vault left rail is MATTERS-only** (2026-05-11): cross-matter filter pills moved beneath the search bar; the user-folders block was dropped per PM.
- **Chat input `+` button = direct file-picker click** (2026-05-11): YourVault attachment moved into the SEARCH WITHIN dropdown (third option: Knowledge Packs replaces the visual-only Workspaces).
- **Chat surfaces remain settled from 2026-05-04 evening.** Three big architectural moves landed and verified clean by Himanshu QA: (1) card-intent results render in the right-rail artifact panel as markdown, (2) doc-source confirmation gates card analyses when docs are attached, (3) chit-chat on card intents goes through the LLM via general_chat override. Plus the chat-killer ReferenceError was root-caused and fixed (was breaking every send including General Chat). All twelve commits deployed. Bundle: `index-D6rEeq-C.js`.
- **Three-scope SearchScope dropdown is back** (designer-driven reversal of the 2026-04-30 retirement) — see Recent decisions for the framing. Workspaces option is visual-only; YourVault opens a real doc-picker modal.
- **Source / Pack pills row in empty-state Optional box is back** (designer-driven reversal). KP picker is now a modal that mirrors the YourVault picker.
- **Lovable references purged from the project** — `vite.config.ts` (lovable-tagger plugin removed), `package.json` (devDep dropped), README + CLAUDE.md updated. Zero `lovable` matches remain in tracked files.
- **Vault rebrand to YourVault** is shipped portal-wide on the user-facing strings; code symbols (`documentVault`, `DocumentVaultPanel`, etc.) and storage keys deliberately left unchanged so the patch is string-level.
- **Wendy's P-list** from the 2026-04-27 client interview remains a parallel driver. Shipped to date: P1, P2, P3, P4, P5, P7 + the Aashna-led full-page redesign of YourVault & KP + the Find/Search-in-YourVault feature (P8 v1 — Option 2). Backlog: P6 (Workspaces rename — done then reverted, currently *not* renamed), P8.2/P8.3/P8.4 (content RAG, metadata enrichment, large-library indexing), P9 (default state-law KP), P10 (Lexus / West integration), P11 (default-open-within-firm flag flip), P12 (large-file 500-page strategy).
- **Sample seed docs are now real PDFs with extracted content** stamped onto each entry. Future doc additions to the seed need to go through the same pipeline (`/tmp/gen-sample-pdfs.py` reads `src/data/sampleVaultContent.ts`, regenerates `public/sample-docs/*.pdf`).
- **`hasManualIntentPick` pattern in main `ChatView`** now gates the auto-switch paths against deliberate user picks. `WorkspaceChatView` may need the same treatment — not yet audited.
- **Responsive design audit** raised by PM ("CSS html is really bad, sometimes I have to zoom out … should work on laptops, bigger laptops, desktop, mobiles, tablets"). I scoped a focused first-wave on tenant chat (define `useViewport()` hook + 5 breakpoints + fix chat surface end-to-end + sidebar collapse) and asked which specific viewports/surfaces have actually broken. Awaiting PM go-ahead before executing — the wider responsive pass across SuperAdmin / panels / workflow builder is days of work, not an afternoon.

---

## What's next

Short list of probable next priorities based on today's direction — **user should confirm or reorder**:

0. **Hand the three Desktop deliverables to the dev team** (Bug Report DOCX, Bot Persona Prompts DOCX, Test Suite MD). Confirm with their lead which P0s they'll take first; the grounding-gate refusal is the single biggest unlock — fixing it lights up 6 of 11 enabled intents. Ask them to also share their /api/v1 schema once they update the intents table so we can stop pasting field values and start sending JSON.
0a. **Re-test the dev team's build** once they ship the first round of fixes. The test-suite MD is the canonical regression set — drop it into their Claude Code with Playwright MCP attached and run all 176 cases; or run it on Arjun's side and feed the resulting bug-report MD back to them. Either way, before flipping any "ready for client demo" switch on their build.
0b. **Iterate prompts once we see real output**. The claude-for-legal-derived prompts are draft v1 — they assume the dev team's pipeline lets the system prompt actually reach the LLM (no aggressive RAG-only template wrapping it). If their pipeline does wrap the prompt, we'll need to rework the format for whatever template envelope they're using. Wait for first test run before iterating further.
0c. ~~**Audit Logs sidebar entry is a no-op**~~ — shipped 2026-05-11 (`AuditLogsPanel`, commit `f131f6d`). MVP scope: 5 categories, 16 event types, 2 filters, CSV export. See the 2026-05-11 session entry below for details.
1. **Mirror the artifact panel pattern in `WorkspaceChatView`**. Workspace chat still renders cards inline. The artifact panel + chip + cardToMarkdown serializers are reusable; the only piece missing is the state hookup and the layout (workspace chat is already laid out as a flex container, so the panel can be a sibling).
2. **Add new card intents through `cardToMarkdown.ts`** — when expanding the intent system, write the per-intent serializer first; the panel picks it up automatically. See `.claude-context/artifact-panel-pattern.md` for the conventions.
3. **Edge-side prompt tuning to emit better matterName**. The `pickTitle()` heuristic is a defensive client-side fix; the root cause is the LLM emitting "Risk Assessment of Uploaded Documents" / "Untitled case" for trivial prompts. The system prompt at `api/chat.ts` should explicitly tell the LLM to use the document filename as matterName when no real matter is in scope.
4. **Responsive design first-wave on tenant chat** (PM raised 2026-04-30, still awaiting go-ahead). Define `useViewport()` hook in `src/lib/breakpoints.ts` (mobile <640, tablet 640–1023, laptop 1024–1439, desktop 1440–1919, wide 1920+). Fix the chat empty + populated states + the popovers + the artifact panel (does it slide over on mobile? become a fullscreen takeover?) at all five breakpoints. Sidebar collapse: <1024 px slide-over, <640 px hamburger trigger. Smoke-test all five with headless Chrome screenshots. NOT in scope: SuperAdmin portal, full-page panels (Vault/KP/Workspaces), workflow builder, workspace chat — each is a separate pass. Need PM to confirm scope + share specific viewports they've seen break before starting.
1. **Send the Delivery Tracker to FE / BE / AI/Python leads** so they can fill in their team-specific cells (Owner / Status / Start / ETA / Effort). Weekly stand-up will read across the file. Optional follow-up: build a Sprint Plan cover sheet once leads have entered ETAs.
2. **Extend the `hasManualIntentPick` pattern to `WorkspaceChatView`** if the same auto-switch-overrides-manual-pick regression surfaces there — workspace chat has its own intent-detection code path that hasn't been audited for this yet.
3. **Bring back YourVault scope retrieval as a different affordance** if attorneys ask for "search across all my docs" — the wiring is gone but the relevance-scoring pattern (token overlap, top-5, 6 K cap, stop-word filter, word-boundary regex) is well-understood. Don't reintroduce as a UI toggle; possible re-entries: (a) when no doc is attached and the question is about an unspecified doc, silently retrieve top matches and show them as citations; (b) a separate "ask across YourVault" action under the Vault page.
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
13. Reconcile the 3 sources of truth for intents (`intents.ts` / `intentDetector.ts` / `GlobalKnowledgeBase.jsx DEFAULT_INTENTS`).
14. Server-side fix for the JSON-schema-with-no-document failure mode at the Edge.

---

## Blockers / open questions

- **Dev team's grounding-gate fix**: the canned `"knowledge base does not have sufficient coverage on this topic"` refusal on 6/11 enabled intents is a pipeline-level fix only they can make — prompt rewrites alone don't bypass the gate. Their backend (Amazon Nova Lite, 2-pass `chat_system_reasoning_v1` → `grounding_rewrite_v1` template, hard `low_overlap < ~0.55` refusal) needs to be reworked so drafting / chit-chat / public-law-Q&A prompts go through the LLM with general-knowledge fallback, not the RAG gate. Until this is fixed, no amount of prompt iteration will surface improvement.
- **Dev team's security filter**: a benign NDA-drafting prompt returns `security_block:high` with an empty answer body. Re-tuning is their backend work. Even when refused, the UI must show a non-empty user-visible explanation rather than a blank bubble.
- **Vault upload 500** on the dev build (`POST /api/v1/vault/upload`). Blocks the entire document-required intent set (Contract Review / Document Summarisation / Risk Assessment / Case Law Analysis / Clause Comparison) end-to-end — you can't upload, so you can't use them.
- **No multi-turn memory** on the dev build. Pipeline issue (prior turns not being concatenated into the LLM prompt, or being truncated before reaching the model). Drafting iteration is the core lawyer loop — without memory the product is unusable for the persona it's built for.
- **Test results from Arjun** on the new real-execution path are the primary blocker for the next iteration of operation prompts.
- **Is the Intent management module actually wanted?** Asked in an earlier session, then "Stop" before implementation. Still limbo.
- **Backend folder status** (`backend/` with Prisma + SQLite): intended, deprecated, or pending wiring? Production chat bypasses it.
- **Document Vault / Knowledge Pack → workflow step linking** — a step can attach a reference doc via the Vault picker in the builder, but the broader "my workspace docs should auto-flow to steps that need them" story isn't designed yet.

---

## Recent decisions and why

Reverse chronological. Each entry: *decision — rationale — date*.

- **External-user single-workspace auto-redirect retired; `WorkspaceSidebar` gets its own Sign out** (2026-05-05) — Externals with exactly one assigned workspace used to be routed straight to `/chat/workspaces/:id`, skipping the list page. Two problems converged: (1) `WorkspaceChatView` is a *full replacement* of the chat surface — it mounts its own `WorkspaceSidebar`, which historically had no profile menu / Sign out, only a conditional `Workspace Settings` button for managers. Externals routed straight there had no way to log out of the demo at all. (2) The redirect hard-coded a "one matter per client" mental model that breaks the moment a second matter is assigned and would silently change a user's landing surface from a list to a single chat without warning. Fix is two-part: drop the single-workspace branch from the external-user routing effect in `ChatView` (externals always land on `/chat/workspaces` now), and add a footer to `WorkspaceSidebar` with avatar + name + email + `Sign out` — visible to every role, not just externals (internal users navigating into a workspace had the same gap). Sign-out path mirrors the main `Sidebar`: `useAuth().logout()` → `navigate('/chat/login')`. Convention added to CLAUDE.md: any full-replacement chat surface (not nested in `ChatView`) needs to mirror the auth/profile controls from the main `Sidebar`.

- **Card-intent results render in a Claude-style right-rail artifact panel, body is a markdown report** (2026-05-04) — Card responses (Risk Memo, Summary, Comparison, Case Brief, Research, Clause Analysis, Timeline) used to render the full `IntentCard` editorial component inline in the chat thread — DM Serif title, "DOCUMENTS ANALYSED" sub-section with PDF tile, gold-railed finding blockquotes, severity pills. PM read: "looks like a front-end component, should look like a report — not fancy shit." Two architectural moves: (1) the result moves OUT of the chat into a 540 px right-docked panel that's a sibling of chat-main (chat shrinks; not an overlay), with a compact preview chip in chat that can be clicked to reopen. Auto-opens on first arrival. (2) the panel body is plain markdown via `ReactMarkdown` — h1 + meta line + h2 sections + bullets + plain blockquotes — generated by per-intent serializers in `src/lib/cardToMarkdown.ts` that turn each card's structured JSON into a clean memo. No card chrome — no pills, tiles, gold rails. Reads like a Notion doc / Word file. `find_document` keeps its inline FileResultsCard; search results read better in the conversation flow. New file: `src/components/chat/IntentArtifactPanel.tsx`. Pattern reference doc: `.claude-context/artifact-panel-pattern.md`.

- **`pickTitle()` rejects generic LLM-emitted titles** (2026-05-04) — LLMs love handing back generic phrases ("Risk Assessment of Uploaded Documents", "Untitled case", "Legal Inquiry", "This document") in the matterName / caseName / topic slot when no real name is in scope. The artifact panel's H1 read as a generic placeholder. Added a `GENERIC_TITLE` regex and a `pickTitle(d, fallbackLabel)` helper in `cardToMarkdown.ts` — tries matterName / caseName / topic, rejects if generic, then falls back to documentName / sourceName (extension stripped), then the intent label. All seven serializers route through it. Verified with a 5-case unit test; real titles pass through, generics get replaced by the filename.

- **Chit-chat on card intents → LLM round-trip via `general_chat` override, not static replies** (2026-05-04) — When a user picks a card intent (Risk Assessment, Clause Analysis, etc.) and types a chit-chat message ("hi", "how are you", "what can you do") with no document attached, the Edge would force JSON via `response_format` and emit an empty schema → card empty-state. Reads as "the bot ignored my hello." First attempt: a static prefix dictionary + per-intent body string. Reverted — felt robotic by the third turn (every reply began with "Hi! "). Final approach: flip `edgeIntent` to `'general_chat'` (so the Edge does NOT force JSON) and prepend a context preamble to `messageForEdge` naming the active card intent + telling the LLM "no document attached yet — respond warmly + remind them what to upload, prose only, ≤80 words". User's chat bubble shows their original message; only the Edge sees the augmented version. Bot-message metadata flips to `intent: 'general_chat'` when override fires so downstream filters don't try to render this as structured. Detection regex `CHIT_CHAT_RE` covers ~40 patterns; fallback `length ≤ 60 chars AND no analysis verb` catches everything else.

- **Doc-source confirmation when card intent + already-attached doc** (2026-05-04) — When the user asks for a card analysis with documents already in session context (sessionDocContext / pendingAttachments / activeVaultDocument / activeVaultFolder), the bot should pause and ask instead of silently picking docs. PM screenshot showed a case where the bot mis-fired MISSING_DOCUMENT_HANDLING and asked for an upload even though docs were attached — feels like the bot ignored what the user already gave it. New flow: bot replies as **plain prose with two inline `<a>` text links** ("Yes, use it" / "I'll upload a new one") — NOT a styled card with pill buttons (PM: "should be text-based, not front-end component"). "Yes, use it" → re-fires `sendMessage` with `skipDocConfirmation: true`. "I'll upload a new one" → swaps the message to a hint. **The gate uses `willBeCardIntent` (computed via `detectIntent` look-ahead) instead of the live `activeIntent`**, so the confirmation also fires when the user is on General Chat and types "Do clause analysis of attached doc" — the auto-switch happens AFTER the confirmation, not before, so silently committing to the auto-switch never happens.

- **`extractionPromisesRef` — await text extraction before send** (2026-05-04) — `extractFileText` is async; when the user attached a doc and immediately hit send, `pendingAttachments[i].content` was empty and `messageForEdge` shipped a `[File: …] Text extraction is still in progress…` placeholder. The LLM read that as "no doc attached" and replied with the upload prompt. New ref: a `Map<attachmentId, Promise<text>>` populated by `handleAttachFiles`. `sendMessage` awaits any unresolved promises (12 s max) for the current `pendingAttachments` before assembling `messageForEdge`, then re-resolves content from the promise return values (state may not have applied within the same async tick). When adding any new code path that reads `pendingAttachments[i].content`, account for this ref.

- **Chat-killer ReferenceError — `vaultScopeContext` retired but its read-site survived** (2026-05-04) — The `vaultScopeContext` token-overlap retrieval branch was retired with the 2026-04-30 Search-my-docs cleanup (CLAUDE.md gotcha #14) but its read-site at the "Final assembly" step in `sendMessage` — `const effectiveDocContext = mergedDocContent || vaultSelectionContext || vaultScopeContext;` — survived. Every send threw `ReferenceError: vaultScopeContext is not defined` inside the click handler; the user msg appeared in the thread but the bot reply never mounted. **Affected every intent including General Chat.** Root caused via CDP probe driving Chrome on the dev server. Fix: drop `vaultScopeContext` from the precedence chain. Lesson: when retiring a variable, grep for ALL read sites — not just the assignment. CLAUDE.md gotcha now explicitly notes this.

- **Three-scope SearchScope dropdown is back, with subtitles + breadcrumb** (2026-05-04, designer-driven) — Previously on the do-not-reintroduce list (2026-04-30: "scope abstraction is engineer-speak; users don't think in scopes"). Designer revised the proposal: each scope option now carries a one-line subtitle ("Attached files in this chat · fastest, most precise" / "Firm document library across matters" / "Shared workspace knowledge you can access") that addresses the original objection. A persistent `Current search:` breadcrumb above the input answers "what corpus is the AI using?". YourVault scope option opens the doc-picker modal (so the user picks a specific doc, not an abstract "vault" mode). Workspaces scope option is **visual-only** — no cross-workspace retrieval pipeline; the matter-privilege footgun stays closed. If "search across all my docs" comes back as a real ask, ship it as silent retrieval with citations, not as a chat-input toggle.

- **Source / Pack pills row in empty-state Optional box is back** (2026-05-04, designer-driven) — Previously on the do-not-reintroduce list (Ryan's spec was retired 2026-04-30). Designer's revised spec adds a real YourVault doc-picker modal when the user selects "YourVault" scope, so the user is picking a specific document (not toggling an abstract scope). The pack pill's modal mirror handles the same pattern for Knowledge Packs.

- **Confirmation rendered as prose, not a styled card** (2026-05-04) — First version of the doc-source confirmation was a card with a warm-tint background, doc list, and two pill buttons (`Use attached` / `Upload new`). PM read: should look like part of the chat conversation, not a UI component. Switched to plain prose with two inline `<a>` text links underneath. Same callbacks underneath.

- **`+` searchable picker is the only YourVault attach affordance — no toggles, no scope picker, no submenus** (2026-04-30) — three iterations in one evening converged here. The journey was the lesson: (1) tried per-item submenus, broke at scale because `Workspace ▸` and `YourVault ▸` would have to enumerate everything; (2) tried a three-scope dropdown (File Search / YourVault / Workspaces), PM read "📁 YourVault — so complicated" because "scope" isn't natural language for attorneys; (3) tried a `Search my docs` verb toggle next to a `From YourVault` picker, two affordances with comparable visual weight competed for the row; (4) collapsed into one `+` button that opens a popover with always-on search input + filtered list. The retrieval branch is gone too — users want to find a specific doc and pin it, not toggle an AI auto-retrieve mode. Pattern lesson: when in doubt, replace abstractions with deterministic user picks; reach for AI-auto modes only when the deterministic path is already shipped and falling short. All three retired patterns are on CLAUDE.md's do-not-reintroduce list.

- **All pickers that list user-owned items use the search-first pattern** (2026-04-30) — single sticky search input at the top (autofocus, always on), filtered list below, "Manage / Open …" footer routing to the full management page. Applied to KP dropdown + the new `+` YourVault picker. Earlier compromise of "only show search when >5 items" was retired — even at 4 items typing is faster than scanning, and threshold logic muddies the design. Don't reintroduce flat-list popovers without a search input on libraries that can grow past ~10 items — the listing problem comes back.

- **Workspaces is sidebar navigation, not a chat-input control** (2026-04-30) — was briefly an option in the three-scope Search Within dropdown. Pulled out: cross-workspace search from `/chat` is a confidentiality footgun for law firms (matter privilege between cases), and "Workspaces" inside an attach control reads as "what does this even mean here?". Each workspace chat already RAGs within its own corpus. Switching matters happens via the sidebar Workspaces entry → workspace picker → workspace chat surface.

- **Verb-bucketed intent dropdowns** (2026-04-30) — flat list of 13 intents was a wall of verbs and nouns. Reorganised into four buckets with bold uppercase mono headers (DEFAULT / ASK & RESEARCH / ANALYZE / DRAFT). `INTENT_BUCKETS` + `groupIntentsByBucket()` in `src/lib/intents.ts` are the single source of truth — both the populated-chat dropdown and the empty-state More overflow render from this. When adding a new intent, register it in `INTENTS` AND in `INTENT_BUCKETS` (bucket-less intents silently disappear from both dropdowns). Headers polished to 11 px / 700 weight after first pass at 10 px / 400 read as muted captions.

- **General Chat is the post-login landing surface** (2026-04-30) — `/chat/home` tile launcher (six tiles: General Chat / Workspaces / YourVault / Workflows / Knowledge Packs / Invite Team) was retired. PM read: an extra click without surfacing anything the chat empty state doesn't already cover. Login / signup-invited / onboarding-complete navigate straight to `/chat`; externals still land on `/chat/workspaces`. A `<Navigate to="/chat" replace>` route catches stale `/chat/home` bookmarks.

- **Chat-attached files auto-save into YourVault — including extracted content** (2026-04-30) — the prior auto-add only saved metadata, so YourVault scope retrieval would never find chat-attached docs. New `vaultIdByFileName` map tracks each file's vault entry; the extraction `.then()` backfills `content` (only if not already populated). Drop zone helper text reads "saved to YourVault" so users know files persist beyond the chat.

- **Drop zone persists across the conversation** (2026-04-30) — both prior gates (`showEmptyState && pendingAttachments.length === 0`) dropped. The tile renders below the input throughout the chat with reduced padding in populated state. Label flips to `Add another file (N attached)` when files exist; the chip row above the input handles per-file removal via the X button on each pill.

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

**2026-05-19 (afternoon)** — Shipped the **AI-time meter** end-to-end inside `/chat`. New feature: every chat conversation auto-meters attorney time, surfaces a draft billable event at session-end with an AI-generated description, lets the attorney review-and-approve, and rolls up across the firm in an Org Admin "Time & Billing" view. Anchored on a competitor scan (Clio Manage AI, LeanLaw, Bill4Time, CosmoLex) so we ship US-legal conventions rather than reinvent them. Workspaces integration explicitly out of scope for v1.

**Surface inventory.** Five surfaces, all wired to a single localStorage event store (`yourai_billing_events_v1`) + an org-level settings record (`yourai_billing_settings_v1`):

- `SessionTimerPill` in the chat `TopNav` right side — hidden until first message, then a live HH:MM:SS pill (clock icon + status dot, pulse animation when running). Click → menu with Pause/Resume, **End session & log time**, Discard.
- `BillingDraftModal` triggered on `handleNewThread` or the `yourai:end-session` window event. Shows raw `0:00:36` Active time + `0.1 h · 6 min` rounded-up billable band, matter (required), client, **billable / non-billable toggle**, activity dropdown (firm categories OR UTBMS pairings depending on org setting), AI-generated description, internal notes. Two save paths — Save as draft / Save & approve.
- `MyTimePanel` — sibling panel under the chat sidebar's "My Time" item; status tabs (All / Drafts / Approved / Exported) + search + per-row edit + approve + delete + CSV export. Scoped to current attorney via `attorneyId === operator?.id`.
- `BillingTimePage` at `/app/time-billing` — Org Admin view across the firm. KPIs (entries · billable · non-billable · attorneys · approved). Filters: status tabs · attorney dropdown · date range (Today / 7d / 30d / MTD / All) · search. Bulk "Mark approved as exported." Subtitle reads *"Every billable event your attorneys log via the AI-time meter, across the entire firm. Filter by attorney to drill into one person's time."*
- `OrgSettings → General → Time & Billing` card — E-Billing Mode toggle (OFF = 10 firm categories, ON = 25 UTBMS pairings) + Rate Increment dropdown (0.1 hr / 0.25 hr).

**Conventions we copied (not invented).** Header-anchored pill (Clio / CosmoLex / Bill4Time) · default 0.1-hr round-up · one-timer-at-a-time (CosmoLex) — chat sessions are serial, concurrent timers invite double-billing complaints · activity dropdown not free text · matter captured at draft-confirm time only — forcing it up-front is the #1 reason attorneys abandon timers per the competitor docs · Clio Manage AI pattern: AI generates a polished one-sentence description (15-25 words, past tense, strong verb, no "AI" mention) and the attorney edits before saving · LeanLaw draft → approved → exported workflow · idle pause (2 min) is silent — no modal pop. Source citations in [`docs/extracted/AI_Time_Meter_Research.md`](docs/extracted/AI_Time_Meter_Research.md).

**Architecture notes:**
- `src/lib/sessionTimer.ts` is a **module-level singleton** with a pub-sub `subscribeTimer()` API (mirrors `workflowRunner`) — the timer must outlive component re-renders and sibling-panel swaps. Tick loop runs `setInterval(1000)` to drive both the live HH:MM:SS readout and idle-pause detection. Idle freezes `accumulatedSeconds` at `lastActivityAt` (not `now`) — we don't bill the gap.
- **Switching threads without finalizing discards the prior session** (defensive — better than billing the wrong matter). `handleNewThread` calls `finalizeTimer()` first; the modal opens before any thread-state mutation.
- AI summary calls `/api/chat` with the existing `{ message, history, system }` shape; user content is a transcript of up to 30 messages truncated to 600 chars each. If `/api/chat` is unavailable (e.g. dev env without `OPENAI_API_KEY`), falls back to a deterministic `"Reviewed and analyzed material relating to <first user message>"` stub + shows "Auto-summary unavailable" hint.
- ChatView messages use `{ id, sender: 'user' | 'bot', content }` — I initially assumed `{ role, content }` and got bitten (modal showed "0 messages in this thread" + ignored the transcript). Fixed by normalizing at the modal boundary: `m.sender === 'user' → role: 'user'`, `'bot' → 'assistant'`.
- **Operator null-fallback at the panel boundary**. `useAuth().operator` returns `null` in dev (no real session cookie); without a fallback, saved events got `attorneyId: 'unknown'` and the My Time filter `attorneyId === operator?.id` filtered everything out. Fix: ChatView passes `operator || { id: currentUserId, name: ORG_CURRENT_USER.name }` to both `MyTimePanel` and `BillingDraftModal`. Matches the existing `currentUserId = operator?.id || 'user-ryan'` pattern used elsewhere in the file.

**v1.1 trim during QA (PM call mid-session):** removed `matterNumber` from the BillingEvent model + modal + panel + edit form + CSV header — the field was clutter for solo / small-firm attorneys who use the matter name as the matter identifier. Insurance-defense / corporate-counsel firms that need a separate file number get it via the UTBMS task code anyway.

**Demo seed data.** [`src/data/demoBillingEvents.ts`](src/data/demoBillingEvents.ts) builds **22 realistic events** across **4 attorneys** (Ryan Melade, Sarah Chen, James Wu, Maria Torres) — 4 drafts (today), 12 approved (1-5 days ago), 6 exported (12-19 days ago), 3 non-billable. **22.6 h billable · 2.7 h non-billable** total. Matters: Acme MSA Renewal, TechStart Due Diligence, Bradley v. Patel discovery, Chen Family Trust, Robertson Healthcare HIPAA audit, Acme NDA Review, Acme Vendor MA, Employment Contract — Patel, plus Pro Bono Anchorage Tenant Coalition + Internal YourAI Training (non-billable). Activity codes pulled from the default firm catalog. Dates are relative-to-today (computed at seed time) so the date-range filters always show populated buckets when a client demo runs. Seeded idempotently from ChatView's first-mount `useState` initializer alongside the KP / Vault seeds. **Demo browser lands on a populated My Time view + Org Admin Time & Billing view immediately — no setup required.**

**Out of scope (deferred):**
- Workspace chat integration (`/chat/workspaces/:id` does NOT meter time).
- Mid-session matter switching (attorney must start a new chat to switch matters).
- Sign-out interception (timer is dropped, not auto-saved as draft).
- Cross-device timer state (in-memory only; tab close loses unsaved session).
- LEDES 1998B export (CSV only in v1; structure ready in `billingExport.ts`).
- Hourly rates — not captured per event; Org Admin computes externally.
- PDF export — use browser print on the table view.

**Files added (8):** `src/lib/aiTimeStore.ts` · `src/lib/sessionTimer.ts` · `src/lib/billingExport.ts` · `src/data/demoBillingEvents.ts` · `src/components/chat/SessionTimerPill.jsx` · `src/components/chat/BillingDraftModal.jsx` · `src/components/chat/MyTimePanel.jsx` · `src/pages/org-admin/BillingTimePage.jsx`.
**Files edited (4):** `src/pages/chatbot/ChatView.jsx` (imports, Sidebar prop + "My Time" item, `TopNav` slot, `sendMessage` start hook, `handleNewThread` finalize hook, `yourai:end-session` listener, panel + modal mounts, `closeAllPanels` / `sidebarActiveKey` / display-gate updates, demo seed) · `src/App.jsx` (new route) · `src/components/org-admin/OrgSidebar.jsx` (SYSTEM-section "Time & Billing" item) · `src/pages/org-admin/OrgSettingsPage.jsx` (Time & Billing card on General tab).
**Research doc:** [`docs/extracted/AI_Time_Meter_Research.md`](docs/extracted/AI_Time_Meter_Research.md) — competitor scan (Clio / LeanLaw / Bill4Time / CosmoLex) with source URLs, proposed-system inventory, data model, timer state machine, open questions for PM, screenshot capture script.
**Open questions for PM** (in the research doc): sign-out behaviour (discard vs auto-draft) · hourly rates capture · LEDES export priority · mid-session matter switching · cross-device timer persistence.

Production bundle: `index-CA6wsIOh.js`. End-to-end QA via Playwright MCP: timer pill appears on first send, idle pause works, End-session modal generates the deterministic-fallback summary correctly (dev `/api/chat` returns 401), Save & approve writes the event to the right attorneyId, My Time row renders with badges + KPI split, Org Admin Time & Billing shows all 22 seeded events at 22.6 h.

---

**2026-05-18 → 2026-05-19** — SA Billing action-button fixes + YourVault connector buttons + comprehensive QA pass against the dev team's build + Bot Persona prompt rewrite per `anthropics/claude-for-legal` + autonomous test-suite MD for the dev team. Four deploys to `yourai/main` (`bf43462` → `54890b3` → `009cefc` → `229add1`). Three DOCX + one MD deliverable on Desktop for the dev team. **Major shift**: this session is the first where work split between fixing our wireframe (SA Billing, YourVault connectors, prompts) AND auditing the dev team's working build that's been ingested from our wireframe — so the deliverables now include things meant for *them* to apply against *their* backend, not just code changes we deploy.

**SA Billing & Subscriptions — action buttons fixed then trimmed.** PM screenshot showed the Subscriptions row's Pencil + Receipt-as-`$`-in-a-box + envelope icons looking broken. First pass normalised all action icons (size 15, consistent hover-transition class, `Receipt` → `FileText` because the small icon was misreading as currency) and wired the three previously-no-op buttons (`View Invoice` → new modal showing the latest txn or synthesised invoice; `Contact Admin` → `mailto:` with prefilled subject/body referencing the org's plan + failed-payment status if applicable; `Delete plan` on the Plans tab → `window.confirm()` + filter from state). Then PM reported prod still broken: **Pencil click did nothing** even with the new icons. Root cause was a `billingMeta` symbol referenced in the Change Plan modal that doesn't exist anywhere in the component — clicking Pencil triggered `ReferenceError: billingMeta is not defined` inside the modal's render, so the modal silently failed to mount and the click looked dead. Fixed by reading `nextRenewal` off the tenant directly (line `Active since: … · Next renewal: {overrideOrg.nextRenewal || '—'}`). **Then PM said: "Remove pencil icon, as we don't have any plan change functionality from SA"** — so the whole Change Plan path came out: button, `openPlanOverride()`, `handleApplyPlanChange()`, all `override*` state (`overrideOrg / overrideSelectedPlan / overrideReason / overrideCustomReason / overrideNotes / overrideEffective / overrideError`), the `OVERRIDE_REASONS` const, the entire 215-line plan-override modal, the `currentPlanIdx`/`selectedPlanIdx`/`isDowngrade`/`isUpgrade` derived state, and the `Check` + `CheckCircle` lucide imports (used only by the modal). Clock-button Override History viewer is the only remaining action that touches `override*` data, deliberately kept since it shows historical overrides applied via other paths.

**Modal component now takes a `maxWidth` prop** (default 480) + caps at `maxHeight: 90vh` with `overflowY: auto`. Plan Override History uses `maxWidth={880}` with `tableLayout: fixed` + per-column widths so the Reason column gets the slack instead of squeezing the Date cell into vertical text (PM screenshot showed Date wrapping to one digit per line because the modal was 480 px wide and the table had 5 columns).

**YourVault hero — three connector buttons with brand SVG logos.** Replaced the single `Import ▾` dropdown with three direct buttons (Google Drive, iManage, OneDrive) each carrying an inline SVG brand mark. Discovered along the way that the connector logic was already in place (`IMPORT_SOURCES` array, `startImport()` setting `importStep`/`importSource`/`importPct`, simulated 3-second progress walk, auto-close after 2 s on `done`) — but the JSX consuming `importStep` was never written, so the loader popup never showed. Added the missing fixed-position modal (`role="dialog"`, brand-tinted icon halo, progress bar that fills in the source's brand colour, green-checkmark success state with the imported-doc count). All static — no real OAuth or sync. `BrandLogo` component lives in `src/pages/chatbot/ChatView.jsx` just above `DocumentVaultPanel`; three sources hardcoded (`google_drive`, `onedrive`, `imanage`) returning inline SVG. PM came back asking "make a bigger popup, not looking good" mid-flight — actually meant the Plan Override History modal (above), not the connector progress modal which they hadn't seen yet.

**QA pass on the dev team's working build** at `https://youraillc-pwa-dev.appskeeper.in`. Logged in as `chat@yopmail.com / Test@123 / OTP 999999` (Org Admin role) via Playwright and ran two passes — first surface-level UI walk, then a deep multi-turn drafting session as a junior associate. **14 bugs catalogued in `~/Desktop/YourAI_Chat_Bug_Report.docx`** (6 P0, 5 P1, 3 P2). The chat is functionally unusable for the lawyer persona: ~90% of prompts return one of two canned strings — `"The knowledge base does not have sufficient coverage on this topic."` (any prompt without high-overlap vault match) or `"Please upload or reference a document to proceed with this analysis."` (document-required intents). Backend pipeline identified from API debug payload: **Amazon Nova Lite (`amazon.nova-lite-v1:0`)** running a 2-pass `chat_system_reasoning_v1` → `grounding_rewrite_v1` template with a hard `low_overlap < ~0.55` refusal gate. No fallback to general LLM knowledge for prompts that don't need RAG (greetings, public-law Q&A, from-scratch drafting). The deeper drafting probe surfaced three more serious issues that one-shot per-intent testing missed: (1) **security filter false-positive** — a benign `"Draft a mutual NDA between Hartwell & Associates and DataSecure Inc."` returns `answerStatus: "refused"`, `outputIntent: "security_block"`, `warnings: ["security_block:high"]`, `answer: ""` — empty body, blank bubble shown to user; (2) **zero multi-turn memory** — by turn 4 of an NDA drafting session, the bot can't recall the jurisdiction and term length specified in turn 1 of the same conversation, replies "knowledge base does not have sufficient coverage" to a memory-recall question; (3) **hallucinated clause semantics** — when asked for a "residual knowledge clause", the bot generated a standard confidentiality covenant (which means the OPPOSITE: residual-knowledge clauses expressly permit retained employee memory). A lawyer copy-pasting this gets the wrong legal effect. Plus a leaked `[CITE:N/A]` placeholder in a Legal Q&A reply and silent 401 on session expiry with no re-auth prompt.

**Bot Persona prompts rewritten per `anthropics/claude-for-legal`**. Cloned the repo, extracted 10 patterns from its commercial-legal / law-student / litigation-legal / corporate-legal plugin skills (mode detection, explicit output structure, confidence discipline with `[model knowledge — verify]` / `[UNCERTAIN]` / `[verify exact quote]` tags, source-attribution tags `[vault: …]` / `[Westlaw]` / `[web search — verify]`, verbatim-quote rule, pinpoint-cite rule, drafting intents must never refuse benign legal work, term-of-art fidelity, suggested-next-action at end of every reply, length discipline per intent). Rewrote all 13 intent defaults in `src/pages/super-admin/GlobalKnowledgeBase.jsx` `DEFAULT_INTENTS`. Two opening-behaviour changes: `CASE_LAW_ANALYSIS` and `RISK_ASSESSMENT` flip from `ASK_FOR_DOCUMENT` to `START_IMMEDIATELY` (Marbury v. Madison doesn't need a doc upload; situational risk Qs don't either). Keyword lists expanded from ~7 entries average to ~20 entries per intent, covering all natural phrasings observed during testing. **Bumped storage key `yourai_bot_persona` → `yourai_bot_persona_v2`** so existing SA sessions hydrate the new defaults on next load rather than reading the v1 entry from localStorage. Companion deliverable for the dev team to apply against their backend DB: `~/Desktop/YourAI_Bot_Persona_Prompts.docx` (lean — just the field values to paste into the SA form, no SQL or design commentary; an earlier `YourAI_Bot_Persona_Prompt_Update.docx` had the full bug-crosswalk + SQL migration + acceptance battery, retired per PM "no need to overcomplicate it").

**Autonomous test-suite MD for the dev team** at `~/Desktop/YourAI_Chat_Vault_Test_Suite.md` — 1295 lines, 176 test cases across 26 areas (auth, chat shell, send-message, multi-intent gate, intent badges, per-intent behaviour for all 13 intents, multi-turn memory, attachments, YourVault page operations, knowledge packs, streaming, citation quality, ethics refusals, error handling, accessibility, cross-cutting thread integrity). Designed to be dropped into the dev team's Claude Code session with the Playwright MCP server attached — Claude reads it, runs every test, emits a structured bug-report Markdown using the template in §5 of the suite. Includes a setup-helper JS toolkit (`window.__yourAI.loadIntents()` / `startConv()` / `send()`) so Claude can drive `/api/v1/chat` directly via `fetch` in `browser_evaluate`, bypassing the UI for fast prompt-level QA. Test artifacts (a `test-contract.txt` software license + a `test-nda.txt` with embedded standstill/non-solicit/non-compete to validate "NDA in clothing" detection) in Appendix A. Severity rubric, pre-flight checklist, and JSON output schema for trend tracking in Appendices B/C/D.

**Three deliverables now on Desktop for the dev team**, sequenced for them to work through:
1. `YourAI_Chat_Bug_Report.docx` — what we found.
2. `YourAI_Bot_Persona_Prompts.docx` — replacement prompts to apply against their intents table.
3. `YourAI_Chat_Vault_Test_Suite.md` — autonomous regression suite Claude Code can run after they apply fixes.

**Bundles deployed in order:**
- `bf43462` — wire dead Subscriptions action buttons + Plan delete + fix Pencil `billingMeta` ReferenceError + Receipt→FileText icon swap
- `54890b3` — remove Change Plan (Pencil) + the entire plan-override modal + related state/handlers per PM
- `009cefc` — widen Override History modal via `Modal.maxWidth` prop + YourVault hero connector buttons + missing progress/success modal
- `229add1` — rewrite all 13 Bot Persona intent prompts per claude-for-legal patterns + bump storage key to `_v2`

Prod bundle on YourAI build: TBD on each Vercel rebuild — verify with `curl -s https://yourai-black.vercel.app/super-admin/billing | grep -oE 'index-[A-Za-z0-9_-]+\.js'` (the dev team's build is on a separate hosting at `youraillc-pwa-dev.appskeeper.in`).

**New gotchas added to CLAUDE.md** (numbered 36–38): undefined-symbol crashes inside modal renders look like dead clicks (same class as the `vaultScopeContext` bug from 2026-05-04); `Modal.maxWidth` prop pattern for wide-table modals; dev-team build runs Amazon Nova Lite with a hard RAG grounding gate that refuses any prompt with low vault overlap.

**New `.claude-context/` files**: `claude-for-legal-patterns.md` (the 10 patterns extracted, with paste-ready snippets), `dev-team-handoff.md` (status of what we've shared with the dev team, where the deliverables live, and how the test-suite is expected to be consumed).



**1. Super Admin sidebar resize** (commits `6cc82c2`, `ad2e308`). Two passes after PM said "still too small": width 240 → 264 → **288 px**, nav font 13 → 14 → **15 px**, section labels (MAIN / CONTENT / LIBRARY / OPERATIONS) 10 → 11 → **12 px**, icons 15 → 16 → **18**, item padding 8 → **10**. [Layout.jsx](src/components/Layout.jsx) `marginLeft` and [TopBar.jsx](src/components/TopBar.jsx) `left` offsets moved with each width bump. Org Admin sidebar (`OrgSidebar.jsx`, separate file) intentionally untouched — different audience, different proportions. Files: [Sidebar.jsx](src/components/Sidebar.jsx).

**2. Case 1 — cross-intent hard switch** (commit `7fbfc04`). Real bug: user manually picked Contract Review, typed "do clause analysis", system produced clause-analysis output while the pill still read "Contract Review" — wrong-schema mismatch. Root cause: the prior `crossIntentNudge` was a prose HARD CONSTRAINT in the system prompt that the LLM routinely ignored (~80% compliance, not 100%), so the LLM did the task with the wrong intent's schema. Fix: when `activeIntent !== 'general_chat'` AND `detectIntent` returns a different specific intent with the +2 keyword-margin threshold, **switch the active intent** (set + system note "Switched to **X** mode — your message reads as an X task.") instead of nudging. The general_chat → specific path still respects `hasManualIntentPick` so deliberate General Chat picks aren't silently overridden — this only reverses gotcha #27 for the specific → specific case. New rule documented in [ChatView.jsx:6383-6418](src/pages/chatbot/ChatView.jsx).

**3. Case 2 — multi-intent clarification gate** (commits `8343c75`, `aace808`, `c22b331`). User report: "do clause analysis and then prepare contract" — the send pipeline is single-intent (one system prompt, one schema, one response) and silently picked one operation while dropping the other. Decision: NOT inline orchestration (Workflows is the dedicated chained-ops surface, but the user's team isn't shipping there). Instead, a clarification gate that pauses and asks. Triggers when: message has a sequence connector AND `detectAllIntents` returns 2+ distinct specific intents (excludes general_chat + legal_qa), each with ≥1 keyword hit. Rendered as prose with N inline navy text links — matches existing `use_attached_or_new` doc-source confirmation pattern (no styled card per CLAUDE.md convention). New confirmation kind `multi_intent_pick`. Click handler sets the chosen intent + `hasManualIntentPick=true`, collapses the prompt into a "Running **X** on your request…" note, re-fires `sendMessage` with `skipMultiIntentChoice: true`. The Case 2 cross-intent hard switch is also gated on `skipMultiIntentChoice` so the user's deliberate pick isn't immediately flipped off. Two iteration passes: v1 connector regex required `and then` / `then` / `after that`, missed real message "Can you do contract review **and** clause analysis" — added bare `and` to the regex with `\\b` boundaries; per-intent keyword floor lowered ≥2 → ≥1 (clause_analysis only matched "clause analysis" once). When the gate fires, soft pre-send suggestion banner (`suggestedIntent`/`suggestedIntents`) is cleared so the user only sees one authoritative ask.

**4. LLM intent classifier + doc-attached Edge override** (commit `6e9d21b`, current bundle). Triggered by repeated bug reports — typos ("clasue analysis"), synonyms ("audit my contract"), and natural phrasing kept breaking the keyword detector, cascading into wrong-intent routing and the Edge's `MISSING_DOCUMENT_HANDLING` falsely firing on attached docs. Two parts:

   - **`src/lib/intentClassifier.ts`** (new) — `classifyIntent(message, currentIntent, docAttached)` calls `/api/chat` with `intent: 'classify'`, gpt-4o-mini, temperature 0, 200 max_tokens, JSON-forced response via new `'classify'` entry in `CARD_SCHEMAS`. Returns `{primaryIntent, isMultiIntent, otherIntents, confidence}`. Tolerates typos, synonyms, paraphrases. 2.5s timeout — on failure/timeout the keyword detector is the silent fallback. Cost: ~$0.0001/send (gpt-4o-mini, ~400 in / ~80 out tokens). Latency: ~500ms added before streaming starts.

   - **Edge `docAttached` override** ([api/chat.ts](api/chat.ts)) — client now passes `docAttached: !!(mergedDocContent && mergedDocContent.length > 0)` in the `/api/chat` fetch body. When true, Edge prepends a hard system instruction: *"CRITICAL CONTEXT: A document IS attached … DO NOT reply with 'Upload the document using the + button' or any variation … DO NOT fall through to the MISSING DOCUMENT HANDLING branch — that branch DOES NOT APPLY here."* The prior prose-only MISSING_DOCUMENT_HANDLING was unreliable — LLM routinely fell into the upload-prompt branch on ambiguous multi-task messages even when the doc was inlined.

   Integration: classifier runs once at the top of `sendMessage` (after chit-chat / hasAnyDoc detection, before all gates). `willBeCardIntent` prefers `classifier.primaryIntent` over keyword. Multi-intent gate prefers `classifier.isMultiIntent` over the keyword/connector path. Keyword detector retained as fallback.

**Conventions captured (CLAUDE.md update pending):**
- Cross-intent hard switch (specific → specific) **does** override `hasManualIntentPick` when keyword margin is +2. General_chat → specific still respects it. Reverses gotcha #27 for the cross-specific case only.
- Multi-intent clarification gate: trigger rules above, rendered as prose with text links (not styled card). Choices capped at 3.
- LLM classifier is the primary routing decision; keyword detector is fallback only.
- `docAttached: true` in `/api/chat` body forbids the Edge from asking for upload — kill-switch for the MISSING_DOCUMENT_HANDLING fallback.
- New CARD_SCHEMAS entry `'classify'` is reserved for classifier calls, not a renderable card.

**Meta-conversation (worth recording).** Mid-session the user asked "Why are there so many bugs?" — fair, and the honest answer drove the classifier work. Five structural reasons surfaced: (a) keyword-based intent detection is brittle by design — typos/synonyms/paraphrases break it; (b) six overlapping send-pipeline gates (soft banner, hard auto-switch, cross-intent switch, multi-intent gate, doc-source confirmation, chit-chat override) create surprising interactions when fixes shift failure modes between them; (c) `ChatView.jsx` is 8923 lines with sprawling state — hard to reason about send-pipeline holistically; (d) zero automated tests; (e) MISSING_DOCUMENT_HANDLING relies on LLM following a prose instruction the model routinely ignores. The LLM classifier addresses (a) and partially (b) — willBeCardIntent and multi-intent gate now collapse into one classifier output. The `docAttached` hard override addresses (e). (c) and (d) remain on the backlog.

**Recommended follow-ups not yet done:**
- Regression test harness — 30 known-good prompts asserting routed intent + whether MISSING_DOCUMENT_HANDLING fires. Catches drift before users hit it.
- Refactor `sendMessage` (~400 lines, 10+ conditional gates) into a state machine or composable middleware.
- `WorkspaceChatView` mirrors most of `sendMessage` and didn't get the classifier — needs a parallel update.
- Consider hiding the ~500ms classifier latency behind a small "Routing…" indicator if users complain.
- Investigate whether the doc-source confirmation modal (`use_attached_or_new`) is still wanted given the user's "asks every time" frustration — it's now somewhat redundant with the doc-attached Edge override.

**Bundle progression today**: `index-CqgXLNOm.js` (SA sidebar v1) → `BlFwWr0g` (SA sidebar v2) → `Ceh8emjA` (Case 1 hard switch) → `x2iCTP8U` (Case 2 v1 gate) → `CYHapPoG` (Case 2 v2 — bare 'and' + ≥1 floor) → `C5TfA45u` (clear soft banner on gate fire) → **`Cx8LA4Ij.js`** (current — LLM classifier + docAttached Edge override). Seven deploys.

---

**2026-05-13** — Designer-handoff session. Two deploys to `yourai/main` against new HTML mockups in `~/Downloads/yourai-pages-build/` (chat.html + chat-active.html + shared `yourai-styles.css`).

**1. Chat empty-state composer rebuilt to match `chat.html` mockup.** Visible-when-`showEmptyState` block in `ChatView.jsx` swapped from the white-box-with-Optional-card pattern to a single warm-beige (`#efe9d8`) composer card containing a green intent pill at top, a white textarea in the middle, and a 40-px-tall actions row (File Search scope pill on the left · `⌘ Knowledge pack` pill + navy 40×40 send circle on the right). Below: a separate beige Upload bar (clicks the existing `dropFileInputRef`, also accepts file drops with folder-detection hint), four white quick-chip pills with green dots (General Chat / Review a contract / Summarize a document / Draft an email), and the disclaimer footer (`Private & encrypted.` bold). Page bg flips to `#fbf8ef` while empty (reverts to `--cream` once a thread starts); inner column max-width 820 px (was 880). `EmptyState()` hero updated: sparkle now in a 36px `--gold-bg` ring; greeting tightened to Fraunces 44 / 500 / -1.2px tracking; subtitle copy *"Your AI assistant is ready — ask anything about your documents or Alaska law."* Iterations after the first ship: green intent pill's dropdown was overwhelming (heavy navy-tint chrome + opening downward covered the textarea); restyled to match `chat-active.html` `.src-dropdown` — 8 px container padding, 10.5 px / 600 / 1.2 px-tracking bucket headers (was bold 11 px tracking-tight), gold-bg highlight on the active intent (was navy 4 % tint), gold check on the right (was navy). Tried opening upward but the menu (12 intents + 4 bucket headers ≈ 500 px) gets cut off at the viewport top since the pill is ~305 px from page top — reverted to downward; with the lighter chrome the brief textarea overlap reads as a soft popover, not a heavy panel. Scope (File Search) dropdown received the same `.src-dropdown` treatment (28 px icon column + 14 px name + 12 px desc body, gold-bg selected, gold check). All wiring preserved — `INTENT_BUCKETS`, `SCOPE_OPTIONS = files / vault / packs`, KP picker modal, `handleAttachFiles`, `hasManualIntentPick`, `closeAllPanels()`, suggestion banners, doc-source confirmation, additive uploads, `extractionPromisesRef`. Quick chips wire to the existing pre-fill handler. Hidden legacy refs (`vaultAttachRef`, `kpMenuRef`, `emptyMoreRef`) kept as empty `display:none` divs so existing handlers don't crash. Populated chat input untouched.

**2. Super Admin Compliance & Audit (`/super-admin/compliance`) rebuilt on the chatview `AuditLogsPanel` chrome.** Goal: SA's audit surface should feel like the org-admin one but widened to multi-tenant. Dropped 4 stat cards (Total Log Entries / Critical Events / Warnings / Unique Operators), info banner ("All operator actions are recorded with timestamps…"), Severity column + Severity filter, the eye/Details icon column, and the audit-entry detail modal — none of these exist in the chatview audit log. Added a **Tenant column** between User and Category (each event tagged with `Hartwell & Associates` / `Thornton Compliance` / `Chen Partners LLC` / `Morrison Legal Group` / `Platform` for system-level events; Platform rows render italic + muted to distinguish from real tenants) and a **Tenant filter** (Building2 icon) as the first filter pill since multi-tenancy is SA's primary axis. User filter + Category filter complete the row (along with the search input that matches across all columns). Category column kept with the same per-category tinted pill styling as the chatview panel (`${color}1a` 10 % alpha bg + full-saturation text; all hex now so the alpha-concat actually works). Table chrome copied from chatview: white card + mono-uppercase headers on ice-warm header row + row hover tint + "No events match these filters." empty state. CSV export uses the same client-side Blob + temp `<a>` pattern as chatview, header `Timestamp · User · Tenant · Category · Action · Target`. Kept SA's shared `PageHeader` (Shield + DM Serif 22) for SA-section consistency rather than the chatview's Fraunces-24 inline header.

**Conventions captured (CLAUDE.md)**:
- Chat empty-state composer is a single beige `#efe9d8` block (not a white-box-plus-Optional-card pair). Intent pill at top is green per design language. Page bg `#fbf8ef` only while `showEmptyState`. Inner column 820 px in empty state.
- Intent dropdown opens downward (pill is at top of composer; opening upward overflows the viewport). Scope dropdown opens upward (pill is at bottom of composer).
- All chat-input dropdowns use the `chat-active.html` `.src-dropdown` style (white card + 8 px padding + 10.5/600/1.2px tracking labels + gold-bg selected + gold check).
- Quick chips on the empty state are 4 white pills with green-dot prefixes, centered. "More operations" overflow is gone from the empty state — the intent pill's dropdown now surfaces the full bucketed list.
- SA Compliance & Audit shares filter-bar + table chrome with the chatview `AuditLogsPanel`. Severity is not surfaced (Category covers the bucketing need without a second axis); detail modal + stat cards are not part of either surface.

**Bundle deployed**: `index-CACJne-y.js`. Three commits pushed to `yourai/main`: `0b32e2b` (chat composer), `9a5c863` (SA Compliance), `1ac78b8` (docs).

**Source of truth for the designer mockups**: `~/Downloads/yourai-pages-build/` — HTML+CSS prototypes the designer hands over. Today touched `chat.html` (empty state) + `chat-active.html` (populated + dropdown style). Folder also contains `workspaces.html`, `vault.html`, `packs.html`, `workflows.html`, `prompt-templates.html`, `prompt-templates-detail.html`, `yourai.html`, and the shared `yourai-styles.css` (this is the canonical token list — `--green-text: #2a8a4f`, composer beige `#efe9d8`, etc.). See `.claude-context/designer-mockups.md` for the full inventory + what's matched vs pending.

**What's next**:
- **Match `chat-active.html` populated chat state.** Today's session only borrowed the source-dropdown style. The populated chat in `chat-active.html` has a full conversation chrome: topbar with conversation title + meta icons (timer / member count / 3-dot menu), gold-tinted answer card with citation pills (`%` icon + doc name + `p.X §Y`), gold-rail "Current search:" line with bullseye icon + blue link styling, file chips with red "PDF" badge in the composer, and the same beige composer + Upload bar as the empty state. None of this is wired yet.
- **Match the remaining mockups**: workspaces / vault / packs / workflows / prompt-templates / prompt-templates-detail / yourai. Each is a separate surface; budget per-screen.
- **Responsive design first-wave** — still awaiting PM go-ahead from 2026-04-30. Tenant chat across 5 breakpoints + sidebar collapse.
- **Carryover**: Timeline intent removal (12 touchpoints inventoried, paused since 2026-05-06), mirror artifact panel in `WorkspaceChatView`, Edge prompt tuning for matterName, wire Org Dashboard mock data + audit events + Billing to real telemetry once backend lands.

---

**2026-05-11** — UX consistency pass across full-page panels + Org Admin Dashboard build-out (charts + restructure) + Audit Logs MVP + chat input simplification. Multiple sessions, fifteen commits, fifteen deploys to `yourai/main`.

**1. Workflows chrome aligned with Vault / KP / Workspaces** (`20e6d08` / `index-DX0JO24K.js`). Workflows had been using cool `var(--ice-warm)` (`#F4F6F9`) as its outer surface while every other full-page panel used warm `#FBFAF7` cream. Outer + flat hero now `#FBFAF7`; top bar padding `14px 36px` → `12px 28px`; hero/scroll horizontal padding 36px → 28px. Cards / gold AI PIPELINES eyebrow / practice-area accent stripes unchanged.

**2. Workflows filter pill chrome → prompt-template segmented control** (`dd8f7c7` / `index-DzzqVwrR.js`). Replaced 58px-tall inset-pill segmented control + circular count chips + navy underline bar with the prompt-template chrome: white container + 1px `#e2e3e7` border + radius 9 + padding 3; items 6×12 padding, transparent → `var(--gold-bg)` active, counts inline as small muted numerals.

**3. KP/Vault scope tabs same pattern + Vault left-rail restructure + Vault search redesign** (`45f6a12` / `index-DBvWM09b.js`). Four changes:
- KP scope tabs (All / Org-wide / Mine) restyled to the prompt-template pattern.
- Vault scope tabs (top-right) restyled the same way.
- Vault left rail: removed `FILTER (CROSS-MATTER)` block and `MY FOLDERS` block per PM. Only `MATTERS` remains. Cross-matter pills (Privileged / Confidential / Final / Draft / Pinned / Mine) moved into a horizontal "FILTERS" row directly below the search bar.
- Vault search bar redesigned: heavy gold-tile gradient + helper-text-inside-the-box → clean 44px conventional search (small Search icon, single-line placeholder, subtle ⌘K hint, navy focus glow on container).

**4. Org Admin Dashboard — Cost by Client donut** (`5f3bb0b` / `index-Buw3GOFG.js`). New card below Activity Feed + Plan Usage. Inline SVG donut (no chart library): 3 slices at 54% navy / 35% gold / 11% slate using `stroke-dasharray` + accumulating `stroke-dashoffset`. Center label `$2.43`. Legend below.

**5. Org Admin Dashboard — Top Workflows + Top Users cards** (`ffb86dd` + `dc5436b` / final `index-DB1lv0w6.js`). First shipped as list rows with thin bars (5 items per section), then converted to a 3-tile hero grid per section per PM "showcase in visual cards" ask. Tiles: icon/avatar circle, big Fraunces number, "runs"/"actions" label, name underneath. Leader (#1) gets gold-bg tint + gold-tinted icon. #4–5 fold into a compact "Also ran" / "Also active" footer so the inactive-Tom signal (Invited tag, dimmed) survives. Data pulled from `mockData.js` (Sarah Chen / James Wu / Ryan Melade / Maria Torres / Tom Bradley; Contract Review Auto-run / Due Diligence / Risk Assessment / Compliance Check / Quarterly Review).

**Dashboard metrics discussion**: proposed AI activity trend + active-vs-invited user count; PM rejected the "vs paid seats" framing (invited users aren't paid). Pivoted to Top Workflows + Top Users which are valuable for "where is adoption concentrated?" without billing baggage.

**6. Chat upload affordance fixes** (`d151d9b` / `index-cgvt1txe.js`):
- Empty-state "Upload files" button was wired to `setIsVaultPickerModalOpen(true)` despite the literal label, and the comment near `dropFileInputRef` declaration explicitly said the button was supposed to trigger that input. Latent bug. Fixed.
- Populated-chat `+` button: converted to a dropdown menu (Upload from computer / Attach from YourVault). *(Retired same day — see commit 9.)*

**7. In-portal `BillingPanel` for org admins** (`efcd406` / `index-DEsfCGkp.js`). Sidebar "Billing" used to `navigate('/app/billing')`, bouncing users into the separate org-admin portal. Now opens a `BillingPanel` inside ChatView following the standard full-page sibling pattern (state, `closeAllPanels`, `sidebarActiveKey: 'billing'`, hide-chat condition, run-panel hide condition). Content mirrors `OrgBilling.jsx`: navy hero card (plan + MRR + gold total), 3-col usage meters with proportional bar colors (navy <50% / gold <80% / red >80%), 4-col plan comparison with current plan gold-tagged + outlined navy + Upgrade/Downgrade CTAs, billing history table with per-row PDF download buttons. Sidebar entry already gated to `isOrgAdmin || PERMISSIONS.ACCESS_BILLING`.

**8. SEARCH WITHIN swap + simplify `+` button** (`ef610b0` / `index-DKWhQuTr.js`):
- `SCOPE_OPTIONS` third option swapped from `workspaces` → `packs` (Knowledge Packs). Picking it opens the existing pack-picker modal (mirrors the YourVault flow). Workspaces scope was visual-only (matter-privilege footgun, no retrieval pipeline) — replacing it with a real picker makes the slot actionable.
- `+` button reverted to a single-purpose direct file-picker click (no dropdown). YourVault attachment is still reachable through SEARCH WITHIN. Removed unused `isAttachMenuOpen` state and `attachMenuRef`.

**9. MVP `AuditLogsPanel` for org admins** (`f131f6d` / `index-DKkIjBH8.js`). The sidebar "Audit Logs" entry had been a no-op stub since the panel was first sketched (Himanshu flagged 2026-05-04). Now opens a real panel following the same in-portal full-page sibling pattern as `OrgDashboardPanel` / `BillingPanel`.

Scope (MVP — 5 categories, 16 event types):
- **Auth**: signed in · signed out · failed sign-in
- **Documents**: uploaded · deleted · shared org-wide
- **Workspaces**: created · deleted · member added · member removed · **external client added** (red "Flagged" pill — privilege-boundary alert)
- **Users**: invited · role changed · deactivated
- **Workflows**: run completed · run failed

UX intentionally tight per "MVP, not V1" feedback during the brainstorm:
- Single table — Timestamp · User · Category · Action · Target
- Two filters only — User dropdown + Date range (All / Today / Last 7d / Last 30d)
- CSV export of filtered rows (client-side `Blob` + temporary `<a>` click pattern)
- Category pills with per-category fill (auth purple / docs navy / workspaces teal / users amber / workflows gold)
- Empty state when filters return zero

Seed: 30 realistic events in `data/mockData.js` under `auditEvents` spanning the past week, named consistently with `orgUsers` (Sarah Chen / James Wu / Ryan Melade / Maria Torres / Tom Bradley; one anonymous failed-sign-in attempt to demonstrate the failure case).

Imports: added `LogIn`, `Ban`, `AlertCircle` to the lucide-react import to back the icon map.

**Audit-log brainstorm before build**: PM asked which events should be tracked for org admin visibility of team activity, referencing the Activity Feed as the live surface. First pass gave full V1 scope (8 categories incl. severity tiers / bulk-op flags / IP capture); PM pushed back: *"think from MVP perspective, not too detailed like V1."* Trimmed to 5 categories / 16 events / 2 filters / CSV-only export. Lesson: default to MVP-shaped responses for greenfield feature brainstorms — V1 detail can be elicited if needed.

**Client deliverable**: `YourAI_AuditLog_Events.xlsx` — 2-sheet workbook (Overview cover + Tracked Events table with auto-filter and color-coded category pills) for sharing the MVP event coverage with stakeholders. Saved to `~/Desktop/` and the worktree root. Generated via `/tmp/build_audit_xlsx.py`. Format follows `wbs-format.md` conventions (Arial, dark blue title bar, yellow header row 2, thin black borders, freeze panes A3).

**10. Org Admin Dashboard — charts + full UX restructure** (`770963b` → `0b57cae` → `5e659d7` → `2137940` → side-by-side rolled into `f131f6d` → `a20f1d9` / current bundle `index-BMy_XH7X.js`). User asked for chart treatments ("piechart or bargraph something") and then for a proper restructure. Six iterations, two PM aesthetic rejections, ended with a 4-zone hierarchy.

Iterations:
- **Charts pass — one approved, one rejected.** First pass added an "Activity this week" 7-day stacked bar chart (navy actions + gold runs, day-of-week mono labels, per-bar totals) AND a "Workflows by Practice Area" horizontal-bars card alongside Cost by Client. PM reaction to the stacked bar chart: *"very very ugly."* Removed within minutes of deploy.
- **Engagement-then-feed reorder.** PM ask: "keep [Top Workflows + Top Users + Practice Area + Cost by Client] above Activity Feed and Plan Usage." Moved Activity Feed + Plan Usage from middle-of-page to footer.
- **Full 4-zone restructure** (the main pass). Six equal-weight horizontal rows collapsed into four hierarchical zones with clear visual ranks:
  1. **Hero** — greeting (Fraunces 26) + outlined Quick action chips in top-right (icon + label, no descriptions) + slim 4-segment stat strip (single connected card, internal `borderRight`s, mono uppercase eyebrow + Fraunces 26 number — no colored top-borders, no icons, no per-segment shadow).
  2. **This week** — section heading (Fraunces 18 + mono LAST 7 DAYS eyebrow) + Top Workflows / Top Users tile grids (unchanged) → Cost by Client + Plan usage paired in a 2-col row, equal heights. Cost by Client donut shrunk to 170×170 to fit the half-width column; legend uses ellipsis on long client names. Plan usage kept its stacked-bar layout for the same column width.
  3. **Recent activity** — section heading + full-width Activity Feed (taller, 440 px max-height). Briefly carried a "By practice area" chip strip in its header (colored dots + name + run count) — PM removed at next pass.
  4. **Footer** — eliminated. Plan Usage moved up into "This week" zone alongside Cost by Client; Quick Actions moved up into the hero. No standalone footer card remains.
- **Drop tail rows on top-tile cards.** Removed "Also ran" / "Also active" rows under Top Workflows / Top Users tiles — the top-3 tiles tell the whole story.
- **Drop the practice-area chip strip.** PM ask in the same pass: remove the "By practice area" header strip from Activity Feed entirely. Practice-area data has now been tried as a standalone bars card AND as a chip strip on the Activity Feed header; both rejected. The Org Dashboard doesn't surface practice-area breakdown.

**Lesson — PM aesthetic threshold for this dashboard is high.** Two visual experiments rejected within minutes of deploy in a single session. When proposing a chart on this surface: mock it tight (no monospace day labels, no per-bar totals, no chunky chrome), and ask whether it shows something the existing tile grids + donut don't already say. Activity tiles + donut already convey "where is engagement concentrated this week" — a temporal chart is redundant.

**Cross-agent commit note.** Mid-session, a parallel Claude agent (separate context, different session) authored commit `f131f6d` for the Audit Logs panel and inadvertently swept up the working-tree's uncommitted dashboard side-by-side change (Cost by Client + Plan usage paired) into the same commit. The push went through before this agent got its own commit in. Net effect was the right outcome but attribution lives on the audit-logs commit, not a standalone dashboard commit. Worth knowing when worktrees are shared across agent sessions: an unrelated commit can land your in-flight edits.

**Conventions captured today** (added to CLAUDE.md):
- Full-page panel chrome alignment (warm `#FBFAF7` surface + 12×28 top bar + 28px hero padding).
- Segmented filter pill chrome (white container + 1px `#e2e3e7` + gold-bg active).
- `BillingPanel` is an in-portal full-page sibling, not a route redirect.
- `SCOPE_OPTIONS` is now `files / vault / packs` (workspaces gone). Third option opens a picker modal — no visual-only scopes.
- `+` button = direct file-picker click only. Don't reintroduce the 2-option dropdown.
- Org Admin Dashboard 4-zone structure (hero / this week / recent activity; no footer).
- Slim stat strip pattern (single connected card, no per-segment chrome; mono eyebrow + serif number).
- Quick actions live in hero top-right as outlined chips, not a standalone card.
- Cost by Client + Plan usage paired in a single 2-col row, equal heights.
- No "Also ran" / "Also active" tail rows on top-3 tile cards.
- No practice-area surface on the Org Admin Dashboard (neither standalone card nor header chip strip).

**Branch state note**: Last week's sessions left the worktree on the `tmp` branch (mirrors `yourai/main`). `claude/great-banach` is now 127 commits behind. All commits today went directly to `tmp`, then `git push yourai tmp:main`. The named working branch is effectively vestigial — what matters is that `tmp` stays in sync with `yourai/main`.

**Bundle progression today**: `index-CHql8uKy.js` (yesterday) → `DX0JO24K` → `DzzqVwrR` → `DBvWM09b` → `Buw3GOFG` → `1TgaB_71` → `DB1lv0w6` → `cgvt1txe` → `DEsfCGkp` → `DKWhQuTr` → `DKYFEGz4` (charts added) → `BR7J7vOb` (Activity-this-week chart removed + reorder) → `DvdSiM8l` (4-zone restructure) → `DKkIjBH8` (Quick actions to hero) → `BudgTcTS` (Audit Logs + Cost/Plan side-by-side) → **`BMy_XH7X.js`** (current — Also rows + practice-area chip dropped). 15 deploys.

**What's next**:
- Carryover: Timeline intent removal (12 touchpoints inventoried, paused), mirror artifact panel in `WorkspaceChatView`, Edge prompt tuning for matterName, responsive design first-wave (awaiting PM go-ahead), Himanshu audit pass on un-covered surfaces.
- New: `BillingPanel` mock content needs real Stripe wiring once backend lands; Cost by Client donut + Top Workflows / Top Users + audit events currently mock — wire to real telemetry when that backend story exists. Audit Logs V1 (when asked): add severity tiers, IP / user-agent capture, before/after diffs for edits, bulk-operation flags, more granular doc-access events (downloads, renames, moves), per-message AI logging gate (privacy-aware).
- Done today: Audit Logs sidebar no-op resolved (was on the carryover list since 2026-05-04). Org Admin Dashboard restructured to 4-zone hierarchy.

---

**2026-05-09** — Chat UX polish + Org Admin Dashboard. Three features shipped across two sessions; one deploy to `yourai/main`.

**1. Removed duplicate pill row from empty-state composer.** The empty-state input had a redundant 3-pill row (Intent / Scope / Pack) duplicating controls already in the Optional box. Removed. Source / Pack selectors in the Optional box also restyled to look like proper clickable chip buttons.

**2. Org Admin Dashboard panel** (`OrgDashboardPanel` in `ChatView.jsx`):

- **Landing**: `useState(isOrgAdmin && initialView !== 'workspaces')` — resolves synchronously from localStorage at mount (RoleContext's `readLocalRegisteredUser` fallback makes this safe even before AuthContext populates). Internal/external users unaffected.
- **Sidebar nav**: "Dashboard" item at the top of the Workspace section for org admins only (prop `onOpenOrgDashboard`). Active state keyed `'org-dashboard'` via `sidebarActiveKey`.
- **Panel**: follows the standard full-page sibling pattern — added to `closeAllPanels()` and the "hide chat area" condition. Built inline in ChatView, not imported from `/app/dashboard`.

**3. Static model selector in TopNav.** `YourAI · {model name}` pill always visible for all users. Hamburger moved to `md:hidden` (mobile only). 4-model dropdown (Claude 3.7 Sonnet / 3.5 Haiku / GPT-4o / Gemini 1.5 Pro) — UI only, no backend wiring. Gotcha hit here: `md:hidden` on a div with `display: 'flex'` in an inline `style={{}}` prop **does not work** — inline style specificity overrides Tailwind's responsive hide. Fix: move `display` into the Tailwind class string (`className="md:hidden flex ..."`). Documented as gotcha #33 in CLAUDE.md.

**4. OrgDashboardPanel redesign** (PM: metrics from ChatView features, not portal-level stats):

- **4 stat cards** (live ChatView state, not mockData): Workspaces / Team Members / Vault Documents / Knowledge Packs. Color-coded top borders.
- **Quick actions directly below metrics**: New Workspace / Upload Documents / Add Team Member (replaces Run Workflow). All three call `closeAllPanels()` then open the real panel.
- **Classification Queue removed** entirely.
- **Plan Usage bars**: Workspaces (limit 10) / Vault Docs (limit 2000) / Knowledge Packs (limit 10) / Team Members (limit 25).
- **Render site** passes live props: `workspaceCount={visibleWorkspaceCount}`, `memberCount={teamMemberCount ?? ORG_USERS.length}`, `vaultCount={documentVault.length}`, `packCount={knowledgePacks.length}`.

**Key decisions**:

- Don't route to `/app/dashboard` — build the panel fresh inside ChatView so it reflects ChatView's own data model.
- Metrics = what actually exists as product features (Workspaces, Vault Docs, KPs, Team Members) — not portal-level metrics.
- `isOrgAdmin` is safe as a `useState` initial value because RoleContext resolves synchronously from localStorage (no async gap).

**Bundle**: `index-CHql8uKy.js` (built 2026-05-09, commit `071e0d6`), pushed to `yourai/main`.

**What's next**:
- Timeline intent removal (still outstanding — 12 touchpoints inventoried across 9 files).
- Himanshu audit pass on Workflows, Workspaces page, full YourVault, Auth surfaces.

**2026-05-07** — Heavy KP / chat-input bug-fix day. Six deploys to `yourai/main`. Started with the PM still reporting Knowledge Pack grounding broken after yesterday's three-deploy attempt; ended with a comprehensive batch covering every P0 / P1 from a Himanshu deep-audit plus three new asks (thread rename, thread context restore, top-right toasts).

**1. Success toasts everywhere CRUD happens** (`3d5b656` / `index-D00YPXMc.js`). PM ask: "Add success message everywhere in chat, when deleted or added or any operation happened." The codebase already had two toast renderers (the green-pill `ToastProvider` used by sub-components, plus a `toastMsg` state in ChatView). Most CRUD handlers in ChatView did the work silently. Consolidated the repeated `setToastMsg(...) + setTimeout(...)` pattern into a single `showToast(msg)` helper backed by a `toastTimerRef` (so back-to-back actions don't have toasts overlap or get cut short). Wired into 17 sites — pack create/edit/delete/attach/detach, vault doc create/edit/delete/attach/detach, folder create/rename/delete/attach/detach, prompt template create/delete, client add/remove, thread delete, recursive folder upload. `handleNewThread` intentionally not toasted — the empty state IS the feedback. Workspaces / Team / Workflow ops already had toasts and keep working as-is.

**2. KP create flow id-collision bug** (`d394712` / `index-BY0KQaVy.js`). PM tested the KP create feature (after yesterday's grounding / persistence / extraction work) and reported "still doesn't work." The modal's `handleSave` was hard-coding `id: pack?.id || Date.now()`. For a brand-new pack the OR fell through to `Date.now()`, assigning a fresh id. Then `handleSavePack` saw a truthy `data.id` and ran `prev.map(p => p.id === data.id ? ... : p)` looking for an existing pack — none matched, so map returned the list unchanged and the new pack was silently dropped. Long-standing bug; my earlier fixes were correct in isolation but the create path never reached the saved state at all, so nothing earlier could have helped. Two-part fix: modal passes `id: pack?.id` (undefined for new packs) so `handleSavePack`'s create branch fires correctly, AND `handleSavePack` now uses `findIndex` defensively to verify the id actually exists before treating the call as an edit. Falls through to create if missing OR doesn't match.

**3. KP grounding diagnostics + framing rewrite** (`049cc27` / `index-OBN8wue-.js`). PM tested again; bot still ignored attached pack content (acknowledged the doc name but hit MISSING_DOCUMENT_HANDLING and asked the user to upload). Root caused by reading the Edge prompt: `MISSING_DOCUMENT_HANDLING` only recognises the `[Documents attached to this conversation]` block as "document content"; the previous `[Knowledge Pack reference for this conversation]` header read to the model as background reference. Fixes: pack content folded INTO the same `[Documents attached]` block, sub-labelled `--- Reference material from the Knowledge Pack "X" ---` so the model can still distinguish reference vs subject-of-analysis. Plus a `console.log [ChatView] sendMessage → Edge` that prints pack id/name/per-doc content lengths/has-content boolean/message preview — so the next test surfaces conclusively which layer is breaking without needing browser inspection.

**4. Himanshu deep audit** (no commit; investigation only). PM said "ask Himanshu to do a proper deep testing." Spawned Himanshu (general-purpose with `.claude-context/himanshu-knowledge.md` + `ai-chat-regression-set.md` loaded). With the browser MCP offline, audit was code-reading-only. Scope: tenant chat surface (chat input, KP modal, vault picker, attach pipeline, sendMessage). Findings: 1 P0, 4 P1s, 4 P2s. Things that look fine: `showToast` scope at all 17 sites, `handleSavePack` defensive `findIndex`, chip JSX unconditionally mounted, find_document inline render, additive uploads, doc inlining, Edge body shape unchanged. Notable un-audited surfaces: Workflows, Workspaces page, YourVault full-page, Auth, Super Admin, Org Admin portals.

**5. Big bug-fix batch** (`fdee81b` / `index-QSAuX65m.js`). PM directive: "fix all p0 & p1s." Plus three new asks added mid-batch (thread rename, see attached docs in past chats, KP-vs-doc comparison framing). Nine fixes in one commit:

- **P0-1** — KP storage key `_v1` → `_v2`. Pre-2026-05-07 packs were saved before runDocExtraction landed; their docs lacked `content` and `seedPacksIfEmpty` only seeds when storage is empty, so existing browsers kept the broken state. Bumping forces a fresh seed for everyone — the user's own broken "Test" pack disappears, replaced by the four working seed packs. Acceptable trade-off: losing in-progress custom packs is the lesser evil vs silent broken grounding.
- **P1-1a** — Overflow check moved before the unsupported / oversize filters in `handleAttachFiles`. Order meant 6 files where 1 was unsupported left 5 valid → cap not triggered → no banner. Now fires on the original count.
- **P1-1b** — Folder drag-drop now shows a friendly bot message routing the user to YourVault (which has folder-upload). Detection via `dataTransfer.items` since `dataTransfer.files` is empty for folder drops.
- **P1-2** — `runDocExtraction` detects `extractFileText` stub strings (`[File: x.pdf] This PDF appears to be image-based or empty…`). Saving those as `content` shipped silent broken grounding. Stub detection flips status to `failed` (UX matches a hard parse error — Save stays disabled until the user removes / retries).
- **P1-3** — Overflow CTA preserves File objects into the new-pack modal via `overflowFilesForNewPack` state + `initialFiles` prop. Modal mounts, runs `handleDocFilesPicked` on each, populates docs list. User only has to name + Save. Previously dropped the files on the floor.
- **P1-4** — `handleNewThread` clears `extractionPromisesRef`. Map was growing unbounded across thread switches; in-flight extractions from a prior thread could write to the new thread on resolve.
- **NEW (KP+doc compare)** — `messageForEdge` build now wraps pack and user docs with distinct sub-labels under the same `[Documents attached]` block: `--- Reference material from the Knowledge Pack "X" ---` vs `--- Documents the user attached for this conversation ---`. Lets the bot answer "review my case against attached estate laws" coherently.
- **NEW (thread rename)** — Edit3 icon on hover (next to Trash2). Click → row swaps to inline `<input>`; Enter / blur commits, Escape cancels. `handleRenameThread` sets `userRenamed: true` on the thread so `handleSwitchThread`'s auto-derive-title-from-first-message logic doesn't clobber the rename on the next switch.
- **NEW (thread context restore)** — Added `threadContextRef` alongside the existing `threadMessagesRef`. `handleSwitchThread` and `handleNewThread` snapshot the leaving thread's `{activeKnowledgePack, activeVaultDocument, activeVaultFolder, sessionDocContext, activeIntent, hasManualIntentPick}` before switching, restore the target thread's snapshot on arrival. Switching back to a previous chat now shows the docs you had attached. `pendingAttachments` (uncommitted) intentionally don't persist — they're tied to "what I'm about to send", not to the thread.

**6. Top-right toasts** (`01ef03c` / `index-DbqSrHcA.js`). PM ask: "Put all toasts on top right corner than bottom." Both renderers (ChatView's `toastMsg` pill + the green-pill `ToastProvider`) moved from bottom-anchored to `top: 24, right: 24` / `top-6 right-6`. Inverted the `toast-in` / `toast-out` keyframes (translateY(20px) → translateY(-20px)) so the slide direction matches the new top anchor (slide DOWN from above on enter, up + fade on exit). Added a `maxWidth: min(420px, calc(100vw - 48px))` to the ChatView pill so long messages wrap rather than running off the right edge.

**Conventions captured today** — both new entries:
- **`yourai_knowledge_packs_v2`** is now the active KP storage key (was `_v1`). Bump version when the seed shape changes in a way that requires re-seeding existing browsers — `seedPacksIfEmpty` is idempotent.
- **Toasts live in the top-right corner** (since 2026-05-07). The `toast-in` / `toast-out` keyframes assume a top anchor — moving the renderer back to bottom requires re-inverting the `translateY` direction.
- **Thread rename respects `userRenamed: true`** — once the user explicitly renames a thread, the auto-derive-title-from-first-message in `handleSwitchThread` does NOT fire for that thread. New flag on the thread record.
- **`threadContextRef`** alongside `threadMessagesRef` carries `{pack, vault doc, vault folder, sessionDocContext, intent}` per thread. Anything that changes per-thread state needs to be added here too OR explicitly clear on thread switch.
- **`runDocExtraction` stub detection**: extractFileText returns a placeholder string for unparseable PDFs — never throws. `runDocExtraction` checks `text.startsWith('[File: ') && text.length < 400` and flips status to `failed` instead of saving placeholder as content. When the parser is replaced with something stricter (real OCR pipeline?), revisit this stub-pattern check.
- **Pack content sub-labelling in messageForEdge** — pack docs and user docs are both inside the `[Documents attached to this conversation]` block but sub-labelled distinctly. This is the explicit framing that lets the model answer "compare X against the attached pack" requests.

**What's next**:
- Verify on a clean browser session that the KP grounding fix actually works end-to-end. PM has the diagnostic log to paste back if it still fails.
- Resume Timeline intent removal (paused 2026-05-06; 12 live touchpoints already inventoried).
- Surfaces Himanshu didn't audit — Workflows, Workspaces page, full YourVault page, Audit Logs panel, Auth, Super Admin, Org Admin. Worth a second audit pass when bandwidth allows.

**Bundle progression today**: `index-D00YPXMc.js` → `index-BY0KQaVy.js` → `index-OBN8wue-.js` → `index-QSAuX65m.js` → `index-DbqSrHcA.js` (current). All builds clean, all deployed.

**2026-05-06** — Knowledge Pack feature, end-to-end. Plus three smaller deliverables (artifact panel CSS refactor, Sprint 1 FRD, Sprint 1 WBS xlsx). Three deploys to `yourai/main`.

**1. Artifact panel — prose styling consolidated to a single CSS class** (commit `055ff86` / `index-CMxNkd4M.js`). The `IntentArtifactPanel` rendered card-intent reports via a 60-line per-element ReactMarkdown `components={{}}` map full of inline styles and ad-hoc hex colors (e.g. `#8A6B1F` for italic blockquote). PM read: hard for the dev team to follow consistently. Refactor moved every prose rule into a single `.artifact-prose` class in `src/index.css`, right next to the design tokens it references. Component shrank to `<div className="artifact-prose"><ReactMarkdown>{md}</ReactMarkdown></div>`. Same visual result; one place to look. Adding a new card intent: emit markdown from `cardToMarkdown.ts`, the class handles rendering. Adding a new markdown element: one CSS rule, no JSX edit.

**2. Knowledge Pack feature — real grounding + persistence + real extraction** (3 deploys: `2b553da` / `index-EoE_TMlr.js` and `70f7dbd` / `index-DJdRrLNV.js`). User report: "Knowledge packs are still not working, tried creating one." Triage found three layers of brokenness, all fixed in this session.

- **Diagnosis A: pack docs had no `content` field.** `DEFAULT_KNOWLEDGE_PACKS` shipped with `{name, size, uploaded}` only. Even if I wired the Edge to receive pack content, there'd be nothing to send.
- **Diagnosis B: pack content never reached the AI.** The Edge `/api/chat` body shape is `{message, history, intent, sessionId, sessionDocId}`. ChatView's `messageForEdge` builder inlined doc context, vault docs, vault folders — but did NOT inline `activeKnowledgePack`. The only place pack content was ever passed was the dead `callLLM` fallback path (which is unreachable in production per CLAUDE.md gotcha #4), and even there only doc names, not text.
- **Diagnosis C: no persistence.** `setKnowledgePacks` updated React state only; refresh wiped the user's work back to defaults.
- **Diagnosis D (caught after first deploy when user retested):** custom packs created via the modal still didn't ground answers. Reason: `EditKnowledgePackModal`'s `simulateDocPipeline` was a status-pill timer only — `uploading → processing → ready` with no actual file read. User-uploaded pack docs saved as metadata-only.

Fixes:

- **A.** New file `src/data/samplePackContent.ts` (~450 lines) — realistic legal text for the four seed packs (NDA Playbook, M&A Due Diligence, Employment Law CA, Privacy & Data Protection). `DEFAULT_KNOWLEDGE_PACKS` doc objects now reference content via `SAMPLE_PACK_CONTENT['pack-X-doc-Y']`. Mirrors the `sampleVaultContent.ts` pattern.
- **B.** ChatView's `sendMessage` builds a `packReferenceText` block from `activeKnowledgePack.docs.content` and prepends it to `messageForEdge` under a `[Knowledge Pack reference for this conversation]` header (parallel to the existing `[Documents attached to this conversation]` block). Per-doc cap 5,000 chars. Source pill on a pack-grounded answer reads "Answered from: {pack name}".
- **C.** New file `src/lib/knowledgePackStore.ts` mirroring `documentVaultStore.ts` — `loadPacks` / `savePacks` / `seedPacksIfEmpty` against `localStorage` key `yourai_knowledge_packs_v1`. ChatView's `knowledgePacks` state hydrates on mount (`seedPacksIfEmpty` on first load + `loadPacks() || DEFAULT_KNOWLEDGE_PACKS`), saves on every mutation via `useEffect`.
- **D.** `simulateDocPipeline` in `EditKnowledgePackModal` replaced with `runDocExtraction` — calls `extractFileText(file)` (the same `src/lib/file-parser.ts` helper used by chat attach, workflow builder, pre-run modal). Status flow unchanged visually; underneath, real PDF / DOCX / TXT parsing runs and the extracted text is stored on the doc as `content`. The `File` ref is stripped before save; `name`, `size`, `uploaded`, `content` survive.

End-to-end: user creates a pack, uploads a real document, saves the pack, attaches it in chat, asks a question whose answer is in the doc — bot quotes / paraphrases the actual content. No more silent failures.

Out-of-scope flags: **link fetching** (links save metadata-only; no fetch / parse pipeline. CORS, sanitisation, and link rot make this a Sprint-2 lift). **Promoting a Mine pack to org-wide** via the share toggle exists in the UI but the visibility filter logic should be re-verified once a second user account is in localStorage.

**3. Sprint 1 deliverables for PM/leadership/QA distribution.** Two artefacts saved to `~/Desktop` and to the worktree:
- `YourAI_Sprint_1_Feature_Breakdown.xlsx` — 8 modules / 22 sub-modules / 70 features, formatted per `.claude-context/wbs-format.md`. Module-level scope reference; backend-pending items flagged "In Progress" with one-line notes.
- `FRD_Sprint_1_Tenant_Chat.docx` (v1.1) — 67 numbered QA scenarios across 12 surface groups, with embedded screenshots for the four module surfaces I could capture cleanly (chat empty state, doc attached chip, vault picker, KP picker). Markdown source at `docs/extracted/Sprint_1_Tenant_Chat.md` is the source of truth; regenerate via `node build_sprint1_frd_docx.cjs` from the worktree. **v1.1 corrections from initial draft:** upload cap = 5 per upload action (additive uploads bypass the cap, no per-conversation total), front-end response cards + right-rail artifact panel are out of Sprint 1 scope (deferred), task responses delivered inline as standard streamed chat messages.

**Memory + format conventions captured:**
- FRD format is **always .docx** (per Arjun's correction mid-session). Spreadsheets are for WBS / Delivery Tracker artefacts, not FRDs. Saved to user-memory `feedback_preferences.md`.
- For browser screenshots embedded in deliverables: macOS `screencapture` with `-R x,y,w,h` works for static UI states (chat empty, panels), but loses transient states (open dropdowns, popovers) due to focus-stealing when Claude Code is in front. The Claude in Chrome MCP screenshot sees those states correctly but saves to extension storage. Workaround for future captures: drive the browser yourself when the screenshot needs a transient state, or accept inline-MCP-only references for those cases.

**Bundle progression today**: `index-CMxNkd4M.js` → `index-EoE_TMlr.js` → `index-DJdRrLNV.js` (current). Production verified after each deploy.

**Next up**: Timeline intent removal (paused mid-investigation when Arjun pivoted to KP). Inventory of touchpoints already grepped — 12 live references across 9 files (intents.ts × 3, intentDetector.ts × 2, cardToMarkdown.ts × 2, mockCardData.ts × 2, IntentArtifactPanel.tsx × 2, TimelineCard.tsx (delete), IntentCard.tsx × 4, ChatView.jsx × 4, api/chat.ts × 1). Will pick up next session unless the priority shifts.

**2026-05-05** — Quick fix session on external-user UX. PM caught two related issues during a client demo: external users had no way to sign out, and the single-workspace auto-redirect was steering them into `WorkspaceChatView` immediately on login, where the sidebar offered no auth controls. Two-line fix in `ChatView.jsx` (delete the single-workspace branch in the external-user routing effect) plus a new footer block in `WorkspaceSidebar` (`WorkspaceChatView.tsx`) that always renders user identity + Sign out for every role. Internal users navigating into a workspace had the same auth-control gap, so the fix is symmetric. Local build clean (`index-lSQGlu5X.js`); committed `4302cc7` on `claude/great-banach`. **Not yet pushed/deployed** — awaiting Arjun's go-ahead before merging to `yourai/main`. CLAUDE.md updated with a new convention (full-replacement chat surfaces need their own profile/sign-out controls) and a new do-not-reintroduce entry (single-workspace auto-redirect for externals).

**2026-05-04** — Long iterative day across chat surfaces. 13 commits, 8 prod deploys (`index-D77MkLja.js` → `index-qEb6UzZi.js` → `index-CQo3vPgH.js` → `index-H3i7QabD.js` → `index-NzvBviu_.js` → `index-DTBjC5vC.js` → `index-Dn4HdlFN.js` → `index-CDv1DHUH.js` → `index-BPwupj0I.js` → **`index-D6rEeq-C.js`** current). Three big architectural moves landed plus a chat-killer fix.

**1. Chat-killer ReferenceError fix (CRITICAL).** Every send threw `ReferenceError: vaultScopeContext is not defined` inside the click handler — the user msg appeared in the thread but the bot reply never mounted. Root caused via CDP probe driving Chrome on the dev server. The variable was retired in the 2026-04-30 Search-my-docs cleanup but its READ-SITE at the "Final assembly" step in `sendMessage` was missed (`const effectiveDocContext = mergedDocContent || vaultSelectionContext || vaultScopeContext;`). CLAUDE.md gotcha #14 already documented the retirement; the dangling reference just slipped through. Fixed by dropping `vaultScopeContext` from the precedence chain. **Affected every intent including General Chat — this was the root cause of every "the chat doesn't work" report from the day's session.** Bundle that introduced it was the `b2a4447` design refresh; bundle that fixed it was `9d0c8cc` / `index-CQo3vPgH.js`.

**2. Card-intent results moved to a Claude-style right-rail artifact panel + render as MARKDOWN report.** Card responses (Risk Memo, Summary, Comparison, Case Brief, Research, Clause Analysis, Timeline) used to render the full editorial card inline in the chat thread, blowing out the conversation flow. Now:
- **Inline chat**: a compact preview chip — eyebrow (`RISK MEMO`) + DM Serif title (matter / document / "N findings") + "Open" / "Viewing" pill.
- **Right-rail panel**: 540 px, sibling of chat-main (chat shrinks; not an overlay). Auto-opens on first arrival, anchored to that message. Header has Copy-as-Markdown / Fullscreen / Close. Fullscreen mode renders as a centered ~720 px column.
- **Body is markdown, not card chrome**: per-intent serializers in `src/lib/cardToMarkdown.ts` turn each card's structured JSON into a clean markdown report (h1 + meta line + h2 sections + bullet lists + plain blockquotes). Panel renders via ReactMarkdown with simple report styling: 720 px column, DM Sans body, DM Serif only for h1, h2 with subtle border-bottom, no pills/tiles/coloured rails. **PM read: "should look like a report, not fancy shit."**
- **`pickTitle()` rejects generic LLM titles**: "Risk Assessment of Uploaded Documents" / "Untitled case" / "Legal Inquiry" / "This document" all detected via `GENERIC_TITLE` regex and replaced with the actual `documentName` (extension stripped). All seven serializers route through `pickTitle(d, fallbackLabel)`.
- **Click chip → reopens panel**. Switching demos (`/demo-risk` → `/demo-summary`) updates the panel to the new artifact. `find_document` keeps its inline FileResultsCard — search results read better in the conversation flow.
- New file: `src/components/chat/IntentArtifactPanel.tsx` (~190 lines). New file: `src/lib/cardToMarkdown.ts` (~340 lines, 7 serializers + `pickTitle` + `isGenericTitle` helpers).

**3. Doc-source confirmation when card intent + already-attached doc.** When the user asks for a card analysis with documents already in session context (sessionDocContext / pendingAttachments / activeVaultDocument / activeVaultFolder), the bot pauses and asks instead of silently picking docs. Rendered as **plain prose with two inline `<a>` text links** (not a styled card):
> *I see you have **Master Services Agreement — Acme Corp** attached. Should I run **Clause Analysis** on this document, or would you like to upload a new one?*
>
> Yes, use it · I'll upload a new one

"Yes, use it" → re-fires `sendMessage` with `skipDocConfirmation: true`, the analysis runs on the existing context. "I'll upload a new one" → message swaps to "OK — drop the new document via the + button…". The confirmation also fires when activeIntent is still general_chat but the message will auto-switch ("Do clause analysis of attached doc"): `detectIntent` looks ahead to compute `willBeCardIntent`, the gate uses that instead of the live `activeIntent`.

**4. LLM writes the chit-chat reply now (drop the static dictionary).** When a user picks a card intent (e.g. Risk Assessment) and types a chit-chat message ("hi", "how are you", "what can you do") with no document attached, the Edge would force JSON via `response_format` and emit an empty schema → card empty-state. PM read: "feels like the bot ignored my hello." Earlier in the day I shipped a static prefix dictionary + per-intent body. Replaced with a real LLM round-trip: `edgeIntent` flips to `'general_chat'` (so the Edge does NOT force JSON) and `messageForEdge` gets a context preamble naming the active card intent + telling the LLM "no document attached yet — respond warmly + remind them what to upload, prose only, ≤80 words". User's chat bubble shows their original message; only the Edge sees the augmented version. Bot-message metadata also flips to `intent: 'general_chat'` when the override fires so downstream filters / card dispatchers don't try to render this as structured. Detection covers `hi/hey/hello/yo/sup/howdy/greetings`, `how are you / how's it going / how r u`, `what's up/wassup`, `what can you do / who are you / what's your name / tell me about yourself`, `thanks/thx/ty`, `nm/nothing much/fine/good/great/lol/haha/hmm/help/?`, plus a length-≤60 + no-analysis-verb fallback.

**5. Await text extraction before send** — fixes first-turn placeholder bug. New `extractionPromisesRef` (Map<attachmentId, Promise<text>>). `handleAttachFiles` stores each `extractFileText` promise. `sendMessage` awaits any unresolved promises (12 s max) for the current `pendingAttachments` before assembling `messageForEdge`, then re-resolves content from the promise return values (state may not have applied within the same async tick). Without this, the first send shipped a `[File: …] Text extraction is still in progress…` placeholder that the LLM read as "no doc" and replied with the upload prompt.

**6. Hide stale "Current search:" breadcrumb when nothing is attached.** Earlier the breadcrumb rendered unconditionally → `Current search: attached chat files` while the chat had nothing attached. Now gated on `hasAttachments OR activeKnowledgePack OR scope !== 'files'`. Default-scope + zero attachments + no pack → no breadcrumb.

**7. Loosen RiskMemoCard empty-state detection.** Was strict-blank on `findings + matterName + executiveSummary + documentName`. LLM hallucinates "Legal Inquiry" / "general legal inquiry" matterName + executiveSummary for trivial prompts → strict check failed → card rendered with all fields empty. Now triggers on the strongest signal: `no documentName AND no findings AND no highlightQuote`.

**8. Quick Start prefills inlined.** Previously looked up by title (`SUGGESTED.find(p => p.title === 'Summarise a document')?.prompt || ''`). Title drift returned `undefined` → `if (q.prefill)` gated `setInput` off → textarea stayed empty → send button disabled. Inlined the long prompt strings directly in the QUICK array.

**9. YourVault scope no longer pre-commits.** Picking YourVault from SearchScopePill opens the doc-picker modal WITHOUT setting `searchScope='vault'`. Scope commits only when the user actually attaches a doc inside the modal. Closing without a pick keeps the prior scope, so the breadcrumb doesn't lie.

**10. Lovable references removed.** `vite.config.ts` (lovable-tagger import + plugin), `package.json` (devDep), `package-lock.json` (regenerated), `README.md` ("Pushed changes will also be reflected in Lovable" → "Local development"), `CLAUDE.md` ("Lovable-generated clone/dev instructions" → "Clone/dev instructions"). Zero `lovable` matches remain in tracked files.

**11. Polish** — artifact panel outer background flipped from `#FDFBF5` (warm cream) to `#FFFFFF` (white); Copy button tooltip "Copy as JSON" → "Copy as Markdown" (it always wrote markdown after the body switched to ReactMarkdown).

**Himanshu QA pass — clean.** Zero `ReferenceError` / `TypeError` / `Uncaught` across SPA load, sidebar nav sweep, all 7 `/demo-*` commands, find_document, doc-confirm both branches, chit-chat both turns, real Edge round-trip, panel close+reopen+fullscreen, intent-switching. One pre-existing functional issue flagged: **Audit Logs sidebar entry is a no-op** (handler is literal `() => { /* TODO: Part 5+ wires real audit-logs panel */ }`). Two polish nits (Copy tooltip + bg-color) fixed and re-deployed.

**Reversed do-not-reintroduce items (all designer-driven, with the original objections addressed):**
- **Three-scope SearchScope dropdown** (File Search / YourVault / Workspaces) — back as `SearchScopePill`, but each option now carries a one-line subtitle ("Attached files in this chat · fastest, most precise") and a persistent `Current search:` breadcrumb addresses the prior "what corpus is the AI using?" objection. Workspaces option is visual-only — no cross-workspace retrieval pipeline (matter-privilege footgun stays closed).
- **Source / Pack pills row beneath input** — back as part of the empty-state Optional box. Pre-empted the "engineer-speak noun" objection by adding the YourVault doc-picker modal (when scope = vault, opens a modal that lets the user pick a specific doc).

**Bundles deployed in order, with what each one fixed**:
- `b2a4447` / `index-qEb6UzZi.js` — designer UX refresh (the chat-killer was already in here)
- `9d0c8cc` / `index-CQo3vPgH.js` — **chat-killer fix** + Quick Start prefills + scope/empty-state polish
- `d63dc5a` / `index-H3i7QabD.js` — hide stale breadcrumb + greeting chit-chat (static prefix v1)
- `f49c8b5` / `index-NzvBviu_.js` — broaden chit-chat regex + per-prefix variants
- `014ee95` / `index-DTBjC5vC.js` — LLM writes chit-chat replies (drop static dict)
- `9f6664e` / `index-BVs4xVWi.js` — **artifact panel** (chip + right rail)
- `509cc83` / `index-Dn4HdlFN.js` — artifact panel renders as **markdown report**
- `1590f01` / `index-CDv1DHUH.js` — **doc-source confirmation** (initial card-styled version)
- `e21c2b1` / (pre-bundle bump) — await extraction + reject generic titles via `pickTitle`
- `898b024` / `index-BQJmhLFD.js` — confirmation also fires on auto-switched card intents
- `8a21f9f` / `index-BPwupj0I.js` — **remove Lovable** + render confirmation as **prose** (text links instead of pill buttons)
- `c1f63ee` / **`index-D6rEeq-C.js`** (current) — white panel bg + accurate Copy tooltip

CLAUDE.md + new `.claude-context/artifact-panel-pattern.md` updated to reflect the new architecture.

**2026-05-01** — Major designer-led UX refresh across chat surfaces, Workspaces page, and YourVault page. Designer brief came in as 6 mockup screens; implemented to match. Two `do-not-reintroduce` items were consciously reversed (the designer addressed the original objections with explanatory subtitles + a persistent "Current search:" breadcrumb).

**Chat empty state**:
- New subtitle: "Start with a question, or add documents for context."
- Single input box: textarea on top + 4-pill row beneath divider (`+ Attach` / Intent / Search Within / Pack)
- Status line below: `Using {intent} · {scope} · {pack} pack` (gold for pack)
- Optional box: `Optional · Upload files | Source: ▼ | Pack: ▼` + Quick starts row (Review contract / Summarize / Draft email + More >)
- Drop tile + merged pill row removed in empty state — Quick Starts row replaces them (More button opens a verb-bucketed overflow popover via `emptyMoreRef` / `isEmptyMoreOpen`)

**Chat populated state**:
- Gold "Current search:" breadcrumb above the input box (`Current search: attached chat files · {pack name}`)
- Bottom controls row: `+` attach + Search Within left, pack pill (when active) + intent pill + send right
- Intent pill carries a bucket-colored dot prefix (DEFAULT gray / ASK & RESEARCH blue / ANALYZE gold / DRAFT green)

**Search Within scope dropdown** (`SearchScopePill` in `ChatView.jsx`):
- 3 options: File Search / YourVault / Workspaces, each with one-line subtitle
- Picking YourVault opens a real **doc-picker modal** (search input + list + "Use in chat" CTA per row + "Open YourVault →" footer) via `isVaultPickerModalOpen` state
- Picking Workspaces is visual-only — no retrieval wired (matter-privilege footgun would resurface if it did)
- Each input row (empty-state pill row, Optional row, populated-chat) gets its own `isOpen` state (`isScopeOpenInput` / `isScopeOpenOptional`) so two popovers can't render simultaneously

**Intent dropdown**:
- Selected intent now shows a one-line subtitle ("how it changes the prompt") at the bottom of the dropdown via the new `INTENT_DESCRIPTIONS` map in `src/lib/intents.ts`
- Bucket section headers carry a colored dot via `BUCKET_COLORS` (DEFAULT/ASK & RESEARCH/ANALYZE/DRAFT)
- Selected intent pill in the input box carries the same bucket-colored dot prefix

**Knowledge Pack picker — switched from dropdown to modal**:
- All three pack pills now open a full modal (search input + list with "Use" CTA + "No pack" row + "Manage knowledge packs →" footer) via `isPackPickerModalOpen`
- Mirrors the YourVault picker modal exactly — consistent picker pattern

**Workspaces page**:
- Hero: "One workspace per matter" + "Each workspace holds documents, chats, and team for one case, deal, or engagement."
- Toolbar: search by matter / client / member / document + Category filter + Sort + Clear filters
- Cards: practice-area icon tile + uppercase pill (LITIGATION / TRUST & ESTATE / CORPORATE / EMPLOYMENT / EXTERNAL / GENERAL — pulled from `workspace.category` if set, else inferred from name keywords); DM Serif title; members + docs + active row; avatar stack; "Client has access" warning when external members present; Access label
- **Status badge ("Ready: N indexed/shared" / "Needs review: N processing") removed from cards** per PM call — was visual noise; the warning row already conveys access risk
- **Status filter chip removed from toolbar** — left Type (renamed Category) + Sort
- **"Create from category" footer** with 6 chips (Litigation Matter / M&A Deal / Trust & Estate / Employment / Client Portal / General) — clicking pre-fills the Category dropdown in the Create modal
- **Category is required** on the Create Workspace modal Step 1 — Continue is disabled until both `name` AND `category` are set; new `category: WorkspaceCategory` field on `Workspace` type in `src/lib/workspace.ts`

**YourVault page** (`DocumentVaultPanel`):
- Hero: "Ask across your documents" + subtitle (when at root); folder name + breadcrumb when inside a folder
- Upload (outline) + New Document (navy) buttons top-right of hero
- Big rounded gold-bordered Ask-anything bar with sparkle + ⌘K shortcut + example sub-text ("e.g., 'find indemnification clauses across Acme contracts'")
- Step-numbered toolbar: `1. Visualize` (List/Grid toggle — visual only) · `{N} docs` context · `3. Refine` (collapses Date/Uploader/Type/Sort chips behind a dropdown — chips render only when `openFilterMenu === 'refine'`) · `4. Move` ("Drag a doc into chat" hint)
- Existing Org-Admin scope tabs (All / Org-wide / Mine) preserved as a slim strip above hero
- Inspect right rail (selected-doc detail panel) NOT yet shipped — deferred follow-up

**Known regressions / scope cuts**:
- Vault `+` attach button is back as a small icon-only pill in both empty-state and populated-chat input rows; opens the YourVault picker modal
- Workspace `inferStatus()` and `STATUS_FILTERS` constants are dead code (still in `WorkspacesPage.tsx`, harmless)
- YourVault Inspect rail (selected-doc details panel from designer mockup 5) deferred
- Workspaces scope option in SearchScopePill is visual-only — no cross-workspace retrieval

**Bundle deployed**: TBD (this commit). Production URL: `https://yourai-black.vercel.app/chat`. Verify post-deploy with `curl -s https://yourai-black.vercel.app/chat | grep -oE 'index-[A-Za-z0-9_-]+\.js'`.

**2026-04-30 (evening, into 2026-05-01)** — One long iterative session on the chat empty-state input and intent dropdowns; eight prod deploys. Final shipped state on `yourai/main`:

- **Tile-based home retired**: `/chat/home` deleted; non-external users land directly on `/chat` (General Chat); externals still go to `/chat/workspaces`. `<Navigate to="/chat" replace>` route catches stale bookmarks. `HomeTileLauncher` (~140 lines) + `ArrowRight` alias + sidebar Home item + `onGoHome` prop + `initialView === 'home'` branch + conditional render block all deleted from ChatView.
- **`+` searchable picker** is the only YourVault attach affordance. Always-on search input + filtered doc list with folder breadcrumbs + Detach row when something's pinned + "Open YourVault →" footer. Iterated through three rejected designs to get here (per-item submenus → three-scope dropdown → verb toggle pair). Each rejection was driven by a concrete PM concern.
- **Verb-bucketed intent dropdowns**: `INTENT_BUCKETS` (DEFAULT / ASK & RESEARCH / ANALYZE / DRAFT) + `groupIntentsByBucket()` in `src/lib/intents.ts`. Headers at 11 px / 700 weight / `--text-primary` with 0.14em tracking; non-first buckets get a navy 2% wash. Both the populated-chat dropdown and the empty-state More overflow render from the same source.
- **KP dropdown** (`No pack ▾`) gets the same search-first picker pattern (sticky search input only when >5 packs, "Manage knowledge packs →" footer).
- **Drop zone persists into active chat** (both prior gates dropped); chat-attached files auto-save to YourVault including extracted text content (`vaultIdByFileName` map backfills content on extraction completion).
- **Textarea scrollbar artefact suppressed** via two CSS rules on the existing `.no-focus-ring` class — kills the macOS "Always show scrollbars" track that appeared between the textarea and KP dropdown.

Bundles deployed in order: `index-DgbYKmFd.js` → `DgzIvM-B` → `6r6PobtI` (`/chat/home` redirect) → `fg9y7LnE` (verb buckets + scrollbar fix) → `PfqRJ9kO` (search-first pickers) → `CtupL6le` (collapsed `+` dropdown) → `CKc9Oetu` (dropped Search my docs toggle) → **`D77MkLja` (bolder bucket headers — current)**.

PM raised a separate, larger concern late in the session: responsive design across all viewports ("CSS html is really bad, sometimes I have to zoom out"). I scoped a focused first-wave on tenant chat with a `useViewport()` hook + 5 breakpoints + concrete fix list; awaiting PM go-ahead before executing because the wider audit (SuperAdmin, full-page panels, workflow builder, workspace chat) is days of work.

CLAUDE.md + PROGRESS.md reconciled — the day's stepping-stone iterations were collapsed into one accurate "What's built" entry plus a single "Recent decisions" entry that captures the journey as a design lesson. Earlier in-session entries describing transient states were removed.

**2026-04-30** — Non-code session focused on PM deliverables. Generated **`YourAI_WBS.xlsx`** — Work Breakdown Structure scope reference: 5 sheets (Overview + Tenant Chat + Super Admin + Org Admin + Shared & Infra), 35 modules / 85 sub-modules / 550 features, 86.7% completion weighted. Saved to `/Users/admin/Downloads/scope-creator-ai/.claude/worktrees/great-banach/YourAI_WBS.xlsx` and Desktop. Then generated **`YourAI_Delivery_Tracker.xlsx`** — feature-level delivery tracker for FE / BE / AI engineering leads to fill in: 7 sheets (Instructions + Tenant Chat + Super Admin + Org Admin + API & Backend + AI · Python + RAID). First-pass v1 was 471 platform feature rows exploded from WBS bullets — too granular ("As a PM, i want feature wise clarity, this is way way technical"). Re-rolled to v2 at PM-level: **257 platform feature rows** (137 Tenant Chat + 61 SA + 59 Org), each row a user-facing capability not an implementation chrome bullet. Pre-tagged with team ownership / priority / phase / dependencies; FE / BE / AI status & dates blank for leads. Engineering sheets (89 API endpoints, 90 AI tasks across 17 capabilities, 27 RAID entries) deliberately stay at engineering granularity — different audience. Status dropdowns + conditional formatting (Done=green / In Progress=yellow / Blocked=red / In Review=blue) + auto-filters + freeze panes set up so the file is usable for stand-ups out of the box. Saved both Excel files to Desktop. Then captured **format specs** for both deliverables in `.claude-context/wbs-format.md` and `.claude-context/delivery-tracker-format.md` so future sessions can reproduce the structure without re-deriving. CLAUDE.md `.claude-context/` index updated to reference both new docs (also fixed drift by adding 3 previously-orphaned context files: `vault-content-rag-plan.md`, `himanshu-knowledge.md`, `ai-chat-regression-set.md`). Reference Python builders in `/tmp/build_wbs.py`, `/tmp/build_tracker.py`, `/tmp/build_tracker_v2.py`. Granularity convention discovered: for tracker docs, features must be PM-level user-facing capabilities (~3-6 per sub-module), NOT implementation-level chrome (CSS, hex codes, library internals, defensive guards). Implementation chrome belongs in WBS Notes column or in nothing at all.

**2026-04-29** — Heavy day across multiple surfaces. **YourVault** rename portal-wide (sidebar / page titles / modal headers / tile labels / route titles); code symbols + storage keys deliberately untouched. **YourVault table** root-view column order changed to **Folder → Name → Owner → Size → Modified → Actions** with Folder bolded as the primary "case file" identifier (Ryan Robertson framing). **New Document modal** field order changed to **Folder → Document name → Description → File**. **YourVault toolbar cleanup** — Sort pill and the duplicate `FOLDERS` chip strip both removed (left rail is the single folder-nav surface). **Chat empty-state restructure (Ryan's spec)** — full layout rewrite: hero → big primary input under hero → drop-files tile → merged icon-pill row → trust footer. Source dropdown (`General Chat` / `Workspace ▸` / `YourVault ▸`) replaces the `+` attach button; KP dropdown sits alongside. Skipped per PM call: Google Drive option, model selector, NotebookLM-style "search the web" surface. **Capability-grid attempt earlier in the day was reverted same-day** after the PM saw it live ("the entire page is too god damn long, this is so wrong") — chip-in-input pattern reverted at the same time; both added to CLAUDE.md's do-not-reintroduce list. **Aashna's P1 polish** initially shipped at the standalone `/chatviewv2` preview slug for A/B with Ryan, then promoted to `/chat` and the preview surface deleted (component, route, prop, viewport-state aliases all gone): hero `paddingTop` 8vh → 12vh, larger greeting, vertical rhythm 16/12/18 → 40/28/28 px, `<900px` viewport caps the merged-pill row at 4 visible, `<768px` viewport stacks the input row vertically. **Active pill reverted to solid navy fill** (Aashna recommended outline; PM had final call). **Intent-pick override fix** — `sendMessage`'s two auto-switch paths were silently overriding manual user picks; new `hasManualIntentPick` flag gates both auto-switches and is set wherever the user explicitly picks an intent (cleared in `handleNewThread`). **Chat search** extended from title-only to title-OR-preview-OR-message-content, case-insensitive; matched-on-body rows show an italic 80-char snippet preview in place of the standard meta line. **Pre-fill auto-grow fix** — `setInput()` programmatic value updates don't fire the textarea's `onInput`, so a `useEffect` watching `input` now runs the auto-resize. **Drop-files tile shrunk** from a 96 px stacked block to a single ~44 px inline strip. **More pill renamed to "More operations"**. **FRD authoring formalised** with `docs/frd-template.md`; first FRD authored against it is `docs/extracted/FRD_Intent_Cards.md` (615 lines, all 8 cards, 46 QA scenarios). **Vercel webhook hiccup** caught and resolved by an empty-commit retrigger after a normal push silently failed to flip the prod bundle. CLAUDE.md updated with two new gotchas (programmatic setState doesn't fire DOM events; auto-switch must respect manual picks), the Vercel webhook retrigger pattern, and a do-not-reintroduce list (capability grid, chip-in-input, NotebookLM-style sources modal). Final prod bundle: `index-DgbYKmFd.js`.

**2026-04-28** — Authored `docs/extracted/intent-cards.md`, a per-card scope reference covering all 8 intent-card components (intent ID, trigger, source pill, accent color, shell, data shape, render structure, populated / empty / partial states, edge cases, source files) plus the shared chrome shells. Then unified all 8 cards on a single `EditorialShell` — `SummaryCard` (gold), `ComparisonCard` (navy), `CaseBriefCard` (green), `ResearchBriefCard` (indigo), and `FileResultsCard` (teal) migrated off the older `CardShell` / `CardHeader` / `CardFooter` trio onto `EditorialShell` + `EditorialHeader` + `EditorialFooter`. `EditorialShell` now accepts an `accentColor` prop (defaults to gold so the existing Risk / Clause / Timeline cards render unchanged); per-intent accent tokens exported as `ACCENTS.gold | navy | green | indigo | teal`. Body padding standardised to `26 32 28`, source pill prop renamed `type` → `kind` across migrated cards, footer pattern unified on text-only `EditorialFooter`. FileResultsCard cleanup: dropped the synthetic `Personal vault · N matches` sourceName, dropped the trio of inline button style objects in favour of one shared `InlineButton` component (variant `primary | outline`), unified body padding between empty-state and result-row variants. Deleted `CardShell.tsx` / `CardHeader.tsx` / `CardFooter.tsx` — no remaining importers in the intent-card system. Resolves "What's next #13".

**2026-04-28** — Shipped P8 MVP **find-document intent** for in-chat vault search: explicit "Find Document" pill in the intent dropdown plus keyword auto-switch (find / search / where is / do I have / show me / list, anchored on file/doc/document). New `FileResultsCard` renders state-aware variants (empty vault, empty query, no match, 1 / 2-5 / top 5 of N) with teal accent; ChatView short-circuits the `/api/chat` fetch when the intent fires, runs a substring filter over name + description + fileName + folder breadcrumb across the personal vault, and routes the row `Use` button through the existing `handleSelectVaultDocument` (clean since this morning's bug-fix commit) via window events.

**2026-04-28** — Reverted "Case Workspaces" → "Workspaces". Removed the stale "One attachment per chat" gold callout from the chat empty state and the onboarding payment-confirm screen (the rule was killed yesterday). Fixed the persistent-filter bug in Vault search: typing in the bar or clicking "All documents" in the tree now drops AI-set transient filters (`resultLimit`, `askExplanation`, sort), while explicit chip filters (date / uploader / type) stay set. Bundle hash on prod: `index-DySlL7FR.js`.

**2026-04-27** — Big day. Six commits ahead of `yourai/main` at peak, before merging in batches. Across the day shipped: nested folders + recursive upload + UI label cleanup in Vault (Wendy P3 / P4 / P5), onboarding restructure + invited-user fast path (P1 / P2), tile-based home at `/chat/home` with role-aware tiles + the sidebar Home button + Dashboard→Chat rename + dynamic active state, full-page two-pane redesign of Vault & Knowledge Packs per Aashna review (left rail + hero + table; kebab menu for row actions; pack cards flipped to vertical), Workspaces ↔ Case Workspaces rename (later reverted), additive uploads with inline "Start fresh →" escape hatch (Wendy P7, supersedes DEC-095), the doc-inlining fix that finally pipes file content into the Edge message body (covers pendingAttachments, sessionDocContext, activeVaultDocument, activeVaultFolder), `closeAllPanels()` helper for full-page panel mutual exclusion, the Vault Find/Search-in-page feature with filter chips + Ask-anything NL parser (P8 v1, Option 2), and **real PDFs as seed vault docs** (4 actual files in `public/sample-docs/` + `content` field stamped on each entry so the AI grounds in the real text). Bumped localStorage seed key to `yourai_document_vault_v2`. Bundle hash on prod: `index-Bk1nY4mu.js`.

**2026-04-25** — Aashna sent two fresh batches of mockup PDFs (picker chat-mode + 8 builder views). Rewrote the **Workflows picker** (single unified grid with no maxWidth cap, AI PIPELINES eyebrow, Running-in pill, restacked StatTiles, underline filter tabs, restored practice-area top stripe, PIPELINE op-icon row) and the **Workflow Builder** end-to-end (centered hero with step-pill indicator, white rounded panel body, navy step-number circles, in-panel CTAs, uppercase mono section labels, warm-beige reference-doc inset). Then fixed three connected runtime issues: (1) all 7 intent cards now render a friendly "No document supplied" empty-state instead of grids of `—` dashes when the LLM returns a schema-shaped envelope with no data; (2) Edge `api/chat.ts` system prompt got a `MISSING DOCUMENT HANDLING` branch so the bot asks for an upload instead of off-topic-refusing legitimate analysis requests; (3) `WorkspaceChatView` was still calling the dead `callLLM` path — routed it through `/api/chat` like everything else. Also cleaned up `ChatView`'s misleading "No LLM backend available" fallback so real Edge errors surface verbatim, dropped vestigial `credentials: 'include'`, added trailing decoder flush. Prod HEAD tracking `yourai/main` — verify with `curl -s https://yourai-black.vercel.app/chat | grep -oE 'index-[A-Za-z0-9_-]+\.js'`.

**2026-04-24 (afternoon)** — Follow-up session: applied aashna's round-3 fixes (picker grid `maxWidth: 960` cap on all three sections — *later removed in 2026-04-25 picker rewrite* — + audit-log modal step-number neutralisation with soft gray pill + dropped duplicate operation label in subtitle), wired `classifyDocs()` into `PreRunModal` (auto-classification on upload ready, per-row uppercase type chip, summary banner), and v2-tightened all 6 workflow operation prompts with word targets + citation hedging + explicit table syntax + findings-vs-actions distinctness rule.

**2026-04-24** — Session focused on: empty-state anchor + 880px container rewrite, sidebar refresh (Search Chats, ⌘N New Chat, Invite Team widened), full aashna-led UX pass across Workflows panel + Builder + Run Panel, real LLM execution via `/api/chat` (workflowPrompts + workflowExecutor), document-style report (Option D), and three FRDs on Desktop (Workflows, Workflow Operations, Incorrect Document Handling).
