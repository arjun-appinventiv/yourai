import React, { useState, useRef, useEffect } from 'react';
import {
  User, Save, Edit3, Briefcase, Scale, FileText, Settings,
  Users, Building, Building2, FileSearch, Search, LayoutDashboard, Check,
  MapPin, Globe, ChevronDown,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import { useToast } from '../../components/Toast';
import { currentUser } from '../../data/mockData';
import { useRole } from '../../components/org-admin/RoleContext';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: '8px', height: 36,
  padding: '0 12px', fontSize: '13px', color: 'var(--text-primary)', width: '100%', outline: 'none',
};

export default function ProfilePage() {
  const { role } = useRole();
  const showToast = useToast();
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);

  const [notifications, setNotifications] = useState({
    email: true,
    workflow: true,
    classification: false,
    reports: true,
  });

  // --- My Preferences state ---
  const loadPrefs = () => {
    try {
      return JSON.parse(localStorage.getItem('yourai_user_profile')) || {};
    } catch { return {}; }
  };

  const [prefsEditing, setPrefsEditing] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState(loadPrefs);
  const [draftPrefs, setDraftPrefs] = useState(loadPrefs);
  const [prefsErrors, setPrefsErrors] = useState({});
  const [stateSearch, setStateSearch] = useState('');
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const stateDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target)) {
        setStateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleOptions = [
    { value: 'Partner / Senior Attorney', icon: Briefcase, desc: 'I lead matters and review deliverables' },
    { value: 'Associate / Junior Attorney', icon: Scale, desc: 'I draft, research, and support cases' },
    { value: 'Paralegal / Legal Assistant', icon: FileText, desc: 'I manage documents, filings, and scheduling' },
    { value: 'Legal Operations / IT', icon: Settings, desc: 'I manage tools, vendors, and firm technology' },
  ];

  const practiceAreaOptions = [
    'Corporate & M&A', 'Litigation', 'Real Estate', 'Employment & Labor',
    'Intellectual Property', 'Tax & Compliance', 'Immigration', 'Family Law',
    'Criminal Defense', 'Healthcare Law', 'Bankruptcy', 'Environmental',
  ];

  const firmSizeOptions = [
    { value: 'Solo Practitioner', icon: User, desc: 'Just me' },
    { value: 'Small Firm', icon: Users, desc: '2\u201310 attorneys' },
    { value: 'Mid-size Firm', icon: Building, desc: '11\u201350 attorneys' },
    { value: 'Large Firm', icon: Building2, desc: '50+ attorneys' },
  ];

  const goalOptions = [
    { value: 'Analyze a Contract', icon: FileSearch, desc: 'Upload a contract and get AI-powered analysis' },
    { value: 'Research Legal Questions', icon: Search, desc: 'Ask anything and get cited answers' },
    { value: 'Set Up My Workspace', icon: LayoutDashboard, desc: 'Organize matters, invite team members' },
  ];

  const handlePrefsSave = () => {
    const errors = {};
    if (!draftPrefs.role) errors.role = true;
    if (!draftPrefs.practiceAreas || draftPrefs.practiceAreas.length === 0) errors.practiceAreas = true;
    if (!draftPrefs.firmSize) errors.firmSize = true;
    if (!draftPrefs.primaryGoal) errors.primaryGoal = true;
    if (!draftPrefs.primaryState) errors.primaryState = true;
    if (Object.keys(errors).length > 0) { setPrefsErrors(errors); return; }
    localStorage.setItem('yourai_user_profile', JSON.stringify(draftPrefs));
    setSavedPrefs({ ...draftPrefs });
    setPrefsErrors({});
    setPrefsEditing(false);
    showToast('Preferences updated');
  };

  const handlePrefsCancel = () => {
    setDraftPrefs({ ...savedPrefs });
    setPrefsErrors({});
    setPrefsEditing(false);
  };

  const togglePracticeArea = (area) => {
    const current = draftPrefs.practiceAreas || [];
    setDraftPrefs({
      ...draftPrefs,
      practiceAreas: current.includes(area) ? current.filter((a) => a !== area) : [...current, area],
    });
  };

  const toggleAdditionalState = (state) => {
    if (state === draftPrefs.primaryState) return; // locked
    const current = draftPrefs.additionalStates || [];
    setDraftPrefs({
      ...draftPrefs,
      additionalStates: current.includes(state) ? current.filter((s) => s !== state) : [...current, state],
    });
  };

  const filteredStates = US_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase()),
  );

  return (
    <div>
      <PageHeader icon={User} title="My Profile" subtitle="Manage your personal settings and preferences." />

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 900 }}>
        {/* Profile card */}
        <div className="bg-white p-6 rounded-xl" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-4 mb-6">
            <div
              className="rounded-full flex items-center justify-center text-white"
              style={{ width: 56, height: 56, backgroundColor: 'var(--navy)', fontSize: '18px', fontWeight: 600 }}
            >
              {currentUser.avatar}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>{currentUser.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{currentUser.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={role === 'Admin' ? 'Enterprise' : role === 'Manager' ? 'Professional' : 'Team'}>
                  {role}
                </Badge>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{currentUser.org}</span>
              </div>
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--border)', marginBottom: 20 }} />

          <div className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Organization</label>
              <input type="text" value={currentUser.org} disabled style={{ ...inputStyle, backgroundColor: 'var(--ice-warm)', color: 'var(--text-muted)' }} />
            </div>
            <button
              onClick={() => showToast('Profile updated')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg self-start"
              style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
            >
              <Save size={14} /> Save Changes
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Password */}
          <div className="bg-white p-6 rounded-xl" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>Change Password</h4>
            <div className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Current Password</label>
                <input type="password" placeholder="Enter current password" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>New Password</label>
                <input type="password" placeholder="Enter new password" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Confirm New Password</label>
                <input type="password" placeholder="Confirm new password" style={inputStyle} />
              </div>
              <button
                onClick={() => showToast('Password updated')}
                className="px-4 py-2 rounded-lg self-start"
                style={{ fontSize: '13px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Update Password
              </button>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white p-6 rounded-xl" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>Notification Preferences</h4>
            {[
              { key: 'email', label: 'Email notifications', desc: 'Receive notifications via email' },
              { key: 'workflow', label: 'Workflow completions', desc: 'Alert when workflows finish running' },
              { key: 'classification', label: 'Classification alerts', desc: 'Flagged documents needing review' },
            ].map((pref) => (
              <div key={pref.key} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{pref.label}</span>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{pref.desc}</p>
                </div>
                <button
                  onClick={() => setNotifications({ ...notifications, [pref.key]: !notifications[pref.key] })}
                  className="relative"
                  style={{
                    width: 40, height: 22, borderRadius: 11,
                    backgroundColor: notifications[pref.key] ? 'var(--navy)' : 'var(--border)',
                    border: 'none', cursor: 'pointer',
                    transition: 'background-color 200ms',
                  }}
                >
                  <div
                    className="absolute rounded-full bg-white"
                    style={{
                      width: 16, height: 16, top: 3,
                      left: notifications[pref.key] ? 21 : 3,
                      transition: 'left 200ms',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── My Preferences ── */}
      <div className="bg-white rounded-xl" style={{ border: '1px solid var(--border)', padding: 24, maxWidth: 900, marginTop: 24 }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>My Preferences</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Set during onboarding &mdash; you can update these at any time.</p>
          </div>
          {!prefsEditing && (
            <button
              onClick={() => { setDraftPrefs({ ...savedPrefs }); setPrefsEditing(true); setPrefsErrors({}); }}
              className="flex items-center gap-1"
              style={{ fontSize: 13, fontWeight: 500, border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <Edit3 size={14} /> Edit
            </button>
          )}
        </div>

        {!prefsEditing ? (
          /* ── Read-only view ── */
          <div className="flex flex-col gap-4">
            {[
              { label: 'Role', value: savedPrefs.role },
              { label: 'Practice Areas', value: savedPrefs.practiceAreas && savedPrefs.practiceAreas.length > 0 ? savedPrefs.practiceAreas.join(', ') : null },
              { label: 'Firm Size', value: savedPrefs.firmSize },
              { label: 'Primary Goal', value: savedPrefs.primaryGoal },
              { label: 'Primary State', value: savedPrefs.primaryState },
              { label: 'Additional States', value: savedPrefs.additionalStates && savedPrefs.additionalStates.length > 0 ? savedPrefs.additionalStates.join(', ') : 'None' },
              { label: 'Federal Practice', value: savedPrefs.federalPractice === true ? 'Yes' : savedPrefs.federalPractice === false ? 'No' : null },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{row.label}</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}>{row.value || 'Not set'}</div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Edit mode ── */
          <div className="flex flex-col gap-6">
            {/* Role */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Role</div>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {roleOptions.map((opt) => {
                  const Icon = opt.icon;
                  const selected = draftPrefs.role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setDraftPrefs({ ...draftPrefs, role: opt.value })}
                      className="flex items-start gap-3 text-left"
                      style={{
                        border: selected ? '2px solid var(--navy)' : '1px solid var(--border)',
                        borderRadius: 10, padding: 14, backgroundColor: 'white', cursor: 'pointer',
                      }}
                    >
                      <Icon size={18} style={{ color: selected ? 'var(--navy)' : 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {prefsErrors.role && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>Please make a selection</p>}
            </div>

            {/* Practice Areas */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Practice Areas</div>
              <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                {practiceAreaOptions.map((area) => {
                  const selected = (draftPrefs.practiceAreas || []).includes(area);
                  return (
                    <button
                      key={area}
                      onClick={() => togglePracticeArea(area)}
                      className="flex items-center justify-center gap-1"
                      style={{
                        border: selected ? 'none' : '1px solid var(--border)',
                        borderRadius: 20, padding: '7px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        backgroundColor: selected ? 'var(--navy)' : 'white',
                        color: selected ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      {selected && <Check size={13} />} {area}
                    </button>
                  );
                })}
              </div>
              {prefsErrors.practiceAreas && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>Please make a selection</p>}
            </div>

            {/* Firm Size */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Firm Size</div>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {firmSizeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const selected = draftPrefs.firmSize === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setDraftPrefs({ ...draftPrefs, firmSize: opt.value })}
                      className="flex items-start gap-3 text-left"
                      style={{
                        border: selected ? '2px solid var(--navy)' : '1px solid var(--border)',
                        borderRadius: 10, padding: 14, backgroundColor: 'white', cursor: 'pointer',
                      }}
                    >
                      <Icon size={18} style={{ color: selected ? 'var(--navy)' : 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {prefsErrors.firmSize && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>Please make a selection</p>}
            </div>

            {/* Primary Goal */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Primary Goal</div>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                {goalOptions.map((opt) => {
                  const Icon = opt.icon;
                  const selected = draftPrefs.primaryGoal === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setDraftPrefs({ ...draftPrefs, primaryGoal: opt.value })}
                      className="flex flex-col items-center gap-2 text-center"
                      style={{
                        border: selected ? '2px solid var(--navy)' : '1px solid var(--border)',
                        borderRadius: 10, padding: 16, backgroundColor: 'white', cursor: 'pointer',
                      }}
                    >
                      <Icon size={20} style={{ color: selected ? 'var(--navy)' : 'var(--text-muted)' }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
              {prefsErrors.primaryGoal && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>Please make a selection</p>}
            </div>

            {/* Primary State */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Primary State</div>
              <div ref={stateDropdownRef} style={{ position: 'relative', maxWidth: 360 }}>
                <div
                  onClick={() => setStateDropdownOpen(!stateDropdownOpen)}
                  style={{
                    ...inputStyle,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                    border: draftPrefs.primaryState ? '2px solid var(--navy)' : '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: draftPrefs.primaryState ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {draftPrefs.primaryState || 'Select a state...'}
                  </span>
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: stateDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
                </div>
                {stateDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: 4, maxHeight: 240, overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 6, padding: '0 8px', height: 32 }}>
                        <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                          type="text"
                          value={stateSearch}
                          onChange={(e) => setStateSearch(e.target.value)}
                          placeholder="Search states..."
                          autoFocus
                          style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: 190 }}>
                      {filteredStates.length === 0 && (
                        <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>No states found</div>
                      )}
                      {filteredStates.map((state) => {
                        const selected = draftPrefs.primaryState === state;
                        return (
                          <button
                            key={state}
                            onClick={() => {
                              const prev = draftPrefs.primaryState;
                              const additionalStates = [...(draftPrefs.additionalStates || [])];
                              // Remove old primary from additional if present, add new primary
                              const cleaned = additionalStates.filter((s) => s !== state);
                              if (prev && !cleaned.includes(prev)) {
                                // don't auto-add old primary to additional
                              }
                              setDraftPrefs({ ...draftPrefs, primaryState: state, additionalStates: cleaned.includes(state) ? cleaned : cleaned });
                              setStateDropdownOpen(false);
                              setStateSearch('');
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                              padding: '8px 14px', border: 'none', backgroundColor: selected ? '#f0f4ff' : 'white',
                              cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', textAlign: 'left',
                            }}
                          >
                            {selected && <Check size={13} style={{ color: 'var(--navy)', flexShrink: 0 }} />}
                            <span>{state}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              {prefsErrors.primaryState && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>Please make a selection</p>}
            </div>

            {/* Additional States */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Additional States</div>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {US_STATES.map((state) => {
                  const isPrimary = draftPrefs.primaryState === state;
                  const selected = isPrimary || (draftPrefs.additionalStates || []).includes(state);
                  return (
                    <button
                      key={state}
                      onClick={() => toggleAdditionalState(state)}
                      className="flex items-center justify-center gap-1"
                      style={{
                        border: selected ? 'none' : '1px solid var(--border)',
                        borderRadius: 20, padding: '7px 10px', fontSize: 12, fontWeight: 500, cursor: isPrimary ? 'default' : 'pointer',
                        backgroundColor: selected ? 'var(--navy)' : 'white',
                        color: selected ? 'white' : 'var(--text-primary)',
                        opacity: isPrimary ? 0.7 : 1,
                      }}
                    >
                      {selected && <Check size={12} />} {state}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Federal Practice */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Federal Practice</div>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {[
                  { value: true, icon: Globe, label: 'Yes \u2014 Federal Courts', desc: 'I practice in federal courts' },
                  { value: false, icon: MapPin, label: 'No \u2014 State only', desc: 'I practice in state courts only' },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const selected = draftPrefs.federalPractice === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => setDraftPrefs({ ...draftPrefs, federalPractice: opt.value })}
                      className="flex items-start gap-3 text-left"
                      style={{
                        border: selected ? '2px solid var(--navy)' : '1px solid var(--border)',
                        borderRadius: 10, padding: 14, backgroundColor: 'white', cursor: 'pointer',
                      }}
                    >
                      <Icon size={18} style={{ color: selected ? 'var(--navy)' : 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center gap-3 justify-end" style={{ marginTop: 4 }}>
              <button
                onClick={handlePrefsCancel}
                style={{ fontSize: 13, fontWeight: 500, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 20px', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePrefsSave}
                className="flex items-center gap-2"
                style={{ fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, padding: '8px 20px', backgroundColor: 'var(--navy)', color: 'white', cursor: 'pointer' }}
              >
                <Save size={14} /> Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
