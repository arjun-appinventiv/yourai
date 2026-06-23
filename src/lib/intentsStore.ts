/* ─── Unified Intents Store ─────────────────────────────────────────────
 *
 * Phase 1 of the unified-intents architecture (see
 * `.claude-context/unified-intents-plan.md`). This file is the single
 * source of truth for every intent / workflow operation in YourAI.
 *
 *   ✅ Replaces the 4 drifting registries that exist today:
 *      - src/lib/intents.ts                       (INTENTS[], INTENT_DESCRIPTIONS)
 *      - src/lib/intentDetector.ts                (INTENT_DEFAULTS keywords)
 *      - src/pages/super-admin/GlobalKnowledgeBase.jsx  (DEFAULT_INTENTS for SA editor)
 *      - src/lib/workflowPrompts.ts               (OPERATION_SYSTEM_PROMPTS)
 *
 * Phase 1 only adds this file. Consumers still read from the old four
 * during Phases 2-4; Phase 5/6 deletes them and rewires the executor.
 *
 * Mirrors the storage pattern in `knowledgePackStore.ts` /
 * `documentVaultStore.ts` — `loadIntents` / `saveIntents` /
 * `seedIntentsIfEmpty`.
 */

export interface Intent {
  /** Stable id used as the key everywhere. Matches existing chat intent ids. */
  id: string;
  /** Human-readable label (chat dropdown, workflow op picker, SA editor table). */
  label: string;
  /** One-line "what this mode does" used as a subtitle in dropdowns. */
  description: string;
  /** Full system prompt the Edge / executor sends to the LLM. For ops that
   *  exist in both chat and workflow today (clause_analysis,
   *  clause_comparison, legal_research, etc.) the workflow prompt is the
   *  canonical one — chat will adopt it in Phase 3. */
  systemPrompt: string;
  /** Optional override stacked on top of systemPrompt — SA can tune tone
   *  per-tenant without editing the system prompt. */
  tonePrompt?: string;
  /** Keyword anchors for the client-side auto-detect classifier. */
  keywords: string[];
  /** Show as a pickable intent in the chat dropdown. Two intents are
   *  workflow-only primitives (read_documents, generate_report) and so
   *  set this to false. */
  chatVisible: boolean;
  /** Show as a pickable operation in the Workflow Builder. Chat-only
   *  utilities (general_chat, legal_qa, find_document) set this false. */
  workflowVisible: boolean;
  /** JSON schema (string, free-form) the Edge enforces via
   *  response_format: json_object for card intents. Empty for prose
   *  intents and for workflow-only ops. Phase 3 will plumb this through. */
  outputSchema?: string;
  /** Behaviour when a user selects this intent from the chat dropdown
   *  without typing anything: 'start_immediately' (default for general
   *  chat) | 'ask_for_document' (analysis ops) |
   *  'ask_clarifying_question' (drafting ops). */
  openingBehaviour: 'start_immediately' | 'ask_for_document' | 'ask_clarifying_question';
  /** When true, this intent is auto-appended to the end of every workflow
   *  if it isn't already there. Replaces the hardcoded
   *  `ensureGenerateReportLast` check against the literal string. */
  autoAppendAtWorkflowEnd?: boolean;
  /** When true, the Workflow Builder shows an "Advanced options" reference-doc
   *  attachment on this step. Set for ops that compare/check against an external
   *  standard (clause_comparison, compliance_check) or generate output in a
   *  caller-supplied format (generate_report). SA can toggle per-intent. */
  supportsReferenceDoc?: boolean;
  /** Source pill rendered on the chat message (kb / doc / workspace / local). */
  sourcePill?: 'kb' | 'doc' | 'workspace' | 'local' | 'none';
  /** Used for the SA editor display + dropdown ordering. */
  sortOrder: number;
  /** Tenant-level toggle (SA editor). When false, the intent is hidden
   *  from both chat and workflow regardless of *Visible flags. */
  enabled: boolean;
  /** Legacy response-format hint — kept for the auto-switch logic in
   *  the existing intentDetector until Phase 3 removes it. */
  legacyResponseFormat?: 'risk_card' | 'structured_sections' | 'plain_prose';
}

