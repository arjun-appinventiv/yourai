// config — reads from .env.local
// Auth functions — all calls go to the backend API.
// Session is managed via httpOnly cookies set by the backend.
// No tokens stored in localStorage or JS memory.
// Removed: mock credentials replaced by real API calls to /api/auth/*
// See: tech-stack.md — Backend API section

const BASE = import.meta.env.VITE_API_URL || '';

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
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invalid credentials' }));
    return { success: false, error: err.error || 'Invalid credentials' };
  }

  return res.json();
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
