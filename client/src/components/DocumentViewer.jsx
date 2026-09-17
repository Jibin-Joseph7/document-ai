import React from 'react';
// client/src/components/DocumentViewer.jsx
import { useState } from 'react';
import { Download, X, Plus, Sparkles } from 'lucide-react';
import { TagBadge } from './TagBadge';
import { Documents } from '../lib/documents';
import { getToken } from '../lib/api';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Downloads require the Authorization header, which a plain <a href> can't
// send - so this fetches the file as a blob and triggers a save via a
// throwaway object URL instead of just linking straight to the endpoint.
async function downloadDocument(doc) {
  const res = await fetch(Documents.downloadUrl(doc.id), {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = doc.original_filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DocumentViewer({ document: doc, onClose, onChanged, extraTabs }) {
  const [newTag, setNewTag] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  async function suggestTags() {
    setSuggesting(true);
    try {
      const result = await Documents.suggestTags(doc.id, true); // apply immediately
      onChanged(result.document);
    } finally {
      setSuggesting(false);
    }
  }

  async function addTag(e) {
    e.preventDefault();
    if (!newTag.trim()) return;
    const names = [...doc.tags.map((t) => t.name), newTag.trim()];
    const updated = await Documents.setTags(doc.id, names);
    onChanged(updated.document);
    setNewTag('');
  }

  async function removeTag(tagName) {
    const names = doc.tags.filter((t) => t.name !== tagName).map((t) => t.name);
    const updated = await Documents.setTags(doc.id, names);
    onChanged(updated.document);
  }

  async function handleDownload() {
    setDownloadError('');
    setDownloading(true);
    try {
      await downloadDocument(doc);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-surface"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-serif text-lg text-ink">{doc.title}</h2>
            <p className="mt-0.5 text-xs text-ink-faint">
              {formatSize(doc.size_bytes)} Â· Uploaded {new Date(doc.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-ink-faint hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Downloadingâ€¦' : 'Download original file'}
          </button>
          {downloadError && <p className="text-sm text-error-600">{downloadError}</p>}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                Tags
              </h3>
              <button
                onClick={suggestTags}
                disabled={suggesting}
                className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" />
                {suggesting ? 'Suggestingâ€¦' : 'Suggest with AI'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {doc.tags?.map((t) => (
                <TagBadge key={t.id} name={t.name} onRemove={() => removeTag(t.name)} />
              ))}
              <form onSubmit={addTag} className="flex items-center">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag"
                  className="w-20 border-b border-border-strong bg-transparent px-1 py-0.5 text-xs text-ink outline-none focus:border-teal-600"
                />
                <button type="submit" aria-label="Add tag" className="text-ink-faint hover:text-teal-700">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>

          {doc.category && (
            <div>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
                Category
              </h3>
              <p className="text-sm text-ink">{doc.category}</p>
            </div>
          )}

          {/* Summarization (commit 26) and sharing (commit 27) panels
              render here via extraTabs, kept as a slot so this component
              doesn't need to change shape as those land. */}
          {extraTabs}
        </div>
      </div>
    </div>
  );
}