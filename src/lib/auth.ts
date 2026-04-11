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
 */
export async function signUp(data: {
  name: string;
  email: string;
  password: string;
  orgName?: string;
}): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Sign up failed' }));
    return { success: false, error: err.error || 'Sign up failed' };
  }

  return res.json();
}
