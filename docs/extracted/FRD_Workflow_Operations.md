# FRD — Workflow Operations

**Version:** 1.0
**Date:** 2026-05-28
**Author:** Arjun Sharma, Product
**Status:** Draft

---

## 1. Document overview

### Purpose

This document specifies the functional behaviour of every **operation** the YourAI Workflow Builder makes available as a step type. The product ships with a fixed library of operations — *Read Documents*, *Analyse Clauses*, *Compare Against Standard*, *Generate Report*, and four more — and this FRD describes what each one does, what inputs it expects, what output it produces, and how it behaves in the populated, empty, partial, and error states.

This document is paired with two siblings:

- `FRD_Workflows.docx` — the picker, the builder shell, the lifecycle, and the management surfaces.
- `FRD_Workflow_Execution.docx` — running a workflow, the progress experience, the report card, and run history.

Together the three documents cover the full Workflows feature.

### Audience

Product managers, QA engineers, and client stakeholders.

### Scope

In scope:

- Every operation in the standard library
- Per-operation inputs, outputs, and behaviour
- Per-operation states (populated, empty, partial, error)
- Per-operation citation and source-attribution behaviour
- Per-operation reference-document support
- Per-operation advanced options surfaced in the builder

Out of scope:

- Authoring a workflow as a whole (covered in `FRD_Workflows.docx`)
- The runtime mechanics of how operations chain together (covered in `FRD_Workflow_Execution.docx`)
- Defining new custom operations from scratch — Custom Operation is a placeholder in v1; the full custom-op authoring surface is a Sprint 2 deliverable.

### Glossary

- **Operation** — A pre-built AI task that can be configured as a step in a workflow. Each operation has a fixed contract: what it reads, what it writes, what its output looks like.
- **Step** — One instance of an operation inside a workflow. A workflow's pipeline is an ordered list of steps.
- **Reference document** — An optional document attached to a step (the firm's standard NDA template, an internal policy memo) that the operation consults but does not analyse as the "subject" of the run.
- **Prior-step output** — The output of an earlier step in the same run, passed to later steps as context.
- **Anti-hallucination string** — The literal phrase *"Not covered by supplied documents."* — used by every operation when it cannot find the requested information in the supplied input.
- **Citation** — A reference back to the supplied document a finding came from, in the form *"§<section>, page <n>"* or *"<document name>, §<section>"*.

### Document control summary

| Item | Value |
|---|---|
| Version | 1.0 |
| Date | 2026-05-28 |
| Author | Arjun Sharma, Product |
| Status | Draft for PM + QA review |

---

## 2. Background and context

### What an operation is

An operation is the smallest unit of work in the Workflows feature. It is a pre-defined AI task with a specific job: read a document, find clauses, compare two things, write a memo. Operations are the "verbs" of the system. A workflow is a sentence built from those verbs.

The product ships with **eight operations** in the standard library. Six of them are used by the four pre-loaded workflows (Contract Risk Review, NDA Quick Review, M&A Due Diligence Summary, Privacy & GDPR Audit). The remaining two — *Extract Key Dates* and *Check Compliance* — are available for users building their own workflows.

### Why operations are pre-built

Attorneys are not prompt engineers. Asking an attorney to write *"Analyse the following document for non-standard clauses, output in a structured table with severity colour-coding, cite each finding…"* would make Workflows unusable. Operations encapsulate that knowledge: the firm's senior attorneys configure the operation once, and every junior attorney gets the benefit of that prompt every time they run a workflow with that operation.

The standard library is tuned for the kinds of tasks attorneys do every day — review, compare, extract, summarise — and updated centrally as the prompts are improved.

### Where operations sit in the broader system

Operations appear in two places in the UI:

- In the **Workflow Builder**, as a per-step operation dropdown. The user picks an operation when adding or editing a step.
- In the **Pre-Run modal** and the **report card**, as the headline of each step ("Analyse Clauses") so the user understands what the workflow is doing at each stage.

The user does not see operation prompts. They see the operation name, an optional description, and the output. The prompt is implementation; the output is product.

---

## 3. Module-level functional specification

### 3.1 Operation library — the eight operations

Every workflow step uses one of the eight operations below. Operation type is set when the step is created and can be changed by editing the step. Changing an operation does not reset other step fields (name, description, reference document) — those carry over.

| # | Operation | Plain-English role | Typical step name | Steps where it's commonly used |
|---|---|---|---|---|
| 1 | **Read Documents** | Ingests the attorney-supplied documents so later steps can reference them. Always the first step of any workflow that operates on documents. | "Read Documents" | Step 1 of nearly every workflow |
| 2 | **Analyse Clauses** | Finds and classifies the clauses inside a contract. Outputs a structured list. | "Analyse Clauses" | Mid-pipeline in contract-review workflows |
| 3 | **Compare Against Standard** | Compares the attorney's document against a reference document (the firm's template). Outputs a delta. | "Compare Against Standard" | Mid-pipeline after Analyse Clauses |
| 4 | **Generate Report** | Synthesises prior-step outputs into a structured memo. Always the last step. | "Generate Report" | Last step of nearly every workflow |
| 5 | **Extract Key Dates** | Finds dates and deadlines in the supplied documents. Outputs a chronological list. | "Extract Key Dates" | M&A, litigation, deal-closing workflows |
| 6 | **Check Compliance** | Checks the supplied document against a stated standard (GDPR, HIPAA, ABA Model Rules). Outputs a pass/fail rubric. | "Check Compliance" | Privacy and regulatory workflows |
| 7 | **Summarise Documents** | Writes a one-page summary of the supplied documents. Useful as a standalone step or as Step 1 of a discovery-oriented workflow. | "Summarise Documents" | Light-touch workflows |
| 8 | **Custom Operation** *(placeholder)* | Reserved for user-defined operations in Sprint 2. In v1, selecting Custom surfaces a "Coming soon" notice. | — | — |

