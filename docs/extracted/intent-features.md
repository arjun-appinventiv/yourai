# Intent System Module — Raw Feature Inventory

**Date extracted**: 2026-04-23
**Branch**: `claude/great-banach`
**Source files**:
- `src/lib/intents.ts` — canonical intent registry (12 intents)
- `src/lib/intentDetector.ts` — keyword-match classifier (`INTENT_DEFAULTS`, `detectIntent`, `detectAllIntents`)
- `src/lib/intentDetector.backup.ts` — legacy copy (not imported anywhere)
- `src/lib/llm-client.ts` — `buildSystemPrompt()` + `callLLM()` inject the intent label into the system prompt via the bot persona's matching operation
- `api/chat.ts` — Edge function that receives `body.intent` and injects per-intent JSON-schema system messages (`CARD_SCHEMAS`) with `response_format: json_object`
- `src/pages/chatbot/ChatView.jsx` — main chat surface; owns `activeIntent` state, dropdown, auto-switch, suggestion banners, cross-intent nudge
- `src/pages/chatbot/WorkspaceChatView.tsx` — workspace-scoped chat; owns its own `activeIntent` state, dropdown, suggestion banner (same `INTENTS`, same `detectAllIntents`)
- `src/pages/super-admin/GlobalKnowledgeBase.jsx` — SA "Bot Persona" tab; edits the persona's `operations[]` (each entry is one intent with `systemPrompt`, `tonePrompt`, `keywords`, `enabled` toggle, `opening_behaviour`)
- `src/components/chat/cards/IntentCard.tsx` — dispatches card rendering by intent (`CARD_INTENTS`, `isCardIntent`) — **out of scope for this FRD per request**
- Storage key: `yourai_bot_persona` (localStorage, shape defined by `BotPersona` type in `llm-client.ts`)

