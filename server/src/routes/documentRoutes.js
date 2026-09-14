// server/src/routes/documentRoutes.js
const express = require('express');
const {
  uploadDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  setDocumentTags,
} = require('../controllers/documentController');
const {
  createShare,
  listShares,
  updateShare,
  revokeShare,
} = require('../controllers/shareController');
const { authenticateUser } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(authenticateUser);

router.post('/', upload.single('file'), uploadDocument);
router.get('/', listDocuments);
router.get('/:id', getDocument);
router.patch('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.get('/:id/download', downloadDocument);
router.put('/:id/tags', setDocumentTags);

// Sharing (nested under the document it applies to)
router.post('/:id/shares', createShare);
router.get('/:id/shares', listShares);
router.patch('/:id/shares/:userId', updateShare);
router.delete('/:id/shares/:userId', revokeShare);

module.exports = router;