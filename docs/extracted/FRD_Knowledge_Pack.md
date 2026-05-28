# FRD — Knowledge Pack

**Version:** 1.0
**Date:** 2026-05-28
**Author:** Arjun Sharma, Product
**Status:** Draft

---

## 1. Document overview

### Purpose

This document specifies the functional behaviour of the **Knowledge Pack** module in YourAI. A Knowledge Pack is a curated collection of documents and reference links — policies, playbooks, statutes, precedents — that an attorney can attach to any chat so that every answer the assistant produces is grounded in the firm's own approved source material.

This document describes what the module does from a user-experience point of view. It is not a technical design document.

### Audience

Product managers, QA engineers, and client stakeholders evaluating the module against attorney workflows.

### Scope

In scope:

- The Knowledge Pack library page (browse, search, filter)
- Creating, editing, and deleting a pack
- Attaching a pack to a chat conversation
- Source attribution in chat when a pack-grounded answer is returned
- Personal vs firm-wide visibility, and the promotion flow between them
- The four pre-loaded reference packs shipped with the product

Out of scope:

- The technical implementation of how pack content is sent to the assistant
- Workflow grounding (covered in `FRD_Workflows.docx`)
- YourVault document management (covered in `FRD_YourVault.docx`)
- Global Knowledge Base administration (covered separately under Super Admin)

### Glossary

- **Knowledge Pack** — A named, curated collection of documents and reference links a firm maintains for the AI to reference.
- **Pack scope** — Whether a pack is personal (visible only to the owner) or firm-wide (visible to every attorney in the org).
- **Active pack** — The pack currently attached to the user's chat session.
- **Pack picker** — The modal opened from the chat input that lets the user choose, switch, or detach a pack.
- **Source pill** — The small attribution badge under an AI answer that names where the answer came from.
- **Grounding** — Using a pack's content as authoritative reference material when generating an answer.
- **Org** — The firm or organisation the attorney belongs to.

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

A Knowledge Pack is the firm's way of telling the AI: *"When you answer questions in this conversation, prefer this content."* A pack is a named container — *Standard NDA Playbook*, *M&A Due Diligence Pack*, *California Employment Law*, *Privacy & Data Protection* — that holds a handful of documents and a few reference links. The attorney activates one pack at a time from inside any chat. From that point on, every answer the AI produces in that chat is grounded in the pack's content, and a source pill on each answer reads *"Answered from Pack: <pack name>"* so the attorney can audit where the response came from.

Packs are independent of the active intent. An attorney can pair any pack with any intent — the Standard NDA Playbook with Risk Assessment, the California Employment Law pack with Contract Review, the Privacy pack with general chat — and the AI uses the pack's content alongside whatever the intent is doing.

### Why it exists

Attorneys repeatedly told us during client interviews that the same questions come back over and over — *"What's our firm's position on indemnification caps?"*, *"What does Section 16600 say about non-competes again?"*, *"Which precedent did we use the last time a buy-side client asked about earn-out triggers?"* — and that today they answer them by digging through file shares, prior emails, or asking a senior partner. The firm already has these answers written down somewhere. A Knowledge Pack lets a single attorney curate that material once and make it instantly available to every member of the firm.

The pre-loaded packs cover the four areas where firms most often want a single source of truth: NDAs, M&A diligence, California employment law, and privacy / cross-border data transfer.

### Where it sits in the broader system

Knowledge Packs live in the Knowledge section of the chat sidebar, alongside YourVault and Workflows. The library page is the entry point for browsing and managing packs. The pack picker, which the attorney reaches from any chat input, is the entry point for activating a pack in a conversation. Once a pack is active, it influences AI responses in the chat surface — but the pack itself is never visible in the conversation; only the source pill on each answer reveals which pack was consulted.

### Recent state

The module shipped in two waves. The library page and modal layout were redesigned in late April based on Aashna's full-page mockups (cards flipped from horizontal to vertical, full-page chrome aligned with YourVault). In early May the document-extraction pipeline was rewired so that pack documents now carry real extracted text — earlier packs were metadata-only and the AI couldn't actually read what was in them. The current state is the first version that reliably grounds answers in pack content.

