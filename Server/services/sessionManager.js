// services/sessionManager.js
const fs = require('fs').promises;
const path = require('path');
const { SESSION_CLEANUP_HOURS } = require('../config');

class SessionManager {
  static async getSession(sessionId) {
    try {
      const sessionPath = path.join('responses', `session_${sessionId}`, 'session.json');
      const data = await fs.readFile(sessionPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Error reading session ${sessionId}:`, error.message);
      }
      return null;
    }
  }

  static async updateSession(sessionId, update) {
    const sessionFolder = path.join('responses', `session_${sessionId}`);
    const sessionPath = path.join(sessionFolder, 'session.json');
    try {
      let session = { createdAt: new Date().toISOString() };
      try {
        const existingData = await fs.readFile(sessionPath, 'utf-8');
        session = JSON.parse(existingData);
      } catch (_) {}

      const updatedSession = {
        ...session,
        ...update,
        updatedAt: new Date().toISOString()
      };

      await fs.mkdir(sessionFolder, { recursive: true });
      await fs.writeFile(sessionPath, JSON.stringify(updatedSession, null, 2));
      return updatedSession;
    } catch (error) {
      console.error(`Error updating session ${sessionId}:`, error.message);
      throw error;
    }
  }

  static async cleanupOldSessions() {
    try {
      const responsesDir = 'responses';
      const entries = await fs.readdir(responsesDir, { withFileTypes: true });
      const cutoffTime = Date.now() - (SESSION_CLEANUP_HOURS * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('session_')) {
          const sessionPath = path.join(responsesDir, entry.name);
          const sessionFile = path.join(sessionPath, 'session.json');
          try {
            const stats = await fs.stat(sessionFile);
            if (stats.mtime.getTime() < cutoffTime) {
              await fs.rm(sessionPath, { recursive: true, force: true });
              cleanedCount++;
            }
          } catch (_) {
            try {
              await fs.rm(sessionPath, { recursive: true, force: true });
              cleanedCount++;
            } catch (cleanupError) {
              console.error(`Failed to cleanup ${entry.name}:`, cleanupError.message);
            }
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old sessions`);
      }
    } catch (error) {
      console.error('Error during session cleanup:', error.message);
    }
  }
}

module.exports = SessionManager;
