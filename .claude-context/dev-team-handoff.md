# Dev team handoff

Status of what we've shared with the dev team building the real YourAI backend at `https://youraillc-pwa-dev.appskeeper.in`. Load this file when planning the next round of feedback, when re-testing their build, or when scoping further deliverables.

The dev team ingested our wireframe (the `yourai-black.vercel.app` build) and is building the backend over it. They have their own React/Next frontend now — separate codebase from ours. Our role going forward is QA + spec authorship for them, not direct code-share.

---

## What lives where

**Their build**: `https://youraillc-pwa-dev.appskeeper.in/chat/login`
**Our wireframe**: `https://yourai-black.vercel.app/chat`

These are independent. Their commits do not flow back to us; our commits go to `yourai/main` and stay on the wireframe.

**Test credentials they gave us**:
```
chat@yopmail.com
Test@123
OTP: 999999 (six 9s, one per box — first box only accepts one digit, paste won't auto-distribute)
Role: Org Admin
```

**Their backend stack** (identified from API debug payloads):
- Auth: Clerk (dev instance `lasting-sawfly-36.clerk.accounts.dev` — flag for prod cutover)
- LLM: Amazon Nova Lite (`amazon.nova-lite-v1:0`)
- Chat pipeline: 2-pass `chat_system_reasoning_v1` → `grounding_rewrite_v1` against a hybrid retrieval (BM25 + dense + RRF) with a hard `low_overlap < ~0.55` refusal gate
- Intents table backs `GET /api/v1/knowledge-base/intents` — same shape as our `GlobalKnowledgeBase.jsx` `DEFAULT_INTENTS` (id, key, label, description, systemPrompt, tonePrompt, enabled, keywords, openingBehaviour, customInstruction, sortOrder)

**Their key API endpoints**:
```
POST /api/v1/auth/login
POST /api/v1/auth/verify-mfa
GET  /api/v1/auth/me
POST /api/v1/conversations/start
GET  /api/v1/conversations/:id
POST /api/v1/conversations/:id/scope
GET  /api/v1/knowledge-base/intents
GET  /api/v1/my/knowledge-packs?limit=100
GET  /api/v1/vault?page=1&limit=100&tab=ALL
POST /api/v1/vault/upload                  # currently 500
POST /api/v1/chat                          # main chat endpoint
```

---

## Deliverables already handed over

All on `~/Desktop/`:

1. **`YourAI_Chat_Bug_Report.docx`** — 14 bugs from the 2026-05-19 QA pass (6 P0, 5 P1, 3 P2). Severity, repro steps, raw API payloads, recommended fixes. Includes the 12-intent battery results and the 4-turn NDA-drafting probe results as appendices.

2. **`YourAI_Bot_Persona_Prompts.docx`** — lean replacement prompts to paste into their SA Bot Persona form. One section per intent (13 total): description, system prompt, tone prompt, keywords, enabled flag, opening behaviour. No bug crosswalk, no SQL, no commentary — pure field values. (An earlier "full" version `YourAI_Bot_Persona_Prompt_Update.docx` with SQL migration + acceptance battery was rejected by PM as overcomplicated.)

3. **`YourAI_Chat_Vault_Test_Suite.md`** — 176-case autonomous regression suite. Designed to be dropped into the dev team's Claude Code session with the Playwright MCP server attached. Includes setup helpers (`window.__yourAI.loadIntents()` / `startConv()` / `send()`), per-test pass/fail criteria, severity rubric, bug-report Markdown template the test agent emits at the end, JSON output schema for trend tracking. Test artifacts (a `test-contract.txt` license + a `test-nda.txt` with embedded standstill/non-solicit/non-compete) in Appendix A.

---

## P0 bugs blocking client demo

In priority order (these are the ones to ask the dev team about first):

1. **Universal grounding-gate refusal** (`The knowledge base does not have sufficient coverage on this topic.`). Backend forces RAG on every prompt and bails when `low_overlap < ~0.55`. Affects 6/11 enabled intents (General Chat, Legal Q&A, Legal Research, Document Drafting, Email Drafting, Find Document). No prompt rewrite alone can fix this — needs pipeline change to fall back to general LLM knowledge tagged `[model knowledge — verify]` when retrieval is thin.

