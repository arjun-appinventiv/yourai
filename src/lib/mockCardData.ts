// Mock card data for development. Powers the slash-command demos
// (/demo-summary, /demo-comparison, /demo-casebrief, /demo-research)
// in the chat input so we can preview cards without a live backend.

import type { SummaryCardData } from '../components/chat/cards/SummaryCard';
import type { ComparisonCardData } from '../components/chat/cards/ComparisonCard';
import type { CaseBriefCardData } from '../components/chat/cards/CaseBriefCard';
import type { ResearchBriefCardData } from '../components/chat/cards/ResearchBriefCard';
import type { RiskMemoCardData } from '../components/chat/cards/RiskMemoCard';
import type { ClauseAnalysisCardData } from '../components/chat/cards/ClauseAnalysisCard';
import type { TimelineCardData } from '../components/chat/cards/TimelineCard';

export const MOCK_SUMMARY_CARD: SummaryCardData = {
  documentName: 'Meridian Capital NDA v2',
  clauseCount: 23,
  fileSize: '4.2 MB',
  date: 'March 2026',
  executiveSummary:
    'This Non-Disclosure Agreement between Meridian Capital and Apex Systems Corp establishes confidentiality obligations over a two-year term, governed by New York law, with mandatory AAA arbitration for disputes. Several clauses materially favour the disclosing party and merit renegotiation before execution.',
  metadata: {
    parties: 'Meridian Capital (Disclosing)\nApex Systems Corp (Receiving)',
    keyDates: 'Effective: March 1, 2026\nExpiry: March 1, 2028',
    governingLaw: 'New York State\nAAA Arbitration',
    keyObligations: 'Confidentiality, non-compete, no solicitation',
  },
  keyPoints: [
    'Non-compete extends 36 months post-termination, significantly longer than the 12-month industry standard for this sector.',
    'Disclosing party retains unilateral right to modify confidentiality scope with 14 days written notice under §4.1.',
    'No residuals clause — information retained in unaided memory is still treated as confidential in perpetuity.',
    'Automatic 12-month renewal unless a termination notice is delivered at least 90 days before expiry.',
  ],
  flag:
    'The 36-month non-compete in §7.2 and the unilateral modification rights in §4.1 should be renegotiated before signing. Typical deals in this space use 12 months and require mutual written consent.',
  sourceType: 'doc',
  sourceName: 'Meridian_NDA_v2.pdf',
};

export const MOCK_COMPARISON_CARD: ComparisonCardData = {
  doc1Name: 'NDA v1',
  doc2Name: 'NDA v2',
  clauseCount: 4,
  rows: [
    {
      clause: 'Non-Compete Duration',
      doc1: { verdict: 'better', text: '12 months post-termination.' },
      doc2: { verdict: 'worse',  text: '36 months post-termination.' },
    },
    {
      clause: 'Modification Rights',
      doc1: { verdict: 'better', text: 'Mutual written consent required.' },
      doc2: { verdict: 'worse',  text: 'Unilateral 14-day notice (§4.1).' },
    },
    {
      clause: 'Residuals Clause',
      doc1: { verdict: 'neutral', text: 'Absent in both versions.' },
      doc2: { verdict: 'neutral', text: 'Absent in both versions.' },
    },
    {
      clause: 'Dispute Resolution',
      doc1: { verdict: 'worse',  text: 'NY court litigation only.' },
      doc2: { verdict: 'better', text: 'AAA Arbitration, NY seat.' },
    },
  ],
  recommendation:
    'Push back on v2\u2019s non-compete duration and the unilateral modification clause. v2\u2019s dispute-resolution improvement is worth keeping.',
  sourceType: 'workspace',
  sourceName: 'NDA_v1.pdf + NDA_v2.pdf',
};

export const MOCK_CASE_BRIEF_CARD: CaseBriefCardData = {
  caseName: 'TechFlow Inc v Apex Systems Corp',
  court: 'SDNY',
  date: 'March 2024',
  subject: 'Force Majeure — Commercial Contract',
  rows: [
    { label: 'Parties',   value: 'TechFlow Inc (Plaintiff) v Apex Systems Corp (Defendant)' },
    { label: 'Court',     value: 'US District Court, Southern District of New York' },
    { label: 'Date',      value: 'March 14, 2024' },
    { label: 'Issue',     value: 'Whether a global semiconductor shortage qualifies as a force majeure event under a commercial supply agreement that lists "acts of God" and "government actions" but not supply-chain disruption.' },
    { label: 'Holding',   value: 'Force majeure not applicable — a foreseeable supply-chain disruption did not fit the contract\u2019s enumerated categories and the defendant failed to show impossibility of performance.', isHolding: true },
    { label: 'Reasoning', value: 'The clause required events to be unforeseeable and outside reasonable control. The court found the 2023 semiconductor shortage had been public knowledge for months prior to contract execution, failing the foreseeability test. Mitigation efforts were also inadequate.' },
  ],
  precedence: {
    tags: ['Persuasive — NY Commercial', 'District Court Only'],
    tagStyles: ['blue', 'grey'],
    note: 'Not binding in the Second Circuit but frequently cited in New York commercial-contract disputes turning on force-majeure interpretation.',
  },
  application:
    'This ruling supports the position that a well-drafted force-majeure clause should enumerate supply-chain disruption explicitly if the client wants coverage for it. For the Meridian matter, recommend pushing a broader catch-all category and a mitigation standard below strict impossibility.',
  sourceType: 'doc',
  sourceName: 'TechFlow_v_Apex.pdf',
};

