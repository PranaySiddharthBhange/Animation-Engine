import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

export const uploadZip = (file) => {
  const formData = new FormData();
  formData.append('zipfile', file);
  
  return axios.post(`${API_BASE_URL}/process`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const checkStatus = (sessionId) => {
  return axios.get(`${API_BASE_URL}/status/${sessionId}`);
};

export const generateAnimation = (sessionId) => {
  return axios.get(`${API_BASE_URL}/generate-animation/${sessionId}`);
};