// src/RouteHandler.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ZipUploader from '../../components/ZipUploader';
import Viewer from '../pages/Viewer';

function RouteHandler() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ZipUploader/>} />
        <Route path="/viewer" element={<Viewer />} />
      </Routes>
    </Router>
  );
}

export default RouteHandler;
