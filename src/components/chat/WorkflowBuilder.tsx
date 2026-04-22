/* ─────────────── Workflow Builder (slide-over) ───────────────
 *
 * Full-height right-side slide-over, max 680px wide. Edits or creates a
 * WorkflowTemplate. The step editor supports drag-to-reorder, up to 8
 * steps, a per-step operation + instruction, and an optional reference
 * document attached to the step (uploaded file / vault doc / knowledge
 * pack). Reference docs are baked into the template at authoring time
 * — not requested from the runner later.
 *
 * Saves go through lib/workflow's createTemplate / updateTemplate.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, FileText, Package, Plus, Search,
  Trash2, UploadCloud, X,
  FileText as FileTextIcon, Search as SearchIcon, GitCompare,
  FileOutput, BookOpen, ShieldCheck, GripVertical,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import {
  type WorkflowTemplate, type WorkflowStep, type WorkflowOperation,
  type WorkflowVisibility, type ReferenceDoc, type PermissionContext,
  OPERATION_CONFIG, OPERATIONS_IN_ORDER,
  createTemplate, updateTemplate, visibilityOptionsForRole, canEditTemplate,
} from '../../lib/workflow';
import { extractFileText } from '../../lib/file-parser';
import { loadVault } from '../../lib/documentVaultStore';

/* ─── Config ─── */

const MAX_STEPS = 8;
const MAX_NAME = 80;
const MAX_DESCRIPTION = 300;
const MAX_STEP_NAME = 40;
const MAX_INSTRUCTION = 500;
const MIN_INSTRUCTION_CHARS = 3; // trimmed, non-whitespace; see Part 2 note

const PRACTICE_AREAS = ['Legal', 'Compliance & Audit', 'Healthcare', 'Corporate', 'Real Estate', 'Employment', 'Other'];

/** Default est seconds per operation — used when inserting a new step. */
const DEFAULT_SECONDS: Record<WorkflowOperation, number> = {
  read_documents: 2,
  analyse_clauses: 5,
  compare_against_standard: 4,
  generate_report: 3,
  research_precedents: 5,
  compliance_check: 4,
};

const OP_ICON: Record<WorkflowOperation, React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>> = {
  read_documents: FileTextIcon,
  analyse_clauses: SearchIcon,
  compare_against_standard: GitCompare,
  generate_report: FileOutput,
  research_precedents: BookOpen,
  compliance_check: ShieldCheck,
};

/* ─── Props ─── */

export interface WorkflowBuilderProps {
  template: WorkflowTemplate | null;      // null = creating new
  knowledgePacks?: Array<{ id: string | number; name: string; description?: string; docs?: any[]; links?: any[]; ownerId?: string; isGlobal?: boolean }>;
  onBack: () => void;
  onSaved: (t: WorkflowTemplate) => void;
  onToast?: (msg: string) => void;
}

