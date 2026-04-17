import React, { useState, useMemo } from 'react';
import {
  BookMarked, Plus, Download, Search,
  Building2, Users, CreditCard, BarChart2, ShieldCheck,
  FileText, FileOutput, Workflow, Database, Plug, Bell, Settings, Lock,
} from 'lucide-react';
import { userStoryModules } from '../../data/mockData';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import useUserStories from '../../hooks/useUserStories';
import StoryCard from '../../components/StoryCard';
import StoryEditor from '../../components/StoryEditor';
import StoryTemplate from '../../components/StoryTemplate';

/* ── Icon map for resolving module icon strings ── */
const iconMap = { Building2, Users, CreditCard, BarChart2, ShieldCheck, FileText, FileOutput, Workflow, Database, Plug, Bell, Settings, Lock };

/* ── Shared input style (matches codebase convention) ── */
const inputStyle = {
  border: '1px solid var(--border)',
  borderRadius: '8px',
  height: 36,
  padding: '0 12px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '13px',
  color: 'var(--text-primary)',
  outline: 'none',
};

/* ══════════════════════════════════════════════════════════════
   UserStories page component
   ══════════════════════════════════════════════════════════════ */
export default function UserStories() {
  const showToast = useToast();

  /* ── Core hook ── */
  const {
    getStories, getModuleCount, createStory,
    updateStory, deleteStory, duplicateStory,
    exportModuleStories, exportSingleStory,
  } = useUserStories();

  /* ── Module tab state ── */
  const [activeModule, setActiveModule] = useState('tenant-management');

  /* ── Filter state ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  /* ── Editor / viewer state ── */
  const [editingStory, setEditingStory] = useState(null);
  const [viewingStory, setViewingStory] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  /* ── Delete confirm ── */
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  /* ── Computed data ── */
  const moduleStories = useMemo(() => {
    let stories = getStories(activeModule);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      stories = stories.filter(
        (s) =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.goal || '').toLowerCase().includes(q) ||
          (s.id || '').toLowerCase().includes(q)
      );
    }
    if (priorityFilter !== 'All') {
      stories = stories.filter((s) => s.priority === priorityFilter);
    }
    if (statusFilter !== 'All') {
      stories = stories.filter((s) => s.status === statusFilter);
    }
    return stories;
  }, [getStories, activeModule, searchQuery, priorityFilter, statusFilter]);

  const currentModuleLabel = userStoryModules.find((m) => m.id === activeModule)?.label;

  /* ── Handlers: Story Card ── */
  const handleEdit = (story) => {
    setEditingStory(story);
    setShowEditor(true);
  };

  const handleView = (story) => {
    setViewingStory(story);
  };

  const handleDuplicate = (story) => {
    duplicateStory(story.id);
    showToast(`Duplicated ${story.id}`);
  };

  const handleDeleteRequest = (story) => {
    setDeleteConfirm(story);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    deleteStory(deleteConfirm.id);
    showToast(`Deleted ${deleteConfirm.id}`);
    setDeleteConfirm(null);
  };

  /* ── Handlers: Story Template (full view) ── */
  const handleTemplatePrev = () => {
    const idx = moduleStories.findIndex((s) => s.id === viewingStory?.id);
    if (idx > 0) setViewingStory(moduleStories[idx - 1]);
  };

  const handleTemplateNext = () => {
    const idx = moduleStories.findIndex((s) => s.id === viewingStory?.id);
    if (idx < moduleStories.length - 1) setViewingStory(moduleStories[idx + 1]);
  };

  const handleTemplateExport = (id) => {
    exportSingleStory(id);
    showToast('Story exported');
  };

  const handleTemplateEdit = (story) => {
    setViewingStory(null);
    setEditingStory(story);
    setShowEditor(true);
  };

  /* ── Handlers: Story Editor ── */
  const handleEditorSave = (data) => {
    if (editingStory) {
      updateStory(editingStory.id, data);
      showToast(`Updated ${editingStory.id}`);
    } else {
      createStory({ ...data, moduleId: activeModule });
      showToast('Story created');
    }
    setShowEditor(false);
    setEditingStory(null);
  };

  const openNewEditor = () => {
    setEditingStory(null);
    setShowEditor(true);
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ── Page Header ── */}
      <PageHeader
        icon={BookMarked}
        title="User Stories"
        subtitle="Create and manage user stories for every platform module."
      />

      {/* ── Module Tab Strip ── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="hide-scrollbar"
      >
        {userStoryModules.map((mod) => {
          const isActive = mod.id === activeModule;
          const ModIcon = iconMap[mod.icon];
          const count = getModuleCount(mod.id);
          return (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: 36,
                padding: '0 14px',
                borderRadius: 20,
                border: isActive ? 'none' : '1px solid var(--border)',
                backgroundColor: isActive ? 'var(--navy)' : '#fff',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.15s',
              }}
            >
              {ModIcon && <ModIcon size={14} />}
              {mod.label}
              {count > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 10,
                    backgroundColor: isActive ? 'var(--gold)' : 'var(--ice-warm)',
                    color: isActive ? '#fff' : 'var(--navy)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        {/* Left: search + filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories..."
              style={{ ...inputStyle, width: 220, paddingLeft: 32 }}
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', appearance: 'auto', paddingRight: 8 }}
          >
            <option value="All">All Priorities</option>
            <option value="Must Have">Must Have</option>
            <option value="Should Have">Should Have</option>
            <option value="Could Have">Could Have</option>
            <option value="Won't Have">Won't Have</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', appearance: 'auto', paddingRight: 8 }}
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Ready">Ready</option>
            <option value="In Review">In Review</option>
            <option value="Approved">Approved</option>
          </select>
        </div>

        {/* Right: count + export */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
            {moduleStories.length} {moduleStories.length === 1 ? 'story' : 'stories'}
          </span>
          <button
            onClick={() => exportModuleStories(activeModule)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 36, borderRadius: 8,
              border: '1px solid var(--border)', backgroundColor: '#fff',
              color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Download size={14} /> Export JSON
          </button>
        </div>
      </div>

      {/* ── Story List or Empty State ── */}
      {moduleStories.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {moduleStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onEdit={handleEdit}
              onView={handleView}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      ) : (
        /* ── Empty State ── */
        <div style={{ textAlign: 'center', padding: '64px 20px' }}>
          <BookMarked size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)', marginBottom: 8 }}>
            No user stories yet
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 24, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Create stories with the guided editor for the {currentModuleLabel} module.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={openNewEditor}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 16px', height: 36, borderRadius: 8,
                border: '1px solid var(--border)', backgroundColor: '#fff',
                color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Plus size={14} /> Write Manually
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
         Story Template (read-only slide-over)
         ══════════════════════════════════════════════════════════════ */}
      <StoryTemplate
        open={!!viewingStory}
        onClose={() => setViewingStory(null)}
        story={viewingStory}
        onPrev={moduleStories.findIndex((s) => s.id === viewingStory?.id) > 0 ? handleTemplatePrev : undefined}
        onNext={moduleStories.findIndex((s) => s.id === viewingStory?.id) < moduleStories.length - 1 ? handleTemplateNext : undefined}
        onExport={handleTemplateExport}
        onEdit={handleTemplateEdit}
      />

      {/* ══════════════════════════════════════════════════════════════
         Story Editor (slide-over drawer)
         ══════════════════════════════════════════════════════════════ */}
      <StoryEditor
        open={showEditor}
        onClose={() => { setShowEditor(false); setEditingStory(null); }}
        story={editingStory}
        moduleId={activeModule}
        onSave={handleEditorSave}
      />

      {/* ══════════════════════════════════════════════════════════════
         Delete Confirm Modal
         ══════════════════════════════════════════════════════════════ */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Delete"
      >
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Delete <strong>{deleteConfirm?.id}</strong>? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setDeleteConfirm(null)}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: '1px solid var(--border)', backgroundColor: '#fff',
              color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirm}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: 'none', backgroundColor: '#C65454',
              color: '#fff', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Delete
          </button>
        </div>
      </Modal>

      {/* ── Inline animation styles ── */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
