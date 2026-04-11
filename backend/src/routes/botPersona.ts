// Bot Persona routes — /api/bot-persona
// GET and PUT for the global bot persona config

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/bot-persona
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  const persona = await prisma.botPersona.findFirst({
    orderBy: { version: 'desc' },
  });

  if (!persona) {
    return res.json({
      systemPrompt: 'You are YourAI, a helpful AI assistant for legal professionals.',
      tone: 'FORMAL',
      formatRules: '{}',
      fallbackMessage: 'I apologize, but I could not process your request.',
      version: 0,
    });
  }

  return res.json(persona);
});

// PUT /api/bot-persona
router.put('/', requireAuth, async (req: Request, res: Response) => {
  const { systemPrompt, tone, formatRules, fallbackMessage } = req.body;

  const current = await prisma.botPersona.findFirst({
    orderBy: { version: 'desc' },
  });

  const persona = await prisma.botPersona.create({
    data: {
      systemPrompt: systemPrompt || 'You are YourAI.',
      tone: tone || 'FORMAL',
      formatRules: typeof formatRules === 'string' ? formatRules : JSON.stringify(formatRules || {}),
      fallbackMessage: fallbackMessage || 'I apologize, but I could not process your request.',
      version: (current?.version || 0) + 1,
      updatedBy: req.user!.userId,
    },
  });

  return res.json(persona);
});

export default router;
