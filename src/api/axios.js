import axios from 'axios';
import API_CONFIG from '../config';

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
});

// Optional: attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
