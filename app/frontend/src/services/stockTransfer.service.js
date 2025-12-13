import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

const stockTransferService = {
  // Get all stock transfer requests
  async getAll(params = {}) {
    try {
      const response = await apiClient.get('/v1/stock-transfers', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching stock transfers:', error);
      return handleApiError(error);
    }
  },

  // Get single stock transfer request
  async getById(id) {
    try {
      const response = await apiClient.get(`/v1/stock-transfers/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stock transfer:', error);
      return handleApiError(error);
    }
  },

  // Create new stock transfer request
  async create(data) {
    try {
      const response = await apiClient.post('/v1/stock-transfers', data);
      return response.data;
    } catch (error) {
      console.error('Error creating stock transfer:', error);
      return handleApiError(error);
    }
  },

  // Update stock transfer status (approve/reject)
  async updateStatus(id, status, rejectionReason = null) {
    try {
      const response = await apiClient.post(`/v1/stock-transfers/${id}/status`, {
        status,
        rejection_reason: rejectionReason,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating stock transfer status:', error);
      return handleApiError(error);
    }
  },

  // Delete stock transfer request
  async delete(id) {
    try {
      const response = await apiClient.delete(`/v1/stock-transfers/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting stock transfer:', error);
      return handleApiError(error);
    }
  },
};

export default stockTransferService;
