// server/src/models/Document.js
const db = require('../db/connection');
const Tag = require('./Tag');

function attachTags(document) {
  if (!document) return document;
  const tags = db
    .prepare(
      `SELECT t.id, t.name FROM tags t
       JOIN document_tags dt ON dt.tag_id = t.id
       WHERE dt.document_id = ?
       ORDER BY t.name`
    )
    .all(document.id);
  return { ...document, tags };
}

const Document = {
  create({
    title,
    originalFilename,
    storedFilename,
    filepath,
    mimeType,
    sizeBytes,
    ownerId,
    folderId = null,
    category = null,
  }) {
    const info = db
      .prepare(
        `INSERT INTO documents
           (title, original_filename, stored_filename, filepath, mime_type,
            size_bytes, owner_id, folder_id, category, status)
         VALUES
           (@title, @originalFilename, @storedFilename, @filepath, @mimeType,
            @sizeBytes, @ownerId, @folderId, @category, 'processing')`
      )
      .run({
        title,
        originalFilename,
        storedFilename,
        filepath,
        mimeType,
        sizeBytes,
        ownerId,
        folderId,
        category,
      });

    db.prepare('INSERT INTO document_analytics (document_id) VALUES (?)').run(
      info.lastInsertRowid
    );

    return Document.findById(info.lastInsertRowid);
  },

  findById(id) {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    return attachTags(doc);
  },

  // Role-aware listing, matching the access model from the spec:
  //   admin   -> every document
  //   manager -> documents owned by anyone in their department, plus their own
  //   user    -> only documents they own (explicit shares are added in commit 7)
  listForUser(user, { folderId, category, tagId, favoriteOnly, search } = {}) {
    const clauses = [];
    const params = {};

    if (user.role === 'admin') {
      // no ownership restriction
    } else if (user.role === 'manager') {
      clauses.push(`(d.owner_id = @userId OR d.owner_id IN (
        SELECT id FROM users WHERE department = @department
      ))`);
      params.userId = user.id;
      params.department = user.department;
    } else {
      clauses.push('d.owner_id = @userId');
      params.userId = user.id;
    }

    if (folderId !== undefined) {
      if (folderId === null) {
        clauses.push('d.folder_id IS NULL');
      } else {
        clauses.push('d.folder_id = @folderId');
        params.folderId = folderId;
      }
    }
    if (category) {
      clauses.push('d.category = @category');
      params.category = category;
    }
    if (favoriteOnly) {
      clauses.push('d.is_favorite = 1');
    }
    if (search) {
      clauses.push('(d.title LIKE @search OR d.original_filename LIKE @search)');
      params.search = `%${search}%`;
    }

    let joinTag = '';
    if (tagId) {
      joinTag = 'JOIN document_tags dtf ON dtf.document_id = d.id AND dtf.tag_id = @tagId';
      params.tagId = tagId;
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db
      .prepare(
        `SELECT d.* FROM documents d
         ${joinTag}
         ${where}
         ORDER BY d.created_at DESC`
      )
      .all(params);

    return rows.map(attachTags);
  },

  // Can this user read this specific document? (Ownership + role model;
  // explicit per-document shares are layered on in commit 7.)
  canAccess(user, document) {
    if (!document) return false;
    if (user.role === 'admin') return true;
    if (document.owner_id === user.id) return true;
    if (user.role === 'manager') {
      const owner = db.prepare('SELECT department FROM users WHERE id = ?').get(
        document.owner_id
      );
      return !!owner && owner.department === user.department;
    }
    return false;
  },

  updateMeta(id, { title, category, folderId, isFavorite }) {
    const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!existing) return null;
    db.prepare(
      `UPDATE documents
       SET title = ?, category = ?, folder_id = ?, is_favorite = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      title ?? existing.title,
      category === undefined ? existing.category : category,
      folderId === undefined ? existing.folder_id : folderId,
      isFavorite === undefined ? existing.is_favorite : (isFavorite ? 1 : 0),
      id
    );
    return Document.findById(id);
  },

  updateStatus(id, status) {
    db.prepare(`UPDATE documents SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
      status,
      id
    );
    return Document.findById(id);
  },

  updateSummary(id, summary) {
    db.prepare(`UPDATE documents SET summary = ?, updated_at = datetime('now') WHERE id = ?`).run(
      summary,
      id
    );
    return Document.findById(id);
  },

  delete(id) {
    const info = db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return info.changes > 0;
  },

  // ── Tags ──────────────────────────────────────────────────────
  setTags(documentId, tagNames = []) {
    const tx = db.transaction((names) => {
      db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(documentId);
      const insert = db.prepare(
        'INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)'
      );
      for (const name of names) {
        const tag = Tag.findOrCreate(name);
        if (tag) insert.run(documentId, tag.id);
      }
    });
    tx(tagNames);
    return Document.findById(documentId);
  },

  addTag(documentId, tagName) {
    const tag = Tag.findOrCreate(tagName);
    if (!tag) return Document.findById(documentId);
    db.prepare(
      'INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)'
    ).run(documentId, tag.id);
    return Document.findById(documentId);
  },

  removeTag(documentId, tagId) {
    db.prepare('DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?').run(
      documentId,
      tagId
    );
    return Document.findById(documentId);
  },
};

module.exports = Document;