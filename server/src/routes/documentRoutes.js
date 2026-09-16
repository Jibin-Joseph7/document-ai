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
  semanticSearch,
  askQuestion,
  summarizeDocument,
  suggestDocumentTags,
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

// Static paths must come before the '/:id' dynamic routes below, or
// Express would try to match e.g. "search" as an :id.
router.post('/search', semanticSearch);
router.post('/ask', askQuestion);

router.get('/:id', getDocument);
router.patch('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.get('/:id/download', downloadDocument);
router.put('/:id/tags', setDocumentTags);
router.post('/:id/ask', askQuestion);
router.post('/:id/summarize', summarizeDocument);
router.post('/:id/suggest-tags', suggestDocumentTags);

// Sharing (nested under the document it applies to)
router.post('/:id/shares', createShare);
router.get('/:id/shares', listShares);
router.patch('/:id/shares/:userId', updateShare);
router.delete('/:id/shares/:userId', revokeShare);

module.exports = router;