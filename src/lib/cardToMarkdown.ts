/* ─── Card → Markdown serializers ────────────────────────────────────
 *
 * Converts each intent's structured card data into a clean markdown
 * report. The right-rail IntentArtifactPanel renders this via
 * ReactMarkdown — looks like a memo / Notion doc / Word file rather
 * than a styled UI component.
 *
 * Per-intent serializers handle the data shape; a fallback walks
 * the JSON generically if the shape is unrecognised. Never throws.
 */

const SEVERITY_LABEL: Record<string, string> = {
  high:   'High severity',
  medium: 'Medium severity',
  low:    'Low severity',
};

function safe(s: any): string {
  if (s == null) return '';
  if (typeof s === 'string') return s.trim();
  return String(s).trim();
}

function nonEmpty(s: any): boolean {
  return !!safe(s);
}

/* ─── Risk Memo ─── */
function riskMemoToMd(d: any): string {
  if (!d) return '';
  const lines: string[] = [];
  if (nonEmpty(d.matterName))     lines.push(`# ${d.matterName}`);
  const metaParts: string[] = [];
  if (nonEmpty(d.documentName))   metaParts.push(`**Document:** ${d.documentName}`);
  if (nonEmpty(d.documentMeta))   metaParts.push(d.documentMeta);
  else {
    if (d.pages) metaParts.push(`${d.pages} pages`);
    if (d.size)  metaParts.push(d.size);
  }
  if (nonEmpty(d.uploadedLabel))  metaParts.push(d.uploadedLabel);
  if (metaParts.length) lines.push(metaParts.join(' · '));

  if (nonEmpty(d.executiveSummary)) {
    lines.push('', '## Executive summary', '', d.executiveSummary);
  }
  if (d.highlightQuote && nonEmpty(d.highlightQuote.quote)) {
    lines.push('', `> ${d.highlightQuote.quote}`);
    if (nonEmpty(d.highlightQuote.caption)) lines.push(`> — *${d.highlightQuote.caption}*`);
  }
  if (nonEmpty(d.trailingSummary)) {
    lines.push('', d.trailingSummary);
  }

  const findings = Array.isArray(d.findings) ? d.findings : [];
  if (findings.length) {
    const groups: Record<string, any[]> = { high: [], medium: [], low: [] };
    findings.forEach((f: any) => {
      const sev = (safe(f.severity) || 'medium').toLowerCase();
      (groups[sev] || groups.medium).push(f);
    });
    lines.push('', '## Findings');
    (['high', 'medium', 'low'] as const).forEach((sev) => {
      const list = groups[sev];
      if (!list.length) return;
      lines.push('', `### ${SEVERITY_LABEL[sev]} (${list.length})`);
      list.forEach((f: any, idx: number) => {
        lines.push('', `**${idx + 1}. ${safe(f.title) || 'Finding'}**`);
        const meta: string[] = [];
        if (nonEmpty(f.location)) meta.push(`Location: ${f.location}`);
        if (nonEmpty(f.owner))    meta.push(`Owner: ${f.owner}`);
        if (meta.length) lines.push(meta.join(' · '));
        if (nonEmpty(f.quote))          lines.push('', `> ${f.quote}`);
        if (nonEmpty(f.recommendation)) lines.push('', `**Recommendation.** ${f.recommendation}`);
      });
    });
  }
  if (nonEmpty(d.generatedLabel)) {
    lines.push('', '---', '', `*${d.generatedLabel}*`);
  }
  return lines.join('\n');
}

