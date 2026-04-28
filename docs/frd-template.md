# FRD Template — YourAI Functional Requirements Documents

> Template for authoring Functional Requirements Documents (FRDs) for any
> module in this project. Mirrors the structure of the existing FRDs that
> already live in `docs/extracted/` (`FRD_Tenant_Management.docx`,
> `FRD_User_Management.docx`, `FRD_Workflows.docx`,
> `FRD_Workflow_Operations.docx`, `FRD_Incorrect_Document_Handling.docx`,
> `FRD_Intent_System.docx`).
>
> **How to use this template:**
> Tell Claude *"Create an FRD for `<module>` using `docs/frd-template.md`"*.
> Optionally specify the output format (`.md` for review / iteration,
> `.docx` for PM / QA / strategist distribution). Default is `.md` first,
> then convert to `.docx` once content is signed off.

---

## What an FRD is in this project

A **functional** requirements document — written for **product managers,
QA engineers, and strategists**. It describes what the module *does* from
a user-experience standpoint. It is **not** a technical design document.

**An FRD must NOT contain:**
- Code, file paths, or line numbers
- React component names, state-variable names, or hook references
- API contracts, schema fields, or database column names
- Library names, framework references, or build-system details
- Implementation history, refactor narratives, or commit hashes

**An FRD MUST contain:**
- Plain-English descriptions of user-visible behaviour
- Numbered, reproducible QA test scenarios
- States the module can be in and the transitions between them
- Edge cases the QA team can anticipate
- Open questions the team has not yet resolved

If a sentence couldn't be tested by a QA engineer reading the doc cold,
it doesn't belong in the FRD.

---

## Audience and tone

- Read aloud, the doc should sound like a product spec a non-engineer
  could digest.
- Use intent / behaviour names, not implementation names — *"Document
  Summarisation"* not `document_summarisation`; *"the user's vault"* not
  `documentVault`.
- Call screens, regions, and controls by what the user sees on them.
- Active voice. Short sentences. Tables where comparison helps.

---

## Output format

- **Markdown first.** Author the FRD in `docs/extracted/<ModuleName>.md`.
  Markdown is reviewable, diff-able, and version-controlled.
- **Convert to .docx** once content stabilises. Final file lives at
  `docs/extracted/FRD_<ModuleName>.docx`. Use the docx skill to convert
  with proper heading hierarchy + table of contents.
- Both versions stay in the repo so PMs can read either.

---

## Required sections (in order)

Every FRD has **10 top-level sections**. Some can be short or marked
"N/A" for a given module, but the headings should always appear in the
same order for cross-FRD consistency.

### 1. Document overview

- **Purpose** — one paragraph. *"This document specifies the functional
  behaviour of the `<module>` module in YourAI…"*
- **Audience** — Product managers, QA engineers, strategists.
- **Scope** — bullet list of what's covered and what's explicitly out of
  scope. Be honest about exclusions.
- **Glossary** — every domain term used in the doc that a non-attorney
  product manager might not know. Even ones that feel obvious. Examples
  for the chat-side modules: *intent*, *card*, *source pill*, *empty
  state*, *workflow operation*, *workspace*, *vault*, *knowledge pack*.
- **Document control summary** — version, date, author. Detailed revision
  history goes in Section 10.

### 2. Background and context

- **What the module is** — one to three paragraphs. The mental model.
- **Why it exists** — what user problem does it solve? Cite client /
  attorney friction points where they're documented (e.g. for the
  vault-search FRD, cite Wendy's *"What is the biggest at-close
  download I have?"* query).
- **Where it sits in the broader system** — name the adjacent modules
  and the entry / exit points. Diagrams are optional but encouraged
  (link to a Figma frame if one exists).
- **Recent state** — one or two sentences if anything material has
  shifted lately (a redesign, a deprecation, a feature flag flip). Don't
  narrate the change — just orient the reader.

### 3. Module-level functional specification

The biggest section. Break into subsections by **user-facing surface**,
not by code module. Examples:

For a chat-side module:
- 3.1 Selector / dropdown
- 3.2 Auto-switch behaviour
- 3.3 Result rendering
- 3.4 Empty state
- 3.5 Error state

For a panel-style module:
- 3.1 Entry points (where the user enters the panel)
- 3.2 Layout (left rail, header, body, footer)
- 3.3 Toolbar actions
- 3.4 Row / item interactions
- 3.5 Empty state
- 3.6 Loading state

For each subsection, cover:
- What the user sees (describe in functional terms — content, controls,
  visual hierarchy)
