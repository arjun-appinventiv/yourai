import React, { useState, useMemo } from 'react';
import { Info, FileText, HardDrive, Clock, Upload, Trash2, Loader, Link2, Plus, ExternalLink, Database } from 'lucide-react';
import { globalKBDocs as initialDocs } from '../../data/mockData';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

const initialLinks = [
  { id: 101, name: 'Cornell Law — Legal Information Institute', url: 'https://www.law.cornell.edu', added: 'Mar 28, 2026', status: 'Indexed' },
  { id: 102, name: 'US Courts — Federal Rules', url: 'https://www.uscourts.gov/rules-policies', added: 'Mar 20, 2026', status: 'Indexed' },
  { id: 103, name: 'SEC EDGAR — Company Filings', url: 'https://www.sec.gov/cgi-bin/browse-edgar', added: 'Mar 15, 2026', status: 'Indexing' },
];

export default function GlobalKnowledgeBase() {
  const [docs, setDocs] = useState(initialDocs);
  const [links, setLinks] = useState(initialLinks);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [fadingId, setFadingId] = useState(null);
  const [deletingLinkId, setDeletingLinkId] = useState(null);
  const [fadingLinkId, setFadingLinkId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const showToast = useToast();

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [docs, search]);

  const filteredLinks = useMemo(() => {
    return links.filter((l) => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.url.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [links, search]);

  const handleDelete = (id) => {
    setFadingId(id);
    setTimeout(() => {
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setDeletingId(null);
      setFadingId(null);
    }, 400);
  };

  const handleDeleteLink = (id) => {
    setFadingLinkId(id);
    setTimeout(() => {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      setDeletingLinkId(null);
      setFadingLinkId(null);
    }, 400);
  };

  const handleAddLink = () => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    const newLink = {
      id: Date.now(),
      name: newLinkName.trim(),
      url: newLinkUrl.trim(),
      added: 'Just now',
      status: 'Indexing',
    };
    setLinks((prev) => [newLink, ...prev]);
    setNewLinkName('');
    setNewLinkUrl('');
    setShowAddLink(false);
    showToast('Link added — indexing will begin shortly');
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
      <PageHeader icon={Database} title="Knowledge Base" subtitle="Manage the global AI knowledge base for all organisations" />
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', borderLeft: '4px solid var(--navy-light)' }}>
        <Info size={20} style={{ color: 'var(--navy-light)', flexShrink: 0, marginTop: 2 }} />
        <p className="text-sm" style={{ color: 'var(--slate)' }}>
          This knowledge base is the AI fallback for all internal users without workspace documents, and for Clients in General Queries mode. Manage content carefully.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={FileText} value={docs.length} label="Documents" />
        <StatCard icon={Link2} value={links.length} label="Links" />
        <StatCard icon={HardDrive} value="22.9 MB" label="Total Size" />
        <StatCard icon={Clock} value="Today" label="Last Updated" />
      </div>

      {/* Upload area */}
      <div className="grid grid-cols-2 gap-4">
        {/* File upload */}
        <div
          className="rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer"
          style={{ border: dragOver ? '2px dashed var(--gold)' : '2px dashed var(--ice)', backgroundColor: dragOver ? '#FFFBEB' : 'white' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
        >
          <Upload size={28} style={{ color: 'var(--text-primary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Drag and drop files here or click to browse</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF, DOCX, XLSX, TXT — Max 100MB per file</p>
          <button className="mt-1 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--navy)' }}>Upload Files</button>
        </div>

        {/* Link add */}
        <div className="rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-white" style={{ border: '2px dashed var(--ice)' }}>
          <Link2 size={28} style={{ color: 'var(--text-primary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Add a web link as a knowledge source</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>URLs will be crawled and indexed for AI queries</p>
          <button onClick={() => setShowAddLink(true)} className="mt-1 px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2" style={{ backgroundColor: 'var(--navy)' }}>
            <Plus size={14} /> Add Link
          </button>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search documents and links..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: '100%', maxWidth: 400 }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* Documents table */}
      <div>
        <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
          Documents
        </h2>
        <Table columns={['File Name', 'Type', 'Size', 'Uploaded', 'Status', 'Actions']}>
          {filtered.map((doc) => (
            <tr key={doc.id} className={`transition-colors ${fadingId === doc.id ? 'row-fade-out' : ''}`} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}>
              <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                <div className="flex items-center gap-2">
                  <FileText size={16} style={{ color: 'var(--slate)' }} />
                  {doc.name}
                </div>
              </td>
              <td className="px-4 py-3"><Badge variant={doc.type}>{doc.type}</Badge></td>
              <td className="px-4 py-3 text-sm">{doc.size}</td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{doc.uploaded}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {doc.status === 'Processing' && <Loader size={14} className="animate-spin" style={{ color: '#92400E' }} />}
                  <Badge variant={doc.status}>{doc.status}</Badge>
                </div>
              </td>
              <td className="px-4 py-3">
                {deletingId === doc.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#991B1B' }}>Are you sure?</span>
                    <button onClick={() => handleDelete(doc.id)} className="text-xs font-medium px-2 py-1 rounded text-white" style={{ backgroundColor: '#991B1B' }}>Yes</button>
                    <button onClick={() => setDeletingId(null)} className="text-xs font-medium px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setDeletingId(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                    <Trash2 size={16} style={{ color: '#991B1B' }} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </div>

      {/* Links table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
            Links
          </h2>
          <button onClick={() => setShowAddLink(true)} className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5" style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}>
            <Plus size={14} /> Add Link
          </button>
        </div>
        <Table columns={['Source Name', 'URL', 'Added', 'Status', 'Actions']}>
          {filteredLinks.map((link) => (
            <tr key={link.id} className={`transition-colors ${fadingLinkId === link.id ? 'row-fade-out' : ''}`} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}>
              <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                <div className="flex items-center gap-2">
                  <Link2 size={16} style={{ color: 'var(--gold)' }} />
                  {link.name}
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '12px' }}>{link.url}</span>
                  <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                </div>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{link.added}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {link.status === 'Indexing' && <Loader size={14} className="animate-spin" style={{ color: '#92400E' }} />}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={link.status === 'Indexed' ? { backgroundColor: '#DCFCE7', color: '#166534' } : { backgroundColor: '#FEF3C7', color: '#92400E' }}>
                    {link.status}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                {deletingLinkId === link.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#991B1B' }}>Remove?</span>
                    <button onClick={() => handleDeleteLink(link.id)} className="text-xs font-medium px-2 py-1 rounded text-white" style={{ backgroundColor: '#991B1B' }}>Yes</button>
                    <button onClick={() => setDeletingLinkId(null)} className="text-xs font-medium px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setDeletingLinkId(link.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Remove">
                    <Trash2 size={16} style={{ color: '#991B1B' }} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </div>

      {/* Add Link Modal */}
      <Modal open={showAddLink} onClose={() => setShowAddLink(false)} title="Add Knowledge Link">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Source Name</label>
            <input type="text" value={newLinkName} onChange={(e) => setNewLinkName(e.target.value)} placeholder="e.g. Cornell Law Institute" style={{ ...inputStyle, width: '100%' }} onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>URL</label>
            <input type="url" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://..." style={{ ...inputStyle, width: '100%' }} onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>The URL will be crawled and indexed. Content will be available for AI queries across all organisations.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAddLink(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}>Cancel</button>
            <button onClick={handleAddLink} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--navy)' }}>Add Link</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
