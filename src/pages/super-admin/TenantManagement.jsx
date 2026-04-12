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

const firmProfiles = {
  1: { primaryState: 'New York', additionalStates: ['California', 'Connecticut'], federalPractice: true, practiceAreas: ['Corporate & M&A', 'Litigation', 'Real Estate'], firmSize: 'Small Firm' },
  2: { primaryState: 'California', additionalStates: ['Nevada'], federalPractice: false, practiceAreas: ['Litigation', 'Employment & Labor'], firmSize: 'Mid-size Firm' },
  3: { primaryState: 'Illinois', additionalStates: [], federalPractice: true, practiceAreas: ['Corporate & M&A', 'Tax & Compliance'], firmSize: 'Small Firm' },
  4: { primaryState: 'Texas', additionalStates: ['Oklahoma'], federalPractice: false, practiceAreas: ['Family Law', 'Criminal Defense'], firmSize: 'Small Firm' },
  5: { primaryState: 'Florida', additionalStates: [], federalPractice: false, practiceAreas: ['Real Estate', 'Immigration'], firmSize: 'Solo Practitioner' },
  6: { primaryState: 'Georgia', additionalStates: ['Alabama'], federalPractice: false, practiceAreas: ['Litigation'], firmSize: 'Mid-size Firm' },
  7: { primaryState: 'Massachusetts', additionalStates: [], federalPractice: true, practiceAreas: ['Intellectual Property'], firmSize: 'Small Firm' },
  8: { primaryState: 'Washington', additionalStates: ['Oregon'], federalPractice: false, practiceAreas: ['Employment & Labor', 'Healthcare Law'], firmSize: 'Mid-size Firm' },
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
  'Internal User': { bg: '#EFF6FF', color: '#1D4ED8' },
  Client: { bg: '#F0FDF4', color: '#166534' },
  Invited: { bg: '#FEF3C7', color: '#92400E' },
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
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [addStep, setAddStep] = useState(1);
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
      ? `${editingOrg.name} suspended. All user access has been blocked.`
      : `${editingOrg.name} reactivated. User access has been restored.`
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
    setAddStep(1); setInviteSent(false); setShowAddTenant(true);
  };

  const handleCreateTenant = () => {
    const fullName = `${newAdmin.firstName} ${newAdmin.lastName}`.trim();
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
            reportsGenerated: 0,
            onboardingCompleted: false,
          });
          localStorage.setItem('yourai_mgmt_users', JSON.stringify(storedUsers));
        }
      }
    } catch { /* localStorage full */ }

    showToast(`Invitation sent to ${newAdmin.email}. ${newOrg.name} has been onboarded.`);
  };

  const closeAddTenant = () => { setShowAddTenant(false); setAddStep(1); setInviteSent(false); };

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

  const contact = selectedOrg ? (orgContacts[selectedOrg.id] || { admin: 'Unknown', email: '—', stripeId: null }) : null;
  const users = selectedOrg ? (orgUsers[selectedOrg.id] || [{ name: contact?.admin || 'Admin', email: contact?.email || '—', role: 'Admin', status: 'Active', lastActive: 'Today' }]) : [];
  const workspaces = selectedOrg ? (orgWorkspaces[selectedOrg.id] || [{ name: 'Default Workspace', members: selectedOrg.users, documents: selectedOrg.documents, created: selectedOrg.created, status: 'Active' }]) : [];
  const firmProfile = selectedOrg ? (firmProfiles[selectedOrg.id] || null) : null;
  const limits = selectedOrg ? planLimits[selectedOrg.plan] : null;

  const filteredOrgUsers = users.filter((u) =>
    !orgUserSearch || u.name.toLowerCase().includes(orgUserSearch.toLowerCase()) || u.email.toLowerCase().includes(orgUserSearch.toLowerCase())
  );

  const UsageBar = ({ label, used, limit }) => {
    const isUnlimited = limit >= 99999;
    const pct = isUnlimited ? 25 : Math.min((used / limit) * 100, 100);
    const color = pct > 80 ? '#991B1B' : pct > 50 ? '#92400E' : '#166534';
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
        <StatCard icon={AlertTriangle} value={suspendedOrgs} label="Suspended" />
        <StatCard icon={DollarSign} value={`$${totalMRR.toLocaleString()}`} label="MRR" accentColor="var(--gold)" />
      </div>

      {/* Filters + Export */}
      <div className="flex items-center gap-4">
        <input type="text" placeholder="Search organisations..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={inputStyle}>
          <option>All</option><option>Free</option><option>Professional</option><option>Team</option><option>Enterprise</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
          <option>All</option><option>Active</option><option>Suspended</option>
        </select>
        <button onClick={handleExportCSV} disabled={filtered.length === 0} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap" style={{ border: '1px solid var(--border)', color: filtered.length === 0 ? '#94A3B8' : 'var(--slate)', backgroundColor: 'white', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', opacity: filtered.length === 0 ? 0.6 : 1 }}>
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
            <td className="px-4 py-3"><Badge variant={t.status}>{t.status}</Badge></td>
            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{t.created}</td>
            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="View" onClick={() => openOrgDetail(t)}><Eye size={16} style={{ color: 'var(--slate)' }} /></button>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Edit" onClick={(e) => openEditOrg(t, e)}><Edit3 size={16} style={{ color: 'var(--text-primary)' }} /></button>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title={t.status === 'Active' ? 'Suspend' : 'Reactivate'} onClick={() => toggleStatus(t.id)}>
                  {t.status === 'Active' ? <Ban size={16} style={{ color: '#991B1B' }} /> : <CheckCircle size={16} style={{ color: '#166534' }} />}
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
            <button onClick={handleSaveEdit} disabled={!editForm.name.trim() || editForm.name === editingOrg?.name} className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5" style={{ backgroundColor: (!editForm.name.trim() || editForm.name === editingOrg?.name) ? '#94A3B8' : 'var(--navy)', cursor: (!editForm.name.trim() || editForm.name === editingOrg?.name) ? 'not-allowed' : 'pointer' }}>
              <Save size={14} /> Save Name
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'var(--border)' }} />

          {/* Suspend / Reactivate Section */}
          <div className="p-4 rounded-lg" style={{ border: `1px solid ${editingOrg?.status === 'Active' ? '#FEE2E2' : '#DCFCE7'}`, backgroundColor: editingOrg?.status === 'Active' ? '#FEF2F2' : '#F0FDF4' }}>
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: editingOrg?.status === 'Active' ? '#991B1B' : '#166534' }}>
              {editingOrg?.status === 'Active' ? 'Suspend Organisation' : 'Reactivate Organisation'}
            </div>
            <p className="text-xs mb-3" style={{ color: editingOrg?.status === 'Active' ? '#991B1B' : '#166534' }}>
              {editingOrg?.status === 'Active'
                ? 'Suspending this organisation will immediately block all user access. No users from this organisation will be able to log in, access documents, or run workflows until the organisation is reactivated.'
                : 'Reactivating this organisation will restore access for all users. They will be able to log in and resume using the platform immediately.'}
            </p>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: editingOrg?.status === 'Active' ? '#991B1B' : '#166534' }} />
              <span className="text-xs font-medium" style={{ color: editingOrg?.status === 'Active' ? '#991B1B' : '#166534' }}>
                {editingOrg?.status === 'Active' ? `This will affect ${editingOrg?.users || 0} user(s)` : 'All users will regain access'}
              </span>
            </div>
            <button onClick={handleSuspendFromModal} className="mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5" style={{ backgroundColor: editingOrg?.status === 'Active' ? '#991B1B' : '#166534' }}>
              {editingOrg?.status === 'Active' ? <><Ban size={14} /> Suspend &amp; Block Access</> : <><CheckCircle size={14} /> Reactivate &amp; Restore Access</>}
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
                          <button
                            onClick={() => openPlanOverride(selectedOrg)}
                            className="flex items-center gap-1 rounded-lg font-medium"
                            style={{ height: 28, padding: '0 10px', fontSize: '12px', border: '1px solid var(--border)', color: 'var(--navy)', backgroundColor: 'white' }}
                          >
                            <Pencil size={12} /> Change Plan
                          </button>
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
                  {/* Firm Profile */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                    <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Firm Profile</div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Primary State', firmProfile?.primaryState || 'Not set'],
                        ['Federal Practice', firmProfile ? (firmProfile.federalPractice ? 'Yes' : 'No') : 'Not set'],
                        ['Firm Size', firmProfile?.firmSize || 'Not set'],
                        ['Additional States', firmProfile ? (firmProfile.additionalStates.length > 0 ? firmProfile.additionalStates.join(', ') : 'None') : 'Not set'],
                      ].map(([l, v]) => (
                        <div key={l} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)' }}>
                          <div className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{l}</div>
                          <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Practice Areas</div>
                      {firmProfile && firmProfile.practiceAreas.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {firmProfile.practiceAreas.map((area) => (
                            <span key={area} style={{ backgroundColor: '#F3F4F6', color: '#374151', fontSize: 11, borderRadius: 20, padding: '2px 10px', display: 'inline-block' }}>{area}</span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Not set</div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg" style={{ border: `1px solid ${selectedOrg.status === 'Active' ? '#FEE2E2' : '#DCFCE7'}`, backgroundColor: selectedOrg.status === 'Active' ? '#FEF2F2' : '#F0FDF4' }}>
                    <div className="text-xs font-semibold uppercase mb-1" style={{ color: selectedOrg.status === 'Active' ? '#991B1B' : '#166534' }}>
                      {selectedOrg.status === 'Active' ? 'Danger Zone' : 'Reactivate'}
                    </div>
                    <p className="text-xs mb-3" style={{ color: selectedOrg.status === 'Active' ? '#991B1B' : '#166534' }}>
                      {selectedOrg.status === 'Active'
                        ? `Suspending will block all ${selectedOrg.users} user(s) from accessing the platform.`
                        : 'Reactivating will restore access for all users in this organisation.'}
                    </p>
                    <button onClick={() => { const newStatus = selectedOrg.status === 'Active' ? 'Suspended' : 'Active'; toggleStatus(selectedOrg.id); setSelectedOrg({...selectedOrg, status: newStatus}); showToast(newStatus === 'Suspended' ? `${selectedOrg.name} suspended. All user access blocked.` : `${selectedOrg.name} reactivated. User access restored.`); }} className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5" style={{ backgroundColor: selectedOrg.status === 'Active' ? '#991B1B' : '#166534' }}>
                      {selectedOrg.status === 'Active' ? <><Ban size={14} /> Suspend &amp; Block Access</> : <><CheckCircle size={14} /> Reactivate &amp; Restore Access</>}
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
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={roleColors[u.role] || { bg: '#F3F4F6', color: '#374151' }}>{u.role}</span>
                              {u.onboardingRole && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>{u.onboardingRole}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={u.status === 'Active' ? { backgroundColor: '#DCFCE7', color: '#166534' } : u.status === 'Invited' ? { backgroundColor: '#FEF3C7', color: '#92400E' } : { backgroundColor: '#FEE2E2', color: '#991B1B' }}>{u.status}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              {u.status !== 'Invited' && (
                                <button className="p-1 rounded hover:bg-gray-100" title={u.status === 'Active' ? 'Block' : 'Unblock'}>
                                  {u.status === 'Active' ? <Lock size={14} style={{ color: '#991B1B' }} /> : <Unlock size={14} style={{ color: '#166534' }} />}
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
                          <td className="px-3 py-2.5"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>{w.status}</span></td>
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
                  Onboard a new organisation. The admin will receive an email invitation to set up their account.
                </p>
              )}
              {/* Step indicator */}
              {!inviteSent && (
                <div className="flex items-center gap-2 mt-4">
                  {[
                    { num: 1, label: 'Organisation' },
                    { num: 2, label: 'Admin User' },
                    { num: 3, label: 'Review & Invite' },
                  ].map(({ num, label }, i) => (
                    <React.Fragment key={num}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold" style={{
                          backgroundColor: addStep > num ? '#DCFCE7' : addStep === num ? 'var(--navy)' : 'var(--ice)',
                          color: addStep > num ? '#166534' : addStep === num ? 'white' : 'var(--text-muted)',
                        }}>
                          {addStep > num ? '✓' : num}
                        </div>
                        <span style={{ fontSize: '12px', color: addStep >= num ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: addStep === num ? 500 : 400 }}>{label}</span>
                      </div>
                      {i < 2 && <div className="flex-1 h-px" style={{ backgroundColor: addStep > num ? '#DCFCE7' : 'var(--border)' }} />}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1" style={{ padding: '24px 28px' }}>
              {/* Step 1: Organisation Details */}
              {addStep === 1 && !inviteSent && (
                <div className="space-y-5">
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#EFF6FF', borderLeft: '3px solid #3B82F6' }}>
                    <Info size={15} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '12px', color: '#1E3A5F' }}>Each tenant is an independent organisation with its own workspaces, users, documents, and billing.</p>
                  </div>

                  <div>
                    <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Organisation Name *</label>
                    <input type="text" value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} placeholder="e.g. Hartwell & Associates" style={{ ...inputStyle, width: '100%' }} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Subscription Plan</label>
                      <select value={newOrg.plan} onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })} style={{ ...inputStyle, width: '100%' }}>
                        <option>Free</option>
                        <option>Professional</option>
                        <option>Team</option>
                        <option>Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Industry</label>
                      <select value={newOrg.industry} onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })} style={{ ...inputStyle, width: '100%' }}>
                        <option>Legal Services</option>
                        <option>Corporate Legal</option>
                        <option>Compliance & Risk</option>
                        <option>Financial Services</option>
                        <option>Healthcare</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Plan summary */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                    <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Plan Includes</div>
                    <div className="grid grid-cols-2 gap-2">
                      {newOrg.plan === 'Free' && ['1 user', '50 docs/mo', '10 workflow runs', '1 knowledge pack'].map((f) => <div key={f} className="text-xs" style={{ color: 'var(--text-secondary)' }}>• {f}</div>)}
                      {newOrg.plan === 'Professional' && ['Up to 3 users', '500 docs/mo', '100 workflow runs', '5 knowledge packs'].map((f) => <div key={f} className="text-xs" style={{ color: 'var(--text-secondary)' }}>• {f}</div>)}
                      {newOrg.plan === 'Team' && ['Up to 10 users', '2,000 docs/mo', '500 workflow runs', '20 knowledge packs'].map((f) => <div key={f} className="text-xs" style={{ color: 'var(--text-secondary)' }}>• {f}</div>)}
                      {newOrg.plan === 'Enterprise' && ['Unlimited users', 'Unlimited docs', 'Unlimited workflows', 'Unlimited knowledge packs'].map((f) => <div key={f} className="text-xs" style={{ color: 'var(--text-secondary)' }}>• {f}</div>)}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Admin User */}
              {addStep === 2 && !inviteSent && (
                <div className="space-y-5">
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#EFF6FF', borderLeft: '3px solid #3B82F6' }}>
                    <Info size={15} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '12px', color: '#1E3A5F' }}>This person will be the Organisation Admin — they can invite other users, create workspaces, and manage billing. They'll receive an email with a link to set their password and access the portal.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>First Name *</label>
                      <input type="text" value={newAdmin.firstName} onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })} placeholder="Ryan" style={{ ...inputStyle, width: '100%' }} />
                    </div>
                    <div>
                      <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Last Name *</label>
                      <input type="text" value={newAdmin.lastName} onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })} placeholder="Melade" style={{ ...inputStyle, width: '100%' }} />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Email Address *</label>
                    <input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} placeholder="ryan@hartwell.com" style={{ ...inputStyle, width: '100%' }} />
                    {newAdmin.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdmin.email) && (
                      <p className="mt-1" style={{ fontSize: '11px', color: '#EF4444' }}>Please enter a valid email address.</p>
                    )}
                    {(!newAdmin.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdmin.email)) && (
                      <p className="mt-1" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>The invitation email will be sent to this address.</p>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Phone Number (optional)</label>
                    <input type="tel" value={newAdmin.phone} onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })} placeholder="+1 (555) 000-0000" style={{ ...inputStyle, width: '100%' }} />
                  </div>

                  <div className="p-4 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                    <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>What happens next?</div>
                    <div className="space-y-2">
                      {[
                        'Admin receives an email with a secure invitation link',
                        'They click the link to set their password',
                        'They log into the Org Admin portal at app.yourai.com',
                        'They can start creating workspaces and inviting team members',
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

              {/* Step 3: Review & Invite */}
              {addStep === 3 && !inviteSent && (
                <div className="space-y-5">
                  <div className="p-5 rounded-xl" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--ice-warm)' }}>
                    <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Organisation</div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Name</span><div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{newOrg.name || '—'}</div></div>
                      <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Plan</span><div className="mt-0.5"><Badge variant={newOrg.plan}>{newOrg.plan}</Badge></div></div>
                      <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Industry</span><div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{newOrg.industry}</div></div>
                      <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>MRR</span><div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>${newOrg.plan === 'Free' ? '0' : newOrg.plan === 'Professional' ? '149' : newOrg.plan === 'Team' ? '299' : '599'}/user</div></div>
                    </div>
                    <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 0 12px' }} />
                    <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Admin User</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Name</span><div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{newAdmin.firstName} {newAdmin.lastName}</div></div>
                      <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Role</span><div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Organisation Admin</div></div>
                      <div className="col-span-2"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Email</span><div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{newAdmin.email || '—'}</div></div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#FFFBEB', borderLeft: '3px solid #F59E0B' }}>
                    <AlertTriangle size={15} style={{ color: '#92400E', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: '12px', color: '#92400E', fontWeight: 500 }}>Confirm before sending</p>
                      <p style={{ fontSize: '12px', color: '#92400E', marginTop: 2 }}>An invitation email will be sent to <strong>{newAdmin.email}</strong>. The admin will have full access to create workspaces, invite users, and manage their organisation.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success state */}
              {inviteSent && (
                <div className="text-center py-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DCFCE7' }}>
                      <CheckCircle size={32} style={{ color: '#166534' }} />
                    </div>
                  </div>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '20px', color: 'var(--text-primary)' }}>Tenant Created Successfully</h2>
                  <p className="mt-2 mx-auto" style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 320 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{newOrg.name}</strong> has been added to the platform. An invitation has been sent to <strong style={{ color: 'var(--text-primary)' }}>{newAdmin.email}</strong>.
                  </p>

                  <div className="mt-6 p-4 rounded-lg text-left" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--ice-warm)' }}>
                    <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Invitation Details</div>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Organisation</span><span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{newOrg.name}</span></div>
                      <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Plan</span><span className="text-xs"><Badge variant={newOrg.plan}>{newOrg.plan}</Badge></span></div>
                      <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin</span><span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{newAdmin.firstName} {newAdmin.lastName}</span></div>
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
              <div className="sticky bottom-0 bg-white flex items-center justify-between" style={{ padding: '16px 28px', borderTop: '1px solid var(--border)' }}>
                <div>
                  {addStep > 1 && (
                    <button onClick={() => setAddStep(addStep - 1)} style={{ fontSize: '13px', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}>← Back</button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={closeAddTenant} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
                  {(() => {
                    if (addStep < 3) {
                      const step1Invalid = addStep === 1 && !newOrg.name.trim();
                      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdmin.email);
                      const step2Invalid = addStep === 2 && (!newAdmin.firstName.trim() || !newAdmin.lastName.trim() || !emailValid);
                      const isStepDisabled = step1Invalid || step2Invalid;
                      return (
                        <button
                          onClick={() => setAddStep(addStep + 1)}
                          disabled={isStepDisabled}
                          className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5"
                          style={{ backgroundColor: isStepDisabled ? '#94A3B8' : 'var(--navy)', cursor: isStepDisabled ? 'not-allowed' : 'pointer' }}
                        >
                          Continue <ChevronRight size={14} />
                        </button>
                      );
                    }
                    return (
                      <button onClick={handleCreateTenant} className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5" style={{ backgroundColor: 'var(--navy)' }}>
                        <Send size={14} /> Send Invitation
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Plan Override Modal ═══ */}
      {overrideOrg && (
        <>
          <div onClick={() => setOverrideOrg(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 520, maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 61 }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)' }}>Change Plan — {overrideOrg.name}</h3>
              <button onClick={() => setOverrideOrg(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Current Plan */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Current Plan</div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {overrideOrg.plan} · ${subscriptionPlans.find(p => p.name === overrideOrg.plan)?.price || 0}/user/month
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Seats: {overrideOrg.users} users · ${overrideOrg.mrr.toLocaleString()}/month total
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Active since: {overrideOrg.billedSince || overrideOrg.created} · Next renewal: {overrideOrg.nextRenewal || '—'}
                </div>
              </div>
              {/* Plan Cards */}
              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Select New Plan</label>
                <div className="grid grid-cols-2 gap-3">
                  {subscriptionPlans.map((p) => {
                    const isCurrent = p.name === overrideOrg.plan;
                    const isSelected = p.name === overrideSelectedPlan;
                    return (
                      <div key={p.id} onClick={() => !isCurrent && setOverrideSelectedPlan(p.name)} className="rounded-lg p-4 transition-all" style={{ border: isSelected ? '2px solid var(--navy)' : '1px solid var(--border)', backgroundColor: isCurrent ? '#F9FAFB' : isSelected ? '#EFF6FF' : 'white', cursor: isCurrent ? 'not-allowed' : 'pointer', opacity: isCurrent ? 0.7 : 1, borderLeft: `3px solid ${p.colour}`, position: 'relative' }}>
                        {isCurrent && <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontSize: '10px' }}>Current</span>}
                        {isSelected && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--navy)' }}><Check size={12} color="white" /></span>}
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '15px', color: 'var(--navy)' }}>{p.name}</div>
                        <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{p.price === 0 ? 'Free' : `$${p.price}/user/mo`}</div>
                        <div className="mt-2 space-y-0.5">
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>• {p.docsPerMonth === null ? 'Unlimited' : p.docsPerMonth.toLocaleString()} docs/mo</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>• {p.workflowRuns === null ? 'Unlimited' : p.workflowRuns} workflows/mo</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>• {p.aiModels}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const curIdx = PLAN_ORDER.indexOf(overrideOrg.plan);
                  const selIdx = overrideSelectedPlan ? PLAN_ORDER.indexOf(overrideSelectedPlan) : -1;
                  if (selIdx >= 0 && selIdx < curIdx) return (
                    <div className="flex items-start gap-2.5 p-3 mt-3 rounded-lg" style={{ backgroundColor: '#FFFBEB', borderLeft: '3px solid #F59E0B' }}>
                      <AlertTriangle size={15} style={{ color: '#92400E', flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs" style={{ color: '#92400E' }}>Downgrading takes effect at next billing cycle ({overrideOrg.nextRenewal || 'May 1, 2026'}). Current features remain active until then.</p>
                    </div>
                  );
                  if (selIdx >= 0 && selIdx > curIdx) return (
                    <div className="flex items-start gap-2.5 p-3 mt-3 rounded-lg" style={{ backgroundColor: '#F0FDF4', borderLeft: '3px solid #166534' }}>
                      <CheckCircle size={15} style={{ color: '#166534', flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs" style={{ color: '#166534' }}>Upgrading takes effect immediately. The org will be charged a prorated amount.</p>
                    </div>
                  );
                  return null;
                })()}
              </div>
              {/* Reason */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Reason for manual plan change *</label>
                <select value={overrideReason} onChange={(e) => { setOverrideReason(e.target.value); setOverrideError(''); }} style={{ ...inputStyle, width: '100%', height: 40, cursor: 'pointer', appearance: 'auto' }}>
                  <option value="">Select a reason...</option>
                  {OVERRIDE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {overrideReason === 'Other' && (
                  <div className="mt-2">
                    <input type="text" value={overrideCustomReason} onChange={(e) => { setOverrideCustomReason(e.target.value); setOverrideError(''); }} placeholder="Describe the reason..." style={{ ...inputStyle, width: '100%' }} />
                    {overrideError && <p className="text-xs mt-1" style={{ color: '#991B1B' }}>{overrideError}</p>}
                  </div>
                )}
              </div>
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Internal notes</label>
                <textarea rows={3} value={overrideNotes} onChange={(e) => setOverrideNotes(e.target.value)} placeholder="Add any notes visible only to Super Admins..." style={{ ...inputStyle, width: '100%', height: 'auto', padding: '10px 12px', resize: 'none' }} />
              </div>
              {/* Effective */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>When should this take effect?</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ value: 'immediately', label: 'Immediately', desc: 'Takes effect now' }, { value: 'next_cycle', label: 'Next billing cycle', desc: overrideOrg.nextRenewal || 'May 1, 2026' }].map((opt) => (
                    <div key={opt.value} onClick={() => setOverrideEffective(opt.value)} className="rounded-lg p-3 cursor-pointer transition-all" style={{ border: overrideEffective === opt.value ? '2px solid var(--navy)' : '1px solid var(--border)', backgroundColor: overrideEffective === opt.value ? '#EFF6FF' : 'white' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ border: `2px solid ${overrideEffective === opt.value ? 'var(--navy)' : 'var(--border)'}` }}>
                          {overrideEffective === opt.value && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--navy)' }} />}
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
                      </div>
                      <p className="text-xs mt-1 ml-6" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setOverrideOrg(null)} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}>Cancel</button>
              <button onClick={handleApplyPlanChange} disabled={!overrideSelectedPlan || !overrideReason} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: (!overrideSelectedPlan || !overrideReason) ? '#94A3B8' : 'var(--navy)', cursor: (!overrideSelectedPlan || !overrideReason) ? 'not-allowed' : 'pointer' }}>
                Apply Plan Change
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
