// server/src/routes/tagRoutes.js
const express = require('express');
const { listTags, deleteTag } = require('../controllers/tagController');
const { authenticateUser } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const config = require('../config');

const router = express.Router();
router.use(authenticateUser);

// Any authenticated user can browse tags (needed for search/filter UI).
router.get('/', listTags);

// Deleting a tag org-wide (detaching it from every document) is admin-only.
router.delete('/:id', requireRole(config.roles.ADMIN), deleteTag);

module.exports = router;