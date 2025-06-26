const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
// const { v4: uuidv4 } = require('uuid');
const JSZip = require('jszip');
// const FormData = require('form-data');
const CONFIG = require('../config/config');

class DesignAutomationService {
	constructor(accessToken, bucketKey) {
		this.accessToken = accessToken;
		this.bucketKey = bucketKey;
		this.engine = "Autodesk.Inventor+2026";
		this.appBundleId = "joints_constraints_appbundle";
		this.activityId = "joints_constraints_activity";
		this.activityAlias = "my_current_version";
		this.appBundleZipPath = path.join(__dirname, 'daa', 'InventorThumbnailAddin.bundle.zip');
	}

	async extractJointsAndConstraints(assemblyFile, folderPath) {
		try {
			// 1. Register the app bundle if not already registered
			const bundle = await registerAppBundle();
		}
		catch (error) {
			console.log('Error extracting joints and constraints:', error);
		}
	}

	async registerAppBundle() {
		const headers = {
			"Authorization": `Bearer ${this.accessToken}`,
			"Content-Type": "application/json"
		};
		const data = {
			"id": this.appBundleId,
			"engine": this.engine,
			"description": "Extract joints and constraints"
		};

		try {
			const response = await axios.post(
				"https://developer.api.autodesk.com/da/us-east/v3/appbundles",
				data,
				{ headers }
			);
			if (response.data.uploadParameters) {
				console.log("✅ AppBundle registered (new).");
				return response.data;
			}
		} catch (error) {
			if (error.response?.status === 409) {
				console.log("ℹ️ AppBundle exists. Creating new version...");
				return createNewAppBundleVersion(token);
			} else {
				console.log("❌ Failed to register AppBundle:", error.response?.data || error.message);
				throw new Error("❌Failed to register AppBundle");
			}
		}
	}

	async createNewAppBundleVersion() {
		const headers = {
			"Authorization": `Bearer ${this.accessToken}`,
			"Content-Type": "application/json"
		};
		const data = { "engine": this.engine };

		try {
			const response = await axios.post(
				`https://developer.api.autodesk.com/da/us-east/v3/appbundles/${this.appBundleId}/versions`,
				data,
				{ headers }
			);
			
			if (response.data.uploadParameters) {
				console.log("✅ New AppBundle version created.");
				return response.data;
			} else {
				console.log("❌ Failed to create AppBundle version:", response.data);
				return null;
			}
		} catch (error) {
			console.log("❌ Failed to create AppBundle version:", error.response?.data || error.message);
			return null;
		}
	}
}

module.exports = DesignAutomationService;