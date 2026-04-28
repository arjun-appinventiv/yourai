# Intent Response Cards — Per-Card Scope Reference

**Date extracted**: 2026-04-28
**Branch**: `claude/great-banach`
**Source files**:
- `src/components/chat/cards/IntentCard.tsx` — dispatcher (`CARD_INTENTS`, `isCardIntent`, `tryParseCardData`)
- `src/components/chat/cards/CardShell.tsx` / `CardHeader.tsx` / `CardFooter.tsx` — older shared chrome (4 + 1 cards)
- `src/components/chat/cards/EditorialShell.tsx` — newer shared chrome (3 cards), exports `EditorialShell`, `EditorialHeader`, `EditorialFooter`, `Body`, `SectionTitle`, `CapsLabel`, `DocumentCard`, `PullQuote`, `SeverityPill`, `StatusPill`, `COLORS`, `MONO`, `SERIF`, `SANS`
- `src/components/chat/cards/SummaryCard.tsx`, `ComparisonCard.tsx`, `CaseBriefCard.tsx`, `ResearchBriefCard.tsx` — older 4 on `CardShell`
- `src/components/chat/cards/RiskMemoCard.tsx`, `ClauseAnalysisCard.tsx`, `TimelineCard.tsx` — newer 3 on `EditorialShell`
- `src/components/chat/cards/FileResultsCard.tsx` — client-only vault search card on `CardShell`
- `api/chat.ts` — Edge `CARD_SCHEMAS` (one per card-rendering intent) + `response_format: json_object` enforcement
- `src/pages/chatbot/ChatView.jsx` — intent dispatch, auto-switch, `find_document` short-circuit
- `src/lib/intentDetector.ts` — keyword tables that drive auto-switch
- `.claude-context/card-empty-state-pattern.md` — uniform empty-state detection rule

Intent cards are the structured-JSON response surface of the YourAI chat. When the user's active intent is a "card intent" (one of 8), the chat pipeline forces the LLM to return a card-shaped JSON envelope, the client parses it, and the matching card component renders the data inside one of two shared shells. The pipeline is: user types → `ChatView` classifies the active intent (manual pill or auto-switch from `general_chat`) → POSTs `{ message, history, intent }` to `/api/chat` → Edge function injects `CARD_SCHEMAS[intent]` into the system prompt and calls OpenAI with `response_format: json_object` → client parses the stream via `tryParseCardData` (falls back to markdown on parse failure) → `IntentCard` dispatcher routes by intent id to one of the 8 card components. Two shells coexist for historical reasons: the older 4 (`SummaryCard` / `ComparisonCard` / `CaseBriefCard` / `ResearchBriefCard`) use `CardShell` + `CardHeader` + `CardFooter`; the newer 3 (`RiskMemoCard` / `ClauseAnalysisCard` / `TimelineCard`) use `EditorialShell` + `EditorialHeader` + `EditorialFooter` and the editorial typography helpers; `FileResultsCard` is the newest addition and was built on `CardShell` with custom inline button styles.

---

## Shared chrome

All 8 cards render through the unified `EditorialShell` family as of the 2026-04-28 migration. The older `CardShell` / `CardHeader` / `CardFooter` files were deleted (no remaining importers — the shadcn `src/components/ui/card.tsx` is a separate component unrelated to the intent-card system).

### `EditorialShell`

**Props**:
- `children`
- `accentColor?: string` — CSS color string or gradient. Defaults to gold so callers that don't override (Risk / Clause / Timeline) render unchanged. Migrated cards pass per-intent tokens.

**Behaviour**: white card body, 1 px `rgba(10,36,99,0.08)` navy-tinted border, 16 px radius, soft `0 2px 8px rgba(10,36,99,0.05)` shadow, overflow hidden. The top 3 px is the accent stripe (gradient or solid color string).

**Exports**:
- `ACCENTS` — token bundle: `gold | navy | green | indigo | teal` mapping to the historical `CardShell` palette gradients.

