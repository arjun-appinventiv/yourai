# SA Bot Persona — Dynamic Config Implementation Guide

## Overview

This document outlines how to make each config field in the SA Bot Persona panel **dynamically functional** — meaning changes made by a Super Admin actually affect the chatbot's behavior in real-time.

---

## Current Architecture

```
SA Bot Persona UI (GlobalKnowledgeBase.jsx)
    ↓ edits DEFAULT_INTENTS (React state only — NOT persisted)
    
ChatView.jsx
    ↓ user selects intent pill
    ↓ calls detectIntent() from intentDetector.ts
    ↓ passes intent to callLLM() in llm-client.ts
    
llm-client.ts → buildSystemPrompt()
    ↓ reads persona.operations[intent]
    ↓ injects systemPrompt + tone + formatRules
    ↓ sends to OpenAI / backend /api/chat
```

### Critical Gap

SA edits are **UI-only** — they live in React component state and are lost on refresh. The backend `BotPersona` table only stores global settings (one systemPrompt, one tone, one formatRules). There is **no per-intent persistence**.

---

## Config Fields & Implementation Plan

### 1. System Prompt (Read-only)

**Current:** Hardcoded per intent in `DEFAULT_INTENTS`. Displayed as read-only in SA panel.

**What it does:** The base instruction given to the AI for each intent (e.g., "You are a contract review specialist...").

**To make dynamic:**
- Keep read-only for most SAs (engineering-managed)
- OR allow SA override: add `systemPromptOverride` column to DB
- In `buildSystemPrompt()`, check if override exists → use it; otherwise fall back to default

**Logic:**
```typescript
// llm-client.ts → buildSystemPrompt()
const intentConfig = await fetchIntentConfig(tenantId, intentId);
const prompt = intentConfig.systemPromptOverride || DEFAULT_SYSTEM_PROMPTS[intentId];
```

**DB change:** Add `system_prompt_override TEXT NULL` to IntentConfig table.

---

### 2. Tone (Formal / Conversational / Neutral / Concise)

**Current:** UI renders 4 pill toggles per intent. Value stored in component state only.

**What it does:** Appends a tone instruction to the system prompt.

**To make dynamic:**

**A. Backend:**
```sql
-- New table: intent_configs
CREATE TABLE intent_configs (
  id            SERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL,
  intent_id     VARCHAR(50) NOT NULL,  -- e.g., 'contract_review'
  tone          VARCHAR(20) DEFAULT 'formal',
  format_rules  JSONB DEFAULT '[]',
  keywords      JSONB DEFAULT '[]',
  opening_behaviour VARCHAR(30) DEFAULT 'start_immediately',
  custom_instruction TEXT DEFAULT '',
  requires_document BOOLEAN DEFAULT false,
  updated_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, intent_id)
);
```

**B. API routes:**
```typescript
// backend/src/routes/intentConfig.ts
GET  /api/intent-configs              → returns all intent configs for tenant
GET  /api/intent-configs/:intentId    → returns single intent config
PUT  /api/intent-configs/:intentId    → upserts config for intent
```

**C. Frontend (GlobalKnowledgeBase.jsx):**
```javascript
// On tone pill click:
const handleToneChange = async (intentId, newTone) => {
  // Update local state immediately (optimistic)
  setIntents(prev => prev.map(i => 
    i.intentId === intentId ? { ...i, tone: newTone } : i
  ));
  // Persist to backend
  await fetch(`/api/intent-configs/${intentId}`, {
    method: 'PUT',
    body: JSON.stringify({ tone: newTone }),
  });
};
```

**D. ChatView consumption (llm-client.ts):**
```typescript
// In buildSystemPrompt():
const toneMap = {
  formal: 'Respond in a formal, professional tone suitable for legal correspondence.',
  conversational: 'Respond in a friendly, conversational tone while remaining professional.',
  neutral: 'Respond in a neutral, balanced tone.',
  concise: 'Respond concisely. Be brief and direct. Avoid unnecessary elaboration.',
};
systemPrompt += `\n\nTone: ${toneMap[intentConfig.tone] || toneMap.formal}`;
```

---

### 3. Format Rules (Multi-select pills)

**Current:** 4 toggleable pills per intent:
- Always cite the source document and page number
- Use bullet points for lists of 3 or more items
- Always include a risk level summary (High/Medium/Low)
- End every response with a suggested next action

**What it does:** Appends formatting instructions to the system prompt.

**To make dynamic:**

**A. Storage:** `format_rules JSONB` in `intent_configs` table.
```json
["cite_source", "bullet_lists", "risk_summary", "next_action"]
```

