// ==========================================
// 11. src/services/table.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

// Helper function to get outlet headers
const getOutletHeaders = (businessId = null, outletId = null) => {
  // Use provided parameters first, then fallback to localStorage
  const currentBusinessId =
    businessId || localStorage.getItem('currentBusinessId');
  const currentOutletId = outletId || localStorage.getItem('currentOutletId');

  const headers = {};
  if (currentBusinessId) {
    headers['X-Business-Id'] = currentBusinessId;
  }
  if (currentOutletId) {
    headers['X-Outlet-Id'] = currentOutletId;
  }

  return headers;
};

export const tableService = {
  getAll: async (params = {}, businessId = null, outletId = null) => {
    try {
      const headers = getOutletHeaders(businessId, outletId);
      // ✅ FIX: Increase timeout for tables (backend can be slow)
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.TABLES.LIST, {
        params,
        timeout: API_CONFIG.TIMEOUT_LONG, // 20 seconds for tables
        headers: {
          ...headers,
          ...apiClient.defaults.headers,
        },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async (tableData, businessId = null, outletId = null) => {
    try {
      const headers = getOutletHeaders(businessId, outletId);
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.TABLES.CREATE,
        tableData,
        {
          headers: {
            ...headers,
            ...apiClient.defaults.headers,
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  update: async (id, tableData, businessId = null, outletId = null) => {
    try {
      const headers = getOutletHeaders(businessId, outletId);
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.TABLES.UPDATE(id),
        tableData,
        {
          headers: {
            ...headers,
            ...apiClient.defaults.headers,
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  delete: async (id, businessId = null, outletId = null) => {
    try {
      const headers = getOutletHeaders(businessId, outletId);
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.TABLES.DELETE(id),
        {
          headers: {
            ...headers,
            ...apiClient.defaults.headers,
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateStatus: async (id, status, businessId = null, outletId = null) => {
    try {
      const headers = getOutletHeaders(businessId, outletId);
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.TABLES.UPDATE_STATUS(id),
        { status },
        {
          headers: {
            ...headers,
            ...apiClient.defaults.headers,
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