**Route surfaces**:
| # | Surface | Route | Owner of intent state |
|---|---------|-------|-----------------------|
| 1 | Main chat | `/chat` | `ChatView.jsx` (`activeIntent` in-memory) |
| 2 | Workspace chat | `/chat/workspaces/:wsId` | `WorkspaceChatView.tsx` (`activeIntent` in-memory, separate from #1) |
| 3 | SA Bot Persona editor | `/super-admin/knowledge-base?tab=persona` | `GlobalKnowledgeBase.jsx` (`persona.operations[]` in localStorage) |
| 4 | Edge chat API | `POST /api/chat` | `api/chat.ts` (reads `body.intent`, injects card schema if matched) |

---

## 1. Canonical Intent Registry — `src/lib/intents.ts`

**Shape**:
```ts
interface IntentDef { id: string; label: string; }
```

**Hardcoded list — 12 intents**:
| `id` | `label` |
|------|---------|
| `general_chat` | General Chat |
| `contract_review` | Contract Review |
| `legal_research` | Legal Research |
| `document_drafting` | Document Drafting |
| `document_summarisation` | Document Summarisation |
| `case_law_analysis` | Case Law Analysis |
| `clause_comparison` | Clause Comparison |
| `email_letter_drafting` | Email & Letter Drafting |
| `legal_qa` | Legal Q&A |
| `risk_assessment` | Risk Assessment |
| `clause_analysis` | Clause Analysis |
| `timeline_extraction` | Timeline |

**Exports**:
- `INTENTS` — the array above
- `DEFAULT_INTENT = 'general_chat'`
- `getIntentLabel(id)` → returns the label, fallback to `'General Chat'` if id not found
- `getIntentId(label)` → reverse lookup, fallback to `'general_chat'`

**File-level comment**: `// ─── Single source of truth for all YourAI intents ───` — claims to be canonical but see Discrepancies section.

---

## 2. Intent Classifier — `src/lib/intentDetector.ts`

### 2.1 `IntentConfig` shape

```ts
interface IntentConfig {
  keywords: string[];
  opening_behaviour: 'ask_for_document' | 'ask_clarifying_question' | 'start_immediately';
  custom_instruction: string;
  response_format: 'risk_card' | 'structured_sections' | 'plain_prose';
}
```

### 2.2 `INTENT_DEFAULTS` — hardcoded per-intent config

Keyed by intent `id`. **Note: `clause_analysis` and `timeline_extraction` exist in `intentDetector.ts`'s `INTENT_DEFAULTS` but do NOT appear in the SA Bot Persona's `DEFAULT_INTENTS` array, and vice versa (`compliance_check` and `due_diligence` exist in persona defaults but NOT in `INTENT_DEFAULTS`). See Discrepancies.**

Per-intent keyword lists and configuration (verbatim from code):

**general_chat** — `keywords: []`, `opening_behaviour: 'start_immediately'`, `response_format: 'plain_prose'`, `custom_instruction: ''`

**contract_review** — `opening_behaviour: 'ask_for_document'`, `response_format: 'risk_card'`, 18 keywords:
`contract review`, `review this contract`, `review the contract`, `review a contract`, `review my contract`, `check this contract`, `analyse this contract`, `analyze this contract`, `look at this contract`, `review this agreement`, `check this agreement`, `analyse this nda`, `review this nda`, `review this msa`, `review this lease`, `help with contract`, `help me review`, `review contract`

**legal_research** — `opening_behaviour: 'start_immediately'`, `response_format: 'structured_sections'`, 7 keywords:
`what does the law say`, `legal precedent`, `case law on`, `is it legal to`, `what are my legal rights`, `legal position on`, `find case law`

**document_drafting** — `opening_behaviour: 'ask_clarifying_question'`, `response_format: 'structured_sections'`, 14 keywords:
`draft a contract`, `draft an agreement`, `draft a clause`, `draft an nda`, `write a contract`, `write an agreement`, `create a contract`, `help me draft`, `help with drafting`, `can you draft`, `i need a contract`, `template for a contract`, `document drafting`, `draft document`

**document_summarisation** — `opening_behaviour: 'ask_for_document'`, `response_format: 'structured_sections'`, 16 keywords:
`summarise this`, `summarize this`, `give me a summary`, `summary of this`, `summarise`, `summarize`, `summarisation`, `summarization`, `tldr`, `tl;dr`, `key points from`, `main points of`, `brief me on`, `overview of this`, `help with summary`, `document summary`

**case_law_analysis** — `opening_behaviour: 'ask_for_document'`, `response_format: 'structured_sections'`, 8 keywords:
`analyse this case`, `analyze this case`, `case analysis`, `court decision`, `what happened in this case`, `this judgment`, `this judgement`, `ruling in`

**clause_comparison** — `opening_behaviour: 'ask_for_document'`, `response_format: 'structured_sections'`, 13 keywords:
`compare these`, `compare the two`, `compare both`, `difference between`, `which is better`, `side by side`, `contrast these`, `how do these differ`, `compare clause`, `compare contracts`, `clause comparison`, `help with comparison`, `compare documents`

**email_letter_drafting** — `opening_behaviour: 'ask_clarifying_question'`, `response_format: 'plain_prose'`, 12 keywords:
`write an email`, `draft an email`, `write a letter`, `draft a letter`, `compose an email`, `demand letter`, `cease and desist`, `reply to this email`, `response to their email`, `help with email`, `help with letter`, `email drafting`

**legal_qa** — `opening_behaviour: 'start_immediately'`, `response_format: 'structured_sections'`, 11 keywords:
`what is`, `what are`, `how does`, `can i`, `do i have to`, `am i required`, `explain`, `define`, `meaning of`, `is this enforceable`, `is it possible`

**risk_assessment** — `opening_behaviour: 'ask_for_document'`, `response_format: 'risk_card'`, 16 keywords:
`what are the risks`, `identify the risks`, `risk assessment`, `assess the risk`, `any red flags`, `risky clauses`, `risk analysis`, `should i sign this`, `is this safe to sign`, `anything concerning`, `flag the risks`, `help with risk`, `evaluate risk`, `risk memo`, `generate a risk memo`, `risk review`

**clause_analysis** — `opening_behaviour: 'ask_for_document'`, `response_format: 'structured_sections'`, 13 keywords:
`analyse clauses`, `analyze clauses`, `extract clauses`, `break down the clauses`, `walk me through the clauses`, `clause by clause`, `each clause`, `which clauses`, `list the clauses`, `clause analysis`, `analyse each clause`, `what clauses are in`, `breakdown of clauses`

**timeline_extraction** — `opening_behaviour: 'ask_for_document'`, `response_format: 'structured_sections'`, 14 keywords:
`timeline of`, `chronology`, `chronological order`, `dates in this`, `key dates`, `build a timeline`, `extract the timeline`, `sequence of events`, `what happened when`, `list the events`, `litigation timeline`, `discovery timeline`, `deadlines in this`, `important dates`

### 2.3 Priority ordering

```ts
const PRIORITY_ORDER = [
  'contract_review',
  'timeline_extraction',
  'clause_analysis',
  'document_summarisation',
  'document_drafting',
  'risk_assessment',
  'clause_comparison',
  'legal_research',
  'case_law_analysis',
  'email_letter_drafting',
];
```
`legal_qa` appended after — evaluated last as a catch-all fallback.

### 2.4 `detectIntent(message, currentIntent, intentConfigs={}) → string | null`

**Algorithm**:
1. Returns `null` if message length (after trim) < 10 characters.
2. Lowercases the message once.
3. For each intent in `[...PRIORITY_ORDER, 'legal_qa']`:
   - Reads `intentConfigs[id] ?? INTENT_DEFAULTS[id]` (SA override wins)
   - Counts how many of its keywords appear in the message via `lower.includes(keyword.toLowerCase())`
   - If ≥ 1 match, records `{ intentId, matchCount, keywords }` in `scores[]`
4. If no scores, returns `null`.
5. Sorts scores: highest `matchCount` first; ties broken by `PRIORITY_ORDER` position (999 sentinel for non-listed).
6. If the best match is the `currentIntent`, returns `null` (no switch needed).
7. **Cross-intent sticky threshold**: if `currentIntent !== 'general_chat'`, only returns the new intent if `bestMatch.matchCount - currentCount >= 2` — prevents single-keyword drift out of a specific intent.
8. `legal_qa` is suppressed unless the user is in `general_chat` (because "what is" / "how does" etc. are too broad to bounce between specific intents).

**Return value**: the matched intent id, or `null`.

### 2.5 `detectAllIntents(message, intentConfigs={}) → IntentMatch[]`

Same scoring as `detectIntent` but returns **all matches** sorted descending. Used by the UI to show a "this could be Summary OR Research — which?" multi-pick banner when top matches tie.

---

## 3. ChatView Intent Surface — `src/pages/chatbot/ChatView.jsx`

### 3.1 State

```js
const [activeIntent, setActiveIntent] = useState(DEFAULT_INTENT);       // line 2783
const [isIntentDropdownOpen, setIsIntentDropdownOpen] = useState(false); // line 2784
const [suggestedIntent, setSuggestedIntent] = useState(null);            // single-intent suggestion
const [suggestedIntents, setSuggestedIntents] = useState([]);            // tied-score multi-pick
const [dismissedSuggestion, setDismissedSuggestion] = useState(null);    // user clicked "Keep X"
const suggestionTimer = useRef(null);                                     // debounce handle
```

State initialises to `DEFAULT_INTENT` (`'general_chat'`). There is no persistence of `activeIntent` to localStorage — it resets on page refresh and on `handleNewThread()`.

`handleNewThread()` (line 2844) resets:
- `activeIntent` → `DEFAULT_INTENT`
- `suggestedIntent` → `null`
- `suggestedIntents` → `[]`
- `dismissedSuggestion` → `null`
- plus messages/session/attachments/KP/vault (separate state)

### 3.2 Imports from intent libs

```js
import { detectIntent, detectAllIntents } from '../../lib/intentDetector';  // line 48
import { INTENTS, DEFAULT_INTENT, getIntentLabel } from '../../lib/intents'; // line 49
```

### 3.3 Empty-state intent pills — rendered when `showEmptyState === true`

**UI Elements** (lines 3868–3898):
- Horizontal flex-wrap container, `gap: 6`, `marginBottom: 8`
- Iterates `INTENTS.map(…)` and renders one button per intent
- Button styles:
  - `padding: '6px 14px'`, `borderRadius: 999`, `fontSize: 13`, `fontFamily: 'DM Sans'`
  - Inactive: `border: '0.5px solid var(--border)'`, `color: var(--text-secondary)`, `fontWeight: 400`
  - Active: `border: '1.5px solid var(--text-primary)'`, `color: var(--text-primary)`, `fontWeight: 500`
  - Hover (inactive): border → `var(--text-muted)`, color → `var(--text-primary)`
- Label = `intent.label` (from `INTENTS` registry)
- All 12 intents render regardless of whether the Bot Persona has them enabled

**User Actions**:
- Click pill → `setActiveIntent(intent.id)` (synchronous, no side effects)

**Validation rules**: none.

### 3.4 Collapsed intent pill — rendered when `showEmptyState === false`

**UI Elements** (lines 3970–4035):
- Container `<div style={{ position: 'relative' }} ref={intentDropdownRef}>`
- Button with current intent label + `ChevronDown` icon (12px, rotates 180° when open)
- Styles: `padding: '4px 10px'`, `borderRadius: 999`, `fontSize: 12`, `fontWeight: 500`, `border: '1.5px solid var(--text-primary)'`, navy text, white bg

**Dropdown** (opens upward, lines 3985–4030):
- Outside-click catcher: `<div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>` — clicking anywhere dismisses
- Panel: `position: absolute`, `bottom: '100%'`, `marginBottom: 6`, `width: 260`, white bg, `borderRadius: 12`, `1px solid var(--border)`, `boxShadow: '0 8px 24px rgba(0,0,0,0.12)'`, `zIndex: 51`, `maxHeight: 320` scrollable
- Rows: each intent from `INTENTS`, `padding: '8px 14px'`, `fontSize: 13`, hover bg `var(--ice-warm)`
- Active intent row has `fontWeight: 500`, navy `CheckCircle` icon (14px) on the right
- Clicking a row: `setActiveIntent(intent.id)` + `setIsIntentDropdownOpen(false)` — **seamless, no interrupting banner** (previous "Start fresh conversation" flow was removed; see code comment lines 4028–4034)

### 3.5 Auto-switch on first message — `general_chat` escape hatch

Inside `sendMessage()` (lines 3004–3023):

```js
let effectiveIntent = activeIntent;
if (activeIntent === 'general_chat' && trimmed.length >= 10) {
  const detectedMatch = detectIntent(trimmed, 'general_chat');
  if (detectedMatch) {
    effectiveIntent = detectedMatch;
    setActiveIntent(detectedMatch);
    // Inject system note
    const switchLabel = getIntentLabel(detectedMatch);
    setMessages(prev => [...prev, {
      id: Date.now() + 0.5,
      sender: 'bot',
      content: `Switched to **${switchLabel}** mode for a more tailored response.`,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      sourceBadge: null,
      isSystemNote: true,
    }]);
  }
}
```

**Behaviour**:
- Only fires when current intent is `general_chat` AND message ≥ 10 chars
- Silently switches `activeIntent` AND drops a centered "Switched to X mode" system-note bubble (rendered centered, compact, not as a full chat message — see `MessageBubble` handling of `isSystemNote`, comment at line 2080)
- Uses the same `detectIntent()` function with empty `intentConfigs` (so only `INTENT_DEFAULTS` keywords apply; SA overrides are not read in this call — see Discrepancies)
- Does NOT fire if user is already in a specific intent — that path uses the cross-intent nudge instead (3.7)

### 3.6 Smart-suggestion banners (debounced on typing)

**Trigger** (lines 4041–4069): on every keystroke in the input textarea, debounce 600ms. If `input.trim().length >= 10`:

```js
const allMatches = detectAllIntents(val);
const relevant = allMatches.filter(m =>
  m.intentId !== activeIntent &&           // skip current
  m.intentId !== dismissedSuggestion        // skip dismissed
);

if (relevant.length === 0) → clear both suggestions
else if (relevant.length >= 2 && relevant[0].matchCount === relevant[1].matchCount) {
  // tie — show multi-pick banner
  setSuggestedIntents(relevant.filter(m => m.matchCount === relevant[0].matchCount));
}
else {
  setSuggestedIntent(relevant[0].intentId);  // single banner
}
```

**Single-suggestion banner** (lines 3904–3923):
- Shown when `suggestedIntent && !suggestedIntents.length && !showDocVersionBanner`
- Layout: flex row, `padding: '10px 14px'`, `marginBottom: 6`, `borderRadius: 12`, `backgroundColor: var(--ice-warm)`, `0.5px solid var(--border)`
- Left: `Looks like <strong>{getIntentLabel(suggestedIntent)}</strong>` (13px)
- Right: two buttons
  - **"Yes, switch"** — white bg, `0.5px solid var(--border)`, `borderRadius: 999`, 12px. On click: `setActiveIntent(suggestedIntent)`, clears all suggestion state, clears `dismissedSuggestion`.
  - **"Keep {currentLabel}"** — transparent bg, no border, muted text. On click: `setDismissedSuggestion(suggestedIntent)`, `setSuggestedIntent(null)` — remembers the dismissal for the current session so it won't re-appear.

**Multi-suggestion banner** (lines 3926–3960):
- Shown when `suggestedIntents.length >= 2 && !showDocVersionBanner`
- Header text:
  - If `≤ 3` tied: `This could be <strong>{A or B or C}</strong>. Which would you like?`
  - If `> 3` tied: `Multiple intents match your message. Which would you like to use?`
- Row of buttons, one per tied intent + one "Keep {currentLabel}" button
- Clicking an intent: `setActiveIntent(m.intentId)`, clears all suggestion state
- Clicking "Keep current": `setSuggestedIntents([])`, `setDismissedSuggestion(suggestedIntents[0]?.intentId)`

**Edge cases**:
- Clearing the textarea (length < 10) clears both suggestion states and the debounce timer
- Suggestions only use `INTENT_DEFAULTS` (second positional arg omitted) — does NOT read SA-configured keywords from persona (Discrepancy)

### 3.7 Cross-intent nudge — hard constraint injection

Inside `sendMessage()` → fallback LLM path (line 3194–3198):

```js
if (effectiveIntent !== 'general_chat') {
  const crossIntentMatch = detectIntent(trimmed, effectiveIntent);
  if (crossIntentMatch) {
    const matchLabel = getIntentLabel(crossIntentMatch);
    contextLayers.crossIntentNudge = `HARD CONSTRAINT: The user's message appears to be a "${matchLabel}" task, but they are currently in "${getIntentLabel(effectiveIntent)}" mode.
You MUST:
1. Acknowledge what they're asking for in ONE sentence.
2. Do NOT perform the task. Do NOT produce any analysis, draft, comparison, review, or output.
3. Tell them: "To get the best results for this, switch to **${matchLabel}** mode using the intent selector below. I'll be able to give you a much more thorough and specialised response there."
This is a HARD BLOCK — do not attempt the task in the wrong mode.`;
  }
}
```

Only triggers on the **client-side fallback path** (`callLLM`), not the `/api/chat` Edge path. `crossIntentNudge` is read by `buildSystemPrompt` in `llm-client.ts` (line 234) and appended to the system prompt.

### 3.8 Intent on message send

Line 3052 — the `/api/chat` POST body:
```js
body: JSON.stringify({
  conversationId: activeThreadId,
  message: trimmed,
  history,
  intent: effectiveIntent,   // ← intent tag sent to Edge
  sessionId: sessionState.sessionKbSnapshotId,
  sessionDocId: sessionState.sessionDocId,
}),
```

Line 3187 — the client-side fallback path:
```js
contextLayers.intentLabel = getIntentLabel(effectiveIntent);
```
passed into `callLLM(message, history, onChunk, contextLayers)` and consumed by `buildSystemPrompt`.

### 3.9 Intent persistence on the message record

Line 3223–3235 — when a message comes back:
```js
let cardData = null;
if (isCardIntent(effectiveIntent)) {
  cardData = tryParseCardData(fullContent);
}
const botMsg = {
  id: ...,
  sender: 'bot',
  content: fullContent,
  intent: effectiveIntent,     // ← stored on the message
  cardData,
  timestamp: ...,
  knowledgePack: activeKnowledgePack?.name || null,
  vaultDocument: activeVaultDocument?.name || null,
  sourceBadge,
  sessionKbSnapshotId: sessionState.sessionKbSnapshotId,
};
```

Allows `MessageBubble` to later dispatch to the correct card component even if the user has since switched intents.

### 3.10 Intent + Knowledge Pack / Document Vault interaction

**Current architecture**: intent and KP/DV selections are **independent, session-level states**. There is no auto-attach of a KP or vault doc on intent change, nor any "default KP for intent X" mapping. Both states coexist and both get injected into the system prompt at message-send time.

**KP state** (line 2668):
```js
const [activeKnowledgePack, setActiveKnowledgePack] = useState(null);
```
Set by the user via the Knowledge Packs panel; displayed as a chip above the input (lines 3706–3710). Persists for the thread until user clears it or deletes the pack (line 3496: auto-clears if the pack being displayed gets deleted).

**Vault doc state** (line 2686):
```js
const [activeVaultDocument, setActiveVaultDocument] = useState(null);
```
Set by the user via the Document Vault panel; displayed as a chip above the input (lines 3711–3715). Same auto-clear on delete (line 3509).

**How they get into the prompt** (lines 3166–3201, inside the client-side fallback `callLLM` path — the Edge path does NOT currently receive KP/DV content, only `sessionId`/`sessionDocId` IDs):

```js
// Tier 1: pending attachments → inline uploaded-doc context
if (pendingAttachments.length > 0) {
  contextLayers.uploadedDoc = { name: ..., content: extractedText };
}
// Tier 1 (alt): activeVaultDocument → same slot
else if (activeVaultDocument) {
  contextLayers.uploadedDoc = {
    name: activeVaultDocument.name,
    content: activeVaultDocument.description || ''   // ⚠ only description, not actual doc content
  };
}
// Tier 2: activeKnowledgePack
if (activeKnowledgePack) {
  contextLayers.knowledgePack = {
    name: activeKnowledgePack.name,
    description: activeKnowledgePack.description,
    content: activeKnowledgePack.docs?.map(d => `[${d.name}]`).join(', '),  // ⚠ only file names, not content
  };
}
```

Then `callLLM(..., contextLayers)` → `buildSystemPrompt(persona, context.intentLabel)` fetches the matching operation's `systemPrompt` + `tonePrompt` AND appends uploaded-doc and KP context sections. The intent label thus selects the **response style** but does NOT change the KP/DV selection.

**Source badge** (lines 3074, 3211):
After the response streams back, the client decides which source pill to show (`UPLOADED_DOC`, `KNOWLEDGE_PACK`, `GLOBAL_KB`, `NONE`) — this is an LLM-self-reported header on the `/api/chat` response (`X-Source-Type`) or a 4-tier priority guess in the fallback path. The badge label includes `activeKnowledgePack?.name` when applicable.

**What does NOT exist** (confirmed absent via codebase grep):
- No `defaultKnowledgePackIds` or `defaultVaultDocIds` on any intent definition
- No logic that changes `activeKnowledgePack` or `activeVaultDocument` when `setActiveIntent` is called
- No "required KP for intent X" validation — a Contract Review intent does NOT demand a contract-playbook KP be selected
- No tenant-level or user-level saved mapping of intent → KP/DV

### 3.11 `useEffect` dependency on `activeIntent`

Line 3265 — scroll/empty-state useEffect includes `activeIntent` in deps:
```js
}, [isTyping, showEmptyState, messages, activeKnowledgePack, activeVaultDocument,
    pendingAttachments, activeThreadId, sessionState, activeIntent]);
```
So changing intent re-runs the auto-scroll logic (no functional impact).

### 3.12 Intent pill for external users

External users are redirected away from `/chat` on mount — `/chat` intent pills are never rendered for them. They see the intent system only inside `WorkspaceChatView` (see §4).

---

## 4. WorkspaceChatView Intent Surface — `src/pages/chatbot/WorkspaceChatView.tsx`

### 4.1 State

```ts
const [activeIntent, setActiveIntent] = useState<string>(DEFAULT_INTENT); // line 153
```
Plus equivalent `suggestion` / `dismissedSuggestion` state and dropdown open/close. This state is **completely separate** from ChatView's — switching from `/chat` into a workspace does not propagate the active intent.

### 4.2 Imports

```ts
import { INTENTS, DEFAULT_INTENT, getIntentLabel } from '../../lib/intents';
// plus detectAllIntents from '../../lib/intentDetector'
```

### 4.3 UI differences from `/chat`

- Single-intent suggestion banner exists at line 724–730, similar layout to ChatView: `Looks like <strong>{label}</strong>` + `Yes, switch` / `Keep {current}` buttons
- No explicit mention of the multi-intent tied-match banner — workspace chat only uses single suggestion
- No mid-conversation switch banner (matches post-removal ChatView behaviour)
- Collapsed pill + dropdown at line 772–780, same visual as ChatView
- `detectAllIntents` is called at line 562 on every keystroke (same 600ms debounce pattern presumed; implementation mirrors ChatView's)

### 4.4 Intent handoff to backend

`WorkspaceChatView.tsx` sends messages to its own endpoint; the same `intent: effectiveIntent` field is passed (identical pattern to ChatView).

---

## 5. Edge API Intent Handling — `api/chat.ts`

### 5.1 Request body shape

```ts
{
  conversationId: string,
  message: string,
  history: Array<{ role: 'user' | 'assistant', content: string }>,
  intent: string,               // ← consumed for card-schema injection
  sessionId: string,
  sessionDocId: string,
  // Legacy: messages[] shape also accepted
}
```

### 5.2 `CARD_SCHEMAS` — per-intent JSON schema map

Lines 20–170. Keys are intent ids; values are TypeScript-shape descriptions as multi-line strings. Schemas are defined for:
- `document_summarisation` → SummaryCard shape
- `legal_research` → ResearchBriefCard shape
- `case_law_analysis` → CaseBriefCard shape
- `clause_comparison` → ComparisonCard shape
- `risk_assessment` → RiskMemoCard shape
- `clause_analysis` → ClauseAnalysisCard shape
- `timeline_extraction` → TimelineCard shape

**Not present** (intentionally — comment at line 135):
- `legal_qa` — Q&A stays as prose
- `general_chat`, `contract_review`, `document_drafting`, `email_letter_drafting` — no card

### 5.3 Schema injection flow

Lines 223–251:
```ts
cardSchema = CARD_SCHEMAS[body.intent as string];
if (cardSchema) {
  messages.unshift({
    role: 'system',
    content: `OUTPUT FORMAT — CRITICAL: Return a SINGLE JSON object that matches this TypeScript shape exactly...

${cardSchema}

Rules:
- Output MUST start with { and end with }
- No markdown code fences around the JSON
- No text before or after the JSON
- Use \\n inside strings for line breaks...
- Every field listed above must be present. If information is unavailable, use an empty string "", empty array [], or null...
- Even for simple questions, populate each section of the schema. Do not return a "Q&A-style" short answer — the user's UI specifically expects the structured shape.`,
  });
}
```

### 5.4 `response_format` on the OpenAI call

Line 267–275:
```ts
body: JSON.stringify({
  model, messages, temperature, max_tokens, stream: true,
  ...(cardSchema ? { response_format: { type: 'json_object' } } : {}),
}),
```

Only set when the intent maps to a card schema. Forces OpenAI to emit valid JSON.

### 5.5 Generic system prompt (non-card path)

Lines 40–205 — a long instruction block appended as a separate `role: system` message. Covers:
- **In-scope** enumeration: law, statutes, procedural rules, case law, contracts, compliance, litigation, ethics, jurisdictional questions, and broad "what is the law on X" phrasing
- **Out-of-scope** enumeration: celebrity trivia, sports, entertainment, cooking, weather, jokes, creative writing, medical/dating/travel, casual chit-chat
- **Explicit bias**: "When in doubt, ANSWER. It is far worse to refuse a legitimate legal question than to answer an edge-case one."
- **Refusal format**: `"I'm a legal assistant and can only help with legal matters. Is there a contract, regulation, or case I can help you with?"`

This system prompt applies to ALL intents — card schemas are prepended on top of it for card intents.

### 5.6 No per-intent system prompt from Edge

The Edge function **does not read** the Bot Persona's per-intent `systemPrompt` / `tonePrompt`. Those are client-side constructs consumed only by the fallback `callLLM` path in `llm-client.ts`. Consequence: production responses (which hit `/api/chat`) use the Edge's generic prompt + optional card schema; the per-intent persona prompts are effectively only active on the client-fallback path (which runs when the Edge is unreachable).

---

## 6. Client-side Intent → System Prompt — `src/lib/llm-client.ts`

### 6.1 `BotPersona` shape (line 16–28)

```ts
interface BotPersona {
  operations: Array<{
    id: number;
    label: string;                 // Matches INTENTS.label (persona uses labels, not ids)
    systemPrompt: string;
    tonePrompt?: string;
    tone?: string;                 // Legacy
    formatRules?: string[];        // Legacy
    enabled: boolean;
  }>;
  fallbackMessage: string;
  globalDocs: Array<{ id: number; name: string; content?: string }>;
}
```

Loaded from `localStorage.getItem('yourai_bot_persona')` via `getPersona()` (line 30).

### 6.2 `buildSystemPrompt(persona, intentLabel)` — line 73

Algorithm:
1. If persona is null → returns a generic `"You are Alex, a professional and warm legal AI assistant..."` prompt + `BEHAVIORAL_RULES`.
2. Else, look up `persona.operations.find(o => o.label === intentLabel && o.enabled)` (matches by **label** — see Discrepancy §8).
3. Fallback chain if no match: first enabled `General Chat` op → first enabled op → first op in array.
4. Composes `[activeOp.systemPrompt, activeOp.tonePrompt, BEHAVIORAL_RULES, …globalDocs as context]`.
5. Returns as a single string.

### 6.3 `BEHAVIORAL_RULES` (lines 38–61)

Always injected. Includes:
- Greeting handling rules (1 sentence max, no capability lists)
- Out-of-scope decline policy
- Citation rules (never fabricate, never cite un-uploaded sources)
- Format directives (`##` headings, `-` bullets, `**bold**` for key terms)
- Forbidden phrases ("Certainly!", "Great question!", etc.)
- Domain guardrail mirroring the Edge system prompt (refusal text, in-scope list, "when in doubt, answer" bias)

