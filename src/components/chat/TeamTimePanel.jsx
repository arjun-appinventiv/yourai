import React, { useMemo, useState } from 'react';
import { ArrowLeft, Clock, Download, Search, ChevronDown, CheckCircle2, Trash2 } from 'lucide-react';
import {
  loadEvents, updateEvent, deleteEvent, formatBillable, formatDuration,
} from '../../lib/aiTimeStore';
import { exportEventsToCsv } from '../../lib/billingExport';

const STATUS_TABS = [
  { id: 'all',      label: 'All'      },
  { id: 'draft',    label: 'Drafts'   },
  { id: 'approved', label: 'Approved' },
];

const STATUS_BADGE = {
  draft:    { bg: '#FBEED5', color: '#9C7A1E', label: 'Draft'    },
  approved: { bg: '#E7F3E9', color: '#5CA868', label: 'Approved' },
};

const DATE_RANGES = [
  { id: 'all',    label: 'All time',     days: null },
  { id: 'today',  label: 'Today',        days: 0    },
  { id: '7d',     label: 'Last 7 days',  days: 7    },
  { id: '30d',   label: 'Last 30 days', days: 30   },
  { id: 'mtd',   label: 'Month to date', days: -1  },
];

/**
 * TeamTimePanel — Org Admin sibling panel mounted inside ChatView.
 * Shows every billable event the firm's attorneys have logged via the
 * AI-time meter, with status / attorney / date filters + CSV export.
 *
 * Sibling-panel pattern matches BillingPanel / AuditLogsPanel.
 */
