import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, X, Check, ChevronDown, ChevronRight, FileText, File,
  Image as ImageIcon, Mail, Download, Folder, Tag, Calendar, User,
  Sparkles, Sliders, MoreHorizontal, Trash2,
  Upload, FilePlus, Inbox, Workflow, Package, FolderInput, MessageSquare,
  FolderUp, FileUp, Pencil, FolderPlus,
} from 'lucide-react';

const PAGE_SIZE = 10;

/* ─── Type / status / scope metadata ─────────────────────────────── */

// Only PDF, DOCX, TXT are accepted for upload — keep other entries as
// fallback for any legacy docs but only expose the three in the filter UI.
const TYPE_META = {
  pdf:   { label: 'PDF',  icon: File,     fg: '#B42318', bg: '#FDECEA' },
  docx:  { label: 'DOCX', icon: FileText, fg: '#1D4ED8', bg: '#EAF0FE' },
  txt:   { label: 'TXT',  icon: FileText, fg: '#374151', bg: '#F1F5F9' },
  other: { label: 'FILE', icon: File,     fg: '#64748B', bg: '#F1F5F9' },
};
// Keep legacy mappings for any old vault entries (not shown in filter)
const LEGACY_TYPE_META = {
  xlsx:  { label: 'XLS',  icon: FileText, fg: '#1B7A4B', bg: '#E8F4EC' },
  image: { label: 'IMG',  icon: File,     fg: '#7A4DB8', bg: '#F1EBFA' },
  email: { label: 'EML',  icon: File,     fg: '#B7791F', bg: '#FBF1DF' },
};
const ALL_TYPE_META = { ...TYPE_META, ...LEGACY_TYPE_META };

const STATUS_META = {
  Privileged:   { dot: '#C0392B', fg: '#9A2A1E', bg: '#FBEBE9' },
  Confidential: { dot: '#2563EB', fg: '#1E40AF', bg: '#EAF0FE' },
  Final:        { dot: '#1B7A4B', fg: '#15673F', bg: '#E8F4EC' },
  Draft:        { dot: '#C9A84C', fg: '#8A6D1F', bg: '#FBF3E0' },
};

/* Heuristic derivations from the existing VaultDoc shape */

function typeOf(fileName = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'doc' || ext === 'docx') return 'docx';
  if (ext === 'txt') return 'txt';
  // Legacy types for old vault entries
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
  const t = ALL_TYPE_META[type] || ALL_TYPE_META.other;
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

