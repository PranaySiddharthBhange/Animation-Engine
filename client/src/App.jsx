import { useState, useEffect } from 'react';
import UploadPage from './pages/UploadPage';
import ProcessingPage from './pages/ProcessingPage';
import ResultsPage from './pages/ResultPage';
import {storageManager} from './utils/storageManager';

const App = () => {
  const [appState, setAppState] = useState({
    currentPage: 'upload',
    sessionId: null,
    resultData: null
  });

  useEffect(() => {
    const storedData = storageManager.get();
    if (!storedData) return;

    if (storageManager.isValid(storedData)) {
      if (storedData.status === 'completed') {
        setAppState({
          currentPage: 'results',
          resultData: {
            accessToken: storedData.accessToken,
            encodedUrn: storedData.encodedUrn,
            timestamp: storedData.timestamp,
            sessionId: storedData.sessionId
          }
        });
      } else if (storedData.status === 'processing') {
        setAppState({
          currentPage: 'processing',
          sessionId: storedData.sessionId
        });
      }
    } else {
      storageManager.clear();
    }
  }, []);

  const handleProcessingStart = (sessionId) => {
    setAppState({
      currentPage: 'processing',
      sessionId
    });
  };

  const handleProcessingComplete = (resultData) => {
    setAppState({
      currentPage: 'results',
      resultData: {
        ...resultData,
        timestamp: Date.now(),
        sessionId: appState.sessionId
      }
    });
  };

  const handleProcessingError = () => {
    storageManager.clear();
    setAppState({
      currentPage: 'upload',
      sessionId: null,
      resultData: null
    });
  };

  const handleStartNew = () => {
    storageManager.clear();
    setAppState({
      currentPage: 'upload',
      sessionId: null,
      resultData: null
    });
  };

  switch (appState.currentPage) {
    case 'processing':
      return (
        <ProcessingPage
          sessionId={appState.sessionId}
          onComplete={handleProcessingComplete}
          onError={handleProcessingError}
        />
      );
    case 'results':
      return appState.resultData ? (
        <ResultsPage
          resultData={appState.resultData}
          onStartNew={handleStartNew}
        />
      ) : (
        <ProcessingPage
          sessionId={appState.sessionId}
          onComplete={handleProcessingComplete}
          onError={handleProcessingError}
        />
      );
    default:
      return <UploadPage onProcessingStart={handleProcessingStart} />;
  }
};

export default App;