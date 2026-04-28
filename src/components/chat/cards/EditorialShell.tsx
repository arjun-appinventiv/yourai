/* ─────────────── EditorialShell ───────────────
 *
 * Shared visual language for all intent response cards. Based on the
 * reference the PM shared — warm ivory, navy serif titles, gold
 * vertical accent bars, mono small-caps labels, high-contrast copy.
 *
 * Cards using this shell should stop rolling their own headers,
 * section dividers, and footers — use EditorialHeader / SectionTitle
 * / EditorialFooter below instead.
 */

import React from 'react';
import { Check, FileText, Download, Copy } from 'lucide-react';

export const MONO  = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
export const SERIF = "'DM Serif Display', Georgia, serif";
export const SANS  = "'DM Sans', 'Inter', system-ui, sans-serif";

/* ─── Shared design tokens ──────────────────────────────────────── */

export const COLORS = {
  // Background + surface
  pageBg:        '#FAF6EE', // warm ivory
  panelBg:       '#FDFBF5',
  cardBg:        '#FFFFFF',
  border:        'rgba(10,36,99,0.08)',

  // Text
  title:         '#0B1D3A',
  body:          '#1F2937',
  muted:         '#4B5563',
  faint:         '#6B7280',

  // Brand
  navy:          '#0A2463',
  gold:          '#C9A84C',
  goldStrong:    '#8A6D1F',

  // Status — use these everywhere, never ad-hoc hex
  severityHigh:  { bg: '#FEF2F2', fg: '#991B1B', border: '#FECACA' },
  severityMed:   { bg: '#FFFBEB', fg: '#92400E', border: '#FDE68A' },
  severityLow:   { bg: '#ECFDF5', fg: '#065F46', border: '#A7F3D0' },

  statusPass:    { bg: '#ECFDF5', fg: '#065F46', border: '#A7F3D0' },
  statusFail:    { bg: '#FEF2F2', fg: '#991B1B', border: '#FECACA' },
  statusPartial: { bg: '#FFFBEB', fg: '#92400E', border: '#FDE68A' },
} as const;

/* ─── Shell ─── */

interface EditorialShellProps {
  children: React.ReactNode;
  // CSS color string (or gradient). Defaults to gold so existing callers
  // (Risk / Clause / Timeline) render unchanged. Per-intent accent is
  // preserved across the unified-shell migration via this prop.
  accentColor?: string;
}

const DEFAULT_ACCENT = 'linear-gradient(to right, #C9A84C, #E8C96A)';

export function EditorialShell({ children, accentColor = DEFAULT_ACCENT }: EditorialShellProps) {
  return (
    <div
      style={{
        background: COLORS.cardBg,
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 2px 8px rgba(10, 36, 99, 0.05)',
        overflow: 'hidden',
      }}
    >
      <div style={{ height: 3, background: accentColor }} />
      {children}
    </div>
  );
}

/* Per-intent accent palette — keep aligned with the older CardShell map.
 * Use these tokens at call sites instead of hardcoding hex. */
export const ACCENTS = {
  gold:   'linear-gradient(to right, #C9A84C, #E8C96A)',
  navy:   'linear-gradient(to right, #0B1D3A, #1E3A8A)',
  green:  'linear-gradient(to right, #059669, #10B981)',
  indigo: 'linear-gradient(to right, #4338CA, #6366F1)',
  teal:   'linear-gradient(to right, #0D9488, #14B8A6)',
} as const;

/* ─── Header ─── */

export interface EditorialHeaderProps {
  intentLabel: string;             // e.g. "RISK MEMO"
  title: string;                   // e.g. "Meridian Capital NDA v2"
  subtitle?: string;               // e.g. "23 clauses · 4.2 MB · March 2026"
  sourcePill?: {                   // top-right pill
    label: string;                 // e.g. "Document"
    kind: 'doc' | 'kb' | 'workspace';
  };
}

const PILL_STYLES = {
  doc:       { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  kb:        { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  workspace: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
};

export function EditorialHeader({ intentLabel, title, subtitle, sourcePill }: EditorialHeaderProps) {
  const pill = sourcePill ? PILL_STYLES[sourcePill.kind] : null;
  return (
    <div style={{
      padding: '26px 32px 20px',
      background: COLORS.panelBg,
      borderBottom: `1px solid ${COLORS.border}`,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: MONO, fontSize: 11,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: COLORS.goldStrong, fontWeight: 600,
          marginBottom: 10,
        }}>
          {intentLabel}
        </div>
        <h2 style={{
          fontFamily: SERIF, fontSize: 28,
          color: COLORS.title, margin: 0,
          lineHeight: 1.15, fontWeight: 400,
        }}>
          {title}
        </h2>
        {subtitle && (
          <div style={{ fontFamily: MONO, fontSize: 12, color: COLORS.muted, marginTop: 8, letterSpacing: '0.04em' }}>
            {subtitle}
          </div>
        )}
      </div>

      {sourcePill && pill && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '5px 12px', borderRadius: 999,
          background: pill.bg, color: pill.color,
          border: `1px solid ${pill.border}`, fontWeight: 600,
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {sourcePill.label}
        </span>
      )}
    </div>
  );
}

/* ─── Section title with gold vertical accent bar ─── */

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      marginBottom: 16, marginTop: 4,
    }}>
      <span style={{ width: 4, height: 22, background: COLORS.gold, borderRadius: 2, flexShrink: 0 }} />
      <h3 style={{
        fontFamily: SERIF, fontSize: 22, color: COLORS.title,
        fontWeight: 400, margin: 0, lineHeight: 1,
      }}>
        {children}
      </h3>
    </div>
  );
}

