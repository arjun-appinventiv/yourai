// ─── Workspace access model + guard helpers ─────────────────────────────
//
// A workspace is only visible to a user if:
//   - they are the ORG_ADMIN (sees everything in the org), OR
//   - they are listed in `workspace.members`.
//
// Non-members should not see the workspace at all — not its name, not that
// it exists. `filterVisibleWorkspaces` enforces that on any list; use
// `canAccessWorkspace` when resolving a direct URL / id.

import { ROLE, type Role } from './roles';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  /** User ID of the creator / current owner. */
  ownerId: string;
  /** Array of user IDs that can access this workspace. Includes ownerId. */
  members: string[];
  /** Optional display labels — not used by the guards. */
  status?: 'Active' | 'Archived';
  createdAt?: string;
  /** Soft-delete flag — see deleteWorkspace(). */
  deletedAt?: string | null;
  matterCount?: number;
  documentCount?: number;
}

/** Default seed for local/demo. Replace with GET /api/workspaces in Sprint 2. */
export const SEED_WORKSPACES: Workspace[] = [
  {
    id: 'ws-001',
    name: 'Acme v. Globex — Breach of Contract',
    description: 'Commercial litigation, contract dispute over SaaS license.',
    ownerId: 'user-ryan',
    members: ['user-ryan', 'm-002'],
    status: 'Active',
    createdAt: 'Apr 2, 2026',
    matterCount: 4,
    documentCount: 28,
  },
  {
    id: 'ws-002',
    name: 'Harper Trust Formation',
    description: 'Estate planning for long-term family trust.',
    ownerId: 'm-002',
    members: ['user-ryan', 'm-002', 'm-003'],
    status: 'Active',
    createdAt: 'Apr 5, 2026',
    matterCount: 2,
    documentCount: 11,
  },
  {
    id: 'ws-003',
    name: 'Acme Corp — Client Portal',
    description: 'Shared workspace for client collaboration.',
    ownerId: 'user-ryan',
    members: ['user-ryan', 'm-004'],
    status: 'Active',
    createdAt: 'Apr 11, 2026',
    matterCount: 1,
    documentCount: 6,
  },
];

const STORAGE_KEY = 'yourai_workspaces';

export function loadWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_WORKSPACES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_WORKSPACES;
  } catch {
    return SEED_WORKSPACES;
  }
}

export function saveWorkspaces(list: Workspace[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

/**
 * Return only the workspaces the user can see. Org Admin sees everything
 * (minus soft-deleted); everyone else sees only workspaces they're a
 * member of.
 */
export function filterVisibleWorkspaces(
  workspaces: Workspace[],
  currentUserId: string,
  role: Role,
): Workspace[] {
  const live = workspaces.filter((w) => !w.deletedAt);
  if (role === ROLE.ORG_ADMIN) return live;
  return live.filter((w) => w.members.includes(currentUserId));
}

/** True if the user can open / read the given workspace. */
export function canAccessWorkspace(
  workspace: Workspace | undefined | null,
  currentUserId: string,
  role: Role,
): boolean {
  if (!workspace || workspace.deletedAt) return false;
  if (role === ROLE.ORG_ADMIN) return true;
  return workspace.members.includes(currentUserId);
}

/** Soft delete — sets deletedAt so data is retained for 30 days. */
export function softDeleteWorkspace(list: Workspace[], id: string): Workspace[] {
  const now = new Date().toISOString();
  return list.map((w) => (w.id === id ? { ...w, deletedAt: now, status: 'Archived' } : w));
}