---

## 3. Module-level functional specification

### 3.1 Pack library — entry surface

![[screenshot:01-pack-library.png|The Knowledge Pack library — every pack available to the user in a single grid, with scope tabs, search, and a New pack button.]]

When the user opens *Knowledge packs* from the chat sidebar, they land on the pack library page. The page replaces the chat area but keeps the chat sidebar visible on the left.

**Header bar.** Across the top of the page is a thin bar with a back-to-chat button on the far left and the page title (*"Knowledge Packs"*) immediately after it. The page title uses serif typography to reinforce that this is a top-level surface, not a panel.

**Hero.** Below the header bar is a hero section with:

- A small pill labelled *"Knowledge Packs"* with a database icon
- A headline — *"Reference packs, ready in one click"*
- A subtitle — *"Curated collections of policies, playbooks, and precedents — maintained by your team. Attach to any chat in one click to ground every answer in the right source material."*

**Toolbar.** Sitting between the header and the hero is a toolbar with four controls:

1. *Search packs…* input — filters the grid by pack name and description as the user types.
2. *Owner* filter — a dropdown labelled *"Owner: All"* by default. Lets the user filter to packs owned by a specific person.
3. *Scope tabs* — *All*, *Org-wide*, *Mine*, each showing a count (e.g. *All 4*, *Org-wide 2*, *Mine 2*).
4. *New pack* button — primary navy button that opens the create-pack modal.

**Pack grid.** Below the hero, the available packs render as vertical cards in a responsive grid. Each card shows:

- Pack name in serif type
- Scope badge — *"Org-wide"* in gold, or *"Mine"* in navy
- A one- or two-line description
- An icon row showing how many documents and how many links the pack contains
- Owner avatar and name on the bottom-left

The grid reflows to fewer columns at narrower viewport widths. There is no per-row pagination — every pack the user has access to is rendered, with the page scrolling vertically when there are many.

**Empty state.** When the user has no packs visible (a brand-new account with no firm-wide packs and no personal packs yet), the grid is replaced by a centred message and a single *Create your first pack* button.

### 3.2 Pack detail — right rail

![[screenshot:02-pack-detail-rail.png|Clicking a pack opens its detail on the right side of the page — the library remains visible on the left so the user can switch between packs without losing context.]]

When the user clicks any pack card, the pack opens in a right-side rail. The library grid stays visible on the left at reduced width. The user can click a different card to switch the detail rail to the next pack, or close the rail to return to the full-width grid.

The detail rail shows:

- Pack name and a scope badge in the header
- The pack description in full
- A documents list with file names, sizes, and processing status
- A links list with each link's title and URL
- An *Owned by* line at the bottom
- An *Edit pack* button — primary action
- A *Delete pack* kebab option in the header

### 3.3 Create / edit pack modal

![[screenshot:03-pack-create-modal.png|Creating a new pack — name, description, scope, then add documents and reference links. The same modal handles editing an existing pack.]]

The create-pack modal and the edit-pack modal are the same surface; the modal title and the primary button label change depending on which mode the modal is in. The user opens *Create* from the *New pack* button or the empty-state CTA, and *Edit* from a pack-detail rail.

**Fields, top to bottom.**

1. **Pack name** — required. Single-line text input. Used as the card title and the source-pill label.
2. **Description** — optional. Two-line text area. Used as the card subtitle.
3. **Scope** — required. Toggle: *Personal (only I see it)* or *Org-wide (everyone in the firm sees it)*. Defaults to *Personal* for a new pack.
4. **Documents** — list with an *Add documents* button. Each row shows the file name, size, and a processing status (*Uploading…*, *Extracting…*, *Ready*, *Failed*).
5. **Links** — list with an *Add link* button. Each row shows the link title and URL.

**Buttons.** *Cancel* on the left closes the modal without saving. *Save pack* on the right is the primary action; it is disabled until *Pack name* and at least one document or link is present.

**Promotion confirmation.** When the user flips Scope from *Personal* to *Org-wide* on an existing pack, a confirmation dialog appears: *"Make this pack visible to everyone in the firm? Org-wide packs can be deactivated by any admin but cannot easily be made personal again."* The user must confirm before the toggle commits.

