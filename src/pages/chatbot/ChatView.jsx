import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  CheckCircle, MessageSquare, Clock, Share2, Grid3X3, Calendar, Users,
  FolderOpen, ChevronDown, ChevronRight, MoreVertical, Plus, Download,
  Search, Bell, ArrowUp, Shield, Sparkles, FileText, Building2, Scale,
  LayoutDashboard, Send, MapPin, FileSearch, Lock, X, AlertTriangle, Info, Zap,
  BookOpen, UserPlus, Trash2, Edit3, Copy, Phone, Mail, Briefcase, Hash, Menu,
  Package, Link2, File, Upload, Paperclip, Database, GitBranch, Settings, LogOut,
  CreditCard
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../lib/roles';
import TeamPage from '../../components/chat/TeamPage';
import WorkspacesPage from './WorkspacesPage';
import { listWorkspacesForUser, seedWorkspacesIfEmpty } from '../../lib/workspace';
import { MOCK_WORKSPACES } from '../../lib/mockWorkspaces';
import { loadVault, saveVault, seedVaultIfEmpty } from '../../lib/documentVaultStore';
import IntentCard, { isCardIntent, tryParseCardData } from '../../components/chat/cards/IntentCard';
import WorkflowsPanel from '../../components/chat/WorkflowsPanel';
import WorkflowBuilder from '../../components/chat/WorkflowBuilder';
import PreRunModal from '../../components/chat/PreRunModal';
import WorkflowProgressCard from '../../components/chat/WorkflowProgressCard';
import WorkflowReportCard from '../../components/chat/WorkflowReportCard';
import {
  listTemplatesForUser, seedTemplatesIfEmpty, duplicateTemplate as duplicateWorkflow,
  deleteTemplate as deleteWorkflow, getActiveRunId, getRun,
} from '../../lib/workflow';
import { MOCK_WORKFLOW_TEMPLATES } from '../../lib/mockWorkflows';
import { subscribeRun } from '../../lib/workflowRunner';
import {
  MOCK_SUMMARY_CARD,
  MOCK_COMPARISON_CARD,
  MOCK_CASE_BRIEF_CARD,
  MOCK_RESEARCH_BRIEF_CARD,
} from '../../lib/mockCardData';
import { billingData, subscriptionPlans } from '../../data/mockData';
import { callLLM, getApiKey } from '../../lib/llm-client';
import { extractFileText } from '../../lib/file-parser';
import { trackDocUpload } from '../../lib/auth';
import { useSessionGuard } from '../../lib/useSessionGuard';
import { detectIntent, detectAllIntents } from '../../lib/intentDetector';
import { INTENTS, DEFAULT_INTENT, getIntentLabel } from '../../lib/intents';

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
// Seed packs include ownerId + ownerName + isGlobal so the panel can
// render ownership and enforce role-based visibility:
//   - Org Admin:    sees every pack in the org
//   - Internal User: own packs + all org-wide packs
//   - External User: KP hidden entirely (sidebar level)
const DEFAULT_KNOWLEDGE_PACKS = [
  {
    id: 1,
    name: 'NDA Playbook',
    description: 'Standard NDA clauses, review guidelines, and firm-approved terms.',
    ownerId: 'user-ryan',
    ownerName: 'Ryan Melade',
    isGlobal: true,
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
    ownerId: 'user-ryan',
    ownerName: 'Ryan Melade',
    isGlobal: true,
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
    ownerId: 'm-002',
    ownerName: 'Priya Shah',
    isGlobal: false,
    docs: [
      { id: 1, name: 'CA_Labor_Code.pdf', size: '8.2 MB', uploaded: 'Feb 28, 2026' },
      { id: 2, name: 'Non_Compete_Enforcement.docx', size: '0.6 MB', uploaded: 'Mar 2, 2026' },
    ],
    links: [
      { id: 1, name: 'CA Department of Industrial Relations', url: 'https://dir.ca.gov' },
    ],
    createdAt: 'Feb 25, 2026',
  },
  {
    id: 4,
    name: 'Privacy & Data Protection',
    description: 'GDPR, CCPA, and cross-border transfer notes — maintained by Priya for internal use.',
    ownerId: 'm-002',
    ownerName: 'Priya Shah',
    isGlobal: false,
    docs: [
      { id: 1, name: 'GDPR_Summary.pdf', size: '1.8 MB', uploaded: 'Apr 2, 2026' },
      { id: 2, name: 'CCPA_Redline.docx', size: '0.5 MB', uploaded: 'Apr 5, 2026' },
    ],
    links: [],
    createdAt: 'Apr 1, 2026',
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

// Vault docs carry the same ownerId / ownerName / isGlobal triple as
// Knowledge Packs so Org Admin can share firm-wide and non-admins see
// the right subset.
const DEFAULT_DOCUMENT_VAULT = [
  {
    id: 1,
    name: 'Master Services Agreement — Acme Corp',
    description: 'Signed MSA covering SaaS delivery, support SLAs, and data processing terms.',
    fileName: 'MSA_Acme_Corp_v4.pdf',
    fileSize: '2.4 MB',
    createdAt: 'Mar 14, 2026',
    ownerId: 'user-ryan',
    ownerName: 'Ryan Melade',
    isGlobal: true,
  },
  {
    id: 2,
    name: 'Employee Handbook 2026',
    description: 'Current employee handbook with updated PTO, remote work, and conduct policies.',
    fileName: 'Employee_Handbook_2026.pdf',
    fileSize: '3.8 MB',
    createdAt: 'Jan 30, 2026',
    ownerId: 'user-ryan',
    ownerName: 'Ryan Melade',
    isGlobal: true,
  },
  {
    id: 3,
    name: 'Series B Term Sheet',
    description: 'Executed term sheet for Series B financing round with Ridgeline Ventures.',
    fileName: 'SeriesB_TermSheet_Signed.pdf',
    fileSize: '0.6 MB',
    createdAt: 'Feb 22, 2026',
    ownerId: 'm-002',
    ownerName: 'Priya Shah',
    isGlobal: false,
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
  HIGH: { bg: '#F9E7E7', text: '#C65454' },
  MEDIUM: { bg: '#FBEED5', text: '#E8A33D' },
  LOW: { bg: '#F0F3F6', text: '#1E3A8A' },
};

/* ─────────────────── Sidebar ─────────────────── */
/* CONFIDENCE: 5/10 — Sidebar redesign based on Arjun wireframe (Apr 2026).
   Layout structure confirmed by Arjun. Not signed off by Ryan.
   All existing nav items preserved — reorganised only. */

function Sidebar({ onOpenPromptTemplates, onOpenClients, onOpenKnowledgePacks, onOpenDocumentVault, onOpenInviteTeam, onOpenAuditLogs, onOpenBilling, onOpenWorkspaces, onOpenWorkflows, promptCount, clientCount, packCount, vaultCount, memberCount, workspaceCount, workflowCount, isOpen, onClose, threads, activeThreadId, onSwitchThread, onNewThread, onDeleteThread, threadSearch, onThreadSearchChange, onSignOut, runningWorkflow, onViewRunning }) {
  // Role + permission gating — every nav item decides visibility via hasPermission
  // rather than by comparing role strings directly. See src/lib/roles.ts.
  const { hasPermission, isOrgAdmin, isExternalUser } = useRole();
  const { operator } = useAuth();

  // Resolve the signed-in user's name/initials/plan, falling back to
  // localStorage for the static-demo flow where AuthContext can be empty.
  const resolvedUser = (() => {
    if (operator) return operator;
    try {
      const email = localStorage.getItem('yourai_current_email');
      if (!email) return null;
      const registered = JSON.parse(localStorage.getItem('yourai_registered_users') || '{}');
      return registered[email]?.user || null;
    } catch { return null; }
  })();
  const displayName = resolvedUser?.name || 'Your Account';
  const initials = (resolvedUser?.avatar)
    || displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    || '?';
  const planLabel = resolvedUser?.plan
    ? (resolvedUser.plan === 'FREE' ? 'Free Plan' : resolvedUser.plan === 'PROFESSIONAL' ? 'Professional' : resolvedUser.plan === 'ENTERPRISE' ? 'Enterprise' : 'Team Plan')
    : 'Free Plan';
  const roleLabel = isOrgAdmin ? 'Org Admin' : isExternalUser ? 'Client' : 'Team Member';
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
  // Visibility rules (see FRD Part 2):
  //   Dashboard, Clients, Invite Team → ORG_ADMIN only
  //   Workspaces → visible to all, but the list is scoped by membership downstream
  //   + New chat is rendered separately in Zone 2 (visible to all)
  const workspaceItems = [
    isOrgAdmin && { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', active: true, rightText: '3 running' },
    { id: 'workspaces', icon: Briefcase, label: 'Workspaces', rightText: String(workspaceCount ?? 0), onClick: onOpenWorkspaces },
    isOrgAdmin && { id: 'clients', icon: Users, label: 'Clients', rightText: String(clientCount), onClick: onOpenClients },
    isOrgAdmin && { id: 'invite-team', icon: UserPlus, label: 'Invite Team', rightText: memberCount != null ? String(memberCount) : undefined, onClick: onOpenInviteTeam },
  ].filter(Boolean);

  // ─── Knowledge items ───
  // External Users don't see Knowledge Packs or Prompt Templates at all.
  // Document Vault is visible to everyone (scoping to "own workspace only"
  // for External Users happens inside DocumentVaultPanel — Part 4).
  const knowledgeItems = [
    { id: 'document-vault', icon: FolderOpen, label: 'Document vault', rightText: String(vaultCount), onClick: onOpenDocumentVault },
    !isExternalUser && { id: 'knowledge-packs', icon: Package, label: 'Knowledge packs', rightText: String(packCount), onClick: onOpenKnowledgePacks },
    !isExternalUser && { id: 'workflow-templates', icon: Zap, label: 'Workflow Templates', rightText: workflowCount != null ? String(workflowCount) : undefined, onClick: onOpenWorkflows },
    !isExternalUser && { id: 'prompt-templates', icon: FileText, label: 'Prompt templates', rightText: String(promptCount), onClick: onOpenPromptTemplates },
  ].filter(Boolean);

  // ─── Admin items (bottom of scroll area) ───
  // Audit Logs: Org Admin always; Internal User only with view_audit_logs.
  // Billing:    Org Admin always; Internal User only with access_billing.
  // External User never sees either.
  const adminItems = [
    (isOrgAdmin || hasPermission(PERMISSIONS.VIEW_AUDIT_LOGS)) && !isExternalUser && {
      id: 'audit-logs', icon: Shield, label: 'Audit Logs', onClick: onOpenAuditLogs,
    },
    (isOrgAdmin || hasPermission(PERMISSIONS.ACCESS_BILLING)) && !isExternalUser && {
      id: 'billing', icon: CreditCard, label: 'Billing', onClick: onOpenBilling,
    },
  ].filter(Boolean);

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
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: '#E7F3E9', color: '#5CA868', flexShrink: 0 }}>
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
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5CA868', flexShrink: 0 }} />
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#F0F3F6', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{initials}</div>
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
      {/* External Users don't have a personal chat — they only use workspace
          chats, which have their own 'New chat' button inside the workspace
          sidebar. Hide this CTA for them. */}
      {!isExternalUser && (
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
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F4ED'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
        >
          <Plus size={14} />
          <span>New chat</span>
        </button>
      </div>
      )}

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

        {/* ═══ ZONE 4b — ADMIN Section (Audit Logs / Billing) ═══ */}
        {adminItems.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Admin
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {adminItems.map(renderNavItem)}
            </div>
          </div>
        )}

        {/* ═══ ZONE 5 — RECENT CHATS Section ═══ */}
        {/* Externals have no personal recent chats — this zone is hidden for them. */}
        {!isExternalUser && (
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
        )}
      </div>

      {/* ═══ ZONE 5.5 — Running Workflow Strip (Part 8) ═══
          Visible only while a workflow run is in progress. Clicking "View"
          jumps to that run's card in the chat thread. The spinner + mini
          progress bar reflect the live subscription state in the parent. */}
      {runningWorkflow && (
        <div
          onClick={onViewRunning}
          style={{
            borderTop: '0.5px solid var(--border)',
            padding: '10px 12px',
            background: 'linear-gradient(180deg, #F8F4ED 0%, #FDFBF6 100%)',
            cursor: onViewRunning ? 'pointer' : 'default',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}
          onMouseEnter={(e) => { if (onViewRunning) e.currentTarget.style.background = '#F3ECDD'; }}
          onMouseLeave={(e) => { if (onViewRunning) e.currentTarget.style.background = 'linear-gradient(180deg, #F8F4ED 0%, #FDFBF6 100%)'; }}
          title="Jump to the running workflow"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Spinner */}
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              border: '1.5px solid #C9A84C', borderTopColor: 'transparent',
              animation: 'spin 0.9s linear infinite', flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {runningWorkflow.templateName || 'Workflow running'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2 }}>
                Step {Math.min((runningWorkflow.currentStepIndex ?? 0) + 1, runningWorkflow.steps?.length || 1)} of {runningWorkflow.steps?.length || 1}
                {onViewRunning ? ' · View →' : ''}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, borderRadius: 2, background: '#E8DCC2', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.round(((runningWorkflow.currentStepIndex ?? 0) / Math.max(1, (runningWorkflow.steps?.length || 1))) * 100))}%`,
              background: '#C9A84C',
              transition: 'width 300ms ease',
            }} />
          </div>
        </div>
      )}

      {/* ═══ ZONE 6 — User Profile Footer ═══ */}
      <div style={{ borderTop: '0.5px solid var(--border)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#F0F3F6', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.3 }}>{roleLabel} &middot; {planLabel}</div>
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
                { icon: LogOut, label: 'Sign out', onClick: () => { setShowProfileMenu(false); onSignOut?.(); }, danger: true },
              ].map((menuItem, i) => {
                const MIcon = menuItem.icon;
                return (
                  <div
                    key={i}
                    onClick={menuItem.onClick}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', cursor: 'pointer', fontSize: 12,
                      color: menuItem.danger ? '#C65454' : 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F4ED'; }}
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
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: '#F0F3F6', color: '#1E3A8A', fontWeight: 500 }}>{t.category}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.prompt}</p>
                  </div>
                  <div className="flex items-center gap-1" style={{ marginLeft: 12, flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); onUsePrompt(t.prompt); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer' }} title="Use this prompt"><Copy size={12} /> Use</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} style={{ padding: '5px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }} title="Delete"><Trash2 size={13} style={{ color: '#C65454' }} /></button>
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
          <button onClick={handleSave} disabled={!title.trim() || !prompt.trim()} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: (!title.trim() || !prompt.trim()) ? '#9CA3AF' : 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: (!title.trim() || !prompt.trim()) ? 'not-allowed' : 'pointer' }}>Save Template</button>
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
    Corporate: { bg: '#F0F3F6', color: '#1E3A8A' },
    Healthcare: { bg: '#E7F3E9', color: '#5CA868' },
    Technology: { bg: '#FBEED5', color: '#E8A33D' },
    'Real Estate': { bg: '#FDF2F8', color: '#9D174D' },
    Other: { bg: '#F0F3F6', color: '#6B7885' },
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
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{clients.length} client{clients.length !== 1 ? 's' : ''} · Added automatically when you invite an External User to a workspace</p>
            </div>
            <div className="flex items-center gap-2">
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
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: c.status === 'Active' ? '#E7F3E9' : '#F9E7E7', color: c.status === 'Active' ? '#5CA868' : '#C65454', fontWeight: 500 }}>{c.status}</span>
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
                    <button onClick={() => onDeleteClient(c.id)} style={{ padding: 5, borderRadius: 6, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }} title="Remove client"><Trash2 size={13} style={{ color: '#C65454' }} /></button>
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
          <button onClick={handleSave} disabled={!name.trim() || !contactName.trim() || !email.trim()} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: (!name.trim() || !contactName.trim() || !email.trim()) ? '#9CA3AF' : 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: (!name.trim() || !contactName.trim() || !email.trim()) ? 'not-allowed' : 'pointer' }}>Add Client</button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Knowledge Packs Panel ─────────────────── */
//
// Visibility model (per FRD):
//   • Org Admin      — sees every pack in the org, can toggle org-wide on any
//   • Internal User  — own packs + all org-wide packs
//   • External User  — KP hidden at the sidebar level (never reaches here)
//
// Panel layout is a wide slide-over-ish modal so the list gets more breathing
// room. Org Admin gets quick scope tabs (All / Org-wide / Personal) to slice
// the view; everyone else gets a single combined list.
function KnowledgePacksPanel({ packs, onClose, onCreateNew, onEdit, onDelete, onSelect, onToggleGlobal, activePack, currentUserId, currentUserName, isOrgAdmin }) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all'); // 'all' | 'org' | 'mine' — Org Admin only

  // Role-based visibility — others never see colleagues' personal packs.
  const visible = useMemo(() => {
    if (isOrgAdmin) return packs;
    return packs.filter((p) => p.ownerId === currentUserId || p.isGlobal);
  }, [packs, isOrgAdmin, currentUserId]);

  const scoped = useMemo(() => {
    if (!isOrgAdmin || scope === 'all') return visible;
    if (scope === 'org') return visible.filter((p) => p.isGlobal);
    return visible.filter((p) => p.ownerId === currentUserId); // 'mine'
  }, [visible, scope, isOrgAdmin, currentUserId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return scoped;
    const q = search.toLowerCase();
    return scoped.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }, [scoped, search]);

  const counts = useMemo(() => ({
    total: visible.length,
    org: visible.filter((p) => p.isGlobal).length,
    mine: visible.filter((p) => p.ownerId === currentUserId).length,
  }), [visible, currentUserId]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[900px] md:max-h-[90vh] md:rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 61, display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>Knowledge Packs</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>
                {isOrgAdmin
                  ? 'Every pack in the firm. Toggle org-wide sharing on any pack to make it available to the whole team.'
                  : 'Bundles of documents and links you can attach to a chat to focus the AI on a specific topic.'}
              </p>
            </div>
            <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
              <button onClick={onCreateNew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}><Plus size={14} /> New Pack</button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
          </div>

          {/* Scope tabs (Org Admin only) */}
          {isOrgAdmin && (
            <div className="flex items-center gap-2" style={{ marginTop: 16 }}>
              <ScopeTab label="All packs" value="all"    count={counts.total} active={scope === 'all'}    onClick={() => setScope('all')} />
              <ScopeTab label="Org-wide"  value="org"    count={counts.org}   active={scope === 'org'}    onClick={() => setScope('org')} />
              <ScopeTab label="My packs"  value="mine"   count={counts.mine}  active={scope === 'mine'}   onClick={() => setScope('mine')} />
            </div>
          )}

          <div style={{ position: 'relative', marginTop: 14 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or description..." style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid var(--border)', paddingLeft: 36, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
          </div>
        </div>

        {/* Pack list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <Package size={36} style={{ margin: '0 auto 14px', opacity: 0.4 }} />
              <div style={{ fontSize: 15, fontWeight: 500 }}>
                {search ? 'No knowledge packs match your search' : isOrgAdmin && scope !== 'all' ? `No ${scope === 'org' ? 'org-wide' : 'personal'} packs yet` : 'No knowledge packs yet'}
              </div>
              {!search && (
                <div style={{ fontSize: 12, marginTop: 6 }}>Create a pack to bundle documents and links for a topic.</div>
              )}
            </div>
          ) : (
            filtered.map((p) => (
              <PackRow
                key={p.id}
                pack={p}
                activePack={activePack}
                currentUserId={currentUserId}
                isOrgAdmin={isOrgAdmin}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleGlobal={onToggleGlobal}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Scope tab for Org Admin — All / Org-wide / Mine ─── */
function ScopeTab({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 999,
        border: '1px solid ' + (active ? 'var(--navy)' : 'var(--border)'),
        background: active ? 'var(--navy)' : '#fff',
        color: active ? '#fff' : 'var(--text-secondary)',
        fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 120ms',
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, padding: '0 6px', borderRadius: 999, background: active ? 'rgba(255,255,255,0.2)' : 'var(--ice-warm)', color: active ? '#fff' : 'var(--text-primary)', minWidth: 20, textAlign: 'center' }}>
        {count}
      </span>
    </button>
  );
}

/* ─── Pack row — richer layout with ownership + quick share toggle ─── */
function PackRow({ pack, activePack, currentUserId, isOrgAdmin, onSelect, onEdit, onDelete, onToggleGlobal }) {
  const isOwner = pack.ownerId === currentUserId;
  const canEdit = isOrgAdmin || isOwner;
  const canToggleGlobal = isOrgAdmin;
  const isActive = activePack?.id === pack.id;

  // Org-wide = gold; Personal (someone else's) = muted; Personal (mine) = navy tint
  const ownerPill = pack.isGlobal
    ? { bg: 'rgba(201,168,76,0.18)', color: '#9A7A22', border: 'rgba(201,168,76,0.45)', label: 'Org-wide' }
    : isOwner
      ? { bg: '#F0F3F6', color: '#1E3A8A', border: '#D8DFE9', label: 'Your pack' }
      : { bg: '#F8F4ED', color: '#6B7885', border: '#E5E0D3', label: `By ${pack.ownerName || 'Member'}` };

  return (
    <div
      style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)', marginTop: 10, transition: 'all 0.15s', background: '#fff' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 3px 14px rgba(10,36,99,0.06)'; e.currentTarget.style.borderColor = 'var(--navy)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: pack.isGlobal ? 'rgba(201,168,76,0.15)' : 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={18} style={{ color: pack.isGlobal ? '#9A7A22' : 'var(--navy)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{pack.name}</span>
              <span
                title={pack.isGlobal ? 'Shared with the whole organisation' : isOwner ? 'Only visible to you' : `Owned by ${pack.ownerName}`}
                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: ownerPill.bg, color: ownerPill.color, border: `1px solid ${ownerPill.border}`, fontWeight: 600, letterSpacing: '0.02em' }}
              >
                {ownerPill.label}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.55 }}>{pack.description}</p>
            <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 8 }}>
              <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}><FileText size={12} /> {pack.docs.length} doc{pack.docs.length !== 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}><Link2 size={12} /> {pack.links.length} link{pack.links.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Created {pack.createdAt}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2" style={{ flexShrink: 0 }}>
          <div className="flex items-center gap-1">
            {onSelect && (
              <button
                onClick={() => onSelect(pack)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 6, backgroundColor: isActive ? '#5CA868' : 'var(--navy)', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                {isActive ? <><CheckCircle size={12} /> Active</> : 'Use'}
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(pack)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 6, backgroundColor: onSelect ? 'transparent' : 'var(--navy)', color: onSelect ? 'var(--navy)' : 'white', border: onSelect ? '1px solid var(--border)' : 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                <Edit3 size={12} /> Edit
              </button>
            )}
            {canEdit && (
              <button onClick={() => onDelete(pack.id)} style={{ padding: 6, borderRadius: 6, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }} title="Delete pack">
                <Trash2 size={13} style={{ color: '#C65454' }} />
              </button>
            )}
          </div>
          {canToggleGlobal && (
            <div
              onClick={() => onToggleGlobal?.(pack.id, !pack.isGlobal)}
              title={pack.isGlobal ? 'Turn off — make personal again' : 'Share with entire organisation'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 4px 3px 10px', borderRadius: 999, background: pack.isGlobal ? 'rgba(201,168,76,0.12)' : 'var(--ice-warm)', border: '1px solid ' + (pack.isGlobal ? 'rgba(201,168,76,0.35)' : 'var(--border)'), cursor: 'pointer', transition: 'all 120ms' }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, color: pack.isGlobal ? '#9A7A22' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {pack.isGlobal ? 'Shared org-wide' : 'Share org-wide'}
              </span>
              <span style={{ width: 28, height: 16, borderRadius: 999, background: pack.isGlobal ? 'var(--navy)' : '#CBD5E1', position: 'relative', transition: 'background 150ms', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: pack.isGlobal ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 150ms' }} />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Edit / Create Knowledge Pack Modal ─────────────────── */
function EditKnowledgePackModal({ pack, onClose, onSave }) {
  const { hasPermission, isOrgAdmin } = useRole();
  const canShareGlobally = isOrgAdmin || hasPermission(PERMISSIONS.CREATE_GLOBAL_KP);
  const isNew = !pack;
  const [name, setName] = useState(pack?.name || '');
  const [description, setDescription] = useState(pack?.description || '');
  // "Share with entire organisation" — off by default; only rendered for users
  // with create_global_knowledge_pack (Org Admin implicit). Part 6.
  const [isGlobal, setIsGlobal] = useState(Boolean(pack?.isGlobal));
  // Docs/links carry a "status" field: uploading → processing → ready (or failed)
  // Links carry: fetching → reading → ready (or failed)
  const [docs, setDocs] = useState((pack?.docs || []).map(d => ({ status: 'ready', ...d })));
  const [links, setLinks] = useState((pack?.links || []).map(l => ({ status: 'ready', ...l })));
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const docFileInputRef = useRef(null);

  const SUPPORTED_KP_EXTS = ['.doc','.docx','.ppt','.pptx','.xls','.xlsx','.pdf','.csv','.txt','.rtf','.odt','.ods','.odp','.pages','.numbers','.key','.html','.htm','.xml','.json'];
  const MAX_FILE_SIZE_MB = 10;

  // Simulate the document pipeline: uploading → processing → ready.
  // In production this would be backed by real upload + RAG indexing APIs.
  const simulateDocPipeline = (id) => {
    // After ~1.2s: flip from uploading to processing
    setTimeout(() => {
      setDocs(prev => prev.map(d => d.id === id && d.status === 'uploading' ? { ...d, status: 'processing' } : d));
      // After another ~2.5s: flip from processing to ready
      setTimeout(() => {
        setDocs(prev => prev.map(d => d.id === id && d.status === 'processing' ? { ...d, status: 'ready' } : d));
      }, 2500);
    }, 1200);
  };

  // Simulate the link pipeline: fetching → reading → ready.
  const simulateLinkPipeline = (id) => {
    setTimeout(() => {
      setLinks(prev => prev.map(l => l.id === id && l.status === 'fetching' ? { ...l, status: 'reading' } : l));
      setTimeout(() => {
        setLinks(prev => prev.map(l => l.id === id && l.status === 'reading' ? { ...l, status: 'ready' } : l));
      }, 2200);
    }, 1500);
  };

  const handleAddDocClick = () => docFileInputRef.current?.click();

  const handleDocFilesPicked = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (picked.length === 0) return;

    const createdAt = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const accepted = [];
    const rejected = [];

    picked.forEach(f => {
      const ext = f.name.lastIndexOf('.') !== -1 ? f.name.slice(f.name.lastIndexOf('.')).toLowerCase() : '';
      const tooLarge = f.size > MAX_FILE_SIZE_MB * 1024 * 1024;
      if (!SUPPORTED_KP_EXTS.includes(ext)) {
        rejected.push({ id: Date.now() + Math.random(), name: f.name, size: '—', uploaded: createdAt, status: 'failed', error: 'File format not supported.' });
      } else if (tooLarge) {
        rejected.push({ id: Date.now() + Math.random(), name: f.name, size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`, uploaded: createdAt, status: 'failed', error: `Files must be under ${MAX_FILE_SIZE_MB} MB.` });
      } else {
        const id = Date.now() + Math.random();
        accepted.push({ id, name: f.name, size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`, uploaded: createdAt, status: 'uploading' });
      }
    });

    setDocs(prev => [...prev, ...accepted, ...rejected]);
    accepted.forEach(d => simulateDocPipeline(d.id));
  };

  const handleRemoveDoc = (id) => setDocs(prev => prev.filter(d => d.id !== id));

  const handleAddLink = () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    // Basic URL validation
    const url = linkUrl.trim();
    const isValidUrl = /^https?:\/\/.+\..+/i.test(url);
    const id = Date.now();
    const newLink = {
      id,
      name: linkName.trim(),
      url,
      status: isValidUrl ? 'fetching' : 'failed',
      error: isValidUrl ? undefined : "That doesn't look like a valid URL.",
    };
    setLinks(prev => [...prev, newLink]);
    if (isValidUrl) simulateLinkPipeline(id);
    setLinkName(''); setLinkUrl(''); setShowAddLink(false);
  };

  const handleRemoveLink = (id) => setLinks(prev => prev.filter(l => l.id !== id));

  // Disable Save while anything is still processing — the pack is not ready until
  // every file is indexed. Users can cancel and retry individual items.
  const hasPending = docs.some(d => d.status === 'uploading' || d.status === 'processing')
    || links.some(l => l.status === 'fetching' || l.status === 'reading');

  const handleSave = () => {
    if (!name.trim() || hasPending) return;
    // Don't persist failed items — users should retry them or remove them first
    const cleanDocs = docs.filter(d => d.status === 'ready').map(({ status, error, ...rest }) => rest);
    const cleanLinks = links.filter(l => l.status === 'ready').map(({ status, error, ...rest }) => rest);
    onSave({
      id: pack?.id || Date.now(),
      name: name.trim(),
      description: description.trim(),
      docs: cleanDocs,
      links: cleanLinks,
      createdAt: pack?.createdAt || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      // Preserve existing `isGlobal` if the user can't modify it; otherwise use their toggle.
      isGlobal: canShareGlobally ? isGlobal : Boolean(pack?.isGlobal),
    });
    onClose();
  };

  // Small helper for status pills — same visual language for both docs and links
  const StatusPill = ({ status, error }) => {
    const map = {
      uploading: { label: 'Uploading…', bg: '#F0F3F6', color: '#6B7885', spin: true },
      processing: { label: 'Reading your document…', bg: '#FBEED5', color: '#E8A33D', spin: true },
      fetching: { label: 'Fetching the page…', bg: '#F0F3F6', color: '#6B7885', spin: true },
      reading: { label: 'Reading the content…', bg: '#FBEED5', color: '#E8A33D', spin: true },
      ready: { label: 'Ready', bg: '#E7F3E9', color: '#5CA868', spin: false },
      failed: { label: error || 'Something went wrong', bg: '#F9E7E7', color: '#C65454', spin: false },
    };
    const s = map[status];
    if (!s) return null;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap' }}>
        {s.spin && <span className="animate-spin" style={{ width: 9, height: 9, border: `1.5px solid ${s.color}40`, borderTopColor: s.color, borderRadius: '50%', display: 'inline-block' }} />}
        {s.label}
      </span>
    );
  };

  const inputStyle = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" };

  return (
    <>
      <input ref={docFileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx,.ods,.odp,.pages,.numbers,.key,.html,.htm,.xml,.json" style={{ display: 'none' }} onChange={handleDocFilesPicked} />
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
              <button onClick={handleAddDocClick} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px dashed var(--border)', background: 'white', fontSize: 11, fontWeight: 500, color: 'var(--navy)', cursor: 'pointer' }}><Upload size={12} /> Add Document</button>
            </div>
            {docs.length === 0 ? (
              <div style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 8, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No documents yet — click Add Document. Up to 10 MB per file.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {docs.map(d => (
                  <div key={d.id} className="flex items-center gap-2" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--ice-warm)' }}>
                    <File size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>{d.name}</span>
                        <StatusPill status={d.status} error={d.error} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{d.size} · {d.uploaded}</div>
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
                  <button onClick={handleAddLink} disabled={!linkName.trim() || !linkUrl.trim()} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: (!linkName.trim() || !linkUrl.trim()) ? '#9CA3AF' : 'var(--navy)', color: 'white', fontSize: 11, fontWeight: 500, cursor: (!linkName.trim() || !linkUrl.trim()) ? 'not-allowed' : 'pointer' }}>Save Link</button>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>{l.name}</span>
                        <StatusPill status={l.status} error={l.error} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{l.url}</div>
                    </div>
                    <button onClick={() => handleRemoveLink(l.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Share with entire organisation (Part 6) ───
              Only rendered for users with create_global_knowledge_pack
              (Org Admin always). OFF by default. */}
          {canShareGlobally && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--ice-warm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Share with entire organisation</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
                  {isGlobal
                    ? 'Every Internal User in your org can attach this pack to their chats.'
                    : 'Pack stays personal — only you can attach it.'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isGlobal}
                onClick={() => setIsGlobal((v) => !v)}
                style={{
                  flexShrink: 0,
                  width: 40, height: 22, borderRadius: 999,
                  border: 'none', cursor: 'pointer',
                  background: isGlobal ? 'var(--navy)' : '#CBD5E1',
                  position: 'relative', transition: 'background 150ms',
                  padding: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: isGlobal ? 20 : 2,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  transition: 'left 150ms',
                }} />
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {hasPending ? 'We\'re still reading your files and links — hang tight.' : ''}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
            <button onClick={handleSave} disabled={!name.trim() || hasPending} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: (!name.trim() || hasPending) ? '#9CA3AF' : 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: (!name.trim() || hasPending) ? 'not-allowed' : 'pointer' }}>{isNew ? 'Create Pack' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Document Vault Panel ─────────────────── */
// Same visibility rules as Knowledge Packs:
//   Org Admin      — sees every doc; inline Share org-wide toggle on each row
//   Internal User  — own docs + all org-wide docs
//   External User  — Vault is still visible but filtered to their own docs only
function DocumentVaultPanel({ documents, onClose, onCreateNew, onEdit, onDelete, onSelect, onToggleGlobal, activeDocument, currentUserId, isOrgAdmin, isExternalUser }) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all'); // Org Admin only

  const visible = useMemo(() => {
    if (isOrgAdmin) return documents;
    // External clients see ONLY their own uploads — never org-wide firm
    // documents or another member's personal docs.
    if (isExternalUser) return documents.filter((d) => d.ownerId === currentUserId);
    // Internal users: own + org-wide (+ legacy no-owner docs)
    return documents.filter((d) => d.ownerId === currentUserId || d.isGlobal || !d.ownerId);
  }, [documents, isOrgAdmin, isExternalUser, currentUserId]);

  const scoped = useMemo(() => {
    if (!isOrgAdmin || scope === 'all') return visible;
    if (scope === 'org')  return visible.filter((d) => d.isGlobal);
    return visible.filter((d) => d.ownerId === currentUserId);
  }, [visible, scope, isOrgAdmin, currentUserId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return scoped;
    const q = search.toLowerCase();
    return scoped.filter((d) => d.name.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q) || (d.fileName || '').toLowerCase().includes(q));
  }, [scoped, search]);

  const counts = useMemo(() => ({
    total: visible.length,
    org:   visible.filter((d) => d.isGlobal).length,
    mine:  visible.filter((d) => d.ownerId === currentUserId).length,
  }), [visible, currentUserId]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[900px] md:max-h-[90vh] md:rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 61, display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>Document Vault</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>
                {isOrgAdmin
                  ? 'Every document stored in the firm. Toggle org-wide sharing to make any document available to the whole team.'
                  : 'Documents you can attach to a chat — your own plus firm-wide shared documents.'}
              </p>
            </div>
            <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
              <button onClick={onCreateNew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}><Plus size={14} /> New Document</button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
          </div>

          {isOrgAdmin && (
            <div className="flex items-center gap-2" style={{ marginTop: 16 }}>
              <ScopeTab label="All documents" count={counts.total} active={scope === 'all'}  onClick={() => setScope('all')} />
              <ScopeTab label="Org-wide"      count={counts.org}   active={scope === 'org'}  onClick={() => setScope('org')} />
              <ScopeTab label="My documents"  count={counts.mine}  active={scope === 'mine'} onClick={() => setScope('mine')} />
            </div>
          )}

          <div style={{ position: 'relative', marginTop: 14 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, description, or file..." style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid var(--border)', paddingLeft: 36, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <FolderOpen size={36} style={{ margin: '0 auto 14px', opacity: 0.4 }} />
              <div style={{ fontSize: 15, fontWeight: 500 }}>
                {search ? 'No documents match your search' : 'No documents yet'}
              </div>
              {!search && <div style={{ fontSize: 12, marginTop: 6 }}>Upload your first document to get started.</div>}
            </div>
          ) : (
            filtered.map(d => {
              const isOwner = d.ownerId === currentUserId;
              const canEdit = isOrgAdmin || isOwner || !d.ownerId; // legacy
              const ownerPill = d.isGlobal
                ? { bg: 'rgba(201,168,76,0.18)', color: '#9A7A22', border: 'rgba(201,168,76,0.45)', label: 'Org-wide' }
                : isOwner
                  ? { bg: '#F0F3F6', color: '#1E3A8A', border: '#D8DFE9', label: 'Your document' }
                  : { bg: '#F8F4ED', color: '#6B7885', border: '#E5E0D3', label: `By ${d.ownerName || 'Member'}` };
              return (
              <div key={d.id} style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)', marginTop: 10, transition: 'all 0.15s', background: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 14px rgba(10,36,99,0.06)'; e.currentTarget.style.borderColor = 'var(--navy)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: d.isGlobal ? 'rgba(201,168,76,0.15)' : 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <File size={18} style={{ color: d.isGlobal ? '#9A7A22' : 'var(--navy)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                        {d.ownerId && (
                          <span
                            title={d.isGlobal ? 'Shared with the whole organisation' : isOwner ? 'Only visible to you' : `Owned by ${d.ownerName}`}
                            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: ownerPill.bg, color: ownerPill.color, border: `1px solid ${ownerPill.border}`, fontWeight: 600, letterSpacing: '0.02em' }}
                          >
                            {ownerPill.label}
                          </span>
                        )}
                        {d.addedFromChat && (
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 999, background: 'var(--ice-warm)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Added from chat</span>
                        )}
                      </div>
                      {d.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.55 }}>{d.description}</p>}
                      <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 8 }}>
                        <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}><FileText size={12} /> {d.fileName}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.fileSize}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Created {d.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2" style={{ flexShrink: 0 }}>
                    <div className="flex items-center gap-1">
                      {onSelect && (
                        <button onClick={() => onSelect(d)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 6, backgroundColor: activeDocument?.id === d.id ? '#5CA868' : 'var(--navy)', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                          {activeDocument?.id === d.id ? <><CheckCircle size={12} /> Active</> : 'Use'}
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => onEdit(d)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 6, backgroundColor: onSelect ? 'transparent' : 'var(--navy)', color: onSelect ? 'var(--navy)' : 'white', border: onSelect ? '1px solid var(--border)' : 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}><Edit3 size={12} /> Edit</button>
                      )}
                      {canEdit && (
                        <button onClick={() => onDelete(d.id)} style={{ padding: 6, borderRadius: 6, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }} title="Delete document"><Trash2 size={13} style={{ color: '#C65454' }} /></button>
                      )}
                    </div>
                    {isOrgAdmin && (
                      <div
                        onClick={() => onToggleGlobal?.(d.id, !d.isGlobal)}
                        title={d.isGlobal ? 'Turn off — make personal again' : 'Share with entire organisation'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 4px 3px 10px', borderRadius: 999, background: d.isGlobal ? 'rgba(201,168,76,0.12)' : 'var(--ice-warm)', border: '1px solid ' + (d.isGlobal ? 'rgba(201,168,76,0.35)' : 'var(--border)'), cursor: 'pointer', transition: 'all 120ms' }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 600, color: d.isGlobal ? '#9A7A22' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {d.isGlobal ? 'Shared org-wide' : 'Share org-wide'}
                        </span>
                        <span style={{ width: 28, height: 16, borderRadius: 999, background: d.isGlobal ? 'var(--navy)' : '#CBD5E1', position: 'relative', transition: 'background 150ms', flexShrink: 0 }}>
                          <span style={{ position: 'absolute', top: 2, left: d.isGlobal ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 150ms' }} />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })
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

  const [fileError, setFileError] = useState('');
  const SUPPORTED_EXTS = ['.doc','.docx','.ppt','.pptx','.xls','.xlsx','.pdf','.csv','.txt','.rtf','.odt','.ods','.odp','.pages','.numbers','.key','.html','.htm','.xml','.json'];

  const handlePickFile = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.lastIndexOf('.') !== -1 ? f.name.slice(f.name.lastIndexOf('.')).toLowerCase() : '';
    if (!SUPPORTED_EXTS.includes(ext)) {
      setFileError('This file is not currently supported right now. Please upload a PDF, Word, PowerPoint, Excel, CSV, TXT, RTF, Open Document, Apple iWork, HTML, XML, or JSON file.');
      e.target.value = '';
      return;
    }
    setFileError('');
    setFileName(f.name);
    setFileSize(`${(f.size / (1024 * 1024)).toFixed(1)} MB`);
    e.target.value = '';
  };
  const handleRemoveFile = () => { setFileName(''); setFileSize(''); setFileError(''); };

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
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx,.ods,.odp,.pages,.numbers,.key,.html,.htm,.xml,.json" style={{ display: 'none' }} onChange={handleFileChange} />
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
            {fileError && (
              <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, backgroundColor: '#F9E7E7', border: '1px solid #F9E7E7', fontSize: 12, color: '#C65454', lineHeight: 1.5 }}>
                {fileError}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || !fileName.trim()} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: (!name.trim() || !fileName.trim()) ? '#9CA3AF' : 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: (!name.trim() || !fileName.trim()) ? 'not-allowed' : 'pointer' }}>{isNew ? 'Create Document' : 'Save Changes'}</button>
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
      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#F8F4ED'; }}
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
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx,.ods,.odp,.pages,.numbers,.key,.html,.htm,.xml,.json" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e, 'doc')} />

      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, width: 300, maxWidth: 'calc(100vw - 24px)', backgroundColor: 'white', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)', zIndex: 41, overflow: 'hidden' }}>

        <MenuItem
          icon={Upload}
          label="Upload Documents"
          subtitle="Up to 5 files · 10 MB each"
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
  const usageColor = docPct >= 95 ? '#C65454' : docPct >= 80 ? '#E8A33D' : 'var(--text-muted)';
  const usageBorder = docPct >= 95 ? '#F9E7E7' : docPct >= 80 ? '#FBEED5' : 'var(--border)';

  const UsageBar = ({ label, used, limit }) => {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const color = pct >= 95 ? '#C65454' : pct >= 80 ? '#E8A33D' : 'var(--navy)';
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
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)', background: '#F0F3F6', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>{'\u2318'}K</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Risk Card ─────────────────── */
function RiskCard({ card }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={18} color="#C65454" />
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
/**
 * WorkflowThreadEntry — subscribes to a WorkflowRun by id and renders:
 *   - WorkflowProgressCard while the run is running / failed / cancelled
 *   - WorkflowReportCard once the run is complete (keeps the progress
 *     card collapsed above as the audit trail)
 *
 * Decision 6 from Part 4: when the thread containing a running workflow
 * is currently visible, scroll the card into view on completion. The
 * parent already drives auto-scroll on message append, so a completion
 * tick that re-renders will naturally land correctly in the viewport.
 */
function WorkflowThreadEntry({ msg }) {
  const [run, setRun] = useState(() => getRun(msg.runId));
  useEffect(() => {
    const initial = getRun(msg.runId);
    setRun(initial);
    const unsub = subscribeRun(msg.runId, (r) => setRun({ ...r }));
    return () => unsub();
  }, [msg.runId]);

  if (!run) {
    return (
      <div style={{ margin: '14px auto', maxWidth: 760, padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: '#F9FAFB', fontSize: 12, color: 'var(--text-muted)' }}>
        Workflow run is no longer available. Start a new one from the picker.
      </div>
    );
  }

  return (
    <div id={`wf-run-${msg.runId}`} style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 24px', scrollMarginTop: 80 }}>
      <div style={{ maxWidth: 820, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <WorkflowProgressCard runId={msg.runId} workspaceName={run.workspaceId ? null : null} />
        {run.status === 'complete' && run.reportCardData && (
          <WorkflowReportCard report={run.reportCardData} userName={msg.templateName ? undefined : undefined} />
        )}
      </div>
    </div>
  );
}

/* ─── One-at-a-time guard shown when user clicks Run while another run is active ─── */
function AlreadyRunningAlert({ activeName, currentStep, total, onClose }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 85, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 440, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 86, padding: '22px 26px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ice-warm)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={16} />
          </div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, margin: 0 }}>A workflow is already running</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 4px' }}>
          <strong>{activeName}</strong> · Step {currentStep} of {total}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 6 }}>
          Please wait for it to complete before starting another.
        </p>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>OK</button>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ msg }) {
  const isBot = msg.sender === 'bot';

  // Workflow messages render the progress card + (on complete) the report.
  // They're thread-scoped, so scrolling back through history shows the
  // finished report exactly where it was run.
  if (msg.sender === 'workflow') {
    return <WorkflowThreadEntry msg={msg} />;
  }

  // System notes render as centered, compact inline badges (e.g. "Switched to Clause Comparison mode")
  if (msg.isSystemNote) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, marginTop: -8 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999, background: '#F0F3F6', border: '1px solid #D6DDE4' }}>
          <Sparkles size={12} style={{ color: '#1E3A8A' }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#1E3A8A' }}>
            <ReactMarkdown components={{ p: ({children}) => <span>{children}</span>, strong: ({children}) => <strong style={{ fontWeight: 600 }}>{children}</strong> }}>{msg.content}</ReactMarkdown>
          </span>
        </div>
      </div>
    );
  }

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
            // Intent cards: if this bot message carries a known intent and
            // either pre-parsed cardData or JSON-parseable content, render
            // the dedicated card. Any parse or shape failure falls through
            // to the existing ReactMarkdown renderer — never crash.
            (() => {
              if (msg.cardData && isCardIntent(msg.intent)) {
                return <IntentCard intent={msg.intent} data={msg.cardData} />;
              }
              if (isCardIntent(msg.intent)) {
                const parsed = tryParseCardData(msg.content);
                if (parsed) return <IntentCard intent={msg.intent} data={parsed} />;
              }
              return (
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
              );
            })()
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
        {isBot && msg.sourceBadge && (() => {
          const isDoc = msg.sourceBadge.includes('your document');
          const isAI = msg.sourceBadge.includes('AI-generated');
          const bg = isDoc ? '#F0F3F6' : isAI ? '#F8F4ED' : '#E7F3E9';
          const border = isDoc ? '#D6DDE4' : isAI ? '#F0F3F6' : '#E7F3E9';
          const color = isDoc ? '#1E3A8A' : isAI ? '#6B7885' : '#5CA868';
          const BadgeIcon = isAI ? Sparkles : Database;
          return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '4px 10px', borderRadius: 999, background: bg, border: `1px solid ${border}` }}>
              <BadgeIcon size={11} style={{ color }} />
              <span style={{ fontSize: 10, fontWeight: 500, color }}>{msg.sourceBadge}</span>
            </div>
          );
        })()}
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
              background: isActive ? 'var(--navy)' : m.enterprise ? '#FBEED5' : 'white',
              color: isActive ? 'white' : isLocked ? '#9CA3AF' : m.enterprise ? '#E8A33D' : 'var(--slate)',
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
                      <td key={p.id} style={{ textAlign: 'center', padding: '8px 6px', fontSize: 12, color: isCheck ? '#5CA868' : isDash ? '#9CA3AF' : 'var(--text-primary)', fontWeight: isCheck ? 700 : 400 }}>
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

function getSuggestedPrompts(/* profile */) {
  // Paste-ready prompts — clicking fills the input with a real, usable prompt.
  // Covers three common legal workflows: review, summarise, draft.
  return [
    {
      icon: FileSearch,
      title: 'Review a contract',
      prompt: 'Review this contract and flag any one-sided provisions, unusual liability caps, or missing standard protections I should push back on. Structure your response as: 1) high-risk issues, 2) medium-risk issues, 3) recommended redlines.',
    },
    {
      icon: FileText,
      title: 'Summarise a document',
      prompt: 'Summarise this document in three sections: (1) Key obligations and deadlines, (2) Risk areas and ambiguities, (3) Recommended next steps. Keep each section under 100 words.',
    },
    {
      icon: Scale,
      title: 'Draft an email to counsel',
      prompt: 'Draft a professional email to opposing counsel requesting a seven-day extension on the upcoming deadline. Keep the tone courteous but firm, under 120 words, and include a brief reason tied to document review workload.',
    },
  ];
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
      <div style={{ marginTop: 16, padding: '10px 16px', borderRadius: 10, backgroundColor: 'var(--ice-warm)', borderLeft: '3px solid #1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>You're on Professional · Upgrade for Client Portal, Secure Messaging, and SSO.</span>
        <button onClick={onViewPlans} style={{ fontSize: 12, fontWeight: 500, color: '#1E3A8A', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>See Team Plan →</button>
      </div>
    );
  }
  if (plan === 'Team') {
    return (
      <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, backgroundColor: '#E7F3E9' }}>
        <CheckCircle size={12} color="#5CA868" />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#5CA868' }}>Team Plan · All features active</span>
      </div>
    );
  }
  if (plan === 'Enterprise') {
    return (
      <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, backgroundColor: '#FBEED5' }}>
        <Zap size={12} color="#E8A33D" />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#E8A33D' }}>Enterprise · Priority access active</span>
      </div>
    );
  }
  return null;
}

/* Tiny card used in the empty-state Workflows row. Gives the user a
   one-click launch into the pre-run modal without opening the full
   picker. Operation pills match the picker card so users get a
   consistent visual of "what this does". */
function MiniWorkflowCard({ workflow, onRun }) {
  const pills = workflow.steps.slice(0, 2);
  return (
    <div
      onClick={onRun}
      style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
        padding: 14, cursor: 'pointer', transition: 'all 150ms',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(10,36,99,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{workflow.name}</span>
        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: 'var(--ice-warm)', color: 'var(--navy)', border: '1px solid var(--border)', fontWeight: 500 }}>{workflow.practiceArea}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
        {workflow.steps.length} steps · ~{workflow.estimatedTotalSeconds}s
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {pills.map((s) => {
          const cfg = (typeof window !== 'undefined' && typeof require !== 'undefined') ? null : null;
          return <MiniOpPill key={s.id} operation={s.operation} />;
        })}
        {workflow.steps.length > 2 && (
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }}>
            + {workflow.steps.length - 2} more
          </span>
        )}
      </div>
      <div style={{ textAlign: 'right', marginTop: 2 }}>
        <span style={{ fontSize: 12, color: 'var(--navy)', fontWeight: 500 }}>Run →</span>
      </div>
    </div>
  );
}

function MiniOpPill({ operation }) {
  // Avoid re-importing lucide icons at this depth; just show the label pill.
  // The picker card shows icons already; the mini card keeps it compact.
  const labels = {
    read_documents: { label: 'Read Documents', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    analyse_clauses: { label: 'Analyse Clauses', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    compare_against_standard: { label: 'Compare', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    generate_report: { label: 'Report', color: 'bg-green-50 text-green-700 border-green-200' },
    research_precedents: { label: 'Precedents', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    compliance_check: { label: 'Compliance', color: 'bg-red-50 text-red-700 border-red-200' },
  };
  const m = labels[operation] || labels.read_documents;
  return (
    <span className={m.color} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, fontWeight: 500, border: '1px solid' }}>
      {m.label}
    </span>
  );
}

function EmptyState({ profile, plan, onPromptClick, navigate, onViewPlans, workflows = [], onRunWorkflow, onOpenWorkflowsPanel }) {
  // Resolve first name from the signed-up user persisted to localStorage.
  // EmptyState is a standalone component so we can't destructure AuthContext
  // without a hook call — the localStorage lookup is enough for the demo.
  const resolvedFirstName = (() => {
    try {
      const email = localStorage.getItem('yourai_current_email');
      if (!email) return '';
      const registered = JSON.parse(localStorage.getItem('yourai_registered_users') || '{}');
      return registered[email]?.user?.name || '';
    } catch { return ''; }
  })().split(' ')[0];
  const currentUserName = resolvedFirstName || 'there';
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

        {/* ─── Run a Workflow ─── */}
        {/* Only renders when the user has at least one active workflow
            available. Hidden for Externals (their workflow list is empty). */}
        {workflows.length > 0 && (
          <div style={{ marginTop: 32, textAlign: 'left', maxWidth: 820, marginLeft: 'auto', marginRight: 'auto' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <div className="flex items-center gap-2">
                <Zap size={14} style={{ color: '#C9A84C' }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Run a Workflow</span>
              </div>
              <button
                onClick={onOpenWorkflowsPanel}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--navy)', fontWeight: 500 }}
              >
                View all →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {workflows.slice(0, 3).map((w) => (
                <MiniWorkflowCard key={w.id} workflow={w} onRun={() => onRunWorkflow(w)} />
              ))}
            </div>
          </div>
        )}

        {/* ─── Attach-once rule hint ─── */}
        <div style={{ marginTop: 28, padding: '14px 18px', borderRadius: 12, background: 'rgba(201, 168, 76, 0.08)', border: '1px solid rgba(201, 168, 76, 0.35)', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12, maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' }}>
          <Info size={16} style={{ color: '#C9A84C', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 2 }}>
              One attachment per chat
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You can attach a document or knowledge pack at any point in a conversation — but only once. After it's attached, you can't add or swap another in the same chat. To work with different documents, start a new chat.
            </div>
          </div>
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
export default function ChatView({ initialView = 'chat' }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Role + identity — used for workspace membership filtering in the sidebar
  // badge and panels below.
  const { currentRole, hasPermission, isExternalUser, isOrgAdmin } = useRole();
  const { operator } = useAuth();
  const currentUserId = operator?.id || 'user-ryan';

  // Part 9 — workspace context detection for workflow runs.
  // If the user triggers a workflow while inside a workspace route, the run
  // should be scoped to that workspace (workspace KB + vault docs prioritised
  // over global). Outside a workspace, runs use global KB only.
  const workspaceContext = useMemo(() => {
    const m = (location?.pathname || '').match(/^\/chat\/workspaces\/([^/]+)/);
    if (!m) return { id: null, name: null, hasDocs: false };
    const wsId = m[1];
    try {
      const list = listWorkspacesForUser(currentUserId, currentRole) || [];
      const ws = list.find((w) => w.id === wsId);
      return { id: wsId, name: ws?.name || null, hasDocs: Array.isArray(ws?.documents) && ws.documents.length > 0 };
    } catch { return { id: wsId, name: null, hasDocs: false }; }
  }, [location?.pathname, currentRole, currentUserId]);

  // External Users never use the personal chat — their home is the workspace
  // list. If they land here (typed URL, stale link, etc.) we redirect them
  // to /chat/workspaces immediately. The chat-mode toggle now lives inside
  // WorkspaceChatView where it actually belongs.
  useEffect(() => {
    if (isExternalUser && initialView !== 'workspaces') {
      navigate('/chat/workspaces', { replace: true });
    }
  }, [isExternalUser, initialView, navigate]);
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
  // Seed localStorage with the default vault on first load; subsequent
  // reads hit localStorage. Shared with WorkspaceChatView so ad-hoc chat
  // uploads persist here too.
  const [documentVault, setDocumentVault] = useState(() => {
    seedVaultIfEmpty(DEFAULT_DOCUMENT_VAULT);
    return loadVault() || DEFAULT_DOCUMENT_VAULT;
  });
  useEffect(() => { saveVault(documentVault); }, [documentVault]);
  const [showDocumentVaultPanel, setShowDocumentVaultPanel] = useState(false);
  // Refresh from storage when the panel opens so cross-route uploads show up.
  useEffect(() => {
    if (!showDocumentVaultPanel) return;
    const next = loadVault();
    if (next) setDocumentVault(next);
  }, [showDocumentVaultPanel]);
  const [editingDocument, setEditingDocument] = useState(null);
  const [activeVaultDocument, setActiveVaultDocument] = useState(null);
  const [docLimitBannerDismissed, setDocLimitBannerDismissed] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState(DEFAULT_PROMPT_TEMPLATES);
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const [clients, setClients] = useState(DEFAULT_CLIENTS);
  const [showClientsPanel, setShowClientsPanel] = useState(false);
  const [showTeamPage, setShowTeamPage] = useState(false);
  const [teamMemberCount, setTeamMemberCount] = useState(null);
  // Sidebar's Workspaces item toggles this; clicking '< Back to chat' inside
  // the page sets it back to false. The /chat/workspaces route sets it via
  // the `initialView` prop on mount.
  const [showWorkspacesPanel, setShowWorkspacesPanel] = useState(initialView === 'workspaces');

  /* ─── Workflows ───
   *  showWorkflowsPanel   picker open/closed
   *  editingWorkflow      null | 'new' | WorkflowTemplate (builder)
   *  runningPrep          null | WorkflowTemplate (pre-run modal)
   *  workflowCount        badge number in the sidebar
   *  runningWorkflow      live snapshot of the currently-running run (for
   *                        the background indicator — Part 8)
   */
  const [showWorkflowsPanel, setShowWorkflowsPanel] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [runningPrep, setRunningPrep] = useState(null);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [runningWorkflow, setRunningWorkflow] = useState(null);

  // Keep the workflow count badge in sync with the visible-to-user list.
  // Re-runs whenever the panel closes (user may have created / deleted
  // templates) or the role changes.
  useEffect(() => {
    if (isExternalUser) { setWorkflowCount(0); return; }
    seedTemplatesIfEmpty(MOCK_WORKFLOW_TEMPLATES);
    setWorkflowCount(listTemplatesForUser(currentUserId, currentRole).length);
  }, [isExternalUser, currentUserId, currentRole, showWorkflowsPanel, editingWorkflow]);

  // Subscribe to the active run (if any) so the sidebar indicator
  // updates live. Runs survive component unmount via the singleton
  // runner in workflowRunner.ts.
  useEffect(() => {
    const rid = getActiveRunId();
    if (!rid) { setRunningWorkflow(null); return; }
    const initial = getRun(rid);
    if (initial && initial.status === 'running') setRunningWorkflow(initial);
    const unsub = subscribeRun(rid, (r) => {
      setRunningWorkflow(r.status === 'running' ? r : null);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runningPrep]);
  // Visible-workspace count is recomputed from localStorage whenever the
  // panel closes, so the sidebar badge stays accurate after create/archive.
  const [workspaceTick, setWorkspaceTick] = useState(0);
  const visibleWorkspaceCount = useMemo(() => {
    seedWorkspacesIfEmpty(MOCK_WORKSPACES);
    return listWorkspacesForUser(currentUserId, currentRole).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, currentRole, workspaceTick, showWorkspacesPanel]);
  const [toastMsg, setToastMsg] = useState('');
  // Add Client standalone flow removed — clients are created via workspace
  // invites (External User → client record). Kept here as an anchor comment
  // to remind future edits not to reintroduce the modal.
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
  // ─── Intent system state ───
  const [activeIntent, setActiveIntent] = useState(DEFAULT_INTENT);
  const [pendingIntent, setPendingIntent] = useState(null); // For Option C mid-convo switch
  const [showSwitchBanner, setShowSwitchBanner] = useState(false); // Option C banner
  const [isIntentDropdownOpen, setIsIntentDropdownOpen] = useState(false);
  const [suggestedIntent, setSuggestedIntent] = useState(null); // Smart suggestion from keyword detection
  const [suggestedIntents, setSuggestedIntents] = useState([]); // Multiple matches for user to pick
  const [dismissedSuggestion, setDismissedSuggestion] = useState(null);
  const suggestionTimer = useRef(null);
  const intentDropdownRef = useRef(null);
  const [showDocVersionBanner, setShowDocVersionBanner] = useState(false);
  const [pendingNewDoc, setPendingNewDoc] = useState(null); // holds the new doc until user decides
  const [streamingContent, setStreamingContent] = useState('');
  // ─── Abort controller for in-flight streams ───
  const streamAbortRef = useRef(null);
  // ─── Session Guard (block detection + idle timeout) ───
  const session = useSessionGuard({
    idleTimeoutMs: 30 * 60 * 1000,  // 30 min inactivity
    warningLeadMs: 2 * 60 * 1000,   // 2 min warning before timeout
    blockPollMs: 30 * 1000,
    onBlocked: () => {
      // Abort any in-flight streaming response immediately
      try { streamAbortRef.current?.abort(); } catch { /* ignore */ }
      // Clear sensitive in-memory context and local state
      setIsTyping(false);
      setStreamingContent('');
      setPendingAttachments([]);
      setSessionDocContext(null);
    },
    onTimedOut: () => {
      try { streamAbortRef.current?.abort(); } catch { /* ignore */ }
    },
  });
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

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, streamingContent, scrollToBottom]);

  const inputPlaceholder = 'Ask anything, analyze files, or search the web...';

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
    setActiveIntent(DEFAULT_INTENT);
    setPendingIntent(null);
    setShowSwitchBanner(false);
    setSuggestedIntent(null);
    setSuggestedIntents([]);
    setDismissedSuggestion(null);
    setIsIntentDropdownOpen(false);
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

    // ─── Dev-only slash commands to preview intent cards with mock data ───
    // /demo-summary, /demo-comparison, /demo-casebrief, /demo-research
    // Lets PM/QA render any card without needing a live backend that
    // returns structured JSON. No LLM round-trip.
    const demoMap = {
      '/demo-summary':    { intent: 'document_summarisation', data: MOCK_SUMMARY_CARD },
      '/demo-comparison': { intent: 'clause_comparison',      data: MOCK_COMPARISON_CARD },
      '/demo-casebrief':  { intent: 'case_law_analysis',      data: MOCK_CASE_BRIEF_CARD },
      '/demo-research':   { intent: 'legal_research',         data: MOCK_RESEARCH_BRIEF_CARD },
    };
    if (demoMap[trimmed]) {
      if (showEmptyState) setShowEmptyState(false);
      const { intent, data } = demoMap[trimmed];
      const userMsg = { id: Date.now(), sender: 'user', content: trimmed, timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) };
      const botMsg  = {
        id: Date.now() + 1,
        sender: 'bot',
        content: '',
        intent,
        cardData: data,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        sourceBadge: null,
      };
      setMessages((prev) => [...prev, userMsg, botMsg]);
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      return;
    }

    if (showEmptyState) setShowEmptyState(false);
    const userMsg = { id: Date.now(), sender: 'user', content: trimmed, timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), attachments: pendingAttachments };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSuggestedIntent(null);
    setSuggestedIntents([]);
    setDismissedSuggestion(null);
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setPendingAttachments([]);
    setIsTyping(true);
    setStreamingContent('');

    // ─── Hard Intent Guardrail ───
    // If the user is in General Chat but their message clearly matches a specific intent,
    // auto-switch to that intent BEFORE calling the LLM.
    // This is a hard block — not a soft LLM prompt suggestion.
    let effectiveIntent = activeIntent;
    if (activeIntent === 'general_chat' && trimmed.length >= 10) {
      const detectedMatch = detectIntent(trimmed, 'general_chat');
      if (detectedMatch) {
        effectiveIntent = detectedMatch;
        setActiveIntent(detectedMatch);
        // Inject a system note so the user sees what happened
        const switchLabel = getIntentLabel(detectedMatch);
        const switchNote = {
          id: Date.now() + 0.5,
          sender: 'bot',
          content: `Switched to **${switchLabel}** mode for a more tailored response.`,
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          sourceBadge: null,
          isSystemNote: true,
        };
        setMessages((prev) => [...prev, switchNote]);
      }
    }

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

      // Fresh abort controller for this request — onBlocked / onTimedOut aborts it
      try { streamAbortRef.current?.abort(); } catch { /* ignore */ }
      const controller = new AbortController();
      streamAbortRef.current = controller;

      try {
        const response = await fetch(`${base}/api/chat`, {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: activeThreadId,
            message: trimmed,
            history,
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
          } else {
            sourceBadge = 'AI-generated response';
          }
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
          const docCount = docsWithContent.length;
          docsWithContent.forEach((doc, idx) => {
            const rawContent = doc.content || '';
            const printableChars = rawContent.replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F]/g, '');
            const printableRatio = rawContent.length > 0 ? (printableChars.length / rawContent.length) : 1;
            const garbleMatches = rawContent.match(/[\u25A0-\u25FF\u2600-\u26FF\uFFFD\u2580-\u259F]{2,}/g);
            const garbleCount = garbleMatches ? garbleMatches.reduce((s, m) => s + m.length, 0) : 0;
            const hasGarble = garbleCount > rawContent.length * 0.1;
            const isReadable = rawContent.length < 50 || (printableRatio > 0.7 && !hasGarble);
            const docLabel = docCount > 1 ? `Document ${idx + 1}: ${doc.name}` : doc.name;
            docNames.push(doc.name);
            if (isReadable) {
              // Per-document truncation: 20K chars each (not shared)
              const truncated = rawContent.length > 20000 ? rawContent.slice(0, 20000) + '\n[... document truncated at 20,000 characters ...]' : rawContent;
              docParts.push(`--- ${docLabel} ---\n${truncated}`);
            } else {
              docParts.push(`--- ${docLabel} ---\n[File: ${doc.name}] The text content could not be extracted from this document. It may be a scanned PDF, image-based, or use non-standard encoding.`);
            }
          });
          const mergedName = docNames.length === 1 ? docNames[0] : `${docNames.length} documents`;
          const mergedContent = docParts.join('\n\n');
          contextLayers.uploadedDoc = { name: mergedName, content: mergedContent };
          contextLayers.multiDocCount = docCount;
          contextLayers.docNames = docNames;
          // Persist doc context for follow-up questions in this session
          setSessionDocContext({ name: mergedName, content: mergedContent, docCount, docNames });

          // ─── Multi-Document Cross-Reference Guardrail ───
          // Detect if user is asking a cross-document question and inject guardrail guidance
          if (docCount >= 2) {
            const crossDocPattern = /\b(compare|contrast|difference|differ|versus|vs\.?|cross[\s-]?referenc|between.+(?:doc|document|file)|from.+(?:doc|document|file).+(?:and|&|with)|doc(?:ument)?\s*\d|file\s*\d|first.+(?:doc|document|file).+(?:second|other|next)|both\s+(?:doc|document|file))\b/i;
            const isCrossDocQuery = crossDocPattern.test(trimmed);
            if (isCrossDocQuery) {
              // Build a mapping note so the LLM knows which doc is which
              const docMapping = docNames.map((name, i) => `Document ${i + 1} = "${name}"`).join(', ');
              contextLayers.multiDocGuidance = `MULTI-DOCUMENT CROSS-REFERENCE DETECTED.
The user has uploaded ${docCount} documents and is asking a cross-document question.
${docMapping}.
INSTRUCTIONS:
1. When the user says "doc 1", "document 1", "first document", etc., refer to Document 1 (${docNames[0]}).
2. When the user says "doc 2", "document 2", "second document", etc., refer to Document 2 (${docNames[1]}).${docCount >= 3 ? `\n3. When the user says "doc 3", "document 3", "third document", etc., refer to Document 3 (${docNames[2]}).` : ''}${docCount >= 4 ? `\n4. Continue this numbering for all ${docCount} documents.` : ''}
5. Structure your analysis document-by-document FIRST, then provide the comparison or cross-reference.
6. If any document was truncated, mention that your analysis may be incomplete for that document.
7. Always name the specific document when citing information — never say "the document says" without specifying which one.`;
            }
          }
        } else if (sessionDocContext) {
          // No new attachment — reuse persisted document from earlier in this session
          contextLayers.uploadedDoc = sessionDocContext;
          // Carry forward multi-doc metadata for follow-up cross-doc queries
          if (sessionDocContext.docCount && sessionDocContext.docCount >= 2) {
            contextLayers.multiDocCount = sessionDocContext.docCount;
            contextLayers.docNames = sessionDocContext.docNames || [];
            // Check if this follow-up is also a cross-doc query
            const crossDocPattern = /\b(compare|contrast|difference|differ|versus|vs\.?|cross[\s-]?referenc|between.+(?:doc|document|file)|from.+(?:doc|document|file).+(?:and|&|with)|doc(?:ument)?\s*\d|file\s*\d|first.+(?:doc|document|file).+(?:second|other|next)|both\s+(?:doc|document|file))\b/i;
            if (crossDocPattern.test(trimmed)) {
              const dn = sessionDocContext.docNames || [];
              const docMapping = dn.map((name, i) => `Document ${i + 1} = "${name}"`).join(', ');
              contextLayers.multiDocGuidance = `MULTI-DOCUMENT CROSS-REFERENCE DETECTED.
The user has ${sessionDocContext.docCount} documents in this session and is asking a cross-document question.
${docMapping}.
INSTRUCTIONS:
1. Match user references like "doc 1", "first document" to the numbered documents above.
2. Structure your analysis document-by-document FIRST, then provide the comparison or cross-reference.
3. Always name the specific document when citing information.`;
            }
          }
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

        // Pass the effective intent (may have been auto-switched from General Chat)
        // See: src/lib/intents.ts, src/lib/intentDetector.ts
        contextLayers.intentLabel = getIntentLabel(effectiveIntent);

        // Cross-intent nudge: if the user is in a SPECIFIC intent (not General Chat)
        // and their message matches a different specific intent, instruct the LLM
        // to give a brief answer and suggest switching.
        // NOTE: General Chat auto-switching is handled by the Hard Intent Guardrail above.
        // This nudge only applies when switching between two specific intents.
        if (effectiveIntent !== 'general_chat') {
          const crossIntentMatch = detectIntent(trimmed, effectiveIntent);
          if (crossIntentMatch) {
            const matchLabel = getIntentLabel(crossIntentMatch);
            contextLayers.crossIntentNudge = `HARD CONSTRAINT: The user's message appears to be a "${matchLabel}" task, but they are currently in "${getIntentLabel(effectiveIntent)}" mode.\nYou MUST:\n1. Acknowledge what they're asking for in ONE sentence.\n2. Do NOT perform the task. Do NOT produce any analysis, draft, comparison, review, or output.\n3. Tell them: "To get the best results for this, switch to **${matchLabel}** mode using the intent selector below. I'll be able to give you a much more thorough and specialised response there."\nThis is a HARD BLOCK — do not attempt the task in the wrong mode.`;
          }
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
          NONE: 'AI-generated response',
        };
        sourceBadge = sourceBadgeMap[result.sourceType] ?? 'AI-generated response';
      }

      // For card-rendering intents, try to parse the response as JSON.
      // If it parses, attach it as cardData so MessageBubble dispatches
      // to the correct card component. If parsing fails, the message
      // falls back to markdown rendering automatically.
      let cardData = null;
      if (isCardIntent(effectiveIntent)) {
        cardData = tryParseCardData(fullContent);
      }

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        content: fullContent,
        intent: effectiveIntent,
        cardData,
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
  }, [isTyping, showEmptyState, messages, activeKnowledgePack, activeVaultDocument, pendingAttachments, activeThreadId, sessionState, activeIntent]);

  const SUPPORTED_FILE_EXTENSIONS = [
    '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
    '.pdf', '.csv', '.txt', '.rtf',
    '.odt', '.ods', '.odp',
    '.pages', '.numbers', '.key',
    '.html', '.htm', '.xml', '.json',
  ];

  // Chat attach limits — a knowledge pack is the escape hatch for bigger sets.
  const MAX_CHAT_ATTACHMENTS = 5;
  const MAX_FILE_SIZE_MB = 10;

  // Holds files that exceeded MAX_CHAT_ATTACHMENTS so we can offer to
  // bundle them into a knowledge pack instead.
  const [attachLimitOverflow, setAttachLimitOverflow] = useState(null);

  const handleAttachFiles = (files, kind) => {
    // Validate file types for document uploads
    if (kind === 'doc') {
      const rejected = files.filter(f => {
        const ext = f.name.lastIndexOf('.') !== -1
          ? f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
          : '';
        return !SUPPORTED_FILE_EXTENSIONS.includes(ext);
      });
      if (rejected.length > 0) {
        const names = rejected.map(f => f.name).join(', ');
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'bot',
          content: `**This file is not currently supported right now.** The file${rejected.length > 1 ? 's' : ''} *${names}* could not be uploaded.\n\nSupported formats: PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), Excel (.xls/.xlsx), CSV, TXT, RTF, Open Document (.odt/.ods/.odp), Apple iWork (.pages/.numbers/.key), HTML, XML, and JSON.`,
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        }]);
        // Filter to only valid files and continue if any are valid
        files = files.filter(f => {
          const ext = f.name.lastIndexOf('.') !== -1
            ? f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
            : '';
          return SUPPORTED_FILE_EXTENSIONS.includes(ext);
        });
        if (files.length === 0) return;
      }

      // ─── Size limit: 10 MB per file ──────────────────────────────────
      const oversize = files.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
      if (oversize.length > 0) {
        const names = oversize.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`).join(', ');
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'bot',
          content: `**Some files are too large.** Each file needs to be under ${MAX_FILE_SIZE_MB} MB. Skipped: *${names}*.`,
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        }]);
        files = files.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
        if (files.length === 0) return;
      }

      // ─── Count limit: 5 files per chat attachment ───────────────────
      // If the user is trying to attach more than the ceiling, offer them
      // the knowledge-pack escape hatch instead of silently truncating.
      const currentCount = pendingAttachments.filter(a => a.kind === 'doc').length;
      const totalCount = currentCount + files.length;
      if (totalCount > MAX_CHAT_ATTACHMENTS) {
        setAttachLimitOverflow({ files, currentCount });
        return; // Don't add to pending — user has to make a choice
      }
    }

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

    // ─── Auto-add to Document Vault ───────────────────────────────────
    // When a file is attached via chat, persist it to the Document Vault.
    // The file's own name is used as both the vault entry name and the
    // fileName (no separate "Description" prompt — that's only asked for
    // direct vault uploads). Dedupe by fileName so re-attaching the same
    // file doesn't create duplicate vault entries.
    if (kind === 'doc') {
      const createdAt = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      setDocumentVault(prev => {
        const existingNames = new Set(prev.map(d => d.fileName));
        const additions = files
          .filter(f => !existingNames.has(f.name))
          .map((f, i) => ({
            id: Date.now() + 1000 + i,
            name: f.name,
            description: '',
            fileName: f.name,
            fileSize: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
            createdAt,
            addedFromChat: true,
          }));
        return additions.length > 0 ? [...additions, ...prev] : prev;
      });
    }

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
        // Auto-add to Document Vault (dedupe by fileName)
        setDocumentVault(prev => {
          if (prev.some(d => d.fileName === pendingNewDoc.name)) return prev;
          return [{
            id: Date.now() + 1000,
            name: pendingNewDoc.name,
            description: '',
            fileName: pendingNewDoc.name,
            fileSize: pendingNewDoc.size ? `${(pendingNewDoc.size / (1024 * 1024)).toFixed(1)} MB` : '—',
            createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            addedFromChat: true,
          }, ...prev];
        });
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
    if (e.key === 'Escape' && isIntentDropdownOpen) { setIsIntentDropdownOpen(false); return; }
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

  // ─── Session Guard Screens (Blocked / Timed Out) ───
  if (session.state.status === 'blocked' || session.state.status === 'timed-out') {
    const isBlocked = session.state.status === 'blocked';
    const reason = isBlocked ? session.state.reason : null;
    const handleSignOut = async () => {
      await session.signOut();
      navigate('/chat/login');
    };
    const title = isBlocked
      ? (reason === 'tenant' ? 'Organisation Blocked' : 'Access Blocked')
      : 'Session expired';
    const body = isBlocked
      ? (reason === 'tenant'
          ? 'Your organisation has been blocked by an administrator. All users from your firm have lost access to YourAI. If you believe this is a mistake, please reach out to your firm\'s admin or contact YourAI support.'
          : 'Your account has been blocked by your administrator. You no longer have access to YourAI. If you believe this is a mistake, please reach out to your firm\'s admin or contact support.')
      : 'You were signed out after 30 minutes of inactivity. This keeps your documents and conversations secure. Please sign back in to continue.';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 24, background: 'var(--ice-warm)', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: isBlocked ? '#F9E7E7' : '#FBEED5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Lock size={32} style={{ color: isBlocked ? '#C65454' : '#E8A33D' }} />
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: 'var(--navy)', margin: 0 }}>{title}</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 440, marginTop: 12, lineHeight: 1.6 }}>{body}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button onClick={handleSignOut} style={{ padding: '10px 20px', borderRadius: 6, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {isBlocked ? 'Sign out' : 'Sign in again'}
          </button>
          {isBlocked && (
            <a href="mailto:support@yourai.com" style={{ padding: '10px 20px', borderRadius: 6, background: 'transparent', color: 'var(--navy)', border: '1px solid var(--navy)', fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Contact support
            </a>
          )}
        </div>
      </div>
    );
  }

  // ─── Idle warning modal (overlay shown 2 min before timeout) ─────────
  const idleWarning = session.state.status === 'idle-warning' ? (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 36, 99, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, maxWidth: 400, boxShadow: '0 12px 32px rgba(10, 36, 99, 0.14)', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FBEED5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertTriangle size={22} style={{ color: '#E8A33D' }} />
        </div>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--navy)', margin: '0 0 8px' }}>Still there?</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.6 }}>
          You've been inactive for a while. For your security, you'll be signed out in about 2 minutes.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={async () => { await session.signOut(); navigate('/chat/login'); }} style={{ padding: '8px 16px', borderRadius: 6, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-mid)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Sign out now</button>
          <button onClick={session.stayActive} style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Stay signed in</button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflowX: 'hidden' }}>
      {idleWarning}
      <Sidebar
        onOpenPromptTemplates={() => { setShowTeamPage(false); setShowWorkspacesPanel(false); setShowPromptPanel(true); setSidebarOpen(false); }}
        onOpenClients={() => { setShowTeamPage(false); setShowWorkspacesPanel(false); setShowClientsPanel(true); setSidebarOpen(false); }}
        onOpenKnowledgePacks={() => { setShowTeamPage(false); setShowWorkspacesPanel(false); setShowKnowledgePacksPanel(true); setSidebarOpen(false); }}
        onOpenDocumentVault={() => { setShowTeamPage(false); setShowWorkspacesPanel(false); setShowDocumentVaultPanel(true); setSidebarOpen(false); }}
        onOpenInviteTeam={() => { setShowWorkspacesPanel(false); setShowTeamPage(true); setSidebarOpen(false); }}
        onOpenAuditLogs={() => { /* TODO: Part 5+ wires real audit-logs panel */ }}
        onOpenBilling={() => { navigate('/app/billing'); setSidebarOpen(false); }}
        onOpenWorkspaces={() => { setShowTeamPage(false); navigate('/chat/workspaces'); setShowWorkspacesPanel(true); setSidebarOpen(false); }}
        onOpenWorkflows={() => { setShowTeamPage(false); setShowWorkspacesPanel(false); setShowWorkflowsPanel(true); setSidebarOpen(false); }}
        workflowCount={workflowCount}
        runningWorkflow={runningWorkflow}
        onViewRunning={() => {
          // Close overlay panels so the chat thread is visible, then scroll
          // to the workflow card. The card has id `wf-run-<runId>`.
          setShowTeamPage(false);
          setShowWorkspacesPanel(false);
          setShowWorkflowsPanel(false);
          setShowPromptPanel(false);
          setShowClientsPanel(false);
          setShowKnowledgePacksPanel(false);
          setShowDocumentVaultPanel(false);
          setSidebarOpen(false);
          const runId = runningWorkflow?.id;
          if (runId) {
            setTimeout(() => {
              const el = document.getElementById(`wf-run-${runId}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 60);
          }
        }}
        promptCount={promptTemplates.length}
        clientCount={clients.length}
        packCount={knowledgePacks.length}
        vaultCount={documentVault.length}
        memberCount={teamMemberCount}
        workspaceCount={visibleWorkspaceCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        threads={filteredThreads}
        activeThreadId={activeThreadId}
        onSwitchThread={(id) => { handleSwitchThread(id); setSidebarOpen(false); }}
        onNewThread={() => { handleNewThread(); setSidebarOpen(false); }}
        onDeleteThread={handleDeleteThread}
        threadSearch={threadSearch}
        onThreadSearchChange={setThreadSearch}
        onSignOut={async () => { await session.signOut(); navigate('/chat/login'); }}
      />
      {/* Chat main area — hidden when a full-page view (Team or Workspaces)
          is active so the sidebar stays visible but the chat UI is replaced. */}
      <div style={{ flex: 1, display: (showTeamPage || showWorkspacesPanel) ? 'none' : 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopNav plan={plan} usage={usage} onOpenSidebar={() => setSidebarOpen(true)} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FAFBFC', minHeight: 0 }}>
          {/* Document limit banners */}
          {docPct >= 100 && (
            <div className="px-3 sm:px-6 md:px-10 py-2.5 flex items-center gap-2 sm:gap-3 flex-wrap" style={{ backgroundColor: '#F9E7E7', borderBottom: '1px solid #F9E7E7' }}>
              <AlertTriangle size={15} style={{ color: '#C65454', flexShrink: 0 }} />
              <span className="text-xs sm:text-sm" style={{ flex: 1, minWidth: 0, color: '#C65454' }}>
                You've reached your document limit for this month. Uploads are paused until May 1, 2026 or you upgrade.
              </span>
              <button onClick={() => setShowPlanModal(true)} style={{ padding: '4px 14px', borderRadius: 8, backgroundColor: '#C9A84C', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Upgrade Plan</button>
            </div>
          )}
          {docPct >= 80 && docPct < 100 && !docLimitBannerDismissed && (
            <div className="px-3 sm:px-6 md:px-10 py-2.5 flex items-center gap-2 sm:gap-3 flex-wrap" style={{ backgroundColor: '#FBEED5', borderBottom: '1px solid #FBEED5' }}>
              <AlertTriangle size={15} style={{ color: '#E8A33D', flexShrink: 0 }} />
              <span className="text-xs sm:text-sm" style={{ flex: 1, minWidth: 0, color: '#E8A33D' }}>
                You've used {Math.round(docPct)}% of your {usage.docs.limit.toLocaleString()} document limit this month. Uploads will stop at {usage.docs.limit.toLocaleString()}.
              </span>
              <button onClick={() => setShowPlanModal(true)} style={{ fontSize: 12, fontWeight: 500, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Upgrade Plan →</button>
              <button onClick={() => setDocLimitBannerDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={14} color="#E8A33D" /></button>
            </div>
          )}

          {showEmptyState ? (
            <EmptyState
              profile={profile}
              plan={plan}
              onPromptClick={handlePromptClick}
              navigate={navigate}
              onViewPlans={() => setShowPlanModal(true)}
              workflows={!isExternalUser ? (listTemplatesForUser(currentUserId, currentRole) || []).filter(t => t.status === 'active').slice(0, 3) : []}
              onRunWorkflow={(t) => setRunningPrep(t)}
              onOpenWorkflowsPanel={() => { setShowTeamPage?.(false); setShowWorkspacesPanel?.(false); setShowWorkflowsPanel(true); }}
            />
          ) : (
            <div ref={scrollRef} className="px-3 sm:px-4 md:px-10 py-6" style={{ flex: 1, overflowY: 'auto' }}>
              {/* ─── Persistent Conversation Context Header ─── */}
              {/* Shows documents / knowledge packs locked to this conversation.
                  Context is locked once the first message is sent — no add/remove mid-conversation. */}
              {(() => {
                const docNames = sessionDocContext?.docNames || [];
                const hasCtx = docNames.length > 0 || activeKnowledgePack || activeVaultDocument;
                if (!hasCtx) return null;
                return (
                  <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'var(--ice-warm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Info size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Attached to this chat</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {docNames.map((name, i) => (
                        <span key={`d-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: 'white', border: '1px solid rgba(10,36,99,0.2)', fontSize: 11, fontWeight: 500, color: 'var(--navy)' }}>
                          <File size={11} /> {name}
                        </span>
                      ))}
                      {activeKnowledgePack && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: 'white', border: '1px solid rgba(10,36,99,0.2)', fontSize: 11, fontWeight: 500, color: 'var(--navy)' }}>
                          <Package size={11} /> {activeKnowledgePack.name}
                        </span>
                      )}
                      {activeVaultDocument && !docNames.includes(activeVaultDocument.name) && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: 'white', border: '1px solid rgba(10,36,99,0.2)', fontSize: 11, fontWeight: 500, color: 'var(--navy)' }}>
                          <File size={11} /> {activeVaultDocument.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
              {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
              {/* Streaming response — shows tokens as they arrive */}
              {isTyping && streamingContent && (
                <MessageBubble msg={{ id: 'streaming', sender: 'bot', content: streamingContent, timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }} />
              )}
              {isTyping && !streamingContent && <TypingIndicator />}
            </div>
          )}

          {/* ─── Attach limit overflow: too many files for a chat attachment ─── */}
          {/* A chat can hold up to 5 files. Beyond that, we route the user to a
              knowledge pack (which has no file-count ceiling). Non-dismissible
              by X — user must either trim down or bundle into a pack. */}
          {attachLimitOverflow && (
            <div className="px-3 sm:px-4 md:px-10" style={{ paddingTop: 8, paddingBottom: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 18px', borderRadius: 12,
                background: '#F0F3F6', border: '1px solid #D6DDE4',
              }}>
                <Package size={18} style={{ color: 'var(--navy)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                    That's more than a chat can hold
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>
                    A single chat accepts up to {MAX_CHAT_ATTACHMENTS} files. You're trying to attach{' '}
                    <strong>{attachLimitOverflow.currentCount + attachLimitOverflow.files.length}</strong>{' '}
                    ({attachLimitOverflow.currentCount} already attached, {attachLimitOverflow.files.length} new).
                    For larger sets, bundle everything into a <strong>Knowledge Pack</strong> — packs have no file limit
                    and you can reuse them across chats.
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        // Open the knowledge pack creator — the user will need to re-add
                        // their files there since File objects can't be passed around.
                        setEditingPack(null);
                        setShowKnowledgePacksPanel(true);
                        setAttachLimitOverflow(null);
                      }}
                      style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--navy)', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Package size={13} /> Create a Knowledge Pack
                    </button>
                    <button
                      onClick={() => setAttachLimitOverflow(null)}
                      style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: '#fff', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
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
                background: '#FBEED5', border: '1px solid #E8A33D',
                boxShadow: '0 1px 3px rgba(245, 158, 11, 0.15)',
              }}>
                <AlertTriangle size={18} style={{ color: '#E8A33D', flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#E8A33D', marginBottom: 6 }}>
                    Only one attachment per chat
                  </div>
                  <div style={{ fontSize: 12, color: '#A16207', marginBottom: 10, lineHeight: 1.7 }}>
                    You've already attached a document to this conversation, and only one attachment is allowed per chat. This keeps answers accurate — Alex won't mix facts from different files or carry over assumptions that don't apply.
                  </div>
                  <div style={{ fontSize: 12, color: '#A16207', marginBottom: 14, lineHeight: 1.7 }}>
                    To use your new document, start a fresh chat. Or keep the current document and continue here.
                  </div>
                  {pendingNewDoc && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#E8A33D', marginBottom: 14, padding: '8px 12px', background: 'rgba(217, 119, 6, 0.08)', borderRadius: 8, display: 'inline-block' }}>
                      {pendingNewDoc.name}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleDocVersionChoice('new')}
                      style={{
                        padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: '#E8A33D', color: '#fff', border: 'none', cursor: 'pointer',
                      }}
                    >
                      Start fresh with new document
                    </button>
                    <button
                      onClick={() => handleDocVersionChoice('continue')}
                      style={{
                        padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: '#fff', color: '#E8A33D', border: '1px solid #E8A33D', cursor: 'pointer',
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

            {/* ─── STATE 1: Intent pills above input (empty chat only) ─── */}
            {showEmptyState && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {INTENTS.map(intent => {
                  const isActive = activeIntent === intent.id;
                  return (
                    <button
                      key={intent.id}
                      onClick={() => setActiveIntent(intent.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 14px', borderRadius: 999,
                        fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                        fontWeight: isActive ? 500 : 400,
                        border: isActive ? '1.5px solid var(--text-primary)' : '0.5px solid var(--border)',
                        backgroundColor: 'white',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer', transition: 'border-color 150ms ease, color 150ms ease',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                    >
                      {intent.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ─── Option C: Mid-conversation intent switch banner ─── */}
            {showSwitchBanner && pendingIntent && (
              <div style={{
                padding: '12px 16px', marginBottom: 8, borderRadius: 12,
                backgroundColor: 'var(--ice-warm)', border: '0.5px solid var(--border)',
                fontSize: 13, color: 'var(--text-secondary)',
              }}>
                <div style={{ marginBottom: 10 }}>
                  You switched to <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getIntentLabel(pendingIntent)}</strong>.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      setActiveIntent(pendingIntent);
                      setPendingIntent(null);
                      setShowSwitchBanner(false);
                      // Start fresh — clear messages & session
                      setMessages([]);
                      setShowEmptyState(true);
                      setSessionDocContext(null);
                      setPendingAttachments([]);
                      setActiveKnowledgePack(null);
                      setActiveVaultDocument(null);
                    }}
                    style={{ fontSize: 12, padding: '6px 14px', border: '0.5px solid var(--border)', borderRadius: 999, background: 'white', color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500 }}
                  >Start fresh conversation</button>
                  <button
                    onClick={() => {
                      setActiveIntent(pendingIntent);
                      setPendingIntent(null);
                      setShowSwitchBanner(false);
                    }}
                    style={{ fontSize: 12, padding: '6px 14px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >Continue with this intent</button>
                </div>
              </div>
            )}

            {/* ─── Smart intent suggestion banner (Banner A) ─── */}
            {/* Single intent suggestion */}
            {suggestedIntent && !suggestedIntents.length && !showDocVersionBanner && !showSwitchBanner && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '10px 14px', marginBottom: 6, borderRadius: 12,
                backgroundColor: 'var(--ice-warm)', border: '0.5px solid var(--border)',
                fontSize: 13, color: 'var(--text-secondary)',
              }}>
                <span>Looks like <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getIntentLabel(suggestedIntent)}</strong></span>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => { setActiveIntent(suggestedIntent); setSuggestedIntent(null); setSuggestedIntents([]); setDismissedSuggestion(null); }}
                    style={{ fontSize: 12, padding: '4px 12px', border: '0.5px solid var(--border)', borderRadius: 999, background: 'white', color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >Yes, switch</button>
                  <button
                    onClick={() => { setDismissedSuggestion(suggestedIntent); setSuggestedIntent(null); }}
                    style={{ fontSize: 12, padding: '4px 12px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >Keep {getIntentLabel(activeIntent)}</button>
                </div>
              </div>
            )}

            {/* Multi-intent suggestion — user picks from tied matches */}
            {suggestedIntents.length >= 2 && !showDocVersionBanner && !showSwitchBanner && (
              <div style={{
                padding: '10px 14px', marginBottom: 6, borderRadius: 12,
                backgroundColor: 'var(--ice-warm)', border: '0.5px solid var(--border)',
                fontSize: 13, color: 'var(--text-secondary)',
              }}>
                <span style={{ display: 'block', marginBottom: 8 }}>
                  {suggestedIntents.length <= 3
                    ? <>This could be <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{suggestedIntents.map(m => getIntentLabel(m.intentId)).join(' or ')}</strong>. Which would you like?</>
                    : <>Multiple intents match your message. Which would you like to use?</>
                  }
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {suggestedIntents.map(m => (
                    <button
                      key={m.intentId}
                      onClick={() => { setActiveIntent(m.intentId); setSuggestedIntents([]); setSuggestedIntent(null); setDismissedSuggestion(null); }}
                      style={{ fontSize: 12, padding: '5px 14px', border: '0.5px solid var(--border)', borderRadius: 999, background: 'white', color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500 }}
                    >{getIntentLabel(m.intentId)}</button>
                  ))}
                  <button
                    onClick={() => { setSuggestedIntents([]); setDismissedSuggestion(suggestedIntents[0]?.intentId); }}
                    style={{ fontSize: 12, padding: '5px 14px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >Keep {getIntentLabel(activeIntent)}</button>
                </div>
              </div>
            )}

            {/* External Users are redirected away from /chat above, so no
                toggle is needed here. The Case / General toggle lives inside
                WorkspaceChatView where it belongs. */}

            {/* ─── Input bar ─── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--border)', borderRadius: 24, background: '#fff', minHeight: 48, padding: '8px 8px 8px 12px', opacity: showSwitchBanner ? 0.5 : 1, pointerEvents: showSwitchBanner ? 'none' : 'auto' }}>
              {/* STATE 2: Collapsed intent pill (conversation active) */}
              {!showEmptyState && (
                <div style={{ position: 'relative' }} ref={intentDropdownRef}>
                  <button
                    onClick={() => setIsIntentDropdownOpen(v => !v)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 999,
                      fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                      border: '1.5px solid var(--text-primary)',
                      backgroundColor: 'white', color: 'var(--text-primary)',
                      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    {getIntentLabel(activeIntent)}
                    <ChevronDown size={12} style={{ transform: isIntentDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                  </button>
                  {/* Dropdown — opens UPWARD */}
                  {isIntentDropdownOpen && (
                    <>
                      <div onClick={() => setIsIntentDropdownOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                      <div style={{
                        position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, width: 260,
                        backgroundColor: 'white', borderRadius: 12, border: '1px solid var(--border)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 51,
                        maxHeight: 320, overflowY: 'auto',
                      }}>
                        {INTENTS.map(intent => {
                          const isCurrent = activeIntent === intent.id;
                          return (
                            <div
                              key={intent.id}
                              onClick={() => {
                                if (intent.id === activeIntent) {
                                  setIsIntentDropdownOpen(false);
                                } else if (!showEmptyState) {
                                  // Option C — mid-conversation switch
                                  setPendingIntent(intent.id);
                                  setShowSwitchBanner(true);
                                  setIsIntentDropdownOpen(false);
                                } else {
                                  setActiveIntent(intent.id);
                                  setIsIntentDropdownOpen(false);
                                }
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                                color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontWeight: isCurrent ? 500 : 400,
                                backgroundColor: 'transparent', transition: 'background 100ms',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <span>{intent.label}</span>
                              {isCurrent && <CheckCircle size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
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
              <textarea ref={inputRef} className="no-focus-ring" value={input} onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                // Smart intent suggestion — debounce 600ms
                clearTimeout(suggestionTimer.current);
                if (val.trim().length < 10) {
                  setSuggestedIntent(null);
                  setSuggestedIntents([]);
                  return;
                }
                suggestionTimer.current = setTimeout(() => {
                  const allMatches = detectAllIntents(val);
                  // Filter out current intent and dismissed suggestions
                  const relevant = allMatches.filter(m => m.intentId !== activeIntent && m.intentId !== dismissedSuggestion);

                  if (relevant.length === 0) {
                    setSuggestedIntent(null);
                    setSuggestedIntents([]);
                    return;
                  }

                  // If top 2+ intents have the same score, show multi-pick
                  if (relevant.length >= 2 && relevant[0].matchCount === relevant[1].matchCount) {
                    const tied = relevant.filter(m => m.matchCount === relevant[0].matchCount);
                    setSuggestedIntents(tied);
                    setSuggestedIntent(null);
                  } else {
                    // Clear winner — single suggestion
                    setSuggestedIntent(relevant[0].intentId);
                    setSuggestedIntents([]);
                  }
                }, 600);
              }} onKeyDown={handleKeyDown} placeholder={inputPlaceholder} rows={1} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', resize: 'none', maxHeight: 120, overflowY: 'auto', lineHeight: '1.5', fontFamily: 'inherit' }} onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }} />
              {(() => { const canSend = (input.trim() || pendingAttachments.length > 0) && !isTyping && !showSwitchBanner; return (
              <div onClick={() => canSend && sendMessage(input)} style={{ width: 32, height: 32, borderRadius: '50%', background: canSend ? 'var(--navy)' : '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canSend ? 'pointer' : 'not-allowed', flexShrink: 0, opacity: canSend ? 1 : 0.6, transition: 'background 150ms, opacity 150ms' }}><ArrowUp size={16} color="#fff" /></div>
              ); })()}
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              YourAI may produce inaccurate information. Always verify critical outputs. <strong>Private &amp; encrypted.</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Team page — full-page replacement for the former Invite Team modal ─── */}
      {showTeamPage && (
        <TeamPage
          onBack={() => setShowTeamPage(false)}
          onCountChange={setTeamMemberCount}
          onToast={(msg) => {
            setToastMsg(msg);
            setTimeout(() => setToastMsg(''), 3200);
          }}
        />
      )}

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
          onDeleteClient={handleDeleteClient}
        />
      )}

      {/* Workspaces Panel — role + membership filtered */}
      {showWorkspacesPanel && (
        <WorkspacesPage
          onBack={() => {
            setShowWorkspacesPanel(false);
            setWorkspaceTick((n) => n + 1);
            navigate('/chat');
          }}
          onOpenWorkspace={(wsId) => {
            setShowWorkspacesPanel(false);
            navigate(`/chat/workspaces/${wsId}`);
          }}
          onToast={(msg) => {
            setToastMsg(msg);
            setTimeout(() => setToastMsg(''), 3200);
          }}
        />
      )}

      {/* ─── Workflow templates picker ─── */}
      {showWorkflowsPanel && (
        <WorkflowsPanel
          onClose={() => setShowWorkflowsPanel(false)}
          onCreateNew={() => { setShowWorkflowsPanel(false); setEditingWorkflow('new'); }}
          onRun={(t) => { setShowWorkflowsPanel(false); setRunningPrep(t); }}
          onEdit={(t) => { setShowWorkflowsPanel(false); setEditingWorkflow(t); }}
          onDuplicate={(t) => {
            const copy = duplicateWorkflow(t.id, currentUserId, operator?.name || 'You');
            if (copy) {
              setToastMsg(`${copy.name} ready to customise`);
              setTimeout(() => setToastMsg(''), 3200);
            }
          }}
          onDelete={(id) => {
            deleteWorkflow(id);
            setToastMsg('Workflow deleted');
            setTimeout(() => setToastMsg(''), 3200);
          }}
        />
      )}

      {/* ─── Workflow builder slide-over ─── */}
      {editingWorkflow && (
        <WorkflowBuilder
          template={editingWorkflow === 'new' ? null : editingWorkflow}
          knowledgePacks={knowledgePacks}
          onBack={() => { setEditingWorkflow(null); setShowWorkflowsPanel(true); }}
          onSaved={(saved) => {
            setEditingWorkflow(null);
            setShowWorkflowsPanel(true);
            setToastMsg(`${saved.name} saved`);
            setTimeout(() => setToastMsg(''), 3200);
          }}
          onToast={(msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3200); }}
        />
      )}

      {/* ─── Workflow pre-run modal ─── */}
      {runningPrep && (() => {
        // One-at-a-time guard — if there's already an active run,
        // surface the alert modal (Part 8) instead of a fresh pre-run.
        const activeRid = getActiveRunId();
        const active = activeRid ? getRun(activeRid) : null;
        if (active && active.status === 'running' && active.templateId !== runningPrep.id) {
          return (
            <AlreadyRunningAlert
              activeName={active.templateName}
              currentStep={active.currentStepIndex + 1}
              total={active.steps.length}
              onClose={() => setRunningPrep(null)}
            />
          );
        }
        return (
          <PreRunModal
            template={runningPrep}
            workspaceId={workspaceContext.id}
            workspaceName={workspaceContext.name}
            workspaceHasDocs={workspaceContext.hasDocs}
            onCancel={() => setRunningPrep(null)}
            onStarted={(runId) => {
              const tpl = runningPrep;
              setRunningPrep(null);
              // Drop a workflow-run marker into the current thread so the
              // progress card (and later the report) renders inline in chat.
              const wfMsg = {
                id: Date.now() + Math.random(),
                sender: 'workflow',
                runId,
                templateName: tpl.name,
                timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
              };
              setMessages((prev) => [...prev, wfMsg]);
              if (showEmptyState) setShowEmptyState(false);
            }}
            onToast={(msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3200); }}
          />
        );
      })()}

      {/* Transient toast for team actions */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, padding: '10px 18px', borderRadius: 10,
          background: 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(10, 36, 99, 0.25)',
        }}>
          {toastMsg}
        </div>
      )}

      {/* Add Client modal intentionally removed — clients are created only
          via the workspace invite flow (External User → client record). */}

      {/* Knowledge Packs Panel */}
      {showKnowledgePacksPanel && (
        <KnowledgePacksPanel
          packs={knowledgePacks}
          activePack={activeKnowledgePack}
          currentUserId={currentUserId}
          currentUserName={operator?.name || 'You'}
          isOrgAdmin={isOrgAdmin}
          onClose={() => setShowKnowledgePacksPanel(false)}
          onCreateNew={() => { setShowKnowledgePacksPanel(false); setEditingPack({ isNew: true }); }}
          onEdit={(pack) => { setShowKnowledgePacksPanel(false); setEditingPack(pack); }}
          onDelete={handleDeletePack}
          onSelect={(p) => { handleSelectKnowledgePack(p); setShowKnowledgePacksPanel(false); }}
          onToggleGlobal={(packId, next) => {
            setKnowledgePacks((prev) => prev.map((p) => (p.id === packId ? { ...p, isGlobal: next } : p)));
            setToastMsg(next ? 'Pack now shared with the entire organisation' : 'Pack is personal again');
            setTimeout(() => setToastMsg(''), 3200);
          }}
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
          currentUserId={currentUserId}
          isOrgAdmin={isOrgAdmin}
          isExternalUser={isExternalUser}
          onClose={() => setShowDocumentVaultPanel(false)}
          onCreateNew={() => { setShowDocumentVaultPanel(false); setEditingDocument({ isNew: true }); }}
          onEdit={(doc) => { setShowDocumentVaultPanel(false); setEditingDocument(doc); }}
          onSelect={(d) => { handleSelectVaultDocument(d); setShowDocumentVaultPanel(false); }}
          onDelete={handleDeleteDocument}
          onToggleGlobal={(docId, next) => {
            setDocumentVault((prev) => prev.map((d) => (d.id === docId ? { ...d, isGlobal: next } : d)));
            setToastMsg(next ? 'Document now shared org-wide' : 'Document is personal again');
            setTimeout(() => setToastMsg(''), 3200);
          }}
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
