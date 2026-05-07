# FRD — YourAI Sprint 1: Tenant Chat

**Version:** 1.1
**Date:** 2026-05-06
**Author:** Arjun Sharma, Product
**Status:** Draft
**Related:** FRD_Intent_System.docx, FRD_Intent_Cards.md, FRD_Incorrect_Document_Handling.docx

---

## 1. Document overview

### 1.1 Purpose

This document specifies the functional behaviour of YourAI's Sprint 1 tenant chat experience — the user-facing capabilities an attorney, paralegal, or external client encounters when they sign in and use the assistant. It covers eight modules: Chat, Document Upload, YourVault Attach, Knowledge Pack, Mid-Thread Document Addition, Chit-Chat Handling, Tasks (Intents) & Auto-Switch, and Task Responses (delivered inline in the chat thread). It exists to give product managers, QA engineers, executives, and leadership a single plain-English reference for what Sprint 1 delivers — what the user sees, what they can do, and how the system should behave in every state.

### 1.2 Audience

Product managers, QA engineers, strategists, executives, leadership team.

### 1.3 Scope

**In scope:**

- Tenant chat conversational surface (general chat, streaming responses, history, search, source attribution)
- Document upload to chat (attach, multi-file with a 5-document-per-upload cap, drop zone, auto-save to vault)
- Attach a document from YourVault (picker, search, attach/detach)
- Knowledge Pack (browse, manage, attach, scope visibility)
- Mid-thread additive uploads (Document N labelling, "Start fresh" escape) — used to add more documents beyond the 5-per-upload cap
- Chit-chat handling (warm replies, smart guidance, no forced analysis on greetings)
- Task selection, auto-switch on first message, mid-thread change, doc-source confirmation
- Task responses delivered inline in the chat thread as standard streamed messages

**Out of scope (Sprint 1):**

- Front-end card chrome / structured response cards (Risk Memo card, Summary card, Comparison card, etc. as styled UI components)
- Right-rail artifact panel / side-panel report viewer
- In-thread chip preview ("Open" / "Viewing" pill) that anchors to the report
- Copy-as-Markdown button, fullscreen report mode
- Workflows / multi-step pipelines
- Workspace (per-matter) chat surface
- Audit Logs panel
- Mobile-native applications
- Voice / speech input
- Cross-workspace document search
- Live web research (Westlaw / Lexis integrations)
- Super Admin and Org Admin portal modules

### 1.4 Glossary

- **Intent / Task** — a category of legal work the assistant can do (Summary, Risk Memo, Comparison, Case Brief, Research, Clause Analysis, Timeline, Find Document, General Chat). Drives the format and structure of the response the AI returns.
- **Source pill** — a small badge on each AI response indicating where the answer came from (an uploaded document, a vault file, a knowledge pack, or general chat).
- **YourVault** — the user's per-firm document library. Acts as a persistent home for any document the user has uploaded.
- **Knowledge Pack** — a curated bundle of documents and links the AI can be grounded in. Owned per-user or shared org-wide.
- **Empty state** — what a surface looks like when no data exists yet (no message in chat, no document attached, no result for a search).
- **Auto-switch** — system behaviour that detects the user's first message and switches the active task without asking, dropping a small "Switched to X mode" note in the conversation.
- **Manual pick** — when the user explicitly clicks an intent in the dropdown or pill row. A manual pick is sticky: it overrides further auto-detection in the same thread.
- **Additive upload** — uploading a new document mid-thread, which appends to the conversation's document context rather than replacing it.
- **Doc-source confirmation** — a prompt that asks before running a card-style analysis on documents that are already attached, giving the user a chance to swap them.
- **Chit-chat** — casual conversation ("hi", "thanks", "what can you do?") that should not trigger document analysis even when a card-style task is selected.
- **External user** — a client of the law firm, with limited access (workspace chat only, no general chat home).

### 1.5 Document control summary

| Field | Value |
|---|---|
| Version | 1.1 |
| Date | 2026-05-06 |
| Author | Arjun Sharma, Product |
| Status | Draft (pending PM + QA + Eng sign-off) |
| Reviewers | TBD |

---

## 2. Background and context

### 2.1 What the module is

YourAI tenant chat is a private, single-tenant legal AI assistant for US law firms. It gives attorneys and paralegals a chat surface where they can ask questions about their documents, run structured legal tasks (summaries, risk memos, clause analyses, comparisons), and ground answers in their firm's curated knowledge — all without exposing client data to a multi-tenant cloud.

The Sprint 1 deliverable is the foundational tenant-facing chat experience. Everything an end user does — from sending their first message to attaching a document to running a task to reading the resulting report — sits within the modules covered in this FRD.

### 2.2 Why it exists

Attorneys do a lot of repetitive analytical work — reviewing contracts for risk, comparing similar clauses across deals, summarising precedents, drafting standard sections. Each task has a known shape. A general-purpose chatbot doesn't cover any of those shapes natively; it needs prompting, formatting work, and constant re-orientation. YourAI exists to give attorneys those shapes for free: a typed task selector, a structured output, a vault that remembers their documents, and conversational handling that doesn't make them feel like they're talking to a system.

Specific friction points named by client interviews drove key Sprint 1 decisions:

- *"Even though we upload documents into the vault I still have to attach them to the conversation?"* — drove additive uploads (Wendy interview, 2026-04-27).
- *"I'd be glad to review that contract — but the bot just refused, said it can only help with legal matters."* — drove the missing-document branch in the off-topic guardrail.
- *"It feels like the bot ignored my hello."* — drove the chit-chat handling pattern (2026-05-04).
- *"Now do I not trust those numbers because of the answers I gave?"* — drove the cut of the survey before the payment screen in onboarding.

### 2.3 Where it sits

Tenant chat is one of three surfaces in the YourAI product. The other two — Super Admin and Org Admin portals — are out of scope for this FRD. Within tenant chat, Sprint 1 covers the **General Chat** surface (the post-login landing for non-external users). Per-matter Workspace Chat is a separate surface and is out of Sprint 1 scope.

Adjacent modules referenced in this FRD but not specified in detail:

- **YourVault page** — full document management interface. Chat links into it; chat can also pull documents from it via a picker.
- **Knowledge Pack management page** — full pack management interface. Same relationship as YourVault.
- **Bot Persona editor** (Super Admin) — supplies the system prompts that drive task responses. Configured upstream; tenant chat consumes it.

### 2.4 Recent state

As of 2026-05-06, the Sprint 1 surfaces covered in this FRD are live in production. Backend persistence for thread history, vault auto-save, and knowledge-pack CRUD is the remaining gap; UI / UX and the OpenAI integration are stable. Front-end response cards and the right-rail side panel are explicitly **out of Sprint 1 scope** (deferred to a later sprint); in Sprint 1, every AI response — including responses to Risk Memo, Summary, Comparison and other structured tasks — renders inline as a standard streamed chat message.

---

## 3. Module-level functional specification

### 3.1 Chat (conversational core)

The chat surface is the post-login landing for non-external users.

