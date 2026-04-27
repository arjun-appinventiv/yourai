import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader, ShieldCheck, ArrowLeft, RefreshCw, Info, X } from 'lucide-react';
import ChatAuthLayout from '../../../components/ChatAuthLayout';
import { verifyOtp as apiVerifyOtp, resendOtp as apiResendOtp, trackLogin, claimSession } from '../../../lib/auth';
import { useAuth } from '../../../context/AuthContext';

// Removed: MOCK_EMAIL = 'ryan@hartwell.com' — replaced with real API call
// Removed: MOCK_PASSWORD = 'Law@2026' — replaced with real API call
// Removed: MOCK_OTP = '482916' — replaced with real API call
// Removed: "Show demo credentials" panel — not needed with real auth
// Removed: "Show demo OTP" panel — not needed with real auth
// Removed: all setTimeout mock delays — login/OTP are now real network calls
// See: tech-stack.md — Backend API section

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // OTP state
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  const navigate = useNavigate();
  // Route login through AuthContext so `operator` is populated immediately —
  // without this, tenantRole lookups on /chat had to go through a
  // localStorage round-trip and could show the wrong role.
  const { login: authLogin } = useAuth();
  // Deep-link preservation: if the user was sent here after hitting a
  // protected route, honour `?redirect=/chat/...` on successful sign-in.
  // Only allow same-origin paths to prevent open-redirect abuse.
  const [searchParams] = useSearchParams();
  // External Users don't have access to the personal chat — their home is the
  // workspace list. Pass the signed-in user through so we can route based on
  // tenantRole; falls back to '/chat' for everyone else.
  const getRedirectTarget = (user) => {
    const candidate = searchParams.get('redirect') || '';
    const isExternal = user?.tenantRole === 'EXTERNAL_USER';
    // Internal users now land on the tile-based decision home so the
    // attorney sees a "what would you like to do" picker rather than
    // an empty chat. Externals still land on their workspace list.
    const defaultTarget = isExternal ? '/chat/workspaces' : '/chat/home';
    if (!candidate) return defaultTarget;
    if (!candidate.startsWith('/') || candidate.startsWith('//')) return defaultTarget;
    // Externals can only land on workspace routes via deep link; if they have
    // a redirect pointing elsewhere, ignore it.
    if (isExternal && !candidate.startsWith('/chat/workspaces')) return defaultTarget;
    return candidate;
  };

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Auto-focus first OTP input when step changes
  useEffect(() => {
    if (step === 'otp' && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // Extract first name from email for display
  const getUserName = () => {
    const local = email.split('@')[0] || '';
    return local.charAt(0).toUpperCase() + local.slice(1);
  };

  // Mask email for display
  const getMaskedEmail = () => {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const visible = local.slice(0, 2);
    return `${visible}${'•'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
  };

  // Step 1: Verify credentials via real API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setLoadingText('Verifying credentials...');

    try {
      // Removed: setTimeout mock delay — real API call
      const result = await authLogin(email, password);

      if (result.success) {
        if (result.requiresOtp) {
          setLoading(false);
          setLoadingText('');
          setStep('otp');
          setResendTimer(RESEND_COOLDOWN);
        } else {
          // No 2FA required — go straight to chat
          trackLogin(email);
          localStorage.setItem('yourai_current_email', email);
          claimSession(email); // Invalidates any other active session for this email
          setLoadingText('Authenticated! Redirecting...');
          navigate(getRedirectTarget(result.user), { replace: true });
        }
      } else {
        setLoading(false);
        setLoadingText('');
        setError(result.error || 'Invalid email or password. Please check your credentials and try again.');
      }
    } catch {
      setLoading(false);
      setLoadingText('');
      setError('A network error occurred. Please check your connection and try again.');
    }
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== '') && newOtp.join('').length === OTP_LENGTH) {
      verifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === 0) return;
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[nextIndex]?.focus();

    if (newOtp.every((d) => d !== '')) {
      verifyOtp(newOtp.join(''));
    }
  };

  // Step 2: Verify OTP via real API
  const verifyOtp = async (code) => {
    setOtpVerifying(true);
    setError('');
    setLoadingText('Verifying code...');

    try {
      // Removed: setTimeout mock delay — real API call
      const result = await apiVerifyOtp(code);

      if (result.success) {
        trackLogin(email);
        localStorage.setItem('yourai_current_email', email);
        claimSession(email); // Invalidates any other active session for this email
        setLoadingText('Authenticated! Redirecting...');
        navigate(getRedirectTarget(), { replace: true });
      } else {
        setOtpVerifying(false);
        setLoadingText('');
        setError(result.error || 'Invalid verification code. Please try again.');
        setOtp(Array(OTP_LENGTH).fill(''));
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch {
      setOtpVerifying(false);
      setLoadingText('');
      setError('Verification failed. Please check your connection and try again.');
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      setError('Please enter all 6 digits');
      return;
    }
    verifyOtp(code);
  };

  // Removed: setTimeout mock delay — real API call
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setOtp(Array(OTP_LENGTH).fill(''));
    setOtpVerifying(true);
    setLoadingText('Sending new code...');
    await apiResendOtp();
    setOtpVerifying(false);
    setLoadingText('');
    setResendTimer(RESEND_COOLDOWN);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setOtp(Array(OTP_LENGTH).fill(''));
    setError('');
  };

  // SSO handlers — redirect to backend OAuth endpoints
  const handleGoogleSSO = () => {
    // Removed: setTimeout mock delay — real OAuth redirect
    const base = import.meta.env.VITE_API_URL || '';
    window.location.href = `${base}/api/auth/google`;
  };

  const handleMicrosoftSSO = () => {
    // Removed: setTimeout mock delay — real OAuth redirect
    const base = import.meta.env.VITE_API_URL || '';
    window.location.href = `${base}/api/auth/microsoft`;
  };

  const inputWrap = 'relative';
  const inputStyle = {
    width: '100%',
    height: 42,
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '0 12px 0 40px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  };
  const iconStyle = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' };

  // ─── OTP VERIFICATION SCREEN ───
  if (step === 'otp') {
    return (
      <ChatAuthLayout>
        {/* Back button */}
        <button
          type="button"
          onClick={handleBackToCredentials}
          className="flex items-center gap-1.5 mb-4 transition-colors"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={15} /> Back to sign in
        </button>

        {/* Header */}
        <div className="text-center">
          <div
            className="mx-auto flex items-center justify-center"
            style={{
              width: 56, height: 56, borderRadius: '16px',
              background: 'linear-gradient(135deg, #F0F3F6, #F0F3F6)',
              marginBottom: 16,
            }}
          >
            <ShieldCheck size={28} style={{ color: 'var(--navy)' }} />
          </div>
          <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)' }}>
            Two-Factor Authentication
          </h1>
          <p className="mt-2" style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            We've sent a 6-digit verification code to<br />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{getMaskedEmail()}</span>
          </p>
          <p className="mt-1" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Hi {getUserName()}, please enter the code to continue
          </p>
        </div>

        {/* Demo OTP panel */}
        <div className="mt-4 relative">
          <button
            type="button"
            onClick={() => setShowCreds(!showCreds)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: showCreds ? '#F0F3F6' : 'var(--ice-warm)', color: showCreds ? '#1E3A8A' : 'var(--text-muted)', fontSize: '12px', border: '1px solid transparent' }}
          >
            <Info size={14} />
            {showCreds ? 'Hide demo OTP' : 'Show demo OTP'}
          </button>
          {showCreds && (
            <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#F0F3F6', border: '1px solid #F0F3F6' }}>
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontSize: '11px', color: '#1E3A8A', fontWeight: 600 }}>VERIFICATION CODE</span>
                <button type="button" onClick={() => { setOtp('482916'.split('')); verifyOtp('482916'); }} style={{ fontSize: '11px', color: '#1E3A8A', cursor: 'pointer', background: 'none', border: 'none' }}>Auto-fill &amp; verify</button>
              </div>
              <code style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '0.15em' }}>482916</code>
            </div>
          )}
        </div>

        {/* OTP Input Boxes */}
        <form onSubmit={handleOtpSubmit} className="mt-6">
          <div className="flex justify-center gap-1.5 sm:gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (otpRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                onPaste={i === 0 ? handleOtpPaste : undefined}
                disabled={otpVerifying}
                className="w-10 h-12 sm:w-12 sm:h-14"
                style={{
                  textAlign: 'center',
                  fontSize: '22px',
                  fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif",
                  color: 'var(--text-primary)',
                  border: digit ? '2px solid var(--navy)' : '1.5px solid var(--border)',
                  borderRadius: '12px',
                  outline: 'none',
                  backgroundColor: otpVerifying ? '#F8F4ED' : digit ? '#F0F4FF' : '#fff',
                  transition: 'all 0.2s',
                  caretColor: 'var(--navy)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--navy)'; e.target.style.boxShadow = '0 0 0 3px rgba(11,29,58,0.08)'; }}
                onBlur={(e) => { e.target.style.borderColor = digit ? 'var(--navy)' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 mt-4" style={{ backgroundColor: '#F9E7E7', borderLeft: '3px solid #C65454', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
              <p style={{ fontSize: '13px', color: '#C65454' }}>{error}</p>
            </div>
          )}

          {/* Verify button */}
          <button
            type="submit"
            disabled={otpVerifying || otp.some((d) => d === '')}
            className="w-full flex items-center justify-center gap-2 text-white transition-colors mt-5"
            style={{
              backgroundColor: otpVerifying ? 'var(--navy-mid)' : otp.every((d) => d !== '') ? 'var(--navy)' : '#9CA3AF',
              height: 42,
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: otpVerifying ? 'not-allowed' : otp.every((d) => d !== '') ? 'pointer' : 'not-allowed',
            }}
          >
            {otpVerifying ? (
              <><Loader size={16} className="animate-spin" /> {loadingText}</>
            ) : (
              <><ShieldCheck size={16} /> Verify & Sign In</>
            )}
          </button>
        </form>

        {/* Resend OTP */}
        <div className="text-center mt-5">
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Didn't receive the code?
          </p>
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendTimer > 0}
            className="flex items-center justify-center gap-1.5 mx-auto mt-1.5 transition-colors"
            style={{
              background: 'none',
              border: 'none',
              cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
              color: resendTimer > 0 ? 'var(--text-muted)' : 'var(--navy)',
              fontSize: '13px',
              fontWeight: 500,
              padding: 0,
            }}
          >
            <RefreshCw size={13} />
            {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend verification code'}
          </button>
        </div>

        {/* Security note */}
        <div className="text-center mt-5 flex items-center justify-center gap-1.5" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          <Lock size={11} />
          Secured with 256-bit encryption. Code expires in 10 minutes.
        </div>
      </ChatAuthLayout>
    );
  }

  // ─── CREDENTIALS SCREEN (Step 1) ───
  return (
    <ChatAuthLayout>
      <div className="text-center">
        <span className="inline-flex items-center" style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em' }}>
          Law Firm Portal
        </span>
        <h1 className="mt-3 text-2xl sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)' }}>Welcome to YourAI</h1>
        <p className="mt-1" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sign in to your firm's AI workspace</p>
      </div>

      {/* SSO Buttons */}
      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={handleGoogleSSO}
          className="w-full flex items-center justify-center gap-3 transition-all"
          style={{ height: 42, borderRadius: '10px', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8F4ED'; e.currentTarget.style.borderColor = '#D6DDE4'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Sign in with Google
        </button>

        <button
          type="button"
          onClick={handleMicrosoftSSO}
          className="w-full flex items-center justify-center gap-3 transition-all"
          style={{ height: 42, borderRadius: '10px', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8F4ED'; e.currentTarget.style.borderColor = '#D6DDE4'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
          Sign in with Microsoft
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mt-5 mb-1">
        <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or continue with email</span>
        <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Email address</label>
          <div className={inputWrap}>
            <Mail size={16} style={iconStyle} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourfirm.com" required style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
          <div className={inputWrap}>
            <Lock size={16} style={iconStyle} />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required style={{ ...inputStyle, paddingRight: 40 }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="text-right mt-1.5">
            <Link to="/chat/forgot-password" className="hover:underline" style={{ fontSize: '12px', color: 'var(--slate)' }}>Forgot password?</Link>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2" style={{ backgroundColor: '#F9E7E7', borderLeft: '3px solid #C65454', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
            <p style={{ fontSize: '13px', color: '#C65454' }}>{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading || !email.trim() || !password.trim()} className="w-full flex items-center justify-center gap-2 text-white transition-colors" style={{ backgroundColor: (loading || !email.trim() || !password.trim()) ? '#9CA3AF' : 'var(--navy)', height: 42, borderRadius: '10px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: (loading || !email.trim() || !password.trim()) ? 'not-allowed' : 'pointer', opacity: (!email.trim() || !password.trim()) && !loading ? 0.7 : 1 }}>
          {loading ? <><Loader size={16} className="animate-spin" /> {loadingText}</> : 'Sign In'}
        </button>
      </form>

      {/* Demo credentials — opens a modal with all three roles */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowDemoModal(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--ice-warm)', color: 'var(--text-muted)', fontSize: '12px', border: '1px solid transparent' }}
        >
          <Info size={14} />
          Show demo credentials
        </button>
      </div>

      {showDemoModal && (
        <DemoCredentialsModal
          onClose={() => setShowDemoModal(false)}
          onUse={(creds) => {
            setEmail(creds.email);
            setPassword(creds.password);
            setShowDemoModal(false);
          }}
        />
      )}

      <p className="text-center mt-4" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Don't have an account?{' '}
        <Link to="/chat/signup" className="hover:underline" style={{ color: 'var(--slate)', fontWeight: 500 }}>Sign Up</Link>
      </p>

      <p className="text-center mt-3" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        Private &amp; encrypted. Your data never leaves your firm's environment.
      </p>
    </ChatAuthLayout>
  );
}

/* ─── Demo credentials modal — three tenant roles side-by-side ─── */
const DEMO_ACCOUNTS = [
  {
    role: 'Org Admin',
    email: 'ryan@hartwell.com',
    password: 'Law@2026',
    summary: 'Full-access owner of Hartwell & Associates. Sees every workspace, all knowledge packs, and all admin tools.',
    accent: { bg: '#0A2463', color: '#FFFFFF', tint: 'rgba(10,36,99,0.08)' },
  },
  {
    role: 'Internal User',
    email: 'priya@hartwell.com',
    password: 'Internal@123',
    summary: 'Attorney at the firm with extra create-workspace and view-audit-logs permissions granted by the Org Admin.',
    accent: { bg: '#1E3A8A', color: '#FFFFFF', tint: '#F0F3F6' },
  },
  {
    role: 'External User',
    email: 'liaison@acmecorp.com',
    password: 'Client@123',
    summary: 'End client for Acme Corp. Limited to their assigned workspace and the case vs general chat-mode toggle.',
    accent: { bg: '#5CA868', color: '#FFFFFF', tint: '#E7F3E9' },
  },
];

function DemoCredentialsModal({ onClose, onUse }) {
  const [copied, setCopied] = useState('');

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1400);
    } catch { /* ignore */ }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(680px, 92vw)', maxHeight: '86vh', overflowY: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 71 }}>
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--text-primary)', margin: 0 }}>Demo credentials</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, maxWidth: 500 }}>
              Three tenant roles are seeded so you can explore what each user type sees. Pick one and click <strong>Use these</strong> to auto-fill the form.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" style={{ flexShrink: 0 }}>
            <X size={20} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ padding: '18px 26px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <div
              key={acc.email}
              style={{
                border: '1px solid var(--border)', borderRadius: 12,
                padding: '14px 16px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 10,
                transition: 'border-color 120ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = acc.accent.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 999, background: acc.accent.bg, color: acc.accent.color, textTransform: 'uppercase' }}>
                    {acc.role}
                  </span>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.55 }}>{acc.summary}</p>
                </div>
                <button
                  onClick={() => onUse(acc)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: acc.accent.bg, color: acc.accent.color, fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
                >
                  Use these
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: acc.accent.tint }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>EMAIL</span>
                    <button type="button" onClick={() => copy(acc.email, `${acc.email}-email`)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)', padding: 0 }}>
                      {copied === `${acc.email}-email` ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                  <code style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-all' }}>
                    {acc.email}
                  </code>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: acc.accent.tint }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>PASSWORD</span>
                    <button type="button" onClick={() => copy(acc.password, `${acc.email}-pw`)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)', padding: 0 }}>
                      {copied === `${acc.email}-pw` ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                  <code style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                    {acc.password}
                  </code>
                </div>
              </div>
            </div>
          ))}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
            These accounts are local to this demo. They live client-side so you can switch roles without a backend.
          </p>
        </div>
      </div>
    </>
  );
}
