// LLM client — encrypted key, client-side fallback when backend is unreachable
// Key is encrypted 5x with XOR + base64. Never stored in DB.
// To remove: delete the ENCRYPTED_KEY constant below.

// ─── 5x Encrypted Gemini Key ───
// Encryption: XOR with salt → base64, repeated 5 times
const ENCRYPTED_KEY = 'EStBAQwYbGtjWVJ6F1E2F3JoIgAqciJJcHJFQW4nEQcVUxspNx8EA3tzYWpXVQQKIkR1LCMYOA0QenRoYVwYJio9A384LCwbBiFKXVV0bEAmUyZEfgoAOTNyLnRidWdUbwonIxUHPi4tGSI5ZmYFf1BHMQMrHkMoLDcCah4cQl0=';
const SALT = 'YourAI-2026-salt';

function xorWithSalt(input: string, salt: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    result += String.fromCharCode(input.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
  }
  return result;
}

function encrypt(key: string, rounds: number = 5): string {
  let encoded = key;
  for (let i = 0; i < rounds; i++) {
    encoded = btoa(xorWithSalt(encoded, SALT + i));
  }
  return encoded;
}

function decrypt(encoded: string, rounds: number = 5): string {
  let decoded = encoded;
  for (let i = rounds - 1; i >= 0; i--) {
    decoded = xorWithSalt(atob(decoded), SALT + i);
  }
  return decoded;
}

// Call this once in browser console to get the encrypted value:
// import { encryptKey } from './lib/llm-client'; encryptKey('sk-...')
export function encryptKey(plainKey: string): string {
  const result = encrypt(plainKey);
  console.log('Encrypted key (paste into ENCRYPTED_KEY):', result);
  return result;
}

let _cachedKey: string | null = null;

export function getApiKey(): string | null {
  if (_cachedKey) return _cachedKey;
  if (!ENCRYPTED_KEY) return null;
  try {
    _cachedKey = decrypt(ENCRYPTED_KEY);
    return _cachedKey;
  } catch {
    return null;
  }
}

export function clearKey(): void {
  _cachedKey = null;
}

// ─── Bot Persona from localStorage ───
export interface BotPersona {
  operations: Array<{
    id: number;
    label: string;
    systemPrompt: string;
    tone: string;
    formatRules: string[];
    enabled: boolean;
  }>;
  fallbackMessage: string;
  globalDocs: Array<{ id: number; name: string; content?: string }>;
}

export function getPersona(): BotPersona | null {
  try {
    const raw = localStorage.getItem('yourai_bot_persona');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function buildSystemPrompt(persona: BotPersona | null): string {
  if (!persona) {
    return "You are Alex, a legal AI assistant built for US law firms. You help attorneys and paralegals analyse documents, research legal questions, and draft outputs. You are precise, professional, and always cite your sources.";
  }

  const activeOp = persona.operations.find(o => o.enabled && o.label === 'General Chat')
    || persona.operations.find(o => o.enabled)
    || persona.operations[0];

  const parts = [activeOp.systemPrompt];

  // Add format rules
  const ruleLabels: Record<string, string> = {
    cite_source: 'Always cite the source document and page number.',
    bullet_lists: 'Use bullet points for lists of 3 or more items.',
    risk_summary: 'Always include a risk level summary (High/Medium/Low).',
    next_action: 'End every response with a suggested next action.',
  };
  if (activeOp.formatRules?.length) {
    parts.push('\nResponse format rules:');
    activeOp.formatRules.forEach(r => {
      if (ruleLabels[r]) parts.push(`- ${ruleLabels[r]}`);
    });
  }

  // Add tone
  if (activeOp.tone) {
    parts.push(`\nTone: ${activeOp.tone}. Maintain this tone throughout your responses.`);
  }

  // Add global KB docs as context
  const docsWithContent = persona.globalDocs.filter(d => d.content);
  if (docsWithContent.length > 0) {
    parts.push('\n--- Knowledge Base Documents ---');
    docsWithContent.forEach(d => {
      parts.push(`\n[Document: ${d.name}]\n${d.content}`);
    });
    parts.push('\n--- End Knowledge Base ---');
  }

  return parts.join('\n');
}

// ─── Direct Gemini call (client-side fallback) ───
export async function callLLM(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (text: string) => void,
): Promise<{ fullContent: string; sourceType: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key configured');
  }

  const persona = getPersona();
  let systemPrompt = buildSystemPrompt(persona);

  // Inject CourtListener context if enabled
  try {
    const clData = localStorage.getItem('yourai_courtlistener_kb');
    if (clData) {
      systemPrompt += '\n\n' + clData;
    }
  } catch { /* ignore */ }

  // For legal queries, search CourtListener for relevant case law
  const legalKeywords = /\b(court|case|statute|law|legal|judge|ruling|opinion|precedent|plaintiff|defendant|contract|liability|jurisdiction|appeal|motion|verdict|tort|damages|negligence|compliance|regulation)\b/i;
  if (legalKeywords.test(userMessage)) {
    try {
      const { searchCourtListenerKB } = await import('./courtlistener');
      const searchContext = await searchCourtListenerKB(userMessage.slice(0, 100));
      if (searchContext) {
        systemPrompt += '\n\n' + searchContext;
      }
    } catch { /* CourtListener unavailable — continue without */ }
  }

  // Build Gemini request format
  const contents = [
    ...history.slice(-20).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split('\n').filter(l => l.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        const parts = parsed.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.text) {
              fullContent += part.text;
              onChunk(fullContent);
            }
          }
        }
      } catch { /* skip malformed chunks */ }
    }
  }

  // If persona has global docs, mark as knowledge base source
  const hasKbContext = persona?.globalDocs.some(d => d.content);
  return {
    fullContent,
    sourceType: hasKbContext ? 'GLOBAL_KB' : 'NONE',
  };
}

// Backward compat alias
export const callOpenAI = callLLM;