**Layout.** A sidebar on the left (workspace nav, recent threads, search), a main area in the centre (message list, input, drop zone), and an optional right-rail artifact panel that opens when a card-style task produces output.

**Empty state (no messages yet).** A welcoming hero — gold sparkle icon, serif heading, subtitle "Start with a question, or add documents for context" — sits about 14% from the top of the viewport in a centred 880-pixel column. Below the hero: a primary chat input, then a drop-files tile, then a row of suggested action pills (Review a contract, Summarise a document, Draft an email, Legal Research, Case Law Analysis, More operations), then a bottom disclaimer ("YourAI may produce inaccurate information. Always verify critical outputs. Private & encrypted.").

**Populated state.** Once at least one message has been sent, the hero collapses; the message thread fills the main area; the input docks at the bottom with a smaller "+" attach button, an intent pill (collapsed dropdown), and Send. The drop-files tile remains visible below the input throughout the conversation.

**What the user can do.**

- Type a message and press Enter (or click Send) to send. Shift-Enter inserts a newline.
- Watch the AI reply stream in word-by-word.
- Click the source badge on any response to see where the answer came from.
- Click "+ New Chat" in the sidebar to start a fresh conversation.
- Search past conversations from the sidebar (matches against thread title + body content).
- Click any recent thread in the sidebar to resume it.

**States the chat surface can be in.**

| State | Trigger | Visible result |
|---|---|---|
| Empty | Fresh thread, no messages | Hero + suggested prompts + drop tile |
| Sending | User submitted, AI composing | Streaming cursor on the bot bubble |
| Active | At least one full exchange | Message list + docked input |
| Error | AI service unreachable / non-2xx | Bot bubble shows the captured error reason; retry hint |
| Aborted | User-initiated abort (rare) | Silent — no visible error |

![[screenshot:01-chat-empty.png|Figure 1. Chat empty state — hero greeting, primary input, source and pack pickers, optional drop tile, Quick Starts, and trust-signal disclaimer.]]

### 3.2 Document Upload (to chat)

The user attaches files directly to the conversation so the assistant can read and reason over them.

**Entry points.**

- The "+" button on the chat input.
- Drag-and-drop anywhere on the chat surface.
- The drop-files tile below the chat input.

**What happens on attach.**

- The selected files appear as chip previews above the input, each with a per-file remove button.
- Each file's text is extracted in the background (PDF, DOCX, TXT supported).
- Each file is auto-saved to YourVault on attach, with the extracted text backfilled when extraction completes. The user sees a small "saved to YourVault" helper line under the drop tile.
- Once the user sends a message with attachments queued, the document text is inlined into the message context the AI receives.

**Multi-file rules.**

- Up to **5 files per single upload action**.
- Mixed file types in one action are allowed (PDF + DOCX + TXT).
- If the user exceeds the cap, a soft toast says "You can attach up to 5 files at a time" and the excess is dropped from the selection.
- The 5-cap is **per upload action, not per conversation**. The user can keep adding more documents mid-thread via additive uploads (see §3.5); each subsequent upload is again limited to 5 files. There is no hard cap on total documents in a single conversation.

**Persistent drop zone.** Unlike most chats, the drop tile remains visible below the input even after files are attached or the conversation is active. Its label changes to "Add another file (N attached)" when files exist.

**What the user cannot do (intentional).** Attach more than 5 files in a single upload action. Attach files larger than the per-file size cap (current cap surfaced via toast). Drag-and-drop a folder (folders go into YourVault directly).

![[screenshot:02-doc-attached.png|Figure 2. Chat with a document attached — the breadcrumb shows the document name, the Source pill swaps to YourVault, and the Attach button shifts to its filled "Attached" state.]]

### 3.3 Attach a Document from YourVault

The user can pull any previously uploaded document from their personal vault straight into the chat without re-uploading.

**Entry point.** Clicking the "+" button on the chat input opens a small popover. The popover contains a search input (autofocus, real-time filter) and a list of every document in the user's personal vault. If a document is already attached from the vault, a "Detach" row appears at the top.

**Search behaviour.**

- Substring match against the document name, description, and file name.
- Folder breadcrumb shown alongside each result so the user can confirm the right copy.
- "Open YourVault →" footer link routes to the full vault page.

**What happens on attach.**

- The chosen document becomes the active vault attachment for this chat.
- A breadcrumb above the input reads "Current search: attached chat files · {pack name if any}".
- The full extracted text of that document is inlined into the message context for every send in this thread.
- The user can detach at any time by re-opening the picker and clicking Detach.

**Edge cases.**

- A vault entry with no extracted content (rare, only for user-created entries that never had a file) — the AI receives the description as a substitute, and the source badge reads "Vault (description only)".
- A vault document so large that its extracted text exceeds the per-document context cap — the cap is enforced at message-build time, and the truncated suffix is logged invisibly. The AI still sees a meaningful slice.

![[screenshot:03-vault-picker.png|Figure 3. YourVault attach picker — search input on top, list of vault documents with name and one-line description, "Use in chat" button per row, count and "Open YourVault →" footer.]]

### 3.4 Knowledge Pack

A Knowledge Pack is a named, scoped bundle of documents and links the AI grounds answers in. Sprint 1 covers the full lifecycle on the tenant side.

**Browse and manage (Knowledge Packs page).**

- The user sees a grid of pack cards. Each card has an icon, name, ownership pill (Mine / Org-wide), 2-line description, doc/link counts, share-org-wide toggle, and a "Use" button.
- A toolbar above the grid offers: scope segmented control (All / Org-wide / Mine), Owner-filter chip, and "+ New Pack".
- Row-hover reveals a kebab menu with Edit and Delete.
- Clicking "+ New Pack" opens a creation modal: name, description, scope (private / org-wide), and an initial set of documents and links to include.

**Visibility rules.**

| Scope | Who can see | Who can edit |
|---|---|---|
| Mine | Only the creator | Only the creator |
| Org-wide | Everyone in the firm | The creator and Org Admins |

**Use in chat.**

- The user opens the pack picker from the chat input (a separate dropdown next to the "+" attach button).
- The picker is a modal with a search input, a "No pack" row at the top (clears the selection), the list of packs the user has access to, and a "Manage knowledge packs →" footer link.
- The chosen pack becomes the active pack for this thread; the active pack name appears in the breadcrumb above the input.
- The user can switch packs mid-conversation; the new pack applies to the next message onward.

![[screenshot:04-kp-picker.png|Figure 4. Knowledge Pack picker — search input, "No pack" reset row at top, list of packs with name and description, "Use" button per row, "Manage knowledge packs →" footer.]]

### 3.5 Adding Documents Mid-Conversation (Additive Uploads)

Lawyers often add a related document mid-thread (an amendment, a comparable contract, supporting evidence). The conversation has to handle that gracefully without losing prior context.

**What happens when the user uploads mid-thread.**

- The new file goes through the same upload pipeline as a fresh-thread upload (extraction, vault auto-save, chip preview).
- On send, the new document is appended to the conversation's document context — the original document(s) remain.
- Each document is labelled in the AI's context as "Document 1: {filename}", "Document 2 (added 3:42 PM): {filename}", etc., so the AI can disambiguate.
- A small inline system note appears in the thread: "**Added contract.pdf · Document 3** — New topic? **Start a fresh chat →**"
- The "Start a fresh chat" link, when clicked, starts a new thread without the user leaving the page. Soft escape hatch — no modal, no confirmation.

