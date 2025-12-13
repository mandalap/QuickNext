import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

const payrollService = {
  /**
   * Get list of payrolls
   */
  async getPayrolls(params = {}) {
    try {
      const response = await apiClient.get('/v1/payrolls', { params });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Calculate payroll (preview)
   */
  async calculatePayroll(data) {
    try {
      const response = await apiClient.post('/v1/payrolls/calculate', data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Generate payroll
   */
  async generatePayroll(data) {
    try {
      const response = await apiClient.post('/v1/payrolls', data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Generate payrolls for all employees
   */
  async generateAllPayrolls(data) {
    try {
      const response = await apiClient.post('/v1/payrolls/generate-all', data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get payroll detail
   */
  async getPayroll(id) {
    try {
      const response = await apiClient.get(`/v1/payrolls/${id}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Update payroll
   */
  async updatePayroll(id, data) {
    try {
      const response = await apiClient.put(`/v1/payrolls/${id}`, data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Delete payroll
   */
  async deletePayroll(id) {
    try {
      const response = await apiClient.delete(`/v1/payrolls/${id}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get payroll statistics
   */
  async getStats(params = {}) {
    try {
      const response = await apiClient.get('/v1/payrolls/stats', { params });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default payrollService;

