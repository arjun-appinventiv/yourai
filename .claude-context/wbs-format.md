# WBS Excel Format Spec — `[ProjectName]_WBS.xlsx`

> Reference for generating Work Breakdown Structure Excel deliverables.
> Load this when the user asks for a WBS file or a scope-reference document.
>
> Companion file: `delivery-tracker-format.md` — different artefact, different audience.

## Purpose

Static scope reference. Once generated, treated as the single source of truth for what's in the product. Mixed audience (PM, engineering leads, advisors). Reads fluently for PM-level audiences but Notes column carries technical-state context so engineering can verify accuracy.

**This is NOT for delivery tracking** (use the Delivery Tracker instead).

## Filename

`[ProjectName]_WBS.xlsx` — e.g. `YourAI_WBS.xlsx`. Save to user's Desktop OR project root, ask if unclear.

## Sheets

1. **Overview** — always first
2. **One sheet per platform / role / audience** — e.g. for YourAI: `Tenant Chat`, `Super Admin`, `Org Admin`, optionally `Shared & Infra`

**Excel sheet name constraint**: no `/` allowed in titles. Use `&` or `-` instead. E.g. `Shared & Infra`, not `Shared / Infra`.

---

## Per-platform sheet structure

### Columns

| Col | Width | Header | Notes |
|---|---:|---|---|
| A | 8 | Sr. No. | Format `1.0`, `2.0`, etc. — one per Module |
| B | 28 | Modules | High-level feature group |
| C | 25 | Sub-Modules | Sub-feature within module |
| D | 55 | Features / WBS | Bulleted feature list, `-` prefix, `\n` separated |
| E | 16 | Status | `Complete` / `In Progress` / `Planned` / `Phase 2/3` |
| F | 35 | Notes / Remarks | Free-text technical notes / caveats |

### Row layout

- **Row 1** — Title bar. `A1:F1` merged. Sheet name as title.
  - Dark blue fill `#1F3864`
  - White Arial 14pt bold
  - Centered (horizontal + vertical)
  - Height 32
- **Row 2** — Column headers
  - Yellow fill `#FFFF00`
  - Arial 11pt bold black
  - Centered (horizontal + vertical)
  - Height 30
- **Row 3+** — Data rows

### Module / Sub-Module merge pattern

When a Module has N sub-modules:
- Sr.No (col A) and Module name (col B) appear in the FIRST sub-module row only
- Both A and B cells are **merged vertically** across all N sub-module rows
- A and B values are bold + centered

### Cell styling — universal rules

- Font: Arial throughout
- Wrap text: True on every cell
- Vertical alignment: Top (except headers = center)
- Thin black borders `#000000` on every cell in the data area
- Sr.No (col A): centered
- Module (col B): bold, centered
- Sub-Module (col C): centered, normal weight
- Features (col D): left-aligned top, wrap, bullet-prefixed `-`, `\n`-separated
- Status (col E): centered top
- Notes (col F): left-aligned top

### Row heights

- Header row: 30
- Data rows: auto-size based on content; min 40, cap at 320 to keep print sane.
- Heuristic: `max(40, n_features * 18 + 8)` clamped to `min(.., 320)`.

### Freeze panes

`A3` — keeps title and column header visible while scrolling.

---

## Overview sheet

### Columns

| Col | Width | Header |
|---|---:|---|
| A | 28 | Platform / Module Area |
| B | 18 | Total Modules |
| C | 22 | Total Sub-Modules |
| D | 22 | Total Features |
| E | 18 | Completion % |

### Layout

- Row 1 — title bar (`A1:E1` merged), dark blue + white 14pt bold (same as platform sheets)
- Row 2 — column headers (yellow fill, bold, centered, height 30)
- Row 3+ — one row per platform sheet with totals + completion %
- Final row — **Grand Total** (bold, light gray `#F2F2F2` fill)
- Empty separator row, then **Status legend** block:
  - `Complete` — Fully implemented with no TODOs (Completion% weight = 100%)
  - `In Progress` — Partially implemented or has TODOs / placeholders (50%)
  - `Planned` — Surface scaffolded but not built (10%)
  - `Phase 2/3` — Mentioned in plan / backlog only (0%)

### Completion % calculation

Hardcoded as values in Python (not formulas — WBS is static once generated).

