// ─── Billing event exports ─────────────────────────────────────────
//
// CSV export shared by MyTimePanel and the Org Admin BillingTimePage.
// LEDES 1998B is the stretch target — function stubbed for the future
// e-billing mode flip, not wired into v1 UI.

import type { BillingEvent } from './aiTimeStore';

export function exportEventsToCsv(events: BillingEvent[], filename: string): void {
  const header = [
    'Date', 'Attorney', 'Matter', 'Client',
    'Activity Code', 'Activity', 'Description',
    'Billable', 'Hours', 'Minutes', 'Raw Duration (s)',
    'Status', 'Notes', 'Started At', 'Ended At',
  ];
  const rows = events.map((e) => [
    new Date(e.endedAt || e.createdAt).toISOString().slice(0, 10),
    e.attorneyName,
    e.matterName,
    e.clientName || '',
    e.activityCode,
    e.activityLabel,
    e.description,
    e.billable === false ? 'no' : 'yes',
    e.billableHours.toFixed(2),
    String(e.billableMinutes),
    String(e.durationSeconds),
    e.status,
    e.notes || '',
    e.startedAt,
    e.endedAt,
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
