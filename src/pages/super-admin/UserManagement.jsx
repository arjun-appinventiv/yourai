import React, { useState, useMemo } from 'react';
import { Users, UserCheck, UserX, Clock, Eye, Ban, CheckCircle, Download, Search } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

const initialUsers = [
  { id: 1, name: 'Ryan Melade', email: 'ryan@hartwell.com', org: 'Hartwell & Associates', plan: 'Team', role: 'Admin', status: 'Active', lastActive: 'Today', created: 'Jan 12, 2026', logins: 142, docsUploaded: 38, onboardingCompleted: true, onboardingRole: 'Partner / Senior Attorney', onboardingAreas: ['Corporate & M&A', 'Litigation'], onboardingFirmSize: 'Small Firm', onboardingState: 'New York' },
  { id: 2, name: 'Sarah Chen', email: 'sarah@hartwell.com', org: 'Hartwell & Associates', plan: 'Team', role: 'Internal User', status: 'Active', lastActive: 'Today', created: 'Jan 15, 2026', logins: 98, docsUploaded: 22, onboardingCompleted: true, onboardingRole: 'Associate / Junior Attorney', onboardingAreas: ['Employment & Labor'], onboardingFirmSize: 'Small Firm', onboardingState: 'New York' },
  { id: 3, name: 'James Wu', email: 'james@hartwell.com', org: 'Hartwell & Associates', plan: 'Team', role: 'Internal User', status: 'Active', lastActive: 'Yesterday', created: 'Feb 1, 2026', logins: 64, docsUploaded: 15, onboardingCompleted: true, onboardingRole: 'Paralegal / Legal Assistant', onboardingAreas: ['Corporate & M&A'], onboardingFirmSize: 'Small Firm', onboardingState: 'New York' },
  { id: 4, name: 'Maria Torres', email: 'maria@hartwell.com', org: 'Hartwell & Associates', plan: 'Team', role: 'Client', status: 'Active', lastActive: '2 days ago', created: 'Feb 5, 2026', logins: 45, docsUploaded: 11, onboardingCompleted: true, onboardingRole: 'Paralegal / Legal Assistant', onboardingAreas: ['Litigation', 'Criminal Defense'], onboardingFirmSize: 'Small Firm', onboardingState: 'New York' },
  { id: 5, name: 'Tom Bradley', email: 'tom@hartwell.com', org: 'Hartwell & Associates', plan: 'Team', role: 'Internal User', status: 'Invited', lastActive: 'Never', created: 'Mar 28, 2026', logins: 0, docsUploaded: 0, onboardingCompleted: false },
  { id: 6, name: 'David Park', email: 'david@morrison.com', org: 'Morrison Legal Group', plan: 'Professional', role: 'Admin', status: 'Active', lastActive: 'Today', created: 'Jan 28, 2026', logins: 120, docsUploaded: 45, onboardingCompleted: true, onboardingRole: 'Partner / Senior Attorney', onboardingAreas: ['Litigation'], onboardingFirmSize: 'Mid-size Firm', onboardingState: 'California' },
  { id: 7, name: 'Lisa Wong', email: 'lisa@morrison.com', org: 'Morrison Legal Group', plan: 'Professional', role: 'Client', status: 'Active', lastActive: 'Yesterday', created: 'Feb 10, 2026', logins: 78, docsUploaded: 28, onboardingCompleted: true, onboardingRole: 'In-house Counsel', onboardingAreas: ['Real Estate', 'Corporate & M&A'], onboardingFirmSize: 'Mid-size Firm', onboardingState: 'California' },
  { id: 8, name: 'Jennifer Chen', email: 'jen@chenpartners.com', org: 'Chen Partners LLC', plan: 'Enterprise', role: 'Admin', status: 'Active', lastActive: 'Today', created: 'Feb 3, 2026', logins: 210, docsUploaded: 95, onboardingCompleted: true, onboardingRole: 'Partner / Senior Attorney', onboardingAreas: ['Intellectual Property', 'Corporate & M&A', 'Technology'], onboardingFirmSize: 'Large Firm', onboardingState: 'Illinois' },
  { id: 9, name: 'Mark Rivera', email: 'mark@riverakim.com', org: 'Rivera & Kim LLP', plan: 'Free', role: 'Admin', status: 'Active', lastActive: '3 days ago', created: 'Feb 14, 2026', logins: 32, docsUploaded: 8, onboardingCompleted: true, onboardingRole: 'Solo Practitioner', onboardingAreas: ['Immigration'], onboardingFirmSize: 'Solo Practice', onboardingState: 'Texas' },
  { id: 10, name: 'Carlos Patel', email: 'carlos@patel.com', org: 'Patel Law Office', plan: 'Professional', role: 'Admin', status: 'Blocked', lastActive: 'Apr 1, 2026', created: 'Feb 20, 2026', logins: 55, docsUploaded: 20, onboardingCompleted: true, onboardingRole: 'Partner / Senior Attorney', onboardingAreas: ['Family Law', 'Estate Planning'], onboardingFirmSize: 'Small Firm', onboardingState: 'Florida' },
];

