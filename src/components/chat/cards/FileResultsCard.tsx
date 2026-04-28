import React from 'react';
import { FileText, ExternalLink, Folder } from 'lucide-react';
import {
  EditorialShell, EditorialHeader, EditorialFooter,
  Body, ACCENTS, COLORS, MONO,
} from './EditorialShell';

/**
 * FileResultsCard — vault search results, rendered inline in chat.
 *
 * Variants are state-aware:
 *   0 results, vault has docs       → "No files match" empty state
 *   0 results, vault is empty       → "Your vault is empty" empty state
 *   0 results, query was stripped   → "What file are you looking for?" prompt
 *   1 result                        → single prominent row
 *   2-5 results                     → all rows, each with Use
 *   >5 results                      → top 5 + "View all N in Vault →" footer
 *
 * The card is client-side only — no LLM round-trip. ChatView's
 * sendMessage short-circuits before the /api/chat fetch when the
 * active intent is `find_document` and pushes a bot message with
 * cardIntent='find_document' + cardData={ query, results, totalCount }.
 */

const TEAL = '#0D9488';

export interface FileResultRow {
  id: string | number;
  name: string;
  fileName?: string;
  fileSize?: string;
  createdAt?: string;
  folderPath?: string; // pre-stitched, e.g. "Contracts › Acme Corp"
  description?: string;
  content?: string;
}

export interface FileResultsCardData {
  query: string;            // the user's search term (post-trigger-strip)
  rawQuery?: string;        // the original message before stripping
  results: FileResultRow[]; // top N results (already sliced)
  totalCount: number;       // full match count (may exceed results.length)
  vaultIsEmpty?: boolean;   // user has 0 docs in vault
  queryWasStripped?: boolean; // trigger words stripped → empty query
}

interface FileResultsCardProps {
  data: FileResultsCardData;
  onUse?: (doc: FileResultRow) => void;
  onBrowseVault?: (prefillQuery?: string) => void;
}

const MAX_VISIBLE = 5;

// Same convention as the additive-upload note (yourai:start-new-chat):
// MessageBubble is a leaf and we don't want to thread callbacks through
// every intermediate component. ChatView listens for these at top level.
const dispatchUse = (doc: FileResultRow) => {
  try {
    window.dispatchEvent(new CustomEvent('yourai:vault-use-doc', { detail: { doc } }));
  } catch { /* ignore */ }
};
const dispatchBrowse = (prefillQuery?: string) => {
  try {
    window.dispatchEvent(new CustomEvent('yourai:vault-browse', { detail: { prefillQuery: prefillQuery || '' } }));
  } catch { /* ignore */ }
};

