import { AppProvider } from './context/AppContext';
import UploadPage from './pages/UploadPage';
import ProcessingPage from './pages/ProcessingPage';
import ResultsPage from './pages/ResultPage';
import { useAppContext } from './context/AppContext';

const AppContent = () => {
  const { currentPage, sessionId, resultData } = useAppContext();

  switch (currentPage) {
    case 'processing':
      return <ProcessingPage sessionId={sessionId} />;
    case 'results':
      return resultData ? (
        <ResultsPage resultData={resultData} />
      ) : (
        <ProcessingPage sessionId={sessionId} />
      );
    default:
      return <UploadPage />;
  }
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;