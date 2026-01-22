// ==========================================
// 19. src/services/selfService.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const selfServiceService = {
  getMenu: async tableQr => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.SELF_SERVICE.GET_MENU(tableQr)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  placeOrder: async (tableQr, orderData) => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.SELF_SERVICE.PLACE_ORDER(tableQr),
        orderData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getOrderStatus: async orderNumber => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.SELF_SERVICE.ORDER_STATUS(orderNumber)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
