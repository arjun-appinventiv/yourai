import React from 'react';

/**
 * YourAI Design System — Badge
 *
 * Variants: neutral | navy | gold | success | error | warning | info
 * Sizes:    sm | md
 *
 * Usage:
 *   <Badge>New</Badge>
 *   <Badge variant="success" icon={CheckCircle}>Active</Badge>
 *   <Badge variant="error">HIGH</Badge>
 */
export default function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  icon: Icon,
  style = {},
  ...rest
}) {
  const variants = {
    neutral: { bg: 'var(--ice)',         color: 'var(--text-secondary)', border: 'var(--border)' },
    navy:    { bg: 'rgba(10,36,99,0.08)',color: 'var(--navy)',           border: 'rgba(10,36,99,0.2)' },
    gold:    { bg: 'rgba(201,168,76,0.12)', color: 'var(--gold)',        border: 'rgba(201,168,76,0.3)' },
    success: { bg: 'var(--success-soft)',color: 'var(--success)',        border: 'var(--success)' },
    error:   { bg: 'var(--error-soft)',  color: 'var(--error)',          border: 'var(--error)' },
    warning: { bg: 'var(--warning-soft)',color: 'var(--warning)',        border: 'var(--warning)' },
    info:    { bg: 'var(--ice)',         color: 'var(--navy-light)',     border: 'var(--border)' },
  };

  const sizes = {
    sm: { padding: '3px 8px',  fontSize: 10, iconSize: 10 },
    md: { padding: '5px 12px', fontSize: 12, iconSize: 12 },
  };

  const v = variants[variant];
  const s = sizes[size];

  const finalStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: s.padding,
    fontSize: s.fontSize,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.02em',
    color: v.color,
    background: v.bg,
    border: `1px solid ${v.border}`,
    borderRadius: 'var(--radius-pill)',
    whiteSpace: 'nowrap',
    ...style,
  };

  return (
    <span style={finalStyle} {...rest}>
      {Icon && <Icon size={s.iconSize} />}
      {children}
    </span>
  );
}
