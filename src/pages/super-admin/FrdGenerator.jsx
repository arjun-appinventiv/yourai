import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { FileCode2, Sparkles, Loader, AlertTriangle, Copy, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { getModuleOptions } from '../../lib/superAdminNav';

const PLATFORMS = ['Chat View', 'Super Admin'];

const GENERIC_ERROR_MESSAGE = "Couldn't generate the FRD. Please try again.";

/* ═══════════════════ FRD Generator page ═══════════════════ */
export default function FrdGenerator() {
  const [searchParams] = useSearchParams();
  // Debug mode is an internal switch for operators investigating why
  // generation fails. Enable by adding ?debug=1 to the URL. When on, the
  // error banner shows the underlying OpenAI status and response snippet.
  const debugMode = searchParams.get('debug') === '1';

  const [platform, setPlatform] = useState('');
  const [moduleLabel, setModuleLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState('');
  const [errorDebug, setErrorDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const abortRef = useRef(null);

  const moduleOptions = useMemo(
    () => (platform ? getModuleOptions(platform) : []),
    [platform]
  );

  // Reset the module when the platform changes so stale selections don't persist.
  useEffect(() => {
    setModuleLabel('');
  }, [platform]);

  const canGenerate = Boolean(platform && moduleLabel && !loading);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setError('');
    setErrorDebug(null);
    setShowDebug(false);
    setMarkdown('');
    setLoading(true);

    // Abort any in-flight request before starting a new one.
    try { abortRef.current?.abort(); } catch { /* ignore */ }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const base = import.meta.env.VITE_API_URL || '';
      const endpoint = `${base}/api/frd-generate${debugMode ? '?debug=1' : ''}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(debugMode ? { 'X-Debug': '1' } : {}),
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ platform, module: moduleLabel }),
      });

      if (!response.ok) {
        setError(GENERIC_ERROR_MESSAGE);
        // If debug mode is on and the server returned a JSON error with
        // a `debug` field, surface it to the user.
        if (debugMode) {
          try {
            const errJson = await response.clone().json();
            if (errJson?.debug) setErrorDebug(errJson.debug);
          } catch { /* ignore — non-JSON error body */ }
        }
        setLoading(false);
        return;
      }

      // Stream plain text — works for both serverless (Edge-forwarded SSE
      // parsed server-side) and the Express dev mirror.
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMarkdown(acc);
        }
        if (!acc.trim()) {
          setError(GENERIC_ERROR_MESSAGE);
          setMarkdown('');
        } else {
          emitAuditEntry(platform, moduleLabel);
        }
      } else {
        const text = await response.text();
        if (!text.trim()) {
          setError(GENERIC_ERROR_MESSAGE);
        } else {
          setMarkdown(text);
          emitAuditEntry(platform, moduleLabel);
        }
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        // Silent abort — user navigated away or kicked off another request.
      } else {
        setError(GENERIC_ERROR_MESSAGE);
        if (debugMode) {
          setErrorDebug({ reason: 'client-exception', detail: err?.message || String(err) });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 999, background: 'var(--ice-warm)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
            <Sparkles size={12} style={{ color: 'var(--gold)' }} />
            Internal tool
          </div>
          {debugMode && (
            <div title="Add ?debug=1 to surface verbose error details in the banner" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: '#FBEED5', border: '1px solid #E8A33D', fontSize: 11, color: '#E8A33D', fontWeight: 600 }}>
              <AlertTriangle size={11} /> Debug mode
            </div>
          )}
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: 28, margin: 0 }}>
          FRD Generator
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
          Pick a platform and a module. We'll generate the Features chapter of the FRD in a
          product-manager tone, with full acceptance criteria and test scenarios.
        </p>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, borderRadius: 12, background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-1)' }}>
        <Dropdown
          label="Platform"
          value={platform}
          placeholder="Select a platform…"
          options={PLATFORMS}
          onChange={setPlatform}
          disabled={loading}
        />
        <Dropdown
          label="Module"
          value={moduleLabel}
          placeholder={platform ? 'Select a module…' : 'Pick a platform first'}
          options={moduleOptions}
          onChange={setModuleLabel}
          disabled={!platform || loading}
        />

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            marginTop: 4,
            height: 44,
            borderRadius: 8,
            border: 'none',
            background: canGenerate ? 'var(--navy)' : 'var(--ice)',
            color: canGenerate ? '#fff' : 'var(--text-muted)',
            fontSize: 14,
            fontWeight: 500,
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background-color 150ms',
          }}
        >
          {loading
            ? (<><Loader size={16} className="animate-spin" /> Generating…</>)
            : (<><FileCode2 size={16} /> Generate FRD</>)}
        </button>

        {error && (
          <div
            role="alert"
            style={{ marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#F9E7E7', border: '1px solid #C65454' }}
          >
            <AlertTriangle size={16} style={{ color: '#C65454', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#C65454', fontWeight: 500 }}>{error}</div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate && !loading}
                style={{
                  marginTop: 6,
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: '1px solid #C65454',
                  background: 'white',
                  color: '#C65454',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>

              {/* Debug details — only shown when ?debug=1 AND the server returned a debug payload */}
              {debugMode && errorDebug && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowDebug(v => !v)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid #C65454', background: 'transparent', color: '#C65454', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                  >
                    {showDebug ? (<><ChevronUp size={12} /> Hide technical details</>) : (<><ChevronDown size={12} /> Show technical details</>)}
                  </button>
                  {showDebug && (
                    <pre
                      style={{
                        marginTop: 8,
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: '#2B0E0E',
                        color: '#F9E7E7',
                        fontSize: 11,
                        fontFamily: 'monospace',
                        overflow: 'auto',
                        maxHeight: 240,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {JSON.stringify(errorDebug, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview modal */}
      <FrdPreviewModal
        open={Boolean(markdown) && !error}
        moduleName={moduleLabel}
        markdown={markdown}
        onClose={() => setMarkdown('')}
      />
    </div>
  );
}

/* ──────────── Dropdown (native select, design-tokens styled) ──────────── */
function Dropdown({ label, value, options, placeholder, onChange, disabled }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          height: 40,
          padding: '0 12px',
          borderRadius: 6,
          border: '1px solid var(--border-mid)',
          background: disabled ? 'var(--ice-warm)' : 'white',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'auto',
        }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

/* ──────────── Preview Modal ──────────── */
function FrdPreviewModal({ open, moduleName, markdown, onClose }) {
  const [copied, setCopied] = useState(false);

  // Escape-to-close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Reset "Copied!" flash when the modal opens
  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select + execCommand is an option, but navigator.clipboard
      // is supported in every browser we target. Fail silently.
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(10, 36, 99, 0.35)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 32px rgba(10,36,99,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: 18, margin: 0 }}>
            FRD Preview — {moduleName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="frd-preview-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'var(--navy)', margin: '0 0 14px' }}>{children}</h1>,
              h2: ({ children }) => <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--navy)', margin: '22px 0 10px' }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '18px 0 8px' }}>{children}</h3>,
              p: ({ children }) => <p style={{ margin: '0 0 10px', lineHeight: 1.65 }}>{children}</p>,
              ul: ({ children }) => <ul style={{ margin: '6px 0 12px', paddingLeft: 20 }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ margin: '6px 0 12px', paddingLeft: 20 }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: 4, lineHeight: 1.6 }}>{children}</li>,
              strong: ({ children }) => <strong style={{ fontWeight: 600, color: 'var(--navy)' }}>{children}</strong>,
              blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 14, margin: '10px 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>{children}</blockquote>,
              code: ({ children }) => <code style={{ background: 'var(--ice-warm)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>{children}</code>,
              table: ({ children }) => (
                <div style={{ overflowX: 'auto', margin: '10px 0 14px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead style={{ background: 'var(--ice-warm)' }}>{children}</thead>,
              th: ({ children }) => <th style={{ padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'left', fontWeight: 600, color: 'var(--navy)' }}>{children}</th>,
              td: ({ children }) => <td style={{ padding: '8px 10px', border: '1px solid var(--border)', verticalAlign: 'top' }}>{children}</td>,
              hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border-mid)', background: 'white', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: copied ? '#5CA868' : 'var(--navy)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 110, justifyContent: 'center' }}
          >
            {copied ? (<><Check size={14} /> Copied!</>) : (<><Copy size={14} /> Copy</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────── Audit helper ──────────── */
// Writes a single audit entry via the existing audit registry in localStorage.
// Falls back silently if the helper does not exist in this build.
function emitAuditEntry(platform, moduleLabel) {
  try {
    const raw = localStorage.getItem('yourai_audit_log');
    const log = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(log)) return;
    log.push({
      id: Date.now(),
      operator: (() => {
        try {
          const op = localStorage.getItem('yourai_current_email') || 'Super Admin';
          return op;
        } catch { return 'Super Admin'; }
      })(),
      action: 'frd_generated',
      target: `${platform}/${moduleLabel}`,
      time: new Date().toISOString(),
    });
    localStorage.setItem('yourai_audit_log', JSON.stringify(log));
  } catch {
    // No audit helper available — silently skip per spec.
  }
}
