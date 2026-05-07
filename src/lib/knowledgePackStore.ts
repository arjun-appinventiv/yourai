// ─── Knowledge Pack persistence ────────────────────────────────────
//
// Mirrors the pattern in documentVaultStore.ts. ChatView's KP state is
// hydrated from localStorage on mount; mutations (create / edit /
// delete / share-toggle) flow back to localStorage via a useEffect. A
// first-load seed writes the bundled defaults so users see real packs
// immediately without a "create your first pack" empty state.

export interface PackDoc {
  id: number | string;
  name: string;
  size?: string;
  uploaded?: string;
  // Extracted plain text the AI sees when this pack is active in chat.
  // Without this, packs are metadata-only and grounding is impossible.
  content?: string;
}

export interface PackLink {
  id: number | string;
  name: string;
  url: string;
}

export interface KnowledgePack {
  id: number | string;
  name: string;
  description?: string;
  ownerId?: string;
  ownerName?: string;
  isGlobal?: boolean;
  docs?: PackDoc[];
  links?: PackLink[];
  createdAt?: string;
}

// v1: initial release of localStorage-backed packs (was in-memory only
// up to 2026-05-06).
// v2 (2026-05-07): bumped because v1 packs were saved before the
// modal's runDocExtraction fix landed — their docs lacked `content`,
// which made grounding silently fail (the bot would acknowledge the
// doc name but ask the user to upload via +). Bumping forces re-seed
// so existing browsers get the bundled defaults whose seed docs DO
// carry real text. User-created packs from v1 are lost; the alternative
// (silent broken grounding) was worse.
const KEY = 'yourai_knowledge_packs_v2';

export function loadPacks(): KnowledgePack[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePacks(packs: KnowledgePack[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(packs)); } catch { /* quota — ignore */ }
}

/** Idempotent: if no stored packs yet, write the supplied seed. */
export function seedPacksIfEmpty(seed: KnowledgePack[]): void {
  const existing = loadPacks();
  if (existing && existing.length > 0) return;
  savePacks(seed);
}
