# Bot Persona Module -- Raw Feature Inventory

**Extracted from**: `src/pages/super-admin/GlobalKnowledgeBase.jsx` (lines 83-2491), plus supporting files  
**Route**: `/super-admin/knowledge-base` (tab: "Bot Persona")  
**Tab activation**: `activeTab === 'persona'`  
**Confidence comment in code**: `CONFIDENCE: 7/10 -- Ryan confirmed concept verbally, not written. Rollback-ready.`  
**Out-of-scope comment**: `OUT OF SCOPE of 18 source docs. Built as wireframe for Ryan visual review.`

---

## Page-Level Structure

The Bot Persona is a tab within the GlobalKnowledgeBase page. The page has 2 active tabs:
1. **Legal Content** (default)
2. **Bot Persona** (tab label includes `<Bot />` icon)

A third tab ("Alex Response Templates") exists in code but is **fully commented out / disabled** (`{false && activeTab === 'alex' && ...}`).

---

### 1. Top Info Banner -- Bot Persona Overview
**File**: `GlobalKnowledgeBase.jsx` lines 1804-1813

**UI Elements**:
- Info icon (blue, `<Info size={18} />`)
- Heading text: "What is Bot Persona?"
- Description paragraph explaining multiple intent modes, fallback message, and global knowledge documents
- Blue left-border callout box (`backgroundColor: '#EFF6FF'`, `borderLeft: '4px solid #3B82F6'`)

**User Actions**:
- None (read-only informational banner)

**Validation Rules**:
- None

**API Calls**:
- None

**Mocks/Hardcoded**:
- Static text content

**Discrepancies**:
- None

---

### 2. Bot Persona Configuration -- Status Bar
**File**: `GlobalKnowledgeBase.jsx` lines 1816-1858

**UI Elements**:
- Section heading: "Bot Persona Configuration" (DM Serif Display font)
- InfoButton tooltip: "Bot Persona -- How It Works" with 4 subsections (What does this control, Intents = Multiple System Prompts, Fallback chain, When do changes take effect)
- "Active" badge (green, with `<CheckCircle />` icon) -- shown when `personaSaved` is true
- "Unsaved changes" badge (amber) -- shown when `personaDirty` is true
- Version info text: `v{version} . Last saved {date} by {name}`
- "Read-only -- managed by engineering" label with `<Lock />` icon

**User Actions**:
- Click InfoButton to open tooltip
- No direct edits on this bar

**Validation Rules**:
- None

**API Calls**:
- None

**Mocks/Hardcoded**:
- `DEFAULT_PERSONA.version`: `1`
- `DEFAULT_PERSONA.updatedAt`: `'Apr 10, 2026 . 09:14 AM'`
- `DEFAULT_PERSONA.updatedBy`: `'Arjun Sharma'`
- On save, `updatedBy` is hardcoded to `'Arjun Sharma'`

**Discrepancies**:
- The "Read-only -- managed by engineering" label suggests SA cannot edit, but many fields below ARE editable (tone prompt, keywords, opening behaviour, custom instruction). The label appears to refer only to system prompts.

---

### 3. Intents Section -- Multi-Prompt Cards
**File**: `GlobalKnowledgeBase.jsx` lines 1864-2090

**UI Elements**:
- Section label: "Intents" (bold)
- InfoButton: "Intents -- Multiple AI Modes" with subsections (What are Intents, How does it work, Examples)
- Counter text: `{enabled count} of {total} enabled`
- Comment in code: `SA cannot add new intents -- managed by engineering`
- Subtitle: "Each intent defines a separate AI mode..."
- 12 intent accordion cards, each containing:
  - **Header row** (clickable to expand/collapse):
    - Bot icon in colored circle (navy if enabled, grey if disabled)
    - Intent label (bold)
    - ON/OFF badge (green/grey, fontSize 10)
    - Tone prompt preview badge (first 40 chars of tonePrompt, truncated)
    - Description text (truncated, single line)
    - Enable/Disable button (text toggles between red "Disable" / green "Enable")
    - ChevronDown icon (rotates on expand)
  - **Expanded panel** (when `editingOp === op.id`):
    - System Prompt (read-only, with Lock icon and "Read-only" label)
    - Tone Prompt (editable textarea)
    - Divider
    - Trigger Keywords section
    - Opening Behaviour toggles
    - Custom Instruction textarea
    - Example Queries (conditional, if `op.exampleQueries` exists)

