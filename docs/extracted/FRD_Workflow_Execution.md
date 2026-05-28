# FRD — Workflow Execution

**Version:** 1.0
**Date:** 2026-05-28
**Author:** Arjun Sharma, Product
**Status:** Draft

---

## 1. Document overview

### Purpose

This document specifies the functional behaviour of **running a workflow** in YourAI — the Pre-Run modal where the attorney supplies documents, the progress experience that surfaces while the run is in flight, the report card that lands in chat when the run completes, the run history, the cancel flow, and the error states.

This document is paired with two siblings:

- `FRD_Workflows.docx` — the picker, the builder, the lifecycle, and the management surfaces.
- `FRD_Workflow_Operations.docx` — what each operation does, the standard library, and per-operation behaviour.

Together the three documents cover the full Workflows feature.

### Audience

Product managers, QA engineers, and client stakeholders.

### Scope

In scope:

- The Pre-Run modal — entering documents, reviewing the pipeline, kicking off the run
- The in-flight progress experience — the docked progress panel, the in-chat progress card, step-by-step status
- The completed report card in chat
- The cancel flow and the "another run is already running" guard
- The run history list and re-run flow
- Failure modes: extraction failure, timeout, network failure, partial step failure

Out of scope:

- Authoring a workflow definition (covered in `FRD_Workflows.docx`)
- The per-operation contract (covered in `FRD_Workflow_Operations.docx`)
- Server-side run persistence (Sprint 2 backend deliverable)
- Cross-device run sync (Sprint 2 backend deliverable)

### Glossary

- **Run** — One specific execution of a workflow against specific documents at a specific time.
- **Pre-Run modal** — The screen the attorney sees between clicking *Run* and the workflow actually starting. Captures documents and confirms the recipe.
- **Progress card (in chat)** — A compact card that appears in the chat thread when a run starts, updates in real time as steps complete, and collapses to a one-line summary when the run finishes.
- **Progress panel (docked)** — A right-side panel that shows the same run with more detail. Opens from the in-chat progress card's *View progress →* link.
- **Report card** — The final document-style output that lands in the chat thread when the run completes successfully.
- **Run history** — A list of all past runs, filterable, with a re-open and re-run affordance per entry.
- **Active run** — A run that is currently in flight (status *running*).
- **Concurrency guard** — A dialog that appears if the attorney tries to start a second run while one is already running.

### Document control summary

| Item | Value |
|---|---|
| Version | 1.0 |
| Date | 2026-05-28 |
| Author | Arjun Sharma, Product |
| Status | Draft for PM + QA review |

---

## 2. Background and context

### What execution covers

The "execution" surfaces are everything between the attorney clicking *Run* on a workflow card and the attorney reading the resulting report. There are four logical phases:

1. **Pre-Run** — the modal where the attorney confirms what they're about to do and supplies documents.
2. **In-flight** — the run is happening. Two surfaces update in real time: the in-chat progress card (compact, in the conversation) and the docked progress panel (detailed, on the right).
3. **Completed** — the report card lands in chat. The attorney reads it and either acts on it or runs the workflow again with different inputs.
4. **History** — every past run is saved and re-openable from the picker.

Each phase has its own surface, its own state machine, and its own error modes. This FRD covers all four.

### Why this is a separate FRD

The picker and builder describe *what* a workflow is. The operations describe *what each step does*. This FRD describes *what running a workflow feels like* — and that is the part attorneys spend the most time in. A successful build of a workflow happens once; a run happens dozens of times per matter.

### Where execution sits in the broader system

A workflow run is anchored to the chat thread the attorney was in when they clicked *Run*. The in-chat progress card and the eventual report card land in that thread. The docked progress panel is available regardless of which chat the attorney has open — clicking *View progress →* from anywhere brings them back to the active run.

A run consumes the documents the attorney supplies at Pre-Run time. It does not see uploaded documents the attorney attached to the chat earlier in the conversation — those are independent. (If an attorney wants to use a document already in the chat, they upload it again in the Pre-Run modal.)

### Recent state

The Pre-Run modal was redesigned in late April to combine the document upload area with an expandable view of the workflow's pipeline. Earlier the attorney saw only the upload area and had to leave the modal to remember what the workflow actually did. The current modal shows both.

The in-chat progress card and the docked progress panel were introduced together so the attorney has both an at-a-glance status in the conversation and a deeper status surface when they want it.

---

## 3. Module-level functional specification

