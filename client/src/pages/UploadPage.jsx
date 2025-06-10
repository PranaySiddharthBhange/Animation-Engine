import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadZip, checkStatus } from '../services/api';
import ProgressBar from '../components/ProgressBar';
import '../styles/UploadPage.css';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionId) {
      const interval = setInterval(async () => {
        try {
          const response = await checkStatus(sessionId);
          const { status, progress, message, result } = response.data;
          
          setProgress(progress);
          setMessage(message);
          setStatus(status);

          if (status === 'completed') {
            clearInterval(interval);
            localStorage.setItem('accessToken', result.accessToken);
            localStorage.setItem('encodedUrn', result.encodedUrn);
            localStorage.setItem('sessionId', sessionId);
            navigate('/viewer');
          } else if (status === 'failed') {
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Status check error:', error);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [sessionId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setStatus('uploading');
    try {
      const response = await uploadZip(file);
      setSessionId(response.data.sessionId);
      localStorage.setItem('sessionId', response.data.sessionId);
      setStatus('processing');
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('error');
      setMessage('Upload failed. Please try again.');
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h2>Upload Assembly ZIP</h2>
        <form onSubmit={handleSubmit}>
          <div className="file-input-container">
            <input 
              type="file" 
              accept=".zip" 
              onChange={(e) => setFile(e.target.files[0])} 
              disabled={status === 'processing' || status === 'uploading'}
            />
          </div>
          <button 
            type="submit" 
            disabled={!file || status === 'processing' || status === 'uploading'}
          >
            {status === 'uploading' ? 'Uploading...' : 'Process'}
          </button>
        </form>

        {(status === 'processing' || status === 'completed') && (
          <div className="progress-container">
            <ProgressBar progress={progress} />
            <p className="status-message">{message}</p>
            <p className="progress-text">{progress}%</p>
          </div>
        )}

        {status === 'error' && (
          <div className="error-message">
            <p>{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;