import React from 'react';

const presets = {
  Free:         { bg: '#F1F5F9', color: '#64748B' },
  Professional: { bg: '#EFF6FF', color: '#1D4ED8' },
  Team:         { bg: '#F0FDF4', color: '#166534' },
  Enterprise:   { bg: '#FEF9C3', color: '#92400E' },
  Active:       { bg: '#DCFCE7', color: '#166534' },
  Suspended:    { bg: '#FEE2E2', color: '#991B1B' },
  Invited:      { bg: '#FEF9C3', color: '#92400E' },
  Blocked:      { bg: '#FEE2E2', color: '#991B1B' },
  PDF:          { bg: '#FEE2E2', color: '#991B1B' },
  DOCX:         { bg: '#DBEAFE', color: '#1D4ED8' },
  XLSX:         { bg: '#DCFCE7', color: '#166534' },
  TXT:          { bg: '#F3F4F6', color: '#374151' },
  Ready:        { bg: '#DCFCE7', color: '#166534' },
  Processing:   { bg: '#EFF6FF', color: '#1D4ED8' },
  Failed:       { bg: '#FEE2E2', color: '#991B1B' },
  Paid:         { bg: '#DCFCE7', color: '#166534' },
  Pending:      { bg: '#FEF3C7', color: '#92400E' },
  Archived:     { bg: '#F1F5F9', color: '#64748B' },
  Draft:        { bg: '#F1F5F9', color: '#64748B' },
  Published:    { bg: '#DCFCE7', color: '#166534' },
};

export default function Badge({ children, variant, className = '' }) {
  const style = presets[variant] || presets[children] || { bg: '#F1F5F9', color: '#64748B' };
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
