import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Get auth token from localStorage
const getAccessToken = () => {
  return localStorage.getItem('access_token');
};

// Set auth token in localStorage
export const setAccessToken = (token) => {
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
};

// Request interceptor - Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Track if we're currently refreshing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // ✅ If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // ✅ If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // ✅ FIX: Send refresh token in request BODY, not header
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken }, // ✅ In body as JSON
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const { access_token } = response.data;
        setAccessToken(access_token);

        // ✅ Process queued requests
        processQueue(null, access_token);
        isRefreshing = false;

        // ✅ Retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // ✅ Refresh failed - logout user
        processQueue(refreshError, null);
        isRefreshing = false;
        
        setAccessToken(null);
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // ✅ Only redirect if not already on login/signup
        const currentPath = window.location.pathname;
        if (!['/login', '/signup', '/forgot-password', '/reset-password'].includes(currentPath)) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;