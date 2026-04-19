# Knowledge Base Module — Raw Feature Inventory

Extracted: 2026-04-15
Source: React codebase at `/Users/admin/Downloads/scope-creator-ai/.claude/worktrees/great-banach/`

---

## 1. SUPER ADMIN SCREENS

---

### SA: Global Knowledge Base — Legal Content Tab — `/super-admin/knowledge-base`
**File**: `src/pages/super-admin/GlobalKnowledgeBase.jsx` (lines 755-1349)

**UI Elements**:
- PageHeader with Database icon, title "Knowledge Base", subtitle "Manage the global AI knowledge base for all organisations"
- Info banner (blue left-border) explaining fallback behavior: "This knowledge base is the AI fallback for all internal users without workspace documents, and for Clients in General Queries mode."
- Tab bar with two visible tabs: "Legal Content" (default active), "Bot Persona" (with Bot icon). A third tab "Alex Response Templates" is commented out / disabled.
- 4 StatCards in a grid: Documents (count from `docs.length`), Links (count from `links.length`), Total Size ("22.9 MB" hardcoded), Last Updated ("Today" hardcoded)
- **State Law Libraries section**:
  - Section heading "State Law Libraries" with InfoButton tooltip
  - "Add State Library" button (navy, Plus icon)
  - Descriptive paragraph about automatic jurisdiction matching
  - Lightbulb info callout explaining automatic firm matching
  - Table with columns: State, Assigned Documents, Status, Actions
  - Each state row shows: Library icon + state name, document pills (FileText icon + pack name), status badge (Active=green, Partial=yellow, Not Set=gray) with doc count, "Manage" button
  - Row hover highlight (ice-warm background)
- **Manage State Library Slide-over** (fixed right panel, 520px wide):
  - Backdrop overlay (rgba black 0.3)
  - Header: "{State} Library" title, status badge, doc count, X close button
  - Section 1 "Assigned Documents": list of documents with FileText icon, name, type label (Court Rules / State Statutes / Legal Document), "Remove" button per doc. Empty state: dashed border box with FileText icon + "No documents assigned" message.
  - Divider
  - Section 2 "Add More Documents": scrollable checkbox list of available global KB docs (max-height 220px). Each row: checkbox, FileText icon, doc name, type + size. "Assign N Selected Document(s)" button appears when checkboxes selected.
  - Divider
  - Section 3 "Upload New Document" (collapsed by default): expandable section with ChevronDown toggle. Contains drag-drop zone: Upload icon, "Drag and drop or click to upload", "PDF, DOCX, XLSX -- Max 100MB". Descriptive text about auto-assignment.
- **Add State Library Modal**:
  - "Select State" dropdown (filtered to exclude already-added states), full US_STATES list (51 entries incl. DC)
  - "Assign Documents" checkbox list of all global KB docs with FileText icon, name, type + size
  - Selected count display
  - Cancel / "Create Library" buttons (Create disabled if no state selected)
- **Upload area** (2-column grid):
  - File upload zone: dashed border, Upload icon, "Drag and drop files here or click to browse", "PDF, DOCX, XLSX, TXT -- Max 100MB per file", "Upload Files" button
  - Link add zone: dashed border, Link2 icon, "Add a web link as a knowledge source", "URLs will be crawled and indexed for AI queries", "Add Link" button
- **Search input**: "Search documents and links..." placeholder, max-width 400
- **Documents section**:
  - Heading "Documents" with InfoButton tooltip explaining KB documents, fallback behavior, supported file types, processing status
  - Table columns: File Name, Type, Size, Uploaded, Status, Actions
  - Each row: FileText icon + name, Badge(type), size text, uploaded date text, Status with spinner for Processing + Badge, Delete action
  - Delete action: Trash2 icon button, then inline confirmation "Are you sure?" with Yes/Cancel buttons
  - Row fade-out animation on delete (row-fade-out CSS class, 400ms timeout)
  - Row hover highlight
  - Empty state: FileText icon + "No documents found" + "Try adjusting your search or upload a new document."
- **Links section**:
  - Heading "Links" with InfoButton tooltip explaining knowledge links, indexing, status meanings
  - "Add Link" button (Plus icon)
  - Table columns: Source Name, URL, Added, Status, Actions
  - Each row: Link2 icon + name, monospace URL + ExternalLink icon, added date, status badge (Indexed=green, Indexing=yellow with spinner), Delete action
  - Delete inline confirmation: "Remove?" with Yes/Cancel
  - Row fade-out animation on delete (400ms)
  - Empty state: Link2 icon + "No links found" + "Add a link source for AI to reference."
- **Add Link Modal**:
  - "Source Name" text input (placeholder "e.g. Cornell Law Institute")
  - "URL" url input (placeholder "https://...")
  - Explanatory text: "The URL will be crawled and indexed. Content will be available for AI queries across all organisations."
  - Cancel / "Add Link" buttons (Add Link disabled if either field empty)

