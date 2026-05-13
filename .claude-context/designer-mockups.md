# Designer mockup folder — `~/Downloads/yourai-pages-build/`

The designer hands over a folder of HTML+CSS prototypes that act as the source of truth for current-pass UI work. When the user says "match the design" or "improve this UI, take reference of `<file>`", they mean a file in this folder. Match the HTML structure + CSS values exactly unless the PM overrides.

## Folder contents (2026-05-13)

| File | Surface | Match status |
|---|---|---|
| `yourai-styles.css` | Shared design tokens + global resets + sidebar / page / form / table primitives. **This is the canonical token list** — match var names + hex values here, not the older versions in `src/index.css`. | n/a — reference only |
| `chat.html` | Tenant chat **empty state** (Good afternoon, …) — sparkle hero, beige composer block, separate Upload bar, quick-chip row, footer disclaimer. | ✅ matched 2026-05-13 (commit `0b32e2b`) |
| `chat-active.html` | Tenant chat **populated state** — conversation topbar (title + meta icons), gold-tinted answer card with citation pills, "Current search:" line with bullseye icon + blue link styling, file chips with red `PDF` badge in the composer, same beige composer + Upload bar as empty state, source-dropdown overlay. | ⚠️ partial — only the `.src-dropdown` style was borrowed (applied to intent + scope dropdowns 2026-05-13). The conversation chrome (topbar, answer card, file chips, citation pills) is not yet wired. |
| `workspaces.html` | Workspaces full-page list. | ❌ not yet matched |
| `vault.html` | YourVault full-page surface. | ❌ not yet matched |
| `packs.html` | Knowledge Packs full-page surface. | ❌ not yet matched |
| `workflows.html` | Workflows picker. | ❌ not yet matched |
| `prompt-templates.html` | Prompt Templates list. | ❌ not yet matched |
| `prompt-templates-detail.html` | Prompt Templates detail editor. | ❌ not yet matched |
| `yourai.html` | Marketing / landing surface. | ❌ not yet matched — may be out of scope for the prototype |

The folder also contains some `Screenshot ….png` and `image 48.png` files — these are reference screenshots the designer attached, not master files; treat as supplementary.

## Reading the mockups

- The HTML uses an `<aside class="sidebar">` + `<main class="main">` grid layout. Our React app's `Sidebar` + `ChatView` (or full-page panel) renders the same shape.
- All colors come from `yourai-styles.css` `:root` custom properties. Notable tokens introduced/reaffirmed in this batch:
  - `--green: #3fb56b`, `--green-text: #2a8a4f` — the green chip color (e.g. the active intent pill on the empty-state composer).
  - Composer beige `#efe9d8`, page bg `#fbf8ef`, legal-pill bg `#e2dcc6` + border `#c8c1a6`, ca-pill border `#cfc8b1`. These are inline in the HTML's `<style>` blocks, not in `:root` — copy them as literal hex when porting to React.
- Inline `<style>` blocks at the top of each HTML file define page-specific classes (`.composer`, `.upload-bar`, `.src-dropdown`, etc.). Read those FIRST when matching — the shared `yourai-styles.css` only has the global primitives.

## Conventions inferred from the mockup folder

These came out of matching `chat.html` + `chat-active.html` and should hold for the rest of the folder unless something contradicts:

1. **Composer beige `#efe9d8` is the canonical "input area" surface.** Both empty + populated states use it; the separate Upload bar uses the same shade. Don't substitute `--ice-warm` or `--cream`.
2. **All in-composer pills are 40 px tall**, white background, 1 px `#cfc8b1` border, radius 999, 13.5 px label, 16 px horizontal padding. Send button is a 40×40 navy circle on the same baseline.
3. **Dropdowns triggered from in-composer pills share the `.src-dropdown` chrome** — see CLAUDE.md "Conventions" for the full spec. Apply this to any new dropdown opening from a composer pill.
4. **Quick chips are white pills with green-dot prefixes** — `--green` 6 px circle on the left, 13 px label, 1 px `--chip-border` border. Center-aligned row.

## Workflow when extending the matched-set

When picking up the next mockup (likely `chat-active.html`'s populated chat):

1. Open the HTML in a browser + read the inline `<style>` block alongside the shared `yourai-styles.css`.
2. List every NEW class / selector that the mockup introduces. These are the visual primitives you need to port.
3. Find the React surface that owns that JSX (`ChatView.jsx` for chat, `WorkspacesPage.tsx` for workspaces, etc.) and the relevant render block (`showEmptyState` vs populated branch).
4. Replace the React JSX one section at a time. Run `npm run build` + visual check at each step (the legacy refs / state mostly stay live so you can leave hidden `display:none` mounts for orphaned refs to avoid ripping them out).
5. Preserve ALL existing wiring (event handlers, `*Ref` map, `closeAllPanels`, suggestion banners). Visual replace only, no logic change.
6. After ship: update PROGRESS.md, capture new conventions in CLAUDE.md (especially anything from the inline `<style>` that's reusable), and update the "Match status" table in this doc.
