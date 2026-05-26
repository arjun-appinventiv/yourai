# Chat composer + bubble pattern

Reference for the unified chat-input chrome that ships across the empty
state, populated chat, and `WorkspaceChatView` — plus the bucket-color
system that drives the active-intent accent.

Load this file (`@.claude-context/chat-composer-pattern.md`) when:
- Adding a new chat-input surface
- Touching the existing composers (intent pill, scope pill, KP pill, drag/drop)
- Changing message bubble alignment / styling
- Adding a new intent and wondering which colour its accent should be
- Wiring a new feature that needs to match the chat input chrome

---

## Source of truth — `src/lib/intents.ts`

```ts
export const BUCKET_COLORS: Record<string, string> = {
  'DEFAULT':        '#3FB56B',  // green   — general chat
  'ASK & RESEARCH': '#3B82F6',  // blue    — research / Q&A / find
  'ANALYZE':        '#D97706',  // amber   — analysis / review / risk
  'DRAFT':          '#8B5CF6',  // purple  — drafting
};
```

`INTENT_BUCKETS` groups intents into one of these 4 buckets;
`getBucketForIntent(intentId)` returns the bucket label. To get an
intent's accent colour:

```ts
const bucket = getBucketForIntent(activeIntent);
const bucketColor = (bucket && BUCKET_COLORS[bucket]) || BUCKET_COLORS.DEFAULT;
```

Always derive the colour through these helpers — don't hardcode a hex
at the call site. When a new intent is added, register its id in the
appropriate bucket in `INTENT_BUCKETS` and the colour propagates
automatically.

---

## Composer container

Same shape across all 3 surfaces:

```jsx
<div
  onDragOver={...} onDragLeave={...} onDrop={...}
  style={{
    width: '100%',
    background: isFileDropHover ? '#f8fafc' : '#fff',
    border: isFileDropHover ? '2px dashed var(--navy)' : '1.5px solid #b8bcc4',
    borderRadius: 20,
    padding: isFileDropHover ? 15 : 16,
    display: 'flex', flexDirection: 'column', gap: 12,
    transition: 'background 150ms, border-color 150ms',
  }}
>
  {/* intent pill */}
  {/* textarea */}
  {/* bottom row */}
</div>
```

- Default border `1.5px solid #b8bcc4` (NOT `var(--border)` — that's
  `#e6e6ea` and reads as too faint against the white composer).
- Dragover state replaces the border with `2px dashed var(--navy)` and
  the bg with `#f8fafc`; padding shifts to 15 so total dimensions stay
  stable when the border thickens.

**Each composer has its own dragover state.** The composer uses
`isFileDropHover`; the standalone "Drop your files here" bar uses
`isUploadBarDropHover`. Don't share the state — `onDragLeave` fires
unreliably between adjacent elements so a shared state lights up both
surfaces at once.

---

## Intent pill (top of composer, 160 × 40)

```jsx
<div style={{ position: 'relative', width: 160 }} ref={intentMenuRef}>
  <button
    onClick={() => setIsIntentMenuOpen(v => !v)}
    style={{
      width: '100%', height: 40,
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '0 14px', borderRadius: 999,
      background: `${bucketColor}1a`,                // 10% alpha tint
      border: `1.5px solid ${bucketColor}99`,        // 60% alpha border
      color: bucketColor,                            // full hue
      fontSize: 13, fontWeight: 500,
      fontFamily: 'inherit', cursor: 'pointer', lineHeight: 1,
    }}
  >
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: bucketColor }} />
    <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {getIntentLabel(activeIntent)}
    </span>
    <ChevronDown size={12} style={{ color: bucketColor }} />
  </button>
  {/* dropdown opens DOWNWARD because the pill is at the top */}
</div>
```

Dropdown chrome (when open):

```jsx
<div style={{
  position: 'absolute', top: 'calc(100% + 8px)', left: 0,
  width: 280, backgroundColor: '#fff', borderRadius: 12,
  border: '1px solid #e6e7ec',
  boxShadow: '0 12px 32px rgba(15,28,63,0.10)',
  padding: 8, zIndex: 51, maxHeight: 380, overflowY: 'auto',
}}>
  {/* grouped by bucket, each group header has a coloured dot */}
</div>
```