**User Actions**:
- Click tab to switch between "Legal Content" and "Bot Persona"
- Search documents and links via text input (filters both tables)
- Drag files over the upload zone (visual highlight: dashed gold border, yellow background)
- Drop files on the upload zone (no actual upload handler wired)
- Click "Upload Files" button (no handler wired -- button is static)
- Click "Add Link" to open Add Link Modal
- Fill in Source Name and URL, click "Add Link" to add to links list
- Click Trash2 icon on a document row to initiate delete
- Confirm delete ("Yes") or cancel ("Cancel")
- Click Trash2 icon on a link row to initiate delete
- Confirm link delete ("Yes") or cancel ("Cancel")
- Click "Add State Library" button to open Add State Library Modal
- Select a state from dropdown
- Check/uncheck documents for the new state library
- Click "Create Library" to add the state (disabled if no state selected)
- Click "Cancel" to close modal
- Click "Manage" on a state row to open Manage State Library Slide-over
- In slide-over: click "Remove" next to an assigned document to remove it
- In slide-over: check documents in "Add More Documents" section, click "Assign N Selected Document(s)"
- In slide-over: expand/collapse "Upload New Document" section
- In slide-over: click drag-drop zone to trigger fake document upload (handleManageUploadDoc)
- Click backdrop or X to close slide-over

**Validation Rules**:
- Add Link Modal: both Source Name and URL fields must be non-empty to enable "Add Link" button
- Add State Library Modal: state selection required to enable "Create Library" button
- Document delete: requires confirmation click ("Yes") before deletion
- Link delete: requires confirmation click ("Yes") before deletion

**API Calls**:
- None. All data is mock/local state. No real API calls for documents or links.

**Mocks/Hardcoded**:
- `globalKBDocs` from mockData.js: 8 documents (US Legal Practice Guide 2026.pdf, ABA Model Rules Commentary.docx, Legal AI Disclaimer Templates.pdf, US Federal Court Procedures.pdf, NDA Standard Clauses Library.docx, Contract Risk Glossary.xlsx, Due Diligence Checklist Master.pdf, Compliance Audit Framework.pdf). Sizes: 0.6-8.1 MB. Statuses: 7 Ready, 1 Processing.
- `initialLinks`: 3 links (Cornell Law, US Courts Federal Rules, SEC EDGAR). Statuses: 2 Indexed, 1 Indexing.
- `US_STATES`: 51 entries (50 states + DC)
- `statePacks` initial state: 8 states (NY, CA, TX, FL, IL, GA, WA, MA) with assigned pack names. Statuses: 5 Active, 2 Partial, 1 Not Set.
- StatCard "Total Size" hardcoded to "22.9 MB"
- StatCard "Last Updated" hardcoded to "Today"
- `handleManageUploadDoc` creates a fake document: name `Uploaded_{timestamp}.pdf`, type PDF, size "1.2 MB", status "Processing"

**Discrepancies**:
- D1: File upload drop zone has `onDrop` handler that only resets drag state -- does not process files. Upload is non-functional.
- D2: "Upload Files" button has no onClick handler. Clicking does nothing.
- D3: Total Size stat is hardcoded "22.9 MB" -- not computed from document sizes.
- D4: Last Updated stat is hardcoded "Today" -- not derived from document dates.
- D5: Manage State Library upload creates a fake document and assigns it -- no real file upload occurs.

---

### SA: Global Knowledge Base — Bot Persona Tab — `/super-admin/knowledge-base`
**File**: `src/pages/super-admin/GlobalKnowledgeBase.jsx` (lines 1799-2490)

**UI Elements**:
- Info banner (blue left-border) explaining Bot Persona: multiple intent modes, fallback message, global knowledge documents
- Status bar: "Bot Persona Configuration" heading with InfoButton, "Active" badge (green, CheckCircle icon when saved), "Unsaved changes" badge (yellow when dirty), version/timestamp/updatedBy display, "Read-only -- managed by engineering" badge (Lock icon)
- 3-column layout (2 left, 1 right):

**Left Column (2/3 width)**:
- **Intents section** (white card):
  - Header "Intents" with InfoButton explaining intent system
  - "N of M enabled" counter
  - Descriptive text about intent auto-selection
  - Expandable intent cards (one per intent, 12 default intents):
    - Collapsed state: Bot icon (navy when enabled, gray when disabled), intent label, ON/OFF badge, tone preview snippet, description, "Disable"/"Enable" button, ChevronDown expand arrow
    - Expanded state:
      - System Prompt: read-only display area with Lock icon badge, pre-wrap text, max-height 200px scrollable
      - Tone Prompt: editable textarea (max 800 chars), character counter, descriptive text
      - Divider
      - Trigger Keywords: keyword pills with X to remove, input + "Add" button, counter (N/20)
      - Opening Behaviour: 3 mutually-exclusive toggle switches (Start Immediately, Ask for Document, Ask Clarifying Question), each with description
      - Custom Instruction: editable textarea (max 500 chars), character counter, descriptive text
      - Example Queries: read-only pill badges (if available)
    - Opacity reduced to 0.55 when disabled
- **Fallback Message section** (white card):
  - "Fallback Message" label with InfoButton explaining fallback chain
  - Descriptive text about fallback chain
  - Read-only display of fallback message text (not editable -- rendered as div, not textarea)
