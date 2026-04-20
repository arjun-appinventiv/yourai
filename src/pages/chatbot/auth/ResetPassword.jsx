import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import ChatAuthLayout from '../../../components/ChatAuthLayout';

/**
 * Legacy route — we moved from magic-link password reset to OTP-based reset.
 * Any existing /chat/reset-password?token=... links in the wild are no
 * longer valid. This page gracefully redirects users to the new forgot-password
 * flow after a brief explanation, and auto-redirects after 3 seconds.
 */
export default function ResetPassword() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/chat/forgot-password'), 3000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <ChatAuthLayout>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FBEED5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={26} color="#E8A33D" />
          </div>
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--text-primary)', margin: 0 }}>
          This link is no longer used
        </h1>
        <p className="mt-3 mx-auto" style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.6 }}>
          We've updated how password reset works. Instead of a reset link, we now send a
          6-digit code to your email. You'll be redirected in a moment — or click below to
          start again.
        </p>
        <Link
          to="/chat/forgot-password"
          className="inline-block mt-5 text-white"
          style={{ padding: '10px 20px', backgroundColor: 'var(--navy)', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
        >
          Reset with a code
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
