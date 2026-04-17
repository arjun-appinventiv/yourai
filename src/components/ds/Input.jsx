import React, { forwardRef } from 'react';

/**
 * YourAI Design System — Input
 *
 * States: default | filled | focus (auto) | error | disabled
 *
 * Usage:
 *   <Input label="Email" placeholder="you@firm.com" />
 *   <Input label="Email" error="Please enter a valid email" value={...} />
 */
const Input = forwardRef(function Input({
  label,
  error,
  hint,
  required = false,
  disabled = false,
  type = 'text',
  style = {},
  containerStyle = {},
  className = '',
  ...rest
}, ref) {
  const hasError = Boolean(error);

  const inputStyle = {
    width: '100%',
    height: 46,
    padding: '0 14px',
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
    background: disabled ? 'var(--ice-warm)' : 'var(--white)',
    border: `1px solid ${hasError ? 'var(--error)' : 'var(--border-mid)'}`,
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    transition: 'var(--transition-fast)',
    cursor: disabled ? 'not-allowed' : 'text',
    ...style,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          {label}
          {required && <span style={{ color: 'var(--error)', marginLeft: 4 }}>*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        className={className}
        style={inputStyle}
        {...rest}
      />
      {hasError && (
        <span style={{ fontSize: 12, color: 'var(--error)' }}>{error}</span>
      )}
      {!hasError && hint && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</span>
      )}
    </div>
  );
});

export default Input;
