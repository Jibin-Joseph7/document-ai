// server/src/app.js
// Express app is assembled here (not in server.js) so tests can `require`
// it directly and drive it with supertest without binding a real port.

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const folderRoutes = require('./routes/folderRoutes');
const tagRoutes = require('./routes/tagRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'test' ? 'tiny' : 'dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'document-ai-server', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/documents', documentRoutes);
// Sharing routes land in commit 7, analytics in commit 8.

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler - any controller that calls next(err) lands here.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // e.g. file too large, unexpected field, unsupported mime type
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;