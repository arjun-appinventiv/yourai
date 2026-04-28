import React from 'react';
import {
  EditorialShell, EditorialHeader, EditorialFooter,
  Body, ACCENTS, COLORS, MONO, SERIF,
} from './EditorialShell';

export interface CaseBriefRow {
  label: string;
  value: string;
  isHolding?: boolean;
}

export interface CaseBriefCardData {
  caseName: string;
  court: string;
  date: string;
  subject: string;
  rows: CaseBriefRow[];
  precedence: {
    tags: string[];
    tagStyles: Array<'blue' | 'grey'>;
    note: string;
  };
  application: string;
  sourceType: 'doc';
  sourceName: string;
}

const TAG_STYLE: Record<'blue' | 'grey', { bg: string; color: string; border: string }> = {
  blue: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  grey: { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' },
};

export default function CaseBriefCard({ data }: { data: CaseBriefCardData }) {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const precedence = data?.precedence || { tags: [], tagStyles: [], note: '' };
  const hasPrecedence = (precedence.tags?.length || 0) > 0 || !!precedence.note;

  // Empty-state: schema-forced JSON with no real data (no case document supplied).
  const isEmpty = rows.length === 0 && !hasPrecedence && !data?.caseName && !data?.application;
  if (isEmpty) {
    return (
      <EditorialShell accentColor={ACCENTS.green}>
        <EditorialHeader
          intentLabel="Case Law Analysis"
          title="No case document supplied"
          subtitle="Case analysis needs a filing, opinion, or memo"
          sourcePill={{ label: 'Document', kind: 'doc' }}
        />
        <div style={{ padding: '26px 32px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Body>
            Upload a court filing, opinion PDF, or case memo using the <strong>+</strong> button next to the input, then ask again and I'll brief the case with holding, facts, procedural posture, and application to your matter.
          </Body>
          <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
            Looking up a case by name or citation without uploading? Switch the intent pill to <em>Legal Research</em>.
          </div>
        </div>
        <EditorialFooter footerText="—" />
      </EditorialShell>
    );
  }

  const footerText = data?.sourceName ? `Document: ${data.sourceName}` : '—';

  return (
    <EditorialShell accentColor={ACCENTS.green}>
      <EditorialHeader
        intentLabel="Case Law Analysis"
        title={data?.caseName || 'Untitled case'}
        subtitle={[data?.court, data?.date, data?.subject].filter(Boolean).join(' · ')}
        sourcePill={{ label: 'Document', kind: 'doc' }}
      />

      {/* Grid table */}
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
        {rows.length === 0 ? (
          <div style={{ gridColumn: '1 / 3', padding: '24px', fontSize: 14, color: COLORS.muted, fontStyle: 'italic', textAlign: 'center' }}>
            No case details available.
          </div>
        ) : (
          rows.map((row, i) => {
            const isLast = i === rows.length - 1 && !hasPrecedence;
            return (
              <React.Fragment key={i}>
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: COLORS.faint,
                    background: COLORS.panelBg,
                    borderRight: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    paddingTop: 18,
                    fontWeight: 500,
                  }}
                >
                  {row.label}
                </div>
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
                    ...(row.isHolding
                      ? { fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: COLORS.title, lineHeight: 1.6 }
                      : { fontSize: 15, color: COLORS.body, lineHeight: 1.75 }),
                  }}
                >
                  {row.value}
                </div>
              </React.Fragment>
            );
          })
        )}

        {hasPrecedence && (
          <React.Fragment>
            <div
              style={{
                padding: '16px 20px',
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: COLORS.faint,
                background: COLORS.panelBg,
                borderRight: `1px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'flex-start',
                paddingTop: 18,
                fontWeight: 500,
              }}
            >
              Precedence
            </div>
            <div style={{ padding: '16px 20px' }}>
              {(precedence.tags || []).length > 0 && (
                <div style={{ marginBottom: precedence.note ? 8 : 0 }}>
                  {(precedence.tags || []).map((tag, i) => {
                    const variant = precedence.tagStyles?.[i] || 'grey';
                    const style = TAG_STYLE[variant];
                    return (
                      <span
                        key={i}
                        style={{
                          display: 'inline-block',
                          fontFamily: MONO,
                          fontSize: 12,
                          letterSpacing: '0.08em',
                          padding: '3px 10px',
                          borderRadius: 4,
                          marginRight: 6,
                          marginBottom: 5,
                          background: style.bg,
                          color: style.color,
                          border: `1px solid ${style.border}`,
                        }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
              )}
              {precedence.note && (
                <div style={{ fontSize: 14, color: COLORS.body, lineHeight: 1.6, marginTop: 8 }}>
                  {precedence.note}
                </div>
              )}
            </div>
          </React.Fragment>
        )}
      </div>

      {/* Application panel */}
      {data?.application ? (
        <div
          style={{
            padding: '20px 32px',
            background: '#F0F4FF',
            borderTop: '1px solid #DBEAFE',
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: COLORS.title,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Application to Your Matter
          </div>
          <div style={{ fontSize: 15, color: COLORS.body, lineHeight: 1.75 }}>{data.application}</div>
        </div>
      ) : null}

      <EditorialFooter footerText={footerText} />
    </EditorialShell>
  );
}