**User Actions**:
- Click intent header to expand/collapse accordion
- Click Enable/Disable button to toggle `op.enabled`
- Edit Tone Prompt textarea
- Add keyword: type in input + press Enter or click "Add" button
- Remove keyword: click X on keyword pill
- Toggle Opening Behaviour: click toggle switch on one of 3 options
- Edit Custom Instruction textarea

**Validation Rules**:
- Tone Prompt: max 800 characters (enforced in onChange: `e.target.value.length <= 800`)
- Tone Prompt: character counter displayed `({length}/800)`
- Keywords: max 20 per intent (enforced in `addKeyword`: `if ((op.keywords || []).length >= 20) return op;`)
- Keywords: deduplicated (lowercased before comparison: `if ((op.keywords || []).includes(kw)) return op;`)
- Keywords: trimmed + lowercased (`keyword.trim().toLowerCase()`)
- Keywords: empty strings rejected (`if (!kw) return;`)
- Custom Instruction: max 500 characters (enforced in onChange: `e.target.value.length <= 500`)
- Custom Instruction: character counter displayed `({length}/500)`
- Opening Behaviour: mutually exclusive (only one can be active per intent)

**API Calls**:
- None (all local state + localStorage)

**Mocks/Hardcoded**:
- `DEFAULT_INTENTS` array with 12 intents (see section below)
- Opening behaviour options are hardcoded:
  - `start_immediately`: "Start Immediately" / "Bot waits for user message -- no opening prompt"
  - `ask_for_document`: "Ask for Document" / "Bot asks user to upload a document before proceeding"
  - `ask_clarifying_question`: "Ask Clarifying Question" / "Bot asks a clarifying question before responding"

**Discrepancies**:
- System prompt is displayed as read-only but there is no mechanism to edit it anywhere in the UI. The "managed by engineering" label only appears at the top status bar level, not per-intent.
- The "Add Intent" button is removed with comment "SA cannot add new intents -- managed by engineering", but the `addIntent()` function still exists in code and is callable.
- The `deleteIntent()` function exists but no Delete button is rendered in the UI.
- No `exampleQueries` property exists on any of the 12 DEFAULT_INTENTS, so the conditional example queries section never renders.
- Opacity is set to 0.55 for disabled intents, but they remain fully interactive when expanded.
- Intent IDs use `Date.now()` for new intents (addIntent), which is fragile for persistence.

---

### 4. DEFAULT_INTENTS -- All 12 Intents
**File**: `GlobalKnowledgeBase.jsx` lines 86-231

Each intent has: `id`, `label`, `description`, `systemPrompt`, `tonePrompt`, `enabled`, `keywords[]`, `opening_behaviour`, `custom_instruction`

| # | ID | Label | Enabled | Opening Behaviour | Keyword Count |
|---|-----|-------|---------|-------------------|---------------|
| 1 | 1 | General Chat | true | start_immediately | 0 |
| 2 | 2 | Contract Review | true | ask_for_document | 10 |
| 3 | 3 | Legal Research | true | start_immediately | 7 |
| 4 | 4 | Document Drafting | true | ask_clarifying_question | 9 |
| 5 | 5 | Compliance Check | **false** | ask_for_document | 5 |
| 6 | 6 | Document Summarisation | true | ask_for_document | 11 |
| 7 | 7 | Case Law Analysis | true | ask_for_document | 7 |
| 8 | 8 | Clause Comparison | true | ask_for_document | 8 |
| 9 | 9 | Email & Letter Drafting | true | ask_clarifying_question | 9 |
| 10 | 10 | Due Diligence | **false** | ask_for_document | 6 |
| 11 | 11 | Legal Q&A | true | start_immediately | 10 |
| 12 | 12 | Risk Assessment | true | ask_for_document | 9 |

**Discrepancies**:
- GlobalKnowledgeBase has 12 intents, but `src/lib/intents.ts` defines only 10 intents (missing: Compliance Check, Due Diligence).
- `src/lib/intentDetector.ts` INTENT_DEFAULTS defines 10 intents (same 10 as intents.ts, missing Compliance Check and Due Diligence).
- The 10 intents in `intents.ts` use snake_case IDs (e.g., `contract_review`), while DEFAULT_INTENTS in GlobalKnowledgeBase uses numeric IDs (1-12).
- Intent names mostly align, but "Email & Letter Drafting" in GlobalKnowledgeBase is "Email & Letter Drafting" in intents.ts too, with ID `email_letter_drafting`.
- Keywords overlap significantly between GlobalKnowledgeBase DEFAULT_INTENTS and intentDetector.ts INTENT_DEFAULTS but are not identical.

