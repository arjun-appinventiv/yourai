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
];

export const DEFAULT_INTENT = 'general_chat';

export function getIntentLabel(id: string): string {
  return INTENTS.find(i => i.id === id)?.label ?? 'General Chat';
}

export function getIntentId(label: string): string {
  return INTENTS.find(i => i.label === label)?.id ?? 'general_chat';
}
