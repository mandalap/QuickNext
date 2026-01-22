import apiClient from '../utils/apiClient';

// Helper to build clean params (remove undefined/null/empty values)
const buildParams = (params) => {
  const cleanParams = {
    date_range: params.date_range || 'month',
  };
  
  // Only add custom_start and custom_end if they are provided and valid
  if (params.custom_start) {
    cleanParams.custom_start = params.custom_start;
  }
  if (params.custom_end) {
    cleanParams.custom_end = params.custom_end;
  }
  
  return cleanParams;
};

const promoUsageService = {
  /**
   * Get promo usage analytics
   */
  async getPromoUsageAnalytics(params = {}) {
    try {
      const apiParams = buildParams(params);
      
      const response = await apiClient.get('/v1/promo-usage/analytics', {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching promo usage analytics:', error);
      // ✅ FIX: Log detailed error for debugging
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data,
          params: params,
        });
      }
      throw error;
    }
  },

  /**
   * Get discount effectiveness analysis
   */
  async getDiscountEffectiveness(params = {}) {
    try {
      const apiParams = buildParams(params);
      
      const response = await apiClient.get('/v1/promo-usage/effectiveness', {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching discount effectiveness:', error);
      // ✅ FIX: Log detailed error for debugging
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data,
          params: params,
        });
      }
      throw error;
    }
  },

  /**
   * Get discount trends over time
   */
  async getDiscountTrends(params = {}) {
    try {
      const apiParams = buildParams(params);
      
      const response = await apiClient.get('/v1/promo-usage/trends', {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching discount trends:', error);
      // ✅ FIX: Log detailed error for debugging
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data,
          params: params,
        });
      }
      throw error;
    }
  },
};

export default promoUsageService;
