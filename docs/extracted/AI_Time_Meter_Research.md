# AI-Time Meter — Research & Proposed System

**Status:** v1 implemented · ChatView-only (workspace integration out of scope for now)
**Author:** Claude (with Arjun)
**Last updated:** 2026-05-19

---

## 1. Why this exists

Every US attorney already tracks time manually — typically in Clio, MyCase, LeanLaw, Bill4Time, or CosmoLex. They hate it. The biggest source of friction:

1. **Remembering to start a timer** before you start the work.
2. **Writing the description** after you finish (especially for short tasks).
3. **Picking the activity / task code** that the e-billing portal will accept.

YourAI sees the work happen — every chat message is evidence of legal work being performed. The AI-time meter exploits that: the timer starts automatically on the first chat message, runs while the conversation is active, pauses on idle, and at session end produces a fully-drafted billable event with an AI-generated description and a suggested activity code. The attorney reviews, edits, and approves. The firm bills the client. **YourAI is just the timer + auto-summary — the billing relationship stays between the firm and the client.**

This is a single-tenant feature: each firm's events live in their tenant; the org-admin sees only their own attorneys.

---

## 2. Competitor scan — what we copied, what we avoided

Research drawn from each vendor's official help docs, marketing pages, and 2024–2026 release notes. (Full source list at end.)

### 2.1 Clio (clio.com)

**Timer UX**
- Live timer in the **global header** of the web app (clock icon, top-right).
- Click → slide-out time-entry panel; timer keeps ticking in the header even with the panel closed.
- **Multiple timers** allowed but managed from a separate timekeeper screen.
- **No native idle detection** — Clio offloads this to integrations (Chrometa, WiseTime, MagicTime, Memtime).

**Time entry fields**
Required: Matter, Date, Duration, Firm User. Optional/auto: Activity Category (or UTBMS task + activity if e-billing is enabled per firm/matter), Description (free text), Non-billable flag, Rate (auto via rate hierarchy: custom > flat > matter > client > activity > user default).

**Rounding**
Default 0.1 hr (6 min), firm-configurable.

**Activity codes**
Custom firm Activity Categories by default; UTBMS task + activity codes can be enabled per firm or per matter for e-billing.

**Novel feature — Clio Manage AI (formerly Clio Duo, GA 2025)**
- **Proactively surfaces unlogged time** as "AI Action Cards" on the matter dashboard.
- **Auto-generates polished entry descriptions** from calls/notes/tasks/documents.
- **Refines tone/typos** for client-facing clarity.
- Controversial **2:00 AM PT auto-cutoff**: books suggestions if not dismissed by the attorney.

**Sources:**
- https://help.clio.com/hc/en-us/articles/9289741706779-Time-Entries
- https://help.clio.com/hc/en-us/articles/29764998990491-Manage-AI-Automate-Billing-and-Expense-Entry
- https://www.clio.com/blog/ai-time-tracking-for-lawyers/

**Screenshots to capture:** `clio-time-entry-panel.png`, `clio-manage-ai-action-card.png` (see capture script in §6).

---

### 2.2 LeanLaw (leanlaw.co)

**Timer UX**
Three surfaces: web Timers tab, **dedicated desktop tracker app**, and mobile. **Multiple simultaneous timers** supported (start/pause/resume each independently). User converts a timer into a time entry when done. No native idle popup; passive capture via **Billables AI** integration (emails, docs, Zoom, calendar).

**Time entry fields**
Matter, attorney, duration, activity (UTBMS optional), description (free text), billable Y/N, rate inherited from a hierarchy.

**Rounding**
0.1 hr default round-up; firm-level toggle to 0.25 hr for jurisdictions requiring quarter-hour.

**Activity codes**
Custom firm activities + full **UTBMS/LEDES** code library.

**Approval workflow** (we copied this)
Draft → Approved / Interim → Final, with QuickBooks sync gated on approval. Time can't be exported until an attorney signs off.