- **Per-Persona Response Format section** (white card):
  - Users icon, "Per-Persona Response Format" label with InfoButton
  - "N of 4 active" counter
  - 4 persona cards (Partner/Senior Attorney, Associate/Junior Attorney, Paralegal/Legal Assistant, Legal Ops/IT):
    - Each shows: role icon, label, ACTIVE/OFF badge, tone label, description, "Read-only" Lock badge
    - Opacity 0.55 when disabled

**Right Column (1/3 width)**:
- **Global Knowledge Documents section** (white card):
  - "Global Knowledge Documents" label with InfoButton explaining fallback KB
  - Doc count display
  - Descriptive text about fallback KB
  - Drag-drop upload zone: Upload icon, "Drag & drop PDF / DOCX files (max 100MB)", "or browse files", "You can also paste a link below"
  - Hidden file input (accept `.pdf,.docx`, multiple)
  - Add link input row: Link2 icon, url text input (placeholder "Paste a link to add"), "Add Link" button
  - Document list: each doc shows File/Link2 icon, name (truncated), type badge, size, Trash2 remove button
  - **CourtListener Integration section** (ice-warm background card):
    - Scale icon, "CourtListener -- Live Legal Data" heading with InfoButton
    - Disconnected state: "Connect CourtListener" button (navy, Database icon). Loading state: spinner + "Connecting to CourtListener..."
    - Connected state: green checkmark + "Connected", 3 stat boxes (Courts count, Opinions count, Last sync), "Refresh" button (RotateCcw icon), "Disconnect" button (red Trash2 icon)
- **Message Routing Flow section** (white card, marked DRAFT):
  - GitBranch icon, "Message Routing Flow" label, DRAFT badge (yellow)
  - 5-step vertical pipeline diagram with numbered circles and colored cards:
    1. User Sends Message (purple)
    2. Intent Classifier (blue)
    3. Persona Format Applied (green)
    4. Source Resolution (orange)
    5. Response Streamed (light blue)
  - 2 branching cards: Low Confidence (yellow), No Answer Found (red)
  - Active Intents summary: pills for enabled (styled) and disabled (strikethrough) intents
  - Active Personas summary: pills for enabled and disabled personas
- Warning banner (yellow): "Changes apply from the next session -- active conversations will finish with the current persona."

**User Actions**:
- Expand/collapse intent cards by clicking header
- Toggle intent enabled/disabled via "Enable"/"Disable" button
- Edit tone prompt textarea (max 800 chars)
- Add trigger keywords: type in input, press Enter or click "Add"
- Remove trigger keywords: click X on pill
- Toggle opening behaviour switches (mutually exclusive)
- Edit custom instruction textarea (max 500 chars)
- Drag files onto Global Knowledge Documents zone to upload
- Click browse to select PDF/DOCX files for upload
- Paste URL into link input, press Enter or click "Add Link" to add KB link
- Remove a global knowledge document by clicking Trash2
- Connect/Disconnect CourtListener
- Refresh CourtListener data
- Save persona (handled by parent -- button not visible in this tab section but logic exists)
- Discard changes (handled by parent)
- Note: Save/Discard buttons not rendered in the read code -- they are likely at a higher level or removed. handleSavePersona and handleDiscardPersona exist but are not rendered in the JSX.

**Validation Rules**:
- Tone prompt max length: 800 characters
- Custom instruction max length: 500 characters
- Keyword max count: 20 per intent
- Keywords are trimmed and lowercased; duplicates rejected
- Add KB Link: basic URL validation via `new URL(url)` constructor; toast on invalid URL
- Persona file upload: text content truncated to 50,000 chars for localStorage quota
- localStorage save: catches quota exceeded error with toast message

**API Calls**:
- CourtListener API (real, external): `https://www.courtlistener.com/api/rest/v4`
  - `GET /courts/?format=json&page_size=30&jurisdiction=F` (fetches federal courts)
  - `GET /search/?format=json&type=o&q=*&page_size=15` (fetches recent opinions)
  - Results stored in localStorage keys: `yourai_courtlistener_kb`, `yourai_cl_stats`
- Persona saved to localStorage key: `yourai_bot_persona`

**Mocks/Hardcoded**:
- 12 DEFAULT_INTENTS: General Chat, Contract Review, Legal Research, Document Drafting, Compliance Check (disabled), Document Summarisation, Case Law Analysis, Clause Comparison, Email & Letter Drafting, Due Diligence (disabled), Legal Q&A, Risk Assessment. Each with full systemPrompt, tonePrompt, keywords array, opening_behaviour.
- DEFAULT_PERSONA: fallbackMessage, globalDocs (3 docs: Federal_Rules_Civil_Procedure.pdf, UCC_Article_2_Commentary.pdf, ABA_Model_Rules_Ethics.docx), version 1, updatedAt "Apr 10, 2026", updatedBy "Arjun Sharma"
- INTENT_CONFIDENCE_THRESHOLD: 0.75 (placeholder)
- TONE_OPTIONS: Formal, Conversational, Neutral, Concise
- USER_PERSONAS: 4 roles with defaults (tone, formatRules, promptModifier)
- FORMAT_RULES referenced in defaults: cite_source, risk_summary, next_action, bullet_lists
- OPENING_BEHAVIOUR options: start_immediately, ask_for_document, ask_clarifying_question