### 3.2 Operation card in the builder

When a step is added or expanded in the builder Pipeline step, the operation card surfaces:

- **Operation type** — dropdown showing the eight options. Picking one updates the rest of the card.
- **Step name** — text input pre-filled with the operation's default name (editable).
- **Description** — multi-line text. Defaults to the operation's standard description.
- **Reference document picker** *(advanced)* — optional document to attach for operations that support it (Compare Against Standard, Check Compliance).
- **Per-step prompt override** *(advanced)* — multi-line text. Pre-filled with the operation's standard prompt. Editing this overrides the default for this step in this workflow only.

### 3.3 Advanced options drawer

Each step has an *Advanced options* link below the step body. Expanding it reveals:

- **Reference document picker** — opens the YourVault picker. Selecting a document attaches it to this step only.
- **Per-step prompt override** — a textarea pre-filled with the operation's standard system prompt. Editing it is rare and reserved for senior attorneys who want to tune the operation for one specific workflow.
- **Output format** — for operations that support multiple output formats (Markdown, Table, JSON-shaped card), a small radio. Defaults to the operation's standard.

The drawer collapses by default. The default-collapsed state is the "easy mode" for attorneys who want to use the operation as configured.

### 3.4 Step execution contract

Every operation, regardless of type, follows the same contract at run time:

1. **Inputs available to it:**
   - The attorney-supplied documents (uploaded at Pre-Run time)
   - Any reference document attached to the step
   - Outputs of prior steps in the same run
   - The operation's standard or overridden prompt
2. **Output it produces:**
   - A structured payload (Markdown, table, or schema-shaped card)
   - Citations to source documents
   - A status (Success, Partial, Empty, Error)
3. **Behaviour on no usable input:**
   - The output begins with the literal anti-hallucination string *"Not covered by supplied documents."* followed by a one-sentence reason and any partial analysis possible.

### 3.5 Citation rules

Every operation cites its sources. Citations appear inline in the output and as a structured list under each finding. Citation formats:

- For attorney-supplied documents: *"<filename>, §<section number>, p. <page>"* or *"<filename>, p. <page>"* if no section is identifiable.
- For reference documents: *"Reference: <reference document name>, §<section>"*.
- For prior-step outputs: *"From Step <N>: <step name>"*.
- When the source cannot be identified precisely, the citation reads *"[Source: <document name> — section unclear]"* rather than being omitted.

Operations that produce findings (Analyse Clauses, Check Compliance, Compare Against Standard) require at least one citation per finding. Operations that produce free prose (Generate Report, Summarise Documents) require at least one citation per major claim.

---

## 4. Per-operation specification

This is the canonical section for the operation library. Each subsection follows the same template: purpose, when it appears, inputs, outputs, states, and edge cases QA should know about.

### 4.1 Read Documents

**Purpose.** Ingests every attorney-supplied document so later steps can reference them. The operation does not "do" anything analytically — it makes the documents available to the rest of the pipeline. Always the first step of any workflow that operates on documents.

**When it appears.** Step 1 of every pre-loaded workflow. The builder defaults a new workflow's first step to Read Documents.

**Output formats supported.** Internal only. No user-facing output; the operation's success is reflected by Step 2's ability to reference the documents.

**Inputs the user supplies.** The documents uploaded in the Pre-Run modal.

**Reference document.** Not applicable. Read Documents does not use a reference document.

**Per-step prompt override.** Not applicable. The operation has no LLM prompt — it is the ingestion step.

**Output description.** A confirmation note in the run report: *"Read N documents: <list of filenames>."* No body content.

