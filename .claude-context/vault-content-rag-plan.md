# Vault content semantic search — RAG implementation guide (P8.4)

> Drafted 2026-04-28 as the companion to `vault-find-search-plan.md`.
> Load when scoping or building the content-RAG pipeline (P8.4 in the
> phasing plan). Covers per-file token math, the pipeline, costs,
> latency, storage, and decisions that need to be made before code
> starts.
>
> This is a how-to, not a PRD. PRD-shaped scope still needs a separate
> doc once Karish / Ryan greenlight the work.

## TL;DR for the impatient

- 50 × 500-page legal PDFs ≈ **16M tokens** of raw text.
- One-time ingestion cost: **~$0.50 (OpenAI)** or **~$2 (Voyage-law-2)**.
- Storage: **~75 MB of embeddings** (~200 MB with the HNSW index).
- Per-query cost: **~$0.005** (rerank dominates; LLM synthesis second).
- Per-query latency: **2–4 s end-to-end**, mostly the LLM stream — the
  retrieval itself is <500 ms.
- Wall-clock to ingest 50 files: **~15 min at parallelism=5**, must be
  async with a job-status endpoint or the upload UI will time out.

## Scale and token math

### Per file (one 500-page legal PDF)

| Metric | Value | Note |
|---|---|---|
| Pages | 500 | |
| Words | ~250,000 | ~500 words/page average for a dense legal doc |
| Raw tokens | **~325,000** | ~1.3 tokens/word for legal English (compound terms, citations) |
| Chunks | ~250 | ~1,500 tokens per chunk, 200-token overlap |
| Embeddings | ~250 × 1,536 floats | OpenAI `text-embedding-3-small` |
| Per-chunk storage | 6 KB | float32, no quantisation |
| Per-file storage | **~1.5 MB** | embeddings only, before index overhead |

The token estimate assumes prose-heavy content (briefs, contracts,
memos). Heavily tabular docs (term sheets, schedules) come in lower at
~200K tokens; transcripts come in higher at ~400K. Use 325K as the
planning number; the cost variance per file is rounding error.

### Per corpus (50 files of this size)

| Metric | Value |
|---|---|
| Total tokens | **~16M** |
| Total chunks | ~12,500 |
| Total embeddings | ~12,500 × 1,536 floats |
| Embedding storage | **~75 MB** raw |
| Postgres + HNSW index | ~200 MB |

This is small. pgvector handles 100M+ vector indexes on a single
instance without sharding. Storage cost on RDS / Supabase / a
self-hosted Postgres is ~$0.10/month at this scale. Don't optimise
storage; optimise retrieval quality.

## Costs

### One-time ingestion

| Step | Unit cost | At 16M tokens | Notes |
|---|---|---|---|
| OpenAI `text-embedding-3-small` | $0.02 / 1M tokens | **~$0.32** | Default choice. Easy. Data egress to OpenAI. |
| Voyage `voyage-law-2` | $0.12 / 1M tokens | **~$1.92** | Purpose-built for legal. Beats OpenAI by ~5–8 pts on legal-IR benchmarks. Worth it for this domain. |
| Cohere `embed-english-v3.0` | $0.10 / 1M tokens | **~$1.60** | Solid generalist. Good multilingual fallback. |
| Self-hosted BGE-large | infra-only | ~$0 marginal | No egress; need a GPU box (~$0.50/hr). Worth it only at much larger scale. |

Per-file ingestion cost on Voyage-law-2 is **~$0.04 / file**. Across
20–50 files that's $0.80–$2.00. Negligible compared to the engineering
time.

### Per query

| Step | Cost | Notes |
|---|---|---|
| Question embedding | ~$0.000001 | ~50 tokens |
| pgvector kNN | $0 | DB query |
| BM25 (`tsvector`) | $0 | DB query |
| Cohere `rerank-3` | **~$0.002** | $2 / 1k searches; reranks top-50 → top-8 |
| LLM synthesis (gpt-4o-mini, 8 chunks ≈ 13K input + 800 output) | **~$0.0024** | $0.15/1M in + $0.60/1M out |
| **Total per query** | **~$0.005** | Rerank dominates. |

