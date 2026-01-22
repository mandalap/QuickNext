// ==========================================
// Public Outlet API Service (No Auth Required)
// ==========================================
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance without auth interceptors
const publicClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const publicOutletApi = {
  /**
   * Get outlet information by slug
   */
  getOutlet: async (slug) => {
    try {
      const response = await publicClient.get(`/public/outlets/${slug}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch outlet data' };
    }
  },

  /**
   * Get products/menu for outlet
   */
  getProducts: async (slug, params = {}) => {
    try {
      const response = await publicClient.get(`/public/outlets/${slug}/products`, {
        params: {
          category_id: params.categoryId,
          search: params.search,
          sort_by: params.sortBy || 'name',
          sort_order: params.sortOrder || 'asc',
          per_page: params.perPage || 20,
          page: params.page || 1,
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch products' };
    }
  },

  /**
   * Get categories for outlet
   */
  getCategories: async (slug) => {
    try {
      const response = await publicClient.get(`/public/outlets/${slug}/categories`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch categories' };
    }
  },

  /**
   * Place order
   */
  placeOrder: async (slug, orderData) => {
    try {
      const response = await publicClient.post(
        `/public/outlets/${slug}/orders`,
        orderData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to place order' };
    }
  },

  /**
   * Check order status
   */
  checkOrderStatus: async (orderNumber) => {
    try {
      const response = await publicClient.get(
        `/public/orders/${orderNumber}/status`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch order status' };
    }
  },

  /**
   * Get receipt by token
   */
  getReceipt: async (token) => {
    try {
      const response = await publicClient.get(`/public/receipt/${token}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch receipt' };
    }
  },
};

export default publicOutletApi;
