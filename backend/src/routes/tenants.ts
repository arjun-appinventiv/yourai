// Tenant (Org) routes — /api/tenants
// Super Admin CRUD for organizations

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/tenants
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  const orgs = await prisma.org.findMany({
    include: {
      _count: { select: { users: true, documents: true, conversations: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = orgs.map((o: any) => ({
    id: o.id,
    name: o.name,
    plan: o.plan,
    status: o.status,
    users: o._count.users,
    documents: o._count.documents,
    conversations: o._count.conversations,
    createdAt: o.createdAt,
  }));

  return res.json(mapped);
});

// GET /api/tenants/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const org = await prisma.org.findUnique({
    where: { id: req.params.id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      _count: { select: { documents: true, conversations: true } },
    },
  });
  if (!org) return res.status(404).json({ error: 'Org not found' });
  return res.json(org);
});

// POST /api/tenants/:id/suspend
router.post('/:id/suspend', requireAuth, async (req: Request, res: Response) => {
  const org = await prisma.org.update({
    where: { id: req.params.id },
    data: { status: 'SUSPENDED' },
  });
  return res.json(org);
});

// POST /api/tenants/:id/activate
router.post('/:id/activate', requireAuth, async (req: Request, res: Response) => {
  const org = await prisma.org.update({
    where: { id: req.params.id },
    data: { status: 'ACTIVE' },
  });
  return res.json(org);
});

export default router;
