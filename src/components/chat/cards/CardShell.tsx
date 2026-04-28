import React from 'react';

/**
 * CardShell — shared container for every intent response card.
 * Renders a bordered white rounded card with a thin coloured accent
 * stripe across the top. Accent maps to the intent family:
 *   gold   → Summary (document_summarisation)
 *   navy   → Comparison (clause_comparison)
 *   green  → Case Brief (case_law_analysis)
 *   indigo → Research Brief (legal_research)
 *   teal   → File Results (find_document)
 */

export type CardAccent = 'gold' | 'navy' | 'green' | 'indigo' | 'teal';

const ACCENT_GRADIENT: Record<CardAccent, string> = {
  gold:   'linear-gradient(to right, #C9A84C, #E8C96A)',
  navy:   'linear-gradient(to right, #0B1D3A, #1E3A8A)',
  green:  'linear-gradient(to right, #059669, #10B981)',
  indigo: 'linear-gradient(to right, #4338CA, #6366F1)',
  teal:   'linear-gradient(to right, #0D9488, #14B8A6)',
};

interface CardShellProps {
  accentColor: CardAccent;
  children: React.ReactNode;
}

export default function CardShell({ accentColor, children }: CardShellProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E4E7EC',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ height: 3, background: ACCENT_GRADIENT[accentColor] }} />
      {children}
    </div>
  );
}
