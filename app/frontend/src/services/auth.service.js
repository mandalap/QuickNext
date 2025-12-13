// ==========================================
// 5. src/services/auth.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import {
  CACHE_KEYS,
  getCache,
  removeCache,
  setCache,
  staleWhileRevalidate,
} from '../utils/cache.utils';
import { handleApiError } from '../utils/errorHandler';

// Cache TTL untuk user data (30 menit)
const USER_CACHE_TTL = 30 * 60 * 1000;

export const authService = {
  login: async (email, password) => {
    try {
      // Get CSRF cookie first (untuk Laravel Sanctum)
      await apiClient.get('/sanctum/csrf-cookie');

      const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      });

      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // ✅ CACHE: Simpan user ke cache
      setCache(CACHE_KEYS.USER, user, USER_CACHE_TTL);

      return {
        success: true,
        data: { token, user },
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  register: async userData => {
    try {
      await apiClient.get('/sanctum/csrf-cookie');

      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.AUTH.REGISTER,
        userData
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  logout: async () => {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Continue with logout even if API fails
      console.warn('Logout API failed:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // ✅ CACHE: Clear user cache
      removeCache(CACHE_KEYS.USER);
    }
    return { success: true };
  },

  getCurrentUser: async (useCache = true) => {
    // ✅ CACHE: Gunakan stale-while-revalidate pattern
    if (useCache) {
      try {
        const result = await staleWhileRevalidate(
          CACHE_KEYS.USER,
          async () => {
            const response = await apiClient.get(
              API_CONFIG.ENDPOINTS.AUTH.USER
            );
            return {
              success: true,
              data: response.data,
            };
          },
          USER_CACHE_TTL
        );

        return {
          success: true,
          data: result.data,
          fromCache: result.fromCache,
        };
      } catch (error) {
        // Jika fetch gagal, coba return dari cache lama
        const cached = getCache(CACHE_KEYS.USER, USER_CACHE_TTL * 2); // Double TTL untuk fallback
        if (cached?.data) {
          console.warn('Using stale cache due to network error');
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
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.AUTH.USER);
      const userData = response.data;
      setCache(CACHE_KEYS.USER, userData, USER_CACHE_TTL);
      return {
        success: true,
        data: userData,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ✅ Helper: Update user cache
  updateUserCache: user => {
    if (user) {
      setCache(CACHE_KEYS.USER, user, USER_CACHE_TTL);
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  // Forgot password - accepts either email or phone
  forgotPassword: async (email, phone) => {
    try {
      // Validate that at least one is provided
      if (!email && !phone) {
        return {
          success: false,
          message: 'Email atau nomor WhatsApp harus diisi',
          error: 'Email atau nomor WhatsApp harus diisi',
        };
      }

      const payload = {};
      if (email && email.trim()) {
        payload.email = email.trim();
      }
      if (phone && phone.trim()) {
        payload.phone = phone.trim();
      }

      // Ensure payload is not empty
      if (Object.keys(payload).length === 0) {
        return {
          success: false,
          message: 'Email atau nomor WhatsApp harus diisi',
          error: 'Email atau nomor WhatsApp harus diisi',
        };
      }

      const response = await apiClient.post('/forgot-password', payload);
      return {
        success: response.data.success !== false,
        message: response.data.message || 'Link reset password telah dikirim',
        data: response.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
