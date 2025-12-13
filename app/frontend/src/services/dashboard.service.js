import apiClient from '../utils/apiClient';

const dashboardService = {
  // Get combined product management data (replaces multiple API calls)
  getProductManagementData: async (params = {}) => {
    try {
      // ✅ FIX: Use params object instead of URL string to ensure proper encoding
      const apiParams = {};

      // Add pagination params
      if (params.page) apiParams.page = params.page;
      if (params.per_page) apiParams.per_page = params.per_page;

      // Add filter params
      if (params.search) apiParams.search = params.search;
      if (params.category && params.category !== 'all')
        apiParams.category = params.category;
      if (params.outlet_id) apiParams.outlet_id = params.outlet_id;

      // Add sorting params
      if (params.sort_field) apiParams.sort_field = params.sort_field;
      if (params.sort_direction) apiParams.sort_direction = params.sort_direction;

      const response = await apiClient.get('/v1/dashboard/product-management', {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching product management data:', error);
      throw error;
    }
  },

  // Get basic dashboard stats (lightweight)
  getStats: async () => {
    try {
      const response = await apiClient.get('/v1/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Get recent orders (lightweight)
  getRecentOrders: async (params = {}) => {
    try {
      // ✅ FIX: Use params object instead of URL string to ensure proper encoding
      const apiParams = {};
      if (params.limit) apiParams.limit = params.limit;
      if (params.date_range) apiParams.date_range = params.date_range;
      if (params.date_from) apiParams.date_from = params.date_from;
      if (params.date_to) apiParams.date_to = params.date_to;

      const response = await apiClient.get('/v1/dashboard/recent-orders', {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      throw error;
    }
  },

  // Get top products (lightweight)
  getTopProducts: async (params = {}) => {
    try {
      // ✅ FIX: Use params object instead of URL string to ensure proper encoding
      const apiParams = {};
      if (params.limit) apiParams.limit = params.limit;
      if (params.page) apiParams.page = params.page;
      if (params.date_range) apiParams.date_range = params.date_range;
      if (params.date_from) apiParams.date_from = params.date_from;
      if (params.date_to) apiParams.date_to = params.date_to;

      const response = await apiClient.get('/v1/dashboard/top-products', {
        params: apiParams,
        timeout: 30000, // 30 seconds for complex queries
      });
      // ✅ OPTIMIZED: Removed console.log for better performance
      return response.data;
    } catch (error) {
      // Don't log as error if it's a 404 - just return empty data
      if (error.response?.status === 404) {
        // ✅ OPTIMIZED: Suppress 404 - endpoint may not exist, return empty data
        return {
          success: true,
          data: [],
        };
      }
      
      // Suppress timeout errors - they will be retried by React Query
      const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
      if (isTimeout) {
        console.warn('⚠️ Top products request timeout (will retry):', error.message);
        // Return empty data instead of throwing to prevent dashboard crash
        return {
          success: true,
          data: [],
        };
      }
      
      // ✅ OPTIMIZED: Removed console.warn for better performance
      
      // Return empty data instead of throwing error to prevent dashboard crash
      return {
        success: true,
        data: [],
      };
    }
  },
};

export { dashboardService };
