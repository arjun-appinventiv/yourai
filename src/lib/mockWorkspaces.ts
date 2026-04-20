// ─── Mock workspace seed data ────────────────────────────────────────────
//
// Seeded into localStorage on first load of the workspaces page so the
// demo feels populated. User IDs match the demo seeds in src/lib/auth.ts
// and src/components/chat/TeamPage.jsx so member rows resolve sensibly.

import type { Workspace } from './workspace';

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: 'ws-meridian-apex',
    name: 'Meridian Capital v. Apex Ventures',
    description: 'Commercial litigation over a $42M SaaS licensing dispute. Trial scheduled for Q3 2026.',
    createdBy: 'user-ryan',
    createdAt: 'Apr 4, 2026',
    deletedAt: null,
    members: [
      { userId: 'user-ryan', name: 'Ryan Melade',  email: 'ryan@hartwell.com',  role: 'org_admin',     addedAt: 'Apr 4, 2026',  addedBy: 'self' },
      { userId: 'm-002',     name: 'Priya Shah',   email: 'priya@hartwell.com', role: 'internal_user', addedAt: 'Apr 5, 2026',  addedBy: 'Ryan Melade' },
      { userId: 'm-003',     name: 'Kevin Marlowe', email: 'kevin@hartwell.com', role: 'internal_user', addedAt: 'Apr 10, 2026', addedBy: 'Ryan Melade' },
    ],
    documents: [
      { id: 'doc-mc-001', name: 'Master_Services_Agreement_v4.pdf', size: 2_450_000, type: 'pdf',  uploadedBy: 'user-ryan', uploadedByName: 'Ryan Melade', uploadedAt: 'Apr 4, 2026',  status: 'ready' },
      { id: 'doc-mc-002', name: 'Deposition_Transcript_Hastings.docx', size: 580_000, type: 'docx', uploadedBy: 'm-002', uploadedByName: 'Priya Shah', uploadedAt: 'Apr 7, 2026', status: 'ready' },
      { id: 'doc-mc-003', name: 'Damages_Model_Q1.xlsx', size: 310_000, type: 'xlsx', uploadedBy: 'm-003', uploadedByName: 'Kevin Marlowe', uploadedAt: 'Apr 11, 2026', status: 'ready' },
      { id: 'doc-mc-004', name: 'Supplemental_Exhibit_List.pdf', size: 1_120_000, type: 'pdf',  uploadedBy: 'user-ryan', uploadedByName: 'Ryan Melade', uploadedAt: 'Apr 18, 2026', status: 'processing' },
    ],
  },
  {
    id: 'ws-harper-trust',
    name: 'Harper Family Trust Formation',
    description: 'Estate planning for a multi-generational family trust. Drafting articles and funding schedule.',
    createdBy: 'm-002',
    createdAt: 'Apr 5, 2026',
    deletedAt: null,
    members: [
      { userId: 'm-002',     name: 'Priya Shah',   email: 'priya@hartwell.com', role: 'internal_user', addedAt: 'Apr 5, 2026', addedBy: 'self' },
      { userId: 'user-ryan', name: 'Ryan Melade',  email: 'ryan@hartwell.com',  role: 'org_admin',     addedAt: 'Apr 5, 2026', addedBy: 'Priya Shah' },
      { userId: 'm-003',     name: 'Kevin Marlowe', email: 'kevin@hartwell.com', role: 'internal_user', addedAt: 'Apr 6, 2026', addedBy: 'Priya Shah' },
    ],
    documents: [
      { id: 'doc-hf-001', name: 'Trust_Articles_Draft_v2.docx', size: 410_000, type: 'docx', uploadedBy: 'm-002', uploadedByName: 'Priya Shah', uploadedAt: 'Apr 6, 2026',  status: 'ready' },
      { id: 'doc-hf-002', name: 'Asset_Inventory.xlsx',        size: 180_000, type: 'xlsx', uploadedBy: 'm-003', uploadedByName: 'Kevin Marlowe', uploadedAt: 'Apr 9, 2026',  status: 'ready' },
    ],
  },
  {
    id: 'ws-acme-portal',
    name: 'Acme Corp — Client Portal',
    description: 'Shared workspace giving Acme counsel a collaboration surface for ongoing matters.',
    createdBy: 'user-ryan',
    createdAt: 'Apr 11, 2026',
    deletedAt: null,
    members: [
      { userId: 'user-ryan', name: 'Ryan Melade',       email: 'ryan@hartwell.com',    role: 'org_admin',     addedAt: 'Apr 11, 2026', addedBy: 'self' },
      { userId: 'm-004',     name: 'Acme Corp (Client)', email: 'liaison@acmecorp.com', role: 'external_user', addedAt: 'Apr 11, 2026', addedBy: 'Ryan Melade' },
    ],
    documents: [
      { id: 'doc-ac-001', name: 'Engagement_Letter.pdf', size: 220_000, type: 'pdf', uploadedBy: 'user-ryan', uploadedByName: 'Ryan Melade', uploadedAt: 'Apr 11, 2026', status: 'ready' },
    ],
  },
];
