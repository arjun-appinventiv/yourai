import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

export default function InfoButton({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full transition-colors"
        style={{ width: 20, height: 20, backgroundColor: 'var(--ice-warm)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0 }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F0F3F6'; e.currentTarget.style.color = '#1E3A8A'; e.currentTarget.style.borderColor = '#D6DDE4'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        title="More info"
      >
        <Info size={12} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,23,42,0.4)' }} onClick={() => setOpen(false)}>
          <div
            className="bg-white overflow-hidden"
            style={{ width: '90%', maxWidth: 560, maxHeight: '80vh', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', backgroundColor: '#F0F3F6' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F0F3F6' }}>
                  <Info size={16} style={{ color: '#1E3A8A' }} />
                </div>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)' }}>{title}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            {/* Body */}
            <div className="overflow-y-auto" style={{ padding: '20px 24px', maxHeight: 'calc(80vh - 70px)' }}>
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Reusable styled elements for info content */
export function InfoSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</h4>
      {children}
    </div>
  );
}

export function InfoText({ children }) {
  return <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: 8 }}>{children}</p>;
}

export function InfoExample({ label, children }) {
  return (
    <div style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', marginBottom: 8 }}>
      {label && <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>}
      <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: label ? 4 : 0, lineHeight: '1.6' }}>{children}</div>
    </div>
  );
}

export function InfoList({ items }) {
  return (
    <ul style={{ margin: '8px 0', paddingLeft: 0, listStyle: 'none' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.7', paddingLeft: 16, position: 'relative', marginBottom: 4 }}>
          <span style={{ position: 'absolute', left: 0, color: 'var(--gold)' }}>•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}
