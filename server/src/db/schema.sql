PRAGMA foreign_keys = ON;
 
-- ── Users & Roles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  department    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
 
-- ── Folders (hierarchical organization) ───────────────────────
CREATE TABLE IF NOT EXISTS folders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  parent_id  INTEGER REFERENCES folders(id) ON DELETE CASCADE,
  owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
 
-- ── Documents ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename  TEXT NOT NULL UNIQUE,
  filepath         TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  size_bytes       INTEGER NOT NULL,
  owner_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id        INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  category         TEXT,
  status           TEXT NOT NULL DEFAULT 'processing'
                     CHECK (status IN ('processing', 'ready', 'failed')),
  is_favorite      INTEGER NOT NULL DEFAULT 0,
  summary          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
 
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
 
-- ── Tags (many-to-many with documents) ────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
 
CREATE TABLE IF NOT EXISTS document_tags (
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);
 
-- ── Sharing & Permissions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_shares (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission  TEXT NOT NULL CHECK (permission IN ('view', 'comment', 'edit', 'download', 'admin')),
  shared_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (document_id, user_id)
);
 
-- ── Analytics ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_analytics (
  document_id     INTEGER PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  view_count      INTEGER NOT NULL DEFAULT 0,
  download_count  INTEGER NOT NULL DEFAULT 0,
  ai_question_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at  TEXT
);
 
CREATE TABLE IF NOT EXISTS search_queries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  query      TEXT NOT NULL,
  query_type TEXT NOT NULL CHECK (query_type IN ('keyword', 'semantic', 'question')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
 
-- ── Audit log (who did what, for security review) ─────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  metadata    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
 