import React from 'react';
import {
  EditorialShell, EditorialHeader, EditorialFooter,
  Body, ACCENTS, COLORS, MONO,
} from './EditorialShell';

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
      <EditorialShell accentColor={ACCENTS.gold}>
        <EditorialHeader
          intentLabel="Document Summarisation"
          title="No document supplied"
          subtitle="Summarisation needs a source document"
          sourcePill={{ label: 'Document', kind: 'doc' }}
        />
        <div style={{ padding: '26px 32px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Body>
            It looks like you asked for a summary but didn't attach a document. Upload a contract, memo, or filing using the <strong>+</strong> button next to the input, then ask again and I'll produce the full summary card.
          </Body>
          <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
            If you meant to ask a general question rather than analyse a document, switch the intent pill above the input to <em>General chat</em> or <em>Legal Q&amp;A</em>.
          </div>
        </div>
        <EditorialFooter footerText="—" />
      </EditorialShell>
    );
  }

  const sourcePillLabel = data?.sourceType === 'kb' ? 'Knowledge Base' : 'Document';
  const sourcePillKind: 'doc' | 'kb' = data?.sourceType === 'kb' ? 'kb' : 'doc';
  const footerText = data?.sourceName
    ? (data.sourceType === 'kb' ? `Source: ${data.sourceName}` : `Document: ${data.sourceName}`)
    : '—';

  return (
    <EditorialShell accentColor={ACCENTS.gold}>
      <EditorialHeader
        intentLabel="Document Summarisation"
        title={data?.documentName || 'Untitled document'}
        subtitle={`${data?.clauseCount ?? 0} clauses · ${data?.fileSize || '—'} · ${data?.date || ''}`}
        sourcePill={{ label: sourcePillLabel, kind: sourcePillKind }}
      />

      <div style={{ padding: '26px 32px 28px' }}>
        {/* Executive summary */}
        <p
          style={{
            fontSize: 15,
            color: COLORS.body,
            lineHeight: 1.75,
            margin: 0,
            paddingBottom: 24,
            borderBottom: `1px solid ${COLORS.border}`,
            fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
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
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: COLORS.faint,
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          Key Points
        </div>
        {points.length === 0 ? (
          <div style={{ fontSize: 14, color: COLORS.muted, fontStyle: 'italic' }}>No key points identified.</div>
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
                  borderBottom: i === points.length - 1 ? 'none' : `1px solid ${COLORS.border}`,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: COLORS.muted,
                    width: 18,
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 15, color: COLORS.body, lineHeight: 1.7 }}>{p}</span>
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
              borderLeft: `3px solid ${COLORS.gold}`,
              borderRadius: 6,
              fontSize: 14,
              color: '#92400E',
              lineHeight: 1.7,
            }}
          >
            <span style={{ color: COLORS.gold, fontWeight: 600 }}>Needs attention — </span>
            {data.flag}
          </div>
        ) : null}
      </div>

      <EditorialFooter footerText={footerText} />
    </EditorialShell>
  );
}

function MetaBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div
      style={{
        background: COLORS.panelBg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: COLORS.gold,
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: COLORS.title,
          lineHeight: 1.65,
          whiteSpace: 'pre-line',
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}
