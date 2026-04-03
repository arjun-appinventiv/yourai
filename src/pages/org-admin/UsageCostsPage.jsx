import React, { useState } from 'react';
import { DollarSign, Clock, Sparkles, Activity, Info, Plus, Download, Eye, Send, CheckCircle, X, FileText, AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useRole } from '../../components/org-admin/RoleContext';
import { timeEntries, orgInvoices, modelUsageStats } from '../../data/mockData';

const activityBadges = {
  contract_review:    { label: 'Contract Review', bg: '#E8ECF4', color: '#0B1D3A' },
  artifact_generation:{ label: 'Report Gen',      bg: '#EDE9FE', color: '#8B5CF6' },
  precedent_research: { label: 'Research',         bg: '#DBEAFE', color: '#3B82F6' },
  document_analysis:  { label: 'Doc Analysis',     bg: '#F1F5F9', color: '#475569' },
  compliance_check:   { label: 'Compliance',       bg: '#DCFCE7', color: '#166534' },
  manual:             { label: 'Manual',           bg: '#F3F4F6', color: '#6B7280' },
  pipeline_execution: { label: 'Workflow',         bg: '#FEF9C3', color: '#92400E' },
};

const invoiceStatusColors = {
  Draft:   { bg: '#F1F5F9', color: '#64748B' },
  Sent:    { bg: '#DBEAFE', color: '#1D4ED8' },
  Paid:    { bg: '#DCFCE7', color: '#166534' },
  Overdue: { bg: '#FEE2E2', color: '#991B1B' },
};

