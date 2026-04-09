import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen, FileText, Edit3, Globe, CheckCircle, Clock, Plus, Lock,
  Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3,
  Link2, Quote, Code, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, X,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';

const DEFAULT_CONTENT = {
  '/terms': `<h1>Terms of Service</h1><p><em>Effective date: March 28, 2026</em></p><h2>1. Acceptance of Terms</h2><p>By accessing and using YourAI, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our platform.</p><h2>2. Use License</h2><p>Permission is granted to temporarily access YourAI for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p><h2>3. Disclaimer</h2><p>The materials on YourAI are provided on an "as is" basis. YourAI makes no warranties, expressed or implied.</p>`,
  '/privacy': `<h1>Privacy Policy</h1><p><em>Last updated: March 25, 2026</em></p><h2>Information We Collect</h2><p>YourAI collects information you provide directly to us when you create an account, use our services, or communicate with us.</p><h2>How We Use Information</h2><ul><li>To provide and maintain our services</li><li>To process transactions</li><li>To send you technical notices and support messages</li><li>To respond to your comments and questions</li></ul><h2>Data Security</h2><p>We implement appropriate technical and organizational measures to protect your personal information.</p>`,
  '/ai-disclaimer': `<h1>AI Usage Disclaimer</h1><p>YourAI uses artificial intelligence to assist with legal work. Please review all AI-generated content before relying on it for legal decisions.</p><h2>Important Notices</h2><ul><li>AI-generated content is not legal advice</li><li>Always verify AI outputs against authoritative sources</li><li>A qualified attorney should review all final deliverables</li></ul>`,
  '/aup': `<h1>Acceptable Use Policy</h1><p>This Acceptable Use Policy describes prohibited uses of the YourAI platform.</p><h2>Prohibited Activities</h2><ul><li>Illegal activities or violating applicable laws</li><li>Attempting unauthorized access to other accounts</li><li>Uploading malicious code or content</li><li>Harassment or abuse of other users</li></ul>`,
  '/cookies': `<h1>Cookie Policy</h1><p>This Cookie Policy explains how YourAI uses cookies and similar technologies when you visit our platform.</p><h2>What Are Cookies?</h2><p>Cookies are small data files placed on your device when you visit a website. They help us recognize your device and remember your preferences.</p>`,
  '/dpa': `<h1>Data Processing Agreement</h1><p><strong>DRAFT v2.0</strong></p><p>This Data Processing Agreement forms part of the agreement between YourAI and the Customer and reflects the parties' commitment to compliance with applicable data protection laws.</p>`,
  '/help/getting-started': `<h1>Getting Started with YourAI</h1><p>Welcome to YourAI! This guide will help you get up and running in minutes.</p><h2>Step 1: Create your workspace</h2><p>After logging in, you'll be guided through a quick onboarding flow to set up your firm's workspace.</p><h2>Step 2: Upload your first document</h2><p>Navigate to the Documents section and upload any contract, brief, or legal file you want to analyze.</p>`,
  '/help/ai-features': `<h1>AI Features Overview</h1><p><strong>Draft v1.1</strong></p><p>YourAI offers a suite of AI-powered features specifically tailored for legal work.</p><h2>Contract Analysis</h2><p>Automatically extract key clauses, identify risks, and compare contract terms.</p><h2>Legal Research</h2><p>Ask natural language questions and get citations from trusted legal sources.</p>`,
};