---

### 5. Fallback Message Section
**File**: `GlobalKnowledgeBase.jsx` lines 2092-2119

**UI Elements**:
- Section label: "Fallback Message" (bold)
- InfoButton: "Fallback Message" with subsections (When is this shown, Fallback chain, Default message example)
- Subtitle: "Shown when the bot cannot find an answer..."
- Fallback message displayed as **read-only** styled div (not textarea/input)
  - `backgroundColor: '#F8FAFC'` (grey background, no border interaction)

**User Actions**:
- Click InfoButton
- **No editing** -- the fallback message is displayed as a read-only div, not an input

**Validation Rules**:
- None visible (field is not editable in the UI)

**API Calls**:
- None

**Mocks/Hardcoded**:
- Default fallback message: `"I couldn't find a clear answer in your documents or the knowledge base. Could you clarify what you're looking for, or upload a relevant document?"`

**Discrepancies**:
- The `updatePersona('fallbackMessage', ...)` function exists and would allow editing, but the UI renders the fallback message as a plain `<div>`, not an editable input/textarea. This makes it effectively read-only despite the state setter existing.

---

### 6. Per-Persona Response Format Section
**File**: `GlobalKnowledgeBase.jsx` lines 2120-2179

**UI Elements**:
- Users icon + Section label: "Per-Persona Response Format" (bold)
- InfoButton: "Per-Persona Format -- Tailored Responses by Role" with subsections (What is this, How does it work, Priority order, Example)
- Counter: `{active count} of {total} active`
- Subtitle: "Configure how Alex adapts its response style for each user role..."
- 4 persona cards (non-expandable, read-only display), each containing:
  - Icon in colored circle (navy if enabled, grey if disabled)
  - Persona label (bold)
  - ACTIVE/OFF badge (green/grey)
  - Tone badge (showing tone label from TONE_OPTIONS)
  - Description text (truncated)
  - "Read-only" label with Lock icon

**User Actions**:
- Click InfoButton
- **No editing** -- all 4 cards show Lock icon + "Read-only" label. No expand, no toggle, no edit.

**Validation Rules**:
- None (read-only display)

**API Calls**:
- None

**Mocks/Hardcoded**:
- `USER_PERSONAS` array with 4 personas:
  1. `partner_senior` -- "Partner / Senior Attorney" (Briefcase icon, formal tone, formatRules: cite_source, risk_summary, next_action)
  2. `associate_junior` -- "Associate / Junior Attorney" (Scale icon, formal tone, formatRules: cite_source, bullet_lists, next_action)
  3. `paralegal_assistant` -- "Paralegal / Legal Assistant" (UserCheck icon, conversational tone, formatRules: cite_source, bullet_lists)
  4. `legal_ops_it` -- "Legal Intents / IT" (Monitor icon, concise tone, formatRules: bullet_lists, next_action)
- `TONE_OPTIONS`: `[{ id: 'formal', label: 'Formal' }, { id: 'conversational', label: 'Conversational' }, { id: 'neutral', label: 'Neutral' }, { id: 'concise', label: 'Concise' }]`
- Each persona has a `promptModifier` string and `defaults` object
- `DEFAULT_PERSONA_FORMATS` is computed from USER_PERSONAS, all with `enabled: true`

**Discrepancies**:
- State management functions exist for editing persona formats (`updatePersonaFormat`, `togglePersonaFormatRule`, `resetPersonaFormat`, `setExpandedPersona`) but the UI renders everything as read-only with Lock icons. These functions are dead code in the current UI.
- The 4th persona is labeled "Legal Intents / IT" which appears to be a typo -- should likely be "Legal Ops / IT" based on description context.
- The `expandedPersona` state exists but is never used in the rendered JSX (no expand/collapse on persona cards).

---

### 7. Global Knowledge Documents Section (Right Column)
**File**: `GlobalKnowledgeBase.jsx` lines 2184-2277

