// server/src/middleware/upload.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');

if (!fs.existsSync(config.uploads.dir)) {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, config.uploads.dir);
  },
  filename(req, file, cb) {
    // Never trust the original filename for the on-disk name (path
    // traversal, collisions, weird characters) — generate our own and keep
    // the original only as metadata in the DB.
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

function fileFilter(req, file, cb) {
  if (!config.uploads.allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT, CSV, XLSX.`
      )
    );
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.uploads.maxSizeBytes },
});

module.exports = upload;