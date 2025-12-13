import axios from 'axios';
import { API_CONFIG } from '../config/api.config';

class ExpenseService {
  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      withCredentials: true,
    });

    // Add request interceptor to include auth token and business headers
    this.api.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token');
        const businessId = localStorage.getItem('currentBusinessId');
        const outletId = localStorage.getItem('currentOutletId');

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (businessId) {
          config.headers['X-Business-Id'] = businessId;
        }

        if (outletId) {
          config.headers['X-Outlet-Id'] = outletId;
        }

        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Get all expenses with optional filters
  async getExpenses(params = {}) {
    try {
      const response = await this.api.get('/v1/expenses', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  // Get expense by ID
  async getExpense(id) {
    try {
      const response = await this.api.get(`/v1/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching expense:', error);
      throw error;
    }
  }

  // Create new expense
  async createExpense(expenseData) {
    try {
      const response = await this.api.post('/v1/expenses', expenseData);
      return response.data;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  // Update expense
  async updateExpense(id, expenseData) {
    try {
      const response = await this.api.put(`/v1/expenses/${id}`, expenseData);
      return response.data;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  // Delete expense
  async deleteExpense(id) {
    try {
      const response = await this.api.delete(`/v1/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  // Get expense statistics
  async getExpenseStats(params = {}) {
    try {
      const response = await this.api.get('/v1/expenses/stats', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching expense stats:', error);
      throw error;
    }
  }

  // Get expenses for financial data (used in financial management)
  async getRecentExpenses(limit = 10) {
    try {
      const response = await this.api.get('/v1/expenses', {
        params: {
          per_page: limit,
          sort: 'created_at',
          order: 'desc',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recent expenses:', error);
      throw error;
    }
  }

  // Get expenses by date range
  async getExpensesByDateRange(startDate, endDate) {
    try {
      const response = await this.api.get('/v1/expenses', {
        params: {
          start_date: startDate,
          end_date: endDate,
          per_page: 100,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching expenses by date range:', error);
      throw error;
    }
  }

  // Get expenses by category
  async getExpensesByCategory(category) {
    try {
      const response = await this.api.get('/v1/expenses', {
        params: {
          category: category,
          per_page: 100,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching expenses by category:', error);
      throw error;
    }
  }

  // Search expenses
  async searchExpenses(searchTerm) {
    try {
      const response = await this.api.get('/v1/expenses', {
        params: {
          search: searchTerm,
          per_page: 50,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching expenses:', error);
      throw error;
    }
  }
}

export const expenseService = new ExpenseService();
export default expenseService;
