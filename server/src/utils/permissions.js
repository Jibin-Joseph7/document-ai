// server/src/utils/permissions.js
const db = require('../db/connection');
const Share = require('../models/Share');

// Ranked so "at least X" checks are a one-liner. Matches the permission
// values allowed by the document_shares.permission CHECK constraint.
const PERMISSION_RANK = { view: 0, comment: 1, download: 2, edit: 3, admin: 4 };

// The single highest permission level `user` has on `document`, or null if
// they have none. Ownership and admin/manager-department access are
// treated as an implicit 'admin' share so every other check in this module
// only has to reason about one scale instead of two separate systems.
function getEffectivePermission(user, document) {
  if (!document) return null;
  if (user.role === 'admin') return 'admin';
  if (document.owner_id === user.id) return 'admin';

  if (user.role === 'manager') {
    const owner = db.prepare('SELECT department FROM users WHERE id = ?').get(document.owner_id);
    if (owner && owner.department && owner.department === user.department) {
      return 'admin'; // managers get full control within their own department
    }
  }

  const share = Share.findForDocumentAndUser(document.id, user.id);
  return share ? share.permission : null;
}

function hasAtLeast(user, document, minPermission) {
  const level = getEffectivePermission(user, document);
  if (!level) return false;
  return PERMISSION_RANK[level] >= PERMISSION_RANK[minPermission];
}

const canView = (user, document) => hasAtLeast(user, document, 'view');
const canComment = (user, document) => hasAtLeast(user, document, 'comment');
const canDownload = (user, document) => hasAtLeast(user, document, 'download');
const canEdit = (user, document) => hasAtLeast(user, document, 'edit');
// Only an 'admin'-level holder (owner, admin, in-department manager, or an
// explicit admin-permission share) can manage sharing itself.
const canManageSharing = (user, document) => hasAtLeast(user, document, 'admin');

module.exports = {
  PERMISSION_RANK,
  getEffectivePermission,
  hasAtLeast,
  canView,
  canComment,
  canDownload,
  canEdit,
  canManageSharing,
};