### 6.4 `ContextLayers` — line 115

```ts
interface ContextLayers {
  uploadedDoc?: { name: string; content: string } | null;
  knowledgePack?: { name: string; description: string; content?: string } | null;
  intentLabel?: string | null;          // ← the selected intent's label
  crossIntentNudge?: string | null;     // ← HARD CONSTRAINT text from 3.7
  multiDocCount?: number | null;
  docNames?: string[] | null;
  multiDocGuidance?: string | null;
}
```

### 6.5 `callLLM(userMessage, history, onChunk, context)` — line 128

- Calls `buildSystemPrompt(persona, context.intentLabel)` to pick the right per-intent prompt
- Appends `uploadedDoc`, `knowledgePack` sections into the system message text
- If `context.crossIntentNudge` is set, appends it after the standard system prompt (line 234)
- Streams OpenAI response, parses chunks, returns `{ fullContent, sourceType }` where `sourceType ∈ { 'UPLOADED_DOC', 'KNOWLEDGE_PACK', 'GLOBAL_KB', 'NONE' }` — inferred from which context layer was populated, NOT from the LLM's actual retrieval

---

## 7. SA Bot Persona Editor — `src/pages/super-admin/GlobalKnowledgeBase.jsx` (tab: `persona`)

### 7.1 Route

