# AI-Time Meter — Proposal

YourAI · Tenant Chat · v1.0 · 2026-05-19

---

## Why this matters

Every US attorney already tracks billable time — in Clio, MyCase, LeanLaw, Bill4Time, or CosmoLex — and every attorney hates it. The friction is in three predictable places: remembering to start a timer, writing the description after the fact, and picking an activity code the e-billing portal will accept. Industry data puts the loss from under-recording at six to eight percent of annual billable hours.

YourAI already sees the work happen. Every chat message with the AI is direct evidence of legal work being performed. The **AI-time meter** exploits that: a timer starts automatically on the first chat message, runs while the conversation is active, pauses on idle, and at session end opens a fully-drafted billable event with an AI-generated description and a suggested activity code. The attorney reviews, edits, approves. The firm bills the client. **YourAI is just the timer and the auto-summary — the billing relationship stays between the firm and the client.**

---

## How the market does it today

We studied the four leading US legal-billing products before settling on a design. The takeaway: every product gets one piece right; none of them combine the pieces with an assistant that already has full visibility into the work.

### Clio

Live timer in the global header; a Manage AI feature (GA 2025) proactively surfaces unlogged time and auto-generates polished descriptions from calls, notes, and documents.

![[screenshot:comp-01-clio.png|Clio's time-tracking feature page. The product anchors the timer in the global header bar, the convention every successor has copied.]]

### CosmoLex

Strictly one timer at a time by design — starting a new timer auto-pauses the previous to prevent double-billing. Timers persist across devices. Default 6-minute increments, configurable down to one.

![[screenshot:comp-02-cosmolex.png|CosmoLex's time-tracking marketing page. The single-timer model is the design choice we adopted directly.]]

### LeanLaw

Three surfaces (web, dedicated desktop tracker, mobile). The Draft → Approved → Final workflow gates QuickBooks sync on attorney approval. Passive capture via the Billables AI integration.

![[screenshot:comp-03-leanlaw.png|LeanLaw's hero page. The approval workflow they pioneered — draft to approved to final — is the safety net we copied.]]

### Bill4Time

Clock icon top-right of every screen, multiple concurrent timers, configurable round-up increments, full ABA/UTBMS code library. The most conservative product of the four — no AI surface as of 2026.

![[screenshot:comp-04-bill4time.png|Bill4Time's time-tracking page. The full UTBMS code library and per-firm increment configuration set the baseline for e-billing compatibility.]]

### What we kept, what we avoided

| Decision | Source | Our implementation |
|---|---|---|
| Live HH:MM:SS pill in the top bar | Universal | Header pill, top-right of the chat nav |
| Default round-up to 0.1 hr (6 min) | All four | Configurable to 0.25 hr per firm |
| One timer at a time | CosmoLex | Switching threads finalizes the previous session |
| Activity-code dropdown (not free text) | All four | Custom firm categories by default; UTBMS pairings behind an E-Billing Mode toggle |
| AI-drafted description, attorney edits | Clio Manage AI | One-shot LLM call; attorney must approve before save |
| Draft → Approved workflow | LeanLaw | Saved events require attorney sign-off before export |
| Silent 2-min idle pause | None do this | Implemented client-side; no popups |
| **Avoid:** auto-post without review | Clio's 2 AM auto-cutoff is controversial | We never auto-post — the draft modal is the only path to save |
| **Avoid:** required matter at timer start | All four defer this | Matter captured only at draft-confirm time |

---

## How our system works

### The session timer

The timer appears in the chat header the moment the attorney sends a first message. A pulsing green dot confirms the timer is running; idle pause is silent.

![[screenshot:01-topnav-timer-running.png|The header timer pill appears the moment the attorney sends a first message.]]

Clicking the pill reveals controls: pause manually, end the session and open the draft modal, or discard without logging.

![[screenshot:03-timer-menu-open.png|Menu from clicking the timer pill — three actions, no clutter.]]

### The draft modal

At session end, the modal opens with raw active time and rounded billable hours side-by-side, a one-sentence AI-generated description, a suggested activity category, and a billable / non-billable toggle. The attorney's only required input is the matter name.

![[screenshot:05-draft-modal-filled.png|Draft modal after the attorney has filled in the matter and reviewed the AI description. Save & approve is the primary action.]]

For training, internal admin, or casual exploration, the attorney flips the toggle to non-billable. The session is still logged for firm tracking but excluded from billable totals.

![[screenshot:05b-draft-modal-nonbillable.png|Non-billable mode for internal or casual sessions. The toggle changes the helper text and downstream display.]]

### My Time — attorney view

Each attorney has a panel showing only their own entries. Tabs for All / Drafts / Approved, search across matter and description, edit-in-place, CSV export.

![[screenshot:06-my-time-with-event.png|My Time after a non-billable training session was logged. Non-billable badge sits next to Approved; the billable hours are struck through.]]

### Team Time — Org Admin view

The Org Admin sees every attorney's entries across the firm with attorney and date-range filters. Five KPI cards summarize the filtered view: entries, billable hours, non-billable hours, attorneys, and approved-in-filter.

![[screenshot:08-team-time-panel.png|Team Time panel: every attorney's billable events across the firm, with attorney + date filters and a five-card KPI strip.]]

---

## What's live today

Shipped to production at `yourai-black.vercel.app/chat`: header timer pill, end-of-session draft modal with AI auto-description, My Time attorney panel, Team Time Org Admin panel, billable / non-billable toggle, custom firm categories with optional UTBMS mode, CSV export, and a 22-event demo seed across four attorneys so a client demo lands on a populated view without setup.

---

## Open questions

1. **Hourly rates** — capture on the event, on the attorney profile, or both? Required before any revenue-forecast view.
2. **LEDES export** — only valuable for insurance-defense and corporate-counsel firms. Do we have a target firm asking?
3. **Mid-session matter switching** — wait for real attorney feedback, or pre-empt with a "split this session" feature?
4. **Cross-device timer state** — depends on backend roadmap; today the timer is tab-local.

---

## References

Clio · https://help.clio.com/hc/en-us/articles/29764998990491-Manage-AI-Automate-Billing-and-Expense-Entry · https://www.clio.com/features/legal-time-expense-tracking/
LeanLaw · https://support.myleanlaw.co/en/articles/9232194-entering-time-with-the-calendar-and-timers · https://www.leanlaw.co/
Bill4Time · https://support.bill4time.com/hc/en-us/articles/204250560-Create-Timers · https://www.bill4time.com/time-tracking/
CosmoLex · https://support.cosmolex.com/knowledge-base/using-global-timer/ · https://www.cosmolex.com/features/time-tracking/
