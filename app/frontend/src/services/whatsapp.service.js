// WhatsApp Configuration Service
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const whatsappService = {
  /**
   * Get WhatsApp configuration for an outlet
   */
  getConfig: async outletId => {
    try {
      const response = await apiClient.get(
        `/v1/outlets/${outletId}/whatsapp-config`
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Update WhatsApp configuration for an outlet
   */
  updateConfig: async (outletId, config) => {
    try {
      const response = await apiClient.post(
        `/v1/outlets/${outletId}/whatsapp-config`,
        config
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Test WhatsApp connection by sending a test message
   */
  testConnection: async (outletId, phoneNumber) => {
    try {
      const response = await apiClient.post(`/v1/whatsapp/test`, {
        outlet_id: outletId,
        phone_number: phoneNumber,
      });

      // Backend returns { success: true/false, message: "...", data: {...} }
      const responseData = response.data || {};

      return {
        success: responseData.success === true,
        message:
          responseData.message ||
          (responseData.success
            ? 'Pesan test berhasil dikirim!'
            : 'Gagal mengirim pesan test'),
        data: responseData.data || responseData,
        error: responseData.success
          ? null
          : responseData.message ||
            responseData.error ||
            'Gagal mengirim pesan test',
      };
    } catch (error) {
      // Handle API errors
      const errorResponse = handleApiError(error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        errorResponse.message ||
        errorResponse.error ||
        error.message ||
        'Terjadi kesalahan saat mengirim pesan test';

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  },

  /**
   * Send payment receipt via WhatsApp
   */
  sendReceipt: async (orderId, customMessage = null) => {
    try {
      // ✅ FIX: Use correct endpoint path - /v1/whatsapp/orders/{order}/receipt
      const response = await apiClient.post(
        `/v1/whatsapp/orders/${orderId}/receipt`,
        {
          custom_message: customMessage,
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default whatsappService;
