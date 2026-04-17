import React, { useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckSquare,
  ClipboardCheck,
  AlertTriangle,
  Gauge,
  FlaskConical,
  Sparkles,
  Pencil,
  Box,
  LayoutGrid,
  Users,
  Settings,
  FileText,
  Database,
  Shield,
  Zap,
  Globe,
} from 'lucide-react';

/* ── Module icon lookup ── */
const moduleIcons = {
  auth:        Shield,
  dashboard:   LayoutGrid,
  users:       Users,
  settings:    Settings,
  reports:     FileText,
  database:    Database,
  api:         Zap,
  frontend:    Globe,
};

function getModuleIcon(moduleId) {
  if (!moduleId) return Box;
  const key = moduleId.toLowerCase().replace(/[\s_-]/g, '');
  for (const [k, Icon] of Object.entries(moduleIcons)) {
    if (key.includes(k)) return Icon;
  }
  return Box;
}

/* ── Status / priority badge helpers ── */
const statusStyles = {
  Draft:        { bg: '#F0F3F6', color: '#6B7885' },
  'In Progress':{ bg: '#F0F3F6', color: '#1E3A8A' },
  Review:       { bg: '#FBEED5', color: '#E8A33D' },
  Approved:     { bg: '#E7F3E9', color: '#5CA868' },
  Done:         { bg: '#E7F3E9', color: '#5CA868' },
};

const priorityStyles = {
  Critical: { bg: '#F9E7E7', color: '#C65454' },
  High:     { bg: '#FED7AA', color: '#9A3412' },
  Medium:   { bg: '#FBEED5', color: '#E8A33D' },
  Low:      { bg: '#E7F3E9', color: '#5CA868' },
};

