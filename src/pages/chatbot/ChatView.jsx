import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  CheckCircle, MessageSquare, MessageCircle, Clock, Share2, Grid3X3, Calendar, Users,
  FolderOpen, ChevronDown, ChevronRight, MoreVertical, Plus, Download,
  Search, Bell, ArrowUp, Shield, Sparkles, FileText, Building2, Scale,
  LayoutDashboard, Send, MapPin, FileSearch, Lock, X, AlertTriangle, Info, Zap,
  BookOpen, UserPlus, Trash2, Edit3, Copy, Phone, Mail, Briefcase, Hash, Menu,
  Package, Link2, File, Upload, Paperclip, Database, GitBranch, Settings, LogOut,
  CreditCard, Folder, FolderPlus, ArrowLeft, User, MoreHorizontal, Check
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../lib/roles';
import TeamPage from '../../components/chat/TeamPage';
import WorkspacesPage from './WorkspacesPage';
import { listWorkspacesForUser, seedWorkspacesIfEmpty } from '../../lib/workspace';
import { MOCK_WORKSPACES } from '../../lib/mockWorkspaces';
import { loadVault, saveVault, seedVaultIfEmpty, loadFolders, saveFolders, seedFoldersIfEmpty } from '../../lib/documentVaultStore';
import { SAMPLE_VAULT_CONTENT, SAMPLE_VAULT_NESTED_DOCS } from '../../data/sampleVaultContent';
import IntentCard, { isCardIntent, tryParseCardData } from '../../components/chat/cards/IntentCard';
import WorkflowsPanel from '../../components/chat/WorkflowsPanel';
import WorkflowBuilder from '../../components/chat/WorkflowBuilder';
import PreRunModal from '../../components/chat/PreRunModal';
import WorkflowRunPanel from '../../components/chat/WorkflowRunPanel';
import WorkflowProgressCard from '../../components/chat/WorkflowProgressCard';
import WorkflowReportCard from '../../components/chat/WorkflowReportCard';
import {
  listTemplatesForUser, listFavouriteTemplatesForUser, seedTemplatesIfEmpty, duplicateTemplate as duplicateWorkflow,
  deleteTemplate as deleteWorkflow, getActiveRunId, getRun, listRuns,
} from '../../lib/workflow';
import { MOCK_WORKFLOW_TEMPLATES } from '../../lib/mockWorkflows';
import { subscribeRun } from '../../lib/workflowRunner';
import {
  MOCK_SUMMARY_CARD,
  MOCK_COMPARISON_CARD,
  MOCK_CASE_BRIEF_CARD,
  MOCK_RESEARCH_BRIEF_CARD,
  MOCK_RISK_MEMO_CARD,
  MOCK_CLAUSE_ANALYSIS_CARD,
  MOCK_TIMELINE_CARD,
} from '../../lib/mockCardData';
import { billingData, subscriptionPlans } from '../../data/mockData';
import { callLLM, getApiKey } from '../../lib/llm-client';
import { extractFileText } from '../../lib/file-parser';
import { trackDocUpload } from '../../lib/auth';
import { useSessionGuard } from '../../lib/useSessionGuard';
import { detectIntent, detectAllIntents } from '../../lib/intentDetector';
import { INTENTS, DEFAULT_INTENT, getIntentLabel, groupIntentsByBucket, BUCKET_COLORS, INTENT_DESCRIPTIONS, getBucketForIntent } from '../../lib/intents';

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
//
// Each seed doc now carries:
//   - `content`    real extracted text that the AI reads when the user
//                  clicks "Use" on this doc (sourced from
//                  src/data/sampleVaultContent.ts)
//   - `sampleUrl`  path to a real PDF in public/sample-docs/ for
//                  download/preview
const DEFAULT_DOCUMENT_VAULT = [
  {
    id: '1',
    name: 'Master Services Agreement — Acme Corp',
    description: 'Signed MSA covering SaaS delivery, support SLAs, and data processing terms.',
    fileName: 'MSA_Acme_Corp_v4.pdf',
    fileSize: '2.4 MB',
    createdAt: 'Mar 14, 2026',
    ownerId: 'user-ryan',
    ownerName: 'Ryan Melade',
    isGlobal: true,
    folderId: 'fld-contracts',
    content: SAMPLE_VAULT_CONTENT['1'],
    sampleUrl: '/sample-docs/MSA_Acme_Corp_v4.pdf',
  },
  {
    id: '2',
    name: 'Employee Handbook 2026',
    description: 'Current employee handbook with updated PTO, remote work, and conduct policies.',
    fileName: 'Employee_Handbook_2026.pdf',
    fileSize: '3.8 MB',
    createdAt: 'Jan 30, 2026',
    ownerId: 'user-ryan',
    ownerName: 'Ryan Melade',
    isGlobal: true,
    folderId: 'fld-policies',
    content: SAMPLE_VAULT_CONTENT['2'],
    sampleUrl: '/sample-docs/Employee_Handbook_2026.pdf',
  },
  {
    id: '3',
    name: 'Series B Term Sheet',
    description: 'Executed term sheet for Series B financing round with Ridgeline Ventures.',
    fileName: 'SeriesB_TermSheet_Signed.pdf',
    fileSize: '0.6 MB',
    createdAt: 'Feb 22, 2026',
    ownerId: 'm-002',
    ownerName: 'Priya Shah',
    isGlobal: false,
    folderId: 'fld-contracts',
    content: SAMPLE_VAULT_CONTENT['3'],
    sampleUrl: '/sample-docs/SeriesB_TermSheet_Signed.pdf',
  },
  // Nested folder doc — lives inside Acme Corp / MSA & Schedules so
  // the demo's deep folder tree has real content too.
  ...SAMPLE_VAULT_NESTED_DOCS.map((d) => ({
    ...d,
    sampleUrl: `/sample-docs/${d.fileName}`,
  })),
];

