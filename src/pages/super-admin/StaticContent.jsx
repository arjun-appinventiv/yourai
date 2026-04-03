import React, { useState } from 'react';
import { BookOpen, FileText, Eye, Edit3, Globe, CheckCircle, Clock } from 'lucide-react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';

const initialPages = [
  { id: 1, title: 'Terms of Service', slug: '/terms', lastUpdated: 'Mar 28, 2026', updatedBy: 'Arjun P', status: 'Published', version: 'v3.1' },
  { id: 2, title: 'Privacy Policy', slug: '/privacy', lastUpdated: 'Mar 25, 2026', updatedBy: 'Arjun P', status: 'Published', version: 'v2.4' },
  { id: 3, title: 'AI Usage Disclaimer', slug: '/ai-disclaimer', lastUpdated: 'Apr 1, 2026', updatedBy: 'Dev Team', status: 'Published', version: 'v1.8' },
  { id: 4, title: 'Acceptable Use Policy', slug: '/aup', lastUpdated: 'Mar 20, 2026', updatedBy: 'Arjun P', status: 'Published', version: 'v1.2' },
  { id: 5, title: 'Cookie Policy', slug: '/cookies', lastUpdated: 'Feb 15, 2026', updatedBy: 'Dev Team', status: 'Published', version: 'v1.0' },
  { id: 6, title: 'Data Processing Agreement', slug: '/dpa', lastUpdated: 'Mar 30, 2026', updatedBy: 'Arjun P', status: 'Draft', version: 'v2.0-draft' },
  { id: 7, title: 'Help Centre — Getting Started', slug: '/help/getting-started', lastUpdated: 'Mar 22, 2026', updatedBy: 'Dev Team', status: 'Published', version: 'v1.5' },
  { id: 8, title: 'Help Centre — AI Features', slug: '/help/ai-features', lastUpdated: 'Apr 2, 2026', updatedBy: 'Arjun P', status: 'Draft', version: 'v1.1-draft' },
];

export default function StaticContent() {
  const [pages, setPages] = useState(initialPages);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editPage, setEditPage] = useState(null);
  const showToast = useToast();

  const filtered = pages.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    return true;
  });

  const publishedCount = pages.filter((p) => p.status === 'Published').length;
  const draftCount = pages.filter((p) => p.status === 'Draft').length;

  const handlePublish = (id) => {
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, status: 'Published', lastUpdated: 'Just now' } : p));
    showToast('Page published successfully');
    setEditPage(null);
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
      <PageHeader icon={BookOpen} title="Static Content" subtitle="Manage public-facing pages, policies, and help centre content" />

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
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Preview">
                  <Eye size={16} style={{ color: 'var(--slate)' }} />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Edit" onClick={() => setEditPage(p)}>
                  <Edit3 size={16} style={{ color: 'var(--text-primary)' }} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {/* Edit Modal */}
      <Modal open={!!editPage} onClose={() => setEditPage(null)} title={`Edit: ${editPage?.title || ''}`}>
        {editPage && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Page Title</label>
              <input type="text" defaultValue={editPage.title} style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Slug</label>
              <input type="text" defaultValue={editPage.slug} style={{ ...inputStyle, width: '100%', fontFamily: 'monospace', fontSize: '13px' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Content</label>
              <textarea
                rows={6}
                placeholder="Page content (Markdown supported)..."
                style={{ ...inputStyle, width: '100%', resize: 'none' }}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditPage(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { showToast(`"${editPage.title}" saved as draft`); setEditPage(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}
              >
                Save Draft
              </button>
              <button
                onClick={() => handlePublish(editPage.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--navy)' }}
              >
                Publish
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
