import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, ChevronRight, ChevronLeft, Check, Trash2 } from 'lucide-react';

const ROLES = ['Super Admin', 'Admin', 'Manager', 'Team', 'Client', 'Platform Operator'];
const STATUSES = ['Draft', 'Ready', 'In Review', 'Approved'];
const PRIORITIES = [
  { label: 'Must Have', color: '#C65454', bg: '#F9E7E7' },
  { label: 'Should Have', color: '#E8A33D', bg: '#FBEED5' },
  { label: 'Could Have', color: '#5CA868', bg: '#E7F3E9' },
  { label: "Won't Have", color: '#9CA3AF', bg: '#F8F4ED' },
];
const NFR_SUGGESTIONS = [
  'Audit logged',
  'SOC 2 compliant',
  '< 2s load time',
  'Mobile responsive',
  'RLS enforced',
  'WCAG 2.1 AA',
];
const STEP_LABELS = ['Identity', 'Story', 'Criteria', 'Requirements'];

const inputStyle = {
  border: '1px solid var(--border)',
  borderRadius: '8px',
  height: 36,
  padding: '0 12px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '13px',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
};

const textareaStyle = {
  ...inputStyle,
  height: 'auto',
  padding: '8px 12px',
  resize: 'none',
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 6,
  fontFamily: "'DM Sans', sans-serif",
};

const sectionTitle = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: '15px',
  color: 'var(--text-primary)',
  marginBottom: 12,
};

function emptyForm() {
  return {
    title: '',
    role: '',
    priority: '',
    status: 'Draft',
    storyPoints: '',
    goal: '',
    benefit: '',
    preconditions: [''],
    acceptanceCriteria: [{ given: '', when: '', then: '' }],
    errorHandling: [{ scenario: '', response: '' }],
    nfrs: [],
    testScenarios: [''],
  };
}

function formFromStory(story) {
  return {
    title: story.title || '',
    role: story.role || '',
    priority: story.priority || '',
    status: story.status || 'Draft',
    storyPoints: story.storyPoints || '',
    goal: story.goal || '',
    benefit: story.benefit || '',
    preconditions: story.preconditions?.length ? [...story.preconditions] : [''],
    acceptanceCriteria: story.acceptanceCriteria?.length
      ? story.acceptanceCriteria.map((c) => ({ ...c }))
      : [{ given: '', when: '', then: '' }],
    errorHandling: story.errorHandling?.length
      ? story.errorHandling.map((e) => ({ ...e }))
      : [{ scenario: '', response: '' }],
    nfrs: story.nfrs?.length ? [...story.nfrs] : [],
    testScenarios: story.testScenarios?.length ? [...story.testScenarios] : [''],
  };
}