2. **Drafting intents refuse to draft**. Document Drafting / Email Drafting return the canned refusal for from-scratch drafting requests. Prompt fix adds an explicit "NEVER REFUSE TO DRAFT a benign legal document" rule, but only works if the system prompt actually reaches the LLM (pipeline issue #1 may swallow it).

3. **Security filter false-positive on NDA drafting**. Benign `"Draft a mutual NDA between X and Y"` returns `answerStatus: "refused"`, `outputIntent: "security_block"`, `warnings: ["security_block:high"]`, `answer: ""`. UI renders a blank bubble. Two fixes: re-tune the filter so legitimate drafting passes, and make the UI never render an empty bubble (always surface a non-empty explanation).

4. **Vault upload returns HTTP 500**. `POST /api/v1/vault/upload` errors out on any file. Blocks the entire document-required intent set (Contract Review / Document Summarisation / Risk Assessment / Case Law Analysis / Clause Comparison) end-to-end.

5. **No multi-turn memory**. By turn 4 of an NDA drafting session, the bot can't recall the jurisdiction and term length from turn 1 of the same conversation. Conversation context isn't being concatenated into the LLM prompt (or is being truncated). Drafting iteration is the core lawyer loop — without memory the product fails its primary use case.

6. **Intent badge always shows "General Chat"**. API response correctly returns `data.outputIntent: "legal_qa"` etc, but the UI bubble badge always renders "General Chat". Pure frontend mapping bug — they can fix without touching the backend.

---

## P1 bugs (degraded but workable)

7. Multi-intent gate fires on a plain greeting (over-aggressive classifier).
8. User message duplicates on intent-switch click (UI re-dispatches as a new user message instead of silently re-routing).
9. Stale "Looks like X" suggestion banner persists after switch (both buttons resolve to the same action).
10. Empty-thread sidebar pollution (`+ New chat` creates a persisted "0 msgs" entry before any message sent).
11. "Current search: attached chat files" breadcrumb shows when no files attached; renders twice after failed upload.
12. Hallucinated clause semantics (residual-knowledge clause output as generic confidentiality covenant).

---

## P2 bugs (polish)

13. `[CITE:N/A]` placeholder token leaks to user output.
14. Session silently expires after ~10 minutes — all `/api/v1/*` return 401 with no in-UI re-auth prompt.

---

## How we test their build

The test-suite MD is the canonical regression set. Two ways to run it:

**Option A — they run it on their side**:
1. Drop `YourAI_Chat_Vault_Test_Suite.md` into their Claude Code session via `@/path/to/file.md`.
2. Confirm Playwright MCP server attached.
3. Tell Claude: *"Run this test suite end-to-end. Save the bug report and JSON to ./test-artifacts/."*
4. Their dev lead reviews the resulting `YourAI_Bug_Report.md`.

**Option B — we run it on our side** (current default):
1. Drop the MD into our Claude Code session.
2. Run via the Playwright MCP server.
3. Feed the resulting bug-report MD back to the dev team.

Both produce the same report shape (template in §5 of the suite). Option B is what we did 2026-05-19 manually; future runs should let Claude run all 176 cases autonomously.

For deeper prompt-level probing without UI overhead, drive `/api/v1/chat` directly via `fetch` in `browser_evaluate`. Pattern from the suite §4:

```javascript
const r = await fetch('/api/v1/chat', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ conversationId, message, intentId, retrievalMode: 'hybrid' })
});
```

The response includes `answerStatus`, `outputIntent`, `confidence`, `warnings`, `sourceAttribution`, and a `debugData` block with the raw LLM call breakdown (model, template, token counts). Read this when QA'ing — frontend bubble alone often hides the real backend signal.

---

## Open coordination questions

- **When will their schema be shareable?** Once we have it, we can stop pasting prompt field values into a DOCX and just POST JSON to their intents table or share a Postman collection.
- **Will they re-test before the next demo?** The 176-case suite should run on their build after every P0 fix.
- **Who maintains the intent registry going forward?** Right now we're authoring prompts in our wireframe's `GlobalKnowledgeBase.jsx` and shipping them to them as DOCX. Long-term either they take ownership (and our wireframe falls behind) or we share a JSON source-of-truth checked in to both repos.
- **Auth handoff for QA**: we keep getting silent 401s after ~10 min idle. Either their session needs to refresh longer, or our test setup needs to re-auth between batches.

---

## Working with the dev team — patterns to keep

- **DOCX for non-technical stakeholders, MD for engineers**. The 3-deliverable handoff worked: PMs read the bug-report DOCX, dev leads read the test-suite MD, the prompts DOCX bridges both audiences.
- **One-page severity rubric**. Always include the P0/P1/P2 calibration so the dev team prioritises the same way we do.
- **Raw API payloads in every bug**. Don't just describe behaviour — paste the response JSON. They can grep their server logs against it.
- **Reproduction steps that don't require our environment**. Every test case is runnable from their browser with the same credentials.
- **Acceptance batteries in the same shape as the test suite**. Every prompt-update DOCX should reference the corresponding test cases so they can verify the fix.

---

## What NOT to do

- Don't push to their backend directly (we don't have access).
- Don't paste prompts into their UI manually (we have no SA access on their build).
- Don't share JSON dumps via email or pastebin — sensitive prompts go through the encrypted DOCX channel they've set up.
- Don't re-test the same area twice in one day. Their deploy cadence is slower than ours; wait for a confirmed fix-shipped before re-running the regression suite.
