// server/src/controllers/documentController.js
const fs = require('fs');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const Share = require('../models/Share');
const db = require('../db/connection');
const { canView, canDownload, canEdit, canManageSharing } = require('../utils/permissions');

// POST /api/documents  (multipart/form-data: file, folderId?, category?, title?)
// Expects `upload.single('file')` to have run first, populating req.file.
function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded (expected field name "file")' });
  }

  const { folderId, category, title } = req.body || {};

  if (folderId) {
    const folder = Folder.findById(folderId);
    if (!folder) {
      fs.unlinkSync(req.file.path); // don't leave an orphaned file on disk
      return res.status(400).json({ error: 'folderId does not exist' });
    }
    if (folder.owner_id !== req.user.id && req.user.role !== 'admin') {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Cannot upload into a folder you do not own' });
    }
  }

  const document = Document.create({
    title: (title && title.trim()) || req.file.originalname,
    originalFilename: req.file.originalname,
    storedFilename: req.file.filename,
    filepath: req.file.path,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    ownerId: req.user.id,
    folderId: folderId ? Number(folderId) : null,
    category: category || null,
  });

  db.prepare(
    `INSERT INTO audit_logs (user_id, action, document_id, metadata)
     VALUES (?, 'document.upload', ?, ?)`
  ).run(req.user.id, document.id, JSON.stringify({ filename: req.file.originalname }));

  // Ingestion (text extraction -> chunk -> embed -> vector store) happens
  // asynchronously via the AI service starting in commit 14; for now the
  // document is created with status='processing' and stays there until
  // that pipeline is wired up and flips it to 'ready'.
  return res.status(201).json({ document });
}

// GET /api/documents?folderId=&category=&tagId=&favoriteOnly=&search=&scope=shared
function listDocuments(req, res) {
  const { folderId, category, tagId, favoriteOnly, search, scope } = req.query;

  if (scope === 'shared') {
    // "Shared with me" — documents someone else owns but has explicitly
    // shared with this user, regardless of the owner-based visibility
    // rules in Document.listForUser.
    return res.json({ documents: Share.listForUser(req.user.id) });
  }

  const documents = Document.listForUser(req.user, {
    folderId: folderId === undefined ? undefined : folderId === 'root' ? null : Number(folderId),
    category,
    tagId: tagId ? Number(tagId) : undefined,
    favoriteOnly: favoriteOnly === 'true',
    search,
  });

  if (search && search.trim()) {
    db.prepare(
      `INSERT INTO search_queries (user_id, query, query_type) VALUES (?, ?, 'keyword')`
    ).run(req.user.id, search.trim());
  }

  return res.json({ documents });
}

function getDocument(req, res) {
  const document = Document.findById(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (!canView(req.user, document)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.prepare(
    `UPDATE document_analytics
     SET view_count = view_count + 1, last_viewed_at = datetime('now')
     WHERE document_id = ?`
  ).run(document.id);

  return res.json({ document });
}

function updateDocument(req, res) {
  const document = Document.findById(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (!canEdit(req.user, document)) {
    return res.status(403).json({ error: 'Forbidden — requires edit permission or higher' });
  }

  const { title, category, folderId, isFavorite } = req.body || {};

  if (folderId) {
    const folder = Folder.findById(folderId);
    if (!folder) return res.status(400).json({ error: 'folderId does not exist' });
    if (folder.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot move into a folder you do not own' });
    }
  }

  const updated = Document.updateMeta(document.id, {
    title,
    category,
    folderId: folderId === undefined ? undefined : folderId === null ? null : Number(folderId),
    isFavorite,
  });
  return res.json({ document: updated });
}

function deleteDocument(req, res) {
  const document = Document.findById(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (!canManageSharing(req.user, document)) {
    return res.status(403).json({ error: 'Forbidden — only the owner or an admin can delete this' });
  }

  // Log the audit entry BEFORE deleting — document_id has a foreign key
  // into documents(id), so writing this after the delete would try to
  // reference a row that no longer exists and fail the FK constraint.
  db.prepare(
    `INSERT INTO audit_logs (user_id, action, document_id, metadata) VALUES (?, 'document.delete', ?, ?)`
  ).run(req.user.id, document.id, JSON.stringify({ title: document.title }));

  Document.delete(document.id);

  // Best-effort file cleanup — a missing file on disk shouldn't block the
  // DB delete from succeeding (the DB row is the source of truth).
  fs.unlink(document.filepath, () => {});

  return res.status(204).send();
}

function downloadDocument(req, res) {
  const document = Document.findById(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (!canDownload(req.user, document)) {
    return res.status(403).json({ error: 'Forbidden — requires download permission or higher' });
  }
  if (!fs.existsSync(document.filepath)) {
    return res.status(410).json({ error: 'File is no longer available on disk' });
  }

  db.prepare(
    `UPDATE document_analytics SET download_count = download_count + 1 WHERE document_id = ?`
  ).run(document.id);

  return res.download(document.filepath, document.original_filename);
}

function setDocumentTags(req, res) {
  const document = Document.findById(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (!canEdit(req.user, document)) {
    return res.status(403).json({ error: 'Forbidden — requires edit permission or higher' });
  }

  const { tags } = req.body || {};
  if (!Array.isArray(tags)) {
    return res.status(400).json({ error: 'tags must be an array of strings' });
  }

  const updated = Document.setTags(document.id, tags);
  return res.json({ document: updated });
}

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  setDocumentTags,
};