import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, MessageSquare, Clock, Share2, Grid3X3, Calendar, Users,
  FolderOpen, ChevronDown, ChevronRight, MoreVertical, Plus, Download,
  Search, Bell, ArrowUp, Shield, Sparkles, FileText, Building2, Scale,
  LayoutDashboard, Send, MapPin, FileSearch
} from 'lucide-react';

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
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    active: true,
    dotColor: '#22C55E',
    subtitle: '3 workflows running \u00b7 2 artifacts pending',
  },
  {
    icon: MessageSquare,
    label: 'Client Inbox',
    badge: '4',
    badgeStyle: 'navy',
    subtitle: 'Secure client messages, uploads, a...',
  },
  {
    icon: Clock,
    label: 'Time',
    subtitle: '4.4h tracked today \u00b7 18.6h this week',
  },
  {
    icon: Share2,
    label: 'Knowledge Graph',
    badge: 'New',
    badgeStyle: 'green',
    subtitle: '12 entities \u00b7 47 relationships',
  },
  {
    icon: Grid3X3,
    label: 'Workspaces',
    badge: '3',
    badgeStyle: 'navy',
    subtitle: '3 active \u00b7 1 shared with you',
  },
  {
    icon: Calendar,
    label: 'Calendar',
    badge: '2',
    badgeStyle: 'navy',
    subtitle: 'Meetings, reminders, and synced s...',
  },
  {
    icon: Users,
    label: 'Clients',
    badge: '3',
    badgeStyle: 'navy',
    collapsible: true,
    subtitle: 'Last accessed: Today',
    children: [
      { label: 'Acme Corp', status: 'Active', statusColor: '#16A34A' },
      { label: 'Meridian Health', status: 'Active', statusColor: '#16A34A' },
      { label: 'NovaTech Solutions', status: '5d ago', statusColor: 'var(--text-muted)' },
      { label: 'Access Control', isSubNav: true },
      { label: 'Activity', isSubNav: true },
    ],
  },
];

const libraryItems = [
  {
    icon: FolderOpen,
    label: 'Document Vault',
    badge: '128',
    badgeStyle: 'navy',
    subtitle: 'Recent: Vendor_Agreement.pdf \u00b7 1h...',
  },
];

