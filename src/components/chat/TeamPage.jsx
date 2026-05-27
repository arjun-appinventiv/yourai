/* ─────────────── Team Page (full-page replacement for InviteTeamPanel) ───────────────
 *
 * Renders in the main content area of ChatView when the user clicks
 * "Invite Team" in the sidebar. Replaces the modal-overlay flow so the
 * experience feels like a dedicated page with breathing room, not a popup.
 *
 * The sub-flows (3-step invite wizard, edit permissions, remove confirm)
 * remain modal overlays because they're short, focused tasks.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, UserPlus, Search, Edit3, Trash2, Users as UsersIcon,
  ShieldCheck, Mail, ChevronLeft, ChevronRight, Check, AlertTriangle, X,
  KeyRound, AlertCircle, ChevronDown, Lock, CheckCircle, UserCog,
} from 'lucide-react';
import {
  PERMISSIONS, ROLE, ROLE_LABEL, INVITE_PERMISSION_GROUPS,
  INVITE_BASE_PERMISSIONS, INTERNAL_USER_BASE, EXTERNAL_USER_BASE,
} from '../../lib/roles';
import { listWorkspaces, seedWorkspacesIfEmpty, addMember as addWorkspaceMember } from '../../lib/workspace';
import { MOCK_WORKSPACES } from '../../lib/mockWorkspaces';

/* Seed + storage ─ shares the same key as the earlier panel so existing
   invited members persist across the UI migration. */
const SEED_MEMBERS = [
  { id: 'm-001', name: 'Ryan Melade',    email: 'ryan@hartwell.com',     role: ROLE.ORG_ADMIN,    status: 'Active',  permissions: [],                                                                invitedBy: 'self',        invitedAt: 'Apr 4, 2026' },
  { id: 'm-002', name: 'Priya Shah',     email: 'priya@hartwell.com',    role: ROLE.INTERNAL_USER,status: 'Active',  permissions: [PERMISSIONS.CREATE_WORKSPACE, PERMISSIONS.VIEW_AUDIT_LOGS],       invitedBy: 'Ryan Melade', invitedAt: 'Apr 6, 2026' },
  { id: 'm-003', name: 'Kevin Marlowe',  email: 'kevin@hartwell.com',    role: ROLE.INTERNAL_USER,status: 'Invited', permissions: [PERMISSIONS.ACCESS_BILLING],                                      invitedBy: 'Ryan Melade', invitedAt: 'Apr 10, 2026' },
  { id: 'm-004', name: 'Acme Corp (Client)', email: 'liaison@acmecorp.com', role: ROLE.EXTERNAL_USER, status: 'Active', permissions: [],                                                              invitedBy: 'Ryan Melade', invitedAt: 'Apr 11, 2026' },
];
const STORAGE_KEY = 'yourai_team_members';
const loadMembers = () => { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : SEED_MEMBERS; } catch { return SEED_MEMBERS; } };
const saveMembers = (list) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ } };

const ROLE_BADGE_STYLE = {
  [ROLE.ORG_ADMIN]:     { bg: '#0A2463',  color: '#ffffff' },
  [ROLE.INTERNAL_USER]: { bg: '#F0F3F6',  color: '#1E3A8A' },
  [ROLE.EXTERNAL_USER]: { bg: '#E7F3E9',  color: '#5CA868' },
};
const STATUS_STYLE = {
  Active:  { bg: '#E7F3E9', color: '#5CA868' },
  Invited: { bg: '#FBEED5', color: '#E8A33D' },
  Blocked: { bg: '#F9E7E7', color: '#C65454' },
};
const initialsOf = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const PERM_PILL_LABELS = {
  [PERMISSIONS.CREATE_WORKSPACE]:   'Create workspaces',
  [PERMISSIONS.TRANSFER_WORKSPACE]: 'Transfer ownership',
  [PERMISSIONS.CREATE_GLOBAL_KP]:   'Global KP',
  [PERMISSIONS.VIEW_AUDIT_LOGS]:    'Audit logs',
  [PERMISSIONS.VIEW_USAGE_REPORTS]: 'Usage reports',
  [PERMISSIONS.ACCESS_BILLING]:     'Billing',
};

/* Workspace category accent tones (mirrors PRACTICE_META in WorkspacesPage). */
const WORKSPACE_CATEGORY_COLORS = {
  Transactional: { bg: '#E8EEF9', color: '#3754A8' },
  Litigation:    { bg: '#F9E7E7', color: '#C65454' },
  Compliance:    { bg: '#FBEED5', color: '#C8843E' },
  Employment:    { bg: '#E0F2F2', color: '#3D8A8A' },
  Corporate:     { bg: '#E7F3E9', color: '#5CA868' },
};

/* Per-role "Can do" lists shown in the right detail pane. INTERNAL_USER is
   the catch-all (Manager + Team in the broader Hartwell taxonomy); the
   user's actual `permissions[]` array is shown as a secondary "Granted"
   list within the pane so the user sees exactly what extras they've been
   granted on top of the base role. */
