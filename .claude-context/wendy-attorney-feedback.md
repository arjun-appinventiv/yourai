# Wendy attorney interview — feedback P-list (2026-04-27)

> Captured from a live client interview. Wendy = practicing attorney
> (family law focus). Ryan Hoke = CEO. Michael = advisor. Ryan
> Robertson = engineer. Arjun (PM) led the demo.
>
> Load this before any "what does the client want next" planning. Each
> P-item below is one of the 12 friction points Wendy named, with
> current status and the relevant commit SHAs from the 2026-04-27
> implementation sprint.

## P1 — Survey before pricing creates a trust problem ✅ Shipped

> "Now do I not trust those numbers because of the answers I gave?"

Onboarding cut to **two steps: Plan → Payment**. Role / practice area
/ firm size / primary state collection moved out of the active flow
(renderStep1..4 stay defined for an eventual post-onboarding profile
nudge).

Commit: `c2fa0fd` (2026-04-27).

## P2 — Self-serve setup is the wrong model; consultant / admin should configure ✅ Shipped (invited path) ⏸ Backlog (consultant model)

> "Somebody needs to set this up for them."

Invited-user fast path: `/chat/signup?invited=1&email=…&firm=…` marks
the email pre-verified, locks both email + firm name, skips OTP, skips
survey + payment, lands directly on `/chat/home`. Profile stamped
`viaInvite: true`.

Long-term consultant-led setup model (where someone configures the
firm's plan, role-based access, KP defaults, etc. on behalf of the
firm) is backlog.

Commits: `c2fa0fd`, `b55d879` (firm-name lock).

## P3 — Document Vault was flat; needs nested folders ✅ Shipped

> "Will we be able to have folders and subfolders?"
> "Don't reinvent the wheel — like Explorer, folders of folders."

`VaultFolder.parentId` enables nesting. Default seed includes
`Contracts › Acme Corp › MSA & Schedules` so nesting is visible from
first load. Breadcrumb walks the parent trail. Deleting a folder
re-parents its direct children to the deleted folder's parent.

Commit: `dd43b27`.

## P4 — Recursive folder upload (drag a folder, structure persists) ✅ Shipped

New "Upload folder" button uses `webkitdirectory`. Walks each
`File.webkitRelativePath`, recreates the directory tree (deduped by
name+parent so re-uploads merge), and adds VaultDoc entries with
`folderId` set to their leaf folder. Toast: "Uploaded N files with
folder structure preserved."

Commit: `dd43b27`.

## P5 — UI labels: "just folders, like an explorer" ✅ Shipped

> "Just folders. The word folder kind of like an explorer."

`+ Folder` / `+ Document` (was "New Folder" / "New Document"). Inside
a folder, section headers switch to "Subfolders" / "Documents in this
folder".

Commit: `dd43b27`.

## P6 — "Workspaces" doesn't land; she'd call them "client files" ⚠ Renamed then reverted

Renamed to **Case Workspaces** in the afternoon. Arjun reverted to
plain **Workspaces** in the evening. Tile description softened to
"per-matter workspaces" to reach Wendy's mental model without forcing
the noun.

Commits: `dd43b27` (rename), `029a6fb` (revert), `7c9c8b8` (tip
removal).

## P7 — One-upload-per-chat rule is friction ✅ Shipped (additive uploads)

> "Even though we upload documents into the vault, I still have to
> attach them to the conversation?"

DEC-095 Option C is **gone**. Uploads now flow into pendingAttachments
mid-thread without blocking. New docs APPEND to `sessionDocContext`
rather than replace, get labelled `Document N (added HH:MM): filename`
in the system prompt, and trigger an inline thread note offering a
one-click "Start a new chat →" escape hatch (window event
`yourai:start-new-chat` → ChatView's top-level listener).

Considered (and rejected) Arjun's first proposal — "ask if the new doc
is related; yes = continue, no = new chat" — too much friction in the
common case where the upload IS related.

Commits: `2545af3` (additive), `36ff787` + `15933b7` (the doc-inline
fix that finally pipes content into the Edge body), `7c9c8b8` (stale
"One attachment per chat" callout removed).

## P8 — Cross-account metadata + content queries ⏸ Partial (P8.1 + P8.2 shipped)

> "What is the biggest at-close download I have?"

P8.1 (filter chips) + P8.2 (Ask-anything NL parser) shipped today —
see `vault-find-search-plan.md` for the full phasing. P8.3 (real
metadata enrichment — page count, mimeType, lastModified, auto-stamp
workspaceId) and P8.4 (content semantic search via pgvector) are
backlog.

Commits: `87a2d0e` (chips + Ask), `4b0bb63` (Ask-promoted-to-toolbar),
`fef1399` (transient-filter clear bug fix).

## P9 — Default state-law KP per primary state ⏸ Backlog

> "Most clients are not going to work in more than one state's law at
> a time. Could there just be a default?"

Auto-attach state-law KP based on user's primary state from
onboarding. Not yet wired.

## P10 — Lexus / West integration over scraping ⏸ Backlog

> "Doesn't make sense for you guys to scrape the net for cases when
> it's already done somewhere else."

Karish to scope. Static-scrape KPs are v1 fallback.

## P11 — Default open access within the firm ⚠ Partial

> "Most law firms have NO restrictions on client files."

The KP redesign removed the "BY OWNER" rail (less role-restrictive
feel) and folded share-org-wide into a footer toggle. Role-based
access stays in the admin panel per Ryan/Michael's compliance call.
Default-open-within-firm flag flip is still pending.

## P12 — Large-file (500-page PDF) strategy ⏸ Backlog

Family-law app-close exports run 300–500 pages. Auto-compression +
per-case MD summary index. Hog mentioned an open-source memory system
that could help.

## Ride-along improvements (not on Wendy's list, but visible)

| Area | Commit | Note |
|---|---|---|
| Tile-based home `/chat/home` (Pillar A reborn) | `c2fa0fd`, `b55d879` | Aashna review pass on borders. Login default flipped here for non-externals. |
| Sidebar dynamic active state + Home button + Dashboard→Chat rename | `c2fa0fd`, `2545af3` | Was hard-coded `active: true` on Home. |
| SA Bot Persona cleanups | (earlier 2026-04-26) | Removed Message Routing Flow + Per-Persona Response Format wireframe blocks. |
| Vault + KP full-page redesign (Aashna) | `6fa7676` | Modal → two-pane Finder layout. |
| Sample seed docs are real PDFs | `1a4fa27` | 4 PDFs in `public/sample-docs/` + `content` stamped on entries for AI grounding. |
| `closeAllPanels()` mutual-exclusion helper | `2100317` | Two panels were rendering side-by-side. |
| `User` icon import bug fix | `20a500a` | KP page was crashing the app on click. |
| `Case Workspaces` home tile didn't open workspaces | `1a4fa27` | Same component instance retained `closeAllPanels`-set state. |

## Gotchas to keep in mind for the next demo

- Most fixes from today only flow to existing testers after they
  hard-refresh. Tell Wendy / Ryan to ⌘⇧R if they see stale UI.
- The bot can now read the four seed PDFs verbatim — try
  *"what's the indemnification cap in the Acme MSA?"* and expect
  Section 7.1 with the 12-month-fees language.
- Vercel preview deployments return 401 with
  `{"error":"Not authenticated"}` — production URL
  (https://yourai-black.vercel.app) is unprotected.
