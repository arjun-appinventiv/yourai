# Card empty-state pattern — reference note

> Established 2026-04-25. Load before adding a new card-rendering intent or touching empty-state behaviour on `SummaryCard` / `ComparisonCard` / `CaseBriefCard` / `ResearchBriefCard` / `RiskMemoCard` / `ClauseAnalysisCard` / `TimelineCard`.

## Why this exists

`api/chat.ts` injects a per-intent JSON schema and forces `response_format: json_object` when the client sends a card-rendering intent (`document_summarisation`, `clause_comparison`, `case_law_analysis`, `legal_research`, `risk_assessment`, `clause_analysis`, `timeline_extraction`). This guarantees the response is parseable JSON — but it also means the LLM **must** return a JSON envelope even when the user supplied no document and there's nothing to analyse. In that case the LLM produces a schema-shaped envelope with empty strings, empty arrays, and zero counts.

Before 2026-04-25 the cards rendered this envelope literally:
- `SummaryCard` → "Untitled document", "0 clauses · — ·", four `—` meta blocks, "No key points identified"
- `ComparisonCard` → "Document 1 vs Document 2", "No clauses to compare"
- `TimelineCard` → "No dated events found in the source"

…each surface read as broken even though the LLM did exactly what the schema asked.

The two-layer fix:
1. **Card empty-state** (this doc) — every card detects the empty envelope and replaces its body with a friendly "No document supplied" + upload-prompt + sibling-intent hint.
2. **Edge `MISSING DOCUMENT HANDLING` system-prompt branch** in `api/chat.ts` — for the prose branch when the LLM returns markdown instead of JSON.

Both layers are needed because the LLM picks prose vs. JSON unpredictably even with `response_format: json_object` set, and even when the schema is enforced there are still cases where the LLM emits prose first that gets caught by the markdown fallback in `tryParseCardData`.

## The detection rule (uniform across all 7 cards)

```ts
const isEmpty =
  // No primary-array data
  primaryArray.length === 0 &&
  // No subject identifier (name/topic/matterName/caseName/etc.)
  !data?.subjectField?.trim() &&
  // No prose summary populated
  !data?.summaryField?.trim() &&
  // No document name (the "I have a doc to analyse" signal)
  !data?.documentName?.trim();
```

Concrete per-card checks (current as of 2026-04-25):

| Card | `isEmpty` condition |
|---|---|
| `SummaryCard` | `!hasExecSummary && !hasAnyMeta && points.length === 0 && !data?.documentName` |
| `ComparisonCard` | `rows.length === 0 && !data?.doc1Name && !data?.doc2Name && !data?.recommendation` |
| `CaseBriefCard` | `rows.length === 0 && !hasPrecedence && !data?.caseName && !data?.application` |
| `ResearchBriefCard` | `sections.length === 0 && !data?.topic` |
| `RiskMemoCard` | `findings.length === 0 && !data?.matterName?.trim() && !data?.executiveSummary?.trim() && !data?.documentName?.trim()` |
| `ClauseAnalysisCard` | `clauses.length === 0 && !data?.matterName?.trim() && !data?.documentName?.trim()` |
| `TimelineCard` | `events.length === 0 && !data?.matterName?.trim() && !data?.documentName?.trim()` |

Note the mix of `trim()` and bare-truthy checks across cards — this is intentional. The 4 older cards (`SummaryCard`, `ComparisonCard`, `CaseBriefCard`, `ResearchBriefCard`) use bare truthy (`!data?.x`) because the LLM has been observed to return both `""` and missing keys; the 3 newer EditorialShell cards (`RiskMemoCard`, `ClauseAnalysisCard`, `TimelineCard`) use `?.trim()` to also catch whitespace-only strings, which the newer schemas have allowed through occasionally.

## The render template

When `isEmpty` is true, the card returns its normal shell with:

