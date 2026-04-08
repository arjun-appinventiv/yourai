import React, { useState } from 'react';
import { BarChart3, Users, FileText, MessageSquare, Clock, TrendingUp, Zap, Activity } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Table from '../../components/Table';

const dailyUsage = [
  { day: 'Mon', queries: 142, docs: 38, users: 24 },
  { day: 'Tue', queries: 186, docs: 45, users: 28 },
  { day: 'Wed', queries: 210, docs: 52, users: 31 },
  { day: 'Thu', queries: 178, docs: 41, users: 26 },
  { day: 'Fri', queries: 195, docs: 48, users: 29 },
  { day: 'Sat', queries: 45, docs: 8, users: 6 },
  { day: 'Sun', queries: 32, docs: 5, users: 4 },
];

const topOrgs = [
  { name: 'Chen Partners LLC', queries: 1240, docs: 340, avgSession: '42 min', aiUsage: 89 },
  { name: 'Thornton Compliance', queries: 890, docs: 210, avgSession: '38 min', aiUsage: 76 },
  { name: 'Morrison Legal Group', queries: 620, docs: 128, avgSession: '31 min', aiUsage: 68 },
  { name: 'Pacific Rim Legal', queries: 485, docs: 95, avgSession: '28 min', aiUsage: 62 },
  { name: 'Patel Law Office', queries: 340, docs: 67, avgSession: '25 min', aiUsage: 55 },
  { name: 'Hartwell & Associates', queries: 280, docs: 46, avgSession: '22 min', aiUsage: 48 },
  { name: 'Rivera & Kim LLP', queries: 95, docs: 12, avgSession: '15 min', aiUsage: 30 },
  { name: 'Goldstein & Webb', queries: 42, docs: 8, avgSession: '12 min', aiUsage: 18 },
];

const orgStates = {
  'Chen Partners LLC': 'Illinois',
  'Thornton Compliance': 'Georgia',
  'Morrison Legal Group': 'California',
  'Pacific Rim Legal': 'Washington',
  'Patel Law Office': 'Florida',
  'Hartwell & Associates': 'New York',
  'Rivera & Kim LLP': 'Texas',
  'Goldstein & Webb': 'Massachusetts',
};

const aiModels = [
  { model: 'GPT-4o', calls: 2840, tokens: '4.2M', cost: '$126.50', pct: 58 },
  { model: 'Claude 3.5 Sonnet', calls: 1420, tokens: '2.1M', cost: '$63.00', pct: 29 },
  { model: 'GPT-4o-mini', calls: 640, tokens: '890K', cost: '$8.90', pct: 13 },
];

const maxQueries = Math.max(...dailyUsage.map((d) => d.queries));

export default function UsageAnalytics() {
  const [period, setPeriod] = useState('7d');

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
      <PageHeader icon={BarChart3} title="Usage & Analytics" subtitle="Platform activity, AI usage, and organisation metrics" />

      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
          Platform Overview
        </h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={inputStyle}>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} value="3,992" label="Total AI Queries" accentColor="var(--gold)" />
        <StatCard icon={Users} value="36" label="Active Users" />
        <StatCard icon={FileText} value="946" label="Documents Processed" />
        <StatCard icon={Clock} value="28 min" label="Avg Session Duration" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Daily queries bar chart */}
        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Daily AI Queries</h3>
          <div className="flex items-end gap-3 h-40">
            {dailyUsage.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{d.queries}</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${(d.queries / maxQueries) * 120}px`,
                    backgroundColor: d.day === 'Wed' ? 'var(--gold)' : 'var(--navy)',
                    opacity: d.day === 'Sat' || d.day === 'Sun' ? 0.4 : 1,
                  }}
                />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Model usage */}
        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>AI Model Distribution</h3>
          <div className="space-y-4">
            {aiModels.map((m) => (
              <div key={m.model}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.model}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.calls} calls — {m.tokens} tokens — {m.cost}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ice)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${m.pct}%`,
                      backgroundColor: m.model.includes('GPT-4o-mini') ? '#94A3B8' : m.model.includes('Claude') ? 'var(--gold)' : 'var(--navy)',
                    }}
                  />
                </div>
                <div className="text-right mt-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top orgs by usage */}
      <div>
        <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
          Organisation Usage Rankings
        </h2>
        <Table columns={['Organisation', 'State', 'AI Queries', 'Documents', 'Avg Session', 'AI Adoption', '']}>
          {topOrgs.map((o, i) => (
            <tr
              key={o.name}
              className="transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: i < 3 ? 'var(--gold)' : 'var(--ice)', color: i < 3 ? 'white' : 'var(--slate)' }}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{o.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{orgStates[o.name] || '—'}</td>
              <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{o.queries.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm">{o.docs}</td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{o.avgSession}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ice)' }}>
                    <div className="h-full rounded-full" style={{ width: `${o.aiUsage}%`, backgroundColor: o.aiUsage > 70 ? '#166534' : o.aiUsage > 40 ? 'var(--gold)' : '#94A3B8' }} />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.aiUsage}%</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Details">
                  <TrendingUp size={16} style={{ color: 'var(--slate)' }} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
