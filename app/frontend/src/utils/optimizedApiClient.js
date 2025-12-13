// Optimized API Client with better performance
import axios from 'axios';
import { API_CONFIG } from '../config/api.config';

// Create optimized axios instance
const optimizedApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 10000, // 10 seconds timeout instead of default 30s
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor with minimal overhead
optimizedApiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const currentBusinessId = localStorage.getItem('currentBusinessId');
    if (currentBusinessId) {
      config.headers['X-Business-Id'] = currentBusinessId;
    }

    const currentOutletId = localStorage.getItem('currentOutletId');
    if (currentOutletId) {
      config.headers['X-Outlet-Id'] = currentOutletId;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  error => Promise.reject(error)
);

// Response Interceptor with retry logic
optimizedApiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Retry logic for timeout errors
    if (error.code === 'ECONNABORTED' && !originalRequest._retry) {
      originalRequest._retry = true;
      return optimizedApiClient(originalRequest);
    }

    // Handle 401 errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Optimized request methods with better error handling
export const optimizedRequests = {
  // GET with caching headers
  get: async (url, config = {}) => {
    return optimizedApiClient.get(url, {
      ...config,
      headers: {
        'Cache-Control': 'max-age=300', // 5 minutes cache
        ...config.headers,
      },
    });
  },

  // POST with compression
  post: async (url, data, config = {}) => {
    return optimizedApiClient.post(url, data, {
      ...config,
      headers: {
        'Content-Encoding': 'gzip',
        ...config.headers,
      },
    });
  },

  // PUT with compression
  put: async (url, data, config = {}) => {
    return optimizedApiClient.put(url, data, {
      ...config,
      headers: {
        'Content-Encoding': 'gzip',
        ...config.headers,
      },
    });
  },

  // DELETE
  delete: async (url, config = {}) => {
    return optimizedApiClient.delete(url, config);
  },
};

export default optimizedApiClient;
