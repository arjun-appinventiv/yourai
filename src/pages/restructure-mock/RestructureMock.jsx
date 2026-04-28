// ─── Restructure Mock — Pillars A / B / C / D ───
//
// Static, click-through-only mockups for the brainstormed UX restructure
// (matter-as-home, vocabulary cleanup, universal doc browser, onboarding).
// No real data wiring — every value below is inline mock.
//
// Mounted at /mock/restructure (unprotected). Delete this file + the
// route in App.jsx when the conversation moves on or these mocks are
// promoted into real screens.

import React, { useState } from 'react';
import {
  Briefcase, MessageSquare, FileText, Folder, FolderOpen, Search, Plus,
  Filter, Calendar, User, Download, ArrowRight, Sparkles, Zap, BookOpen,
  Settings, ChevronRight, X, CheckCircle, Building2, Scale, Clock,
  Users, Package, FileSearch, Star, Upload, MoreVertical, ArrowUpRight,
  Hash, Inbox,
} from 'lucide-react';

const NAVY = '#0A2463';
const GOLD = '#C9A84C';
const ICE  = '#F8F4ED';
const BORDER = '#E5E7EB';
const TEXT_PRIMARY   = '#0F172A';
const TEXT_SECONDARY = '#475569';
const TEXT_MUTED     = '#64748B';

const SERIF = "'DM Serif Display', serif";
const SANS  = "'DM Sans', sans-serif";
const MONO  = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// ─── Mock data ────────────────────────────────────────────────────────

const MOCK_MATTERS = [
  {
    id: 1, name: 'Acme Corp — SaaS MSA',
    client: 'Acme Corporation', stage: 'Active', accent: '#5B21B6',
    lastTouched: '12 min ago', docs: 8, runs: 3,
    lastChat: 'Reviewed indemnification provisions in §7.2 — flagged uncapped exposure on third-party IP.',
    you: 'You · 3 colleagues',
  },
  {
    id: 2, name: 'Smith v. Jones — Employment',
    client: 'Maria Smith (plaintiff)', stage: 'Discovery', accent: '#9A3412',
    lastTouched: '2h ago', docs: 14, runs: 7,
    lastChat: 'Drafted requests for production targeting Jones\' email archive 2023–2025.',
    you: 'You only',
  },
  {
    id: 3, name: 'Series B — Ridgeline Ventures',
    client: 'Northstar Robotics', stage: 'Term sheet', accent: '#0F2E59',
    lastTouched: 'Yesterday', docs: 6, runs: 2,
    lastChat: 'Compared 3x liquidation preference against current portfolio standards.',
    you: 'You · 2 colleagues',
  },
  {
    id: 4, name: 'Fairmount Lease Renewal',
    client: 'Fairmount Properties', stage: 'Negotiation', accent: '#5CA868',
    lastTouched: '2 days ago', docs: 4, runs: 1,
    lastChat: 'Pulled comparable CAM clauses from 3 prior leases; market-typical ranges noted.',
    you: 'You only',
  },
  {
    id: 5, name: 'GDPR Audit — EU Subsidiary',
    client: 'BlueRiver Health Inc.', stage: 'Active', accent: '#9333EA',
    lastTouched: '4 days ago', docs: 11, runs: 5,
    lastChat: 'Built Article 28 processor checklist; 3 sub-processors missing DPA confirmation.',
    you: 'You · Compliance team',
  },
  {
    id: 6, name: 'Trademark Opposition — KORE',
    client: 'KORE Apparel', stage: 'Filed', accent: '#E8A33D',
    lastTouched: '1 week ago', docs: 3, runs: 0,
    lastChat: 'Searched USPTO TESS for confusingly similar marks in Class 25.',
    you: 'You only',
  },
];

