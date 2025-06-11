import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileArchive, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://animation-server.onrender.com';

const ModelViewer = ({ accessToken, encodedUrn }) => {
  const viewerContainer = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {


    const initializeViewer = async () => {
      try {

        const options = {
          env: 'AutodeskProduction',
          accessToken: accessToken,
          api: 'derivativeV2'
        };

        window.Autodesk.Viewing.Initializer(options, () => {
          const viewer = new window.Autodesk.Viewing.GuiViewer3D(
            viewerContainer.current,
            { extensions: [] }
          );

          viewerRef.current = viewer;
          viewer.start();

          const documentId = `urn:${encodedUrn}`;
          window.Autodesk.Viewing.Document.load(
            documentId,
            doc => {
              const viewable = doc.getRoot().getDefaultGeometry();
              viewer.loadDocumentNode(doc, viewable);
            },
            error => {
              console.error('Failed to load document:', error);
            }
          );
        });
      } catch (error) {
        console.error('Failed to initialize viewer:', error);
      }
    };

    if (accessToken && encodedUrn) {
      initializeViewer();
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.finish();
        viewerRef.current = null;
      }
    };
  }, [accessToken, encodedUrn]);

  return (
    <div
      ref={viewerContainer}
      className="w-full h-full"
    />
  );
};

const UploadPage = ({ onProcessingStart }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

const handleFileChange = (e) => {
  const selectedFile = e.target.files[0];
  if (selectedFile && selectedFile.name.toLowerCase().endsWith('.zip')) {
    setFile(selectedFile);
    setError('');
  } else {
    setError('Please select a valid ZIP file');
    setFile(null);
  }
};


  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('zipfile', file);

    try {
      const response = await fetch(`${API_BASE_URL}/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Upload failed');
        return;
      }

      const data = await response.json();

      if (data.success && data.sessionId) {
        const sessionData = {
          sessionId: data.sessionId,
          timestamp: Date.now(),
          message: data.message
        };

        localStorage.setItem('processingSession', JSON.stringify(sessionData));
        onProcessingStart(data.sessionId);
      } else {
        setError(data.error || 'Failed to start processing');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <FileArchive className="mx-auto h-16 w-16 text-indigo-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload ZIP File</h1>
          <p className="text-gray-600">Select a ZIP file to process</p>
        </div>

        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
            <input
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="text-sm text-gray-600">
                {file ? (
                  <span className="font-medium text-indigo-600">{file.name}</span>
                ) : (
                  <>
                    <span className="font-medium">Click to upload</span> or drag and drop
                    <br />
                    ZIP files only
                  </>
                )}
              </div>
            </label>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? 'Uploading...' : 'Upload & Process'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProcessingPage = ({ sessionId, onComplete, onError }) => {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Starting...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let intervalId;

    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status/${sessionId}`);
        const data = await response.json();

        setStatus(data.status);
        setMessage(data.message);
        setProgress(data.progress || 0);

        if (data.status === 'completed') {
          clearInterval(intervalId);

          const resultData = {
            accessToken: data.result.accessToken,
            encodedUrn: data.result.encodedUrn,
            sessionId: sessionId,
            timestamp: Date.now()
          };

          localStorage.setItem('completedSession', JSON.stringify(resultData));
          onComplete(resultData);
        } else if (data.status === 'error') {
          clearInterval(intervalId);
          onError('Processing failed');
        }
      } catch (err) {
        console.error('Status check error:', err);
        onError('Failed to check status');
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 2000);

    return () => clearInterval(intervalId);
  }, [sessionId, onComplete, onError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Clock className="mx-auto h-16 w-16 text-indigo-600 mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing...</h1>
          <p className="text-gray-600">Please wait while we process your file</p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-indigo-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-700 font-medium">{message}</p>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Session ID: {sessionId}
          </div>
        </div>
      </div>
    </div>
  );
};

const CountdownTimer = ({ expirationTime }) => {
  const [timeLeft, setTimeLeft] = useState(expirationTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = expirationTime - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [expirationTime]);

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <span className="font-medium">
      {hours}h {minutes}m {seconds}s
    </span>
  );
};

const ResultsPage = ({ resultData, onStartNew }) => {
  const expirationTime = resultData.timestamp + 23 * 60 * 60 * 1000;
  const [sessionValid, setSessionValid] = useState(Date.now() < expirationTime);

  useEffect(() => {
    if (!sessionValid) return;

    const interval = setInterval(() => {
      if (Date.now() >= expirationTime) {
        setSessionValid(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionValid, expirationTime]);

  if (!sessionValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Session Expired</h1>
          <p className="text-gray-600 mb-6">
            Your viewing session has ended. Please process a new file.
          </p>
          <button
            onClick={onStartNew}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Process New File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <div className="bg-indigo-700 text-white p-3 flex justify-between items-center">
        <div className="text-sm">
          Session expires in: <CountdownTimer expirationTime={expirationTime} />
        </div>
        <button
          onClick={onStartNew}
          className="bg-white text-indigo-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          Process Another
        </button>
      </div>

      <div className="flex-grow relative">
        <ModelViewer
          accessToken={resultData.accessToken}
          encodedUrn={resultData.encodedUrn}
        />
      </div>
    </div>
  );
};

const App = () => {
  const [currentPage, setCurrentPage] = useState('upload');
  const [sessionId, setSessionId] = useState(null);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    try {
      const storedSession = localStorage.getItem('completedSession');
      if (storedSession) {
        const data = JSON.parse(storedSession);
        setResultData(data);
        setCurrentPage('results');
      }
    } catch (err) {
      console.error('Error loading stored session:', err);
    }
  }, []);

  const handleProcessingStart = (newSessionId) => {
    setSessionId(newSessionId);
    setCurrentPage('processing');
  };

  const handleProcessingComplete = (data) => {
    setResultData(data);
    setCurrentPage('results');
  };

  const handleProcessingError = (error) => {
    console.error('Processing error:', error);
    setCurrentPage('upload');
  };

  const handleStartNew = () => {
    setSessionId(null);
    setResultData(null);
    setCurrentPage('upload');
    localStorage.removeItem('processingSession');
    localStorage.removeItem('completedSession');
  };

  switch (currentPage) {
    case 'processing':
      return (
        <ProcessingPage
          sessionId={sessionId}
          onComplete={handleProcessingComplete}
          onError={handleProcessingError}
        />
      );
    case 'results':
      return (
        <ResultsPage
          resultData={resultData}
          onStartNew={handleStartNew}
        />
      );
    default:
      return <UploadPage onProcessingStart={handleProcessingStart} />;
  }
};

export default App;