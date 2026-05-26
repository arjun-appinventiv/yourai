import React, { useState } from 'react';
import {
  UserCog, Plus, Mail, X, CheckCircle, Search,
  Users as UsersIcon, ShieldCheck, KeyRound, AlertCircle,
  ChevronDown, Lock,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import { useToast } from '../../components/Toast';
import { orgUsers as initialUsers } from '../../data/mockData';
import PermissionGate from '../../components/org-admin/PermissionGate';

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: 8, height: 36,
  padding: '0 12px', fontSize: 13, color: 'var(--text-primary)', width: '100%', outline: 'none',
};

const ROLE_TABS = ['Admin', 'Manager', 'Team', 'Client'];

const ROLE_COLORS = {
  Admin: { bg: '#F9E7E7', color: '#C65454' },
  Manager: { bg: '#F0E8F9', color: '#7A4FB5' },
  Team: { bg: '#E7F3E9', color: '#5CA868' },
  Client: { bg: '#FBEED5', color: '#E8A33D' },
};

const WORKSPACE_CATEGORY_COLORS = {
  Transactional: { bg: '#E8EEF9', color: '#3754A8' },
  Litigation: { bg: '#F9E7E7', color: '#C65454' },
  Compliance: { bg: '#FBEED5', color: '#C8843E' },
  Employment: { bg: '#E0F2F2', color: '#3D8A8A' },
  Corporate: { bg: '#E7F3E9', color: '#5CA868' },
};

// Per-role permission lists (mocked — would come from the backend).
const ROLE_PERMISSIONS = {
  Admin: [
    'Manage tenant-wide settings',
    'Create & manage workspaces',
    'Invite & remove users',
    'View Audit Logs',
    'Manage billing & seats',
  ],
  Manager: [
    'Create & manage workspaces',
    'Invite Team members',
    'Approve time entries',
    'Generate & send invoices',
    'Change org settings',
    'View Audit Logs',
    'Manage billing & seats',
  ],
  Team: [
    'Work in assigned workspaces',
    'Upload & analyse documents',
    'Run workflows',
    'Log billable time',
  ],
  Client: [
    'View shared workspaces',
    'Download released reports',
    'Message the firm',
  ],
};

// Extra metadata per user — would come from the backend. Layered onto
// the orgUsers seed locally so the right-pane render has something rich.
const USER_META = {
  1: { // Ryan Melade — Admin
    mfa: true, mfaMethod: 'Authenticator app', sso: true, ssoProvider: 'Okta SAML',
    sessionsActive: 1, lastPasswordChange: '2 weeks ago',
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
      { text: 'Invited Tom Bradley as Manager', time: '9 days ago · 09:14' },
      { text: 'Approved time entries (Sarah Chen · 8h)', time: '12 days ago · 16:30' },
      { text: 'Promoted James Wu to Team', time: '3 weeks ago' },
    ],
  },
  2: { // Sarah Chen — Manager (matches the mockup)
    mfa: true, mfaMethod: 'Authenticator app', sso: true, ssoProvider: 'Okta SAML',
    sessionsActive: 2, lastPasswordChange: 'SSO-managed',
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
  3: { // James Wu — Team
    mfa: false, mfaMethod: null, sso: true, ssoProvider: 'Okta SAML',
    sessionsActive: 1, lastPasswordChange: 'SSO-managed',
    workspaceAccess: '2 of 6',
    workspaces: [
      { name: 'Acme Corp · NDA Review', category: 'Transactional' },
      { name: 'TechStart Inc · DD', category: 'Transactional' },
    ],
    logs: [
      { text: 'Logged 6.2h billable · Acme NDA', time: 'Yesterday' },
      { text: 'Uploaded NDA_Acme_Corp_v3.pdf', time: '2 days ago' },
      { text: 'Ran Contract Review workflow', time: '3 days ago' },
    ],
  },
  4: { // Maria Torres — Team
    mfa: true, mfaMethod: 'Authenticator app', sso: true, ssoProvider: 'Okta SAML',
    sessionsActive: 1, lastPasswordChange: 'SSO-managed',
    workspaceAccess: '3 of 6',
    workspaces: [
      { name: 'Acme Corp · NDA Review', category: 'Transactional' },
      { name: 'Meridian v. Apex', category: 'Litigation' },
      { name: 'Q2 Compliance Audit', category: 'Compliance' },
    ],
    logs: [
      { text: 'Logged 3.0h billable · Meridian v. Apex', time: '2 days ago' },
      { text: 'Uploaded Compliance_Checklist.pdf', time: '2 days ago' },
    ],
  },
  5: { // Tom Bradley — Manager (Invited)
    mfa: false, mfaMethod: null, sso: false, ssoProvider: null,
    sessionsActive: 0, lastPasswordChange: '—',
    workspaceAccess: '0 of 6',
    workspaces: [],
    logs: [
      { text: 'Invitation sent', time: '9 days ago' },
    ],
  },
};

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

