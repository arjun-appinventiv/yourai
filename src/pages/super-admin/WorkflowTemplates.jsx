import React, { useState } from 'react';
import { Info, Plus, Pencil, Eye, EyeOff, Workflow, X, Trash2, FileText, Search, Scale, FileOutput, BookOpen, Brain, CheckSquare, ChevronDown, ChevronUp, Sparkles, Upload, File, XCircle } from 'lucide-react';
import { useToast } from '../../components/Toast';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import InfoButton, { InfoSection, InfoText, InfoExample, InfoList } from '../../components/InfoButton';

/* ─── Task types — plain English, maps to agent/skill behind the scenes ─── */
const taskTypes = [
  { id: 'read', icon: FileText, label: 'Read Documents', subtitle: 'Upload and process documents so AI can understand them', agent: 'AG-01', skill: 'document_ingestion', duration: '~2s',
    promptLabel: 'What types of documents should be processed?',
    promptPlaceholder: 'e.g. Contracts, NDAs, engagement letters, financial statements...',
    promptHint: 'Help the AI understand which documents to prioritise and what to look for during parsing.' },
  { id: 'analyse', icon: Search, label: 'Analyse Clauses', subtitle: 'Extract and review key clauses, terms, and obligations', agent: 'AG-01', skill: 'clause_analysis', duration: '~4s',
    promptLabel: 'Which clauses or terms should be analysed?',
    promptPlaceholder: 'e.g. Focus on non-compete, indemnification, limitation of liability, termination, and IP assignment clauses...',
    promptHint: 'Be specific about the clause types you care about. The AI will prioritise these during extraction.' },
  { id: 'compare', icon: Scale, label: 'Compare Against Standard', subtitle: 'Compare against your playbook or standard terms', agent: 'AG-01', skill: 'clause_analysis', duration: '~5s',
    promptLabel: 'What standard should documents be compared against?',
    promptPlaceholder: 'e.g. Compare against our firm\'s standard NDA playbook. Flag any deviation from market-standard terms, especially around non-solicitation and confidentiality scope...',
    promptHint: 'Describe your firm\'s standard terms or reference a knowledge pack. The AI will flag deviations.' },
  { id: 'report', icon: FileOutput, label: 'Generate Report', subtitle: 'Produce a risk memo, summary, or structured report', agent: 'AG-01', skill: 'artifact_generation', duration: '~3s',
    promptLabel: 'What should the report include?',
    promptPlaceholder: 'e.g. Generate a risk assessment memo with: executive summary, key findings grouped by risk level (high/medium/low), specific clause references, and recommended next steps...',
    promptHint: 'Describe the structure and tone of the output. Include sections, format preferences, and any disclaimers.' },
  { id: 'research', icon: BookOpen, label: 'Research Precedents', subtitle: 'Search case law and regulations for relevant citations', agent: 'AG-01', skill: 'precedent_research', duration: '~5s',
    promptLabel: 'What should be researched?',
    promptPlaceholder: 'e.g. Find precedent cases related to non-compete enforceability in New York jurisdiction, post-2020 rulings...',
    promptHint: 'Specify jurisdictions, time periods, legal topics, or specific statutes to focus on.' },
  { id: 'knowledge', icon: Brain, label: 'Update Knowledge Base', subtitle: 'Save extracted entities and relationships for future use', agent: 'AG-02', skill: 'entity_extraction', duration: '~5s',
    promptLabel: 'What information should be saved?',
    promptPlaceholder: 'e.g. Extract and save all parties, key dates, obligations, financial terms, and governing law references...',
    promptHint: 'The AI will store this information so future queries can reference it.' },
  { id: 'compliance', icon: CheckSquare, label: 'Compliance Check', subtitle: 'Check documents against regulatory requirements', agent: 'AG-01', skill: 'clause_analysis', duration: '~4s',
    promptLabel: 'Which regulations or requirements should be checked?',
    promptPlaceholder: 'e.g. Check against SOC 2 requirements, GDPR data processing clauses, and SEC Rule 17a-4 record retention obligations...',
    promptHint: 'List specific regulations, standards, or internal policies the documents should comply with.' },
];

