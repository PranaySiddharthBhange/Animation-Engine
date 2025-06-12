// config/index.js
require('dotenv').config();

const config = {
  PORT: process.env.PORT || 3000,
  FORGE_CLIENT_ID: process.env.FORGE_CLIENT_ID,
  FORGE_CLIENT_SECRET: process.env.FORGE_CLIENT_SECRET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  SESSION_CLEANUP_HOURS: 24,
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  TRANSLATION_TIMEOUT_MINUTES: 30,
  TRANSLATION_CHECK_INTERVAL: 10000,
};

const requiredVars = ['FORGE_CLIENT_ID', 'FORGE_CLIENT_SECRET', 'GEMINI_API_KEY'];
const missing = requiredVars.filter(name => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = config;
