import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SUPER_ADMIN_NAV } from '../lib/superAdminNav';

// Shared nav definition lives in src/lib/superAdminNav.ts so the FRD Generator
// can populate its Module dropdown from the same source of truth.
// Items flagged `hiddenFromNav` stay routable but are not rendered here.
const navSections = SUPER_ADMIN_NAV
  .map(section => ({
    label: section.label,
    items: section.items
      .filter(item => !item.hiddenFromNav)
      .map(item => ({
        label: item.label,
        icon: Icons[item.iconName] || Icons.Circle,
        path: item.path,
      })),
  }))
  .filter(section => section.items.length > 0);

export default function Sidebar() {
  const [showLogout, setShowLogout] = useState(false);
  const { logout, operator } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/super-admin/login');
  };

  return (
    <div
      className="fixed left-0 top-0 bottom-0 flex flex-col z-40"
      style={{
        width: 240,
        backgroundColor: 'var(--navy)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo — prominent brand */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="flex-shrink-0 rounded-lg flex items-center justify-center" style={{ width: 36, height: 36, backgroundColor: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
            <span style={{ fontFamily: "'DM Serif Display', serif", color: '#C9A84C', fontSize: '18px', fontWeight: 700 }}>Y</span>
          </div>
          <div>
            <div style={{ fontSize: '17px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", color: 'white', fontWeight: 700 }}>Your</span>
              <span style={{ fontFamily: "'DM Serif Display', serif", color: '#C9A84C', fontWeight: 700 }}>AI</span>
            </div>
            <span
              className="inline-block px-2 py-px rounded text-white"
              style={{ backgroundColor: '#C65454', fontSize: '8px', fontWeight: 600, letterSpacing: '0.06em', marginTop: 3 }}
            >
              SUPER ADMIN
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 pt-2 px-2.5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                padding: '16px 14px 6px',
                fontWeight: 500,
              }}
            >
              {section.label}
            </div>
            {section.items.map(({ label, icon: Icon, path }) => (
              <NavLink
                key={label}
                to={path}
                className="flex items-center gap-2.5 transition-colors"
                style={({ isActive }) => ({
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                  fontSize: '13px',
                  fontWeight: isActive ? 500 : 400,
                  lineHeight: '1.5',
                  display: 'flex',
                  marginBottom: '1px',
                  transition: 'background-color 150ms, color 150ms',
                })}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.classList.contains('active')) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.backgroundColor = isActive ? 'rgba(255,255,255,0.08)' : 'transparent';
                }}
              >
                <Icon size={15} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="relative" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px' }}>
        {showLogout && (
          <div className="absolute bottom-full left-3 right-3 mb-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--navy-mid)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
            <p className="text-xs text-white mb-2.5">Sign out of the operator portal?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLogout(false)} className="flex-1 py-1.5 rounded-md text-xs" style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>Cancel</button>
              <button onClick={handleLogout} className="flex-1 py-1.5 rounded-md text-xs text-white" style={{ backgroundColor: '#C65454' }}>Sign Out</button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-white" style={{ fontSize: '13px' }}>{operator?.name || 'Appinventiv Ops'}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>Internal access only</div>
          </div>
          <button onClick={() => setShowLogout(!showLogout)} className="p-1.5 rounded-md transition-colors hover:bg-red-900/30" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
