import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Lock, AlertTriangle } from 'lucide-react';
import OrgSidebar from './OrgSidebar';
import OrgTopBar from './OrgTopBar';
import { useRole } from './RoleContext';
import { useSessionGuard } from '../../lib/useSessionGuard';

export default function OrgLayout() {
  const { role, setRole } = useRole();
  const navigate = useNavigate();
  const session = useSessionGuard({
    idleTimeoutMs: 30 * 60 * 1000,
    warningLeadMs: 2 * 60 * 1000,
    blockPollMs: 30 * 1000,
  });

  // ─── Blocked / Timed-out / Superseded screens ────────────────────────
  if (session.state.status === 'blocked' || session.state.status === 'timed-out' || session.state.status === 'superseded') {
    const isBlocked = session.state.status === 'blocked';
    const isSuperseded = session.state.status === 'superseded';
    const reason = isBlocked ? session.state.reason : null;
    const title = isBlocked
      ? (reason === 'tenant' ? 'Organisation Blocked' : 'Access Blocked')
      : isSuperseded ? 'Signed in on another device' : 'Session expired';
    const body = isBlocked
      ? (reason === 'tenant'
          ? 'Your organisation has been blocked by an administrator. All users from your firm have lost access to YourAI. If you believe this is a mistake, please reach out to YourAI support.'
          : 'Your account has been blocked by your administrator. You no longer have access to YourAI. If you believe this is a mistake, please reach out to your firm\'s admin or contact support.')
      : isSuperseded
        ? 'Your account was signed in on another device or browser. For security, only one active session is allowed per account. Sign in again here to continue on this device.'
        : 'You were signed out after 30 minutes of inactivity. This keeps your data secure. Please sign back in to continue.';
    const handleSignOut = async () => { await session.signOut(); navigate('/app/login'); };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 24, background: '#F8F4ED', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: isBlocked ? '#F9E7E7' : '#FBEED5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Lock size={32} style={{ color: isBlocked ? '#C65454' : '#E8A33D' }} />
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#0A2463', margin: 0 }}>{title}</h1>
        <p style={{ fontSize: 15, color: '#6B7885', maxWidth: 440, marginTop: 12, lineHeight: 1.6 }}>{body}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button onClick={handleSignOut} style={{ padding: '10px 20px', borderRadius: 6, background: '#0A2463', color: '#fff', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {isBlocked ? 'Sign out' : 'Sign in again'}
          </button>
          {isBlocked && (
            <a href="mailto:support@yourai.com" style={{ padding: '10px 20px', borderRadius: 6, color: '#0A2463', border: '1px solid #0A2463', fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Contact support
            </a>
          )}
        </div>
      </div>
    );
  }

  const idleWarning = session.state.status === 'idle-warning' ? (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 36, 99, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, maxWidth: 400, boxShadow: '0 12px 32px rgba(10, 36, 99, 0.14)', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FBEED5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertTriangle size={22} style={{ color: '#E8A33D' }} />
        </div>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#0A2463', margin: '0 0 8px' }}>Still there?</h3>
        <p style={{ fontSize: 13, color: '#6B7885', margin: '0 0 20px', lineHeight: 1.6 }}>You've been inactive for a while. For your security, you'll be signed out in about 2 minutes.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={async () => { await session.signOut(); navigate('/app/login'); }} style={{ padding: '8px 16px', borderRadius: 6, background: 'transparent', color: '#6B7885', border: '1px solid #D6DDE4', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Sign out now</button>
          <button onClick={session.stayActive} style={{ padding: '8px 16px', borderRadius: 6, background: '#0A2463', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Stay signed in</button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F4ED' }}>
      {idleWarning}
      <OrgSidebar />
      <OrgTopBar />

      <main className="pb-12" style={{ marginLeft: 240, paddingTop: 52 }}>
        <div style={{ padding: '28px 32px' }}>
          <Outlet />
        </div>
      </main>

      {/* Demo banner — uses brand navy + gold */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between"
        style={{
          height: 36,
          backgroundColor: '#0A2463',
          color: 'rgba(255,255,255,0.7)',
          padding: '0 24px',
          fontSize: '12px',
        }}
      >
        <span>YourAI Org Admin — Prototype v1.0 — For stakeholder review only</span>
        <div className="flex items-center gap-2">
          <span style={{ marginRight: 8, color: 'rgba(255,255,255,0.4)' }}>Switch role:</span>
          {['Admin', 'Manager', 'Team'].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                fontSize: '11px',
                fontWeight: role === r ? 600 : 400,
                padding: '2px 10px',
                borderRadius: '10px',
                border: role === r ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,0.2)',
                backgroundColor: role === r ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: role === r ? '#C9A84C' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
