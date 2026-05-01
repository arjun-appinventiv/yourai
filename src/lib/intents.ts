// ─── Single source of truth for all YourAI intents ───
// Used by: chat pills, intent detector, SA config, backend prompt builder

export interface IntentDef {
  id: string;
  label: string;
}

export const INTENTS: IntentDef[] = [
  { id: 'general_chat', label: 'General Chat' },
  { id: 'contract_review', label: 'Contract Review' },
  { id: 'legal_research', label: 'Legal Research' },
  { id: 'document_drafting', label: 'Document Drafting' },
  { id: 'document_summarisation', label: 'Document Summarisation' },
  { id: 'case_law_analysis', label: 'Case Law Analysis' },
  { id: 'clause_comparison', label: 'Clause Comparison' },
  { id: 'email_letter_drafting', label: 'Email & Letter Drafting' },
  { id: 'legal_qa', label: 'Legal Q&A' },
  { id: 'risk_assessment', label: 'Risk Assessment' },
  { id: 'clause_analysis', label: 'Clause Analysis' },
  { id: 'timeline_extraction', label: 'Timeline' },
  { id: 'find_document', label: 'Find Document' },
];

export const DEFAULT_INTENT = 'general_chat';

// Verb-led groupings for the intent dropdowns (populated-chat collapsed-pill
// dropdown + empty-state "More operations" overflow). Buckets render as
// uppercase mono section headers above their members. Order is the order
// users see them.
export interface IntentBucket {
  label: string;
  intentIds: string[];
}

export const INTENT_BUCKETS: IntentBucket[] = [
  { label: 'DEFAULT',        intentIds: ['general_chat'] },
  { label: 'ASK & RESEARCH', intentIds: ['legal_qa', 'legal_research', 'case_law_analysis', 'find_document'] },
  { label: 'ANALYZE',        intentIds: ['contract_review', 'clause_analysis', 'clause_comparison', 'risk_assessment', 'document_summarisation', 'timeline_extraction'] },
  { label: 'DRAFT',          intentIds: ['document_drafting', 'email_letter_drafting'] },
];

// Bucket dot colors — used by the intent dropdown section header dots and
// by the chip row below the input where each chip carries its bucket dot.
export const BUCKET_COLORS: Record<string, string> = {
  'DEFAULT':        '#9CA3AF',
  'ASK & RESEARCH': '#3B82F6',
  'ANALYZE':        '#C9A84C',
  'DRAFT':          '#5CA868',
};

// One-line subtitle shown beneath the selected intent in the dropdown.
// Reads as "what this mode does to the next prompt", per the designer's
// note: "Selected mode must explain how it changes the prompt."
export const INTENT_DESCRIPTIONS: Record<string, string> = {
  general_chat:           'Free-form chat — answers from documents, packs, and Alaska law.',
  legal_qa:               'Direct legal answers with citations to statute or case law.',
  legal_research:         'Multi-source research brief with authorities and key holdings.',
  case_law_analysis:      'Pull facts, holding, reasoning, and disposition from cited decisions.',
  find_document:          'Search YourVault for a specific document by name, type, or content cue.',
  contract_review:        'Review a contract for one-sided, missing, or risky provisions.',
  clause_analysis:        'Surface and grade clauses by risk priority, with quoted language.',
  clause_comparison:      'Compare clauses across documents in a side-by-side table.',
  risk_assessment:        'Identify findings ranked by severity with mitigations.',
  document_summarisation: 'Summarise the document with sectioned takeaways and key terms.',
  timeline_extraction:    'Extract dated events into a chronological timeline.',
  document_drafting:      'Draft a document grounded in selected sources and chat context.',
  email_letter_drafting:  'Draft a professional email using selected documents and chat context.',
};

// Bucket lookup for a single intent id — used by the chip row to render
// each chip with its bucket dot color.
export function getBucketForIntent(intentId: string): string | null {
  for (const b of INTENT_BUCKETS) {
    if (b.intentIds.includes(intentId)) return b.label;
  }
  return null;
}

export function getIntentLabel(id: string): string {
  return INTENTS.find(i => i.id === id)?.label ?? 'General Chat';
}

export function getIntentId(label: string): string {
  return INTENTS.find(i => i.label === label)?.id ?? 'general_chat';
}

/**
 * Group an arbitrary list of intent IDs by the buckets above. Used by both
 * dropdowns: the populated-chat dropdown passes all 13 INTENT ids; the
 * empty-state "More operations" overflow passes only the ids that aren't
 * already visible as a top-level pill. Returns buckets in canonical order
 * with empty buckets filtered out.
 */
export function groupIntentsByBucket(intentIds: string[]): { label: string; intents: IntentDef[] }[] {
  const idSet = new Set(intentIds);
  return INTENT_BUCKETS
    .map((bucket) => ({
      label: bucket.label,
      intents: bucket.intentIds
        .filter((id) => idSet.has(id))
        .map((id) => INTENTS.find((i) => i.id === id))
        .filter((i): i is IntentDef => !!i),
    }))
    .filter((b) => b.intents.length > 0);
}
