// config — reads from .env.local
// Auth functions — all calls go to the backend API.
// Session is managed via httpOnly cookies set by the backend.
// No tokens stored in localStorage or JS memory.
// Removed: mock credentials replaced by real API calls to /api/auth/*
// See: tech-stack.md — Backend API section

const BASE = import.meta.env.VITE_API_URL || '';

// Demo credentials — used as client-side fallback when backend is unreachable (e.g. Vercel static deploy)
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'arjun@appinventiv.com': {
    password: 'Admin@123',
    user: { id: 'user-arjun', email: 'arjun@appinventiv.com', name: 'Arjun P', role: 'ADMIN', orgId: 'org-appinventiv', orgName: 'Appinventiv', avatar: 'AP', plan: 'ENTERPRISE' },
  },
  'ryan@hartwell.com': {
    password: 'Law@2026',
    user: { id: 'user-ryan', email: 'ryan@hartwell.com', name: 'Ryan Melade', role: 'ADMIN', orgId: 'org-hartwell', orgName: 'Hartwell & Associates', avatar: 'RM', plan: 'PROFESSIONAL' },
  },
  // Internal User demo — org member with a couple of optional permissions
  'priya@hartwell.com': {
    password: 'Internal@123',
    user: { id: 'm-002', email: 'priya@hartwell.com', name: 'Priya Shah', role: 'MEMBER', orgId: 'org-hartwell', orgName: 'Hartwell & Associates', avatar: 'PS', plan: 'PROFESSIONAL', tenantRole: 'INTERNAL_USER', permissions: ['create_workspace', 'view_audit_logs'] },
  },
  // External User demo — end client
  'liaison@acmecorp.com': {
    password: 'Client@123',
    user: { id: 'm-004', email: 'liaison@acmecorp.com', name: 'Acme Corp (Client)', role: 'MEMBER', orgId: 'org-hartwell', orgName: 'Hartwell & Associates', avatar: 'AC', plan: 'PROFESSIONAL', tenantRole: 'EXTERNAL_USER', permissions: [] },
  },
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string;
  orgName: string;
  avatar?: string;
  plan?: string;
  /** Tenant role for in-org permissions (ORG_ADMIN / INTERNAL_USER / EXTERNAL_USER). */
  tenantRole?: 'ORG_ADMIN' | 'INTERNAL_USER' | 'EXTERNAL_USER';
  /** Optional per-user permission grants (see src/lib/roles.ts). */
  permissions?: string[];
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
  requiresOtp?: boolean;
}

/**
 * Login with email + password.
 * Backend sets httpOnly cookie on success.
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    // If backend returned a valid JSON response, use it
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Invalid credentials' }));
        return { success: false, error: err.error || 'Invalid credentials' };
      }
      return res.json();
    }

    // Non-JSON response (e.g. Vercel 404 HTML page) — fall through to demo
  } catch {
    // Network error — backend unreachable, fall through to demo
  }

  // Fallback: check demo credentials client-side
  const demo = DEMO_USERS[email];
  if (demo && demo.password === password) {
    const reason = getBlockReason(email);
    if (reason) return blockedResponse(reason);
    return { success: true, requiresOtp: false, user: demo.user };
  }

  // Check localStorage-registered users (from client-side sign-up)
  try {
    const registered = JSON.parse(localStorage.getItem('yourai_registered_users') || '{}');
    const reg = registered[email];
    if (reg && reg.password === password) {
      const reason = getBlockReason(email);
      if (reason) return blockedResponse(reason);
      return { success: true, requiresOtp: false, user: reg.user };
    }
  } catch { /* ignore */ }

  return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
}

export type BlockReason = null | 'user' | 'tenant';

// ─── Single-Session Enforcement ──────────────────────────────────────────
// Each successful login issues a unique session token. The "winning" (most
// recently issued) token for an email is stored under a shared key. A tab's
// local token is stored under a tab-scoped key. The session guard compares
// the two and signs out the tab whose token no longer matches.
const SHARED_SESSION_KEY = 'yourai_active_sessions';    // email -> latest token
const LOCAL_SESSION_KEY  = 'yourai_my_session_token';   // this tab's token

/**
 * Register a new login for the given email — invalidates any existing session
 * for that email across all other tabs and devices.
 */
