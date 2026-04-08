import React from 'react';
import { Shield, Lock, Eye, FileText, Sparkles, Scale, BarChart3, Users, Zap, CheckCircle, ArrowRight } from 'lucide-react';

export default function ChatAuthLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Left column — 45% navy with rich visuals */}
      <div className="hidden lg:flex flex-col" style={{ width: '45%', backgroundColor: 'var(--navy)', padding: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Animated background grid pattern */}
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
        <div style={{ position: 'absolute', top: '15%', right: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,78,216,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '32px 40px' }}>
          {/* Logo */}
          <div>
            <div className="flex items-center gap-3">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} color="#C9A84C" />
              </div>
              <div>
                <div style={{ fontSize: 20, lineHeight: 1.2 }}>
                  <span style={{ fontFamily: "'DM Serif Display', serif", color: 'white', fontWeight: 700 }}>Your</span>
                  <span style={{ fontFamily: "'DM Serif Display', serif", color: '#C9A84C', fontWeight: 700 }}>AI</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 1 }}>Private AI Intelligence for Law Firms</div>
              </div>
            </div>
          </div>

          {/* Center content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
            {/* Hero text */}
            <div style={{ maxWidth: 360 }}>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: 'white', lineHeight: 1.35, margin: 0 }}>
                The AI workspace your firm has been waiting for.
              </p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 12, lineHeight: 1.6 }}>
                Analyze contracts, research case law, and generate deliverables — all from one secure platform.
              </p>
            </div>

            {/* Feature cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: FileText, title: 'Contract Analysis', desc: 'AI reviews 23 clause types in under 5 seconds', accent: '#C9A84C' },
                { icon: Scale, title: 'Legal Research', desc: 'Cited answers from your documents + case law', accent: '#60A5FA' },
                { icon: BarChart3, title: 'Risk Reports', desc: 'Auto-generated risk memos ready for partner review', accent: '#34D399' },
              ].map(({ icon: Icon, title, desc, accent }) => (
                <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: accent + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} style={{ color: accent }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{desc}</div>
                  </div>
                  <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { value: '500+', label: 'Law firms' },
                { value: '2M+', label: 'Documents analyzed' },
                { value: '99.8%', label: 'Uptime SLA' },
              ].map(({ value, label }, i) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#C9A84C', fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Shield, label: 'SOC 2 Compliant' },
                { icon: Lock, label: 'Bank-grade Encryption' },
                { icon: Eye, label: 'Attorney-Client Privilege' },
                { icon: Zap, label: 'Zero Data Retention' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 11, borderRadius: 20, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Icon size={12} style={{ color: '#C9A84C' }} /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div style={{ padding: '16px 18px', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
              "YourAI cut our contract review time by 70%. What used to take a full day now takes two hours with better accuracy."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'white' }}>JC</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>Jennifer Chen</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Managing Partner, Chen Partners LLC</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 20 }}>
            &copy; 2026 YourAI &middot; Appinventiv
          </div>
        </div>
      </div>

      {/* Right column — 55% light */}
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--ice-warm)', padding: '40px 24px' }}>
        <div className="w-full" style={{ maxWidth: 420 }}>
          <div className="bg-white" style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
