import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleProvider as ChatRoleProvider } from '../../context/RoleContext';
import { useToast } from '../../components/Toast';
import WorkflowsPanel from '../../components/chat/WorkflowsPanel';
import WorkflowBuilder from '../../components/chat/WorkflowBuilder';
import PreRunModal from '../../components/chat/PreRunModal';
import WorkflowRunPanel from '../../components/chat/WorkflowRunPanel';
import {
  duplicateTemplate as duplicateWorkflow,
  deleteTemplate as deleteWorkflow,
} from '../../lib/workflow';
import { loadPacks, seedPacksIfEmpty } from '../../lib/knowledgePackStore';

/**
 * Super Admin → Workflows.
 *
 * This surface intentionally renders the SAME components the tenant chat uses
 * (WorkflowsPanel / WorkflowBuilder / PreRunModal / WorkflowRunPanel) so the
 * picker, builder, pre-run modal and run panel are pixel- and behaviour-identical
 * to /chat/workflows. There is ONE workflow implementation; this is the reference
 * the dev team builds against. Do not fork a separate SA workflow UI — wire any
 * new behaviour into the shared chat components and it flows here automatically.
 *
 * Why the ChatRoleProvider wrapper: the shared components call useRole() from
 * context/RoleContext, which only wraps /chat/* routes in App.jsx. SA routes are
 * under AuthProvider + ToastProvider but NOT the chat RoleProvider, so we mount it
 * locally. It resolves to ORG_ADMIN for an SA operator, which enables create/edit/run.
 */
function WorkflowTemplatesInner() {
  const navigate = useNavigate();
  const { operator } = useAuth();
  const showToast = useToast();

  // Mirror ChatView's operator fallback (useAuth().operator is null in dev).
  const currentUserId = operator?.id || 'user-ryan';
  const currentUserName = operator?.name || 'You';

  // State mirrors ChatView's workflow surface exactly.
  const [editingWorkflow, setEditingWorkflow] = useState(null); // null | 'new' | WorkflowTemplate
  const [runningPrep, setRunningPrep] = useState(null);          // null | WorkflowTemplate (pre-run modal)
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [runPanelFocusId, setRunPanelFocusId] = useState(null);

  // Knowledge packs feed the builder's reference-doc picker (same as chat).
  const [knowledgePacks, setKnowledgePacks] = useState([]);
  useEffect(() => {
    seedPacksIfEmpty();
    setKnowledgePacks(loadPacks());
  }, []);

  return (
    // Cancel SA Layout's 28x32 content padding so the surface is full-bleed like
    // chat; fill the area between the 52px top bar and the 36px demo banner.
    <div
      style={{
        margin: '-28px -32px',
        height: 'calc(100vh - 88px)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {editingWorkflow ? (
        <WorkflowBuilder
          template={editingWorkflow === 'new' ? null : editingWorkflow}
          knowledgePacks={knowledgePacks}
          onBack={() => setEditingWorkflow(null)}
          onSaved={(saved) => {
            setEditingWorkflow(null);
            showToast(`${saved.name} saved`);
          }}
          onToast={(msg) => showToast(msg)}
        />
      ) : (
        <WorkflowsPanel
          onClose={() => navigate('/super-admin/dashboard')}
          onCreateNew={() => setEditingWorkflow('new')}
          onRun={(t) => setRunningPrep(t)}
          onEdit={(t) => setEditingWorkflow(t)}
          onDuplicate={(t) => {
            const copy = duplicateWorkflow(t.id, currentUserId, currentUserName);
            if (copy) showToast(`${copy.name} ready to customise`);
          }}
          onDelete={(id) => {
            deleteWorkflow(id);
            showToast('Workflow deleted');
          }}
        />
      )}

      {/* Pre-run modal — no workspace context at the SA level (main-chat mode). */}
      {runningPrep && (
        <PreRunModal
          template={runningPrep}
          workspaceId={undefined}
          workspaceName={undefined}
          workspaceHasDocs={false}
          onCancel={() => setRunningPrep(null)}
          onStarted={(runId) => {
            setRunningPrep(null);
            setRunPanelFocusId(runId);
            setRunPanelOpen(true);
          }}
          onToast={(msg) => showToast(msg)}
        />
      )}

      {/* Run panel — fixed overlay, identical to chat. */}
      {runPanelOpen && (
        <WorkflowRunPanel
          userId={currentUserId}
          focusRunId={runPanelFocusId}
          onClose={() => {
            setRunPanelOpen(false);
            setRunPanelFocusId(null);
          }}
        />
      )}
    </div>
  );
}

export default function WorkflowTemplates() {
  return (
    <ChatRoleProvider>
      <WorkflowTemplatesInner />
    </ChatRoleProvider>
  );
}
