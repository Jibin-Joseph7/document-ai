// server/src/models/Share.js
const db = require('../db/connection');

const Share = {
  // Upsert: sharing the same document with the same user again just
  // updates the permission level instead of erroring on the UNIQUE
  // (document_id, user_id) constraint.
  upsert({ documentId, userId, permission, sharedBy }) {
    const existing = db
      .prepare('SELECT * FROM document_shares WHERE document_id = ? AND user_id = ?')
      .get(documentId, userId);

    if (existing) {
      db.prepare('UPDATE document_shares SET permission = ?, shared_by = ? WHERE id = ?').run(
        permission,
        sharedBy,
        existing.id
      );
      return Share.findById(existing.id);
    }

    const info = db
      .prepare(
        `INSERT INTO document_shares (document_id, user_id, permission, shared_by)
         VALUES (?, ?, ?, ?)`
      )
      .run(documentId, userId, permission, sharedBy);
    return Share.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db.prepare('SELECT * FROM document_shares WHERE id = ?').get(id);
  },

  findForDocumentAndUser(documentId, userId) {
    return db
      .prepare('SELECT * FROM document_shares WHERE document_id = ? AND user_id = ?')
      .get(documentId, userId);
  },

  // Everyone a document has been shared with, joined with basic user info
  // for display in a "Shared with" UI.
  listForDocument(documentId) {
    return db
      .prepare(
        `SELECT ds.id, ds.permission, ds.created_at, ds.shared_by,
                u.id AS user_id, u.name, u.email
         FROM document_shares ds
         JOIN users u ON u.id = ds.user_id
         WHERE ds.document_id = ?
         ORDER BY ds.created_at DESC`
      )
      .all(documentId);
  },

  // Documents shared *with* a given user — the "Shared with me" view.
  listForUser(userId) {
    return db
      .prepare(
        `SELECT d.*, ds.permission AS share_permission
         FROM documents d
         JOIN document_shares ds ON ds.document_id = d.id
         WHERE ds.user_id = ?
         ORDER BY ds.created_at DESC`
      )
      .all(userId);
  },

  delete(documentId, userId) {
    const info = db
      .prepare('DELETE FROM document_shares WHERE document_id = ? AND user_id = ?')
      .run(documentId, userId);
    return info.changes > 0;
  },
};

module.exports = Share;