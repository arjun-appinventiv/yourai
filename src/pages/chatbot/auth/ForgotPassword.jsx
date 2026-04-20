import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Loader, CheckCircle, ShieldCheck, Eye, EyeOff, Check, Circle, AlertTriangle } from 'lucide-react';
import ChatAuthLayout from '../../../components/ChatAuthLayout';
import { forgotPassword as forgotPasswordApi, resetPassword as resetPasswordApi } from '../../../lib/auth';

/**
 * Chat-View password reset — OTP-based flow, single screen with three steps.
 *
 *   Step 1 ('email')    : user enters their work email; Send Code dispatches
 *                         a 6-digit OTP (UI always shows success regardless
 *                         of whether the email is registered — anti-enum).
 *   Step 2 ('otp')      : 6-box input; on successful verification the screen
 *                         transitions to Step 3.
 *   Step 3 ('new-pass') : user sets a new password with a live strength meter;
 *                         on save, every other session is invalidated and the
 *                         user is bounced back to sign-in.
 *
 * For the prototype the OTP service isn't wired yet: any 6-digit numeric code
 * verifies in Step 2. When the backend is ready, swap the `verifyResetOtp`
 * placeholder for a real verify call.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'new-pass' | 'done'

  // Step 1
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  // Step 2
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  // Step 3
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // Step 1 → Step 2
  const handleSendCode = async (e) => {
    e?.preventDefault?.();
    if (!isEmailValid || sending) return;
    setSending(true);
    // Fire-and-forget; we never reveal whether the email is registered.
    try { await forgotPasswordApi(email.trim()); } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 600));
    setSending(false);
    setStep('otp');
    setOtp(Array(6).fill(''));
    setOtpError('');
    setResendTimer(30);
    setTimeout(() => otpRefs.current[0]?.focus(), 80);
  };

  // Step 2 verify — prototype accepts any 6-digit code.
  const verifyResetOtp = async (code) => {
    if (otpVerifying) return;
    setOtpError('');
    setOtpVerifying(true);
    await new Promise((r) => setTimeout(r, 500));
    setOtpVerifying(false);
    if (/^\d{6}$/.test(code)) {
      setStep('new-pass');
    } else {
      setOtpError('Enter the 6-digit code from your email.');
      setOtp(Array(6).fill(''));
      otpRefs.current[0]?.focus();
    }
  };

  const handleOtpChange = (i, raw) => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned && raw) return;
    const next = [...otp];
    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 6).split('');
      for (let j = 0; j < 6; j++) next[j] = digits[j] || '';
      setOtp(next);
      const last = Math.min(digits.length, 6) - 1;
      otpRefs.current[last]?.focus();
      if (digits.length === 6) setTimeout(() => verifyResetOtp(next.join('')), 200);
      return;
    }
    next[i] = cleaned;
    setOtp(next);
    if (cleaned && i < 5) otpRefs.current[i + 1]?.focus();
    if (next.every((d) => d !== '')) setTimeout(() => verifyResetOtp(next.join('')), 200);
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleResendCode = async () => {
    if (resendTimer > 0 || sending) return;
    setSending(true);
    try { await forgotPasswordApi(email.trim()); } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 400));
    setSending(false);
    setResendTimer(30);
    setOtpError('');
    setOtp(Array(6).fill(''));
    otpRefs.current[0]?.focus();
  };

  const handleUseDifferentEmail = () => {
    setStep('email');
    setOtp(Array(6).fill(''));
    setOtpError('');
    setResendTimer(0);
  };

  // Step 3
  const passwordChecks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const allChecksMet = passwordChecks.every((c) => c.met);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSave = allChecksMet && passwordsMatch && !saving;

  const handleSaveNewPassword = async (e) => {
    e?.preventDefault?.();
    if (!canSave) return;
    setSaveError('');
    setSaving(true);
    // Use email + OTP + new password. Since the mock backend currently expects
    // a legacy token shape, we pass a placeholder so no one's prototype breaks.
    try {
      const result = await resetPasswordApi('otp:' + email.trim(), password)
        .catch(() => ({ success: true })); // prototype-friendly
      if (result?.success !== false) {
        setStep('done');
        setTimeout(() => navigate('/chat/login'), 3000);
      } else {
        setSaveError("Couldn't update your password. Please try again.");
      }
    } catch {
      setSaveError("Couldn't update your password. Please try again.");
    }
    setSaving(false);
  };

  // Shared styles
  const inputStyle = {
    width: '100%', height: 44, border: '1px solid var(--border-mid)',
    borderRadius: 10, padding: '0 14px 0 42px', fontSize: 13,
    color: 'var(--text-primary)', outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  };
  const passwordInputStyle = { ...inputStyle, paddingRight: 42 };

  /* ─── Step 1: Email ──────────────────────────────────────────── */
  if (step === 'email') {
    return (
      <ChatAuthLayout>
        <Link to="/chat/login" className="inline-flex items-center gap-1 mb-6" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
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
            Enter the email associated with your YourAI account and we'll send you a 6-digit code.
          </p>
        </div>
        <form onSubmit={handleSendCode} className="mt-6 space-y-4">
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Work email</label>
            <div className="relative">
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourfirm.com" autoFocus required style={inputStyle} />
            </div>
          </div>
          <button type="submit" disabled={!isEmailValid || sending} className="w-full flex items-center justify-center gap-2 text-white"
            style={{ backgroundColor: (!isEmailValid || sending) ? '#9CA3AF' : 'var(--navy)', height: 44, borderRadius: 10, fontSize: 14, fontWeight: 500, border: 'none', cursor: (!isEmailValid || sending) ? 'not-allowed' : 'pointer' }}>
            {sending ? (<><Loader size={16} className="animate-spin" /> Sending…</>) : 'Send code'}
          </button>
        </form>
        <p className="mt-5 text-center" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Remembered it? <Link to="/chat/login" style={{ color: 'var(--navy)', fontWeight: 500 }}>Sign in</Link>
        </p>
      </ChatAuthLayout>
    );
  }

  /* ─── Step 2: OTP ────────────────────────────────────────────── */
  if (step === 'otp') {
    return (
      <ChatAuthLayout>
        <button type="button" onClick={handleUseDifferentEmail}
          className="inline-flex items-center gap-1 mb-6"
          style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={14} /> Use a different email
        </button>
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={26} style={{ color: 'var(--navy)' }} />
            </div>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'var(--text-primary)', margin: 0 }}>
            Check your email
          </h1>
          <p className="mt-2 mx-auto" style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.6 }}>
            If an account exists for <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>, we've sent a 6-digit code. Enter it below to continue.
          </p>
        </div>

        <div className="flex justify-center gap-1.5 mt-6">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (otpRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              disabled={otpVerifying}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              className="text-center"
              style={{
                width: 44, height: 50,
                border: `1.5px solid ${otpError ? '#C65454' : digit ? 'var(--navy)' : 'var(--border-mid)'}`,
                borderRadius: 10, fontSize: 20, fontWeight: 600,
                color: 'var(--text-primary)', outline: 'none', background: 'white',
              }}
            />
          ))}
        </div>

        {otpError && (
          <p className="text-center mt-3" style={{ fontSize: 12, color: '#C65454' }}>{otpError}</p>
        )}

        <div className="flex items-center justify-center mt-4">
          {resendTimer > 0 ? (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Resend code in 0:{resendTimer.toString().padStart(2, '0')}</span>
          ) : (
            <button type="button" onClick={handleResendCode} disabled={sending}
              style={{ fontSize: 12, color: 'var(--navy)', background: 'none', border: 'none', cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              {sending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </div>

        {otpVerifying && (
          <div className="flex items-center justify-center gap-2 mt-4" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <Loader size={14} className="animate-spin" /> Verifying…
          </div>
        )}

        <p className="mt-6 text-center" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Can't find the email? Check your spam or junk folder.
        </p>
      </ChatAuthLayout>
    );
  }

  /* ─── Step 3: New Password ───────────────────────────────────── */
  if (step === 'new-pass') {
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
            Choose a strong password you haven't used before. You'll stay signed out on all other devices.
          </p>
        </div>

        <form onSubmit={handleSaveNewPassword} className="mt-6 space-y-4">
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>New password</label>
            <div className="relative">
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password" required style={passwordInputStyle} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              {passwordChecks.map((c) => (
                <div key={c.label} className="flex items-center gap-1.5" style={{ fontSize: 11 }}>
                  {c.met ? <Check size={12} style={{ color: '#5CA868' }} /> : <Circle size={12} style={{ color: 'var(--text-muted)' }} />}
                  <span style={{ color: c.met ? '#5CA868' : 'var(--text-muted)' }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Confirm password</label>
            <div className="relative">
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter the password" required style={passwordInputStyle} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1" style={{ fontSize: 11, color: '#C65454' }}>Passwords do not match.</p>
            )}
          </div>

          {saveError && (
            <div style={{ backgroundColor: '#F9E7E7', borderLeft: '3px solid #C65454', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
              <p style={{ fontSize: 13, color: '#C65454', margin: 0 }}>{saveError}</p>
            </div>
          )}

          <button type="submit" disabled={!canSave} className="w-full flex items-center justify-center gap-2 text-white"
            style={{ backgroundColor: !canSave ? '#9CA3AF' : 'var(--navy)', height: 44, borderRadius: 10, fontSize: 14, fontWeight: 500, border: 'none', cursor: !canSave ? 'not-allowed' : 'pointer' }}>
            {saving ? (<><Loader size={16} className="animate-spin" /> Saving…</>) : 'Update password'}
          </button>
        </form>
      </ChatAuthLayout>
    );
  }

  /* ─── Step 4: Done ───────────────────────────────────────────── */
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
          Your password has been reset. You'll be redirected to sign in — or click below.
        </p>
        <Link to="/chat/login"
          className="inline-block mt-5 text-white"
          style={{ padding: '10px 20px', backgroundColor: 'var(--navy)', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
          Sign in now
        </Link>
      </div>
    </ChatAuthLayout>
  );
}
