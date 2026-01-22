// src/utils/apiClient.js
import axios from 'axios';
import { API_CONFIG } from '../config/api.config';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
  // ✅ FIX: Ensure proper URL parameter encoding
  paramsSerializer: params => {
    if (!params || typeof params !== 'object') {
      return '';
    }

    // Use URLSearchParams to properly encode parameters
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        // Ensure key doesn't have spaces (replace any spaces with underscore)
        const cleanKey = String(key).trim().replace(/\s+/g, '_');
        if (Array.isArray(value)) {
          value.forEach(v => {
            if (v !== undefined && v !== null && v !== '') {
              searchParams.append(cleanKey, String(v));
            }
          });
        } else {
          searchParams.append(cleanKey, String(value));
        }
      }
    });
    return searchParams.toString();
  },
});

// ✅ REQUEST DEDUPLICATION - Prevent duplicate requests
const requestCache = new Map();
const pendingRequests = new Map();
const CACHE_DURATION = 2000; // 2 seconds

// Helper to create cache key
const getCacheKey = config => {
  return `${config.method}:${config.url}:${JSON.stringify(
    config.params || {}
  )}`;
};

// Helper function to generate request key (for backward compatibility)
const getRequestKey = config => {
  return `${config.method?.toUpperCase()}_${config.url}_${JSON.stringify(
    config.params
  )}_${JSON.stringify(config.data)}`;
};

// ✅ SECURITY: Refresh token state management
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

