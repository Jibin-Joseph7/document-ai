// server/src/utils/validators.js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegisterInput({ name, email, password }) {
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('name must be at least 2 characters');
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    errors.push('a valid email is required');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('password must be at least 8 characters');
  }
  return errors;
}

function validateLoginInput({ email, password }) {
  const errors = [];
  if (!email || typeof email !== 'string') errors.push('email is required');
  if (!password || typeof password !== 'string') errors.push('password is required');
  return errors;
}

module.exports = { validateRegisterInput, validateLoginInput };