// Single shared inline-action button. Variant chooses fill vs outline.
function InlineButton({
  variant = 'outline',
  onClick,
  children,
}: {
  variant?: 'primary' | 'outline';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const isPrimary = variant === 'primary';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isPrimary ? '8px 16px' : '6px 14px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        background: isPrimary ? TEAL : '#fff',
        color: isPrimary ? '#fff' : TEAL,
        border: isPrimary ? 'none' : `1px solid ${TEAL}`,
        cursor: 'pointer',
        fontFamily: 'inherit',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export default function FileResultsCard({ data, onUse, onBrowseVault }: FileResultsCardProps) {
  // Fall back to window events when no explicit callback was provided.
  // Lets the dispatcher (MessageBubble) render this component without
  // plumbing props through every intermediate component.
  const handleUse = onUse || dispatchUse;
  const handleBrowse = onBrowseVault || dispatchBrowse;
  const results = Array.isArray(data?.results) ? data.results : [];
  const totalCount = typeof data?.totalCount === 'number' ? data.totalCount : results.length;
  const visible = results.slice(0, MAX_VISIBLE);
  const overflow = totalCount - visible.length;
  const query = (data?.query || '').trim();

  // ─── State branches ───────────────────────────────────────────────────
  // Empty vault (no docs at all) takes precedence over "no match".
  if (data?.vaultIsEmpty) {
    return (
      <EditorialShell accentColor={ACCENTS.teal}>
        <EditorialHeader
          intentLabel="Find Document"
          title="Your vault is empty"
          subtitle="Upload your first document to make it searchable"
          sourcePill={{ label: 'Vault', kind: 'doc' }}
        />
        <div style={{ padding: '26px 32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <Body>
            You haven't uploaded anything yet. Once you add documents — by attaching a file in chat or via the Document Vault — you'll be able to find them here by name, folder, or description.
          </Body>
          <InlineButton variant="primary" onClick={() => handleBrowse()}>
            Upload a file
            <ExternalLink size={13} />
          </InlineButton>
        </div>
        <EditorialFooter footerText="Personal vault" />
      </EditorialShell>
    );
  }

  if (data?.queryWasStripped || (!query && results.length === 0)) {
    return (
      <EditorialShell accentColor={ACCENTS.teal}>
        <EditorialHeader
          intentLabel="Find Document"
          title="What file are you looking for?"
          subtitle="Try a filename, folder, or topic"
          sourcePill={{ label: 'Vault', kind: 'doc' }}
        />
        <div style={{ padding: '26px 32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <Body>
            Tell me what you're looking for and I'll search your vault. Examples:
          </Body>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: COLORS.muted, lineHeight: 1.8 }}>
            <li><em>find Acme MSA</em></li>
            <li><em>where's the NDA template?</em></li>
            <li><em>do I have anything from Globex</em></li>
          </ul>
          <InlineButton onClick={() => handleBrowse()}>
            Browse vault
            <ExternalLink size={13} />
          </InlineButton>
        </div>
        <EditorialFooter footerText="Personal vault" />
      </EditorialShell>
    );
  }

  if (results.length === 0) {
    return (
      <EditorialShell accentColor={ACCENTS.teal}>
        <EditorialHeader
          intentLabel="Find Document"
          title="No files match"
          subtitle={`Searched for "${query}"`}
          sourcePill={{ label: 'Vault', kind: 'doc' }}
        />
        <div style={{ padding: '26px 32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <Body>
            No files match <strong>"{query}"</strong> in your vault. Try a shorter term or part of a folder name — I search filenames, descriptions, and folder paths.
          </Body>
          <InlineButton onClick={() => handleBrowse(query)}>
            Browse vault
            <ExternalLink size={13} />
          </InlineButton>
        </div>
        <EditorialFooter footerText="Personal vault" />
      </EditorialShell>
    );
  }

  // ─── Results rendering ────────────────────────────────────────────────
  const headerTitle = totalCount === 1
    ? '1 file in your vault'
    : (overflow > 0
        ? `Top ${visible.length} of ${totalCount} files in your vault`
        : `${totalCount} files in your vault`);
  const headerSubtitle = query ? `Matching "${query}"` : 'All files';

  return (
    <EditorialShell accentColor={ACCENTS.teal}>
      <EditorialHeader
        intentLabel="Find Document"
        title={headerTitle}
        subtitle={headerSubtitle}
        sourcePill={{ label: 'Vault', kind: 'doc' }}
      />
      <div style={{ padding: '26px 32px 28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {visible.map((doc, i) => (
            <div
              key={doc.id ?? `${doc.name}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 0',
                borderBottom: i === visible.length - 1 ? 'none' : `1px solid ${COLORS.border}`,
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: '#ECFDF5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FileText size={16} color={TEAL} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: COLORS.title,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: 4,
                  }}
                  title={doc.name}
                >
                  {doc.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: MONO,
                    fontSize: 11,
                    color: COLORS.muted,
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {doc.folderPath ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Folder size={11} />
                      {doc.folderPath}
                    </span>
                  ) : (
                    <span style={{ color: COLORS.faint }}>Root</span>
                  )}
                  {doc.fileSize && <span>· {doc.fileSize}</span>}
                  {doc.createdAt && <span>· {doc.createdAt}</span>}
                </div>
              </div>
              <InlineButton
                variant={i === 0 && totalCount === 1 ? 'primary' : 'outline'}
                onClick={() => handleUse(doc)}
              >
                Use
              </InlineButton>
            </div>
          ))}
        </div>
        {overflow > 0 && (
          <div
            style={{
              display: 'flex', justifyContent: 'flex-end',
              paddingTop: 14,
              borderTop: `1px solid ${COLORS.border}`,
              marginTop: 6,
            }}
          >
            <InlineButton onClick={() => handleBrowse(query)}>
              View all {totalCount} in Vault
              <ExternalLink size={13} />
            </InlineButton>
          </div>
        )}
      </div>
      <EditorialFooter footerText="Personal vault" />
    </EditorialShell>
  );
}
