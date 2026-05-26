"""
Build YourAI_WBS_Five_Modules.xlsx — client / PM / QA scope breakdown.

Matches the reference Sprint-1 WBS sheet:
 - Single sheet
 - 4 content columns (Sr. No. / Modules / Sub-Modules / Features / WBS)
 - PM-friendly language: capabilities and outcomes, not implementation
 - No status or notes columns
"""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side


# ─── Style constants ─────────────────────────────────────────────
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
CENTER_TOP = Alignment(horizontal="center", vertical="top", wrap_text=True)
LEFT_TOP = Alignment(horizontal="left", vertical="top", wrap_text=True)
COL_WIDTHS = {"A": 8, "B": 30, "C": 28, "D": 78}
HEADERS = ["Sr. No.", "Modules", "Sub-Modules", "Features / WBS"]


# ─── Scope content ───────────────────────────────────────────────

MODULES = [
    # ============================================================
    # 1. YOURVAULT
    # ============================================================
    {
        "module": "YourVault",
        "submods": [
            {
                "name": "Vault home",
                "features": [
                    "See every document available to you in one place",
                    "Plain-English search bar at the top — e.g. 'find indemnification clauses across Acme contracts'",
                    "Switch between your documents, firm-wide documents, or everything",
                    "Upload a new document or create one from scratch from the same screen",
                    "Recent uploads and frequently-used documents surfaced first",
                ],
            },
            {
                "name": "Folders for case files",
                "features": [
                    "Group documents into folders that match each matter or case file",
                    "Folders can contain sub-folders for unlimited depth",
                    "Left-rail matter list with document count per folder",
                    "Drag a folder of files in to upload everything at once",
                    "Open a folder to see only the documents in that matter",
                    "Rename, move, and delete folders with confirmation",
                ],
            },
            {
                "name": "Document table",
                "features": [
                    "Browse documents in a sortable list: folder, name, owner, size, last modified",
                    "Folder name is the primary identifier — reads like a case file",
                    "Kebab menu per row: download, rename, move, delete",
                    "Drag a document into chat to attach it instantly",
                    "Click any row to open its detail view",
                ],
            },
            {
                "name": "Smart search",
                "features": [
                    "Type a plain-English query and the vault filters itself",
                    "Quick chips to filter by date, uploader, or file type",
                    "Search hits document content, not just filenames — find a clause by its language",
                    "Filter chips persist across new searches; AI-set filters clear automatically",
                    "Clear All link resets every filter with one click",
                ],
            },
            {
                "name": "Upload documents",
                "features": [
                    "Drag and drop a file, folder, or batch into the page",
                    "Upload single files via the Upload button",
                    "New Document modal: pick a folder, name the file, add a description, attach",
                    "PDF, DOCX, and TXT supported; files up to 25 MB",
                    "Per-file processing status while the document is being prepared",
                    "Auto-classification of the uploaded type (Contract, Brief, Discovery, etc.)",
                ],
            },
            {
                "name": "Use a document in chat",
                "features": [
                    "Open the document picker from the + button on the chat input",
                    "Search the vault by name, description, or content from inside the picker",
                    "Click 'Use in chat' to attach the document to the conversation",
                    "Detach the attached document mid-thread when you're done",
                    "Quick link to open the full vault from the picker",
                ],
            },
            {
                "name": "Permissions & visibility",
                "features": [
                    "External users see only their own and shared documents",
                    "Internal team and managers see the firm's documents and their own",
                    "Admins see everything across the firm",
                    "Promote a personal document to firm-wide with one toggle",
                    "Confirmation prompt before any visibility change",
                ],
            },
            {
                "name": "Coming next",
                "features": [
                    "Right-rail document detail panel with metadata and preview",
                    "Page count and last-modified metadata on every file",
                    "Semantic search across all document content (today's search is keyword-based)",
                    "Strategy for very large files (500+ page case files): chunked indexing",
                    "Auto-tag documents to their matter on upload",
                ],
            },
        ],
    },

    # ============================================================
    # 2. KNOWLEDGE PACK
    # ============================================================
    {
        "module": "Knowledge Pack",
        "submods": [
            {
                "name": "Pack library",
                "features": [
                    "See every Knowledge Pack available to your firm",
                    "Filter to firm-wide packs or just your own personal packs",
                    "Search by pack name or description",
                    "Create a new pack or open an existing pack to edit it",
                    "Per-pack card shows document count, link count, and scope",
                ],
            },
            {
                "name": "Create or edit a pack",
                "features": [
                    "Name the pack, describe its purpose, and choose personal or firm-wide",
                    "Add documents — PDF, DOCX, TXT",
                    "Add reference links with a title and URL",
                    "See real text extraction status per document as it's processed",
                    "Remove a document or link from the pack at any time",
                    "Save or discard changes",
                ],
            },
            {
                "name": "Pre-loaded packs",
                "features": [
                    "Standard NDA Template Pack — NDA template, risk checklist, sample redline",
                    "M&A Diligence Pack — diligence checklist, sample precedent, indemnification clauses",
                    "California Labor Law Pack — Labor Code summary, § 16600 and Edwards rule",
                    "Privacy Pack — GDPR and CCPA quick reference",
                    "Every pack ships with real content the AI can ground answers in",
                ],
            },
            {
                "name": "Use a pack in chat",
                "features": [
                    "Activate a pack from the Pack pill in the chat input",
                    "Search across all packs in a picker modal",
                    "'No pack' option to clear the active pack",
                    "The AI uses the active pack as additional context for its answers",
                    "Pack pill turns gold when a pack is active",
                ],
            },
            {
                "name": "Source attribution",
                "features": [
                    "When the AI answers using a pack, the response shows 'Answered from Pack: <name>'",
                    "Attorneys can audit where each answer came from",
                    "Pack and intent are independent — you can mix any pack with any intent",
                    "Pack is independent of attached documents — the AI uses both when relevant",
                ],
            },
            {
                "name": "Sharing",
                "features": [
                    "Mark a pack as personal — only you see it",
                    "Promote a personal pack to firm-wide so the whole team can use it",
                    "Firm-wide packs are visible to every attorney in the org",
                    "Confirmation prompt when promoting (visibility change is significant)",
                ],
            },
            {
                "name": "Coming next",
                "features": [
                    "Automatic fetching of content from added reference links",
                    "Detection of duplicate documents across multiple packs",
                    "Pack usage analytics — which packs are most attached, which docs cited most",
                    "Per-attorney pack usage rolled up to the Org Admin reports",
                ],
            },
        ],
    },

    # ============================================================
    # 3. INTENT OUTPUT — SIDE PANEL
    # ============================================================
    {
        "module": "Intent Output — Side Panel",
        "submods": [
            {
                "name": "Inline preview",
                "features": [
                    "After an output is generated, a compact preview chip appears in the chat thread",
                    "Chip shows the intent type (Risk Memo, Summary, Comparison) and the matter name",
                    "Click the chip to open the full output in the side panel",
                    "Each intent type has its own accent color so the chip is easy to spot",
                    "Chat flow stays clean — the full report doesn't blow out the conversation",
                ],
            },
            {
                "name": "Side panel viewer",
                "features": [
                    "Opens automatically when a new card output arrives",
                    "Sits to the right of the chat — chat shrinks, panel slides in (not an overlay)",
                    "Anchored to the message the output was generated from",
                    "Report-style layout: title, section headers, bullets, blockquotes",
                    "Reads like a memo or Word doc, not a UI card",
                ],
            },
            {
                "name": "Fullscreen mode",
                "features": [
                    "Click Fullscreen to view the report in a centered, wider column",
                    "Better for printing, sharing, or reading dense reports",
                    "Same Copy / Close controls available in fullscreen",
                    "Exit Fullscreen returns to the docked side panel",
                ],
            },
            {
                "name": "Copy and share",
                "features": [
                    "One-click Copy as Markdown — paste into Word, Notion, or email",
                    "Toast confirmation after the copy",
                    "Print directly from the browser",
                    "Open and close the same panel from the chat chip at any time",
                ],
            },
            {
                "name": "Empty states",
                "features": [
                    "When an attorney asks for analysis without uploading a document, the panel shows a friendly empty state",
                    "Empty state explains what document type is needed and suggests an alternative intent",
                    "Never shows a blank report with rows of '—' dashes",
                    "Upload prompt with a quick-attach button right inside the empty state",
                ],
            },
            {
                "name": "Coming next",
                "features": [
                    "Save and re-open past intent outputs from chat history",
                    "Share an output as a link to a colleague",
                    "Inline citations linking back to source-document passages",
                    "Export as polished PDF (browser print is the v1 stopgap)",
                    "Versioning — regenerated outputs keep a history",
                ],
            },
        ],
    },

    # ============================================================
    # 4. WORKFLOWS — SUPER ADMIN
    # ============================================================
    {
        "module": "Workflows — Super Admin",
        "submods": [
            {
                "name": "Templates list",
                "features": [
                    "See every workflow template across the platform",
                    "Columns: name, practice area, step count, last edited, status",
                    "Search by template name or description",
                    "Filter by practice area and by status (Active / Draft / Archived)",
                    "Create New Template button top-right",
                ],
            },
            {
                "name": "Build a workflow",
                "features": [
                    "Step-by-step builder with a centered hero and step pills",
                    "Add, remove, duplicate, and drag-reorder steps",
                    "Per step: pick the operation, edit the system prompt, choose the output type",
                    "Attach a reference document to a step (template, policy, prior precedent)",
                    "Save as draft, or publish to make the template live",
                    "Test run a draft against a sample document before publishing",
                ],
            },
            {
                "name": "Operation library",
                "features": [
                    "Six pre-built operations: Risk Assessment, Document Summarization, Clause Comparison, Case Brief, Legal Research, Clause Analysis",
                    "Each operation has a tuned prompt with word targets and citation rules",
                    "Operations enforce a literal fallback when content isn't in the supplied docs",
                    "Define a custom operation from scratch (name, prompt, output schema)",
                ],
            },
            {
                "name": "Distribute to firms",
                "features": [
                    "Mark a template Active or Inactive",
                    "Push a template to a specific tenant or to all tenants by default",
                    "See a record of every distribution event",
                    "Disable a template instantly across all live tenants",
                ],
            },
            {
                "name": "Track changes",
                "features": [
                    "Last edited by / when on every template",
                    "Audit log of all template edits across the platform",
                    "Roll back to a prior version",
                    "Multi-admin approval flow for template changes (optional)",
                ],
            },
            {
                "name": "Coming next",
                "features": [
                    "Real distribution pipeline — push changes without a redeploy",
                    "Versioned rollout (canary 10% → 50% → 100%)",
                    "Usage analytics per template — runs / duration / failure rate",
                    "Per-template cost telemetry surfaced in SA Reports & Analytics",
                ],
            },
        ],
    },

    # ============================================================
    # 5. WORKFLOWS — CHAT (TENANT)
    # ============================================================
    {
        "module": "Workflows — Chat (Tenant)",
        "submods": [
            {
                "name": "Choose a workflow",
                "features": [
                    "Browse a unified grid of all workflows available to your firm",
                    "Per-card stats: recent run count, average duration, success rate",
                    "Filter tabs (All / Recent / Favourites)",
                    "Search by template name or description",
                    "Practice-area top stripe makes each workflow easy to identify",
                ],
            },
            {
                "name": "Pre-run setup",
                "features": [
                    "Upload the documents the workflow needs in a single modal",
                    "Each uploaded file is auto-classified (Contract, Brief, Discovery, Pleading)",
                    "Summary banner above the file list ('3 contracts, 2 briefs')",
                    "Run button enabled when the minimum document count is met",
                    "Cancel and re-upload at any time before running",
                ],
            },
            {
                "name": "Run the workflow",
                "features": [
                    "Step-by-step progress in a side panel",
                    "Pulsing dot for the active step; checkmark when complete",
                    "Each completed step shows its output below it",
                    "In-chat progress card so the attorney sees the run without leaving the conversation",
                    "Cancel button while running",
                    "Guard prevents two workflows from running concurrently",
                ],
            },
            {
                "name": "Read the report",
                "features": [
                    "Once the run completes, a document-style report renders in the chat",
                    "Sections per step plus a final synthesis section",
                    "Citations to source documents per finding",
                    "Print, Copy as Markdown, or download the report",
                    "Reopen the report any time from chat history",
                ],
            },
            {
                "name": "Run history",
                "features": [
                    "See every past run (running, complete, failed, cancelled)",
                    "Click any run to re-open its report",
                    "Re-run with a single click using the same documents",
                    "Filter by template, status, or date range",
                    "Bulk delete or archive old runs",
                ],
            },
            {
                "name": "Build your own workflow",
                "features": [
                    "Use the same builder as Super Admins (with reduced permissions)",
                    "Cannot publish firm-wide — your workflow stays on your account",
                    "Test runs against a sample document before saving",
                    "Save Draft / Save & Run",
                ],
            },
            {
                "name": "Coming next",
                "features": [
                    "Server-side run persistence (today runs live on the device)",
                    "Cross-device sync — start on laptop, view on phone",
                    "Cost telemetry per run — token cost per step, total run cost",
                    "Real-time collaboration on a single run",
                ],
            },
        ],
    },
]