const ROLE_BASE_PERMISSIONS = {
  [ROLE.ORG_ADMIN]: [
    'Manage tenant-wide settings',
    'Create & manage workspaces',
    'Invite & remove users',
    'View Audit Logs',
    'Manage billing & seats',
  ],
  [ROLE.INTERNAL_USER]: [
    'Work in assigned workspaces',
    'Upload & analyse documents',
    'Run workflows',
    'Log billable time',
  ],
  [ROLE.EXTERNAL_USER]: [
    'View shared workspaces',
    'Download released reports',
    'Message the firm',
  ],
};

/* Extra metadata (MFA / SSO / workspaces / logs) — would come from the
   backend. Layered on by member id so the right pane has rich content. */
const USER_META = {
  'm-001': { // Ryan Melade — Org Admin
    mfa: true, mfaMethod: 'Authenticator app', sso: true, ssoProvider: 'Okta SAML',
    workspaceAccess: 'All 6',
    workspaces: [
      { name: 'Acme Corp · NDA Review', category: 'Transactional' },
      { name: 'Meridian v. Apex', category: 'Litigation' },
      { name: 'TechStart Inc · DD', category: 'Transactional' },
      { name: 'Q2 Compliance Audit', category: 'Compliance' },
      { name: 'Hartwell Internal · HR', category: 'Employment' },
      { name: 'Pacific Holdings · M&A', category: 'Corporate' },
    ],
    logs: [
      { text: 'Updated billing seats from 8 to 10', time: 'Today · 14:02' },
      { text: 'Invited Kevin Marlowe as Internal user', time: '9 days ago · 09:14' },
      { text: 'Approved time entries (Priya Shah · 8h)', time: '12 days ago · 16:30' },
      { text: 'Created workspace "Pacific Holdings · M&A"', time: '3 weeks ago' },
    ],
  },
  'm-002': { // Priya Shah — Internal User (Manager tier)
    mfa: true, mfaMethod: 'Authenticator app', sso: true, ssoProvider: 'Okta SAML',
    workspaceAccess: '4 of 6',
    workspaces: [
      { name: 'Acme Corp · NDA Review', category: 'Transactional' },
      { name: 'Meridian v. Apex', category: 'Litigation' },
      { name: 'TechStart Inc · DD', category: 'Transactional' },
      { name: 'Q2 Compliance Audit', category: 'Compliance' },
    ],
    logs: [
      { text: 'Shared Report to Acme client portal · NDA Review', time: '11:42 today' },
      { text: 'Generated NDA Key Obligations report · NDA Review', time: '10:05 today' },
      { text: 'Uploaded Compliance_Checklist.pdf', time: 'Yesterday · 11:30am' },
      { text: 'Ran Contract Review workflow · NDA Review', time: '2 days ago' },
      { text: 'Logged 4.5h billable · Meridian v. Apex', time: '3 days ago' },
    ],
  },
  'm-003': { // Kevin Marlowe — Internal User (Invited)
    mfa: false, mfaMethod: null, sso: false, ssoProvider: null,
    workspaceAccess: '0 of 6',
    workspaces: [],
    logs: [
      { text: 'Invitation sent', time: '9 days ago · 09:14' },
    ],
  },
  'm-004': { // Acme Corp — External (Client)
    mfa: true, mfaMethod: 'Authenticator app', sso: false, ssoProvider: null,
    workspaceAccess: '1 of 6',
    workspaces: [
      { name: 'Acme Corp · NDA Review', category: 'Transactional' },
    ],
    logs: [
      { text: 'Downloaded NDA Key Obligations report', time: 'Yesterday · 15:22' },
      { text: 'Sent message to Priya Shah', time: '2 days ago' },
      { text: 'Joined workspace "Acme Corp · NDA Review"', time: '3 weeks ago' },
    ],
  },
};

function getRoleDisplayColor(role) {
  if (role === ROLE.ORG_ADMIN) return { bg: '#F9E7E7', color: '#C65454' };
  if (role === ROLE.INTERNAL_USER) return { bg: '#E8EEF9', color: '#3754A8' };
  if (role === ROLE.EXTERNAL_USER) return { bg: '#FBEED5', color: '#C8843E' };
  return { bg: '#F0F3F6', color: '#6B7885' };
}

function RolePill({ role }) {
  const c = getRoleDisplayColor(role);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
      background: c.bg, color: c.color, lineHeight: 1.5,
    }}>{ROLE_LABEL[role] || role}</span>
  );
}

function WorkspaceCategoryTag({ category }) {
  const c = WORKSPACE_CATEGORY_COLORS[category] || { bg: '#F0F3F6', color: '#6B7885' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 4, fontSize: 10,
      fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
      background: c.bg, color: c.color, lineHeight: 1.4,
    }}>{category}</span>
  );
}

