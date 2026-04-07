import React, { useState, useEffect, useRef } from 'react';
import { Pencil, MoreHorizontal, CheckCircle2, AlertTriangle, Eye, Copy, Trash2 } from 'lucide-react';

const PRIORITY_STYLES = {
  'Must Have':   { bg: '#FEE2E2', color: '#991B1B' },
  'Should Have': { bg: '#FEF9C3', color: '#92400E' },
  'Could Have':  { bg: '#DCFCE7', color: '#166534' },
  'Won\'t Have': { bg: '#F1F5F9', color: '#64748B' },
};

function Badge({ label, bg, color, style }) {
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', backgroundColor: bg, color, whiteSpace: 'nowrap', ...style }}>
      {label}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
      {children}
    </div>
  );
}

export default function StoryCard({ story, onEdit, onView, onDuplicate, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const priority = PRIORITY_STYLES[story.priority] || PRIORITY_STYLES['Could Have'];
  const ac = story.acceptanceCriteria || [];
  const errors = story.errorHandling || [];
  const preconditions = story.preconditions || [];

  return (
    <div
      onClick={(e) => { if (!e.defaultPrevented) onView?.(story); }}
      style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px',
        cursor: 'pointer', transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--navy)', fontWeight: 600, background: 'var(--ice-warm)', padding: '2px 6px', borderRadius: '4px' }}>
          {story.id || 'US-000'}
        </span>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {story.title}
        </span>
        <Badge label={story.priority} bg={priority.bg} color={priority.color} />
      </div>

      {/* User story sentence */}
      {story.role && story.goal && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          As a <strong>{story.role}</strong>, I want to <strong>{story.goal}</strong>{story.benefit ? ` so that ${story.benefit}` : '...'}
        </p>
      )}

      {/* Preconditions */}
      {preconditions.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <SectionLabel>Preconditions</SectionLabel>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {preconditions.slice(0, 2).map((p, i) => <li key={i} style={{ marginBottom: '2px' }}>{p}</li>)}
          </ul>
        </div>
      )}

      {/* Acceptance Criteria */}
      {ac.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <SectionLabel>Acceptance Criteria</SectionLabel>
          {ac.slice(0, 2).map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              <CheckCircle2 size={13} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
              <span>{typeof c === 'string' ? c : c.text || c.criteria}</span>
            </div>
          ))}
          {ac.length > 2 && (
            <span style={{ fontSize: '11px', color: 'var(--gold)', cursor: 'pointer', marginLeft: '19px' }}>+ {ac.length - 2} more</span>
          )}
        </div>
      )}

      {/* Error Handling */}
      {errors.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <SectionLabel>Error Handling</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
            <span>{typeof errors[0] === 'string' ? errors[0] : errors[0].text || errors[0].scenario}</span>
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0' }} />

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {story.status && <Badge label={story.status} bg="var(--ice-warm)" color="var(--navy)" />}
        {story.points != null && (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: '#F3F4F6', color: '#374151' }}>
            {story.points} pts
          </span>
        )}
        {story.generatedByAI && <Badge label="AI Generated" bg="#F3E8FF" color="#7C3AED" />}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Edit button */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(story); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ice-warm)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            <Pencil size={13} /> Edit
          </button>

          {/* More dropdown */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ice-warm)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, bottom: '110%', background: '#fff', border: '1px solid var(--border)', borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 20, minWidth: '160px', padding: '4px 0',
              }}>
                {[
                  { label: 'View Full Story', icon: Eye, action: () => onView?.(story) },
                  { label: 'Duplicate', icon: Copy, action: () => onDuplicate?.(story) },
                  { label: 'Delete', icon: Trash2, action: () => onDelete?.(story), color: '#DC2626' },
                ].map(({ label, icon: Icon, action, color }) => (
                  <button key={label} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); action(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: color || 'var(--text-primary)', textAlign: 'left' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