At 1,000 queries/day across the firm, that's ~$5/day, ~$150/month.
Affordable; not a budget item to track.

### Re-ingestion / updates

Editing a doc and re-uploading triggers re-extract → re-chunk →
re-embed. At ~$0.04 / 500-page doc on Voyage, even daily edits are
free in practice. The expensive operation is the **PDF extraction**
itself (~30–90 s of CPU per file), not the API call. Cache extraction
output keyed on content hash so a re-upload of the same bytes skips
extraction.

## Pipeline — ingestion (per upload, async)

```
PDF upload  →  extract  →  chunk  →  embed  →  store + index
                  ↓                                  ↓
              text + page metadata             pgvector + tsvector
```

### 1. Extract text + page metadata

- **PyMuPDF** for raw text + per-page offsets. Fast (<1 s/page),
  handles ~95% of legal PDFs cleanly.
- **`unstructured.io`** if layout matters (tables / footnotes /
  multi-column briefs). Slower (~3 s/page), better fidelity.
- **OCR fallback** — Tesseract or AWS Textract for scanned PDFs.
  Detect via "extracted text length / page count" — if it's <50
  chars/page, you've got a scanned doc and need OCR before continuing.
  OCR adds ~5–10 s/page and ~$1.50 / 1k pages on Textract.

**What to keep per page**: raw text, the page number, top-level
headings detected on the page, and the byte offsets so you can quote
back later. Drop signature blocks, table-of-contents pages, and
boilerplate footers (regex match) — they're noise and inflate the
embedding count.

### 2. Chunk structure-aware (the biggest quality lever)

Naive fixed-size chunking shreds clauses across boundaries — the model
gets "...the indemnification cap shall be" in one chunk and "...12
months of fees..." in the next, with no joining context. For legal
docs:

1. Split first on **§ / Article / Section / Clause headers** detected
   in the extraction step.
2. If a section is too long (>2,000 tokens), sub-split on paragraph
   boundaries with overlap.
3. **Always carry the section header into the chunk's prefix** so the
   embedded text reads like:
   ```
   [Section 7.1 — Indemnification]
   The Indemnifying Party shall reimburse the Indemnified Party for...
   ```
   This dramatically improves retrieval precision because section
   names embed strong topical signal.

Target: ~1,500 tokens per chunk with 200-token overlap. The overlap
catches phrases that straddle a chunk boundary.

### 3. Embed

- Batch in groups of 100 chunks per API call (OpenAI / Voyage cap).
- Run with parallelism=5 to keep ingestion under the upload-UI
  timeout. At 50 files × ~250 chunks each, this is ~30 batched calls
  per file → ~6,000 API calls total. With parallelism, ~10–15 min
  wall-clock for a 50-file ingest.

### 4. Store with rich metadata

```sql
CREATE TABLE vault_chunk (
  id              BIGSERIAL PRIMARY KEY,
  doc_id          UUID NOT NULL REFERENCES vault_doc(id) ON DELETE CASCADE,
  chunk_idx       INTEGER NOT NULL,
  text            TEXT NOT NULL,             -- the chunk's text
  page_start      INTEGER NOT NULL,
  page_end        INTEGER NOT NULL,
  section_path    TEXT[],                    -- ['Article 7', 'Section 7.1']
  embedding       VECTOR(1536) NOT NULL,     -- pgvector type
  tsv             TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  workspace_id    UUID,                      -- nullable: doc may live outside a workspace
  owner_id        UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vault_chunk_embedding ON vault_chunk USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_vault_chunk_tsv       ON vault_chunk USING gin (tsv);
CREATE INDEX idx_vault_chunk_doc       ON vault_chunk(doc_id);
CREATE INDEX idx_vault_chunk_workspace ON vault_chunk(workspace_id);
```

