import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, X, Check, ChevronDown, ChevronRight, FileText, File,
  Image as ImageIcon, Mail, Download, Folder, Tag, Calendar, User,
  Sparkles, Eye, ExternalLink, Sliders, MoreHorizontal, Trash2,
  Upload, FilePlus, Inbox, Workflow, Package, FolderInput, MessageSquare,
} from 'lucide-react';

/* ─── Type / status / scope metadata ─────────────────────────────── */

const TYPE_META = {
  pdf:   { label: 'PDF',  icon: File,     fg: '#B42318', bg: '#FDECEA' },
  docx:  { label: 'DOC',  icon: FileText, fg: '#1D4ED8', bg: '#EAF0FE' },
  xlsx:  { label: 'XLS',  icon: FileText, fg: '#1B7A4B', bg: '#E8F4EC' },
  image: { label: 'IMG',  icon: ImageIcon,fg: '#7A4DB8', bg: '#F1EBFA' },
  email: { label: 'EML',  icon: Mail,     fg: '#B7791F', bg: '#FBF1DF' },
  other: { label: 'FILE', icon: File,     fg: '#64748B', bg: '#F1F5F9' },
};

const STATUS_META = {
  Privileged:   { dot: '#C0392B', fg: '#9A2A1E', bg: '#FBEBE9' },
  Confidential: { dot: '#2563EB', fg: '#1E40AF', bg: '#EAF0FE' },
  Final:        { dot: '#1B7A4B', fg: '#15673F', bg: '#E8F4EC' },
  Draft:        { dot: '#C9A84C', fg: '#8A6D1F', bg: '#FBF3E0' },
};

const MATTER_DOT = {
  'Meridian v. Apex': '#7A4DB8',
  'Harper Trust':     '#1B7A4B',
  'Acme Corp':        '#C9A84C',
  'Series B Funding': '#2563EB',
  'Unassigned':       '#9AA5B1',
};
const matterDot = (m) => MATTER_DOT[m] || '#9AA5B1';

/* Heuristic derivations from the existing VaultDoc shape */

function typeOf(fileName = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'doc' || ext === 'docx') return 'docx';
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'xlsx';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (ext === 'eml' || ext === 'msg') return 'email';
  return 'other';
}

function statusOf(d, folderName) {
  const fn = (folderName || '').toLowerCase();
  if (fn.includes('pleading') || fn.includes('correspondence') || fn.includes('work product')) return 'Privileged';
  if (d.isGlobal) return 'Final';
  if (d.addedFromChat) return 'Draft';
  if (fn.includes('discovery') || fn.includes('cap table') || fn.includes('financ')) return 'Confidential';
  return 'Confidential';
}

function matterOf(folderName) {
  if (!folderName) return 'Unassigned';
  const fn = folderName.toLowerCase();
  if (fn.includes('meridian') || fn.includes('apex')) return 'Meridian v. Apex';
  if (fn.includes('harper')) return 'Harper Trust';
  if (fn.includes('series') || fn.includes('financ') || fn.includes('cap table')) return 'Series B Funding';
  if (fn.includes('acme') || fn.includes('contract') || fn.includes('pleading') || fn.includes('discovery') || fn.includes('correspondence') || fn.includes('work product')) return 'Acme Corp';
  return 'Unassigned';
}

function tagsOf(d, folderName) {
  const tags = [];
  if (folderName) tags.push(folderName);
  if (d.addedFromChat) tags.push('from chat');
  return tags;
}

