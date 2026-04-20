// ─── Workspace module: data model + mock-API surface ───────────────────────
//
// A Workspace is a dedicated case-room inside a tenant. Every call is shaped
// the way the real REST API will be in Sprint 2, so wiring later is only a
// matter of swapping the localStorage body for fetch().
//
// Persistence: all mutations write back to localStorage under a single key so
// the demo survives reloads. Threads are kept separately because they are
// PER-USER within a workspace (shared docs, private chats).

import type { Role } from './roles';

/* ─── Types ─── */

export type DocStatus = 'processing' | 'ready' | 'failed';

export type WorkspaceMemberRole = 'org_admin' | 'internal_user' | 'external_user';

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: WorkspaceMemberRole;
  addedAt: string;   // ISO or human-readable ('Apr 4, 2026')
  addedBy: string;   // name (display only)
}

export interface WorkspaceDoc {
  id: string;
  name: string;
  size: number;        // bytes
  type: string;        // 'pdf' | 'docx' | 'xlsx' | 'txt' (extension, no dot)
  uploadedBy: string;  // userId
  uploadedByName?: string; // denormalised for UI
  uploadedAt: string;
  status: DocStatus;
  error?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  createdBy: string;           // userId of owner
  createdAt: string;
  /** Soft-delete flag. 30-day retention applies when set. */
  deletedAt?: string | null;
  members: WorkspaceMember[];
  documents: WorkspaceDoc[];
}

export interface WorkspaceThread {
  id: string;
  workspaceId: string;
  userId: string;     // private per user
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

/* ─── Storage keys ─── */

const WORKSPACES_KEY = 'yourai_ws_workspaces_v2';
const THREADS_KEY    = 'yourai_ws_threads_v2';

/* ─── Low-level persistence ─── */

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return fallback;
  }
}

function writeStore(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota — ignore */ }
}

/* ─── Workspace CRUD ─── */

/** GET /api/workspaces */
export function listWorkspaces(): Workspace[] {
  const all = readStore<Workspace[]>(WORKSPACES_KEY, []);
  return all.filter((w) => !w.deletedAt);
}

/** GET /api/workspaces/:id */
export function getWorkspace(id: string): Workspace | null {
  return listWorkspaces().find((w) => w.id === id) || null;
}

/** Visibility filter for the sidebar/list:
 *  - ORG_ADMIN sees everything non-deleted
 *  - Everyone else sees only workspaces they are members of
 */
export function listWorkspacesForUser(userId: string, role: Role): Workspace[] {
  const all = listWorkspaces();
  if (role === 'ORG_ADMIN') return all;
  return all.filter((w) => w.members.some((m) => m.userId === userId));
}

export interface NewWorkspaceInput {
  name: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  createdByRole: WorkspaceMemberRole;
  members?: WorkspaceMember[];    // optional extra invitees
  documents?: WorkspaceDoc[];     // optional initial uploads
}

/** POST /api/workspaces */
export function createWorkspace(input: NewWorkspaceInput): Workspace {
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const owner: WorkspaceMember = {
    userId: input.createdBy,
    name: input.createdByName,
    email: input.createdByEmail,
    role: input.createdByRole,
    addedAt: today,
    addedBy: 'self',
  };

  const extraMembers = (input.members || []).filter((m) => m.userId !== input.createdBy);

  const ws: Workspace = {
    id: `ws-${now.getTime()}`,
    name: input.name.trim(),
    description: (input.description || '').trim(),
    createdBy: input.createdBy,
    createdAt: today,
    deletedAt: null,
    members: [owner, ...extraMembers],
    documents: input.documents || [],
  };

  const all = readStore<Workspace[]>(WORKSPACES_KEY, []);
  writeStore(WORKSPACES_KEY, [ws, ...all]);
  return ws;
}

/** PUT /api/workspaces/:id (name + description only) */
export function updateWorkspace(id: string, patch: { name?: string; description?: string }): Workspace | null {
  const all = readStore<Workspace[]>(WORKSPACES_KEY, []);
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  const next = { ...all[idx], ...patch };
  all[idx] = next;
  writeStore(WORKSPACES_KEY, all);
  return next;
}

/** PUT /api/workspaces/:id/owner */
export function transferOwnership(id: string, newOwnerUserId: string): Workspace | null {
  const all = readStore<Workspace[]>(WORKSPACES_KEY, []);
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  const ws = all[idx];
  if (!ws.members.some((m) => m.userId === newOwnerUserId)) return null; // must be a member
  all[idx] = { ...ws, createdBy: newOwnerUserId };
  writeStore(WORKSPACES_KEY, all);
  return all[idx];
}

/** DELETE /api/workspaces/:id (soft delete — 30-day retention) */
export function deleteWorkspace(id: string): boolean {
  const all = readStore<Workspace[]>(WORKSPACES_KEY, []);
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) return false;
  all[idx] = { ...all[idx], deletedAt: new Date().toISOString() };
  writeStore(WORKSPACES_KEY, all);
  return true;
}

