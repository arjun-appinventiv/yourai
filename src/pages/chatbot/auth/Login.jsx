import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader, Info } from 'lucide-react';
import ChatAuthLayout from '../../../components/ChatAuthLayout';

const MOCK_EMAIL = 'ryan@hartwell.com';
const MOCK_PASSWORD = 'Law@2026';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setLoadingText('Signing in...');

    await new Promise((r) => setTimeout(r, 1500));

    if (email === MOCK_EMAIL && password === MOCK_PASSWORD) {
      navigate('/chat', { replace: true });
    } else {
      setLoading(false);
      setLoadingText('');
      setError('Invalid email or password. Please check your credentials and try again.');
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
  const iconStyle = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' };

  return (
    <ChatAuthLayout>
      <div className="text-center">
        <span className="inline-flex items-center" style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em' }}>
          Law Firm Portal
        </span>
        <h1 className="mt-3" style={{ fontFamily: "'DM Serif Display', serif", fontSize: '26px', color: 'var(--text-primary)' }}>Welcome to YourAI</h1>
        <p className="mt-1" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sign in to your firm's AI workspace</p>
      </div>

      {/* SSO Buttons */}
      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => { setLoading(true); setLoadingText('Connecting to Google...'); setTimeout(() => navigate('/chat', { replace: true }), 1500); }}
          className="w-full flex items-center justify-center gap-3 transition-all"
          style={{ height: 42, borderRadius: '10px', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Sign in with Google
        </button>

        <button
          type="button"
          onClick={() => { setLoading(true); setLoadingText('Connecting to Microsoft...'); setTimeout(() => navigate('/chat', { replace: true }), 1500); }}
          className="w-full flex items-center justify-center gap-3 transition-all"
          style={{ height: 42, borderRadius: '10px', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
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

      {/* Demo credentials toggle */}
      <div className="mt-4 relative">
        <button
          type="button"
          onClick={() => setShowCreds(!showCreds)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: showCreds ? '#EFF6FF' : 'var(--ice-warm)', color: showCreds ? '#1D4ED8' : 'var(--text-muted)', fontSize: '12px', border: '1px solid transparent' }}
        >
          <Info size={14} />
          {showCreds ? 'Hide credentials' : 'Show demo credentials'}
        </button>
        {showCreds && (
          <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE' }}>
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: '11px', color: '#1D4ED8', fontWeight: 600 }}>EMAIL</span>
              <button onClick={() => setEmail(MOCK_EMAIL)} style={{ fontSize: '11px', color: '#1D4ED8', cursor: 'pointer', background: 'none', border: 'none' }}>Copy to field</button>
            </div>
            <code style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{MOCK_EMAIL}</code>
            <div className="flex items-center justify-between mb-1 mt-2">
              <span style={{ fontSize: '11px', color: '#1D4ED8', fontWeight: 600 }}>PASSWORD</span>
              <button onClick={() => setPassword(MOCK_PASSWORD)} style={{ fontSize: '11px', color: '#1D4ED8', cursor: 'pointer', background: 'none', border: 'none' }}>Copy to field</button>
            </div>
            <code style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{MOCK_PASSWORD}</code>
          </div>
        )}
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
          <div className="flex items-start gap-2" style={{ backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
            <p style={{ fontSize: '13px', color: '#9B2C2C' }}>{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 text-white transition-colors" style={{ backgroundColor: loading ? 'var(--navy-mid)' : 'var(--navy)', height: 42, borderRadius: '10px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? <><Loader size={16} className="animate-spin" /> {loadingText}</> : 'Sign In'}
        </button>
      </form>

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
