const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');

const app = express();
const port = process.env.PORT || 3000;

// Configure storage for uploaded ZIP files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Create necessary directories
['uploads', 'responses'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint to handle processing requests
app.post('/process', upload.single('zipfile'), async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Client ID and Secret are required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'ZIP file is required' });
    }

    const zipPath = req.file.path;
    const sessionId = uuidv4();

    // Create session directories
    const sessionFolder = `session_${sessionId}`;
    const uploadPath = path.join('uploads', sessionFolder);
    const responsePath = path.join('responses', sessionFolder);
    fs.mkdirSync(uploadPath, { recursive: true });
    fs.mkdirSync(responsePath, { recursive: true });

    // Unzip files
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(uploadPath, true);

    // Process files
    const result = await processFiles(clientId, clientSecret, uploadPath, responsePath);
    res.json({
      success: true,
      message: 'Processing completed successfully',
      sessionId,
      bucketKey: result.bucketKey,
      assemblyFile: result.assemblyFile,
      encodedUrn: result.encodedUrn
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || error.stack 
    });
  } finally {
    // Clean up uploaded ZIP file
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Server is healthy');
});

// Helper function to save API responses
function saveResponseToFile(responsePath, stepName, data) {
  const filePath = path.join(responsePath, `${stepName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Base64 encode URN helper
function base64EncodeUrn(urn) {
  return Buffer.from(urn).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Forge API functions
async function getAccessToken(clientId, clientSecret, responsePath) {
  const credentials = `${clientId}:${clientSecret}`;
  const encodedCredentials = Buffer.from(credentials).toString('base64');
  
  try {
    const response = await axios.post(
      'https://developer.api.autodesk.com/authentication/v2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'data:write data:read bucket:create bucket:delete'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${encodedCredentials}`
        }
      }
    );

    saveResponseToFile(responsePath, '01_get_access_token', response.data);
    return response.data.access_token;
  } catch (error) {
    throw new Error(`Access token error: ${error.response?.data || error.message}`);
  }
}

async function createBucket(accessToken, bucketKey, responsePath) {
  try {
    const response = await axios.post(
      'https://developer.api.autodesk.com/oss/v2/buckets',
      {
        bucketKey,
        policyKey: 'transient',
        access: 'full'
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    saveResponseToFile(responsePath, '02_create_bucket', response.data);
    return true;
  } catch (error) {
    if (error.response?.status === 409) { // Bucket already exists
      return true;
    }
    throw new Error(`Bucket creation failed: ${error.response?.data || error.message}`);
  }
}

async function getSignedUrl(accessToken, bucketKey, fileName, responsePath) {
  try {
    const encodedFileName = encodeURIComponent(fileName);
    const url = `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${encodedFileName}/signeds3upload?minutesExpiration=60`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    saveResponseToFile(responsePath, `03_get_signed_url_${fileName}`, response.data);
    return {
      signedUrl: response.data.urls[0],
      uploadKey: response.data.uploadKey
    };
  } catch (error) {
    throw new Error(`Signed URL failed for ${fileName}: ${error.response?.data || error.message}`);
  }
}

async function uploadFileToS3(signedUrl, filePath) {
  try {
    const fileData = fs.readFileSync(filePath);
    const response = await axios.put(signedUrl, fileData, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });
    return response.status === 200;
  } catch (error) {
    throw new Error(`S3 upload failed for ${filePath}: ${error.message}`);
  }
}

async function finalizeUpload(accessToken, bucketKey, fileName, uploadKey, responsePath) {
  try {
    const url = `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${fileName}/signeds3upload`;
    
    const response = await axios.post(
      url,
      {
        ossbucketKey: bucketKey,
        ossSourceFileObjectKey: fileName,
        access: 'full',
        uploadKey
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    saveResponseToFile(responsePath, `04_finalize_upload_${fileName}`, response.data);
    return true;
  } catch (error) {
    throw new Error(`Finalize upload failed for ${fileName}: ${error.response?.data || error.message}`);
  }
}

async function uploadAllFiles(accessToken, bucketKey, folderPath, responsePath) {
  const files = [];
  
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else {
        files.push({
          name: entry.name,
          path: fullPath,
          relative: path.relative(folderPath, fullPath)
        });
      }
    }
  }

  walkDir(folderPath);

  for (const file of files) {
    try {
      const { signedUrl, uploadKey } = await getSignedUrl(
        accessToken, 
        bucketKey, 
        file.name, 
        responsePath
      );
      
      await uploadFileToS3(signedUrl, file.path);
      await finalizeUpload(
        accessToken, 
        bucketKey, 
        file.name, 
        uploadKey, 
        responsePath
      );
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error.message);
    }
  }
}

function detectAssemblyFile(folderPath) {
  const files = fs.readdirSync(folderPath, { recursive: true });
  for (const file of files) {
    if (typeof file === 'string' && file.toLowerCase().endsWith('.iam')) {
      return file;
    }
  }
  return null;
}