### 3.4 Pack picker — chat entry

![[screenshot:04-pack-picker-modal.png|The pack picker opens from the Pack pill in any chat. The user can search across every pack they can see, attach one with a single click, or clear the active pack.]]

The pack picker is how the attorney activates a pack inside a chat. It opens from the *Knowledge pack* pill in the chat input row.

**Layout.** A centred modal with:

- A header — *"Attach a Knowledge Pack"*
- A search input that filters the pack list as the user types
- A pack list with one row per visible pack — pack name, scope badge, doc and link counts, one-line description, *Use* button
- A *"No pack"* row pinned at the top of the list as the way to clear the currently active pack
- A footer link — *"Manage knowledge packs →"* — which closes the picker and navigates to the library page

**Selection behaviour.** Clicking *Use* on a row sets that pack as the active pack for the conversation, closes the picker, and updates the Pack pill in the chat input to show the active pack's name.

### 3.5 Active pack indicator in chat

When a pack is attached to the conversation, the *Knowledge pack* pill in the chat input changes from its neutral state to an active state: gold accent, the pack name in the pill body, and a small detach button on the right side. A status line below the input row reads *"Using <intent> · <scope> · <pack name> pack"*, with the pack name in gold.

The pack remains active for every message in that thread until the user attaches a different pack, clears the pack from the picker, or starts a new chat (which resets to no pack).

### 3.6 Source attribution on answers

When the AI produces an answer that uses the active pack as its source, the chat bubble carries a small source pill underneath that reads *"Answered from Pack: <pack name>"*. The pill links back to the active pack — clicking it opens the pack-detail rail in the library page.

When the AI answers without using the pack (because the question wasn't in the pack's scope and a more authoritative source like a freshly attached document took priority), no pack source pill appears.

### 3.7 Filtering, search, and sorting

The library page supports three concurrent filters:

- **Scope tabs** — *All / Org-wide / Mine*. Mutually exclusive. Counts update with other filters applied.
- **Owner dropdown** — *All* or a specific owner. Counts the actual people who own visible packs.
- **Search input** — filters by pack name and description, case-insensitive substring match.

When all three narrow the visible set to zero, the grid shows a small *"No packs match your filters. Clear filters to see everything."* state with a single clear-filters action.

There is no explicit sort control. Packs are ordered by recency of last edit, most-recent first.

---

## 4. Per-entity / per-variant specification

*N/A — Knowledge Packs do not have multiple visual variants. Every pack uses the same card, detail rail, and edit modal regardless of content. The four pre-loaded packs differ only by their content, not by their behaviour.*

---

## 5. Cross-entity / cross-cutting behaviour

### Pack content and the AI

The user does not see how a pack's content reaches the AI. From the attorney's point of view, attaching a pack is sufficient — the AI just becomes better at the firm's questions in that conversation. The only place pack content surfaces is in the source pill described in Section 3.6.

A pack is considered consulted when the AI produces an answer that uses content from one or more of the pack's documents or links. If the question the attorney asks is unrelated to anything the pack contains, the AI will draw from other sources (uploaded documents, the Global Knowledge Base, general knowledge) and no pack source pill appears.

### Pack and intent are independent

Activating a pack does not change the active intent, and changing the intent does not change the active pack. The two are orthogonal session-level states. An attorney can pair any pack with any intent.

### Pack and uploaded documents

A pack and an attached document can both be active in the same chat. When both are active, the AI uses the attached document as the primary subject of the conversation and the pack as the reference frame. The source pill in this case reads *"Answered from: <document name>"* if the answer was drawn from the document, or *"Answered from Pack: <pack name>"* if the answer was drawn from the pack.

### Visibility and roles

| User role | What they see in the library |
|---|---|
| External user | The Knowledge Packs nav item is hidden entirely. External users do not have access to packs. |
| Team member | All org-wide packs + their own personal packs. |
| Manager | All org-wide packs + their own personal packs. |
| Org admin | Everything. Org admins can also deactivate any org-wide pack and reassign ownership. |

