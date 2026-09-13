// server/src/models/Folder.js
const db = require('../db/connection');

const Folder = {
  create({ name, parentId = null, ownerId, department = null }) {
    const info = db
      .prepare(
        `INSERT INTO folders (name, parent_id, owner_id, department)
         VALUES (@name, @parentId, @ownerId, @department)`
      )
      .run({ name, parentId, ownerId, department });
    return Folder.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  },

  // Direct children of a folder (or top-level folders when parentId is null)
  // scoped to a given owner — used to render one level of a folder tree.
  listChildren(ownerId, parentId = null) {
    if (parentId === null) {
      return db
        .prepare(
          'SELECT * FROM folders WHERE owner_id = ? AND parent_id IS NULL ORDER BY name'
        )
        .all(ownerId);
    }
    return db
      .prepare('SELECT * FROM folders WHERE owner_id = ? AND parent_id = ? ORDER BY name')
      .all(ownerId, parentId);
  },

  listAllForOwner(ownerId) {
    return db.prepare('SELECT * FROM folders WHERE owner_id = ? ORDER BY name').all(ownerId);
  },

  listAll() {
    return db.prepare('SELECT * FROM folders ORDER BY owner_id, name').all();
  },

  update(id, { name, parentId }) {
    const existing = Folder.findById(id);
    if (!existing) return null;
    db.prepare('UPDATE folders SET name = ?, parent_id = ? WHERE id = ?').run(
      name ?? existing.name,
      parentId === undefined ? existing.parent_id : parentId,
      id
    );
    return Folder.findById(id);
  },

  delete(id) {
    // ON DELETE CASCADE handles subfolders; documents in this folder get
    // folder_id = NULL (ON DELETE SET NULL in the schema) rather than
    // being deleted, so nothing is silently destroyed.
    const info = db.prepare('DELETE FROM folders WHERE id = ?').run(id);
    return info.changes > 0;
  },

  // Prevents a folder from being reparented into its own descendant,
  // which would create a cycle the UI could never render or delete.
  isDescendantOf(candidateId, ancestorId) {
    let current = Folder.findById(candidateId);
    while (current && current.parent_id) {
      if (current.parent_id === ancestorId) return true;
      current = Folder.findById(current.parent_id);
    }
    return false;
  },
};

module.exports = Folder;