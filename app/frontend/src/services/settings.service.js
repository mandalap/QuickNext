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
};
