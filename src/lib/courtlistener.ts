// CourtListener API v4 integration
// Fetches real legal data (courts, opinions) for bot persona knowledge base
// Public endpoints — no auth required for search and courts

const BASE = 'https://www.courtlistener.com/api/rest/v4';

export interface CourtRecord {
  id: string;
  full_name: string;
  short_name: string;
  jurisdiction: string;
  citation_string: string;
  in_use: boolean;
  start_date: string | null;
  end_date: string | null;
}

export interface OpinionResult {
  caseName: string;
  court: string;
  dateFiled: string;
  docketNumber: string;
  citation: string[];
  citeCount: number;
  snippet: string;
  cluster_id: number;
}

/**
 * Fetch federal courts from CourtListener.
 */
export async function fetchCourts(jurisdiction: string = 'F', limit: number = 50): Promise<CourtRecord[]> {
  const url = `${BASE}/courts/?format=json&page_size=${limit}&jurisdiction=${jurisdiction}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CourtListener courts API error: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((c: any) => ({
    id: c.id,
    full_name: c.full_name,
    short_name: c.short_name,
    jurisdiction: c.jurisdiction,
    citation_string: c.citation_string,
    in_use: c.in_use,
    start_date: c.start_date,
    end_date: c.end_date,
  }));
}

/**
 * Search opinions by query text.
 */
export async function searchOpinions(query: string, limit: number = 10): Promise<OpinionResult[]> {
  const url = `${BASE}/search/?format=json&type=o&q=${encodeURIComponent(query)}&page_size=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CourtListener search API error: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    caseName: r.caseName || 'Untitled',
    court: r.court || '',
    dateFiled: r.dateFiled || '',
    docketNumber: r.docketNumber || '',
    citation: r.citation || [],
    citeCount: r.citeCount || 0,
    snippet: r.snippet || '',
    cluster_id: r.cluster_id || 0,
  }));
}

/**
 * Fetch recent opinions (most recently filed).
 */
export async function fetchRecentOpinions(limit: number = 10): Promise<OpinionResult[]> {
  return searchOpinions('*', limit);
}

/**
 * Fetch all data for knowledge base context.
 * Returns a formatted text block to inject into LLM system prompt.
 */
export async function fetchCourtListenerKB(): Promise<{
  courts: CourtRecord[];
  opinions: OpinionResult[];
  contextText: string;
}> {
  const [courts, opinions] = await Promise.all([
    fetchCourts('F', 30).catch(() => []),
    fetchRecentOpinions(15).catch(() => []),
  ]);

  const courtLines = courts
    .filter(c => c.in_use)
    .map(c => `- ${c.full_name} (${c.citation_string || c.id})`);

  const opinionLines = opinions.map(o =>
    `- ${o.caseName} [${o.citation.join(', ') || 'No citation'}] — Filed: ${o.dateFiled || 'N/A'}, Court: ${o.court}, Cited: ${o.citeCount} times${o.snippet ? `\n  Excerpt: ${o.snippet.replace(/<[^>]*>/g, '').slice(0, 300)}` : ''}`
  );

  const contextText = [
    '=== CourtListener Legal Database (Live Data) ===',
    '',
    `Federal Courts (${courtLines.length} active):`,
    ...courtLines.slice(0, 20),
    courtLines.length > 20 ? `  ... and ${courtLines.length - 20} more` : '',
    '',
    `Recent Federal Opinions (${opinionLines.length}):`,
    ...opinionLines,
    '',
    'Source: CourtListener.com — Free Law Project',
    '=== End CourtListener Data ===',
  ].join('\n');

  return { courts, opinions, contextText };
}

/**
 * Search CourtListener for a specific legal topic and return context.
 */
export async function searchCourtListenerKB(query: string): Promise<string> {
  const opinions = await searchOpinions(query, 10).catch(() => []);
  if (opinions.length === 0) return '';

  const lines = opinions.map(o =>
    `- ${o.caseName} [${o.citation.join(', ') || 'No citation'}] — Filed: ${o.dateFiled || 'N/A'}, Court: ${o.court}\n  ${o.snippet ? o.snippet.replace(/<[^>]*>/g, '').slice(0, 400) : ''}`
  );

  return [
    `=== CourtListener Search Results: "${query}" ===`,
    ...lines,
    '=== End Search Results ===',
  ].join('\n');
}
