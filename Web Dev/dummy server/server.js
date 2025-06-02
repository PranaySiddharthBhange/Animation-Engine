const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Allow requests from React frontend
app.use(cors({ origin: 'http://localhost:5173' }));

// Ensure the uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer to save files to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // or use Date.now() + '-' + file.originalname
  },
});

const upload = multer({ storage });

app.post('/upload', upload.array('files'), (req, res) => {
  console.log('\n📁 Received files:');
  req.files.forEach(file => {
    console.log(`- ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
  });

  res.json({ message: 'Files saved to /uploads folder successfully!' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
