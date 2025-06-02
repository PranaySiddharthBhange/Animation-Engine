const express = require('express');
const multer = require('multer');
const path = require('path');
const { handleUpload } = require('../controllers/uploadController');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

router.post('/', upload.single('file'), handleUpload);

module.exports = router;
