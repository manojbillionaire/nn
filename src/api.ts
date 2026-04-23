import axios from 'axios';

const api = axios.create({
  baseURL: '', // Relative for same-origin or use VITE_API_URL
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Add token to requests (legacy support)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nj_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
