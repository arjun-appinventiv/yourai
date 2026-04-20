// ─── /api/chat — server-side OpenAI proxy ────────────────────────────────
//
// Lets the browser talk to OpenAI without ever seeing the key. Forwards
// the messages + model config to OpenAI Chat Completions, streams the
// response back as SSE. Runs on Vercel's Edge runtime so streaming is
// first-class.
//
// Client usage: POST /api/chat with
//   { messages: [{role, content}], model?, temperature?, max_tokens? }
// Response: text/event-stream — exactly the shape OpenAI returns, so
// existing client-side parsers keep working unchanged.

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = (globalThis as any).process?.env?.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI service is not configured on the server.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    messages,
    model = 'gpt-4o',
    temperature = 0.7,
    max_tokens = 4096,
    stream = true,
  } = body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages[] is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Forward to OpenAI. If the upstream call fails we surface a sanitized
  // error — never the raw provider error (which may leak model names,
  // org IDs, billing hints, etc.).
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens, stream }),
  });

  if (!upstream.ok) {
    const errJson = await upstream.json().catch(() => ({}));
    const raw = (errJson?.error?.message || '').toLowerCase();
    let message = 'Something went wrong. Please try again.';
    if (/rate.?limit|too many requests|429|quota|exceeded/.test(raw)) message = 'The AI is busy right now. Please try again in a moment.';
    else if (/invalid.?api.?key|unauthorized|401/.test(raw))          message = 'AI service is temporarily unavailable. Please contact your administrator.';
    else if (/context.?length|maximum context|too long/.test(raw))     message = 'This conversation is too long to continue. Please start a new chat.';
    else if (/model.?not.?found|does not exist|deprecated/.test(raw))  message = 'AI service is temporarily unavailable. Please try again.';
    else if (/timeout|timed out|connection|network/.test(raw))         message = 'The AI took too long to respond. Please try again.';
    return new Response(JSON.stringify({ error: message }), {
      status: upstream.status, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pipe the SSE stream straight through to the client. The upstream body
  // is already `text/event-stream` if stream=true.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
