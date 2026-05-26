// ─── Chat intent metadata ───
// Phase 3 of the unified-intents plan: this file is now a THIN VIEW
// over src/lib/intentsStore.ts. The exports keep the same names + shape
// so existing consumers (ChatView, EditView, intent dropdown, etc.)
// don't change, but the data flows from a single source of truth.

import {
  loadIntents,
  seedIntentsIfEmpty,
  SEED_INTENTS,
  getChatVisibleIntents,
} from './intentsStore';

export interface IntentDef {
  id: string;
  label: string;
}

// Read at module load — refresh requires reload. Sufficient for v1.
// SA edits are picked up on the next page load.
function getStoredChatIntents() {
  try { seedIntentsIfEmpty(SEED_INTENTS); } catch { /* ignore */ }
  const stored = loadIntents();
  return getChatVisibleIntents(stored && stored.length > 0 ? stored : SEED_INTENTS);
}

const _CHAT_INTENTS = getStoredChatIntents();

export const INTENTS: IntentDef[] = _CHAT_INTENTS.map((i) => ({ id: i.id, label: i.label }));

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
  { label: 'ANALYZE',        intentIds: ['contract_review', 'clause_analysis', 'clause_comparison', 'risk_assessment', 'document_summarisation'] },
  { label: 'DRAFT',          intentIds: ['document_drafting', 'email_letter_drafting'] },
];

// Bucket dot colors — used by the intent dropdown section header dots,
// the quick-chip pill dots, AND the active intent pill's background tint
// + border + text colour. Each bucket has a unique hue so the active
// chat-input pill visually reflects the kind of work the AI is being
// asked to do (PM 2026-05-20 client feedback).
export const BUCKET_COLORS: Record<string, string> = {
  'DEFAULT':        '#3FB56B',  // green   — chat / general
  'ASK & RESEARCH': '#3B82F6',  // blue    — research / Q&A / find
  'ANALYZE':        '#D97706',  // amber   — analysis / review / risk
  'DRAFT':          '#8B5CF6',  // purple  — drafting
};

// One-line subtitle shown beneath the selected intent in the dropdown.
// Derives from the store so SA edits to `description` propagate here.
export const INTENT_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  _CHAT_INTENTS.map((i) => [i.id, i.description])
);

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
