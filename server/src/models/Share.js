const db = require("../db/connection");

function listForDocument(documentId) {
  return db
    .prepare(
      `
      SELECT
        ds.id,
        ds.document_id,
        ds.user_id,
        ds.permission,
        ds.created_at,
        u.name,
        u.email,
        u.role,
        u.department
      FROM document_shares ds
      JOIN users u ON u.id = ds.user_id
      WHERE ds.document_id = ?
      ORDER BY ds.created_at DESC
      `
    )
    .all(documentId);
}

function findByDocumentAndUser(documentId, userId) {
  return db
    .prepare(
      `
      SELECT *
      FROM document_shares
      WHERE document_id = ? AND user_id = ?
      `
    )
    .get(documentId, userId);
}

function create({ documentId, userId, permission }) {
  const result = db
    .prepare(
      `
      INSERT INTO document_shares
        (document_id, user_id, permission)
      VALUES (?, ?, ?)
      `
    )
    .run(documentId, userId, permission);

  return db
    .prepare("SELECT * FROM document_shares WHERE id = ?")
    .get(result.lastInsertRowid);
}

function updatePermission(id, permission) {
  db.prepare(
    `
    UPDATE document_shares
    SET permission = ?
    WHERE id = ?
    `
  ).run(permission, id);

  return db
    .prepare("SELECT * FROM document_shares WHERE id = ?")
    .get(id);
}

function remove(id) {
  return db
    .prepare("DELETE FROM document_shares WHERE id = ?")
    .run(id);
}

module.exports = {
  listForDocument,
  findByDocumentAndUser,
  create,
  updatePermission,
  remove,
};
