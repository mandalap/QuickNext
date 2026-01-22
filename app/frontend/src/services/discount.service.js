// ==========================================
// 16. src/services/discount.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const discountService = {
  getAll: async params => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.DISCOUNTS.LIST,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getById: async id => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.DISCOUNTS.DETAIL(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async discountData => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.DISCOUNTS.CREATE,
        discountData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  update: async (id, discountData) => {
    try {
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.DISCOUNTS.UPDATE(id),
        discountData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  delete: async id => {
    try {
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.DISCOUNTS.DELETE(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  validateCoupon: async (code, orderTotal) => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.DISCOUNTS.VALIDATE,
        {
          code,
          order_total: orderTotal,
        }
      );

      // Backend returns {valid: true/false, data: {...}, message: '...'}
      const backendResponse = response.data;

      if (backendResponse.valid) {
        return {
          success: true,
          data: backendResponse.data,
          message: backendResponse.message,
        };
      } else {
        // ✅ FIX: Return minimum_amount dan current_amount jika ada
        return {
          success: false,
          message: backendResponse.message || 'Kupon tidak valid',
          data: {
            minimum_amount: backendResponse.minimum_amount,
            current_amount: backendResponse.current_amount,
          },
          minimum_amount: backendResponse.minimum_amount,
          current_amount: backendResponse.current_amount,
        };
      }
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Alias for validateCoupon to maintain compatibility
  validate: async (code, orderTotal) => {
    return discountService.validateCoupon(code, orderTotal);
  },
};
