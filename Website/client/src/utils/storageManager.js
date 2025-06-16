const API_BASE_URL = 'https://animation-server.onrender.com';
const STORAGE_KEY = 'Storage';
const TOKEN_REFRESH_INTERVAL = 50*  60 * 1000; 
const SESSION_EXPIRATION = 23 * 60 * 60 * 1000; 

const storageManager = {
  get: () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },
  
  set: (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
  },
  
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
  },
  
  isValid: (storedData) => {
    if (!storedData || !storedData.timestamp) return false;
    return Date.now() - storedData.timestamp < SESSION_EXPIRATION;
  },
  
  updateToken: (accessToken) => {
    const current = storageManager.get();
    if (current) {
      storageManager.set({
        ...current,
        accessToken,
        tokenRefreshTime: Date.now()
      });
    }
  }
};

export { storageManager, SESSION_EXPIRATION, API_BASE_URL,TOKEN_REFRESH_INTERVAL };