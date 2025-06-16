import { useEffect, useRef, useCallback, useState } from 'react';
import { storageManager, API_BASE_URL, TOKEN_REFRESH_INTERVAL } from '../utils/storageManager';
import { useImperativeHandle, forwardRef } from 'react';

const ModelViewer = ({ accessToken, encodedUrn }) => {
  const viewerContainer = useRef(null);
  const viewerRef = useRef(null);
  const tokenRefreshTimer = useRef(null);
  const [currentToken, setCurrentToken] = useState(accessToken);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const refreshAccessToken = useCallback(async (sessionId) => {
    try {
      console.log('Refreshing token for session:', sessionId);
      const response = await fetch(`${API_BASE_URL}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      });
      
      if (response.status === 404) {
        console.error('Session not found on server. Session may have expired.');
        // Clear invalid session from storage
        storageManager.clearSession?.();
        throw new Error('Session expired - please re-authenticate');
      }
      
      if (response.status === 403) {
        console.error('Session too old to generate new token.');
        // Clear expired session from storage
        storageManager.clearSession?.();
        throw new Error('Session expired - please re-authenticate');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Token refresh failed with status: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      const newToken = data.accessToken;
      
      if (!newToken) {
        throw new Error('No access token received from server');
      }
      
      storageManager.updateToken(newToken);
      setCurrentToken(newToken);
      console.log('Token refreshed successfully. Session age:', data.sessionAgeHours, 'hours');
      return newToken;
    } catch (error) {
      console.error('Token refresh error:', error.message);
      return null;
    }
  }, []);

  const handleTokenRefreshAndRetry = useCallback(async () => {
    const storedData = storageManager.get();
    
    if (!storedData?.sessionId) {
      console.error('No session ID found in storage');
      return false;
    }
    
    if (retryCount >= maxRetries) {
      console.error('Max retries reached for token refresh');
      return false;
    }

    console.log(`Attempting to refresh token due to authentication error... (attempt ${retryCount + 1}/${maxRetries})`);
    const newToken = await refreshAccessToken(storedData.sessionId);
    
    if (newToken) {
      setRetryCount(prev => prev + 1);
      return true;
    } else {
      // If token refresh fails, we might need to re-authenticate
      console.error('Token refresh failed. User may need to re-authenticate.');
      return false;
    }
  }, [refreshAccessToken, retryCount, maxRetries]);

  const loadDocument = useCallback((viewer, token, urn) => {
    const documentId = `urn:${urn}`;
    
    // Override the default error handler to catch authentication errors
    const originalErrorHandler = window.Autodesk.Viewing.Document.load;
    
    window.Autodesk.Viewing.Document.load(
      documentId,
      (doc) => {
        console.log('Document loaded successfully');
        setRetryCount(0); // Reset retry count on success
        const viewable = doc.getRoot().getDefaultGeometry();
        viewer.loadDocumentNode(doc, viewable);
      },
      async (error) => {
        console.error('Failed to load document:', error);
        
        // Check if error is authentication related (401/403)
        if (error === 4 || error === 401 || error === 403) {
          console.log('Authentication error detected, attempting token refresh...');
          const success = await handleTokenRefreshAndRetry();
          
          if (success) {
            // Retry loading the document with the new token after a brief delay
            console.log('Retrying document load with refreshed token...');
            setTimeout(() => {
              if (viewerRef.current && currentToken) {
                loadDocument(viewerRef.current, currentToken, urn);
              }
            }, 1500); // Increased delay to ensure token is properly updated
          } else {
            console.error('Failed to refresh token. Manual re-authentication may be required.');
            // You might want to emit an event here to notify the parent component
            // that re-authentication is needed
          }
        } else {
          console.error('Non-authentication error occurred:', error);
        }
      }
    );
  }, [handleTokenRefreshAndRetry, currentToken]);

  const initializeViewer = useCallback(async (token) => {
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

      // Set up error event listener for the viewer
      viewer.addEventListener(window.Autodesk.Viewing.VIEWER_STATE_RESTORED_EVENT, () => {
        console.log('Viewer state restored');
      });

      // Override the viewer's token for future requests
      if (viewer.impl && viewer.impl.api) {
        const originalGetAccessToken = viewer.impl.api.getAccessToken;
        viewer.impl.api.getAccessToken = () => currentToken;
      }

      loadDocument(viewer, token, encodedUrn);
    });
  }, [loadDocument, encodedUrn, currentToken]);

  // Main initialization effect
  useEffect(() => {
    if (currentToken && encodedUrn) {
      initializeViewer(currentToken);
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
  }, [currentToken, encodedUrn, initializeViewer]);

  // Token refresh timer setup
  useEffect(() => {
    if (currentToken) {
      const storedData = storageManager.get();
      if (!storedData?.sessionId) return;

      const refreshToken = async () => {
        const newToken = await refreshAccessToken(storedData.sessionId);
        if (newToken && viewerRef.current) {
          // Update the viewer's access token
          if (viewerRef.current.impl && viewerRef.current.impl.api) {
            viewerRef.current.impl.api.setAccessToken(newToken);
          }
        }
      };

      tokenRefreshTimer.current = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
      return () => clearInterval(tokenRefreshTimer.current);
    }
  }, [currentToken, refreshAccessToken]);

  // Reset retry count when token changes
  useEffect(() => {
    setRetryCount(0);
  }, [currentToken]);

  return (
    <div className="w-full h-full">
      <div ref={viewerContainer} className="w-full h-full" />
      {retryCount > 0 && retryCount < maxRetries && (
        <div className="absolute top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded">
          Refreshing authentication... (Attempt {retryCount}/{maxRetries})
        </div>
      )}
    </div>
  );
};

export default ModelViewer;