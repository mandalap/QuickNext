import apiClient from '../utils/apiClient';

const cashierPerformanceService = {
  /**
   * Get cashier performance analytics
   */
  async getPerformanceAnalytics(params = {}) {
    try {
      // ✅ FIX: Remove duplicate parameters - only use date_range, not dateRange
      const apiParams = {
        date_range: params.date_range || params.dateRange || 'today',
      };

      // Handle custom date range
      if (params.customStart && params.customEnd) {
        apiParams.custom_start = params.customStart;
        apiParams.custom_end = params.customEnd;
        // Don't send start_date and end_date if custom_start and custom_end are provided
      }

      // ✅ FIX: Use longer timeout for cashier-performance endpoints
      const response = await apiClient.get(
        '/v1/cashier-performance/analytics',
        {
          params: apiParams, // Don't spread params to avoid duplicates
          timeout: 30000, // 30 seconds for complex queries
        }
      );
      return response.data;
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching cashier performance analytics:', error);
      }
      throw error;
    }
  },

  /**
   * Get cashier session history
   */
  async getSessionHistory(params = {}) {
    try {
      // ✅ FIX: Remove duplicate parameters
      const apiParams = {
        date_range: params.date_range || params.dateRange || 'week',
        page: params.page || 1,
      };

      // Handle custom date range
      if (params.customStart && params.customEnd) {
        apiParams.custom_start = params.customStart;
        apiParams.custom_end = params.customEnd;
      }

      // ✅ FIX: Use longer timeout for cashier-performance endpoints
      const response = await apiClient.get('/v1/cashier-performance/sessions', {
        params: apiParams, // Don't spread params to avoid duplicates
        timeout: 30000, // 30 seconds for complex queries
      });
      return response.data;
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching cashier session history:', error);
      }
      throw error;
    }
  },

  /**
   * Get cashier detailed performance
   */
  async getCashierDetail(cashierId, params = {}) {
    try {
      // ✅ FIX: Remove duplicate parameters
      const apiParams = {
        date_range: params.date_range || params.dateRange || 'month',
      };

      // Handle custom date range
      if (params.customStart && params.customEnd) {
        apiParams.custom_start = params.customStart;
        apiParams.custom_end = params.customEnd;
      }

      // ✅ FIX: Use longer timeout for cashier-performance endpoints
      const response = await apiClient.get(
        `/v1/cashier-performance/cashiers/${cashierId}`,
        {
          params: apiParams, // Don't spread params to avoid duplicates
          timeout: 30000, // 30 seconds for complex queries
        }
      );
      return response.data;
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching cashier detail:', error);
      }
      throw error;
    }
  },
};

export default cashierPerformanceService;
