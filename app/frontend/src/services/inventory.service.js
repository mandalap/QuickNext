// ==========================================
// 13. src/services/inventory.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const inventoryService = {
  getProducts: async params => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.INVENTORY.PRODUCTS,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getIngredients: async params => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.INVENTORY.INGREDIENTS,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getMovements: async params => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.INVENTORY.MOVEMENTS,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getLowStockAlerts: async () => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.INVENTORY.LOW_STOCK_ALERTS
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  stockAdjustment: async adjustmentData => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.INVENTORY.STOCK_ADJUSTMENT,
        adjustmentData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
