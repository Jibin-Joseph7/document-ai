// server/src/controllers/documentController.js
const fs = require('fs');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const Share = require('../models/Share');
const db = require('../db/connection');
const { canView, canDownload, canEdit, canManageSharing } = require('../utils/permissions');
const aiServiceClient = require('../services/aiServiceClient');

// POST /api/documents  (multipart/form-data: file, folderId?, category?, title?)
// Expects `upload.single('file')` to have run first, populating req.file.
async function uploadDocument(req, res) {
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

  let document = Document.create({
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

  // Run the document through the AI service's ingestion pipeline (extract
  // -> chunk -> embed -> store, commit 14) synchronously before responding.
  // A production system with large files would push this to a background
  // queue instead, but doing it inline here means the response the client
  // gets back already reflects whether the document is actually searchable
  // ('ready') or not ('failed') rather than making them poll separately.
  try {
    const result = await aiServiceClient.ingestDocument({
      documentId: document.id,
      filepath: document.filepath,
      mimeType: document.mime_type,
      metadata: { owner_id: document.owner_id, category: document.category },
    });
    document = Document.updateStatus(document.id, result.status); // 'ready' or 'failed'
  } catch (err) {
    // AI service unreachable/erroring shouldn't take the whole upload down —
    // the document and file are already safely stored; it just isn't
    // searchable yet. Surface that honestly via status rather than a 500.
    console.error('Ingestion failed:', err.message);
    document = Document.updateStatus(document.id, 'failed');
  }

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

async function deleteDocument(req, res) {
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

  // Best-effort vector store cleanup too — if the AI service is down,
  // the document is still correctly deleted on the Node side; a stray
  // set of orphaned chunks in Chroma isn't reachable by any user-facing
  // query once the document row is gone (search/QA always filter by the
  // caller's visible document_ids), so this is cleanup, not a
  // correctness requirement.
  try {
    await aiServiceClient.removeDocument(document.id);
  } catch (err) {
    console.error('AI service chunk cleanup failed (non-fatal):', err.message);
  }

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

// The user's full visible-document-id set, computed the same way the
// document list itself is (Document.listForUser's role-aware scoping).
// This is what gets passed to the AI service so it never has to know
// about users, roles, or departments at all — see search.py's docstring.
function visibleDocumentIds(user) {
  return Document.listForUser(user).map((d) => d.id);
}

// POST /api/documents/search  { query, nResults? }
// Semantic search across every document the caller can see.
async function semanticSearch(req, res, next) {
  const { query, nResults } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'query is required' });
  }

  const documentIds = visibleDocumentIds(req.user);

  db.prepare(
    `INSERT INTO search_queries (user_id, query, query_type) VALUES (?, ?, 'semantic')`
  ).run(req.user.id, query.trim());

  try {
    const result = await aiServiceClient.search({ query, documentIds, nResults });
    const enriched = result.results.map((hit) => {
      const doc = Document.findById(hit.document_id);
      return { ...hit, document: doc ? { id: doc.id, title: doc.title, category: doc.category } : null };
    });
    return res.json({ query: result.query, results: enriched });
  } catch (err) {
    return next(err);
  }
}

// POST /api/documents/ask  { question, nResults? }  — ask across everything visible
// POST /api/documents/:id/ask  { question }          — ask about one specific document
async function askQuestion(req, res, next) {
  const { question, nResults } = req.body || {};
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  let documentIds;
  if (req.params.id) {
    const document = Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!canView(req.user, document)) return res.status(403).json({ error: 'Forbidden' });
    documentIds = [document.id];
  } else {
    documentIds = visibleDocumentIds(req.user);
  }

  db.prepare(
    `INSERT INTO search_queries (user_id, query, query_type) VALUES (?, ?, 'question')`
  ).run(req.user.id, question.trim());

  try {
    const result = await aiServiceClient.askQuestion({ question, documentIds, nResults });

    // Credit every document that actually contributed a source with an
    // AI-question view, not just the one in the URL (an org-wide question
    // may draw from several documents at once).
    const sourceDocIds = [...new Set(result.sources.map((s) => s.document_id))];
    for (const docId of sourceDocIds) {
      db.prepare(
        `UPDATE document_analytics SET ai_question_count = ai_question_count + 1 WHERE document_id = ?`
      ).run(docId);
    }

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

// POST /api/documents/:id/summarize  { maxSentences? }
async function summarizeDocument(req, res, next) {
  const document = Document.findById(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (!canView(req.user, document)) return res.status(403).json({ error: 'Forbidden' });

  const { maxSentences } = req.body || {};

  try {
    const result = await aiServiceClient.summarizeDocument({
      documentId: document.id,
      maxSentences,
    });
    // Persist the summary on the document row so it's available via a
    // plain GET afterward without re-summarizing every time.
    const updated = Document.updateSummary(document.id, result.summary);
    return res.json({
      document: updated,
      method: result.method,
      keyPoints: result.key_points,
    });
  } catch (err) {
    if (err instanceof aiServiceClient.AiServiceError && err.status === 404) {
      return res
        .status(409)
        .json({ error: 'Document has not finished ingesting yet — try again shortly' });
    }
    return next(err);
  }
}

// POST /api/documents/:id/suggest-tags  { maxTags?, apply? }
async function suggestDocumentTags(req, res, next) {
  const document = Document.findById(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (!canEdit(req.user, document)) {
    return res.status(403).json({ error: 'Forbidden — requires edit permission or higher' });
  }

  const { maxTags, apply } = req.body || {};

  try {
    const result = await aiServiceClient.suggestTags({ documentId: document.id, maxTags });

    let updated = document;
    if (apply) {
      updated = Document.setTags(document.id, result.tags);
      // Only fill in category if the document doesn't already have one —
      // auto-tagging shouldn't silently overwrite a human's choice.
      if (!updated.category && result.category) {
        updated = Document.updateMeta(document.id, { category: result.category });
      }
    }

    return res.json({
      document: updated,
      method: result.method,
      suggestedCategory: result.category,
      suggestedTags: result.tags,
      applied: !!apply,
    });
  } catch (err) {
    if (err instanceof aiServiceClient.AiServiceError && err.status === 404) {
      return res
        .status(409)
        .json({ error: 'Document has not finished ingesting yet — try again shortly' });
    }
    return next(err);
  }
}

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  setDocumentTags,
  semanticSearch,
  askQuestion,
  summarizeDocument,
  suggestDocumentTags,
};