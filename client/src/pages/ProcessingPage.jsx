import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { storageManager, API_BASE_URL } from '../utils/storageManager';
import ProcessingStatus from '../components/ProcessingStatus';


const ProcessingPage = ({ sessionId, onComplete, onError }) => {
  const [message, setMessage] = useState('Starting...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let intervalId;
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status/${sessionId}`);
        if (!response.ok) throw new Error('Status check failed');

        const data = await response.json();
        if (!isMounted) return;

        setMessage(data.message);
        setProgress(data.progress || 0);

        if (data.status === 'completed') {
          clearInterval(intervalId);
          storageManager.set({
            sessionId,
            status: 'completed',
            accessToken: data.result.accessToken,
            encodedUrn: data.result.encodedUrn
          });
          onComplete({
            accessToken: data.result.accessToken,
            encodedUrn: data.result.encodedUrn
          });
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

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [sessionId, onComplete, onError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Clock className="mx-auto h-16 w-16 text-indigo-600 mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing...</h1>
          <p className="text-gray-600">Please wait while we process your file</p>
        </div>

        <ProcessingStatus message={message} progress={progress} />

        <div className="text-xs text-gray-500 text-center mt-4">
          Session ID: {sessionId}
        </div>
      </div>
    </div>
  );
};
export default ProcessingPage;