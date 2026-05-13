import React, { useState, useMemo } from 'react';
import {
  Shield, Search, Download, Clock, User, Calendar, ChevronDown, Building2, X,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';

/* ─────────────────────────────────────────────────────────────────────
   Super Admin Compliance & Audit
   Chrome mirrors the org-admin AuditLogsPanel in ChatView.jsx
   (filter bar + white-card table + category pill + CSV export) but
   widened to a multi-tenant view: every row carries a `tenant` field
   and a Tenant filter sits between User and Category. Severity column
   intentionally dropped — Category covers the bucketing need without
   a second axis. Detail modal + stat cards + info banner were the
   prior shape; removed to match the chatview look the user asked for.
   ───────────────────────────────────────────────────────────────────── */

// Each event tagged with a tenant — SA sees activity across every firm.
// Platform-level actions (deploys, SSL renewal, platform settings) are
// labelled "Platform" since they don't belong to any one tenant.
const AUDIT_EVENTS = [
  { id: 1,  operator: 'Arjun P',  action: 'Impersonated Admin',         target: 'Hartwell & Associates',           tenant: 'Hartwell & Associates', time: 'Today 09:14',         category: 'Access' },
  { id: 2,  operator: 'Arjun P',  action: 'Uploaded KB document',       target: 'US Legal Practice Guide 2026.pdf', tenant: 'Hartwell & Associates', time: 'Today 09:22',         category: 'Data' },
  { id: 3,  operator: 'Dev Team', action: 'Suspended org',              target: 'Thornton Compliance',             tenant: 'Thornton Compliance',   time: 'Mar 30, 2026 14:10',  category: 'Security' },
  { id: 4,  operator: 'Arjun P',  action: 'Sent broadcast notification', target: 'All Org Admins',                  tenant: 'Platform',              time: 'Apr 1, 2026 11:00',   category: 'Communication' },
  { id: 5,  operator: 'Arjun P',  action: 'Updated billing plan',       target: 'Chen Partners LLC',               tenant: 'Chen Partners LLC',     time: 'Mar 29, 2026 16:45',  category: 'Billing' },
  { id: 6,  operator: 'Dev Team', action: 'Modified platform settings', target: 'Session timeout changed to 480min', tenant: 'Platform',            time: 'Mar 28, 2026 10:30',  category: 'System' },
  { id: 7,  operator: 'Arjun P',  action: 'Exported user data',         target: 'Morrison Legal Group',            tenant: 'Morrison Legal Group',  time: 'Mar 27, 2026 14:20',  category: 'Data' },
  { id: 8,  operator: 'System',   action: 'Failed login attempt (5x)',  target: 'david@thorntoncomp.com',          tenant: 'Thornton Compliance',   time: 'Mar 26, 2026 22:15',  category: 'Security' },
  { id: 9,  operator: 'System',   action: 'Auto-locked account',        target: 'David Thornton',                  tenant: 'Thornton Compliance',   time: 'Mar 26, 2026 22:16',  category: 'Security' },
  { id: 10, operator: 'Arjun P',  action: 'Reset user password',        target: 'amy@thorntoncomp.com',            tenant: 'Thornton Compliance',   time: 'Mar 25, 2026 09:00',  category: 'Security' },
  { id: 11, operator: 'Dev Team', action: 'Deployed platform update',   target: 'v2.4.1',                          tenant: 'Platform',              time: 'Mar 24, 2026 03:00',  category: 'System' },
  { id: 12, operator: 'System',   action: 'SSL certificate renewed',    target: 'yourai.com',                      tenant: 'Platform',              time: 'Mar 23, 2026 00:01',  category: 'System' },
];

// Per-category pill colour. Hex on purpose — `${color}1a` (10% alpha)
// composes the tinted pill bg; var() values can't be concatenated.
const CATEGORY_META = {
  Access:        { color: '#5CA868' },
  Data:          { color: '#0f1c3f' },
  Security:      { color: '#C65454' },
  Communication: { color: '#E8A33D' },
  Billing:       { color: '#6B7885' },
  System:        { color: '#5B21B6' },
  General:       { color: '#6B7885' },
};

const CATEGORY_OPTIONS = ['Access', 'Data', 'Security', 'Communication', 'Billing', 'System'];

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
}

