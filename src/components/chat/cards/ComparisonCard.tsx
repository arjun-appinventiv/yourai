import React from 'react';
import {
  EditorialShell, EditorialHeader, EditorialFooter,
  Body, ACCENTS, COLORS, MONO,
} from './EditorialShell';

export type ComparisonVerdict = 'better' | 'worse' | 'neutral';

export interface ComparisonRow {
  clause: string;
  doc1: { verdict: ComparisonVerdict; text: string };
  doc2: { verdict: ComparisonVerdict; text: string };
}

export interface ComparisonCardData {
  doc1Name: string;
  doc2Name: string;
  clauseCount: number;
  rows: ComparisonRow[];
  recommendation: string;
  sourceType: 'doc' | 'workspace';
  sourceName: string;
}

const VERDICT_CELL_BG: Record<ComparisonVerdict, string> = {
  better: '#F0FDF4',
  worse: '#FFFBEB',
  neutral: '#F9FAFB',
};

const VERDICT_PILL: Record<ComparisonVerdict, { bg: string; color: string; label: string }> = {
  better:  { bg: '#DCFCE7', color: '#166534', label: '↑ More favourable' },
  worse:   { bg: '#FEF9C3', color: '#854D0E', label: '↓ Less favourable' },
  neutral: { bg: '#F3F4F6', color: '#374151', label: '— Absent' },
};

export default function ComparisonCard({ data }: { data: ComparisonCardData }) {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const doc1Name = data?.doc1Name || 'Document 1';
  const doc2Name = data?.doc2Name || 'Document 2';

  // Empty-state: schema-forced JSON with no real data (no docs attached).
  const isEmpty = rows.length === 0 && !data?.doc1Name && !data?.doc2Name && !data?.recommendation;
  if (isEmpty) {
    return (
      <EditorialShell accentColor={ACCENTS.navy}>
        <EditorialHeader
          intentLabel="Clause Comparison"
          title="No documents to compare"
          subtitle="Clause comparison needs two documents"
          sourcePill={{ label: 'Workspace', kind: 'workspace' }}
        />
        <div style={{ padding: '26px 32px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Body>
            Upload the two contracts (or memos, or policies) you want to compare using the <strong>+</strong> button next to the input, then ask again and I'll produce the clause-by-clause comparison.
          </Body>
          <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
            If you meant a general question, switch the intent pill above the input to <em>General chat</em> or <em>Legal Q&amp;A</em>.
          </div>
        </div>
        <EditorialFooter footerText="—" />
      </EditorialShell>
    );
  }

  const footerText = data?.sourceName ? `Documents: ${data.sourceName}` : '—';

  return (
    <EditorialShell accentColor={ACCENTS.navy}>
      <EditorialHeader
        intentLabel="Clause Comparison"
        title={`${doc1Name} vs ${doc2Name}`}
        subtitle={`${data?.clauseCount ?? rows.length} clauses compared · 2 documents`}
        sourcePill={{ label: 'Workspace', kind: 'workspace' }}
      />

      {/* Column header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '130px 1fr 1fr',
          background: COLORS.title,
        }}
      >
        <HeaderCell text="Clause" color="rgba(255,255,255,0.4)" />
        <HeaderCell text={doc1Name} color={COLORS.gold} />
        <HeaderCell text={doc2Name} color="rgba(255,255,255,0.4)" last />
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div style={{ padding: '20px 32px', textAlign: 'center', fontSize: 14, color: COLORS.muted, fontStyle: 'italic' }}>
          No clauses to compare.
        </div>
      ) : (
        rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '130px 1fr 1fr',
              borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${COLORS.border}`,
            }}
          >
            {/* Clause cell */}
            <div
              style={{
                padding: '16px',
                background: COLORS.panelBg,
                borderRight: `1px solid ${COLORS.border}`,
                fontFamily: MONO,
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: COLORS.body,
                lineHeight: 1.6,
                display: 'flex',
                alignItems: 'flex-start',
              }}
            >
              {row.clause}
            </div>

            <DataCell verdict={row.doc1?.verdict || 'neutral'} text={row.doc1?.text || ''} />
            <DataCell verdict={row.doc2?.verdict || 'neutral'} text={row.doc2?.text || ''} last />
          </div>
        ))
      )}

      {/* Recommendation */}
      {data?.recommendation ? (
        <div
          style={{
            padding: '14px 32px',
            background: COLORS.panelBg,
            borderTop: `1px solid ${COLORS.border}`,
            fontSize: 14,
            color: COLORS.body,
            lineHeight: 1.7,
          }}
        >
          <span style={{ color: COLORS.title, fontWeight: 600 }}>Recommendation — </span>
          {data.recommendation}
        </div>
      ) : null}

      <EditorialFooter footerText={footerText} />
    </EditorialShell>
  );
}

function HeaderCell({ text, color, last }: { text: string; color: string; last?: boolean }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 12,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: '12px 16px',
        color,
        borderRight: last ? 'none' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {text}
    </div>
  );
}

function DataCell({ verdict, text, last }: { verdict: ComparisonVerdict; text: string; last?: boolean }) {
  const pill = VERDICT_PILL[verdict];
  return (
    <div
      style={{
        padding: '16px',
        background: VERDICT_CELL_BG[verdict],
        borderRight: last ? 'none' : `1px solid ${COLORS.border}`,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '2px 8px',
          borderRadius: 4,
          marginBottom: 7,
          background: pill.bg,
          color: pill.color,
          fontWeight: 600,
        }}
      >
        {pill.label}
      </span>
      <div style={{ fontSize: 14, color: COLORS.body, lineHeight: 1.7 }}>{text || '—'}</div>
    </div>
  );
}
