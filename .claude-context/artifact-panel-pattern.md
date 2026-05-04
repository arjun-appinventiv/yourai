# Artifact Panel Pattern — chip + right rail + markdown report

*Established 2026-05-04. Replaces the inline `IntentCard` rendering for the 7 card-intent responses. `find_document` keeps inline rendering — search results read better in the conversation flow.*

> **Why this exists:** card responses (Risk Memo, Summary, Comparison, Case Brief, Research, Clause Analysis, Timeline) used to dump their full editorial card into the chat thread — DM Serif title, "DOCUMENTS ANALYSED" sub-section with PDF tile, gold-railed finding blockquotes, severity pills. That blew out the conversation flow and felt like a UI showpiece, not a deliverable. PM read: *"looks like a front-end component, should look like a report — not fancy shit."*

## Architecture overview

```
                ┌──────────────────────────────────┐
                │  ChatView                         │
                │                                   │
   chat-main ──►│  ┌────────────────┐               │
                │  │ MessageBubble  │               │
                │  │  ┌──────────┐  │               │
                │  │  │ Chip     │──┼──── click ──► sets activeArtifactMsgId
                │  │  └──────────┘  │               │
                │  └────────────────┘               │
                │                                   │
                │  (chat-main flex: 1, minWidth: 0) │
                └──────────────────────────────────┘
                                      ▲ siblings (chat shrinks)
                                      ▼
                ┌──────────────────────────────────┐
                │  IntentArtifactPanel             │
                │   ┌───────────────────────────┐  │
                │   │ HEADER                    │  │
                │   │  RISK MEMO                │  │
                │   │  Risk memo · Copy / ⛶ / ✕ │  │
                │   └───────────────────────────┘  │
                │   ┌───────────────────────────┐  │
                │   │ BODY (ReactMarkdown)      │  │
                │   │  # Meridian Capital NDA   │  │
                │   │  ## Executive summary     │  │
                │   │  paragraph…              │  │
                │   │  > blockquote             │  │
                │   │  ## Findings              │  │
                │   │  ### High severity (3)    │  │
                │   │  **1. Non-compete…**     │  │
                │   └───────────────────────────┘  │
                │  width: 540, flex-shrink: 0      │
                └──────────────────────────────────┘
```

## Files

| File | Role |
|---|---|
| `src/components/chat/IntentArtifactPanel.tsx` | The right-docked panel chrome (header + scrollable body). Renders markdown via `ReactMarkdown`. |
| `src/lib/cardToMarkdown.ts` | Per-intent serializers turning card JSON → markdown. Plus `pickTitle()` and `isGenericTitle()` helpers. |
| `src/pages/chatbot/ChatView.jsx` | Owns `activeArtifactMsgId` state. Renders the chip in `MessageBubble` (only when `isCardIntent(msg.intent) && msg.cardData && msg.intent !== 'find_document'`). Mounts the panel as a sibling of chat-main (`flex: 1, minWidth: 0` on chat-main means it shrinks naturally). |

## State

```js
// In ChatView
const [activeArtifactMsgId, setActiveArtifactMsgId] = useState(null);
```

- **Auto-opens** on new card response: in `sendMessage`'s success path AND in the `demoMap` slash-command branch, after `setMessages([...prev, botMsg])`, call `setActiveArtifactMsgId(botMsg.id)` if `cardData && isCardIntent(botIntent) && botIntent !== 'find_document'`.
- **Click chip → opens** the panel for that message: `MessageBubble` receives `onOpenArtifact` and `isActiveArtifact` props. Chip's `onClick` calls `onOpenArtifact(msg.id)`.
- **Close button** sets `activeArtifactMsgId(null)` (panel unmounts; chip stays).
- **Chip text** flips between "Open" (panel closed) and "Viewing" + navy dot (panel anchored to that message).

## Layout

The panel is a **flex sibling** of chat-main, not a portal/overlay. Chat-main is `flex: 1, minWidth: 0` so it shrinks when the panel mounts. Panel is `width: 540, flexShrink: 0`.

```jsx
<div style={{ flex: 1, display: 'flex', ... }}>  {/* main row */}
  <div style={{ flex: 1, display: ..., minWidth: 0 }}>  {/* chat-main */}
    {/* messages, input */}
  </div>

  {activeArtifactMsgId && (() => {
    const m = messages.find((m) => m.id === activeArtifactMsgId);
    if (!m?.cardData || !isCardIntent(m.intent) || m.intent === 'find_document') return null;
    return <IntentArtifactPanel intent={m.intent} data={m.cardData} onClose={() => setActiveArtifactMsgId(null)} />;
  })()}
</div>
```

