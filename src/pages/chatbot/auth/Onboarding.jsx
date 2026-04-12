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
  Lock,
  X,
  CreditCard,
  Shield,
  Zap,
  Sparkles,
  CheckCircle,
  Star,
  Loader,
} from 'lucide-react';
import { subscriptionPlans } from '../../../data/mockData';

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

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota',
  'Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon',
  'Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah',
  'Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'
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
  const [primaryState, setPrimaryState] = useState('');
  const [additionalStates, setAdditionalStates] = useState([]);
  const [federalPractice, setFederalPractice] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [direction, setDirection] = useState('forward');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [billingName, setBillingName] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const TOTAL_STEPS = 7;

  const canContinue = () => {
    switch (step) {
      case 1: return !!role;
      case 2: return practiceAreas.length > 0;
      case 3: return !!firmSize;
      case 4: return !!primaryState;
      case 5: return !!firstAction;
      case 6: return !!selectedPlan;
      case 7: return !paymentProcessing && (selectedPlan === 'free' || paymentComplete || (cardNumber.replace(/\s/g, '').length >= 15 && cardExpiry.length >= 4 && cardCvc.length >= 3 && billingName.trim().length > 0));
      default: return false;
    }
  };

  const goNext = () => {
    // Step 6 → 7: if free plan, skip payment step entirely
    if (step === 6 && selectedPlan === 'free') {
      finishOnboarding();
      return;
    }
    // Step 7: process payment then finish
    if (step === 7) {
      if (paymentComplete) {
        finishOnboarding();
        return;
      }
      setPaymentProcessing(true);
      setTimeout(() => {
        setPaymentProcessing(false);
        setPaymentComplete(true);
      }, 2000);
      return;
    }
    if (step >= TOTAL_STEPS) return;
    setDirection('forward');
    setStep((s) => s + 1);
  };

  const finishOnboarding = () => {
    try {
      const selectedRole = ROLES.find((r) => r.id === role);
      const selectedFirmSize = FIRM_SIZES.find((s) => s.id === firmSize);
      const selectedAction = FIRST_ACTIONS.find((a) => a.id === firstAction);
      const planData = subscriptionPlans.find((p) => p.id === selectedPlan);
      localStorage.setItem(
        'yourai_user_profile',
        JSON.stringify({
          role: selectedRole ? selectedRole.title : role,
          practiceAreas,
          firmSize: selectedFirmSize ? selectedFirmSize.title : firmSize,
          primaryState: primaryState,
          additionalStates: additionalStates,
          federalPractice: federalPractice,
          primaryGoal: selectedAction ? selectedAction.title : firstAction,
          plan: planData ? planData.name : 'Free',
          planId: selectedPlan,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        })
      );
      navigate('/chat');
    } catch {
      navigate('/chat');
    }
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
        className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-6"
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

  const filteredStates = US_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const toggleAdditionalState = (state) => {
    if (state === primaryState) return;
    setAdditionalStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  const handleNoneSingleJurisdiction = () => {
    setAdditionalStates([]);
  };

  const renderStep4 = () => (
    <div key="step4">
      <h2 style={styles.title}>Where does your firm practice?</h2>
      <p style={styles.subtitle}>This helps us load the right legal knowledge for your jurisdiction</p>

      {/* SECTION 1 — Primary State */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
          Primary State
        </div>
        <div style={{ position: 'relative' }}>
          {primaryState ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 8,
              border: '1.5px solid var(--navy)', background: 'rgba(11,29,58,0.04)',
              fontSize: 13, fontFamily: "'DM Sans', sans-serif",
            }}>
              <span style={{ flex: 1, color: 'var(--text-primary)' }}>{primaryState}</span>
              <button type="button" onClick={() => { setPrimaryState(''); setAdditionalStates((prev) => prev.filter((s) => s !== primaryState)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search states..."
                value={stateSearch}
                onChange={(e) => { setStateSearch(e.target.value); setStateDropdownOpen(true); }}
                onFocus={() => setStateDropdownOpen(true)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1.5px solid var(--border)', fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif", outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {stateDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  maxHeight: 200, overflowY: 'auto', background: '#fff',
                  border: '1.5px solid var(--border)', borderRadius: 8, marginTop: 4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}>
                  {filteredStates.length === 0 ? (
                    <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>No states found</div>
                  ) : (
                    filteredStates.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setPrimaryState(s);
                          setStateSearch('');
                          setStateDropdownOpen(false);
                          if (!additionalStates.includes(s)) {
                            setAdditionalStates((prev) => [...prev, s]);
                          }
                        }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '8px 14px', border: 'none', background: 'none',
                          fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                          cursor: 'pointer', color: 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ice-warm)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        {s}
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SECTION 2 — Additional States */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}>
          Do you also practice in other states?
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 12 }}>
          Select all that apply
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {US_STATES.map((s) => {
            const isPrimary = s === primaryState;
            const isSelected = isPrimary || additionalStates.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => { if (!isPrimary) toggleAdditionalState(s); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 20,
                  border: `1.5px solid ${isSelected ? 'var(--navy)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--navy)' : '#fff',
                  color: isSelected ? '#fff' : 'var(--text-primary)',
                  fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                  cursor: isPrimary ? 'default' : 'pointer',
                  opacity: isPrimary ? 0.75 : 1,
                  transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                }}
              >
                {isPrimary && <Lock size={11} />}
                {isSelected && !isPrimary && <Check size={12} />}
                {s}
              </button>
            );
          })}
          {/* None pill */}
          <button
            type="button"
            onClick={handleNoneSingleJurisdiction}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 20,
              border: `1.5px solid ${additionalStates.length === 0 || (additionalStates.length === 1 && additionalStates[0] === primaryState) ? 'var(--navy)' : 'var(--border)'}`,
              background: additionalStates.length === 0 || (additionalStates.length === 1 && additionalStates[0] === primaryState) ? 'var(--navy)' : '#fff',
              color: additionalStates.length === 0 || (additionalStates.length === 1 && additionalStates[0] === primaryState) ? '#fff' : 'var(--text-primary)',
              fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap',
            }}
          >
            None — single jurisdiction only
          </button>
        </div>
      </div>

      {/* SECTION 3 — Federal Practice */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>
          Do you handle federal matters?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setFederalPractice(true)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8,
              border: `1.5px solid ${federalPractice ? 'var(--navy)' : 'var(--border)'}`,
              background: federalPractice ? 'var(--navy)' : '#fff',
              color: federalPractice ? '#fff' : 'var(--text-primary)',
              fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            Yes — Federal Courts
          </button>
          <button
            type="button"
            onClick={() => setFederalPractice(false)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8,
              border: `1.5px solid ${!federalPractice ? 'var(--navy)' : 'var(--border)'}`,
              background: !federalPractice ? 'var(--navy)' : '#fff',
              color: !federalPractice ? '#fff' : 'var(--text-primary)',
              fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            No — State only
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div key="step5">
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

  const planFeatures = {
    free: ['50 documents/month', 'GPT-4o-mini + Gemini Flash', '1 knowledge pack', 'Community support'],
    professional: ['500 documents/month', 'All AI models', '3 knowledge packs', 'Email support', '5 GB storage'],
    team: ['2,000 documents/month', 'All AI models + priority', '10 knowledge packs', 'SSO & Client Portal', 'HIPAA eligible', '25 GB storage'],
    enterprise: ['Unlimited documents', 'Custom fine-tuned models', 'Unlimited knowledge packs', 'Dedicated CSM', 'Private VPC & API', 'HIPAA + SOC 2'],
  };

  const planIcons = { free: Sparkles, professional: Star, team: Users, enterprise: Shield };
  const planAccent = { free: '#64748B', professional: '#1D4ED8', team: '#166534', enterprise: '#92400E' };

  const renderStep6 = () => (
    <div key="step6" className="w-full" style={{ maxWidth: 640 }}>
      <h2 style={styles.title}>Choose your plan</h2>
      <p style={styles.subtitle}>Start free and upgrade anytime. All plans include encrypted storage and ABA compliance.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        {subscriptionPlans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const Icon = planIcons[plan.id] || Sparkles;
          const accent = planAccent[plan.id] || '#64748B';
          const features = planFeatures[plan.id] || [];
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: 20,
                borderRadius: 12,
                border: `2px solid ${isSelected ? accent : 'var(--border)'}`,
                background: isSelected ? `${accent}08` : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 0 0 1px ${accent}` : 'none',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = accent + '80'; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {plan.badge && (
                <span style={{ position: 'absolute', top: -10, right: 12, fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 999, backgroundColor: accent + '18', color: accent }}>{plan.badge}</span>
              )}
              {isSelected && (
                <div style={{ position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} color="#fff" />
                </div>
              )}
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: accent + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={18} style={{ color: accent }} />
              </div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', marginBottom: 2 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{plan.price === 0 ? 'Free' : `$${plan.price}`}</span>
                {plan.price > 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/user/mo</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <CheckCircle size={13} style={{ color: accent, flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const planForPayment = subscriptionPlans.find((p) => p.id === selectedPlan);

  const renderStep7 = () => (
    <div key="step7">
      <h2 style={styles.title}>Set up payment</h2>
      <p style={styles.subtitle}>You won't be charged until your trial ends. Cancel anytime.</p>

      {/* Plan summary */}
      <div style={{ marginTop: 24, padding: '14px 18px', borderRadius: 10, backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{planForPayment?.name} Plan</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>14-day free trial</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>${planForPayment?.price}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>/user/mo</span></div>
      </div>

      {paymentComplete ? (
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} color="#16A34A" />
          </div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--text-primary)', marginBottom: 6 }}>Payment method saved</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your 14-day free trial starts now. You won't be charged until {(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); })()}.</div>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Cardholder name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Cardholder name</label>
            <input
              type="text"
              value={billingName}
              onChange={(e) => setBillingName(e.target.value)}
              placeholder="Ryan Melade"
              style={{ width: '100%', height: 42, border: '1.5px solid var(--border)', borderRadius: 8, padding: '0 14px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Card number */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Card number</label>
            <div style={{ position: 'relative' }}>
              <CreditCard size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="4242 4242 4242 4242"
                style={{ width: '100%', height: 42, border: '1.5px solid var(--border)', borderRadius: 8, padding: '0 14px 0 38px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box', letterSpacing: '0.5px' }}
              />
            </div>
          </div>

          {/* Expiry + CVC row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Expiry</label>
              <input
                type="text"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                style={{ width: '100%', height: 42, border: '1.5px solid var(--border)', borderRadius: 8, padding: '0 14px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>CVC</label>
              <input
                type="text"
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                style={{ width: '100%', height: 42, border: '1.5px solid var(--border)', borderRadius: 8, padding: '0 14px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Security note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7' }}>
            <Shield size={14} style={{ color: '#166534', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#166534' }}>256-bit SSL encryption. We never store your full card number.</span>
          </div>
        </div>
      )}
    </div>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6, renderStep7];

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
      </div>

      {/* Center card area */}
      <div style={styles.center}>
        <div
          style={{
            ...styles.card,
            maxWidth: step === 6 ? 680 : 560,
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
              {paymentProcessing ? <><Loader size={16} className="animate-spin" style={{ marginRight: 6 }} /> Processing...</> : step === 7 ? (paymentComplete ? 'Get Started' : 'Start Free Trial') : step === 6 ? (selectedPlan === 'free' ? 'Get Started — Free' : 'Continue to Payment') : 'Continue'}
            </button>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div style={styles.footer}>
        <ProgressDots current={step} total={TOTAL_STEPS} />
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
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
  },
  logo: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 0,
  },
  center: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 16px',
  },
  card: {
    maxWidth: 560,
    width: '100%',
  },
  title: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 'clamp(22px, 4vw, 30px)',
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
