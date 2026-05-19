// ─── Demo seed data for AI-time meter ─────────────────────────────
//
// Realistic firm-wide spread of billable events used to populate the
// My Time + org-admin Time & Billing surfaces on a fresh demo browser.
// Mirrors the seed pattern of documentVaultStore / knowledgePackStore.
//
// All `attorneyId`s match the mock orgUsers list (`src/data/mockData.js`).
// Dates are relative-to-today so the "Last 7 days / Month to date"
// filters always show something meaningful when a client demo runs.

import type { BillingEvent } from '../lib/aiTimeStore';

interface DemoTemplate {
  attorneyId: string;
  attorneyName: string;
  attorneyEmail: string;
  matterName: string;
  clientName?: string;
  activityCode: string;
  activityLabel: string;
  description: string;
  durationMinutes: number;
  billable?: boolean;
  status: 'draft' | 'approved';
  daysAgo: number;
  hourOfDay: number;
  notes?: string;
}

const TEMPLATES: DemoTemplate[] = [
  // ── Today (drafts awaiting attorney review) ──────────────────────
  {
    attorneyId: 'user-ryan', attorneyName: 'Ryan Melade', attorneyEmail: 'ryan@hartwell.com',
    matterName: 'Acme Corp — MSA Renewal', clientName: 'Acme Corp',
    activityCode: 'ANALYSIS', activityLabel: 'Analysis / Strategy',
    description: 'Analyzed indemnification carve-outs in the renewed Master Services Agreement; flagged Section 8.3 for client discussion.',
    durationMinutes: 47, status: 'draft', daysAgo: 0, hourOfDay: 14,
  },
  {
    attorneyId: 'user-sarah', attorneyName: 'Sarah Chen', attorneyEmail: 'sarah@hartwell.com',
    matterName: 'TechStart Q4 Due Diligence', clientName: 'TechStart Inc',
    activityCode: 'REVIEW', activityLabel: 'Document Review',
    description: 'Reviewed the Q4 cap table, founder employment agreements, and 83(b) elections; prepared diligence checklist for buyer counsel.',
    durationMinutes: 92, status: 'draft', daysAgo: 0, hourOfDay: 11,
  },
  {
    attorneyId: 'user-james', attorneyName: 'James Wu', attorneyEmail: 'james@hartwell.com',
    matterName: 'Bradley v. Patel — Discovery', clientName: 'Bradley',
    activityCode: 'DRAFTING', activityLabel: 'Drafting',
    description: 'Drafted responses and objections to plaintiff’s second set of interrogatories.',
    durationMinutes: 73, status: 'draft', daysAgo: 0, hourOfDay: 9,
  },

  // ── Yesterday / earlier this week (approved, ready for export) ───
  {
    attorneyId: 'user-ryan', attorneyName: 'Ryan Melade', attorneyEmail: 'ryan@hartwell.com',
    matterName: 'Acme Corp — NDA Review', clientName: 'Acme Corp',
    activityCode: 'REVIEW', activityLabel: 'Document Review',
    description: 'Reviewed prior NDA template against new Acme term sheet; identified three confidentiality scope deltas.',
    durationMinutes: 35, status: 'approved', daysAgo: 1, hourOfDay: 15,
  },
  {
    attorneyId: 'user-ryan', attorneyName: 'Ryan Melade', attorneyEmail: 'ryan@hartwell.com',
    matterName: 'Acme Corp — NDA Review', clientName: 'Acme Corp',
    activityCode: 'COMM_CLI', activityLabel: 'Client Communication',
    description: 'Call with Acme general counsel regarding NDA scope and survival clause; confirmed required revisions.',
    durationMinutes: 28, status: 'approved', daysAgo: 1, hourOfDay: 16,
  },
  {
    attorneyId: 'user-sarah', attorneyName: 'Sarah Chen', attorneyEmail: 'sarah@hartwell.com',
    matterName: 'TechStart Q4 Due Diligence', clientName: 'TechStart Inc',
    activityCode: 'RESEARCH', activityLabel: 'Research',
    description: 'Researched Delaware case law on founder vesting acceleration triggers in single-trigger acquisition scenarios.',
    durationMinutes: 64, status: 'approved', daysAgo: 1, hourOfDay: 10,
  },
  {
    attorneyId: 'user-sarah', attorneyName: 'Sarah Chen', attorneyEmail: 'sarah@hartwell.com',
    matterName: 'Chen Family Trust Restatement', clientName: 'Chen Family',
    activityCode: 'DRAFTING', activityLabel: 'Drafting',
    description: 'Drafted revisions to Article IV beneficiary designations and HEMS standard distribution clause.',
    durationMinutes: 102, status: 'approved', daysAgo: 2, hourOfDay: 13,
  },
  {
    attorneyId: 'user-james', attorneyName: 'James Wu', attorneyEmail: 'james@hartwell.com',
    matterName: 'Bradley v. Patel — Discovery', clientName: 'Bradley',
    activityCode: 'ANALYSIS', activityLabel: 'Analysis / Strategy',
    description: 'Analyzed deposition transcript for inconsistencies on the November 2024 site visit; built impeachment outline.',
    durationMinutes: 138, status: 'approved', daysAgo: 2, hourOfDay: 9,
  },
  {
    attorneyId: 'user-maria', attorneyName: 'Maria Torres', attorneyEmail: 'maria@hartwell.com',
    matterName: 'Robertson Healthcare Compliance Audit', clientName: 'Robertson Healthcare',
    activityCode: 'REVIEW', activityLabel: 'Document Review',
    description: 'Reviewed HIPAA business associate agreements across vendor portfolio; flagged 4 expired BAAs for renewal.',
    durationMinutes: 56, status: 'approved', daysAgo: 2, hourOfDay: 14,
  },
  {
    attorneyId: 'user-james', attorneyName: 'James Wu', attorneyEmail: 'james@hartwell.com',
    matterName: 'Acme Corp — NDA Review', clientName: 'Acme Corp',
    activityCode: 'DRAFTING', activityLabel: 'Drafting',
    description: 'Drafted side letter clarifying definition of “Confidential Information” to exclude residual knowledge.',
    durationMinutes: 41, status: 'approved', daysAgo: 3, hourOfDay: 11,
  },
  {
    attorneyId: 'user-ryan', attorneyName: 'Ryan Melade', attorneyEmail: 'ryan@hartwell.com',
    matterName: 'Employment Contract — Patel', clientName: 'Patel Industries',
    activityCode: 'DRAFTING', activityLabel: 'Drafting',
    description: 'Drafted non-compete clause tailored to Alaska Stat. § 23.10.140 enforceability standards.',
    durationMinutes: 49, status: 'approved', daysAgo: 3, hourOfDay: 16,
  },
  {
    attorneyId: 'user-sarah', attorneyName: 'Sarah Chen', attorneyEmail: 'sarah@hartwell.com',
    matterName: 'TechStart Q4 Due Diligence', clientName: 'TechStart Inc',
    activityCode: 'COMM_CLI', activityLabel: 'Client Communication',
    description: 'Email exchange with TechStart CFO regarding revenue recognition policy and ASC 606 implications.',
    durationMinutes: 22, status: 'approved', daysAgo: 4, hourOfDay: 10,
  },
  {
    attorneyId: 'user-maria', attorneyName: 'Maria Torres', attorneyEmail: 'maria@hartwell.com',
    matterName: 'Robertson Healthcare Compliance Audit', clientName: 'Robertson Healthcare',
    activityCode: 'ANALYSIS', activityLabel: 'Analysis / Strategy',
    description: 'Analyzed proposed CMS rule changes to 42 CFR Part 2 and impact on substance-use disorder record disclosures.',
    durationMinutes: 85, status: 'approved', daysAgo: 5, hourOfDay: 13,
  },

  // ── Non-billable: training, internal, pro bono ──────────────────
  {
    attorneyId: 'user-ryan', attorneyName: 'Ryan Melade', attorneyEmail: 'ryan@hartwell.com',
    matterName: 'Internal — YourAI Training', billable: false,
    activityCode: 'OTHER', activityLabel: 'Other',
    description: 'Walked the team through the AI-time meter workflow and intent-card surfaces in the new chat build.',
    durationMinutes: 38, status: 'approved', daysAgo: 1, hourOfDay: 17,
    notes: 'Recurring weekly team training.',
  },
  {
    attorneyId: 'user-james', attorneyName: 'James Wu', attorneyEmail: 'james@hartwell.com',
    matterName: 'Pro Bono — Anchorage Tenant Coalition', billable: false,
    activityCode: 'RESEARCH', activityLabel: 'Research',
    description: 'Researched Alaska eviction notice timing requirements for the tenant-rights legal clinic.',
    durationMinutes: 71, status: 'approved', daysAgo: 3, hourOfDay: 17,
  },
  {
    attorneyId: 'user-maria', attorneyName: 'Maria Torres', attorneyEmail: 'maria@hartwell.com',
    matterName: 'Internal — CLE Preparation', billable: false,
    activityCode: 'RESEARCH', activityLabel: 'Research',
    description: 'Outlined CLE presentation on data-privacy obligations for in-house counsel.',
    durationMinutes: 44, status: 'draft', daysAgo: 0, hourOfDay: 12,
  },

  // ── Already-exported events from last invoice cycle ─────────────
  {
    attorneyId: 'user-ryan', attorneyName: 'Ryan Melade', attorneyEmail: 'ryan@hartwell.com',
    matterName: 'Acme Corp — Vendor Master Agreement', clientName: 'Acme Corp',
    activityCode: 'DRAFTING', activityLabel: 'Drafting',
    description: 'Drafted vendor MA covering SaaS, professional services, and data-processing addendum.',
    durationMinutes: 156, status: 'approved', daysAgo: 12, hourOfDay: 14,
  },
  {
    attorneyId: 'user-sarah', attorneyName: 'Sarah Chen', attorneyEmail: 'sarah@hartwell.com',
    matterName: 'Acme Corp — Vendor Master Agreement', clientName: 'Acme Corp',
    activityCode: 'REVIEW', activityLabel: 'Document Review',
    description: 'Reviewed vendor MA draft; suggested limitation-of-liability cap and mutual indemnity carve-outs.',
    durationMinutes: 67, status: 'approved', daysAgo: 12, hourOfDay: 16,
  },
  {
    attorneyId: 'user-james', attorneyName: 'James Wu', attorneyEmail: 'james@hartwell.com',
    matterName: 'Bradley v. Patel — Pleadings', clientName: 'Bradley',
    activityCode: 'DRAFTING', activityLabel: 'Drafting',
    description: 'Drafted Motion to Compel Discovery Responses and proposed order.',
    durationMinutes: 88, status: 'approved', daysAgo: 14, hourOfDay: 10,
  },
  {
    attorneyId: 'user-sarah', attorneyName: 'Sarah Chen', attorneyEmail: 'sarah@hartwell.com',
    matterName: 'Chen Family Trust Restatement', clientName: 'Chen Family',
    activityCode: 'MEETING', activityLabel: 'Meeting / Call',
    description: 'Trust restatement signing meeting with the Chen family; reviewed final dispositive provisions.',
    durationMinutes: 73, status: 'approved', daysAgo: 16, hourOfDay: 15,
  },
  {
    attorneyId: 'user-ryan', attorneyName: 'Ryan Melade', attorneyEmail: 'ryan@hartwell.com',
    matterName: 'Robertson Healthcare Compliance Audit', clientName: 'Robertson Healthcare',
    activityCode: 'COMM_CLI', activityLabel: 'Client Communication',
    description: 'Compliance officer briefing on HIPAA audit findings and 90-day remediation roadmap.',
    durationMinutes: 54, status: 'approved', daysAgo: 18, hourOfDay: 11,
  },
  {
    attorneyId: 'user-maria', attorneyName: 'Maria Torres', attorneyEmail: 'maria@hartwell.com',
    matterName: 'TechStart Q4 Due Diligence', clientName: 'TechStart Inc',
    activityCode: 'REVIEW', activityLabel: 'Document Review',
    description: 'Reviewed TechStart’s open-source license inventory; flagged GPLv3 dependency in core product.',
    durationMinutes: 39, status: 'approved', daysAgo: 19, hourOfDay: 13,
  },
];