`/super-admin/knowledge-base`, tab activated by `activeTab === 'persona'`. Tab label includes `<Bot />` icon.

### 7.2 `DEFAULT_INTENTS` — lines 87–234

Hardcoded starter persona operations. **12 operations**. IDs are numeric (1–12), NOT matching the intent registry's string ids.

| Persona `id` | Persona `label` | `enabled` default | Keyword count |
|--------------|-----------------|-------------------|---------------|
| 1 | General Chat | `true` | 0 |
| 2 | Contract Review | `true` | 10 |
| 3 | Legal Research | `true` | 7 |
| 4 | Document Drafting | `true` | 9 |
| 5 | **Compliance Check** | `false` | 5 |
| 6 | Document Summarisation | `true` | 11 |
| 7 | Case Law Analysis | `true` | — |
| 8 | Clause Comparison | `true` | — |
| 9 | Email & Letter Drafting | `true` | — |
| 10 | **Due Diligence** | — | — |
| 11 | Legal Q&A | — | — |
| 12 | Risk Assessment | — | — |

**No `Clause Analysis` or `Timeline` persona operations** — those two intents from `intents.ts` have no matching persona record.

### 7.3 Storage

- Key: `localStorage.getItem('yourai_bot_persona')` (line 249, 256)
- Shape: `{ operations, fallbackMessage, globalDocs }` — matches `BotPersona` in `llm-client.ts`
- Seeded with `DEFAULT_INTENTS` on first load if missing

