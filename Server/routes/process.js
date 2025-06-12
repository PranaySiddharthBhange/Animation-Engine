// routes/process.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { handleProcessRequest } = require('../controllers/processController');

// POST /process
router.post('/process', upload.single('zipfile'), handleProcessRequest);

module.exports = router;
