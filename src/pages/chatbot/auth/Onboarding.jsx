import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Scale,
  FileText,
  Settings,
  User,
  Users,
  Building,
  Building2,
  FileSearch,
  Search,
  LayoutDashboard,
  Check,
  ChevronLeft,
} from 'lucide-react';

const PRACTICE_AREAS = [
  'Corporate & M&A',
  'Litigation',
  'Real Estate',
  'Employment & Labor',
  'Intellectual Property',
  'Tax & Compliance',
  'Immigration',
  'Family Law',
  'Criminal Defense',
  'Healthcare Law',
  'Bankruptcy',
  'Environmental',
];

const ROLES = [
  {
    id: 'partner',
    icon: Briefcase,
    title: 'Partner / Senior Attorney',
    desc: 'I lead matters and review deliverables',
  },
  {
    id: 'associate',
    icon: Scale,
    title: 'Associate / Junior Attorney',
    desc: 'I draft, research, and support cases',
  },
  {
    id: 'paralegal',
    icon: FileText,
    title: 'Paralegal / Legal Assistant',
    desc: 'I manage documents, filings, and scheduling',
  },
  {
    id: 'ops',
    icon: Settings,
    title: 'Legal Operations / IT',
    desc: 'I manage tools, vendors, and firm technology',
  },
];

const FIRM_SIZES = [
  { id: 'solo', icon: User, title: 'Solo Practitioner', desc: 'Just me' },
  { id: 'small', icon: Users, title: 'Small Firm', desc: '2\u201310 attorneys' },
  { id: 'mid', icon: Building, title: 'Mid-size Firm', desc: '11\u201350 attorneys' },
  { id: 'large', icon: Building2, title: 'Large Firm', desc: '50+ attorneys' },
];

const FIRST_ACTIONS = [
  {
    id: 'analyze',
    icon: FileSearch,
    title: 'Analyze a Contract',
    desc: 'Upload a contract and get AI-powered analysis',
  },
  {
    id: 'research',
    icon: Search,
    title: 'Research Legal Questions',
    desc: 'Ask anything and get cited answers',
  },
  {
    id: 'workspace',
    icon: LayoutDashboard,
    title: 'Set Up My Workspace',
    desc: 'Organize matters, invite team members',
  },
];

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                           */
/* ------------------------------------------------------------------ */

function SelectableCard({ icon: Icon, title, desc, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        borderRadius: 10,
        border: `1.5px solid ${selected ? 'var(--navy)' : 'var(--border)'}`,
        background: selected ? 'rgba(11,29,58,0.04)' : '#fff',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'all 0.2s ease',
        boxShadow: selected ? '0 0 0 1px var(--navy)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: selected ? 'var(--navy)' : 'var(--ice-warm)',
          color: selected ? '#fff' : 'var(--navy)',
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--text-primary)',
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{desc}</div>
      </div>
      {selected && (
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--navy)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Check size={14} color="#fff" />
        </div>
      )}
    </button>
  );
}

function PracticeChip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 20,
        border: `1.5px solid ${selected ? 'var(--navy)' : 'var(--border)'}`,
        background: selected ? 'var(--navy)' : '#fff',
        color: selected ? '#fff' : 'var(--text-primary)',
        fontSize: 13,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {selected && <Check size={14} />}
      {label}
    </button>
  );
}

function ProgressDots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i + 1 === current ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i + 1 === current ? 'var(--navy)' : 'transparent',
            border: `1.5px solid ${i + 1 <= current ? 'var(--navy)' : 'var(--border)'}`,
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Onboarding Component                                         */
/* ------------------------------------------------------------------ */

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [practiceAreas, setPracticeAreas] = useState([]);
  const [firmSize, setFirmSize] = useState('');
  const [firstAction, setFirstAction] = useState('');
  const [direction, setDirection] = useState('forward');

  const canContinue = () => {
    switch (step) {
      case 1: return !!role;
      case 2: return practiceAreas.length > 0;
      case 3: return !!firmSize;
      case 4: return !!firstAction;
      default: return false;
    }
  };

  const goNext = () => {
    if (step === 4) {
      navigate('/chat');
      return;
    }
    setDirection('forward');
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection('back');
    setStep((s) => s - 1);
  };

  const togglePracticeArea = (area) => {
    setPracticeAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  /* ---- Step renderers ---- */

  const renderStep1 = () => (
    <div key="step1">
      <h2 style={styles.title}>What best describes your role?</h2>
      <p style={styles.subtitle}>This helps us tailor YourAI to your workflow</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        {ROLES.map((r) => (
          <SelectableCard
            key={r.id}
            icon={r.icon}
            title={r.title}
            desc={r.desc}
            selected={role === r.id}
            onClick={() => setRole(r.id)}
          />
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div key="step2">
      <h2 style={styles.title}>What areas does your firm practice?</h2>
      <p style={styles.subtitle}>Select all that apply</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginTop: 24,
        }}
      >
        {PRACTICE_AREAS.map((area) => (
          <PracticeChip
            key={area}
            label={area}
            selected={practiceAreas.includes(area)}
            onClick={() => togglePracticeArea(area)}
          />
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div key="step3">
      <h2 style={styles.title}>How large is your firm?</h2>
      <p style={styles.subtitle}>This helps us set the right defaults</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        {FIRM_SIZES.map((s) => (
          <SelectableCard
            key={s.id}
            icon={s.icon}
            title={s.title}
            desc={s.desc}
            selected={firmSize === s.id}
            onClick={() => setFirmSize(s.id)}
          />
        ))}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div key="step4">
      <h2 style={styles.title}>What would you like to start with?</h2>
      <p style={styles.subtitle}>You can always change this later</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        {FIRST_ACTIONS.map((a) => (
          <SelectableCard
            key={a.id}
            icon={a.icon}
            title={a.title}
            desc={a.desc}
            selected={firstAction === a.id}
            onClick={() => setFirstAction(a.id)}
          />
        ))}
      </div>
    </div>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={{ color: 'var(--navy)', fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400 }}>
            Your
          </span>
          <span style={{ color: 'var(--gold)', fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400 }}>
            AI
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/chat')}
          style={styles.skipBtn}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Skip for now
        </button>
      </div>

      {/* Center card area */}
      <div style={styles.center}>
        <div
          style={{
            ...styles.card,
            animation: `${direction === 'forward' ? 'onb-slide-in-right' : 'onb-slide-in-left'} 0.35s ease`,
          }}
        >
          {stepRenderers[step - 1]()}

          {/* Navigation buttons */}
          <div style={{ marginTop: 28 }}>
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                style={styles.backBtn}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue()}
              style={{
                ...styles.continueBtn,
                opacity: canContinue() ? 1 : 0.45,
                cursor: canContinue() ? 'pointer' : 'not-allowed',
              }}
            >
              {step === 4 ? 'Get Started' : 'Continue'}
            </button>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div style={styles.footer}>
        <ProgressDots current={step} total={4} />
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes onb-slide-in-right {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes onb-slide-in-left {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 32px',
  },
  logo: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 0,
  },
  skipBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    transition: 'color 0.2s',
    padding: '4px 0',
  },
  center: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 24px',
  },
  card: {
    maxWidth: 560,
    width: '100%',
  },
  title: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 24,
    fontWeight: 400,
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginTop: 6,
    marginBottom: 0,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    padding: '6px 0',
    marginBottom: 10,
    transition: 'color 0.2s',
  },
  continueBtn: {
    width: '100%',
    padding: '13px 0',
    borderRadius: 8,
    border: 'none',
    background: 'var(--navy)',
    color: '#fff',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  footer: {
    padding: '24px 0 32px',
  },
};
