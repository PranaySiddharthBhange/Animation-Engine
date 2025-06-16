import { createContext, useContext, useReducer, useEffect } from 'react';
import { storageManager } from '../utils/storageManager';

const AppContext = createContext();

const initialState = {
  currentPage: 'upload',
  sessionId: null,
  resultData: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'START_PROCESSING':
      return { ...state, currentPage: 'processing', sessionId: action.payload };
    case 'COMPLETE_PROCESSING':
      return {
        ...state,
        currentPage: 'results',
        resultData: {
          ...action.payload,
          timestamp: Date.now(),
          sessionId: state.sessionId
        }
      };
    case 'RESET':
      return { ...initialState };
    case 'ERROR':
      return { ...initialState, currentPage: 'upload' };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const storedData = storageManager.get();
    if (!storedData) return;

    if (storageManager.isValid(storedData)) {
      if (storedData.status === 'completed') {
        dispatch({
          type: 'SET_STATE',
          payload: {
            currentPage: 'results',
            resultData: {
              accessToken: storedData.accessToken,
              encodedUrn: storedData.encodedUrn,
              timestamp: storedData.timestamp,
              sessionId: storedData.sessionId
            }
          }
        });
      } else if (storedData.status === 'processing') {
        dispatch({
          type: 'SET_STATE',
          payload: {
            currentPage: 'processing',
            sessionId: storedData.sessionId
          }
        });
      }
    } else {
      storageManager.clear();
    }
  }, []);

  const handleProcessingStart = (sessionId) => {
    dispatch({ type: 'START_PROCESSING', payload: sessionId });
  };

  const handleProcessingComplete = (resultData) => {
    dispatch({ type: 'COMPLETE_PROCESSING', payload: resultData });
  };

  const handleProcessingError = () => {
    storageManager.clear();
    dispatch({ type: 'ERROR' });
  };

  const handleStartNew = () => {
    storageManager.clear();
    dispatch({ type: 'RESET' });
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        handleProcessingStart,
        handleProcessingComplete,
        handleProcessingError,
        handleStartNew
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);