export default function UsageCostsPage() {
  const { role } = useRole();
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [clientFilter, setClientFilter] = useState('All');
  const [billableFilter, setBillableFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

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

  const inputStyle = { border: '1px solid var(--border)', borderRadius: '8px', height: 36, padding: '0 12px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'var(--text-primary)', outline: 'none' };

  // Filtered time entries
  const filteredEntries = timeEntries.filter((te) => {
    if (clientFilter !== 'All' && te.clientName !== clientFilter) return false;
    if (billableFilter === 'Billable' && !te.billable) return false;
    if (billableFilter === 'Non-billable' && te.billable) return false;
    return true;
  });

  const totalBillableMin = timeEntries.filter((t) => t.billable).reduce((s, t) => s + t.billedMinutes, 0);
  const totalBillableAmt = timeEntries.filter((t) => t.billable).reduce((s, t) => s + t.amount, 0);
  const totalNonBillableMin = timeEntries.filter((t) => !t.billable).reduce((s, t) => s + t.billedMinutes, 0);

  const clientNames = [...new Set(timeEntries.map((t) => t.clientName))];

  const maxDailyCost = Math.max(...modelUsageStats.dailyTrend.map((d) => d.cost));

  return (
    <div>
      <PageHeader
        icon={DollarSign}
        title="Usage & Costs"
        subtitle="AI activity tracking, billable time, and invoices."
      />

      {role === 'Manager' && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg mb-6"
          style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', fontSize: '13px', color: '#92400E' }}
        >
          <AlertTriangle size={14} />
          Showing data for your workspaces only.
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)' }} className="flex gap-0 mb-6">
        <button style={tabStyle('overview')} onClick={() => setActiveTab('overview')}>Overview</button>
        <button style={tabStyle('time')} onClick={() => setActiveTab('time')}>Time Entries</button>
        <button style={tabStyle('invoices')} onClick={() => setActiveTab('invoices')}>Invoices</button>
      </div>

      {/* ==================== TAB 1: Overview ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={Sparkles} value="128" label="AI Queries" accentColor="var(--navy)" />
            <StatCard icon={Activity} value="48.2K" label="Tokens Used" accentColor="#3B82F6" />
            <StatCard icon={DollarSign} value="$2.43" label="AI Cost" accentColor="var(--gold)" />
            <StatCard icon={Clock} value="502 min" label="Billed Time" accentColor="#166534" />
          </div>

          {/* Two-column layout */}
          <div className="flex gap-6">
            {/* LEFT: Model Usage */}
            <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', flex: '0 0 55%' }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 20 }}>
                Model Usage — This Month
              </h3>
              <div className="flex flex-col gap-5">
                {modelUsageStats.byModel.map((m) => (
                  <div key={m.model}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{m.model}</span>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>${m.cost.toFixed(2)}</span>
                    </div>
                    <div style={{ height: 8, backgroundColor: 'var(--ice)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${m.pct}%`, backgroundColor: m.color, borderRadius: 4, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>{m.pct}% of total</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 12, fontSize: '12px', color: 'var(--text-muted)' }}>
                Total this month: <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>${modelUsageStats.totalCostThisMonth.toFixed(2)}</span> across{' '}
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{modelUsageStats.totalQueriesThisMonth}</span> queries
              </div>
            </div>

            {/* RIGHT: Cost by Client */}
            <div className="bg-white rounded-xl p-6 flex-1" style={{ border: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 20 }}>
                Cost by Client
              </h3>
              {/* Donut chart */}
              <div className="flex justify-center mb-6">
                <div style={{
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  background: `conic-gradient(${modelUsageStats.byClient.map((c, i) => {
                    const start = modelUsageStats.byClient.slice(0, i).reduce((s, x) => s + x.pct, 0);
                    return `${c.color} ${start}% ${start + c.pct}%`;
                  }).join(', ')})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)' }}>$2.43</span>
                  </div>
                </div>
              </div>
              {/* Legend */}
              <div className="flex flex-col gap-3">
                {modelUsageStats.byClient.map((c) => (
                  <div key={c.client} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: c.color }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{c.client}</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Cost Trend */}
          <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 20 }}>
              Daily AI Cost — Last 7 Days
            </h3>
            <div className="flex items-end gap-3" style={{ height: 140 }}>
              {modelUsageStats.dailyTrend.map((d) => {
                const isMax = d.cost === maxDailyCost && d.cost > 0;
                const barHeight = d.cost > 0 ? Math.max((d.cost / maxDailyCost) * 120, 4) : 4;
                return (
                  <div key={d.date} className="flex flex-col items-center flex-1 gap-1">
                    <span style={{ fontSize: '11px', fontWeight: 500, color: d.cost > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {d.cost > 0 ? `$${d.cost.toFixed(2)}` : '—'}
                    </span>
                    <div style={{
                      width: '100%',
                      maxWidth: 48,
                      height: barHeight,
                      borderRadius: 4,
                      backgroundColor: d.cost === 0 ? '#E2E8F0' : isMax ? 'var(--gold)' : 'var(--navy)',
                      transition: 'height 0.3s ease',
                    }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>{d.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Budget alert */}
          <div
            className="bg-white rounded-xl p-5 flex items-center justify-between"
            style={{ border: '1px solid var(--border)', borderLeft: '3px solid #F59E0B' }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} style={{ color: '#F59E0B' }} />
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>No budget configured</span>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>Set a monthly AI spend limit to receive alerts when costs approach the threshold.</p>
              </div>
            </div>
            <button
              style={{
                fontSize: '12px',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'white',
                color: 'var(--navy)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Set Budget Limit
            </button>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: Time Entries ==================== */}
      {activeTab === 'time' && (
        <div className="space-y-4">
          {/* Info banner */}
          <div
            className="flex items-start gap-3 p-4 rounded-lg"
            style={{ backgroundColor: '#F0F4FA', borderLeft: '3px solid var(--navy)' }}
          >
            <Info size={16} style={{ color: 'var(--navy)', marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Time entries are auto-generated by YourAI's AI activity tracking. Each AI operation is logged with its actual processing time and mapped to a billable duration based on your firm's billing rules.
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="All">All Clients</option>
                {clientNames.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={billableFilter}
                onChange={(e) => setBillableFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="All">All</option>
                <option value="Billable">Billable</option>
                <option value="Non-billable">Non-billable</option>
              </select>
            </div>
            <button
              className="flex items-center gap-1.5"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'white',
                color: 'var(--navy)',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Add Manual Entry
            </button>
          </div>

          {/* Table */}
          <Table columns={['Date', 'Description', 'Client', 'Activity Type', 'Duration', 'Billed Time', 'Rate', 'Amount', 'Source']}>
            {filteredEntries.map((te) => {
              const badge = activityBadges[te.activityType] || activityBadges.manual;
              return (
                <tr key={te.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{te.date}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', maxWidth: 260 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{te.description}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{te.clientName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: '11px',
                      fontWeight: 500,
                      borderRadius: 20,
                      padding: '2px 10px',
                      backgroundColor: badge.bg,
                      color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {te.durationSeconds != null ? `${te.durationSeconds}s` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>
                    {te.billedMinutes} min
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    ${te.rate}/hr
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: te.billable ? '#166534' : 'var(--text-muted)' }}>
                    {te.billable ? `$${te.amount.toFixed(2)}` : '$0.00'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: 20,
                      backgroundColor: '#F1F5F9',
                      color: '#64748B',
                    }}>
                      {te.agentId || 'Manual'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </Table>

          {/* Totals */}
          <div className="flex items-center gap-6" style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0' }}>
            <span>
              Total billable: <strong style={{ color: 'var(--navy)' }}>{totalBillableMin} min</strong> — <strong style={{ color: '#166534' }}>${totalBillableAmt.toFixed(2)}</strong>
            </span>
            <span>
              Total non-billable: <strong style={{ color: 'var(--text-muted)' }}>{totalNonBillableMin} min</strong>
            </span>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: Invoices ==================== */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Top button */}
          <div className="flex justify-end">
            <button
              className="flex items-center gap-1.5"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--navy)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Generate Invoice
            </button>
          </div>

          <Table columns={['Invoice ID', 'Client', 'Period', 'Total Amount', 'Status', 'Issued', 'Due', 'Actions']}>
            {orgInvoices.map((inv) => {
              const sc = invoiceStatusColors[inv.status] || invoiceStatusColors.Draft;
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 500 }}>{inv.id}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{inv.clientName}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{inv.period}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>${inv.totalAmount.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: '11px',
                      fontWeight: 500,
                      borderRadius: 20,
                      padding: '2px 10px',
                      backgroundColor: sc.bg,
                      color: sc.color,
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{inv.issuedDate}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{inv.dueDate}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: 'var(--text-muted)', cursor: 'pointer', border: 'none', background: 'none' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        title="View"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: 'var(--text-muted)', cursor: 'pointer', border: 'none', background: 'none' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        title="Download"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        </div>
      )}

      {/* ==================== Invoice slide-over ==================== */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ backgroundColor: 'rgba(15,23,42,0.4)' }}
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="bg-white h-full overflow-y-auto"
            style={{ width: 480, boxShadow: '-8px 0 30px rgba(0,0,0,0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)' }}>
                  {selectedInvoice.id}
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: 500,
                  borderRadius: 20,
                  padding: '2px 10px',
                  backgroundColor: (invoiceStatusColors[selectedInvoice.status] || invoiceStatusColors.Draft).bg,
                  color: (invoiceStatusColors[selectedInvoice.status] || invoiceStatusColors.Draft).color,
                }}>
                  {selectedInvoice.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Cover section */}
            <div className="p-6">
              <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>From</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 16 }}>Hartwell & Associates</div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>Invoice</div>
                    <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 500 }}>{selectedInvoice.id}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>Period</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedInvoice.period}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>Issued</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedInvoice.issuedDate}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>Due</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedInvoice.dueDate}</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>Bill To</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{selectedInvoice.clientName}</div>
                </div>
              </div>

              {/* Line items */}
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '14px', color: 'var(--text-primary)', marginBottom: 12 }}>Line Items</h4>
                <table className="w-full" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left" style={{ padding: '8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>Description</th>
                      <th className="text-right" style={{ padding: '8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600, width: 60 }}>Hours</th>
                      <th className="text-right" style={{ padding: '8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600, width: 60 }}>Rate</th>
                      <th className="text-right" style={{ padding: '8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600, width: 80 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.lineItems.map((li, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 0', color: 'var(--text-primary)' }}>{li.description}</td>
                        <td className="text-right" style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>{li.hours}</td>
                        <td className="text-right" style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>${li.rate}</td>
                        <td className="text-right" style={{ padding: '10px 0', fontWeight: 500, color: 'var(--text-primary)' }}>${li.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Subtotal / Total */}
                <div style={{ borderTop: '2px solid var(--border)', marginTop: 4, paddingTop: 12 }}>
                  <div className="flex justify-between" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Subtotal</span>
                    <span>${selectedInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <span>Total</span>
                    <span>${selectedInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* AI disclaimer */}
              <div
                className="rounded-lg p-4 mt-6"
                style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start gap-2">
                  <FileText size={14} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    This invoice was generated by YourAI's AI activity tracking system. Billable time is calculated based on configured billing rules and may differ from actual AI processing duration. Please review all line items before sending to clients.
                  </p>
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  className="flex items-center gap-1.5"
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'white',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} /> Download PDF
                </button>
                {selectedInvoice.status === 'Sent' && (
                  <button
                    onClick={() => {
                      showToast(`Invoice ${selectedInvoice.id} marked as paid`);
                      setSelectedInvoice(null);
                    }}
                    className="flex items-center gap-1.5"
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#166534',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle size={14} /> Mark as Paid
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
