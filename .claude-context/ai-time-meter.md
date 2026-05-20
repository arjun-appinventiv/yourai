# AI-time meter — architecture reference

Load when modifying the chat session timer, the billing draft modal, the My Time / Team Time panels, or the OrgSettings Time & Billing card. Shipped 2026-05-19 across four deploys to `yourai/main`.

Sources of truth: [PROGRESS.md](../PROGRESS.md) "AI-Time Meter" section under What's built, and [docs/extracted/AI_Time_Meter_Research.md](../docs/extracted/AI_Time_Meter_Research.md) for the competitor scan that anchored the design choices.

---

## Where it lives in code

```
src/lib/
  aiTimeStore.ts           BillingEvent type + persistence + activity catalogs + helpers
  sessionTimer.ts          Module-level singleton timer (subscribe/notify)
  billingExport.ts         CSV export shared by both panels

src/data/
  demoBillingEvents.ts     22-event demo seed across 4 mock attorneys

src/components/chat/
  SessionTimerPill.jsx     Header pill, menu (Pause / End session / Discard)
  BillingDraftModal.jsx    End-of-session draft with AI auto-summary
  MyTimePanel.jsx          Attorney's own log — table, attorney-scoped
  TeamTimePanel.jsx        Org Admin firm-wide rollup — same table + Attorney column

src/pages/chatbot/ChatView.jsx     All wiring (sendMessage hook, handleNewThread finalize,
                                   sidebar items, panel mounts)
src/pages/org-admin/OrgSettingsPage.jsx     "Time & Billing" card on the General tab

build_ai_time_meter_proposal_docx.cjs       Builds the client-facing proposal .docx
docs/extracted/AI_Time_Meter_Research.md    Dev-side competitor scan + design rationale
docs/extracted/AI_Time_Meter_Proposal.md    Client-facing proposal markdown source
docs/extracted/AI_Time_Meter_Proposal.docx  Client-facing proposal with screenshots
docs/extracted/AI_Time_Meter_screens/       All embedded screenshots (our UI + 4 competitors)
```

---

## Timer lifecycle

`sessionTimer.ts` is a **module-level singleton** with a pub-sub API. The state lives in a closed-over `state` variable; components subscribe via `subscribeTimer(cb)` and re-read via `getTimerSnapshot()`.

### State machine

```
idle ──(first sendMessage in thread)──> running
running ──(2 min no activity)──> paused  [silent — no popup]
paused ──(next sendMessage)──> running
running ──(handleNewThread / yourai:end-session)──> finalize → BillingDraftModal
paused ──(handleNewThread / yourai:end-session)──> finalize → BillingDraftModal
running ──(switch thread without finalize)──> discard prior (defensive)
```

### Idle pause is silent

When 2 min pass without activity, we commit `accumulatedSeconds` at `lastActivityAt` (not `now`) — we never bill the gap. There's no popup. None of the four competitors do an in-app idle popup either; they all defer to OS-level integrations.

### Switching threads without finalizing

Defensive choice — drops the prior session rather than risk billing it to the wrong matter. If a user wants to bill mid-conversation, they hit "End session & log time" in the pill menu; the timer finalizes, modal opens, and a new timer starts on their next send.

### Tick loop

`ensureTickLoop()` is idempotent. It calls `notify()` every second so subscribed components re-render the HH:MM:SS readout and idle-pause detection runs.

---

## ChatView integration touchpoints

All in `src/pages/chatbot/ChatView.jsx`. When modifying, grep for these exact strings — they're the contract:

