import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-paper">

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <h1 className="font-serif text-xl font-semibold text-ink">
            Document AI
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-soft">
              {user?.name}
              <span className="text-ink-faint">
                {" "}· {user?.role}
              </span>
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

      <main className="mx-auto max-w-6xl px-6 py-10">

        <div className="rounded-sm border border-border bg-surface p-8 shadow-sm">

          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-teal-600">
            Knowledge workspace
          </p>

          <h2 className="font-serif text-3xl font-semibold text-ink">
            Welcome, {user?.name}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
            Your document workspace is ready. Upload documents,
            search your knowledge base, and use AI to ask questions
            about your files.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">

            <div className="rounded-sm border border-border p-5">
              <p className="text-sm font-medium text-ink">
                Documents
              </p>
              <p className="mt-1 text-sm text-ink-faint">
                Manage your knowledge base
              </p>
            </div>

            <div className="rounded-sm border border-border p-5">
              <p className="text-sm font-medium text-ink">
                AI Search
              </p>
              <p className="mt-1 text-sm text-ink-faint">
                Find information semantically
              </p>
            </div>

            <div className="rounded-sm border border-border p-5">
              <p className="text-sm font-medium text-ink">
                Ask AI
              </p>
              <p className="mt-1 text-sm text-ink-faint">
                Ask questions about documents
              </p>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
