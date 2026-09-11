// server/src/db/init.js
// Run with `npm run db:init` inside server/. Creates the SQLite file and all
// tables (via connection.js's applySchema), then prints a summary so you can
// confirm the database is in a good state before starting the API.

const bcrypt = require('bcryptjs');
const db = require('./connection');
const config = require('./../config');

function seedAdminIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount > 0) return null;

  const passwordHash = bcrypt.hashSync('ChangeMe123!', 10);
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, department)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run('System Admin', 'admin@document-ai.local', passwordHash, config.roles.ADMIN, 'IT');

  return info.lastInsertRowid;
}

function main() {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((r) => r.name);

  console.log(`Database file: ${config.db.sqlitePath}`);
  console.log(`Tables (${tables.length}): ${tables.join(', ')}`);

  const seededId = seedAdminIfEmpty();
  if (seededId) {
    console.log(
      `Seeded default admin -> email: admin@document-ai.local  password: ChangeMe123!  (id=${seededId})`
    );
    console.log('⚠️  Change this password immediately after first login.');
  } else {
    console.log('Users table already has data — skipped admin seed.');
  }
}

main();