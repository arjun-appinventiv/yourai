/* ─── WorkspacesPage — full-page list of workspaces ──────────────────────
 *
 * Renders inside ChatView when the sidebar "Workspaces" item is clicked.
 * The chat main area is hidden while this is active (sidebar stays visible)
 * so the experience feels like a real page, not a popup.
 *
 * Ships with the 3-step "New Workspace" modal that is triggered from the
 * header CTA and from the empty-state button. Everything here is mock-data
 * backed (src/lib/workspace.ts) — the fetch calls will be swapped in for the
 * real API in Sprint 2.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase, Plus, Search, Users as UsersIcon, FileText, Clock, X,
  ChevronLeft, ChevronRight, Check, UploadCloud, Trash2, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import { PERMISSIONS } from '../../lib/roles';
import {
  type Workspace,
  type WorkspaceMember,
  type WorkspaceDoc,
  listWorkspacesForUser,
  createWorkspace,
  seedWorkspacesIfEmpty,
} from '../../lib/workspace';
import { MOCK_WORKSPACES } from '../../lib/mockWorkspaces';
import { SEED_TEAM_MEMBERS, teamMembersForPicker } from './workspaceTeamSeed';

/* Relative "created X ago" for card rows. Cheap & cheerful. */
function relativeFrom(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) === 1 ? '' : 's'} ago`;
}

const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const fileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/* ─── Page ─── */
export interface WorkspacesPageProps {
  onBack: () => void;
  onOpenWorkspace: (workspaceId: string) => void;
  onToast?: (msg: string) => void;
}

export default function WorkspacesPage({ onBack, onOpenWorkspace, onToast }: WorkspacesPageProps) {
  const { operator } = useAuth();
  const { currentRole, hasPermission, isOrgAdmin } = useRole();
  const currentUserId = operator?.id || 'user-ryan';
  const currentUserName = operator?.name || 'You';
  const currentUserEmail = operator?.email || 'you@example.com';

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    seedWorkspacesIfEmpty(MOCK_WORKSPACES);
    refresh();
  }, []);

  const refresh = () => {
    setWorkspaces(listWorkspacesForUser(currentUserId, currentRole));
  };

  const canCreate = isOrgAdmin || hasPermission(PERMISSIONS.CREATE_WORKSPACE);

  const filtered = useMemo(() => {
    if (!search.trim()) return workspaces;
    const q = search.toLowerCase();
    return workspaces.filter((w) =>
      w.name.toLowerCase().includes(q) ||
      (w.description || '').toLowerCase().includes(q),
    );
  }, [workspaces, search]);

  const handleCreate = (draft: { name: string; description: string; members: WorkspaceMember[]; documents: WorkspaceDoc[] }) => {
    const ws = createWorkspace({
      name: draft.name,
      description: draft.description,
      createdBy: currentUserId,
      createdByName: currentUserName,
      createdByEmail: currentUserEmail,
      createdByRole: isOrgAdmin ? 'org_admin' : 'internal_user',
      members: draft.members,
      documents: draft.documents,
    });
    setCreating(false);
    refresh();
    onToast?.(`${ws.name} workspace created`);
    onOpenWorkspace(ws.id);
  };

  return (
    <div style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', background: '#FBFAF7' }}>
      {/* Page header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 32px 20px' }}>
          <button
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', marginLeft: -8, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft size={13} /> Back to chat
          </button>
          <div className="flex items-end justify-between gap-4 flex-wrap" style={{ marginTop: 10 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                Workspaces
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, maxWidth: 560 }}>
                {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
                {isOrgAdmin ? ' across the organisation' : ' you can access'}.
              </p>
            </div>
            {canCreate && (
              <button
                onClick={() => setCreating(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(10,36,99,0.15)' }}
              >
                <Briefcase size={14} /> New Workspace
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List area */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 32px 48px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workspaces..."
            style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border)', paddingLeft: 36, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", background: '#fff' }}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            searchActive={!!search.trim()}
            canCreate={canCreate}
            onCreate={() => setCreating(true)}
          />
        ) : (
          <div
            style={{
              display: 'grid', gap: 16,
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            }}
          >
            {filtered.map((w) => (
              <WorkspaceCard
                key={w.id}
                workspace={w}
                onClick={() => onOpenWorkspace(w.id)}
              />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <CreateWorkspaceModal
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          isOrgAdmin={isOrgAdmin}
          onClose={() => setCreating(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

/* ─── Empty state ─── */
function EmptyState({ searchActive, canCreate, onCreate }: { searchActive: boolean; canCreate: boolean; onCreate: () => void }) {
  if (searchActive) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 14, background: '#fff' }}>
        <Briefcase size={36} style={{ margin: '0 auto 12px', opacity: 0.4, color: 'var(--text-muted)' }} />
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
          No workspaces match your search.
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 14, background: '#fff' }}>
      <Briefcase size={40} style={{ margin: '0 auto 14px', opacity: 0.4, color: 'var(--text-muted)' }} />
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
        No workspaces yet
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
        {canCreate
          ? 'Create your first workspace to start collaborating on a matter.'
          : 'You have not been added to any workspaces yet. Contact your administrator.'}
      </div>
      {canCreate && (
        <button
          onClick={onCreate}
          style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          <Briefcase size={14} /> New Workspace
        </button>
      )}
    </div>
  );
}

/* ─── Workspace card ─── */
function WorkspaceCard({ workspace, onClick }: { workspace: Workspace; onClick: () => void }) {
  const { documents, members } = workspace;
  const readyCount = documents.filter((d) => d.status === 'ready').length;
  const processingCount = documents.filter((d) => d.status === 'processing').length;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '18px 20px', borderRadius: 14, border: '1px solid var(--border)',
        background: '#fff', cursor: 'pointer',
        transition: 'all 0.15s', minHeight: 180,
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'var(--navy)';
        el.style.boxShadow = '0 4px 18px rgba(10,36,99,0.08)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'var(--border)';
        el.style.boxShadow = 'none';
        el.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Briefcase size={18} style={{ color: 'var(--navy)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.3 }}>{workspace.name}</div>
          <div
            style={{
              fontSize: 12, color: 'var(--text-muted)', marginTop: 4,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.5,
            }}
          >
            {workspace.description || <span style={{ fontStyle: 'italic' }}>No description.</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 'auto', paddingTop: 14 }}>
        <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          <UsersIcon size={12} /> {members.length} member{members.length !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          <FileText size={12} /> {documents.length} doc{documents.length !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          <Clock size={12} /> Created {relativeFrom(workspace.createdAt)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        {/* Member avatars */}
        <div style={{ display: 'flex' }}>
          {members.slice(0, 4).map((m, i) => (
            <div
              key={m.userId}
              title={m.name}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                background: '#F0F3F6', color: '#1E3A8A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 600,
                border: '2px solid #fff',
                marginLeft: i === 0 ? 0 : -6,
                zIndex: 4 - i,
              }}
            >
              {initialsOf(m.name)}
            </div>
          ))}
          {members.length > 4 && (
            <div
              style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'var(--ice-warm)', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 600,
                border: '2px solid #fff',
                marginLeft: -6,
              }}
            >
              +{members.length - 4}
            </div>
          )}
        </div>

        {/* Doc status pill */}
        {documents.length > 0 && (
          processingCount > 0 ? (
            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 999, background: '#FBEED5', color: '#E8A33D', fontWeight: 500, marginLeft: 'auto' }}>
              {processingCount} Processing
            </span>
          ) : (
            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 999, background: '#E7F3E9', color: '#5CA868', fontWeight: 500, marginLeft: 'auto' }}>
              {readyCount} Ready
            </span>
          )
        )}
      </div>
    </div>
  );
}

/* ─── Create Workspace Modal — 3-step wizard ─── */
interface CreateModalProps {
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  isOrgAdmin: boolean;
  onClose: () => void;
  onCreate: (draft: { name: string; description: string; members: WorkspaceMember[]; documents: WorkspaceDoc[] }) => void;
}

function CreateWorkspaceModal({ currentUserId, currentUserName, currentUserEmail, isOrgAdmin, onClose, onCreate }: CreateModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [docs, setDocs] = useState<WorkspaceDoc[]>([]);

  const canNext1 = name.trim().length > 0;

  const goNext = () => { if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3); };
  const goBack = () => { if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3); };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 580, maxHeight: '88vh', backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 71, display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>New Workspace</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Step {step} of 3 · {step === 1 ? 'Details' : step === 2 ? 'Add members' : 'Add documents'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        {/* Numbered-circle stepper with green checkmarks for completed steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px 6px' }}>
          {[1, 2, 3].map((n, i) => {
            const isActive = step === n;
            const isDone = step > n;
            const labels: Record<number, string> = { 1: 'Details', 2: 'Members', 3: 'Documents' };
            return (
              <React.Fragment key={n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: isDone ? '#5CA868' : isActive ? 'var(--navy)' : '#E5E7EB',
                    color: isDone || isActive ? '#fff' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600,
                  }}>
                    {isDone ? <Check size={11} strokeWidth={3} /> : n}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--text-primary)' : isDone ? '#5CA868' : 'var(--text-muted)' }}>
                    {labels[n]}
                  </span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: step > n ? '#5CA868' : '#E5E7EB', borderRadius: 2 }} />}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {step === 1 && (
            <StepDetails
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
            />
          )}
          {step === 2 && (
            <StepMembers
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserEmail={currentUserEmail}
              isOrgAdmin={isOrgAdmin}
              members={members}
              setMembers={setMembers}
            />
          )}
          {step === 3 && (
            <StepDocuments
              docs={docs}
              setDocs={setDocs}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div>
            {step > 1 && (
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>
                <ChevronLeft size={14} /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step >= 2 && (
              <button
                onClick={step === 3 ? () => onCreate({ name, description, members, documents: docs }) : goNext}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                Skip for now
              </button>
            )}
            {step === 1 && (
              <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>
                Cancel
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={goNext}
                disabled={step === 1 && !canNext1}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 18px', borderRadius: 8, border: 'none', background: (step === 1 && !canNext1) ? '#9CA3AF' : 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: (step === 1 && !canNext1) ? 'not-allowed' : 'pointer' }}
              >
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => onCreate({ name, description, members, documents: docs })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                <Briefcase size={13} /> Create Workspace
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Step 1: Details ─── */
function StepDetails({ name, setName, description, setDescription }: { name: string; setName: (v: string) => void; description: string; setDescription: (v: string) => void }) {
  const [nameError, setNameError] = useState('');
  const inputStyle: React.CSSProperties = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>Workspace name</label>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value.slice(0, 100)); if (nameError) setNameError(''); }}
          onBlur={() => { if (!name.trim()) setNameError('Workspace name is required.'); }}
          placeholder="e.g. Meridian Capital v Apex"
          style={{ ...inputStyle, borderColor: nameError ? '#C65454' : 'var(--border)' }}
          autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#C65454' }}>{nameError}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{name.length}/100</span>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 300))}
          rows={3}
          placeholder="What is this workspace for? e.g. M&A due diligence matter for Meridian Capital"
          style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }}
        />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>{description.length}/300</div>
      </div>
    </div>
  );
}

/* ─── Step 2: Add Members ─── */
function StepMembers({ currentUserId, currentUserName, currentUserEmail, isOrgAdmin, members, setMembers }: {
  currentUserId: string; currentUserName: string; currentUserEmail: string; isOrgAdmin: boolean;
  members: WorkspaceMember[]; setMembers: React.Dispatch<React.SetStateAction<WorkspaceMember[]>>;
}) {
  const [q, setQ] = useState('');
  const candidates = useMemo(() => {
    const all = teamMembersForPicker();
    return all
      .filter((m) => m.userId !== currentUserId)
      .filter((m) => !q.trim() || (m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase())));
  }, [q, currentUserId]);

  const toggle = (m: WorkspaceMember) => {
    setMembers((prev) => prev.some((x) => x.userId === m.userId) ? prev.filter((x) => x.userId !== m.userId) : [...prev, m]);
  };
  const isSelected = (id: string) => members.some((m) => m.userId === id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Add team members</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Who is working on this matter?</p>
      </div>

      {/* Owner pill */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'var(--ice-warm)', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>
          {initialsOf(currentUserName)}
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>You (Owner)</span>
      </div>

      {/* Selected members */}
      {members.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Adding {members.length}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {members.map((m) => (
              <span key={m.userId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 500 }}>
                {m.name}
                <button onClick={() => toggle(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 0 }}><X size={11} /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email..."
            style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 34, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>
        <div style={{ maxHeight: 240, overflowY: 'auto', marginTop: 8, borderRadius: 10, border: '1px solid var(--border)' }}>
          {candidates.length === 0 ? (
            <div style={{ padding: '20px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No matches</div>
          ) : candidates.map((m) => {
            const sel = isSelected(m.userId);
            return (
              <div
                key={m.userId}
                onClick={() => toggle(m)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: sel ? 'var(--ice-warm)' : 'white', transition: 'background 100ms' }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F0F3F6', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                  {initialsOf(m.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.email}</div>
                </div>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: m.role === 'org_admin' ? 'var(--navy)' : m.role === 'external_user' ? '#E7F3E9' : '#F0F3F6', color: m.role === 'org_admin' ? '#fff' : m.role === 'external_user' ? '#5CA868' : '#1E3A8A', fontWeight: 500 }}>
                  {m.role === 'org_admin' ? 'Org Admin' : m.role === 'external_user' ? 'Client' : 'Internal'}
                </span>
                {sel && <Check size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 3: Add Documents ─── */
const ACCEPTED_TYPES: Record<string, true> = { pdf: true, docx: true, xlsx: true, txt: true };
const MAX_FILE_BYTES = 100 * 1024 * 1024;

function StepDocuments({ docs, setDocs, currentUserId, currentUserName }: {
  docs: WorkspaceDoc[]; setDocs: React.Dispatch<React.SetStateAction<WorkspaceDoc[]>>;
  currentUserId: string; currentUserName: string;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const processFiles = (files: FileList | File[]) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const picked = Array.from(files);
    const accepted: WorkspaceDoc[] = [];
    picked.forEach((f) => {
      const ext = f.name.lastIndexOf('.') !== -1 ? f.name.slice(f.name.lastIndexOf('.') + 1).toLowerCase() : '';
      if (!ACCEPTED_TYPES[ext]) return;
      if (f.size > MAX_FILE_BYTES) return;
      accepted.push({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: f.size,
        type: ext,
        uploadedBy: currentUserId,
        uploadedByName: currentUserName,
        uploadedAt: today,
        status: 'processing',
      });
    });
    setDocs((prev) => [...prev, ...accepted]);
    // Simulate ready transition after short delay
    accepted.forEach((d) => {
      setTimeout(() => {
        setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: 'ready' as const } : x)));
      }, 1500);
    });
  };

  // File-type visual mapping — keeps docs recognisable at a glance
  const typeStyle = (ext: string): { bg: string; color: string; label: string } => {
    switch (ext.toLowerCase()) {
      case 'pdf':  return { bg: '#F9E7E7', color: '#C65454', label: 'PDF' };
      case 'docx': return { bg: '#E2ECF9', color: '#1E3A8A', label: 'DOCX' };
      case 'xlsx': return { bg: '#E7F3E9', color: '#5CA868', label: 'XLSX' };
      case 'txt':  return { bg: '#F0F3F6', color: '#6B7885', label: 'TXT' };
      default:     return { bg: '#F0F3F6', color: '#6B7885', label: ext.toUpperCase() };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Upload case documents</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
          These become the workspace knowledge base. The AI searches these documents first when answering questions in this workspace.
        </p>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files) processFiles(e.dataTransfer.files); }}
        style={{
          padding: '36px 20px', borderRadius: 14,
          border: `2px dashed ${dragActive ? '#C9A84C' : 'var(--border)'}`,
          background: dragActive ? '#FDF6E3' : '#FBFAF7',
          textAlign: 'center', cursor: 'pointer',
          transition: 'all 120ms',
        }}
      >
        <UploadCloud size={28} style={{ margin: '0 auto 10px', color: dragActive ? '#C9A84C' : 'var(--navy)', opacity: 0.85 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Drag case files here</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>or click to browse</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>PDF, DOCX, XLSX, TXT — Max 100 MB per file</div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.txt"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docs.map((d) => {
            const t = typeStyle(d.type);
            return (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 5, background: t.bg, color: t.color, flexShrink: 0, letterSpacing: '0.05em' }}>
                  {t.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fileSize(d.size)} · Ready to upload</div>
                </div>
                <button onClick={() => setDocs((prev) => prev.filter((x) => x.id !== d.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
