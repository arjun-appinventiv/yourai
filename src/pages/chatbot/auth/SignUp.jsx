import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Building2, Lock, Eye, EyeOff, Loader, Check, Circle, AlertTriangle, XCircle } from 'lucide-react';
import ChatAuthLayout from '../../../components/ChatAuthLayout';
import { signUp as apiSignUp, claimSession } from '../../../lib/auth';

// Removed: setTimeout mock delays — replaced with real API calls
// See: tech-stack.md — Backend API section

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [firmName, setFirmName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // ─── SSO (Google / Microsoft) continue flow ───
  // When the provider returns, we receive the user's verified email + name
  // and pre-fill the signup form with those fields locked. The user then
  // supplies password + firm name to finish creating the account.
  const [ssoProvider, setSsoProvider] = useState(null); // 'google' | 'microsoft' | null
  const navigate = useNavigate();

  // Simulates the OAuth callback — in production the provider would return
  // these fields to our /api/auth/callback/:provider endpoint.
  const handleSsoContinue = (provider) => {
    const demo = provider === 'google'
      ? { name: 'Ryan Melade', email: 'ryan.melade@gmail.com' }
      : { name: 'Ryan Melade', email: 'ryan.melade@outlook.com' };
    setSsoProvider(provider);
    setFullName(demo.name);
    setEmail(demo.email);
    setError('');
  };

  const handleSsoReset = () => {
    setSsoProvider(null);
    setFullName('');
    setEmail('');
  };

  // Domain mismatch detection
  const domainMismatch = useMemo(() => {
    if (!email.includes('@') || !firmName.trim()) return false;
    const domain = email.split('@')[1]?.toLowerCase().replace(/\.(com|org|net|io|co|law|legal)$/, '').replace(/[^a-z]/g, '') || '';
    const firm = firmName.toLowerCase().replace(/[^a-z]/g, '');
    if (!domain || !firm) return false;
    return !firm.includes(domain) && !domain.includes(firm);
  }, [email, firmName]);

  const isAlreadyRegistered = error.toLowerCase().includes('already registered') || error.toLowerCase().includes('already exists');

  const passwordChecks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordChecks.every((c) => c.met)) {
      setError('Please meet all password requirements');
      return;
    }

    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    // Removed: setTimeout mock delay — real API call
    try {
      const result = await apiSignUp({ name: fullName, email, password, orgName: firmName });
      if (result.success) {
        try { localStorage.setItem('yourai_current_email', email); } catch { /* ignore */ }
        claimSession(email);
        navigate('/chat/onboarding', { replace: true });
      } else {
        setError(result.error || 'Sign up failed. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Sign up failed. Please try again.');
      setLoading(false);
    }
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
  const iconStyle = {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
  };

  return (
    <ChatAuthLayout>
      <div className="text-center">
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '26px', color: 'var(--text-primary)' }}>
          Create your account
        </h1>
        <p className="mt-1" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Start your firm's AI-powered workspace
        </p>
      </div>

      {/* SSO Buttons — hidden once an SSO account has been chosen */}
      {!ssoProvider && (
        <>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => handleSsoContinue('google')}
              className="w-full flex items-center justify-center gap-3 transition-all"
              style={{ height: 42, borderRadius: '10px', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8F4ED'; e.currentTarget.style.borderColor = '#D6DDE4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign up with Google
            </button>

            <button
              type="button"
              onClick={() => handleSsoContinue('microsoft')}
              className="w-full flex items-center justify-center gap-3 transition-all"
              style={{ height: 42, borderRadius: '10px', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8F4ED'; e.currentTarget.style.borderColor = '#D6DDE4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H12z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
              Sign up with Microsoft
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mt-5 mb-1">
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
          </div>
        </>
      )}

      {/* SSO banner — shown after SSO provider returns with verified email + name */}
      {ssoProvider && (
        <div className="mt-6 flex items-center justify-between" style={{ padding: '10px 14px', background: '#F0F3F6', border: '1px solid #D6DDE4', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {ssoProvider === 'google' ? (
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
            )}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Continuing with {ssoProvider === 'google' ? 'Google' : 'Microsoft'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Add a password and firm name to finish.</div>
            </div>
          </div>
          <button type="button" onClick={handleSsoReset} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 11, textDecoration: 'underline', cursor: 'pointer' }}>
            Use different account
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Full Name */}
        <div>
          <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Full Name {ssoProvider && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· verified by {ssoProvider === 'google' ? 'Google' : 'Microsoft'}</span>}
          </label>
          <div className={inputWrap}>
            <User size={16} style={iconStyle} />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ryan Melade"
              required
              disabled={!!ssoProvider}
              style={{ ...inputStyle, background: ssoProvider ? 'var(--ice-warm)' : inputStyle.background, color: ssoProvider ? 'var(--text-secondary)' : inputStyle.color, cursor: ssoProvider ? 'not-allowed' : 'text' }}
            />
          </div>
        </div>

        {/* Work Email */}
        <div>
          <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Work Email {ssoProvider && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· verified by {ssoProvider === 'google' ? 'Google' : 'Microsoft'}</span>}
          </label>
          <div className={inputWrap}>
            <Mail size={16} style={iconStyle} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourfirm.com"
              required
              disabled={!!ssoProvider}
              style={{ ...inputStyle, background: ssoProvider ? 'var(--ice-warm)' : inputStyle.background, color: ssoProvider ? 'var(--text-secondary)' : inputStyle.color, cursor: ssoProvider ? 'not-allowed' : 'text' }}
            />
          </div>
          {!ssoProvider && (
            <p className="mt-1" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Use your firm email so we can connect to the right workspace.</p>
          )}
        </div>

        {/* Firm Name */}
        <div>
          <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Firm Name</label>
          <div className={inputWrap}>
            <Building2 size={16} style={iconStyle} />
            <input
              type="text"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="Hartwell & Associates"
              required
              style={inputStyle}
            />
          </div>
          <p className="mt-1" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Solo practitioner? You can use your own name or chambers name.</p>
          {domainMismatch && (
            <div className="flex items-start gap-2 mt-2" style={{ backgroundColor: '#FBEED5', borderRadius: 8, padding: '10px 14px', border: '1px solid #FBEED5' }}>
              <AlertTriangle size={14} style={{ color: '#E8A33D', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '12px', color: '#E8A33D', lineHeight: 1.5 }}>If your work email domain does not match your firm name, we'll ask you to confirm firm affiliation before workspace access is approved.</p>
            </div>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
          <div className={inputWrap}>
            <Lock size={16} style={iconStyle} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              style={{ ...inputStyle, paddingRight: 40 }}
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

          {/* Password requirement checklist */}
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {passwordChecks.map(({ label, met }) => (
              <div key={label} className="flex items-center gap-1.5">
                {met ? (
                  <Check size={13} style={{ color: '#5CA868', flexShrink: 0 }} />
                ) : (
                  <Circle size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                )}
                <span style={{ fontSize: '11px', color: met ? '#5CA868' : 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Confirm Password</label>
          <div className={inputWrap}>
            <Lock size={16} style={iconStyle} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              style={{ ...inputStyle, paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {!passwordsMatch && (
            <p className="mt-1" style={{ fontSize: '12px', color: '#C65454' }}>Passwords do not match</p>
          )}
        </div>

        {/* Terms checkbox */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            id="terms"
            style={{ marginTop: 3, accentColor: 'var(--navy)', cursor: 'pointer' }}
          />
          <label htmlFor="terms" style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, cursor: 'pointer' }}>
            I agree to the{' '}
            <a href="/terms" style={{ color: 'var(--navy)', textDecoration: 'none' }} onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')} onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" style={{ color: 'var(--navy)', textDecoration: 'none' }} onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')} onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}>
              Privacy Policy
            </a>
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2" style={{ backgroundColor: '#F9E7E7', borderRadius: 8, padding: '10px 14px', border: '1px solid #F9E7E7' }}>
            <XCircle size={14} style={{ color: '#C65454', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '12px', color: '#C65454', lineHeight: 1.5 }}>
              {isAlreadyRegistered ? (
                <>This email is already registered. <Link to="/chat/login" style={{ color: '#1E3A8A', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link> or request a password reset to continue.</>
              ) : error}
            </p>
          </div>
        )}

        {/* Submit button */}
        {(() => {
          const allMet = passwordChecks.every((c) => c.met);
          const canSubmit = fullName.trim() && email.trim() && firmName.trim() && password && confirmPassword && password === confirmPassword && allMet && agreed && !loading;
          return (
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 text-white transition-colors"
          style={{
            backgroundColor: !canSubmit ? '#9CA3AF' : 'var(--navy)',
            height: 42,
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            cursor: !canSubmit ? 'not-allowed' : 'pointer',
            opacity: !canSubmit && !loading ? 0.7 : 1,
          }}
        >

          {loading ? (
            <>
              <Loader size={16} className="animate-spin" /> Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
          );
        })()}
      </form>

      {/* Sign in link */}
      <p className="text-center mt-4" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link to="/chat/login" className="hover:underline" style={{ color: 'var(--navy)', fontWeight: 500 }}>
          Sign In
        </Link>
      </p>

      {/* Footer */}
      <p className="text-center mt-3" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        Private &amp; encrypted. Your data never leaves your firm's environment.
      </p>
    </ChatAuthLayout>
  );
}
