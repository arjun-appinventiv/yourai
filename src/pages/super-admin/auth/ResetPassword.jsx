import React, { useState, useMemo } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle, Circle, Loader } from 'lucide-react';
import AuthLayout from '../../../components/AuthLayout';

const strengthColors = ['#C65454', '#F97316', '#C9A84C', '#5CA868'];
const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

export default function ResetPassword() {
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guard: redirect to forgot-password if accessed directly without OTP verification
  if (!location.state?.otpVerified && !location.state?.email) {
    return <Navigate to="/super-admin/forgot-password" replace />;
  }

  const checks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const strength = Object.values(checks).filter(Boolean).length;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = strength >= 3 && password === confirm && confirm.length > 0 && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, 1000));
      setDone(true);
    } catch {
      setError('Failed to update password. Please try again.');
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    height: 42,
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '0 40px 0 40px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    outline: 'none',
  };
  const iconPos = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' };

  if (done) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="flex justify-center mb-4"><CheckCircle size={40} style={{ color: '#5CA868' }} /></div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '22px', color: 'var(--text-primary)' }}>Password updated</h1>
          <p className="mt-2" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your password has been updated successfully.</p>
          <Link to="/super-admin/login" className="mt-5 w-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--navy)', height: 42, borderRadius: '10px', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>
            Sign in now
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center">
        <div className="flex justify-center mb-4"><KeyRound size={40} style={{ color: 'var(--navy)' }} /></div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '24px', color: 'var(--text-primary)' }}>Set new password</h1>
        <p className="mt-2" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Choose a strong password for your operator account.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* New password */}
        <div>
          <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>New Password</label>
          <div className="relative">
            <Lock size={16} style={iconPos} />
            <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" style={inputStyle} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength bars */}
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: 4, backgroundColor: i < strength ? strengthColors[strength - 1] : 'var(--ice)' }} />
                ))}
                <span className="ml-2" style={{ fontSize: '12px', fontWeight: 500, color: strength > 0 ? strengthColors[strength - 1] : 'var(--text-muted)' }}>
                  {strength > 0 ? strengthLabels[strength - 1] : ''}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {[
                  [checks.length, 'At least 8 characters'],
                  [checks.upper, 'Contains uppercase letter'],
                  [checks.number, 'Contains number'],
                  [checks.special, 'Contains special character'],
                ].map(([ok, label]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    {ok ? <CheckCircle size={13} style={{ color: '#5CA868' }} /> : <Circle size={13} style={{ color: 'var(--text-muted)' }} />}
                    <span style={{ fontSize: '11px', color: ok ? '#5CA868' : 'var(--text-muted)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Confirm New Password</label>
          <div className="relative">
            <Lock size={16} style={iconPos} />
            <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" style={{ ...inputStyle, borderColor: mismatch ? '#C65454' : 'var(--border)' }} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {mismatch && <p className="mt-1" style={{ fontSize: '12px', color: '#C65454' }}>Passwords do not match</p>}
        </div>

        {error && (
          <div style={{ backgroundColor: '#F9E7E7', borderLeft: '3px solid #C65454', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
            <p style={{ fontSize: '13px', color: '#C65454', margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 text-white"
          style={{
            backgroundColor: canSubmit ? 'var(--navy)' : '#9CA3AF',
            height: 42,
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? <><Loader size={16} className="animate-spin" /> Updating...</> : 'Update Password'}
        </button>
      </form>
    </AuthLayout>
  );
}