const initialTemplates = [
  { id: 1, name: 'Contract Risk Review', vertical: 'Legal', description: 'Analyses contract clauses against standard market terms and flags deviations requiring human review.', steps: 4, status: 'Active', lastUpdated: 'Apr 1, 2026' },
  { id: 2, name: 'Client Brief Generator', vertical: 'Legal', description: 'Generates a structured client brief from uploaded intake documents and questionnaire responses.', steps: 3, status: 'Active', lastUpdated: 'Mar 28, 2026' },
  { id: 3, name: 'Due Diligence Summary', vertical: 'Legal', description: 'Produces a comprehensive due diligence summary from document review across multiple categories.', steps: 6, status: 'Active', lastUpdated: 'Mar 25, 2026' },
  { id: 4, name: 'Compliance Checklist Audit', vertical: 'Legal', description: 'Runs regulatory compliance checks against uploaded policies and generates gap analysis reports.', steps: 5, status: 'Active', lastUpdated: 'Mar 20, 2026' },
  { id: 5, name: 'Medical Records Analyser', vertical: 'Healthcare', description: 'Extracts and structures key information from medical records for personal injury and malpractice cases.', steps: 4, status: 'Active', lastUpdated: 'Mar 18, 2026' },
  { id: 6, name: 'Financial Statement Review', vertical: 'Finance', description: 'Reviews financial statements and flags anomalies, discrepancies, and areas requiring further investigation.', steps: 5, status: 'Draft', lastUpdated: 'Mar 15, 2026' },
  { id: 7, name: 'Construction Defect Report', vertical: 'Construction', description: 'Generates structured defect reports from site inspection documents and expert analysis.', steps: 4, status: 'Active', lastUpdated: 'Mar 10, 2026' },
  { id: 8, name: 'NDA Review & Redline', vertical: 'Business', description: 'Reviews NDA terms against company standards and produces a redlined version with suggested edits.', steps: 3, status: 'Active', lastUpdated: 'Mar 5, 2026' },
];

const verticalOptions = ['Legal', 'Healthcare', 'Finance', 'Construction', 'Business'];

const verticalColors = {
  Legal: { bg: '#EFF6FF', color: '#1D4ED8' },
  Healthcare: { bg: '#F0FDF4', color: '#166534' },
  Finance: { bg: '#FEF9C3', color: '#92400E' },
  Construction: { bg: '#FEE2E2', color: '#991B1B' },
  Business: { bg: '#F1F5F9', color: '#64748B' },
};

const emptyStep = () => ({ id: `s${Date.now()}`, name: '', taskType: null, instructions: '', referenceFiles: [], parallel: false, async: false, showAdvanced: false });

