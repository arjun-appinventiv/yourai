/**
 * Dev-time mirror of the Vercel serverless function at /api/frd-generate.
 * Lets the FRD Generator work in local dev via the Vite proxy to
 * localhost:8000 without running `vercel dev`.
 *
 * Keep the behaviour identical to api/frd-generate.ts — system prompt,
 * model, parameters, streaming, and error messaging all match.
 */

import { Router, type Request, type Response } from 'express';

// The frontend owns the canonical system prompt. Import it directly so the
// two environments cannot drift. Path is relative to backend/src/routes.
import { FRD_SYSTEM_PROMPT } from '../../../src/lib/frdSystemPrompt';

const router = Router();

const GENERIC_ERROR_MESSAGE = "Couldn't generate the FRD. Please try again.";

router.post('/', async (req: Request, res: Response) => {
  const platform = typeof req.body?.platform === 'string' ? req.body.platform.trim() : '';
  const moduleLabel = typeof req.body?.module === 'string' ? req.body.module.trim() : '';

  if (!platform || !moduleLabel) {
    res.status(400).json({ error: GENERIC_ERROR_MESSAGE });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[frd-generate] OPENAI_API_KEY is not configured');
    res.status(500).json({ error: GENERIC_ERROR_MESSAGE });
    return;
  }

  const userMessage =
    'Generate the Features chapter for this module.\n' +
    'PLATFORM: ' + platform + '\n' +
    'MODULE: ' + moduleLabel + '\n' +
    'Identify the natural features of this module and produce a ' +
    'single Markdown document following the structure in the ' +
    'system prompt.';

  let upstream: globalThis.Response;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Keep in sync with api/frd-generate.ts.
        model: 'gpt-4o',
        max_tokens: 8000,
        stream: true,
        messages: [
          { role: 'system', content: FRD_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });
  } catch (err) {
    console.error('[frd-generate] fetch to OpenAI failed', err);
    res.status(502).json({ error: GENERIC_ERROR_MESSAGE });
    return;
  }

  if (!upstream.ok || !upstream.body) {
    let detail = '';
    try {
      detail = await upstream.text();
    } catch {
      /* ignore */
    }
    console.error(`[frd-generate] OpenAI responded ${upstream.status}: ${detail.slice(0, 500)}`);
    res.status(502).json({ error: GENERIC_ERROR_MESSAGE });
    return;
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Accel-Buffering', 'no');

  const reader = (upstream.body as unknown as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let wroteAnything = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let frameEnd = buffer.indexOf('\n\n');
      while (frameEnd !== -1) {
        const frame = buffer.slice(0, frameEnd);
        buffer = buffer.slice(frameEnd + 2);

        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            // Graceful end.
          } else if (data) {
            try {
              const parsed = JSON.parse(data);
              const delta: string | undefined = parsed?.choices?.[0]?.delta?.content;
              if (delta) {
                res.write(delta);
                wroteAnything = true;
              }
            } catch {
              // Skip malformed frames.
            }
          }
        }

        frameEnd = buffer.indexOf('\n\n');
      }
    }
  } catch (err) {
    console.error('[frd-generate] stream read error', err);
    if (!wroteAnything) {
      res.write(GENERIC_ERROR_MESSAGE);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
    res.end();
  }
});

export default router;
