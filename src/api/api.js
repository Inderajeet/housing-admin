import axios from 'axios';

const API_BASE_URL = 'https://housing-backend.vercel.app/api/admin';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