// Default folders seeded on first load. ID is a stable string so docs
// can reference it across reloads without depending on Date.now().
// Folders can nest via `parentId` — null = root-level. Wendy's mental
// model: Client > Topic > Files. Seed shows a couple of subfolders so
// the nested behaviour is visible from first load.
const DEFAULT_DOCUMENT_VAULT_FOLDERS = [
  {
    id: 'fld-contracts',
    name: 'Contracts',
    createdAt: 'Mar 1, 2026',
    ownerId: 'user-ryan',
    ownerName: 'Ryan Melade',
    isGlobal: true,
    parentId: null,
  },
  {
    id: 'fld-policies',
    name: 'Policies & Handbooks',
    createdAt: 'Jan 10, 2026',
    ownerId: 'user-ryan',
    ownerName: 'Ryan Melade',
    isGlobal: true,
    parentId: null,
  },
  {
    id: 'fld-acme',
    name: 'Acme Corp',
    createdAt: 'Mar 5, 2026',
    ownerId: 'user-ryan',
    ownerName: 'Ryan Melade',
    isGlobal: true,
    parentId: 'fld-contracts',
  },
  {
    id: 'fld-acme-msa',
    name: 'MSA & Schedules',
    createdAt: 'Mar 5, 2026',
    ownerId: 'user-ryan',
    ownerName: 'Ryan Melade',
    isGlobal: true,
    parentId: 'fld-acme',
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

function Sidebar({ activeKey, onOpenChat, onOpenPromptTemplates, onOpenClients, onOpenKnowledgePacks, onOpenDocumentVault, onOpenInviteTeam, onOpenAuditLogs, onOpenBilling, onOpenWorkspaces, onOpenWorkflows, promptCount, clientCount, packCount, vaultCount, memberCount, workspaceCount, workflowCount, isOpen, onClose, threads, activeThreadId, onSwitchThread, onNewThread, onDeleteThread, threadSearch, onThreadSearchChange, onSignOut, runningWorkflow, onViewRunning }) {
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
  // Visibility rules:
  //   Dashboard, Clients → ORG_ADMIN only (surfaces they edit)
  //   Workspaces, Invite Team → visible to everyone who isn't an External User
  //     (Invite Team is discoverable for Internal Users too; the Team page
  //      handles role-based UI inside itself so a non-admin sees a clear
  //      "ask your admin to add people" state rather than a dead link)
  //   + New chat is rendered separately in Zone 2 (visible to all)
  const workspaceItems = [
    // "Chat" entry — direct link to General Chat, the post-login default
    // surface. (The former tile-based Home page was retired in favour of
    // landing users directly in chat.)
    { id: 'chat', icon: MessageSquare, label: 'Chat', onClick: onOpenChat },
    { id: 'workspaces', icon: Briefcase, label: 'Workspaces', rightText: String(workspaceCount ?? 0), onClick: onOpenWorkspaces },
    !isExternalUser && { id: 'invite-team', icon: UserPlus, label: 'Invite Team', rightText: memberCount != null ? String(memberCount) : undefined, onClick: onOpenInviteTeam },
  ].filter(Boolean).map((it) => ({ ...it, active: it.id === activeKey }));

  // ─── Knowledge items ───
  // External Users don't see Knowledge Packs or Prompt Templates at all.
  // YourVault is visible to everyone (scoping to "own workspace only"
  // for External Users happens inside DocumentVaultPanel — Part 4).
  const knowledgeItems = [
    { id: 'document-vault', icon: FolderOpen, label: 'YourVault', rightText: String(vaultCount), onClick: onOpenDocumentVault },
    !isExternalUser && { id: 'knowledge-packs', icon: Package, label: 'Knowledge packs', rightText: String(packCount), onClick: onOpenKnowledgePacks },
    !isExternalUser && { id: 'workflows', icon: Zap, label: 'Workflows', rightText: workflowCount != null ? String(workflowCount) : undefined, onClick: onOpenWorkflows },
    !isExternalUser && { id: 'prompt-templates', icon: FileText, label: 'Prompt templates', rightText: String(promptCount), onClick: onOpenPromptTemplates },
  ].filter(Boolean).map((it) => ({ ...it, active: it.id === activeKey }));

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
  ].filter(Boolean).map((it) => ({ ...it, active: it.id === activeKey }));

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

      {/* ═══ ZONE 1.5 — Search Chats (top-level) ═══ */}
      {!isExternalUser && (
        <div style={{ padding: '12px 12px 0', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={threadSearch}
            onChange={(e) => onThreadSearchChange(e.target.value)}
            placeholder="Search Chats"
            style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 34, paddingRight: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)', background: '#fff' }}
          />
        </div>
      )}

      {/* ═══ ZONE 2 — New Chat Button ═══ */}
      {/* External Users don't have a personal chat — they only use workspace
          chats, which have their own 'New chat' button inside the workspace
          sidebar. Hide this CTA for them. */}
      {!isExternalUser && (
      <div style={{ padding: '10px 12px 0' }}>
        <button
          onClick={onNewThread}
          style={{
            width: '100%', height: 40, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', background: 'var(--navy)',
            border: 'none',
            fontSize: 13, fontWeight: 500, color: '#fff',
            cursor: 'pointer', transition: 'background 150ms ease, box-shadow 150ms ease',
            boxShadow: '0 1px 2px rgba(10, 36, 99, 0.18)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#07183F'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--navy)'; }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Plus size={15} />
            New Chat
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.78)', padding: '2px 7px', background: 'rgba(255,255,255,0.14)', borderRadius: 5, letterSpacing: '0.02em' }}>
            &#8984;N
          </span>
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
            <Search size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
          </div>

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
                    {/* Content-match snippet — only present when the
                        Search Chats query matched a message body (not the
                        title). Lets the user see *what* hit so they don't
                        have to open the thread to find out. */}
                    {t.searchSnippet ? (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.searchSnippet}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {t.updatedAt} &middot; {t.messageCount} msgs
                      </div>
                    )}
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

          {/* View all link — focuses the top Search Chats input */}
          {totalThreads > 3 && (
            <div
              onClick={() => {
                const el = document.querySelector('input[placeholder="Search Chats"]');
                if (el) el.focus();
              }}
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
  const [scope, setScope] = useState('all'); // 'all' | 'org' | 'mine'
  const [ownerFilter, setOwnerFilter] = useState(null); // null = All owners, else owner id
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);

  // Role-based visibility — others never see colleagues' personal packs.
  const visible = useMemo(() => {
    if (isOrgAdmin) return packs;
    return packs.filter((p) => p.ownerId === currentUserId || p.isGlobal);
  }, [packs, isOrgAdmin, currentUserId]);

  // Faceted owner list for the toolbar dropdown (Org Admin sees more).
  const owners = useMemo(() => {
    const map = new Map();
    visible.forEach((p) => {
      if (!p.ownerId) return;
      if (!map.has(p.ownerId)) map.set(p.ownerId, { id: p.ownerId, name: p.ownerName || 'Member', count: 0 });
      map.get(p.ownerId).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [visible]);

  const scoped = useMemo(() => {
    let result = visible;
    if (scope === 'org')  result = result.filter((p) => p.isGlobal);
    if (scope === 'mine') result = result.filter((p) => p.ownerId === currentUserId);
    if (ownerFilter)      result = result.filter((p) => p.ownerId === ownerFilter);
    return result;
  }, [visible, scope, ownerFilter, currentUserId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return scoped;
    const q = search.toLowerCase();
    return scoped.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }, [scoped, search]);

  const counts = useMemo(() => ({
    total: visible.length,
    org:   visible.filter((p) => p.isGlobal).length,
    mine:  visible.filter((p) => p.ownerId === currentUserId).length,
  }), [visible, currentUserId]);

  const activeOwner = ownerFilter ? owners.find((o) => o.id === ownerFilter) : null;
  const truncOwnerName = activeOwner ? (activeOwner.name.length > 14 ? activeOwner.name.slice(0, 13) + '…' : activeOwner.name) : 'All';

  return (
    <div style={{ flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden', background: '#FBFAF7', display: 'flex', flexDirection: 'column' }}>
      {/* Page chrome — Back to chat + breadcrumb-eyebrow */}
      <div style={{ padding: '12px 28px', borderBottom: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', marginLeft: -8, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <ArrowLeft size={13} /> Back to chat
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Knowledge Packs</span>
      </div>

      {/* Sticky toolbar */}
      <div style={{ height: 56, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 12, background: '#FBFAF7', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packs…"
            style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 36, paddingRight: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", background: '#fff' }}
          />
        </div>

        {/* Owner filter dropdown */}
        {owners.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setOwnerMenuOpen((v) => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 36, padding: '0 12px', borderRadius: 8,
                border: '1px solid ' + (ownerFilter ? 'var(--navy)' : 'var(--border)'),
                background: ownerFilter ? 'rgba(10,36,99,0.04)' : '#fff',
                fontSize: 12, color: 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <User size={13} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Owner:</span>
              <strong style={{ color: ownerFilter ? 'var(--navy)' : 'var(--text-primary)', fontWeight: 500 }}>{truncOwnerName}</strong>
              <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
            {ownerMenuOpen && (
              <>
                <div onClick={() => setOwnerMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 240, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 6px 20px rgba(15,23,42,0.08)', padding: 4, zIndex: 20, maxHeight: 320, overflowY: 'auto' }}>
                  <button
                    onClick={() => { setOwnerFilter(null); setOwnerMenuOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'none', border: 'none', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', borderRadius: 6 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    <span style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>
                      {ownerFilter === null && <Check size={12} style={{ color: 'var(--navy)' }} />}
                    </span>
                    <span style={{ flex: 1 }}>All owners</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{visible.length}</span>
                  </button>
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 4px' }} />
                  {owners.map((o) => {
                    const isActive = ownerFilter === o.id;
                    const initials = (o.name || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <button
                        key={o.id}
                        onClick={() => { setOwnerFilter(o.id); setOwnerMenuOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'none', border: 'none', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', borderRadius: 6 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      >
                        <span style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>
                          {isActive && <Check size={12} style={{ color: 'var(--navy)' }} />}
                        </span>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: 'var(--navy)' }}>
                          {initials}
                        </div>
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{o.count}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Scope tabs (segmented control) — replaces the old left-rail pinned filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 3, background: '#F0F2F5', borderRadius: 8 }}>
          {[
            { id: 'all',  label: 'All',      count: counts.total },
            { id: 'org',  label: 'Org-wide', count: counts.org },
            { id: 'mine', label: 'Mine',     count: counts.mine },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setScope(t.id)}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: scope === t.id ? '#fff' : 'transparent',
                color: scope === t.id ? 'var(--navy)' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
                boxShadow: scope === t.id ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {t.label} <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 2 }}>{t.count}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <button
          onClick={onCreateNew}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >
          <Plus size={13} /> New pack
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Hero */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 28px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Sparkles size={14} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Knowledge Packs</span>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Saved bundles
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6, maxWidth: 640 }}>
            Group documents and links into a pack you can attach to a chat in one click.
            Useful for state-law libraries, deal-specific exhibits, or playbooks.
          </p>
        </div>

        {/* Pack grid (or empty state) */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 48px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', borderRadius: 12, border: '1px dashed var(--border)', background: '#fff' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ice-warm)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Package size={26} style={{ color: 'var(--navy)' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)' }}>
                {search ? 'No matches' : 'No packs in this view'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
                {search ? 'Try a different term, or clear the search.' : 'Bundle a few related documents to spin up your first pack.'}
              </div>
              {!search && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                  <button onClick={onCreateNew} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer' }}>+ New pack</button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {filtered.map((p) => (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
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
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
      }}
    >
      <span>{label}</span>
      {typeof count === 'number' && <span style={{ fontSize: 10, opacity: 0.7 }}>{count}</span>}
    </button>
  );
}

/* ─── Knowledge Pack card row (vertical layout for grid cells) ─── */
function PackRow({ pack, activePack, currentUserId, isOrgAdmin, onSelect, onEdit, onDelete, onToggleGlobal }) {
  const isOwner = pack.ownerId === currentUserId;
  const canEdit = isOrgAdmin || isOwner;
  const canToggleGlobal = isOrgAdmin;
  const isActive = activePack?.id === pack.id;
  const [kebabOpen, setKebabOpen] = useState(false);

  // Org-wide = gold; Personal (someone else's) = muted; Personal (mine) = navy tint
  const ownerPill = pack.isGlobal
    ? { bg: 'rgba(201,168,76,0.18)', color: '#9A7A22', border: 'rgba(201,168,76,0.45)', label: 'Org-wide' }
    : isOwner
      ? { bg: '#F0F3F6', color: '#1E3A8A', border: '#D8DFE9', label: 'Your pack' }
      : { bg: '#F8F4ED', color: '#6B7885', border: '#E5E0D3', label: `By ${pack.ownerName || 'Member'}` };

  return (
    <div
      style={{
        padding: '16px 18px', borderRadius: 12,
        border: '1px solid ' + (isActive ? '#5CA868' : 'var(--border)'),
        transition: 'all 0.15s', background: '#fff',
        display: 'flex', flexDirection: 'column', minHeight: 168,
        boxShadow: isActive ? '0 0 0 1px rgba(92,168,104,0.4)' : 'none',
      }}
      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.boxShadow = '0 4px 14px rgba(15,23,42,0.06)'; e.currentTarget.style.borderColor = 'var(--navy)'; } }}
      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; } }}
    >
      {/* Header row — icon, title block, kebab */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: pack.isGlobal ? 'rgba(201,168,76,0.15)' : 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Package size={18} style={{ color: pack.isGlobal ? '#9A7A22' : 'var(--navy)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pack.name}</div>
          <div style={{ marginTop: 4 }}>
            <span
              title={pack.isGlobal ? 'Shared with the whole organisation' : isOwner ? 'Only visible to you' : `Owned by ${pack.ownerName}`}
              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: ownerPill.bg, color: ownerPill.color, border: `1px solid ${ownerPill.border}`, fontWeight: 600, letterSpacing: '0.02em' }}
            >
              {ownerPill.label}
            </span>
          </div>
        </div>
        {canEdit && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setKebabOpen((v) => !v); }}
              title="More"
              style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <MoreHorizontal size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
            {kebabOpen && (
              <>
                <div onClick={() => setKebabOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                <div style={{ position: 'absolute', top: 30, right: 0, minWidth: 160, background: '#fff', borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 31, overflow: 'hidden' }}>
                  <button onClick={() => { onEdit?.(pack); setKebabOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                    <Edit3 size={12} /> Edit
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)' }} />
                  <button onClick={() => { onDelete?.(pack.id); setKebabOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', fontSize: 12, color: '#C65454', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(198,84,84,0.06)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Description (clamped to 2 lines so cards stay even-height) */}
      <p style={{
        fontSize: 12, color: 'var(--text-muted)',
        lineHeight: 1.55, margin: '10px 0 0',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{pack.description}</p>

      {/* Footer — pushes to the bottom of the card, fixed-row metadata + actions */}
      <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            <FileText size={11} /> {pack.docs?.length || 0} doc{(pack.docs?.length || 0) !== 1 ? 's' : ''}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            <Link2 size={11} /> {pack.links?.length || 0} link{(pack.links?.length || 0) !== 1 ? 's' : ''}
          </span>
        </div>
        {canToggleGlobal && (
          <span
            onClick={() => onToggleGlobal?.(pack.id, !pack.isGlobal)}
            title={pack.isGlobal ? 'Shared org-wide — click to make personal' : 'Share with entire organisation'}
            style={{ width: 28, height: 16, borderRadius: 999, background: pack.isGlobal ? 'var(--navy)' : '#CBD5E1', position: 'relative', transition: 'background 150ms', flexShrink: 0, cursor: 'pointer' }}
          >
            <span style={{ position: 'absolute', top: 2, left: pack.isGlobal ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 150ms' }} />
          </span>
        )}
        {onSelect && (
          <button
            onClick={() => onSelect(pack)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 6, backgroundColor: isActive ? '#5CA868' : 'var(--navy)', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
          >
            {isActive ? <><CheckCircle size={12} /> Active</> : 'Use'}
          </button>
        )}
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

/* ─────────────────── YourVault Panel ─────────────────── */
// Same visibility rules as Knowledge Packs:
//   Org Admin      — sees every doc; inline Share org-wide toggle on each row
//   Internal User  — own docs + all org-wide docs
//   External User  — Vault is still visible but filtered to their own docs only
//
// Folders are a single-level grouping (no nesting). Root view shows
// folder tiles + uncategorised docs. Drilling in shows that folder's
// docs only, with a breadcrumb back to root.
/* ─── Reusable filter chip with popover (P8 v1) ───
   Used by the YourVault toolbar for Date / Uploader / Type / Sort. */
function FilterChip({ icon: Icon, label, value, isActive, isOpen, onToggle, onClose, options, selectedId, onPick }) {
  return (
    <span style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 32, padding: '0 12px', borderRadius: 999,
          border: '1px solid ' + (isActive ? 'var(--navy)' : 'var(--border)'),
          background: isActive ? 'rgba(10,36,99,0.04)' : '#fff',
          fontSize: 12, color: 'var(--text-secondary)',
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <Icon size={12} style={{ color: 'var(--text-muted)' }} />
        <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
        <strong style={{ color: isActive ? 'var(--navy)' : 'var(--text-primary)', fontWeight: 500 }}>{value}</strong>
        <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} />
      </button>
      {isOpen && (
        <>
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: 200, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 6px 20px rgba(15,23,42,0.08)', padding: 4, zIndex: 20, maxHeight: 320, overflowY: 'auto' }}>
            {options.map((o) => {
              const isSelected = selectedId === o.id;
              return (
                <button
                  key={String(o.id)}
                  onClick={() => onPick(o.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 10px',
                    background: 'none', border: 'none',
                    fontSize: 12, color: 'var(--text-primary)',
                    cursor: 'pointer', textAlign: 'left', borderRadius: 6,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  <span style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>
                    {isSelected && <Check size={12} style={{ color: 'var(--navy)' }} />}
                  </span>
                  <span style={{ flex: 1 }}>{o.label}</span>
                  {typeof o.count === 'number' && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{o.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </span>
  );
}

function DocumentVaultPanel({
  documents, folders, onClose, onCreateNew, onCreateFolder, onRenameFolder, onDeleteFolder,
  onUploadFolder,
  onEdit, onDelete, onSelect, onSelectFolder, onToggleGlobal, activeDocument, activeFolder,
  currentUserId, isOrgAdmin, isExternalUser,
}) {
  // ─── Refs / state ───
  const folderUploadRef = useRef(null);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all'); // Org Admin only
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [openMenuFor, setOpenMenuFor] = useState(null); // doc id
  const [expandedSet, setExpandedSet] = useState(() => new Set());

  // ─── Find / search filters (P8 v1) ───
  // Filter chips operate on the same scoped doc set as the table; they
  // narrow what's rendered without changing the folder tree navigation.
  // Limit chip in particular handles "biggest file" / "smallest file"
  // style natural-language queries from the Ask-anything parser.
  const [dateFilter, setDateFilter]    = useState('any');   // 'any' | '7d' | '30d' | 'year'
  const [uploaderFilter, setUploaderFilter] = useState(null); // null | userId
  const [typeFilter, setTypeFilter]    = useState(null);    // null | 'PDF' | 'DOCX' | 'XLSX' | other
  const [sortBy, setSortBy]            = useState('recent'); // 'recent' | 'name' | 'size-desc' | 'size-asc'
  const [resultLimit, setResultLimit]  = useState(null);    // null = unlimited
  const [askQuery, setAskQuery]        = useState('');
  const [askLoading, setAskLoading]    = useState(false);
  const [askExplanation, setAskExplanation] = useState('');
  const [openFilterMenu, setOpenFilterMenu] = useState(null); // 'date' | 'uploader' | 'type' | 'sort' | null

  const clearAllFilters = () => {
    setDateFilter('any');
    setUploaderFilter(null);
    setTypeFilter(null);
    setSortBy('recent');
    setResultLimit(null);
    setAskExplanation('');
    setAskQuery('');
    setSearch('');
  };

  // When the user folds the page back to "All documents" by clicking the
  // sidebar tree's All-documents row, drop the AI-driven transient
  // filters too — otherwise leftover sort/limit from a previous Ask
  // query keeps the table narrowed and confuses the user.
  const goToAllDocs = () => {
    setCurrentFolderId(null);
    setResultLimit(null);
    setSortBy('recent');
    setAskExplanation('');
  };

  // ─── Visibility (role + isGlobal) ───
  const visibleDocs = useMemo(() => {
    if (isOrgAdmin) return documents;
    if (isExternalUser) return documents.filter((d) => d.ownerId === currentUserId);
    return documents.filter((d) => d.ownerId === currentUserId || d.isGlobal || !d.ownerId);
  }, [documents, isOrgAdmin, isExternalUser, currentUserId]);

  const visibleFolders = useMemo(() => {
    const list = folders || [];
    if (isOrgAdmin) return list;
    if (isExternalUser) return list.filter((f) => f.ownerId === currentUserId);
    return list.filter((f) => f.ownerId === currentUserId || f.isGlobal || !f.ownerId);
  }, [folders, isOrgAdmin, isExternalUser, currentUserId]);

  const currentFolder = useMemo(
    () => visibleFolders.find((f) => f.id === currentFolderId) || null,
    [visibleFolders, currentFolderId],
  );

  // Children of each parent folder (id → array). null key = root level.
  const childrenByParent = useMemo(() => {
    const map = new Map();
    visibleFolders.forEach((f) => {
      const p = f.parentId || null;
      if (!map.has(p)) map.set(p, []);
      map.get(p).push(f);
    });
    return map;
  }, [visibleFolders]);

  // Auto-expand the ancestor chain when the user navigates into a nested
  // folder so the tree on the left always reveals where they are.
  useEffect(() => {
    if (!currentFolderId) return;
    const byId = new Map(visibleFolders.map((f) => [f.id, f]));
    const ancestors = new Set();
    let cur = byId.get(currentFolderId);
    let guard = 0;
    while (cur && cur.parentId && guard++ < 32) {
      ancestors.add(cur.parentId);
      cur = byId.get(cur.parentId);
    }
    if (ancestors.size > 0) {
      setExpandedSet((prev) => {
        const next = new Set(prev);
        ancestors.forEach((a) => next.add(a));
        return next;
      });
    }
  }, [currentFolderId, visibleFolders]);

  const toggleExpand = (id) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Walk parent chain for the breadcrumb.
  const breadcrumb = useMemo(() => {
    if (!currentFolder) return [];
    const trail = [];
    const byId = new Map(visibleFolders.map((f) => [f.id, f]));
    let cur = currentFolder;
    let guard = 0;
    while (cur && guard++ < 32) {
      trail.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : null;
    }
    return trail;
  }, [currentFolder, visibleFolders]);

  // Org-Admin scope tabs filter the doc set first; folder + search apply on top.
  const scopedDocs = useMemo(() => {
    if (!isOrgAdmin || scope === 'all') return visibleDocs;
    if (scope === 'org') return visibleDocs.filter((d) => d.isGlobal);
    return visibleDocs.filter((d) => d.ownerId === currentUserId);
  }, [visibleDocs, scope, isOrgAdmin, currentUserId]);

  const childFolders = useMemo(() => {
    return visibleFolders.filter((f) => (f.parentId || null) === (currentFolderId || null));
  }, [visibleFolders, currentFolderId]);

  // At root: every visible doc. In a folder: only its direct docs.
  const folderDocs = useMemo(() => {
    if (currentFolderId) return scopedDocs.filter((d) => d.folderId === currentFolderId);
    return scopedDocs;
  }, [scopedDocs, currentFolderId]);

  // Owners list (for the Uploader filter dropdown).
  const docOwners = useMemo(() => {
    const map = new Map();
    visibleDocs.forEach((d) => {
      if (!d.ownerId) return;
      if (!map.has(d.ownerId)) map.set(d.ownerId, { id: d.ownerId, name: d.ownerName || 'Member', count: 0 });
      map.get(d.ownerId).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [visibleDocs]);

  // Helpers used by the chip filters.
  const parseSizeMb = (s) => {
    if (!s) return 0;
    const m = String(s).match(/([\d.]+)\s*(KB|MB|GB)?/i);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    const unit = (m[2] || 'MB').toUpperCase();
    return unit === 'KB' ? n / 1024 : unit === 'GB' ? n * 1024 : n;
  };
  const parseDate = (s) => {
    if (!s) return 0;
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : 0;
  };
  const isWithin = (createdAt, period) => {
    if (period === 'any') return true;
    const t = parseDate(createdAt);
    if (!t) return false;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    if (period === '7d')   return now - t <= 7 * day;
    if (period === '30d')  return now - t <= 30 * day;
    if (period === 'year') return now - t <= 365 * day;
    return true;
  };

  const filteredDocs = useMemo(() => {
    let out = folderDocs;

    // Free-text search
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((d) =>
        d.name.toLowerCase().includes(q)
        || (d.description || '').toLowerCase().includes(q)
        || (d.fileName || '').toLowerCase().includes(q),
      );
    }
    // Date filter
    if (dateFilter !== 'any') out = out.filter((d) => isWithin(d.createdAt, dateFilter));
    // Uploader filter
    if (uploaderFilter) out = out.filter((d) => d.ownerId === uploaderFilter);
    // Type filter (matches against the file extension)
    if (typeFilter) {
      const target = typeFilter.toLowerCase();
      out = out.filter((d) => {
        const fn = (d.fileName || '').toLowerCase();
        const ext = fn.lastIndexOf('.') !== -1 ? fn.slice(fn.lastIndexOf('.') + 1) : '';
        return ext === target;
      });
    }
    // Sort
    if (sortBy === 'name') {
      out = [...out].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'size-desc') {
      out = [...out].sort((a, b) => parseSizeMb(b.fileSize) - parseSizeMb(a.fileSize));
    } else if (sortBy === 'size-asc') {
      out = [...out].sort((a, b) => parseSizeMb(a.fileSize) - parseSizeMb(b.fileSize));
    } else {
      // 'recent' — newest first by parsed createdAt
      out = [...out].sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
    }
    // Limit (used by NL queries like "biggest file" → limit 1)
    if (resultLimit && resultLimit > 0) out = out.slice(0, resultLimit);
    return out;
  }, [folderDocs, search, dateFilter, uploaderFilter, typeFilter, sortBy, resultLimit]);

  const activeFilterCount = (dateFilter !== 'any' ? 1 : 0)
    + (uploaderFilter ? 1 : 0)
    + (typeFilter ? 1 : 0)
    + (sortBy !== 'recent' ? 1 : 0)
    + (resultLimit ? 1 : 0);

  const docCountByFolder = useMemo(() => {
    const map = {};
    scopedDocs.forEach((d) => { if (d.folderId) map[d.folderId] = (map[d.folderId] || 0) + 1; });
    return map;
  }, [scopedDocs]);

  const counts = useMemo(() => ({
    total: visibleDocs.length,
    org:   visibleDocs.filter((d) => d.isGlobal).length,
    mine:  visibleDocs.filter((d) => d.ownerId === currentUserId).length,
  }), [visibleDocs, currentUserId]);

  // ─── Folder selection / actions ───
  const folderAttachable = typeof onSelectFolder === 'function';

  // ─── "Ask anything" natural-language → filter parser ───
  // Wendy's killer query: "what is the biggest at-close download I have?"
  // We POST to /api/chat with a JSON-only schema and a tiny system prompt
  // that asks the model to map the natural-language query onto the
  // structured filter shape we already use. If parsing fails or the
  // model returns garbage, we fall back to using the query as a
  // free-text search.
  const handleAskAnything = async () => {
    const q = askQuery.trim();
    if (!q || askLoading) return;
    setAskLoading(true);
    setAskExplanation('');
    try {
      const ownersList = docOwners.map((o) => `${o.name} (id=${o.id})`).join(', ') || '(none)';
      const systemPrompt = `You translate natural-language document-library queries into a JSON filter object. Output ONLY a single JSON object — no prose, no code fences. Schema:
{
  "search": string | null,
  "dateFilter": "any" | "7d" | "30d" | "year",
  "uploaderId": string | null,
  "fileType": "PDF" | "DOCX" | "XLSX" | "TXT" | null,
  "sortBy": "recent" | "name" | "size-desc" | "size-asc",
  "limit": number | null,
  "explanation": string
}

Available uploaders: ${ownersList}.
Available file types in this library: PDF, DOCX, XLSX, TXT.
Today's date: ${new Date().toISOString().slice(0, 10)}.

Rules:
- If user asks for "biggest" or "largest", set sortBy="size-desc" and limit=1 (or N if explicit).
- If user asks for "smallest", sortBy="size-asc" and limit=1.
- If they say "this month" or "past 30 days", dateFilter="30d". "Past week" → "7d". "This year" → "year".
- If they name an uploader by full or partial name, set uploaderId to the matching id from the list above. If no match, leave null.
- "Search" is a substring of filenames/descriptions if specific keywords are mentioned (e.g. "NDA", "Acme"). Otherwise null.
- "explanation" is one short sentence shown to the user describing what you're filtering for.`;
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          system: systemPrompt,
          history: [],
        }),
      });
      if (!response.ok || !response.body) throw new Error(`status ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let raw = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
      // The Edge may return prose around the JSON; extract the first {...} block.
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('no json');
      const parsed = JSON.parse(jsonMatch[0]);
      // Apply
      if (parsed.search) setSearch(parsed.search); else setSearch('');
      if (['any', '7d', '30d', 'year'].includes(parsed.dateFilter)) setDateFilter(parsed.dateFilter);
      else setDateFilter('any');
      setUploaderFilter(parsed.uploaderId || null);
      setTypeFilter(parsed.fileType || null);
      if (['recent', 'name', 'size-desc', 'size-asc'].includes(parsed.sortBy)) setSortBy(parsed.sortBy);
      else setSortBy('recent');
      setResultLimit(typeof parsed.limit === 'number' && parsed.limit > 0 ? parsed.limit : null);
      setAskExplanation(parsed.explanation || '');
    } catch (_err) {
      // Fallback: just treat the query as a substring search.
      setSearch(q);
      setDateFilter('any');
      setUploaderFilter(null);
      setTypeFilter(null);
      setSortBy('recent');
      setResultLimit(null);
      setAskExplanation(`Couldn't parse that as a filter — searching for "${q}" instead.`);
    } finally {
      setAskLoading(false);
    }
  };

  const handleCreateFolderConfirm = () => {
    const name = newFolderName.trim();
    if (!name) return;
    onCreateFolder?.(name, currentFolderId || null);
    setNewFolderName('');
    setCreatingFolder(false);
  };

  const handleRenameConfirm = () => {
    const name = renameDraft.trim();
    if (!name || !renamingFolderId) { setRenamingFolderId(null); return; }
    onRenameFolder?.(renamingFolderId, name);
    setRenamingFolderId(null);
    setRenameDraft('');
  };

  const handleFolderUpload = (fileList) => {
    if (!fileList || !onUploadFolder) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;
    onUploadFolder(files, currentFolderId || null);
  };

  // ─── Recursive tree node ───
  function TreeNode({ folder, depth }) {
    const kids = childrenByParent.get(folder.id) || [];
    const isExpanded = expandedSet.has(folder.id);
    const isActive = currentFolderId === folder.id;
    const docCt = docCountByFolder[folder.id] || 0;
    return (
      <div>
        <div
          onClick={() => setCurrentFolderId(folder.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 28,
            paddingLeft: 12 + depth * 16, paddingRight: 12,
            cursor: 'pointer',
            background: isActive ? 'rgba(10,36,99,0.08)' : 'transparent',
            color: isActive ? 'var(--navy)' : 'var(--text-primary)',
            fontWeight: isActive ? 600 : 400,
            fontSize: 12,
            transition: 'background 100ms',
          }}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
        >
          {kids.length > 0 ? (
            <span
              onClick={(e) => { e.stopPropagation(); toggleExpand(folder.id); }}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, cursor: 'pointer' }}
            >
              <ChevronRight size={11} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 120ms', color: 'var(--text-muted)' }} />
            </span>
          ) : (
            <span style={{ width: 14, display: 'inline-block' }} />
          )}
          <Folder size={13} style={{ color: isActive ? 'var(--navy)' : (folder.isGlobal ? '#9A7A22' : 'var(--text-muted)') }} />
          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {folder.name}
          </span>
          {docCt > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{docCt}</span>
          )}
        </div>
        {isExpanded && kids.map((child) => (
          <TreeNode key={child.id} folder={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  const emptyCopy = currentFolderId
    ? { title: `Nothing in ${currentFolder?.name || 'this folder'} yet`, body: 'Drop a doc here or upload a new one to fill it.' }
    : search
    ? { title: 'No matches', body: 'Try a different term, or clear the search to see everything.' }
    : { title: 'Build your firm’s library', body: 'Drop a folder or upload your first document.' };

  // Grid template depends on whether we're in a folder (no Folder column).
  // At root view, Folder is the primary (leading) column — case-file first
  // mental model. Inside a folder we keep the original 5-col layout.
  const gridCols = currentFolderId
    ? 'minmax(280px, 2fr) 140px 80px 120px 96px'
    : '180px minmax(260px, 2fr) 140px 80px 120px 96px';

  return (
    <div style={{ flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden', background: '#FBFAF7', display: 'flex', flexDirection: 'column' }}>
      {/* Hidden directory picker */}
      <input
        ref={folderUploadRef}
        type="file"
        multiple
        webkitdirectory=""
        directory=""
        style={{ display: 'none' }}
        onChange={(e) => { handleFolderUpload(e.target.files); e.target.value = ''; }}
      />

      {/* Page chrome — Back to chat + breadcrumb-eyebrow */}
      <div style={{ padding: '12px 28px', borderBottom: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', marginLeft: -8, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <ArrowLeft size={13} /> Back to chat
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>YourVault</span>
      </div>

      {/* Body — left rail + main pane.
          Designer note (YourVault mockup):
            • Hero: "Ask across your documents" + subtitle + Upload / New Document on right
            • Big Ask-anything bar centered below hero (replaces the small toolbar input)
            • Step-numbered toolbar: 1. Visualize (List/Grid) · context · 3. Refine · 4. Move hint
            • "Inspect" right rail (selected-doc details) — phased in as a follow-up
              once a `selectedDocId` state is added; the detail strip on row hover
              already conveys the key fields. */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* ── LEFT RAIL: folder tree ── */}
        <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>Library</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
            {/* Pinned: All documents */}
            <div
              onClick={goToAllDocs}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                height: 30, paddingLeft: 16, paddingRight: 12,
                cursor: 'pointer',
                background: currentFolderId === null ? 'rgba(10,36,99,0.08)' : 'transparent',
                color: currentFolderId === null ? 'var(--navy)' : 'var(--text-primary)',
                fontWeight: currentFolderId === null ? 600 : 400,
                fontSize: 12,
                transition: 'background 100ms',
              }}
              onMouseEnter={(e) => { if (currentFolderId !== null) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
              onMouseLeave={(e) => { if (currentFolderId !== null) e.currentTarget.style.background = 'transparent'; }}
            >
              <FolderOpen size={14} style={{ color: currentFolderId === null ? 'var(--navy)' : 'var(--text-muted)' }} />
              <span style={{ flex: 1 }}>All documents</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{counts.total}</span>
            </div>
            {/* Folders eyebrow */}
            <div style={{ padding: '14px 16px 6px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>Folders</div>
            </div>
            {/* Recursive tree */}
            {(childrenByParent.get(null) || []).length === 0 && (
              <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>No folders yet.</div>
            )}
            {(childrenByParent.get(null) || []).map((f) => (
              <TreeNode key={f.id} folder={f} depth={0} />
            ))}
          </div>
          {/* Footer — + new folder */}
          <div style={{ padding: 10, borderTop: '1px solid var(--border)', background: '#fff' }}>
            <button
              onClick={() => setCreatingFolder(true)}
              style={{ width: '100%', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <FolderPlus size={13} /> New folder
            </button>
          </div>
        </div>

        {/* ── MAIN AREA ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Org-Admin scope tabs — kept as a slim strip above the hero so
              role-based filtering is still accessible when the toolbar
              search input moved into the hero. */}
          {isOrgAdmin && (
            <div style={{ padding: '12px 28px 0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0, background: '#FBFAF7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 3, background: '#F0F2F5', borderRadius: 8 }}>
                {[
                  { id: 'all',  label: 'All',      count: counts.total },
                  { id: 'org',  label: 'Org-wide', count: counts.org },
                  { id: 'mine', label: 'Mine',     count: counts.mine },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setScope(t.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                      background: scope === t.id ? '#fff' : 'transparent',
                      color: scope === t.id ? 'var(--navy)' : 'var(--text-muted)',
                      border: 'none', cursor: 'pointer',
                      boxShadow: scope === t.id ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {t.label} <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 2 }}>{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inline create-folder composer */}
          {creatingFolder && (
            <div style={{ padding: '10px 28px', background: '#FBFAF7', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FolderPlus size={14} style={{ color: 'var(--navy)' }} />
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolderConfirm();
                  if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
                }}
                placeholder={currentFolder ? `New folder in ${currentFolder.name}…` : 'New folder name…'}
                style={{ flex: 1, maxWidth: 360, height: 32, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 13, outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
              />
              <button onClick={handleCreateFolderConfirm} disabled={!newFolderName.trim()} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: newFolderName.trim() ? 'var(--navy)' : '#9CA3AF', color: '#fff', fontSize: 12, fontWeight: 500, cursor: newFolderName.trim() ? 'pointer' : 'not-allowed' }}>Create</button>
              <button onClick={() => { setCreatingFolder(false); setNewFolderName(''); }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
            </div>
          )}

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* ─── Hero — "Ask across your documents" ─── */}
            <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 28px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, color: 'var(--navy)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                    {currentFolder ? currentFolder.name : 'Ask across your documents'}
                  </h1>
                  {!currentFolder && (
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.55, maxWidth: 720 }}>
                      YourVault is your firm's AI-powered document library. Ask a question, find what you need, and use the right document in chat.
                    </p>
                  )}
                  {currentFolder && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={goToAllDocs} style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>All folders</button>
                      {breadcrumb.map((f, i) => {
                        const isLast = i === breadcrumb.length - 1;
                        return (
                          <React.Fragment key={f.id}>
                            <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                            {isLast ? (
                              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{f.name}</span>
                            ) : (
                              <button onClick={() => setCurrentFolderId(f.id)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>{f.name}</button>
                            )}
                          </React.Fragment>
                        );
                      })}
                      <span style={{ color: 'var(--text-muted)' }}>· {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}</span>
                    </div>
                  )}
                </div>
                {/* Hero action buttons — Upload (outline) + New Document (navy) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => folderUploadRef.current?.click()}
                    title="Upload a folder — subfolder structure is preserved"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: '#fff', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  >
                    <Upload size={14} /> Upload
                  </button>
                  <button
                    onClick={onCreateNew}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(10,36,99,0.15)' }}
                  >
                    <FileText size={14} /> New Document
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Big Ask-anything bar ─── */}
            <div style={{ maxWidth: 1080, margin: '0 auto', padding: '6px 28px 14px' }}>
              <div style={{
                position: 'relative',
                border: '1.5px solid rgba(201,168,76,0.45)',
                borderRadius: 14, background: '#fff',
                padding: '14px 18px',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <Sparkles size={18} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    value={askQuery || search}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAskQuery(v);
                      setSearch(v);
                      if (resultLimit) setResultLimit(null);
                      if (askExplanation) setAskExplanation('');
                      if (sortBy !== 'recent') setSortBy('recent');
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAskAnything(); }}
                    disabled={askLoading}
                    placeholder="Ask the vault or search documents…"
                    style={{ width: '100%', height: 24, border: 'none', outline: 'none', fontSize: 15, color: 'var(--text-primary)', background: 'transparent', fontFamily: "'DM Sans', sans-serif" }}
                  />
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    e.g., "find indemnification clauses across Acme contracts"
                  </div>
                </div>
                <kbd style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  padding: '4px 8px', borderRadius: 6,
                  border: '1px solid var(--border)', background: '#FBFAF7',
                  fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  flexShrink: 0,
                }}>⌘K</kbd>
              </div>
            </div>

            {/* ─── Step-numbered toolbar — 1. Visualize · context · 3. Refine · 4. Move ─── */}
            <div style={{
              maxWidth: 1080, margin: '0 auto', padding: '0 28px 14px',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              {/* 1. Visualize — List/Grid toggle (visual only — list is the default render) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", letterSpacing: '0.06em' }}>1. Visualize</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: 0, borderRadius: 10, border: '1px solid var(--border)', background: '#fff', overflow: 'hidden' }}>
                  <button style={{
                    padding: '7px 14px', fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500, background: 'var(--navy)', color: '#fff',
                    border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    List
                  </button>
                  <button style={{
                    padding: '7px 14px', fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500, background: '#fff', color: 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    Grid
                  </button>
                </div>
              </div>

              {/* Context: "{N} docs in {folder}" */}
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {filteredDocs.length} {filteredDocs.length === 1 ? 'doc' : 'docs'}{currentFolder ? ` in ${currentFolder.name}` : ''}
              </span>

              <div style={{ flex: 1 }} />

              {/* 3. Refine — single dropdown collapsing the existing chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", letterSpacing: '0.06em' }}>3. Refine</span>
                <button
                  onClick={() => setOpenFilterMenu(openFilterMenu === 'refine' ? null : 'refine')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 10,
                    border: '1px solid var(--border)', background: '#fff',
                    fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                    color: 'var(--text-primary)', cursor: 'pointer',
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 14, height: 14,
                  }}>
                    <Search size={12} />
                  </span>
                  Refine
                  <ChevronRight size={12} style={{ transform: openFilterMenu === 'refine' ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms', color: 'var(--text-muted)' }} />
                </button>
              </div>

              {/* 4. Move — drag-to-chat affordance hint */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", letterSpacing: '0.06em' }}>4. Move</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 10,
                  border: '1px dashed var(--border)', background: '#FBFAF7',
                  fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                  color: 'var(--text-muted)',
                }}>
                  <FileText size={12} />
                  Drag a doc into chat
                </span>
              </div>
            </div>

            {/* Ask-anything callout — shows the model's interpretation
                of the NL query the user typed in the toolbar. Triggered
                from the toolbar input's Enter / "Ask ✨" button, not a
                duplicate input down here. */}
            {askExplanation && (
              <div style={{ maxWidth: 1080, margin: '0 auto', padding: '4px 28px 8px' }}>
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', fontSize: 13, color: '#7A5C0A', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{askExplanation}</span>
                  <button onClick={() => { clearAllFilters(); }} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 500, color: '#7A5C0A', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}>Clear</button>
                </div>
              </div>
            )}

            {/* ─── Filter chips row (P8 — Date / Uploader / Type / Sort) ───
                Designer mockup: filters live behind the "3. Refine" dropdown.
                The chips are revealed when openFilterMenu === 'refine' and
                hidden otherwise so the toolbar above stays uncluttered. */}
            {openFilterMenu === 'refine' && (
            <div style={{ maxWidth: 1080, margin: '0 auto', padding: '4px 28px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Date */}
              <FilterChip
                icon={Calendar}
                label="Date"
                value={({ any: 'Any time', '7d': 'Past 7 days', '30d': 'Past 30 days', year: 'This year' })[dateFilter]}
                isActive={dateFilter !== 'any'}
                isOpen={openFilterMenu === 'date'}
                onToggle={() => setOpenFilterMenu(openFilterMenu === 'date' ? null : 'date')}
                onClose={() => setOpenFilterMenu(null)}
                options={[
                  { id: 'any',  label: 'Any time' },
                  { id: '7d',   label: 'Past 7 days' },
                  { id: '30d',  label: 'Past 30 days' },
                  { id: 'year', label: 'This year' },
                ]}
                selectedId={dateFilter}
                onPick={(id) => { setDateFilter(id); setOpenFilterMenu(null); }}
              />
              {/* Uploader */}
              <FilterChip
                icon={User}
                label="Uploaded by"
                value={uploaderFilter ? (docOwners.find((o) => o.id === uploaderFilter)?.name || 'Member') : 'Anyone'}
                isActive={!!uploaderFilter}
                isOpen={openFilterMenu === 'uploader'}
                onToggle={() => setOpenFilterMenu(openFilterMenu === 'uploader' ? null : 'uploader')}
                onClose={() => setOpenFilterMenu(null)}
                options={[
                  { id: null, label: 'Anyone', count: visibleDocs.length },
                  ...docOwners.map((o) => ({ id: o.id, label: o.name, count: o.count })),
                ]}
                selectedId={uploaderFilter}
                onPick={(id) => { setUploaderFilter(id); setOpenFilterMenu(null); }}
              />
              {/* Type */}
              <FilterChip
                icon={FileText}
                label="Type"
                value={typeFilter ? typeFilter.toUpperCase() : 'Any'}
                isActive={!!typeFilter}
                isOpen={openFilterMenu === 'type'}
                onToggle={() => setOpenFilterMenu(openFilterMenu === 'type' ? null : 'type')}
                onClose={() => setOpenFilterMenu(null)}
                options={[
                  { id: null,   label: 'Any type' },
                  { id: 'pdf',  label: 'PDF' },
                  { id: 'docx', label: 'DOCX' },
                  { id: 'xlsx', label: 'XLSX' },
                  { id: 'txt',  label: 'TXT' },
                ]}
                selectedId={typeFilter}
                onPick={(id) => { setTypeFilter(id); setOpenFilterMenu(null); }}
              />
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  style={{ padding: '6px 10px', borderRadius: 999, border: '1px dashed var(--border)', background: 'transparent', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <X size={11} /> Clear filters
                </button>
              )}
              {resultLimit && (
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: 'rgba(10,36,99,0.06)', color: 'var(--navy)', fontSize: 11, fontWeight: 500 }}>
                  Top {resultLimit}
                </span>
              )}
            </div>
            )}

            {/* Documents table */}
            <div style={{ maxWidth: 1080, margin: '0 auto', padding: '8px 28px 48px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", marginBottom: 8 }}>
                {currentFolderId ? 'Documents in this folder' : 'All documents'}
              </div>

              {filteredDocs.length === 0 ? (
                <div style={{ padding: '64px 24px', textAlign: 'center', borderRadius: 12, border: '1px dashed var(--border)', background: '#fff' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ice-warm)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <FolderOpen size={26} style={{ color: 'var(--navy)' }} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)' }}>{emptyCopy.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>{emptyCopy.body}</div>
                  {!search && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                      <button onClick={() => folderUploadRef.current?.click()} style={{ padding: '8px 14px', borderRadius: 8, background: '#fff', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer' }}>Upload folder</button>
                      <button onClick={onCreateNew} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer' }}>+ Document</button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {/* Header row */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: gridCols,
                    alignItems: 'center', height: 36,
                    padding: '0 16px', gap: 12,
                    fontSize: 10, color: 'var(--text-muted)',
                    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border)',
                    background: '#FAFBFC',
                  }}>
                    {!currentFolderId && <div>Folder</div>}
                    <div>Name</div>
                    <div>Owner</div>
                    <div style={{ textAlign: 'right' }}>Size</div>
                    <div>Modified</div>
                    <div></div>
                  </div>
                  {/* Body rows */}
                  {filteredDocs.map((d) => {
                    const isOwner = d.ownerId === currentUserId;
                    const canEdit = isOrgAdmin || isOwner || !d.ownerId;
                    const ownerLabel = d.isGlobal ? 'Org-wide' : (isOwner ? 'You' : (d.ownerName || 'Member'));
                    const ownerColor = d.isGlobal ? '#9A7A22' : (isOwner ? 'var(--navy)' : 'var(--text-secondary)');
                    const docFolder = d.folderId ? visibleFolders.find((f) => f.id === d.folderId) : null;
                    const isMenuOpen = openMenuFor === d.id;
                    const isDocActive = activeDocument?.id === d.id;
                    return (
                      <div
                        key={d.id}
                        style={{
                          display: 'grid', gridTemplateColumns: gridCols,
                          alignItems: 'center', height: 56,
                          padding: '0 16px', gap: 12,
                          borderBottom: '1px solid #EEF0F3',
                          fontSize: 13,
                          cursor: onSelect ? 'pointer' : 'default',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(10,36,99,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        onClick={() => { if (onSelect) onSelect(d); }}
                      >
                        {/* FOLDER (primary, bold — case-file mental model) */}
                        {!currentFolderId && (
                          <div style={{ minWidth: 0 }}>
                            {docFolder ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setCurrentFolderId(docFolder.id); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}
                              >
                                <Folder size={13} /> {docFolder.name}
                              </button>
                            ) : (
                              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>—</span>
                            )}
                          </div>
                        )}
                        {/* NAME */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <File size={15} style={{ color: d.isGlobal ? '#9A7A22' : 'var(--navy)' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {d.name}
                              {d.addedFromChat && <span style={{ marginLeft: 6, fontSize: 10, fontStyle: 'italic', color: 'var(--text-muted)', fontWeight: 400 }}>· from chat</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.fileName}</div>
                          </div>
                        </div>
                        {/* OWNER */}
                        <div style={{ fontSize: 12, color: ownerColor, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ownerLabel}</div>
                        {/* SIZE */}
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{d.fileSize || '—'}</div>
                        {/* MODIFIED */}
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.createdAt}</div>
                        {/* ACTIONS */}
                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          {onSelect && (
                            <button
                              onClick={() => onSelect(d)}
                              style={{ padding: '4px 10px', borderRadius: 6, background: isDocActive ? '#5CA868' : 'var(--navy)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                            >
                              {isDocActive ? 'Active' : 'Use'}
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => setOpenMenuFor(isMenuOpen ? null : d.id)}
                              title="More"
                              style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', borderRadius: 4 }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.06)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                            >
                              <MoreVertical size={14} style={{ color: 'var(--text-muted)' }} />
                            </button>
                          )}
                          {isMenuOpen && (
                            <>
                              <div onClick={() => setOpenMenuFor(null)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                              <div style={{ position: 'absolute', top: 30, right: 0, minWidth: 180, background: '#fff', borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 31, overflow: 'hidden' }}>
                                <button onClick={() => { onEdit?.(d); setOpenMenuFor(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                                  <Edit3 size={12} /> Edit
                                </button>
                                {isOrgAdmin && (
                                  <button onClick={() => { onToggleGlobal?.(d.id, !d.isGlobal); setOpenMenuFor(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                                    <Share2 size={12} /> {d.isGlobal ? 'Make personal' : 'Share org-wide'}
                                  </button>
                                )}
                                <div style={{ borderTop: '1px solid var(--border)' }} />
                                <button onClick={() => { onDelete?.(d.id); setOpenMenuFor(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', fontSize: 12, color: '#C65454', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(198,84,84,0.06)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Edit / Create Document Modal ─────────────────── */
function EditDocumentModal({ document: docItem, onClose, onSave, folders = [], defaultFolderId = null }) {
  const isNew = !docItem;
  const [name, setName] = useState(docItem?.name || '');
  const [description, setDescription] = useState(docItem?.description || '');
  const [fileName, setFileName] = useState(docItem?.fileName || '');
  const [fileSize, setFileSize] = useState(docItem?.fileSize || '');
  const [folderId, setFolderId] = useState(docItem?.folderId ?? defaultFolderId ?? '');
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
      folderId: folderId || null,
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
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Folder</label>
            <select
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value || null)}
              style={{ ...inputStyle, cursor: 'pointer', backgroundColor: 'white' }}
            >
              <option value="">Uncategorised (no folder)</option>
              {(() => {
                // Render the folder list as a depth-indented path so a
                // user can pick a nested folder unambiguously. Walks
                // each folder's parent chain to compute its depth and
                // its full path (e.g. "Contracts / Acme Corp / MSA").
                const byId = new Map(folders.map((f) => [f.id, f]));
                const depthOf = (f) => {
                  let d = 0; let cur = f; let guard = 0;
                  while (cur?.parentId && guard++ < 32) { cur = byId.get(cur.parentId); d++; }
                  return d;
                };
                const pathOf = (f) => {
                  const trail = []; let cur = f; let guard = 0;
                  while (cur && guard++ < 32) { trail.unshift(cur.name); cur = cur.parentId ? byId.get(cur.parentId) : null; }
                  return trail.join(' / ');
                };
                // Stable order: depth-first, parent before children.
                const sorted = [];
                const visit = (parent) => {
                  folders.filter((f) => (f.parentId || null) === parent).forEach((f) => {
                    sorted.push(f); visit(f.id);
                  });
                };
                visit(null);
                return sorted.map((f) => {
                  const depth = depthOf(f);
                  const indent = '    '.repeat(depth);
                  return (
                    <option key={f.id} value={f.id} title={pathOf(f)}>
                      {indent}{depth > 0 ? '↳ ' : ''}{f.name}
                    </option>
                  );
                });
              })()}
            </select>
          </div>

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
function AttachMenu({ activePack, activeDocument, activeFolder, folderDocCount, onClose, onAttachFiles, onOpenKnowledgePacks, onOpenDocumentVault, onOpenDocumentVaultForFolder, onClearPack, onClearDocument, onClearFolder }) {
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
          label={activeDocument ? `Doc: ${activeDocument.name}` : 'YourVault'}
          subtitle={activeDocument ? 'Attached as context' : 'Select a saved document'}
          onClick={onOpenDocumentVault}
          active={!!activeDocument}
          onRemove={onClearDocument}
        />

        <MenuItem
          icon={Folder}
          label={activeFolder ? `Folder: ${activeFolder.name}` : 'Folder from Vault'}
          subtitle={activeFolder
            ? `${folderDocCount} ${folderDocCount === 1 ? 'document' : 'documents'} attached as context`
            : 'Attach a whole folder of saved docs'}
          onClick={onOpenDocumentVaultForFolder}
          active={!!activeFolder}
          onRemove={onClearFolder}
        />
      </div>
    </>
  );
}

/* ─────────────────── Top Nav ─────────────────── */
function TopNav({ onOpenSidebar }) {
  return (
    <div className="px-3 sm:px-4 md:px-6" style={{ height: 50, minHeight: 50, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-1 rounded-lg"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>
        {/* Small wordmark on top-left (desktop) */}
        <span className="hidden md:inline-flex" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, letterSpacing: '-0.01em' }}>
          <span style={{ color: 'var(--navy)' }}>Your</span><span style={{ color: '#C9A84C' }}>AI</span>
        </span>
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
  // Legacy: older runs persisted as chat messages. New runs live in the
  // right-docked Run Panel, not the chat thread. We skip rendering
  // sender:'workflow' bubbles so old threads don't surface ghost cards.
  if (msg.sender === 'workflow') return null;

  // Upload-added inline note (additive-upload strategy) — looks like a
  // system note but carries a real "Start a new chat" button. The
  // button dispatches a window event that ChatView listens for at the
  // top level so MessageBubble doesn't need a callback prop.
  if (msg.isUploadAddedNote) {
    // Truncate filename with ellipsis but keep the full name on hover
    // (long PDF names like "[#AULP-4] KFC SPWA _ AMR Login..." were
    // overflowing the pill and pushing the action onto a second line).
    const fullName = msg.uploadedFileName || 'doc';
    const displayName = fullName.length > 38 ? fullName.slice(0, 35) + '…' : fullName;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, marginTop: -8 }}>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '7px 14px 7px 12px', borderRadius: 999,
            background: '#F0F3F6', border: '1px solid #D6DDE4',
            maxWidth: '90%',
          }}
        >
          {/* Doc icon tile — small navy chip, separates icon from text */}
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'rgba(10,36,99,0.08)', flexShrink: 0 }}>
            <File size={12} style={{ color: '#0A2463' }} />
          </span>
          {/* Body — single line, ellipsised */}
          <span
            title={fullName}
            style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 480 }}
          >
            <strong style={{ fontWeight: 600 }}>{displayName}</strong>
            <span style={{ color: '#5B6877', fontWeight: 400 }}>
              {msg.uploadedDocIndex ? ` · Document ${msg.uploadedDocIndex}` : ''}
            </span>
          </span>
          {/* Vertical divider */}
          <span style={{ width: 1, height: 14, background: '#C5CDD7', flexShrink: 0 }} />
          {/* Action — sits inline on the right, no wrap */}
          <button
            onClick={() => { try { window.dispatchEvent(new CustomEvent('yourai:start-new-chat')); } catch { /* ignore */ } }}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 500, color: '#0A2463', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            New topic? Start fresh →
          </button>
        </div>
      </div>
    );
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

// ─── Search-Within scope options — visual scope switch on the chat input ──
// The dropdown rendered by the chat input. Three options, each with a
// one-line description ("scope abstraction" was unclear without one).
// Selecting an option only sets `searchScope` state; the underlying
// retrieval pipeline is unchanged (attached chat files still fastest path,
// vault / workspaces are visual-only — selecting them just updates the
// "Current search:" breadcrumb).
const SCOPE_OPTIONS = [
  { id: 'files',      label: 'File Search', icon: Search,   sub: 'Attached files in this chat · fastest, most precise' },
  { id: 'vault',      label: 'YourVault',   icon: Database, sub: 'Firm document library across matters' },
  { id: 'workspaces', label: 'Workspaces',  icon: FolderOpen, sub: 'Shared workspace knowledge you can access' },
];

function getScopeOption(id) {
  return SCOPE_OPTIONS.find((s) => s.id === id) || SCOPE_OPTIONS[0];
}

// ─── SearchScopePill — collapsed scope chip + dropdown ───
// Used in both empty-state and populated-chat input rows. The dropdown
// renders a "SEARCH WITHIN" header and three options, each with an icon
// + label + one-line subtitle. Per designer note: "Source dropdown is a
// scope switch, not another start point."
//
// Picking "YourVault" fires `onPickVault()` to open the doc-picker modal
// WITHOUT pre-committing scope='vault' — the parent commits scope only
// when the user actually attaches a doc. (Closing the modal without a
// pick reverts to the previous scope.) Same logic for "Workspaces".
function SearchScopePill({ scope, isOpen, setIsOpen, setScope, scopeRef, openUpward = true, compact = false, onPickVault, onPickWorkspaces }) {
  const current = getScopeOption(scope);
  const CurrentIcon = current.icon;
  return (
    <div style={{ position: 'relative', flexShrink: 0 }} ref={scopeRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        title="Search within"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: compact ? '5px 10px' : '6px 12px', borderRadius: 999,
          fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
          border: '1px solid var(--border)', backgroundColor: '#fff',
          color: 'var(--navy)', cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all 150ms ease',
        }}
      >
        <CurrentIcon size={13} style={{ flexShrink: 0 }} />
        <span>{current.label}</span>
        <ChevronDown size={12} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
      </button>
      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{
            position: 'absolute',
            ...(openUpward ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
            left: 0, width: 290, backgroundColor: '#fff', borderRadius: 14,
            border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
            zIndex: 51, overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px 6px',
              fontSize: 10, color: 'var(--text-muted)',
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>Search within</div>
            {SCOPE_OPTIONS.map((opt) => {
              const isCurrent = opt.id === scope;
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    setIsOpen(false);
                    if (opt.id === 'vault' && onPickVault) {
                      // Don't commit scope until the modal returns with a pick.
                      // The parent commits via setSearchScope('vault') from inside
                      // the modal's "Use in chat" handler.
                      onPickVault();
                      return;
                    }
                    if (opt.id === 'workspaces' && onPickWorkspaces) {
                      onPickWorkspaces();
                      return;
                    }
                    setScope(opt.id);
                  }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 16px', cursor: 'pointer',
                    background: isCurrent ? 'rgba(201, 168, 76, 0.10)' : 'transparent',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                  onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Icon size={15} style={{ color: 'var(--navy)', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>{opt.label}</span>
                      {isCurrent && <Check size={13} style={{ color: 'var(--navy)', flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                      {opt.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
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

function EmptyState() {
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

  // Hero only — input, drop tile and merged icon-pill row are rendered
  // by ChatView's main render below, so they sit inside the same column
  // and pick up the live state (input, attachments, dropdowns) without
  // prop-drilling.
  return (
    <div className="px-4 sm:px-6" style={{ paddingTop: '12vh', paddingBottom: 24 }}>
      <div style={{ maxWidth: 880, width: '100%', margin: '0 auto' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', boxShadow: '0 2px 8px rgba(201, 168, 76, 0.24)' }}>
            <Sparkles size={17} color="#fff" />
          </div>
          <h2
            className="text-5xl sm:text-6xl"
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontWeight: 400,
              color: 'var(--navy)',
              margin: '0 0 10px',
              lineHeight: 1.08,
              letterSpacing: '-0.015em',
            }}
          >
            {getGreeting()}, {currentUserName}
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-muted)', margin: '0 auto', maxWidth: 520, lineHeight: 1.45 }}>
            Start with a question, or add documents for context.
          </p>
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

  // External Users never use the personal chat — their home is their
  // workspace(s). Routing rules:
  //   • 0 workspaces → /chat/workspaces (shows empty state)
  //   • 1 workspace  → /chat/workspaces/<id>  (skip the list, go straight
  //                    to the only room they can use — matches the real
  //                    mental model: the client opens "their matter")
  //   • 2+           → /chat/workspaces (let them pick)
  useEffect(() => {
    if (!isExternalUser) return;
    let visibleWs = [];
    try { visibleWs = listWorkspacesForUser(currentUserId, currentRole) || []; } catch { /* ignore */ }
    // Single-workspace short-circuit — only if we aren't already inside it.
    if (visibleWs.length === 1) {
      const targetPath = `/chat/workspaces/${visibleWs[0].id}`;
      if ((location?.pathname || '') !== targetPath) {
        navigate(targetPath, { replace: true });
      }
      return;
    }
    // Otherwise land on the list
    if (initialView !== 'workspaces') {
      navigate('/chat/workspaces', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExternalUser, initialView, currentUserId, currentRole]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(true);
  // Empty-state viewport tracking: <900 px caps the merged icon-pill row
  // at 4 and pushes the rest into the More-operations overflow; <768 px
  // stacks the input row vertically (source pill → textarea → KP+send).
  const [isNarrow, setIsNarrow] = useState(typeof window !== 'undefined' ? window.innerWidth < 900 : false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const onResize = () => {
      setIsNarrow(window.innerWidth < 900);
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
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
  const [vaultFolders, setVaultFolders] = useState(() => {
    seedFoldersIfEmpty(DEFAULT_DOCUMENT_VAULT_FOLDERS);
    return loadFolders() || DEFAULT_DOCUMENT_VAULT_FOLDERS;
  });
  useEffect(() => { saveFolders(vaultFolders); }, [vaultFolders]);
  const [showDocumentVaultPanel, setShowDocumentVaultPanel] = useState(false);
  // When the panel is opened from the AttachMenu's "Folder from Vault"
  // entry, this flag toggles folder rows into selectable mode (extra
  // "Use" button on each folder tile). Reset to false on panel close.
  const [vaultPanelFolderMode, setVaultPanelFolderMode] = useState(false);
  // Refresh from storage when the panel opens so cross-route uploads show up.
  useEffect(() => {
    if (!showDocumentVaultPanel) return;
    const nextDocs = loadVault();
    if (nextDocs) setDocumentVault(nextDocs);
    const nextFolders = loadFolders();
    if (nextFolders) setVaultFolders(nextFolders);
  }, [showDocumentVaultPanel]);
  const [editingDocument, setEditingDocument] = useState(null);
  const [activeVaultDocument, setActiveVaultDocument] = useState(null);
  // A folder attachment is mutually exclusive with a single-doc
  // attachment — selecting one clears the other. Both feed the same
  // metadata slot in the bot message and the same chip area above the
  // chat input.
  const [activeVaultFolder, setActiveVaultFolder] = useState(null);
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
  // Run Panel — docked to the right of the chat. Shows all active and
  // recently finished workflow runs as a stacked, collapsible list.
  //   runPanelOpen      true   → panel visible
  //   runPanelFocusId   runId? → auto-expand this run on mount (e.g. the
  //                              one just started from PreRunModal)
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [runPanelFocusId, setRunPanelFocusId] = useState(null);
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

  // Poll for running workflows so the sidebar indicator reflects all
  // of them (multiple runs can execute concurrently). Cheap — listRuns
  // is a synchronous localStorage read. 1.5s cadence is enough for a
  // progress strip; the detailed Run Panel subscribes per-run for live
  // tick precision.
  useEffect(() => {
    const tick = () => {
      const running = listRuns().filter((r) => r.status === 'running' && r.userId === currentUserId);
      if (running.length === 0) { setRunningWorkflow(null); return; }
      // Represent the state with the first running run + a count field so
      // the sidebar strip can say "2 workflows running" when appropriate.
      setRunningWorkflow({ ...running[0], _runningCount: running.length });
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runningPrep, currentUserId]);
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
  // Tracks whether the user has explicitly chosen the current intent (via
  // a pill click, dropdown pick, or suggestion-banner accept). When true,
  // the pre-flight find_document promotion and the General-Chat → specific
  // auto-switch in sendMessage are skipped — the user's deliberate choice
  // takes precedence over the keyword detector. Reset only when a new
  // thread starts or the user picks something new. Without this, picking
  // "General Chat" explicitly was silently overridden on send and the
  // collapsed populated-chat pill flipped to a different intent label.
  const [hasManualIntentPick, setHasManualIntentPick] = useState(false);
  const [isIntentDropdownOpen, setIsIntentDropdownOpen] = useState(false);
  const [suggestedIntent, setSuggestedIntent] = useState(null); // Smart suggestion from keyword detection
  const [suggestedIntents, setSuggestedIntents] = useState([]); // Multiple matches for user to pick
  const [dismissedSuggestion, setDismissedSuggestion] = useState(null);
  const suggestionTimer = useRef(null);
  const intentDropdownRef = useRef(null);
  const [streamingContent, setStreamingContent] = useState('');
  // ─── Empty-state Attach / KP / pill-more controls ───
  // The empty-state input has a single "+" attach dropdown that opens a
  // searchable YourVault picker. The earlier "Search my docs" auto-retrieve
  // toggle was removed — users want to find a specific doc and attach it,
  // not toggle an abstract AI search mode. KP dropdown is alongside.
  const [isKpMenuOpen, setIsKpMenuOpen] = useState(false);
  // Search inside the KP / YourVault pickers — both pickers use the same
  // search-first pattern to handle libraries that grow past ~10 items.
  // State is local to each picker (clears on close so re-opening doesn't
  // surface a stale query).
  const [kpQuery, setKpQuery] = useState('');
  const [isVaultAttachOpen, setIsVaultAttachOpen] = useState(false);
  const [vaultAttachQuery, setVaultAttachQuery] = useState('');
  const [isEmptyMoreOpen, setIsEmptyMoreOpen] = useState(false);
  // ─── Search-Within scope (visual scope switch on the chat input) ───
  // Three options: 'files' (attached chat files — fastest, most precise),
  // 'vault' (firm document library), 'workspaces' (shared workspace KB).
  // Default is 'files' — the previous one-doc-per-chat affordance is
  // still wired through `pendingAttachments` + `activeVaultDocument`.
  // Selecting `vault` or `workspaces` is a UI scope switch only — no new
  // retrieval pipeline is wired (the previous `vaultScopeContext` token-
  // overlap branch is intentionally not reintroduced).
  const [searchScope, setSearchScope] = useState('files');
  // Each SearchScopePill instance gets its own open/close state so two
  // popovers can't render at once (e.g. the input-box pill and the
  // Optional-row pill both visible side-by-side). The shared `searchScope`
  // state still drives both pills' label.
  const [isScopeOpenInput, setIsScopeOpenInput] = useState(false);
  const [isScopeOpenOptional, setIsScopeOpenOptional] = useState(false);
  const scopeInputRef = useRef(null);
  const scopeOptionalRef = useRef(null);
  // ─── Vault doc-picker modal — opened when the user picks "YourVault"
  // from the SearchScopePill dropdown. Shows a searchable list of vault
  // docs with a "Use in chat" CTA per row. Picking sets activeVaultDocument
  // and closes the modal.
  const [isVaultPickerModalOpen, setIsVaultPickerModalOpen] = useState(false);
  const [vaultPickerQuery, setVaultPickerQuery] = useState('');
  // Knowledge Pack picker modal — same modal pattern as the vault picker.
  // Replaces the dropdown popover so the experience is consistent.
  const [isPackPickerModalOpen, setIsPackPickerModalOpen] = useState(false);
  const [packPickerQuery, setPackPickerQuery] = useState('');
  const [isFileDropHover, setIsFileDropHover] = useState(false);
  // Workspace association — kept for the AttachMenu / vault-doc "Use" path
  // and for downstream label-only metadata.
  const [activeWorkspaceForChat, setActiveWorkspaceForChat] = useState(null);
  const kpMenuRef = useRef(null);
  const vaultAttachRef = useRef(null);
  const emptyMoreRef = useRef(null);
  const dropFileInputRef = useRef(null);
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

  // Auto-resize the chat input whenever `input` changes via setInput
  // (programmatic changes don't fire onInput). Caps at 140px maxHeight,
  // matching the textarea's inline cap.
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + 'px';
  }, [input]);

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

  const inputPlaceholder = 'Ask anything about your documents or Alaska law…';

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
    setActiveVaultFolder(null);
    setPendingAttachments([]);
    setInput('');
    setSessionDocContext(null);
    setActiveIntent(DEFAULT_INTENT);
    setHasManualIntentPick(false);
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
  }, [activeThreadId, messages]);

  // Listen for the inline upload-added note's "Start a new chat" click.
  // The note dispatches a window event because MessageBubble is a leaf
  // component and we don't want to thread a callback through every msg.
  useEffect(() => {
    const handler = () => { handleNewThread(); };
    window.addEventListener('yourai:start-new-chat', handler);
    return () => window.removeEventListener('yourai:start-new-chat', handler);
  }, [handleNewThread]);

  // FileResultsCard ("find_document" intent) actions — same window-event
  // pattern as the upload-added note above so we don't thread callbacks
  // through MessageBubble → IntentCard → FileResultsCard.
  useEffect(() => {
    const onUseDoc = (e) => {
      const doc = e?.detail?.doc;
      if (!doc) return;
      // The card row carries a slim shape; resolve back to the full
      // vault entry (with `content`, `sampleUrl`, etc) so handleSelect
      // attaches the real document context to the next send.
      const full = documentVault.find((d) => String(d.id) === String(doc.id)) || doc;
      handleSelectVaultDocument(full);
    };
    const onBrowseVault = () => {
      closeAllPanels();
      setShowDocumentVaultPanel(true);
    };
    window.addEventListener('yourai:vault-use-doc', onUseDoc);
    window.addEventListener('yourai:vault-browse', onBrowseVault);
    return () => {
      window.removeEventListener('yourai:vault-use-doc', onUseDoc);
      window.removeEventListener('yourai:vault-browse', onBrowseVault);
    };
    // handleSelectVaultDocument is referenced lazily inside onUseDoc;
    // including it in deps causes a TDZ error because this useEffect
    // is declared earlier in the component body than the const itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentVault]);

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
    setActiveVaultFolder(null);
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

  // Sidebar Search Chats — hybrid match across title/preview AND message
  // content. Title path stays cheap (no message-store walk); content path
  // only runs when title misses, so the common no-query case is a no-op.
  // Content match attaches a `searchSnippet` (~80 chars centred on the
  // match) so the sidebar row can show *what* matched.
  const filteredThreads = (() => {
    if (!threadSearch) return threads;
    const q = threadSearch.toLowerCase();
    const SNIPPET_CTX = 30; // chars before / after the match
    const SNIPPET_MAX = 80;
    const buildSnippet = (text) => {
      const idx = text.toLowerCase().indexOf(q);
      if (idx < 0) return null;
      const start = Math.max(0, idx - SNIPPET_CTX);
      const end = Math.min(text.length, idx + q.length + SNIPPET_CTX);
      let s = text.slice(start, end).replace(/\s+/g, ' ').trim();
      if (start > 0) s = '…' + s;
      if (end < text.length) s = s + '…';
      return s.length > SNIPPET_MAX ? s.slice(0, SNIPPET_MAX - 1) + '…' : s;
    };
    return threads.reduce((acc, t) => {
      const titleHit = (t.title || '').toLowerCase().includes(q);
      const previewHit = (t.preview || '').toLowerCase().includes(q);
      if (titleHit || previewHit) { acc.push(t); return acc; }
      // Active-thread messages are kept in `messages` state; the per-thread
      // ref lags by one render so we prefer the live state for the active id.
      const msgs = t.id === activeThreadId
        ? messages
        : (threadMessagesRef.current[t.id] || THREAD_MESSAGES[t.id] || []);
      for (const m of msgs) {
        const c = m?.content;
        if (typeof c === 'string' && c.toLowerCase().includes(q)) {
          acc.push({ ...t, searchSnippet: buildSnippet(c) });
          return acc;
        }
      }
      return acc;
    }, []);
  })();

  // Keep per-thread message store in sync as messages change
  useEffect(() => {
    threadMessagesRef.current[activeThreadId] = messages;
  }, [messages, activeThreadId]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if ((!trimmed && pendingAttachments.length === 0) || isTyping) return;

    // ─── Chit-chat + card-intent intercept ───────────────────────────
    // When a user picks a card intent (clause_comparison, risk_assessment,
    // …) and types a chit-chat message ("hi", "how are you", "what can
    // you do") with no document attached, the Edge would force JSON via
    // response_format and emit an empty schema envelope — the card
    // empty-state would then render. That reads as "the bot ignored my
    // hello." User ask: chit-chat warmly and tell me what to upload.
    //
    // Detection — match if EITHER:
    //   (a) the message hits a known chit-chat regex, OR
    //   (b) the message is short (≤ 60 chars) AND contains no document-
    //       analysis verb (analyse / review / summarise / find / compare
    //       / extract / list / search / draft / generate / legal-domain
    //       anchors).
    //
    // When matched + card intent + no doc, we let the LLM write the reply
    // (instead of canned static strings) by:
    //   • flipping `effectiveIntent` to 'general_chat' so the Edge does
    //     NOT force JSON / the card schema, AND
    //   • prepending a context hint to `messageForEdge` telling the LLM
    //     "the user is in {intent} mode but no doc yet — respond
    //     conversationally and remind them what to upload".
    // The user's chat bubble still shows their original message; only the
    // Edge sees the augmented version.
    const CHIT_CHAT_RE = /^(hi+|hey+|hello+|yo+|hola|sup|good\s*(morning|afternoon|evening|night|day)|gm|ga|ge|howdy|greetings?|ok+|okay|thanks?|thank\s*you|thx|ty|cool|nice|got\s*it|how\s*('?s|\s*is|\s*are)\s*(you|it|things|going|life)?|how\s*r\s*u|how\s*you\s*doing|how\s*do\s*you\s*do|whats?\s*up|wassup|what\s*('?s|\s*is)\s*new|tell\s*me\s*about\s*yourself|who\s*are\s*you|what\s*('?s|\s*is)\s*your\s*name|what\s*can\s*you\s*do|what\s*do\s*you\s*do|help|\?+|nice\s*to\s*meet\s*you|pleased\s*to\s*meet\s*you|good\s*to\s*meet\s*you|nm|nothing\s*much|fine|good|great|lol|haha|hmm|umm)[!.,?\s]*$/i;
    const ANALYSIS_VERBS = /\b(analyse|analyze|review|summari[sz]e|summary|find|search|locate|where(\s+is|\s+are)|list|show|compare|comparison|contrast|extract|identify|draft|write|generate|produce|create|build|assess|evaluate|check|audit|examine|inspect|read|process|parse|breakdown|deconstruct|interpret|explain\s+(this|the|that|my|these|those|provision|clause|section|paragraph|terms?)|risk|liability|obligation|provision|clause|paragraph|section|jurisdiction|case|holding|ruling|precedent|citation|memo|report|brief|deadline|timeline|date)\b/i;
    const stripped = trimmed.replace(/[.!?]+$/g, '').trim();
    const isChitChat = CHIT_CHAT_RE.test(stripped)
      || (stripped.length <= 60 && !ANALYSIS_VERBS.test(stripped));
    const hasAnyDoc = pendingAttachments.length > 0
      || !!activeVaultDocument || !!activeVaultFolder
      || !!(sessionDocContext?.docNames || []).length;
    const useChitChatOverride = isChitChat && isCardIntent(activeIntent) && !hasAnyDoc;

    // ─── Dev-only slash commands to preview intent cards with mock data ───
    // /demo-summary, /demo-comparison, /demo-casebrief, /demo-research
    // Lets PM/QA render any card without needing a live backend that
    // returns structured JSON. No LLM round-trip.
    const demoMap = {
      '/demo-summary':    { intent: 'document_summarisation', data: MOCK_SUMMARY_CARD },
      '/demo-comparison': { intent: 'clause_comparison',      data: MOCK_COMPARISON_CARD },
      '/demo-casebrief':  { intent: 'case_law_analysis',      data: MOCK_CASE_BRIEF_CARD },
      '/demo-brief':      { intent: 'case_law_analysis',      data: MOCK_CASE_BRIEF_CARD },
      '/demo-research':   { intent: 'legal_research',         data: MOCK_RESEARCH_BRIEF_CARD },
      '/demo-risk':       { intent: 'risk_assessment',        data: MOCK_RISK_MEMO_CARD },
      '/demo-clauses':    { intent: 'clause_analysis',        data: MOCK_CLAUSE_ANALYSIS_CARD },
      '/demo-timeline':   { intent: 'timeline_extraction',    data: MOCK_TIMELINE_CARD },
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

    // ─── find_document — client-only vault search ──────────────────────
    // Short-circuit before any /api/chat fetch: the FileResultsCard
    // renders entirely from local state. Detection is two-layer — an
    // explicit "Find document" pill AND keyword auto-switch from
    // general_chat (handled below) — so by the time we get here the
    // active intent already reflects user intent.
    const FIND_DOC_TRIGGER_PREFIXES = [
      // Order: longest-first so "where is" beats "where" if we extend.
      'where is the', "where's the", 'where is my', "where's my", 'where is', "where's",
      'do i have any', 'do i have a', 'do i have',
      'show me my', 'show me the', 'show me',
      'list my', 'list the', 'list',
      'what files', 'what docs', 'what documents',
      'search for', 'search my', 'search the', 'search',
      'find my', 'find the', 'find a', 'find any', 'find',
    ];
    const FIND_DOC_TRIGGER_ARTICLES = ['the', 'a', 'an', 'my', 'any'];
    // Noun anchors stripped after the verb so "find file Acme" → "Acme".
    const FIND_DOC_TRIGGER_NOUNS = ['files', 'file', 'docs', 'doc', 'documents', 'document'];
    const stripFindDocTriggers = (msg) => {
      let q = (msg || '').trim().toLowerCase();
      // Drop trailing punctuation so "find Acme MSA?" matches.
      q = q.replace(/[?!.,;:]+$/g, '').trim();
      for (const t of FIND_DOC_TRIGGER_PREFIXES) {
        if (q === t) { q = ''; break; }
        if (q.startsWith(t + ' ')) { q = q.slice(t.length).trim(); break; }
      }
      for (const a of FIND_DOC_TRIGGER_ARTICLES) {
        if (q === a) { q = ''; break; }
        if (q.startsWith(a + ' ')) { q = q.slice(a.length).trim(); break; }
      }
      for (const n of FIND_DOC_TRIGGER_NOUNS) {
        if (q === n) { q = ''; break; }
        if (q.startsWith(n + ' ')) { q = q.slice(n.length).trim(); break; }
      }
      // "called X" / "named X" / "about X" — drop the leading particle.
      for (const p of ['called', 'named', 'titled', 'about', 'for', 'from']) {
        if (q.startsWith(p + ' ')) { q = q.slice(p.length).trim(); break; }
      }
      // Strip trailing vault-context phrases — "find Series B term sheet
      // from my document vault" should search for "series b term sheet".
      // Longest-first so "from my document vault" is consumed before
      // "from my vault" or "from vault".
      const FIND_DOC_TRAILING = [
        'from my document vault', 'from my doc vault', 'from my files',
        'from the document vault', 'from the doc vault',
        'in my document vault', 'in my doc vault',
        'in the document vault', 'in the doc vault',
        'from my documents', 'from my docs', 'from my vault',
        'in my documents', 'in my docs', 'in my vault',
        'from the vault', 'in the vault',
        'in vault', 'in documents', 'in docs', 'in files',
        'from vault', 'from documents', 'from docs',
      ];
      for (const t of FIND_DOC_TRAILING) {
        if (q === t) { q = ''; break; }
        if (q.endsWith(' ' + t)) { q = q.slice(0, q.length - t.length - 1).trim(); break; }
      }
      return q;
    };

    // Pre-flight: if user is in general_chat but the message keyword-matches
    // find_document, auto-switch HERE so the short-circuit below fires.
    // Without this, "find Acme MSA" from general chat would still hit the
    // /api/chat fetch path and the LLM would prose-answer instead of
    // rendering the FileResultsCard.
    // Skipped when the user manually picked General Chat — their explicit
    // choice wins over keyword detection.
    let intentForFind = activeIntent;
    if (!hasManualIntentPick && activeIntent === 'general_chat' && trimmed.length >= 10) {
      const detected = detectIntent(trimmed, 'general_chat');
      if (detected === 'find_document') {
        intentForFind = 'find_document';
        setActiveIntent('find_document');
      }
    }

    if (intentForFind === 'find_document') {
      if (showEmptyState) setShowEmptyState(false);
      const rawQuery = trimmed;
      const q = stripFindDocTriggers(rawQuery);

      // Walk the folder parent chain to build a breadcrumb the user can
      // recognise. Same separator as the EditDocumentModal dropdown.
      const folderById = new Map(vaultFolders.map((f) => [f.id, f]));
      const folderPathFor = (folderId) => {
        if (!folderId) return '';
        const trail = [];
        let cur = folderById.get(folderId);
        let guard = 0;
        while (cur && guard++ < 32) {
          trail.unshift(cur.name);
          cur = cur.parentId ? folderById.get(cur.parentId) : null;
        }
        return trail.join(' › ');
      };

      let matches = [];
      if (q && documentVault.length > 0) {
        matches = documentVault.filter((d) => {
          const name = (d.name || '').toLowerCase();
          const desc = (d.description || '').toLowerCase();
          const fname = (d.fileName || '').toLowerCase();
          const fpath = folderPathFor(d.folderId).toLowerCase();
          return (
            name.includes(q) ||
            desc.includes(q) ||
            fname.includes(q) ||
            (fpath && fpath.includes(q))
          );
        });
      }

      const resultRows = matches.slice(0, 5).map((d) => ({
        id: d.id,
        name: d.name,
        fileName: d.fileName,
        fileSize: d.fileSize,
        createdAt: d.createdAt,
        folderPath: folderPathFor(d.folderId),
        description: d.description,
      }));

      const ts = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const userMsg = {
        id: Date.now(),
        sender: 'user',
        content: rawQuery,
        timestamp: ts,
        attachments: pendingAttachments,
      };
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        content: '',
        intent: 'find_document',
        cardData: {
          query: q,
          rawQuery,
          results: resultRows,
          totalCount: matches.length,
          vaultIsEmpty: documentVault.length === 0,
          queryWasStripped: !q && rawQuery.length > 0,
        },
        timestamp: ts,
        sourceBadge: null,
      };
      setMessages((prev) => [...prev, userMsg, botMsg]);
      setInput('');
      setSuggestedIntent(null);
      setSuggestedIntents([]);
      setDismissedSuggestion(null);
      if (inputRef.current) inputRef.current.style.height = 'auto';
      setPendingAttachments([]);
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
    // Skipped when the user manually picked General Chat from a pill or
    // dropdown — keyword detection would otherwise silently override the
    // deliberate choice and the populated-chat collapsed pill would flip
    // to a different intent label after send (PM-reported regression).
    let effectiveIntent = activeIntent;
    if (!hasManualIntentPick && activeIntent === 'general_chat' && trimmed.length >= 10) {
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

    // ─── Doc-context inlining for the Edge ───
    // The Edge function only sees `body.message` + `body.history` + the
    // intent. The attached files' extracted text doesn't travel there
    // unless we stitch it INTO the message itself. Without this, the
    // Edge sees a bare prompt like "Read this doc" and falls into the
    // MISSING_DOCUMENT_HANDLING branch — telling the user to upload.
    // We compute the merged content here so the Edge fetch and the
    // (legacy) callLLM fallback both have access.
    const allAttachedDocs = (userMsg.attachments || []).filter((a) => a.kind === 'doc' || a.kind === undefined);
    const baseNames = sessionDocContext?.docNames || [];
    const baseContent = sessionDocContext?.content || '';
    const stamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    let mergedDocNames = baseNames.slice();
    let mergedDocContent = baseContent;
    if (allAttachedDocs.length > 0) {
      const newParts = [];
      allAttachedDocs.forEach((doc, idx) => {
        const raw = doc.content || '';
        const docNum = baseNames.length + idx + 1;
        const docLabel = baseNames.length > 0
          ? `Document ${docNum} (added ${stamp}): ${doc.name}`
          : (allAttachedDocs.length > 1 ? `Document ${docNum}: ${doc.name}` : doc.name);
        mergedDocNames.push(doc.name);

        if (!raw) {
          // (a) Extraction not finished yet — acknowledge the attachment so the Edge doesn't think no doc exists.
          newParts.push(`--- ${docLabel} ---\n[File: ${doc.name}] Text extraction is still in progress. Acknowledge that the file is attached and ask the user to either share what they want analyzed, or to wait a moment and re-send.`);
          return;
        }

        const printable = raw.replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F]/g, '');
        const printableRatio = raw.length > 0 ? (printable.length / raw.length) : 1;
        const garbleMatches = raw.match(/[\u25A0-\u25FF\u2600-\u26FF\uFFFD\u2580-\u259F]{2,}/g);
        const garbleCount = garbleMatches ? garbleMatches.reduce((s, m) => s + m.length, 0) : 0;
        const isReadable = raw.length < 50 || (printableRatio > 0.7 && garbleCount <= raw.length * 0.1);
        if (isReadable) {
          const truncated = raw.length > 20000
            ? raw.slice(0, 20000) + '\n[... document truncated at 20,000 characters ...]'
            : raw;
          newParts.push(`--- ${docLabel} ---\n${truncated}`);
        } else {
          newParts.push(`--- ${docLabel} ---\n[File: ${doc.name}] The text content could not be extracted (scanned PDF, image-based, or non-standard encoding).`);
        }
      });
      mergedDocContent = baseContent
        ? baseContent + '\n\n' + newParts.join('\n\n')
        : newParts.join('\n\n');
      const totalCount = mergedDocNames.length;
      setSessionDocContext({
        name: totalCount === 1 ? mergedDocNames[0] : `${totalCount} documents`,
        content: mergedDocContent,
        docCount: totalCount,
        docNames: mergedDocNames,
      });
    }

    // ─── Vault-selection context (Use button on a Doc / Folder) ───
    // These don't go through pendingAttachments — they're set as
    // activeVaultDocument / activeVaultFolder. Without this branch the
    // Edge would think no doc is attached when the user picked one
    // from the vault and asked a question about it.
    let vaultSelectionContext = '';
    if (activeVaultDocument && !mergedDocContent) {
      // Prefer the seeded `content` field — that's the actual extracted
      // text the AI can reason about clause-by-clause. Falls back to
      // name + description for older or user-created vault docs that
      // lack content.
      const fullText = activeVaultDocument.content || '';
      const truncated = fullText.length > 20000
        ? fullText.slice(0, 20000) + '\n[... document truncated at 20,000 characters ...]'
        : fullText;
      const body = truncated || (activeVaultDocument.description || `[Vault document: ${activeVaultDocument.fileName || activeVaultDocument.name}]`);
      vaultSelectionContext = `--- ${activeVaultDocument.name} ---\n${body}`;
    } else if (activeVaultFolder && !mergedDocContent) {
      const folderDocs = documentVault.filter((d) => d.folderId === activeVaultFolder.id);
      // Same upgrade: when a folder is attached, inline each doc's full
      // content (capped per-doc) so the user can ask cross-doc questions
      // across the folder.
      const PER_DOC_CAP = 8000;
      vaultSelectionContext = `--- Folder: ${activeVaultFolder.name} (${folderDocs.length} document${folderDocs.length === 1 ? '' : 's'}) ---\n` +
        folderDocs.map((d) => {
          const txt = (d.content || '').slice(0, PER_DOC_CAP);
          return txt
            ? `\n## ${d.name}\n${txt}${d.content && d.content.length > PER_DOC_CAP ? '\n[... truncated ...]' : ''}`
            : `\n[${d.name}]${d.description ? `: ${d.description}` : ''}`;
        }).join('\n');
    }

    // Final assembly — use whichever context source has content. Precedence:
    //   real uploads (mergedDocContent) → explicit vault Use (vaultSelectionContext).
    // The earlier `vaultScopeContext` token-overlap retrieval is retired
    // (ref: CLAUDE.md gotcha #14). Don't reintroduce; if "search across
    // all my docs" comes back, ship as silent retrieval with citations.
    const effectiveDocContext = mergedDocContent || vaultSelectionContext;

    // (b) When user sends purely an attachment with no typed text, substitute a default question so the Edge guard passes.
    const effectiveQuestion = trimmed || (effectiveDocContext ? 'Please review the attached document(s) and summarise what you find.' : '');
    const docsHeader = effectiveDocContext
      ? `[Documents attached to this conversation]\n${effectiveDocContext}\n\n[User question]\n`
      : '';
    let messageForEdge = (docsHeader + effectiveQuestion).trim();
    // Final Edge intent. When chit-chat fired on a card intent w/ no doc,
    // flip to 'general_chat' so the Edge does NOT force JSON, and prepend
    // a context hint so the LLM knows what the user originally selected.
    let edgeIntent = effectiveIntent;
    if (useChitChatOverride) {
      const intentLabel = getIntentLabel(activeIntent);
      const description = INTENT_DESCRIPTIONS[activeIntent] || '';
      messageForEdge = [
        `[Conversational context: the user has selected "${intentLabel}" mode but has not uploaded a document yet.`,
        description ? `What that mode does: ${description}` : '',
        `Respond to their message warmly and conversationally. In one short sentence, remind them what kind of document or input they should provide to use ${intentLabel}. Keep your reply under 80 words. Do NOT return JSON or a structured card — plain prose only.]`,
        '',
        '[User message]',
        effectiveQuestion,
      ].filter(Boolean).join('\n');
      edgeIntent = 'general_chat';
    }

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

      let edgeError = null;
      try {
        const response = await fetch(`${base}/api/chat`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: activeThreadId,
            message: messageForEdge,
            history,
            intent: edgeIntent,
            sessionId: sessionState.sessionKbSnapshotId,
            sessionDocId: sessionState.sessionDocId,
          }),
        });

        if (!response.ok) {
          const bodyText = await response.text().catch(() => '');
          edgeError = `AI service returned ${response.status}. ${bodyText.slice(0, 160)}`.trim();
        } else if (!response.body) {
          edgeError = 'AI service returned an empty response body.';
        } else {
          usedBackend = true;
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            setStreamingContent(fullContent);
          }
          fullContent += decoder.decode();

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
      } catch (err) {
        // Distinguish user-aborted streams (session guard) from real network errors.
        if (err && (err.name === 'AbortError' || /abort/i.test(String(err.message || '')))) {
          edgeError = null; // silent — user-initiated
        } else {
          edgeError = `Could not reach the AI service: ${err?.message || 'unknown error'}`;
          // eslint-disable-next-line no-console
          console.error('[ChatView] /api/chat fetch failed:', err);
        }
      }

      // If the Edge path didn't produce content, surface the real reason
      // rather than the misleading "No LLM backend available" fallback.
      // The client-side Groq fallback below requires VITE_OPENAI_API_KEY
      // which is never set in production — keeping it as a last resort
      // only for dev environments that configure it deliberately.
      if (!usedBackend) {
        if (!getApiKey()) {
          setIsTyping(false);
          setStreamingContent('');
          const errText = edgeError
            || 'The AI service was unreachable or did not return a response. Please try again in a moment.';
          const errMsg = { id: Date.now() + 1, sender: 'bot', content: errText, timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), sourceBadge: null };
          setMessages((prev) => [...prev, errMsg]);
          return;
        }

        // Build context layers for prioritised answer flow
        const contextLayers = {};

        // Tier 1: User's uploaded documents (from pending attachments with extracted content)
        // Check current message attachments first, then fall back to persisted session doc
        const docsWithContent = (userMsg.attachments || []).filter(a => a.content);
        if (docsWithContent.length > 0) {
          // Additive — when sessionDocContext already exists, the new
          // docs APPEND to it rather than replace. Each new doc gets a
          // labelled "Document N (added HH:MM)" header so the model can
          // distinguish docs uploaded together from docs uploaded later.
          const baseNames = sessionDocContext?.docNames || [];
          const baseContent = sessionDocContext?.content || '';
          const baseCount = baseNames.length;
          const stamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

          const docParts = [];
          const newDocNames = [];
          docsWithContent.forEach((doc, idx) => {
            const rawContent = doc.content || '';
            const printableChars = rawContent.replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F]/g, '');
            const printableRatio = rawContent.length > 0 ? (printableChars.length / rawContent.length) : 1;
            const garbleMatches = rawContent.match(/[\u25A0-\u25FF\u2600-\u26FF\uFFFD\u2580-\u259F]{2,}/g);
            const garbleCount = garbleMatches ? garbleMatches.reduce((s, m) => s + m.length, 0) : 0;
            const hasGarble = garbleCount > rawContent.length * 0.1;
            const isReadable = rawContent.length < 50 || (printableRatio > 0.7 && !hasGarble);
            const idx1 = baseCount + idx + 1;
            const docLabel = baseCount > 0
              ? `Document ${idx1} (added ${stamp}): ${doc.name}`
              : (docsWithContent.length > 1 ? `Document ${idx1}: ${doc.name}` : doc.name);
            newDocNames.push(doc.name);
            if (isReadable) {
              const truncated = rawContent.length > 20000 ? rawContent.slice(0, 20000) + '\n[... document truncated at 20,000 characters ...]' : rawContent;
              docParts.push(`--- ${docLabel} ---\n${truncated}`);
            } else {
              docParts.push(`--- ${docLabel} ---\n[File: ${doc.name}] The text content could not be extracted from this document. It may be a scanned PDF, image-based, or use non-standard encoding.`);
            }
          });

          const docNames = [...baseNames, ...newDocNames];
          const mergedContent = baseContent
            ? baseContent + '\n\n' + docParts.join('\n\n')
            : docParts.join('\n\n');
          const docCount = docNames.length;
          const mergedName = docCount === 1 ? docNames[0] : `${docCount} documents`;

          contextLayers.uploadedDoc = { name: mergedName, content: mergedContent };
          contextLayers.multiDocCount = docCount;
          contextLayers.docNames = docNames;
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
        } else if (activeVaultFolder) {
          // Vault folder selected — concatenate every doc's name + description
          // as a lightweight context payload. Same caveat as a single vault
          // doc: the Edge path doesn't receive raw file content; this is the
          // best-effort metadata layer the client-fallback prompt sees.
          const folderDocs = documentVault.filter((d) => d.folderId === activeVaultFolder.id);
          const summary = folderDocs.map((d) => `[${d.name}]${d.description ? `: ${d.description}` : ''}`).join('\n');
          contextLayers.uploadedDoc = {
            name: `Folder: ${activeVaultFolder.name} (${folderDocs.length} ${folderDocs.length === 1 ? 'doc' : 'docs'})`,
            content: summary,
          };
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
      // When the chit-chat override fired, we sent general_chat to the
      // Edge so the response is prose — skip JSON parsing entirely and
      // store the message under general_chat so downstream filters don't
      // think this was a card response.
      let cardData = null;
      const botIntent = useChitChatOverride ? 'general_chat' : effectiveIntent;
      if (!useChitChatOverride && isCardIntent(effectiveIntent)) {
        cardData = tryParseCardData(fullContent);
      }

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        content: fullContent,
        intent: botIntent,
        cardData,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        knowledgePack: activeKnowledgePack?.name || null,
        vaultDocument: activeVaultDocument?.name || (activeVaultFolder ? `Folder: ${activeVaultFolder.name}` : null),
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
  }, [isTyping, showEmptyState, messages, activeKnowledgePack, activeVaultDocument, pendingAttachments, activeThreadId, sessionState, activeIntent, hasManualIntentPick, documentVault, vaultFolders]);

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
    // ─── Additive uploads (Apr 2026 — replaces DEC-095 Option C) ───
    // The previous policy ("one upload per chat — start a new convo to
    // attach more") created friction Wendy explicitly named in her
    // attorney interview. The LLM handles labelled multi-doc context
    // fine; the gate's value was overstated. New policy: allow uploads
    // mid-thread, label each doc with its index + timestamp in the
    // system prompt so the model can disambiguate, and inject an
    // inline system note in the thread offering a one-click "Start a
    // new chat" escape hatch for users whose new doc is genuinely a
    // new topic.
    const isMidThreadAddition = kind === 'doc' && !!sessionDocContext;
    if (kind === 'doc') {
      setSessionState(prev => ({ ...prev, sessionDocId: prev.sessionDocId || `doc-${Date.now()}` }));
    }
    setPendingAttachments(prev => [...prev, ...newAtts]);
    if (isMidThreadAddition) {
      // Drop the inline notice into the chat thread immediately so
      // the user sees the "new topic? start fresh" affordance before
      // they hit send. The note is a styled system message; clicking
      // its "Start a new chat" link dispatches yourai:start-new-chat,
      // which the top-level listener (handleNewThread) handles.
      const baseCount = sessionDocContext?.docNames?.length || sessionDocContext?.docCount || 0;
      newAtts.forEach((a, i) => {
        const indexLabel = baseCount + i + 1;
        setMessages((prev) => [...prev, {
          id: Date.now() + 0.1 + i * 0.01,
          sender: 'bot',
          isSystemNote: true,
          isUploadAddedNote: true,
          uploadedFileName: a.name,
          uploadedDocIndex: indexLabel,
          content: `Added **${a.name}** as Document ${indexLabel} in this conversation. New topic? **[Start a new chat →]**`,
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          sourceBadge: null,
        }]);
      });
    }

    // ─── Auto-add to YourVault ───────────────────────────────────
    // When a file is attached via chat, persist it to YourVault. The
    // fileName (no separate "Description" — that prompt only fires for
    // direct vault uploads). Dedupe by fileName so re-attaching the same
    // file doesn't create duplicates. We also remember each file's vault
    // entry ID in `vaultIdByFileName` so the extraction step (below) can
    // backfill the `content` field — without that, YourVault-scope search
    // would never find chat-attached docs.
    const vaultIdByFileName = new Map();
    if (kind === 'doc') {
      const createdAt = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const existingByName = new Map(documentVault.map(d => [d.fileName, d.id]));
      const additions = [];
      files.forEach((f, i) => {
        if (existingByName.has(f.name)) {
          vaultIdByFileName.set(f.name, existingByName.get(f.name));
          return;
        }
        const id = Date.now() + 1000 + i;
        vaultIdByFileName.set(f.name, id);
        additions.push({
          id,
          name: f.name,
          description: '',
          fileName: f.name,
          fileSize: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
          createdAt,
          addedFromChat: true,
        });
      });
      if (additions.length > 0) {
        setDocumentVault(prev => [...additions, ...prev]);
      }
    }

    // Track document uploads for usage stats
    if (kind === 'doc') {
      const userEmail = localStorage.getItem('yourai_current_email');
      if (userEmail) files.forEach(() => trackDocUpload(userEmail));
    }
    // Extract text content from doc files using the RAG file parser. Two
    // sinks for the extracted text: (1) `pendingAttachments` so this send
    // can inline it; (2) the matching YourVault entry so future YourVault-
    // scope retrieval can find it. Vault content is only backfilled if the
    // entry didn't already have it (don't overwrite a richer prior copy).
    if (kind === 'doc') {
      files.forEach((file, i) => {
        extractFileText(file).then(({ text }) => {
          setPendingAttachments(prev => prev.map(a =>
            a.id === newAtts[i].id ? { ...a, content: text } : a
          ));
          const vaultId = vaultIdByFileName.get(file.name);
          if (vaultId && text) {
            setDocumentVault(prev => prev.map(d =>
              d.id === vaultId && !d.content ? { ...d, content: text } : d
            ));
          }
        }).catch((err) => {
          console.error('File extraction failed:', err);
          setPendingAttachments(prev => prev.map(a =>
            a.id === newAtts[i].id ? { ...a, content: `[File: ${file.name}] Could not extract text.` } : a
          ));
        });
      });
    }
  };

  const removeAttachment = (id) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSelectVaultDocument = useCallback((doc) => {
    setActiveVaultDocument(doc);
    setActiveVaultFolder(null); // mutually exclusive
    if (sessionDocContext) {
      // Mid-thread: drop the same inline-note affordance as additive uploads
      // so picking a vault doc behaves consistently with attaching a fresh
      // upload — soft "new topic? start a new chat" escape hatch instead of
      // a blocking banner.
      setMessages((prev) => [...prev, {
        id: Date.now() + 0.1,
        sender: 'bot',
        isSystemNote: true,
        isUploadAddedNote: true,
        uploadedFileName: doc.name,
        content: `Used **${doc.name}** from your vault — New topic? **[Start a new chat →]**`,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        sourceBadge: null,
      }]);
    }
  }, [sessionDocContext]);

  // Folder attach: mutually exclusive with single-doc attach.
  // Skip the version-banner gate — folders are a coarser context
  // selection, treated like swapping a Knowledge Pack mid-thread.
  const handleSelectVaultFolder = useCallback((folder) => {
    setActiveVaultFolder(folder);
    setActiveVaultDocument(null);
  }, []);

  const handleCreateVaultFolder = useCallback((name, parentId = null) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const newFolder = {
      id: `fld-${Date.now()}`,
      name: trimmed,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      ownerId: currentUserId,
      ownerName: operator?.name || 'You',
      isGlobal: false,
      parentId: parentId || null,
    };
    setVaultFolders((prev) => [newFolder, ...prev]);
  }, [currentUserId, operator]);

  // Recursive folder upload — walks each File's `webkitRelativePath`,
  // creates a folder for every directory segment that doesn't already
  // exist (parented under `rootParentId` for the topmost segment, then
  // each child folder under the one above it), and adds a VaultDoc for
  // every leaf file with its `folderId` set to the deepest folder.
  // Folders the user already owns are reused by name+parent so a second
  // upload of the same tree merges into the same structure rather than
  // duplicating it.
  const handleUploadVaultFolder = useCallback((files, rootParentId = null) => {
    if (!files || files.length === 0) return;
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const ownerName = operator?.name || 'You';

    setVaultFolders((prevFolders) => {
      // Build a lookup keyed by `${parentId}${name}` → folder id
      // so we can dedupe quickly across rows.
      const byKey = new Map();
      const folders = [...prevFolders];
      folders.forEach((f) => {
        byKey.set(`${f.parentId || ''}${f.name}`, f);
      });

      const ensureFolder = (name, parent) => {
        const key = `${parent || ''}${name}`;
        if (byKey.has(key)) return byKey.get(key).id;
        const newF = {
          id: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          createdAt: today,
          ownerId: currentUserId,
          ownerName,
          isGlobal: false,
          parentId: parent || null,
        };
        folders.unshift(newF);
        byKey.set(key, newF);
        return newF.id;
      };

      // Track each file's resolved leaf folder so we can drop them
      // into the vault in a second setState.
      const fileToFolder = new Map();
      files.forEach((f) => {
        const rel = f.webkitRelativePath || f.name;
        const segments = rel.split('/').filter(Boolean);
        // Last segment is the file name itself — drop it.
        const dirSegments = segments.slice(0, -1);
        let parent = rootParentId || null;
        for (const seg of dirSegments) {
          parent = ensureFolder(seg, parent);
        }
        fileToFolder.set(f, parent);
      });

      // Schedule the doc-add side effect after folders settle.
      setTimeout(() => {
        setDocumentVault((prevDocs) => {
          const seen = new Set(prevDocs.map((d) => `${d.fileName}${d.folderId || ''}`));
          const next = [...prevDocs];
          files.forEach((f, idx) => {
            const folderId = fileToFolder.get(f);
            const fileName = f.name;
            const dedupeKey = `${fileName}${folderId || ''}`;
            if (seen.has(dedupeKey)) return;
            seen.add(dedupeKey);
            next.unshift({
              id: `doc-${Date.now()}-${idx}`,
              name: fileName.replace(/\.[^.]+$/, ''),
              description: '',
              fileName,
              fileSize: f.size ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : '—',
              createdAt: today,
              ownerId: currentUserId,
              ownerName,
              isGlobal: false,
              folderId,
              addedFromChat: false,
            });
          });
          return next;
        });
        const total = files.length;
        setToastMsg(`Uploaded ${total} ${total === 1 ? 'file' : 'files'} with folder structure preserved`);
        setTimeout(() => setToastMsg(''), 3500);
      }, 0);

      return folders;
    });
  }, [currentUserId, operator]);

  const handleRenameVaultFolder = useCallback((folderId, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setVaultFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f)));
    if (activeVaultFolder?.id === folderId) {
      setActiveVaultFolder((prev) => (prev ? { ...prev, name: trimmed } : prev));
    }
  }, [activeVaultFolder]);

  const handleDeleteVaultFolder = useCallback((folderId) => {
    setVaultFolders((prev) => {
      // Re-parent any direct child folders to the deleted folder's
      // parent so the subtree doesn't orphan. Docs inside child folders
      // keep their folderId — they're still findable via the lifted
      // child folder. Docs that were in the *deleted* folder itself
      // get unset (handled in setDocumentVault below).
      const target = prev.find((f) => f.id === folderId);
      const newParent = target?.parentId ?? null;
      return prev
        .filter((f) => f.id !== folderId)
        .map((f) => (f.parentId === folderId ? { ...f, parentId: newParent } : f));
    });
    setDocumentVault((prev) => prev.map((d) => (d.folderId === folderId ? { ...d, folderId: null } : d)));
    if (activeVaultFolder?.id === folderId) setActiveVaultFolder(null);
  }, [activeVaultFolder]);

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

  // Active sidebar item — derived from whichever panel/route is in front.
  // Order matters: full-page panels win over the underlying chat/home.
  // Close every full-page panel + every modal-style panel before opening
  // a new one. Without this, two panels can render at the same time
  // (e.g. Workflows + Knowledge Packs side-by-side) because each
  // open-handler was only zeroing a subset of siblings.
  const closeAllPanels = () => {
    setShowTeamPage(false);
    setShowWorkspacesPanel(false);
    setShowWorkflowsPanel(false);
    setShowPromptPanel(false);
    setShowClientsPanel(false);
    setShowKnowledgePacksPanel(false);
    setShowDocumentVaultPanel(false);
    setEditingWorkflow(null);
  };

  const sidebarActiveKey = (() => {
    if (showTeamPage) return 'invite-team';
    if (showWorkspacesPanel) return 'workspaces';
    if (showWorkflowsPanel || editingWorkflow) return 'workflows';
    if (showDocumentVaultPanel) return 'document-vault';
    if (showKnowledgePacksPanel) return 'knowledge-packs';
    if (showPromptPanel) return 'prompt-templates';
    if (showClientsPanel) return 'clients';
    return 'chat';
  })();

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflowX: 'hidden' }}>
      {idleWarning}
      <Sidebar
        activeKey={sidebarActiveKey}
        onOpenChat={() => { closeAllPanels(); setSidebarOpen(false); navigate('/chat'); }}
        onOpenPromptTemplates={() => { closeAllPanels(); setShowPromptPanel(true); setSidebarOpen(false); }}
        onOpenClients={() => { closeAllPanels(); setShowClientsPanel(true); setSidebarOpen(false); }}
        onOpenKnowledgePacks={() => { closeAllPanels(); setShowKnowledgePacksPanel(true); setSidebarOpen(false); }}
        onOpenDocumentVault={() => { closeAllPanels(); setShowDocumentVaultPanel(true); setSidebarOpen(false); }}
        onOpenInviteTeam={() => { closeAllPanels(); setShowTeamPage(true); setSidebarOpen(false); }}
        onOpenAuditLogs={() => { /* TODO: Part 5+ wires real audit-logs panel */ }}
        onOpenBilling={() => { navigate('/app/billing'); setSidebarOpen(false); }}
        onOpenWorkspaces={() => { closeAllPanels(); navigate('/chat/workspaces'); setShowWorkspacesPanel(true); setSidebarOpen(false); }}
        onOpenWorkflows={() => { closeAllPanels(); setShowWorkflowsPanel(true); setSidebarOpen(false); }}
        workflowCount={workflowCount}
        runningWorkflow={runningWorkflow}
        onViewRunning={() => {
          // Close overlay panels so the chat + run panel are visible,
          // then open the multi-run panel and auto-expand the active run.
          setShowTeamPage(false);
          setShowWorkspacesPanel(false);
          setShowWorkflowsPanel(false);
          setShowPromptPanel(false);
          setShowClientsPanel(false);
          setShowKnowledgePacksPanel(false);
          setShowDocumentVaultPanel(false);
          setSidebarOpen(false);
          setRunPanelFocusId(runningWorkflow?.id || null);
          setRunPanelOpen(true);
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
      {/* Chat main area — hidden when a full-page panel (Team / Workspaces /
          Workflows / Vault / Knowledge Packs / Workflow Builder) is active
          so the sidebar stays visible but the chat UI is replaced. */}
      <div style={{ flex: 1, display: (showTeamPage || showWorkspacesPanel || showWorkflowsPanel || editingWorkflow || showDocumentVaultPanel || showKnowledgePacksPanel) ? 'none' : 'flex', flexDirection: 'column', minWidth: 0 }}>
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
            <EmptyState />
          ) : (
            <div ref={scrollRef} className="px-3 sm:px-4 md:px-10 py-6" style={{ flex: 1, overflowY: 'auto' }}>
              {/* ─── Persistent Conversation Context Header ─── */}
              {/* Shows documents / knowledge packs locked to this conversation.
                  Context is locked once the first message is sent — no add/remove mid-conversation. */}
              {(() => {
                const docNames = sessionDocContext?.docNames || [];
                const hasCtx = docNames.length > 0 || activeKnowledgePack || activeVaultDocument || activeVaultFolder;
                if (!hasCtx) return null;
                const folderDocCount = activeVaultFolder
                  ? documentVault.filter((d) => d.folderId === activeVaultFolder.id).length
                  : 0;
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
                      {activeVaultFolder && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: 'white', border: '1px solid rgba(10,36,99,0.2)', fontSize: 11, fontWeight: 500, color: 'var(--navy)' }}>
                          <Folder size={11} /> {activeVaultFolder.name} · {folderDocCount} {folderDocCount === 1 ? 'doc' : 'docs'}
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

          {/* Chat input area */}
          <div className="px-4 sm:px-6" style={{ background: 'transparent', paddingTop: showEmptyState ? 32 : 12, paddingBottom: 12, maxWidth: 880, width: '100%', marginLeft: 'auto', marginRight: 'auto', boxSizing: 'border-box' }}>
            {/* Active Knowledge Pack / Vault Document / Vault Folder chips */}
            {(activeKnowledgePack || activeVaultDocument || activeVaultFolder) && (() => {
              const folderDocCount = activeVaultFolder
                ? documentVault.filter((d) => d.folderId === activeVaultFolder.id).length
                : 0;
              return (
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
                  {activeVaultFolder && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(10, 36, 99, 0.06)', border: '1px solid rgba(10, 36, 99, 0.25)' }}>
                      <Folder size={13} style={{ color: 'var(--navy)' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--navy)' }}>
                        Using folder: {activeVaultFolder.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({folderDocCount} {folderDocCount === 1 ? 'doc' : 'docs'})</span>
                      </span>
                      <button onClick={() => setActiveVaultFolder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--navy)' }}><X size={13} /></button>
                    </div>
                  )}
                </div>
              );
            })()}

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

            {/* Mid-conversation switch banner removed — a single thread
                can mix intents freely; switching is seamless and only
                affects the next message. */}

            {/* ─── Smart intent suggestion banner (Banner A) ─── */}
            {/* Single intent suggestion */}
            {suggestedIntent && !suggestedIntents.length && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '10px 14px', marginBottom: 6, borderRadius: 12,
                backgroundColor: 'var(--ice-warm)', border: '0.5px solid var(--border)',
                fontSize: 13, color: 'var(--text-secondary)',
              }}>
                <span>Looks like <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getIntentLabel(suggestedIntent)}</strong></span>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => { setActiveIntent(suggestedIntent); setHasManualIntentPick(true); setSuggestedIntent(null); setSuggestedIntents([]); setDismissedSuggestion(null); }}
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
            {suggestedIntents.length >= 2 && (
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
                      onClick={() => { setActiveIntent(m.intentId); setHasManualIntentPick(true); setSuggestedIntents([]); setSuggestedIntent(null); setDismissedSuggestion(null); }}
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

            {showEmptyState ? (
              /* ─── EMPTY-STATE INPUT — designer mockup structure ─────────
                  Big input box with the textarea + send + 3-pill row
                  (Intent / SearchScope / Pack). Status line below ("Using
                  X · Y · Z"), then an "Optional" box with upload + source +
                  pack repeats + a Quick starts row. */
              /* Legacy block (vault attach + KP + send) stays mounted below
                 the new structure but is hidden via `display: none` to keep
                 the existing refs (vaultAttachRef, kpMenuRef) alive without
                 ripping their popovers out of the JSX tree. */
              <>
                {/* ─── Primary input box ─── */}
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  border: '1.5px solid var(--border)', borderRadius: 18, background: '#fff',
                  padding: '14px 16px', boxShadow: '0 2px 12px rgba(10, 36, 99, 0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <textarea
                      ref={inputRef}
                      className="no-focus-ring"
                      value={input}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInput(val);
                        clearTimeout(suggestionTimer.current);
                        if (val.trim().length < 10) { setSuggestedIntent(null); setSuggestedIntents([]); return; }
                        suggestionTimer.current = setTimeout(() => {
                          const allMatches = detectAllIntents(val);
                          const relevant = allMatches.filter(m => m.intentId !== activeIntent && m.intentId !== dismissedSuggestion);
                          if (relevant.length === 0) { setSuggestedIntent(null); setSuggestedIntents([]); return; }
                          if (relevant.length >= 2 && relevant[0].matchCount === relevant[1].matchCount) {
                            const tied = relevant.filter(m => m.matchCount === relevant[0].matchCount);
                            setSuggestedIntents(tied); setSuggestedIntent(null);
                          } else { setSuggestedIntent(relevant[0].intentId); setSuggestedIntents([]); }
                        }, 600);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={inputPlaceholder}
                      rows={1}
                      style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: 'var(--text-primary)', background: 'transparent', resize: 'none', maxHeight: 200, overflowY: 'auto', lineHeight: '1.5', fontFamily: 'inherit', padding: '6px 4px' }}
                      onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
                    />
                    {(() => {
                      const canSend = (input.trim() || pendingAttachments.length > 0) && !isTyping;
                      return (
                        <div onClick={() => canSend && sendMessage(input)} style={{ width: 40, height: 40, borderRadius: '50%', background: canSend ? 'var(--navy)' : '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canSend ? 'pointer' : 'not-allowed', flexShrink: 0, opacity: canSend ? 1 : 0.6, transition: 'background 150ms, opacity 150ms' }}><ArrowUp size={18} color="#fff" /></div>
                      );
                    })()}
                  </div>

                  {/* Divider + 3-pill row (+Attach / Intent / SearchScope / Pack) */}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* + Attach button — opens YourVault picker modal. Restored
                        for direct vault attach access; mirrors the + on populated chat. */}
                    <button
                      onClick={() => setIsVaultPickerModalOpen(true)}
                      title="Attach a document from YourVault"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 12px', borderRadius: 999,
                        fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                        border: activeVaultDocument ? '1px solid var(--navy)' : '1px solid var(--border)',
                        background: activeVaultDocument ? 'rgba(10, 36, 99, 0.06)' : '#fff',
                        color: 'var(--navy)', cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <Plus size={14} />
                      {activeVaultDocument && <span>Attached</span>}
                    </button>

                    {/* Intent dropdown pill (with bucket dot prefix). */}
                    <div style={{ position: 'relative' }} ref={intentDropdownRef}>
                      {(() => {
                        const bucket = getBucketForIntent(activeIntent);
                        const dotColor = bucket ? BUCKET_COLORS[bucket] : 'var(--text-muted)';
                        return (
                          <button
                            onClick={() => setIsIntentDropdownOpen(v => !v)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 8,
                              padding: '8px 14px', borderRadius: 999,
                              fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                              border: '1px solid var(--border)', background: '#fff',
                              color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >
                            {(() => {
                              const Icon = MessageCircle;
                              return <Icon size={14} style={{ color: 'var(--navy)' }} />;
                            })()}
                            <span>{getIntentLabel(activeIntent)}</span>
                            <ChevronDown size={12} style={{ transform: isIntentDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                          </button>
                        );
                      })()}
                      {isIntentDropdownOpen && (
                        <>
                          <div onClick={() => setIsIntentDropdownOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                          <div style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 280,
                            backgroundColor: 'white', borderRadius: 12, border: '1px solid var(--border)',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.14)', zIndex: 51,
                            maxHeight: 420, overflowY: 'auto',
                          }}>
                            {groupIntentsByBucket(INTENTS.map(i => i.id)).map((bucket, bucketIdx) => {
                              const dotColor = BUCKET_COLORS[bucket.label] || 'var(--text-muted)';
                              return (
                                <div key={bucket.label}>
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '12px 14px 6px',
                                    fontSize: 11, color: 'var(--text-primary)', fontWeight: 700,
                                    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                                    letterSpacing: '0.14em', textTransform: 'uppercase',
                                    borderTop: bucketIdx === 0 ? 'none' : '1px solid var(--border)',
                                    background: bucketIdx === 0 ? 'transparent' : 'rgba(10, 36, 99, 0.02)',
                                  }}>
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                                    {bucket.label}
                                  </div>
                                  {bucket.intents.map((intent) => {
                                    const isCurrent = activeIntent === intent.id;
                                    return (
                                      <div
                                        key={intent.id}
                                        onClick={() => { setActiveIntent(intent.id); setHasManualIntentPick(true); setIsIntentDropdownOpen(false); }}
                                        style={{
                                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                          padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                                          color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                                          fontWeight: isCurrent ? 500 : 400,
                                          backgroundColor: isCurrent ? 'rgba(10, 36, 99, 0.04)' : 'transparent',
                                        }}
                                        onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                                        onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                      >
                                        <span>{intent.label}</span>
                                        {isCurrent && <CheckCircle size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                            {INTENT_DESCRIPTIONS[activeIntent] && (
                              <div style={{
                                padding: '10px 14px', borderTop: '1px solid var(--border)',
                                background: 'var(--ice-warm)',
                                fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5,
                              }}>
                                <Info size={11} style={{ display: 'inline', marginRight: 6, color: 'var(--text-muted)', verticalAlign: 'middle' }} />
                                {INTENT_DESCRIPTIONS[activeIntent]}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* SearchScope (File Search ▼) */}
                    <SearchScopePill
                      scope={searchScope}
                      isOpen={isScopeOpenInput}
                      setIsOpen={setIsScopeOpenInput}
                      setScope={setSearchScope}
                      scopeRef={scopeInputRef}
                      openUpward={false}
                      onPickVault={() => setIsVaultPickerModalOpen(true)}
                    />

                    {/* Pack dropdown — pill with name (or "No pack"). The
                        KP popover renders inside this same `position: relative`
                        wrapper so it anchors directly under the pill. */}
                    <div style={{ position: 'relative', flexShrink: 0 }} ref={kpMenuRef}>
                      <button
                        onClick={() => setIsPackPickerModalOpen(true)}
                        title="Pick a Knowledge Pack"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          padding: '8px 14px', borderRadius: 999,
                          fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                          border: '1px solid var(--border)', background: '#fff',
                          color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: 220,
                        }}
                      >
                        <Package size={13} style={{ color: 'var(--navy)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {activeKnowledgePack ? activeKnowledgePack.name : 'Pick a pack'}
                        </span>
                        <ChevronDown size={12} style={{ transform: isKpMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms', flexShrink: 0 }} />
                      </button>
                      {isKpMenuOpen && (() => {
                        const q = kpQuery.trim().toLowerCase();
                        const filteredPacks = q
                          ? knowledgePacks.filter(p => `${p.name || ''} ${p.description || ''}`.toLowerCase().includes(q))
                          : knowledgePacks;
                        return (
                          <>
                            <div onClick={() => { setIsKpMenuOpen(false); setKpQuery(''); }} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 280, backgroundColor: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)', zIndex: 51, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 360 }}>
                              {knowledgePacks.length > 5 && (
                                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                                  <input autoFocus type="text" value={kpQuery} onChange={(e) => setKpQuery(e.target.value)} placeholder="Search packs…"
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                                    onClick={(e) => e.stopPropagation()} />
                                </div>
                              )}
                              <div style={{ flex: 1, overflowY: 'auto' }}>
                                <div onClick={() => { setActiveKnowledgePack(null); setIsKpMenuOpen(false); setKpQuery(''); }}
                                  style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>No pack</span>
                                  {!activeKnowledgePack && <Check size={13} style={{ color: 'var(--navy)', marginLeft: 'auto' }} />}
                                </div>
                                {knowledgePacks.length === 0 ? (
                                  <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>No knowledge packs yet.</div>
                                ) : filteredPacks.length === 0 ? (
                                  <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>No packs match "{kpQuery}".</div>
                                ) : (
                                  filteredPacks.map((pack) => {
                                    const isCurrent = activeKnowledgePack?.id === pack.id;
                                    return (
                                      <div key={pack.id}
                                        onClick={() => { handleSelectKnowledgePack(pack); setIsKpMenuOpen(false); setKpQuery(''); }}
                                        style={{ padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: isCurrent ? 'var(--navy)' : 'var(--text-secondary)', fontWeight: isCurrent ? 500 : 400 }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                        <Package size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pack.name}</span>
                                        {isCurrent && <Check size={12} style={{ color: 'var(--navy)', marginLeft: 'auto', flexShrink: 0 }} />}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                              <div onClick={() => { setIsKpMenuOpen(false); setKpQuery(''); closeAllPanels(); setShowKnowledgePacksPanel(true); }}
                                style={{ padding: '8px 14px', cursor: 'pointer', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', flexShrink: 0 }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                Manage knowledge packs →
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* ─── Status line: "Using {intent} · {scope} · {pack} pack" ─── */}
                <div style={{
                  textAlign: 'center', marginTop: 14, fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif", color: 'var(--text-muted)',
                }}>
                  Using <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getIntentLabel(activeIntent)}</span>
                  {' · '}
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getScopeOption(searchScope).label}</span>
                  {activeKnowledgePack && (
                    <>
                      {' · '}
                      <span style={{ color: '#C9A84C', fontWeight: 500 }}>{activeKnowledgePack.name} pack</span>
                    </>
                  )}
                </div>

                {/* ─── Optional box: Upload + Source + Pack repeats + Quick starts ─── */}
                <div style={{
                  marginTop: 14,
                  border: '1px solid var(--border)', borderRadius: 14, background: '#fff',
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: 'var(--text-muted)', fontWeight: 600,
                    }}>Optional</span>

                    <button
                      onClick={() => dropFileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 10px', borderRadius: 8,
                        fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                        background: 'transparent', border: 'none', color: 'var(--text-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      <Upload size={14} style={{ color: 'var(--navy)' }} /> Upload files
                    </button>

                    <span style={{ width: 1, height: 16, background: 'var(--border)' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Source:</span>
                      <SearchScopePill
                        scope={searchScope}
                        isOpen={isScopeOpenOptional}
                        setIsOpen={setIsScopeOpenOptional}
                        setScope={setSearchScope}
                        scopeRef={scopeOptionalRef}
                        openUpward={false}
                        compact
                        onPickVault={() => setIsVaultPickerModalOpen(true)}
                      />
                    </div>

                    <span style={{ width: 1, height: 16, background: 'var(--border)' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pack:</span>
                      <button
                        onClick={() => setIsPackPickerModalOpen(true)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '5px 10px', borderRadius: 999,
                          fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                          border: '1px solid var(--border)', background: '#fff',
                          color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: 200,
                        }}
                      >
                        <Package size={12} style={{ color: 'var(--navy)' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {activeKnowledgePack ? activeKnowledgePack.name : 'No pack'}
                        </span>
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Quick starts row */}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14 }}>
                    <div style={{
                      fontSize: 11, fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10,
                    }}>Quick starts</div>
                    {(() => {
                      // Prefills inlined here (used to use SUGGESTED.find()
                      // by title, but title-string drift was the source of
                      // a regression where the send button stayed disabled
                      // after a Quick Start click — find returned undefined,
                      // setInput never fired, input stayed empty, canSend
                      // false. Inline strings remove that indirection.
                      const QUICK = [
                        {
                          id: 'contract_review',
                          label: 'Review contract',
                          icon: FileSearch,
                          prefill: 'Review this contract and flag any one-sided provisions, unusual liability caps, or missing standard protections I should push back on. Structure your response as: 1) high-risk issues, 2) medium-risk issues, 3) recommended redlines.',
                        },
                        {
                          id: 'document_summarisation',
                          label: 'Summarize',
                          icon: FileText,
                          prefill: 'Summarise this document in three sections: (1) Key obligations and deadlines, (2) Risk areas and ambiguities, (3) Recommended next steps. Keep each section under 100 words.',
                        },
                        {
                          id: 'email_letter_drafting',
                          label: 'Draft email',
                          icon: Mail,
                          prefill: 'Draft a professional email to opposing counsel requesting a seven-day extension on the upcoming deadline. Keep the tone courteous but firm, under 120 words, and include a brief reason tied to document review workload.',
                        },
                      ];
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          {QUICK.map((q) => {
                            const Icon = q.icon;
                            return (
                              <button
                                key={q.id}
                                onClick={() => {
                                  setActiveIntent(q.id);
                                  setHasManualIntentPick(true);
                                  if (q.prefill) {
                                    setInput(q.prefill);
                                    if (inputRef.current) inputRef.current.focus();
                                  }
                                }}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 8,
                                  padding: '8px 14px', borderRadius: 12,
                                  fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                                  border: '1px solid var(--border)', background: '#fff',
                                  color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap',
                                  transition: 'all 150ms ease',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                              >
                                <Icon size={14} style={{ color: 'var(--navy)' }} />
                                {q.label}
                              </button>
                            );
                          })}
                          {/* More — opens an overflow popover listing every
                              intent that isn't a Quick Start. Reuses the
                              existing emptyMoreRef + isEmptyMoreOpen state. */}
                          <div ref={emptyMoreRef} style={{ position: 'relative', marginLeft: 'auto' }}>
                            <button
                              onClick={() => setIsEmptyMoreOpen(v => !v)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '8px 12px', borderRadius: 8,
                                fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                                border: 'none', background: 'transparent', color: 'var(--text-secondary)',
                                cursor: 'pointer', whiteSpace: 'nowrap',
                              }}
                            >
                              More <ChevronRight size={13} style={{ transform: isEmptyMoreOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                            </button>
                            {isEmptyMoreOpen && (() => {
                              const QUICK_IDS = new Set(QUICK.map((q) => q.id));
                              const OVERFLOW = INTENTS.filter((i) => !QUICK_IDS.has(i.id));
                              return (
                                <>
                                  <div onClick={() => setIsEmptyMoreOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                                  <div style={{
                                    position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, width: 280,
                                    backgroundColor: '#fff', borderRadius: 12,
                                    border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
                                    zIndex: 51, maxHeight: 360, overflowY: 'auto',
                                  }}>
                                    {groupIntentsByBucket(OVERFLOW.map((i) => i.id)).map((bucket, bucketIdx) => {
                                      const dotColor = BUCKET_COLORS[bucket.label] || 'var(--text-muted)';
                                      return (
                                        <div key={bucket.label}>
                                          <div style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '12px 14px 6px',
                                            fontSize: 11, color: 'var(--text-primary)', fontWeight: 700,
                                            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                                            letterSpacing: '0.14em', textTransform: 'uppercase',
                                            borderTop: bucketIdx === 0 ? 'none' : '1px solid var(--border)',
                                            background: bucketIdx === 0 ? 'transparent' : 'rgba(10, 36, 99, 0.02)',
                                          }}>
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                                            {bucket.label}
                                          </div>
                                          {bucket.intents.map((intent) => {
                                            const isCurrent = activeIntent === intent.id;
                                            return (
                                              <div
                                                key={intent.id}
                                                onClick={() => { setActiveIntent(intent.id); setHasManualIntentPick(true); setIsEmptyMoreOpen(false); }}
                                                style={{
                                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                  padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                                                  color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                  fontWeight: isCurrent ? 500 : 400,
                                                  background: isCurrent ? 'rgba(10, 36, 99, 0.04)' : 'transparent',
                                                  transition: 'background 100ms',
                                                }}
                                                onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                                                onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                              >
                                                <span>{intent.label}</span>
                                                {isCurrent && <CheckCircle size={13} style={{ color: 'var(--navy)', flexShrink: 0 }} />}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Legacy popovers — kept inside a hidden mount so the existing
                    handlers (vault detach via the row click, vault attach state)
                    don't crash if they're invoked from elsewhere. The visible
                    UI is the new structure above. */}
                <div style={{ display: 'none' }} ref={vaultAttachRef}>
                <div style={{ position: 'relative' }}>
                  {(() => {
                    const isActive = !!activeVaultDocument;
                    return (
                      <button onClick={() => setIsVaultAttachOpen(v => !v)} style={{ display: 'none' }}>
                        <Plus size={14} />
                        {isActive && <span>Attached</span>}
                        <ChevronDown size={12} style={{ transform: isVaultAttachOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      </button>
                    );
                  })()}
                  {isVaultAttachOpen && (() => {
                    const q = vaultAttachQuery.trim().toLowerCase();
                    const filtered = q
                      ? documentVault.filter(d => `${d.name || ''} ${d.description || ''} ${d.fileName || ''}`.toLowerCase().includes(q))
                      : documentVault;
                    return (
                      <>
                        <div onClick={() => { setIsVaultAttachOpen(false); setVaultAttachQuery(''); }} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                        <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, width: 340, backgroundColor: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)', zIndex: 51, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 460 }}>
                          {/* ─── Eyebrow + always-on search input ─── */}
                          <div style={{
                            padding: '10px 14px 4px', flexShrink: 0,
                            fontSize: 10, color: 'var(--text-muted)',
                            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                          }}>
                            From your vault
                          </div>
                          <div style={{ padding: '4px 10px 8px', flexShrink: 0 }}>
                            <input
                              autoFocus
                              type="text"
                              value={vaultAttachQuery}
                              onChange={(e) => setVaultAttachQuery(e.target.value)}
                              placeholder="Search YourVault…"
                              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          {/* ─── Doc list ─── */}
                          <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
                            {activeVaultDocument && (
                              <div
                                onClick={() => { setActiveVaultDocument(null); }}
                                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', background: 'rgba(10, 36, 99, 0.04)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(10, 36, 99, 0.04)'; }}
                              >
                                <X size={12} style={{ color: 'var(--text-muted)' }} />
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Detach <strong style={{ color: 'var(--text-primary)' }}>{activeVaultDocument.name}</strong></span>
                              </div>
                            )}
                            {documentVault.length === 0 ? (
                              <div style={{ padding: '14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>YourVault is empty. Drop a file below to populate it.</div>
                            ) : filtered.length === 0 ? (
                              <div style={{ padding: '14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No documents match "{vaultAttachQuery}".</div>
                            ) : (
                              filtered.map((doc) => {
                                const isCurrent = activeVaultDocument?.id === doc.id;
                                const folder = doc.folderId ? vaultFolders.find(f => f.id === doc.folderId) : null;
                                return (
                                  <div
                                    key={doc.id}
                                    onClick={() => { handleSelectVaultDocument(doc); setIsVaultAttachOpen(false); setVaultAttachQuery(''); }}
                                    style={{ padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: isCurrent ? 'var(--navy)' : 'var(--text-secondary)', fontWeight: isCurrent ? 500 : 400 }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                  >
                                    <File size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                                      {folder && (
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</div>
                                      )}
                                    </div>
                                    {isCurrent && <Check size={12} style={{ color: 'var(--navy)', flexShrink: 0 }} />}
                                  </div>
                                );
                              })
                            )}
                          </div>
                          {/* ─── Footer link ─── */}
                          <div
                            onClick={() => { setIsVaultAttachOpen(false); setVaultAttachQuery(''); closeAllPanels(); setShowDocumentVaultPanel(true); }}
                            style={{ padding: '8px 14px', cursor: 'pointer', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', flexShrink: 0 }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            Open YourVault →
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                </div>
              </>
            ) : (
              /* ─── POPULATED-CHAT INPUT — three-zone layout per designer ─── */
              /* Designer notes: "Primary job: understand what corpus the AI is
                 searching and why" → "Current search:" breadcrumb above the
                 input. "Source dropdown is a scope switch, not another start
                 point" → SearchScopePill on the bottom-left of the input box.
                 "Evidence stays visible: answer + citations + file pills" →
                 attachment chips render above the input (existing block). */
              <>
                {/* Current search breadcrumb — only renders when there is
                    something concrete to surface. The default scope ('files')
                    + zero attachments + no pack would otherwise read as
                    "Current search: attached chat files" while the chat has
                    nothing attached, which lies. */}
                {(() => {
                  const hasAttachments = pendingAttachments.length > 0
                    || !!activeVaultDocument || !!activeVaultFolder
                    || (sessionDocContext?.docNames || []).length > 0;
                  const showBreadcrumb = hasAttachments || !!activeKnowledgePack || searchScope !== 'files';
                  if (!showBreadcrumb) return null;
                  const scopeText = searchScope === 'files'
                    ? 'attached chat files'
                    : getScopeOption(searchScope).label;
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                      marginBottom: 8, paddingLeft: 4,
                      fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: 'var(--text-muted)',
                    }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 14, height: 14, borderRadius: '50%',
                        border: '1.5px solid #C9A84C',
                      }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A84C' }} />
                      </span>
                      <span>Current search:</span>
                      {hasAttachments && (
                        <span style={{ color: '#C9A84C', fontWeight: 500 }}>{scopeText}</span>
                      )}
                      {!hasAttachments && searchScope !== 'files' && (
                        <span style={{ color: '#C9A84C', fontWeight: 500 }}>{scopeText}</span>
                      )}
                      {activeKnowledgePack && (
                        <>
                          {(hasAttachments || searchScope !== 'files') && <span style={{ color: 'var(--text-muted)' }}>·</span>}
                          <span style={{ color: '#C9A84C', fontWeight: 500 }}>{activeKnowledgePack.name}</span>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Input box — flex column (textarea on top, controls row on bottom). */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 10,
                  border: '1.5px solid var(--border)', borderRadius: 18, background: '#fff',
                  padding: '12px 14px',
                }}>
                  <textarea
                    ref={inputRef}
                    className="no-focus-ring"
                    value={input}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInput(val);
                      clearTimeout(suggestionTimer.current);
                      if (val.trim().length < 10) {
                        setSuggestedIntent(null);
                        setSuggestedIntents([]);
                        return;
                      }
                      suggestionTimer.current = setTimeout(() => {
                        const allMatches = detectAllIntents(val);
                        const relevant = allMatches.filter(m => m.intentId !== activeIntent && m.intentId !== dismissedSuggestion);
                        if (relevant.length === 0) { setSuggestedIntent(null); setSuggestedIntents([]); return; }
                        if (relevant.length >= 2 && relevant[0].matchCount === relevant[1].matchCount) {
                          const tied = relevant.filter(m => m.matchCount === relevant[0].matchCount);
                          setSuggestedIntents(tied); setSuggestedIntent(null);
                        } else {
                          setSuggestedIntent(relevant[0].intentId); setSuggestedIntents([]);
                        }
                      }, 600);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={inputPlaceholder}
                    rows={1}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', resize: 'none', maxHeight: 140, overflowY: 'auto', lineHeight: '1.5', fontFamily: 'inherit', padding: '4px 4px' }}
                    onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; }}
                  />

                  {/* Bottom controls row: + attach + scope pill on left, pack + intent + send on right. */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => setIsVaultPickerModalOpen(true)}
                        title="Attach a document from YourVault"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 10px', borderRadius: 999,
                          fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                          border: activeVaultDocument ? '1px solid var(--navy)' : '1px solid var(--border)',
                          background: activeVaultDocument ? 'rgba(10, 36, 99, 0.06)' : '#fff',
                          color: 'var(--navy)', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        <Plus size={13} />
                        {activeVaultDocument && <span>Attached</span>}
                      </button>
                      <SearchScopePill
                        scope={searchScope}
                        isOpen={isScopeOpenInput}
                        setIsOpen={setIsScopeOpenInput}
                        setScope={setSearchScope}
                        scopeRef={scopeInputRef}
                        openUpward={true}
                        onPickVault={() => setIsVaultPickerModalOpen(true)}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Pack pill — visible only when a pack is active. Click opens the existing pack picker. */}
                      {activeKnowledgePack && (
                        <button
                          onClick={() => setIsPackPickerModalOpen(true)}
                          title={activeKnowledgePack.name}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 10px', borderRadius: 999,
                            fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                            border: '1px solid var(--border)', background: '#fff',
                            color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap',
                            maxWidth: 160,
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {activeKnowledgePack.name.length > 12 ? `${activeKnowledgePack.name.slice(0, 12)}…` : activeKnowledgePack.name}
                          </span>
                          <ChevronDown size={12} style={{ flexShrink: 0 }} />
                        </button>
                      )}

                      {/* Intent dropdown — collapsed pill with bucket dot. */}
                      <div style={{ position: 'relative' }} ref={intentDropdownRef}>
                        {(() => {
                          const bucket = getBucketForIntent(activeIntent);
                          const dotColor = bucket ? BUCKET_COLORS[bucket] : 'var(--text-muted)';
                          return (
                            <button
                              onClick={() => setIsIntentDropdownOpen(v => !v)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '5px 12px', borderRadius: 999,
                                fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                                border: '1px solid var(--text-primary)',
                                backgroundColor: 'white', color: 'var(--text-primary)',
                                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                              }}
                            >
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                              {getIntentLabel(activeIntent)}
                              <ChevronDown size={12} style={{ transform: isIntentDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                            </button>
                          );
                        })()}
                        {isIntentDropdownOpen && (
                          <>
                            <div onClick={() => setIsIntentDropdownOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                            <div style={{
                              position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, width: 280,
                              backgroundColor: 'white', borderRadius: 12, border: '1px solid var(--border)',
                              boxShadow: '0 12px 32px rgba(0,0,0,0.14)', zIndex: 51,
                              maxHeight: 420, overflowY: 'auto',
                            }}>
                              {groupIntentsByBucket(INTENTS.map(i => i.id)).map((bucket, bucketIdx) => {
                                const dotColor = BUCKET_COLORS[bucket.label] || 'var(--text-muted)';
                                return (
                                  <div key={bucket.label}>
                                    <div style={{
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      padding: '12px 14px 6px',
                                      fontSize: 11, color: 'var(--text-primary)', fontWeight: 700,
                                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                                      letterSpacing: '0.14em', textTransform: 'uppercase',
                                      borderTop: bucketIdx === 0 ? 'none' : '1px solid var(--border)',
                                      background: bucketIdx === 0 ? 'transparent' : 'rgba(10, 36, 99, 0.02)',
                                    }}>
                                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                                      {bucket.label}
                                    </div>
                                    {bucket.intents.map((intent) => {
                                      const isCurrent = activeIntent === intent.id;
                                      return (
                                        <div
                                          key={intent.id}
                                          onClick={() => { setActiveIntent(intent.id); setHasManualIntentPick(true); setIsIntentDropdownOpen(false); }}
                                          style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                                            color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontWeight: isCurrent ? 500 : 400,
                                            backgroundColor: isCurrent ? 'rgba(10, 36, 99, 0.04)' : 'transparent',
                                            transition: 'background 100ms',
                                          }}
                                          onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                                          onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        >
                                          <span>{intent.label}</span>
                                          {isCurrent && <CheckCircle size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {/* Selected mode subtitle — designer note: "Selected mode must explain how it changes the prompt." */}
                              {INTENT_DESCRIPTIONS[activeIntent] && (
                                <div style={{
                                  padding: '10px 14px', borderTop: '1px solid var(--border)',
                                  background: 'var(--ice-warm)',
                                  fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5,
                                }}>
                                  <Info size={11} style={{ display: 'inline', marginRight: 6, color: 'var(--text-muted)', verticalAlign: 'middle' }} />
                                  {INTENT_DESCRIPTIONS[activeIntent]}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Send button. */}
                      {(() => {
                        const canSend = (input.trim() || pendingAttachments.length > 0) && !isTyping;
                        return (
                          <div onClick={() => canSend && sendMessage(input)} style={{ width: 36, height: 36, borderRadius: '50%', background: canSend ? 'var(--navy)' : '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canSend ? 'pointer' : 'not-allowed', flexShrink: 0, opacity: canSend ? 1 : 0.6, transition: 'background 150ms, opacity 150ms' }}><ArrowUp size={16} color="#fff" /></div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ─── Drop-files tile — persists across the conversation ───
                Files attached via this zone flow through `handleAttachFiles`,
                which: appends to `pendingAttachments` (chip row above the
                input), inlines into the next send's `[Documents attached]`
                header, and auto-saves the file into YourVault so it lives
                in the user's corpus after the chat ends. The chip row
                handles removal via the X button on each pill — no separate
                affordance needed here. */}
            {/* Drop tile — populated chat only. In empty state, the
                "Upload files" affordance lives in the Optional box. */}
            {!showEmptyState && (() => {
              const labelText = pendingAttachments.length > 0
                ? `Add another file (${pendingAttachments.length} attached)`
                : 'Drop files or click to upload';
              return (
              <div
                onClick={() => dropFileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!isFileDropHover) setIsFileDropHover(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsFileDropHover(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsFileDropHover(false);
                  const files = Array.from(e.dataTransfer?.files || []);
                  if (files.length) handleAttachFiles(files, 'doc');
                }}
                style={{
                  marginTop: 8,
                  border: `1px dashed ${isFileDropHover ? 'var(--navy)' : 'var(--border)'}`,
                  borderRadius: 10,
                  background: isFileDropHover ? 'rgba(10, 36, 99, 0.04)' : 'transparent',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'border-color 150ms, background 150ms',
                }}
              >
                <input
                  ref={dropFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx,.ods,.odp,.pages,.numbers,.key,.html,.htm,.xml,.json"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) handleAttachFiles(files, 'doc');
                    e.target.value = '';
                  }}
                />
                <Upload size={13} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif" }}>
                  {labelText}
                </span>
              </div>
              );
            })()}

            {/* Empty-state hidden file input — kept mounted so the "Upload files"
                button inside the Optional box (which calls dropFileInputRef.current?.click())
                still has an input to trigger. */}
            {showEmptyState && (
              <input
                ref={dropFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx,.ods,.odp,.pages,.numbers,.key,.html,.htm,.xml,.json"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) handleAttachFiles(files, 'doc');
                  e.target.value = '';
                }}
              />
            )}

            {/* Merged icon-pill row removed — Quick Starts inside the Optional
                box (rendered up in the empty-state input area) covers the
                primary actions; the remaining intents are reachable via the
                input-box intent dropdown (with verb buckets + descriptions). */}

            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: showEmptyState ? 18 : 6, lineHeight: 1.45 }}>
              YourAI may produce inaccurate information. Always verify critical outputs. <strong>Private &amp; encrypted.</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Workflow Run Panel — docked to the right of the chat.
          Shows progress while a run is active and the report when it
          completes. Hidden by default; opens automatically when a new
          run starts and from the sidebar running-strip. Does not
          overlay — it shrinks the chat area so users can keep chatting
          while the workflow runs. ─── */}
      {runPanelOpen && !showTeamPage && !showWorkspacesPanel && !showWorkflowsPanel && !editingWorkflow && (
        <WorkflowRunPanel
          userId={currentUserId}
          focusRunId={runPanelFocusId}
          onClose={() => { setRunPanelOpen(false); setRunPanelFocusId(null); }}
        />
      )}

      {/* ─── YourVault doc-picker modal — opened when user picks "YourVault"
          from the SearchScopePill on the chat input. Search-first list of
          vault docs; clicking a row pins it via handleSelectVaultDocument
          and closes the modal. ─── */}
      {isVaultPickerModalOpen && (() => {
        const q = vaultPickerQuery.trim().toLowerCase();
        const filtered = q
          ? documentVault.filter((d) => `${d.name || ''} ${d.description || ''} ${d.fileName || ''}`.toLowerCase().includes(q))
          : documentVault;
        return (
          <div
            onClick={() => { setIsVaultPickerModalOpen(false); setVaultPickerQuery(''); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 560, maxHeight: '80vh', background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--navy)', lineHeight: 1.2 }}>Attach from YourVault</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Pick a document to attach to this conversation.</div>
                </div>
                <button onClick={() => { setIsVaultPickerModalOpen(false); setVaultPickerQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>
              {/* Search */}
              <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    autoFocus
                    type="text"
                    value={vaultPickerQuery}
                    onChange={(e) => setVaultPickerQuery(e.target.value)}
                    placeholder="Search YourVault by name, description, or file…"
                    style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border)', paddingLeft: 36, paddingRight: 14, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", background: '#FBFAF7' }}
                  />
                </div>
              </div>
              {/* List */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {documentVault.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    YourVault is empty. Drop a file from the chat to populate it.
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No documents match "{vaultPickerQuery}".
                  </div>
                ) : (
                  filtered.map((doc) => {
                    const isCurrent = activeVaultDocument?.id === doc.id;
                    const folder = doc.folderId ? vaultFolders.find((f) => f.id === doc.folderId) : null;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => { handleSelectVaultDocument(doc); setSearchScope('vault'); setIsVaultPickerModalOpen(false); setVaultPickerQuery(''); }}
                        style={{
                          padding: '12px 24px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 12,
                          borderBottom: '1px solid var(--border)',
                          background: isCurrent ? 'rgba(10, 36, 99, 0.04)' : 'transparent',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                        onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <File size={16} style={{ color: 'var(--navy)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {folder ? `${folder.name} · ` : ''}{doc.description || doc.fileName || '—'}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectVaultDocument(doc); setSearchScope('vault'); setIsVaultPickerModalOpen(false); setVaultPickerQuery(''); }}
                          style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
                        >
                          {isCurrent ? 'Attached' : 'Use in chat'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              {/* Footer link */}
              <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FBFAF7' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {documentVault.length} {documentVault.length === 1 ? 'document' : 'documents'} in YourVault
                </span>
                <button
                  onClick={() => { setIsVaultPickerModalOpen(false); setVaultPickerQuery(''); closeAllPanels(); setShowDocumentVaultPanel(true); }}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--navy)', fontWeight: 500, cursor: 'pointer' }}
                >
                  Open YourVault →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Knowledge Pack picker modal — same modal pattern as the YourVault
          picker. Opens from any pack pill in the chat input rows. Picking
          a pack pins it via handleSelectKnowledgePack and closes. ─── */}
      {isPackPickerModalOpen && (() => {
        const q = packPickerQuery.trim().toLowerCase();
        const filtered = q
          ? knowledgePacks.filter((p) => `${p.name || ''} ${p.description || ''}`.toLowerCase().includes(q))
          : knowledgePacks;
        return (
          <div
            onClick={() => { setIsPackPickerModalOpen(false); setPackPickerQuery(''); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 560, maxHeight: '80vh', background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--navy)', lineHeight: 1.2 }}>Pick a Knowledge Pack</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Attach a curated pack to ground this conversation in a specific playbook.</div>
                </div>
                <button onClick={() => { setIsPackPickerModalOpen(false); setPackPickerQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    autoFocus
                    type="text"
                    value={packPickerQuery}
                    onChange={(e) => setPackPickerQuery(e.target.value)}
                    placeholder="Search packs by name or description…"
                    style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border)', paddingLeft: 36, paddingRight: 14, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", background: '#FBFAF7' }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div
                  onClick={() => { setActiveKnowledgePack(null); setIsPackPickerModalOpen(false); setPackPickerQuery(''); }}
                  style={{
                    padding: '12px 24px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid var(--border)',
                    background: !activeKnowledgePack ? 'rgba(10, 36, 99, 0.04)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (activeKnowledgePack) e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                  onMouseLeave={(e) => { if (activeKnowledgePack) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>No pack</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Use general firm knowledge only.</div>
                  </div>
                  {!activeKnowledgePack && <Check size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />}
                </div>
                {knowledgePacks.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No knowledge packs yet. Open Knowledge Packs to create one.
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No packs match "{packPickerQuery}".
                  </div>
                ) : (
                  filtered.map((pack) => {
                    const isCurrent = activeKnowledgePack?.id === pack.id;
                    return (
                      <div
                        key={pack.id}
                        onClick={() => { handleSelectKnowledgePack(pack); setIsPackPickerModalOpen(false); setPackPickerQuery(''); }}
                        style={{
                          padding: '12px 24px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 12,
                          borderBottom: '1px solid var(--border)',
                          background: isCurrent ? 'rgba(10, 36, 99, 0.04)' : 'transparent',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                        onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Package size={16} style={{ color: 'var(--navy)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pack.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pack.description || '—'}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectKnowledgePack(pack); setIsPackPickerModalOpen(false); setPackPickerQuery(''); }}
                          style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
                        >
                          {isCurrent ? 'Active' : 'Use'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FBFAF7' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {knowledgePacks.length} {knowledgePacks.length === 1 ? 'pack' : 'packs'} available
                </span>
                <button
                  onClick={() => { setIsPackPickerModalOpen(false); setPackPickerQuery(''); closeAllPanels(); setShowKnowledgePacksPanel(true); }}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--navy)', fontWeight: 500, cursor: 'pointer' }}
                >
                  Manage knowledge packs →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
      {/* Multiple runs can run in parallel — no one-at-a-time guard. */}
      {runningPrep && (() => {
        return (
          <PreRunModal
            template={runningPrep}
            workspaceId={workspaceContext.id}
            workspaceName={workspaceContext.name}
            workspaceHasDocs={workspaceContext.hasDocs}
            onCancel={() => setRunningPrep(null)}
            onStarted={(runId) => {
              setRunningPrep(null);
              // Open the multi-run panel and auto-expand the new run.
              setRunPanelFocusId(runId);
              setRunPanelOpen(true);
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

      {/* YourVault Panel */}
      {showDocumentVaultPanel && (
        <DocumentVaultPanel
          documents={documentVault}
          folders={vaultFolders}
          activeDocument={activeVaultDocument}
          activeFolder={activeVaultFolder}
          currentUserId={currentUserId}
          isOrgAdmin={isOrgAdmin}
          isExternalUser={isExternalUser}
          onClose={() => { setShowDocumentVaultPanel(false); setVaultPanelFolderMode(false); }}
          onCreateNew={() => { setShowDocumentVaultPanel(false); setEditingDocument({ isNew: true }); }}
          onEdit={(doc) => { setShowDocumentVaultPanel(false); setEditingDocument(doc); }}
          onSelect={(d) => { handleSelectVaultDocument(d); setShowDocumentVaultPanel(false); setVaultPanelFolderMode(false); }}
          // Folder selection only enabled when the panel was opened
          // from the AttachMenu's "Folder from Vault" entry. Otherwise
          // folders are pure organisation, not selectable as context.
          onSelectFolder={vaultPanelFolderMode ? (f) => { handleSelectVaultFolder(f); setShowDocumentVaultPanel(false); setVaultPanelFolderMode(false); } : undefined}
          onCreateFolder={handleCreateVaultFolder}
          onRenameFolder={handleRenameVaultFolder}
          onDeleteFolder={handleDeleteVaultFolder}
          onUploadFolder={handleUploadVaultFolder}
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
          folders={vaultFolders}
          onClose={() => setEditingDocument(null)}
          onSave={(data) => { handleSaveDocument(data); setEditingDocument(null); }}
        />
      )}
    </div>
  );
}
