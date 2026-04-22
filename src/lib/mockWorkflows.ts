// Mock workflow templates seeded on first load so the picker, builder,
// and run flow all have real data to render without a backend. User IDs
// mirror the demo seeds used across the app:
//   user-sa-root  — fictional Super Admin (platform templates)
//   user-ryan     — Org Admin of Hartwell & Associates
//   m-002         — Priya Shah (Internal User)

import type { WorkflowTemplate } from './workflow';

const today = new Date().toISOString();

export const MOCK_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'wf-contract-risk-review',
    name: 'Contract Risk Review',
    description:
      'End-to-end contract risk analysis: parse the document, flag non-standard clauses, benchmark against the firm\u2019s NDA playbook, and produce a risk memo.',
    practiceArea: 'Legal',
    status: 'active',
    visibility: 'platform',
    createdBy: 'user-sa-root',
    createdByName: 'YourAI Platform Team',
    updatedAt: today,
    estimatedTotalSeconds: 14,
    steps: [
      {
        id: 'st-crr-1',
        name: 'Read Documents',
        operation: 'read_documents',
        instruction: 'Process all uploaded contracts including amendments and exhibits.',
        referenceDoc: null,
        estimatedSeconds: 2,
      },
      {
        id: 'st-crr-2',
        name: 'Analyse Clauses',
        operation: 'analyse_clauses',
        instruction: 'Identify non-standard clauses, unusual terms, and any deviations from market practice. Group findings by clause type.',
        referenceDoc: null,
        estimatedSeconds: 5,
      },
      {
        id: 'st-crr-3',
        name: 'Compare Against Standard',
        operation: 'compare_against_standard',
        instruction: 'Benchmark every flagged clause against the firm\u2019s standard NDA playbook. Call out any deviation and rate it low/medium/high risk.',
        referenceDoc: {
          type: 'knowledge_pack',
          name: 'NDA Playbook',
          content: 'Firm-approved NDA templates, risk guidance, and redline examples.',
        },
        estimatedSeconds: 4,
      },
      {
        id: 'st-crr-4',
        name: 'Generate Report',
        operation: 'generate_report',
        instruction: 'Produce a structured risk memo with (1) executive summary, (2) findings grouped by severity, (3) recommended redline moves, and (4) open questions for the partner.',
        referenceDoc: null,
        estimatedSeconds: 3,
      },
    ],
  },

  {
    id: 'wf-due-diligence-summary',
    name: 'Due Diligence Summary',
    description:
      'Digests a deal room of executed agreements, financial statements, and board minutes into a concise DD summary with red-flag highlights.',
    practiceArea: 'Legal',
    status: 'active',
    visibility: 'platform',
    createdBy: 'user-sa-root',
    createdByName: 'YourAI Platform Team',
    updatedAt: today,
    estimatedTotalSeconds: 26,
    steps: [
      { id: 'st-dds-1', name: 'Read Documents',   operation: 'read_documents',          instruction: 'Process executed contracts, financial statements, and board minutes supplied by the deal team.', referenceDoc: null, estimatedSeconds: 3 },
      { id: 'st-dds-2', name: 'Analyse Clauses',  operation: 'analyse_clauses',         instruction: 'Extract change-of-control, assignment, and termination provisions. Flag anything that could trigger consent or acceleration.', referenceDoc: null, estimatedSeconds: 6 },
      { id: 'st-dds-3', name: 'Research Precedents', operation: 'research_precedents', instruction: 'Find recent precedents for change-of-control consent disputes in the relevant jurisdiction.', referenceDoc: null, estimatedSeconds: 5 },
      { id: 'st-dds-4', name: 'Compliance Check', operation: 'compliance_check',        instruction: 'Check for HSR, CFIUS, and sector-specific regulatory triggers.', referenceDoc: null, estimatedSeconds: 4 },
      { id: 'st-dds-5', name: 'Compare Against Standard', operation: 'compare_against_standard', instruction: 'Benchmark key commercial terms (pricing, warranties, indemnities) against market practice.', referenceDoc: null, estimatedSeconds: 4 },
      { id: 'st-dds-6', name: 'Generate Report',  operation: 'generate_report',         instruction: 'Produce a DD summary with (1) deal overview, (2) red-flag findings with severity, (3) regulatory triggers, (4) recommended next steps.', referenceDoc: null, estimatedSeconds: 4 },
    ],
  },

  {
    id: 'wf-compliance-audit',
    name: 'Compliance Audit',
    description:
      'Runs a SOC 2 / HIPAA-style gap analysis across policy documents and control evidence, then compiles a remediation report.',
    practiceArea: 'Compliance & Audit',
    status: 'active',
    visibility: 'org',
    createdBy: 'user-ryan',
    createdByName: 'Ryan Melade',
    updatedAt: today,
    estimatedTotalSeconds: 22,
    steps: [
      { id: 'st-ca-1', name: 'Read Documents',      operation: 'read_documents',          instruction: 'Process all policies, procedures, and control-evidence documents supplied.', referenceDoc: null, estimatedSeconds: 3 },
      { id: 'st-ca-2', name: 'Compliance Check',    operation: 'compliance_check',        instruction: 'Check every control against the SOC 2 TSC and HIPAA security rule. Map each control to the relevant criterion.', referenceDoc: null, estimatedSeconds: 6 },
      { id: 'st-ca-3', name: 'Compare Against Standard', operation: 'compare_against_standard', instruction: 'Compare current policies against the firm\u2019s compliance playbook. Flag gaps and outdated clauses.', referenceDoc: null, estimatedSeconds: 5 },
      { id: 'st-ca-4', name: 'Analyse Clauses',     operation: 'analyse_clauses',         instruction: 'Deep-dive into any flagged controls. Identify specific wording that needs to change.', referenceDoc: null, estimatedSeconds: 4 },
      { id: 'st-ca-5', name: 'Generate Report',     operation: 'generate_report',         instruction: 'Produce a compliance gap-analysis report with (1) summary, (2) gap list with severity, (3) remediation recommendations, (4) owners and timelines.', referenceDoc: null, estimatedSeconds: 4 },
    ],
  },

  {
    id: 'wf-my-nda-checker',
    name: 'My NDA Checker',
    description: 'Priya\u2019s personal quick-review workflow for inbound NDAs — parse, flag, and summarise in under 10 seconds.',
    practiceArea: 'Legal',
    status: 'active',
    visibility: 'personal',
    createdBy: 'm-002',
    createdByName: 'Priya Shah',
    updatedAt: today,
    estimatedTotalSeconds: 9,
    steps: [
      { id: 'st-nda-1', name: 'Read Documents',    operation: 'read_documents',    instruction: 'Process the NDA and any exhibits or riders.', referenceDoc: null, estimatedSeconds: 2 },
      { id: 'st-nda-2', name: 'Analyse Clauses',   operation: 'analyse_clauses',   instruction: 'Flag non-standard confidentiality scope, non-compete reach, residuals, and term length.', referenceDoc: null, estimatedSeconds: 4 },
      { id: 'st-nda-3', name: 'Generate Report',   operation: 'generate_report',   instruction: 'Short three-paragraph summary: (1) overall verdict, (2) specific concerns, (3) recommended redlines.', referenceDoc: null, estimatedSeconds: 3 },
    ],
  },
];