**UI Elements**:
- Section label: "Global Knowledge Documents" (bold)
- InfoButton: "Global Knowledge Documents" with subsections (What are these, Who sees these, Best practices, Confirmed source DEC-042)
- Doc count: `{count} docs`
- Subtitle: "Fallback KB when a user has not attached a document in chat..."
- **Drag-and-drop zone**:
  - Upload icon
  - "Drag & drop PDF / DOCX files (max 100MB)" text
  - "or browse files" clickable link text
  - "You can also paste a link below" text
  - Border style changes on dragOver (navy border, ice-warm background)
- **Hidden file input**: `accept=".pdf,.docx"`, `multiple` enabled
- **Add link input row**:
  - Link2 icon
  - URL text input with placeholder: "Paste a link to add (e.g. https://example.com/document)"
  - "Add Link" button (navy when URL present, grey when empty)
- **Document list** (vertical stack):
  - Each doc row: File/Link2 icon, document name (truncated), type badge, size text, Trash2 delete button
  - Type badge shows: PDF, DOCX, LINK, etc.

**User Actions**:
- Drag and drop files onto the drop zone
- Click drop zone to open file picker
- Select files via native file picker (multiple allowed)
- Type URL in link input field
- Press Enter in link input to add link
- Click "Add Link" button to add link
- Click Trash2 icon on any doc to remove it

**Validation Rules**:
- File input accepts: `.pdf,.docx` only (via HTML accept attribute)
- Link URL: validated with `new URL(url)` constructor; shows toast "Please enter a valid URL" on failure
- Link name: auto-generated from URL (protocol stripped, trailing slash stripped, truncated to 60 chars)
- Document content: text extraction attempted for `.txt`, `.md`, `.csv` files; truncated to 50,000 characters to avoid localStorage quota
- Add Link button disabled when `kbLinkInput` is empty/whitespace

**API Calls**:
- None (all localStorage)

**Mocks/Hardcoded**:
- `DEFAULT_PERSONA.globalDocs`:
  1. `Federal_Rules_Civil_Procedure.pdf` (PDF, 4.2 MB)
  2. `UCC_Article_2_Commentary.pdf` (PDF, 2.8 MB)
  3. `ABA_Model_Rules_Ethics.docx` (DOCX, 1.1 MB)
- All docs have `url: '#'`

**Discrepancies**:
- Drop zone text says "PDF / DOCX files (max 100MB)" but there is no file size validation in `handlePersonaFileUpload`. The 100MB limit is display-only.
- The file input only accepts `.pdf,.docx` but the content extraction code also handles `.txt`, `.md`, `.csv`. Users cannot select those formats via the file picker.
- No actual upload to S3 or any backend -- files are processed client-side and stored in localStorage.

---

### 8. CourtListener Integration Section
**File**: `GlobalKnowledgeBase.jsx` lines 2278-2359

**UI Elements**:
- Scale icon + label: "CourtListener -- Live Legal Data" (bold)
- InfoButton: "CourtListener Integration" with subsections (What is this, What gets loaded)
- **Disconnected state**:
  - "Connect CourtListener" button (navy, full width)
  - Loading state: "Connecting to CourtListener..." with spinning Loader icon
- **Connected state**:
  - "Connected" text with green CheckCircle icon
  - Stats grid (3 columns): Courts count, Opinions count, Last sync time
  - "Refresh" button (white, with RotateCcw icon)
  - "Disconnect" button (white, red text, with Trash2 icon)

**User Actions**:
- Click "Connect CourtListener" button to initiate connection
- Click "Refresh" button to re-fetch data
- Click "Disconnect" button to remove CourtListener data

**Validation Rules**:
- Button disabled during loading (`clLoading` state)

**API Calls**:
- **Real API call**: `fetchCourtListenerKB()` from `src/lib/courtlistener.ts`
  - Calls `https://www.courtlistener.com/api/rest/v4/courts/?format=json&page_size=30&jurisdiction=F`
  - Calls `https://www.courtlistener.com/api/rest/v4/search/?format=json&type=o&q=*&page_size=15`
  - No auth required (public API)
- **Storage**: Results stored in `localStorage` keys: `yourai_courtlistener_kb` (context text), `yourai_cl_stats` (JSON stats)

**Mocks/Hardcoded**:
- None -- this uses real CourtListener API

**Discrepancies**:
- This is a real external API integration embedded in what is otherwise described as a "wireframe for Ryan visual review."

---

### 9. Auto-Routing Preview Section (Right Column)
**File**: `GlobalKnowledgeBase.jsx` lines 2362-2473