function StatTile({ label, value, sub, icon: Icon, tone = 'neutral' }) {
  const tones = {
    neutral: { iconBg: 'var(--ice-warm)', iconColor: 'var(--navy)' },
    warning: { iconBg: '#FBEED5', iconColor: '#C8843E' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
      padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: t.iconBg,
        color: t.iconColor, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
        }}>{label}</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.15 }}>{value}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function FilterChip({ label, value }) {
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 999,
      border: '1px solid var(--border)', background: '#fff',
      fontSize: 12.5, color: 'var(--text-primary)', cursor: 'pointer',
    }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
      <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}

function PaneSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
      }}>{title}</div>
      {children}
    </div>
  );
}

/* ─────────────── Page component ─────────────── */
export default function TeamPage({ onBack, onCountChange, onToast }) {
  const [members, setMembers] = useState(loadMembers);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  // `view` switches between the member list and the full-page invite flow.
  const [view, setView]             = useState('list'); // 'list' | 'invite'
  const [editing, setEditing]       = useState(null);
  const [removing, setRemoving]     = useState(null);
  // Right-pane selection. Initialise to the first non-Org-Admin member so
  // the pane shows a representative selection on first load (matches the
  // PM mockup). Falls back to first member.
  const initialMembers = loadMembers();
  const [selectedMemberId, setSelectedMemberId] = useState(() => {
    const first = initialMembers.find((m) => m.role !== ROLE.ORG_ADMIN);
    return (first || initialMembers[0])?.id;
  });

  useEffect(() => { saveMembers(members); onCountChange?.(members.length); }, [members, onCountChange]);

  const filtered = useMemo(() => {
    let list = members;
    if (roleFilter !== 'all') list = list.filter((m) => m.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        ROLE_LABEL[m.role].toLowerCase().includes(q),
      );
    }
    return list;
  }, [members, roleFilter, search]);

  const counts = useMemo(() => ({
    total:    members.length,
    admins:   members.filter((m) => m.role === ROLE.ORG_ADMIN).length,
    internal: members.filter((m) => m.role === ROLE.INTERNAL_USER).length,
    external: members.filter((m) => m.role === ROLE.EXTERNAL_USER).length,
    invited:  members.filter((m) => m.status === 'Invited').length,
  }), [members]);

  const handleInvite = (draft) => {
    const newMember = {
      id: `m-${Date.now()}`,
      name: draft.name.trim(),
      email: draft.email.trim(),
      role: draft.role,
      status: 'Invited',
      permissions: draft.permissions,
      invitedBy: 'You',
      invitedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setMembers((prev) => [newMember, ...prev]);

    // Both External (required) and Internal (optional) invites can include
    // a list of workspaces to immediately add the new member to. Honour the
    // KB-edit toggle per workspace.
    if (Array.isArray(draft.workspaceIds) && draft.workspaceIds.length > 0) {
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const wsRole = draft.role === ROLE.EXTERNAL_USER ? 'external_user' : 'internal_user';
      draft.workspaceIds.forEach((wsId) => {
        addWorkspaceMember(wsId, {
          userId: newMember.id,
          name: newMember.name,
          email: newMember.email,
          role: wsRole,
          addedAt: today,
          addedBy: 'You',
          canEditKB: !!draft.canEditKB,
        });
      });
    }

    setView('list');
    const wsCount = draft.workspaceIds?.length || 0;
    onToast?.(
      draft.role === ROLE.EXTERNAL_USER && wsCount > 0
        ? `Invitation sent to ${newMember.email} and added to ${wsCount} workspace${wsCount !== 1 ? 's' : ''}`
        : `Invitation sent to ${newMember.email}`,
    );
  };

  const handleSaveEdit = (updated) => {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
    setEditing(null);
    onToast?.(`Updated permissions for ${updated.name}`);
  };

  const handleRemove = (member) => {
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    setRemoving(null);
    onToast?.(`${member.name} has been removed.`);
  };

  // ─── Render: invite flow takes over the whole page ─────────────────────
  if (view === 'invite') {
    return (
      <InviteFlow
        onBack={() => setView('list')}
        onSubmit={handleInvite}
      />
    );
  }

  /* Pending invite (first one — the banner only surfaces a single line). */
  const pendingInvite = members.find((m) => m.status === 'Invited');
  const activeMembers = members.filter((m) => m.status === 'Active');
  const mfaEnrolled = activeMembers.filter((m) => USER_META[m.id]?.mfa).length;
  const ssoConnected = members.some((m) => USER_META[m.id]?.sso);

  /* Resolve currently-selected member (works even when the filter excludes it). */
  const selectedMember = filtered.find((m) => m.id === selectedMemberId) || members.find((m) => m.id === selectedMemberId);
  const selectedMeta = selectedMember ? USER_META[selectedMember.id] : null;

  return (
    <div style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', background: '#FBFAF7' }}>
      {/* ─── Page header ─── */}
      <div style={{ borderBottom: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ padding: '20px 32px 16px' }}>
          <button
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <ArrowLeft size={13} /> Back to chat
          </button>
        </div>
      </div>

      {/* ─── Body ─── split-pane: list left, detail rail right */}
      <div style={{ padding: '24px 32px 48px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* LEFT — list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Editorial title */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <UsersIcon size={14} style={{ color: '#C8843E' }} />
              <span style={{
                fontSize: 10.5, fontWeight: 600, color: '#C8843E',
                textTransform: 'uppercase', letterSpacing: '0.12em',
              }}>User Management</span>
            </div>
            <h1 style={{
              fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 500,
              color: 'var(--text-primary)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.4px',
            }}>Who has access &amp; what they can do</h1>
            <p style={{ marginTop: 8, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, maxWidth: 720 }}>
              Invite colleagues and clients and grant access.
            </p>
          </div>

          {/* MVP cut 2026-05-26 — dropped the 4-stat tile row (Active Users /
             MFA / SSO / Pending Invites), the pending-invite banner with
             Resend, the Role/Status/MFA filter chips, and the Permission
             Matrix link. The role tabs + search + table cover MVP needs. */}

          {/* Role tabs + search + invite — single row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 280, flexShrink: 0 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 34, paddingRight: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", background: '#fff' }}
                />
              </div>
              {[
                { key: 'all', label: 'All', count: counts.total },
                { key: ROLE.ORG_ADMIN, label: 'Admins', count: counts.admins },
                { key: ROLE.INTERNAL_USER, label: 'Internal', count: counts.internal },
                { key: ROLE.EXTERNAL_USER, label: 'External', count: counts.external },
              ].map((t) => {
                const isActive = roleFilter === t.key;
                return (
                  <button key={t.key}
                    onClick={() => setRoleFilter(t.key)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 999,
                      border: isActive ? '1.5px solid var(--navy)' : '1px solid var(--border)',
                      background: isActive ? 'var(--navy)' : '#fff',
                      fontSize: 12.5, fontWeight: 500,
                      color: isActive ? '#fff' : 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                    <span style={{ color: isActive ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)', fontWeight: 400 }}>{t.count}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setView('invite')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'var(--navy)', color: '#fff', fontSize: 13, fontWeight: 500,
                border: 'none', cursor: 'pointer',
              }}
            >
              <UserPlus size={14} /> Invite Member
            </button>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--ice-warm)', borderBottom: '1px solid var(--border)' }}>
                  {['User', 'Role', 'Workspaces', 'Last Active'].map((c) => (
                    <th key={c} style={{
                      textAlign: 'left', padding: '0 16px', height: 40,
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: 'var(--text-muted)',
                    }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 40, textAlign: 'center' }}>
                      <UsersIcon size={32} style={{ margin: '0 auto 10px', opacity: 0.4, color: 'var(--text-muted)' }} />
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {search || roleFilter !== 'all' ? 'No matches' : 'No team members yet'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {search || roleFilter !== 'all'
                          ? 'Try a different search or clear the filter.'
                          : 'Invite your first colleague to get started.'}
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((m) => {
                  const meta = USER_META[m.id];
                  const isSelected = m.id === selectedMemberId;
                  return (
                    <tr key={m.id}
                      onClick={() => setSelectedMemberId(m.id)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isSelected ? 'var(--ice-warm)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {initialsOf(m.name)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}><RolePill role={m.role} /></td>
                      <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--text-primary)' }}>
                        {m.status === 'Invited'
                          ? <span style={{ color: 'var(--text-muted)' }}>—</span>
                          : meta?.workspaceAccess || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {m.status === 'Invited'
                          ? <span style={{ color: '#C8843E' }}>Invited</span>
                          : 'Today'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — detail pane */}
        {selectedMember && (
          <div style={{
            width: 380, flexShrink: 0,
            position: 'sticky', top: 24,
            background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
            padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#7A4FB5', color: '#fff',
                fontSize: 22, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
              }}>{initialsOf(selectedMember.name)}</div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>{selectedMember.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>{selectedMember.email}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                <RolePill role={selectedMember.role} />
                {(() => {
                  const s = STATUS_STYLE[selectedMember.status] || STATUS_STYLE.Active;
                  return (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                      background: s.bg, color: s.color, lineHeight: 1.5,
                    }}>● {selectedMember.status}</span>
                  );
                })()}
              </div>
            </div>

            {/* Permissions — base list for the role + any user-specific extras */}
            <PaneSection title={`${(ROLE_LABEL[selectedMember.role] || '').toUpperCase()} PERMISSIONS`}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Can do</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(ROLE_BASE_PERMISSIONS[selectedMember.role] || []).map((p) => (
                  <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                    <CheckCircle size={13} style={{ color: '#5CA868', flexShrink: 0, marginTop: 2 }} />
                    <span>{p}</span>
                  </li>
                ))}
                {(selectedMember.permissions || []).map((permId) => {
                  const label = PERM_PILL_LABELS[permId];
                  if (!label) return null;
                  return (
                    <li key={permId} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                      <CheckCircle size={13} style={{ color: '#5CA868', flexShrink: 0, marginTop: 2 }} />
                      <span>{label} <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 4 }}>(granted)</span></span>
                    </li>
                  );
                })}
              </ul>
            </PaneSection>

            {/* Workspace access */}
            <PaneSection title={`WORKSPACE ACCESS · ${(selectedMeta?.workspaceAccess || '—').toUpperCase()}`}>
              {(!selectedMeta || selectedMeta.workspaces.length === 0) ? (
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No workspaces yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedMeta.workspaces.map((w) => (
                    <div key={w.name} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      padding: '8px 10px', borderRadius: 8, background: 'var(--ice-warm)',
                    }}>
                      <span style={{ fontSize: 12.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                      <WorkspaceCategoryTag category={w.category} />
                    </div>
                  ))}
                </div>
              )}
            </PaneSection>

            {/* MVP cut 2026-05-26 — LOGS pane section removed; this view
               no longer surfaces per-user activity history. */}

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => selectedMember.role !== ROLE.ORG_ADMIN && setEditing(selectedMember)}
                disabled={selectedMember.role === ROLE.ORG_ADMIN}
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 8,
                  background: selectedMember.role === ROLE.ORG_ADMIN ? '#cdd1d8' : 'var(--navy)',
                  color: '#fff', border: 'none',
                  fontSize: 12.5, fontWeight: 500,
                  cursor: selectedMember.role === ROLE.ORG_ADMIN ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                title={selectedMember.role === ROLE.ORG_ADMIN ? 'Org Admin role cannot be edited' : ''}
              >
                <UserCog size={13} /> Edit Role
              </button>
              <button style={{
                flex: 1, padding: '9px 12px', borderRadius: 8,
                background: '#fff', color: 'var(--text-primary)', border: '1px solid var(--border)',
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <UsersIcon size={13} /> Workspaces
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit + remove stay modal — both are quick focused tasks. The invite
          flow is now a full page (see InviteFlow below). */}
      {editing && (
        <EditMemberModal
          member={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}
      {removing && (
        <ConfirmRemoveModal
          member={removing}
          onCancel={() => setRemoving(null)}
          onConfirm={() => handleRemove(removing)}
        />
      )}
    </div>
  );
}

/* ─────────────── Stat / filter chip ─────────────── */
function StatChip({ label, value, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
        border: '1px solid ' + (active ? 'var(--navy)' : 'var(--border)'),
        background: active ? 'var(--navy)' : '#fff',
        color: active ? '#fff' : 'var(--text-secondary)',
        fontSize: 12, fontWeight: 500,
        transition: 'all 120ms',
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 600, padding: '0 6px', borderRadius: 999, background: active ? 'rgba(255,255,255,0.18)' : 'var(--ice-warm)', color: active ? '#fff' : 'var(--text-primary)', minWidth: 20, textAlign: 'center' }}>
        {value}
      </span>
    </button>
  );
}

