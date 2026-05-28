# FRD — Workflows

**Version:** 1.0
**Date:** 2026-05-28
**Author:** Arjun Sharma, Product
**Status:** Draft

---

## 1. Document overview

### Purpose

This document specifies the functional behaviour of the **Workflows** module in YourAI — the picker, the workflow builder, the lifecycle (active / draft / archived), and the surfaces an attorney uses to browse, create, edit, share, and manage workflows in their firm.

This document is paired with two siblings:

- `FRD_Workflow_Operations.docx` — what each operation (step type) does, the standard library of operations, and per-operation behaviour.
- `FRD_Workflow_Execution.docx` — running a workflow: the Pre-Run modal, the progress experience, the report card, run history, and error handling.

Together the three documents cover the full Workflows feature.

### Audience

Product managers, QA engineers, and client stakeholders evaluating the module against attorney workflows.

### Scope

In scope:

- The Workflows picker page (browse, filter, run, edit)
- The Workflow Builder (Details step and Pipeline step)
- The workflow detail rail (right-side preview)
- Workflow metadata: name, description, practice area, sample output, visibility, status
- Lifecycle and status transitions (active / draft / archived)
- Role-based visibility — who sees what, who can publish, who can edit
- The four pre-loaded workflows shipped with the product

Out of scope (covered in sibling FRDs):

- What each individual operation does — covered in `FRD_Workflow_Operations.docx`
- Running a workflow, progress display, and the report card — covered in `FRD_Workflow_Execution.docx`
- Super Admin workflow template distribution — covered in `FRD_SA_Workflows.docx`

### Glossary

- **Workflow** — A named, reusable multi-step AI pipeline. The attorney runs a workflow against one or more documents and receives a structured report.
- **Pipeline** — The ordered list of steps inside a workflow. Each step is one AI task (an *operation*).
- **Operation** — A pre-built AI task that can be a step in a workflow. The library includes operations like Read Documents, Analyse Clauses, Compare Against Standard, and Generate Report.
- **Workflow template** — The same thing as a workflow. The word "template" is used when distinguishing the saved, reusable definition from a specific run.
- **Run** — A specific execution of a workflow against specific documents at a specific time.
- **Sample output** — A markdown-rendered preview of what the workflow's report will look like. Surfaced on the picker card so teammates can preview before running.
- **Practice area** — A category for the workflow (Legal, M&A, Employment, Privacy, etc.) used for filtering.
- **Status** — Whether the workflow is *Active*, *Draft*, or *Archived*.
- **Visibility** — Whether the workflow is *Personal* (only the creator sees it) or *Firm-wide* (everyone in the org sees it).

### Document control summary

| Item | Value |
|---|---|
| Version | 1.0 |
| Date | 2026-05-28 |
| Author | Arjun Sharma, Product |
| Status | Draft for PM + QA review |

Detailed revision history is in Section 10.

---

## 2. Background and context

### What the module is

A **Workflow** is a reusable, multi-step AI pipeline that an attorney configures once and runs many times. Instead of asking the AI to do one thing in a chat ("review this contract"), a workflow chains several steps together — "read this contract, then analyse its clauses, then compare those clauses against our firm's NDA playbook, then write a risk memo" — and produces a single structured report at the end.

The module has four main user-facing surfaces:

1. **The picker** — the home page for Workflows, where attorneys browse what's available.
2. **The detail rail** — a right-side preview that opens when the attorney clicks a workflow card.
3. **The builder** — a two-step wizard for creating or editing a workflow.
4. **The lifecycle controls** — small affordances that govern whether a workflow is Active, Draft, or Archived, and Personal or Firm-wide.

### Why it exists

Attorneys repeatedly run the same multi-step analysis on documents — review the contract, find non-standard clauses, compare against the firm template, write up the risks for the client. Doing this in chat means asking four separate questions, copying outputs between messages, and remembering the right order. A workflow captures that recipe once, lets the firm refine it over time, and turns four questions into one click.

The four pre-loaded workflows cover the most common firm use-cases: Contract Risk Review, M&A Due Diligence Summary, NDA Quick Review, and Privacy & GDPR Audit.

### Where it sits in the broader system

Workflows live in the *Knowledge* section of the chat sidebar, alongside YourVault and Knowledge Packs. The picker page is the entry point. The attorney runs a workflow either from the picker (full-page experience) or from a "Workflows" quick-action in any chat (the picker opens as an overlay).

