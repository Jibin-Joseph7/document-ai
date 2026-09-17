// server/src/db/seed.js
// Run with `npm run db:seed` inside server/ (after `npm run db:init`).
// Creates a small cast of demo users spanning every role and a couple of
// departments, so the RBAC/sharing/analytics features (commits 4, 7, 8)
// have something to actually demonstrate right after a fresh docker
// compose up, without hand-registering five accounts through the UI.
//
// Sample DOCUMENTS are deliberately NOT seeded here - ingestion is a real
// pipeline call to the AI service (commit 19), and faking that by writing
// rows directly would leave the vector store out of sync with the
// documents table. Upload a couple of files through the UI after seeding
// to see search/Q&A/summarization working against real demo data.

const bcrypt = require('bcryptjs');
const db = require('./connection');
const config = require('../config');

const DEMO_PASSWORD = 'DemoPass123!';

const DEMO_USERS = [
  { name: 'Priya Manager', email: 'priya.manager@demo.local', role: config.roles.MANAGER, department: 'Finance' },
  { name: 'Grace Finance', email: 'grace.finance@demo.local', role: config.roles.USER, department: 'Finance' },
  { name: 'Sam HR', email: 'sam.hr@demo.local', role: config.roles.USER, department: 'HR' },
  { name: 'Devon Engineer', email: 'devon.eng@demo.local', role: config.roles.USER, department: 'Engineering' },
];

const DEMO_FOLDERS = [
  { name: 'Finance Reports', ownerEmail: 'grace.finance@demo.local' },
  { name: 'HR Policies', ownerEmail: 'sam.hr@demo.local' },
  { name: 'Engineering Docs', ownerEmail: 'devon.eng@demo.local' },
];

function upsertUser({ name, email, role, department }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return existing.id;

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)`
    )
    .run(name, email, passwordHash, role, department);
  return info.lastInsertRowid;
}

function main() {
  console.log('Seeding demo users...');
  const userIdByEmail = {};
  for (const user of DEMO_USERS) {
    const id = upsertUser(user);
    userIdByEmail[user.email] = id;
    console.log(`  ${user.role.padEnd(8)} ${user.department.padEnd(12)} ${user.email}`);
  }

  console.log('\nSeeding demo folders...');
  for (const folder of DEMO_FOLDERS) {
    const ownerId = userIdByEmail[folder.ownerEmail];
    const existing = db
      .prepare('SELECT id FROM folders WHERE name = ? AND owner_id = ?')
      .get(folder.name, ownerId);
    if (!existing) {
      db.prepare('INSERT INTO folders (name, owner_id) VALUES (?, ?)').run(folder.name, ownerId);
      console.log(`  ${folder.name} (owned by ${folder.ownerEmail})`);
    }
  }

  console.log(`\nAll demo accounts share the password: ${DEMO_PASSWORD}`);
  console.log('Log in as any of the above (or the admin seeded by db:init) and upload a');
  console.log('few files through the UI to populate search, Q&A, and analytics.');
}

main();