export default function WorkflowBuilder({ template, knowledgePacks = [], onBack, onSaved, onToast }: WorkflowBuilderProps) {
  const { operator } = useAuth();
  const { currentRole, isOrgAdmin, isExternalUser } = useRole();
  const currentUserId = operator?.id || 'user-ryan';
  const currentUserName = operator?.name || 'You';

  const ctx: PermissionContext = useMemo(() => ({
    userId: currentUserId,
    isSuperAdmin: false,
    isOrgAdmin,
    isExternalUser,
  }), [currentUserId, isOrgAdmin, isExternalUser]);

  const isEditing = !!template;
  const canEdit = !isEditing || canEditTemplate(template!, ctx);

  /* ─── Form state ─── */
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [practiceArea, setPracticeArea] = useState(template?.practiceArea || 'Legal');
  const [visibility, setVisibility] = useState<WorkflowVisibility>(template?.visibility || 'personal');
  const [status, setStatus] = useState<'active' | 'draft'>(template?.status || 'active');

  const [steps, setSteps] = useState<WorkflowStep[]>(() => template?.steps ? JSON.parse(JSON.stringify(template.steps)) : [makeNewStep()]);

  const [errors, setErrors] = useState<{ name?: string; practiceArea?: string; steps?: string }>({});

  // Wizard step — 1: Details, 2: Pipeline. Only affects the render;
  // all state above is kept mounted between steps.
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  const goStep2 = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!practiceArea) e.practiceArea = 'Pick a practice area';
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setWizardStep(2);
  };

  // Which step is currently showing the "Advanced options" block and
  // which reference-doc tab. Tracked externally so we don't remount the
  // tab state when the step list re-orders.
  const [advancedOpenFor, setAdvancedOpenFor] = useState<Set<string>>(new Set());
  const [refTabFor, setRefTabFor] = useState<Record<string, 'upload' | 'vault' | 'kp'>>({});

  // Drag state — source id while dragging
  const [draggingId, setDraggingId] = useState<string | null>(null);

  /* ─── Visibility options depend on role ─── */
  const allowedVisibilities = useMemo(() => visibilityOptionsForRole(ctx), [ctx]);
  // If the current value isn't allowed (e.g. Internal User opened a doc
  // authored as 'org' that they can't re-save as org), collapse to first
  // allowed. canEdit already gates the save button.
  useEffect(() => {
    if (!allowedVisibilities.includes(visibility)) {
      setVisibility(allowedVisibilities[0] || 'personal');
    }
  }, [allowedVisibilities, visibility]);

  /* ─── Derived ─── */
  const estimatedTotalSeconds = steps.reduce((a, s) => a + (s.estimatedSeconds || 0), 0);

  /* ─── Step mutations ─── */
  function updateStep(id: string, patch: Partial<WorkflowStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeStep(id: string) {
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  }
  function addStep() {
    if (steps.length >= MAX_STEPS) return;
    setSteps((prev) => [...prev, makeNewStep()]);
  }

  /* ─── Reference-doc setters ─── */
  function setRef(stepId: string, ref: ReferenceDoc | null) {
    updateStep(stepId, { referenceDoc: ref });
  }

  function toggleAdvanced(stepId: string) {
    setAdvancedOpenFor((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
      return next;
    });
  }

  /* ─── Drag handlers ─── */
  function onDragStart(id: string) {
    setDraggingId(id);
  }
  function onDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === overId) return;
  }
  function onDrop(overId: string) {
    if (!draggingId || draggingId === overId) return setDraggingId(null);
    setSteps((prev) => {
      const from = prev.findIndex((s) => s.id === draggingId);
      const to = prev.findIndex((s) => s.id === overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggingId(null);
  }
  function onDragEnd() { setDraggingId(null); }

  /* ─── Save ─── */
  function handleSave() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Workflow name is required.';
    if (!practiceArea) next.practiceArea = 'Select a practice area.';

    const stepIssues: string[] = [];
    steps.forEach((s, i) => {
      if (!s.instruction || s.instruction.trim().length < MIN_INSTRUCTION_CHARS) {
        stepIssues.push(`Step ${i + 1}: add an instruction.`);
      }
    });
    if (steps.length === 0) stepIssues.push('At least one step is required.');
    if (stepIssues.length > 0) next.steps = stepIssues.join(' ');

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (isEditing && template) {
      const updated = updateTemplate(template.id, {
        name: name.trim(),
        description: description.trim(),
        practiceArea,
        visibility,
        status,
        steps,
      });
      if (updated) {
        onToast?.('Workflow saved');
        onSaved(updated);
      }
    } else {
      const created = createTemplate({
        name: name.trim(),
        description: description.trim(),
        practiceArea,
        visibility,
        status,
        steps,
        createdBy: currentUserId,
        createdByName: currentUserName,
      });
      onToast?.('Workflow saved');
      onSaved(created);
    }
  }

  /* ─── Render ─── */
  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: '#FAF6EE', minWidth: 0, minHeight: 0, overflow: 'hidden',
      }}
    >
      {/* Breadcrumb bar */}
      <div style={{
        padding: '12px 36px',
        borderBottom: '1px solid rgba(10,36,99,0.06)',
        background: '#FDFBF5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', marginLeft: -10, borderRadius: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 13,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--navy)'; (e.currentTarget as HTMLButtonElement).style.background = '#F3ECDD'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <ArrowLeft size={14} /> Workflows
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
          {wizardStep === 1 ? (
            <button
              onClick={goStep2}
              disabled={!canEdit}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: canEdit ? 'var(--navy)' : '#9CA3AF', color: '#fff', fontSize: 13, fontWeight: 500, cursor: canEdit ? 'pointer' : 'not-allowed' }}
            >
              Continue <ArrowRight size={13} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canEdit}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: canEdit ? 'var(--navy)' : '#9CA3AF', color: '#fff', fontSize: 13, fontWeight: 500, cursor: canEdit ? 'pointer' : 'not-allowed' }}
            >
              Save workflow
            </button>
          )}
        </div>
      </div>

      {/* Wizard hero with step indicator */}
      <div style={{
        padding: '24px 36px 18px',
        borderBottom: '1px solid rgba(10,36,99,0.06)',
        background: 'linear-gradient(180deg, #FDFBF5 0%, #FAF6EE 100%)',
        flexShrink: 0,
      }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: 'var(--navy)', margin: 0, lineHeight: 1.1 }}>
          {isEditing ? `Edit: ${template!.name || 'Workflow'}` : 'New Workflow'}
        </h1>
        <p style={{ fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 1.55 }}>
          {wizardStep === 1 ? 'First, tell us about this workflow.' : 'Now, add the steps this workflow should run.'}
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <WizardDot num={1} label="Details"  active={wizardStep === 1} done={wizardStep > 1} onClick={() => setWizardStep(1)} />
          <div style={{ flex: '0 0 40px', height: 2, background: wizardStep > 1 ? 'var(--navy)' : '#E4E7EC', borderRadius: 2 }} />
          <WizardDot num={2} label="Pipeline" active={wizardStep === 2} done={false}         onClick={() => canEdit && name.trim() && practiceArea && setWizardStep(2)} />
        </div>

        {!canEdit && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 12, color: '#6B4E1F', lineHeight: 1.55 }}>
            You don't have permission to edit this workflow. Try <em>Duplicate</em> from Workflows to make your own copy.
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 40px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {/* Section 1 — Details */}
          {wizardStep === 1 && (
          <Section label="Workflow Details">
            <Field label={`Workflow name (${name.length}/${MAX_NAME})`} error={errors.name}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
                placeholder="e.g. Contract Risk Review"
                style={inputStyle(!!errors.name)}
                autoFocus={!isEditing}
              />
            </Field>

            <div className="flex gap-3" style={{ marginTop: 14 }}>
              <div style={{ flex: 1 }}>
                <Field label="Practice area" error={errors.practiceArea}>
                  <select value={practiceArea} onChange={(e) => setPracticeArea(e.target.value)} style={{ ...inputStyle(!!errors.practiceArea), paddingRight: 30 }}>
                    {PRACTICE_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Field>
              </div>
              {(isOrgAdmin || ctx.isSuperAdmin) && (
                <div style={{ width: 180 }}>
                  <Field label="Status">
                    <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--ice-warm)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {(['active', 'draft'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(s)}
                          style={{
                            flex: 1, padding: '6px 8px', borderRadius: 6,
                            border: 'none', fontSize: 12, fontWeight: 500,
                            background: status === s ? '#fff' : 'transparent',
                            color: status === s ? 'var(--text-primary)' : 'var(--text-muted)',
                            cursor: status === s ? 'default' : 'pointer',
                            boxShadow: status === s ? '0 1px 3px rgba(10,36,99,0.08)' : 'none',
                            textTransform: 'capitalize',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              )}
            </div>

            <Field label={`Description (${description.length}/${MAX_DESCRIPTION})`}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                rows={3}
                placeholder="What does this workflow produce? Who is it for?"
                style={{ ...inputStyle(false), height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }}
              />
            </Field>

            <Field label="Visibility">
              {allowedVisibilities.length === 1 ? (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--ice-warm)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <strong>Personal</strong> — only visible to you.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allowedVisibilities.map((v) => (
                    <VisibilityOption
                      key={v}
                      selected={visibility === v}
                      onSelect={() => setVisibility(v)}
                      title={visibilityTitle(v)}
                      subtitle={visibilitySubtitle(v)}
                    />
                  ))}
                </div>
              )}
            </Field>
          </Section>
          )}

          {/* Section 2 — Steps */}
          {wizardStep === 2 && (
          <Section
            label="Workflow Steps"
            help={`Add steps in the order they should run. Max ${MAX_STEPS} steps. Each step is one AI task.`}
            error={errors.steps}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {steps.map((step, idx) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={idx}
                  dragging={draggingId === step.id}
                  advancedOpen={advancedOpenFor.has(step.id)}
                  refTab={refTabFor[step.id] || 'upload'}
                  knowledgePacks={knowledgePacks}
                  canRemove={steps.length > 1}
                  onChange={(patch) => updateStep(step.id, patch)}
                  onRemove={() => removeStep(step.id)}
                  onToggleAdvanced={() => toggleAdvanced(step.id)}
                  onSetRefTab={(tab) => setRefTabFor((prev) => ({ ...prev, [step.id]: tab }))}
                  onSetRef={(ref) => setRef(step.id, ref)}
                  onDragStart={() => onDragStart(step.id)}
                  onDragOver={(e) => onDragOver(e, step.id)}
                  onDrop={() => onDrop(step.id)}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>

            <div className="flex items-center justify-between" style={{ marginTop: 14 }}>
              <button
                onClick={addStep}
                disabled={steps.length >= MAX_STEPS}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  border: '1px dashed var(--border)', background: '#fff',
                  color: steps.length >= MAX_STEPS ? 'var(--text-muted)' : 'var(--navy)',
                  fontSize: 12, fontWeight: 500,
                  cursor: steps.length >= MAX_STEPS ? 'not-allowed' : 'pointer',
                }}
              >
                <Plus size={13} />
                {steps.length >= MAX_STEPS ? `${steps.length} / ${MAX_STEPS} steps (maximum reached)` : 'Add Step'}
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                Estimated total: ~{estimatedTotalSeconds}s
              </span>
            </div>
          </Section>
          )}

          {/* Inline step-nav at bottom of wizard for easy back/forward */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(10,36,99,0.06)' }}>
            {wizardStep === 2 ? (
              <button
                onClick={() => setWizardStep(1)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <ArrowLeft size={13} /> Back to details
              </button>
            ) : <div />}
            {wizardStep === 1 ? (
              <button
                onClick={goStep2}
                disabled={!canEdit}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 10, border: 'none', background: canEdit ? 'var(--navy)' : '#9CA3AF', color: '#fff', fontSize: 14, fontWeight: 600, cursor: canEdit ? 'pointer' : 'not-allowed', boxShadow: canEdit ? '0 2px 8px rgba(10,36,99,0.2)' : 'none' }}
              >
                Continue to Pipeline <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!canEdit}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 10, border: 'none', background: canEdit ? 'var(--navy)' : '#9CA3AF', color: '#fff', fontSize: 14, fontWeight: 600, cursor: canEdit ? 'pointer' : 'not-allowed', boxShadow: canEdit ? '0 2px 8px rgba(10,36,99,0.2)' : 'none' }}
              >
                Save workflow
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Wizard step indicator dot ─── */
function WizardDot({ num, label, active, done, onClick }: { num: number; label: string; active: boolean; done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 10px 6px 6px', borderRadius: 999,
        background: active ? 'var(--navy)' : done ? '#DCFCE7' : 'transparent',
        border: active ? 'none' : `1px solid ${done ? '#86EFAC' : 'var(--border)'}`,
        color: active ? '#fff' : done ? '#166534' : '#6B7280',
        fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: active ? 'rgba(255,255,255,0.2)' : done ? '#16A34A' : '#F3F4F6',
        color: active ? '#fff' : done ? '#fff' : '#6B7280',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600,
      }}>
        {done ? '✓' : num}
      </span>
      {label}
    </button>
  );
}

