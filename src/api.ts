import axios from 'axios';

const api = axios.create({
  baseURL: '', // Relative for same-origin or use VITE_API_URL
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nj_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