**Export**
Print/PDF + Excel from any grid; invoice-level **LEDES 1998B** (single or zipped per-invoice).

**Sources:**
- https://support.myleanlaw.co/en/articles/9232194-entering-time-with-the-calendar-and-timers
- http://support.leanlaw.co/getting-started-with-leanlaw/first-steps/tracking-time-with-leanlaw-desktop-tracker
- https://billables.ai/integrations/leanlaw

**Screenshots to capture:** `leanlaw-timers-tab.png`, `leanlaw-approval-workflow.png`.

---

### 2.3 Bill4Time (bill4time.com)

**Timer UX**
**Clock icon in upper-right of every screen** opens a timer menu. **Multiple concurrent timers** as an explicit selling point. Pause/resume on each. No documented idle detection.

**Time entry fields**
Matter/Client, Activity Type (ABA dropdown or custom), free-text description, manual Labor Time override, billable flag, rate.

**Rounding**
Configurable Timer Interval (rounds **up** to next increment on conversion). Supports 0.1, 0.25, and others; manual override per entry.

**Activity codes**
Ships full **ABA/UTBMS task code list** (locked for LEDES compatibility) plus editable custom Activity Types.

**Export**
Configurable daily/weekly grid; Excel from any grid; **LEDES 1998B** on the Legal Pro tier.

**Sources:**
- https://support.bill4time.com/hc/en-us/articles/204250560-Create-Timers
- https://support.bill4time.com/hc/en-us/articles/204250620-Change-Timer-Interval
- https://www.bill4time.com/blog/announcing-ledes-export/

**Screenshots to capture:** `bill4time-timer-menu.png`, `bill4time-timer-interval-settings.png`.

---

### 2.4 CosmoLex (cosmolex.com)

**Timer UX**
**Global Timer** in the top bar, available on web + mobile. **Strictly one timer at a time** by design — starting a new timer auto-pauses the previous to prevent double-billing. Timers persist across devices (start on web, stop on mobile).

**Time entry fields**
Matter, Timekeeper, Activity Code (UTBMS task+activity if e-billing on), Description, Duration, Billable status (firm-defaultable as of 2025), Rate.

**Rounding**
"Min Timer Unit" defaults to 6 min / 0.1 hr; can be changed or set to **1 minute** for actual time.

**Activity codes**
Custom activity codes by default; **UTBMS task/activity/expense codes** auto-enabled when e-billing is on.

**Export**
PDF/Excel + **LEDES 1998B + XML** for e-billing.

**Sources:**
- https://support.cosmolex.com/knowledge-base/using-global-timer/
- https://support.cosmolex.com/knowledge-base/timecard-field-descriptions/
- https://kb.cosmolex.com/support/solutions/articles/19000028529-program-settings

**Screenshots to capture:** `cosmolex-global-timer.png`, `cosmolex-timecard-form.png`.

---

### 2.5 What we copied vs. avoided

| Decision | Source | Our implementation |
|---|---|---|
| Live HH:MM:SS pill in top bar | Clio, Bill4Time, CosmoLex (universal) | `SessionTimerPill` mounted in `TopNav` right-side |
| Default round-up to 0.1 hr (6 min) | All four | `OrgBillingSettings.rateIncrementMinutes = 6`, configurable to 15 |
| **One timer at a time** (auto-pause prior) | CosmoLex | `sessionTimer.ts` singleton — `startOrResumeTimer()` discards a prior different-thread session |
| Activity-code dropdown (not free text) | All four | `DEFAULT_ACTIVITY_CATEGORIES` (10 entries); `UTBMS_ACTIVITY_PAIRS` (25 entries) behind e-billing toggle |
| AI-generated description, attorney edits | Clio Manage AI | `BillingDraftModal` calls `/api/chat` with a tightly-scoped system prompt; attorney must approve before save |
| Draft → Approved → Exported workflow | LeanLaw | `BillingEvent.status` lifecycle; CSV export does not auto-flip to exported (attorney clicks "Mark as exported") |
| **Idle pause (2 min)** | None do this natively in-app | We do it client-side and silently — no modal pop |
| **Avoid:** auto-post without review | Clio's 2 AM auto-cutoff is controversial | We *never* auto-post; the modal is the only path to save |
| **Avoid:** concurrent timers | Bill4Time, LeanLaw | Chat sessions are serial; concurrency invites double-billing complaints |
| **Avoid:** required matter at timer start | All four defer this | Matter is captured at draft-confirm time only |
| **Avoid:** exposing raw seconds in saved entry | — | Saved entry shows `formatBillable()` headline; raw seconds appears only in a "raw" tooltip on each row for audit |