/* ─── Members ─── */

/** POST /api/workspaces/:id/members */
export function addMember(id: string, member: WorkspaceMember): Workspace | null {
  const all = readStore<Workspace[]>(WORKSPACES_KEY, []);
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  if (all[idx].members.some((m) => m.userId === member.userId)) return all[idx];
  all[idx] = { ...all[idx], members: [...all[idx].members, member] };
  writeStore(WORKSPACES_KEY, all);
  return all[idx];
}

/** DELETE /api/workspaces/:id/members/:userId */
export function removeMember(id: string, userId: string): Workspace | null {
  const all = readStore<Workspace[]>(WORKSPACES_KEY, []);
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  // Disallow removing the creator (owner) — callers should transfer first
  if (all[idx].createdBy === userId) return all[idx];
  all[idx] = { ...all[idx], members: all[idx].members.filter((m) => m.userId !== userId) };
  writeStore(WORKSPACES_KEY, all);
  return all[idx];
}

/* ─── Documents ─── */

/** POST /api/workspaces/:id/documents */
export function addDocument(id: string, doc: WorkspaceDoc): Workspace | null {
  const all = readStore<Workspace[]>(WORKSPACES_KEY, []);
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], documents: [...all[idx].documents, doc] };
  writeStore(WORKSPACES_KEY, all);
  return all[idx];
}

/** PATCH /api/workspaces/:id/documents/:docId (status transitions) */
export function updateDocumentStatus(id: string, docId: string, status: DocStatus, error?: string): Workspace | null {
  const all = readStore<Workspace[]>(WORKSPACES_KEY, []);
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  all[idx] = {
    ...all[idx],
    documents: all[idx].documents.map((d) => (d.id === docId ? { ...d, status, error } : d)),
  };
  writeStore(WORKSPACES_KEY, all);
  return all[idx];
}

/** DELETE /api/workspaces/:id/documents/:docId */
export function removeDocument(id: string, docId: string): Workspace | null {
  const all = readStore<Workspace[]>(WORKSPACES_KEY, []);
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], documents: all[idx].documents.filter((d) => d.id !== docId) };
  writeStore(WORKSPACES_KEY, all);
  return all[idx];
}

/* ─── Threads (private per user within a workspace) ─── */

/** GET /api/workspaces/:id/threads?userId=... */
export function listThreadsForUser(workspaceId: string, userId: string): WorkspaceThread[] {
  const all = readStore<WorkspaceThread[]>(THREADS_KEY, []);
  return all
    .filter((t) => t.workspaceId === workspaceId && t.userId === userId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** POST /api/workspaces/:id/threads */
export function createThread(workspaceId: string, userId: string, title = 'New Conversation'): WorkspaceThread {
  const now = new Date().toISOString();
  const t: WorkspaceThread = {
    id: `t-${Date.now()}`,
    workspaceId,
    userId,
    title,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  const all = readStore<WorkspaceThread[]>(THREADS_KEY, []);
  writeStore(THREADS_KEY, [t, ...all]);
  return t;
}

/** PATCH /api/workspaces/:id/threads/:threadId */
export function updateThread(threadId: string, patch: Partial<Pick<WorkspaceThread, 'title' | 'messageCount'>>): WorkspaceThread | null {
  const all = readStore<WorkspaceThread[]>(THREADS_KEY, []);
  const idx = all.findIndex((t) => t.id === threadId);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  all[idx] = { ...all[idx], ...patch, updatedAt: now };
  writeStore(THREADS_KEY, all);
  return all[idx];
}

/** DELETE /api/workspaces/:id/threads/:threadId */
export function deleteThread(threadId: string): boolean {
  const all = readStore<WorkspaceThread[]>(THREADS_KEY, []);
  const next = all.filter((t) => t.id !== threadId);
  if (next.length === all.length) return false;
  writeStore(THREADS_KEY, next);
  return true;
}

/* ─── Seeding (idempotent — only populates on first load) ─── */

export function seedWorkspacesIfEmpty(seed: Workspace[]): void {
  const existing = readStore<Workspace[] | null>(WORKSPACES_KEY, null);
  if (existing && existing.length > 0) return;
  writeStore(WORKSPACES_KEY, seed);
}

/* ─── Permission helpers used by UI ─── */

export function isWorkspaceCreator(ws: Workspace | null | undefined, userId: string): boolean {
  return !!ws && ws.createdBy === userId;
}

export function isWorkspaceMember(ws: Workspace | null | undefined, userId: string): boolean {
  return !!ws && ws.members.some((m) => m.userId === userId);
}

export function canEditDoc(ws: Workspace, doc: WorkspaceDoc, currentUserId: string, isOrgAdmin: boolean): boolean {
  return isOrgAdmin || doc.uploadedBy === currentUserId || ws.createdBy === currentUserId;
}

export function canManageWorkspace(ws: Workspace, currentUserId: string, isOrgAdmin: boolean): boolean {
  return isOrgAdmin || ws.createdBy === currentUserId;
}