const roleColors = {
  Admin: { backgroundColor: 'var(--navy)', color: 'white' },
  'Internal User': { backgroundColor: '#F0F3F6', color: '#1E3A8A' },
  Client: { backgroundColor: '#E7F3E9', color: '#5CA868' },
};

const statusColors = {
  Active: { backgroundColor: '#E7F3E9', color: '#5CA868' },
  Blocked: { backgroundColor: '#F9E7E7', color: '#C65454' },
  Invited: { backgroundColor: '#FBEED5', color: '#E8A33D' },
};

// Merge mock data with localStorage-registered users
function loadUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem('yourai_mgmt_users') || '[]');
    // Merge: mock data first, then localStorage users (skip duplicates by email)
    const existingEmails = new Set(initialUsers.map(u => u.email));
    const newUsers = stored.filter(u => !existingEmails.has(u.email));
    return [...initialUsers, ...newUsers];
  } catch { return initialUsers; }
}

function getAllOrgs(users) {
  const orgs = [...new Set(users.map(u => u.org))];
  return ['All', ...orgs.sort()];
}

export default function UserManagement() {
  const [users, setUsers] = useState(loadUsers);
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const showToast = useToast();

  const allOrgs = useMemo(() => getAllOrgs(users), [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (orgFilter !== 'All' && u.org !== orgFilter) return false;
      if (roleFilter !== 'All' && u.role !== roleFilter) return false;
      if (statusFilter !== 'All' && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, orgFilter, roleFilter, statusFilter]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'Active').length;
  const blockedUsers = users.filter((u) => u.status === 'Blocked').length;
  const invitedUsers = users.filter((u) => u.status === 'Invited').length;

  const toggleBlock = (id) => {
    const user = users.find((u) => u.id === id);
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id !== id) return u;
        const next = u.status === 'Blocked' ? 'Active' : 'Blocked';
        return { ...u, status: next };
      });
      // Persist non-mock user changes to localStorage
      try {
        const mockEmails = new Set(initialUsers.map(u => u.email));
        const storedUsers = updated.filter(u => !mockEmails.has(u.email));
        localStorage.setItem('yourai_mgmt_users', JSON.stringify(storedUsers));
      } catch { /* ignore */ }
      return updated;
    });
    showToast(`${user.name} ${user.status === 'Blocked' ? 'unblocked' : 'blocked'}`);
  };

  const handleExportCSV = () => {
    const header = 'Name,Email,Organisation,Role,Status,Last Active';
    const rows = users.map((u) => `"${u.name}","${u.email}","${u.org}",${u.role},${u.status},"${u.lastActive}"`);
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'platform_users_export.csv';
    a.click();
    showToast('Users CSV exported');
  };

  const inputStyle = {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    height: 36,
    padding: '0 12px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13px',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} title="Platform Users" subtitle="View and manage all users across organisations" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} value={totalUsers} label="Total Users" />
        <StatCard icon={UserCheck} value={activeUsers} label="Active" />
        <StatCard icon={UserX} value={blockedUsers} label="Blocked" accentColor="#C65454" />
        <StatCard icon={Clock} value={invitedUsers} label="Invited" accentColor="var(--gold)" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
        </div>
        <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} style={inputStyle}>
          {allOrgs.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={inputStyle}>
          <option>All</option><option>Admin</option><option>Internal User</option><option>Client</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
          <option>All</option><option>Active</option><option>Blocked</option><option>Invited</option>
        </select>
        <button onClick={handleExportCSV} disabled={filtered.length === 0} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap" style={{ border: '1px solid var(--border)', color: filtered.length === 0 ? '#9CA3AF' : 'var(--slate)', backgroundColor: 'white', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', opacity: filtered.length === 0 ? 0.6 : 1 }}>
          <Download size={16} /> Export CSV
        </button>
        <span className="text-sm whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Showing {filtered.length} users</span>
      </div>

      {/* Table */}
      <Table columns={['User', 'Email', 'Organisation', 'Role', 'Status', 'Last Active', 'Actions']}>
        {filtered.map((u) => (
          <tr key={u.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: 'var(--navy)' }}>
                  {u.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.name}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{u.email}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{u.org}</span>
                <Badge variant={u.plan}>{u.plan}</Badge>
              </div>
            </td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={roleColors[u.role]}>{u.role}</span>
            </td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={statusColors[u.status]}>{u.status}</span>
            </td>
            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{u.lastActive}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg hover:bg-gray-100" title="View" onClick={() => setSelectedUser(u)}><Eye size={16} style={{ color: 'var(--slate)' }} /></button>
                {u.status !== 'Invited' && (
                  <button className="p-1.5 rounded-lg hover:bg-gray-100" title={u.status === 'Blocked' ? 'Unblock' : 'Block'} onClick={() => toggleBlock(u.id)}>
                    {u.status === 'Blocked' ? <CheckCircle size={16} style={{ color: '#5CA868' }} /> : <Ban size={16} style={{ color: '#C65454' }} />}
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
        {filtered.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-12 text-center">
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                <Search size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ fontWeight: 500 }}>No users found</p>
                <p style={{ fontSize: '12px', marginTop: 4 }}>Try adjusting your search or filters.</p>
              </div>
            </td>
          </tr>
        )}
      </Table>

      {/* User Detail Modal */}
      <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Details">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold" style={{ backgroundColor: 'var(--navy)' }}>
                {selectedUser.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <div className="font-medium text-base" style={{ color: 'var(--text-primary)' }}>{selectedUser.name}</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{selectedUser.email}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['Organisation', selectedUser.org], ['Role', selectedUser.role], ['Status', selectedUser.status], ['Created', selectedUser.created], ['Last Active', selectedUser.lastActive]].map(([l, v]) => (
                <div key={l} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)' }}>
                  <div className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{l}</div>
                  <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-lg" style={{ border: '1px solid var(--border)' }}>
              <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Activity Summary</div>
              <div className="grid grid-cols-2 gap-3">
                {[['Total Logins', selectedUser.logins], ['Docs Uploaded', selectedUser.docsUploaded]].map(([l, v]) => (
                  <div key={l} className="text-center">
                    <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{v}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Onboarding Profile */}
            <div className="p-4 rounded-lg" style={{ border: '1px solid var(--border)' }}>
              <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Onboarding Profile</div>
              {selectedUser.onboardingCompleted === false ? (
                <div className="rounded-lg p-3 text-sm italic" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  This user has not completed onboarding.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)' }}>
                    <div className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Role</div>
                    <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{selectedUser.onboardingRole}</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)' }}>
                    <div className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Primary State</div>
                    <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{selectedUser.onboardingState}</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)' }}>
                    <div className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Firm Size</div>
                    <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{selectedUser.onboardingFirmSize}</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)' }}>
                    <div className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Practice Areas</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedUser.onboardingAreas && selectedUser.onboardingAreas.length > 0 ? (
                        selectedUser.onboardingAreas.map((area) => (
                          <span key={area} className="rounded-full text-xs px-2 py-0.5" style={{ backgroundColor: '#F3F4F6', color: '#6B7885' }}>{area}</span>
                        ))
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Not set</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {selectedUser.status !== 'Invited' && (
                <button onClick={() => { toggleBlock(selectedUser.id); setSelectedUser(null); }} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: selectedUser.status === 'Blocked' ? '#5CA868' : '#C65454' }}>
                  {selectedUser.status === 'Blocked' ? 'Unblock User' : 'Block User'}
                </button>
              )}
              <button onClick={() => setSelectedUser(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
