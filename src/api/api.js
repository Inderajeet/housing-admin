import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/admin';
// Example deployed fallback:
// const API_BASE_URL = 'https://housing-backend.vercel.app/api/admin';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error(`API timeout after 15s: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    } else {
      console.error(`API request failed: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.message);
    }

    return Promise.reject(error);
  }
);