A run produces a report card that lands in the chat thread, so workflows are first-class citizens of the conversation — the attorney sees the report alongside the rest of their work, not on a separate page.

### Recent state

The picker, builder, and run experience were redesigned in late April based on Aashna's chat-mode mockups. The current visual is settled. The two-step builder wizard (Details, then Pipeline) was introduced to lower the cognitive load of authoring a workflow — earlier the attorney was dropped straight into an empty pipeline canvas without context.

---

## 3. Module-level functional specification

### 3.1 Picker — entry surface

![[screenshot:01-workflow-picker.png|The Workflows picker — a unified grid of every workflow available to the firm, with stat tiles at the top and a New Workflow button. Each card describes the workflow, lists its steps as small icons, and shows how long a typical run takes.]]

When the user opens *Workflows* from the chat sidebar, they land on the Workflows picker. The page replaces the chat area but the chat sidebar remains visible on the left.

**Header bar.** A thin bar across the top with:

- *Back to chat* button on the left
- *New Workflow* primary button on the right

**Hero.** Below the header bar:

- A small *Knowledge* eyebrow tag with an icon
- A page title — *"Workflows"*
- A subtitle — *"Chain multiple AI steps into a reusable pipeline — read documents, analyse clauses, check compliance, and produce a structured report, all with one click."*
- A *"Running in: <organisation name>"* tag below the subtitle, confirming the user's current context

**Stat tiles.** Three at-a-glance numbers:

| Tile | What it shows |
|---|---|
| Templates | Total workflows visible to the user |
| Runs (per period) | Number of runs in the current period, with a sub-label like *"No runs yet"* on first load |
| Avg duration | Typical run length across recent runs, formatted as *"~14s"* / *"~2m"* |

The stat tiles are filter-able — clicking *Templates* filters the grid to all workflows; clicking *Runs* surfaces the most-run workflows first; clicking *Avg duration* surfaces the longest-running workflows first.

**Filter toolbar.** Below the stat tiles, a row of filter controls:

- *Practice area* dropdown — *Legal (default)*, *M&A*, *Employment*, *Privacy*, *Litigation*, *Custom*
- *Visibility* tabs — *All*, *Firm-wide*, *Mine*
- *Status* tabs (hidden by default; surface for admins) — *Active*, *Draft*, *Archived*

**Workflow grid.** Cards lay out in a responsive grid (three columns on desktop, two on tablet, one on mobile). Each card shows:

- A practice-area accent stripe at the top
- An eyebrow line — practice area + step count (e.g. *"Legal · 4 steps"*)
- Workflow name in serif typography
- One-line description
- A row of small step icons (one per step), representing the operations in order
- Footer line with *Last run …*, *~Xs avg*, and a small *Run* primary button

The grid reflows naturally. There is no per-row pagination.

**Empty state.** When no workflows match the active filters, the grid is replaced by a centred message — *"No workflows match your filters. Clear filters to see everything."* — with a single *Clear filters* button.

**First-run empty state.** A brand-new firm with no created workflows still sees the four pre-loaded workflows. The empty state only fires when filters narrow the visible set to zero.

### 3.2 Workflow detail rail

![[screenshot:02-workflow-detail-rail.png|Clicking a workflow card opens a detail rail on the right. The picker remains visible on the left so the attorney can switch between workflows without losing context.]]

When the attorney clicks any workflow card, the workflow opens in a right-side rail. The picker grid stays visible on the left at reduced width.

**Rail header.** Workflow name, status badge (Active / Draft / Archived), and a close button.

**Rail body.**

- Description (full text)
- Workflow steps — a numbered list of step names, with operation type, description, and a small *"−" / "+"* expand toggle per step
- Sample output preview — opens a markdown-rendered preview of what the workflow's report will look like
- *Edit workflow* button (only visible if the user has edit permission)
- *Run* primary button — opens the Pre-Run modal (covered in `FRD_Workflow_Execution.docx`)

**Detach behaviour.** Clicking a different card swaps the rail's content without closing and reopening. The close button collapses the rail and restores the full-width grid.

### 3.3 Pre-Run modal (entry path)

![[screenshot:03-prerun-modal-full.png|The Pre-Run modal opens when the attorney clicks Run on a workflow card. It shows the pipeline expanded as a numbered list, the upload area for documents, and a Run Workflow button at the bottom.]]

Clicking *Run* on a card (or in the detail rail) opens the Pre-Run modal. This surface is the bridge between the picker and the running experience.

