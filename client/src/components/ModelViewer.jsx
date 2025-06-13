import { useEffect, useRef, useCallback } from 'react';
import { storageManager, API_BASE_URL, TOKEN_REFRESH_INTERVAL } from '../utils/storageManager';



const ModelViewer = ({ accessToken, encodedUrn }) => {
  const viewerContainer = useRef(null);
  const viewerRef = useRef(null);
  const tokenRefreshTimer = useRef(null);

  const refreshAccessToken = useCallback(async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/${sessionId}`);
      if (!response.ok) throw new Error('Token refresh failed');

      const { accessToken: newToken } = await response.json();
      storageManager.updateToken(newToken);
      return newToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const initializeViewer = async (token) => {
      const options = {
        env: 'AutodeskProduction',
        accessToken: token,
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
    };

    if (accessToken && encodedUrn) {
      initializeViewer(accessToken);
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.finish();
        viewerRef.current = null;
      }
      if (tokenRefreshTimer.current) {
        clearInterval(tokenRefreshTimer.current);
      }
    };
  }, [accessToken, encodedUrn]);

  // Token refresh setup
  useEffect(() => {
    if (accessToken) {
      const storedData = storageManager.get();
      if (!storedData?.sessionId) return;

      const refreshToken = async () => {
        const newToken = await refreshAccessToken(storedData.sessionId);
        if (newToken && viewerRef.current) {
          viewerRef.current.setAccessToken(newToken);
        }
      };

      tokenRefreshTimer.current = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
      return () => clearInterval(tokenRefreshTimer.current);
    }
  }, [accessToken, refreshAccessToken]);

  return <div ref={viewerContainer} className="w-full h-full" />;
};

export default ModelViewer;