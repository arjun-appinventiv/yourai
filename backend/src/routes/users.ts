// User routes — /api/users
// CRUD for users within an org

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/users — list users in the caller's org
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { orgId: req.user!.orgId },
    select: {
      id: true, name: true, email: true, role: true,
      createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(users);
});

// GET /api/users/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, orgId: req.user!.orgId },
    select: {
      id: true, name: true, email: true, role: true,
      createdAt: true, updatedAt: true,
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

// POST /api/users/:id/block
router.post('/:id/block', requireAuth, async (req: Request, res: Response) => {
  // TODO: implement user blocking logic
  return res.json({ success: true });
});

export default router;
