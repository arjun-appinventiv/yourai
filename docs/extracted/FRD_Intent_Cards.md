# FRD — Intent Response Cards

**Version:** 1.0
**Date:** 2026-04-28
**Author:** Arjun Sharma, Product
**Status:** Draft
**Related:** `FRD_Intent_System.docx`, `FRD_Workflow_Operations.docx`, `.claude-context/card-empty-state-pattern.md`

---

## 1. Document overview

### 1.1 Purpose

This document specifies the functional behaviour of the **Intent Response Cards** module in YourAI — the eight structured visual response formats that render in the chat thread when an attorney's message is classified as a "card-eligible" intent. Each card is a domain-shaped surface for a specific legal task (document summary, clause comparison, case brief, legal research, risk memo, clause analysis, timeline, find document) so attorneys read structured outputs at a glance rather than scanning unstructured prose.

### 1.2 Audience

Product managers, QA engineers, strategists, and content authors who write the prompts that drive these cards.

### 1.3 Scope

**In scope:**
- The eight intent response cards (Document Summarisation, Clause Comparison, Case Law Analysis, Legal Research, Risk Assessment, Clause Analysis, Timeline Extraction, Find Document)
- The shared chrome (header, body, footer) every card uses
- The empty-state behaviour every card shares
- Source attribution conventions across cards
- The decision logic for "render a card" vs "render prose"
- The Find Document client-only special case
- Keyboard, screen-reader, and responsive behaviour

**Out of scope:**
- The intent selector dropdown and the suggestion-banner machinery — covered by `FRD_Intent_System.docx`.
- Auto-switch keyword detection — covered by `FRD_Intent_System.docx` §4.
- Workflow operation outputs (multi-step pipelines) — covered by `FRD_Workflow_Operations.docx`.
- The Bot Persona editor that customises card-driving prompts — covered by `bot-persona-scope.md`.
- The Vault and Knowledge Pack panels and their internals — covered by future FRDs.
- Server-side prompt construction and AI guardrails — covered by `FRD_Intent_System.docx` §6.

### 1.4 Glossary

- **Intent** — a classification of the attorney's task (Document Summarisation, Risk Assessment, etc.). Determines which card renders the response.
- **Card** — a structured visual response surface in the chat thread that renders the AI's answer. One of eight types.
- **Active intent** — the intent currently selected for the next message. Either chosen explicitly via the dropdown pill or set automatically by the auto-switch detector.
- **Card-eligible intent** — an intent that has a card type associated with it. Eight intents are card-eligible; others render as prose.
- **Source pill** — small uppercase label in the card header that declares the data source: *Document*, *Knowledge Base*, *Workspace*, or *Vault*.
- **Empty state** — the friendly fallback rendering each card shows when the user activated a card-eligible intent but supplied no document or context.
- **Chrome** — the shared outer structure (header, body wrapper, footer) common to every card; varies only in the body content.
- **Accent stripe** — thin coloured band at the top of every card. Per-intent colour acts as a visual cue (gold = summary, navy = comparison, etc.).
- **Auto-switch** — the behaviour by which the system detects a typing pattern and automatically swaps the active intent from General Chat to a more specific intent.
- **Vault** — the user's personal document library, scoped to the user's account.
- **Knowledge Base** — the global YourAI legal knowledge corpus, curated by Super Admin.
- **Workspace** — a per-matter document folder that scopes chat to a specific case or client engagement.
- **Sibling intent** — another card-eligible intent that the user might have meant; surfaced from the empty state to redirect attention.
- **Verdict pill** — within the Comparison card, the labelled chip (`↑ More favourable` / `↓ Less favourable` / `— Absent`) that summarises a clause's relative standing between two documents.
- **Severity** — a categorical risk rating (`high` / `medium` / `low`) used inside Risk and Clause cards.

### 1.5 Document control summary

| Field | Value |
|---|---|
| Version | 1.0 |
| Date | 2026-04-28 |
| Author | Arjun Sharma, Product |
| Reviewers | Ryan Hoke (CEO), Ryan Robertson (Eng), Himanshu (QA) |

---

## 2. Background and context

### 2.1 What the module is

Intent Response Cards are the structured visual layer of the YourAI chat. When an attorney asks a legal-task question, the system recognises which kind of task it is, asks the AI to produce data in a specific shape, and renders that data inside a card built for that task. A summary card shows an executive summary plus parties, dates, governing law, and key obligations. A risk memo card shows narrative findings grouped by severity. A timeline card shows a chronology with date pills and a vertical rail. The card is the same idea, the body content varies — and the cards together form the "structured output" half of the chat (the other half is plain-language prose for general-chat questions, follow-ups, and clarifications).

### 2.2 Why it exists

Plain text was the original chat output. It worked for general questions but failed for legal triage tasks where the attorney needs to scan, compare, and cite. Three drivers led to cards:

1. **Density.** A clause comparison reads as a 2×N table at a glance — as prose it requires two careful re-reads.
2. **Source attribution.** Every legal output needs an at-a-glance "where did this come from?" badge. Prose buries the source; cards surface it in the header.
3. **Sibling-intent discoverability.** When an attorney activates the wrong intent, the empty state offers a one-tap path to the right one. Prose can't do that gracefully.

The cards exist because attorneys will not read paragraphs of AI output for tasks they've trained themselves to scan in seconds.

### 2.3 Where it sits

The Intent Response Cards module sits between the intent classification system (which decides the active intent) and the chat thread (which renders the messages). Adjacent modules:

- **Intent selector + suggestion banner** — sets the active intent. Covered in `FRD_Intent_System.docx`.
- **Auto-switch detector** — promotes General Chat to a card-eligible intent based on keyword patterns. Covered in `FRD_Intent_System.docx` §4.
- **Document Vault / Knowledge Pack panels** — provide the documents and KB context that feed the cards.
- **Workflow runs** — also produce structured outputs but use a different surface (Workflow Run Panel + Workflow Report). Workflow outputs are *not* intent cards.

Entry: a user message lands in the chat thread with an active intent set to a card-eligible value.
Exit: a card renders in the thread as the AI's response. The conversation continues — follow-up messages may produce more cards or fall back to prose.

### 2.4 Recent state

As of 2026-04-28, all eight cards have been migrated to a unified visual chrome (the *EditorialShell* family). Earlier versions had two different chromes coexisting — one for the four older cards and one for the three newer ones. The Find Document card was added in this same release as the eighth card and the only client-only card in the family. Per-intent accent colours have been preserved through the migration so visual variety remains while structural consistency lands.

---

## 3. Module-level functional specification

### 3.1 Card dispatch surface

When a user sends a message:

1. The chat pipeline reads the active intent.
2. If the active intent is **card-eligible**, the AI is asked to produce data in that intent's shape and the matching card type is queued for rendering.
3. If the active intent is **not card-eligible** (General Chat, Legal Q&A), the AI returns prose and a plain message bubble renders.
4. If a card-eligible intent's response is unparseable (rare — the AI emits prose unexpectedly), the system falls back to a prose message bubble for that turn only. The active intent is unchanged.