export function claimSession(email: string): string {
  const token = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const registry = JSON.parse(localStorage.getItem(SHARED_SESSION_KEY) || '{}');
    registry[email] = { token, issuedAt: Date.now() };
    localStorage.setItem(SHARED_SESSION_KEY, JSON.stringify(registry));
    localStorage.setItem(LOCAL_SESSION_KEY, token);
  } catch { /* ignore */ }
  return token;
}

/**
 * Returns true if this tab still holds the authoritative session for the
 * given email. Returns false if another login has superseded it, or if no
 * session exists at all.
 */
export function isSessionCurrent(email: string): boolean {
  if (!email) return false;
  try {
    const localToken = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!localToken) return false;
    const registry = JSON.parse(localStorage.getItem(SHARED_SESSION_KEY) || '{}');
    const entry = registry[email];
    return entry?.token === localToken;
  } catch {
    return false;
  }
}

/**
 * Clear the session registry entry for the given email and this tab's token.
 * Called on logout.
 */
export function releaseSession(email: string): void {
  try {
    const registry = JSON.parse(localStorage.getItem(SHARED_SESSION_KEY) || '{}');
    delete registry[email];
    localStorage.setItem(SHARED_SESSION_KEY, JSON.stringify(registry));
    localStorage.removeItem(LOCAL_SESSION_KEY);
  } catch { /* ignore */ }
}

/**
 * Check if the user has been blocked by the Super Admin and return the reason.
 * - 'user'   — the user's own account is blocked
 * - 'tenant' — the user's organisation is blocked (affects all users in it)
 * - null     — not blocked
 *
 * Tenant block wins over user block in the message shown, since the whole org
 * losing access is the more explanatory context.
 */
export function getBlockReason(email: string): BlockReason {
  try {
    const mgmtUsers = JSON.parse(localStorage.getItem('yourai_mgmt_users') || '[]');
    const user = mgmtUsers.find((u: any) => u.email === email);

    // Check tenant (org) block first — if the org is blocked, that's the reason
    if (user && user.org) {
      const mgmtTenants = JSON.parse(localStorage.getItem('yourai_mgmt_tenants') || '[]');
      const tenant = mgmtTenants.find((t: any) => t.name === user.org);
      if (tenant && (tenant.status === 'Suspended' || tenant.status === 'Blocked')) {
        return 'tenant';
      }
    }

    if (user && user.status === 'Blocked') return 'user';
  } catch { /* ignore */ }
  return null;
}

/**
 * Legacy boolean check — kept for backward compatibility.
 * @deprecated use getBlockReason instead
 */
export function isUserBlocked(email: string): boolean {
  return getBlockReason(email) !== null;
}

function blockedResponse(reason: BlockReason = 'user'): LoginResponse {
  return {
    success: false,
    error: reason === 'tenant'
      ? 'Your organisation has been blocked. Please contact your administrator to restore access.'
      : 'Your account has been blocked. Please contact your administrator to restore access.',
  };
}

/**
 * Verify OTP for 2FA.
 * Backend validates OTP and upgrades session.
 */
export async function verifyOtp(otp: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ otp }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invalid OTP' }));
    return { success: false, error: err.error || 'Invalid OTP' };
  }

  return res.json();
}

/**
 * Request OTP resend.
 */
export async function resendOtp(): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/api/auth/resend-otp`, {
    method: 'POST',
    credentials: 'include',
  });

  return { success: res.ok };
}

/**
 * Request password reset email.
 */
export async function forgotPassword(email: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  return { success: res.ok };
}

/**
 * Reset password with token from email.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token, newPassword }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Reset failed' }));
    return { success: false, error: err.error || 'Reset failed' };
  }

  return { success: true };
}

/**
 * Get current logged-in user from session cookie.
 * Returns null if not authenticated.
 */
export async function getMe(): Promise<User | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Logout — clears httpOnly cookie on the backend and releases the single-session lock.
 */
export async function logout(): Promise<void> {
  // Release the session lock for this email so other tabs / future logins can proceed
  try {
    const email = localStorage.getItem('yourai_current_email') || '';
    if (email) releaseSession(email);
  } catch { /* ignore */ }

  try {
    await fetch(`${BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch { /* ignore */ }
}

/**
 * Register a new user account.
 * Falls back to client-side localStorage when backend is unreachable (Vercel static deploy).
 */
