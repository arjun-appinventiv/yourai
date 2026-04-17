import React, { useState, useMemo } from 'react';
import { Shield, AlertTriangle, Search, Download, Eye, Filter, Clock, CheckCircle, Users, Activity } from 'lucide-react';
import { auditLog as initialAuditLog } from '../../data/mockData';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Table from '../../components/Table';
import Modal from '../../components/Modal';

const extendedAuditLog = [
  ...initialAuditLog,
  { id: 5, operator: 'Arjun P', action: 'Updated billing plan', target: 'Chen Partners LLC', time: 'Mar 29, 2026 16:45', severity: 'Info' },
  { id: 6, operator: 'Dev Team', action: 'Modified platform settings', target: 'Session timeout changed to 480min', time: 'Mar 28, 2026 10:30', severity: 'Warning' },
  { id: 7, operator: 'Arjun P', action: 'Exported user data', target: 'Morrison Legal Group', time: 'Mar 27, 2026 14:20', severity: 'Info' },
  { id: 8, operator: 'System', action: 'Failed login attempt (5x)', target: 'david@thorntoncomp.com', time: 'Mar 26, 2026 22:15', severity: 'Critical' },
  { id: 9, operator: 'System', action: 'Auto-locked account', target: 'David Thornton', time: 'Mar 26, 2026 22:16', severity: 'Warning' },
  { id: 10, operator: 'Arjun P', action: 'Reset user password', target: 'amy@thorntoncomp.com', time: 'Mar 25, 2026 09:00', severity: 'Info' },
  { id: 11, operator: 'Dev Team', action: 'Deployed platform update', target: 'v2.4.1', time: 'Mar 24, 2026 03:00', severity: 'Info' },
  { id: 12, operator: 'System', action: 'SSL certificate renewed', target: 'yourai.com', time: 'Mar 23, 2026 00:01', severity: 'Info' },
];

const enrichedLog = extendedAuditLog.map((e) => ({
  ...e,
  severity: e.severity || (e.action.includes('Impersonated') ? 'Warning' : e.action.includes('Suspended') ? 'Warning' : 'Info'),
  category: e.action.includes('Impersonated') ? 'Access' :
    e.action.includes('Uploaded') || e.action.includes('Exported') ? 'Data' :
    e.action.includes('Suspended') || e.action.includes('locked') || e.action.includes('password') ? 'Security' :
    e.action.includes('notification') || e.action.includes('broadcast') ? 'Communication' :
    e.action.includes('billing') || e.action.includes('plan') ? 'Billing' :
    e.action.includes('login') || e.action.includes('Login') ? 'Security' :
    e.action.includes('settings') || e.action.includes('Deployed') || e.action.includes('SSL') ? 'System' : 'General',
}));

const severityColors = {
  Info: { bg: '#F0F3F6', color: '#1E3A8A' },
  Warning: { bg: '#FBEED5', color: '#E8A33D' },
  Critical: { bg: '#F9E7E7', color: '#C65454' },
};

const categoryColors = {
  Access: { bg: '#E7F3E9', color: '#5CA868' },
  Data: { bg: '#F0F3F6', color: '#1E3A8A' },
  Security: { bg: '#F9E7E7', color: '#C65454' },
  Communication: { bg: '#FBEED5', color: '#E8A33D' },
  Billing: { bg: '#F0F3F6', color: '#6B7885' },
  System: { bg: '#F3F4F6', color: '#6B7885' },
  General: { bg: '#F3F4F6', color: '#6B7885' },
};

export default function ComplianceAudit() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedEntry, setSelectedEntry] = useState(null);

  const filtered = useMemo(() => {
    return enrichedLog.filter((e) => {
      if (search && !e.action.toLowerCase().includes(search.toLowerCase()) && !e.target.toLowerCase().includes(search.toLowerCase()) && !e.operator.toLowerCase().includes(search.toLowerCase())) return false;
      if (severityFilter !== 'All' && e.severity !== severityFilter) return false;
      if (categoryFilter !== 'All' && e.category !== categoryFilter) return false;
      return true;
    });
  }, [search, severityFilter, categoryFilter]);

  const totalEntries = enrichedLog.length;
  const criticalCount = enrichedLog.filter((e) => e.severity === 'Critical').length;
  const warningCount = enrichedLog.filter((e) => e.severity === 'Warning').length;
  const operatorCount = new Set(enrichedLog.map((e) => e.operator)).size;

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
      <PageHeader icon={Shield} title="Compliance & Audit" subtitle="Audit logs, security events, and governance oversight" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Activity} value={totalEntries} label="Total Log Entries" />
        <StatCard icon={AlertTriangle} value={criticalCount} label="Critical Events" accentColor="#C65454" />
        <StatCard icon={Shield} value={warningCount} label="Warnings" accentColor="#E8A33D" />
        <StatCard icon={Users} value={operatorCount} label="Unique Operators" />
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', borderLeft: '4px solid var(--navy-light)' }}>
        <Shield size={20} style={{ color: 'var(--navy-light)', flexShrink: 0, marginTop: 2 }} />
        <p className="text-sm" style={{ color: 'var(--slate)' }}>
          All operator actions are recorded with timestamps, session IDs, and IP addresses. Audit logs are retained for 365 days per compliance policy. Critical events trigger real-time alerts.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by action, target, or operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={inputStyle}>
          <option>All</option>
          <option>Info</option>
          <option>Warning</option>
          <option>Critical</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={inputStyle}>
          <option>All</option>
          <option>Access</option>
          <option>Data</option>
          <option>Security</option>
          <option>Communication</option>
          <option>Billing</option>
          <option>System</option>
        </select>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2" style={{ backgroundColor: 'var(--navy)' }}>
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Table */}
      <Table columns={['Timestamp', 'Operator', 'Action', 'Target', 'Category', 'Severity', '']}>
        {filtered.map((e) => (
          <tr
            key={e.id}
            className="transition-colors"
            style={{ borderBottom: '1px solid var(--border)' }}
            onMouseEnter={(ev) => (ev.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
            onMouseLeave={(ev) => (ev.currentTarget.style.backgroundColor = 'white')}
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{e.time}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{e.operator}</td>
            <td className="px-4 py-3 text-sm">{e.action}</td>
            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{e.target}</td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={categoryColors[e.category]}>
                {e.category}
              </span>
            </td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={severityColors[e.severity]}>
                {e.severity}
              </span>
            </td>
            <td className="px-4 py-3">
              <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Details" onClick={() => setSelectedEntry(e)}>
                <Eye size={16} style={{ color: 'var(--slate)' }} />
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {/* Detail Modal */}
      <Modal open={!!selectedEntry} onClose={() => setSelectedEntry(null)} title="Audit Log Entry">
        {selectedEntry && (
          <div className="space-y-3">
            {[
              ['Timestamp', selectedEntry.time],
              ['Operator', selectedEntry.operator],
              ['Action', selectedEntry.action],
              ['Target', selectedEntry.target],
              ['Category', selectedEntry.category],
              ['Severity', selectedEntry.severity],
              ['Session ID', `ses_${Math.random().toString(36).slice(2, 10)}`],
              ['IP Address', '10.0.1.' + Math.floor(Math.random() * 255)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{value}</span>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedEntry(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
