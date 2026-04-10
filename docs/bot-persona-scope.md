# Bot Persona & Intelligent Response System — Scope Document

**Status:** DRAFT — Pending Ryan Hoke visual review
**Last Updated:** April 10, 2026
**Owner:** Arjun Sharma (PM, Appinventiv)
**Sprint Impact:** NONE — Additive 3rd tab. Existing features untouched.

---

## THE PROBLEM WE ARE SOLVING

Today, every user gets the **exact same AI response** regardless of who they are. A Partner with 20 years of experience gets the same level of detail as a Paralegal who needs legal terms explained. A user uploading a contract gets the same generic prompt as someone asking a billing question.

**This feature solves 3 problems:**

| # | Problem | Solution |
|---|---------|----------|
| 1 | One static AI prompt for all tasks | **Operations** — separate AI modes for contract review, research, drafting, etc. |
| 2 | Same response style for all users | **Per-Persona Format** — Partners get executive summaries, Paralegals get plain-English checklists |
| 3 | User doesn't know where the answer came from | **Source Badge** — blue pill for "your document", green pill for "knowledge base" |

---

## HOW IT WORKS — THE BIG PICTURE

When any user sends a message, 3 things happen behind the scenes:

```
STEP 1 — WHAT is the user asking?
         The AI figures out what kind of task this is.
         "Upload a contract for review" → Contract Review mode
         "What's the statute of limitations?" → Legal Research mode

STEP 2 — WHO is asking?
         The AI checks which role the user selected during onboarding.
         Partner → executive summary, risk scores, strategic advice
         Paralegal → plain English, checklists, legal terms explained

STEP 3 — WHERE is the answer?
         The AI searches for the answer in order:
         User's document → Knowledge Pack → Global KB → "I don't know"
```

**All 3 steps happen in under 2 seconds. The user just sees the answer.**

---

---

# PART 1: OPERATIONS (What is the user asking?)

---

## What is an Operation?

An operation is a **separate AI mode** with its own instructions. Think of it like switching between different expert assistants — one specialises in contracts, another in research, another in drafting. The AI picks the right one automatically.

## The 5 Default Operations

### Operation 1: General Chat (Default)

> **When it activates:** No specific legal task detected — everyday Q&A
> **Tone:** Formal
> **What the AI is told:**
> *"You are Alex, a legal AI assistant. You help attorneys and paralegals analyse documents, research legal questions, and draft outputs. You are precise, professional, and always cite your sources."*

**Example conversation:**

| | |
|---|---|
| **User says:** | "Hey Alex, what can you help me with?" |
| **AI responds as:** | General Chat mode — gives an overview of capabilities |

---

### Operation 2: Contract Review

> **When it activates:** User uploads a contract or asks about clauses, terms, obligations
> **Tone:** Formal
> **What the AI is told:**
> *"You are Alex, a contract analysis specialist. You identify risks, flag non-standard clauses, and compare terms against the firm's approved playbook. Always cite the clause number and page. Output a risk summary at the end."*

**Example conversation:**

| | |
|---|---|
| **User says:** | "Review the indemnification section of this NDA" *(contract attached)* |
| **AI activates:** | Contract Review mode |
| **AI responds with:** | Clause-by-clause analysis, page citations, risk levels (High/Medium/Low), and recommended next steps |

**Why a separate mode?** A generic prompt would just summarise the document. The Contract Review prompt specifically instructs the AI to identify risks, compare against the firm's playbook, and cite clause numbers — things you'd never want in a casual chat response.

---

### Operation 3: Legal Research

> **When it activates:** User asks a legal question without attaching a document
> **Tone:** Neutral
> **What the AI is told:**
> *"You are Alex, a legal research assistant. Search the knowledge base for relevant statutes, case law, and commentary. Present findings in a structured memo format. Always cite the source and indicate confidence level."*

**Example conversation:**

| | |
|---|---|
| **User says:** | "What is the statute of limitations for fraud in California?" |
| **AI activates:** | Legal Research mode |
| **AI responds with:** | Structured memo: statute reference, time limits, exceptions, relevant case law, confidence level |

---

### Operation 4: Document Drafting

