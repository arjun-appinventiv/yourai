/* ─── RiskMemoCard ───
 *
 * Renders a structured risk memo — findings grouped by severity with
 * location, owner, and recommendation per finding. Pairs with the
 * "risk_assessment" intent.
 */

import React from 'react';
import {
  EditorialShell, EditorialHeader, SectionTitle, CapsLabel,
  DocumentCard, PullQuote, Body, SeverityPill, EditorialFooter,
  COLORS, MONO, SERIF,
} from './EditorialShell';

export interface RiskFinding {
  title: string;              // "Unilateral modification right"
  severity: 'high' | 'medium' | 'low';
  location?: string;          // "§4.1" or "Clause 7.2"
  owner?: string;             // e.g. "Deal team"
  quote?: string;             // Verbatim pull quote from the doc
  recommendation: string;     // What to do about it
}

export interface RiskMemoCardData {
  matterName: string;         // "Meridian Capital NDA v2"
  documentName?: string;      // "Meridian_NDA_v2.pdf"
  documentMeta?: string;      // "23 clauses · 4.2 MB · March 2026"
  pages?: number;
  size?: string;
  uploadedLabel?: string;
  executiveSummary: string;   // First paragraph
  highlightQuote?: {          // Optional pull-quote
    quote: string;
    caption?: string;         // e.g. "Finding #2 · High severity · Owner: Security"
  };
  trailingSummary?: string;   // Closing paragraph after quote
  findings: RiskFinding[];
  sourceName: string;
  generatedLabel?: string;    // "Generated 2 min ago · Ryan"
}

export default function RiskMemoCard({ data }: { data: RiskMemoCardData }) {
  const findings = Array.isArray(data?.findings) ? data.findings : [];
  const highs = findings.filter((f) => f.severity === 'high');
  const meds  = findings.filter((f) => f.severity === 'medium');
  const lows  = findings.filter((f) => f.severity === 'low');

  // Empty-state: schema-forced JSON with no contract supplied.
  // Trigger on the strongest signal — no document AND no findings — even
  // if the LLM hallucinated a generic matterName or executiveSummary
  // (it tends to fabricate "Legal Inquiry" / "general legal inquiry"
  // for trivial prompts like "Hi"). The card without findings or a
  // document is functionally useless; render the upload prompt instead.
  const isEmpty = findings.length === 0 && !data?.documentName?.trim() && !data?.highlightQuote?.trim();
  if (isEmpty) {
    return (
      <EditorialShell>
        <EditorialHeader
          intentLabel="Risk Memo"
          title="No contract supplied"
          subtitle="Risk memo needs a contract or agreement"
          sourcePill={{ label: 'Document', kind: 'doc' }}
        />
        <div style={{ padding: '26px 32px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Body>
            Upload the contract, NDA, lease, or agreement you want assessed using the <strong>+</strong> button next to the input, then ask again and I'll produce the risk memo with findings grouped by severity, locations, owners, and recommendations.
          </Body>
          <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
            For a quicker read, switch the intent pill above the input to <em>Clause Analysis</em> — same input, shorter output.
          </div>
        </div>
        <EditorialFooter footerText={data?.generatedLabel || '—'} />
      </EditorialShell>
    );
  }

  return (
    <EditorialShell>
      <EditorialHeader
        intentLabel="Risk Memo"
        title={data.matterName}
        subtitle={data.documentMeta}
        sourcePill={{ label: 'Document', kind: 'doc' }}
      />

      {/* Documents analysed */}
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

      {/* Executive summary — drop cap on first paragraph */}
      <div style={{ padding: '22px 32px 8px' }}>
        <SectionTitle>Executive summary</SectionTitle>
        <DropCapBody first>{data.executiveSummary}</DropCapBody>

        {data.highlightQuote && (
          <PullQuote quote={data.highlightQuote.quote} caption={data.highlightQuote.caption} />
        )}

        {data.trailingSummary && <Body>{data.trailingSummary}</Body>}
      </div>

      {/* Findings — grouped by severity */}
      <div style={{ padding: '8px 32px 22px' }}>
        <SectionTitle>Findings</SectionTitle>
        {highs.length > 0 && <FindingGroup level="high"   items={highs} />}
        {meds.length  > 0 && <FindingGroup level="medium" items={meds} />}
        {lows.length  > 0 && <FindingGroup level="low"    items={lows} />}
        {findings.length === 0 && (
          <div style={{ fontSize: 14, color: COLORS.muted, fontStyle: 'italic' }}>
            No material risks identified.
          </div>
        )}
      </div>

      <EditorialFooter
        footerText={data.generatedLabel || `Source: ${data.sourceName}`}
      />
    </EditorialShell>
  );
}

function FindingGroup({ level, items }: { level: 'high' | 'medium' | 'low'; items: RiskFinding[] }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <SeverityPill level={level} />
        <span style={{ fontFamily: MONO, fontSize: 11, color: COLORS.muted, letterSpacing: '0.04em' }}>
          {items.length} finding{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((f, i) => (
          <div
            key={i}
            style={{
              padding: '14px 16px',
              border: `1px solid ${COLORS.border}`,
              borderLeft: `3px solid ${level === 'high' ? '#991B1B' : level === 'medium' ? '#92400E' : '#065F46'}`,
              borderRadius: 8,
              background: COLORS.cardBg,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: SERIF, fontSize: 16, color: COLORS.title, lineHeight: 1.3 }}>
                {f.title}
              </span>
              {f.location && (
                <span style={{ fontFamily: MONO, fontSize: 11, color: COLORS.faint }}>
                  {f.location}
                </span>
              )}
              {f.owner && (
                <span style={{ fontFamily: MONO, fontSize: 11, color: COLORS.faint }}>
                  Owner: {f.owner}
                </span>
              )}
            </div>
            {f.quote && (
              <div style={{
                fontFamily: SERIF, fontStyle: 'italic',
                fontSize: 14, lineHeight: 1.55, color: COLORS.title,
                margin: '10px 0 8px', paddingLeft: 12,
                borderLeft: `2px solid ${COLORS.gold}`,
              }}>
                "{f.quote}"
              </div>
            )}
            <div style={{ fontSize: 14, color: COLORS.body, lineHeight: 1.65, marginTop: 6 }}>
              <strong style={{ color: COLORS.title }}>Recommendation:</strong> {f.recommendation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Drop-cap body — first paragraph has the large initial letter */
function DropCapBody({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  if (!first || typeof children !== 'string') {
    return <Body>{children}</Body>;
  }
  const [firstChar, ...rest] = children;
  return (
    <p style={{
      fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif", fontSize: 16,
      color: COLORS.body, lineHeight: 1.75,
      margin: '0 0 12px 0',
    }}>
      <span style={{
        float: 'left',
        fontFamily: SERIF, fontSize: 54,
        color: COLORS.title, lineHeight: 0.9,
        paddingRight: 12, paddingTop: 4, marginBottom: -4,
      }}>
        {firstChar}
      </span>
      {rest.join('')}
    </p>
  );
}