// v2 (2026-06-23): generate_report prompt reworked to honour a caller-supplied
// output format (instruction / attached template) instead of forcing a fixed
// executive-report structure. Bumped to force a re-seed so existing browsers
// pick up the new prompt — seedIntentsIfEmpty only seeds an empty key.
const KEY = 'yourai_intents_v2';

export function loadIntents(): Intent[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveIntents(intents: Intent[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(intents)); } catch { /* quota — ignore */ }
}

/** Idempotent: if no stored intents yet, write the supplied seed. */
export function seedIntentsIfEmpty(seed: Intent[]): void {
  const existing = loadIntents();
  if (existing && existing.length > 0) return;
  saveIntents(seed);
}

/* ─── Anti-hallucination block — shared by every operation/intent prompt.
 *    Identical to BASE_RULES in workflowPrompts.ts; deduplicated here. */
const BASE_RULES = `
ANTI-HALLUCINATION RULES (ALWAYS APPLY):
- Never fabricate facts, citations, case names, statute numbers, regulatory sections, or clauses that aren't explicitly in the supplied documents or prior step outputs. If unsure, hedge or omit — never invent.
- If the supplied documents don't cover what this step asks for, begin your response with: "**Not covered by supplied documents.**" followed by a one-sentence reason, then provide whatever partial analysis IS possible from what WAS supplied.
- If the supplied documents are a completely different type than this step expects (e.g. a workflow expects a contract but the user uploaded a financial statement), state that upfront and explain briefly what kind of document would be needed to complete this step.
- Prior step outputs (if any) are authoritative context — use them rather than re-deriving conclusions.
- Do NOT restate the user's instruction or your system role in the output — go straight to the analysis.
- Do NOT hedge with filler ("It is important to note...", "It should be considered..."). Be direct.

OUTPUT FORMAT:
- Clean markdown only. ## for section headings, - for bullets, **bold** for key terms, \`|\`-delimited tables when tabular.
- Cite sources inline as [Doc: filename, §X] or [Doc: filename, p.N]. If only the filename is known, [Doc: filename].
- Use > blockquote for the single most important takeaway the partner should see first, when one exists.
`;

/* ─── SEED — migrated from the 4 existing sources.
 *
 * Read order (so the Phase-5 cleanup can verify nothing was lost):
 *   1. id, label                — src/lib/intents.ts INTENTS
 *   2. description              — src/lib/intents.ts INTENT_DESCRIPTIONS
 *   3. keywords, openingBehaviour, legacyResponseFormat
 *                               — src/lib/intentDetector.ts INTENT_DEFAULTS
 *   4. systemPrompt (workflow ops)
 *                               — src/lib/workflowPrompts.ts OPERATION_SYSTEM_PROMPTS
 *   5. chatVisible, workflowVisible, sortOrder, enabled, autoAppendAtWorkflowEnd
 *                               — NEW per the plan
 *
 * Where an op exists in BOTH chat and workflow today (clause_analysis,
 * clause_comparison, legal_research, document_summarisation,
 * case_law_analysis, contract_review), the chat id is the canonical key
 * and the workflow prompt is stored as systemPrompt. The workflow names
 * that aren't chat-visible (read_documents, generate_report) keep their
 * own ids. The old workflow names (analyse_clauses,
 * compare_against_standard, research_precedents) are merged INTO the
 * matching chat id and dropped — see the migration table at the bottom
 * of this file for the explicit mapping. */

