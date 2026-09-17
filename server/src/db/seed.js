const bcrypt = require("bcryptjs");
const db = require("./connection");
const config = require("../config");

const DEMO_PASSWORD = "DemoPass123!";

const DEMO_USERS = [
  {
    name: "Priya Manager",
    email: "priya.manager@demo.local",
    role: config.roles.MANAGER,
    department: "Finance",
  },
  {
    name: "Grace Finance",
    email: "grace.finance@demo.local",
    role: config.roles.USER,
    department: "Finance",
  },
  {
    name: "Sam HR",
    email: "sam.hr@demo.local",
    role: config.roles.USER,
    department: "HR",
  },
  {
    name: "Devon Engineer",
    email: "devon.eng@demo.local",
    role: config.roles.USER,
    department: "Engineering",
  },
];

const DEMO_FOLDERS = [
  {
    name: "Finance Reports",
    ownerEmail: "grace.finance@demo.local",
  },
  {
    name: "HR Policies",
    ownerEmail: "sam.hr@demo.local",
  },
  {
    name: "Engineering Docs",
    ownerEmail: "devon.eng@demo.local",
  },
];

function upsertUser({ name, email, role, department }) {
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);

  if (existing) {
    return existing.id;
  }

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  const info = db
    .prepare(
      `INSERT INTO users
       (name, email, password_hash, role, department)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(name, email, passwordHash, role, department);

  return info.lastInsertRowid;
}

function main() {
  console.log("Seeding demo users...");

  const userIdByEmail = {};

  for (const user of DEMO_USERS) {
    const id = upsertUser(user);

    userIdByEmail[user.email] = id;

    console.log(
      `  ${user.role.padEnd(8)} ${user.department.padEnd(12)} ${user.email}`
    );
  }

  console.log("\nSeeding demo folders...");

  for (const folder of DEMO_FOLDERS) {
    const ownerId = userIdByEmail[folder.ownerEmail];

    const existing = db
      .prepare(
        "SELECT id FROM folders WHERE name = ? AND owner_id = ?"
      )
      .get(folder.name, ownerId);

    if (!existing) {
      db.prepare(
        "INSERT INTO folders (name, owner_id) VALUES (?, ?)"
      ).run(folder.name, ownerId);

      console.log(
        `  ${folder.name} (owned by ${folder.ownerEmail})`
      );
    }
  }

  console.log(
    `\nAll demo accounts share the password: ${DEMO_PASSWORD}`
  );

  console.log(
    "Upload documents through the UI to populate search, Q&A, and analytics."
  );
}

main();
