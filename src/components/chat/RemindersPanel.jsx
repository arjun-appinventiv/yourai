import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bell, Plus, ArrowLeft, Check, Clock, Calendar,
  AlertTriangle, X, ChevronDown, CheckCircle2,
  MoreHorizontal, Trash2, Edit3, RotateCcw, ExternalLink,
  Upload, Sparkles, RefreshCw, ChevronLeft, ChevronRight,
  Cloud, Smartphone,
} from 'lucide-react';
import {
  loadReminders, saveReminders, seedRemindersIfEmpty, addReminders,
  updateReminder, deleteReminder, daysUntil, firedPips, CATEGORY_META,
} from '../../lib/remindersStore';
import ExtractedDeadlinesModal from './ExtractedDeadlinesModal';

// ─── helpers ──────────────────────────────────────────────────────────────

function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDayOfWeek(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function isoFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function daysUntilBadge(n) {
  if (n <= 0) return { label: 'OVERDUE', color: '#DC2626' };
  if (n === 1) return { label: 'TODAY', color: '#DC2626' };
  if (n <= 7) return { label: `${n} days`, color: '#EA580C' };
  if (n <= 30) return { label: `${n} days`, color: '#D97706' };
  return { label: `${n} days`, color: 'var(--text-secondary)' };
}

function categoryLeftBorderColor(category) {
  switch (category) {
    case 'hard_deadline': return '#DC2626';
    case 'sol':           return '#EA580C';
    case 'filing':        return '#2563EB';
    case 'discovery':     return '#7C3AED';
    case 'compliance':    return '#D97706';
    case 'client_meeting':return '#059669';
    default:              return '#6B7280';
  }
}

const CASCADE_PRESETS = {
  standard: { label: 'Standard (30·14·7·1)', cascade: [30, 14, 7, 1] },
  sol:      { label: 'SoL (1yr·6mo·90d…)', cascade: [365, 180, 90, 60, 30, 14, 7, 1] },
};

// ─── sub-components ────────────────────────────────────────────────────────

function PipRow({ cascade, dueDate }) {
  const fired = firedPips(dueDate, cascade);
  const pipLabel = (d) => {
    if (d >= 365) return '1yr';
    if (d >= 180) return '6mo';
    if (d >= 90)  return '90d';
    if (d >= 60)  return '60d';
    return `${d}d`;
  };
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {cascade.map((d, i) => (
        <span
          key={i}
          style={{
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 4,
            lineHeight: '16px',
            background: fired[i] ? '#1e293b' : '#f1f5f9',
            color: fired[i] ? '#fff' : '#94a3b8',
            border: fired[i] ? '1px solid #1e293b' : '1px solid #e2e8f0',
          }}
        >
          {pipLabel(d)}
        </span>
      ))}
    </div>
  );
}

