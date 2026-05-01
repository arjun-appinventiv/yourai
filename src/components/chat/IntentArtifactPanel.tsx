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
import { X, Maximize2, Minimize2, Copy, Check } from 'lucide-react';
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
  timeline_extraction:    'Timeline',
};

const INTENT_EYEBROWS: Record<string, string> = {
  document_summarisation: 'DOCUMENT SUMMARY',
  clause_comparison:      'CLAUSE COMPARISON',
  case_law_analysis:      'CASE LAW ANALYSIS',
  legal_research:         'RESEARCH BRIEF',
  risk_assessment:        'RISK MEMO',
  clause_analysis:        'CLAUSE ANALYSIS',
  timeline_extraction:    'TIMELINE',
};

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

  const eyebrow = INTENT_EYEBROWS[intent] || (INTENT_LABELS[intent] ? INTENT_LABELS[intent].toUpperCase() : 'ARTIFACT');
  const label = title || INTENT_LABELS[intent] || 'Artifact';

  // Markdown report — generated once per data change. Looks like a memo
  // / Notion doc / Word file rather than a styled UI component.
  const markdown = useMemo(() => cardDataToMarkdown(intent, data), [intent, data]);

  const handleCopy = async () => {
    try {
      // Copy the markdown report — paste into Notion / docs / email
      // and it renders as expected.
      await navigator.clipboard.writeText(markdown || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  if (!isCardIntent(intent)) return null;

  return (
    <div
      style={fullscreen ? {
        position: 'fixed', inset: 0, zIndex: 90,
        background: '#FDFBF5',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 0 1px var(--border)',
      } : {
        width: 540, flexShrink: 0,
        background: '#FDFBF5',
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
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
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
          title="Copy as JSON"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', borderRadius: 8,
            background: copied ? '#DCFCE7' : 'transparent',
            border: '1px solid ' + (copied ? '#86EFAC' : 'var(--border)'),
            color: copied ? '#166534' : 'var(--text-secondary)',
            fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={() => setFullscreen((v) => !v)}
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          style={{
            padding: 6, borderRadius: 8,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          title="Close"
          style={{
            padding: 6, borderRadius: 8,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body — scrollable, renders the JSON-card data as a clean
          markdown report (looks like a memo / Notion doc / Word file). */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: fullscreen ? '32px max(32px, calc(50vw - 360px))' : '28px 32px',
        background: '#FFFFFF',
      }}>
        <div style={{
          maxWidth: 720, margin: '0 auto',
          fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)',
        }}>
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: 28, fontWeight: 400, color: 'var(--navy)',
                  margin: '0 0 12px 0', lineHeight: 1.2, letterSpacing: '-0.01em',
                }}>{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 style={{
                  fontSize: 16, fontWeight: 600, color: 'var(--navy)',
                  margin: '28px 0 10px 0', paddingBottom: 6,
                  borderBottom: '1px solid var(--border)', letterSpacing: '-0.005em',
                }}>{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 style={{
                  fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                  margin: '20px 0 6px 0',
                }}>{children}</h3>
              ),
              p: ({ children }) => (
                <p style={{ margin: '0 0 12px 0', lineHeight: 1.7 }}>{children}</p>
              ),
              ul: ({ children }) => (
                <ul style={{ paddingLeft: 22, margin: '8px 0 14px 0' }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ paddingLeft: 22, margin: '8px 0 14px 0' }}>{children}</ol>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: 4, lineHeight: 1.65 }}>{children}</li>
              ),
              strong: ({ children }) => (
                <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{children}</strong>
              ),
              em: ({ children }) => (
                <em style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{children}</em>
              ),
              blockquote: ({ children }) => (
                <blockquote style={{
                  margin: '14px 0', padding: '10px 16px',
                  borderLeft: '3px solid var(--border)',
                  background: '#FAFAF6', color: 'var(--text-secondary)',
                  fontStyle: 'normal',
                }}>{children}</blockquote>
              ),
              code: ({ children }) => (
                <code style={{
                  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  fontSize: 12.5, background: '#F4F4EE',
                  padding: '1px 5px', borderRadius: 3,
                  color: 'var(--text-primary)',
                }}>{children}</code>
              ),
              hr: () => (
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />
              ),
            }}
          >
            {markdown || '*No content.*'}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
