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
