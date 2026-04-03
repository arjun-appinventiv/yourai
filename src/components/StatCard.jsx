import React from 'react';

export default function StatCard({ icon: Icon, value, label, accentColor }) {
  return (
    <div
      className="bg-white relative"
      style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
      }}
    >
      {Icon && (
        <div className="absolute top-4 right-4">
          <Icon size={16} style={{ color: 'var(--muted)' }} />
        </div>
      )}
      <div
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: '28px',
          fontWeight: 400,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginTop: '4px',
        }}
      >
        {label}
      </div>
    </div>
  );
}