**UI Elements**:
- GitBranch icon + label: "Message Routing Flow" (bold)
- InfoButton: "Message Routing -- How the AI Picks the Right Mode" with subsections (What is message routing, The 4-step flow, Status)
- "DRAFT" badge (amber)
- Subtitle: "Visual preview of how the AI routes every message. Not confirmed -- for Ryan review."
- **5-step vertical flow diagram** (visual only):
  1. "User Sends Message" (purple) -- MessageSquare icon
  2. "Intent Classifier" (blue) -- Target icon
  3. "Persona Format Applied" (green) -- Users icon
  4. "Source Resolution" (orange) -- Database icon
  5. "Response Streamed" (light blue) -- Zap icon
- Each step has a numbered circle connected by a vertical line
- **2 branch cards** (below flow):
  - "Low Confidence" (amber): `Confidence < {threshold} -> AI asks clarifying question`
  - "No Answer Found" (red): `All sources exhausted -> Fallback message shown`
- **Active Intents summary panel**:
  - Bot icon + "Active Intents ({count})" label
  - Pills for each enabled intent (solid style)
  - Pills for each disabled intent (line-through text)
  - Users icon + "Active Personas ({count})" label
  - Pills for each persona (green if enabled, grey with line-through if disabled)

**User Actions**:
- Click InfoButton
- **No editing** -- entirely visual/read-only

**Validation Rules**:
- None

**API Calls**:
- None

**Mocks/Hardcoded**:
- `INTENT_CONFIDENCE_THRESHOLD`: `0.75` (with comment: `TODO: confirm confidence threshold with AI team` and `OQ-pending -- do not ship without confirmation`)
- Flow step descriptions are hardcoded

**Discrepancies**:
- Code comment: `CONFIDENCE: 3/10 -- Intent classifier not confirmed by Ryan. Visual wireframe only.`
- The confidence threshold (0.75) is not actually used anywhere in the functioning code; the `intentDetector.ts` uses keyword matching without confidence scores.
- The flow diagram describes a confidence-based classifier, but the actual implementation in `intentDetector.ts` uses keyword match count, not confidence scores.

---

### 10. Warning Banner
**File**: `GlobalKnowledgeBase.jsx` lines 2477-2483

**UI Elements**:
- AlertTriangle icon (amber)
- Text: "Changes apply from the next session -- active conversations will finish with the current persona."
- Amber background callout box

**User Actions**:
- None (informational)

**Mocks/Hardcoded**:
- Static text

---

### 11. Save / Discard Behaviour
**File**: `GlobalKnowledgeBase.jsx` lines 430-459

**Note**: No Save/Discard buttons are rendered in the Bot Persona tab JSX. The functions exist but have **no visible trigger buttons** in the current UI.

**Functions available**:
- `handleSavePersona()`:
  - Increments version number
  - Updates timestamp with `new Date().toLocaleString()`
  - Hardcodes updatedBy to `'Arjun Sharma'`
  - Saves to localStorage key `yourai_bot_persona`
  - Shows success toast: "Bot persona saved -- changes apply immediately to new chats"
  - Catches localStorage quota error and shows error toast
- `handleDiscardPersona()`:
  - Resets persona to `savedPersona`
  - Resets personaFormats to `savedPersonaFormats`
  - Clears `personaDirty`, `editingOp`, `expandedPersona`
  - Shows info toast: "Changes discarded"

**Validation Rules**:
- localStorage quota check on save (try/catch around `localStorage.setItem`)

**API Calls**:
- None (localStorage only)

**Mocks/Hardcoded**:
- `updatedBy: 'Arjun Sharma'` hardcoded on every save

**Discrepancies**:
- **Critical**: No Save or Discard buttons exist in the rendered JSX. The `personaDirty` flag is tracked and the "Unsaved changes" badge appears, but there is no way for the user to save or discard changes through the UI.
- The save toast says "changes apply immediately to new chats" which contradicts the warning banner saying "changes apply from the next session."

---

### 12. Persistence Layer
**File**: `GlobalKnowledgeBase.jsx` lines 246-259, `src/lib/llm-client.ts`