export const MOCK_RESEARCH_BRIEF_CARD: ResearchBriefCardData = {
  topic: 'Non-Compete Enforceability — New York Law',
  jurisdiction: 'New York',
  stats: { statutes: 2, cases: 3, principles: 4, jurisdiction: 'NY' },
  sections: [
    {
      title: 'Applicable Statutes',
      content:
        'Non-compete enforceability in New York is governed by common law rather than a dedicated statute. **General Business Law §340** (the Donnelly Act) constrains agreements that unreasonably restrain trade, and courts apply a reasonableness test considering scope, duration, and geographic reach.',
      citations: ['GBL §340 — Donnelly Act', 'Common Law Reasonableness Test'],
    },
    {
      title: 'Relevant Case Law',
      content:
        '*BDO Seidman v Hirshberg, 93 NY2d 382 (1999)* is the foundational New York case on the enforceability of post-employment restrictive covenants. It established the three-part test: (a) protects a legitimate interest, (b) not unreasonably burdensome to the employee, and (c) not injurious to the public.',
      citations: ['BDO Seidman (1999)', 'Ashland (1993)', 'Ticor (1999)'],
    },
    {
      title: 'Key Principles',
      content:
        'Non-competes protecting **legitimate business interests** — trade secrets, confidential client relationships, and unique services — are enforceable when tailored. Duration beyond 12 months requires extraordinary justification. Geographic scope must correlate to actual markets served.',
      citations: [],
    },
    {
      title: 'Practical Implications',
      content:
        'For the Meridian Capital NDA with a 36-month non-compete, expect significant enforceability risk. Recommend negotiating to 12 months with clear, narrow protected interests. Consider garden-leave structures as an alternative where full enforcement matters.',
      citations: [],
    },
  ],
  sourceType: 'kb',
  sourceName: 'YourAI knowledge base',
};

/* ─── Risk Memo ─── */
export const MOCK_RISK_MEMO_CARD: RiskMemoCardData = {
  matterName: 'Meridian Capital NDA v2',
  documentName: 'Meridian_NDA_v2.pdf',
  documentMeta: '23 clauses · 4.2 MB · March 2026',
  pages: 24,
  size: '4.2 MB',
  uploadedLabel: 'Uploaded today',
  executiveSummary:
    'The Meridian Capital NDA materially favours the disclosing party on three structural points: a 36-month non-compete, unilateral modification rights, and perpetual confidentiality without a residuals carve-out. High-severity items should be renegotiated before execution; medium items can be handled with targeted redlines.',
  highlightQuote: {
    quote:
      "Non-compete extends 36 months post-termination — three times the 12-month industry standard for this sector.",
    caption: 'Finding #1 · High severity · Owner: Deal team',
  },
  trailingSummary:
    'Of the 9 findings below, 3 are high-severity structural issues that warrant pushback before signing. The remaining 6 are medium or low items that can be resolved through the redline process.',
  findings: [
    {
      title: 'Non-compete duration',
      severity: 'high',
      location: '§7.2',
      owner: 'Deal team',
      quote: 'The Receiving Party shall not engage in any business that competes with the Disclosing Party for a period of thirty-six (36) months…',
      recommendation: 'Counter to 12 months with narrow scope tied to confidential information actually used. Enforceability beyond 12 months faces significant risk under NY law (BDO Seidman).',
    },
    {
      title: 'Unilateral modification rights',
      severity: 'high',
      location: '§4.1',
      owner: 'Legal',
      quote: 'The Disclosing Party may modify the scope of this Agreement upon fourteen (14) days written notice…',
      recommendation: 'Require mutual written consent for modifications. Unilateral change-of-terms clauses create contract-formation risk.',
    },
    {
      title: 'No residuals clause',
      severity: 'high',
      location: '§3.4',
      owner: 'Legal',
      recommendation: 'Add a standard residuals carve-out — information retained in unaided memory should be excluded from confidentiality obligations, per market standard.',
    },
    {
      title: 'Automatic renewal',
      severity: 'medium',
      location: '§9.1',
      owner: 'Deal team',
      recommendation: 'Change to affirmative renewal (opt-in) or extend the notice window from 90 to 60 days.',
    },
    {
      title: 'Indemnification asymmetry',
      severity: 'medium',
      location: '§10.3',
      owner: 'Legal',
      recommendation: 'Make indemnification mutual and cap at 12 months of fees.',
    },
    {
      title: 'Assignment restriction',
      severity: 'low',
      location: '§12.2',
      recommendation: 'Standard carve-out for assignment in connection with a merger or sale of substantially all assets.',
    },
  ],
  sourceName: 'Meridian_NDA_v2.pdf',
  generatedLabel: 'Generated just now · Ryan',
};

