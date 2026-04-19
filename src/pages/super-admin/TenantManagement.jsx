import React, { useState, useMemo } from 'react';
import { Building2, Users, AlertTriangle, DollarSign, Eye, Edit3, Ban, CheckCircle, X, Download, Search, Lock, Unlock, Mail, UserPlus, Send, Info, ChevronRight, Save, Pencil, Check } from 'lucide-react';
import { tenants as initialTenants, subscriptionPlans, auditLog as initialAuditLog } from '../../data/mockData';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

// Mock org detail data
const orgUsers = {
  1: [
    { name: 'Ryan Melade', email: 'ryan@hartwell.com', role: 'Admin', status: 'Active', lastActive: 'Today', onboardingRole: 'Partner / Senior Attorney' },
    { name: 'Sarah Chen', email: 'sarah@hartwell.com', role: 'Internal User', status: 'Active', lastActive: 'Today', onboardingRole: 'Associate / Junior Attorney' },
    { name: 'James Wu', email: 'james@hartwell.com', role: 'Internal User', status: 'Active', lastActive: 'Yesterday', onboardingRole: 'Paralegal / Legal Assistant' },
    { name: 'Maria Torres', email: 'maria@hartwell.com', role: 'Client', status: 'Active', lastActive: '2 days ago', onboardingRole: 'Paralegal / Legal Assistant' },
    { name: 'Tom Bradley', email: 'tom@hartwell.com', role: 'Internal User', status: 'Invited', lastActive: 'Never', onboardingRole: null },
  ],
  2: [
    { name: 'David Park', email: 'david@morrison.com', role: 'Admin', status: 'Active', lastActive: 'Today', onboardingRole: 'Partner / Senior Attorney' },
    { name: 'Lisa Wong', email: 'lisa@morrison.com', role: 'Internal User', status: 'Active', lastActive: 'Yesterday', onboardingRole: 'Associate / Junior Attorney' },
    { name: 'Amy Nguyen', email: 'amy@morrison.com', role: 'Client', status: 'Active', lastActive: '3 days ago', onboardingRole: null },
  ],
};

const orgWorkspaces = {
  1: [
    { name: 'Commercial Contracts', members: 3, documents: 18, created: 'Jan 15, 2026', status: 'Active' },
    { name: 'Litigation Support', members: 2, documents: 12, created: 'Jan 20, 2026', status: 'Active' },
    { name: 'Client Intake', members: 4, documents: 8, created: 'Feb 1, 2026', status: 'Active' },
    { name: 'Compliance', members: 2, documents: 8, created: 'Feb 10, 2026', status: 'Active' },
  ],
};

const orgContacts = {
  1: { admin: 'Ryan Melade', email: 'ryan@hartwell.com', stripeId: 'cus_Qk8mN2vXpL' },
  2: { admin: 'David Park', email: 'david@morrison.com', stripeId: 'cus_Rm3kP7wYqN' },
  3: { admin: 'Jennifer Chen', email: 'jen@chenpartners.com', stripeId: 'cus_Sn4lR8xZrO' },
  4: { admin: 'Mark Rivera', email: 'mark@riverakim.com', stripeId: null },
  5: { admin: 'Raj Patel', email: 'raj@patel.com', stripeId: 'cus_Up6nT0zBtQ' },
  6: { admin: 'David Thornton', email: 'david@thornton.com', stripeId: 'cus_Vq7oU1aCuR' },
  7: { admin: 'Nathan Gold', email: 'nathan@goldsteinwebb.com', stripeId: null },
  8: { admin: 'Karen Tanaka', email: 'karen@pacificrim.com', stripeId: 'cus_Xs9qW3cEwT' },
};


const planLimits = {
  Free: { docs: 50, workflows: 10, kpacks: 1 },
  Professional: { docs: 500, workflows: 100, kpacks: 3 },
  Team: { docs: 2000, workflows: 500, kpacks: 10 },
  Enterprise: { docs: 99999, workflows: 99999, kpacks: 99999 },
};


const PLAN_ORDER = ['Free', 'Professional', 'Team', 'Enterprise'];
const OVERRIDE_REASONS = ['Sales agreement', 'Trial extension', 'Support exception', 'Billing adjustment', 'Partner deal', 'Other'];