> **When it activates:** User asks to draft, generate, or write a document
> **Tone:** Formal
> **What the AI is told:**
> *"You are Alex, a legal drafting assistant. Produce professional legal documents, clauses, and letters. Follow the firm's style guide. Include placeholders for client-specific details and flag any assumptions."*

**Example conversation:**

| | |
|---|---|
| **User says:** | "Draft a non-compete clause for an employment agreement in Texas" |
| **AI activates:** | Document Drafting mode |
| **AI responds with:** | Formatted clause with placeholders like [EMPLOYEE NAME], [DURATION], plus a note flagging that Texas has specific enforceability requirements |

---

### Operation 5: Compliance Check (OFF by default)

> **When it activates:** User asks about regulatory compliance or policy violations
> **Tone:** Concise
> **What the AI is told:**
> *"You are Alex, a compliance analysis assistant. Check uploaded documents and policies against regulatory frameworks. Include a risk level for each finding and recommend corrective actions."*

**Example conversation:**

| | |
|---|---|
| **User says:** | "Is our data retention policy compliant with CCPA?" |
| **AI activates:** | Compliance Check mode |
| **AI responds with:** | Bullet-point checklist of compliant/non-compliant items, risk level per item, corrective actions |

**Note:** This operation is disabled by default. Super Admin can enable it from the Bot Persona tab.

---

## How Does the AI Pick the Right Operation?

The AI runs an **intent classifier** — a lightweight model that reads the user's message and scores which operation fits best. This takes ~50ms (the user doesn't notice).

### Real Examples of Intent Classification

| User Message | Operation Selected | Why |
|-------------|-------------------|-----|
| "What are the indemnification clauses in the uploaded NDA?" | Contract Review | References uploaded document + asks about clauses |
| "What is the statute of limitations for fraud in California?" | Legal Research | No document, asking a legal question |
| "Draft a non-compete clause for an employment agreement" | Document Drafting | Says "draft" — wants content generated |
| "Is our data retention policy compliant with CCPA?" | Compliance Check | Mentions "compliant" + a regulation |
| "Hey Alex, good morning" | General Chat | No specific legal intent |
| "Compare clause 7 of my contract against your playbook" | Contract Review | References a contract + comparison request |
| "Summarise the key holdings in Roe v. Wade" | Legal Research | Asking about case law, no doc attached |
| "Write a demand letter for breach of contract" | Document Drafting | Says "write" — wants content generated |

### What If the AI Isn't Sure?

If the classifier confidence is **below 0.75**, the AI doesn't guess. It asks:

| | |
|---|---|
| **User says:** | "Review this" *(ambiguous — no context)* |
| **AI says:** | "Are you asking me to review the uploaded document for risks, or do you have a general legal question I can research?" |
| **User clarifies:** | "Review the contract I uploaded" |
| **AI activates:** | Contract Review mode |

---

## Super Admin Controls for Operations

Super Admin can manage all operations from the Bot Persona tab:

| Action | What It Does | Example |
|--------|-------------|---------|
| **Edit system prompt** | Change the hidden instructions the AI follows | Change Contract Review to also check for IP assignment clauses |
| **Change tone** | Switch between Formal, Conversational, Neutral, Concise | Switch Legal Research from Neutral to Formal |
| **Toggle format rules** | Add/remove structural rules | Add "Risk Summary" to General Chat |
| **Enable / Disable** | Turn an operation on or off | Disable Compliance Check until the firm is ready |
| **Delete** | Remove a custom operation entirely | Delete an operation that's no longer needed |
| **Add new operation** | Create a custom AI mode | Add "Due Diligence Review" for M&A transactions |

### Example: Adding a Custom Operation

A firm does a lot of M&A work. Super Admin adds:

| Field | Value |
|-------|-------|
| **Name** | Due Diligence Review |
| **When this activates** | Activated when user uploads transaction documents for due diligence analysis |
| **System Prompt** | "You are Alex, a due diligence specialist. Review transaction documents for risks, liabilities, and compliance issues. Organise findings by category: financial, legal, operational, regulatory. Flag any missing documents." |
| **Tone** | Formal |
| **Format Rules** | Always cite source, Risk summary, Next action |

Now when a user uploads transaction documents and says "Run due diligence on these acquisition docs", the AI activates this custom mode instead of the generic Contract Review.

---

---

# PART 2: PER-PERSONA RESPONSE FORMAT (Who is asking?)

