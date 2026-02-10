import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// #region agent log
// Debug: Log the actual API URL being used
console.log('[DEBUG] API_BASE_URL:', API_BASE_URL);
console.log('[DEBUG] import.meta.env.VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('[DEBUG] All import.meta.env:', import.meta.env);
// #endregion

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
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
    // Don't redirect if we're already on login page or if the error came from a login request
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      // Clear auth and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Methods
export const authAPI = {
  login: (pickerId, pin) =>
    api.post('/auth/login/pin', { pickerId, pin }),

  logout: () =>
    api.post('/auth/logout'),
};

export const batchAPI = {
  getMyBatches: () =>
    api.get('/batches/my-batches'),

  getBatchDetails: (batchId) =>
    api.get(`/batches/${batchId}`),

  startBatch: (batchId) =>
    api.post(`/batches/${batchId}/start`),

  completeBatch: (batchId) =>
    api.post(`/batches/${batchId}/complete`),
};

export const pickingAPI = {
  getToteForOrder: (batchId, orderId, body) =>
    api.post(`/batches/${batchId}/orders/${orderId}/get-tote`, body),

  confirmPick: (batchId, lineItemId, data) =>
    api.post(`/batches/${batchId}/line-items/${lineItemId}/pick`, data),

  markOversized: (batchId, lineItemId, data) =>
    api.post(`/batches/${batchId}/line-items/${lineItemId}/oversized`, data),

  markNoneRemaining: (batchId, lineItemId, data) =>
    api.post(`/batches/${batchId}/line-items/${lineItemId}/none-remaining`, data),

  scanTote: (batchId, body) =>
    api.post(`/batches/${batchId}/totes/scan`, body),
};

export const analyticsAPI = {
  getDashboard: () =>
    api.get('/analytics/dashboard'),

  getPickerPerformance: (startDate, endDate, groupBy = 'day') =>
    api.get('/analytics/picker-performance', {
      params: { startDate, endDate, groupBy }
    }),

  getProductPerformance: (startDate, endDate, limit = 50) =>
    api.get('/analytics/product-performance', {
      params: { startDate, endDate, limit }
    }),

  getBatchCompletion: (startDate, endDate, groupBy = 'day') =>
    api.get('/analytics/batch-completion', {
      params: { startDate, endDate, groupBy }
    }),

  getChannelPerformance: (startDate, endDate) =>
    api.get('/analytics/channel-performance', {
      params: { startDate, endDate }
    }),

  getPriorityAnalysis: (startDate, endDate) =>
    api.get('/analytics/priority-analysis', {
      params: { startDate, endDate }
    }),

  getPersonalizationImpact: (startDate, endDate) =>
    api.get('/analytics/personalization-impact', {
      params: { startDate, endDate }
    }),

  getExceptions: (startDate, endDate) =>
    api.get('/analytics/exceptions', {
      params: { startDate, endDate }
    }),

  getTrends: (metric, startDate, endDate, groupBy = 'day') =>
    api.get('/analytics/trends', {
      params: { metric, startDate, endDate, groupBy }
    }),
};

export default api;