The modal is owned by the Execution FRD; the picker's responsibility ends at opening it. See `FRD_Workflow_Execution.docx` §3 for full Pre-Run behaviour.

### 3.4 Builder — Details step (Step 1 of 2)

![[screenshot:06-new-workflow-builder.png|Step 1 of the New Workflow wizard. The attorney fills in name, practice area, status, description, optional sample output, and visibility before continuing to the Pipeline step.]]

Clicking *New Workflow* in the picker header opens the Workflow Builder. The builder is a two-step wizard. Step 1 captures workflow metadata; Step 2 builds the pipeline.

**Header.** A *Workflows* back button on the left and a *Cancel* button on the right. The page title reads *"New Workflow"* or *"Edit Workflow"* depending on mode.

**Step indicator.** A two-dot indicator: *1 Details* (active), *2 Pipeline* (disabled until Step 1 is valid).

**Fields, top to bottom.**

| Field | Required | Notes |
|---|---|---|
| Workflow name | Yes | Single-line text. 80 character cap. Live character counter `(N/80)`. |
| Practice area | Yes | Dropdown. Pre-populated with *Legal*, *M&A*, *Employment*, *Privacy*, *Litigation*, *Custom*. |
| Status | Yes | Two-button toggle: *Active* or *Draft*. Help text: *"Active: visible and runnable by your organisation. Draft: only visible to you until published."* |
| Description | No | Multi-line text. 300 character cap. Help text: *"Describe the output and intended audience. This appears on the workflow card for your team."* |
| Sample output | No | Multi-line markdown text. 8000 character cap. Help text explains that markdown is rendered and the sample appears as *"See sample output →"* on the picker card. |
| Visibility | Yes | Two radio cards: *Personal (only I see it)* or *Firm-wide (everyone in my org)*. Defaults to *Firm-wide*. |

**Primary button.** *Continue to Pipeline* — disabled until Workflow name, Practice area, Status, and Visibility are all set. Clicking it advances to Step 2.

### 3.5 Builder — Pipeline step (Step 2 of 2)

![[screenshot:07-builder-pipeline-step.png|Step 2 of the New Workflow wizard. The attorney adds, reorders, and configures the steps. A live estimated duration appears at the bottom. Max 8 steps per workflow.]]

The Pipeline step is where the attorney composes the workflow's recipe.

**Header.** Same as Step 1, except the step indicator now shows *Details* (complete, with checkmark) and *2 Pipeline* (active).

**Subtitle.** *"Now, add the steps this workflow should run."* + *"Add steps in the order they should run. Max 8 steps. Each step is one AI task."*

**Step list.** A vertical list of step cards. Each card shows:

- A two-digit step number on the left (*01*, *02*, *03*…) in a serif badge
- The step body — operation type dropdown, step name input, optional description
- *Advanced options* link (expands per-step prompt overrides and reference document picker — see `FRD_Workflow_Operations.docx` §3 for advanced behaviour)
- A drag-handle on the right edge for reordering
- A trash icon to remove the step

**Add Step button.** Below the step list. Adds a new step with the default operation (*Read Documents*).

**Footer counter.** *"<N> / 8 steps"* + *"Estimated total: ~Xs"* — the estimated duration updates live as steps are added or removed.

**Primary actions.** *Back to details* on the left, *Save workflow* on the right. *Save workflow* is enabled when at least one step is present and every step has a name and operation type set.

### 3.6 Builder — Edit mode

The same builder handles edit. The user opens it by clicking *Edit workflow* in the detail rail. The header shows *Edit Workflow*, the *Save workflow* button reads *Save changes*, and both steps land pre-populated.

Editing an Active workflow does not stop in-flight runs that started with the old version, but every new run uses the new version.

### 3.7 Status lifecycle

A workflow can be in one of three states. The transitions are user-driven; the system never changes status automatically.

| From | To | Trigger | Visibility consequence |
|---|---|---|---|
| Draft | Active | Owner edits, flips status to *Active*, saves | Becomes visible to the firm (if Firm-wide) or remains visible only to the owner (if Personal) |
| Active | Draft | Owner edits, flips status to *Draft*, saves | Becomes invisible to the firm; only the owner sees it |
| Active | Archived | Owner or admin clicks *Archive* from the kebab on the card | Hidden from the default picker grid. Visible only when the *Archived* status tab is enabled |
| Archived | Active | Owner or admin restores from the *Archived* tab | Returns to the default grid |

Status is reflected as a small badge on the workflow card and in the detail rail header.

### 3.8 Visibility

Two visibility options at workflow creation:

