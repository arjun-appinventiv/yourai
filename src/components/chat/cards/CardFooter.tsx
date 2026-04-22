import React from 'react';

/**
 * CardFooter — shared footer row for all intent cards.
 *
 *   Source                                  • {source name}
 *
 * The coloured dot maps to the source tier:
 *   doc  → blue  (#3B82F6)
 *   kb   → green (#10B981)
 *   none → grey  (#9CA3AF) — rendered but muted
 */

export type CardFooterSource = 'doc' | 'kb' | 'none';

const DOT: Record<CardFooterSource, string> = {
  doc: '#3B82F6',
  kb: '#10B981',
  none: '#9CA3AF',
};

const MONO_FAMILY = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

interface CardFooterProps {
  sourceType: CardFooterSource;
  sourceName: string;
}

export default function CardFooter({ sourceType, sourceName }: CardFooterProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#F9FAFB',
        borderTop: '1px solid #E4E7EC',
        padding: '10px 22px',
      }}
    >
      <span
        style={{
          fontFamily: MONO_FAMILY,
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#D1D5DB',
        }}
      >
        Source
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: MONO_FAMILY,
          fontSize: 10,
          letterSpacing: '0.04em',
          color: '#6B7280',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: DOT[sourceType],
            display: 'inline-block',
          }}
        />
        {sourceName}
      </span>
    </div>
  );
}
