// Optimized Dashboard Service with better performance
import { API_CONFIG } from '../config/api.config';
import { optimizedRequests } from '../utils/optimizedApiClient';

// Helper function to get outlet headers
const getOutletHeaders = () => {
  const currentOutletId = localStorage.getItem('currentOutletId');
  const currentBusinessId = localStorage.getItem('currentBusinessId');

  const headers = {};
  if (currentBusinessId) {
    headers['X-Business-Id'] = currentBusinessId;
  }
  if (currentOutletId) {
    headers['X-Outlet-Id'] = currentOutletId;
  }

  return headers;
};

// Cache for frequently accessed data
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached data or fetch new
const getCachedData = async (key, fetchFn, ttl = CACHE_DURATION) => {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && now - cached.timestamp < ttl) {
    return cached.data;
  }

  try {
    const data = await fetchFn();
    cache.set(key, { data, timestamp: now });
    return data;
  } catch (error) {
    // Return cached data if available, even if expired
    if (cached) {
      return cached.data;
    }
    throw error;
  }
};

export const optimizedDashboardService = {
  // Get stats with caching
  getStats: async () => {
    const cacheKey = 'dashboard-stats';
    return getCachedData(cacheKey, async () => {
      const headers = getOutletHeaders();
      const response = await optimizedRequests.get(
        API_CONFIG.ENDPOINTS.DASHBOARD.STATS,
        { headers }
      );
      return { success: true, data: response.data };
    });
  },

  // Get recent orders with caching
  getRecentOrders: async () => {
    const cacheKey = 'recent-orders';
    return getCachedData(
      cacheKey,
      async () => {
        const headers = getOutletHeaders();
        const response = await optimizedRequests.get(
          API_CONFIG.ENDPOINTS.DASHBOARD.RECENT_ORDERS,
          { headers }
        );
        return { success: true, data: response.data };
      },
      2 * 60 * 1000
    ); // 2 minutes cache for recent orders
  },

  // Get top products with caching
  getTopProducts: async () => {
    const cacheKey = 'top-products';
    return getCachedData(cacheKey, async () => {
      const headers = getOutletHeaders();
      const response = await optimizedRequests.get(
        API_CONFIG.ENDPOINTS.DASHBOARD.TOP_PRODUCTS,
        { headers }
      );
      return { success: true, data: response.data };
    });
  },

  // Clear cache
  clearCache: () => {
    cache.clear();
  },

  // Clear specific cache key
  clearCacheKey: key => {
    cache.delete(key);
  },

  // Get cache stats
  getCacheStats: () => {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    };
  },
};
