// routes/auth.js
const express = require('express');
const router = express.Router();
const { handleAuth } = require('../controllers/authController');

// POST /auth
router.post('/auth', handleAuth);

module.exports = router;
