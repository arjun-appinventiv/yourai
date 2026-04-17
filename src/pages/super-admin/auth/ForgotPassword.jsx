import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, ArrowLeft, ShieldCheck, Loader } from 'lucide-react';
import AuthLayout from '../../../components/AuthLayout';
import { verifyOtp as verifyOtpApi } from '../../../lib/auth';

export default function ForgotPassword() {
  const [step, setStep] = useState('email'); // email | otp
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [attempts, setAttempts] = useState(0);
  const refs = useRef([]);
  const navigate = useNavigate();

  const maxAttempts = 3;
  const isLocked = attempts >= maxAttempts;

  useEffect(() => {
    if (step !== 'otp' || timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [step, timer]);

  const isEmailValid = email.trim() !== '' && email.includes('@');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!isEmailValid || emailLoading) return;
    setEmailLoading(true);
    // Simulate API call (always show success — never reveal if email exists)
    await new Promise((r) => setTimeout(r, 1000));
    setEmailLoading(false);
    setStep('otp');
    setTimer(60);
    setAttempts(0);
    setOtpError('');
    setOtp(Array(6).fill(''));
    setTimeout(() => refs.current[0]?.focus(), 100);
  };

  const verifyOtp = async (code) => {
    if (isLocked) {
      setOtpError('Too many attempts. Please request a new code.');
      setOtp(Array(6).fill(''));
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      const result = await verifyOtpApi(code);
      if (result.success) {
        navigate('/super-admin/reset-password', { state: { email, otpVerified: true } });
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= maxAttempts) {
          setOtpError('Too many attempts. Please request a new code.');
        } else {
          setOtpError(result.error || 'Incorrect code. Please check your email and try again.');
        }
        setOtp(Array(6).fill(''));
        refs.current[0]?.focus();
        setOtpLoading(false);
      }
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= maxAttempts) {
        setOtpError('Too many attempts. Please request a new code.');
      } else {
        setOtpError('Verification failed. Please try again.');
      }
      setOtp(Array(6).fill(''));
      refs.current[0]?.focus();
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isLocked) return;
    // Strip non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned && value) return; // typed non-numeric, reject silently

    const next = [...otp];
    if (cleaned.length > 1) {
      // Paste: fill from left with available digits
      const digits = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) next[i] = digits[i] || '';
      setOtp(next);
      refs.current[Math.min(digits.length, 6) - 1]?.focus();
      if (digits.length === 6) setTimeout(() => verifyOtp(next.join('')), 300);
      return;
    }
    next[index] = cleaned;
    setOtp(next);
    if (cleaned && index < 5) refs.current[index + 1]?.focus();
    if (next.every((d) => d !== '')) setTimeout(() => verifyOtp(next.join('')), 300);
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) refs.current[index - 1]?.focus();
  };

  const handleResend = () => {
    if (timer > 0) return;
    setTimer(60);
    setAttempts(0);
    setOtpError('');
    setOtp(Array(6).fill(''));
    refs.current[0]?.focus();
  };

  const inputStyle = { width: '100%', height: 42, border: '1px solid var(--border)', borderRadius: '10px', padding: '0 12px 0 40px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' };
  const allFilled = otp.every((d) => d !== '');

  return (
    <AuthLayout>
      {step === 'email' && (
        <>
          <Link to="/super-admin/login" className="flex items-center gap-1 mb-6" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>
          <div className="text-center">
            <div className="flex justify-center mb-4"><Mail size={40} style={{ color: 'var(--navy)' }} /></div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '24px', color: 'var(--text-primary)' }}>Forgot your password?</h1>
            <p className="mt-2 mx-auto" style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 300 }}>
              Enter your operator email and we'll send you a verification code.
            </p>
          </div>
          <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Email address</label>
              <div className="relative">
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" style={inputStyle} />
              </div>
            </div>
            <button
              type="submit"
              disabled={!isEmailValid || emailLoading}
              className="w-full flex items-center justify-center gap-2 text-white"
              style={{
                backgroundColor: !isEmailValid || emailLoading ? '#9CA3AF' : 'var(--navy)',
                height: 42,
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                cursor: !isEmailValid || emailLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {emailLoading ? <><Loader size={16} className="animate-spin" /> Sending...</> : 'Send Verification Code'}
            </button>
          </form>
        </>
      )}

      {step === 'otp' && (
        <>
          <button onClick={() => setStep('email')} className="flex items-center gap-1 mb-6" style={{ fontSize: '12px', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="text-center">
            <div className="flex justify-center mb-4"><ShieldCheck size={40} style={{ color: 'var(--navy)' }} /></div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '24px', color: 'var(--text-primary)' }}>Verify your email</h1>
            <p className="mt-2" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Enter the 6-digit code sent to <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{email}</span>
            </p>
          </div>

          <div className="flex justify-center gap-2.5 mt-7">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                disabled={isLocked || otpLoading}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className="text-center"
                style={{
                  width: 48,
                  height: 54,
                  border: `2px solid ${otpError ? '#C65454' : digit ? 'var(--navy-light)' : 'var(--border)'}`,
                  borderRadius: '10px',
                  fontSize: '24px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  opacity: isLocked ? 0.5 : 1,
                  cursor: isLocked ? 'not-allowed' : 'text',
                  backgroundColor: isLocked ? '#F8F4ED' : 'white',
                }}
              />
            ))}
          </div>

          {otpError && (
            <div className="mt-4" style={{ backgroundColor: '#F9E7E7', borderLeft: '3px solid #C65454', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
              <p style={{ fontSize: '13px', color: '#C65454', margin: 0 }}>{otpError}</p>
            </div>
          )}

          <div className="text-center mt-4">
            {timer > 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Resend code in 0:{timer.toString().padStart(2, '0')}</span>
            ) : (
              <button onClick={handleResend} style={{ fontSize: '12px', color: 'var(--navy)', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none' }}>Resend code</button>
            )}
          </div>

          <button
            onClick={() => verifyOtp(otp.join(''))}
            disabled={!allFilled || otpLoading || isLocked}
            className="w-full flex items-center justify-center gap-2 text-white mt-5"
            style={{
              backgroundColor: !allFilled || otpLoading || isLocked ? '#9CA3AF' : 'var(--navy)',
              height: 42,
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: !allFilled || otpLoading || isLocked ? 'not-allowed' : 'pointer',
            }}
          >
            {otpLoading ? <><Loader size={16} className="animate-spin" /> Verifying...</> : 'Verify & Continue'}
          </button>
        </>
      )}
    </AuthLayout>
  );
}
