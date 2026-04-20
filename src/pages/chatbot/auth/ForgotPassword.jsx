import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader, CheckCircle } from 'lucide-react';
import ChatAuthLayout from '../../../components/ChatAuthLayout';
import { forgotPassword as forgotPasswordApi } from '../../../lib/auth';

/**
 * Chat-View Forgot Password screen.
 *
 * Flow:
 *   Email step → "If this email is registered, we'll send a reset link"
 *   Success step → confirmation with a back-to-sign-in link.
 *
 * We NEVER reveal whether the email is registered — standard practice to
 * avoid account enumeration. Backend call is best-effort; if the backend
 * isn't reachable, the user still sees the generic success screen.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEmailValid || loading) return;
    setLoading(true);
    try {
      // Best-effort — we ignore the result so we never leak whether the
      // email is registered. Errors are swallowed for the same reason.
      await forgotPasswordApi(email.trim()).catch(() => ({ success: true }));
    } catch { /* ignore */ }
    // Minimum 600 ms so the user sees a clear "working" state even on a
    // blazing-fast no-op backend response.
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSent(true);
  };

  const inputStyle = {
    width: '100%', height: 44, border: '1px solid var(--border-mid)',
    borderRadius: 10, padding: '0 14px 0 42px', fontSize: 13,
    color: 'var(--text-primary)', outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <ChatAuthLayout>
      {!sent ? (
        <>
          <Link
            to="/chat/login"
            className="inline-flex items-center gap-1 mb-6"
            style={{ fontSize: '12px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>

          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={24} style={{ color: 'var(--navy)' }} />
              </div>
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'var(--text-primary)', margin: 0 }}>
              Forgot your password?
            </h1>
            <p className="mt-2 mx-auto" style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.6 }}>
              Enter the email associated with your YourAI account and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                Work email
              </label>
              <div className="relative">
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourfirm.com"
                  autoFocus
                  required
                  style={inputStyle}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!isEmailValid || loading}
              className="w-full flex items-center justify-center gap-2 text-white"
              style={{
                backgroundColor: (!isEmailValid || loading) ? '#9CA3AF' : 'var(--navy)',
                height: 44,
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                cursor: (!isEmailValid || loading) ? 'not-allowed' : 'pointer',
                transition: 'background-color 150ms',
              }}
            >
              {loading ? (<><Loader size={16} className="animate-spin" /> Sending…</>) : 'Send reset link'}
            </button>
          </form>

          <p className="mt-5 text-center" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Remembered it? <Link to="/chat/login" style={{ color: 'var(--navy)', fontWeight: 500 }}>Sign in</Link>
          </p>
        </>
      ) : (
        <>
          <div className="text-center">
            <div className="flex justify-center mb-5">
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E7F3E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={30} color="#5CA868" />
              </div>
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--text-primary)', margin: 0 }}>
              Check your inbox
            </h1>
            <p className="mt-3 mx-auto" style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>, we've sent a reset link to it. The link is valid for the next 30 minutes.
            </p>
            <div className="mt-5 p-4 text-left mx-auto" style={{ background: 'var(--ice-warm)', border: '1px solid var(--border)', borderRadius: 10, maxWidth: 360 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>Didn't get the email?</p>
              <ul style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 16, margin: 0, lineHeight: 1.7 }}>
                <li>Check your spam or junk folder.</li>
                <li>Make sure you entered the right address.</li>
                <li>Wait a minute — email can take a moment to arrive.</li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-2 items-center">
              <button
                type="button"
                onClick={() => { setSent(false); setEmail(''); }}
                style={{ fontSize: 13, color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                Try a different email
              </button>
              <Link to="/chat/login" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ← Back to sign in
              </Link>
            </div>
          </div>
        </>
      )}
    </ChatAuthLayout>
  );
}
