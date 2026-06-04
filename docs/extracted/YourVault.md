# FRD — YourVault

**Version:** 1.0
**Date:** 2026-06-04
**Author:** Arjun Sharma, Product
**Status:** Draft
**Related:** `FRD_Sprint_1_Tenant_Chat.docx`, `FRD_Knowledge_Pack.docx`, `FRD_Intent_System.docx`

---

## 1. Document overview

### 1.1 Purpose

This document specifies the functional behaviour of the **YourVault** module in YourAI — the firm-wide document library that lives inside the chat portal. It covers the full-page YourVault surface (browsing, search, filters, folder navigation, upload, edit, delete) and every cross-surface flow that lets an attorney or paralegal bring a vault document into a chat conversation. It is written for product managers, QA engineers, and client stakeholders. It contains no implementation detail.

### 1.2 Audience

Product managers, QA engineers, client stakeholders (attorneys, paralegals, firm administrators), and strategists.

### 1.3 Scope

**In scope:**

- The YourVault full-page surface reached from the sidebar entry "YourVault".
- Folder creation, naming, and category assignment.
- Document upload (single file, multi-file, full folder).
- The vault main view (list view, grid view, pagination, sort).
- The vault search bar (filenames and document content).
- The four vault filter pills (Category, Type, Date, Updated by) and the active-filter chip strip.
- The left-rail matters/folders navigation.
- The document preview drawer.
- The new-folder modal and the edit-document modal.
- The "Use in chat" action on each document row.
- The chat-input "+" attach affordance and the **Attach from YourVault** picker modal.
- The chat-input **SEARCH WITHIN** dropdown and the **YourVault** scope inside it.
- The attached-document chip above the chat input.
- The mid-thread upload flow (drag-drop into chat, auto-save to vault).
- Visibility rules between Internal User, Org Admin, Super Admin, and External User roles.
- The document-status taxonomy: Privileged / Confidential / Final / Draft.

**Out of scope:**

