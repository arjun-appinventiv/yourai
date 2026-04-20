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
} | null | undefined;

function deriveRoleFromUser(user: AnyUser): Role {
  if (!user) return ROLE.INTERNAL_USER;
  if (user.tenantRole) return user.tenantRole;

  // Legacy: the first user to sign up for an org is stored with role: 'ADMIN'
  // in src/lib/auth.ts — treat that as the Org Admin for the tenant view.
  if (user.role === 'ADMIN') return ROLE.ORG_ADMIN;

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
    const currentRole = deriveRoleFromUser(user);
    const granted = Array.isArray(user?.permissions) ? user!.permissions! : [];
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
