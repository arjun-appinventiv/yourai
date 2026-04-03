import React, { useState } from 'react';
import { FileBarChart, Download, Calendar, Filter, TrendingUp, DollarSign, Users, FileText, Eye } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Table from '../../components/Table';
import { useToast } from '../../components/Toast';

const savedReports = [
  { id: 1, name: 'Monthly Platform Summary — March 2026', type: 'Platform', generated: 'Apr 1, 2026', generatedBy: 'Auto', format: 'PDF', size: '2.4 MB' },
  { id: 2, name: 'Revenue Breakdown Q1 2026', type: 'Financial', generated: 'Apr 1, 2026', generatedBy: 'Arjun P', format: 'XLSX', size: '1.1 MB' },
  { id: 3, name: 'User Activity Report — March 2026', type: 'Usage', generated: 'Apr 1, 2026', generatedBy: 'Auto', format: 'PDF', size: '3.8 MB' },
  { id: 4, name: 'AI Usage & Cost Analysis — March 2026', type: 'AI', generated: 'Mar 31, 2026', generatedBy: 'Auto', format: 'PDF', size: '1.6 MB' },
  { id: 5, name: 'Compliance Audit Summary Q1 2026', type: 'Compliance', generated: 'Mar 31, 2026', generatedBy: 'Arjun P', format: 'PDF', size: '4.2 MB' },
  { id: 6, name: 'Tenant Growth Report — March 2026', type: 'Platform', generated: 'Mar 30, 2026', generatedBy: 'Auto', format: 'PDF', size: '0.9 MB' },
  { id: 7, name: 'Document Processing Stats — March 2026', type: 'Usage', generated: 'Mar 30, 2026', generatedBy: 'Auto', format: 'XLSX', size: '0.5 MB' },
  { id: 8, name: 'Integration Health Report — March 2026', type: 'Platform', generated: 'Mar 29, 2026', generatedBy: 'Auto', format: 'PDF', size: '1.2 MB' },
];

const scheduledReports = [
  { id: 1, name: 'Monthly Platform Summary', frequency: 'Monthly (1st)', nextRun: 'May 1, 2026', enabled: true },
  { id: 2, name: 'User Activity Report', frequency: 'Monthly (1st)', nextRun: 'May 1, 2026', enabled: true },
  { id: 3, name: 'AI Usage & Cost Analysis', frequency: 'Monthly (last day)', nextRun: 'Apr 30, 2026', enabled: true },
  { id: 4, name: 'Weekly Usage Digest', frequency: 'Weekly (Monday)', nextRun: 'Apr 7, 2026', enabled: true },
  { id: 5, name: 'Tenant Growth Report', frequency: 'Monthly (last day)', nextRun: 'Apr 30, 2026', enabled: false },
];

const typeColors = {
  Platform: { bg: '#EFF6FF', color: '#1D4ED8' },
  Financial: { bg: '#F0FDF4', color: '#166534' },
  Usage: { bg: '#FEF9C3', color: '#92400E' },
  AI: { bg: '#FEE2E2', color: '#991B1B' },
  Compliance: { bg: '#F1F5F9', color: '#64748B' },
};

const formatColors = {
  PDF: { bg: '#FEE2E2', color: '#991B1B' },
  XLSX: { bg: '#DCFCE7', color: '#166534' },
};

export default function ReportsAnalytics() {
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const showToast = useToast();

  const filtered = savedReports.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'All' && r.type !== typeFilter) return false;
    return true;
  });

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
      <PageHeader icon={FileBarChart} title="Reports & Analytics" subtitle="Generate, schedule, and download platform reports" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={FileBarChart} value={savedReports.length} label="Generated Reports" />
        <StatCard icon={Calendar} value={scheduledReports.filter((r) => r.enabled).length} label="Scheduled Reports" />
        <StatCard icon={TrendingUp} value="Apr 1" label="Last Generated" accentColor="var(--gold)" />
        <StatCard icon={Download} value="15.7 MB" label="Total Report Size" />
      </div>

      {/* Quick Generate */}
      <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
          Generate Report
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: TrendingUp, label: 'Platform Summary', desc: 'Full platform overview' },
            { icon: DollarSign, label: 'Revenue Report', desc: 'Billing & subscription data' },
            { icon: Users, label: 'User Activity', desc: 'Login, usage, engagement' },
            { icon: FileText, label: 'Compliance Report', desc: 'Audit logs & governance' },
          ].map(({ icon: Icon, label, desc }) => (
            <button
              key={label}
              onClick={() => showToast(`Generating "${label}"... Report will appear in the list shortly.`)}
              className="p-4 rounded-xl text-left transition-all hover:shadow-md"
              style={{ border: '1px solid var(--border)', backgroundColor: 'white' }}
            >
              <Icon size={24} style={{ color: 'var(--text-primary)' }} className="mb-2" />
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Saved Reports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
            Generated Reports
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, width: 240 }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}>
              <option>All</option>
              <option>Platform</option>
              <option>Financial</option>
              <option>Usage</option>
              <option>AI</option>
              <option>Compliance</option>
            </select>
          </div>
        </div>
        <Table columns={['Report Name', 'Type', 'Format', 'Size', 'Generated', 'By', 'Actions']}>
          {filtered.map((r) => (
            <tr
              key={r.id}
              className="transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileBarChart size={16} style={{ color: 'var(--slate)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={typeColors[r.type]}>
                  {r.type}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={formatColors[r.format]}>
                  {r.format}
                </span>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{r.size}</td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{r.generated}</td>
              <td className="px-4 py-3 text-sm">{r.generatedBy}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Preview">
                    <Eye size={16} style={{ color: 'var(--slate)' }} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Download"
                    onClick={() => showToast(`Downloading "${r.name}"...`)}
                  >
                    <Download size={16} style={{ color: 'var(--text-primary)' }} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      {/* Scheduled Reports */}
      <div>
        <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
          Scheduled Reports
        </h2>
        <Table columns={['Report', 'Frequency', 'Next Run', 'Status', '']}>
          {scheduledReports.map((r) => (
            <tr
              key={r.id}
              className="transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{r.frequency}</td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{r.nextRun}</td>
              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={r.enabled ? { backgroundColor: '#DCFCE7', color: '#166534' } : { backgroundColor: '#F3F4F6', color: '#374151' }}
                >
                  {r.enabled ? 'Active' : 'Paused'}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Run Now"
                  onClick={() => showToast(`Running "${r.name}" now...`)}
                >
                  <TrendingUp size={16} style={{ color: 'var(--text-primary)' }} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