export default function StoryEditor({ open, onClose, story, moduleId, onSave }) {
  const isNew = !story;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const initialFormRef = useRef(null);

  useEffect(() => {
    if (open) {
      const f = story ? formFromStory(story) : emptyForm();
      setForm(f);
      initialFormRef.current = JSON.stringify(f);
      setStep(1);
      setErrors({});
    }
  }, [open, story]);

  const isDirty = useCallback(() => {
    return JSON.stringify(form) !== initialFormRef.current;
  }, [form]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleBackdropClick = () => {
    if (isDirty()) {
      if (window.confirm('You have unsaved changes. Discard them?')) onClose();
    } else {
      onClose();
    }
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = true;
    if (!form.role) e.role = true;
    if (!form.goal.trim()) e.goal = true;
    if (!form.benefit.trim()) e.benefit = true;
    if (!form.preconditions.some((p) => p.trim())) e.preconditions = true;
    if (!form.acceptanceCriteria.some((c) => c.given.trim() || c.when.trim() || c.then.trim()))
      e.acceptanceCriteria = true;
    if (!form.testScenarios.some((t) => t.trim())) e.testScenarios = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const data = {
      ...form,
      moduleId,
      storyPoints: form.storyPoints ? Number(form.storyPoints) : null,
      preconditions: form.preconditions.filter((p) => p.trim()),
      acceptanceCriteria: form.acceptanceCriteria.filter(
        (c) => c.given.trim() || c.when.trim() || c.then.trim()
      ),
      errorHandling: form.errorHandling.filter((e) => e.scenario.trim() || e.response.trim()),
      nfrs: form.nfrs.filter((n) => n.trim()),
      testScenarios: form.testScenarios.filter((t) => t.trim()),
    };
    onSave(data);
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleSave();
  };

  if (!open) return null;

  // --- Shared field renderers ---

  const renderIdentityFields = () => (
    <>
      {/* Module chip */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Module</label>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: 20,
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: 'var(--ice-warm)',
            color: 'var(--navy)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {moduleId}
        </span>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>
          Title <span style={{ color: '#C65454' }}>*</span>
        </label>
        <input
          style={{ ...inputStyle, borderColor: errors.title ? '#C65454' : undefined }}
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="e.g. Create new tenant organisation"
        />
      </div>

      {/* Role */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>
          Role <span style={{ color: '#C65454' }}>*</span>
        </label>
        <select
          style={{ ...inputStyle, borderColor: errors.role ? '#C65454' : undefined, appearance: 'auto' }}
          value={form.role}
          onChange={(e) => update('role', e.target.value)}
        >
          <option value="">Select role...</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Priority cards */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Priority</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {PRIORITIES.map((p) => {
            const selected = form.priority === p.label;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => update('priority', p.label)}
                style={{
                  border: `2px solid ${selected ? p.color : 'var(--border)'}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                  backgroundColor: selected ? p.bg : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  color: p.color,
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
                {selected && <Check size={14} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Status</label>
        <select
          style={{ ...inputStyle, appearance: 'auto' }}
          value={form.status}
          onChange={(e) => update('status', e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Story Points */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Story Points</label>
        <input
          type="number"
          style={{ ...inputStyle, width: 120 }}
          value={form.storyPoints}
          onChange={(e) => update('storyPoints', e.target.value)}
          placeholder="e.g. 5"
          min={0}
        />
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
          Fibonacci: 1, 2, 3, 5, 8, 13, 21
        </p>
      </div>
    </>
  );

  const renderStoryFields = () => (
    <>
      {/* Visual story builder */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={sectionTitle}>Story Statement</h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span style={{ ...labelStyle, color: 'var(--gold)', fontWeight: 700, fontSize: '13px' }}>As a</span>
            <div
              style={{
                ...inputStyle,
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--ice-warm)',
                height: 36,
              }}
            >
              {form.role || '(select role in Identity)'}
            </div>
          </div>

          <div>
            <span style={{ ...labelStyle, color: 'var(--gold)', fontWeight: 700, fontSize: '13px' }}>I want to</span>
            <textarea
              style={{ ...textareaStyle, borderColor: errors.goal ? '#C65454' : undefined }}
              rows={2}
              value={form.goal}
              onChange={(e) => update('goal', e.target.value)}
              placeholder="describe the goal..."
            />
          </div>

          <div>
            <span style={{ ...labelStyle, color: 'var(--gold)', fontWeight: 700, fontSize: '13px' }}>So that</span>
            <textarea
              style={{ ...textareaStyle, borderColor: errors.benefit ? '#C65454' : undefined }}
              rows={2}
              value={form.benefit}
              onChange={(e) => update('benefit', e.target.value)}
              placeholder="describe the benefit..."
            />
          </div>
        </div>
      </div>

      {/* Live preview */}
      {(form.role || form.goal || form.benefit) && (
        <div
          style={{
            backgroundColor: '#F8F4ED',
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px',
            color: 'var(--text-primary)',
            lineHeight: 1.6,
            borderLeft: '3px solid var(--gold)',
          }}
        >
          <strong>As a</strong> {form.role || '___'}, <strong>I want to</strong> {form.goal || '___'},{' '}
          <strong>so that</strong> {form.benefit || '___'}.
        </div>
      )}

      {/* Preconditions */}
      <div>
        <h4 style={sectionTitle}>Preconditions</h4>
        {errors.preconditions && (
          <p style={{ color: '#C65454', fontSize: '12px', marginBottom: 8 }}>At least 1 precondition required</p>
        )}
        {form.preconditions.map((pc, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input
              style={inputStyle}
              value={pc}
              onChange={(e) => {
                const arr = [...form.preconditions];
                arr[i] = e.target.value;
                update('preconditions', arr);
              }}
              placeholder={`Precondition ${i + 1}`}
            />
            {form.preconditions.length > 1 && (
              <button
                type="button"
                onClick={() => update('preconditions', form.preconditions.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => update('preconditions', [...form.preconditions, ''])}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            color: 'var(--gold)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </>
  );

  const renderCriteriaFields = () => (
    <>
      {/* Acceptance Criteria */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={sectionTitle}>Acceptance Criteria</h4>
        {errors.acceptanceCriteria && (
          <p style={{ color: '#C65454', fontSize: '12px', marginBottom: 8 }}>At least 1 criterion required</p>
        )}
        {form.acceptanceCriteria.map((c, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 14,
              marginBottom: 10,
              position: 'relative',
            }}
          >
            {form.acceptanceCriteria.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  update('acceptanceCriteria', form.acceptanceCriteria.filter((_, j) => j !== i))
                }
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={14} />
              </button>
            )}
            <div style={{ marginBottom: 8 }}>
              <label style={{ ...labelStyle, fontSize: '11px' }}>Given</label>
              <input
                style={inputStyle}
                value={c.given}
                onChange={(e) => {
                  const arr = form.acceptanceCriteria.map((x, j) =>
                    j === i ? { ...x, given: e.target.value } : x
                  );
                  update('acceptanceCriteria', arr);
                }}
                placeholder="some context..."
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ ...labelStyle, fontSize: '11px' }}>When</label>
              <input
                style={inputStyle}
                value={c.when}
                onChange={(e) => {
                  const arr = form.acceptanceCriteria.map((x, j) =>
                    j === i ? { ...x, when: e.target.value } : x
                  );
                  update('acceptanceCriteria', arr);
                }}
                placeholder="some action..."
              />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: '11px' }}>Then</label>
              <input
                style={inputStyle}
                value={c.then}
                onChange={(e) => {
                  const arr = form.acceptanceCriteria.map((x, j) =>
                    j === i ? { ...x, then: e.target.value } : x
                  );
                  update('acceptanceCriteria', arr);
                }}
                placeholder="expected result..."
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            update('acceptanceCriteria', [...form.acceptanceCriteria, { given: '', when: '', then: '' }])
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            color: 'var(--gold)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Plus size={14} /> Add Criterion
        </button>
      </div>

      {/* Error Handling */}
      <div>
        <h4 style={sectionTitle}>Error Handling</h4>
        {form.errorHandling.map((eh, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'start' }}>
            <div style={{ flex: '0 0 60%' }}>
              {i === 0 && <label style={{ ...labelStyle, fontSize: '11px' }}>Scenario</label>}
              <input
                style={inputStyle}
                value={eh.scenario}
                onChange={(e) => {
                  const arr = form.errorHandling.map((x, j) =>
                    j === i ? { ...x, scenario: e.target.value } : x
                  );
                  update('errorHandling', arr);
                }}
                placeholder="Error scenario..."
              />
            </div>
            <div style={{ flex: '0 0 calc(40% - 32px)' }}>
              {i === 0 && <label style={{ ...labelStyle, fontSize: '11px' }}>Response</label>}
              <input
                style={inputStyle}
                value={eh.response}
                onChange={(e) => {
                  const arr = form.errorHandling.map((x, j) =>
                    j === i ? { ...x, response: e.target.value } : x
                  );
                  update('errorHandling', arr);
                }}
                placeholder="System response..."
              />
            </div>
            {form.errorHandling.length > 1 && (
              <button
                type="button"
                onClick={() => update('errorHandling', form.errorHandling.filter((_, j) => j !== i))}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                  marginTop: i === 0 ? 22 : 0,
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            update('errorHandling', [...form.errorHandling, { scenario: '', response: '' }])
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            color: 'var(--gold)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </>
  );

  const renderRequirementsFields = () => (
    <>
      {/* NFRs */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={sectionTitle}>Non-Functional Requirements</h4>

        {/* Input row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            id="nfr-input"
            style={inputStyle}
            placeholder="Add an NFR..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                update('nfrs', [...form.nfrs, e.target.value.trim()]);
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('nfr-input');
              if (el && el.value.trim()) {
                update('nfrs', [...form.nfrs, el.value.trim()]);
                el.value = '';
              }
            }}
            style={{
              padding: '0 14px',
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--gold)',
              backgroundColor: 'transparent',
              color: 'var(--gold)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              flexShrink: 0,
            }}
          >
            Add
          </button>
        </div>

        {/* Suggestion chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {NFR_SUGGESTIONS.filter((s) => !form.nfrs.includes(s)).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update('nfrs', [...form.nfrs, s])}
              style={{
                padding: '4px 10px',
                borderRadius: 14,
                border: '1px dashed var(--border)',
                backgroundColor: 'transparent',
                fontSize: '11px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--gold)';
                e.currentTarget.style.color = 'var(--gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              + {s}
            </button>
          ))}
        </div>

        {/* NFR pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {form.nfrs.map((n, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 14,
                backgroundColor: 'var(--ice-warm)',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--navy)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {n}
              <button
                type="button"
                onClick={() => update('nfrs', form.nfrs.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Test Scenarios */}
      <div>
        <h4 style={sectionTitle}>Test Scenarios</h4>
        {errors.testScenarios && (
          <p style={{ color: '#C65454', fontSize: '12px', marginBottom: 8 }}>At least 1 test scenario required</p>
        )}
        {form.testScenarios.map((ts, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'start' }}>
            <textarea
              style={textareaStyle}
              rows={2}
              value={ts}
              onChange={(e) => {
                const arr = [...form.testScenarios];
                arr[i] = e.target.value;
                update('testScenarios', arr);
              }}
              placeholder={`Test scenario ${i + 1}...`}
            />
            {form.testScenarios.length > 1 && (
              <button
                type="button"
                onClick={() => update('testScenarios', form.testScenarios.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, marginTop: 8 }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => update('testScenarios', [...form.testScenarios, ''])}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            color: 'var(--gold)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </>
  );

  // --- Wizard step content ---
  const renderStep = () => {
    switch (step) {
      case 1:
        return renderIdentityFields();
      case 2:
        return renderStoryFields();
      case 3:
        return renderCriteriaFields();
      case 4:
        return renderRequirementsFields();
      default:
        return null;
    }
  };

  // --- Edit mode: all sections ---
  const renderEditForm = () => (
    <>
      <div style={{ marginBottom: 28 }}>
        <h4 style={{ ...sectionTitle, fontSize: '16px', marginBottom: 16 }}>Identity</h4>
        {renderIdentityFields()}
      </div>
      <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 0 24px' }} />
      <div style={{ marginBottom: 28 }}>
        <h4 style={{ ...sectionTitle, fontSize: '16px', marginBottom: 16 }}>Story Statement</h4>
        {renderStoryFields()}
      </div>
      <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 0 24px' }} />
      <div style={{ marginBottom: 28 }}>
        <h4 style={{ ...sectionTitle, fontSize: '16px', marginBottom: 16 }}>Acceptance Criteria & Error Handling</h4>
        {renderCriteriaFields()}
      </div>
      <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 0 24px' }} />
      <div style={{ marginBottom: 28 }}>
        <h4 style={{ ...sectionTitle, fontSize: '16px', marginBottom: 16 }}>NFRs & Test Scenarios</h4>
        {renderRequirementsFields()}
      </div>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ backgroundColor: 'rgba(15,23,42,0.4)' }}
      onClick={handleBackdropClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 560,
          maxWidth: '100vw',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
          animation: 'slideIn 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: '18px',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              {isNew ? 'New User Story' : 'Edit User Story'}
            </h2>
            {isNew && (
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  margin: '4px 0 0',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Step {step} of 4 &mdash; {STEP_LABELS[step - 1]}
              </p>
            )}
          </div>
          <button
            onClick={handleBackdropClick}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 6,
              borderRadius: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {isNew ? renderStep() : renderEditForm()}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          {isNew ? (
            <>
              {/* Back button */}
              <div>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                )}
              </div>

              {/* Step dots */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: s === step ? 'var(--navy)' : 'var(--border)',
                      transition: 'background-color 0.2s',
                    }}
                  />
                ))}
              </div>

              {/* Next / Save */}
              <button
                type="button"
                onClick={handleNext}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'var(--navy)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {step < 4 ? (
                  <>
                    Next <ChevronRight size={16} />
                  </>
                ) : (
                  'Save Story'
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBackdropClick}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'var(--navy)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
