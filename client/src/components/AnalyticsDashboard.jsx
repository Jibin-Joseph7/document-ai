// client/src/components/AnalyticsDashboard.jsx
import { useEffect, useState } from 'react';
import { BarChart3, Eye, MessageCircleQuestion, HardDrive, FileText } from 'lucide-react';
import { Analytics } from '../lib/documents';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-sm border border-border bg-surface px-4 py-3">
      <div className="mb-1 flex items-center gap-1.5 text-ink-faint">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-serif text-2xl text-ink">{value}</p>
    </div>
  );
}

// A simple horizontal bar built from plain divs - no charting library
// needed for a handful of category counts, and it inherits the design
// tokens directly instead of fighting a chart library's own theme.
function BarRow({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex justify-between text-xs text-ink-soft">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border">
        <div className="h-1.5 rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const [overview, setOverview] = useState(null);
  const [mostViewed, setMostViewed] = useState([]);
  const [searchQueries, setSearchQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([Analytics.overview(), Analytics.mostViewed(5), Analytics.searchQueries(5)])
      .then(([ov, mv, sq]) => {
        setOverview(ov);
        setMostViewed(mv.documents);
        setSearchQueries(sq.queries);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-ink-faint">Loading analytics…</p>;
  if (!overview) return null;

  const maxCategoryCount = Math.max(...overview.popularCategories.map((c) => c.count), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={FileText} label="Documents" value={overview.totalDocuments} />
        <StatCard icon={HardDrive} label="Storage" value={formatBytes(overview.totalStorageBytes)} />
        <StatCard icon={Eye} label="Views" value={overview.totalViews} />
        <StatCard
          icon={MessageCircleQuestion}
          label="AI questions"
          value={overview.totalAiQuestionsAsked}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-sm border border-border bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
            <BarChart3 className="h-3.5 w-3.5" />
            Popular categories
          </h3>
          {overview.popularCategories.length === 0 ? (
            <p className="text-sm text-ink-faint">No categorized documents yet.</p>
          ) : (
            overview.popularCategories.map((c) => (
              <BarRow key={c.category} label={c.category} count={c.count} max={maxCategoryCount} />
            ))
          )}
        </div>

        <div className="rounded-sm border border-border bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
            <Eye className="h-3.5 w-3.5" />
            Most viewed
          </h3>
          {mostViewed.length === 0 ? (
            <p className="text-sm text-ink-faint">No views yet.</p>
          ) : (
            <ul className="space-y-2">
              {mostViewed.map(({ document, viewCount }) => (
                <li key={document.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-ink">{document.title}</span>
                  <span className="ml-2 shrink-0 text-ink-faint">{viewCount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-sm border border-border bg-surface p-4">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
          Most searched
        </h3>
        {searchQueries.length === 0 ? (
          <p className="text-sm text-ink-faint">No searches yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {searchQueries.map((q, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink">
                  “{q.query}”{' '}
                  <span className="text-xs text-ink-faint">({q.query_type})</span>
                </span>
                <span className="text-ink-faint">{q.count}×</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}