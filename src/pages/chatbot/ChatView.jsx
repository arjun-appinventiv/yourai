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
  CreditCard, Folder, FolderPlus, ArrowLeft, User, MoreHorizontal, Check, Home,
  Bookmark, ArrowRight, ExternalLink, Layers, LogIn, Ban, AlertCircle
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../lib/roles';
import TeamPage from '../../components/chat/TeamPage';
import WorkspacesPage from './WorkspacesPage';
import { listWorkspacesForUser, seedWorkspacesIfEmpty } from '../../lib/workspace';
import { MOCK_WORKSPACES } from '../../lib/mockWorkspaces';
import { loadVault, saveVault, seedVaultIfEmpty, loadFolders, saveFolders, seedFoldersIfEmpty } from '../../lib/documentVaultStore';
import { loadPacks, savePacks, seedPacksIfEmpty } from '../../lib/knowledgePackStore';
import { SAMPLE_VAULT_CONTENT, SAMPLE_VAULT_NESTED_DOCS } from '../../data/sampleVaultContent';
import { SAMPLE_PACK_CONTENT } from '../../data/samplePackContent';
import IntentCard, { isCardIntent, tryParseCardData } from '../../components/chat/cards/IntentCard';
import WorkflowsPanel from '../../components/chat/WorkflowsPanel';
import WorkflowBuilder from '../../components/chat/WorkflowBuilder';
import PreRunModal from '../../components/chat/PreRunModal';
import WorkflowRunPanel from '../../components/chat/WorkflowRunPanel';
import IntentArtifactPanel from '../../components/chat/IntentArtifactPanel';
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
} from '../../lib/mockCardData';
import {
  billingData, subscriptionPlans,
  currentUser as ORG_CURRENT_USER,
  workspaces as ORG_WORKSPACES,
  documents as ORG_DOCUMENTS,
  orgReports as ORG_REPORTS,
  activityFeed as ORG_ACTIVITY_FEED,
  auditEvents as ORG_AUDIT_EVENTS,
  workflowRuns as ORG_WORKFLOW_RUNS,
  orgUsers as ORG_USERS,
} from '../../data/mockData';
import { callLLM, getApiKey } from '../../lib/llm-client';
import { extractFileText } from '../../lib/file-parser';
import { trackDocUpload } from '../../lib/auth';
import { useSessionGuard } from '../../lib/useSessionGuard';
import { detectIntent, detectAllIntents } from '../../lib/intentDetector';
import { classifyIntent } from '../../lib/intentClassifier';
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
      { id: 1, name: 'Standard_NDA_Template.pdf', size: '1.2 MB', uploaded: 'Mar 12, 2026', content: SAMPLE_PACK_CONTENT['pack-1-doc-1'] },
      { id: 2, name: 'NDA_Risk_Checklist.docx', size: '0.4 MB', uploaded: 'Mar 15, 2026', content: SAMPLE_PACK_CONTENT['pack-1-doc-2'] },
      { id: 3, name: 'Mutual_NDA_Redline_Example.pdf', size: '0.9 MB', uploaded: 'Mar 18, 2026', content: SAMPLE_PACK_CONTENT['pack-1-doc-3'] },
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
      { id: 1, name: 'DD_Checklist_v3.pdf', size: '2.1 MB', uploaded: 'Mar 20, 2026', content: SAMPLE_PACK_CONTENT['pack-2-doc-1'] },
      { id: 2, name: 'Meridian_Precedent.pdf', size: '5.3 MB', uploaded: 'Mar 22, 2026', content: SAMPLE_PACK_CONTENT['pack-2-doc-2'] },
      { id: 3, name: 'Indemnification_Clauses.docx', size: '0.8 MB', uploaded: 'Mar 25, 2026', content: SAMPLE_PACK_CONTENT['pack-2-doc-3'] },
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
      { id: 1, name: 'CA_Labor_Code.pdf', size: '8.2 MB', uploaded: 'Feb 28, 2026', content: SAMPLE_PACK_CONTENT['pack-3-doc-1'] },
      { id: 2, name: 'Non_Compete_Enforcement.docx', size: '0.6 MB', uploaded: 'Mar 2, 2026', content: SAMPLE_PACK_CONTENT['pack-3-doc-2'] },
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
      { id: 1, name: 'GDPR_Summary.pdf', size: '1.8 MB', uploaded: 'Apr 2, 2026', content: SAMPLE_PACK_CONTENT['pack-4-doc-1'] },
      { id: 2, name: 'CCPA_Redline.docx', size: '0.5 MB', uploaded: 'Apr 5, 2026', content: SAMPLE_PACK_CONTENT['pack-4-doc-2'] },
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

