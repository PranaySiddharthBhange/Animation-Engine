// controllers/statusController.js
const SessionManager = require('../services/sessionManager');

async function getStatus(req, res) {
  try {
    const sessionId = req.params.sessionId;

    if (!sessionId || !sessionId.match(/^[a-f0-9-]+$/i)) {
      return res.status(400).json({
        error: 'Invalid session ID format',
        code: 'INVALID_SESSION_ID'
      });
    }

    const session = await SessionManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    res.json({
      status: session.status,
      message: session.message,
      progress: session.progress || 0,
      result: session.result,
      error: session.error,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    });
  } catch (error) {
    console.error('Status endpoint error:', error.message);
    res.status(500).json({
      error: 'Failed to get session status',
      details: error.message,
      code: 'STATUS_ERROR'
    });
  }
}

module.exports = {
  getStatus
};
