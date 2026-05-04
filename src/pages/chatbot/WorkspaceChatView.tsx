/* ─── WorkspaceChatView — per-workspace case room ───────────────────────
 *
 * Route: /chat/workspaces/:id
 *
 * Completely replaces the personal ChatView layout while active:
 *   - Left sidebar: workspace-scoped (members, case docs, private threads)
 *   - Right main: chat area, same intent + streaming pattern as ChatView,
 *     minus the attach UI. Workspace documents are the sole RAG source.
 *
 * Threads are persisted per (workspace, user) — see src/lib/workspace.ts.
 * All document state lives inside the workspace record. Everything is
 * mock-backed; real API hits land in Sprint 2.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, ArrowUp, Briefcase, ChevronDown, Clock, FileText,
  Lock, LogOut, MessageSquare, Plus, Search, Settings as SettingsIcon,
  Sparkles, Trash2, Users as UsersIcon, X, UploadCloud, Database,
  AlertCircle, AlertTriangle, Check, Loader,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import { PERMISSIONS } from '../../lib/roles';
import {
  type Workspace, type WorkspaceDoc, type WorkspaceMember, type WorkspaceThread,
  getWorkspace, addMember, removeMember, addDocument, updateDocumentStatus,
  removeDocument, updateWorkspace, transferOwnership, deleteWorkspace,
  listThreadsForUser, createThread, updateThread, deleteThread,
  canEditDoc, canManageWorkspace, canEditWorkspaceKB, updateMemberAccess,
  isWorkspaceCreator, isWorkspaceMember,
  seedWorkspacesIfEmpty,
} from '../../lib/workspace';
import { MOCK_WORKSPACES } from '../../lib/mockWorkspaces';
import { extractFileText } from '../../lib/file-parser';
import { addVaultDoc } from '../../lib/documentVaultStore';
import { INTENTS, DEFAULT_INTENT, getIntentLabel } from '../../lib/intents';
import { detectAllIntents } from '../../lib/intentDetector';
import { teamMembersForPicker } from './workspaceTeamSeed';

const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const fileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Role- and state-aware prompt suggestions for the workspace empty state.
//
//   attorney   — drafting-heavy prompts assuming they are running the matter
//   client     — plain-English status/next-step questions
//   readonly   — observer-style overviews for members without KB edit access
//
// Each bucket has a `withDocs` and `noDocs` variant so we don't suggest
// "What are the main risks in the uploaded documents?" in a workspace
// that has no documents yet.
const PROMPT_SETS = {
  attorney: {
    withDocs: [
      'Summarise the key issues in this case',
      'What are the main risks in the uploaded documents?',
      'Draft a research memo on this matter',
    ],
    noDocs: [
      'Outline a research plan for this matter',
      'What are typical first steps for a case like this?',
      'Draft a client engagement letter for this matter',
    ],
  },
  client: {
    withDocs: [
      'What is the current status of my matter?',
      'Explain the key terms of my agreement in plain English',
      'What are the next steps, and what do you need from me?',
    ],
    noDocs: [
      'What is this matter about?',
      'What are the typical next steps I should expect?',
      'How long does a matter like this usually take?',
    ],
  },
  readonly: {
    withDocs: [
      'Summarise what is in this workspace so far',
      'What are the key dates and deadlines I should know?',
      'Give me a one-paragraph overview of this matter',
    ],
    noDocs: [
      'Give me a quick overview of this matter',
      'What should I expect to happen next in this workspace?',
      'Who is working on this matter?',
    ],
  },
};

export default function WorkspaceChatView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operator, logout } = useAuth();
  const { currentRole, isOrgAdmin, isExternalUser } = useRole();

  const currentUserId = operator?.id || 'user-ryan';
  // Resolve the user's name from AuthContext, falling back to the localStorage
  // registered user when operator isn't hydrated (static demo flow).
  const currentUserName = operator?.name || (() => {
    try {
      const email = localStorage.getItem('yourai_current_email');
      if (!email) return '';
      const registered = JSON.parse(localStorage.getItem('yourai_registered_users') || '{}');
      return registered[email]?.user?.name || '';
    } catch { return ''; }
  })() || 'there';
  const currentUserEmail = operator?.email || (() => {
    try { return localStorage.getItem('yourai_current_email') || ''; } catch { return ''; }
  })();
  const firstName = currentUserName.split(' ')[0] || 'there';

  const handleSignOut = async () => {
    try { await logout(); } catch { /* ignore */ }
    navigate('/chat/login');
  };

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [threads, setThreads] = useState<WorkspaceThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadSearch, setThreadSearch] = useState('');
  const [showThreadSearch, setShowThreadSearch] = useState(false);

  // External-User-only chat mode. Decides whether the AI grounds in this
  // workspace's case documents or in the org-wide YourAI KB.
  //   case    → workspace documents only (default)
  //   general → global KB only
  // Persisted per-browser so it survives reloads.
  const [externalChatMode, setExternalChatMode] = useState<'case' | 'general'>(() => {
    try {
      const v = localStorage.getItem('yourai_external_chat_mode');
      return v === 'general' ? 'general' : 'case';
    } catch { return 'case'; }
  });
  const [modeSwitchNotice, setModeSwitchNotice] = useState('');
  useEffect(() => {
    try { localStorage.setItem('yourai_external_chat_mode', externalChatMode); } catch { /* ignore */ }
  }, [externalChatMode]);

  // Chat state — per-thread messages kept in-memory (demo-only)
  interface Msg { id: number; sender: 'user' | 'bot'; content: string; ts: string; sourceBadge?: string; sourceType?: 'WORKSPACE_KB' | 'GLOBAL_KB' | 'NONE'; }
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Msg[]>>({});
  const [input, setInput] = useState('');
  const [activeIntent, setActiveIntent] = useState<string>(DEFAULT_INTENT);
  const [isIntentOpen, setIsIntentOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [dismissedSuggestion, setDismissedSuggestion] = useState<string | null>(null);
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const intentDropdownRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // CRITICAL: file-input ref must be declared BEFORE the early-return guards
  // below. Declaring it after (where it used to live) changed the hook count
  // between renders and triggered React #310. See Rules of Hooks.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Panels
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAllDocs, setShowAllDocs] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Ad-hoc chat-attachment flow ─────────────────────────────────────────────
  // Org Admin + members with KB edit rights get a two-option modal: save to
  // workspace case docs or use just for this chat (ephemeral). Externals
  // only get the ephemeral path, with a notice that it won't land in the
  // workspace's core documents.
  interface PendingUpload { name: string; size: number; type: string; content: string; }
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [ephemeralAttachment, setEphemeralAttachment] = useState<PendingUpload | null>(null);
  const chatAttachInputRef = useRef<HTMLInputElement>(null);
  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3200); };

  // Load workspace + threads
  useEffect(() => {
    if (!id) return;
    // Seed mock workspaces if the user landed here via a deep link before
    // visiting the list page, so the three seeded demo workspaces resolve.
    seedWorkspacesIfEmpty(MOCK_WORKSPACES);
    const ws = getWorkspace(id);
    setWorkspace(ws);
    if (ws) {
      const t = listThreadsForUser(ws.id, currentUserId);
      setThreads(t);
      if (t.length > 0) setActiveThreadId(t[0].id);
      else {
        const fresh = createThread(ws.id, currentUserId);
        setThreads([fresh]);
        setActiveThreadId(fresh.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentUserId]);

  // Close intent dropdown when clicking outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (intentDropdownRef.current && !intentDropdownRef.current.contains(e.target as Node)) setIsIntentOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  // Scroll to bottom on new messages / streaming update
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeThreadId, messagesByThread, streaming, isTyping]);

  /* ─── Access guard ─── */
  if (!workspace) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBFAF7' }}>
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 360 }}>
          <Lock size={36} style={{ color: '#C65454', opacity: 0.7 }} />
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--text-primary)', margin: '14px 0 8px' }}>Workspace not found</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>This workspace has been deleted or you do not have access. Contact your administrator if you believe this is a mistake.</p>
          <button onClick={() => navigate('/chat/workspaces')} style={{ marginTop: 16, padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Back to Workspaces</button>
        </div>
      </div>
    );
  }
  if (!isOrgAdmin && !isWorkspaceMember(workspace, currentUserId)) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBFAF7' }}>
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 360 }}>
          <Lock size={36} style={{ color: '#C65454', opacity: 0.7 }} />
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--text-primary)', margin: '14px 0 8px' }}>Workspace locked</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>You do not have access to this workspace. Contact your administrator if you believe this is a mistake.</p>
          <button onClick={() => navigate('/chat/workspaces')} style={{ marginTop: 16, padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Back to Workspaces</button>
        </div>
      </div>
    );
  }

  const activeMessages: Msg[] = activeThreadId ? (messagesByThread[activeThreadId] || []) : [];
  const showEmptyState = activeMessages.length === 0 && !isTyping;
  const isCreator = isWorkspaceCreator(workspace, currentUserId);
  const canManage = canManageWorkspace(workspace, currentUserId, isOrgAdmin);

  /* ─── Thread management ─── */
  const handleNewThread = () => {
    const t = createThread(workspace.id, currentUserId);
    setThreads((prev) => [t, ...prev]);
    setActiveThreadId(t.id);
    setInput('');
    setActiveIntent(DEFAULT_INTENT);
    // Ad-hoc attachment is thread-local — clear on new thread.
    setEphemeralAttachment(null);
  };
  const handleDeleteThread = (tid: string) => {
    if (threads.length <= 1) return; // cannot delete last
    deleteThread(tid);
    setThreads((prev) => prev.filter((t) => t.id !== tid));
    setMessagesByThread((prev) => { const next = { ...prev }; delete next[tid]; return next; });
    if (activeThreadId === tid) {
      const remaining = threads.filter((t) => t.id !== tid);
      setActiveThreadId(remaining[0]?.id || null);
    }
  };

  /* ─── Chat send ─── */
  const sendMessage = async (text: string) => {
    if (!text.trim() || !activeThreadId) return;
    const trimmed = text.trim();
    setInput('');
    setSuggestion(null);

    const userMsg: Msg = {
      id: Date.now(),
      sender: 'user',
      content: trimmed,
      ts: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    setMessagesByThread((prev) => ({ ...prev, [activeThreadId]: [...(prev[activeThreadId] || []), userMsg] }));

    // If the workspace has no ready docs, drop a subtle inline notice before
    // the AI response so the user understands we fell back to the global KB.
    if (!workspace.documents.some((d) => d.status === 'ready')) {
      const notice: Msg = {
        id: Date.now() + 0.5,
        sender: 'bot',
        content: '__FALLBACK_NOTICE__',
        ts: '',
      };
      setMessagesByThread((prev) => ({ ...prev, [activeThreadId]: [...(prev[activeThreadId] || []), notice] }));
    }

    // Auto-title thread on first message
    const tIdx = threads.findIndex((t) => t.id === activeThreadId);
    if (tIdx !== -1 && threads[tIdx].title === 'New Conversation') {
      const title = trimmed.slice(0, 60);
      updateThread(activeThreadId, { title, messageCount: (threads[tIdx].messageCount || 0) + 1 });
      setThreads((prev) => prev.map((t) => (t.id === activeThreadId ? { ...t, title } : t)));
    } else {
      updateThread(activeThreadId, { messageCount: (threads[tIdx]?.messageCount || 0) + 1 });
    }

    setIsTyping(true);
    setStreaming('');

    try {
      // Build history for LLM
      const history = (messagesByThread[activeThreadId] || []).map((m) => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

      // Source-priority hierarchy (top wins):
      //   1. Ephemeral ad-hoc attachment for this chat (not saved to KB)
      //   2. External User "general" mode → force global KB
      //   3. Workspace case documents (default when present)
      //   4. Global KB (fallback)
      const readyDocs = workspace.documents.filter((d) => d.status === 'ready');
      const forceGeneral = isExternalUser && externalChatMode === 'general';
      const useEphemeral = !!ephemeralAttachment;
      const useWorkspaceDocs = !useEphemeral && !forceGeneral && readyDocs.length > 0;

      const contextLayers = useEphemeral
        ? {
            uploadedDoc: {
              name: ephemeralAttachment!.name,
              content: ephemeralAttachment!.content || `Document: ${ephemeralAttachment!.name} (${ephemeralAttachment!.type.toUpperCase()})`,
            },
          }
        : useWorkspaceDocs
          ? {
              uploadedDoc: {
                name: `${workspace.name} workspace documents`,
                content: readyDocs.map((d) => `Document: ${d.name} (${d.type.toUpperCase()})`).join('\n'),
              },
            }
          : undefined;

      // Inline any doc context into the user message so the Edge function
      // (which doesn't know about contextLayers) sees it. Replaces the
      // previous callLLM client-fallback path — that needed VITE_OPENAI_API_KEY
      // which is never set in prod, which is why every workspace chat
      // returned "Something went wrong reaching the AI."
      const userMessageForEdge = contextLayers?.uploadedDoc
        ? `[Context from ${contextLayers.uploadedDoc.name}]\n${contextLayers.uploadedDoc.content}\n\n[User question]\n${trimmed}`
        : trimmed;

      let fullContent = '';
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessageForEdge, history }),
      });
      if (!response.ok || !response.body) {
        throw new Error(`LLM backend returned ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += decoder.decode(value, { stream: true });
        setStreaming(fullContent);
      }
      fullContent += decoder.decode();

      const result = {
        fullContent,
        sourceType: 'GLOBAL_KB' as const,
      };

      let sourceType: Msg['sourceType'] = 'NONE';
      let sourceBadge = 'No source found';
      if (useEphemeral) {
        sourceType = 'WORKSPACE_KB';
        sourceBadge = `Answered from: ${ephemeralAttachment!.name} (this chat only)`;
      } else if (useWorkspaceDocs) {
        sourceType = 'WORKSPACE_KB';
        sourceBadge = isExternalUser
          ? 'Answered from: your workspace documents'
          : `Answered from: ${workspace.name} documents`;
      } else if (forceGeneral || result?.sourceType === 'GLOBAL_KB') {
        sourceType = 'GLOBAL_KB';
        sourceBadge = 'Answered from: YourAI knowledge base';
      }

      const botMsg: Msg = {
        id: Date.now() + 1,
        sender: 'bot',
        content: result?.fullContent || 'Sorry, I could not generate a response.',
        ts: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        sourceBadge,
        sourceType,
      };
      setMessagesByThread((prev) => ({ ...prev, [activeThreadId]: [...(prev[activeThreadId] || []), botMsg] }));
    } catch {
      const errMsg: Msg = {
        id: Date.now() + 2,
        sender: 'bot',
        content: 'Something went wrong reaching the AI. Please try again in a moment.',
        ts: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        sourceType: 'NONE',
        sourceBadge: 'Error',
      };
      setMessagesByThread((prev) => ({ ...prev, [activeThreadId]: [...(prev[activeThreadId] || []), errMsg] }));
    }

    setIsTyping(false);
    setStreaming('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  /* ─── Document upload ─── */
  // fileInputRef is declared at the top of the component alongside the other
  // useRef hooks — must stay above the early-return guards.
  const ACCEPTED = ['pdf', 'docx', 'xlsx', 'txt'];
  const MAX_BYTES = 100 * 1024 * 1024;

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFilesPicked = (files: FileList) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const picked = Array.from(files);
    picked.forEach((f) => {
      const ext = f.name.lastIndexOf('.') !== -1 ? f.name.slice(f.name.lastIndexOf('.') + 1).toLowerCase() : '';
      if (!ACCEPTED.includes(ext)) {
        showToast('That file type is not supported. Please upload PDF, DOCX, XLSX, or TXT.');
        return;
      }
      if (f.size > MAX_BYTES) {
        showToast('We were not able to upload that file. Please use a file under 100MB.');
        return;
      }
      const doc: WorkspaceDoc = {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: f.size,
        type: ext,
        uploadedBy: currentUserId,
        uploadedByName: currentUserName,
        uploadedAt: today,
        status: 'processing',
      };
      const next = addDocument(workspace.id, doc);
      if (next) setWorkspace(next);
      showToast(`${f.name} added to workspace`);
      // Simulate ingestion
      setTimeout(() => {
        const updated = updateDocumentStatus(workspace.id, doc.id, 'ready');
        if (updated) setWorkspace(updated);
      }, 2500);
    });
  };

  /* ─── Ad-hoc chat-upload handlers ─── */
  const handleChatAttachClick = () => chatAttachInputRef.current?.click();

  const handleChatFilesPicked = async (files: FileList) => {
    const f = files[0];
    if (!f) return;
    const ext = f.name.lastIndexOf('.') !== -1 ? f.name.slice(f.name.lastIndexOf('.') + 1).toLowerCase() : '';
    if (!ACCEPTED.includes(ext)) {
      showToast('That file type is not supported. Please upload PDF, DOCX, XLSX, or TXT.');
      return;
    }
    if (f.size > MAX_BYTES) {
      showToast('We were not able to upload that file. Please use a file under 100MB.');
      return;
    }
    // Extract text for use as context (best-effort; if it fails we still allow
    // the scope choice, but AI grounding will be limited).
    let content = '';
    try {
      const res = await extractFileText(f);
      content = res?.text || '';
    } catch { /* ignore */ }
    setPendingUpload({ name: f.name, size: f.size, type: ext, content });
  };

  const confirmUploadAsWorkspaceDoc = async () => {
    if (!pendingUpload) return;
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const doc: WorkspaceDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: pendingUpload.name,
      size: pendingUpload.size,
      type: pendingUpload.type,
      uploadedBy: currentUserId,
      uploadedByName: currentUserName,
      uploadedAt: today,
      status: 'processing',
    };
    const next = addDocument(workspace.id, doc);
    if (next) setWorkspace(next);
    showToast(`${doc.name} added to workspace documents`);
    setPendingUpload(null);
    // Simulate ingestion flip
    setTimeout(() => {
      const updated = updateDocumentStatus(workspace.id, doc.id, 'ready');
      if (updated) setWorkspace(updated);
    }, 2500);
  };

  const confirmUploadAsEphemeral = () => {
    if (!pendingUpload) return;
    setEphemeralAttachment(pendingUpload);
    // Persist to the uploader's personal YourVault with an
    // 'Added from chat' marker. Clients get a durable record of everything
    // they've uploaded, accessible from the YourVault panel. Dedupe
    // is handled inside addVaultDoc (by filename + ownerId).
    const sizeKB = pendingUpload.size < 1024 * 1024
      ? `${(pendingUpload.size / 1024).toFixed(0)} KB`
      : `${(pendingUpload.size / (1024 * 1024)).toFixed(1)} MB`;
    addVaultDoc({
      id: `vault-${Date.now()}`,
      name: pendingUpload.name,
      fileName: pendingUpload.name,
      fileSize: sizeKB,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      ownerId: currentUserId,
      ownerName: currentUserName,
      isGlobal: false,
      addedFromChat: true,
    });
    setPendingUpload(null);
    showToast(`${pendingUpload.name} attached to this chat · saved to your Vault`);
  };

  const handleRemoveDoc = (docId: string) => {
    const doc = workspace.documents.find((d) => d.id === docId);
    if (!doc) return;
    const next = removeDocument(workspace.id, docId);
    if (next) setWorkspace(next);
    showToast(`${doc.name} removed from workspace`);
  };

  /* ─── Members ─── */
  const handleAddMember = (m: WorkspaceMember) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const next = addMember(workspace.id, { ...m, addedAt: today, addedBy: currentUserName });
    if (next) setWorkspace(next);
    showToast(`${m.name} added to workspace`);
  };
  const handleRemoveMember = (userId: string) => {
    const victim = workspace.members.find((m) => m.userId === userId);
    const next = removeMember(workspace.id, userId);
    if (next) setWorkspace(next);
    if (victim) showToast(`${victim.name} removed from workspace`);
  };
  const handleToggleKB = (userId: string, canEdit: boolean) => {
    const next = updateMemberAccess(workspace.id, userId, { canEditKB: canEdit });
    if (next) setWorkspace(next);
    const who = workspace.members.find((m) => m.userId === userId)?.name || 'Member';
    showToast(canEdit ? `${who} can now edit the knowledge base` : `${who} is now read-only`);
  };

  /* ─── Settings actions ─── */
  const handleUpdateMeta = (patch: { name?: string; description?: string }) => {
    const next = updateWorkspace(workspace.id, patch);
    if (next) setWorkspace(next);
    showToast('Workspace updated');
  };
  const handleTransfer = (newOwnerId: string) => {
    const next = transferOwnership(workspace.id, newOwnerId);
    if (next) {
      setWorkspace(next);
      const newOwner = next.members.find((m) => m.userId === newOwnerId);
      showToast(`Workspace transferred to ${newOwner?.name || 'new owner'}`);
    }
  };
  const handleDelete = () => {
    const name = workspace.name;
    deleteWorkspace(workspace.id);
    showToast(`${name} workspace deleted`);
    setTimeout(() => navigate('/chat/workspaces'), 500);
  };

  /* ─── Input handlers ─── */
  const handleInputChange = (val: string) => {
    setInput(val);
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    if (val.trim().length < 10) { setSuggestion(null); return; }
    suggestionTimer.current = setTimeout(() => {
      const matches = detectAllIntents(val).filter((m: any) => m.intentId !== activeIntent && m.intentId !== dismissedSuggestion);
      if (matches.length > 0) setSuggestion(matches[0].intentId);
    }, 600);
  };

  /* ─── Render ─── */
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflowX: 'hidden' }}>
      <WorkspaceSidebar
        workspace={workspace}
        threads={threads}
        activeThreadId={activeThreadId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
        isOrgAdmin={isOrgAdmin}
        canEditKB={canEditWorkspaceKB(workspace, currentUserId, isOrgAdmin)}
        showThreadSearch={showThreadSearch}
        threadSearch={threadSearch}
        showAllDocs={showAllDocs}
        onBackToList={() => navigate('/chat/workspaces')}
        onNewThread={handleNewThread}
        onSwitchThread={(tid) => setActiveThreadId(tid)}
        onDeleteThread={handleDeleteThread}
        onToggleThreadSearch={() => setShowThreadSearch((v) => !v)}
        onThreadSearchChange={setThreadSearch}
        onOpenMembers={() => setShowMembers(true)}
        onOpenSettings={() => setShowSettings(true)}
        onUploadClick={handleUploadClick}
        onRemoveDoc={handleRemoveDoc}
        onToggleAllDocs={() => setShowAllDocs((v) => !v)}
        onSignOut={handleSignOut}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.txt"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files) handleFilesPicked(e.target.files); e.target.value = ''; }}
      />

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#FAFBFC' }}>
        {/* ─── Persistent workspace banner ─── */}
        {(() => {
          const readyDocs = workspace.documents.filter((d) => d.status === 'ready').length;
          return (
            <div style={{ height: 36, background: '#EEF1FA', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0 }}>
              <div
                onClick={() => canManage && setShowSettings(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, cursor: canManage ? 'pointer' : 'default' }}
                title={canManage ? 'Workspace settings' : undefined}
              >
                <Briefcase size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>{workspace.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                {readyDocs === 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#E8A33D', fontWeight: 500 }}>
                    <AlertTriangle size={12} />
                    No documents yet — add files to give the AI context
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Workspace Documents</span>
                    <FileText size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{readyDocs} doc{readyDocs !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Messages / empty state */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {showEmptyState ? (
            <WorkspaceEmptyState
              firstName={firstName}
              workspaceName={workspace.name}
              hasDocs={workspace.documents.some((d) => d.status === 'ready')}
              canEditKB={canEditWorkspaceKB(workspace, currentUserId, isOrgAdmin)}
              role={currentRole}
              onPromptClick={(p) => { setInput(p); inputRef.current?.focus(); }}
              onAddDocuments={handleUploadClick}
            />
          ) : (
            <div style={{ padding: '24px 24px 8px', maxWidth: 860, margin: '0 auto', width: '100%' }}>
              {activeMessages.map((m) => <MessageBubble key={m.id} msg={m} />)}
              {isTyping && streaming && (
                <MessageBubble msg={{ id: -1, sender: 'bot', content: streaming, ts: '' }} streaming />
              )}
              {isTyping && !streaming && <TypingIndicator />}
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{ padding: '12px 24px 20px', borderTop: '1px solid var(--border)', background: '#fff' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            {/* ─── External User chat-mode toggle ─── */}
            {isExternalUser && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                <div style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: 3, background: 'var(--ice-warm)', border: '1px solid var(--border)', borderRadius: 999 }}>
                  {([
                    { id: 'case',    label: 'Case Questions' },
                    { id: 'general', label: 'General Queries' },
                  ] as Array<{ id: 'case' | 'general'; label: string }>).map((opt) => {
                    const active = externalChatMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (active) return;
                          setExternalChatMode(opt.id);
                          // Only show mid-conversation notice if there are messages already
                          if (activeMessages.length > 0) {
                            setModeSwitchNotice(
                              opt.id === 'general'
                                ? 'Switched to General Queries mode. Previous context cleared.'
                                : 'Switched to Case Questions mode. Previous context cleared.',
                            );
                          }
                        }}
                        style={{
                          padding: '5px 14px', borderRadius: 999,
                          border: 'none', background: active ? '#fff' : 'transparent',
                          color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                          fontSize: 12, fontWeight: active ? 600 : 500,
                          cursor: active ? 'default' : 'pointer',
                          boxShadow: active ? '0 1px 3px rgba(10,36,99,0.08)' : 'none',
                          transition: 'all 150ms',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {modeSwitchNotice && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={11} />
                    <span>{modeSwitchNotice}</span>
                    <button
                      onClick={() => setModeSwitchNotice('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}
                      aria-label="Dismiss"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
                {externalChatMode === 'case' && workspace.documents.filter((d) => d.status === 'ready').length === 0 && (
                  <div style={{ padding: '8px 12px', borderRadius: 10, background: '#FBEED5', border: '1px solid #F3E2B1', fontSize: 12, color: '#6B4E1F', lineHeight: 1.5 }}>
                    No workspace documents uploaded yet. Ask your attorney to upload relevant files, or switch to General Queries.
                  </div>
                )}
              </div>
            )}

            {/* Suggestion banner */}
            {suggestion && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 14px', marginBottom: 8, borderRadius: 12, background: 'var(--ice-warm)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>Looks like <strong style={{ color: 'var(--text-primary)' }}>{getIntentLabel(suggestion)}</strong></span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setActiveIntent(suggestion); setSuggestion(null); }} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 999, background: '#fff', cursor: 'pointer' }}>Yes, switch</button>
                  <button onClick={() => { setDismissedSuggestion(suggestion); setSuggestion(null); }} style={{ fontSize: 11, padding: '4px 10px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Keep {getIntentLabel(activeIntent)}</button>
                </div>
              </div>
            )}

            {/* Ephemeral attachment chip — in scope only for this chat */}
            {ephemeralAttachment && (
              <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, padding: '5px 10px', marginBottom: 6, background: 'var(--ice-warm)', border: '1px solid var(--border)', borderRadius: 999, fontSize: 11 }}>
                <FileText size={11} style={{ color: 'var(--navy)' }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{ephemeralAttachment.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>· this chat only</span>
                <button onClick={() => setEphemeralAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }} aria-label="Remove attachment">
                  <X size={11} />
                </button>
              </div>
            )}

            <input
              ref={chatAttachInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.txt"
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files) handleChatFilesPicked(e.target.files); e.target.value = ''; }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--border)', borderRadius: 24, background: '#fff', minHeight: 48, padding: '8px 8px 8px 12px' }}>
              {/* Attach button — tooltip differs for externals */}
              <button
                onClick={handleChatAttachClick}
                title={isExternalUser ? 'Attach a file just for this chat' : 'Attach a file'}
                style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: ephemeralAttachment ? 'var(--navy)' : 'var(--text-muted)', background: ephemeralAttachment ? 'rgba(10,36,99,0.08)' : 'transparent', border: 'none', flexShrink: 0 }}
              >
                <Plus size={20} />
              </button>

              {/* Intent selector (collapsed pill when chat has content; expanded pills on empty state is handled below) */}
              <div ref={intentDropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsIntentOpen((v) => !v)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, border: '1.5px solid var(--text-primary)', background: '#fff', color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  title="Workspace context — this chat is scoped to the current case"
                >
                  <Briefcase size={11} style={{ color: 'var(--navy)' }} />
                  {getIntentLabel(activeIntent)}
                  <ChevronDown size={12} style={{ transform: isIntentOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                </button>
                {isIntentOpen && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, width: 260, background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 51, maxHeight: 320, overflowY: 'auto' }}>
                    {INTENTS.map((intent: any) => {
                      const isCurrent = intent.id === activeIntent;
                      return (
                        <div key={intent.id} onClick={() => { setActiveIntent(intent.id); setIsIntentOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isCurrent ? 500 : 400 }}>
                          <span>{intent.label}</span>
                          {isCurrent && <Check size={14} style={{ color: 'var(--navy)' }} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <textarea
                ref={inputRef}
                className="no-focus-ring"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask anything about ${workspace.name}…`}
                rows={1}
                style={{ flex: 1, border: 'none', outline: 'none', boxShadow: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', resize: 'none', maxHeight: 120, overflowY: 'auto', lineHeight: '1.5', fontFamily: 'inherit' }}
              />

              {(() => {
                const canSend = input.trim().length > 0 && !isTyping;
                return (
                  <div onClick={() => canSend && sendMessage(input)} style={{ width: 32, height: 32, borderRadius: '50%', background: canSend ? 'var(--navy)' : '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canSend ? 'pointer' : 'not-allowed', flexShrink: 0, opacity: canSend ? 1 : 0.6 }}>
                    <ArrowUp size={16} color="#fff" />
                  </div>
                );
              })()}
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Workspace chat is private to you. Documents are shared with all members.
            </div>
          </div>
        </div>
      </div>

      {/* Ad-hoc chat upload scope picker */}
      {pendingUpload && (
        <ChatUploadScopeModal
          upload={pendingUpload}
          isExternalUser={isExternalUser}
          canAddToWorkspace={canEditWorkspaceKB(workspace, currentUserId, isOrgAdmin)}
          onCancel={() => setPendingUpload(null)}
          onUseInChat={confirmUploadAsEphemeral}
          onAddToWorkspace={confirmUploadAsWorkspaceDoc}
        />
      )}

      {/* Members panel */}
      {showMembers && (
        <MembersPanel
          workspace={workspace}
          currentUserId={currentUserId}
          canManage={canManage}
          isOrgAdmin={isOrgAdmin}
          onClose={() => setShowMembers(false)}
          onAdd={handleAddMember}
          onRemove={handleRemoveMember}
          onToggleKB={handleToggleKB}
        />
      )}

      {/* Settings panel */}
      {showSettings && (
        <WorkspaceSettingsModal
          workspace={workspace}
          currentUserId={currentUserId}
          isOrgAdmin={isOrgAdmin}
          onClose={() => setShowSettings(false)}
          onUpdateMeta={handleUpdateMeta}
          onTransfer={handleTransfer}
          onDelete={handleDelete}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100, padding: '10px 18px', borderRadius: 10, background: 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, boxShadow: '0 8px 24px rgba(10, 36, 99, 0.25)' }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

/* ─── Workspace Sidebar ─── */
interface SidebarProps {
  workspace: Workspace;
  threads: WorkspaceThread[];
  activeThreadId: string | null;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  isOrgAdmin: boolean;
  canEditKB: boolean;
  showThreadSearch: boolean;
  threadSearch: string;
  showAllDocs: boolean;
  onBackToList: () => void;
  onNewThread: () => void;
  onSwitchThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  onToggleThreadSearch: () => void;
  onThreadSearchChange: (v: string) => void;
  onOpenMembers: () => void;
  onOpenSettings: () => void;
  onUploadClick: () => void;
  onRemoveDoc: (id: string) => void;
  onToggleAllDocs: () => void;
  onSignOut: () => void;
}

function WorkspaceSidebar(props: SidebarProps) {
  const {
    workspace, threads, activeThreadId, currentUserId,
    currentUserName, currentUserEmail,
    isOrgAdmin, canEditKB,
    showThreadSearch, threadSearch, showAllDocs,
    onBackToList, onNewThread, onSwitchThread, onDeleteThread,
    onToggleThreadSearch, onThreadSearchChange, onOpenMembers, onOpenSettings,
    onUploadClick, onRemoveDoc, onToggleAllDocs, onSignOut,
  } = props;

  const canManage = canManageWorkspace(workspace, currentUserId, isOrgAdmin);
  const filteredThreads = useMemo(() => {
    if (!threadSearch.trim()) return threads;
    const q = threadSearch.toLowerCase();
    return threads.filter((t) => t.title.toLowerCase().includes(q));
  }, [threads, threadSearch]);
  const recentThreads = filteredThreads.slice(0, 3);
  const totalThreads = filteredThreads.length;

  const visibleDocs = showAllDocs ? workspace.documents : workspace.documents.slice(0, 5);
  const hiddenDocCount = Math.max(0, workspace.documents.length - 5);

  return (
    <div style={{ width: 264, minWidth: 264, background: '#fff', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top section */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={onBackToList}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px', marginLeft: -4, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
        >
          <ArrowLeft size={12} /> All Workspaces
        </button>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 14, color: 'var(--text-primary)', marginTop: 6, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {workspace.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''}</div>
      </div>

      {/* New chat */}
      <div style={{ padding: '12px 12px 0' }}>
        <button
          onClick={onNewThread}
          style={{ width: '100%', height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', background: '#fff', border: '1px solid var(--border)', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ice-warm)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
        >
          <Plus size={14} /> New chat
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Recent chats */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Chats</span>
            <button onClick={onToggleThreadSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--text-muted)' }} title="Search chats"><Search size={12} /></button>
          </div>
          {showThreadSearch && (
            <div style={{ padding: '0 4px 6px', position: 'relative' }}>
              <Search size={11} style={{ position: 'absolute', left: 14, top: 8, color: 'var(--text-muted)' }} />
              <input
                value={threadSearch}
                onChange={(e) => onThreadSearchChange(e.target.value)}
                placeholder="Search chats..."
                autoFocus
                style={{ width: '100%', height: 28, borderRadius: 6, border: '1px solid var(--border)', paddingLeft: 26, fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentThreads.map((t) => {
              const isActive = t.id === activeThreadId;
              return (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  isActive={isActive}
                  canDelete={totalThreads > 1}
                  onClick={() => onSwitchThread(t.id)}
                  onDelete={() => onDeleteThread(t.id)}
                />
              );
            })}
          </div>
          {totalThreads > 3 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 8px', cursor: 'pointer' }}>View all chats →</div>
          )}
        </div>

        {/* Members */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Members {workspace.members.length}</span>
            {canManage && (
              <button onClick={onOpenMembers} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 11, color: 'var(--navy)', fontWeight: 500 }}>+ Add</button>
            )}
          </div>
          <div onClick={onOpenMembers} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', cursor: 'pointer', borderRadius: 6 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--ice-warm)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            {workspace.members.slice(0, 5).map((m, i) => (
              <div
                key={m.userId}
                title={m.name}
                style={{ width: 24, height: 24, borderRadius: '50%', background: '#F0F3F6', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, border: '2px solid #fff', marginLeft: i === 0 ? 0 : -6 }}
              >
                {initialsOf(m.name)}
              </div>
            ))}
            {workspace.members.length > 5 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>+{workspace.members.length - 5} more</span>
            )}
          </div>
        </div>

        {/* Workspace Documents */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workspace Documents {workspace.documents.length}</span>
            {canEditKB && (
              <button onClick={onUploadClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 11, color: 'var(--navy)', fontWeight: 500 }}>+ Add</button>
            )}
          </div>
          {workspace.documents.length === 0 ? (
            <div style={{ padding: '10px 8px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              No workspace documents yet. Add files to give the AI context for this matter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {visibleDocs.map((d) => (
                <DocRow
                  key={d.id}
                  doc={d}
                  canEdit={canEditDoc(workspace, d, currentUserId, isOrgAdmin)}
                  onRemove={() => onRemoveDoc(d.id)}
                />
              ))}
              {hiddenDocCount > 0 && (
                <button
                  onClick={onToggleAllDocs}
                  style={{ padding: '4px 6px', fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  {showAllDocs ? 'Show less' : `View all (${workspace.documents.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom — user identity + settings + sign out */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F0F3F6', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            {initialsOf(currentUserName || currentUserEmail)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUserName || 'You'}
            </div>
            {currentUserEmail && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUserEmail}
              </div>
            )}
          </div>
        </div>
        {canManage && (
          <button
            onClick={onOpenSettings}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ice-warm)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <SettingsIcon size={13} /> Workspace Settings
          </button>
        )}
        <button
          onClick={onSignOut}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#C65454' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F9E7E7'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  );
}

function ThreadRow({ thread, isActive, canDelete, onClick, onDelete }: { thread: WorkspaceThread; isActive: boolean; canDelete: boolean; onClick: () => void; onDelete: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: isActive ? '#fff' : hover ? 'var(--ice-warm)' : 'transparent', border: isActive ? '1px solid var(--border)' : '1px solid transparent', minHeight: 44 }}
    >
      <MessageSquare size={12} style={{ color: isActive ? 'var(--navy)' : 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{thread.title}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{thread.messageCount} msg{thread.messageCount !== 1 ? 's' : ''}</div>
      </div>
      {hover && canDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex' }}>
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}

function DocRow({ doc, canEdit, onRemove }: { doc: WorkspaceDoc; canEdit: boolean; onRemove: () => void }) {
  const statusMap = {
    processing: { label: 'Processing', bg: '#FBEED5', color: '#E8A33D' },
    ready:      { label: 'Ready',      bg: '#E7F3E9', color: '#5CA868' },
    failed:     { label: 'Failed',     bg: '#F9E7E7', color: '#C65454' },
  };
  const s = statusMap[doc.status];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 6px', borderRadius: 6 }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--ice-warm)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <FileText size={12} style={{ color: 'var(--navy)', flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span>{fileSize(doc.size)}</span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 999, background: s.bg, color: s.color, fontWeight: 500 }}>
            {doc.status === 'processing' && <Loader size={8} className="animate-spin" />}
            {s.label}
          </span>
        </div>
      </div>
      {canEdit && (
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex' }} title="Remove">
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
}

/* ─── Empty state ─── */
function WorkspaceEmptyState({ firstName, workspaceName, hasDocs, canEditKB, role, onPromptClick, onAddDocuments }: { firstName: string; workspaceName: string; hasDocs: boolean; canEditKB: boolean; role: string; onPromptClick: (p: string) => void; onAddDocuments: () => void }) {
  // External Users are always clients. Members who can't edit the KB get
  // read-only prompts (observer-style). Everyone else gets attorney prompts.
  // And within each bucket, the prompt text changes based on whether the
  // workspace actually has indexed documents yet.
  const bucket = role === 'EXTERNAL_USER'
    ? 'client'
    : canEditKB
      ? 'attorney'
      : 'readonly';
  const prompts = hasDocs ? PROMPT_SETS[bucket].withDocs : PROMPT_SETS[bucket].noDocs;
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: 720, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 4px 14px rgba(201, 168, 76, 0.3)' }}>
          <Briefcase size={28} style={{ color: '#fff' }} />
        </div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: 'var(--navy)', margin: '0 0 8px' }}>
          {getGreeting()}, {firstName}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          You are in <strong>{workspaceName}</strong>.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>
          The AI will use your workspace documents to answer questions here.
        </p>

        {!hasDocs && (
          <div style={{ maxWidth: 440, margin: '0 auto 22px', padding: '14px 16px', borderRadius: 12, background: '#FBEED5', border: '1px solid #F3E2B1', display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}>
            <AlertTriangle size={16} style={{ color: '#E8A33D', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6B4E1F' }}>No workspace documents uploaded yet.</div>
              <div style={{ fontSize: 12, color: '#6B4E1F', marginTop: 3, lineHeight: 1.5 }}>
                Add documents from the sidebar so the AI has context for this matter.
              </div>
              <button
                onClick={onAddDocuments}
                style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#C9A84C', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                <UploadCloud size={12} /> Add Documents
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {prompts.map((p) => (
            <button
              key={p}
              onClick={() => onPromptClick(p)}
              style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: '#fff', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', maxWidth: 220, lineHeight: 1.5 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--navy)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--ice-warm)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Message bubble ─── */
function MessageBubble({ msg, streaming = false }: { msg: any; streaming?: boolean }) {
  // Special inline fallback notice — rendered as a muted row, not a bubble.
  if (msg.content === '__FALLBACK_NOTICE__') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', background: 'var(--ice-warm)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 999 }}>
          <AlertCircle size={11} style={{ color: '#E8A33D' }} />
          <span>No workspace documents found. Answered from YourAI knowledge base.</span>
        </div>
      </div>
    );
  }
  const isUser = msg.sender === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
      <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          padding: '10px 14px', borderRadius: 14,
          background: isUser ? 'var(--navy)' : '#fff',
          color: isUser ? '#fff' : 'var(--text-primary)',
          border: isUser ? 'none' : '1px solid var(--border)',
          fontSize: 13, lineHeight: 1.6,
        }}>
          {isUser ? msg.content : <ReactMarkdown>{msg.content}</ReactMarkdown>}
          {streaming && <span style={{ display: 'inline-block', width: 6, height: 14, marginLeft: 2, background: 'var(--navy)', verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />}
        </div>
        {!isUser && msg.sourceBadge && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {msg.sourceType === 'WORKSPACE_KB' && <FileText size={10} style={{ color: '#1E3A8A' }} />}
            {msg.sourceType === 'GLOBAL_KB' && <Database size={10} style={{ color: '#5CA868' }} />}
            {msg.sourceType === 'NONE' && <AlertCircle size={10} style={{ color: '#E8A33D' }} />}
            <span>{msg.sourceBadge}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}>
      <div style={{ padding: '10px 14px', borderRadius: 14, background: '#fff', border: '1px solid var(--border)', display: 'flex', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: `blink 1.4s ${i * 0.16}s infinite both` }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Members Panel ─── */
function MembersPanel({ workspace, currentUserId, canManage, isOrgAdmin, onClose, onAdd, onRemove, onToggleKB }: {
  workspace: Workspace; currentUserId: string; canManage: boolean; isOrgAdmin: boolean;
  onClose: () => void;
  onAdd: (m: WorkspaceMember) => void;
  onRemove: (userId: string) => void;
  onToggleKB: (userId: string, next: boolean) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<'existing' | 'invite'>('existing');
  const [q, setQ] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<WorkspaceMember | null>(null);
  const [pendingAdd, setPendingAdd] = useState<WorkspaceMember | null>(null);
  const [pendingCanEditKB, setPendingCanEditKB] = useState(true);
  // Invite-new-external mini form fields
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmailError, setNewEmailError] = useState('');
  const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const candidates = useMemo(() => {
    const all = teamMembersForPicker();
    return all
      .filter((m) => !workspace.members.some((w) => w.userId === m.userId))
      .filter((m) => !q.trim() || m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase()));
  }, [q, workspace.members]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 60, backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, background: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,0.1)', zIndex: 61, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, margin: 0 }}>Members {workspace.members.length}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {canManage && !adding && (
              <button onClick={() => setAdding(true)} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>+ Add Member</button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
          </div>
        </div>

        {adding && (
          <div style={{ padding: '12px 20px 0' }}>
            {/* Mode tabs — pick existing or invite brand-new */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button
                onClick={() => setAddMode('existing')}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid ' + (addMode === 'existing' ? 'var(--navy)' : 'var(--border)'), background: addMode === 'existing' ? 'var(--navy)' : '#fff', color: addMode === 'existing' ? '#fff' : 'var(--text-secondary)' }}
              >
                Existing team
              </button>
              <button
                onClick={() => setAddMode('invite')}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid ' + (addMode === 'invite' ? 'var(--navy)' : 'var(--border)'), background: addMode === 'invite' ? 'var(--navy)' : '#fff', color: addMode === 'invite' ? '#fff' : 'var(--text-secondary)' }}
              >
                Invite new client
              </button>
            </div>

            {addMode === 'existing' ? (
              <>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search team members..."
                    autoFocus
                    style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 34, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
                  {candidates.length === 0 ? (
                    <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No matching members</div>
                  ) : candidates.map((m) => (
                    <div key={m.userId} onClick={() => { setPendingAdd(m); setPendingCanEditKB(true); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderRadius: 8 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--ice-warm)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F0F3F6', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{initialsOf(m.name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.email}</div>
                      </div>
                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: m.role === 'org_admin' ? 'var(--navy)' : m.role === 'external_user' ? '#E7F3E9' : '#F0F3F6', color: m.role === 'org_admin' ? '#fff' : m.role === 'external_user' ? '#5CA868' : '#1E3A8A', fontWeight: 500 }}>
                        {m.role === 'org_admin' ? 'Org Admin' : m.role === 'external_user' ? 'Client' : 'Internal'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              // Invite-new-external form — only creates External clients.
              // Internal invites still live on the dedicated Team page.
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>
                  Invite a new external client. They'll get an email and be added straight to this workspace as a read-only member.
                </p>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Full name</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Jordan Patel" style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} autoFocus />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Email</label>
                  <input value={newEmail} onChange={(e) => { setNewEmail(e.target.value); if (newEmailError) setNewEmailError(''); }} placeholder="jordan@client.com" type="email" style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid ' + (newEmailError ? '#C65454' : 'var(--border)'), padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  {newEmailError && <div style={{ fontSize: 10, color: '#C65454', marginTop: 3 }}>{newEmailError}</div>}
                </div>
                <button
                  onClick={() => {
                    if (!newName.trim()) return;
                    if (!validEmail(newEmail)) { setNewEmailError('Enter a valid email address'); return; }
                    setNewEmailError('');
                    // Build a fresh external member record and route it through
                    // the same access-decision dialog the existing-flow uses.
                    setPendingAdd({
                      userId: `client-${Date.now()}`,
                      name: newName.trim(),
                      email: newEmail.trim(),
                      role: 'external_user',
                      addedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                      addedBy: 'You',
                    });
                    setPendingCanEditKB(false); // clients default to read-only
                    setNewName(''); setNewEmail('');
                  }}
                  disabled={!newName.trim() || !newEmail.trim()}
                  style={{ marginTop: 4, padding: '8px 14px', borderRadius: 8, border: 'none', background: (!newName.trim() || !newEmail.trim()) ? '#9CA3AF' : 'var(--navy)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: (!newName.trim() || !newEmail.trim()) ? 'not-allowed' : 'pointer' }}
                >
                  Continue
                </button>
              </div>
            )}

            <button onClick={() => { setAdding(false); setQ(''); setNewName(''); setNewEmail(''); setNewEmailError(''); }} style={{ marginTop: 10, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>
          {workspace.members.map((m) => {
            const isWsCreator = m.userId === workspace.createdBy;
            const kbEditable = isWsCreator || m.canEditKB !== false;
            return (
              <div key={m.userId} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{initialsOf(m.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</span>
                    {isWsCreator && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: '#C9A84C22', color: '#9A7A22', fontWeight: 600 }}>Owner</span>}
                    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: m.role === 'org_admin' ? 'var(--navy)' : m.role === 'external_user' ? '#E7F3E9' : '#F0F3F6', color: m.role === 'org_admin' ? '#fff' : m.role === 'external_user' ? '#5CA868' : '#1E3A8A', fontWeight: 500 }}>
                      {m.role === 'org_admin' ? 'Org Admin' : m.role === 'external_user' ? 'Client' : 'Internal'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.email}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Added by {m.addedBy} · {m.addedAt}</div>

                  {/* KB-access row — creator is always read/write and locked */}
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: kbEditable ? '#E7F3E9' : '#F0F3F6', border: '1px solid ' + (kbEditable ? 'rgba(92,168,104,0.3)' : 'var(--border)') }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: kbEditable ? '#3F7E4A' : '#6B7885' }}>
                      {kbEditable ? 'Can edit knowledge base' : 'Read-only knowledge base'}
                    </span>
                    {canManage && !isWsCreator && (
                      <button
                        onClick={() => onToggleKB(m.userId, !kbEditable)}
                        title={kbEditable ? 'Switch to read-only' : 'Allow editing the workspace KB'}
                        style={{ marginLeft: 'auto', width: 28, height: 16, borderRadius: 999, border: 'none', cursor: 'pointer', background: kbEditable ? '#5CA868' : '#CBD5E1', position: 'relative', padding: 0, flexShrink: 0 }}
                      >
                        <span style={{ position: 'absolute', top: 2, left: kbEditable ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 150ms' }} />
                      </button>
                    )}
                  </div>
                </div>
                {canManage && !isWsCreator && (
                  <button onClick={() => setConfirmRemove(m)} style={{ background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}>
                    <X size={12} style={{ color: '#C65454' }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {pendingAdd && (
        <AddMemberAccessDialog
          member={pendingAdd}
          canEditKB={pendingCanEditKB}
          onToggle={() => setPendingCanEditKB((v) => !v)}
          onCancel={() => setPendingAdd(null)}
          onConfirm={() => {
            onAdd({ ...pendingAdd, canEditKB: pendingCanEditKB });
            setPendingAdd(null);
            setAdding(false);
            setQ('');
          }}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Remove member"
          message={`Remove ${confirmRemove.name} from this workspace? They will lose access immediately.`}
          confirmLabel="Remove"
          danger
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => { onRemove(confirmRemove.userId); setConfirmRemove(null); }}
        />
      )}
    </>
  );
}

/* ─── Workspace Settings Modal ─── */
function WorkspaceSettingsModal({ workspace, currentUserId, isOrgAdmin, onClose, onUpdateMeta, onTransfer, onDelete }: {
  workspace: Workspace; currentUserId: string; isOrgAdmin: boolean;
  onClose: () => void;
  onUpdateMeta: (patch: { name?: string; description?: string }) => void;
  onTransfer: (id: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description);
  const [transferTarget, setTransferTarget] = useState('');
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const transferCandidates = workspace.members.filter((m) => m.userId !== workspace.createdBy);
  const isCreator = workspace.createdBy === currentUserId;

  const dirty = name !== workspace.name || description !== workspace.description;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, maxHeight: '86vh', overflowY: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 71 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, margin: 0 }}>Workspace Settings</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* General */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>General</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Workspace name *</label>
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 100))} style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 300))} rows={3} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 }} />
              </div>
              <button
                onClick={() => onUpdateMeta({ name: name.trim() || workspace.name, description })}
                disabled={!dirty || !name.trim()}
                style={{ alignSelf: 'flex-start', padding: '8px 18px', borderRadius: 8, border: 'none', background: (!dirty || !name.trim()) ? '#9CA3AF' : 'var(--navy)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: (!dirty || !name.trim()) ? 'not-allowed' : 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div style={{ padding: '16px', border: '1px solid #F9E7E7', borderRadius: 12, background: '#FEF7F7', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#C65454', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Danger zone</div>

            {/* Transfer */}
            {(isCreator || isOrgAdmin) && transferCandidates.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Transfer this workspace to another member</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <select
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value)}
                    style={{ flex: 1, height: 36, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 12, background: '#fff' }}
                  >
                    <option value="">Select a member...</option>
                    {transferCandidates.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                  </select>
                  <button
                    onClick={() => setConfirmTransfer(true)}
                    disabled={!transferTarget}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #C65454', background: '#fff', color: '#C65454', fontSize: 12, fontWeight: 500, cursor: transferTarget ? 'pointer' : 'not-allowed', opacity: transferTarget ? 1 : 0.5 }}
                  >
                    Transfer
                  </button>
                </div>
              </div>
            )}

            {/* Delete */}
            <div style={{ borderTop: '1px dashed #F3D5D5', paddingTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Permanently remove this workspace</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.55 }}>Documents and chat history will be deleted. This action cannot be undone.</div>
              <button
                onClick={() => setShowDelete(true)}
                style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#C65454', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                Delete Workspace
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmTransfer && (
        <ConfirmDialog
          title="Transfer workspace"
          message={`Transfer ownership to ${transferCandidates.find((m) => m.userId === transferTarget)?.name}? You will no longer be the owner of this workspace.`}
          confirmLabel="Transfer"
          onCancel={() => setConfirmTransfer(false)}
          onConfirm={() => { onTransfer(transferTarget); setConfirmTransfer(false); }}
        />
      )}

      {showDelete && (
        <DeleteWorkspaceDialog
          workspaceName={workspace.name}
          onCancel={() => setShowDelete(false)}
          onConfirm={() => { onDelete(); setShowDelete(false); }}
        />
      )}
    </>
  );
}

/* ─── Chat upload scope modal ───────────────────────────────────────────
 * Decides where an ad-hoc file uploaded inside the workspace chat should
 * live. Three viewer variants:
 *   External User          → single action: use in this chat only
 *                             + notice to contact admin for KB inclusion
 *   Member without KB edit → same single-action variant as external
 *   Org Admin / KB editor  → two options: workspace docs vs this chat only
 */
function ChatUploadScopeModal({ upload, isExternalUser, canAddToWorkspace, onCancel, onUseInChat, onAddToWorkspace }: {
  upload: { name: string; size: number; type: string };
  isExternalUser: boolean;
  canAddToWorkspace: boolean;
  onCancel: () => void;
  onUseInChat: () => void;
  onAddToWorkspace: () => void;
}) {
  const showTwoChoices = !isExternalUser && canAddToWorkspace;
  const sizeStr = upload.size < 1024 * 1024 ? `${(upload.size / 1024).toFixed(0)} KB` : `${(upload.size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 80, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 81 }}>
        <div style={{ padding: '22px 24px 14px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>
            {showTwoChoices ? 'Where should this file live?' : 'Attach file to this chat'}
          </h3>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--ice-warm)' }}>
            <FileText size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upload.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{upload.type.toUpperCase()} · {sizeStr}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 24px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {showTwoChoices ? (
            <>
              <ScopeChoiceRow
                title="Add to this workspace's documents"
                subtitle="Becomes part of the shared knowledge base. Everyone in the workspace can use it in their chats."
                primary
                onClick={onAddToWorkspace}
              />
              <ScopeChoiceRow
                title="Use just for this chat"
                subtitle="The file is not saved to the workspace. Only this chat can use it as context."
                onClick={onUseInChat}
              />
            </>
          ) : (
            <>
              {isExternalUser && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FBEED5', border: '1px solid #F3E2B1', fontSize: 12, color: '#6B4E1F', lineHeight: 1.55 }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>This file won't be added to the workspace documents.</strong>
                  It's used in this chat and kept privately in your own YourVault. If you need it added to the workspace so everyone can reference it, please send it to your workspace admin separately.
                </div>
              )}
              <ScopeChoiceRow
                title="Use in this chat"
                subtitle={isExternalUser ? 'Attach the file to this conversation and save it to your personal YourVault.' : 'Attach the file to this conversation only.'}
                primary
                onClick={onUseInChat}
              />
            </>
          )}
        </div>

        <div style={{ padding: '10px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
        </div>
      </div>
    </>
  );
}

function ScopeChoiceRow({ title, subtitle, primary, onClick }: { title: string; subtitle: string; primary?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '14px 16px', borderRadius: 12,
        border: '1px solid ' + (primary ? 'var(--navy)' : 'var(--border)'),
        background: primary ? 'var(--ice-warm)' : '#fff',
        cursor: 'pointer', transition: 'all 120ms',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--navy)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = primary ? 'var(--navy)' : 'var(--border)'; }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.55 }}>{subtitle}</div>
    </button>
  );
}

/* ─── Add-member access dialog — decides KB edit permission at add time ─── */
function AddMemberAccessDialog({ member, canEditKB, onToggle, onCancel, onConfirm }: { member: WorkspaceMember; canEditKB: boolean; onToggle: () => void; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 80, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 460, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 81 }}>
        <div style={{ padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ice-warm)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
              {initialsOf(member.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--text-primary)', margin: 0 }}>Add {member.name}?</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{member.email}</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            All members can chat with the AI using the workspace context. Decide whether this member should also be able to upload and remove workspace documents.
          </p>

          <div
            onClick={onToggle}
            style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', border: '1px solid ' + (canEditKB ? '#5CA868' : 'var(--border)'), background: canEditKB ? '#F3FAF5' : '#fff', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 120ms' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Can edit the knowledge base</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.55 }}>
                {canEditKB
                  ? 'Can add and remove workspace documents. Good for attorneys and paralegals working the matter.'
                  : 'Can only read the documents and chat with the AI. Good for observers or clients.'}
              </div>
            </div>
            <span style={{ width: 36, height: 20, borderRadius: 999, background: canEditKB ? '#5CA868' : '#CBD5E1', position: 'relative', transition: 'background 150ms', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: canEditKB ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 150ms' }} />
            </span>
          </div>
        </div>

        <div style={{ padding: '14px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Add Member</button>
        </div>
      </div>
    </>
  );
}

function ConfirmDialog({ title, message, confirmLabel, danger, onCancel, onConfirm }: { title: string; message: string; confirmLabel: string; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 80, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 440, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 81, padding: '20px 24px' }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, margin: 0 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: 10 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: danger ? '#C65454' : 'var(--navy)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{confirmLabel}</button>
        </div>
      </div>
    </>
  );
}

function DeleteWorkspaceDialog({ workspaceName, onCancel, onConfirm }: { workspaceName: string; onCancel: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState('');
  const matches = typed === workspaceName;
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 80, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 81, padding: '22px 24px' }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, margin: 0, color: '#C65454' }}>Delete workspace</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: 10 }}>
          This will delete <strong>{workspaceName}</strong> and all its documents and chat history. This action cannot be undone.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, marginBottom: 6 }}>Type the workspace name to confirm:</p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={workspaceName}
          style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={onConfirm} disabled={!matches} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: matches ? '#C65454' : '#9CA3AF', color: '#fff', fontSize: 13, fontWeight: 500, cursor: matches ? 'pointer' : 'not-allowed' }}>Delete Workspace</button>
        </div>
      </div>
    </>
  );
}
