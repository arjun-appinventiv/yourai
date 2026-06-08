/* ─── IntentArtifactPanel ─────────────────────────────────────────────
 *
 * Right-docked panel that hosts card-intent results (Risk Memo, Clause
 * Analysis, Summary, Comparison, Case Brief, Research Brief, Timeline)
 * outside of the chat thread — Claude-style artifact panel.
 *
 * The chat bubble for a card-intent response renders a compact preview
 * chip ("📄 Risk memo · View"); clicking it opens this panel anchored
 * to that message. find_document keeps its FileResultsCard inline
 * (search results read better in line with the conversation).
 *
 * Layout:
 *   sibling of chat-main — width 540 (or fullscreen toggle), flex-shrink 0,
 *   borderLeft, scrollable body.
 */

import React, { useState, useMemo } from 'react';
import { X, Maximize2, Minimize2, Copy, Check, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { isCardIntent } from './cards/IntentCard';
import { cardDataToMarkdown } from '../../lib/cardToMarkdown';

const INTENT_LABELS: Record<string, string> = {
  document_summarisation: 'Summary',
  clause_comparison:      'Clause comparison',
  case_law_analysis:      'Case brief',
  legal_research:         'Research brief',
  risk_assessment:        'Risk memo',
  clause_analysis:        'Clause analysis',
};

const INTENT_EYEBROWS: Record<string, string> = {
  document_summarisation: 'DOCUMENT SUMMARY',
  clause_comparison:      'CLAUSE COMPARISON',
  case_law_analysis:      'CASE LAW ANALYSIS',
  legal_research:         'RESEARCH BRIEF',
  risk_assessment:        'RISK MEMO',
  clause_analysis:        'CLAUSE ANALYSIS',
};

// Export format per intent.
//   pdf  — window.print() in a styled popup; user hits "Save as PDF"
//   docx — Office HTML Blob saved as .doc; opens + editable in Word
//   xlsx — Excel HTML table Blob saved as .xls; opens in Excel
const EXPORT_FORMAT: Record<string, 'pdf' | 'docx' | 'xlsx'> = {
  document_summarisation: 'pdf',   // final read-only deliverable to client
  risk_assessment:        'pdf',   // client-facing memo, formatting preserved
  case_law_analysis:      'docx',  // attorneys annotate & cite; goes into work files
  legal_research:         'docx',  // work product; built on and revised
  clause_comparison:      'xlsx',  // table: clause | Doc 1 | Doc 2, needs filtering
  clause_analysis:        'xlsx',  // filter by HIGH / MEDIUM / LOW risk level
};

const EXPORT_BUTTON_LABEL: Record<string, string> = {
  pdf:  'PDF',
  docx: 'Word',
  xlsx: 'Excel',
};

// ─── HTML escape helper ──────────────────────────────────────────────
function esc(s: any): string {
  const str = s == null ? '' : String(s).trim();
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeStr(s: any): string {
  return s == null ? '' : String(s).trim();
}

// ─── Minimal markdown → HTML (handles the subset cardToMarkdown emits) ──
function mdToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inList = false;

  const inlineFmt = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,    '<em>$1</em>');

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('### ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3>${inlineFmt(esc(line.slice(4)))}</h3>`);
    } else if (line.startsWith('## ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2>${inlineFmt(esc(line.slice(3)))}</h2>`);
    } else if (line.startsWith('# ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h1>${inlineFmt(esc(line.slice(2)))}</h1>`);
    } else if (line.startsWith('> ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<blockquote>${inlineFmt(esc(line.slice(2)))}</blockquote>`);
    } else if (line.startsWith('- ')) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inlineFmt(esc(line.slice(2)))}</li>`);
    } else if (line === '---') {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<hr>');
    } else if (line === '') {
      if (inList) { out.push('</ul>'); inList = false; }
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p>${inlineFmt(esc(line))}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

// ─── PDF ─────────────────────────────────────────────────────────────
// Opens a clean print window; user clicks "Save as PDF" in the browser's
// print dialog. No dependency needed — browser handles the conversion.
function exportAsPdf(markdown: string, docTitle: string) {
  const body = mdToHtml(markdown);
  const win = window.open('', '_blank', 'width=860,height=720');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>${esc(docTitle)}</title>
    <style>
      body{font-family:Georgia,serif;font-size:11pt;line-height:1.75;
           color:#111;max-width:720px;margin:0 auto;padding:36px 48px}
      h1{font-size:20pt;margin:0 0 6px}
      h2{font-size:13pt;margin:22px 0 6px;padding-bottom:4px;border-bottom:1px solid #ddd}
      h3{font-size:11.5pt;margin:14px 0 4px}
      blockquote{border-left:3px solid #bbb;margin:12px 0;
                 padding:8px 16px;color:#555;font-style:italic}
      ul{padding-left:22px}li{margin:3px 0}
      hr{border:none;border-top:1px solid #ddd;margin:22px 0}
      p{margin:6px 0}
      @media print{body{padding:0}@page{margin:2cm}}
    </style>
  </head><body>${body}</body></html>`);
  win.document.close();
  // Small delay so the browser finishes rendering before opening the dialog.
  setTimeout(() => win.print(), 280);
}

// ─── Word (.doc) ─────────────────────────────────────────────────────
// Office HTML Blob trick — Word opens HTML with application/msword MIME.
// Preserves heading levels, bold, italic, blockquotes. Fully editable.
function exportAsDocx(markdown: string, docTitle: string) {
  const body = mdToHtml(markdown);
  const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <title>${esc(docTitle)}</title>
      <!--[if gte mso 9]><xml><w:WordDocument>
        <w:View>Print</w:View><w:Zoom>100</w:Zoom>
      </w:WordDocument></xml><![endif]-->
      <style>
        body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.7;margin:2cm}
        h1{font-size:18pt}h2{font-size:13pt}h3{font-size:11.5pt}
        blockquote{border-left:3px solid #bbb;padding-left:12px;color:#555;margin:10px 0}
        ul{padding-left:20px}li{margin:3px 0}
        hr{border:none;border-top:1px solid #ccc}
      </style>
    </head>
    <body>${body}</body>
  </html>`;
  triggerDownload(
    new Blob(['﻿', wordHtml], { type: 'application/msword' }),
    `${sanitizeFilename(docTitle)}.doc`,
  );
}

// ─── Excel (.xls) ────────────────────────────────────────────────────
// Builds a structured HTML table from the raw card data — more useful
// than parsing the markdown back out. Saves as .xls (Office 2003 XML);
// Excel, LibreOffice, and Google Sheets all open it natively.
function exportAsExcel(intent: string, data: any, docTitle: string) {
  let tableHtml = '';

  const TH_STYLE = 'background:#1F3864;color:white;font-family:Arial;font-size:10pt;font-weight:bold;padding:8px 12px;text-align:left';
  const TD_STYLE = 'font-family:Arial;font-size:10pt;padding:8px 12px;vertical-align:top;border:1px solid #ddd';
  const riskColor = (r: string) =>
    r === 'high' ? '#dc2626' : r === 'medium' ? '#d97706' : '#16a34a';

  if (intent === 'clause_comparison') {
    const doc1 = safeStr(data?.doc1Name) || 'Document 1';
    const doc2 = safeStr(data?.doc2Name) || 'Document 2';
    const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];
    tableHtml = `
      <table border="1" cellspacing="0" cellpadding="0">
        <tr>
          <th style="${TH_STYLE}">Clause</th>
          <th style="${TH_STYLE}">${esc(doc1)}</th>
          <th style="${TH_STYLE}">${esc(doc2)}</th>
        </tr>
        ${rows.map((r) => `<tr>
          <td style="${TD_STYLE};font-weight:600">${esc(safeStr(r.clause))}</td>
          <td style="${TD_STYLE}">${esc(safeStr(r.doc1?.text))}</td>
          <td style="${TD_STYLE}">${esc(safeStr(r.doc2?.text))}</td>
        </tr>`).join('')}
      </table>`;

  } else if (intent === 'clause_analysis') {
    const clauses: any[] = Array.isArray(data?.clauses) ? data.clauses : [];
    tableHtml = `
      <table border="1" cellspacing="0" cellpadding="0">
        <tr>
          <th style="${TH_STYLE}">#</th>
          <th style="${TH_STYLE}">Clause</th>
          <th style="${TH_STYLE}">Location</th>
          <th style="${TH_STYLE}">Risk</th>
          <th style="${TH_STYLE}">Extracted text</th>
          <th style="${TH_STYLE}">Interpretation</th>
          <th style="${TH_STYLE}">Recommendation</th>
        </tr>
        ${clauses.map((c, i) => {
          const risk = safeStr(c.risk).toLowerCase();
          return `<tr>
            <td style="${TD_STYLE};text-align:center">${i + 1}</td>
            <td style="${TD_STYLE};font-weight:600">${esc(safeStr(c.title))}</td>
            <td style="${TD_STYLE}">${esc(safeStr(c.location))}</td>
            <td style="${TD_STYLE};font-weight:700;color:${riskColor(risk)}">${esc(risk.toUpperCase())}</td>
            <td style="${TD_STYLE};font-style:italic">${esc(safeStr(c.quote))}</td>
            <td style="${TD_STYLE}">${esc(safeStr(c.interpretation))}</td>
            <td style="${TD_STYLE}">${esc(safeStr(c.recommendation))}</td>
          </tr>`;
        }).join('')}
      </table>`;
  }

  const xlsHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"><title>${esc(docTitle)}</title></head>
    <body>${tableHtml}</body>
  </html>`;

  triggerDownload(
    new Blob(['﻿', xlsHtml], { type: 'application/vnd.ms-excel' }),
    `${sanitizeFilename(docTitle)}.xls`,
  );
}

// ─── Shared download trigger ─────────────────────────────────────────
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9 \-_]/g, '').trim().replace(/\s+/g, '_').slice(0, 80) || 'document';
}

