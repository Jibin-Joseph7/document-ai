// server/src/models/User.js
// Thin data-access layer around the `users` table. Controllers should never
// write raw SQL directly — everything goes through here so query shape and
// column list only need to change in one place.

const db = require('../db/connection');

const PUBLIC_COLUMNS = 'id, name, email, role, department, created_at, updated_at';

const User = {
  create({ name, email, passwordHash, role = 'user', department = null }) {
    const stmt = db.prepare(
      `INSERT INTO users (name, email, password_hash, role, department)
       VALUES (@name, @email, @passwordHash, @role, @department)`
    );
    const info = stmt.run({ name, email, passwordHash, role, department });
    return User.findById(info.lastInsertRowid);
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findById(id) {
    return db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(id);
  },

  // Includes password_hash — only for internal auth checks, never returned to clients.
  findByIdWithSecret(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  list({ role } = {}) {
    if (role) {
      return db
        .prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE role = ? ORDER BY created_at DESC`)
        .all(role);
    }
    return db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC`).all();
  },

  updateRole(id, role) {
    db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).run(
      role,
      id
    );
    return User.findById(id);
  },

  emailExists(email) {
    const row = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
    return !!row;
  },
};

module.exports = User;