/**
 * File-to-text extraction for RAG pipeline.
 * Converts uploaded files (PDF, DOCX, TXT, etc.) into plain text for LLM context.
 */

import * as pdfjsLib from 'pdfjs-dist';
import { unzip } from 'fflate';

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

      // Strip replacement chars, diamonds, box-drawing, and other garble indicators
      const readableChars = text.replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F\u0400-\u04FF]/g, '');
      const readableRatio = readableChars.length / (text.length || 1);

      // Also detect repetitive garble patterns (e.g. ◆◆G◆◆_◆ repeated)
      const garblePatterns = text.match(/[◆◇●○■□▪▫♦♢\uFFFD\u25A0-\u25FF\u2600-\u26FF]{2,}/g);
      const garbleCharCount = garblePatterns ? garblePatterns.reduce((sum, m) => sum + m.length, 0) : 0;
      const hasExcessiveGarble = garbleCharCount > text.length * 0.1;

      if (readableRatio < 0.7 || hasExcessiveGarble) {
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

    // DOCX / DOC: extract word/document.xml from the ZIP using fflate,
    // then strip XML tags to get plain text.
    if (['doc', 'docx'].includes(ext)) {
      try {
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        const text = await new Promise<string>((resolve, reject) => {
          unzip(uint8, { filter: (f) => f.name === 'word/document.xml' }, (err, files) => {
            if (err || !files['word/document.xml']) {
              reject(err || new Error('word/document.xml not found'));
              return;
            }
            const xml = new TextDecoder('utf-8').decode(files['word/document.xml']);
            // Paragraph ends → newlines; break elements → newlines; strip all tags
            const plain = xml
              .replace(/<\/w:p>/gi, '\n\n')
              .replace(/<w:br[^>]*\/>/gi, '\n')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
              .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
              .replace(/[ \t]+/g, ' ')
              .replace(/\n[ \t]+/g, '\n')
              .replace(/\n{3,}/g, '\n\n')
              .trim();
            resolve(plain);
          });
        });
        if (!text) {
          return {
            text: `[File: ${file.name}] This DOCX appears to be empty or image-based — no readable text could be extracted.`,
          };
        }
        return { text: text.slice(0, maxChars) };
      } catch {
        return {
          text: `[File: ${file.name}] Could not extract text from this DOCX file. Try saving as PDF or TXT and uploading again.`,
        };
      }
    }

    // ODT, XLS, XLSX, PPT, PPTX — binary formats; advise conversion
    if (['odt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      return {
        text: `[File: ${file.name}] This ${ext.toUpperCase()} file format requires server-side processing. Please convert to PDF or TXT for best results.`,
      };
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
