/* ─────────────── Workspaces Panel ───────────────
 *
 * Listing of the current user's workspaces. Membership-filtered via
 * workspaceAccess.filterVisibleWorkspaces — non-members never see a
 * workspace, not even its name.
 *
 *   - "+ New Workspace" button visible only with create_workspace permission
 *     (Org Admin implicitly). New workspaces auto-set current user as owner.
 *   - Clicking a workspace opens the Access view (stub) for now — Sprint 2
 *     will hand off to a real detail panel. Non-members hitting the access
 *     view get the lock screen.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Briefcase, Plus, Search, Lock, Trash2, UserCheck, FileText,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS, ROLE } from '../../lib/roles';
import {
  loadWorkspaces, saveWorkspaces, filterVisibleWorkspaces,
  canAccessWorkspace, softDeleteWorkspace,
} from '../../lib/workspaceAccess';

export default function WorkspacesPanel({ onClose, onToast }) {
  const { currentRole, hasPermission, isOrgAdmin } = useRole();
  const { operator } = useAuth();
  const currentUserId = operator?.id || 'user-ryan'; // demo fallback

  const [workspaces, setWorkspaces] = useState(loadWorkspaces);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [openingId, setOpeningId] = useState(null);  // null | string
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { saveWorkspaces(workspaces); }, [workspaces]);

  const visible = useMemo(
    () => filterVisibleWorkspaces(workspaces, currentUserId, currentRole),
    [workspaces, currentUserId, currentRole],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return visible;
    const q = search.toLowerCase();
    return visible.filter((w) => w.name.toLowerCase().includes(q) || (w.description || '').toLowerCase().includes(q));
  }, [visible, search]);

  const canCreate = isOrgAdmin || hasPermission(PERMISSIONS.CREATE_WORKSPACE);
  const canDelete = (w) => isOrgAdmin || (w.ownerId === currentUserId && hasPermission(PERMISSIONS.DELETE_WORKSPACE));

  const openWorkspace = (id) => setOpeningId(id);
  const closeWorkspace = () => setOpeningId(null);

  const handleCreate = (data) => {
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newWs = {
      id: `ws-${Date.now()}`,
      name: data.name.trim(),
      description: data.description.trim(),
      ownerId: currentUserId,
      members: [currentUserId],
      status: 'Active',
      createdAt: now,
      deletedAt: null,
      matterCount: 0,
      documentCount: 0,
    };
    setWorkspaces((prev) => [newWs, ...prev]);
    setCreating(false);
    onToast?.(`Workspace "${newWs.name}" created`);
  };

  const handleDelete = (ws) => {
    setWorkspaces((prev) => softDeleteWorkspace(prev, ws.id));
    setConfirmDelete(null);
    onToast?.(`"${ws.name}" archived. Data retained for 30 days.`);
  };

  const activeOpening = openingId ? workspaces.find((w) => w.id === openingId) : null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[640px] md:max-h-[85vh] md:rounded-2xl"
        style={{ backgroundColor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 61, display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Workspaces</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {isOrgAdmin
                  ? `${visible.length} across the organisation`
                  : `${visible.length} you can access`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canCreate && (
                <button
                  onClick={() => setCreating(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                >
                  <Plus size={14} /> New Workspace
                </button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
          </div>
          <div style={{ position: 'relative', marginTop: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workspaces..."
              style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 32, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>
          {filtered.length === 0 ? (
            <EmptyState
              isInternalOrExternal={currentRole !== ROLE.ORG_ADMIN}
              hasSearch={Boolean(search.trim())}
              canCreate={canCreate}
              onCreate={() => setCreating(true)}
            />
          ) : (
            filtered.map((w) => (
              <WorkspaceCard
                key={w.id}
                workspace={w}
                isOwner={w.ownerId === currentUserId}
                canDelete={canDelete(w)}
                onOpen={() => openWorkspace(w.id)}
                onDelete={() => setConfirmDelete(w)}
              />
            ))
          )}
        </div>
      </div>

      {/* Create workspace */}
      {creating && <CreateWorkspaceModal onClose={() => setCreating(false)} onCreate={handleCreate} />}

      {/* Open / access-gate */}
      {activeOpening && (
        <WorkspaceAccessView
          workspace={activeOpening}
          canAccess={canAccessWorkspace(activeOpening, currentUserId, currentRole)}
          onClose={closeWorkspace}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmDeleteWorkspaceModal
          workspace={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </>
  );
}

/* ─────────────── Empty state ─────────────── */
function EmptyState({ isInternalOrExternal, hasSearch, canCreate, onCreate }) {
  if (hasSearch) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
        <Briefcase size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
        <div style={{ fontSize: 14, fontWeight: 500 }}>No workspaces match your search</div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
      <Briefcase size={36} style={{ margin: '0 auto 14px', opacity: 0.4 }} />
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
        {isInternalOrExternal
          ? 'You have not been added to any workspaces yet.'
          : 'No workspaces yet'}
      </div>
      <div style={{ fontSize: 12, marginTop: 6, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
        {isInternalOrExternal
          ? 'Once a colleague adds you to a workspace, it will appear here.'
          : 'Create your first workspace to group matters, documents, and conversations for a client.'}
      </div>
      {canCreate && (
        <button
          onClick={onCreate}
          style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          <Plus size={14} /> New Workspace
        </button>
      )}
    </div>
  );
}

/* ─────────────── Workspace card ─────────────── */
function WorkspaceCard({ workspace, isOwner, canDelete, onOpen, onDelete }) {
  const memberCount = workspace.members.length;
  return (
    <div
      onClick={onOpen}
      style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', marginTop: 8, cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'var(--navy)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0" style={{ flex: 1 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Briefcase size={18} style={{ color: 'var(--navy)' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{workspace.name}</span>
              {isOwner && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: '#F0F3F6', color: '#1E3A8A', fontWeight: 500 }}>Owner</span>
              )}
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: '#E7F3E9', color: '#5CA868', fontWeight: 500 }}>
                {workspace.status || 'Active'}
              </span>
            </div>
            {workspace.description && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{workspace.description}</div>
            )}
            <div className="flex items-center gap-4" style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><UserCheck size={12} /> {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1"><FileText size={12} /> {workspace.documentCount || 0} docs</span>
              <span>Created {workspace.createdAt || '—'}</span>
            </div>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Archive workspace"
            style={{ padding: 6, borderRadius: 6, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }}
          >
            <Trash2 size={13} style={{ color: '#C65454' }} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Access view (stub + lock screen) ─────────────── */
function WorkspaceAccessView({ workspace, canAccess, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 460, backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 71 }}>
        {!canAccess ? (
          <div style={{ padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F9E7E7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Lock size={22} style={{ color: '#C65454' }} />
            </div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Workspace locked</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 10 }}>
              You do not have access to this workspace. Contact your administrator if you believe this is a mistake.
            </p>
            <button
              onClick={onClose}
              style={{ marginTop: 20, padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>{workspace.name}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{workspace.members.length} members · Created {workspace.createdAt}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {workspace.description && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{workspace.description}</p>
              )}
              <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 10, background: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Full workspace detail view (matters, documents, team management) is wired in Sprint 2.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─────────────── Create workspace modal ─────────────── */
function CreateWorkspaceModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const inputStyle = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 460, backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 71 }}>
        <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>New Workspace</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Workspace name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Smith v. Jones — Employment" style={inputStyle} autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this workspace for?" style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            You'll automatically become the owner. Add team members from the workspace detail view.
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button
            onClick={() => name.trim() && onCreate({ name, description })}
            disabled={!name.trim()}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: name.trim() ? 'var(--navy)' : '#9CA3AF', color: 'white', fontSize: 13, fontWeight: 500, cursor: name.trim() ? 'pointer' : 'not-allowed' }}
          >
            Create Workspace
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────── Delete confirmation ─────────────── */
function ConfirmDeleteWorkspaceModal({ workspace, onCancel, onConfirm }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 440, backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 71 }}>
        <div style={{ padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F9E7E7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trash2 size={16} style={{ color: '#C65454' }} />
            </div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--text-primary)', margin: 0 }}>Archive workspace?</h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            <strong>{workspace.name}</strong> will be archived. Data is retained for 30 days — contact your administrator to restore it during that window.
          </p>
        </div>
        <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#C65454', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Archive
          </button>
        </div>
      </div>
    </>
  );
}
