import React from 'react';

type Variant =
  | 'running'
  | 'complete'
  | 'failed'
  | 'needs_review'
  | 'demo'
  | 'category'
  | 'source'
  | 'neutral'
  | 'artifact';

export default function StatusBadge({
  label,
  variant = 'neutral',
}: {
  label: string;
  variant?: Variant;
}) {
  const styles = getStyles(variant);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 999,
        border: `1px solid ${styles.border}`,
        background: styles.background,
        color: styles.color,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: variant === 'category' || variant === 'demo' ? '0.02em' : 0,
        whiteSpace: 'nowrap',
      }}
      aria-label={label}
    >
      {label}
    </span>
  );
}

function getStyles(variant: Variant) {
  switch (variant) {
    case 'running':
      return { background: 'rgba(11,29,58,0.06)', border: 'rgba(11,29,58,0.14)', color: 'var(--text-primary)' };
    case 'complete':
      return { background: 'rgba(42,157,110,0.10)', border: 'rgba(42,157,110,0.25)', color: '#206B4D' };
    case 'failed':
      return { background: 'rgba(196,79,79,0.10)', border: 'rgba(196,79,79,0.25)', color: '#A33F3F' };
    case 'needs_review':
      return { background: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.24)', color: '#6D28D9' };
    case 'demo':
      return { background: 'rgba(201,168,76,0.10)', border: 'rgba(201,168,76,0.24)', color: 'var(--brand-gold)' };
    case 'category':
      return { background: 'var(--bg-surface-alt)', border: 'var(--border-default)', color: 'var(--text-primary)' };
    case 'source':
      return { background: 'rgba(11,29,58,0.04)', border: 'var(--border-default)', color: 'var(--text-secondary)' };
    case 'artifact':
      return { background: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.18)', color: 'var(--text-primary)' };
    default:
      return { background: 'var(--bg-surface-alt)', border: 'var(--border-default)', color: 'var(--text-secondary)' };
  }
}
