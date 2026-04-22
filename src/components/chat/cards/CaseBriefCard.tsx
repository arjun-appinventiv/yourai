import React from 'react';
import CardShell from './CardShell';
import CardHeader from './CardHeader';
import CardFooter, { type CardFooterSource } from './CardFooter';

const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const SERIF = "'DM Serif Display', Georgia, serif";

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

  return (
    <CardShell accentColor="green">
      <CardHeader
        intentLabel="Case Law Analysis"
        title={data?.caseName || 'Untitled case'}
        subtitle={[data?.court, data?.date, data?.subject].filter(Boolean).join(' · ')}
        sourcePill={{ label: 'Document', type: 'doc' }}
      />

      {/* Grid table */}
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
        {rows.length === 0 ? (
          <div style={{ gridColumn: '1 / 3', padding: '24px', fontSize: 13, color: '#4B5563', fontStyle: 'italic', textAlign: 'center' }}>
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
                    borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#4B5563',
                    background: '#F9FAFB',
                    borderRight: '1px solid #E4E7EC',
                    display: 'flex',
                    alignItems: 'flex-start',
                    paddingTop: 18,
                  }}
                >
                  {row.label}
                </div>
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
                    ...(row.isHolding
                      ? { fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: '#0B1D3A', lineHeight: 1.6 }
                      : { fontSize: 13, color: '#374151', lineHeight: 1.75 }),
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
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#4B5563',
                background: '#F9FAFB',
                borderRight: '1px solid #E4E7EC',
                display: 'flex',
                alignItems: 'flex-start',
                paddingTop: 18,
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
                          fontSize: 11,
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
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, marginTop: 8 }}>
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
            padding: '20px 24px',
            background: '#F0F4FF',
            borderTop: '1px solid #DBEAFE',
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#0B1D3A',
              marginBottom: 8,
            }}
          >
            Application to Your Matter
          </div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.75 }}>{data.application}</div>
        </div>
      ) : null}

      <CardFooter sourceType={(data?.sourceType as CardFooterSource) || 'none'} sourceName={data?.sourceName || '—'} />
    </CardShell>
  );
}
