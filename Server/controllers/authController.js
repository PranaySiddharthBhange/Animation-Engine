// controllers/authController.js
const SessionManager = require('../services/sessionManager');
const ForgeClient = require('../services/forgeClient');
const config = require('../config');

async function handleAuth(req, res) {
  try {
    const { sessionId } = req.body;

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

    const sessionDate = new Date(session.createdAt);
    const hoursDiff = (Date.now() - sessionDate.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > config.SESSION_CLEANUP_HOURS) {
      return res.status(403).json({
        error: 'Session too old to generate new token',
        code: 'SESSION_EXPIRED',
        maxAgeHours: config.SESSION_CLEANUP_HOURS
      });
    }

    const forgeClient = new ForgeClient(config.FORGE_CLIENT_ID, config.FORGE_CLIENT_SECRET);
    const viewerToken = await forgeClient.getAccessToken(null, ['data:read']);

    res.json({
      accessToken: viewerToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      sessionAgeHours: hoursDiff.toFixed(2)
    });
  } catch (error) {
    console.error('Auth endpoint error:', error.message);
    res.status(500).json({
      error: 'Failed to generate access token',
      details: error.message,
      code: 'AUTH_ERROR'
    });
  }
}

module.exports = {
  handleAuth
};
