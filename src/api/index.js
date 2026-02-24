import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  console.warn('[API] VITE_API_BASE_URL is not set. All requests will fail. Create .env.local with the correct backend URL.');
}

if (import.meta.env.DEV) {
  // #region agent log
  fetch('http://127.0.0.1:7288/ingest/6f7b4d02-d61c-4f1d-8ac9-ac4f4b312881',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'845059'},body:JSON.stringify({sessionId:'845059',runId:'run1',hypothesisId:'H1',location:'src/api/index.js:11',message:'API module initialized',data:{apiBaseUrl:API_BASE_URL||null,hasApiBaseUrl:!!API_BASE_URL},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

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
    if (import.meta.env.DEV) {
      const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
      console.log("Full Request URL:", fullUrl);
    }
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
    if (import.meta.env.DEV) {
      // #region agent log
      fetch('http://127.0.0.1:7288/ingest/6f7b4d02-d61c-4f1d-8ac9-ac4f4b312881',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'845059'},body:JSON.stringify({sessionId:'845059',runId:'run4',hypothesisId:'N4',location:'src/api/index.js:43',message:'API response error',data:{url:error?.config?.url||null,method:error?.config?.method||null,status:error?.response?.status||null,apiMessage:error?.response?.data?.message||null,isNetworkError:!!error?.message&&error.message.includes('Network Error')},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }

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
