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
} from 'lucide-react';
import {
  PERMISSIONS, ROLE, ROLE_LABEL, INVITE_PERMISSION_GROUPS,
  INVITE_BASE_PERMISSIONS, INTERNAL_USER_BASE, EXTERNAL_USER_BASE,
} from '../../lib/roles';

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

/* ─────────────── Page component ─────────────── */
export default function TeamPage({ onBack, onCountChange, onToast }) {
  const [members, setMembers] = useState(loadMembers);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [inviting, setInviting]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [removing, setRemoving]     = useState(null);

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
    setInviting(false);
    onToast?.(`Invitation sent to ${newMember.email}`);
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

  return (
    <div style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', background: '#FBFAF7' }}>
      {/* ─── Page header ─── */}
      <div style={{ borderBottom: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 32px 20px' }}>
          <button
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', marginLeft: -8, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft size={13} /> Back to chat
          </button>
          <div className="flex items-end justify-between gap-4 flex-wrap" style={{ marginTop: 10 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                Team
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, maxWidth: 560 }}>
                Invite colleagues and clients, grant permissions, and keep track of who has access to your workspace.
              </p>
            </div>
            <button
              onClick={() => setInviting(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(10,36,99,0.15)' }}
            >
              <UserPlus size={14} /> Invite Member
            </button>
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-2" style={{ marginTop: 18 }}>
            <StatChip label="Total"    value={counts.total}    active={roleFilter === 'all'}               onClick={() => setRoleFilter('all')} />
            <StatChip label="Org Admins" value={counts.admins}    active={roleFilter === ROLE.ORG_ADMIN}       onClick={() => setRoleFilter(roleFilter === ROLE.ORG_ADMIN ? 'all' : ROLE.ORG_ADMIN)} />
            <StatChip label="Internal" value={counts.internal} active={roleFilter === ROLE.INTERNAL_USER}    onClick={() => setRoleFilter(roleFilter === ROLE.INTERNAL_USER ? 'all' : ROLE.INTERNAL_USER)} />
            <StatChip label="External" value={counts.external} active={roleFilter === ROLE.EXTERNAL_USER}    onClick={() => setRoleFilter(roleFilter === ROLE.EXTERNAL_USER ? 'all' : ROLE.EXTERNAL_USER)} />
            {counts.invited > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, background: '#FBEED5', color: '#E8A33D', fontSize: 11, fontWeight: 500 }}>
                {counts.invited} pending invite{counts.invited !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── List area ─── */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 32px 48px' }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role..."
            style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border)', paddingLeft: 36, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", background: '#fff' }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 14, background: '#fff' }}>
            <UsersIcon size={36} style={{ margin: '0 auto 12px', opacity: 0.4, color: 'var(--text-muted)' }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
              {search || roleFilter !== 'all' ? 'No matches' : 'No team members yet'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {search || roleFilter !== 'all'
                ? 'Try a different search or clear the filter.'
                : 'Invite your first colleague to get started.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                onEdit={() => setEditing(m)}
                onRemove={() => setRemoving(m)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sub-flows remain modals */}
      {inviting && <InviteMemberModal onClose={() => setInviting(false)} onSubmit={handleInvite} />}
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

/* ─────────────── Invite Member wizard (modal) ─────────────── */
function InviteMemberModal({ onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLE.INTERNAL_USER);
  const [permissions, setPermissions] = useState([]);
  const [emailError, setEmailError] = useState('');

  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const togglePerm = (p) => setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const goNext = () => {
    if (step === 1) {
      if (!name.trim()) return;
      if (!validEmail(email)) { setEmailError('Enter a valid email address'); return; }
      setEmailError('');
      if (role === ROLE.EXTERNAL_USER) { setPermissions([]); setStep(3); }
      else setStep(2);
    } else if (step === 2) setStep(3);
  };
  const goBack = () => {
    if (step === 3 && role === ROLE.EXTERNAL_USER) setStep(1);
    else if (step > 1) setStep(step - 1);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 560, maxHeight: '88vh', backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 71, display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Invite Member</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Step {step} of 3 · {step === 1 ? 'Details' : step === 2 ? 'Permissions' : 'Review & send'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: '12px 24px 0' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= step ? 'var(--navy)' : '#E5E7EB' }} />
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {step === 1 && <StepDetails name={name} setName={setName} email={email} setEmail={setEmail} role={role} setRole={setRole} emailError={emailError} />}
          {step === 2 && <StepPermissions permissions={permissions} togglePerm={togglePerm} />}
          {step === 3 && <StepReview name={name} email={email} role={role} permissions={permissions} />}
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
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
            {step < 3 ? (
              <button onClick={goNext} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={() => onSubmit({ name, email, role, permissions })} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <Mail size={13} /> Send Invitation
              </button>
            )}
          </div>
        </div>
      </div>
    </>
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

function StepReview({ name, email, role, permissions }) {
  const pills = permissions.map((p) => PERM_PILL_LABELS[p]).filter(Boolean);
  const baseList = role === ROLE.EXTERNAL_USER ? EXTERNAL_USER_BASE : INTERNAL_USER_BASE;
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
