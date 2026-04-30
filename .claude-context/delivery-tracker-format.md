# Delivery Tracker Excel Format Spec — `[ProjectName]_Delivery_Tracker.xlsx`

> Reference for generating feature-level delivery tracker Excel files
> that engineering leads (FE / BE / AI / Python) fill in with status,
> owners, and dates.
>
> Companion file: `wbs-format.md` — different artefact, different audience.

## Purpose

Live working document. Engineering leads write into their team-specific
columns weekly. PM uses for stand-up and reporting.

| Artefact | Audience | Mutable? |
|---|---|---|
| **WBS** | PM, advisors | No (static scope reference) |
| **Delivery Tracker** | FE/BE/AI leads | Yes (filled in over time) |

## Filename

`[ProjectName]_Delivery_Tracker.xlsx` — e.g. `YourAI_Delivery_Tracker.xlsx`. Default save location: user's Desktop.

---

## CRITICAL: Granularity rule

**Features must be PM-level, not implementation-level.** A feature is a user-facing capability or behavior, not a CSS rule, library choice, internal flag, or defensive coding detail.

| ✅ Good (PM-level) | ❌ Bad (implementation-level) |
|---|---|
| "Email + password login" | "Email input with `<input type="email">` validation" |
| "Generate risk memo with severity findings" | "Array.isArray guards on `findings` field" |
| "Quick-action pills (Review/Summarise/Draft)" | "Hero: gold sparkle + DM Serif H1, padding-top 12vh" |
| "Streaming AI response" | "ReadableStream consumer with trailing decoder flush" |

**Target ~3-6 features per sub-module after PM rollup.**

For YourAI's Tenant Chat: aim for ~120-140 rows total (a 50% reduction from a naive WBS-bullet explosion which produces ~280+ rows).

**Exception**: AI · Python and API & Backend sheets are written at engineering granularity because their audience is technical leads.

---

## Sheets — 7 total, in order

| # | Sheet | Granularity | Audience |
|---|---|---|---|
| 1 | Instructions | Plain text guide | All leads (cover) |
| 2 | Tenant Chat (or main user surface) | PM-level features | All three teams |
| 3 | Super Admin | PM-level | All three teams |
| 4 | Org Admin | PM-level | All three teams |
| 5 | API & Backend | One row per REST endpoint | BE lead |
| 6 | AI · Python | Capability banner + task rows | Python lead |
| 7 | RAID | Risks, Assumptions, Issues, Dependencies, Decisions, Questions | PM + leads |

---

## Tracker sheet structure (sheets 2, 3, 4)

### Columns — 25 cols total

| Col | Width | Header | Pre-filled? | Notes |
|---|---:|---|---|---|
| A | 9 | ID | ✅ | `TC-001`, `SA-014`, `OA-027` |
| B | 22 | Module | ✅ | |
| C | 22 | Sub-Module | ✅ | |
| D | 50 | Feature | ✅ | PM-level capability |
| E | 12 | Priority | ✅ | Dropdown |
| F | 11 | Phase | ✅ | Dropdown |
| G | 13 | Owner Team(s) | ✅ | Dropdown |
| H | 13 | FE Owner | — | (lead fills in) |
| I | 13 | FE Status | — | Dropdown |
| J | 11 | FE Start | — | Date |
| K | 11 | FE ETA | — | Date |
| L | 11 | FE Effort (d) | — | Number |
| M | 13 | BE Owner | — | |
| N | 13 | BE Status | — | Dropdown |
| O | 11 | BE Start | — | Date |
| P | 11 | BE ETA | — | Date |
| Q | 11 | BE Effort (d) | — | Number |
| R | 13 | AI Owner | — | |
| S | 13 | AI Status | — | Dropdown |
| T | 11 | AI Start | — | Date |
| U | 11 | AI ETA | — | Date |
| V | 11 | AI Effort (d) | — | Number |
| W | 28 | Dependencies | ✅ | |
| X | 18 | Blockers | — | (lead fills in) |
| Y | 28 | Notes | ✅ | Context |

### Header row team tinting

