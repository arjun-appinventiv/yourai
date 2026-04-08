import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, MessageSquare, Clock, Share2, Grid3X3, Calendar, Users,
  FolderOpen, ChevronDown, ChevronRight, MoreVertical, Plus, Download,
  Search, Bell, ArrowUp, Shield, Sparkles, FileText, Building2, Scale,
  LayoutDashboard, Send, MapPin, FileSearch, Lock, X, AlertTriangle, Info, Zap
} from 'lucide-react';
import { billingData, subscriptionPlans } from '../../data/mockData';

/* ─── mock data ─── */
const MOCK_RESPONSES = [
  "I'll analyze that for you. Give me a moment to process the document...",
  "Based on my review of the relevant case law, here are the key findings...",
  "I've completed the analysis. Here's a summary of the results...",
];

const INITIAL_MESSAGES = [
  {
    id: 1,
    sender: 'bot',
    content:
      'Good morning, Ryan. You have **3 new documents** in the vault and **2 workflow runs** completed overnight. Here\'s a summary of your most recent analysis.',
    timestamp: 'Today, 9:12 AM',
  },
  {
    id: 2,
    sender: 'user',
    content:
      'Run a full risk analysis on the Meridian Capital NDA we received yesterday. Compare it against our standard playbook and flag anything non-standard.',
    timestamp: '9:14 AM',
  },
  {
    id: 3,
    sender: 'bot',
    content:
      'I\'ve completed the risk analysis on **Meridian Capital NDA (v2, March 2026)**. I compared all 23 clauses against your firm\'s standard NDA playbook and flagged 3 non-standard provisions.',
    timestamp: '9:14 AM \u00b7 4.2s',
    card: {
      title: 'M&A Risk Assessment \u2014 Meridian Capital NDA',
      subtitle: '23 clauses analyzed \u00b7 3 flagged \u00b7 Governing law: New York',
      risks: [
        { level: 'HIGH', text: 'Non-compete extends 36 months post-termination (standard: 12)', section: '\u00a7 7.2' },
        { level: 'MEDIUM', text: 'Unilateral modification clause favoring disclosing party', section: '\u00a7 4.1' },
        { level: 'LOW', text: 'Residuals clause absent \u2014 standard in your playbook', section: '\u2014' },
      ],
      tags: ['NDA', 'Risk Analysis', 'Meridian Capital'],
    },
  },
];

const QUICK_ACTIONS = [
  { emoji: '\ud83d\udccb', label: 'Analyze contract' },
  { emoji: '\ud83c\udfe2', label: 'Summarize workspace' },
  { emoji: '\ud83d\udcc4', label: 'Compare documents' },
  { emoji: '\ud83d\udd0d', label: 'Run web search' },
];
const QUICK_ACTIONS_2 = [{ emoji: '\u2728', label: 'Generate artifact' }];

/* ─── AI Models by plan ─── */
const AI_MODELS_BY_PLAN = {
  Free: [
    { id: 'gpt4o-mini', label: 'GPT-4o-mini', enabled: true },
    { id: 'gemini-flash', label: 'Gemini Flash', enabled: true },
    { id: 'claude-sonnet', label: 'Claude Sonnet', enabled: false, minPlan: 'Professional' },
  ],
  Professional: [
    { id: 'gpt4o', label: 'GPT-4o', enabled: true },
    { id: 'claude-sonnet', label: 'Claude Sonnet', enabled: true },
    { id: 'gemini-pro', label: 'Gemini Pro', enabled: true },
  ],
  Team: [
    { id: 'gpt4o', label: 'GPT-4o', enabled: true },
    { id: 'claude-sonnet', label: 'Claude Sonnet', enabled: true },
    { id: 'gemini-pro', label: 'Gemini Pro', enabled: true },
  ],
  Enterprise: [
    { id: 'gpt4o', label: 'GPT-4o', enabled: true },
    { id: 'claude-sonnet', label: 'Claude Sonnet', enabled: true },
    { id: 'gemini-pro', label: 'Gemini Pro', enabled: true },
    { id: 'custom', label: 'Custom Model', enabled: true, enterprise: true },
  ],
};

