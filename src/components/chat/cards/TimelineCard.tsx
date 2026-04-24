/* ─── TimelineCard ───
 *
 * Renders a chronological list of events extracted from a document.
 * Very high accuracy when dates are literally in the source text.
 * Pairs with a "timeline" / "chronology" intent.
 */

import React from 'react';
import {
  EditorialShell, EditorialHeader, SectionTitle, CapsLabel,
  DocumentCard, Body, EditorialFooter,
  COLORS, MONO, SERIF,
} from './EditorialShell';

export interface TimelineEvent {
  date: string;                  // "March 14, 2025" — keep whatever format the source used
  label: string;                 // Short title: "Initial disclosure"
  description?: string;          // Optional detail sentence
  source?: string;               // "§3.2" or page reference
  kind?: 'event' | 'deadline' | 'milestone' | 'filing';
}

export interface TimelineCardData {
  matterName: string;            // "Apex v. Meridian — Discovery Timeline"
  documentName?: string;
  documentMeta?: string;
  pages?: number;
  size?: string;
  uploadedLabel?: string;
  events: TimelineEvent[];       // Must be in chronological order
  sourceName: string;
  generatedLabel?: string;
}

const KIND_STYLE: Record<NonNullable<TimelineEvent['kind']>, { dot: string; label: string }> = {
  event:     { dot: '#6B7280', label: 'Event' },
  deadline:  { dot: '#C65454', label: 'Deadline' },
  milestone: { dot: '#C9A84C', label: 'Milestone' },
  filing:    { dot: '#1D4ED8', label: 'Filing' },
};

export default function TimelineCard({ data }: { data: TimelineCardData }) {
  const events = Array.isArray(data?.events) ? data.events : [];

  // Empty-state: schema-forced JSON with no document to timeline.
  const isEmpty = events.length === 0 && !data?.matterName?.trim() && !data?.documentName?.trim();
  if (isEmpty) {
    return (
      <EditorialShell>
        <EditorialHeader
          intentLabel="Timeline"
          title="No document supplied"
          subtitle="Timeline extraction needs a document with dated events"
          sourcePill={{ label: 'Document', kind: 'doc' }}
        />
        <div style={{ padding: '26px 32px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Body>
            Upload the filing, memo, correspondence chain, or agreement you want a chronology from using the <strong>+</strong> button next to the input, then ask again and I'll extract the events in order with date, kind (deadline / milestone / filing / event), and source reference.
          </Body>
          <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
            If the document has no explicit dates, the timeline won't be reliable — try <em>Case Brief</em> or <em>Clause Analysis</em> instead.
          </div>
        </div>
        <EditorialFooter footerText={data?.generatedLabel || '—'} />
      </EditorialShell>
    );
  }

  return (
    <EditorialShell>
      <EditorialHeader
        intentLabel="Timeline"
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

      {/* Timeline */}
      <div style={{ padding: '22px 32px 22px' }}>
        <SectionTitle>Chronology</SectionTitle>
        {events.length === 0 ? (
          <div style={{ fontSize: 14, color: COLORS.muted, fontStyle: 'italic' }}>
            No dated events found in the source.
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 22 }}>
            {/* Vertical rail */}
            <div style={{
              position: 'absolute', left: 7, top: 6, bottom: 6,
              width: 2, background: COLORS.border, borderRadius: 1,
            }} />
            {events.map((ev, i) => {
              const kind = ev.kind || 'event';
              const style = KIND_STYLE[kind];
              return (
                <div key={i} style={{
                  position: 'relative', marginBottom: i === events.length - 1 ? 0 : 22,
                }}>
                  {/* Dot */}
                  <span style={{
                    position: 'absolute', left: -22, top: 4,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#FFFFFF',
                    border: `3px solid ${style.dot}`,
                    boxShadow: '0 0 0 3px #FFFFFF',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{
                      fontFamily: MONO, fontSize: 11,
                      letterSpacing: '0.06em', color: COLORS.title,
                      fontWeight: 600,
                    }}>
                      {ev.date}
                    </span>
                    <span style={{
                      fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: style.dot, fontWeight: 600,
                    }}>
                      {style.label}
                    </span>
                    {ev.source && (
                      <span style={{ fontFamily: MONO, fontSize: 11, color: COLORS.faint }}>
                        {ev.source}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 16, color: COLORS.title, lineHeight: 1.3 }}>
                    {ev.label}
                  </div>
                  {ev.description && (
                    <div style={{ fontSize: 14, color: COLORS.body, lineHeight: 1.65, marginTop: 4 }}>
                      {ev.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EditorialFooter
        footerText={data.generatedLabel || `Source: ${data.sourceName}`}
      />
    </EditorialShell>
  );
}
