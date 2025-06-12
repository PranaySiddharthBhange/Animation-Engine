// services/fileUtils.js
const fs = require('fs').promises;
const path = require('path');

class FileUtils {
  static async saveResponseToFile(responsePath, stepName, data) {
    const essentialData = this.extractEssentialData(stepName, data);
    const filePath = path.join(responsePath, `${stepName}.json`);
    await fs.writeFile(filePath, JSON.stringify(essentialData, null, 2));
  }

  static extractEssentialData(stepName, data) {
    switch (stepName) {
      case '01_get_access_token':
        return {
          access_token: data.access_token,
          expires_in: data.expires_in,
          token_type: data.token_type
        };
      case '06_start_translation_job':
        return {
          result: data.result,
          urn: data.urn,
          acceptedJobs: data.acceptedJobs
        };
      case '08_metadata':
        return {
          data: {
            type: data.data?.type,
            metadata: data.data?.metadata?.map(m => ({
              guid: m.guid,
              name: m.name,
              role: m.role
            }))
          }
        };
      case '09_object_hierarchy':
      case '10_properties_all_objects':
        return data;
      default:
        return { status: 'completed', timestamp: new Date().toISOString() };
    }
  }

  static async detectAssemblyFile(folderPath) {
    try {
      const files = await fs.readdir(folderPath, { recursive: true });
      for (const file of files) {
        if (typeof file === 'string' && file.toLowerCase().endsWith('.iam')) {
          return file;
        }
      }
      return null;
    } catch (error) {
      console.error('Error detecting assembly file:', error.message);
      return null;
    }
  }

  static async cleanupPath(filePath) {
    try {
      await fs.rm(filePath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Cleanup failed for ${filePath}:`, error.message);
    }
  }
}

module.exports = FileUtils;