function Sidebar() {
  const [clientsOpen, setClientsOpen] = useState(true);

  const renderItem = (item, idx) => {
    const Icon = item.icon;
    const isClients = item.collapsible;
    return (
      <div key={idx}>
        <div
          onClick={isClients ? () => setClientsOpen((o) => !o) : undefined}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 8,
            cursor: isClients ? 'pointer' : 'default',
            background: item.active ? '#EDF3FA' : 'transparent',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          {item.dotColor && (
            <span
              style={{
                position: 'absolute',
                left: 4,
                top: 14,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: item.dotColor,
              }}
            />
          )}
          <Icon size={16} style={{ marginTop: 2, color: 'var(--text-secondary)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {item.label}
              </span>
              {item.badge && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: 999,
                    ...(item.badgeStyle === 'navy'
                      ? { background: 'var(--navy)', color: '#fff' }
                      : { background: '#DCFCE7', color: '#166534' }),
                  }}
                >
                  {item.badge}
                </span>
              )}
              {isClients && (
                <span style={{ marginLeft: 'auto' }}>
                  {clientsOpen ? (
                    <ChevronDown size={14} color="var(--text-muted)" />
                  ) : (
                    <ChevronRight size={14} color="var(--text-muted)" />
                  )}
                </span>
              )}
            </div>
            {item.subtitle && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.subtitle}
              </div>
            )}
          </div>
        </div>
        {isClients && clientsOpen && item.children && (
          <div style={{ paddingLeft: 32, marginTop: 2 }}>
            {item.children.map((child, ci) =>
              child.isSubNav ? (
                <div
                  key={ci}
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    padding: '4px 0',
                    cursor: 'pointer',
                  }}
                >
                  {child.label}
                </div>
              ) : (
                <div
                  key={ci}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    padding: '3px 0',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{'\u2022'}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{child.label}</span>
                  <span style={{ fontSize: 11, color: child.statusColor, marginLeft: 'auto' }}>
                    {child.status}
                  </span>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        width: 248,
        minWidth: 248,
        background: '#fff',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '18px 16px 0' }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18 }}>
          <span style={{ color: 'var(--navy)' }}>Your</span>
          <span style={{ color: '#C9A84C' }}>AI</span>
        </span>
      </div>

      {/* Nav sections — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {/* MAIN label */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '20px 12px 6px',
          }}
        >
          Main
        </div>
        {sidebarItems.map(renderItem)}

        {/* LIBRARY label */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '18px 12px 6px',
          }}
        >
          Library
        </div>
        {libraryItems.map(renderItem)}
      </div>

      {/* Bottom pinned area */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {/* User info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--navy)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            RM
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              Ryan Melade
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Admin &middot; Team Plan</div>
          </div>
          <MoreVertical size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
        </div>

        {/* Bottom buttons */}
        <div style={{ display: 'flex' }}>
          <button
            style={{
              flex: 1,
              padding: '10px 0',
              border: '1px solid var(--border)',
              background: '#fff',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              borderBottomLeftRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              color: 'var(--text-secondary)',
            }}
          >
            <Plus size={14} /> New
          </button>
          <button
            style={{
              flex: 1,
              padding: '10px 0',
              border: '1px solid var(--border)',
              borderLeft: 'none',
              background: '#fff',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              borderBottomRightRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              color: 'var(--text-secondary)',
            }}
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Top Nav ─────────────────── */
function TopNav() {
  return (
    <div
      style={{
        height: 50,
        minHeight: 50,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: '#fff',
      }}
    >
      {/* Left links */}
      <div style={{ display: 'flex', gap: 24 }}>
        {['Models', 'Infrastructure', 'Security', 'Artifacts'].map((t) => (
          <span
            key={t}
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>
          &lt; Main Site
        </span>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            readOnly
            placeholder="Search files, knowledge, or conversatio..."
            style={{
              width: 240,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--border)',
              paddingLeft: 30,
              paddingRight: 40,
              fontSize: 13,
              color: 'var(--text-secondary)',
              background: '#fff',
              outline: 'none',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 11,
              color: 'var(--text-muted)',
              background: '#F1F5F9',
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 500,
            }}
          >
            {'\u2318'}K
          </span>
        </div>

        {/* Bell */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <Bell size={18} color="var(--text-secondary)" />
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--navy)',
              border: '2px solid #fff',
            }}
          />
        </div>

        {/* Avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--navy)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          R
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Risk Card ─────────────────── */
function RiskCard({ card }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 20,
        marginTop: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={18} color="#DC2626" />
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
          {card.title}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{card.subtitle}</div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '14px 0' }} />

      {/* Risk items */}
      {card.risks.map((r, i) => {
        const c = riskColors[r.level];
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: 999,
                background: c.bg,
                color: c.text,
                flexShrink: 0,
              }}
            >
              {r.level}
            </span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{r.text}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
              {r.section}
            </span>
          </div>
        );
      })}

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {card.tags.map((t) => (
          <span
            key={t}
            style={{
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 999,
              background: '#F3F4F6',
              color: 'var(--text-secondary)',
            }}
          >
            {t}
          </span>
        ))}
      </div>

      {/* View full report */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <span
          style={{
            fontSize: 13,
            color: '#C9A84C',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          View full report <ChevronRight size={14} />
        </span>
      </div>
    </div>
  );
}

/* ─────────────────── Message Bubble ─────────────────── */
function MessageBubble({ msg }) {
  const isBot = msg.sender === 'bot';
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      {/* Avatar */}
      {isBot ? (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={16} color="#fff" />
        </div>
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--navy)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          R
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {isBot ? 'YourAI' : 'Ryan'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{msg.timestamp}</span>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>
          {bold(msg.content)}
        </div>
        {msg.card && <RiskCard card={msg.card} />}
      </div>
    </div>
  );
}

/* ─────────────────── Typing Indicator ─────────────────── */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Sparkles size={16} color="#fff" />
      </div>
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
      <style>{`
        @keyframes blink {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
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

  // Priority 1 — primaryState
  if (state && prompts.length < 3) {
    prompts.push({
      icon: MapPin,
      title: `${state} Legal Research`,
      prompt: `What are the current ${state} state laws on ${areas[0] || 'corporate law'}?`,
    });
  }

  // Priority 2 — practiceArea-based
  if (prompts.length < 3) {
    for (const area of areas) {
      if (prompts.length >= 3) break;
      if (area === 'Corporate & M&A') {
        prompts.push({ icon: FileText, title: 'Contract Analysis', prompt: 'Analyze this M&A agreement and flag any unusual indemnification clauses' });
      } else if (area === 'Litigation') {
        prompts.push({ icon: Scale, title: 'Case Research', prompt: `Research recent ${state || 'state'} court decisions on summary judgment standards` });
      } else if (area === 'Employment & Labor') {
        prompts.push({ icon: Users, title: 'Employment Law', prompt: `Summarize ${state || 'state'} employment law requirements for non-compete agreements` });
      } else if (area === 'Real Estate') {
        prompts.push({ icon: Building2, title: 'Real Estate', prompt: `Review this lease agreement for ${state || 'state'} compliance issues` });
      }
    }
  }

  // Priority 3 — primaryGoal-based
  if (prompts.length < 3) {
    if (goal === 'Analyze a Contract') {
      prompts.push({ icon: FileSearch, title: 'Analyze a Contract', prompt: 'Upload a contract and I\'ll identify key risks, unusual clauses, and recommended changes' });
    } else if (goal === 'Research Legal Questions') {
      prompts.push({ icon: Search, title: 'Legal Research', prompt: 'Ask me any legal question and I\'ll provide cited answers from your documents' });
    } else if (goal === 'Set Up My Workspace') {
      prompts.push({ icon: LayoutDashboard, title: 'Set Up Workspace', prompt: 'Help me organize my first workspace and invite my team members' });
    }
  }

  // Fill remaining with defaults
  const defaults = [
    { icon: FileSearch, title: 'Analyze a Contract', prompt: 'Upload a contract and I\'ll identify key risks, unusual clauses, and recommended changes' },
    { icon: Search, title: 'Legal Research', prompt: 'Ask me any legal question and I\'ll provide cited answers from your documents' },
    { icon: LayoutDashboard, title: 'Set Up Workspace', prompt: 'Help me organize my first workspace and invite my team members' },
  ];
  for (const d of defaults) {
    if (prompts.length >= 3) break;
    if (!prompts.find((p) => p.title === d.title)) {
      prompts.push(d);
    }
  }

  return prompts.slice(0, 3);
}

function EmptyState({ profile, onPromptClick, navigate }) {
  const currentUserName = 'Ryan';
  const prompts = getSuggestedPrompts(profile);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 40px',
      }}
    >
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        {/* YourAI logo mark */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Sparkles size={20} color="#fff" />
        </div>

        {/* Greeting */}
        <h2
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--navy)',
            margin: '0 0 8px',
          }}
        >
          {getGreeting()}, {currentUserName}
        </h2>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: 'var(--text-muted)',
            margin: '0 0 28px',
          }}
        >
          Your AI assistant is ready. Based on your profile, here's where you can start:
        </p>

        {/* Prompt cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          {prompts.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={i}
                onClick={() => onPromptClick(p.prompt)}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#C9A84C';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Icon size={18} color="var(--navy)" style={{ marginBottom: 6 }} />
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--navy)',
                    marginBottom: 4,
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {p.prompt}
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit preferences link */}
        <button
          onClick={() => navigate('/app/profile')}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginTop: 20,
            padding: 0,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          &#9998; Edit your preferences
        </button>
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
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const responseIdx = useRef(0);

  // Read profile from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('yourai_user_profile');
      if (raw) setProfile(JSON.parse(raw));
    } catch (_) { /* ignore */ }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Contextual placeholder
  const inputPlaceholder = profile && profile.primaryState
    ? `Ask anything about ${profile.primaryState} law or your documents...`
    : 'Ask anything, analyze files, or search the web...';

  const handlePromptClick = useCallback((promptText) => {
    setInput(promptText);
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const sendMessage = useCallback(
    (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed || isTyping) return;

      // First message transitions out of empty state
      if (showEmptyState) {
        setShowEmptyState(false);
      }

      const userMsg = {
        id: Date.now(),
        sender: 'user',
        content: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsTyping(true);

      setTimeout(() => {
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          content: MOCK_RESPONSES[responseIdx.current % MOCK_RESPONSES.length],
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        };
        responseIdx.current += 1;
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
      }, 1500);
    },
    [isTyping, showEmptyState],
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Nav */}
        <TopNav />

        {/* Chat area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#FAFBFC',
            minHeight: 0,
          }}
        >
          {/* Scrollable messages OR empty state */}
          {showEmptyState ? (
            <EmptyState profile={profile} onPromptClick={handlePromptClick} navigate={navigate} />
          ) : (
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 40px',
              }}
            >
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isTyping && <TypingIndicator />}

              {/* Quick actions */}
              {!isTyping && (
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {QUICK_ACTIONS.map((a) => (
                      <button
                        key={a.label}
                        onClick={() => sendMessage(a.label)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          background: '#fff',
                          padding: '8px 16px',
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{a.emoji}</span> {a.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {QUICK_ACTIONS_2.map((a) => (
                      <button
                        key={a.label}
                        onClick={() => sendMessage(a.label)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          background: '#fff',
                          padding: '8px 16px',
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{a.emoji}</span> {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat input — pinned bottom */}
          <div style={{ padding: '16px 40px 12px', background: 'transparent' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: '1px solid var(--border)',
                borderRadius: 16,
                background: '#fff',
                height: 48,
                padding: '0 6px 0 12px',
              }}
            >
              {/* Plus button */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <Plus size={20} />
              </div>

              {/* Input */}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={inputPlaceholder}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  background: 'transparent',
                }}
              />

              {/* Send button */}
              <div
                onClick={() => sendMessage(input)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--navy)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <ArrowUp size={16} color="#fff" />
              </div>
            </div>

            {/* Disclaimer */}
            <div
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text-muted)',
                marginTop: 8,
              }}
            >
              YourAI may produce inaccurate information. Always verify critical outputs.{' '}
              <strong>Private &amp; encrypted.</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
