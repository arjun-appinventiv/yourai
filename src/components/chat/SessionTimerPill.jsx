import React, { useEffect, useState, useRef } from 'react';
import { Clock, Pause, Play, Square, ChevronDown } from 'lucide-react';
import {
  subscribeTimer, getTimerSnapshot, ensureTickLoop,
  manualPauseTimer, manualResumeTimer, discardTimer,
} from '../../lib/sessionTimer';
import { formatDuration } from '../../lib/aiTimeStore';

/**
 * SessionTimerPill — header pill that mirrors Clio/CosmoLex's
 * top-bar timer. Hidden until a session is active, then shows a live
 * HH:MM:SS readout, status dot, and a small caret menu (Pause/Resume,
 * End session, Discard).
 *
 * Triggering "End session" doesn't write directly — it raises a
 * window event the ChatView listens for to open the BillingDraftModal
 * (which is where the modal already lives, mounted at chat-root level).
 */
export default function SessionTimerPill() {
  const [snap, setSnap] = useState(() => getTimerSnapshot());
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    ensureTickLoop();
    const unsub = subscribeTimer(() => setSnap(getTimerSnapshot()));
    return unsub;
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  if (!snap.hasSession) return null;

  const isPaused = snap.status === 'paused';
  const dotColor = snap.status === 'running' ? '#2A9D6E' : isPaused ? '#E8A33D' : '#8899AB';

  const requestEndSession = () => {
    setMenuOpen(false);
    window.dispatchEvent(new CustomEvent('yourai:end-session'));
  };

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        title={isPaused ? 'Session paused — idle' : 'AI-time meter (click for options)'}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 9px 6px 10px', borderRadius: 9,
          border: `1.5px solid ${menuOpen ? 'var(--navy)' : 'var(--border)'}`,
          background: menuOpen ? 'rgba(15,28,63,0.04)' : '#fff',
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'border-color 120ms, background 120ms',
        }}
      >
        <Clock size={13} style={{ color: 'var(--navy)', flexShrink: 0 }} />
        <span
          style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: dotColor, flexShrink: 0,
            animation: snap.status === 'running' ? 'pulse 1.6s infinite' : 'none',
          }}
        />
        <span style={{
          fontSize: 13, fontWeight: 600, color: 'var(--navy)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          letterSpacing: '-0.01em', minWidth: 56, textAlign: 'left',
        }}>
          {formatDuration(snap.elapsedSeconds)}
        </span>
        <ChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>

      {menuOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 240, backgroundColor: '#fff', borderRadius: 12,
          border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
          zIndex: 220, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px 6px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            AI-time meter
          </div>
          <div style={{ padding: '4px 14px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
            {isPaused ? 'Paused — idle for 2 min. Resume or end this session.' : 'Counting active time in this chat. Auto-pauses after 2 min of no activity.'}
          </div>
          {isPaused ? (
            <MenuRow icon={Play} label="Resume" onClick={() => { manualResumeTimer(); setMenuOpen(false); }} />
          ) : (
            <MenuRow icon={Pause} label="Pause" onClick={() => { manualPauseTimer(); setMenuOpen(false); }} />
          )}
          <MenuRow icon={Square} label="End session & log time" onClick={requestEndSession} accent />
          <MenuRow
            label="Discard without logging"
            onClick={() => {
              if (confirm('Discard this session without logging time? This cannot be undone.')) {
                discardTimer();
                setMenuOpen(false);
              }
            }}
            danger
          />
        </div>
      )}
    </div>
  );
}

function MenuRow({ icon: Icon, label, onClick, accent, danger }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '9px 14px', cursor: 'pointer', fontSize: 13,
        color: danger ? '#C65454' : accent ? 'var(--navy)' : 'var(--text-primary)',
        fontWeight: accent ? 600 : 400,
        borderTop: '1px solid var(--border)',
        transition: 'background 100ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {Icon && <Icon size={14} style={{ flexShrink: 0 }} />}
      <span>{label}</span>
    </div>
  );
}