function FileRow({ file, query, isActive, onUse, onEdit, onDelete, canEdit, folderName }) {
  const insideMatch = query && !file.name.toLowerCase().includes(query.toLowerCase());
  const [hovered, setHovered] = useState(false);
  const rowBg = hovered ? '#FAFBFC' : 'transparent';
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transition: 'background 100ms',
        background: rowBg,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderBottom: '1px solid #F2F5F8', minHeight: 58,
      }}>
        <TypeBadge type={file.type} />
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 14, fontWeight: 500, color: '#16223A',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{file.name}</span>
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
        <div style={{ width: 140, flexShrink: 0, fontSize: 12.5, color: '#6B7885', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          {folderName ? (
            <>
              <Folder size={13} style={{ color: '#9AA5B1', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folderName}</span>
            </>
          ) : (
            <span style={{ color: '#C7CFD8' }}>—</span>
          )}
        </div>
        <div style={{ width: 120, flexShrink: 0 }}>
          <StatusChip status={file.status} />
        </div>
        <div style={{ width: 160, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onUse(file)}
            style={{
              height: 32, padding: '0 14px', borderRadius: 8, border: 'none',
              background: isActive ? '#5CA868' : '#0A2463', color: '#fff',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap', fontFamily: 'inherit',
            }}
          >
            <MessageSquare size={13} /> {isActive ? 'In chat' : 'Use in chat'}
          </button>
          <RowMenu file={file} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />
        </div>
      </div>
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

/* Three-dots overflow menu — the ONLY row/card action surface besides
   Use-in-chat. Holds Edit + Delete (PM 2026-05-29: dropped the inline
   Preview/eye quick-actions; row/card click still opens the preview
   drawer). Renders nothing when the user can't edit the doc. */
function RowMenu({ file, onEdit, onDelete, canEdit }) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return null;
  const itemStyle = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 10px', borderRadius: 7, border: 'none', background: 'transparent',
    fontSize: 13, fontFamily: 'inherit', color: '#3A4654', cursor: 'pointer', textAlign: 'left',
  };
  return (
    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <QuickAction icon={MoreHorizontal} title="More" onClick={() => setOpen((v) => !v)} />
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: 150,
            background: '#fff', borderRadius: 10, border: '1px solid #E7ECF1',
            boxShadow: '0 12px 32px rgba(15,28,63,0.12)', padding: 5, zIndex: 51,
          }}>
            <button style={itemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F3F6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => { setOpen(false); onEdit && onEdit(file); }}
            ><Pencil size={14} /> Edit</button>
            <button style={{ ...itemStyle, color: '#C65454' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FBEDED'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => { setOpen(false); onDelete && onDelete(file.id); }}
            ><Trash2 size={14} /> Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

function GridCard({ file, onUse, onEdit, onDelete, canEdit }) {
  const t = ALL_TYPE_META[file.type] || ALL_TYPE_META.other;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: 12, background: '#fff',
        border: '1px solid ' + (hovered ? '#C7CFD8' : '#ECEFF3'),
        boxShadow: hovered ? '0 4px 12px -6px rgba(10,36,99,0.10)' : '0 1px 2px rgba(10,36,99,0.04)',
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
          <RowMenu file={file} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />
        </div>
      </div>
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
  onActiveCategoriesChange,
  onCreateFolder,
}) {
  const [view, setView] = useState('list');
  const [filters, setFilters] = useState({
    status: [], type: [], tags: [], updatedBy: [], date: 'any',
  });
  const [openFilterId, setOpenFilterId] = useState(null);
  useEffect(() => {
    if (typeof onActiveCategoriesChange === 'function') onActiveCategoriesChange(filters.status);
  }, [filters.status, onActiveCategoriesChange]);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const folderUploadRef = useRef(null);
  /* New Folder */
  const [localFolders, setLocalFolders] = useState([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1);

  const handleCreateFolder = ({ name, category }) => {
    if (typeof onCreateFolder === 'function') {
      onCreateFolder(name, null, category || null);
    } else {
      setLocalFolders((prev) => [{
        id: `local-folder-${Date.now()}`,
        name, category,
        docCount: 0,
        created: new Date().toISOString(),
      }, ...prev]);
    }
    setShowNewFolderModal(false);
    flash(<span>Folder <strong>{name}</strong> created</span>);
  };

  const handleDeleteLocalFolder = (id) => {
    const f = localFolders.find((x) => x.id === id);
    setLocalFolders((prev) => prev.filter((x) => x.id !== id));
    if (f) flash(<span>Folder <strong>{f.name}</strong> deleted</span>);
  };

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
    const status = statusOf(d, folderName);
    const type = typeOf(d.fileName);
    const tags = tagsOf(d, folderName);
    const ownerLabel = d.ownerId === currentUserId ? 'You' : (d.ownerName || 'Member');
    return {
      ...d,
      type, status, tags, folderName,
      modified: relTime(d.createdAt),
      modifiedFull: d.createdAt || '—',
      created: d.createdAt || '—',
      sizeLabel: d.fileSize || '—',
      metaLabel: '',
      byLabel: ownerLabel,
      fromChat: !!d.addedFromChat,
      scope: d.isGlobal ? 'Org-wide' : (d.ownerId === currentUserId ? 'Mine' : 'Member'),
      path: folderName || 'Root',
    };
  }), [docs, folderById, currentUserId]);

  /* Filter universes */
  const allTags = useMemo(() => Array.from(new Set(enriched.flatMap((d) => d.tags))).sort(), [enriched]);
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

  /* Reset to page 1 whenever the result set changes */
  useEffect(() => { setCurrentPage(1); }, [filters, q]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pagedResults = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const filtersActive = filters.status.length || filters.type.length
    || filters.tags.length || filters.updatedBy.length || filters.date !== 'any';
  const clearAll = () => {
    setFilters({ status: [], type: [], tags: [], updatedBy: [], date: 'any' });
    setSearch && setSearch('');
  };

  const toggle = (group, value) => setFilters((f) => {
    const arr = f[group];
    return { ...f, [group]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
  });
  const setDate = (v) => setFilters((f) => ({ ...f, date: v }));

  const onUse = (file) => {
    onSelect && onSelect(file);
    flash(<span><strong>{file.name}</strong> added to chat context</span>);
  };

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
          accept=".pdf,.docx,.txt"
          onChange={(e) => {
            if (onUploadFolder && e.target.files) {
              // Filter to only PDF/DOCX/TXT even when uploading a whole folder
              const allowed = Array.from(e.target.files).filter(f => /\.(pdf|docx|txt)$/i.test(f.name));
              if (allowed.length) onUploadFolder(allowed, null);
            }
            e.target.value = '';
          }}
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
                {/* New Folder — ghost with dashed border to signal "create"
                   vs the solid/outlined "upload" actions to its right. */}
                <button onClick={() => setShowNewFolderModal(true)} style={{
                  height: 40, padding: '0 16px', borderRadius: 12,
                  border: '1.5px dashed #9AA5B1',
                  background: '#fff', color: '#4A5663', fontSize: 13.5, fontWeight: 600,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0A2463'; e.currentTarget.style.color = '#0A2463'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#9AA5B1'; e.currentTarget.style.color = '#4A5663'; }}
                >
                  <FolderPlus size={15} /> New Folder
                </button>
                {/* Upload Folder — SECONDARY: navy-outlined so it reads as a
                   native upload action, distinct from the gray connector
                   buttons (Google Drive / iManage / OneDrive) to its left. */}
                <button onClick={() => folderUploadRef.current?.click()} style={{
                  height: 40, padding: '0 16px', borderRadius: 12, border: '1.5px solid #0A2463',
                  background: '#fff', color: '#0A2463', fontSize: 13.5, fontWeight: 600,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                }}>
                  <FolderUp size={15} style={{ color: '#0A2463' }} /> Upload Folder
                </button>
                {/* Upload Document — PRIMARY: solid navy. The single-doc
                   upload is the most common action so it gets the filled CTA. */}
                <button onClick={onCreateNew} style={{
                  height: 40, padding: '0 16px', borderRadius: 12, border: '1.5px solid #0A2463',
                  background: '#0A2463', color: '#fff', fontSize: 13.5, fontWeight: 600,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                }}>
                  <FileUp size={15} /> Upload Document
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
              <FilterPill icon={File} label="Type" id="type" openId={openFilterId} setOpenId={setOpenFilterId} width={160}
                valueLabel={summarize(filters.type, (k) => TYPE_META[k]?.label || k.toUpperCase())}>
                {['pdf', 'docx', 'txt'].map((k) => (
                  <CheckRow key={k} checked={filters.type.includes(k)} onClick={() => toggle('type', k)}>{TYPE_META[k].label}</CheckRow>
                ))}
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
                  ...filters.type.map((t) => ({ k: 't:' + t, label: (TYPE_META[t] || ALL_TYPE_META[t])?.label || t.toUpperCase(), rm: () => toggle('type', t) })),
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#16223A', fontFamily: 'ui-monospace, Menlo, monospace' }}>{results.length}</span>
                  <span style={{ fontSize: 14, color: '#6B7885' }}>document{results.length !== 1 ? 's' : ''}</span>
                </div>
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
              <EmptyVault onUpload={() => folderUploadRef.current?.click()} onCreateNew={onCreateNew} onNewFolder={() => setShowNewFolderModal(true)} />
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
                  <span style={{ width: 34, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#9AA5B1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Document</span>
                  <span style={{ width: 140, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#9AA5B1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Folder</span>
                  <span style={{ width: 120, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#9AA5B1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Category</span>
                  <span style={{ width: 160, flexShrink: 0 }} />
                </div>
                {pagedResults.map((f) => (
                  <FileRow
                    key={f.id} file={f}
                    isActive={activeDocument && activeDocument.id === f.id}
                    query={search}
                    folderName={f.folderName}
                    onUse={onUse}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    canEdit={isOrgAdmin || f.ownerId === currentUserId || !f.ownerId}
                  />
                ))}
                <Pagination currentPage={currentPage} totalPages={totalPages} onChange={(p) => setCurrentPage(p)} />
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))' }}>
                  {pagedResults.map((f) => (
                    <GridCard
                      key={f.id} file={f}
                      onUse={onUse}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      canEdit={isOrgAdmin || f.ownerId === currentUserId || !f.ownerId}
                    />
                  ))}
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onChange={(p) => setCurrentPage(p)} />
              </div>
            )}
          </div>
        </div>

      </div>

      {showNewFolderModal && (
        <NewFolderModal
          onClose={() => setShowNewFolderModal(false)}
          onCreate={handleCreateFolder}
        />
      )}
    </div>
  );
}

function EmptyVault({ onUpload, onCreateNew, onNewFolder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '88px 24px', textAlign: 'center' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 18, background: '#F0F3F6', marginBottom: 16 }}>
        <Inbox size={26} style={{ color: '#9AA5B1' }} />
      </span>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#16223A' }}>Nothing in YourVault yet</h3>
      <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6B7885', maxWidth: 360, lineHeight: 1.5 }}>
        Pull documents in from a connected source, upload from your device, or create a folder to organise your files.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 22, justifyContent: 'center' }}>
        <button onClick={onNewFolder} style={{
          height: 40, padding: '0 16px', borderRadius: 12, border: '1.5px dashed #9AA5B1',
          background: '#fff', color: '#4A5663', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
        }}><FolderPlus size={15} /> New Folder</button>
        <button onClick={onUpload} style={{
          height: 40, padding: '0 16px', borderRadius: 12, border: '1.5px solid #0A2463',
          background: '#fff', color: '#0A2463', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
        }}><FolderUp size={15} /> Upload Folder</button>
        <button onClick={onCreateNew} style={{
          height: 40, padding: '0 16px', borderRadius: 12, border: '1.5px solid #0A2463',
          background: '#0A2463', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
        }}><FileUp size={15} /> Upload Document</button>
      </div>
    </div>
  );
}

/* ─── New Folder Modal ─────────────────────────────────────────── */

function NewFolderModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), category: category || null });
  };

  const closeBtnStyle = {
    width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent',
    color: '#9AA5B1', cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(10,36,99,0.20)', zIndex: 200 }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 428, borderRadius: 18, background: '#fff', zIndex: 201,
        border: '1px solid #E7ECF1', boxShadow: '0 28px 64px -12px rgba(10,36,99,0.28)',
        padding: '24px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 34, height: 34, borderRadius: 10, background: '#F0F3F6',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FolderPlus size={17} style={{ color: '#6B7885' }} />
            </span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#16223A' }}>New Folder</h3>
          </div>
          <button
            onClick={onClose}
            style={closeBtnStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F3F6'; e.currentTarget.style.color = '#0A2463'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9AA5B1'; }}
          ><X size={17} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Folder name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 11.5, fontWeight: 600, color: '#6B7885',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7,
              fontFamily: 'ui-monospace, Menlo, monospace',
            }}>Folder Name</label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Discovery Documents"
              style={{
                width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
                border: '1.5px solid #E7ECF1', fontSize: 14, color: '#16223A',
                outline: 'none', fontFamily: 'inherit', background: '#fff',
                boxSizing: 'border-box', transition: 'border-color 150ms',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#0A2463'; e.target.style.boxShadow = '0 0 0 3px rgba(10,36,99,0.07)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E7ECF1'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Category (optional) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 11.5, fontWeight: 600, color: '#6B7885',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7,
              fontFamily: 'ui-monospace, Menlo, monospace',
            }}>
              Category{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.7, letterSpacing: 0 }}>
                (optional)
              </span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(STATUS_META).map(([key, meta]) => {
                const active = category === key;
                return (
                  <button
                    key={key} type="button"
                    onClick={() => setCategory((c) => c === key ? '' : key)}
                    style={{
                      height: 34, padding: '0 14px', borderRadius: 999, cursor: 'pointer',
                      border: '1.5px solid ' + (active ? meta.dot : '#E7ECF1'),
                      background: active ? meta.bg : '#fff',
                      color: active ? meta.fg : '#4A5663',
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      fontFamily: 'inherit', transition: 'all 120ms',
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
                    {key}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live preview */}
          <div style={{
            marginBottom: 22, padding: '12px 14px', borderRadius: 10,
            background: '#FAFBFC', border: '1px solid #F0F3F6',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            {category ? (
              <span style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: STATUS_META[category].bg,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: STATUS_META[category].dot }} />
              </span>
            ) : (
              <span style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: '#F0F3F6',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Folder size={17} style={{ color: '#9AA5B1' }} />
              </span>
            )}
            <span style={{
              fontSize: 14, fontWeight: 500,
              color: name.trim() ? '#16223A' : '#B6BFC9',
              fontStyle: name.trim() ? 'normal' : 'italic',
            }}>
              {name.trim() || 'Folder name'}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, height: 42, borderRadius: 10, border: '1px solid #E7ECF1',
              background: '#fff', color: '#3A4654', fontSize: 13.5, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F6F8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >Cancel</button>
            <button type="submit" disabled={!name.trim()} style={{
              flex: 2, height: 42, borderRadius: 10, border: 'none',
              background: name.trim() ? '#0A2463' : '#E7ECF1',
              color: name.trim() ? '#fff' : '#9AA5B1',
              fontSize: 13.5, fontWeight: 600,
              cursor: name.trim() ? 'pointer' : 'default',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, fontFamily: 'inherit',
            }}>
              <FolderPlus size={15} /> Create Folder
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ─── Folder row (list view) ────────────────────────────────────── */

function FolderRow({ folder, docCount = 0, onNavigate, onDelete, canEdit }) {
  const [hovered, setHovered] = useState(false);
  const meta = folder.category ? STATUS_META[folder.category] : null;
  return (
    <div
      onClick={() => onNavigate && onNavigate(folder.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderBottom: '1px solid #F2F5F8', minHeight: 54,
        background: hovered ? '#F8F4ED' : 'transparent',
        cursor: onNavigate ? 'pointer' : 'default',
        transition: 'background 100ms',
      }}
    >
      {/* Icon tile: category dot or plain folder */}
      <span style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: meta ? meta.bg : '#F0F3F6',
      }}>
        {meta
          ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta.dot }} />
          : <Folder size={16} style={{ color: '#9AA5B1' }} />
        }
      </span>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#16223A' }}>{folder.name}</span>
          <span style={{ fontSize: 11.5, color: '#9AA5B1' }}>{docCount} doc{docCount !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ fontSize: 12, color: '#9AA5B1', marginTop: 1 }}>Folder</div>
      </div>
      <div style={{ width: 150, flexShrink: 0 }} />
      <div style={{ width: 120, flexShrink: 0 }}>
        {meta && <StatusChip status={folder.category} />}
      </div>
      <div style={{ width: 160, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }} onClick={(e) => e.stopPropagation()}>
        {onNavigate && (
          <button style={{
            height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid #E7ECF1',
            background: '#fff', color: '#0A2463', fontSize: 12.5, fontWeight: 500,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: 'inherit',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF1F8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            onClick={(e) => { e.stopPropagation(); onNavigate(folder.id); }}
          >Open <ChevronRight size={13} /></button>
        )}
        {canEdit && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
            title="Delete folder"
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #E7ECF1',
              background: '#fff', color: '#C65454', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#FBEDED'; e.currentTarget.style.borderColor = '#E8BABA'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E7ECF1'; }}
          ><Trash2 size={13} /></button>
        )}
      </div>
    </div>
  );
}

