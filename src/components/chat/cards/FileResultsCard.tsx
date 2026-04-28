import React from 'react';
import { FileText, ExternalLink, Folder } from 'lucide-react';
import CardShell from './CardShell';
import CardHeader from './CardHeader';
import CardFooter from './CardFooter';

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

const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

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
      <CardShell accentColor="teal">
        <CardHeader
          intentLabel="Find Document"
          title="Your vault is empty"
          subtitle="Upload your first document to make it searchable"
          sourcePill={{ label: 'Vault', type: 'doc' }}
        />
        <div style={{ padding: '28px 28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: 0 }}>
            You haven't uploaded anything yet. Once you add documents — by attaching a file in chat or via the Document Vault — you'll be able to find them here by name, folder, or description.
          </p>
          {onBrowseVault && (
            <button
              type="button"
              onClick={() => onBrowseVault?.()}
              style={primaryBtn}
            >
              Upload a file
              <ExternalLink size={13} />
            </button>
          )}
        </div>
        <CardFooter sourceType="none" sourceName="—" />
      </CardShell>
    );
  }

  if (data?.queryWasStripped || (!query && results.length === 0)) {
    return (
      <CardShell accentColor="teal">
        <CardHeader
          intentLabel="Find Document"
          title="What file are you looking for?"
          subtitle="Try a filename, folder, or topic"
          sourcePill={{ label: 'Vault', type: 'doc' }}
        />
        <div style={{ padding: '28px 28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: 0 }}>
            Tell me what you're looking for and I'll search your vault. Examples:
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: '#4B5563', lineHeight: 1.8 }}>
            <li><em>find Acme MSA</em></li>
            <li><em>where's the NDA template?</em></li>
            <li><em>do I have anything from Globex</em></li>
          </ul>
          {onBrowseVault && (
            <button
              type="button"
              onClick={() => onBrowseVault?.()}
              style={ghostBtn}
            >
              Browse vault
              <ExternalLink size={13} />
            </button>
          )}
        </div>
        <CardFooter sourceType="none" sourceName="—" />
      </CardShell>
    );
  }

  if (results.length === 0) {
    return (
      <CardShell accentColor="teal">
        <CardHeader
          intentLabel="Find Document"
          title="No files match"
          subtitle={`Searched for "${query}"`}
          sourcePill={{ label: 'Vault', type: 'doc' }}
        />
        <div style={{ padding: '28px 28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: 0 }}>
            No files match <strong>"{query}"</strong> in your vault. Try a shorter term or part of a folder name — I search filenames, descriptions, and folder paths.
          </p>
          {onBrowseVault && (
            <button
              type="button"
              onClick={() => onBrowseVault?.(query)}
              style={ghostBtn}
            >
              Browse vault
              <ExternalLink size={13} />
            </button>
          )}
        </div>
        <CardFooter sourceType="none" sourceName="—" />
      </CardShell>
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
    <CardShell accentColor="teal">
      <CardHeader
        intentLabel="Find Document"
        title={headerTitle}
        subtitle={headerSubtitle}
        sourcePill={{ label: 'Vault', type: 'doc' }}
      />
      <div style={{ padding: '8px 0' }}>
        {visible.map((doc, i) => (
          <div
            key={doc.id ?? `${doc.name}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 22px',
              borderBottom: i === visible.length - 1 ? 'none' : '1px solid #F3F4F6',
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: '#ECFDF5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FileText size={16} color="#0D9488" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#0B1D3A',
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
                  color: '#6B7280',
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
                  <span style={{ color: '#9CA3AF' }}>Root</span>
                )}
                {doc.fileSize && <span>· {doc.fileSize}</span>}
                {doc.createdAt && <span>· {doc.createdAt}</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUse?.(doc)}
              style={i === 0 && totalCount === 1 ? primaryBtn : useBtn}
            >
              Use
            </button>
          </div>
        ))}
      </div>
      {overflow > 0 && onBrowseVault && (
        <div
          style={{
            display: 'flex', justifyContent: 'flex-end',
            padding: '12px 22px',
            borderTop: '1px solid #F3F4F6',
          }}
        >
          <button
            type="button"
            onClick={() => onBrowseVault?.(query)}
            style={ghostBtn}
          >
            View all {totalCount} in Vault
            <ExternalLink size={13} />
          </button>
        </div>
      )}
      <CardFooter sourceType="doc" sourceName={`Personal vault · ${totalCount} ${totalCount === 1 ? 'match' : 'matches'}`} />
    </CardShell>
  );
}

// ─── Inline button styles ───────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  background: '#0D9488',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const useBtn: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 500,
  background: '#fff',
  color: '#0D9488',
  border: '1px solid #0D9488',
  cursor: 'pointer',
  flexShrink: 0,
  fontFamily: 'inherit',
};

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  background: 'transparent',
  color: '#0D9488',
  border: '1px solid #0D9488',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