### 7.4 Per-operation edit UI (line 1900+)

Each operation renders as an expandable card:
- **Collapsed header**:
  - Icon tile (32×32, navy bg if enabled, border bg if disabled) with `Bot` icon (16px)
  - Label (text-sm, font-semibold)
  - `ON` / `OFF` pill (`#E7F3E9`/`#5CA868` or `#F0F3F6`/`muted`)
  - First line of `tonePrompt` truncated at 40 chars
  - Description one-liner beneath
  - **Enable / Disable** button on the right (red text for "Disable", green for "Enable")
- **Expanded edit panel**:
  - **System Prompt** (read-only display area) — line 1948
  - **Tone Prompt** editable `<textarea>`, max 800 chars — line 1955 shows `(N/800)` counter
  - **Keywords** — chip list, up to 20 keywords per operation (line 1975), each chip has an X to remove; Add input field below with `Enter` to submit; duplicate additions are silently ignored (line 382)
  - **Opening behaviour** — dropdown: `start_immediately` / `ask_for_document` / `ask_clarifying_question`
  - **Response format** — (not exposed in UI as of current build; only `INTENT_DEFAULTS` exposes this)
  - **Custom instruction** — free-text field

### 7.5 Mutation functions

- `setPersona(prev => ({ ...prev, operations: prev.operations.map(...) }))` — used for every field edit (line 364)
- Keyword add: line 379 — appends to `op.keywords`, capped at 20, dedupes
- Keyword remove: line 395 — filters out the specified keyword
- Toggle enabled: simple boolean flip inside operations map