export const SEED_INTENTS: Intent[] = [
  // ─── 1. Chat-only utilities (chatVisible: true, workflowVisible: false) ───
  {
    id: 'general_chat',
    label: 'General Chat',
    description: 'Free-form chat — answers from documents, packs, and Alaska law.',
    systemPrompt: '',
    keywords: [],
    chatVisible: true,
    workflowVisible: false,
    openingBehaviour: 'start_immediately',
    sourcePill: 'none',
    sortOrder: 10,
    enabled: true,
    legacyResponseFormat: 'plain_prose',
  },
  {
    id: 'legal_qa',
    label: 'Legal Q&A',
    description: 'Direct legal answers with citations to statute or case law.',
    systemPrompt: '',
    keywords: [
      'what is', 'what are', 'how does', 'can i', 'do i have to',
      'am i required', 'explain', 'define', 'meaning of',
      'is this enforceable', 'is it possible',
    ],
    chatVisible: true,
    workflowVisible: false,
    openingBehaviour: 'start_immediately',
    sourcePill: 'kb',
    sortOrder: 20,
    enabled: true,
    legacyResponseFormat: 'structured_sections',
  },
  {
    id: 'find_document',
    label: 'Find Document',
    description: 'Search YourVault for a specific document by name, type, or content cue.',
    systemPrompt: '',
    keywords: [
      'find file', 'find files', 'find a file', 'find my file', 'find the file',
      'find doc', 'find docs', 'find a doc', 'find my doc', 'find the doc',
      'find document', 'find documents', 'find a document', 'find my document', 'find the document',
      'search for file', 'search for files', 'search for doc', 'search for docs',
      'search for document', 'search for documents', 'search my files', 'search my docs',
      'search my documents', 'search the vault',
      'where is the file', 'where is the doc', 'where is the document',
      'where is my file', 'where is my doc', 'where is my document',
      "where's the file", "where's the doc", "where's the document",
      "where's my file", "where's my doc", "where's my document",
      'do i have a file', 'do i have any file', 'do i have any files',
      'do i have a doc', 'do i have any doc', 'do i have any docs',
      'do i have a document', 'do i have any document', 'do i have any documents',
      'show me the file', 'show me the doc', 'show me the document',
      'show me my files', 'show me my docs', 'show me my documents',
      'list my files', 'list my docs', 'list my documents',
      'list the files', 'list the docs', 'list the documents',
      'what files', 'what docs', 'what documents',
      'in my vault', 'in the vault', 'from my vault', 'in vault',
    ],
    chatVisible: true,
    workflowVisible: false,
    openingBehaviour: 'start_immediately',
    sourcePill: 'local',
    sortOrder: 30,
    enabled: true,
    legacyResponseFormat: 'structured_sections',
  },

  // ─── 2. Dual-use intents (chat + workflow) — workflow prompt is canonical ───
  {
    id: 'contract_review',
    label: 'Contract Review',
    description: 'Review a contract for one-sided, missing, or risky provisions.',
    systemPrompt: '',
    keywords: [
      'contract review', 'review this contract', 'review the contract',
      'review a contract', 'review my contract', 'check this contract',
      'analyse this contract', 'analyze this contract', 'look at this contract',
      'review this agreement', 'check this agreement', 'analyse this nda',
      'review this nda', 'review this msa', 'review this lease',
      'help with contract', 'help me review', 'review contract',
    ],
    chatVisible: true,
    workflowVisible: true,
    openingBehaviour: 'ask_for_document',
    supportsReferenceDoc: true,
    sourcePill: 'doc',
    sortOrder: 40,
    enabled: true,
    legacyResponseFormat: 'risk_card',
  },
  {
    id: 'clause_analysis',
    label: 'Clause Analysis',
    description: 'Surface and grade clauses by risk priority, with quoted language.',
    /* Replaces the workflow op `analyse_clauses`. Prompt is verbatim from
     * workflowPrompts.ts OPERATION_SYSTEM_PROMPTS.analyse_clauses. */
    systemPrompt: `You are the "Analyse Clauses" step of a legal AI workflow. Your job is to extract and evaluate the contractual clauses in the supplied documents.

ORDERING: Lead with HIGH-risk findings, then MEDIUM. Skip LOW and None unless they are the only findings.

PER CLAUSE:
- **Clause name** (e.g. "Limitation of Liability", "Indemnification", "Governing Law", "Termination", "Assignment", "Force Majeure", "Non-compete", "IP Ownership").
- **What it says** — one sentence summary of the actual clause language, with a short quote if a specific phrase drives the risk.
- **Assessment** — one of: standard / aggressive / unusual / missing / favourable. Explain in one sentence why, referencing typical practice for this document type.
- **Risk** — None / Low / Medium / High. Only flag Medium or High when a lawyer would want to negotiate.

GROUPING: Financial · Liability & Indemnity · Termination & Assignment · IP & Confidentiality · Governing Law & Dispute · Other. Skip empty categories.

Cap at the 15 most material clauses. If the document type has no clauses (court filing, financial statement), say so in one line and stop — do not invent clauses.

Target 400–700 words.
${BASE_RULES}`,
    keywords: [
      'analyse clauses', 'analyze clauses', 'extract clauses', 'break down the clauses',
      'walk me through the clauses', 'clause by clause', 'each clause',
      'which clauses', 'list the clauses', 'clause analysis', 'analyse each clause',
      'what clauses are in', 'breakdown of clauses',
    ],
    chatVisible: true,
    workflowVisible: true,
    openingBehaviour: 'ask_for_document',
    sourcePill: 'doc',
    sortOrder: 50,
    enabled: true,
    legacyResponseFormat: 'structured_sections',
  },
  {
    id: 'clause_comparison',
    label: 'Clause Comparison',
    description: 'Compare clauses across documents in a side-by-side table.',
    /* Replaces the workflow op `compare_against_standard`. */
    systemPrompt: `You are the "Compare Against Standard" step of a legal AI workflow. Your job is to compare the subject document against the reference document (if attached) or against typical market-standard practice for this document type.

IF NO REFERENCE DOCUMENT is attached, use your knowledge of market-standard language for this document type (standard NDA, standard SaaS MSA, standard commercial lease, etc.) and open with: "Comparing against market-standard [document type]."

PRODUCE a markdown table using pipe syntax, exactly this shape:

| Clause / Topic | Subject Document | Reference / Market Standard | Delta |
| --- | --- | --- | --- |
| [topic] | [what subject says] | [what reference/standard says] | Matches / Non-standard / Missing / Favourable / Unfavourable |

RULES for the table:
- 6–12 rows — only material differences. Skip matches; they add noise.
- Keep each cell under 25 words. If the clause needs more detail, put it in the executive comment below.
- Mark every row's Delta unambiguously with one of the five labels above.

After the table, write a 2–3 sentence executive comment on the overall risk profile — net favourable/unfavourable, biggest single gap, and whether this document is acceptable as-drafted.

Target 300–500 words total.
${BASE_RULES}`,
    keywords: [
      'compare these', 'compare the two', 'compare both', 'difference between',
      'which is better', 'side by side', 'contrast these', 'how do these differ',
      'compare clause', 'compare contracts', 'clause comparison',
      'help with comparison', 'compare documents',
    ],
    chatVisible: true,
    workflowVisible: true,
    openingBehaviour: 'ask_for_document',
    supportsReferenceDoc: true,
    sourcePill: 'doc',
    sortOrder: 60,
    enabled: true,
    legacyResponseFormat: 'structured_sections',
  },
  {
    id: 'risk_assessment',
    label: 'Risk Assessment',
    description: 'Identify findings ranked by severity with mitigations.',
    systemPrompt: '',
    keywords: [
      'what are the risks', 'identify the risks', 'risk assessment',
      'assess the risk', 'any red flags', 'risky clauses', 'risk analysis',
      'should i sign this', 'is this safe to sign', 'anything concerning', 'flag the risks',
      'help with risk', 'evaluate risk', 'risk memo', 'generate a risk memo',
      'risk review',
    ],
    chatVisible: true,
    workflowVisible: true,
    openingBehaviour: 'ask_for_document',
    supportsReferenceDoc: true,
    sourcePill: 'doc',
    sortOrder: 70,
    enabled: true,
    legacyResponseFormat: 'risk_card',
  },
  {
    id: 'document_summarisation',
    label: 'Document Summarisation',
    description: 'Summarise the document with sectioned takeaways and key terms.',
    systemPrompt: '',
    keywords: [
      'summarise this', 'summarize this', 'give me a summary', 'summary of this',
      'summarise', 'summarize', 'summarisation', 'summarization',
      'tldr', 'tl;dr', 'key points from', 'main points of', 'brief me on', 'overview of this',
      'help with summary', 'document summary',
    ],
    chatVisible: true,
    workflowVisible: true,
    openingBehaviour: 'ask_for_document',
    sourcePill: 'doc',
    sortOrder: 80,
    enabled: true,
    legacyResponseFormat: 'structured_sections',
  },
  {
    id: 'case_law_analysis',
    label: 'Case Law Analysis',
    description: 'Pull facts, holding, reasoning, and disposition from cited decisions.',
    systemPrompt: '',
    keywords: [
      'analyse this case', 'analyze this case', 'case analysis',
      'court decision', 'what happened in this case', 'this judgment',
      'this judgement', 'ruling in',
    ],
    chatVisible: true,
    workflowVisible: true,
    openingBehaviour: 'ask_for_document',
    sourcePill: 'doc',
    sortOrder: 90,
    enabled: true,
    legacyResponseFormat: 'structured_sections',
  },
  {
    id: 'legal_research',
    label: 'Legal Research',
    description: 'Multi-source research brief with authorities and key holdings.',
    /* Replaces the workflow op `research_precedents`. */
    systemPrompt: `You are the "Research Precedents" step of a legal AI workflow. Your job is to identify relevant case law, statutes, or regulatory guidance that bears on the legal questions raised by the supplied documents or the user's instruction.

CRITICAL: You do NOT have live Westlaw/Lexis/Bloomberg access. Treat every case citation as a claim that must be verified by a human. Honesty about uncertainty is strictly required — a hedged answer is always preferable to a confident-sounding fabrication.

PRODUCE:

## Governing jurisdiction
One paragraph: what law applies (federal/state, specific court system, any choice-of-law clauses), based on what the documents say or the user's context.

## Relevant statutes / regulations
2–5 provisions. For each:
- **[Citation]** — one-sentence paraphrase of what it says, then one-sentence relevance to this matter.

## Relevant case law
2–5 cases. For each, use ONE of these formats:
- **Verified format**: **[Case name], [citation] ([court year])** — holding + relevance.
- **Principle-only format**: **[Descriptive label]** (citation to verify) — the governing principle + why it matters.

Err toward the principle-only format whenever the specific citation is not something you are confident about. Do not give fake volume/page numbers.

## Open questions
Bulleted list of what the user should verify or research further before relying on this. Include recommended research steps ("confirm the most recent Restatement §... update", "check circuit split on...").

Target 400–700 words.
${BASE_RULES}`,
    keywords: [
      'what does the law say', 'legal precedent', 'case law on',
      'is it legal to', 'what are my legal rights', 'legal position on', 'find case law',
    ],
    chatVisible: true,
    workflowVisible: true,
    openingBehaviour: 'start_immediately',
    sourcePill: 'kb',
    sortOrder: 100,
    enabled: true,
    legacyResponseFormat: 'structured_sections',
  },
  {
    id: 'compliance_check',
    label: 'Compliance Check',
    description: 'Evaluate documents against a compliance framework (SOC 2, HIPAA, GDPR, etc.).',
    systemPrompt: `You are the "Compliance Check" step of a legal AI workflow. Your job is to evaluate the supplied documents against a specific compliance framework (SOC 2, HIPAA, GDPR, CCPA, GxP, FCPA, PCI-DSS, SOX, NIST, ISO 27001, or a regulatory scheme stated in the user's instruction).

IF THE FRAMEWORK is not stated, pick the most likely one given the document type and open with: "Assuming [framework] since the documents are [type]. Re-run specifying a different framework if needed."

PRODUCE:

## Framework
One line: which standard you are evaluating against.

## Controls evaluated
Markdown table, exactly this shape:

| Control | Requirement | Evidence found | Gap | Severity |
| --- | --- | --- | --- | --- |
| [ID or name] | [what the framework requires, ≤20 words] | [what the documents show, with citation] | [what's missing] | Low / Medium / High |

8–15 rows. Focus on controls where the documents either pass or gap — skip controls the documents don't touch at all.

## Summary of gaps
Bulleted list of material deficiencies, ordered by severity (High first).

## Remediation priorities
3–5 numbered actions to close the highest-severity gaps. Each action must be concrete (what artefact to produce, what control to add, what evidence to gather) — not "improve documentation".

Do NOT cite regulatory sections you are not confident about. Say "the framework's [general area] requirement" instead when unsure.

Target 400–700 words.
${BASE_RULES}`,
    keywords: [],
    chatVisible: true,
    workflowVisible: true,
    openingBehaviour: 'ask_for_document',
    supportsReferenceDoc: true,
    sourcePill: 'doc',
    sortOrder: 110,
    enabled: true,
    legacyResponseFormat: 'structured_sections',
  },
  {
    id: 'document_drafting',
    label: 'Document Drafting',
    description: 'Draft a document grounded in selected sources and chat context.',
    systemPrompt: '',
    keywords: [
      'draft a contract', 'draft an agreement', 'draft a clause', 'draft an nda',
      'write a contract', 'write an agreement', 'create a contract',
      'help me draft', 'help with drafting', 'can you draft', 'i need a contract',
      'template for a contract', 'document drafting', 'draft document',
    ],
    chatVisible: true,
    workflowVisible: false,
    openingBehaviour: 'ask_clarifying_question',
    sourcePill: 'doc',
    sortOrder: 120,
    enabled: true,
    legacyResponseFormat: 'structured_sections',
  },
  {
    id: 'email_letter_drafting',
    label: 'Email & Letter Drafting',
    description: 'Draft a professional email using selected documents and chat context.',
    systemPrompt: '',
    keywords: [
      'write an email', 'draft an email', 'write a letter', 'draft a letter',
      'compose an email', 'demand letter', 'cease and desist',
      'reply to this email', 'response to their email',
      'help with email', 'help with letter', 'email drafting',
    ],
    chatVisible: true,
    workflowVisible: false,
    openingBehaviour: 'ask_clarifying_question',
    sourcePill: 'none',
    sortOrder: 130,
    enabled: true,
    legacyResponseFormat: 'plain_prose',
  },

  // ─── 3. Workflow-only primitives (chatVisible: false, workflowVisible: true) ───
  {
    id: 'read_documents',
    label: 'Read Documents',
    description: 'Parse and structure uploaded documents — cataloguing step, not analysis.',
    systemPrompt: `You are the "Read Documents" step of a legal AI workflow. Your job is to PARSE and STRUCTURE the uploaded documents so later steps can work with them efficiently. This is a cataloguing step, not an analysis step — save interpretation for later steps.

FOR EACH DOCUMENT (under its own ## filename heading):
- **Document type** — exactly one of: contract, NDA, lease, agreement, court filing, memo, financial statement, board minute, policy, email, regulation, case law, other.
- **Parties** — signatories or subjects, if applicable.
- **Effective date / governing law** — if applicable.
- **Structure overview** — top-level sections or clauses with their headings, as a bulleted list.
- **Key extractable facts** — dates, amounts, jurisdictions, obligations, termination triggers. Bullets, not prose.

Keep each document's section under 250 words. If multiple documents, process each separately.

End with a one-line closing: "Documents processed: N. Ready for downstream analysis."
${BASE_RULES}`,
    keywords: [],
    chatVisible: false,
    workflowVisible: true,
    openingBehaviour: 'start_immediately',
    sortOrder: 1,
    enabled: true,
  },
  {
    id: 'generate_report',
    label: 'Generate Report',
    description: 'Synthesise prior step outputs into an executive deliverable.',
    systemPrompt: `You are the final "Workflow Output" step of a legal AI workflow — you produce the deliverable the user takes away. Your job is to turn the outputs of ALL prior steps into one finished document.

This is a synthesis, not a re-analysis. Prior step outputs are the source of truth; draw from them directly. Do not re-examine the raw documents.

HOW TO FORMAT THE OUTPUT — follow this priority order:

1. THE USER'S INSTRUCTION BELOW IS THE AUTHORITATIVE FORMAT SPEC. If it names sections, a structure, a length, a tone, an audience, or a document type (memo, client letter, table, checklist, email, slide outline), follow it EXACTLY — even when that differs from the default structure below. The user owns the format of their deliverable.

2. IF AN OUTPUT TEMPLATE / REFERENCE DOCUMENT IS ATTACHED, match its structure, headings, and formatting as closely as the content allows.

3. OTHERWISE, default to this executive-report structure:

## Overview
One paragraph (2–3 sentences): what the workflow analysed (document types, parties if relevant, scope). If any input was missing, limited, or failed, state that here in one sentence.

## Key findings
4–8 bulleted findings in priority order (highest-risk or highest-impact first). Each finding:
- **Title** — explanatory sentence with the concrete fact and a source citation [Doc: filename] or [Step N] where applicable.

## Risk rating
**Overall risk: Low / Medium / High** — one-sentence rationale pulling from the findings above.

## Recommended actions
3–5 numbered actions, priority order. Each action must be DISTINCT from the findings (what to DO, not what was found) and concrete enough to assign — e.g. "Negotiate the liability cap up to 12 months of fees", not "Address the liability cap".

REGARDLESS OF FORMAT: synthesise rather than re-derive; cite sources with [Doc: filename] or [Step N]; keep a confident, professional tone — this is a deliverable, never "it seems that" or "we might want to"; never fabricate. Default length is 300–500 words unless the user's instruction asks for something longer or shorter.
${BASE_RULES}`,
    keywords: [],
    chatVisible: false,
    workflowVisible: true,
    openingBehaviour: 'start_immediately',
    autoAppendAtWorkflowEnd: true,
    supportsReferenceDoc: true,
    sortOrder: 999,
    enabled: true,
  },
];