- **Personal** — only the creator sees the workflow. Used for drafts the attorney isn't ready to share.
- **Firm-wide** — visible to every member of the org with workflow access. Used for the team's shared library.

Promotion from Personal to Firm-wide requires confirmation (a dialog explains the implication). Demotion from Firm-wide to Personal also requires confirmation and is only allowed by the original owner or an admin.

### 3.9 Searching and filtering

The picker supports three concurrent filters:

- Practice area (single-select)
- Visibility tab (mutually exclusive: All / Firm-wide / Mine)
- Status tab (admin-only; mutually exclusive: Active / Draft / Archived)

There is no text search in the v1 picker — the attorney browses visually. Search is on the v1.1 roadmap.

### 3.10 Persistence

Created workflows persist across sessions and across browser refreshes. The four pre-loaded workflows ship with the product and are present on first open. Deleting a workflow is permanent — there is no trash or recovery.

---

## 4. Per-entity / per-variant specification

*N/A — Workflows do not have multiple visual variants. Every workflow card uses the same layout; the differences between Contract Risk Review, NDA Quick Review, and M&A Due Diligence are entirely in their steps and descriptions, not in the surface that displays them.*

For the per-operation variants — the eight operation types that can appear as a step in a workflow — see `FRD_Workflow_Operations.docx` §4.

---

## 5. Cross-cutting behaviour

### Workflow ↔ chat

A workflow does not change the active chat intent or the active Knowledge Pack. The attorney can have a Knowledge Pack active in a chat and then run a workflow against a different document — the workflow's run is independent of the chat's grounding context.

When a workflow run completes, the report card lands in the chat thread of the conversation the user was in when they clicked *Run*. This makes the report easy to reference alongside follow-up questions.

### Workflow ↔ documents

A workflow always operates on documents the attorney supplies at run time via the Pre-Run modal. A workflow definition does not have "pre-attached" documents — even the pre-loaded *Contract Risk Review* requires an attorney to upload the contract they want reviewed.

