import React from 'react';

/**
 * CardHeader — shared header row for all intent cards.
 *
 *   [INTENT LABEL (mono uppercase tag)]
 *   Title (DM Serif Display, 18 px, navy)
 *   Subtitle (IBM Plex Mono, 10 px, muted)
 *                                              [Source Pill]
 */

export type SourcePillType = 'doc' | 'kb' | 'workspace';

const PILL_STYLES: Record<SourcePillType, { bg: string; color: string; border: string }> = {
  doc:       { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  kb:        { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  workspace: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
};

const MONO_FAMILY = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const SERIF_FAMILY = "'DM Serif Display', Georgia, serif";

interface CardHeaderProps {
  intentLabel: string;
  title: string;
  subtitle: string;
  sourcePill: { label: string; type: SourcePillType };
}

export default function CardHeader({ intentLabel, title, subtitle, sourcePill }: CardHeaderProps) {
  const pill = PILL_STYLES[sourcePill.type];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        padding: '18px 22px 14px',
        borderBottom: '1px solid #E4E7EC',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: MONO_FAMILY,
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#4B5563',
            marginBottom: 10,
          }}
        >
          {intentLabel}
        </div>
        <h3
          style={{
            fontFamily: SERIF_FAMILY,
            fontSize: 18,
            lineHeight: 1.3,
            color: '#0B1D3A',
            margin: 0,
            fontWeight: 400,
          }}
        >
          {title}
        </h3>
        <div
          style={{
            fontFamily: MONO_FAMILY,
            fontSize: 11,
            letterSpacing: '0.04em',
            color: '#4B5563',
            marginTop: 6,
          }}
        >
          {subtitle}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <span
          style={{
            display: 'inline-block',
            fontFamily: MONO_FAMILY,
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '4px 12px',
            borderRadius: 999,
            background: pill.bg,
            color: pill.color,
            border: `1px solid ${pill.border}`,
            whiteSpace: 'nowrap',
          }}
        >
          {sourcePill.label}
        </span>
      </div>
    </div>
  );
}
