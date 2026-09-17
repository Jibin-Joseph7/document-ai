// client/src/components/DocumentList.jsx
import { FileText, Star, Loader2, AlertCircle } from 'lucide-react';
import { TagBadge } from './TagBadge';
import { Documents } from '../lib/documents';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusIcon({ status }) {
  if (status === 'ready') return null; // the common case stays quiet
  if (status === 'processing')
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-600" title="Indexing…" />;
  return <AlertCircle className="h-3.5 w-3.5 text-error-600" title="Indexing failed" />;
}

export function DocumentList({ documents, onSelect, onChanged, emptyLabel }) {
  async function toggleFavorite(doc, e) {
    e.stopPropagation();
    const updated = await Documents.update(doc.id, { isFavorite: !doc.is_favorite });
    onChanged?.(updated.document);
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border py-16 text-center">
        <FileText className="mb-2 h-6 w-6 text-ink-faint" />
        <p className="text-sm text-ink-faint">{emptyLabel || 'No documents here yet.'}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-sm border border-border bg-surface">
      {documents.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-teal-50/40"
        >
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-ink">{doc.title}</span>
              <StatusIcon status={doc.status} />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
              <span>{formatSize(doc.size_bytes)}</span>
              <span>·</span>
              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
              {doc.category && (
                <>
                  <span>·</span>
                  <span>{doc.category}</span>
                </>
              )}
            </div>
            {doc.tags?.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {doc.tags.map((t) => (
                  <TagBadge key={t.id} name={t.name} />
                ))}
              </div>
            )}
          </div>
          <button
            onClick={(e) => toggleFavorite(doc, e)}
            aria-label={doc.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            className="shrink-0 text-ink-faint hover:text-gold-600"
          >
            <Star className={`h-4 w-4 ${doc.is_favorite ? 'fill-gold-600 text-gold-600' : ''}`} />
          </button>
        </button>
      ))}
    </div>
  );
}