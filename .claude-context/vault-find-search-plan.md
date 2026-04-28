# Vault Find / Search — phasing plan (P8)

> Established 2026-04-27. Load before extending search behaviour in
> `DocumentVaultPanel`, the Ask-anything parser, or the filter chips.

## Origin

Wendy's killer query in the 2026-04-27 client interview:
> "What is the biggest at-close download I have?"

Two query shapes attorneys throw at us:

1. **Metadata** — "biggest file", "files I uploaded for Smith last
   month", "all PDFs over 200 pages", "everything Priya shared org-wide".
   Pure structured filtering + sorting over fields we already have on
   `VaultDoc`.
2. **Content / semantic** — "find that NDA with the 90-day non-compete",
   "all contracts with force majeure clauses", "which matters have
   motion hearings in the next 30 days". Needs a vector index +
   ingestion pipeline.

## Architectural decision: search lives INSIDE the vault page

Considered three positionings. Chose Option 2 (search built into the
existing Document Vault page, no new top-level surface) per Aashna's
critique: "users who think of vault as 'my folders' shouldn't have to
learn a second noun called 'Find' just to search across matters."

The toolbar's existing search input was promoted to the dual-purpose
**Search OR Ask anything** bar — gold sparkle icon, plain typing →
live substring filter, Enter / "Ask ✨" button → NL parser. Filter
chips (Date / Uploaded by / Type / Sort) sit below the hero.

## Phasing

| Phase | Scope | Status | Effort |
|---|---|---|---|
| **P8.1** Universal filter chips (Date · Uploader · Type · Sort) over `localStorage` | ✅ Shipped 2026-04-27 | — |
| **P8.2** Ask-anything NL parser via `/api/chat` JSON-only schema | ✅ Shipped 2026-04-27 | — |
| **P8.3** Real metadata enrichment (page count, mimeType, lastModified, auto-stamped `workspaceId`) | ⏸ Backlog | ~1.5 days |
| **P8.4** Content semantic search (pgvector index, ingestion-on-upload, hybrid BM25+vector) | ⏸ Backlog | ~2 weeks (backend-dependent) |

## Implementation notes (current state)

### Filter state lives inside `DocumentVaultPanel`

```ts
const [dateFilter, setDateFilter]    = useState('any');      // 'any' | '7d' | '30d' | 'year'
const [uploaderFilter, setUploaderFilter] = useState(null);  // null | userId
const [typeFilter, setTypeFilter]    = useState(null);       // null | 'pdf' | 'docx' | 'xlsx' | 'txt'
const [sortBy, setSortBy]            = useState('recent');   // 'recent' | 'name' | 'size-desc' | 'size-asc'
const [resultLimit, setResultLimit]  = useState(null);       // null = unlimited
const [askQuery, setAskQuery]        = useState('');
const [askLoading, setAskLoading]    = useState(false);
const [askExplanation, setAskExplanation] = useState('');
```

### Ask-anything schema

```json
{
  "search": string | null,
  "dateFilter": "any" | "7d" | "30d" | "year",
  "uploaderId": string | null,
  "fileType": "PDF" | "DOCX" | "XLSX" | "TXT" | null,
  "sortBy": "recent" | "name" | "size-desc" | "size-asc",
  "limit": number | null,
  "explanation": string
}
```

System prompt feeds the available uploaders + today's date so the
model can resolve "uploaded by Priya" or "this month". Falls back to
plain substring search on parse failure.

### Transient vs sticky filters

- **Transient** (set by Ask, cleared on user typing or All-documents click): `resultLimit`, `askExplanation`, `sortBy`.
- **Sticky** (explicit user choice via chips): `dateFilter`, `uploaderFilter`, `typeFilter`.

Why this distinction matters: the bug Arjun caught 2026-04-28 was
that "biggest file" set `resultLimit=1` + `sortBy=size-desc`, then
clicking "All documents" still showed 1 row. Transient filters are
specific to the AI-narrowed mode; sticky filters survive navigation
because the user explicitly set them.

`goToAllDocs()` and the toolbar input's `onChange` both drop the
transient set when the user signals they've moved on.

### What the search filter currently checks

`filteredDocs` memo greps `name + description + fileName`. **NOT
content.** `d.content` IS bundled on the seed docs (per
`SAMPLE_VAULT_CONTENT`) but the filter doesn't include it.

To enable content search, add `|| (d.content || '').toLowerCase().includes(q)`
to the filter chain. Trade-off: client-side substring across N×100K-char
strings gets laggy at scale. Defer until first user complaint or
backend lands.

### Sample seed PDFs

Real PDFs live in `public/sample-docs/`:
- `MSA_Acme_Corp_v4.pdf`
- `Employee_Handbook_2026.pdf`
- `SeriesB_TermSheet_Signed.pdf`
- `MSA_Acme_ScheduleA_SLAs.pdf` (nested under Acme Corp / MSA & Schedules)

Generated from `src/data/sampleVaultContent.ts` via `/tmp/gen-sample-pdfs.py`
(uses `fpdf2` — `python3 -m pip install --user fpdf2`). Re-run when the
sample text changes.

Each `DEFAULT_DOCUMENT_VAULT` entry carries:
- `content` — extracted text inlined into the user message when "Use" is clicked, so the AI grounds in real text
- `sampleUrl` — `/sample-docs/<filename>` for future download/view buttons

localStorage seed key bumped to `yourai_document_vault_v2` so existing
testers re-seed with the new fields.

## Gotchas

- **Vault search ≠ workspace doc RAG.** Workspace chat has its own
  RAG corpus made of `workspace.documents`. The vault search lives
  in `DocumentVaultPanel` and operates over `documentVault` (the
  cross-workspace personal/firm library). Don't conflate.
- **Owner facet was on the LEFT RAIL of KP**, then moved to a toolbar
  dropdown chip per Aashna review (2026-04-27). Vault still uses scope
  tabs (All / Org-wide / Mine) for Org Admins; the equivalent of KP's
  owner facet would be the Uploader chip (already shipped).
- **Limit handling**: when the parser sets `limit: 1` ("biggest file"),
  the table renders only the top result and a "Top N" pill appears in
  the chip row. User typing or All-documents click drops it.

## Related files

- `src/pages/chatbot/ChatView.jsx` — `DocumentVaultPanel` (search +
  Ask + chip render), `FilterChip` (shared dropdown component).
- `src/data/sampleVaultContent.ts` — seed doc text.
- `public/sample-docs/*.pdf` — generated PDFs.
- `/tmp/gen-sample-pdfs.py` — PDF generator.
