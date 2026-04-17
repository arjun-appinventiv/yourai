import React from 'react';

/**
 * YourAI Design System — Button
 *
 * Variants:  primary | outline | danger | ghost
 * Sizes:     compact | standard | large | full-width
 *
 * Usage:
 *   <Button>Save</Button>
 *   <Button variant="outline" size="compact">Cancel</Button>
 *   <Button variant="danger" onClick={handleDelete}>Delete</Button>
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'standard',
  disabled = false,
  type = 'button',
  onClick,
  icon: Icon,
  iconPosition = 'left',
  style = {},
  className = '',
  ...rest
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'var(--transition-hover)',
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
  };

  const sizes = {
    compact:      { padding: '6px 12px',  fontSize: 12, height: 32 },
    standard:     { padding: '10px 18px', fontSize: 14, height: 40 },
    large:        { padding: '14px 24px', fontSize: 15, height: 48 },
    'full-width': { padding: '10px 18px', fontSize: 14, height: 40, width: '100%' },
  };

  const variants = {
    primary: {
      background: 'var(--navy)',
      color: 'var(--white)',
      borderColor: 'var(--navy)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--navy)',
      borderColor: 'var(--navy)',
    },
    danger: {
      background: 'var(--error)',
      color: 'var(--white)',
      borderColor: 'var(--error)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      borderColor: 'transparent',
    },
  };

  const disabledStyle = disabled ? {
    background: 'var(--ice)',
    color: 'var(--text-muted)',
    borderColor: 'var(--ice)',
    opacity: 0.7,
  } : {};

  const finalStyle = {
    ...base,
    ...sizes[size],
    ...variants[variant],
    ...disabledStyle,
    ...style,
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={className}
      style={finalStyle}
      {...rest}
    >
      {Icon && iconPosition === 'left' && <Icon size={size === 'compact' ? 12 : 14} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={size === 'compact' ? 12 : 14} />}
    </button>
  );
}
