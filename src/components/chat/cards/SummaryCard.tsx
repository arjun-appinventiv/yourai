import React from 'react';
import CardShell from './CardShell';
import CardHeader, { type SourcePillType } from './CardHeader';
import CardFooter, { type CardFooterSource } from './CardFooter';

const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export interface SummaryCardData {
  documentName: string;
  clauseCount: number;
  fileSize: string;
  date: string;
  executiveSummary: string;
  metadata: {
    parties: string;
    keyDates: string;
    governingLaw: string;
    keyObligations: string;
  };
  keyPoints: string[];
  flag: string | null;
  sourceType: 'doc' | 'kb';
  sourceName: string;
}

export default function SummaryCard({ data }: { data: SummaryCardData }) {
  const points = Array.isArray(data?.keyPoints) ? data.keyPoints.slice(0, 8) : [];
  const meta = data?.metadata || ({} as SummaryCardData['metadata']);

  // When the card schema was enforced but no document was actually supplied,
  // the LLM returns an envelope with empty strings. Rendering the full grid
  // of dashes looks broken — collapse to a single empty-state message.
  const hasExecSummary = !!data?.executiveSummary?.trim();
  const hasAnyMeta = !!(meta.parties?.trim() || meta.keyDates?.trim() || meta.governingLaw?.trim() || meta.keyObligations?.trim());
  const isEmpty = !hasExecSummary && !hasAnyMeta && points.length === 0 && !data?.documentName;

  if (isEmpty) {
    return (
      <CardShell accentColor="gold">
        <CardHeader
          intentLabel="Document Summarisation"
          title="No document supplied"
          subtitle="Summarisation needs a source document"
          sourcePill={{ label: 'Document', type: 'doc' }}
        />
        <div style={{ padding: '28px 28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: 0 }}>
            It looks like you asked for a summary but didn't attach a document. Upload a contract, memo, or filing using the <strong>+</strong> button next to the input, then ask again and I'll produce the full summary card.
          </p>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
            If you meant to ask a general question rather than analyse a document, switch the intent pill above the input to <em>General chat</em> or <em>Legal Q&amp;A</em>.
          </p>
        </div>
        <CardFooter sourceType="none" sourceName="—" />
      </CardShell>
    );
  }

  return (
    <CardShell accentColor="gold">
      <CardHeader
        intentLabel="Document Summarisation"
        title={data?.documentName || 'Untitled document'}
        subtitle={`${data?.clauseCount ?? 0} clauses · ${data?.fileSize || '—'} · ${data?.date || ''}`}
        sourcePill={{ label: data?.sourceType === 'kb' ? 'Knowledge Base' : 'Document', type: (data?.sourceType as SourcePillType) || 'doc' }}
      />

      <div style={{ padding: '20px 22px' }}>
        {/* Executive summary */}
        <p
          style={{
            fontSize: 14,
            color: '#374151',
            lineHeight: 1.8,
            margin: 0,
            paddingBottom: 24,
            borderBottom: '1px solid #E4E7EC',
          }}
        >
          {data?.executiveSummary || 'No executive summary available.'}
        </p>

        {/* 2×2 metadata grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
            marginTop: 24,
            marginBottom: 26,
          }}
        >
          <MetaBlock label="Parties" value={meta.parties} />
          <MetaBlock label="Key Dates" value={meta.keyDates} />
          <MetaBlock label="Governing Law" value={meta.governingLaw} />
          <MetaBlock label="Key Obligations" value={meta.keyObligations} />
        </div>

        {/* Key points */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 13,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#4B5563',
            marginBottom: 12,
          }}
        >
          Key Points
        </div>
        {points.length === 0 ? (
          <div style={{ fontSize: 15, color: '#4B5563', fontStyle: 'italic' }}>No key points identified.</div>
        ) : (
          <div>
            {points.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '12px 0',
                  borderBottom: i === points.length - 1 ? 'none' : '1px solid #F3F4F6',
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: '#4B5563',
                    width: 18,
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 15, color: '#374151', lineHeight: 1.7 }}>{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Flag */}
        {data?.flag ? (
          <div
            style={{
              marginTop: 22,
              padding: '14px 18px',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderLeft: '3px solid #C9A84C',
              borderRadius: 6,
              fontSize: 14,
              color: '#92400E',
              lineHeight: 1.7,
            }}
          >
            <span style={{ color: '#C9A84C', fontWeight: 600 }}>Needs attention — </span>
            {data.flag}
          </div>
        ) : null}
      </div>

      <CardFooter sourceType={(data?.sourceType as CardFooterSource) || 'none'} sourceName={data?.sourceName || '—'} />
    </CardShell>
  );
}

function MetaBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div
      style={{
        background: '#F9FAFB',
        border: '1px solid #E4E7EC',
        borderRadius: 8,
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 13,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#C9A84C',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: '#0B1D3A',
          lineHeight: 1.65,
          whiteSpace: 'pre-line',
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}