**What the user does NOT lose.**

- Prior message history (the conversation continues).
- Any previously attached documents (still active and attached).
- The active task and any other session settings.

**Edge cases.**

- The user uploads the same file twice — the duplicate detection (by file name and parent folder) re-uses the existing entry rather than creating a copy.
- The user uploads a file that fails extraction — the AI sees a placeholder line acknowledging the file by name; subsequent answers are honest about the failure.

### 3.6 Chit-Chat Handling

Casual messages from the user — greetings, thanks, "what can you do?" — should be answered like a person would, not refused or forced into a document-analysis path.

**When chit-chat handling fires.**

- The user types a message that matches a casual pattern: greetings ("hi", "hey", "hello", "yo", "howdy"), well-being checks ("how are you", "how's it going"), small talk ("what's up", "thanks", "lol", "haha", "hmm", "?", "help"), or capability questions ("what can you do", "who are you", "tell me about yourself").
- A length-and-content fallback also fires: messages 60 characters or shorter with no analysis-trigger verb (review, summarise, compare, draft, etc.) are treated as chit-chat.

**What the bot does.**

- Replies warmly, in prose, in 80 words or fewer.
- If a card-style task is selected (e.g. Risk Memo) but no document is attached, the bot answers casually and gently reminds the user what to upload to use that task.
- Never produces an empty card with placeholder dashes for a casual message.
- Source badge reads "General Chat" on the response.

**What the bot avoids.**

- Static prefix replies ("Hi there! ", "Doing well, thanks for asking! ") — these read robotic by the third turn and were intentionally retired.
- Refusing the message as off-topic.
- Forcing a structured JSON response.

### 3.7 Tasks (Intents) & Auto-Switch

The user picks (or the system detects) which kind of legal task they want, and the assistant tailors its output for that task.

**Available tasks (in dropdown order, grouped by category).**

| Category | Tasks |
|---|---|
| Default | General Chat |
| Ask & Research | Legal Research, Case Law Analysis, Find Document |
| Analyze | Document Summarisation, Comparison, Risk Memo, Clause Analysis, Timeline |
| Draft | (none in Sprint 1) |

**Pick a task explicitly.**

- The user sees a dropdown above the chat input (in populated state, a collapsed pill; in empty state, a horizontal pill row).
- Clicking opens a list grouped by category with a coloured dot indicating the bucket.
- Each task carries a short helper subtitle ("Pull every assumption, party, term, date out of one document", etc.) at the bottom of the dropdown.
- The selected task's name + bucket-coloured dot appears in the input pill.

**Auto-switch on first message.**

- When the user is in General Chat and types their first analytical message ("review this contract for risks", "compare these two NDAs"), the system detects the intended task from keywords.
- The active task switches silently; a small inline note appears in the thread: "Switched to **Risk Memo** mode. Continuing in this conversation."
- The user can ignore, accept, or undo the switch (clicking the small "Switch back" link in the note).

**Manual pick wins (sticky).**

- Once the user has explicitly picked a task in this thread, auto-detection no longer overrides it. The user's intent is sticky for the rest of the conversation.
- A new thread resets this state — auto-switch can fire again on the new thread's first message.

**Suggestion banner (ambiguous match).**

- When a message could match more than one task ("compare and summarise"), a non-blocking suggestion banner appears under the input: "Did you want to **Compare** these documents or **Summarise** them?" The banner debounces 600 ms while the user types and disappears on send.

**Mid-thread change.**

- Picking a different task at any point in an active conversation does not start a new thread.
- The next message uses the new task's response format.
- A small note appears: "Now using **Comparison** mode."

**Doc-source confirmation.**

- When the user runs a card-style analysis (Risk Memo, Clause Analysis, etc.) while documents are already attached to the conversation, the bot pauses and asks before running the analysis.
- The confirmation renders as plain prose with two inline text links (no styled card, no pill buttons): *"I see you have **Master Services Agreement — Acme Corp** attached. Should I run **Clause Analysis** on this document, or would you like to upload a new one? **Yes, use it · I'll upload a new one**"*
- "Yes, use it" runs the analysis on the existing context.
- "I'll upload a new one" replaces the bot's question with "OK — drop the new document via the + button below."

### 3.8 Task Responses (delivered inline in the chat thread)

In Sprint 1, every AI response — including responses to structured legal tasks like Risk Memo, Summary, Comparison, Case Brief, Research, Clause Analysis, and Timeline — is delivered as a **standard streamed chat message** in the conversation thread. There is no separate report panel, no chip preview, and no card-styled UI component around the response.

**What the user sees.**

- The bot's reply appears as a normal chat bubble, the same shape as a General Chat response.
- The body is structured markdown — headings, sub-headings, bullet lists, blockquotes for source quotes — produced by the model in line with the active task's expected shape.
- The source pill below the bubble names the grounding (Document, Vault, Knowledge Pack, or General Chat).

**What is explicitly NOT in Sprint 1.**

- No right-rail artifact panel.
- No chip-style preview anchored to the response ("RISK MEMO · Open").
- No fullscreen reading mode for a task response.
- No "Copy as Markdown" button on the response.
- No card-styled UI chrome (severity pills, accent stripes, structured field tiles, document tile headers) around the response.

The right-rail panel, the in-thread chip, the Copy-as-Markdown affordance, and the per-task card chrome are tracked as a follow-up sprint deliverable. Sprint 1 establishes the conversational core and the response **content shape** (see §4); the **rendering shell** for those responses is a separate piece of work.

**Empty state (no document attached).**

- When the user picks a structured task (e.g. Risk Memo) but has no document attached, the bot's response is a short prose nudge: *"I'd be glad to run a risk memo for you. Upload the document using the + button below — or use Legal Research if it's a citation-only question."* Capped at ~50 words. No empty-card grid, no placeholder dashes.

---

## 4. Per-entity specification — the seven Task Response Shapes

> Sprint 1 ships the **content shape** of each task response, not a rendering shell. Each subsection below describes what fields and structure the AI returns inline as a streamed chat message. Card chrome and the right-rail panel are out of scope for Sprint 1 (see §3.8).

### 4.1 Document Summary

**Purpose.** Pull every key fact, party, date, and term out of a single uploaded document into a digestible memo.

**When it appears.** Task is set to *Document Summarisation* (manually or via auto-switch on phrases like "summarise this", "give me a summary of", "TL;DR of").

**Response shape.**
- A bold title line (drawn from the document name, never a generic LLM-fabricated phrase).
- A meta line beneath the title — clause count, file size, document date.
- Sub-section headings: Executive Summary, Key Facts (each as a bold key + one-line value), Key Points (bullets), Flag (a callout for the top takeaway, if any).

**States.**
- *Populated.* All sections present.
- *Empty.* No document attached. Replaces body with the generic empty-state copy + "+" upload nudge.
- *Partial.* Some fields missing — sections render only when their underlying data is present.