**B. Consumption in `buildSystemPrompt()`:**
```typescript
const formatRuleMap = {
  cite_source: 'Always cite the source document name and page number for every claim.',
  bullet_lists: 'Use bullet points when listing 3 or more items.',
  risk_summary: 'Include a risk level summary (High/Medium/Low) at the top of your response.',
  next_action: 'End every response with a suggested next action the user can take.',
};

const activeRules = intentConfig.formatRules || [];
if (activeRules.length > 0) {
  systemPrompt += '\n\nFormatting Rules:\n';
  activeRules.forEach(rule => {
    systemPrompt += `- ${formatRuleMap[rule]}\n`;
  });
}
```

**C. Frontend toggle logic:**
```javascript
const toggleFormatRule = async (intentId, ruleId) => {
  const intent = intents.find(i => i.intentId === intentId);
  const current = intent.formatRules || [];
  const updated = current.includes(ruleId) 
    ? current.filter(r => r !== ruleId) 
    : [...current, ruleId];
  
  // Optimistic update + API call
  updateIntentState(intentId, { formatRules: updated });
  await saveIntentConfig(intentId, { formatRules: updated });
};
```

---

### 4. Trigger Keywords

**Current:** UI shows keyword input + tag chips. Keywords stored in component state. `detectIntent()` in intentDetector.ts accepts optional `intentConfigs` but ChatView never passes SA-customized keywords — always falls back to hardcoded `INTENT_DEFAULTS`.

**What it does:** When a user types a message, the system checks against keywords to suggest switching to the relevant intent.

**To make dynamic:**

**A. Storage:** `keywords JSONB` in `intent_configs` table.
```json
["NDA", "non-disclosure", "confidential agreement", "secrecy clause"]
```

**B. Wire SA keywords into ChatView:**
```javascript
// ChatView.jsx — on component mount or tenant change:
const [intentConfigs, setIntentConfigs] = useState({});

useEffect(() => {
  fetch('/api/intent-configs')
    .then(r => r.json())
    .then(configs => {
      // Transform to map: { contract_review: { keywords: [...], ... } }
      const configMap = {};
      configs.forEach(c => { configMap[c.intentId] = c; });
      setIntentConfigs(configMap);
    });
}, [tenantId]);

// When detecting intent for a message:
const detected = detectIntent(userMessage, intentConfigs);
//                                         ↑ NOW passes SA configs
```

**C. Update detectIntent():**
```typescript
// intentDetector.ts
export function detectIntent(
  message: string, 
  customConfigs?: Record<string, { keywords: string[] }>
): string | null {
  const configs = customConfigs || INTENT_DEFAULTS;
  
  for (const [intentId, config] of Object.entries(configs)) {
    const keywords = config.keywords || [];
    if (keywords.some(kw => messageLower.includes(kw.toLowerCase()))) {
      return intentId;
    }
  }
  return null;
}
```

---

### 5. Opening Behaviour

**Current:** 3 radio pills per intent:
- `start_immediately` — Bot responds right away
- `ask_for_document` — Bot asks user to upload a document first
- `ask_clarifying_question` — Bot asks a clarifying question before responding

**What it does:** Controls the bot's first response when a user activates an intent.

**To make dynamic:**

**A. Storage:** `opening_behaviour VARCHAR(30)` in `intent_configs` table.

**B. Consumption in ChatView.jsx:**
```javascript
// When user clicks an intent pill:
const handleIntentSelect = async (intentId) => {
  setActiveIntent(intentId);
  
  const config = intentConfigs[intentId] || {};
  const behaviour = config.opening_behaviour || 'start_immediately';
  
  switch (behaviour) {
    case 'ask_for_document':
      addBotMessage("Please upload the document you'd like me to analyze.");
      break;
    case 'ask_clarifying_question':
      addBotMessage(getOpeningQuestion(intentId));
      break;
    case 'start_immediately':
    default:
      // Do nothing — wait for user's message
      break;
  }
};

// Helper: opening questions per intent
function getOpeningQuestion(intentId) {
  const questions = {
    contract_review: "What type of contract would you like me to review? (NDA, employment, lease, etc.)",
    legal_research: "What legal topic or question would you like me to research?",
    document_drafting: "What type of document would you like me to draft?",
    // ... etc
  };
  return questions[intentId] || "How can I help you today?";
}
```

---

### 6. Custom Instruction

**Current:** Textarea with 500-char limit. Value stored in component state only.

**What it does:** Firm-specific rules injected into the system prompt for this intent only. Example: "Always reference California Civil Code when answering..."

**To make dynamic:**

**A. Storage:** `custom_instruction TEXT` in `intent_configs` table (max 500 chars, enforced at API level).

