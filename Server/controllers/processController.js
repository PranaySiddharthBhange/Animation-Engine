// controllers/processController.js
const path = require('path');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const ForgeClient = require('../services/forgeClient');
const SessionManager = require('../services/sessionManager');
const FileUtils = require('../services/fileUtils');
const config = require('../config');

async function processFiles(sessionId, folderPath, responsePath) {
  const forgeClient = new ForgeClient(config.FORGE_CLIENT_ID, config.FORGE_CLIENT_SECRET);

  try {
    await SessionManager.updateSession(sessionId, {
      status: 'processing',
      message: 'Getting access token',
      progress: 5
    });

    const accessToken = await forgeClient.getAccessToken(responsePath);

    await SessionManager.updateSession(sessionId, {
      message: 'Creating bucket',
      progress: 10
    });

    const bucketKey = `bucket_${uuidv4().replace(/-/g, '')}`;
    await forgeClient.createBucket(accessToken, bucketKey, responsePath);

    await SessionManager.updateSession(sessionId, {
      message: 'Uploading files',
      progress: 20
    });

    await forgeClient.uploadAllFiles(accessToken, bucketKey, folderPath, responsePath, msg =>
      SessionManager.updateSession(sessionId, { message: msg, progress: 25 })
    );

    await SessionManager.updateSession(sessionId, {
      message: 'Detecting assembly file',
      progress: 30
    });

    const assemblyFile = await FileUtils.detectAssemblyFile(folderPath);
    if (!assemblyFile) throw new Error('No assembly (.iam) file found');

    await SessionManager.updateSession(sessionId, {
      message: 'Linking references',
      progress: 40
    });

    await forgeClient.linkReferences(accessToken, bucketKey, assemblyFile, folderPath, responsePath);

    await SessionManager.updateSession(sessionId, {
      message: 'Starting translation',
      progress: 50
    });

    const encodedUrn = await forgeClient.startTranslationJob(accessToken, bucketKey, assemblyFile, responsePath);

    await SessionManager.updateSession(sessionId, {
      message: 'Translating model (this may take several minutes)',
      progress: 60
    });

    await forgeClient.checkTranslationStatus(accessToken, encodedUrn, responsePath, msg =>
      SessionManager.updateSession(sessionId, { message: msg, progress: 65 })
    );

    await SessionManager.updateSession(sessionId, {
      message: 'Retrieving metadata',
      progress: 80
    });

    const guid = await forgeClient.getMetadata(accessToken, encodedUrn, responsePath);

    await SessionManager.updateSession(sessionId, {
      message: 'Extracting hierarchy',
      progress: 85
    });

    await forgeClient.getObjectHierarchy(accessToken, encodedUrn, guid, responsePath);

    await SessionManager.updateSession(sessionId, {
      message: 'Retrieving properties',
      progress: 95
    });

    await forgeClient.getProperties(accessToken, encodedUrn, guid, responsePath);

    await SessionManager.updateSession(sessionId, {
      status: 'completed',
      message: 'Processing completed successfully',
      progress: 100,
      result: {
        accessToken,
        encodedUrn,
        bucketKey
      }
    });

  } catch (error) {
    console.error(`Processing failed for session ${sessionId}:`, error.message);
    await SessionManager.updateSession(sessionId, {
      status: 'failed',
      message: error.message,
      error: error.message,
      progress: 0
    });
  } finally {
    await FileUtils.cleanupPath(folderPath);
  }
}

async function handleProcessRequest(req, res) {
  let sessionId = null;
  let zipPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ZIP file is required', code: 'MISSING_FILE' });
    }

    zipPath = req.file.path;
    sessionId = uuidv4();

    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    if (entries.length === 0) {
      return res.status(400).json({ error: 'ZIP file is empty', code: 'INVALID_ZIP' });
    }

    await SessionManager.updateSession(sessionId, {
      status: 'queued',
      message: 'Processing queued',
      progress: 0,
      fileName: req.file.originalname
    });

    const sessionFolder = `session_${sessionId}`;
    const uploadPath = path.join('uploads', sessionFolder);
    const responsePath = path.join('responses', sessionFolder);

    await fs.mkdir(uploadPath, { recursive: true });
    await fs.mkdir(responsePath, { recursive: true });

    zip.extractAllTo(uploadPath, true);

    processFiles(sessionId, uploadPath, responsePath).catch(err =>
      console.error(`Background processing failed for ${sessionId}:`, err.message)
    );

    res.json({ success: true, message: 'Processing started', sessionId });
  } catch (err) {
    console.error('Process endpoint error:', err.message);
    if (sessionId) {
      await SessionManager.updateSession(sessionId, {
        status: 'failed',
        message: 'Failed to start processing',
        error: err.message
      }).catch(() => {});
    }

    res.status(500).json({
      error: 'Failed to start processing',
      details: err.message,
      code: 'PROCESSING_ERROR'
    });
  } finally {
    if (zipPath) await FileUtils.cleanupPath(zipPath);
  }
}

module.exports = {
  handleProcessRequest
};
