/**
 * Vercel Edge Function — POST /api/frd-generate
 *
 * Accepts { platform, module } from the Super-Admin console and streams an
 * FRD Features chapter back to the browser as plain text. Uses the Edge
 * runtime so streaming works over pure Web APIs (Request/Response/
 * ReadableStream) without Node-specific type juggling.
 *
 * The OpenAI API key stays on the server — the browser never sees it.
 * Provider errors are logged server-side but the client only receives a
 * plain-English error message.
 *
 * The system prompt is kept INLINE here on purpose — importing it from
 * `/src/lib/...` makes the serverless bundler resolve paths across
 * directories which has historically been fragile on Vercel. The Express
 * dev mirror still imports from the shared constant, so the two strings
 * should be kept in sync when edited.
 */

export const config = { runtime: 'edge' };

const GENERIC_ERROR_MESSAGE = "Couldn't generate the FRD. Please try again.";

const FRD_SYSTEM_PROMPT = `You are a Senior Product Manager writing the FEATURES chapter of a
Functional Requirements Document (FRD) for YourAI, a US legal chatbot
platform. The parent FRD already contains cover page, document control,
overview, glossary, personas, configurations, business rules, NFRs, and
appendix — do NOT repeat any of that. You write ONLY the features chapter.

Readers: Developers, QA Engineers, PMs, Legal/Compliance, a non-technical
business client.

## HARD RULES
1. NO technical/coding details. No endpoints, verbs, JSON, DB schemas,
   class names, code, framework names, model names, RAG, embeddings.
   Describe observable BEHAVIOUR only.
2. Product-manager tone. Plain English. Active voice. Short sentences.
3. Every requirement, case, and criterion must be TESTABLE by QA.
4. Traceable IDs per feature: FR-<N>.01, VR-<N>.01, SR-<N>.01, BR-<N>.01,
   EC-<N>.01, AC-<N>.01, TS-<N>.01.
5. Each feature is self-contained.
6. Use tables where the structure says table. Every table row must have
   the same number of columns as its header — no ragged rows.
7. No "Open Questions" section. Note uncertainties as a one-line
   Assumption at the top of the feature.
8. Output is pure Markdown. No preamble, no code fences around the whole
   document, no closing remark.

## OUTPUT STRUCTURE

Start with:

# Features

[One short intro paragraph for the chosen module.]

## Features at a Glance
| # | Feature ID | Feature Name | Primary Persona | Priority |
|---|---|---|---|---|

Then, per feature:

## Feature <N>: <Feature Name>

### <N>.1 Summary
One to three sentences.

### <N>.2 User Stories
1–3 stories: "As a <persona>, I want to <goal> so that <benefit>."

### <N>.3 Entry Points
Every place in the product where the user can trigger this feature.

### <N>.4 Preconditions
What must be true before the feature is usable.

### <N>.5 Functional Requirements
Table: FR ID | Requirement | Priority (Must/Should/Nice) | Notes.
6–15 FRs. Atomic, testable.

### <N>.6 Validation Rules
Only for features with user input. Otherwise: "Not applicable — no user
input."
Table: VR ID | Field / Input | Rule | When Enforced (on-type/on-blur/
on-submit/on-change) | Error Message (verbatim, in quotes).
Cover: required, format, min/max length, allowed chars, disallowed
patterns (SSN/EIN/card/bar numbers), uniqueness, cross-field rules, file
upload (size, type).
One row per distinct rule.

### <N>.7 Session Rules
Table: SR ID | Scenario | Expected Behaviour.
Cover every row below where relevant to this feature (mark "Not
applicable — <reason>" if truly irrelevant; do NOT skip silently):
- Session expired before user starts the feature
- Session expired while feature is open but user hasn't acted
- Session expired mid-action (user clicks CTA with stale token)
- Browser refresh mid-flow (unsaved state preserved or discarded)
- Back button mid-flow
- Same feature open in two tabs, user acts in both
- User's role/permissions change while feature is open
- Inactivity auto-logout fires while feature is open
- User signs out from another tab
- Password reset from another device
- Network drop + return
- Long idle pause (laptop lid closed)
State for each: what user sees, whether unsaved input survives, whether
any partial record is created, how user returns to safe state.

### <N>.8 Happy-Path Flow
Table: Step | User Action | System Response. 4–8 steps.

### <N>.9 Alternate Flows
One sub-section per alt flow, same 3-column table. Minimum coverage:
- User cancels mid-way
- User navigates back
- User submits with missing/invalid input (if the feature has forms)
- User triggers feature when preconditions are not met

### <N>.10 Business Rules (feature-specific)
Table: BR ID | Rule | Rationale. Only rules unique to THIS feature.
If none: "Not applicable — module-level rules apply."

### <N>.11 Edge Cases & Error Handling
Table: Case ID | Trigger/Scenario | Expected Behaviour | User-Facing
Message. Cover where applicable:
- Permission variants (user not allowed)
- Network / timeout failures
- Server rejects submission
- Duplicate input
- Stale data (another admin changed it)
- Concurrency
- Empty states (zero results)
- Upper-limit states (over cap)
- Sensitive-ID detection
- Read-only / maintenance mode
Do NOT duplicate session scenarios (they live in 7) or validation
scenarios (they live in 6).

### <N>.12 Acceptance Criteria
Given/When/Then format. IDs AC-<N>.01, AC-<N>.02, …
One AC per: happy path, every alternate flow, every key edge case,
every validation category, every session-expiry scenario, every
permission-gated behaviour.

### <N>.13 Test Scenarios
Table: TS ID | Scenario | Expected Result | Covers (FR/VR/SR/BR/EC/AC
IDs) | Priority (P0/P1/P2).
10–15 per feature. Every row references IDs it covers.

Insert \`---\` between features.

## FEATURE DISCOVERY
If the user message names a PLATFORM and MODULE but no features, infer
the natural features by user journey. Typical mappings for YourAI:

- Tenant Management → Listing; Add Tenant; Detail Slide-Over; Edit
  Tenant; Block/Unblock; Filtered CSV Export.
- User Management → Listing; Invite; Detail; Edit; Block/Unblock;
  Role Change; Export.
- Chat View → New Chat; Ask Question; Citations; Document Upload;
  Escalate to Lawyer; Chat History.
- Configurations → List; View; Edit; Publish/Rollback.
- Audit Log → Listing; Filters & Search; Detail Drawer; Export.
- Billing → Plans; Invoices; Payment Methods; Usage Meters.

For other modules, infer from the name and the platform (Chat View =
end-user; Super Admin = internal).

## DEPTH GUIDELINE
Aim for 5–7 features per module. Per feature target: 8–12 FRs, 5–10
validation rules (where applicable), 8–12 session rows, 8–15 edge cases,
10–15 ACs, 10–15 test scenarios. Depth over breadth.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  // Debug mode: if `?debug=1` is present OR the X-Debug header is set,
  // the server returns verbose upstream error details in the error JSON.
  // Intended for internal debugging only. Streaming success responses are
  // unchanged.
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1' || req.headers.get('x-debug') === '1';

  let body: { platform?: string; module?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(GENERIC_ERROR_MESSAGE, 400, debug ? { reason: 'body-parse-failed' } : undefined);
  }

  const platform = typeof body.platform === 'string' ? body.platform.trim() : '';
  const moduleLabel = typeof body.module === 'string' ? body.module.trim() : '';
  if (!platform || !moduleLabel) {
    return jsonError(GENERIC_ERROR_MESSAGE, 400, debug ? { reason: 'missing-platform-or-module', platform, module: moduleLabel } : undefined);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[frd-generate] OPENAI_API_KEY is not configured');
    return jsonError(GENERIC_ERROR_MESSAGE, 500, debug ? { reason: 'missing-openai-api-key' } : undefined);
  }

  const userMessage =
    'Generate the Features chapter for this module.\n' +
    'PLATFORM: ' + platform + '\n' +
    'MODULE: ' + moduleLabel + '\n' +
    'Identify the natural features of this module and produce a ' +
    'single Markdown document following the structure in the ' +
    'system prompt.';

  let upstream: Response;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
        max_completion_tokens: 16000,
        stream: true,
        messages: [
          { role: 'system', content: FRD_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });
  } catch (err) {
    console.error('[frd-generate] fetch to OpenAI failed', err);
    return jsonError(GENERIC_ERROR_MESSAGE, 502, debug ? { reason: 'openai-fetch-threw', detail: (err as Error)?.message || String(err) } : undefined);
  }

  if (!upstream.ok || !upstream.body) {
    let detail = '';
    try { detail = await upstream.text(); } catch { /* ignore */ }
    console.error(`[frd-generate] OpenAI responded ${upstream.status}: ${detail.slice(0, 500)}`);
    return jsonError(
      GENERIC_ERROR_MESSAGE,
      502,
      debug ? { reason: 'openai-non-2xx', status: upstream.status, body: detail.slice(0, 2000) } : undefined,
    );
  }

  // Parse OpenAI's SSE stream and forward plain text tokens to the browser.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const output = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = '';
      let wroteAnything = false;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let frameEnd = buffer.indexOf('\n\n');
          while (frameEnd !== -1) {
            const frame = buffer.slice(0, frameEnd);
            buffer = buffer.slice(frameEnd + 2);

            for (const line of frame.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (data === '[DONE]') continue;
              if (!data) continue;
              try {
                const parsed = JSON.parse(data);
                const delta: string | undefined = parsed?.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(encoder.encode(delta));
                  wroteAnything = true;
                }
              } catch {
                // Skip malformed frames.
              }
            }

            frameEnd = buffer.indexOf('\n\n');
          }
        }
        if (!wroteAnything) {
          controller.enqueue(encoder.encode(GENERIC_ERROR_MESSAGE));
        }
      } catch (err) {
        console.error('[frd-generate] stream read error', err);
        if (!wroteAnything) {
          controller.enqueue(encoder.encode(GENERIC_ERROR_MESSAGE));
        }
      } finally {
        try { reader.releaseLock(); } catch { /* ignore */ }
        controller.close();
      }
    },
  });

  return new Response(output, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}

function jsonError(
  message: string,
  status: number,
  debugInfo?: Record<string, unknown>,
): Response {
  const payload: Record<string, unknown> = { error: message };
  if (debugInfo) payload.debug = debugInfo;
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
