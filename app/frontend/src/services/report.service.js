// ==========================================
// 14. src/services/report.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const reportService = {
  getSales: async params => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.REPORTS.SALES, {
        params,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getInventory: async params => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.REPORTS.INVENTORY,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getFinancial: async params => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.REPORTS.FINANCIAL,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getCustomerAnalytics: async params => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.REPORTS.CUSTOMER_ANALYTICS,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getPaymentTypes: async params => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.REPORTS.PAYMENT_TYPES,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  exportSales: async params => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.REPORTS.EXPORT_SALES,
        {
          params,
          responseType: 'blob', // untuk download file
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  exportInventory: async params => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.REPORTS.EXPORT_INVENTORY,
        {
          params,
          responseType: 'blob',
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