**Discrepancies**:
- D6: Bot Persona tab marked CONFIDENCE 7/10 -- "Ryan confirmed concept verbally, not written. Rollback-ready."
- D7: Bot Persona tab marked "OUT OF SCOPE of 18 source docs. Built as wireframe for Ryan visual review."
- D8: INTENT_CONFIDENCE_THRESHOLD (0.75) has TODO: "confirm confidence threshold with AI team" and "OQ-pending -- do not ship without confirmation"
- D9: Message Routing Flow section marked CONFIDENCE 3/10 -- "Intent classifier not confirmed by Ryan. Visual wireframe only."
- D10: Save/Discard buttons code exists (handleSavePersona, handleDiscardPersona) but no visible Save/Discard buttons rendered in the JSX read so far. Persona changes may be unsavable from the UI.
- D11: Fallback message is rendered as a read-only div, but updatePersona('fallbackMessage', ...) is available in code. No UI to edit it.
- D12: Per-Persona Response Format cards are all read-only (Lock badge) with no edit controls, despite state management code existing for editing them.
- D13: "SA cannot add new intents -- managed by engineering" comment with button removed.

---

### SA: Global Knowledge Base — Alex Response Templates Tab (DISABLED) — `/super-admin/knowledge-base`
**File**: `src/pages/super-admin/GlobalKnowledgeBase.jsx` (lines 1353-1797)

**UI Elements** (all wrapped in `{false && activeTab === 'alex' && ...}` -- unreachable):
- Intent Routing Flow Diagram: horizontal pipeline (User Message -> Intent Classifier -> Known Intent (80%) -> Response Filters -> Streamed to User) with Unknown Intent branch
- Intent Templates: 2-column grid of template cards (icon, label, status badge, description, example query pills, template preview in monospace, response filter pills, LLM Required indicator)
- Edit Template Slide-over (480px): intent ID (read-only), LLM Required (read-only), example queries (read-only pills), editable template textarea with variable hint, filter toggles (6 filters), preview section with sample query input + "Generate Preview" button
- Response Filters: 2-column grid of filter cards with toggle switches, description, used-by intent list, latency indicator
- Unknown Queries Log: table (Time, Query, Organisation, Escalated, Actions). Actions column is empty (SA cannot create intents).

**User Actions**: None accessible. Tab is disabled with `{false && ...}`.

**Mocks/Hardcoded**:
- `alexIntentTemplates`: 7 intents (Feature Questions, Security & Compliance, How-To Requests, Setup & Configuration, Billing Questions, Small Talk, Unknown/Fallback) with full template strings, example queries, response filters
- `alexResponseFilters`: 6 filters (Jargon Detector, Legal Advice Block, Competitor Block, Hallucination Check, Length Enforcer, Confidence Gate)
- `alexUnknownLog`: 5 entries with query, org name, escalation status

**Discrepancies**:
- D14: Entire Alex tab is disabled (`{false && ...}`), state variables are commented out. Kept "for future use".

---

## 2. ORG ADMIN SCREENS

---

### OA: Document Vault — `/app/vault`
**File**: `src/pages/org-admin/DocumentVault.jsx`

**UI Elements**:
- PageHeader with FileText icon, title "Document Vault", subtitle "All documents across your workspaces."
- Classification queue banner (red background, AlertCircle icon): "N documents in the classification queue need review." Visible when flaggedCount > 0.
- Toolbar row:
  - Search input (max-width 280) with Search icon, placeholder "Search documents..."
  - Workspace filter dropdown: "All Workspaces" + workspace names from mockData
  - Type filter dropdown: All, PDF, DOCX, XLSX
  - Status filter dropdown: All, Ready, Processing, Failed
- Table with columns: Document, Workspace, Type, Size, Uploaded By, Status, Classification, Date
  - Document column: doc name, font-weight 500
  - Workspace column: workspace name or "--"
  - Type column: Badge component
  - Size column: text
  - Uploaded By column: text
  - Status column: Badge component
  - Classification column: "Flagged" (red, AlertCircle icon), "Pending" (amber text), or "Auto-filed" (green, CheckCircle icon)
  - Date column: text

**User Actions**:
- Type in search input to filter documents by name (case-insensitive)
- Select workspace filter to filter by workspace
- Select type filter (PDF/DOCX/XLSX)
- Select status filter (Ready/Processing/Failed)

**Validation Rules**:
- Search filters by document name only (case-insensitive includes match)
- Type filter matches exact doc.type
- Status filter matches exact doc.status
- Workspace filter compares parseInt(wsFilter) to doc.workspace

**API Calls**:
- None. All data from `documents` and `workspaces` mock arrays.

**Mocks/Hardcoded**:
- `documents` from mockData.js: 8 documents across 2 workspaces. Types: PDF (5), DOCX (2), XLSX (1). Statuses: Ready (6), Processing (1), Failed (1). Classifications: Auto-filed (6), Pending (1), Flagged for Review (1).
- `workspaces` from mockData.js: 4 workspaces.
- flaggedCount computed from docs with classification "Flagged for Review" or "Pending" = 2 documents.