function ceilToIncrement(minutes: number, incrementMinutes: number): { billableMinutes: number; billableHours: number } {
  const m = Math.ceil(minutes / incrementMinutes) * incrementMinutes;
  return { billableMinutes: m, billableHours: +(m / 60).toFixed(2) };
}

export function buildDemoBillingEvents(): BillingEvent[] {
  const orgId = 'org-hartwell';
  return TEMPLATES.map((t, idx) => {
    const endedAt = new Date();
    endedAt.setDate(endedAt.getDate() - t.daysAgo);
    endedAt.setHours(t.hourOfDay, Math.floor(Math.random() * 60), 0, 0);
    const startedAt = new Date(endedAt.getTime() - t.durationMinutes * 60 * 1000);
    const createdAt = new Date(endedAt.getTime() + 60 * 1000);
    const { billableMinutes, billableHours } = ceilToIncrement(t.durationMinutes, 6);

    return {
      id: `evt-demo-${idx}-${Date.now()}`,
      attorneyId: t.attorneyId,
      attorneyName: t.attorneyName,
      attorneyEmail: t.attorneyEmail,
      orgId,
      matterName: t.matterName,
      clientName: t.clientName,
      activityCode: t.activityCode,
      activityLabel: t.activityLabel,
      description: t.description,
      billable: t.billable !== false,
      durationSeconds: t.durationMinutes * 60,
      billableMinutes,
      billableHours,
      rateIncrementMinutes: 6,
      status: t.status,
      threadId: `thread-demo-${idx}`,
      threadTitle: t.matterName,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      createdAt: createdAt.toISOString(),
      notes: t.notes,
    };
  });
}