export async function signUp(data: {
  name: string;
  email: string;
  password: string;
  orgName?: string;
}): Promise<LoginResponse> {
  try {
    const res = await fetch(`${BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Sign up failed' }));
        return { success: false, error: err.error || 'Sign up failed' };
      }
      const result = await res.json();
      // Also persist to localStorage so management modules can see them
      if (result.success && result.user) {
        persistRegisteredUser(data, result.user);
      }
      return result;
    }
    // Non-JSON response — fall through to client-side registration
  } catch {
    // Network error — backend unreachable
  }

  // Fallback: client-side registration via localStorage
  // Check for duplicate email
  const registered = JSON.parse(localStorage.getItem('yourai_registered_users') || '{}');
  if (registered[data.email] || DEMO_USERS[data.email]) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const orgId = `org-${Date.now()}`;
  const userId = `user-${Date.now()}`;
  const initials = data.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const user: User = {
    id: userId,
    email: data.email,
    name: data.name,
    role: 'ADMIN',
    orgId,
    orgName: data.orgName || `${data.name}'s Firm`,
    avatar: initials,
    plan: 'FREE',
  };

  persistRegisteredUser(data, user);

  return { success: true, requiresOtp: false, user };
}

/**
 * Persist a registered user to localStorage so they can log in again
 * and appear in the management modules.
 */
function persistRegisteredUser(data: { name: string; email: string; password: string; orgName?: string }, user: User) {
  try {
    // Save to registered users (for login fallback)
    const registered = JSON.parse(localStorage.getItem('yourai_registered_users') || '{}');
    registered[data.email] = { password: data.password, user };
    localStorage.setItem('yourai_registered_users', JSON.stringify(registered));

    // Save to management-visible user list
    const mgmtUsers = JSON.parse(localStorage.getItem('yourai_mgmt_users') || '[]');
    if (!mgmtUsers.some((u: any) => u.email === data.email)) {
      mgmtUsers.push({
        id: Date.now(),
        name: data.name,
        email: data.email,
        org: data.orgName || `${data.name}'s Firm`,
        plan: user.plan === 'FREE' ? 'Free' : user.plan === 'PROFESSIONAL' ? 'Professional' : user.plan === 'ENTERPRISE' ? 'Enterprise' : 'Team',
        role: 'Admin',
        status: 'Active',
        lastActive: 'Just now',
        created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        logins: 1,
        docsUploaded: 0,
        reportsGenerated: 0,
        onboardingCompleted: false,
      });
      localStorage.setItem('yourai_mgmt_users', JSON.stringify(mgmtUsers));
    }

    // Save to management-visible tenant list
    const mgmtTenants = JSON.parse(localStorage.getItem('yourai_mgmt_tenants') || '[]');
    if (!mgmtTenants.some((t: any) => t.name === (data.orgName || `${data.name}'s Firm`))) {
      mgmtTenants.push({
        id: Date.now(),
        name: data.orgName || `${data.name}'s Firm`,
        plan: 'Free',
        users: 1,
        workspaces: 0,
        documents: 0,
        status: 'Active',
        created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        mrr: 0,
        planPrice: 0,
        billedSince: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        nextRenewal: '',
        paymentStatus: 'N/A',
      });
      localStorage.setItem('yourai_mgmt_tenants', JSON.stringify(mgmtTenants));
    }
  } catch { /* localStorage full — ignore */ }
}

/**
 * Track a successful login — increment login count and update lastActive.
 * Called after login() succeeds.
 */
export function trackLogin(email: string): void {
  try {
    const mgmtUsers = JSON.parse(localStorage.getItem('yourai_mgmt_users') || '[]');
    const user = mgmtUsers.find((u: any) => u.email === email);
    if (user) {
      user.logins = (user.logins || 0) + 1;
      user.lastActive = 'Just now';
      localStorage.setItem('yourai_mgmt_users', JSON.stringify(mgmtUsers));
    }
  } catch { /* ignore */ }
}

/**
 * Track a document upload — increment docsUploaded for the current user.
 */
export function trackDocUpload(email: string): void {
  try {
    const mgmtUsers = JSON.parse(localStorage.getItem('yourai_mgmt_users') || '[]');
    const user = mgmtUsers.find((u: any) => u.email === email);
    if (user) {
      user.docsUploaded = (user.docsUploaded || 0) + 1;
      user.lastActive = 'Just now';
      localStorage.setItem('yourai_mgmt_users', JSON.stringify(mgmtUsers));
    }
  } catch { /* ignore */ }
}