/* ─────────────── Step card ─────────────── */

interface StepCardProps {
  step: WorkflowStep;
  index: number;
  dragging: boolean;
  advancedOpen: boolean;
  refTab: 'upload' | 'vault' | 'kp';
  knowledgePacks: WorkflowBuilderProps['knowledgePacks'];
  canRemove: boolean;
  onChange: (patch: Partial<WorkflowStep>) => void;
  onRemove: () => void;
  onToggleAdvanced: () => void;
  onSetRefTab: (tab: 'upload' | 'vault' | 'kp') => void;
  onSetRef: (ref: ReferenceDoc | null) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function StepCard(props: StepCardProps) {
  const { step, index, dragging, advancedOpen, refTab, knowledgePacks, canRemove,
    onChange, onRemove, onToggleAdvanced, onSetRefTab, onSetRef,
    onDragStart, onDragOver, onDrop, onDragEnd } = props;
  const cfg = OPERATION_CONFIG[step.operation];

  const handleOperationChange = (op: WorkflowOperation) => {
    onChange({ operation: op, estimatedSeconds: DEFAULT_SECONDS[op] });
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        border: '1px solid var(--border)', borderRadius: 12,
        background: '#fff', padding: '14px 14px 14px 10px',
        display: 'flex', gap: 10, alignItems: 'flex-start',
        opacity: dragging ? 0.5 : 1, transition: 'opacity 150ms',
      }}
    >
      {/* Drag handle */}
      <div
        title="Drag to reorder"
        style={{ cursor: 'grab', padding: '4px 0', color: '#D1D5DB', flexShrink: 0 }}
      >
        <GripVertical size={16} />
      </div>

