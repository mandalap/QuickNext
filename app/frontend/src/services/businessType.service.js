// ==========================================
// src/services/businessType.service.js
// ==========================================
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const businessTypeService = {
  // Get all active business types
  getAll: async () => {
    try {
      const response = await apiClient.get('/business-types');
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Get business type by code
  getByCode: async code => {
    try {
      const response = await apiClient.get(`/business-types/${code}`);
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