/* ─── Summary ─── */
function summaryToMd(d: any): string {
  if (!d) return '';
  const lines: string[] = [];
  if (nonEmpty(d.documentName)) lines.push(`# ${d.documentName}`);
  const metaParts: string[] = [];
  if (d.clauseCount) metaParts.push(`${d.clauseCount} clauses`);
  if (nonEmpty(d.fileSize)) metaParts.push(d.fileSize);
  if (nonEmpty(d.date))     metaParts.push(d.date);
  if (metaParts.length) lines.push(metaParts.join(' · '));

  if (nonEmpty(d.executiveSummary)) {
    lines.push('', '## Executive summary', '', d.executiveSummary);
  }
  if (d.metadata && typeof d.metadata === 'object') {
    const md: any = d.metadata;
    const pairs: [string, string][] = [
      ['Parties',          safe(md.parties)],
      ['Key dates',        safe(md.keyDates)],
      ['Governing law',    safe(md.governingLaw)],
      ['Key obligations',  safe(md.keyObligations)],
    ].filter((p) => p[1]) as [string, string][];
    if (pairs.length) {
      lines.push('', '## Key facts');
      pairs.forEach(([k, v]) => {
        const oneLine = v.replace(/\n+/g, ', ');
        lines.push('', `**${k}.** ${oneLine}`);
      });
    }
  }
  const keyPoints = Array.isArray(d.keyPoints) ? d.keyPoints : [];
  if (keyPoints.length) {
    lines.push('', '## Key points');
    keyPoints.forEach((p: any) => lines.push(`- ${safe(p)}`));
  }
  if (nonEmpty(d.flag)) {
    lines.push('', '## Flag', '', `> ${d.flag}`);
  }
  return lines.join('\n');
}

/* ─── Comparison ─── */
function comparisonToMd(d: any): string {
  if (!d) return '';
  const lines: string[] = [];
  const title = nonEmpty(d.matterName)
    ? d.matterName
    : (nonEmpty(d.doc1Name) && nonEmpty(d.doc2Name)) ? `${d.doc1Name} vs ${d.doc2Name}` : 'Clause comparison';
  lines.push(`# ${title}`);
  if (d.clauseCount) lines.push(`${d.clauseCount} clauses compared`);

  const rows = Array.isArray(d.rows) ? d.rows : [];
  if (rows.length) {
    const a = safe(d.doc1Name) || 'Doc 1';
    const b = safe(d.doc2Name) || 'Doc 2';
    lines.push('', '## Comparison');
    rows.forEach((r: any) => {
      lines.push('', `### ${safe(r.clause) || 'Clause'}`);
      if (r.doc1 && nonEmpty(r.doc1.text)) lines.push(`- **${a}.** ${r.doc1.text}`);
      if (r.doc2 && nonEmpty(r.doc2.text)) lines.push(`- **${b}.** ${r.doc2.text}`);
    });
  }
  if (nonEmpty(d.recommendation)) {
    lines.push('', '## Recommendation', '', d.recommendation);
  }
  return lines.join('\n');
}

/* ─── Case Brief ─── */
function caseBriefToMd(d: any): string {
  if (!d) return '';
  const lines: string[] = [];
  if (nonEmpty(d.caseName)) lines.push(`# ${d.caseName}`);
  const metaParts: string[] = [];
  if (nonEmpty(d.court))   metaParts.push(d.court);
  if (nonEmpty(d.date))    metaParts.push(d.date);
  if (nonEmpty(d.subject)) metaParts.push(d.subject);
  if (metaParts.length) lines.push(metaParts.join(' · '));

  const rows = Array.isArray(d.rows) ? d.rows : [];
  rows.forEach((r: any) => {
    if (!nonEmpty(r.value)) return;
    lines.push('', `## ${safe(r.label)}`, '', r.value);
  });
  if (d.precedence) {
    if (Array.isArray(d.precedence.tags) && d.precedence.tags.length) {
      lines.push('', '## Precedence', '', d.precedence.tags.map((t: any) => `*${safe(t)}*`).join(' · '));
    }
    if (nonEmpty(d.precedence.note)) {
      lines.push('', d.precedence.note);
    }
  }
  if (nonEmpty(d.application)) {
    lines.push('', '## Application', '', d.application);
  }
  return lines.join('\n');
}

/* ─── Research Brief ─── */
function researchBriefToMd(d: any): string {
  if (!d) return '';
  const lines: string[] = [];
  if (nonEmpty(d.topic)) lines.push(`# ${d.topic}`);
  const metaParts: string[] = [];
  if (nonEmpty(d.jurisdiction)) metaParts.push(`Jurisdiction: ${d.jurisdiction}`);
  if (d.stats) {
    const s = d.stats;
    if (s.statutes)   metaParts.push(`${s.statutes} statutes`);
    if (s.cases)      metaParts.push(`${s.cases} cases`);
    if (s.principles) metaParts.push(`${s.principles} principles`);
  }
  if (metaParts.length) lines.push(metaParts.join(' · '));

  const sections = Array.isArray(d.sections) ? d.sections : [];
  sections.forEach((s: any) => {
    if (!nonEmpty(s.title) && !nonEmpty(s.content)) return;
    lines.push('', `## ${safe(s.title) || 'Section'}`, '', safe(s.content));
    if (Array.isArray(s.citations) && s.citations.length) {
      lines.push('', '*Citations:* ' + s.citations.map((c: any) => safe(c)).join(' · '));
    }
  });
  return lines.join('\n');
}

