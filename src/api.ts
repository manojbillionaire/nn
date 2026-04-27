import axios from 'axios';

const api = axios.create({
  baseURL: '',
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const setUserEmail = (email: string | null) => {
  if (email) {
    api.defaults.headers.common['x-user-email'] = email;
  } else {
    delete api.defaults.headers.common['x-user-email'];
  }
};

export default api;
