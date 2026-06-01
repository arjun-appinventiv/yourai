// ─── Reminders persistence ───────────────────────────────────────────
//
// Stores deadline reminders extracted from court documents or created
// manually. Each reminder has a cascade of notification pips (e.g. 30d,
// 14d, 7d before due) so attorneys see escalating alerts as deadlines
// approach.
//
// Storage key: yourai_reminders_v1

const KEY = 'yourai_reminders_v1';

export type ReminderCategory =
  | 'hard_deadline'
  | 'filing'
  | 'discovery'
  | 'compliance'
  | 'sol'
  | 'client_meeting'
  | 'admin';

export interface Reminder {
  id: string;
  title: string;
  category: ReminderCategory;
  matter: string;
  dueDate: string;        // YYYY-MM-DD
  dueTime?: string;       // e.g. "5:00 PM ET"
  sourcePage?: number;
  sourceDocument?: string;
  cascade: number[];      // days before due for each pip, e.g. [30,14,7,1]
  status: 'upcoming' | 'completed' | 'snoozed';
  owner: string;
  isRecurring?: boolean;
  recurringPattern?: string; // 'monthly' | 'quarterly' | 'annually'
  notes?: string;
  createdAt: string;
}

export const CATEGORY_META: Record<ReminderCategory, { label: string; color: string; bg: string }> = {
  hard_deadline:  { label: 'HARD DEADLINE',          color: '#DC2626', bg: '#FEF2F2' },
  filing:         { label: 'COURT FILING',            color: '#2563EB', bg: '#EFF6FF' },
  discovery:      { label: 'DISCOVERY',               color: '#7C3AED', bg: '#F5F3FF' },
  compliance:     { label: 'COMPLIANCE',              color: '#D97706', bg: '#FFFBEB' },
  sol:            { label: 'STATUTE OF LIMITATIONS',  color: '#EA580C', bg: '#FFF7ED' },
  client_meeting: { label: 'CLIENT MEETING',          color: '#059669', bg: '#ECFDF5' },
  admin:          { label: 'ADMIN',                   color: '#6B7280', bg: '#F9FAFB' },
};

// Returns YYYY-MM-DD for today + n days, always relative to actual current date.
export function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Days from today to dueDate (negative = overdue).
// Compares against 23:59:59 of dueDate so the day itself counts as 0.
export function daysUntil(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate + 'T23:59:59');
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
}

// Returns a boolean[] parallel to cascade — pip[i] is true if today is
// on or past (dueDate - cascade[i]) days.
export function firedPips(dueDate: string, cascade: number[]): boolean[] {
  const now = new Date();
  const due = new Date(dueDate + 'T23:59:59');
  return cascade.map(pipDays => {
    const pipDate = new Date(due.getTime() - pipDays * 86400000);
    return now >= pipDate;
  });
}

// ─── Seed data ────────────────────────────────────────────────────────