| Hook | Search string | What it does |
|---|---|---|
| Imports | `import SessionTimerPill` | Header pill |
| Imports | `import BillingDraftModal` | End-of-session modal |
| Imports | `import MyTimePanel` | Attorney's own log |
| Imports | `import TeamTimePanel` | Org Admin firm view |
| Imports | `from '../../lib/sessionTimer'` | Singleton |
| State | `showMyTimePanel` / `showTeamTimePanel` | Sibling panel toggles |
| State | `billingDraft` | `{ session, threadMessages }` for the modal |
| Start | `startOrResumeTimer(activeThreadId, …)` | Inside `sendMessage`, right after `if (...isTyping) return` |
| Finalize | `const finalized = finalizeTimer()` | First line of `handleNewThread` |
| Listener | `yourai:end-session` | useEffect window listener — pill's End session menu raises this |
| Sidebar | `id: 'my-time'` / `id: 'team-time'` | adminItems array near line 498 |
| Display gate | `showMyTimePanel \|\| showTeamTimePanel` | Chat-main `<div>` style.display |
| Mount | `<MyTimePanel onBack=...` | Sibling-level after chat-main, after the Audit Logs panel mount |
| Operator fallback | `operator \|\| { id: currentUserId, name: ORG_CURRENT_USER?.name }` | Passed to MyTime + DraftModal |

The **operator fallback at the panel boundary** is load-bearing — see CLAUDE.md gotcha #40.

---

## Data model

Single `BillingEvent` record (`src/lib/aiTimeStore.ts`). Storage keys:

- `yourai_billing_events_v1` — array of `BillingEvent`
- `yourai_billing_settings_v1` — `{ eBillingMode: boolean, rateIncrementMinutes: 6 | 15 }`

`status` is `'draft' | 'approved'`. **No `'exported'`** — that was tried in v1 and dropped in v1.2 because PM found the third state confusing. The CSV export action is a one-click thing; doesn't need its own status. Removing it cleaned up two tabs, one bulk action, and the `exportedAt` field.

`matterNumber` was also tried in v1 and dropped in v1.1. Solo and small firms use the matter name as the identifier; insurance-defense / corporate-counsel firms get a file number via the UTBMS code anyway. Don't reintroduce without an explicit go-ahead.

`billable: false` is the third axis. Tracked time that isn't billable: internal training, admin, casual exploration, pro bono. Logged for firm visibility but excluded from billable-hour totals. Renders with a "Non-billable" badge + strikethrough on the hours number.

---

## Activity catalogs

Two flavors, same dropdown UI, different source — switched by the org-level `eBillingMode` flag:

- **OFF (default):** `DEFAULT_ACTIVITY_CATEGORIES` — 10 plain-English firm categories (Research, Drafting, Document Review, Analysis / Strategy, Client Communication, Internal Communication, Meeting / Call, Court / Filing, Negotiation, Other).
- **ON (E-Billing Mode):** `UTBMS_ACTIVITY_PAIRS` — 25 UTBMS task+activity pairings (L110/A104, L120/A104, L120/A105, …) required by insurance and corporate-counsel e-billing portals (Tymetrix, Legal Tracker, Collaborati). Sufficient for v1; the full catalog is a Sprint-2 lift once a firm actually flips e-billing on.

`getActivityCatalog(settings)` returns the right list. Always go through this helper — don't reference either constant directly from a UI component.

---

## AI auto-description

The draft modal calls `/api/chat` once on mount via `runAutoSummary()`. System prompt is tight:

> One sentence, 15–25 words, past tense, neutral professional phrasing suitable for a client invoice. Begin with a strong verb (Reviewed, Drafted, Analyzed, Researched, Compared, Summarized, Identified). Do NOT mention "AI" / "chatbot" / "YourAI". Do NOT include duration or dates. Do NOT use first person.

User content is a transcript of up to 30 messages truncated to 600 chars each.

Defensive: streaming reader drains the full response, strips wrapping quotes (LLM sometimes adds them despite the prompt). If `/api/chat` errors (no API key in dev — returns 401), falls back to `"Reviewed and analyzed material relating to <first user message>"` + shows a yellow "Auto-summary unavailable — using a basic draft" hint.

Important: **messages must be normalized at the modal boundary** because ChatView uses `{ sender, content }` not `{ role, content }`. See CLAUDE.md gotcha #39.

A "Regenerate" button re-runs the LLM call. Generated once on mount via a `useRef` guard so HMR / re-renders don't spam the API.

---

## Sibling-panel pattern (canonical example)

