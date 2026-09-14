// server/src/controllers/shareController.js
const Document = require('../models/Document');
const Share = require('../models/Share');
const User = require('../models/User');
const { canManageSharing, PERMISSION_RANK } = require('../utils/permissions');

const VALID_PERMISSIONS = Object.keys(PERMISSION_RANK); // view, comment, download, edit, admin

// POST /api/documents/:id/shares  { userId, permission }
function createShare(req, res) {
  const document = Document.findById(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (!canManageSharing(req.user, document)) {
    return res.status(403).json({ error: 'Forbidden — only the owner or an admin can manage sharing' });
  }

  const { userId, permission } = req.body || {};
  if (!userId || !VALID_PERMISSIONS.includes(permission)) {
    return res
      .status(400)
      .json({ error: `userId is required and permission must be one of: ${VALID_PERMISSIONS.join(', ')}` });
  }

  const targetUser = User.findById(userId);
  if (!targetUser) return res.status(400).json({ error: 'userId does not exist' });
  if (targetUser.id === document.owner_id) {
    return res.status(400).json({ error: 'The owner already has full access — no share needed' });
  }

  const share = Share.upsert({
    documentId: document.id,
    userId: targetUser.id,
    permission,
    sharedBy: req.user.id,
  });
  return res.status(201).json({ share });
}

// GET /api/documents/:id/shares
function listShares(req, res) {
  const document = Document.findById(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (!canManageSharing(req.user, document)) {
    return res.status(403).json({ error: 'Forbidden — only the owner or an admin can view sharing' });
  }
  return res.json({ shares: Share.listForDocument(document.id) });
}

// PATCH /api/documents/:id/shares/:userId  { permission }
function updateShare(req, res) {
  const document = Document.findById(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (!canManageSharing(req.user, document)) {
    return res.status(403).json({ error: 'Forbidden — only the owner or an admin can manage sharing' });
  }

  const { permission } = req.body || {};
  if (!VALID_PERMISSIONS.includes(permission)) {
    return res.status(400).json({ error: `permission must be one of: ${VALID_PERMISSIONS.join(', ')}` });
  }

  const existing = Share.findForDocumentAndUser(document.id, req.params.userId);
  if (!existing) return res.status(404).json({ error: 'This document is not shared with that user' });

  const share = Share.upsert({
    documentId: document.id,
    userId: Number(req.params.userId),
    permission,
    sharedBy: req.user.id,
  });
  return res.json({ share });
}

// DELETE /api/documents/:id/shares/:userId
function revokeShare(req, res) {
  const document = Document.findById(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (!canManageSharing(req.user, document)) {
    return res.status(403).json({ error: 'Forbidden — only the owner or an admin can manage sharing' });
  }

  const removed = Share.delete(document.id, req.params.userId);
  if (!removed) return res.status(404).json({ error: 'This document is not shared with that user' });
  return res.status(204).send();
}

module.exports = { createShare, listShares, updateShare, revokeShare };