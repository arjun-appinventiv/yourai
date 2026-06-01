// ─── /api/chat — AWS Bedrock / Claude proxy ──────────────────────────────
//
// Lets the browser talk to Claude on AWS Bedrock without ever seeing
// credentials. Accepts the client's simple `{ message, history?, system?,
// intent?, docAttached? }` shape (and the older `{ messages: [...] }` shape
// for back-compat), builds a Claude Messages API request, and pipes the
// assistant's text back as a plain `text/plain` stream so the existing
// ChatView reader (which just concatenates chunks) works unchanged.
//
// Requires Vercel env vars:
//   AWS_ACCESS_KEY_ID      — IAM access key
//   AWS_SECRET_ACCESS_KEY  — IAM secret key
//   AWS_REGION             — e.g. us-east-1
// (BEDROCK_KEY is not used — standard IAM credentials are sufficient)
//
// Switched from Edge runtime (OpenAI fetch-based) to Node.js runtime
// because the AWS SDK's binary event-stream decoder requires Node APIs.

import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

// Node.js serverless runtime — required for @aws-sdk/client-bedrock-runtime.
// Edge runtime doesn't support the binary event-stream decoder the SDK uses.
export const config = { runtime: 'nodejs18.x' };

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// Default Claude model on Bedrock.
// claude-3-5-haiku is comparable to gpt-4o-mini in speed and cost.
// Swap to the sonnet ID below for higher-quality responses:
//   anthropic.claude-3-5-sonnet-20241022-v2:0
const DEFAULT_MODEL = 'anthropic.claude-3-5-haiku-20241022-v1:0';

