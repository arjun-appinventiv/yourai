// LLM-based intent classifier — replaces the keyword detector at the
// top of the send pipeline. The keyword detector still exists as a
// last-resort fallback when the classifier call fails or times out.
//
// Why: real user messages routinely break keyword matching — typos
// ("clasue analysis"), synonyms ("audit this contract" vs "review this
// contract"), and natural paraphrases never appear in the hand-written
// keyword lists. Each miss cascaded into wrong-intent routing and
// downstream MISSING_DOCUMENT_HANDLING firing on attached docs.
//
// Cost: ~$0.0001/send at gpt-4o-mini pricing (input ~400 tokens,
// output ~80 tokens). Latency budget capped at 2.5 s; on timeout we
// fall back to the keyword detector so the user is never blocked.

import { INTENTS } from './intents';

export type ClassifierResult = {
  primaryIntent: string;
  isMultiIntent: boolean;
  otherIntents: string[];
  confidence: number;
};

const INTENT_DESCRIPTIONS: Record<string, string> = {
  general_chat:           'casual conversation, greetings, "what can you do", broad questions with no specific task',
  contract_review:        'review/audit/check a contract for risky, one-sided, or missing provisions',
  legal_research:         'research case law, statutes, precedents, or a legal question with no specific doc',
  document_drafting:      'draft/create/write a contract, agreement, NDA, MSA, or other legal document',
  document_summarisation: 'summarise a document, give key points, TL;DR, overview',
  case_law_analysis:      'analyse a case, court decision, ruling, judgment — facts, holding, reasoning',
  clause_comparison:      'compare two or more clauses, documents, or contract versions side by side',
  email_letter_drafting:  'draft an email, letter, demand letter, response, or cease and desist',
  legal_qa:               'short factual question about law: "what is X", "can I do Y", "is Z enforceable"',
  risk_assessment:        'identify risks, red flags, risky clauses, whether to sign — produces a risk memo',
  clause_analysis:        'extract, list, break down, or walk through clauses one by one',
  find_document:          'find/search/locate a specific file or document in the vault',
};

function buildClassifierPrompt(docAttached: boolean, currentIntent: string): string {
  const intentList = INTENTS.map((i) => `- ${i.id}: ${INTENT_DESCRIPTIONS[i.id] || i.label}`).join('\n');
  return `You are an intent classifier for a legal AI assistant. Given a user message, return the primary intent ID and flag whether the message describes multiple distinct tasks.

Available intents:
${intentList}

Context:
- A document is ${docAttached ? 'ATTACHED' : 'NOT attached'} to this chat.
- The user's current selected intent is "${currentIntent}".

Rules:
1. Return a single primary intent ID from the list. If unsure between two, pick the more specific one.
2. If a document IS attached, PREFER document-analysis intents (clause_analysis, risk_assessment, document_summarisation, contract_review, case_law_analysis, clause_comparison) over research intents (legal_research, legal_qa). The user almost always wants you to act on their doc.
3. **Multi-intent detection — be liberal here**. If the user names 2+ distinct analysis types or operations, even on the same document, set isMultiIntent=true. Do NOT lump distinct operations into one just because they share a target document. The downstream system can only run ONE schema at a time, so flagging multi-intent lets the user pick which to run first.

   Examples (multi-intent = TRUE):
   - "do clause analysis and contract review of attached doc" → primary=clause_analysis, isMultiIntent=true, other=["contract_review"]
   - "Please do a cluase analysis and contract review" → primary=clause_analysis, isMultiIntent=true, other=["contract_review"]  (typo: cluase=clause)
   - "summarise this and identify risks" → primary=document_summarisation, isMultiIntent=true, other=["risk_assessment"]
   - "review and compare these contracts" → primary=contract_review, isMultiIntent=true, other=["clause_comparison"]
   - "analyse the clauses, then draft an amendment" → primary=clause_analysis, isMultiIntent=true, other=["document_drafting"]

   Examples (single intent — isMultiIntent=FALSE):
   - "review this contract" → single (one operation)
   - "what risks does this have" → single (risk_assessment)
   - "summarise this doc" → single
   - "review this contract for one-sided terms and missing provisions" → single contract_review (modifiers, not distinct ops)
   - "analyse the indemnification and termination clauses" → single clause_analysis (one op on multiple clauses)

   Heuristic: if removing the conjunction ("and"/"then"/etc.) leaves two complete operation phrases each with its own verb + noun, it's multi-intent.

4. Tolerate typos and paraphrases. Common typos to recognise:
   - "clasue", "cluase", "calsue", "clausse" → clause
   - "contarct", "contrct", "contrract" → contract
   - "analyis", "anaylsis", "analsis" → analysis
   - "reveiw", "reivew" → review
   - "summarise", "summarize", "summarrise" → all the same
5. confidence is 0.0-1.0 — your certainty in primaryIntent.
6. If the message is truly conversational/empty/off-topic, return primaryIntent="general_chat".

Return ONLY the JSON. No prose, no preamble.`;
}

export async function classifyIntent(
  message: string,
  currentIntent: string,
  docAttached: boolean,
  opts?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<ClassifierResult | null> {
  const trimmed = (message || '').trim();
  if (!trimmed || trimmed.length < 3) return null;

  const timeoutMs = opts?.timeoutMs ?? 2500;
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), timeoutMs);
  // Chain any caller-provided signal.
  if (opts?.signal) {
    if (opts.signal.aborted) { ctrl.abort(); }
    else opts.signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }

  try {
    const base = window.location.origin;
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: trimmed,
        system: buildClassifierPrompt(docAttached, currentIntent),
        intent: 'classify',
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 300,
      }),
    });
    if (!res.ok || !res.body) return null;

    // Drain the stream into text (response_format: json_object on the
    // server means the body, once decoded, is one JSON object).
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let raw = '';
    // Edge streams in OpenAI SSE format — extract delta.content from
    // each "data: {...}" line. Cribbed from the main chat reader.
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') raw += delta;
        } catch { /* skip malformed line */ }
      }
    }
    raw += decoder.decode();
    if (!raw.trim()) return null;

    // The model returns a JSON object directly (response_format forces it).
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.primaryIntent !== 'string') return null;
    const valid = new Set(INTENTS.map((i) => i.id));
    if (!valid.has(parsed.primaryIntent)) return null;
    const otherIntents: string[] = Array.isArray(parsed.otherIntents)
      ? parsed.otherIntents.filter((id: any) => typeof id === 'string' && valid.has(id) && id !== parsed.primaryIntent)
      : [];
    const result = {
      primaryIntent: parsed.primaryIntent,
      isMultiIntent: !!parsed.isMultiIntent && otherIntents.length > 0,
      otherIntents,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    };
    // Debug visibility — surfaces in DevTools so we can verify the
    // classifier's decision when intent routing surprises a user.
    // Cheap to keep in prod; remove if it becomes noise.
    try { console.info('[intentClassifier]', { input: trimmed.slice(0, 80), ...result }); } catch { /* no-op */ }
    return result;
  } catch (err) {
    try { console.warn('[intentClassifier] failed → falling back to keyword detector', err); } catch { /* no-op */ }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