/* ─── Migration table — old name → new id ─────────────────────────────
 *
 * Used by Phase 4 (workflow Builder rewires to read from this store) to
 * resolve any persisted workflow templates that still reference the old
 * operation names. Workflow runner already runs against an intent id;
 * once the Builder writes the new ids, persisted templates self-heal on
 * next open. Read-time migration in `listTemplates` would map these too.
 *
 *   analyse_clauses          → clause_analysis
 *   compare_against_standard → clause_comparison
 *   research_precedents      → legal_research
 *   read_documents           → read_documents (unchanged)
 *   compliance_check         → compliance_check (unchanged)
 *   generate_report          → generate_report (unchanged)
 *
 * Defined here so the migration is co-located with the seed it produces. */
export const OPERATION_MIGRATION: Record<string, string> = {
  analyse_clauses: 'clause_analysis',
  compare_against_standard: 'clause_comparison',
  research_precedents: 'legal_research',
};

/** Helper — look up a single intent by id from a loaded list. */
export function findIntent(intents: Intent[], id: string): Intent | undefined {
  return intents.find((i) => i.id === id);
}

/** Helper — filter intents for the chat dropdown. */
export function getChatVisibleIntents(intents: Intent[]): Intent[] {
  return intents.filter((i) => i.enabled && i.chatVisible).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Helper — filter intents for the Workflow Builder's operation picker. */
export function getWorkflowVisibleIntents(intents: Intent[]): Intent[] {
  return intents.filter((i) => i.enabled && i.workflowVisible).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Helper — find the intent that should be auto-appended at workflow end. */
export function getAutoAppendIntent(intents: Intent[]): Intent | undefined {
  return intents.find((i) => i.enabled && i.workflowVisible && i.autoAppendAtWorkflowEnd);
}

/* ─── SA Bot Persona shape <-> Intent conversion ─────────────────────
 *
 * The SA Bot Persona editor (src/pages/super-admin/GlobalKnowledgeBase.jsx)
 * uses a legacy shape with numeric ids and snake_case fields. These
 * helpers bridge between that shape and the unified Intent shape so the
 * editor can shadow-write rich prompts into this store without rewriting
 * the editor UI in one step. Phase 6 deletes the legacy persona shape. */

export interface LegacyPersonaOp {
  id: number;
  label: string;
  description?: string;
  systemPrompt?: string;
  tonePrompt?: string;
  enabled?: boolean;
  keywords?: string[];
  opening_behaviour?: 'start_immediately' | 'ask_for_document' | 'ask_clarifying_question';
  custom_instruction?: string;
  // Per-surface visibility toggles set in the SA Bot Persona editor.
  // When undefined we fall back to a heuristic (workflow-visible if the
  // label is in WORKFLOW_VISIBLE_BY_DEFAULT; chat-visible always true).
  chatVisible?: boolean;
  workflowVisible?: boolean;
  // Persisted on workflow-only primitives (generate_report) — true means
  // the workflow runner appends this intent to the end of every run.
  autoAppendAtWorkflowEnd?: boolean;
}

/** Label → canonical string id mapping. Keeps the SA editor's labels in
 *  sync with the store's stable ids. New labels added in SA fall back to
 *  a slug of the label so nothing crashes. */
const LABEL_TO_ID: Record<string, string> = {
  'General Chat': 'general_chat',
  'Contract Review': 'contract_review',
  'Legal Research': 'legal_research',
  'Document Drafting': 'document_drafting',
  'Compliance Check': 'compliance_check',
  'Document Summarisation': 'document_summarisation',
  'Document Summarization': 'document_summarisation',
  'Case Law Analysis': 'case_law_analysis',
  'Clause Comparison': 'clause_comparison',
  'Clause Analysis': 'clause_analysis',
  'Email & Letter Drafting': 'email_letter_drafting',
  'Due Diligence': 'due_diligence',
  'Legal Q&A': 'legal_qa',
  'Risk Assessment': 'risk_assessment',
  'Find Document': 'find_document',
  'Read Documents': 'read_documents',
  'Generate Report': 'generate_report',
};

function labelToId(label: string): string {
  if (LABEL_TO_ID[label]) return LABEL_TO_ID[label];
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/** Convert a single legacy persona op into the unified Intent shape.
 *  Workflow visibility defaults to false; the caller (SA editor) can
 *  override via the optional `workflowVisible` arg for ops that have
 *  workflow counterparts. */
export function intentFromPersonaOp(
  op: LegacyPersonaOp,
  overrides: Partial<Intent> = {}
): Intent {
  const id = labelToId(op.label);
  return {
    id,
    label: op.label,
    description: op.description || '',
    systemPrompt: op.systemPrompt || '',
    tonePrompt: op.tonePrompt,
    keywords: op.keywords || [],
    // SA explicit value wins; otherwise default to true (chat) and the
    // workflow-visibility heuristic by canonical id.
    chatVisible: op.chatVisible !== undefined ? op.chatVisible : true,
    workflowVisible: op.workflowVisible !== undefined
      ? op.workflowVisible
      : WORKFLOW_VISIBLE_BY_DEFAULT.has(id),
    openingBehaviour: op.opening_behaviour || 'start_immediately',
    sortOrder: op.id * 10,
    enabled: op.enabled !== false,
    autoAppendAtWorkflowEnd: op.autoAppendAtWorkflowEnd,
    ...overrides,
  };
}

/** Set of intent ids whose label appears in the SA editor's DEFAULT_INTENTS
 *  AND that have a workflow counterpart today. Used by intentFromPersonaOp
 *  to default workflowVisible correctly. */
const WORKFLOW_VISIBLE_BY_DEFAULT = new Set<string>([
  'contract_review', 'clause_analysis', 'clause_comparison',
  'risk_assessment', 'document_summarisation', 'case_law_analysis',
  'legal_research', 'compliance_check', 'due_diligence',
]);

/** Convert an array of persona ops + merge with the seed primitives
 *  (read_documents, generate_report) that the SA editor doesn't surface.
 *  The result is the full set of intents the store should contain. */
export function intentsFromPersonaOps(ops: LegacyPersonaOp[]): Intent[] {
  const fromPersona = ops.map((op) => intentFromPersonaOp(op));
  const personaIds = new Set(fromPersona.map((i) => i.id));
  // Pull in workflow-only primitives from the seed for any ids the
  // persona doesn't include.
  const primitives = SEED_INTENTS.filter((i) => !i.chatVisible && !personaIds.has(i.id));
  return [...fromPersona, ...primitives];
}