/* ─── Clause Analysis ─── */
function clauseAnalysisToMd(d: any): string {
  if (!d) return '';
  const lines: string[] = [];
  if (nonEmpty(d.matterName))   lines.push(`# ${d.matterName}`);
  const metaParts: string[] = [];
  if (nonEmpty(d.documentName)) metaParts.push(`**Document:** ${d.documentName}`);
  if (nonEmpty(d.documentMeta)) metaParts.push(d.documentMeta);
  if (nonEmpty(d.uploadedLabel)) metaParts.push(d.uploadedLabel);
  if (metaParts.length) lines.push(metaParts.join(' · '));

  const clauses = Array.isArray(d.clauses) ? d.clauses : [];
  if (clauses.length) {
    lines.push('', '## Clauses');
    clauses.forEach((c: any, idx: number) => {
      const sev = (safe(c.risk) || '').toLowerCase();
      const sevLabel = SEVERITY_LABEL[sev] || '';
      lines.push('', `### ${idx + 1}. ${safe(c.title) || 'Clause'}`);
      const meta: string[] = [];
      if (nonEmpty(c.location)) meta.push(`Location: ${c.location}`);
      if (sevLabel)             meta.push(sevLabel);
      if (meta.length) lines.push(meta.join(' · '));
      if (nonEmpty(c.quote))          lines.push('', `> ${c.quote}`);
      if (nonEmpty(c.interpretation)) lines.push('', c.interpretation);
      if (nonEmpty(c.recommendation)) lines.push('', `**Recommendation.** ${c.recommendation}`);
    });
  }
  if (nonEmpty(d.generatedLabel)) lines.push('', '---', '', `*${d.generatedLabel}*`);
  return lines.join('\n');
}

/* ─── Timeline ─── */
function timelineToMd(d: any): string {
  if (!d) return '';
  const lines: string[] = [];
  if (nonEmpty(d.matterName))   lines.push(`# ${d.matterName}`);
  const metaParts: string[] = [];
  if (nonEmpty(d.documentName)) metaParts.push(`**Document:** ${d.documentName}`);
  if (nonEmpty(d.documentMeta)) metaParts.push(d.documentMeta);
  if (metaParts.length) lines.push(metaParts.join(' · '));

  const events = Array.isArray(d.events) ? d.events : [];
  if (events.length) {
    lines.push('', '## Timeline');
    events.forEach((e: any) => {
      const head = `**${safe(e.date) || '—'}** · ${safe(e.label) || 'Event'}`;
      lines.push('', head);
      if (nonEmpty(e.description)) lines.push(safe(e.description));
      if (nonEmpty(e.source))      lines.push(`*Source: ${e.source}*`);
    });
  }
  if (nonEmpty(d.generatedLabel)) lines.push('', '---', '', `*${d.generatedLabel}*`);
  return lines.join('\n');
}

/* ─── Generic JSON walk fallback ─── */
function genericToMd(d: any): string {
  try {
    return '```json\n' + JSON.stringify(d, null, 2) + '\n```';
  } catch {
    return String(d);
  }
}

/* ─── Public dispatcher ─── */
export function cardDataToMarkdown(intent: string, data: unknown): string {
  if (!data) return '';
  try {
    switch (intent) {
      case 'risk_assessment':         return riskMemoToMd(data);
      case 'document_summarisation':  return summaryToMd(data);
      case 'clause_comparison':       return comparisonToMd(data);
      case 'case_law_analysis':       return caseBriefToMd(data);
      case 'legal_research':          return researchBriefToMd(data);
      case 'clause_analysis':         return clauseAnalysisToMd(data);
      case 'timeline_extraction':     return timelineToMd(data);
      default:                        return genericToMd(data);
    }
  } catch {
    return genericToMd(data);
  }
}
