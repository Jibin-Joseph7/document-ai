import React from 'react';
// client/src/pages/DashboardPage.jsx
import { useCallback, useEffect, useState } from 'react';
import { Sparkles, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DocumentUpload } from '../components/DocumentUpload';
import { FolderSidebar } from '../components/FolderSidebar';
import { DocumentList } from '../components/DocumentList';
import { SearchBar } from '../components/SearchBar';
import { SemanticResults } from '../components/SemanticResults';
import { DocumentViewer } from '../components/DocumentViewer';
import { ChatAssistant } from '../components/ChatAssistant';
import { SummaryPanel } from '../components/SummaryPanel';
import { SharingPanel } from '../components/SharingPanel';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { Documents } from '../lib/documents';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [folderId, setFolderId] = useState(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  // Search results are a distinct view layered over the normal folder
  // list â€” searching doesn't change which folder is "selected".
  const [searchView, setSearchView] = useState(null); // { mode, query, results } | null
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [view, setView] = useState('documents'); // 'documents' | 'analytics'

  const refresh = useCallback(() => {
    setLoading(true);
    Documents.list({
      folderId: folderId ?? undefined,
      favoriteOnly: favoritesOnly ? 'true' : undefined,
    })
      .then((data) => setDocuments(data.documents))
      .finally(() => setLoading(false));
  }, [folderId, favoritesOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleDocumentChanged(updated) {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setSelectedDoc((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="font-serif text-xl font-semibold text-ink">Document AI</h1>
          <nav className="flex items-center gap-1 rounded-sm border border-border-strong p-0.5">
            <button
              onClick={() => setView('documents')}
              className={`rounded-sm px-3 py-1 text-sm transition-colors ${
                view === 'documents' ? 'bg-teal-600 text-white' : 'text-ink-soft'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`flex items-center gap-1 rounded-sm px-3 py-1 text-sm transition-colors ${
                view === 'analytics' ? 'bg-teal-600 text-white' : 'text-ink-soft'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-soft">
              {user?.name} <span className="text-ink-faint">Â· {user?.role}</span>
            </span>
            <button
              onClick={logout}
              className="rounded-sm border border-border-strong px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-teal-50 hover:text-teal-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {view === 'analytics' ? (
        <main className="mx-auto max-w-6xl px-6 py-8">
          <AnalyticsDashboard />
        </main>
      ) : (
      <main className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
        <FolderSidebar
          selectedFolderId={folderId}
          onSelect={setFolderId}
          favoritesOnly={favoritesOnly}
          onToggleFavorites={setFavoritesOnly}
        />

        <div className="flex-1 space-y-6">
          <SearchBar
            onKeywordResults={(docs, query) => setSearchView({ mode: 'keyword', query, docs })}
            onSemanticResults={(results, query) =>
              setSearchView({ mode: 'semantic', query, results })
            }
            onCleared={() => setSearchView(null)}
          />

          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-ink">
              {searchView
                ? `Results for â€œ${searchView.query}â€`
                : favoritesOnly
                  ? 'Favorites'
                  : 'All documents'}
            </h2>
            <button
              onClick={() => setShowUpload((v) => !v)}
              className="rounded-sm bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              {showUpload ? 'Close' : 'Upload'}
            </button>
          </div>

          {showUpload && <DocumentUpload folderId={folderId} onUploaded={() => refresh()} />}

          {searchView?.mode === 'semantic' ? (
            <SemanticResults results={searchView.results} query={searchView.query} />
          ) : loading ? (
            <p className="text-sm text-ink-faint">Loadingâ€¦</p>
          ) : (
            <DocumentList
              documents={searchView?.mode === 'keyword' ? searchView.docs : documents}
              onSelect={setSelectedDoc}
              onChanged={handleDocumentChanged}
              emptyLabel={
                searchView
                  ? 'No documents matched your search.'
                  : favoritesOnly
                    ? "You haven't favorited any documents yet."
                    : 'Upload your first document to get started.'
              }
            />
          )}
        </div>
      </main>
      )}

      {selectedDoc && (
        <DocumentViewer
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onChanged={handleDocumentChanged}
          extraTabs={
            <div className="space-y-6">
              <SummaryPanel document={selectedDoc} onChanged={handleDocumentChanged} />
              <SharingPanel document={selectedDoc} />
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Ask about this document
                </h3>
                <div className="h-72 rounded-sm border border-border">
                  <ChatAssistant scopeDocId={selectedDoc.id} scopeLabel={selectedDoc.title} />
                </div>
              </div>
            </div>
          }
        />
      )}

      <button
        onClick={() => setChatOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
      >
        <Sparkles className="h-4 w-4 text-gold-600" />
        Ask AI
      </button>

      {chatOpen && (
        <div className="fixed bottom-24 right-6 z-30 h-[28rem] w-96 overflow-hidden rounded-sm border border-border bg-surface shadow-xl">
          <ChatAssistant />
        </div>
      )}
    </div>
  );
}