### 7.6 Intent classifier diagram (lines 1370–1430)

A visual representation of the intent flow:
```
User Message → Intent Classifier → Known Intent (80%) → Response Filters → Streamed to User
                                     ↓
                                  Unknown Intent → Logged for review
```
Each node is a colored chip (EDE9FE/5B21B6 for User Message; F0F3F6/0F2E59 for Classifier; E7F3E9/5CA868 for Known Intent; FBEED5/E8A33D for Response Filters; F0F9FF/navy for Streamed; F9E7E7/C65454 for Unknown).

**Note**: this diagram is **aspirational** — the current implementation has no "80% known intent" short-circuit path, no separate filter stage, and no logging of unknown queries. It reflects the intended architecture from the bot-persona spec, not current code.

### 7.7 Confidence note

File-level comment (lines 88–89):
```
// CONFIDENCE: 7/10 — Ryan confirmed concept verbally, not written. Rollback-ready.
// ⚠ OUT OF SCOPE of 18 source docs. Built as wireframe for Ryan visual review.
```

---

## 8. Discrepancies

1. **Three separate "sources of truth" for the intent list**:
   - `src/lib/intents.ts` `INTENTS[]` — 12 entries, string ids
   - `src/lib/intentDetector.ts` `INTENT_DEFAULTS` — 12 entries, string ids (same ids but hardcoded keywords/config here)
   - `src/pages/super-admin/GlobalKnowledgeBase.jsx` `DEFAULT_INTENTS` — 12 entries, numeric ids, labels match but drift possible