/* ─── Clause Analysis ─── */
export const MOCK_CLAUSE_ANALYSIS_CARD: ClauseAnalysisCardData = {
  matterName: 'Apex MSA — Clause Walkthrough',
  documentName: 'Apex_MSA_FINAL.pdf',
  documentMeta: '18 clauses · 2.8 MB',
  pages: 18,
  size: '2.8 MB',
  uploadedLabel: 'Uploaded 2 min ago',
  clauses: [
    {
      title: 'Limitation of liability',
      location: '§11',
      risk: 'high',
      quote: "In no event shall either party's total aggregate liability exceed the fees paid in the preceding six (6) months.",
      interpretation: 'Caps liability at 6 months of fees — below the 12-month industry standard. If the contract value is material, this cap may leave you under-protected on data-breach scenarios.',
      recommendation: 'Counter to 12 months. Carve out breaches of confidentiality and indemnification obligations from the cap.',
    },
    {
      title: 'Indemnification',
      location: '§10',
      risk: 'medium',
      interpretation: 'One-way indemnification — only Apex indemnifies the other party, with no reciprocal obligation.',
      recommendation: 'Request mutual indemnification for IP infringement and breach of confidentiality.',
    },
    {
      title: 'Termination for convenience',
      location: '§13.2',
      risk: 'medium',
      quote: 'Either party may terminate this Agreement at any time with thirty (30) days written notice.',
      interpretation: 'Both parties can walk with 30 days notice. That\'s short for a multi-year engagement with significant onboarding.',
      recommendation: 'Extend to 90 days, with shorter notice reserved for material breach.',
    },
    {
      title: 'Payment terms',
      location: '§5.1',
      risk: 'low',
      interpretation: 'Net 30 on delivery. Standard commercial terms.',
    },
    {
      title: 'Governing law',
      location: '§15.1',
      risk: 'low',
      interpretation: 'New York law, with exclusive jurisdiction in SDNY. Standard for an NY-headquartered counterparty.',
    },
  ],
  sourceName: 'Apex_MSA_FINAL.pdf',
  generatedLabel: 'Generated just now',
};

/* ─── Timeline ─── */
export const MOCK_TIMELINE_CARD: TimelineCardData = {
  matterName: 'Apex v. Meridian — Discovery Timeline',
  documentName: 'Discovery_Schedule_2026.pdf',
  documentMeta: '6 pages · 340 KB',
  pages: 6,
  size: '340 KB',
  uploadedLabel: 'Uploaded today',
  events: [
    { date: 'Jan 14, 2026', kind: 'milestone', label: 'Complaint filed',       description: 'Apex Systems Corp filed complaint in SDNY alleging breach of confidentiality.', source: 'p.1' },
    { date: 'Feb 2, 2026',  kind: 'filing',    label: 'Answer due',            description: 'Meridian\'s answer and counterclaim deadline.', source: 'Rule 12(a)' },
    { date: 'Feb 18, 2026', kind: 'event',     label: 'Rule 26(f) conference', description: 'Parties met and agreed on ESI protocol.', source: 'ECF #14' },
    { date: 'Mar 3, 2026',  kind: 'deadline',  label: 'Initial disclosures',   description: 'Exchanged per Rule 26(a)(1).', source: 'ECF #18' },
    { date: 'Apr 15, 2026', kind: 'deadline',  label: 'Fact discovery closes', description: 'All depositions and document requests must be completed.', source: 'Scheduling Order §2' },
    { date: 'Jun 30, 2026', kind: 'deadline',  label: 'Expert reports due',    description: 'Plaintiff\'s expert reports; defendant\'s 30 days later.', source: 'Scheduling Order §3' },
    { date: 'Sep 8, 2026',  kind: 'milestone', label: 'Dispositive motions',   description: 'Summary judgment motions due.', source: 'Scheduling Order §5' },
  ],
  sourceName: 'Discovery_Schedule_2026.pdf',
  generatedLabel: 'Generated just now',
};
