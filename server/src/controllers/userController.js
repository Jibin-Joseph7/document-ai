// server/src/controllers/userController.js
const User = require('../models/User');
const config = require('../config');

// GET /api/users — manager and admin can list users (e.g. to share
// documents with a teammate). Regular users cannot enumerate the org.
function listUsers(req, res) {
  const { role } = req.query;
  const users = User.list({ role });
  return res.json({ users });
}

// PATCH /api/users/:id/role  { role }  — admin only.
function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body || {};

  const validRoles = Object.values(config.roles);
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
  }

  const target = User.findById(id);
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (target.id === req.user.id && role !== req.user.role) {
    // Prevent an admin from locking themselves out by demoting themselves
    // in a moment of muscle-memory — force a different admin to do it.
    return res.status(400).json({ error: 'Admins cannot change their own role' });
  }

  const updated = User.updateRole(id, role);
  return res.json({ user: updated });
}

module.exports = { listUsers, updateUserRole };