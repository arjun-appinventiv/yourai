import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  EditorialShell, EditorialHeader, EditorialFooter,
  Body, ACCENTS, COLORS, MONO, SERIF,
} from './EditorialShell';

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

  // Empty-state: the research pass came back without any topic or sections.
  // Unlike document-analysis cards, this intent doesn't need an upload — it
  // usually means the question was too vague for a research pass.
  const isEmpty = sections.length === 0 && !data?.topic;
  if (isEmpty) {
    return (
      <EditorialShell accentColor={ACCENTS.indigo}>
        <EditorialHeader
          intentLabel="Legal Research"
          title="Not enough to research yet"
          subtitle="The question was too broad for a research brief"
          sourcePill={{ label: 'Knowledge Base', kind: 'kb' }}
        />
        <div style={{ padding: '26px 32px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Body>
            Try a more specific question — include the jurisdiction, the legal issue, and (where useful) the type of party or document. For example: <em>"Force majeure precedents in New York commercial leases, 2020–present"</em>.
          </Body>
          <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
            If you have a document you want research anchored to, attach it with the <strong>+</strong> button and ask again.
          </div>
        </div>
        <EditorialFooter footerText="—" />
      </EditorialShell>
    );
  }

  const footerText = data?.sourceName ? `Source: ${data.sourceName}` : 'Source: YourAI knowledge base';

  return (
    <EditorialShell accentColor={ACCENTS.indigo}>
      <EditorialHeader
        intentLabel="Legal Research"
        title={data?.topic || 'Research brief'}
        subtitle={`Jurisdiction: ${data?.jurisdiction || '—'} · Global Knowledge Base`}
        sourcePill={{ label: 'Knowledge Base', kind: 'kb' }}
      />

      {/* Stats bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: COLORS.title,
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
        <div style={{ padding: '20px 32px', fontSize: 14, color: COLORS.muted, fontStyle: 'italic', textAlign: 'center' }}>
          No research sections available.
        </div>
      ) : (
        sections.map((section, i) => {
          const isOpen = openSet.has(i);
          const isLastSection = i === sections.length - 1;
          return (
            <div
              key={i}
              style={{ borderBottom: isLastSection ? 'none' : `1px solid ${COLORS.border}` }}
            >
              <div
                onClick={() => toggle(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 32px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background-color 100ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.panelBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: COLORS.title,
                      color: COLORS.gold,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: MONO,
                      fontSize: 12,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 11,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: COLORS.title,
                      fontWeight: 600,
                    }}
                  >
                    {section.title}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  style={{
                    color: isOpen ? COLORS.title : COLORS.muted,
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms, color 200ms',
                  }}
                />
              </div>

              {isOpen && (
                <div
                  style={{
                    padding: '0 32px 16px 64px',
                    fontSize: 15,
                    color: COLORS.body,
                    lineHeight: 1.8,
                    fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
                  }}
                >
                  {/* content as markdown to preserve light formatting */}
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ color: COLORS.title, fontWeight: 600 }}>{children}</strong>,
                      em: ({ children }) => <em style={{ fontFamily: SERIF, fontStyle: 'italic', color: COLORS.title }}>{children}</em>,
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
                            fontSize: 12,
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
                        fontSize: 12,
                        color: COLORS.muted,
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

      <EditorialFooter footerText={footerText} />
    </EditorialShell>
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
          color: COLORS.gold,
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
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );
}
