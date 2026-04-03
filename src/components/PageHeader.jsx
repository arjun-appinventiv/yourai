import React from 'react';

export default function PageHeader({ icon: Icon, title, subtitle }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-1">
        {Icon && <Icon size={20} style={{ color: 'var(--text-primary)' }} />}
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '22px', color: 'var(--text-primary)', fontWeight: 400 }}>
          {title}
        </h1>
      </div>
      {subtitle && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: Icon ? '30px' : 0 }}>
          {subtitle}
        </p>
      )}
      <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '16px 0 24px' }} />
    </div>
  );
}
