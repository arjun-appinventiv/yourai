// ─── /api/chat — server-side OpenAI proxy ────────────────────────────────
//
// Lets the browser talk to OpenAI without ever seeing the key. Accepts the
// client's simple `{ message, conversationId?, sessionId?, sessionDocId?,
// history?, system? }` shape (and also the older `{ messages: [...] }`
// shape for back-compat), calls OpenAI Chat Completions with stream=true,
// and pipes the assistant's text back as a plain `text/plain` stream so
// the existing ChatView reader (which just concatenates chunks) works
// unchanged.
//
// Runs on Vercel's Edge runtime for first-class streaming.

export const config = { runtime: 'edge' };

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// ── Per-intent JSON schemas. These match the *CardData types in
// src/components/chat/cards/*.tsx. If you add a new card-rendering
// intent, drop its schema here and ChatView will route it. ──
const CARD_SCHEMAS: Record<string, string> = {
  document_summarisation: `{
  "documentName": "string — the uploaded doc name",
  "clauseCount": 0,
  "fileSize": "string — e.g. '4.2 MB' or '—'",
  "date": "string — effective or publication date, e.g. 'March 2026'",
  "executiveSummary": "string — 2-4 sentence plain-English overview",
  "metadata": {
    "parties": "string — multiline allowed with \\n",
    "keyDates": "string",
    "governingLaw": "string",
    "keyObligations": "string"
  },
  "keyPoints": ["string — 3-6 bullet findings"],
  "flag": "string or null — one sentence callout of the biggest risk",
  "sourceType": "doc" or "kb",
  "sourceName": "string — filename or KB name"
}`,
  legal_research: `{
  "topic": "string — the research question, e.g. 'Non-Compete Enforceability — New York Law'",
  "jurisdiction": "string — e.g. 'New York'",
  "stats": { "statutes": number, "cases": number, "principles": number, "jurisdiction": "short code like 'NY'" },
  "sections": [
    { "title": "Applicable Statutes",    "content": "markdown string with **bold** for key terms", "citations": ["short citation strings"] },
    { "title": "Relevant Case Law",      "content": "markdown string",                              "citations": ["Case (year)", "..."] },
    { "title": "Key Principles",         "content": "markdown string",                              "citations": [] },
    { "title": "Practical Implications", "content": "markdown string",                              "citations": [] }
  ],
  "sourceType": "kb",
  "sourceName": "YourAI knowledge base"
}`,
  // legal_qa deliberately NOT card-ified — Q&A should stay as markdown
  // prose so natural follow-ups don't look like forced research briefs.
  case_law_analysis: `{
  "caseName": "string — e.g. 'TechFlow Inc v Apex Systems Corp'",
  "court": "string — short e.g. 'SDNY'",
  "date": "string — e.g. 'March 2024'",
  "subject": "string — short subject line",
  "rows": [
    { "label": "Parties",   "value": "string" },
    { "label": "Court",     "value": "string" },
    { "label": "Date",      "value": "string" },
    { "label": "Issue",     "value": "string" },
    { "label": "Holding",   "value": "string", "isHolding": true },
    { "label": "Reasoning", "value": "string" }
  ],
  "precedence": { "tags": ["string"], "tagStyles": ["blue" | "grey" | "amber" | "green"], "note": "string" },
  "application": "string — how this applies to the user's matter",
  "sourceType": "doc" or "kb",
  "sourceName": "string"
}`,
  clause_comparison: `{
  "doc1Name": "string",
  "doc2Name": "string",
  "clauseCount": number,
  "rows": [
    {
      "clause": "string — e.g. 'Non-Compete Duration'",
      "doc1": { "verdict": "better" | "worse" | "neutral", "text": "string" },
      "doc2": { "verdict": "better" | "worse" | "neutral", "text": "string" }
    }
  ],
  "recommendation": "string — one-sentence closing recommendation",
  "sourceType": "doc" or "workspace",
  "sourceName": "string — e.g. 'NDA_v1.pdf + NDA_v2.pdf'"
}`,
  risk_assessment: `{
  "matterName": "string",
  "documentName": "string or null",
  "documentMeta": "string or null — e.g. '23 clauses · 4.2 MB'",
  "pages": number or null,
  "size": "string or null",
  "uploadedLabel": "string or null — e.g. 'Uploaded today'",
  "executiveSummary": "string — 2-3 sentence overview",
  "highlightQuote": { "quote": "string — most important verbatim finding", "caption": "string — e.g. 'Finding #1 · High severity · Owner: Deal team'" } or null,
  "trailingSummary": "string or null — closing paragraph after the quote",
  "findings": [
    {
      "title": "string — short finding name",
      "severity": "high" | "medium" | "low",
      "location": "string — e.g. '§7.2'",
      "owner": "string — e.g. 'Deal team'",
      "quote": "string or null — verbatim from the doc",
      "recommendation": "string — what to do about it"
    }
  ],
  "sourceName": "string",
  "generatedLabel": "string — e.g. 'Generated just now'"
}`,
  clause_analysis: `{
  "matterName": "string",
  "documentName": "string or null",
  "documentMeta": "string or null",
  "pages": number or null,
  "size": "string or null",
  "uploadedLabel": "string or null",
  "clauses": [
    {
      "title": "string — e.g. 'Limitation of liability'",
      "location": "string — e.g. '§11'",
      "risk": "high" | "medium" | "low",
      "quote": "string or null — verbatim from doc",
      "interpretation": "string — plain-English explanation",
      "recommendation": "string or null — optional negotiating move"
    }
  ],
  "sourceName": "string",
  "generatedLabel": "string"
}`,
  timeline_extraction: `{
  "matterName": "string",
  "documentName": "string or null",
  "documentMeta": "string or null",
  "pages": number or null,
  "size": "string or null",
  "uploadedLabel": "string or null",
  "events": [
    {
      "date": "string — keep the source's format",
      "kind": "event" | "deadline" | "milestone" | "filing",
      "label": "string — short event title",
      "description": "string or null",
      "source": "string or null — e.g. 'p.1' or '§3.2'"
    }
  ],
  "sourceName": "string",
  "generatedLabel": "string"
}`,
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = (globalThis as any).process?.env?.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response('AI service is not configured on the server.', {
      status: 500, headers: { 'Content-Type': 'text/plain' },
    });
  }

  let body: any;
  try { body = await req.json(); } catch (e) {
    return new Response(`Invalid JSON body: ${(e as Error)?.message || 'parse failed'}`, { status: 400 });
  }

  // Build messages[] — accept both legacy `{messages}` and the client's
  // `{message, history?, system?}` shape.
  let messages: ChatMessage[] = [];
  // Track card schema in outer scope so the OpenAI call downstream can
  // flip on response_format: json_object when a card-rendering intent
  // is active.
  let cardSchema: string | undefined;
  if (Array.isArray(body?.messages) && body.messages.length > 0) {
    messages = body.messages;
  } else if (typeof body?.message === 'string' && body.message.trim()) {
    const system: ChatMessage = {
      role: 'system',
      content: body.system || `You are YourAI, a legal AI assistant for US law firms.

IN SCOPE — ANSWER NORMALLY. Anything that touches:
- Law, legal rules, statutes, regulations, procedural rules (federal or state — including Federal Rules of Civil Procedure, Criminal Procedure, Evidence, Appellate Procedure, Bankruptcy, and their state equivalents)
- Case law, judgments, court decisions, precedent
- Contracts, clauses, NDAs, agreements, MSAs, SOWs, leases
- Compliance, regulatory filings, policy, privacy (GDPR, CCPA, HIPAA), securities, antitrust, tax
- Litigation, discovery, motions, pleadings, filings, deadlines, e-discovery
- Legal research, due diligence, playbooks, risk assessment
- Ethics, bar rules, professional responsibility
- Legal terminology, definitions, jurisdictional questions
- Questions about a specific US state or federal jurisdiction's legal framework
- Broad "what is the law on X" questions — even informally phrased

If a question has ANY reasonable legal interpretation, ANSWER IT. Default to helping. Bias toward answering.

OUT OF SCOPE — REFUSE ONLY THESE. Decline in ONE short sentence ONLY when the question is unambiguously non-legal:
- Celebrity or personal trivia unrelated to a legal matter (e.g. "what's X's hair colour", "how tall is Y")
- Sports scores / results / player stats
- Entertainment trivia, movie plots, song lyrics
- Cooking recipes, food recommendations
- Weather, horoscopes, jokes, poetry, creative writing
- Medical or therapy advice
- Dating / relationship advice
- Travel recommendations
- General coding help unrelated to legal-tech
- Pure casual chit-chat beyond a brief greeting

Refusal format: "I'm a legal assistant and can only help with legal matters. Is there a contract, regulation, or case I can help you with?"

WHEN IN DOUBT, ANSWER. It is far worse to refuse a legitimate legal question than to answer an edge-case one.

Within the legal domain: be concise, accurate, cite jurisdictions where relevant, and never fabricate case names, statute numbers, or regulatory citations. If the user's legal question is vague (e.g. "federal rules of California"), interpret it reasonably — ask a clarifying question if needed, but do not refuse.`,
    };

    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history.filter((m: any) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
      : [];
    messages = [system, ...history, { role: 'user', content: body.message }];

    // ── Intent-specific card-shape instructions ──────────────────────
    // When the client tags the request with a card-rendering intent,
    // prepend a JSON-only instruction with the exact schema so the
    // response renders in the corresponding front-end card. Combined
    // with response_format: json_object on the OpenAI call, this
    // guarantees valid JSON output.
    cardSchema = CARD_SCHEMAS[body.intent as string];
    if (cardSchema) {
      messages.unshift({
        role: 'system',
        content: `OUTPUT FORMAT — CRITICAL:

Return a SINGLE JSON object that matches this TypeScript shape exactly. No prose, no preamble, no backticks, no explanation — the entire response must be valid JSON that JSON.parse() can consume.

${cardSchema}

Rules:
- Output MUST start with { and end with }
- No markdown code fences around the JSON
- No text before or after the JSON
- Use \\n inside strings for line breaks, never literal newlines that would break the JSON
- Every field listed above must be present. If information is unavailable, use an empty string "", empty array [], or null (per the shape above) rather than omitting the key or returning prose.
- Even for simple questions, populate each section of the schema. Do not return a "Q&A-style" short answer — the user's UI specifically expects the structured shape.`,
      });
    }
  } else {
    // Surface exactly what keys arrived so we can diagnose shape mismatches.
    const keys = body && typeof body === 'object' ? Object.keys(body) : [];
    const msgType = typeof body?.message;
    const msgLen  = typeof body?.message === 'string' ? body.message.length : 0;
    const msgsLen = Array.isArray(body?.messages) ? body.messages.length : 'not-array';
    return new Response(
      `Request missing usable content. keys=[${keys.join(',')}] message:${msgType}(len=${msgLen}) messages:${msgsLen}`,
      { status: 400, headers: { 'Content-Type': 'text/plain' } },
    );
  }

  const model       = body.model       || 'gpt-4o-mini';
  const temperature = body.temperature ?? 0.7;
  const max_tokens  = body.max_tokens  || 2048;

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream: true,
      // Force JSON object output when a card schema is active — this
      // is OpenAI's native structured-output flag and is the reliable
      // way to guarantee the response is a JSON object (vs. prose).
      ...(cardSchema ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errJson = await upstream.json().catch(() => ({}));
    const raw = (errJson?.error?.message || '').toLowerCase();
    let message = 'Something went wrong. Please try again.';
    if (/rate.?limit|too many requests|429|quota|exceeded/.test(raw))       message = 'The AI is busy right now. Please try again in a moment.';
    else if (/invalid.?api.?key|unauthorized|401/.test(raw))                message = 'AI service is temporarily unavailable. Please contact your administrator.';
    else if (/context.?length|maximum context|too long/.test(raw))          message = 'This conversation is too long to continue. Please start a new chat.';
    else if (/model.?not.?found|does not exist|deprecated/.test(raw))       message = 'AI service is temporarily unavailable. Please try again.';
    else if (/timeout|timed out|connection|network/.test(raw))              message = 'The AI took too long to respond. Please try again.';
    return new Response(message, {
      status: upstream.status, headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Transform OpenAI SSE → plain text chunks for the client.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader  = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by "\n\n"
          let sepIdx;
          while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sepIdx);
            buffer = buffer.slice(sepIdx + 2);

            for (const line of frame.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const json = JSON.parse(data);
                const delta = json?.choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta.length > 0) {
                  controller.enqueue(encoder.encode(delta));
                }
              } catch { /* skip malformed frame */ }
            }
          }
        }
      } catch (err) {
        // Surface a friendly error in-stream rather than abort mid-response.
        controller.enqueue(encoder.encode('\n\n[Connection interrupted. Please try again.]'));
      } finally {
        controller.close();
      }
    },
    cancel() { try { reader.cancel(); } catch { /* ignore */ } },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'X-Source-Type': 'AI_GENERATED',
    },
  });
}
