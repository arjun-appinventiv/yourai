// ─── Smart Intent Detector ───
// Frontend-only keyword matching — zero latency, no API calls.
// Uses SA-configured keywords when available, falls back to defaults.

export interface IntentConfig {
  keywords: string[];
  opening_behaviour: 'ask_for_document' | 'ask_clarifying_question' | 'start_immediately';
  custom_instruction: string;
  response_format: 'risk_card' | 'structured_sections' | 'plain_prose';
}

export interface IntentMatch {
  intentId: string;
  matchCount: number;     // How many keywords matched
  keywords: string[];     // Which keywords matched
}

export const INTENT_DEFAULTS: Record<string, IntentConfig> = {
  general_chat: {
    keywords: [],
    opening_behaviour: 'start_immediately',
    custom_instruction: '',

    response_format: 'plain_prose',
  },
  contract_review: {
    keywords: [
      'contract review', 'review this contract', 'review the contract',
      'review a contract', 'review my contract', 'check this contract',
      'analyse this contract', 'analyze this contract', 'look at this contract',
      'review this agreement', 'check this agreement', 'analyse this nda',
      'review this nda', 'review this msa', 'review this lease',
      'help with contract', 'help me review', 'review contract',
    ],
    opening_behaviour: 'ask_for_document',
    custom_instruction: '',

    response_format: 'risk_card',
  },
  legal_research: {
    keywords: [
      'what does the law say', 'legal precedent', 'case law on',
      'is it legal to', 'what are my legal rights', 'legal position on', 'find case law',
    ],
    opening_behaviour: 'start_immediately',
    custom_instruction: '',

    response_format: 'structured_sections',
  },
  document_drafting: {
    keywords: [
      'draft a contract', 'draft an agreement', 'draft a clause', 'draft an nda',
      'write a contract', 'write an agreement', 'create a contract',
      'help me draft', 'help with drafting', 'can you draft', 'i need a contract',
      'template for a contract', 'document drafting', 'draft document',
    ],
    opening_behaviour: 'ask_clarifying_question',
    custom_instruction: '',

    response_format: 'structured_sections',
  },
  document_summarisation: {
    keywords: [
      'summarise this', 'summarize this', 'give me a summary', 'summary of this',
      'summarise', 'summarize', 'summarisation', 'summarization',
      'tldr', 'tl;dr', 'key points from', 'main points of', 'brief me on', 'overview of this',
      'help with summary', 'document summary',
    ],
    opening_behaviour: 'ask_for_document',
    custom_instruction: '',

    response_format: 'structured_sections',
  },
  case_law_analysis: {
    keywords: [
      'analyse this case', 'analyze this case', 'case analysis',
      'court decision', 'what happened in this case', 'this judgment',
      'this judgement', 'ruling in',
    ],
    opening_behaviour: 'ask_for_document',
    custom_instruction: '',

    response_format: 'structured_sections',
  },
  clause_comparison: {
    keywords: [
      'compare these', 'compare the two', 'compare both', 'difference between',
      'which is better', 'side by side', 'contrast these', 'how do these differ',
      'compare clause', 'compare contracts', 'clause comparison',
      'help with comparison', 'compare documents',
    ],
    opening_behaviour: 'ask_for_document',
    custom_instruction: '',

    response_format: 'structured_sections',
  },
  email_letter_drafting: {
    keywords: [
      'write an email', 'draft an email', 'write a letter', 'draft a letter',
      'compose an email', 'demand letter', 'cease and desist',
      'reply to this email', 'response to their email',
      'help with email', 'help with letter', 'email drafting',
    ],
    opening_behaviour: 'ask_clarifying_question',
    custom_instruction: '',

    response_format: 'plain_prose',
  },
  legal_qa: {
    keywords: [
      'what is', 'what are', 'how does', 'can i', 'do i have to',
      'am i required', 'explain', 'define', 'meaning of',
      'is this enforceable', 'is it possible',
    ],
    opening_behaviour: 'start_immediately',
    custom_instruction: '',

    response_format: 'structured_sections',
  },
  risk_assessment: {
    keywords: [
      'what are the risks', 'identify the risks', 'risk assessment',
      'assess the risk', 'any red flags', 'risky clauses', 'risk analysis',
      'should i sign this', 'is this safe to sign', 'anything concerning', 'flag the risks',
      'help with risk', 'evaluate risk', 'risk memo', 'generate a risk memo',
      'risk review',
    ],
    opening_behaviour: 'ask_for_document',
    custom_instruction: '',

    response_format: 'risk_card',
  },
  clause_analysis: {
    keywords: [
      'analyse clauses', 'analyze clauses', 'extract clauses', 'break down the clauses',
      'walk me through the clauses', 'clause by clause', 'each clause',
      'which clauses', 'list the clauses', 'clause analysis', 'analyse each clause',
      'what clauses are in', 'breakdown of clauses',
    ],
    opening_behaviour: 'ask_for_document',
    custom_instruction: '',
    response_format: 'structured_sections',
  },
  timeline_extraction: {
    keywords: [
      'timeline of', 'chronology', 'chronological order', 'dates in this',
      'key dates', 'build a timeline', 'extract the timeline', 'sequence of events',
      'what happened when', 'list the events', 'litigation timeline', 'discovery timeline',
      'deadlines in this', 'important dates',
    ],
    opening_behaviour: 'ask_for_document',
    custom_instruction: '',
    response_format: 'structured_sections',
  },
  // Vault-search intent. Client-only — no LLM round-trip. Keywords combine
  // an action verb (find / search / where / do I have / show me / list)
  // with a noun anchor (file / files / doc / docs / document / documents)
  // so we don't false-positive on generic prose like "find a precedent".
  find_document: {
    keywords: [
      'find file', 'find files', 'find a file', 'find my file', 'find the file',
      'find doc', 'find docs', 'find a doc', 'find my doc', 'find the doc',
      'find document', 'find documents', 'find a document', 'find my document', 'find the document',
      'search for file', 'search for files', 'search for doc', 'search for docs',
      'search for document', 'search for documents', 'search my files', 'search my docs',
      'search my documents', 'search the vault',
      'where is the file', 'where is the doc', 'where is the document',
      'where is my file', 'where is my doc', 'where is my document',
      "where's the file", "where's the doc", "where's the document",
      "where's my file", "where's my doc", "where's my document",
      'do i have a file', 'do i have any file', 'do i have any files',
      'do i have a doc', 'do i have any doc', 'do i have any docs',
      'do i have a document', 'do i have any document', 'do i have any documents',
      'show me the file', 'show me the doc', 'show me the document',
      'show me my files', 'show me my docs', 'show me my documents',
      'list my files', 'list my docs', 'list my documents',
      'list the files', 'list the docs', 'list the documents',
      'what files', 'what docs', 'what documents',
      'in my vault', 'in the vault', 'from my vault', 'in vault',
    ],
    opening_behaviour: 'start_immediately',
    custom_instruction: '',
    response_format: 'structured_sections',
  },
};