/* ─── tiny helpers ─── */
const bold = (str) => {
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
};

const riskColors = {
  HIGH: { bg: '#FEE2E2', text: '#991B1B' },
  MEDIUM: { bg: '#FEF3C7', text: '#92400E' },
  LOW: { bg: '#EFF6FF', text: '#1D4ED8' },
};

/* ─────────────────── Sidebar ─────────────────── */
const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true, dotColor: '#22C55E', subtitle: '3 workflows running \u00b7 2 artifacts pending' },
  { icon: Share2, label: 'Knowledge Graph', badge: 'New', badgeStyle: 'green', subtitle: '12 entities \u00b7 47 relationships' },
  { icon: Grid3X3, label: 'Workspaces', badge: '3', badgeStyle: 'navy', subtitle: '3 active \u00b7 1 shared with you' },
];

const libraryItems = [
  { icon: FolderOpen, label: 'Document Vault', badge: '128', badgeStyle: 'navy', subtitle: 'Recent: Vendor_Agreement.pdf \u00b7 1h...' },
];

function Sidebar() {
  const [clientsOpen, setClientsOpen] = useState(true);
  const renderItem = (item, idx) => {
    const Icon = item.icon;
    const isClients = item.collapsible;
    return (
      <div key={idx}>
        <div onClick={isClients ? () => setClientsOpen((o) => !o) : undefined} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: isClients ? 'pointer' : 'default', background: item.active ? '#EDF3FA' : 'transparent', position: 'relative', userSelect: 'none' }}>
          {item.dotColor && <span style={{ position: 'absolute', left: 4, top: 14, width: 6, height: 6, borderRadius: '50%', background: item.dotColor }} />}
          <Icon size={16} style={{ marginTop: 2, color: 'var(--text-secondary)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</span>
              {item.badge && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999, ...(item.badgeStyle === 'navy' ? { background: 'var(--navy)', color: '#fff' } : { background: '#DCFCE7', color: '#166534' }) }}>{item.badge}</span>
              )}
              {isClients && <span style={{ marginLeft: 'auto' }}>{clientsOpen ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}</span>}
            </div>
            {item.subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</div>}
          </div>
        </div>
        {isClients && clientsOpen && item.children && (
          <div style={{ paddingLeft: 32, marginTop: 2 }}>
            {item.children.map((child, ci) =>
              child.isSubNav ? (
                <div key={ci} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0', cursor: 'pointer' }}>{child.label}</div>
              ) : (
                <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{'\u2022'}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{child.label}</span>
                  <span style={{ fontSize: 11, color: child.statusColor, marginLeft: 'auto' }}>{child.status}</span>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ width: 248, minWidth: 248, background: '#fff', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ padding: '18px 16px 0' }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18 }}>
          <span style={{ color: 'var(--navy)' }}>Your</span><span style={{ color: '#C9A84C' }}>AI</span>
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '20px 12px 6px' }}>Main</div>
        {sidebarItems.map(renderItem)}
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '18px 12px 6px' }}>Library</div>
        {libraryItems.map(renderItem)}
      </div>
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>RM</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Ryan Melade</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Admin &middot; Team Plan</div>
          </div>
          <MoreVertical size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
        </div>
        <div style={{ display: 'flex' }}>
          <button style={{ flex: 1, padding: '10px 0', border: '1px solid var(--border)', background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderBottomLeftRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text-secondary)' }}><Plus size={14} /> New</button>
          <button style={{ flex: 1, padding: '10px 0', border: '1px solid var(--border)', borderLeft: 'none', background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderBottomRightRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text-secondary)' }}><Download size={14} /> Export</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Top Nav ─────────────────── */
function TopNav({ plan, usage }) {
  const [showUsagePopover, setShowUsagePopover] = useState(false);
  const docPct = usage.docs.limit > 0 ? (usage.docs.used / usage.docs.limit) * 100 : 0;
  const usageColor = docPct >= 95 ? '#991B1B' : docPct >= 80 ? '#92400E' : 'var(--text-muted)';
  const usageBorder = docPct >= 95 ? '#FEE2E2' : docPct >= 80 ? '#FEF3C7' : 'var(--border)';

  const UsageBar = ({ label, used, limit }) => {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const color = pct >= 95 ? '#991B1B' : pct >= 80 ? '#92400E' : 'var(--navy)';
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{used.toLocaleString()} / {limit.toLocaleString()} ({pct.toFixed(1)}%)</span>
        </div>
        <div style={{ height: 4, borderRadius: 4, backgroundColor: 'var(--ice-warm)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, backgroundColor: color, transition: 'width 0.3s' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: 50, minHeight: 50, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff' }}>
      <div style={{ display: 'flex', gap: 24 }}>
        {['Models', 'Infrastructure', 'Security', 'Artifacts'].map((t) => (
          <span key={t} style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer' }}>{t}</span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Usage pill */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUsagePopover(!showUsagePopover)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 999,
              backgroundColor: 'var(--ice-warm)', border: `1px solid ${usageBorder}`,
              fontSize: 11, color: usageColor, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {docPct >= 95 && <AlertTriangle size={11} />}
            {usage.docs.used.toLocaleString()} / {usage.docs.limit.toLocaleString()} docs this month
          </button>
          {showUsagePopover && (
            <>
              <div onClick={() => setShowUsagePopover(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 300, backgroundColor: 'white', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 21, padding: 16 }}>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, color: 'var(--text-primary)', marginBottom: 12 }}>Your Plan Usage — {plan}</div>
                <UsageBar label="Documents" used={usage.docs.used} limit={usage.docs.limit} />
                <UsageBar label="Workflows" used={usage.workflows.used} limit={usage.workflows.limit} />
                <UsageBar label="Reports" used={usage.reports.used} limit={usage.reports.limit} />
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Resets May 1, 2026</div>
                  <a href="/app/billing" style={{ fontSize: 12, color: 'var(--navy)', textDecoration: 'none', fontWeight: 500 }} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>View Full Billing →</a>
                </div>
              </div>
            </>
          )}
        </div>

        <span style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>&lt; Main Site</span>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input readOnly placeholder="Search files, knowledge, or conversatio..." style={{ width: 240, height: 34, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 30, paddingRight: 40, fontSize: 13, color: 'var(--text-secondary)', background: '#fff', outline: 'none' }} />
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>{'\u2318'}K</span>
        </div>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <Bell size={18} color="var(--text-secondary)" />
          <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--navy)', border: '2px solid #fff' }} />
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>R</div>
      </div>
    </div>
  );
}

/* ─────────────────── Risk Card ─────────────────── */
function RiskCard({ card }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={18} color="#DC2626" />
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{card.title}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{card.subtitle}</div>
      <div style={{ borderTop: '1px solid var(--border)', margin: '14px 0' }} />
      {card.risks.map((r, i) => {
        const c = riskColors[r.level];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: c.bg, color: c.text, flexShrink: 0 }}>{r.level}</span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{r.text}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{r.section}</span>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {card.tags.map((t) => (
          <span key={t} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, background: '#F3F4F6', color: 'var(--text-secondary)' }}>{t}</span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <span style={{ fontSize: 13, color: '#C9A84C', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>View full report <ChevronRight size={14} /></span>
      </div>
    </div>
  );
}

/* ─────────────────── Message Bubble ─────────────────── */
function MessageBubble({ msg }) {
  const isBot = msg.sender === 'bot';
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      {isBot ? (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Sparkles size={16} color="#fff" /></div>
      ) : (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>R</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{isBot ? 'YourAI' : 'Ryan'}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{msg.timestamp}</span>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>{bold(msg.content)}</div>
        {msg.card && <RiskCard card={msg.card} />}
      </div>
    </div>
  );
}

/* ─────────────────── Typing Indicator ─────────────────── */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Sparkles size={16} color="#fff" /></div>
      <div style={{ paddingTop: 6 }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          YourAI is thinking
          <span className="typing-dots" style={{ letterSpacing: 2 }}>
            <span style={{ animation: 'blink 1.4s infinite 0s' }}>.</span>
            <span style={{ animation: 'blink 1.4s infinite 0.2s' }}>.</span>
            <span style={{ animation: 'blink 1.4s infinite 0.4s' }}>.</span>
          </span>
        </span>
      </div>
      <style>{`@keyframes blink { 0%, 20% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }`}</style>
    </div>
  );
}

/* ─────────────────── AI Model Selector ─────────────────── */
function ModelSelector({ plan, selectedModel, onSelect, onLockedClick }) {
  const models = AI_MODELS_BY_PLAN[plan] || AI_MODELS_BY_PLAN['Team'];
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {models.map((m) => {
        const isActive = selectedModel === m.id;
        const isLocked = !m.enabled;
        return (
          <button
            key={m.id}
            onClick={() => isLocked ? onLockedClick(m) : onSelect(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 999,
              border: isActive ? 'none' : '1px solid var(--border)',
              background: isActive ? 'var(--navy)' : m.enterprise ? '#FFFBEB' : 'white',
              color: isActive ? 'white' : isLocked ? '#94A3B8' : m.enterprise ? '#92400E' : 'var(--slate)',
              fontSize: 12, fontWeight: 500, cursor: isLocked ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
              opacity: isLocked ? 0.6 : 1,
            }}
            title={isLocked ? `Available on ${m.minPlan} plan and above` : m.label}
          >
            {isLocked && <Lock size={11} />}
            {m.enterprise && !isActive && <Zap size={11} />}
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────── Plan Comparison Modal ─────────────────── */
function PlanComparisonModal({ currentPlan, onClose, navigate }) {
  const features = [
    { label: 'Documents/month', key: 'docsPerMonth', format: (v) => v === null ? 'Unlimited' : v.toLocaleString() },
    { label: 'Workflow runs/mo', key: 'workflowRuns', format: (v) => v === null ? 'Unlimited' : v.toString() },
    { label: 'Knowledge Packs', key: 'knowledgePacks', format: (v) => v },
    { label: 'Storage', key: 'storage', format: (v) => v },
    { label: 'AI Models', key: 'aiModels', format: (v) => v.length > 20 ? v.split('+')[0].trim() : v },
    { label: 'Audit Log', key: 'auditLog', format: (v) => v },
    { label: 'SSO / SAML', key: 'sso', format: (v) => v ? '\u2713' : '\u2014' },
    { label: 'Client Portal', key: 'clientPortal', format: (v) => v ? '\u2713' : '\u2014' },
    { label: 'Secure Messaging', key: 'secureMessaging', format: (v) => v ? '\u2713' : '\u2014' },
    { label: 'HIPAA BAA', key: 'hipaa', format: (v, p) => p.name === 'Team' && v ? 'Eligible' : v ? 'Full' : '\u2014' },
    { label: 'API Access', key: 'api', format: (v) => v ? '\u2713' : '\u2014' },
    { label: 'Dedicated CSM', key: 'support', format: (v) => v === 'Dedicated CSM' ? '\u2713' : '\u2014' },
  ];

  const PLAN_ORDER = ['Free', 'Professional', 'Team', 'Enterprise'];
  const curIdx = PLAN_ORDER.indexOf(currentPlan);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 680, maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 61 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)' }}>Choose a plan that fits your firm</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>All plans include encrypted storage, ABA compliance, and zero data retention</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        {/* Plan columns */}
        <div style={{ padding: '20px 24px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: 140, textAlign: 'left', padding: '8px 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Feature</th>
                {subscriptionPlans.map((p) => (
                  <th key={p.id} style={{ textAlign: 'center', padding: '8px 6px', verticalAlign: 'top' }}>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--navy)' }}>{p.name}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
                      {p.price === 0 ? 'Free' : `$${p.price}`}
                    </div>
                    {p.price > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/user/mo</div>}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {p.badge && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: p.colour + '18', color: p.colour, fontWeight: 600 }}>{p.badge}</span>}
                      {p.name === currentPlan && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: 'var(--ice)', color: 'var(--text-muted)', fontWeight: 600 }}>Current</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.label} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 0', fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{f.label}</td>
                  {subscriptionPlans.map((p) => {
                    const val = f.format(p[f.key], p);
                    const isCheck = val === '\u2713';
                    const isDash = val === '\u2014';
                    return (
                      <td key={p.id} style={{ textAlign: 'center', padding: '8px 6px', fontSize: 12, color: isCheck ? '#16A34A' : isDash ? '#94A3B8' : 'var(--text-primary)', fontWeight: isCheck ? 700 : 400 }}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* CTA buttons */}
          <div style={{ display: 'flex', marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ width: 140 }} />
            {subscriptionPlans.map((p) => {
              const pIdx = PLAN_ORDER.indexOf(p.name);
              const isCurrent = p.name === currentPlan;
              return (
                <div key={p.id} style={{ flex: 1, textAlign: 'center', padding: '0 6px' }}>
                  {isCurrent ? (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Your current plan</span>
                  ) : pIdx > curIdx ? (
                    <button
                      onClick={() => { onClose(); navigate('/app/billing'); }}
                      style={{ padding: '6px 16px', borderRadius: 8, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                    >
                      Upgrade to {p.name}
                    </button>
                  ) : (
                    <button style={{ padding: '6px 16px', borderRadius: 8, backgroundColor: 'white', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer' }}>
                      Downgrade
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--navy)', fontWeight: 500, cursor: 'pointer' }}>Questions? Talk to us →</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>All plans billed monthly. Cancel anytime.</span>
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Empty State ─────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getSuggestedPrompts(profile) {
  if (!profile || !profile.onboardingCompleted) {
    return [
      { icon: FileSearch, title: 'Analyze a Contract', prompt: 'Upload a contract and I\'ll identify key risks, unusual clauses, and recommended changes' },
      { icon: Search, title: 'Legal Research', prompt: 'Ask me any legal question and I\'ll provide cited answers from your documents' },
      { icon: LayoutDashboard, title: 'Set Up Workspace', prompt: 'Help me organize my first workspace and invite my team members' },
    ];
  }
  const prompts = [];
  const state = profile.primaryState || '';
  const areas = profile.practiceAreas || [];
  const goal = profile.primaryGoal || '';
  if (state && prompts.length < 3) {
    prompts.push({ icon: MapPin, title: `${state} Legal Research`, prompt: `What are the current ${state} state laws on ${areas[0] || 'corporate law'}?` });
  }
  if (prompts.length < 3) {
    for (const area of areas) {
      if (prompts.length >= 3) break;
      if (area === 'Corporate & M&A') prompts.push({ icon: FileText, title: 'Contract Analysis', prompt: 'Analyze this M&A agreement and flag any unusual indemnification clauses' });
      else if (area === 'Litigation') prompts.push({ icon: Scale, title: 'Case Research', prompt: `Research recent ${state || 'state'} court decisions on summary judgment standards` });
      else if (area === 'Employment & Labor') prompts.push({ icon: Users, title: 'Employment Law', prompt: `Summarize ${state || 'state'} employment law requirements for non-compete agreements` });
      else if (area === 'Real Estate') prompts.push({ icon: Building2, title: 'Real Estate', prompt: `Review this lease agreement for ${state || 'state'} compliance issues` });
    }
  }
  if (prompts.length < 3) {
    if (goal === 'Analyze a Contract') prompts.push({ icon: FileSearch, title: 'Analyze a Contract', prompt: 'Upload a contract and I\'ll identify key risks, unusual clauses, and recommended changes' });
    else if (goal === 'Research Legal Questions') prompts.push({ icon: Search, title: 'Legal Research', prompt: 'Ask me any legal question and I\'ll provide cited answers from your documents' });
    else if (goal === 'Set Up My Workspace') prompts.push({ icon: LayoutDashboard, title: 'Set Up Workspace', prompt: 'Help me organize my first workspace and invite my team members' });
  }
  const defaults = [
    { icon: FileSearch, title: 'Analyze a Contract', prompt: 'Upload a contract and I\'ll identify key risks, unusual clauses, and recommended changes' },
    { icon: Search, title: 'Legal Research', prompt: 'Ask me any legal question and I\'ll provide cited answers from your documents' },
    { icon: LayoutDashboard, title: 'Set Up Workspace', prompt: 'Help me organize my first workspace and invite my team members' },
  ];
  for (const d of defaults) {
    if (prompts.length >= 3) break;
    if (!prompts.find((p) => p.title === d.title)) prompts.push(d);
  }
  return prompts.slice(0, 3);
}

function PlanAwarenessBadge({ plan, onViewPlans }) {
  if (plan === 'Free') {
    return (
      <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, backgroundColor: 'var(--ice-warm)', borderLeft: '3px solid #C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>You're on the Free plan · 50 docs/month</span>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Upgrade to unlock Claude Sonnet, 500 docs/month, and email support.</div>
        </div>
        <button onClick={onViewPlans} style={{ fontSize: 12, fontWeight: 500, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>See Plans →</button>
      </div>
    );
  }
  if (plan === 'Professional') {
    return (
      <div style={{ marginTop: 16, padding: '10px 16px', borderRadius: 10, backgroundColor: 'var(--ice-warm)', borderLeft: '3px solid #1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>You're on Professional · Upgrade for Client Portal, Secure Messaging, and SSO.</span>
        <button onClick={onViewPlans} style={{ fontSize: 12, fontWeight: 500, color: '#1D4ED8', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>See Team Plan →</button>
      </div>
    );
  }
  if (plan === 'Team') {
    return (
      <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, backgroundColor: '#DCFCE7' }}>
        <CheckCircle size={12} color="#166534" />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#166534' }}>Team Plan · All features active</span>
      </div>
    );
  }
  if (plan === 'Enterprise') {
    return (
      <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, backgroundColor: '#FFFBEB' }}>
        <Zap size={12} color="#92400E" />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#92400E' }}>Enterprise · Priority access active</span>
      </div>
    );
  }
  return null;
}

function EmptyState({ profile, plan, onPromptClick, navigate, onViewPlans }) {
  const currentUserName = 'Ryan';
  const prompts = getSuggestedPrompts(profile);

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 40px' }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Sparkles size={20} color="#fff" />
        </div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, color: 'var(--navy)', margin: '0 0 8px' }}>
          {getGreeting()}, {currentUserName}
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-muted)', margin: '0 0 28px' }}>
          Your AI assistant is ready. Based on your profile, here's where you can start:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          {prompts.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} onClick={() => onPromptClick(p.prompt)} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <Icon size={18} color="var(--navy)" style={{ marginBottom: 6 }} />
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: 'var(--navy)', marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.prompt}</div>
              </div>
            );
          })}
        </div>
        <button onClick={() => navigate('/app/profile')} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 20, padding: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          &#9998; Edit your preferences
        </button>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PlanAwarenessBadge plan={plan} onViewPlans={onViewPlans} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ ChatView ═══════════════════ */
export default function ChatView() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(true);
  const [profile, setProfile] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gpt4o');
  const [showLockedCard, setShowLockedCard] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [docLimitBannerDismissed, setDocLimitBannerDismissed] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const responseIdx = useRef(0);

  const plan = billingData.plan;
  const usage = billingData.usage;
  const docPct = usage.docs.limit > 0 ? (usage.docs.used / usage.docs.limit) * 100 : 0;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('yourai_user_profile');
      if (raw) setProfile(JSON.parse(raw));
    } catch (_) { /* ignore */ }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  const inputPlaceholder = profile && profile.primaryState
    ? `Ask anything about ${profile.primaryState} law or your documents...`
    : 'Ask anything, analyze files, or search the web...';

  const handlePromptClick = useCallback((promptText) => {
    setInput(promptText);
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const sendMessage = useCallback((text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || isTyping) return;
    if (showEmptyState) setShowEmptyState(false);
    const userMsg = { id: Date.now(), sender: 'user', content: trimmed, timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      const botMsg = { id: Date.now() + 1, sender: 'bot', content: MOCK_RESPONSES[responseIdx.current % MOCK_RESPONSES.length], timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) };
      responseIdx.current += 1;
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  }, [isTyping, showEmptyState]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleLockedModelClick = (model) => {
    setShowLockedCard(model);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopNav plan={plan} usage={usage} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FAFBFC', minHeight: 0 }}>
          {/* Document limit banners */}
          {docPct >= 100 && (
            <div style={{ padding: '10px 40px', display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#FEE2E2', borderBottom: '1px solid #FECACA' }}>
              <AlertTriangle size={15} style={{ color: '#991B1B', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: '#991B1B' }}>
                You've reached your document limit for this month. Uploads are paused until May 1, 2026 or you upgrade.
              </span>
              <button onClick={() => setShowPlanModal(true)} style={{ padding: '4px 14px', borderRadius: 8, backgroundColor: '#C9A84C', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Upgrade Plan</button>
            </div>
          )}
          {docPct >= 80 && docPct < 100 && !docLimitBannerDismissed && (
            <div style={{ padding: '10px 40px', display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#FFFBEB', borderBottom: '1px solid #FEF3C7' }}>
              <AlertTriangle size={15} style={{ color: '#92400E', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: '#92400E' }}>
                You've used {Math.round(docPct)}% of your {usage.docs.limit.toLocaleString()} document limit this month. Uploads will stop at {usage.docs.limit.toLocaleString()}.
              </span>
              <button onClick={() => setShowPlanModal(true)} style={{ fontSize: 12, fontWeight: 500, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Upgrade Plan →</button>
              <button onClick={() => setDocLimitBannerDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={14} color="#92400E" /></button>
            </div>
          )}

          {showEmptyState ? (
            <EmptyState profile={profile} plan={plan} onPromptClick={handlePromptClick} navigate={navigate} onViewPlans={() => setShowPlanModal(true)} />
          ) : (
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 40px' }}>
              {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
              {isTyping && <TypingIndicator />}
              {!isTyping && (
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {QUICK_ACTIONS.map((a) => (
                      <button key={a.label} onClick={() => sendMessage(a.label)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', padding: '8px 16px', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <span>{a.emoji}</span> {a.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {QUICK_ACTIONS_2.map((a) => (
                      <button key={a.label} onClick={() => sendMessage(a.label)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', padding: '8px 16px', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <span>{a.emoji}</span> {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat input area */}
          <div style={{ padding: '12px 40px 12px', background: 'transparent' }}>
            {/* Model selector */}
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ModelSelector plan={plan} selectedModel={selectedModel} onSelect={setSelectedModel} onLockedClick={handleLockedModelClick} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Using {(AI_MODELS_BY_PLAN[plan] || []).find(m => m.id === selectedModel)?.label || 'GPT-4o'}
              </span>
            </div>

            {/* Locked model inline card */}
            {showLockedCard && (
              <div style={{ marginBottom: 8, padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'white', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Lock size={16} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {showLockedCard.label} is available on {showLockedCard.minPlan} plan (${subscriptionPlans.find(p => p.name === showLockedCard.minPlan)?.price || 149}/user/month)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Unlock long-form analysis, compliance reviews, and nuanced reasoning
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => setShowLockedCard(null)} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>Maybe later</button>
                    <button onClick={() => { setShowLockedCard(null); setShowPlanModal(true); }} style={{ fontSize: 12, color: 'white', backgroundColor: 'var(--navy)', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 500 }}>View Plans</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border)', borderRadius: 16, background: '#fff', height: 48, padding: '0 6px 0 12px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}><Plus size={20} /></div>
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={inputPlaceholder} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'transparent' }} />
              <div onClick={() => sendMessage(input)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><ArrowUp size={16} color="#fff" /></div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              YourAI may produce inaccurate information. Always verify critical outputs. <strong>Private &amp; encrypted.</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Comparison Modal */}
      {showPlanModal && <PlanComparisonModal currentPlan={plan} onClose={() => setShowPlanModal(false)} navigate={navigate} />}
    </div>
  );
}