The card type is determined deterministically from the active intent. The user does not see the card type chosen behind the scenes — they see the dropdown pill before sending and the rendered card after.

### 3.2 Card visual structure (chrome)

Every card has the same outer structure:

- **Top accent stripe** — 3 px coloured band across the full width of the card. Colour identifies the intent (see §5.4).
- **Header**
  - **Eyebrow** — small uppercase label (e.g. "DOCUMENT SUMMARY", "RISK MEMO", "FIND DOCUMENT") in the accent's strong tone.
  - **Title** — large serif headline (the document name, the matter name, the comparison subjects, etc.).
  - **Subtitle** — short metadata line (clause count + size + date, jurisdiction + KB source, "N clauses compared", etc.).
  - **Source pill** — small chip aligned to the right of the header, showing the data source category (*Document* / *Knowledge Base* / *Workspace* / *Vault*).
- **Body** — varies per card. Tables, structured grids, prose with drop caps, expandable row lists, vertical-rail timelines.
- **Footer** — single-line text describing the source attribution prose-style ("Generated 2 min ago · Ryan", "Source: meridian_msa.pdf", "Personal vault"). Optional Copy and Download buttons may appear on the right depending on card type.

The entire card sits inside the chat thread as one continuous block; the user scrolls past it like any other message but can interact with controls inside it (expand / collapse rows, click Use, click sibling-intent links, copy, download).

### 3.3 Source attribution

Source attribution appears in two places per card:

- **Source pill** in the header — the *category* of source (*Document* / *Knowledge Base* / *Workspace* / *Vault*).
- **Footer text** — the *specific* source name where applicable (file name, KB section, workspace name, "Personal vault").

This double-attribution is deliberate. The header tells the attorney *what kind* of input this is (so they trust the output appropriately — KB-grounded research is different from a single attached PDF). The footer tells them *which exact source* so they can cite or re-open it.

### 3.4 Empty state surface

A card-eligible intent activated with no input (no document attached, no question that the AI can ground in) produces an *empty envelope* — the AI returns the card's data shape with all fields blank. Without special handling this would render as a grid of dashes and blank rows, which reads as broken.

Every card detects this empty envelope and replaces its body with a friendly empty-state message inside the same chrome. The empty state always contains:

1. A short sentence explaining what's missing ("No document supplied", "No documents to compare", "No case document supplied").
2. A directive on how to fix it ("Upload a document using the **+** button next to the input").
3. A muted suggestion of a sibling intent the user might have meant ("If you want a clause-by-clause breakdown, switch to Clause Analysis", "If you don't have a specific document yet, switch to Legal Research").

The empty state is not an error — it's a guided redirect. See §5.2 for the full pattern.

### 3.5 Loading state

While the AI is producing the response, the card area shows a streaming-text indicator (animated cursor at the end of an evolving prose blob). Once enough data has streamed for the system to identify it as parseable card data, the chrome appears and fields populate as the stream completes. Brief flicker between "prose-loading" and "card-rendered" is acceptable; the system does not double-render.

### 3.6 Error state

Three classes of error can surface:

1. **AI service unavailable** — the chat surface shows a system-level error message ("AI service returned 503 — please try again"). The card does not appear. This is handled at the chat layer, not the card layer.
2. **Malformed response** — the AI returned data that doesn't fit the card's shape. The card falls back to a prose message bubble for that turn (§3.1.4). No error UI on the card itself; the user sees prose.
3. **Partial data** — the AI returned some fields populated and others blank. Most cards do not currently distinguish "partial" from "populated" — they render whatever is present and show `—` for blank cells. The Timeline card has the only soft-degrade variant: when matterName is present but events is empty, it shows "No dated events found in the source." inline rather than triggering the empty state. See §5.5.

---

## 4. Per-entity specification

Each of the eight cards is documented in the same shape. The first seven are server-driven (the AI generates the data); the eighth is client-only.

### 4.1 Document Summarisation (SummaryCard)

**Purpose** — gives an attorney a partner-ready overview of a single contract, memo, brief, or filing. Mental model: "summarise this for me." Does NOT produce risk-rated findings (use Risk Memo), clause-by-clause breakdowns (use Clause Analysis), or comparisons (use Clause Comparison).

**When it appears** — explicit "Document Summarisation" pill from the dropdown OR auto-switch when the user types phrases like *"summarise this"*, *"summary of this"*, *"tldr"*, *"key points from"*, *"main points of"*, *"brief me on"*, *"overview of this"*.

**Accent colour** — gold.

**Source pill** — *Document* (when the source is an attached or vault document) or *Knowledge Base* (when the user is summarising a KB excerpt).

**Body content:**
- An executive-summary paragraph (3–6 sentences).
- A 2×2 metadata grid with four cells: **Parties**, **Key Dates**, **Governing Law**, **Key Obligations**. Multi-line values are preserved.
- An enumerated key-points list (3–8 items, capped at 8). Items are numbered `01.`, `02.`, etc.
- An optional gold-bordered "Needs attention" callout for material concerns the AI flagged but didn't elevate to a separate intent.

**States:**
- *Populated* — full grid as described above.
- *Empty* — fires when no executive summary, no metadata, no key points, and no document name are present. Renders "No document supplied" + the canonical upload prompt + a hint pointing to General Chat / Legal Q&A for non-document questions.
- *Partial / degraded* — not implemented. The card is all-or-nothing on the empty-state check; per-cell blanks render as `—`.
- *Error* — the AI returned malformed JSON; falls back to prose for that turn (see §3.6).

**User actions** — none on the card body itself (read-only summary). Footer offers Copy and Download PDF (planned, not always wired).

**Edge cases:**
- A document with no parties named (e.g. a research memo) shows `—` in the Parties cell.
- A document in a non-English language: the AI's summary respects the source language; metadata field labels stay English.
- A very long executive summary is rendered in full — no truncation. Long documents may produce 5–6 sentence summaries.

### 4.2 Clause Comparison (ComparisonCard)

**Purpose** — side-by-side clause-level comparison of two documents. Used for "is the new MSA better than v1 on indemnification?" style triage. Does NOT summarise either document standalone, produce a risk memo, or analyse a single document's clauses end-to-end.

**When it appears** — explicit "Clause Comparison" pill OR auto-switch on phrases like *"compare these"*, *"compare the two"*, *"compare both"*, *"difference between"*, *"which is better"*, *"side by side"*, *"contrast these"*, *"compare clause"*, *"compare contracts"*, *"compare documents"*.

**Accent colour** — navy.

**Source pill** — *Workspace* (the comparison is hardcoded to attribute to the active workspace, since most comparisons happen inside a per-matter context).

