// ─── Audit Log persistence ──────────────────────────────────────────
//
// Central event log used by:
//   - Org-Admin Audit Logs page  (`/app/audit-logs`)
//   - Super-Admin Compliance & Audit page (`ComplianceAudit.jsx`)
//   - Org-Admin Dashboard "Activity feed" tile
//
// `logEvent()` is the single write API. Anywhere a user-visible action
// happens (login, upload, workspace create, KP edit, workflow run,
// thread delete, …) calls logEvent with at least `{ category, action }`
// — operator + tenant + timestamp are auto-filled from the current
// session. Events are appended to `localStorage[KEY]` and capped at
// MAX_EVENTS (FIFO trim).
//
// First-load seed: when the store is empty we copy the historical
// `auditEvents` from `src/data/mockData.js` so the page isn't blank for
// demos. Real activity flows in on top.
//
// Subscribe pattern matches the workflowRunner — pages call subscribe()
// in a useEffect and re-read on every notify so the table updates live.

const KEY = 'yourai_audit_log_v1';
const MAX_EVENTS = 1000;

export type AuditCategory =
  | 'auth'
  | 'documents'
  | 'workspaces'
  | 'knowledge_packs'
  | 'workflows'
  | 'threads'
  | 'users'
  | 'billing'
  | 'system';

export interface AuditEvent {
  id: string;
  ts: string;                    // ISO 8601
  userId?: string;
  userName: string;              // "Sarah Chen" or "System"
  userEmail?: string;
  avatar?: string;               // 2-letter initials for table chip
  tenant?: string;               // org name — SA view groups by this
  tenantId?: string;
  category: AuditCategory;
  action: string;                // verb phrase: "Uploaded document"
  target?: string;               // object: filename / user / workspace
  workspace?: string;            // workspace name when scoped
  ip?: string;                   // best-effort; "" if unavailable
  flagged?: boolean;             // privilege-boundary alert
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) {
    try { l(); } catch { /* ignore listener errors */ }
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function loadEvents(): AuditEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents(events: AuditEvent[]): void {
  try {
    const trimmed = events.length > MAX_EVENTS
      ? events.slice(events.length - MAX_EVENTS)
      : events;
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch { /* quota — ignore */ }
}

// ─── Current operator lookup ─────────────────────────────────────────
// AuthContext stores the live operator in React state; we can't reach
// React from a plain lib, so we resolve the user via the same
// localStorage breadcrumbs the rest of the app uses
// (`yourai_current_email` + `yourai_registered_users`).
interface ResolvedOperator {
  userId?: string;
  userName: string;
  userEmail?: string;
  avatar?: string;
  tenant?: string;
  tenantId?: string;
}

export function getCurrentOperator(): ResolvedOperator {
  try {
    const email = localStorage.getItem('yourai_current_email') || '';
    if (!email) return { userName: 'Unknown user' };
    const registered = JSON.parse(localStorage.getItem('yourai_registered_users') || '{}');
    const u = registered[email]?.user;
    if (u) {
      return {
        userId: u.id,
        userName: u.name || email,
        userEmail: email,
        avatar: u.avatar,
        tenant: u.orgName,
        tenantId: u.orgId,
      };
    }
    return { userName: email, userEmail: email };
  } catch {
    return { userName: 'Unknown user' };
  }
}

// ─── Write API ───────────────────────────────────────────────────────
export interface LogInput {
  category: AuditCategory;
  action: string;
  target?: string;
  workspace?: string;
  flagged?: boolean;
  // Override operator when the system or another user is responsible
  // (failed login on someone else's behalf, system auto-action, etc.)
  operator?: Partial<ResolvedOperator> & { userName?: string };
}

export function logEvent(input: LogInput): AuditEvent {
  const op = input.operator
    ? { ...getCurrentOperator(), ...input.operator }
    : getCurrentOperator();

  const event: AuditEvent = {
    id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    userId: op.userId,
    userName: op.userName || 'Unknown user',
    userEmail: op.userEmail,
    avatar: op.avatar,
    tenant: op.tenant,
    tenantId: op.tenantId,
    category: input.category,
    action: input.action,
    target: input.target,
    workspace: input.workspace,
    flagged: input.flagged,
  };

  const events = loadEvents();
  events.push(event);
  saveEvents(events);
  notify();
  return event;
}

// ─── First-load seed ─────────────────────────────────────────────────
// Copies the historical `auditEvents` from mockData.js once so the
// page has prior context for demos. Idempotent: no-op if anything has
// already been written.
export function seedAuditLogIfEmpty(seed: AuditEvent[]): void {
  if (loadEvents().length > 0) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(seed));
    notify();
  } catch { /* ignore */ }
}

// Test / dev helper — wipe the log. Not wired to any UI.
export function clearAuditLog(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  notify();
}
