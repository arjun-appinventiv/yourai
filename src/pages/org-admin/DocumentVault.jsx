import React, { useState, useMemo } from 'react';
import { FileText, Search, AlertCircle, CheckCircle, Download, Eye, Upload } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import { documents, workspaces } from '../../data/mockData';

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: '8px', height: 36,
  padding: '0 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none',
};

export default function DocumentVault() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [wsFilter, setWsFilter] = useState('All');

  const flaggedCount = documents.filter((d) => d.classification === 'Flagged for Review' || d.classification === 'Pending').length;

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'All' && d.type !== typeFilter) return false;
      if (statusFilter !== 'All' && d.status !== statusFilter) return false;
      if (wsFilter !== 'All' && d.workspace !== parseInt(wsFilter)) return false;
      return true;
    });
  }, [search, typeFilter, statusFilter, wsFilter]);

  return (
    <div>
      <PageHeader icon={FileText} title="YourVault" subtitle="All documents across your workspaces." />

      {/* Classification queue banner */}
      {flaggedCount > 0 && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl mb-6"
          style={{ backgroundColor: '#F9E7E7', border: '1px solid #F9E7E7' }}
        >
          <AlertCircle size={16} style={{ color: '#C65454' }} />
          <span style={{ fontSize: '13px', color: '#C65454' }}>
            <strong>{flaggedCount} documents</strong> in the classification queue need review.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1" style={{ maxWidth: 280 }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32, width: '100%' }}
          />
        </div>
        <select value={wsFilter} onChange={(e) => setWsFilter(e.target.value)} style={{ ...inputStyle, width: 200, cursor: 'pointer', backgroundColor: 'white' }}>
          <option value="All">All Workspaces</option>
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: 100, cursor: 'pointer', backgroundColor: 'white' }}>
          <option>All</option>
          <option>PDF</option>
          <option>DOCX</option>
          <option>XLSX</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 120, cursor: 'pointer', backgroundColor: 'white' }}>
          <option>All</option>
          <option>Ready</option>
          <option>Processing</option>
          <option>Failed</option>
        </select>
      </div>

      <Table columns={['Document', 'Workspace', 'Type', 'Size', 'Uploaded By', 'Status', 'Classification', 'Date']}>
        {filtered.map((doc) => {
          const ws = workspaces.find((w) => w.id === doc.workspace);
          return (
            <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{doc.name}</td>
              <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{ws?.name || '--'}</td>
              <td style={{ padding: '12px 16px' }}><Badge variant={doc.type}>{doc.type}</Badge></td>
              <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{doc.size}</td>
              <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{doc.uploadedBy}</td>
              <td style={{ padding: '12px 16px' }}><Badge variant={doc.status}>{doc.status}</Badge></td>
              <td style={{ padding: '12px 16px' }}>
                {doc.classification === 'Flagged for Review' ? (
                  <span className="flex items-center gap-1" style={{ fontSize: '11px', color: '#C65454', fontWeight: 500 }}>
                    <AlertCircle size={12} /> Flagged
                  </span>
                ) : doc.classification === 'Pending' ? (
                  <span style={{ fontSize: '11px', color: '#E8A33D' }}>Pending</span>
                ) : (
                  <span className="flex items-center gap-1" style={{ fontSize: '11px', color: '#5CA868' }}>
                    <CheckCircle size={12} /> Auto-filed
                  </span>
                )}
              </td>
              <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{doc.date}</td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
