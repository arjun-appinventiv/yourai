import React from 'react';
import { Shield, Lock, Sparkles, FileText, Scale, Search, ShieldCheck, ArrowRight, Database, Cpu, CloudOff } from 'lucide-react';

/* ─── Product mockup showing contract review UI ─── */
function ProductMockup() {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, boxShadow: '0 10px 40px rgba(0,0,0,0.12)', overflow: 'hidden',
      border: '1px solid #F0F3F6', width: '100%',
    }}>
      {/* Window chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#F8F4ED', borderBottom: '1px solid #F0F3F6' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#C65454' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E8A33D' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#5CA868' }} />
      </div>
      {/* App content */}
      <div style={{ display: 'flex', fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
        {/* Left sidebar */}
        <div style={{ width: 95, padding: '14px 10px', borderRight: '1px solid #F0F3F6', background: '#FAFAFA' }}>
          {['NDA Review', 'Summaries', 'Clause Check'].map(item => (
            <div key={item} style={{
              padding: '8px 10px', borderRadius: 7, marginBottom: 5, fontSize: 10, fontWeight: 500,
              color: item === 'NDA Review' ? 'var(--navy)' : '#9CA3AF',
              background: item === 'NDA Review' ? '#F0F3F6' : 'transparent',
            }}>{item}</div>
          ))}
        </div>
        {/* Center content */}
        <div style={{ flex: 1, padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', marginBottom: 10 }}>Non-Disclosure Agreement</div>
          <div style={{
            padding: '8px 10px', borderRadius: 7, fontSize: 10, lineHeight: 1.5,
            background: '#FEF9EE', border: '1px solid #FBEED5', color: '#E8A33D', marginBottom: 10,
          }}>
            Clause 4.2 flagged as confidential term with 5-year retention.
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 7, borderRadius: 3, background: '#F3F4F6', marginBottom: 6, width: i === 3 ? '60%' : '100%' }} />
          ))}
        </div>
        {/* Right panel */}
        <div style={{ width: 110, padding: '14px 10px', borderLeft: '1px solid #F0F3F6', background: '#FAFAFA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--navy)', marginBottom: 10 }}>
            <Sparkles size={12} style={{ color: '#C9A84C' }} /> Ask YourAI
          </div>
          {['Summarize risk and propose safer language.', 'Cross-check with prior approved clauses.'].map((t, i) => (
            <div key={i} style={{
              padding: '6px 8px', borderRadius: 6, fontSize: 9, color: '#9CA3AF',
              background: '#F3F4F6', marginBottom: 5, lineHeight: 1.4,
            }}>{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatAuthLayout({ children }) {
  return (
    <div className="min-h-screen flex overflow-x-hidden">
      {/* Left column — 45% light warm panel (hidden on mobile/tablet) */}
      <div className="hidden lg:flex flex-col" style={{
        width: '45%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #FEFDFB 0%, #FBF8F1 50%, #F5F0E6 100%)',
      }}>
        {/* Faint golden grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(201,168,76,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 40px 20px' }}>
          {/* Center content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
            {/* Logo */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 700 }}>
                <span style={{ color: 'var(--navy)' }}>Your</span>
                <span style={{ color: '#C9A84C' }}>AI</span>
              </span>
            </div>

            {/* Badge */}
            <div style={{ textAlign: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 18px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                color: '#C9A84C', letterSpacing: '0.05em',
                backgroundColor: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.25)',
              }}>
                PRIVATE AI INFRASTRUCTURE
              </span>
            </div>

            {/* Product mockup */}
            <ProductMockup />

            {/* Tagline */}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontFamily: "'DM Serif Display', serif", fontSize: 30, lineHeight: 1.3,
                margin: '0 0 8px 0', fontWeight: 400, color: 'var(--navy)',
              }}>
                Your Practice. Your Data. <span style={{ color: '#C9A84C' }}>Your AI.</span>
              </h1>
              <div style={{
                width: 48, height: 2, background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
                margin: '0 auto 10px',
              }} />
              <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
                Built for environments where confidentiality is non-negotiable. Your data never leaves your control.
              </p>
            </div>

            {/* Stats 2x2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { value: '70%', label: 'Time saved on research' },
                { value: '3.5x', label: 'Faster document drafting' },
                { value: '100%', label: 'Data confidentiality' },
                { value: '$0', label: 'Data exposure incidents' },
              ].map(({ value, label }) => (
                <div key={label} style={{
                  padding: '18px 20px', borderRadius: 12, textAlign: 'left',
                  backgroundColor: '#fff', border: '1px solid #F0F3F6',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)', fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { icon: CloudOff, label: 'Zero Data Retention' },
                { icon: ShieldCheck, label: 'SOC 2 Ready' },
                { icon: Lock, label: 'You Own Your IP' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: '#9CA3AF', padding: '6px 14px', borderRadius: 20,
                  backgroundColor: '#fff', border: '1px solid #F0F3F6',
                }}>
                  <Icon size={13} style={{ color: '#9CA3AF' }} /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ color: '#C4C4C4', fontSize: 11, textAlign: 'center', paddingTop: 8 }}>
            &copy; 2026 YourAI – Appinventiv
          </div>
        </div>
      </div>

      {/* Right column — 55% light */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 lg:p-12" style={{ backgroundColor: 'var(--ice-warm)' }}>
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white p-6 sm:p-8 md:p-10" style={{ border: '1px solid var(--border)', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