**States.**
- *Success* — All supplied documents successfully ingested. Each document's name and size logged.
- *Partial* — One or more documents failed to ingest (corrupt PDF, password-protected, unsupported format). The operation surfaces *"<N> documents could not be read"* and continues with the rest. Downstream steps see only the readable subset.
- *Empty* — Zero documents supplied. The operation fails immediately and the run is cancelled with the message *"No documents were supplied. Add documents in the Pre-Run modal and try again."*
- *Error* — All documents failed (a typed PDF without OCR, an encrypted file). Run is cancelled with the same message as Empty plus a list of which documents failed and why.

**Edge cases QA should know about.**
- Mixed file types (PDF + DOCX + TXT) in one run — all should ingest cleanly.
- A 500-page PDF — ingest should succeed within the run's overall timeout.
- A PDF that is image-scan-only with no OCR — ingest succeeds but Steps 2+ may find empty text.
- A DOCX with embedded comments — ingest captures the body text only; comments are ignored.

### 4.2 Analyse Clauses

**Purpose.** Finds and classifies the clauses inside a contract or contract-like document. Produces a structured list grouped by clause type (indemnification, limitation of liability, term, confidentiality, etc.).

**When it appears.** After Read Documents in contract-review workflows (Contract Risk Review, NDA Quick Review, M&A Due Diligence Summary).

**Output formats supported.** Table (default) or Markdown.

**Inputs the user supplies.** None directly. Operates on documents ingested by Read Documents.

**Reference document.** Optional. When supplied, the operation uses it to calibrate what counts as "standard" versus "non-standard" but does not produce a side-by-side comparison. (For side-by-side, use Compare Against Standard.)

**Per-step prompt override.** Available for senior attorneys to tune the classification scheme.

**Output description.** A table with columns:

| Column | Content |
|---|---|
| Clause type | E.g. *Indemnification*, *Limitation of liability* |
| Document and section | E.g. *NDA_Acme.pdf, §8.3* |
| Plain-English summary | One sentence describing what the clause says |
| Severity | One of *Standard*, *Non-standard*, *Aggressive*, *Unusual*. Colour-coded. |
| Note | Optional one-line caveat |

Below the table, a paragraph summarises the spread (*"3 standard clauses, 2 non-standard, 1 aggressive"*).

**States.**
- *Populated* — At least one clause identified. Table renders with rows.
- *Empty* — No clauses found in the supplied documents. Output begins *"Not covered by supplied documents."* + a one-line explanation. The table renders with a single row labelled *"No clauses identified"*.
- *Partial* — Some clauses identified, others ambiguous. Ambiguous clauses appear in the table with severity *"Unclear"* and a note explaining the uncertainty.
- *Error* — The operation could not be completed (the document was unreadable, an upstream failure). Output reads *"Could not analyse clauses: <reason>"*.

**Edge cases QA should know about.**
- A document that is not a contract (e.g. a letter, a case opinion) — operation should return *Empty* with a polite explanation, not fabricate clauses.
- A clause that spans multiple sections — operation should cite the most specific section in the citation and note the span in the Note column.
- Multiple documents supplied — operation merges findings across documents, citing each.
- A very long contract (100+ clauses) — operation prioritises non-standard and aggressive clauses; standard clauses may be grouped or truncated with a *"<N> additional standard clauses identified"* trailer.

### 4.3 Compare Against Standard

**Purpose.** Compares the attorney's document against a reference document (the firm's standard template) and produces a delta — what's different, what's missing, what's been added.

**When it appears.** After Analyse Clauses in workflows that benchmark against a firm template (Contract Risk Review, M&A Due Diligence Summary).

**Output formats supported.** Markdown report (default) or Table.

**Inputs the user supplies.** None directly. Operates on documents ingested by Read Documents plus the reference document attached to this step.

**Reference document.** Required. The step is invalid in the builder until a reference document is picked. The picker opens the YourVault doc-picker modal.

**Per-step prompt override.** Available.

**Output description.** A markdown report with sections:

- *Material differences* — clauses present in both with substantive changes
- *Additions* — clauses in the attorney's document not in the standard
- *Omissions* — clauses in the standard not in the attorney's document
- *Boilerplate matches* — clauses that match the standard verbatim or near-verbatim

Each finding cites both the attorney's document and the reference document.

**States.**
- *Populated* — Differences found. Report renders with at least one finding per section that has content. Sections with no content are omitted.
- *Empty* — No reference document attached (caught at builder validation; should not reach run time). If it does, the operation surfaces *"Not covered by supplied documents."* + *"This step needs a reference template."* and the run continues.
- *Partial* — The attorney's document is a different type from the reference (e.g. comparing an NDA to an MSA). The operation surfaces a warning at the top of the output and produces what comparison it can.
- *Error* — Reference document could not be read. Output begins *"Could not compare: reference document unreadable."*.

