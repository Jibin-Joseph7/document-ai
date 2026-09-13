// server/src/routes/userRoutes.js
const express = require('express');
const { listUsers, updateUserRole } = require('../controllers/userController');
const { authenticateUser } = require('../middleware/auth');
const { requireMinRole, requireRole } = require('../middleware/rbac');
const config = require('../config');

const router = express.Router();

// Every route below requires a valid token.
router.use(authenticateUser);

// GET /api/users - manager or admin
router.get('/', requireMinRole(config.roles.MANAGER), listUsers);

// PATCH /api/users/:id/role - admin only
router.patch('/:id/role', requireRole(config.roles.ADMIN), updateUserRole);

module.exports = router;