- **FE columns (H–L)**: light blue fill `#E3F2FD`
- **BE columns (M–Q)**: light green fill `#E8F5E9`
- **AI columns (R–V)**: light purple fill `#F3E5F5`
- All other header cells: yellow `#FFFF00`

### Title row

- `A1:Y1` merged (last col letter via `get_column_letter(25)`)
- Dark blue `#1F3864` fill, white Arial 14pt bold, centered
- Title format: `[Platform Name] — [Audience] Delivery Tracker (PM view)`
- Height 30

### Data row defaults

- Light borders `#C0C0C0` (softer than WBS — better for many-row tracker)
- Default Arial 10pt
- Date cells: `number_format = "yyyy-mm-dd"`
- Effort cells: `number_format = "0.0"` (ideal-engineer-days)
- Row height ~38

### Status enum (used on FE Status / BE Status / AI Status)

Single dropdown applied to columns I, N, S:

`Not Started`, `In Progress`, `Blocked`, `In Review`, `Done`, `Won't Do`

### Conditional formatting on status columns I, N, S

| Status | Fill |
|---|---|
| `Done` | green `#C6EFCE` |
| `In Progress` | yellow `#FFEB9C` |
| `Blocked` | red `#FFC7CE` |
| `In Review` | blue `#BDD7EE` |
| `Won't Do` | gray `#D9D9D9` (ideally + strikethrough text) |
| `Not Started` | no fill (default surface) |

### Other dropdowns

| Column | Options |
|---|---|
| Priority (E) | `P0 — MVP`, `P1`, `P2`, `P3` |
| Phase (F) | `Phase 1`, `Phase 2`, `Phase 3` |
| Owner Team(s) (G) | `FE`, `BE`, `AI`, `FE + BE`, `FE + AI`, `BE + AI`, `All Three` |

### Freeze panes

`E3` — keeps ID + Module + Sub-Module + Feature visible while scrolling right through team columns.

### Auto-filter

`A2:Y[last_row]` on every tracker sheet.

---

## API & Backend sheet (sheet 5)

One row per REST endpoint. Targeted at the BE lead.

### Columns — 14 cols

| Col | Width | Header |
|---|---:|---|
| A | 9 | ID (`BE-001`…) |
| B | 22 | Resource Group (Auth, Vault, Workflows, etc.) |
| C | 38 | Endpoint / Method |
| D | 38 | What it does |
| E | 30 | DB Tables / Dependencies |
| F | 12 | Priority |
| G | 11 | Phase |
| H | 14 | BE Owner |
| I | 14 | BE Status |
| J | 11 | BE Start |
| K | 11 | BE ETA |
| L | 11 | BE Effort (d) |
| M | 20 | Blockers |
| N | 28 | Notes |

### Conventions

- BE columns (H–L) tinted **light green** `#E8F5E9` in header
- Endpoint cell (col C): use Menlo 9pt for path readability
- Same title bar + Status dropdown + conditional formatting as tracker sheets
- `freeze_panes = "D3"`
- `auto_filter.ref = "A2:N[last_row]"`

### Resource group canonical list (for YourAI)

Authentication · User & Profile · Tenant / Organization · Users (SA + Org Admin) · Workspaces · Vault Folders · Vault Documents · Knowledge Packs · Workflow Templates · Workflow Runs · Chat · Prompt Templates & Clients · Audit Logs · Billing (Stripe) · Bot Persona Config · Notifications & Settings · File Storage Infra

---

## AI · Python sheet (sheet 6)

Two-tier structure: capability banner + tasks under each.

### Columns — 13 cols

| Col | Width | Header |
|---|---:|---|
| A | 9 | ID |
| B | 26 | Capability |
| C | 50 | Task |
| D | 14 | Owner Team(s) |
| E | 12 | Priority |
| F | 11 | Phase |
| G | 14 | AI Owner |
| H | 14 | AI Status |
| I | 11 | AI Start |
| J | 11 | AI ETA |
| K | 11 | AI Effort (d) |
| L | 35 | Dependencies / Notes |
| M | 22 | Blockers |

### Two-tier render

**Banner row** (one per capability) — gray bg `#F2F2F2`, height 56:
- Col A: capability ID `AI-01.0` (then `AI-02.0`, etc.)
- Cols B–M merged: `{capability_name} · {summary}\nCurrent: {current_state}`
- Bold navy 10pt font

