/*
Autodesk Design Automation API (DAA) Script
This script automates the process of extracting joints and constraints from Inventor models using Autodesk's cloud services.
Key steps:
1. Authentication with Forge API
2. OSS Bucket operations
3. AppBundle registration and upload
4. Activity configuration
5. Workitem submission and processing
6. Result retrieval
*/

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const JSZip = require('jszip');
const { v4: uuidv4 } = require('uuid');

// =========================================
// GLOBAL CONSTANTS
// =========================================
const ENGINE = "Autodesk.Inventor+2026";  // Design Automation engine version
const APPBUNDLE_ZIP = "InventorThumbnailAddin.bundle.zip";  // AppBundle zip file name
const RESPONSES_FOLDER = "responses";  // Folder to store API responses
const FOLDER_PATH = "upload";  // Folder containing input files

// Forge API credentials
const CLIENT_ID = "kARf5BOK9ACxCqGUpWqM18p2OnlzxyGlgCm9AIrLOY1WXrvI";
const CLIENT_SECRET = "CGG9rHGA27ckzmxPAKDUYbv0c8hFU4igSpSU0at4tEc69J1oXpDXHcC5OGRSwXCG";

// Dynamic bucket name with timestamp
const BUCKET_KEY = `bucket_${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 14)}`;
const POLICY_KEY = "transient";  // Bucket retention policy

// Design Automation identifiers
const NICKNAME = "daa";  // Developer nickname
const APPBUNDLE_ID = "joints_constraints_appbundle";  // AppBundle ID
const ACTIVITY_ID = "joints_constraints_activity";  // Activity ID
const ACTIVITY_ALIAS = "my_current_version";  // Activity version alias

// Ensure responses directory exists
if (!fs.existsSync(RESPONSES_FOLDER)) {
    fs.mkdirSync(RESPONSES_FOLDER, { recursive: true });
}

// =========================================
// UTILITY FUNCTIONS
// =========================================

async function saveResponseToFile(stepName, responseData) {
    /** Save API response to JSON file for debugging */
    const filePath = path.join(RESPONSES_FOLDER, `${stepName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(responseData, null, 4));
}

// =========================================
// AUTHENTICATION
// =========================================

async function getAccessToken() {
    /** Obtain Forge API access token using client credentials */
    const credentials = `${CLIENT_ID}:${CLIENT_SECRET}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    const authHeaders = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "Authorization": `Basic ${encodedCredentials}`
    };
    const authData = new URLSearchParams({
        "grant_type": "client_credentials",
        "scope": "data:write data:read bucket:create bucket:delete"
    });

    try {
        const response = await axios.post(
            "https://developer.api.autodesk.com/authentication/v2/token",
            authData.toString(),
            { headers: authHeaders }
        );
        await saveResponseToFile("01_get_access_token", response.data);
        return response.data.access_token;
    } catch (error) {
        console.error("Error getting access token:", error.response?.data || error.message);
        return null;
    }
}

// =========================================
// OSS BUCKET OPERATIONS
// =========================================

async function createBucket(accessToken) {
    /** Create OSS bucket for file storage */
    const headers = {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
    };
    const payload = {
        "bucketKey": BUCKET_KEY,
        "policyKey": POLICY_KEY,
        "access": "full"
    };

    try {
        const response = await axios.post(
            "https://developer.api.autodesk.com/oss/v2/buckets",
            payload,
            { headers }
        );
        await saveResponseToFile("02_create_bucket", response.data);
        return BUCKET_KEY;
    } catch (error) {
        if (error.response?.status === 409) {
            console.log("Bucket already exists, continuing with existing bucket");
            return BUCKET_KEY;
        }
        console.error("Error creating bucket:", error.response?.data || error.message);
        await saveResponseToFile("02_create_bucket_error", error.response?.data || {});
        return null;
    }
}

