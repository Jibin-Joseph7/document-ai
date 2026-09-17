import React from 'react';
// client/src/components/SemanticResults.jsx
import { Sparkles, FileText } from 'lucide-react';

export function SemanticResults({ results, query }) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border py-16 text-center">
        <Sparkles className="mb-2 h-6 w-6 text-ink-faint" />
        <p className="text-sm text-ink-faint">
          No relevant content found for â€œ{query}â€.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((hit) => (
        <div
          key={`${hit.document_id}-${hit.chunk_index}`}
          className="rounded-sm border border-gold-100 bg-surface px-4 py-3"
        >
          <div className="mb-1.5 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-ink-faint" />
            <span className="text-sm font-medium text-ink">
              {hit.document?.title || `Document #${hit.document_id}`}
            </span>
            <span className="ml-auto flex items-center gap-1 rounded-sm bg-gold-100 px-1.5 py-0.5 text-xs text-gold-700">
              <Sparkles className="h-3 w-3" />
              {Math.round(Math.max(hit.score, 0) * 100)}% match
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{hit.text}</p>
        </div>
      ))}
    </div>
  );
}