The Team Time view (Org Admin's firm-wide rollup) was originally a `/app/time-billing` page. PM moved it to a ChatView sibling panel in v1.2: "This should be visible in chatview not on app view for org admin." Attorneys live in chat, not in the org-admin portal — anything they touch day-to-day needs to be one sidebar item away inside `/chat`.

To add a similar panel:

1. Create `src/components/chat/XxxPanel.jsx` with a header bar that includes the back arrow (`<ArrowLeft size={18} onClick={onBack} />`), title, optional toolbar.
2. ChatView: `const [showXxxPanel, setShowXxxPanel] = useState(false)`
3. Add `setShowXxxPanel(false)` to `closeAllPanels`.
4. Add `if (showXxxPanel) return 'xxx'` to `sidebarActiveKey`.
5. Add `onOpenXxx={() => { closeAllPanels(); setShowXxxPanel(true); setSidebarOpen(false); }}` to the `<Sidebar>` props block.
6. Add `showXxxPanel ||` to the chat-main display-gate.
7. Add `!showXxxPanel &&` to the `runPanelOpen &&` gate.
8. Mount `{showXxxPanel && <XxxPanel onBack={() => setShowXxxPanel(false)} />}` sibling-level after the other panel mounts.
9. In the `Sidebar` function: add a new entry to the appropriate items array (adminItems for admin-gated, knowledgeItems for general). Pass an `onOpenXxx` prop in the destructure.

The `/app/*` route + OrgSidebar entry is the **wrong place** for anything attorneys interact with day-to-day. Compare against the four existing chat-sibling panels for the pattern: `BillingPanel`, `AuditLogsPanel`, `MyTimePanel`, `TeamTimePanel`.

---

## Demo seed

`src/data/demoBillingEvents.ts` ships 22 realistic events across 4 mock attorneys (Ryan Melade, Sarah Chen, James Wu, Maria Torres). 4 drafts (today), 18 approved (1-19 days ago), 3 non-billable. ~22.6 h billable + 2.7 h non-billable.

**Dates are computed relative to today** at seed time (`new Date(); endedAt.setDate(endedAt.getDate() - daysAgo)`) so the date-range filters (Today / 7d / 30d / MTD) always show populated buckets when a client demo runs. If you add to the templates list, follow the same `daysAgo` pattern.

Seeded idempotently via `seedEventsIfEmpty(buildDemoBillingEvents())` from ChatView's first-mount `useState` initializer (next to the KP and Vault seeds). The seed only writes when the localStorage key is empty — won't overwrite a real attorney's data.

---

## What's out of scope in v1 (decisions, not bugs)

- **Workspace integration** — meter runs only in `/chat`, not `/chat/workspaces/:id`. Re-evaluate after real attorney feedback.
- **Mid-session matter switching** — attorneys must start a new chat to switch matters. If users regularly flip mid-conversation, add a "Split this session" action to the draft modal.
- **Sign-out interception** — active timer is dropped, not auto-saved as draft. "End session & log time" is the explicit happy path.
- **Cross-device timer state** — in-memory only; tab close loses unsaved session. Backend-dependent.
- **LEDES 1998B export** — CSV-only in v1. `billingExport.ts` is structured for the addition; wire when first insurance-defense firm asks.
- **PDF export** — browser print on the table view in v1.
- **Hourly rates** — not captured per event. A per-attorney `RateCard` model is the clear next step before any revenue-forecast view.

---

## Building the client-facing proposal .docx

```bash
node build_ai_time_meter_proposal_docx.cjs
```

Reads `docs/extracted/AI_Time_Meter_Proposal.md`, emits `docs/extracted/AI_Time_Meter_Proposal.docx` and `~/Desktop/AI_Time_Meter_Proposal.docx`. Markdown source supports `![[screenshot:filename.png|caption]]` directives pointing at `docs/extracted/AI_Time_Meter_screens/`. Same docx-js pipeline as `build_sprint1_frd_docx.cjs`.

When updating the proposal: edit the .md, re-run the build script, commit both.
