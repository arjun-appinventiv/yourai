// ─── RoleContext ────────────────────────────────────────────────────────────
//
// Provides the current tenant role and its resolved permission set to any
// component under the provider. Components should call `hasPermission(p)`
// rather than comparing role strings directly — that keeps the Org Admin's
// implicit "has everything" rule in one place.
//
// Role source of truth (for now):
//   - Derived from the User returned by AuthContext / getMe().
//   - A User with role === 'ADMIN' (the legacy field) is treated as ORG_ADMIN.
//   - Otherwise the user's stored `tenantRole` wins, defaulting to INTERNAL_USER.
//   - Extra permissions come from `user.permissions` (an optional string[]).
//
// When the real API lands (Sprint 2), swap the `deriveRoleFromUser` helper
// for whatever the backend returns and leave the rest untouched.

import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  resolvePermissions,
  ROLE,
  type Permission,
  type Role,
} from '../lib/roles';

type AnyUser = {
  role?: string;            // legacy SA-portal field ("ADMIN", etc.)
  tenantRole?: Role;        // preferred — set by sign-up / invite
  permissions?: Permission[];
  email?: string;
} | null | undefined;

/**
 * Last-resort demo-role registry. Keyed by email. Kept here (not imported
 * from auth.ts) so even if the auth bundle is stale on a client, the role
 * resolves correctly — critical for static-hosted demos where a cached
 * older bundle might lack the DEMO_USERS entry.
 */
const DEMO_EMAIL_ROLES: Record<string, { tenantRole?: Role; role?: string; permissions?: Permission[] }> = {
  'liaison@acmecorp.com': { tenantRole: ROLE.EXTERNAL_USER, permissions: [] },
  'priya@hartwell.com':   { tenantRole: ROLE.INTERNAL_USER, permissions: ['create_workspace' as Permission, 'view_audit_logs' as Permission] },
  'ryan@hartwell.com':    { role: 'ADMIN' },
  'arjun@appinventiv.com':{ role: 'ADMIN' },
};

/**
 * On the Vercel static demo, sign-up doesn't populate AuthContext — it only
 * writes to localStorage. Fall back to reading the registered user so the
 * freshly-signed-up Org Admin doesn't see an empty sidebar.
 */
function readLocalRegisteredUser(): AnyUser {
  try {
    const email = localStorage.getItem('yourai_current_email');
    if (!email) return null;
    const registered = JSON.parse(localStorage.getItem('yourai_registered_users') || '{}');
    const fromStorage = registered[email]?.user || null;
    // If nothing in localStorage, try the demo-email registry so demo
    // credentials resolve correctly even without a persist step.
    if (!fromStorage && DEMO_EMAIL_ROLES[email]) {
      return { email, ...DEMO_EMAIL_ROLES[email] };
    }
    return fromStorage;
  } catch {
    return null;
  }
}

function deriveRoleFromUser(user: AnyUser): Role {
  // If AuthContext has no operator (e.g. just-signed-up, session cookie not set),
  // try the localStorage-registered user so the demo still works.
  const effective: AnyUser = user || readLocalRegisteredUser();

  // An unknown user on /chat — treat as Org Admin. A fresh sign-up is by
  // definition the org's first user, so anything else locks them out.
  if (!effective) return ROLE.ORG_ADMIN;

  // Tenant role is the most authoritative source.
  if (effective.tenantRole) return effective.tenantRole;

  // Fallback: recognise known demo emails even if the cached user object
  // lacks tenantRole (stale bundle, cross-version localStorage, etc.).
  if (effective.email && DEMO_EMAIL_ROLES[effective.email]) {
    const demo = DEMO_EMAIL_ROLES[effective.email];
    if (demo.tenantRole) return demo.tenantRole;
  }

  // The first user to sign up for an org is stored with role: 'ADMIN'
  // in src/lib/auth.ts — treat that as the Org Admin for the tenant view.
  if (effective.role === 'ADMIN') return ROLE.ORG_ADMIN;

  return ROLE.INTERNAL_USER;
}

export interface RoleContextValue {
  currentRole: Role;
  permissions: Permission[];
  hasPermission: (p: Permission) => boolean;
  isOrgAdmin: boolean;
  isInternalUser: boolean;
  isExternalUser: boolean;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const user: AnyUser = auth?.operator;

  const value = useMemo<RoleContextValue>(() => {
    const effective = user || readLocalRegisteredUser();
    const currentRole = deriveRoleFromUser(effective);
    const granted = Array.isArray(effective?.permissions)
      ? effective!.permissions!
      : (effective?.email && DEMO_EMAIL_ROLES[effective.email]?.permissions) || [];
    const permissions = resolvePermissions(currentRole, granted);
    const permSet = new Set<Permission>(permissions);

    return {
      currentRole,
      permissions,
      hasPermission: (p: Permission) => permSet.has(p),
      isOrgAdmin:     currentRole === ROLE.ORG_ADMIN,
      isInternalUser: currentRole === ROLE.INTERNAL_USER,
      isExternalUser: currentRole === ROLE.EXTERNAL_USER,
    };
  }, [user]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

/**
 * Hook to read the current role + permissions. Throws if used outside a
 * RoleProvider so we fail loudly rather than silently granting nothing.
 */
export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole() must be used inside a <RoleProvider>');
  }
  return ctx;
}
