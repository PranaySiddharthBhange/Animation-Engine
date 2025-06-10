import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import '../styles/viewer.css'; // Ensure you have a CSS file for viewer styles

const Viewer = () => {
  const viewerContainer = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    const initializeViewer = () => {
      const accessToken = localStorage.getItem('accessToken');
      const encodedUrn = localStorage.getItem('encodedUrn');

      if (!accessToken || !encodedUrn) return;

      const options = {
        env: 'AutodeskProduction',
        accessToken: accessToken
      };

      if (window.Autodesk) {
        window.Autodesk.Viewing.Initializer(options, () => {
          if (!viewerContainer.current) {
            console.error("Viewer container not available.");
            return;
          }
             const viewer = new window.Autodesk.Viewing.GuiViewer3D(viewerContainer.current);

          viewer.start();
          viewer.setTheme('light-theme');

          const documentId = `urn:${encodedUrn}`;

          window.Autodesk.Viewing.Document.load(
            documentId,
            doc => viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()),
            (code, message) => console.error(`Error loading document: ${code} - ${message}`)
          );

          viewerRef.current = viewer;
        });
      }
    };

    // Load viewer script if not already loaded
    if (!window.Autodesk) {
      const script = document.createElement('script');
      script.src = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.js';
      script.onload = initializeViewer;
      document.head.appendChild(script);

      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.css';
      document.head.appendChild(css);
    } else {
      initializeViewer();
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.finish();
        viewerRef.current = null;
      }
    };
  }, []);

  return <div ref={viewerContainer} className="forge-viewer" />;
};

export default Viewer;