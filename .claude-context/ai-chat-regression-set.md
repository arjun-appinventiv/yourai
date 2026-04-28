# AI chat regression set — YourAI

> Living seed list of test prompts, target intent, expected behaviour, and the edge case each one is hammering. Add to it every time a chat bug is found.
>
> Companion file: `.claude-context/himanshu-knowledge.md`.
>
> **How to use**: paste the prompt into the main chat (`/chat`) at the indicated state (vault doc attached or not, intent pre-set or not), observe behaviour, compare to expected. Many of these mirror Wendy's interview phrasing and the YourAI-Test-Suite.md test cases.

---

## Setup notes

- All tests assume **production** (`https://yourai-black.vercel.app`) — preview URLs return 401 (gotcha #21).
- Default vault is seeded with 4 docs after first load: Acme MSA (id 1), Employee Handbook (id 2), Series B Term Sheet (id 3), MSA Schedule A SLAs (id 4, nested).
- localStorage seed key is `yourai_document_vault_v2` — bumped 2026-04-27 to force re-seed with `content` + `sampleUrl`. If a tester sees old vault entries without "Use" working, they need a hard refresh + clear of stale `_v1` keys.
- "Source pill" refers to the badge on the rendered card. Cards flip to empty-state shell when the LLM returns a schema-shaped envelope with no real data (uniform detection rule — see `card-empty-state-pattern.md`).
- All 7 LLM-backed card intents force `response_format: json_object` at the Edge. The 8th (`find_document`) short-circuits client-side.

---

## Section A — Card-intent happy paths (one per LLM-backed card intent)

These should each produce a populated card. They assume the relevant vault doc is "Use"d before sending — confirms the doc-inlining pipeline AND the per-intent JSON schema both work.

### A1 — `document_summarisation` (SummaryCard)

- **State**: Acme MSA "Use"d on the thread; intent = Document Summarisation (or auto-switch via "summarise this").
- **Prompt**: `Summarise this contract — give me parties, dates, governing law, key obligations, and the biggest risk.`
- **Expected**: SummaryCard renders. `documentName` populated ("Master Services Agreement — Acme Corp"). `executiveSummary` is 2-4 sentences in plain English. `metadata.parties` lists Acme + Marsh, Bell & Co. `metadata.governingLaw` = New York or similar. `keyPoints` array has 3-6 bullets. `flag` mentions §7.3 IP indemnity uncapped (the seed text flags this in the doc itself). Source pill = "doc". Streaming completes without garbled trailing chars (decoder flush).
- **Edge case**: tests doc-inlining + card schema population + flag detection.

### A2 — `clause_comparison` (ComparisonCard)

- **State**: Two docs in thread (e.g. Acme MSA + Schedule A SLAs both "Use"d). Intent = Clause Comparison (or auto via "compare these").
- **Prompt**: `Compare the limitation of liability and indemnification clauses across these two documents.`
- **Expected**: ComparisonCard with `doc1Name` + `doc2Name` populated, `rows` array containing at least limitation-of-liability and indemnification entries. Each row has `doc1` + `doc2` with `verdict` (better/worse/neutral) + `text`. `recommendation` is one sentence. Source pill = "doc" or "workspace".
- **Edge case**: multi-doc context (additive uploads in send pipeline) reaches Edge as labelled `Document 1 / Document 2`.

### A3 — `case_law_analysis` (CaseBriefCard)

- **State**: General chat, intent = Case Law Analysis. No doc attached (KB-backed flow is OK; for a doc flow, attach a court decision PDF).
- **Prompt**: `Analyse Hadley v Baxendale — what's the holding and how does it apply to consequential damages clauses today?`
- **Expected**: CaseBriefCard with `caseName` "Hadley v Baxendale", `court` filled, `date` (1854 or similar), `rows` array including Parties / Court / Date / Issue / Holding / Reasoning. `precedence.tags` populated. `application` paragraph relates the holding to modern consequential-damages clauses. Source pill = "kb" (no doc attached).
- **Edge case**: tests case-name handling without fabrication. The bot MUST NOT invent case dockets or fabricate quotes.

### A4 — `legal_research` (ResearchBriefCard)

- **State**: General chat. Intent = Legal Research.
- **Prompt**: `Force majeure precedents in New York commercial leases — what's the doctrine post-2020?`
- **Expected**: ResearchBriefCard with `topic` populated, `jurisdiction` = "New York", `stats` block with statute / case / principle counts, `sections` array containing the four standard sections (Applicable Statutes / Relevant Case Law / Key Principles / Practical Implications). Citations are short strings inside each section's `citations` array. Source pill = "kb".
- **Edge case**: tests KB-backed flow. The bot must hedge or omit citations it isn't confident about (anti-fabrication rule). Watch for invented case names.

### A5 — `risk_assessment` (RiskMemoCard)

- **State**: Acme MSA "Use"d. Intent = Risk Assessment.
- **Prompt**: `Generate a risk memo on this contract — flag any one-sided provisions or unusual exposure.`
- **Expected**: RiskMemoCard with `matterName` + `documentName` set. `executiveSummary` is 2-3 sentences. `findings` array has at least 2 entries (severity high/medium/low, location like §7.2, owner like "Deal team", optional verbatim quote, recommendation). The §7.3 IP indemnity uncapped flag in the seed text should surface as a high-severity finding. Source pill = "doc".
- **Edge case**: tests EditorialShell card render + `Array.isArray(findings)` guard + verbatim-quote handling.

### A6 — `clause_analysis` (ClauseAnalysisCard)

- **State**: Acme MSA "Use"d. Intent = Clause Analysis.
- **Prompt**: `Walk me through the clauses in this agreement — flag the high-risk ones first.`
- **Expected**: ClauseAnalysisCard with `clauses` array. Each clause has `title`, `location`, `risk` (high/medium/low), optional `quote`, `interpretation`, optional `recommendation`. HIGH-risk clauses appear first per workflow-prompt convention (priority ordering). At least limitation-of-liability and indemnification show up. Source pill = "doc".
- **Edge case**: tests the priority-ordering rule + per-clause schema completeness. `Array.isArray(clauses)` guard required.

### A7 — `timeline_extraction` (TimelineCard)

- **State**: Series B Term Sheet "Use"d. Intent = Timeline.
- **Prompt**: `Extract the timeline — list every dated event in chronological order.`
- **Expected**: TimelineCard with `events` array. Each event: `date` (preserves source format), `kind` (event/deadline/milestone/filing), `label`, optional `description`, optional `source` reference. Source pill = "doc".
- **Edge case**: `Array.isArray(events)` guard. Date-string format preservation. Empty case (no dated events) MUST trigger "No dated events found" empty state — but with the term sheet, expect 3+ events.

---

## Section B — `find_document` intent (3 prompts including trailing-phrase shape)

The 8th card intent. Client-only — no Edge round-trip. Tests the trigger-word stripping + folder-path search + variant-aware FileResultsCard.

### B1 — Plain trigger

- **State**: General chat. No doc attached.
- **Prompt**: `find Series B term sheet`
- **Expected**: Auto-switch to Find Document intent (keyword detection from general_chat). FileResultsCard renders with `query = "series b term sheet"`, single-result variant showing the Series B Term Sheet row. `Use` button on the row dispatches `yourai:vault-use-doc` window event → vault doc attaches to thread.
- **Edge case**: keyword-anchor detection (verb + noun anchor combo).

### B2 — Trailing-phrase shape (the canonical test)

- **State**: General chat.
- **Prompt**: `find Series B term sheet from my document vault`
- **Expected**: Trigger-word stripping correctly handles `"from my document vault"` (longest-trailing-phrase consumed FIRST in `FIND_DOC_TRAILING` array, so it beats `"from my vault"`). Resulting query = `"series b term sheet"`. Same single-result FileResultsCard as B1.
- **Edge case**: this is the trailing-phrase hotfix from today (2026-04-28). Without it, the query would be `"series b term sheet from my document"` and find no match. **High value test — re-run after any change to `stripFindDocTriggers`.**

### B3 — Trailing punctuation + article

- **State**: General chat.
- **Prompt**: `do i have any docs about acme?`
- **Expected**: Trailing `?` stripped first via `q.replace(/[?!.,;:]+$/g, '')`. Trigger prefix `"do i have any"` stripped. Noun anchor `"docs"` stripped. Particle `"about"` stripped. Resulting query = `"acme"`. FileResultsCard returns Acme MSA + Schedule A SLAs (folder path `Contracts › Acme Corp` matches via folderPath check). Variant = "2-5 results".
- **Edge case**: punctuation + article + noun + particle stripping order. Folder-path search match.

### B4 (bonus) — Empty query after stripping

- **State**: General chat.
- **Prompt**: `do i have any documents`
- **Expected**: After stripping prefix + noun, query is empty. FileResultsCard renders `"What file are you looking for?"` prompt variant (queryWasStripped + empty query, vault not empty).
- **Edge case**: tests `queryWasStripped` flag + empty-query branch.

---

## Section C — MISSING_DOCUMENT_HANDLING branch

A card-intent prompt with NO document attached. Edge's MISSING_DOCUMENT_HANDLING block in the system prompt should fire BEFORE the off-topic refusal — bot asks for upload, doesn't refuse.

### C1 — Missing-doc upload prompt

- **State**: General chat empty thread, NO doc attached, intent = Document Summarisation (manually pilled).
- **Prompt**: `Summarise this contract — focus on the key obligations.`
- **Expected**: Bot streams a short upload-prompt that:
  - Echoes the user's task back (e.g. *"I'd be glad to summarise that contract for the key obligations."*)
  - Tells them to upload via the **+** button next to the input
  - Total length ≤ ~50 words
  - Does NOT use the off-topic refusal copy ("I'm a legal assistant and can only help with legal matters…").
- **Edge case**: this is the prose-branch fix. Companion is C2 (the JSON-branch fix).

### C2 — Card empty-state branch (LLM returns JSON anyway)

- **State**: Same as C1 — NO doc, intent = Risk Assessment (forces JSON via `response_format: json_object`).
- **Prompt**: `Generate a risk memo for this contract.`
- **Expected**: LLM returns a schema-shaped envelope with empty strings + empty `findings` array. RiskMemoCard's `isEmpty` check fires (`findings.length === 0 && !data?.matterName?.trim() && !data?.executiveSummary?.trim() && !data?.documentName?.trim()`). Card renders with retargeted header ("No document supplied") + paragraph telling user to upload via **+** + muted hint pointing to a sibling intent (Clause Analysis). Footer source = "—". **Does NOT render a grid of dashes.**
- **Edge case**: `response_format: json_object` forces JSON even with no data. Both C1 and C2 must hold because the LLM picks prose vs JSON unpredictably even with the flag set.

---

## Section D — Off-topic guardrail

### D1 — Pure trivia refusal

- **State**: General chat.
- **Prompt**: `What's LeBron James's height?`
- **Expected**: Bot replies with the LITERAL refusal copy from the Edge prompt: *"I'm a legal assistant and can only help with legal matters. Is there a contract, regulation, or case I can help you with?"* Single short sentence. No card. No prose elaboration.
- **Edge case**: tests the OUT-OF-SCOPE list. Watch for the bot drifting into helpful prose.

### D2 — Edge-of-scope (should ANSWER, not refuse)

- **State**: General chat.
- **Prompt**: `What are the federal rules of California?`
- **Expected**: Bot interprets this charitably (the IN SCOPE block bias "WHEN IN DOUBT, ANSWER") and either asks a clarifying question or answers about state law / FRCP applicability in California federal courts. Does NOT refuse with the off-topic copy.
- **Edge case**: this exact phrasing was the case that broke the prior guardrail (DEC 2026-04-23 — "loosened off-topic guardrail"). Re-run this whenever the Edge prompt is touched.

---

## Section E — Ambiguous intent / multi-pick suggestion banner

### E1 — Ambiguous between two intents

- **State**: General chat. Watch the suggestion banner area below the input as the user types.
- **Prompt**: `analyse clauses and compare to standard NDA`
- **Expected**: Banner debounces 600ms after typing stops. Multi-pick variant fires because the prompt keyword-matches BOTH `clause_analysis` ("analyse clauses") AND `compare_against_standard` (which is a workflow operation, not a card intent — actual card intent here would be `clause_comparison` matched by "compare"). Banner shows multiple intent pills; user can pick. If user sends without picking, the highest-priority match wins (per `PRIORITY_ORDER` — `clause_analysis` ranks above `clause_comparison`).
- **Edge case**: tests `detectAllIntents` multi-match logic + UI multi-pick. **The banner should not block sending** — sending without picking is a fallthrough to priority resolution.

### E2 — General chat → auto-switch

- **State**: General chat. Acme MSA "Use"d.
- **Prompt**: `summarise this`
- **Expected**: Auto-switch fires (current intent is `general_chat`, message keyword-matches `document_summarisation` keywords). System note "Switched to Document Summarisation mode" appears in thread (or similar). Subsequent send goes through the document_summarisation card path → SummaryCard renders.
- **Edge case**: tests cross-intent auto-switch on the first message AND that the auto-switch survives into the same send (intentForFind / activeIntent state synchronisation).

---

## Section F — Additive mid-thread upload

### F1 — Inline note + Start-fresh escape hatch

- **State**: Active thread with one doc already attached (e.g. Acme MSA used). Bot has replied at least once.
- **Action**: Drag a second doc into the input (e.g. `Employee_Handbook_2026.pdf`) and let extraction complete.
- **Expected**: NO block. Inline thread system note appears: *"Added Employee_Handbook_2026.pdf · Document 2 — New topic? Start fresh →"*. Clicking "Start fresh" dispatches `yourai:start-new-chat` window event; ChatView's top-level listener calls `handleNewThread` → fresh chat. The new doc gets labelled `Document 2 (added HH:MM): Employee_Handbook_2026.pdf` in the next system prompt sent to the Edge.
- **Edge case**: tests additive append (NOT replace) of `sessionDocContext`. Symptom of regression: bot says "I'd be glad to review that document. Upload using the + button…" even though both docs are visibly attached (means the doc-inlining didn't reach the Edge).

### F2 — Continued analysis after additive

- **State**: Following F1, do not click "Start fresh". Send a new message: `Compare these two documents.`
- **Expected**: Both docs reach the Edge labelled `Document 1 / Document 2`. Auto-switch to clause_comparison. ComparisonCard populated with both docs. Source pill = "doc".
- **Edge case**: confirms additive accumulation works end-to-end.

---

## Section G — Workflow operation literal-string check (sanity)

These can't be triggered from the chat surface alone — they fire from the workflow Run Panel. Keep in regression set as a reminder.

### G1 — Vague-doc protocol literal

- **State**: Run any workflow with a deliberately mismatched upload (e.g. "Contract Review" workflow, upload a financial statement instead).
- **Expected**: Each step's output begins with the LITERAL sentence `**Not covered by supplied documents.**` followed by a one-sentence reason, then partial analysis.
- **Edge case**: QA tests check for the EXACT string. If a prompt edit rephrased it ("This document does not cover…"), this test fails. The string is canonical.

---

## How to extend this set

When a chat bug is found:

1. Reproduce it minimally — what was the user state (intent / vault attach / thread state)? What was the literal prompt?
2. Add a new entry under the relevant section (or create a new section if it's a new class).
3. Capture: state, prompt text, expected behaviour (specific copy strings or card fields), the edge case being tested.
4. Note the commit / date that introduced the fix so we know when to suspect regression.

## Last updated

**2026-04-28** — Initial seed. Covers all 7 LLM-backed card intents (Section A), the new `find_document` client-only intent including the trailing-phrase shape (Section B), MISSING_DOCUMENT_HANDLING branch + card empty-state (Section C), off-topic guardrail (Section D), ambiguous-intent multi-pick + auto-switch (Section E), additive mid-thread upload + Start-fresh escape hatch (Section F), and a vague-doc protocol literal-string sanity reminder (Section G). 17 prompts total across the sections.