/* ─── Folder card (grid view) ───────────────────────────────────── */

function FolderCard({ folder, docCount = 0, onNavigate, onDelete, canEdit }) {
  const [hovered, setHovered] = useState(false);
  const meta = folder.category ? STATUS_META[folder.category] : null;
  return (
    <div
      onClick={() => onNavigate && onNavigate(folder.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 12, background: '#fff', overflow: 'hidden',
        border: '1px solid ' + (hovered ? '#C9A84C' : '#ECEFF3'),
        boxShadow: hovered ? '0 8px 24px -10px rgba(10,36,99,0.18)' : '0 1px 2px rgba(10,36,99,0.04)',
        display: 'flex', flexDirection: 'column', transition: 'all 150ms',
        cursor: onNavigate ? 'pointer' : 'default',
      }}
    >
      {/* Tile top */}
      <div style={{
        height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: meta ? meta.bg : '#F4F6F8',
      }}>
        {meta ? (
          <span style={{
            width: 52, height: 52, borderRadius: 16, background: meta.dot + '22',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: meta.dot }} />
          </span>
        ) : (
          <Folder size={40} style={{ color: '#C7CFD8' }} />
        )}
      </div>
      {/* Body */}
      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: '#16223A', lineHeight: 1.35 }}>{folder.name}</div>
        <div style={{ fontSize: 11.5, color: '#9AA5B1', marginTop: 6 }}>
          {docCount} document{docCount !== 1 ? 's' : ''}
        </div>
        {meta && <div style={{ marginTop: 8 }}><StatusChip status={folder.category} /></div>}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F2F5F8', display: 'flex', gap: 6 }}>
          {onNavigate && (
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate(folder.id); }}
              style={{
                flex: 1, height: 32, borderRadius: 8, border: 'none',
                background: '#0A2463', color: '#fff', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', gap: 5, fontFamily: 'inherit',
              }}
            >Open <ChevronRight size={13} /></button>
          )}
          {canEdit && onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #E7ECF1',
                background: '#fff', color: '#C65454', fontSize: 12.5, fontWeight: 500,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FBEDED'; e.currentTarget.style.borderColor = '#E8BABA'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E7ECF1'; }}
            ><Trash2 size={13} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Pagination ─────────────────────────────────────────────────── */

function Pagination({ currentPage, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  /* Show at most 5 page numbers centered around currentPage */
  const pages = [];
  const half = 2;
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) pages.push(i);

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 34, height: 34, borderRadius: 8, border: '1px solid #E7ECF1',
    background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    fontFamily: 'inherit', transition: 'all 100ms',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '20px 0 8px' }}>
      <button
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{ ...btnBase, color: currentPage === 1 ? '#C7CFD8' : '#4A5663', borderColor: currentPage === 1 ? '#F0F3F6' : '#E7ECF1' }}
        onMouseEnter={(e) => { if (currentPage > 1) { e.currentTarget.style.borderColor = '#0A2463'; e.currentTarget.style.color = '#0A2463'; } }}
        onMouseLeave={(e) => { if (currentPage > 1) { e.currentTarget.style.borderColor = '#E7ECF1'; e.currentTarget.style.color = '#4A5663'; } }}
      >
        <ChevronLeft size={15} />
      </button>
      {start > 1 && <>
        <button onClick={() => onChange(1)} style={{ ...btnBase, color: '#4A5663' }}>1</button>
        {start > 2 && <span style={{ fontSize: 13, color: '#9AA5B1', padding: '0 4px' }}>…</span>}
      </>}
      {pages.map((n) => (
        <button
          key={n} onClick={() => onChange(n)}
          style={{
            ...btnBase,
            background: n === currentPage ? '#0A2463' : '#fff',
            color: n === currentPage ? '#fff' : '#4A5663',
            border: '1px solid ' + (n === currentPage ? '#0A2463' : '#E7ECF1'),
            fontWeight: n === currentPage ? 700 : 500,
          }}
        >{n}</button>
      ))}
      {end < totalPages && <>
        {end < totalPages - 1 && <span style={{ fontSize: 13, color: '#9AA5B1', padding: '0 4px' }}>…</span>}
        <button onClick={() => onChange(totalPages)} style={{ ...btnBase, color: '#4A5663' }}>{totalPages}</button>
      </>}
      <button
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{ ...btnBase, color: currentPage === totalPages ? '#C7CFD8' : '#4A5663', borderColor: currentPage === totalPages ? '#F0F3F6' : '#E7ECF1' }}
        onMouseEnter={(e) => { if (currentPage < totalPages) { e.currentTarget.style.borderColor = '#0A2463'; e.currentTarget.style.color = '#0A2463'; } }}
        onMouseLeave={(e) => { if (currentPage < totalPages) { e.currentTarget.style.borderColor = '#E7ECF1'; e.currentTarget.style.color = '#4A5663'; } }}
      >
        <ChevronRight size={15} />
      </button>
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