**Discrepancies**:
- D15: No upload functionality. No upload button, no drag-drop zone. Document Vault is read-only display.
- D16: No delete functionality. No action buttons on rows at all.
- D17: No document preview/view functionality.
- D18: No pagination or infinite scroll for large document lists.

---

### OA: Knowledge Packs Page — `/app/knowledge-packs`
**File**: `src/pages/org-admin/KnowledgePacksPage.jsx`

**UI Elements**:
- PermissionGate wrapper: only accessible by role "Admin"
- PageHeader with Database icon, title "Knowledge Packs", subtitle "Manage workspace and pre-built knowledge packs."
- **Workspace Packs** section (h3 heading, DM Serif Display font):
  - 3-column grid of cards. Each card:
    - Database icon + pack name
    - "Workspace: {name}" or "General"
    - Doc count + version string
    - Divider line
    - Footer: MessageSquare icon + "Used in N chats", "Updated {date}"
- **Pre-built Library** section (h3 heading):
  - 3-column grid of cards. Each card:
    - BookOpen icon + pack name
    - "Pre-built" badge (Published variant)
    - Doc count + version string
    - Divider line
    - Footer: MessageSquare icon + "Used in N chats", "Updated {date}"

**User Actions**:
- None. Entirely read-only display. No create, edit, delete, search, or filter actions.

**Validation Rules**:
- None.

**API Calls**:
- None. All data from `knowledgePacks` and `workspaces` mock arrays.

**Mocks/Hardcoded**:
- `knowledgePacks` from mockData.js: 5 packs. 2 workspace packs (Acme NDA Pack, TechStart DD Pack), 3 pre-built packs (US Court Local Rules, NDA Standard Clauses, Contract Risk Glossary). Docs: 4-104. Versions: v1.0-v2.1. usedInChats: 3-18.

**Discrepancies**:
- D19: No CRUD actions available. Page is purely display/read-only. No create, edit, delete, search, or filter.
- D20: No way to manage pack contents (add/remove docs, add/remove links).

---

## 3. CHATBOT SCREENS

---

### Chat: Knowledge Packs Panel (ChatView embedded)
**File**: `src/pages/chatbot/ChatView.jsx` — `KnowledgePacksPanel` component (lines 876-956)

**UI Elements**:
- Backdrop overlay (rgba black 0.4, blur 4px)
- Centered modal (620px max width, 85vh max height, rounded 2xl)
- Header:
  - Title "Knowledge Packs" (DM Serif Display)
  - Subtitle: "N packs . Bundle docs & links to attach to chats"
  - "New Pack" button (navy, Plus icon)
  - X close button
  - Search input with Search icon, placeholder "Search knowledge packs..."
- Pack list (scrollable):
  - Each pack card: Package icon (38x38 rounded), pack name (14px bold), description, doc count (FileText icon), link count (Link2 icon), created date
  - Action buttons per pack: "Use" button (navy; changes to green "Active" with CheckCircle when selected), "Edit" button (Edit3 icon), Delete button (Trash2 icon, red)
  - Empty state: Package icon (32px, 0.4 opacity), "No knowledge packs found", "Create your first pack to get started"

**User Actions**:
- Search packs by name or description
- Click "New Pack" to open EditKnowledgePackModal (create mode)
- Click "Use" to select a pack as active context for the chat
- Click "Edit" to open EditKnowledgePackModal (edit mode)
- Click Delete (Trash2) to delete a pack (no confirmation dialog)
- Click X or backdrop to close panel

**Validation Rules**:
- Search filters by pack name or description (case-insensitive)

**API Calls**:
- None. Local state only.

**Mocks/Hardcoded**:
- DEFAULT_KNOWLEDGE_PACKS: 3 packs:
  - "NDA Playbook": 3 docs (Standard_NDA_Template.pdf, NDA_Risk_Checklist.docx, Mutual_NDA_Redline_Example.pdf), 1 link (ABA Model NDA Guidelines)
  - "M&A Due Diligence": 3 docs (DD_Checklist_v3.pdf, Meridian_Precedent.pdf, Indemnification_Clauses.docx), 2 links (SEC M&A Filing Requirements, Delaware Court of Chancery)
  - "Employment Law -- California": 2 docs (CA_Labor_Code.pdf, Non_Compete_Enforcement.docx), 1 link (CA Department of Industrial Relations)

---

### Chat: Edit/Create Knowledge Pack Modal (ChatView embedded)
**File**: `src/pages/chatbot/ChatView.jsx` — `EditKnowledgePackModal` component (lines 958-1085)