async function getSignedUrl(accessToken, fileName) {
    /** Generate signed URL for direct S3 upload */
    const url = `https://developer.api.autodesk.com/oss/v2/buckets/${BUCKET_KEY}/objects/${fileName}/signeds3upload?minutesExpiration=60`;
    const headers = { "Authorization": `Bearer ${accessToken}` };
    
    try {
        const response = await axios.get(url, { headers });
        await saveResponseToFile(`03_get_signed_url_${fileName}`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error getting signed URL for ${fileName}:`, error.response?.data || error.message);
        return null;
    }
}

async function finalizeUpload(accessToken, fileName, uploadKey) {
    /** Finalize S3 upload after file transfer */
    const url = `https://developer.api.autodesk.com/oss/v2/buckets/${BUCKET_KEY}/objects/${fileName}/signeds3upload`;
    const headers = {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
    };
    const payload = {
        "ossbucketKey": BUCKET_KEY,
        "ossSourceFileObjectKey": fileName,
        "access": "full",
        "uploadKey": uploadKey
    };

    try {
        const response = await axios.post(url, payload, { headers });
        await saveResponseToFile(`04_finalize_upload_${fileName}`, response.data);
        return true;
    } catch (error) {
        console.error(`Error finalizing upload for ${fileName}:`, error.response?.data || error.message);
        return false;
    }
}

// =========================================
// APPBUNDLE MANAGEMENT
// =========================================

async function uploadAppBundle(uploadParams, version = "unknown") {
    /** Upload AppBundle zip to Autodesk cloud */
    try {
        if (!uploadParams.formData || !uploadParams.endpointURL) {
            console.log("❌ Invalid upload_params structure. Dumping response:");
            console.log(JSON.stringify(uploadParams, null, 2));
            return false;
        }

        const form = uploadParams.formData;
        const endpointUrl = uploadParams.endpointURL;

        const formData = new FormData();
        for (const [key, value] of Object.entries(form)) {
            if (key !== "file") {
                formData.append(key, value);
            }
        }
        formData.append("file", fs.createReadStream(APPBUNDLE_ZIP));

        const response = await axios.post(endpointUrl, formData, {
            headers: formData.getHeaders()
        });

        if (response.status === 200) {
            console.log(`✅ AppBundle uploaded successfully for version ${version}.`);
            return true;
        } else {
            console.log(`❌ Failed to upload AppBundle: ${response.status}`);
            console.log("Response:", response.data);
            return false;
        }
    } catch (error) {
        console.log(`❌ Exception during AppBundle upload: ${error.message}`);
        return false;
    }
}

async function registerAppBundle(token) {
    /** Register new AppBundle or create version if exists */
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    const data = {
        "id": APPBUNDLE_ID,
        "engine": ENGINE,
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
            return null;
        }
    }
}

async function createNewAppBundleVersion(token) {
    /** Create new version of existing AppBundle */
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    const data = { "engine": ENGINE };

    try {
        const response = await axios.post(
            `https://developer.api.autodesk.com/da/us-east/v3/appbundles/${APPBUNDLE_ID}/versions`,
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

async function createAppBundleAlias(token, version) {
    /** Create/update alias pointing to specific AppBundle version */
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    const data = { "version": version, "id": "my_working_version" };
    const url = `https://developer.api.autodesk.com/da/us-east/v3/appbundles/${APPBUNDLE_ID}/aliases`;

    try {
        const response = await axios.post(url, data, { headers });

        if (response.status === 200) {
            console.log(`✅ AppBundle alias created for version ${version}`);
            return true;
        }
    } catch (error) {
        if (error.response?.status === 409) {
            // Update existing alias
            const updateUrl = `${url}/my_working_version`;
            try {
                const updateResponse = await axios.patch(updateUrl, { "version": version }, { headers });
                if (updateResponse.status === 200) {
                    console.log(`🔁 AppBundle alias updated to version ${version}`);
                    return true;
                } else {
                    console.log("❌ Failed to update AppBundle alias:", updateResponse.data);
                    return false;
                }
            } catch (updateError) {
                console.log("❌ Failed to update AppBundle alias:", updateError.response?.data || updateError.message);
                return false;
            }
        } else {
            console.log("❌ Alias creation failed:", error.response?.data || error.message);
            return false;
        }
    }
}

// =========================================
// ACTIVITY MANAGEMENT
// =========================================

async function createOrUpdateActivity(token) {
    /** Create new activity or update existing one */
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    // Command to launch Inventor with AppBundle
    const commandLine = "$(engine.path)\\InventorCoreConsole.exe /al \"$(appbundles[joints_constraints_appbundle].path)\"";

    const data = {
        "id": ACTIVITY_ID,
        "commandLine": commandLine,
        "parameters": {
            "inputZip": {
                "zip": true,
                "localName": "upload",
                "verb": "get",
                "required": true
            },
            "resultZip": {
                "zip": false,
                "localName": "Output.zip",
                "verb": "put",
                "required": true
            }
        },
        "engine": ENGINE,
        "appbundles": [`${NICKNAME}.${APPBUNDLE_ID}+my_working_version`],
        "description": "Extracts joints and constraints from Inventor models"
    };

    try {
        const response = await axios.post(
            "https://developer.api.autodesk.com/da/us-east/v3/activities",
            data,
            { headers }
        );

        if (response.status === 200) {
            console.log("✅ Activity created.");
            const version = response.data.version || 1;
            await createActivityAlias(token, version);
            return true;
        }
    } catch (error) {
        if (error.response?.status === 409) {
            console.log("ℹ️ Activity exists. Creating new version...");
            return createActivityVersion(token);
        } else {
            console.log("❌ Failed to create activity:", error.response?.data || error.message);
            return false;
        }
    }
}

async function createActivityVersion(token) {
    /** Create new version of existing activity */
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    const data = {
        "commandLine": "$(engine.path)\\InventorCoreConsole.exe /al \"$(appbundles[joints_constraints_appbundle].path)\"",
        "parameters": {
            "inputZip": {
                "zip": true,
                "localName": "upload",
                "verb": "get",
                "required": true
            },
            "resultZip": {
                "zip": false,
                "localName": "Output.zip",
                "verb": "put",
                "required": true
            }
        },
        "engine": ENGINE,
        "appbundles": [`${NICKNAME}.${APPBUNDLE_ID}+my_working_version`],
        "description": "Updated version of activity"
    };

    try {
        const response = await axios.post(
            `https://developer.api.autodesk.com/da/us-east/v3/activities/${ACTIVITY_ID}/versions`,
            data,
            { headers }
        );

        if (response.status === 200) {
            const version = response.data.version || 1;
            console.log(`✅ Activity version ${version} created.`);
            await createActivityAlias(token, version);
            return true;
        } else {
            console.log("❌ Failed to create new activity version:", response.data);
            return false;
        }
    } catch (error) {
        console.log("❌ Failed to create new activity version:", error.response?.data || error.message);
        return false;
    }
}

async function createActivityAlias(token, version) {
    /** Create/update alias for specific activity version */
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    const data = { "version": version, "id": ACTIVITY_ALIAS };
    const url = `https://developer.api.autodesk.com/da/us-east/v3/activities/${ACTIVITY_ID}/aliases`;

    try {
        const response = await axios.post(url, data, { headers });

        if (response.status === 200) {
            console.log(`✅ Activity alias created for version ${version}`);
            return true;
        }
    } catch (error) {
        if (error.response?.status === 409) {
            // Update existing alias
            const updateUrl = `${url}/${ACTIVITY_ALIAS}`;
            try {
                const updateResponse = await axios.patch(updateUrl, { "version": version }, { headers });
                if (updateResponse.status === 200) {
                    console.log(`🔁 Activity alias updated to version ${version}`);
                    return true;
                } else {
                    console.log("❌ Failed to update activity alias:", updateResponse.data);
                    return false;
                }
            } catch (updateError) {
                console.log("❌ Failed to update activity alias:", updateError.response?.data || updateError.message);
                return false;
            }
        } else {
            console.log("❌ Failed to create activity alias:", error.response?.data || error.message);
            return false;
        }
    }
}

// =========================================
// WORKITEM OPERATIONS
// =========================================

async function zipFolder(folderPath, outputZipPath) {
    /** Compress folder to zip file */
    const zip = new JSZip();
    const files = await getAllFiles(folderPath);
    
    for (const file of files) {
        const relativePath = path.relative(folderPath, file);
        const fileData = fs.readFileSync(file);
        zip.file(relativePath, fileData);
    }
    
    const content = await zip.generateAsync({ type: "nodebuffer" });
    fs.writeFileSync(outputZipPath, content);
}

async function getAllFiles(dirPath, arrayOfFiles = []) {
    /** Recursively get all files in directory */
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            await getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    }

    return arrayOfFiles;
}

async function uploadToOSS(accessToken, objectKey, filePath) {
    /** Upload file to OSS using signed URL */
    const signedData = await getSignedUrl(accessToken, objectKey);
    if (!signedData) {
        console.log("❌ Failed to get signed upload URL");
        return false;
    }

    const uploadKey = signedData.uploadKey;
    const signedUrl = signedData.urls[0];

    try {
        const fileData = fs.readFileSync(filePath);
        const response = await axios.put(signedUrl, fileData, {
            headers: { "Content-Type": "application/octet-stream" }
        });

        if (response.status !== 200 && response.status !== 204) {
            console.log("❌ Upload failed:", response.data);
            return false;
        }

        return await finalizeUpload(accessToken, objectKey, uploadKey);
    } catch (error) {
        console.log("❌ Upload failed:", error.message);
        return false;
    }
}

async function prepareAndUploadZips(accessToken) {
    /** Prepare input/output zips and upload to OSS */
    // Create output folder structure
    const outputFolder = "Output";
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
    }
    const outputZipPath = "Output.zip";
    await zipFolder(outputFolder, outputZipPath);

    // Compress input folder
    const inputZipPath = "input.zip";
    await zipFolder(FOLDER_PATH, inputZipPath);

    // Upload both zips
    const inputKey = "input.zip";
    const resultKey = "Output.zip";

    const uploadedInput = await uploadToOSS(accessToken, inputKey, inputZipPath);
    const uploadedResult = await uploadToOSS(accessToken, resultKey, outputZipPath);

    if (uploadedInput && uploadedResult) {
        console.log("✅ Both ZIP files uploaded successfully.");
        return { inputKey, resultKey };
    } else {
        console.log("❌ One or more ZIP uploads failed.");
        return { inputKey: null, resultKey: null };
    }
}

async function submitWorkItemWithZips(accessToken, inputKey, resultKey) {
    /** Submit workitem for processing with input/output references */
    const headers = {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
    };

    const payload = {
        "activityId": `${NICKNAME}.${ACTIVITY_ID}+${ACTIVITY_ALIAS}`,
        "arguments": {
            "inputZip": {
                "url": `urn:adsk.objects:os.object:${BUCKET_KEY}/${inputKey}`,
                "verb": "get",
                "headers": {
                    "Authorization": `Bearer ${accessToken}`
                },
                "localName": "upload"
            },
            "resultZip": {
                "url": `urn:adsk.objects:os.object:${BUCKET_KEY}/${resultKey}`,
                "verb": "put",
                "headers": {
                    "Authorization": `Bearer ${accessToken}`
                },
                "localName": "Output.zip"
            }
        }
    };

    try {
        const response = await axios.post(
            "https://developer.api.autodesk.com/da/us-east/v3/workitems",
            payload,
            { headers }
        );

        if (response.status === 200) {
            const workItemId = response.data.id;
            console.log(`✅ Workitem submitted! ID: ${workItemId}`);
            await saveResponseToFile("12_submit_workitem", response.data);
            return workItemId;
        } else {
            console.log("❌ Failed to submit workitem:", response.data);
            await saveResponseToFile("12_submit_workitem_error", response.data);
            return null;
        }
    } catch (error) {
        console.log("❌ Failed to submit workitem:", error.response?.data || error.message);
        await saveResponseToFile("12_submit_workitem_error", error.response?.data || {});
        return null;
    }
}

async function checkWorkItemStatus(accessToken, workItemId) {
    /** Poll workitem status until completion or timeout */
    const headers = { "Authorization": `Bearer ${accessToken}` };
    const url = `https://developer.api.autodesk.com/da/us-east/v3/workitems/${workItemId}`;
    const startTime = Date.now();
    const timeout = 120000;  // Milliseconds

    while (true) {
        if (Date.now() - startTime > timeout) {
            console.log("Timeout");
            break;
        }

        try {
            const response = await axios.get(url, { headers });
            const data = response.data;
            await saveResponseToFile("13_workitem_status", data);

            const status = data.status;
            console.log(`WorkItem status: ${status}`);

            if (status === "success") {
                console.log("WorkItem completed successfully.");
                return data;
            }

            await new Promise(resolve => setTimeout(resolve, 30000));
        } catch (error) {
            console.log("Error checking workitem status:", error.message);
            return null;
        }
    }
}

// =========================================
// RESULT HANDLING
// =========================================

async function getSignedDownloadUrl(accessToken, objectKey) {
    /** Generate signed URL for downloading result file */
    const headers = { 
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
    };
    const url = `https://developer.api.autodesk.com/oss/v2/buckets/${BUCKET_KEY}/objects/${objectKey}/signeds3download`;
    
    try {
        const response = await axios.get(url, { headers });
        const data = response.data;
        await saveResponseToFile(`14_signed_download_url_${objectKey}`, data);
        if (data.url) {
            return data.url;
        } else {
            console.log(`❌ Could not get signed download URL for ${objectKey}:`, data);
            return null;
        }
    } catch (error) {
        console.log(`❌ Error getting signed download URL for ${objectKey}:`, error.response?.data || error.message);
        return null;
    }
}

async function downloadFile(url, outPath) {
    /** Download file from URL to local path */
    try {
        const response = await axios.get(url, { responseType: "stream" });
        const writer = fs.createWriteStream(outPath);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on("finish", () => {
                console.log(`Downloaded ${outPath}`);
                resolve(true);
            });
            writer.on("error", reject);
        });
    } catch (error) {
        console.log(`❌ Error downloading file from ${url}:`, error.message);
        return false;
    }
}

