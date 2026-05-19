import React, { useMemo, useState } from 'react';
import { ArrowLeft, Clock, Search, Download, Edit2, Trash2, CheckCircle2, FileText } from 'lucide-react';
import {
  loadEvents, updateEvent, deleteEvent, formatBillable, formatDuration, getActivityCatalog, loadSettings,
} from '../../lib/aiTimeStore';
import { exportEventsToCsv } from '../../lib/billingExport';

const STATUS_TABS = [
  { id: 'all',      label: 'All'      },
  { id: 'draft',    label: 'Drafts'   },
  { id: 'approved', label: 'Approved' },
  { id: 'exported', label: 'Exported' },
];

const STATUS_BADGE = {
  draft:    { bg: '#FBEED5', color: '#9C7A1E', label: 'Draft'    },
  approved: { bg: '#E7F3E9', color: '#5CA868', label: 'Approved' },
  exported: { bg: '#EEF1FA', color: '#5773C5', label: 'Exported' },
};

/**
 * MyTimePanel — attorney's own time-log view. Mounted as a sibling
 * panel in ChatView (same pattern as AuditLogsPanel / BillingPanel).
 * Scoped to the current operator.id; org-admin sees the broader view
 * at /app/billing-time.
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
  const handleMarkExported = () => {
    const approvedIds = filtered.filter((e) => e.status === 'approved').map((e) => e.id);
    const now = new Date().toISOString();
    approvedIds.forEach((id) => updateEvent(id, { status: 'exported', exportedAt: now }));
    refresh();
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
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· billable events from AI-time meter</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: '#fff', cursor: filtered.length ? 'pointer' : 'not-allowed',
            fontSize: 12, fontWeight: 500, color: 'var(--navy)', opacity: filtered.length ? 1 : 0.5,
          }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Tabs + search + totals */}
      <div style={{ padding: '14px 28px 10px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: '#fff', borderBottom: '1px solid var(--border)' }}>
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
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by matter, client, description…"
            style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 32, paddingRight: 12, fontSize: 13, background: '#FBFAF7', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <Stat label="Entries" value={totals.count} />
          <Stat label="Billable" value={formatBillable(totals.billableMinutes)} accent />
          {totals.nonBillableMinutes > 0 && (
            <Stat label="Non-billable" value={formatBillable(totals.nonBillableMinutes)} />
          )}
          {tab === 'approved' && totals.count > 0 && (
            <button
              onClick={handleMarkExported}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 12, color: 'var(--navy)', fontWeight: 500, cursor: 'pointer' }}
            >
              Mark as exported
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 28px 24px' }}>
        {filtered.length === 0 ? (
          <EmptyState search={search} tab={tab} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                isEditing={editingId === e.id}
                onEdit={() => setEditingId(e.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={() => { setEditingId(null); refresh(); }}
                onApprove={() => handleApprove(e.id)}
                onRevert={() => handleRevert(e.id)}
                onDelete={() => handleDelete(e.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: accent ? 'var(--navy)' : 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function EmptyState({ search, tab }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <FileText size={28} style={{ opacity: 0.4, marginBottom: 10 }} />
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: 'var(--text-secondary)', marginBottom: 6 }}>
        No {tab === 'all' ? '' : tab} entries{search ? ' match your search' : ' yet'}
      </div>
      <div style={{ fontSize: 13 }}>
        {search
          ? 'Try a different search term, or clear the filter.'
          : 'Start a chat — the AI-time meter logs your work automatically.'}
      </div>
    </div>
  );
}

function EventRow({ event, isEditing, onEdit, onCancelEdit, onSave, onApprove, onRevert, onDelete }) {
  const badge = STATUS_BADGE[event.status] || STATUS_BADGE.draft;
  const dateLabel = new Date(event.endedAt || event.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  if (isEditing) {
    return <EditEventForm event={event} onCancel={onCancelEdit} onSave={onSave} />;
  }

  const isNonBillable = event.billable === false;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{event.matterName}</span>
            {event.clientName && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {event.clientName}</span>}
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {badge.label}
            </span>
            {isNonBillable && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--ice-warm)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Non-billable
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
            {event.description}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span><Clock size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} /> {dateLabel}</span>
            <span>{event.activityLabel}</span>
            <span style={{ color: isNonBillable ? 'var(--text-muted)' : 'var(--navy)', fontWeight: 600, textDecoration: isNonBillable ? 'line-through' : 'none' }}>{formatBillable(event.billableMinutes)}</span>
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10 }} title="Raw measured time">raw {formatDuration(event.durationSeconds)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {event.status === 'draft' && (
            <button onClick={onApprove} title="Approve" style={iconBtn}><CheckCircle2 size={15} style={{ color: '#5CA868' }} /></button>
          )}
          {event.status === 'approved' && (
            <button onClick={onRevert} title="Move back to draft" style={iconBtn}><Edit2 size={14} style={{ color: 'var(--text-muted)' }} /></button>
          )}
          <button onClick={onEdit} title="Edit" style={iconBtn}><Edit2 size={14} style={{ color: 'var(--text-muted)' }} /></button>
          <button onClick={onDelete} title="Delete" style={iconBtn}><Trash2 size={14} style={{ color: '#C65454' }} /></button>
        </div>
      </div>
    </div>
  );
}

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
    <div style={{ background: '#fff', border: '1.5px solid var(--navy)', borderRadius: 12, padding: '14px 16px' }}>
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

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 6,
  borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};
const editInput = {
  border: '1px solid var(--border)', borderRadius: 6, height: 32,
  padding: '0 10px', fontSize: 13, width: '100%', outline: 'none',
  fontFamily: 'inherit', background: '#fff',
};
