// ─── /api/chat — server-side OpenAI proxy ────────────────────────────────
//
// Lets the browser talk to OpenAI without ever seeing the key. Accepts the
// client's simple `{ message, conversationId?, sessionId?, sessionDocId?,
// history?, system? }` shape (and also the older `{ messages: [...] }`
// shape for back-compat), calls OpenAI Chat Completions with stream=true,
// and pipes the assistant's text back as a plain `text/plain` stream so
// the existing ChatView reader (which just concatenates chunks) works
// unchanged.
//
// Runs on Vercel's Edge runtime for first-class streaming.

export const config = { runtime: 'edge' };

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = (globalThis as any).process?.env?.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response('AI service is not configured on the server.', {
      status: 500, headers: { 'Content-Type': 'text/plain' },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  // Build messages[] — accept both legacy `{messages}` and the client's
  // `{message, history?, system?}` shape.
  let messages: ChatMessage[] = [];
  if (Array.isArray(body?.messages) && body.messages.length > 0) {
    messages = body.messages;
  } else if (typeof body?.message === 'string' && body.message.trim()) {
    const system: ChatMessage = {
      role: 'system',
      content: body.system || 'You are YourAI, a helpful legal assistant for US law firms. Be concise, accurate, and cite jurisdictions where relevant. Never fabricate case names or statutes.',
    };
    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history.filter((m: any) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
      : [];
    messages = [system, ...history, { role: 'user', content: body.message }];
  } else {
    return new Response('message or messages[] is required', { status: 400 });
  }

  const model       = body.model       || 'gpt-4o-mini';
  const temperature = body.temperature ?? 0.7;
  const max_tokens  = body.max_tokens  || 2048;

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens, stream: true }),
  });

  if (!upstream.ok || !upstream.body) {
    const errJson = await upstream.json().catch(() => ({}));
    const raw = (errJson?.error?.message || '').toLowerCase();
    let message = 'Something went wrong. Please try again.';
    if (/rate.?limit|too many requests|429|quota|exceeded/.test(raw))       message = 'The AI is busy right now. Please try again in a moment.';
    else if (/invalid.?api.?key|unauthorized|401/.test(raw))                message = 'AI service is temporarily unavailable. Please contact your administrator.';
    else if (/context.?length|maximum context|too long/.test(raw))          message = 'This conversation is too long to continue. Please start a new chat.';
    else if (/model.?not.?found|does not exist|deprecated/.test(raw))       message = 'AI service is temporarily unavailable. Please try again.';
    else if (/timeout|timed out|connection|network/.test(raw))              message = 'The AI took too long to respond. Please try again.';
    return new Response(message, {
      status: upstream.status, headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Transform OpenAI SSE → plain text chunks for the client.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader  = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by "\n\n"
          let sepIdx;
          while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sepIdx);
            buffer = buffer.slice(sepIdx + 2);

            for (const line of frame.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const json = JSON.parse(data);
                const delta = json?.choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta.length > 0) {
                  controller.enqueue(encoder.encode(delta));
                }
              } catch { /* skip malformed frame */ }
            }
          }
        }
      } catch (err) {
        // Surface a friendly error in-stream rather than abort mid-response.
        controller.enqueue(encoder.encode('\n\n[Connection interrupted. Please try again.]'));
      } finally {
        controller.close();
      }
    },
    cancel() { try { reader.cancel(); } catch { /* ignore */ } },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'X-Source-Type': 'AI_GENERATED',
    },
  });
}
