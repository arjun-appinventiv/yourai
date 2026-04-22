import React from 'react';
import CardShell from './CardShell';
import CardHeader from './CardHeader';
import CardFooter, { type CardFooterSource } from './CardFooter';

const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

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
  neutral: { bg: '#F3F4F6', color: '#6B7280', label: '— Absent' },
};

export default function ComparisonCard({ data }: { data: ComparisonCardData }) {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const doc1Name = data?.doc1Name || 'Document 1';
  const doc2Name = data?.doc2Name || 'Document 2';

  return (
    <CardShell accentColor="navy">
      <CardHeader
        intentLabel="Clause Comparison"
        title={`${doc1Name} vs ${doc2Name}`}
        subtitle={`${data?.clauseCount ?? rows.length} clauses compared · 2 documents`}
        sourcePill={{ label: 'Workspace', type: 'workspace' }}
      />

      {/* Column header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '130px 1fr 1fr',
          background: '#0B1D3A',
        }}
      >
        <HeaderCell text="Clause" color="rgba(255,255,255,0.4)" />
        <HeaderCell text={doc1Name} color="#C9A84C" />
        <HeaderCell text={doc2Name} color="rgba(255,255,255,0.4)" last />
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div style={{ padding: '28px', textAlign: 'center', fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>
          No clauses to compare.
        </div>
      ) : (
        rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '130px 1fr 1fr',
              borderBottom: i === rows.length - 1 ? 'none' : '1px solid #E4E7EC',
            }}
          >
            {/* Clause cell */}
            <div
              style={{
                padding: '16px',
                background: '#F9FAFB',
                borderRight: '1px solid #E4E7EC',
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#6B7280',
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
            padding: '16px 28px',
            background: '#F8FAFC',
            borderTop: '1px solid #E4E7EC',
            fontSize: 12,
            color: '#6B7280',
            lineHeight: 1.7,
          }}
        >
          <span style={{ color: '#0B1D3A', fontWeight: 600 }}>Recommendation — </span>
          {data.recommendation}
        </div>
      ) : null}

      <CardFooter sourceType={(data?.sourceType as CardFooterSource) || 'none'} sourceName={data?.sourceName || '—'} />
    </CardShell>
  );
}

function HeaderCell({ text, color, last }: { text: string; color: string; last?: boolean }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 9,
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
        borderRight: last ? 'none' : '1px solid #E4E7EC',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          fontFamily: MONO,
          fontSize: 8,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '2px 8px',
          borderRadius: 4,
          marginBottom: 7,
          background: pill.bg,
          color: pill.color,
        }}
      >
        {pill.label}
      </span>
      <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{text || '—'}</div>
    </div>
  );
}