- What inputs / data drive it
- What the user can do (clicks, types, drags, hovers)
- States the surface can be in (populated / empty / partial / loading /
  error / disabled)
- State transitions — when does X become Y?

### 4. Per-entity / per-variant specification

Use this section when the module has **N distinct things** that share a
chrome but vary in body — e.g. 8 intent cards, 7 workflow operations, 6
home-tile types, 9 incorrect-document categories. Each entity gets its
own subsection (Section 4.1, 4.2, …).

Per-entity subsection template:

```
### 4.<n> <EntityName>

**Purpose** — one paragraph. What attorney / user task does this entity
serve? What does it explicitly NOT do?

**When it appears** — trigger conditions in plain language. Keyword
phrases that auto-activate it. The intent name as a user sees it (in
the dropdown or pill).

**User-visible accent / colour / icon** — only call out if it's used
for distinction.

**Source attribution** — what label and entity does the source pill
show?

**Body content** — describe the fields and structure functionally.
Tables, bullet lists, narrative — say which.

**States covered:**
- *Populated* — what the surface looks like with real data
- *Empty* — when does the empty branch fire? what copy renders? what
  sibling action is suggested?
- *Partial* — does this entity have a partial-failure mode?
- *Error* — does the entity surface backend errors itself, or does
  the parent surface them?

**User actions** — buttons, links, expand/collapse toggles, copy
actions, etc.

**Edge cases the QA team should know about** — bullet list. Multi-doc
inputs, vague inputs, off-topic prompts, ambiguous triggers, screen
sizes.
```

### 5. Cross-entity / cross-cutting behaviour

Patterns that apply across the entities in Section 4:
- Shared empty-state pattern (link to it if documented elsewhere)
- Shared error-handling pattern
- Shared accessibility behaviour
- Citation / source-attribution conventions
- Decision logic — when does the system choose entity A vs entity B?

### 6. Special-case entities or modes

Pull entities that materially differ from their peers into their own
section so the reader doesn't miss them. Example: in the Intent Cards
FRD, the Find Document card is special because it's client-only and
bypasses the LLM entirely — that warrants its own callout section.

### 7. Accessibility and interaction notes

- Keyboard navigation — what tabs to where, what activates with Enter /
  Space, what dismisses with Escape
- Screen-reader behaviour — what's announced, what's hidden
- Click-target sizes — minimum 44 × 44 px (WCAG)
- Focus indicators — visible focus rings on all interactive elements
- Colour contrast — note any colour pair below 4.5:1 (text) or 3:1
  (icons) and explain the mitigation
- Responsive behaviour — what happens on mobile / tablet / narrow
  desktop breakpoints

Functional only. *"On mobile, the toolbar collapses into a kebab
menu"* — yes. *"`useMediaQuery('(max-width: 768px)')`"* — no.

### 8. QA test scenarios

The deliverable section for the QA team. Numbered scenarios, grouped
by the surface or entity from Sections 3–6. Aim for **at least 30
scenarios** for a module of average size, **75+** for a module the
size of Workflows.

Scenario format:

```
**Scenario <ID>** — <one-line summary>
- *Surface / entity:* <which Section 3 or 4.x area is under test>
- *Preconditions:* <what's already in state — vault has X docs, user
  is logged in as Y role, an intent is set to Z, etc.>
- *Action:* <one or two sentences. What does the tester do?>
- *Expected result:* <one or two sentences. What does the tester see /
  not see / be able to do next?>
```

Group scenarios into subsections (8.1, 8.2, …) by surface so QA can
pick a scope. Cover at minimum:

- **Happy path** for each entity — the most common user flow
- **Empty state** for each entity — no input, no data, no match
- **Error / degraded** — backend down, partial data, malformed input
- **Edge cases** — multi-input, off-scope input, very long input, very
  short input, special characters, rapid repeated actions
- **Cross-entity transitions** — switching from entity A to entity B
  mid-task
- **Permission / role gating** — what does each user role see?
- **Responsive / accessibility** — keyboard-only flow, screen-reader
  announcements, mobile layout

Number scenarios sequentially across the whole document (Scenario 1,
Scenario 2, …) — easier to reference in bug reports than `4.2.3`.

### 9. Open questions and known gaps

Be honest. List anything that:
- Hasn't been decided yet (and who needs to decide it)
- Is implemented inconsistently across the module (and is on the
  roadmap to fix)
- Is known-broken but not yet QA'd (link to the bug)
- Was originally in scope but cut for time

Each item: one line, with an owner if known.