**Edge cases.**
- Document with no parseable date — "Date" line is omitted from meta rather than showing a dash.
- Very long document — content is summarised; no warning shown.

### 4.2 Risk Memo

**Purpose.** Identify high / medium / low severity risks in a single document with location, supporting quote, and a recommendation per finding.

**When it appears.** Task is set to *Risk Assessment* (manually or via auto-switch on phrases like "review for risks", "what's risky about this", "issue spot").

**Response shape.**
- A bold title line.
- Meta line: document name, document meta, upload time.
- An executive summary paragraph.
- A highlight blockquote (top takeaway, italicised).
- A Findings section, with sub-sections per severity: **High (n)**, **Medium (n)**, **Low (n)**.
- Each finding: numbered title, location/owner meta line, supporting quote (blockquote), recommendation in bold.

**States.** Populated / Empty / Partial.

**Edge cases.**
- Severity comes back blank → defaults to Medium.
- Document so vague that no findings can be produced → executive summary opens with the literal sentence "Not covered by supplied documents." followed by a one-sentence reason. Findings list is omitted.

### 4.3 Comparison

**Purpose.** Compare two documents side-by-side on a chosen set of clauses or concepts.

**When it appears.** Task is set to *Clause Comparison* (manually or via auto-switch on phrases like "compare these two", "how do these differ").

**Response shape.**
- A bold title line.
- Meta line: clause count compared.
- A Comparison section: per-clause sub-sections, each with the two documents' positions as bulleted bold-prefixed lines (Doc A: ..., Doc B: ...).
- A closing Recommendation section naming the more favourable position.

**States.** Populated / Empty / Partial.

**Edge cases.**
- Only one document attached — empty state nudges the user to attach a second document.
- The two documents cover different topics — comparison still runs but the clause set is limited to genuine overlaps; mismatches are flagged.

### 4.4 Case Brief

**Purpose.** Produce a structured brief of a court decision — facts, issue, holding, reasoning, application.

**When it appears.** Task is set to *Case Law Analysis* (manually or via auto-switch on phrases like "brief this case", "what does this opinion say").

**Response shape.**
- A bold case name.
- Meta line: court, date, subject area.
- Sub-sections for each structured field: Facts, Issue, Holding, Reasoning, etc.
- A Precedence sub-section: italicised tags + a closing note.
- An Application sub-section: how the case applies to the user's matter (when context is supplied).

**States.** Populated / Empty / Partial.