**Single-tenant deployment per firm** (the YourAI model) means we
don't need a `tenant_id` column — each firm has its own DB. Within a
firm, filter on `workspace_id` for workspace-scoped search and
`owner_id` for "uploaded by Priya"-style queries.

## Pipeline — query (per question)

```
question  →  embed  →  kNN(50)  ─┐
              ↓                   ├→ RRF merge (top-50)  →  rerank (top-8)  →  LLM
         BM25(50)  ───────────────┘                          (cross-encoder)
```

### 1. Embed the question

Same model as ingestion. Different model at query time guarantees bad
results — embeddings only compare meaningfully within a single model.

### 2. Hybrid retrieval (dense + sparse, parallel)

- **Dense (pgvector kNN)** — top-50 by cosine similarity. Catches
  semantic matches: "indemnity ceiling" finds "liability cap"
  language.
- **Sparse (Postgres `tsvector` + `ts_rank`)** — top-50 by BM25-ish
  scoring. Catches things dense misses: case citations
  (`Smith v. Jones, 2019 WL 12345`), party names (`Acme`, `Globex`),
  statute numbers (`§ 1542`), exact phrases the user copy-pasted.

Run both in parallel. **Reciprocal Rank Fusion** (RRF) to merge:

```
score(doc) = Σ over sources [ 1 / (k + rank_in_source(doc)) ]
```

`k=60` is the standard. RRF handles score scale mismatch between BM25
and cosine without normalisation.

**Why this matters numerically** — measured on legal-IR benchmarks:

| Approach | Recall@10 |
|---|---|
| Pure dense | ~62% |
| Pure BM25 | ~58% |
| RRF hybrid | **~78%** |

The 16-point lift is the difference between "the answer is in the
results" and "the answer isn't there, the LLM hallucinates." Worth the
complexity.

### 3. Rerank with a cross-encoder

Bi-encoder embeddings (used in step 2) are fast but lossy — they
encode the question and chunks independently, never letting the model
attend across them jointly. A cross-encoder reranker scores
(question, chunk) pairs together, dramatically improving precision.

- **Cohere `rerank-3`** — managed, $2 / 1k searches, 200–400 ms
  latency. The pragmatic default.
- **`bge-reranker-large`** self-hosted — free, but needs a GPU. ~80 ms
  latency on a T4.

Take the top-50 from RRF, rerank to top-8. **Precision@5 typically
jumps from ~55% to ~80%** with rerank. This is the biggest quality
lever after the chunking strategy.

### 4. LLM synthesis with citations

Pass the top-8 chunks to gpt-4o-mini in this shape:

```
[Doc: MSA_Acme_Corp_v4.pdf, p.12, §7.1 — Indemnification]
The Indemnifying Party shall reimburse...

[Doc: MSA_Acme_Corp_v4.pdf, p.13, §7.2 — Cap on Liability]
Notwithstanding the foregoing, the aggregate liability...

[Doc: SeriesB_TermSheet_Signed.pdf, p.5, §IV.B — Indemnification]
...
```

System prompt instruction: *"Answer using only the supplied chunks.
Cite every claim as `[filename, p.N, §X]`. If the chunks don't cover
the question, say 'Not covered by supplied documents.' verbatim."*
That sentence is the same anti-hallucination protocol the workflow
operations already use — keep it consistent.

## Two patterns that matter for 500-page files

### Per-doc summary index (two-pass retrieval)

For whole-doc questions like *"what's in the Smith matter file?"* or
*"summarize the Series B term sheet"*, vanilla chunk retrieval pulls
50 unrelated clauses from across the corpus. Two-pass:

1. At ingest time, generate a per-doc summary (LLM, ~$0.01 each) — TL;DR
   paragraph + extracted table-of-contents + key parties / dates /
   amounts. Store in a `vault_doc_summary` row.
2. At query time, classify intent: is this a *whole-doc* question or
   a *clause-specific* question? Whole-doc → query summaries first to
   pick candidate doc(s), then chunk-search inside them.
3. Clause-specific stays on the standard hybrid path.

