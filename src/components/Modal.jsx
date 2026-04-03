import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(15,23,42,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full"
        style={{
          maxWidth: 480,
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          margin: '0 16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '18px' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '16px 0' }} />
        {children}
      </div>
    </div>
  );
}
