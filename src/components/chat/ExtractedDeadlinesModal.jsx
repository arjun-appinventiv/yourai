import React, { useState } from 'react';
import { X, Check, Minus, Calendar, Sparkles, Plus } from 'lucide-react';

// Inline so default extractedItems can use date math without importing the store.
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const CATEGORY_META = {
  hard_deadline:  { label: 'HARD DEADLINE',          color: '#DC2626', bg: '#FEF2F2' },
  filing:         { label: 'COURT FILING',            color: '#2563EB', bg: '#EFF6FF' },
  discovery:      { label: 'DISCOVERY',               color: '#7C3AED', bg: '#F5F3FF' },
  compliance:     { label: 'COMPLIANCE',              color: '#D97706', bg: '#FFFBEB' },
  sol:            { label: 'STATUTE OF LIMITATIONS',  color: '#EA580C', bg: '#FFF7ED' },
  client_meeting: { label: 'CLIENT MEETING',          color: '#059669', bg: '#ECFDF5' },
  admin:          { label: 'ADMIN',                   color: '#6B7280', bg: '#F9FAFB' },
};

// Default cascade for display in the modal cards.
const DEFAULT_CASCADE = [30, 14, 7, 1];

const DEFAULT_ITEMS = [
  {
    id: 'ext-1',
    title: 'Answer to Complaint due',
    category: 'hard_deadline',
    page: 2,
    dueDate: daysFromNow(11),
    dueTime: '5:00 PM ET',
    matter: 'Smith v. Acme',
  },
  {
    id: 'ext-2',
    title: 'Motion to Dismiss deadline',
    category: 'filing',
    page: 3,
    dueDate: daysFromNow(25),
    dueTime: '5:00 PM ET',
    matter: 'Smith v. Acme',
  },
  {
    id: 'ext-3',
    title: 'Fact discovery cutoff',
    category: 'discovery',
    page: 4,
    dueDate: daysFromNow(95),
    dueTime: '11:59 PM ET',
    matter: 'Smith v. Acme',
  },
  {
    id: 'ext-4',
    title: 'Expert disclosure deadline',
    category: 'discovery',
    page: 4,
    dueDate: daysFromNow(123),
    dueTime: '5:00 PM ET',
    matter: 'Smith v. Acme',
  },
  {
    id: 'ext-5',
    title: 'Dispositive motions due',
    category: 'filing',
    page: 5,
    dueDate: daysFromNow(165),
    dueTime: '5:00 PM ET',
    matter: 'Smith v. Acme',
  },
];

// Items 3 and 4 (ext-3, ext-4) start unselected per Ryan's mockup.
const DEFAULT_SELECTED = new Set(['ext-1', 'ext-2', 'ext-5']);

function formatDate(isoDate) {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDayOfWeek(isoDate) {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

// A single custom checkbox that renders checked / indeterminate / unchecked states.
function Checkbox({ checked, indeterminate, onChange, size = 16 }) {
  const isOn = checked && !indeterminate;
  const boxStyle = {
    width: size,
    height: size,
    borderRadius: 4,
    border: isOn || indeterminate ? 'none' : '1.5px solid #d1d5db',
    background: isOn || indeterminate ? '#0A2463' : '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.12s, border-color 0.12s',
  };
  return (
    <div style={boxStyle} onClick={onChange} role="checkbox" aria-checked={indeterminate ? 'mixed' : checked}>
      {indeterminate && <Minus size={size - 4} color="#fff" strokeWidth={2.5} />}
      {isOn && <Check size={size - 4} color="#fff" strokeWidth={2.5} />}
    </div>
  );
}

function CascadePips({ cascade = DEFAULT_CASCADE }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {cascade.map(days => (
        <span
          key={days}
          style={{
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 500,
            color: '#6b7280',
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: 4,
            padding: '1px 5px',
            lineHeight: '16px',
          }}
        >
          {days}d
        </span>
      ))}
    </div>
  );
}

function DeadlineCard({ item, selected, onToggle }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.admin;
  const isSelected = selected;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 10,
        border: isSelected ? '1px solid #e2e3e7' : '1px solid #f0f0f2',
        background: isSelected ? '#fff' : '#f8f9fa',
        opacity: isSelected ? 1 : 0.55,
        transition: 'opacity 0.15s, background 0.15s, border-color 0.15s',
        cursor: 'pointer',
      }}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div style={{ paddingTop: 1 }}>
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f1c3f', marginBottom: 5, lineHeight: 1.3 }}>
          {item.title}
        </div>

        {/* Category badge + source ref */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: meta.color,
              background: meta.bg,
              borderRadius: 4,
              padding: '2px 6px',
              lineHeight: '16px',
              whiteSpace: 'nowrap',
            }}
          >
            {meta.label}
          </span>
          {item.page && (
            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: "'DM Sans', sans-serif" }}>
              · p. {item.page}
            </span>
          )}
        </div>

        {/* Cascade pips */}
        <CascadePips cascade={DEFAULT_CASCADE} />
      </div>

      {/* Date column */}
      <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f1c3f', whiteSpace: 'nowrap' }}>
          {formatDate(item.dueDate)}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, whiteSpace: 'nowrap' }}>
          {formatDayOfWeek(item.dueDate)}{item.dueTime ? ` · ${item.dueTime}` : ''}
        </div>
      </div>
    </div>
  );
}

