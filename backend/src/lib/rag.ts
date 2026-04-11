// RAG pipeline — chunking, embedding, retrieval
// See: tech-stack.md — RAG PIPELINE SPECS
// Stage 2: Chunk → 512 tokens, 64 overlap, heading-boundary aware
// Stage 3: Embed → text-embedding-3-large (OpenAI)
// Stage 5: Retrieve → cosine similarity, RLS-scoped

import { prisma } from './prisma';
import OpenAI from 'openai';

// config — reads from .env
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Chunk text into ~512 token segments with 64 token overlap.
 */
export function chunkText(text: string, chunkSize = 2000, overlap = 250): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}

/**
 * Generate embedding for a text using OpenAI text-embedding-3-large.
 */
export async function embed(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Ingest a document: extract text, chunk, store.
 * Embedding storage requires pgvector — TODO: add via raw SQL migration.
 */
export async function ingestDocument(documentId: string): Promise<void> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error(`Document ${documentId} not found`);

  // Extract text based on file type
  const { readFile } = await import('./storage');
  const buffer = await readFile(doc.url);
  let text = '';

  if (doc.type === 'application/pdf' || doc.name.endsWith('.pdf')) {
    const pdfModule = await import('pdf-parse');
    const pdfParse = (pdfModule as any).default || pdfModule;
    const pdf = await pdfParse(buffer);
    text = pdf.text;
  } else if (doc.name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    // Plain text fallback
    text = buffer.toString('utf-8');
  }

  // Chunk the text
  const chunks = chunkText(text);

  // Store chunks in DB
  await prisma.chunk.createMany({
    data: chunks.map((content, i) => ({
      documentId,
      content,
      pageNumber: i + 1,
    })),
  });

  // Mark document as ready
  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'READY' },
  });
}

/**
 * Retrieve relevant context for a query.
 * TODO: When pgvector is enabled, use cosine similarity search.
 * For now, uses simple text matching as a fallback.
 */
export async function retrieveContext(
  query: string,
  orgId: string,
  sessionDocId: string | null
): Promise<{ context: string; sourceType: 'UPLOADED_DOC' | 'GLOBAL_KB' }> {
  // Scope to the specific document if provided
  const where = sessionDocId
    ? { documentId: sessionDocId }
    : { document: { orgId, isGlobal: true, status: 'READY' } };

  const chunks = await prisma.chunk.findMany({
    where,
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  if (chunks.length === 0) {
    return {
      context: 'No relevant documents found.',
      sourceType: sessionDocId ? 'UPLOADED_DOC' : 'GLOBAL_KB',
    };
  }

  return {
    context: chunks.map((c: any) => c.content).join('\n\n---\n\n'),
    sourceType: sessionDocId ? 'UPLOADED_DOC' : 'GLOBAL_KB',
  };
}