- **Header retargeted** to the missing-input condition. Use the same `intentLabel` as the populated card; change the `title` and `subtitle` to describe what's missing ("No document supplied" / "No documents to compare" / "Not enough to research yet").
- **One action paragraph** (DM Sans 15px, line-height 1.7) using the `Body` component (Editorial cards) or a styled `<p>` (CardShell cards). Tells the user to upload via the **+** button and re-ask. Always reference the **+** button literally — it's the icon next to the input.
- **One muted hint paragraph** (12-13px, `var(--text-muted)`) pointing to a sibling intent that might be what the user actually wanted. e.g. Risk Memo ↔ Clause Analysis, Legal Research for citation lookups, Case Brief for documents without dates.
- **Footer**: `CardFooter` / `EditorialFooter` retained for visual consistency with `sourceType="none"` / `sourceName="—"`.

### CardShell-based template (older 4 cards)

```tsx
if (isEmpty) {
  return (
    <CardShell accentColor="<existing-color>">
      <CardHeader
        intentLabel="<existing label>"
        title="No <subject> supplied"
        subtitle="<intent> needs <what>"
        sourcePill={{ label: 'Document', type: 'doc' }}
      />
      <div style={{ padding: '28px 28px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: 0 }}>
          Upload a <thing> using the <strong>+</strong> button next to the input,
          then ask again and I'll <produce what>.
        </p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
          <sibling-intent hint>.
        </p>
      </div>
      <CardFooter sourceType="none" sourceName="—" />
    </CardShell>
  );
}
```

### EditorialShell-based template (newer 3 cards)

```tsx
if (isEmpty) {
  return (
    <EditorialShell>
      <EditorialHeader
        intentLabel="<existing label>"
        title="No <subject> supplied"
        subtitle="<intent> needs <what>"
        sourcePill={{ label: 'Document', kind: 'doc' }}
      />
      <div style={{ padding: '26px 32px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Body>
          Upload a <thing> using the <strong>+</strong> button next to the input,
          then ask again and I'll <produce what>.
        </Body>
        <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
          <sibling-intent hint>.
        </div>
      </div>
      <EditorialFooter footerText={data?.generatedLabel || '—'} />
    </EditorialShell>
  );
}
```

## ResearchBriefCard is different

`legal_research` uses the global Knowledge Base as its source — there's no user upload required. So the empty state is **not** "upload a document"; it's "your question was too vague, try being more specific" with a worked example query:

> *"Force majeure precedents in New York commercial leases, 2020–present"*

Plus a muted hint that the user *can* attach a document if they want research anchored to it.

## Hardening note

The 3 EditorialShell cards (Risk / Clause / Timeline) also got `Array.isArray(data?.array) ? data.array : []` guards on their primary array fields. The pre-existing render code used `data.findings.length`, `data.clauses.findIndex`, `data.events.map` directly — if the LLM returned `undefined` for one of these fields, the render would crash. Always Array.isArray-guard at the top of the render and use the local copy throughout.

## Adding a new card-rendering intent

1. Add the schema to `CARD_SCHEMAS` in `api/chat.ts`.
2. Build the card in `src/components/chat/cards/<NewCard>.tsx`.
3. **Before writing the populated render**, write the `isEmpty` check + empty-state return at the top of the component. This is easy to forget and the failure mode (broken card on a valid empty response) is hard to spot in code review.
4. Wire it up in `IntentCard.tsx` (the dispatcher) and add it to the `isCardIntent()` allowlist.

## Related files

- `api/chat.ts` — `CARD_SCHEMAS` dict + the `MISSING DOCUMENT HANDLING` block in the system prompt (the prose-branch companion to this UX-branch fix).
- `src/components/chat/cards/IntentCard.tsx` — the dispatcher that picks which card to render based on intent + JSON parse success.
- `src/components/chat/cards/CardShell.tsx`, `CardHeader.tsx`, `CardFooter.tsx` — older shell components.
- `src/components/chat/cards/EditorialShell.tsx` — newer shell component used by Risk / Clause / Timeline.
