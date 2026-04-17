import React from 'react';

const presets = {
  Free:         { bg: '#F0F3F6', color: '#6B7885' },
  Professional: { bg: '#F0F3F6', color: '#1E3A8A' },
  Team:         { bg: '#E7F3E9', color: '#5CA868' },
  Enterprise:   { bg: '#FBEED5', color: '#E8A33D' },
  Active:       { bg: '#E7F3E9', color: '#5CA868' },
  Suspended:    { bg: '#F9E7E7', color: '#C65454' },
  Invited:      { bg: '#FBEED5', color: '#E8A33D' },
  Blocked:      { bg: '#F9E7E7', color: '#C65454' },
  PDF:          { bg: '#F9E7E7', color: '#C65454' },
  DOCX:         { bg: '#F0F3F6', color: '#1E3A8A' },
  XLSX:         { bg: '#E7F3E9', color: '#5CA868' },
  TXT:          { bg: '#F3F4F6', color: '#6B7885' },
  Ready:        { bg: '#E7F3E9', color: '#5CA868' },
  Processing:   { bg: '#F0F3F6', color: '#1E3A8A' },
  Failed:       { bg: '#F9E7E7', color: '#C65454' },
  Paid:         { bg: '#E7F3E9', color: '#5CA868' },
  Pending:      { bg: '#FBEED5', color: '#E8A33D' },
  Archived:     { bg: '#F0F3F6', color: '#6B7885' },
  Draft:        { bg: '#F0F3F6', color: '#6B7885' },
  Published:    { bg: '#E7F3E9', color: '#5CA868' },
};

export default function Badge({ children, variant, className = '' }) {
  const style = presets[variant] || presets[children] || { bg: '#F0F3F6', color: '#6B7885' };
  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.color,
        fontSize: '11px',
        fontWeight: 500,
        borderRadius: '20px',
        padding: '2px 10px',
        lineHeight: '1.5',
      }}
    >
      {children}
    </span>
  );
}