```
- Q1: Should partial-failure cards show a retry button or a static
  "incomplete" badge? — Owner: Ryan H. Decision needed by 2026-05-15.
- Q2: Mobile layout for clause-analysis is not yet specified —
  current behaviour is "shrink the desktop layout, hope for the best".
  — Owner: Aashna. Backlog.
```

### 10. Document control

- **Version:** 1.0 / 1.1 / etc.
- **Date:** YYYY-MM-DD
- **Author:** name(s) and role(s)
- **Reviewers:** PM lead, QA lead, eng lead — list and date of sign-off
- **Revision history:** table of versions with date / author / summary
  of change. Append to it; never rewrite.
- **Related FRDs:** cross-references to sibling FRDs in
  `docs/extracted/`.

---

## Style conventions

### Voice and tense
- Present tense, active voice. *"The user clicks Use; the document
  attaches to the chat."* Not *"The document will be attached when the
  user clicks Use."*
- Address the user as "the user" in narrative passages and "the tester"
  in QA scenarios. Reserve "you" for direct UI copy quotes.

### Naming
- Use **product-facing names** consistently. The intent dropdown shows
  *"Document Summarisation"* — that's how the FRD names it. Internal
  intent IDs (`document_summarisation`) never appear.
- Capitalise the first letter of feature names (Find Document, Risk
  Memo, Workflow Builder).
- Use straight quotes (`"`) in markdown source; the docx conversion
  handles smart-quote substitution.

### Tables
- Use tables when the same fact applies across multiple entities —
  accent colour per card, source-pill label per intent, severity
  colour per finding, role permissions across surfaces.
- Don't use tables for prose that would read fine as a paragraph.
- Every table needs a header row.

### Lists
- Bullet for unordered (states, edge cases, glossary entries).
- Numbered for ordered (steps in a flow, scenarios, ranked priorities).
- Avoid nesting more than two levels deep.

### Cross-references
- Link to other FRDs by file: *"see `FRD_Workflows.docx` §3.2"*.
- Link to project context files: *"see
  `.claude-context/card-empty-state-pattern.md`"*.
- Don't link to source code.

### Diagrams
- Optional but encouraged. ASCII flowcharts in the markdown work fine
  for state transitions. Figma frames work for layout. Reference the
  Figma URL inline — don't embed (.docx export will break).

### Length
- Per-entity subsections in Section 4: 0.5–1.5 pages each.
- QA scenarios: aim for 30 minimum, 75 for large modules.
- Whole document: 15–60 pages of `.docx` output is normal.
- Don't pad. If a section is empty, write `*N/A — <reason>.*` and move
  on.

---

## Skeleton (copy / paste to start a new FRD)

```markdown
# FRD — <Module Name>

**Version:** 1.0
**Date:** YYYY-MM-DD
**Author:** <Name>, Product
**Status:** Draft / Reviewed / Final
**Related:** `FRD_<sibling>.docx`, `.claude-context/<pattern>.md`

---

## 1. Document overview

### 1.1 Purpose
<One paragraph.>

### 1.2 Audience
Product managers, QA engineers, strategists.

### 1.3 Scope
**In scope:**
- <bullet>
- <bullet>

**Out of scope:**
- <bullet>
- <bullet>

### 1.4 Glossary
- **<Term>** — <definition>
- **<Term>** — <definition>

### 1.5 Document control summary
| Field | Value |
|---|---|
| Version | 1.0 |
| Date | YYYY-MM-DD |
| Author | <Name>, Product |
| Reviewers | <Name>, <Name> |

---

## 2. Background and context

### 2.1 What the module is
<One to three paragraphs.>

### 2.2 Why it exists
<User problem. Cite friction points / client feedback.>

### 2.3 Where it sits
<Adjacent modules, entry / exit points.>

### 2.4 Recent state
<Optional. One or two sentences on recent material changes.>

---

## 3. Module-level functional specification

### 3.1 <Surface 1>
…

### 3.2 <Surface 2>
…

---

## 4. Per-entity specification

### 4.1 <Entity 1>
**Purpose** — …
**When it appears** — …
**Body content** — …
**States covered:** populated / empty / partial / error
**User actions** — …
**Edge cases** — …

### 4.2 <Entity 2>
…

---

## 5. Cross-entity behaviour

### 5.1 <Pattern 1>
…

### 5.2 <Pattern 2>
…

---

## 6. Special-case entities

### 6.1 <Entity that needs its own callout>
…

---

## 7. Accessibility and interaction notes

### 7.1 Keyboard navigation
…

### 7.2 Screen-reader behaviour
…

### 7.3 Responsive behaviour
…

---

## 8. QA test scenarios

### 8.1 <Surface 1> scenarios

**Scenario 1** — <one-line summary>
- *Surface / entity:* <ref>
- *Preconditions:* <state>
- *Action:* <test step>
- *Expected result:* <pass criterion>

**Scenario 2** — …

### 8.2 <Surface 2> scenarios

**Scenario N** — …

---

## 9. Open questions and known gaps

- **Q1:** <question> — Owner: <name>. <Decision deadline if any.>
- **Q2:** …

---

## 10. Document control

### 10.1 Version
1.0

### 10.2 Date
YYYY-MM-DD

### 10.3 Authors
- <Name>, Product

### 10.4 Reviewers
- <Name>, PM lead — signed off YYYY-MM-DD
- <Name>, QA lead — signed off YYYY-MM-DD

### 10.5 Revision history

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0 | YYYY-MM-DD | <Name> | Initial draft |

### 10.6 Related FRDs
- `FRD_<sibling>.docx`
- `.claude-context/<pattern>.md`
```