function ReminderCard({ reminder, hoveredId, setHoveredId, onComplete, onDelete }) {
  const meta = CATEGORY_META[reminder.category] || CATEGORY_META.admin;
  const n = daysUntil(reminder.dueDate);
  const badge = daysUntilBadge(n);
  const leftColor = categoryLeftBorderColor(reminder.category);
  const isHovered = hoveredId === reminder.id;

  return (
    <div
      onMouseEnter={() => setHoveredId(reminder.id)}
      onMouseLeave={() => setHoveredId(null)}
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 10,
        borderLeft: `3px solid ${leftColor}`,
        padding: '14px 16px',
        marginBottom: 8,
        position: 'relative',
        transition: 'box-shadow 0.15s',
        boxShadow: isHovered ? '0 2px 10px rgba(10,28,63,0.07)' : 'none',
      }}
    >
      {/* Row 1: category pill + matter chip + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: meta.color,
          background: meta.bg,
          borderRadius: 4,
          padding: '2px 7px',
          lineHeight: '16px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {meta.label}
        </span>
        <span style={{
          fontSize: 11,
          background: '#f3f4f6',
          color: '#374151',
          borderRadius: 99,
          padding: '2px 8px',
          whiteSpace: 'nowrap',
          maxWidth: 140,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {reminder.matter}
        </span>
        {reminder.sourcePage && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
            · p.{reminder.sourcePage}
          </span>
        )}
        {/* date right-aligned */}
        <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            {formatDate(reminder.dueDate)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {formatDayOfWeek(reminder.dueDate)}{reminder.dueTime ? ` · ${reminder.dueTime}` : ''}
          </div>
        </div>
      </div>

      {/* Row 2: title + days badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <div style={{
          fontSize: 14.5,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.35,
          flex: 1,
          minWidth: 0,
        }}>
          {reminder.title}
        </div>
        <span style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: badge.color,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          ← {badge.label}
        </span>
      </div>

      {/* Row 3: notes (1-line clamp) */}
      {reminder.notes && (
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          marginBottom: 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '80%',
        }}>
          {reminder.notes}
        </div>
      )}

      {/* Row 4: cascade pips + owner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <PipRow cascade={reminder.cascade} dueDate={reminder.dueDate} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {reminder.owner}
        </span>
      </div>

      {/* Hover action bar */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid var(--border)',
          borderRadius: '0 0 10px 10px',
          background: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          padding: '4px 12px',
          gap: 4,
        }}>
          <button
            onClick={() => onComplete(reminder.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11.5, fontWeight: 500, color: '#059669',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 8px', borderRadius: 6,
            }}
          >
            <CheckCircle2 size={13} /> Complete
          </button>
          <button
            onClick={() => {/* noop */}}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11.5, fontWeight: 500, color: 'var(--text-secondary)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 8px', borderRadius: 6,
            }}
          >
            <Edit3 size={13} /> Edit
          </button>
          <button
            onClick={() => onDelete(reminder.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11.5, fontWeight: 500, color: '#DC2626',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 8px', borderRadius: 6, marginLeft: 'auto',
            }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, dot, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginTop: 20, marginBottom: 10,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: dot, flexShrink: 0, display: 'inline-block',
      }} />
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
      {count != null && (
        <span style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          opacity: 0.75,
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Mini Calendar ─────────────────────────────────────────────────────────

function MiniCalendar({ reminders, calMonth, setCalMonth }) {
  const today = new Date();
  const todayISO = isoFromDate(today);
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month); // 0=Sun

  // Build a map: ISO date → [category colors]
  const dotMap = useMemo(() => {
    const m = {};
    reminders.filter(r => r.status === 'upcoming').forEach(r => {
      if (!m[r.dueDate]) m[r.dueDate] = [];
      const color = CATEGORY_META[r.category]?.color || '#6B7280';
      if (!m[r.dueDate].includes(color)) m[r.dueDate].push(color);
    });
    return m;
  }, [reminders]);

  const prevMonth = () => {
    const d = new Date(calMonth);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    setCalMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(calMonth);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    setCalMonth(d);
  };

  const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Build grid cells: nulls for empty leading days, then 1-daysInMonth
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--text-secondary)', display: 'flex' }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
          {formatMonthYear(calMonth)}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--text-secondary)', display: 'flex' }}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day names */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9.5, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', paddingBottom: 3 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dots = dotMap[iso] || [];
          const isToday = iso === todayISO;
          return (
            <div key={idx} style={{ textAlign: 'center', position: 'relative', paddingBottom: 4 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                fontSize: 11.5,
                fontWeight: isToday ? 700 : 400,
                background: isToday ? 'var(--navy)' : 'transparent',
                color: isToday ? '#fff' : 'var(--text-primary)',
              }}>
                {day}
              </div>
              {dots.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                  {dots.slice(0, 3).map((c, i) => (
                    <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: c, display: 'inline-block' }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
        {[
          { label: 'SoL', color: '#EA580C' },
          { label: 'Filing', color: '#2563EB' },
          { label: 'Discovery', color: '#7C3AED' },
          { label: 'Deadline', color: '#DC2626' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Full-page Calendar Tab ────────────────────────────────────────────────

function CalendarTab({ reminders }) {
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayISO = isoFromDate(new Date());

  const dotMap = useMemo(() => {
    const m = {};
    reminders.filter(r => r.status === 'upcoming').forEach(r => {
      if (!m[r.dueDate]) m[r.dueDate] = [];
      m[r.dueDate].push(r);
    });
    return m;
  }, [reminders]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => { const d = new Date(viewMonth); d.setDate(1); d.setMonth(d.getMonth() - 1); setViewMonth(d); };
  const nextMonth = () => { const d = new Date(viewMonth); d.setDate(1); d.setMonth(d.getMonth() + 1); setViewMonth(d); };

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={15} color="var(--text-secondary)" />
        </button>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: 'var(--navy)', minWidth: 180, textAlign: 'center' }}>
          {formatMonthYear(viewMonth)}
        </span>
        <button onClick={nextMonth} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={15} color="var(--text-secondary)" />
        </button>
      </div>

      {/* Day names header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--ice-warm)', borderRadius: '8px 8px 0 0', border: '1px solid var(--border)', borderBottom: 'none' }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{
            padding: '8px 0',
            textAlign: 'center',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        {cells.map((day, idx) => {
          const iso = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
          const cellReminders = iso ? (dotMap[iso] || []) : [];
          const isToday = iso === todayISO;
          const isOtherMonth = !day;
          const borderRight = (idx + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none';
          const borderBottom = idx < cells.length - 7 ? '1px solid var(--border)' : 'none';

          return (
            <div
              key={idx}
              style={{
                minHeight: 90,
                padding: '6px 8px',
                background: isOtherMonth ? 'var(--ice-warm)' : '#fff',
                borderRight,
                borderBottom,
                verticalAlign: 'top',
              }}
            >
              {day && (
                <>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    fontSize: 12,
                    fontWeight: isToday ? 700 : 400,
                    background: isToday ? 'var(--navy)' : 'transparent',
                    color: isToday ? '#fff' : 'var(--text-primary)',
                    marginBottom: 4,
                  }}>
                    {day}
                  </div>
                  {cellReminders.slice(0, 3).map(r => {
                    const meta = CATEGORY_META[r.category] || CATEGORY_META.admin;
                    return (
                      <div key={r.id} style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: meta.color,
                        background: meta.bg,
                        borderRadius: 3,
                        padding: '1px 5px',
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: '16px',
                      }}>
                        {r.title}
                      </div>
                    );
                  })}
                  {cellReminders.length > 3 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4 }}>
                      +{cellReminders.length - 3} more
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── New Reminder Modal ────────────────────────────────────────────────────

function NewReminderModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    category: 'hard_deadline',
    matter: '',
    dueDate: '',
    dueTime: '',
    owner: 'Ryan Melade',
    cascadePreset: 'standard',
    notes: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  function handleSave() {
    if (!form.title.trim() || !form.dueDate) return;
    onSave({
      title: form.title.trim(),
      category: form.category,
      matter: form.matter.trim() || 'General',
      dueDate: form.dueDate,
      dueTime: form.dueTime || undefined,
      owner: form.owner.trim() || 'Ryan Melade',
      cascade: CASCADE_PRESETS[form.cascadePreset]?.cascade || [30, 14, 7, 1],
      notes: form.notes.trim() || undefined,
      status: 'upcoming',
    });
    onClose();
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 13.5,
    fontFamily: "'DM Sans', sans-serif",
    color: 'var(--text-primary)',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11.5,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 5,
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,28,63,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1001, padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(10,28,63,0.18)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: 'var(--navy)', margin: 0 }}>
            New Reminder
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>TITLE *</label>
            <input
              style={inputStyle}
              placeholder="e.g. Answer to Complaint due"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          {/* Category + Matter */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>CATEGORY</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.category}
                onChange={e => set('category', e.target.value)}
              >
                {Object.entries(CATEGORY_META).map(([key, m]) => (
                  <option key={key} value={key}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>MATTER</label>
              <input
                style={inputStyle}
                placeholder="e.g. Meridian v. Apex"
                value={form.matter}
                onChange={e => set('matter', e.target.value)}
              />
            </div>
          </div>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>DUE DATE *</label>
              <input
                style={inputStyle}
                type="date"
                value={form.dueDate}
                onChange={e => set('dueDate', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>TIME (OPTIONAL)</label>
              <input
                style={inputStyle}
                placeholder="e.g. 5:00 PM ET"
                value={form.dueTime}
                onChange={e => set('dueTime', e.target.value)}
              />
            </div>
          </div>

          {/* Owner */}
          <div>
            <label style={labelStyle}>OWNER</label>
            <input
              style={inputStyle}
              placeholder="Assigned attorney"
              value={form.owner}
              onChange={e => set('owner', e.target.value)}
            />
          </div>

          {/* Cascade preset */}
          <div>
            <label style={labelStyle}>NOTIFICATION CASCADE</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.cascadePreset}
              onChange={e => set('cascadePreset', e.target.value)}
            >
              {Object.entries(CASCADE_PRESETS).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>NOTES</label>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
              placeholder="Optional context or instructions"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: '#fafafa' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.title.trim() || !form.dueDate}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: (!form.title.trim() || !form.dueDate) ? '#c5cfe8' : 'var(--navy)',
              color: '#fff', fontSize: 13.5, fontWeight: 600,
              cursor: (!form.title.trim() || !form.dueDate) ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Save reminder
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Extract card (right rail) ────────────────────────────────────────────

function ExtractCard({ onOpen }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  function handleFileSelected(file) {
    if (!file) return;
    onOpen(file.name);
  }

  return (
    <div style={{
      background: '#fdf8ee',
      border: '1px solid #e8dfc8',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <Sparkles size={14} color="#C9A84C" />
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 500, color: 'var(--navy)' }}>
          Extract deadlines from a court order
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px', fontFamily: "'DM Sans', sans-serif" }}>
        Drop in any court order, scheduling order, or contract — Your AI reads it and creates reminders with cascade timing.
      </p>

      {/* Hidden file input — triggered by click or drop */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        style={{ display: 'none' }}
        onChange={e => { handleFileSelected(e.target.files?.[0]); e.target.value = ''; }}
      />

      {/* Dashed drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFileSelected(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? '#C9A84C' : '#d4b896'}`,
          borderRadius: 8,
          padding: '14px 12px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragOver ? '#fdf3d6' : 'transparent',
          transition: 'background 0.15s, border-color 0.15s',
          marginBottom: 8,
        }}
      >
        <Upload size={16} color="#b89a60" style={{ marginBottom: 4 }} />
        <div style={{ fontSize: 11.5, color: '#9a7a3c', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
          Drop a document here
        </div>
      </div>
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: '#9a7a3c', textDecoration: 'underline', padding: 0, fontFamily: "'DM Sans', sans-serif" }}
      >
        Or click to select a file
      </button>
    </div>
  );
}

// ─── Calendar Sync card (right rail) ──────────────────────────────────────

function CalendarSyncCard() {
  const [googleConnected] = useState(true);

  // Simple G icon
  const GIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  const connectBtn = (
    <button style={{
      padding: '4px 10px', borderRadius: 6,
      border: '1px solid var(--border)', background: '#fff',
      fontSize: 11.5, fontWeight: 500, color: 'var(--text-primary)',
      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    }}>
      Connect
    </button>
  );

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
        Calendar Sync
      </div>

      {/* Google Calendar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
        <GIcon />
        <span style={{ flex: 1, fontSize: 12.5, fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)' }}>Google Calendar</span>
        {googleConnected ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 99 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
            Connected
          </span>
        ) : connectBtn}
      </div>

      {/* Outlook */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
        <Cloud size={14} color="#0078D4" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12.5, fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)' }}>Outlook 365</span>
        {connectBtn}
      </div>

      {/* iCloud */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Smartphone size={14} color="#555" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12.5, fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)' }}>Apple iCloud</span>
        {connectBtn}
      </div>

      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>
        Two-way sync. Reminders appear in your personal calendar.{' '}
        <span style={{ color: 'var(--text-secondary)' }}>Last sync: 4 minutes ago.</span>
      </p>
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────

export default function RemindersPanel({ onBack }) {
  const [reminders, setReminders] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractDocName, setExtractDocName] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [calMonth, setCalMonth] = useState(() => new Date());

  // Seed + load on mount
  useEffect(() => {
    seedRemindersIfEmpty();
    setReminders(loadReminders());
  }, []);

  const reload = () => setReminders(loadReminders());

  // Derived sets
  const upcoming = useMemo(() => reminders.filter(r => r.status === 'upcoming'), [reminders]);
  const completed = useMemo(() => reminders.filter(r => r.status === 'completed'), [reminders]);

  const critical = useMemo(() => upcoming.filter(r => daysUntil(r.dueDate) <= 7), [upcoming]);
  const next30 = useMemo(() => upcoming.filter(r => { const d = daysUntil(r.dueDate); return d > 7 && d <= 30; }), [upcoming]);
  const beyond30 = useMemo(() => upcoming.filter(r => daysUntil(r.dueDate) > 30), [upcoming]);

  // Sort each group ascending by dueDate
  const sortAsc = arr => [...arr].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const criticalSorted = useMemo(() => sortAsc(critical), [critical]);
  const next30Sorted = useMemo(() => sortAsc(next30), [next30]);
  const beyond30Sorted = useMemo(() => sortAsc(beyond30), [beyond30]);

  // Handlers
  function handleComplete(id) {
    updateReminder(id, { status: 'completed' });
    reload();
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this reminder? This cannot be undone.')) return;
    deleteReminder(id);
    reload();
  }

  function handleNewSave(fields) {
    addReminders([fields]);
    reload();
  }

  function handleExtractSave(items) {
    const toAdd = items.map(item => ({
      title: item.title,
      category: item.category,
      matter: item.matter || 'General',
      dueDate: item.dueDate,
      dueTime: item.dueTime,
      sourcePage: item.page,
      cascade: [30, 14, 7, 1],
      status: 'upcoming',
      owner: 'Ryan Melade',
    }));
    addReminders(toAdd);
    reload();
  }

  // Tab configs
  const TABS = [
    { id: 'upcoming',  label: 'Upcoming', count: upcoming.length },
    { id: 'calendar',  label: 'Calendar', count: null },
    { id: 'completed', label: 'Completed', count: completed.length },
  ];

  // Stat tile data
  const statTiles = [
    { label: 'CRITICAL ≤7 DAYS', value: critical.length },
    { label: 'THIS WEEK',        value: upcoming.filter(r => daysUntil(r.dueDate) <= 7).length },
    { label: 'ACTIVE',           value: upcoming.length },
    { label: 'TOTAL',            value: reminders.length },
  ];

  // Critical banner matter names (deduped)
  const criticalMatters = [...new Set(critical.map(r => r.matter))];

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      background: '#FBFAF7',
      overflow: 'hidden',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        background: '#fff',
        padding: '12px 28px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px', marginLeft: -6, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center',
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <Bell size={17} style={{ color: 'var(--navy)' }} />
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: 'var(--navy)' }}>
          Reminders
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowNewModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--navy)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Plus size={14} />
          New reminder
        </button>
      </div>

      {/* ── Hero ── */}
      <div style={{ padding: '30px 28px 22px', background: '#FBFAF7', flexShrink: 0 }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Bell size={11} />
          REMINDERS
        </div>
        <h1 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: 28,
          fontWeight: 500,
          color: 'var(--navy)',
          margin: '0 0 6px',
          lineHeight: 1.2,
        }}>
          Never miss a deadline
        </h1>
        <p style={{
          margin: 0,
          fontSize: 14,
          color: 'var(--text-secondary)',
          fontFamily: "'DM Sans', sans-serif",
          lineHeight: 1.5,
        }}>
          AI-extracted court deadlines with automatic cascade notifications — 30, 14, 7, and 1 day before each due date.
        </p>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '0 28px 36px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>

            {/* ── LEFT column ── */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Critical banner */}
              {critical.length > 0 && (
                <div style={{
                  background: '#FEF2F2',
                  borderLeft: '4px solid #DC2626',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', fontFamily: "'DM Sans', sans-serif" }}>
                      {critical.length} critical deadline{critical.length !== 1 ? 's' : ''} within 7 days
                    </span>
                    {criticalMatters.length > 0 && (
                      <span style={{ fontSize: 12, color: '#B91C1C', marginLeft: 6, fontFamily: "'DM Sans', sans-serif" }}>
                        — {criticalMatters.slice(0, 3).join(', ')}{criticalMatters.length > 3 ? ` +${criticalMatters.length - 3} more` : ''}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, color: '#DC2626',
                      whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Review now →
                  </button>
                </div>
              )}

              {/* Stat tiles */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                marginBottom: 24,
                boxShadow: '0 1px 4px rgba(10,28,63,0.04)',
              }}>
                {statTiles.map((tile, i) => (
                  <div
                    key={tile.label}
                    style={{
                      padding: '16px 18px',
                      borderRight: i < statTiles.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}>
                      {tile.label}
                    </div>
                    <div style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: 24,
                      fontWeight: 500,
                      color: i === 0 && tile.value > 0 ? '#DC2626' : 'var(--navy)',
                      lineHeight: 1,
                    }}>
                      {tile.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'inline-flex',
                  border: '1px solid #e2e3e7',
                  borderRadius: 9,
                  background: '#fff',
                  padding: 3,
                  gap: 2,
                }}>
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: activeTab === tab.id ? 'var(--gold-bg, #fdf8ee)' : 'transparent',
                        fontWeight: activeTab === tab.id ? 600 : 400,
                        fontSize: 13,
                        color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      {tab.label}
                      {tab.count != null && (
                        <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 400 }}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Upcoming tab ── */}
              {activeTab === 'upcoming' && (
                <div>
                  {upcoming.length === 0 ? (
                    <div style={{ textAlign: 'center', paddingTop: '14vh' }}>
                      <Bell size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        No upcoming reminders
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>
                        Add one manually or extract deadlines from a court order.
                      </p>
                      <button
                        onClick={() => setShowNewModal(true)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '9px 18px', borderRadius: 8, border: 'none',
                          background: 'var(--navy)', color: '#fff',
                          fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        <Plus size={14} /> Add reminder
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* NEXT 7 DAYS · CRITICAL */}
                      {criticalSorted.length > 0 && (
                        <div>
                          <SectionHeader label="NEXT 7 DAYS · CRITICAL" dot="#DC2626" count={criticalSorted.length} />
                          {criticalSorted.map(r => (
                            <ReminderCard
                              key={r.id}
                              reminder={r}
                              hoveredId={hoveredId}
                              setHoveredId={setHoveredId}
                              onComplete={handleComplete}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      )}

                      {/* NEXT 30 DAYS */}
                      {next30Sorted.length > 0 && (
                        <div>
                          <SectionHeader label="NEXT 30 DAYS" dot="#D97706" count={next30Sorted.length} />
                          {next30Sorted.map(r => (
                            <ReminderCard
                              key={r.id}
                              reminder={r}
                              hoveredId={hoveredId}
                              setHoveredId={setHoveredId}
                              onComplete={handleComplete}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      )}

                      {/* BEYOND 30 DAYS */}
                      {beyond30Sorted.length > 0 && (
                        <div>
                          <SectionHeader label="BEYOND 30 DAYS" dot="var(--navy)" count={beyond30Sorted.length} />
                          {beyond30Sorted.map(r => (
                            <ReminderCard
                              key={r.id}
                              reminder={r}
                              hoveredId={hoveredId}
                              setHoveredId={setHoveredId}
                              onComplete={handleComplete}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Calendar tab ── */}
              {activeTab === 'calendar' && (
                <CalendarTab reminders={reminders} />
              )}

              {/* ── Completed tab ── */}
              {activeTab === 'completed' && (
                <div>
                  {completed.length === 0 ? (
                    <div style={{ textAlign: 'center', paddingTop: '8vh', color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
                      <CheckCircle2 size={36} color="var(--text-muted)" style={{ marginBottom: 10 }} />
                      <div>No completed reminders yet.</div>
                    </div>
                  ) : (
                    <div>
                      <SectionHeader label="COMPLETED" dot="#059669" count={completed.length} />
                      {[...completed].sort((a, b) => b.dueDate.localeCompare(a.dueDate)).map(r => {
                        const meta = CATEGORY_META[r.category] || CATEGORY_META.admin;
                        return (
                          <div
                            key={r.id}
                            style={{
                              background: '#fff',
                              border: '1px solid var(--border)',
                              borderRadius: 10,
                              padding: '12px 16px',
                              marginBottom: 8,
                              opacity: 0.65,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}
                          >
                            <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: 'var(--text-secondary)',
                                textDecoration: 'line-through',
                                fontFamily: "'DM Sans', sans-serif",
                              }}>
                                {r.title}
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
                                {r.matter} · was due {formatDate(r.dueDate)}
                              </div>
                            </div>
                            <span style={{
                              fontSize: 10,
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              color: meta.color,
                              background: meta.bg,
                              borderRadius: 4,
                              padding: '2px 7px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}>
                              {meta.label}
                            </span>
                            <button
                              onClick={() => { updateReminder(r.id, { status: 'upcoming' }); reload(); }}
                              title="Restore to upcoming"
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', display: 'flex', padding: 4, flexShrink: 0,
                              }}
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              onClick={() => { deleteReminder(r.id); reload(); }}
                              title="Delete permanently"
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#DC2626', display: 'flex', padding: 4, flexShrink: 0, opacity: 0.6,
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── RIGHT rail ── */}
            <div style={{
              width: 280,
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              paddingTop: 0,
            }}>
              {/* Extract card */}
              <ExtractCard onOpen={(name) => { setExtractDocName(name || 'Uploaded document'); setShowExtractModal(true); }} />

              {/* Mini calendar */}
              <div style={{ marginBottom: 16 }}>
                <MiniCalendar
                  reminders={reminders}
                  calMonth={calMonth}
                  setCalMonth={setCalMonth}
                />
              </div>

              {/* Calendar sync */}
              <CalendarSyncCard />
            </div>

          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showExtractModal && (
        <ExtractedDeadlinesModal
          docName={extractDocName || 'Scheduling Order.pdf'}
          onSave={handleExtractSave}
          onClose={() => setShowExtractModal(false)}
        />
      )}

      {showNewModal && (
        <NewReminderModal
          onClose={() => setShowNewModal(false)}
          onSave={handleNewSave}
        />
      )}
    </div>
  );
}