---

## 3. Proposed system — what we built

### 3.1 Surface inventory

| Surface | Location | Audience |
|---|---|---|
| **`SessionTimerPill`** | Top-right of chat top-nav (`TopNav` in `ChatView.jsx`) | All attorneys |
| **`BillingDraftModal`** | Modal triggered on session end (new thread / sign-out / manual "End session") | The attorney who ran the session |
| **`MyTimePanel`** | Sibling panel inside ChatView, sidebar entry "My Time" | Each attorney sees only their own events |
| **`BillingTimePage`** | Org Admin portal, route `/app/time-billing`, sidebar "Time & Billing" | Org Admin (and Manager, view-only) — sees all attorneys' events |
| **OrgSettings → Time & Billing card** | `/app/settings` General tab | Org Admin |

### 3.2 Data model

```ts
// src/lib/aiTimeStore.ts
interface BillingEvent {
  id: string;
  attorneyId: string;
  attorneyName: string;
  attorneyEmail?: string;
  orgId?: string;
  matterName: string;            // required at save
  matterNumber?: string;
  clientName?: string;
  activityCode: string;          // 'RESEARCH' | 'L120-A104' | ...
  activityLabel: string;         // denormalized human label
  description: string;           // AI-drafted, attorney-edited
  durationSeconds: number;       // raw measured (audit only)
  billableMinutes: number;       // duration rounded UP to increment
  billableHours: number;         // billableMinutes / 60, 2dp
  rateIncrementMinutes: 6 | 15;  // snapshot of org setting at save
  status: 'draft' | 'approved' | 'exported';
  threadId: string;
  threadTitle?: string;
  startedAt: string;             // ISO
  endedAt: string;               // ISO
  createdAt: string;             // ISO
  updatedAt?: string;
  exportedAt?: string;
  notes?: string;
}

interface OrgBillingSettings {
  eBillingMode: boolean;            // false = custom, true = UTBMS
  rateIncrementMinutes: 6 | 15;
}
```

**Storage keys (localStorage, mock-API pattern):**
- `yourai_billing_events_v1`
- `yourai_billing_settings_v1`

### 3.3 Timer state machine

```
idle ──(first sendMessage)──> running
running ──(2 min no activity)──> paused
paused ──(next sendMessage)──> running
running ──(new thread / sign-out / End session)──> finalized → BillingDraftModal
paused  ──(new thread / sign-out / End session)──> finalized → BillingDraftModal
running ──(switch thread without finalize)──> drops prior session (defensive)
```

**Implementation** is a module-level singleton in `src/lib/sessionTimer.ts` (mirrors the `workflowRunner` pub-sub pattern). The `SessionTimerPill` subscribes; React re-renders every second when `running`. Idle detection runs in a `setInterval(1000)` that compares `now - lastActivityAt` against the 2-min threshold and freezes `accumulatedSeconds` at `lastActivityAt` (not `now`) — we don't bill the idle gap.

### 3.4 End-of-session flow (Clio Manage AI pattern)

