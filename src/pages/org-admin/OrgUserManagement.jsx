import React, { useState } from 'react';
import { UserCog, Plus, Mail, X, CheckCircle, Search } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import { useToast } from '../../components/Toast';
import { orgUsers as initialUsers } from '../../data/mockData';
import PermissionGate from '../../components/org-admin/PermissionGate';

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: '8px', height: 36,
  padding: '0 12px', fontSize: '13px', color: 'var(--text-primary)', width: '100%', outline: 'none',
};

export default function OrgUserManagement() {
  const [users, setUsers] = useState(initialUsers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteStep, setInviteStep] = useState(0);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Team');
  const [inviteName, setInviteName] = useState('');
  const [search, setSearch] = useState('');
  const showToast = useToast();

  const inviteSteps = ['Enter Details', 'Assign Role', 'Confirm'];

  const filteredUsers = users.filter((u) =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <PermissionGate allowedRoles={['Admin']}>
      <div>
        <PageHeader icon={UserCog} title="User Management" subtitle="Manage team members and invitations." />

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 32, width: 260 }}
            />
          </div>
          <button
            onClick={() => { setShowInvite(true); setInviteStep(0); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            <Plus size={14} /> Invite User
          </button>
        </div>

        <Table columns={['User', 'Email', 'Role', 'Status', 'Last Active', 'Actions']}>
          {filteredUsers.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '12px 16px' }}>
                <div className="flex items-center gap-2">
                  <div className="rounded-full flex items-center justify-center text-white" style={{ width: 28, height: 28, backgroundColor: 'var(--navy)', fontSize: '10px', fontWeight: 600 }}>
                    {u.avatar}
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{u.name}</span>
                </div>
              </td>
              <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
              <td style={{ padding: '12px 16px' }}>
                <Badge variant={u.role === 'Admin' ? 'Enterprise' : u.role === 'Manager' ? 'Professional' : 'Team'}>
                  {u.role}
                </Badge>
              </td>
              <td style={{ padding: '12px 16px' }}><Badge variant={u.status}>{u.status}</Badge></td>
              <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{u.lastActive}</td>
              <td style={{ padding: '12px 16px' }}>
                {u.status === 'Invited' ? (
                  <button
                    onClick={() => showToast('Invitation resent')}
                    className="flex items-center gap-1 px-2 py-1 rounded"
                    style={{ fontSize: '11px', color: 'var(--navy)', border: '1px solid var(--border)', backgroundColor: 'white', cursor: 'pointer' }}
                  >
                    <Mail size={11} /> Resend
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>--</span>
                )}
              </td>
            </tr>
          ))}
        </Table>

        {/* Invite User Slide-over */}
        {showInvite && (
          <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(15,23,42,0.4)' }} onClick={() => setShowInvite(false)}>
            <div
              className="bg-white h-full overflow-y-auto"
              style={{ width: 480, padding: 28, boxShadow: '-4px 0 20px rgba(0,0,0,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)' }}>
                  Invite User
                </h3>
                <button onClick={() => setShowInvite(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                  <X size={18} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
              <div style={{ height: 1, backgroundColor: 'var(--border)', marginBottom: 20 }} />

              {/* Step indicators */}
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
                          fontSize: '11px', fontWeight: 600,
                        }}
                      >
                        {i < inviteStep ? <CheckCircle size={12} /> : i + 1}
                      </div>
                      <span style={{ fontSize: '12px', color: i <= inviteStep ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s}</span>
                    </div>
                    {i < inviteSteps.length - 1 && <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />}
                  </React.Fragment>
                ))}
              </div>

              {inviteStep === 0 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Full Name</label>
                    <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. John Smith" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email Address</label>
                    <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="john@hartwell.com" style={inputStyle} />
                  </div>
                </div>
              )}

              {inviteStep === 1 && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Role</label>
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
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{r}</span>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
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
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}><strong>Name:</strong> {inviteName || '--'}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 4 }}><strong>Email:</strong> {inviteEmail || '--'}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 4 }}><strong>Role:</strong> {inviteRole}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 12 }}>
                    An invitation email will be sent to {inviteEmail || 'the provided address'}.
                  </p>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => inviteStep > 0 ? setInviteStep(inviteStep - 1) : setShowInvite(false)}
                  className="px-4 py-2 rounded-lg"
                  style={{ fontSize: '13px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  {inviteStep === 0 ? 'Cancel' : 'Back'}
                </button>
                <button
                  onClick={() => {
                    if (inviteStep < 2) setInviteStep(inviteStep + 1);
                    else handleInvite();
                  }}
                  className="px-4 py-2 rounded-lg"
                  style={{ fontSize: '13px', backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontWeight: 500, cursor: 'pointer' }}
                >
                  {inviteStep === 2 ? 'Send Invitation' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
