import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader, Info } from 'lucide-react';
import AuthLayout from '../../../components/AuthLayout';
import { useAuth } from '../../../context/AuthContext';
import { trackLogin } from '../../../lib/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  // Already logged in → redirect to dashboard
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  // Disable Sign In when fields are empty or loading
  const isFormValid = email.trim() !== '' && password.trim() !== '';
  const isDisabled = !isFormValid || loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDisabled) return; // guard against double-submit

    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        setLoading(false);
        setError('Invalid email or password. Please try again.');
        return;
      }

      if (result.requiresOtp) {
        navigate('/super-admin/verify-otp', { replace: true });
        return;
      }

      trackLogin(email);
      localStorage.setItem('yourai_current_email', email);
      navigate('/super-admin/dashboard', { replace: true });
    } catch {
      setLoading(false);
      setError('A network error occurred. Please check your connection and try again.');
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
    <AuthLayout>
      <div className="text-center">
        <span className="inline-flex items-center" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '20px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', padding: '3px 10px' }}>
          SUPER ADMIN
        </span>
        <h1 className="mt-4" style={{ fontFamily: "'DM Serif Display', serif", fontSize: '26px', color: 'var(--text-primary)' }}>Welcome back</h1>
        <p className="mt-1" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sign in to the operations portal</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Email address</label>
          <div className={inputWrap}>
            <Mail size={16} style={iconStyle} />
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }} placeholder="Enter your email" style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
          <div className={inputWrap}>
            <Lock size={16} style={iconStyle} />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }} placeholder="Enter your password" style={{ ...inputStyle, paddingRight: 40 }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="text-right mt-1.5">
            <Link to="/super-admin/forgot-password" className="hover:underline" style={{ fontSize: '12px', color: 'var(--slate)' }}>Forgot password?</Link>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2" style={{ backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
            <p style={{ fontSize: '13px', color: '#9B2C2C', margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isDisabled}
          className="w-full flex items-center justify-center gap-2 text-white transition-colors"
          style={{
            backgroundColor: isDisabled ? '#94A3B8' : 'var(--navy)',
            height: 42,
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled && !loading ? 0.7 : 1,
          }}
        >
          {loading ? <><Loader size={16} className="animate-spin" /> Signing in...</> : 'Sign In'}
        </button>
      </form>

      {/* Demo credentials panel */}
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
              <button type="button" onClick={() => setEmail('arjun@appinventiv.com')} style={{ fontSize: '11px', color: '#1D4ED8', cursor: 'pointer', background: 'none', border: 'none' }}>Copy to field</button>
            </div>
            <code style={{ fontSize: '12px', color: 'var(--text-primary)' }}>arjun@appinventiv.com</code>
            <div className="flex items-center justify-between mb-1 mt-2">
              <span style={{ fontSize: '11px', color: '#1D4ED8', fontWeight: 600 }}>PASSWORD</span>
              <button type="button" onClick={() => setPassword('Admin@123')} style={{ fontSize: '11px', color: '#1D4ED8', cursor: 'pointer', background: 'none', border: 'none' }}>Copy to field</button>
            </div>
            <code style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Admin@123</code>
            <div className="mt-2">
              <span style={{ fontSize: '11px', color: '#1D4ED8', fontWeight: 600 }}>FORGOT PASSWORD OTP</span>
              <code className="ml-2" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>123456</code>
            </div>
          </div>
        )}
      </div>

      <p className="text-center mt-4" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        Access is restricted to authorised operators only.
      </p>
    </AuthLayout>
  );
}