The shell module also exports a typography + token toolkit used by every card built on it:
- `COLORS` — `pageBg`, `panelBg`, `cardBg`, `border`, `title` (navy), `body`, `muted`, `faint`, `navy`, `gold`, `goldStrong`, plus three severity colour bundles (`severityHigh` / `severityMed` / `severityLow`) and three status bundles (`statusPass` / `statusFail` / `statusPartial`).
- `MONO`, `SERIF`, `SANS` — font-family strings.
- `Body` — `<p>` with DM Sans 15 px, `lineHeight: 1.75`, navy-tinted body colour.
- `SectionTitle` — gold vertical accent bar + DM Serif 22 px section heading.
- `CapsLabel` — small-caps mono label (use for "Documents analysed", etc.).
- `DocumentCard` — pill-style PDF reference card with name + meta line.
- `PullQuote` — gold-left-border italic quote block.
- `SeverityPill` — `'high' | 'medium' | 'low'` chip.
- `StatusPill` — `'pass' | 'fail' | 'partial'` chip.

### `EditorialHeader`

**Props**: `intentLabel: string` (mono 11 px gold-strong), `title: string` (DM Serif 28 px navy — visibly larger than the older `CardHeader`'s 20 px), `subtitle?: string`, `sourcePill?: { label: string; kind: 'doc' | 'kb' | 'workspace' }`. The eyebrow is smaller and tighter than `CardHeader`'s 13 px; this is a deliberate editorial-typography choice.

### `EditorialFooter`

**Props**: `footerText: string`, `onCopy?: () => void`, `onDownload?: () => void`. Renders `footerText` left, an optional `Copy` button + `Download PDF` button right. No coloured source dot — the source-name string lives inside `footerText` itself, prose-style (e.g. `"Generated 2 min ago · Ryan"` or `"Source: meridian_nda.pdf"`).

### Shared empty-state pattern

Every card detects "schema-shaped envelope with no real data" — the artefact of `response_format: json_object` forcing the LLM to return JSON even when no document was supplied — and renders an inline empty-state inside its normal shell instead of showing a grid of `—` dashes. Detection rule: **all schema-required string fields blank AND no `documentName` AND empty arrays** → render empty-state branch (upload prompt + sibling-intent hint). Per-card detection logic and copy is documented in `.claude-context/card-empty-state-pattern.md` (full template + per-card specifics).

---

## SummaryCard

**Intent ID**: `document_summarisation`
**Trigger**: explicit "Document Summarisation" pill OR auto-switch via keywords (`summarise this`, `summary of this`, `tldr`, `tl;dr`, `key points from`, `main points of`, `brief me on`, `overview of this`, etc.). See `INTENT_DEFAULTS.document_summarisation.keywords` in `src/lib/intentDetector.ts`.
**Source pill label**: `Document` · kind: `doc` (when `sourceType` is `doc`); `Knowledge Base` · kind: `kb` (when `sourceType` is `kb`).
**Accent color**: gold (`linear-gradient(to right, #C9A84C, #E8C96A)`)
**Shell**: EditorialShell

### Scope
Produces a single-document summary card: executive summary paragraph, four-cell metadata grid (Parties / Key Dates / Governing Law / Key Obligations), 3-8 enumerated key-point bullets, and an optional gold-accent "Needs attention" callout. Built for attorney-grade triage of a contract, memo, brief, or filing — the mental model is "give me a partner-ready overview of this document". Does NOT produce risk-rated findings (that's `RiskMemoCard`), clause-by-clause breakdowns (that's `ClauseAnalysisCard`), comparisons against a second doc (that's `ComparisonCard`), or chronologies (that's `TimelineCard`).

### Data shape
`SummaryCardData` — `documentName`, `clauseCount`, `fileSize`, `date` (header subtitle), `executiveSummary`, `metadata: { parties, keyDates, governingLaw, keyObligations }`, `keyPoints: string[]`, `flag: string | null`, `sourceType: 'doc' | 'kb'`, `sourceName`. Schema mirrored verbatim in `api/chat.ts:21` (`CARD_SCHEMAS.document_summarisation`). All metadata fields are required strings; `flag` and `keyPoints` may be empty.

### Render structure
`EditorialHeader` (gold accent, "Document Summarisation" eyebrow, document name title, "N clauses · size · date" subtitle) → executive-summary `<p>` (bottom border) → 2×2 metadata grid (`MetaBlock` cells, gold mono labels, navy values) → "Key Points" mono header → enumerated row list (`01. … 02. …`) → optional `Needs attention` flag → `EditorialFooter`. `keyPoints` is sliced to 8 max via `Array.isArray` guard.

### States
- **Populated**: full grid as described above.
- **Empty**: triggered when `!hasExecSummary && !hasAnyMeta && points.length === 0 && !data?.documentName`. Renders "No document supplied" + body copy directing to the `+` upload button + muted sibling-intent hint pointing to General Chat / Legal Q&A. Empty footer renders `footerText="—"`.
- **Partial / degraded**: not implemented. The card has no per-section degradation — it's all-or-nothing on the empty-state check.

### Edge cases / gotchas
- `keyPoints` defended with `Array.isArray` to survive a stray `undefined` from the LLM.
- Per-cell value falls back to `—` when blank.
- Multiline metadata respected via `whiteSpace: 'pre-line'` on `MetaBlock` value div.
- `flag` is rendered only when truthy; the gold border-left + `Needs attention —` prefix is a deliberate visual contrast against the data-dense grid above.

### Source files
- `src/components/chat/cards/SummaryCard.tsx`
- Schema in `api/chat.ts:21`

---

## ComparisonCard

**Intent ID**: `clause_comparison`
**Trigger**: explicit "Clause Comparison" pill OR auto-switch via keywords (`compare these`, `compare the two`, `compare both`, `difference between`, `which is better`, `side by side`, `contrast these`, `compare clause`, `compare contracts`, `compare documents`, etc.).
**Source pill label**: `Workspace` · kind: `workspace` (the card is hardcoded to render this regardless of incoming `sourceType`).
**Accent color**: navy (`linear-gradient(to right, #0B1D3A, #1E3A8A)`)
**Shell**: EditorialShell

### Scope
Side-by-side clause-level comparison of two documents. Each row maps a clause name to a `(verdict, text)` pair from each document, where verdict is `better` / `worse` / `neutral` and drives both the cell background tint and the tag pill (`↑ More favourable` / `↓ Less favourable` / `— Absent`). Closing one-sentence recommendation appears beneath the table. Built for "is the new MSA better than v1 on indemnification?" use-cases. Does NOT produce a risk memo, summarise either document standalone, or analyse a single document's clauses end-to-end.

### Data shape
`ComparisonCardData` — `doc1Name`, `doc2Name`, `clauseCount`, `rows: ComparisonRow[]`, `recommendation`, `sourceType: 'doc' | 'workspace'`, `sourceName`. Each `ComparisonRow` is `{ clause, doc1: { verdict, text }, doc2: { verdict, text } }`. Schema in `api/chat.ts:71`.

### Render structure
`EditorialHeader` (navy accent, "Clause Comparison" eyebrow, "Doc1 vs Doc2" title, "N clauses compared · 2 documents" subtitle) → 3-column header row (`130px 1fr 1fr`, navy background, gold-labelled `doc1Name` column) → row list (each row: clause label cell + two `DataCell` cells with verdict pill + text) → recommendation strip → `EditorialFooter`. `rows` defended with `Array.isArray`; verdict cells fall back to `'neutral'` if missing.

### States
- **Populated**: full table as described.
- **Empty**: triggered when `rows.length === 0 && !data?.doc1Name && !data?.doc2Name && !data?.recommendation`. Renders "No documents to compare" with a paragraph asking the user to attach both documents, plus a sibling-intent hint pointing to General Chat / Legal Q&A.
- **Partial / degraded**: not implemented.

### Edge cases / gotchas
- Header cells use a navy bar across the top of the table — distinct from the rest of the card's white body — so the rule "single-accent-per-card" is bent here, but only for the table header (the "navy = compare" mental cue).
- Verdict cell tint is a pale wash (`#F0FDF4` better, `#FFFBEB` worse, `#F9FAFB` neutral) over white — not jarring.
- The data cell renders `—` if `text` is empty.

### Source files
- `src/components/chat/cards/ComparisonCard.tsx`
- Schema in `api/chat.ts:71`

---

## CaseBriefCard

**Intent ID**: `case_law_analysis`
**Trigger**: explicit "Case Law Analysis" pill OR auto-switch via keywords (`analyse this case`, `analyze this case`, `case analysis`, `court decision`, `what happened in this case`, `this judgment`, `this judgement`, `ruling in`).
**Source pill label**: `Document` · kind: `doc` (always — pill props are hardcoded in the populated branch).
**Accent color**: green (`linear-gradient(to right, #059669, #10B981)`)
**Shell**: EditorialShell

### Scope
Briefs a court filing, opinion, or case memo: case name + court + date + subject in the header; a structured `[Parties / Court / Date / Issue / Holding / Reasoning]` row table (with `isHolding` rows rendered in italic DM Serif for emphasis); a precedence section with coloured tags; and a closing "Application to Your Matter" panel that frames how the case applies to the user's situation. Built for case-law triage during litigation prep, motion drafting, or research grounding. Does NOT search for cases by citation (use `legal_research`), summarise statutes, or compare cases — it briefs a single case the user supplied.

### Data shape
`CaseBriefCardData` — `caseName`, `court`, `date`, `subject`, `rows: CaseBriefRow[]`, `precedence: { tags: string[]; tagStyles: Array<'blue' | 'grey'>; note: string }`, `application`, `sourceType: 'doc'`, `sourceName`. Each `CaseBriefRow` is `{ label, value, isHolding? }`. Schema in `api/chat.ts:53`.

### Render structure
`EditorialHeader` (green accent, "Case Law Analysis" eyebrow) → grid table (`110px 1fr` for label/value rows; holding rows DM Serif italic, navy) → optional precedence row (tags + note) inside the same grid → blue "Application to Your Matter" panel below the grid → `EditorialFooter`. `rows` defended with `Array.isArray`.

### States
- **Populated**: full grid + precedence + application panel.
- **Empty**: triggered when `rows.length === 0 && !hasPrecedence && !data?.caseName && !data?.application`. Renders "No case document supplied" with body copy nudging the user to upload a filing/opinion/memo + sibling-intent hint pointing to Legal Research for citation lookups.
- **Partial / degraded**: not implemented (the precedence section can be omitted independently if `hasPrecedence` is false, but that's a normal sub-state, not a degradation).

### Edge cases / gotchas
- Schema includes `tagStyles: ['blue' | 'grey' | 'amber' | 'green']` (api/chat.ts:66) but the card only handles `'blue' | 'grey'` — `'amber'` and `'green'` fall through to grey via the `|| 'grey'` default. Fix is a 2-line `TAG_STYLE` map extension if needed.
- `isHolding` row rendering: italic DM Serif treatment means "highlight the legal conclusion" — used by the LLM as a visual anchor.

### Source files
- `src/components/chat/cards/CaseBriefCard.tsx`
- Schema in `api/chat.ts:53`

---

## ResearchBriefCard

**Intent ID**: `legal_research`
**Trigger**: explicit "Legal Research" pill OR auto-switch via keywords (`what does the law say`, `legal precedent`, `case law on`, `is it legal to`, `what are my legal rights`, `legal position on`, `find case law`).
**Source pill label**: `Knowledge Base` · kind: `kb`
**Accent color**: indigo (`linear-gradient(to right, #4338CA, #6366F1)`)
**Shell**: EditorialShell

### Scope
KB-backed legal research brief that answers a research question against the YourAI knowledge base — does NOT need an attached document. Renders a 4-column stat strip (statutes / cases / principles / jurisdiction counts) and 4 collapsible sections: Applicable Statutes, Relevant Case Law, Key Principles, Practical Implications. Each section carries markdown content (rendered via `react-markdown`) plus a list of citation chips. The last section auto-appends the "general legal information — not legal advice" disclaimer. First section auto-expands. Built for "what's the law on non-compete enforceability in NY?" type queries. Does NOT brief a specific user-supplied case (that's `case_law_analysis`) or analyse contract clauses.

### Data shape
`ResearchBriefCardData` — `topic`, `jurisdiction`, `sections: ResearchSection[]`, `stats: { statutes, cases, principles, jurisdiction }`, `sourceType: 'kb'`, `sourceName`. Each `ResearchSection` is `{ title, content (markdown), citations: string[] }`. Schema in `api/chat.ts:38`.

### Render structure
`EditorialHeader` (indigo accent, "Legal Research" eyebrow, topic title, "Jurisdiction · Global Knowledge Base" subtitle) → navy stat bar (4 cells, gold serif numbers, mono uppercase labels) → 4 collapsible sections (mono numbered circle + uppercase title; chevron rotates open/closed) → markdown body + citation chips → final "general legal information" disclaimer on the last open section → `EditorialFooter`. `sections` defended with `Array.isArray`.

### States
- **Populated**: full 4-section render.
- **Empty**: triggered when `sections.length === 0 && !data?.topic`. Different copy than the other cards because this intent is KB-backed — no upload required. Empty-state asks for a more specific question, with a worked example: *"Force majeure precedents in New York commercial leases, 2020–present"*. Hint mentions that attaching a document via `+` is also valid if the user wants research anchored to specific text.
- **Partial / degraded**: not implemented.

### Edge cases / gotchas
- Citations are rendered as blue chips inline at the end of each section.
- `<em>` tags inside the markdown content are restyled to DM Serif italic (navy) so emphasis pops in legal prose.
- Empty-state copy explicitly references the example query — KB-backed-only is the only card where the empty-state isn't "upload a document".

### Source files
- `src/components/chat/cards/ResearchBriefCard.tsx`
- Schema in `api/chat.ts:38`

---

## RiskMemoCard

**Intent ID**: `risk_assessment`
**Trigger**: explicit "Risk Assessment" pill OR auto-switch via keywords (`what are the risks`, `identify the risks`, `risk assessment`, `assess the risk`, `any red flags`, `risky clauses`, `risk analysis`, `should i sign this`, `flag the risks`, `risk memo`, `generate a risk memo`, `risk review`).
**Source pill label**: `Document` · kind: `doc`
**Accent color**: gold (hardcoded `EditorialShell` gold gradient — no per-card accent prop yet)
**Shell**: EditorialShell

### Scope
Narrative risk memo with findings grouped by severity. Header carries the matter name + document meta; a `Documents analysed` strip surfaces the source PDF; an executive summary opens with a drop-cap on the first character (`DropCapBody first`); an optional `PullQuote` highlights the most important verbatim finding; and the body is a `Findings` section grouped by severity (high / medium / low), each finding rendered as a card with title + location + owner + optional verbatim quote + recommendation. Built for partner-ready risk write-ups on contracts, NDAs, leases, agreements. Does NOT provide a clause-by-clause list (that's `ClauseAnalysisCard`) or chronological events (that's `TimelineCard`).

### Data shape
`RiskMemoCardData` — `matterName`, `documentName?`, `documentMeta?`, `pages?`, `size?`, `uploadedLabel?`, `executiveSummary`, `highlightQuote?: { quote, caption? }`, `trailingSummary?`, `findings: RiskFinding[]`, `sourceName`, `generatedLabel?`. Each `RiskFinding` is `{ title, severity: 'high' | 'medium' | 'low', location?, owner?, quote?, recommendation }`. Schema in `api/chat.ts:86`.

### Render structure
`EditorialHeader` (gold-strong eyebrow, DM Serif 28 px matter name, mono document meta subtitle, `Document` pill) → optional `Documents analysed` strip with `DocumentCard` → `Executive summary` `SectionTitle` + `DropCapBody` paragraph + optional `PullQuote` + optional `trailingSummary` paragraph → `Findings` `SectionTitle` + 3 `FindingGroup` blocks (one per severity, only rendered when count > 0) → `EditorialFooter` (`generatedLabel` or `Source: <name>`). `findings` defended with `Array.isArray`.

### States
- **Populated**: full memo as described.
- **Empty**: triggered when `findings.length === 0 && !data?.matterName?.trim() && !data?.executiveSummary?.trim() && !data?.documentName?.trim()`. Renders "No contract supplied" + upload nudge + sibling-intent hint pointing to Clause Analysis ("same input, shorter output").
- **Partial / degraded**: not implemented (no findings → renders "No material risks identified." inline italic).

### Edge cases / gotchas
- `DropCapBody` only applies the drop-cap when `children` is a string — a defensive check, not a feature flag.
- Severity colour-bordering: each finding card has a left border in the severity colour (`#991B1B` high, `#92400E` medium, `#065F46` low).
- The `PullQuote` is independent of the `findings` array — the LLM picks the most important finding to surface as a hero quote, separate from the structured list.

### Source files
- `src/components/chat/cards/RiskMemoCard.tsx`
- Schema in `api/chat.ts:86`

---

## ClauseAnalysisCard

**Intent ID**: `clause_analysis`
**Trigger**: explicit "Clause Analysis" pill OR auto-switch via keywords (`analyse clauses`, `analyze clauses`, `extract clauses`, `break down the clauses`, `walk me through the clauses`, `clause by clause`, `each clause`, `which clauses`, `list the clauses`, `clause analysis`, `analyse each clause`, `what clauses are in`, `breakdown of clauses`).
**Source pill label**: `Document` · kind: `doc`
**Accent color**: gold (hardcoded `EditorialShell` gold gradient)
**Shell**: EditorialShell

### Scope
Clause-by-clause structured breakdown of a contract or agreement. Header carries the matter name; a `Documents analysed` strip surfaces the source PDF; a 4-cell summary strip shows total clause count and per-severity counts (clauses / high / medium / low); the body is a list of expandable clause panels — each row exposes title + location + severity pill, expanded reveals optional verbatim quote + plain-English interpretation + optional recommendation. First high-risk clause auto-expanded (or first clause if no highs). Built for negotiating-prep workflows where the attorney needs to see each clause's risk level alongside the underlying language. Does NOT produce a narrative memo — for prose framing use `RiskMemoCard`.

### Data shape
`ClauseAnalysisCardData` — `matterName`, `documentName?`, `documentMeta?`, `pages?`, `size?`, `uploadedLabel?`, `clauses: Clause[]`, `sourceName`, `generatedLabel?`. Each `Clause` is `{ title, location, risk: 'high' | 'medium' | 'low', quote?, interpretation, recommendation? }`. Schema in `api/chat.ts:109`.

### Render structure
`EditorialHeader` → optional `Documents analysed` + `DocumentCard` → 4-cell `CountCell` summary strip (clauses / high / medium / low, each with a coloured severity number in DM Serif) → `Clause-by-clause` `SectionTitle` → list of expandable cards (`ChevronDown` / `ChevronRight` toggle, hover-to-expand pattern not used — explicit click) → expanded card body shows verbatim quote (gold-left-border italic), interpretation `Body`, optional gold-tinted recommendation block → `EditorialFooter`. `clauses` defended with `Array.isArray`.

### States
- **Populated**: full clause list as described.
- **Empty**: triggered when `clauses.length === 0 && !data?.matterName?.trim() && !data?.documentName?.trim()`. Renders "No contract supplied" + upload nudge + sibling-intent hint pointing to Risk Memo ("narrative memo instead of a clause list").
- **Partial / degraded**: not implemented.

### Edge cases / gotchas
- Auto-expand picks the first `risk === 'high'` clause; falls back to clause 0 if no highs.
- Toggle uses a `Set<number>` so multiple clauses can be open simultaneously (independent state per clause).
- Recommendation block uses the same gold-tinted `rgba(201,168,76,0.06)` background pattern as `PullQuote` — visual consistency cue between the editorial cards.

### Source files
- `src/components/chat/cards/ClauseAnalysisCard.tsx`
- Schema in `api/chat.ts:109`

---

## TimelineCard

**Intent ID**: `timeline_extraction`
**Trigger**: explicit "Timeline" pill OR auto-switch via keywords (`timeline of`, `chronology`, `chronological order`, `dates in this`, `key dates`, `build a timeline`, `extract the timeline`, `sequence of events`, `what happened when`, `list the events`, `litigation timeline`, `discovery timeline`, `deadlines in this`, `important dates`).
**Source pill label**: `Document` · kind: `doc`
**Accent color**: gold (hardcoded `EditorialShell` gold gradient)
**Shell**: EditorialShell

### Scope
Chronological event list extracted from a document. Header carries the matter name; a `Documents analysed` strip surfaces the source PDF; the body is a `Chronology` `SectionTitle` followed by a vertical-rail timeline with one entry per event — date + kind chip (event / deadline / milestone / filing) + source reference + DM Serif event label + optional description sentence. Highest-accuracy card when the source has explicit dates in the text. Built for litigation timelines (discovery deadlines, filing dates), corporate timelines (closing checklists), and case chronologies. Does NOT infer dates the source doesn't state — vague dates degrade to whatever format the source used (verbatim copy).

### Data shape
`TimelineCardData` — `matterName`, `documentName?`, `documentMeta?`, `pages?`, `size?`, `uploadedLabel?`, `events: TimelineEvent[]`, `sourceName`, `generatedLabel?`. Each `TimelineEvent` is `{ date, label, description?, source?, kind?: 'event' | 'deadline' | 'milestone' | 'filing' }`. Schema in `api/chat.ts:129`.

### Render structure
`EditorialHeader` → optional `Documents analysed` + `DocumentCard` → `Chronology` `SectionTitle` → vertical rail (2 px grey rule down the left side, dot per event coloured by kind, white shadow ring around the dot for visual separation) → per-event row (date + kind chip + optional source ref + DM Serif label + optional description) → `EditorialFooter`. `events` defended with `Array.isArray`.

### States
- **Populated**: full timeline rail.
- **Empty**: triggered when `events.length === 0 && !data?.matterName?.trim() && !data?.documentName?.trim()`. Renders "No document supplied" + upload nudge + sibling-intent hint pointing to Case Brief / Clause Analysis for documents without explicit dates.
- **Partial / degraded**: when the LLM returns matterName but no events, renders "No dated events found in the source." inline italic — soft-degrade instead of empty-state.

### Edge cases / gotchas
- Kind colour palette: event grey, deadline red (`#C65454`), milestone gold, filing blue. Defaults to `event` when `kind` missing.
- Events must arrive in chronological order — the card does NOT sort. Schema instructs the LLM to preserve source order.
- Date format is preserved verbatim from the source text — "March 14, 2025" / "3/14/25" / "Q2 2024" all valid.

### Source files
- `src/components/chat/cards/TimelineCard.tsx`
- Schema in `api/chat.ts:129`

---

## FileResultsCard

**Intent ID**: `find_document`
**Trigger**: explicit "Find Document" pill OR auto-switch via keywords (`find file`, `find files`, `find a file`, `find document`, `find documents`, `search for file`, `search my files`, `where is the file`, `where's the doc`, `do i have a file`, `do i have any documents`, `show me my files`, `list my documents`, `what files`, `in my vault`, `from my vault`, etc. — see `INTENT_DEFAULTS.find_document.keywords` in `src/lib/intentDetector.ts`). The `find_document` intent sits high in the priority list so vault-search anchors don't get drowned by `legal_qa` matches.
**Source pill label**: `Vault` · kind: `doc` (the card is hardcoded to render this; the underlying schema concept doesn't apply here).
**Accent color**: teal (`linear-gradient(to right, #0D9488, #14B8A6)`)
**Shell**: EditorialShell (window-event callbacks for `Use` / `Browse vault` actions)

### Scope
**This is the only client-only card** — there is no LLM round-trip. `ChatView.sendMessage` short-circuits before the `/api/chat` fetch when the active intent is `find_document` and renders the card from local vault state. The card surfaces matching documents from the user's personal vault as a row list, with state-aware variants for empty-vault / empty-query / no-match / 1-result / 2-5 results / 6+ results. Each row exposes `Use` (load the doc into the active chat session) and a global `Browse vault` ghost link. Built for "where's the Acme MSA?" use-cases inside chat, without forcing the user to leave the conversation. Does NOT search document content — name + description + fileName + folder breadcrumb only (deferred until the first user complaint or backend lands).

### Data shape
`FileResultsCardData` — `query` (post-trigger-strip), `rawQuery?` (original message), `results: FileResultRow[]` (top 5 already sliced), `totalCount`, `vaultIsEmpty?`, `queryWasStripped?`. Each `FileResultRow` is `{ id, name, fileName?, fileSize?, createdAt?, folderPath?, description?, content? }`. The card is dispatched with `data` plus optional `onUse` / `onBrowseVault` callback props on `IntentCard`. **No matching `CARD_SCHEMAS` entry in `api/chat.ts`** — this card never sees the Edge.

### Render structure
Branches on data shape:
- `vaultIsEmpty: true` → "Your vault is empty" + Upload-a-file primary teal button.
- `queryWasStripped` (or no query and no results) → "What file are you looking for?" + example query list + Browse-vault ghost button.
- `results.length === 0` → "No files match" + suggestion copy + Browse-vault ghost button.
- 1+ results → header "Top N of M files in your vault" / "M files in your vault" / "1 file in your vault" + row list (file icon + name + folder breadcrumb + size + date + `Use` button) + optional "View all M in Vault →" overflow footer.

`EditorialFooter` shows `footerText="Personal vault"` across every variant — the dynamic match count moved to the header title (`Top N of M files in your vault`) where it carries more semantic weight.

### States
- **Empty vault** — `vaultIsEmpty: true`. Highest priority branch.
- **Empty query** — `queryWasStripped` true (the trigger-stripping pipeline ate the entire message) OR `query` empty AND no results.
- **No matches** — vault has docs, query non-empty, but the substring filter returned 0 rows.
- **1 result** — single prominent row with the primary teal `Use` button.
- **2-5 results** — all rows rendered, each with its own `Use` button.
- **6+ results** — top 5 + "View all N in Vault →" overflow footer that opens the full Vault page pre-filtered with the user's query.
- **Partial / degraded**: not applicable — this card has no LLM-failure mode.

### Edge cases / gotchas
- **Trigger-stripping pipeline** in `ChatView.jsx` (`stripFindDocTriggers`): leading verb prefixes (`find`, `find my`, `where is`, `do i have`, `show me`, `list`, `search for`, `search my`, etc., longest-first) → leading articles (`the`, `a`, `an`, `my`, `any`) → leading noun anchors (`files`, `file`, `docs`, `doc`, `documents`, `document`) → leading particles (`called`, `named`, `titled`, `about`, `for`, `from`) → trailing vault-context phrases (`from my vault`, `in the document vault`, etc., longest-first). All steps lowercase-only; trailing punctuation `?!.,;:` stripped first.
- **`yourai:vault-use-doc` and `yourai:vault-browse` window events**: when `IntentCard` dispatches without explicit `onUse` / `onBrowseVault` callbacks (e.g. from `MessageBubble` which doesn't thread props), the card falls back to dispatching window CustomEvents. `ChatView` listens at the top level and routes the row's doc through the existing `handleSelectVaultDocument` (clean since the 2026-04-28 bug-fix commit) or opens the vault panel. Mirror of the `yourai:start-new-chat` event used by additive-upload notes.
- **Auto-switch from general_chat**: `ChatView.sendMessage` runs `detectIntent(trimmed, 'general_chat')` for messages ≥10 chars and switches to `find_document` BEFORE the short-circuit check — without this, "find Acme MSA" from general chat would fall through to the `/api/chat` fetch and the LLM would prose-answer instead of rendering the card.
- **Single shared `InlineButton` component** in-file (variant: `'primary' | 'outline'`) replaces the older trio of inline style objects (`primaryBtn` / `useBtn` / `ghostBtn`).

### Source files
- `src/components/chat/cards/FileResultsCard.tsx`
- Trigger-stripping + dispatch in `src/pages/chatbot/ChatView.jsx:4359` (`find_document` short-circuit branch)
- No `api/chat.ts` schema (client-only)

---

## Cross-card consistency notes

**RESOLVED 2026-04-28** in the EditorialShell-migration commit. All 8 cards now share a single shell (`EditorialShell` + `EditorialHeader` + `EditorialFooter`) with these unified properties:

- **Eyebrow font size**: 11 px mono uppercase, gold-strong, across every card.
- **Body padding**: `'26px 32px 28px'` for empty-state and result-row bodies. (Cards that compose multiple sections inside the body — e.g. `RiskMemoCard`, `ClauseAnalysisCard`, `TimelineCard` — use `'22px 32px'` per section to match the existing editorial cadence; this is intentional internal spacing, not chrome.)
- **Footer pattern**: text-only `EditorialFooter` with a free-form `footerText` prose string (e.g. `"Document: meridian_nda.pdf"`, `"Source: YourAI knowledge base"`, `"Personal vault"`, `"Generated 2 min ago · Ryan"`). The source-tier coloured-dot pattern from the older `CardFooter` is gone — the source-pill in the header (`kind: 'doc' | 'kb' | 'workspace'`) carries that information now.
- **Source pill prop name**: uniform `sourcePill.kind` across every card. The older `type` prop is removed.
- **Card border-radius**: 16 px everywhere.
- **Card border colour**: `rgba(10,36,99,0.08)` navy-tinted everywhere.
- **Title size**: DM Serif h2 28 px everywhere.
- **Accent stripe**: per-intent — `EditorialShell` now accepts an `accentColor` prop (defaults to gold so existing callers render unchanged). The 5 migrated cards pass an explicit accent: SummaryCard gold, ComparisonCard navy, CaseBriefCard green, ResearchBriefCard indigo, FileResultsCard teal. The 3 originally-editorial cards (Risk / Clause / Timeline) keep their gold default. Tokens are exported as `ACCENTS.gold | navy | green | indigo | teal` from `EditorialShell.tsx`.

The deleted `CardShell.tsx` / `CardHeader.tsx` / `CardFooter.tsx` files had no other importers; the shadcn `src/components/ui/card.tsx` is unrelated.