**UI Elements**:
- Backdrop overlay (rgba black 0.4, blur 4px)
- Centered modal (600px max width, 90vh max height, rounded 2xl)
- Header: "New Knowledge Pack" or "Edit Knowledge Pack" title, X close button
- Form fields:
  - "Pack name *" text input (placeholder "e.g., NDA Playbook")
  - "Description" textarea (placeholder "Short description of what's in this pack...", 2 rows, resizable)
  - "Documents (N)" section: doc count label, "Add Document" button (Upload icon, dashed border). Each doc row: File icon, name (truncated), size + uploaded date, Trash2 remove button. Empty state: dashed border, "No documents yet -- click Add Document"
  - "Links (N)" section: link count label, "Add Link" button (Plus icon, dashed border). Add Link inline form: link title input, URL input, Cancel/Save Link buttons. Each link row: Link2 icon, name (truncated), URL (truncated), Trash2 remove button. Empty state: dashed border, "No links yet -- click Add Link"
- Footer: Cancel / "Create Pack" or "Save Changes" buttons

**User Actions**:
- Type pack name
- Type description
- Click "Add Document" -- adds a mock document from MOCK_DOC_NAMES rotation
- Remove a document (Trash2 button)
- Click "Add Link" to show inline add-link form
- Type link title and URL, click "Save Link"
- Cancel add link
- Remove a link (Trash2 button)
- Click "Create Pack" / "Save Changes" to save
- Click Cancel or X or backdrop to close

**Validation Rules**:
- Pack name is required (submit button disabled if empty, cursor not-allowed)
- Add link: both link title and URL must be non-empty (Save Link disabled if either empty)

**API Calls**:
- None. Local state only.

**Mocks/Hardcoded**:
- MOCK_DOC_NAMES: ['Clause_Library.pdf', 'Compliance_Checklist.docx', 'Risk_Matrix_Template.xlsx', 'Precedent_Case.pdf', 'Standard_Terms.pdf'] -- cycled through when "Add Document" clicked
- Document size is randomized: `(Math.random() * 3 + 0.5).toFixed(1)` MB
- Upload date set to current date

**Discrepancies**:
- D21: "Add Document" does not open a file picker. It adds a fake document from a hardcoded list. No real file upload.

---

### Chat: Document Vault Panel (ChatView embedded)
**File**: `src/pages/chatbot/ChatView.jsx` — `DocumentVaultPanel` component (lines 1087-1165)

**UI Elements**:
- Backdrop overlay (rgba black 0.4, blur 4px)
- Centered modal (620px max width, 85vh max height, rounded 2xl)
- Header:
  - Title "Document Vault" (DM Serif Display)
  - Subtitle: "N docs . Attach any single doc to a chat"
  - "New Document" button (navy, Plus icon)
  - X close button
  - Search input with Search icon, placeholder "Search documents..."
- Document list (scrollable):
  - Each doc card: File icon (38x38 rounded), doc name (14px bold), description, file name (FileText icon), file size, created date
  - Action buttons per doc: "Use" button (navy; changes to green "Active" with CheckCircle when selected), "Edit" button (Edit3 icon), Delete button (Trash2 icon, red)
  - Empty state: FolderOpen icon (32px, 0.4 opacity), "No documents found", "Upload your first document to get started"

**User Actions**:
- Search documents by name, description, or fileName (case-insensitive)
- Click "New Document" to open EditDocumentModal (create mode)
- Click "Use" to select a document as active context
- Click "Edit" to open EditDocumentModal (edit mode)
- Click Delete (Trash2) to delete a document (no confirmation dialog)
- Click X or backdrop to close panel

**Validation Rules**:
- Search filters by name, description, or fileName (case-insensitive)

**API Calls**:
- None. Local state only.

**Mocks/Hardcoded**:
- DEFAULT_DOCUMENT_VAULT: 3 documents:
  - "Master Services Agreement -- Acme Corp" (MSA_Acme_Corp_v4.pdf, 2.4 MB)
  - "Employee Handbook 2026" (Employee_Handbook_2026.pdf, 3.8 MB)
  - "Series B Term Sheet" (SeriesB_TermSheet_Signed.pdf, 0.6 MB)

---

### Chat: Edit/Create Document Modal (ChatView embedded)
**File**: `src/pages/chatbot/ChatView.jsx` — `EditDocumentModal` component (lines 1167-1252)

**UI Elements**:
- Hidden file input (accept: .pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx)
- Backdrop overlay (rgba black 0.4, blur 4px)
- Centered modal (560px max width, 90vh max height, rounded 2xl)
- Header: "New Document" or "Edit Document" title, X close button
- Form fields:
  - "Document name *" text input (placeholder "e.g., Master Services Agreement -- Acme Corp")
  - "Description" textarea (placeholder "Short description of this document...", 2 rows, resizable)
  - "File *" section:
    - No file state: dashed border button "Choose a file to upload" (Upload icon) -- opens native file picker
    - File selected state: File icon, file name (truncated), file size, "Replace" button (opens file picker again), Trash2 remove button
- Footer: Cancel / "Create Document" or "Save Changes" buttons

**User Actions**:
- Type document name
- Type description
- Click "Choose a file to upload" to open native file picker
- Select a file (sets fileName and fileSize from selected File object)
- Click "Replace" to re-open file picker
- Click Trash2 to remove file selection
- Click "Create Document" / "Save Changes" to save
- Click Cancel or X or backdrop to close