/* ─── Lightweight filter dropdown ─── */
function FilterPill({ icon: Icon, label, value, options, onChange, allLabel = 'All' }) {
  const [open, setOpen] = useState(false);
  const current = value === 'all' ? allLabel : value;
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
          background: '#fff', fontSize: 12.5, color: 'var(--text-primary)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {Icon && <Icon size={13} style={{ color: 'var(--text-muted)' }} />}
        <span style={{ fontWeight: 500 }}>{current}</span>
        <ChevronDown size={11} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
            minWidth: 200, maxHeight: 320, overflowY: 'auto',
            background: '#fff', borderRadius: 10,
            border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(10,36,99,0.12)',
            zIndex: 51,
          }}>
            <button
              onClick={() => { onChange('all'); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '9px 14px', background: value === 'all' ? 'var(--ice-warm)' : 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', textAlign: 'left' }}
              onMouseEnter={(e) => { if (value !== 'all') e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
              onMouseLeave={(e) => { if (value !== 'all') e.currentTarget.style.background = 'none'; }}
            >
              {allLabel}
            </button>
            <div style={{ height: 1, background: 'var(--border)' }} />
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '9px 14px', background: value === opt ? 'var(--ice-warm)' : 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', textAlign: 'left' }}
                onMouseEnter={(e) => { if (value !== opt) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                onMouseLeave={(e) => { if (value !== opt) e.currentTarget.style.background = 'none'; }}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ComplianceAudit() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const tenants = useMemo(
    () => Array.from(new Set(AUDIT_EVENTS.map((e) => e.tenant))).sort(),
    [],
  );
  const users = useMemo(
    () => Array.from(new Set(AUDIT_EVENTS.map((e) => e.operator))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return AUDIT_EVENTS.filter((e) => {
      if (tenantFilter !== 'all' && e.tenant !== tenantFilter) return false;
      if (userFilter !== 'all' && e.operator !== userFilter) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (q) {
        const hay = [e.time, e.operator, e.tenant, e.category, e.action, e.target].join('   ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [searchQuery, tenantFilter, userFilter, categoryFilter]);

  const handleExportCSV = () => {
    const header = ['Timestamp', 'User', 'Tenant', 'Category', 'Action', 'Target'];
    const rows = filtered.map((e) => [e.time, e.operator, e.tenant, e.category, e.action, e.target]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Shield} title="Compliance & Audit" subtitle="Audit logs, security events, and governance oversight across every tenant" />

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: 280, flex: '0 1 360px' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action, target, user, or tenant…"
            style={{ width: '100%', padding: '7px 30px 7px 30px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,36,99,0.08)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ice-warm)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <FilterPill icon={Building2} value={tenantFilter} options={tenants} onChange={setTenantFilter} allLabel="All tenants" />
        <FilterPill icon={User}       value={userFilter}   options={users}   onChange={setUserFilter}   allLabel="All users" />
        <FilterPill icon={Calendar}   value={categoryFilter} options={CATEGORY_OPTIONS} onChange={setCategoryFilter} allLabel="All categories" />

        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
          {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
        </span>

        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: '#fff',
            fontSize: 12.5, color: 'var(--navy)', fontWeight: 500,
            cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
            opacity: filtered.length === 0 ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { if (filtered.length > 0) { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.background = 'var(--ice-warm)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Events table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--ice-warm)', borderBottom: '1px solid var(--border)' }}>
              {['Timestamp', 'User', 'Tenant', 'Category', 'Action', 'Target'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  No events match these filters.
                </td>
              </tr>
            ) : filtered.map((e, idx) => {
              const meta = CATEGORY_META[e.category] || { color: '#6B7885' };
              const isPlatform = e.tenant === 'Platform';
              return (
                <tr
                  key={e.id}
                  style={{ borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid var(--border)', transition: 'background 120ms' }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--ice-warm)'; }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} />
                      {e.time}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--ice-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>
                        {initials(e.operator)}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{e.operator}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: isPlatform ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: isPlatform ? 400 : 500, fontStyle: isPlatform ? 'italic' : 'normal' }}>
                      <Building2 size={12} style={{ color: 'var(--text-muted)' }} />
                      {e.tenant}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                      background: `${meta.color}1a`, color: meta.color,
                    }}>
                      {e.category}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>{e.action}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{e.target}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