      {/* Step number badge */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--navy)', color: '#C9A84C',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2,
      }}>
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Operation + estimated time */}
        <div className="flex items-center gap-2 flex-wrap">
          <OperationDropdown value={step.operation} onChange={handleOperationChange} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
            ~{step.estimatedSeconds}s
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cfg.description}</span>
        </div>

        {/* Step name */}
        <input
          value={step.name}
          onChange={(e) => onChange({ name: e.target.value.slice(0, MAX_STEP_NAME) })}
          placeholder="Give this step a short name"
          style={{
            border: 'none', outline: 'none',
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
            padding: '4px 0', background: 'transparent',
            borderBottom: '1px dashed var(--border)',
          }}
        />

        {/* Instruction */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            {cfg.instructionLabel}
          </label>
          <textarea
            value={step.instruction}
            onChange={(e) => onChange({ instruction: e.target.value.slice(0, MAX_INSTRUCTION) })}
            placeholder={cfg.instructionPlaceholder}
            rows={2}
            style={{
              width: '100%', border: '1px solid var(--border)', borderRadius: 8,
              padding: '8px 10px', fontSize: 13, outline: 'none', resize: 'vertical',
              lineHeight: 1.55, fontFamily: "'DM Sans', sans-serif",
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textAlign: 'right' }}>
            {step.instruction.length}/{MAX_INSTRUCTION}
          </div>
        </div>

        {/* Advanced options — reference doc */}
        <div>
          <button
            onClick={onToggleAdvanced}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', marginLeft: -8, borderRadius: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 11, fontWeight: 500,
            }}
          >
            <ChevronDown size={12} style={{ transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
            Advanced options{step.referenceDoc ? ` (1 reference doc)` : ''}
          </button>

          {advancedOpen && (
            <div style={{ marginTop: 8, padding: 12, borderRadius: 10, background: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Reference document (optional)</div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 10px 0' }}>
                Upload a playbook, checklist, or standard template. The AI will use it as context for this step.
              </p>

              {/* Active chip if a reference doc is set */}
              {step.referenceDoc && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', marginBottom: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 999, fontSize: 11 }}>
                  <FileText size={11} style={{ color: 'var(--navy)' }} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{step.referenceDoc.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                    · {refTypeLabel(step.referenceDoc.type)}
                  </span>
                  <button onClick={() => onSetRef(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }} aria-label="Remove reference">
                    <X size={11} />
                  </button>
                </div>
              )}

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 10, padding: 3, background: '#fff', borderRadius: 8, border: '1px solid var(--border)' }}>
                <TabButton label="Upload file"     active={refTab === 'upload'} onClick={() => onSetRefTab('upload')} />
                <TabButton label="Document Vault"  active={refTab === 'vault'}  onClick={() => onSetRefTab('vault')} />
                <TabButton label="Knowledge Pack"  active={refTab === 'kp'}     onClick={() => onSetRefTab('kp')} />
              </div>

              {refTab === 'upload' && <UploadTab onSelect={(ref) => onSetRef(ref)} />}
              {refTab === 'vault'  && <VaultTab  onSelect={(ref) => onSetRef(ref)} />}
              {refTab === 'kp'     && <KnowledgePackTab packs={knowledgePacks || []} onSelect={(ref) => onSetRef(ref)} />}
            </div>
          )}
        </div>
      </div>

      {/* Remove button */}
      {canRemove && (
        <button
          onClick={onRemove}
          title="Remove step"
          style={{ padding: 6, borderRadius: 6, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
        >
          <Trash2 size={12} style={{ color: '#C65454' }} />
        </button>
      )}
    </div>
  );
}

/* ─── Operation dropdown ─── */
function OperationDropdown({ value, onChange }: { value: WorkflowOperation; onChange: (op: WorkflowOperation) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const cfg = OPERATION_CONFIG[value];
  const Icon = OP_ICON[value];

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cfg.color}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 999,
          fontSize: 11, fontWeight: 500, border: '1px solid',
          cursor: 'pointer',
        }}
      >
        <Icon size={11} />
        {cfg.label}
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          width: 280, background: '#fff',
          border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(10,36,99,0.12)', overflow: 'hidden', zIndex: 70,
        }}>
          {OPERATIONS_IN_ORDER.map((op) => {
            const c = OPERATION_CONFIG[op];
            const I = OP_ICON[op];
            const isCurrent = op === value;
            return (
              <div
                key={op}
                onClick={() => { onChange(op); setOpen(false); }}
                style={{
                  padding: '10px 12px', cursor: 'pointer',
                  background: isCurrent ? 'var(--ice-warm)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}
                onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex items-center gap-2">
                  <span className={c.color} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 500, border: '1px solid' }}>
                    <I size={10} /> {c.label}
                  </span>
                  {isCurrent && <Check size={12} style={{ color: 'var(--navy)', marginLeft: 'auto' }} />}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{c.description}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Reference-doc tabs ─── */

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '6px 8px', borderRadius: 6, border: 'none',
        fontSize: 11, fontWeight: 500, cursor: active ? 'default' : 'pointer',
        background: active ? 'var(--navy)' : 'transparent',
        color: active ? '#fff' : 'var(--text-muted)',
        transition: 'all 120ms',
      }}
    >
      {label}
    </button>
  );
}