function buildSeed(): Reminder[] {
  // createdAt is N days before today so the data looks historical.
  const ago = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

  return [
    {
      id: 'rem-001',
      title: 'Answer to Complaint due',
      category: 'hard_deadline',
      matter: 'Meridian v. Apex',
      dueDate: daysFromNow(1),
      dueTime: '5:00 PM ET',
      sourcePage: 2,
      sourceDocument: 'Meridian v Apex - Scheduling Order.pdf',
      cascade: [30, 14, 7, 1],
      status: 'upcoming',
      owner: 'Ryan Melade',
      createdAt: ago(32),
    },
    {
      id: 'rem-002',
      title: 'Response to Motion to Dismiss',
      category: 'filing',
      matter: 'Hartwell v. Coastal Logistics',
      dueDate: daysFromNow(4),
      dueTime: '5:00 PM ET',
      sourcePage: 3,
      sourceDocument: 'Motion to Dismiss - Coastal Logistics.pdf',
      cascade: [30, 14, 7, 1],
      status: 'upcoming',
      owner: 'Priya Shah',
      notes: 'Federal Court SDNY · Auto-calculated, excludes federal holidays.',
      createdAt: ago(28),
    },
    {
      id: 'rem-003',
      title: 'Statute of Limitations — Hartwell v. Coastal Logistics',
      category: 'sol',
      matter: 'Hartwell v. Coastal Logistics',
      dueDate: daysFromNow(11),
      dueTime: '11:59 PM ET',
      cascade: [365, 180, 90, 60, 30, 14, 7, 1],
      status: 'upcoming',
      owner: 'Ryan Melade',
      notes: 'Personal injury claim, NY CPLR §214 (3-year limitation). This deadline cannot be extended.',
      createdAt: ago(45),
    },
    {
      id: 'rem-004',
      title: 'Quarterly client review — Acme Corp',
      category: 'client_meeting',
      matter: 'Acme Corp',
      dueDate: daysFromNow(14),
      dueTime: '2:00 PM ET',
      cascade: [30, 14, 7, 1],
      status: 'upcoming',
      owner: 'Ryan Melade',
      isRecurring: true,
      recurringPattern: 'quarterly',
      createdAt: ago(10),
    },
    {
      id: 'rem-005',
      title: 'Statute of Limitations — Reyes Discrimination Claim',
      category: 'sol',
      matter: 'Reyes Matter',
      dueDate: daysFromNow(22),
      dueTime: '11:59 PM ET',
      cascade: [365, 180, 90, 60, 30, 14, 7, 1],
      status: 'upcoming',
      owner: 'Ryan Melade',
      notes: 'Title VII federal claim. 90 days post-EEOC right-to-sue.',
      createdAt: ago(60),
    },
    {
      id: 'rem-006',
      title: 'Motion to Dismiss deadline',
      category: 'filing',
      matter: 'Meridian v. Apex',
      dueDate: daysFromNow(25),
      dueTime: '5:00 PM ET',
      sourcePage: 3,
      sourceDocument: 'Meridian v Apex - Scheduling Order.pdf',
      cascade: [30, 14, 7, 1],
      status: 'upcoming',
      owner: 'Priya Shah',
      createdAt: ago(7),
    },
    {
      id: 'rem-007',
      title: 'Fact discovery cutoff',
      category: 'discovery',
      matter: 'Meridian v. Apex',
      dueDate: daysFromNow(95),
      dueTime: '11:59 PM ET',
      sourcePage: 4,
      sourceDocument: 'Meridian v Apex - Scheduling Order.pdf',
      cascade: [30, 14, 7, 1],
      status: 'upcoming',
      owner: 'Priya Shah',
      createdAt: ago(7),
    },
    {
      id: 'rem-008',
      title: 'Expert disclosure deadline',
      category: 'discovery',
      matter: 'Meridian v. Apex',
      dueDate: daysFromNow(123),
      dueTime: '5:00 PM ET',
      sourcePage: 4,
      sourceDocument: 'Meridian v Apex - Scheduling Order.pdf',
      cascade: [30, 14, 7, 1],
      status: 'upcoming',
      owner: 'Priya Shah',
      createdAt: ago(7),
    },
    {
      id: 'rem-009',
      title: 'Dispositive motions due',
      category: 'filing',
      matter: 'Meridian v. Apex',
      dueDate: daysFromNow(165),
      dueTime: '5:00 PM ET',
      sourcePage: 5,
      sourceDocument: 'Meridian v Apex - Scheduling Order.pdf',
      cascade: [30, 14, 7, 1],
      status: 'upcoming',
      owner: 'Priya Shah',
      createdAt: ago(7),
    },
  ];
}

// ─── CRUD ─────────────────────────────────────────────────────────────

export function loadReminders(): Reminder[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Reminder[];
  } catch {
    return [];
  }
}

export function saveReminders(reminders: Reminder[]): void {
  localStorage.setItem(KEY, JSON.stringify(reminders));
}

export function seedRemindersIfEmpty(): void {
  const existing = loadReminders();
  if (existing.length === 0) {
    saveReminders(buildSeed());
  }
}

export function addReminders(items: Omit<Reminder, 'id' | 'createdAt'>[]): Reminder[] {
  const existing = loadReminders();
  const now = new Date().toISOString();
  const newItems: Reminder[] = items.map((item, i) => ({
    ...item,
    id: `rem-${Date.now()}-${i}`,
    createdAt: now,
  }));
  const updated = [...existing, ...newItems];
  saveReminders(updated);
  return updated;
}

export function updateReminder(id: string, patch: Partial<Reminder>): Reminder[] {
  const reminders = loadReminders();
  const updated = reminders.map(r => r.id === id ? { ...r, ...patch } : r);
  saveReminders(updated);
  return updated;
}

export function deleteReminder(id: string): Reminder[] {
  const reminders = loadReminders();
  const updated = reminders.filter(r => r.id !== id);
  saveReminders(updated);
  return updated;
}
