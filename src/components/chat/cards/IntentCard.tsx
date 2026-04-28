import React from 'react';
import SummaryCard, { type SummaryCardData } from './SummaryCard';
import ComparisonCard, { type ComparisonCardData } from './ComparisonCard';
import CaseBriefCard, { type CaseBriefCardData } from './CaseBriefCard';
import ResearchBriefCard, { type ResearchBriefCardData } from './ResearchBriefCard';
import RiskMemoCard, { type RiskMemoCardData } from './RiskMemoCard';
import ClauseAnalysisCard, { type ClauseAnalysisCardData } from './ClauseAnalysisCard';
import TimelineCard, { type TimelineCardData } from './TimelineCard';
import FileResultsCard, { type FileResultsCardData, type FileResultRow } from './FileResultsCard';

/**
 * IntentCard — dispatches to the correct card component based on the
 * message's intent. Returns null if the intent doesn't match, letting
 * the caller fall back to ReactMarkdown rendering.
 */

export type CardIntent =
  | 'document_summarisation'
  | 'clause_comparison'
  | 'case_law_analysis'
  | 'legal_research'
  | 'risk_assessment'
  | 'clause_analysis'
  | 'timeline_extraction'
  | 'find_document';

export const CARD_INTENTS: CardIntent[] = [
  'document_summarisation',
  'clause_comparison',
  'case_law_analysis',
  'legal_research',
  'risk_assessment',
  'clause_analysis',
  'timeline_extraction',
  'find_document',
];

export function isCardIntent(intent: string | undefined | null): intent is CardIntent {
  return !!intent && (CARD_INTENTS as string[]).includes(intent);
}

/**
 * Try to parse a JSON string into card data. Returns null on any failure
 * — never throws. The caller should fall back to plain-text rendering
 * when null is returned.
 */
export function tryParseCardData(raw: string | undefined | null): any | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

interface IntentCardProps {
  intent: CardIntent;
  data: unknown;
  // find_document-only callbacks. Other card intents ignore these.
  onUseDoc?: (doc: FileResultRow) => void;
  onBrowseVault?: (prefillQuery?: string) => void;
}

export default function IntentCard({ intent, data, onUseDoc, onBrowseVault }: IntentCardProps): React.ReactElement | null {
  if (!data || typeof data !== 'object') return null;

  switch (intent) {
    case 'document_summarisation':
      return <SummaryCard data={data as SummaryCardData} />;
    case 'clause_comparison':
      return <ComparisonCard data={data as ComparisonCardData} />;
    case 'case_law_analysis':
      return <CaseBriefCard data={data as CaseBriefCardData} />;
    case 'legal_research':
      return <ResearchBriefCard data={data as ResearchBriefCardData} />;
    case 'risk_assessment':
      return <RiskMemoCard data={data as RiskMemoCardData} />;
    case 'clause_analysis':
      return <ClauseAnalysisCard data={data as ClauseAnalysisCardData} />;
    case 'timeline_extraction':
      return <TimelineCard data={data as TimelineCardData} />;
    case 'find_document':
      return <FileResultsCard data={data as FileResultsCardData} onUse={onUseDoc} onBrowseVault={onBrowseVault} />;
    default:
      return null;
  }
}
