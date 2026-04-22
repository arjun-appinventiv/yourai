import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CardShell from './CardShell';
import CardHeader from './CardHeader';
import CardFooter, { type CardFooterSource } from './CardFooter';

const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const SERIF = "'DM Serif Display', Georgia, serif";

export interface ResearchSection {
  title: string;
  content: string;
  citations: string[];
}

export interface ResearchBriefCardData {
  topic: string;
  jurisdiction: string;
  sections: ResearchSection[];
  stats: {
    statutes: string | number;
    cases: string | number;
    principles: string | number;
    jurisdiction: string;
  };
  sourceType: 'kb';
  sourceName: string;
}

export default function ResearchBriefCard({ data }: { data: ResearchBriefCardData }) {
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  // First section open by default.
  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set([0]));
  const toggle = (i: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const stats = data?.stats || { statutes: '—', cases: '—', principles: '—', jurisdiction: '—' };

  return (
    <CardShell accentColor="indigo">
      <CardHeader
        intentLabel="Legal Research"
        title={data?.topic || 'Research brief'}
        subtitle={`Jurisdiction: ${data?.jurisdiction || '—'} · Global Knowledge Base`}
        sourcePill={{ label: 'Knowledge Base', type: 'kb' }}
      />

      {/* Stats bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: '#0B1D3A',
          borderBottom: '1px solid #1E3A5A',
        }}
      >
        <StatCell number={stats.statutes} label="Statutes" />
        <StatCell number={stats.cases} label="Cases" />
        <StatCell number={stats.principles} label="Principles" />
        <StatCell number={stats.jurisdiction} label="Jurisdiction" last />
      </div>

      {/* Collapsible sections */}
      {sections.length === 0 ? (
        <div style={{ padding: '20px 22px', fontSize: 13, color: '#4B5563', fontStyle: 'italic', textAlign: 'center' }}>
          No research sections available.
        </div>
      ) : (
        sections.map((section, i) => {
          const isOpen = openSet.has(i);
          const isLastSection = i === sections.length - 1;
          return (
            <div
              key={i}
              style={{ borderBottom: isLastSection ? 'none' : '1px solid #E4E7EC' }}
            >
              <div
                onClick={() => toggle(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 22px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background-color 100ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#0B1D3A',
                      color: '#C9A84C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: MONO,
                      fontSize: 11,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#0B1D3A',
                      fontWeight: 500,
                    }}
                  >
                    {section.title}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  style={{
                    color: isOpen ? '#0B1D3A' : '#4B5563',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms, color 200ms',
                  }}
                />
              </div>

              {isOpen && (
                <div
                  style={{
                    padding: '0 22px 16px 54px',
                    fontSize: 13,
                    color: '#4B5563',
                    lineHeight: 1.8,
                  }}
                >
                  {/* content as markdown to preserve light formatting */}
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ color: '#0B1D3A', fontWeight: 600 }}>{children}</strong>,
                      em: ({ children }) => <em style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#0B1D3A' }}>{children}</em>,
                    }}
                  >
                    {section.content || ''}
                  </ReactMarkdown>

                  {(section.citations || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {section.citations.map((c, ci) => (
                        <span
                          key={ci}
                          style={{
                            fontFamily: MONO,
                            fontSize: 11,
                            letterSpacing: '0.06em',
                            padding: '3px 10px',
                            borderRadius: 4,
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {isLastSection && (
                    <div
                      style={{
                        marginTop: 12,
                        fontSize: 11,
                        color: '#4B5563',
                        fontStyle: 'italic',
                        fontFamily: MONO,
                        letterSpacing: '0.03em',
                      }}
                    >
                      General legal information — not legal advice. Consult a qualified attorney for guidance specific to your matter.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      <CardFooter sourceType={(data?.sourceType as CardFooterSource) || 'none'} sourceName={data?.sourceName || '—'} />
    </CardShell>
  );
}

function StatCell({ number, label, last }: { number: string | number; label: string; last?: boolean }) {
  return (
    <div
      style={{
        padding: '18px 20px',
        textAlign: 'center',
        borderRight: last ? 'none' : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 24,
          color: '#C9A84C',
          lineHeight: 1,
          marginBottom: 5,
        }}
      >
        {number}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        {label}
      </div>
    </div>
  );
}
