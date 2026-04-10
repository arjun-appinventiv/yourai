# bot-persona-scope.md --- YourAI Bot Persona & Per-Persona Response Format
**Status:** DRAFT --- Pending Ryan Hoke visual review
**Confidence:** 7/10 --- Concept confirmed verbally by Ryan (Apr 8). Not in written spec. Rollback-ready.
**Last Updated:** April 10, 2026
**Owner:** Arjun Sharma (PM, Appinventiv)
**Do not modify without:** Ryan Hoke written confirmation
**Change Log Reference:** CL-021, CL-022
**Pending Change:** PC-004, PC-005
**Sprint Impact:** NONE --- Additive 3rd tab in Knowledge Base. US-S1-013/014 preserved.

---

## WHAT THIS DOCUMENT COVERS

This scope document defines the **Bot Persona Configuration** feature --- a Super Admin screen that controls how the AI assistant "Alex" behaves across the entire platform. It covers:

1. **Operations** --- Multiple AI modes, each with its own system prompt
2. **Per-Persona Response Format** --- Different response styles per user role
3. **Message Routing Flow** --- How Alex picks the right operation + persona
4. **Fallback Chain** --- What happens when no answer is found
5. **Source Badge** --- Visual indicator on chat responses showing answer origin

---

## WHERE IT LIVES IN THE PRODUCT

- **Super Admin Panel > Knowledge Base > Tab 3: Bot Persona**
- This is a NEW 3rd tab added to the existing Knowledge Base page
- Tab 1 (Legal Content) and Tab 2 (Alex Response Templates) are unchanged
- Sprint 1 stories US-S1-013 and US-S1-014 are NOT modified

---

## 1. OPERATIONS --- MULTIPLE AI MODES

### What is an Operation?

An operation is a separate AI personality. Instead of one static system prompt for all conversations, Super Admin configures multiple operations --- each tailored to a specific task. The AI's intent classifier picks the right one automatically.

### Default Operations (5)

| # | Operation | When It Activates | Tone | Format Rules | Status |
|---|-----------|-------------------|------|-------------|--------|
| 1 | General Chat | Default --- when no specific intent is detected | Formal | Citations, Bullet Lists | ON |
| 2 | Contract Review | User uploads a contract for analysis | Formal | Citations, Bullet Lists, Risk Summary | ON |
| 3 | Legal Research | User asks a research question without a document | Neutral | Citations, Bullet Lists, Next Action | ON |
| 4 | Document Drafting | User asks to draft or generate a document | Formal | Citations, Next Action | ON |
| 5 | Compliance Check | Regulatory or policy compliance questions | Concise | Citations, Risk Summary, Next Action | OFF (disabled by default) |

### Real Example: How Operation Selection Works

**Scenario:** A user at a law firm opens the chat and types different messages. Here's what happens:

| User Message | Intent Classifier Picks | Why |
|-------------|------------------------|-----|
| "What are the indemnification clauses in the uploaded NDA?" | Contract Review | User references an uploaded document + asks about clauses |
| "What is the statute of limitations for fraud in California?" | Legal Research | No document attached, asking a general legal question |
| "Draft a non-compete clause for an employment agreement" | Document Drafting | User says "draft" --- triggering the drafting operation |
| "Is our data retention policy compliant with CCPA?" | Compliance Check (if enabled) | Mentions "compliant" + a regulation |
| "Hey Alex, good morning" | General Chat | No specific legal intent detected |

### What Super Admin Can Configure Per Operation

| Field | What It Does | Example |
|-------|-------------|---------|
| **Operation Name** | Internal label (users never see this) | "Contract Review" |
| **When This Activates** | Description read by the intent classifier to decide when to use this operation | "Activated when a user uploads a contract for analysis" |
| **System Prompt** | Hidden instruction sent to the AI at the start of every conversation in this mode | "You are Alex, a contract analysis specialist. You identify risks, flag non-standard clauses..." |
| **Tone** | Writing style for this operation | Formal, Conversational, Neutral, or Concise |
| **Format Rules** | Structural rules appended to every response | Citations, Bullet Lists, Risk Summary, Next Action |
| **Enable/Disable** | Whether this operation is available to the classifier | ON or OFF toggle |

