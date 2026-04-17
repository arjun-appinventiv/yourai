import React, { useState, useMemo } from 'react';
import { Shield, Search } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import { activityFeed } from '../../data/mockData';
import { useRole } from '../../components/org-admin/RoleContext';

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: '8px', height: 36,
  padding: '0 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none',
};

export default function AuditLogsPage() {
  const { role } = useRole();
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('All');

  const users = ['All', ...new Set(activityFeed.map((a) => a.user))];

  // Manager sees limited logs (no system/admin actions)
  const baseLogs = role === 'Manager'
    ? activityFeed.filter((a) => a.user !== 'System' && !a.action.includes('invited'))
    : activityFeed;

  const filtered = useMemo(() => {
    return baseLogs.filter((log) => {
      if (search && !log.action.toLowerCase().includes(search.toLowerCase()) && !log.user.toLowerCase().includes(search.toLowerCase())) return false;
      if (userFilter !== 'All' && log.user !== userFilter) return false;
      return true;
    });
  }, [baseLogs, search, userFilter]);

  return (
    <div>
      <PageHeader icon={Shield} title="Audit Logs" subtitle={role === 'Manager' ? 'Limited view — some actions are restricted.' : 'Complete audit trail of all actions in your organization.'} />

      {role === 'Manager' && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg mb-6"
          style={{ backgroundColor: '#FBEED5', border: '1px solid #FBEED5', fontSize: '13px', color: '#E8A33D' }}
        >
          <Shield size={14} />
          You are viewing a limited audit log. Some administrative actions are hidden.
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative" style={{ width: 260 }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32, width: '100%' }}
          />
        </div>
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={{ ...inputStyle, width: 160, cursor: 'pointer', backgroundColor: 'white' }}>
          {users.map((u) => <option key={u}>{u}</option>)}
        </select>
      </div>

      <Table columns={['User', 'Action', 'Workspace', 'Time']}>
        {filtered.map((log) => (
          <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '12px 16px' }}>
              <div className="flex items-center gap-2">
                <div
                  className="rounded-full flex items-center justify-center text-white"
                  style={{
                    width: 28, height: 28,
                    backgroundColor: log.user === 'System' ? '#1E3A8A' : 'var(--navy)',
                    fontSize: '10px', fontWeight: 600,
                  }}
                >
                  {log.user === 'System' ? 'SY' : log.user.split(' ').map((n) => n[0]).join('')}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{log.user}</span>
              </div>
            </td>
            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{log.action}</td>
            <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{log.workspace || '--'}</td>
            <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{log.time}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
