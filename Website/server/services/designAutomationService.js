const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const CONFIG = require('../config/config');
const SessionManager = require('./sessionService');

class DesignAutomationService {
  constructor() {
    this.baseURL = 'https://developer.api.autodesk.com/da/us-east/v3';
    this.engine = CONFIG.DESIGN_AUTOMATION.ENGINE;
    this.nickname = CONFIG.DESIGN_AUTOMATION.NICKNAME;
    this.appBundleId = CONFIG.DESIGN_AUTOMATION.APPBUNDLE_ID;
    this.activityId = CONFIG.DESIGN_AUTOMATION.ACTIVITY_ID;
    this.activityAlias = CONFIG.DESIGN_AUTOMATION.ACTIVITY_ALIAS;
  }

  /**
   * Initialize the DAA environment (AppBundle + Activity)
   * @param {string} accessToken - Forge access token
   */
  async initializeEnvironment(accessToken, sessionId) {
    try {
      // 1. Upload/update AppBundle
      const appBundlePath = path.join(__dirname,'daa','InventorThumbnailAddin.bundle.zip');
      const appBundle = await this._registerAppBundle(accessToken, appBundlePath);
      
      // 2. Create alias
      await this._createAppBundleAlias(accessToken, appBundle.version || 1);
      
      // 3. Create Activity
      const activity = await this._createActivity(accessToken);
      
      // 4. Create Activity alias
      await this._createActivityAlias(accessToken, activity.version || 1);
      
      return true;
    } catch (error) {
      console.error('DAA initialization failed:', error);
      throw new Error(`Failed to initialize DAA environment: ${error.message}`);
    }
  }

  /**
   * Extract joints and constraints from an assembly
   * @param {string} accessToken - Forge access token
   * @param {string} bucketKey - OSS bucket key
   * @param {string} assemblyFile - Assembly file name
   * @param {function} progressCallback - Progress callback
   */
  async extractJoints(accessToken, bucketKey, assemblyFile, progressCallback) {
    try {
      // 1. Submit workitem
      if (progressCallback) progressCallback('Submitting extraction job');
      const workitemId = await this._submitWorkitem(
        accessToken, 
        bucketKey, 
        assemblyFile
      );

      // 2. Monitor execution
      if (progressCallback) progressCallback('Processing assembly');
      const result = await this._waitForWorkitemCompletion(
        accessToken,
        workitemId,
        (status, stats) => {
          if (progressCallback) progressCallback(`${status} (${stats || ''})`);
        }
      );

      if (result.status !== 'success') {
        throw new Error(result.stats || 'Extraction failed');
      }

      // 3. Download results
      if (progressCallback) progressCallback('Retrieving results');
      const tempPath = path.join(__dirname, '../../temp', `${workitemId}_output.json`);
      await this._downloadResult(accessToken, bucketKey, 'output.json', tempPath);
      
      return JSON.parse(await fs.readFile(tempPath, 'utf8'));
      
    } catch (error) {
      console.error('Joints extraction failed:', error);
      throw new Error(`Joints extraction failed: ${error.message}`);
    }
  }

  // ================ PRIVATE METHODS ================ //