**Mechanism**:
- State initialized from `localStorage.getItem('yourai_bot_persona')`
- Falls back to `DEFAULT_PERSONA` if nothing in localStorage
- `handleSavePersona()` writes to `localStorage.setItem('yourai_bot_persona', ...)`
- `llm-client.ts` reads persona via `getPersona()` which reads from same localStorage key
- `llm-client.ts` `buildSystemPrompt()` consumes persona:
  - Finds active intent by label match (or defaults to General Chat)
  - Appends `tonePrompt` (new style) or `tone` + `formatRules` (legacy fallback)
  - Appends shared `BEHAVIORAL_RULES` constant
  - Appends global doc content as `--- Knowledge Base Documents ---` block
- CourtListener data stored separately: `yourai_courtlistener_kb`, `yourai_cl_stats`

**Discrepancies**:
- `llm-client.ts` looks up intents by `label` string match, but the GlobalKnowledgeBase uses numeric `id` fields. This works because `buildSystemPrompt` matches on `o.label === intentLabel`, and labels are consistent strings.
- `llm-client.ts` has a `BotPersona` interface with optional `tone?: string` and `formatRules?: string[]` fields marked as "Legacy -- kept for backward compat." The current GlobalKnowledgeBase uses `tonePrompt` instead, which `buildSystemPrompt` handles.

---

### 13. Intent Detection (Consumer Side)
**File**: `src/lib/intentDetector.ts`

**Key features consumed by ChatView**:
- `detectIntent(message, currentIntent, intentConfigs)`: returns best matching intent ID or null
- `detectAllIntents(message, intentConfigs)`: returns all matching intents sorted by score
- Uses `INTENT_DEFAULTS` (10 intents) as fallback when no SA config provided
- Scoring: counts keyword matches per intent, highest wins
- Tie-breaking: uses `PRIORITY_ORDER` array
- Cross-intent threshold: needs 2+ more matches than current intent to suggest switch
- Minimum message length: 10 characters
- `legal_qa` checked last (lowest priority)

**Discrepancies**:
- `intentDetector.ts` defines `response_format` per intent (`risk_card`, `structured_sections`, `plain_prose`) but this field is not present in GlobalKnowledgeBase's DEFAULT_INTENTS and is not configurable in the SA UI.
- `intentDetector.ts` has an `IntentConfig` interface with `response_format` field that has no corresponding UI control.

---

### 14. Intents Registry (Single Source of Truth)
**File**: `src/lib/intents.ts`

**Defines**:
- `INTENTS` array: 10 intent definitions with `id` (snake_case) and `label`
- `DEFAULT_INTENT`: `'general_chat'`
- Helper functions: `getIntentLabel(id)`, `getIntentId(label)`

**Discrepancies**:
- Only 10 intents defined vs 12 in GlobalKnowledgeBase
- Missing: Compliance Check, Due Diligence (both disabled by default in GlobalKnowledgeBase)

---

### 15. Commented-Out / Disabled Features

**Alex Response Templates tab** (lines 1353-1797):
- Entirely wrapped in `{false && ...}` -- never renders
- Contains: Intent Routing Flow diagram, Intent Templates grid, Edit Template slide-over, Response Filters grid, Unknown Queries Log table, Create Intent modal
- State variables commented out (lines 51-63)
- Handler functions commented out in a `/* */` block (lines 584-643)
- Comment: "COMMENTED OUT (not in scope, kept for future use)"

**Add Intent functionality**:
- `addIntent()` function exists (line 413-428)
- `showAddOp` state exists (line 263)
- But no "Add Intent" button is rendered -- comment says "SA cannot add new intents -- managed by engineering"
- `deleteIntent()` function exists (line 404-411) but no delete button rendered

**"Requires Document" toggle**:
- Comment at line 2069: "Requires Document removed -- covered by Opening Behaviour 'Ask for Document'"

---

### 16. All InfoButtons / Tooltips Inventory

| Location | Title | Subsections |
|----------|-------|-------------|
| Status bar | "Bot Persona -- How It Works" | What does this control, Intents = Multiple System Prompts, Fallback chain, When do changes take effect |
| Intents header | "Intents -- Multiple AI Modes" | What are Intents, How does it work, Examples (Contract Review, Legal Research) |
| Fallback Message | "Fallback Message" | When is this shown, Fallback chain, Default message example |
| Per-Persona Format | "Per-Persona Format -- Tailored Responses by Role" | What is this, How does it work, Priority order, Example |
| Global Knowledge Docs | "Global Knowledge Documents" | What are these, Who sees these, Best practices, Confirmed source (DEC-042) |
| CourtListener | "CourtListener Integration" | What is this, What gets loaded |
| Message Routing Flow | "Message Routing -- How the AI Picks the Right Mode" | What is message routing, The 4-step flow, Status (DRAFT warning) |

