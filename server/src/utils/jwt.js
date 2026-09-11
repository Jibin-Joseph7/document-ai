// server/src/utils/jwt.js
const jwt = require('jsonwebtoken');
const config = require('../config');

function signToken(user) {
  // Keep the payload minimal — id + role is all downstream middleware needs.
  // Never put the password hash or other secrets in a JWT payload.
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

function verifyToken(token) {
  // Throws (JsonWebTokenError / TokenExpiredError) on invalid/expired tokens —
  // callers (auth middleware) are expected to catch this.
  return jwt.verify(token, config.jwt.secret);
}

module.exports = { signToken, verifyToken };