// controllers/animationController.js
const fs = require('fs').promises;
const path = require('path');
const SessionManager = require('../services/sessionManager');
const generateAnimationWithGemini = require('../services/geminiService');

async function generateAnimation(req, res) {
  try {
    const sessionId = req.params.sessionId;

    const session = await SessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({
        error: 'Session processing not completed',
        code: 'SESSION_NOT_READY',
        currentStatus: session.status
      });
    }

    const responsePath = path.join('responses', `session_${sessionId}`);
    const hierarchyPath = path.join(responsePath, '09_object_hierarchy.json');
    const propertiesPath = path.join(responsePath, '10_properties_all_objects.json');

    const [hierarchyData, propertiesData] = await Promise.all([
      fs.readFile(hierarchyPath, 'utf-8').then(JSON.parse),
      fs.readFile(propertiesPath, 'utf-8').then(JSON.parse)
    ]);

    const animationCommands = await generateAnimationWithGemini(hierarchyData, propertiesData);

    res.json(animationCommands);
  } catch (error) {
    console.error('Animation generation error:', error.message);
    res.status(500).json({
      error: 'Failed to generate animation',
      details: error.message,
      code: 'ANIMATION_ERROR'
    });
  }
}

module.exports = {
  generateAnimation
};
