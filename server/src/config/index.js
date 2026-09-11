// server/src/config/index.js
// Single source of truth for server configuration. Everything is read from
// process.env (populated via dotenv in server.js / db/init.js) so the same
// code works locally, in CI, and in containers — only the .env file changes.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

function required(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  jwt: {
    secret: required('JWT_SECRET', 'dev-only-insecure-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  db: {
    // Resolved relative to the repo root regardless of cwd.
    sqlitePath: path.resolve(
      __dirname,
      '../../../',
      process.env.SQLITE_PATH || './server/data/document_ai.sqlite'
    ),
  },

  uploads: {
    dir: path.resolve(__dirname, '../../../', process.env.UPLOAD_DIR || './uploads'),
    maxSizeBytes: parseInt(process.env.MAX_UPLOAD_MB || '25', 10) * 1024 * 1024,
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',
    ],
  },

  aiService: {
    baseUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  },

  roles: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    USER: 'user',
  },
};

module.exports = config;