// Request Interceptor
apiClient.interceptors.request.use(
  config => {
    // Skip authentication for test endpoints
    if (config.url && config.url.includes('/test/')) {
      return config;
    }

    // ✅ REQUEST DEDUPLICATION - Only for GET requests
    const isCashierClosingEndpoint =
      config.url && config.url.includes('cashier-closing');

    // Only deduplicate GET requests
    if (config.method === 'get' && !isCashierClosingEndpoint) {
      const cacheKey = getCacheKey(config);

      // Check cache first (fastest path)
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        // Cancel this request and return cached data
        return Promise.reject({
          code: 'ERR_CACHED',
          message: 'Using cached response',
          config,
          cachedResponse: cached.data,
        });
      }

      // Check if request is already pending
      const pending = pendingRequests.get(cacheKey);
      if (pending) {
        // Cancel this duplicate request
        const cancelTokenSource = axios.CancelToken.source();
        cancelTokenSource.cancel('Duplicate request cancelled');
        config.cancelToken = cancelTokenSource.token;
        // Still allow request to proceed but it will be cancelled
        // The pending request will handle the response
      }

      // Mark request as pending (only if not already pending)
      if (!pending) {
        const controller = new AbortController();
        pendingRequests.set(cacheKey, { signal: controller.signal });
        config.signal = controller.signal;
      }
    } else {
      // For non-GET requests, use old deduplication logic
      const requestKey = getRequestKey(config);
      const cancelTokenSource = axios.CancelToken.source();
      config.cancelToken = cancelTokenSource.token;

      if (!isCashierClosingEndpoint && pendingRequests.has(requestKey)) {
        const previousRequest = pendingRequests.get(requestKey);
        const timeSincePrevious = Date.now() - previousRequest.timestamp;
        if (timeSincePrevious < 500 && previousRequest.cancel) {
          previousRequest.cancel('Duplicate request cancelled');
        }
      }

      if (!isCashierClosingEndpoint) {
        pendingRequests.set(requestKey, {
          cancel: cancelTokenSource.cancel,
          timestamp: Date.now(),
        });
      }
    }

    // Cleanup old requests (older than 30 seconds)
    const now = Date.now();
    for (const [key, request] of pendingRequests.entries()) {
      if (now - request.timestamp > 30000) {
        pendingRequests.delete(key);
      }
    }


    // ✅ SECURITY: Check token before request
    // Cookie will be sent automatically by browser, but we also support localStorage for backward compatibility
    const token = localStorage.getItem('token');
    const publicEndpoints = [
      '/login',
      '/register',
      '/forgot-password', // ✅ FIX: Allow forgot password endpoint
      '/reset-password', // ✅ FIX: Allow reset password endpoint
      '/public',
      '/public/receipt', // ✅ FIX: Allow public receipt endpoint
      '/email/verify',
      '/subscriptions/plans',
      '/refresh-token', // Allow refresh token endpoint
    ];
    const isPublicEndpoint = publicEndpoints.some(ep =>
      config.url?.includes(ep)
    );

    // ✅ FIX: Cancel request if no token and not public endpoint
    // ✅ FIX: Allow requests during auth check (checkAuth might be running)
    const isAuthCheck = config.url?.includes('/user') && config.method === 'get';
    
    if (!isPublicEndpoint && !token && !isAuthCheck) {
      // Check if we're refreshing token - queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // Retry request after token refresh
            return apiClient(config);
          })
          .catch(err => Promise.reject(err));
      }

      // No token and not refreshing - reject request
      // ✅ FIX: Check localStorage as fallback (token might be set but not in state yet)
      const tokenFromStorage = localStorage.getItem('token');
      if (tokenFromStorage) {
        // Token exists in storage, use it
        config.headers.Authorization = `Bearer ${tokenFromStorage}`;
        // Continue with request
      } else {
        // ✅ FIX: Don't reject if we're checking auth (token might be loading)
        return Promise.reject(new Error('No token available'));
      }
    }

    // Add token to header (for backward compatibility with localStorage)
    // Cookie will be sent automatically by browser
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add X-Business-Id header if business is selected
    const currentBusinessId = localStorage.getItem('currentBusinessId');
    if (currentBusinessId) {
      config.headers['X-Business-Id'] = currentBusinessId;
    } else {
      // ✅ FIX: Log warning for all endpoints that require business ID (not just cashier-closing)
      // Skip for public endpoints that don't need business ID
      const publicEndpoints = [
        '/public/',
        '/public/receipt', // ✅ FIX: Public receipt endpoint doesn't require Business ID
        '/login',
        '/register',
        '/email/verify',
        '/subscriptions/plans',
        '/v1/user/profile',
        '/user', // ✅ FIX: User endpoint doesn't require Business ID header
        '/v1/businesses', // ✅ FIX: Businesses endpoint doesn't require Business ID header
        '/v1/subscriptions/', // ✅ FIX: Subscription endpoints don't require Business ID
        '/v1/payments/status/', // ✅ FIX: Payment status doesn't require Business ID
        '/v1/outlets', // ✅ FIX: Outlets endpoint - will handle 404 gracefully in service
        '/v1/attendance/register-face', // ✅ FIX: Face registration is user-level, doesn't require Business ID
        '/v1/attendance/verify-face', // ✅ FIX: Face verification is user-level, doesn't require Business ID
      ];
      const isPublicEndpoint = publicEndpoints.some(endpoint =>
        config.url?.includes(endpoint)
      );

      if (!isPublicEndpoint) {
        // ✅ FIX: Try to get business ID from window context first (before warning)
        // This is a fallback if AuthContext hasn't loaded yet
        if (window.__authContextRef?.currentBusiness?.id) {
          const contextBusinessId = window.__authContextRef.currentBusiness.id;
          config.headers['X-Business-Id'] = contextBusinessId;
          localStorage.setItem('currentBusinessId', contextBusinessId);
        } else {
          // Log warning in development only if business ID is still not available
          // This helps identify components that need conditional checks
          if (process.env.NODE_ENV === 'development') {
            // ✅ FIX: Only log warning once per endpoint to avoid console spam
            const warningKey = `business-id-warning-${config.url}`;
            if (!sessionStorage.getItem(warningKey)) {
              sessionStorage.setItem(warningKey, 'true');
              console.warn('⚠️ No Business ID found in localStorage for request:', {
                url: config.url,
                method: config.method,
                endpoint: config.url,
                hint: 'This may cause "Business ID required" error. Make sure business is selected. Component should check currentBusiness before making API calls.',
              });
            }
          }
        }
      }
    }

    // Add X-Outlet-Id header if outlet is selected (required for kasir/kitchen/waiter roles)
    const currentOutletId = localStorage.getItem('currentOutletId');
    if (currentOutletId) {
      config.headers['X-Outlet-Id'] = currentOutletId;
    } else {
      // ✅ FIX: Try to get outlet ID from window context if available (PWA fallback)
      if (window.__authContextRef?.currentOutlet?.id) {
        const contextOutletId = window.__authContextRef.currentOutlet.id;
        config.headers['X-Outlet-Id'] = contextOutletId;
        localStorage.setItem('currentOutletId', contextOutletId);
      }
    }

    // Debug logging in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log({
        'X-Outlet-Id': config.headers['X-Outlet-Id'] || 'NOT SET',
        Authorization: config.headers.Authorization ? 'SET' : 'NOT SET',
      },
      {
        params: config.params,
      });
    }

    // If data is FormData, remove Content-Type to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // ✅ FIX: Ensure params are properly formatted before sending
    if (config.params) {
      // Ensure all params are properly encoded - CLEAN ALL KEYS AND VALUES
      const cleanParams = {};
      Object.keys(config.params).forEach(key => {
        let value = config.params[key];
        if (value !== undefined && value !== null && value !== '') {
          // Ensure key doesn't have spaces - replace ALL spaces with underscore
          const cleanKey = String(key).trim().replace(/\s+/g, '_');

          // Also clean values that are strings with spaces for specific parameter keys
          // Only clean sort_by, sort_order, and other parameter values that should not have spaces
          if (typeof value === 'string' && value.includes(' ')) {
            const keysToClean = [
              'sort_by',
              'sort_order',
              'sortBy',
              'sortOrder',
            ];
            if (keysToClean.includes(cleanKey)) {
              value = value.replace(/\s+/g, '_');
            }
            // Don't clean search terms or other user input
          }

          // Also clean nested object keys if value is an object
          if (
            typeof value === 'object' &&
            !Array.isArray(value) &&
            value !== null
          ) {
            const cleanValue = {};
            Object.keys(value).forEach(vKey => {
              const cleanVKey = String(vKey).trim().replace(/\s+/g, '_');
              let vValue = value[vKey];
              if (
                typeof vValue === 'string' &&
                vValue.includes(' ') &&
                !vValue.includes('http')
              ) {
                vValue = vValue.replace(/\s+/g, '_');
              }
              cleanValue[cleanVKey] = vValue;
            });
            cleanParams[cleanKey] = cleanValue;
          } else {
            cleanParams[cleanKey] = value;
          }
        }
      });
      config.params = cleanParams;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  response => {
    // ✅ Cache GET responses
    if (response.config.method === 'get') {
      const cacheKey = getCacheKey(response.config);
      const isCashierClosingEndpoint =
        response.config?.url && response.config.url.includes('cashier-closing');

      if (!isCashierClosingEndpoint) {
        requestCache.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
        });

        // Remove from pending
        pendingRequests.delete(cacheKey);

        // Auto-clear cache after duration
        setTimeout(() => {
          requestCache.delete(cacheKey);
        }, CACHE_DURATION);
      }
    }

    // ✅ OPTIMIZATION: Remove request from pending when completed (only if it was stored)
    // Use cacheKey for GET requests, requestKey for others
    if (response.config.method === 'get') {
      const cacheKey = getCacheKey(response.config);
      const isCashierClosingEndpoint =
        response.config?.url && response.config.url.includes('cashier-closing');
      if (!isCashierClosingEndpoint) {
        pendingRequests.delete(cacheKey);
      }
    } else {
      const requestKey = getRequestKey(response.config);
      const isCashierClosingEndpoint =
        response.config?.url && response.config.url.includes('cashier-closing');
      if (!isCashierClosingEndpoint && pendingRequests.has(requestKey)) {
        pendingRequests.delete(requestKey);
      }
    }

    return response;
  },
  async error => {
    // Handle cached response
    if (error.code === 'ERR_CACHED' && error.cachedResponse) {
      return Promise.resolve(error.cachedResponse);
    }

    // ✅ OPTIMIZATION: Remove request from pending when failed (only if it was stored)
    if (error.config) {
      const cacheKey = getCacheKey(error.config);
      const requestKey = getRequestKey(error.config);
      const isCashierClosingEndpoint =
        error.config?.url && error.config.url.includes('cashier-closing');

      // Clean up pending request
      if (error.config.method === 'get' && !isCashierClosingEndpoint) {
        pendingRequests.delete(cacheKey);
      }

      if (!isCashierClosingEndpoint && pendingRequests.has(requestKey)) {
        pendingRequests.delete(requestKey);
      }
    }

    // ✅ FIX: Skip handling untuk cancelled requests (duplicate prevention)
    // Don't log or handle cancelled requests - they're intentional
    if (
      axios.isCancel(error) ||
      error.code === 'ERR_CANCELED' ||
      error.name === 'CanceledError'
    ) {
      // Silently ignore cancelled requests - this is expected behavior in React Strict Mode
      // Return a rejected promise but don't log it as an error
      return Promise.reject(error);
    }

    // Handle rate limit error (429) gracefully
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limit hit:', error.config?.url);

      // For profile check, return cached data or default
      if (error.config?.url?.includes('/profile/check')) {
        return Promise.resolve({
          data: {
            profile_complete: true,
            whatsapp_verified: true,
            success: true,
          },
        });
      }
    }

    // Skip 401 handling for test endpoints
    if (error.config?.url && error.config.url.includes('/test/')) {
      return Promise.reject(error);
    }

    // ✅ OPTIMIZATION: Jangan spam console dengan network/timeout errors yang sama
    // Hanya log error yang penting
    const isNetworkError = !error.response && error.request;
    const isTimeout =
      error.code === 'ECONNABORTED' || error.message?.includes('timeout');

    // Log error untuk top-products debugging (skip cancelled errors)
    if (
      error.config?.url &&
      error.config.url.includes('top-products') &&
      !isNetworkError &&
      !isTimeout
    ) {
      console.error('❌ API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        fullURL: error.config?.baseURL + error.config?.url,
        responseData: error.response?.data,
        message: error.message,
      });
    } else if (!isNetworkError && !isTimeout) {
      // ✅ FIX: Don't log validation errors (422) as errors, they're expected
      const isValidationError = error.response?.status === 422;
      if (isValidationError) {
        // Validation errors are expected and handled, just log as info
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Validation error (422):', {
            url: error.config?.url,
            errors: error.response?.data?.errors,
          });
        }
      } else {
        // ✅ FIX: Jangan log error untuk 403/404 yang normal (subscription required, not found)
        const status = error.response?.status;
        const url = error.config?.url || '';
        const isSubscriptionEndpoint = url.includes('/subscriptions/current');
        const is403SubscriptionRequired = status === 403 && (
          error.response?.data?.message?.includes('subscription') ||
          error.response?.data?.error === 'subscription_required' ||
          error.response?.data?.subscription_required
        );
        const is404Subscription = status === 404 && isSubscriptionEndpoint;
        
        // Skip logging untuk error yang normal
        if (is404Subscription || is403SubscriptionRequired) {
          // Normal case - tidak perlu log sebagai error
          if (process.env.NODE_ENV === 'development') {
            console.log('ℹ️ Expected error (suppressed):', {
              status,
              url,
              reason: is404Subscription ? 'No subscription (normal for new users)' : 'Subscription required',
            });
          }
        } else {
          // Hanya log non-network errors yang benar-benar error
          console.error('❌ API Error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            message: error.message,
            responseData: error.response?.data,
            errorMessage:
              error.response?.data?.message ||
              error.response?.data?.error ||
              error.message,
          });
        }
      }
    }
    // Skip logging untuk network/timeout errors (terlalu banyak spam)

    // ✅ SECURITY: Handle 401 with refresh token strategy
    // But skip if it's a timeout/network error (no response means no 401 status)
    // Note: isNetworkError and isTimeout are already declared above (line 452-454)
    if (error.response?.status === 401 && !isTimeout && !isNetworkError) {
      const originalRequest = error.config;

      // Skip refresh for login/register/refresh-token endpoints
      const isAuthEndpoint =
        originalRequest?.url?.includes('/login') ||
        originalRequest?.url?.includes('/register') ||
        originalRequest?.url?.includes('/refresh-token');

      if (isAuthEndpoint) {
        // For auth endpoints, just remove token and return error
        // Don't try to refresh token - this is a login/register failure
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // ✅ FIX: Return error immediately without trying refresh
        return Promise.reject(error);
      }

      // ✅ SECURITY: Try to refresh token if not already refreshing
      if (!originalRequest._retry && !isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // ✅ Refresh token (cookie will be sent automatically)
          const response = await apiClient.post('/refresh-token');
          const { token: newToken } = response.data;

          // Update localStorage for backward compatibility
          if (newToken) {
            localStorage.setItem('token', newToken);
          }

          // Process queued requests
          processQueue(null, newToken);

          // ✅ Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed - logout user
          processQueue(refreshError, null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');

          // Only redirect if we're not currently on login/register page or public routes
          const currentPath = window.location.pathname;
          const isAuthPage =
            currentPath === '/login' || currentPath === '/register';
          const isPublicRoute =
            currentPath.startsWith('/receipt/') ||
            currentPath.startsWith('/order/') ||
            currentPath.startsWith('/order-status/') ||
            currentPath.startsWith('/self-service/') ||
            currentPath === '/subscription-plans' ||
            currentPath.startsWith('/payment/') ||
            currentPath.startsWith('/email/verify') ||
            currentPath === '/login/sso';

          if (!isAuthPage && !isPublicRoute) {
            setTimeout(() => {
              const tokenStillExists = localStorage.getItem('token');
              if (!tokenStillExists && window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            }, 100);
          }

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else if (isRefreshing) {
        // ✅ Queue request if token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => {
              // Retry request after token refresh
              const token = localStorage.getItem('token');
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      } else {
        // Already retried or refresh not possible - logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        const currentPath = window.location.pathname;
        const isAuthPage =
          currentPath === '/login' || currentPath === '/register';
        const isPublicRoute =
          currentPath.startsWith('/receipt/') ||
          currentPath.startsWith('/order/') ||
          currentPath.startsWith('/order-status/') ||
          currentPath.startsWith('/self-service/') ||
          currentPath === '/subscription-plans' ||
          currentPath.startsWith('/payment/') ||
          currentPath.startsWith('/email/verify') ||
          currentPath === '/login/sso';

        if (!isAuthPage && !isPublicRoute) {
          setTimeout(() => {
            const tokenStillExists = localStorage.getItem('token');
            if (!tokenStillExists && window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }, 100);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
