// routes/index.js
const express = require('express');
const router = express.Router();

router.use(require('./process'));
router.use(require('./auth'));
router.use(require('./status'));
router.use(require('./animation'));

module.exports = router;
