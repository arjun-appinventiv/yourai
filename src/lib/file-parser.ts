/**
 * File-to-text extraction for RAG pipeline.
 * Converts uploaded files (PDF, DOCX, TXT, etc.) into plain text for LLM context.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/**
 * Extract text from a PDF file using pdf.js
 */
async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    if (pageText.trim()) {
      pages.push(`[Page ${i}]\n${pageText}`);
    }
  }

  return pages.join('\n\n');
}

/**
 * Extract text from a plain-text-based file (TXT, CSV, RTF, etc.)
 */
function extractPlainText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      resolve(typeof text === 'string' ? text : '');
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Main entry: extract text from any supported file type.
 * Returns extracted text (truncated to maxChars for LLM context window).
 */
export async function extractFileText(
  file: File,
  maxChars = 50000,
): Promise<{ text: string; pageCount?: number }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  try {
    if (ext === 'pdf') {
      const text = await extractPdfText(file);
      const pageCount = text.split('[Page ').length - 1;

      // Check if extracted text is mostly readable ASCII/Unicode
      // Garbled PDFs (scanned images, weird encodings) produce lots of replacement chars
      if (!text.trim()) {
        return {
          text: `[File: ${file.name}] This PDF appears to be image-based or empty — I couldn't extract readable text. If possible, try a text-based PDF or paste the relevant content directly.`,
          pageCount,
        };
      }

      const readableChars = text.replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F\u0400-\u04FF\u2000-\u206F\u2190-\u21FF\u2500-\u257F]/g, '');
      const readableRatio = readableChars.length / (text.length || 1);

      if (readableRatio < 0.6) {
        return {
          text: `[File: ${file.name}] This PDF (${pageCount} page${pageCount !== 1 ? 's' : ''}, ${formatFileSize(file.size)}) couldn't be read properly — it may be scanned, image-based, or use non-standard encoding. Try uploading a text-based PDF, or paste the key sections directly.`,
          pageCount,
        };
      }

      return { text: text.slice(0, maxChars), pageCount };
    }

    // Plain text formats — read directly
    if (['txt', 'csv', 'rtf', 'md'].includes(ext)) {
      const text = await extractPlainText(file);
      return { text: text.slice(0, maxChars) };
    }

    // DOCX, DOC, ODT, XLS, XLSX, PPT, PPTX — try readAsText as best-effort
    // These are binary formats; readAsText won't work well but we handle gracefully
    if (['doc', 'docx', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      // For DOCX: it's a ZIP containing XML. readAsText gives partial results.
      // We attempt readAsText and check if it's mostly readable
      const text = await extractPlainText(file);
      const readableRatio = text.replace(/[^\x20-\x7E\n\r\t]/g, '').length / (text.length || 1);

      if (readableRatio < 0.5) {
        // Too much binary — return a descriptive message instead of garbled text
        return {
          text: `[File: ${file.name}] This is a ${ext.toUpperCase()} file (${formatFileSize(file.size)}). The file format requires server-side processing for full text extraction. Please use TXT or PDF format for best results.`,
        };
      }
      return { text: text.slice(0, maxChars) };
    }

    // Fallback: try reading as text
    const text = await extractPlainText(file);
    return { text: text.slice(0, maxChars) };
  } catch (err) {
    console.error(`Failed to extract text from ${file.name}:`, err);
    return {
      text: `[File: ${file.name}] Could not extract text from this file. Error: ${(err as Error).message}`,
    };
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
