// ==========================================
// 15. src/services/platform.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const platformService = {
  getAll: async () => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PLATFORMS.LIST);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getOrders: async (platformId, params) => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.PLATFORMS.ORDERS(platformId),
        { params }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  syncOrders: async platformId => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.PLATFORMS.SYNC(platformId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateSettings: async (platformId, settings) => {
    try {
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.PLATFORMS.SETTINGS(platformId),
        settings
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
