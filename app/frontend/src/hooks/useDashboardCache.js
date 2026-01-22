import { useCallback, useEffect, useState } from 'react';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useDashboardCache = (key, fetchFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    const cacheKey = `${key}_${JSON.stringify(dependencies)}`;
    const cached = cache.get(cacheKey);

    // Check if we have valid cached data
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();

      // Cache the result
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFunction, ...dependencies]);

  const invalidateCache = useCallback(() => {
    const cacheKey = `${key}_${JSON.stringify(dependencies)}`;
    cache.delete(cacheKey);
  }, [key, dependencies]);

  const refreshData = useCallback(() => {
    invalidateCache();
    fetchData();
  }, [invalidateCache, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refreshData,
    invalidateCache,
  };
};

// Utility function to clear all cache
export const clearAllCache = () => {
  cache.clear();
};

// Utility function to get cache stats
export const getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
};