function RolePill({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.Team;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
      background: c.bg, color: c.color, lineHeight: 1.5,
    }}>{role}</span>
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

export default function OrgUserManagement() {
  const [users, setUsers] = useState(initialUsers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteStep, setInviteStep] = useState(0);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Team');
  const [inviteName, setInviteName] = useState('');
  const [search, setSearch] = useState('');
  const [roleTab, setRoleTab] = useState(null); // null = all
  const [selectedUserId, setSelectedUserId] = useState(2); // Sarah Chen by default to match mockup
  const showToast = useToast();

  const inviteSteps = ['Enter Details', 'Assign Role', 'Confirm'];

  const roleCounts = ROLE_TABS.reduce((acc, r) => {
    acc[r] = users.filter((u) => u.role === r).length;
    return acc;
  }, {});

  const filteredUsers = users.filter((u) => {
    if (roleTab && u.role !== roleTab) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingInvite = users.find((u) => u.status === 'Invited');
  const mfaEnrolled = users.filter((u) => USER_META[u.id]?.mfa).length;
  const ssoConnected = users.some((u) => USER_META[u.id]?.sso);

  const handleInvite = () => {
    const newUser = {
      id: users.length + 1,
      name: inviteName || inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'Invited',
      lastActive: 'Never',
      avatar: (inviteName || inviteEmail).substring(0, 2).toUpperCase(),
    };
    setUsers([...users, newUser]);
    setShowInvite(false);
    setInviteStep(0);
    setInviteEmail('');
    setInviteName('');
    setInviteRole('Team');
    showToast('Invitation sent successfully');
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const selectedMeta = selectedUser ? USER_META[selectedUser.id] : null;

  return (
    <PermissionGate allowedRoles={['Admin']}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* LEFT — list view */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <PageHeader icon={UserCog} title="User Management" subtitle="Manage team members and invitations." />

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
              fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 500,
              color: 'var(--text-primary)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.5px',
            }}>Who has access &amp; what they can do</h1>
            <p style={{ marginTop: 8, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, maxWidth: 720 }}>
              Manage roles, permissions, and security across the firm. Every action a user takes is recorded in <strong>Audit Logs</strong>; every workspace they're added to inherits their role.
            </p>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <StatTile
              icon={UsersIcon}
              label="Active Users"
              value={`${users.filter((u) => u.status === 'Active').length} of 10 seats`}
              sub="Enterprise plan · 5 available"
            />
            <StatTile
              icon={ShieldCheck}
              label="MFA Coverage"
              value={`${mfaEnrolled} of ${users.filter((u) => u.status === 'Active').length} enrolled`}
              sub={users.filter((u) => u.status === 'Active').length - mfaEnrolled > 0 ? `${users.filter((u) => u.status === 'Active').length - mfaEnrolled} user · action required` : 'All set'}
              tone={mfaEnrolled < users.filter((u) => u.status === 'Active').length ? 'warning' : 'neutral'}
            />
            <StatTile
              icon={KeyRound}
              label="SSO"
              value={ssoConnected ? 'Okta · Connected' : 'Not configured'}
              sub={ssoConnected ? 'SAML 2.0 · 3 of 5 using SSO' : '—'}
            />
            <StatTile
              icon={AlertCircle}
              label="Pending Invites"
              value={pendingInvite ? '1 outstanding' : 'None'}
              sub={pendingInvite ? `${pendingInvite.name} · expires in 5d` : 'All accepted'}
              tone={pendingInvite ? 'warning' : 'neutral'}
            />
          </div>

          {/* Role tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Roles</span>
            {ROLE_TABS.map((r) => {
              const isActive = roleTab === r;
              const c = ROLE_COLORS[r];
              return (
                <button key={r}
                  onClick={() => setRoleTab(isActive ? null : r)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 999,
                    border: isActive ? `1.5px solid ${c.color}` : '1px solid var(--border)',
                    background: isActive ? c.bg : '#fff',
                    fontSize: 12.5, fontWeight: 500,
                    color: isActive ? c.color : 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {r}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{roleCounts[r] || 0}</span>
                </button>
              );
            })}
            <a href="#" style={{ marginLeft: 12, fontSize: 12, color: 'var(--navy)', textDecoration: 'none' }}>View Permission Matrix →</a>
          </div>

          {/* Pending invite banner */}
          {pendingInvite && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', marginBottom: 14,
              background: '#FBEED5', border: '1px solid #E8A33D33', borderRadius: 10,
            }}>
              <AlertCircle size={16} style={{ color: '#C8843E', flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>
                <strong>1 invitation outstanding.</strong> {pendingInvite.name} was invited 9 days ago. Invitation expires in 5 days.
              </div>
              <button
                onClick={() => showToast('Invitation resent')}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12,
                  border: '1px solid #E8A33D55', background: '#fff', color: '#C8843E',
                  fontWeight: 500, cursor: 'pointer',
                }}
              >Resend →</button>
            </div>
          )}

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <div style={{ position: 'relative', width: 260, flexShrink: 0 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by name, email, or role…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 34 }}
                />
              </div>
              <FilterChip label="Role:" value="All" />
              <FilterChip label="Status:" value="All" />
              <FilterChip label="MFA:" value="All" />
            </div>
            <button
              onClick={() => { setShowInvite(true); setInviteStep(0); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'var(--navy)', color: '#fff', fontSize: 13, fontWeight: 500,
                border: 'none', cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Invite User
            </button>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--ice-warm)', borderBottom: '1px solid var(--border)' }}>
                  {['User', 'Role', 'Security', 'Workspaces', 'Last Active'].map((c) => (
                    <th key={c} style={{
                      textAlign: 'left', padding: '0 16px', height: 40,
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: 'var(--text-muted)',
                    }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const meta = USER_META[u.id];
                  const isSelected = u.id === selectedUserId;
                  return (
                    <tr key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
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
                            {u.avatar}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{u.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}><RolePill role={u.role} /></td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {meta?.mfa
                            ? <ShieldCheck size={14} style={{ color: '#5CA868' }} title="MFA enrolled" />
                            : <ShieldCheck size={14} style={{ color: '#C65454' }} title="MFA missing" />}
                          {meta?.sso && <Lock size={13} style={{ color: 'var(--text-muted)' }} title="SSO" />}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--text-primary)' }}>
                        {u.status === 'Invited'
                          ? <span style={{ color: 'var(--text-muted)' }}>—</span>
                          : meta?.workspaceAccess || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {u.status === 'Invited'
                          ? <span style={{ color: '#C8843E' }}>Invited 9d ago<br /><span style={{ fontSize: 11 }}>Expires in 5d</span></span>
                          : u.lastActive}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — detail pane */}
        {selectedUser && selectedMeta && (
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
              }}>{selectedUser.avatar}</div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>{selectedUser.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>{selectedUser.email}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                <RolePill role={selectedUser.role} />
                <Badge variant={selectedUser.status}>● {selectedUser.status}</Badge>
              </div>
            </div>

            {/* Permissions */}
            <Section title={`${selectedUser.role.toUpperCase()} PERMISSIONS`}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Can do</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(ROLE_PERMISSIONS[selectedUser.role] || []).map((p) => (
                  <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                    <CheckCircle size={13} style={{ color: '#5CA868', flexShrink: 0, marginTop: 2 }} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* Workspace access */}
            <Section title={`WORKSPACE ACCESS · ${selectedMeta.workspaceAccess.toUpperCase()}`}>
              {selectedMeta.workspaces.length === 0 ? (
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
            </Section>

            {/* Logs (renamed from Recent Activity; no icons per PM) */}
            <Section title="LOGS">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedMeta.logs.map((l, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5 }}>{l.text}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{l.time}</div>
                  </div>
                ))}
              </div>
              <a href="#" style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: 'var(--navy)', textDecoration: 'none' }}>View all in Audit Logs →</a>
            </Section>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button style={{
                flex: 1, padding: '9px 12px', borderRadius: 8,
                background: 'var(--navy)', color: '#fff', border: 'none',
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
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

      {/* Invite User Slide-over (unchanged) */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(15,23,42,0.4)' }} onClick={() => setShowInvite(false)}>
          <div
            className="bg-white h-full overflow-y-auto"
            style={{ width: 480, padding: 28, boxShadow: '-4px 0 20px rgba(0,0,0,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)' }}>
                Invite User
              </h3>
              <button onClick={() => setShowInvite(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <div style={{ height: 1, backgroundColor: 'var(--border)', marginBottom: 20 }} />

            <div className="flex items-center gap-3 mb-8">
              {inviteSteps.map((s, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="rounded-full flex items-center justify-center"
                      style={{
                        width: 24, height: 24,
                        backgroundColor: i <= inviteStep ? 'var(--navy)' : 'var(--ice)',
                        color: i <= inviteStep ? 'white' : 'var(--text-muted)',
                        fontSize: 11, fontWeight: 600,
                      }}
                    >
                      {i < inviteStep ? <CheckCircle size={12} /> : i + 1}
                    </div>
                    <span style={{ fontSize: 12, color: i <= inviteStep ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s}</span>
                  </div>
                  {i < inviteSteps.length - 1 && <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />}
                </React.Fragment>
              ))}
            </div>

            {inviteStep === 0 && (
              <div className="flex flex-col gap-4">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Full Name</label>
                  <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. John Smith" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email Address</label>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="john@hartwell.com" style={inputStyle} />
                </div>
              </div>
            )}

            {inviteStep === 1 && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Role</label>
                {['Admin', 'Manager', 'Team'].map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-3 p-3 rounded-lg mb-2 cursor-pointer"
                    style={{
                      border: inviteRole === r ? '2px solid var(--navy)' : '1px solid var(--border)',
                      backgroundColor: inviteRole === r ? 'rgba(11,29,58,0.03)' : 'white',
                    }}
                  >
                    <input type="radio" name="role" checked={inviteRole === r} onChange={() => setInviteRole(r)} />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{r}</span>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {r === 'Admin' && 'Full access to all features and settings.'}
                        {r === 'Manager' && 'Can manage workspaces, clients, and team members.'}
                        {r === 'Team' && 'Can work within assigned workspaces.'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {inviteStep === 2 && (
              <div className="bg-gray-50 p-4 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong>Name:</strong> {inviteName || '—'}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}><strong>Email:</strong> {inviteEmail || '—'}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}><strong>Role:</strong> {inviteRole}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                  An invitation email will be sent to {inviteEmail || 'the provided address'}.
                </p>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button
                onClick={() => inviteStep > 0 ? setInviteStep(inviteStep - 1) : setShowInvite(false)}
                className="px-4 py-2 rounded-lg"
                style={{ fontSize: 13, border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                {inviteStep === 0 ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={() => {
                  if (inviteStep < 2) setInviteStep(inviteStep + 1);
                  else handleInvite();
                }}
                className="px-4 py-2 rounded-lg"
                style={{ fontSize: 13, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontWeight: 500, cursor: 'pointer' }}
              >
                {inviteStep === 2 ? 'Send Invitation' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}

function Section({ title, children }) {
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
