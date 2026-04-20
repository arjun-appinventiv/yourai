// Helpers to resolve the picker population of org members for workspace
// invites. Pulls from the same localStorage key TeamPage uses, falling
// back to a small hardcoded list so picker still has rows on first load.

import type { WorkspaceMember } from '../../lib/workspace';

const TEAM_KEY = 'yourai_team_members';

export const SEED_TEAM_MEMBERS: Array<{ userId: string; name: string; email: string; role: WorkspaceMember['role'] }> = [
  { userId: 'user-ryan', name: 'Ryan Melade',   email: 'ryan@hartwell.com',  role: 'org_admin' },
  { userId: 'm-002',     name: 'Priya Shah',    email: 'priya@hartwell.com', role: 'internal_user' },
  { userId: 'm-003',     name: 'Kevin Marlowe', email: 'kevin@hartwell.com', role: 'internal_user' },
  { userId: 'm-004',     name: 'Acme Corp (Client)', email: 'liaison@acmecorp.com', role: 'external_user' },
];

const mapRole = (r: string): WorkspaceMember['role'] => {
  // TeamPage stores ROLE constants ('ORG_ADMIN', ...); pickers prefer snake.
  if (r === 'ORG_ADMIN') return 'org_admin';
  if (r === 'EXTERNAL_USER') return 'external_user';
  return 'internal_user';
};

export function teamMembersForPicker(): WorkspaceMember[] {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as Array<{ id: string; name: string; email: string; role: string }>;
      return arr.map((m) => ({
        userId: m.id,
        name: m.name,
        email: m.email,
        role: mapRole(m.role),
        addedAt: today,
        addedBy: 'system',
      }));
    }
  } catch { /* ignore */ }
  return SEED_TEAM_MEMBERS.map((m) => ({ ...m, addedAt: today, addedBy: 'system' }));
}
