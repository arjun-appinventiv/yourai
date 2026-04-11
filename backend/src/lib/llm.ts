// config — reads from .env
// LLM router — switch providers by changing LLM_PROVIDER in .env
// No code changes needed to switch between OpenAI, Anthropic, Google.

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Call the active LLM provider with streaming.
 * Returns an async iterable of text chunks.
 */
export async function* callLLM(
  messages: LLMMessage[],
  systemPrompt: string
): AsyncGenerator<string> {
  // config — reads from .env
  const provider = process.env.LLM_PROVIDER || 'openai';
  const model = process.env.LLM_MODEL || 'gpt-4o';

  if (provider === 'openai') {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.filter(m => m.role !== 'system'),
      ],
      stream: true,
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
    return;
  }

  if (provider === 'anthropic') {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = anthropic.messages.stream({
      model,
      system: systemPrompt,
      messages: messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      max_tokens: 2048,
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
    return;
  }

  if (provider === 'google') {
    const genai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const gemini = genai.getGenerativeModel({ model });
    const chat = gemini.startChat({
      history: messages
        .filter(m => m.role !== 'system')
        .slice(0, -1)
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    });
    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessageStream(
      systemPrompt + '\n\n' + (lastMsg?.content || '')
    );
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
    return;
  }

  throw new Error(`Unknown LLM_PROVIDER: ${provider}. Set to openai, anthropic, or google in .env`);
}