The library's *Owner* filter only lists owners the current user has visibility into. A team member does not see other team members' personal packs in the *Owner* dropdown.

### Persistence

Packs the user creates persist across sessions and across browser refreshes. The four pre-loaded packs ship with the product and are present on first open. Pack deletions are permanent — there is no trash or recovery.

---

## 6. Special-case entities or modes

### 6.1 Pre-loaded packs

The product ships with four pre-loaded, org-wide packs that every firm sees on first open:

| Pack | Contents | Owner |
|---|---|---|
| Standard NDA Playbook | Standard NDA clauses, review guidelines, firm-approved terms | The firm itself (system-owned) |
| M&A Due Diligence Pack | Due diligence checklist, templates, precedent cases | The firm |
| California Employment Law | California-specific employment and labor regulations, statutes, precedent | The firm |
| Privacy & Data Protection | GDPR, CCPA, cross-border transfer notes | A nominated firm member |

These packs behave identically to user-created packs in every respect except deletion: only an org admin can delete a pre-loaded pack, and the confirmation dialog warns that the pack will be unavailable to every member of the firm.

### 6.2 Detached state mid-conversation

When the attorney detaches a pack mid-conversation (clicking the detach button on the active Pack pill), the source pill on every subsequent answer reverts to *"Answered from: <other source>"* or no pill at all. Earlier answers in the same thread retain whatever pack source pill they were originally rendered with — detaching the pack does not retroactively change the attribution on prior answers.

### 6.3 Promotion conflict

If two attorneys simultaneously try to promote the same personal pack to org-wide, the first promotion wins and the second receives a toast: *"This pack is already firm-wide."* No data is lost.

---

## 7. Accessibility and interaction notes

### Keyboard navigation

- The library page supports Tab navigation through the toolbar controls (search, owner filter, scope tabs, new-pack button) and then through every pack card in row-major order.
- Enter on a focused card opens its detail rail. Escape closes the rail.
- Enter on a scope tab activates that tab. Arrow keys move focus between adjacent tabs.
- In the pack picker, Tab moves through the search input, every pack row, and finally the close button. Enter on a row activates the pack. Escape closes the picker.

### Screen-reader announcements

- Each pack card announces its name, scope, document count, link count, and owner.
- The scope badge announces *"Org-wide pack"* or *"Personal pack"*.
- The active pack pill in chat announces *"Active Knowledge Pack: <pack name>. Press Enter to change."*
- The source pill announces *"Source: Knowledge Pack <pack name>. Press Enter to open the pack."*

### Click targets

- Every interactive element on the library page (cards, tabs, filter chips, buttons) is at least 44 by 44 pixels.
- The Pack pill in the chat input is taller than the surrounding pills to make it easier to find by touch.

### Focus indicators

- Every focusable element has a visible focus ring in the brand navy.
- The picker modal traps focus when open.

### Colour contrast

- All gold-on-white elements (active pack states, *Org-wide* badge) have been verified at 4.6:1 contrast against their background.
- The navy primary buttons have 9.1:1 contrast.

### Responsive behaviour

- The library page collapses from three cards across to two cards across to a single column as the viewport narrows.
- The pack picker modal scales down to fill the viewport on mobile, with the close button moving to a sticky header.
- The pack pill in the chat input collapses to an icon-only state on very narrow viewports; tapping it still opens the full picker.

---

## 8. QA test scenarios

The following scenarios are numbered sequentially across the whole document for easy reference in bug reports. Scenarios are grouped by surface for ease of execution.

### 8.1 Library page — browse and filter

**Scenario 1** — Library renders with four pre-loaded packs on a fresh account.
- Surface: Pack library.
- Preconditions: First-ever login as an org admin. No packs created.
- Action: Open *Knowledge packs* from the chat sidebar.
- Expected result: Four cards visible — Standard NDA Playbook, M&A Due Diligence, California Employment Law, Privacy & Data Protection — each with the correct scope badge and a non-empty description.

**Scenario 2** — Scope tab *Mine* with no personal packs shows the empty state.
- Surface: Pack library.
- Preconditions: User has not created any personal packs.
- Action: Click the *Mine* scope tab.
- Expected result: Grid shows an empty-state message ("You haven't created any personal packs yet") and a *Create personal pack* button.

