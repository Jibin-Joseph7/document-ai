const express = require('express');

const {
  authenticate,
  authorize
} = require('../middleware/authMiddleware');

const {
  getMe,
  getAdminData,
  getManagerData
} = require('../controllers/userController');

const router = express.Router();

router.get('/me', authenticate, getMe);

router.get(
  '/admin',
  authenticate,
  authorize('admin'),
  getAdminData
);

router.get(
  '/manager',
  authenticate,
  authorize('manager', 'admin'),
  getManagerData
);

module.exports = router;