# ─── Build ───────────────────────────────────────────────────────

wb = Workbook()
ws = wb.active
ws.title = "Scope Breakdown"

# Column widths
for col, w in COL_WIDTHS.items():
    ws.column_dimensions[col].width = w

# Title row
ws.merge_cells("A1:D1")
ws["A1"] = "YourAI — Scope Breakdown"
ws["A1"].font = TITLE_FONT
ws["A1"].fill = DARKBLUE_FILL
ws["A1"].alignment = CENTER
ws.row_dimensions[1].height = 32

# Header row
for col_idx, header in enumerate(HEADERS, start=1):
    cell = ws.cell(row=2, column=col_idx, value=header)
    cell.font = HEADER_FONT
    cell.fill = YELLOW_FILL
    cell.alignment = CENTER
ws.row_dimensions[2].height = 30

# Data rows
row = 3
for mod_idx, module in enumerate(MODULES, start=1):
    sr_no = f"{mod_idx}.0"
    first_data_row = row

    for sub in module["submods"]:
        features_text = "\n".join(f"- {f}" for f in sub["features"])

        if row == first_data_row:
            cell_a = ws.cell(row=row, column=1, value=sr_no)
            cell_a.font = MODULE_FONT
            cell_a.alignment = CENTER

            cell_b = ws.cell(row=row, column=2, value=module["module"])
            cell_b.font = MODULE_FONT
            cell_b.alignment = CENTER

        cell_c = ws.cell(row=row, column=3, value=sub["name"])
        cell_c.font = BODY_FONT
        cell_c.alignment = CENTER_TOP

        cell_d = ws.cell(row=row, column=4, value=features_text)
        cell_d.font = BODY_FONT
        cell_d.alignment = LEFT_TOP

        n = len(sub["features"])
        ws.row_dimensions[row].height = max(60, min(360, n * 22 + 14))

        row += 1

    last_data_row = row - 1
    if last_data_row > first_data_row:
        ws.merge_cells(start_row=first_data_row, start_column=1,
                       end_row=last_data_row, end_column=1)
        ws.merge_cells(start_row=first_data_row, start_column=2,
                       end_row=last_data_row, end_column=2)

# Borders
for r in range(1, row):
    for c in range(1, 5):
        ws.cell(row=r, column=c).border = ALL_BORDERS

ws.freeze_panes = "A3"

OUT_PRIMARY = "/Users/admin/Downloads/scope-creator-ai/.claude/worktrees/great-banach/docs/extracted/YourAI_WBS_Five_Modules.xlsx"
OUT_DESKTOP = "/Users/admin/Desktop/YourAI_WBS_Five_Modules.xlsx"

wb.save(OUT_PRIMARY)
wb.save(OUT_DESKTOP)

print(f"Wrote {OUT_PRIMARY}")
print(f"Wrote {OUT_DESKTOP}")
print()

total_subs = sum(len(m["submods"]) for m in MODULES)
total_feats = sum(len(s["features"]) for m in MODULES for s in m["submods"])
print(f"Total: {len(MODULES)} modules · {total_subs} sub-modules · {total_feats} features")
for m in MODULES:
    subs = len(m["submods"])
    feats = sum(len(s["features"]) for s in m["submods"])
    print(f"  {m['module']:<35} {subs:>2} sub-modules · {feats:>3} features")