export default function TeamTimePanel({ onBack }) {
  const [tab, setTab] = useState('all');
  const [attorneyFilter, setAttorneyFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [attorneyOpen, setAttorneyOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const events = useMemo(() => loadEvents(), [refreshTick]);

  const attorneys = useMemo(() => {
    const m = new Map();
    events.forEach((e) => m.set(e.attorneyId, e.attorneyName));
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [events]);

  const filtered = useMemo(() => {
    const cutoff = (() => {
      const f = DATE_RANGES.find((d) => d.id === dateFilter);
      if (!f || f.days === null) return null;
      if (f.days === 0) { const t = new Date(); t.setHours(0, 0, 0, 0); return t.getTime(); }
      if (f.days === -1) { const t = new Date(); t.setDate(1); t.setHours(0, 0, 0, 0); return t.getTime(); }
      return Date.now() - f.days * 86400000;
    })();
    const q = search.trim().toLowerCase();
    return events
      .filter((e) => tab === 'all' || e.status === tab)
      .filter((e) => attorneyFilter === 'all' || e.attorneyId === attorneyFilter)
      .filter((e) => cutoff === null || new Date(e.endedAt || e.createdAt).getTime() >= cutoff)
      .filter((e) => {
        if (!q) return true;
        const hay = [e.matterName, e.clientName, e.description, e.activityLabel, e.attorneyName, e.notes]
          .filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
  }, [events, tab, attorneyFilter, dateFilter, search]);

  const totals = useMemo(() => {
    const byAttorney = new Map();
    let billableMinutes = 0;
    let nonBillableMinutes = 0;
    filtered.forEach((e) => {
      if (e.billable !== false) billableMinutes += e.billableMinutes;
      else nonBillableMinutes += e.billableMinutes;
      byAttorney.set(e.attorneyId, (byAttorney.get(e.attorneyId) || 0) + (e.billable !== false ? e.billableMinutes : 0));
    });
    return { count: filtered.length, billableMinutes, nonBillableMinutes, attorneys: byAttorney.size };
  }, [filtered]);

  const refresh = () => setRefreshTick((t) => t + 1);
  const handleApprove = (id) => { updateEvent(id, { status: 'approved' }); refresh(); };
  const handleDelete = (id) => {
    if (!confirm('Delete this time entry? This cannot be undone.')) return;
    deleteEvent(id); refresh();
  };
  const handleExportCSV = () => {
    const label = attorneyFilter === 'all' ? 'all-attorneys' : attorneys.find((a) => a.id === attorneyFilter)?.name?.replace(/\W+/g, '-') || 'attorney';
    exportEventsToCsv(filtered, `time-${label}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const currentAttorneyLabel = attorneyFilter === 'all' ? 'All attorneys' : attorneys.find((a) => a.id === attorneyFilter)?.name || 'Attorney';
  const currentDateLabel = DATE_RANGES.find((d) => d.id === dateFilter)?.label || 'All time';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#F8F7F4', overflow: 'hidden' }}>
      {/* Panel header */}
      <div style={{ height: 50, padding: '0 28px', borderBottom: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, marginLeft: -6, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} />
        </button>
        <Clock size={17} style={{ color: 'var(--navy)' }} />
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: 'var(--navy)' }}>Team Time</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· every attorney's billable events across the firm</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
            border: 'none', background: filtered.length === 0 ? 'rgba(10,36,99,0.4)' : 'var(--navy)',
            color: '#fff', fontSize: 12, fontWeight: 600,
            cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Body scroll */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 24px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
          <Kpi label="Entries (filtered)" value={String(totals.count)} />
          <Kpi label="Billable time" value={formatBillable(totals.billableMinutes)} accent />
          <Kpi label="Non-billable" value={formatBillable(totals.nonBillableMinutes)} />
          <Kpi label="Attorneys" value={String(totals.attorneys || 0)} />
          <Kpi label="Approved (filtered)" value={String(filtered.filter((e) => e.status === 'approved').length)} />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_TABS.map((t) => {
              const active = tab === t.id;
              const count = t.id === 'all' ? events.length : events.filter((e) => e.status === t.id).length;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: active ? 'rgba(10,36,99,0.08)' : 'transparent',
                    color: active ? 'var(--navy)' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: active ? 600 : 500,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {t.label}
                  <span style={{ fontSize: 11, padding: '0 6px', borderRadius: 999, background: active ? 'var(--navy)' : 'var(--border)', color: active ? '#fff' : 'var(--text-muted)' }}>{count}</span>
                </button>
              );
            })}
          </div>

          <FilterDropdown
            label={currentAttorneyLabel}
            isOpen={attorneyOpen}
            onToggle={() => { setAttorneyOpen((v) => !v); setDateOpen(false); }}
            onClose={() => setAttorneyOpen(false)}
            options={[{ id: 'all', label: 'All attorneys' }, ...attorneys.map((a) => ({ id: a.id, label: a.name }))]}
            value={attorneyFilter}
            onPick={(v) => { setAttorneyFilter(v); setAttorneyOpen(false); }}
          />
          <FilterDropdown
            label={currentDateLabel}
            isOpen={dateOpen}
            onToggle={() => { setDateOpen((v) => !v); setAttorneyOpen(false); }}
            onClose={() => setDateOpen(false)}
            options={DATE_RANGES}
            value={dateFilter}
            onPick={(v) => { setDateFilter(v); setDateOpen(false); }}
          />

          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search matter, client, description, attorney…"
              style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 32, paddingRight: 12, fontSize: 13, background: '#FBFAF7', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Clock size={26} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: 'var(--text-secondary)', marginBottom: 4 }}>No entries match the current filters</div>
            <div style={{ fontSize: 13 }}>Adjust the filters above, or wait for attorneys to log time.</div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FBFAF7', borderBottom: '1px solid var(--border)' }}>
                  <Th>Date</Th>
                  <Th>Attorney</Th>
                  <Th>Matter</Th>
                  <Th>Activity</Th>
                  <Th>Description</Th>
                  <Th align="right">Billable</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const badge = STATUS_BADGE[e.status] || STATUS_BADGE.draft;
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <Td>
                        <div style={{ fontSize: 12 }}>{new Date(e.endedAt || e.createdAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(e.endedAt || e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </Td>
                      <Td>{e.attorneyName}</Td>
                      <Td>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{e.matterName}</div>
                        {e.clientName && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.clientName}</div>
                        )}
                      </Td>
                      <Td><span style={{ fontSize: 12 }}>{e.activityLabel}</span></Td>
                      <Td>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 340, lineHeight: 1.4 }}>{e.description}</div>
                      </Td>
                      <Td align="right">
                        <div style={{
                          fontSize: 13, fontWeight: 700,
                          color: e.billable === false ? 'var(--text-muted)' : 'var(--navy)',
                          textDecoration: e.billable === false ? 'line-through' : 'none',
                        }}>{formatBillable(e.billableMinutes)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }} title="Raw measured">raw {formatDuration(e.durationSeconds)}</div>
                      </Td>
                      <Td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{badge.label}</span>
                          {e.billable === false && (
                            <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'var(--ice-warm)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Non-billable</span>
                          )}
                        </div>
                      </Td>
                      <Td align="right">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          {e.status === 'draft' && (
                            <button title="Approve" onClick={() => handleApprove(e.id)} style={iconBtn}><CheckCircle2 size={14} style={{ color: '#5CA868' }} /></button>
                          )}
                          <button title="Delete" onClick={() => handleDelete(e.id)} style={iconBtn}><Trash2 size={13} style={{ color: '#C65454' }} /></button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ? 'var(--navy)' : 'var(--text-primary)', marginTop: 4, fontFamily: "'Fraunces', serif" }}>{value}</div>
    </div>
  );
}

function FilterDropdown({ label, isOpen, onToggle, onClose, options, value, onPick }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        style={{
          height: 34, padding: '0 11px 0 12px', borderRadius: 8,
          border: '1px solid var(--border)', background: '#fff',
          fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--text-primary)', fontFamily: 'inherit',
        }}
      >
        <span>{label}</span>
        <ChevronDown size={12} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>
      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          minWidth: 200, maxHeight: 320, overflowY: 'auto',
          background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 12px 28px rgba(0,0,0,0.12)', zIndex: 50,
        }}>
          {options.map((opt) => {
            const active = opt.id === value;
            return (
              <div
                key={opt.id}
                onClick={() => onPick(opt.id)}
                style={{
                  padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                  background: active ? 'rgba(10,36,99,0.05)' : 'transparent',
                  color: active ? 'var(--navy)' : 'var(--text-primary)',
                  fontWeight: active ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Th({ children, align }) {
  return <th style={{ textAlign: align || 'left', padding: '10px 14px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>;
}
function Td({ children, align }) {
  return <td style={{ textAlign: align || 'left', padding: '12px 14px', verticalAlign: 'top' }}>{children}</td>;
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 5,
  borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};
