// Auth routes — /api/auth/*
// See: tech-stack.md — Authentication section

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// config — reads from .env
const getSecret = () => process.env.JWT_SECRET!;
const getExpiry = () => process.env.JWT_EXPIRES_IN || '7d';

function setAuthCookie(res: Response, payload: object) {
  const token = (jwt.sign as any)(payload, getSecret(), { expiresIn: getExpiry() });
  res.cookie('yourai_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
  return token;
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { org: true },
  });

  if (!user || !user.passwordHash) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  const payload = {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    email: user.email,
    name: user.name,
  };

  setAuthCookie(res, payload);

  // TODO: implement real 2FA with Cognito TOTP
  // For now, no OTP required
  return res.json({
    success: true,
    requiresOtp: false,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      orgName: user.org.name,
      avatar: user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
      plan: user.org.plan,
    },
  });
});

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  const { name, email, password, orgName } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email, and password required' });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(409).json({ success: false, error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Create org + user in transaction
  const result = await prisma.$transaction(async (tx: any) => {
    const org = await tx.org.create({
      data: { name: orgName || `${name}'s Org`, plan: 'FREE' },
    });
    const user = await tx.user.create({
      data: { name, email, passwordHash, role: 'ADMIN', orgId: org.id },
    });
    return { user, org };
  });

  const payload = {
    userId: result.user.id,
    orgId: result.org.id,
    role: result.user.role,
    email: result.user.email,
    name: result.user.name,
  };

  setAuthCookie(res, payload);

  return res.json({
    success: true,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      orgId: result.org.id,
      orgName: result.org.name,
      plan: result.org.plan,
    },
  });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (_req: Request, res: Response) => {
  // TODO: implement real OTP verification with Cognito TOTP
  return res.json({ success: true });
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (_req: Request, res: Response) => {
  // TODO: implement real OTP resend
  return res.json({ success: true });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  // TODO: send reset email via SES
  // Always return success to prevent email enumeration
  return res.json({ success: true });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  // TODO: validate reset token and update password
  return res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { org: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.orgId,
    orgName: user.org.name,
    avatar: user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
    plan: user.org.plan,
  });
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('yourai_session', { path: '/' });
  return res.json({ success: true });
});

// GET /api/auth/google — SSO auto-login (demo mode)
router.get('/google', async (_req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { email: 'ryan@hartwell.com' },
    include: { org: true },
  });

  if (!user) {
    return res.redirect((process.env.FRONTEND_URL || 'http://localhost:5173') + '/chat/login?error=no-demo-user');
  }

  setAuthCookie(res, {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  return res.redirect((process.env.FRONTEND_URL || 'http://localhost:5173') + '/chat');
});

// GET /api/auth/microsoft — SSO auto-login (demo mode)
router.get('/microsoft', async (_req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { email: 'ryan@hartwell.com' },
    include: { org: true },
  });

  if (!user) {
    return res.redirect((process.env.FRONTEND_URL || 'http://localhost:5173') + '/chat/login?error=no-demo-user');
  }

  setAuthCookie(res, {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  return res.redirect((process.env.FRONTEND_URL || 'http://localhost:5173') + '/chat');
});

export default router;