function relTime(dateStr) {
  const t = Date.parse(dateStr);
  if (!t) return dateStr || '—';
  const diff = Date.now() - t;
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / day);
  if (days < 1) {
    const hrs = Math.floor(diff / (60 * 60 * 1000));
    if (hrs < 1) return 'just now';
    return `${hrs}h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function parseSizeMb(s) {
  if (!s) return 0;
  const m = String(s).match(/([\d.]+)\s*(KB|MB|GB)?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = (m[2] || 'MB').toUpperCase();
  return unit === 'KB' ? n / 1024 : unit === 'GB' ? n * 1024 : n;
}

/* ─── Atoms ─────────────────────────────────────────────────────── */

function TypeBadge({ type, size = 34 }) {
  const t = TYPE_META[type] || TYPE_META.other;
  return (
    <span
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', width: size, height: size, borderRadius: 6,
        background: t.bg, position: 'relative', flexShrink: 0,
      }}
    >
      <span style={{
        fontSize: size * 0.26, fontWeight: 800, color: t.fg,
        fontFamily: "'IBM Plex Mono', ui-monospace, Menlo, monospace",
        letterSpacing: '0.04em', lineHeight: 1,
      }}>{t.label}</span>
    </span>
  );
}

function StatusChip({ status }) {
  const s = STATUS_META[status]; if (!s) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px',
      borderRadius: 999, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
      background: s.bg, color: s.fg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {status}
    </span>
  );
}

function TagChip({ tag }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 999, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
      background: '#F0F3F6', color: '#4A5663',
    }}>{tag}</span>
  );
}

function Checkbox({ checked, indeterminate, onClick, size = 17 }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: 5, padding: 0, cursor: 'pointer',
        border: '1.5px solid ' + ((checked || indeterminate) ? '#0A2463' : '#C7CFD8'),
        background: (checked || indeterminate) ? '#0A2463' : '#fff', flexShrink: 0,
      }}
      aria-label={checked ? 'Deselect' : 'Select'}
    >
      {checked && <Check size={11} strokeWidth={3} style={{ color: '#fff' }} />}
      {indeterminate && !checked && <span style={{ width: 8, height: 2, background: '#fff', borderRadius: 1 }} />}
    </button>
  );
}

/* ─── Filter dropdown ───────────────────────────────────────────── */

function Popover({ open, onClose, width = 220, align = 'left', children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 6px)', [align]: 0, zIndex: 40,
      width, padding: '6px 0', borderRadius: 12, background: '#fff',
      border: '1px solid #E7ECF1', boxShadow: '0 12px 32px -8px rgba(10,36,99,0.18)',
    }}>{children}</div>
  );
}

function CheckRow({ checked, onClick, children, dot }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 36,
      padding: '0 12px', border: 'none', background: 'transparent', cursor: 'pointer',
      fontSize: 13.5, color: '#3A4654', textAlign: 'left', fontFamily: 'inherit',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F4ED'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: '1.5px solid ' + (checked ? '#0A2463' : '#C7CFD8'),
        background: checked ? '#0A2463' : '#fff',
      }}>
        {checked && <Check size={11} strokeWidth={3} style={{ color: '#fff' }} />}
      </span>
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
    </button>
  );
}

function FilterPill({ icon: Icon, label, valueLabel, dots, openId, id, setOpenId, width, children }) {
  const open = openId === id;
  const active = valueLabel != null;
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpenId(open ? null : id)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px',
        borderRadius: 8, fontSize: 13, whiteSpace: 'nowrap', cursor: 'pointer',
        fontFamily: 'inherit',
        border: '1px solid ' + (active ? '#C9A84C' : '#E7ECF1'),
        background: active ? '#FBF6EA' : '#fff',
        color: active ? '#0A2463' : '#4A5663',
        fontWeight: active ? 500 : 400,
      }}>
        {active && dots && dots.length
          ? <span style={{ display: 'inline-flex', gap: 3 }}>
              {dots.slice(0, 3).map((c, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />)}
            </span>
          : Icon && <Icon size={14} style={{ color: active ? '#0A2463' : '#9AA5B1' }} />
        }
        <span style={{ color: '#6B7885' }}>{label}{valueLabel ? ':' : ''}</span>
        {valueLabel && <span style={{ fontWeight: 600, color: '#0A2463' }}>{valueLabel}</span>}
        <ChevronDown size={13} style={{ color: '#9AA5B1' }} />
      </button>
      <Popover open={open} onClose={() => setOpenId(null)} width={width}>{children}</Popover>
    </div>
  );
}

function summarize(arr, map) {
  if (!arr.length) return null;
  if (arr.length === 1) return map ? map(arr[0]) : arr[0];
  return `${map ? map(arr[0]) : arr[0]} +${arr.length - 1}`;
}

const DATE_OPTS = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

function withinDate(createdAt, range) {
  if (range === 'any') return true;
  const t = Date.parse(createdAt);
  if (!t) return false;
  const day = 24 * 60 * 60 * 1000;
  const diff = Date.now() - t;
  if (range === 'today') return diff < day;
  if (range === '7d') return diff <= 7 * day;
  if (range === '30d') return diff <= 30 * day;
  if (range === '90d') return diff <= 90 * day;
  return true;
}

/* ─── Row + Grid card ──────────────────────────────────────────── */

function FileRow({ file, selected, isPreview, expanded, query, onSelect, onPreview, onExpand, onUse, onMore }) {
  const insideMatch = query && !file.name.toLowerCase().includes(query.toLowerCase());
  const [hovered, setHovered] = useState(false);
  const rowBg = isPreview ? '#FBF6EA' : selected ? '#FCF9F2' : hovered ? '#FAFBFC' : 'transparent';
  return (
    <div
      onClick={() => onPreview(file.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', cursor: 'pointer', transition: 'background 100ms',
        background: rowBg, boxShadow: isPreview ? 'inset 3px 0 0 #C9A84C' : 'none',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderBottom: '1px solid #F2F5F8', minHeight: 58,
      }}>
        <button onClick={(e) => { e.stopPropagation(); onExpand(file.id); }} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, borderRadius: 4, border: 'none', background: 'transparent',
          color: '#B6BFC9', cursor: 'pointer', flexShrink: 0,
        }}>
          <ChevronRight size={14} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
        </button>
        <Checkbox checked={selected} onClick={() => onSelect(file.id)} />
        <TypeBadge type={file.type} />
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 14, fontWeight: 500, color: '#16223A',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{file.name}</span>
            {file.fromChat && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 6px',
                borderRadius: 4, fontSize: 10.5, fontWeight: 500, background: '#EEF1F8',
                color: '#0A2463', flexShrink: 0,
              }}>
                <MessageSquare size={10} /> from chat
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, fontSize: 12, color: '#9AA5B1' }}>
            <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{file.sizeLabel}</span>
            {file.metaLabel && <><span style={{ color: '#D5DCE3' }}>·</span><span>{file.metaLabel}</span></>}
            {insideMatch && (
              <>
                <span style={{ color: '#D5DCE3' }}>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500, color: '#8A6D1F' }}>
                  <Search size={11} /> match inside
                </span>
              </>
            )}
          </div>
        </div>
        <div style={{ width: 150, flexShrink: 0, fontSize: 12.5, color: '#4A5663', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: matterDot(file.matter), flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.matter}</span>
        </div>
        <div style={{ width: 150, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          {file.tags.slice(0, 1).map((t) => <TagChip key={t} tag={t} />)}
          {file.tags.length > 1 && <span style={{ fontSize: 11, color: '#9AA5B1', fontWeight: 500 }}>+{file.tags.length - 1}</span>}
        </div>
        <div style={{ width: 120, flexShrink: 0 }}>
          <StatusChip status={file.status} />
        </div>
        <div style={{ width: 80, flexShrink: 0, fontSize: 12, color: '#6B7885' }}>{file.modified}</div>
        {hovered && (
          <div style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 30,
            background: `linear-gradient(90deg, transparent, ${rowBg} 28%)`,
          }} onClick={(e) => e.stopPropagation()}>
            <QuickAction icon={Eye} title="Preview" onClick={() => onPreview(file.id)} />
            <QuickAction icon={MessageSquare} title="Add to chat" primary onClick={() => onUse(file)} />
            <QuickAction icon={MoreHorizontal} title="More" onClick={() => onMore(file)} />
          </div>
        )}
      </div>
      {expanded && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '14px 36px',
          padding: '14px 16px 16px 136px', background: '#FAFBFC',
          borderBottom: '1px solid #F2F5F8',
        }}>
          <Meta label="Created"    value={file.created || '—'} />
          <Meta label="Full path"  value={`YourVault / ${file.path}`} mono />
          <Meta label="Uploaded by" value={file.byLabel} />
          <Meta label="Description" value={file.description || '—'} />
        </div>
      )}
    </div>
  );
}

function Meta({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9AA5B1', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: '#3A4654', fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit' }}>{value}</div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, onClick, primary }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick && onClick(); }} title={title} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
      color: primary ? '#0A2463' : '#6B7885', background: 'transparent',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = primary ? '#EEF1F8' : '#F0F3F6'; e.currentTarget.style.color = '#0A2463'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = primary ? '#0A2463' : '#6B7885'; }}
    >
      <Icon size={16} />
    </button>
  );
}

function GridCard({ file, selected, isPreview, onSelect, onPreview, onUse }) {
  const t = TYPE_META[file.type] || TYPE_META.other;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onPreview(file.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: 12, background: '#fff', cursor: 'pointer',
        border: '1px solid ' + (isPreview || selected ? '#C9A84C' : '#ECEFF3'),
        boxShadow: isPreview ? '0 8px 24px -10px rgba(10,36,99,0.18)' : '0 1px 2px rgba(10,36,99,0.04)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'all 150ms',
      }}
    >
      <div style={{
        position: 'relative', height: 130, display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: t.bg,
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.5,
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0 10px, transparent 10px 20px)',
        }} />
        <TypeBadge type={file.type} size={52} />
        <div style={{ position: 'absolute', top: 10, left: 10, opacity: selected || isPreview || hovered ? 1 : 0, transition: 'opacity 150ms' }} onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onClick={() => onSelect(file.id)} />
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <StatusChip status={file.status} />
        </div>
      </div>
      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontSize: 13.5, fontWeight: 500, color: '#16223A', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', minHeight: 36,
        }}>{file.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: matterDot(file.matter), flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, color: '#6B7885', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.matter}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11.5, color: '#9AA5B1' }}>
          <span>{file.sizeLabel}</span>
          <span style={{ color: '#D5DCE3' }}>·</span>
          <span>{file.modified}</span>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F2F5F8', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={(e) => { e.stopPropagation(); onUse(file); }} style={{
            flex: 1, height: 32, borderRadius: 8, border: 'none', background: '#0A2463',
            color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: 'inherit',
          }}>
            <MessageSquare size={13} /> Use in chat
          </button>
          <QuickAction icon={Eye} title="Preview" onClick={() => onPreview(file.id)} />
        </div>
      </div>
    </div>
  );
}

/* ─── Preview drawer ───────────────────────────────────────────── */

function PreviewDrawer({ file, onClose, onUse, onEdit, onDelete, canEdit, isActive }) {
  if (!file) return null;
  const t = TYPE_META[file.type] || TYPE_META.other;
  return (
    <div style={{
      width: 372, flexShrink: 0, height: '100%', borderLeft: '1px solid #ECEFF3',
      background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, padding: '0 18px', borderBottom: '1px solid #F0F3F6', flexShrink: 0,
      }}>
        <span style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
          color: '#9AA5B1', textTransform: 'uppercase',
          fontFamily: 'ui-monospace, Menlo, monospace',
        }}>Preview</span>
        <button onClick={onClose} style={{
          width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent',
          color: '#9AA5B1', cursor: 'pointer', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F3F6'; e.currentTarget.style.color = '#0A2463'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9AA5B1'; }}
        ><X size={17} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '18px 18px 0' }}>
          <div style={{
            position: 'relative', height: 170, borderRadius: 12, background: t.bg,
            border: '1px solid #ECEFF3', display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.5,
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0 12px, transparent 12px 24px)',
            }} />
            <TypeBadge type={file.type} size={64} />
          </div>
        </div>
        <div style={{ padding: '14px 18px 0' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#16223A', lineHeight: 1.35 }}>{file.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <StatusChip status={file.status} />
            {file.tags.map((t2) => <TagChip key={t2} tag={t2} />)}
          </div>
        </div>
        <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => onUse(file)} style={{
            flex: 1, height: 40, borderRadius: 10, border: 'none',
            background: isActive ? '#5CA868' : '#0A2463', color: '#fff', fontSize: 13.5,
            fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit',
          }}>
            <MessageSquare size={15} /> {isActive ? 'In chat' : 'Add to chat'}
          </button>
          {file.sampleUrl && (
            <button onClick={() => window.open(file.sampleUrl, '_blank')} title="Open preview" style={{
              width: 40, height: 40, borderRadius: 10, border: '1px solid #E7ECF1',
              background: '#fff', color: '#0A2463', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><ExternalLink size={17} /></button>
          )}
        </div>
        <div style={{ padding: '18px 18px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#9AA5B1', marginBottom: 4, fontFamily: 'ui-monospace, Menlo, monospace', textTransform: 'uppercase' }}>Details</div>
          <DrawerMeta label="Matter">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: matterDot(file.matter) }} />
              {file.matter}
            </span>
          </DrawerMeta>
          <DrawerMeta label="Location" value={`YourVault / ${file.path}`} />
          <DrawerMeta label="Type" value={`${(TYPE_META[file.type] || TYPE_META.other).label} · ${file.sizeLabel}`} />
          <DrawerMeta label="Uploaded by" value={file.byLabel} />
          <DrawerMeta label="Created" value={file.created || '—'} />
          <DrawerMeta label="Modified" value={file.modifiedFull || '—'} />
          {file.description && <DrawerMeta label="Description" value={file.description} />}
          <DrawerMeta label="Access" value={file.scope} />
        </div>
        {canEdit && (
          <div style={{ padding: '18px 18px 24px', display: 'flex', gap: 8 }}>
            <button onClick={() => onEdit(file)} style={{
              flex: 1, height: 34, borderRadius: 8, border: '1px solid #E7ECF1',
              background: '#fff', color: '#0A2463', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Edit</button>
            <button onClick={() => onDelete(file)} style={{
              height: 34, borderRadius: 8, border: '1px solid #E7ECF1',
              background: '#fff', color: '#C0392B', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer', padding: '0 14px', display: 'inline-flex',
              alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DrawerMeta({ label, value, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #F2F5F8' }}>
      <div style={{ width: 92, flexShrink: 0, fontSize: 12, fontWeight: 500, color: '#9AA5B1', paddingTop: 1 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, color: '#3A4654' }}>{children || value}</div>
    </div>
  );
}

/* ─── Bulk action bar ──────────────────────────────────────────── */

function BulkBar({ count, onClear, onAction }) {
  if (!count) return null;
  const actions = [
    { k: 'download', icon: Download,    label: 'Download' },
    { k: 'move',     icon: FolderInput, label: 'Move' },
    { k: 'tag',      icon: Tag,         label: 'Tag' },
    { k: 'pack',     icon: Package,     label: 'Add to Knowledge Pack' },
  ];
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 24, transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 16, paddingRight: 8,
      height: 56, borderRadius: 16, background: '#0A2463', color: '#fff', zIndex: 60,
      boxShadow: '0 18px 40px -12px rgba(10,36,99,0.55)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 12, marginRight: 4, borderRight: '1px solid rgba(255,255,255,0.18)' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 24, height: 24, padding: '0 6px', borderRadius: 999,
          background: '#C9A84C', color: '#0A2463', fontSize: 12.5, fontWeight: 700,
          fontFamily: 'ui-monospace, Menlo, monospace',
        }}>{count}</span>
        <span style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' }}>selected</span>
      </div>
      {actions.map((a) => (
        <button key={a.k} onClick={() => onAction(a.k)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, height: 36,
          padding: '0 12px', borderRadius: 8, border: 'none', background: 'transparent',
          color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          whiteSpace: 'nowrap', fontFamily: 'inherit',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <a.icon size={15} /> {a.label}
        </button>
      ))}
      <button onClick={() => onAction('delete')} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, height: 36,
        padding: '0 12px', borderRadius: 8, border: 'none', background: 'transparent',
        color: '#FF9B8E', fontSize: 13, fontWeight: 500, cursor: 'pointer',
        whiteSpace: 'nowrap', fontFamily: 'inherit',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(192,57,43,0.25)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Trash2 size={15} /> Delete
      </button>
      <button onClick={onClear} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent',
        color: 'rgba(255,255,255,0.6)', cursor: 'pointer', marginLeft: 4,
      }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
      ><X size={17} /></button>
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: 16, transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 16,
      height: 42, borderRadius: 12, background: '#fff', fontSize: 13.5, color: '#16223A',
      border: '1px solid #E7ECF1', boxShadow: '0 12px 30px -10px rgba(10,36,99,0.25)', zIndex: 70,
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: '50%', background: '#E8F4EC',
      }}>
        <Check size={13} strokeWidth={3} style={{ color: '#15673F' }} />
      </span>
      {msg}
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────── */

export default function VaultFilesPanel({
  docs, folders, isOrgAdmin, currentUserId, activeDocument,
  onSelect, onEdit, onDelete, onToggleGlobal, onCreateNew,
  onUploadFolder, onConnectorImport, importSources = [],
  scope, setScope, counts,
  search, setSearch,
}) {
  const [view, setView] = useState('list');
  const [filters, setFilters] = useState({
    status: [], type: [], matter: [], tags: [], updatedBy: [], date: 'any',
  });
  const [openFilterId, setOpenFilterId] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedSet, setSelectedSet] = useState(new Set());
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const folderUploadRef = useRef(null);

  const flash = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  /* Enrich docs with derived fields */
  const folderById = useMemo(() => {
    const m = new Map(); folders.forEach((f) => m.set(f.id, f)); return m;
  }, [folders]);

  const enriched = useMemo(() => docs.map((d) => {
    const folder = d.folderId ? folderById.get(d.folderId) : null;
    const folderName = folder?.name || null;
    const matter = matterOf(folderName);
    const status = statusOf(d, folderName);
    const type = typeOf(d.fileName);
    const tags = tagsOf(d, folderName);
    const ownerLabel = d.ownerId === currentUserId ? 'You' : (d.ownerName || 'Member');
    return {
      ...d,
      type, status, matter, tags,
      modified: relTime(d.createdAt),
      modifiedFull: d.createdAt || '—',
      created: d.createdAt || '—',
      sizeLabel: d.fileSize || '—',
      metaLabel: '',
      byLabel: ownerLabel,
      fromChat: !!d.addedFromChat,
      scope: d.isGlobal ? 'Org-wide' : (d.ownerId === currentUserId ? 'Mine' : 'Member'),
      path: folderName ? `${matter} / ${folderName}` : matter,
    };
  }), [docs, folderById, currentUserId]);

  /* Filter universes */
  const allTags = useMemo(() => Array.from(new Set(enriched.flatMap((d) => d.tags))).sort(), [enriched]);
  const allMatters = useMemo(() => Array.from(new Set(enriched.map((d) => d.matter))).sort(), [enriched]);
  const allOwners = useMemo(() => {
    const map = new Map();
    enriched.forEach((d) => {
      if (!d.ownerId) return;
      if (!map.has(d.ownerId)) map.set(d.ownerId, { id: d.ownerId, name: d.ownerName || d.byLabel });
    });
    return Array.from(map.values());
  }, [enriched]);

  /* Apply search + filters */
  const q = (search || '').trim().toLowerCase();
  const results = useMemo(() => {
    let out = enriched.filter((d) => {
      if (filters.status.length && !filters.status.includes(d.status)) return false;
      if (filters.type.length && !filters.type.includes(d.type)) return false;
      if (filters.matter.length && !filters.matter.includes(d.matter)) return false;
      if (filters.tags.length && !d.tags.some((t) => filters.tags.includes(t))) return false;
      if (filters.updatedBy.length && !filters.updatedBy.includes(d.ownerId)) return false;
      if (!withinDate(d.createdAt, filters.date)) return false;
      if (q) {
        const inName = d.name.toLowerCase().includes(q);
        const inDesc = (d.description || '').toLowerCase().includes(q);
        const inFile = (d.fileName || '').toLowerCase().includes(q);
        if (!inName && !inDesc && !inFile) return false;
      }
      return true;
    });
    out.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
    return out;
  }, [enriched, filters, q]);

  const filtersActive = filters.status.length || filters.type.length || filters.matter.length
    || filters.tags.length || filters.updatedBy.length || filters.date !== 'any';
  const clearAll = () => {
    setFilters({ status: [], type: [], matter: [], tags: [], updatedBy: [], date: 'any' });
    setSearch && setSearch('');
  };

  const toggle = (group, value) => setFilters((f) => {
    const arr = f[group];
    return { ...f, [group]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
  });
  const setDate = (v) => setFilters((f) => ({ ...f, date: v }));

  /* Selection */
  const resultIds = results.map((d) => d.id);
  const selectedInView = resultIds.filter((id) => selectedSet.has(id));
  const allChecked = results.length > 0 && selectedInView.length === results.length;
  const someChecked = selectedInView.length > 0 && !allChecked;
  const onSelectOne = (id) => setSelectedSet((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => setSelectedSet((s) => {
    const n = new Set(s);
    if (allChecked) resultIds.forEach((id) => n.delete(id));
    else resultIds.forEach((id) => n.add(id));
    return n;
  });

  const onPreview = (id) => setPreviewId((p) => (p === id ? null : id));
  const onExpand = (id) => setExpandedRow((e) => (e === id ? null : id));

  const onUse = (file) => {
    onSelect && onSelect(file);
    flash(<span><strong>{file.name}</strong> added to chat context</span>);
  };

  const onBulk = (action) => {
    const n = selectedInView.length;
    if (action === 'delete') {
      selectedInView.forEach((id) => onDelete && onDelete(id));
      setSelectedSet(new Set());
      flash(<span><strong>{n}</strong> document{n > 1 ? 's' : ''} deleted</span>);
      return;
    }
    if (action === 'download') {
      flash(<span>Downloading <strong>{n}</strong> document{n > 1 ? 's' : ''}…</span>);
      return;
    }
    if (action === 'pack') {
      flash(<span>Added <strong>{n}</strong> document{n > 1 ? 's' : ''} to Knowledge Pack</span>);
      return;
    }
    flash(<span>{action === 'move' ? 'Move' : 'Tag'} <strong>{n}</strong> document{n > 1 ? 's' : ''}…</span>);
  };

  const previewFile = previewId ? enriched.find((d) => d.id === previewId) : null;
  const previewIsActive = previewFile && activeDocument && activeDocument.id === previewFile.id;
  const canEditPreview = previewFile && (isOrgAdmin || previewFile.ownerId === currentUserId || !previewFile.ownerId);

  const vaultEmpty = enriched.length === 0;
  const showZero = !vaultEmpty && results.length === 0;

  const insideCount = q
    ? results.filter((d) => !d.name.toLowerCase().includes(q) && ((d.description || '').toLowerCase().includes(q) || (d.fileName || '').toLowerCase().includes(q))).length
    : 0;

  /* ── Render ── */
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Toast msg={toast} />
        <input
          ref={folderUploadRef} type="file" multiple
          webkitdirectory="" directory="" style={{ display: 'none' }}
          onChange={(e) => { if (onUploadFolder && e.target.files) onUploadFolder(Array.from(e.target.files), null); e.target.value = ''; }}
        />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Scope tabs (org admin) */}
          {isOrgAdmin && (
            <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 32px 0', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ display: 'inline-flex', padding: 2, borderRadius: 12, background: '#F0F3F6' }}>
                {[
                  { id: 'all',  label: 'All',      count: counts.total },
                  { id: 'org',  label: 'Org-wide', count: counts.org },
                  { id: 'mine', label: 'Mine',     count: counts.mine },
                ].map((t) => (
                  <button key={t.id} onClick={() => setScope(t.id)} style={{
                    height: 32, padding: '0 14px', borderRadius: 10, border: 'none',
                    background: scope === t.id ? '#fff' : 'transparent',
                    color: scope === t.id ? '#0A2463' : '#6B7885',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    boxShadow: scope === t.id ? '0 1px 2px rgba(10,36,99,0.1)' : 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                  }}>
                    {t.label}
                    <span style={{ fontSize: 11.5, color: scope === t.id ? '#C9A84C' : '#9AA5B1', fontWeight: 600, fontFamily: 'ui-monospace, Menlo, monospace' }}>{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hero */}
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 32px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ maxWidth: 480 }}>
                <h1 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 34, fontWeight: 500, color: '#0A2463', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                  Ask across your documents
                </h1>
                <p style={{ margin: '10px 0 0', fontSize: 13.5, color: '#6B7885', lineHeight: 1.55 }}>
                  Your firm's library of pleadings, contracts, discovery and client files — searchable, filterable, and ready to ground any chat or workflow.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {importSources.map((src) => (
                  <button key={src.id} onClick={() => onConnectorImport && onConnectorImport(src)} style={{
                    height: 40, padding: '0 14px', borderRadius: 12, border: '1px solid #E7ECF1',
                    background: '#fff', color: '#3A4654', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                  }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: src.color, display: 'inline-block' }} />
                    {src.name}
                  </button>
                ))}
                <button onClick={() => folderUploadRef.current?.click()} style={{
                  height: 40, padding: '0 14px', borderRadius: 12, border: '1px solid #E7ECF1',
                  background: '#fff', color: '#3A4654', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                }}>
                  <Upload size={15} style={{ color: '#6B7885' }} /> Upload
                </button>
                <button onClick={onCreateNew} style={{
                  height: 40, padding: '0 16px', borderRadius: 12, border: 'none',
                  background: '#0A2463', color: '#fff', fontSize: 13.5, fontWeight: 600,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                }}>
                  <FilePlus size={15} /> New Document
                </button>
              </div>
            </div>

            {/* Search */}
            <div style={{ marginTop: 24, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}>
                <Search size={20} style={{ color: '#9AA5B1' }} />
              </span>
              <input
                value={search || ''}
                onChange={(e) => setSearch && setSearch(e.target.value)}
                placeholder="Search filenames or inside documents…"
                style={{
                  width: '100%', height: 52, padding: '0 96px 0 48px', borderRadius: 16,
                  border: '1px solid #E7ECF1', fontSize: 15, color: '#16223A',
                  outline: 'none', fontFamily: 'inherit', background: '#fff',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.boxShadow = '0 0 0 4px rgba(10,36,99,0.07)'; }}
                onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
              />
              {search ? (
                <button onClick={() => setSearch && setSearch('')} style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent',
                  color: '#9AA5B1', cursor: 'pointer', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                }}><X size={16} /></button>
              ) : (
                <span style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  padding: '4px 8px', borderRadius: 6, border: '1px solid #ECEFF3',
                  fontSize: 12, fontWeight: 500, color: '#9AA5B1',
                  fontFamily: 'ui-monospace, Menlo, monospace',
                }}>⌘K</span>
              )}
            </div>
            {q && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '0 4px', fontSize: 13 }}>
                <span style={{ color: '#6B7885' }}><strong style={{ color: '#16223A' }}>{results.length}</strong> result{results.length !== 1 ? 's' : ''}</span>
                {insideCount > 0 && (
                  <>
                    <span style={{ color: '#D5DCE3' }}>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500, color: '#8A6D1F' }}>
                      <FileText size={13} /> matches inside {insideCount} document{insideCount > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Filters */}
            <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, paddingRight: 4, fontSize: 12, fontWeight: 600, color: '#9AA5B1', letterSpacing: '0.08em', fontFamily: 'ui-monospace, Menlo, monospace' }}>
                <Sliders size={14} /> FILTERS
              </span>
              <FilterPill label="Category" id="status" openId={openFilterId} setOpenId={setOpenFilterId} width={200}
                dots={filters.status.map((s) => STATUS_META[s].dot)}
                valueLabel={summarize(filters.status)}>
                {Object.keys(STATUS_META).map((s) => (
                  <CheckRow key={s} checked={filters.status.includes(s)} onClick={() => toggle('status', s)} dot={STATUS_META[s].dot}>{s}</CheckRow>
                ))}
              </FilterPill>
              <FilterPill icon={File} label="Type" id="type" openId={openFilterId} setOpenId={setOpenFilterId} width={200}
                valueLabel={summarize(filters.type, (k) => TYPE_META[k].label)}>
                {Object.keys(TYPE_META).filter(k => k !== 'other').map((k) => (
                  <CheckRow key={k} checked={filters.type.includes(k)} onClick={() => toggle('type', k)}>{TYPE_META[k].label} · {k.toUpperCase()}</CheckRow>
                ))}
              </FilterPill>
              <FilterPill icon={Folder} label="Matter" id="matter" openId={openFilterId} setOpenId={setOpenFilterId} width={240}
                valueLabel={summarize(filters.matter)}>
                {allMatters.map((m) => (
                  <CheckRow key={m} checked={filters.matter.includes(m)} onClick={() => toggle('matter', m)} dot={matterDot(m)}>{m}</CheckRow>
                ))}
              </FilterPill>
              <FilterPill icon={Tag} label="Tags" id="tags" openId={openFilterId} setOpenId={setOpenFilterId} width={240}
                valueLabel={summarize(filters.tags)}>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {allTags.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: 13, color: '#9AA5B1' }}>No tags yet.</div>
                  ) : allTags.map((t) => (
                    <CheckRow key={t} checked={filters.tags.includes(t)} onClick={() => toggle('tags', t)}>{t}</CheckRow>
                  ))}
                </div>
              </FilterPill>
              <FilterPill icon={Calendar} label="Date" id="date" openId={openFilterId} setOpenId={setOpenFilterId} width={190}
                valueLabel={filters.date !== 'any' ? DATE_OPTS.find((d) => d.value === filters.date).label : null}>
                {DATE_OPTS.map((d) => (
                  <button key={d.value} onClick={() => { setDate(d.value); setOpenFilterId(null); }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 36,
                    padding: '0 12px', border: 'none', background: 'transparent', cursor: 'pointer',
                    fontSize: 13.5, color: '#3A4654', textAlign: 'left', fontFamily: 'inherit',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F4ED'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
                      border: '1.5px solid ' + (filters.date === d.value ? '#0A2463' : '#C7CFD8'),
                    }}>
                      {filters.date === d.value && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0A2463' }} />}
                    </span>
                    {d.label}
                  </button>
                ))}
              </FilterPill>
              <FilterPill icon={User} label="Updated by" id="by" openId={openFilterId} setOpenId={setOpenFilterId} width={210}
                valueLabel={summarize(filters.updatedBy, (k) => (allOwners.find((o) => o.id === k)?.name || k).split(' ')[0])}>
                {allOwners.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: '#9AA5B1' }}>No uploaders yet.</div>
                ) : allOwners.map((o) => (
                  <CheckRow key={o.id} checked={filters.updatedBy.includes(o.id)} onClick={() => toggle('updatedBy', o.id)}>{o.name}</CheckRow>
                ))}
              </FilterPill>
            </div>

            {filtersActive && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#9AA5B1', fontWeight: 500 }}>Active</span>
                {[
                  ...filters.status.map((s) => ({ k: 's:' + s, label: s, rm: () => toggle('status', s) })),
                  ...filters.type.map((t) => ({ k: 't:' + t, label: TYPE_META[t].label, rm: () => toggle('type', t) })),
                  ...filters.matter.map((m) => ({ k: 'm:' + m, label: m, rm: () => toggle('matter', m) })),
                  ...filters.tags.map((t) => ({ k: 'g:' + t, label: t, rm: () => toggle('tags', t) })),
                  ...filters.updatedBy.map((p) => ({ k: 'u:' + p, label: 'by ' + ((allOwners.find((o) => o.id === p)?.name || p).split(' ')[0]), rm: () => toggle('updatedBy', p) })),
                  ...(filters.date !== 'any' ? [{ k: 'd', label: DATE_OPTS.find((d) => d.value === filters.date).label, rm: () => setDate('any') }] : []),
                ].map((c) => (
                  <span key={c.k} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, paddingLeft: 10, paddingRight: 6,
                    borderRadius: 999, background: '#F8F4ED', border: '1px solid #ECE0C9',
                    fontSize: 12.5, fontWeight: 500, color: '#0A2463',
                  }}>
                    {c.label}
                    <button onClick={c.rm} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 16, height: 16, borderRadius: '50%', border: 'none',
                      background: 'transparent', cursor: 'pointer', color: '#8A6D1F',
                    }}><X size={11} strokeWidth={2.5} /></button>
                  </span>
                ))}
                <button onClick={clearAll} style={{
                  background: 'none', border: 'none', padding: 0, marginLeft: 4,
                  fontSize: 12.5, fontWeight: 500, color: '#6B7885', cursor: 'pointer',
                  textDecoration: 'underline', textUnderlineOffset: 2,
                }}>Clear all</button>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 32px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #ECEFF3' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#16223A', fontFamily: 'ui-monospace, Menlo, monospace' }}>{results.length}</span>
                <span style={{ fontSize: 14, color: '#6B7885' }}>document{results.length !== 1 ? 's' : ''}</span>
                {selectedInView.length > 0 && <span style={{ fontSize: 13, color: '#9AA5B1' }}>· {selectedInView.length} selected</span>}
              </div>
              <div style={{ display: 'inline-flex', padding: 2, borderRadius: 10, background: '#F0F3F6' }}>
                {[
                  { id: 'list', label: 'List' },
                  { id: 'grid', label: 'Grid' },
                ].map((v) => (
                  <button key={v.id} onClick={() => setView(v.id)} style={{
                    height: 32, padding: '0 12px', borderRadius: 8, border: 'none',
                    background: view === v.id ? '#fff' : 'transparent',
                    color: view === v.id ? '#0A2463' : '#6B7885',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    boxShadow: view === v.id ? '0 1px 2px rgba(10,36,99,0.1)' : 'none',
                    fontFamily: 'inherit',
                  }}>{v.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '4px 32px 100px' }}>
            {vaultEmpty ? (
              <EmptyVault onUpload={() => folderUploadRef.current?.click()} onCreateNew={onCreateNew} />
            ) : showZero ? (
              <EmptyResults query={search} onClear={clearAll} />
            ) : view === 'list' ? (
              <div>
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', height: 36, position: 'sticky', top: 0,
                  zIndex: 5, background: '#fff', borderBottom: '1px solid #ECEFF3',
                }}>
                  <span style={{ width: 20, flexShrink: 0 }} />
                  <Checkbox checked={allChecked} indeterminate={someChecked} onClick={toggleAll} />
                  <span style={{ width: 34, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#9AA5B1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Document</span>
                  <span style={{ width: 150, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#9AA5B1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Matter</span>
                  <span style={{ width: 150, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#9AA5B1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tags</span>
                  <span style={{ width: 120, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#9AA5B1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Category</span>
                  <span style={{ width: 80, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#9AA5B1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Modified</span>
                </div>
                {results.map((f) => (
                  <FileRow
                    key={f.id} file={f}
                    selected={selectedSet.has(f.id)}
                    isPreview={previewId === f.id}
                    expanded={expandedRow === f.id}
                    query={search}
                    onSelect={onSelectOne}
                    onPreview={onPreview}
                    onExpand={onExpand}
                    onUse={onUse}
                    onMore={onEdit}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16, paddingTop: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))' }}>
                {results.map((f) => (
                  <GridCard
                    key={f.id} file={f}
                    selected={selectedSet.has(f.id)}
                    isPreview={previewId === f.id}
                    onSelect={onSelectOne}
                    onPreview={onPreview}
                    onUse={onUse}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <BulkBar count={selectedInView.length} onClear={() => setSelectedSet(new Set())} onAction={onBulk} />
      </div>

      {previewFile && (
        <PreviewDrawer
          file={previewFile}
          isActive={previewIsActive}
          canEdit={canEditPreview}
          onClose={() => setPreviewId(null)}
          onUse={onUse}
          onEdit={(f) => { setPreviewId(null); onEdit && onEdit(f); }}
          onDelete={(f) => { setPreviewId(null); onDelete && onDelete(f.id); }}
        />
      )}
    </div>
  );
}

function EmptyVault({ onUpload, onCreateNew }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '88px 24px', textAlign: 'center' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 18, background: '#F0F3F6', marginBottom: 16 }}>
        <Inbox size={26} style={{ color: '#9AA5B1' }} />
      </span>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#16223A' }}>Nothing in YourVault yet</h3>
      <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6B7885', maxWidth: 360, lineHeight: 1.5 }}>
        Pull documents in from a connected source, upload from your device, or draft a new document.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
        <button onClick={onUpload} style={{
          height: 40, padding: '0 16px', borderRadius: 12, border: '1px solid #E7ECF1',
          background: '#fff', color: '#3A4654', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
        }}><Upload size={15} /> Upload files</button>
        <button onClick={onCreateNew} style={{
          height: 40, padding: '0 16px', borderRadius: 12, border: 'none',
          background: '#0A2463', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
        }}><FilePlus size={15} /> New document</button>
      </div>
    </div>
  );
}

function EmptyResults({ query, onClear }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '88px 24px', textAlign: 'center' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 18, background: '#F0F3F6', marginBottom: 16 }}>
        <Search size={26} style={{ color: '#9AA5B1' }} />
      </span>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#16223A' }}>No documents match</h3>
      <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6B7885', maxWidth: 380, lineHeight: 1.5 }}>
        {query ? <>Nothing matched <strong style={{ color: '#16223A' }}>"{query}"</strong> with the current filters.</> : 'No documents match the current filters.'}
      </p>
      <button onClick={onClear} style={{
        marginTop: 22, height: 40, padding: '0 16px', borderRadius: 12, border: '1px solid #E7ECF1',
        background: '#fff', color: '#3A4654', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
      }}>
        <X size={15} /> Clear search & filters
      </button>
    </div>
  );
}
