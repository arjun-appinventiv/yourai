import React, { useState, useMemo } from 'react';
import {
  BookMarked, Plus, Download, Sparkles, Search,
  Building2, Users, CreditCard, BarChart2, ShieldCheck,
  FileText, FileOutput, Workflow, Database, Plug, Bell, Settings, Lock,
} from 'lucide-react';
import { userStoryModules } from '../../data/mockData';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import useUserStories from '../../hooks/useUserStories';
import StoryCard from '../../components/StoryCard';
import StoryEditor from '../../components/StoryEditor';
import StoryTemplate from '../../components/StoryTemplate';

/* ── Icon map for resolving module icon strings ── */
const iconMap = { Building2, Users, CreditCard, BarChart2, ShieldCheck, FileText, FileOutput, Workflow, Database, Plug, Bell, Settings, Lock };

/* ── Shared input style (matches codebase convention) ── */
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

/* ══════════════════════════════════════════════════════════════
   Mock story generator (prototype -- no real API key)
   ══════════════════════════════════════════════════════════════ */
function generateMockStories(moduleId, count) {
  const templates = {
    'tenant-management': [
      {
        title: 'View all organisations',
        role: 'Super Admin',
        goal: 'view a list of all organisations on the platform',
        benefit: 'I can monitor platform-wide tenant health',
        preconditions: ['Super Admin is authenticated', 'At least one organisation exists'],
        acceptanceCriteria: [{ given: 'Super Admin is on Tenant Management page', when: 'page loads', then: 'table shows all orgs with name, plan, status, MRR' }],
        errorHandling: [{ scenario: 'No organisations exist', response: 'Show empty state with Add Tenant CTA' }],
        nfrs: ['Page loads in under 2 seconds', 'All actions audit logged', 'RLS enforced at DB layer'],
        testScenarios: ['Verify table shows correct org count', 'Verify suspended orgs show red badge', 'Verify search filters results in real time'],
        priority: 'Must Have',
        storyPoints: 5,
      },
      {
        title: 'Create a new tenant organisation',
        role: 'Super Admin',
        goal: 'create a new tenant with name, plan, and admin email',
        benefit: 'new customers can be onboarded quickly',
        preconditions: ['Super Admin is authenticated', 'Valid subscription plan exists'],
        acceptanceCriteria: [{ given: 'Super Admin clicks Add Tenant', when: 'form is submitted with valid data', then: 'new org appears in the table with Active status' }],
        errorHandling: [{ scenario: 'Duplicate org name', response: 'Show inline validation error' }],
        nfrs: ['Org provisioning completes in under 5 seconds', 'Webhook fires on creation'],
        testScenarios: ['Verify org creation with all plan types', 'Verify duplicate name rejection', 'Verify admin invitation email is sent'],
        priority: 'Must Have',
        storyPoints: 8,
      },
      {
        title: 'Suspend a tenant organisation',
        role: 'Super Admin',
        goal: 'suspend an organisation that has violated terms',
        benefit: 'the platform is protected from misuse',
        preconditions: ['Super Admin is authenticated', 'Target org is currently Active'],
        acceptanceCriteria: [{ given: 'Super Admin selects an active org', when: 'Suspend action is confirmed', then: 'org status changes to Suspended and all users are logged out' }],
        errorHandling: [{ scenario: 'Org has pending invoices', response: 'Show warning dialog before proceeding' }],
        nfrs: ['Suspension takes effect within 30 seconds', 'Audit trail records the operator and reason'],
        testScenarios: ['Verify suspended org users cannot log in', 'Verify suspension reason is stored', 'Verify reactivation restores access'],
        priority: 'Should Have',
        storyPoints: 5,
      },
      {
        title: 'View tenant usage dashboard',
        role: 'Super Admin',
        goal: 'view usage metrics for a specific tenant',
        benefit: 'I can identify high-value and at-risk accounts',
        preconditions: ['Super Admin is authenticated', 'Usage data pipeline is active'],
        acceptanceCriteria: [{ given: 'Super Admin navigates to a tenant detail page', when: 'the Usage tab is selected', then: 'charts show document uploads, AI queries, and storage over time' }],
        errorHandling: [{ scenario: 'Usage data is unavailable', response: 'Show fallback message with last-known data timestamp' }],
        nfrs: ['Dashboard renders in under 3 seconds', 'Data refreshes every 5 minutes'],
        testScenarios: ['Verify chart data matches raw usage logs', 'Verify date range filter works', 'Verify export to CSV produces valid file'],
        priority: 'Should Have',
        storyPoints: 8,
      },
      {
        title: 'Impersonate a tenant admin',
        role: 'Super Admin',
        goal: 'log into a tenant as their admin without knowing their password',
        benefit: 'I can debug issues reported by customers',
        preconditions: ['Super Admin is authenticated', 'Target tenant has at least one admin user', 'Impersonation feature flag is enabled'],
        acceptanceCriteria: [{ given: 'Super Admin clicks Impersonate on a tenant row', when: 'confirmation dialog is accepted', then: 'session switches to tenant admin view with impersonation banner visible' }],
        errorHandling: [{ scenario: 'Target admin account is disabled', response: 'Block impersonation and show tooltip explaining why' }],
        nfrs: ['Every impersonation event is audit logged with IP', 'Session expires after 30 minutes', 'SOC 2 compliant'],
        testScenarios: ['Verify impersonation banner is visible throughout session', 'Verify audit log captures start and end timestamps', 'Verify impersonation cannot escalate to Super Admin actions'],
        priority: 'Could Have',
        storyPoints: 13,
      },
    ],
  };

  // Generic fallback templates for modules without specific stories
  const genericTemplates = [
    {
      title: 'View module dashboard',
      role: 'Super Admin',
      goal: 'view a summary dashboard for this module',
      benefit: 'I can quickly assess the current state',
      preconditions: ['Super Admin is authenticated'],
      acceptanceCriteria: [{ given: 'Super Admin navigates to the module', when: 'page loads', then: 'summary cards and table are displayed with current data' }],
      errorHandling: [{ scenario: 'Data unavailable', response: 'Show cached data with stale indicator' }],
      nfrs: ['Page loads in under 2 seconds'],
      testScenarios: ['Verify data accuracy against source', 'Verify empty state displays correctly'],
      priority: 'Must Have',
      storyPoints: 5,
    },
    {
      title: 'Search and filter records',
      role: 'Super Admin',
      goal: 'search and filter records in this module',
      benefit: 'I can find specific items quickly',
      preconditions: ['Super Admin is authenticated', 'At least one record exists'],
      acceptanceCriteria: [{ given: 'Super Admin types in the search bar', when: 'query is entered', then: 'results update in real time' }],
      errorHandling: [{ scenario: 'No results match', response: 'Show empty state with clear-filter option' }],
      nfrs: ['Search returns results in under 500ms'],
      testScenarios: ['Verify partial text matching', 'Verify filter combinations work correctly'],
      priority: 'Should Have',
      storyPoints: 3,
    },
    {
      title: 'Export module data',
      role: 'Super Admin',
      goal: 'export all records from this module as JSON or CSV',
      benefit: 'I can share data with stakeholders',
      preconditions: ['Super Admin is authenticated', 'At least one record exists'],
      acceptanceCriteria: [{ given: 'Super Admin clicks Export', when: 'format is selected', then: 'file downloads with all visible records' }],
      errorHandling: [{ scenario: 'Export fails due to size', response: 'Offer paginated export' }],
      nfrs: ['Export completes in under 10 seconds for up to 10k records'],
      testScenarios: ['Verify JSON is valid', 'Verify CSV headers match table columns'],
      priority: 'Could Have',
      storyPoints: 3,
    },
  ];

  const pool = templates[moduleId] || genericTemplates;
  const result = [];
  for (let i = 0; i < count; i++) {
    const template = pool[i % pool.length];
    result.push({
      ...template,
      // Avoid exact duplicates when cycling
      title: i >= pool.length ? `${template.title} (variant ${Math.floor(i / pool.length) + 1})` : template.title,
      status: 'Ready',
      generatedByAI: true,
    });
  }
  return result;
}

