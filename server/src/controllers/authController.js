// server/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { validateRegisterInput, validateLoginInput } = require('../utils/validators');

const SALT_ROUNDS = 10;

async function register(req, res) {
  const { name, email, password, department } = req.body || {};

  const errors = validateRegisterInput({ name, email, password });
  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (User.emailExists(normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  // Every self-registered account starts as 'user'. Promotion to
  // manager/admin is a separate, privileged action (see commit 4's RBAC
  // middleware) — never trust a role field from the request body.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'user',
    department: department || null,
  });

  const token = signToken(user);
  return res.status(201).json({ user, token });
}

async function login(req, res) {
  const { email, password } = req.body || {};

  const errors = validateLoginInput({ email, password });
  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const userWithSecret = User.findByEmail(normalizedEmail);

  // Same error for "no such user" and "wrong password" — don't leak which
  // one it was, that makes email enumeration trivial.
  if (!userWithSecret) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const passwordMatches = await bcrypt.compare(password, userWithSecret.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = User.findById(userWithSecret.id); // strips password_hash
  const token = signToken(user);
  return res.json({ user, token });
}

// GET /api/auth/me — requires authenticateUser to have run first.
function getMe(req, res) {
  return res.json({ user: req.user });
}

module.exports = { register, login, getMe };