Without this, "summarize the Smith case file" is unusable on a
500-page corpus — the LLM gets 8 random clauses and can't synthesise.

### Parent-document retrieval

Search on small chunks (better recall — more granular semantic
match), but pass the **enclosing section** to the LLM (more context
for synthesis). Implementation: `vault_chunk` rows store a
`parent_section_id` pointing to a coarser-grained `vault_section`
table. After rerank, look up the parents of the top-8 chunks and pass
those instead.

Trade-off: more tokens to the LLM (a section averages ~3,000 tokens
vs ~1,500 for a chunk), so cost per query roughly doubles. Worth it
when the question is "explain how indemnification works in this
contract" — the surrounding section provides the framing.

## Latency budget

| Step | p50 | p95 |
|---|---|---|
| Question embed | 80 ms | 200 ms |
| pgvector HNSW kNN (12K vectors) | 15 ms | 40 ms |
| BM25 / `tsvector` | 30 ms | 80 ms |
| RRF merge | <5 ms | 10 ms |
| Cohere rerank-3 (top-50) | 250 ms | 500 ms |
| LLM stream (first token) | 600 ms | 1.5 s |
| LLM stream (full ~800 tokens) | +1.5 s | +3 s |
| **End-to-end (first token)** | **~1 s** | **~2.3 s** |
| **End-to-end (full answer)** | **~2.5 s** | **~4 s** |

Stream the LLM output to the UI — first-token latency is what the
user feels. Everything before the LLM is <500 ms; the LLM is the
budget. Use the existing streaming pattern from
`workflowExecutor.ts` / `ChatView.jsx`.

## Ingestion time / wall clock

| Step | Per 500-page file | Notes |
|---|---|---|
| PDF extract (PyMuPDF) | 30–60 s | CPU-bound; parallelisable across cores |
| Chunk + section-detect | <5 s | Cheap |
| Embed (250 chunks, 3 batched calls) | 10–25 s | Network-bound; parallelisable across files |
| DB insert | <2 s | Bulk insert |
| **Per-file total** | **~1–2 min** | |

Sequential ingest of 50 files = 50–100 min. Unacceptable as a synchronous
upload. **Mandatory pattern**:

1. Upload endpoint stores the file, creates a `vault_doc` row with
   `ingest_status='pending'`, returns immediately with a job ID.
2. Background worker picks up pending docs, runs the pipeline, updates
   `ingest_status` to `indexing` → `ready` (or `failed` with reason).
3. Frontend polls or subscribes (SSE / websocket) to surface progress
   in the Vault list ("Indexing… 124/500 pages").
4. Search excludes `ingest_status != 'ready'` rows so half-indexed
   docs don't appear with partial coverage.

At parallelism=5 across files, 50-file ingest finishes in ~15 min.

## Decisions to make before code starts

### Embedding model

**Recommendation: Voyage `voyage-law-2`.** Purpose-built for legal,
beats OpenAI by 5–8 pts on legal benchmarks, costs $1.60 more for the
whole corpus. The domain-fit win is real and the cost difference is
rounding error.

OpenAI `text-embedding-3-small` is the right dev-mode fallback — same
shape, cheaper, no Voyage account needed during local development.
Plumb it as a config flag.

### Hybrid yes/no

**Yes.** ~16-point recall lift on legal text is non-negotiable —
without it citations and party-name searches fail and the user blames
the AI. Postgres handles both indexes; the merge code is ~20 lines.

### Rerank yes/no

**Yes.** ~25-point precision lift, $0.002/query, +300 ms latency.
The user feels the precision; they don't feel 300 ms behind a 2-second
LLM stream.

### Sync vs async ingest

**Async, mandatory.** Synchronous upload is dead at this scale.
Build the job-queue + status row from day one — retrofitting it later
is harder.

### Where to run

The `backend/` folder has Prisma + SQLite scaffolding but production
bypasses it (chat hits the Vercel Edge function directly). RAG **needs
a real backend**:

