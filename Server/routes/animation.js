// routes/animation.js
const express = require('express');
const router = express.Router();
const { generateAnimation } = require('../controllers/animationController');

// GET /generate-animation/:sessionId
router.get('/generate-animation/:sessionId', generateAnimation);

module.exports = router;
