// server/src/middleware/auth.js
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

// Reads `Authorization: Bearer <token>`, verifies it, and re-loads the user
// from the DB (rather than trusting the JWT payload wholesale) so that a
// role change or account removal takes effect immediately instead of
// waiting for the token to expire.
function authenticateUser(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
    return res.status(401).json({ error: message });
  }

  const user = User.findById(payload.sub);
  if (!user) {
    return res.status(401).json({ error: 'User no longer exists' });
  }

  req.user = user; // { id, name, email, role, department, created_at, updated_at }
  next();
}

// Optional auth: attaches req.user if a valid token is present, but doesn't
// reject the request if it's missing. Useful for endpoints that behave
// differently for logged-in vs anonymous callers (none yet, but cheap to
// have ready).
function attachUserIfPresent(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next();

  try {
    const payload = verifyToken(token);
    const user = User.findById(payload.sub);
    if (user) req.user = user;
  } catch {
    // silently ignore bad/expired tokens in optional-auth contexts
  }
  next();
}

module.exports = { authenticateUser, attachUserIfPresent };