  async _registerAppBundle(accessToken, appBundlePath) {
    try {
      const response = await axios.post(
        `${this.baseURL}/appbundles`,
        {
          id: this.appBundleId,
          engine: this.engine,
          description: "Extract joints and constraints"
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Upload if needed
      if (response.data.uploadParameters) {
        const form = new FormData();
        const uploadParams = response.data.uploadParameters.formData;
        
        Object.entries(uploadParams).forEach(([key, value]) => {
          if (key !== 'file') form.append(key, value);
        });
        
        form.append('file', fs.createReadStream(appBundlePath));
        
        await axios.post(
          response.data.uploadParameters.endpointURL, 
          form, 
          { headers: form.getHeaders() }
        );
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        return this._createAppBundleVersion(accessToken, appBundlePath);
      }
      throw error;
    }
  }

  async _createAppBundleVersion(accessToken, appBundlePath) {
    const response = await axios.post(
      `${this.baseURL}/appbundles/${this.appBundleId}/versions`,
      { engine: this.engine },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.uploadParameters) {
      const form = new FormData();
      const uploadParams = response.data.uploadParameters.formData;
      
      Object.entries(uploadParams).forEach(([key, value]) => {
        if (key !== 'file') form.append(key, value);
      });
      
      form.append('file', fs.createReadStream(appBundlePath));
      
      await axios.post(
        response.data.uploadParameters.endpointURL, 
        form, 
        { headers: form.getHeaders() }
      );
    }

    return response.data;
  }

  async _createAppBundleAlias(accessToken, version) {
    try {
      await axios.post(
        `${this.baseURL}/appbundles/${this.appBundleId}/aliases`,
        { id: 'my_working_version', version },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
    } catch (error) {
      if (error.response?.status === 409) {
        await axios.patch(
          `${this.baseURL}/appbundles/${this.appBundleId}/aliases/my_working_version`,
          { version },
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
      } else {
        throw error;
      }
    }
  }

  async _createActivity(accessToken) {
    const commandLine = [
      `$(engine.path)\\InventorCoreConsole.exe`,
      `/al "$(appbundles[${this.appBundleId}].path)"`,
      `/i "$(args[inputFile].path)"`,
      `/o "$(args[outputJson].path)"`
    ].join(' ');

    try {
      const response = await axios.post(
        `${this.baseURL}/activities`,
        {
          id: this.activityId,
          engine: this.engine,
          commandLine,
          parameters: {
            inputFile: {
              verb: 'get',
              description: 'Input assembly file',
              required: true,
              localName: 'input.iam'
            },
            outputJson: {
              verb: 'put',
              description: 'Output JSON with joints/constraints',
              required: true,
              localName: 'output.json'
            }
          },
          appbundles: [`${this.nickname}.${this.appBundleId}+my_working_version`]
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        return this._createActivityVersion(accessToken);
      }
      throw error;
    }
  }

  async _createActivityVersion(accessToken) {
    const response = await axios.post(
      `${this.baseURL}/activities/${this.activityId}/versions`,
      {
        engine: this.engine,
        commandLine: `$(engine.path)\\InventorCoreConsole.exe /al "$(appbundles[${this.appBundleId}].path)" /i "$(args[inputFile].path)" /o "$(args[outputJson].path)"`,
        parameters: {
          inputFile: {
            verb: 'get',
            description: 'Input assembly file',
            required: true,
            localName: 'input.iam'
          },
          outputJson: {
            verb: 'put',
            description: 'Output JSON with joints/constraints',
            required: true,
            localName: 'output.json'
          }
        },
        appbundles: [`${this.nickname}.${this.appBundleId}+my_working_version`]
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  async _createActivityAlias(accessToken, version) {
    try {
      await axios.post(
        `${this.baseURL}/activities/${this.activityId}/aliases`,
        { id: this.activityAlias, version },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
    } catch (error) {
      if (error.response?.status === 409) {
        await axios.patch(
          `${this.baseURL}/activities/${this.activityId}/aliases/${this.activityAlias}`,
          { version },
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
      } else {
        throw error;
      }
    }
  }

  async _submitWorkitem(accessToken, bucketKey, assemblyFile) {
    const response = await axios.post(
      `${this.baseURL}/workitems`,
      {
        activityId: `${this.nickname}.${this.activityId}+${this.activityAlias}`,
        arguments: {
          inputFile: {
            url: `urn:adsk.objects:os.object:${bucketKey}/${assemblyFile}`,
            headers: { Authorization: `Bearer ${accessToken}` }
          },
          outputJson: {
            url: `urn:adsk.objects:os.object:${bucketKey}/output.json`,
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.id;
  }

  async _waitForWorkitemCompletion(accessToken, workitemId, progressCallback) {
    const startTime = Date.now();
    const timeout = CONFIG.DESIGN_AUTOMATION.WORKITEM_TIMEOUT_MINUTES * 60 * 1000;
    
    while (Date.now() - startTime < timeout) {
      const response = await axios.get(
        `${this.baseURL}/workitems/${workitemId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      
      const status = response.data.status;
      if (progressCallback) progressCallback(status, response.data.stats);
      
      if (status === 'success' || status === 'failed') {
        return response.data;
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 sec interval
    }
    
    throw new Error(`Workitem timed out after ${CONFIG.DESIGN_AUTOMATION.WORKITEM_TIMEOUT_MINUTES} minutes`);
  }

  async _downloadResult(accessToken, bucketKey, objectKey, outputPath) {
    // Get signed download URL
    const signedUrlResponse = await axios.get(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${objectKey}/signeds3download`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    
    // Download the file
    const response = await axios.get(signedUrlResponse.data.url, { responseType: 'stream' });
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }
}

module.exports = DesignAutomationService;