**Validation Rules**:
- Document name is required
- File is required (fileName must be non-empty)
- Submit button disabled (gray, cursor not-allowed) if either name or file is empty

**API Calls**:
- None. Local state only. File content is not actually uploaded anywhere.

**Mocks/Hardcoded**:
- File size computed from File.size as MB: `(f.size / (1024 * 1024)).toFixed(1) MB`
- No actual file content stored or uploaded

---

### Chat: Attach Menu (ChatView embedded)
**File**: `src/pages/chatbot/ChatView.jsx` — `AttachMenu` component (lines 1254-1319)

**UI Elements**:
- Backdrop overlay (full screen, z-40)
- Popover menu (300px wide, positioned above input area, rounded 12, shadow):
  - Hidden file input (accept: .pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx, multiple)
  - "Upload Documents" menu item: Upload icon, "Upload files from your device"
  - "Knowledge Pack" menu item: Package icon, "Select a pack as conversation context" (or "Pack: {name}" + "Attached as context" when active, with "Remove" button)
  - "Document Vault" menu item: FolderOpen icon, "Select a saved document" (or "Doc: {name}" + "Attached as context" when active, with "Remove" button)
  - Each menu item: 36px icon circle, label, subtitle, ChevronRight when inactive

**User Actions**:
- Click "Upload Documents" to open native file picker (multi-file)
- Select files -- triggers onAttachFiles callback
- Click "Knowledge Pack" to open KnowledgePacksPanel
- Click "Remove" on active Knowledge Pack to clear it
- Click "Document Vault" to open DocumentVaultPanel
- Click "Remove" on active Document to clear it
- Click backdrop to close menu

**Validation Rules**:
- File input accepts: .pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx

**API Calls**:
- None.

**Mocks/Hardcoded**:
- None specific to this component.

---

### Chat: Sidebar Knowledge Section (ChatView embedded)
**File**: `src/pages/chatbot/ChatView.jsx` — `Sidebar` component (lines 263-460, specifically 435-447)

**UI Elements**:
- "KNOWLEDGE" section header (collapsible, uppercase label with ChevronDown arrow)
- 3 nav items under Knowledge section:
  - "Document vault" (FolderOpen icon) with vault count, clickable -> opens DocumentVaultPanel
  - "Knowledge packs" (Package icon) with pack count, clickable -> opens KnowledgePacksPanel
  - "Prompt templates" (FileText icon) with prompt count, clickable -> opens PromptTemplatesPanel
- Collapse state persisted to localStorage key: `yourai_sidebar_knowledge_open`

**User Actions**:
- Click "KNOWLEDGE" section header to expand/collapse
- Click "Document vault" to open Document Vault Panel
- Click "Knowledge packs" to open Knowledge Packs Panel
- Click "Prompt templates" to open Prompt Templates Panel

**Mocks/Hardcoded**:
- Sidebar also includes "Knowledge Graph" item under WORKSPACE section with "New" badge (no onClick handler)

---

### Chat: Message KB Context Indicators (ChatView embedded)
**File**: `src/pages/chatbot/ChatView.jsx` (lines 1480-1506)

**UI Elements**:
- Knowledge pack indicator on messages: pill badge (Package icon + "Using: {packName}"), navy color, 11px font
- Vault document indicator on messages: pill badge (File icon + "Using: {docName}"), navy color, 11px font
- Source badge on bot messages: pill badge with icon (Database or Sparkles) + text:
  - "Answered from: your document" (blue styling)
  - "Answered from: YourAI knowledge base" (green styling)
  - "AI-generated" label (gray styling)

**Mocks/Hardcoded**:
- Thread messages contain hardcoded sourceBadge values: "Answered from: YourAI knowledge base", "Answered from: your document"

---

### Chat: Top Nav Search Bar (ChatView embedded)
**File**: `src/pages/chatbot/ChatView.jsx` — `TopNav` component (lines 1388-1392)

**UI Elements**:
- Read-only search input with Search icon, placeholder "Search files, knowledge, or conversatio...", Cmd+K keyboard shortcut badge
- Desktop only (hidden on mobile via `hidden md:block`)

**User Actions**:
- None. Input is `readOnly`. No search functionality wired.

**Discrepancies**:
- D22: Search bar placeholder suggests file/knowledge search but input is readOnly with no handler.

---

### Chat: Session Document Version Handling (ChatView state)
**File**: `src/pages/chatbot/ChatView.jsx` (lines 1848-1860)

**UI Elements**:
- None directly visible. Internal state management.

**Mocks/Hardcoded**:
- `sessionState` object: sessionKbSnapshotId (uuid-style string), sessionDocId (null initially), sessionStartTime (ISO timestamp)
- TODO comment: "Phase 2 -- replace snapshot reference with full document_versions table for audit trail"
- References to decisions: DEC-093 (KB locked at session start), DEC-094, DEC-095 (user doc locked for session)

---

## 4. BACKEND API

---

### Backend: Document Routes — `/api/documents`
**File**: `backend/src/routes/documents.ts`

**Endpoints**:
- `GET /api/documents` -- List documents for authenticated user's org (requireAuth middleware)
- `POST /api/documents/upload` -- Upload single file (multer, memory storage)
- `GET /api/documents/:id` -- Get document by ID with chunk metadata
- `DELETE /api/documents/:id` -- Delete document and its chunks

