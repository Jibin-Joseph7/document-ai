// client/src/components/SharingPanel.jsx
import { useEffect, useState } from 'react';
import { Users2, Trash2 } from 'lucide-react';
import { Documents, Users } from '../lib/documents';

const PERMISSIONS = ['view', 'comment', 'download', 'edit', 'admin'];

export function SharingPanel({ document: doc }) {
  const [shares, setShares] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permission, setPermission] = useState('view');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Sharing management (list/add/revoke) is admin-level only server-side
    // (commit 7's canManageSharing) - a 403 here just means the current
    // user can view but not manage sharing, which is a normal, expected
    // state, not an error to alarm the user about.
    Promise.all([
      Documents.listShares(doc.id).catch(() => ({ shares: [] })),
      Users.list().catch(() => ({ users: [] })),
    ])
      .then(([shareData, userData]) => {
        setShares(shareData.shares);
        setCandidates(userData.users);
      })
      .finally(() => setLoading(false));
  }, [doc.id]);

  async function addShare(e) {
    e.preventDefault();
    if (!selectedUserId) return;
    setError('');
    try {
      await Documents.addShare(doc.id, Number(selectedUserId), permission);
      const { shares: updated } = await Documents.listShares(doc.id);
      setShares(updated);
      setSelectedUserId('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function changePermission(userId, newPermission) {
    await Documents.updateShare(doc.id, userId, newPermission);
    setShares((prev) =>
      prev.map((s) => (s.user_id === userId ? { ...s, permission: newPermission } : s))
    );
  }

  async function revoke(userId) {
    await Documents.revokeShare(doc.id, userId);
    setShares((prev) => prev.filter((s) => s.user_id !== userId));
  }

  if (loading) return <p className="text-sm text-ink-faint">Loading sharing settings…</p>;

  const alreadySharedIds = new Set(shares.map((s) => s.user_id));
  const availableUsers = candidates.filter(
    (u) => u.id !== doc.owner_id && !alreadySharedIds.has(u.id)
  );

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
        <Users2 className="h-3.5 w-3.5" />
        Shared with
      </h3>

      {shares.length === 0 ? (
        <p className="mb-3 text-sm text-ink-faint">Not shared with anyone yet.</p>
      ) : (
        <div className="mb-3 space-y-2">
          {shares.map((s) => (
            <div key={s.user_id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{s.name}</p>
                <p className="truncate text-xs text-ink-faint">{s.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <select
                  value={s.permission}
                  onChange={(e) => changePermission(s.user_id, e.target.value)}
                  className="rounded-sm border border-border-strong bg-surface px-1.5 py-1 text-xs text-ink outline-none focus:border-teal-600"
                >
                  {PERMISSIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => revoke(s.user_id)}
                  aria-label={`Remove ${s.name}'s access`}
                  className="text-ink-faint hover:text-error-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mb-2 text-sm text-error-600">{error}</p>}

      <form onSubmit={addShare} className="flex items-center gap-1.5">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="min-w-0 flex-1 rounded-sm border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-teal-600"
        >
          <option value="">Add person…</option>
          {availableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <select
          value={permission}
          onChange={(e) => setPermission(e.target.value)}
          className="rounded-sm border border-border-strong bg-surface px-1.5 py-1.5 text-xs text-ink outline-none focus:border-teal-600"
        >
          {PERMISSIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!selectedUserId}
          className="rounded-sm bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          Share
        </button>
      </form>
    </div>
  );
}