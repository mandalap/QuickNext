// ==========================================
// 17. src/services/category.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import {
  CACHE_KEYS,
  getCache,
  setCache,
  staleWhileRevalidate,
} from '../utils/cache.utils';
import { handleApiError } from '../utils/errorHandler';

// Cache TTL untuk categories (10 menit - lebih lama karena jarang berubah)
const CATEGORY_CACHE_TTL = 10 * 60 * 1000;

export const categoryService = {
  getAll: async (params, useCache = true) => {
    // ✅ CACHE: Buat cache key berdasarkan params
    const cacheKey = `${CACHE_KEYS.CATEGORIES}_${params?.outlet_id || 'all'}`;

    if (useCache) {
      try {
        const result = await staleWhileRevalidate(
          cacheKey,
          async () => {
            // Timeout khusus 5 detik untuk categories (lebih pendek dari default 15s)
            const response = await apiClient.get(
              API_CONFIG.ENDPOINTS.CATEGORIES.LIST,
              {
                params,
                timeout: 5000, // 5 detik timeout khusus
              }
            );
            return { success: true, data: response.data };
          },
          CATEGORY_CACHE_TTL
        );
        return {
          success: true,
          data: result.data,
          fromCache: result.fromCache,
        };
      } catch (error) {
        // Handle timeout khusus
        if (
          error.code === 'ECONNABORTED' ||
          error.message?.includes('timeout')
        ) {
          // Coba return dari cache jika ada
          const cached = getCache(cacheKey, CATEGORY_CACHE_TTL * 2);
          if (cached?.data) {
            console.warn('Using stale categories cache due to timeout');
            return {
              success: true,
              data: cached.data,
              fromCache: true,
              stale: true,
            };
          }
          return {
            success: false,
            error: 'Request timeout. Pastikan backend berjalan.',
            isTimeout: true,
          };
        }

        // Jika fetch gagal, coba return dari cache lama
        const cached = getCache(cacheKey, CATEGORY_CACHE_TTL * 2);
        if (cached?.data) {
          console.warn('Using stale categories cache due to network error');
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
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.CATEGORIES.LIST,
        {
          params,
          timeout: 5000,
        }
      );
      const data = response.data;
      setCache(cacheKey, data, CATEGORY_CACHE_TTL);
      return { success: true, data };
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return {
          success: false,
          error: 'Request timeout. Pastikan backend berjalan.',
          isTimeout: true,
        };
      }
      return handleApiError(error);
    }
  },

  getById: async id => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.CATEGORIES.DETAIL(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      // For 422 validation errors, we want to throw the error so React Query can handle it
      // But we also want to return a structured error object
      const handledError = handleApiError(error);
      
      // If it's a validation error (422), throw it so React Query's onError can handle it
      if (error.response?.status === 422 || handledError.status === 422) {
        // Create a new error object that includes all the necessary information
        const validationError = new Error(handledError.error || 'Validation error');
        validationError.response = error.response || {
          status: 422,
          data: {
            errors: handledError.errors || {},
            message: handledError.error || handledError.message,
          },
        };
        validationError.errors = handledError.errors;
        validationError.status = 422;
        throw validationError;
      }
      
      return handledError;
    }
  },

  create: async categoryData => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.CATEGORIES.CREATE,
        categoryData
      );

      // Removed excessive console.log for production

      return { success: true, data: response.data };
    } catch (error) {
      // For 422 validation errors, we want to throw the error so React Query can handle it
      // But we also want to return a structured error object
      const handledError = handleApiError(error);
      
      // If it's a validation error (422), throw it so React Query's onError can handle it
      if (error.response?.status === 422 || handledError.status === 422) {
        // Create a new error object that includes all the necessary information
        const validationError = new Error(handledError.error || 'Validation error');
        validationError.response = error.response || {
          status: 422,
          data: {
            errors: handledError.errors || {},
            message: handledError.error || handledError.message,
          },
        };
        validationError.errors = handledError.errors;
        validationError.status = 422;
        throw validationError;
      }
      
      return handledError;
    }
  },

  update: async (id, categoryData) => {
    try {
      // If categoryData is FormData (for file upload), use POST with _method=PUT
      if (categoryData instanceof FormData) {
        categoryData.append('_method', 'PUT');
        const response = await apiClient.post(
          API_CONFIG.ENDPOINTS.CATEGORIES.UPDATE(id),
          categoryData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        return { success: true, data: response.data };
      } else {
        const response = await apiClient.put(
          API_CONFIG.ENDPOINTS.CATEGORIES.UPDATE(id),
          categoryData
        );
        return { success: true, data: response.data };
      }
    } catch (error) {
      // For 422 validation errors, we want to throw the error so React Query can handle it
      // But we also want to return a structured error object
      const handledError = handleApiError(error);
      
      // If it's a validation error (422), throw it so React Query's onError can handle it
      if (error.response?.status === 422 || handledError.status === 422) {
        // Create a new error object that includes all the necessary information
        const validationError = new Error(handledError.error || 'Validation error');
        validationError.response = error.response || {
          status: 422,
          data: {
            errors: handledError.errors || {},
            message: handledError.error || handledError.message,
          },
        };
        validationError.errors = handledError.errors;
        validationError.status = 422;
        throw validationError;
      }
      
      return handledError;
    }
  },

  delete: async id => {
    try {
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.CATEGORIES.DELETE(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      // For 422 validation errors, we want to throw the error so React Query can handle it
      // But we also want to return a structured error object
      const handledError = handleApiError(error);
      
      // If it's a validation error (422), throw it so React Query's onError can handle it
      if (error.response?.status === 422 || handledError.status === 422) {
        // Create a new error object that includes all the necessary information
        const validationError = new Error(handledError.error || 'Validation error');
        validationError.response = error.response || {
          status: 422,
          data: {
            errors: handledError.errors || {},
            message: handledError.error || handledError.message,
          },
        };
        validationError.errors = handledError.errors;
        validationError.status = 422;
        throw validationError;
      }
      
      return handledError;
    }
  },
};
