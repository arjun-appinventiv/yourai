// Chat route — POST /api/chat
// Streaming LLM response with RAG context
// See: tech-stack.md — RAG PIPELINE SPECS

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { callLLM } from '../lib/llm';
import { retrieveContext } from '../lib/rag';

const router = Router();

// POST /api/chat — streaming response
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { conversationId, message, sessionDocId } = req.body;
  const user = req.user!;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Get or create conversation
  let convo;
  if (conversationId) {
    convo = await prisma.conversation.findFirst({
      where: { id: conversationId, orgId: user.orgId },
    });
  }

  if (!convo) {
    // Create session + conversation
    const session = await prisma.session.create({
      data: { userId: user.userId, docId: sessionDocId || null },
    });
    convo = await prisma.conversation.create({
      data: {
        orgId: user.orgId,
        sessionId: session.id,
        title: message.length > 50 ? message.substring(0, 50) + '...' : message,
      },
    });
  }

  // Save user message
  await prisma.message.create({
    data: {
      conversationId: convo.id,
      role: 'USER',
      content: message,
      userId: user.userId,
    },
  });

  // Get conversation history
  const history = await prisma.message.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  // Retrieve RAG context
  const { context, sourceType } = await retrieveContext(
    message,
    user.orgId,
    sessionDocId || null
  );

  // Get bot persona
  const persona = await prisma.botPersona.findFirst({
    orderBy: { version: 'desc' },
  });

  const systemPrompt = [
    persona?.systemPrompt || 'You are YourAI, a helpful AI assistant for legal professionals.',
    '',
    'Context from documents:',
    context,
  ].join('\n');

  // Set streaming headers
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Source-Type', sourceType);
  res.setHeader('X-Conversation-Id', convo.id);

  // Stream LLM response
  let fullResponse = '';
  try {
    const llmMessages = history.map((m: any) => ({
      role: m.role === 'USER' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));

    for await (const chunk of callLLM(llmMessages, systemPrompt)) {
      fullResponse += chunk;
      res.write(chunk);
    }
  } catch (err) {
    const fallback = persona?.fallbackMessage || 'I apologize, but I encountered an error processing your request. Please try again.';
    if (!fullResponse) {
      res.write(fallback);
      fullResponse = fallback;
    }
  }

  // Save assistant message
  await prisma.message.create({
    data: {
      conversationId: convo.id,
      role: 'ASSISTANT',
      content: fullResponse,
      sourceType,
      sourceDocId: sessionDocId || null,
    },
  });

  res.end();
});

export default router;
