import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Clock, FileText, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import {
  loadSettings, roundUpToIncrement, formatDuration, formatBillable,
  addEvent, generateEventId, getActivityCatalog,
} from '../../lib/aiTimeStore';

/**
 * BillingDraftModal — surfaces at end-of-session (handleNewThread,
 * sign-out, or manual "End session"). Clio Manage AI pattern: produce
 * a draft for attorney review; never auto-post.
 *
 * Props
 *   session: { threadId, threadTitle, startedAt, endedAt, durationSeconds }
 *   threadMessages: array of { role, content } so we can auto-summarize
 *   operator: AuthContext operator (attorney identity)
 *   onClose: dismiss the modal
 *   onSaved: callback after save (BillingEvent) — chat can show a toast
 */
export default function BillingDraftModal({ session, threadMessages, operator, onClose, onSaved }) {
  const settings = useMemo(() => loadSettings(), []);
  const catalog = useMemo(() => getActivityCatalog(settings), [settings]);
  const rounded = useMemo(
    () => roundUpToIncrement(session.durationSeconds, settings.rateIncrementMinutes),
    [session.durationSeconds, settings.rateIncrementMinutes],
  );

  const [matterName, setMatterName] = useState('');
  const [clientName, setClientName] = useState('');
  const [activityCode, setActivityCode] = useState(catalog[0]?.code || '');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [billable, setBillable] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [activityOpen, setActivityOpen] = useState(false);
  const activityRef = useRef(null);
  const generatedOnceRef = useRef(false);

  useEffect(() => {
    if (!activityOpen) return;
    const handle = (e) => {
      if (activityRef.current && !activityRef.current.contains(e.target)) setActivityOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [activityOpen]);

  // Auto-summary on mount, exactly once.
  useEffect(() => {
    if (generatedOnceRef.current) return;
    generatedOnceRef.current = true;
    runAutoSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ChatView messages: { id, sender: 'user' | 'bot', content, timestamp }
  const normalizedMessages = useMemo(
    () => (threadMessages || [])
      .filter((m) => m && typeof m.content === 'string' && (m.sender === 'user' || m.sender === 'bot'))
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content })),
    [threadMessages],
  );
  const userMessageCount = normalizedMessages.filter((m) => m.role === 'user').length;

  async function runAutoSummary() {
    setIsGenerating(true);
    setSummaryError('');
    try {
      const fallback = deterministicSummary(normalizedMessages);
      const transcript = normalizedMessages
        .slice(0, 30)
        .map((m) => `${m.role === 'user' ? 'Attorney' : 'AI'}: ${truncate(m.content, 600)}`)
        .join('\n\n');
      const system = `You generate brief, client-billable descriptions of an attorney's work session with an AI legal assistant. Output ONE single sentence, 15-25 words, in past tense, using neutral professional phrasing suitable for a client invoice. Begin with a strong verb (Reviewed, Drafted, Analyzed, Researched, Compared, Summarized, Identified). Do NOT mention "AI", "chatbot", "YourAI", or the assistant — describe the work, not the tool. Do NOT include duration or dates. Do NOT use first person.`;
      const userMsg = transcript
        ? `Transcript:\n\n${transcript}\n\nDescription:`
        : `No transcript available; describe a brief consultative session.`;

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: [],
          system,
          intent: 'general_chat',
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      // Stream the response — but we only need the final text. Drain it.
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      if (reader) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
        }
        acc += decoder.decode();
      } else {
        acc = await resp.text();
      }
      const trimmed = stripQuotes(acc.trim());
      setDescription(trimmed || fallback);
    } catch (e) {
      setSummaryError('Auto-summary unavailable — using a basic draft.');
      setDescription(deterministicSummary(normalizedMessages));
    } finally {
      setIsGenerating(false);
    }
  }

  const canSave = matterName.trim().length > 0 && description.trim().length > 0 && rounded.billableMinutes > 0;

  function save(status) {
    if (!canSave) return;
    const activity = catalog.find((a) => a.code === activityCode) || catalog[0];
    const now = new Date().toISOString();
    const evt = {
      id: generateEventId(),
      attorneyId: operator?.id || 'unknown',
      attorneyName: operator?.name || 'Unknown',
      attorneyEmail: operator?.email,
      orgId: operator?.orgId,
      matterName: matterName.trim(),
      clientName: clientName.trim() || undefined,
      activityCode: activity.code,
      activityLabel: activity.label,
      description: description.trim(),
      billable,
      durationSeconds: session.durationSeconds,
      billableMinutes: rounded.billableMinutes,
      billableHours: rounded.billableHours,
      rateIncrementMinutes: settings.rateIncrementMinutes,
      status,
      threadId: session.threadId,
      threadTitle: session.threadTitle || undefined,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      createdAt: now,
      notes: notes.trim() || undefined,
    };
    addEvent(evt);
    onSaved?.(evt);
    onClose?.();
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 250, backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '92vw', maxWidth: 640, maxHeight: '88vh', background: '#fff',
          borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          zIndex: 251, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: 'var(--navy)', lineHeight: 1.2 }}>
              Log time for this session
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Review the draft, fill in the matter, then save. Nothing posts until you approve it.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Duration band */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={15} style={{ color: 'var(--navy)' }} />
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Active time</div>
              <div style={{ fontSize: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: 'var(--text-primary)', fontWeight: 600 }}>{formatDuration(session.durationSeconds)}</div>
            </div>
          </div>
          <div style={{ height: 30, width: 1, background: 'rgba(10,36,99,0.15)' }} />
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Billable (rounded up to {settings.rateIncrementMinutes} min)
            </div>
            <div style={{ fontSize: 14, color: 'var(--navy)', fontWeight: 700 }}>
              {formatBillable(rounded.billableMinutes)} · {rounded.billableMinutes} min
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, textAlign: 'right' }}>
            {userMessageCount} message{userMessageCount === 1 ? '' : 's'} sent in this thread
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Matter */}
          <FieldRow>
            <Field label="Matter name *" required>
              <input
                value={matterName}
                onChange={(e) => setMatterName(e.target.value)}
                placeholder="e.g. Acme Corp — MSA Renewal"
                autoFocus
                style={inputStyle}
              />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Client">
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corp"
                style={inputStyle}
              />
            </Field>
          </FieldRow>

          {/* Billable Y/N — non-billable for casual / internal sessions */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', marginBottom: 12,
            background: billable ? 'rgba(92,168,104,0.07)' : 'var(--ice-warm)',
            border: `1px solid ${billable ? 'rgba(92,168,104,0.25)' : 'var(--border)'}`,
            borderRadius: 10,
          }}>
            <button
              onClick={() => setBillable(!billable)}
              style={{
                width: 36, height: 20, borderRadius: 10, position: 'relative',
                background: billable ? '#5CA868' : 'var(--border)',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                transition: 'background 200ms',
              }}
              aria-label={billable ? 'Mark as non-billable' : 'Mark as billable'}
            >
              <div style={{
                position: 'absolute', width: 14, height: 14, top: 3,
                left: billable ? 19 : 3,
                background: '#fff', borderRadius: '50%',
                transition: 'left 200ms',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: billable ? '#3D7A4C' : 'var(--text-secondary)' }}>
                {billable ? 'Billable to client' : 'Non-billable (internal / casual)'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, lineHeight: 1.4 }}>
                {billable
                  ? 'This time will appear on the client invoice export.'
                  : 'Tracked for the firm but excluded from billable hour totals — for training, admin, or casual use.'}
              </div>
            </div>
          </div>

          {/* Activity */}
          <FieldRow>
            <Field label={settings.eBillingMode ? 'UTBMS task & activity *' : 'Activity *'}>
              <div ref={activityRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setActivityOpen((v) => !v)}
                  style={{
                    ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', textAlign: 'left', background: '#fff',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {catalog.find((a) => a.code === activityCode)?.label || 'Select an activity'}
                  </span>
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: activityOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                </button>
                {activityOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                    maxHeight: 280, overflowY: 'auto',
                    background: '#fff', border: '1px solid var(--border)',
                    borderRadius: 10, boxShadow: '0 12px 28px rgba(0,0,0,0.12)', zIndex: 30,
                  }}>
                    {catalog.map((a) => {
                      const active = a.code === activityCode;
                      return (
                        <div
                          key={a.code}
                          onClick={() => { setActivityCode(a.code); setActivityOpen(false); }}
                          style={{
                            padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                            background: active ? 'rgba(10,36,99,0.05)' : 'transparent',
                            color: active ? 'var(--navy)' : 'var(--text-primary)',
                            fontWeight: active ? 600 : 400,
                          }}
                          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
                          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {a.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Field>
          </FieldRow>

          {/* Description */}
          <FieldRow>
            <Field
              label="Description *"
              hint={
                isGenerating
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}><Loader2 size={11} className="animate-spin" /> Generating AI summary…</span>
                  : summaryError
                    ? <span style={{ color: '#C65454' }}>{summaryError}</span>
                    : <span style={{ color: 'var(--text-muted)' }}>AI draft — review and edit before saving.</span>
              }
              right={
                <button
                  onClick={runAutoSummary}
                  disabled={isGenerating}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, color: 'var(--navy)', fontWeight: 600,
                    background: 'none', border: 'none', cursor: isGenerating ? 'default' : 'pointer',
                    opacity: isGenerating ? 0.5 : 1,
                  }}
                >
                  <Sparkles size={11} /> Regenerate
                </button>
              }
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isGenerating ? '' : 'Reviewed and analyzed the master services agreement, identified key risk provisions.'}
                rows={3}
                style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical', lineHeight: 1.5 }}
              />
            </Field>
          </FieldRow>

          {/* Notes */}
          <FieldRow>
            <Field label="Internal notes (optional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything not for the client invoice — context, follow-ups…"
                rows={2}
                style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical', lineHeight: 1.5 }}
              />
            </Field>
          </FieldRow>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#FBFAF7' }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '6px 4px' }}
          >
            Discard this session
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => save('draft')}
              disabled={!canSave}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 13,
                border: '1px solid var(--border)', background: '#fff',
                color: canSave ? 'var(--navy)' : 'var(--text-muted)',
                cursor: canSave ? 'pointer' : 'not-allowed', fontWeight: 500,
              }}
            >
              Save as draft
            </button>
            <button
              onClick={() => save('approved')}
              disabled={!canSave}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13,
                border: 'none', background: canSave ? 'var(--navy)' : 'rgba(10,36,99,0.4)',
                color: '#fff', cursor: canSave ? 'pointer' : 'not-allowed', fontWeight: 600,
              }}
            >
              Save & approve
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function FieldRow({ children }) {
  return <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>{React.Children.map(children, (c, i) => <div key={i} style={{ flex: 1 }}>{c}</div>)}</div>;
}

function Field({ label, hint, right, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</label>
        {right}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: 8,
  height: 36, padding: '0 12px', fontSize: 13,
  color: 'var(--text-primary)', width: '100%', outline: 'none',
  fontFamily: 'inherit', background: '#fff',
};

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function stripQuotes(s) {
  if (!s) return s;
  // LLMs sometimes wrap the description in surrounding quotes despite
  // the system prompt; strip them defensively.
  const trimmed = s.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('“') && trimmed.endsWith('”'))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function deterministicSummary(messages) {
  const userMsgs = (messages || []).filter((m) => m.role === 'user' && typeof m.content === 'string');
  if (userMsgs.length === 0) return 'Consultative session with no specific tasks.';
  const first = userMsgs[0].content.trim().split(/[.\n]/)[0];
  return `Reviewed and analyzed material relating to ${truncate(first, 120)}.`;
}
