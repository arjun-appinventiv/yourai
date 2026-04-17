import React, { useState } from 'react';
import { Users, MessageSquare, FileText, FileBarChart, Database, ArrowLeft, Briefcase } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import { clients, workspaces, documents, orgReports, knowledgePacks } from '../../data/mockData';
import PermissionGate from '../../components/org-admin/PermissionGate';

export default function ClientsPage() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientTab, setClientTab] = useState('profile');

  const clientTabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'documents', label: 'Documents' },
    { key: 'knowledge', label: 'Knowledge Memory' },
  ];

  if (selectedClient) {
    const clientWs = workspaces.filter((w) => selectedClient.workspaces.includes(w.id));
    const clientDocs = documents.filter((d) => selectedClient.workspaces.includes(d.workspace));
    const clientReports = orgReports.filter((r) => selectedClient.workspaces.includes(r.workspace));

    return (
      <PermissionGate allowedRoles={['Admin', 'Manager']}>
        <div>
          <button
            onClick={() => setSelectedClient(null)}
            className="flex items-center gap-1.5 mb-4"
            style={{ fontSize: '13px', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={14} /> Back to Clients
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full flex items-center justify-center text-white" style={{ width: 40, height: 40, backgroundColor: 'var(--slate)', fontSize: '14px', fontWeight: 600 }}>
              {selectedClient.avatar}
            </div>
            <div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '22px', color: 'var(--text-primary)', fontWeight: 400 }}>
                {selectedClient.name}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedClient.company} &middot; {selectedClient.email}</p>
            </div>
          </div>
          <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '16px 0 0' }} />

          {/* Tabs */}
          <div className="flex items-center gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
            {clientTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setClientTab(tab.key)}
                className="px-4 py-3"
                style={{
                  fontSize: '13px',
                  fontWeight: clientTab === tab.key ? 500 : 400,
                  color: clientTab === tab.key ? 'var(--navy)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${clientTab === tab.key ? 'var(--navy)' : 'transparent'}`,
                  background: 'none',
                  border: 'none',
                  borderBottomWidth: 2,
                  borderBottomStyle: 'solid',
                  borderBottomColor: clientTab === tab.key ? 'var(--navy)' : 'transparent',
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ paddingTop: 24 }}>
            {clientTab === 'profile' && (
              <div className="bg-white p-6 rounded-xl" style={{ border: '1px solid var(--border)', maxWidth: 500 }}>
                {[
                  { label: 'Name', value: selectedClient.name },
                  { label: 'Company', value: selectedClient.company },
                  { label: 'Email', value: selectedClient.email },
                  { label: 'Last Active', value: selectedClient.lastActive },
                  { label: 'Unread Messages', value: selectedClient.messages },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            {clientTab === 'sessions' && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12 }}>Linked Workspaces</h4>
                <div className="grid grid-cols-3 gap-4">
                  {clientWs.map((ws) => (
                    <div key={ws.id} className="bg-white p-5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase size={16} style={{ color: 'var(--navy)' }} />
                        <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{ws.name}</h4>
                      </div>
                      <Badge variant={ws.status}>{ws.status}</Badge>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 8 }}>Created {ws.created}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {clientTab === 'documents' && (
              <Table columns={['Document', 'Type', 'Uploaded By', 'Status', 'Date']}>
                {clientDocs.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{doc.name}</td>
                    <td style={{ padding: '12px 16px' }}><Badge variant={doc.type}>{doc.type}</Badge></td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{doc.uploadedBy}</td>
                    <td style={{ padding: '12px 16px' }}><Badge variant={doc.status}>{doc.status}</Badge></td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{doc.date}</td>
                  </tr>
                ))}
              </Table>
            )}


            {clientTab === 'knowledge' && (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Knowledge packs associated with this client's workspaces.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {knowledgePacks.filter((kp) => selectedClient.workspaces.includes(kp.workspace)).map((kp) => (
                    <div key={kp.id} className="bg-white p-5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Database size={16} style={{ color: 'var(--navy)' }} />
                        <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{kp.name}</h4>
                      </div>
                      <div className="flex items-center gap-3" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>{kp.docs} docs</span>
                        <span>{kp.version}</span>
                      </div>
                    </div>
                  ))}
                  {knowledgePacks.filter((kp) => selectedClient.workspaces.includes(kp.workspace)).length === 0 && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', gridColumn: 'span 3', textAlign: 'center', paddingTop: 40 }}>
                      No knowledge packs linked to this client yet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </PermissionGate>
    );
  }

  return (
    <PermissionGate allowedRoles={['Admin', 'Manager']}>
      <div>
        <PageHeader icon={Users} title="Clients" subtitle="Manage your client contacts and portal access." />

        <div className="grid grid-cols-3 gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              onClick={() => { setSelectedClient(client); setClientTab('profile'); }}
              className="bg-white p-5 rounded-xl cursor-pointer transition-all hover:shadow-md"
              style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full flex items-center justify-center text-white" style={{ width: 36, height: 36, backgroundColor: 'var(--slate)', fontSize: '12px', fontWeight: 600 }}>
                  {client.avatar}
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{client.name}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{client.company}</p>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12 }}>{client.email}</p>
              <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div className="flex items-center gap-1.5">
                  <Briefcase size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{client.workspaces.length} workspace{client.workspaces.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12px', color: client.messages > 0 ? '#C65454' : 'var(--text-secondary)' }}>
                    {client.messages} unread
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 8 }}>
                Last active: {client.lastActive}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PermissionGate>
  );
}