**Edge cases.**
- Document is not actually a case (it's a contract, a memo) — the literal "Not covered by supplied documents." sentence opens the brief, followed by a short prose explanation.

### 4.5 Legal Research

**Purpose.** Answer a research question grounded in jurisdiction-specific sources (statutes, cases, principles).

**When it appears.** Task is set to *Legal Research* (manually or via auto-switch on phrases like "research the law on", "what's the rule for").

**Response shape.**
- A bold question / topic title.
- Meta line: jurisdiction, source counts (statutes / cases / principles).
- Sub-sections per source bucket: each section's content is the model's prose, followed by an italic *Citations:* line.

**States.** Populated / Empty / Partial.

**Edge cases.**
- Live Westlaw / Lexis is **out of Sprint 1 scope** — the bot hedges instead of fabricating a citation. Verified citations get a "verified" tag; principle-only answers get a "principle-only — verify before citing" caveat.
- Question is too narrow / no source available — empty-state nudges the user to widen or clarify.

### 4.6 Clause Analysis

**Purpose.** Pull each substantive clause out of a single contract, label its risk, and recommend an action per clause.

**When it appears.** Task is set to *Clause Analysis* (manually or via auto-switch on phrases like "analyse the clauses", "go through each clause").

**Response shape.**
- A bold title line.
- Meta line: document name, document meta, upload time.
- A Clauses section with one sub-section per clause: numbered clause title, location meta, severity label, supporting quote (blockquote), interpretation paragraph, recommendation in bold.
- Up to 15 clauses, priority-ordered (HIGH first, then Medium, then Low).

**States.** Populated / Empty / Partial.

**Edge cases.**
- Document with fewer than 15 substantive clauses — the report is shorter; no padding clauses.
- Document is not actually a contract — the literal "Not covered by supplied documents." sentence + a one-sentence reason; analysis is omitted.

### 4.7 Timeline

**Purpose.** Extract every dated event from a document into a chronological timeline.

**When it appears.** Task is set to *Timeline Extraction* (manually or via auto-switch on phrases like "build a timeline of", "what happened when").

**Response shape.**
- A bold title line.
- Meta line: document name, document meta.
- An Events section: chronological list, each event with date, label, and a one-line description.

**States.** Populated / Empty / Partial.

**Edge cases.**
- Document has no dated events — empty-state nudges the user toward Case Brief instead.
- Document has events with unclear dates — those events are omitted, not approximated.

---

## 5. Cross-entity / cross-cutting behaviour

### 5.1 Empty-state pattern (for structured tasks)

When a structured task (Risk Memo, Summary, Comparison, Case Brief, Research, Clause Analysis, Timeline) is selected but no document is attached, the bot's response is a short, friendly prose nudge (≤50 words) telling the user what to upload, with a one-line hint pointing to a sibling task when relevant. The bot never returns an empty structured response with placeholder dashes.

### 5.2 Source attribution conventions

Every AI response carries one source pill. The pill text and badge colour correspond to the response's grounding:

| Source pill | When it shows |
|---|---|
| General Chat | No document attached; chit-chat or broad legal question |
| Document | A user-uploaded file was the primary grounding |
| Vault | A YourVault document was the primary grounding |
| Knowledge Pack | A pack was the primary grounding |
| Multiple sources | Two or more grounding sources were combined |

### 5.3 Manual override of auto-detection

Once the user explicitly picks a task in this thread, auto-detection won't override it. Implementation note: this is a session-level "manual pick" flag set on every explicit click and cleared on new thread.

### 5.4 "Not covered by supplied documents" anti-hallucination protocol

Every card-style task's system prompt enforces a literal opening sentence — "Not covered by supplied documents." — when the uploaded material does not contain what the task needs. This is verbatim, deliberate, and QA-checkable. It then explains in one sentence what's missing and produces whatever partial analysis is possible. The phrase must never be paraphrased.

### 5.5 Mid-thread state preservation

Switching tasks, attaching new documents, switching active knowledge packs, and undoing an auto-switch never start a new thread. Conversation history, prior attachments, and prior settings persist. Only the user clicking "+ New Chat" or "Start a fresh chat" resets the thread.

### 5.6 Streaming response behaviour

AI replies stream in word-by-word as the model produces them. Multibyte characters at chunk boundaries are preserved (no dropped letters in long responses). The user can scroll the thread mid-stream without interrupting the stream.

---

## 6. Special-case entities or modes

### 6.1 Find Document (special among the tasks)

Find Document is a task in the dropdown but it is **not** LLM-backed. It is a client-side substring filter over the user's vault.

- Task surfaces in the dropdown's "Ask & Research" bucket as "Find Document".
- The user types a query ("find the Acme MSA"); the system filters vault documents whose name, description, file name, or folder breadcrumb contains the query terms.
- Results render inline in the conversation thread as a list of matches, with one row per match, a count summary, and a "Use" button per row.
- Clicking "Use" attaches that vault document to the current chat (same as the manual vault picker).
- No call is made to the AI service.
- Source pill reads "Vault".

This special case is intentional — search results read better in the conversation flow, and a roundtrip to the model would be wasteful.

### 6.2 General Chat (default state)

General Chat is the catch-all task. It is the post-login default for any new thread.

- Source pill reads "General Chat".
- The response is plain prose.
- Auto-switch can move the user out of General Chat into a specific task on the first message.
- The user can return to General Chat at any time by picking it from the dropdown.

---

## 7. Accessibility and interaction notes

### 7.1 Keyboard navigation

- Tab cycles through sidebar nav, chat input, attach button, intent pill, and send button in reading order.
- Enter in the chat input sends the message; Shift-Enter inserts a newline.
- Escape closes the vault picker modal and the knowledge-pack picker modal.
- Up arrow on an empty input recalls the user's previous message for editing (Sprint 1: deferred).

### 7.2 Screen-reader behaviour

- Streaming responses are announced as they arrive; the cursor / "typing" indicator is hidden from screen readers.
- The source pill is announced with full text ("Source: Vault. Document: Acme MSA.").
- Inline confirmation prompts ("Yes, use it · I'll upload a new one") are announced as a question with two link choices.

### 7.3 Click-target sizes

- All interactive controls meet a 44 × 44 pixel minimum on touch devices; on desktop, controls are larger and have visible hover states.
- The "+" attach button, intent pill, and send button each have at least 8-pixel hit-area padding.

### 7.4 Focus indicators

- Visible focus rings on all interactive elements. Gold ring on text inputs; navy ring on buttons.
- Dropdowns and modals trap focus while open.

### 7.5 Colour contrast

- Body text against background passes WCAG AA (4.5:1).
- Source pills use brand colours that pass 4.5:1 against their backgrounds.

### 7.6 Responsive behaviour

- The chat surface is desktop-first.
- Below 900 px viewport width, the empty-state pill row caps at four visible pills with a "More operations" overflow.
- Below 768 px, the input row stacks vertically (intent pill above the input, send below).
- Mobile-native applications are out of Sprint 1 scope.

---

## 8. QA test scenarios

Scenarios are numbered sequentially across the document. Each scenario lists the surface, preconditions, the action, and the expected result. Aim is to give a tester enough to reproduce without needing to read code.

### 8.1 Chat — core scenarios

**Scenario 1** — Empty state renders on fresh login

- *Surface:* §3.1, Chat empty state
- *Preconditions:* User signs in for the first time of the session; no thread is selected.
- *Action:* Navigate to /chat.
- *Expected result:* The hero (gold sparkle, serif heading, subtitle) renders centred about 14% from the top of the viewport. The chat input, drop tile, and suggested-action pill row all render. No message bubbles are visible.

**Scenario 2** — First message sent successfully

- *Surface:* §3.1, Chat populated state
- *Preconditions:* Empty state is loaded; General Chat task is active.
- *Action:* Type "What is force majeure?" and press Enter.
- *Expected result:* The user's message bubble appears immediately. The bot bubble streams in a definition. After the response completes, a source pill labelled "General Chat" appears below the bot bubble.

**Scenario 3** — Streaming response renders progressively

- *Surface:* §3.1
- *Preconditions:* Active conversation.
- *Action:* Send a question that triggers a long reply (e.g. "Summarise the differences between common law and civil law").
- *Expected result:* Text appears word-by-word, not all at once; no characters are dropped at the end of the response; the source pill appears only after the stream completes.

**Scenario 4** — New chat clears the thread

- *Surface:* §3.1
- *Preconditions:* Active conversation with at least three messages.
- *Action:* Click "+ New Chat" in the sidebar.
- *Expected result:* The thread clears; the empty-state hero re-appears; sidebar shows the previous thread in Recent Chats; the active task resets to General Chat.

**Scenario 5** — Search past conversations

- *Surface:* §3.1
- *Preconditions:* User has at least three past threads, one of which contains the word "indemnification".
- *Action:* Type "indemnification" in the sidebar Search Chats input.
- *Expected result:* Recent Chats list filters to threads with "indemnification" in either the title or the body. Body matches show an italic 80-character snippet preview in place of the standard meta line.

**Scenario 6** — Source pill on a vault-grounded answer

- *Surface:* §3.1, §5.2
- *Preconditions:* A vault document is attached to the chat.
- *Action:* Send "Summarise the indemnification clause."
- *Expected result:* The bot replies; the source pill below the answer reads "Vault" and shows the document name.

**Scenario 7** — Error message surfaced verbatim on AI failure

- *Surface:* §3.1, error state
- *Preconditions:* Simulate AI service returning HTTP 503 (e.g. by network throttling).
- *Action:* Send any message.
- *Expected result:* The bot bubble shows a captured error reason ("AI service returned 503…"), not a generic fallback line. A retry hint appears below.

### 8.2 Document Upload scenarios

**Scenario 8** — Attach a single PDF via "+"

- *Surface:* §3.2
- *Preconditions:* Chat is empty.
- *Action:* Click "+", select a PDF from the OS dialog.
- *Expected result:* A chip appears above the input with the file name and a remove "x". The drop tile label changes to "Add another file (1 attached)". A "saved to YourVault" helper line appears below the drop tile.

**Scenario 9** — Drag-and-drop a file onto the chat surface

- *Surface:* §3.2
- *Preconditions:* Chat is open.
- *Action:* Drag a DOCX from the OS Finder onto any part of the chat main area.
- *Expected result:* The file is accepted; a chip appears above the input as in Scenario 8.

**Scenario 10** — Multi-file upload (at cap)

- *Surface:* §3.2
- *Preconditions:* Chat is empty.
- *Action:* Click "+", select 5 files at once.
- *Expected result:* Five chips appear, each removable independently. The drop tile label reads "Add another file (5 attached)". No toast appears.

**Scenario 11** — Multi-file upload (over cap)

- *Surface:* §3.2
- *Preconditions:* Chat is empty.
- *Action:* Click "+", select 8 files at once.
- *Expected result:* Five chips appear (the cap). A toast says "You can attach up to 5 files at a time." The 3 excess files are dropped silently.

**Scenario 12** — Adding more documents beyond the per-upload cap via mid-thread upload

- *Surface:* §3.2, §3.5
- *Preconditions:* User has already uploaded 5 documents and sent a message; the conversation is now active with all 5 attached.
- *Action:* Drop 3 more documents onto the chat surface and send another message.
- *Expected result:* The 3 new documents attach successfully (the 5-cap is per upload action, not per conversation). All 8 documents now appear in context, with the new 3 labelled "Document 6 (added HH:MM)", "Document 7 (added HH:MM)", "Document 8 (added HH:MM)".

**Scenario 13** — Mixed file types in one upload

- *Surface:* §3.2
- *Preconditions:* Chat is empty.
- *Action:* Click "+", select one PDF, one DOCX, and one TXT.
- *Expected result:* Three chips appear; all extract successfully; sending a message that references "the documents" is grounded in all three.

**Scenario 14** — Per-file remove

- *Surface:* §3.2
- *Preconditions:* Three files are attached.
- *Action:* Click the "x" on the middle chip.
- *Expected result:* That chip disappears; the other two remain. The drop tile label updates to "Add another file (2 attached)".

**Scenario 15** — Drop zone persists after attach

- *Surface:* §3.2
- *Preconditions:* One file attached.
- *Action:* Inspect the chat surface.
- *Expected result:* The drop tile remains visible below the input, with the updated label.

**Scenario 16** — Attached file appears in YourVault

- *Surface:* §3.2
- *Preconditions:* User attaches a PDF and sends a message.
- *Action:* Open YourVault from the sidebar.
- *Expected result:* The attached PDF appears in the user's vault, marked with a "from chat" badge.

### 8.3 YourVault Attach scenarios

**Scenario 17** — Open the vault picker from "+"

- *Surface:* §3.3
- *Preconditions:* User has at least one document in YourVault.
- *Action:* Click "+" on the chat input.
- *Expected result:* A popover opens with an autofocused search input and a list of every vault document. Each row shows the document name and folder breadcrumb.

**Scenario 18** — Search the vault by name

- *Surface:* §3.3
- *Preconditions:* The vault contains a document named "Acme MSA".
- *Action:* Open the vault picker and type "acme".
- *Expected result:* The list filters in real time to show only the Acme MSA (and any other matches). Substring matching is case-insensitive.

**Scenario 19** — Attach a vault document

- *Surface:* §3.3
- *Preconditions:* Vault picker is open with results.
- *Action:* Click a document in the list.
- *Expected result:* The popover closes; a breadcrumb above the input reads "Current search: attached chat files · {pack name}". Subsequent messages are grounded in the chosen document.

**Scenario 20** — Detach a vault document

- *Surface:* §3.3
- *Preconditions:* A vault document is currently attached.
- *Action:* Open the vault picker; click the Detach row at the top.
- *Expected result:* The popover closes; the breadcrumb removes the document context; subsequent messages are no longer grounded in it.

**Scenario 21** — Open YourVault from the picker footer

- *Surface:* §3.3
- *Preconditions:* Vault picker is open.
- *Action:* Click "Open YourVault →" footer link.
- *Expected result:* The user navigates to the full YourVault page; the picker closes.

### 8.4 Knowledge Pack scenarios

**Scenario 22** — Browse all packs

- *Surface:* §3.4
- *Preconditions:* User is logged in; at least three packs exist (some Mine, some Org-wide).
- *Action:* Open the Knowledge Packs page from the sidebar.
- *Expected result:* All packs the user has access to render as cards in a responsive grid. Each card shows icon, name, ownership pill (Mine / Org-wide), 2-line description, doc/link counts, share toggle, and a Use button.

**Scenario 23** — Filter by scope

- *Surface:* §3.4
- *Preconditions:* User is on the Knowledge Packs page.
- *Action:* Click "Mine" in the scope segmented control.
- *Expected result:* The grid filters to only packs created by the current user.

**Scenario 24** — Create a new pack

- *Surface:* §3.4
- *Preconditions:* User is on the Knowledge Packs page.
- *Action:* Click "+ New Pack". Fill in name, description, scope (Private). Save.
- *Expected result:* The modal closes; the new pack appears at the top of the grid as a Mine pack.

**Scenario 25** — Edit a pack

- *Surface:* §3.4
- *Preconditions:* User created a pack in the prior scenario.
- *Action:* Hover the pack card; click the kebab menu; choose Edit. Change the name; save.
- *Expected result:* The card updates with the new name; the modal closes.

**Scenario 26** — Delete a pack

- *Surface:* §3.4
- *Preconditions:* User has at least one Mine pack.
- *Action:* Open the kebab menu on the pack; choose Delete; confirm.
- *Expected result:* The pack disappears from the grid; a toast confirms deletion.

**Scenario 27** — Attach a pack to a chat

- *Surface:* §3.4
- *Preconditions:* User is on /chat with at least one pack.
- *Action:* Click the Pack dropdown next to the "+" attach button. Pick a pack.
- *Expected result:* The breadcrumb above the input shows the pack name. Subsequent messages are grounded in the pack's contents.

**Scenario 28** — Switch packs mid-conversation

- *Surface:* §3.4
- *Preconditions:* A pack is active in an ongoing chat.
- *Action:* Open the pack picker; choose a different pack.
- *Expected result:* The breadcrumb updates immediately; the next message uses the new pack as grounding; prior messages remain visible and unchanged.

**Scenario 29** — Org-wide pack visible to a peer

- *Surface:* §3.4
- *Preconditions:* User A creates an Org-wide pack. User B is in the same firm.
- *Action:* User B opens the Knowledge Packs page.
- *Expected result:* User B sees A's pack with an "Org-wide" pill. No Edit option is available to B.

### 8.5 Additive Upload scenarios

**Scenario 30** — Upload a second document mid-thread

- *Surface:* §3.5
- *Preconditions:* User has been in conversation with one document attached for at least one exchange.
- *Action:* Drop a second PDF onto the chat surface; send "How does this one differ from the first?"
- *Expected result:* Both documents remain attached. The bot's reply distinguishes between Document 1 and Document 2 by name. An inline note appears: "Added {filename} · Document 2 — New topic? Start a fresh chat →".

**Scenario 31** — "Start a fresh chat" link works

- *Surface:* §3.5
- *Preconditions:* The inline additive-upload note is visible.
- *Action:* Click "Start a fresh chat →".
- *Expected result:* A new thread starts; the previous thread is preserved in Recent Chats; the empty state appears.

**Scenario 32** — Document N labels persist across messages

- *Surface:* §3.5
- *Preconditions:* Two documents are attached additively.
- *Action:* Send three more messages.
- *Expected result:* The bot continues to disambiguate between Document 1 and Document 2 in each reply.

**Scenario 33** — Re-uploading the same file is deduplicated

- *Surface:* §3.5
- *Preconditions:* A specific PDF is already attached.
- *Action:* Drop the same PDF again.
- *Expected result:* No new chip is added; no new "Document N" label is created; the existing entry is reused.

### 8.6 Chit-Chat scenarios

**Scenario 34** — Greeting on General Chat returns warm prose

- *Surface:* §3.6
- *Preconditions:* No document attached; task is General Chat.
- *Action:* Send "Hi".
- *Expected result:* The bot replies in 80 words or fewer, in prose, mentioning what it can help with. No card chrome appears. Source pill reads "General Chat".

**Scenario 35** — Greeting on Risk Memo task returns warm prose

- *Surface:* §3.6
- *Preconditions:* Task is Risk Memo. No document attached.
- *Action:* Send "Hi".
- *Expected result:* The bot replies warmly and gently reminds the user to upload a contract for the Risk Memo to run. No empty card with placeholder dashes is rendered. The artifact panel does not auto-open.

**Scenario 36** — "What can you do?" returns capability summary

- *Surface:* §3.6
- *Preconditions:* No document attached; task is General Chat.
- *Action:* Send "What can you do?"
- *Expected result:* The bot returns a short prose summary of YourAI's task types and a nudge to upload a document.

**Scenario 37** — "Thanks" returns warm one-liner

- *Surface:* §3.6
- *Preconditions:* Mid-conversation with at least one analytical exchange.
- *Action:* Send "Thanks!"
- *Expected result:* The bot returns a brief acknowledgement, possibly offering a follow-up. Not robotic; not a static prefix.

**Scenario 38** — Casual short message under 60 characters falls back to chit-chat

- *Surface:* §3.6
- *Preconditions:* Task is Document Summarisation. No document attached.
- *Action:* Send "ok cool".
- *Expected result:* The bot replies casually and reminds the user the task is set to Summarisation, which needs a document.

### 8.7 Tasks (Intents) & Auto-Switch scenarios

**Scenario 39** — Pick a task explicitly from the dropdown

- *Surface:* §3.7
- *Preconditions:* Empty state. Task is General Chat.
- *Action:* Click the intent pill row; pick "Risk Assessment".
- *Expected result:* The pill name and bucket-coloured dot update to Risk Assessment. The dropdown subtitle ("Identify high / medium / low risks…") appears at the bottom of the dropdown before the dropdown closes.

**Scenario 40** — Auto-switch fires on first analytical message

- *Surface:* §3.7
- *Preconditions:* Empty state. Task is General Chat.
- *Action:* Send "Compare these two contracts on indemnification" with two PDFs attached.
- *Expected result:* The active task switches to Comparison silently; an inline note appears: "Switched to Comparison mode. Continuing in this conversation." The bot's reply renders inline in the chat thread as a structured response with the Comparison shape (title, per-clause sub-sections, recommendation).

**Scenario 41** — Manual pick wins (sticky)

- *Surface:* §3.7, §5.3
- *Preconditions:* User has manually picked Risk Memo in this thread.
- *Action:* Send a message whose keywords ("compare these") would normally auto-switch to Comparison.
- *Expected result:* The active task stays at Risk Memo. No "Switched to Comparison" note appears. The reply renders inline in the chat thread with the Risk Memo response shape.

**Scenario 42** — Manual pick is reset on new thread

- *Surface:* §3.7
- *Preconditions:* Manual Risk Memo pick from the prior scenario.
- *Action:* Click "+ New Chat". In the new thread, send "Compare these two contracts."
- *Expected result:* Auto-switch fires; the new thread switches to Comparison.

**Scenario 43** — Suggestion banner on ambiguous match

- *Surface:* §3.7
- *Preconditions:* Empty state. No document attached.
- *Action:* Slowly type "compare and summarise the documents".
- *Expected result:* After a 600 ms debounce, a suggestion banner appears under the input: "Did you want to Compare these documents or Summarise them?"

**Scenario 44** — Suggestion banner disappears on send

- *Surface:* §3.7
- *Preconditions:* Suggestion banner from prior scenario is visible.
- *Action:* Press Enter to send the message.
- *Expected result:* The banner disappears as the message is sent.

**Scenario 45** — Mid-thread task change preserves history

- *Surface:* §3.7, §5.5
- *Preconditions:* Active conversation in Risk Memo mode with three messages.
- *Action:* Open the intent pill; pick Comparison.
- *Expected result:* No new thread is created; prior messages remain. A small inline note appears: "Now using Comparison mode." The next message uses Comparison's response format.

**Scenario 46** — Doc-source confirmation fires on existing attachments

- *Surface:* §3.7
- *Preconditions:* A vault document is attached and the user has been chatting in General Chat.
- *Action:* Send "Do clause analysis of the attached doc".
- *Expected result:* Auto-switch sees the message will become Clause Analysis; before running, the bot pauses and asks "I see you have {doc} attached. Should I run Clause Analysis on this document, or would you like to upload a new one?" with two inline text links: "Yes, use it" and "I'll upload a new one".

**Scenario 47** — "Yes, use it" runs the analysis

- *Surface:* §3.7
- *Preconditions:* Doc-source confirmation prompt is visible.
- *Action:* Click "Yes, use it".
- *Expected result:* The analysis runs against the existing attachment; the bot's reply renders inline with the Clause Analysis response shape (title, per-clause sub-sections, recommendations).

**Scenario 48** — "I'll upload a new one" prompts for upload

- *Surface:* §3.7
- *Preconditions:* Doc-source confirmation prompt is visible.
- *Action:* Click "I'll upload a new one".
- *Expected result:* The bot's question swaps to "OK — drop the new document via the + button below." No analysis runs.

### 8.8 Task Response (inline chat message) scenarios

**Scenario 49** — Structured task response renders inline

- *Surface:* §3.8, §4
- *Preconditions:* User runs a Risk Memo on an attached PDF.
- *Action:* Send the analysis message and wait for the response.
- *Expected result:* The bot's reply appears as a normal streamed chat bubble in the conversation. The body has the Risk Memo response shape — bold title, meta line, executive summary, highlight blockquote, Findings sections with severity sub-headings. No separate panel opens; no chip appears in the thread.

**Scenario 50** — No right-rail panel exists

- *Surface:* §3.8 (out-of-scope items)
- *Preconditions:* Any structured-task response is visible in the chat.
- *Action:* Inspect the page layout.
- *Expected result:* The chat-main area is full width. There is no right-docked panel, no Copy-as-Markdown button on responses, no Fullscreen toggle, and no in-thread chip preview anchored to the response.

**Scenario 51** — Empty-state response when no document attached

- *Surface:* §3.8, §5.1
- *Preconditions:* Task is Risk Memo. No document attached.
- *Action:* Send "Run a risk memo".
- *Expected result:* The bot replies inline in the chat thread with a short prose nudge (≤50 words) telling the user to upload a document via the + button. No empty structured response with placeholder dashes appears.

**Scenario 52** — Streaming a structured response preserves shape

- *Surface:* §3.8, §5.6
- *Preconditions:* User runs a Document Summarisation on an attached PDF.
- *Action:* Watch the response stream in.
- *Expected result:* The response streams in word-by-word but the structure (title, headings, bullets) renders correctly. No partial-rendered headers or broken markdown remain when the stream completes.

### 8.9 Special-case scenarios

**Scenario 53** — Find Document returns inline results

- *Surface:* §6.1
- *Preconditions:* Vault has at least 5 documents, including one with "Acme" in the name.
- *Action:* Pick Find Document task; send "find acme".
- *Expected result:* The chat thread shows a file-results card listing matches; results appear in the conversation flow, not in the artifact panel. Each row has a Use button.

**Scenario 54** — Use button on Find Document attaches the doc

- *Surface:* §6.1
- *Preconditions:* Find Document results are visible.
- *Action:* Click Use on a row.
- *Expected result:* The chosen document is attached as the active vault document; the breadcrumb above the input updates.

**Scenario 55** — General Chat is the default after sign-in

- *Surface:* §6.2
- *Preconditions:* Fresh login.
- *Action:* Inspect the active task pill.
- *Expected result:* The active task is General Chat. No card output is forced. The source pill on the first reply reads "General Chat".

### 8.10 Cross-cutting scenarios

**Scenario 56** — "Not covered by supplied documents" appears verbatim on a vague analysis

- *Surface:* §5.4
- *Preconditions:* A blurry / non-relevant document is attached. Task is Risk Memo.
- *Action:* Send "Identify all risks in this document."
- *Expected result:* The artifact panel opens with the Risk Memo title and the executive summary opens with the literal sentence "Not covered by supplied documents." followed by a one-sentence reason. The findings list is omitted.

**Scenario 57** — Source pill updates when grounding changes

- *Surface:* §5.2
- *Preconditions:* Active conversation grounded in an uploaded document.
- *Action:* Detach the document and ask a general legal question.
- *Expected result:* The next response carries a "General Chat" source pill, not "Document".

**Scenario 58** — Streaming preserves multibyte characters

- *Surface:* §5.6
- *Preconditions:* Active conversation.
- *Action:* Send "Write a one-paragraph summary of force majeure that includes the phrase 'caso fortuito'."
- *Expected result:* The streamed reply contains "caso fortuito" with both accented characters intact and no dropped letters.

### 8.11 Accessibility scenarios

**Scenario 59** — Keyboard-only flow can attach a vault document and send

- *Surface:* §7.1
- *Preconditions:* Empty chat. User is using the keyboard only.
- *Action:* Tab to the "+" button, press Enter to open the picker, type a query, arrow-down to a result, press Enter to attach. Tab back to the input. Type a question. Press Enter.
- *Expected result:* The attachment is set; the message sends; focus moves into the bot's reply when streaming begins.

**Scenario 60** — Escape closes the artifact panel

- *Surface:* §7.1
- *Preconditions:* Panel is open.
- *Action:* Press Escape.
- *Expected result:* Panel closes; focus returns to the chat input.

**Scenario 61** — Screen reader announces source pill text

- *Surface:* §7.2
- *Preconditions:* Screen reader is on; bot reply has rendered.
- *Action:* Tab onto the source pill.
- *Expected result:* The reader announces "Source: Vault. Document: {name}." (or the equivalent for the current source).

**Scenario 62** — Below 768 px, the input row stacks vertically

- *Surface:* §7.6
- *Preconditions:* Browser width is 720 px.
- *Action:* Inspect the chat input row.
- *Expected result:* Intent pill is above the input; the Send button is below; everything is reachable.

### 8.12 Permission / role gating

**Scenario 63** — External user lands on /chat/workspaces

- *Surface:* §1.4 glossary, §2.3
- *Preconditions:* User is logged in as an External User.
- *Action:* Sign in.
- *Expected result:* User is redirected to /chat/workspaces (the list page), not /chat. They see only their assigned workspaces. No General Chat home is rendered.

**Scenario 64** — External user with one workspace still sees the list

- *Surface:* §2.3
- *Preconditions:* External user has exactly one assigned workspace.
- *Action:* Sign in.
- *Expected result:* User lands on /chat/workspaces (the list, not the workspace itself). The list contains one row.

**Scenario 65** — Org Admin can edit an Org-wide pack created by another Org Admin

- *Surface:* §3.4 visibility table
- *Preconditions:* Two Org Admins exist; Admin A created an Org-wide pack.
- *Action:* Admin B opens the pack's kebab menu.
- *Expected result:* Edit and Delete are available to Admin B.

**Scenario 66** — Internal user cannot edit another user's Mine pack

- *Surface:* §3.4 visibility table
- *Preconditions:* User A has a private Mine pack. User B is a different Internal User.
- *Action:* User B opens the Knowledge Packs page.
- *Expected result:* User B does not see User A's Mine pack at all.

**Scenario 67** — Sign out from the workspace sidebar

- *Surface:* §1.4 glossary
- *Preconditions:* External user is in a workspace chat.
- *Action:* Click the Sign Out row in the workspace sidebar footer.
- *Expected result:* The session ends; the user returns to the login page.

---

## 9. Open questions and known gaps

- **Q1:** Front-end response cards + right-rail side panel are deferred from Sprint 1. Which sprint will they land in (Sprint 2 vs Sprint 3) and what is the priority order against backend persistence work? — *Owner: Arjun + Ryan Hoke. Decision needed by 2026-05-15.*
- **Q2:** Backend persistence of thread history is currently localStorage-only. Cut-off date for backend integration is open. — *Owner: Ryan Robertson (Eng). Decision needed by 2026-05-12.*
- **Q3:** Knowledge Pack content storage is localStorage-backed today; backend persistence is in flight but not yet wired. — *Owner: Ryan Robertson (Eng). Tracking under sprint backlog.*
- **Q4:** Streaming responses on slow connections occasionally render large gaps between words. Should the UI show a typing indicator if a chunk takes longer than 3 seconds? — *Owner: Aashna (Design). Backlog.*
- **Q5:** Mobile-first layout for the chat surface is deferred. Currently desktop-first with two breakpoints (900 px, 768 px). When does the formal mobile audit begin? — *Owner: Arjun. Tied to Sprint 2 / 3 planning.*
- **Q6:** "Find Document" search is currently scoped to the user's personal vault only. Is org-wide vault search a Sprint 1 stretch goal or Sprint 2? — *Owner: Ryan Hoke. Decision needed by 2026-05-20.*
- **Q7:** The doc-source confirmation prompt uses literal text-link copy ("Yes, use it · I'll upload a new one"). Should localisation strings for these labels be in scope for Sprint 1? — *Owner: Arjun. Decision needed before any non-English release plan.*

---

## 10. Document control

### 10.1 Version

1.1

### 10.2 Date

2026-05-06

### 10.3 Authors

- Arjun Sharma, Product

### 10.4 Reviewers

- TBD — PM lead
- TBD — QA lead
- TBD — Engineering lead

### 10.5 Revision history

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0 | 2026-05-06 | Arjun Sharma | Initial draft covering Sprint 1 tenant chat scope (8 modules, 70 features, 70 QA scenarios). |
| 1.1 | 2026-05-06 | Arjun Sharma | Corrected upload cap (5 per upload action, additive uploads beyond that). Removed front-end response cards and right-rail artifact panel from Sprint 1 scope — task responses are delivered inline as standard streamed chat messages in this sprint. Renumbered scenarios; total now 67. |

### 10.6 Related FRDs

- `FRD_Intent_System.docx` — chat intents end-to-end (selector, auto-switch, suggestion banners).
- `FRD_Intent_Cards.md` — per-card scope reference for the 7 card output types plus Find Document.
- `FRD_Incorrect_Document_Handling.docx` — 9-category taxonomy of mismatched uploads + the three-stage handling protocol.
- `.claude-context/artifact-panel-pattern.md` — chip + right-rail panel + markdown report architecture.
- `.claude-context/card-empty-state-pattern.md` — empty-state detection / render pattern across card types.
- `.claude-context/wbs-format.md` — companion sprint-level scope spreadsheet format.
