import React from 'react';
import { Shield, Lock, Sparkles, FileText, Scale, Search, ShieldCheck, ArrowRight, Database, Cpu, CloudOff } from 'lucide-react';

/* ─── Product mockup showing contract review UI ─── */
function ProductMockup() {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', overflow: 'hidden',
      border: '1px solid #E5E7EB', maxWidth: 380, width: '100%', margin: '0 auto',
    }}>
      {/* Window chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
      </div>
      {/* App content */}
      <div style={{ display: 'flex', fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}>
        {/* Left sidebar */}
        <div style={{ width: 80, padding: '10px 8px', borderRight: '1px solid #E5E7EB', background: '#FAFAFA' }}>
          {['NDA Review', 'Summaries', 'Clause Check'].map(item => (
            <div key={item} style={{
              padding: '6px 8px', borderRadius: 6, marginBottom: 4, fontSize: 9, fontWeight: 500,
              color: item === 'NDA Review' ? 'var(--navy)' : '#9CA3AF',
              background: item === 'NDA Review' ? '#EFF6FF' : 'transparent',
            }}>{item}</div>
          ))}
        </div>
        {/* Center content */}
        <div style={{ flex: 1, padding: '10px 12px' }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--navy)', marginBottom: 8 }}>Non-Disclosure Agreement</div>
          <div style={{
            padding: '6px 8px', borderRadius: 6, fontSize: 9, lineHeight: 1.5,
            background: '#FEF9EE', border: '1px solid #FDE68A', color: '#92400E', marginBottom: 6,
          }}>
            Clause 4.2 flagged as confidential term with 5-year retention.
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 6, borderRadius: 3, background: '#F3F4F6', marginBottom: 5, width: i === 3 ? '60%' : '100%' }} />
          ))}
        </div>
        {/* Right panel */}
        <div style={{ width: 90, padding: '10px 8px', borderLeft: '1px solid #E5E7EB', background: '#FAFAFA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
            <Sparkles size={10} style={{ color: '#C9A84C' }} /> Ask YourAI
          </div>
          {['Summarize risk and propose safer language.', 'Cross-check with prior approved clauses.'].map((t, i) => (
            <div key={i} style={{
              padding: '5px 6px', borderRadius: 5, fontSize: 8, color: '#6B7280',
              background: '#F3F4F6', marginBottom: 4, lineHeight: 1.4,
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

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '28px 36px' }}>
          {/* Center content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
            {/* Logo */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 700 }}>
                <span style={{ color: 'var(--navy)' }}>Your</span>
                <span style={{ color: '#C9A84C' }}>AI</span>
              </span>
            </div>

            {/* Badge */}
            <span style={{
              alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              color: '#C9A84C', letterSpacing: '0.04em',
              backgroundColor: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.25)',
            }}>
              PRIVATE AI INFRASTRUCTURE
            </span>

            {/* Product mockup */}
            <ProductMockup />

            {/* Tagline */}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontFamily: "'DM Serif Display', serif", fontSize: 26, lineHeight: 1.3,
                margin: '0 0 8px 0', fontWeight: 400, color: 'var(--navy)',
              }}>
                Your Practice. Your Data. <span style={{ color: '#C9A84C' }}>Your AI.</span>
              </h1>
              <div style={{
                width: 40, height: 2, background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
                margin: '0 auto 10px',
              }} />
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
                Built for environments where confidentiality is non-negotiable. Your data never leaves your control.
              </p>
            </div>

            {/* Stats 2x2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { value: '70%', label: 'Time saved on research' },
                { value: '3.5x', label: 'Faster document drafting' },
                { value: '100%', label: 'Data confidentiality' },
                { value: '$0', label: 'Data exposure incidents' },
              ].map(({ value, label }) => (
                <div key={label} style={{
                  padding: '14px 16px', borderRadius: 10, textAlign: 'left',
                  backgroundColor: '#fff', border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { icon: CloudOff, label: 'Zero Data Retention' },
                { icon: ShieldCheck, label: 'SOC 2 Ready' },
                { icon: Lock, label: 'You Own Your IP' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, color: '#6B7280', padding: '5px 12px', borderRadius: 20,
                  backgroundColor: '#fff', border: '1px solid #E5E7EB',
                }}>
                  <Icon size={12} style={{ color: '#9CA3AF' }} /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ color: '#C4C4C4', fontSize: 11 }}>
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
