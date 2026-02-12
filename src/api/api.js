import axios from 'axios';

// const API_BASE_URL = 'http://localhost:5000/api/admin';
const API_BASE_URL = 'https://housing-backend.vercel.app/api/admin';

export const api = axios.create({
  baseURL: API_BASE_URL,
  // headers: {
  //   'Content-Type': 'application/json',
  // },
});

api.interceptors.request.use(
  (config) => {
    // If data is FormData, let the browser set headers
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