Reference documents per step (the firm's standard NDA template, for example) are different: those are set on the step inside the builder and travel with the workflow, the same way the operation type travels with it.

### Permission gating

| User role | Picker | Detail rail | Run | Edit | Create | Delete | Archive |
|---|---|---|---|---|---|---|---|
| External user | Hidden | — | — | — | — | — | — |
| Team member | Visible | Visible | Yes | Yes (own only) | Personal only | Own only | Own only |
| Manager | Visible | Visible | Yes | Yes (own only) | Personal + Firm-wide | Own only | Own only |
| Org admin | Visible | Visible | Yes | All | Personal + Firm-wide | Yes | Yes |

External users do not see the Workflows nav item at all.

### Concurrency

A user can have at most one workflow run active at a time. Attempting to start a second run while one is in progress is intercepted by a guard dialog (*"A workflow is already running. End or cancel it before starting another."* — see `FRD_Workflow_Execution.docx` §3.8).

The picker, detail rail, and builder are unaffected by an in-progress run — the attorney can browse and edit other workflows while one is running.

### Persistence and recovery

Workflow definitions live in firm storage and persist indefinitely. Drafts persist the same way as Active workflows.

The four pre-loaded workflows are read-only for non-admins (the *Edit workflow* button is hidden). Admins can edit pre-loaded workflows; doing so changes the workflow for the whole firm. There is no way to "reset" a modified pre-loaded workflow back to its original state in v1.

---

## 6. Special-case entities or modes

### 6.1 Pre-loaded workflows

The product ships with four pre-loaded, firm-wide workflows that every firm sees on first open:

| Workflow | Steps | Description | Owner |
|---|---|---|---|
| Contract Risk Review | 4 — Read Documents → Analyse Clauses → Compare Against Standard → Generate Report | End-to-end contract risk analysis: parse the document, flag non-standard clauses, benchmark against the firm's NDA playbook, and produce a risk memo. | Firm (system) |
| NDA Quick Review | 3 — Read Documents → Analyse Clauses → Generate Report | Fast NDA review focused on standard NDA risk points (term, scope, mutuality, carve-outs). | Firm |
| M&A Due Diligence Summary | 5 — Read Documents → Analyse Clauses → Extract Key Dates → Compare Against Standard → Generate Report | Structured diligence summary covering cap table, indemnification scope, MAC clauses, and dates. | Firm |
| Privacy & GDPR Audit | 4 — Read Documents → Check Compliance → Analyse Clauses → Generate Report | GDPR + CCPA compliance audit of a privacy policy or data-processing agreement. | Firm |

These workflows behave identically to user-created workflows in every respect except editing: only admins can edit them, and the *Edit workflow* button is hidden for non-admins.

### 6.2 Personal Drafts

When an attorney creates a workflow with status *Draft*, the workflow does not appear in the picker for anyone else in the firm. It is visible to the owner under the *Mine* visibility tab. The owner can run it from the picker while it's in Draft.

When the owner flips Status to *Active* and saves, the workflow becomes visible firm-wide.

### 6.3 Archived workflows

Archived workflows are hidden from the default picker grid. They appear only when an admin (or the workflow's owner) switches the *Status* tab to *Archived*. Archived workflows cannot be run from the picker without first being restored to Active.

Archiving is reversible. Deleting is not.

### 6.4 Sample output

The sample-output field captures markdown that renders as a preview of what the workflow's report will look like. This is a "show, don't tell" affordance — the attorney browsing the picker can click *See sample output →* on a card and read what running the workflow will actually produce, before committing to a run.

Sample output is optional but encouraged. Without it, the card shows the description and step icons only.

---

## 7. Accessibility and interaction notes

### Keyboard navigation

- The picker supports Tab through the header buttons, the stat tiles, the filter controls, and then every card in row-major order.
- Enter on a focused card opens the detail rail. Escape closes it.
- Inside the builder, Tab traverses every input on the active step. *Continue to Pipeline* and *Save workflow* are reachable via Tab and activate with Enter.
- In the step list (Pipeline step), Up and Down arrows move the focused step's position when the drag handle is focused.

### Screen-reader announcements

- Each workflow card announces name, practice area, step count, status, and average duration.
- The status badge announces *"Active workflow"*, *"Draft workflow"*, or *"Archived workflow"*.
- Step list reordering announces the new position when the user moves a step ("Step 2 moved to position 3").
- Validation errors on the builder announce inline ("Workflow name is required").

### Click targets

- Every interactive element (cards, buttons, drag handles, kebab triggers) is at least 44 by 44 pixels.

### Focus indicators

- Visible focus ring in brand navy on every focusable element.
- The builder's two-step wizard traps focus inside the active step until *Continue* or *Back* is pressed.

### Colour contrast

- Practice-area accent stripes are at 4.5:1 against the card background.
- Status badges (Active green / Draft gold / Archived grey) are at 4.5:1 against their pill background.

### Responsive behaviour

- The picker grid collapses from three to two to one columns as viewport narrows.
- The detail rail moves to a full-screen modal at mobile widths.
- The builder's two-step wizard stays linear at all widths.

---

## 8. QA test scenarios

Scenarios are numbered sequentially across the whole document.

### 8.1 Picker — browsing and filtering

**Scenario 1** — Picker renders with four pre-loaded workflows on first open.
- Surface: Workflows picker.
- Preconditions: First-ever login as an org admin. No workflows created.
- Action: Open *Workflows* from the chat sidebar.
- Expected: Four cards visible — Contract Risk Review, NDA Quick Review, M&A Due Diligence Summary, Privacy & GDPR Audit — each with a step-count line and a Run button.

**Scenario 2** — Stat tile *Templates* shows the total visible count.
- Preconditions: Four pre-loaded workflows + two personal drafts created by the user.
- Action: Inspect the *Templates* tile.
- Expected: *Templates 6*.

**Scenario 3** — Practice area filter narrows the grid.
- Preconditions: Default state.
- Action: Pick *M&A* from the Practice area dropdown.
- Expected: Only the M&A Due Diligence Summary card remains.

**Scenario 4** — Visibility tab *Mine* shows only the user's workflows.
- Preconditions: User has created two personal workflows.
- Action: Click *Mine* visibility tab.
- Expected: Grid shows only the two personal workflows. Pre-loaded firm-wide workflows are hidden.

**Scenario 5** — Visibility tab *Firm-wide* hides personal drafts.
- Action: Click *Firm-wide*.
- Expected: Grid shows pre-loaded workflows and any other firm-wide workflows. Personal drafts are hidden even if the current user is the owner.

**Scenario 6** — Status tab *Draft* is hidden from non-admins.
- Preconditions: Logged in as a team member.
- Action: Inspect the filter row.
- Expected: Status tab is absent.

**Scenario 7** — Status tab *Archived* shows only archived workflows.
- Preconditions: Logged in as an admin. Two workflows have been archived.
- Action: Click *Archived*.
- Expected: Only the two archived workflows are visible.

**Scenario 8** — Clearing filters with the link restores the default grid.
- Preconditions: A non-default filter combination has narrowed the grid to zero.
- Action: Click *Clear filters*.
- Expected: All visible workflows return. Filters reset.

### 8.2 Detail rail

**Scenario 9** — Clicking a card opens the rail.
- Action: Click any workflow card.
- Expected: Rail opens on the right. Picker shrinks. Rail contains workflow name, description, step list, sample output button (if defined), Edit + Run buttons.

**Scenario 10** — Switching to another card updates the rail without closing it.
- Preconditions: Rail open on Workflow A.
- Action: Click Workflow B's card.
- Expected: Rail body updates to Workflow B. Rail does not close and reopen.

**Scenario 11** — Edit workflow button hidden for non-admin on pre-loaded workflow.
- Preconditions: Logged in as a team member. Rail open on Contract Risk Review.
- Action: Inspect the rail.
- Expected: *Edit workflow* button is absent. Only *Run* is visible.

**Scenario 12** — Edit workflow button visible for owner on their own workflow.
- Preconditions: Team member created a personal workflow. Rail open on that workflow.
- Action: Inspect the rail.
- Expected: *Edit workflow* button visible.

**Scenario 13** — Sample output preview opens a markdown-rendered viewer.
- Preconditions: Workflow has a sample output defined.
- Action: Click *See sample output →*.
- Expected: Markdown renders cleanly (headings, bullets, bold, blockquotes).

### 8.3 Builder — Details step

**Scenario 14** — Continue is disabled until name is entered.
- Action: Open the builder. Inspect *Continue to Pipeline*.
- Expected: Button is disabled. Hovering shows tooltip *"Workflow name is required."*

**Scenario 15** — Name character counter increments live.
- Action: Type "Contract Risk Review" in the Name field.
- Expected: Counter shows *(20/80)*.

**Scenario 16** — Name capped at 80 characters.
- Action: Paste a 200-character string into Name.
- Expected: Only the first 80 characters are accepted. Counter shows *(80/80)*. Further keystrokes are ignored.

**Scenario 17** — Practice area defaults to Legal.
- Action: Open the builder.
- Expected: Practice area dropdown shows *Legal*.

**Scenario 18** — Status toggle defaults to Active.
- Action: Open the builder.
- Expected: Status shows *Active* highlighted, *Draft* not highlighted. Help text describes both states.

**Scenario 19** — Sample output renders markdown in the preview.
- Action: Paste markdown into the Sample output field. Hover the *Preview* link if present.
- Expected: Preview renders headings, bullets, bold text.

**Scenario 20** — Visibility radio defaults to Firm-wide.
- Action: Open the builder.
- Expected: *Firm-wide* card is selected, *Personal* is not.

**Scenario 21** — Continue advances to Pipeline only after all required fields are valid.
- Action: Fill name only, leave practice area empty. Click *Continue to Pipeline*.
- Expected: Button is disabled or click is a no-op. (Default values for practice area and status make this rare; this scenario protects against regression.)

**Scenario 22** — Cancel discards a partially-filled draft.
- Action: Fill name and description. Click *Cancel*.
- Expected: Confirmation dialog *"Discard this workflow? Your changes will be lost."* Confirming returns to the picker without saving.

### 8.4 Builder — Pipeline step

**Scenario 23** — Pipeline step opens with one default step.
- Action: Click *Continue to Pipeline*.
- Expected: Step list shows one step with operation type *Read Documents* (default). Step number *01*. Counter shows *1 / 8 steps*.

**Scenario 24** — Add Step adds a new step at the end.
- Action: Click *Add Step*.
- Expected: A second step appears with default operation. Counter shows *2 / 8 steps*.

**Scenario 25** — Max 8 steps enforced.
- Preconditions: 8 steps in the pipeline.
- Action: Inspect *Add Step*.
- Expected: Button is disabled. Tooltip *"Max 8 steps per workflow."*

**Scenario 26** — Removing a step renumbers remaining steps.
- Preconditions: 3 steps in the pipeline.
- Action: Remove the middle step.
- Expected: Remaining steps renumber to *01* and *02*. Counter shows *2 / 8 steps*.

**Scenario 27** — Reordering with drag handle updates step numbers.
- Preconditions: 3 steps.
- Action: Drag step 3 above step 1.
- Expected: Steps renumber *01* (was 3), *02* (was 1), *03* (was 2).

**Scenario 28** — Estimated duration updates as steps are added or removed.
- Action: Observe the *Estimated total* line. Add a step.
- Expected: The estimate increases by the new step's typical duration.

**Scenario 29** — Save workflow disabled with no steps.
- Preconditions: Pipeline step open. All steps removed.
- Action: Inspect *Save workflow*.
- Expected: Button disabled.

**Scenario 30** — Save workflow disabled when any step is missing an operation type.
- Action: Open a step's operation dropdown, select "None" (if possible), or leave a freshly-added blank step. Inspect Save.
- Expected: Save disabled.

**Scenario 31** — Save creates the workflow and returns to the picker.
- Action: With one valid step, click *Save workflow*.
- Expected: Builder closes. Picker reflects the new workflow card. Toast *"Workflow saved."*

**Scenario 32** — Back to details preserves Pipeline state.
- Action: On Pipeline step, click *Back to details*. Return to Pipeline.
- Expected: Step list unchanged. No data lost.

### 8.5 Edit existing workflow

**Scenario 33** — Edit pre-populates every field.
- Preconditions: Workflow exists with name, description, sample output, and 3 steps.
- Action: Open detail rail. Click *Edit workflow*.
- Expected: Builder opens at Details step. All fields populated. Title reads *Edit Workflow*. Save button reads *Save changes*.

**Scenario 34** — Edit advances to Pipeline with current steps loaded.
- Action: From Details step, click *Continue to Pipeline*.
- Expected: Pipeline step shows the existing 3 steps in order with their operation types and names populated.

**Scenario 35** — Save changes commits and returns to the picker.
- Action: After editing, click *Save changes*.
- Expected: Builder closes. Picker reflects the updated workflow. Toast *"Workflow updated."*

### 8.6 Status lifecycle

**Scenario 36** — Active workflow visible in default grid.
- Expected: Status badge *Active* (green) on the card. Workflow runnable.

**Scenario 37** — Setting status to Draft hides the workflow from non-owners.
- Action: Edit a firm-wide workflow. Flip Status to *Draft*. Save.
- Expected: Other firm members no longer see the workflow on next picker open. The owner still sees it under the *Mine* tab.

**Scenario 38** — Archiving from the kebab moves the workflow to Archived.
- Preconditions: Active workflow card. Logged in as admin.
- Action: Open the kebab on the card. Click *Archive*.
- Expected: Confirmation dialog. Confirming removes the card from default view. Found again under *Archived* status tab.

**Scenario 39** — Archived workflow cannot be run from the picker.
- Preconditions: Archived workflow visible under Archived tab.
- Action: Click *Run* on the card.
- Expected: *Run* button is absent or disabled with tooltip *"Restore this workflow to run it."*

**Scenario 40** — Restoring an archived workflow returns it to Active.
- Action: From the Archived tab, click *Restore* on the kebab.
- Expected: Workflow re-appears in the default grid as Active.

### 8.7 Visibility

**Scenario 41** — Promotion from Personal to Firm-wide requires confirmation.
- Action: Edit a personal workflow. Flip Visibility to *Firm-wide*. Save.
- Expected: Confirmation dialog *"Make this workflow visible to everyone in the firm?"* Confirming saves and shares the workflow.

**Scenario 42** — Firm-wide visibility makes the workflow available to other users.
- Preconditions: User A promoted a workflow to Firm-wide.
- Action: User B (same org) refreshes the picker.
- Expected: The workflow now appears on User B's picker.

**Scenario 43** — Demotion from Firm-wide to Personal requires confirmation.
- Action: Edit a firm-wide workflow. Flip Visibility to *Personal*. Save.
- Expected: Confirmation dialog *"Hide this workflow from the rest of the firm?"* Confirming saves and hides.

**Scenario 44** — Demotion only allowed by owner or admin.
- Preconditions: Logged in as a team member who is not the workflow's owner. Edit affordance available.
- Action: Inspect the Visibility toggle.
- Expected: Toggle is disabled with tooltip *"Only the owner or an admin can change visibility."*

### 8.8 Role gating

**Scenario 45** — External user does not see the Workflows nav item.
- Action: Log in as an external user. Inspect the sidebar.
- Expected: *Workflows* nav item absent.

**Scenario 46** — Team member cannot create a Firm-wide workflow.
- Preconditions: Logged in as team member.
- Action: Open the builder.
- Expected: Visibility *Firm-wide* radio card is disabled with tooltip *"Only managers and admins can create firm-wide workflows."*

**Scenario 47** — Manager can create both Personal and Firm-wide workflows.
- Preconditions: Logged in as manager.
- Action: Open the builder.
- Expected: Both Visibility radio cards are selectable.

**Scenario 48** — Admin can delete any workflow.
- Preconditions: Logged in as admin. Detail rail open on a firm-wide workflow.
- Action: Open the kebab. Inspect *Delete*.
- Expected: *Delete* option available with confirmation dialog.

### 8.9 Edge cases

**Scenario 49** — Workflow with no Sample output omits the *See sample output →* link.
- Preconditions: Workflow created without sample output.
- Action: Open detail rail.
- Expected: No sample-output link or button. Rail body shows description and steps only.

**Scenario 50** — Workflow with a very long name truncates with ellipsis.
- Preconditions: Workflow name at the 80-char cap.
- Action: View the picker.
- Expected: Card title truncates on a single line with ellipsis. Hovering shows the full name.

**Scenario 51** — Workflow with a single step renders correctly.
- Preconditions: Workflow created with 1 step.
- Action: Open the detail rail.
- Expected: Step list shows a single step. No "or use multi-step" hint. Run flow works the same as multi-step.

**Scenario 52** — Concurrent edit by two admins.
- Preconditions: Admin A and Admin B both open the same workflow in the builder.
- Action: Admin A saves first. Admin B saves second.
- Expected: Admin B receives a toast *"This workflow was updated by another admin. Reload to see the latest version."* Admin B's unsaved changes are preserved in the form until they explicitly discard.

**Scenario 53** — Deleting a workflow from under an in-flight run.
- Preconditions: A run is in progress. Admin opens the picker and deletes the workflow.
- Action: Wait for the run to complete.
- Expected: Run completes normally and surfaces the report. Toast on the picker confirms the deletion. New runs of the deleted workflow are not possible.

### 8.10 Accessibility and responsive

**Scenario 54** — Tab order on the picker.
- Action: Tab from page-load.
- Expected: Focus moves through Back-to-chat, New Workflow, stat tiles, filter controls, then cards in row-major order.

**Scenario 55** — Picker grid collapses to one column at 375 px viewport.
- Action: Resize to 375 px.
- Expected: Cards render one per row. Toolbar wraps.

**Scenario 56** — Builder remains usable at mobile widths.
- Action: Resize to 375 px during builder use.
- Expected: Wizard layout remains linear. Step indicator stays visible at the top. Inputs stack vertically.

**Scenario 57** — Detail rail becomes a full-screen modal on mobile.
- Action: Resize to 375 px. Click a card.
- Expected: Detail rail covers the picker entirely with a back button.

---

## 9. Open questions and known gaps

- **Q1** — There is no text search on the picker in v1. With more than ~10 workflows, browsing becomes harder. Owner: PM. v1.1 candidate.
- **Q2** — Modifying a pre-loaded workflow as an admin is irreversible — there is no "reset to default" affordance. Should there be? Owner: PM.
- **Q3** — Concurrent edit (Scenario 52) currently warns the second admin but doesn't formally lock. Is optimistic-concurrency acceptable, or do we need pessimistic locking? Owner: PM + Eng.
- **Q4** — Workflow analytics (which workflows are run most, by whom, with what success rate) are not exposed in the picker. Owner: PM. v1.1 candidate.
- **Q5** — Sample output is rendered as markdown in v1. Should we sanity-check the markdown for length, image embeds, or scripting attempts before render? Owner: Security review.
- **Q6** — Practice area list is fixed in v1 (Legal / M&A / Employment / Privacy / Litigation / Custom). Do firms need to add their own categories? Owner: PM.
- **Q7** — There is no per-workflow favouriting in v1. Some attorneys want a "pin to top" affordance for their most-used workflows. Owner: PM.

---

## 10. Document control

- **Version:** 1.0
- **Date:** 2026-05-28
- **Author:** Arjun Sharma, Product
- **Reviewers:** Pending sign-off — PM lead, QA lead, client stakeholder
- **Related FRDs:** `FRD_Workflow_Operations.docx` (per-operation behaviour), `FRD_Workflow_Execution.docx` (run experience), `FRD_Knowledge_Pack.docx` (sibling library module), `FRD_YourVault.docx` (document source).

### Revision history

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0 | 2026-05-28 | Arjun Sharma | Initial draft. Covers picker, detail rail, two-step builder, status lifecycle, visibility, role gating, accessibility, and 57 QA scenarios. |
