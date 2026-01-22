import apiClient from '../utils/apiClient';

const cashierClosingService = {
  /**
   * Get cashier closing summary
   */
  async getClosingSummary(params = {}) {
    try {
      // ✅ FIX: Use longer timeout for cashier-closing endpoints
      const response = await apiClient.get('/v1/cashier-closing/summary', {
        params: {
          date: params.date || new Date().toISOString().split('T')[0],
          ...params,
        },
        timeout: 30000, // 30 seconds for complex queries
      });
      return response.data;
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching cashier closing summary:', error);
      }
      throw error;
    }
  },

  /**
   * Close cashier session
   */
  async closeSession(sessionData) {
    try {
      const response = await apiClient.post(
        '/v1/cashier-closing/close-session',
        sessionData
      );
      return response.data;
    } catch (error) {
      console.error('Error closing cashier session:', error);
      throw error;
    }
  },

  /**
   * Get cashier closing history
   */
  async getClosingHistory(params = {}) {
    try {
      const apiParams = {
        date_range: params.date_range || 'week',
        page: params.page || 1,
      };
      if (params.custom_start && params.custom_end) {
        apiParams.custom_start = params.custom_start;
        apiParams.custom_end = params.custom_end;
        apiParams.start_date = params.start_date || params.custom_start;
        apiParams.end_date = params.end_date || params.custom_end;
      }
      const response = await apiClient.get('/v1/cashier-closing/history', {
        params: apiParams,
        timeout: 30000, // 30 seconds for complex queries
      });
      return response.data;
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching cashier closing history:', error);
      }
      throw error;
    }
  },

  /**
   * Get cashier closing report
   */
  async getClosingReport(params = {}) {
    try {
      const apiParams = {
        date_range: params.date_range || 'month',
      };
      if (params.custom_start && params.custom_end) {
        apiParams.custom_start = params.custom_start;
        apiParams.custom_end = params.custom_end;
        apiParams.start_date = params.start_date || params.custom_start;
        apiParams.end_date = params.end_date || params.custom_end;
      }
      const response = await apiClient.get('/v1/cashier-closing/report', {
        params: apiParams,
        timeout: 30000, // 30 seconds for complex queries
      });
      return response.data;
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching cashier closing report:', error);
      }
      throw error;
    }
  },
};

export default cashierClosingService;
