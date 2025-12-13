import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const ingredientService = {
  getAll: async params => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.INGREDIENTS.LIST, {
        params,
      });
      console.log('📦 Ingredients Response:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getById: async id => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.INGREDIENTS.DETAIL(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async ingredientData => {
    try {
      console.log('📝 Creating ingredient:', ingredientData);
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.INGREDIENTS.CREATE,
        ingredientData
      );
      console.log('✅ Ingredient created:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Create ingredient error:', error.response?.data || error);
      return handleApiError(error);
    }
  },

  update: async (id, ingredientData) => {
    try {
      console.log('📝 Updating ingredient:', id, ingredientData);
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.INGREDIENTS.UPDATE(id),
        ingredientData
      );
      console.log('✅ Ingredient updated:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Update ingredient error:', error.response?.data || error);
      return handleApiError(error);
    }
  },

  delete: async id => {
    try {
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.INGREDIENTS.DELETE(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getLowStock: async () => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.INGREDIENTS.LOW_STOCK
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateStock: async (id, stockData) => {
    try {
      // stockData should contain: { type: 'add'|'subtract'|'set', quantity: number, notes: string }
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.INGREDIENTS.UPDATE_STOCK(id),
        stockData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
