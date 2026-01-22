import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const shiftService = {
  // Get active shift for current user dengan timeout lebih pendek
  getActiveShift: async (recalculate = false) => {
    try {
      // ✅ OPTIMIZATION: Timeout 5 detik untuk POS yang butuh response cepat
      // ✅ FIX: Tambahkan parameter recalculate untuk mendapatkan data terbaru
      const params = recalculate ? { recalculate: true } : {};
      const response = await apiClient.get('/v1/shifts/active', {
        params,
        timeout: 5000, // 5 detik timeout untuk response cepat di POS
      });
      return { success: true, data: response.data };
    } catch (error) {
      // Jangan spam console dengan network error
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Silent timeout - already handled in component
        return {
          success: false,
          error: 'Request timeout. Pastikan backend berjalan.',
          isTimeout: true,
        };
      }

      if (error.request && !error.response) {
        // Network error - tidak spam console
        // Silent network error - already handled in component
        return {
          success: false,
          error: 'Tidak dapat terhubung ke server',
          isNetworkError: true,
        };
      }

      return handleApiError(error);
    }
  },

  // Get shift summary for dashboard
  getShiftSummary: async () => {
    try {
      const response = await apiClient.get('/v1/shifts/summary');
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Open new shift
  openShift: async shiftData => {
    try {
      const response = await apiClient.post('/v1/shifts/open', shiftData);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Close shift
  closeShift: async (shiftId, closeData) => {
    try {
      const response = await apiClient.post(
        `/v1/shifts/${shiftId}/close`,
        closeData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Get shift history
  getHistory: async (params = {}) => {
    try {
      const response = await apiClient.get('/v1/shifts/history', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Backward-compatible alias for components expecting getShiftHistory
  getShiftHistory: async (params = {}) => {
    return await shiftService.getHistory(params);
  },

  // Get shift by ID
  getById: async shiftId => {
    try {
      console.log('🔍 ShiftService: Getting shift by ID:', shiftId);
      console.log(
        '🔍 ShiftService: API client base URL:',
        apiClient.defaults.baseURL
      );
      console.log('🔍 ShiftService: Headers:', apiClient.defaults.headers);

      const response = await apiClient.get(`/v1/shifts/${shiftId}`);
      console.log('🔍 ShiftService: Raw API response:', response);
      console.log('🔍 ShiftService: Response data:', response.data);

      // Backend already returns { success: true, data: {...} }
      // So we should return response.data directly
      return response.data;
    } catch (error) {
      console.error('❌ ShiftService: Error getting shift by ID:', error);
      return handleApiError(error);
    }
  },

  // Backward-compatible alias for components expecting getShiftDetail
  getShiftDetail: async shiftId => {
    return await shiftService.getById(shiftId);
  },

  // Get all active shifts (for monitoring)
  getActiveShifts: async () => {
    try {
      const response = await apiClient.get('/v1/shifts/active-all');
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Recalculate shift data
  recalculateShift: async shiftId => {
    try {
      const response = await apiClient.post(
        `/v1/shifts/${shiftId}/recalculate`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Get shift closing report with sold items
  getShiftClosingReport: async shiftId => {
    try {
      const response = await apiClient.get(
        `/v1/shifts/${shiftId}/closing-report`
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};
