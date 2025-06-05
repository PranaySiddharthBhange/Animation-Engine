import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Main from '../pages/Main';
import Upload from '../pages/Upload';

function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/upload" element={<Upload />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;
