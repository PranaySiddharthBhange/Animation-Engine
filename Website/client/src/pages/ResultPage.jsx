import React, { useState, useEffect } from 'react';
import ModelViewer from '../components/ModelViewer';
import CountdownTimer from '../components/CountdownTimer';
import SequenceManager from '../components/SequenceManager';
import { AlertCircle } from 'lucide-react';
import { API_BASE_URL, SESSION_EXPIRATION } from '../utils/storageManager';
import { useAppContext } from '../context/AppContext';

const ResultsPage = ({ resultData }) => {
  const { handleStartNew } = useAppContext();
  const expirationTime = resultData.timestamp + SESSION_EXPIRATION;
  const [sessionValid, setSessionValid] = useState(Date.now() < expirationTime);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [currentSequence, setCurrentSequence] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionValid(Date.now() < expirationTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [expirationTime]);

  const generateAnimation = async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const response = await fetch(`${API_BASE_URL}/generate-animation/${resultData.sessionId}`);
      if (!response.ok) throw new Error('Failed to generate animation');

      const data = await response.json();
      const existing = JSON.parse(sessionStorage.getItem('sequences')) || [];
      existing.push(data);
      sessionStorage.setItem('sequences', JSON.stringify(existing));
      
      window.dispatchEvent(new Event('sequencesUpdated'));
    } catch (err) {
      setGenerateError(err.message || 'Error generating animation');
    } finally {
      setGenerating(false);
    }
  };

  const handleSequenceChange = (sequence) => {
    setCurrentSequence(sequence);
  };

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
            onClick={handleStartNew}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Process New File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      <div className="bg-indigo-700 text-white p-3 flex justify-between items-center flex-shrink-0">
        <div className="text-sm">
          Session expires in: <CountdownTimer expirationTime={expirationTime} />
        </div>
        <div className="space-x-2">
          <button
            onClick={handleStartNew}
            className="bg-white text-indigo-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            Process Another
          </button>
        </div>
      </div>

      <div className="flex flex-grow overflow-hidden">
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex-shrink-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-white text-lg font-semibold">Animation Sequences</h2>
          </div>
          <div className="flex-grow overflow-y-auto">
            <SequenceManager 
              onSequenceChange={handleSequenceChange}
              onGenerateSequence={generateAnimation}
            />
          </div>
        </div>
        
        <div className="flex-grow bg-gray-900 overflow-hidden flex flex-col">
          <div className="flex-grow relative min-h-0">
            <ModelViewer
              accessToken={resultData.accessToken}
              encodedUrn={resultData.encodedUrn}
              currentSequence={currentSequence}
            />
          </div>
          
          <div className="bg-gray-800 border-t border-gray-700 p-3 flex-shrink-0">
            <div className="flex justify-between items-center text-sm text-gray-300">
              <span>Pranay 💖</span>
              <span className="text-xs">
                {currentSequence.length > 0 ? `Playing sequence: ${currentSequence.length} steps` : 'No sequence active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {generateError && (
        <div className="text-red-400 text-center p-2 bg-red-900 border-t border-red-700 flex-shrink-0">
          {generateError}
        </div>
      )}
    </div>
  );
};

export default ResultsPage;