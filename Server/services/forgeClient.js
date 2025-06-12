// services/forgeClient.js
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const FileUtils = require('./fileUtils');
const { TRANSLATION_TIMEOUT_MINUTES, TRANSLATION_CHECK_INTERVAL } = require('../config');

class ForgeClient {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseURL = 'https://developer.api.autodesk.com';
  }

  base64EncodeUrn(urn) {
    return Buffer.from(urn).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  async getAccessToken(responsePath = null, scopes = ['data:write', 'data:read', 'bucket:create', 'bucket:delete']) {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    try {
      const res = await axios.post(`${this.baseURL}/authentication/v2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: scopes.join(' ')
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'Authorization': `Basic ${credentials}`
          },
          timeout: 30000
        });

      if (responsePath) {
        await FileUtils.saveResponseToFile(responsePath, '01_get_access_token', res.data);
      }

      return res.data.access_token;
    } catch (err) {
      const msg = err.response?.data?.error_description || err.message;
      throw new Error(`Access token error: ${msg}`);
    }
  }

  async createBucket(accessToken, bucketKey, responsePath) {
    try {
      const res = await axios.post(`${this.baseURL}/oss/v2/buckets`, {
        bucketKey,
        policyKey: 'transient',
        access: 'full'
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      await FileUtils.saveResponseToFile(responsePath, '02_create_bucket', { success: true });
      return true;
    } catch (err) {
      if (err.response?.status === 409) {
        await FileUtils.saveResponseToFile(responsePath, '02_create_bucket', { success: true, existed: true });
        return true;
      }
      throw new Error(`Bucket creation failed: ${err.response?.data?.reason || err.message}`);
    }
  }

  async uploadAllFiles(accessToken, bucketKey, folderPath, responsePath, updateProgress) {
    const files = [];
    const walkDir = async dir => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walkDir(full);
        } else {
          files.push({ name: entry.name, path: full, relative: path.relative(folderPath, full) });
        }
      }
    };

    await walkDir(folderPath);

    let uploaded = 0;
    for (const file of files) {
      await this.uploadSingleFile(accessToken, bucketKey, file, responsePath);
      uploaded++;
      if (updateProgress) updateProgress(`Uploaded ${uploaded}/${files.length} files`);
    }
  }

  async uploadSingleFile(accessToken, bucketKey, file, responsePath) {
    const encodedFileName = encodeURIComponent(file.name);
    const signedRes = await axios.get(`${this.baseURL}/oss/v2/buckets/${bucketKey}/objects/${encodedFileName}/signeds3upload?minutesExpiration=60`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30000
    });

    const { urls: [signedUrl], uploadKey } = signedRes.data;

    const fileData = await fs.readFile(file.path);
    await axios.put(signedUrl, fileData, {
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 120000
    });

    await axios.post(`${this.baseURL}/oss/v2/buckets/${bucketKey}/objects/${file.name}/signeds3upload`, {
      ossbucketKey: bucketKey,
      ossSourceFileObjectKey: file.name,
      access: 'full',
      uploadKey
    }, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });
  }

  async linkReferences(accessToken, bucketKey, assemblyFile, folderPath, responsePath) {
    const assemblyUrn = `urn:adsk.objects:os.object:${bucketKey}/${assemblyFile}`;
    const encodedUrn = this.base64EncodeUrn(assemblyUrn);
    const files = await fs.readdir(folderPath, { recursive: true });

    const references = files
      .filter(f => typeof f === 'string' && f.toLowerCase().endsWith('.ipt'))
      .map(f => ({
        urn: `urn:adsk.objects:os.object:${bucketKey}/${path.basename(f)}`,
        relativePath: path.relative(folderPath, path.join(folderPath, f)).replace(/\\/g, '/'),
        filename: path.basename(f)
      }));

    await axios.post(`${this.baseURL}/modelderivative/v2/designdata/${encodedUrn}/references`, {
      urn: assemblyUrn,
      filename: assemblyFile,
      references
    }, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      timeout: 60000
    });

    await FileUtils.saveResponseToFile(responsePath, '05_link_references', { success: true, referencesCount: references.length });
    return true;
  }

  async startTranslationJob(accessToken, bucketKey, assemblyFile, responsePath) {
    const urn = `urn:adsk.objects:os.object:${bucketKey}/${assemblyFile}`;
    const encodedUrn = this.base64EncodeUrn(urn);

    const res = await axios.post(`${this.baseURL}/modelderivative/v2/designdata/job`, {
      input: { urn: encodedUrn, checkReferences: true },
      output: {
        formats: [{ type: 'svf2', views: ['2d', '3d'] }]
      }
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-ads-force': 'true'
      },
      timeout: 60000
    });

    await FileUtils.saveResponseToFile(responsePath, '06_start_translation_job', res.data);
    return encodedUrn;
  }

  async checkTranslationStatus(accessToken, encodedUrn, responsePath, updateProgress) {
    const maxTries = Math.floor((TRANSLATION_TIMEOUT_MINUTES * 60 * 1000) / TRANSLATION_CHECK_INTERVAL);

    for (let i = 0; i < maxTries; i++) {
      const res = await axios.get(`${this.baseURL}/modelderivative/v2/designdata/${encodedUrn}/manifest`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 30000
      });

      const { status, progress } = res.data;
      if (updateProgress) updateProgress(`Translation ${status} - ${progress || '0%'}`);

      if (status === 'success') {
        await FileUtils.saveResponseToFile(responsePath, '07_translation_status', { status, progress });
        return true;
      }

      if (['failed', 'timeout'].includes(status)) {
        const errorMsg = res.data.messages?.map(m => m.message).join('; ') || `Translation ${status}`;
        throw new Error(errorMsg);
      }

      await new Promise(res => setTimeout(res, TRANSLATION_CHECK_INTERVAL));
    }

    throw new Error(`Translation timeout after ${TRANSLATION_TIMEOUT_MINUTES} minutes`);
  }

  async getMetadata(accessToken, encodedUrn, responsePath) {
    const res = await axios.get(`${this.baseURL}/modelderivative/v2/designdata/${encodedUrn}/metadata`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30000
    });

    await FileUtils.saveResponseToFile(responsePath, '08_metadata', res.data);

    if (res.data.data?.metadata?.length > 0) {
      return res.data.data.metadata[0].guid;
    }

    throw new Error('No viewable files found');
  }

  async getObjectHierarchy(accessToken, encodedUrn, guid, responsePath) {
    for (let i = 0; i < 5; i++) {
      try {
        const res = await axios.get(`${this.baseURL}/modelderivative/v2/designdata/${encodedUrn}/metadata/${guid}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 30000
        });

        if (res.data.data) {
          await FileUtils.saveResponseToFile(responsePath, '09_object_hierarchy', res.data);
          return res.data;
        }
      } catch (_) {
        await new Promise(res => setTimeout(res, 5000));
      }
    }

    throw new Error('Failed to retrieve object hierarchy');
  }

  async getProperties(accessToken, encodedUrn, guid, responsePath) {
    for (let i = 0; i < 5; i++) {
      try {
        const res = await axios.get(`${this.baseURL}/modelderivative/v2/designdata/${encodedUrn}/metadata/${guid}/properties`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 30000
        });

        if (res.data.data) {
          await FileUtils.saveResponseToFile(responsePath, '10_properties_all_objects', res.data);
          return res.data;
        }
      } catch (_) {
        await new Promise(res => setTimeout(res, 5000));
      }
    }

    throw new Error('Failed to retrieve object properties');
  }
}

module.exports = ForgeClient;