const initialPages = [
  { id: 1, title: 'Terms of Service', slug: '/terms', lastUpdated: 'Mar 28, 2026', updatedBy: 'Arjun P', status: 'Published', version: 'v3.1', content: DEFAULT_CONTENT['/terms'] },
  { id: 2, title: 'Privacy Policy', slug: '/privacy', lastUpdated: 'Mar 25, 2026', updatedBy: 'Arjun P', status: 'Published', version: 'v2.4', content: DEFAULT_CONTENT['/privacy'] },
  { id: 3, title: 'AI Usage Disclaimer', slug: '/ai-disclaimer', lastUpdated: 'Apr 1, 2026', updatedBy: 'Dev Team', status: 'Published', version: 'v1.8', content: DEFAULT_CONTENT['/ai-disclaimer'] },
  { id: 4, title: 'Acceptable Use Policy', slug: '/aup', lastUpdated: 'Mar 20, 2026', updatedBy: 'Arjun P', status: 'Published', version: 'v1.2', content: DEFAULT_CONTENT['/aup'] },
  { id: 5, title: 'Cookie Policy', slug: '/cookies', lastUpdated: 'Feb 15, 2026', updatedBy: 'Dev Team', status: 'Published', version: 'v1.0', content: DEFAULT_CONTENT['/cookies'] },
  { id: 6, title: 'Data Processing Agreement', slug: '/dpa', lastUpdated: 'Mar 30, 2026', updatedBy: 'Arjun P', status: 'Draft', version: 'v2.0-draft', content: DEFAULT_CONTENT['/dpa'] },
  { id: 7, title: 'Help Centre — Getting Started', slug: '/help/getting-started', lastUpdated: 'Mar 22, 2026', updatedBy: 'Dev Team', status: 'Published', version: 'v1.5', content: DEFAULT_CONTENT['/help/getting-started'] },
  { id: 8, title: 'Help Centre — AI Features', slug: '/help/ai-features', lastUpdated: 'Apr 2, 2026', updatedBy: 'Arjun P', status: 'Draft', version: 'v1.1-draft', content: DEFAULT_CONTENT['/help/ai-features'] },
];

