// client/src/components/SearchBar.jsx
import { useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { Documents } from '../lib/documents';

// Two distinct search modes, both backed by real endpoints:
//   'keyword'  -> GET /documents?search=... (title/filename LIKE match)
//   'semantic' -> POST /documents/search (AI service vector search,
//                 scoped server-side to exactly the documents this user
//                 can see)
export function SearchBar({ onKeywordResults, onSemanticResults, onCleared }) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('keyword');
  const [loading, setLoading] = useState(false);

  async function runSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      if (mode === 'semantic') {
        const data = await Documents.search(query.trim());
        onSemanticResults(data.results, query.trim());
      } else {
        const data = await Documents.list({ search: query.trim() });
        onKeywordResults(data.documents, query.trim());
      }
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setQuery('');
    onCleared();
  }

  return (
    <form onSubmit={runSearch} className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mode === 'semantic'
              ? 'Ask in natural language, e.g. "what is our leave policy?"'
              : 'Search by title or filename…'
          }
          className="w-full rounded-sm border border-border-strong bg-surface py-2 pl-9 pr-8 text-sm text-ink outline-none focus:border-teal-600"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex rounded-sm border border-border-strong">
        <button
          type="button"
          onClick={() => setMode('keyword')}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            mode === 'keyword' ? 'bg-teal-600 text-white' : 'bg-surface text-ink-soft'
          }`}
        >
          Keyword
        </button>
        <button
          type="button"
          onClick={() => setMode('semantic')}
          className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
            mode === 'semantic' ? 'bg-teal-600 text-white' : 'bg-surface text-ink-soft'
          }`}
        >
          <Sparkles className="h-3 w-3" />
          AI Search
        </button>
      </div>

      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="rounded-sm bg-ink px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  );
}