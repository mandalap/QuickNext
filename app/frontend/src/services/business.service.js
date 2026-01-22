// ==========================================
// src/services/business.service.js
// ==========================================
import apiClient from '../utils/apiClient';
import {
  CACHE_KEYS,
  getCache,
  setCache,
  removeCache,
  staleWhileRevalidate,
} from '../utils/cache.utils';
import { handleApiError } from '../utils/errorHandler';

// Cache TTL untuk business data (10 menit)
const BUSINESS_CACHE_TTL = 10 * 60 * 1000;

export const businessService = {
  // Get all businesses for the authenticated user
  getAll: async (useCache = true) => {
    // ✅ CACHE: Gunakan stale-while-revalidate pattern
    if (useCache) {
      try {
        const result = await staleWhileRevalidate(
          CACHE_KEYS.BUSINESSES,
          async () => {
            // ✅ OPTIMIZATION: Remove timestamp to allow caching
            const response = await apiClient.get('/v1/businesses');
            // Normalisasi: backend bisa mengirim object tunggal untuk employee (kasir)
            const raw = response?.data;
            const data = Array.isArray(raw)
              ? raw
              : Array.isArray(raw?.data)
              ? raw.data
              : raw
              ? [raw]
              : [];
            return { success: true, data };
          },
          BUSINESS_CACHE_TTL
        );
        return {
          success: true,
          data: result.data,
          fromCache: result.fromCache,
        };
      } catch (error) {
        // Jika fetch gagal, coba return dari cache lama
        const cached = getCache(CACHE_KEYS.BUSINESSES, BUSINESS_CACHE_TTL * 2);
        if (cached?.data) {
          console.warn('Using stale businesses cache due to network error');
          return {
            success: true,
            data: cached.data,
            fromCache: true,
            stale: true,
          };
        }
        return handleApiError(error);
      }
    }

    // Fallback: fetch langsung tanpa cache
    try {
      // ✅ OPTIMIZATION: Remove timestamp to allow caching
      const response = await apiClient.get('/v1/businesses');
      const raw = response?.data;
      const data = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : raw
        ? [raw]
        : [];
      setCache(CACHE_KEYS.BUSINESSES, data, BUSINESS_CACHE_TTL);
      return { success: true, data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Get current selected business
  getCurrent: async (useCache = true) => {
    // ✅ CACHE: Gunakan stale-while-revalidate pattern
    if (useCache) {
      try {
        const result = await staleWhileRevalidate(
          CACHE_KEYS.CURRENT_BUSINESS,
          async () => {
            const response = await apiClient.get('/v1/businesses/current');
            // Handle response that might be object with success property or direct data
            if (
              response.data &&
              typeof response.data === 'object' &&
              'success' in response.data
            ) {
              return response.data; // Already has success property
            }
            return { success: true, data: response.data };
          },
          BUSINESS_CACHE_TTL
        );

        return {
          success: result.data.success !== false,
          data: result.data.data || result.data,
          fromCache: result.fromCache,
        };
      } catch (error) {
        // Handle 200 response with success: false (no business found)
        if (
          error.response?.status === 200 &&
          error.response?.data?.success === false
        ) {
          return error.response.data;
        }

        // Jika fetch gagal, coba return dari cache lama
        const cached = getCache(
          CACHE_KEYS.CURRENT_BUSINESS,
          BUSINESS_CACHE_TTL * 2
        );
        if (cached?.data) {
          console.warn(
            'Using stale current business cache due to network error'
          );
          return {
            success: cached.data.success !== false,
            data: cached.data.data || cached.data,
            fromCache: true,
            stale: true,
          };
        }
        return handleApiError(error);
      }
    }

    // Fallback: fetch langsung tanpa cache
    try {
      const response = await apiClient.get('/v1/businesses/current');
      if (
        response.data &&
        typeof response.data === 'object' &&
        'success' in response.data
      ) {
        setCache(
          CACHE_KEYS.CURRENT_BUSINESS,
          response.data,
          BUSINESS_CACHE_TTL
        );
        return response.data;
      }
      const result = { success: true, data: response.data };
      setCache(CACHE_KEYS.CURRENT_BUSINESS, result, BUSINESS_CACHE_TTL);
      return result;
    } catch (error) {
      if (
        error.response?.status === 200 &&
        error.response?.data?.success === false
      ) {
        return error.response.data;
      }
      return handleApiError(error);
    }
  },

  // Create a new business
  create: async businessData => {
    try {
      const response = await apiClient.post('/v1/businesses', businessData);
      return { success: true, data: response.data };
    } catch (error) {
      // ✅ FIX: Include full error response data for subscription limit errors
      const errorData = error.response?.data || {};
      const isSubscriptionLimit = errorData.error === 'subscription_limit_reached' ||
                                  errorData.error === 'Batas paket tercapai' || 
                                  errorData.subscription_limit_reached === true ||
                                  error.response?.status === 403;
      
      const result = handleApiError(error);
      
      // ✅ FIX: Include full error data for subscription limit errors
      if (isSubscriptionLimit) {
        return {
          ...result,
          ...errorData, // Include all error data (message, limits, upgrade_message, etc.)
        };
      }
      
      return result;
    }
  },

  // Get business by ID
  getById: async id => {
    try {
      const response = await apiClient.get(`/v1/businesses/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Update business
  update: async (id, businessData) => {
    try {
      const response = await apiClient.put(
        `/v1/businesses/${id}`,
        businessData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Delete business
  delete: async id => {
    try {
      const response = await apiClient.delete(`/v1/businesses/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Switch to a business
  switch: async id => {
    try {
      const response = await apiClient.post(`/v1/businesses/${id}/switch`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
