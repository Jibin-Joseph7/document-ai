// client/src/components/FolderSidebar.jsx
import { useEffect, useState } from 'react';
import { Folder, FolderPlus, Home, Star } from 'lucide-react';
import { Folders } from '../lib/documents';

export function FolderSidebar({ selectedFolderId, onSelect, favoritesOnly, onToggleFavorites }) {
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Folders.list().then((data) => setFolders(data.folders));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const { folder } = await Folders.create(newFolderName.trim());
    setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
    setNewFolderName('');
    setCreating(false);
  }

  const itemClass = (active) =>
    `flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm transition-colors ${
      active ? 'bg-teal-50 text-teal-700 font-medium' : 'text-ink-soft hover:bg-teal-50/50'
    }`;

  return (
    <nav className="w-56 shrink-0 space-y-1">
      <button
        onClick={() => {
          onSelect(null);
          onToggleFavorites(false);
        }}
        className={itemClass(!selectedFolderId && !favoritesOnly)}
      >
        <Home className="h-4 w-4" />
        All documents
      </button>
      <button
        onClick={() => onToggleFavorites(!favoritesOnly)}
        className={itemClass(favoritesOnly)}
      >
        <Star className="h-4 w-4" />
        Favorites
      </button>

      <div className="pt-3">
        <div className="flex items-center justify-between px-2.5 pb-1">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            Folders
          </span>
          <button
            onClick={() => setCreating((v) => !v)}
            aria-label="New folder"
            className="text-ink-faint hover:text-teal-700"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>

        {creating && (
          <form onSubmit={handleCreate} className="mb-1 px-2.5">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={() => !newFolderName && setCreating(false)}
              placeholder="Folder name"
              className="w-full rounded-sm border border-border-strong px-2 py-1 text-sm outline-none focus:border-teal-600"
            />
          </form>
        )}

        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => {
              onSelect(folder.id);
              onToggleFavorites(false);
            }}
            className={itemClass(selectedFolderId === folder.id)}
          >
            <Folder className="h-4 w-4 shrink-0" />
            <span className="truncate">{folder.name}</span>
          </button>
        ))}
        {folders.length === 0 && !creating && (
          <p className="px-2.5 text-xs text-ink-faint">No folders yet</p>
        )}
      </div>
    </nav>
  );
}