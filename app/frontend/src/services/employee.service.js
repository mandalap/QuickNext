// ==========================================
// 12. src/services/employee.service.js
// ==========================================
import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const employeeService = {
  getAll: async params => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.EMPLOYEES.LIST,
        { params }
      );
      // ✅ FIX: Backend returns array directly, wrap it in data property
      const responseData = response.data;
      if (Array.isArray(responseData)) {
        return { success: true, data: responseData };
      } else if (responseData && Array.isArray(responseData.data)) {
        return { success: true, data: responseData.data };
      } else {
        return { success: true, data: [] };
      }
    } catch (error) {
      return handleApiError(error);
    }
  },

  getById: async id => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.EMPLOYEES.DETAIL(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async employeeData => {
    try {
      console.log('📝 Creating employee:', employeeData);
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.EMPLOYEES.CREATE,
        employeeData
      );
      console.log('✅ Employee created:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      // ✅ FIX: Don't log validation errors (422) as errors, they're expected
      if (error.response?.status === 422) {
        console.log('⚠️ Validation error:', error.response?.data?.errors || error.response?.data);
      } 
      // ✅ FIX: Don't log subscription limit errors as errors (403), they're handled gracefully
      else if (error.response?.status === 403 && error.response?.data?.error === 'subscription_limit_reached') {
        console.log('⚠️ Subscription limit reached:', error.response?.data?.message);
      } 
      else {
        console.error('❌ Create employee error:', error.response?.data || error);
      }
      return handleApiError(error);
    }
  },

  update: async (id, employeeData) => {
    try {
      console.log('📝 Updating employee:', id, employeeData);
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.EMPLOYEES.UPDATE(id),
        employeeData
      );
      console.log('✅ Employee updated:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Update employee error:', error.response?.data || error);
      return handleApiError(error);
    }
  },

  delete: async id => {
    try {
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.EMPLOYEES.DELETE(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getPerformance: async (id, params) => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.EMPLOYEES.PERFORMANCE(id),
        { params }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