Bucket section header style:
```
padding: '8px 12px 4px',
fontSize: 10.5, color: 'var(--text-muted)',
fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase',
```

Selected row uses `background: var(--gold-bg)` + a gold check on the
right (gold = `var(--gold)` for the check icon).

---

## Bottom row pills (160 × 40 each)

Three same-size pills + send button. All three use the same chrome:

```jsx
{/* File Search scope pill */}
<button style={{
  width: '100%', height: 40,
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '0 14px', borderRadius: 999,
  border: '1.5px solid #b8bcc4',
  background: '#fff',
  fontFamily: 'inherit', fontSize: 13.5, color: 'var(--text-primary)',
  cursor: 'pointer', lineHeight: 1,
}}>
  <Icon size={14} />
  <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {label}
  </span>
  <ChevronDown size={12} />
</button>
```

Layout:
- LEFT: File Search pill (160w)
- RIGHT: Knowledge pack pill (160w) + send button (40 × 40 navy circle)
- Use `justify-content: space-between` on the row container

Send button:
```jsx
<button style={{
  height: 40, width: 40, flexShrink: 0, borderRadius: '50%',
  background: 'var(--navy)', color: '#fff', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: canSend ? 'pointer' : 'default',
  opacity: canSend ? 1 : 0.45, transition: 'opacity 150ms',
}}>
  <ArrowUp size={16} color="#fff" />
</button>
```

`canSend = (input.trim() || pendingAttachments.length > 0) && !isTyping`.

---

## Textarea

```jsx
<textarea
  ref={inputRef}
  className="no-focus-ring"
  value={input}
  onChange={...}
  onKeyDown={handleKeyDown}
  placeholder="Ask anything... or drop in a file"
  rows={1}
  style={{
    width: '100%', border: 'none', outline: 'none', resize: 'none',
    fontFamily: 'inherit', fontSize: 15, color: 'var(--text-primary)',
    background: 'transparent', lineHeight: 1.5,
    minHeight: 28, maxHeight: 200, overflowY: 'auto',
    padding: '4px 4px',
  }}
  onInput={(e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  }}
/>
```

The placeholder text is uniform: **`"Ask anything... or drop in a file"`**
in main chat (empty + populated). `WorkspaceChatView` uses
`Ask anything about ${workspace.name}…` because the corpus is scoped.

`.no-focus-ring` is defined in `src/index.css` — it hides the macOS
scrollbar that otherwise appears between the textarea and the KP
dropdown on "Always show scrollbars" preference.

---

## Drop-your-files-here bar (sibling of the composer)

```jsx
<div
  onClick={() => dropFileInputRef.current?.click()}
  onDragOver={...} onDragLeave={...} onDrop={...}
  style={{
    marginTop: 12, width: '100%',
    background: isUploadBarDropHover ? '#f8fafc' : '#fff',
    border: isUploadBarDropHover ? '2px dashed var(--navy)' : '1.5px solid #b8bcc4',
    borderRadius: 14,
    padding: isUploadBarDropHover ? '13px 21px' : '14px 22px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'background 150ms, border-color 150ms',
  }}
>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: 13.5 }}>
    <Upload size={14} />
    Drop your files here
  </span>
  <span style={{ color: 'var(--text-muted)', fontSize: 12.5, letterSpacing: '0.3px' }}>
    PDF · DOCX · TXT · max 25MB
  </span>
</div>
```

Uses `isUploadBarDropHover` (NOT `isFileDropHover`). Click opens the
file picker (`dropFileInputRef.current?.click()`). Drop attaches via
`handleAttachFiles(files, 'doc')`. Folder drops surface a bot message
steering the user to YourVault (folder upload supported there).

---

## Message bubble — user right, bot flat-left

