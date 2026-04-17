import React from 'react';

/**
 * YourAI Design System — Card
 *
 * Variants:  light (default) | dark | subtle
 * Elevation: 0-5 (maps to --shadow-1 through --shadow-5; 0 = none)
 *
 * Usage:
 *   <Card>Plain content</Card>
 *   <Card variant="dark">Navy card with gold accents</Card>
 *   <Card elevation={2} padding={20}>Medium shadow</Card>
 */
export default function Card({
  children,
  variant = 'light',
  elevation = 1,
  padding = 'var(--space-5)',
  radius = 'var(--radius-md)',
  style = {},
  className = '',
  onClick,
  ...rest
}) {
  const variants = {
    light: {
      background: 'var(--white)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
    },
    dark: {
      background: 'var(--navy)',
      color: 'var(--white)',
      border: '1px solid var(--navy-mid)',
    },
    subtle: {
      background: 'var(--ice-warm)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
    },
  };

  const shadow = elevation === 0 ? 'none' : `var(--shadow-${Math.min(Math.max(elevation, 1), 5)})`;

  const finalStyle = {
    padding,
    borderRadius: radius,
    boxShadow: shadow,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'var(--transition-hover)',
    ...variants[variant],
    ...style,
  };

  return (
    <div onClick={onClick} className={className} style={finalStyle} {...rest}>
      {children}
    </div>
  );
}