const MOCK_DOCS = [
  { id: 1, name: 'MSA_Acme_Corp_v4.pdf',           matter: 'Acme Corp — SaaS MSA',    uploader: 'You',          date: '2 days ago',  size: '2.4 MB', type: 'PDF',  folder: 'Contracts' },
  { id: 2, name: 'Indemnification_redline_v2.docx', matter: 'Acme Corp — SaaS MSA',    uploader: 'Priya Shah',   date: '3 days ago',  size: '0.8 MB', type: 'DOCX', folder: 'Contracts' },
  { id: 3, name: 'Smith_employment_contract.pdf',   matter: 'Smith v. Jones',          uploader: 'You',          date: '5 days ago',  size: '1.1 MB', type: 'PDF',  folder: 'Employment' },
  { id: 4, name: 'Discovery_requests_draft.docx',   matter: 'Smith v. Jones',          uploader: 'You',          date: '6 days ago',  size: '0.4 MB', type: 'DOCX', folder: 'Litigation' },
  { id: 5, name: 'Series_B_term_sheet_signed.pdf',  matter: 'Series B — Ridgeline',    uploader: 'Ryan Melade',  date: 'Mar 22',      size: '0.6 MB', type: 'PDF',  folder: 'Financing' },
  { id: 6, name: 'Cap_table_post-money.xlsx',       matter: 'Series B — Ridgeline',    uploader: 'Ryan Melade',  date: 'Mar 21',      size: '0.3 MB', type: 'XLSX', folder: 'Financing' },
  { id: 7, name: 'Fairmount_lease_2024.pdf',        matter: 'Fairmount Lease Renewal', uploader: 'You',          date: 'Mar 18',      size: '3.2 MB', type: 'PDF',  folder: 'Real Estate' },
  { id: 8, name: 'Comp_lease_Riverside.pdf',        matter: 'Fairmount Lease Renewal', uploader: 'Priya Shah',   date: 'Mar 18',      size: '2.8 MB', type: 'PDF',  folder: 'Real Estate' },
  { id: 9, name: 'GDPR_Article_28_checklist.docx',  matter: 'GDPR Audit — EU',         uploader: 'You',          date: 'Mar 15',      size: '0.2 MB', type: 'DOCX', folder: 'Compliance' },
  { id: 10, name: 'Sub-processor_inventory.xlsx',   matter: 'GDPR Audit — EU',         uploader: 'Compliance',   date: 'Mar 14',      size: '0.5 MB', type: 'XLSX', folder: 'Compliance' },
  { id: 11, name: 'KORE_application_serial.pdf',    matter: 'Trademark — KORE',        uploader: 'You',          date: 'Mar 8',       size: '0.9 MB', type: 'PDF',  folder: 'IP' },
  { id: 12, name: 'TESS_search_results.pdf',        matter: 'Trademark — KORE',        uploader: 'You',          date: 'Mar 7',       size: '1.4 MB', type: 'PDF',  folder: 'IP' },
];

const ALL_MATTERS = ['All matters', ...MOCK_MATTERS.map((m) => m.name)];
const ALL_UPLOADERS = ['Anyone', 'You', 'Priya Shah', 'Ryan Melade', 'Compliance'];
const ALL_TYPES = ['All types', 'PDF', 'DOCX', 'XLSX'];
const ALL_FOLDERS = ['All folders', 'Contracts', 'Employment', 'Litigation', 'Financing', 'Real Estate', 'Compliance', 'IP'];

// ─── Shared bits ──────────────────────────────────────────────────────

function PillarBadge({ letter, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#9A7A22', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: MONO }}>
      <span style={{ width: 18, height: 18, borderRadius: 999, background: GOLD, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{letter}</span>
      {children}
    </span>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontFamily: SERIF, fontSize: 28, color: TEXT_PRIMARY, margin: '8px 0 4px', letterSpacing: '-0.01em' }}>{children}</h2>
  );
}

function SectionLead({ children }) {
  return (
    <p style={{ fontSize: 14, color: TEXT_SECONDARY, lineHeight: 1.6, maxWidth: 720, margin: '0 0 28px' }}>{children}</p>
  );
}

// ─── Pillar A — Matters Home ──────────────────────────────────────────