2. **Label-vs-id mismatch in persona lookup**: `buildSystemPrompt` matches persona operations by `o.label === intentLabel`, while ChatView tracks `activeIntent` by id. This means renaming an op's label in the SA editor (e.g. "Legal Research" → "Research") silently breaks the lookup and falls back to General Chat.

3. **Intents missing from persona seed**: `clause_analysis` and `timeline_extraction` exist in `intents.ts` + `INTENT_DEFAULTS` but have no matching persona operation — so messages in those intents on the **client fallback** path get the General Chat system prompt. On the **Edge path** this doesn't matter because the Edge uses its own generic prompt + card schema.

4. **Persona-only intents not in registry**: `Compliance Check` and `Due Diligence` exist as persona operations but are NOT in `INTENTS[]` — so their pill never appears in the chat UI, and their keywords never run through `detectIntent`.

5. **SA keyword overrides not plumbed to the client**: `detectIntent(message, currentIntent, intentConfigs={})` accepts a second arg for overrides, but every call site passes `{}` (ChatView lines 3006, 3195; `detectAllIntents` line 4050). So SA-edited keywords in the Bot Persona editor are **not honored by the classifier** — the detector only sees `INTENT_DEFAULTS`.

6. **Edge prompt does not use persona**: `/api/chat` has its own generic system prompt; persona `systemPrompt` / `tonePrompt` never reach the Edge. Production responses are always using the hardcoded Edge prompt (+ card schema for card intents).

7. **`response_format` per intent is declared but unused on the UI**: `INTENT_DEFAULTS[…].response_format` (values: `risk_card`, `structured_sections`, `plain_prose`) is read by no code path — neither ChatView nor the Edge consults it. Card rendering is gated by `isCardIntent()` in `IntentCard.tsx` which has its own hardcoded `CARD_INTENTS` list.

