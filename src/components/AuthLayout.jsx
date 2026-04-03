import React from 'react';
import { Shield, Lock, Eye } from 'lucide-react';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Left column — 45% navy */}
      <div className="hidden lg:flex flex-col justify-between" style={{ width: '45%', backgroundColor: 'var(--navy)', padding: '32px 40px' }}>
        {/* Logo */}
        <div>
          <div className="text-xl mb-1">
            <span style={{ fontFamily: "'DM Serif Display', serif", color: 'white' }}>Your</span>
            <span style={{ fontFamily: "'DM Serif Display', serif", color: '#C9A84C' }}>AI</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>Internal Operations Portal</div>
        </div>

        {/* Center quote */}
        <div className="flex-1 flex items-center justify-center">
          <div style={{ maxWidth: 320 }}>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: '28px', color: 'white', lineHeight: 1.4 }}>
              Secure access for YourAI platform operators.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              {[
                { icon: Shield, label: 'SOC 2 Ready' },
                { icon: Lock, label: 'End-to-end encrypted' },
                { icon: Eye, label: 'Full audit logging' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'white', fontSize: '11px', borderRadius: '20px', padding: '4px 12px' }}>
                  <Icon size={12} /> {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
          &copy; 2026 YourAI &middot; Appinventiv
        </div>
      </div>

      {/* Right column — 55% light */}
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--ice-warm)', padding: '40px 24px' }}>
        <div className="w-full" style={{ maxWidth: 400 }}>
          <div className="bg-white" style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
