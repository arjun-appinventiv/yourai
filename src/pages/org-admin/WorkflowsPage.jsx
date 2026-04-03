import React, { useState } from 'react';
import { Workflow, Play, CheckCircle, Loader, Eye, Clock, ChevronRight, X, Upload, Plus, AlertTriangle, FileText } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { orgWorkflowTemplates as templates, workflowRuns as initialRuns, documents, knowledgePacks, workspaces } from '../../data/mockData';

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: '8px', height: 36,
  padding: '0 12px', fontSize: '13px', color: 'var(--text-primary)', width: '100%', outline: 'none',
};

const statusColors = {
  Completed: { bg: '#DCFCE7', color: '#166534' },
  Running: { bg: '#EFF6FF', color: '#1D4ED8' },
  'Pending Review': { bg: '#FEF3C7', color: '#92400E' },
  Failed: { bg: '#FEE2E2', color: '#991B1B' },
};

const stepStatusStyles = {
  Completed: { bg: '#DCFCE7', color: '#166534' },
  Running: { bg: '#EFF6FF', color: '#1D4ED8' },
  Pending: { bg: '#F1F5F9', color: '#94A3B8' },
};

function StatusBadge({ status }) {
  const s = statusColors[status] || statusColors.Completed;
  return (
    <span className="inline-flex items-center gap-1" style={{ backgroundColor: s.bg, color: s.color, fontSize: '11px', fontWeight: 500, borderRadius: '20px', padding: '2px 10px', lineHeight: '1.5' }}>
      {status === 'Running' && <Loader size={10} className="animate-spin" />}
      {status}
    </span>
  );
}

