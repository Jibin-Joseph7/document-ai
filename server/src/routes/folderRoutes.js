// server/src/routes/folderRoutes.js
const express = require('express');
const {
  createFolder,
  listFolders,
  getFolder,
  updateFolder,
  deleteFolder,
} = require('../controllers/folderController');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateUser);

router.post('/', createFolder);
router.get('/', listFolders);
router.get('/:id', getFolder);
router.patch('/:id', updateFolder);
router.delete('/:id', deleteFolder);

module.exports = router;