**Task rows** under each banner (one per implementation task):
- Col A: task ID `AI-01.1`, `AI-01.2`, …
- Col B: capability name (denormalized so filtering by capability works)
- Col C: task description
- Cols D–F: Owner Team(s), Priority, Phase
- Cols G–K: AI columns (Owner / Status / Start / ETA / Effort)
- Cols L–M: Dependencies/Notes, Blockers

### Conventions

- AI columns (G–K) tinted **light purple** `#F3E5F5` in header
- Same Status dropdown + conditional formatting + freeze panes (`D3`) + auto-filter

### Capability list canonical structure (for YourAI)

Each capability has:
- `capability` — short name
- `summary` — one-line "what is this"
- `current_state` — "what's built / where it lives today"
- `tasks` — list of `(task_text, team, priority, phase)` tuples

YourAI capabilities (17 in v2): Intent Classification · Prompt Management · Card Schema Registry · Document Text Extraction · Document Classification · Workflow Execution Orchestrator · Workflow Operation Prompts · RAG Ingestion · RAG Search · Vault Ask-Anything Parser · Find Document · Anti-Hallucination Guardrails · Edge Function · FRD Generator · Bot Tester · Evals & Regression · Source Badge Resolution.

---

## RAID sheet (sheet 7)

### Columns — 7 cols

| Col | Width | Header |
|---|---:|---|
| A | 12 | Type |
| B | 9 | ID |
| C | 48 | Title |
| D | 18 | Owner |
| E | 14 | Status |
| F | 50 | Detail / Mitigation |
| G | 30 | Impact / Notes |

### Type cell color coding

| Type | Fill | ID Prefix |
|---|---|---|
| Risk | peach `#FCE4D6` | `R-001` |
| Assumption | cream `#FFF2CC` | `A-001` |
| Issue | red-pink `#FFCCCC` | `I-001` |
| Dependency | blue `#DDEBF7` | `D-001` |
| Decision | green `#E2EFDA` | `DEC-001` |
| Question | gray `#EDEDED` | `Q-001` |

### Conventions

- Status column free-text (Open / Mitigated / Approved / etc. — not enum)
- `freeze_panes = "C3"`
- `auto_filter.ref = "A2:G[last_row]"`

---

## Instructions sheet (sheet 1)

Cover sheet. No data validation. Two-column layout for label + description.

### Layout

- Title: `A1:B1` merged, dark blue + white 14pt bold (same treatment as tracker sheets)
- Column widths: A=22, B=70

### Content sections (in order)

1. **Owner** — PM name + email + cadence
2. **File scope** — relationship to WBS (separate file, not edited)
3. **How to use this file** — 5-step instructions for leads
4. **Sheets** — one row per sheet, indented description
5. **Status legend** — 6 statuses, color-coded
6. **Priority legend** — P0–P3 explanations
7. **Phase legend** — Phase 1–3 explanations
8. **Owner Team(s) tags** — 7 team-tag explanations
9. **Effort estimation** — ideal-engineer-days, halves, no padding
10. **Date entry** — ISO format, pre-formatted cells
11. **Conflicts / questions** — RAID sheet routing
12. **Conventions** — don't delete rows · owner naming · don't edit other teams' columns · be specific about blockers

### Style

- Section headers (no leading whitespace): bold Arial 11pt, height 22-24
- Sub-items (indented with `    `): Arial 10pt color `#555555`, height 20
- Long descriptions wrap to height 36

---

## Pre-fill vs blank policy

### Pre-filled by PM/Claude (so leads have context)

- ID, Module, Sub-Module, Feature
- Priority, Phase, Owner Team(s)
- Dependencies, Notes

### Blank for engineering leads to fill in

- FE Owner / FE Status / FE Start / FE ETA / FE Effort (d)
- BE Owner / BE Status / BE Start / BE ETA / BE Effort (d)
- AI Owner / AI Status / AI Start / AI ETA / AI Effort (d)
- Blockers

---

## Tagging defaults — Owner Team(s)

When pre-filling at sub-module level:

| Pattern | Default Tag |
|---|---|
| UI layout / animation / hover behavior / visual chrome | `FE` |
| Persistence (CRUD), auth, file storage, billing | `FE + BE` |
| LLM-generated card with no persistence | `FE + AI` |
| AI service that runs server-side | `BE + AI` |
| Workflow execution, document upload + extract, chat send pipeline | `All Three` |
| Pure prompts / classifiers / embeddings / RAG | `AI` |
| API endpoints, DB tables (BE-only sheet) | `BE` |
| Settings JSON, infra config | `BE` |

Override per-row when needed; the dropdown supports it.

---

## Generation recipe (Python + openpyxl)

### Input data shape

For each platform tracker sheet:

```python
modules = [
    {
        "module": "Authentication & Onboarding",
        "submodules": [
            {
                "name": "Login",
                "features": [
                    "Email + password login",
                    "OTP / 2FA verification (6-digit code)",
                    # ...PM-level capabilities...
                ],
                "notes": "localStorage-backed session today; production needs real auth provider",
            },
            # ...more sub-modules...
        ],
    },
    # ...more modules...
]

# Tag map — one entry per (module, sub_module) pair:
tags = {
    ("Authentication & Onboarding", "Login"): {
        "team": "FE + BE",
        "priority": "P0 — MVP",
        "phase": "Phase 1",
        "deps": "Cognito or NextAuth provider; OTP service",
    },
    # ...
}
```

### Build steps for tracker sheets

1. Set column widths from `TRACKER_HEADERS` (25 cols)
2. Write title row (`A1:Y1` merged, dark blue + white 14pt bold, height 30)
3. Write header row 2:
   - Default yellow fill + bold Arial 10pt
   - Override H–L with light blue, M–Q with light green, R–V with light purple
   - Height 32
4. For each (module, sub, feature) tuple:
   - Increment row counter
   - Write A=`{prefix}-{counter:03d}`, B=module, C=sub, D=feature
   - Look up tag for (module, sub); write E=priority, F=phase, G=team
   - Write W=deps, Y=notes
   - Apply alignments (left-top for D/W/X/Y, center-top for others)
   - Apply borders, set date / effort number formats on relevant cells
   - Row height 38
5. Apply conditional formatting on cols I, N, S (status colors)
6. Add data validations (status, priority, phase, team dropdowns)
7. `ws.freeze_panes = "E3"`
8. `ws.auto_filter.ref = f"A2:Y{last_row}"`

### Build steps for API & Backend sheet

Same pattern with 14-col layout, BE-only team columns (light green), endpoint Menlo font, freeze at `D3`.

### Build steps for AI · Python sheet

For each capability:
1. Write banner row (gray bg, A1=ID, B-M merged with summary + current state)
2. For each task: write task row with full column set
Same dropdowns + conditional formatting + freeze at `D3`.

### Reference implementations

- `/tmp/build_tracker.py` — v1 (full implementation-bullet explosion)
- `/tmp/build_tracker_v2.py` — v2 (PM-level rollup; preferred)

The v2 imports renderers from v1 and supplies different feature data.

---

## When to update

| Trigger | Action |
|---|---|
| Weekly stand-up | Leads refresh team's status / dates / blockers |
| Sprint planning | PM filters by `Phase = Phase N` and groups by team |
| New feature added | Insert row, give next ID in sequence, tag team(s) |
| Feature descoped | Don't delete; mark Status = `Won't Do` |
| Architectural change | Log a Decision in RAID; link from affected rows in Notes |
| Lead questions an assumption | Add Question to RAID, owner=PM |

## When NOT to use this format

- For sprint visualization with date bars — use a Gantt-style cover sheet (the Sprint Plan hybrid; option C in the original conversation)
- For pure scope reference (no team accountability) — use the WBS
- For commit-level tracking — use GitHub Issues / Linear / Jira

---

## Related files

- `wbs-format.md` — companion format spec for the static scope doc
- `/tmp/build_wbs.py` — WBS generator (reference)
- `/tmp/build_tracker.py` — Tracker v1 (kept for primitives + AI/API/RAID renderers)
- `/tmp/build_tracker_v2.py` — Tracker v2 (PM-level rollup)
