import React, { useState, useMemo, useRef } from 'react';
import {
  Info, FileText, HardDrive, Clock, Upload, Trash2, Loader, Link2, Plus, ExternalLink, Database,
  Sparkles, Shield, BookOpen, Settings, CreditCard, MessageCircle, HelpCircle, ChevronRight, Lightbulb, X, ArrowRight,
  CheckSquare, ChevronDown, Library, File, Bot, Save, RotateCcw, AlertTriangle, CheckCircle, GripVertical,
  Users, Briefcase, Scale, UserCheck, Monitor, Zap, GitBranch, Target, MessageSquare, Eye
} from 'lucide-react';
import { globalKBDocs as initialDocs, alexIntentTemplates, alexResponseFilters, alexUnknownLog } from '../../data/mockData';
import InfoButton, { InfoSection, InfoText, InfoExample, InfoList } from '../../components/InfoButton';
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

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota',
  'Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon',
  'Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah',
  'Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
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

  // ─── Alex tab state — COMMENTED OUT (not in scope, kept for future use) ───
  // const [templates, setTemplates] = useState(alexIntentTemplates);
  // const [filters, setFilters] = useState(alexResponseFilters);
  // const [editingTemplate, setEditingTemplate] = useState(null);
  // const [editTemplateText, setEditTemplateText] = useState('');
  // const [editFilterToggles, setEditFilterToggles] = useState({});
  // const [previewQuery, setPreviewQuery] = useState('');
  // const [previewResult, setPreviewResult] = useState('');
  // const [showCreateIntent, setShowCreateIntent] = useState(false);
  // const [createIntentFrom, setCreateIntentFrom] = useState(null);
  // const [newIntentLabel, setNewIntentLabel] = useState('');
  // const [newIntentDesc, setNewIntentDesc] = useState('');

  // State Law Libraries state
  const [statePacks, setStatePacks] = useState([
    { id: 1, state: 'New York', packs: ['NY Court Rules', 'NY State Laws'], status: 'Active' },
    { id: 2, state: 'California', packs: ['CA Court Rules', 'CA State Laws'], status: 'Active' },
    { id: 3, state: 'Texas', packs: ['TX Court Rules', 'TX State Laws'], status: 'Active' },
    { id: 4, state: 'Florida', packs: ['FL Court Rules'], status: 'Partial' },
    { id: 5, state: 'Illinois', packs: ['IL State Laws'], status: 'Active' },
    { id: 6, state: 'Georgia', packs: [], status: 'Not Set' },
    { id: 7, state: 'Washington', packs: ['WA Court Rules', 'WA State Laws'], status: 'Active' },
    { id: 8, state: 'Massachusetts', packs: ['MA Court Rules'], status: 'Partial' },
  ]);
  const [manageState, setManageState] = useState(null);
  const [showAddState, setShowAddState] = useState(false);
  const [newStateSelection, setNewStateSelection] = useState('');
  const [newStatePackSelections, setNewStatePackSelections] = useState({});
  const [manageAddPackDropdown, setManageAddPackDropdown] = useState(false);
  const [manageUploadExpanded, setManageUploadExpanded] = useState(false);
  const [manageAddDocSelections, setManageAddDocSelections] = useState({});

  // ─── Bot Persona tab state ───
  // CONFIDENCE: 7/10 — Ryan confirmed concept verbally, not written. Rollback-ready.
  // ⚠ OUT OF SCOPE of 18 source docs. Built as wireframe for Ryan visual review.
  const DEFAULT_OPERATIONS = [
    {
      id: 1,
      label: 'General Chat',
      description: 'Default persona for everyday Q&A and conversations.',
      systemPrompt: "You are Alex, a legal AI assistant built for US law firms. You help attorneys and paralegals analyse documents, research legal questions, and draft outputs. You are precise, professional, and always cite your sources.",
      tone: 'formal',
      formatRules: ['cite_source', 'bullet_lists'],
      enabled: true,
    },
    {
      id: 2,
      label: 'Contract Review',
      description: 'Activated when a user uploads a contract for analysis.',
      systemPrompt: "You are Alex, a contract analysis specialist. You identify risks, flag non-standard clauses, and compare terms against the firm's approved playbook. Always cite the clause number and page. Output a risk summary at the end of every analysis.",
      tone: 'formal',
      formatRules: ['cite_source', 'bullet_lists', 'risk_summary'],
      enabled: true,
    },
    {
      id: 3,
      label: 'Legal Research',
      description: 'Activated when the user asks a research question without an attached doc.',
      systemPrompt: "You are Alex, a legal research assistant. You search the knowledge base for relevant statutes, case law, and commentary. Present findings in a structured memo format. Always cite the source and indicate confidence level.",
      tone: 'neutral',
      formatRules: ['cite_source', 'bullet_lists', 'next_action'],
      enabled: true,
    },
    {
      id: 4,
      label: 'Document Drafting',
      description: 'Activated when the user asks to draft or generate a document.',
      systemPrompt: "You are Alex, a legal drafting assistant. You produce professional legal documents, clauses, and letters. Follow the firm's style guide. Always include placeholders for client-specific details and flag any assumptions.",
      tone: 'formal',
      formatRules: ['cite_source', 'next_action'],
      enabled: true,
    },
    {
      id: 5,
      label: 'Compliance Check',
      description: 'Activated for regulatory or policy compliance questions.',
      systemPrompt: "You are Alex, a compliance analysis assistant. You check uploaded documents and policies against regulatory frameworks. Always include a risk level for each finding and recommend corrective actions.",
      tone: 'concise',
      formatRules: ['cite_source', 'risk_summary', 'next_action'],
      enabled: false,
    },
  ];

  const DEFAULT_PERSONA = {
    operations: DEFAULT_OPERATIONS,
    fallbackMessage: "I couldn't find a clear answer in your documents or the knowledge base. Could you clarify what you're looking for, or upload a relevant document?",
    globalDocs: [
      { id: 1, name: 'Federal_Rules_Civil_Procedure.pdf', type: 'PDF', size: '4.2 MB', url: '#' },
      { id: 2, name: 'UCC_Article_2_Commentary.pdf', type: 'PDF', size: '2.8 MB', url: '#' },
      { id: 3, name: 'ABA_Model_Rules_Ethics.docx', type: 'DOCX', size: '1.1 MB', url: '#' },
    ],
    version: 1,
    updatedAt: 'Apr 10, 2026 · 09:14 AM',
    updatedBy: 'Arjun Sharma',
  };

  const [persona, setPersona] = useState(() => {
    try {
      const stored = localStorage.getItem('yourai_bot_persona');
      if (stored) return JSON.parse(stored);
    } catch (_) { /* ignore */ }
    return DEFAULT_PERSONA;
  });
  const [savedPersona, setSavedPersona] = useState(() => {
    try {
      const stored = localStorage.getItem('yourai_bot_persona');
      if (stored) return JSON.parse(stored);
    } catch (_) { /* ignore */ }
    return DEFAULT_PERSONA;
  });
  const [personaDirty, setPersonaDirty] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(true);
  const [editingOp, setEditingOp] = useState(null);
  const [showAddOp, setShowAddOp] = useState(false);
  const personaFileInputRef = useRef(null);

  const TONE_OPTIONS = [
    { id: 'formal', label: 'Formal' },
    { id: 'conversational', label: 'Conversational' },
    { id: 'neutral', label: 'Neutral' },
    { id: 'concise', label: 'Concise' },
  ];

  const FORMAT_RULES = [
    { id: 'cite_source', label: 'Always cite the source document and page number' },
    { id: 'bullet_lists', label: 'Use bullet points for lists of 3 or more items' },
    { id: 'risk_summary', label: 'Always include a risk level summary (High/Medium/Low)' },
    { id: 'next_action', label: 'End every response with a suggested next action' },
  ];

  // TODO: confirm confidence threshold with AI team
  // OQ-pending — do not ship without confirmation
  const INTENT_CONFIDENCE_THRESHOLD = 0.75;

  // ─── Per-Persona Response Format ───
  // Maps to onboarding Step 1 personas (user-personas.md / DEC-060–063)
  const USER_PERSONAS = [
    {
      id: 'partner_senior',
      label: 'Partner / Senior Attorney',
      icon: Briefcase,
      description: 'Decision-makers who need executive summaries, risk assessments, and strategic recommendations.',
      defaults: { tone: 'formal', formatRules: ['cite_source', 'risk_summary', 'next_action'], promptModifier: 'Prioritise strategic implications, risk-reward analysis, and executive-level summaries. Assume deep legal expertise — skip foundational explanations.' },
    },
    {
      id: 'associate_junior',
      label: 'Associate / Junior Attorney',
      icon: Scale,
      description: 'Practitioners who need detailed analysis, case citations, and step-by-step reasoning.',
      defaults: { tone: 'formal', formatRules: ['cite_source', 'bullet_lists', 'next_action'], promptModifier: 'Provide detailed legal analysis with full case citations and statutory references. Include step-by-step reasoning and procedural guidance.' },
    },
    {
      id: 'paralegal_assistant',
      label: 'Paralegal / Legal Assistant',
      icon: UserCheck,
      description: 'Support staff who need clear instructions, checklists, and document-level details.',
      defaults: { tone: 'conversational', formatRules: ['cite_source', 'bullet_lists'], promptModifier: 'Use clear, accessible language. Provide checklists, document references, and actionable steps. Explain legal terms when first used.' },
    },
    {
      id: 'legal_ops_it',
      label: 'Legal Operations / IT',
      icon: Monitor,
      description: 'Tech-focused users who need system-level answers, data references, and configuration guidance.',
      defaults: { tone: 'concise', formatRules: ['bullet_lists', 'next_action'], promptModifier: 'Focus on system configuration, data management, and operational efficiency. Use technical terminology where appropriate. Provide structured outputs.' },
    },
  ];

  const DEFAULT_PERSONA_FORMATS = USER_PERSONAS.reduce((acc, p) => {
    acc[p.id] = { tone: p.defaults.tone, formatRules: [...p.defaults.formatRules], promptModifier: p.defaults.promptModifier, enabled: true };
    return acc;
  }, {});

  const [personaFormats, setPersonaFormats] = useState(DEFAULT_PERSONA_FORMATS);
  const [savedPersonaFormats, setSavedPersonaFormats] = useState(DEFAULT_PERSONA_FORMATS);
  const [expandedPersona, setExpandedPersona] = useState(null);

  const updatePersonaFormat = (personaId, key, value) => {
    setPersonaFormats(prev => ({ ...prev, [personaId]: { ...prev[personaId], [key]: value } }));
    setPersonaDirty(true);
  };

  const togglePersonaFormatRule = (personaId, ruleId) => {
    setPersonaFormats(prev => {
      const current = prev[personaId].formatRules;
      const updated = current.includes(ruleId) ? current.filter(r => r !== ruleId) : [...current, ruleId];
      return { ...prev, [personaId]: { ...prev[personaId], formatRules: updated } };
    });
    setPersonaDirty(true);
  };

  const resetPersonaFormat = (personaId) => {
    const persona = USER_PERSONAS.find(p => p.id === personaId);
    if (persona) {
      setPersonaFormats(prev => ({
        ...prev,
        [personaId]: { tone: persona.defaults.tone, formatRules: [...persona.defaults.formatRules], promptModifier: persona.defaults.promptModifier, enabled: true },
      }));
      setPersonaDirty(true);
    }
  };

  const updatePersona = (key, value) => {
    setPersona(prev => ({ ...prev, [key]: value }));
    setPersonaDirty(true);
  };

  const updateOperation = (opId, key, value) => {
    setPersona(prev => ({
      ...prev,
      operations: prev.operations.map(op => op.id === opId ? { ...op, [key]: value } : op),
    }));
    setPersonaDirty(true);
  };

  const toggleOpFormatRule = (opId, ruleId) => {
    setPersona(prev => ({
      ...prev,
      operations: prev.operations.map(op => {
        if (op.id !== opId) return op;
        const rules = op.formatRules.includes(ruleId)
          ? op.formatRules.filter(r => r !== ruleId)
          : [...op.formatRules, ruleId];
        return { ...op, formatRules: rules };
      }),
    }));
    setPersonaDirty(true);
  };

  const toggleOpEnabled = (opId) => {
    updateOperation(opId, 'enabled', !persona.operations.find(o => o.id === opId)?.enabled);
  };

  const deleteOperation = (opId) => {
    setPersona(prev => ({
      ...prev,
      operations: prev.operations.filter(op => op.id !== opId),
    }));
    setPersonaDirty(true);
    if (editingOp?.id === opId) setEditingOp(null);
  };

  const addOperation = (data) => {
    const newOp = {
      id: Date.now(),
      label: data.label || 'New Operation',
      description: data.description || '',
      systemPrompt: data.systemPrompt || '',
      tone: data.tone || 'formal',
      formatRules: data.formatRules || ['cite_source'],
      enabled: true,
    };
    setPersona(prev => ({ ...prev, operations: [...prev.operations, newOp] }));
    setPersonaDirty(true);
  };

  const handleSavePersona = () => {
    const updated = {
      ...persona,
      version: savedPersona.version + 1,
      updatedAt: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
      updatedBy: 'Arjun Sharma',
    };
    setPersona(updated);
    setSavedPersona(updated);
    setSavedPersonaFormats(JSON.parse(JSON.stringify(personaFormats)));
    setPersonaDirty(false);
    setPersonaSaved(true);
    // Persist to localStorage so ChatView can read it
    try {
      localStorage.setItem('yourai_bot_persona', JSON.stringify(updated));
    } catch (_) { /* quota exceeded — ignore */ }
    showToast('Bot persona saved — changes will apply from the next session', 'success');
  };

  const handleDiscardPersona = () => {
    setPersona(savedPersona);
    setPersonaFormats(JSON.parse(JSON.stringify(savedPersonaFormats)));
    setPersonaDirty(false);
    setEditingOp(null);
    setExpandedPersona(null);
    showToast('Changes discarded', 'info');
  };

  const handlePersonaFileUpload = async (files) => {
    const newDocs = [];
    for (const f of Array.from(files)) {
      const doc = {
        id: Date.now() + newDocs.length,
        name: f.name,
        type: f.name.split('.').pop().toUpperCase(),
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        url: '#',
        content: '',
      };
      // Extract text content for knowledge base context
      try {
        if (f.type === 'text/plain' || f.name.endsWith('.txt') || f.name.endsWith('.md') || f.name.endsWith('.csv')) {
          doc.content = await f.text();
        } else {
          // For PDF/DOCX, store raw text extraction attempt
          doc.content = await f.text().catch(() => '');
        }
        // Truncate to 50k chars to avoid localStorage quota
        if (doc.content.length > 50000) doc.content = doc.content.slice(0, 50000);
      } catch (_) { /* ignore extraction errors */ }
      newDocs.push(doc);
    }
    updatePersona('globalDocs', [...persona.globalDocs, ...newDocs]);
  };

  const handleRemovePersonaDoc = (id) => {
    updatePersona('globalDocs', persona.globalDocs.filter(d => d.id !== id));
  };

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

  // ─── Alex tab handlers — COMMENTED OUT (not in scope, kept for future use) ───
  /*
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
  */

  const handleRemovePackFromState = (stateId, packName) => {
    setStatePacks((prev) =>
      prev.map((s) => {
        if (s.id !== stateId) return s;
        const newPacks = s.packs.filter((p) => p !== packName);
        const newStatus = newPacks.length >= 2 ? 'Active' : newPacks.length === 1 ? 'Partial' : 'Not Set';
        return { ...s, packs: newPacks, status: newStatus };
      })
    );
    if (manageState && manageState.id === stateId) {
      setManageState((prev) => {
        const newPacks = prev.packs.filter((p) => p !== packName);
        const newStatus = newPacks.length >= 2 ? 'Active' : newPacks.length === 1 ? 'Partial' : 'Not Set';
        return { ...prev, packs: newPacks, status: newStatus };
      });
    }
  };

  const handleAddPackToState = (stateId, packName) => {
    setStatePacks((prev) =>
      prev.map((s) => {
        if (s.id !== stateId) return s;
        if (s.packs.includes(packName)) return s;
        const newPacks = [...s.packs, packName];
        const newStatus = newPacks.length >= 2 ? 'Active' : newPacks.length === 1 ? 'Partial' : 'Not Set';
        return { ...s, packs: newPacks, status: newStatus };
      })
    );
    if (manageState && manageState.id === stateId) {
      setManageState((prev) => {
        if (prev.packs.includes(packName)) return prev;
        const newPacks = [...prev.packs, packName];
        const newStatus = newPacks.length >= 2 ? 'Active' : newPacks.length === 1 ? 'Partial' : 'Not Set';
        return { ...prev, packs: newPacks, status: newStatus };
      });
    }
    setManageAddPackDropdown(false);
  };

  const handleManageUploadDoc = (stateId) => {
    const fakeDoc = {
      id: Date.now(),
      name: `Uploaded_${Date.now()}.pdf`,
      type: 'PDF',
      size: '1.2 MB',
      uploaded: 'Just now',
      status: 'Processing',
    };
    setDocs((prev) => [fakeDoc, ...prev]);
    handleAddPackToState(stateId, fakeDoc.name);
    showToast('Document uploaded and assigned to state library');
  };

  const handleAssignSelectedDocs = (stateId) => {
    const selected = Object.entries(manageAddDocSelections).filter(([, v]) => v).map(([k]) => k);
    if (selected.length === 0) return;
    selected.forEach((docName) => {
      handleAddPackToState(stateId, docName);
    });
    setManageAddDocSelections({});
    showToast(`${selected.length} document${selected.length > 1 ? 's' : ''} assigned to ${manageState?.state || 'state'}`);
  };

  const handleSaveNewState = () => {
    if (!newStateSelection) return;
    const selectedPacks = Object.entries(newStatePackSelections).filter(([, v]) => v).map(([k]) => k);
    const newStatus = selectedPacks.length >= 2 ? 'Active' : selectedPacks.length === 1 ? 'Partial' : 'Not Set';
    setStatePacks((prev) => [
      ...prev,
      { id: Date.now(), state: newStateSelection, packs: selectedPacks, status: newStatus },
    ]);
    setShowAddState(false);
    setNewStateSelection('');
    setNewStatePackSelections({});
    showToast(`State library added for ${newStateSelection}`);
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

  // ─── getIconComponent — COMMENTED OUT (only used by Alex tab, kept for future use) ───
  // const getIconComponent = (iconName) => {
  //   return iconMap[iconName] || Sparkles;
  // };

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
        {/* Alex Response Templates tab — COMMENTED OUT (not in scope, kept for future use) */}
        {/* <button onClick={() => setActiveTab('alex')} style={tabStyle('alex')}>Alex Response Templates</button> */}
        <button onClick={() => setActiveTab('persona')} style={tabStyle('persona')}>
          <span className="flex items-center gap-1.5">
            <Bot size={14} /> Bot Persona
          </span>
        </button>
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

          {/* State Law Libraries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--navy)', fontSize: '16px' }}>
                  State Law Libraries
                </h2>
                <InfoButton title="About State Law Libraries">
                  <InfoSection title="What are State Law Libraries?">
                    <InfoText>Each state library is a collection of documents specific to that state's laws, court rules, and regulations. When a law firm user asks a question, the AI automatically pulls from the library that matches their firm's primary jurisdiction.</InfoText>
                  </InfoSection>
                  <InfoSection title="How the AI uses state libraries">
                    <InfoText>During onboarding, each firm selects their primary state. When a user asks a legal question, the AI checks their state library first, then falls back to the global knowledge base. This ensures state-specific answers are prioritised.</InfoText>
                    <InfoExample label="Example">A New York firm user asks 'What are the discovery deadlines?' → AI searches the NY Library first → Returns NY CPLR rules rather than generic federal rules.</InfoExample>
                  </InfoSection>
                  <InfoSection title="Status meanings">
                    <InfoList items={["Active — 2+ documents assigned, library is fully functional", "Partial — only 1 document assigned, library works but coverage is limited", "Not Set — no documents assigned, users fall back to global KB only"]} />
                  </InfoSection>
                  <InfoSection title="Best practices">
                    <InfoList items={["Assign at least 2 documents per state: court rules + state statutes", "Add state-specific practice guides for common areas (real estate, family law)", "Review libraries quarterly to ensure documents are current"]} />
                  </InfoSection>
                </InfoButton>
              </div>
              <button
                onClick={() => { setShowAddState(true); setNewStateSelection(''); setNewStatePackSelections({}); }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--navy)' }}
              >
                <Plus size={14} /> Add State Library
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: 700 }}>
              Assign documents to each state's library. When a firm's primary jurisdiction matches, the AI automatically uses these documents for state-specific legal queries.
            </p>
            {/* Info callout */}
            <div className="flex items-start gap-3 p-3.5 rounded-lg mb-4" style={{ backgroundColor: 'var(--ice-warm)', borderLeft: '4px solid var(--navy)' }}>
              <Lightbulb size={16} style={{ color: 'var(--navy)', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs" style={{ color: 'var(--slate)', lineHeight: '1.5' }}>
                State libraries are automatically matched to firms based on their onboarding jurisdiction. You don't need to manually assign libraries to organisations — just add the documents here and the AI handles the rest.
              </p>
            </div>
            <Table columns={['State', 'Assigned Documents', 'Status', 'Actions']}>
              {statePacks.map((sp) => (
                <tr
                  key={sp.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                >
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    <div className="flex items-center gap-2">
                      <Library size={15} style={{ color: 'var(--navy-light)' }} />
                      {sp.state}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {sp.packs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {sp.packs.map((pack) => (
                          <span
                            key={pack}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#F3F4F6', color: '#374151', fontSize: '11px' }}
                          >
                            <FileText size={10} style={{ color: '#6B7280' }} />
                            {pack}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={
                          sp.status === 'Active'
                            ? { backgroundColor: '#DCFCE7', color: '#166534' }
                            : sp.status === 'Partial'
                            ? { backgroundColor: '#FEF3C7', color: '#92400E' }
                            : { backgroundColor: '#F3F4F6', color: '#374151' }
                        }
                      >
                        {sp.status}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {sp.packs.length > 0 ? `${sp.packs.length} doc${sp.packs.length !== 1 ? 's' : ''}` : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setManageState({ ...sp }); setManageAddDocSelections({}); setManageUploadExpanded(false); }}
                      className="px-3 py-1 rounded-lg font-medium"
                      style={{ border: '1px solid var(--border)', color: 'var(--navy)', fontSize: '12px', backgroundColor: 'white' }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          </div>

          {/* Manage State Library Slide-over */}
          {manageState && (
            <>
              <div
                onClick={() => { setManageState(null); setManageAddPackDropdown(false); setManageAddDocSelections({}); setManageUploadExpanded(false); }}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 40 }}
              />
              <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
                backgroundColor: 'white', zIndex: 50,
                boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Header */}
                <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h3 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '18px' }}>
                      {manageState.state} Library
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={
                          manageState.status === 'Active'
                            ? { backgroundColor: '#DCFCE7', color: '#166534' }
                            : manageState.status === 'Partial'
                            ? { backgroundColor: '#FEF3C7', color: '#92400E' }
                            : { backgroundColor: '#F3F4F6', color: '#374151' }
                        }
                      >
                        {manageState.status}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {manageState.packs.length} document{manageState.packs.length !== 1 ? 's' : ''} assigned
                      </span>
                    </div>
                  </div>
                  <button onClick={() => { setManageState(null); setManageAddPackDropdown(false); setManageAddDocSelections({}); setManageUploadExpanded(false); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <X size={18} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 space-y-6" style={{ overflowY: 'auto' }}>

                  {/* Section 1: Assigned Documents */}
                  <div>
                    <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Assigned Documents</h4>
                    {manageState.packs.length > 0 ? (
                      <div className="space-y-2">
                        {manageState.packs.map((pack) => (
                          <div
                            key={pack}
                            className="flex items-center justify-between px-4 py-3 rounded-lg"
                            style={{ border: '1px solid var(--border)', backgroundColor: 'white' }}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)' }}>
                                <FileText size={14} style={{ color: 'var(--navy)' }} />
                              </div>
                              <div>
                                <span className="text-sm font-medium block" style={{ color: 'var(--text-primary)' }}>{pack}</span>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {pack.toLowerCase().includes('rules') ? 'Court Rules' : pack.toLowerCase().includes('laws') ? 'State Statutes' : 'Legal Document'} · PDF
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemovePackFromState(manageState.id, pack)}
                              className="px-2.5 py-1 rounded font-medium transition-colors hover:bg-red-50"
                              style={{ color: '#991B1B', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 rounded-lg" style={{ border: '1px dashed var(--border)', backgroundColor: 'var(--ice-warm)' }}>
                        <FileText size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No documents assigned to this state yet.</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Use the section below to add documents.</p>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid var(--border)' }} />

                  {/* Section 2: Add More Documents */}
                  <div>
                    <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Add More Documents</h4>
                    {(() => {
                      const availableDocs = docs.filter((d) => !manageState.packs.includes(d.name));
                      const selectedCount = Object.values(manageAddDocSelections).filter(Boolean).length;
                      if (availableDocs.length === 0) {
                        return (
                          <div className="text-center py-4 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All available documents are already assigned to this library.</p>
                          </div>
                        );
                      }
                      return (
                        <>
                          <div className="space-y-1.5" style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                            {availableDocs.map((d) => (
                              <label
                                key={d.id}
                                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                                style={{ borderBottom: '1px solid var(--border)' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!manageAddDocSelections[d.name]}
                                  onChange={(e) => setManageAddDocSelections((prev) => ({ ...prev, [d.name]: e.target.checked }))}
                                  style={{ accentColor: 'var(--navy)', width: 16, height: 16 }}
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  <FileText size={14} style={{ color: 'var(--slate)', flexShrink: 0 }} />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm block truncate" style={{ color: 'var(--text-primary)' }}>{d.name}</span>
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.type} · {d.size}</span>
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                          {selectedCount > 0 && (
                            <button
                              onClick={() => handleAssignSelectedDocs(manageState.id)}
                              className="w-full mt-3 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
                              style={{ backgroundColor: 'var(--navy)' }}
                            >
                              <Plus size={14} /> Assign {selectedCount} Selected Document{selectedCount !== 1 ? 's' : ''}
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid var(--border)' }} />

                  {/* Section 3: Upload New Document (collapsed by default) */}
                  <div>
                    <button
                      onClick={() => setManageUploadExpanded((prev) => !prev)}
                      className="w-full flex items-center justify-between py-2"
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-2">
                        <Upload size={14} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Upload New Document</span>
                      </div>
                      <ChevronDown
                        size={16}
                        style={{
                          color: 'var(--text-muted)',
                          transform: manageUploadExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </button>
                    {manageUploadExpanded && (
                      <div className="mt-3">
                        <div
                          className="rounded-xl p-5 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
                          style={{ border: '2px dashed var(--ice)', backgroundColor: 'var(--ice-warm)' }}
                          onClick={() => handleManageUploadDoc(manageState.id)}
                        >
                          <Upload size={22} style={{ color: 'var(--text-muted)' }} />
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Drag and drop or click to upload</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF, DOCX, XLSX — Max 100MB</p>
                        </div>
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                          Uploaded documents will be added to the global knowledge base and automatically assigned to this state library.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Add State Library Modal */}
          <Modal open={showAddState} onClose={() => setShowAddState(false)} title="Add State Library">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Select State</label>
                <select
                  value={newStateSelection}
                  onChange={(e) => setNewStateSelection(e.target.value)}
                  style={{ ...inputStyle, width: '100%', height: 40, cursor: 'pointer', appearance: 'auto' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                >
                  <option value="">Choose a state...</option>
                  {US_STATES.filter((s) => !statePacks.some((sp) => sp.state === s)).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Assign Documents</label>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Select documents from the global knowledge base to include in this state's library.</p>
                <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  {docs.map((d) => (
                    <label
                      key={d.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <input
                        type="checkbox"
                        checked={!!newStatePackSelections[d.name]}
                        onChange={(e) => setNewStatePackSelections((prev) => ({ ...prev, [d.name]: e.target.checked }))}
                        style={{ accentColor: 'var(--navy)', width: 16, height: 16 }}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <FileText size={14} style={{ color: 'var(--slate)', flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm block truncate" style={{ color: 'var(--text-primary)' }}>{d.name}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.type} · {d.size}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {(() => {
                  const count = Object.values(newStatePackSelections).filter(Boolean).length;
                  return count > 0 ? (
                    <p className="text-xs mt-2 font-medium" style={{ color: 'var(--navy)' }}>{count} document{count !== 1 ? 's' : ''} selected</p>
                  ) : null;
                })()}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowAddState(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}>Cancel</button>
                <button
                  onClick={handleSaveNewState}
                  disabled={!newStateSelection}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: newStateSelection ? 'var(--navy)' : 'var(--navy-mid)', cursor: newStateSelection ? 'pointer' : 'not-allowed' }}
                >
                  Create Library
                </button>
              </div>
            </div>
          </Modal>

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
            <div className="flex items-center gap-2 mb-4">
              <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
                Documents
              </h2>
              <InfoButton title="About Documents">
                <InfoSection title="What are Knowledge Base documents?">
                  <InfoText>These are the fallback documents that the AI uses when an internal user doesn't have any workspace-specific documents, or when a Client uses the General Queries mode. Think of this as the platform's default reference library.</InfoText>
                </InfoSection>
                <InfoSection title="How the AI uses these documents">
                  <InfoText>When a user asks a question, the AI first checks their workspace's documents. If no relevant match is found — or if the user has no workspace — the AI falls back to this global knowledge base.</InfoText>
                  <InfoExample label="Example">A Client asks 'What are the standard NDA terms?' → The AI searches this global KB for NDA-related content → Returns relevant excerpts from 'NDA Standard Clauses Library.docx'</InfoExample>
                </InfoSection>
                <InfoSection title="Supported file types">
                  <InfoList items={["PDF — contracts, court rules, guides (most common)", "DOCX — editable templates, memos, playbooks", "XLSX — glossaries, checklists, structured data", "TXT — plain text reference material"]} />
                </InfoSection>
                <InfoSection title="Processing status">
                  <InfoText>'Ready' means the document has been parsed, chunked, and embedded into the vector store — it's fully searchable by the AI. 'Processing' means chunking and embedding are still in progress (usually takes 30-60 seconds).</InfoText>
                </InfoSection>
              </InfoButton>
            </div>
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
              <div className="flex items-center gap-2">
                <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
                  Links
                </h2>
                <InfoButton title="About Links">
                  <InfoSection title="What are Knowledge Links?">
                    <InfoText>Links are external web resources that the AI can crawl and index. Unlike documents which are static uploads, links are periodically re-crawled to stay up to date.</InfoText>
                  </InfoSection>
                  <InfoSection title="How indexing works">
                    <InfoText>When you add a link, the AI crawler visits the URL, extracts the content, and indexes it into the same vector store as documents. The content becomes searchable alongside your uploaded files.</InfoText>
                    <InfoExample label="Example">Adding 'https://www.law.cornell.edu' → The crawler extracts legal definitions and case summaries → Users can now ask questions like 'What does the UCC say about...' and get answers from Cornell's content.</InfoExample>
                  </InfoSection>
                  <InfoSection title="Status meanings">
                    <InfoList items={["Indexed — content has been crawled and is available for AI queries", "Indexing — crawler is currently processing the URL (typically 2-5 minutes)", "Failed — the URL could not be reached or content could not be extracted"]} />
                  </InfoSection>
                </InfoButton>
              </div>
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

      {/* ============================== TAB 2: Alex Response Templates — DISABLED (not in scope, kept for future use) ============================== */}
      {false && activeTab === 'alex' && (
        <>
          {/* Sub-section A: Intent Routing Flow Diagram */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
                Intent Routing Flow
              </h2>
              <InfoButton title="About Intent Routing">
                <InfoSection title="What is Intent Routing?">
                  <InfoText>Alex (the dashboard assistant) classifies every incoming user message into one of 7 intent categories. This classification happens in under 50ms using a lightweight model — no expensive LLM call needed.</InfoText>
                </InfoSection>
                <InfoSection title="Why templates instead of full LLM?">
                  <InfoText>80% of user questions fall into predictable categories — feature questions, how-to requests, billing queries. For these, Alex retrieves a pre-written template and uses a lightweight LLM to personalise it. This is 10x faster and 50x cheaper than a full LLM invocation.</InfoText>
                  <InfoExample label="Cost comparison">Full LLM call: ~$0.02, ~2 seconds. Template + light rewrite: ~$0.0004, ~200ms.</InfoExample>
                </InfoSection>
                <InfoSection title="The flow">
                  <InfoList items={["1. User sends message to Alex", "2. Intent classifier identifies the category (< 50ms)", "3. If known intent → retrieve template → light LLM rewrite → apply filters → stream response", "4. If unknown intent → full LLM + system prompt → apply filters → stream response", "5. Unknown queries are logged for operator review"]} />
                </InfoSection>
              </InfoButton>
            </div>
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
            <div className="flex items-center gap-2 mb-4">
              <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
                Intent Templates
              </h2>
              <InfoButton title="About Intent Templates">
                <InfoSection title="What is a template?">
                  <InfoText>Each template is a response skeleton with {'{variable}'} placeholders. When Alex matches an intent, it retrieves the template and passes it to a lightweight LLM that fills in the variables with context-appropriate content.</InfoText>
                  <InfoExample label="Template">YourAI's {'{feature_name}'} works like {'{analogy}'}. {'{one_sentence_explanation}'}.</InfoExample>
                  <InfoExample label="After LLM rewrite">YourAI's Knowledge Packs work like a private library for your case documents. Every document you upload becomes searchable AI context.</InfoExample>
                </InfoSection>
                <InfoSection title="Available variables">
                  <InfoList items={["{feature_name} — the feature being asked about", "{analogy} — a simple analogy to explain it", "{steps} — numbered step-by-step instructions", "{plan_requirement} — which plan includes this feature", "{answer} — direct answer to the question", "{billing_topic} — the billing subject", "{config_item} — the setting being configured"]} />
                </InfoSection>
                <InfoSection title="Editing tips">
                  <InfoList items={["Keep templates under 150 words — the Length Enforcer filter will flag longer ones", "Always end with a follow-up question to keep the conversation going", "Use simple language — the Jargon Detector will catch technical terms", "Test your changes using the Preview section before saving"]} />
                </InfoSection>
              </InfoButton>
            </div>
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
            <div className="flex items-center gap-2 mb-4">
              <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
                Response Filters
              </h2>
              <InfoButton title="About Response Filters">
                <InfoSection title="What are response filters?">
                  <InfoText>Filters are post-processing rules applied to every Alex response before it reaches the user. They run in under 100ms total and catch issues that the LLM might miss — like accidentally mentioning a competitor, using technical jargon, or giving legal advice.</InfoText>
                </InfoSection>
                <InfoSection title="Filter types">
                  <InfoList items={["Jargon Detector — replaces words like 'RAG', 'pgvector', 'JWT' with plain English", "Legal Advice Block — catches patterns like 'you should sue' or 'this constitutes breach' and redirects to an attorney", "Competitor Block — prevents mention of Clio, Relativity, Harvey AI, etc.", "Hallucination Check — compares mentioned features against the approved feature list", "Length Enforcer — flags responses over 150 words for review", "Confidence Gate — routes low-confidence responses to the operator escalation log"]} />
                </InfoSection>
                <InfoSection title="Disabling a filter">
                  <InfoText>Disabling a filter removes it from the processing pipeline for ALL intents. Use with caution — for example, disabling the Legal Advice Block means Alex could potentially give legal advice to end users.</InfoText>
                </InfoSection>
              </InfoButton>
            </div>
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
            <div className="flex items-center gap-2 mb-4">
              <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
                Unknown Queries Log
              </h2>
              <InfoButton title="About Unknown Queries">
                <InfoSection title="What is the unknown queries log?">
                  <InfoText>When Alex can't match a user's question to any of the 7 intent categories, it uses the full LLM with a system prompt as fallback. These queries are logged here so you can review them and identify patterns.</InfoText>
                </InfoSection>
                <InfoSection title="Why review these?">
                  <InfoText>If you see the same type of question appearing repeatedly, it might warrant creating a new intent template. This is how the intent system grows over time — new patterns emerge from real user behaviour.</InfoText>
                  <InfoExample label="Example">If 5 users ask 'Does this integrate with NetDocuments?' → That's a pattern → Create a new 'integrations' intent → Write a template → Future users get instant answers</InfoExample>
                </InfoSection>
                <InfoSection title="Escalated vs Logged">
                  <InfoList items={["Escalated — the Confidence Gate filter flagged this response as low-confidence. An operator should review the response that was sent.", "Logged — the query was handled by the full LLM and the response passed all filters. No action needed unless you spot a pattern."]} />
                </InfoSection>
              </InfoButton>
            </div>
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
      {/* ============================== END OF DISABLED TAB 2 ============================== */}

      {/* ============================== TAB 3: Bot Persona ============================== */}
      {/* CONFIDENCE: 7/10 — Ryan confirmed concept, not written. Built as wireframe for visual review. */}
      {/* ⚠ OUT OF SCOPE of 18 source-of-truth documents. Do not treat as confirmed until Ryan signs off after demo. */}
      {activeTab === 'persona' && (
        <>
          {/* Top info banner — explains what this entire tab does */}
          <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: '#EFF6FF', borderLeft: '4px solid #3B82F6' }}>
            <Info size={18} style={{ color: '#1D4ED8', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#1E40AF' }}>What is Bot Persona?</p>
              <p className="text-xs" style={{ color: '#1E40AF', lineHeight: 1.7 }}>
                Bot Persona controls how the AI assistant "Alex" behaves across the entire platform. You can configure <strong>multiple operation modes</strong> — each with its own system prompt, tone, and format rules — so the bot responds differently for contract reviews vs. legal research vs. general chat. You also set the <strong>fallback message</strong> shown when no answer is found, and manage <strong>global knowledge documents</strong> that serve as the platform-wide backup.
              </p>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
                Bot Persona Configuration
              </h2>
              <InfoButton title="Bot Persona — How It Works">
                <InfoSection title="What does this control?">
                  <InfoText>This screen configures Alex, the AI assistant that all tenants interact with. Every setting here is global — no tenant can override it. Only Super Admins can change these values.</InfoText>
                </InfoSection>
                <InfoSection title="Operations = Multiple System Prompts">
                  <InfoText>Instead of one static system prompt, you configure multiple "operations" — each tailored to a specific task. The AI's intent classifier selects the right operation based on what the user is doing (e.g., uploading a contract triggers "Contract Review" mode).</InfoText>
                  <InfoExample label="Example">User uploads a contract → AI automatically uses the "Contract Review" system prompt, which emphasises clause analysis and risk scoring — not the generic chat prompt.</InfoExample>
                </InfoSection>
                <InfoSection title="What is the fallback chain?">
                  <InfoList items={[
                    "1. User sends a message → intent classifier picks the operation",
                    "2. AI searches the user's attached document or knowledge pack first",
                    "3. If no answer found → searches Global Knowledge Documents (uploaded here)",
                    "4. If still no answer → shows the Fallback Message you set below",
                  ]} />
                </InfoSection>
                <InfoSection title="When do changes take effect?">
                  <InfoText>Changes apply from the <strong>next session only</strong>. Any conversation that is already active will finish with the previous persona. This prevents mid-conversation behaviour changes.</InfoText>
                </InfoSection>
              </InfoButton>
              {personaSaved && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                  <CheckCircle size={12} /> Active
                </span>
              )}
              {personaDirty && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                  Unsaved changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>v{savedPersona.version} · Last saved {savedPersona.updatedAt} by {savedPersona.updatedBy}</span>
              <button
                onClick={handleDiscardPersona}
                disabled={!personaDirty}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  border: '1px solid var(--border)',
                  backgroundColor: 'white',
                  color: personaDirty ? 'var(--slate)' : 'var(--text-muted)',
                  cursor: personaDirty ? 'pointer' : 'not-allowed',
                  opacity: personaDirty ? 1 : 0.5,
                }}
              >
                <RotateCcw size={14} /> Discard
              </button>
              <button
                onClick={handleSavePersona}
                disabled={!personaDirty}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{
                  backgroundColor: personaDirty ? 'var(--navy)' : '#94A3B8',
                  cursor: personaDirty ? 'pointer' : 'not-allowed',
                  border: 'none',
                }}
              >
                <Save size={14} /> Save Persona
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column — Operations list + editor */}
            <div className="lg:col-span-2 space-y-6">

              {/* Operations — Multi-prompt cards */}
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Operations</label>
                    <InfoButton title="Operations — Multiple AI Modes">
                      <InfoSection title="What are Operations?">
                        <InfoText>Each operation is a separate AI personality. When a user sends a message, the intent classifier determines which operation to activate. Each operation has its own system prompt, tone, and formatting rules.</InfoText>
                      </InfoSection>
                      <InfoSection title="How does it work?">
                        <InfoList items={[
                          "Each operation has an enable/disable toggle",
                          "Only enabled operations are available to the AI",
                          "The intent classifier picks the best match based on context",
                          "If no specific operation matches, 'General Chat' is used as the default",
                          "You can add custom operations for specialised workflows",
                        ]} />
                      </InfoSection>
                      <InfoSection title="Examples">
                        <InfoExample label="Contract Review">User uploads a contract → AI activates Contract Review mode → emphasises clause analysis, risk scoring, and playbook comparison.</InfoExample>
                        <InfoExample label="Legal Research">User asks "What's the statute of limitations for fraud in California?" → AI activates Legal Research mode → searches KB, presents structured memo with citations.</InfoExample>
                      </InfoSection>
                    </InfoButton>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{persona.operations.filter(o => o.enabled).length} of {persona.operations.length} enabled</span>
                    <button
                      onClick={() => setShowAddOp(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: 'var(--navy)', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                      <Plus size={12} /> Add Operation
                    </button>
                  </div>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Each operation defines a separate AI mode with its own system prompt, tone, and formatting. The intent classifier picks the right one automatically.</p>

                {/* Operation cards */}
                <div className="space-y-3">
                  {persona.operations.map(op => {
                    const isEditing = editingOp?.id === op.id;
                    return (
                      <div key={op.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isEditing ? 'var(--navy)' : 'var(--border)'}`, opacity: op.enabled ? 1 : 0.55, transition: 'all 0.15s' }}>
                        {/* Card header */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                          style={{ backgroundColor: isEditing ? 'var(--ice-warm)' : '#FAFBFC' }}
                          onClick={() => setEditingOp(isEditing ? null : op)}
                        >
                          <div className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, backgroundColor: op.enabled ? 'var(--navy)' : 'var(--border)', flexShrink: 0 }}>
                            <Bot size={16} style={{ color: op.enabled ? 'white' : 'var(--text-muted)' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{op.label}</span>
                              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: op.enabled ? '#DCFCE7' : '#F1F5F9', color: op.enabled ? '#166534' : 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>
                                {op.enabled ? 'ON' : 'OFF'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(10,36,99,0.06)', color: 'var(--navy)', fontSize: 10 }}>
                                {TONE_OPTIONS.find(t => t.id === op.tone)?.label || op.tone}
                              </span>
                            </div>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)', marginTop: 2 }}>{op.description}</p>
                          </div>
                          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleOpEnabled(op.id); }}
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{ border: '1px solid var(--border)', background: 'white', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                              {op.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteOperation(op.id); }}
                              style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              title="Delete operation"
                            >
                              <Trash2 size={14} />
                            </button>
                            <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isEditing ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                          </div>
                        </div>

                        {/* Expanded editor */}
                        {isEditing && (
                          <div className="px-4 pb-4 pt-2 space-y-4" style={{ backgroundColor: 'white' }}>
                            {/* Operation name + description */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Operation Name</label>
                                  <InfoButton title="Operation Name">
                                    <InfoText>A short label for this AI mode. This is shown internally to Super Admins only — users never see this name. Keep it descriptive so you can identify it at a glance.</InfoText>
                                  </InfoButton>
                                </div>
                                <input
                                  value={op.label}
                                  onChange={(e) => updateOperation(op.id, 'label', e.target.value)}
                                  style={{ width: '100%', height: 36, border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }}
                                  onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>When this activates</label>
                                  <InfoButton title="Activation Trigger">
                                    <InfoText>Describe when this operation should be used. The intent classifier reads this description to decide whether to activate this mode. Be specific — vague descriptions lead to misclassification.</InfoText>
                                    <InfoExample label="Good">Activated when a user uploads a contract for analysis.</InfoExample>
                                    <InfoExample label="Bad">Used for documents.</InfoExample>
                                  </InfoButton>
                                </div>
                                <input
                                  value={op.description}
                                  onChange={(e) => updateOperation(op.id, 'description', e.target.value)}
                                  style={{ width: '100%', height: 36, border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }}
                                  onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                                />
                              </div>
                            </div>

                            {/* System prompt */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>System Prompt</label>
                                <InfoButton title="System Prompt">
                                  <InfoSection title="What is a System Prompt?">
                                    <InfoText>The system prompt is the hidden instruction sent to the AI at the very start of every conversation in this mode. It defines the AI's identity, capabilities, and rules. The user never sees this text, but it shapes every response the AI generates.</InfoText>
                                  </InfoSection>
                                  <InfoSection title="Tips for writing a good prompt">
                                    <InfoList items={[
                                      "Start with 'You are Alex, a [role]...' to establish identity",
                                      "Include specific instructions about what to always do (cite sources, include risk levels)",
                                      "Include what to avoid (don't give legal advice, don't speculate)",
                                      "Keep it under 500 words — longer prompts slow response time",
                                      "Test changes in a staging conversation before saving to production",
                                    ]} />
                                  </InfoSection>
                                  <InfoExample label="Example prompt">You are Alex, a contract analysis specialist. You identify risks, flag non-standard clauses, and compare terms against the firm's approved playbook. Always cite the clause number and page.</InfoExample>
                                </InfoButton>
                              </div>
                              <textarea
                                value={op.systemPrompt}
                                onChange={(e) => updateOperation(op.id, 'systemPrompt', e.target.value)}
                                rows={4}
                                style={{ width: '100%', minHeight: 80, border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
                                onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                              />
                            </div>

                            {/* Tone */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Tone</label>
                                <InfoButton title="Tone Setting">
                                  <InfoText>Controls the writing style for this operation. Each mode can have a different tone. For example, "Formal" for contract reviews, "Concise" for compliance checks, "Conversational" for general chat.</InfoText>
                                  <InfoList items={[
                                    "Formal — Professional language, full sentences, structured paragraphs",
                                    "Conversational — Friendly, approachable, uses simpler language",
                                    "Neutral — Balanced, neither overly formal nor casual",
                                    "Concise — Shortest possible answers, bullet points preferred",
                                  ]} />
                                </InfoButton>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {TONE_OPTIONS.map(t => (
                                  <button key={t.id} onClick={() => updateOperation(op.id, 'tone', t.id)} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ border: op.tone === t.id ? '2px solid var(--navy)' : '1px solid var(--border)', backgroundColor: op.tone === t.id ? 'var(--ice-warm)' : 'white', color: op.tone === t.id ? 'var(--navy)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Format rules */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Response Format Rules</label>
                                <InfoButton title="Format Rules">
                                  <InfoText>These rules are appended to the system prompt and instruct the AI on how to structure every response in this mode. Different operations can have different rules — e.g., Contract Review always includes a risk summary, but General Chat does not.</InfoText>
                                  <InfoList items={[
                                    "Cite source — AI always mentions which document and page the answer came from",
                                    "Bullet points — Lists of 3+ items rendered as bullets for readability",
                                    "Risk summary — Every response ends with a High/Medium/Low risk assessment",
                                    "Next action — Every response ends with a suggested next step for the user",
                                  ]} />
                                </InfoButton>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {FORMAT_RULES.map(rule => (
                                  <label key={rule.id} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs" style={{ border: `1px solid ${op.formatRules.includes(rule.id) ? 'var(--navy)' : 'var(--border)'}`, backgroundColor: op.formatRules.includes(rule.id) ? 'var(--ice-warm)' : 'white' }}>
                                    <input type="checkbox" checked={op.formatRules.includes(rule.id)} onChange={() => toggleOpFormatRule(op.id, rule.id)} style={{ accentColor: 'var(--navy)' }} />
                                    <span style={{ color: 'var(--text-primary)' }}>{rule.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fallback Message */}
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Fallback Message</label>
                  <InfoButton title="Fallback Message">
                    <InfoSection title="When is this shown?">
                      <InfoText>This message is displayed to the user when the AI cannot find a relevant answer in either (1) the user's attached document / knowledge pack, or (2) the Global Knowledge Documents uploaded below. It is the last resort in the fallback chain.</InfoText>
                    </InfoSection>
                    <InfoSection title="Fallback chain">
                      <InfoList items={[
                        "1. Search user's attached document / knowledge pack",
                        "2. If no answer → search Global Knowledge Documents",
                        "3. If still no answer → show this fallback message",
                      ]} />
                    </InfoSection>
                    <InfoExample label="Default message">I couldn't find a clear answer in your documents or the knowledge base. Could you clarify what you're looking for, or upload a relevant document?</InfoExample>
                  </InfoButton>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Shown when the bot cannot find an answer in the user's document or the global knowledge base. This is the last step of the fallback chain.</p>
                <input
                  type="text"
                  value={persona.fallbackMessage}
                  onChange={(e) => updatePersona('fallbackMessage', e.target.value)}
                  style={{
                    width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8,
                    padding: '0 12px', fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              {/* Per-Persona Response Format Configuration */}
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Users size={16} style={{ color: 'var(--navy)' }} />
                    <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Per-Persona Response Format</label>
                    <InfoButton title="Per-Persona Format — Tailored Responses by Role">
                      <InfoSection title="What is this?">
                        <InfoText>Different users need different kinds of answers. A <strong>Partner</strong> wants executive summaries and risk assessments. A <strong>Paralegal</strong> wants checklists and clear instructions. This section lets you configure how the AI tailors its response format for each user role selected during onboarding.</InfoText>
                      </InfoSection>
                      <InfoSection title="How does it work?">
                        <InfoList items={[
                          "When a user completes onboarding, they select their role (Step 1)",
                          "That role is stored in their profile and sent with every message",
                          "The AI appends the persona-specific modifiers to the system prompt",
                          "Tone and format rules for the persona override the operation defaults",
                          "If a persona is disabled, the AI uses the operation defaults instead",
                        ]} />
                      </InfoSection>
                      <InfoSection title="Priority order">
                        <InfoText>Operation system prompt → Persona prompt modifier → Persona tone → Persona format rules. The persona settings layer ON TOP of the operation — they don't replace it.</InfoText>
                      </InfoSection>
                      <InfoExample label="Example">User selects "Paralegal / Legal Assistant" during onboarding → AI uses conversational tone, includes checklists, and explains legal terms — even in Contract Review mode.</InfoExample>
                    </InfoButton>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Object.values(personaFormats).filter(p => p.enabled).length} of {USER_PERSONAS.length} active</span>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Configure how Alex adapts its response style for each user role. These settings layer on top of the operation-level prompt — they don't replace it.</p>

                <div className="space-y-3">
                  {USER_PERSONAS.map(up => {
                    const fmt = personaFormats[up.id];
                    const isExpanded = expandedPersona === up.id;
                    const Icon = up.icon;
                    return (
                      <div key={up.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isExpanded ? 'var(--navy)' : 'var(--border)'}`, opacity: fmt.enabled ? 1 : 0.55, transition: 'all 0.15s' }}>
                        {/* Header */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                          style={{ backgroundColor: isExpanded ? 'var(--ice-warm)' : '#FAFBFC' }}
                          onClick={() => setExpandedPersona(isExpanded ? null : up.id)}
                        >
                          <div className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, backgroundColor: fmt.enabled ? 'var(--navy)' : 'var(--border)', flexShrink: 0 }}>
                            <Icon size={16} style={{ color: fmt.enabled ? 'white' : 'var(--text-muted)' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{up.label}</span>
                              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: fmt.enabled ? '#DCFCE7' : '#F1F5F9', color: fmt.enabled ? '#166534' : 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>
                                {fmt.enabled ? 'ACTIVE' : 'OFF'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(10,36,99,0.06)', color: 'var(--navy)', fontSize: 10 }}>
                                {TONE_OPTIONS.find(t => t.id === fmt.tone)?.label || fmt.tone}
                              </span>
                            </div>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)', marginTop: 2 }}>{up.description}</p>
                          </div>
                          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); updatePersonaFormat(up.id, 'enabled', !fmt.enabled); }}
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{ border: '1px solid var(--border)', background: 'white', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                              {fmt.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); resetPersonaFormat(up.id); }}
                              style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              title="Reset to defaults"
                            >
                              <RotateCcw size={13} />
                            </button>
                            <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                          </div>
                        </div>

                        {/* Expanded editor */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 space-y-4" style={{ backgroundColor: 'white' }}>
                            {/* Prompt modifier */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Prompt Modifier</label>
                                <InfoButton title="Prompt Modifier">
                                  <InfoText>This text is appended to the operation's system prompt when the user has this persona. It customises the AI's behaviour for their specific role without changing the core operation. For example, a Paralegal modifier might say "explain legal terms when first used" — that gets added to Contract Review, Legal Research, etc.</InfoText>
                                  <InfoExample label="How it's applied">Final prompt = Operation system prompt + "\n\nPersona: " + this modifier</InfoExample>
                                </InfoButton>
                              </div>
                              <textarea
                                value={fmt.promptModifier}
                                onChange={(e) => updatePersonaFormat(up.id, 'promptModifier', e.target.value)}
                                rows={3}
                                style={{ width: '100%', minHeight: 60, border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
                                onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                              />
                            </div>

                            {/* Tone override */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Tone Override</label>
                                <InfoButton title="Tone Override">
                                  <InfoText>Overrides the tone from the operation. A Partner gets "Formal" responses even if the operation default is "Conversational". If disabled, the operation's tone is used.</InfoText>
                                </InfoButton>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {TONE_OPTIONS.map(t => (
                                  <button key={t.id} onClick={() => updatePersonaFormat(up.id, 'tone', t.id)} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ border: fmt.tone === t.id ? '2px solid var(--navy)' : '1px solid var(--border)', backgroundColor: fmt.tone === t.id ? 'var(--ice-warm)' : 'white', color: fmt.tone === t.id ? 'var(--navy)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Format rules override */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Format Rules</label>
                                <InfoButton title="Persona Format Rules">
                                  <InfoText>These format rules are specific to this persona. They merge with (and can override) the operation-level rules. For example, you might want Partners to always see risk summaries, even in operations that don't normally include them.</InfoText>
                                </InfoButton>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {FORMAT_RULES.map(rule => (
                                  <label key={rule.id} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs" style={{ border: `1px solid ${fmt.formatRules.includes(rule.id) ? 'var(--navy)' : 'var(--border)'}`, backgroundColor: fmt.formatRules.includes(rule.id) ? 'var(--ice-warm)' : 'white' }}>
                                    <input type="checkbox" checked={fmt.formatRules.includes(rule.id)} onChange={() => togglePersonaFormatRule(up.id, rule.id)} style={{ accentColor: 'var(--navy)' }} />
                                    <span style={{ color: 'var(--text-primary)' }}>{rule.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Preview of effective prompt */}
                            <div className="p-3 rounded-lg" style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border)' }}>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Eye size={12} style={{ color: 'var(--text-muted)' }} />
                                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Preview: How this persona affects responses</span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-medium" style={{ color: 'var(--navy)', minWidth: 50 }}>Tone:</span>
                                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{TONE_OPTIONS.find(t => t.id === fmt.tone)?.label} (overrides operation default)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-medium" style={{ color: 'var(--navy)', minWidth: 50 }}>Rules:</span>
                                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{fmt.formatRules.map(r => FORMAT_RULES.find(fr => fr.id === r)?.label.split(' ')[1] || r).join(', ') || 'None'}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-medium" style={{ color: 'var(--navy)', minWidth: 50 }}>Added:</span>
                                  <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>"{fmt.promptModifier.substring(0, 80)}{fmt.promptModifier.length > 80 ? '...' : ''}"</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column — Global Knowledge Documents + Auto-Routing preview */}
            <div className="space-y-6">

              {/* Global Knowledge Documents */}
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Global Knowledge Documents</label>
                    <InfoButton title="Global Knowledge Documents">
                      <InfoSection title="What are these?">
                        <InfoText>These documents form the <strong>platform-wide fallback knowledge base</strong>. When a user's attached document or knowledge pack doesn't contain the answer, the AI searches these global documents next — before showing the fallback message.</InfoText>
                      </InfoSection>
                      <InfoSection title="Who sees these?">
                        <InfoText>All tenants benefit from these documents, but users don't see them directly. The AI uses them as a source and cites them in responses. Only Super Admins can upload, view, or remove global documents.</InfoText>
                      </InfoSection>
                      <InfoSection title="Best practices">
                        <InfoList items={[
                          "Upload broadly applicable legal references (Federal Rules, UCC, ABA Model Rules)",
                          "Avoid firm-specific or client-specific documents — those belong in Knowledge Packs",
                          "PDF and DOCX only, max 100MB per file",
                          "Documents are indexed automatically — allow ~2 minutes for indexing after upload",
                        ]} />
                      </InfoSection>
                      <InfoExample label="Confirmed source">DEC-042: Super Admin global KB serves as fallback if no answer found in selected pack (Apr 8 MOM).</InfoExample>
                    </InfoButton>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{persona.globalDocs.length} docs</span>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Fallback KB when a user has not attached a document in chat. These are searched after the user's pack.</p>

                {/* Drag and drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.backgroundColor = 'var(--ice-warm)'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'white'; }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'white'; handlePersonaFileUpload(e.dataTransfer.files); }}
                  onClick={() => personaFileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 py-5 mb-4 rounded-lg cursor-pointer"
                  style={{ border: '2px dashed var(--border)', backgroundColor: 'white', transition: 'all 0.15s' }}
                >
                  <Upload size={20} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Drag & drop PDF / DOCX (max 100MB)</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--navy)' }}>or browse files</span>
                </div>
                <input
                  ref={personaFileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => { handlePersonaFileUpload(e.target.files); e.target.value = ''; }}
                />

                {/* Doc list */}
                <div className="space-y-2">
                  {persona.globalDocs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                      <File size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{doc.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-1" style={{ backgroundColor: 'rgba(10,36,99,0.08)', color: 'var(--navy)', fontSize: 10 }}>{doc.type}</span>
                          {doc.size}
                        </div>
                      </div>
                      <button onClick={() => handleRemovePersonaDoc(doc.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-Routing Preview (visual only — not confirmed) */}
              {/* CONFIDENCE: 3/10 — Intent classifier not confirmed by Ryan. Visual wireframe only. */}
              {/* TODO: confirm confidence threshold with AI team */}
              {/* OQ-pending — do not ship without confirmation */}
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch size={15} style={{ color: 'var(--navy)' }} />
                  <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Message Routing Flow</label>
                  <InfoButton title="Message Routing — How the AI Picks the Right Mode">
                    <InfoSection title="What is message routing?">
                      <InfoText>When a user sends a message, the AI doesn't just use one static prompt. It runs an intent classifier that analyses the message and determines which operation to activate. This happens automatically — the user doesn't need to choose a mode.</InfoText>
                    </InfoSection>
                    <InfoSection title="The 4-step flow">
                      <InfoList items={[
                        `Step 1: Intent classifier analyses the message (confidence threshold: ${INTENT_CONFIDENCE_THRESHOLD})`,
                        "Step 2: If confident → picks the matching operation + applies persona format",
                        "Step 3: If not confident → asks the user to clarify before proceeding",
                        "Step 4: If no answer found → shows the Fallback Message",
                      ]} />
                    </InfoSection>
                    <InfoSection title="Status">
                      <InfoText><strong>⚠ DRAFT — Not confirmed.</strong> This flow has not been signed off by Ryan or the AI team. The confidence threshold ({INTENT_CONFIDENCE_THRESHOLD}) is a placeholder. This is a visual preview only — do not treat as final.</InfoText>
                    </InfoSection>
                  </InfoButton>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: 10 }}>DRAFT</span>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Visual preview of how the AI routes every message. Not confirmed — for Ryan review.</p>

                {/* Flow diagram — vertical pipeline */}
                <div className="relative" style={{ paddingLeft: 20 }}>
                  {/* Vertical connector line */}
                  <div style={{ position: 'absolute', left: 33, top: 14, bottom: 14, width: 2, backgroundColor: 'var(--border)', zIndex: 0 }} />

                  {[
                    { step: 1, label: 'User Sends Message', desc: 'Text, document upload, or follow-up question', icon: MessageSquare, bg: '#EDE9FE', color: '#5B21B6', borderColor: '#C4B5FD' },
                    { step: 2, label: 'Intent Classifier', desc: `Analyses message → picks operation (confidence ≥ ${INTENT_CONFIDENCE_THRESHOLD})`, icon: Target, bg: '#DBEAFE', color: '#1E40AF', borderColor: '#93C5FD' },
                    { step: 3, label: 'Persona Format Applied', desc: 'User role overrides tone + format rules on top of operation prompt', icon: Users, bg: '#F0FDF4', color: '#166534', borderColor: '#86EFAC' },
                    { step: 4, label: 'Source Resolution', desc: 'Search user doc → knowledge pack → global KB → fallback', icon: Database, bg: '#FFF7ED', color: '#9A3412', borderColor: '#FDBA74' },
                    { step: 5, label: 'Response Streamed', desc: 'With source badge: "your document" or "YourAI knowledge base"', icon: Zap, bg: '#F0F9FF', color: 'var(--navy)', borderColor: '#93C5FD' },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 relative" style={{ marginBottom: i < 4 ? 8 : 0, zIndex: 1 }}>
                        {/* Step number circle */}
                        <div className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, backgroundColor: s.bg, border: `2px solid ${s.borderColor}`, flexShrink: 0, zIndex: 2 }}>
                          <span className="text-xs font-bold" style={{ color: s.color }}>{s.step}</span>
                        </div>
                        {/* Content card */}
                        <div className="flex-1 p-3 rounded-lg" style={{ backgroundColor: s.bg, border: `1px solid ${s.borderColor}` }}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <Icon size={13} style={{ color: s.color }} />
                            <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
                          </div>
                          <p className="text-xs" style={{ color: s.color, opacity: 0.8 }}>{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Branching: Low confidence + No answer */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <HelpCircle size={13} style={{ color: '#D97706' }} />
                      <span className="text-xs font-semibold" style={{ color: '#92400E' }}>Low Confidence</span>
                    </div>
                    <p className="text-xs" style={{ color: '#92400E', lineHeight: 1.5 }}>Confidence &lt; {INTENT_CONFIDENCE_THRESHOLD} → AI asks clarifying question before proceeding.</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={13} style={{ color: '#DC2626' }} />
                      <span className="text-xs font-semibold" style={{ color: '#991B1B' }}>No Answer Found</span>
                    </div>
                    <p className="text-xs" style={{ color: '#991B1B', lineHeight: 1.5 }}>All sources exhausted → Fallback message shown to user.</p>
                  </div>
                </div>

                {/* Active operations summary */}
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={13} style={{ color: 'var(--navy)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Active Operations ({persona.operations.filter(o => o.enabled).length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {persona.operations.filter(o => o.enabled).map(op => (
                      <span key={op.id} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--ice-warm)', color: 'var(--navy)', border: '1px solid rgba(10,36,99,0.1)', fontWeight: 500 }}>
                        {op.label}
                      </span>
                    ))}
                    {persona.operations.filter(o => !o.enabled).map(op => (
                      <span key={op.id} className="px-2 py-1 rounded text-xs line-through" style={{ backgroundColor: '#F1F5F9', color: 'var(--text-muted)', fontSize: 10 }}>
                        {op.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <Users size={12} style={{ color: 'var(--navy)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Active Personas ({Object.values(personaFormats).filter(p => p.enabled).length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {USER_PERSONAS.map(up => {
                      const fmt = personaFormats[up.id];
                      return (
                        <span key={up.id} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: fmt.enabled ? '#F0FDF4' : '#F1F5F9', color: fmt.enabled ? '#166534' : 'var(--text-muted)', border: `1px solid ${fmt.enabled ? '#BBF7D0' : 'var(--border)'}`, fontWeight: 500, textDecoration: fmt.enabled ? 'none' : 'line-through' }}>
                          {up.label.split(' / ')[0]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning banner */}
          <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7' }}>
            <AlertTriangle size={16} style={{ color: '#92400E', flexShrink: 0 }} />
            <p className="text-sm" style={{ color: '#92400E' }}>
              Changes apply from the next session — active conversations will finish with the current persona.
            </p>
          </div>

          {/* Add Operation Modal */}
          {showAddOp && (
            <Modal title="Add New Operation" onClose={() => setShowAddOp(false)}>
              <div className="space-y-4" style={{ padding: '16px 0' }}>
                <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <Info size={14} style={{ color: '#1D4ED8', flexShrink: 0, marginTop: 2 }} />
                  <p className="text-xs" style={{ color: '#1E40AF', lineHeight: 1.6 }}>An operation is a separate AI mode with its own system prompt, tone, and formatting rules. The intent classifier will automatically activate this mode when a user's message matches the description you provide.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Operation Name *</label>
                  <input
                    id="newOpLabel"
                    placeholder="e.g., Due Diligence Review"
                    style={{ width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>When should this activate?</label>
                  <input
                    id="newOpDesc"
                    placeholder="e.g., Activated when user uploads transaction docs for due diligence"
                    style={{ width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>System Prompt</label>
                  <textarea
                    id="newOpPrompt"
                    placeholder="You are Alex, a..."
                    rows={4}
                    style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', lineHeight: 1.6 }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowAddOp(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}>Cancel</button>
                  <button
                    onClick={() => {
                      const label = document.getElementById('newOpLabel')?.value?.trim();
                      const desc = document.getElementById('newOpDesc')?.value?.trim();
                      const prompt = document.getElementById('newOpPrompt')?.value?.trim();
                      if (!label) return;
                      addOperation({ label, description: desc || '', systemPrompt: prompt || '' });
                      setShowAddOp(false);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--navy)' }}
                  >
                    Add Operation
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
