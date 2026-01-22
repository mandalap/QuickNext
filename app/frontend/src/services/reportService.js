import apiClient from '../utils/apiClient';
import axios from 'axios';

export const reportService = {
  // Get sales summary report
  getSalesSummary: async (params = {}) => {
    try {
      const apiParams = {
        chart_type: params.chartType || 'daily',
        date_range: params.dateRange || 'today',
      };
      if (params.customStart && params.customEnd) {
        apiParams.custom_start = params.customStart;
        apiParams.custom_end = params.customEnd;
        apiParams.start_date = params.customStart;
        apiParams.end_date = params.customEnd;
      }

      console.log(
        '📊 reportService.getSalesSummary - Request params:',
        apiParams
      );

      const response = await apiClient.get('/v1/reports/sales/summary', {
        params: apiParams,
      });

      console.log('✅ reportService.getSalesSummary - Success:', response.data);
      return response.data;
    } catch (error) {
      // ✅ FIX: Detailed error logging
      console.error('❌ reportService.getSalesSummary - Error Details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params,
        },
        fullError: error,
      });

      // ✅ FIX: Log error response if available
      if (error.response?.data) {
        console.error('❌ Backend Error Response:', {
          success: error.response.data.success,
          message: error.response.data.message,
          error: error.response.data.error,
        });
      }

      throw error;
    }
  },

  // Get sales detail report
  getSalesDetail: async (params = {}) => {
    try {
      const apiParams = {
        date_range: params.dateRange || 'today',
        page: params.page || 1,
        per_page: params.perPage || 10,
        search: params.search || '',
        status: params.status || 'all',
        payment_method: params.paymentMethod || 'all',
      };
      if (params.customStart && params.customEnd) {
        apiParams.custom_start = params.customStart;
        apiParams.custom_end = params.customEnd;
        apiParams.start_date = params.customStart;
        apiParams.end_date = params.customEnd;
      }
      const response = await apiClient.get('/v1/reports/sales/detail', {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sales detail:', error);
      throw error;
    }
  },

  // Get sales chart data for visualization
  getSalesChartData: async (params = {}) => {
    try {
      const response = await apiClient.get('/v1/reports/sales/chart-data', {
        params: {
          date_range: params.date_range || 'today',
          custom_start: params.custom_start,
          custom_end: params.custom_end,
          chart_type: params.chart_type || 'daily',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sales chart data:', error);
      throw error;
    }
  },

  // Get payment type report
  getPaymentTypeReport: async (params = {}) => {
    try {
      const apiParams = {
        date_range: params.dateRange || 'today',
      };
      if (params.customStart && params.customEnd) {
        apiParams.custom_start = params.customStart;
        apiParams.custom_end = params.customEnd;
        apiParams.start_date = params.customStart;
        apiParams.end_date = params.customEnd;
      }
      const response = await apiClient.get('/v1/reports/payment-types', {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching payment type report:', error);
      throw error;
    }
  },

  // Get product sales report
  getProductSales: async (params = {}) => {
    try {
      // ✅ FIX: Ensure all parameters use underscore format
      const apiParams = {};

      // Date range parameter
      if (params.dateRange) {
        apiParams.date_range = params.dateRange;
      } else {
        apiParams.date_range = 'today';
      }

      // Pagination
      if (params.page) apiParams.page = params.page;
      if (params.perPage) apiParams.per_page = params.perPage;

      // Search and sorting
      if (params.search) apiParams.search = params.search;
      if (params.sortBy) apiParams.sort_by = params.sortBy;
      if (params.sortOrder) apiParams.sort_order = params.sortOrder;

      // Custom date range
      if (params.customStart && params.customEnd) {
        apiParams.custom_start = params.customStart;
        apiParams.custom_end = params.customEnd;
        apiParams.start_date = params.customStart;
        apiParams.end_date = params.customEnd;
      }

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Product Sales API Params:', apiParams);
      }

      const response = await apiClient.get('/v1/reports/products/sales', {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      // Only log full error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error fetching product sales:', error);
      } else {
        console.error('❌ Error fetching product sales');
      }
      throw error;
    }
  },

  // Get category sales report
  getCategorySales: async (params = {}) => {
    try {
      const apiParams = {
        date_range: params.dateRange || 'today',
        page: params.page || 1,
        per_page: params.perPage || 10,
        sort_by: params.sortBy || 'total_revenue',
        sort_order: params.sortOrder || 'desc',
      };
      if (params.customStart && params.customEnd) {
        apiParams.custom_start = params.customStart;
        apiParams.custom_end = params.customEnd;
        apiParams.start_date = params.customStart;
        apiParams.end_date = params.customEnd;
      }
      const response = await apiClient.get('/v1/reports/categories/sales', {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching category sales:', error);
      throw error;
    }
  },

  // Get inventory status report
  getInventoryStatus: async (params = {}) => {
    try {
      const response = await apiClient.get('/v1/reports/inventory/status', {
        params: {
          search: params.search || '',
          category_id: params.categoryId || '',
          stock_status: params.stockStatus || 'all',
          sort_by: params.sortBy || 'name',
          sort_order: params.sortOrder || 'asc',
          page: params.page || 1,
          per_page: params.perPage || 10,
        },
      });
      return response.data;
    } catch (error) {
      // Ignore cancelled errors (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancelled') || error.message?.includes('canceled') || error.message?.includes('Duplicate request cancelled');
      if (isCanceled) {
        console.log('⏭️ Inventory status request cancelled (duplicate request prevention)');
        throw error; // Still throw, but React Query will handle it gracefully
      }
      console.error('Error fetching inventory status:', error);
      throw error;
    }
  },

  // Get stock movements report
  getStockMovements: async (params = {}) => {
    try {
      // Default to 'this-month' to show more data
      const apiParams = {
        date_range: params.dateRange || 'this-month',
        type: params.type || 'all',
        reason: params.reason || 'all',
        product_id: params.productId || '',
        sort_by: params.sortBy || 'created_at',
        sort_order: params.sortOrder || 'desc',
        page: params.page || 1,
        per_page: params.perPage || 10,
      };
      if (params.customStart && params.customEnd) {
        apiParams.custom_start = params.customStart;
        apiParams.custom_end = params.customEnd;
        apiParams.start_date = params.customStart;
        apiParams.end_date = params.customEnd;
      }
      const response = await apiClient.get('/v1/reports/inventory/movements', {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      throw error;
    }
  },

  // Get categories for inventory filter
  getInventoryCategories: async () => {
    try {
      const response = await apiClient.get('/v1/reports/inventory/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory categories:', error);
      throw error;
    }
  },

  // Get products for inventory filter
  getInventoryProducts: async () => {
    try {
      const response = await apiClient.get('/v1/reports/inventory/products');
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory products:', error);
      throw error;
    }
  },

  // Get commission report
  getCommissionReport: async (params = {}) => {
    try {
      const apiParams = {
        date_range: params.dateRange || 'today',
      };
      if (params.customStart && params.customEnd) {
        apiParams.custom_start = params.customStart;
        apiParams.custom_end = params.customEnd;
        apiParams.start_date = params.customStart;
        apiParams.end_date = params.customEnd;
      }
      // ✅ FIX: Increase timeout for commission report (complex query may take longer)
      const response = await apiClient.get('/v1/reports/commission', {
        params: apiParams,
        timeout: 30000, // 30 seconds for complex queries
      });
      return response.data;
    } catch (error) {
      // Ignore cancelled errors (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancelled') || error.message?.includes('canceled') || error.message?.includes('Duplicate request cancelled');
      if (isCanceled) {
        console.log('⏭️ Commission report request cancelled (duplicate request prevention)');
        throw error; // Still throw, but React Query will handle it gracefully
      }
      console.error('Error fetching commission report:', error);
      throw error;
    }
  },

  // Export reports
  exportReport: async (type, format, params = {}) => {
    try {
      // For PDF, use text/html response type, for others use blob
      const responseType = format === 'pdf' ? 'text' : 'blob';

      // ✅ FIX: Build params object properly, avoid duplicates
      const apiParams = {
        format,
      };

      // Date range - use date_range (backend expects this)
      if (params.dateRange) {
        apiParams.date_range = params.dateRange;
      } else {
        apiParams.date_range = 'today';
      }

      // Custom date range
      if (params.customStart && params.customEnd) {
        apiParams.custom_start = params.customStart;
        apiParams.custom_end = params.customEnd;
      }

      // Filters
      if (params.search) {
        apiParams.search = params.search;
      }
      if (params.status && params.status !== 'all') {
        apiParams.status = params.status;
      }
      if (params.paymentMethod && params.paymentMethod !== 'all') {
        apiParams.paymentMethod = params.paymentMethod;
        apiParams.payment_method = params.paymentMethod; // Also send snake_case for compatibility
      }

      console.log('📤 Export request:', { type, format, params: apiParams });

      const response = await apiClient.get(`/v1/reports/export/${type}`, {
        params: apiParams,
        responseType: responseType,
        validateStatus: function (status) {
          // Accept both success (200) and error responses to handle them properly
          return status >= 200 && status < 500;
        },
      });

      // Check if response is an error (JSON error response)
      if (response.status >= 400) {
        let errorMessage = 'Gagal mengekspor laporan';
        try {
          if (responseType === 'blob') {
            const text = await response.data.text();
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorMessage;
          } else {
            const errorData =
              typeof response.data === 'string'
                ? JSON.parse(response.data)
                : response.data;
            errorMessage = errorData.message || errorMessage;
          }
        } catch (e) {
          // If not JSON, use the text as error message
          errorMessage =
            typeof response.data === 'string' ? response.data : errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Handle PDF (HTML) - open in new window for printing
      if (format === 'pdf') {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(response.data);
          newWindow.document.close();
          // Auto trigger print dialog
          setTimeout(() => {
            newWindow.print();
          }, 500);
        } else {
          // Fallback: create blob and download
          const blob = new Blob([response.data], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute(
            'download',
            `report_${type}_${new Date().toISOString().split('T')[0]}.html`
          );
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        }
        return { success: true };
      }

      // Handle other formats (CSV, Excel) - download as blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `report_${type}_${new Date().toISOString().split('T')[0]}.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error exporting report:', error);
      // If error has response data, try to extract message
      if (error.response && error.response.data) {
        // If response is blob, try to parse it
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || 'Gagal mengekspor laporan');
          } catch (e) {
            throw new Error('Gagal mengekspor laporan');
          }
        }
      }
      throw error;
    }
  },
};

export default reportService;