export default function ExtractedDeadlinesModal({
  docName = 'Scheduling Order.pdf',
  extractedItems = DEFAULT_ITEMS,
  onSave,
  onClose,
}) {
  const [selected, setSelected] = useState(() => {
    // When using default items, match Ryan's mockup (3 of 5 selected).
    const isDefault = extractedItems === DEFAULT_ITEMS ||
      (extractedItems.length === DEFAULT_ITEMS.length &&
        extractedItems[0]?.id === DEFAULT_ITEMS[0].id);
    if (isDefault) return new Set(DEFAULT_SELECTED);
    // Otherwise select all by default.
    return new Set(extractedItems.map(it => it.id));
  });

  const total = extractedItems.length;
  const selectedCount = selected.size;
  const allSelected = selectedCount === total;
  const noneSelected = selectedCount === 0;
  const isIndeterminate = !allSelected && !noneSelected;

  function toggleItem(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(extractedItems.map(it => it.id)));
    }
  }

  function handleSave() {
    const items = extractedItems.filter(it => selected.has(it.id));
    onSave && onSave(items);
    onClose && onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 28, 63, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 540,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(10,28,63,0.18), 0 4px 16px rgba(10,28,63,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #f0f0f2',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 22,
                fontWeight: 500,
                color: '#0f1c3f',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Review extracted deadlines
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af', fontFamily: "'DM Sans', sans-serif" }}>
              {docName} · {total} found
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: -2,
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Select all row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 24px',
            borderBottom: '1px solid #f0f0f2',
            flexShrink: 0,
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={toggleAll}
          >
            <Checkbox checked={allSelected} indeterminate={isIndeterminate} onChange={toggleAll} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', userSelect: 'none' }}>
              Select all
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: "'DM Sans', sans-serif" }}>
            {selectedCount} of {total} selected
          </span>
        </div>

        {/* Deadline list */}
        <div
          style={{
            overflowY: 'auto',
            padding: '12px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flex: 1,
          }}
        >
          {extractedItems.map(item => (
            <DeadlineCard
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={() => toggleItem(item.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid #f0f0f2',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: '#fafafa',
            gap: 12,
          }}
        >
          {/* Left: sync targets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              Syncs to
            </span>
            {/* Google Calendar pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 9px',
                borderRadius: 20,
                border: '1px solid #e2e3e7',
                background: '#fff',
                fontSize: 12,
                fontWeight: 500,
                color: '#374151',
                whiteSpace: 'nowrap',
              }}
            >
              {/* Google Calendar "G" icon — colored SVG since lucide has no branded icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Calendar
            </div>
            {/* YourAI Calendar pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 9px',
                borderRadius: 20,
                border: '1px solid #e2e3e7',
                background: '#fff',
                fontSize: 12,
                fontWeight: 500,
                color: '#374151',
                whiteSpace: 'nowrap',
              }}
            >
              <Sparkles size={12} color="#D4A017" />
              YourAI Calendar
            </div>
          </div>

          {/* Right: action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* + Add manual ghost button */}
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e2e3e7',
                background: '#fff',
                fontSize: 13,
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onClick={() => {/* manual add handler wired by parent */}}
            >
              <Plus size={13} />
              Add manual
            </button>

            {/* CTA: Add N reminders */}
            <button
              disabled={selectedCount === 0}
              onClick={handleSave}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: selectedCount === 0 ? '#c5cfe8' : '#0A2463',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s',
              }}
            >
              <Calendar size={13} />
              Add {selectedCount} reminder{selectedCount !== 1 ? 's' : ''} to calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
