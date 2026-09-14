const express = require('express');
const {
  overview,
  mostViewed,
  mostDownloaded,
  popularSearchQueries,
} = require('../controllers/analyticsController');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateUser);

router.get('/overview', overview);
router.get('/most-viewed', mostViewed);
router.get('/most-downloaded', mostDownloaded);
router.get('/search-queries', popularSearchQueries);

module.exports = router;
