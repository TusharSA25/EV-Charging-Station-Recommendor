// src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});
export const getFavorites = () => api.get('/favorites');
export const addFavorite = (station_id) => api.post('/favorites', { station_id });
export const removeFavorite = (station_id) => api.delete(`/favorites/${station_id}`);
// Interceptor to add the token to every request if it exists
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default api;