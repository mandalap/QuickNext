import apiClient from '../utils/apiClient';
import { API_CONFIG } from '../config/api.config';

const outletService = {
  async getAll() {
    try {
      const businessId = localStorage.getItem('currentBusinessId');

      // ✅ FIX: Don't make request if no business ID
      // This is normal for users who haven't created business yet
      if (!businessId) {
        // Don't log as warning - this is expected behavior
        return { success: false, error: 'Business ID required', data: [] };
      }

      // ✅ FIX: Use TIMEOUT_LONG for outlets endpoint (20 seconds)
      // Outlets endpoint may take longer due to relationships loading
      const response = await apiClient.get('/v1/outlets', {
        timeout: API_CONFIG.TIMEOUT_LONG, // 20 seconds
      });

      // ✅ FIX: Ensure data is an array
      const outlets = Array.isArray(response.data) ? response.data : [];
      return { success: true, data: outlets };
    } catch (error) {
      // ✅ FIX: Handle timeout errors specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.warn('⚠️ Outlet fetch timeout - server may be slow or overloaded');
        return {
          success: false,
          error: 'Request timeout. Server mungkin sedang sibuk. Silakan refresh halaman.',
          data: [],
          isTimeout: true,
        };
      }
      // ✅ FIX: Handle 404 as expected (no outlets yet)
      if (error.response?.status === 404) {
        console.log('🔍 No outlets found (404) - this is normal for new businesses');
        return { success: true, data: [] };
      }
      
      // ✅ FIX: If unauthorized (403), clear business ID from localStorage
      if (error.response?.status === 403) {
        const businessId = localStorage.getItem('currentBusinessId');
        if (businessId) {
          console.warn('⚠️ Unauthorized access to business, clearing business ID');
        }
        localStorage.removeItem('currentBusinessId');
        localStorage.removeItem('currentOutletId');
        return { success: false, error: 'Unauthorized access to business', data: [] };
      }
      
      // ✅ FIX: Handle "Business not found" error
      if (error.response?.status === 400 || error.response?.data?.error === 'Business not found') {
        console.warn('⚠️ Business not found, clearing business ID');
        localStorage.removeItem('currentBusinessId');
        localStorage.removeItem('currentOutletId');
        return { success: false, error: 'Business not found', data: [] };
      }
      
      // ✅ FIX: Ignore cancelled requests (duplicate request prevention)
      const isCanceled = error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancelled') || error.message?.includes('canceled');
      if (isCanceled) {
        // Silently ignore cancelled requests
        return { success: false, error: null, data: [], cancelled: true };
      }
      
      // ✅ FIX: Handle network errors (no response from server)
      if (!error.response && error.request) {
        console.error('❌ Network error fetching outlets:', error.message);
        return {
          success: false,
          error: 'Tidak dapat terhubung ke server. Pastikan backend berjalan dan coba lagi.',
          data: [],
          isNetworkError: true,
        };
      }
      
      console.error('Error fetching outlets:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch outlets', 
        data: [] 
      };
    }
  },

  async getById(id) {
    try {
      // ✅ FIX: Use apiClient instead of fetch
      const response = await apiClient.get(`/v1/outlets/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching outlet:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch outlet',
      };
    }
  },

  async create(outletData) {
    try {
      // ✅ FIX: Use apiClient instead of fetch
      const response = await apiClient.post('/v1/outlets', outletData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error creating outlet:', error);
      
      // ✅ FIX: Handle "Business not found" error
      if (error.response?.status === 400 || error.response?.data?.error === 'Business not found') {
        console.warn('⚠️ Business not found, clearing business ID');
        localStorage.removeItem('currentBusinessId');
        localStorage.removeItem('currentOutletId');
        return {
          success: false,
          error: 'Business not found',
          errors: error.response?.data?.errors,
        };
      }
      
      // ✅ FIX: Include full error response data for subscription limit errors
      const errorData = error.response?.data || {};
      const isSubscriptionLimit = errorData.error === 'subscription_limit_reached';
      
      // ✅ FIX: Include full error data for subscription limit errors
      const result = {
        success: false,
        error: errorData.error || error.message || 'Failed to create outlet',
        errors: errorData.errors,
        ...(isSubscriptionLimit ? errorData : {}),
      };
      
      // ✅ FIX: Ensure message is included for subscription limit errors
      if (isSubscriptionLimit && errorData.message) {
        result.message = errorData.message;
      }
      if (isSubscriptionLimit && errorData.upgrade_message) {
        result.upgrade_message = errorData.upgrade_message;
      }
      if (isSubscriptionLimit && errorData.limits) {
        result.limits = errorData.limits;
      }
      
      return result;
    }
  },

  async update(id, outletData) {
    try {
      // ✅ FIX: Use apiClient with increased timeout for outlet update
      const response = await apiClient.put(`/v1/outlets/${id}`, outletData, {
        timeout: 30000, // ✅ NEW: 30 seconds timeout for outlet update
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error updating outlet:', error);
      
      // ✅ NEW: Handle timeout errors specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return {
          success: false,
          error: 'Request timeout. Silakan coba lagi atau periksa koneksi internet Anda.',
          errors: {},
          isTimeout: true,
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update outlet',
        errors: error.response?.data?.errors,
      };
    }
  },

  async delete(id) {
    try {
      // ✅ FIX: Use apiClient instead of fetch
      const response = await apiClient.delete(`/v1/outlets/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error deleting outlet:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete outlet',
      };
    }
  },

  // Payment Gateway Configuration Methods
  async getPaymentGatewayConfig(outletId, gateway = 'midtrans') {
    try {
      // ✅ FIX: Use apiClient instead of fetch
      const response = await apiClient.get(`/v1/outlets/${outletId}/payment-gateway-config`, {
        params: { gateway },
      });
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error('Error fetching payment gateway config:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch payment gateway config',
      };
    }
  },

  async updatePaymentGatewayConfig(outletId, config) {
    try {
      // ✅ FIX: Use apiClient instead of fetch
      const response = await apiClient.post(`/v1/outlets/${outletId}/payment-gateway-config`, config);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error('Error updating payment gateway config:', error);
      return {
        success: false,
        error: error.response?.data?.errors || error.response?.data?.error || error.message || 'Failed to update payment gateway config',
      };
    }
  },

  async deletePaymentGatewayConfig(outletId, gateway = 'midtrans') {
    try {
      // ✅ FIX: Use apiClient instead of fetch
      const response = await apiClient.delete(`/v1/outlets/${outletId}/payment-gateway-config`, {
        params: { gateway },
      });
      return { success: true, message: response.data?.message || 'Payment gateway config deleted' };
    } catch (error) {
      console.error('Error deleting payment gateway config:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete payment gateway config',
      };
    }
  },
};

export default outletService;