8. **Intent ↔ KP / Vault Doc has zero wiring**: no intent has a default/required KP or vault doc; changing intent never modifies KP or vault selection. The two systems are fully orthogonal in current code.

9. **ChatView and WorkspaceChatView duplicate state**: changing intent in ChatView does not carry into WorkspaceChatView or vice versa. Each surface starts at `DEFAULT_INTENT` on mount.

10. **No cross-session persistence**: `activeIntent` is never written to localStorage. A page refresh always resets to `general_chat`.

11. **Cross-intent nudge only fires on client fallback**: the HARD CONSTRAINT text (§3.7) is appended via `contextLayers.crossIntentNudge` only in the `!usedBackend` branch. Production requests hitting `/api/chat` never include it — so a user typing a Contract Review task while in Legal Research mode does not get the nudge in production.

12. **`intentDetector.backup.ts`**: stale copy exists, not imported anywhere. Candidate for deletion.

13. **Auto-switch fires only out of `general_chat`**: lines 3005–3006 gate the auto-switch on `activeIntent === 'general_chat'`. A user explicitly in Legal Research who types "summarise this" gets the **cross-intent nudge** (on fallback path) or no treatment at all (on Edge path), never an auto-switch.

14. **Dismissed-suggestion memory is session-scoped**: `dismissedSuggestion` holds a single intent id — dismissing "Legal Research" only suppresses future single-banner suggestions for Legal Research; dismissing does NOT persist across page refreshes.

15. **Priority list omits 2 intents**: `general_chat` and `legal_qa` are NOT in `PRIORITY_ORDER`. `legal_qa` is manually appended at the end of the iteration; `general_chat` is never considered by `detectIntent` (has no keywords anyway).

---

## 9. File / Line Reference

| Artefact | File | Key lines |
|----------|------|-----------|
| `INTENTS[]` list | `src/lib/intents.ts` | 9–22 |
| `DEFAULT_INTENT` | `src/lib/intents.ts` | 24 |
| `INTENT_DEFAULTS` | `src/lib/intentDetector.ts` | 20–150 |
| `PRIORITY_ORDER` | `src/lib/intentDetector.ts` | 155 |
| `detectIntent()` | `src/lib/intentDetector.ts` | 168 |
| `detectAllIntents()` | `src/lib/intentDetector.ts` | 217 |
| ChatView state | `src/pages/chatbot/ChatView.jsx` | 2783–2788 |
| Empty-state pills | `src/pages/chatbot/ChatView.jsx` | 3868–3898 |
| Auto-switch on send | `src/pages/chatbot/ChatView.jsx` | 3005–3023 |
| Cross-intent nudge | `src/pages/chatbot/ChatView.jsx` | 3194–3198 |
| Suggestion debounce | `src/pages/chatbot/ChatView.jsx` | 4041–4069 |
| Single-suggestion banner | `src/pages/chatbot/ChatView.jsx` | 3904–3923 |
| Multi-suggestion banner | `src/pages/chatbot/ChatView.jsx` | 3926–3960 |
| Collapsed pill + dropdown | `src/pages/chatbot/ChatView.jsx` | 3970–4035 |
| KP context injection | `src/pages/chatbot/ChatView.jsx` | 3177–3183 |
| Vault context injection | `src/pages/chatbot/ChatView.jsx` | 3171–3174 |
| Intent on POST body | `src/pages/chatbot/ChatView.jsx` | 3052 |
| Intent stored on botMsg | `src/pages/chatbot/ChatView.jsx` | 3223–3235 |
| WorkspaceChatView state | `src/pages/chatbot/WorkspaceChatView.tsx` | 153 |
| WorkspaceChatView suggestion | `src/pages/chatbot/WorkspaceChatView.tsx` | 562, 724–730 |
| Edge `CARD_SCHEMAS` | `api/chat.ts` | 20–170 |
| Edge schema injection | `api/chat.ts` | 223–251 |
| Edge `response_format` | `api/chat.ts` | 267–275 |
| `buildSystemPrompt` | `src/lib/llm-client.ts` | 73 |
| `BEHAVIORAL_RULES` | `src/lib/llm-client.ts` | 38–61 |
| `ContextLayers` type | `src/lib/llm-client.ts` | 115 |
| `callLLM` | `src/lib/llm-client.ts` | 128 |
| Persona `DEFAULT_INTENTS` | `src/pages/super-admin/GlobalKnowledgeBase.jsx` | 87–234 |
| Persona edit UI | `src/pages/super-admin/GlobalKnowledgeBase.jsx` | 1900–2000 |
| Persona storage key | `src/pages/super-admin/GlobalKnowledgeBase.jsx` | 249, 256 |
| Intent classifier diagram | `src/pages/super-admin/GlobalKnowledgeBase.jsx` | 1370–1430 |

---

## 10. Not in Scope (per request)

- **Front-end component cards** for intent responses (`SummaryCard`, `ComparisonCard`, `CaseBriefCard`, `ResearchBriefCard`, `RiskMemoCard`, `ClauseAnalysisCard`, `TimelineCard`, `EditorialShell`, `IntentCard` dispatcher, `tryParseCardData`) — covered separately.
- Card dispatch logic in `MessageBubble` / `ChatView` lines 2123–2131 and 3223–3231.
- Slash-command demo routes (`/demo-summary`, `/demo-risk`, etc.) — mock-card-data feature.

---
*End of Intent System Raw Feature Inventory*