function PillarA() {
  return (
    <div>
      <PillarBadge letter="A">Matters Home</PillarBadge>
      <SectionTitle>What attorneys see right after login</SectionTitle>
      <SectionLead>
        The home becomes a list of the matters you're actively working on, not a blank chat.
        Click a matter → all chats, docs, workflows scoped to it. "General chat" is still there
        for one-off legal Q&A but it's not the front door anymore.
      </SectionLead>

      {/* Mock chrome — fake browser */}
      <div style={{ borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 40px rgba(15,23,42,0.08)', border: `1px solid ${BORDER}` }}>
        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 22px', borderBottom: `1px solid ${BORDER}`, background: 'white' }}>
          <span style={{ fontFamily: SERIF, fontSize: 16 }}><span style={{ color: NAVY }}>Your</span><span style={{ color: GOLD }}>AI</span></span>
          <span style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Marsh, Bell & Co LLP</span>
          <div style={{ width: 30, height: 30, borderRadius: 999, background: NAVY, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>AS</div>
        </div>

        {/* Body */}
        <div style={{ padding: '40px 60px 56px', background: ICE, minHeight: 640 }}>
          {/* Hero */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Sparkles size={16} style={{ color: GOLD }} />
              <span style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tuesday · April 27</span>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: 36, color: TEXT_PRIMARY, margin: 0, letterSpacing: '-0.015em' }}>
              Welcome back, Alex.
            </h1>
            <p style={{ fontSize: 15, color: TEXT_SECONDARY, marginTop: 8, lineHeight: 1.6 }}>
              You have 6 active matters. Pick up where you left off, or start something new.
            </p>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Active matters', value: '6', icon: Briefcase },
              { label: 'Chats this week', value: '24', icon: MessageSquare },
              { label: 'Docs in your library', value: '47', icon: FileText },
              { label: 'Workflows run', value: '18', icon: Zap },
            ].map((s) => (
              <div key={s.label} style={{ flex: 1, padding: '14px 18px', borderRadius: 12, background: 'white', border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 4 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 26, color: NAVY }}>{s.value}</span>
                  <s.icon size={14} style={{ color: TEXT_MUTED, marginBottom: 6 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Matters section */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your matters</div>
              <h3 style={{ fontFamily: SERIF, fontSize: 22, color: TEXT_PRIMARY, margin: '4px 0 0' }}>Pick up where you left off</h3>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'white', fontSize: 12, color: TEXT_SECONDARY, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare size={13} /> General chat
              </button>
              <button style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: NAVY, color: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={13} /> New matter
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 14 }}>
            {MOCK_MATTERS.map((m) => (
              <div key={m.id} style={{ borderRadius: 14, background: 'white', border: `1px solid ${BORDER}`, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ height: 3, background: m.accent }} />
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: m.accent, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{m.stage}</span>
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>{m.lastTouched}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 2, fontFamily: SANS }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 12 }}>{m.client}</div>
                  <p style={{ fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 1.55, margin: '0 0 14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.lastChat}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: TEXT_MUTED }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FileText size={11} /> {m.docs}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Zap size={11} /> {m.runs}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Users size={11} /> {m.you}</span>
                    </div>
                    <ArrowRight size={14} style={{ color: NAVY }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CallOut title="Why this works">
        Every doc and chat is scoped by matter automatically. The attorney never has to think
        "which knowledge pack should I attach?" — the matter IS the context. Knowledge Pack /
        Vault / Workspace stop colliding because the matter is the only frame.
      </CallOut>
    </div>
  );
}

// ─── Pillar B — Library Reframe + Sidebar Cleanup ─────────────────────

function PillarB() {
  return (
    <div>
      <PillarBadge letter="B">Library Reframe</PillarBadge>
      <SectionTitle>Retire "Vault" and "Knowledge Pack" — call it Library</SectionTitle>
      <SectionLead>
        Three nouns the attorney can't keep straight (Vault / Pack / KB) collapse into two:
        <strong> Library</strong> (your stuff) and <strong>Reference</strong> (firm-wide).
        Knowledge Packs become saved selections inside Library — not a separate object.
      </SectionLead>

      {/* Sidebar before/after comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 36 }}>
        {/* Before */}
        <div>
          <div style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Before — 7 nav items, 3 overlapping nouns</div>
          <div style={{ borderRadius: 14, border: `1px solid ${BORDER}`, background: 'white', padding: '16px 0', maxWidth: 280 }}>
            {[
              { icon: LayoutSquare, label: 'Dashboard' },
              { icon: Briefcase, label: 'Workspaces', muted: false },
              { icon: Users, label: 'Clients' },
              { icon: User, label: 'Invite Team' },
              { divider: true, label: 'Knowledge' },
              { icon: FolderOpen, label: 'YourVault', highlight: '#FCD34D' },
              { icon: Package, label: 'Knowledge packs', highlight: '#FCD34D' },
              { icon: Zap, label: 'Workflows' },
              { icon: FileText, label: 'Prompt templates' },
              { divider: true, label: 'Admin' },
              { icon: Hash, label: 'Audit Logs' },
              { icon: Settings, label: 'Billing' },
            ].map((it, i) => it.divider ? (
              <div key={i} style={{ padding: '10px 18px 4px', fontSize: 9, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{it.label}</div>
            ) : (
              <div key={i} style={{ padding: '7px 18px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: TEXT_SECONDARY, background: it.highlight ? 'rgba(252,211,77,0.18)' : 'transparent' }}>
                <it.icon size={14} />
                {it.label}
              </div>
            ))}
          </div>
        </div>

        {/* After */}
        <div>
          <div style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>After — 4 nav items, plain English</div>
          <div style={{ borderRadius: 14, border: `1px solid ${BORDER}`, background: 'white', padding: '16px 0', maxWidth: 280 }}>
            {[
              { icon: Briefcase,  label: 'Matters',     sub: '6 active' },
              { icon: BookOpen,   label: 'Library',     sub: '47 docs · 5 bundles', highlight: 'rgba(94,200,168,0.18)' },
              { icon: Zap,        label: 'Workflows',   sub: '12 templates' },
              { icon: FileSearch, label: 'Find',        sub: 'Search everything' },
              { divider: true, label: 'Workspace' },
              { icon: User,       label: 'My team' },
              { icon: Settings,   label: 'Settings' },
            ].map((it, i) => it.divider ? (
              <div key={i} style={{ padding: '10px 18px 4px', fontSize: 9, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{it.label}</div>
            ) : (
              <div key={i} style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 10, background: it.highlight || 'transparent' }}>
                <it.icon size={15} style={{ color: NAVY }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: TEXT_PRIMARY, fontWeight: 500 }}>{it.label}</div>
                  {it.sub && <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{it.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Library page mock */}
      <div style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>The new Library page</div>
      <div style={{ borderRadius: 14, border: `1px solid ${BORDER}`, background: 'white', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '22px 28px 18px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase' }}>My Library</div>
          <h3 style={{ fontFamily: SERIF, fontSize: 24, color: TEXT_PRIMARY, margin: '4px 0 0' }}>Everything you've uploaded</h3>
          <p style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 6, lineHeight: 1.6, maxWidth: 600 }}>
            Your personal library + anything your firm has shared org-wide. Group docs into folders,
            or save a multi-doc selection as a "bundle" to attach in chat with one click.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'white', fontSize: 12, color: TEXT_SECONDARY, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={12} /> New folder
            </button>
            <button style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'white', fontSize: 12, color: TEXT_SECONDARY, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star size={12} /> Save selection as bundle
            </button>
            <button style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: NAVY, color: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={12} /> Upload
            </button>
          </div>
        </div>

        {/* Folders + bundles row */}
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Folders</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {[
              { name: 'Contracts',      count: 8, icon: Folder },
              { name: 'Litigation',     count: 5, icon: Folder },
              { name: 'Compliance',     count: 4, icon: Folder },
              { name: 'IP & Trademarks', count: 3, icon: Folder },
              { name: 'Real Estate',    count: 6, icon: Folder },
            ].map((f) => (
              <div key={f.name} style={{ padding: '12px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <f.icon size={16} style={{ color: NAVY }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>{f.count} docs</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            Saved bundles
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: 'rgba(201,168,76,0.18)', color: '#9A7A22', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              was: knowledge packs
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {[
              { name: 'Acme Corp deal pack',      count: 4, last: '2d' },
              { name: 'GDPR processor templates', count: 6, last: '1w' },
              { name: 'NY non-compete library',   count: 8, last: '3w' },
            ].map((b) => (
              <div key={b.name} style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: ICE, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Star size={14} style={{ color: GOLD }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>{b.count} docs · used {b.last} ago</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 28px', fontSize: 11, color: TEXT_MUTED }}>
          ↓ Below the fold: flat doc list (same look as today's vault).
        </div>
      </div>

      <CallOut title="Why this works">
        "Knowledge Pack" was always a poor name — it sounded like a Microsoft product. Calling
        them <em>bundles</em> and parking them inside Library kills the third noun. The attorney
        only has to learn two ideas: my stuff (Library) and firm-wide reference (separate).
      </CallOut>
    </div>
  );
}

// LayoutSquare placeholder for the "before" sidebar
function LayoutSquare(props) { return <Hash {...props} />; }

// ─── Pillar C — All Documents browser ─────────────────────────────────

function PillarC() {
  const [active, setActive] = useState({ matter: 'All matters', uploader: 'Anyone', type: 'All types', folder: 'All folders' });

  return (
    <div>
      <PillarBadge letter="C">All Documents</PillarBadge>
      <SectionTitle>One place to find any file the attorney has ever touched</SectionTitle>
      <SectionLead>
        Today: docs are scattered across Vault, workspace uploads, knowledge packs, and chat
        attachments. The attorney can't answer "where's that file I uploaded for Smith last month?"
        in less than five clicks. This page makes it one search.
      </SectionLead>

      <div style={{ borderRadius: 14, border: `1px solid ${BORDER}`, background: 'white', overflow: 'hidden' }}>
        {/* Search bar */}
        <div style={{ padding: '20px 24px 14px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Find</div>
          <h3 style={{ fontFamily: SERIF, fontSize: 24, color: TEXT_PRIMARY, margin: '4px 0 14px' }}>Search every document</h3>

          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED }} />
            <input
              placeholder='Search by name, contents, citation… try "Smith NDA" or "force majeure"'
              style={{ width: '100%', height: 44, borderRadius: 10, border: `1px solid ${BORDER}`, paddingLeft: 42, paddingRight: 14, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: SANS }}
            />
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <FilterChip icon={Briefcase} label="Matter"      value={active.matter}    options={ALL_MATTERS}   onPick={(v) => setActive({ ...active, matter: v })} />
            <FilterChip icon={User}      label="Uploaded by" value={active.uploader}  options={ALL_UPLOADERS} onPick={(v) => setActive({ ...active, uploader: v })} />
            <FilterChip icon={Calendar}  label="Date"        value="Anytime"          options={['Anytime', 'Past 7 days', 'Past 30 days', 'This year']} onPick={() => {}} />
            <FilterChip icon={FileText}  label="Type"        value={active.type}      options={ALL_TYPES}     onPick={(v) => setActive({ ...active, type: v })} />
            <FilterChip icon={Folder}    label="Folder"      value={active.folder}    options={ALL_FOLDERS}   onPick={(v) => setActive({ ...active, folder: v })} />
            <button style={{ padding: '6px 12px', borderRadius: 999, border: `1px dashed ${BORDER}`, background: 'transparent', fontSize: 12, color: TEXT_MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Plus size={11} /> More filters
            </button>
          </div>
        </div>

        {/* Result count + sort */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: `1px solid ${BORDER}`, background: ICE }}>
          <div style={{ fontSize: 12, color: TEXT_SECONDARY }}>
            <strong style={{ color: TEXT_PRIMARY }}>{MOCK_DOCS.length} documents</strong> · across 6 matters
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
            Sort: <strong style={{ color: TEXT_SECONDARY, fontWeight: 500 }}>Recently uploaded</strong>
            <ChevronRight size={11} style={{ transform: 'rotate(90deg)' }} />
          </div>
        </div>

        {/* Doc rows */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1.4fr 1fr 0.7fr 0.7fr 50px', gap: 12, alignItems: 'center', padding: '10px 24px', fontSize: 10, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}` }}>
            <div></div>
            <div>Name</div>
            <div>Matter</div>
            <div>Uploader</div>
            <div>Date</div>
            <div>Size</div>
            <div></div>
          </div>
          {MOCK_DOCS.map((d) => (
            <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1.4fr 1fr 0.7fr 0.7fr 50px', gap: 12, alignItems: 'center', padding: '12px 24px', borderBottom: `1px solid ${BORDER}`, fontSize: 13, cursor: 'pointer' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: ICE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={14} style={{ color: NAVY }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: TEXT_PRIMARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(10,36,99,0.06)', color: NAVY, fontSize: 10, fontWeight: 600 }}>{d.type}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Folder size={10} /> {d.folder}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.matter}</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>{d.uploader}</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>{d.date}</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>{d.size}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                <ArrowUpRight size={14} style={{ color: TEXT_MUTED }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <CallOut title="Why this works">
        Every chat-attached upload, every workspace doc, every personal vault doc shows up in
        one place with five filters that actually map to how attorneys think
        (<em>which client?</em> · <em>uploaded by who?</em> · <em>when?</em>). Solves the
        "where's that file" pain in one search.
      </CallOut>
    </div>
  );
}

function FilterChip({ icon: Icon, label, value, options }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, border: `1px solid ${BORDER}`, background: 'white', fontSize: 12, color: TEXT_SECONDARY, cursor: 'pointer' }}>
      <Icon size={11} style={{ color: TEXT_MUTED }} />
      <span style={{ color: TEXT_MUTED }}>{label}:</span>
      <strong style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>{value}</strong>
      <ChevronRight size={11} style={{ transform: 'rotate(90deg)', color: TEXT_MUTED }} />
    </span>
  );
}

// ─── Pillar D — Onboarding Coachmarks ─────────────────────────────────

function PillarD() {
  return (
    <div>
      <PillarBadge letter="D">First-Run Tour</PillarBadge>
      <SectionTitle>30-second orientation, dismissible, re-runnable</SectionTitle>
      <SectionLead>
        Three coachmarks layered over the home page on first login. Skips the "what is this app"
        confusion in under a minute. Re-runnable from a <code style={{ padding: '1px 6px', borderRadius: 4, background: ICE, fontFamily: MONO, fontSize: 12 }}>?</code> button in the topbar.
      </SectionLead>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {[
          {
            n: 1, title: 'Your matters live here',
            body: 'Each matter holds its own chats, docs, and workflows. Click in, and everything stays scoped to that client.',
            anchor: 'highlights the Matters sidebar item',
          },
          {
            n: 2, title: 'Drop a doc, ask anything',
            body: 'Hit the + next to the input to upload a contract, NDA, or memo. The AI works directly with what you upload.',
            anchor: 'highlights the + button next to the input',
          },
          {
            n: 3, title: 'One library for everything',
            body: 'Every file you upload lands in your Library. Search across matters, filter by client or date, find anything in seconds.',
            anchor: 'highlights the Library sidebar item',
          },
        ].map((s) => (
          <div key={s.n} style={{ borderRadius: 14, background: 'white', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            {/* Phantom screen */}
            <div style={{ height: 160, background: ICE, position: 'relative', borderBottom: `1px solid ${BORDER}` }}>
              {/* Fake sidebar suggestion */}
              <div style={{ position: 'absolute', top: 12, left: 12, width: 80, height: 136, borderRadius: 8, background: 'white', border: `1px solid ${BORDER}`, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ height: 8, background: i === s.n ? GOLD : '#E5E7EB', borderRadius: 4, opacity: i === s.n ? 1 : 0.4 }} />
                ))}
              </div>
              {/* Coachmark bubble */}
              <div style={{ position: 'absolute', top: 24, left: 110, padding: '10px 14px', borderRadius: 10, background: NAVY, color: 'white', fontSize: 11, maxWidth: 160, lineHeight: 1.5, boxShadow: '0 8px 20px rgba(10,36,99,0.25)' }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Step {s.n} of 3</div>
                {s.title}
              </div>
              {/* Pointer arrow */}
              <div style={{ position: 'absolute', top: 30, left: 100, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: `8px solid ${NAVY}` }} />
            </div>
            {/* Caption */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Step {s.n} · {s.anchor}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginTop: 4, fontFamily: SANS }}>{s.title}</div>
              <p style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginTop: 4, lineHeight: 1.55, marginBottom: 10 }}>{s.body}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 11, color: TEXT_MUTED }}>Skip tour</span>
                <span style={{ fontSize: 11, color: NAVY, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {s.n === 3 ? 'Got it' : 'Next'} <ArrowRight size={11} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CallOut title="Why this works">
        The first 90 seconds of a new SaaS app is where the most abandonment happens. Three
        coachmarks fill exactly that window without becoming a tutorial. The same overlay is
        re-triggerable later from a <code style={{ padding: '1px 6px', borderRadius: 4, background: ICE, fontFamily: MONO, fontSize: 12 }}>?</code> button — so an attorney who skipped on day one can come back to it.
      </CallOut>
    </div>
  );
}

// ─── Shared callout ───────────────────────────────────────────────────

function CallOut({ title, children }) {
  return (
    <div style={{ marginTop: 28, padding: '18px 22px', borderRadius: 12, background: ICE, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 10, color: '#9A7A22', fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{title}</div>
      <p style={{ fontSize: 13.5, color: TEXT_SECONDARY, lineHeight: 1.65, margin: '6px 0 0' }}>{children}</p>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────

const TABS = [
  { id: 'a', label: 'A · Matters Home',     summary: 'Workspaces become the front door',           cmp: PillarA },
  { id: 'b', label: 'B · Library Reframe',  summary: 'Vault + Packs collapse into "Library"',     cmp: PillarB },
  { id: 'c', label: 'C · All Documents',    summary: 'Universal doc browser w/ filters',           cmp: PillarC },
  { id: 'd', label: 'D · Onboarding',       summary: '3-step coachmark tour on first login',       cmp: PillarD },
];

export default function RestructureMock() {
  const [tab, setTab] = useState('a');
  const Active = TABS.find((t) => t.id === tab)?.cmp || PillarA;

  return (
    <div style={{ minHeight: '100vh', background: '#FAFBFC', fontFamily: SANS, color: TEXT_PRIMARY }}>
      {/* Page header */}
      <div style={{ background: 'white', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 40px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Sparkles size={14} style={{ color: GOLD }} />
            <span style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Brainstorm · For Arjun review</span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 34, margin: 0, letterSpacing: '-0.015em' }}>
            UX restructure mocks — based on the attorney interview
          </h1>
          <p style={{ fontSize: 14, color: TEXT_SECONDARY, lineHeight: 1.6, marginTop: 8, maxWidth: 720 }}>
            Four pillars from the brainstorm: matters as the home, vocabulary cleanup, a real
            doc browser, and a first-run tour. Static layouts only — none of the buttons here
            are wired. Use them to pick which direction to actually build.
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginTop: 22, borderBottom: `1px solid ${BORDER}`, marginBottom: -23 }}>
            {TABS.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '10px 18px 14px',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? NAVY : TEXT_MUTED,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderBottom: isActive ? `2px solid ${NAVY}` : '2px solid transparent',
                    fontFamily: SANS,
                  }}
                >
                  {t.label}
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: TEXT_MUTED, marginTop: 2 }}>{t.summary}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab body */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 40px 80px' }}>
        <Active />
      </div>
    </div>
  );
}
