import apiClient from '../utils/apiClient';

const selfServiceApi = {
  // Get self-service orders with filters
  getOrders: async (params = {}) => {
    const response = await apiClient.get('/v1/self-service-management/orders', {
      params,
    });
    return response.data;
  },

  // Get self-service statistics
  getStats: async (params = {}) => {
    const response = await apiClient.get('/v1/self-service-management/stats', {
      params,
    });
    return response.data;
  },

  // Update order status
  updateOrderStatus: async (orderId, status, notes = '') => {
    const response = await apiClient.put(
      `/v1/self-service-management/orders/${orderId}/status`,
      {
        status,
        notes,
      }
    );
    return response.data;
  },

  // Get all tables
  getTables: async (params = {}) => {
    const response = await apiClient.get('/v1/self-service-management/tables', {
      params,
    });
    return response.data;
  },

  // Create new table
  createTable: async tableData => {
    const response = await apiClient.post(
      '/v1/self-service-management/tables',
      tableData
    );
    return response.data;
  },

  // Update table status
  updateTableStatus: async (tableId, status) => {
    const response = await apiClient.put(
      `/v1/self-service-management/tables/${tableId}/status`,
      {
        status,
      }
    );
    return response.data;
  },

  // Delete table
  deleteTable: async tableId => {
    const response = await apiClient.delete(
      `/v1/self-service-management/tables/${tableId}`
    );
    return response.data;
  },

  // Generate QR code for table
  generateQRCode: async tableId => {
    const response = await apiClient.get(
      `/v1/self-service-management/tables/${tableId}/qr-code`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  // Get QR menu statistics
  getQRMenuStats: async () => {
    const response = await apiClient.get(
      '/v1/self-service-management/qr-menus'
    );
    return response.data;
  },

  // Get outlets for table creation
  getOutlets: async () => {
    const response = await apiClient.get('/v1/outlets');
    return response.data;
  },
};

export default selfServiceApi;
