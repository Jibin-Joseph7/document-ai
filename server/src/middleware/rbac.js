// server/src/middleware/rbac.js
const config = require('../config');

const { ADMIN, MANAGER, USER } = config.roles;

// Roles ranked so "at least manager" checks are a one-liner instead of
// listing every allowed role at every call site.
const RANK = { [USER]: 0, [MANAGER]: 1, [ADMIN]: 2 };

// requireRole('admin') or requireRole('admin', 'manager') — exact allow-list.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      // Should never happen if authenticateUser runs first, but fail closed.
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden — insufficient role',
        required: allowedRoles,
        current: req.user.role,
      });
    }
    next();
  };
}

// requireMinRole('manager') — allows manager and admin, rejects user.
function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if ((RANK[req.user.role] ?? -1) < (RANK[minRole] ?? Infinity)) {
      return res.status(403).json({
        error: 'Forbidden — insufficient role',
        required: `>= ${minRole}`,
        current: req.user.role,
      });
    }
    next();
  };
}

// Ownership-or-role check: passes if req.user owns the resource
// (resourceOwnerId) OR holds one of the given roles (e.g. admin can act on
// anyone's resources). Used by document/folder routes in later commits.
function requireOwnerOrRole(getResourceOwnerId, ...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (allowedRoles.includes(req.user.role)) return next();

    try {
      const ownerId = await getResourceOwnerId(req);
      if (ownerId != null && ownerId === req.user.id) return next();
    } catch (err) {
      return next(err);
    }
    return res.status(403).json({ error: 'Forbidden — not the owner' });
  };
}

module.exports = { requireRole, requireMinRole, requireOwnerOrRole };