**Scenario 3** — Scope counts update as packs are added.
- Surface: Pack library.
- Preconditions: User sees *Mine 0*.
- Action: Create a personal pack named *My Test Pack*.
- Expected result: The *Mine* tab now reads *Mine 1*. The *All* tab count also increases by one.

**Scenario 4** — Search filters by name.
- Surface: Pack library.
- Preconditions: Library shows four pre-loaded packs.
- Action: Type *"NDA"* in the search input.
- Expected result: Only the *Standard NDA Playbook* card remains visible. All other cards are hidden.

**Scenario 5** — Search filters by description.
- Surface: Pack library.
- Preconditions: Library shows four pre-loaded packs.
- Action: Type *"GDPR"* in the search input.
- Expected result: Only the *Privacy & Data Protection* card remains visible.

**Scenario 6** — Search with no match shows a clear-filters state.
- Surface: Pack library.
- Preconditions: Library shows packs.
- Action: Type *"xyzzy"* in the search input.
- Expected result: Grid is replaced by *"No packs match your filters. Clear filters to see everything."* with a clear-filters button. Clicking it clears the search and restores the full grid.

**Scenario 7** — Owner filter lists only visible owners.
- Surface: Pack library.
- Preconditions: Logged in as a team member; another team member has not created any pack.
- Action: Open the *Owner* dropdown.
- Expected result: The dropdown lists *All*, *Me*, *Firm (system)*, and any other org-wide pack owners. It does not list other team members who have only personal packs.

**Scenario 8** — Clearing filters with the clear-filters link.
- Surface: Pack library.
- Preconditions: Search is active and scope tab is *Mine*.
- Action: Click the clear-filters action.
- Expected result: Search input clears, scope returns to *All*, every pack the user can see is rendered.

### 8.2 Pack detail rail

**Scenario 9** — Clicking a card opens the detail rail.
- Surface: Pack library.
- Preconditions: Library is showing pack cards.
- Action: Click the *Standard NDA Playbook* card.
- Expected result: Right rail opens showing the pack name, description, document list, link list, and an *Edit pack* button. Library grid resizes to make room.

**Scenario 10** — Switching to a different pack updates the rail.
- Surface: Pack detail rail.
- Preconditions: Detail rail is open on Pack A.
- Action: Click Pack B in the library.
- Expected result: The rail body swaps to Pack B's content without closing and reopening the rail.

**Scenario 11** — Closing the rail returns the library to full width.
- Surface: Pack detail rail.
- Preconditions: Detail rail is open.
- Action: Click the close button in the rail.
- Expected result: Rail closes, library grid returns to full width.

### 8.3 Create pack

**Scenario 12** — Save is disabled until a pack name is entered.
- Surface: Create-pack modal.
- Preconditions: Modal is open via the *New pack* button.
- Action: Observe the *Save pack* button.
- Expected result: Button is visibly disabled while the pack name is empty.

**Scenario 13** — Save remains disabled with a name but no documents or links.
- Surface: Create-pack modal.
- Preconditions: Modal is open.
- Action: Type a pack name. Do not add any document or link.
- Expected result: Button is still disabled. Hovering shows the tooltip *"Add at least one document or link to save."*

**Scenario 14** — Adding a single document enables save.
- Surface: Create-pack modal.
- Preconditions: Modal is open. Name has been entered.
- Action: Click *Add documents* and select a single PDF.
- Expected result: The document appears in the list with status *Extracting…* and after a moment *Ready*. The *Save pack* button becomes active.

**Scenario 15** — Document extraction failure surfaces in the row.
- Surface: Create-pack modal.
- Preconditions: Modal is open with a name.
- Action: Add a malformed or password-protected PDF.
- Expected result: The document row shows *Failed* status with a *Retry* link. Save remains active if there are other ready documents; otherwise it disables.

**Scenario 16** — Default scope is Personal.
- Surface: Create-pack modal.
- Preconditions: Fresh modal.
- Action: Inspect the Scope toggle.
- Expected result: Default position is *Personal (only I see it)*.