### 3.1 Pre-Run modal — opening

![[screenshot:03-prerun-modal-full.png|The Pre-Run modal — shows the workflow's pipeline expanded as a numbered list at the top, the upload area in the middle, the estimated run time and a Run Workflow button at the bottom.]]

The Pre-Run modal opens when the attorney clicks *Run* anywhere — from a card in the picker, from the detail rail, from the re-run affordance in the run history. The modal covers the right portion of the screen as a full-height side rail; the chat surface remains visible on the left at reduced width.

**Modal header.**

- *← Back to Workflows* button on the left
- *Edit workflow* button on the right (visible if the user has edit permission)

**Modal body — workflow header.**

- Workflow name in serif typography
- Description (full text)
- Practice area tag

**Modal body — Workflow Steps.**

The pipeline renders as a numbered list of step cards. Each card shows:

- Step number on the left (*1*, *2*, *3*, *4*) in a navy circle
- Step name (clickable to expand)
- Operation type below the name
- *+* (collapsed) or *−* (expanded) toggle on the right

Expanding a step reveals the step's description and any reference document attached to it. The step list defaults to all collapsed; expanding gives the attorney a deeper view of what each step will do.

**Modal body — Upload your working documents.**

- A required field with the label *"Upload your working documents *"* and a *"* Required"* indicator
- One-line subtitle: *"These are the documents the workflow will analyse. Upload all relevant files before running."*
- A drag-and-drop zone — *"Drag files here to upload"* + *"PDF, DOCX, XLSX, TXT · up to 100 MB each"* + an *"or browse files"* link

**Modal footer.**

- Estimated duration on the left — *"Takes ~14s • No changes will be made to your documents"*
- *Cancel* button
- *Run Workflow* button — primary, disabled until at least one document is supplied

### 3.2 Pre-Run — uploading documents

The attorney supplies documents in three ways: drag-and-drop into the zone, click *or browse files*, or use the *+* button if it appears alongside (it doesn't, in v1 — the drag/browse is the only path).

As each file is added:

- A row appears in the upload area with file icon, name, size, and a processing status
- The status starts at *Uploading…* and progresses to *Extracting…* to *Ready* or *Failed*
- A remove icon appears on the right of each row
- The *Run Workflow* button becomes active when at least one file reaches *Ready*

**Validation.**

- Per-file: 100 MB cap (different from the chat's 25 MB cap because workflows handle larger documents)
- Allowed types: PDF, DOCX, XLSX, TXT
- A file outside the allowed types or exceeding the cap is rejected immediately with an inline error per row

**Multi-file behaviour.**

The attorney can upload one to many documents per run. There is no upper limit on file count in v1, though the practical limit is ~10 documents because larger sets blow past the model's context.

### 3.3 Pre-Run — kicking off the run

Clicking *Run Workflow* commits the run. The Pre-Run modal closes, the in-chat progress card appears in the active chat thread (with a pulsing indicator), and the docked progress panel slides in from the right.

If the *Run Workflow* button is disabled (no documents uploaded), clicking it is a no-op. A subtle helper text appears below the button: *"Upload at least one document to run this workflow."*

### 3.4 Concurrency guard

A user can have at most one workflow run active at a time. If the attorney attempts to start a second run (clicks *Run Workflow* in another Pre-Run modal, or clicks *Run* in the picker) while one is in flight, a modal intercepts:

> *"A workflow is already running."*
>
> *"<Workflow name> is on step <N> of <total>."*
>
> Buttons: *View progress* / *Wait — I'll come back later* / *Cancel the running workflow and start a new one*

The third button cancels the in-flight run (with confirmation) and proceeds with the new Pre-Run modal.

### 3.5 In-chat progress card

When a run starts, a compact progress card appears in the chat thread, anchored to the conversation the attorney was in when they clicked *Run*.

**Card layout.**

- A pulsing green dot on the far left
- Workflow name in a single line
- Status text — *"Step <N> of <total>: <current step name>"*
- A *"View progress →"* link on the right
- A small spinner or progress bar (optional)

The card updates as steps complete — the *Step N of total* increments, the current-step name changes, the pulsing dot continues.

**On completion**, the card collapses to a one-line summary:

> *"Contract Risk Review completed — 4 steps run in 14s. View report →"*

Clicking *View report →* scrolls to or focuses the report card below.

**On cancellation**, the card collapses with a cancellation note:

> *"Contract Risk Review cancelled at step 2 of 4."*

**On failure**, the card collapses with an error summary:

> *"Contract Risk Review failed at step 3 of 4: <reason>. View details →"*

Clicking *View details →* opens the progress panel showing the failure point.

### 3.6 Docked progress panel

The docked progress panel is a right-side rail showing the same run as the in-chat card, with more detail. It opens automatically when a run starts; the attorney can collapse it via a close button if they prefer the compact in-chat view.

**Panel header.**

- Workflow name
- Status pill — *Running*, *Completed*, *Failed*, *Cancelled*
- Cancel button (when status is *Running*)
- Close button

**Panel body — step list.**

Each step is a row showing:

- A status icon: pending (grey circle), running (pulsing dot), complete (green check), failed (red X), skipped (grey dash)
- Step name
- Operation type below the name
- Duration on the right — *"~3s"*, *"5s"*, *"—"* (pending)

Clicking a completed step row expands the step to show its output below.

**Panel footer.**

- Total elapsed time
- Run start time
- A *"Re-run with different documents"* link (visible when status is Completed)

### 3.7 Report card in chat

When a run completes successfully, a report card appears in the chat thread below the progress card. The report card is the final deliverable — the document-style memo Generate Report produced.

**Report card layout.**

- A header strip with the workflow name, run timestamp, and a kebab menu
- The body — the Generate Report markdown rendered with headings, bullets, blockquotes, citation badges
- A footer with action buttons: *Copy as Markdown*, *Print*, *Download PDF*, *Re-run*

**Report rendering.**

- H1 reads the workflow's name + a short matter line (e.g. *"Contract Risk Review — NDA_Acme.pdf"*)
- H2 sections per Generate Report's standard structure (Executive summary, Key findings, Recommended actions, Detailed findings, Citations)
- Citation badges below each finding link back to the source (in v1 a tooltip; in a future version, a click that scrolls the source document)
- Severity-tagged findings use the operation's colour codes

**Reopen behaviour.**

Even after the chat is scrolled or refreshed, the report card persists in the thread. The attorney can scroll back to it at any time. Clicking the workflow name in the report header opens the workflow's detail rail in the picker.

### 3.8 Run history

The run history is reachable from two entry points:

- A *Recent runs* section in the picker, just below the stat tiles
- A small *History* button in the workflow detail rail, showing every past run of that specific workflow

**Run history layout.**

A table or list with columns:

| Column | Content |
|---|---|
| Date | Timestamp of the run |
| Workflow | Workflow name |
| Documents | Names of the supplied documents |
| Duration | Total run time |
| Status | *Completed*, *Failed*, *Cancelled* |
| Actions | *Open report*, *Re-run* |

**Filters.**

- Workflow (dropdown)
- Status (multi-select)
- Date range (Today / 7d / 30d / All time)

**Re-run.**

Clicking *Re-run* opens the Pre-Run modal pre-populated with the same workflow and documents from the past run. The attorney can keep the documents or replace them before clicking *Run Workflow*.

**Persistence note.** In v1, run history lives on the device. Closing the tab does not delete it (the run is persisted locally), but signing in on a different device shows no history. Server-side persistence is a Sprint 2 deliverable.

### 3.9 Cancellation

A run can be cancelled at any time from the docked progress panel's *Cancel* button or from the in-chat progress card's kebab.

**Cancel flow.**

1. Click *Cancel*.
2. Confirmation dialog: *"Cancel <workflow name>? The run will stop at the current step. Outputs from completed steps will be preserved in the run history but no report will be produced."*
3. Confirm: run cancels. The in-chat progress card collapses to the cancellation note. The docked panel shows status *Cancelled*. No report card is produced.

**Cancel timing.**

- Cancelling between steps is immediate.
- Cancelling mid-step waits for the current step's LLM call to complete or time out, then halts. The dialog warns: *"The current step may take up to <N>s to finish."*

### 3.10 Error states

**Step failure** — a step returned an error (operation failed, malformed input, an internal issue).

The run halts at the failed step. The docked progress panel shows the failed step in red with an error message. The in-chat progress card collapses to the error summary. No report is produced, but the partial output (steps that did complete) is preserved in the run history.

**Timeout** — a step did not return within its time budget (90 seconds per step in v1).

The step is marked *Failed (timeout)*. The run halts. Same surfacing as Step failure.

**Network failure** — the attorney loses connectivity during the run.

The run pauses; a banner appears in the docked panel: *"Connection lost. The run will resume when you're back online."* When connectivity returns, the run continues from the next step. If connectivity does not return within 5 minutes, the run is marked *Failed (network)*.

**Document extraction failure** — Read Documents could not read one or more files.

If all files failed, the run fails immediately (covered in `FRD_Workflow_Operations.docx` §4.1). If some files were readable, the run proceeds with the readable subset and the in-chat card and report note which files were skipped.

**Quota exceeded** — the firm has reached its monthly run quota (if quotas are enabled by the admin).

The run cannot start. The Pre-Run modal surfaces an in-modal banner: *"Your firm has reached its monthly workflow quota. Contact your admin to increase the limit."* Run button disables.

---

## 4. Per-entity / per-variant specification

*N/A — Execution does not have multiple visual variants per workflow. Every run uses the same Pre-Run modal, the same progress card, and the same report card. Differences between Contract Risk Review and NDA Quick Review at run time are entirely in the steps, not in the surfaces that display them.*

For per-step output behaviour, see `FRD_Workflow_Operations.docx` §4.

---

## 5. Cross-cutting behaviour

### Anchor to the chat thread

Every run is anchored to one chat thread — the thread the attorney was in when they clicked *Run*. The in-chat progress card and the report card both appear in that thread. Switching to another chat thread while a run is in flight does not move the cards; they stay in the originating thread. The docked progress panel, however, is global — the attorney can switch chats and still see the running workflow on the right.

### Multi-chat browsing during a run

The attorney can do anything else in the product while a run is in flight: send messages in other chats, open YourVault, run other (non-workflow) tasks. The only thing they cannot do is start another workflow run (concurrency guard, §3.4).

### Document handling

Documents supplied to the Pre-Run modal are not auto-saved to YourVault in v1. (They could be in a future version, behind a *"Save these documents to YourVault for re-use"* checkbox.) The documents exist only for the duration of the run; once the run completes, they are no longer accessible — the attorney would need to re-upload to use them again.

The report card preserves the document names in its header so the attorney can see what was analysed.

### Source attribution

Findings in the report card carry citations back to the supplied documents. Citations render as small navy badges below each finding. Clicking a citation badge in v1 opens a tooltip with the citation text. In a future version, the badge would scroll the document picker open to the cited location.

### Permission gating

| User role | Pre-Run | Run | Cancel own | Cancel others' | View own history | View firm history |
|---|---|---|---|---|---|---|
| External user | — | — | — | — | — | — |
| Team member | Yes | Yes | Yes | No | Yes | No |
| Manager | Yes | Yes | Yes | No | Yes | No |
| Org admin | Yes | Yes | Yes | Yes | Yes | Yes |

The "View firm history" capability is admin-only and lives behind an *"All runs across firm"* toggle in the run history view.

### Persistence

- Runs in flight are held in memory and on local storage.
- Completed runs are preserved in local storage. The list is filterable and re-runnable.
- Cross-device sync is a Sprint 2 backend deliverable.

---

## 6. Special-case modes

### 6.1 Single-step workflow run

A workflow with one step still goes through the full execution flow — Pre-Run modal, in-chat progress card, docked panel, report card. The progress card just shows *Step 1 of 1* throughout. The single step's output is the report.

### 6.2 Workflow without Generate Report

If the workflow does not have Generate Report as its final step (which the builder allows but discourages), the final step's output is rendered as the report. The report card looks the same; the body is just the final operation's output verbatim, without synthesis.

### 6.3 Re-run

Re-running a workflow opens the Pre-Run modal pre-populated with the prior run's documents. The attorney can:

- Keep the documents and click *Run Workflow* — runs the same workflow with the same inputs (useful for re-running after a workflow definition has been edited).
- Replace one or more documents — runs the same workflow with new inputs.
- Cancel — closes the modal without running.

Re-runs are not linked to the prior run in any visible way in v1. They appear as fresh entries in the history.

### 6.4 Run while offline

If the attorney is offline at the moment they click *Run Workflow*, the modal surfaces an inline message: *"You're offline. The run will start when you're back online."* The run is queued and starts automatically on reconnection.

---

## 7. Accessibility and interaction notes

### Keyboard navigation

- The Pre-Run modal traps focus inside the modal. Tab cycles through Edit workflow, Workflow Steps expand toggles, upload area, footer buttons.
- Step expand toggles activate with Enter or Space.
- The drag-and-drop zone is keyboard-reachable; the *or browse files* link inside opens the file picker on Enter.
- *Run Workflow* is the default action when focus is in the upload area and Enter is pressed (only when the button is enabled).
- The docked progress panel can be closed with Escape.

### Screen-reader announcements

- The Pre-Run modal announces *"Pre-Run for <workflow name>. <Step count> steps. Upload required."*
- Document upload status announces *"<filename> uploading"*, *"<filename> ready"*, *"<filename> failed"*.
- Run start announces *"Workflow <name> started. Step 1 of <total>: <step name>."*
- Step transitions announce *"Step <N> complete. Step <N+1> running: <step name>."*
- Run completion announces *"Workflow <name> completed in <duration>. Report ready."*

### Click targets

- All buttons (Edit, Cancel, Run Workflow, step expand toggles, file remove icons) are at least 44 by 44 pixels.

### Focus indicators

- Visible focus ring in brand navy on every focusable element.
- Step expand toggles show their expanded state visibly (icon flip).

### Visual conventions

- The pulsing dot in the in-chat progress card and the docked panel uses the same green colour code (matches the *Active* status colour used elsewhere).
- Step status icons (pending grey, running green, complete green check, failed red X) maintain at least 4.5:1 contrast against the panel background.
- The report card uses standard YourAI typography (DM Serif for the H1, DM Sans for body) consistent with other long-form outputs.

### Responsive behaviour

- The Pre-Run modal becomes a full-screen modal on viewports under 640 pixels.
- The docked progress panel becomes a slide-up sheet on mobile.
- The report card renders the same on all viewports; long markdown bodies scroll within the card.

---

## 8. QA test scenarios

Scenarios are numbered sequentially.

### 8.1 Pre-Run modal — opening and rendering

**Scenario 1** — Pre-Run modal opens from picker card *Run* button.
- Action: Click *Run* on a workflow card in the picker.
- Expected: Pre-Run modal opens as a right-side rail. Workflow name and description visible. Step list visible. Upload area visible. Run Workflow button disabled.

**Scenario 2** — Pre-Run modal opens from detail rail *Run* button.
- Preconditions: Detail rail open on a workflow.
- Action: Click *Run* in the detail rail.
- Expected: Pre-Run modal opens. Same content as Scenario 1.

**Scenario 3** — Pre-Run modal opens from run history *Re-run*.
- Preconditions: At least one completed run in history.
- Action: Click *Re-run* on a history entry.
- Expected: Pre-Run modal opens with the workflow's metadata, step list, AND the documents from the prior run pre-populated in the upload area as *Ready*.

**Scenario 4** — Step list is collapsed by default.
- Action: Open the Pre-Run modal.
- Expected: All step cards show the *+* icon. No step descriptions visible.

**Scenario 5** — Expanding a step shows its description.
- Action: Click a step card.
- Expected: The card expands. The step's description and operation type are visible.

**Scenario 6** — Multiple steps can be expanded simultaneously.
- Action: Expand Step 1, then Step 3.
- Expected: Both expand. Step 2 remains collapsed.

**Scenario 7** — Edit workflow button hidden for non-admin on pre-loaded workflows.
- Preconditions: Logged in as a team member. Pre-Run modal open on Contract Risk Review.
- Action: Inspect the modal header.
- Expected: Edit workflow button is absent.

### 8.2 Pre-Run modal — document upload

**Scenario 8** — Drag-and-drop upload.
- Action: Drag a PDF onto the upload zone.
- Expected: A row appears with status *Uploading*, then *Extracting*, then *Ready*. The Run Workflow button becomes active.

**Scenario 9** — Click *or browse files* opens the file picker.
- Action: Click the link.
- Expected: Native file picker opens. Selecting a file adds it to the upload area.

**Scenario 10** — Multiple files upload concurrently.
- Action: Drag three files at once.
- Expected: Three rows appear. Each shows its own processing status independently. Run Workflow activates when at least one reaches *Ready*.

**Scenario 11** — File over 100 MB rejected.
- Action: Drop a 150 MB file.
- Expected: Inline error: *"File exceeds 100 MB limit."* No row added. Other files unaffected.

**Scenario 12** — Unsupported file type rejected.
- Action: Drop a `.png` image.
- Expected: Inline error: *"Unsupported file type. PDF, DOCX, XLSX, or TXT only."*

**Scenario 13** — Remove file row.
- Preconditions: Two files in the upload area.
- Action: Click the remove icon on one row.
- Expected: Row disappears. Other file remains. If the removed file was the only one *Ready*, the Run Workflow button disables.

**Scenario 14** — Extraction failure shows in the row.
- Action: Upload a corrupt PDF.
- Expected: Row reaches status *Failed* with a tooltip explaining (*"Could not read document — file may be corrupt"*). Other files unaffected. Run Workflow is active only if at least one other file is *Ready*.

**Scenario 15** — Run Workflow disabled with no documents.
- Action: Open the modal. Don't upload anything.
- Expected: Run Workflow disabled. Helper text below: *"Upload at least one document to run this workflow."*

### 8.3 Run kickoff

**Scenario 16** — Clicking Run Workflow closes the modal and starts the run.
- Preconditions: One document is *Ready*.
- Action: Click Run Workflow.
- Expected: Modal closes. In-chat progress card appears in the active thread. Docked progress panel slides in from the right.

**Scenario 17** — In-chat card shows current step.
- Action: Observe the in-chat card immediately after kickoff.
- Expected: Pulsing green dot. Text: *"Step 1 of <total>: Read Documents"*. *View progress →* link visible.

**Scenario 18** — Docked panel shows full step list.
- Action: Look at the docked panel.
- Expected: Every step listed. Step 1 shows the *running* indicator; remaining steps show *pending*.

### 8.4 Concurrency guard

**Scenario 19** — Starting a second run while one is in flight is intercepted.
- Preconditions: A run is in progress.
- Action: Open the picker. Click *Run* on another workflow.
- Expected: Concurrency-guard modal appears. Three buttons: *View progress*, *Wait*, *Cancel running and start new*.

**Scenario 20** — *View progress* closes the guard and opens the docked panel.
- Action: Click *View progress*.
- Expected: Guard dismisses. Docked panel is visible (if it wasn't already).

**Scenario 21** — *Wait* closes the guard without changes.
- Action: Click *Wait*.
- Expected: Guard dismisses. No second Pre-Run opens. Active run continues.

**Scenario 22** — *Cancel running and start new* cancels then opens the new Pre-Run.
- Action: Click *Cancel running and start new*.
- Expected: A nested confirmation dialog appears: *"Cancel the running workflow?"* Confirming cancels the active run and opens the new workflow's Pre-Run modal.

### 8.5 In-flight progress

**Scenario 23** — Progress card updates as each step completes.
- Action: Observe the in-chat card during a multi-step run.
- Expected: *Step N of total* increments. Current-step name changes. Pulsing dot continues.

**Scenario 24** — Step list in docked panel updates.
- Action: Observe the docked panel during a run.
- Expected: As each step completes, its icon flips from pulsing to green check, its duration ticks down to a final value.

**Scenario 25** — Clicking a completed step row expands its output.
- Preconditions: At least one step has completed.
- Action: Click the step row.
- Expected: Step expands inline. The step's output (operation-specific format) renders below the row.

**Scenario 26** — *View progress →* in the in-chat card opens the docked panel.
- Preconditions: Docked panel is closed.
- Action: Click *View progress →* in the in-chat card.
- Expected: Docked panel slides in from the right.

### 8.6 Run completion

**Scenario 27** — Successful completion produces the report card.
- Action: Wait for a multi-step run to complete.
- Expected: Report card appears below the in-chat progress card. Progress card collapses to one-line summary. Docked panel status pill changes to *Completed*.

**Scenario 28** — Report card header reads the workflow name and run timestamp.
- Action: Inspect the report card.
- Expected: H1 reads *"<Workflow name> — <document names>"*. Timestamp visible.

**Scenario 29** — Citation badges below findings open tooltips.
- Action: Hover or click a citation badge.
- Expected: Tooltip shows the full citation text (document name + section + page).

**Scenario 30** — *Copy as Markdown* writes the report to clipboard.
- Action: Click *Copy as Markdown* in the report card footer.
- Expected: Toast: *"Report copied as markdown."* Pasting elsewhere produces the rendered text.

**Scenario 31** — *Print* opens the browser print dialog.
- Action: Click *Print*.
- Expected: Browser print dialog opens. The print stylesheet renders the report cleanly without sidebar or chat chrome.

**Scenario 32** — *Download PDF* triggers a download.
- Action: Click *Download PDF*.
- Expected: PDF file downloads. Filename includes workflow name and timestamp.

**Scenario 33** — *Re-run* in the report card opens the Pre-Run modal pre-populated.
- Action: Click *Re-run*.
- Expected: Pre-Run modal opens with the same workflow and the same documents pre-populated.

### 8.7 Cancellation

**Scenario 34** — Cancel from the docked panel.
- Preconditions: A run is in flight.
- Action: Click *Cancel* in the docked panel header.
- Expected: Confirmation dialog. Confirming halts the run. Progress card collapses to cancellation note. No report card.

**Scenario 35** — Cancel mid-step warns about delay.
- Preconditions: A step is currently making an LLM call.
- Action: Click *Cancel*.
- Expected: Confirmation dialog warns *"The current step may take up to <N>s to finish."* Confirming halts after the in-flight call completes or times out.

**Scenario 36** — Cancelled run preserved in history.
- Action: Cancel a run mid-way. Open run history.
- Expected: A history entry for the cancelled run with status *Cancelled* and the step it was cancelled at.

### 8.8 Errors

**Scenario 37** — Step failure halts the run.
- Action: Trigger a step failure (e.g. Compare Against Standard with an unreadable reference).
- Expected: Run halts at the failed step. Docked panel shows the failed step in red with an error message. In-chat card collapses to error summary. No report card.

**Scenario 38** — Timeout marks the step as failed.
- Preconditions: A step takes longer than 90 seconds.
- Action: Wait for the timeout.
- Expected: Step marked *Failed (timeout)*. Run halts.

**Scenario 39** — Network failure pauses the run.
- Action: Disconnect from the network mid-run.
- Expected: Docked panel shows a banner: *"Connection lost. The run will resume when you're back online."* Run pauses.

**Scenario 40** — Network reconnection resumes the run.
- Action: Reconnect within 5 minutes.
- Expected: Run resumes from the next step. Banner clears.

**Scenario 41** — Network failure over 5 minutes fails the run.
- Action: Disconnect for 6 minutes.
- Expected: Run marked *Failed (network)*. Same surfacing as Step failure.

**Scenario 42** — All documents fail extraction → run fails.
- Action: Upload only corrupt documents.
- Expected: Run cancels immediately after Read Documents. In-chat card shows the failure. No report.

**Scenario 43** — Quota exceeded blocks the run.
- Preconditions: Firm at monthly run quota.
- Action: Open Pre-Run.
- Expected: Banner inside the modal: *"Your firm has reached its monthly workflow quota. Contact your admin to increase the limit."* Run Workflow button disabled.

### 8.9 Run history

**Scenario 44** — Run history shows every past run.
- Preconditions: Five runs have completed.
- Action: Open *Recent runs* in the picker.
- Expected: List shows five entries. Each has date, workflow, documents, duration, status, actions.

**Scenario 45** — Filter history by workflow.
- Action: Open the workflow filter dropdown. Pick Contract Risk Review.
- Expected: List narrows to runs of that workflow.

**Scenario 46** — Filter history by status.
- Action: Pick *Failed* in the status multi-select.
- Expected: List narrows to failed runs.

**Scenario 47** — Filter history by date range.
- Action: Pick *Last 7 days*.
- Expected: List narrows to runs in the last 7 days.

**Scenario 48** — Open Report from history.
- Action: Click *Open report* on a Completed entry.
- Expected: The chat thread containing the report scrolls into view. Report card is visible.

**Scenario 49** — Re-run from history.
- Action: Click *Re-run* on a Completed entry.
- Expected: Pre-Run modal opens pre-populated.

**Scenario 50** — Admin sees firm-wide history.
- Preconditions: Admin enables *All runs across firm*.
- Action: Inspect the list.
- Expected: Runs from every user appear. Each row shows the user who ran it.

### 8.10 Permissions

**Scenario 51** — External user cannot reach the Pre-Run modal.
- Action: Log in as an external user.
- Expected: Workflows nav is hidden. No way to trigger a Pre-Run.

**Scenario 52** — Team member cannot cancel another user's run.
- Preconditions: User A has a run in flight. Logged in as User B.
- Action: Inspect the docked panel (if it's even visible).
- Expected: Docked panel does not show User A's run. User B cannot interact with it.

**Scenario 53** — Admin can cancel any user's run.
- Preconditions: User A has a run in flight. Logged in as admin.
- Action: Open firm-wide history. Inspect the running entry.
- Expected: A *Cancel* action is available on the entry.

### 8.11 Re-runs and special cases

**Scenario 54** — Re-run after the workflow definition was edited.
- Preconditions: A workflow was run, then edited (a step was added), then re-run from history.
- Action: Trigger the re-run.
- Expected: The new run uses the latest version of the workflow. The Pre-Run modal shows the updated step list. The previous run's report still reflects the older version.

**Scenario 55** — Re-run with the documents removed.
- Action: From the Pre-Run modal pre-populated from a re-run, remove all documents. Click Run Workflow.
- Expected: Button is disabled (no documents = no run). Helper text guides the user to upload.

**Scenario 56** — Single-step workflow runs cleanly.
- Action: Build a one-step workflow with Summarise Documents. Run.
- Expected: Progress card shows *Step 1 of 1*. On completion, the report card renders the single step's output as the body.

**Scenario 57** — Workflow without Generate Report renders the last step as the report.
- Preconditions: Workflow has 3 steps; the last is Extract Key Dates (not Generate Report).
- Action: Run.
- Expected: Report card body is Extract Key Dates' output (a table). No "Generate Report missing" warning at run time; the builder warned at save time.

### 8.12 Accessibility

**Scenario 58** — Pre-Run modal traps focus.
- Action: Tab from inside the modal.
- Expected: Focus cycles through the modal's controls only. Tab does not escape to the chat behind.

**Scenario 59** — Drag-and-drop zone is keyboard-reachable.
- Action: Tab into the upload zone. Press Enter on the *or browse files* link.
- Expected: File picker opens.

**Scenario 60** — Progress changes announce to screen readers.
- Action: Run a workflow with a screen reader on.
- Expected: Each step transition announces aloud.

**Scenario 61** — Report card is navigable by heading.
- Action: Use screen reader heading navigation on the report card.
- Expected: H1, H2 sections of the report are reachable via heading navigation.

### 8.13 Responsive

**Scenario 62** — Pre-Run modal full-screens on mobile.
- Action: Open on a 375 px viewport.
- Expected: Modal covers the viewport. Close affordance at the top.

**Scenario 63** — Docked panel slides up on mobile.
- Action: Run a workflow on mobile. Open the docked panel.
- Expected: Panel slides up from the bottom as a sheet. Dismissable by swipe down or close button.

**Scenario 64** — Report card scrolls cleanly on mobile.
- Action: View a long report on mobile.
- Expected: Card body scrolls vertically. Footer actions remain accessible.

---

## 9. Open questions and known gaps

- **Q1** — Run history lives on the device in v1. Cross-device sync is a Sprint 2 backend deliverable. Until then, an attorney who switches laptops loses their history. Owner: PM + Eng.
- **Q2** — Documents supplied to the Pre-Run modal are not saved to YourVault. Should we add a *"Save these documents to YourVault for re-use"* checkbox? Owner: PM.
- **Q3** — Per-step time budget is 90s in v1. A few Generate Report runs against large prior outputs flirt with this cap. Adjustable per-operation budget? Owner: PM + Eng.
- **Q4** — Cancel mid-step waits for the LLM call to return. Should we expose a hard-kill option that terminates the request immediately? Owner: PM.
- **Q5** — There is no per-run cost surfacing in v1. Future versions should show token cost per step and total cost per run, surfaced in run history. Owner: PM + Eng.
- **Q6** — Quota enforcement is admin-configurable but the surface for setting and viewing the quota is not yet shipped. Owner: PM.
- **Q7** — Re-run from history with an edited workflow uses the new version silently. Should we surface a *"Workflow has changed since this run — review steps"* warning at Pre-Run time? Owner: PM.
- **Q8** — The print stylesheet for the report card has not been exercised on every browser. Worth a dedicated QA pass before client demos. Owner: QA.
- **Q9** — Failed runs preserve partial output in the history. Should the attorney be able to download the partial output even though the run failed? Owner: PM.

---

## 10. Document control

- **Version:** 1.0
- **Date:** 2026-05-28
- **Author:** Arjun Sharma, Product
- **Reviewers:** Pending sign-off — PM lead, QA lead, client stakeholder
- **Related FRDs:** `FRD_Workflows.docx` (picker + builder), `FRD_Workflow_Operations.docx` (per-operation behaviour), `FRD_Knowledge_Pack.docx`, `FRD_YourVault.docx`.

### Revision history

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0 | 2026-05-28 | Arjun Sharma | Initial draft. Covers Pre-Run modal, in-chat progress card, docked progress panel, report card, cancellation, errors, run history, role gating, accessibility, and 64 QA scenarios. |
