import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  CheckCircle, MessageSquare, Clock, Share2, Grid3X3, Calendar, Users,
  FolderOpen, ChevronDown, ChevronRight, MoreVertical, Plus, Download,
  Search, Bell, ArrowUp, Shield, Sparkles, FileText, Building2, Scale,
  LayoutDashboard, Send, MapPin, FileSearch, Lock, X, AlertTriangle, Info, Zap,
  BookOpen, UserPlus, Trash2, Edit3, Copy, Phone, Mail, Briefcase, Hash, Menu,
  Package, Link2, File, Upload, Paperclip, Database, GitBranch, Settings, LogOut
} from 'lucide-react';
import { billingData, subscriptionPlans } from '../../data/mockData';
import { callLLM, getApiKey } from '../../lib/llm-client';
import { extractFileText } from '../../lib/file-parser';
import { trackDocUpload } from '../../lib/auth';

// Removed: MOCK_RESPONSES array — replaced with real streaming fetch to /api/chat
// See: tech-stack.md — Backend API section

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


/* ─── Default Prompt Templates ─── */
const DEFAULT_PROMPT_TEMPLATES = [
  { id: 1, title: 'Contract Risk Analysis', prompt: 'Analyze the following contract and identify all high-risk clauses, non-standard terms, and potential liabilities. Compare against our standard playbook and flag deviations.', category: 'Analysis', createdAt: 'Apr 1, 2026' },
  { id: 2, title: 'Due Diligence Summary', prompt: 'Perform a comprehensive due diligence review on the attached documents. Summarize key findings, red flags, and recommended next steps in a structured report format.', category: 'Review', createdAt: 'Mar 28, 2026' },
  { id: 3, title: 'Legal Research Memo', prompt: 'Research the following legal question and provide a detailed memo with relevant case law, statutes, and regulatory guidance. Include citations and a brief analysis of how each authority applies.', category: 'Research', createdAt: 'Mar 25, 2026' },
  { id: 4, title: 'Clause Comparison', prompt: 'Compare the clauses in the uploaded document against our standard NDA template. Highlight additions, deletions, and modifications with risk level for each change.', category: 'Analysis', createdAt: 'Mar 20, 2026' },
  { id: 5, title: 'Executive Brief', prompt: 'Generate a concise executive brief summarizing the key terms, obligations, and risks of this agreement. Keep it under 500 words and suitable for senior partner review.', category: 'Summary', createdAt: 'Mar 15, 2026' },
];

/* ─── Default Clients ─── */
const DEFAULT_CLIENTS = [
  { id: 1, name: 'Acme Corp', contactName: 'John Mitchell', email: 'john@acmecorp.com', phone: '(212) 555-0142', type: 'Corporate', status: 'Active', addedBy: 'Ryan Melade', addedAt: 'Jan 15, 2026', matters: 3 },
  { id: 2, name: 'Meridian Health', contactName: 'Sarah Park', email: 'sarah@meridianhealth.com', phone: '(415) 555-0198', type: 'Healthcare', status: 'Active', addedBy: 'Sarah Chen', addedAt: 'Feb 3, 2026', matters: 2 },
  { id: 3, name: 'NovaTech Solutions', contactName: 'Alex Rivera', email: 'alex@novatech.io', phone: '(310) 555-0267', type: 'Technology', status: 'Active', addedBy: 'Ryan Melade', addedAt: 'Mar 10, 2026', matters: 1 },
];

/* ─── Default Knowledge Packs ─── */
const DEFAULT_KNOWLEDGE_PACKS = [
  {
    id: 1,
    name: 'NDA Playbook',
    description: 'Standard NDA clauses, review guidelines, and firm-approved terms.',
    docs: [
      { id: 1, name: 'Standard_NDA_Template.pdf', size: '1.2 MB', uploaded: 'Mar 12, 2026' },
      { id: 2, name: 'NDA_Risk_Checklist.docx', size: '0.4 MB', uploaded: 'Mar 15, 2026' },
      { id: 3, name: 'Mutual_NDA_Redline_Example.pdf', size: '0.9 MB', uploaded: 'Mar 18, 2026' },
    ],
    links: [
      { id: 1, name: 'ABA Model NDA Guidelines', url: 'https://americanbar.org/nda-guidelines' },
    ],
    createdAt: 'Mar 10, 2026',
  },
  {
    id: 2,
    name: 'M&A Due Diligence',
    description: 'Due diligence checklist, templates, and precedent cases for M&A transactions.',
    docs: [
      { id: 1, name: 'DD_Checklist_v3.pdf', size: '2.1 MB', uploaded: 'Mar 20, 2026' },
      { id: 2, name: 'Meridian_Precedent.pdf', size: '5.3 MB', uploaded: 'Mar 22, 2026' },
      { id: 3, name: 'Indemnification_Clauses.docx', size: '0.8 MB', uploaded: 'Mar 25, 2026' },
    ],
    links: [
      { id: 1, name: 'SEC M&A Filing Requirements', url: 'https://sec.gov/ma-filings' },
      { id: 2, name: 'Delaware Court of Chancery', url: 'https://courts.delaware.gov/chancery' },
    ],
    createdAt: 'Mar 18, 2026',
  },
  {
    id: 3,
    name: 'Employment Law — California',
    description: 'California-specific employment and labor regulations, statutes, and precedent.',
    docs: [
      { id: 1, name: 'CA_Labor_Code.pdf', size: '8.2 MB', uploaded: 'Feb 28, 2026' },
      { id: 2, name: 'Non_Compete_Enforcement.docx', size: '0.6 MB', uploaded: 'Mar 2, 2026' },
    ],
    links: [
      { id: 1, name: 'CA Department of Industrial Relations', url: 'https://dir.ca.gov' },
    ],
    createdAt: 'Feb 25, 2026',
  },
];

/* ─── Chat Threads (conversation history) ─── */
const DEFAULT_THREADS = [
  {
    id: 'thread-1',
    title: 'New Conversation',
    preview: '',
    updatedAt: 'Just now',
    messageCount: 0,
    isActive: true,
  },
];

const THREAD_MESSAGES = {
  'thread-2': [
    { id: 101, sender: 'user', content: 'Can an employer enforce a non-compete in California?', timestamp: 'Yesterday, 4:32 PM' },
    { id: 102, sender: 'bot', content: 'Short answer: **No** — California generally does not allow non-compete agreements. Under California Business and Professions Code Section 16600, any contract that prevents someone from working in their profession is void.', timestamp: 'Yesterday, 4:32 PM', sourceBadge: 'Answered from: YourAI knowledge base' },
  ],
  'thread-3': [
    { id: 201, sender: 'user', content: 'Draft a non-compete clause for an employment agreement in Texas', timestamp: 'Apr 9, 2026 · 2:15 PM' },
    { id: 202, sender: 'bot', content: 'Here\'s a draft non-compete clause tailored for Texas employment law. Note that Texas requires non-competes to be "ancillary to or part of an otherwise enforceable agreement" per TX Bus. & Com. Code §15.50.', timestamp: 'Apr 9, 2026 · 2:15 PM', sourceBadge: 'Answered from: YourAI knowledge base' },
  ],
  'thread-4': [
    { id: 301, sender: 'user', content: 'Review the indemnification section of the Acme Corp MSA', timestamp: 'Apr 8, 2026 · 10:00 AM' },
    { id: 302, sender: 'bot', content: 'I\'ve reviewed the indemnification provisions in the **Acme Corp Master Services Agreement (v4)**. I found 2 indemnification clauses on pages 18-19 with one flagged concern.', timestamp: 'Apr 8, 2026 · 10:00 AM', sourceBadge: 'Answered from: your document' },
  ],
};

const DEFAULT_DOCUMENT_VAULT = [
  {
    id: 1,
    name: 'Master Services Agreement — Acme Corp',
    description: 'Signed MSA covering SaaS delivery, support SLAs, and data processing terms.',
    fileName: 'MSA_Acme_Corp_v4.pdf',
    fileSize: '2.4 MB',
    createdAt: 'Mar 14, 2026',
  },
  {
    id: 2,
    name: 'Employee Handbook 2026',
    description: 'Current employee handbook with updated PTO, remote work, and conduct policies.',
    fileName: 'Employee_Handbook_2026.pdf',
    fileSize: '3.8 MB',
    createdAt: 'Jan 30, 2026',
  },
  {
    id: 3,
    name: 'Series B Term Sheet',
    description: 'Executed term sheet for Series B financing round with Ridgeline Ventures.',
    fileName: 'SeriesB_TermSheet_Signed.pdf',
    fileSize: '0.6 MB',
    createdAt: 'Feb 22, 2026',
  },
];

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
/** Lightweight markdown renderer: bold, bullets, numbered lists, newlines */
const renderMarkdown = (str) => {
  if (!str) return null;
  const lines = str.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null; // 'ul' or 'ol'

  const flushList = () => {
    if (listItems.length > 0) {
      const Tag = listType === 'ol' ? 'ol' : 'ul';
      elements.push(<Tag key={`list-${elements.length}`} style={{ margin: '6px 0', paddingLeft: 22 }}>{listItems}</Tag>);
      listItems = [];
      listType = null;
    }
  };

  const inlineBold = (text, keyPrefix) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={`${keyPrefix}-${i}`}>{p.slice(2, -2)}</strong>
        : <span key={`${keyPrefix}-${i}`}>{p}</span>
    );
  };

  lines.forEach((line, i) => {
    const bulletMatch = line.match(/^\s*[\*\-•]\s+(.*)/);
    const numberedMatch = line.match(/^\s*(\d+)[\.\)]\s+(.*)/);

    if (bulletMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(<li key={`li-${i}`} style={{ marginBottom: 3 }}>{inlineBold(bulletMatch[1], `b-${i}`)}</li>);
    } else if (numberedMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(<li key={`li-${i}`} style={{ marginBottom: 3 }}>{inlineBold(numberedMatch[2], `n-${i}`)}</li>);
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<div key={`br-${i}`} style={{ height: 8 }} />);
      } else {
        elements.push(<p key={`p-${i}`} style={{ margin: '3px 0' }}>{inlineBold(line, `p-${i}`)}</p>);
      }
    }
  });
  flushList();
  return elements;
};
// Backward compat alias
const bold = renderMarkdown;