export default function WorkflowTemplates() {
  const [templates, setTemplates] = useState(initialTemplates);
  const [showCreate, setShowCreate] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const showToast = useToast();

  const [formName, setFormName] = useState('');
  const [formVertical, setFormVertical] = useState('Legal');
  const [formDescription, setFormDescription] = useState('');
  const [formSteps, setFormSteps] = useState([emptyStep()]);
  const [formStatus, setFormStatus] = useState('Draft');
  const [guideStep, setGuideStep] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  const resetForm = () => {
    setFormName(''); setFormVertical('Legal'); setFormDescription(''); setFormSteps([emptyStep()]); setFormStatus('Draft');
  };

  const openCreate = () => { resetForm(); setEditTemplate(null); setShowCreate(true); };
  const openEdit = (t) => {
    setFormName(t.name); setFormVertical(t.vertical); setFormDescription(t.description); setFormStatus(t.status);
    const taskOrder = ['read', 'analyse', 'compare', 'report', 'knowledge', 'compliance', 'research'];
    const defaultInstructions = {
      read: 'Process all uploaded documents including contracts, amendments, and exhibits.',
      analyse: 'Focus on key clauses: indemnification, limitation of liability, termination, IP assignment, non-compete.',
      compare: 'Compare against firm standard playbook terms. Flag any non-market deviations.',
      report: 'Generate a structured risk memo with executive summary, findings by severity, and recommendations.',
      knowledge: 'Extract and save all parties, dates, obligations, and financial terms.',
      compliance: 'Check against applicable regulatory requirements.',
      research: 'Search for relevant precedent cases and regulatory guidance.',
    };
    setFormSteps(Array.from({ length: t.steps }, (_, i) => {
      const taskId = taskOrder[i % 7];
      return { id: `s${i}`, name: `Step ${i + 1}`, taskType: taskId, instructions: defaultInstructions[taskId] || '', referenceFiles: [], parallel: false, async: false, showAdvanced: false };
    }));
    setEditTemplate(t); setShowCreate(true);
  };

  const addStep = () => setFormSteps([...formSteps, emptyStep()]);
  const removeStep = (idx) => { if (formSteps.length > 1) setFormSteps(formSteps.filter((_, i) => i !== idx)); };
  const updateStep = (idx, field, value) => {
    setFormSteps(formSteps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };
  const selectTaskType = (idx, taskId) => {
    const task = taskTypes.find((t) => t.id === taskId);
    setFormSteps(formSteps.map((s, i) => i === idx ? { ...s, taskType: taskId, name: s.name || task?.label || '' } : s));
  };

  const addRefFile = (idx, fileName) => {
    setFormSteps(formSteps.map((s, i) => i === idx ? { ...s, referenceFiles: [...s.referenceFiles, { id: Date.now(), name: fileName, size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`, status: 'Processing' }] } : s));
    // Simulate RAG processing
    setTimeout(() => {
      setFormSteps((prev) => prev.map((s, i) => i === idx ? { ...s, referenceFiles: s.referenceFiles.map((f) => ({ ...f, status: 'Ready' })) } : s));
      showToast(`"${fileName}" processed — AI will use this as reference for this step`);
    }, 2000);
  };

  const removeRefFile = (stepIdx, fileId) => {
    setFormSteps(formSteps.map((s, i) => i === stepIdx ? { ...s, referenceFiles: s.referenceFiles.filter((f) => f.id !== fileId) } : s));
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    if (editTemplate) {
      setTemplates((prev) => prev.map((t) => t.id === editTemplate.id ? { ...t, name: formName, vertical: formVertical, description: formDescription, steps: formSteps.length, status: formStatus, lastUpdated: 'Just now' } : t));
      showToast(`"${formName}" updated successfully`);
    } else {
      setTemplates((prev) => [{ id: Date.now(), name: formName, vertical: formVertical, description: formDescription, steps: formSteps.length, status: formStatus, lastUpdated: 'Just now' }, ...prev]);
      showToast(`"${formName}" created successfully`);
    }
    setShowCreate(false); resetForm(); setEditTemplate(null);
  };

  const toggleStatus = (id) => {
    setTemplates((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const next = t.status === 'Active' ? 'Draft' : 'Active';
      showToast(`"${t.name}" ${next === 'Active' ? 'activated' : 'deactivated'}`);
      return { ...t, status: next };
    }));
  };

  const inputStyle = { border: '1px solid var(--border)', borderRadius: '8px', height: 36, padding: '0 12px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'var(--text-primary)', outline: 'none', width: '100%' };

  const completedSteps = formSteps.filter((s) => s.taskType && s.name);

  return (
    <div className="space-y-6">
      <PageHeader icon={Workflow} title="Workflow Templates" subtitle="Platform-level workflow templates available to all organisations" />

      {/* Visual Guide Banner */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B1D3A 0%, #1A3A6B 100%)', padding: '20px 24px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <Sparkles size={22} style={{ color: 'var(--gold)' }} />
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>New to workflow templates?</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Learn how to build AI-powered workflows in 4 simple steps.</p>
            </div>
          </div>
          <button onClick={() => { setShowGuide(true); setGuideStep(0); }} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--gold)', color: 'var(--navy)' }}>
            <BookOpen size={15} /> View Guide
          </button>
        </div>
      </div>

      {/* Guide Modal — centered popup */}
      {showGuide && (() => {
        const guideSlides = [
          { num: '01', title: 'Name Your Workflow', desc: 'Give your workflow a clear name and choose the practice area. This helps lawyers find the right template quickly.', emoji: '✏️', visual: (
            <div className="space-y-2.5">
              <div className="rounded-lg p-3 bg-white" style={{ border: '1px solid var(--border)' }}><span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Template Name</span><div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>Contract Risk Review</div></div>
              <div className="flex gap-2.5">
                <div className="flex-1 rounded-lg p-3 bg-white" style={{ border: '1px solid var(--border)' }}><span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Practice Area</span><div className="mt-1"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>Legal</span></div></div>
                <div className="flex-1 rounded-lg p-3 bg-white" style={{ border: '1px solid var(--border)' }}><span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span><div className="mt-1"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Draft</span></div></div>
              </div>
            </div>
          )},
          { num: '02', title: 'Pick AI Tasks', desc: 'Select what AI should do at each step. Just click a card — read documents, analyse clauses, generate reports. No coding needed.', emoji: '🧩', visual: (
            <div className="grid grid-cols-4 gap-2">
              {[{ icon: FileText, label: 'Read Docs', sel: true }, { icon: Search, label: 'Analyse', sel: true }, { icon: Scale, label: 'Compare', sel: false }, { icon: FileOutput, label: 'Report', sel: false }].map((t) => (
                <div key={t.label} className="p-3 rounded-lg text-center" style={{ border: t.sel ? '2px solid var(--navy)' : '1px solid var(--border)', backgroundColor: t.sel ? '#EFF6FF' : 'white' }}>
                  <t.icon size={18} style={{ color: t.sel ? 'var(--navy)' : '#CBD5E1', margin: '0 auto 4px' }} />
                  <div style={{ fontSize: '10px', fontWeight: 600, color: t.sel ? 'var(--navy)' : '#CBD5E1' }}>{t.label}</div>
                  {t.sel && <div className="mt-1"><span style={{ fontSize: '9px', color: '#166534' }}>✓</span></div>}
                </div>
              ))}
            </div>
          )},
          { num: '03', title: 'Give Instructions & Upload References', desc: 'Tell the AI what to focus on in plain English. Upload your playbook, checklist, or standard terms — the AI will read and follow them.', emoji: '📋', visual: (
            <div className="space-y-2.5">
              <div className="rounded-lg p-3 bg-white" style={{ border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Which clauses should be analysed?</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Focus on non-compete, indemnification, limitation of liability, and IP assignment clauses.</div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white" style={{ border: '1px solid var(--border)' }}>
                <File size={14} style={{ color: 'var(--navy)' }} />
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>NDA_Playbook_2026.pdf</span>
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '10px', fontWeight: 600 }}>✓ AI-indexed</span>
              </div>
            </div>
          )},
          { num: '04', title: 'Preview & Publish', desc: 'See your full pipeline at a glance. Publish it and every firm on the platform can run this workflow instantly.', emoji: '🚀', visual: (
            <div>
              <div className="flex items-center gap-2 justify-center mb-3">
                {[{ icon: FileText, label: 'Read Docs' }, { icon: Search, label: 'Analyse' }, { icon: FileOutput, label: 'Report' }].map((s, i, a) => (
                  <React.Fragment key={s.label}>
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white" style={{ border: '1px solid var(--border)' }}>
                      <s.icon size={13} style={{ color: 'var(--navy)' }} />
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</span>
                    </div>
                    {i < a.length - 1 && <div style={{ color: 'var(--gold)', fontSize: '16px', fontWeight: 700 }}>→</div>}
                  </React.Fragment>
                ))}
              </div>
              <div className="text-center"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '11px', fontWeight: 500 }}>✓ 3 steps · ~9 seconds · Ready to publish</span></div>
            </div>
          )},
        ];
        const slide = guideSlides[guideStep];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }} onClick={() => setShowGuide(false)}>
            <div className="overflow-hidden" style={{ width: '90%', maxWidth: 760, borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
              {/* Navy header */}
              <div style={{ background: 'linear-gradient(135deg, #0B1D3A 0%, #1A3A6B 100%)', padding: '20px 28px' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles size={18} style={{ color: 'var(--gold)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Getting Started Guide</span>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="p-1.5 rounded-lg" style={{ color: 'rgba(255,255,255,0.5)' }}><X size={16} /></button>
                </div>
                <div className="flex gap-1 mt-4">
                  {guideSlides.map((s, i) => (
                    <button key={i} onClick={() => setGuideStep(i)} className="flex-1 py-1.5 rounded-lg text-center transition-all" style={{ backgroundColor: i === guideStep ? 'rgba(255,255,255,0.15)' : 'transparent', border: i === guideStep ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: i === guideStep ? 'white' : 'rgba(255,255,255,0.4)' }}>{s.num}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Body — split */}
              <div className="flex" style={{ backgroundColor: 'white' }}>
                <div className="flex-1 p-6" style={{ backgroundColor: '#F8FAFC', borderRight: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-center" style={{ minHeight: 180 }}>
                    <div className="w-full" style={{ maxWidth: 320 }}>{slide.visual}</div>
                  </div>
                </div>
                <div className="flex-1 p-6 flex flex-col justify-center">
                  <span className="text-3xl mb-3">{slide.emoji}</span>
                  <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)', marginBottom: 8 }}>{slide.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7' }}>{slide.desc}</p>
                  <div className="flex items-center justify-between mt-6">
                    <div>{guideStep > 0 && <button onClick={() => setGuideStep(guideStep - 1)} style={{ fontSize: '12px', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}>← Back</button>}</div>
                    {guideStep < guideSlides.length - 1 ? (
                      <button onClick={() => setGuideStep(guideStep + 1)} className="px-4 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-1" style={{ backgroundColor: 'var(--navy)' }}>Continue →</button>
                    ) : (
                      <button onClick={() => { setShowGuide(false); openCreate(); }} className="px-4 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-1" style={{ backgroundColor: 'var(--navy)' }}>
                        <Plus size={13} /> Create Your First Template
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>Templates ({templates.length})</h2>
          <InfoButton title="About Workflow Templates">
            <InfoSection title="What are workflow templates?">
              <InfoText>A workflow template is a reusable AI pipeline — a predefined sequence of steps that process documents automatically. Super Admins create templates here, and Org Admins can run them from their workspaces against their own documents.</InfoText>
            </InfoSection>
            <InfoSection title="How workflows run">
              <InfoText>When a user runs a workflow, each step executes in order. Some steps can run in parallel (at the same time as the previous step) or asynchronously (in the background without blocking). The AI handles all orchestration automatically.</InfoText>
              <InfoExample label="Example — Contract Risk Review">Step 1: Read Documents (parse uploaded contracts) → Step 2: Analyse Clauses (extract key terms and obligations) → Step 3: Compare Against Standard (check against firm playbook) → Step 4: Generate Report (produce risk memo with findings)</InfoExample>
            </InfoSection>
            <InfoSection title="Task types explained">
              <InfoList items={[
                "Read Documents — parses and processes uploaded files (PDF, DOCX, XLSX, TXT) so the AI can understand them",
                "Analyse Clauses — extracts and reviews key clauses, terms, obligations, and risk factors",
                "Compare Against Standard — compares document content against a reference standard or playbook you upload",
                "Generate Report — produces structured outputs: risk memos, summaries, briefs, or compliance reports",
                "Research Precedents — searches case law databases and regulations for relevant citations",
                "Update Knowledge Base — saves extracted entities (parties, dates, obligations) to the knowledge graph for future reference",
                "Compliance Check — verifies documents against regulatory requirements and generates gap analysis"
              ]} />
            </InfoSection>
            <InfoSection title="Instructions & reference documents">
              <InfoText>Each step can have custom instructions (in plain English) telling the AI what to focus on. You can also upload a reference document — like a playbook or checklist — that the AI will read and use as context for that specific step.</InfoText>
              <InfoExample label="Example instruction">Focus on non-compete, indemnification, and IP assignment clauses. Flag any deviation from market-standard terms.</InfoExample>
            </InfoSection>
            <InfoSection title="Status: Active vs Draft">
              <InfoList items={[
                "Active — the template is visible to all org admins and can be run from any workspace",
                "Draft — the template is saved but not visible to org admins. Use this to prepare and test templates before publishing."
              ]} />
            </InfoSection>
            <InfoSection title="Impact of changes">
              <InfoText>Changes to active templates take effect immediately for all organisations on the platform. If you need to make significant changes, consider setting the template to Draft first, making your changes, then reactivating it.</InfoText>
            </InfoSection>
          </InfoButton>
        </div>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2" style={{ backgroundColor: 'var(--navy)' }}>
          <Plus size={16} /> Create New Template
        </button>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-2 gap-5">
        {templates.map((t) => (
          <div key={t.id} onClick={() => openEdit(t)} className="bg-white rounded-xl p-5 transition-all hover:shadow-md cursor-pointer" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-base font-medium mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)' }}>{t.name}</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={verticalColors[t.vertical]}>{t.vertical}</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={t.status === 'Active' ? { backgroundColor: '#DCFCE7', color: '#166534' } : { backgroundColor: '#F3F4F6', color: '#374151' }}>{t.status}</span>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--slate)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</p>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t.steps} steps</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Updated {t.lastUpdated}</span>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Edit"><Pencil size={15} style={{ color: 'var(--slate)' }} /></button>
                <button onClick={() => toggleStatus(t.id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title={t.status === 'Active' ? 'Deactivate' : 'Activate'}>
                  {t.status === 'Active' ? <EyeOff size={15} style={{ color: '#991B1B' }} /> : <Eye size={15} style={{ color: '#166534' }} />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Create / Edit Modal — Centered, Full-size ═══ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }} onClick={() => { setShowCreate(false); setEditTemplate(null); }}>
          <div className="bg-white flex flex-col" style={{ width: '90%', maxWidth: 720, maxHeight: '90vh', borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="sticky top-0 bg-white z-10" style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <h3 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '18px' }}>
                  {editTemplate ? 'Edit Template' : 'Create Workflow Template'}
                </h3>
                <button onClick={() => { setShowCreate(false); setEditTemplate(null); }} className="p-1.5 rounded-md" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
              <div className="space-y-6">
                {/* Simple intro */}
                {!editTemplate && (
                  <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <Sparkles size={18} style={{ color: '#166534', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#166534' }}>Build your workflow in simple steps</p>
                      <p style={{ fontSize: '12px', color: '#166534', marginTop: 2, lineHeight: '1.5' }}>
                        Pick what you want the AI to do at each stage — like reading documents, analysing clauses, or generating a report. The AI handles the technical details automatically.
                      </p>
                    </div>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>What should this workflow be called?</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Contract Risk Review, Due Diligence Flow" style={inputStyle} />
                </div>

                {/* Vertical + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Practice area</label>
                    <select value={formVertical} onChange={(e) => setFormVertical(e.target.value)} style={inputStyle}>
                      {verticalOptions.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Status</label>
                    <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} style={inputStyle}>
                      <option value="Draft">Draft — not visible to firms yet</option>
                      <option value="Active">Active — available to all firms</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Describe what this workflow does</label>
                  <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="e.g. Analyses uploaded contracts against standard market terms and generates a risk assessment report with flagged clauses." rows={3} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'none' }} />
                </div>

                {/* Divider */}
                <div style={{ height: 1, backgroundColor: 'var(--border)' }} />

                {/* Steps */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Workflow Steps</label>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>Add the steps in the order they should run. Each step is one AI task.</p>
                    </div>
                    <button onClick={addStep} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ color: 'var(--navy)', border: '1px solid var(--border)', backgroundColor: 'white', cursor: 'pointer' }}>
                      <Plus size={13} /> Add Step
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formSteps.map((step, idx) => {
                      const selectedTask = taskTypes.find((t) => t.id === step.taskType);
                      return (
                        <div key={step.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                          {/* Step header */}
                          <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: 'var(--ice-warm)', borderBottom: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: step.taskType ? 'var(--navy)' : 'var(--text-muted)' }}>
                                {idx + 1}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                {step.name || `Step ${idx + 1}`}
                              </span>
                              {selectedTask && (
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {selectedTask.duration}</span>
                              )}
                            </div>
                            {formSteps.length > 1 && (
                              <button onClick={() => removeStep(idx)} className="p-1 rounded hover:bg-red-50" style={{ color: '#991B1B' }}><Trash2 size={14} /></button>
                            )}
                          </div>

                          <div className="p-4">
                            {/* Task type picker */}
                            <label className="block mb-2" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>What should AI do in this step?</label>
                            <div className="grid grid-cols-4 gap-2 mb-4">
                              {taskTypes.map((task) => {
                                const Icon = task.icon;
                                const selected = step.taskType === task.id;
                                return (
                                  <button
                                    key={task.id}
                                    onClick={() => selectTaskType(idx, task.id)}
                                    className="p-2.5 rounded-lg text-center transition-all relative"
                                    style={{
                                      border: selected ? '2px solid var(--navy)' : '1px solid var(--border)',
                                      backgroundColor: selected ? '#EFF6FF' : 'white',
                                      cursor: 'pointer',
                                    }}
                                    title={task.subtitle}
                                  >
                                    <Icon size={18} style={{ color: selected ? 'var(--navy)' : 'var(--text-muted)', margin: '0 auto 4px' }} />
                                    <div style={{ fontSize: '10px', fontWeight: 500, color: selected ? 'var(--navy)' : 'var(--text-secondary)', lineHeight: '1.3' }}>{task.label}</div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Selected task description */}
                            {selectedTask && (
                              <div className="mb-4 p-2.5 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  <strong style={{ color: 'var(--text-primary)' }}>{selectedTask.label}:</strong> {selectedTask.subtitle}
                                </p>
                              </div>
                            )}

                            {/* Step name */}
                            <label className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Give this step a short name</label>
                            <input type="text" value={step.name} onChange={(e) => updateStep(idx, 'name', e.target.value)} placeholder={selectedTask ? `e.g. ${selectedTask.label}` : 'e.g. Extract Key Clauses'} style={{ ...inputStyle, backgroundColor: 'white' }} />

                            {/* AI Instructions — text + reference docs */}
                            {selectedTask && (
                              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                                <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                  {selectedTask.promptLabel}
                                </label>

                                {/* Instructions textarea */}
                                <textarea
                                  value={step.instructions}
                                  onChange={(e) => updateStep(idx, 'instructions', e.target.value)}
                                  placeholder={selectedTask.promptPlaceholder}
                                  rows={3}
                                  style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'none', backgroundColor: 'var(--ice-warm)', lineHeight: '1.5', borderStyle: 'dashed' }}
                                />

                                {/* Reference document upload */}
                                <div className="mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Reference documents (optional)</span>
                                  </div>
                                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 8, lineHeight: '1.4' }}>
                                    Upload a playbook, checklist, or standard template. The AI will read it and use it as the basis for this step.
                                  </p>

                                  {/* Uploaded files */}
                                  {step.referenceFiles.length > 0 && (
                                    <div className="space-y-1.5 mb-3">
                                      {step.referenceFiles.map((f) => (
                                        <div key={f.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                                          <div className="flex items-center gap-2">
                                            <File size={14} style={{ color: 'var(--navy)' }} />
                                            <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{f.name}</span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.size}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={f.status === 'Ready' ? { backgroundColor: '#DCFCE7', color: '#166534' } : { backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                                              {f.status === 'Ready' ? '✓ Indexed' : '⟳ Processing...'}
                                            </span>
                                            <button onClick={() => removeRefFile(idx, f.id)} className="p-0.5 rounded hover:bg-red-50" style={{ color: 'var(--text-muted)' }}><XCircle size={14} /></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Upload zone */}
                                  <button
                                    onClick={() => {
                                      const names = ['NDA_Playbook_2026.pdf', 'Standard_Terms_v3.docx', 'Compliance_Checklist.pdf', 'Risk_Matrix_Template.xlsx', 'Clause_Library.pdf'];
                                      addRefFile(idx, names[Math.floor(Math.random() * names.length)]);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg transition-colors"
                                    style={{ border: '1px dashed var(--border)', backgroundColor: 'var(--ice-warm)', cursor: 'pointer', color: 'var(--text-muted)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                  >
                                    <Upload size={14} />
                                    <span style={{ fontSize: '12px', fontWeight: 500 }}>Upload reference document</span>
                                  </button>
                                  <p className="mt-1.5" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    PDF, DOCX, XLSX, TXT · The AI will RAG-index this document and use it as context for this step.
                                  </p>
                                </div>

                                {/* Hint */}
                                <div className="mt-3 flex items-start gap-1.5" style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                  <Sparkles size={12} style={{ flexShrink: 0, marginTop: 1, color: 'var(--gold)' }} />
                                  <span>{selectedTask.promptHint}</span>
                                </div>
                              </div>
                            )}

                            {/* Advanced options — collapsed by default */}
                            <div className="mt-3">
                              <button onClick={() => updateStep(idx, 'showAdvanced', !step.showAdvanced)} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}>
                                {step.showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                Advanced options
                              </button>
                              {step.showAdvanced && (
                                <div className="mt-2 p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                                  <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                      <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>Run alongside previous step</span>
                                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Both steps will process at the same time</p>
                                    </div>
                                    <input type="checkbox" checked={step.parallel} onChange={(e) => updateStep(idx, 'parallel', e.target.checked)} style={{ accentColor: 'var(--navy)', width: 16, height: 16 }} />
                                  </label>
                                  <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                      <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>Run in the background</span>
                                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>This step won't block the workflow from continuing</p>
                                    </div>
                                    <input type="checkbox" checked={step.async} onChange={(e) => updateStep(idx, 'async', e.target.checked)} style={{ accentColor: '#8B5CF6', width: 16, height: 16 }} />
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Connector line between steps */}
                          {idx < formSteps.length - 1 && (
                            <div className="flex justify-center -mb-4 relative z-10" style={{ marginTop: -1 }}>
                              <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pipeline Preview */}
                {completedSteps.length > 0 && (
                  <div>
                    <label className="block mb-2" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Your workflow at a glance</label>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                      <div className="flex flex-wrap items-center gap-2">
                        {completedSteps.map((s, i) => {
                          const task = taskTypes.find((t) => t.id === s.taskType);
                          const Icon = task?.icon || Workflow;
                          return (
                            <React.Fragment key={s.id}>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white" style={{ border: '1px solid var(--border)' }}>
                                <Icon size={13} style={{ color: 'var(--navy)' }} />
                                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{s.name}</span>
                              </div>
                              {i < completedSteps.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>→</span>}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      <p className="mt-3" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {completedSteps.length} step{completedSteps.length !== 1 ? 's' : ''} · Estimated total: ~{completedSteps.reduce((sum, s) => {
                          const task = taskTypes.find((t) => t.id === s.taskType);
                          return sum + parseInt(task?.duration?.replace(/[^\d]/g, '') || '3');
                        }, 0)}s
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white flex items-center justify-end gap-3" style={{ padding: '16px 28px', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowCreate(false); setEditTemplate(null); }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleSave} disabled={!formName.trim() || completedSteps.length === 0} className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: formName.trim() && completedSteps.length > 0 ? 'var(--navy)' : '#94A3B8', cursor: formName.trim() && completedSteps.length > 0 ? 'pointer' : 'not-allowed' }}>
                {editTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
