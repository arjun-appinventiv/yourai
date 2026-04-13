import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Loader } from 'lucide-react';
import AuthLayout from '../../../components/AuthLayout';
import { useAuth } from '../../../context/AuthContext';
import { verifyOtp as verifyOtpApi } from '../../../lib/auth';

// Removed: VALID_OTP = '123456' — replaced with real API call to /api/auth/verify-otp

export default function VerifyOTP() {
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [timer, setTimer] = useState(60);
  const refs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { completeAuth } = useAuth();
  // Removed: hardcoded arjun@appinventiv.com fallback
  const email = location.state?.email || '';

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const verify = useCallback(async (code) => {
    if (attempts >= 3) {
      setError('Too many attempts. Please request a new code.');
      setOtp(Array(6).fill(''));
      refs.current[0]?.focus();
      return;
    }

    setLoading(true);
    setError('');
    // Removed: setTimeout mock delay — real API call
    try {
      const result = await verifyOtpApi(code);
      if (result.success) {
        completeAuth(result.user);
        navigate('/super-admin/dashboard', { replace: true });
      } else {
        setAttempts((a) => a + 1);
        setError(result.error || 'Incorrect code. Please check your email and try again.');
        setOtp(Array(6).fill(''));
        refs.current[0]?.focus();
        setLoading(false);
      }
    } catch {
      setAttempts((a) => a + 1);
      setError('Verification failed. Please try again.');
      setOtp(Array(6).fill(''));
      refs.current[0]?.focus();
      setLoading(false);
    }
  }, [attempts, completeAuth, navigate]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    if (value.length > 1) {
      // Paste support
      const digits = value.slice(0, 6).split('');
      digits.forEach((d, i) => { if (i < 6) next[i] = d; });
      setOtp(next);
      const lastFilled = Math.min(digits.length, 6) - 1;
      refs.current[lastFilled]?.focus();
      if (digits.length === 6) {
        setTimeout(() => verify(next.join('')), 300);
      }
      return;
    }
    next[index] = value;
    setOtp(next);
    if (value && index < 5) refs.current[index + 1]?.focus();
    if (next.every((d) => d !== '')) {
      setTimeout(() => verify(next.join('')), 300);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    setTimer(60);
    setAttempts(0);
    setError('');
    setOtp(Array(6).fill(''));
    refs.current[0]?.focus();
  };

  const allFilled = otp.every((d) => d !== '');

  return (
    <AuthLayout>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <ShieldCheck size={40} style={{ color: 'var(--navy)' }} />
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '24px', color: 'var(--text-primary)' }}>Verify your identity</h1>
        <p className="mt-2" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Enter the 6-digit code sent to <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{email}</span>
        </p>
      </div>

      {/* OTP Boxes */}
      <div className="flex justify-center gap-2.5 mt-7">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className="text-center"
            style={{
              width: 48,
              height: 54,
              border: `2px solid ${error ? '#EF4444' : digit ? 'var(--navy-light)' : 'var(--border)'}`,
              borderRadius: '10px',
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'border-color 150ms',
            }}
            onFocusCapture={(e) => { e.target.style.borderColor = error ? '#EF4444' : 'var(--navy)'; e.target.style.boxShadow = '0 0 0 3px rgba(11,29,58,0.10)'; }}
            onBlurCapture={(e) => { e.target.style.borderColor = digit ? 'var(--navy-light)' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4" style={{ backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
          <p style={{ fontSize: '13px', color: '#9B2C2C' }}>{error}</p>
        </div>
      )}

      {/* Resend */}
      <div className="text-center mt-4">
        {timer > 0 ? (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Resend code in 0:{timer.toString().padStart(2, '0')}</span>
        ) : (
          <button onClick={handleResend} style={{ fontSize: '12px', color: 'var(--navy)', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none' }}>Resend code</button>
        )}
      </div>

      {/* Verify button */}
      <button
        onClick={() => verify(otp.join(''))}
        disabled={!allFilled || loading}
        className="w-full flex items-center justify-center gap-2 text-white mt-5 transition-colors"
        style={{
          backgroundColor: !allFilled || loading ? '#94A3B8' : 'var(--navy)',
          height: 42,
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 500,
          border: 'none',
          cursor: !allFilled || loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? <><Loader size={16} className="animate-spin" /> Verifying...</> : 'Verify & Sign In'}
      </button>

      <div className="text-center mt-4">
        <Link to="/super-admin/login" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          &larr; Use a different account
        </Link>
      </div>
    </AuthLayout>
  );
}