1. Trigger: `handleNewThread`, sign-out, or `yourai:end-session` window event.
2. `finalizeTimer()` returns `{ threadId, threadTitle, startedAt, endedAt, durationSeconds }` and resets singleton.
3. `BillingDraftModal` opens with:
   - Duration band (raw HH:MM:SS + rounded billable hours)
   - Matter name (required, autofocus)
   - Matter number, Client (optional)
   - Activity dropdown (firm categories OR UTBMS, per `OrgBillingSettings.eBillingMode`)
   - Description — **auto-generated** via `/api/chat`:
     - System prompt: one sentence, 15-25 words, past tense, strong verb start, no "AI"/"chatbot" mention, no first person, neutral professional phrasing
     - User content: transcript of up to 30 messages truncated to 600 chars each
     - Streaming response drained client-side, defensive quote-strip
     - "Regenerate" button to re-run; on failure, deterministic stub `"Reviewed and analyzed material relating to <first user message>"`
   - Internal notes (optional, not on client invoice)
4. Two save paths:
   - **Save as draft** — status `draft`, must be approved before export
   - **Save & approve** — status `approved`, ready for monthly export
5. **Discard this session** — explicit, no save.

### 3.5 My Time panel (attorney's own view)

- Status tabs: All / Drafts / Approved / Exported (with counts)
- Search across matter / client / description / activity / notes
- KPI: entries count + billable total (filtered)
- Per-row actions: Approve (drafts only), Edit (in-place form), Delete
- "Mark as exported" bulk action available on the Approved tab
- CSV export — `my-time-{attorney}-{date}.csv`
- Empty-state: "Start a chat — the AI-time meter logs your work automatically."

### 3.6 Org Admin "Time & Billing" page

- KPIs: filtered entries, billable hours, attorneys count, approved-in-filter
- Filters: status tabs + attorney dropdown + date range (Today / 7d / 30d / MTD / All) + free-text search
- Table columns: Date · Attorney · Matter · Activity · Description · Billable · Status · Actions
- "Mark approved as exported" bulk action
- CSV export — `time-{attorney-or-all}-{date}.csv`
- Visible to Admin + Manager (Manager limited per `OrgSidebar.jsx`)

### 3.7 OrgSettings — Time & Billing card

Added to the **General** tab below "Organization Details":

- **E-Billing Mode (UTBMS)** toggle (default OFF)
  - OFF — attorneys pick from 10 plain-English firm categories
  - ON — attorneys pick from 25 UTBMS task + activity code pairings (L100-L500, A101-A111)
- **Rate Increment** dropdown
  - `0.1 hr (6 minutes)` (default)
  - `0.25 hr (15 minutes)`

Both persist to `yourai_billing_settings_v1`. Auto-saves on change (showToast confirms).

### 3.8 Exports

| Format | Status | Notes |
|---|---|---|
| **CSV** | ✅ shipped | 15-column schema; UTF-8 + RFC 4180 escaping |
| **PDF** | ❌ deferred | Use browser print on the table view for now (clean print stylesheet TODO) |
| **LEDES 1998B** | ❌ deferred | Wire when first insurance-defense firm flips e-billing on (`billingExport.ts` already structured for it) |

---

## 4. Out-of-scope / known gaps

- **Workspaces integration** — explicitly out of scope per Arjun's 2026-05-19 redirect; the timer runs only inside `/chat`, not `/chat/workspaces/:id`.
- **Mid-session matter switching** — the timer can't be re-tagged mid-conversation; the matter is captured at session-end. If an attorney works on Matter A then Matter B in the same chat thread, they need to start a new chat between them. Acceptable for v1.
- **Sign-out interception** — if the user signs out with an active timer, the session is dropped (not auto-saved as draft). Documented in the SessionTimerPill tooltip; user expectation is "End session & log time" before signing out.
- **Cross-device handoff** — timer state is in-memory only. Closing the tab loses the session. CosmoLex syncs across devices; we'd need a backend write each tick to match. Defer until a backend exists.
- **Passive capture from email / calendar** — None of v1; the AI-time meter only sees in-app chat.
- **Hourly rate** — Not captured per-event. Org Admin can compute `billableHours × $rate` externally for now. A per-attorney rate field could go on `operator` or a separate `RateCard` model.

