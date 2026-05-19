import React, { useMemo, useState } from 'react';
import { ArrowLeft, Clock, Search, Download, Edit2, Trash2, CheckCircle2, X } from 'lucide-react';
import {
  loadEvents, updateEvent, deleteEvent, formatBillable, formatDuration, getActivityCatalog, loadSettings,
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

/**
 * MyTimePanel — attorney's own time-log view. Same table shell as
 * TeamTimePanel but scoped to the current operator and without the
 * Attorney column.
 */
export default function MyTimePanel({ onBack, operator }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [editingId, setEditingId] = useState(null);

  const allEvents = useMemo(() => loadEvents(), [refreshTick]);
  const myEvents = useMemo(
    () => allEvents.filter((e) => e.attorneyId === operator?.id),
    [allEvents, operator?.id],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myEvents
      .filter((e) => tab === 'all' || e.status === tab)
      .filter((e) => {
        if (!q) return true;
        const hay = [e.matterName, e.clientName, e.description, e.activityLabel, e.notes]
          .filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
  }, [myEvents, tab, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, e) => {
        if (e.billable !== false) acc.billableMinutes += e.billableMinutes;
        else acc.nonBillableMinutes += e.billableMinutes;
        acc.count += 1;
        return acc;
      },
      { billableMinutes: 0, nonBillableMinutes: 0, count: 0 },
    );
  }, [filtered]);

  const refresh = () => setRefreshTick((t) => t + 1);
  const handleApprove = (id) => { updateEvent(id, { status: 'approved' }); refresh(); };
  const handleRevert = (id) => { updateEvent(id, { status: 'draft' }); refresh(); };
  const handleDelete = (id) => {
    if (!confirm('Delete this time entry? This cannot be undone.')) return;
    deleteEvent(id); refresh();
  };
  const handleExportCSV = () => {
    exportEventsToCsv(filtered, `my-time-${operator?.name?.replace(/\W+/g, '-') || 'attorney'}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#F8F7F4', overflow: 'hidden' }}>
      {/* Panel header */}
      <div style={{ height: 50, padding: '0 28px', borderBottom: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, marginLeft: -6, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} />
        </button>
        <Clock size={17} style={{ color: 'var(--navy)' }} />
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: 'var(--navy)' }}>My Time</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· billable events from the AI-time meter</span>
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

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 24px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
          <Kpi label="Entries (filtered)" value={String(totals.count)} />
          <Kpi label="Billable time" value={formatBillable(totals.billableMinutes)} accent />
          {totals.nonBillableMinutes > 0 && (
            <Kpi label="Non-billable" value={formatBillable(totals.nonBillableMinutes)} />
          )}
          <Kpi label="Approved (filtered)" value={String(filtered.filter((e) => e.status === 'approved').length)} />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_TABS.map((t) => {
              const active = tab === t.id;
              const count = t.id === 'all' ? myEvents.length : myEvents.filter((e) => e.status === t.id).length;
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

          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search matter, client, description…"
              style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 32, paddingRight: 12, fontSize: 13, background: '#FBFAF7', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Clock size={26} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: 'var(--text-secondary)', marginBottom: 4 }}>
              No {tab === 'all' ? '' : tab} entries{search ? ' match your search' : ' yet'}
            </div>
            <div style={{ fontSize: 13 }}>
              {search ? 'Try a different search term, or clear the filter.' : 'Start a chat — the AI-time meter logs your work automatically.'}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FBFAF7', borderBottom: '1px solid var(--border)' }}>
                  <Th>Date</Th>
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
                  if (editingId === e.id) {
                    return (
                      <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={7} style={{ padding: 0, background: 'rgba(10,36,99,0.03)' }}>
                          <EditEventForm
                            event={e}
                            onCancel={() => setEditingId(null)}
                            onSave={() => { setEditingId(null); refresh(); }}
                          />
                        </td>
                      </tr>
                    );
                  }
                  const badge = STATUS_BADGE[e.status] || STATUS_BADGE.draft;
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <Td>
                        <div style={{ fontSize: 12 }}>{new Date(e.endedAt || e.createdAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(e.endedAt || e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </Td>
                      <Td>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{e.matterName}</div>
                        {e.clientName && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.clientName}</div>
                        )}
                      </Td>
                      <Td><span style={{ fontSize: 12 }}>{e.activityLabel}</span></Td>
                      <Td>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 360, lineHeight: 1.4 }}>{e.description}</div>
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
                          {e.status === 'approved' && (
                            <button title="Move back to draft" onClick={() => handleRevert(e.id)} style={iconBtn}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
                          )}
                          <button title="Edit" onClick={() => setEditingId(e.id)} style={iconBtn}><Edit2 size={13} style={{ color: 'var(--text-muted)' }} /></button>
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

function EditEventForm({ event, onCancel, onSave }) {
  const settings = useMemo(() => loadSettings(), []);
  const catalog = useMemo(() => getActivityCatalog(settings), [settings]);
  const [matterName, setMatterName] = useState(event.matterName);
  const [clientName, setClientName] = useState(event.clientName || '');
  const [activityCode, setActivityCode] = useState(event.activityCode);
  const [description, setDescription] = useState(event.description);
  const [notes, setNotes] = useState(event.notes || '');
  const [billable, setBillable] = useState(event.billable !== false);

  const save = () => {
    const activity = catalog.find((a) => a.code === activityCode) || { code: activityCode, label: event.activityLabel };
    updateEvent(event.id, {
      matterName: matterName.trim(),
      clientName: clientName.trim() || undefined,
      activityCode: activity.code,
      activityLabel: activity.label,
      description: description.trim(),
      notes: notes.trim() || undefined,
      billable,
    });
    onSave();
  };

  return (
    <div style={{ padding: '14px 18px', borderTop: '2px solid var(--navy)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <Labeled label="Matter name">
          <input value={matterName} onChange={(e) => setMatterName(e.target.value)} style={editInput} />
        </Labeled>
        <Labeled label="Client">
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} style={editInput} />
        </Labeled>
        <Labeled label="Activity">
          <select value={activityCode} onChange={(e) => setActivityCode(e.target.value)} style={editInput}>
            {catalog.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}
          </select>
        </Labeled>
        <Labeled label="Billable">
          <select value={billable ? 'yes' : 'no'} onChange={(e) => setBillable(e.target.value === 'yes')} style={editInput}>
            <option value="yes">Billable to client</option>
            <option value="no">Non-billable (internal)</option>
          </select>
        </Labeled>
      </div>
      <Labeled label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...editInput, height: 'auto', padding: '6px 10px', resize: 'vertical' }} />
      </Labeled>
      <div style={{ marginTop: 10 }}>
        <Labeled label="Internal notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...editInput, height: 'auto', padding: '6px 10px', resize: 'vertical' }} />
        </Labeled>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button onClick={onCancel} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
        <button onClick={save} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save changes</button>
      </div>
    </div>
  );
}

function Labeled({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );
}

const editInput = {
  border: '1px solid var(--border)', borderRadius: 6, height: 32,
  padding: '0 10px', fontSize: 13, width: '100%', outline: 'none',
  fontFamily: 'inherit', background: '#fff',
};