### System Prompt Examples

**Contract Review Prompt:**
```
You are Alex, a contract analysis specialist. You identify risks, flag
non-standard clauses, and compare terms against the firm's approved playbook.
Always cite the clause number and page. Output a risk summary at the end
of every analysis.
```

**Legal Research Prompt:**
```
You are Alex, a legal research assistant. You search the knowledge base for
relevant statutes, case law, and commentary. Present findings in a structured
memo format. Always cite the source and indicate confidence level.
```

**Document Drafting Prompt:**
```
You are Alex, a legal drafting assistant. You produce professional legal
documents, clauses, and letters. Follow the firm's style guide. Always
include placeholders for client-specific details and flag any assumptions.
```

### Adding a Custom Operation

Super Admin can add custom operations. Example:

| Field | Value |
|-------|-------|
| Name | Due Diligence Review |
| When this activates | Activated when user uploads transaction documents for due diligence |
| System Prompt | "You are Alex, a due diligence specialist. You review transaction documents for risks, liabilities, and compliance issues. Organise findings by category: financial, legal, operational, regulatory." |
| Tone | Formal |
| Format Rules | Citations, Risk Summary, Next Action |

---

## 2. PER-PERSONA RESPONSE FORMAT

### What is a Persona?

During onboarding (Step 1), every user selects their role:
- Partner / Senior Attorney
- Associate / Junior Attorney
- Paralegal / Legal Assistant
- Legal Operations / IT

This role is stored in their profile and sent with every message. The AI uses it to tailor the **format** of its response --- even when the same operation is active.

### The 4 Personas and Their Default Configuration

#### Persona 1: Partner / Senior Attorney
| Setting | Value |
|---------|-------|
| **Tone** | Formal |
| **Format Rules** | Citations, Risk Summary, Next Action |
| **Prompt Modifier** | "Prioritise strategic implications, risk-reward analysis, and executive-level summaries. Assume deep legal expertise --- skip foundational explanations." |

**Why:** Partners bill $400-800/hour. They want the bottom line --- not a tutorial. They need risk assessments and strategic recommendations, not step-by-step instructions.

**Real Example --- Partner asks "What are the termination clauses?":**
> **Executive Summary:** The agreement contains 3 termination provisions. Two carry moderate risk.
>
> **Risk Assessment:**
> - HIGH: Clause 14.2 --- Termination for convenience with only 15-day notice (standard: 30 days)
> - MEDIUM: Clause 14.3 --- No cure period for material breach
> - LOW: Clause 14.1 --- Standard expiration clause
>
> **Recommended Action:** Negotiate 14.2 to 30-day notice and add 15-day cure period to 14.3.

---

#### Persona 2: Associate / Junior Attorney
| Setting | Value |
|---------|-------|
| **Tone** | Formal |
| **Format Rules** | Citations, Bullet Lists, Next Action |
| **Prompt Modifier** | "Provide detailed legal analysis with full case citations and statutory references. Include step-by-step reasoning and procedural guidance." |

**Why:** Associates (1-5 years experience) need the full picture --- detailed analysis, case law citations, and reasoning they can present to the senior attorney. They're doing the work; they need the depth.

**Real Example --- Associate asks "What are the termination clauses?":**
> **Termination Clauses Analysis:**
>
> **1. Clause 14.1 (p. 23)** --- Expiration on the stated end date. Standard provision, no issues.
>
> **2. Clause 14.2 (p. 23-24)** --- Either party may terminate for convenience with 15 days' written notice. Per UCC Section 2-309(3), reasonable notification is required. 15 days may be insufficient for complex commercial relationships. See *Leibel v. Raynor (1991)*.
>
> **3. Clause 14.3 (p. 24)** --- Termination for material breach, effective immediately upon notice. No cure period provided. Compare with ABA Model Contract Section 8.2 which recommends 30-day cure periods.
>
> **Next Step:** Draft a redline proposing 30-day notice for 14.2 and adding a 15-day cure period to 14.3.

---