// ─── Rich Text Editor Toolbar Button ───
const ToolbarBtn = ({ icon: Icon, onClick, title, active }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className="flex items-center justify-center transition-colors"
    style={{
      width: 32, height: 32,
      borderRadius: 6,
      background: active ? 'var(--ice)' : 'transparent',
      color: active ? 'var(--navy)' : 'var(--text-secondary)',
      border: 'none',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
  >
    <Icon size={16} />
  </button>
);

const Divider = () => (
  <div style={{ width: 1, height: 20, backgroundColor: 'var(--border)', margin: '0 4px' }} />
);

// ─── Rich Text Editor ───
const RichTextEditor = ({ initialHtml, onChange }) => {
  const editorRef = useRef(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (editorRef.current && initialHtml !== undefined) {
      editorRef.current.innerHTML = initialHtml || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (onChange) onChange(editorRef.current?.innerHTML || '');
    forceUpdate((n) => n + 1);
  };

  const insertHeading = (level) => exec('formatBlock', `H${level}`);

  const insertLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  };

  const handleInput = () => {
    if (onChange) onChange(editorRef.current?.innerHTML || '');
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' }}>
      {/* Toolbar */}
      <div
        className="flex items-center flex-wrap gap-1 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--ice-warm)' }}
      >
        <ToolbarBtn icon={Undo2} onClick={() => exec('undo')} title="Undo" />
        <ToolbarBtn icon={Redo2} onClick={() => exec('redo')} title="Redo" />
        <Divider />
        <ToolbarBtn icon={Heading1} onClick={() => insertHeading(1)} title="Heading 1" />
        <ToolbarBtn icon={Heading2} onClick={() => insertHeading(2)} title="Heading 2" />
        <ToolbarBtn icon={Heading3} onClick={() => insertHeading(3)} title="Heading 3" />
        <Divider />
        <ToolbarBtn icon={Bold} onClick={() => exec('bold')} title="Bold (Ctrl+B)" />
        <ToolbarBtn icon={Italic} onClick={() => exec('italic')} title="Italic (Ctrl+I)" />
        <ToolbarBtn icon={Underline} onClick={() => exec('underline')} title="Underline (Ctrl+U)" />
        <Divider />
        <ToolbarBtn icon={List} onClick={() => exec('insertUnorderedList')} title="Bullet List" />
        <ToolbarBtn icon={ListOrdered} onClick={() => exec('insertOrderedList')} title="Numbered List" />
        <Divider />
        <ToolbarBtn icon={AlignLeft} onClick={() => exec('justifyLeft')} title="Align Left" />
        <ToolbarBtn icon={AlignCenter} onClick={() => exec('justifyCenter')} title="Align Center" />
        <ToolbarBtn icon={AlignRight} onClick={() => exec('justifyRight')} title="Align Right" />
        <Divider />
        <ToolbarBtn icon={Quote} onClick={() => exec('formatBlock', 'BLOCKQUOTE')} title="Quote" />
        <ToolbarBtn icon={Code} onClick={() => exec('formatBlock', 'PRE')} title="Code Block" />
        <ToolbarBtn icon={Link2} onClick={insertLink} title="Insert Link" />
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="rich-editor-content"
        style={{
          minHeight: 420,
          maxHeight: 'calc(100vh - 380px)',
          overflowY: 'auto',
          padding: '24px 32px',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          lineHeight: 1.7,
          color: 'var(--text-primary)',
          outline: 'none',
          backgroundColor: '#fff',
        }}
      />

      {/* Inline styles for editor content */}
      <style>{`
        .rich-editor-content h1 { font-family: 'DM Serif Display', serif; font-size: 28px; margin: 16px 0 12px; color: var(--navy); font-weight: 400; }
        .rich-editor-content h2 { font-family: 'DM Serif Display', serif; font-size: 22px; margin: 20px 0 10px; color: var(--navy); font-weight: 400; }
        .rich-editor-content h3 { font-family: 'DM Sans', sans-serif; font-size: 17px; margin: 16px 0 8px; color: var(--text-primary); font-weight: 600; }
        .rich-editor-content p { margin: 8px 0; }
        .rich-editor-content ul, .rich-editor-content ol { margin: 8px 0 8px 24px; }
        .rich-editor-content li { margin: 4px 0; }
        .rich-editor-content blockquote { border-left: 3px solid var(--gold); padding-left: 16px; margin: 12px 0; color: var(--text-secondary); font-style: italic; }
        .rich-editor-content pre { background: var(--ice-warm); padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 13px; margin: 12px 0; }
        .rich-editor-content a { color: var(--navy); text-decoration: underline; }
        .rich-editor-content em { font-style: italic; color: var(--text-muted); }
        .rich-editor-content strong { font-weight: 600; }
      `}</style>
    </div>
  );
};

export default function StaticContent() {
  const [pages, setPages] = useState(initialPages);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editPage, setEditPage] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPage, setNewPage] = useState({ title: '', slug: '', content: '' });
  const showToast = useToast();

  const filtered = pages.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    return true;
  });

  const publishedCount = pages.filter((p) => p.status === 'Published').length;
  const draftCount = pages.filter((p) => p.status === 'Draft').length;

  const openEdit = (page) => {
    setEditPage(page);
    setEditTitle(page.title);
    setEditContent(page.content || '');
  };

  const closeEdit = () => {
    setEditPage(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleSaveDraft = () => {
    setPages((prev) => prev.map((p) => p.id === editPage.id ? {
      ...p, title: editTitle, content: editContent, status: 'Draft', lastUpdated: 'Just now', updatedBy: 'Arjun P',
    } : p));
    showToast(`"${editTitle}" saved as draft`);
    closeEdit();
  };

  const handlePublish = () => {
    setPages((prev) => prev.map((p) => p.id === editPage.id ? {
      ...p, title: editTitle, content: editContent, status: 'Published', lastUpdated: 'Just now', updatedBy: 'Arjun P',
    } : p));
    showToast('Page published successfully');
    closeEdit();
  };

  const handleAddPage = () => {
    if (!newPage.title.trim() || !newPage.slug.trim()) {
      showToast('Please fill title and slug');
      return;
    }
    const slug = newPage.slug.startsWith('/') ? newPage.slug : `/${newPage.slug}`;
    const page = {
      id: Math.max(...pages.map((p) => p.id)) + 1,
      title: newPage.title,
      slug,
      lastUpdated: 'Just now',
      updatedBy: 'Arjun P',
      status: 'Draft',
      version: 'v1.0-draft',
      content: newPage.content || `<h1>${newPage.title}</h1><p>Start writing your content here...</p>`,
    };
    setPages((prev) => [page, ...prev]);
    showToast(`"${newPage.title}" page created as draft`);
    setNewPage({ title: '', slug: '', content: '' });
    setShowAddModal(false);
  };

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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="Static Content"
        subtitle="Manage public-facing pages, policies, and help centre content"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--navy)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--navy-mid, #1a2744)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--navy)')}
          >
            <Plus size={16} /> Add Page
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={BookOpen} value={pages.length} label="Total Pages" />
        <StatCard icon={CheckCircle} value={publishedCount} label="Published" />
        <StatCard icon={Clock} value={draftCount} label="Drafts" accentColor="#92400E" />
        <StatCard icon={Globe} value="yourai.com" label="Public Site" accentColor="var(--gold)" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
          <option>All</option>
          <option>Published</option>
          <option>Draft</option>
        </select>
        <span className="text-sm whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
          Showing {filtered.length} pages
        </span>
      </div>

      {/* Table */}
      <Table columns={['Page Title', 'Slug', 'Version', 'Status', 'Updated By', 'Last Updated', 'Actions']}>
        {filtered.map((p) => (
          <tr
            key={p.id}
            className="transition-colors"
            style={{ borderBottom: '1px solid var(--border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText size={16} style={{ color: 'var(--slate)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.title}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '13px' }}>{p.slug}</td>
            <td className="px-4 py-3 text-sm" style={{ color: 'var(--slate)' }}>{p.version}</td>
            <td className="px-4 py-3">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={p.status === 'Published' ? { backgroundColor: '#DCFCE7', color: '#166534' } : { backgroundColor: '#F3F4F6', color: '#374151' }}
              >
                {p.status}
              </span>
            </td>
            <td className="px-4 py-3 text-sm">{p.updatedBy}</td>
            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{p.lastUpdated}</td>
            <td className="px-4 py-3">
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Edit content"
                onClick={() => openEdit(p)}
              >
                <Edit3 size={16} style={{ color: 'var(--text-primary)' }} />
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {/* ─── Full-screen Edit Modal with Rich Text Editor ─── */}
      {editPage && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(11,29,58,0.55)', zIndex: 100, padding: 24 }}
          onClick={closeEdit}
        >
          <div
            className="bg-white rounded-2xl flex flex-col"
            style={{ width: '100%', maxWidth: 1000, maxHeight: 'calc(100vh - 48px)', boxShadow: '0 25px 80px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center"
                  style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--ice)', color: 'var(--navy)' }}
                >
                  <FileText size={20} />
                </div>
                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--text-primary)' }}>
                    Edit Page
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {editPage.version} · Last updated {editPage.lastUpdated}
                  </p>
                </div>
              </div>
              <button
                onClick={closeEdit}
                className="p-2 rounded-lg transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ ...inputStyle, width: '100%', height: 40 }}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Slug <Lock size={12} style={{ color: 'var(--text-muted)' }} />
                  </label>
                  <input
                    type="text"
                    value={editPage.slug}
                    disabled
                    readOnly
                    style={{
                      ...inputStyle, width: '100%', height: 40,
                      fontFamily: 'monospace',
                      backgroundColor: 'var(--ice-warm)',
                      color: 'var(--text-muted)',
                      cursor: 'not-allowed',
                    }}
                  />
                  <p className="mt-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Slug cannot be changed after page creation
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Content
                </label>
                <RichTextEditor initialHtml={editContent} onChange={setEditContent} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--ice-warm)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Changes will create a new version
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={closeEdit}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white', cursor: 'pointer' }}
                >
                  Save Draft
                </button>
                <button
                  onClick={handlePublish}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--navy)', border: 'none', cursor: 'pointer' }}
                >
                  Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add New Page Modal ─── */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Page">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Page Title *
            </label>
            <input
              type="text"
              value={newPage.title}
              onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
              placeholder="e.g. Security Policy"
              style={{ ...inputStyle, width: '100%', height: 40 }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Slug *
            </label>
            <input
              type="text"
              value={newPage.slug}
              onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
              placeholder="/security-policy"
              style={{ ...inputStyle, width: '100%', height: 40, fontFamily: 'monospace', fontSize: 13 }}
            />
            <p className="mt-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              URL path for this page. This cannot be changed later.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Initial Content (optional)
            </label>
            <textarea
              value={newPage.content}
              onChange={(e) => setNewPage({ ...newPage, content: e.target.value })}
              rows={5}
              placeholder="Leave blank to use a default template. You can add rich formatting after creating the page."
              style={{
                width: '100%',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 12,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setShowAddModal(false); setNewPage({ title: '', slug: '', content: '' }); }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddPage}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
              style={{ backgroundColor: 'var(--navy)', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={15} /> Create Page
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
