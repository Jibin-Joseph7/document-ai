// server/src/routes/authRoutes.js
const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register  { name, email, password, department? }
router.post('/register', register);

// POST /api/auth/login     { email, password }
router.post('/login', login);

// GET /api/auth/me — requires a valid Bearer token
router.get('/me', authenticateUser, getMe);

module.exports = router;