// ─────────────────────────────────────────────────────────────────────

interface Props {
  intent: string;
  data: unknown;
  /** Title to show in the header — falls back to the intent label. */
  title?: string;
  onClose: () => void;
}

export default function IntentArtifactPanel({ intent, data, title, onClose }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const eyebrow = INTENT_EYEBROWS[intent] || (INTENT_LABELS[intent] ? INTENT_LABELS[intent].toUpperCase() : 'ARTIFACT');
  const label = title || INTENT_LABELS[intent] || 'Artifact';

  const markdown = useMemo(() => cardDataToMarkdown(intent, data), [intent, data]);

  const exportFmt = EXPORT_FORMAT[intent];
  const exportBtnLabel = exportFmt ? EXPORT_BUTTON_LABEL[exportFmt] : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const handleExport = () => {
    if (!exportFmt) return;
    setDownloading(true);
    setTimeout(() => setDownloading(false), 1200);

    if (exportFmt === 'pdf') {
      exportAsPdf(markdown || '', label);
    } else if (exportFmt === 'docx') {
      exportAsDocx(markdown || '', label);
    } else if (exportFmt === 'xlsx') {
      exportAsExcel(intent, data, label);
    }
  };

  if (!isCardIntent(intent)) return null;

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 10px', borderRadius: 8,
    fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-secondary)',
  };

  const iconBtn: React.CSSProperties = {
    padding: 6, borderRadius: 8,
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div
      style={fullscreen ? {
        position: 'fixed', inset: 0, zIndex: 90,
        background: '#FFFFFF',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 0 1px var(--border)',
      } : {
        width: 540, flexShrink: 0,
        background: '#FFFFFF',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        minHeight: 0,
        boxShadow: '-4px 0 16px rgba(10,36,99,0.08)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B7280', fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
            {eyebrow}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--navy)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </div>
        </div>

        {/* Copy */}
        <button
          onClick={handleCopy}
          title="Copy as Markdown"
          style={{
            ...btnBase,
            background: copied ? '#DCFCE7' : 'transparent',
            border: '1px solid ' + (copied ? '#86EFAC' : 'var(--border)'),
            color: copied ? '#166534' : 'var(--text-secondary)',
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>

        {/* Export — only when a format is mapped for this intent */}
        {exportBtnLabel && (
          <button
            onClick={handleExport}
            title={`Download as ${exportFmt === 'pdf' ? 'PDF' : exportFmt === 'docx' ? 'Word document' : 'Excel spreadsheet'}`}
            style={{
              ...btnBase,
              background: downloading ? '#EFF6FF' : 'transparent',
              border: '1px solid ' + (downloading ? '#93C5FD' : 'var(--border)'),
              color: downloading ? '#1D4ED8' : 'var(--text-secondary)',
            }}
          >
            <Download size={13} />
            {exportBtnLabel}
          </button>
        )}

        {/* Fullscreen toggle */}
        <button
          onClick={() => setFullscreen((v) => !v)}
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          style={iconBtn}
        >
          {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>

        {/* Close */}
        <button onClick={onClose} title="Close" style={iconBtn}>
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: fullscreen ? '32px max(32px, calc(50vw - 360px))' : '28px 32px',
        background: '#FFFFFF',
      }}>
        <div className="artifact-prose">
          <ReactMarkdown>{markdown || '*No content.*'}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