---

## What is a Persona?

During onboarding (Step 1), every user selects their role:

| Onboarding Selection | Who They Are | What They Need |
|---------------------|-------------|----------------|
| Partner / Senior Attorney | Decision-maker, 20+ years, bills $400-800/hr | Bottom line. Risk scores. Strategic advice. No tutorials. |
| Associate / Junior Attorney | Practitioner, 1-5 years, handles the analysis | Full detail. Case citations. Step-by-step reasoning. |
| Paralegal / Legal Assistant | Support staff, high volume, may not have law degree | Plain English. Checklists. Legal terms explained. |
| Legal Operations / IT | System admin, tech-focused | Bullet points. Structured data. Immediate next steps. |

**The persona doesn't change WHAT the AI looks for — it changes HOW the AI presents the answer.**

---

## The Same Question, 4 Different Answers

All 4 users upload the **same contract** and ask the **same question:**

> **"What are the termination clauses in this contract?"**

The AI activates **Contract Review** for all 4. But the response format is completely different.

---

### Partner / Senior Attorney Gets This:

> **Executive Summary:** 3 termination provisions found. Two carry moderate risk.
>
> **Risk Assessment:**
> - :red_circle: **HIGH — Clause 14.2 (p. 23):** Termination for convenience with only 15-day notice. Industry standard is 30 days. The counterparty can exit too quickly.
> - :orange_circle: **MEDIUM — Clause 14.3 (p. 24):** No cure period for material breach. The other side can terminate immediately without giving you a chance to fix the issue.
> - :green_circle: **LOW — Clause 14.1 (p. 23):** Standard expiration on the stated end date. No concerns.
>
> **Recommended Action:** Negotiate 14.2 to 30-day notice. Add a 15-day cure period to 14.3 before signing.

**Why this format?** Partners don't want to read through detailed clause analysis. They want: what's risky, how risky, and what to do about it. The response leads with the executive summary and ends with a clear recommendation.

---

### Associate / Junior Attorney Gets This:

> **Termination Clauses — Detailed Analysis:**
>
> **1. Clause 14.1 (p. 23) — Expiration**
> Standard expiration on the stated end date. This is a boilerplate provision with no material risk. No action required.
>
> **2. Clause 14.2 (p. 23-24) — Termination for Convenience**
> Either party may terminate for convenience with 15 days' written notice. Per UCC Section 2-309(3), "reasonable notification" is required for contract termination. Courts have generally held that 15 days is insufficient for complex commercial relationships. See *Leibel v. Raynor Manufacturing Co.* (1991) — court found 10-day notice unreasonable for a 20-year distribution relationship. ABA Model Contract Section 8.1 recommends a minimum of 30 days.
>
> **3. Clause 14.3 (p. 24) — Termination for Material Breach**
> Termination for material breach is effective immediately upon written notice. No cure period is provided. Compare with ABA Model Contract Section 8.2, which recommends a 30-day cure period. Without a cure period, a minor breach (e.g., late payment by 1 day) could trigger immediate termination.
>
> **Next Step:** Draft a redline proposing 30-day notice for 14.2 and adding a 15-day cure period to 14.3. Cite *Leibel v. Raynor* as supporting authority.

**Why this format?** Associates need the full reasoning — case citations, statutory references, comparison to standards — because they're building the argument. The senior attorney will review their work and expects this level of depth.

---

### Paralegal / Legal Assistant Gets This:

> I found 3 termination clauses in the contract. Here's a quick breakdown:
>
> - **Clause 14.1 (page 23)** — The contract ends on the date listed. Nothing unusual here.
>
> - :warning: **Clause 14.2 (pages 23-24)** — Either side can cancel with just 15 days' notice. That's shorter than the usual 30 days. *("Termination for convenience" means they don't need to give a reason — they can just walk away.)*
>
> - :warning: **Clause 14.3 (page 24)** — If one side breaks the contract, the other can end it immediately — no chance to fix the problem first. *("Cure period" means the time you'd normally get to correct a mistake before the other side can cancel. This contract doesn't include one.)*
>
> **Source:** Uploaded contract, pages 23-24.

**Why this format?** Paralegals may not have a law degree. Legal terms like "termination for convenience" and "cure period" are explained in parentheses the first time they appear. The tone is conversational — "nothing unusual here" instead of "no material risk." Bullet points keep it scannable for high-volume work.

---

### Legal Operations / IT Gets This:

> **3 termination clauses found:**
> - 14.1 — Expiration on stated date (standard, no risk)
> - 14.2 — Convenience termination, 15-day notice (flag: below 30-day standard)
> - 14.3 — Material breach, immediate termination, no cure period (flag: no remediation window)
>
> **Next:** Flag 14.2 and 14.3 for attorney review. Tag in matter management system.

**Why this format?** Legal Ops cares about efficiency. They want the structured data — clause numbers, risk flags, and what to do next. No case citations, no legal reasoning, no explanations. Just the facts and the action item.

---

## How Persona Layering Works

The persona does **not replace** the operation. It **layers on top**.

### Example: Paralegal + Contract Review

```
LAYER 1 — Operation System Prompt (from Contract Review):
"You are Alex, a contract analysis specialist. You identify risks,
flag non-standard clauses, and compare terms against the firm's
approved playbook. Always cite the clause number and page."

                              +

LAYER 2 — Persona Prompt Modifier (from Paralegal):
"Use clear, accessible language. Provide checklists and actionable
steps. Explain legal terms when first used."

                              +

LAYER 3 — Persona Tone Override:
Conversational (overrides Contract Review's default "Formal")

                              +

LAYER 4 — Merged Format Rules:
Citations (from both) + Bullet Lists (from Paralegal) + Risk Summary (from Contract Review)

                              =

FINAL RESULT:
A contract specialist who speaks in plain English, explains jargon,
uses bullet points, but still cites every clause and includes risk scores.
```

### Another Example: Partner + Legal Research

```
LAYER 1 — Operation: "You are Alex, a legal research assistant. Search the
knowledge base for relevant statutes, case law, and commentary."

LAYER 2 — Persona: "Prioritise strategic implications and executive-level
summaries. Skip foundational explanations."

LAYER 3 — Tone: Formal (same as operation default — no override needed)

LAYER 4 — Rules: Citations + Risk Summary + Next Action (from Partner)
           merged with Citations + Bullet Lists + Next Action (from Research)
           = Citations, Risk Summary, Bullet Lists, Next Action

FINAL RESULT:
A research assistant who leads with strategic implications, skips the
basics, and ends with a risk assessment + recommended action.
```

---

## Super Admin Controls for Personas

| Action | What It Does | Example |
|--------|-------------|---------|
| **Edit prompt modifier** | Change what gets appended to the operation prompt for this role | Add "Always include a timeline" to Associate persona |
| **Change tone** | Override the operation's default tone for this role | Switch Partner from Formal to Concise |
| **Toggle format rules** | Add/remove rules for this role | Add "Risk Summary" to Paralegal so they also see risk scores |
| **Enable / Disable** | If disabled, operation defaults are used (no persona layering) | Disable Legal Ops persona — they get the same response as everyone |
| **Reset to defaults** | Revert all changes back to factory settings | Reset Partner after experimenting with settings |

---

---

# PART 3: SOURCE RESOLUTION (Where is the answer?)

---

## The Fallback Chain

After the AI knows WHAT to look for (operation) and HOW to present it (persona), it needs to find the answer. It searches 4 sources **in order** — each step only triggers if the previous one found nothing.

### Step-by-Step with Real Examples

---

**STEP 1 — Search the user's attached document**

| | |
|---|---|
| **User asks:** | "What are the indemnification clauses in this NDA?" *(NDA attached)* |
| **AI searches:** | The uploaded NDA file |
| **Answer found?** | YES — Clauses 12.1 and 12.2 on pages 18-19 |
| **Source badge:** | :blue_square: **"Answered from: your document"** |

*The AI stops here. It doesn't search the knowledge base because it already found the answer.*

---

**STEP 2 — Search the selected Knowledge Pack** (only if Step 1 found nothing)

| | |
|---|---|
| **User asks:** | "What does California law say about non-compete agreements?" *(no document attached)* |
| **AI searches:** | User's document → nothing found. Searches California State Law Library. |
| **Answer found?** | YES — California Business and Professions Code Section 16600 |
| **Source badge:** | :green_square: **"Answered from: YourAI knowledge base"** |

---

**STEP 3 — Search the Global Knowledge Base** (only if Steps 1 and 2 found nothing)

| | |
|---|---|
| **User asks:** | "What are the federal rules on discovery timelines?" |
| **AI searches:** | User's document → nothing. Knowledge Pack → nothing. Searches Global KB (Federal Rules of Civil Procedure uploaded by Super Admin). |
| **Answer found?** | YES — Rule 26(f), 30-day timeline |
| **Source badge:** | :green_square: **"Answered from: YourAI knowledge base"** |

---

**STEP 4 — Fallback message** (only if Steps 1, 2, and 3 found nothing)

| | |
|---|---|
| **User asks:** | "What was the outcome of the Smith v. Jones case from last week?" |
| **AI searches:** | User's document → nothing. Knowledge Pack → nothing. Global KB → nothing. |
| **Answer found?** | NO |
| **AI responds:** | *"I couldn't find a clear answer in your documents or the knowledge base. Could you clarify what you're looking for, or upload a relevant document?"* |
| **Source badge:** | No badge shown |

---

## Source Badge in Chat

Every bot response shows a small coloured pill telling the user where the answer came from:

| Source | Badge | Colour | When It Appears |
|--------|-------|--------|-----------------|
| User's uploaded document | "Answered from: your document" | Blue | AI found the answer in the document the user attached to this conversation |
| Knowledge Pack or Global KB | "Answered from: YourAI knowledge base" | Green | AI found the answer in the state law library or Super Admin's global documents |
| No source found | No badge | — | Fallback message shown instead |

### What it looks like in the chat:

```
┌─────────────────────────────────────────────────────────┐
│  Alex                                                    │
│                                                          │
│  Based on the uploaded NDA, there are 2 indemnification │
│  clauses:                                                │
│                                                          │
│  1. Clause 12.1 (page 18) — Mutual indemnification...   │
│  2. Clause 12.2 (page 19) — Third-party claims...       │
│                                                          │
│  ┌──────────────────────────────────────┐                │
│  │ 🔵 Answered from: your document      │                │
│  └──────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────┐
│  Alex                                                    │
│                                                          │
│  Under California Business and Professions Code          │
│  Section 16600, non-compete agreements are generally     │
│  void and unenforceable...                               │
│                                                          │
│  ┌──────────────────────────────────────────┐            │
│  │ 🟢 Answered from: YourAI knowledge base  │            │
│  └──────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

---

---

# PART 4: GLOBAL KNOWLEDGE DOCUMENTS

---

## What Are They?

Documents uploaded by the Super Admin that every tenant's AI can access. These are the **platform-wide safety net** — if the user's own documents and knowledge pack don't have the answer, the AI searches these before giving up.

### Example Documents

| Document | Why It's Here |
|----------|--------------|
| Federal_Rules_Civil_Procedure.pdf | Every litigator needs access to federal court rules |
| UCC_Article_2_Commentary.pdf | Foundational commercial law reference |
| ABA_Model_Rules_Ethics.docx | Ethics rules that apply to all attorneys |

### Rules

| Rule | Detail |
|------|--------|
| Who can upload? | Super Admins only |
| Who benefits? | All tenants (AI searches these as fallback) |
| Can users see these documents? | No — the AI cites them, but users can't browse the list |
| File types | PDF and DOCX only |
| Max size | 100MB per file |
| Indexing time | ~2 minutes after upload |
| What to upload | Broadly applicable legal references — not firm-specific content |

---

---

# PART 5: COMPLETE END-TO-END EXAMPLES

---

## Example A: Partner Uploads a Contract

```
1. Sarah Chen (Partner, 22 years experience) opens YourAI chat
2. She uploads "AcmeCorp_ServiceAgreement_v3.pdf"
3. She types: "Flag any risky clauses in this agreement"

BEHIND THE SCENES:
├─ Intent Classifier → Contract Review (confidence: 0.94)
├─ Persona Layer → Partner / Senior Attorney
│   ├─ Tone: Formal
│   ├─ Modifier: "Prioritise strategic implications, skip foundational explanations"
│   └─ Rules: Citations + Risk Summary + Next Action
├─ Source Resolution → Found in uploaded document (Step 1)
└─ Source Badge → Blue: "Answered from: your document"

SARAH SEES:
Executive Summary: 4 clauses flagged across 3 risk levels.

🔴 HIGH — Clause 8.3 (p. 12): Unlimited liability for the service provider.
   No liability cap exposes the firm to uncapped damages.

🔴 HIGH — Clause 15.1 (p. 28): Automatic renewal with 90-day opt-out.
   Missing the window locks you into another year.

🟠 MEDIUM — Clause 11.2 (p. 20): Broad IP assignment covering "all work product."
   Could include pre-existing IP not related to this engagement.

🟢 LOW — Clause 3.4 (p. 6): Payment terms NET-45.
   Standard, no concern.

Recommended Action: Negotiate a liability cap in 8.3, reduce auto-renewal
opt-out to 30 days in 15.1, and narrow IP scope in 11.2.

🔵 Answered from: your document
```

---

## Example B: Paralegal Asks a Research Question

```
1. Maria Garcia (Paralegal, 3 years experience) opens YourAI chat
2. She has the California State Law Library selected as her knowledge pack
3. She types: "Can an employer enforce a non-compete in California?"

BEHIND THE SCENES:
├─ Intent Classifier → Legal Research (confidence: 0.88)
├─ Persona Layer → Paralegal / Legal Assistant
│   ├─ Tone: Conversational
│   ├─ Modifier: "Use clear language. Explain legal terms when first used."
│   └─ Rules: Citations + Bullet Lists
├─ Source Resolution → Not in user doc (none attached) → Found in Knowledge Pack (Step 2)
└─ Source Badge → Green: "Answered from: YourAI knowledge base"

MARIA SEES:
Short answer: No — California generally does not allow non-compete agreements.

Here's why:
- California Business and Professions Code Section 16600 says that any
  contract that stops someone from working in their profession is "void"
  (meaning it has no legal power).

- "Non-compete agreement" means a contract clause that says you can't
  work for a competitor or start a competing business after you leave a job.

- There are only a few narrow exceptions:
  • When someone sells a business (the seller can agree not to compete)
  • When a partner leaves a partnership
  • When a member leaves an LLC

- As of January 1, 2024, California Assembly Bill 1076 made it even
  stricter — employers can't even try to enforce out-of-state non-competes
  against California employees.

Source: California Business and Professions Code §16600, AB 1076 (2024).

🟢 Answered from: YourAI knowledge base
```

---

## Example C: Associate Gets Low Confidence

```
1. James Park (Associate, 2 years) opens chat
2. He types: "Review this" (no document attached, no context)

BEHIND THE SCENES:
├─ Intent Classifier → Contract Review (confidence: 0.41) ← Below 0.75!
├─ AI does NOT proceed. Asks for clarification.

JAMES SEES:
I'd be happy to help you review something. Could you clarify:
- Are you asking me to review an uploaded document for risks?
  (If so, please attach the document.)
- Or do you have a general legal question I can research?

JAMES RESPONDS: "I want to review the lease agreement I'm about to upload"
JAMES UPLOADS: CommercialLease_Draft.pdf

BEHIND THE SCENES (second attempt):
├─ Intent Classifier → Contract Review (confidence: 0.96)
├─ Persona Layer → Associate / Junior Attorney
└─ Proceeds normally with detailed clause analysis and case citations
```

---

## Example D: No Answer Found Anywhere

```
1. David Lee (Partner) types: "What was the ruling in the Thompson
   hearing last Tuesday?"

BEHIND THE SCENES:
├─ Intent Classifier → Legal Research (confidence: 0.82)
├─ Source Resolution:
│   ├─ Step 1: User document → None attached
│   ├─ Step 2: Knowledge Pack → Not found (internal hearing, not in any KB)
│   ├─ Step 3: Global KB → Not found (not a published ruling)
│   └─ Step 4: FALLBACK
└─ No source badge

DAVID SEES:
I couldn't find a clear answer in your documents or the knowledge base.
The Thompson hearing may not be in our indexed sources yet. Could you:
- Upload the hearing transcript or ruling document, or
- Clarify the case name or court so I can search more specifically?
```

---

---

# PART 6: WHERE THIS LIVES IN THE UI

---

## Super Admin > Knowledge Base > Tab 3: Bot Persona

The Bot Persona tab has two columns:

### Left Side (2/3 width)

| Section | What It Contains |
|---------|-----------------|
| **Info Banner** | Blue banner explaining what Bot Persona is |
| **Status Bar** | Version number, last saved time, Save / Discard buttons |
| **Operations** | Expandable cards — click to edit system prompt, tone, format rules |
| **Fallback Message** | Single text input for the "I don't know" message |
| **Per-Persona Format** | 4 expandable cards — one per onboarding role, each with prompt modifier, tone, format rules |

### Right Side (1/3 width)

| Section | What It Contains |
|---------|-----------------|
| **Global Knowledge Documents** | Drag-and-drop upload zone + list of uploaded files |
| **Message Routing Flow** | Visual diagram showing the 5-step pipeline |

### Key UI Details

- Every section has an **info button (i)** with detailed explanation
- **Save** button only enables when changes are made
- **Discard** button reverts all changes to last saved state
- Yellow warning: *"Changes apply from the next session — active conversations keep the current persona"*
- Operations and Personas are **accordion cards** — click to expand/collapse
- Each operation shows a coloured **ON/OFF** badge and **tone** badge in the collapsed header

---

---

# PART 7: CONFIGURATION REFERENCE

---

## Tone Options

| Tone | Description | Best For |
|------|-------------|----------|
| **Formal** | Professional language, full sentences, structured paragraphs | Partners, Associates, Contract Review |
| **Conversational** | Friendly, approachable, simpler language | Paralegals, General Chat |
| **Neutral** | Balanced — neither overly formal nor casual | Legal Research |
| **Concise** | Shortest possible answers, bullet points preferred | Legal Ops, Compliance Check |

## Format Rules

| Rule | What the AI Does | Example |
|------|-----------------|---------|
| **Always cite source** | Includes document name, page number, and clause reference | "Per Clause 12.1 (page 18) of the uploaded NDA..." |
| **Bullet lists** | Uses bullet points for lists of 3+ items | Renders findings as bullets instead of paragraphs |
| **Risk summary** | Ends every response with High/Medium/Low risk assessment | "Risk Assessment: HIGH — Clause 8.3 has no liability cap" |
| **Next action** | Ends every response with a suggested next step | "Next Step: Draft a redline proposing 30-day notice for Clause 14.2" |

---

---

# PART 8: WHAT IS NOT IN SCOPE

---

| Item | Why Not | When |
|------|---------|------|
| Per-tenant persona override | This is global (Super Admin only) — tenants cannot customise their own persona | Phase 2 |
| Attorney persona filter | Feasibility check in progress with AI team (OQ-005) | TBD |
| A/B testing of personas | No testing infrastructure | Phase 2 |
| Custom persona roles beyond the 4 | Fixed to onboarding Step 1 selections | Phase 2 |
| Intent classifier training by Super Admin | Classifier is pre-trained, not configurable | Phase 2 |
| Confidence threshold config in UI | Hardcoded at 0.75 (placeholder — needs AI team sign-off) | Phase 2 |
| Persona analytics | No data on which persona gets best user ratings | Phase 2 |

---

---

# PART 9: OPEN QUESTIONS & DEPENDENCIES

---

| ID | Question | Status | Impact |
|----|----------|--------|--------|
| OQ-004 | Knowledge pack: persistent from onboarding or per-conversation? | :red_circle: BLOCKING | Affects Step 2 of the fallback chain |
| OQ-005 | Attorney persona filter feasibility | :yellow_circle: Not blocking Sprint 1 | Phase 1 AI features |
| OQ-pending | Confidence threshold (0.75 is a placeholder) | :yellow_circle: Not confirmed | Must be confirmed before production |
| OQ-pending | Intent classifier model selection | :yellow_circle: Not confirmed | AI team decision |

---

## Rollback Plan

If Ryan rejects this feature, rollback takes **10 minutes**:
- Remove Tab 3 from Knowledge Base page
- Remove source badge from Chat View
- Backup files exist for both files
- No database changes — all state is in-memory
- Sprint 1 stories US-S1-013 and US-S1-014 are completely untouched

---

**Document version:** 1.0
**Change Log:** CL-021 (Bot Persona tab), CL-022 (Source badge)
**Pending Changes:** PC-004, PC-005
**Visual Flow:** Available at `/bot-persona-flow.html`