The same conditional check (`!showTeamPage && !showWorkspacesPanel && ...`) applies as for `WorkflowRunPanel` — the panel hides when any full-page panel is open (Vault / KP / Workspaces / Team / Workflows / editing-workflow).

## Body rendering — markdown, NOT IntentCard

The panel body uses `ReactMarkdown` to render the output of `cardDataToMarkdown(intent, data)`. Styling lives inline in `IntentArtifactPanel.tsx` and follows a clean memo / Notion-doc / Word-file convention:

- **Body font**: `'DM Sans', sans-serif`, 14 px, line-height 1.7, color `--text-primary`
- **H1**: DM Serif Display, 28 px, weight 400, color `--navy`, line-height 1.2, letter-spacing -0.01em — ONE per artifact, the matter / case / topic title
- **H2**: 16 px, weight 600, color `--navy`, with `border-bottom: 1px solid var(--border)`, margin-top 28 px — section dividers
- **H3**: 14 px, weight 600, color `--text-primary` — subsections (per-finding, per-clause, severity groups)
- **p**: margin 0 0 12 px, line-height 1.7
- **ul / ol**: paddingLeft 22, margin 8/14 px
- **strong**: weight 600, color `--text-primary`
- **em**: italic, color `--text-secondary`
- **blockquote**: `border-left: 3px solid var(--border)`, background `#FAFAF6`, padding 10/16 px, color `--text-secondary`, margin 14 px — used for highlight quotes and per-finding citations
- **code**: `'IBM Plex Mono'`, 12.5 px, background `#F4F4EE`, padding 1/5 px — used for `§` references
- **hr**: `border-top: 1px solid var(--border)`, margin 24 px

Body padding: `28px 32px` (default), `32px max(32px, calc(50vw - 360px))` (fullscreen — gives a centered ~720 px column).

## Per-intent markdown serializers

Each card intent has a serializer in `cardToMarkdown.ts` that turns its JSON envelope into a markdown report. Pattern:

