import apiClient from '../utils/apiClient';
import axios from 'axios';

class CustomerReportService {
  /**
   * Get customer analytics and statistics
   */
  async getAnalytics(params = {}) {
    try {
      const response = await apiClient.get('/v1/customer-reports/analytics', {
        params: {
          date_range: params.date_range || 'month',
          ...params,
        },
        timeout: 30000, // 30 seconds for complex analytics queries
      });
      return response.data;
    } catch (error) {
      // ✅ FIX: Ignore cancelled requests (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancelled') || error.message?.includes('canceled') || error.message?.includes('Duplicate request cancelled');
      if (isCanceled) {
        console.log('⏭️ Customer analytics request cancelled (duplicate request prevention)');
        throw error; // Re-throw to let React Query handle it
      }
      // Suppress timeout errors - they will be retried by React Query
      const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
      if (isTimeout) {
        console.warn('⚠️ Customer analytics request timeout (will retry):', error.message);
        throw error;
      }
      console.error('Error fetching customer analytics:', error);
      throw error;
    }
  }

  /**
   * Get top customers by spending
   */
  async getTopCustomers(params = {}) {
    try {
      const response = await apiClient.get(
        '/v1/customer-reports/top-customers',
        {
          params: {
            date_range: params.date_range || 'month',
            limit: params.limit || 10,
            ...params,
          },
          timeout: 30000, // 30 seconds for complex queries
        }
      );
      return response.data;
    } catch (error) {
      // ✅ FIX: Ignore cancelled requests (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancelled') || error.message?.includes('canceled') || error.message?.includes('Duplicate request cancelled');
      if (isCanceled) {
        console.log('⏭️ Top customers request cancelled (duplicate request prevention)');
        throw error; // Re-throw to let React Query handle it
      }
      const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
      if (isTimeout) {
        console.warn('⚠️ Top customers request timeout (will retry):', error.message);
        throw error;
      }
      console.error('Error fetching top customers:', error);
      throw error;
    }
  }

  /**
   * Get customer demographics
   */
  async getDemographics() {
    try {
      const response = await apiClient.get('/v1/customer-reports/demographics', {
        timeout: 30000, // 30 seconds for complex queries
      });
      return response.data;
    } catch (error) {
      // ✅ FIX: Ignore cancelled requests (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancelled') || error.message?.includes('canceled') || error.message?.includes('Duplicate request cancelled');
      if (isCanceled) {
        console.log('⏭️ Customer demographics request cancelled (duplicate request prevention)');
        throw error; // Re-throw to let React Query handle it
      }
      const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
      if (isTimeout) {
        console.warn('⚠️ Customer demographics request timeout (will retry):', error.message);
        throw error;
      }
      console.error('Error fetching customer demographics:', error);
      throw error;
    }
  }

  /**
   * Get customer list with filters
   */
  async getCustomerList(params = {}) {
    try {
      const response = await apiClient.get('/v1/customer-reports/customers', {
        params: {
          page: params.page || 1,
          limit: params.limit || 15,
          search: params.search || '',
          sort_by: params.sort_by || 'total_spent',
          sort_order: params.sort_order || 'desc',
          ...params,
        },
        timeout: 30000, // 30 seconds for complex queries
      });
      return response.data;
    } catch (error) {
      // ✅ FIX: Ignore cancelled requests (duplicate request prevention)
      if (
        error.name === 'CanceledError' ||
        error.code === 'ERR_CANCELED' ||
        error.message?.includes('cancelled') ||
        error.message?.includes('canceled') ||
        error.message === 'Duplicate request cancelled'
      ) {
        // Silently ignore cancelled requests - this is expected behavior
        throw error; // Re-throw to let React Query handle it
      }
      const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
      if (isTimeout) {
        console.warn('⚠️ Customer list request timeout (will retry):', error.message);
        throw error;
      }
      console.error('Error fetching customer list:', error);
      throw error;
    }
  }

  /**
   * Get customer product purchase history
   */
  async getCustomerProductHistory(customerId, params = {}) {
    try {
      const response = await apiClient.get(
        `/v1/customer-reports/customers/${customerId}/products`,
        {
          params: {
            date_range: params.date_range || 'month',
            ...params,
          },
        }
      );
      return response.data;
    } catch (error) {
      // ✅ FIX: Ignore cancelled requests (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancelled') || error.message?.includes('canceled') || error.message?.includes('Duplicate request cancelled');
      if (isCanceled) {
        console.log('⏭️ Customer product history request cancelled (duplicate request prevention)');
        throw error; // Re-throw to let React Query handle it
      }
      console.error('Error fetching customer product history:', error);
      throw error;
    }
  }

  /**
   * Get customer product preferences
   */
  async getProductPreferences(params = {}) {
    try {
      const response = await apiClient.get(
        '/v1/customer-reports/product-preferences',
        {
          params: {
            date_range: params.date_range || 'month',
            ...params,
          },
          timeout: 30000, // 30 seconds for complex queries
        }
      );
      return response.data;
    } catch (error) {
      // ✅ FIX: Ignore cancelled requests (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancelled') || error.message?.includes('canceled') || error.message?.includes('Duplicate request cancelled');
      if (isCanceled) {
        console.log('⏭️ Product preferences request cancelled (duplicate request prevention)');
        throw error; // Re-throw to let React Query handle it
      }
      const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
      if (isTimeout) {
        console.warn('⚠️ Product preferences request timeout (will retry):', error.message);
        throw error;
      }
      console.error('Error fetching product preferences:', error);
      throw error;
    }
  }

  /**
   * Export customer data to CSV
   */
  async exportCustomers(params = {}) {
    try {
      const response = await apiClient.get('/v1/customer-reports/customers', {
        params: {
          ...params,
          export: 'csv',
          limit: 10000, // Large limit for export
        },
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `customer-report-${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error exporting customers:', error);
      throw error;
    }
  }
}

export default new CustomerReportService();