- **Postgres + pgvector** — Supabase ($25/mo Pro tier covers this), AWS
  RDS, or self-hosted. Supabase is the fastest path to a working pilot.
- **Object storage** for the original PDFs — S3 / R2.
- **Job queue** — Postgres + a worker process is fine at this scale; no
  need for SQS / Redis / etc. Use `pg_cron` or a simple Node/Python
  worker that polls every 5 s.
- **Search endpoint** — FastAPI route that does embed → kNN+BM25 → RRF
  → rerank → returns top-8 chunks with metadata. The chat-side LLM
  call stays in the existing Edge function; this just feeds it
  retrieved context.

### Which surfaces consume RAG

Two natural integrations:

1. **Vault Ask-anything bar** (extends P8.2). Today the parser returns
   structured filters; with RAG it can also return "answer this from
   doc content." Routing logic: did the parser identify a metadata
   filter (sort, limit, file type)? Stay on chip filtering. Otherwise
   fall through to RAG.
2. **Workspace chat** — when a workspace has docs attached, route
   questions through `/api/search?workspace_id=…` first, inline the
   retrieved chunks into the user message under the existing
   `[Documents attached to this conversation]` header. Replaces the
   current pattern of stuffing the entire doc text into the message
   (which doesn't scale past ~30K tokens).

## Open questions

- **Voyage account / data egress policy** — Karish / Ryan to confirm
  legal team is OK with sending document text to Voyage's API. If not,
  fall back to OpenAI (already in use) or self-hosted BGE.
- **OCR for scanned PDFs** — does the firm receive scanned discovery
  docs? If yes, budget Textract or self-hosted Tesseract. Current MVP
  can punt and reject scanned PDFs at upload with a clear error.
- **Per-doc summary cost** — 50 docs × $0.01 = $0.50 one-time per
  ingest. Cheap, but only worth doing if we ship the two-pass retrieval
  pattern. Otherwise skip.
- **Rerank vendor lock-in** — Cohere `rerank-3` is great but adds a
  third vendor (after OpenAI and Voyage). BGE-reranker self-hosted
  on a CPU works; ~150 ms latency vs Cohere's 300 ms. Defer until we
  feel the bill.

## Related files

- `.claude-context/vault-find-search-plan.md` — the P8 phasing plan;
  this doc fills in the P8.4 row.
- `.claude-context/wendy-attorney-feedback.md` — origin of the request
  (P8 + P12).
- `.claude-context/workflow-execution-architecture.md` — the existing
  streaming pattern to mirror for the LLM-synthesis step.
- `src/data/sampleVaultContent.ts` — the seed doc text already includes
  realistic legal content that can be the demo corpus during pilot.
- `backend/` — currently scaffolding only. The FastAPI + Postgres
  rewrite is the prerequisite for everything in this doc.

## Effort estimate (recap, with breakdown)

| Phase | Scope | Effort |
|---|---|---|
| Backend scaffolding (Postgres + pgvector + S3 + worker) | Stand up infra; not RAG-specific | 3–4 days |
| Ingestion pipeline (extract → chunk → embed → store) | The pipeline above, single-file path | 3 days |
| Async job queue + status polling | Frontend "indexing…" state, retries | 2 days |
| Hybrid retrieval (dense + BM25 + RRF) | `/api/search` endpoint | 2 days |
| Rerank + LLM synthesis | Cohere integration, citation prompt | 1 day |
| Per-doc summary + two-pass retrieval | The 500-page-file pattern | 2 days |
| Vault Ask-anything routing | Decide chips vs RAG; fall-through logic | 1 day |
| Workspace chat integration | Replace doc-stuffing with retrieved chunks | 1 day |
| QA on the 4 seed docs + 1 real 500-page test corpus | End-to-end | 2 days |
| **Total** | | **~3 weeks** for one engineer end-to-end |

Matches the "~2 weeks" estimate in `vault-find-search-plan.md` if you
exclude the backend scaffolding (which has to happen anyway for other
reasons) and the 500-page-specific patterns. Plan for ~3 weeks
realistically.