```ts
function riskMemoToMd(d: any): string {
  if (!d) return '';
  const lines: string[] = [];
  lines.push(`# ${pickTitle(d, 'Risk memo')}`);

  // Meta line — Document, page count, size, upload label
  const metaParts: string[] = [];
  if (nonEmpty(d.documentName)) metaParts.push(`**Document:** ${d.documentName}`);
  if (nonEmpty(d.documentMeta)) metaParts.push(d.documentMeta);
  if (metaParts.length) lines.push(metaParts.join(' · '));

  // Sectioned content
  if (nonEmpty(d.executiveSummary)) {
    lines.push('', '## Executive summary', '', d.executiveSummary);
  }

  // Highlight quote → blockquote
  if (d.highlightQuote && nonEmpty(d.highlightQuote.quote)) {
    lines.push('', `> ${d.highlightQuote.quote}`);
    if (nonEmpty(d.highlightQuote.caption)) lines.push(`> — *${d.highlightQuote.caption}*`);
  }

  // Findings grouped by severity, each as h3 + bold label + blockquote + recommendation
  // …

  return lines.join('\n');
}
```

**Conventions when adding a new serializer:**

1. **Always start with `pickTitle(d, 'Fallback Label')` for the H1.** Never use raw `d.matterName` — the LLM hallucinates generic titles for trivial prompts. `pickTitle` rejects ~15 known generic phrases and falls back to documentName / sourceName / the supplied label.
2. **Meta line** as a single line of `·`-separated facts beneath the H1. Bold the field name when it makes sense (`**Document:** Acme_NDA_v2.pdf`).
3. **Sections as H2.** Don't introduce H1s in the body — the title is the only H1.
4. **Quotes from the source doc → blockquote**. Add a citation as `> — *Section X · author*` underneath if the schema carries it.
5. **Findings / clauses / events** → H3 per item, bold label, optional metadata as a `Location: §X · Owner: Y` line, blockquote for the quoted source, paragraph for the analysis, `**Recommendation.** …` paragraph at the end.
6. **Tables** → bullet pairs, NOT GFM tables. We don't load `remark-gfm` (avoids a dependency). Comparison serializer demonstrates the bullet-pair pattern.
7. **Footer** with `*Generated just now*` when the schema carries `generatedLabel`. Use a `---` `<hr>` separator above it.
8. **Empty data** → return early with `if (!d) return ''`. The panel shows `*No content.*` if markdown is empty.
9. **Never throws.** Wrap risky transforms in try / catch and fall back to the generic JSON dump (`genericToMd`).

## `pickTitle` heuristic

Generic LLM-emitted titles to detect (in `GENERIC_TITLE` regex):

- `Risk Memo / Risk Assessment / Risk Analysis / Risk Review / Risk Report` (with optional "of …")
- `Clause Comparison / Clause Analysis` (with optional "of …")
- `Case Law Brief / Case Brief / Case Analysis` (with optional "of …")
- `Research Memo / Research Brief / Research Report / Legal Research`
- `Summary of … / Document Summary / Document Summarisation`
- `Timeline of …`
- `The document / This document / Uploaded documents / Attached documents`
- `Untitled (case|matter|document)`
- `Legal Inquiry / General Inquiry / Legal Matter / General Matter`
- `N/A`

`pickTitle(d, fallback)` flow:

1. Try `d.matterName` / `d.caseName` / `d.topic` — return if any is non-empty AND non-generic.
2. Try `d.documentName` / `d.sourceName` — return if any is non-empty AND non-generic, with `.pdf` / `.docx` / `.txt` etc. extension stripped.
3. All candidates generic or empty — return the first non-empty (still better than nothing) or the supplied `fallback` label.

When you spot a new generic phrase the LLM emits, add it to `GENERIC_TITLE`.

## Chip rendering

In `MessageBubble`, the chip is a single `<button>` with:

- Icon tile (left, `var(--ice-warm)` bg + `<FileText>` icon)
- Eyebrow + title column (center): IBM Plex Mono uppercase eyebrow (`RISK MEMO`), DM Serif title (matter / document / "N findings")
- "Open" / "Viewing" pill (right): when `isActiveArtifact` is true, shows "Viewing" with a navy dot + light navy background

**Subtitle pickers** for the chip title come from `ARTIFACT_SUBTITLES` in `MessageBubble`:

- `risk_assessment` → matter / document / "N findings"
- `document_summarisation` → document / matter / "Sectioned takeaways"
- `clause_comparison` → matter / "N documents" / "Side-by-side"
- `case_law_analysis` → caseName / parties / matter / "Facts · Holding · Reasoning"
- `legal_research` → question / matter / "Authorities & holdings"
- `clause_analysis` → document / matter / "N clauses"
- `timeline_extraction` → matter / "N events"

When adding a new card intent, add a row to `ARTIFACT_LABELS` (panel header label) and `ARTIFACT_SUBTITLES` (chip subtitle picker) in MessageBubble.

## When NOT to use the panel

- **`find_document`** keeps inline rendering. Search results are list-shaped — they read better in the conversation flow than as a separate artifact. The chip pattern would feel weird ("Click to see results" when the list is itself a result).
- **General Chat / Legal Q&A** — these are prose responses, never card data. They render as markdown directly in the chat bubble.
- **The chit-chat-override path** — when the chit-chat intercept fires (card intent + greeting + no doc), the bot intent flips to `general_chat` and the response is prose. No artifact panel.

## Adding a new card intent — checklist

1. Add the intent ID to `CARD_INTENTS` in `IntentCard.tsx`.
2. Add the schema definition somewhere reasonable (existing pattern: per-card `*CardData` type).
3. Update the Edge function (`api/chat.ts`) to enforce the schema via `response_format: json_object` for this intent.
4. Add a serializer to `cardToMarkdown.ts`:
   - `intentNameToMd(d: any): string` returning markdown
   - Wire it in the `cardDataToMarkdown` switch
   - Use `pickTitle(d, 'Display Label')` for the H1
5. Add chip metadata in `MessageBubble`:
   - `ARTIFACT_LABELS` (used for the panel header label and chip eyebrow)
   - `ARTIFACT_SUBTITLES` (used for the chip subtitle)
6. Add panel header eyebrow + label in `IntentArtifactPanel.tsx` (`INTENT_LABELS` + `INTENT_EYEBROWS`).
7. Add a mock fixture in `src/lib/mockCardData.ts` and a `/demo-foo` slash command in `ChatView.jsx`'s `demoMap` so PM/QA can preview without an Edge round-trip.
8. Test: `/demo-foo` → chip renders, panel auto-opens, markdown report has h1 + h2 sections, no card chrome leaks. Click chip after closing → reopens. Switch to another `/demo-*` → panel updates.

## Related conventions

- **Doc-source confirmation** (CLAUDE.md): when card intent + already-attached docs, bot pauses and asks "use attached or upload new?" via prose. The panel only opens after the analysis runs (i.e. after the user clicks "Yes, use it").
- **Chit-chat → general_chat override** (CLAUDE.md): when card intent + chit-chat + no doc, bot intent flips to general_chat and the response is conversational prose. No panel mounts.
- **Card empty-state pattern** (`card-empty-state-pattern.md`): still relevant for `find_document` (inline) and for the markdown serializers' "no real data" handling. The Risk Memo serializer detects `no documentName AND no findings AND no highlightQuote` and renders an upload-prompt body.
