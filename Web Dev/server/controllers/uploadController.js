const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const { sendToCSharp } = require('../services/csharpInvoker');

exports.handleUpload = async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const ext = path.extname(file.originalname);
        const uploadPath = path.join(__dirname, '../uploads', file.filename);
        let extractedPath = uploadPath;

        // If ZIP, unzip
        if (ext === '.zip') {
            const extractDir = path.join(__dirname, '../uploads', `${Date.now()}_extracted`);
            fs.mkdirSync(extractDir, { recursive: true });

            await fs.createReadStream(uploadPath)
                .pipe(unzipper.Extract({ path: extractDir }))
                .promise();

            extractedPath = extractDir;
        }

        // Call C# processor with extractedPath
        const csharpResponse = await sendToCSharp(extractedPath);
        return res.json({ message: 'Upload successful', data: csharpResponse });

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to process upload' });
    }
};
