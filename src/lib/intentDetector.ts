// ─── Smart Intent Detector ───
// Frontend-only keyword matching — zero latency, no API calls.
// Uses SA-configured keywords when available, falls back to defaults.

export interface IntentConfig {
  keywords: string[];
  opening_behaviour: 'ask_for_document' | 'ask_clarifying_question' | 'start_immediately';
  custom_instruction: string;
  requires_document: boolean;
  response_format: 'risk_card' | 'structured_sections' | 'plain_prose';
}

export const INTENT_DEFAULTS: Record<string, IntentConfig> = {
  general_chat: {
    keywords: [],
    opening_behaviour: 'start_immediately',
    custom_instruction: '',
    requires_document: false,
    response_format: 'plain_prose',
  },
  contract_review: {
    keywords: [
      'review this contract', 'review the contract', 'check this contract',
      'analyse this contract', 'analyze this contract', 'look at this contract',
      'review this agreement', 'check this agreement', 'analyse this nda',
      'review this nda', 'review this msa', 'review this lease',
    ],
    opening_behaviour: 'ask_for_document',
    custom_instruction: '',
    requires_document: true,
    response_format: 'risk_card',
  },
  legal_research: {
    keywords: [
      'what does the law say', 'legal precedent', 'case law on',
      'is it legal to', 'what are my legal rights', 'legal position on', 'find case law',
    ],
    opening_behaviour: 'start_immediately',
    custom_instruction: '',
    requires_document: false,
    response_format: 'structured_sections',
  },
  document_drafting: {
    keywords: [
      'draft a contract', 'draft an agreement', 'draft a clause', 'draft an nda',
      'write a contract', 'write an agreement', 'create a contract',
      'help me draft', 'can you draft', 'i need a contract', 'template for a contract',
    ],
    opening_behaviour: 'ask_clarifying_question',
    custom_instruction: '',
    requires_document: false,
    response_format: 'structured_sections',
  },
  yourai_howto: {
    keywords: [
      'how do i use', 'how does yourai', 'how to upload',
      'what is a knowledge pack', 'how do i start',
    ],
    opening_behaviour: 'start_immediately',
    custom_instruction: '',
    requires_document: false,
    response_format: 'plain_prose',
  },
  general_conversation: {
    keywords: [],
    opening_behaviour: 'start_immediately',
    custom_instruction: '',
    requires_document: false,
    response_format: 'plain_prose',
  },
  document_summarisation: {
    keywords: [
      'summarise this', 'summarize this', 'give me a summary', 'summary of this',
      'tldr', 'tl;dr', 'key points from', 'main points of', 'brief me on', 'overview of this',
    ],
    opening_behaviour: 'ask_for_document',
    custom_instruction: '',
    requires_document: true,
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
    requires_document: true,
    response_format: 'structured_sections',
  },
  clause_comparison: {
    keywords: [
      'compare these', 'compare the two', 'compare both', 'difference between',
      'which is better', 'side by side', 'contrast these', 'how do these differ',
      'compare clause', 'compare contracts',
    ],
    opening_behaviour: 'ask_for_document',
    custom_instruction: '',
    requires_document: true,
    response_format: 'structured_sections',
  },
  email_letter_drafting: {
    keywords: [
      'write an email', 'draft an email', 'write a letter', 'draft a letter',
      'compose an email', 'demand letter', 'cease and desist',
      'reply to this email', 'response to their email',
    ],
    opening_behaviour: 'ask_clarifying_question',
    custom_instruction: '',
    requires_document: false,
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
    requires_document: false,
    response_format: 'structured_sections',
  },
  risk_assessment: {
    keywords: [
      'what are the risks', 'identify the risks', 'risk assessment',
      'assess the risk', 'any red flags', 'risky clauses',
      'should i sign this', 'is this safe to sign', 'anything concerning', 'flag the risks',
    ],
    opening_behaviour: 'ask_for_document',
    custom_instruction: '',
    requires_document: true,
    response_format: 'risk_card',
  },
};

// Priority order — legal_qa checked LAST as fallback
const PRIORITY_ORDER = [
  'contract_review',
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
 * Uses SA-configured keywords when available, falls back to INTENT_DEFAULTS.
 */
export function detectIntent(
  message: string,
  currentIntent: string,
  intentConfigs: Record<string, IntentConfig> = {}
): string | null {
  if (message.trim().length < 10) return null;

  const lower = message.toLowerCase().trim();

  // Check priority intents first (NOT legal_qa)
  for (const intentId of PRIORITY_ORDER) {
    const config = intentConfigs[intentId] ?? INTENT_DEFAULTS[intentId];
    const keywords = config?.keywords ?? [];
    const matched = keywords.some(k => lower.includes(k.toLowerCase()));
    if (matched && intentId !== currentIntent) {
      return intentId;
    }
  }

  // legal_qa — only as fallback when in general intent modes
  const generalIntents = ['general_chat', 'general_conversation'];
  if (generalIntents.includes(currentIntent)) {
    const config = intentConfigs['legal_qa'] ?? INTENT_DEFAULTS['legal_qa'];
    const matched = (config?.keywords ?? []).some(k => lower.includes(k.toLowerCase()));
    if (matched) return 'legal_qa';
  }

  return null;
}