/* ─────────────── Member row (page-style, wider than card) ─────────────── */
function MemberRow({ member, onEdit, onRemove }) {
  const roleStyle   = ROLE_BADGE_STYLE[member.role] || ROLE_BADGE_STYLE[ROLE.INTERNAL_USER];
  const statusStyle = STATUS_STYLE[member.status]   || STATUS_STYLE.Active;
  const isAdmin     = member.role === ROLE.ORG_ADMIN;
  const pills       = (member.permissions || []).map((p) => PERM_PILL_LABELS[p]).filter(Boolean);

  return (
    <div
      style={{
        padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)',
        background: '#fff', transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: 16,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(10,36,99,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--ice-warm)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 600 }}>
        {initialsOf(member.name)}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: roleStyle.bg, color: roleStyle.color, fontWeight: 500 }}>
            {ROLE_LABEL[member.role]}
          </span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: statusStyle.bg, color: statusStyle.color, fontWeight: 500 }}>
            {member.status}
          </span>
        </div>
        <div className="flex items-center gap-4 flex-wrap" style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><Mail size={12} /> {member.email}</span>
          <span>Invited by {member.invitedBy} · {member.invitedAt}</span>
        </div>
        {pills.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap" style={{ marginTop: 8 }}>
            {pills.map((p) => (
              <span key={p} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, backgroundColor: '#F0F3F6', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {p}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        {!isAdmin ? (
          <>
            <button
              onClick={onEdit}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: '#fff', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}
            >
              <Edit3 size={13} /> Edit
            </button>
            <button
              onClick={onRemove}
              title="Remove member"
              style={{ padding: 8, borderRadius: 8, background: '#fff', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }}
            >
              <Trash2 size={13} style={{ color: '#C65454' }} />
            </button>
          </>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 10px', borderRadius: 8, background: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
            Cannot be edited
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Full-page Invite flow ───────────────
 * Replaces the previous modal wizard. Renders as its own /chat-like page
 * with sidebar still visible; the TeamPage switches to this via `view`.
 */
function InviteFlow({ onBack, onSubmit }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLE.INTERNAL_USER);
  const [permissions, setPermissions] = useState([]);
  const [emailError, setEmailError] = useState('');
  // External Users are always tied to at least one workspace — they have no
  // other access path. Step 2 collects that assignment before the review.
  const [workspaceIds, setWorkspaceIds] = useState([]);
  const [workspaceError, setWorkspaceError] = useState('');
  // Whether this external user can add / remove docs in the workspaces they
  // are assigned to. Defaults to false (read-only) because externals are
  // clients; the Org Admin can explicitly elevate.
  const [canEditKB, setCanEditKB] = useState(false);

  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const togglePerm = (p) => setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const toggleWorkspace = (wsId) => setWorkspaceIds((prev) => (prev.includes(wsId) ? prev.filter((x) => x !== wsId) : [...prev, wsId]));

  // Step labels change based on role — external uses 'Workspaces', internal
  // uses 'Access' (permissions + optional workspace assignment).
  const steps = [1, 2, 3];
  const stepLabels = {
    1: 'Details',
    2: role === ROLE.EXTERNAL_USER ? 'Workspaces' : 'Access',
    3: 'Review & send',
  };

  const goNext = () => {
    if (step === 1) {
      if (!name.trim()) return;
      if (!validEmail(email)) { setEmailError('Enter a valid email address'); return; }
      setEmailError('');
      // Both roles now have a Step 2 — Internal picks permissions, External
      // picks workspace assignments.
      if (role === ROLE.EXTERNAL_USER) setPermissions([]);
      else setWorkspaceIds([]);
      setStep(2);
    } else if (step === 2) {
      if (role === ROLE.EXTERNAL_USER && workspaceIds.length === 0) {
        setWorkspaceError('Assign the client to at least one workspace so they can access it.');
        return;
      }
      setWorkspaceError('');
      setStep(3);
    }
  };
  const goBack = () => { if (step > 1) setStep(step - 1); };

  return (
    <div style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', background: '#FBFAF7' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 32px 20px' }}>
          <button
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', marginLeft: -8, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <ChevronLeft size={13} /> Back to team
          </button>
          <div style={{ marginTop: 10 }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
              Invite a team member
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.55, maxWidth: 560 }}>
              Add a colleague or client to your firm. You can tailor their access at every level — from simple read-only client portals to full billing and audit administration.
            </p>
          </div>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24 }}>
            {steps.map((n, i) => {
              const isActive = step === n;
              const isDone = step > n;
              return (
                <React.Fragment key={n}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: isDone ? '#5CA868' : isActive ? 'var(--navy)' : '#E5E7EB',
                      color: isDone || isActive ? '#fff' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {isDone ? <Check size={13} strokeWidth={3} /> : n}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--text-primary)' : isDone ? '#5CA868' : 'var(--text-muted)' }}>
                      {stepLabels[n]}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: step > n ? '#5CA868' : '#E5E7EB', borderRadius: 2, maxWidth: 80 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 32px 120px' }}>
        {step === 1 && (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
            <StepDetails name={name} setName={setName} email={email} setEmail={setEmail} role={role} setRole={setRole} emailError={emailError} />
          </div>
        )}
        {step === 2 && role === ROLE.EXTERNAL_USER && (
          <StepAssignWorkspaces
            workspaceIds={workspaceIds}
            toggleWorkspace={toggleWorkspace}
            canEditKB={canEditKB}
            setCanEditKB={setCanEditKB}
            error={workspaceError}
            inviteeName={name}
          />
        )}
        {step === 2 && role !== ROLE.EXTERNAL_USER && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <StepPermissions permissions={permissions} togglePerm={togglePerm} />
            {/* Internal users get workspace assignment + KB toggle here too,
                but it's optional — they can be added to workspaces later
                from inside the workspace. */}
            <StepAssignWorkspaces
              workspaceIds={workspaceIds}
              toggleWorkspace={toggleWorkspace}
              canEditKB={canEditKB}
              setCanEditKB={setCanEditKB}
              error={workspaceError}
              inviteeName={name}
              optional
            />
          </div>
        )}
        {step === 3 && (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
            <StepReview name={name} email={email} role={role} permissions={permissions} workspaceIds={workspaceIds} canEditKB={canEditKB} />
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div style={{ position: 'sticky', bottom: 0, borderTop: '1px solid var(--border)', background: '#fff', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', gap: 8, zIndex: 5 }}>
        <div style={{ maxWidth: 820, width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div>
            {step > 1 && (
              <button onClick={goBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>
                <ChevronLeft size={14} /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onBack} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
            {step < 3 ? (
              <button onClick={goNext} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={() => onSubmit({ name, email, role, permissions, workspaceIds, canEditKB })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <Mail size={13} /> Send Invitation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDetails({ name, setName, email, setEmail, role, setRole, emailError }) {
  const inputStyle = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" };
  const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>Full name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Jordan Patel" style={inputStyle} autoFocus />
      </div>
      <div>
        <label style={labelStyle}>Email address *</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@firm.com" type="email" style={{ ...inputStyle, borderColor: emailError ? '#C65454' : 'var(--border)' }} />
        {emailError && <div style={{ fontSize: 11, color: '#C65454', marginTop: 4 }}>{emailError}</div>}
      </div>
      <div>
        <label style={labelStyle}>User type *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <RoleOption selected={role === ROLE.INTERNAL_USER} onSelect={() => setRole(ROLE.INTERNAL_USER)} title="Internal User" subtitle="Org member (attorney, paralegal, partner)" />
          <RoleOption selected={role === ROLE.EXTERNAL_USER} onSelect={() => setRole(ROLE.EXTERNAL_USER)} title="External User" subtitle="End client — access limited to assigned workspaces" />
        </div>
      </div>
    </div>
  );
}

function RoleOption({ selected, onSelect, title, subtitle }) {
  return (
    <div onClick={onSelect} style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid ' + (selected ? 'var(--navy)' : 'var(--border)'), background: selected ? 'var(--ice-warm)' : 'white', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 120ms' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid ' + (selected ? 'var(--navy)' : '#CBD5E1'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--navy)' }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function StepPermissions({ permissions, togglePerm }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Included for all members</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {INVITE_BASE_PERMISSIONS.map((p) => (
            <div key={p.permission} className="flex items-center gap-2">
              <Check size={13} style={{ color: '#5CA868', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
      {INVITE_PERMISSION_GROUPS.map((group) => (
        <div key={group.section}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{group.section}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.items.map((item) => (
              <PermissionCheckbox key={item.permission} checked={permissions.includes(item.permission)} onToggle={() => togglePerm(item.permission)} label={item.label} description={item.description} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PermissionCheckbox({ checked, onToggle, label, description }) {
  return (
    <div onClick={onToggle} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: '1px solid ' + (checked ? 'var(--navy)' : 'var(--border)'), background: checked ? 'var(--ice-warm)' : 'white', transition: 'all 120ms' }}>
      <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1, border: '1.5px solid ' + (checked ? 'var(--navy)' : '#CBD5E1'), background: checked ? 'var(--navy)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {checked && <Check size={12} style={{ color: 'white' }} strokeWidth={3} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{description}</div>
      </div>
    </div>
  );
}

/* ─── Step 2 assign-workspaces block ─── */
// Used for External users (required) and Internal users (optional).
// `optional` softens copy and lets zero selections be valid.
function StepAssignWorkspaces({ workspaceIds, toggleWorkspace, canEditKB, setCanEditKB, error, inviteeName, optional = false }) {
  React.useEffect(() => { seedWorkspacesIfEmpty(MOCK_WORKSPACES); }, []);
  const workspaces = listWorkspaces();

  if (workspaces.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>No workspaces yet</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.55, maxWidth: 420, margin: '8px auto 0' }}>
          {optional
            ? 'Once you create a workspace, you can add this member to it.'
            : 'External clients can only access workspaces. Create your first workspace before inviting a client.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
      <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        {optional ? 'Assign to workspaces (optional)' : 'Assign to workspaces'}
      </h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.55 }}>
        {optional
          ? `Add ${inviteeName || 'this member'} straight into one or more workspaces now, or skip and assign from inside each workspace later.`
          : `${inviteeName ? `${inviteeName} will only be able to access the workspaces you select.` : 'External clients only see workspaces they are assigned to.'} Select one or more.`}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {workspaces.map((w) => {
          const checked = workspaceIds.includes(w.id);
          return (
            <div
              key={w.id}
              onClick={() => toggleWorkspace(w.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                borderRadius: 10, cursor: 'pointer',
                border: '1px solid ' + (checked ? 'var(--navy)' : 'var(--border)'),
                background: checked ? 'var(--ice-warm)' : 'white',
                transition: 'all 120ms',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                border: '1.5px solid ' + (checked ? 'var(--navy)' : '#CBD5E1'),
                background: checked ? 'var(--navy)' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {checked && <Check size={12} style={{ color: 'white' }} strokeWidth={3} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{w.name}</div>
                {w.description && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {w.description}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  {w.members.length} member{w.members.length !== 1 ? 's' : ''} · {w.documents.length} doc{w.documents.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#C65454' }}>{error}</div>
      )}

      {/* ─── KB-edit toggle — applies to every selected workspace ─── */}
      <div
        onClick={() => setCanEditKB(!canEditKB)}
        style={{
          marginTop: 18, padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
          border: '1px solid ' + (canEditKB ? '#5CA868' : 'var(--border)'),
          background: canEditKB ? '#F3FAF5' : '#fff',
          display: 'flex', alignItems: 'center', gap: 12, transition: 'all 120ms',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Can edit the workspace knowledge base</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.55 }}>
            {canEditKB
              ? 'Can add and remove workspace documents in every assigned workspace. Good for collaborators actively contributing to the matter.'
              : 'Read-only. Can chat with the AI and view documents but cannot upload or remove them. Recommended default for clients.'}
          </div>
        </div>
        <span style={{ width: 36, height: 20, borderRadius: 999, background: canEditKB ? '#5CA868' : '#CBD5E1', position: 'relative', transition: 'background 150ms', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 2, left: canEditKB ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 150ms' }} />
        </span>
      </div>
    </div>
  );
}

function StepReview({ name, email, role, permissions, workspaceIds = [], canEditKB = false }) {
  const pills = permissions.map((p) => PERM_PILL_LABELS[p]).filter(Boolean);
  const baseList = role === ROLE.EXTERNAL_USER ? EXTERNAL_USER_BASE : INTERNAL_USER_BASE;
  // Both roles can carry workspace assignments now — Internal's is optional,
  // External's is required. Surface whatever the admin picked.
  const assignedWorkspaces = workspaceIds.length > 0
    ? listWorkspaces().filter((w) => workspaceIds.includes(w.id))
    : [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SummaryRow label="Name" value={name} />
      <SummaryRow label="Email" value={email} />
      <SummaryRow
        label="Role"
        value={<span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, backgroundColor: ROLE_BADGE_STYLE[role].bg, color: ROLE_BADGE_STYLE[role].color, fontWeight: 500 }}>{ROLE_LABEL[role]}</span>}
      />
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Permissions</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {baseList.map((p) => (
            <span key={p} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#E7F3E9', color: '#5CA868', fontWeight: 500 }}>
              Base: {PERM_PILL_LABELS[p] || p.replace(/_/g, ' ')}
            </span>
          ))}
          {pills.map((p) => (
            <span key={p} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#F0F3F6', color: 'var(--text-secondary)', fontWeight: 500 }}>{p}</span>
          ))}
          {role === ROLE.INTERNAL_USER && pills.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No extra permissions granted</span>
          )}
        </div>
      </div>
      {(role === ROLE.EXTERNAL_USER || assignedWorkspaces.length > 0) && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Assigned workspaces</div>
          {assignedWorkspaces.length === 0 ? (
            role === ROLE.EXTERNAL_USER
              ? <span style={{ fontSize: 12, color: '#C65454', fontStyle: 'italic' }}>No workspaces selected — client will have no access.</span>
              : <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Not added to any workspace yet — you can do this from inside each workspace.</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {assignedWorkspaces.map((w) => (
                <span key={w.id} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'var(--ice-warm)', color: 'var(--navy)', fontWeight: 500, border: '1px solid var(--border)' }}>
                  {w.name}
                </span>
              ))}
            </div>
          )}
          {assignedWorkspaces.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 11, color: canEditKB ? '#3F7E4A' : 'var(--text-muted)' }}>
              {canEditKB
                ? 'Can edit workspace documents in every assigned workspace.'
                : 'Read-only on workspace documents in every assigned workspace.'}
            </div>
          )}
        </div>
      )}
      <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FBEED5', border: '1px solid #F3E2B1', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <AlertTriangle size={14} style={{ color: '#E8A33D', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12, color: '#6B4E1F', lineHeight: 1.5 }}>
          An invitation email will be sent to <strong>{email || 'the invitee'}</strong>. They'll be asked to verify their email and set a password.
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{value || '—'}</div>
    </div>
  );
}

/* ─────────────── Edit + Remove modals (unchanged from panel version) ─────────────── */
function EditMemberModal({ member, onClose, onSave }) {
  const [permissions, setPermissions] = useState(member.permissions || []);
  const isExternal = member.role === ROLE.EXTERNAL_USER;
  const togglePerm = (p) => setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 560, maxHeight: '88vh', backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 71, display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Edit Permissions</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{member.name} · {member.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {isExternal ? (
            <div style={{ padding: '16px', borderRadius: 10, background: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                <ShieldCheck size={14} style={{ color: 'var(--navy)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>External User</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                External Users have a fixed permission set — they can upload documents to their own workspace and toggle between case and general chat modes. Additional permissions cannot be granted.
              </p>
            </div>
          ) : (
            <StepPermissions permissions={permissions} togglePerm={togglePerm} />
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={() => onSave({ ...member, permissions: isExternal ? [] : permissions })} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Save Changes</button>
        </div>
      </div>
    </>
  );
}

function ConfirmRemoveModal({ member, onCancel, onConfirm }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 440, backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 71 }}>
        <div style={{ padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F9E7E7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trash2 size={16} style={{ color: '#C65454' }} />
            </div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--text-primary)', margin: 0 }}>Remove member?</h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Remove <strong>{member.name}</strong>? They will immediately lose access to the platform. This action cannot be undone.
          </p>
        </div>
        <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#C65454', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Remove Member</button>
        </div>
      </div>
    </>
  );
}
