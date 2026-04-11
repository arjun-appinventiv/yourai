// LLM client — encrypted key, client-side fallback when backend is unreachable
// Key is encrypted 5x with XOR + base64. Never stored in DB.
// To remove: delete the ENCRYPTED_KEY constant below.

// ─── 5x Encrypted Groq Key ───
// Encryption: XOR with salt → base64, repeated 5 times
const ENCRYPTED_KEY = 'EQgjMAsYWmtkWloZKTQlEn8KBF48ci5jYlt/B04bCSoScjEpMUAyHGBzCGNufyIKIR1ibCsyAiYbH2BFUEwYKigvEFkfLDwLEjBGeVF0bEIlUyIefgocWj8mKhpicXt6bwpUJy5YDCwXQDYkeEgFf1N+PhA7HkMtJzAKcCpBA15QX2w1IhVBUhheQQQOIBlTVXp0RTE2VTFkMD5FOi0IdHl0Al1IMS9UEQdgPiEedXxmcGkAUnw+ETwxDGQ=';
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

// ─── Context layers for 4-tier priority answer flow ───
// Priority: 1. Uploaded Doc → 2. Knowledge Pack → 3. Global KB → 4. Fallback
export interface ContextLayers {
  uploadedDoc?: { name: string; content: string } | null;
  knowledgePack?: { name: string; description: string; content?: string } | null;
}

// ─── Direct Groq call (client-side fallback) ───
export async function callLLM(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (text: string) => void,
  context?: ContextLayers,
): Promise<{ fullContent: string; sourceType: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key configured');
  }

  const persona = getPersona();
  let systemPrompt = buildSystemPrompt(persona);

  // ─── 4-Tier Priority Context Injection ───
  // Build context sections and instruct LLM on priority order
  const contextSections: string[] = [];
  const availableSources: string[] = [];

  // Tier 1: User's uploaded document
  if (context?.uploadedDoc?.content) {
    contextSections.push(
      `\n--- USER'S UPLOADED DOCUMENT (HIGHEST PRIORITY) ---`,
      `[Document: ${context.uploadedDoc.name}]`,
      context.uploadedDoc.content.slice(0, 30000),
      `--- END UPLOADED DOCUMENT ---`
    );
    availableSources.push('UPLOADED_DOC');
  }

  // Tier 2: Knowledge Pack
  if (context?.knowledgePack) {
    const packContent = context.knowledgePack.content
      ? `\n${context.knowledgePack.content.slice(0, 20000)}`
      : `\nDescription: ${context.knowledgePack.description}`;
    contextSections.push(
      `\n--- KNOWLEDGE PACK: ${context.knowledgePack.name} ---`,
      packContent,
      `--- END KNOWLEDGE PACK ---`
    );
    availableSources.push('KNOWLEDGE_PACK');
  }

  // Tier 3: Global KB (already in systemPrompt via buildSystemPrompt)
  const hasGlobalKb = persona?.globalDocs.some(d => d.content);
  if (hasGlobalKb) {
    availableSources.push('GLOBAL_KB');
  }

  // Inject CourtListener context if enabled (extends Global KB)
  try {
    const clData = localStorage.getItem('yourai_courtlistener_kb');
    if (clData) {
      contextSections.push('\n' + clData);
      if (!availableSources.includes('GLOBAL_KB')) availableSources.push('GLOBAL_KB');
    }
  } catch { /* ignore */ }

  // For legal queries, search CourtListener for relevant case law
  const legalKeywords = /\b(court|case|statute|law|legal|judge|ruling|opinion|precedent|plaintiff|defendant|contract|liability|jurisdiction|appeal|motion|verdict|tort|damages|negligence|compliance|regulation)\b/i;
  if (legalKeywords.test(userMessage)) {
    try {
      const { searchCourtListenerKB } = await import('./courtlistener');
      const searchContext = await searchCourtListenerKB(userMessage.slice(0, 100));
      if (searchContext) {
        contextSections.push('\n' + searchContext);
      }
    } catch { /* CourtListener unavailable — continue without */ }
  }

  // Add context sections to system prompt
  if (contextSections.length > 0) {
    systemPrompt += '\n' + contextSections.join('\n');
  }

  // Add source attribution instructions when context is available
  if (availableSources.length > 0) {
    const sourceDescriptions: Record<string, string> = {
      UPLOADED_DOC: "user's uploaded document (sections marked USER'S UPLOADED DOCUMENT)",
      KNOWLEDGE_PACK: 'knowledge pack (sections marked KNOWLEDGE PACK)',
      GLOBAL_KB: 'global knowledge base (sections marked Knowledge Base Documents)',
    };
    const sourceOptions = availableSources
      .map(s => `  [SOURCE: ${s}] — if you answered from the ${sourceDescriptions[s] || s}`)
      .join('\n');

    systemPrompt += `\n\n--- SOURCE ATTRIBUTION ---
You have access to context sources listed by priority (highest first):
${availableSources.map((s, i) => `${i + 1}. ${sourceDescriptions[s] || s}`).join('\n')}

RULES:
- Answer from the HIGHEST-PRIORITY source that contains relevant information.
- Each step only triggers if the previous one found nothing relevant.
- At the very end of your response, on its own line, output exactly one of these tags:
${sourceOptions}
  [SOURCE: NONE] — if none of the provided documents were relevant
- The source tag MUST be the last line. Do NOT use source tags not listed above.`;
  }

  // Build OpenAI-compatible request (Groq uses the same format)
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.slice(-20),
    { role: 'user' as const, content: userMessage },
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq API error: ${response.status}`);
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
      if (data === '[DONE]') continue;
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onChunk(fullContent);
        }
      } catch { /* skip malformed chunks */ }
    }
  }

  // Parse source tag from response and strip it from visible content
  let sourceType = 'NONE';
  const sourceMatch = fullContent.match(/\[SOURCE:\s*(UPLOADED_DOC|KNOWLEDGE_PACK|GLOBAL_KB|NONE)\]\s*$/);
  if (sourceMatch) {
    sourceType = sourceMatch[1];
    fullContent = fullContent.replace(/\n?\[SOURCE:\s*\w+\]\s*$/, '').trimEnd();
    // Update the streamed content to strip the tag
    onChunk(fullContent);
  } else if (hasGlobalKb) {
    sourceType = 'GLOBAL_KB';
  }

  // If no source found relevant and persona has fallback, use it
  if (sourceType === 'NONE' && persona?.fallbackMessage && availableSources.length > 0) {
    fullContent = persona.fallbackMessage;
    onChunk(fullContent);
  }

  return { fullContent, sourceType };
}

// Backward compat alias
export const callOpenAI = callLLM;
