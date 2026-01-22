// ==========================================
// 9. src/services/customer.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const customerService = {
  getAll: async params => {
    try {
      // Get current business ID from localStorage
      const currentBusinessId = localStorage.getItem('currentBusinessId');

      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.CUSTOMERS.LIST,
        {
          params,
          headers: {
            'X-Business-Id': currentBusinessId,
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  search: async query => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.CUSTOMERS.SEARCH(query)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getById: async id => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.CUSTOMERS.DETAIL(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async customerData => {
    try {
      // Get current business ID from localStorage
      const currentBusinessId = localStorage.getItem('currentBusinessId');

      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.CUSTOMERS.CREATE,
        customerData,
        {
          headers: {
            'X-Business-Id': currentBusinessId,
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  update: async (id, customerData) => {
    try {
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.CUSTOMERS.UPDATE(id),
        customerData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  delete: async id => {
    try {
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.CUSTOMERS.DELETE(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
