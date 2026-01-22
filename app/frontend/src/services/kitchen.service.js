// ==========================================
// 10. src/services/kitchen.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

// Helper function to get outlet headers
const getOutletHeaders = () => {
  const currentOutletId = localStorage.getItem('currentOutletId');
  const currentBusinessId = localStorage.getItem('currentBusinessId');

  const headers = {};
  if (currentBusinessId) {
    headers['X-Business-Id'] = currentBusinessId;
  }
  if (currentOutletId) {
    headers['X-Outlet-Id'] = currentOutletId;
  }

  return headers;
};

export const kitchenService = {
  getOrders: async params => {
    try {
      const headers = getOutletHeaders();
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.KITCHEN.ORDERS,
        {
          params,
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

  getPendingOrders: async () => {
    try {
      const headers = getOutletHeaders();
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.KITCHEN.PENDING_ORDERS,
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

  updateStatus: async (orderId, status) => {
    try {
      const headers = getOutletHeaders();
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.KITCHEN.UPDATE_STATUS(orderId),
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

  // ✅ NEW: Confirm order manually (for pending orders that are already paid)
  confirmOrder: async orderId => {
    try {
      const headers = getOutletHeaders();
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.KITCHEN.CONFIRM_ORDER(orderId),
        {},
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

  // ✅ NEW: Get new order notifications
  getNewOrderNotifications: async () => {
    try {
      const headers = getOutletHeaders();
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.KITCHEN.NOTIFICATIONS,
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
