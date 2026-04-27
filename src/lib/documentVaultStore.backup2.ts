// ─── Document Vault persistence ──────────────────────────────────────
//
// Tiny helper so ChatView (personal vault panel) and WorkspaceChatView
// (workspace-chat ad-hoc uploads) can share the same underlying list.
// Without this, a client's upload in a workspace chat would vanish the
// moment they navigate away.

export interface VaultDoc {
  id: number | string;
  name: string;
  description?: string;
  fileName: string;
  fileSize: string;
  createdAt: string;
  ownerId?: string;
  ownerName?: string;
  isGlobal?: boolean;
  addedFromChat?: boolean;
  // Optional folder grouping. null/undefined = root (uncategorised).
  folderId?: string | null;
}

export interface VaultFolder {
  id: string;
  name: string;
  createdAt: string;
  ownerId?: string;
  ownerName?: string;
  isGlobal?: boolean;
}

const KEY = 'yourai_document_vault';
const FOLDERS_KEY = 'yourai_document_vault_folders_v1';

export function loadVault(): VaultDoc[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveVault(docs: VaultDoc[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(docs)); } catch { /* quota — ignore */ }
}

/** Idempotent: if no stored vault yet, write the supplied seed. */
export function seedVaultIfEmpty(seed: VaultDoc[]): void {
  const existing = loadVault();
  if (existing && existing.length > 0) return;
  saveVault(seed);
}

/**
 * Append a new doc. Dedupe by filename *per owner* — uploading the
 * same filename twice won't create a second entry.
 */
export function addVaultDoc(doc: VaultDoc): VaultDoc[] {
  const current = loadVault() || [];
  const dup = current.find((d) => d.fileName === doc.fileName && d.ownerId === doc.ownerId);
  if (dup) return current;
  const next = [doc, ...current];
  saveVault(next);
  return next;
}

// ─── Folders ────────────────────────────────────────────────────────
//
// Folders are a single-level grouping (no nesting) that organise vault
// docs. A doc with `folderId === undefined` or `null` lives at the root
// ("Uncategorised"). Folder visibility/scoping mirrors VaultDoc — owner
// + `isGlobal` flag for org-wide sharing.

export function loadFolders(): VaultFolder[] | null {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveFolders(folders: VaultFolder[]): void {
  try { localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders)); } catch { /* quota — ignore */ }
}

export function seedFoldersIfEmpty(seed: VaultFolder[]): void {
  const existing = loadFolders();
  if (existing && existing.length > 0) return;
  saveFolders(seed);
}