**Scenario 17** — Cancel discards changes.
- Surface: Create-pack modal.
- Preconditions: Modal is open with a name and one document added.
- Action: Click *Cancel*.
- Expected result: Modal closes. Library does not show a new pack. No partial pack is persisted.

### 8.4 Edit pack

**Scenario 18** — Opening edit pre-populates every field.
- Surface: Edit-pack modal.
- Preconditions: A pack with name, description, two documents, and one link exists.
- Action: Open the pack detail rail. Click *Edit pack*.
- Expected result: The modal opens with all five fields populated. The title reads *"Edit pack"* and the button reads *"Save changes"*.

**Scenario 19** — Removing a document.
- Surface: Edit-pack modal.
- Preconditions: Modal is open with two documents.
- Action: Click the remove icon on one document.
- Expected result: The document disappears from the list immediately. Saving commits the removal.

**Scenario 20** — Adding a document persists.
- Surface: Edit-pack modal.
- Preconditions: Modal is open.
- Action: Add a new document. Save.
- Expected result: Modal closes. The pack-detail rail (still open) shows the new document in the list.

### 8.5 Promote pack

**Scenario 21** — Promoting Personal to Org-wide requires confirmation.
- Surface: Edit-pack modal.
- Preconditions: Modal is open on a personal pack.
- Action: Flip Scope to *Org-wide*.
- Expected result: A confirmation dialog appears with the warning text. The toggle does not commit until the user confirms.

**Scenario 22** — Cancelling the promotion reverts the toggle.
- Surface: Edit-pack modal.
- Preconditions: Promotion confirmation dialog is showing.
- Action: Cancel.
- Expected result: Toggle returns to *Personal*. Pack remains personal.

**Scenario 23** — Confirming the promotion saves the new scope.
- Surface: Edit-pack modal.
- Preconditions: Confirmation dialog is showing.
- Action: Confirm. Save the modal.
- Expected result: The pack now appears under *Org-wide*. Other firm members see it on next refresh.

### 8.6 Delete pack

**Scenario 24** — Deleting requires confirmation.
- Surface: Pack detail rail.
- Preconditions: Detail rail is open.
- Action: Click *Delete pack* in the kebab.
- Expected result: Confirmation dialog: *"Delete <pack name>? This cannot be undone."* with *Cancel* and *Delete* buttons.

**Scenario 25** — Confirmed deletion removes the pack from the library.
- Surface: Pack detail rail.
- Preconditions: Confirmation dialog is showing.
- Action: Confirm.
- Expected result: Rail closes. Pack disappears from the grid. Toast: *"Pack deleted."* Scope counts decrease.

**Scenario 26** — A team member cannot delete an org-wide pack.
- Surface: Pack detail rail.
- Preconditions: Logged in as a team member viewing an org-wide pack.
- Action: Inspect the kebab.
- Expected result: *Delete pack* option is absent. *Edit pack* button is also absent. Only *Close* is available.

### 8.7 Pack picker from chat

**Scenario 27** — Picker opens from the empty-state Knowledge pack pill.
- Surface: Chat empty state.
- Preconditions: Open a new chat. No pack is active.
- Action: Click the *Knowledge pack* pill in the Optional row.
- Expected result: Pack picker modal opens centred.

**Scenario 28** — Picker opens from the populated-chat Pack pill.
- Surface: Chat populated state.
- Preconditions: User has sent at least one message in the thread.
- Action: Click the Pack pill below the chat input.
- Expected result: Picker modal opens.

**Scenario 29** — Search inside the picker filters live.
- Surface: Pack picker.
- Preconditions: Picker is open with at least four packs visible.
- Action: Type *"M&A"* in the picker search input.
- Expected result: Only the M&A Due Diligence row remains in the list.

**Scenario 30** — *Use* attaches a pack to the chat.
- Surface: Pack picker.
- Preconditions: Picker is open.
- Action: Click *Use* on a row.
- Expected result: Picker closes. The Pack pill in the chat input now shows the pack name in gold. The status line reads *"Using <intent> · <scope> · <pack> pack"*.

