// ==========================================
// 7. src/services/product.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import {
  CACHE_KEYS,
  clearCacheByPattern,
  getCache,
  setCache,
  staleWhileRevalidate,
} from '../utils/cache.utils';
import { handleApiError } from '../utils/errorHandler';

// Cache TTL untuk products dan categories (5 menit)
const PRODUCT_CACHE_TTL = 5 * 60 * 1000;

export const productService = {
  // Combined endpoint untuk initial load - return products + categories sekaligus
  getInitialData: async (params, useCache = true) => {
    // ✅ CACHE: Buat cache key berdasarkan params (untuk outlet-specific cache)
    const cacheKey = `${CACHE_KEYS.PRODUCTS}_initial_${
      params?.outlet_id || 'all'
    }`;

    if (useCache) {
      try {
        const result = await staleWhileRevalidate(
          cacheKey,
          async () => {
            const response = await apiClient.get('/v1/products/initial-data', {
              params,
            });
            return { success: true, data: response.data };
          },
          PRODUCT_CACHE_TTL
        );
        return {
          success: true,
          data: result.data,
          fromCache: result.fromCache,
        };
      } catch (error) {
        // Jika fetch gagal, coba return dari cache lama
        const cached = getCache(cacheKey, PRODUCT_CACHE_TTL * 2);
        if (cached?.data) {
          console.warn('Using stale initial data cache due to network error');
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
      const response = await apiClient.get('/v1/products/initial-data', {
        params,
      });
      const data = response.data;
      setCache(cacheKey, data, PRODUCT_CACHE_TTL);
      return { success: true, data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getAll: async params => {
    try {
      // ✅ OPTIMIZATION: Perpanjang timeout menjadi 10 detik (dari 5 detik)
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS.LIST, {
        params,
        timeout: 10000, // 10 detik timeout dengan optimasi database query
      });
      // Removed excessive console.log for production

      return { success: true, data: response.data };
    } catch (error) {
      // Handle timeout khusus
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Silent timeout - already handled with fallback in component
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
        API_CONFIG.ENDPOINTS.PRODUCTS.DETAIL(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async productData => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.PRODUCTS.CREATE,
        productData
      );
      // ✅ CACHE: Clear products cache setelah create
      clearCacheByPattern('product');
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  update: async (id, productData) => {
    try {
      // If productData is FormData (for file upload), use POST with _method=PUT
      if (productData instanceof FormData) {
        productData.append('_method', 'PUT');
        const response = await apiClient.post(
          API_CONFIG.ENDPOINTS.PRODUCTS.UPDATE(id),
          productData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        // ✅ CACHE: Clear products cache setelah update
        clearCacheByPattern('product');
        return { success: true, data: response.data };
      } else {
        const response = await apiClient.put(
          API_CONFIG.ENDPOINTS.PRODUCTS.UPDATE(id),
          productData
        );
        // ✅ CACHE: Clear products cache setelah update
        clearCacheByPattern('product');
        return { success: true, data: response.data };
      }
    } catch (error) {
      return handleApiError(error);
    }
  },

  delete: async id => {
    try {
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.PRODUCTS.DELETE(id)
      );
      // ✅ CACHE: Clear products cache setelah delete
      clearCacheByPattern('product');
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  stockAdjustment: async (id, adjustmentData) => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.PRODUCTS.STOCK_ADJUSTMENT(id),
        adjustmentData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
