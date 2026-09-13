// server/src/models/Tag.js
const db = require('../db/connection');

const Tag = {
  findByName(name) {
    return db.prepare('SELECT * FROM tags WHERE name = ?').get(name);
  },

  findById(id) {
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  },

  // Idempotent create - used constantly during document tagging, where the
  // same tag name ("Finance", "HR", ...) gets reused across many documents.
  findOrCreate(name) {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return null;
    const existing = Tag.findByName(normalized);
    if (existing) return existing;
    const info = db.prepare('INSERT INTO tags (name) VALUES (?)').run(normalized);
    return Tag.findById(info.lastInsertRowid);
  },

  list() {
    return db
      .prepare(
        `SELECT t.*, COUNT(dt.document_id) AS document_count
         FROM tags t
         LEFT JOIN document_tags dt ON dt.tag_id = t.id
         GROUP BY t.id
         ORDER BY t.name`
      )
      .all();
  },

  delete(id) {
    const info = db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return info.changes > 0;
  },
};

module.exports = Tag;