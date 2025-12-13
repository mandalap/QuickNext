// ==========================================
// 8. src/services/order.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const orderService = {
  getAll: async params => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.ORDERS.LIST, {
        params,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getById: async id => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.ORDERS.DETAIL(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async orderData => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.ORDERS.CREATE,
        orderData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  processPayment: async (orderId, paymentData) => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.ORDERS.PAYMENT(orderId),
        paymentData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  cancel: async orderId => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.ORDERS.CANCEL(orderId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  refund: async orderId => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.ORDERS.REFUND(orderId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  update: async (orderId, orderData) => {
    try {
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.ORDERS.UPDATE(orderId),
        orderData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Add items to existing order (for kasir - cannot edit existing items)
  addItems: async (orderId, items) => {
    try {
      const response = await apiClient.post(`/v1/orders/${orderId}/add-items`, {
        items,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Apply discount to existing order (for kasir)
  applyDiscount: async (orderId, discountData) => {
    try {
      const response = await apiClient.post(
        `/v1/orders/${orderId}/apply-discount`,
        {
          discount_amount: discountData.discount_amount,
          discount_code: discountData.discount_code || null,
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  printReceipt: async orderId => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.ORDERS.RECEIPT(orderId)
      );
      // Unwrap backend envelope { success, data }
      const payload = response?.data?.data ?? response?.data;
      return { success: true, data: payload };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Get unpaid orders (for laundry deferred payment feature)
  getUnpaidOrders: async params => {
    try {
      // ✅ OPTIMIZATION: Timeout lebih pendek untuk unpaid orders (biasanya data kecil)
      const response = await apiClient.get('/v1/orders/unpaid', {
        params,
        timeout: 8000, // 8 detik timeout
      });
      return { success: true, data: response.data };
    } catch (error) {
      // Handle timeout khusus
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Silent timeout - already handled with fallback in component
        return {
          success: false,
          error: 'Request timeout',
          isTimeout: true,
        };
      }
      return handleApiError(error);
    }
  },

  // Update order status (for laundry status flow)
  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await apiClient.patch(`/v1/orders/${orderId}/status`, {
        status,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ✅ NEW: Sync payment status from Midtrans (for orders that are paid but status not updated)
  syncPaymentStatus: async orderId => {
    try {
      const response = await apiClient.post(
        `/v1/orders/${orderId}/sync-payment`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ✅ NEW: Delete order (for owner/admin only - if there's an error)
  delete: async orderId => {
    try {
      const response = await apiClient.delete(`/v1/orders/${orderId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