**B. Consumption in `buildSystemPrompt()`:**
```typescript
if (intentConfig.customInstruction?.trim()) {
  systemPrompt += `\n\nFirm-Specific Instructions:\n${intentConfig.customInstruction}`;
}
```

**C. API validation:**
```typescript
// PUT /api/intent-configs/:intentId
if (body.customInstruction && body.customInstruction.length > 500) {
  return res.status(400).json({ error: 'Custom instruction exceeds 500 characters' });
}
```

---

### 7. Requires Document

**Current:** Toggle switch per intent. Value stored in component state only.

**What it does:** When ON, the bot refuses to proceed without a document upload. When OFF, the bot works with or without documents.

**To make dynamic:**

**A. Storage:** `requires_document BOOLEAN` in `intent_configs` table.

**B. Consumption in ChatView.jsx:**
```javascript
// Before sending message to LLM:
const handleSendMessage = async (message) => {
  const config = intentConfigs[activeIntent] || {};
  
  if (config.requiresDocument && !hasUploadedDocument()) {
    addBotMessage(
      "This intent requires a document to work with. " +
      "Please upload a document first using the attachment button."
    );
    return; // Don't send to LLM
  }
  
  // Proceed with normal LLM call
  await callLLM(message, context);
};
```

---

## Database Schema

```sql
-- Full schema for intent_configs
CREATE TABLE intent_configs (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  intent_id             VARCHAR(50) NOT NULL,
  
  -- Config fields (all nullable = use defaults)
  tone                  VARCHAR(20) DEFAULT 'formal',
  format_rules          JSONB DEFAULT '[]',
  keywords              JSONB DEFAULT '[]',
  opening_behaviour     VARCHAR(30) DEFAULT 'start_immediately',
  custom_instruction    TEXT DEFAULT '',
  requires_document     BOOLEAN DEFAULT false,
  system_prompt_override TEXT NULL,
  enabled               BOOLEAN DEFAULT true,
  
  -- Metadata
  updated_at            TIMESTAMP DEFAULT NOW(),
  updated_by            UUID REFERENCES users(id),
  
  UNIQUE(tenant_id, intent_id)
);

-- Index for fast tenant lookups
CREATE INDEX idx_intent_configs_tenant ON intent_configs(tenant_id);
```

---

## API Routes

```
GET    /api/intent-configs                → All configs for tenant
GET    /api/intent-configs/:intentId      → Single intent config
PUT    /api/intent-configs/:intentId      → Upsert (create or update)
DELETE /api/intent-configs/:intentId      → Reset to defaults
```

---

## Implementation Order (Recommended)

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Create `intent_configs` DB table + Prisma model | 1 day |
| 2 | Build API routes (CRUD) | 1 day |
| 3 | Wire GlobalKnowledgeBase.jsx to save/load from API | 1-2 days |
| 4 | Wire `tone` + `format_rules` + `custom_instruction` into `buildSystemPrompt()` | 1 day |
| 5 | Wire `keywords` into `detectIntent()` via ChatView | 0.5 day |
| 6 | Wire `opening_behaviour` into ChatView pill selection | 0.5 day |
| 7 | Wire `requires_document` gate into ChatView send | 0.5 day |
| 8 | Testing + QA across all intents | 1-2 days |

**Total estimate: 6-8 days**

---

## Data Flow (After Implementation)

```
SA edits intent config in Bot Persona panel
    ↓
PUT /api/intent-configs/:intentId
    ↓
Saved to intent_configs table (PostgreSQL)
    ↓
ChatView loads configs on mount: GET /api/intent-configs
    ↓
User types message → detectIntent(msg, SA_KEYWORDS)
    ↓
User selects intent pill → check opening_behaviour
    ↓
User sends message → check requires_document gate
    ↓
buildSystemPrompt() injects:
  - base system prompt (or SA override)
  - tone instruction
  - format rules
  - custom instruction
    ↓
LLM generates response with SA-configured behavior
    ↓
Response displayed with source badge
```

---

## Key Files to Modify

| File | Changes |
|------|---------|
| `backend/prisma/schema.prisma` | Add `IntentConfig` model |
| `backend/src/routes/intentConfig.ts` | New CRUD routes |
| `backend/src/routes/index.ts` | Register new routes |
| `src/pages/super-admin/GlobalKnowledgeBase.jsx` | Load/save via API instead of local state |
| `src/lib/llm-client.ts` → `buildSystemPrompt()` | Read tone, format rules, custom instruction from config |
| `src/lib/intentDetector.ts` → `detectIntent()` | Accept SA keyword overrides |
| `src/pages/chatbot/ChatView.jsx` | Fetch intent configs, wire opening behaviour + requires document |