Per-sheet:
```python
def status_to_pct(status):
    s = status.lower()
    if "complete" in s and "in progress" not in s: return 100
    if "in progress" in s or "partial" in s: return 50
    if "planned" in s: return 10
    if "phase" in s: return 0
    return 50

avg_pct = sum(status_to_pct(s["status"]) for sub in module_subs) / num_sub_modules
```

Grand total: weighted by sub-module count, not flat across sheets.
```python
weighted_complete = sum(n_subs * (pct/100) for sheet)
grand_pct = weighted_complete / total_sub_modules
```

---

## Status enum

Use exactly one of: `Complete`, `In Progress`, `Planned`, `Phase 2/3`.

No data validation dropdown on WBS — it's static. Validation belongs on the Delivery Tracker.

---

## Generation recipe (Python + openpyxl)

### Tools

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
```

### Constants

```python
ARIAL = "Arial"
THIN = Side(border_style="thin", color="000000")
ALL_BORDERS = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
YELLOW_FILL = PatternFill("solid", start_color="FFFF00", end_color="FFFF00")
DARKBLUE_FILL = PatternFill("solid", start_color="1F3864", end_color="1F3864")
TITLE_FONT = Font(name=ARIAL, size=14, bold=True, color="FFFFFF")
HEADER_FONT = Font(name=ARIAL, size=11, bold=True, color="000000")
MODULE_FONT = Font(name=ARIAL, size=11, bold=True, color="000000")
BODY_FONT = Font(name=ARIAL, size=10, color="000000")
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
LEFT_TOP = Alignment(horizontal="left", vertical="top", wrap_text=True)
COL_WIDTHS = {"A": 8, "B": 28, "C": 25, "D": 55, "E": 16, "F": 35}
HEADERS = ["Sr. No.", "Modules", "Sub-Modules", "Features / WBS", "Status", "Notes / Remarks"]
```

### Per-platform sheet build steps

1. Set column widths from `COL_WIDTHS`
2. Write title row:
   - `ws.merge_cells("A1:F1")`
   - `ws["A1"] = sheet_name`; apply `TITLE_FONT`, `DARKBLUE_FILL`, `CENTER`
   - `ws.row_dimensions[1].height = 32`
3. Write header row 2:
   - For each of 6 headers, set value + `HEADER_FONT` + `YELLOW_FILL` + `CENTER`
   - `ws.row_dimensions[2].height = 30`
4. For each module (track Sr.No counter starting at 1.0):
   - Note `first_data_row`
   - For each sub-module:
     - First sub-row: write `Sr.No` to col A and module name to col B (both `MODULE_FONT`, centered)
     - Write sub-module name to col C (`BODY_FONT`, `CENTER_TOP`)
     - Write features to col D as `"\n".join(f"- {f}" for f in features)`, `BODY_FONT`, `LEFT_TOP`
     - Write status to col E (centered top), notes to col F (left top)
     - Set row height: `max(40, len(features) * 18 + 8)` clamped to 320
   - After last sub-module: merge A and B vertically across the module:
     ```python
     ws.merge_cells(start_row=first_data_row, start_column=1,
                    end_row=last_data_row, end_column=1)
     ws.merge_cells(start_row=first_data_row, start_column=2,
                    end_row=last_data_row, end_column=2)
     ```
5. Apply borders to all cells in `A1:F<last_data_row>`
6. `ws.freeze_panes = "A3"`

### Overview sheet build steps

1. Set widths (A=28, B=18, C=22, D=22, E=18)
2. Write title row `A1:E1`, dark blue + white 14pt bold
3. Write headers in row 2 with yellow fill
4. For each platform sheet, write one row: name, n_modules, n_submods, n_features, completion%
   - `pct_cell.number_format = "0.0%"`
   - Pass value as `pct/100.0` so Excel renders as percentage
5. Grand Total row with bold + light gray fill
6. Empty row, then Status legend block (label in col A, description merged across B:E)

### Reference implementation

`/tmp/build_wbs.py` (used to build YourAI_WBS.xlsx).

---

## When to extend

- More than ~5 platform sheets: add a `Glossary` sheet for module terminology
- Heavy revision history needed: add a `Changelog` sheet (date · change · by-who)
- **Don't** add per-feature dates / status / owner — that belongs in the Delivery Tracker

## What this file is NOT for

- Delivery tracking (use Delivery Tracker)
- Sprint planning (use Sprint Plan; see Delivery Tracker doc, option C hybrid)
- Per-team accountability (use Delivery Tracker)
- Weekly status updates (use Delivery Tracker)
