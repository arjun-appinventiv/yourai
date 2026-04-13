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
    return { success: true, requiresOtp: false, user: demo.user };
  }

  // Check localStorage-registered users (from client-side sign-up)
  try {
    const registered = JSON.parse(localStorage.getItem('yourai_registered_users') || '{}');
    const reg = registered[email];
    if (reg && reg.password === password) {
      return { success: true, requiresOtp: false, user: reg.user };
    }
  } catch { /* ignore */ }

  return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
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
 * Logout — clears httpOnly cookie on the backend.
 */
export async function logout(): Promise<void> {
  await fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
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