**Scenario 31** — *No pack* clears the active pack.
- Surface: Pack picker.
- Preconditions: A pack is currently active.
- Action: Open the picker. Click the *No pack* row.
- Expected result: Picker closes. The Pack pill returns to its neutral state. Status line no longer mentions a pack.

**Scenario 32** — Detach button on the active pill clears the pack.
- Surface: Active Pack pill.
- Preconditions: A pack is active in the chat.
- Action: Click the detach button on the active pill.
- Expected result: The pack pill returns to its neutral state without opening the picker. No confirmation dialog (single-click action).

**Scenario 33** — *Manage knowledge packs →* footer link.
- Surface: Pack picker.
- Preconditions: Picker is open.
- Action: Click the footer link.
- Expected result: Picker closes. The page navigates to the pack library.

### 8.8 Source attribution in chat

**Scenario 34** — Pack source pill renders on a pack-grounded answer.
- Surface: Chat.
- Preconditions: Standard NDA Playbook is the active pack. User has uploaded no documents.
- Action: Ask *"What does our firm say about indemnification scope in NDAs?"*
- Expected result: The AI's answer carries a source pill below the bubble reading *"Answered from Pack: Standard NDA Playbook"*.

**Scenario 35** — No pack pill when the answer wasn't grounded in the pack.
- Surface: Chat.
- Preconditions: Standard NDA Playbook is the active pack.
- Action: Ask *"What's the weather in Anchorage?"*
- Expected result: The AI redirects to a legal question or declines. No pack source pill appears.

**Scenario 36** — Clicking the source pill opens the pack.
- Surface: Chat.
- Preconditions: Pack source pill is rendered on at least one answer.
- Action: Click the pill.
- Expected result: The page navigates to the library and opens the named pack's detail rail.

**Scenario 37** — Detaching a pack mid-thread does not change prior pills.
- Surface: Chat.
- Preconditions: Thread has three answers, each with a pack source pill.
- Action: Detach the pack via the active Pack pill. Send a new message.
- Expected result: The three prior answers retain their pack source pills. The new answer does not show one.

### 8.9 Intent orthogonality

**Scenario 38** — Switching intent does not detach the pack.
- Surface: Chat.
- Preconditions: A pack is active. Intent is General Chat.
- Action: Switch intent to *Risk Assessment*.
- Expected result: The active Pack pill still shows the same pack. The status line updates to *"Using Risk Assessment · <scope> · <pack> pack"*.

**Scenario 39** — Switching pack does not change intent.
- Surface: Chat.
- Preconditions: Intent is *Contract Review*. A pack is active.
- Action: Open the picker. Use a different pack.
- Expected result: Intent remains *Contract Review*. The status line shows the new pack and the same intent.

### 8.10 Role gating

**Scenario 40** — External user does not see the Knowledge packs nav item.
- Surface: Chat sidebar.
- Preconditions: Logged in as an external user.
- Action: Inspect the sidebar.
- Expected result: *Knowledge packs* item is absent from the Knowledge section.

**Scenario 41** — Team member sees only org-wide and own personal packs.
- Surface: Pack library.
- Preconditions: Logged in as a team member. Another team member has created personal packs.
- Action: Open *All* scope tab.
- Expected result: The grid shows all org-wide packs and the current user's personal packs only. The other member's personal packs are absent.

**Scenario 42** — Team member cannot edit an org-wide pack.
- Surface: Pack detail rail.
- Preconditions: Logged in as a team member. Detail rail is open on an org-wide pack.
- Action: Inspect the rail.
- Expected result: *Edit pack* button is absent or disabled with the tooltip *"Only the owner or an admin can edit this pack."*

### 8.11 Accessibility and responsive

**Scenario 43** — Tab order on the library page.
- Surface: Pack library.
- Preconditions: Library is open.
- Action: Press Tab from the page-loaded state.
- Expected result: Focus moves through Back-to-chat, search input, owner filter, scope tabs (in order), New pack button, and then through pack cards in row-major order.

**Scenario 44** — Picker traps focus.
- Surface: Pack picker.
- Preconditions: Picker is open.
- Action: Press Tab repeatedly until focus wraps.
- Expected result: Focus stays within the modal — the search input, each row, the *Manage knowledge packs* link, and the close button — and wraps back to the start.

