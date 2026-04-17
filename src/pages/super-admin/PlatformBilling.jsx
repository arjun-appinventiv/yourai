import React, { useState } from 'react';
import { DollarSign, Building2, TrendingUp, AlertCircle, Receipt, Mail, Plus, Eye, Download, Edit3, Trash2, CreditCard, Pencil, X, Check, ChevronDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { tenants as initialTenants, subscriptionPlans, auditLog as initialAuditLog } from '../../data/mockData';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

const planColors = { Free: '#6B7885', Professional: '#1E3A8A', Team: '#5CA868', Enterprise: '#E8A33D' };


const transactions = [
  { id: 'TXN-001', org: 'Hartwell & Associates', plan: 'Team', amount: 1495, date: 'Apr 1, 2026', mode: 'Card', status: 'Paid', remarks: 'Monthly recurring' },
  { id: 'TXN-002', org: 'Morrison Legal Group', plan: 'Professional', amount: 447, date: 'Apr 1, 2026', mode: 'Card', status: 'Paid', remarks: 'Monthly recurring' },
  { id: 'TXN-003', org: 'Chen Partners LLC', plan: 'Enterprise', amount: 7188, date: 'Apr 1, 2026', mode: 'Bank', status: 'Paid', remarks: 'Monthly recurring' },
  { id: 'TXN-004', org: 'Rivera & Kim LLP', plan: 'Free', amount: 0, date: 'Apr 1, 2026', mode: '—', status: 'Paid', remarks: 'Free plan' },
  { id: 'TXN-005', org: 'Patel Law Office', plan: 'Professional', amount: 298, date: 'Apr 1, 2026', mode: 'Card', status: 'Paid', remarks: 'Monthly recurring' },
  { id: 'TXN-006', org: 'Thornton Compliance', plan: 'Team', amount: 2392, date: 'Apr 1, 2026', mode: 'Card', status: 'Failed', remarks: 'Card declined — insufficient funds' },
  { id: 'TXN-007', org: 'Goldstein & Webb', plan: 'Free', amount: 0, date: 'Apr 1, 2026', mode: '—', status: 'Paid', remarks: 'Free plan' },
  { id: 'TXN-008', org: 'Pacific Rim Legal', plan: 'Professional', amount: 596, date: 'Apr 1, 2026', mode: 'Card', status: 'Paid', remarks: 'Monthly recurring' },
];

const PLAN_ORDER = ['Free', 'Professional', 'Team', 'Enterprise'];
const OVERRIDE_REASONS = ['Sales agreement', 'Trial extension', 'Support exception', 'Billing adjustment', 'Partner deal', 'Other'];

export default function PlatformBilling() {
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [plans, setPlans] = useState(subscriptionPlans);
  const [tenants, setTenants] = useState(initialTenants);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editPlanForm, setEditPlanForm] = useState({});
  const [txnSearch, setTxnSearch] = useState('');
  const [txnStatus, setTxnStatus] = useState('All');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [overrideOrg, setOverrideOrg] = useState(null);
  const [overrideSelectedPlan, setOverrideSelectedPlan] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideCustomReason, setOverrideCustomReason] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideEffective, setOverrideEffective] = useState('immediately');
  const [overrideError, setOverrideError] = useState('');
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const showToast = useToast();

  const totalMRR = tenants.reduce((s, t) => s + t.mrr, 0);
  const activeOrgs = tenants.filter((t) => t.status === 'Active').length;
  const avgValue = activeOrgs > 0 ? Math.round(totalMRR / activeOrgs) : 0;
  const failedCount = tenants.filter((t) => t.paymentStatus === 'Failed').length;
  const planCounts = tenants.reduce((acc, t) => { acc[t.plan] = (acc[t.plan] || 0) + 1; return acc; }, {});

  const filteredTxns = transactions.filter((t) => {
    if (txnSearch && !t.org.toLowerCase().includes(txnSearch.toLowerCase())) return false;
    if (txnStatus !== 'All' && t.status !== txnStatus) return false;
    return true;
  });

  const handleExportTxnCSV = () => {
    const header = 'Transaction ID,Organisation,Plan,Amount,Date,Mode,Status';
    const rows = transactions.map((t) => `${t.id},"${t.org}",${t.plan},${t.amount},"${t.date}",${t.mode},${t.status}`);
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'transactions_export.csv';
    a.click();
    showToast('Transactions CSV exported');
  };

  const openEditPlan = (plan) => {
    setEditPlanForm({
      name: plan.name,
      price: plan.price,
      docsPerMonth: plan.docsPerMonth,
      workflowRuns: plan.workflowRuns,
      knowledgePacks: plan.knowledgePacks,
      storage: plan.storage,
      aiModels: plan.aiModels,
      auditLog: plan.auditLog,
      sso: plan.sso,
      clientPortal: plan.clientPortal,
      secureMessaging: plan.secureMessaging,
      hipaa: plan.hipaa,
      api: plan.api,
      whiteLabel: plan.whiteLabel,
      privateVPC: plan.privateVPC,
      support: plan.support,
      badge: plan.badge || '',
    });
    setEditingPlan(plan);
  };

  const handleSaveEditPlan = () => {
    setPlans((prev) => prev.map((p) => p.id === editingPlan.id ? { ...p, ...editPlanForm } : p));
    setEditingPlan(null);
    showToast(`${editPlanForm.name} plan updated successfully`);
  };

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
    const newMrr = (planData?.price || 0) * overrideOrg.users;
    const oldPlan = overrideOrg.plan;
    setTenants((prev) => prev.map((t) => t.id === overrideOrg.id ? { ...t, plan: newPlan, mrr: newMrr, planPrice: planData?.price || 0 } : t));
    // Add audit log entry
    setAuditLog((prev) => [
      { id: prev.length + 1, operator: 'Arjun P', action: `Changed plan ${oldPlan} → ${newPlan}`, target: overrideOrg.name, time: 'Just now' },
      ...prev,
    ]);
    showToast(`Plan updated to ${newPlan} for ${overrideOrg.name}`);
    setOverrideOrg(null);
  };

  const inputStyle = { border: '1px solid var(--border)', borderRadius: '8px', height: 36, padding: '0 12px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'var(--text-primary)', outline: 'none' };

  const tabStyle = (tab) => ({
    padding: '10px 0',
    marginRight: '28px',
    fontSize: '13px',
    fontWeight: activeTab === tab ? 500 : 400,
    color: activeTab === tab ? 'var(--navy)' : 'var(--text-muted)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${activeTab === tab ? 'var(--navy)' : 'transparent'}`,
  });

  const currentPlanIdx = overrideOrg ? PLAN_ORDER.indexOf(overrideOrg.plan) : -1;
  const selectedPlanIdx = overrideSelectedPlan ? PLAN_ORDER.indexOf(overrideSelectedPlan) : -1;
  const isDowngrade = selectedPlanIdx >= 0 && selectedPlanIdx < currentPlanIdx;
  const isUpgrade = selectedPlanIdx >= 0 && selectedPlanIdx > currentPlanIdx;

  return (
    <div className="space-y-6">
      <PageHeader icon={CreditCard} title="Billing & Subscriptions" subtitle="Monitor revenue, manage plans, and track payment activity" />
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={DollarSign} value={`$${totalMRR.toLocaleString()}`} label="Total MRR" accentColor="var(--gold)" />
        <StatCard icon={Building2} value={activeOrgs} label="Active Orgs" />
        <StatCard icon={TrendingUp} value={`$${avgValue.toLocaleString()}/org`} label="Avg Plan Value" />
        <StatCard icon={AlertCircle} value={failedCount} label="Failed Payments" accentColor="#C65454" />
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)' }} className="flex gap-0">
        <button onClick={() => setActiveTab('subscriptions')} style={tabStyle('subscriptions')}>Subscriptions</button>
        <button onClick={() => setActiveTab('plans')} style={tabStyle('plans')}>Plans</button>
        <button onClick={() => setActiveTab('transactions')} style={tabStyle('transactions')}>Transactions</button>
      </div>

      {/* ═══ Subscriptions Tab ═══ */}
      {activeTab === 'subscriptions' && (
        <>
          <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 className="mb-5" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>Plan Distribution</h2>
            <div className="space-y-3">
              {PLAN_ORDER.map((plan) => {
                const count = planCounts[plan] || 0;
                const pct = Math.round((count / tenants.length) * 100);
                return (
                  <div key={plan} className="flex items-center gap-4">
                    <span className="text-sm w-28 font-medium" style={{ color: 'var(--text-primary)' }}>{plan}</span>
                    <div className="flex-1 h-7 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ice)' }}>
                      <div className="h-full rounded-full flex items-center px-3" style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: planColors[plan] }}>
                        <span className="text-xs font-semibold text-white">{count}</span>
                      </div>
                    </div>
                    <span className="text-sm w-12 text-right" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          <Table columns={['Organisation', 'Plan', 'Users', 'MRR', 'Next Renewal', 'Payment Status', 'Actions']}>
            {tenants.map((t) => (
                <tr key={t.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</td>
                  <td className="px-4 py-3"><Badge variant={t.plan}>{t.plan}</Badge></td>
                  <td className="px-4 py-3 text-sm">{t.users}</td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.mrr > 0 ? `$${t.mrr.toLocaleString()}/mo` : '$0'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{t.nextRenewal}</td>
                  <td className="px-4 py-3"><Badge variant={t.paymentStatus}>{t.paymentStatus}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openPlanOverride(t)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Change Plan"><Pencil size={15} style={{ color: 'var(--slate)' }} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-gray-100" title="View Invoice"><Receipt size={16} style={{ color: 'var(--slate)' }} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-gray-100" title="Contact Admin"><Mail size={16} style={{ color: 'var(--slate)' }} /></button>
                    </div>
                  </td>
                </tr>
            ))}
          </Table>
        </>
      )}

      {/* ═══ Plans Tab ═══ */}
      {activeTab === 'plans' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowPlanModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2" style={{ backgroundColor: 'var(--navy)' }}>
              <Plus size={16} /> Add New Plan
            </button>
          </div>
          <Table columns={['Plan', 'Price/User', 'Docs/mo', 'Workflows/mo', 'Packs', 'AI Models', 'Audit', 'Status', 'Actions']}>
            {plans.map((p) => (
              <tr key={p.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.colour }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                    {p.badge && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: p.colour + '18', color: p.colour, fontWeight: 500, fontSize: '10px' }}>{p.badge}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{p.price === 0 ? '$0' : `$${p.price}/user`}</td>
                <td className="px-4 py-3 text-sm">{p.docsPerMonth === null ? 'Unlimited' : p.docsPerMonth.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">{p.workflowRuns === null ? 'Unlimited' : p.workflowRuns}</td>
                <td className="px-4 py-3 text-sm" style={{ maxWidth: 120, fontSize: '12px' }}>{p.knowledgePacks}</td>
                <td className="px-4 py-3 text-sm" style={{ maxWidth: 140, fontSize: '12px' }}>{p.aiModels}</td>
                <td className="px-4 py-3 text-sm" style={{ fontSize: '12px' }}>{p.auditLog}</td>
                <td className="px-4 py-3"><Badge variant={p.status}>{p.status}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditPlan(p)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Edit"><Edit3 size={16} style={{ color: 'var(--slate)' }} /></button>
                    <button className="p-1.5 rounded-lg hover:bg-red-50" title="Delete"><Trash2 size={16} style={{ color: '#C65454' }} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>

          {/* Add Plan Modal */}
          <Modal open={showPlanModal} onClose={() => setShowPlanModal(false)} title="Add New Plan">
            <div className="space-y-4">
              {[['Plan Name', 'text', 'e.g. Starter'], ['Price Per User ($)', 'number', '0'], ['Max Docs/mo', 'number', '500'], ['Max Workflow Runs', 'number', '100'], ['Knowledge Packs', 'text', 'e.g. 5 packs'], ['Storage', 'text', 'e.g. 10GB'], ['AI Models', 'text', 'e.g. All 3 providers'], ['Audit Log', 'text', 'e.g. 30-day']].map(([label, type, ph]) => (
                <div key={label}>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{label}</label>
                  <input type={type} placeholder={ph} style={{ ...inputStyle, width: '100%' }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {['SSO / SAML', 'Client Portal', 'Secure Messaging', 'HIPAA BAA', 'API Access', 'White Label', 'Private AWS VPC'].map((label) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" style={{ accentColor: 'var(--navy)', width: 16, height: 16 }} />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  </label>
                ))}
              </div>
              {[['Support Level', 'text', 'e.g. Priority support'], ['Plan Badge', 'text', 'e.g. Most Popular (optional)']].map(([label, type, ph]) => (
                <div key={label}>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{label}</label>
                  <input type={type} placeholder={ph} style={{ ...inputStyle, width: '100%' }} />
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>Cancel</button>
                <button onClick={() => { setShowPlanModal(false); showToast('Plan created successfully'); }} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--navy)' }}>Save Plan</button>
              </div>
            </div>
          </Modal>

          {/* Edit Plan Modal */}
          <Modal open={!!editingPlan} onClose={() => setEditingPlan(null)} title={`Edit ${editingPlan?.name || ''} Plan`}>
            {editingPlan && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Plan Name</label>
                    <input type="text" value={editPlanForm.name} onChange={(e) => setEditPlanForm({ ...editPlanForm, name: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Price/User ($)</label>
                    <input type="number" value={editPlanForm.price} onChange={(e) => setEditPlanForm({ ...editPlanForm, price: Number(e.target.value) })} style={{ ...inputStyle, width: '100%' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Docs/month</label>
                    <input type="number" value={editPlanForm.docsPerMonth ?? ''} onChange={(e) => setEditPlanForm({ ...editPlanForm, docsPerMonth: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" style={{ ...inputStyle, width: '100%' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Workflow Runs/month</label>
                    <input type="number" value={editPlanForm.workflowRuns ?? ''} onChange={(e) => setEditPlanForm({ ...editPlanForm, workflowRuns: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" style={{ ...inputStyle, width: '100%' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Knowledge Packs</label>
                    <input type="text" value={editPlanForm.knowledgePacks} onChange={(e) => setEditPlanForm({ ...editPlanForm, knowledgePacks: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Storage</label>
                    <input type="text" value={editPlanForm.storage} onChange={(e) => setEditPlanForm({ ...editPlanForm, storage: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>AI Models</label>
                  <input type="text" value={editPlanForm.aiModels} onChange={(e) => setEditPlanForm({ ...editPlanForm, aiModels: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Audit Log</label>
                  <input type="text" value={editPlanForm.auditLog} onChange={(e) => setEditPlanForm({ ...editPlanForm, auditLog: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Feature Toggles</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[['SSO / SAML', 'sso'], ['Client Portal', 'clientPortal'], ['Secure Messaging', 'secureMessaging'], ['HIPAA BAA', 'hipaa'], ['API Access', 'api'], ['White Label', 'whiteLabel'], ['Private AWS VPC', 'privateVPC']].map(([label, key]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!editPlanForm[key]} onChange={(e) => setEditPlanForm({ ...editPlanForm, [key]: e.target.checked })} style={{ accentColor: 'var(--navy)', width: 16, height: 16 }} />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Support Level</label>
                    <input type="text" value={editPlanForm.support} onChange={(e) => setEditPlanForm({ ...editPlanForm, support: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Plan Badge</label>
                    <input type="text" value={editPlanForm.badge || ''} onChange={(e) => setEditPlanForm({ ...editPlanForm, badge: e.target.value })} placeholder="e.g. Most Popular" style={{ ...inputStyle, width: '100%' }} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setEditingPlan(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>Cancel</button>
                  <button onClick={handleSaveEditPlan} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--navy)' }}>Save Changes</button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}

      {/* ═══ Transactions Tab ═══ */}
      {activeTab === 'transactions' && (
        <>
          <div className="flex items-center gap-4">
            <input type="text" placeholder="Search by organisation..." value={txnSearch} onChange={(e) => setTxnSearch(e.target.value)} className="flex-1" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
            <input type="date" style={inputStyle} />
            <input type="date" style={inputStyle} />
            <select value={txnStatus} onChange={(e) => setTxnStatus(e.target.value)} style={inputStyle}>
              <option>All</option><option>Paid</option><option>Pending</option><option>Failed</option>
            </select>
            <button onClick={handleExportTxnCSV} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap" style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}>
              <Download size={16} /> Export CSV
            </button>
          </div>
          <Table columns={['Transaction ID', 'Organisation', 'Plan', 'Amount', 'Date', 'Mode', 'Status', 'Actions']}>
            {filteredTxns.map((t) => (
              <tr key={t.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{t.id}</td>
                <td className="px-4 py-3 text-sm">{t.org}</td>
                <td className="px-4 py-3"><Badge variant={t.plan}>{t.plan}</Badge></td>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>${t.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{t.date}</td>
                <td className="px-4 py-3 text-sm">{t.mode}</td>
                <td className="px-4 py-3"><Badge variant={t.status}>{t.status}</Badge></td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelectedTxn(t)} className="p-1.5 rounded-lg hover:bg-gray-100" title="View Detail"><Eye size={16} style={{ color: 'var(--slate)' }} /></button>
                </td>
              </tr>
            ))}
          </Table>
          <Modal open={!!selectedTxn} onClose={() => setSelectedTxn(null)} title="Transaction Detail">
            {selectedTxn && (
              <div className="space-y-3">
                {[['Transaction ID', selectedTxn.id], ['Organisation', selectedTxn.org], ['Date', selectedTxn.date], ['Amount', `$${selectedTxn.amount.toLocaleString()}`], ['Payment Mode', selectedTxn.mode], ['Status', selectedTxn.status], ['Remarks', selectedTxn.remarks]].map(([l, v]) => (
                  <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{l}</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{v}</span>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <button onClick={() => setSelectedTxn(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>Close</button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}

      {/* ═══ Plan Override Modal ═══ */}
      {overrideOrg && (
        <>
          <div onClick={() => setOverrideOrg(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 520, maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 61, padding: 0 }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)' }}>Change Plan — {overrideOrg.name}</h3>
              <button onClick={() => setOverrideOrg(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Section 1: Current Plan */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Current Plan</div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {overrideOrg.plan} · ${subscriptionPlans.find(p => p.name === overrideOrg.plan)?.price || 0}/user/month
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Seats: {overrideOrg.users} users · ${overrideOrg.mrr.toLocaleString()}/month total
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Active since: {overrideOrg.billedSince || overrideOrg.created} · Next renewal: {billingMeta[overrideOrg.id]?.nextRenewal || '—'}
                </div>
              </div>

              {/* Section 2: Plan Cards */}
              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Select New Plan</label>
                <div className="grid grid-cols-2 gap-3">
                  {subscriptionPlans.map((p) => {
                    const isCurrent = p.name === overrideOrg.plan;
                    const isSelected = p.name === overrideSelectedPlan;
                    return (
                      <div
                        key={p.id}
                        onClick={() => !isCurrent && setOverrideSelectedPlan(p.name)}
                        className="rounded-lg p-4 transition-all"
                        style={{
                          border: isSelected ? `2px solid var(--navy)` : '1px solid var(--border)',
                          backgroundColor: isCurrent ? '#F8F4ED' : isSelected ? '#F0F3F6' : 'white',
                          cursor: isCurrent ? 'not-allowed' : 'pointer',
                          opacity: isCurrent ? 0.7 : 1,
                          borderLeft: `3px solid ${p.colour}`,
                          position: 'relative',
                        }}
                      >
                        {isCurrent && (
                          <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF', fontSize: '10px' }}>Current</span>
                        )}
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--navy)' }}>
                            <Check size={12} color="white" />
                          </span>
                        )}
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '15px', color: 'var(--navy)' }}>{p.name}</div>
                        <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                          {p.price === 0 ? 'Free' : `$${p.price}/user/mo`}
                        </div>
                        <div className="mt-2 space-y-0.5">
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>• {p.docsPerMonth === null ? 'Unlimited' : p.docsPerMonth.toLocaleString()} docs/mo</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>• {p.workflowRuns === null ? 'Unlimited' : p.workflowRuns} workflows/mo</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>• {p.aiModels}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Upgrade/Downgrade callouts */}
                {isDowngrade && (
                  <div className="flex items-start gap-2.5 p-3 mt-3 rounded-lg" style={{ backgroundColor: '#FBEED5', borderLeft: '3px solid #E8A33D' }}>
                    <AlertTriangle size={15} style={{ color: '#E8A33D', flexShrink: 0, marginTop: 1 }} />
                    <p className="text-xs" style={{ color: '#E8A33D' }}>
                      Downgrading takes effect at next billing cycle ({overrideOrg.nextRenewal || 'May 1, 2026'}). Current features remain active until then.
                    </p>
                  </div>
                )}
                {isUpgrade && (
                  <div className="flex items-start gap-2.5 p-3 mt-3 rounded-lg" style={{ backgroundColor: '#E7F3E9', borderLeft: '3px solid #5CA868' }}>
                    <CheckCircle size={15} style={{ color: '#5CA868', flexShrink: 0, marginTop: 1 }} />
                    <p className="text-xs" style={{ color: '#5CA868' }}>
                      Upgrading takes effect immediately. The org will be charged a prorated amount.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 3: Override Reason */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Reason for manual plan change *</label>
                <select value={overrideReason} onChange={(e) => { setOverrideReason(e.target.value); setOverrideError(''); }} style={{ ...inputStyle, width: '100%', height: 40, cursor: 'pointer', appearance: 'auto' }}>
                  <option value="">Select a reason...</option>
                  {OVERRIDE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {overrideReason === 'Other' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={overrideCustomReason}
                      onChange={(e) => { setOverrideCustomReason(e.target.value); setOverrideError(''); }}
                      placeholder="Describe the reason..."
                      style={{ ...inputStyle, width: '100%' }}
                    />
                    {overrideError && <p className="text-xs mt-1" style={{ color: '#C65454' }}>{overrideError}</p>}
                  </div>
                )}
              </div>

              {/* Section 4: Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Internal notes</label>
                <textarea
                  rows={3}
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="Add any notes visible only to Super Admins..."
                  style={{ ...inputStyle, width: '100%', height: 'auto', padding: '10px 12px', resize: 'none' }}
                />
              </div>

              {/* Section 5: Effective Date */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>When should this take effect?</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'immediately', label: 'Immediately', desc: 'Takes effect now' },
                    { value: 'next_cycle', label: 'Next billing cycle', desc: overrideOrg.nextRenewal || 'May 1, 2026' },
                  ].map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => setOverrideEffective(opt.value)}
                      className="rounded-lg p-3 cursor-pointer transition-all"
                      style={{
                        border: overrideEffective === opt.value ? '2px solid var(--navy)' : '1px solid var(--border)',
                        backgroundColor: overrideEffective === opt.value ? '#F0F3F6' : 'white',
                      }}
                    >
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

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setOverrideOrg(null)} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}>Cancel</button>
              <button
                onClick={handleApplyPlanChange}
                disabled={!overrideSelectedPlan || !overrideReason}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{
                  backgroundColor: (!overrideSelectedPlan || !overrideReason) ? '#9CA3AF' : 'var(--navy)',
                  cursor: (!overrideSelectedPlan || !overrideReason) ? 'not-allowed' : 'pointer',
                }}
              >
                Apply Plan Change
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
