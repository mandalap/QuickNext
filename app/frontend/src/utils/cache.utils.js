// ==========================================
// Cache Utility - localStorage dengan Stale-While-Revalidate Pattern
// ==========================================

const CACHE_VERSION = '1.0.0';
const CACHE_PREFIX = 'kasir_pos_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 menit default

/**
 * Generate cache key dengan version
 */
const getCacheKey = key => {
  return `${CACHE_PREFIX}${CACHE_VERSION}_${key}`;
};

/**
 * Get data dari cache
 */
export const getCache = (key, maxAge = DEFAULT_TTL) => {
  try {
    const cacheKey = getCacheKey(key);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    // Jika data masih fresh (kurang dari maxAge)
    if (age < maxAge) {
      return {
        data,
        stale: false,
        age,
      };
    }

    // Jika data sudah stale (lebih dari maxAge), return data tapi mark as stale
    // Ini memungkinkan stale-while-revalidate pattern
    return {
      data,
      stale: true,
      age,
    };
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

/**
 * Set data ke cache
 */
export const setCache = (key, data, ttl = DEFAULT_TTL) => {
  try {
    const cacheKey = getCacheKey(key);
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    return true;
  } catch (error) {
    console.error('Error writing cache:', error);
    // Jika storage penuh, coba clear cache lama
    try {
      clearOldCache();
      localStorage.setItem(
        getCacheKey(key),
        JSON.stringify({
          data,
          timestamp: Date.now(),
          ttl,
        })
      );
      return true;
    } catch (e) {
      console.error('Failed to clear old cache:', e);
      return false;
    }
  }
};

/**
 * Remove cache
 */
export const removeCache = key => {
  try {
    const cacheKey = getCacheKey(key);
    localStorage.removeItem(cacheKey);
    return true;
  } catch (error) {
    console.error('Error removing cache:', error);
    return false;
  }
};

/**
 * Clear all cache untuk aplikasi ini
 */
export const clearAllCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Clear old cache (lebih dari 24 jam)
 */
export const clearOldCache = () => {
  try {
    const keys = Object.keys(localStorage);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const { timestamp } = JSON.parse(cached);
            if (timestamp < oneDayAgo) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // Invalid cache, remove it
          localStorage.removeItem(key);
        }
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing old cache:', error);
    return false;
  }
};

/**
 * Stale-While-Revalidate: Return cached data immediately, then fetch fresh data
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch fresh data
 * @param {number} maxAge - Max age in ms before data is considered stale
 * @returns {Promise<{data: any, fromCache: boolean}>}
 */
export const staleWhileRevalidate = async (
  key,
  fetchFn,
  maxAge = DEFAULT_TTL
) => {
  // 1. Check cache first
  const cached = getCache(key, maxAge);

  if (cached && !cached.stale) {
    // Data masih fresh, return immediately
    return {
      data: cached.data,
      fromCache: true,
    };
  }

  // 2. If we have stale data, return it immediately but fetch fresh data in background
  if (cached && cached.stale) {
    // Return stale data immediately
    const staleData = cached.data;

    // Fetch fresh data in background (fire and forget)
    fetchFn()
      .then(result => {
        if (result?.success && result?.data) {
          setCache(key, result.data, maxAge);
        }
      })
      .catch(error => {
        // ✅ FIX: Only log non-cancelled, non-timeout, and non-token errors
        if (
          error?.name !== 'CanceledError' && 
          error?.code !== 'ERR_CANCELED' &&
          error?.code !== 'ECONNABORTED' &&
          error?.code !== 'ETIMEDOUT' &&
          error?.message !== 'No token available' &&
          !error?.message?.includes('Duplicate request cancelled') &&
          !error?.message?.includes('cancelled') &&
          !error?.message?.includes('timeout')
        ) {
          console.warn('Background refresh failed:', error);
        }
        // Don't throw, we already have stale data
      });

    return {
      data: staleData,
      fromCache: true,
      stale: true,
    };
  }

  // 3. No cache, fetch fresh data
  try {
    const result = await fetchFn();
    if (result?.success && result?.data) {
      setCache(key, result.data, maxAge);
      return {
        data: result.data,
        fromCache: false,
      };
    }
    return {
      data: result?.data || null,
      fromCache: false,
    };
  } catch (error) {
    // ✅ FIX: Don't log cancelled requests (duplicate request prevention)
    if (
      error?.name === 'CanceledError' ||
      error?.name === 'AbortError' ||
      error?.code === 'ERR_CANCELED' ||
      error?.code === 'ERR_ABORTED' ||
      error?.message?.includes('Duplicate request cancelled') ||
      error?.message?.includes('cancelled') ||
      error?.message?.includes('aborted') ||
      (error?.isAxiosError && error?.code === 'ERR_CANCELED')
    ) {
      // Silently ignore cancelled requests - don't log or throw
      // Return null to indicate no data available
      return {
        data: null,
        fromCache: false,
      };
    }
    
    // ✅ FIX: Handle timeout and network errors gracefully
    if (
      error?.code === 'ECONNABORTED' ||
      error?.code === 'ETIMEDOUT' ||
      error?.message?.includes('timeout') ||
      error?.isNetworkError ||
      (error?.isAxiosError && (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT'))
    ) {
      // Log timeout/network errors as warning, not error
      console.warn('Network timeout or connection error:', error?.message || 'Unable to connect to server');
      // Return null to indicate no data available, but don't throw
      return {
        data: null,
        fromCache: false,
      };
    }
    
    // ✅ FIX: Only log non-cancelled, non-timeout errors
    console.error('Fetch failed:', error);
    throw error;
  }
};

/**
 * Cache keys constants
 */
export const CACHE_KEYS = {
  USER: 'user',
  BUSINESSES: 'businesses',
  CURRENT_BUSINESS: 'current_business',
  OUTLETS: 'outlets',
  CURRENT_OUTLET: 'current_outlet',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  CUSTOMERS: 'customers',
  ACTIVE_SHIFT: 'active_shift',
};

/**
 * Clear cache by pattern
 */
export const clearCacheByPattern = pattern => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing cache by pattern:', error);
    return false;
  }
};
