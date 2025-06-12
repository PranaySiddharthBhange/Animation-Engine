// routes/status.js
const express = require('express');
const router = express.Router();
const { getStatus } = require('../controllers/statusController');

// GET /status/:sessionId
router.get('/status/:sessionId', getStatus);

module.exports = router;