**Edge cases QA should know about.**
- Attorney's document is shorter than reference — many "Omissions" findings expected; operation should not flag this as an error.
- Reference is shorter than attorney's — many "Additions" findings expected.
- Reference document is itself a fragment (e.g. only the indemnification section of the firm's standard) — operation should compare against the fragment and note that the scope is partial.
- Reference and attorney's document use different terminology for the same clause — operation should normalise terminology in the output (e.g. *"Limitation of Liability"* vs *"Cap on Damages"*) and note the mapping.

### 4.4 Generate Report

**Purpose.** Synthesises every prior step's output into a single structured report the attorney can hand to a client or partner. Always the last step of a workflow.

**When it appears.** Last step of every pre-loaded workflow. The builder strongly suggests this operation as the final step.

**Output formats supported.** Markdown (default). The output is the report card the attorney sees in the chat.

**Inputs the user supplies.** None directly. Operates on the outputs of every prior step in the run.

**Reference document.** Not applicable. Generate Report does not consult a reference document — it consults prior-step outputs only.

**Per-step prompt override.** Available, and commonly used. Firms often want a specific report structure (executive summary first, findings second, recommendations third, etc.) and the prompt override is where that goes.

**Output description.** A markdown memo with the workflow's name as the H1 and sections that synthesise prior steps. Typical structure:

- *Executive summary* — three to four sentences. The headline.
- *Key findings* — bullet list, severity-tagged, each citing the prior step it came from.
- *Recommended actions* — numbered list. Each action references the finding it addresses.
- *Detailed findings* — expanded per-finding analysis. Subsections per finding type.
- *Citations* — list of source documents and the operations that consulted them.

**States.**
- *Populated* — Prior steps produced usable output. Report renders fully.
- *Empty* — Every prior step returned empty. Output reads *"Not covered by supplied documents."* + a paragraph explaining that the workflow ran but produced no findings, with a recommendation to upload different documents.
- *Partial* — Some prior steps produced output, others didn't. Report calls out which steps were empty in a footnote *("Step 3: Compare Against Standard returned no findings — the supplied document and the firm standard do not appear to be the same contract type.")* and synthesises the rest.
- *Error* — Generate Report itself failed (typically because every prior step failed). Run ends with an error state.

**Edge cases QA should know about.**
- Workflow with only one prior step — Generate Report should still produce a usable report, not refuse for "insufficient input".
- Prior step produced a very long output (a 50-page contract analysis) — Generate Report should compress to a report-length output, not echo the prior step verbatim.
- Prior step produced contradictory findings — Generate Report should surface the contradiction rather than pick a side.
- Workflow has no prior step (Generate Report is the only step) — operation surfaces *"Generate Report needs at least one prior step to synthesise."* at the run level; the run cancels.

### 4.5 Extract Key Dates

**Purpose.** Finds dates and deadlines in the supplied documents and produces a chronological list. Useful for M&A timelines, litigation calendars, deal-closing schedules.

**When it appears.** Standalone in date-extraction workflows, or as a mid-pipeline step in M&A Due Diligence Summary.

**Output formats supported.** Table (default) or Markdown timeline.

**Inputs the user supplies.** None directly. Operates on documents ingested by Read Documents.

**Reference document.** Optional. Not typically needed.

**Per-step prompt override.** Available.

**Output description.** A table with columns:

| Column | Content |
|---|---|
| Date | E.g. *2026-09-15* (normalised to ISO format) |
| Original wording | E.g. *"thirty (30) days after Closing"* |
| Document and section | E.g. *MSA_v3.pdf, §12.4* |
| Type | One of *Deadline*, *Effective date*, *Termination*, *Notice period*, *Other* |
| Notes | Optional context |

Below the table, a one-paragraph narrative summarising the timeline.

**States.**
- *Populated* — Dates identified. Table renders chronologically.
- *Empty* — No dates found. Output reads *"Not covered by supplied documents."* + a one-line explanation.
- *Partial* — Some dates identified, others ambiguous (e.g. relative dates like "promptly after notice"). Ambiguous dates appear in a separate sub-table with the Type column reading *"Relative — not resolved"*.
- *Error* — Operation failure. Output reads *"Could not extract dates: <reason>"*.

**Edge cases QA should know about.**
- Relative dates ("thirty days after Closing") — should surface in the Partial state with the relative expression preserved.
- Date ranges ("between June 1 and June 15") — both dates extracted, type tagged appropriately.
- Date in a foreign format ("15.06.2026") — normalised to ISO with a Notes field noting the original.
- Year-only references ("calendar year 2026") — extracted with the day set to Jan 1 and Notes saying *"Year-only reference"*.

### 4.6 Check Compliance

**Purpose.** Checks the supplied document against a stated compliance standard (GDPR, CCPA, HIPAA, ABA Model Rules, SOC 2). Produces a pass/fail rubric per requirement.

**When it appears.** Privacy & GDPR Audit workflow. Available for users building regulatory-review workflows.

**Output formats supported.** Table (default) or Markdown report.

**Inputs the user supplies.** None directly. Operates on documents ingested by Read Documents.

**Reference document.** Optional but encouraged. The reference would be the standard the operation should check against — a copy of the regulation, the firm's compliance checklist, etc. Without a reference, the operation uses its built-in knowledge of common standards.

**Per-step prompt override.** Available. Common use: telling the operation which specific standard to check against ("GDPR Articles 5 and 6 only").

**Output description.** A table with columns:

| Column | Content |
|---|---|
| Requirement | E.g. *"Lawful basis for processing"* |
| Standard | E.g. *"GDPR Art. 6"* |
| Document section addressing it | E.g. *"§3.2 of the supplied privacy notice"* |
| Verdict | One of *Met*, *Partially met*, *Not addressed*, *Cannot determine*. Colour-coded. |
| Notes | One-line caveat or recommendation |

Below the table, a paragraph summarising the rubric (*"7 of 12 requirements fully met, 3 partial, 2 not addressed"*).

**States.**
- *Populated* — Requirements evaluated. Table renders with at least one row per evaluated requirement.
- *Empty* — Document is not a privacy-related document. Output reads *"Not covered by supplied documents. The uploaded document does not appear to be a privacy policy, data-processing agreement, or related document."*.
- *Partial* — Some requirements evaluated, others not. The "Not addressed" rows surface explicitly with notes explaining what would need to be added.
- *Error* — Operation failure. Output reads *"Could not check compliance: <reason>"*.

**Edge cases QA should know about.**
- Document covers multiple standards (GDPR and CCPA in one privacy policy) — operation should evaluate both standards by default; the override prompt can narrow it.
- Document is a draft with placeholder text ("[firm name]") — operation should evaluate the substance and note the placeholders in the Notes column.
- Standard not in the operation's built-in knowledge — operation should surface *"Cannot determine — this standard is not in the operation's reference set"* and recommend supplying a reference document.

### 4.7 Summarise Documents

**Purpose.** Writes a one-page summary of the supplied documents. Light-touch alternative to Analyse Clauses for attorneys who want a quick overview rather than a structured analysis.

**When it appears.** Standalone in summary-oriented workflows. Sometimes used as Step 1 of a discovery-oriented workflow before deeper analysis steps run.

**Output formats supported.** Markdown report.

**Inputs the user supplies.** None directly. Operates on documents ingested by Read Documents.

**Reference document.** Not applicable.

**Per-step prompt override.** Available. Common use: shaping the summary structure (executive-style, attorney-style, client-style).

**Output description.** A markdown report with:

- *Document overview* — what the document is, when it was made, who the parties are
- *Key terms* — the most important provisions, in attorney-friendly language
- *Notable provisions* — anything unusual the reader should know about
- *Open questions* — anything the document does not clarify

Each section cites the document and section.

**States.**
- *Populated* — Summary produced.
- *Empty* — Document is unreadable or contains no substantive content. Output reads *"Not covered by supplied documents."* + a brief explanation.
- *Partial* — Document is partially readable (e.g. some pages OCR'd, others not). Summary covers what it can with a footnote on what was missed.
- *Error* — Operation failure.

**Edge cases QA should know about.**
- Multi-document summary — operation should produce one combined summary, not one per document. Cross-document themes should be highlighted.
- Very short document (single page) — summary should be proportionately shorter; not padded.
- Document with substantial appendices — summary covers the body; mentions the appendices' existence without summarising them in full.

### 4.8 Custom Operation (placeholder)

**Purpose.** Reserved for user-defined operations in Sprint 2. In v1, selecting Custom Operation in the builder surfaces an in-modal notice:

> *"Custom operations are coming in a future release. Pick a different operation for now, or contact your admin if you'd like to request a new operation type."*

The step is not valid for save until a non-Custom operation is selected.

**Why it's listed.** Reserving the slot in the v1 UI tells the firm the capability is coming and prevents confusion when it ships in Sprint 2.

---

## 5. Cross-cutting behaviour

### Operation chaining

Operations in a workflow run sequentially, top to bottom. Each operation has access to:

- The original supplied documents
- The output of every prior step (capped at ~3,500 characters per prior step in the prompt; longer outputs are summarised by the prior step before being passed forward)
- Its own reference document, if attached

A step never has access to the output of a later step. If an operation needs information that doesn't yet exist, it must be moved earlier in the pipeline.

### The anti-hallucination string

Every operation, when it cannot find the requested information in the supplied input, begins its output with the literal string *"Not covered by supplied documents."* — verbatim, byte-for-byte. QA tests check for the literal string. Operations must not paraphrase this string ("This information is not in the documents" / "The documents don't cover this" are both wrong). The literal phrase is the anchor that QA and the frontend use to detect empty-state output.

### Citation discipline

Every claim in operation output cites a source. The citation appears inline (in the prose or table cell) and as a structured entity (so the frontend can render it as a clickable citation badge). Operations that cannot identify a precise source mark it as *"[Source: <document name> — section unclear]"* rather than omitting the citation.

The frontend renders citations as small navy badges below each finding. Clicking a citation badge would, in a future version, scroll the source document to the cited location. In v1, clicking opens a tooltip with the citation text.

### Output format flexibility

Most operations support multiple output formats (Table, Markdown, Card). The default format is the one most attorneys want; the alternatives are surfaced in the *Advanced options* drawer per step. The Generate Report step's output drives the report card displayed in chat; other steps' outputs feed into Generate Report rather than being displayed on their own.

### Reference documents

Two operations support reference documents in v1: *Compare Against Standard* (required) and *Check Compliance* (optional). The reference document picker in the *Advanced options* drawer opens the same YourVault doc-picker the chat uses. Knowledge Pack documents cannot be selected as reference documents in v1.

### Prompt overrides

Every operation's standard prompt has been tuned by the YourAI team. Prompt overrides exist for senior attorneys who want to customise behaviour for one specific workflow. Overrides are stored on the step; changing an operation type clears the override.

The prompt override field shows the operation's standard prompt as placeholder text, so the user knows what they're overriding. The override only applies to this step in this workflow; the operation's standard prompt is unchanged for other workflows.

---

## 6. Special-case operations and modes

### 6.1 Read Documents is special

Read Documents is the only operation that does not produce user-facing output. Its success is invisible to the user — they only see Step 2's findings. A failure, however, is highly visible: the run cancels with an error message.

This asymmetry is intentional. Ingestion is plumbing; surfacing "Read 3 documents" to the user every time adds noise.

### 6.2 Generate Report is special

Generate Report is the only operation that produces the report card the attorney sees in chat. Other operations' outputs are intermediate — they exist so Generate Report can synthesise them. An attorney never sees the raw output of Analyse Clauses or Extract Key Dates; they see those findings folded into the Generate Report output.

A workflow without Generate Report as its final step produces no report card. Instead, the final step's output is rendered as the report. The builder allows this but discourages it (*"Adding Generate Report as the last step produces a more polished output."* hint).

### 6.3 Single-step workflows

A workflow can have one step. The most common single-step workflow is *Summarise Documents* — useful when an attorney wants a quick overview without a multi-step pipeline. Single-step workflows skip the synthesis Generate Report would do; the step's output is rendered directly as the report.

### 6.4 No-input operations

Three operations require no upstream context to produce useful output: *Summarise Documents*, *Extract Key Dates*, and *Check Compliance*. These can be the first (and only) step in a workflow that operates on the attorney's documents directly without prior analysis.

---

## 7. Accessibility and interaction notes

### Keyboard navigation

- The operation type dropdown opens with Enter or Down arrow. Up and Down move through options. Enter selects.
- The Advanced options link expands and collapses with Enter or Space.
- Reference document picker is reachable via Tab from inside the expanded drawer.

### Screen-reader announcements

- The operation dropdown announces the current operation when focused (*"Operation: Read Documents, button, dropdown"*).
- Switching operations announces the change.
- The Advanced options state announces *"Advanced options, expanded"* or *"collapsed"*.

### Click targets

- The operation dropdown, advanced-options link, drag handle, and trash icon are all at least 44 by 44 pixels.

### Visual conventions

- Each operation has a small icon shown next to its name. The icon is consistent across the builder card, the Pre-Run modal, and the chat progress card so the attorney recognises the operation at a glance.
- The four pre-loaded workflows' step icons (see the picker cards) come from this operation icon set.

---

## 8. QA test scenarios

Scenarios are numbered sequentially.

### 8.1 Read Documents

**Scenario 1** — Read Documents succeeds with one PDF.
- Action: Run a Read Documents step against a single 10-page PDF.
- Expected: Operation succeeds. Step 2 has access to the document's text.

**Scenario 2** — Read Documents fails with a password-protected PDF.
- Action: Supply a password-protected PDF.
- Expected: Operation marks the file as failed and continues with the rest. If it was the only file, the run cancels.

**Scenario 3** — Read Documents handles mixed file types.
- Action: Supply one PDF, one DOCX, one TXT.
- Expected: All three ingest successfully. Step 2 sees all three documents.

**Scenario 4** — Read Documents on a corrupt PDF returns Partial.
- Action: Supply two PDFs; one corrupt.
- Expected: Operation surfaces *"1 document could not be read"* and proceeds with the readable one.

**Scenario 5** — Read Documents on zero documents fails the run.
- Action: Skip the upload area and click Run.
- Expected: Pre-Run modal blocks. *"At least one document is required to start this workflow."*

### 8.2 Analyse Clauses

**Scenario 6** — Analyse Clauses on a contract returns a populated table.
- Action: Run a workflow with Read Documents → Analyse Clauses against an NDA.
- Expected: Table renders with at least four clauses. Each has a citation. Severity column is populated.

**Scenario 7** — Analyse Clauses on a non-contract returns Empty.
- Action: Run the same against a letter or a case opinion.
- Expected: Output begins *"Not covered by supplied documents."* Table shows *"No clauses identified"*.

**Scenario 8** — Analyse Clauses cites the document and section per finding.
- Expected: Every row's "Document and section" column has the format *"<filename>, §<n>"* or *"<filename>, p. <n>"* if section is not identifiable.

**Scenario 9** — Severity labels are colour-coded.
- Expected: *Standard* (grey), *Non-standard* (gold), *Aggressive* (red), *Unusual* (navy). Colours meet 4.5:1 contrast against the table background.

**Scenario 10** — Analyse Clauses on a 100+ clause contract groups standard clauses.
- Expected: Standard clauses are grouped or truncated with a *"N additional standard clauses identified"* trailer.

### 8.3 Compare Against Standard

**Scenario 11** — Compare Against Standard requires a reference document.
- Action: Add a Compare Against Standard step in the builder. Save without setting a reference.
- Expected: Save is disabled. Inline error: *"Compare Against Standard needs a reference document."*

**Scenario 12** — Compare produces four sections.
- Action: Run a workflow with Compare against an NDA vs the firm's standard NDA template.
- Expected: Report has *Material differences*, *Additions*, *Omissions*, *Boilerplate matches* sections. Sections with no content are omitted (not rendered as empty).

**Scenario 13** — Compare on mismatched types warns at the top.
- Action: Compare an MSA against an NDA template.
- Expected: Warning at the top of the output: *"The uploaded document and the reference appear to be different contract types. Comparison may be incomplete."*

**Scenario 14** — Compare cites both documents per finding.
- Expected: Every finding has two citations — one for the attorney's document, one for the reference.

### 8.4 Generate Report

**Scenario 15** — Generate Report synthesises prior steps.
- Action: Run a 4-step workflow with Generate Report last.
- Expected: Report includes findings from each prior step. Executive summary references the headline findings. Citations preserved.

**Scenario 16** — Generate Report on an empty pipeline returns an error.
- Preconditions: Generate Report is the only step.
- Action: Run.
- Expected: Output reads *"Generate Report needs at least one prior step to synthesise."* Run cancels.

**Scenario 17** — Generate Report compresses a long prior step.
- Preconditions: Prior step produced 8,000 words.
- Action: Run.
- Expected: Generate Report does not echo the prior step verbatim; it compresses to a one-page summary.

**Scenario 18** — Generate Report flags an empty prior step.
- Preconditions: Step 3 returned empty; Steps 1, 2, 4 produced output.
- Expected: Report includes a footnote noting Step 3 was empty.

### 8.5 Extract Key Dates

**Scenario 19** — Extract Key Dates on an M&A agreement returns a populated table.
- Action: Run against a 30-page MSA.
- Expected: Table includes effective date, term, notice deadlines, payment dates. All in ISO format.

**Scenario 20** — Relative dates land in Partial.
- Expected: *"Thirty days after Closing"* appears with Type *"Relative — not resolved"* in a separate section.

**Scenario 21** — Foreign-format date is normalised.
- Action: Supply a document with *"15.06.2026"*.
- Expected: Table shows *"2026-06-15"* with Notes *"Original: 15.06.2026"*.

### 8.6 Check Compliance

**Scenario 22** — Check Compliance against GDPR returns a rubric.
- Action: Run against a privacy policy.
- Expected: Table with at least 8 GDPR requirements. Each has a Verdict.

**Scenario 23** — Check Compliance on a non-privacy document returns Empty.
- Action: Run against an NDA.
- Expected: Output reads *"Not covered by supplied documents. The uploaded document does not appear to be a privacy policy, data-processing agreement, or related document."*

**Scenario 24** — Verdict colours render correctly.
- Expected: *Met* (green), *Partially met* (gold), *Not addressed* (red), *Cannot determine* (grey).

### 8.7 Summarise Documents

**Scenario 25** — Summarise on a single document.
- Expected: One-page summary with the four standard sections.

**Scenario 26** — Summarise on multiple documents.
- Expected: One combined summary with cross-document themes. Not one summary per document.

**Scenario 27** — Summarise on a very short document.
- Action: Run against a 1-page memo.
- Expected: Summary is proportionately short, not padded.

### 8.8 Custom Operation (placeholder)

**Scenario 28** — Selecting Custom Operation surfaces the v1 notice.
- Action: In the builder, set a step's operation to *Custom Operation*.
- Expected: In-card notice: *"Custom operations are coming in a future release. Pick a different operation for now, or contact your admin if you'd like to request a new operation type."* Save is disabled until a different operation is selected.

### 8.9 Cross-operation behaviour

**Scenario 29** — Operations cite their sources.
- Expected: Every finding in every operation has at least one citation. Operations that cannot identify a precise source use *"[Source: <document name> — section unclear]"* rather than omitting.

**Scenario 30** — The literal anti-hallucination string is exact.
- Action: For each operation, trigger the Empty state.
- Expected: Output begins with the literal phrase *"Not covered by supplied documents."* Paraphrases (*"The documents don't cover this"*, *"Not in the supplied material"*) are bugs.

**Scenario 31** — Changing operation type clears the prompt override.
- Action: Set a step's operation to Analyse Clauses, then change it to Compare Against Standard.
- Expected: The override field clears and re-loads with Compare Against Standard's standard prompt.

**Scenario 32** — Reference document attached to one step does not leak to another.
- Action: Attach reference to Step 3 only.
- Expected: Step 2 cannot access the reference; only Step 3 uses it.

**Scenario 33** — Prior-step output is available to later steps.
- Action: Run a 3-step workflow. Inspect Step 3's behaviour.
- Expected: Step 3 references Step 2's findings explicitly. Citations include *"From Step 2: <step name>"*.

**Scenario 34** — Prior-step output cap respects ~3,500 characters.
- Action: Run a workflow where Step 2 produces a 10,000-character output.
- Expected: Step 3 sees a summarised version. Step 3's behaviour is not derailed by the length.

### 8.10 Edge cases

**Scenario 35** — Operation runs against a document in a foreign language.
- Action: Supply a contract in Spanish.
- Expected: Operation either translates and proceeds, or returns *"Not covered by supplied documents."* with the explanation *"The supplied document is in a language not supported in v1."* Either is acceptable in v1; behaviour should be consistent.

**Scenario 36** — Operation runs against an image-scanned PDF without OCR.
- Action: Supply a scanned PDF with no embedded text.
- Expected: Read Documents reports a Partial; downstream operations see empty text and surface the Empty state.

**Scenario 37** — Two operations of the same type in one workflow.
- Action: Build a workflow with two Analyse Clauses steps in a row.
- Expected: Both steps run. The second sees the first's output as prior-step context but produces its own analysis. Builder allows this but offers a hint *"Two Analyse Clauses steps in a row may produce redundant output."*

**Scenario 38** — Operation type marked Custom Operation in a saved workflow.
- Action: A v1 workflow has a Custom Operation step (data corruption or future migration).
- Expected: The workflow is flagged as invalid in the picker (greyed out, cannot run). Tooltip explains.

### 8.11 Accessibility

**Scenario 39** — Operation icons announce their meaning.
- Expected: Screen reader on a workflow card announces step icons by operation name, not by icon shape.

**Scenario 40** — Advanced options drawer is keyboard-reachable.
- Expected: Tab reaches the *Advanced options* link; Enter expands; Tab continues into the drawer's fields.

**Scenario 41** — Severity and verdict colours have a textual fallback.
- Expected: Colour-coded labels (Severity, Verdict) also have text. Colour is not the only cue.

---

## 9. Open questions and known gaps

- **Q1** — Custom Operation authoring is a placeholder in v1. The full surface (where a senior attorney defines a new operation with name, prompt, output format) is on the Sprint 2 backlog. Owner: PM.
- **Q2** — Knowledge Pack documents cannot be selected as reference documents in v1. The picker only shows YourVault documents. Should KP documents be selectable? Owner: PM.
- **Q3** — Prior-step output cap (~3,500 characters) is fixed in v1. For workflows that produce long intermediate outputs (a 50-page contract analysis feeding into Generate Report), this can lose detail. Adjustable per-workflow cap? Owner: PM + Eng.
- **Q4** — The eight standard operations cover the most common attorney tasks. We have not yet validated whether smaller firms doing T&E, family law, or criminal work see this list as sufficient. Owner: PM. Customer-research item.
- **Q5** — Operations do not currently know which Knowledge Pack is active in the chat the workflow was launched from. Should they? An attorney running Contract Risk Review with the *Hartwell NDA Playbook* pack active might expect the pack content to inform the analysis. Owner: PM.
- **Q6** — Prompt overrides are not version-controlled in v1. An attorney can clobber another attorney's override on a shared workflow. Owner: PM + Eng.
- **Q7** — The anti-hallucination literal string is in English. For non-English-language firms, this needs localisation. Owner: PM. Internationalisation item.

---

## 10. Document control

- **Version:** 1.0
- **Date:** 2026-05-28
- **Author:** Arjun Sharma, Product
- **Reviewers:** Pending sign-off — PM lead, QA lead, client stakeholder
- **Related FRDs:** `FRD_Workflows.docx` (picker + builder), `FRD_Workflow_Execution.docx` (run + report), `FRD_Knowledge_Pack.docx`, `FRD_YourVault.docx`.

### Revision history

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0 | 2026-05-28 | Arjun Sharma | Initial draft. Covers all eight operations in detail (Read Documents, Analyse Clauses, Compare Against Standard, Generate Report, Extract Key Dates, Check Compliance, Summarise Documents, Custom Operation), cross-cutting behaviour, and 41 QA scenarios. |
