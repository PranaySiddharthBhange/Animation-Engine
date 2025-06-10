import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import ViewerPage from './pages/ViewerPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/viewer" element={<ViewerPage />} />
      </Routes>
    </Router>
   
  );
}

export default App;