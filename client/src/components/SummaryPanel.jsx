// client/src/components/SummaryPanel.jsx
import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Documents } from '../lib/documents';

export function SummaryPanel({ document: doc, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [keyPoints, setKeyPoints] = useState(null);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const result = await Documents.summarize(doc.id, 5);
      setKeyPoints(result.keyPoints);
      onChanged(result.document); // persisted summary now lives on the document
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">Summary</h3>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {doc.summary ? 'Regenerate' : 'Summarize with AI'}
        </button>
      </div>

      {error && <p className="text-sm text-error-600">{error}</p>}

      {doc.summary ? (
        <div className="rounded-sm border border-gold-100 bg-gold-100/20 px-3 py-2.5">
          <p className="text-sm leading-relaxed text-ink">{doc.summary}</p>
          {keyPoints?.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {keyPoints.map((point, i) => (
                <li key={i} className="text-xs text-ink-soft">
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        !loading && <p className="text-sm text-ink-faint">No summary yet.</p>
      )}
    </div>
  );
}