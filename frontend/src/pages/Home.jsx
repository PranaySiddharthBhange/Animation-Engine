import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = 'https://your-backend-host.com'; // replace this

function Home() {
  const [zipFile, setZipFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.zip')) {
      setZipFile(file);
    } else {
      alert('Please select a .zip file');
    }
  };

  const isSessionValid = (sessionData) => {
    if (!sessionData) return false;
    const now = Date.now();
    return now - sessionData.timestamp < 24 * 60 * 60 * 1000; // 1 day
  };

  const uploadFile = async () => {
    if (!zipFile) {
      alert('Please select a ZIP file first');
      return;
    }

    setUploading(true);
    setMessage('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('file', zipFile);

      const res = await axios.post(`${BACKEND_URL}/process`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const sessionId = res.data.sessionId;
      const sessionData = {
        sessionId,
        timestamp: Date.now()
      };

      localStorage.setItem('forgeSession', JSON.stringify(sessionData));
      setMessage('Upload successful. Session started.');
    } catch (err) {
      console.error(err);
      setMessage('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = async () => {
    const savedSession = JSON.parse(localStorage.getItem('forgeSession'));

    if (!isSessionValid(savedSession)) {
      console.log('Session expired or missing. Uploading and creating new session...');
      await uploadFile();
    } else {
      setMessage('Valid session already exists. No need to upload again.');
    }
  };

  return (
    <div>
      <h2>Upload Assembly ZIP</h2>
      <input type="file" accept=".zip" onChange={handleFileChange} />
      <button onClick={handleUploadClick} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      <p>{message}</p>
    </div>
  );
}

export default Home;