const roleColors = {
  Admin: { bg: 'var(--navy)', color: 'white' },
  'Internal User': { bg: '#F0F3F6', color: '#1E3A8A' },
  Client: { bg: '#E7F3E9', color: '#5CA868' },
  Invited: { bg: '#FBEED5', color: '#E8A33D' },
};

// Merge mock tenants with localStorage-registered tenants
function loadTenants() {
  try {
    const stored = JSON.parse(localStorage.getItem('yourai_mgmt_tenants') || '[]');
    const existingNames = new Set(initialTenants.map(t => t.name));
    const newTenants = stored.filter(t => !existingNames.has(t.name));
    return [...initialTenants, ...newTenants];
  } catch { return initialTenants; }
}

export default function TenantManagement() {
  const [tenantList, setTenantList] = useState(loadTenants);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [editingOrg, setEditingOrg] = useState(null);
  const [editForm, setEditForm] = useState({ name: '' });
  const [orgTab, setOrgTab] = useState('overview');
  const [orgUserSearch, setOrgUserSearch] = useState('');
  const [usersVersion, setUsersVersion] = useState(0);

  // Toggle block/unblock for an individual user within the org
  const toggleUserBlock = (user) => {
    if (!user?.email) return;
    try {
      const mgmtUsers = JSON.parse(localStorage.getItem('yourai_mgmt_users') || '[]');
      const idx = mgmtUsers.findIndex(u => u.email === user.email);
      if (idx >= 0) {
        const newStatus = mgmtUsers[idx].status === 'Active' ? 'Blocked' : 'Active';
        mgmtUsers[idx].status = newStatus;
        localStorage.setItem('yourai_mgmt_users', JSON.stringify(mgmtUsers));
        setUsersVersion(v => v + 1);
        showToast(newStatus === 'Blocked'
          ? `${user.name} has been blocked. Their access is stopped.`
          : `${user.name} has been unblocked. Access restored.`);
      } else {
        showToast(`${user.name} is a mock user and cannot be blocked in this build.`);
      }
    } catch {
      showToast('Could not update user status.');
    }
  };
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', plan: 'Professional', industry: 'Legal Services' });
  const [newAdmin, setNewAdmin] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [inviteSent, setInviteSent] = useState(false);
  const [overrideOrg, setOverrideOrg] = useState(null);
  const [overrideSelectedPlan, setOverrideSelectedPlan] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideCustomReason, setOverrideCustomReason] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideEffective, setOverrideEffective] = useState('immediately');
  const [overrideError, setOverrideError] = useState('');
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const showToast = useToast();

  const openPlanOverride = (org) => {
    setOverrideOrg(org);
    setOverrideSelectedPlan(null);
    setOverrideReason('');
    setOverrideCustomReason('');
    setOverrideNotes('');
    setOverrideEffective('immediately');
    setOverrideError('');
  };

  const handleApplyPlanChange = () => {
    if (!overrideSelectedPlan || !overrideReason) return;
    if (overrideReason === 'Other' && !overrideCustomReason.trim()) {
      setOverrideError('Please describe the reason');
      return;
    }
    const newPlan = overrideSelectedPlan;
    const planData = subscriptionPlans.find((p) => p.name === newPlan);
    const orgData = overrideOrg;
    const oldPlan = orgData.plan;
    const newMrr = (planData?.price || 0) * orgData.users;
    const updatedOrg = { ...orgData, plan: newPlan, mrr: newMrr, planPrice: planData?.price || 0 };
    setTenantList((prev) => prev.map((t) => t.id === orgData.id ? updatedOrg : t));
    if (selectedOrg && selectedOrg.id === orgData.id) {
      setSelectedOrg(updatedOrg);
    }
    // Add audit log entry
    setAuditLog((prev) => [
      { id: prev.length + 1, operator: 'Arjun P', action: `Changed plan ${oldPlan} → ${newPlan}`, target: orgData.name, time: 'Just now' },
      ...prev,
    ]);
    showToast(`Plan updated to ${newPlan} for ${orgData.name}`);
    setOverrideOrg(null);
  };

  const filtered = useMemo(() => {
    return tenantList.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (planFilter !== 'All' && t.plan !== planFilter) return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      return true;
    });
  }, [tenantList, search, planFilter, statusFilter]);

  const totalOrgs = tenantList.length;
  const activeOrgs = tenantList.filter((t) => t.status === 'Active').length;
  const suspendedOrgs = tenantList.filter((t) => t.status === 'Suspended').length;
  const totalMRR = tenantList.reduce((sum, t) => sum + t.mrr, 0);

  const toggleStatus = (id) => {
    setTenantList((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === 'Active' ? 'Suspended' : 'Active' } : t
      )
    );
  };

  const openEditOrg = (org, e) => {
    if (e) e.stopPropagation();
    setEditForm({ name: org.name });
    setEditingOrg(org);
  };

  const handleSaveEdit = () => {
    setTenantList((prev) =>
      prev.map((t) =>
        t.id === editingOrg.id ? { ...t, name: editForm.name } : t
      )
    );
    if (selectedOrg && selectedOrg.id === editingOrg.id) {
      setSelectedOrg({ ...selectedOrg, name: editForm.name });
    }
    showToast(`Organisation renamed to "${editForm.name}"`);
    setEditingOrg(null);
  };

  const handleSuspendFromModal = () => {
    const newStatus = editingOrg.status === 'Active' ? 'Suspended' : 'Active';
    setTenantList((prev) =>
      prev.map((t) => t.id === editingOrg.id ? { ...t, status: newStatus } : t)
    );
    if (selectedOrg && selectedOrg.id === editingOrg.id) {
      setSelectedOrg({ ...selectedOrg, status: newStatus });
    }
    showToast(newStatus === 'Suspended'
      ? `${editingOrg.name} blocked. All user access has been stopped.`
      : `${editingOrg.name} unblocked. User access has been restored.`
    );
    setEditingOrg(null);
  };

  const handleExportCSV = () => {
    const header = 'Organisation,Plan,Users,Workspaces,Documents,Status,Created,MRR';
    const rows = tenantList.map((t) => `"${t.name}",${t.plan},${t.users},${t.workspaces},${t.documents},${t.status},"${t.created}",${t.mrr}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tenants_export.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully');
  };

  const openAddTenant = () => {
    setNewOrg({ name: '', plan: 'Professional', industry: 'Legal Services' });
    setNewAdmin({ firstName: '', lastName: '', email: '', phone: '' });
    setInviteSent(false); setShowAddTenant(true);
  };

  const handleCreateTenant = () => {
    // Derive a display name from the email local-part if no first/last provided
    const emailLocal = (newAdmin.email || '').split('@')[0] || '';
    const derivedName = emailLocal
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || 'Admin';
    const fullName = (`${newAdmin.firstName} ${newAdmin.lastName}`.trim()) || derivedName;
    const createdDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newTenant = {
      id: Date.now(), name: newOrg.name, plan: newOrg.plan, users: 1, workspaces: 0, documents: 0,
      status: 'Active', created: createdDate, mrr: newOrg.plan === 'Free' ? 0 : newOrg.plan === 'Professional' ? 149 : newOrg.plan === 'Team' ? 299 : 599,
      planPrice: newOrg.plan === 'Free' ? 0 : newOrg.plan === 'Professional' ? 149 : newOrg.plan === 'Team' ? 299 : 599,
      billedSince: createdDate, nextRenewal: '', paymentStatus: newOrg.plan === 'Free' ? 'N/A' : 'Pending',
    };
    setTenantList((prev) => [newTenant, ...prev]);
    setInviteSent(true);

    // Persist new tenant and admin user to localStorage
    try {
      const storedTenants = JSON.parse(localStorage.getItem('yourai_mgmt_tenants') || '[]');
      storedTenants.push(newTenant);
      localStorage.setItem('yourai_mgmt_tenants', JSON.stringify(storedTenants));

      // Also create the admin user in management users
      if (newAdmin.email) {
        const storedUsers = JSON.parse(localStorage.getItem('yourai_mgmt_users') || '[]');
        if (!storedUsers.some(u => u.email === newAdmin.email)) {
          storedUsers.push({
            id: Date.now() + 1,
            name: fullName,
            email: newAdmin.email,
            org: newOrg.name,
            plan: newOrg.plan,
            role: 'Admin',
            status: 'Invited',
            lastActive: 'Never',
            created: createdDate,
            logins: 0,
            docsUploaded: 0,
              onboardingCompleted: false,
          });
          localStorage.setItem('yourai_mgmt_users', JSON.stringify(storedUsers));
        }
      }
    } catch { /* localStorage full */ }

    showToast(`Invitation sent to ${newAdmin.email}. ${newOrg.name} has been onboarded.`);
  };

  const closeAddTenant = () => { setShowAddTenant(false); setInviteSent(false); };

  const openOrgDetail = (org) => {
    setSelectedOrg(org);
    setOrgTab('overview');
    setOrgUserSearch('');
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

  // For dynamic tenants (created via signup), pull user/profile data from localStorage
  const dynamicContact = useMemo(() => {
    if (!selectedOrg || orgContacts[selectedOrg.id]) return null;
    try {
      const mgmtUsers = JSON.parse(localStorage.getItem('yourai_mgmt_users') || '[]');
      const orgUser = mgmtUsers.find(u => u.org === selectedOrg.name);
      if (orgUser) return { admin: orgUser.name, email: orgUser.email, stripeId: null };
    } catch {}
    return null;
  }, [selectedOrg]);

  const contact = selectedOrg ? (orgContacts[selectedOrg.id] || dynamicContact || { admin: 'Unknown', email: '—', stripeId: null }) : null;

  const dynamicUsers = useMemo(() => {
    if (!selectedOrg || orgUsers[selectedOrg.id]) return null;
    try {
      const mgmtUsers = JSON.parse(localStorage.getItem('yourai_mgmt_users') || '[]');
      return mgmtUsers
        .filter(u => u.org === selectedOrg.name)
        .map(u => ({ name: u.name, email: u.email, role: u.role || 'Admin', status: u.status || 'Active', lastActive: u.lastActive || 'Today', onboardingRole: u.onboardingRole || null }));
    } catch {}
    return null;
  }, [selectedOrg, usersVersion]);

  const users = selectedOrg ? (orgUsers[selectedOrg.id] || (dynamicUsers && dynamicUsers.length > 0 ? dynamicUsers : [{ name: contact?.admin || 'Admin', email: contact?.email || '—', role: 'Admin', status: 'Active', lastActive: 'Today' }])) : [];
  const workspaces = selectedOrg ? (orgWorkspaces[selectedOrg.id] || [{ name: 'Default Workspace', members: selectedOrg.users, documents: selectedOrg.documents, created: selectedOrg.created, status: 'Active' }]) : [];

  const limits = selectedOrg ? planLimits[selectedOrg.plan] : null;

  const filteredOrgUsers = users.filter((u) =>
    !orgUserSearch || u.name.toLowerCase().includes(orgUserSearch.toLowerCase()) || u.email.toLowerCase().includes(orgUserSearch.toLowerCase())
  );

  const UsageBar = ({ label, used, limit }) => {
    const isUnlimited = limit >= 99999;
    const pct = isUnlimited ? 25 : Math.min((used / limit) * 100, 100);
    const color = pct > 80 ? '#C65454' : pct > 50 ? '#E8A33D' : '#5CA868';
    return (
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{used} / {isUnlimited ? '∞' : limit.toLocaleString()}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ice)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Tenant */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Building2 size={20} style={{ color: 'var(--text-primary)' }} />
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '22px', color: 'var(--text-primary)' }}>Tenant Management</h1>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: 30 }}>Manage organisations, plans, and access across the platform</p>
          </div>
          <button onClick={openAddTenant} className="flex items-center gap-1.5 text-white" style={{ backgroundColor: 'var(--navy)', borderRadius: '8px', padding: '0 16px', height: 36, fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
            <UserPlus size={15} /> Add Tenant
          </button>
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '16px 0 24px' }} />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Building2} value={totalOrgs} label="Total Orgs" />
        <StatCard icon={CheckCircle} value={activeOrgs} label="Active" />
        <StatCard icon={AlertTriangle} value={suspendedOrgs} label="Blocked" />
        <StatCard icon={DollarSign} value={`$${totalMRR.toLocaleString()}`} label="MRR" accentColor="var(--gold)" />
      </div>

      {/* Filters + Export */}
      <div className="flex items-center gap-4">
        <input type="text" placeholder="Search organisations..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={inputStyle}>
          <option>All</option><option>Free</option><option>Professional</option><option>Team</option><option>Enterprise</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
          <option>All</option><option>Active</option><option value="Suspended">Blocked</option>
        </select>
        <button onClick={handleExportCSV} disabled={filtered.length === 0} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap" style={{ border: '1px solid var(--border)', color: filtered.length === 0 ? '#9CA3AF' : 'var(--slate)', backgroundColor: 'white', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', opacity: filtered.length === 0 ? 0.6 : 1 }}>
          <Download size={16} /> Export CSV
        </button>
        <span className="text-sm whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Showing {filtered.length} organisations</span>
      </div>

      {/* Table */}
      <Table columns={['Organisation', 'Plan', 'Users', 'Workspaces', 'Documents', 'Status', 'Created', 'Actions']}>
        {filtered.map((t) => (
          <tr key={t.id} className="transition-colors cursor-pointer" style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')} onClick={() => openOrgDetail(t)}>
            <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</td>
            <td className="px-4 py-3"><Badge variant={t.plan}>{t.plan}</Badge></td>
            <td className="px-4 py-3 text-sm">{t.users}</td>
            <td className="px-4 py-3 text-sm">{t.workspaces}</td>
            <td className="px-4 py-3 text-sm">{t.documents}</td>
            <td className="px-4 py-3"><Badge variant={t.status}>{t.status === 'Suspended' ? 'Blocked' : t.status}</Badge></td>
            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{t.created}</td>
            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="View" onClick={() => openOrgDetail(t)}><Eye size={16} style={{ color: 'var(--slate)' }} /></button>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Edit" onClick={(e) => openEditOrg(t, e)}><Edit3 size={16} style={{ color: 'var(--text-primary)' }} /></button>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title={t.status === 'Active' ? 'Block' : 'Unblock'} onClick={() => toggleStatus(t.id)}>
                  {t.status === 'Active' ? <Ban size={16} style={{ color: '#C65454' }} /> : <CheckCircle size={16} style={{ color: '#5CA868' }} />}
                </button>
              </div>
            </td>
          </tr>
        ))}
        {filtered.length === 0 && (
          <tr>
            <td colSpan={8} className="px-4 py-12 text-center">
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                <Search size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ fontWeight: 500 }}>No organisations found</p>
                <p style={{ fontSize: '12px', marginTop: 4 }}>Try adjusting your search or filters.</p>
              </div>
            </td>
          </tr>
        )}
      </Table>

      {/* Edit Tenant Modal */}
      <Modal open={!!editingOrg} onClose={() => setEditingOrg(null)} title="Edit Tenant">
        <div className="space-y-5">
          {/* Current status indicator */}
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Current Status:</span>
            <Badge variant={editingOrg?.status}>{editingOrg?.status}</Badge>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
            <Badge variant={editingOrg?.plan}>{editingOrg?.plan} Plan</Badge>
          </div>

          {/* Organisation Name */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Organisation Name *</label>
            <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ ...inputStyle, width: '100%' }} onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
          </div>

          {/* Save name */}
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditingOrg(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}>Cancel</button>
            <button onClick={handleSaveEdit} disabled={!editForm.name.trim() || editForm.name === editingOrg?.name} className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5" style={{ backgroundColor: (!editForm.name.trim() || editForm.name === editingOrg?.name) ? '#9CA3AF' : 'var(--navy)', cursor: (!editForm.name.trim() || editForm.name === editingOrg?.name) ? 'not-allowed' : 'pointer' }}>
              <Save size={14} /> Save Name
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'var(--border)' }} />

          {/* Block / Unblock Section */}
          <div className="p-4 rounded-lg" style={{ border: `1px solid ${editingOrg?.status === 'Active' ? '#F9E7E7' : '#E7F3E9'}`, backgroundColor: editingOrg?.status === 'Active' ? '#F9E7E7' : '#E7F3E9' }}>
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: editingOrg?.status === 'Active' ? '#C65454' : '#5CA868' }}>
              {editingOrg?.status === 'Active' ? 'Block Organisation' : 'Unblock Organisation'}
            </div>
            <p className="text-xs mb-3" style={{ color: editingOrg?.status === 'Active' ? '#C65454' : '#5CA868' }}>
              {editingOrg?.status === 'Active'
                ? 'Blocking this organisation will immediately stop all user access. No users from this organisation will be able to log in, access documents, or run workflows until the organisation is unblocked.'
                : 'Unblocking this organisation will restore access for all users. They will be able to log in and resume using the platform immediately.'}
            </p>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: editingOrg?.status === 'Active' ? '#C65454' : '#5CA868' }} />
              <span className="text-xs font-medium" style={{ color: editingOrg?.status === 'Active' ? '#C65454' : '#5CA868' }}>
                {editingOrg?.status === 'Active' ? `This will affect ${editingOrg?.users || 0} user(s)` : 'All users will regain access'}
              </span>
            </div>
            <button onClick={handleSuspendFromModal} className="mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5" style={{ backgroundColor: editingOrg?.status === 'Active' ? '#C65454' : '#5CA868' }}>
              {editingOrg?.status === 'Active' ? <><Ban size={14} /> Block &amp; Stop Access</> : <><CheckCircle size={14} /> Unblock &amp; Restore Access</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* Org Detail Slide-over */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full bg-white h-full overflow-y-auto" style={{ maxWidth: 480, boxShadow: '-4px 0 20px rgba(0,0,0,0.1)' }}>
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)', fontFamily: "'DM Serif Display', serif" }}>{selectedOrg.name}</h3>
                <Badge variant={selectedOrg.plan}>{selectedOrg.plan}</Badge>
                <Badge variant={selectedOrg.status}>{selectedOrg.status}</Badge>
              </div>
              <button onClick={() => setSelectedOrg(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} style={{ color: 'var(--slate)' }} /></button>
            </div>

            {/* Tabs */}
            <div className="px-6 flex gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
              {['overview', 'users', 'workspaces', 'usage'].map((tab) => (
                <button key={tab} onClick={() => setOrgTab(tab)} className="px-4 py-3 text-sm font-medium capitalize transition-colors" style={{ color: orgTab === tab ? 'var(--navy)' : '#718096', borderBottom: orgTab === tab ? '2px solid var(--gold)' : '2px solid transparent' }}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {orgTab === 'overview' && (
                <div className="space-y-5">
                  {/* Edit Tenant Button */}
                  <button onClick={() => openEditOrg(selectedOrg)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'white' }}>
                    <Edit3 size={14} /> Edit Organisation Details
                  </button>

                  {/* Billing Detail */}
                  {(() => {
                    const pricePerUser = selectedOrg.planPrice || 0;
                    return (
                      <div className="p-4 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Subscription</div>
                          {/* SA cannot change plan — managed by user/billing */}
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Plan</span>
                            <Badge variant={selectedOrg.plan}>{selectedOrg.plan}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Price per user</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{pricePerUser > 0 ? `$${pricePerUser}/month` : 'Free'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Active seats</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selectedOrg.users} users</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Monthly total</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>${selectedOrg.mrr.toLocaleString()}/month</span>
                          </div>
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }} />
                          <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Billing since</span>
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedOrg.billedSince}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Next renewal</span>
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedOrg.nextRenewal}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Payment status</span>
                            <Badge variant={selectedOrg.paymentStatus}>{selectedOrg.paymentStatus}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* General Info */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Status', selectedOrg.status],
                      ['Created', selectedOrg.created],
                      ['Stripe ID', contact?.stripeId || '—'],
                      ['Workspaces', selectedOrg.workspaces],
                    ].map(([l, v]) => (
                      <div key={l} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)' }}>
                        <div className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{l}</div>
                        <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                    <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Contact</div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{contact?.admin}</div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{contact?.email}</div>
                  </div>

                  <div className="p-4 rounded-lg" style={{ border: `1px solid ${selectedOrg.status === 'Active' ? '#F9E7E7' : '#E7F3E9'}`, backgroundColor: selectedOrg.status === 'Active' ? '#F9E7E7' : '#E7F3E9' }}>
                    <div className="text-xs font-semibold uppercase mb-1" style={{ color: selectedOrg.status === 'Active' ? '#C65454' : '#5CA868' }}>
                      {selectedOrg.status === 'Active' ? 'Block Access' : 'Unblock Access'}
                    </div>
                    <p className="text-xs mb-3" style={{ color: selectedOrg.status === 'Active' ? '#C65454' : '#5CA868' }}>
                      {selectedOrg.status === 'Active'
                        ? `Blocking will stop all ${selectedOrg.users} user(s) from accessing the platform.`
                        : 'Unblocking will restore access for all users in this organisation.'}
                    </p>
                    <button onClick={() => { const newStatus = selectedOrg.status === 'Active' ? 'Suspended' : 'Active'; toggleStatus(selectedOrg.id); setSelectedOrg({...selectedOrg, status: newStatus}); showToast(newStatus === 'Suspended' ? `${selectedOrg.name} blocked. All user access stopped.` : `${selectedOrg.name} unblocked. User access restored.`); }} className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5" style={{ backgroundColor: selectedOrg.status === 'Active' ? '#C65454' : '#5CA868' }}>
                      {selectedOrg.status === 'Active' ? <><Ban size={14} /> Block &amp; Stop Access</> : <><CheckCircle size={14} /> Unblock &amp; Restore Access</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {orgTab === 'users' && (
                <div className="space-y-4">
                  <input type="text" placeholder="Search users..." value={orgUserSearch} onChange={(e) => setOrgUserSearch(e.target.value)} style={{ ...inputStyle, width: '100%' }} onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ backgroundColor: 'var(--ice-warm)' }}>
                          {['Name', 'Role', 'Status', ''].map((c) => (
                            <th key={c} className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrgUsers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-8 text-center">
                              <Users size={20} style={{ margin: '0 auto 6px', color: 'var(--text-muted)', opacity: 0.4 }} />
                              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{orgUserSearch ? 'No users match your search' : 'No users yet'}</p>
                            </td>
                          </tr>
                        )}
                        {filteredOrgUsers.map((u, i) => (
                          <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="px-3 py-2.5">
                              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.name}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={roleColors[u.role] || { bg: '#F3F4F6', color: '#6B7885' }}>{u.role}</span>
                              {u.onboardingRole && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>{u.onboardingRole}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={u.status === 'Active' ? { backgroundColor: '#E7F3E9', color: '#5CA868' } : u.status === 'Invited' ? { backgroundColor: '#FBEED5', color: '#E8A33D' } : { backgroundColor: '#F9E7E7', color: '#C65454' }}>{u.status}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              {u.status !== 'Invited' && (
                                <button onClick={() => toggleUserBlock(u)} className="p-1 rounded hover:bg-gray-100" title={u.status === 'Active' ? 'Block' : 'Unblock'}>
                                  {u.status === 'Active' ? <Lock size={14} style={{ color: '#C65454' }} /> : <Unlock size={14} style={{ color: '#5CA868' }} />}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Workspaces Tab */}
              {orgTab === 'workspaces' && (
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--ice-warm)' }}>
                        {['Workspace', 'Members', 'Docs', 'Created', 'Status'].map((c) => (
                          <th key={c} className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {workspaces.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center">
                            <Building2 size={20} style={{ margin: '0 auto 6px', color: 'var(--text-muted)', opacity: 0.4 }} />
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>No workspaces yet</p>
                          </td>
                        </tr>
                      )}
                      {workspaces.map((w, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="px-3 py-2.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{w.name}</td>
                          <td className="px-3 py-2.5 text-sm">{w.members}</td>
                          <td className="px-3 py-2.5 text-sm">{w.documents}</td>
                          <td className="px-3 py-2.5 text-sm" style={{ color: 'var(--text-muted)' }}>{w.created}</td>
                          <td className="px-3 py-2.5"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E7F3E9', color: '#5CA868' }}>{w.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Usage Tab */}
              {orgTab === 'usage' && limits && (
                <div className="space-y-2">
                  <UsageBar label="Documents" used={selectedOrg.documents} limit={limits.docs} />
                  <UsageBar label="Workflow Runs" used={Math.round(selectedOrg.documents * 0.3)} limit={limits.workflows} />
                  <UsageBar label="Knowledge Packs" used={Math.min(selectedOrg.workspaces, limits.kpacks)} limit={limits.kpacks} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Add Tenant Slide-over ═══ */}
      {showAddTenant && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(15,23,42,0.4)' }} onClick={closeAddTenant}>
          <div className="w-full bg-white h-full overflow-y-auto flex flex-col" style={{ maxWidth: 520, boxShadow: '-8px 0 32px rgba(0,0,0,0.08)' }} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="sticky top-0 bg-white z-10" style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-1">
                <h3 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '18px' }}>
                  {inviteSent ? 'Invitation Sent' : 'Add New Tenant'}
                </h3>
                <button onClick={closeAddTenant} className="p-1.5 rounded-md" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
              </div>
              {!inviteSent && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Enter the tenant's name and admin email. They'll receive an invitation to set their password and log in.
                </p>
              )}
            </div>

            {/* Body */}
            <div className="flex-1" style={{ padding: '24px 28px' }}>
              {!inviteSent && (
                <div className="space-y-5">
                  <div>
                    <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Tenant Name *</label>
                    <input type="text" value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} placeholder="e.g. Hartwell & Associates" style={{ ...inputStyle, width: '100%' }} autoFocus />
                  </div>

                  <div>
                    <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Admin Email *</label>
                    <input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} placeholder="admin@hartwell.com" style={{ ...inputStyle, width: '100%' }} />
                    {newAdmin.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdmin.email) && (
                      <p className="mt-1" style={{ fontSize: '11px', color: '#C65454' }}>Please enter a valid email address.</p>
                    )}
                    {(!newAdmin.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdmin.email)) && (
                      <p className="mt-1" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>The invitation email will be sent to this address.</p>
                    )}
                  </div>

                  <div className="p-4 rounded-lg" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--ice-warm)' }}>
                    <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>What happens next</div>
                    <div className="space-y-2">
                      {[
                        'Admin receives an email with a secure invitation link.',
                        'They click the link to set their password.',
                        'They log into the Org Admin portal and start onboarding their team.',
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: 'var(--ice)', color: 'var(--text-muted)' }}>{i + 1}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Success state */}
              {inviteSent && (
                <div className="text-center py-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E7F3E9' }}>
                      <CheckCircle size={32} style={{ color: '#5CA868' }} />
                    </div>
                  </div>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '20px', color: 'var(--text-primary)' }}>Invitation Sent</h2>
                  <p className="mt-2 mx-auto" style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 320 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{newOrg.name}</strong> has been added. An invitation email has been sent to <strong style={{ color: 'var(--text-primary)' }}>{newAdmin.email}</strong>.
                  </p>

                  <div className="mt-6 p-4 rounded-lg text-left" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--ice-warm)' }}>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Tenant</span><span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{newOrg.name}</span></div>
                      <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Invite sent to</span><span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{newAdmin.email}</span></div>
                      <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Link expires</span><span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>7 days</span></div>
                    </div>
                  </div>

                  <button onClick={closeAddTenant} className="mt-6 w-full py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--navy)' }}>Done</button>
                </div>
              )}
            </div>

            {/* Footer */}
            {!inviteSent && (
              <div className="sticky bottom-0 bg-white flex items-center justify-end gap-3" style={{ padding: '16px 28px', borderTop: '1px solid var(--border)' }}>
                <button onClick={closeAddTenant} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
                {(() => {
                  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdmin.email);
                  const isDisabled = !newOrg.name.trim() || !emailValid;
                  return (
                    <button
                      onClick={handleCreateTenant}
                      disabled={isDisabled}
                      className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5"
                      style={{ backgroundColor: isDisabled ? '#9CA3AF' : 'var(--navy)', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                    >
                      <Send size={14} /> Send Invitation
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plan Override Modal removed — SA cannot change plan or payment data */}
    </div>
  );
}