/* ─── Small-caps label above content (use for "Documents analysed" etc.) ─── */

export function CapsLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: 11,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      color: COLORS.faint, fontWeight: 500,
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

/* ─── Document card (shared across cards that reference source docs) ─── */

export function DocumentCard({ name, pages, size, uploadedLabel, ok = true }: {
  name: string; pages?: number | null; size?: string | null; uploadedLabel?: string; ok?: boolean;
}) {
  const borderColor = ok ? COLORS.title : COLORS.severityHigh.border;
  const metaBits = [
    pages ? `${pages} pages` : null,
    uploadedLabel || null,
    size || null,
  ].filter(Boolean).join(' · ');
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 10,
      border: `1px solid ${borderColor}`,
      background: COLORS.cardBg,
      maxWidth: '100%', minWidth: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: 8,
        background: ok ? '#EFF6FF' : '#FEF2F2',
        color: ok ? '#1D4ED8' : '#991B1B',
        flexShrink: 0,
        fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      }}>
        PDF
      </div>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: ok ? COLORS.title : COLORS.severityHigh.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        {metaBits && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: COLORS.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {metaBits}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Pull quote block — gold left border, italic serif, caption below ─── */

export function PullQuote({ quote, caption }: { quote: string; caption?: string }) {
  return (
    <div style={{
      margin: '16px 0',
      padding: '16px 20px',
      background: 'rgba(201, 168, 76, 0.08)',
      borderLeft: `4px solid ${COLORS.gold}`,
      borderRadius: 6,
    }}>
      <div style={{
        fontFamily: SERIF, fontStyle: 'italic',
        fontSize: 17, lineHeight: 1.55, color: COLORS.title,
      }}>
        {quote}
      </div>
      {caption && (
        <div style={{
          fontFamily: MONO, fontSize: 11,
          color: COLORS.muted, marginTop: 10, letterSpacing: '0.04em',
        }}>
          {caption}
        </div>
      )}
    </div>
  );
}

/* ─── Body paragraph — 15px, navy-tinted, serif-friendly line height ─── */

export function Body({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: SANS, fontSize: 15,
      color: COLORS.body, lineHeight: 1.75,
      margin: '0 0 12px 0',
    }}>
      {children}
    </p>
  );
}

/* ─── Severity pill — High / Medium / Low ─── */

export function SeverityPill({ level }: { level: 'high' | 'medium' | 'low' }) {
  const map = {
    high:   { ...COLORS.severityHigh, label: 'High' },
    medium: { ...COLORS.severityMed,  label: 'Medium' },
    low:    { ...COLORS.severityLow,  label: 'Low' },
  } as const;
  const c = map[level];
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: 999,
      background: c.bg, color: c.fg,
      border: `1px solid ${c.border}`, fontWeight: 600,
    }}>
      {c.label}
    </span>
  );
}

/* ─── Status pill — Pass / Fail / Partial ─── */

export function StatusPill({ status, label }: { status: 'pass' | 'fail' | 'partial'; label?: string }) {
  const map = {
    pass:    { ...COLORS.statusPass,    label: label || 'Pass',    icon: '✓' },
    fail:    { ...COLORS.statusFail,    label: label || 'Fail',    icon: '✕' },
    partial: { ...COLORS.statusPartial, label: label || 'Partial', icon: '◐' },
  } as const;
  const c = map[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: 999,
      background: c.bg, color: c.fg,
      border: `1px solid ${c.border}`, fontWeight: 600,
    }}>
      <span>{c.icon}</span> {c.label}
    </span>
  );
}

/* ─── Shared footer — generated-at + download + copy ─── */

export function EditorialFooter({ footerText, onCopy, onDownload }: {
  footerText: string;
  onCopy?: () => void;
  onDownload?: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 28px',
      background: COLORS.panelBg, borderTop: `1px solid ${COLORS.border}`,
      flexWrap: 'wrap', gap: 8,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: COLORS.muted }}>
        {footerText}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onCopy && (
          <button
            onClick={onCopy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${COLORS.border}`, fontSize: 12, color: COLORS.muted, cursor: 'pointer' }}
          >
            <Copy size={12} /> Copy
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, background: COLORS.cardBg, border: `1px solid ${COLORS.navy}`, fontSize: 12, color: COLORS.navy, cursor: 'pointer', fontWeight: 500 }}
          >
            <Download size={12} /> Download PDF
          </button>
        )}
      </div>
    </div>
  );
}

/* Re-export icon so consumers don't need a separate lucide-react import */
export { Check, FileText };
