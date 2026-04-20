import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Check, Circle, Loader, CheckCircle, AlertTriangle } from 'lucide-react';
import ChatAuthLayout from '../../../components/ChatAuthLayout';
import { resetPassword as resetPasswordApi } from '../../../lib/auth';

/**
 * Chat-View Reset Password screen.
 *
 * Arrives via a link in the "reset your password" email:
 *   /chat/reset-password?token=<secure-token>
 *
 * If the token is missing or invalid, show a friendly "link expired"
 * state instead of a raw error.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const allChecksMet = checks.every((c) => c.met);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = allChecksMet && passwordsMatch && !loading;

  // Token presence is a rough check — real validity is confirmed on submit.
  const tokenMissing = !token.trim();

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => navigate('/chat/login'), 3000);
      return () => clearTimeout(t);
    }
  }, [done, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const result = await resetPasswordApi(token, password).catch(() => ({ success: false, error: '' }));
      if (result.success) {
        setDone(true);
      } else {
        setError("This reset link is invalid or has expired. Please request a new one.");
      }
    } catch {
      setError("Couldn't reset your password. Please try again.");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', height: 44, border: '1px solid var(--border-mid)',
    borderRadius: 10, padding: '0 42px 0 42px', fontSize: 13,
    color: 'var(--text-primary)', outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  };

  if (tokenMissing) {
    return (
      <ChatAuthLayout>
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F9E7E7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={26} color="#C65454" />
            </div>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--text-primary)', margin: 0 }}>
            Link expired or invalid
          </h1>
          <p className="mt-3 mx-auto" style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.6 }}>
            This reset link isn't valid any more. Reset links expire after 30 minutes, and can only be used once.
          </p>
          <Link
            to="/chat/forgot-password"
            className="inline-block mt-5 text-white"
            style={{ padding: '10px 20px', backgroundColor: 'var(--navy)', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
          >
            Request a new link
          </Link>
          <div className="mt-4">
            <Link to="/chat/login" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ← Back to sign in
            </Link>
          </div>
        </div>
      </ChatAuthLayout>
    );
  }

  if (done) {
    return (
      <ChatAuthLayout>
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E7F3E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={30} color="#5CA868" />
            </div>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--text-primary)', margin: 0 }}>
            Password updated
          </h1>
          <p className="mt-3 mx-auto" style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.6 }}>
            Your password has been reset. You'll be redirected to sign in — or click the button below.
          </p>
          <Link
            to="/chat/login"
            className="inline-block mt-5 text-white"
            style={{ padding: '10px 20px', backgroundColor: 'var(--navy)', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
          >
            Sign in now
          </Link>
        </div>
      </ChatAuthLayout>
    );
  }

  return (
    <ChatAuthLayout>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={24} style={{ color: 'var(--navy)' }} />
          </div>
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'var(--text-primary)', margin: 0 }}>
          Set a new password
        </h1>
        <p className="mt-2 mx-auto" style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.6 }}>
          Choose a strong password you haven't used before. You'll stay signed out on all devices until you sign back in.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
            New password
          </label>
          <div className="relative">
            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {/* Strength meter */}
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-1.5" style={{ fontSize: 11 }}>
                {c.met
                  ? <Check size={12} style={{ color: '#5CA868' }} />
                  : <Circle size={12} style={{ color: 'var(--text-muted)' }} />}
                <span style={{ color: c.met ? '#5CA868' : 'var(--text-muted)' }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
            Confirm password
          </label>
          <div className="relative">
            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter the password"
              required
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1" style={{ fontSize: 11, color: '#C65454' }}>Passwords do not match.</p>
          )}
        </div>

        {error && (
          <div style={{ backgroundColor: '#F9E7E7', borderLeft: '3px solid #C65454', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
            <p style={{ fontSize: 13, color: '#C65454', margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 text-white"
          style={{
            backgroundColor: !canSubmit ? '#9CA3AF' : 'var(--navy)',
            height: 44,
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            border: 'none',
            cursor: !canSubmit ? 'not-allowed' : 'pointer',
            transition: 'background-color 150ms',
          }}
        >
          {loading ? (<><Loader size={16} className="animate-spin" /> Saving…</>) : 'Update password'}
        </button>
      </form>
    </ChatAuthLayout>
  );
}
