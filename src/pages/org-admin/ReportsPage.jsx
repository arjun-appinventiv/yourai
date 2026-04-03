import React, { useState } from 'react';
import { FileBarChart, Download, Eye, Plus, Package, X, Share } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { orgReports, deliverables, workspaces, clients } from '../../data/mockData';

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: '8px', height: 36,
  padding: '0 12px', fontSize: '13px', color: 'var(--text-primary)', width: '100%', outline: 'none',
};

export default function ReportsPage() {
  const [showDeliverable, setShowDeliverable] = useState(false);
  const showToast = useToast();

  return (
    <div>
      <PageHeader icon={FileBarChart} title="Reports" subtitle="All generated reports and client deliverables." />

      {/* Reports Table */}
      <div className="mb-8">
        <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 16 }}>
          All Reports
        </h3>
        <Table columns={['Report', 'Workspace', 'Type', 'Created By', 'Status', 'Date', 'Format', 'Actions']}>
          {orgReports.map((r) => {
            const ws = workspaces.find((w) => w.id === r.workspace);
            return (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{ws?.name || '--'}</td>
                <td style={{ padding: '12px 16px' }}><Badge>{r.type}</Badge></td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{r.createdBy}</td>
                <td style={{ padding: '12px 16px' }}><Badge variant={r.status === 'Final' ? 'Active' : 'Draft'}>{r.status}</Badge></td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{r.date}</td>
                <td style={{ padding: '12px 16px' }}><Badge variant={r.format}>{r.format}</Badge></td>
                <td style={{ padding: '12px 16px' }}>
                  <div className="flex items-center gap-2">
                    <button className="p-1 rounded hover:bg-gray-50" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                      <Eye size={14} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-50" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                      <Download size={14} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </div>

      {/* Deliverables */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)' }}>
            Client Deliverables
          </h3>
          <button
            onClick={() => setShowDeliverable(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            <Plus size={14} /> Create Deliverable
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {deliverables.map((d) => {
            const client = clients.find((c) => c.id === d.clientId);
            return (
              <div key={d.id} className="bg-white p-5 rounded-xl" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package size={16} style={{ color: 'var(--navy)' }} />
                    <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{d.title}</h4>
                  </div>
                  <Badge variant={d.status === 'Shared' ? 'Active' : 'Draft'}>{d.status}</Badge>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 8 }}>
                  For: {client?.name} ({client?.company}) &middot; Assembled by {d.assembledBy}
                </p>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <strong>Items:</strong> {d.items.join(', ')}
                </div>
                {d.sharedDate && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shared on {d.sharedDate}</p>
                )}
                <div className="flex items-center gap-2 mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ fontSize: '12px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <Eye size={12} /> Preview
                  </button>
                  {d.status === 'Draft' && (
                    <button
                      onClick={() => showToast('Deliverable shared to client portal')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
                      style={{ fontSize: '12px', backgroundColor: 'var(--navy)', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                      <Share size={12} /> Share
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Deliverable Slide-over */}
      {showDeliverable && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(15,23,42,0.4)' }} onClick={() => setShowDeliverable(false)}>
          <div
            className="bg-white h-full overflow-y-auto"
            style={{ width: 480, padding: 28, boxShadow: '-4px 0 20px rgba(0,0,0,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)' }}>
                Create Deliverable
              </h3>
              <button onClick={() => setShowDeliverable(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <div style={{ height: 1, backgroundColor: 'var(--border)', marginBottom: 20 }} />

            <div className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Title</label>
                <input type="text" placeholder="e.g. Client NDA Package" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Client</label>
                <select style={{ ...inputStyle, cursor: 'pointer', backgroundColor: 'white' }}>
                  <option>Select client...</option>
                  {clients.map((c) => <option key={c.id}>{c.name} ({c.company})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Include Reports</label>
                {orgReports.filter((r) => r.status === 'Final').map((r) => (
                  <label key={r.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <input type="checkbox" />
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{r.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowDeliverable(false)} className="px-4 py-2 rounded-lg" style={{ fontSize: '13px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={() => { setShowDeliverable(false); showToast('Deliverable created'); }}
                  className="px-4 py-2 rounded-lg"
                  style={{ fontSize: '13px', backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontWeight: 500, cursor: 'pointer' }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
