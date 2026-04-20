/**
 * Vercel Serverless Function — POST /api/frd-generate
 *
 * Accepts { platform, module } from the Super-Admin console and streams an
 * FRD Features chapter back to the browser as plain text.
 *
 * The OpenAI API key stays on the server — the browser never sees it.
 * All provider errors are logged server-side but the client only ever
 * receives a plain-English error message.
 *
 * Runtime: Node (default for Vercel). Streams OpenAI's SSE response body
 * straight through to the client as chunked text so the preview modal can
 * render progressively if desired.
 */

import { FRD_SYSTEM_PROMPT } from '../src/lib/frdSystemPrompt';

// Vercel Node-runtime request/response shapes — kept loose to avoid a
// @vercel/node type dependency that isn't in this repo.
interface VercelRequest {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}
interface VercelResponse {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  write: (chunk: string | Uint8Array) => boolean;
  end: (body?: string | Uint8Array) => void;
  json: (body: unknown) => VercelResponse;
}

const GENERIC_ERROR_MESSAGE =
  "Couldn't generate the FRD. Please try again.";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Safe body parsing — Vercel usually parses JSON automatically, but guard
  // against the function being invoked in an environment that doesn't.
  let body: { platform?: string; module?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as { platform?: string; module?: string } ?? {});
  } catch {
    res.status(400).json({ error: GENERIC_ERROR_MESSAGE });
    return;
  }

  const platform = typeof body.platform === 'string' ? body.platform.trim() : '';
  const moduleLabel = typeof body.module === 'string' ? body.module.trim() : '';

  if (!platform || !moduleLabel) {
    res.status(400).json({ error: GENERIC_ERROR_MESSAGE });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Log server-side only; user sees generic message.
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

  let upstream: Response;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
        max_completion_tokens: 16000,
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

  // Stream as plain text. The browser fetch reads `response.body` directly;
  // we parse OpenAI's SSE frames here and forward only the token text, which
  // keeps the client code simple.
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

      // SSE frames are separated by a blank line ("\n\n").
      let frameEnd = buffer.indexOf('\n\n');
      while (frameEnd !== -1) {
        const frame = buffer.slice(0, frameEnd);
        buffer = buffer.slice(frameEnd + 2);

        // Each frame may have multiple "data: ..." lines.
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
              // Skip malformed frames silently.
            }
          }
        }

        frameEnd = buffer.indexOf('\n\n');
      }
    }
  } catch (err) {
    console.error('[frd-generate] stream read error', err);
    // If we never wrote anything, report error. Otherwise just end the stream.
    if (!wroteAnything) {
      res.write(GENERIC_ERROR_MESSAGE);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
    res.end();
  }
}