function MiniPill({ label, styles }) {
  const s = styles[label] || { bg: '#F0F3F6', color: '#6B7885' };
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 500,
        borderRadius: 20,
        padding: '2px 10px',
        lineHeight: '1.5',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

/* ── NFR pill colour detection ── */
function nfrPillColor(text) {
  const t = (text || '').toLowerCase();
  if (/second|ms|performance|load|latency|response/.test(t)) return { bg: '#F0F3F6', color: '#1E3A8A' };
  if (/secur|encrypt|audit|soc|auth|permission/.test(t))     return { bg: '#E7F3E9', color: '#5CA868' };
  if (/mobile|responsive|viewport|touch/.test(t))            return { bg: '#F3E8FF', color: '#7C3AED' };
  return { bg: '#F0F3F6', color: '#6B7885' };
}

/* ── Section label ── */
function SectionLabel({ icon: Icon, iconColor, children }) {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
      {Icon && <Icon size={16} style={{ color: iconColor || 'var(--text-muted)', flexShrink: 0 }} />}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {children}
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   StoryTemplate  –  read-only slide-over for a single user story
   ════════════════════════════════════════════════════════════════ */
export default function StoryTemplate({ open, onClose, story, onEdit, onPrev, onNext, onExport }) {
  /* keyboard navigation */
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'ArrowLeft'  && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onPrev, onNext, onClose]);

  if (!open || !story) return null;

  const ModIcon = getModuleIcon(story.moduleId);

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50"
      style={{ backgroundColor: 'rgba(15,23,42,0.3)' }}
      onClick={onClose}
    >
      {/* ── Panel ── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 680,
          maxWidth: '100vw',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* ═══════ HEADER ═══════ */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: '#fff',
            borderBottom: '1px solid var(--border)',
            padding: '16px 24px',
          }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* left cluster */}
            <div className="flex items-center gap-3 min-w-0">
              {/* story ID badge */}
              <span
                style={{
                  backgroundColor: 'var(--navy)',
                  color: '#fff',
                  fontFamily: "'DM Mono', 'Fira Code', monospace",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 6,
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {story.storyId || 'US-000'}
              </span>

              {/* title */}
              <h2
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 20,
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.3,
                }}
                className="truncate"
              >
                {story.title}
              </h2>
            </div>

            {/* right cluster */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {story.status && <MiniPill label={story.status} styles={statusStyles} />}
              {story.priority && <MiniPill label={story.priority} styles={priorityStyles} />}

              <button
                onClick={() => onEdit?.(story)}
                style={{
                  backgroundColor: 'var(--navy)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <Pencil size={14} /> Edit Story
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── SUB-HEADER ── */}
          <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 10 }}>
            {/* module chip */}
            {story.moduleName && (
              <span
                className="inline-flex items-center gap-1"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--navy)',
                  backgroundColor: 'var(--ice-warm)',
                  borderRadius: 20,
                  padding: '2px 10px',
                }}
              >
                <ModIcon size={13} />
                {story.moduleName}
              </span>
            )}

            {/* metadata */}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {story.createdBy && <>Created by {story.createdBy}</>}
              {story.createdAt && <> &middot; {story.createdAt}</>}
              {story.updatedAt && <> &middot; Updated {story.updatedAt}</>}
            </span>

            {/* story points */}
            {story.storyPoints != null && (
              <span
                style={{
                  backgroundColor: 'var(--gold)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 20,
                  padding: '1px 9px',
                  whiteSpace: 'nowrap',
                }}
              >
                {story.storyPoints} pts
              </span>
            )}

            {/* AI generated */}
            {story.generatedByAI && (
              <span
                className="inline-flex items-center gap-1"
                style={{
                  backgroundColor: '#F3E8FF',
                  color: '#7C3AED',
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 20,
                  padding: '2px 10px',
                }}
              >
                <Sparkles size={12} /> AI Generated
              </span>
            )}
          </div>

          {/* gold rule */}
          <div style={{ height: 2, backgroundColor: 'var(--gold)', marginTop: 14 }} />
        </div>

        {/* ═══════ SCROLLABLE BODY ═══════ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ── 1. USER STORY STATEMENT ── */}
          {(story.role || story.goal || story.benefit) && (
            <section style={{ marginBottom: 28 }}>
              <SectionLabel>User Story</SectionLabel>
              <p
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                As a{' '}
                <span style={{ color: 'var(--navy)', fontWeight: 700 }}>{story.role || '...'}</span>,
                I want to{' '}
                <span style={{ color: 'var(--navy)', fontWeight: 700 }}>{story.goal || '...'}</span>,
                so that{' '}
                <span style={{ color: 'var(--navy)', fontWeight: 700 }}>{story.benefit || '...'}</span>.
              </p>
            </section>
          )}

          {/* ── 2. PRECONDITIONS ── */}
          {story.preconditions?.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <SectionLabel icon={CheckSquare} iconColor="#6B7885">
                Preconditions
              </SectionLabel>
              <div
                style={{
                  backgroundColor: 'var(--ice-warm)',
                  borderLeft: '3px solid var(--navy)',
                  borderRadius: '0 8px 8px 0',
                  padding: '14px 18px',
                }}
              >
                <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  {story.preconditions.map((item, i) => (
                    <li key={i} className="flex items-start gap-3" style={{ marginBottom: i < story.preconditions.length - 1 ? 8 : 0 }}>
                      <span
                        style={{
                          backgroundColor: 'var(--navy)',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 600,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          {/* ── 3. ACCEPTANCE CRITERIA ── */}
          {story.acceptanceCriteria?.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <SectionLabel icon={ClipboardCheck} iconColor="#5CA868">
                Acceptance Criteria
              </SectionLabel>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 10px' }}>
                Format: Given [context] &middot; When [action] &middot; Then [outcome]
              </p>
              {story.acceptanceCriteria.map((ac, i) => {
                const isObj = typeof ac === 'object' && ac !== null && (ac.given || ac.when || ac.then);
                return (
                  <div
                    key={i}
                    style={{
                      backgroundColor: '#fff',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    {isObj ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {ac.given && (
                          <div className="flex items-start gap-2">
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#1E3A8A', backgroundColor: '#F0F3F6', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>Given</span>
                            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{ac.given}</span>
                          </div>
                        )}
                        {ac.when && (
                          <div className="flex items-start gap-2">
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#E8A33D', backgroundColor: '#FBEED5', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>When</span>
                            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{ac.when}</span>
                          </div>
                        )}
                        {ac.then && (
                          <div className="flex items-start gap-2">
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#5CA868', backgroundColor: '#E7F3E9', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>Then</span>
                            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{ac.then}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <span style={{ color: '#5CA868', marginTop: 1, flexShrink: 0 }}>&#10003;</span>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{typeof ac === 'string' ? ac : JSON.stringify(ac)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* ── 4. ERROR HANDLING ── */}
          {story.errorHandling?.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <SectionLabel icon={AlertTriangle} iconColor="#E8A33D">
                Error Handling
              </SectionLabel>
              {typeof story.errorHandling[0] === 'object' && story.errorHandling[0] !== null && (story.errorHandling[0].scenario || story.errorHandling[0].response) ? (
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {/* table header */}
                  <div className="flex" style={{ backgroundColor: 'var(--ice-warm)', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div style={{ flex: 1, padding: '8px 12px' }}>Scenario</div>
                    <div style={{ flex: 1, padding: '8px 12px' }}>Response</div>
                  </div>
                  {story.errorHandling.map((eh, i) => (
                    <div
                      key={i}
                      className="flex"
                      style={{ backgroundColor: i % 2 === 0 ? '#fff' : 'var(--ice-warm)', fontSize: 13 }}
                    >
                      <div style={{ flex: 1, padding: '8px 12px', color: 'var(--text-primary)' }}>{eh.scenario}</div>
                      <div style={{ flex: 1, padding: '8px 12px', color: 'var(--text-secondary)' }}>{eh.response}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {story.errorHandling.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2"
                      style={{
                        border: '1px solid #FCD34D',
                        borderRadius: 8,
                        padding: '8px 12px',
                        backgroundColor: '#FBEED5',
                      }}
                    >
                      <AlertTriangle size={14} style={{ color: '#E8A33D', marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── 5. NON-FUNCTIONAL REQUIREMENTS ── */}
          {story.nonFunctionalRequirements?.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <SectionLabel icon={Gauge} iconColor="#6B7885">
                Non-Functional Requirements
              </SectionLabel>
              <div className="flex flex-wrap gap-2">
                {story.nonFunctionalRequirements.map((nfr, i) => {
                  const c = nfrPillColor(nfr);
                  return (
                    <span
                      key={i}
                      style={{
                        backgroundColor: c.bg,
                        color: c.color,
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 20,
                        padding: '3px 12px',
                      }}
                    >
                      {nfr}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 6. TEST SCENARIOS ── */}
          {story.testScenarios?.length > 0 && (
            <section style={{ marginBottom: 12 }}>
              <SectionLabel icon={FlaskConical} iconColor="#7C3AED">
                Test Scenarios
              </SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {story.testScenarios.map((ts, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3"
                    style={{
                      backgroundColor: i % 2 === 0 ? '#fff' : 'var(--ice-warm)',
                      padding: '8px 12px',
                      borderRadius: 6,
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: '#F3E8FF',
                        color: '#7C3AED',
                        fontSize: 11,
                        fontWeight: 600,
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{ts}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ═══════ FOOTER ═══════ */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: '#fff',
            borderTop: '1px solid var(--border)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Previous */}
          <div style={{ width: 120 }}>
            {onPrev && (
              <button
                onClick={onPrev}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: "'DM Sans', sans-serif",
                  padding: '6px 10px',
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <ChevronLeft size={16} /> Previous
              </button>
            )}
          </div>

          {/* Export */}
          <button
            onClick={() => onExport?.(story.storyId || story.id)}
            style={{
              backgroundColor: 'var(--ice-warm)',
              color: 'var(--navy)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Download size={14} /> Export This Story
          </button>

          {/* Next */}
          <div style={{ width: 120, display: 'flex', justifyContent: 'flex-end' }}>
            {onNext && (
              <button
                onClick={onNext}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: "'DM Sans', sans-serif",
                  padding: '6px 10px',
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
