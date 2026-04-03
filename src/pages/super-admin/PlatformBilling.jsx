import React, { useState } from 'react';
import { DollarSign, Building2, TrendingUp, AlertCircle, Receipt, Mail, Plus, Eye, Download, Edit3, Trash2, CreditCard } from 'lucide-react';
import { tenants } from '../../data/mockData';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

const planColors = { Free: '#94A3B8', Professional: '#3B82F6', Team: '#22C55E', Enterprise: '#C9A84C' };
const renewalDates = { 1: 'May 12, 2026', 2: 'May 28, 2026', 3: 'May 3, 2026', 4: '—', 5: 'May 20, 2026', 6: 'Apr 1, 2026', 7: '—', 8: 'Apr 22, 2026' };
const paymentStatuses = { 1: 'Paid', 2: 'Paid', 3: 'Paid', 4: 'Paid', 5: 'Paid', 6: 'Failed', 7: 'Paid', 8: 'Pending' };

const initialPlans = [
  { id: 1, name: 'Free', price: 0, maxUsers: 1, maxDocs: 50, maxWorkflows: 10, status: 'Active' },
  { id: 2, name: 'Professional', price: 149, maxUsers: -1, maxDocs: 500, maxWorkflows: 100, status: 'Active' },
  { id: 3, name: 'Team', price: 299, maxUsers: -1, maxDocs: 2000, maxWorkflows: 500, status: 'Active' },
  { id: 4, name: 'Enterprise', price: 599, maxUsers: -1, maxDocs: -1, maxWorkflows: -1, status: 'Active' },
];

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

export default function PlatformBilling() {
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [plans, setPlans] = useState(initialPlans);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [txnSearch, setTxnSearch] = useState('');
  const [txnStatus, setTxnStatus] = useState('All');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const showToast = useToast();

  const totalMRR = tenants.reduce((s, t) => s + t.mrr, 0);
  const activeOrgs = tenants.filter((t) => t.status === 'Active').length;
  const avgValue = Math.round(totalMRR / activeOrgs);
  const failedCount = Object.values(paymentStatuses).filter((s) => s === 'Failed').length;
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
        <StatCard icon={AlertCircle} value={failedCount} label="Failed Payments" accentColor="#991B1B" />
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)' }} className="flex gap-0">
        <button onClick={() => setActiveTab('subscriptions')} style={tabStyle('subscriptions')}>Subscriptions</button>
        <button onClick={() => setActiveTab('plans')} style={tabStyle('plans')}>Plans</button>
        <button onClick={() => setActiveTab('transactions')} style={tabStyle('transactions')}>Transactions</button>
      </div>

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <>
          <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 className="mb-5" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>Plan Distribution</h2>
            <div className="space-y-3">
              {['Free', 'Professional', 'Team', 'Enterprise'].map((plan) => {
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
                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>${t.mrr.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{renewalDates[t.id]}</td>
                <td className="px-4 py-3"><Badge variant={paymentStatuses[t.id]}>{paymentStatuses[t.id]}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-gray-100" title="View Invoice"><Receipt size={16} style={{ color: 'var(--slate)' }} /></button>
                    <button className="p-1.5 rounded-lg hover:bg-gray-100" title="Contact Admin"><Mail size={16} style={{ color: 'var(--slate)' }} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowPlanModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2" style={{ backgroundColor: 'var(--navy)' }}>
              <Plus size={16} /> Add New Plan
            </button>
          </div>
          <Table columns={['Plan Name', 'Price/User', 'Max Users', 'Max Docs/mo', 'Max Workflows', 'Status', 'Actions']}>
            {plans.map((p) => (
              <tr key={p.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                <td className="px-4 py-3 text-sm">{p.price === 0 ? '$0' : `$${p.price}/user`}</td>
                <td className="px-4 py-3 text-sm">{p.maxUsers === -1 ? 'Unlimited' : p.maxUsers}</td>
                <td className="px-4 py-3 text-sm">{p.maxDocs === -1 ? 'Unlimited' : p.maxDocs}</td>
                <td className="px-4 py-3 text-sm">{p.maxWorkflows === -1 ? 'Unlimited' : p.maxWorkflows}</td>
                <td className="px-4 py-3"><Badge variant={p.status}>{p.status}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-gray-100" title="Edit"><Edit3 size={16} style={{ color: 'var(--slate)' }} /></button>
                    <button className="p-1.5 rounded-lg hover:bg-red-50" title="Delete"><Trash2 size={16} style={{ color: '#991B1B' }} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <Modal open={showPlanModal} onClose={() => setShowPlanModal(false)} title="Add New Plan">
            <div className="space-y-4">
              {[['Plan Name', 'text', 'e.g. Starter'], ['Price Per User ($)', 'number', '0'], ['Max Workspaces', 'number', '5'], ['Max Docs/mo', 'number', '500'], ['Max Workflow Runs', 'number', '100'], ['Max Knowledge Packs', 'number', '5']].map(([label, type, ph]) => (
                <div key={label}>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{label}</label>
                  <input type={type} placeholder={ph} style={{ ...inputStyle, width: '100%' }} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Features</label>
                <textarea rows={3} placeholder="One feature per line..." style={{ ...inputStyle, width: '100%', resize: 'none' }} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>Cancel</button>
                <button onClick={() => { setShowPlanModal(false); showToast('Plan created successfully'); }} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--navy)' }}>Save Plan</button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* Transactions Tab */}
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
    </div>
  );
}
