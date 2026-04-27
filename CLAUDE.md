# CLAUDE.md — YourAI repo guide

> This file auto-loads at the start of every Claude Code session. Keep it lean.
> **Read `PROGRESS.md` at the start of each session to see current state.**

---

## Product overview

**YourAI** — private, single-tenant AI platform for US law firms. Attorneys and paralegals can chat with legal documents, run structured workflows (multi-step AI pipelines), search a curated knowledge base, and get outputs like summaries, risk memos, clause analyses, timelines, and research briefs.

Two user surfaces, one codebase:
- **Tenant app** (`/chat`, `/chat/workspaces/:id`, etc.) — what end users see
- **Super Admin portal** (`/super-admin/*`) — YourAI staff administer tenants, users, global KB, bot persona
- **Org Admin portal** (`/app/*`) — tenant admins manage their own org

Deployed at `yourai-black.vercel.app` (production main deploys from the `yourai` remote's `main` branch; `origin` remote is `scope-creator-ai` — stale, do not push there).

---

## Tech stack

- **Frontend**: Vite + React (18) + TypeScript (mixed with legacy .jsx) + shadcn-ui (Radix primitives) + Tailwind CSS
- **Auth + role**: context-based (`src/context/AuthContext.tsx`, `src/context/RoleContext.tsx`); localStorage-backed session
- **Routing**: React Router v6, `BrowserRouter`
- **Backend**: Vercel Edge Functions (`api/*.ts`) proxy to OpenAI; an in-repo FastAPI-ish `backend/` folder (Prisma + SQLite `dev.db`) exists but production chat does NOT use it — it hits the Edge function directly
- **LLM**: OpenAI gpt-4o-mini via `/api/chat` (server-side proxy, never exposes key to client)
- **State**: React state + localStorage mock-API pattern (every mock function is shaped like the REST endpoint it will eventually become)
- **Styling**: design tokens in `src/index.css` CSS variables (`--navy`, `--gold`, `--ice-warm`, `--border`, etc.); DM Serif Display for titles, DM Sans for body, IBM Plex Mono for labels

---

## High-level architecture

- **Chat flow**: user types → `ChatView.jsx` classifies intent via keyword matcher → POSTs to `/api/chat` with `{message, history, intent, ...}` → Edge function injects per-intent JSON schema when intent is a "card intent" and calls OpenAI with `response_format: json_object` → client streams the response, parses JSON for card intents (fallback to markdown on parse failure), renders via `IntentCard` dispatcher.
- **Workflows**: multi-step AI pipelines run by a module-level singleton (`src/lib/workflowRunner.ts`) that survives component unmount via a subscribe/unsubscribe pattern. Runs persist in localStorage under `yourai_workflow_runs_v1`.
- **Knowledge Packs + Document Vault**: independent session-level state on `ChatView`. Neither is auto-attached by intent. Content gets injected into the system prompt at send time (client fallback path only; Edge path receives IDs but not content).
- **Role model**: `SUPER_ADMIN` (YourAI staff), `ORG_ADMIN` (firm admin), `INTERNAL_USER` (firm attorney), `EXTERNAL_USER` (client). External users have no workflow access, no `/chat` home — they land in workspace chat only.

---

## Folder structure

```
/api/                          Vercel Edge Functions. api/chat.ts is the OpenAI proxy.
/backend/                      Experimental Prisma+SQLite backend — NOT wired to production.
/src/
  App.tsx, App.jsx             Root components (legacy .jsx exists alongside .tsx).
  components/                  Shared UI.
    chat/                        Chat-specific (Workflow*, PreRunModal, WorkflowRunPanel…)
      cards/                     Intent response cards (Summary, Comparison, CaseBrief,
                                 Research, RiskMemo, ClauseAnalysis, Timeline, Editorial*)
  context/                     AuthContext, RoleContext, SessionContext.
  data/                        Static mock data (tenants, plans, prompt templates).
  hooks/                       Misc React hooks.
  lib/                         Business logic libs:
                                 workflow.ts + workflowRunner.ts — workflows
                                 intents.ts + intentDetector.ts — intent system
                                 llm-client.ts — client-fallback OpenAI path
                                 roles.ts, workspace.ts, mockCardData.ts
  pages/
    chatbot/                   Tenant chat surfaces: ChatView.jsx (4000+ lines),
                                 WorkspaceChatView.tsx, auth/*.jsx.
    super-admin/               SA portal screens (TenantManagement, UserManagement,
                                 GlobalKnowledgeBase, WorkflowTemplates, etc.)
    org-admin/                 Org Admin portal screens.
/docs/                         Durable project documentation.
  bot-persona-scope.md           PRD-style scope for the Bot Persona system.
  extracted/                     Raw Feature Inventories (FRDs) per module.
/.claude-context/              Per-session context files — load on demand via @.
/public/                       Static assets + _redirects.
/vercel.json                   Route rewrites for SPA + Edge functions.
CLAUDE.md                      This file — auto-loaded each session.
PROGRESS.md                    Living state — read each session.
README.md                      Lovable-generated clone/dev instructions.
YourAI-Test-Suite.md           QA test spec (627 lines, dated 2026-04-14).
```

---

## Conventions

- **File naming**: `PascalCase.tsx` for components, `camelCase.ts` for libs, `kebab-case.md` for docs.
- **Legacy .jsx**: don't migrate to .tsx unless changing substantial logic; it churns diffs. Keep mixed.
- **Comments**: only explain the *why* — hidden constraints, non-obvious invariants. Never narrate what code obviously does.
- **Feature flags / backwards-compat**: avoid. When removing something, delete it; don't leave `// removed because X` tombstones.
- **Storage keys**: all localStorage keys prefixed `yourai_*` and versioned with `_v1`/`_v2` suffixes to dodge collisions with prior iterations.
- **Routes**: tenant chat `/chat/*`, workspace chat `/chat/workspaces/:id`, org admin `/app/*`, super admin `/super-admin/*`, auth `/chat/login`, `/chat/signup`, etc.
- **Error handling at boundaries only**: trust internal code. Validate only at user input / external API surfaces.
- **Icons**: `lucide-react`. When you use `<SomeIcon>` in JSX, *make sure it's in the import* — repeated production blanks have been caused by missing lucide imports.
- **CSS-in-JS**: inline `style={{}}` is used heavily; Tailwind is used selectively. Both are fine.
- **Tests**: none automated — QA via `YourAI-Test-Suite.md`.
- **AI calls for new features go through `/api/chat` (Edge), not `callLLM`**. `callLLM` (`src/lib/llm-client.ts`) is the client-side fallback path that requires a browser-side `VITE_OPENAI_API_KEY` which is NOT set in production. As of 2026-04-25 **no production code path uses `callLLM`** — `workflowExecutor`, main `ChatView`, and `WorkspaceChatView` all hit `/api/chat` directly. Anything new must `fetch('/api/chat', { method: 'POST', body: JSON.stringify({ messages, model, temperature, max_tokens }) })` (or the simpler `{ message, history, system }` shape). Symptoms of regressing back to `callLLM`: bot says **"Something went wrong reaching the AI"** (workspace chat error path) or **"No LLM backend available. Please configure the API key…"** (the latter copy is now removed but watch for it returning).
- **Card empty-state pattern** — every intent-card component must detect "schema-shaped envelope with no real data" and render a friendly empty-state in its normal shell instead of grids of `—` dashes. The Edge forces `response_format: json_object` for card intents, so the LLM will return valid empty JSON when the user supplied no document. Detection rule: **all schema-required string fields blank AND no `documentName` AND empty arrays** → render upload prompt + sibling-intent hint. See `.claude-context/card-empty-state-pattern.md` for the full template and the per-card detection-and-message specifics.
- **Edge `MISSING DOCUMENT HANDLING` branch** in `api/chat.ts` system prompt — when a document-analysis intent comes in without a document, the prompt explicitly instructs the model to ask for an upload (echoing the user's task back, ≤50 words) instead of falling through to the generic off-topic refusal. Companion to the card empty-state pattern: the LLM picks prose vs. JSON unpredictably, so both layers must exist.
- **"Not covered by supplied documents." is a literal, verbatim anti-hallucination sentence** used across every workflow operation's system prompt. When the uploaded docs don't contain what a step needs, the step's output must begin with that exact sentence + a one-sentence reason, then produce whatever partial analysis is possible. QA tests check for the literal string — don't rephrase.
- **Workflow operation prompts live in `src/lib/workflowPrompts.ts`**. When adding a new operation or editing an existing one, update that file (not scattered prompt strings elsewhere). Execution is always via `src/lib/workflowExecutor.ts` → `/api/chat`.
- **Card-in-card rendering uses a `variant="embedded"` prop** to suppress the nested card's outer chrome (border, radius, shadow, accent stripe, header). See `WorkflowProgressCard` as the canonical example.
- **One primary CTA per screen** — wizard pages especially should not have both a top-bar Continue/Save AND a bottom-row equivalent.

---

## Gotchas (non-obvious things)

1. **Two git remotes**: `origin` → `scope-creator-ai` (stale), `yourai` → live production repo. Always push to `yourai`. Production `yourai/main` is what Vercel deploys.
2. **Production branch flow**: working branch is `claude/great-banach`. Ship via merge-to-main: `git fetch yourai main && git checkout -B tmp yourai/main && git merge --no-ff claude/great-banach && git push yourai tmp:main`. Branch-name fine; the merge-to-main ritual is what matters.
3. **No CI for undefined-symbol errors**: missing `lucide-react` imports blow up the whole app with `ReferenceError` at render. Build passes (TS doesn't check JSX symbol scope). Always manually verify new icon imports. Past incidents: `listRuns` and `ArrowRight` both blanked production.
4. **Edge function ≠ client fallback**: `/api/chat` (Edge) and `src/lib/llm-client.ts` (client) have *separate* system prompts. Changes to one do not propagate to the other. The client fallback only runs when the Edge is unreachable.
5. **Bot Persona config only affects client fallback**: SA-edited system prompts in `yourai_bot_persona` localStorage never reach the Edge function. Production responses use the Edge's hardcoded prompt + optional card schema.
6. **3 sources of truth for intents** (see `docs/extracted/intent-features.md` §8): `intents.ts` + `intentDetector.ts` + `GlobalKnowledgeBase.jsx` DEFAULT_INTENTS. They drift. When adding an intent, update all three.
7. **Intent ↔ Knowledge Pack has zero wiring**: changing intent never changes the active KP or vault doc. They're orthogonal session-level states.
8. **Headless-Chrome smoke test pattern**: when you think production might be broken after a deploy, run `curl -s <url>` to get the bundle hash, then use `/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --headless --dump-dom <url>` with `--enable-logging=stderr` to catch `ReferenceError`s. This caught both blank-production incidents.
9. **ChatView.jsx is 4000+ lines**: grep ruthlessly, don't Read whole-file. Key sections: state (~2780), auto-switch (~3005), card dispatch (~3220), suggestion banners (~3900), intent dropdown (~3970).
10. **CSS grid `auto-fill` creates ghost columns on sparse data**: a grid with `repeat(auto-fill, minmax(300px, 1fr))` at a 1440px viewport with only 2 cards leaves a ~40% blank band on the right. For sections that often render few items, use `auto-fit` (collapses empty tracks) and/or cap `maxWidth` on the grid container. Aashna flagged this on the Workflows picker; fix is documented in the session transcript.
11. **Empty states: anchor via `padding-top`, not flexbox centering**: a container with `flex: 1; justify-content: center` or `align-items: flex-end` produces huge dead zones. Use `padding-top: 14vh` (approximately 15% from the top) inside a fixed max-width centred column instead. This pattern now ships on the chat empty state.
12. **DM Serif is decorative-only**: reserve it for hero titles and section headers. Never use it for live status strings or dynamic counts ("2 running · 3 recent") — those should be DM Sans. Run Panel header once broke this rule and read as decorative when it needed to read as data.
13. **Workflow executor uses `/api/chat` with a full `messages[]` payload**: each step = operation system prompt + assembled user message (step metadata + user instruction + prior step outputs capped at ~3500 chars each + uploaded docs capped at ~8000 chars each + optional reference doc + workspace context). Streams via `ReadableStream`, 90s timeout with `AbortController`. See `src/lib/workflowExecutor.ts`.
14. **Prior-step chaining is the whole point of a workflow**: step N receives a structured summary of every completed step 1..N−1. The Generate Report step is a synthesis of prior outputs, not a re-analysis. Don't send only the raw documents to step N without the prior outputs.
15. **CSS grid for picker cards uses `auto-fill, minmax(340px, 1fr)` with no `maxWidth` cap on the section** — aashna's chat-mode mockup expects 3-across at desktop reflowing naturally to 2 / 1 on narrower screens. The earlier `auto-fit, minmax(280px, 340px)` with a `maxWidth: 960` cap fought the design at every viewport. Don't reintroduce the cap unless aashna explicitly asks.
16. **Card-rendering intents force JSON via `response_format: json_object`** even when the user attached no document. The LLM will dutifully return a schema-shaped envelope with empty strings and empty arrays. Without the empty-state detection (Conventions §card empty-state pattern) the card renders as a grid of `—` dashes — the chat reads as broken even though the LLM did exactly what was asked.
17. **`credentials: 'include'` on same-origin fetches is vestigial and can trigger Edge / cache weirdness**. Drop it on any `fetch('/api/chat', …)` call. The Edge doesn't read cookies.
18. **Mac screenshot filenames sometimes contain U+202F (narrow no-break space)** instead of ASCII space between minute digits and "PM". `ls` shows them but `cp` / `Read` fail with "No such file". Workaround: copy via shell glob (`Screenshot 2026-04-24 at 1.18*.pdf`) or rename via `tr -d $'\xe2\x80\xaf'`. Hit this twice when reading aashna's mockup PDFs.
19. **Streaming reader needs a trailing `decoder.decode()` flush** after the `while`-loop ends. Without it, multibyte UTF-8 characters split across chunk boundaries lose their final byte. `ChatView`, `WorkspaceChatView`, and `workflowExecutor` all do this — match the pattern when adding new streaming consumers.

---

## `.claude-context/` index — load on demand via `@`

Files here are context for working on specific features. Reference them with `@.claude-context/filename.md` when a session needs them.

- **`session-notes.md`** — durable notes from the 2026-04-23 session: verbal decisions, corrections, debugging history, open threads, Arjun's communication preferences, and my working assumptions about the project. **Load this if resuming work that was in-flight before the most recent `/clear`.**
- **`persona-dynamic-config-plan.md`** — implementation plan (from a prior chat) for making each SA Bot Persona config field dynamically wire into chatbot behavior in real-time. Useful when building out persona-editor interactivity.
- **`workflow-execution-architecture.md`** — reference note on the workflow LLM-execution pattern established 2026-04-24. Load this before touching `workflowRunner.ts`, `workflowExecutor.ts`, `workflowPrompts.ts`, or adding a new operation. Explains why `callLLM` is NOT the path and what the extension points are.
- **`card-empty-state-pattern.md`** — the standard detection-and-render pattern for "schema-shaped envelope with no real data" across all 7 intent cards (the failure mode where `response_format: json_object` forces the LLM to return empty JSON when the user supplied no document). Load this when adding a new card-rendering intent or touching empty-state behaviour on any existing card.

*(Folder is otherwise clean — future planning docs or brief-dumps go here, named by topic.)*

---

## Full project FRDs — load on demand

Authored feature inventories live in `docs/extracted/`. Each is a comprehensive spec of one module's screens, UI, state, storage keys, hardcoded mocks, and discrepancies. Load when working on that module:

- `docs/extracted/intent-features.md` — Intent system end-to-end (`ChatView`, `WorkspaceChatView`, persona editor, Edge schemas, KP/DV relationship)
- `docs/extracted/bot-persona-features.md` — SA Bot Persona tab internals
- `docs/extracted/kb-features.md` — Knowledge Base module
- `docs/extracted/tenant-features.md` — Tenant Management (SA-side) + Clients (Org-side)
- `docs/extracted/user-features.md` — User Management across all portals
- `docs/bot-persona-scope.md` — PRD-style scope for Bot Persona (status: DRAFT, pending Ryan Hoke visual review)

### Functional FRDs (.docx — for PM / QA / strategist audience)

These live in `docs/extracted/` too and mirror the PMs' tenant-management reference. No code, no API contracts — purely functional.

- `docs/extracted/FRD_Intent_System.docx` — intent selector, auto-switch, suggestion banners, cross-intent redirect, card vs prose formats, SA bot-persona editor.
- `docs/extracted/FRD_Workflows.docx` — Workflows module surfaces end-to-end: picker, builder, pre-run modal, execution, run panel, report, favourites, permissions. 75 QA test scenarios.
- `docs/extracted/FRD_Workflow_Operations.docx` — the 7 operations (Read Documents, Analyse Clauses, Compare Against Standard, Research Precedents, Compliance Check, Update Knowledge Base, Generate Report) with per-operation behaviour, vague-doc handling, and test matrices.
- `docs/extracted/FRD_Incorrect_Document_Handling.docx` — 9-category taxonomy of mismatched uploads + the three-stage handling protocol (Pre-Run → per-step degradation → Report honesty) + 9 worked end-to-end scenarios + 30 QA tests.

## Sub-agents

Defined in `.claude/agents/`:

- **`aashna.md`** — senior UX designer persona (Linear / Stripe / Vercel background). Invoke for layout / hierarchy / spacing audits. Output is *diagnosis → prioritized fixes → paste-ready Claude Code implementation prompt*. Does not write full code — directs. Used three times in the 2026-04-24 session for targeted rounds on the Workflows panel, Builder, Run Panel, and the audit log modal.

---

## Remember

- **Read `PROGRESS.md` at the start of each session** — it reflects what's actively being worked on, blockers, and recent decisions.
- When in doubt, ask the user rather than guess.
- Never push to `origin` — it's the wrong remote. Always `yourai`.
