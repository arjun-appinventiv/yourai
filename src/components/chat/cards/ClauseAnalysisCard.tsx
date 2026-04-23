/* ─── ClauseAnalysisCard ───
 *
 * Renders a structured clause-by-clause breakdown of a document.
 * Each clause gets a location, risk level, short interpretation,
 * and (optional) recommendation. Pairs with a "clause analysis"
 * intent (a subset of contract_review).
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  EditorialShell, EditorialHeader, SectionTitle, CapsLabel,
  DocumentCard, Body, SeverityPill, EditorialFooter,
  COLORS, MONO, SERIF,
} from './EditorialShell';

export interface Clause {
  title: string;           // "Non-compete"
  location: string;        // "§7.2" / "Clause 4.1"
  risk: 'high' | 'medium' | 'low';
  quote?: string;          // Verbatim from the document
  interpretation: string;  // Plain-English explanation
  recommendation?: string; // Optional negotiating move
}

export interface ClauseAnalysisCardData {
  matterName: string;
  documentName?: string;
  documentMeta?: string;
  pages?: number;
  size?: string;
  uploadedLabel?: string;
  clauses: Clause[];
  sourceName: string;
  generatedLabel?: string;
}

export default function ClauseAnalysisCard({ data }: { data: ClauseAnalysisCardData }) {
  // Severity counts for the summary strip
  const counts = {
    high:   data.clauses.filter((c) => c.risk === 'high').length,
    medium: data.clauses.filter((c) => c.risk === 'medium').length,
    low:    data.clauses.filter((c) => c.risk === 'low').length,
  };

  // First high-risk clause auto-expanded
  const firstHighIdx = data.clauses.findIndex((c) => c.risk === 'high');
  const [expanded, setExpanded] = useState<Set<number>>(() =>
    new Set(firstHighIdx === -1 ? [0] : [firstHighIdx])
  );
  const toggle = (i: number) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  return (
    <EditorialShell>
      <EditorialHeader
        intentLabel="Clause Analysis"
        title={data.matterName}
        subtitle={data.documentMeta}
        sourcePill={{ label: 'Document', kind: 'doc' }}
      />

      {data.documentName && (
        <div style={{ padding: '22px 32px 8px' }}>
          <CapsLabel>Documents analysed</CapsLabel>
          <DocumentCard
            name={data.documentName}
            pages={data.pages ?? null}
            size={data.size ?? null}
            uploadedLabel={data.uploadedLabel || 'Uploaded today'}
          />
        </div>
      )}

      {/* Summary strip — severity counts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1,
        background: COLORS.border,
        margin: '22px 32px 0', borderRadius: 10, overflow: 'hidden',
      }}>
        <CountCell value={data.clauses.length} label="Clauses" />
        <CountCell value={counts.high}   label="High risk" color="#991B1B" />
        <CountCell value={counts.medium} label="Medium"    color="#92400E" />
        <CountCell value={counts.low}    label="Low"       color="#065F46" />
      </div>

      {/* Clauses list */}
      <div style={{ padding: '24px 32px 22px' }}>
        <SectionTitle>Clause-by-clause</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.clauses.map((c, i) => {
            const isOpen = expanded.has(i);
            return (
              <div key={i} style={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                background: COLORS.cardBg,
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => toggle(i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {isOpen
                    ? <ChevronDown size={14} style={{ color: COLORS.muted, flexShrink: 0 }} />
                    : <ChevronRight size={14} style={{ color: COLORS.muted, flexShrink: 0 }} />
                  }
                  <span style={{ fontFamily: SERIF, fontSize: 16, color: COLORS.title, flex: 1, lineHeight: 1.3, minWidth: 0 }}>
                    {c.title}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: COLORS.faint, flexShrink: 0 }}>
                    {c.location}
                  </span>
                  <SeverityPill level={c.risk} />
                </button>
                {isOpen && (
                  <div style={{ padding: '4px 16px 16px 42px' }}>
                    {c.quote && (
                      <div style={{
                        fontFamily: SERIF, fontStyle: 'italic',
                        fontSize: 14, lineHeight: 1.55, color: COLORS.title,
                        margin: '8px 0 12px', paddingLeft: 12,
                        borderLeft: `2px solid ${COLORS.gold}`,
                      }}>
                        "{c.quote}"
                      </div>
                    )}
                    <Body>{c.interpretation}</Body>
                    {c.recommendation && (
                      <div style={{
                        fontSize: 14, color: COLORS.body, lineHeight: 1.65, marginTop: 6,
                        padding: '10px 12px', background: 'rgba(201,168,76,0.06)',
                        borderLeft: `3px solid ${COLORS.gold}`, borderRadius: 4,
                      }}>
                        <strong style={{ color: COLORS.title }}>Recommendation:</strong> {c.recommendation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <EditorialFooter
        footerText={data.generatedLabel || `Source: ${data.sourceName}`}
      />
    </EditorialShell>
  );
}

function CountCell({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div style={{
      padding: '14px 16px', textAlign: 'center',
      background: COLORS.cardBg,
    }}>
      <div style={{ fontFamily: SERIF, fontSize: 24, color: color || COLORS.title, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: COLORS.faint, marginTop: 4,
      }}>
        {label}
      </div>
    </div>
  );
}
