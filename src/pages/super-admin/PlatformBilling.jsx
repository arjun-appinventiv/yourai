import React, { useState } from 'react';
import { DollarSign, Building2, TrendingUp, AlertCircle, FileText, Mail, Plus, Eye, Download, Trash2, CreditCard, Pencil, X, ChevronDown, AlertTriangle, Info, Clock, RotateCcw } from 'lucide-react';
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
  // Refund modal state. The transactions list itself is the const above;
  // a refund append-onlys to txnList (state) so the action shows up
  // immediately in the table.
  const [txnList, setTxnList] = useState(transactions);
  const [refundTxn, setRefundTxn] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  // Per-tenant override history viewer.
  const [historyTenant, setHistoryTenant] = useState(null);
  // Invoice viewer (Subscriptions row → FileText button).
  const [invoiceTenant, setInvoiceTenant] = useState(null);
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const showToast = useToast();

  const totalMRR = tenants.reduce((s, t) => s + t.mrr, 0);
  const activeOrgs = tenants.filter((t) => t.status === 'Active').length;
  const avgValue = activeOrgs > 0 ? Math.round(totalMRR / activeOrgs) : 0;
  const failedCount = tenants.filter((t) => t.paymentStatus === 'Failed').length;
  const planCounts = tenants.reduce((acc, t) => { acc[t.plan] = (acc[t.plan] || 0) + 1; return acc; }, {});

  const filteredTxns = txnList.filter((t) => {
    if (txnSearch && !t.org.toLowerCase().includes(txnSearch.toLowerCase())) return false;
    if (txnStatus !== 'All' && t.status !== txnStatus) return false;
    return true;
  });
  const failedTxnCount = txnList.filter((t) => t.status === 'Failed').length;

  const REFUND_REASONS = ['Customer request', 'Duplicate charge', 'Service downtime', 'Disputed charge', 'Goodwill / retention', 'Other'];

  const openRefund = (t) => {
    setRefundTxn(t);
    setRefundReason('');
    setRefundAmount(String(t.amount));
  };
  const handleConfirmRefund = () => {
    if (!refundTxn || !refundReason) return;
    const amt = Math.min(parseFloat(refundAmount) || 0, refundTxn.amount);
    if (amt <= 0) return;
    // Append a Refund row to the txn list — original Paid row is unaffected
    // so the audit trail stays whole.
    const refundRow = {
      id: `REF-${String(Date.now()).slice(-6)}`,
      org: refundTxn.org,
      plan: refundTxn.plan,
      amount: -amt,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      mode: refundTxn.mode,
      status: amt === refundTxn.amount ? 'Refunded' : 'Partial Refund',
      remarks: `Refund of ${refundTxn.id} — ${refundReason}`,
    };
    setTxnList((prev) => [refundRow, ...prev]);
    showToast(`Refunded $${amt.toLocaleString()} on ${refundTxn.id}`);
    setRefundTxn(null);
  };

  // Per-tenant override history — pulled from auditLog when it carries a
  // 'plan_override' entry. Real audit log doesn't yet have these; we
  // synthesise a couple of plausible recent entries below for SAs to see
  // the surface shape, and any override applied this session will be
  // captured by the existing logAuditAction path so it'll show up here
  // too. Until backend, mock the historical entries.
  const overrideHistoryFor = (tenant) => {
    if (!tenant) return [];
    const synthetic = (initialAuditLog || [])
      .filter((e) => e && e.action && e.action.toLowerCase().includes('plan'))
      .filter((e) => !e.target || e.target === tenant.name || e.target === tenant.id)
      .map((e) => ({
        id: e.id,
        date: e.timestamp || e.date || '—',
        by: e.actor || e.user || 'Appinventiv Ops',
        from: e.from || '—',
        to: e.to || e.plan || tenant.plan,
        reason: e.reason || e.notes || 'Migration',
      }));
    // If audit log has nothing for this tenant, show a single seed row
    // so the surface isn't empty in the demo.
    if (synthetic.length === 0) {
      return [{
        id: `OVR-${tenant.id || '000'}-01`,
        date: 'Feb 12, 2026',
        by: 'Appinventiv Ops',
        from: 'Professional',
        to: tenant.plan,
        reason: 'Sales agreement — annual upgrade',
      }];
    }
    return synthetic;
  };

  const contactAdmin = (tenant) => {
    const slug = tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'admin';
    const email = `admin@${slug}.com`;
    const subject = encodeURIComponent(`YourAI — billing for ${tenant.name}`);
    const body = encodeURIComponent(`Hi,\n\nFollowing up on your ${tenant.plan} plan${tenant.paymentStatus === 'Failed' ? ' — we noticed a failed payment on your last invoice.' : '.'}\n\n— Appinventiv Ops`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    showToast(`Opened mail to ${email}`);
  };

  const handleDeletePlan = (plan) => {
    if (!window.confirm(`Delete the "${plan.name}" plan? This cannot be undone.`)) return;
    setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    showToast(`${plan.name} plan deleted`);
  };

  const invoiceForTenant = (tenant) => {
    if (!tenant) return null;
    const latest = txnList.find((tx) => tx.org === tenant.name && tx.amount > 0);
    return latest || {
      id: `INV-${tenant.id}-${String(Date.now()).slice(-4)}`,
      org: tenant.name,
      plan: tenant.plan,
      amount: tenant.mrr,
      date: tenant.nextRenewal || '—',
      mode: '—',
      status: tenant.paymentStatus,
      remarks: tenant.mrr > 0 ? 'Monthly recurring' : 'Free plan',
    };
  };

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
                      <button onClick={() => setHistoryTenant(t)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Override History"><Clock size={15} style={{ color: 'var(--slate)' }} /></button>
                      <button onClick={() => setInvoiceTenant(t)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="View Invoice"><FileText size={15} style={{ color: 'var(--slate)' }} /></button>
                      <button onClick={() => contactAdmin(t)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Contact Admin"><Mail size={15} style={{ color: 'var(--slate)' }} /></button>
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
                    <button onClick={() => openEditPlan(p)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Edit"><Pencil size={15} style={{ color: 'var(--slate)' }} /></button>
                    <button onClick={() => handleDeletePlan(p)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete"><Trash2 size={15} style={{ color: '#C65454' }} /></button>
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
          {/* Failed-payments quick filter — surfaces the count that was
              previously only visible as a small computed text. Click to
              filter the table to Failed-only; click again to clear. */}
          {failedTxnCount > 0 && (
            <button
              onClick={() => setTxnStatus(txnStatus === 'Failed' ? 'All' : 'Failed')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                background: txnStatus === 'Failed' ? '#FBE9E7' : '#fff',
                color: '#9A3412',
                border: `1px solid ${txnStatus === 'Failed' ? '#9A3412' : '#F4B6AC'}`,
                cursor: 'pointer', fontFamily: 'inherit',
                alignSelf: 'flex-start',
              }}
              title={txnStatus === 'Failed' ? 'Click to clear filter' : 'Filter to failed payments only'}
            >
              <AlertTriangle size={14} />
              <span>{failedTxnCount} failed payment{failedTxnCount === 1 ? '' : 's'}</span>
              {txnStatus === 'Failed' && <X size={13} style={{ marginLeft: 4 }} />}
            </button>
          )}
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
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelectedTxn(t)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="View Detail"><Eye size={15} style={{ color: 'var(--slate)' }} /></button>
                    {t.status === 'Paid' && t.amount > 0 && (
                      <button onClick={() => openRefund(t)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Refund"><RotateCcw size={15} style={{ color: 'var(--slate)' }} /></button>
                    )}
                  </div>
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

      {/* ═══ Refund Modal ═══ */}
      <Modal open={!!refundTxn} onClose={() => setRefundTxn(null)} title="Issue refund">
        {refundTxn && (
          <div className="space-y-4">
            <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between mb-1">
                <span style={{ color: 'var(--text-muted)' }}>Transaction</span>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{refundTxn.id}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span style={{ color: 'var(--text-muted)' }}>Organisation</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{refundTxn.org}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Original amount</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>${refundTxn.amount.toLocaleString()}</span>
              </div>
            </div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Refund reason <span style={{ color: '#C65454' }}>*</span>
              <select value={refundReason} onChange={(e) => setRefundReason(e.target.value)} style={{ ...inputStyle, marginTop: 4, width: '100%' }}>
                <option value="">Pick a reason…</option>
                {REFUND_REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </label>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Amount to refund (USD)
              <input
                type="number" min="0" step="0.01" max={refundTxn.amount}
                value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                style={{ ...inputStyle, marginTop: 4, width: '100%' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Maximum: ${refundTxn.amount.toLocaleString()}. Partial refunds are allowed.</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setRefundTxn(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>Cancel</button>
              <button
                onClick={handleConfirmRefund}
                disabled={!refundReason || !refundAmount || parseFloat(refundAmount) <= 0}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: (!refundReason || !refundAmount || parseFloat(refundAmount) <= 0) ? '#cbd5d8' : 'var(--navy)',
                  color: '#fff',
                  cursor: (!refundReason || !refundAmount || parseFloat(refundAmount) <= 0) ? 'not-allowed' : 'pointer',
                }}
              >
                Issue refund
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ Override History Modal ═══ */}
      <Modal open={!!historyTenant} onClose={() => setHistoryTenant(null)} title={historyTenant ? `Plan override history — ${historyTenant.name}` : 'Plan override history'}>
        {historyTenant && (() => {
          const rows = overrideHistoryFor(historyTenant);
          return (
            <div className="space-y-2">
              {rows.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No plan overrides recorded for this tenant.</p>
              ) : (
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: 'var(--ice-warm)', borderBottom: '1px solid var(--border)' }}>
                        {['Date', 'Changed by', 'From', 'To', 'Reason'].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => (
                        <tr key={r.id} style={{ borderBottom: idx === rows.length - 1 ? 'none' : '1px solid var(--border)' }}>
                          <td className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>{r.date}</td>
                          <td className="px-3 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{r.by}</td>
                          <td className="px-3 py-2"><Badge variant={r.from}>{r.from}</Badge></td>
                          <td className="px-3 py-2"><Badge variant={r.to}>{r.to}</Badge></td>
                          <td className="px-3 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button onClick={() => setHistoryTenant(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>Close</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══ Invoice Modal ═══ */}
      <Modal open={!!invoiceTenant} onClose={() => setInvoiceTenant(null)} title={invoiceTenant ? `Latest invoice — ${invoiceTenant.name}` : 'Invoice'}>
        {invoiceTenant && (() => {
          const inv = invoiceForTenant(invoiceTenant);
          return (
            <div className="space-y-3">
              {[
                ['Invoice / Txn ID', inv.id],
                ['Organisation', inv.org],
                ['Plan', inv.plan],
                ['Amount', inv.amount > 0 ? `$${inv.amount.toLocaleString()}` : '$0'],
                ['Date', inv.date],
                ['Payment Mode', inv.mode],
                ['Status', inv.status],
                ['Remarks', inv.remarks],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{l}</span>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{v}</span>
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { showToast('Invoice PDF downloaded'); }} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={() => setInvoiceTenant(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--navy)' }}>Close</button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