/* ══════════════════════════════════════════════════════════════
   UserStories page component
   ══════════════════════════════════════════════════════════════ */
export default function UserStories() {
  const showToast = useToast();

  /* ── Core hook ── */
  const {
    getStories, getModuleCount, createStory, createMany,
    updateStory, deleteStory, duplicateStory,
    exportModuleStories, exportSingleStory,
  } = useUserStories();

  /* ── Module tab state ── */
  const [activeModule, setActiveModule] = useState('tenant-management');

  /* ── Filter state ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  /* ── Editor / viewer state ── */
  const [editingStory, setEditingStory] = useState(null);
  const [viewingStory, setViewingStory] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  /* ── AI generate modal state ── */
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiCount, setAiCount] = useState(5);
  const [aiPriority, setAiPriority] = useState('Mixed');
  const [aiContext, setAiContext] = useState('');
  const [aiProgress, setAiProgress] = useState([]);

  /* ── Delete confirm ── */
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  /* ── Computed data ── */
  const moduleStories = useMemo(() => {
    let stories = getStories(activeModule);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      stories = stories.filter(
        (s) =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.goal || '').toLowerCase().includes(q) ||
          (s.id || '').toLowerCase().includes(q)
      );
    }
    if (priorityFilter !== 'All') {
      stories = stories.filter((s) => s.priority === priorityFilter);
    }
    if (statusFilter !== 'All') {
      stories = stories.filter((s) => s.status === statusFilter);
    }
    return stories;
  }, [getStories, activeModule, searchQuery, priorityFilter, statusFilter]);

  const currentModuleLabel = userStoryModules.find((m) => m.id === activeModule)?.label;

  /* ── Handlers: Story Card ── */
  const handleEdit = (story) => {
    setEditingStory(story);
    setShowEditor(true);
  };

  const handleView = (story) => {
    setViewingStory(story);
  };

  const handleDuplicate = (story) => {
    duplicateStory(story.id);
    showToast(`Duplicated ${story.id}`);
  };

  const handleDeleteRequest = (story) => {
    setDeleteConfirm(story);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    deleteStory(deleteConfirm.id);
    showToast(`Deleted ${deleteConfirm.id}`);
    setDeleteConfirm(null);
  };

  /* ── Handlers: Story Template (full view) ── */
  const handleTemplatePrev = () => {
    const idx = moduleStories.findIndex((s) => s.id === viewingStory?.id);
    if (idx > 0) setViewingStory(moduleStories[idx - 1]);
  };

  const handleTemplateNext = () => {
    const idx = moduleStories.findIndex((s) => s.id === viewingStory?.id);
    if (idx < moduleStories.length - 1) setViewingStory(moduleStories[idx + 1]);
  };

  const handleTemplateExport = (id) => {
    exportSingleStory(id);
    showToast('Story exported');
  };

  const handleTemplateEdit = (story) => {
    setViewingStory(null);
    setEditingStory(story);
    setShowEditor(true);
  };

  /* ── Handlers: Story Editor ── */
  const handleEditorSave = (data) => {
    if (editingStory) {
      updateStory(editingStory.id, data);
      showToast(`Updated ${editingStory.id}`);
    } else {
      createStory({ ...data, moduleId: activeModule });
      showToast('Story created');
    }
    setShowEditor(false);
    setEditingStory(null);
  };

  const openNewEditor = () => {
    setEditingStory(null);
    setShowEditor(true);
  };

  /* ── Handlers: AI Generate ── */
  const openAIModal = () => {
    setAiCount(5);
    setAiPriority('Mixed');
    setAiContext('');
    setAiProgress([]);
    setAiGenerating(false);
    setShowAIModal(true);
  };

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    setAiProgress([]);

    const moduleName = currentModuleLabel || activeModule;
    const steps = [
      `Analysing ${moduleName} module scope...`,
      'Identifying user roles and goals...',
      'Writing acceptance criteria...',
      'Adding error handling and NFRs...',
    ];

    steps.forEach((step, i) => {
      setTimeout(() => setAiProgress((prev) => [...prev, step]), (i + 1) * 1000);
    });

    const API_KEY = localStorage.getItem('yourai_anthropic_key') || '';

    // Module context for the AI prompt
    const moduleContextMap = {
      'tenant-management': 'Tenant Management: view/create/suspend orgs, org detail (4 tabs: Overview/Users/Workspaces/Usage), impersonate admin, Add Tenant 3-step flow, CSV export. 8 mock orgs with plan badges.',
      'user-management': 'User Management: cross-tenant user directory, filter by role/org/status, user detail modal, block/unblock, CSV export. 10 users, 3 roles (Admin/Internal User/Client).',
      'platform-billing': 'Platform Billing: 3 tabs (Subscriptions/Plans/Transactions). Plan CRUD, transaction detail modal, CSV export. Stripe integration.',
      'knowledge-base': 'Knowledge Base: 2 tabs (Legal Content docs/links + Alex Response Templates with 7 intents, filters, unknown queries log).',
      'workflow-templates': 'Workflow Templates: lawyer-friendly task builder with 7 task types, reference doc upload, visual guide. 8 templates.',
      'auth-flow': 'Auth: Login (email/password), Forgot Password (email → OTP → Reset). Protected routes. No signup.',
    };
    const moduleCtx = moduleContextMap[activeModule] || `${moduleName} module in YourAI Super Admin — a B2B SaaS platform for US law firms. SOC 2 compliant. All actions audit logged.`;

    const systemPrompt = `You are an expert product manager. Generate ${aiCount} user stories for the ${moduleName} module of YourAI (AI platform for US law firms). Priority focus: ${aiPriority}. Return ONLY a valid JSON array. Each story: { "title": "string", "role": "Super Admin", "goal": "string", "benefit": "string", "preconditions": ["string"], "acceptanceCriteria": [{"given":"string","when":"string","then":"string"}], "errorHandling": [{"scenario":"string","response":"string"}], "nfrs": ["string"], "testScenarios": ["string"], "priority": "Must Have"|"Should Have"|"Could Have", "storyPoints": number }. Min 3 acceptance criteria, 2 error handling, 3 NFRs, 3 test scenarios per story. Include SOC 2 / audit logging NFRs. Return ONLY the JSON array, no markdown fences, no explanation.`;

    try {
      if (!API_KEY) {
        console.log('No API key found — using mock stories. Set key: localStorage.setItem("yourai_anthropic_key", "sk-ant-...")');
        // Fallback to mock
        await new Promise((r) => setTimeout(r, 4000));
        const generated = generateMockStories(activeModule, aiCount);
        console.log('Mock stories generated:', generated);
        createMany(generated, activeModule);
        console.log('Stories saved. localStorage:', localStorage.getItem('yourai_user_stories')?.slice(0, 200));
        setAiGenerating(false);
        setShowAIModal(false);
        showToast(`${generated.length} stories generated for ${moduleName}`);
        return;
      }

      console.log('Calling Anthropic API for module:', activeModule, 'count:', aiCount);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          system: systemPrompt,
          messages: [{ role: 'user', content: `Module context: ${moduleCtx}\n\n${aiContext ? `Additional context: ${aiContext}` : ''}` }],
        }),
      });

      console.log('API status:', response.status);
      const data = await response.json();
      console.log('API response:', data);

      if (!response.ok) {
        throw new Error(data.error?.message || `API returned ${response.status}`);
      }

      const rawText = data.content[0].text;
      console.log('Raw text (first 300 chars):', rawText.slice(0, 300));

      // Robust JSON parsing — strip markdown fences
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const stories = JSON.parse(cleaned);

      if (!Array.isArray(stories)) throw new Error('Response is not an array');
      console.log('Parsed stories:', stories.length);

      const saved = createMany(
        stories.map((s) => ({
          ...s,
          status: 'Draft',
          generatedByAI: true,
          createdBy: 'Arjun P (AI)',
        })),
        activeModule
      );
      console.log('Stories saved to localStorage:', saved.length);

      setAiGenerating(false);
      setShowAIModal(false);
      showToast(`${stories.length} stories generated for ${moduleName}`);

    } catch (err) {
      console.error('AI generate error:', err);
      // Fallback to mock on any error
      console.log('Falling back to mock stories due to error');
      const generated = generateMockStories(activeModule, aiCount);
      createMany(generated, activeModule);
      setAiGenerating(false);
      setShowAIModal(false);
      showToast(`${generated.length} stories generated for ${moduleName} (offline mode)`);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ── Page Header ── */}
      <PageHeader
        icon={BookMarked}
        title="User Stories"
        subtitle="Create and manage user stories for every platform module."
      />

      {/* ── Module Tab Strip ── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="hide-scrollbar"
      >
        {userStoryModules.map((mod) => {
          const isActive = mod.id === activeModule;
          const ModIcon = iconMap[mod.icon];
          const count = getModuleCount(mod.id);
          return (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: 36,
                padding: '0 14px',
                borderRadius: 20,
                border: isActive ? 'none' : '1px solid var(--border)',
                backgroundColor: isActive ? 'var(--navy)' : '#fff',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.15s',
              }}
            >
              {ModIcon && <ModIcon size={14} />}
              {mod.label}
              {count > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 10,
                    backgroundColor: isActive ? 'var(--gold)' : 'var(--ice-warm)',
                    color: isActive ? '#fff' : 'var(--navy)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        {/* Left: search + filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories..."
              style={{ ...inputStyle, width: 220, paddingLeft: 32 }}
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', appearance: 'auto', paddingRight: 8 }}
          >
            <option value="All">All Priorities</option>
            <option value="Must Have">Must Have</option>
            <option value="Should Have">Should Have</option>
            <option value="Could Have">Could Have</option>
            <option value="Won't Have">Won't Have</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', appearance: 'auto', paddingRight: 8 }}
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Ready">Ready</option>
            <option value="In Review">In Review</option>
            <option value="Approved">Approved</option>
          </select>
        </div>

        {/* Right: count + export + AI button */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
            {moduleStories.length} {moduleStories.length === 1 ? 'story' : 'stories'}
          </span>
          <button
            onClick={() => exportModuleStories(activeModule)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 36, borderRadius: 8,
              border: '1px solid var(--border)', backgroundColor: '#fff',
              color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Download size={14} /> Export JSON
          </button>
          <button
            onClick={openAIModal}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 16px', height: 36, borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, var(--navy) 0%, #1e3a5f 100%)',
              color: '#fff', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--gold)' }} /> Generate with AI
          </button>
        </div>
      </div>

      {/* ── Story List or Empty State ── */}
      {moduleStories.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {moduleStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onEdit={handleEdit}
              onView={handleView}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      ) : (
        /* ── Empty State ── */
        <div style={{ textAlign: 'center', padding: '64px 20px' }}>
          <BookMarked size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)', marginBottom: 8 }}>
            No user stories yet
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 24, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Create stories manually with the guided editor, or let AI generate a complete set for the {currentModuleLabel} module.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={openNewEditor}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 16px', height: 36, borderRadius: 8,
                border: '1px solid var(--border)', backgroundColor: '#fff',
                color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Plus size={14} /> Write Manually
            </button>
            <button
              onClick={openAIModal}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 16px', height: 36, borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, var(--navy) 0%, #1e3a5f 100%)',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Sparkles size={14} style={{ color: 'var(--gold)' }} /> Generate with AI
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
         Story Template (read-only slide-over)
         ══════════════════════════════════════════════════════════════ */}
      <StoryTemplate
        open={!!viewingStory}
        onClose={() => setViewingStory(null)}
        story={viewingStory}
        onPrev={moduleStories.findIndex((s) => s.id === viewingStory?.id) > 0 ? handleTemplatePrev : undefined}
        onNext={moduleStories.findIndex((s) => s.id === viewingStory?.id) < moduleStories.length - 1 ? handleTemplateNext : undefined}
        onExport={handleTemplateExport}
        onEdit={handleTemplateEdit}
      />

      {/* ══════════════════════════════════════════════════════════════
         Story Editor (slide-over drawer)
         ══════════════════════════════════════════════════════════════ */}
      <StoryEditor
        open={showEditor}
        onClose={() => { setShowEditor(false); setEditingStory(null); }}
        story={editingStory}
        moduleId={activeModule}
        onSave={handleEditorSave}
      />

      {/* ══════════════════════════════════════════════════════════════
         Delete Confirm Modal
         ══════════════════════════════════════════════════════════════ */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Delete"
      >
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Delete <strong>{deleteConfirm?.id}</strong>? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setDeleteConfirm(null)}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: '1px solid var(--border)', backgroundColor: '#fff',
              color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirm}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: 'none', backgroundColor: '#DC2626',
              color: '#fff', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Delete
          </button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
         AI Generate Modal
         ══════════════════════════════════════════════════════════════ */}
      {showAIModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(15,23,42,0.4)' }}
          onClick={() => { if (!aiGenerating) setShowAIModal(false); }}
        >
          <div
            className="bg-white w-full"
            style={{
              maxWidth: 520,
              borderRadius: 16,
              padding: 28,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              margin: '0 16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {aiGenerating ? (
              /* ── AI Loading State ── */
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ display: 'inline-flex', marginBottom: 20 }}>
                  <Sparkles
                    size={32}
                    style={{
                      color: 'var(--gold)',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                </div>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '17px', color: 'var(--text-primary)', marginBottom: 20 }}>
                  Claude is writing your user stories...
                </h3>
                <div style={{ textAlign: 'left', maxWidth: 340, margin: '0 auto' }}>
                  {aiProgress.map((step, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: '13px', color: 'var(--text-secondary)',
                        marginBottom: 8,
                        animation: 'fadeInUp 0.3s ease',
                      }}
                    >
                      <span style={{ color: i < aiProgress.length - 1 ? '#16a34a' : 'var(--gold)' }}>
                        {i < aiProgress.length - 1 ? '\u2713' : '\u27F3'}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ── AI Config Form ── */
              <>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <Sparkles size={20} style={{ color: 'var(--gold)' }} />
                  <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>
                    Generate User Stories with AI
                  </h3>
                </div>

                {/* Module context card */}
                <div
                  style={{
                    backgroundColor: 'var(--ice-warm)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {(() => {
                    const mod = userStoryModules.find((m) => m.id === activeModule);
                    const ModIcon = mod ? iconMap[mod.icon] : null;
                    return (
                      <>
                        {ModIcon && <ModIcon size={16} style={{ color: 'var(--navy)' }} />}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)', fontFamily: "'DM Sans', sans-serif" }}>
                          {currentModuleLabel}
                        </span>
                      </>
                    );
                  })()}
                </div>

                {/* Count segmented control */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                    Number of stories
                  </label>
                  <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {[3, 5, 8, 10].map((n) => (
                      <button
                        key={n}
                        onClick={() => setAiCount(n)}
                        style={{
                          flex: 1, height: 36, border: 'none',
                          backgroundColor: aiCount === n ? 'var(--navy)' : '#fff',
                          color: aiCount === n ? '#fff' : 'var(--text-secondary)',
                          fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif",
                          borderRight: '1px solid var(--border)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority dropdown */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                    Priority distribution
                  </label>
                  <select
                    value={aiPriority}
                    onChange={(e) => setAiPriority(e.target.value)}
                    style={{ ...inputStyle, width: '100%', appearance: 'auto' }}
                  >
                    <option value="Mixed">Mixed (recommended)</option>
                    <option value="Must Have">Must Have only</option>
                    <option value="Should Have">Should Have only</option>
                    <option value="Could Have">Could Have only</option>
                  </select>
                </div>

                {/* Additional context */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                    Additional context (optional)
                  </label>
                  <textarea
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    rows={3}
                    placeholder="Add any context, constraints, or focus areas..."
                    style={{
                      ...inputStyle,
                      height: 'auto',
                      padding: '10px 12px',
                      resize: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowAIModal(false)}
                    style={{
                      padding: '8px 18px', borderRadius: 8,
                      border: '1px solid var(--border)', backgroundColor: '#fff',
                      color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAIGenerate}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 20px', borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--navy) 0%, #1e3a5f 100%)',
                      color: '#fff', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <Sparkles size={14} style={{ color: 'var(--gold)' }} /> Generate Stories
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Inline animation styles ── */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