/* Upload tab */
function UploadTab({ onSelect }: { onSelect: (ref: ReferenceDoc) => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const process = async (files: FileList | File[]) => {
    const f = Array.from(files)[0];
    if (!f) return;
    const ext = f.name.lastIndexOf('.') !== -1 ? f.name.slice(f.name.lastIndexOf('.') + 1).toLowerCase() : '';
    if (!['pdf', 'docx', 'xlsx', 'txt'].includes(ext)) { setError('Supported: PDF, DOCX, XLSX, TXT'); return; }
    if (f.size > 100 * 1024 * 1024) { setError('Max 100 MB per file'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await extractFileText(f);
      onSelect({ type: 'upload', name: f.name, content: res?.text || '' });
    } catch {
      setError('Could not read that file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files) process(e.dataTransfer.files); }}
        style={{
          padding: '18px 14px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
          border: `2px dashed ${dragActive ? '#C9A84C' : 'var(--border)'}`,
          background: dragActive ? '#FDF6E3' : '#fff',
          transition: 'all 120ms',
        }}
      >
        <UploadCloud size={20} style={{ margin: '0 auto 6px', color: dragActive ? '#C9A84C' : 'var(--navy)', opacity: 0.8 }} />
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
          {loading ? 'Reading file…' : 'Drag & drop or click to upload'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>PDF, DOCX, XLSX, TXT · up to 100 MB</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.txt"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) process(e.target.files); e.target.value = ''; }}
        />
      </div>
      {error && <div style={{ marginTop: 6, fontSize: 11, color: '#C65454' }}>{error}</div>}
    </div>
  );
}

/* Vault tab */
function VaultTab({ onSelect }: { onSelect: (ref: ReferenceDoc) => void }) {
  const [q, setQ] = useState('');
  const docs = useMemo(() => loadVault() || [], []);
  const filtered = useMemo(() => {
    if (!q.trim()) return docs;
    const s = q.toLowerCase();
    return docs.filter((d) => d.name.toLowerCase().includes(s) || (d.fileName || '').toLowerCase().includes(s));
  }, [docs, q]);

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Document Vault..."
          style={{ width: '100%', height: 32, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 30, fontSize: 12, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ maxHeight: 180, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)', background: '#fff' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>No documents match.</div>
        ) : filtered.map((d) => (
          <div
            key={d.id}
            onClick={() => onSelect({ type: 'vault', name: d.name, content: d.description || d.fileName || '' })}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 100ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ice-warm)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <FileText size={12} style={{ color: 'var(--navy)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.fileName} · {d.fileSize}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* KP tab */
function KnowledgePackTab({ packs, onSelect }: { packs: WorkflowBuilderProps['knowledgePacks']; onSelect: (ref: ReferenceDoc) => void }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const list = packs || [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s));
  }, [packs, q]);

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Knowledge Packs..."
          style={{ width: '100%', height: 32, borderRadius: 8, border: '1px solid var(--border)', paddingLeft: 30, fontSize: 12, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ maxHeight: 180, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)', background: '#fff' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>No knowledge packs available. Create one first.</div>
        ) : filtered.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelect({ type: 'knowledge_pack', name: p.name, content: p.description || '' })}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ice-warm)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Package size={12} style={{ color: 'var(--navy)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(p.docs?.length || 0)} docs · {(p.links?.length || 0)} links
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Small helpers ─── */

function Section({ label, help, error, children }: { label: string; help?: string; error?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </h3>
        {help && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.55 }}>{help}</p>}
        {error && <p style={{ fontSize: 11, color: '#C65454', marginTop: 4 }}>{error}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
      {error && <div style={{ fontSize: 11, color: '#C65454', marginTop: 3 }}>{error}</div>}
    </div>
  );
}

function VisibilityOption({ selected, onSelect, title, subtitle }: { selected: boolean; onSelect: () => void; title: string; subtitle: string }) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        border: '1px solid ' + (selected ? 'var(--navy)' : 'var(--border)'),
        background: selected ? 'var(--ice-warm)' : '#fff',
        display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'all 120ms',
      }}
    >
      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid ' + (selected ? 'var(--navy)' : '#CBD5E1'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--navy)' }} />}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%', height: 38, borderRadius: 8,
    border: `1px solid ${hasError ? '#C65454' : 'var(--border)'}`,
    padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: "'DM Sans', sans-serif",
    background: '#fff',
  };
}

function visibilityTitle(v: WorkflowVisibility): string {
  if (v === 'personal') return 'Personal';
  if (v === 'org') return 'Your Organisation';
  return 'Platform';
}
function visibilitySubtitle(v: WorkflowVisibility): string {
  if (v === 'personal') return 'Only visible to you.';
  if (v === 'org') return 'Visible to everyone in your firm.';
  return 'Available to every organisation on YourAI.';
}
function refTypeLabel(t: ReferenceDoc['type']): string {
  if (t === 'upload') return 'uploaded file';
  if (t === 'vault') return 'from Document Vault';
  return 'from Knowledge Pack';
}

function makeNewStep(): WorkflowStep {
  return {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    operation: 'read_documents',
    instruction: '',
    referenceDoc: null,
    estimatedSeconds: DEFAULT_SECONDS.read_documents,
  };
}