// ── Per-intent JSON schemas. These match the *CardData types in
// src/components/chat/cards/*.tsx. If you add a new card-rendering
// intent, drop its schema here and ChatView will route it. ──
const CARD_SCHEMAS: Record<string, string> = {
  // Intent classifier — not a card, but reuses the JSON-output forcing
  // path. Returns the routing decision for a user message. Added
  // 2026-05-16 to replace fragile keyword-based detection (typos,
  // synonyms, paraphrases break the keyword detector). See
  // src/lib/intentClassifier.ts.
  classify: `{
  "primaryIntent": "string — one of: general_chat, contract_review, legal_research, document_drafting, document_summarisation, case_law_analysis, clause_comparison, email_letter_drafting, legal_qa, risk_assessment, clause_analysis, find_document",
  "isMultiIntent": false,
  "otherIntents": ["string — additional intent IDs from the same list, ordered by likelihood (empty array if isMultiIntent is false)"],
  "confidence": 0.0
}`,
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
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region          = process.env.AWS_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
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
  // Track card schema in outer scope so we can inject JSON format
  // instructions and the assistant-prefill trick downstream.
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

MISSING DOCUMENT HANDLING — IMPORTANT:
If the user asks you to review, summarise, analyse, compare, extract clauses from, build a timeline of, or produce a risk memo on a document, BUT no document content appears anywhere in this conversation (no attachment, no prior uploaded text, nothing to actually work with), DO NOT refuse and DO NOT use the off-topic refusal format. Instead reply with a short, helpful prompt:

"I'd be glad to [repeat what they asked, e.g. 'review that contract for one-sided provisions']. Upload the document using the + button next to the input, then send your request again and I'll produce the full analysis."

Optionally add one clarifying sentence (what format is best, or what specifically to include). Keep the whole reply under ~50 words — friendly, concrete, one clear next step.

Within the legal domain: be concise, accurate, cite jurisdictions where relevant, and never fabricate case names, statute numbers, or regulatory citations. If the user's legal question is vague (e.g. "federal rules of California"), interpret it reasonably — ask a clarifying question if needed, but do not refuse.`,
    };

    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history.filter((m: any) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
      : [];
    messages = [system, ...history, { role: 'user', content: body.message }];

    // ── Doc-attached override ─────────────────────────────────────────
    // When the client signals a document IS attached (content stitched
    // into the user message under the [Documents attached…] header),
    // prepend a hard system instruction that overrides the default
    // MISSING_DOCUMENT_HANDLING fallback. The LLM sometimes mis-reads
    // ambiguous multi-task messages and asks for an upload that's
    // already there — this kill-switch makes that impossible.
    if (body.docAttached === true) {
      messages.unshift({
        role: 'system',
        content: `CRITICAL CONTEXT: A document IS attached to this conversation. Its full text is included in the user's message below under a "[Documents attached to this conversation]" header. The user has ALREADY uploaded a document.

DO NOT reply with "Upload the document using the + button" or any variation. DO NOT ask the user to upload anything. DO NOT fall through to the MISSING DOCUMENT HANDLING branch above — that branch DOES NOT APPLY here because a document is present.

Use the document content provided. If the user's question is ambiguous, do your best with what's attached. If the attached document genuinely doesn't contain what's needed, say "Not covered by the supplied documents." and explain what IS in it — never ask for a fresh upload.`,
      });
    }

    // ── Intent-specific card-shape instructions ──────────────────────
    // When the client tags the request with a card-rendering intent,
    // prepend a JSON-only instruction with the exact schema. Combined
    // with the assistant-prefill trick below, this ensures structured
    // JSON output without relying on a native JSON-mode flag
    // (Bedrock/Claude doesn't have response_format: json_object).
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
    const keys    = body && typeof body === 'object' ? Object.keys(body) : [];
    const msgType = typeof body?.message;
    const msgLen  = typeof body?.message === 'string' ? body.message.length : 0;
    const msgsLen = Array.isArray(body?.messages) ? body.messages.length : 'not-array';
    return new Response(
      `Request missing usable content. keys=[${keys.join(',')}] message:${msgType}(len=${msgLen}) messages:${msgsLen}`,
      { status: 400, headers: { 'Content-Type': 'text/plain' } },
    );
  }

  // ── Build the Claude Messages API request ────────────────────────────
  // Claude's API requires system instructions in a top-level `system`
  // field (not in the messages array). Extract all system-role entries
  // and join them, then pass only user/assistant messages.
  const systemParts   = messages.filter(m => m.role === 'system').map(m => m.content);
  const chatMessages  = messages.filter(m => m.role !== 'system') as Array<{ role: 'user' | 'assistant'; content: string }>;

  // Clamp temperature to Anthropic's 0–1 range (client may send OpenAI's 0–2).
  const temperature = Math.min(body.temperature ?? 0.7, 1);
  const max_tokens  = body.max_tokens || 2048;

  // Assistant-prefill trick: for card intents, seed the assistant turn
  // with `{` so Claude is forced to continue with valid JSON.
  // We'll prepend that `{` back into the output stream below.
  if (cardSchema) {
    chatMessages.push({ role: 'assistant', content: '{' });
  }

  const bedrockBody = {
    anthropic_version: 'bedrock-2023-05-31',
    ...(systemParts.length > 0 ? { system: systemParts.join('\n\n') } : {}),
    messages: chatMessages,
    max_tokens,
    temperature,
  };

  const client = new BedrockRuntimeClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  let upstream: Awaited<ReturnType<typeof client.send>>;
  try {
    upstream = await client.send(
      new InvokeModelWithResponseStreamCommand({
        modelId: DEFAULT_MODEL,
        contentType: 'application/json',
        accept:      'application/json',
        body:        JSON.stringify(bedrockBody),
      }),
    );
  } catch (err: any) {
    const raw = (err?.message || '').toLowerCase();
    let message = 'Something went wrong. Please try again.';
    if (/throttl|too many request|rate.?limit/.test(raw))      message = 'The AI is busy right now. Please try again in a moment.';
    else if (/access denied|forbidden|not authorized/.test(raw)) message = 'AI service is temporarily unavailable. Please contact your administrator.';
    else if (/context.?length|too long/.test(raw))              message = 'This conversation is too long to continue. Please start a new chat.';
    else if (/timeout|timed out|connection/.test(raw))          message = 'The AI took too long to respond. Please try again.';
    return new Response(message, {
      status: 500, headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Transform Bedrock event-stream → plain text chunks for the client.
  // Each event.chunk.bytes decodes to a Claude streaming event JSON.
  // We extract only content_block_delta / text_delta events.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Re-inject the prefill `{` so the client receives complete JSON.
      if (cardSchema) {
        controller.enqueue(encoder.encode('{'));
      }
      try {
        for await (const event of upstream.body!) {
          if (event.chunk?.bytes) {
            const chunk = JSON.parse(decoder.decode(event.chunk.bytes));
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta?.type === 'text_delta' &&
              typeof chunk.delta.text === 'string' &&
              chunk.delta.text.length > 0
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        }
      } catch {
        controller.enqueue(encoder.encode('\n\n[Connection interrupted. Please try again.]'));
      } finally {
        controller.close();
      }
    },
    cancel() { /* AWS SDK handles cleanup */ },
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
