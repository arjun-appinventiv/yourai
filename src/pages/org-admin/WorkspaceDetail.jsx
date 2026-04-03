import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, FileText, FileBarChart, Workflow, Database, Users, MessageSquare,
  Upload, Download, Eye, CheckCircle, AlertCircle, Play, Clock, Search, Plus, Send, X, ChevronRight
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import {
  workspaces, documents, orgReports, knowledgePacks, orgUsers,
  workflowRuns, orgWorkflowTemplates, clients, orgMessages, messageThreads
} from '../../data/mockData';

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: '8px', height: 36,
  padding: '0 12px', fontSize: '13px', color: 'var(--text-primary)', width: '100%', outline: 'none',
};

const tabs = [
  { key: 'overview', label: 'Overview', icon: Briefcase },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'reports', label: 'Reports', icon: FileBarChart },
  { key: 'workflows', label: 'Workflows', icon: Workflow },
  { key: 'knowledge', label: 'Knowledge Packs', icon: Database },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
];

export default function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const wsId = parseInt(id);
  const workspace = workspaces.find((w) => w.id === wsId);
  const [activeTab, setActiveTab] = useState('overview');
  const [classifyModal, setClassifyModal] = useState(null);
  const [workflowModal, setWorkflowModal] = useState(false);
  const [workflowStep, setWorkflowStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [reportModal, setReportModal] = useState(false);

  if (!workspace) {
    return (
      <div className="text-center py-20">
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '22px', color: 'var(--text-primary)' }}>
          Workspace Not Found
        </h2>
        <button onClick={() => navigate('/app/workspaces')} className="mt-4 text-sm" style={{ color: 'var(--navy)', cursor: 'pointer', border: 'none', background: 'none' }}>
          Back to Workspaces
        </button>
      </div>
    );
  }

  const wsDocs = documents.filter((d) => d.workspace === wsId);
  const wsReports = orgReports.filter((r) => r.workspace === wsId);
  const wsKnowledge = knowledgePacks.filter((k) => k.workspace === wsId);
  const wsRuns = workflowRuns.filter((r) => r.workspace === wsId);
  const wsClients = clients.filter((c) => c.workspaces.includes(wsId));
  const wsMessages = orgMessages.filter((m) => m.workspace === workspace.name);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <StatCard icon={FileText} value={wsDocs.length} label="Documents" accentColor="var(--navy)" />
              <StatCard icon={FileBarChart} value={wsReports.length} label="Reports" accentColor="var(--gold)" />
              <StatCard icon={Workflow} value={wsRuns.length} label="Workflow Runs" accentColor="#1D4ED8" />
              <StatCard icon={Users} value={workspace.members} label="Members" accentColor="#166534" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-5" style={{ border: '1px solid var(--border)', borderRadius: 12 }}>
                <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 12 }}>
                  Recent Documents
                </h4>
                {wsDocs.slice(0, 4).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <Badge variant={doc.type}>{doc.type}</Badge>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{doc.name}</span>
                    </div>
                    <Badge variant={doc.status}>{doc.status}</Badge>
                  </div>
                ))}
              </div>
              <div className="bg-white p-5" style={{ border: '1px solid var(--border)', borderRadius: 12 }}>
                <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 12 }}>
                  Recent Reports
                </h4>
                {wsReports.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{r.name}</span>
                    <Badge variant={r.status}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div>
            {wsDocs.some((d) => d.classification === 'Flagged for Review' || d.classification === 'Pending') && (
              <div
                className="flex items-center gap-3 p-4 rounded-xl mb-6"
                style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
              >
                <AlertCircle size={16} style={{ color: '#DC2626' }} />
                <span style={{ fontSize: '13px', color: '#991B1B', fontWeight: 500 }}>
                  {wsDocs.filter((d) => d.classification === 'Flagged for Review' || d.classification === 'Pending').length} documents need classification review
                </span>
              </div>
            )}
            <Table columns={['Document', 'Type', 'Size', 'Uploaded By', 'Status', 'Classification', 'Date', 'Actions']}>
              {wsDocs.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{doc.name}</td>
                  <td style={{ padding: '12px 16px' }}><Badge variant={doc.type}>{doc.type}</Badge></td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{doc.size}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{doc.uploadedBy}</td>
                  <td style={{ padding: '12px 16px' }}><Badge variant={doc.status}>{doc.status}</Badge></td>
                  <td style={{ padding: '12px 16px' }}>
                    {doc.classification === 'Flagged for Review' ? (
                      <button
                        onClick={() => setClassifyModal(doc)}
                        className="flex items-center gap-1"
                        style={{ fontSize: '11px', color: '#DC2626', fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        <AlertCircle size={12} /> Review
                      </button>
                    ) : doc.classification === 'Pending' ? (
                      <span style={{ fontSize: '11px', color: '#92400E' }}>Pending</span>
                    ) : (
                      <span className="flex items-center gap-1" style={{ fontSize: '11px', color: '#166534' }}>
                        <CheckCircle size={12} /> Auto-filed
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{doc.date}</td>
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
              ))}
            </Table>
          </div>
        );

      case 'reports':
        return (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setReportModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
              >
                <Plus size={14} /> Generate Report
              </button>
            </div>
            <Table columns={['Report', 'Type', 'Created By', 'Status', 'Date', 'Format', 'Actions']}>
              {wsReports.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{r.name}</td>
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
              ))}
            </Table>
          </div>
        );

      case 'workflows':
        return (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setWorkflowModal(true); setWorkflowStep(0); setSelectedTemplate(null); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
              >
                <Play size={14} /> Run Workflow
              </button>
            </div>
            <Table columns={['Workflow', 'Status', 'Triggered By', 'Date', 'Report']}>
              {wsRuns.map((run) => (
                <tr key={run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{run.template}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge variant={run.status === 'Completed' ? 'Active' : run.status === 'Running' ? 'Processing' : 'Pending'}>
                      {run.status}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{run.triggeredBy}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{run.date}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {run.reportGenerated ? (
                      <span className="flex items-center gap-1" style={{ fontSize: '11px', color: '#166534' }}>
                        <CheckCircle size={12} /> Generated
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>--</span>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        );

      case 'knowledge':
        return (
          <div>
            {wsKnowledge.length === 0 ? (
              <div className="text-center py-16">
                <Database size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No knowledge packs for this workspace yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {wsKnowledge.map((kp) => (
                  <div key={kp.id} className="bg-white p-5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Database size={16} style={{ color: 'var(--navy)' }} />
                      <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{kp.name}</h4>
                    </div>
                    <div className="flex items-center gap-4" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>{kp.docs} docs</span>
                      <span>{kp.version}</span>
                      <span>Used in {kp.usedInChats} chats</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 8 }}>Updated {kp.lastUpdated}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'members':
        return (
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12 }}>Team Members</h4>
            <Table columns={['Member', 'Email', 'Role', 'Status', 'Last Active']}>
              {orgUsers.slice(0, workspace.members).map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full flex items-center justify-center text-white" style={{ width: 28, height: 28, backgroundColor: 'var(--navy)', fontSize: '10px', fontWeight: 600 }}>
                        {u.avatar}
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}><Badge>{u.role}</Badge></td>
                  <td style={{ padding: '12px 16px' }}><Badge variant={u.status}>{u.status}</Badge></td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{u.lastActive}</td>
                </tr>
              ))}
            </Table>
            {wsClients.length > 0 && (
              <>
                <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginTop: 24, marginBottom: 12 }}>Client Contacts</h4>
                <Table columns={['Client', 'Company', 'Email', 'Last Active']}>
                  {wsClients.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-2">
                          <div className="rounded-full flex items-center justify-center text-white" style={{ width: 28, height: 28, backgroundColor: 'var(--slate)', fontSize: '10px', fontWeight: 600 }}>
                            {c.avatar}
                          </div>
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{c.company}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{c.lastActive}</td>
                    </tr>
                  ))}
                </Table>
              </>
            )}
          </div>
        );

      case 'messages':
        return (
          <div>
            {wsMessages.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No messages in this workspace.</p>
              </div>
            ) : (
              wsMessages.map((msg) => {
                const thread = messageThreads[msg.clientId] || [];
                return (
                  <div key={msg.id} className="bg-white rounded-xl mb-4" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{msg.clientName}</span>
                        {msg.unread > 0 && (
                          <span className="rounded-full flex items-center justify-center text-white" style={{ width: 18, height: 18, backgroundColor: '#DC2626', fontSize: '9px', fontWeight: 600 }}>
                            {msg.unread}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{msg.time}</span>
                    </div>
                    <div className="p-5">
                      {thread.map((m, i) => (
                        <div key={i} className={`flex ${m.sender === 'client' ? 'justify-start' : 'justify-end'} mb-3`}>
                          <div
                            className="px-4 py-2.5 rounded-xl"
                            style={{
                              maxWidth: '70%',
                              backgroundColor: m.sender === 'client' ? 'var(--ice-warm)' : 'var(--navy)',
                              color: m.sender === 'client' ? 'var(--text-primary)' : 'white',
                              fontSize: '13px',
                              lineHeight: 1.5,
                            }}
                          >
                            {m.text}
                            <div style={{ fontSize: '10px', color: m.sender === 'client' ? 'var(--text-muted)' : 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                              {m.time}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const workflowSteps = ['Select Template', 'Configure', 'Select Documents', 'Confirm & Run'];

  return (
    <div>
      {/* Back button + header */}
      <button
        onClick={() => navigate('/app/workspaces')}
        className="flex items-center gap-1.5 mb-4"
        style={{ fontSize: '13px', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}
      >
        <ArrowLeft size={14} /> Back to Workspaces
      </button>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '22px', color: 'var(--text-primary)', fontWeight: 400 }}>
            {workspace.name}
          </h1>
          <Badge variant={workspace.status}>{workspace.status}</Badge>
        </div>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 0 }}>
        Created {workspace.created} &middot; Last activity: {workspace.lastActivity}
      </p>
      <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '16px 0 0' }} />

      {/* Tabs */}
      <div className="flex items-center gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-4 py-3 transition-colors"
            style={{
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? 500 : 400,
              color: activeTab === tab.key ? 'var(--navy)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.key ? '2px solid var(--navy)' : '2px solid transparent',
              background: 'none',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === tab.key ? 'var(--navy)' : 'transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 24 }}>
        {renderTab()}
      </div>

      {/* Classification Review Modal */}
      <Modal open={!!classifyModal} onClose={() => setClassifyModal(null)} title="Document Classification Review">
        {classifyModal && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={16} style={{ color: '#DC2626' }} />
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Low Confidence Classification</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg mb-4" style={{ border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong>File:</strong> {classifyModal.name}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 4 }}>
                <strong>AI Suggestion:</strong> General NDA Template (confidence: 61%)
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Assign Classification
              </label>
              <select style={{ ...inputStyle, cursor: 'pointer', backgroundColor: 'white' }}>
                <option>NDA Template</option>
                <option>Contract</option>
                <option>Financial Document</option>
                <option>Compliance Document</option>
                <option>Other</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setClassifyModal(null)}
                className="px-4 py-2 rounded-lg"
                style={{ fontSize: '13px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Skip
              </button>
              <button
                onClick={() => { setClassifyModal(null); showToast('Document classified successfully'); }}
                className="px-4 py-2 rounded-lg"
                style={{ fontSize: '13px', backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontWeight: 500, cursor: 'pointer' }}
              >
                Confirm Classification
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Run Workflow Modal (4-step) */}
      <Modal open={workflowModal} onClose={() => setWorkflowModal(false)} title="Run Workflow">
        <div>
          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-6">
            {workflowSteps.map((step, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1.5">
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 24, height: 24,
                      backgroundColor: i <= workflowStep ? 'var(--navy)' : 'var(--ice)',
                      color: i <= workflowStep ? 'white' : 'var(--text-muted)',
                      fontSize: '11px', fontWeight: 600,
                    }}
                  >
                    {i < workflowStep ? <CheckCircle size={12} /> : i + 1}
                  </div>
                  <span style={{ fontSize: '11px', color: i <= workflowStep ? 'var(--text-primary)' : 'var(--text-muted)' }}>{step}</span>
                </div>
                {i < workflowSteps.length - 1 && (
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {workflowStep === 0 && (
            <div className="flex flex-col gap-2">
              {orgWorkflowTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className="text-left p-3 rounded-lg transition-colors"
                  style={{
                    border: selectedTemplate?.id === t.id ? '2px solid var(--navy)' : '1px solid var(--border)',
                    backgroundColor: selectedTemplate?.id === t.id ? 'rgba(11,29,58,0.03)' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{t.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{t.description}</div>
                </button>
              ))}
            </div>
          )}

          {workflowStep === 1 && (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 12 }}>
                Configure parameters for: <strong>{selectedTemplate?.name}</strong>
              </p>
              <div className="mb-3">
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Output Format</label>
                <select style={{ ...inputStyle, cursor: 'pointer', backgroundColor: 'white' }}>
                  <option>PDF</option>
                  <option>DOCX</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Detail Level</label>
                <select style={{ ...inputStyle, cursor: 'pointer', backgroundColor: 'white' }}>
                  <option>Standard</option>
                  <option>Detailed</option>
                  <option>Executive Summary</option>
                </select>
              </div>
            </div>
          )}

          {workflowStep === 2 && (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 12 }}>Select documents to include:</p>
              {wsDocs.filter((d) => d.status === 'Ready').map((doc) => (
                <label key={doc.id} className="flex items-center gap-2 py-2 cursor-pointer">
                  <input type="checkbox" defaultChecked />
                  <Badge variant={doc.type}>{doc.type}</Badge>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{doc.name}</span>
                </label>
              ))}
            </div>
          )}

          {workflowStep === 3 && (
            <div>
              <div className="bg-gray-50 p-4 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong>Template:</strong> {selectedTemplate?.name}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 4 }}>
                  <strong>Workspace:</strong> {workspace.name}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 4 }}>
                  <strong>Documents:</strong> {wsDocs.filter((d) => d.status === 'Ready').length} selected
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => workflowStep > 0 ? setWorkflowStep(workflowStep - 1) : setWorkflowModal(false)}
              className="px-4 py-2 rounded-lg"
              style={{ fontSize: '13px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {workflowStep === 0 ? 'Cancel' : 'Back'}
            </button>
            <button
              onClick={() => {
                if (workflowStep < 3) {
                  setWorkflowStep(workflowStep + 1);
                } else {
                  setWorkflowModal(false);
                  showToast('Workflow started successfully');
                }
              }}
              disabled={workflowStep === 0 && !selectedTemplate}
              className="px-4 py-2 rounded-lg"
              style={{
                fontSize: '13px', backgroundColor: 'var(--navy)', color: 'white',
                border: 'none', fontWeight: 500, cursor: 'pointer',
                opacity: workflowStep === 0 && !selectedTemplate ? 0.5 : 1,
              }}
            >
              {workflowStep === 3 ? 'Run Workflow' : 'Next'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Generate Report Modal */}
      <Modal open={reportModal} onClose={() => setReportModal(false)} title="Generate Report">
        <div>
          <div className="mb-4">
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Report Type</label>
            <select style={{ ...inputStyle, cursor: 'pointer', backgroundColor: 'white' }}>
              <option>Summary</option>
              <option>Risk Analysis</option>
              <option>Brief</option>
              <option>Due Diligence</option>
            </select>
          </div>
          <div className="mb-4">
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Report Name</label>
            <input type="text" placeholder="Enter report name" style={inputStyle} />
          </div>
          <div className="mb-4">
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Source Documents</label>
            {wsDocs.filter((d) => d.status === 'Ready').map((doc) => (
              <label key={doc.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                <input type="checkbox" defaultChecked />
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{doc.name}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setReportModal(false)} className="px-4 py-2 rounded-lg" style={{ fontSize: '13px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => { setReportModal(false); showToast('Report generation started'); }}
              className="px-4 py-2 rounded-lg"
              style={{ fontSize: '13px', backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontWeight: 500, cursor: 'pointer' }}
            >
              Generate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