export default function WorkflowsPage() {
  const [runs, setRuns] = useState(initialRuns);
  const [selectedRun, setSelectedRun] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedWs, setSelectedWs] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  const showToast = useToast();

  const modalSteps = ['Template', 'Documents', 'Knowledge Pack', 'Confirm'];

  const openModal = () => {
    setShowModal(true);
    setModalStep(0);
    setSelectedTemplate(null);
    setSelectedWs('');
    setSelectedDocs([]);
    setSelectedPack(null);
  };

  const handleRun = () => {
    setShowModal(false);
    const t = selectedTemplate;
    const newRun = {
      id: Date.now(),
      templateId: t.id,
      templateName: t.name,
      workspace: workspaces.find(w => w.id === parseInt(selectedWs))?.name || 'Workspace',
      triggeredBy: 'Ryan Melade',
      triggeredAt: 'Just now',
      status: 'Running',
      totalDuration: null,
      reportGenerated: false,
      reportId: null,
      tokenCost: null,
      billedMinutes: null,
      steps: t.steps.map((s, i) => ({
        ...s,
        status: i === 0 ? 'Running' : 'Pending',
        duration: null,
        startedAt: i === 0 ? 'now' : null,
      })),
    };
    setRuns(prev => [newRun, ...prev]);
    showToast(`${t.name} started \u00b7 ${t.totalSteps} steps \u00b7 Est. ${t.avgDuration}`);
  };

  const toggleDoc = (id) => {
    setSelectedDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const wsDocs = documents.filter(d => d.workspace === parseInt(selectedWs));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div style={{ flex: 1 }}>
          <PageHeader icon={Workflow} title="Workflows" subtitle="Run AI pipelines and track execution history." />
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer', marginTop: -20 }}
        >
          <Plus size={14} /> Run Workflow
        </button>
      </div>

      {/* Section 1: Recent Runs */}
      <div className="mb-10">
        <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 16 }}>
          Recent Runs
        </h3>

        <div className="flex flex-col gap-3">
          {runs.map(run => (
            <div
              key={run.id}
              onClick={() => setSelectedRun(run)}
              className="bg-white"
              style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <StatusBadge status={run.status} />
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '15px', color: 'var(--text-primary)' }}>{run.templateName}</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'var(--ice)', padding: '2px 10px', borderRadius: '20px' }}>{run.workspace}</span>
              </div>

              {/* Triggered by */}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12 }}>
                Triggered by {run.triggeredBy} &middot; {run.triggeredAt}
              </div>

              {/* Step progress pills */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {run.steps.map((step, i) => {
                  const ss = stepStatusStyles[step.status] || stepStatusStyles.Pending;
                  return (
                    <div key={step.id || i} className="flex flex-col items-center">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: ss.bg, color: ss.color, fontSize: '11px', fontWeight: 500 }}
                      >
                        {step.status === 'Completed' && <CheckCircle size={10} />}
                        {step.status === 'Running' && <Loader size={10} className="animate-spin" />}
                        {step.name.length > 15 ? step.name.slice(0, 15) + '\u2026' : step.name}
                      </span>
                      {step.async && (
                        <span style={{ fontSize: '9px', color: '#8B5CF6', marginTop: 2, fontWeight: 500 }}>async</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom row */}
              <div className="flex items-center justify-between">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {run.totalDuration && <>Duration: {run.totalDuration}</>}
                  {run.tokenCost && <> &middot; AI Cost: {run.tokenCost}</>}
                  {run.billedMinutes != null && <> &middot; Billed: {run.billedMinutes} min</>}
                  {!run.totalDuration && run.status === 'Running' && 'In progress\u2026'}
                </div>
                <div>
                  {run.status === 'Completed' && run.reportGenerated && (
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ fontSize: '12px', color: '#166534', border: '1px solid #DCFCE7', backgroundColor: 'white', cursor: 'pointer', fontWeight: 500 }}>
                      <Eye size={12} /> View Report
                    </button>
                  )}
                  {run.status === 'Pending Review' && (
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ fontSize: '12px', color: '#92400E', backgroundColor: '#FEF3C7', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                      <AlertTriangle size={12} /> Review &amp; Approve
                    </button>
                  )}
                  {run.status === 'Running' && (
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ fontSize: '12px', color: 'var(--text-secondary)', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 500 }}>
                      <Eye size={12} /> View Progress
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Workflow Templates */}
      <div className="mb-8">
        <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 4 }}>
          Workflow Templates
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 16 }}>Pre-built pipelines for common legal tasks.</p>

        <div className="grid grid-cols-2 gap-4">
          {templates.map(t => (
            <TemplateCard key={t.id} template={t} onRun={() => { setSelectedTemplate(t); openModal(); setSelectedTemplate(t); }} />
          ))}
        </div>
      </div>

      {/* Run Detail Slide-over */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedRun(null)}>
          <div className="w-full bg-white h-full overflow-y-auto" style={{ maxWidth: 480, boxShadow: '-4px 0 20px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)' }}>{selectedRun.templateName}</h3>
                <StatusBadge status={selectedRun.status} />
              </div>
              <button onClick={() => setSelectedRun(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>

            {/* Subheader */}
            <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span style={{ backgroundColor: 'var(--ice)', padding: '2px 8px', borderRadius: '12px', marginRight: 8 }}>{selectedRun.workspace}</span>
              Triggered by {selectedRun.triggeredBy} &middot; {selectedRun.triggeredAt}
            </div>

            {/* Step Timeline */}
            <div className="px-6 py-5">
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Steps</h4>

              <div style={{ position: 'relative' }}>
                {selectedRun.steps.map((step, i) => {
                  const isLast = i === selectedRun.steps.length - 1;
                  const dotColor = step.status === 'Completed' ? '#166534' : step.status === 'Running' ? '#1D4ED8' : '#CBD5E1';
                  const dotBg = step.status === 'Pending' ? 'white' : dotColor;
                  const templateStep = templates.find(t => t.id === selectedRun.templateId)?.steps?.[i];
                  return (
                    <div key={step.id || i} className="flex" style={{ marginBottom: isLast ? 0 : 24, position: 'relative' }}>
                      {/* Timeline line */}
                      {!isLast && (
                        <div style={{ position: 'absolute', left: 7, top: 18, width: 2, bottom: -24, backgroundColor: step.status === 'Completed' ? '#DCFCE7' : '#E2E8F0' }} />
                      )}
                      {/* Dot */}
                      <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: dotBg, border: step.status === 'Pending' ? `2px solid ${dotColor}` : 'none', flexShrink: 0, marginTop: 2, position: 'relative', zIndex: 1 }}>
                        {step.status === 'Running' && (
                          <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '2px solid #1D4ED8', animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.5 }} />
                        )}
                      </div>
                      {/* Content */}
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '13px', fontWeight: step.status === 'Completed' ? 600 : 400, color: step.status === 'Pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{step.name}</span>
                            {templateStep?.parallel && (
                              <span style={{ fontSize: '10px', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '1px 6px', fontWeight: 500 }}>parallel</span>
                            )}
                            {(step.async || templateStep?.async) && (
                              <span style={{ fontSize: '10px', color: '#7C3AED', border: '1px solid #DDD6FE', borderRadius: '10px', padding: '1px 6px', fontWeight: 500 }}>async</span>
                            )}
                          </div>
                          {step.duration && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{step.duration}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {templateStep && (
                            <>
                              <span style={{ fontSize: '10px', backgroundColor: templateStep.agent === 'AG-01' ? 'var(--navy)' : '#475569', color: 'white', padding: '1px 6px', borderRadius: '8px', fontWeight: 500 }}>{templateStep.agent}</span>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{templateStep.skill}</span>
                            </>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                          {step.status === 'Completed' && step.startedAt && `Completed at ${step.startedAt}`}
                          {step.status === 'Running' && 'Running\u2026'}
                          {step.status === 'Pending' && 'Waiting\u2026'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom section */}
            <div className="px-6 pb-6">
              {selectedRun.status === 'Completed' && (
                <div>
                  <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Duration</span>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{selectedRun.totalDuration}</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AI Cost</span>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{selectedRun.tokenCost}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Billed</span>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{selectedRun.billedMinutes} min</span>
                    </div>
                  </div>
                  {selectedRun.reportGenerated && (
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                      <FileText size={14} /> View Report
                    </button>
                  )}
                </div>
              )}

              {selectedRun.status === 'Pending Review' && (
                <div>
                  <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} style={{ color: '#92400E' }} />
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#92400E' }}>Review Required</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.5 }}>This workflow has completed all steps and is awaiting manual review before the report can be filed.</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                      <CheckCircle size={14} /> Approve &amp; File
                    </button>
                    <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg" style={{ color: '#991B1B', fontSize: '13px', fontWeight: 500, border: '1px solid #FCA5A5', backgroundColor: 'white', cursor: 'pointer' }}>
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              )}

              {selectedRun.status === 'Running' && (
                <div>
                  <div className="mb-3">
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Step {selectedRun.steps.filter(s => s.status === 'Completed').length + 1} of {selectedRun.steps.length} in progress
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(selectedRun.steps.filter(s => s.status === 'Completed').length / selectedRun.steps.length) * 100}%`,
                        height: '100%',
                        backgroundColor: '#1D4ED8',
                        borderRadius: 3,
                        transition: 'width 0.5s ease',
                        animation: 'shimmer 1.5s ease-in-out infinite',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Run Workflow Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Run Workflow">
        <div>
          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-6">
            {modalSteps.map((s, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1.5">
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 24, height: 24,
                      backgroundColor: i <= modalStep ? 'var(--navy)' : 'var(--ice)',
                      color: i <= modalStep ? 'white' : 'var(--text-muted)',
                      fontSize: '11px', fontWeight: 600,
                    }}
                  >
                    {i < modalStep ? <CheckCircle size={12} /> : i + 1}
                  </div>
                  <span style={{ fontSize: '11px', color: i <= modalStep ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s}</span>
                </div>
                {i < modalSteps.length - 1 && <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Select Template */}
          {modalStep === 0 && (
            <div className="grid grid-cols-2 gap-2" style={{ maxHeight: 340, overflowY: 'auto' }}>
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className="text-left p-3 rounded-lg"
                  style={{
                    border: selectedTemplate?.id === t.id ? '2px solid var(--navy)' : '1px solid var(--border)',
                    backgroundColor: selectedTemplate?.id === t.id ? 'rgba(11,29,58,0.03)' : 'white',
                    cursor: 'pointer', position: 'relative',
                  }}
                >
                  {selectedTemplate?.id === t.id && (
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <CheckCircle size={14} style={{ color: 'var(--navy)' }} />
                    </div>
                  )}
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{t.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>{t.totalSteps} steps &middot; ~{t.avgDuration}</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Workspace + Documents */}
          {modalStep === 1 && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Workspace</label>
              <select value={selectedWs} onChange={e => setSelectedWs(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', backgroundColor: 'white', marginBottom: 16 }}>
                <option value="">Choose a workspace...</option>
                {workspaces.filter(w => w.status === 'Active').map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>

              {selectedWs && (
                <>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Documents</label>
                  <div className="flex flex-col gap-1" style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {wsDocs.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No documents in this workspace.</p>}
                    {wsDocs.map(doc => (
                      <label key={doc.id} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                        <input type="checkbox" checked={selectedDocs.includes(doc.id)} onChange={() => toggleDoc(doc.id)} />
                        <FileText size={12} style={{ color: 'var(--text-muted)' }} />
                        {doc.name}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Knowledge Pack */}
          {modalStep === 2 && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Knowledge Pack (optional)</label>
              <div className="flex flex-col gap-2">
                {knowledgePacks.map(kp => (
                  <button
                    key={kp.id}
                    onClick={() => setSelectedPack(selectedPack === kp.id ? null : kp.id)}
                    className="text-left p-3 rounded-lg"
                    style={{
                      border: selectedPack === kp.id ? '2px solid var(--navy)' : '1px solid var(--border)',
                      backgroundColor: selectedPack === kp.id ? 'rgba(11,29,58,0.03)' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{kp.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{kp.docs} docs &middot; {kp.version}{kp.prebuilt ? ' \u00b7 Pre-built' : ''}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setSelectedPack(null); setModalStep(3); }}
                style={{ fontSize: '12px', color: '#1D4ED8', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Skip
              </button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {modalStep === 3 && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 6 }}>
                <strong>Template:</strong> {selectedTemplate?.name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 6 }}>
                <strong>Workspace:</strong> {workspaces.find(w => w.id === parseInt(selectedWs))?.name || '--'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 6 }}>
                <strong>Documents:</strong> {selectedDocs.length > 0 ? `${selectedDocs.length} selected` : 'All in workspace'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 6 }}>
                <strong>Knowledge Pack:</strong> {selectedPack ? knowledgePacks.find(k => k.id === selectedPack)?.name : 'None'}
              </div>
              <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '12px 0' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                <strong>Est. Duration:</strong> {selectedTemplate?.avgDuration} &middot; <strong>Steps:</strong> {selectedTemplate?.totalSteps}
              </div>
            </div>
          )}

          {/* Modal nav buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => modalStep > 0 ? setModalStep(modalStep - 1) : setShowModal(false)}
              className="px-4 py-2 rounded-lg"
              style={{ fontSize: '13px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {modalStep === 0 ? 'Cancel' : 'Back'}
            </button>
            <button
              onClick={() => {
                if (modalStep < 3) setModalStep(modalStep + 1);
                else handleRun();
              }}
              disabled={(modalStep === 0 && !selectedTemplate) || (modalStep === 1 && !selectedWs)}
              className="px-4 py-2 rounded-lg"
              style={{
                fontSize: '13px', backgroundColor: 'var(--navy)', color: 'white',
                border: 'none', fontWeight: 500, cursor: 'pointer',
                opacity: (modalStep === 0 && !selectedTemplate) || (modalStep === 1 && !selectedWs) ? 0.5 : 1,
              }}
            >
              {modalStep === 3 ? 'Run Workflow' : 'Next'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Pulse animation style */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes shimmer {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function TemplateCard({ template: t, onRun }) {
  const [hovered, setHovered] = useState(false);
  const previewSteps = t.steps.slice(0, 3);
  const remaining = t.steps.length - 3;

  return (
    <div
      className="bg-white rounded-xl"
      style={{
        border: `1px solid ${hovered ? 'var(--gold)' : 'var(--border)'}`,
        padding: '20px',
        transition: 'all 0.15s',
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '15px', color: 'var(--text-primary)', marginBottom: 6 }}>{t.name}</h4>
      <div className="flex items-center gap-2 mb-2">
        <Badge>{t.vertical}</Badge>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.totalSteps} steps</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>~{t.avgDuration} avg</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {t.useCase}
      </p>
      <div className="flex items-center gap-1 flex-wrap mb-3">
        {previewSteps.map((step, i) => (
          <React.Fragment key={step.id}>
            <span style={{ fontSize: '11px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '10px' }}>{step.name}</span>
            {i < previewSteps.length - 1 && <ChevronRight size={10} style={{ color: '#CBD5E1' }} />}
          </React.Fragment>
        ))}
        {remaining > 0 && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>+{remaining} more</span>}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRun(); }}
        className="flex items-center gap-1"
        style={{ fontSize: '12px', color: hovered ? 'var(--navy)' : 'var(--text-muted)', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 500, padding: 0, transition: 'color 0.15s' }}
      >
        Run this workflow <ChevronRight size={12} />
      </button>
    </div>
  );
}