**Body content:**
- A 3-column header strip: clause label · Document 1 name · Document 2 name. The header strip has its own navy band — distinct from the rest of the card body.
- One row per clause being compared. Each row has: clause label cell · Doc 1 verdict cell · Doc 2 verdict cell.
- Each verdict cell shows a coloured verdict pill (`↑ More favourable` green, `↓ Less favourable` amber, `— Absent` grey, `Neutral` no pill) and the relevant clause text from that document.
- A closing one-sentence recommendation strip below the table.

**States:**
- *Populated* — full table.
- *Empty* — fires when no rows, no Doc 1 name, no Doc 2 name, and no recommendation. Renders "No documents to compare" + a directive to attach **both** documents + a hint pointing to General Chat for non-comparison questions.
- *Partial / degraded* — not implemented.
- *Error* — falls back to prose.

**User actions** — none on the card body (read-only). Footer offers Copy / Download PDF (planned).

**Edge cases:**
- Asymmetric documents (one has a clause the other doesn't) render the absent side as `— Absent` with a grey verdict pill.
- A user asking to compare three documents will produce a card based on the first two; the third is ignored. (Open question Q1 — see §9.)
- Very long clause text wraps inside the cell; no fixed cell height.

### 4.3 Case Law Analysis (CaseBriefCard)

**Purpose** — briefs a court filing, opinion, or case memo. Used for case-law triage during litigation prep, motion drafting, and research grounding. Does NOT search for cases (use Legal Research), summarise statutes, or compare cases — it briefs *one* case the user supplied.

**When it appears** — explicit "Case Law Analysis" pill OR auto-switch on phrases like *"analyse this case"*, *"case analysis"*, *"court decision"*, *"what happened in this case"*, *"this judgment"*, *"this judgement"*, *"ruling in"*.

**Accent colour** — green.

**Source pill** — *Document*.

**Body content:**
- Header strip with case name + court + date + subject.
- A label-value grid with structured rows: *Parties*, *Court*, *Date*, *Issue*, *Holding*, *Reasoning*. The Holding row is rendered in italic serif as a visual anchor for the legal conclusion.
- A *Precedence* section with coloured tags (e.g. *Binding* in blue, *Persuasive* in grey) plus a one-line note explaining the precedential value.
- A blue *Application to Your Matter* panel below the grid that frames how this case applies to the user's situation. Always single-paragraph.

**States:**
- *Populated* — full grid + precedence + application panel.
- *Empty* — fires when no rows, no precedence, no case name, and no application paragraph. Renders "No case document supplied" + an upload nudge + a hint pointing to Legal Research for citation lookups (when the user has a citation but no document).
- *Partial / degraded* — the precedence section can be omitted independently if the AI determines it's not relevant; this is normal rendering, not a degraded state.
- *Error* — falls back to prose.

**User actions** — read-only.

**Edge cases:**
- An unpublished or unreported decision: precedence tags reflect the source (often *Persuasive* or *Non-precedential*).
- A case from a non-US jurisdiction: the AI follows the source jurisdiction's terminology (e.g. *Judgment* not *Opinion*) but the row labels stay constant.
- A multi-issue case: Issue and Holding rows may contain bullet-style lists; the grid renders multi-line values verbatim.

### 4.4 Legal Research (ResearchBriefCard)

**Purpose** — answers a research question against the global knowledge base. Used for "what's the law on non-compete enforceability in NY?" type queries. **The only card that does NOT need an attached document** — the answer is grounded in the curated KB.

**When it appears** — explicit "Legal Research" pill OR auto-switch on phrases like *"what does the law say"*, *"legal precedent"*, *"case law on"*, *"is it legal to"*, *"what are my legal rights"*, *"legal position on"*, *"find case law"*.

**Accent colour** — indigo.

**Source pill** — *Knowledge Base*.

**Body content:**
- Header with topic + jurisdiction + "Global Knowledge Base" subtitle.
- A 4-cell stat strip showing counts of: **Statutes**, **Cases**, **Principles**, **Jurisdictions** referenced.
- Four collapsible sections in fixed order:
  1. **Applicable Statutes** (auto-expanded on render)
  2. **Relevant Case Law**
  3. **Key Principles**
  4. **Practical Implications** (auto-appends the standard "general legal information — not legal advice" disclaimer)
- Each section has a numbered mono indicator (`01`, `02`, `03`, `04`), a body of formatted prose, and a row of citation chips at the bottom.

**States:**
- *Populated* — full 4-section render.
- *Empty* — fires when no sections and no topic. Different copy than the other cards because no upload is required: the empty state asks for a more specific question, with a worked example: *"Force majeure precedents in New York commercial leases, 2020–present"*. Hint mentions that attaching a document is also valid if the user wants research grounded against specific text.
- *Partial / degraded* — not implemented; sections may be empty individually but that's data-shape, not degradation.
- *Error* — falls back to prose.

**User actions** — expand / collapse each of the four sections. Click a citation chip to view its source (planned, not always wired).

**Edge cases:**
- A jurisdiction the KB has no coverage of (e.g. asking about Indian contract law): the AI states the limitation in the Practical Implications section. The disclaimer always appears regardless of coverage.
- A very general question ("tell me about contract law"): produces sections but the user is encouraged to refine via the empty-state-style hint copy in the Practical Implications section.

### 4.5 Risk Assessment (RiskMemoCard)

**Purpose** — narrative risk memo with findings grouped by severity. Used for partner-ready risk write-ups on contracts, NDAs, leases, agreements. Does NOT produce a clause-by-clause list (use Clause Analysis) or chronological events (use Timeline Extraction).

**When it appears** — explicit "Risk Assessment" pill OR auto-switch on phrases like *"what are the risks"*, *"identify the risks"*, *"risk assessment"*, *"assess the risk"*, *"any red flags"*, *"risky clauses"*, *"risk analysis"*, *"should I sign this"*, *"flag the risks"*, *"risk memo"*, *"generate a risk memo"*, *"risk review"*.

**Accent colour** — gold.

**Source pill** — *Document*.

**Body content:**
- Header with matter name + document meta.
- *Documents analysed* strip showing a card for the source PDF.
- *Executive summary* section: opens with a drop-cap on the first character; an optional pull-quote highlights the most important verbatim finding from the source.
- An optional trailing summary paragraph beneath the pull-quote.
- *Findings* section: groups findings into three blocks by severity (high → medium → low). Each finding is a card with: title · location reference · responsible party · verbatim quote (optional) · recommendation. Findings cards have a left border in the severity colour (red high, amber medium, green low).

**States:**
- *Populated* — full memo.
- *Empty* — fires when no findings, no matter name, no executive summary, and no document name. Renders "No contract supplied" + upload nudge + a hint pointing to Clause Analysis for the same input with a different output shape.
- *Partial / degraded* — when the AI produces matter name + executive summary but no findings, the findings section displays "No material risks identified." inline italic rather than triggering the empty state.
- *Error* — falls back to prose.

**User actions** — read-only memo. Footer Copy / Download PDF.

**Edge cases:**
- A contract with no high-severity findings: the High block is omitted entirely; only Medium and/or Low render.
- An ambiguous risk that the AI can't categorise: defaults to Medium severity rather than skipping.
- The pull-quote is independent of the findings array — the AI picks the single most important finding to surface as a hero quote, separate from the structured list. May be omitted if the AI can't identify a clear top finding.

### 4.6 Clause Analysis (ClauseAnalysisCard)

**Purpose** — clause-by-clause structured breakdown of a contract or agreement. Used in negotiating prep where the attorney needs to see each clause's risk level alongside the underlying language. Does NOT produce narrative framing (use Risk Memo for prose).

**When it appears** — explicit "Clause Analysis" pill OR auto-switch on phrases like *"analyse clauses"*, *"extract clauses"*, *"break down the clauses"*, *"walk me through the clauses"*, *"clause by clause"*, *"each clause"*, *"which clauses"*, *"list the clauses"*, *"clause analysis"*, *"analyse each clause"*, *"what clauses are in"*, *"breakdown of clauses"*.

**Accent colour** — gold.

**Source pill** — *Document*.

**Body content:**
- Header with matter name.
- *Documents analysed* strip with the source PDF reference.
- A 4-cell summary strip showing **Clauses** (total), **High** (count), **Medium** (count), **Low** (count). Each per-severity cell shows the count in serif numerals + a coloured severity number.
- *Clause-by-clause* section: an expandable list. Each row shows clause title · location reference · severity pill. Expanding a row reveals: optional verbatim quote (gold-left-border italic) · plain-English interpretation · optional recommendation block (gold-tinted).

**States:**
- *Populated* — full clause list. The first high-severity clause auto-expands on render (or the first clause overall if no highs).
- *Empty* — fires when no clauses, no matter name, and no document name. Renders "No contract supplied" + upload nudge + hint pointing to Risk Memo for narrative framing.
- *Partial / degraded* — not implemented.
- *Error* — falls back to prose.

**User actions** — click to expand or collapse a clause. Multiple clauses may be open simultaneously. Footer Copy / Download PDF.

**Edge cases:**
- A contract with very long clause language: the verbatim quote inside an expanded clause wraps and may take the full card width.
- A non-standard contract type (e.g. a court order): clause titles may be longer or use case-specific terminology.

### 4.7 Timeline Extraction (TimelineCard)

**Purpose** — chronological event list extracted from a document. Used for litigation timelines (discovery deadlines, filing dates), corporate timelines (closing checklists), and case chronologies. Does NOT infer dates the source doesn't state.

**When it appears** — explicit "Timeline" pill OR auto-switch on phrases like *"timeline of"*, *"chronology"*, *"chronological order"*, *"dates in this"*, *"key dates"*, *"build a timeline"*, *"extract the timeline"*, *"sequence of events"*, *"what happened when"*, *"list the events"*, *"litigation timeline"*, *"discovery timeline"*, *"deadlines in this"*, *"important dates"*.

**Accent colour** — gold.

**Source pill** — *Document*.

**Body content:**
- Header with matter name.
- *Documents analysed* strip.
- *Chronology* section: a vertical-rail timeline with a 2-px grey line down the left side and one dot per event. Dots are colour-coded by event kind (event grey, deadline red, milestone gold, filing blue). Each entry shows: date + kind chip + optional source reference + serif event label + optional one-line description.

**States:**
- *Populated* — full timeline rail.
- *Empty* — fires when no events, no matter name, and no document name. Renders "No document supplied" + upload nudge + hint pointing to Case Brief or Clause Analysis for documents without explicit dates.
- *Partial / degraded* — when matter name is present but events is empty, renders "No dated events found in the source." inline italic rather than triggering the empty state. Soft-degrade.
- *Error* — falls back to prose.

**User actions** — read-only timeline. Footer Copy / Download PDF.

**Edge cases:**
- A document with quarterly references (`Q2 2024`) rather than calendar dates: rendered verbatim. The card does not normalise.
- A document with vague dates (`approximately March 2024`) rendered verbatim including the "approximately" qualifier.
- Events arrive in chronological order from the AI; the card does NOT sort. If the source document presents events out of order, the card preserves source order.
- A deadline more than 5 years in the future: rendered the same as any other event; no special treatment.

### 4.8 Find Document (FileResultsCard)

**Purpose** — surfaces matching documents from the user's personal vault as a row list directly inside the chat thread. Used for "where's the Acme MSA?" / "do I have any NDAs from Globex?" type queries without forcing the user to leave the chat to open the Vault panel.

**When it appears** — explicit "Find Document" pill OR auto-switch on phrases like *"find file"*, *"find a file"*, *"find document"*, *"search for file"*, *"search my files"*, *"where is the file"*, *"where's the doc"*, *"do I have a file"*, *"do I have any documents"*, *"show me my files"*, *"list my documents"*, *"what files"*, *"in my vault"*, *"from my vault"*. The keyword set is broad and prioritised over Legal Q&A so vault-search anchors don't get drowned by general matches.

**Accent colour** — teal.

**Source pill** — *Vault*.

**Body content** — varies by state:

- **Vault is empty** — "Your vault is empty" header + a primary teal *Upload a file →* button.
- **Empty query** (the trigger-stripping pipeline removed the entire message) — "What file are you looking for?" header + an example query list ("find Acme MSA", "where's the NDA template?", "do I have anything from Globex") + ghost *Browse vault →* button.
- **No matches** — "No files match" header + suggestion copy + ghost *Browse vault →* button.
- **One match** — single prominent row + a primary teal *Use* button.
- **2–5 matches** — all rows rendered, each with its own *Use* button.
- **Six or more matches** — top 5 rows rendered + an overflow footer "View all N in Vault →" that opens the Vault panel pre-filtered with the user's query.

Each result row shows: file icon · file name · folder breadcrumb · file size · uploaded date · *Use* button.

**States** — see body content (the card has six explicit state variants based on data shape).

**User actions:**
- *Use* on any row — attaches that document to the active chat session and drops a system note in the thread acknowledging the attachment.
- *Browse vault* / *View all N in Vault* — opens the full Vault panel.

**Edge cases:**
- The user types a vague query that strips to one or two characters: searches that string; usually returns many matches, triggers the >5 overflow footer.
- The user types only trigger words ("find a document"): strips to empty; renders the empty-query state.
- The user types with trailing context phrases ("Find Series B term sheet from my document vault"): the trailing "from my document vault" is stripped before searching, so the search runs on "series b term sheet".
- Two documents with the same name but in different folders: both appear as separate rows; the folder breadcrumb disambiguates them.
- The user clicks *Use* on a row mid-thread (after sending earlier messages): the document attaches additively and a system note appears (the additive-uploads pattern, see Find Document is the inline alternative to clicking *Use* in the Vault panel).

This card is **the only client-only card** in the family — the AI is not consulted for find-document queries. The match logic runs locally over the user's vault state. See §6.1 for the extended discussion.

---

## 5. Cross-entity behaviour

### 5.1 Card vs prose decision logic

A user message produces a card (rather than a prose response) when both:

1. The active intent is a card-eligible intent (one of the eight in §4).
2. The AI's response can be parsed into the card's expected data shape.

If condition 1 fails, prose renders. (General Chat and Legal Q&A intents always render prose.) If condition 1 holds but condition 2 fails (the AI returned malformed data), prose renders for that turn only — the active intent is unchanged for the next turn.

The decision is per-turn. The user can fluidly move between card-producing and prose-producing intents by changing the dropdown pill or letting auto-switch detect a different pattern.

### 5.2 Empty-state detection rule

Every card detects "schema-shaped envelope with no real data" — the artefact of the AI being told to return data in a fixed shape even when no input was supplied. Without this detection the card would render as a grid of dashes and empty rows, reading as broken.

Detection is uniform across cards: **all required text fields blank AND no document name present AND all required arrays empty** → render the empty-state branch instead of the populated branch. Each card has its own empty-state copy and its own sibling-intent hint.

The empty state always renders inside the card's normal chrome — same accent stripe, same header eyebrow, same footer. The user sees a recognisable card with friendly "no input" copy in the body. This is critical product behaviour, not a bug fix: the alternative (a grid of `—` dashes) was confused by users for "AI broke" rather than "input missing".

### 5.3 Source attribution conventions

| Card | Source pill | Footer text |
|---|---|---|
| Document Summarisation | *Document* or *Knowledge Base* | "Source: `<file>`" or "Source: YourAI knowledge base" |
| Clause Comparison | *Workspace* | "Workspace: `<name>` · 2 documents" |
| Case Law Analysis | *Document* | "Source: `<file>`" |
| Legal Research | *Knowledge Base* | "Source: YourAI knowledge base" |
| Risk Assessment | *Document* | "Generated `<relative-time>` · `<author>`" |
| Clause Analysis | *Document* | "Generated `<relative-time>` · `<author>`" |
| Timeline Extraction | *Document* | "Generated `<relative-time>` · `<author>`" |
| Find Document | *Vault* | "Personal vault" |

### 5.4 Accent colour coding

Per-intent accent colour acts as a visual cue for users scanning a long thread of mixed-intent responses.

| Card | Accent |
|---|---|
| Document Summarisation | Gold |
| Clause Comparison | Navy |
| Case Law Analysis | Green |
| Legal Research | Indigo |
| Risk Assessment | Gold |
| Clause Analysis | Gold |
| Timeline Extraction | Gold |
| Find Document | Teal |

Note: Risk / Clause / Timeline all share gold because they're the "narrative editorial" trio that originally launched together; Summary's gold is an accident of legacy and may be re-coloured in a future palette pass (Q3 — see §9).

### 5.5 Citation format conventions

Cards that cite source text (Risk, Clause, Timeline, Case Brief) use a consistent inline format: **`[Doc: <filename>, p.<N>, §<section>]`** following any verbatim quote or factual claim that originates in the source. The format is set by the underlying prompt and rendered as plain text inside the card body — not as a styled chip — so it survives copy / paste into Word.

The Legal Research card uses a different format because citations there are *case citations*, not *document references*: standard legal citation format (e.g. `Smith v. Jones, 123 F.3d 456 (2d Cir. 2019)`) rendered as blue chips at the end of each section.

---

## 6. Special-case entities

### 6.1 Find Document — client-only card

The Find Document card differs from the other seven in three material ways:

**1. No AI round-trip.** When the user sends a message under the Find Document intent, the system does not contact the AI. Instead it runs a local substring search against the user's vault (matching on file name, description, file system name, and folder breadcrumb) and renders the card from local state. This is faster (sub-100 ms response) and more reliable (no AI fallibility for a deterministic task) than the alternative.

**2. Six explicit state variants.** Where the other cards have populated / empty / partial / error, Find Document has six state-driven variants based on data shape: vault-empty, query-empty, no-match, one-match, 2–5 matches, 6+ matches. Each variant has its own header copy, body layout, and primary action.

**3. Trigger phrase normalisation.** Before the search runs, the user's typed message is stripped of trigger words to extract the actual subject. The system removes:
- Leading verb prefixes (longest-first): *"find my"*, *"find any"*, *"find a"*, *"find"*, *"search for"*, *"search my"*, *"where is the"*, *"where's the"*, *"where is"*, *"where's"*, *"do I have any"*, *"do I have a"*, *"do I have"*, *"show me my"*, *"show me the"*, *"show me"*, *"list my"*, *"list the"*, *"list"*, *"what files"*, *"what docs"*, *"what documents"*.
- Leading articles: *"the"*, *"a"*, *"an"*, *"my"*, *"any"*.
- Leading noun anchors: *"files"*, *"file"*, *"docs"*, *"doc"*, *"documents"*, *"document"*.
- Leading particles: *"called"*, *"named"*, *"titled"*, *"about"*, *"for"*, *"from"*.
- Trailing vault-context phrases (longest-first): *"from my document vault"*, *"in my document vault"*, *"from my vault"*, *"in my vault"*, *"from the vault"*, *"in the vault"*, *"in vault"*, etc.

After stripping, what remains is the search subject. *"Find Series B term sheet from my document vault"* strips to *"series b term sheet"*. The substring filter runs on the stripped query against name, description, file name, and folder breadcrumb.

**4. Inline actions.** The card has interactive controls in the body (one *Use* button per row, plus *Browse vault* / *View all in Vault* footer links). The other seven cards are read-only.

The Find Document card was added in the 2026-04-28 release as the eighth card and the only client-only card. It coexists in the same intent dropdown and in the same visual chrome family as the other seven, but its semantics are different and any spec or test plan should treat it as a special case rather than rolling it into the AI-driven group.

---

## 7. Accessibility and interaction notes

### 7.1 Keyboard navigation

- Tab moves focus through interactive elements: source pill (if clickable, planned), expand/collapse toggles (Clause card, Research card), *Use* buttons (Find Document card), footer Copy and Download buttons.
- Enter or Space activates a focused button or toggle.
- Escape on an expanded clause / section collapses it.
- The card itself is not focusable as a whole; only interactive elements within it.

### 7.2 Screen-reader behaviour

- Card eyebrows ("DOCUMENT SUMMARY", etc.) are announced as headings at level 3.
- Card titles are announced as headings at level 2 inside the message.
- Source pills are announced with their full label ("Source: Document").
- Tables (Comparison, Case Brief grid) use proper table semantics so assistive tech announces "row 1 of 8" etc.
- Severity pills include their meaning in announced text ("High severity").
- Empty-state copy is announced as normal body text.

### 7.3 Click targets

All interactive elements are at minimum 44 × 44 px per WCAG. Expand/collapse toggles in the Clause card and the four collapsible sections in the Legal Research card meet this threshold. Footer buttons meet it.

### 7.4 Focus indicators

All interactive elements have a visible focus ring (2 px navy outline with 2 px offset). The ring is preserved across hover, active, and focus states.

### 7.5 Colour contrast

Body text on card body background meets 4.5:1 (WCAG AA). Severity pills have been verified at 4.5:1 in their tinted backgrounds. The accent stripe at the top of each card is decorative and not held to contrast standards.

### 7.6 Responsive behaviour

- On screens ≥ 1024 px wide: cards render at full width within the chat thread (max ~880 px content column).
- On screens 768–1023 px: cards render full width of the available column; tables in the Comparison card wrap if the cell content overflows; the Documents-analysed strip in Risk / Clause / Timeline collapses to a single column.
- On screens < 768 px (mobile): cards render full width minus 16 px padding; the 2×2 metadata grid in the Summary card becomes a single column; the Comparison card's 3-column header strip stacks vertically with each clause taking three rows. Mobile responsive behaviour is functional but not yet design-reviewed (Q5 — see §9).

---

## 8. QA test scenarios

Scenarios are numbered sequentially across the document. Group by card; each group is its own subsection.

### 8.1 Document Summarisation scenarios

**Scenario 1** — happy-path summary
- *Surface / entity:* §4.1 Document Summarisation
- *Preconditions:* user is logged in; no existing thread; the document `MSA_Acme_Corp_v4.pdf` is attached to the chat input.
- *Action:* type *"summarise this for me"* and send.
- *Expected result:* a Document Summarisation card renders with gold accent, "DOCUMENT SUMMARY" eyebrow, the file name as the title, executive-summary paragraph populated, all four metadata cells populated, 3–8 numbered key points, and source pill *Document*. Footer shows the file name.

**Scenario 2** — empty state
- *Surface / entity:* §4.1
- *Preconditions:* user is logged in; no document attached.
- *Action:* select "Document Summarisation" from the intent dropdown and send *"summarise this"*.
- *Expected result:* a Document Summarisation card renders with gold accent and "DOCUMENT SUMMARY" eyebrow but the body shows the empty-state copy ("No document supplied"). The empty state contains an upload prompt and a sibling-intent hint pointing to General Chat / Legal Q&A.

**Scenario 3** — auto-switch from General Chat
- *Surface / entity:* §4.1
- *Preconditions:* active intent is General Chat; document attached.
- *Action:* type *"give me a tldr of this contract"* and send.
- *Expected result:* the active intent auto-switches to Document Summarisation; the dropdown pill updates; the Summary card renders.

**Scenario 4** — non-English document
- *Surface / entity:* §4.1
- *Preconditions:* a Spanish-language contract is attached.
- *Action:* type *"summarise this"* in English.
- *Expected result:* the Summary card renders; the executive summary respects the source language (Spanish) for content but the metadata field labels stay English.

**Scenario 5** — Needs-attention flag
- *Surface / entity:* §4.1
- *Preconditions:* a contract with a known unusual provision (e.g. an indemnification cap of $0).
- *Action:* request a summary.
- *Expected result:* the card renders normally and includes a gold-bordered "Needs attention" callout below the key points listing the unusual provision.

### 8.2 Clause Comparison scenarios

**Scenario 6** — happy-path comparison
- *Surface / entity:* §4.2
- *Preconditions:* two documents attached: `meridian_msa.pdf` and `acme_msa.pdf`.
- *Action:* type *"compare these two on indemnification and liability"* and send.
- *Expected result:* a Comparison card renders with navy accent. The header strip shows the clause label column plus both document names. Rows show clause names and verdict pills + clause text per side. A recommendation appears below the table.

**Scenario 7** — empty state, no documents
- *Surface / entity:* §4.2
- *Preconditions:* no documents attached.
- *Action:* select "Clause Comparison" from the dropdown and send *"compare these"*.
- *Expected result:* the card renders with empty-state copy ("No documents to compare") plus a directive to attach **both** documents and a sibling-intent hint.

**Scenario 8** — only one document attached
- *Surface / entity:* §4.2
- *Preconditions:* only one document attached.
- *Action:* select "Clause Comparison" and send *"compare these two"*.
- *Expected result:* the empty state renders (the AI cannot compare against nothing); copy explicitly says both documents are needed.

**Scenario 9** — asymmetric clause coverage
- *Surface / entity:* §4.2
- *Preconditions:* doc A has an indemnification clause; doc B does not.
- *Action:* compare them.
- *Expected result:* the indemnification row renders; doc A's column shows the clause text with a verdict pill; doc B's column shows `— Absent` with a grey verdict pill.

**Scenario 10** — three documents attached
- *Surface / entity:* §4.2
- *Preconditions:* three documents attached.
- *Action:* type *"compare these"*.
- *Expected result:* the AI compares the first two; the third is silently ignored. (Open question Q1 — see §9.)

### 8.3 Case Law Analysis scenarios

**Scenario 11** — happy-path case brief
- *Surface / entity:* §4.3
- *Preconditions:* a court opinion PDF is attached.
- *Action:* type *"analyse this case"*.
- *Expected result:* a Case Brief card renders with green accent. Header shows case name + court + date. Grid populates parties / court / date / issue / holding / reasoning rows. Holding row is rendered in italic serif. Precedence section + Application panel appear below.

**Scenario 12** — empty state
- *Surface / entity:* §4.3
- *Preconditions:* no document attached.
- *Action:* select "Case Law Analysis" and send *"analyse this case"*.
- *Expected result:* empty state with "No case document supplied" + upload nudge + sibling-intent hint pointing to Legal Research.

**Scenario 13** — non-precedential opinion
- *Surface / entity:* §4.3
- *Preconditions:* an unpublished or unreported decision PDF is attached.
- *Action:* analyse it.
- *Expected result:* the Precedence section renders with a *Persuasive* or *Non-precedential* tag rather than *Binding*.

**Scenario 14** — multi-issue case
- *Surface / entity:* §4.3
- *Preconditions:* a case opinion that addresses three separate legal issues.
- *Action:* analyse it.
- *Expected result:* Issue and Holding rows contain bulleted lists; the grid renders the multi-line content verbatim without truncation.

### 8.4 Legal Research scenarios

**Scenario 15** — happy-path research
- *Surface / entity:* §4.4
- *Preconditions:* no document attached.
- *Action:* type *"what does the law say about non-compete enforceability in New York?"*.
- *Expected result:* a Research Brief card renders with indigo accent. The 4-cell stat strip shows counts. Four sections render in fixed order; the Applicable Statutes section is auto-expanded. Practical Implications ends with the standard disclaimer.

**Scenario 16** — empty state, vague question
- *Surface / entity:* §4.4
- *Preconditions:* no document attached.
- *Action:* select "Legal Research" and send *"tell me about contracts"*.
- *Expected result:* the empty state asks for a more specific question; copy includes a worked example query; the hint mentions optional document attachment.

**Scenario 17** — research grounded against an attached document
- *Surface / entity:* §4.4
- *Preconditions:* a contract is attached.
- *Action:* type *"what does the law say about the indemnification clause in this contract?"*.
- *Expected result:* a Research card renders; Applicable Statutes references the relevant statute; Relevant Case Law cites cases interpreting that clause. Source pill stays *Knowledge Base*.

**Scenario 18** — jurisdiction with no KB coverage
- *Surface / entity:* §4.4
- *Preconditions:* none.
- *Action:* type *"what does Indian contract law say about consideration?"*.
- *Expected result:* the card renders; Practical Implications acknowledges the limited KB coverage. The disclaimer still appears.

### 8.5 Risk Assessment scenarios

**Scenario 19** — happy-path risk memo
- *Surface / entity:* §4.5
- *Preconditions:* a contract is attached.
- *Action:* type *"identify the risks in this contract"*.
- *Expected result:* a Risk Memo card renders with gold accent. Documents-analysed strip shows the source. Executive summary opens with a drop-cap. A pull-quote highlights the top finding. Findings section groups findings by severity (High → Medium → Low), each finding card has a coloured left border.

**Scenario 20** — empty state
- *Surface / entity:* §4.5
- *Preconditions:* no document attached.
- *Action:* select "Risk Assessment" and send *"what are the risks?"*.
- *Expected result:* empty state with "No contract supplied" + upload nudge + sibling-intent hint pointing to Clause Analysis.

**Scenario 21** — partial state, no findings
- *Surface / entity:* §4.5
- *Preconditions:* a benign contract attached (e.g. a standard NDA with no unusual terms).
- *Action:* request a risk assessment.
- *Expected result:* the card renders with matter name and executive summary populated, but the Findings section displays "No material risks identified." inline italic. The empty state does NOT trigger.

**Scenario 22** — all findings at one severity level
- *Surface / entity:* §4.5
- *Preconditions:* a contract with only medium-severity findings.
- *Action:* request risk memo.
- *Expected result:* the High and Low blocks are omitted; only the Medium block renders.

**Scenario 23** — pull-quote omitted
- *Surface / entity:* §4.5
- *Preconditions:* a contract with no clearly dominant finding.
- *Action:* request risk memo.
- *Expected result:* the card renders without a pull-quote; the executive summary flows directly into the Findings section.

### 8.6 Clause Analysis scenarios

**Scenario 24** — happy-path clause list
- *Surface / entity:* §4.6
- *Preconditions:* a contract attached.
- *Action:* type *"analyse each clause"*.
- *Expected result:* a Clause Analysis card renders with gold accent. Summary strip shows total clause count and per-severity counts. Clause list renders. The first high-severity clause is auto-expanded.

**Scenario 25** — auto-expand falls to first clause when no high
- *Surface / entity:* §4.6
- *Preconditions:* a contract with only medium / low risk clauses.
- *Action:* request clause analysis.
- *Expected result:* the first clause in the list is auto-expanded (since no high-severity clause exists).

**Scenario 26** — multiple clauses expanded simultaneously
- *Surface / entity:* §4.6
- *Preconditions:* clause analysis card rendered.
- *Action:* click expand on three different clauses in turn.
- *Expected result:* all three are open at once; clicking a fourth opens it without collapsing the others.

**Scenario 27** — empty state
- *Surface / entity:* §4.6
- *Preconditions:* no document attached.
- *Action:* select "Clause Analysis" and send *"break down the clauses"*.
- *Expected result:* empty state with "No contract supplied" + sibling-intent hint pointing to Risk Memo.

### 8.7 Timeline Extraction scenarios

**Scenario 28** — happy-path timeline
- *Surface / entity:* §4.7
- *Preconditions:* a litigation document attached (e.g. a discovery order).
- *Action:* type *"build a timeline of this"*.
- *Expected result:* a Timeline card renders with gold accent. Vertical-rail timeline shows events; dots are colour-coded by kind; events appear in source order.

**Scenario 29** — partial state, no dated events
- *Surface / entity:* §4.7
- *Preconditions:* a document with no explicit dates (e.g. a research memo).
- *Action:* request a timeline.
- *Expected result:* the card renders with matter name populated but the body shows "No dated events found in the source." inline italic. Empty state does NOT trigger.

**Scenario 30** — empty state
- *Surface / entity:* §4.7
- *Preconditions:* no document attached.
- *Action:* select "Timeline" and send *"timeline of"*.
- *Expected result:* empty state with "No document supplied" + upload nudge + sibling-intent hint pointing to Case Brief / Clause Analysis.

**Scenario 31** — quarterly date format
- *Surface / entity:* §4.7
- *Preconditions:* a document referencing `Q2 2024` and `Q4 2024` rather than calendar dates.
- *Action:* request a timeline.
- *Expected result:* the timeline preserves `Q2 2024` and `Q4 2024` verbatim. Source order is preserved.

### 8.8 Find Document scenarios

**Scenario 32** — happy-path find
- *Surface / entity:* §4.8
- *Preconditions:* the user's vault contains `MSA_Acme_Corp_v4.pdf`, `NDA_Globex_2024.pdf`, and 3 other documents.
- *Action:* type *"find Acme MSA"*.
- *Expected result:* a Find Document card renders with teal accent. The header reads "Found 1 file" or similar. One row shows `MSA_Acme_Corp_v4.pdf` with a *Use* button. The card is rendered without any AI round-trip (response is sub-100 ms).

**Scenario 33** — trailing vault-context phrase stripped
- *Surface / entity:* §4.8
- *Preconditions:* vault contains a Series B term sheet PDF.
- *Action:* type *"Find Series B term sheet from my document vault"*.
- *Expected result:* the trailing "from my document vault" is stripped before searching; the search runs on "series b term sheet"; the matching document is found and rendered as a single row.

**Scenario 34** — empty query (only trigger words typed)
- *Surface / entity:* §4.8
- *Preconditions:* vault has documents.
- *Action:* select "Find Document" pill and send *"find a document"*.
- *Expected result:* the entire message is consumed by the trigger-stripping pipeline; the empty-query state renders with "What file are you looking for?" + example queries + Browse vault button.

**Scenario 35** — no matches
- *Surface / entity:* §4.8
- *Preconditions:* vault has documents but none containing the typed substring.
- *Action:* type *"find Foobar Industries"* (no document with that name).
- *Expected result:* the no-matches state renders with "No files match" + suggestion copy + Browse vault button.

**Scenario 36** — empty vault
- *Surface / entity:* §4.8
- *Preconditions:* the user's vault is empty.
- *Action:* type *"find any document"*.
- *Expected result:* the empty-vault state renders with "Your vault is empty" + a primary teal *Upload a file →* button. (This state takes priority over the empty-query state.)

**Scenario 37** — overflow (>5 matches)
- *Surface / entity:* §4.8
- *Preconditions:* vault contains 12 PDFs.
- *Action:* type *"find any pdf"* (broad query that matches all PDFs).
- *Expected result:* the card header reads "Top 5 of 12 files in your vault". Five rows render. Footer shows "View all 12 in Vault →" linking to the Vault panel.

**Scenario 38** — Use action mid-thread
- *Surface / entity:* §4.8
- *Preconditions:* the user has already sent at least one prior message in this thread.
- *Action:* request a find, then click *Use* on a result row.
- *Expected result:* the document attaches to the active session; an inline system note appears in the thread acknowledging the attachment ("Used `<file>` from your vault — New topic? Start a new chat →"). The next user message can analyse the just-attached document via any card-eligible intent.

**Scenario 39** — folder breadcrumb match
- *Surface / entity:* §4.8
- *Preconditions:* vault has a folder structure `Contracts › Acme Corp › MSA & Schedules` containing several PDFs.
- *Action:* type *"find acme corp documents"*.
- *Expected result:* the search matches against folder breadcrumb; documents inside the Acme Corp subfolder appear in results even if "acme corp" isn't in their file names.

### 8.9 Cross-card transitions

**Scenario 40** — switching from Risk Memo to Clause Analysis on the same document
- *Surface / entity:* §3.1, §5
- *Preconditions:* a Risk Memo card has just rendered for an attached contract.
- *Action:* type *"now break down the clauses"*.
- *Expected result:* the active intent auto-switches to Clause Analysis; the next response renders as a Clause Analysis card on the same document. The original Risk Memo card stays intact in the thread.

**Scenario 41** — empty-state sibling redirect
- *Surface / entity:* §3.4, §5.2
- *Preconditions:* user is on Clause Analysis intent with no document attached; the empty state has rendered.
- *Action:* click the sibling-intent hint pointing to Risk Memo.
- *Expected result:* the active intent updates to Risk Memo; the dropdown pill updates accordingly. The user can now send a message that will produce a Risk Memo (still in empty-state since no document is attached, until the user uploads).

**Scenario 42** — malformed AI response falls back to prose
- *Surface / entity:* §3.1, §3.6
- *Preconditions:* card-eligible intent active.
- *Action:* the AI returns prose unexpectedly instead of structured data.
- *Expected result:* a plain prose message bubble renders for that turn. The active intent is unchanged. The next message that produces parseable structured data renders as a card normally.

### 8.10 Empty-state and edge-case scenarios

**Scenario 43** — multi-doc summary
- *Surface / entity:* §4.1
- *Preconditions:* two documents attached.
- *Action:* type *"summarise this"*.
- *Expected result:* the card renders summarising both documents. The metadata grid combines parties / dates / governing law / obligations across both. The document name in the header reflects "2 documents" or similar.

**Scenario 44** — very long document
- *Surface / entity:* §4.1, §4.5, §4.6
- *Preconditions:* a 200-page contract attached.
- *Action:* request any card-eligible analysis.
- *Expected result:* the card renders within reasonable time (≤ 30 s). Body content is truncated where the AI deems appropriate (e.g. clause analysis caps at top 15 clauses). No card-rendering errors.

**Scenario 45** — off-topic prompt with card-eligible intent active
- *Surface / entity:* §3.1, §5.2
- *Preconditions:* Document Summarisation intent active; no document attached; user types an off-topic question.
- *Action:* type *"what's the weather today?"*.
- *Expected result:* the empty-state branch renders with the standard "No document supplied" copy. The off-topic question is handled by the broader off-topic guardrail in the intent system (not by the card).

**Scenario 46** — additive upload after the first card
- *Surface / entity:* §4.5
- *Preconditions:* a Risk Memo card has rendered for one document.
- *Action:* attach a second document via the **+** button.
- *Expected result:* an inline system note appears in the thread acknowledging the additive upload ("Added `<file>` as Document 2 in this conversation. New topic? Start a new chat →"). The next message can reference both documents.

---

## 9. Open questions and known gaps

- **Q1: Multi-document Comparison handling.** A user attaching three documents and asking for a comparison gets a 2-document comparison silently. Should the system surface a UI affordance ("3 attached, comparing 1 vs 2 — switch to compare 2 vs 3") or restrict the AI to honour all three in a different shape? — Owner: Ryan Hoke. Decision needed.
- **Q2: Partial-failure handling consistency.** Only the Timeline card has a soft-degrade variant ("No dated events found"). Should Risk Memo, Clause Analysis, and others have analogous "no findings / no clauses identified" partial states, or stay at the binary populated/empty model? — Owner: Arjun. Decision pending QA feedback.
- **Q3: Summary card accent re-colour.** Document Summarisation is gold; so are Risk Memo, Clause Analysis, and Timeline Extraction. The visual distinction between Summary and the editorial-narrative trio is currently weak. Should Summary move to a different accent? — Owner: Aashna (design). Backlog.
- **Q4: Workflow report cards' relationship to intent cards.** Workflow runs produce structured outputs in a different surface (Workflow Run Panel + Report) — should some of those outputs also render in the chat thread as intent cards? Currently no, but the line between "workflow output" and "card output" is visible to users and worth re-examining. — Owner: PM team. Future discussion.
- **Q5: Mobile responsive sign-off.** Current responsive behaviour (§7.6) is functional but not yet design-reviewed. The Comparison card's table-stacking and the Timeline card's vertical rail need explicit mobile mockups. — Owner: Aashna. In flight.
- **Q6: Footer Copy and Download buttons coverage.** Footer Copy is wired on Risk / Clause / Timeline; Download PDF is partial. Other cards lack these. Should be uniform across all eight. — Owner: Ryan Robertson (eng). Sprint backlog.
- **Q7: Find Document content-search.** Current find-document search runs on file name + description + folder breadcrumb only. Wendy's "find that NDA with the 90-day non-compete" use case requires content search (full-text indexing). Deferred to P8.4. — Owner: Karish + backend team. Backend-blocked.
- **Q8: Source pill click-through.** Source pills are visual only today. Should they be clickable (e.g. clicking *Document* opens the source PDF)? — Owner: PM. Discussion pending.
- **Q9: Citation chip click-through in Legal Research.** Citation chips at the end of each Legal Research section are visual only. Click-through to the cited case / statute is planned but not wired. — Owner: Ryan Robertson. Sprint backlog.

---

## 10. Document control

### 10.1 Version

1.0

### 10.2 Date

2026-04-28

### 10.3 Authors

- Arjun Sharma, Product

### 10.4 Reviewers

- Ryan Hoke (CEO) — pending sign-off
- Ryan Robertson (Eng) — pending sign-off
- Himanshu (QA) — pending sign-off

### 10.5 Revision history

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0 | 2026-04-28 | Arjun + Claude | Initial draft. Covers all 8 cards post-EditorialShell unification including the Find Document MVP. |

### 10.6 Related FRDs

- `FRD_Intent_System.docx` — intent selector, auto-switch, suggestion banners (the layer above this one).
- `FRD_Workflow_Operations.docx` — workflow operations and their outputs (a different structured-output surface).
- `FRD_Tenant_Management.docx` — tenant configuration that influences card behaviour (e.g. KB scope for Legal Research).
- `bot-persona-scope.md` — Bot Persona editor for customising card-driving prompts.
- `.claude-context/card-empty-state-pattern.md` — canonical empty-state pattern reference (technical companion).
- `docs/extracted/intent-cards.md` — technical reference (developer audience companion).