- The Knowledge Packs module (see `FRD_Knowledge_Pack.docx`).
- The Workflows module and workflow-side document attachment (see `FRD_Workflows.docx`).
- The chat artifact panel / response cards (see `FRD_Intent_System.docx`).
- Cross-workspace search and per-workspace document corpora (a workspace's chat surface has its own document scope; this FRD does not cover it).
- Real-time content-level semantic search (matches inside a document's text are surfaced as a count today; full semantic retrieval is a future enhancement).
- Per-document audit logging beyond the firm-level Audit Logs panel.

### 1.4 Glossary

- **Vault** — The firm-wide document library, accessed under the sidebar entry "YourVault". One vault per tenant.
- **Document** — A single file held in the vault. Today: PDF, DOCX, or TXT.
- **Folder** — A user-created container that groups documents by matter, client, or topic. Folders carry an optional category.
- **Category** — A status label applied to a folder or a document: Privileged, Confidential, Final, or Draft. Rendered as a coloured pill.
- **Matter** — A client engagement that typically maps one-to-one with a folder in YourVault. The left-rail header says "Matters" because that is the user-facing word firms use; in this document we use folder and matter interchangeably where the context is clear.
- **Use in chat** — The action that attaches a single document from the vault to the active chat conversation, so the AI can read it.
- **Preview drawer** — The right-side panel that opens when a user clicks a document row, showing the document's metadata and quick actions.
- **Picker modal** — A centred dialog that lists vault documents for one-click attachment from the chat input.
- **SEARCH WITHIN** — A scope chooser in the chat input that controls which corpus the AI consults: File Search (attachments only), YourVault (the firm library), or Knowledge Packs.
- **Source pill** — A small label above the chat input showing what corpus or document is currently providing context.
- **Org Admin** — A firm administrator. Has access to every document in the vault, can edit and delete any document, and can change a document's scope between Mine and Org-wide.
- **Internal User** — An attorney or paralegal at the firm. Sees their own documents and any document the firm has marked Org-wide.
- **External User** — A client invited into a workspace. Has no access to YourVault.
- **Org-wide** — A scope flag on a document meaning every internal member of the firm can see it.

### 1.5 Document control summary

| Field | Value |
|---|---|
| Version | 1.0 |
| Date | 2026-06-04 |
| Author | Arjun Sharma, Product |
| Status | Draft |
| Reviewers | Ryan Hoke (Product), Himanshu (QA) |

---

## 2. Background and context

### 2.1 What the module is

YourVault is the firm's private document library inside YourAI. Every attorney and paralegal in the firm sees the same library; folders group documents by matter or topic; categories signal sensitivity. From the vault, a user can open any document for preview, edit its metadata, delete it, or attach it to the current chat with one click so the AI can analyse it. From the chat side, the same library is reachable through the **+** button and through a **YourVault** option in the SEARCH WITHIN dropdown, both of which open an in-place picker so the user never has to leave the conversation to add context.

### 2.2 Why it exists

Attorneys come to YourAI with files already on their machine — pleadings, contracts, discovery PDFs, employment policies. Two friction points drove the vault's design:

- **"I uploaded a document and now I want to ask another question about it tomorrow."** Without a persistent library, every conversation forced the attorney to re-upload the same file. YourVault makes the upload survive across chats, sessions, and devices.
- **"What's the biggest at-close download I have for this matter?"** Attorneys want to retrieve a document by description, not by remembering the exact filename. The vault search matches filenames, descriptions, and folder names; filters narrow by date, uploader, type, or sensitivity category.

A third driver is governance. Folders with a Privileged or Confidential badge make it visible at a glance which documents must not be shared outside the workspace. The Org Admin can mark a document Org-wide so the whole firm sees it, or leave it Mine so only the uploader can.

### 2.3 Where it sits in the broader system

The YourVault sidebar entry sits in the **KNOWLEDGE** section of the chat portal sidebar, between Dashboard / Chat and Knowledge Packs / Workflows. The full-page surface mounts as a sibling of the chat conversation area: opening the vault hides the chat; clicking **Back to chat** returns to the conversation in its previous state with no loss of message history.

YourVault interacts with three sibling modules:

- **Chat input.** The chat composer is the primary consumer of vault documents. Users attach a document via the **+** button (which opens a file picker), via the **SEARCH WITHIN → YourVault** scope (which opens the picker modal), or via clicking **Use in chat** on a vault row.
- **Knowledge Packs.** Both surfaces show under the same KNOWLEDGE sidebar section and follow a parallel design language, but their roles are distinct: YourVault holds matter files and discovery documents; Knowledge Packs hold reference material (statutes, playbooks, evergreen templates).
- **Workspaces.** A workspace chat surface has its own document scope tied to the matter; documents in YourVault can be brought into a workspace chat the same way they are brought into a tenant chat.

### 2.4 Recent state

The visual chrome of the YourVault page was unified with the rest of the full-page panels in this sprint: the outer surface uses the warm cream tone shared with Vault, Knowledge Packs, Workflows, and Workspaces; the scope tabs use the same segmented pill pattern as Prompt Templates. The vault search input was redesigned from a heavier gold-tile gradient to a clean conventional 44-pixel search input with a small magnifier icon and a ⌘K keyboard hint. The left rail was simplified to matters-only.

---

## 3. Module-level functional specification

### 3.1 Entry points

A user reaches the YourVault page in one of the following ways:

1. **Sidebar.** Click the **YourVault** entry under the KNOWLEDGE section of the left sidebar. Always available to Internal Users and Org Admins.
2. **Vault picker footer.** Click the **Open YourVault →** link at the bottom of the chat-input picker modal. Closes the picker and routes to the full vault page.
3. **Preview drawer link.** Click a folder-name breadcrumb inside the preview drawer to navigate to that folder's filtered view.
4. **Toast confirmation.** When a chat-uploaded document is auto-saved to the vault, the toast offers a link to open the vault.

External Users have no sidebar entry for YourVault and cannot navigate to the page by URL.

### 3.2 Page chrome and layout

![[screenshot:01-vault-page.png|Figure 3.2.1 — Default YourVault view: hero, scope tabs, search bar, filter pills, left-rail folders, and the main document list.]]

The YourVault page is composed of four horizontal bands stacked from top to bottom:

1. **Top bar** (50 pixels tall, white background). On the left, a single **Back to chat** button returns the user to the previous conversation. On the right, an **org scope** label reading **YOURVAULT**.
2. **Hero band** (warm cream background, generous vertical padding). The hero heading reads *"Ask across your documents"* in a serif typeface. Beneath it a single supporting line of body copy describes the page in one sentence: *"Your firm's library of pleadings, contracts, discovery and client files — searchable, filterable, and ready to ground any chat or workflow."* On the right of the hero, three action buttons sit in a row:
   - **New Folder** — outlined dashed style. Opens the new-folder modal.
   - **Upload Folder** — outlined solid style. Opens the operating-system folder picker so the user can choose a folder from their machine and upload every supported file inside it.
   - **Upload Document** — solid navy primary style. Opens the operating-system file picker so the user can select one or more documents.
   
   To the left of the three action buttons sits a row of **connector buttons** (Google Drive, iManage, OneDrive) which represent future integrated sources. The connectors are visible but their behaviour is out of scope for this FRD.
3. **Scope tabs** (Org Admin only). A single row of three segmented pills aligned to the right of the page width: **All** (default), **Org-wide**, and **Mine**. Each pill carries a small numeric count of how many documents match the scope. The active pill is filled with a warm-cream wash and a slightly darker label colour. Internal Users do not see this row — they are always in an implicit "anything I can see" scope.
4. **Toolbar band.** Contains the search input, the filter pills row, the result count, the view toggle (List / Grid), and any active-filter chips.

Below the toolbar, the page splits into a fixed-width **left rail** for matter navigation and a flexing **main area** for the document list or grid.

### 3.3 Search

The search input is a 44-pixel-tall white field with a thin border. A small magnifier icon sits on the left edge; the placeholder reads *"Search filenames or inside documents…"*. On the right edge, when the field is empty, a small **⌘K** keyboard hint appears in monospace. When the field has content, the hint is replaced by a clear button (small **×** icon) that empties the field on click.

**Match scope.** Search is a case-insensitive substring match against three fields per document: the document's display name, its description, and the file's original filename. It is also matched against the folder name (so typing "Acme" finds every document inside the Acme Corp folder). Searches do not yet match inside document content; a separate row beneath the result count tells the user when the query matched a description or a folder rather than a filename.

**Behaviour.**

- Filtering fires as the user types (no need to press Enter). Results update immediately.
- A small result-count line appears beneath the search box reading e.g. *"3 results"*. When the active filters narrow the list further, the count reflects the narrowed result.
- Clearing the search via the **×** button or by selecting an entry from the left-rail clears any transient sort or limit that an Ask-anything query had applied (see Section 6.4), but does not clear explicit category, type, date, or uploader filters.

![[screenshot:04-search-results.png|Figure 3.3.1 — Search active. Typing "acme" narrows the list to documents whose name, description, or folder contains the term.]]

### 3.4 Filters

A single row of filter pills sits beneath the search input under an uppercase eyebrow reading **FILTERS**. Each pill opens a small dropdown when clicked; multiple pills can be active at the same time and combine with AND logic. The pills, left to right:

1. **Category** — multi-select. The four options are Privileged, Confidential, Final, and Draft, each shown with a coloured dot matching the document-status pill colour. The user can tick any number; an active filter is reflected as a small tinted pill in the active-chips row below the toolbar.
2. **Type** — multi-select. The three options are PDF, DOCX, and TXT. Other file types in the vault (if any) appear in the table but are not filterable from this pill.
3. **Date** — single-select radio. Options are *Any time* (default), *Today*, *Last 7 days*, *Last 30 days*, and *Last 90 days*. The date refers to when the document was uploaded.
4. **Updated by** — multi-select. The dropdown lists every user who has uploaded at least one document into the vault. Each user is shown with first name and surname; selecting a user filters the list to documents they uploaded.

![[screenshot:03-filter-category-open.png|Figure 3.4.1 — The Category filter dropdown open. Each option carries a coloured dot matching its document-status pill.]]

**Active-filter chips.** When at least one filter is set, a second row appears beneath the pills with one chip per active filter (e.g. *Category: Privileged ×*, *Date: Last 7 days ×*) and a **Clear all** link at the right. Clicking a chip's **×** removes just that filter; clicking **Clear all** clears every filter and the search at once.

**Persistence.** Filter selections persist across page reloads as long as the user stays in the same browser session. Switching to another panel and back leaves filters set. Filters do not synchronise across devices.

### 3.5 Left rail — matters and folders

The left rail is a fixed-width column running the full height of the page below the hero. It is labelled **MATTERS** in uppercase monospace eyebrow type. Beneath the eyebrow, the rail lists every folder in the vault in a vertical stack. Each row shows:

- A small folder icon, tinted with the folder's category colour if a category is set, neutral otherwise.
- The folder name (single line, truncated with an ellipsis if too long).
- A subtle count badge on the right showing how many documents the folder contains.

**Behaviour.**

- Hovering a folder row tints its background a soft warm cream.
- Clicking a folder row filters the main area to show only that folder's contents. A breadcrumb appears at the top of the main area reading *"YourVault / Pleadings & Motions"* (or whatever folder name was selected).
- Clicking the breadcrumb's **YourVault** link returns the main area to the unfiltered all-documents view.
- Only one folder is active at a time. Clicking another folder swaps the filter.

The left rail is matters-only. It does not show user-created tag folders, cross-matter filters, or shared/Mine toggles — those moved into the main toolbar in a prior pass.

### 3.6 Main view — list and grid

The main area renders the filtered, searched, and sorted set of documents. A small **List / Grid** toggle in the right corner of the toolbar switches between two layouts.

#### 3.6.1 List view (default)

A wide table with five columns:

- **Document type tile** — a 34×34 px coloured square in the leftmost column showing the file extension as a small label inside a tinted tile. PDF is rendered with a warm-red tile, DOCX with a navy tile, TXT with a neutral grey tile.
- **Document name** — the document's display name on the upper line and its file size on a smaller line below (e.g. *"Master Services Agreement — Acme Corp"* over *"2.4 MB"*).
- **Folder** — the folder name, shown with a small folder icon. Empty for documents at the root.
- **Category** — the document's category pill (Privileged, Confidential, Final, or Draft) with a coloured dot. Empty for documents without a category.
- **Use in chat** — the primary row action. A solid navy button reading **Use in chat**. After the user attaches the document, the button on that row swaps to a tinted green pill reading **In chat**.
- **Overflow menu** (three small dots, right edge) — opens a row menu with **Edit** and **Delete** actions, gated on permissions (see Section 5.2).

A row is highlighted on hover. Clicking anywhere on the row except the action buttons opens the **preview drawer** (Section 3.7).

#### 3.6.2 Grid view

A responsive grid of card tiles, three columns at desktop width, two at narrower widths. Each card shows the document type tile prominently, the document name, file size and modified time, a category pill, and a **Use in chat** action button along the bottom edge. The same overflow menu is available on each card.

![[screenshot:05-grid-view.png|Figure 3.6.2.1 — Grid view of the vault. Each card carries the file-type tile, name, size, modified time, category pill, and Use in chat action.]]

#### 3.6.3 Sort and pagination

- The default sort is most-recently-modified first.
- A header row in list view shows the column labels; clicking a column header is not a sort affordance in the current design.
- When the result set exceeds the page size (10 by default), pagination controls appear beneath the table: previous and next chevron buttons plus numbered page buttons. Active page is filled navy.

### 3.7 Preview drawer

Clicking any document row or card opens a right-side drawer roughly one quarter of the page width. The drawer shows, top to bottom:

- A large file-type icon tile at the top.
- The document's display name, in serif.
- A row of small chips: the document category, the folder it lives in, and (for Org Admins) a Mine / Org-wide pill.
- A buttons row: **Add to chat** (or **In chat** when already attached), and (when a sample URL is available) a **Preview** icon button that opens the source file in a new tab.
- A details section under a monospace **DETAILS** eyebrow listing: location (vault path), type (e.g. *PDF · 2.4 MB*), uploaded by, created date, modified date (relative), description if any, and access scope.
- An **Edit** and a **Delete** button at the bottom, visible only to the document's owner or to an Org Admin.

![[screenshot:06-preview-drawer.png|Figure 3.7.1 — Preview drawer open for a single document, showing the type tile, name, details section, and Edit/Delete actions.]]

The drawer can be dismissed by clicking the **×** in its top-right corner, by clicking outside the drawer, or by pressing **Escape**.

### 3.8 New folder modal

Clicking **New Folder** in the hero opens a centred modal of approximately 430 pixels in width.

![[screenshot:02-new-folder-modal.png|Figure 3.8.1 — New folder modal. The user enters a name and optionally picks a category before creating.]]

The modal contains:

- **Folder name** — a required text input. The placeholder reads *"e.g. Discovery Documents"*. The Create button stays disabled until the field has content.
- **Category** *(optional)* — a row of four category chip buttons (Privileged, Confidential, Final, Draft) each carrying a coloured dot. Clicking a chip toggles it active; clicking the same chip again clears it. Only one category can be selected.
- **Live preview** — a small preview row at the bottom showing the folder icon (tinted to the chosen category) and the typed name (greyed if empty). Gives the user immediate feedback before saving.
- **Cancel** and **Create folder** buttons at the bottom of the modal.

Submitting creates a new folder, adds it to the left rail in alphabetical position, and dismisses the modal. A toast confirmation appears in the top-right corner reading *"Folder 'Name' created"*.

### 3.9 Upload document and upload folder

**Upload Document** opens the operating-system file picker with the accept filter limited to PDF, DOCX, and TXT. The user can pick one file or multiple files. Each selected file is queued for upload and appears in the vault with a transient *"Processing"* badge while its text is extracted. When extraction completes the badge clears and the **Use in chat** button is enabled.

**Upload Folder** opens the operating-system folder picker. The browser walks every supported file (PDF / DOCX / TXT) inside the selected folder and its subfolders, queues them all, and assigns them to a single new vault folder whose name is taken from the source folder. Files of other types are silently skipped.

Both actions show a success toast for the count of files uploaded.

### 3.10 Edit document

The Edit action is available from the row overflow menu and from the preview drawer. It opens a modal with editable fields for the document name, description, folder (a dropdown of every folder in the vault plus a *"— Root"* option), and category (the same four chips as the new-folder modal). For Org Admins, a toggle for Mine / Org-wide is also present.

Save commits the changes, updates the list immediately, and shows a toast reading *"Document 'Name' updated"*. Cancel discards.

### 3.11 Delete document

Delete prompts a confirmation dialog reading *"Delete 'Document Name'? This cannot be undone."* Confirming removes the document from the vault, dismisses the dialog, and shows a toast. If the deleted document was currently attached to the chat, the chat's attached chip disappears at the same time.

### 3.12 Empty states

The vault page surfaces four distinct empty states:

- **Empty vault.** No documents have been uploaded and no folders created. The main area shows a centred icon, the heading *"Nothing in YourVault yet"*, and a one-line subtitle inviting the user to upload a document, upload a folder, or create a folder. The three action buttons from the hero are repeated centred under the subtitle for emphasis.
- **No search match.** The vault has documents but the active search and filters return zero rows. The main area shows a centred magnifier icon, the heading *"No documents match"*, and a subtitle echoing the query (e.g. *"Nothing matched 'compliance' with the current filters."*). A single **Clear search & filters** button is offered.
- **Empty folder.** A folder has been selected from the left rail but it contains no documents. The main area shows a centred folder icon with the message *"This folder is empty. Upload a document or move existing ones here."*
- **Filter no-match.** Filters are active and no documents satisfy them. Same pattern as no-search-match, with the **Clear all** link being the recommended action.

---

## 4. Document categories and document types

Documents in YourVault carry two orthogonal classifications: a **category** (sensitivity / lifecycle status) and a **type** (file format). Both are surfaced in the list, in the preview drawer, in the chat-attached chip, and in the filters.

### 4.1 Category — Privileged

**Purpose.** Marks a document as legally privileged work product or attorney-client communication. The user should think twice before sharing it outside the matter team.

**Visual.** A small pill with a red-tinted dot and the label *"Privileged"*.

**When it appears.** Set by the document owner or an Org Admin via the Edit modal or by being uploaded into a folder whose category is Privileged. Inherited from the folder is the default; a per-document override is allowed.

**Interactions.** The pill itself is non-interactive in the list. Hovering it shows a tooltip with the description of the category.

### 4.2 Category — Confidential

**Purpose.** Marks a document as confidential — sensitive client information, draft strategy, financials — that should stay inside the firm.

**Visual.** Pill with a blue-tinted dot, label *"Confidential"*.

**Interactions.** Same as Privileged.

### 4.3 Category — Final

**Purpose.** Marks a document as the final, executed, or signed version. Distinguishes it from the in-flight drafts.

**Visual.** Pill with a green-tinted dot, label *"Final"*.

**Interactions.** Same as Privileged.

### 4.4 Category — Draft

**Purpose.** Marks a document as a work-in-progress draft. Useful to keep version-history clarity when multiple revisions live in the same folder.

**Visual.** Pill with an amber-tinted dot, label *"Draft"*.

**Interactions.** Same as Privileged.

### 4.5 File type — PDF

**Visual.** The list-view tile is rendered in a warm-red colour with the label **PDF** in white. Used for contracts, pleadings, transcripts, exhibits, court orders, sample documents.

**Behaviour.** Text content is extracted automatically. Scanned or image-only PDFs are flagged as failed extraction and cannot be used in chat — see Section 5.4.

### 4.6 File type — DOCX

**Visual.** Navy tile, label **DOCX**. Used for editable drafts (briefs, memos, templates, employment agreements).

### 4.7 File type — TXT

**Visual.** Grey tile, label **TXT**. Used for plain-text excerpts, transcripts, code or technical extracts.

---

## 5. Cross-cutting behaviour

### 5.1 Visibility and scope

| Role | Sees own documents | Sees Org-wide documents | Sees other members' Mine documents | Sees scope tabs (All / Org-wide / Mine) |
|---|---|---|---|---|
| Org Admin | Yes | Yes | Yes | Yes |
| Internal User | Yes | Yes | No | No (implicit scope only) |
| Super Admin (YourAI staff) | N/A | N/A | N/A | N/A |
| External User (client) | No (no access to YourVault) | No | No | No |

External Users have no sidebar entry for YourVault and any direct URL navigation routes them away.

### 5.2 Permissions

| Action | Owner of the document | Org Admin | Internal User (not owner) | External User |
|---|---|---|---|---|
| View | Yes (own or Org-wide) | Yes (any) | Yes (Org-wide only) | No |
| Use in chat | Yes (visible documents) | Yes | Yes (Org-wide only) | No |
| Edit metadata | Yes | Yes | No | No |
| Move to a different folder | Yes | Yes | No | No |
| Change category | Yes | Yes | No | No |
| Toggle Mine ↔ Org-wide | Yes (own documents) | Yes (any document) | No | No |
| Delete | Yes (own) | Yes (any) | No | No |
| Create folder | Yes | Yes | Yes | No |
| Delete folder | Owner of folder | Yes | No | No |

When a row's action is not permitted for the current user, the overflow menu is hidden and the row offers only the **Use in chat** button.

### 5.3 Document-status pills (cross-reference)

The four category pills described in Sections 4.1 to 4.4 share a single visual treatment: a small coloured dot followed by the category label in body type. They are used in the same way across every surface they appear on (list view, grid view, preview drawer, edit modal, chat-attached chip, vault picker modal). When two pills sit side by side (e.g. inside the preview drawer alongside a folder pill), they wrap onto a second line if the space is narrow.

### 5.4 Document-extraction states

Each document moves through a small lifecycle of states from upload to ready-for-chat:

- **Uploading** — the file is being transferred from the user's device. The row appears with a subtle in-progress indicator and is not yet usable in chat.
- **Processing** — transfer complete, the document's text is being extracted. The row is visible in the list but the **Use in chat** button is disabled.
- **Ready** — extraction succeeded. The document is fully usable: visible in the list, attachable to chat, searchable, and listed in the vault picker modal.
- **Failed** — extraction could not produce usable text (most commonly because the file is a scanned image PDF without text layers, or the file is corrupted). The row shows a small warning indicator and the **Use in chat** action is disabled. The owner can delete the document and re-upload a text-bearing version.

### 5.5 Persistence and seed

The vault persists per-browser on the user's device. A first-time user signing in to a freshly initialised vault sees a seed library of approximately ten sample documents covering common firm artefacts — an MSA, an employee handbook, a term sheet, a discovery checklist, a few pleadings, and a service-levels schedule — distributed across pre-created folders. The seed is intentional: it lets the first chat session ground in real-looking documents without requiring the user to upload anything first. Once the user uploads even one document of their own, the seed is preserved alongside.

### 5.6 Naming and deduplication

When the user uploads the same filename twice as the same owner, the vault treats the second upload as a refresh of the existing entry rather than creating a duplicate row. The displayed timestamp updates to the new upload time and the row's content (the text body the AI reads) is replaced. When two different owners upload the same filename, the two entries coexist as separate documents and the Uploaded by column distinguishes them.

---

## 6. Use a vault document in chat

This section specifies the chat-side flows that bring vault content into the conversation. There are three primary paths and one mid-thread convenience path.

### 6.1 Use in chat — from the vault page

The most direct path. On any document row, the **Use in chat** button attaches that single document to the current conversation. The button on that row swaps to a tinted green **In chat** pill so the user can tell at a glance which row is the live attachment. A toast appears in the top-right confirming *"'Document Name' added to chat context"*. The user can then return to chat by clicking **Back to chat** at the top of the page; their conversation reopens with the source pill visible above the input.

Only one document can be the active attachment from the vault at a time. Attaching a second vault document replaces the first.

![[screenshot:07-chat-with-attached-doc.png|Figure 6.1.1 — Chat input with a vault document attached. The "Using: Document Name" pill above the input shows the active attachment; clicking the × detaches.]]

### 6.2 SEARCH WITHIN — scope selector on the chat input

The chat input carries a small **SEARCH WITHIN** control on its bottom-left edge. Clicking it opens a dropdown with three options, each presented as an icon, a label, and a one-line subtitle:

- **File Search** *(Attached files in this chat · fastest, most precise)* — the default. Limits AI grounding to whatever files the user has dragged or **+**-attached in the current conversation.
- **YourVault** *(Firm document library across matters)* — opens the **Attach from YourVault** picker modal (Section 6.3).
- **Knowledge Packs** *(Curated reference content for the conversation)* — opens the Knowledge Packs picker (out of scope for this FRD).

![[screenshot:08-search-within-dropdown.png|Figure 6.2.1 — SEARCH WITHIN dropdown showing the three corpus options with their subtitles.]]

### 6.3 Attach from YourVault — picker modal

Selecting **YourVault** from the SEARCH WITHIN dropdown — or clicking the **+** affordance and choosing *Attach from YourVault* — opens a centred picker modal titled **Attach from YourVault**. The modal contains:

- A short subtitle: *"Search by name or folder — attach a file or whole folder"*.
- A sticky **search input** at the top of the list, auto-focused on open. The placeholder reads *"Search documents or folder names…"*. As the user types, the list filters live by name, folder name, and description.
- A scrollable list of documents, each row showing the file-type tile, document name on the upper line and folder + size / metadata on the lower line. The right edge of each row carries either an **Attached** pill (when this document is the active attachment) or a **Use in chat** button.
- A footer line showing *"N documents total"* on the left and **Open YourVault →** on the right. The link closes the modal and routes the user to the full vault page.

![[screenshot:09-vault-picker-modal.png|Figure 6.3.1 — Attach from YourVault picker modal. The currently attached document shows an "Attached" pill; all others show "Use in chat".]]

**Selection behaviour.**

- Clicking **Use in chat** on a row immediately attaches that document, swaps that row's button to **Attached**, and updates the chat input's source pill behind the modal.
- The modal does not auto-close on selection; the user can swap between documents and only close once they have made their choice.
- The user closes the modal by clicking the **×** icon in the top-right, clicking outside the modal, or pressing **Escape**.

**Empty state.** When the vault has no documents at all, the list area shows a brief message — *"No documents in YourVault yet. Upload from the YourVault page or drag files into chat to get started."* — and a button **Open YourVault →**.

### 6.4 Drag-drop and the + button — mid-thread uploads

In addition to attaching from the vault, the chat input accepts files dragged from the user's desktop directly onto the input area, and supports a quick **+** upload button. Both flows do the same thing:

- The selected file or files are added as a chip strip immediately above the chat input. Each chip shows the file name, file size, and an **×** to remove that file from the upload.
- Each file is queued for text extraction in the background.
- The user can keep typing while extraction runs; when they press send, the chat waits up to a short ceiling for any in-progress extractions to complete before composing the message.

**Auto-save into YourVault.** Every file attached this way is also added to the vault as a new document under the **Mine** scope. The benefit is that the very next conversation can reach the same document through the picker without re-uploading. The auto-save uses the document's filename as its name; if the same name already exists in the user's portion of the vault, the older entry is refreshed rather than duplicated (see Section 5.6).

### 6.5 Source pill above the chat input

Whenever a document or a folder is currently attached, a single source pill sits in a small strip directly above the chat input. The pill displays the attachment's label — *"Using: Document Name"* — and a small **×** at the right end. Clicking the **×** detaches the document; the pill disappears; the chat returns to default file-search scope on the next send. The pill is non-clickable beyond the **×**; it serves as both a visual reminder and a fast off-switch.

### 6.6 Folder attach (limited)

The picker modal includes folder rows for folders that match the search query (e.g. typing "Acme" surfaces both the Acme folder header and individual Acme documents). Selecting a folder offers an **Attach folder** affordance that brings every document in that folder into the chat's scope as a group. The source pill in that case reads *"Folder: Discovery Documents (12 docs)"* and the AI receives every document's content together. This is useful for due-diligence sweeps and discovery review.

Folder attach is a single-folder action — only one folder can be active at a time, and selecting a folder clears any single-document attachment.

---

## 7. Accessibility and interaction notes

### 7.1 Keyboard navigation

- The vault search input takes focus when the page loads.
- **⌘K** (Mac) or **Ctrl K** (Windows) returns focus to the search input from anywhere on the page.
- **Tab** moves through the toolbar in left-to-right order: search input, filter pills, view toggle.
- Inside a filter dropdown, **arrow keys** move between options and **Space** toggles selection.
- **Enter** on a focused row opens the preview drawer.
- **Escape** closes the preview drawer, any open filter dropdown, and any open modal (new folder, edit, vault picker).

### 7.2 Screen-reader behaviour

- The vault hero heading is announced as a level-one heading.
- Each filter pill announces its label, its open/closed state, and the number of options currently selected.
- The active-filter chip strip announces *"Active filters: Category Privileged, Date Last 7 days"* on focus.
- Each document row announces its name, type, folder, category, and the available actions when focus enters the row.
- Toast confirmations are announced as polite live-region updates.

### 7.3 Click-target sizes

All primary action buttons (Use in chat, Upload Document, Upload Folder, New Folder, Cancel, Create folder, Save) are sized to at least 40 pixels in height. The clear-search **×** and the chip-remove **×** targets are 28 pixels square.

### 7.4 Focus indicators

Search input and form inputs show a navy focus ring on keyboard focus. Filter pills show a darkened outline. Document rows show a left-edge highlight when focused.

### 7.5 Colour contrast

The category pills use coloured dots over light tinted backgrounds. The dot-and-label combination retains AA contrast for body text. The disabled state of **Use in chat** (during extraction or after a failed upload) is communicated with both opacity reduction and an explicit tooltip on hover.

### 7.6 Responsive behaviour

At desktop widths the page renders the four bands as described. At narrower viewports:

- The hero action buttons collapse from labels into icon-only round buttons.
- The connector buttons (Google Drive, iManage, OneDrive) hide behind an overflow menu.
- The scope tabs row wraps below the hero.
- The left rail collapses behind a folder icon button that opens a slide-out drawer when tapped.
- The list view becomes a single-column card list.
- The grid view falls to two columns, then one.

---

## 8. QA test scenarios

The following scenarios are numbered sequentially across the whole document for easy reference in bug reports.

### 8.1 Page entry, layout, and empty states

**Scenario 1** — First-time user opens YourVault.
- *Surface / entity:* §3.1 entry points, §5.5 seed.
- *Preconditions:* The user has just signed in for the first time; no documents have been uploaded yet.
- *Action:* Click **YourVault** in the sidebar.
- *Expected result:* The vault page opens. The seed library of approximately ten sample documents is visible. The left rail shows the seeded folders. The empty-vault placeholder does not appear.

**Scenario 2** — Returning user sees a populated vault.
- *Preconditions:* The user has previously uploaded one or more documents.
- *Action:* Click **YourVault**.
- *Expected result:* The vault opens with the user's own uploads visible in addition to the seed. The list reflects the most recent state (no stale entries, no missing entries).

**Scenario 3** — Empty vault on a fresh install where the seed has been suppressed.
- *Preconditions:* Vault is empty (no seed, no uploads).
- *Action:* Open the vault.
- *Expected result:* The empty-vault placeholder appears centred: heading *"Nothing in YourVault yet"*, a one-line subtitle, and three action buttons (New Folder, Upload Folder, Upload Document).

**Scenario 4** — Back to chat preserves conversation state.
- *Preconditions:* The user is mid-conversation in a chat thread. They navigate to the vault, then click **Back to chat**.
- *Expected result:* The conversation reopens at the same scroll position, with the same active intent, attached files, and source pill state it had before. No messages are lost.

### 8.2 Search

**Scenario 5** — Substring match on document name.
- *Surface / entity:* §3.3 search.
- *Action:* Type *acme* into the search input.
- *Expected result:* The list narrows to documents whose name, description, filename, or folder name contains *acme* (case-insensitive). Results count reflects the narrowed list.

**Scenario 6** — Search clears transient sort.
- *Preconditions:* The user has previously typed a phrase that activated an Ask-anything style transient filter (sort by size descending, limit 1).
- *Action:* Type a new search query into the input.
- *Expected result:* The transient sort and limit are cleared. The default most-recently-modified sort returns. Explicit category, type, date, and uploader filters remain set.

**Scenario 7** — ⌘K returns focus to the search input.
- *Preconditions:* The user has clicked into a filter pill so search is not focused.
- *Action:* Press **⌘K** (or **Ctrl K** on Windows).
- *Expected result:* Keyboard focus jumps to the search input. The user can type immediately.

**Scenario 8** — Clear search via the × button.
- *Preconditions:* The user has typed a search query and results are filtered.
- *Action:* Click the small **×** button at the right edge of the search input.
- *Expected result:* The input becomes empty, focus stays in the input, and the list returns to the pre-search state.

**Scenario 9** — Search with no matches.
- *Action:* Type a string that matches nothing (e.g. *qwertyuiop*).
- *Expected result:* The list area shows the no-search-match empty state with the heading *"No documents match"* and a subtitle echoing the query.

### 8.3 Filters

**Scenario 10** — Single Category filter.
- *Action:* Open the Category pill, tick *Privileged*, close the dropdown.
- *Expected result:* The list narrows to documents whose category is Privileged. An active-filter chip appears reading *Category: Privileged ×*.

**Scenario 11** — Combine category and date.
- *Action:* Tick *Confidential* in Category, then choose *Last 30 days* in Date.
- *Expected result:* The list shows only Confidential documents uploaded in the last 30 days. Two active chips appear.

**Scenario 12** — Remove a single filter via chip.
- *Preconditions:* Two filters are active (Scenario 11).
- *Action:* Click the **×** on the *Date: Last 30 days* chip.
- *Expected result:* The Date filter clears. The Category filter remains.

**Scenario 13** — Clear all.
- *Preconditions:* Multiple filters active.
- *Action:* Click the **Clear all** link on the chip strip.
- *Expected result:* Every filter clears at once. The search input also clears if it had content. The list returns to the default unfiltered view.

**Scenario 14** — Empty-filter result.
- *Action:* Apply filters that match no documents (e.g. *Type: TXT* in a vault with only PDFs).
- *Expected result:* The empty-filter state appears with the **Clear all** call to action.

**Scenario 15** — Filters persist across panel switches.
- *Preconditions:* Two filters are active.
- *Action:* Switch to Workflows, then return to YourVault.
- *Expected result:* The filters are still set; the list shows the same narrowed result it did on leaving.

### 8.4 Folders

**Scenario 16** — Create a new folder with category.
- *Surface / entity:* §3.8 new folder modal.
- *Action:* Click **New Folder**. Type *Discovery — Smith Litigation*. Click the *Confidential* category chip. Click **Create folder**.
- *Expected result:* The modal closes. A new folder appears in the left rail labelled *Discovery — Smith Litigation* with a Confidential dot. A toast confirms creation.

**Scenario 17** — Cancel new-folder modal.
- *Action:* Open the modal, type a name, then click **Cancel**.
- *Expected result:* The modal closes. No folder is created. No toast appears.

**Scenario 18** — Create button disabled with empty name.
- *Action:* Open the new-folder modal but leave the name blank.
- *Expected result:* The **Create folder** button is disabled. Hovering shows no error message; the disabled state is sufficient signal.

**Scenario 19** — Navigate into a folder from the left rail.
- *Action:* Click a folder name in the left rail.
- *Expected result:* The main area filters to that folder's documents only. A breadcrumb appears at the top reading *"YourVault / Folder Name"*. The clicked folder row in the left rail is highlighted as active.

**Scenario 20** — Return to root from the breadcrumb.
- *Preconditions:* The user is inside a folder.
- *Action:* Click the **YourVault** link in the breadcrumb.
- *Expected result:* The folder filter clears. The main area returns to the unfiltered list. No folder is highlighted in the left rail.

**Scenario 21** — Upload an entire folder.
- *Action:* Click **Upload Folder**. Choose a desktop folder containing a mix of supported and unsupported files.
- *Expected result:* A new vault folder is created. The supported files (PDF, DOCX, TXT) appear inside it. Files of other types are silently skipped. A toast reports the count of files uploaded.

### 8.5 Documents

**Scenario 22** — Upload a single PDF.
- *Action:* Click **Upload Document**. Select one PDF.
- *Expected result:* The document appears in the list with a Processing indicator. Once extraction completes, the indicator clears and **Use in chat** is enabled.

**Scenario 23** — Upload multiple files at once.
- *Action:* Click **Upload Document**. Select two PDFs and one DOCX.
- *Expected result:* All three appear in the list. Each independently transitions from Processing to Ready.

**Scenario 24** — Failed extraction on a scanned PDF.
- *Action:* Upload an image-only PDF (no text layer).
- *Expected result:* The document appears in the list. After processing, it shows a warning indicator. **Use in chat** is disabled. The overflow menu allows Delete.

**Scenario 25** — Edit a document's name and folder.
- *Action:* Open the row overflow menu on a document. Click **Edit**. Change the name and select a different folder. Click **Save**.
- *Expected result:* The modal closes. The list reflects the new name and the new folder column value immediately. A toast confirms the update.

**Scenario 26** — Delete a document with confirmation.
- *Action:* From the overflow menu, click **Delete**. In the confirmation dialog, click **Delete**.
- *Expected result:* The row disappears from the list. The vault count decreases by one. If the document was the active chat attachment, the chat's source pill clears.

**Scenario 27** — Cancel delete.
- *Action:* From the overflow menu, click **Delete**. In the confirmation dialog, click **Cancel**.
- *Expected result:* The dialog closes. The document remains in the list.

**Scenario 28** — Preview drawer opens on row click.
- *Action:* Click anywhere on a document row except the action buttons.
- *Expected result:* The preview drawer slides in from the right. It shows the file-type tile, name, chips, action buttons, and details section.

**Scenario 29** — Preview drawer Add to chat.
- *Action:* Click **Add to chat** inside the preview drawer.
- *Expected result:* The document becomes the active attachment. The drawer's button label changes to **In chat**. The toast confirms attachment. Closing the drawer keeps the attachment active.

**Scenario 30** — Preview drawer is read-only for non-owners.
- *Preconditions:* The current user is an Internal User (not Org Admin) viewing a document uploaded by another internal user under the Org-wide scope.
- *Action:* Open the preview drawer.
- *Expected result:* The drawer shows the document and the **Add to chat** button. The **Edit** and **Delete** buttons are hidden.

### 8.6 Use in chat — single document

**Scenario 31** — Use in chat from the vault page.
- *Surface / entity:* §6.1.
- *Action:* On a vault row, click **Use in chat**.
- *Expected result:* The row's button swaps to a green **In chat** pill. A toast confirms attachment. Navigating back to chat shows a source pill *"Using: Document Name"* above the input.

**Scenario 32** — Swap attachment.
- *Preconditions:* A document is already attached.
- *Action:* Click **Use in chat** on a different row.
- *Expected result:* The new document is now attached. The previously attached row reverts from **In chat** to **Use in chat**. The chat's source pill updates to the new document's name.

**Scenario 33** — Detach from the chat input.
- *Preconditions:* A vault document is the active attachment.
- *Action:* In the chat input, click the **×** on the source pill.
- *Expected result:* The source pill disappears. The corresponding vault row's button reverts from **In chat** to **Use in chat**. Subsequent sends use the default file-search scope.

**Scenario 34** — Send a message with the attached document.
- *Preconditions:* A vault document is attached. The user types a question into the chat input.
- *Action:* Press send.
- *Expected result:* The conversation receives a reply that explicitly references the attached document's content. The source pill remains visible for the next message.

### 8.7 SEARCH WITHIN and picker modal

**Scenario 35** — Open SEARCH WITHIN dropdown.
- *Surface / entity:* §6.2.
- *Action:* In the chat input, click the SEARCH WITHIN control on the bottom-left.
- *Expected result:* The dropdown opens showing three options: File Search (default, ticked), YourVault, Knowledge Packs. Each carries an icon and a one-line subtitle.

**Scenario 36** — Selecting YourVault opens the picker modal.
- *Action:* In the SEARCH WITHIN dropdown, click **YourVault**.
- *Expected result:* The dropdown closes. The **Attach from YourVault** modal opens, focused on the search input, showing every vault document and a footer link **Open YourVault →**.

**Scenario 37** — Type in the picker search field.
- *Action:* In the picker, type *acme*.
- *Expected result:* The list filters live to documents whose name, folder, or description matches *acme*. The footer total updates to *"N documents total"*.

**Scenario 38** — Attach a document from the picker.
- *Action:* In the picker, click **Use in chat** on any row.
- *Expected result:* That row's button changes to **Attached**. The chat's source pill behind the modal updates. The modal stays open for further selection.

**Scenario 39** — Picker remembers attached state across opens.
- *Preconditions:* A document is currently attached.
- *Action:* Close the modal, then reopen it from SEARCH WITHIN → YourVault.
- *Expected result:* The row of the currently attached document shows the **Attached** pill instead of **Use in chat**.

**Scenario 40** — Open YourVault from the picker footer.
- *Action:* Click the **Open YourVault →** link.
- *Expected result:* The modal closes. The chat panel closes. The full YourVault page opens with no filter applied.

**Scenario 41** — Picker empty state.
- *Preconditions:* The vault is empty.
- *Action:* Open the picker.
- *Expected result:* The list area shows the empty message and an **Open YourVault →** button. No row entries are shown.

### 8.8 Mid-thread uploads (drag-drop and + button)

**Scenario 42** — Drag a single file onto the chat input.
- *Action:* Drag a PDF from the desktop onto the chat input area.
- *Expected result:* A chip appears immediately above the input showing the file name, size, and an **×**. Extraction starts in the background. The user can continue typing.

**Scenario 43** — Drop multiple files at once.
- *Action:* Drag two PDFs and a DOCX onto the input area in one drop.
- *Expected result:* Three chips appear. All three are queued for extraction independently. Each chip has its own **×**.

**Scenario 44** — Send with extraction still in progress.
- *Preconditions:* A chip is in the upload row but extraction has not yet finished.
- *Action:* Press send.
- *Expected result:* The chat waits up to a short timeout for extraction to complete, then sends with the document's content inlined. The AI's reply references the actual document content rather than a placeholder.

**Scenario 45** — Auto-save into YourVault.
- *Preconditions:* The user drops a new file (one not previously in the vault) and sends a message.
- *Action:* After the reply arrives, navigate to YourVault.
- *Expected result:* The dropped file is present in the vault under the user's Mine scope. Its content is searchable in the vault search input.

**Scenario 46** — Same filename uploaded twice is refreshed, not duplicated.
- *Preconditions:* A file named *contract.pdf* is already in the user's vault.
- *Action:* The user drops a new file also named *contract.pdf* into the chat input and sends a message.
- *Expected result:* The vault still contains exactly one row for *contract.pdf*. Its modified timestamp updates to the latest upload time. The AI's reply uses the new content.

**Scenario 47** — Unsupported file type is silently filtered.
- *Action:* Drop a .png image into the chat input.
- *Expected result:* No chip appears. The file is not uploaded. No error message is shown — the absence of a chip is sufficient signal.

### 8.9 Folder attach

**Scenario 48** — Attach a folder.
- *Surface / entity:* §6.6.
- *Action:* In the vault picker modal, type a folder name (e.g. *Discovery*). On the folder row, click **Attach folder**.
- *Expected result:* The chat input's source pill changes to *"Folder: Discovery Documents (N docs)"*. Subsequent sends include every document in the folder.

**Scenario 49** — Folder attach replaces document attach.
- *Preconditions:* A single document is currently attached.
- *Action:* Attach a folder from the picker.
- *Expected result:* The single-document attachment is replaced. The source pill now shows the folder label.

### 8.10 Permission gating

**Scenario 50** — External User cannot reach the vault.
- *Preconditions:* The user is an External (client) user.
- *Action:* Look at the sidebar; attempt to navigate to the vault URL directly.
- *Expected result:* No sidebar entry for YourVault is present. Direct URL navigation routes the user away (e.g. to their workspace list). No vault content is exposed.

**Scenario 51** — Internal User cannot edit another user's private document.
- *Preconditions:* A document is owned by Internal User A under the Mine scope; the current user is Internal User B.
- *Action:* User B navigates to the vault.
- *Expected result:* The document does not appear in User B's list (Mine documents of another user are not visible).

**Scenario 52** — Internal User cannot edit an Org-wide document uploaded by Org Admin.
- *Preconditions:* An Org-wide document was uploaded by an Org Admin.
- *Action:* As an Internal User, open the row overflow menu.
- *Expected result:* The menu is hidden. The only available action on the row is **Use in chat**. The preview drawer also hides Edit and Delete.

**Scenario 53** — Org Admin edits any document.
- *Preconditions:* The current user is an Org Admin.
- *Action:* On any document row, open the overflow menu and click **Edit**.
- *Expected result:* The Edit modal opens with every field editable, including the Mine ↔ Org-wide toggle.

### 8.11 Document categories and types

**Scenario 54** — Category dot colours.
- *Action:* Visually inspect the document list with a mix of Privileged, Confidential, Final, and Draft documents.
- *Expected result:* Each category renders with its assigned dot colour: red, blue, green, amber respectively. No category renders without a label.

**Scenario 55** — Filter by file type.
- *Action:* Open the Type filter and tick *DOCX*.
- *Expected result:* The list shows only DOCX documents. PDF and TXT rows are removed.

### 8.12 Accessibility

**Scenario 56** — Keyboard-only flow to attach a document.
- *Action:* Using only the keyboard from the vault page, press **Tab** to focus the first row, **Enter** to open the preview drawer, **Tab** to the **Add to chat** button, and **Enter** to attach.
- *Expected result:* The document is attached. A screen reader announces *"Document attached to chat"*.

**Scenario 57** — Escape closes the modal.
- *Action:* Open the new-folder modal. Press **Escape**.
- *Expected result:* The modal closes without saving.

**Scenario 58** — Screen reader announces filter state.
- *Action:* With a screen reader on, focus a filter pill that has active selections.
- *Expected result:* The announcement includes the pill label, its open/closed state, and the count of selected options.

### 8.13 Responsive

**Scenario 59** — Narrow viewport hides connector buttons.
- *Action:* Resize the browser to under 1024 pixels wide.
- *Expected result:* The Google Drive, iManage, and OneDrive buttons collapse behind an overflow menu in the hero. The three core action buttons remain visible.

**Scenario 60** — Mobile collapses the left rail.
- *Action:* Open the vault at a phone-sized viewport.
- *Expected result:* The left rail becomes a slide-out drawer behind a folder icon button. Tapping the icon opens the matter list.

---

## 9. Open questions and known gaps

- **Q1:** Should folders support nested subfolders, or stay strictly two-level (root → folder)? Today only root-level folders are created. Wendy's mental model is Client → Matter → Files, which would require one more level. — Owner: Ryan Hoke. Decision needed before P9.
- **Q2:** Should the search input also match inside document content, or stay limited to filenames, descriptions, and folder names? A first implementation could surface a "matches inside N documents" badge without changing the primary match. — Owner: Ryan Hoke. Tied to the content-RAG plan.
- **Q3:** Should an Internal User be able to share their own Mine document with a single colleague without making it Org-wide? Today the only states are Mine and Org-wide; an in-between scope (a chosen list of users) has been discussed but not designed. — Owner: PM. Backlog.
- **Q4:** Should the connector buttons (Google Drive, iManage, OneDrive) be hidden until at least one integration is live, or shown as call-to-actions immediately? Today they are present but visual-only. — Owner: PM. Decision pending the connector roadmap.
- **Q5:** Should an Org Admin be able to set a default category for new uploads at the folder level (so every document dropped into a Privileged folder inherits Privileged)? Today the inheritance is per-upload via the Edit modal. — Owner: PM. Backlog.
- **Q6:** What is the maximum recommended file size and the maximum number of pages per document? The current behaviour does not block large files but extraction can fail silently above a threshold. — Owner: QA. Investigation needed.
- **Q7:** Should the vault auto-snapshot deleted documents into a 30-day trash, or hard-delete on confirmation? Today delete is immediate and irreversible. — Owner: Compliance. Decision needed.
- **Q8:** Should the folder-attach flow be available outside the picker modal — e.g. from the vault page itself with a "Use folder in chat" action on each folder row? — Owner: PM. Design needed.

---

## 10. Document control

### 10.1 Version

1.0

### 10.2 Date

2026-06-04

### 10.3 Authors

- Arjun Sharma, Product

### 10.4 Reviewers

- Ryan Hoke, Product lead — pending
- Himanshu, QA lead — pending

### 10.5 Revision history

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0 | 2026-06-04 | Arjun Sharma | Initial draft covering the full-page vault surface, folder and document lifecycle, search and filters, the chat-side picker modal and SEARCH WITHIN scope, mid-thread upload behaviour, and the visibility / permission matrix across roles. |

### 10.6 Related FRDs

- `FRD_Sprint_1_Tenant_Chat.docx` — the tenant chat surface, intent system, and message lifecycle.
- `FRD_Knowledge_Pack.docx` — the sibling KNOWLEDGE module for reference content.
- `FRD_Intent_System.docx` — chat intents and the SEARCH WITHIN scope chooser.
- `FRD_Workflows.docx` — workflow-side document attachment behaviour.