// Priority order — legal_qa checked LAST as fallback.
// find_document sits high so vault-search keyword anchors ("find file",
// "where's my doc", "do I have any documents") don't get drowned by
// the "what is" / "explain" patterns that legal_qa also matches.
const PRIORITY_ORDER = [
  'find_document',
  'contract_review',
  'timeline_extraction',
  'clause_analysis',
  'document_summarisation',
  'document_drafting',
  'risk_assessment',
  'clause_comparison',
  'legal_research',
  'case_law_analysis',
  'email_letter_drafting',
];

/**
 * Detect which intent a message likely maps to.
 * Returns the intent ID or null.
 *
 * Multi-keyword match logic:
 * - Counts how many keywords from each intent are found in the message.
 * - The intent with the MOST keyword matches wins (not just first match).
 * - On tie, priority order breaks the tie.
 *
 * Cross-intent handling:
 * - If the user is in general_chat but the message matches a specific intent,
 *   returns the matched intent so ChatView can suggest switching.
 * - If already in a specific intent, only suggests switching if a different
 *   intent has significantly more keyword matches (2+ more).
 */
export function detectIntent(
  message: string,
  currentIntent: string,
  intentConfigs: Record<string, IntentConfig> = {}
): string | null {
  if (message.trim().length < 10) return null;

  const lower = message.toLowerCase().trim();

  // Score each intent by counting keyword matches
  const scores: IntentMatch[] = [];

  for (const intentId of [...PRIORITY_ORDER, 'legal_qa']) {
    const config = intentConfigs[intentId] ?? INTENT_DEFAULTS[intentId];
    const keywords = config?.keywords ?? [];
    const matchedKws = keywords.filter(k => lower.includes(k.toLowerCase()));

    if (matchedKws.length > 0) {
      scores.push({ intentId, matchCount: matchedKws.length, keywords: matchedKws });
    }
  }

  if (scores.length === 0) return null;

  // Sort by matchCount descending, then by priority order for tie-breaking
  scores.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    const aPri = PRIORITY_ORDER.indexOf(a.intentId);
    const bPri = PRIORITY_ORDER.indexOf(b.intentId);
    return (aPri === -1 ? 999 : aPri) - (bPri === -1 ? 999 : bPri);
  });

  const bestMatch = scores[0];

  // If best match is current intent, no switch needed
  if (bestMatch.intentId === currentIntent) return null;

  // Cross-intent threshold: if user is already in a specific intent (not general_chat),
  // only suggest switching if the new intent has significantly more matches
  if (currentIntent !== 'general_chat') {
    const currentScore = scores.find(s => s.intentId === currentIntent);
    const currentCount = currentScore?.matchCount ?? 0;
    // Need 2+ more matches than current intent to warrant a switch suggestion
    if (bestMatch.matchCount - currentCount < 2) return null;
  }

  // legal_qa — only suggest if no better intent matched OR user is in general_chat
  if (bestMatch.intentId === 'legal_qa' && currentIntent !== 'general_chat') {
    return null;
  }

  return bestMatch.intentId;
}

/**
 * Get all matching intents with their scores.
 * Useful for UI when multiple intents match and user needs to pick.
 */
export function detectAllIntents(
  message: string,
  intentConfigs: Record<string, IntentConfig> = {}
): IntentMatch[] {
  if (message.trim().length < 10) return [];

  const lower = message.toLowerCase().trim();
  const scores: IntentMatch[] = [];

  for (const intentId of [...PRIORITY_ORDER, 'legal_qa']) {
    const config = intentConfigs[intentId] ?? INTENT_DEFAULTS[intentId];
    const keywords = config?.keywords ?? [];
    const matchedKws = keywords.filter(k => lower.includes(k.toLowerCase()));

    if (matchedKws.length > 0) {
      scores.push({ intentId, matchCount: matchedKws.length, keywords: matchedKws });
    }
  }

  return scores.sort((a, b) => b.matchCount - a.matchCount);
}