```jsx
return (
  <div style={{
    display: 'flex', gap: 12, marginBottom: 24,
    flexDirection: isBot ? 'row' : 'row-reverse',
    alignItems: 'flex-start',
  }}>
    {/* avatar */}
    {isBot ? (
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 100%)', ... }}>
        <Sparkles size={16} color="#fff" />
      </div>
    ) : (
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navy)', color: '#fff', ... }}>R</div>
    )}

    {/* body — shrinks-to-content for user, stretches for bot */}
    <div style={{
      flex: isBot ? 1 : '0 1 auto', minWidth: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: isBot ? 'flex-start' : 'flex-end',
    }}>
      {/* name + timestamp row also flips direction for user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexDirection: isBot ? 'row' : 'row-reverse' }}>
        <span>{isBot ? 'YourAI' : 'Ryan'}</span>
        <span>{msg.timestamp}</span>
      </div>

      {/* attachments align right for user */}
      {msg.attachments?.length > 0 && (
        <div style={{ ..., justifyContent: isBot ? 'flex-start' : 'flex-end' }}>...</div>
      )}

      {/* content — soft bubble for user, flat for bot */}
      <div style={{
        fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', wordBreak: 'break-word',
        ...(isBot ? {} : {
          padding: '10px 14px',
          borderRadius: 14,
          background: 'var(--ice-warm)',
          border: '1px solid var(--border)',
        }),
      }}>
        {/* markdown / card chip / confirmation prose */}
      </div>
    </div>
  </div>
);
```

Same pattern in `WorkspaceChatView`'s `MessageBubble` — don't reintroduce
the workspace-chat old style of "white-on-navy bubble for user / white
card for bot." Both surfaces use the same shape now.

---

## Quick-chip pills (below the empty-state composer)

```jsx
{quickChips.map((chip) => {
  const chipBucket = getBucketForIntent(chip.intent);
  const chipColor = (chipBucket && BUCKET_COLORS[chipBucket]) || BUCKET_COLORS.DEFAULT;
  return (
    <button key={chip.intent}
      onClick={() => { setActiveIntent(chip.intent); setHasManualIntentPick(true); ... }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 999,
        border: '1px solid var(--chip-border)', background: '#fff',
        fontFamily: 'inherit', fontSize: 13, color: 'var(--text-primary)',
        cursor: 'pointer',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: chipColor }} />
      {chip.label}
    </button>
  );
})}
```

Dot color matches the chip's intent bucket — not uniform green like the
previous design.

---

## Hero (above the composer)

```jsx
<div style={{ paddingTop: '10vh', paddingBottom: 0 }}>
  <div style={{ maxWidth: 820, width: '100%', margin: '0 auto' }}>
    <div style={{ textAlign: 'center' }}>
      {/* Greeting row — fingerprint mark inline left-aligned with the
         Fraunces greeting text. No standalone hero glyph. */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
        <img src="/yourai-mark.svg" alt="" aria-hidden="true"
          style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }}
        />
        <h2 style={{
          fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 44,
          color: 'var(--text-primary)', margin: 0, lineHeight: 1.1, letterSpacing: '-1.2px',
        }}>
          {getGreeting()}, {currentUserName}
        </h2>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14.5, margin: '12px 0 28px', lineHeight: 1.5 }}>
        Your AI assistant is ready — ask anything about your documents or Alaska law.
      </p>
    </div>
  </div>
</div>
```

The brand mark uses CSS rendering (direct `<img>`) — see CLAUDE.md
gotcha #44 for why we don't use `mask-image` on the multi-tonal SVG.

---

## Page background

Empty state:
```js
background: showEmptyState ? '#fff' : 'var(--cream)'
```

White when empty, `var(--cream)` once a thread starts. Don't reintroduce
the `#fbf8ef` warm tone under the empty-state surface — it was retired
2026-05-26 per client.

---

## When to deviate from this pattern

You generally shouldn't. The three composers (empty / populated / workspace)
are deliberately identical now — if you find yourself adding a 4th chat
input surface, mirror the same shape. If you need a different chrome for
some reason (e.g. a mini composer in a popover), reuse the bucket-color
system + the 1.5px `#b8bcc4` border treatment at minimum so it reads as
part of the same family.

For non-composer surfaces (settings, file pickers, etc.), use the
existing button + pill conventions — don't invent new chrome.
