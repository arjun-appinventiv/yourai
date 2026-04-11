// Conversation routes — /api/conversations
// List, create, get messages

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/conversations
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const convos = await prisma.conversation.findMany({
    where: { orgId: req.user!.orgId },
    include: { _count: { select: { messages: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const mapped = convos.map((c: any) => ({
    id: c.id,
    title: c.title,
    messageCount: c._count.messages,
    createdAt: c.createdAt,
  }));

  return res.json(mapped);
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const convo = await prisma.conversation.findFirst({
    where: { id: req.params.id, orgId: req.user!.orgId },
  });
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });

  const messages = await prisma.message.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: 'asc' },
  });

  return res.json(messages);
});

export default router;