function Sidebar({ activeKey, onOpenChat, onOpenOrgDashboard, onOpenPromptTemplates, onOpenClients, onOpenKnowledgePacks, onOpenDocumentVault, onOpenInviteTeam, onOpenAuditLogs, onOpenBilling, onOpenWorkspaces, onOpenWorkflows, promptCount, clientCount, packCount, vaultCount, memberCount, workspaceCount, workflowCount, isOpen, onClose, threads, activeThreadId, onSwitchThread, onNewThread, onDeleteThread, onRenameThread, threadSearch, onThreadSearchChange, onSignOut, runningWorkflow, onViewRunning }) {
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
      const u = registered[email];
      return u?.user || u || null;
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
  // Inline-rename state for the recent-threads list. When set, that
  // row swaps to an editable input. Enter / blur commits via
  // onRenameThread; Escape cancels.
  const [renamingThreadId, setRenamingThreadId] = useState(null);
  const [renamingDraft, setRenamingDraft] = useState('');

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
    isOrgAdmin && { id: 'org-dashboard', icon: LayoutDashboard, label: 'Dashboard', onClick: onOpenOrgDashboard },
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
          height: 42, padding: '8px 8px 8px 10px', borderRadius: 8,
          cursor: item.onClick ? 'pointer' : 'default',
          userSelect: 'none',
          background: isActive ? '#ffffff' : isHovered ? 'rgba(15, 28, 63, 0.04)' : 'transparent',
          boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px #ece4d2' : 'none',
          transition: 'background 150ms ease, box-shadow 150ms ease',
        }}
      >
        <Icon size={17} style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 15, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
        {item.badge && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: '#E7F3E9', color: '#5CA868', flexShrink: 0 }}>
            {item.badge}
          </span>
        )}
        {item.rightText && !item.badge && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>
            {item.rightText}
          </span>
        )}
      </div>
    );
  };

  // ─── Section header renderer ───
  const renderSectionHeader = (label, isOpen, onToggle) => (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 8px', marginBottom: 4,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--section-label)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
        {label}
      </span>
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
      style={{ width: 300, minWidth: 300, background: 'var(--bg-sidebar)', borderRight: '1px solid #e9e2d1', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
    >
      {/* ═══ ZONE 1 — Header ═══ */}
      <div style={{ padding: '16px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px' }}>
          <span style={{ color: 'var(--navy)' }}>Your</span><span style={{ color: 'var(--gold)' }}>AI</span>
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

      {/* ═══ ZONE 2 — New Chat Button ═══ */}
      {/* External Users don't have a personal chat — they only use workspace
          chats, which have their own 'New chat' button inside the workspace
          sidebar. Hide this CTA for them. */}
      {!isExternalUser && (
      <div style={{ padding: '10px 14px 0' }}>
        <button
          onClick={onNewThread}
          style={{
            width: '100%', height: 46, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', background: 'var(--navy)',
            border: 'none',
            fontSize: 15, fontWeight: 500, color: '#fff',
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ═══ ZONE 3 — WORKSPACE Section ═══ */}
        <div>
          {renderSectionHeader('Workspace')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {workspaceItems.map(renderNavItem)}
          </div>
        </div>

        {/* ═══ ZONE 4 — KNOWLEDGE Section ═══ */}
        <div>
          {renderSectionHeader('Knowledge')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {knowledgeItems.map(renderNavItem)}
          </div>
        </div>

        {/* ═══ ZONE 4b — ADMIN Section (Audit Logs / Billing) ═══ */}
        {adminItems.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--section-label)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
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
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--section-label)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              Recent Chats
            </span>
            <Search size={13} style={{ color: 'var(--text-muted)', opacity: 0.7 }} />
          </div>

          {/* Recent thread list — 3 max */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentThreads.map(t => {
              const isActive = t.id === activeThreadId;
              const isHov = hoveredThread === t.id;
              const isRenaming = renamingThreadId === t.id;
              const commitRename = () => {
                const trimmed = (renamingDraft || '').trim();
                if (trimmed && trimmed !== t.title) {
                  onRenameThread?.(t.id, trimmed);
                }
                setRenamingThreadId(null);
                setRenamingDraft('');
              };
              const cancelRename = () => {
                setRenamingThreadId(null);
                setRenamingDraft('');
              };
              return (
                <div
                  key={t.id}
                  onClick={isRenaming ? undefined : () => onSwitchThread(t.id)}
                  onMouseEnter={() => setHoveredThread(t.id)}
                  onMouseLeave={() => setHoveredThread(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 8,
                    cursor: isRenaming ? 'default' : 'pointer', userSelect: 'none',
                    minHeight: 44,
                    background: isActive ? '#fff' : isHov ? 'rgba(15, 28, 63, 0.03)' : 'transparent',
                    boxShadow: isActive ? '0 0 0 1px #ece4d2' : 'none',
                    transition: 'background 150ms ease, box-shadow 150ms ease',
                  }}
                >
                  <MessageSquare size={13} style={{ color: isActive ? 'var(--navy)' : 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renamingDraft}
                        onChange={(e) => setRenamingDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                          else if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
                        }}
                        onBlur={commitRename}
                        style={{ width: '100%', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', background: 'transparent', border: 'none', outline: 'none', padding: 0, fontFamily: 'inherit' }}
                      />
                    ) : (
                      <div style={{ fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.title}
                      </div>
                    )}
                    {/* Content-match snippet — only present when the
                        Search Chats query matched a message body (not the
                        title). Lets the user see *what* hit so they don't
                        have to open the thread to find out. */}
                    {!isRenaming && (t.searchSnippet ? (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.searchSnippet}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {t.messageCount === 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0, display: 'inline-block' }} />}
                        <span>{t.updatedAt}{t.messageCount > 0 ? ` · ${t.messageCount} msgs` : ''}</span>
                      </div>
                    ))}
                  </div>
                  {/* Rename + Delete — appear on hover, hidden during rename */}
                  {isHov && !isRenaming && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenamingThreadId(t.id); setRenamingDraft(t.title || ''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)' }}
                        title="Rename conversation"
                      >
                        <Edit3 size={12} />
                      </button>
                      {totalThreads > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteThread(t.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)' }}
                          title="Delete conversation"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
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
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#d8d4ca', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.3, marginTop: 1 }}>{roleLabel} &middot; {planLabel}</div>
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
/* ─── Category → accent color map (left-border stripe on each card) ─── */
const PROMPT_CAT_COLOR = {
  'Analysis':  { border: '#1E3A8A', bg: '#DCE5FA', text: '#1E3A8A' },
  'Review':    { border: '#5B21B6', bg: '#EFE7FF', text: '#5B21B6' },
  'Research':  { border: '#0F766E', bg: '#D1F1EE', text: '#0F766E' },
  'Summary':   { border: '#166534', bg: '#DCFCE7', text: '#166534' },
  'Drafting':  { border: '#B45309', bg: '#FEF3C7', text: '#92400E' },
  'Other':     { border: '#475569', bg: '#E5E7EB', text: '#475569' },
};
const promptCatColor = (cat) => PROMPT_CAT_COLOR[cat] || PROMPT_CAT_COLOR['Other'];

/* Full-page prompt templates — matches Figma audit #9:
   "Choose a prompt, fill the blanks, send"
   2-column card grid with colored left-border stripes per category */
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
    <div style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', background: '#FBFAF7', display: 'flex', flexDirection: 'column' }}>
      {/* ── Page chrome bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ padding: '28px 36px 24px' }}>
          <button
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400, marginBottom: 12 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <ArrowLeft size={13} /> Back to chat
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 500, color: 'var(--text-primary)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
                Choose a proven prompt, fill the blanks, send
              </h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.55, maxWidth: 680 }}>
                Start every analysis or draft from a proven template. Pick one, customise the blanks, and send — the AI does the rest.
              </p>
            </div>
            <button
              onClick={onCreateNew}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderRadius: 12, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(10,36,99,0.15)', flexShrink: 0 }}
            >
              <Plus size={14} /> New Template
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter tabs + search ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 36px 0', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Category segmented pills */}
          <div style={{ display: 'inline-flex', border: '1px solid #e2e3e7', borderRadius: 9, background: '#fff', padding: 3, flexWrap: 'wrap', flex: 1 }}>
            {categories.map(c => {
              const active = filterCat === c;
              return (
                <button
                  key={c}
                  onClick={() => setFilterCat(c)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 6, fontSize: 12.5, fontWeight: active ? 600 : 400,
                    border: 'none',
                    background: active ? 'var(--gold-bg)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 120ms', whiteSpace: 'nowrap',
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates…"
              style={{ width: '100%', height: 36, borderRadius: 10, border: '1px solid var(--border)', paddingLeft: 32, paddingRight: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "inherit", background: '#fff' }}
            />
          </div>
        </div>
      </div>

      {/* ── Card grid ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 36px 48px', width: '100%', boxSizing: 'border-box' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', borderRadius: 14, border: '1px dashed var(--border)', background: '#fff' }}>
            <BookOpen size={36} style={{ margin: '0 auto 12px', opacity: 0.35, color: 'var(--text-muted)' }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>No templates found</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Try a different search or category, or create a new template.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
            {filtered.map(t => {
              const col = promptCatColor(t.category);
              return (
                <div
                  key={t.id}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'box-shadow 150ms, border-color 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(10,36,99,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Top row: icon + info */}
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      {/* Category icon tile */}
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: col.text }}>
                        <FileText size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title */}
                        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.3px' }}>
                          {t.title}
                        </div>
                        {/* Category tag */}
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                            padding: '3px 8px', borderRadius: 5,
                            background: col.bg, color: col.text,
                          }}>{t.category}</span>
                        </div>
                      </div>
                    </div>
                    {/* Description */}
                    <p style={{
                      fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      flex: 1,
                    }}>
                      {t.prompt}
                    </p>
                    {/* Created */}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Created {t.createdAt}</div>
                  </div>
                  {/* Action footer */}
                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <button
                      onClick={() => { onDelete(t.id); }}
                      style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Trash2 size={12} style={{ color: '#C65454' }} /> Delete
                    </button>
                    <button
                      onClick={() => { onUsePrompt(t.prompt); onClose(); }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '8px 18px', borderRadius: 8,
                        background: 'var(--navy)', color: '#fff',
                        border: 'none', fontSize: 12.5, fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Use →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
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
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>New Prompt Template</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Template name</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Contract Risk Analysis" style={{ width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "inherit" }} />
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
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Write your reusable prompt here..." rows={5} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: "inherit", lineHeight: 1.5 }} />
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
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Clients</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{clients.length} client{clients.length !== 1 ? 's' : ''} · Added automatically when you invite an External User to a workspace</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
          </div>
          <div style={{ position: 'relative', marginTop: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients by name, contact, or email..." style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 32, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "inherit" }} />
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

  const inputStyle = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "inherit" };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 71 }}>
        <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Add Client</h3>
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
  // Right-rail inspector (audit #7) — clicking a pack card opens a 380 px
  // detail rail with full description, doc list, share toggle, Use CTA.
  // Mutually exclusive with the activePack notion: a pack can be inspected
  // (read-only deep look) without being made the active in-chat pack.
  const [inspectedPackId, setInspectedPackId] = useState(null);

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

  const inspectedPack = useMemo(() => (inspectedPackId ? visible.find((p) => p.id === inspectedPackId) || null : null), [visible, inspectedPackId]);
  // If the inspected pack disappears (deleted, filtered out of visibility),
  // close the rail rather than leave it pointing at a stale id.
  useEffect(() => { if (inspectedPackId && !inspectedPack) setInspectedPackId(null); }, [inspectedPackId, inspectedPack]);

  return (
    <div style={{ flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden', background: '#FBFAF7', display: 'flex', flexDirection: 'column' }}>
      {/* Page chrome — Back to chat + breadcrumb-eyebrow */}
      <div style={{ padding: '12px 28px', borderBottom: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400 }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <ArrowLeft size={13} /> Back to chat
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Knowledge Packs</span>
      </div>

      {/* Sticky toolbar */}
      <div style={{ height: 56, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 12, background: '#FBFAF7', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packs…"
            style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 36, paddingRight: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "inherit", background: '#fff' }}
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
                cursor: 'pointer', fontFamily: "inherit",
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
        <div style={{ display: 'inline-flex', border: '1px solid #e2e3e7', borderRadius: 9, background: '#fff', padding: 3 }}>
          {[
            { id: 'all',  label: 'All',      count: counts.total },
            { id: 'org',  label: 'Org-wide', count: counts.org },
            { id: 'mine', label: 'Mine',     count: counts.mine },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setScope(t.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 6,
                border: 'none',
                background: scope === t.id ? 'var(--gold-bg)' : 'transparent',
                color: scope === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 12.5, fontWeight: scope === t.id ? 600 : 400,
                cursor: 'pointer', transition: 'all 120ms', whiteSpace: 'nowrap',
                fontFamily: "inherit",
              }}
            >
              <span>{t.label}</span>
              <span style={{
                fontSize: 11,
                fontWeight: scope === t.id ? 600 : 400,
                color: scope === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                opacity: 0.75,
              }}>{t.count}</span>
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

      {/* Scrollable content + right-rail inspector — flex row so the rail
          shrinks the grid area when open (audit #7). */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row' }}>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {/* Hero */}
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 28px 18px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <Sparkles size={13} style={{ color: 'var(--gold)' }} />
              <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, letterSpacing: '1.4px', textTransform: 'uppercase' }}>Knowledge Packs</span>
            </div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 38, fontWeight: 500, color: 'var(--text-primary)', margin: 0, letterSpacing: '-1px', lineHeight: 1.1 }}>
              Reference packs, ready in one click
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.55, maxWidth: 760 }}>
              Curated collections of policies, playbooks, and precedents — maintained by your team.
              Attach to any chat in one click to ground every answer in the right source material.
            </p>
          </div>

          {/* Pack grid (or empty state) */}
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 48px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '64px 24px', textAlign: 'center', borderRadius: 12, border: '1px dashed var(--border)', background: '#fff' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ice-warm)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Package size={26} style={{ color: 'var(--navy)' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Fraunces', serif", color: 'var(--text-primary)' }}>
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
                    inspected={inspectedPackId === p.id}
                    currentUserId={currentUserId}
                    isOrgAdmin={isOrgAdmin}
                    onInspect={() => setInspectedPackId(p.id)}
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

        {inspectedPack && (
          <PackInspector
            pack={inspectedPack}
            activePack={activePack}
            currentUserId={currentUserId}
            isOrgAdmin={isOrgAdmin}
            onClose={() => setInspectedPackId(null)}
            onSelect={onSelect}
            onEdit={onEdit}
            onToggleGlobal={onToggleGlobal}
          />
        )}
      </div>
    </div>
  );
}

/* ─── PackInspector — right rail with full pack detail (audit #7) ─── */
function PackInspector({ pack, activePack, currentUserId, isOrgAdmin, onClose, onSelect, onEdit, onToggleGlobal }) {
  const isOwner = pack.ownerId === currentUserId;
  const canEdit = isOrgAdmin || isOwner;
  const canToggleGlobal = isOrgAdmin;
  const isActive = activePack?.id === pack.id;
  const ownerPill = pack.isGlobal
    ? { bg: 'rgba(201,168,76,0.18)', color: '#9A7A22', border: 'rgba(201,168,76,0.45)', label: 'Org-wide' }
    : isOwner
      ? { bg: '#F0F3F6', color: '#1E3A8A', border: '#D8DFE9', label: 'Your pack' }
      : { bg: '#F8F4ED', color: '#6B7885', border: '#E5E0D3', label: `By ${pack.ownerName || 'Member'}` };
  const docs = Array.isArray(pack.docs) ? pack.docs : [];
  const links = Array.isArray(pack.links) ? pack.links : [];
  return (
    <aside style={{
      width: 380, flexShrink: 0,
      borderLeft: '1px solid var(--border)', background: '#fff',
      display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      {/* Header — icon + title + ownership + close */}
      <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: pack.isGlobal ? 'rgba(201,168,76,0.15)' : 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Package size={20} style={{ color: pack.isGlobal ? '#9A7A22' : 'var(--navy)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: 'var(--navy)', margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pack.name}</h2>
          <span style={{ display: 'inline-block', marginTop: 8, fontSize: 10, padding: '2px 8px', borderRadius: 999, background: ownerPill.bg, color: ownerPill.color, border: `1px solid ${ownerPill.border}`, fontWeight: 600, letterSpacing: '0.02em' }}>
            {ownerPill.label}
          </span>
        </div>
        <button
          onClick={onClose}
          title="Close"
          style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <X size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Description */}
      {pack.description && (
        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{pack.description}</p>
        </div>
      )}

      {/* Stats */}
      <div style={{ padding: '12px 22px', display: 'flex', gap: 16, borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <FileText size={12} /> {docs.length} doc{docs.length !== 1 ? 's' : ''}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Link2 size={12} /> {links.length} link{links.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Doc + link list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0 16px' }}>
        {docs.length === 0 && links.length === 0 ? (
          <div style={{ padding: '24px 22px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            This pack has no documents or links yet.
          </div>
        ) : (
          <>
            {docs.length > 0 && (
              <>
                <div style={{ padding: '12px 22px 6px', fontSize: 10, color: 'var(--text-muted)', fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: '0.12em', textTransform: 'uppercase' }}>Documents</div>
                {docs.map((d, i) => (
                  <div key={d.id || i} style={{ padding: '8px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name || 'Untitled'}</div>
                      {d.size && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{d.size}</div>}
                    </div>
                  </div>
                ))}
              </>
            )}
            {links.length > 0 && (
              <>
                <div style={{ padding: '12px 22px 6px', fontSize: 10, color: 'var(--text-muted)', fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: '0.12em', textTransform: 'uppercase' }}>Links</div>
                {links.map((l, i) => (
                  <div key={l.id || i} style={{ padding: '8px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link2 size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label || l.url || 'Link'}</div>
                      {l.url && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.url}</div>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer — share toggle (Org Admin) + Edit + Use in chat */}
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {canToggleGlobal && (
          <span
            onClick={() => onToggleGlobal?.(pack.id, !pack.isGlobal)}
            title={pack.isGlobal ? 'Shared org-wide — click to make personal' : 'Share with entire organisation'}
            style={{ width: 28, height: 16, borderRadius: 999, background: pack.isGlobal ? 'var(--navy)' : '#CBD5E1', position: 'relative', transition: 'background 150ms', flexShrink: 0, cursor: 'pointer' }}
          >
            <span style={{ position: 'absolute', top: 2, left: pack.isGlobal ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 150ms' }} />
          </span>
        )}
        {canEdit && (
          <button
            onClick={() => onEdit?.(pack)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, background: '#fff', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
          >
            <Edit3 size={12} /> Edit
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => onSelect?.(pack)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: isActive ? '#5CA868' : 'var(--navy)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >
          {isActive ? <><CheckCircle size={12} /> Active in chat</> : 'Snap to chat'}
        </button>
      </div>
    </aside>
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
function PackRow({ pack, activePack, inspected, currentUserId, isOrgAdmin, onInspect, onSelect, onEdit, onDelete, onToggleGlobal }) {
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

  // Inspected card gets a subtle navy border so the open right rail
  // visibly anchors to the card the user clicked.
  const restingBorder = isActive ? '#5CA868' : (inspected ? 'var(--navy)' : 'var(--border)');
  const restingShadow = isActive
    ? '0 0 0 1px rgba(92,168,104,0.4)'
    : (inspected ? '0 4px 14px rgba(10,36,99,0.10)' : 'none');

  return (
    <div
      onClick={(e) => {
        // Buttons inside the card stopPropagation; this fires for any
        // empty area on the card body to open the inspector rail.
        if (onInspect) onInspect(pack);
      }}
      style={{
        padding: '20px', borderRadius: 14,
        border: '1px solid ' + restingBorder,
        transition: 'all 0.15s', background: '#fff',
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: restingShadow,
        cursor: onInspect ? 'pointer' : 'default',
        position: 'relative',
      }}
      onMouseEnter={(e) => { if (!isActive && !inspected) { e.currentTarget.style.boxShadow = '0 4px 14px rgba(15,23,42,0.06)'; e.currentTarget.style.borderColor = 'var(--navy)'; } }}
      onMouseLeave={(e) => { if (!isActive && !inspected) { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; } }}
    >
      {/* Header row — icon, title block, kebab */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--gold-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Package size={18} style={{ color: 'var(--text-primary)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.4px', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pack.name}</div>
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
        fontSize: 13.5, color: 'var(--text-secondary)',
        lineHeight: 1.55, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{pack.description}</p>

      {/* Footer — pushes to the bottom of the card, fixed-row metadata + actions */}
      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f0f0f3', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <FileText size={12} style={{ color: 'var(--text-muted)' }} /> {pack.docs?.length || 0} doc{(pack.docs?.length || 0) !== 1 ? 's' : ''}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <Link2 size={12} style={{ color: 'var(--text-muted)' }} /> {pack.links?.length || 0} link{(pack.links?.length || 0) !== 1 ? 's' : ''}
          </span>
        </div>
        {canToggleGlobal && (
          <span
            onClick={(e) => { e.stopPropagation(); onToggleGlobal?.(pack.id, !pack.isGlobal); }}
            title={pack.isGlobal ? 'Shared org-wide — click to make personal' : 'Share with entire organisation'}
            style={{ width: 32, height: 18, borderRadius: 999, background: pack.isGlobal ? 'var(--green)' : '#d4d6dc', position: 'relative', transition: 'background 0.15s', flexShrink: 0, cursor: 'pointer' }}
          >
            <span style={{ position: 'absolute', top: 2, left: pack.isGlobal ? 14 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.12)', transition: 'left 0.15s' }} />
          </span>
        )}
        {onSelect && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(pack); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 8, background: isActive ? '#5CA868' : 'var(--navy)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
          >
            {isActive ? <><CheckCircle size={12} /> Active</> : 'Snap to chat'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Edit / Create Knowledge Pack Modal ─────────────────── */
function EditKnowledgePackModal({ pack, initialFiles = [], onClose, onSave }) {
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

  // Run the real document pipeline: uploading → processing → ready.
  // Extracts plain text via extractFileText and stores it as `content`
  // on the doc record so the chat-grounding inlining (in sendMessage)
  // can pass real text to the Edge model when this pack is attached.
  // Without this, the pack saved as metadata-only and grounding failed.
  //
  // Stub detection: extractFileText never throws — for image-based or
  // unparseable PDFs it RESOLVES with a placeholder string starting
  // `[File: foo.pdf] This PDF appears to be image-based or empty…`.
  // Saving that as `content` yields silent broken grounding (the LLM
  // sees only the placeholder and asks the user to upload). Detect
  // and mark such docs as `failed` so the modal blocks Save until the
  // user removes/retries — same UX as a hard parse error.
  const isExtractionStub = (text) => {
    if (typeof text !== 'string') return true;
    const t = text.trim();
    if (!t) return true;
    // The parser's known stub format. See src/lib/file-parser.ts.
    return /^\[File:\s.+\]\s/.test(t) && t.length < 400;
  };
  const runDocExtraction = (id, file) => {
    setTimeout(() => {
      setDocs(prev => prev.map(d => d.id === id && d.status === 'uploading' ? { ...d, status: 'processing' } : d));
    }, 150);
    extractFileText(file).then(({ text }) => {
      if (isExtractionStub(text)) {
        setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'failed', error: 'No readable text — likely an image-based PDF.' } : d));
        return;
      }
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'ready', content: text } : d));
    }).catch((err) => {
      console.error('KP doc extraction failed:', err);
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'failed', error: 'Could not read this document.' } : d));
    });
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
        accepted.push({ id, file: f, name: f.name, size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`, uploaded: createdAt, status: 'uploading' });
      }
    });

    // Strip the raw File reference before storing in state — it's only
    // needed to kick off extraction; the cleaned doc keeps name+size+content.
    const acceptedForState = accepted.map(({ file, ...rest }) => rest);
    setDocs(prev => [...prev, ...acceptedForState, ...rejected]);
    accepted.forEach(d => runDocExtraction(d.id, d.file));
  };

  // When the modal mounts with overflow files (user clicked "Create a
  // Knowledge Pack" on the chat-attach overflow banner), feed those
  // files into the same pipeline as a manual + Add Document — so the
  // user doesn't have to re-pick. Run once on mount; the parent clears
  // initialFiles after Save / close.
  const initialFilesProcessedRef = useRef(false);
  useEffect(() => {
    if (initialFilesProcessedRef.current) return;
    if (!Array.isArray(initialFiles) || initialFiles.length === 0) return;
    initialFilesProcessedRef.current = true;
    handleDocFilesPicked({ target: { files: initialFiles, value: '' } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles]);

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
      // For new packs, pass id: undefined so handleSavePack's create branch
      // fires (assigns a fresh id + unshifts). Passing a fresh Date.now()
      // here would route to the edit branch's map(), find no match, and
      // silently drop the pack — which was the long-standing create bug
      // fixed 2026-05-07.
      id: pack?.id,
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

  const inputStyle = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "inherit" };

  return (
    <>
      <input ref={docFileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx,.ods,.odp,.pages,.numbers,.key,.html,.htm,.xml,.json" style={{ display: 'none' }} onChange={handleDocFilesPicked} />
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[90vh] md:rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 71, display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>{isNew ? 'New Knowledge Pack' : 'Edit Knowledge Pack'}</h3>
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
          cursor: 'pointer', fontFamily: "inherit",
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
  const [selectedDocId, setSelectedDocId] = useState(null); // inspect panel

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
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [expandedMatters, setExpandedMatters] = useState(() => new Set(['m3'])); // Acme Corp expanded by default

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

  // ─── Vault display helpers ───
  const fileTypeBadge = (fileName) => {
    const ext = (fileName || '').split('.').pop().toUpperCase();
    const map = {
      PDF:  { bg: '#FEE2E2', color: '#B91C1C' },
      DOCX: { bg: '#DBEAFE', color: '#1D4ED8' },
      DOC:  { bg: '#DBEAFE', color: '#1D4ED8' },
      XLSX: { bg: '#DCFCE7', color: '#166534' },
      XLS:  { bg: '#DCFCE7', color: '#166534' },
      TXT:  { bg: '#F1F5F9', color: '#475569' },
    };
    return { label: ext || 'FILE', ...(map[ext] || { bg: '#F1F5F9', color: '#64748B' }) };
  };
  const relativeTime = (dateStr) => {
    const t = Date.parse(dateStr);
    if (!t) return dateStr || '—';
    const diff = Date.now() - t;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days < 1) return 'today';
    if (days === 1) return '1d ago';
    if (days < 30) return `${days}d ago`;
    const mo = Math.floor(days / 30);
    return mo < 12 ? `${mo}mo ago` : `${Math.floor(mo / 12)}y ago`;
  };
  const docTags = (d, folderName) => {
    const tags = [];
    if (d.isGlobal) tags.push({ label: 'Org-wide', bg: '#ECFDF5', color: '#166534' });
    if (d.addedFromChat) tags.push({ label: 'from chat', bg: '#F1F5F9', color: '#475569' });
    if (folderName) tags.push({ label: folderName, bg: '#EDE9FE', color: '#6D28D9' });
    return tags;
  };

  const selectedDoc = selectedDocId ? filteredDocs.find((d) => d.id === selectedDocId) || null : null;

  const emptyCopy = currentFolderId
    ? { title: `Nothing in ${currentFolder?.name || 'this folder'} yet`, body: 'Drop a doc here or upload a new one to fill it.' }
    : search
    ? { title: 'No matches', body: 'Try a different term, or clear the search to see everything.' }
    : { title: 'Build your firm\'s library', body: 'Drop a folder or upload your first document.' };

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
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400 }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <ArrowLeft size={13} /> Back to chat
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>YourVault</span>
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
        {/* ── LEFT RAIL: Matters / Filter / My Folders ── */}
        <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--border)', background: '#FAF8F4', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
            {/* MATTERS section */}
            {(() => {
              const MATTERS = [
                { id: 'm1', name: 'Meridian v. Apex', count: 4, color: '#7c6ee6', folders: [] },
                { id: 'm2', name: 'Harper Trust', count: 2, color: '#5fb86d', folders: [] },
                { id: 'm3', name: 'Acme Corp', count: 12, color: '#e6a23c', folders: [
                  { id: 'f-contracts', name: 'Contracts', count: 5, active: true },
                  { id: 'f-pleadings', name: 'Pleadings', count: 2 },
                  { id: 'f-discovery', name: 'Discovery', count: 3, hasActivity: true },
                  { id: 'f-correspondence', name: 'Correspondence', count: 1 },
                  { id: 'f-workproduct', name: 'Work Product', count: 1, hasActivity: true },
                ]},
                { id: 'm4', name: 'Series B Funding', count: 3, color: '#4a90e2', folders: [] },
                { id: 'm5', name: 'Unassigned', count: 1, color: '#9ca3af', folders: [] },
              ];
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>Matters</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{MATTERS.filter(m => m.id !== 'm5').length} Active</span>
                  </div>
                  {MATTERS.map((matter) => {
                    const isExpanded = expandedMatters.has(matter.id);
                    return (
                      <div key={matter.id}>
                        <div
                          onClick={() => {
                            const next = new Set(expandedMatters);
                            if (isExpanded) next.delete(matter.id); else next.add(matter.id);
                            setExpandedMatters(next);
                            if (matter.id !== 'm3') goToAllDocs();
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px 7px 14px', cursor: 'pointer', borderRadius: 6, margin: '1px 6px', transition: 'background 100ms' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: matter.color, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{matter.name}</span>
                          <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>{matter.count}</span>
                        </div>
                        {isExpanded && matter.folders.length > 0 && (
                          <div style={{ marginLeft: 12 }}>
                            {matter.folders.map((sf) => {
                              const realFolderId = visibleFolders.find(f => f.name === sf.name)?.id || null;
                              const isActive = currentFolderId && currentFolderId === realFolderId;
                              return (
                                <div
                                  key={sf.id}
                                  onClick={() => realFolderId ? setCurrentFolderId(realFolderId) : null}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 14px', cursor: 'pointer', borderRadius: 6, margin: '1px 6px', background: isActive ? 'var(--navy)' : 'transparent', transition: 'background 100ms' }}
                                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(15,23,42,0.06)'; }}
                                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <Folder size={14} style={{ color: isActive ? '#d4b96a' : '#c9a04a', flexShrink: 0 }} />
                                  <span style={{ flex: 1, fontSize: 13.5, color: isActive ? '#fff' : 'var(--text-primary)', fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sf.name}</span>
                                  <span style={{ fontSize: 12, color: isActive ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', flexShrink: 0 }}>{sf.count}</span>
                                  {sf.hasActivity && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e55151', flexShrink: 0 }} />}
                                </div>
                              );
                            })}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 14px', cursor: 'pointer', margin: '1px 6px', color: 'var(--text-muted)', fontSize: 13 }}
                              onClick={() => setCreatingFolder(true)}
                              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--navy)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                            >
                              <Plus size={12} /> Add sub-folder
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}

          </div>
        </div>

        {/* ── MAIN AREA ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Org-Admin scope tabs — kept as a slim strip above the hero so
              role-based filtering is still accessible when the toolbar
              search input moved into the hero. */}
          {isOrgAdmin && (
            <div style={{ padding: '12px 28px 0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0, background: '#FBFAF7' }}>
              <div style={{ display: 'inline-flex', border: '1px solid #e2e3e7', borderRadius: 9, background: '#fff', padding: 3 }}>
                {[
                  { id: 'all',  label: 'All',      count: counts.total },
                  { id: 'org',  label: 'Org-wide', count: counts.org },
                  { id: 'mine', label: 'Mine',     count: counts.mine },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setScope(t.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 6,
                      border: 'none',
                      background: scope === t.id ? 'var(--gold-bg)' : 'transparent',
                      color: scope === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 12.5, fontWeight: scope === t.id ? 600 : 400,
                      cursor: 'pointer', transition: 'all 120ms', whiteSpace: 'nowrap',
                      fontFamily: "inherit",
                    }}
                  >
                    <span>{t.label}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: scope === t.id ? 600 : 400,
                      color: scope === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                      opacity: 0.75,
                    }}>{t.count}</span>
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
                style={{ flex: 1, maxWidth: 360, height: 32, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 13, outline: 'none', fontFamily: "inherit" }}
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
                  <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 500, color: 'var(--text-primary)', margin: 0, letterSpacing: '-1px', lineHeight: 1.1 }}>
                    {currentFolder ? currentFolder.name : 'Ask across your documents'}
                  </h1>
                  {!currentFolder && (
                    <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5, maxWidth: 580 }}>
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

            {/* ─── Search bar (clean, conventional) ─── */}
            <div style={{ maxWidth: 1080, margin: '0 auto', padding: '6px 28px 12px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                height: 44,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: '#fff',
                padding: '0 12px',
                transition: 'border-color 150ms, box-shadow 150ms',
              }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,36,99,0.08)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
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
                  placeholder="Search documents or ask a question…"
                  className="no-focus-ring"
                  style={{ flex: 1, height: '100%', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', fontFamily: "inherit", minWidth: 0 }}
                />
                <kbd style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  padding: '3px 7px', borderRadius: 5,
                  border: '1px solid var(--border)', background: '#fafaf8',
                  fontSize: 11, color: 'var(--text-muted)', fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  flexShrink: 0,
                }}>⌘K</kbd>
              </div>
            </div>

            {/* ─── Filter chip row (moved out of left rail) ─── */}
            <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', marginRight: 4 }}>Filters</span>
                {[
                  { label: 'Privileged', color: '#e55151' },
                  { label: 'Confidential', color: '#4a90e2' },
                  { label: 'Final', color: '#5fb86d' },
                  { label: 'Draft', color: '#e6a23c' },
                  { label: 'Pinned' },
                  { label: 'Mine' },
                ].map((pill) => (
                  <button key={pill.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: '#fff', fontSize: 12.5, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    {pill.color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: pill.color, flexShrink: 0 }} />}
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Step-numbered toolbar — 1. Visualize · context · 3. Refine · 4. Move ─── */}
            <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap',
                padding: '14px 18px',
                border: '1px solid #e6e7ec', borderBottom: 'none',
                borderRadius: '12px 12px 0 0',
                background: '#fafaf8',
                fontSize: 13,
              }}>
                {/* 1. Visualize — List/Grid toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>1. Visualize</span>
                  <div style={{ display: 'inline-flex', gap: 0, borderRadius: 8, padding: 3, background: '#fff', border: '1px solid #e2e3e7' }}>
                    <button onClick={() => setViewMode('list')} style={{
                      padding: '5px 14px', fontSize: 12.5, fontFamily: "inherit",
                      fontWeight: viewMode === 'list' ? 500 : 400,
                      background: viewMode === 'list' ? 'var(--navy)' : 'transparent',
                      color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
                      border: 'none', cursor: 'pointer', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      List
                    </button>
                    <button onClick={() => setViewMode('grid')} style={{
                      padding: '5px 14px', fontSize: 12.5, fontFamily: "inherit",
                      fontWeight: viewMode === 'grid' ? 500 : 400,
                      background: viewMode === 'grid' ? 'var(--navy)' : 'transparent',
                      color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
                      border: 'none', cursor: 'pointer', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      Grid
                    </button>
                  </div>
                </div>

                {/* Context: "{N} docs in {folder}" */}
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {filteredDocs.length} {filteredDocs.length === 1 ? 'doc' : 'docs'}{currentFolder ? ` in ${currentFolder.name}` : ''}
                </span>

                <div style={{ flex: 1 }} />

                {/* 3. Refine */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>3. Refine</span>
                  <button
                    onClick={() => setOpenFilterMenu(openFilterMenu === 'refine' ? null : 'refine')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 8,
                      border: '1px solid #e2e3e7', background: '#fff',
                      fontSize: 12.5, fontFamily: "inherit",
                      color: 'var(--text-primary)', cursor: 'pointer',
                    }}
                  >
                    <Search size={12} />
                    Refine
                    <ChevronRight size={12} style={{ transform: openFilterMenu === 'refine' ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms', color: 'var(--text-muted)' }} />
                  </button>
                </div>

                {/* 4. Move */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>4. Move</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    border: '1px dashed #c8cad0', background: '#fff',
                    fontSize: 12.5, fontFamily: "inherit",
                    color: 'var(--text-secondary)',
                  }}>
                    <FileText size={12} />
                    Drag a doc into chat
                  </span>
                </div>
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

            {/* Documents list — rich table */}
            <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 24px' }}>
              {filteredDocs.length === 0 ? (
                <div style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '0 0 12px 12px', border: '1px solid #e6e7ec', borderTop: 'none', background: '#fff' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ice-warm)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <FolderOpen size={26} style={{ color: 'var(--navy)' }} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Fraunces', serif", color: 'var(--text-primary)' }}>{emptyCopy.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>{emptyCopy.body}</div>
                  {!search && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                      <button onClick={() => folderUploadRef.current?.click()} style={{ padding: '8px 14px', borderRadius: 8, background: '#fff', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer' }}>Upload folder</button>
                      <button onClick={onCreateNew} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer' }}>+ Document</button>
                    </div>
                  )}
                </div>
              ) : (
                viewMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, padding: '16px', borderRadius: '0 0 12px 12px', border: '1px solid #e6e7ec', borderTop: 'none', background: '#f8f8fb' }}>
                    {filteredDocs.map((d) => {
                      const badge = fileTypeBadge(d.fileName);
                      const isDocActive = activeDocument?.id === d.id;
                      const ownerLabel = d.ownerId === currentUserId ? 'You' : (d.ownerName || 'Member');
                      return (
                        <div key={d.id}
                          style={{ borderRadius: 12, border: isDocActive ? '1.5px solid var(--gold)' : '1px solid #e8e9ee', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'box-shadow 150ms, transform 150ms', boxShadow: isDocActive ? '0 0 0 3px rgba(201,168,76,0.12)' : 'none' }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = isDocActive ? '0 0 0 3px rgba(201,168,76,0.12)' : 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          {/* Card header — doc preview area */}
                          <div style={{ height: 88, background: badge.color + '16', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderBottom: '1px solid #f0f0f4' }}>
                            <div style={{ width: 46, height: 58, borderRadius: 7, background: badge.color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8, boxShadow: '0 3px 10px rgba(0,0,0,0.18)', position: 'relative', overflow: 'hidden' }}>
                              <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, background: 'rgba(255,255,255,0.25)', borderRadius: '0 7px 0 8px' }} />
                              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.8px' }}>{badge.label}</span>
                            </div>
                            {isDocActive && (
                              <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--gold)', borderRadius: 5, padding: '2px 7px', fontSize: 9.5, color: '#fff', fontWeight: 700, letterSpacing: '0.04em' }}>Active</div>
                            )}
                          </div>
                          {/* Card body */}
                          <div style={{ padding: '12px 13px 13px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.35, minHeight: 35 }}>{d.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span>{d.fileSize}</span>
                              <span style={{ color: '#d4d5da' }}>·</span>
                              <span>{ownerLabel}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onSelect ? onSelect(d) : null; }}
                              style={{ width: '100%', marginTop: 4, padding: '8px 0', borderRadius: 8, border: 'none', background: 'var(--navy)', color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                              Use in chat
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', border: '1px solid #e6e7ec', borderTop: 'none', overflow: 'hidden' }}>
                  {/* Column headers */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '11px 18px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid #f0f0f3' }}>
                    <div style={{ flex: 1 }}>Document</div>
                    <div style={{ width: 130 }}>Last Used</div>
                    <div style={{ width: 170 }} />
                  </div>
                  {filteredDocs.map((d, idx) => {
                    const isOwner = d.ownerId === currentUserId;
                    const canEdit = isOrgAdmin || isOwner || !d.ownerId;
                    const ownerLabel = isOwner ? 'You' : (d.ownerName || 'Member');
                    const docFolder = d.folderId ? visibleFolders.find((f) => f.id === d.folderId) : null;
                    const isMenuOpen = openMenuFor === d.id;
                    const isDocActive = activeDocument?.id === d.id;
                    const isSelected = selectedDocId === d.id;
                    const badge = fileTypeBadge(d.fileName);
                    const tags = docTags(d, docFolder?.name || null);
                    return (
                      <div
                        key={d.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '14px 18px',
                          borderBottom: idx < filteredDocs.length - 1 ? '1px solid #f3f3f5' : 'none',
                          background: isSelected ? '#fdf6e7' : '#fff',
                          cursor: 'pointer',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
                        onClick={() => setSelectedDocId(isSelected ? null : d.id)}
                      >
                        {/* File type icon */}
                        <div style={{ width: 36, height: 44, borderRadius: 6, background: badge.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.5px', lineHeight: 1 }}>{badge.label}</span>
                        </div>

                        {/* Main content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {d.name}
                          </div>
                          {tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                              {tags.map((t) => (
                                <span key={t.label} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, background: t.bg, color: t.color, fontSize: 11, fontWeight: 500 }}>{t.label}</span>
                              ))}
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                            {d.fileSize && <span>{d.fileSize}</span>}
                            {d.fileSize && <span>·</span>}
                            <span>{ownerLabel}</span>
                          </div>
                        </div>

                        {/* Last used column */}
                        <div onClick={(e) => e.stopPropagation()} style={{ width: 130, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>
                          {relativeTime(d.createdAt)}
                        </div>

                        {/* Actions column */}
                        <div onClick={(e) => e.stopPropagation()} style={{ width: 170, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
                          <button title="Pin" style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #e6e7ec', cursor: 'pointer', color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--navy)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                          >
                            <Bookmark size={13} />
                          </button>
                          {onSelect && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onSelect(d); }}
                              style={{ padding: '6px 14px', borderRadius: 7, background: isDocActive ? '#5CA868' : 'var(--navy)', color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              {isDocActive ? 'Active' : 'Use in chat'}
                            </button>
                          )}
                          {canEdit && (
                            <div style={{ position: 'relative' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenuFor(isMenuOpen ? null : d.id); }}
                                title="More"
                                style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', borderRadius: 4, color: 'var(--text-muted)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.06)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                              >
                                <MoreVertical size={14} style={{ color: 'var(--text-muted)' }} />
                              </button>
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
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )
              )}
            </div>

            {/* "Can't find it?" footer */}
            <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 40px', textAlign: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Can't find it?{' '}
                <button
                  onClick={() => { setSearch(''); setAskQuery(''); document.querySelector('[placeholder="Ask the vault or search documents…"]')?.focus(); }}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--navy)', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Ask the vault.
                </button>
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT INSPECT PANEL ── */}
        {selectedDoc && (
          <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid var(--border)', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {(() => { const b = fileTypeBadge(selectedDoc.fileName); return (
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: b.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: b.color, fontFamily: "'IBM Plex Mono', monospace" }}>{b.label}</span>
                    </div>
                  ); })()}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{selectedDoc.name}</div>
                    <span style={{ display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 500, padding: '1px 7px', borderRadius: 999, background: '#EEF2FF', color: '#4338CA' }}>Latest version</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedDocId(null)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>

            {/* Tabs — Details only (Preview is a future phase) */}
            <div style={{ padding: '0 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 0 }}>
              <button style={{ padding: '10px 0', marginRight: 20, fontSize: 13, fontWeight: 600, color: 'var(--navy)', background: 'none', border: 'none', borderBottom: '2px solid var(--navy)', cursor: 'pointer' }}>Details</button>
              {selectedDoc.sampleUrl && (
                <button
                  onClick={() => window.open(selectedDoc.sampleUrl, '_blank')}
                  style={{ padding: '10px 0', fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >Preview</button>
              )}
            </div>

            {/* Details */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Owner', value: selectedDoc.ownerId === currentUserId ? 'You' : (selectedDoc.ownerName || 'Member') },
                { label: 'Status', value: selectedDoc.isGlobal ? 'Org-wide' : 'Personal' },
                { label: 'Modified', value: selectedDoc.createdAt || '—' },
                { label: 'Size', value: selectedDoc.fileSize || '—' },
                ...(selectedDoc.description ? [{ label: 'Description', value: selectedDoc.description }] : []),
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, width: 90 }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', flex: 1 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onSelect && (
                <button
                  onClick={() => { onSelect(selectedDoc); setSelectedDocId(null); }}
                  style={{ width: '100%', height: 40, borderRadius: 10, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  Use in chat <ArrowRight size={14} />
                </button>
              )}
              {selectedDoc.sampleUrl && (
                <button
                  onClick={() => window.open(selectedDoc.sampleUrl, '_blank')}
                  style={{ width: '100%', height: 36, borderRadius: 10, background: '#fff', color: 'var(--navy)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  Open preview <ExternalLink size={13} />
                </button>
              )}
            </div>
          </div>
        )}
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

  const inputStyle = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "inherit" };

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx,.ods,.odp,.pages,.numbers,.key,.html,.htm,.xml,.json" style={{ display: 'none' }} onChange={handleFileChange} />
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[560px] md:max-h-[90vh] md:rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 71, display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>{isNew ? 'New Document' : 'Edit Document'}</h3>
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

/* ─────────────────── Org Admin Dashboard Panel ─────────────────── */
function OrgDashboardPanel({ onBack, displayName, orgName, workspaceCount, memberCount, vaultCount, packCount, onNewWorkspace, onUploadDocs, onAddTeam }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (displayName || 'Ryan').split(/\s+/)[0];

  // Live metrics from ChatView state (what actually exists in the product)
  const wsCount = workspaceCount ?? ORG_WORKSPACES.filter(w => w.status === 'Active').length;
  const memCount = memberCount ?? ORG_USERS.length;
  const docsCount = vaultCount ?? ORG_DOCUMENTS.length;
  const kpCount = packCount ?? billingData.usage.knowledgePacks.used;

  const statCards = [
    { icon: Briefcase, value: wsCount,   label: 'Workspaces',      color: 'var(--navy)' },
    { icon: Users,    value: memCount,   label: 'Team Members',    color: '#5CA868' },
    { icon: FolderOpen, value: docsCount, label: 'Vault Documents', color: 'var(--gold)' },
    { icon: Package,  value: kpCount,    label: 'Knowledge Packs', color: '#7C5CBF' },
  ];

  const activityIconMap = {
    LogIn: LogOut, Upload, CheckCircle, FileText, FileBarChart: FileText,
    AlertCircle: AlertTriangle, UserPlus, Workflow: Zap, Share: Share2, ExternalLink,
  };

  // Plan usage reflects the features that exist in ChatView
  const usageBars = [
    { label: 'Workspaces',      used: wsCount,   limit: 10 },
    { label: 'Vault Documents', used: docsCount,  limit: billingData.usage.docs.limit },
    { label: 'Knowledge Packs', used: kpCount,    limit: billingData.usage.knowledgePacks.limit },
    { label: 'Team Members',    used: memCount,   limit: 25 },
  ];

  const quickActions = [
    { icon: Plus,     label: 'New Workspace',   desc: 'Create a workspace for a client or matter',       onClick: onNewWorkspace },
    { icon: Upload,   label: 'Upload Documents', desc: 'Upload files to YourVault for AI-powered search', onClick: onUploadDocs },
    { icon: UserPlus, label: 'Add Team Member',  desc: 'Invite a colleague or client to your workspace',  onClick: onAddTeam },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#F8F7F4', overflow: 'hidden' }}>
      {/* Panel header */}
      <div style={{ height: 50, padding: '0 28px', borderBottom: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400, fontFamily: 'inherit' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <ArrowLeft size={14} />
          Back to chat
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>

        {/* ─────────── Hero ─────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
              {greeting}, {firstName}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
              Here's what's happening at {orgName || 'your firm'} today.
            </p>
          </div>
          {/* Quick actions — inline in hero, top-right */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', transition: 'border-color 150ms, background 150ms' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.background = 'var(--ice-warm)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}
                >
                  <Icon size={14} style={{ color: 'var(--navy)' }} />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stat strip — single connected card, no top-border colors */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {statCards.map((s, i) => (
            <div key={s.label} style={{ padding: '16px 20px', borderRight: i < statCards.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{s.label}</div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ─────────── Section: This week ─────────── */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>This week</h2>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last 7 days</span>
        </div>

        {/* Top Workflows + Top Users */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
          {/* Top Workflows */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, color: 'var(--text-primary)', fontWeight: 400, margin: 0 }}>Top Workflows</h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>This week</span>
            </div>
            {(() => {
              const top3 = [
                { name: 'Contract Review Auto-run', runs: 24 },
                { name: 'Due Diligence Flow',       runs: 17 },
                { name: 'Risk Assessment Pipeline', runs: 11 },
              ];
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '14px 14px 14px' }}>
                    {top3.map((r, i) => {
                      const isLead = i === 0;
                      return (
                        <div key={r.name} style={{
                          background: isLead ? 'var(--gold-bg)' : '#FAFAF8',
                          border: isLead ? '1px solid rgba(201,168,76,0.35)' : '1px solid var(--border)',
                          borderRadius: 10, padding: '14px 10px 12px', textAlign: 'center',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: isLead ? 'rgba(201,168,76,0.18)' : 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={14} style={{ color: isLead ? 'var(--gold)' : 'var(--navy)' }} />
                          </div>
                          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>{r.runs}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>runs</div>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.35, fontWeight: 500, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Top Users */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, color: 'var(--text-primary)', fontWeight: 400, margin: 0 }}>Top Users</h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>This week</span>
            </div>
            {(() => {
              const top3 = [
                { name: 'Sarah Chen',  avatar: 'SC', actions: 87 },
                { name: 'James Wu',    avatar: 'JW', actions: 64 },
                { name: 'Ryan Melade', avatar: 'RM', actions: 51 },
              ];
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '14px 14px 14px' }}>
                    {top3.map((u, i) => {
                      const isLead = i === 0;
                      return (
                        <div key={u.name} style={{
                          background: isLead ? 'var(--gold-bg)' : '#FAFAF8',
                          border: isLead ? '1px solid rgba(201,168,76,0.35)' : '1px solid var(--border)',
                          borderRadius: 10, padding: '14px 10px 12px', textAlign: 'center',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: isLead ? 'rgba(201,168,76,0.18)' : 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: isLead ? 'var(--gold)' : 'var(--navy)' }}>
                            {u.avatar}
                          </div>
                          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>{u.actions}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>actions</div>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.35, fontWeight: 500, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{u.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Cost by Client + Plan usage — 2-col row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 32 }}>
          {/* Cost by Client */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, color: 'var(--text-primary)', fontWeight: 400, margin: '0 0 4px' }}>Cost by Client</h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>Per-client AI spend, this week</p>
            {(() => {
              const clients = [
                { name: 'Acme Corp',     pct: 54, color: 'var(--navy)' },
                { name: 'TechStart Inc', pct: 35, color: 'var(--gold)' },
                { name: 'Chen Family',   pct: 11, color: '#8d97a5' },
              ];
              const r = 60;
              const C = 2 * Math.PI * r;
              let acc = 0;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 22, alignItems: 'center' }}>
                  <svg width={170} height={170} viewBox="0 0 170 170" aria-label="Cost by client donut chart">
                    <g transform="rotate(-90 85 85)">
                      {clients.map((c) => {
                        const len = (c.pct / 100) * C;
                        const dashOffset = -acc;
                        acc += len;
                        return (
                          <circle
                            key={c.name}
                            cx={85} cy={85} r={r}
                            fill="none"
                            stroke={c.color}
                            strokeWidth={26}
                            strokeDasharray={`${len} ${C - len}`}
                            strokeDashoffset={dashOffset}
                          />
                        );
                      })}
                    </g>
                    <text x={85} y={92} textAnchor="middle" fontFamily="'Fraunces', serif" fontSize={20} fontWeight={500} fill="var(--text-primary)">$2.43</text>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {clients.map((c) => (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', marginLeft: 8 }}>{c.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Plan usage */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, color: 'var(--text-primary)', fontWeight: 400, margin: 0 }}>Plan usage</h4>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{billingData.plan} · renews {billingData.nextRenewal}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>Subscription quotas, this billing period</p>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
              {usageBars.map(({ label, used, limit }) => {
                const pct = Math.min(100, Math.round((used / limit) * 100));
                const barColor = pct > 80 ? '#C65454' : pct > 50 ? 'var(--gold)' : 'var(--navy)';
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{used} / {limit.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 5, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 300ms' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─────────── Section: Recent activity ─────────── */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>Recent activity</h2>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today & yesterday</span>
        </div>

        {/* Activity Feed — full width */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 32, overflow: 'hidden' }}>
          {/* Activity items */}
          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            {ORG_ACTIVITY_FEED.map((item) => {
              const IconComp = activityIconMap[item.icon] || CheckCircle;
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: item.user === 'System' ? '#F0F3F6' : 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <IconComp size={13} style={{ color: item.user === 'System' ? '#1E3A8A' : 'var(--text-muted)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4, margin: 0 }}>
                      <span style={{ fontWeight: 500 }}>{item.user}</span>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{item.action}</span>
                    </p>
                    {item.workspace && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{item.workspace}</p>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.time}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─────────────────── Billing Panel (Org Admin) ─────────────────── */
function BillingPanel({ onBack }) {
  const [showPlanModal, setShowPlanModalLocal] = useState(false);
  const plans = [
    { name: 'Free',         price:   0, features: ['1 user', '50 documents', '10 workflows', '1 knowledge pack'] },
    { name: 'Professional', price: 149, features: ['Up to 3 users', '500 documents', '100 workflows', '5 knowledge packs'] },
    { name: 'Team',         price: 299, features: ['Up to 10 users', '2,000 documents', '500 workflows', '20 knowledge packs'], current: true },
    { name: 'Enterprise',   price: 599, features: ['Unlimited users', 'Unlimited documents', 'Unlimited workflows', 'Unlimited knowledge packs'] },
  ];
  const usageLabels = { docs: 'Documents', workflows: 'Workflows', knowledgePacks: 'Knowledge Packs' };
  const statusColor = (status) => {
    if (status === 'Paid')    return { bg: '#E2EFDA', color: '#2F6B30' };
    if (status === 'Pending') return { bg: '#FFF2CC', color: '#92740B' };
    if (status === 'Failed')  return { bg: '#FCE4D6', color: '#9A3412' };
    return { bg: 'var(--ice-warm)', color: 'var(--text-secondary)' };
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#F8F7F4', overflow: 'hidden' }}>
      {/* Panel header */}
      <div style={{ height: 50, padding: '0 28px', borderBottom: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400, fontFamily: 'inherit' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <ArrowLeft size={14} />
          Back to chat
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
        {/* Page title */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
            Billing
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
            Manage your subscription and view billing history.
          </p>
          <div style={{ height: 1, background: 'var(--border)', marginTop: 16 }} />
        </div>

        {/* Current plan card */}
        <div style={{ background: 'var(--navy)', color: '#fff', borderRadius: 14, padding: '22px 26px', marginBottom: 24, boxShadow: '0 4px 20px rgba(11,29,58,0.18)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              Current Plan
            </span>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, marginTop: 6, marginBottom: 0, fontWeight: 500 }}>
              {billingData.plan}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4, marginBottom: 0 }}>
              ${billingData.pricePerUser}/user/month &middot; {billingData.users} users
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              Monthly Total
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 34, color: 'var(--gold)', fontWeight: 500, lineHeight: 1.1, marginTop: 4 }}>
              ${billingData.mrr.toLocaleString()}
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4, marginBottom: 0 }}>
              Next renewal: {billingData.nextRenewal}
            </p>
          </div>
        </div>

        {/* Usage meters */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, color: 'var(--text-primary)', margin: '0 0 14px', fontWeight: 400 }}>
            Usage This Period
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {Object.entries(billingData.usage).map(([key, val]) => {
              const pct = Math.round((val.used / val.limit) * 100);
              const barColor = pct > 80 ? '#C65454' : pct > 50 ? 'var(--gold)' : 'var(--navy)';
              return (
                <div key={key} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{usageLabels[key]}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--ice-warm)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 300ms' }} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{val.used} / {val.limit.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan comparison */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, color: 'var(--text-primary)', margin: '0 0 14px', fontWeight: 400 }}>
            Available Plans
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {plans.map((p) => (
              <div
                key={p.name}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '18px 18px 16px',
                  border: p.current ? '2px solid var(--navy)' : '1px solid var(--border)',
                  boxShadow: p.current ? '0 4px 12px rgba(11,29,58,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                {p.current && (
                  <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: 'var(--gold-bg)', color: '#8a6b1f', marginBottom: 6 }}>
                    Current Plan
                  </span>
                )}
                <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0, marginTop: p.current ? 0 : 22, fontWeight: 500 }}>
                  {p.name}
                </h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 14px' }}>
                  {p.price === 0 ? 'Free' : `$${p.price}/user/mo`}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {p.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Check size={12} style={{ color: '#5CA868', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                {!p.current && (
                  <button
                    style={{ width: '100%', marginTop: 14, padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 12, fontWeight: 500, border: '1px solid var(--border)', background: '#fff', color: 'var(--navy)', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.background = 'var(--ice-warm)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}
                  >
                    {p.price > billingData.pricePerUser ? 'Upgrade' : 'Downgrade'} <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Billing history */}
        <div>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, color: 'var(--text-primary)', margin: '0 0 14px', fontWeight: 400 }}>
            Billing History
          </h3>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--ice-warm)', borderBottom: '1px solid var(--border)' }}>
                  {['Invoice', 'Date', 'Amount', 'Status', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {billingData.invoices.map((inv, idx) => {
                  const sc = statusColor(inv.status);
                  return (
                    <tr key={inv.id} style={{ borderBottom: idx === billingData.invoices.length - 1 ? 'none' : '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{inv.id}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{inv.date}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>${inv.amount.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                          <Download size={11} /> PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Audit Logs Panel (Org Admin) ─────────────────── */
const AUDIT_ICON_MAP = {
  LogIn, LogOut, Upload, Trash2, Share2, UserPlus, Briefcase, Shield, Ban,
  CheckCircle, AlertCircle, AlertTriangle, ExternalLink,
};
const CATEGORY_META = {
  auth:       { label: 'Auth',       color: '#5B21B6' },
  documents:  { label: 'Documents',  color: 'var(--navy)' },
  workspaces: { label: 'Workspaces', color: '#0F766E' },
  users:      { label: 'Users',      color: '#9A3412' },
  workflows:  { label: 'Workflows',  color: 'var(--gold)' },
};
const DATE_FILTERS = [
  { id: 'all',   label: 'All time',     days: null },
  { id: 'today', label: 'Today',         days: 0 },
  { id: '7d',    label: 'Last 7 days',  days: 7 },
  { id: '30d',   label: 'Last 30 days', days: 30 },
];

function formatAuditTs(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sameDay = new Date().toDateString() === d.toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  if (yesterday) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

function AuditLogsPanel({ onBack }) {
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  const users = useMemo(() => {
    const set = new Set();
    ORG_AUDIT_EVENTS.forEach((e) => set.add(e.user));
    return Array.from(set);
  }, []);

  const filtered = useMemo(() => {
    const cutoff = (() => {
      const f = DATE_FILTERS.find((d) => d.id === dateFilter);
      if (!f || f.days === null) return null;
      const t = new Date();
      if (f.days === 0) { t.setHours(0, 0, 0, 0); return t.getTime(); }
      return Date.now() - f.days * 86400000;
    })();
    const q = searchQuery.trim().toLowerCase();
    return ORG_AUDIT_EVENTS
      .filter((e) => userFilter === 'all' || e.user === userFilter)
      .filter((e) => cutoff === null || new Date(e.ts).getTime() >= cutoff)
      .filter((e) => {
        if (!q) return true;
        const hay = [
          e.ts, formatAuditTs(e.ts),
          e.user, e.ip, e.category, e.action, e.target, e.workspace,
          e.flagged ? 'flagged' : '',
        ].join('   ').toLowerCase();
        return hay.includes(q);
      });
  }, [userFilter, dateFilter, searchQuery]);

  const handleExportCSV = () => {
    const header = ['Timestamp', 'User', 'IP', 'Category', 'Action', 'Target', 'Workspace', 'Flagged'];
    const rows = filtered.map((e) => [e.ts, e.user, e.ip || '', e.category, e.action, e.target, e.workspace || '', e.flagged ? 'yes' : '']);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentDateLabel = DATE_FILTERS.find((d) => d.id === dateFilter)?.label || 'All time';
  const currentUserLabel = userFilter === 'all' ? 'All users' : userFilter;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#F8F7F4', overflow: 'hidden' }}>
      {/* Panel header */}
      <div style={{ height: 50, padding: '0 28px', borderBottom: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400, fontFamily: 'inherit' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <ArrowLeft size={14} />
          Back to chat
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
        {/* Page title */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
            Audit Log
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
            Every action your team takes — for compliance reviews and matter governance.
          </p>
          <div style={{ height: 1, background: 'var(--border)', marginTop: 16 }} />
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {/* Search — all columns */}
          <div style={{ position: 'relative', minWidth: 260, flex: '0 1 320px' }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events…"
              style={{ width: '100%', padding: '7px 30px 7px 30px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,36,99,0.08)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ice-warm)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* User filter */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setIsUserOpen((v) => !v); setIsDateOpen(false); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 12.5, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <User size={13} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontWeight: 500 }}>{currentUserLabel}</span>
              <ChevronDown size={11} style={{ color: 'var(--text-muted)', transform: isUserOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
            </button>
            {isUserOpen && (
              <>
                <div onClick={() => setIsUserOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 220, background: '#fff', borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(10,36,99,0.12)', zIndex: 51, overflow: 'hidden' }}>
                  <button
                    onClick={() => { setUserFilter('all'); setIsUserOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: userFilter === 'all' ? 'var(--ice-warm)' : 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', textAlign: 'left' }}
                  >
                    All users
                  </button>
                  <div style={{ height: 1, background: 'var(--border)' }} />
                  {users.map((u) => (
                    <button
                      key={u}
                      onClick={() => { setUserFilter(u); setIsUserOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: userFilter === u ? 'var(--ice-warm)' : 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', textAlign: 'left' }}
                      onMouseEnter={(e) => { if (userFilter !== u) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                      onMouseLeave={(e) => { if (userFilter !== u) e.currentTarget.style.background = 'none'; }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Date range filter */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setIsDateOpen((v) => !v); setIsUserOpen(false); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 12.5, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontWeight: 500 }}>{currentDateLabel}</span>
              <ChevronDown size={11} style={{ color: 'var(--text-muted)', transform: isDateOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
            </button>
            {isDateOpen && (
              <>
                <div onClick={() => setIsDateOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 180, background: '#fff', borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(10,36,99,0.12)', zIndex: 51, overflow: 'hidden' }}>
                  {DATE_FILTERS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setDateFilter(d.id); setIsDateOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: dateFilter === d.id ? 'var(--ice-warm)' : 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', textAlign: 'left' }}
                      onMouseEnter={(e) => { if (dateFilter !== d.id) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                      onMouseLeave={(e) => { if (dateFilter !== d.id) e.currentTarget.style.background = 'none'; }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
            {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
          </span>

          {/* Export CSV — right side */}
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 12.5, color: 'var(--navy)', fontWeight: 500, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: filtered.length === 0 ? 0.5 : 1 }}
            onMouseEnter={(e) => { if (filtered.length > 0) { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.background = 'var(--ice-warm)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>

        {/* Events table */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ice-warm)', borderBottom: '1px solid var(--border)' }}>
                {['Timestamp', 'User', 'IP', 'Category', 'Action', 'Target'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                    No events match these filters.
                  </td>
                </tr>
              ) : filtered.map((e, idx) => {
                const Icon = AUDIT_ICON_MAP[e.icon] || CheckCircle;
                const meta = CATEGORY_META[e.category] || { label: e.category, color: 'var(--text-muted)' };
                return (
                  <tr key={e.id} style={{ borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatAuditTs(e.ts)}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>
                          {e.avatar}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{e.user}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, color: e.ip && !e.ip.startsWith('10.') ? '#9A3412' : 'var(--text-muted)' }}>
                      {e.ip || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', background: `${meta.color}1a`, color: meta.color }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={13} style={{ color: e.flagged ? '#C65454' : 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{e.action}</span>
                        {e.flagged && (
                          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4, background: '#FCE4D6', color: '#9A3412' }}>Flagged</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{e.target}</div>
                      {e.workspace && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{e.workspace}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Top Nav ─────────────────── */
const AI_MODELS = [
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', tag: 'Default', desc: 'Most capable — best for complex legal analysis' },
  { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', tag: 'Fast', desc: 'Faster responses, ideal for quick queries' },
  { id: 'gpt-4o', name: 'GPT-4o', tag: null, desc: 'OpenAI flagship model' },
  { id: 'gemini-15-pro', name: 'Gemini 1.5 Pro', tag: null, desc: 'Google\'s advanced multimodal model' },
];

function TopNav({ onOpenSidebar }) {
  const [modelOpen, setModelOpen] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState('Claude 3.7 Sonnet');
  const modelRef = React.useRef(null);

  React.useEffect(() => {
    if (!modelOpen) return;
    const handle = (e) => {
      if (modelRef.current && !modelRef.current.contains(e.target)) setModelOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [modelOpen]);

  return (
    <div className="flex items-center px-3 sm:px-4" style={{ height: 50, minHeight: 50, borderBottom: '1px solid var(--border)', background: '#fff', gap: 8, flexShrink: 0 }}>
      {/* Hamburger — mobile only */}
      <button
        className="md:hidden"
        onClick={onOpenSidebar}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 8, flexShrink: 0 }}
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Model selector */}
      <div style={{ position: 'relative' }} ref={modelRef}>
        <button
          onClick={() => setModelOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 11px 6px 9px', borderRadius: 9,
            border: `1.5px solid ${modelOpen ? 'var(--navy)' : 'var(--border)'}`,
            background: modelOpen ? 'rgba(15,28,63,0.04)' : '#fff',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'border-color 0.12s, background 0.12s',
          }}
          onMouseEnter={(e) => { if (!modelOpen) { e.currentTarget.style.borderColor = '#b8bcc8'; e.currentTarget.style.background = '#f7f8fb'; } }}
          onMouseLeave={(e) => { if (!modelOpen) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; } }}
        >
          <Sparkles size={13} style={{ color: 'var(--gold)', flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.01em' }}>YourAI</span>
          <span style={{ fontSize: 13, color: '#c4c8d0', fontWeight: 400 }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{selectedModel}</span>
          <ChevronDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: modelOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
        </button>

        {modelOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            width: 310, backgroundColor: '#fff', borderRadius: 14,
            border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
            zIndex: 200, overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px 6px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              AI Model
            </div>
            {AI_MODELS.map((m) => {
              const isCurrent = m.name === selectedModel;
              return (
                <div
                  key={m.id}
                  onClick={() => { setSelectedModel(m.name); setModelOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    gap: 10, padding: '10px 14px', cursor: 'pointer',
                    backgroundColor: isCurrent ? 'rgba(10,36,99,0.04)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'; }}
                  onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 500, color: isCurrent ? 'var(--navy)' : 'var(--text-primary)' }}>{m.name}</span>
                      {m.tag && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: m.tag === 'Default' ? 'var(--ice-warm)' : '#E7F3E9', color: m.tag === 'Default' ? 'var(--navy)' : '#5CA868', flexShrink: 0 }}>
                          {m.tag}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{m.desc}</div>
                  </div>
                  {isCurrent && <Check size={14} style={{ color: 'var(--navy)', flexShrink: 0, marginTop: 2 }} />}
                </div>
              );
            })}
          </div>
        )}
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
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: 0 }}>A workflow is already running</h3>
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

function MessageBubble({ msg, onOpenArtifact, isActiveArtifact, onConfirmAction }) {
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
          {/* Confirmation message: doc-source picker (use attached vs upload new).
              Rendered as plain prose with two inline text-link actions —
              looks like part of the chat conversation, not a UI card. */}
          {isBot && msg.confirmation && msg.confirmation.kind === 'multi_intent_pick' && (() => {
            // Multi-intent clarification: user's message reads as 2+ tasks
            // (e.g. "do clause analysis and then prepare a contract").
            // Pause and ask which to run first. Same prose-with-text-links
            // pattern as the doc-source confirmation — looks like part of
            // the conversation, not a styled UI component.
            const choices = msg.confirmation.choices || [];
            return (
              <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                <p style={{ margin: '0 0 10px 0' }}>
                  I can only run one operation at a time. Your message looks like {choices.length === 2 ? 'two tasks' : choices.length === 3 ? 'three tasks' : choices.length === 4 ? 'four tasks' : `${choices.length} tasks`} —{' '}
                  {choices.map((c, i) => (
                    <React.Fragment key={c.intentId}>
                      <strong>{c.label}</strong>
                      {i < choices.length - 2 ? ', ' : i === choices.length - 2 ? ' and ' : ''}
                    </React.Fragment>
                  ))}
                  . Which would you like to do first?
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 0, rowGap: 6 }}>
                  {choices.map((c, i) => (
                    <React.Fragment key={c.intentId}>
                      <a
                        onClick={() => onConfirmAction && onConfirmAction({
                          kind: 'pick_intent',
                          intentId: c.intentId,
                          label: c.label,
                          message: msg.confirmation.pendingMessage,
                          msgId: msg.id,
                        })}
                        style={{
                          color: 'var(--navy)', textDecoration: 'underline',
                          cursor: 'pointer', fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.label}
                      </a>
                      {i < choices.length - 1 && <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{'  ·  '}</span>}
                    </React.Fragment>
                  ))}
                </p>
              </div>
            );
          })()}
          {isBot && msg.confirmation && msg.confirmation.kind === 'use_attached_or_new' && (() => {
            const names = msg.confirmation.docNames || [];
            const headDocs = names.slice(0, 3);
            const more = names.length - headDocs.length;
            const docList = headDocs.map((n, i) => (
              <React.Fragment key={i}>
                <strong style={{ fontWeight: 600 }}>{n}</strong>
                {i < headDocs.length - 1 ? ', ' : ''}
              </React.Fragment>
            ));
            return (
              <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                <p style={{ margin: '0 0 10px 0' }}>
                  I see you have {names.length === 1 ? '' : <><strong>{names.length}</strong> documents attached: </>}
                  {names.length === 1 ? <><strong>{names[0]}</strong> attached.</> : docList}
                  {more > 0 && <> and <strong>{more} more</strong></>}
                  {names.length > 1 && '.'}
                  {' '}
                  Should I run <strong>{msg.confirmation.intentLabel}</strong> on {names.length === 1 ? 'this document' : 'these'}, or would you like to upload a new one?
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <a
                    onClick={() => onConfirmAction && onConfirmAction({ kind: 'use_attached', message: msg.confirmation.pendingMessage, msgId: msg.id })}
                    style={{
                      color: 'var(--navy)', textDecoration: 'underline',
                      cursor: 'pointer', fontWeight: 500,
                    }}
                  >
                    Yes, use {names.length === 1 ? 'it' : 'them'}
                  </a>
                  <span style={{ color: 'var(--text-muted)' }}>{'  ·  '}</span>
                  <a
                    onClick={() => onConfirmAction && onConfirmAction({ kind: 'upload_new', msgId: msg.id })}
                    style={{
                      color: 'var(--text-secondary)', textDecoration: 'underline',
                      cursor: 'pointer', fontWeight: 500,
                    }}
                  >
                    I'll upload a new one
                  </a>
                </p>
              </div>
            );
          })()}
          {isBot && !msg.confirmation && (
            // Intent cards: if this bot message carries a known intent and
            // either pre-parsed cardData or JSON-parseable content, render
            // the dedicated card. Any parse or shape failure falls through
            // to the existing ReactMarkdown renderer — never crash.
            //
            // Card-intent results (Risk Memo, Summary, Comparison, etc.)
            // now open in the right-side IntentArtifactPanel instead of
            // rendering inline. The chat bubble shows a compact preview
            // chip; clicking it opens the panel anchored to that message.
            // Only find_document keeps its FileResultsCard inline — search
            // results read better in the conversation flow.
            (() => {
              const ARTIFACT_LABELS = {
                document_summarisation: 'Summary',
                clause_comparison:      'Clause comparison',
                case_law_analysis:      'Case brief',
                legal_research:         'Research brief',
                risk_assessment:        'Risk memo',
                clause_analysis:        'Clause analysis',
              };
              const ARTIFACT_SUBTITLES = {
                document_summarisation: (d) => d?.documentName || d?.matterName || 'Sectioned takeaways',
                clause_comparison:      (d) => d?.matterName || (Array.isArray(d?.documents) ? `${d.documents.length} documents` : 'Side-by-side'),
                case_law_analysis:      (d) => d?.caseName || d?.parties || d?.matterName || 'Facts · Holding · Reasoning',
                legal_research:         (d) => d?.question || d?.matterName || 'Authorities & holdings',
                risk_assessment:        (d) => d?.matterName || d?.documentName || `${(d?.findings?.length) || 0} findings`,
                clause_analysis:        (d) => d?.documentName || d?.matterName || `${(d?.clauses?.length) || 0} clauses`,
              };
              const renderArtifactChip = (data) => {
                const label = ARTIFACT_LABELS[msg.intent] || 'Artifact';
                const subtitle = (ARTIFACT_SUBTITLES[msg.intent] && ARTIFACT_SUBTITLES[msg.intent](data)) || '';
                return (
                  <button
                    onClick={() => onOpenArtifact && onOpenArtifact(msg.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', textAlign: 'left',
                      padding: '12px 14px', borderRadius: 12,
                      background: isActiveArtifact ? 'rgba(10, 36, 99, 0.06)' : '#fff',
                      border: '1px solid ' + (isActiveArtifact ? 'var(--navy)' : 'var(--border)'),
                      cursor: 'pointer', transition: 'all 150ms ease',
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => { if (!isActiveArtifact) (e.currentTarget).style.borderColor = 'var(--navy)'; }}
                    onMouseLeave={(e) => { if (!isActiveArtifact) (e.currentTarget).style.borderColor = 'var(--border)'; }}
                  >
                    {/* Icon tile */}
                    <span style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'var(--ice-warm)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <FileText size={16} style={{ color: 'var(--navy)' }} />
                    </span>
                    {/* Title + subtitle */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: 'var(--text-muted)', fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        }}>{label}</span>
                        {isActiveArtifact && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 600, color: 'var(--navy)',
                            padding: '2px 8px', borderRadius: 999, background: 'rgba(10, 36, 99, 0.10)',
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--navy)' }} />
                            Open
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontFamily: "'Fraunces', serif", fontSize: 16,
                        color: 'var(--navy)', lineHeight: 1.25,
                        marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {subtitle || label}
                      </div>
                    </div>
                    {/* Open arrow */}
                    <span style={{
                      flexShrink: 0, fontSize: 12, color: 'var(--text-muted)',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {isActiveArtifact ? 'Viewing' : 'Open'} <ArrowUp size={12} style={{ transform: 'rotate(45deg)' }} />
                    </span>
                  </button>
                );
              };

              // find_document keeps its inline list rendering.
              if (msg.intent === 'find_document') {
                if (msg.cardData) return <IntentCard intent={msg.intent} data={msg.cardData} />;
                const parsed = tryParseCardData(msg.content);
                if (parsed) return <IntentCard intent={msg.intent} data={parsed} />;
              }

              // Other card intents → preview chip (panel renders the full card).
              if (msg.cardData && isCardIntent(msg.intent)) {
                return renderArtifactChip(msg.cardData);
              }
              if (isCardIntent(msg.intent)) {
                const parsed = tryParseCardData(msg.content);
                if (parsed) return renderArtifactChip(parsed);
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
          )}
          {!isBot && msg.content}
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
              fontFamily: "inherit", transition: 'all 0.15s',
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
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', color: 'var(--text-primary)' }}>Choose a plan that fits your firm</h3>
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
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, color: 'var(--navy)' }}>{p.name}</div>
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
  { id: 'files', label: 'File Search',    icon: Search,   sub: 'Attached files in this chat · fastest, most precise' },
  { id: 'vault', label: 'YourVault',      icon: Database, sub: 'Firm document library across matters' },
  { id: 'packs', label: 'Knowledge Packs', icon: Package, sub: 'Curated reference content for the conversation' },
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
function SearchScopePill({ scope, isOpen, setIsOpen, setScope, scopeRef, openUpward = true, compact = false, onPickVault, onPickPack }) {
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
          fontSize: 12, fontFamily: "inherit", fontWeight: 500,
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
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
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
                    if (opt.id === 'packs' && onPickPack) {
                      onPickPack();
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
        <span style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{workflow.name}</span>
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
      const u = registered[email];
      return u?.user?.name || u?.name || '';
    } catch { return ''; }
  })().split(' ')[0];
  const currentUserName = resolvedFirstName || 'there';

  // Hero only — input, drop tile and merged icon-pill row are rendered
  // by ChatView's main render below, so they sit inside the same column
  // and pick up the live state (input, attachments, dropdowns) without
  // prop-drilling.
  return (
    <div className="px-4 sm:px-6" style={{ paddingTop: '10vh', paddingBottom: 0 }}>
      <div style={{ maxWidth: 820, width: '100%', margin: '0 auto' }}>
        <div style={{ textAlign: 'center' }}>
          {/* Sparkle — 36px gold-bg ring with sparkle inside */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <span style={{
              display: 'inline-flex', width: 36, height: 36, borderRadius: '50%',
              background: 'var(--gold-bg)', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gold)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z"/>
              </svg>
            </span>
          </div>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 500,
              fontSize: 44,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: '-1.2px',
              textAlign: 'center',
            }}
          >
            {getGreeting()}, {currentUserName}
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14.5, margin: '8px 0 28px', lineHeight: 1.5 }}>
            Your AI assistant is ready — ask anything about your documents or Alaska law.
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

  // External Users never use the personal chat — their home is the
  // workspace list at /chat/workspaces. They pick a matter from there
  // even when they only have one assigned, so the list stays a stable
  // landing surface (and gives them a place to sign out from).
  useEffect(() => {
    if (!isExternalUser) return;
    if (initialView !== 'workspaces') {
      navigate('/chat/workspaces', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExternalUser, initialView]);
  // Org Admin sees the org dashboard on first load; internal/external users skip it
  const [showOrgDashboard, setShowOrgDashboard] = useState(isOrgAdmin && initialView !== 'workspaces');
  const [showBillingPanel, setShowBillingPanel] = useState(false);
  const [showAuditLogsPanel, setShowAuditLogsPanel] = useState(false);
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
  // Persisted across reloads — packs created / edited / deleted by the
  // user survive a refresh. Seeded with DEFAULT_KNOWLEDGE_PACKS on first
  // load (idempotent: skips if a stored list already exists).
  const [knowledgePacks, setKnowledgePacks] = useState(() => {
    seedPacksIfEmpty(DEFAULT_KNOWLEDGE_PACKS);
    return loadPacks() || DEFAULT_KNOWLEDGE_PACKS;
  });
  useEffect(() => { savePacks(knowledgePacks); }, [knowledgePacks]);
  const [showKnowledgePacksPanel, setShowKnowledgePacksPanel] = useState(false);
  const [editingPack, setEditingPack] = useState(null);
  // When the user hits the chat-attach overflow banner and clicks
  // "Create a Knowledge Pack", we preserve the File objects here so
  // the new-pack modal can prefill its docs list and run real
  // extraction — instead of dumping the user back into the panel
  // with no recollection of what they were trying to upload.
  const [overflowFilesForNewPack, setOverflowFilesForNewPack] = useState([]);
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
  // ─── Intent Artifact panel — Claude-style right rail ───
  // Card-intent results (Risk Memo, Clause Analysis, Summary, etc.) now
  // render inside this panel instead of inline in chat. find_document
  // keeps its FileResultsCard inline. Tracks the message id whose
  // cardData is currently open in the panel.
  const [activeArtifactMsgId, setActiveArtifactMsgId] = useState(null);
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
  // Single helper so every mutation handler ends with one line instead of
  // repeating `setToastMsg(...) + setTimeout(() => setToastMsg(''), 3200)`.
  // 3.2 s matches the timing every existing toast site uses; the bottom-
  // center navy pill at the end of the file is the only renderer.
  const toastTimerRef = useRef(null);
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 3200);
  }, []);
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
  // Per-thread "what was attached when you left this conversation"
  // snapshot: pack, vault doc, vault folder, sessionDocContext (the
  // accumulated document text from prior sends in this thread). Without
  // this, switching back to an earlier conversation lost every doc the
  // user had attached and the bot could no longer reference them. Keys
  // are thread ids; the entry is `null` when a thread has no context.
  const threadContextRef = useRef({});

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
  // Intent picker dropdown on the empty-state composer's green pill. Opens
  // a verb-bucketed list of every intent (no quick-start filtering — the
  // chips below are not a permanent removal).
  const [isIntentMenuOpen, setIsIntentMenuOpen] = useState(false);
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
  const intentMenuRef = useRef(null);
  const dropFileInputRef = useRef(null);
  // Promise-per-attachment for in-flight text extraction. sendMessage
  // awaits any unresolved promises before assembling messageForEdge so
  // the first turn doesn't ship the "Text extraction is still in
  // progress…" placeholder, which the LLM tends to interpret as
  // "no doc attached" and respond with the upload prompt.
  const extractionPromisesRef = useRef(new Map());
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

  const scrollToRunningPanel = useCallback(() => {
    setRunPanelOpen(true);
    setRunPanelFocusId(runningWorkflow?.id || null);
    requestAnimationFrame(() => {
      document.getElementById('workflow-run-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [runningWorkflow]);

  const inputPlaceholder = runningWorkflow
    ? 'Ask anything, or wait for your workflow to complete...'
    : 'Ask anything about your documents or Alaska law…';

  // ─── Chat Thread handlers ───
  const handleNewThread = useCallback(() => {
    // Save current thread messages before switching
    threadMessagesRef.current[activeThreadId] = messages;
    // Snapshot current thread's attached context so switching back
    // shows the docs / pack / folder the user had selected.
    threadContextRef.current[activeThreadId] = {
      activeKnowledgePack,
      activeVaultDocument,
      activeVaultFolder,
      sessionDocContext,
      activeIntent,
      hasManualIntentPick,
    };

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
    // Clear in-flight extraction promises tied to the prior thread —
    // otherwise the Map grows unbounded across thread switches and a
    // late resolve from a prior thread can write to the new thread's
    // pendingAttachments / vault unexpectedly.
    extractionPromisesRef.current.clear();
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
    // Snapshot current thread's attached context (pack / vault doc /
    // vault folder / sessionDocContext / intent) so coming back to
    // this thread restores the working state — not just the messages.
    threadContextRef.current[activeThreadId] = {
      activeKnowledgePack,
      activeVaultDocument,
      activeVaultFolder,
      sessionDocContext,
      activeIntent,
      hasManualIntentPick,
    };
    // Update thread metadata. Auto-derive title from first user msg
    // ONLY if the user hasn't explicitly renamed this thread — once
    // they rename, the title sticks.
    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        const firstUserMsg = messages.find(m => m.sender === 'user');
        const autoTitle = firstUserMsg
          ? (firstUserMsg.content.length > 50 ? firstUserMsg.content.substring(0, 50) + '...' : firstUserMsg.content)
          : t.title;
        return {
          ...t,
          isActive: false,
          title: t.userRenamed ? t.title : autoTitle,
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
    // Restore the target thread's attached context — or clear if none.
    const restored = threadContextRef.current[threadId];
    setActiveKnowledgePack(restored?.activeKnowledgePack || null);
    setActiveVaultDocument(restored?.activeVaultDocument || null);
    setActiveVaultFolder(restored?.activeVaultFolder || null);
    setSessionDocContext(restored?.sessionDocContext || null);
    setActiveIntent(restored?.activeIntent || DEFAULT_INTENT);
    setHasManualIntentPick(!!restored?.hasManualIntentPick);
    // Pending (uncommitted) attachments are tied to "what I'm about to
    // send" — they don't carry across thread switches.
    setPendingAttachments([]);
    extractionPromisesRef.current.clear();
    setInput('');
  }, [activeThreadId, messages, activeKnowledgePack, activeVaultDocument, activeVaultFolder, sessionDocContext, activeIntent, hasManualIntentPick]);

  const handleRenameThread = useCallback((threadId, newTitle) => {
    const trimmed = (newTitle || '').trim();
    if (!trimmed) return;
    // Mark `userRenamed: true` so the auto-title-from-first-message
    // logic in handleSwitchThread doesn't clobber it on the next switch.
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, title: trimmed, userRenamed: true } : t)));
    showToast(`Conversation renamed to "${trimmed}"`);
  }, [showToast]);

  const handleDeleteThread = useCallback((threadId) => {
    if (threads.length <= 1) return;
    const target = threads.find(t => t.id === threadId);
    delete threadMessagesRef.current[threadId];
    delete threadContextRef.current[threadId];
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
    showToast(target?.title && target.title !== 'New Conversation' ? `"${target.title}" deleted` : 'Conversation deleted');
  }, [threads, activeThreadId, showToast]);

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

  const sendMessage = useCallback(async (text, opts) => {
    const trimmed = (text || '').trim();
    if ((!trimmed && pendingAttachments.length === 0) || isTyping) return;
    const skipDocConfirmation = !!(opts && opts.skipDocConfirmation);
    const skipMultiIntentChoice = !!(opts && opts.skipMultiIntentChoice);
    // When the multi-intent gate's pick_intent re-fires sendMessage, the
    // user's original message bubble is ALREADY in the thread (added by
    // the gate when it first fired). Re-adding it would duplicate the
    // bubble — pass suppressUserMsg=true on re-fires to skip the append.
    const suppressUserMsg = !!(opts && opts.suppressUserMsg);
    // The multi-intent gate pick re-fires sendMessage *synchronously*
    // right after setActiveIntent(picked) + setHasManualIntentPick(true).
    // React hasn't re-rendered yet, so the closure-captured activeIntent
    // and hasManualIntentPick in this sendMessage call are STALE — both
    // auto-switch paths below would then mis-route to whatever keyword
    // matches the message body (Contract Review beats stale general_chat
    // on a message containing 'contract review'). forceIntent overrides
    // the captured activeIntent for this call and short-circuits both
    // auto-switch paths. Bug observed 2026-05-16: user clicked Clause
    // Analysis in the gate, system still ran Contract Review.
    const forceIntent = (opts && opts.forceIntent) || null;

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

    // ─── LLM intent classifier (2026-05-16) ─────────────────────────────
    // Replaces the brittle keyword detector for the primary routing
    // decision. Calls /api/chat with intent='classify' + a tight system
    // prompt; returns {primaryIntent, isMultiIntent, otherIntents,
    // confidence}. Latency budget 2.5 s — on timeout/failure we fall
    // back to the keyword detector so the user is never blocked.
    //
    // Skipped on chit-chat (no value in classifying "hi"), slash
    // commands (deterministic routing), and re-fires from a prior gate
    // pick (the user already chose).
    let classification = null;
    // Tracks whether we *attempted* the classifier and it returned null —
    // distinct from "didn't attempt at all" (skipped on chit-chat / slash
    // / short messages). Used to surface a discreet "(routing fallback
    // used)" indicator (Q8 decision 2026-05-16).
    let classifierAttempted = false;
    let classifierFallback = false;
    if (!skipMultiIntentChoice && !isChitChat && !trimmed.startsWith('/') && trimmed.length >= 8) {
      classifierAttempted = true;
      try {
        classification = await classifyIntent(trimmed, activeIntent, hasAnyDoc, { timeoutMs: 2500 });
      } catch { /* fall back to keyword detector */ }
      if (!classification) classifierFallback = true;
    }

    // ─── Doc-source confirmation for card intents ──────────────────────
    // When the user asks for a card-intent analysis AND there's already
    // a document in session context (prior turns or active vault doc),
    // ask whether to use the attached doc(s) or wait for a new upload.
    // Skipped on `opts.skipDocConfirmation = true` (the "Use attached"
    // button re-calls sendMessage with that flag set).
    //
    // Compute the will-be intent up front: even if activeIntent is
    // general_chat now, the hard-intent guardrail later in this function
    // will auto-switch when a card-intent keyword is in the message
    // ("Do clause analysis of attached doc" → clause_analysis). We must
    // ask the user about doc source BEFORE the auto-switch, otherwise
    // the confirmation skips and the bot silently picks docs.
    let willBeCardIntent = forceIntent || activeIntent;
    // Prefer the LLM classifier's primaryIntent when available — it
    // tolerates typos, synonyms, and paraphrases the keyword detector
    // can't handle. Falls back to keyword detection on classifier
    // failure / unavailable. Skipped entirely on forceIntent — the
    // caller already decided.
    if (forceIntent) {
      // explicit caller choice wins
    } else if (classification && classification.primaryIntent && classification.primaryIntent !== 'general_chat') {
      if (!hasManualIntentPick || activeIntent === 'general_chat') {
        willBeCardIntent = classification.primaryIntent;
      }
    } else if (!hasManualIntentPick && activeIntent === 'general_chat' && trimmed.length >= 10) {
      try {
        const detected = detectIntent(trimmed, 'general_chat');
        if (detected && detected !== 'general_chat') willBeCardIntent = detected;
      } catch { /* ignore */ }
    }
    // ─── Multi-intent clarification gate ────────────────────────────────
    // When the user's message reads as TWO+ distinct specific tasks
    // (e.g. "do clause analysis and then prepare a contract"), pause and
    // ask which to run first. The send pipeline is single-intent (one
    // system prompt, one schema, one response), and silently picking
    // one of the requested operations either drops the other half or
    // produces a mixed-schema output. Inline orchestration is out of
    // scope for now (Workflows is the dedicated chained-ops surface,
    // but the user's team isn't shipping there) — clarifying with the
    // user is the cheapest correct behaviour.
    //
    // Trigger: message has a sequence connector AND detectAllIntents
    // returns 2+ distinct specific intents each with >=2 keyword hits
    // (the >=2 floor prevents a single shared word like "document" from
    // triggering the gate on borderline single-task messages).
    // Skipped on chit-chat, slash commands, and re-fires from a prior
    // multi-intent pick (skipMultiIntentChoice=true).
    if (!skipMultiIntentChoice && !isChitChat && !trimmed.startsWith('/') && trimmed.length >= 12) {
      // Primary path: trust the LLM classifier's isMultiIntent flag.
      // Fallback: keyword + connector check when classifier didn't run.
      let gateChoices = null;
      if (classification && classification.isMultiIntent && classification.otherIntents.length > 0) {
        const ids = [classification.primaryIntent, ...classification.otherIntents]
          .filter((id) => id && id !== 'general_chat' && id !== 'legal_qa');
        const uniq = Array.from(new Set(ids)).slice(0, 4);
        if (uniq.length >= 2) {
          gateChoices = uniq.map((id) => ({ intentId: id, label: getIntentLabel(id) }));
        }
      }
      if (!gateChoices) {
        const SEQUENCE_CONNECTOR = /\b(?:and then|then|after that|after which|followed by|also|and|;|, then)\b/i;
        if (SEQUENCE_CONNECTOR.test(trimmed)) {
          try {
            const allMatches = detectAllIntents(trimmed);
            const specificMatches = allMatches.filter(
              (m) => m.intentId !== 'general_chat' && m.intentId !== 'legal_qa' && m.matchCount >= 1
            );
            if (specificMatches.length >= 2) {
              gateChoices = specificMatches.slice(0, 4).map((m) => ({
                intentId: m.intentId,
                label: getIntentLabel(m.intentId),
              }));
            }
          } catch { /* fall through */ }
        }
      }
      if (gateChoices) {
        if (showEmptyState) setShowEmptyState(false);
        const userMsg = { id: Date.now(), sender: 'user', content: trimmed, timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) };
        const confirmMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          sourceBadge: null,
          confirmation: {
            kind: 'multi_intent_pick',
            choices: gateChoices,
            pendingMessage: trimmed,
          },
        };
        setMessages((prev) => [...prev, userMsg, confirmMsg]);
        setSuggestedIntent(null);
        setSuggestedIntents([]);
        setDismissedSuggestion(null);
        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        return;
      }
    }

    // Doc-source confirmation only fires when MULTIPLE distinct docs are
    // attached (PM call 2026-05-16) — with a single doc the question
    // "use this one or upload new?" is noise: the user obviously
    // attached the one doc for a reason. Multi-doc still warrants the
    // ask so the user can pick which to analyse. Single-doc just runs.
    const _allDocNames = [
      ...((sessionDocContext?.docNames) || []),
      ...pendingAttachments.map((a) => a.name),
      activeVaultDocument?.name,
      activeVaultFolder ? `${activeVaultFolder.name} (folder)` : null,
    ].filter(Boolean);
    const _uniqueDocNames = Array.from(new Set(_allDocNames));
    const multipleDocsAttached = _uniqueDocNames.length >= 2;
    if (isCardIntent(willBeCardIntent) && multipleDocsAttached && !skipDocConfirmation && !isChitChat) {
      const uniqueDocNames = _uniqueDocNames;
      if (showEmptyState) setShowEmptyState(false);
      const userMsg = { id: Date.now(), sender: 'user', content: trimmed, timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) };
      const confirmMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        sourceBadge: null,
        confirmation: {
          kind: 'use_attached_or_new',
          intentLabel: getIntentLabel(willBeCardIntent),
          docNames: uniqueDocNames,
          pendingMessage: trimmed,
        },
      };
      setMessages((prev) => [...prev, userMsg, confirmMsg]);
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      return;
    }

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
      // Auto-open the artifact panel for demo card-intents too
      // (find_document keeps its inline list).
      if (intent !== 'find_document') {
        setActiveArtifactMsgId(botMsg.id);
      }
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
    if (!suppressUserMsg) setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSuggestedIntent(null);
    setSuggestedIntents([]);
    setDismissedSuggestion(null);
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setPendingAttachments([]);
    setIsTyping(true);
    setStreamingContent('');

    // ─── Classifier fallback indicator (Q8, 2026-05-16) ───
    // If we attempted the LLM classifier and got null back (timeout,
    // network failure, malformed response), surface a discreet system
    // note in the thread so the user knows routing accuracy may be
    // reduced for this turn. Distinct from "didn't attempt" (chit-chat
    // / slash / re-fires), which never shows this note.
    if (classifierFallback) {
      const fallbackNote = {
        id: Date.now() + 0.25,
        sender: 'bot',
        content: 'Routing classifier unavailable — used keyword fallback. Intent accuracy may be reduced for this message.',
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        sourceBadge: null,
        isSystemNote: true,
      };
      setMessages((prev) => [...prev, fallbackNote]);
    }

    // ─── Hard Intent Guardrail ───
    // If the user is in General Chat but their message clearly matches a specific intent,
    // auto-switch to that intent BEFORE calling the LLM.
    // This is a hard block — not a soft LLM prompt suggestion.
    // Skipped when the user manually picked General Chat from a pill or
    // dropdown — keyword detection would otherwise silently override the
    // deliberate choice and the populated-chat collapsed pill would flip
    // to a different intent label after send (PM-reported regression).
    let effectiveIntent = forceIntent || activeIntent;
    if (forceIntent) {
      // Caller pre-decided the intent (e.g. multi-intent gate pick).
      // Skip both auto-switch paths — the user just chose explicitly.
    } else if (!hasManualIntentPick && activeIntent === 'general_chat' && trimmed.length >= 10) {
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
    } else if (activeIntent !== 'general_chat' && trimmed.length >= 10 && !skipMultiIntentChoice) {
      // Cross-intent hard switch: user has a specific intent active (manual or
      // otherwise) but their message body strongly matches a *different*
      // specific intent (detectIntent enforces a +2 keyword margin). Honour
      // the message verb — switch the active intent rather than running the
      // task under the wrong system prompt + schema. Pre-2026-05-15 we injected
      // a soft `crossIntentNudge` HARD CONSTRAINT instead, but the LLM
      // routinely ignored it and produced clause-analysis output while the
      // pill still read "Contract Review" — reported by Arjun.
      //
      // Skipped when re-firing from a multi-intent pick — the user just
      // deliberately chose one of N intents present in the message; the
      // hard switch would immediately flip them off it.
      // Prefer the classifier's confident primaryIntent over the keyword
      // detector's +2 margin rule — the classifier handles paraphrases and
      // typos the keyword detector can't. Fall back to keyword detection on
      // classifier failure / low confidence.
      let detectedMatch = null;
      if (
        classification &&
        classification.primaryIntent &&
        classification.primaryIntent !== activeIntent &&
        classification.primaryIntent !== 'general_chat' &&
        classification.confidence >= 0.7
      ) {
        detectedMatch = classification.primaryIntent;
      } else {
        detectedMatch = detectIntent(trimmed, activeIntent);
      }
      if (detectedMatch && detectedMatch !== activeIntent) {
        effectiveIntent = detectedMatch;
        setActiveIntent(detectedMatch);
        const switchLabel = getIntentLabel(detectedMatch);
        const switchNote = {
          id: Date.now() + 0.5,
          sender: 'bot',
          content: `Switched to **${switchLabel}** mode — your message reads as a ${switchLabel.toLowerCase()} task.`,
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
    let allAttachedDocs = (userMsg.attachments || []).filter((a) => a.kind === 'doc' || a.kind === undefined);
    // Wait for any in-flight text extractions to complete before building
    // the Edge message — otherwise the first send ships the "extraction
    // in progress" placeholder and the LLM treats it as "no doc". Cap at
    // 12 s so a stuck extractor can't hang the whole send.
    if (allAttachedDocs.some((a) => !a.content)) {
      const pendingIds = allAttachedDocs.filter((a) => !a.content).map((a) => a.id);
      const pendingPromises = pendingIds
        .map((id) => extractionPromisesRef.current.get(id))
        .filter(Boolean);
      if (pendingPromises.length) {
        const TIMEOUT_MS = 12000;
        await Promise.race([
          Promise.all(pendingPromises),
          new Promise((res) => setTimeout(res, TIMEOUT_MS)),
        ]).catch(() => {});
        // Re-resolve content from each promise (state may not have
        // applied yet inside this same async tick).
        allAttachedDocs = await Promise.all(allAttachedDocs.map(async (a) => {
          if (a.content) return a;
          const p = extractionPromisesRef.current.get(a.id);
          if (!p) return a;
          try {
            const text = await Promise.race([
              p,
              new Promise((res) => setTimeout(() => res(null), TIMEOUT_MS)),
            ]);
            return text ? { ...a, content: text } : a;
          } catch { return a; }
        }));
      }
    }
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

    // Knowledge Pack content — folded INTO the same `[Documents attached
    // to this conversation]` block as user uploads / vault picks, but
    // sub-labelled so the model can distinguish "reference material from
    // the user's pack" from "documents the user just attached". This
    // matters when the user wants to compare/measure their doc against
    // the pack (e.g. "review my case against the attached real-estate
    // laws"). Both layers are document content for grounding purposes
    // — they just play different roles in the analysis.
    let packDocsBlock = '';
    let packHasAnyContent = false;
    if (activeKnowledgePack && Array.isArray(activeKnowledgePack.docs) && activeKnowledgePack.docs.length > 0) {
      const PER_PACK_DOC_CAP = 5000;
      const pieces = activeKnowledgePack.docs.map((d) => {
        const raw = d.content || '';
        const txt = raw.slice(0, PER_PACK_DOC_CAP);
        if (!txt.trim()) return `## ${d.name}\n[No extracted text available for this file.]`;
        packHasAnyContent = true;
        return `## ${d.name}\n${txt}${raw.length > PER_PACK_DOC_CAP ? '\n[... truncated ...]' : ''}`;
      });
      packDocsBlock = `--- Reference material from the Knowledge Pack "${activeKnowledgePack.name}" ---\n${pieces.join('\n\n')}`;
    }

    // Pack reference first (background frame), then user's own attached
    // documents (the subject of analysis). The "ROLES" framing is
    // explicit so the model knows what to compare against what.
    const userDocsBlock = effectiveDocContext
      ? `--- Documents the user attached for this conversation ---\n${effectiveDocContext}`
      : '';
    const mergedDocsForEdge = [packDocsBlock, userDocsBlock].filter(Boolean).join('\n\n');

    // (b) When user sends purely an attachment with no typed text, substitute a default question so the Edge guard passes.
    const effectiveQuestion = trimmed || (mergedDocsForEdge ? 'Please review the attached document(s) and summarise what you find.' : '');
    const docsHeader = mergedDocsForEdge
      ? `[Documents attached to this conversation]\n${mergedDocsForEdge}\n\n[User question]\n`
      : '';
    let messageForEdge = (docsHeader + effectiveQuestion).trim();

    // Diagnostic log — visible in DevTools console. Lets us verify
    // what's actually being shipped to the Edge when grounding looks
    // wrong on the user side. Cheap; no PII concerns since the user's
    // own attachments are echoed only in length, not in content.
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[ChatView] sendMessage → Edge', {
        activeKnowledgePack: activeKnowledgePack
          ? {
              id: activeKnowledgePack.id,
              name: activeKnowledgePack.name,
              docCount: activeKnowledgePack.docs?.length || 0,
              docContentLengths: (activeKnowledgePack.docs || []).map((d) => ({
                name: d.name,
                contentLength: (d.content || '').length,
                hasContent: !!(d.content && d.content.trim()),
              })),
              packHasAnyContent,
            }
          : null,
        hasUserUploads: !!mergedDocContent,
        hasVaultSelection: !!vaultSelectionContext,
        mergedDocsLength: mergedDocsForEdge.length,
        messageForEdgeLength: messageForEdge.length,
        messageForEdgePreview: messageForEdge.slice(0, 600),
      });
    }
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
            // Signal to the Edge that a document IS attached so its
            // MISSING_DOCUMENT_HANDLING fallback can't fire (the LLM
            // otherwise sometimes ignores inlined doc content on
            // ambiguous messages and asks the user to upload — even
            // though the upload is already there). True when there's
            // anything stitched into the [Documents attached] block.
            docAttached: !!(mergedDocContent && mergedDocContent.length > 0),
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
      // Auto-open the artifact side panel for card-intent responses
      // (skip find_document — its results read better inline as a list).
      if (cardData && isCardIntent(botIntent) && botIntent !== 'find_document') {
        setActiveArtifactMsgId(botMsg.id);
      }
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
      // ─── Overflow check FIRST (before unsupported / oversize filtering) ──
      // Otherwise dropping 6 files where 1 is unsupported leaves 5 valid
      // and the cap appears to "pass" — the user never sees the offer to
      // bundle into a Knowledge Pack even though they tried to attach >5.
      const currentDocCount = pendingAttachments.filter(a => a.kind === 'doc').length;
      if (currentDocCount + files.length > MAX_CHAT_ATTACHMENTS) {
        setAttachLimitOverflow({ files: [...files], currentCount: currentDocCount });
        return; // Don't add to pending — user has to make a choice
      }

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
        const id = newAtts[i].id;
        // Store the promise so sendMessage can await it on the very
        // first send (before pendingAttachments state has the content).
        const promise = extractFileText(file).then(({ text }) => {
          setPendingAttachments(prev => prev.map(a =>
            a.id === id ? { ...a, content: text } : a
          ));
          const vaultId = vaultIdByFileName.get(file.name);
          if (vaultId && text) {
            setDocumentVault(prev => prev.map(d =>
              d.id === vaultId && !d.content ? { ...d, content: text } : d
            ));
          }
          return text;
        }).catch((err) => {
          console.error('File extraction failed:', err);
          const fallback = `[File: ${file.name}] Could not extract text.`;
          setPendingAttachments(prev => prev.map(a =>
            a.id === id ? { ...a, content: fallback } : a
          ));
          return fallback;
        });
        extractionPromisesRef.current.set(id, promise);
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
    showToast(`"${doc.name}" attached to chat`);
  }, [sessionDocContext, showToast]);

  // Folder attach: mutually exclusive with single-doc attach.
  // Skip the version-banner gate — folders are a coarser context
  // selection, treated like swapping a Knowledge Pack mid-thread.
  const handleSelectVaultFolder = useCallback((folder) => {
    setActiveVaultFolder(folder);
    setActiveVaultDocument(null);
    showToast(`Folder "${folder.name}" attached to chat`);
  }, [showToast]);

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
    showToast(`Folder "${trimmed}" created`);
  }, [currentUserId, operator, showToast]);

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
        showToast(`Uploaded ${total} ${total === 1 ? 'file' : 'files'} with folder structure preserved`);
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
    showToast(`Folder renamed to "${trimmed}"`);
  }, [activeVaultFolder, showToast]);

  const handleDeleteVaultFolder = useCallback((folderId) => {
    let removedName = '';
    setVaultFolders((prev) => {
      // Re-parent any direct child folders to the deleted folder's
      // parent so the subtree doesn't orphan. Docs inside child folders
      // keep their folderId — they're still findable via the lifted
      // child folder. Docs that were in the *deleted* folder itself
      // get unset (handled in setDocumentVault below).
      const target = prev.find((f) => f.id === folderId);
      removedName = target?.name || '';
      const newParent = target?.parentId ?? null;
      return prev
        .filter((f) => f.id !== folderId)
        .map((f) => (f.parentId === folderId ? { ...f, parentId: newParent } : f));
    });
    setDocumentVault((prev) => prev.map((d) => (d.folderId === folderId ? { ...d, folderId: null } : d)));
    if (activeVaultFolder?.id === folderId) setActiveVaultFolder(null);
    showToast(removedName ? `Folder "${removedName}" deleted` : 'Folder deleted');
  }, [activeVaultFolder, showToast]);

  const handleSelectKnowledgePack = useCallback((pack) => {
    setActiveKnowledgePack(pack);
    showToast(`Knowledge pack "${pack.name}" attached to chat`);
  }, [showToast]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isIntentDropdownOpen) { setIsIntentDropdownOpen(false); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleSavePack = (data) => {
    let wasEdit = false;
    setKnowledgePacks(prev => {
      // Defensive: only treat as edit if the id actually exists in the
      // current list. A stale id from a closed-then-reopened modal — or
      // a call site that pre-assigns ids — would otherwise be silently
      // dropped by .map() (the bug behind 2026-05-07's "create doesn't
      // work" report).
      const idx = data.id ? prev.findIndex(p => p.id === data.id) : -1;
      if (idx >= 0) {
        wasEdit = true;
        return prev.map((p, i) => i === idx ? { ...p, ...data } : p);
      }
      const newPack = {
        ...data,
        id: data.id || Date.now(),
        createdAt: data.createdAt || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      return [newPack, ...prev];
    });
    showToast(wasEdit ? `Knowledge pack "${data.name}" updated` : `Knowledge pack "${data.name}" created`);
  };

  const handleDeletePack = (id) => {
    let removedName = '';
    setKnowledgePacks(prev => {
      const target = prev.find(p => p.id === id);
      removedName = target?.name || '';
      return prev.filter(p => p.id !== id);
    });
    if (activeKnowledgePack?.id === id) setActiveKnowledgePack(null);
    showToast(removedName ? `Knowledge pack "${removedName}" deleted` : 'Knowledge pack deleted');
  };

  const handleSaveDocument = (data) => {
    let wasEdit = false;
    setDocumentVault(prev => {
      const exists = prev.some(d => d.id === data.id);
      if (exists) {
        wasEdit = true;
        return prev.map(d => d.id === data.id ? { ...d, ...data } : d);
      }
      return [data, ...prev];
    });
    showToast(wasEdit ? `"${data.name}" updated in YourVault` : `"${data.name}" added to YourVault`);
  };

  const handleDeleteDocument = (id) => {
    let removedName = '';
    setDocumentVault(prev => {
      const target = prev.find(d => d.id === id);
      removedName = target?.name || '';
      return prev.filter(d => d.id !== id);
    });
    if (activeVaultDocument?.id === id) setActiveVaultDocument(null);
    showToast(removedName ? `"${removedName}" deleted from YourVault` : 'Document deleted');
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
    showToast(`Prompt template "${data.title}" created`);
  };

  const handleDeletePrompt = (id) => {
    let removedTitle = '';
    setPromptTemplates(prev => {
      const target = prev.find(t => t.id === id);
      removedTitle = target?.title || '';
      return prev.filter(t => t.id !== id);
    });
    showToast(removedTitle ? `Prompt template "${removedTitle}" deleted` : 'Prompt template deleted');
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
    showToast(`Client "${data.name}" added`);
  };

  const handleDeleteClient = (id) => {
    let removedName = '';
    setClients(prev => {
      const target = prev.find(c => c.id === id);
      removedName = target?.name || '';
      return prev.filter(c => c.id !== id);
    });
    showToast(removedName ? `Client "${removedName}" removed` : 'Client removed');
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
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, color: 'var(--navy)', margin: 0 }}>{title}</h1>
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
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: 'var(--navy)', margin: '0 0 8px' }}>Still there?</h3>
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
    setShowOrgDashboard(false);
    setShowBillingPanel(false);
    setShowAuditLogsPanel(false);
    setEditingWorkflow(null);
  };

  const sidebarActiveKey = (() => {
    if (showOrgDashboard) return 'org-dashboard';
    if (showBillingPanel) return 'billing';
    if (showAuditLogsPanel) return 'audit-logs';
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
        onOpenOrgDashboard={() => { closeAllPanels(); setShowOrgDashboard(true); setSidebarOpen(false); }}
        onOpenChat={() => { closeAllPanels(); setSidebarOpen(false); navigate('/chat'); }}
        onOpenPromptTemplates={() => { closeAllPanels(); setShowPromptPanel(true); setSidebarOpen(false); }}
        onOpenClients={() => { closeAllPanels(); setShowClientsPanel(true); setSidebarOpen(false); }}
        onOpenKnowledgePacks={() => { closeAllPanels(); setShowKnowledgePacksPanel(true); setSidebarOpen(false); }}
        onOpenDocumentVault={() => { closeAllPanels(); setShowDocumentVaultPanel(true); setSidebarOpen(false); }}
        onOpenInviteTeam={() => { closeAllPanels(); setShowTeamPage(true); setSidebarOpen(false); }}
        onOpenAuditLogs={() => { closeAllPanels(); setShowAuditLogsPanel(true); setSidebarOpen(false); }}
        onOpenBilling={() => { closeAllPanels(); setShowBillingPanel(true); setSidebarOpen(false); }}
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
        onRenameThread={handleRenameThread}
        threadSearch={threadSearch}
        onThreadSearchChange={setThreadSearch}
        onSignOut={async () => { await session.signOut(); navigate('/chat/login'); }}
      />
      {/* Chat main area — hidden when a full-page panel (Team / Workspaces /
          Workflows / Vault / Knowledge Packs / Workflow Builder) is active
          so the sidebar stays visible but the chat UI is replaced. */}
      <div style={{ flex: 1, display: (showOrgDashboard || showBillingPanel || showAuditLogsPanel || showTeamPage || showWorkspacesPanel || showWorkflowsPanel || editingWorkflow || showDocumentVaultPanel || showKnowledgePacksPanel || showPromptPanel) ? 'none' : 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopNav plan={plan} usage={usage} onOpenSidebar={() => setSidebarOpen(true)} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: showEmptyState ? '#fbf8ef' : 'var(--cream)', minHeight: 0 }}>
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
              {runningWorkflow?.status === 'running' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    margin: '8px 16px 16px',
                    padding: '8px 12px',
                    background: '#EAF3DE',
                    border: '0.5px solid #639922',
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#2A9D6E',
                      animation: 'pulse 1.4s infinite',
                      flexShrink: 0,
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#27500A', flex: 1 }}>
                    {(runningWorkflow.templateName || 'Workflow')} is running — step {Math.min((runningWorkflow.currentStepIndex ?? 0) + 1, runningWorkflow.steps?.length || 1)} of {runningWorkflow.steps?.length || 1}
                  </span>
                  <button
                    onClick={scrollToRunningPanel}
                    style={{
                      fontSize: 11,
                      color: '#3B6D11',
                      fontWeight: 500,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                    }}
                  >
                    View progress →
                  </button>
                </div>
              )}
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
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onOpenArtifact={(id) => setActiveArtifactMsgId(id)}
                  isActiveArtifact={activeArtifactMsgId === msg.id}
                  onConfirmAction={(action) => {
                    if (action.kind === 'use_attached') {
                      // Replace the confirmation message with a friendlier
                      // "OK, running" note + re-run sendMessage with the
                      // skip-confirmation flag so the analysis actually runs.
                      setMessages((prev) => prev.map((m) => m.id === action.msgId ? {
                        ...m,
                        confirmation: undefined,
                        content: `Running on the attached document${m.confirmation?.docNames?.length === 1 ? '' : 's'}…`,
                      } : m));
                      sendMessage(action.message, { skipDocConfirmation: true });
                    } else if (action.kind === 'upload_new') {
                      setMessages((prev) => prev.map((m) => m.id === action.msgId ? {
                        ...m,
                        confirmation: undefined,
                        content: 'OK — drop the new document via the **+** button or the drop zone below the input, then send your request again.',
                      } : m));
                    } else if (action.kind === 'pick_intent') {
                      // Pin the chosen intent (with manual-pick flag so the
                      // general_chat auto-switch path won't override later),
                      // collapse the choice prompt into a friendly "Running"
                      // note, then re-fire sendMessage with skipMultiIntentChoice
                      // so the gate doesn't re-trigger on the same message.
                      setActiveIntent(action.intentId);
                      setHasManualIntentPick(true);
                      setMessages((prev) => prev.map((m) => m.id === action.msgId ? {
                        ...m,
                        confirmation: undefined,
                        content: `Running **${action.label}** on your request…`,
                      } : m));
                      sendMessage(action.message, { skipMultiIntentChoice: true, suppressUserMsg: true, forceIntent: action.intentId });
                    }
                  }}
                />
              ))}
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
                        // Open the new-pack modal directly with the files the
                        // user just tried to attach — modal kicks off real
                        // extraction on each one and the user only has to
                        // name the pack + Save.
                        setOverflowFilesForNewPack([...attachLimitOverflow.files]);
                        setEditingPack({ isNew: true });
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
          <div className="px-4 sm:px-6" style={{ background: 'transparent', paddingTop: showEmptyState ? 0 : 12, paddingBottom: 12, maxWidth: showEmptyState ? 820 : 880, width: '100%', marginLeft: 'auto', marginRight: 'auto', boxSizing: 'border-box' }}>
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
                      <button onClick={() => { const n = activeKnowledgePack.name; setActiveKnowledgePack(null); showToast(`Knowledge pack "${n}" detached`); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--navy)' }}><X size={13} /></button>
                    </div>
                  )}
                  {activeVaultDocument && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(10, 36, 99, 0.06)', border: '1px solid rgba(10, 36, 99, 0.25)' }}>
                      <File size={13} style={{ color: 'var(--navy)' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--navy)' }}>Using: {activeVaultDocument.name}</span>
                      <button onClick={() => { const n = activeVaultDocument.name; setActiveVaultDocument(null); showToast(`"${n}" detached`); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--navy)' }}><X size={13} /></button>
                    </div>
                  )}
                  {activeVaultFolder && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(10, 36, 99, 0.06)', border: '1px solid rgba(10, 36, 99, 0.25)' }}>
                      <Folder size={13} style={{ color: 'var(--navy)' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--navy)' }}>
                        Using folder: {activeVaultFolder.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({folderDocCount} {folderDocCount === 1 ? 'doc' : 'docs'})</span>
                      </span>
                      <button onClick={() => { const n = activeVaultFolder.name; setActiveVaultFolder(null); showToast(`Folder "${n}" detached`); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--navy)' }}><X size={13} /></button>
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
              /* ─── EMPTY-STATE COMPOSER — beige block per yourai-pages-build/chat.html ───
                  Composer block (beige) contains: green Legal Q&A intent pill at top,
                  white textarea in the middle, and an actions row at the bottom with
                  Source pill (left) + Pack pill ⌘ (right) + navy send circle.
                  Below the composer: a separate beige upload bar, then 4 quick-chip
                  pills with green dots, then the footer disclaimer.
                  Hidden legacy popovers (vaultAttachRef) are mounted at the end so
                  their refs stay alive without rendering. */
              <>
                {/* ─── Composer block (beige #efe9d8, radius 20) ─── */}
                <div style={{
                  width: '100%', background: '#efe9d8', borderRadius: 20,
                  padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  {/* Green "Legal Q&A" intent pill — opens verb-bucketed intent picker */}
                  <div style={{ position: 'relative', width: 'fit-content' }} ref={intentMenuRef}>
                    <button
                      onClick={() => setIsIntentMenuOpen(v => !v)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '6px 14px', borderRadius: 999,
                        background: '#e2dcc6', border: '1px solid #c8c1a6',
                        color: 'var(--green-text)', fontSize: 13, fontWeight: 500,
                        fontFamily: 'inherit', cursor: 'pointer', lineHeight: 1,
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
                      {getIntentLabel(activeIntent)}
                      <ChevronDown size={12} style={{ color: 'var(--green-text)', transform: isIntentMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                    </button>
                    {isIntentMenuOpen && (
                      <>
                        <div onClick={() => setIsIntentMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                        {/* Dropdown opens DOWNWARD — the intent pill is at the
                            top of the composer, so opening upward would push the
                            tall menu (12 intents + 4 bucket headers ≈ 500 px)
                            past the viewport top. Opening downward briefly covers
                            the textarea, but the menu is transient (closes on
                            pick) and the lighter chrome keeps it from feeling
                            heavy. */}
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                          width: 280, backgroundColor: '#fff', borderRadius: 12,
                          border: '1px solid #e6e7ec',
                          boxShadow: '0 12px 32px rgba(15,28,63,0.10)',
                          padding: 8, zIndex: 51, maxHeight: 380, overflowY: 'auto',
                        }}>
                          {groupIntentsByBucket(INTENTS.map((i) => i.id)).map((bucket) => {
                            const dotColor = BUCKET_COLORS[bucket.label] || 'var(--text-muted)';
                            return (
                              <div key={bucket.label}>
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '8px 12px 4px',
                                  fontSize: 10.5, color: 'var(--text-muted)',
                                  fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase',
                                }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                                  {bucket.label}
                                </div>
                                {bucket.intents.map((intent) => {
                                  const isCurrent = activeIntent === intent.id;
                                  return (
                                    <div key={intent.id}
                                      onClick={() => { setActiveIntent(intent.id); setHasManualIntentPick(true); setIsIntentMenuOpen(false); }}
                                      style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                        fontSize: 14, color: 'var(--text-primary)',
                                        fontWeight: isCurrent ? 500 : 400,
                                        background: isCurrent ? 'var(--gold-bg)' : 'transparent',
                                      }}
                                      onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = '#fafafa'; }}
                                      onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                      <span>{intent.label}</span>
                                      {isCurrent && <Check size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* White textarea card */}
                  <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px' }}>
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
                      placeholder="Ask anything about your documents or Alaska law..."
                      rows={1}
                      style={{
                        width: '100%', border: 'none', outline: 'none', resize: 'none',
                        fontFamily: 'inherit', fontSize: 15.5, fontStyle: input ? 'normal' : 'italic',
                        color: input ? 'var(--text-primary)' : 'var(--text-secondary)',
                        background: 'transparent', lineHeight: 1.4, minHeight: 28, maxHeight: 200, overflowY: 'auto',
                      }}
                      onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
                    />
                  </div>

                  {/* Actions row: scope (left) · pack + send (right) — all 40px tall */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    {/* LEFT: File Search scope pill */}
                    <div style={{ position: 'relative' }} ref={scopeInputRef}>
                      <button
                        onClick={() => setIsScopeOpenInput(v => !v)}
                        style={{
                          height: 40, display: 'inline-flex', alignItems: 'center', gap: 8,
                          padding: '0 16px', borderRadius: 999,
                          border: '1px solid #cfc8b1', background: '#fff',
                          fontFamily: 'inherit', fontSize: 13.5, color: 'var(--text-primary)',
                          cursor: 'pointer', lineHeight: 1,
                        }}
                      >
                        {(() => {
                          const Icon = getScopeOption(searchScope).icon;
                          return <Icon size={14} style={{ flexShrink: 0 }} />;
                        })()}
                        {getScopeOption(searchScope).label}
                        <ChevronDown size={12} style={{ flexShrink: 0, transform: isScopeOpenInput ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                      </button>
                      {isScopeOpenInput && (
                        <>
                          <div onClick={() => setIsScopeOpenInput(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                          {/* Matches chat-active.html .src-dropdown — white bg,
                              gold-bg selected row, 28px icon column, name +
                              description body, gold check on the right. */}
                          <div style={{
                            position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
                            width: 280, backgroundColor: '#fff', borderRadius: 12,
                            border: '1px solid #e6e7ec',
                            boxShadow: '0 12px 32px rgba(15,28,63,0.10)',
                            padding: 8, zIndex: 51,
                          }}>
                            <div style={{
                              padding: '8px 12px 4px',
                              fontSize: 10.5, color: 'var(--text-muted)',
                              fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase',
                            }}>Search within</div>
                            {SCOPE_OPTIONS.map((opt) => {
                              const isCurrent = opt.id === searchScope;
                              const Icon = opt.icon;
                              return (
                                <div key={opt.id}
                                  onClick={() => {
                                    setIsScopeOpenInput(false);
                                    if (opt.id === 'vault') { setIsVaultPickerModalOpen(true); return; }
                                    if (opt.id === 'packs') { setIsPackPickerModalOpen(true); return; }
                                    setSearchScope(opt.id);
                                  }}
                                  style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 12,
                                    padding: '11px 12px', borderRadius: 8, cursor: 'pointer',
                                    background: isCurrent ? 'var(--gold-bg)' : 'transparent',
                                  }}
                                  onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = '#fafafa'; }}
                                  onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <div style={{
                                    width: 28, height: 28, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-primary)', flexShrink: 0,
                                  }}>
                                    <Icon size={18} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                                      <span>{opt.label}</span>
                                      {isCurrent && <Check size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4 }}>{opt.sub}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* RIGHT: KP pill + send button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => setIsPackPickerModalOpen(true)}
                        style={{
                          height: 40, display: 'inline-flex', alignItems: 'center', gap: 8,
                          padding: '0 16px', borderRadius: 999,
                          border: '1px solid #cfc8b1', background: '#fff',
                          fontFamily: 'inherit', fontSize: 13.5, color: 'var(--text-primary)',
                          cursor: 'pointer', lineHeight: 1, maxWidth: 260,
                        }}
                      >
                        <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1 }}>⌘</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {activeKnowledgePack ? activeKnowledgePack.name : 'Knowledge pack'}
                        </span>
                        <ChevronDown size={12} style={{ flexShrink: 0 }} />
                      </button>
                      {(() => {
                        const canSend = (input.trim() || pendingAttachments.length > 0) && !isTyping;
                        return (
                          <button
                            onClick={() => canSend && sendMessage(input)}
                            style={{
                              height: 40, width: 40, flexShrink: 0, borderRadius: '50%',
                              background: 'var(--navy)', color: '#fff', border: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: canSend ? 'pointer' : 'default',
                              opacity: canSend ? 1 : 0.45, transition: 'opacity 150ms',
                            }}
                          >
                            <ArrowUp size={16} color="#fff" />
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* ─── Upload bar (separate beige strip below composer) ─── */}
                <div
                  onClick={() => dropFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); if (!isFileDropHover) setIsFileDropHover(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsFileDropHover(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsFileDropHover(false);
                    const files = Array.from(e.dataTransfer?.files || []);
                    const looksLikeFolder = files.length === 0 && Array.from(e.dataTransfer?.items || []).some((it) => it.kind === 'file');
                    if (looksLikeFolder) {
                      setMessages((prev) => [...prev, {
                        id: Date.now(),
                        sender: 'bot',
                        content: '**Folders aren\'t supported in chat attach.** Drop individual files here, or upload the folder to **YourVault** first (the vault preserves folder structure) and then attach a doc or the whole folder from there.',
                        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
                      }]);
                      return;
                    }
                    if (files.length) handleAttachFiles(files, 'doc');
                  }}
                  style={{
                    marginTop: 12, width: '100%',
                    background: isFileDropHover ? '#e7e0cb' : '#efe9d8',
                    borderRadius: 16,
                    padding: '14px 22px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background 150ms',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: 13.5 }}>
                    <Upload size={14} />
                    Upload new files
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12.5, letterSpacing: '0.3px' }}>
                    PDF · DOCX · TXT · max 25MB
                  </span>
                </div>

                {/* ─── Quick chips (4 white pills with green dots) ─── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { label: 'General Chat', intent: 'general_chat', prefill: '' },
                    { label: 'Review a contract', intent: 'contract_review', prefill: 'Review this contract and flag any one-sided provisions, unusual liability caps, or missing standard protections I should push back on. Structure your response as: 1) high-risk issues, 2) medium-risk issues, 3) recommended redlines.' },
                    { label: 'Summarize a document', intent: 'document_summarisation', prefill: 'Summarise this document in three sections: (1) Key obligations and deadlines, (2) Risk areas and ambiguities, (3) Recommended next steps. Keep each section under 100 words.' },
                    { label: 'Draft an email', intent: 'email_letter_drafting', prefill: 'Draft a professional email to opposing counsel requesting a seven-day extension on the upcoming deadline. Keep the tone courteous but firm, under 120 words, and include a brief reason tied to document review workload.' },
                  ].map((chip) => (
                    <button
                      key={chip.intent}
                      onClick={() => {
                        setActiveIntent(chip.intent);
                        setHasManualIntentPick(true);
                        if (chip.prefill) setInput(chip.prefill);
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 16px', borderRadius: 999,
                        border: '1px solid var(--chip-border)', background: '#fff',
                        fontFamily: 'inherit', fontSize: 13, color: 'var(--text-primary)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* ─── Footer note ─── */}
                <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                  YourAI may produce inaccurate information. Always verify critical outputs.{' '}
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Private &amp; encrypted.</span>
                </div>

                {/* Legacy popovers — mounted hidden so the existing refs
                    (vaultAttachRef, kpMenuRef, emptyMoreRef) stay alive
                    without rendering. They're no longer triggered from the
                    visible UI, but click handlers elsewhere still reference
                    their state setters. */}
                <div style={{ display: 'none' }} ref={vaultAttachRef} />
                <div style={{ display: 'none' }} ref={kpMenuRef} />
                <div style={{ display: 'none' }} ref={emptyMoreRef} />
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
                      fontSize: 12, fontFamily: "inherit", color: 'var(--text-muted)',
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
                  border: '1px solid #d9dbe1', borderRadius: 14, background: '#fff',
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
                        onClick={() => dropFileInputRef.current?.click()}
                        title="Upload a file from your computer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 10px', borderRadius: 999,
                          fontSize: 12, fontWeight: 500,
                          border: activeVaultDocument ? '1.5px solid var(--navy)' : '1px solid var(--border)',
                          background: activeVaultDocument ? 'rgba(15, 28, 63, 0.05)' : '#fff',
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
                        onPickPack={() => setIsPackPickerModalOpen(true)}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Anchor pill (knowledge pack) — gold tint, visible only when active. */}
                      {activeKnowledgePack && (
                        <button
                          onClick={() => setIsPackPickerModalOpen(true)}
                          title={activeKnowledgePack.name}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '7px 12px', borderRadius: 999,
                            fontSize: 13, fontWeight: 500,
                            border: '1px solid var(--gold-border)', background: 'var(--gold-bg)',
                            color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap',
                            maxWidth: 180,
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {activeKnowledgePack.name.length > 14 ? `${activeKnowledgePack.name.slice(0, 14)}…` : activeKnowledgePack.name}
                          </span>
                          <ChevronDown size={11} style={{ flexShrink: 0 }} />
                        </button>
                      )}

                      {/* Mode pill — colored bucket border + dot. */}
                      <div style={{ position: 'relative' }} ref={intentDropdownRef}>
                        {(() => {
                          const bucket = getBucketForIntent(activeIntent);
                          const bucketColor = bucket ? BUCKET_COLORS[bucket] : '#8a8f9c';
                          return (
                            <button
                              onClick={() => setIsIntentDropdownOpen(v => !v)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 7,
                                padding: '6px 12px', borderRadius: 999,
                                fontSize: 12.5, fontWeight: 500,
                                border: `1.5px solid ${bucketColor}`,
                                backgroundColor: 'white', color: 'var(--text-primary)',
                                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                              }}
                            >
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: bucketColor, flexShrink: 0 }} />
                              {getIntentLabel(activeIntent)}
                              <ChevronDown size={11} style={{ transform: isIntentDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
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
                                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
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
                          <div onClick={() => canSend && sendMessage(input)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canSend ? 'pointer' : 'default', flexShrink: 0, opacity: canSend ? 1 : 0.45, transition: 'opacity 150ms' }}><ArrowUp size={16} color="#fff" /></div>
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
                  // Folder drops produce items in dataTransfer.items (kind="file"
                  // and webkitGetAsEntry().isDirectory) but yield nothing in .files.
                  // Detect that case and steer the user toward YourVault, which
                  // already has folder-upload support.
                  const looksLikeFolder = files.length === 0 && Array.from(e.dataTransfer?.items || []).some((it) => it.kind === 'file');
                  if (looksLikeFolder) {
                    setMessages((prev) => [...prev, {
                      id: Date.now(),
                      sender: 'bot',
                      content: '**Folders aren\'t supported in chat attach.** Drop individual files here, or upload the folder to **YourVault** first (the vault preserves folder structure) and then attach a doc or the whole folder from there.',
                      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
                    }]);
                    return;
                  }
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
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', fontFamily: "inherit" }}>
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

          </div>

        </div>
      </div>

      {/* ─── Workflow Run Panel — docked to the right of the chat.
          Shows progress while a run is active and the report when it
          completes. Hidden by default; opens automatically when a new
          run starts and from the sidebar running-strip. Does not
          overlay — it shrinks the chat area so users can keep chatting
          while the workflow runs. ─── */}
      {runPanelOpen && !showOrgDashboard && !showBillingPanel && !showAuditLogsPanel && !showTeamPage && !showWorkspacesPanel && !showWorkflowsPanel && !editingWorkflow && (
        <WorkflowRunPanel
          userId={currentUserId}
          focusRunId={runPanelFocusId}
          onSummariseInChat={(prompt) => sendMessage(prompt)}
          onRunAnother={() => {
            setRunPanelOpen(false);
            setRunPanelFocusId(null);
            setShowTeamPage(false);
            setShowWorkspacesPanel(false);
            setShowWorkflowsPanel(true);
          }}
          onClose={() => { setRunPanelOpen(false); setRunPanelFocusId(null); }}
        />
      )}

      {/* ─── Intent Artifact panel — Claude-style right rail for card
          intents (Risk Memo, Summary, Comparison, Case Brief, Research,
          Clause Analysis, Timeline). Sits as a sibling of chat-main so
          the chat shrinks when open. find_document stays inline. ─── */}
      {(() => {
        if (!activeArtifactMsgId) return null;
        if (showOrgDashboard || showTeamPage || showWorkspacesPanel || showWorkflowsPanel || editingWorkflow || showDocumentVaultPanel || showKnowledgePacksPanel) return null;
        const artifactMsg = messages.find((m) => m.id === activeArtifactMsgId);
        if (!artifactMsg || !artifactMsg.cardData || !isCardIntent(artifactMsg.intent) || artifactMsg.intent === 'find_document') return null;
        return (
          <IntentArtifactPanel
            intent={artifactMsg.intent}
            data={artifactMsg.cardData}
            onClose={() => setActiveArtifactMsgId(null)}
          />
        );
      })()}

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
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: 'var(--navy)', lineHeight: 1.2 }}>Attach from YourVault</div>
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
                    style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border)', paddingLeft: 36, paddingRight: 14, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "inherit", background: '#FBFAF7' }}
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
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: 'var(--navy)', lineHeight: 1.2 }}>Pick a Knowledge Pack</div>
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
                    style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border)', paddingLeft: 36, paddingRight: 14, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "inherit", background: '#FBFAF7' }}
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

      {/* ─── Org Admin Dashboard Panel ─── */}
      {showOrgDashboard && (
        <OrgDashboardPanel
          onBack={() => setShowOrgDashboard(false)}
          displayName={operator?.name || ORG_CURRENT_USER.name}
          orgName={ORG_CURRENT_USER.org}
          workspaceCount={visibleWorkspaceCount}
          memberCount={teamMemberCount ?? ORG_USERS.length}
          vaultCount={documentVault.length}
          packCount={knowledgePacks.length}
          onNewWorkspace={() => { closeAllPanels(); navigate('/chat/workspaces'); setShowWorkspacesPanel(true); setSidebarOpen(false); }}
          onUploadDocs={() => { closeAllPanels(); setShowDocumentVaultPanel(true); setSidebarOpen(false); }}
          onAddTeam={() => { closeAllPanels(); setShowTeamPage(true); setSidebarOpen(false); }}
        />
      )}

      {/* ─── Billing Panel (Org Admin) ─── */}
      {showBillingPanel && (
        <BillingPanel onBack={() => setShowBillingPanel(false)} />
      )}

      {/* ─── Audit Logs Panel (Org Admin) ─── */}
      {showAuditLogsPanel && (
        <AuditLogsPanel onBack={() => setShowAuditLogsPanel(false)} />
      )}

      {/* Plan Comparison Modal */}
      {showPlanModal && <PlanComparisonModal currentPlan={plan} onClose={() => setShowPlanModal(false)} navigate={navigate} />}

      {/* Prompt Templates — full-page panel (Figma #9), rendered at sibling level with Workflows/KP */}
      {showPromptPanel && (
        <PromptTemplatesPanel
          templates={promptTemplates}
          onUsePrompt={(prompt) => { setInput(prompt); if (inputRef.current) inputRef.current.focus(); }}
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

      {/* Transient toast — top-right corner, slides in from above. */}
      {toastMsg && (
        <div className="toast-enter" style={{
          position: 'fixed', top: 24, right: 24,
          zIndex: 100, padding: '10px 18px', borderRadius: 10,
          background: 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(10, 36, 99, 0.25)',
          maxWidth: 'min(420px, calc(100vw - 48px))',
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
          initialFiles={editingPack.isNew ? overflowFilesForNewPack : []}
          onClose={() => { setEditingPack(null); setOverflowFilesForNewPack([]); }}
          onSave={(data) => { handleSavePack(data); setEditingPack(null); setOverflowFilesForNewPack([]); }}
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
