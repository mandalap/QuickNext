// ==========================================
// 18. src/services/settings.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const settingsService = {
  getBusiness: async () => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.SETTINGS.BUSINESS
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateBusiness: async businessData => {
    try {
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.SETTINGS.UPDATE_BUSINESS,
        businessData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getOutlets: async () => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.SETTINGS.OUTLETS
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  createOutlet: async outletData => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.SETTINGS.CREATE_OUTLET,
        outletData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getPaymentMethods: async () => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.SETTINGS.PAYMENT_METHODS
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updatePaymentMethods: async paymentData => {
    try {
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.SETTINGS.UPDATE_PAYMENT_METHODS,
        paymentData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getReceiptFooterMessage: async (outletId) => {
    try {
      if (!outletId) {
        return {
          success: false,
          message: 'Outlet ID is required',
          error: 'Outlet ID is required',
          data: { footer_message: '' },
        };
      }

      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.SETTINGS.RECEIPT_FOOTER_MESSAGE,
        {
          headers: {
            'X-Outlet-Id': outletId.toString(),
          },
        }
      );

      // Handle both response.data and direct response
      const responseData = response.data?.data || response.data;
      return {
        success: response.data?.success !== false,
        data: responseData,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateReceiptFooterMessage: async (footerMessage, outletId) => {
    try {
      if (!outletId) {
        return {
          success: false,
          message: 'Outlet ID is required',
          error: 'Outlet ID is required',
        };
      }

      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.SETTINGS.UPDATE_RECEIPT_FOOTER_MESSAGE,
        { footer_message: footerMessage },
        {
          headers: {
            'X-Outlet-Id': outletId.toString(),
          },
        }
      );

      // Handle both response.data and direct response
      // Backend returns: { success: true, data: {...}, message: "..." }
      const responseData = response.data;
      
      if (responseData?.success === false) {
        return {
          success: false,
          message: responseData.message || 'Gagal memperbarui footer message',
          error: responseData.message || 'Gagal memperbarui footer message',
          data: responseData.data,
        };
      }

      return {
        success: true,
        data: responseData?.data || responseData,
        message: responseData?.message || 'Footer message berhasil diperbarui',
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