async function linkReferences(accessToken, bucketKey, assemblyFile, folderPath, responsePath) {
  try {
    const assemblyUrn = `urn:adsk.objects:os.object:${bucketKey}/${assemblyFile}`;
    const encodedUrn = base64EncodeUrn(assemblyUrn);
    
    const references = [];
    const files = fs.readdirSync(folderPath, { recursive: true });
    
    for (const file of files) {
      if (typeof file === 'string' && file.toLowerCase().endsWith('.ipt')) {
        const relPath = path.relative(folderPath, path.join(folderPath, file)).replace(/\\/g, '/');
        references.push({
          urn: `urn:adsk.objects:os.object:${bucketKey}/${path.basename(file)}`,
          relativePath: relPath,
          filename: path.basename(file)
        });
      }
    }

    const url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodedUrn}/references`;
    
    const response = await axios.post(
      url,
      {
        urn: assemblyUrn,
        filename: assemblyFile,
        references
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    saveResponseToFile(responsePath, '05_link_references', response.data);
    return true;
  } catch (error) {
    throw new Error(`Link references failed: ${error.response?.data || error.message}`);
  }
}

async function startTranslationJob(accessToken, bucketKey, assemblyFile, responsePath) {
  try {
    const assemblyUrn = `urn:adsk.objects:os.object:${bucketKey}/${assemblyFile}`;
    const encodedUrn = base64EncodeUrn(assemblyUrn);
    
    const url = "https://developer.api.autodesk.com/modelderivative/v2/designdata/job";
    
    const response = await axios.post(
      url,
      {
        input: {
          urn: encodedUrn,
          checkReferences: true
        },
        output: {
          formats: [
            {
              type: "svf2",
              views: ["2d", "3d"]
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-ads-force': 'true'
        }
      }
    );

    saveResponseToFile(responsePath, '06_start_translation_job', response.data);
    return encodedUrn;
  } catch (error) {
    throw new Error(`Translation job failed: ${error.response?.data || error.message}`);
  }
}

async function checkTranslationStatus(accessToken, encodedUrn, responsePath) {
  try {
    const url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodedUrn}/manifest`;
    
    for (let attempt = 0; attempt < 20; attempt++) {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      saveResponseToFile(responsePath, `07_translation_status_${attempt}`, response.data);
      
      const status = response.data.status;
      if (status === 'success') return true;
      if (status === 'failed' || status === 'timeout') {
        throw new Error(`Translation ${status}`);
      }
      
      // Wait 30 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    throw new Error('Translation timeout after 10 minutes');
  } catch (error) {
    throw new Error(`Translation status check failed: ${error.message}`);
  }
}

async function retrieveListOfViewableFiles(accessToken, encodedUrn, responsePath) {
  try {
    const url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodedUrn}/metadata`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    saveResponseToFile(responsePath, '08_metadata', response.data);
    
    if (response.data.data?.metadata?.length > 0) {
      return response.data.data.metadata[0].guid;
    }
    
    throw new Error('No viewable files found');
  } catch (error) {
    throw new Error(`Viewable files retrieval failed: ${error.response?.data || error.message}`);
  }
}

async function getObjectHierarchy(accessToken, encodedUrn, guidViewable, responsePath) {
  try {
    const url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodedUrn}/metadata/${guidViewable}`;
    
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      saveResponseToFile(responsePath, `09_object_hierarchy_${attempt}`, response.data);
      
      if (response.data.data) {
        return response.data;
      }
      
      // Wait 10 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    throw new Error('Object hierarchy extraction timeout');
  } catch (error) {
    throw new Error(`Object hierarchy failed: ${error.response?.data || error.message}`);
  }
}

async function retrievePropertiesAllObjects(accessToken, encodedUrn, guidViewable, responsePath) {
  try {
    const url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodedUrn}/metadata/${guidViewable}/properties`;
    
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      saveResponseToFile(responsePath, `10_properties_all_objects_${attempt}`, response.data);
      
      if (response.data.data) {
        return response.data;
      }
      
      // Wait 10 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    throw new Error('Properties extraction timeout');
  } catch (error) {
    throw new Error(`Properties retrieval failed: ${error.response?.data || error.message}`);
  }
}

// Main processing function
async function processFiles(clientId, clientSecret, folderPath, responsePath) {
  // Get access token
  const accessToken = await getAccessToken(clientId, clientSecret, responsePath);
  if (!accessToken) throw new Error('Failed to get access token');

  // Create bucket
  const bucketKey = `bucket_${uuidv4().replace(/-/g, '')}`;
  const bucketCreated = await createBucket(accessToken, bucketKey, responsePath);
  if (!bucketCreated) throw new Error('Failed to create bucket');

  // Upload files
  await uploadAllFiles(accessToken, bucketKey, folderPath, responsePath);

  // Find assembly file
  const assemblyFile = detectAssemblyFile(folderPath);
  if (!assemblyFile) throw new Error('No assembly (.iam) file found');

  // Link references and start translation
  const linked = await linkReferences(accessToken, bucketKey, assemblyFile, folderPath, responsePath);
  if (!linked) throw new Error('Failed to link references');
  
  const encodedUrn = await startTranslationJob(accessToken, bucketKey, assemblyFile, responsePath);
  if (!encodedUrn) throw new Error('Failed to start translation job');

  // Check translation status
  await checkTranslationStatus(accessToken, encodedUrn, responsePath);

  // Retrieve metadata
  const guidViewable = await retrieveListOfViewableFiles(accessToken, encodedUrn, responsePath);
  if (!guidViewable) throw new Error('Failed to retrieve viewable files');

  // Get hierarchy and properties
  await getObjectHierarchy(accessToken, encodedUrn, guidViewable, responsePath);
  await retrievePropertiesAllObjects(accessToken, encodedUrn, guidViewable, responsePath);

  return {
    bucketKey,
    assemblyFile,
    encodedUrn
  };
}

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});