**Scenario 45** — Library grid collapses to one column on mobile.
- Surface: Pack library.
- Preconditions: Viewport at 375 px width.
- Action: Open the library.
- Expected result: Cards render one per row. Toolbar wraps to two rows if needed. Search input becomes full-width.

**Scenario 46** — Pack pill collapses to an icon on narrow chat input.
- Surface: Chat input.
- Preconditions: Viewport at 480 px width.
- Action: Inspect the chat input row.
- Expected result: The Pack pill shows only the icon, with the pack name truncated or hidden. Tapping the icon opens the full picker.

### 8.12 Edge cases

**Scenario 47** — Pack with zero documents and zero links cannot be saved.
- Surface: Create-pack modal.
- Preconditions: Modal is open with a name only.
- Action: Attempt to save.
- Expected result: Save remains disabled. Tooltip explains why.

**Scenario 48** — Very long pack name truncates on the card with an ellipsis.
- Surface: Pack library.
- Preconditions: A pack named with 80+ characters.
- Action: View the card.
- Expected result: Name truncates to a single line with an ellipsis. Hovering shows the full name.

**Scenario 49** — Pack with a broken reference link is still usable.
- Surface: Pack detail rail.
- Preconditions: A pack contains a link that returns 404.
- Action: Open the rail.
- Expected result: The link row renders with the URL. The pack remains attachable and usable in chat. Link is not auto-removed.

**Scenario 50** — Promoting a deleted personal pack errors gracefully.
- Surface: Edit-pack modal.
- Preconditions: An admin has just deleted the personal pack the user is editing.
- Action: Save the modal.
- Expected result: Toast: *"This pack is no longer available — it may have been deleted by an admin."* The modal closes. No silent crash.

---

## 9. Open questions and known gaps

- **Q1** — When the AI cannot ground in the active pack but the question is in scope (the answer is in the pack, the model just missed it), should the source pill say *"Knowledge Pack unavailable"* or stay silent? Currently silent. Owner: PM. Decision needed before client demo.
- **Q2** — Link fetching is not yet implemented. Today links save metadata only; the AI does not read their content. Pack documents are fully readable. Owner: Engineering. On Sprint 2 backlog.
- **Q3** — Duplicate-document detection across packs is not implemented. A firm can attach the same document to three packs and pay the inlining cost three times. Owner: Engineering. Backend dependency.
- **Q4** — Visibility filter for personal packs once a second attorney account exists on the device has not been re-verified end-to-end since the persistence layer was rewritten. Owner: QA. Re-run scenarios 41 and 42 after the next QA cycle.
- **Q5** — Promotion is one-way in the UI today (Personal → Org-wide is confirmed; Org-wide → Personal has no UI affordance). Is that intentional, or should we expose the reverse with a stronger confirmation? Owner: PM.
- **Q6** — Pack usage analytics — which packs are most attached, which documents inside a pack are most cited — are not surfaced in any report. Owner: PM + Analytics. Backlog.
- **Q7** — Pre-loaded packs are read-only for non-admins. The text "Standard NDA Playbook" implies content quality the firm hasn't actually reviewed. Should the product nudge admins to audit pre-loaded packs before exposing them to attorneys? Owner: PM.
- **Q8** — Mobile layout for the pack-detail rail has not been spec'd. Today on mobile the rail takes the full viewport. Is that the right call, or should it slide up from the bottom as a sheet? Owner: Design.

---

## 10. Document control

- **Version:** 1.0
- **Date:** 2026-05-28
- **Author:** Arjun Sharma, Product
- **Reviewers:** Pending sign-off — PM lead, QA lead, client stakeholder
- **Related FRDs:** `FRD_YourVault.docx` (sibling library module), `FRD_Intent_Cards.docx` (intent ↔ pack orthogonality), `FRD_Unified_Intents.docx`, `FRD_Workflows.docx`

### Revision history

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0 | 2026-05-28 | Arjun Sharma | Initial draft. Covers library page, detail rail, create / edit / delete, picker, chat attachment, source attribution, role gating, accessibility, and 50 QA scenarios. |