**Validation Rules**:
- File upload max size: 100MB (100 * 1024 * 1024 bytes)
- Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/plain
- Allowed extensions: .pdf, .docx, .xlsx, .txt
- Error message for invalid type: "Only PDF, DOCX, XLSX, and TXT files are allowed"
- Upload requires authentication (requireAuth middleware)
- Requires file in request (returns 400 "No file provided" if missing)
- Delete scoped to user's org (findFirst with orgId filter)

**API Behavior**:
- Upload creates document record in Prisma with status "PROCESSING"
- Supports `isGlobal` body param (string "true")
- Triggers async `ingestDocument(doc.id)` after creation (non-blocking)
- Get single document includes chunks (id, pageNumber)
- Delete removes all chunks first, then document

**Discrepancies**:
- D23: Backend supports real file upload with S3 storage and RAG ingestion, but the frontend Legal Content tab file upload is non-functional (drop handler and button not wired).
- D24: Frontend allows TXT in the Legal Content upload zone label but the Persona tab file input only accepts `.pdf,.docx`.

---

## 5. EXTERNAL INTEGRATIONS

---

### CourtListener API Integration
**File**: `src/lib/courtlistener.ts`

**Endpoints Called**:
- `GET https://www.courtlistener.com/api/rest/v4/courts/?format=json&page_size={limit}&jurisdiction={jurisdiction}` -- Fetch courts
- `GET https://www.courtlistener.com/api/rest/v4/search/?format=json&type=o&q={query}&page_size={limit}` -- Search opinions

**Functions**:
- `fetchCourts(jurisdiction, limit)` -- Fetches court records (default: federal, 50)
- `searchOpinions(query, limit)` -- Searches opinions by query
- `fetchRecentOpinions(limit)` -- Fetches recent opinions (query="*")
- `fetchCourtListenerKB()` -- Fetches courts (30) + opinions (15), formats as context text block
- `searchCourtListenerKB(query)` -- Searches for specific topic, returns formatted context

**Data Structures**:
- CourtRecord: id, full_name, short_name, jurisdiction, citation_string, in_use, start_date, end_date
- OpinionResult: caseName, court, dateFiled, docketNumber, citation[], citeCount, snippet, cluster_id

---

## DISCREPANCY SUMMARY

| # | Severity | Issue |
|---|----------|-------|
| D1 | High | SA Legal Content: File upload drop zone `onDrop` handler does not process files -- only resets drag state |
| D2 | High | SA Legal Content: "Upload Files" button has no onClick handler -- upload is non-functional |
| D3 | Low | SA Legal Content: "Total Size" stat is hardcoded "22.9 MB" -- not computed from actual document sizes |
| D4 | Low | SA Legal Content: "Last Updated" stat is hardcoded "Today" -- not derived from document dates |
| D5 | Medium | SA Legal Content: Manage State Library upload creates a fake document -- no real file processing |
| D6 | Info | SA Bot Persona: Entire tab marked CONFIDENCE 7/10 -- verbally confirmed by Ryan, not written |
| D7 | Info | SA Bot Persona: Marked "OUT OF SCOPE of 18 source docs" -- wireframe for visual review |
| D8 | Medium | SA Bot Persona: INTENT_CONFIDENCE_THRESHOLD (0.75) is placeholder -- TODO to confirm with AI team |
| D9 | Info | SA Bot Persona: Message Routing Flow marked CONFIDENCE 3/10 -- not confirmed by Ryan |
| D10 | Medium | SA Bot Persona: Save/Discard buttons exist in code but appear to be missing from rendered JSX |
| D11 | Medium | SA Bot Persona: Fallback message displayed read-only -- no edit UI despite updatePersona function existing |
| D12 | Low | SA Bot Persona: Per-Persona Response Format cards are read-only with Lock badge -- edit code exists but is unused |
| D13 | Info | SA Bot Persona: Adding new intents is blocked -- "managed by engineering" |
| D14 | Info | SA Alex Templates: Entire tab is disabled with `{false && ...}` -- kept for future use |
| D15 | High | OA Document Vault: No upload functionality -- page is read-only display only |
| D16 | High | OA Document Vault: No delete functionality -- no action buttons on rows |
| D17 | Medium | OA Document Vault: No document preview/view capability |
| D18 | Low | OA Document Vault: No pagination for large document lists |
| D19 | High | OA Knowledge Packs: Entirely read-only -- no CRUD actions available |
| D20 | High | OA Knowledge Packs: No way to manage pack contents (add/remove docs or links) |
| D21 | Medium | Chat: "Add Document" in Knowledge Pack editor adds fake doc from hardcoded list -- no real file upload |
| D22 | Low | Chat: Top nav search bar is readOnly with no handler -- search not functional |
| D23 | High | Backend has real upload/delete API but SA frontend upload is not wired to it |
| D24 | Low | File type mismatch: Legal Content label says "PDF, DOCX, XLSX, TXT" but Persona file input only accepts ".pdf,.docx" |
