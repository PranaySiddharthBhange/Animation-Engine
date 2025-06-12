// middleware/upload.js
const multer = require('multer');
const { MAX_FILE_SIZE } = require('../config');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = 'uploads/';
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${uuidv4()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.toLowerCase().endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  }
});

module.exports = upload;