// =========================================
// MAIN EXECUTION FLOW
// =========================================

async function main() {
    console.log("=".repeat(50));
    console.log("STARTING AUTODESK DESIGN AUTOMATION WORKFLOW");
    console.log("=".repeat(50));
    
    // 1. Authentication
    console.log("\n🔐 STEP 1: AUTHENTICATING WITH FORGE API...");
    const token = await getAccessToken();
    if (!token) {
        console.log("❌ ERROR: Could not obtain access token. Exiting.");
        process.exit(1);
    }
    console.log("✅ Authentication successful!");

    // 2. Create OSS Bucket
    console.log("\n🪣 STEP 2: CREATING CLOUD STORAGE BUCKET...");
    const bucketName = await createBucket(token);
    if (bucketName) {
        console.log(`✅ Bucket created: ${bucketName}`);
    } else {
        console.log("❌ ERROR: Bucket creation failed. Continuing with existing bucket if possible.");
    }

    // 3. AppBundle Setup
    console.log("\n📦 STEP 3: SETTING UP APPBUNDLE...");
    const bundle = await registerAppBundle(token);
    if (bundle && bundle.uploadParameters) {
        const version = bundle.version || 1;
        console.log(`ℹ️ AppBundle version: ${version}`);
        if (await uploadAppBundle(bundle.uploadParameters, version)) {
            await createAppBundleAlias(token, version);
            console.log("✅ AppBundle setup complete!");
        } else {
            console.log("⚠️ Warning: AppBundle upload failed. Using existing version if available.");
        }
    } else {
        console.log("❌ ERROR: AppBundle registration failed.");
    }

    // 4. Activity Setup
    console.log("\n⚙️ STEP 4: CONFIGURING ACTIVITY...");
    await createOrUpdateActivity(token);
    console.log("✅ Activity configured!");

    // 5. Prepare and upload input/output zips
    console.log("\n📤 STEP 5: PREPARING & UPLOADING FILES...");
    console.log(`ℹ️ Zipping input folder: ${FOLDER_PATH}`);
    const { inputKey, resultKey } = await prepareAndUploadZips(token);
    
    if (inputKey && resultKey) {
        console.log(`✅ Files uploaded: Input=${inputKey}, Output=${resultKey}`);
    } else {
        console.log("❌ ERROR: File upload failed. Exiting workflow.");
        process.exit(1);
    }

    // 6. Submit and monitor workitem
    console.log("\n🚀 STEP 6: SUBMITTING WORKITEM...");
    const workItemId = await submitWorkItemWithZips(token, inputKey, resultKey);
    
    if (workItemId) {
        console.log(`ℹ️ Workitem ID: ${workItemId}`);
        console.log("\n⏳ STEP 7: MONITORING WORKITEM STATUS...");
        const workItemResult = await checkWorkItemStatus(token, workItemId);
        
        // 7. Download results if successful
        if (workItemResult?.status === "success") {
            console.log("\n📥 STEP 8: DOWNLOADING RESULTS...");
            const url = await getSignedDownloadUrl(token, "Output.zip");
            if (url) {
                await downloadFile(url, "Output.zip");
                console.log("✅ Successfully downloaded results (Output.zip)");
                console.log("\n" + "=".repeat(50));
                console.log("WORKFLOW COMPLETED SUCCESSFULLY!");
                console.log("=".repeat(50));
            } else {
                console.log("❌ ERROR: Could not get download URL for results.");
            }
        } else {
            console.log("\n" + "=".repeat(50));
            console.log("WORKFLOW COMPLETED WITH NO OUTPUT");
            console.log("=".repeat(50));
            console.log("End........No Output.");
        }
    } else {
        console.log("❌ ERROR: Workitem submission failed. Exiting workflow.");
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error in main execution:", err);
    process.exit(1);
});