#### Persona 3: Paralegal / Legal Assistant
| Setting | Value |
|---------|-------|
| **Tone** | Conversational |
| **Format Rules** | Citations, Bullet Lists |
| **Prompt Modifier** | "Use clear, accessible language. Provide checklists, document references, and actionable steps. Explain legal terms when first used." |

**Why:** Paralegals handle high volume. They need clear, practical instructions --- not academic analysis. Legal terms should be explained because they may not have a law degree.

**Real Example --- Paralegal asks "What are the termination clauses?":**
> I found 3 termination clauses in the contract. Here's a quick breakdown:
>
> - **Clause 14.1 (page 23)** --- The contract ends on the date listed. Nothing unusual here.
> - **Clause 14.2 (pages 23-24)** --- Either side can cancel with just 15 days' notice. That's shorter than the usual 30 days. ("Termination for convenience" means they don't need a reason.)
> - **Clause 14.3 (page 24)** --- If one side breaks the contract, the other can end it immediately with no chance to fix the problem. ("Cure period" means time to correct a breach --- this contract doesn't include one.)
>
> **Source:** Uploaded contract, pages 23-24.

---

#### Persona 4: Legal Operations / IT
| Setting | Value |
|---------|-------|
| **Tone** | Concise |
| **Format Rules** | Bullet Lists, Next Action |
| **Prompt Modifier** | "Focus on system configuration, data management, and operational efficiency. Use technical terminology where appropriate. Provide structured outputs." |

**Why:** Legal Ops and IT care about efficiency, not legal reasoning. They want bullet points, structured outputs, and immediate next steps.

**Real Example --- Legal Ops asks "What are the termination clauses?":**
> **3 termination clauses found:**
> - 14.1 --- Expiration (standard)
> - 14.2 --- Convenience termination, 15-day notice
> - 14.3 --- Material breach, immediate, no cure period
>
> **Next:** Flag 14.2 and 14.3 for attorney review. Tag in matter management system.

---

### How Persona Layering Works (Priority Order)

The persona does NOT replace the operation --- it layers on top:

```
Final Prompt = Operation System Prompt
             + "\n\nPersona: " + Persona Prompt Modifier
             + Persona Tone (overrides operation tone)
             + Merged Format Rules (persona rules + operation rules)
```

**Example:** Paralegal + Contract Review:

| Layer | Source | Value |
|-------|--------|-------|
| System Prompt | Contract Review operation | "You are Alex, a contract analysis specialist..." |
| Prompt Modifier | Paralegal persona | "Use clear, accessible language. Explain legal terms when first used." |
| Tone | Paralegal persona (overrides) | Conversational (replaces Contract Review's "Formal") |
| Format Rules | Merged | Citations (both), Bullet Lists (Paralegal), Risk Summary (Contract Review) |

### What Super Admin Can Configure Per Persona

| Field | What It Does | Example |
|-------|-------------|---------|
| **Prompt Modifier** | Text appended to the operation prompt for this persona | "Explain legal terms when first used" |
| **Tone Override** | Overrides the operation's default tone | Conversational |
| **Format Rules** | Persona-specific rules, merged with operation rules | Citations + Bullet Lists |
| **Enable/Disable** | If disabled, operation defaults are used instead | Toggle |
| **Reset to Defaults** | Revert to the factory default configuration | Button |

---

## 3. MESSAGE ROUTING FLOW

### The 5-Step Pipeline

Every message flows through these 5 stages (under 2 seconds total):

| Step | What Happens | Timing |
|------|-------------|--------|
| 1. User sends message | Text, document upload, or follow-up question arrives | Instant |
| 2. Intent classifier | Analyses the message, picks the best operation, scores confidence | ~50ms |
| 3. Persona layer | Loads the user's onboarding role, applies tone/format/prompt modifier | ~10ms |
| 4. Source resolution | Searches: user doc > knowledge pack > global KB > fallback | ~1-3s |
| 5. Response streamed | AI generates response with source badge, streamed via WebSocket | Streaming |

### Branching Logic

| Condition | What Happens | Example |
|-----------|-------------|---------|
| Confidence >= 0.75 | Classifier picks the operation and proceeds | User uploads a contract + asks about clauses --> Contract Review (confidence: 0.92) |
| Confidence < 0.75 | AI asks a clarifying question | User says "Review this" without context --> "Are you asking me to review the uploaded document, or do you have a general question?" |
| No answer in any source | Fallback message displayed | User asks about a topic not covered in any uploaded document or KB --> "I couldn't find a clear answer..." |

### Confidence Threshold

| Setting | Value | Status |
|---------|-------|--------|
| Threshold | 0.75 | PLACEHOLDER --- not confirmed by AI team |
| Open Question | OQ-pending | Must be confirmed before production |

**IMPORTANT:** The confidence threshold (0.75) is a visual placeholder. The actual value must be confirmed by the AI team and Ryan before this goes into production. Do not ship without sign-off.

---

## 4. FALLBACK CHAIN

When the AI searches for an answer, it follows this chain:

```
Step 1: Search user's attached document (if any)
  Found? --> Respond with source badge "Answered from: your document"
  Not found? --> Continue to Step 2

Step 2: Search selected knowledge pack (state law library)
  Found? --> Respond with source badge "Answered from: YourAI knowledge base"
  Not found? --> Continue to Step 3

Step 3: Search Global Knowledge Base (Super Admin uploaded docs)
  Found? --> Respond with source badge "Answered from: YourAI knowledge base"
  Not found? --> Continue to Step 4

Step 4: Display fallback message
  "I couldn't find a clear answer in your documents or the knowledge base.
   Could you clarify what you're looking for, or upload a relevant document?"
```

**Confirmed source:** DEC-042 (Apr 8 MOM) --- Super Admin global KB serves as fallback if no answer found in selected pack.

### Source Badge on Chat Responses

Every bot response includes a visual badge showing where the answer came from:

| Source | Badge Text | Badge Colour |
|--------|-----------|-------------|
| User's uploaded document | "Answered from: your document" | Blue pill |
| Knowledge pack or Global KB | "Answered from: YourAI knowledge base" | Green pill |
| Fallback (no source) | No badge shown | N/A |

**Real Example in Chat:**

```
User: What are the indemnification clauses in this contract?

Alex: Based on the uploaded agreement, I found 2 indemnification clauses...
      [Clause 12.1 on page 18...]
      [Clause 12.2 on page 19...]

      [Blue pill: "Answered from: your document"]
```

```
User: What does California law say about non-compete agreements?

Alex: Under California Business and Professions Code Section 16600...

      [Green pill: "Answered from: YourAI knowledge base"]
```

---

## 5. GLOBAL KNOWLEDGE DOCUMENTS

### What Are They?

Documents uploaded by the Super Admin that serve as the **platform-wide fallback knowledge base**. These are searched after the user's document and knowledge pack, but before the fallback message.

### Current Documents (Demo)

| Document | Type | Size |
|----------|------|------|
| Federal_Rules_Civil_Procedure.pdf | PDF | 4.2 MB |
| UCC_Article_2_Commentary.pdf | PDF | 2.8 MB |
| ABA_Model_Rules_Ethics.docx | DOCX | 1.1 MB |

### Who Can Manage These?

Only Super Admins. Tenants and users cannot see, upload, or remove global documents. The AI uses them as a source and cites them in responses.

### Upload Rules

- PDF and DOCX only
- Max 100MB per file
- Drag-and-drop or file browser
- Documents are indexed automatically (~2 minutes after upload)
- Broadly applicable legal references only (not firm-specific)

---

## 6. FALLBACK MESSAGE

### What Is It?

The message shown to the user when the AI cannot find an answer anywhere --- user doc, knowledge pack, or global KB. This is the last resort.

### Default Message

> "I couldn't find a clear answer in your documents or the knowledge base. Could you clarify what you're looking for, or upload a relevant document?"

### Configurable?

Yes --- Super Admin can edit this message from the Bot Persona tab. Changes apply from the next session only (active conversations keep the previous message).

---

## 7. WHAT SUPER ADMIN SEES (UI OVERVIEW)

The Bot Persona tab contains:

### Left Column (2/3 width)
1. **Info Banner** --- Explains what Bot Persona is
2. **Status Bar** --- Version number, last saved time, Save/Discard buttons
3. **Operations** --- Expandable accordion cards (system prompt, tone, format rules per operation)
4. **Fallback Message** --- Single text input
5. **Per-Persona Response Format** --- Expandable accordion cards (prompt modifier, tone override, format rules per persona)

### Right Column (1/3 width)
1. **Global Knowledge Documents** --- Upload zone + document list
2. **Message Routing Flow** --- Visual pipeline diagram with branching

### Warning Banner (full width)
> "Changes apply from the next session --- active conversations will finish with the current persona."

---

## 8. WHAT IS NOT IN SCOPE

| Item | Why | When |
|------|-----|------|
| Attorney Persona Filter | Feasibility check in progress with AI team (OQ-005) | TBD |
| Per-tenant persona override | This is global only --- tenants cannot customise | Phase 2 |
| A/B testing of personas | No testing infrastructure | Phase 2 |
| Persona analytics (which persona gets best ratings) | Not in scope | Phase 2 |
| Custom persona roles beyond the 4 onboarding roles | Fixed to onboarding Step 1 | Phase 2 |
| Intent classifier training UI | Classifier is pre-trained, not configurable by Super Admin | Phase 2 |
| Confidence threshold configuration in UI | Hardcoded, confirmed by AI team only | Phase 2 |

---

## 9. DEPENDENCIES & OPEN QUESTIONS

| ID | Question | Status | Blocks |
|----|----------|--------|--------|
| OQ-004 | Knowledge pack strategy (persistent vs per-conversation) | BLOCKING | Source resolution step in the pipeline |
| OQ-005 | Attorney persona filter feasibility | Not blocking Sprint 1 | Phase 1 AI features |
| OQ-pending | Confidence threshold value (0.75 is placeholder) | Not confirmed | Production deployment |
| OQ-pending | Intent classifier model selection | Not confirmed | AI team decision |

---

## 10. DECISIONS REFERENCED

| Decision | Source | Date |
|----------|--------|------|
| DEC-042 | Global KB serves as fallback if no answer in selected pack | Apr 8 MOM |
| DEC-043 | Manual mapping for state-to-document assignment | Apr 8 MOM |
| DEC-060 | Skip button removed from all onboarding steps | Pre-Apr 8 |
| DEC-061 | Onboarding Step 5 (Jurisdiction) is new | Pre-Apr 8 |
| DEC-062 | Onboarding profile saved to localStorage key: yourai_user_profile | Pre-Apr 8 |

---

## 11. ROLLBACK PLAN

If Ryan rejects the Bot Persona feature:

1. Remove Tab 3 from GlobalKnowledgeBase.jsx
2. Remove source badge from ChatView.jsx
3. Backup files exist: `GlobalKnowledgeBase.backup.jsx`, `ChatView.backup.jsx`
4. Remove CL-021, CL-022 from change-log.md (backup exists)
5. No Sprint 1 stories are affected --- US-S1-013/014 are untouched
6. No database changes --- all state is in-memory / localStorage

**Estimated rollback time:** 10 minutes.

---

## 12. DONE CRITERIA

- [ ] Bot Persona tab renders as 3rd tab in Knowledge Base
- [ ] 5 default operations load with system prompts, tone, and format rules
- [ ] Operations are expandable/collapsible accordion cards
- [ ] Add/Edit/Delete/Enable/Disable operations works
- [ ] 4 persona format cards render with correct defaults
- [ ] Persona tone, format rules, and prompt modifier are editable
- [ ] Enable/Disable/Reset per persona works
- [ ] Fallback message is editable
- [ ] Global Knowledge Documents can be uploaded and removed
- [ ] Message Routing Flow diagram renders with 5 steps + branching
- [ ] Source badge appears on bot messages in Chat View
- [ ] Save/Discard buttons track dirty state correctly
- [ ] Warning banner shows "changes apply from next session"
- [ ] `npx vite build` passes with no errors
- [ ] Tab 1 (Legal Content) and Tab 2 (Alex Response Templates) are unchanged
- [ ] US-S1-013 and US-S1-014 are not modified