---

### 17. Read-Only vs Editable Fields Summary

| Field | Editable? | Notes |
|-------|-----------|-------|
| System Prompt (per intent) | Read-only | Lock icon + "Read-only" label, rendered as div |
| Tone Prompt (per intent) | Editable | Textarea, 800 char max |
| Trigger Keywords (per intent) | Editable | Add/remove pills, 20 max |
| Opening Behaviour (per intent) | Editable | Toggle switches, mutually exclusive |
| Custom Instruction (per intent) | Editable | Textarea, 500 char max |
| Intent Enable/Disable | Editable | Toggle button per intent |
| Fallback Message | **Read-only** | Rendered as div despite state setter existing |
| Per-Persona Response Format | **Read-only** | Lock icon + "Read-only" label on all 4 cards |
| Global Knowledge Docs | Editable | Upload, add link, delete |
| CourtListener | Editable | Connect/disconnect/refresh |
| Message Routing Flow | Read-only | Visual diagram only, DRAFT |

---

## Discrepancy Summary Table

| # | Severity | Issue |
|---|----------|-------|
| 1 | HIGH | No Save or Discard buttons rendered in the Bot Persona tab. Users can make edits (tone prompt, keywords, etc.) but have no way to persist or revert them through the UI. The `handleSavePersona` and `handleDiscardPersona` functions exist but are not wired to any buttons. |
| 2 | HIGH | Intent count mismatch: GlobalKnowledgeBase defines 12 intents, but `intents.ts` and `intentDetector.ts` define only 10. Missing: Compliance Check, Due Diligence. These 2 are disabled by default but could be enabled in the UI with no matching detector config. |
| 3 | MEDIUM | Save toast says "changes apply immediately to new chats" but the warning banner says "changes apply from the next session." Contradictory messaging. |
| 4 | MEDIUM | Fallback message is displayed as read-only div but the `updatePersona` function could modify it. No UI control to edit it exists. Unclear if this is intentional or an oversight. |
| 5 | MEDIUM | Per-Persona Response Format has full edit state management code (`updatePersonaFormat`, `togglePersonaFormatRule`, `resetPersonaFormat`, `expandedPersona`) but the UI renders all 4 persona cards as read-only with Lock icons. Dead code. |
| 6 | MEDIUM | `response_format` field exists in `intentDetector.ts` (`risk_card`, `structured_sections`, `plain_prose`) but is not configurable in the SA UI and not present in the GlobalKnowledgeBase DEFAULT_INTENTS. |
| 7 | MEDIUM | No file size validation in `handlePersonaFileUpload` despite UI text claiming "max 100MB." The limit is display-only. |
| 8 | LOW | "Read-only -- managed by engineering" label at the status bar level is misleading because several fields within the intents ARE editable (tone prompt, keywords, opening behaviour, custom instruction). |
| 9 | LOW | `addIntent()` and `deleteIntent()` functions exist but no UI buttons trigger them. Comment says "SA cannot add new intents -- managed by engineering." |
| 10 | LOW | Intent IDs use numeric values (1-12) in GlobalKnowledgeBase but snake_case strings in `intents.ts` and `intentDetector.ts`. The bridge works via label string matching in `llm-client.ts` but is fragile. |
| 11 | LOW | `INTENT_CONFIDENCE_THRESHOLD` (0.75) is defined with TODO/OQ-pending comments but is only used for display text in the routing diagram. The actual intent detection uses keyword match counts, not confidence scores. |
| 12 | LOW | File input accepts `.pdf,.docx` but content extraction code also handles `.txt`, `.md`, `.csv`. Users cannot select those formats via the picker. |
| 13 | LOW | 4th user persona labeled "Legal Intents / IT" -- likely a typo for "Legal Ops / IT" based on the description text. |
| 14 | LOW | `updatedBy` is hardcoded to `'Arjun Sharma'` on every save. Should use the logged-in user's name. |
| 15 | INFO | CourtListener integration is a live external API call in what is labeled as a "wireframe for Ryan visual review." |
| 16 | INFO | All persistence is via localStorage. No backend API calls for any Bot Persona operations. |
| 17 | INFO | Auto-Routing Preview is marked CONFIDENCE: 3/10 and "not confirmed by Ryan." |
