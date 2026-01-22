import axios from 'axios';
import { API_CONFIG } from '../config/api.config';

// Create axios instance with default config
const salesAPI = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // increase timeout to reduce client-side timeouts and avoid premature aborts
  withCredentials: true,
});

// Add request interceptor to include auth token
salesAPI.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add business context headers
    const currentBusinessId = localStorage.getItem('currentBusinessId');
    const currentOutletId = localStorage.getItem('currentOutletId');

    if (currentBusinessId) {
      config.headers['X-Business-Id'] = currentBusinessId;
    }

    if (currentOutletId) {
      config.headers['X-Outlet-Id'] = currentOutletId;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
salesAPI.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const salesService = {
  // Get sales statistics
  getSalesStats: async (dateRange = 'today') => {
    try {
      const response = await salesAPI.get('/v1/sales/stats', {
        params: { date_range: dateRange },
      });
      return response.data;
    } catch (error) {
      // ✅ FIX: Jangan log sebagai error jika 403 (subscription required) - ini normal
      const is403Subscription = error.response?.status === 403 && (
        error.response?.data?.message?.includes('subscription') ||
        error.response?.data?.subscription_required
      );
      if (!is403Subscription) {
        console.error('Error fetching sales stats:', error);
      }
      throw error;
    }
  },

  // Get general stats
  getStats: async (params = {}) => {
    try {
      const response = await salesAPI.get('/v1/sales/stats', {
        params,
      });
      return response.data;
    } catch (error) {
      // ✅ FIX: Jangan log sebagai error jika 403 (subscription required) - ini normal
      const is403Subscription = error.response?.status === 403 && (
        error.response?.data?.message?.includes('subscription') ||
        error.response?.data?.subscription_required
      );
      if (!is403Subscription) {
        console.error('Error fetching stats:', error);
      }
      throw error;
    }
  },

  // Get orders with pagination and filters
  getOrders: async (params = {}) => {
    try {
      const {
        page = 1,
        per_page = 5,
        limit = 5, // Backend menggunakan 'limit'
        status,
        date_from,
        date_to,
        dateRange,
        search,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = params;

      // Handle dateRange parameter
      let dateParams = {};
      if (dateRange) {
        dateParams.date_range = dateRange;
      } else if (date_from || date_to) {
        dateParams.date_from = date_from;
        dateParams.date_to = date_to;
      }

      const response = await salesAPI.get('/v1/sales/orders', {
        params: {
          page,
          limit: limit || per_page, // Backend menggunakan 'limit'
          status,
          search,
          sort_by,
          sort_order,
          ...dateParams,
        },
      });
      return response.data;
    } catch (error) {
      // ✅ FIX: Jangan log sebagai error jika 403 (subscription required) - ini normal
      const is403Subscription = error.response?.status === 403 && (
        error.response?.data?.message?.includes('subscription') ||
        error.response?.data?.subscription_required
      );
      if (!is403Subscription) {
        console.error('Error fetching orders:', error);
      }
      throw error;
    }
  },

  // Get single order by ID
  getOrderById: async orderId => {
    try {
      const response = await salesAPI.get(`/v1/sales/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  // Update order status
  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await salesAPI.put(
        `/v1/sales/orders/${orderId}/status`,
        {
          status,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  // Cancel order
  cancelOrder: async (orderId, reason) => {
    try {
      const response = await salesAPI.put(
        `/v1/sales/orders/${orderId}/cancel`,
        {
          reason,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  },

  // Get customers with pagination and filters
  getCustomers: async (params = {}) => {
    try {
      const {
        page = 1,
        per_page = 15,
        search,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = params;

      const response = await salesAPI.get('/v1/sales/customers', {
        params: {
          page,
          per_page,
          search,
          sort_by,
          sort_order,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },

  // Get single customer by ID
  getCustomerById: async customerId => {
    try {
      const response = await salesAPI.get(`/v1/sales/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  },

  // Create new customer
  createCustomer: async customerData => {
    try {
      const response = await salesAPI.post('/v1/sales/customers', customerData);
      return response.data;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },

  // Update customer
  updateCustomer: async (customerId, customerData) => {
    try {
      const response = await salesAPI.put(
        `/v1/sales/customers/${customerId}`,
        customerData
      );
      return response.data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  // Delete customer
  deleteCustomer: async customerId => {
    try {
      const response = await salesAPI.delete(
        `/v1/sales/customers/${customerId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  },

  // Get customer orders
  getCustomerOrders: async (customerId, params = {}) => {
    try {
      const { page = 1, per_page = 15, status, date_from, date_to } = params;

      const response = await salesAPI.get(
        `/v1/sales/customers/${customerId}/orders`,
        {
          params: {
            page,
            per_page,
            status,
            date_from,
            date_to,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      throw error;
    }
  },

  // Export data
  exportData: async (type, format = 'excel', params = {}) => {
    try {
      const response = await salesAPI.get(`/v1/sales/export/${type}`, {
        params: {
          format,
          ...params,
        },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  },

  // Get dashboard data
  getDashboardData: async (dateRange = 'today') => {
    try {
      const response = await salesAPI.get('/v1/dashboard/stats', {
        params: { date_range: dateRange },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  // Debug endpoint
  debug: async () => {
    try {
      const response = await salesAPI.get('/v1/sales/debug');
      return response.data;
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      throw error;
    }
  },
};
