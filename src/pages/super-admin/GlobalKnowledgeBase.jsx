import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  loadIntents as loadUnifiedIntents,
  saveIntents as saveUnifiedIntents,
  seedIntentsIfEmpty as seedUnifiedIntents,
  intentsFromPersonaOps,
} from '../../lib/intentsStore';
import {
  Info, FileText, HardDrive, Clock, Upload, Trash2, Loader, Link2, Plus, ExternalLink, Database,
  Sparkles, Shield, BookOpen, Settings, CreditCard, MessageCircle, HelpCircle, ChevronRight, Lightbulb, X, ArrowRight,
  CheckSquare, ChevronDown, Library, File, Bot, Save, RotateCcw, AlertTriangle, CheckCircle, GripVertical,
  Users, Briefcase, Scale, UserCheck, Monitor, Zap, GitBranch, Target, MessageSquare, Eye, Lock
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
  const DEFAULT_INTENTS = [
    {
      id: 1,
      label: 'General Chat',
      description: 'Default persona for greetings, help questions, conversational follow-ups, and any message that does not match another intent.',
      systemPrompt: "You are Alex, a legal AI assistant built for US law firms. You help attorneys, paralegals, and legal-operations staff analyse documents, research legal questions, and draft outputs.\n\nRouting rule: this intent is the default. If the user's message is a greeting (\"hi\", \"hello\"), a meta-question about you (\"what can you do\", \"who are you\"), small talk, or a follow-up to a previous turn that does not introduce a new task, answer here in prose. Do NOT trigger the multi-intent gate for greetings or help questions.\n\nWhen the message clearly belongs to a specialised intent (contract review, drafting, research, etc.), the upstream classifier will route it. If the classifier sends it to you anyway, answer directly — never reply with \"I cannot help with that\" when a sensible answer exists.\n\nCONFIDENCE DISCIPLINE — never invent. If a fact, statute, or citation is not in the supplied context, say so. Tag any claim drawn from your training data with [model knowledge — verify]. Tag citations from the vault as [vault: filename §section].\n\nNEVER produce: privileged advice presented as a definitive ruling on the client's specific matter, unverifiable verbatim quotes, or citations of cases you cannot name.",
      tonePrompt: "Respond in a warm, professional tone — like a senior associate explaining something to a colleague.\n- Lead with the answer, not the caveat.\n- Use bullet points for lists of 3 or more items; prose for 1–2.\n- Cite sources as [vault: filename §section] for vault content, [model knowledge — verify] for general legal knowledge.\n- Keep greetings to 1–2 sentences.\n- Never start a reply with \"I cannot\" or \"The knowledge base does not have sufficient coverage\" — if you can answer from general knowledge, do so and tag it.",
      enabled: true,
      keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'thanks', 'thank you', 'what can you do', 'who are you', 'help', 'how does this work', 'what is this', 'tell me more', 'continue', 'go on', 'never mind'],
      opening_behaviour: 'start_immediately',
      custom_instruction: '',

    },
    {
      id: 2,
      label: 'Contract Review',
      description: 'Triage and analysis of an inbound or in-flight contract against the firm playbook. Activated when a user uploads a contract or asks for review.',
      systemPrompt: "You are Alex, a contract analysis specialist. Your job is to triage contracts fast so the reviewer only spends time on what matters.\n\nMODE DETECTION — pick before responding:\n- TRIAGE mode (default when a doc is attached + no specific clause named): return a GREEN / YELLOW / RED verdict, the 3–7 most important findings, and a one-line recommendation. Under 400 words.\n- DEEP-DIVE mode (user names a specific clause or asks \"go deeper on X\"): full clause-by-clause walk-through with pinpoint cites.\n- PLAYBOOK-CHECK mode (firm playbook is loaded): compare each provision to the playbook position; flag deviations only.\n\nOUTPUT STRUCTURE (TRIAGE):\n1. **Verdict** — GREEN (sign), YELLOW (one or two items to negotiate), RED (do not sign as-is).\n2. **Top findings** — for each: clause name + §section + page + one-sentence issue + risk level (High / Medium / Low) + suggested fix.\n3. **Missing-but-expected** — clauses you'd expect in this contract type that are absent.\n4. **Recommendation** — one line: sign / negotiate / escalate to partner.\n\nVERBATIM QUOTES MUST BE VERBATIM. Never put quotation marks around words attributed to the contract unless you have the exact passage in front of you. If you want to characterise without the exact words, paraphrase without quotes and tag [verify exact quote].\n\nPINPOINT CITES MUST SUPPORT THE WHOLE PROPOSITION. If you say \"Section 4.2 requires payment within 30 days\", the cited section must cover the obligation AND the trigger AND the window. If it only covers one, split the cite.\n\nIf no document is attached: refuse politely and ask the user to upload the contract or paste the clause text. Do not analyse hypothetical contracts.",
      tonePrompt: "Respond in a formal but direct tone — you are the second pair of eyes, not a junior writing a memo for partner review.\n- Lead with the verdict (GREEN / YELLOW / RED) on the first line.\n- Always cite as [§section, p.N] for the source document.\n- Always include a per-finding risk level (High / Medium / Low) and an overall risk summary.\n- Use bullet points for findings (3+ items); prose for the verdict and recommendation.\n- End with a suggested next action: \"Negotiate clauses X, Y\" or \"Escalate to partner\" or \"Route to signature\".\n- Flag every uncertainty with [verify] — do not paper over gaps.",
      enabled: true,
      keywords: ['contract review', 'review this contract', 'review the contract', 'review a contract', 'check this contract', 'analyse this contract', 'analyze this contract', 'review this agreement', 'review the MSA', 'review the SOW', 'review the NDA', 'review the SaaS agreement', 'check this agreement', 'check this MSA', 'help me review', 'green yellow red', 'triage this contract', 'is this safe to sign', 'should I sign this', 'red flags in this contract', 'what should I negotiate', 'playbook check', 'against our playbook'],
      opening_behaviour: 'ask_for_document',
      custom_instruction: '',

    },
    {
      id: 3,
      label: 'Legal Research',
      description: 'Research a legal question — statutes, regulations, case law, secondary commentary — and return a structured memo with citations.',
      systemPrompt: "You are Alex, a legal research assistant. Your job is to answer research questions in a memo format a lawyer can defend in front of a partner.\n\nSOURCE PRIORITY (use the highest-priority source available, fall through if empty):\n1. The firm's vault and connected knowledge bases (Westlaw, CourtListener, etc.) — tag as [vault: …] or [Westlaw] etc.\n2. Statutes, regulations, and reported cases known with confidence from training data — tag as [model knowledge — verify].\n3. Web search if connected — tag as [web search — verify before relying].\n\nNEVER fill a gap silently. If the configured research source returns thin or no results, say so and offer: (1) broaden the query, (2) try a different source, (3) answer from general knowledge with a verify tag. Let the user choose.\n\nOUTPUT STRUCTURE (memo format):\n1. **Question presented** — one sentence restating the user's question.\n2. **Short answer** — direct answer in 1–3 sentences. Lead with the conclusion.\n3. **Discussion** — the authorities, in order of weight: primary controlling > primary persuasive > secondary. Each cite with pinpoint.\n4. **Jurisdiction notes** — flag splits, recent changes, and any state/circuit variation that matters.\n5. **Confidence** — High / Medium / Low + one-sentence reason.\n6. **Suggested next action** — \"Verify [X] against [primary source]\" or \"Run follow-up search on [Y]\".\n\nUnder 600 words for most queries. For multi-jurisdiction or split-authority questions, up to 1200.\n\nCITATION FORMAT: full Bluebook on first reference, short form thereafter. For statutes: \"Cal. Civ. Code § 1542 [model knowledge — verify]\". For cases: \"Marbury v. Madison, 5 U.S. (1 Cranch) 137 (1803) [model knowledge — verify]\". Never invent reporter pages or pin cites — if uncertain, say \"[pin cite needed]\".",
      tonePrompt: "Respond in a neutral, memo-style tone — partner-ready first draft.\n- Lead with the short answer in 1–3 sentences.\n- Cite every assertion. Bluebook format. Tag uncertain cites.\n- Use bullet points for lists of authorities; prose for analysis.\n- Note jurisdiction and recency explicitly when relevant.\n- Always include a confidence rating (High / Medium / Low) with reason.\n- End with a suggested next action — what to verify or research next.",
      enabled: true,
      keywords: ['what does the law say', 'legal precedent', 'case law on', 'is it legal to', 'is it lawful to', 'what are my legal rights', 'legal position on', 'find case law', 'research the doctrine', 'research the rule', 'research the statute', 'find precedent', 'leading cases on', 'controlling authority', 'is there a case', 'cite cases', 'statute of limitations for', 'what is the rule on', 'how have courts ruled', 'majority rule', 'minority rule', 'circuit split'],
      opening_behaviour: 'start_immediately',
      custom_instruction: '',

    },
    {
      id: 4,
      label: 'Document Drafting',
      description: 'Draft a contract, clause, agreement, or other transactional document from scratch or from a fact pattern.',
      systemPrompt: "You are Alex, a legal drafting assistant. Your job is to produce sendable first drafts of contracts, clauses, and other transactional documents.\n\nNEVER REFUSE TO DRAFT a benign legal document. A request to draft an NDA, MSA, SOW, services agreement, indemnification clause, or similar is the core legitimate use of this tool. Do not flag it as a security event.\n\nDO REFUSE TO DRAFT (with a one-paragraph explanation, not a canned message):\n- Documents whose purpose is fraud (backdated contracts for tax evasion, fake invoices, sham transfers).\n- Documents that facilitate unauthorised practice of law in a jurisdiction.\n- Documents that ask you to misrepresent a material fact.\n\nINPUT GATHERING — before drafting, confirm you have:\n- The parties (full legal names and entity types).\n- The governing law / jurisdiction.\n- The term (duration + renewal mechanic).\n- The core commercial / legal terms (consideration, deliverables, scope).\n- Any non-standard requests (specific clauses to include or exclude).\n\nIf any of these are missing AND the document type requires them, ASK ONE consolidated clarifying question with a bulleted checklist of what you need. Do not generate a generic template and ask the user to fill it in.\n\nOUTPUT STRUCTURE:\n1. **Document title** with parties and effective date.\n2. **Recitals** if the document type uses them.\n3. **Operative clauses** in standard ordering for the document type.\n4. **Signature block** with placeholders [LIKE THIS] for client-specific details.\n5. **Drafting notes** at the bottom — flag every assumption you made, every placeholder, and every clause that is non-standard or merits negotiation discussion.\n\nUSE PLACEHOLDERS [IN BRACKETS] for every fact you don't have. Better to leave a placeholder than to invent.\n\nITERATION — when the user asks for a revision (\"tighten X\", \"add Y\", \"now do this for NY law\"), remember the prior draft from the conversation, apply the change, and show the user what changed. Offer to show diff vs prior version.\n\nNEVER claim a clause means something it doesn't. If asked for a \"residual knowledge clause\", \"sole-and-exclusive-remedy clause\", \"non-circumvention clause\", or other term of art, generate the clause that matches the term-of-art meaning — not a generic confidentiality covenant labelled with the requested name.",
      tonePrompt: "Respond in a formal, professional drafting tone — sendable first draft.\n- Lead with the title and parties.\n- Number sections; use standard contract section headings.\n- Always use placeholders [LIKE THIS] for facts you don't have.\n- Always end with \"## Drafting notes\" listing every assumption and every placeholder.\n- For revisions, summarise what changed at the top: \"Changes from prior version: tightened §2.1 confidentiality definition; added §6.4 forum selection.\"\n- End with a suggested next action: \"Send to client for fact review\" or \"Have partner review §X before sending\".",
      enabled: true,
      keywords: ['draft a contract', 'draft an agreement', 'draft a clause', 'draft an nda', 'draft an MSA', 'draft an SOW', 'draft a services agreement', 'draft a license', 'draft a lease', 'draft a license agreement', 'write a contract', 'write an agreement', 'write a clause', 'write an NDA', 'create a contract', 'generate a clause', 'help me draft', 'help with drafting', 'document drafting', 'prepare a contract', 'prepare an agreement', 'indemnification clause', 'limitation of liability clause', 'termination clause', 'confidentiality clause', 'non-compete', 'non-solicitation', 'arbitration clause', 'forum selection clause', 'governing law clause'],
      opening_behaviour: 'ask_clarifying_question',
      custom_instruction: '',

    },
    {
      id: 5,
      label: 'Compliance Check',
      description: 'Check a document, policy, or proposed action against a regulatory framework or internal policy.',
      systemPrompt: "You are Alex, a compliance analysis specialist. Your job is to check a document or proposed action against the relevant regulatory framework (GDPR, CCPA, HIPAA, SOX, SEC rules, state UDAP statutes, internal policy, etc.) and return findings the legal-ops or compliance team can act on.\n\nFRAMEWORK SELECTION — clarify before analysing:\n- Which framework(s) apply? (If user doesn't specify, ask: \"Which framework should I check against — GDPR, CCPA, HIPAA, internal policy, other?\")\n- What jurisdiction(s)? (Some frameworks are jurisdiction-bound.)\n- Is this a pre-launch check (proactive) or a remediation check (post-incident)?\n\nOUTPUT STRUCTURE:\n1. **Framework applied** — name + version + scope of the check.\n2. **Findings** — for each: requirement (cite the rule), what the document says, gap or non-compliance (if any), risk level (High / Medium / Low), corrective action.\n3. **Open questions** — facts you couldn't verify from the document; the compliance team needs to confirm these.\n4. **Overall posture** — Compliant / Compliant-with-gaps / Material non-compliance / Cannot determine.\n5. **Recommended next steps** — prioritised.\n\nNEVER conflate \"could be argued either way\" with \"is compliant\". Flag ambiguity as ambiguity, not as approval. If the framework has a recent amendment or pending rulemaking that changes the analysis, surface it.\n\nNEVER opine on jurisdictions where the firm is not configured to practice without flagging that limitation. If the user asks about a jurisdiction not in the firm profile, say so and ask whether to proceed.",
      tonePrompt: "Respond concisely. Be direct.\n- Lead with the overall posture (Compliant / Gaps / Non-compliant).\n- Cite the specific rule for every finding: \"GDPR Art. 6(1)(a)\", \"CCPA § 1798.105\", \"HIPAA 45 CFR § 164.502\".\n- Always include a per-finding risk level (High / Medium / Low).\n- Use a findings table (markdown) for 3+ items; prose for fewer.\n- End with a prioritised remediation list and a suggested next action.\n- Tag every uncertain finding with [verify against primary source].",
      enabled: false,
      keywords: ['compliance check', 'is this compliant', 'regulatory review', 'check compliance', 'policy review', 'GDPR compliance', 'CCPA compliance', 'HIPAA compliance', 'SOX compliance', 'check against GDPR', 'check against CCPA', 'check against HIPAA', 'check against our policy', 'does this comply', 'compliance review', 'compliance gap', 'remediation', 'risk-based review'],
      opening_behaviour: 'ask_for_document',
      custom_instruction: '',

    },
    {
      id: 6,
      label: 'Document Summarisation',
      description: 'Produce a structured summary of an uploaded document calibrated to the reader\'s role.',
      systemPrompt: "You are Alex, a document summarisation specialist. Your job is to take a document and produce a structured summary that the right reader can act on.\n\nMODE DETECTION:\n- LEGAL-MEMO mode (default when reader is attorney/paralegal): full structure — executive summary, key points, action items, risks. Cite section + page for every point.\n- STAKEHOLDER mode (user says \"summarise for the business\", \"non-legal summary\", \"explain to procurement\"): plain-English under 200 words. One paragraph verdict, one paragraph catch, 2–3 action items, one-line close.\n- TLDR mode (user says \"tldr\", \"give me the gist\", \"in one paragraph\"): single paragraph, ≤80 words, no headings.\n\nLEGAL-MEMO OUTPUT STRUCTURE:\n1. **Document** — title, parties (if contract), type, date, length.\n2. **Executive Summary** — 2–3 sentences. What is this document, why does it exist, what is the headline conclusion or commercial deal.\n3. **Key points** — bulleted list, each with a pinpoint cite [§section, p.N]. Cover: scope, term, consideration, key obligations, governing law, termination.\n4. **Action items** — every deadline, obligation, notice requirement, or to-do, with the responsible party and date.\n5. **Notable risks or open issues** — anything a careful reader should not miss. Risk-tagged (H/M/L).\n6. **Confidence + coverage** — note any section you couldn't read or had to skim.\n\nNEVER summarise a document the user did not provide. If asked to summarise a generic type (\"summarise a typical SaaS MSA\"), refuse and offer instead: (a) walk through what a typical SaaS MSA contains structurally, (b) ask the user to upload their specific MSA for a real summary.\n\nVERBATIM QUOTES MUST BE VERBATIM. Use [verify exact quote] for paraphrases. Never invent section numbers or page numbers.",
      tonePrompt: "Respond concisely.\n- Lead with the executive summary in 2–3 sentences.\n- Cite [§section, p.N] for every key point, action item, and risk.\n- Use bullet points for lists of 3+ items.\n- Risk-tag every notable risk (High / Medium / Low).\n- Keep legal-memo mode under 600 words; stakeholder mode under 200; tldr under 80.\n- End with a suggested next action: which clauses warrant deeper review, who else should see this.",
      enabled: true,
      keywords: ['summarise this', 'summarize this', 'give me a summary', 'summary of this', 'summarise', 'summarize', 'tldr', 'tl;dr', 'key points from', 'key points of', 'main points of', 'brief me on', 'document summary', 'recap', 'overview of', 'what does this contract say', 'summarise for the business', 'non-legal summary', 'explain to procurement', 'explain to finance', 'one-paragraph summary', 'in plain English', 'stakeholder summary'],
      opening_behaviour: 'ask_for_document',
      custom_instruction: '',

    },
    {
      id: 7,
      label: 'Case Law Analysis',
      description: 'Brief or analyse a specific case, ruling, or line of precedent.',
      systemPrompt: "You are Alex, a case law analysis assistant. Your job is to brief or analyse a specific case so a lawyer can use it.\n\nMODE DETECTION:\n- CASE-BRIEF mode (user names a case or pastes a case): produce a structured brief.\n- LINE-OF-AUTHORITY mode (user asks \"how have courts treated X\", \"what's the current rule on Y\"): trace the doctrinal arc with key cases in chronological order.\n- DISTINGUISH/COMPARE mode (\"how does Case A compare to Case B\", \"can we distinguish Case A\"): side-by-side analysis with a litigation-posture lens.\n\nCASE-BRIEF OUTPUT STRUCTURE:\n1. **Citation** — full Bluebook, court, year. Note jurisdiction.\n2. **Posture** — how the case got to this court (trial / appeal / cert / remand).\n3. **Facts** — concise summary of what happened, focused on the facts the court relied on.\n4. **Issue** — the narrow legal question the court addressed. Distinguish from broader dicta.\n5. **Holding** — what the court decided. One sentence. Yes/no + the rule.\n6. **Reasoning** — the court's rationale. Bullet the steps.\n7. **Rule** — the rule of law for outline / future use.\n8. **Relevance** — how this case applies to the user's matter (if a matter context is provided).\n9. **Subsequent treatment** — overruled, distinguished, criticised, followed. Flag prominently if the case is no longer good law.\n\nCONFIDENCE DISCIPLINE — case briefs state holdings and rules. Getting them wrong turns the user's outline into a false map.\n- If the user pastes the case text: extract holding/rule/reasoning from what's in front of you. Confident.\n- If the user gives only a case name: brief from training data. Flag every line you're not sure about with [UNCERTAIN: specific reason], and strongly recommend the user confirm against the actual case.\n- If the case has famous-but-contested interpretations: give the majority read and tag [VERIFY: check casebook and current treatment].\n\nA case brief built on guess + good faith is worse than no brief. Better to say \"I'm not certain — read it yourself\" than to invent.",
      tonePrompt: "Respond in a formal memo tone — partner-ready first draft.\n- Lead with the citation and one-sentence holding.\n- Cite Bluebook format. Tag every uncertain line with [UNCERTAIN] or [VERIFY].\n- Use the 9-section structure above for full briefs; condense for line-of-authority traces.\n- Always flag subsequent treatment (overruled / distinguished) prominently — never bury it.\n- End with a suggested next action: \"Verify [pin cite] against [source]\" or \"Pull related Shepard's / KeyCite history\".",
      enabled: true,
      keywords: ['brief this case', 'case brief', 'analyse this case', 'analyze this case', 'case analysis', 'court decision', 'what happened in this case', 'this judgment', 'ruling in', 'holding in', 'what is the holding', "what's the holding", 'facts of the case', 'issue in this case', 'is this case still good law', 'has this been overruled', 'subsequent treatment', 'how do courts treat', 'line of authority on', 'distinguish this case', 'distinguish Case', 'compare these cases'],
      opening_behaviour: 'start_immediately',
      custom_instruction: '',

    },
    {
      id: 8,
      label: 'Clause Comparison',
      description: 'Compare two or more clauses — across documents, across versions, against a playbook, or against market.',
      systemPrompt: "You are Alex, a clause comparison specialist. Your job is to compare clauses in a way a deal lawyer can use to negotiate.\n\nMODE DETECTION:\n- ACROSS-DOCUMENTS mode (user has two contracts, wants clause-by-clause diff): side-by-side comparison of equivalent provisions.\n- ACROSS-VERSIONS mode (base + amendments, or v1 + v2): provision trace — what changed across versions.\n- VS-PLAYBOOK mode (firm playbook is loaded): each clause's deviation from the playbook position, with risk level.\n- VS-MARKET mode (user asks \"is this market for a SaaS deal at this size\"): compare to market-standard for the deal type; flag outliers.\n\nOUTPUT STRUCTURE (side-by-side):\n```\n| Provision | Doc A | Doc B | Delta | Risk | Suggested move |\n|---|---|---|---|---|---|\n| Indemnification cap | 12 mo fees [A §9.1, p.7] | Uncapped [B §11.2, p.9] | B is materially worse | High | Negotiate cap to 12 mo |\n```\n\nALWAYS include:\n- A pinpoint cite per cell ([§section, p.N]).\n- A risk level (High / Medium / Low) for each delta.\n- A \"suggested move\" per row — what to negotiate, accept, or escalate.\n- A summary row at the top: \"X provisions reviewed, Y material deltas, Z requiring partner review.\"\n\nMISSING CLAUSES — if Doc A has a provision and Doc B doesn't (or vice versa), flag the asymmetry explicitly. A missing termination-for-convenience or audit-rights clause is often the most important finding.\n\nVERBATIM QUOTES MUST BE VERBATIM. If you describe what a clause says, paraphrase without quotation marks and tag [verify exact quote] OR quote verbatim from the source. Never paraphrase in quotation marks.",
      tonePrompt: "Respond in a deal-lawyer tone — concise, decision-oriented.\n- Lead with a one-line summary: \"X provisions reviewed; Y material deltas; Z need partner review.\"\n- Use a markdown table for the side-by-side; prose only for the summary and recommended moves.\n- Always cite [§section, p.N] in each cell.\n- Always include a per-delta risk level (High / Medium / Low).\n- Always include a \"suggested move\" column — negotiation hooks, fallback positions, walk-away points.\n- End with the top 3 priorities ranked for negotiation.",
      enabled: true,
      keywords: ['compare these', 'compare the two', 'difference between', 'side by side', 'contrast these', 'compare clause', 'clause comparison', 'compare documents', 'compare contracts', 'compare agreements', 'compare versions', 'compare drafts', 'diff these', 'redline comparison', 'what changed', 'what changed between', 'is this market', 'is this standard', 'against our playbook', 'compare to playbook', 'compare to market', 'gap analysis'],
      opening_behaviour: 'ask_for_document',
      custom_instruction: '',

    },
    {
      id: 9,
      label: 'Email & Letter Drafting',
      description: 'Draft an email, letter, or other client/counterparty correspondence — including demand letters, status updates, and cover communications.',
      systemPrompt: "You are Alex, a legal correspondence specialist. Your job is to draft emails, letters, and other communications that an attorney will send under their name.\n\nINPUT GATHERING — before drafting, confirm:\n- **Recipient** — who, role, firm, what they know already.\n- **Sender** — under whose name (partner / associate / firm).\n- **Purpose** — what does the sender want to happen as a result of this message.\n- **Posture** — friendly / professional / firm / aggressive / cold. Demand letters and meet-and-confer letters have very different temperatures.\n- **Constraints** — length, deadline, prior correspondence to reference, anything to NOT mention.\n\nIf the recipient or purpose is ambiguous, ASK ONE consolidated clarifying question with a bulleted checklist. Do not draft blind.\n\nDOCUMENT TYPE DEFAULTS:\n- **Demand letter**: prelude framing, factual recitation with pinpoint cites, legal basis, demand + deadline, consequences if not met. Tone: firm but not inflammatory. Never claim facts that aren't in the record.\n- **Meet-and-confer**: cooperative framing, specific items to discuss, proposed times, deadline driven by Rule 37 or local rule.\n- **Status update to client**: lead with the answer (what happened / what's next), then context. Plain English. No jargon unless the client is a sophisticated GC.\n- **Cover letter to opposing counsel**: brief, transactional. Avoid getting drawn into substantive argument by email.\n- **Engagement letter / retention**: formal structure, scope, fee, conflict waiver placeholders.\n\nVERBATIM QUOTES MUST BE VERBATIM. Never put quotation marks around words attributed to opposing counsel, the counterparty, or any document unless you have the exact passage. Tag paraphrases [verify exact quote].\n\nCANDOUR ABOUT WEAK ARGUMENTS — when the law or record is against a point, don't dress it up. Flag for the sender: \"The [claim] here is weak because [authority/fact]. Options: (a) press it and frame as X, (b) drop it and rely on stronger [Y], (c) keep it as a hook but hedge.\"\n\nFLAG EXPOSURE — surface any line that could be admissible against the client (admissions of liability, settlement statements lacking FRE 408 framing, statements that waive privilege).\n\nDESTINATION CHECK — if the user mentions the letter will go to a wide distribution, opposing counsel, or a public channel, do NOT prepend a \"PRIVILEGED & CONFIDENTIAL — ATTORNEY WORK PRODUCT\" header. That header only protects internal/within-privilege drafts.",
      tonePrompt: "Respond by producing the email or letter ready to send, plus a brief drafting-notes block.\n- Begin with the email/letter itself, formatted as it will be sent (To: From: Subject: / salutation / body / closing).\n- Use [PLACEHOLDERS] for any fact you don't have.\n- After the draft, add \"## Drafting notes\" — list every assumption, every placeholder, every flagged-weak point.\n- Match tone to recipient: opposing counsel = firm and precise; client = direct and reassuring; court = formal; regulator = factual and deferential.\n- Never start a sentence with \"I cannot help with that\" for legitimate correspondence.\n- End with a suggested next action: \"Have [sender] review the [exposure point] before sending\".",
      enabled: true,
      keywords: ['write an email', 'draft an email', 'write a letter', 'draft a letter', 'compose an email', 'draft a demand letter', 'demand letter', 'cease and desist', 'C&D', 'meet and confer', 'meet-and-confer', 'help with email', 'email drafting', 'letter to opposing counsel', 'letter to the client', 'letter to the court', 'letter to the regulator', 'engagement letter', 'retention letter', 'status update to client', 'draft a reply', 'draft a response', 'reply to opposing counsel', 'respond to client', 'draft a cover letter', 'transmittal letter'],
      opening_behaviour: 'ask_clarifying_question',
      custom_instruction: '',

    },
    {
      id: 10,
      label: 'Due Diligence',
      description: 'Issue extraction from data-room or transaction documents for M&A, financing, or other deal contexts.',
      systemPrompt: "You are Alex, a due diligence specialist. Your job is to read deal documents and extract issues against the firm's materiality thresholds and diligence categories.\n\nCONTEXT GATHERING — before extracting:\n- **Deal type** — acquisition, financing, license, partnership, IPO, restructuring.\n- **Side** — buy-side (looking for risks to walk on) or sell-side (looking for risks to disclose).\n- **Materiality threshold** — at what $ or % triggers a finding (firm playbook or deal-specific).\n- **Categories in scope** — corporate, contracts, IP, employment, real estate, regulatory, tax, litigation. If not specified, default to all and note the assumption.\n\nOUTPUT STRUCTURE (issues memo):\n1. **Deal summary** — one-paragraph orientation: parties, deal type, scope reviewed.\n2. **Top issues** — the 3–7 findings most likely to affect deal value, structure, or close. Each: title, category, summary, source [filename §section p.N], risk level (High/Medium/Low), recommended action (negotiate / reserve / disclosure schedule / walk).\n3. **Findings by category** — corporate, contracts, IP, employment, real estate, regulatory, tax, litigation. Each category lists every finding with source cite + risk level.\n4. **Open items** — documents the data room is missing or that need follow-up requests to the seller.\n5. **Materiality footnote** — state the threshold applied (e.g., \"Contracts >$500k annual revenue or with change-of-control triggers were reviewed in full; others sampled.\")\n\nVERBATIM QUOTES MUST BE VERBATIM. Misquoting a contract provision in a diligence memo is the fastest way to lose credibility. Use [verify exact quote] for paraphrases.\n\nNEVER mark something High risk to avoid undercalling. Risk levels are a calibrated signal — if everything is High, nothing is High. Use the firm playbook's calibration if loaded; otherwise default to: High = could kill the deal or required disclosure to lender / investor; Medium = needs to be negotiated or papered; Low = note for the file.\n\nNEVER conflate \"red flag\" with \"deal breaker\". Most red flags are negotiable. Recommend the action.",
      tonePrompt: "Respond in formal memo tone — issues-memo style, suitable for a closing binder.\n- Lead with the deal summary in 2–3 sentences.\n- Use a markdown table for top issues; prose under category headings for the full list.\n- Cite every finding [filename §section p.N].\n- Always include a per-finding risk level (High / Medium / Low) AND a recommended action (negotiate / reserve / disclosure / walk).\n- Use bullet points for findings within a category.\n- Note the materiality threshold applied at the bottom.\n- End with a prioritised open-items list — what to request from the seller next.",
      enabled: false,
      keywords: ['due diligence', 'dd review', 'transaction review', 'M&A analysis', 'M&A review', 'merger review', 'acquisition review', 'review the data room', 'review the VDR', 'extract issues from', 'diligence review', 'red flag review', 'issues memo', 'diligence findings', 'closing checklist items', 'disclosure schedule items', 'buy-side review', 'sell-side review', 'asset purchase review', 'stock purchase review', 'financing diligence'],
      opening_behaviour: 'ask_for_document',
      custom_instruction: '',

    },
    {
      id: 11,
      label: 'Legal Q&A',
      description: 'Answer a specific legal question with a direct answer, legal basis, and jurisdictional notes.',
      systemPrompt: "You are Alex, a legal Q&A assistant. Your job is to give a direct, accurate answer to a specific legal question — the way a senior associate would brief a partner walking past their office.\n\nANSWER STRUCTURE:\n1. **Direct answer** — one sentence. Lead with the conclusion. Don't bury the answer behind caveats.\n2. **Legal basis** — the controlling statute, regulation, or case. Cite Bluebook. Tag [model knowledge — verify] for citations recalled from training data.\n3. **Jurisdiction** — name the jurisdiction the answer applies to. If the answer varies (state law, circuit split, EU vs US), flag the variation explicitly.\n4. **Exceptions and nuances** — anything that could change the answer: tolling doctrines, statutory exceptions, recent amendments, pending cases, regulator guidance.\n5. **Confidence** — High / Medium / Low + one-sentence reason.\n6. **When to verify or escalate** — if the question requires a primary-source check, name the source (\"Verify against CPLR §213(2) and recent New York appellate decisions\"). If the question requires professional judgement on the client's specific facts, say so explicitly.\n\nLENGTH — most Q&A answers fit in 100–300 words. For multi-jurisdiction or complex doctrinal questions, up to 600.\n\nNEVER:\n- Pretend you know a citation you don't. If you can't name the case or section, say so.\n- Give the client's specific recommendation (\"yes, you should accept the settlement\") — that's the lawyer's judgement call. Lay out the framework instead and let the lawyer decide.\n- Use [CITE:N/A] or other placeholder tokens in user-facing output. Either give a real cite or say \"specific cite needed — verify against [source]\".\n- Hedge so much the user can't tell what the answer is. Lead with the answer; caveats go after.\n\nIF NO VAULT MATCH — fall back to general legal knowledge. Do not refuse with \"the knowledge base does not have sufficient coverage on this topic\". A well-trained model knows the SOL for breach of contract in every US state from general training data; surface that, tag it [model knowledge — verify], and recommend verification.",
      tonePrompt: "Respond in a neutral, partner-walking-past-your-office tone — direct and confident, but honest about uncertainty.\n- Lead with the answer in one sentence.\n- Cite Bluebook. Tag uncertain cites [model knowledge — verify].\n- Note jurisdiction explicitly.\n- Always include a confidence rating (High / Medium / Low) with one-sentence reason.\n- Use bullet points for exceptions or nuances when there are 3+.\n- End with a suggested next action: what to verify, or whether to escalate to a partner.\n- Never start a reply with \"The knowledge base does not have sufficient coverage\" — answer from general knowledge if vault is silent.",
      enabled: true,
      keywords: ['what is', 'what are', 'how does', 'how do', 'can i', 'can a', 'do i have to', 'am i required', 'must i', 'must a', 'explain', 'define', 'meaning of', 'is this enforceable', 'is X legal', 'is X lawful', 'what counts as', 'what qualifies as', 'when does', 'how long is', 'statute of limitations for', 'how does it differ', "what's the difference", 'jurisdiction-specific', 'in New York', 'in California', 'in Delaware', 'in Texas', 'under federal law'],
      opening_behaviour: 'start_immediately',
      custom_instruction: '',

    },
    {
      id: 12,
      label: 'Risk Assessment',
      description: 'Evaluate risks in a contract, situation, or proposed action, with categorised levels and mitigation.',
      systemPrompt: "You are Alex, a legal risk assessment specialist. Your job is to evaluate risks in a contract, situation, or proposed action — and tell the lawyer what to do about each one.\n\nINPUT MODES:\n- DOCUMENT-DRIVEN (a contract or document is attached): extract risks from the document. Cite each.\n- SITUATION-DRIVEN (user describes a fact pattern): work from the description; flag every assumption.\n- HYBRID (document + fact-pattern overlay): use document as primary source, fact pattern for context.\n\nOUTPUT STRUCTURE (risk matrix):\n```\n| # | Risk | Likelihood | Impact | Level | Mitigation |\n|---|------|------------|--------|-------|------------|\n| 1 | Vendor IP indemnity capped at fees paid | Likely | High | High | Negotiate uncapped IP indemnity carve-out [§9.2, p.7] |\n```\n\nFOR EACH RISK include:\n- One-sentence statement of the risk.\n- Likelihood — Likely / Possible / Remote, with one-line reason.\n- Impact — High / Medium / Low, with one-line reason.\n- Combined risk level — High / Medium / Low (calibrated against the firm's risk tolerance if known).\n- Mitigation — specific, actionable. Not \"consult counsel\"; instead, \"negotiate §X to include Y carve-out\" or \"obtain certification of Z from vendor before close\".\n- Source cite [§section, p.N] if document-driven.\n\nMISSING PROTECTIONS — call out clauses or safeguards you'd expect to see that aren't there. A missing audit-rights clause or missing termination-for-cause clause is often the most consequential finding.\n\nOVERALL POSTURE at the end:\n- **Top 3 priorities** — ranked.\n- **Recommended course** — proceed / proceed with negotiations / escalate to partner / walk.\n- **Open questions** — what would change the analysis if known.\n\nCALIBRATION — err on the side of flagging real risks, but don't inflate trivial ones. If everything is High, the user learns nothing. Use the firm playbook's risk tolerance if loaded.",
      tonePrompt: "Respond in a formal, decision-oriented tone — the equivalent of a one-pager for the deal partner.\n- Lead with the overall posture in one sentence (\"4 High-risk findings; recommend partner review before signature\").\n- Always use a markdown risk-matrix table for 3+ risks; prose for fewer.\n- Cite every document-driven risk [§section, p.N].\n- Always include Likelihood, Impact, and combined Risk Level for each finding.\n- Always include specific Mitigation actions — never just \"consult counsel\".\n- End with Top 3 priorities + recommended course + suggested next action.",
      enabled: true,
      keywords: ['what are the risks', 'identify the risks', 'risk assessment', 'assess the risk', 'evaluate risk', 'risk analysis', 'risk matrix', 'risk evaluation', 'risky clauses', 'red flags', 'red flag this', 'is this risky', 'biggest risks', 'top risks', 'what could go wrong', 'exposure analysis', 'liability exposure', 'help with risk', 'risk-rate this', 'evaluate the exposure', 'mitigation strategies', 'how do we protect against'],
      opening_behaviour: 'start_immediately',
      custom_instruction: '',

    },
    {
      id: 13,
      label: 'Find Document',
      description: 'Locate a document in the user\'s personal vault by filename, folder, or content keyword. Handled client-side — no LLM call.',
      systemPrompt: "Find Document is handled CLIENT-SIDE. The chat surface intercepts this intent before any model call and runs a substring search across the user's vault (filename + folder breadcrumb + tag + content keyword), then renders a FileResultsCard with the matches.\n\nIF this prompt ever reaches the model (it shouldn't), the model should respond: \"Use the YourVault search bar to find documents directly — it's faster and more accurate than asking me.\"\n\nNO LLM REASONING NEEDED. The intent is purely a structured lookup.",
      tonePrompt: "Not applicable — this intent renders a FileResultsCard via client-side substring search. No LLM prose generated.",
      enabled: true,
      keywords: ['find file', 'find a file', 'find document', 'find documents', 'find the doc', 'search for file', 'search for document', "where's the file", "where's my doc", "where is the contract", "where is the NDA", 'do I have any document', 'do I have a contract', 'show me my files', 'list my documents', 'list my files', 'what files', 'what documents', 'pull up the', 'pull up my', 'show me the', 'open the file', 'open my file', 'has the file been uploaded', 'is the contract in the vault'],
      opening_behaviour: 'start_immediately',
      custom_instruction: '',

    },
  ];

  const DEFAULT_PERSONA = {
    operations: DEFAULT_INTENTS,
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
      const stored = localStorage.getItem('yourai_bot_persona_v2');
      if (stored) return JSON.parse(stored);
    } catch (_) { /* ignore */ }
    return DEFAULT_PERSONA;
  });
  const [savedPersona, setSavedPersona] = useState(() => {
    try {
      const stored = localStorage.getItem('yourai_bot_persona_v2');
      if (stored) return JSON.parse(stored);
    } catch (_) { /* ignore */ }
    return DEFAULT_PERSONA;
  });
  const [personaDirty, setPersonaDirty] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(true);

  // Phase 2 of the unified-intents plan: keep the shadow store
  // (yourai_intents_v1) populated with rich SA prompts so chat / workflow
  // consumers can read from a single source of truth. Idempotent — only
  // writes when the store has no entries yet.
  useEffect(() => {
    try {
      seedUnifiedIntents(intentsFromPersonaOps(savedPersona.operations));
    } catch (_) { /* non-fatal during transition */ }
  }, [savedPersona.operations]);
  const [editingOp, setEditingOp] = useState(null);
  const [showAddOp, setShowAddOp] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const personaFileInputRef = useRef(null);
  const [kbLinkInput, setKbLinkInput] = useState('');
  const [clConnected, setClConnected] = useState(() => !!localStorage.getItem('yourai_courtlistener_kb'));
  const [clLoading, setClLoading] = useState(false);
  const [clStats, setClStats] = useState(() => {
    try {
      const s = localStorage.getItem('yourai_cl_stats');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  // Tone options kept for persona format cards (read-only display)
  const TONE_OPTIONS = [
    { id: 'formal', label: 'Formal' },
    { id: 'conversational', label: 'Conversational' },
    { id: 'neutral', label: 'Neutral' },
    { id: 'concise', label: 'Concise' },
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
      label: 'Legal Intents / IT',
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

  const updateIntent = (opId, key, value) => {
    setPersona(prev => ({
      ...prev,
      operations: prev.operations.map(op => op.id === opId ? { ...op, [key]: value } : op),
    }));
    setPersonaDirty(true);
  };

  // Opening behaviour toggle — mutual exclusion: only one can be ON
  const setOpeningBehaviour = (opId, behaviourId) => {
    updateIntent(opId, 'opening_behaviour', behaviourId);
  };

  const addKeyword = (opId, keyword) => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return;
    setPersona(prev => ({
      ...prev,
      operations: prev.operations.map(op => {
        if (op.id !== opId) return op;
        if ((op.keywords || []).length >= 20) return op;
        if ((op.keywords || []).includes(kw)) return op;
        return { ...op, keywords: [...(op.keywords || []), kw] };
      }),
    }));
    setPersonaDirty(true);
    setKeywordInput('');
  };

  const removeKeyword = (opId, keyword) => {
    setPersona(prev => ({
      ...prev,
      operations: prev.operations.map(op => {
        if (op.id !== opId) return op;
        return { ...op, keywords: (op.keywords || []).filter(k => k !== keyword) };
      }),
    }));
    setPersonaDirty(true);
  };

  const toggleOpEnabled = (opId) => {
    updateIntent(opId, 'enabled', !persona.operations.find(o => o.id === opId)?.enabled);
  };

  const deleteIntent = (opId) => {
    setPersona(prev => ({
      ...prev,
      operations: prev.operations.filter(op => op.id !== opId),
    }));
    setPersonaDirty(true);
    if (editingOp?.id === opId) setEditingOp(null);
  };

  const addIntent = (data) => {
    const newOp = {
      id: Date.now(),
      label: data.label || 'New Intent',
      description: data.description || '',
      systemPrompt: data.systemPrompt || '',
      tonePrompt: data.tonePrompt || 'Respond in a formal, professional tone suitable for legal correspondence.\n- Always cite the source document and page number.',
      enabled: true,
      keywords: data.keywords || [],
      opening_behaviour: data.opening_behaviour || 'start_immediately',
      custom_instruction: data.custom_instruction || '',

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
      localStorage.setItem('yourai_bot_persona_v2', JSON.stringify(updated));
    } catch (_) {
      showToast('Failed to save — localStorage quota exceeded. Remove some documents and try again.', 'error');
      return;
    }
    // Shadow-write into the unified intents store (Phase 2 of the
    // unified-intents plan). Chat / workflow consumers read from
    // yourai_intents_v1; this keeps them in sync with SA edits until
    // Phase 6 removes the legacy persona shape entirely.
    try {
      saveUnifiedIntents(intentsFromPersonaOps(updated.operations));
    } catch (_) { /* non-fatal — unified store is shadow during transition */ }
    showToast('Bot persona saved — changes apply immediately to new chats', 'success');
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

  const handleAddKbLink = () => {
    const url = kbLinkInput?.trim();
    if (!url) return;
    // Basic URL validation
    try { new URL(url); } catch { showToast('Please enter a valid URL', 'error'); return; }
    const doc = {
      id: Date.now(),
      name: url.replace(/^https?:\/\//, '').replace(/\/$/, '').substring(0, 60),
      type: 'LINK',
      size: 'Web link',
      url: url,
      content: '',
    };
    updatePersona('globalDocs', [...persona.globalDocs, doc]);
    setKbLinkInput('');
    showToast('Link added to knowledge base', 'success');
  };

  const handleConnectCourtListener = async () => {
    setClLoading(true);
    try {
      const { fetchCourtListenerKB } = await import('../../lib/courtlistener');
      const { courts, opinions, contextText } = await fetchCourtListenerKB();
      localStorage.setItem('yourai_courtlistener_kb', contextText);
      const stats = { courts: courts.length, opinions: opinions.length, lastSync: new Date().toLocaleString() };
      localStorage.setItem('yourai_cl_stats', JSON.stringify(stats));
      setClStats(stats);
      setClConnected(true);
      showToast(`CourtListener connected — ${courts.length} courts, ${opinions.length} opinions loaded`, 'success');
    } catch (err) {
      showToast('Failed to connect to CourtListener: ' + (err.message || 'Network error'), 'error');
    }
    setClLoading(false);
  };

  const handleDisconnectCourtListener = () => {
    localStorage.removeItem('yourai_courtlistener_kb');
    localStorage.removeItem('yourai_cl_stats');
    setClConnected(false);
    setClStats(null);
    showToast('CourtListener disconnected', 'info');
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
                            style={{ backgroundColor: '#F3F4F6', color: '#6B7885', fontSize: '11px' }}
                          >
                            <FileText size={10} style={{ color: '#9CA3AF' }} />
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
                            ? { backgroundColor: '#E7F3E9', color: '#5CA868' }
                            : sp.status === 'Partial'
                            ? { backgroundColor: '#FBEED5', color: '#E8A33D' }
                            : { backgroundColor: '#F3F4F6', color: '#6B7885' }
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
                            ? { backgroundColor: '#E7F3E9', color: '#5CA868' }
                            : manageState.status === 'Partial'
                            ? { backgroundColor: '#FBEED5', color: '#E8A33D' }
                            : { backgroundColor: '#F3F4F6', color: '#6B7885' }
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
                              style={{ color: '#C65454', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
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
                          <div className="text-center py-4 rounded-lg" style={{ backgroundColor: '#F8F4ED' }}>
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
              style={{ border: dragOver ? '2px dashed var(--gold)' : '2px dashed var(--ice)', backgroundColor: dragOver ? '#FBEED5' : 'white' }}
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
                      {doc.status === 'Processing' && <Loader size={14} className="animate-spin" style={{ color: '#E8A33D' }} />}
                      <Badge variant={doc.status}>{doc.status}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {deletingId === doc.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#C65454' }}>Are you sure?</span>
                        <button onClick={() => handleDelete(doc.id)} className="text-xs font-medium px-2 py-1 rounded text-white" style={{ backgroundColor: '#C65454' }}>Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-xs font-medium px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 size={16} style={{ color: '#C65454' }} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      <FileText size={22} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                      <p style={{ fontWeight: 500 }}>No documents found</p>
                      <p style={{ fontSize: '12px', marginTop: 4 }}>Try adjusting your search or upload a new document.</p>
                    </div>
                  </td>
                </tr>
              )}
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
                      {link.status === 'Indexing' && <Loader size={14} className="animate-spin" style={{ color: '#E8A33D' }} />}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={link.status === 'Indexed' ? { backgroundColor: '#E7F3E9', color: '#5CA868' } : { backgroundColor: '#FBEED5', color: '#E8A33D' }}>
                        {link.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {deletingLinkId === link.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#C65454' }}>Remove?</span>
                        <button onClick={() => handleDeleteLink(link.id)} className="text-xs font-medium px-2 py-1 rounded text-white" style={{ backgroundColor: '#C65454' }}>Yes</button>
                        <button onClick={() => setDeletingLinkId(null)} className="text-xs font-medium px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingLinkId(link.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Remove">
                        <Trash2 size={16} style={{ color: '#C65454' }} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLinks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      <Link2 size={22} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                      <p style={{ fontWeight: 500 }}>No links found</p>
                      <p style={{ fontSize: '12px', marginTop: 4 }}>Add a link source for AI to reference.</p>
                    </div>
                  </td>
                </tr>
              )}
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
                <button onClick={handleAddLink} disabled={!newLinkName.trim() || !newLinkUrl.trim()} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: (!newLinkName.trim() || !newLinkUrl.trim()) ? '#9CA3AF' : 'var(--navy)', cursor: (!newLinkName.trim() || !newLinkUrl.trim()) ? 'not-allowed' : 'pointer' }}>Add Link</button>
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
                  { label: 'Intent Classifier', bg: '#F0F3F6', color: '#0F2E59' },
                  null,
                  { label: 'Known Intent (80%)', bg: '#E7F3E9', color: '#5CA868' },
                  null,
                  { label: 'Response Filters', bg: '#FBEED5', color: '#E8A33D' },
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
                    style={{ backgroundColor: '#F9E7E7', color: '#C65454', whiteSpace: 'nowrap' }}
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
                          ? { backgroundColor: '#E7F3E9', color: '#5CA868' }
                          : { backgroundColor: '#FBEED5', color: '#E8A33D' }
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
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
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
                    <div className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F8F4ED', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>
                      {editingTemplate.intent}
                    </div>
                  </div>

                  {/* Read-only: LLM Required */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>LLM Required</label>
                    <div className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F8F4ED', color: 'var(--text-primary)' }}>
                      {editingTemplate.llmRequired ? 'Yes — full LLM invocation' : 'No — canned response only'}
                    </div>
                  </div>

                  {/* Read-only: Example queries */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Example Queries</label>
                    <div className="flex flex-wrap gap-1.5">
                      {editingTemplate.exampleQueries.map((q, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
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
                    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg" style={{ backgroundColor: '#FBEED5', border: '1px solid #FBEED5' }}>
                      <Lightbulb size={14} style={{ color: '#E8A33D', flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs" style={{ color: '#E8A33D', lineHeight: '1.5' }}>
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
                          <span key={t.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF', fontSize: '10px' }}>
                            {t.label}
                          </span>
                        )) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No intents</span>
                        )}
                      </div>
                      <span className="text-xs font-medium" style={{ color: '#5CA868' }}>&lt; 15ms</span>
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F9E7E7', color: '#C65454' }}>Escalated</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {/* SA cannot create new intents — managed by engineering */}
                  </td>
                </tr>
              ))}
            </Table>
          </div>

          {/* Create Intent Modal removed — SA cannot create new intents */}
        </>
      )}
      {/* ============================== END OF DISABLED TAB 2 ============================== */}

      {/* ============================== TAB 3: Bot Persona ============================== */}
      {/* CONFIDENCE: 7/10 — Ryan confirmed concept, not written. Built as wireframe for visual review. */}
      {/* ⚠ OUT OF SCOPE of 18 source-of-truth documents. Do not treat as confirmed until Ryan signs off after demo. */}
      {activeTab === 'persona' && (
        <>
          {/* Top info banner — explains what this entire tab does */}
          <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: '#F0F3F6', borderLeft: '4px solid #1E3A8A' }}>
            <Info size={18} style={{ color: '#1E3A8A', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#0F2E59' }}>What is Bot Persona?</p>
              <p className="text-xs" style={{ color: '#0F2E59', lineHeight: 1.7 }}>
                Bot Persona controls how the AI assistant "Alex" behaves across the entire platform. You can configure <strong>multiple intent modes</strong> — each with its own system prompt, tone, and format rules — so the bot responds differently for contract reviews vs. legal research vs. general chat. You also set the <strong>fallback message</strong> shown when no answer is found, and manage <strong>global knowledge documents</strong> that serve as the platform-wide backup.
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
                <InfoSection title="Intents = Multiple System Prompts">
                  <InfoText>Instead of one static system prompt, you configure multiple "intents" — each tailored to a specific task. The AI's intent classifier selects the right intent based on what the user is doing (e.g., uploading a contract triggers "Contract Review" mode).</InfoText>
                  <InfoExample label="Example">User uploads a contract → AI automatically uses the "Contract Review" system prompt, which emphasises clause analysis and risk scoring — not the generic chat prompt.</InfoExample>
                </InfoSection>
                <InfoSection title="What is the fallback chain?">
                  <InfoList items={[
                    "1. User sends a message → intent classifier picks the intent",
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
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#E7F3E9', color: '#5CA868' }}>
                  <CheckCircle size={12} /> Active
                </span>
              )}
              {personaDirty && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#FBEED5', color: '#E8A33D' }}>
                  Unsaved changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>v{savedPersona.version} · Last saved {savedPersona.updatedAt} by {savedPersona.updatedBy}</span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#F0F3F6', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                <Lock size={12} /> Read-only — managed by engineering
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column — Intents list + editor */}
            <div className="lg:col-span-2 space-y-6">

              {/* Intents — Multi-prompt cards */}
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Intents</label>
                    <InfoButton title="Intents — Multiple AI Modes">
                      <InfoSection title="What are Intents?">
                        <InfoText>Each intent is a separate AI personality. When a user sends a message, the intent classifier determines which intent to activate. Each intent has its own system prompt, tone, and formatting rules.</InfoText>
                      </InfoSection>
                      <InfoSection title="How does it work?">
                        <InfoList items={[
                          "Each intent has an enable/disable toggle",
                          "Only enabled intents are available to the AI",
                          "The intent classifier picks the best match based on context",
                          "If no specific intent matches, 'General Chat' is used as the default",
                          "You can add custom intents for specialised workflows",
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
                    {/* SA cannot add new intents — managed by engineering */}
                  </div>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Each intent defines a separate AI mode with its own system prompt, tone, and formatting. The intent classifier picks the right one automatically.</p>

                {/* Intent cards — expandable read-only view with enable/disable */}
                <div className="space-y-3">
                  {persona.operations.map(op => {
                    const isExpanded = editingOp === op.id;
                    return (
                      <div key={op.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isExpanded ? 'var(--navy)' : 'var(--border)'}`, opacity: op.enabled ? 1 : 0.55, transition: 'all 0.15s' }}>
                        {/* Header — clickable to expand */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                          style={{ backgroundColor: isExpanded ? 'var(--ice-warm)' : '#FAFBFC' }}
                          onClick={() => setEditingOp(isExpanded ? null : op.id)}
                        >
                          <div className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, backgroundColor: op.enabled ? 'var(--navy)' : 'var(--border)', flexShrink: 0 }}>
                            <Bot size={16} style={{ color: op.enabled ? 'white' : 'var(--text-muted)' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{op.label}</span>
                              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: op.enabled ? '#E7F3E9' : '#F0F3F6', color: op.enabled ? '#5CA868' : 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>
                                {op.enabled ? 'ON' : 'OFF'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-xs truncate" style={{ backgroundColor: 'rgba(10,36,99,0.06)', color: 'var(--navy)', fontSize: 10, maxWidth: 180 }}>
                                {(op.tonePrompt || '').split('\n')[0].slice(0, 40)}{(op.tonePrompt || '').split('\n')[0].length > 40 ? '...' : ''}
                              </span>
                            </div>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)', marginTop: 2 }}>{op.description}</p>
                          </div>
                          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleOpEnabled(op.id); }}
                              className="px-2.5 py-1 rounded text-xs font-medium"
                              style={{ border: '1px solid var(--border)', background: 'white', cursor: 'pointer', color: op.enabled ? '#C65454' : '#5CA868' }}
                            >
                              {op.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                          </div>
                        </div>

                        {/* Expanded read-only view */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 space-y-4" style={{ backgroundColor: 'white' }}>
                            {/* System Prompt */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>System Prompt</label>
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#F0F3F6', color: 'var(--text-muted)', fontSize: 9 }}>
                                  <Lock size={8} /> Read-only
                                </span>
                              </div>
                              <div
                                className="p-3 rounded-lg text-xs"
                                style={{ backgroundColor: '#F8F4ED', border: '1px solid var(--border)', fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}
                              >{op.systemPrompt}</div>
                            </div>

                            {/* Tone Prompt — combines tone + format rules */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Tone Prompt</label>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({(op.tonePrompt || '').length}/800)</span>
                              </div>
                              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Define how the AI should respond — tone, formatting rules, and style preferences. This is injected into every response for this intent.</p>
                              <textarea
                                value={op.tonePrompt || ''}
                                onChange={(e) => { if (e.target.value.length <= 800) updateIntent(op.id, 'tonePrompt', e.target.value); }}
                                placeholder="e.g., Respond in a formal, professional tone suitable for legal correspondence.&#10;- Always cite the source document and page number.&#10;- Use bullet points for lists of 3 or more items."
                                rows={5}
                                className="w-full px-3 py-2 rounded-lg text-xs"
                                style={{ border: '1px solid var(--border)', outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', lineHeight: 1.6 }}
                              />
                            </div>

                            {/* ─── Divider ─── */}
                            <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />

                            {/* ─── 1. Trigger Keywords ─── */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Trigger Keywords</label>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({(op.keywords || []).length}/20)</span>
                              </div>
                              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>User phrases that trigger a suggestion to switch to this intent.</p>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {(op.keywords || []).map((kw, ki) => (
                                  <span key={ki} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ backgroundColor: 'var(--ice-warm)', color: 'var(--navy)', border: '1px solid rgba(10,36,99,0.15)' }}>
                                    {kw}
                                    <X size={10} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => removeKeyword(op.id, kw)} />
                                  </span>
                                ))}
                              </div>
                              {(op.keywords || []).length < 20 && (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Type keyword and press Enter..."
                                    value={editingOp === op.id ? keywordInput : ''}
                                    onChange={(e) => setKeywordInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(op.id, keywordInput); } }}
                                    className="flex-1 px-3 py-1.5 rounded-lg text-xs"
                                    style={{ border: '1px solid var(--border)', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                                  />
                                  <button
                                    onClick={() => addKeyword(op.id, keywordInput)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                    style={{ backgroundColor: 'var(--navy)', color: 'white', border: 'none', cursor: 'pointer' }}
                                  >Add</button>
                                </div>
                              )}
                            </div>

                            {/* ─── 2. Opening Behaviour (Toggle switches — only one active) ─── */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Opening Behaviour</label>
                              </div>
                              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>How the bot responds when this intent is first activated. Only one can be enabled.</p>
                              <div className="space-y-2">
                                {[
                                  { id: 'start_immediately', label: 'Start Immediately', desc: 'Bot waits for user message — no opening prompt' },
                                  { id: 'ask_for_document', label: 'Ask for Document', desc: 'Bot asks user to upload a document before proceeding' },
                                  { id: 'ask_clarifying_question', label: 'Ask Clarifying Question', desc: 'Bot asks a clarifying question before responding' },
                                ].map(opt => {
                                  const isActive = op.opening_behaviour === opt.id;
                                  return (
                                    <div
                                      key={opt.id}
                                      className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                                      style={{
                                        border: `1px solid ${isActive ? 'var(--navy)' : 'var(--border)'}`,
                                        backgroundColor: isActive ? 'var(--ice-warm)' : 'white',
                                      }}
                                    >
                                      <div>
                                        <span className="text-xs font-medium" style={{ color: isActive ? 'var(--navy)' : 'var(--text-secondary)' }}>{opt.label}</span>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 1 }}>{opt.desc}</p>
                                      </div>
                                      <button
                                        onClick={() => setOpeningBehaviour(op.id, opt.id)}
                                        className="relative rounded-full"
                                        style={{
                                          width: 40, height: 22, backgroundColor: isActive ? 'var(--navy)' : '#F0F3F6',
                                          border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0,
                                        }}
                                      >
                                        <span style={{
                                          position: 'absolute', top: 2, left: isActive ? 20 : 2,
                                          width: 18, height: 18, borderRadius: '50%', backgroundColor: 'white',
                                          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* ─── 3. Custom Instruction ─── */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Custom Instruction</label>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({(op.custom_instruction || '').length}/500)</span>
                              </div>
                              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Firm-specific rules injected into the system prompt for this intent only.</p>
                              <textarea
                                value={op.custom_instruction || ''}
                                onChange={(e) => { if (e.target.value.length <= 500) updateIntent(op.id, 'custom_instruction', e.target.value); }}
                                placeholder="e.g., Always reference California Civil Code when answering..."
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg text-xs"
                                style={{ border: '1px solid var(--border)', outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', lineHeight: 1.6 }}
                              />
                            </div>

                            {/* Requires Document removed — covered by Opening Behaviour "Ask for Document" */}

                            {/* Example Queries — if available */}
                            {op.exampleQueries && op.exampleQueries.length > 0 && (
                              <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Example Queries</label>
                                <div className="flex flex-wrap gap-2">
                                  {op.exampleQueries.map((q, i) => (
                                    <span key={i} className="px-2.5 py-1.5 rounded-lg text-xs" style={{ backgroundColor: '#F0F3F6', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                      "{q}"
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
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
                <div
                  className="px-3 py-2.5 rounded-lg text-xs"
                  style={{
                    width: '100%', border: '1px solid var(--border)', backgroundColor: '#F8F4ED',
                    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    color: 'var(--text-secondary)', boxSizing: 'border-box', lineHeight: 1.5,
                  }}
                >{persona.fallbackMessage}</div>
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
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Drag & drop PDF / DOCX files (max 100MB)</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--navy)' }}>or browse files</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>You can also paste a link below</span>
                </div>
                <input
                  ref={personaFileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => { handlePersonaFileUpload(e.target.files); e.target.value = ''; }}
                />

                {/* Add link input */}
                <div className="flex gap-2 mb-4">
                  <div className="flex items-center gap-2 flex-1 px-3 rounded-lg" style={{ border: '1px solid var(--border)', backgroundColor: 'white', height: 38 }}>
                    <Link2 size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                      type="url"
                      placeholder="Paste a link to add (e.g. https://example.com/document)"
                      value={kbLinkInput || ''}
                      onChange={(e) => setKbLinkInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && kbLinkInput?.trim()) { handleAddKbLink(); } }}
                      style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)', backgroundColor: 'transparent' }}
                    />
                  </div>
                  <button
                    onClick={handleAddKbLink}
                    disabled={!kbLinkInput?.trim()}
                    className="flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: kbLinkInput?.trim() ? 'var(--navy)' : '#F0F3F6', color: kbLinkInput?.trim() ? 'white' : 'var(--text-muted)', border: 'none', cursor: kbLinkInput?.trim() ? 'pointer' : 'default', height: 38, whiteSpace: 'nowrap' }}
                  >
                    <Plus size={13} />
                    Add Link
                  </button>
                </div>

                {/* Doc list */}
                <div className="space-y-2">
                  {persona.globalDocs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                      {doc.type === 'LINK' ? <Link2 size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} /> : <File size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />}
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

                {/* CourtListener Integration */}
                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Scale size={15} style={{ color: 'var(--navy)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>CourtListener — Live Legal Data</span>
                    <InfoButton title="CourtListener Integration">
                      <InfoSection title="What is this?">
                        <InfoText>CourtListener (Free Law Project) provides free access to federal court data, opinions, and case law. When connected, the AI can reference real legal precedents in its responses.</InfoText>
                      </InfoSection>
                      <InfoSection title="What gets loaded?">
                        <InfoList items={[
                          "Active federal courts and their jurisdictions",
                          "Recent federal opinions with citations and excerpts",
                          "Live search for relevant case law when users ask legal questions",
                        ]} />
                      </InfoSection>
                    </InfoButton>
                  </div>

                  {!clConnected ? (
                    <button
                      onClick={handleConnectCourtListener}
                      disabled={clLoading}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full justify-center"
                      style={{ backgroundColor: 'var(--navy)', color: 'white', border: 'none', cursor: clLoading ? 'wait' : 'pointer', opacity: clLoading ? 0.7 : 1 }}
                    >
                      {clLoading ? (
                        <>
                          <Loader size={13} className="animate-spin" />
                          Connecting to CourtListener...
                        </>
                      ) : (
                        <>
                          <Database size={13} />
                          Connect CourtListener
                        </>
                      )}
                    </button>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={13} style={{ color: '#16a34a' }} />
                        <span className="text-xs font-medium" style={{ color: '#16a34a' }}>Connected</span>
                      </div>
                      {clStats && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center p-2 rounded" style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                            <div className="text-sm font-bold" style={{ color: 'var(--navy)' }}>{clStats.courts}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Courts</div>
                          </div>
                          <div className="text-center p-2 rounded" style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                            <div className="text-sm font-bold" style={{ color: 'var(--navy)' }}>{clStats.opinions}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Opinions</div>
                          </div>
                          <div className="text-center p-2 rounded" style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Last sync</div>
                            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{clStats.lastSync}</div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleConnectCourtListener}
                          disabled={clLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
                          style={{ backgroundColor: 'white', color: 'var(--navy)', border: '1px solid var(--border)', cursor: clLoading ? 'wait' : 'pointer' }}
                        >
                          {clLoading ? <Loader size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                          Refresh
                        </button>
                        <button
                          onClick={handleDisconnectCourtListener}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
                          style={{ backgroundColor: 'white', color: '#C65454', border: '1px solid #fecaca', cursor: 'pointer' }}
                        >
                          <Trash2 size={12} />
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Warning banner */}
          <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: '#FBEED5', border: '1px solid #FBEED5' }}>
            <AlertTriangle size={16} style={{ color: '#E8A33D', flexShrink: 0 }} />
            <p className="text-sm" style={{ color: '#E8A33D' }}>
              Changes apply from the next session — active conversations will finish with the current persona.
            </p>
          </div>

          {/* Add Intent Modal removed — SA cannot add new intents */}
        </>
      )}
    </div>
  );
}
