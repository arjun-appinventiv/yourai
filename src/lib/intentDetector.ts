// ─── Smart Intent Detector ───
// Frontend-only keyword matching — zero latency, no API calls.
// Suggests an intent based on what the user is typing.

const INTENT_KEYWORDS: Record<string, string[]> = {
  contract_review: [
    'review this contract', 'review the contract', 'check this contract',
    'check the contract', 'analyse this contract', 'analyze this contract',
    'look at this contract', 'contract review', 'read this agreement',
    'review this agreement', 'check this agreement', 'analyse this nda',
    'review this nda', 'review this msa', 'review this sow', 'review this lease',
  ],
  document_summarisation: [
    'summarise this', 'summarize this', 'summarise the', 'summarize the',
    'give me a summary', 'give a summary', 'summary of this', 'summary of the',
    'tldr', 'tl;dr', 'what does this document say', 'what does this say',
    'brief me on', 'overview of this', 'key points from', 'main points of',
  ],
  document_drafting: [
    'draft a contract', 'draft an agreement', 'draft a clause', 'draft an nda',
    'draft a policy', 'write a contract', 'write an agreement', 'write a clause',
    'create a contract', 'create an agreement', 'help me draft',
    'help me write a contract', 'can you draft', 'can you write a contract',
    'i need a contract', 'i need an agreement', 'template for a contract',
  ],
  risk_assessment: [
    'what are the risks', 'identify the risks', 'risk assessment',
    'assess the risk', 'flag the risks', 'any red flags', 'red flags in',
    'risky clauses', 'problematic clauses', 'what should i watch out for',
    'anything concerning', 'is this safe to sign', 'should i sign this',
    'risks in this', 'liabilities in this',
  ],
  clause_comparison: [
    'compare these', 'compare this', 'compare the two', 'compare both',
    'difference between', 'differences between', 'which is better',
    'compare clause', 'compare contracts', 'compare documents',
    'side by side', 'contrast these', 'how do these differ',
  ],
  legal_research: [
    'what does the law say', 'what does the law', 'legal precedent',
    'case law on', 'is it legal to', 'is this legal', 'legally speaking',
    'under the law', 'what are my legal rights', 'what are my rights',
    'legal position', 'legally binding', 'what is the legal',
    'research on', 'find case law',
  ],
  case_law_analysis: [
    'analyse this case', 'analyze this case', 'case analysis',
    'what happened in this case', 'ruling in', 'court decision',
    'judge ruled', 'precedent from', 'holding in',
    'this judgment', 'this judgement',
  ],
  email_letter_drafting: [
    'write an email', 'draft an email', 'write a letter', 'draft a letter',
    'help me write an email', 'help me write a letter', 'compose an email',
    'email to', 'letter to', 'response to their email', 'reply to this email',
    'cease and desist', 'demand letter', 'write a demand',
  ],
  legal_qa: [
    'what is', 'what are', 'how does', 'can i', 'can my',
    'do i have to', 'am i required', 'is it possible', 'explain',
    'what does', 'define', 'meaning of', 'what counts as', 'is this enforceable',
  ],
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

// Map intent IDs to the label strings used in the pill system
const INTENT_ID_TO_LABEL: Record<string, string> = {
  general_chat: 'General Chat',
  contract_review: 'Contract Review',
  legal_research: 'Legal Research',
  document_drafting: 'Document Drafting',
  yourai_howto: 'YourAI How-To',
  general_conversation: 'General Conversation',
  document_summarisation: 'Document Summarisation',
  case_law_analysis: 'Case Law Analysis',
  clause_comparison: 'Clause Comparison',
  email_letter_drafting: 'Email & Letter Drafting',
  legal_qa: 'Legal Q&A',
  risk_assessment: 'Risk Assessment',
};

// Reverse map: label → intent ID
const LABEL_TO_INTENT_ID: Record<string, string> = {};
Object.entries(INTENT_ID_TO_LABEL).forEach(([id, label]) => {
  LABEL_TO_INTENT_ID[label] = id;
});

/**
 * Detect which intent a message likely maps to.
 * Returns the intent label (matching pill label) or null.
 * currentIntentLabel = the label of the currently selected pill (or null for default).
 */
export function detectIntent(
  message: string,
  currentIntentLabel: string | null
): string | null {
  // Ignore very short messages
  if (message.trim().length < 10) return null;

  const lower = message.toLowerCase().trim();

  // Convert current label to intent ID for comparison
  const currentId = currentIntentLabel ? LABEL_TO_INTENT_ID[currentIntentLabel] || null : null;

  // Check priority intents first (NOT legal_qa)
  for (const intentId of PRIORITY_ORDER) {
    const keywords = INTENT_KEYWORDS[intentId];
    const matched = keywords.some(keyword => lower.includes(keyword.toLowerCase()));
    if (matched) {
      // Only suggest if different from current
      if (intentId !== currentId) {
        return INTENT_ID_TO_LABEL[intentId] || null;
      }
      return null;
    }
  }

  // legal_qa fallback — only if current intent is general/null
  const generalIds = ['general_chat', 'general_conversation', null];
  if (generalIds.includes(currentId)) {
    const legalQaKeywords = INTENT_KEYWORDS['legal_qa'];
    const matched = legalQaKeywords.some(keyword => lower.includes(keyword.toLowerCase()));
    if (matched) return INTENT_ID_TO_LABEL['legal_qa'];
  }

  return null;
}

export function getIntentLabel(intentId: string): string {
  return INTENT_ID_TO_LABEL[intentId] || 'General Chat';
}