---

## 5. Files added / changed

### New

- [src/lib/aiTimeStore.ts](../../src/lib/aiTimeStore.ts) — types, persistence, activity catalogs, rounding & format helpers
- [src/lib/sessionTimer.ts](../../src/lib/sessionTimer.ts) — singleton timer with pub-sub + idle-pause tick loop
- [src/lib/billingExport.ts](../../src/lib/billingExport.ts) — shared CSV export
- [src/components/chat/SessionTimerPill.jsx](../../src/components/chat/SessionTimerPill.jsx) — header pill + menu
- [src/components/chat/BillingDraftModal.jsx](../../src/components/chat/BillingDraftModal.jsx) — end-of-session draft modal
- [src/components/chat/MyTimePanel.jsx](../../src/components/chat/MyTimePanel.jsx) — attorney's own time-log view
- [src/pages/org-admin/BillingTimePage.jsx](../../src/pages/org-admin/BillingTimePage.jsx) — org-wide view

### Edited

- [src/pages/chatbot/ChatView.jsx](../../src/pages/chatbot/ChatView.jsx) — imports, Sidebar prop + item, `TopNav` slot, `sendMessage` start hook, `handleNewThread` finalize hook, `yourai:end-session` listener, panel + modal mounts, `closeAllPanels` / `sidebarActiveKey` / display-gate updates
- [src/App.jsx](../../src/App.jsx) — route `/app/time-billing`
- [src/components/org-admin/OrgSidebar.jsx](../../src/components/org-admin/OrgSidebar.jsx) — "Time & Billing" SYSTEM nav item
- [src/pages/org-admin/OrgSettingsPage.jsx](../../src/pages/org-admin/OrgSettingsPage.jsx) — Time & Billing card on General tab

---

## 6. Screenshots — capture plan

This document references screenshots in [`docs/extracted/AI_Time_Meter_screens/`](./AI_Time_Meter_screens/). The dev server runs at `http://localhost:8080` after `npm run dev`. To capture the proposed-system screens, use the script at the bottom; for competitor screens, capture from the public help-center URLs cited in §2.

### Proposed-system screens to capture

| Filename | Surface | URL | Notes |
|---|---|---|---|
| `01-topnav-timer-running.png` | `SessionTimerPill` running state | `/chat` | After sending one message; capture the top 60 px of the chat area |
| `02-topnav-timer-paused.png` | Idle-paused state | `/chat` | Wait 2 min after a message to trigger idle pause |
| `03-timer-menu-open.png` | Pill dropdown menu | `/chat` | Click the pill to expand |
| `04-draft-modal-loading.png` | Modal mid AI-summary | `/chat` | Click "End session & log time" — capture during the spinner |
| `05-draft-modal-filled.png` | Modal with description ready | `/chat` | After AI summary returns |
| `06-my-time-panel-drafts.png` | My Time / Drafts tab | `/chat` then sidebar "My Time" | Need at least 1 saved event |
| `07-my-time-panel-edit.png` | In-row edit form | same | Click pencil icon on any row |
| `08-org-billing-time-page.png` | `/app/time-billing` page | `/app/time-billing` | Org Admin login required |
| `09-org-settings-time-billing-card.png` | E-Billing toggle | `/app/settings` General tab | Scroll to the Time & Billing card |
| `10-utbms-dropdown.png` | Activity dropdown in UTBMS mode | `/chat` | Toggle e-billing ON first, then trigger draft modal |

### Capture script

