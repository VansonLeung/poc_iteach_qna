import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Activity APIs
export const activityAPI = {
  getAll: (params) => api.get('/activities', { params }),
  getById: (id) => api.get(`/activities/${id}`),
  create: (data) => api.post('/activities', data),
  update: (id, data) => api.put(`/activities/${id}`, data),
  archive: (id) => api.delete(`/activities/${id}/archive`),
  getVersions: (id) => api.get(`/activities/${id}/versions`),
};

// Activity Element APIs
export const activityElementAPI = {
  getAll: (params) => api.get('/activity-elements', { params }),
  getById: (id) => api.get(`/activity-elements/${id}`),
  create: (data) => api.post('/activity-elements', data),
  update: (id, data) => api.put(`/activity-elements/${id}`, data),
  archive: (id) => api.delete(`/activity-elements/${id}/archive`),
};

// Question APIs
export const questionAPI = {
  getAll: (params) => api.get('/questions', { params }),
  getById: (id, params) => api.get(`/questions/${id}`, { params }),
  create: (data) => api.post('/questions', data),
  update: (id, data) => api.put(`/questions/${id}`, data),
  archive: (id) => api.delete(`/questions/${id}/archive`),
  getVersions: (id) => api.get(`/questions/${id}/versions`),
};

// Submission APIs
export const submissionAPI = {
  getAll: (params) => api.get('/submissions', { params }),
  getById: (id) => api.get(`/submissions/${id}`),
  create: (data) => api.post('/submissions', data),
  update: (id, data) => api.put(`/submissions/${id}`, data),
  archive: (id) => api.delete(`/submissions/${id}/archive`),
  getVersions: (id) => api.get(`/submissions/${id}/versions`),
};

// Submission Answer APIs
export const submissionAnswerAPI = {
  getAll: (params) => api.get('/submission-answers', { params }),
  getById: (id) => api.get(`/submission-answers/${id}`),
  create: (data) => api.post('/submission-answers', data),
  update: (id, data) => api.put(`/submission-answers/${id}`, data),
  archive: (id) => api.delete(`/submission-answers/${id}/archive`),
  getVersions: (id) => api.get(`/submission-answers/${id}/versions`),
};

export default api;
