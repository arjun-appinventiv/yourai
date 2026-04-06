import React, { useState, useMemo } from 'react';
import {
  Info, FileText, HardDrive, Clock, Upload, Trash2, Loader, Link2, Plus, ExternalLink, Database,
  Sparkles, Shield, BookOpen, Settings, CreditCard, MessageCircle, HelpCircle, ChevronRight, Lightbulb, X, ArrowRight
} from 'lucide-react';
import { globalKBDocs as initialDocs, alexIntentTemplates, alexResponseFilters, alexUnknownLog } from '../../data/mockData';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

const iconMap = {
  Sparkles, Shield, BookOpen, Settings, CreditCard, MessageCircle, HelpCircle,
};

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
  const [activeTab, setActiveTab] = useState('legal');
  const showToast = useToast();

  // Alex tab state
  const [templates, setTemplates] = useState(alexIntentTemplates);
  const [filters, setFilters] = useState(alexResponseFilters);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editTemplateText, setEditTemplateText] = useState('');
  const [editFilterToggles, setEditFilterToggles] = useState({});
  const [previewQuery, setPreviewQuery] = useState('');
  const [previewResult, setPreviewResult] = useState('');
  const [showCreateIntent, setShowCreateIntent] = useState(false);
  const [createIntentFrom, setCreateIntentFrom] = useState(null);
  const [newIntentLabel, setNewIntentLabel] = useState('');
  const [newIntentDesc, setNewIntentDesc] = useState('');

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

  const openEditTemplate = (t) => {
    setEditingTemplate(t);
    setEditTemplateText(t.template);
    const toggles = {};
    alexResponseFilters.forEach((f) => {
      toggles[f.id] = t.responseFilters.includes(f.id);
    });
    setEditFilterToggles(toggles);
    setPreviewQuery('');
    setPreviewResult('');
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    const activeFilterIds = Object.entries(editFilterToggles).filter(([, v]) => v).map(([k]) => k);
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === editingTemplate.id
          ? { ...t, template: editTemplateText, responseFilters: activeFilterIds, lastUpdated: 'Just now', updatedBy: 'You' }
          : t
      )
    );
    setEditingTemplate(null);
    showToast('Template saved successfully');
  };

  const handleGeneratePreview = () => {
    if (!previewQuery.trim()) return;
    const preview = editTemplateText
      .replace(/\{[^}]+\}/g, '[...]')
      .substring(0, 200);
    setPreviewResult(preview);
  };

  const handleCreateIntent = () => {
    if (!newIntentLabel.trim()) return;
    const newTemplate = {
      id: Date.now(),
      intent: newIntentLabel.toLowerCase().replace(/\s+/g, '_'),
      label: newIntentLabel.trim(),
      description: newIntentDesc.trim() || 'New intent created from unknown query',
      icon: 'Sparkles',
      llmRequired: true,
      exampleQueries: createIntentFrom ? [createIntentFrom.query] : [],
      template: 'Template for {topic}. Please customise this template.',
      lastUpdated: 'Just now',
      updatedBy: 'You',
      status: 'Draft',
      responseFilters: ['jargon', 'length'],
    };
    setTemplates((prev) => [...prev, newTemplate]);
    setShowCreateIntent(false);
    setCreateIntentFrom(null);
    setNewIntentLabel('');
    setNewIntentDesc('');
    showToast('New intent template created');
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

  const tabStyle = (tab) => ({
    padding: '10px 0',
    marginRight: '28px',
    fontSize: '13px',
    fontWeight: activeTab === tab ? 500 : 400,
    color: activeTab === tab ? 'var(--navy)' : 'var(--text-muted)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${activeTab === tab ? 'var(--navy)' : 'transparent'}`,
  });

  const getFilterLabel = (id) => {
    const f = alexResponseFilters.find((x) => x.id === id);
    return f ? f.label : id;
  };

  const getIconComponent = (iconName) => {
    return iconMap[iconName] || Sparkles;
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

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)' }} className="flex gap-0">
        <button onClick={() => setActiveTab('legal')} style={tabStyle('legal')}>Legal Content</button>
        <button onClick={() => setActiveTab('alex')} style={tabStyle('alex')}>Alex Response Templates</button>
      </div>

      {/* ============================== TAB 1: Legal Content ============================== */}
      {activeTab === 'legal' && (
        <>
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
        </>
      )}

      {/* ============================== TAB 2: Alex Response Templates ============================== */}
      {activeTab === 'alex' && (
        <>
          {/* Sub-section A: Intent Routing Flow Diagram */}
          <div>
            <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
              Intent Routing Flow
            </h2>
            <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-center gap-0 flex-wrap" style={{ minHeight: 60 }}>
                {[
                  { label: 'User Message', bg: '#EDE9FE', color: '#5B21B6' },
                  null,
                  { label: 'Intent Classifier', bg: '#DBEAFE', color: '#1E40AF' },
                  null,
                  { label: 'Known Intent (80%)', bg: '#DCFCE7', color: '#166534' },
                  null,
                  { label: 'Response Filters', bg: '#FEF3C7', color: '#92400E' },
                  null,
                  { label: 'Streamed to User', bg: '#F0F9FF', color: 'var(--navy)' },
                ].map((item, idx) => {
                  if (item === null) {
                    return (
                      <div key={idx} className="flex items-center" style={{ margin: '0 4px' }}>
                        <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: item.bg, color: item.color, whiteSpace: 'nowrap' }}
                    >
                      {item.label}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center mt-3 gap-0">
                <div style={{ width: 200 }} />
                <div style={{ width: 20 }} />
                <div style={{ width: 140 }} />
                <div className="flex flex-col items-center" style={{ marginTop: -8 }}>
                  <div style={{ width: 1, height: 16, backgroundColor: 'var(--border)' }} />
                  <div
                    className="flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: '#FEE2E2', color: '#991B1B', whiteSpace: 'nowrap' }}
                  >
                    Unknown Intent
                  </div>
                  <div style={{ width: 1, height: 16, backgroundColor: 'var(--border)' }} />
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Logged for review</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-section B: Intent Templates */}
          <div>
            <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
              Intent Templates
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {templates.map((t, idx) => {
                const IconComp = getIconComponent(t.icon);
                const isLastOdd = idx === templates.length - 1 && templates.length % 2 !== 0;
                return (
                  <div
                    key={t.id}
                    onClick={() => openEditTemplate(t)}
                    className="bg-white rounded-xl p-5 cursor-pointer transition-all hover:shadow-md"
                    style={{
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      gridColumn: isLastOdd ? '1 / -1' : undefined,
                    }}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)' }}>
                          <IconComp size={14} style={{ color: 'var(--navy)' }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.label}</span>
                      </div>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={t.status === 'Active'
                          ? { backgroundColor: '#DCFCE7', color: '#166534' }
                          : { backgroundColor: '#FEF3C7', color: '#92400E' }
                        }
                      >
                        {t.status}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {t.description}
                    </p>

                    {/* Example queries */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {t.exampleQueries.slice(0, 3).map((q, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                          {q}
                        </span>
                      ))}
                    </div>

                    {/* Template preview */}
                    <div className="rounded-lg px-3 py-2 mb-3" style={{ backgroundColor: 'var(--ice-warm)', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      {t.template.substring(0, 80)}...
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: '1px solid var(--border)', marginBottom: 10 }} />

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {t.responseFilters.map((fId) => (
                          <span key={fId} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#EDE9FE', color: '#5B21B6', fontSize: '10px' }}>
                            {getFilterLabel(fId)}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t.llmRequired ? 'LLM Required' : 'Canned Only'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edit Template Slide-over */}
          {editingTemplate && (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setEditingTemplate(null)}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 40 }}
              />
              {/* Panel */}
              <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
                backgroundColor: 'white', zIndex: 50, overflowY: 'auto',
                boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Header */}
                <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const IC = getIconComponent(editingTemplate.icon);
                      return (
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)' }}>
                          <IC size={18} style={{ color: 'var(--navy)' }} />
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'DM Serif Display', serif" }}>{editingTemplate.label}</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last updated {editingTemplate.lastUpdated} by {editingTemplate.updatedBy}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingTemplate(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <X size={18} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 space-y-5" style={{ overflowY: 'auto' }}>
                  {/* Read-only: Intent ID */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Intent ID</label>
                    <div className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F9FAFB', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>
                      {editingTemplate.intent}
                    </div>
                  </div>

                  {/* Read-only: LLM Required */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>LLM Required</label>
                    <div className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F9FAFB', color: 'var(--text-primary)' }}>
                      {editingTemplate.llmRequired ? 'Yes — full LLM invocation' : 'No — canned response only'}
                    </div>
                  </div>

                  {/* Read-only: Example queries */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Example Queries</label>
                    <div className="flex flex-wrap gap-1.5">
                      {editingTemplate.exampleQueries.map((q, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Editable: Template textarea */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Response Template</label>
                    <textarea
                      value={editTemplateText}
                      onChange={(e) => setEditTemplateText(e.target.value)}
                      style={{
                        ...inputStyle, width: '100%', minHeight: 140, padding: '12px',
                        fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.6',
                        resize: 'vertical', height: 'auto',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <Lightbulb size={14} style={{ color: '#92400E', flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs" style={{ color: '#92400E', lineHeight: '1.5' }}>
                        Use curly-brace variables like {'{feature_name}'}, {'{steps}'}, {'{analogy}'} etc. These are filled by the LLM at runtime.
                      </p>
                    </div>
                  </div>

                  {/* Editable: Filter toggles */}
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Response Filters</label>
                    <div className="space-y-2">
                      {alexResponseFilters.map((f) => (
                        <label key={f.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer" style={{ border: '1px solid var(--border)', backgroundColor: editFilterToggles[f.id] ? 'var(--ice-warm)' : 'white' }}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{f.label}</span>
                          </div>
                          <div
                            onClick={() => setEditFilterToggles((prev) => ({ ...prev, [f.id]: !prev[f.id] }))}
                            className="relative inline-flex items-center cursor-pointer"
                            style={{ width: 36, height: 20 }}
                          >
                            <div style={{
                              width: 36, height: 20, borderRadius: 10,
                              backgroundColor: editFilterToggles[f.id] ? 'var(--navy)' : '#D1D5DB',
                              transition: 'background-color 0.2s',
                              position: 'relative',
                            }}>
                              <div style={{
                                width: 16, height: 16, borderRadius: 8,
                                backgroundColor: 'white', position: 'absolute',
                                top: 2, left: editFilterToggles[f.id] ? 18 : 2,
                                transition: 'left 0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }} />
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Preview section */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Preview</label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Type a sample query..."
                        value={previewQuery}
                        onChange={(e) => setPreviewQuery(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                        onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                      />
                      <button
                        onClick={handleGeneratePreview}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-1.5"
                        style={{ backgroundColor: 'var(--navy)', whiteSpace: 'nowrap' }}
                      >
                        <Sparkles size={13} /> Generate Preview
                      </button>
                    </div>
                    {previewResult && (
                      <div className="rounded-xl p-4" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                        <div className="flex items-start gap-2.5">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--navy)', flexShrink: 0 }}>
                            <MessageCircle size={12} style={{ color: 'white' }} />
                          </div>
                          <p className="text-sm" style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}>{previewResult}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6" style={{ borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}>
                    Cancel
                  </button>
                  <button onClick={handleSaveTemplate} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--navy)' }}>
                    Save Template
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Sub-section C: Response Filters */}
          <div>
            <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
              Response Filters
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {filters.map((f) => {
                const usedBy = templates.filter((t) => t.responseFilters.includes(f.id));
                return (
                  <div key={f.id} className="bg-white rounded-xl p-5" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.label}</span>
                      <div
                        onClick={() => setFilters((prev) => prev.map((x) => x.id === f.id ? { ...x, active: !x.active } : x))}
                        className="relative inline-flex items-center cursor-pointer"
                        style={{ width: 36, height: 20 }}
                      >
                        <div style={{
                          width: 36, height: 20, borderRadius: 10,
                          backgroundColor: f.active ? 'var(--navy)' : '#D1D5DB',
                          transition: 'background-color 0.2s',
                          position: 'relative',
                        }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: 8,
                            backgroundColor: 'white', position: 'absolute',
                            top: 2, left: f.active ? 18 : 2,
                            transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }} />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>{f.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {usedBy.length > 0 ? usedBy.map((t) => (
                          <span key={t.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontSize: '10px' }}>
                            {t.label}
                          </span>
                        )) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No intents</span>
                        )}
                      </div>
                      <span className="text-xs font-medium" style={{ color: '#166534' }}>&lt; 15ms</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-section D: Unknown Queries Log */}
          <div>
            <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
              Unknown Queries Log
            </h2>
            <Table columns={['Time', 'Query', 'Organisation', 'Escalated', 'Actions']}>
              {alexUnknownLog.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.time}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{row.query}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{row.orgName}</td>
                  <td className="px-4 py-3">
                    {row.escalated ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>Escalated</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setCreateIntentFrom(row);
                        setNewIntentLabel('');
                        setNewIntentDesc('');
                        setShowCreateIntent(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                      style={{ border: '1px solid var(--border)', color: 'var(--navy)', backgroundColor: 'white' }}
                    >
                      <Plus size={12} /> Create Intent
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          </div>

          {/* Create Intent Modal */}
          <Modal open={showCreateIntent} onClose={() => { setShowCreateIntent(false); setCreateIntentFrom(null); }} title="Create New Intent">
            <div className="space-y-4">
              {createIntentFrom && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Source Query</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{createIntentFrom.query}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Intent Label</label>
                <input
                  type="text"
                  value={newIntentLabel}
                  onChange={(e) => setNewIntentLabel(e.target.value)}
                  placeholder="e.g. Document Drafting"
                  style={{ ...inputStyle, width: '100%' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Description</label>
                <textarea
                  value={newIntentDesc}
                  onChange={(e) => setNewIntentDesc(e.target.value)}
                  placeholder="When users ask about..."
                  rows={3}
                  style={{ ...inputStyle, width: '100%', height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowCreateIntent(false); setCreateIntentFrom(null); }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}>Cancel</button>
                <button onClick={handleCreateIntent} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--navy)' }}>Create Intent</button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
