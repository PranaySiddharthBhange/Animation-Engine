// utils/helpers.js
const fs = require('fs').promises;


async function initializeDirectories() {
  const dirs = ['uploads', 'responses'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory ${dir}:`, error.message);
    }
  }
}

module.exports = initializeDirectories;