const riskColors = {
  HIGH: { bg: '#FEE2E2', text: '#991B1B' },
  MEDIUM: { bg: '#FEF3C7', text: '#92400E' },
  LOW: { bg: '#EFF6FF', text: '#1D4ED8' },
};

/* ─────────────────── Sidebar ─────────────────── */
/* CONFIDENCE: 5/10 — Sidebar redesign based on Arjun wireframe (Apr 2026).
   Layout structure confirmed by Arjun. Not signed off by Ryan.
   All existing nav items preserved — reorganised only. */

function Sidebar({ onOpenPromptTemplates, onOpenClients, onOpenKnowledgePacks, onOpenDocumentVault, promptCount, clientCount, packCount, vaultCount, isOpen, onClose, threads, activeThreadId, onSwitchThread, onNewThread, onDeleteThread, threadSearch, onThreadSearchChange }) {
  // Collapse state — persisted to localStorage
  const [workspaceOpen, setWorkspaceOpen] = useState(() => {
    try { const v = localStorage.getItem('yourai_sidebar_workspace_open'); return v === null ? true : v === 'true'; } catch { return true; }
  });
  const [knowledgeOpen, setKnowledgeOpen] = useState(() => {
    try { const v = localStorage.getItem('yourai_sidebar_knowledge_open'); return v === null ? true : v === 'true'; } catch { return true; }
  });
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredThread, setHoveredThread] = useState(null);

  const toggleWorkspace = () => {
    setWorkspaceOpen(prev => { const next = !prev; try { localStorage.setItem('yourai_sidebar_workspace_open', String(next)); } catch {} return next; });
  };
  const toggleKnowledge = () => {
    setKnowledgeOpen(prev => { const next = !prev; try { localStorage.setItem('yourai_sidebar_knowledge_open', String(next)); } catch {} return next; });
  };

  // ─── Workspace items ───
  const workspaceItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', active: true, rightText: '3 running' },
    { id: 'workspaces', icon: Briefcase, label: 'Workspaces', rightText: '3' },
    { id: 'clients', icon: Users, label: 'Clients', rightText: String(clientCount), onClick: onOpenClients },
    { id: 'knowledge-graph', icon: GitBranch, label: 'Knowledge Graph', badge: 'New' },
  ];

  // ─── Knowledge items ───
  const knowledgeItems = [
    { id: 'document-vault', icon: FolderOpen, label: 'Document vault', rightText: String(vaultCount), onClick: onOpenDocumentVault },
    { id: 'knowledge-packs', icon: Package, label: 'Knowledge packs', rightText: String(packCount), onClick: onOpenKnowledgePacks },
    { id: 'prompt-templates', icon: FileText, label: 'Prompt templates', rightText: String(promptCount), onClick: onOpenPromptTemplates },
  ];

  // ─── Shared nav item renderer ───
  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isActive = item.active;
    const isHovered = hoveredItem === item.id;
    return (
      <div
        key={item.id}
        onClick={item.onClick || undefined}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 32, padding: '7px 8px', borderRadius: 6,
          cursor: item.onClick ? 'pointer' : 'default',
          userSelect: 'none',
          background: isActive ? '#fff' : isHovered ? '#fff' : 'transparent',
          border: isActive ? '0.5px solid var(--border)' : '0.5px solid transparent',
          transition: 'background 150ms ease, border-color 150ms ease',
        }}
      >
        <Icon size={14} style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
        {item.badge && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: '#DCFCE7', color: '#166534', flexShrink: 0 }}>
            {item.badge}
          </span>
        )}
        {item.rightText && !item.badge && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
            {item.rightText}
          </span>
        )}
      </div>
    );
  };

  // ─── Section header renderer ───
  const renderSectionHeader = (label, isOpen, onToggle) => (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 8px', marginBottom: 4, cursor: 'pointer', userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <ChevronDown size={12} style={{
        color: 'var(--text-muted)',
        transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
        transition: 'transform 200ms ease',
      }} />
    </div>
  );

  // ─── Recent chats — show only 3 most recent ───
  const recentThreads = (threads || []).slice(0, 3);
  const totalThreads = (threads || []).length;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          style={{ backdropFilter: 'blur(2px)' }}
        />
      )}
    <div
      className={`fixed inset-y-0 left-0 z-40 transform transition-transform md:relative md:translate-x-0 md:flex ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ width: 248, minWidth: 248, background: '#fff', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
    >
      {/* ═══ ZONE 1 — Header ═══ */}
      <div style={{ padding: '14px 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18 }}>
          <span style={{ color: 'var(--navy)' }}>Your</span><span style={{ color: '#C9A84C' }}>AI</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Green online dot + avatar — desktop */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>RM</div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ═══ ZONE 2 — New Chat Button ═══ */}
      <div style={{ padding: '12px 12px 0' }}>
        <button
          onClick={onNewThread}
          style={{
            width: '100%', height: 34, borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 12px', background: '#fff',
            border: '0.5px solid var(--border)',
            fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
            cursor: 'pointer', transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
        >
          <Plus size={14} />
          <span>New chat</span>
        </button>
      </div>

      {/* ═══ Scrollable area: sections ═══ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ═══ ZONE 3 — WORKSPACE Section ═══ */}
        <div>
          {renderSectionHeader('Workspace', workspaceOpen, toggleWorkspace)}
          <div style={{
            overflow: 'hidden',
            maxHeight: workspaceOpen ? '400px' : '0px',
            transition: 'max-height 200ms ease',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {workspaceItems.map(renderNavItem)}
            </div>
          </div>
        </div>

        {/* ═══ ZONE 4 — KNOWLEDGE Section ═══ */}
        <div>
          {renderSectionHeader('Knowledge', knowledgeOpen, toggleKnowledge)}
          <div style={{
            overflow: 'hidden',
            maxHeight: knowledgeOpen ? '400px' : '0px',
            transition: 'max-height 200ms ease',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {knowledgeItems.map(renderNavItem)}
            </div>
          </div>
        </div>

        {/* ═══ ZONE 5 — RECENT CHATS Section ═══ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent Chats
            </span>
            <button
              onClick={() => setShowChatSearch(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
              title="Search chats"
            >
              <Search size={12} />
            </button>
          </div>

          {/* Chat search — toggled by search icon */}
          {showChatSearch && (
            <div style={{ padding: '0 4px 6px', position: 'relative' }}>
              <Search size={11} style={{ position: 'absolute', left: 14, top: 8, color: 'var(--text-muted)' }} />
              <input
                value={threadSearch}
                onChange={(e) => onThreadSearchChange(e.target.value)}
                placeholder="Search chats..."
                autoFocus
                style={{ width: '100%', height: 28, borderRadius: 6, border: '1px solid var(--border)', paddingLeft: 26, fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)' }}
              />
            </div>
          )}

          {/* Recent thread list — 3 max */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentThreads.map(t => {
              const isActive = t.id === activeThreadId;
              const isHov = hoveredThread === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => onSwitchThread(t.id)}
                  onMouseEnter={() => setHoveredThread(t.id)}
                  onMouseLeave={() => setHoveredThread(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 6,
                    cursor: 'pointer', userSelect: 'none',
                    minHeight: 44,
                    background: isActive ? '#fff' : isHov ? '#fff' : 'transparent',
                    border: isActive ? '0.5px solid var(--border)' : '0.5px solid transparent',
                    transition: 'background 150ms ease, border-color 150ms ease',
                  }}
                >
                  <MessageSquare size={13} style={{ color: isActive ? 'var(--navy)' : 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      {t.updatedAt} &middot; {t.messageCount} msgs
                    </div>
                  </div>
                  {/* Delete — appears on hover */}
                  {isHov && totalThreads > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteThread(t.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', flexShrink: 0 }}
                      title="Delete conversation"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* View all link */}
          {totalThreads > 3 && (
            <div
              onClick={() => setShowChatSearch(true)}
              style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 8px', cursor: 'pointer', userSelect: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--navy)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              View all chats &rarr;
            </div>
          )}
        </div>
      </div>

      {/* ═══ ZONE 6 — User Profile Footer ═══ */}
      <div style={{ borderTop: '0.5px solid var(--border)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>RM</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>Ryan Melade</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.3 }}>Admin &middot; Team Plan</div>
          </div>
          <button
            onClick={() => setShowProfileMenu(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <MoreVertical size={14} />
          </button>
        </div>

        {/* Three-dot popover menu */}
        {showProfileMenu && (
          <>
            <div onClick={() => setShowProfileMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
            <div style={{
              position: 'absolute', bottom: '100%', left: 12, right: 12, marginBottom: 4,
              background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 51, overflow: 'hidden',
            }}>
              {[
                { icon: Download, label: 'Export', onClick: () => { setShowProfileMenu(false); } },
                { icon: Settings, label: 'Settings', onClick: () => { setShowProfileMenu(false); } },
                { icon: LogOut, label: 'Sign out', onClick: () => { setShowProfileMenu(false); }, danger: true },
              ].map((menuItem, i) => {
                const MIcon = menuItem.icon;
                return (
                  <div
                    key={i}
                    onClick={menuItem.onClick}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', cursor: 'pointer', fontSize: 12,
                      color: menuItem.danger ? '#DC2626' : 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <MIcon size={13} />
                    <span>{menuItem.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
/* ─────────────────── Prompt Templates Panel ─────────────────── */
function PromptTemplatesPanel({ templates, onUsePrompt, onClose, onCreateNew, onDelete }) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category)))];
  const filtered = templates.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.prompt.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== 'All' && t.category !== filterCat) return false;
    return true;
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[580px] md:max-h-[85vh] md:rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 61, display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Prompt Templates</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{templates.length} saved prompts · Click to use in chat</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onCreateNew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}><Plus size={14} /> New Template</button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
          </div>
          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3" style={{ marginTop: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 32, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {categories.map(c => (
                <button key={c} onClick={() => setFilterCat(c)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, border: '1px solid ' + (filterCat === c ? 'var(--navy)' : 'var(--border)'), background: filterCat === c ? 'var(--navy)' : 'white', color: filterCat === c ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}>{c}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Template list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <BookOpen size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>No templates found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Try a different search or create a new template</div>
            </div>
          ) : (
            filtered.map(t => (
              <div key={t.id} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', marginTop: 8, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div className="flex items-start justify-between">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: 500 }}>{t.category}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.prompt}</p>
                  </div>
                  <div className="flex items-center gap-1" style={{ marginLeft: 12, flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); onUsePrompt(t.prompt); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer' }} title="Use this prompt"><Copy size={12} /> Use</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} style={{ padding: '5px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }} title="Delete"><Trash2 size={13} style={{ color: '#991B1B' }} /></button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Created {t.createdAt}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Create Prompt Template Modal ─────────────────── */
function CreatePromptModal({ onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Analysis');
  const categories = ['Analysis', 'Review', 'Research', 'Summary', 'Drafting', 'Other'];

  const handleSave = () => {
    if (!title.trim() || !prompt.trim()) return;
    onSave({ title: title.trim(), prompt: prompt.trim(), category });
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 71 }}>
        <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>New Prompt Template</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Template name</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Contract Risk Analysis" style={{ width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Category</label>
            <div className="flex gap-2 flex-wrap">
              {categories.map(c => (
                <button key={c} onClick={() => setCategory(c)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: '1px solid ' + (category === c ? 'var(--navy)' : 'var(--border)'), background: category === c ? 'var(--navy)' : 'white', color: category === c ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Prompt text</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Write your reusable prompt here..." rows={5} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || !prompt.trim()} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: (!title.trim() || !prompt.trim()) ? '#94A3B8' : 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: (!title.trim() || !prompt.trim()) ? 'not-allowed' : 'pointer' }}>Save Template</button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Clients Panel ─────────────────── */
function ClientsPanel({ clients, onClose, onAddClient, onDeleteClient }) {
  const [search, setSearch] = useState('');
  const filtered = clients.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const typeColors = {
    Corporate: { bg: '#EFF6FF', color: '#1D4ED8' },
    Healthcare: { bg: '#F0FDF4', color: '#166534' },
    Technology: { bg: '#FFFBEB', color: '#92400E' },
    'Real Estate': { bg: '#FDF2F8', color: '#9D174D' },
    Other: { bg: '#F1F5F9', color: '#475569' },
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[620px] md:max-h-[85vh] md:rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 61, display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Clients</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{clients.length} clients · Manage your client directory</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onAddClient} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}><UserPlus size={14} /> Add Client</button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
          </div>
          <div style={{ position: 'relative', marginTop: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients by name, contact, or email..." style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 32, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
          </div>
        </div>

        {/* Client list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>No clients found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Add your first client to get started</div>
            </div>
          ) : (
            filtered.map(c => {
              const tc = typeColors[c.type] || typeColors.Other;
              return (
                <div key={c.id} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', marginTop: 8, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={18} style={{ color: 'var(--navy)' }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: tc.bg, color: tc.color, fontWeight: 500 }}>{c.type}</span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: c.status === 'Active' ? '#DCFCE7' : '#FEE2E2', color: c.status === 'Active' ? '#166534' : '#991B1B', fontWeight: 500 }}>{c.status}</span>
                        </div>
                        <div className="flex items-center gap-4" style={{ marginTop: 6 }}>
                          <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--text-muted)' }}><Users size={12} /> {c.contactName}</span>
                          <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--text-muted)' }}><Mail size={12} /> {c.email}</span>
                        </div>
                        <div className="flex items-center gap-4" style={{ marginTop: 4 }}>
                          <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--text-muted)' }}><Phone size={12} /> {c.phone}</span>
                          <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--text-muted)' }}><Briefcase size={12} /> {c.matters} matter{c.matters !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => onDeleteClient(c.id)} style={{ padding: 5, borderRadius: 6, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }} title="Remove client"><Trash2 size={13} style={{ color: '#991B1B' }} /></button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Added by {c.addedBy} · {c.addedAt}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Add Client Modal ─────────────────── */
function AddClientModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('Corporate');
  const types = ['Corporate', 'Healthcare', 'Technology', 'Real Estate', 'Other'];

  const handleSave = () => {
    if (!name.trim() || !contactName.trim() || !email.trim()) return;
    onSave({ name: name.trim(), contactName: contactName.trim(), email: email.trim(), phone: phone.trim(), type });
    onClose();
  };

  const inputStyle = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 71 }}>
        <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Add Client</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Company / Client name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Acme Corp" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Primary contact name *</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g., John Mitchell" style={inputStyle} />
          </div>
          <div className="flex gap-3">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="john@acmecorp.com" type="email" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(212) 555-0142" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Client type</label>
            <div className="flex gap-2 flex-wrap">
              {types.map(t => (
                <button key={t} onClick={() => setType(t)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: '1px solid ' + (type === t ? 'var(--navy)' : 'var(--border)'), background: type === t ? 'var(--navy)' : 'white', color: type === t ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || !contactName.trim() || !email.trim()} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: (!name.trim() || !contactName.trim() || !email.trim()) ? '#94A3B8' : 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: (!name.trim() || !contactName.trim() || !email.trim()) ? 'not-allowed' : 'pointer' }}>Add Client</button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Knowledge Packs Panel ─────────────────── */
function KnowledgePacksPanel({ packs, onClose, onCreateNew, onEdit, onDelete, onSelect, activePack }) {
  const [search, setSearch] = useState('');
  const filtered = packs.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[620px] md:max-h-[85vh] md:rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 61, display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Knowledge Packs</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{packs.length} packs · Bundle docs & links to attach to chats</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onCreateNew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}><Plus size={14} /> New Pack</button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
          </div>
          <div style={{ position: 'relative', marginTop: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search knowledge packs..." style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 32, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
          </div>
        </div>

        {/* Pack list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Package size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>No knowledge packs found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Create your first pack to get started</div>
            </div>
          ) : (
            filtered.map(p => (
              <div key={p.id} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', marginTop: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={18} style={{ color: 'var(--navy)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{p.description}</p>
                      <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 8 }}>
                        <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}><FileText size={12} /> {p.docs.length} doc{p.docs.length !== 1 ? 's' : ''}</span>
                        <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}><Link2 size={12} /> {p.links.length} link{p.links.length !== 1 ? 's' : ''}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Created {p.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                    {onSelect && (
                      <button onClick={() => onSelect(p)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, backgroundColor: activePack?.id === p.id ? '#16A34A' : 'var(--navy)', color: 'white', border: 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                        {activePack?.id === p.id ? <><CheckCircle size={12} /> Active</> : 'Use'}
                      </button>
                    )}
                    <button onClick={() => onEdit(p)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, backgroundColor: onSelect ? 'transparent' : 'var(--navy)', color: onSelect ? 'var(--navy)' : 'white', border: onSelect ? '1px solid var(--border)' : 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}><Edit3 size={12} /> Edit</button>
                    <button onClick={() => onDelete(p.id)} style={{ padding: 5, borderRadius: 6, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }} title="Delete pack"><Trash2 size={13} style={{ color: '#991B1B' }} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Edit / Create Knowledge Pack Modal ─────────────────── */
function EditKnowledgePackModal({ pack, onClose, onSave }) {
  const isNew = !pack;
  const [name, setName] = useState(pack?.name || '');
  const [description, setDescription] = useState(pack?.description || '');
  const [docs, setDocs] = useState(pack?.docs || []);
  const [links, setLinks] = useState(pack?.links || []);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);

  const MOCK_DOC_NAMES = ['Clause_Library.pdf', 'Compliance_Checklist.docx', 'Risk_Matrix_Template.xlsx', 'Precedent_Case.pdf', 'Standard_Terms.pdf'];

  const handleAddDoc = () => {
    const name = MOCK_DOC_NAMES[docs.length % MOCK_DOC_NAMES.length];
    setDocs(prev => [...prev, { id: Date.now(), name, size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`, uploaded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }]);
  };

  const handleRemoveDoc = (id) => setDocs(prev => prev.filter(d => d.id !== id));

  const handleAddLink = () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    setLinks(prev => [...prev, { id: Date.now(), name: linkName.trim(), url: linkUrl.trim() }]);
    setLinkName(''); setLinkUrl(''); setShowAddLink(false);
  };

  const handleRemoveLink = (id) => setLinks(prev => prev.filter(l => l.id !== id));

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: pack?.id || Date.now(), name: name.trim(), description: description.trim(), docs, links, createdAt: pack?.createdAt || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) });
    onClose();
  };

  const inputStyle = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[90vh] md:rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 71, display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>{isNew ? 'New Knowledge Pack' : 'Edit Knowledge Pack'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Pack name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., NDA Playbook" style={inputStyle} />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description of what's in this pack..." rows={2} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Documents ({docs.length})</label>
              <button onClick={handleAddDoc} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px dashed var(--border)', background: 'white', fontSize: 11, fontWeight: 500, color: 'var(--navy)', cursor: 'pointer' }}><Upload size={12} /> Add Document</button>
            </div>
            {docs.length === 0 ? (
              <div style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 8, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No documents yet — click Add Document</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {docs.map(d => (
                  <div key={d.id} className="flex items-center gap-2" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--ice-warm)' }}>
                    <File size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.size} · {d.uploaded}</div>
                    </div>
                    <button onClick={() => handleRemoveDoc(d.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Links ({links.length})</label>
              <button onClick={() => setShowAddLink(!showAddLink)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px dashed var(--border)', background: 'white', fontSize: 11, fontWeight: 500, color: 'var(--navy)', cursor: 'pointer' }}><Plus size={12} /> Add Link</button>
            </div>
            {showAddLink && (
              <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--ice-warm)', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Link title" style={{ ...inputStyle, height: 34, backgroundColor: 'white' }} />
                <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." style={{ ...inputStyle, height: 34, backgroundColor: 'white' }} />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => { setShowAddLink(false); setLinkName(''); setLinkUrl(''); }} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                  <button onClick={handleAddLink} disabled={!linkName.trim() || !linkUrl.trim()} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: (!linkName.trim() || !linkUrl.trim()) ? '#94A3B8' : 'var(--navy)', color: 'white', fontSize: 11, fontWeight: 500, cursor: (!linkName.trim() || !linkUrl.trim()) ? 'not-allowed' : 'pointer' }}>Save Link</button>
                </div>
              </div>
            )}
            {links.length === 0 && !showAddLink ? (
              <div style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 8, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No links yet — click Add Link</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {links.map(l => (
                  <div key={l.id} className="flex items-center gap-2" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--ice-warm)' }}>
                    <Link2 size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.url}</div>
                    </div>
                    <button onClick={() => handleRemoveLink(l.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: !name.trim() ? '#94A3B8' : 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: !name.trim() ? 'not-allowed' : 'pointer' }}>{isNew ? 'Create Pack' : 'Save Changes'}</button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Document Vault Panel ─────────────────── */
function DocumentVaultPanel({ documents, onClose, onCreateNew, onEdit, onDelete, onSelect, activeDocument }) {
  const [search, setSearch] = useState('');
  const filtered = documents.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.name.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q) || (d.fileName || '').toLowerCase().includes(q);
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[620px] md:max-h-[85vh] md:rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 61, display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Document Vault</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{documents.length} docs · Attach any single doc to a chat</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onCreateNew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}><Plus size={14} /> New Document</button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
          </div>
          <div style={{ position: 'relative', marginTop: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 32, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <FolderOpen size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>No documents found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Upload your first document to get started</div>
            </div>
          ) : (
            filtered.map(d => (
              <div key={d.id} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', marginTop: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <File size={18} style={{ color: 'var(--navy)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{d.description}</p>
                      <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 8 }}>
                        <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}><FileText size={12} /> {d.fileName}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.fileSize}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Created {d.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                    {onSelect && (
                      <button onClick={() => onSelect(d)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, backgroundColor: activeDocument?.id === d.id ? '#16A34A' : 'var(--navy)', color: 'white', border: 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                        {activeDocument?.id === d.id ? <><CheckCircle size={12} /> Active</> : 'Use'}
                      </button>
                    )}
                    <button onClick={() => onEdit(d)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, backgroundColor: onSelect ? 'transparent' : 'var(--navy)', color: onSelect ? 'var(--navy)' : 'white', border: onSelect ? '1px solid var(--border)' : 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}><Edit3 size={12} /> Edit</button>
                    <button onClick={() => onDelete(d.id)} style={{ padding: 5, borderRadius: 6, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }} title="Delete document"><Trash2 size={13} style={{ color: '#991B1B' }} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Edit / Create Document Modal ─────────────────── */
function EditDocumentModal({ document: docItem, onClose, onSave }) {
  const isNew = !docItem;
  const [name, setName] = useState(docItem?.name || '');
  const [description, setDescription] = useState(docItem?.description || '');
  const [fileName, setFileName] = useState(docItem?.fileName || '');
  const [fileSize, setFileSize] = useState(docItem?.fileSize || '');
  const fileInputRef = useRef(null);

  const handlePickFile = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setFileSize(`${(f.size / (1024 * 1024)).toFixed(1)} MB`);
    e.target.value = '';
  };
  const handleRemoveFile = () => { setFileName(''); setFileSize(''); };

  const handleSave = () => {
    if (!name.trim() || !fileName.trim()) return;
    onSave({
      id: docItem?.id || Date.now(),
      name: name.trim(),
      description: description.trim(),
      fileName: fileName.trim(),
      fileSize: fileSize || '—',
      createdAt: docItem?.createdAt || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    });
    onClose();
  };

  const inputStyle = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" };

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx" style={{ display: 'none' }} onChange={handleFileChange} />
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[560px] md:max-h-[90vh] md:rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 71, display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>{isNew ? 'New Document' : 'Edit Document'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Document name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Master Services Agreement — Acme Corp" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description of this document..." rows={2} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>File *</label>
            {fileName ? (
              <div className="flex items-center gap-2" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--ice-warm)' }}>
                <File size={16} style={{ color: 'var(--navy)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</div>
                  {fileSize && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fileSize}</div>}
                </div>
                <button onClick={handlePickFile} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)' }}>Replace</button>
                <button onClick={handleRemoveFile} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}><Trash2 size={13} /></button>
              </div>
            ) : (
              <button onClick={handlePickFile} style={{ width: '100%', padding: '20px 12px', borderRadius: 8, border: '1px dashed var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Upload size={16} /> Choose a file to upload
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || !fileName.trim()} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: (!name.trim() || !fileName.trim()) ? '#94A3B8' : 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: (!name.trim() || !fileName.trim()) ? 'not-allowed' : 'pointer' }}>{isNew ? 'Create Document' : 'Save Changes'}</button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Attach Menu (+ icon popover) ─────────────────── */
function AttachMenu({ activePack, activeDocument, onClose, onAttachFiles, onOpenKnowledgePacks, onOpenDocumentVault, onClearPack, onClearDocument }) {
  const docInputRef = useRef(null);

  const handleFiles = (e, kind) => {
    const files = Array.from(e.target.files || []);
    if (files.length && onAttachFiles) onAttachFiles(files, kind);
    e.target.value = '';
  };

  const MenuItem = ({ icon: Icon, label, subtitle, onClick, active, onRemove }) => (
    <div
      onClick={onClick}
      style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', backgroundColor: active ? '#EDF3FA' : 'white', display: 'flex', alignItems: 'center', gap: 12 }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = active ? '#EDF3FA' : 'white'; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? 'rgba(10,36,99,0.08)' : 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} style={{ color: 'var(--navy)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
      </div>
      {active && onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>Remove</button>
      )}
      {!active && <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
    </div>
  );

  return (
    <>
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e, 'doc')} />

      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, width: 300, maxWidth: 'calc(100vw - 24px)', backgroundColor: 'white', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)', zIndex: 41, overflow: 'hidden' }}>

        <MenuItem
          icon={Upload}
          label="Upload Documents"
          subtitle="Upload files from your device"
          onClick={() => docInputRef.current?.click()}
        />

        <MenuItem
          icon={Package}
          label={activePack ? `Pack: ${activePack.name}` : 'Knowledge Pack'}
          subtitle={activePack ? 'Attached as context' : 'Select a pack as conversation context'}
          onClick={onOpenKnowledgePacks}
          active={!!activePack}
          onRemove={onClearPack}
        />

        <MenuItem
          icon={FolderOpen}
          label={activeDocument ? `Doc: ${activeDocument.name}` : 'Document Vault'}
          subtitle={activeDocument ? 'Attached as context' : 'Select a saved document'}
          onClick={onOpenDocumentVault}
          active={!!activeDocument}
          onRemove={onClearDocument}
        />
      </div>
    </>
  );
}

/* ─────────────────── Top Nav ─────────────────── */
function TopNav({ plan, usage, onOpenSidebar }) {
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
    <div className="px-3 sm:px-4 md:px-6" style={{ height: 50, minHeight: 50, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
      <div className="flex items-center gap-3 md:gap-6">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-1 rounded-lg"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
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
            {usage.docs.used.toLocaleString()} / {usage.docs.limit.toLocaleString()}<span className="hidden sm:inline"> docs this month</span><span className="sm:hidden"> docs</span>
          </button>
          {showUsagePopover && (
            <>
              <div onClick={() => setShowUsagePopover(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 300, backgroundColor: 'white', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 21, padding: 16 }}>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, color: 'var(--text-primary)', marginBottom: 12 }}>Your Plan Usage — {plan}</div>
                <UsageBar label="Documents" used={usage.docs.used} limit={usage.docs.limit} />
                <UsageBar label="Workflows" used={usage.workflows.used} limit={usage.workflows.limit} />
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Resets May 1, 2026</div>
                  <a href="/app/billing" style={{ fontSize: 12, color: 'var(--navy)', textDecoration: 'none', fontWeight: 500 }} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>View Full Billing →</a>
                </div>
              </div>
            </>
          )}
        </div>

        <span className="hidden sm:inline-flex" style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>&lt; Main Site</span>
        <div className="hidden md:block" style={{ position: 'relative' }}>
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
      <div className="max-w-[85%] md:max-w-[70%]" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{isBot ? 'YourAI' : 'Ryan'}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{msg.timestamp}</span>
        </div>
        {msg.attachments && msg.attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {msg.attachments.map(a => {
              const Icon = File;
              return (
                <div key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'white', border: '1px solid var(--border)', maxWidth: 220 }}>
                  <Icon size={12} style={{ color: 'var(--navy)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
          {isBot ? (
            <ReactMarkdown
              components={{
                h2: ({children}) => <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '14px 0 6px 0', paddingBottom: 4, borderBottom: '0.5px solid var(--border)' }}>{children}</h2>,
                h3: ({children}) => <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '10px 0 4px 0' }}>{children}</h3>,
                p: ({children}) => <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, margin: '0 0 8px 0' }}>{children}</p>,
                ul: ({children}) => <ul style={{ paddingLeft: 18, margin: '4px 0 8px 0' }}>{children}</ul>,
                ol: ({children}) => <ol style={{ paddingLeft: 18, margin: '4px 0 8px 0' }}>{children}</ol>,
                li: ({children}) => <li style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 3 }}>{children}</li>,
                strong: ({children}) => <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{children}</strong>,
                blockquote: ({children}) => <blockquote style={{ borderLeft: '2px solid var(--border)', paddingLeft: 12, margin: '8px 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>{children}</blockquote>,
                code: ({children}) => <code style={{ fontSize: 12, fontFamily: 'monospace', background: 'var(--ice-warm)', padding: '1px 4px', borderRadius: 3, color: 'var(--text-primary)' }}>{children}</code>,
              }}
            >{msg.content}</ReactMarkdown>
          ) : msg.content}
        </div>
        {msg.knowledgePack && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, marginRight: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(10, 36, 99, 0.06)', border: '1px solid rgba(10, 36, 99, 0.18)' }}>
            <Package size={12} style={{ color: 'var(--navy)' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--navy)' }}>Using: {msg.knowledgePack}</span>
          </div>
        )}
        {msg.vaultDocument && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 10px', borderRadius: 999, background: 'rgba(10, 36, 99, 0.06)', border: '1px solid rgba(10, 36, 99, 0.18)' }}>
            <File size={12} style={{ color: 'var(--navy)' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--navy)' }}>Using: {msg.vaultDocument}</span>
          </div>
        )}
        {/* Source badge — CONFIDENCE: 3/10. Intent classifier not confirmed. Visual wireframe for Ryan. */}
        {isBot && msg.sourceBadge && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '4px 10px', borderRadius: 999, background: msg.sourceBadge.includes('your document') ? '#EFF6FF' : '#F0FDF4', border: `1px solid ${msg.sourceBadge.includes('your document') ? '#BFDBFE' : '#BBF7D0'}` }}>
            <Database size={11} style={{ color: msg.sourceBadge.includes('your document') ? '#1D4ED8' : '#16A34A' }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: msg.sourceBadge.includes('your document') ? '#1D4ED8' : '#16A34A' }}>{msg.sourceBadge}</span>
          </div>
        )}
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
    <div className="flex gap-1.5 items-center flex-shrink-0">
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
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[95vw] md:max-w-[680px] max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 61 }}
      >
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
    <div className="px-4 sm:px-6 md:px-10 py-6 flex items-center justify-center" style={{ flex: 1 }}>
      <div style={{ maxWidth: 900, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Sparkles size={20} color="#fff" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl" style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, color: 'var(--navy)', margin: '0 0 8px' }}>
          {getGreeting()}, {currentUserName}
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-muted)', margin: '0 0 28px' }}>
          Your AI assistant is ready. Based on your profile, here's where you can start:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(true);
  const [profile, setProfile] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [knowledgePacks, setKnowledgePacks] = useState(DEFAULT_KNOWLEDGE_PACKS);
  const [showKnowledgePacksPanel, setShowKnowledgePacksPanel] = useState(false);
  const [editingPack, setEditingPack] = useState(null);
  const [showPackPicker, setShowPackPicker] = useState(false);
  const [activeKnowledgePack, setActiveKnowledgePack] = useState(null);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [documentVault, setDocumentVault] = useState(DEFAULT_DOCUMENT_VAULT);
  const [showDocumentVaultPanel, setShowDocumentVaultPanel] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [activeVaultDocument, setActiveVaultDocument] = useState(null);
  const [docLimitBannerDismissed, setDocLimitBannerDismissed] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState(DEFAULT_PROMPT_TEMPLATES);
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const [clients, setClients] = useState(DEFAULT_CLIENTS);
  const [showClientsPanel, setShowClientsPanel] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // ─── Chat Threads state ───
  const [threads, setThreads] = useState(DEFAULT_THREADS);
  const [activeThreadId, setActiveThreadId] = useState('thread-1');
  const [threadSearch, setThreadSearch] = useState('');
  // Per-thread message store — persists messages when switching between threads
  const threadMessagesRef = useRef({});

  // ─── Session Document Version Handling (DEC-093, DEC-094, DEC-095) ───
  // See knowledge-pack-strategy.md — Document Version Handling section
  const [sessionState, setSessionState] = useState({
    // DEC-093: KB locked at session start
    // See knowledge-pack-strategy.md — Scenario 1
    sessionKbSnapshotId: `kb-snapshot-${Date.now()}`, // uuid — snapshot of global KB at session start
    // DEC-095: User doc locked for session unless user chooses restart
    sessionDocId: null,                                // uuid, nullable — user's uploaded doc for this session
    sessionStartTime: new Date().toISOString(),        // timestamp — when session began
    // TODO: Phase 2 — replace snapshot reference with
    // full document_versions table for audit trail
    // Confirmed by Arjun — cutover only for this release
  });
  const [sessionDocContext, setSessionDocContext] = useState(null); // { name, content } — persisted doc for follow-up questions
  const [showDocVersionBanner, setShowDocVersionBanner] = useState(false);
  const [pendingNewDoc, setPendingNewDoc] = useState(null); // holds the new doc until user decides
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  // Removed: responseIdx — no longer needed with real LLM responses

  const plan = billingData.plan;
  const usage = billingData.usage;
  const docPct = usage.docs.limit > 0 ? (usage.docs.used / usage.docs.limit) * 100 : 0;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('yourai_user_profile');
      if (raw) setProfile(JSON.parse(raw));
    } catch (_) { /* ignore */ }
  }, []);

  const [streamingContent, setStreamingContent] = useState('');

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, streamingContent, scrollToBottom]);

  const inputPlaceholder = profile && profile.primaryState
    ? `Ask anything about ${profile.primaryState} law or your documents...`
    : 'Ask anything, analyze files, or search the web...';

  const handlePromptClick = useCallback((promptText) => {
    setInput(promptText);
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // ─── Chat Thread handlers ───
  const handleNewThread = useCallback(() => {
    // Save current thread messages before switching
    threadMessagesRef.current[activeThreadId] = messages;

    const newThread = {
      id: `thread-${Date.now()}`,
      title: 'New Conversation',
      preview: '',
      updatedAt: 'Just now',
      messageCount: 0,
      isActive: true,
    };
    threadMessagesRef.current[newThread.id] = [];
    setThreads(prev => prev.map(t => ({ ...t, isActive: false })));
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setMessages([]);
    setShowEmptyState(true);
    setActiveKnowledgePack(null);
    setActiveVaultDocument(null);
    setPendingAttachments([]);
    setInput('');
    setSessionDocContext(null);
    // DEC-093 + DEC-094: New session gets current KB snapshot
    setSessionState({
      sessionKbSnapshotId: `kb-snapshot-${Date.now()}`,
      sessionDocId: null,
      sessionStartTime: new Date().toISOString(),
    });
    setShowDocVersionBanner(false);
    setPendingNewDoc(null);
  }, [activeThreadId, messages]);

  const handleSwitchThread = useCallback((threadId) => {
    if (threadId === activeThreadId) return;
    // Save current thread messages before switching
    threadMessagesRef.current[activeThreadId] = messages;
    // Update thread metadata
    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        const firstUserMsg = messages.find(m => m.sender === 'user');
        return {
          ...t,
          isActive: false,
          title: firstUserMsg ? (firstUserMsg.content.length > 50 ? firstUserMsg.content.substring(0, 50) + '...' : firstUserMsg.content) : t.title,
          preview: firstUserMsg ? firstUserMsg.content : t.preview,
          messageCount: messages.length,
        };
      }
      if (t.id === threadId) return { ...t, isActive: true };
      return t;
    }));
    setActiveThreadId(threadId);
    // Load messages from per-thread store (fall back to hardcoded for legacy threads)
    const stored = threadMessagesRef.current[threadId];
    if (stored && stored.length > 0) {
      setMessages(stored);
      setShowEmptyState(false);
    } else if (THREAD_MESSAGES[threadId]) {
      setMessages(THREAD_MESSAGES[threadId]);
      setShowEmptyState(false);
    } else {
      setMessages([]);
      setShowEmptyState(true);
    }
    setActiveKnowledgePack(null);
    setActiveVaultDocument(null);
    setPendingAttachments([]);
    setSessionDocContext(null);
    setInput('');
  }, [activeThreadId, messages]);

  const handleDeleteThread = useCallback((threadId) => {
    if (threads.length <= 1) return;
    delete threadMessagesRef.current[threadId];
    const remaining = threads.filter(t => t.id !== threadId);
    setThreads(remaining);
    if (threadId === activeThreadId) {
      const next = remaining[0];
      setActiveThreadId(next.id);
      setThreads(prev => prev.map(t => t.id === next.id ? { ...t, isActive: true } : t));
      const stored = threadMessagesRef.current[next.id];
      if (stored && stored.length > 0) {
        setMessages(stored);
        setShowEmptyState(false);
      } else if (THREAD_MESSAGES[next.id]) {
        setMessages(THREAD_MESSAGES[next.id]);
        setShowEmptyState(false);
      } else {
        setMessages([]);
        setShowEmptyState(true);
      }
    }
  }, [threads, activeThreadId]);

  const filteredThreads = threads.filter(t =>
    !threadSearch || t.title.toLowerCase().includes(threadSearch.toLowerCase()) || t.preview.toLowerCase().includes(threadSearch.toLowerCase())
  );

  // Keep per-thread message store in sync as messages change
  useEffect(() => {
    threadMessagesRef.current[activeThreadId] = messages;
  }, [messages, activeThreadId]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if ((!trimmed && pendingAttachments.length === 0) || isTyping) return;
    if (showEmptyState) setShowEmptyState(false);
    const userMsg = { id: Date.now(), sender: 'user', content: trimmed, timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), attachments: pendingAttachments };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setPendingAttachments([]);
    setIsTyping(true);
    setStreamingContent('');

    // Build history for LLM context
    const history = messages.slice(-20).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    try {
      // Try backend first
      const base = import.meta.env.VITE_API_URL || '';
      let usedBackend = false;
      let fullContent = '';
      let sourceBadge = null;

      try {
        const response = await fetch(`${base}/api/chat`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: activeThreadId,
            message: trimmed,
            sessionId: sessionState.sessionKbSnapshotId,
            sessionDocId: sessionState.sessionDocId,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && (contentType.includes('text/plain') || contentType.includes('application/json'))) {
          usedBackend = true;
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            fullContent += chunk;
            setStreamingContent(fullContent);
          }
          const sourceTypeHeader = response.headers.get('X-Source-Type');
          if (sourceTypeHeader === 'UPLOADED_DOC') {
            sourceBadge = 'Answered from: your document';
          } else if (sourceTypeHeader === 'KNOWLEDGE_PACK') {
            sourceBadge = `Answered from: ${activeKnowledgePack?.name || 'knowledge pack'}`;
          } else if (sourceTypeHeader === 'GLOBAL_KB') {
            sourceBadge = 'Answered from: YourAI knowledge base';
          }
          // else: leave sourceBadge as null (no badge for general AI responses)
        }
      } catch { /* backend unreachable — fall through to client-side LLM */ }

      // Fallback: call Groq directly from client (Vercel static deploy)
      // 4-tier priority: Uploaded Doc → Knowledge Pack → Global KB → Fallback
      if (!usedBackend) {
        if (!getApiKey()) {
          setIsTyping(false);
          setStreamingContent('');
          const errMsg = { id: Date.now() + 1, sender: 'bot', content: 'No LLM backend available. Please configure the API key or start the backend server.', timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), sourceBadge: null };
          setMessages((prev) => [...prev, errMsg]);
          return;
        }

        // Build context layers for prioritised answer flow
        const contextLayers = {};

        // Tier 1: User's uploaded documents (from pending attachments with extracted content)
        // Check current message attachments first, then fall back to persisted session doc
        const docsWithContent = (userMsg.attachments || []).filter(a => a.content);
        if (docsWithContent.length > 0) {
          // New documents attached to this message — merge and persist for follow-ups
          const docParts = [];
          const docNames = [];
          docsWithContent.forEach(doc => {
            const rawContent = doc.content || '';
            const printableChars = rawContent.replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F]/g, '');
            const printableRatio = rawContent.length > 0 ? (printableChars.length / rawContent.length) : 1;
            const garbleMatches = rawContent.match(/[\u25A0-\u25FF\u2600-\u26FF\uFFFD\u2580-\u259F]{2,}/g);
            const garbleCount = garbleMatches ? garbleMatches.reduce((s, m) => s + m.length, 0) : 0;
            const hasGarble = garbleCount > rawContent.length * 0.1;
            const isReadable = rawContent.length < 50 || (printableRatio > 0.7 && !hasGarble);
            docNames.push(doc.name);
            if (isReadable) {
              docParts.push(`--- ${doc.name} ---\n${rawContent}`);
            } else {
              docParts.push(`--- ${doc.name} ---\n[File: ${doc.name}] The text content could not be extracted from this document. It may be a scanned PDF, image-based, or use non-standard encoding.`);
            }
          });
          const mergedName = docNames.length === 1 ? docNames[0] : `${docNames.length} documents`;
          const mergedContent = docParts.join('\n\n');
          contextLayers.uploadedDoc = { name: mergedName, content: mergedContent };
          // Persist doc context for follow-up questions in this session
          setSessionDocContext({ name: mergedName, content: mergedContent });
        } else if (sessionDocContext) {
          // No new attachment — reuse persisted document from earlier in this session
          contextLayers.uploadedDoc = sessionDocContext;
        } else if (activeVaultDocument) {
          // Vault document selected as context — use its metadata as reference
          contextLayers.uploadedDoc = { name: activeVaultDocument.name, content: activeVaultDocument.description || '' };
        }

        // Tier 2: Knowledge Pack (selected by user)
        if (activeKnowledgePack) {
          contextLayers.knowledgePack = {
            name: activeKnowledgePack.name,
            description: activeKnowledgePack.description,
            content: activeKnowledgePack.docs?.map(d => `[${d.name}]`).join(', '),
          };
        }

        // Tier 3 (Global KB) and Tier 4 (Fallback) are handled inside callLLM via persona
        const result = await callLLM(trimmed, history, (streaming) => {
          setStreamingContent(streaming);
        }, contextLayers);
        fullContent = result.fullContent;

        // Map source type to user-friendly badge
        const sourceBadgeMap = {
          UPLOADED_DOC: 'Answered from: your document',
          KNOWLEDGE_PACK: `Answered from: ${activeKnowledgePack?.name || 'knowledge pack'}`,
          GLOBAL_KB: 'Answered from: YourAI knowledge base',
          NONE: null,
        };
        sourceBadge = sourceBadgeMap[result.sourceType] ?? null;
      }

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        content: fullContent,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        knowledgePack: activeKnowledgePack?.name || null,
        vaultDocument: activeVaultDocument?.name || null,
        sourceBadge,
        sessionKbSnapshotId: sessionState.sessionKbSnapshotId,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
      setStreamingContent('');

      // Update thread metadata
      setThreads(prev => prev.map(t => {
        if (t.id !== activeThreadId) return t;
        return {
          ...t,
          title: t.title === 'New Conversation' ? (trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed) : t.title,
          preview: trimmed,
          updatedAt: 'Just now',
          messageCount: (t.messageCount || 0) + 2,
        };
      }));
    } catch (err) {
      setIsTyping(false);
      setStreamingContent('');
      // Sanitize: never expose model names, org IDs, API keys, provider names, or internal errors
      const rawErr = (err?.message || '').toLowerCase();
      const LEAK_PATTERNS = ['groq', 'openai', 'anthropic', 'llama', 'gpt', 'claude', 'gemini', 'org_', 'sk-', 'ant-', 'aiza', 'token', 'model', 'api key', 'billing', 'console.', 'http'];
      const isLeaky = LEAK_PATTERNS.some(p => rawErr.includes(p));
      const safeMessage = isLeaky ? 'Something went wrong. Please try again.' : (err?.message || 'Connection error. Please check your network and try again.');
      const errMsg = { id: Date.now() + 1, sender: 'bot', content: safeMessage, timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), sourceBadge: null };
      setMessages((prev) => [...prev, errMsg]);
    }
  }, [isTyping, showEmptyState, messages, activeKnowledgePack, activeVaultDocument, pendingAttachments, activeThreadId, sessionState]);

  const handleAttachFiles = (files, kind) => {
    const newAtts = files.map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      size: f.size,
      kind, // 'photo' | 'video' | 'doc'
      content: null, // will be populated by FileReader for docs
    }));
    // DEC-095: Scenario 3 — Option C confirmed
    // See knowledge-pack-strategy.md
    // Only block new docs if docs have already been SENT in a message (sessionDocContext is set)
    if (kind === 'doc' && sessionDocContext) {
      // Documents already sent in this session — show mid-session banner
      setPendingNewDoc(newAtts[0]);
      setShowDocVersionBanner(true);
      return; // Don't add to pending yet — user must choose
    }
    if (kind === 'doc') {
      setSessionState(prev => ({ ...prev, sessionDocId: `doc-${Date.now()}` }));
    }
    setPendingAttachments(prev => [...prev, ...newAtts]);
    // Track document uploads for usage stats
    if (kind === 'doc') {
      const userEmail = localStorage.getItem('yourai_current_email');
      if (userEmail) files.forEach(() => trackDocUpload(userEmail));
    }
    // Extract text content from doc files using RAG file parser
    if (kind === 'doc') {
      files.forEach((file, i) => {
        extractFileText(file).then(({ text }) => {
          setPendingAttachments(prev => prev.map(a =>
            a.id === newAtts[i].id ? { ...a, content: text } : a
          ));
        }).catch((err) => {
          console.error('File extraction failed:', err);
          setPendingAttachments(prev => prev.map(a =>
            a.id === newAtts[i].id ? { ...a, content: `[File: ${file.name}] Could not extract text.` } : a
          ));
        });
      });
    }
  };

  // DEC-095: Handler for mid-session document version banner
  const handleDocVersionChoice = useCallback((choice) => {
    if (choice === 'new') {
      // Start new conversation with the new document
      // DEC-095: Clear messages, reset session, new session_doc_id
      setMessages([]);
      setShowEmptyState(true);
      setSessionDocContext(null);
      setSessionState({
        sessionKbSnapshotId: `kb-snapshot-${Date.now()}`, // DEC-093 + DEC-094: New session gets current KB
        sessionDocId: `doc-${Date.now()}`,
        sessionStartTime: new Date().toISOString(),
      });
      if (pendingNewDoc?.kind === 'vault' && pendingNewDoc?.vaultDoc) {
        // Vault document — set as active context, not as pending attachment
        setActiveVaultDocument(pendingNewDoc.vaultDoc);
      } else if (pendingNewDoc) {
        setPendingAttachments([pendingNewDoc]);
      }
      setActiveKnowledgePack(null);
      if (!pendingNewDoc?.vaultDoc) setActiveVaultDocument(null);
      setInput('');
      // Update thread
      const newThread = {
        id: `thread-${Date.now()}`,
        title: pendingNewDoc ? `New: ${pendingNewDoc.name}` : 'New Conversation',
        preview: 'Started with updated document',
        updatedAt: 'Just now',
        messageCount: 0,
        isActive: true,
      };
      setThreads(prev => [newThread, ...prev.map(t => ({ ...t, isActive: false }))]);
      setActiveThreadId(newThread.id);
    } else {
      // Continue with original — dismiss banner, doc saved but not used in this session
      // DEC-095: session_doc_id unchanged, new doc saved to storage but not active
    }
    setShowDocVersionBanner(false);
    setPendingNewDoc(null);
  }, [pendingNewDoc]);

  const removeAttachment = (id) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Guard: switching vault doc or knowledge pack mid-session triggers new-convo banner
  const handleSelectVaultDocument = useCallback((doc) => {
    if (sessionDocContext) {
      // Docs already sent — changing context requires new conversation
      setPendingNewDoc({ id: Date.now(), name: doc.name, kind: 'vault', vaultDoc: doc });
      setShowDocVersionBanner(true);
      return;
    }
    setActiveVaultDocument(doc);
  }, [sessionDocContext]);

  const handleSelectKnowledgePack = useCallback((pack) => {
    setActiveKnowledgePack(pack);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleSavePack = (data) => {
    if (data.id) {
      setKnowledgePacks(prev => prev.map(p => p.id === data.id ? { ...p, ...data } : p));
    } else {
      const newPack = {
        ...data,
        id: Date.now(),
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      setKnowledgePacks(prev => [newPack, ...prev]);
    }
  };

  const handleDeletePack = (id) => {
    setKnowledgePacks(prev => prev.filter(p => p.id !== id));
    if (activeKnowledgePack?.id === id) setActiveKnowledgePack(null);
  };

  const handleSaveDocument = (data) => {
    setDocumentVault(prev => {
      const exists = prev.some(d => d.id === data.id);
      if (exists) return prev.map(d => d.id === data.id ? { ...d, ...data } : d);
      return [data, ...prev];
    });
  };

  const handleDeleteDocument = (id) => {
    setDocumentVault(prev => prev.filter(d => d.id !== id));
    if (activeVaultDocument?.id === id) setActiveVaultDocument(null);
  };

  const handleCreatePrompt = (data) => {
    const newTemplate = {
      id: Date.now(),
      title: data.title,
      prompt: data.prompt,
      category: data.category,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setPromptTemplates(prev => [newTemplate, ...prev]);
  };

  const handleDeletePrompt = (id) => {
    setPromptTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleAddClient = (data) => {
    const newClient = {
      id: Date.now(),
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone || '—',
      type: data.type,
      status: 'Active',
      addedBy: 'Ryan Melade',
      addedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      matters: 0,
    };
    setClients(prev => [newClient, ...prev]);
  };

  const handleDeleteClient = (id) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflowX: 'hidden' }}>
      <Sidebar
        onOpenPromptTemplates={() => { setShowPromptPanel(true); setSidebarOpen(false); }}
        onOpenClients={() => { setShowClientsPanel(true); setSidebarOpen(false); }}
        onOpenKnowledgePacks={() => { setShowKnowledgePacksPanel(true); setSidebarOpen(false); }}
        onOpenDocumentVault={() => { setShowDocumentVaultPanel(true); setSidebarOpen(false); }}
        promptCount={promptTemplates.length}
        clientCount={clients.length}
        packCount={knowledgePacks.length}
        vaultCount={documentVault.length}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        threads={filteredThreads}
        activeThreadId={activeThreadId}
        onSwitchThread={(id) => { handleSwitchThread(id); setSidebarOpen(false); }}
        onNewThread={() => { handleNewThread(); setSidebarOpen(false); }}
        onDeleteThread={handleDeleteThread}
        threadSearch={threadSearch}
        onThreadSearchChange={setThreadSearch}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopNav plan={plan} usage={usage} onOpenSidebar={() => setSidebarOpen(true)} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FAFBFC', minHeight: 0 }}>
          {/* Document limit banners */}
          {docPct >= 100 && (
            <div className="px-3 sm:px-6 md:px-10 py-2.5 flex items-center gap-2 sm:gap-3 flex-wrap" style={{ backgroundColor: '#FEE2E2', borderBottom: '1px solid #FECACA' }}>
              <AlertTriangle size={15} style={{ color: '#991B1B', flexShrink: 0 }} />
              <span className="text-xs sm:text-sm" style={{ flex: 1, minWidth: 0, color: '#991B1B' }}>
                You've reached your document limit for this month. Uploads are paused until May 1, 2026 or you upgrade.
              </span>
              <button onClick={() => setShowPlanModal(true)} style={{ padding: '4px 14px', borderRadius: 8, backgroundColor: '#C9A84C', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Upgrade Plan</button>
            </div>
          )}
          {docPct >= 80 && docPct < 100 && !docLimitBannerDismissed && (
            <div className="px-3 sm:px-6 md:px-10 py-2.5 flex items-center gap-2 sm:gap-3 flex-wrap" style={{ backgroundColor: '#FFFBEB', borderBottom: '1px solid #FEF3C7' }}>
              <AlertTriangle size={15} style={{ color: '#92400E', flexShrink: 0 }} />
              <span className="text-xs sm:text-sm" style={{ flex: 1, minWidth: 0, color: '#92400E' }}>
                You've used {Math.round(docPct)}% of your {usage.docs.limit.toLocaleString()} document limit this month. Uploads will stop at {usage.docs.limit.toLocaleString()}.
              </span>
              <button onClick={() => setShowPlanModal(true)} style={{ fontSize: 12, fontWeight: 500, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Upgrade Plan →</button>
              <button onClick={() => setDocLimitBannerDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={14} color="#92400E" /></button>
            </div>
          )}

          {showEmptyState ? (
            <EmptyState profile={profile} plan={plan} onPromptClick={handlePromptClick} navigate={navigate} onViewPlans={() => setShowPlanModal(true)} />
          ) : (
            <div ref={scrollRef} className="px-3 sm:px-4 md:px-10 py-6" style={{ flex: 1, overflowY: 'auto' }}>
              {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
              {/* Streaming response — shows tokens as they arrive */}
              {isTyping && streamingContent && (
                <MessageBubble msg={{ id: 'streaming', sender: 'bot', content: streamingContent, timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }} />
              )}
              {isTyping && !streamingContent && <TypingIndicator />}
            </div>
          )}

          {/* DEC-095: Mid-session document version banner — Scenario 3, Option C */}
          {/* See knowledge-pack-strategy.md — "User's Uploaded Document Updated Mid-Conversation" */}
          {/* CONFIDENCE: 8/10 — Confirmed by Arjun (PM). Aligns with session isolation principle. */}
          {/* NOT dismissible by X — user MUST choose one of the two options */}
          {showDocVersionBanner && (
            <div className="px-3 sm:px-4 md:px-10" style={{ paddingTop: 8, paddingBottom: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 18px', borderRadius: 12,
                background: '#FFFBEB', border: '1px solid #F59E0B',
                boxShadow: '0 1px 3px rgba(245, 158, 11, 0.15)',
              }}>
                <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 6 }}>
                    We recommend starting a new conversation
                  </div>
                  <div style={{ fontSize: 12, color: '#A16207', marginBottom: 10, lineHeight: 1.7 }}>
                    Alex builds context from your conversation history. When you switch documents mid-chat, the earlier Q&amp;A was based on a different file — so Alex may mix up facts, cite the wrong clauses, or carry over assumptions that don't apply to your new document.
                  </div>
                  <div style={{ fontSize: 12, color: '#A16207', marginBottom: 14, lineHeight: 1.7 }}>
                    A fresh conversation gives Alex a clean slate to focus entirely on your new document, so every answer is accurate and based only on what's in front of you.
                  </div>
                  {pendingNewDoc && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 14, padding: '8px 12px', background: 'rgba(217, 119, 6, 0.08)', borderRadius: 8, display: 'inline-block' }}>
                      {pendingNewDoc.name}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleDocVersionChoice('new')}
                      style={{
                        padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: '#D97706', color: '#fff', border: 'none', cursor: 'pointer',
                      }}
                    >
                      Start fresh with new document
                    </button>
                    <button
                      onClick={() => handleDocVersionChoice('continue')}
                      style={{
                        padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: '#fff', color: '#92400E', border: '1px solid #F59E0B', cursor: 'pointer',
                      }}
                    >
                      Keep current document
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat input area */}
          <div className="px-3 sm:px-4 md:px-10 py-3" style={{ background: 'transparent' }}>
            {/* Active Knowledge Pack / Vault Document chips */}
            {(activeKnowledgePack || activeVaultDocument) && (
              <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activeKnowledgePack && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(10, 36, 99, 0.06)', border: '1px solid rgba(10, 36, 99, 0.25)' }}>
                    <Package size={13} style={{ color: 'var(--navy)' }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--navy)' }}>Using: {activeKnowledgePack.name}</span>
                    <button onClick={() => setActiveKnowledgePack(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--navy)' }}><X size={13} /></button>
                  </div>
                )}
                {activeVaultDocument && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(10, 36, 99, 0.06)', border: '1px solid rgba(10, 36, 99, 0.25)' }}>
                    <File size={13} style={{ color: 'var(--navy)' }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--navy)' }}>Using: {activeVaultDocument.name}</span>
                    <button onClick={() => setActiveVaultDocument(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--navy)' }}><X size={13} /></button>
                  </div>
                )}
              </div>
            )}

            {/* Pending attachment chips */}
            {pendingAttachments.length > 0 && (
              <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pendingAttachments.map(a => {
                  const Icon = File;
                  return (
                    <div key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: 'white', border: '1px solid var(--border)', maxWidth: 220 }}>
                      <Icon size={12} style={{ color: 'var(--navy)', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                      <button onClick={() => removeAttachment(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-muted)', flexShrink: 0 }}><X size={11} /></button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--border)', borderRadius: 24, background: '#fff', minHeight: 48, padding: '8px 8px 8px 12px' }}>
              <div style={{ position: 'relative' }}>
                <div onClick={() => setShowPackPicker(v => !v)} title="Attach files or context" style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: (activeKnowledgePack || activeVaultDocument) ? 'var(--navy)' : 'var(--text-muted)', background: (activeKnowledgePack || activeVaultDocument) ? 'rgba(10, 36, 99, 0.08)' : 'transparent' }}><Plus size={20} /></div>
                {showPackPicker && (
                  <AttachMenu
                    activePack={activeKnowledgePack}
                    activeDocument={activeVaultDocument}
                    onClose={() => setShowPackPicker(false)}
                    onAttachFiles={(files, kind) => { handleAttachFiles(files, kind); setShowPackPicker(false); }}
                    onOpenKnowledgePacks={() => { setShowPackPicker(false); setShowKnowledgePacksPanel(true); }}
                    onOpenDocumentVault={() => { setShowPackPicker(false); setShowDocumentVaultPanel(true); }}
                    onClearPack={() => { setActiveKnowledgePack(null); }}
                    onClearDocument={() => { setActiveVaultDocument(null); }}
                  />
                )}
              </div>
              <textarea ref={inputRef} className="no-focus-ring" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={inputPlaceholder} rows={1} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', resize: 'none', maxHeight: 120, overflowY: 'auto', lineHeight: '1.5', fontFamily: 'inherit' }} onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }} />
              {(() => { const canSend = (input.trim() || pendingAttachments.length > 0) && !isTyping; return (
              <div onClick={() => canSend && sendMessage(input)} style={{ width: 32, height: 32, borderRadius: '50%', background: canSend ? 'var(--navy)' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canSend ? 'pointer' : 'not-allowed', flexShrink: 0, opacity: canSend ? 1 : 0.6, transition: 'background 150ms, opacity 150ms' }}><ArrowUp size={16} color="#fff" /></div>
              ); })()}
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              YourAI may produce inaccurate information. Always verify critical outputs. <strong>Private &amp; encrypted.</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Comparison Modal */}
      {showPlanModal && <PlanComparisonModal currentPlan={plan} onClose={() => setShowPlanModal(false)} navigate={navigate} />}

      {/* Prompt Templates Panel */}
      {showPromptPanel && (
        <PromptTemplatesPanel
          templates={promptTemplates}
          onUsePrompt={(prompt) => { setInput(prompt); if (inputRef.current) inputRef.current.focus(); if (showEmptyState) { /* keep empty state, user will manually send */ } }}
          onClose={() => setShowPromptPanel(false)}
          onCreateNew={() => { setShowPromptPanel(false); setShowCreatePrompt(true); }}
          onDelete={handleDeletePrompt}
        />
      )}

      {/* Create Prompt Template Modal */}
      {showCreatePrompt && (
        <CreatePromptModal
          onClose={() => setShowCreatePrompt(false)}
          onSave={handleCreatePrompt}
        />
      )}

      {/* Clients Panel */}
      {showClientsPanel && (
        <ClientsPanel
          clients={clients}
          onClose={() => setShowClientsPanel(false)}
          onAddClient={() => { setShowClientsPanel(false); setShowAddClient(true); }}
          onDeleteClient={handleDeleteClient}
        />
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onSave={handleAddClient}
        />
      )}

      {/* Knowledge Packs Panel */}
      {showKnowledgePacksPanel && (
        <KnowledgePacksPanel
          packs={knowledgePacks}
          activePack={activeKnowledgePack}
          onClose={() => setShowKnowledgePacksPanel(false)}
          onCreateNew={() => { setShowKnowledgePacksPanel(false); setEditingPack({ isNew: true }); }}
          onEdit={(pack) => { setShowKnowledgePacksPanel(false); setEditingPack(pack); }}
          onDelete={handleDeletePack}
          onSelect={(p) => { handleSelectKnowledgePack(p); setShowKnowledgePacksPanel(false); }}
        />
      )}

      {/* Edit / Create Knowledge Pack Modal */}
      {editingPack && (
        <EditKnowledgePackModal
          pack={editingPack.isNew ? null : editingPack}
          onClose={() => setEditingPack(null)}
          onSave={(data) => { handleSavePack(data); setEditingPack(null); }}
        />
      )}

      {/* Document Vault Panel */}
      {showDocumentVaultPanel && (
        <DocumentVaultPanel
          documents={documentVault}
          activeDocument={activeVaultDocument}
          onClose={() => setShowDocumentVaultPanel(false)}
          onCreateNew={() => { setShowDocumentVaultPanel(false); setEditingDocument({ isNew: true }); }}
          onEdit={(doc) => { setShowDocumentVaultPanel(false); setEditingDocument(doc); }}
          onSelect={(d) => { handleSelectVaultDocument(d); setShowDocumentVaultPanel(false); }}
          onDelete={handleDeleteDocument}
        />
      )}

      {/* Edit / Create Document Modal */}
      {editingDocument && (
        <EditDocumentModal
          document={editingDocument.isNew ? null : editingDocument}
          onClose={() => setEditingDocument(null)}
          onSave={(data) => { handleSaveDocument(data); setEditingDocument(null); }}
        />
      )}
    </div>
  );
}
