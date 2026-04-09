import React from 'react';
import { Shield, Lock, Sparkles, FileText, Scale, Search, ShieldCheck, ArrowRight, Database, Cpu, CloudOff } from 'lucide-react';

/* ─── Miniature architecture diagram ─── */
function ArchitectureDiagram() {
  const boxStyle = (bg, border) => ({
    padding: '6px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
    backgroundColor: bg, border: `1px solid ${border}`, color: 'white',
    textAlign: 'center', lineHeight: 1.3,
  });
  const subText = { fontSize: 8, fontWeight: 400, opacity: 0.7, marginTop: 1 };

  return (
    <div style={{ padding: '16px 14px', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
        How YourAI Works — Your Data + AI Engines = Your Asset
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Data sources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 auto' }}>
          {[
            { label: 'Files & Docs', color: '#166534' },
            { label: 'CRM & SaaS', color: '#166534' },
            { label: 'Your Data', color: '#166534' },
          ].map(s => (
            <div key={s.label} style={{ ...boxStyle(s.color + '30', s.color + '50'), color: '#86EFAC', fontSize: 9, padding: '4px 8px' }}>{s.label}</div>
          ))}
        </div>

        {/* Arrow */}
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>→</div>

        {/* YourAI core */}
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(201,168,76,0.3)', backgroundColor: 'rgba(201,168,76,0.08)', textAlign: 'center' }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 13, color: 'white', marginBottom: 2 }}>
            <span style={{ color: 'white' }}>Your</span><span style={{ color: '#C9A84C' }}>AI</span>
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
            Private AI Infrastructure
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', marginTop: 6 }}>
            {['Zero retention', 'Encrypted', 'SOC 2'].map(t => (
              <span key={t} style={{ fontSize: 7, padding: '2px 5px', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>→</div>

        {/* AI Asset */}
        <div style={{ flex: '0 0 auto', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(96,165,250,0.3)', backgroundColor: 'rgba(96,165,250,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#93C5FD' }}>Your AI Asset</div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', marginTop: 3, lineHeight: 1.4 }}>
            Grows daily<br />100% yours
          </div>
        </div>
      </div>

      {/* AI Engines row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
        {['OpenAI', 'Anthropic', 'Google'].map(e => (
          <span key={e} style={{ fontSize: 8, padding: '3px 8px', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>{e}</span>
        ))}
      </div>
    </div>
  );
}

export default function ChatAuthLayout({ children }) {
  return (
    <div className="min-h-screen flex overflow-x-hidden">
      {/* Left column — 45% navy (hidden on mobile/tablet) */}
      <div className="hidden lg:flex flex-col" style={{ width: '45%', backgroundColor: 'var(--navy)', padding: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Background grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03 }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Glowing orbs */}
        <div style={{ position: 'absolute', top: '10%', right: '-8%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '-5%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '28px 36px' }}>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} color="#C9A84C" />
            </div>
            <div>
              <div style={{ fontSize: 19, lineHeight: 1.2 }}>
                <span style={{ fontFamily: "'DM Serif Display', serif", color: 'white', fontWeight: 700 }}>Your</span>
                <span style={{ fontFamily: "'DM Serif Display', serif", color: '#C9A84C', fontWeight: 700 }}>AI</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>Private AI Infrastructure</div>
            </div>
          </div>

          {/* Center content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
            {/* Badge */}
            <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, backgroundColor: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)', fontSize: 11, fontWeight: 600, color: '#C9A84C', letterSpacing: '0.04em' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#C9A84C' }} />
              PRIVATE AI INFRASTRUCTURE
            </span>

            {/* Hero text */}
            <div style={{ maxWidth: 380 }}>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: 'white', lineHeight: 1.25, margin: 0, fontWeight: 400 }}>
                Own Your AI.<br />
                <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.85)' }}>Run a Better</span><br />
                <span style={{ borderBottom: '3px solid #C9A84C', paddingBottom: 2 }}>Business.</span>
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 14, lineHeight: 1.65 }}>
                Built for environments where confidentiality is non-negotiable. Your data stays yours — forever.
              </p>
            </div>

            {/* Stats — from the legal page */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { value: '70%', label: 'Reduction in contract review time', bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.15)' },
                { value: '3.5x', label: 'Faster case law research', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.15)' },
                { value: '100%', label: 'Data stays within your firm', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.15)' },
                { value: '$0', label: 'Exposure to third-party data sharing', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
              ].map(({ value, label, bg, border }) => (
                <div key={label} style={{ padding: '14px 14px', borderRadius: 10, backgroundColor: bg, border: `1px solid ${border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'white', fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 3, lineHeight: 1.3 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* How YourAI helps — feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: FileText, title: 'Privilege-Preserving Contract Analysis', desc: 'AI that never sends clause language to external servers', accent: '#C9A84C' },
                { icon: Search, title: 'Accelerated Case Research', desc: 'Cross-reference past work with public legal databases in seconds', accent: '#60A5FA' },
                { icon: Scale, title: 'Compliant Document Drafting', desc: 'Traceable outputs matching your firm\'s tone and standards', accent: '#34D399' },
              ].map(({ icon: Icon, title, desc, accent }) => (
                <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} style={{ color: accent }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Architecture diagram */}
            <ArchitectureDiagram />

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: CloudOff, label: 'Zero Data Retention' },
                { icon: ShieldCheck, label: 'SOC 2 Ready' },
                { icon: Lock, label: 'You Own Your IP' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontSize: 10, borderRadius: 20, padding: '4px 11px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Icon size={11} style={{ color: '#C9A84C' }} /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
            &copy; 2026 YourAI &middot; Appinventiv
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