```bash
# screenshots.sh
# Prereq: dev server running at localhost:8080. Open Chrome to the URL,
# position the window, then run the appropriate `screencapture -R x,y,w,h`
# line. Coordinates assume a 1920×1080 display with Chrome maximised;
# adjust for your screen.

OUT=docs/extracted/AI_Time_Meter_screens
mkdir -p "$OUT"

# Top-of-chat band (top 90 px, full width) for the timer pill states
screencapture -R 0,75,1920,90  "$OUT/01-topnav-timer-running.png"

# Centered modal — capture middle 720×680 region
screencapture -R 600,200,720,680 "$OUT/05-draft-modal-filled.png"

# Org-admin pages — full chat area minus sidebar (left 240px sidebar)
screencapture -R 240,0,1680,1080 "$OUT/08-org-billing-time-page.png"
```

Manually capturing is preferable to scripting hot-key timing — set up the screen, then run a single `screencapture` line.

### Competitor screens to capture

Open each in a browser and capture the relevant region:

- Clio: timer panel & Manage AI card — https://help.clio.com/hc/en-us/articles/29764998990491-Manage-AI-Automate-Billing-and-Expense-Entry
- LeanLaw: timers tab — https://support.myleanlaw.co/en/articles/9232194-entering-time-with-the-calendar-and-timers
- Bill4Time: timer menu — https://support.bill4time.com/hc/en-us/articles/204250560-Create-Timers
- CosmoLex: global timer — https://support.cosmolex.com/knowledge-base/using-global-timer/

---

## 7. Open questions for PM / leadership

1. **Sign-out behaviour** — discard active timer (current), or auto-save as a draft with placeholder matter?
2. **Hourly rates** — capture on the event, on the operator, or both? Required before any "revenue forecast" view is meaningful.
3. **LEDES export priority** — only matters for insurance-defense / corporate-counsel firms. Do we have a target firm asking for this yet?
4. **Mid-session matter switching** — if attorneys regularly bounce between matters in one thread, we'd need to add a "split this session" affordance in the draft modal. Hold for actual feedback.
5. **Cross-device timer persistence** — if attorneys often work across devices, backend timer state is a real backlog item.

---

## 8. Full source list

- Clio: https://help.clio.com/hc/en-us/articles/9289741706779-Time-Entries · https://help.clio.com/hc/en-us/articles/9289744400667-Activity-Categories · https://help.clio.com/hc/en-us/articles/9289801180187-Rates-and-Rate-Hierarchies · https://help.clio.com/hc/en-us/articles/29764998990491-Manage-AI-Automate-Billing-and-Expense-Entry · https://www.clio.com/blog/ai-time-tracking-for-lawyers/
- LeanLaw: https://support.myleanlaw.co/en/articles/9232194-entering-time-with-the-calendar-and-timers · https://support.myleanlaw.co/en/articles/4537168-time-entries-page-in-leanlaw · https://www.leanlaw.co/blog/ledes-utbms-codes-insurance-defense-guide/ · https://support.myleanlaw.co/en/articles/778922-using-ledes · https://billables.ai/integrations/leanlaw
- Bill4Time: https://support.bill4time.com/hc/en-us/articles/204250560-Create-Timers · https://support.bill4time.com/hc/en-us/articles/204250620-Change-Timer-Interval · https://support.bill4time.com/hc/en-us/articles/17766993803035-Time-Entry-Field-Explanation · https://support.bill4time.com/hc/en-us/articles/204251090-ABA-Codes-Add-or-Edit · https://www.bill4time.com/blog/announcing-ledes-export/
- CosmoLex: https://support.cosmolex.com/knowledge-base/using-global-timer/ · https://support.cosmolex.com/knowledge-base/options-to-track-time/ · https://kb.cosmolex.com/support/solutions/articles/19000028529-program-settings · https://support.cosmolex.com/knowledge-base/timecard-field-descriptions/ · https://support.cosmolex.com/knowledge-base/billing-methods/ · https://www.cosmolex.com/features/time-tracking/
- TimeDoctor review of Clio: https://www.timedoctor.com/blog/clio-time-tracking/