---

## Existing FRDs in this project (use as references)

Located in `docs/extracted/`:

- `FRD_Tenant_Management.docx` — Arjun's reference. The canonical
  example of "right depth" for a sizable module.
- `FRD_User_Management.docx` — User Management across all portals.
- `FRD_Intent_System.docx` — chat intents end-to-end (selector,
  auto-switch, suggestion banners, cross-intent redirect, card vs
  prose formats, SA bot-persona editor).
- `FRD_Workflows.docx` — Workflows module surfaces end-to-end with
  75 QA scenarios. Use as the depth target for any module of similar
  size.
- `FRD_Workflow_Operations.docx` — the 7 operations with per-operation
  behaviour, vague-doc handling, and test matrices.
- `FRD_Incorrect_Document_Handling.docx` — 9-category taxonomy + the
  three-stage handling protocol + 9 worked end-to-end scenarios + 30
  QA tests.

When in doubt about depth, format, or tone, open the closest sibling
FRD and match its level.

---

## Workflow for creating a new FRD

1. Decide the module name. Confirm it doesn't overlap with an existing
   FRD (check `docs/extracted/`).
2. Copy the skeleton above into `docs/extracted/<ModuleName>.md`.
3. Fill in Sections 1, 2 first — they orient everything else.
4. Inventory the user-visible surfaces of the module (Section 3
   subsections) before writing any spec text.
5. Inventory the entities / variants of the module (Section 4
   subsections) — list them all before writing any spec text.
6. Write Sections 3 and 4 in parallel. Reference each other freely.
7. Section 5 (cross-cutting behaviour) is easier to write last because
   it's pattern-extraction across Sections 3 and 4.
8. Section 8 (QA scenarios) is easier to write after Sections 3 and 4
   are stable — scenarios reference specific behaviours.
9. Section 9 (open questions) gets added to throughout — never leave
   it empty just because you're rushing.
10. Convert to `.docx` once the markdown is reviewed (use the docx
    skill).
11. Commit both `<ModuleName>.md` and `FRD_<ModuleName>.docx` to
    `docs/extracted/`. Update the index in `CLAUDE.md` under the
    "Functional FRDs" section.

---

## Anti-patterns (don't do these)

- **Writing the FRD from the code.** Open the running app or the
  product mockups instead. Code-based FRDs end up technical-leaning
  and the QA team can't use them.
- **Skipping the empty / error / partial states.** Those are where
  most QA bugs hide.
- **Vague QA scenarios.** *"Test that comparison cards work."* is
  not a scenario. *"With both `meridian_msa.pdf` and `acme_msa.pdf`
  attached, type 'compare these two on indemnification'. Expected:
  ComparisonCard renders with at least one row whose clause label
  matches 'indemnification' and whose Doc 1 column is non-empty."*
  is a scenario.
- **Inventing acceptance criteria during writing.** If the doc raises
  a question, put it in Section 9 with an owner. Don't invent the
  answer in prose and pass it off as spec.
- **Updating an FRD silently.** Bump the version and append to the
  revision history every time content changes.
- **Letting markdown and `.docx` drift.** When updating, regenerate
  the `.docx` from the updated `.md`. Don't edit the `.docx`
  directly.

---

**Last updated:** 2026-04-28 — initial template, derived from the
six existing FRDs in `docs/extracted/` and the cross-FRD style
conventions Arjun has reinforced across reviews.
