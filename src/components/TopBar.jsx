import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Search, Bell, Building2, Users, CreditCard, BarChart3, Shield, BookOpen, FileText, Plug, Database, Workflow, FileBarChart, Settings, BookMarked, KeyRound, LogOut, X } from 'lucide-react';
import { logout } from '../lib/auth';

const pageConfig = {
  '/super-admin/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
  '/super-admin/tenants': { title: 'Tenant Management', icon: Building2 },
  '/super-admin/users': { title: 'Platform Users', icon: Users },
  '/super-admin/billing': { title: 'Billing & Subscriptions', icon: CreditCard },
  '/super-admin/usage': { title: 'Usage & Analytics', icon: BarChart3 },
  '/super-admin/compliance': { title: 'Compliance & Audit', icon: Shield },
  '/super-admin/static-content': { title: 'Static Content', icon: BookOpen },
  '/super-admin/integrations': { title: 'Integrations', icon: Plug },
  '/super-admin/knowledge-base': { title: 'Knowledge Base', icon: Database },
  '/super-admin/workflows': { title: 'Workflow Templates', icon: Workflow },
  '/super-admin/notifications': { title: 'Notifications', icon: Bell },
  '/super-admin/settings': { title: 'Platform Settings', icon: Settings },
  '/super-admin/user-stories': { title: 'User Stories', icon: BookMarked },
};

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = pageConfig[location.pathname] || { title: 'Super Admin', icon: Building2 };
  const PageIcon = config.icon;
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    try { await logout(); } catch { /* ignore */ }
    try {
      localStorage.removeItem('yourai_current_email');
    } catch { /* ignore */ }
    navigate('/super-admin/login');
  };

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-6 bg-white z-30"
        style={{ left: 240, height: 52, borderBottom: '1px solid var(--border)' }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2" style={{ fontSize: '13px' }}>
          <PageIcon size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Super Admin</span>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{config.title}</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search..."
              className="pl-8 pr-3 rounded-lg"
              style={{
                width: 140,
                height: 32,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--ice-warm)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <button className="relative p-1.5 rounded-md hover:bg-gray-50 transition-colors">
            <Bell size={17} style={{ color: 'var(--text-muted)' }} />
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: '#C65454', fontSize: '9px', fontWeight: 600 }}
            >
              3
            </span>
          </button>

          {/* Profile avatar with dropdown */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full flex items-center justify-center text-white"
              style={{ width: 30, height: 30, backgroundColor: 'var(--navy)', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              title="Account menu"
            >
              AO
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                width: 200, background: '#fff',
                border: '1px solid var(--border)', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(10, 36, 99, 0.12)', overflow: 'hidden', zIndex: 50,
              }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Arjun Ops</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Super Admin</div>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); setShowPasswordModal(true); }}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ice-warm)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <KeyRound size={13} /> Edit password
                </button>
                <button
                  onClick={handleSignOut}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', fontSize: 12, color: '#C65454', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ice-warm)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPasswordModal && <EditPasswordModal onClose={() => setShowPasswordModal(false)} />}
    </>
  );
}

/* ═══════ Edit Password Modal ═══════ */
function EditPasswordModal({ onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const strong = (pw) => pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);
  const canSave = current && next && confirm && !saving;

  const handleSave = () => {
    setError('');
    if (!strong(next)) {
      setError('New password must be at least 8 characters and include upper-case, lower-case, and a number.');
      return;
    }
    if (next !== confirm) {
      setError('The new password and confirmation do not match.');
      return;
    }
    setSaving(true);
    // Simulate backend call; in production this would call /api/auth/change-password
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(onClose, 1200);
    }, 800);
  };

  const inputStyle = {
    width: '100%', height: 40, padding: '0 12px',
    border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none',
    background: '#fff', color: 'var(--text-primary)',
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,36,99,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, boxShadow: '0 12px 32px rgba(10,36,99,0.18)' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Edit password</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>You'll stay signed in on this device after saving.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {saved ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 14, color: '#5CA868', fontWeight: 500 }}>✓ Password updated</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Current password</label>
                <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>New password</label>
                <input type="password" value={next} onChange={(e) => setNext(e.target.value)} style={inputStyle} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>At least 8 characters, including upper-case, lower-case, and a number.</div>
              </div>
              <div>
                <label style={labelStyle}>Confirm new password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
              </div>
              {error && <div style={{ fontSize: 12, color: '#C65454' }}>{error}</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        {!saved && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button
              disabled={!canSave}
              onClick={handleSave}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none',
                background: canSave ? 'var(--navy)' : 'var(--ice)',
                color: canSave ? '#fff' : 'var(--text-muted)',
                fontSize: 13, fontWeight: 500,
                cursor: canSave ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Saving...' : 'Save password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
