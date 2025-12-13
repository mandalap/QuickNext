import apiClient from '../utils/apiClient';
import axios from 'axios';

/**
 * Finance Service
 * Handles all financial management API calls
 */
export const financeService = {
  /**
   * Get financial summary including income, expense, net income, and cash balance
   * @param {Object} params - Query parameters
   * @param {string} params.start_date - Start date (YYYY-MM-DD)
   * @param {string} params.end_date - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Financial summary data
   */
  getFinancialSummary: async (params = {}) => {
    try {
      console.log('📊 Fetching financial summary with params:', params);

      const response = await apiClient.get('/v1/finance/summary', {
        params,
      });

      console.log('✅ Financial summary response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching financial summary:', error);
      throw error;
    }
  },

  /**
   * Get cash flow report
   * @param {Object} params - Query parameters
   * @param {string} params.start_date - Start date (YYYY-MM-DD)
   * @param {string} params.end_date - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Cash flow data
   */
  getCashFlow: async (params = {}) => {
    try {
      console.log('💰 Fetching cash flow with params:', params);

      const response = await apiClient.get('/v1/finance/cash-flow', {
        params,
      });

      console.log('✅ Cash flow response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching cash flow:', error);
      throw error;
    }
  },

  /**
   * Get profit and loss statement
   * @param {Object} params - Query parameters
   * @param {string} params.start_date - Start date (YYYY-MM-DD)
   * @param {string} params.end_date - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Profit and loss data
   */
  getProfitLoss: async (params = {}) => {
    try {
      console.log('📈 Fetching profit & loss with params:', params);

      const response = await apiClient.get('/v1/finance/profit-loss', {
        params,
      });

      console.log('✅ Profit & loss response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching profit & loss:', error);
      throw error;
    }
  },

  /**
   * Get budget tracking data
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Budget data
   */
  getBudgets: async (params = {}) => {
    try {
      console.log('💵 Fetching budgets with params:', params);

      const response = await apiClient.get('/v1/budgets', {
        params,
      });

      console.log('✅ Budgets response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching budgets:', error);
      throw error;
    }
  },

  /**
   * Create a new budget
   * @param {Object} budgetData - Budget data
   * @returns {Promise<Object>} Created budget
   */
  createBudget: async (budgetData) => {
    try {
      console.log('💵 Creating budget:', budgetData);

      const response = await apiClient.post('/v1/budgets', budgetData);

      console.log('✅ Budget created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating budget:', error);
      throw error;
    }
  },

  /**
   * Update a budget
   * @param {number} id - Budget ID
   * @param {Object} budgetData - Budget data
   * @returns {Promise<Object>} Updated budget
   */
  updateBudget: async (id, budgetData) => {
    try {
      console.log('💵 Updating budget:', id, budgetData);

      const response = await apiClient.put(`/v1/budgets/${id}`, budgetData);

      console.log('✅ Budget updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating budget:', error);
      throw error;
    }
  },

  /**
   * Delete a budget
   * @param {number} id - Budget ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteBudget: async (id) => {
    try {
      console.log('💵 Deleting budget:', id);

      const response = await apiClient.delete(`/v1/budgets/${id}`);

      console.log('✅ Budget deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting budget:', error);
      throw error;
    }
  },

  /**
   * Export financial report
   * @param {Object} params - Query parameters
   * @param {string} params.type - Report type (summary|cash-flow|profit-loss)
   * @param {string} params.format - Export format (pdf|excel)
   * @param {string} params.start_date - Start date (YYYY-MM-DD)
   * @param {string} params.end_date - End date (YYYY-MM-DD)
   * @returns {Promise<Blob>} Report file
   */
  exportReport: async (params = {}) => {
    try {
      console.log('📥 Exporting financial report with params:', params);

      const response = await apiClient.get('/v1/finance/export', {
        params,
        responseType: 'blob',
      });

      console.log('✅ Report exported successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error exporting report:', error);
      throw error;
    }
  },

  /**
   * Get taxes
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Taxes data
   */
  getTaxes: async (params = {}) => {
    try {
      console.log('📊 Fetching taxes with params:', params);

      const response = await apiClient.get('/v1/taxes', {
        params,
      });

      console.log('✅ Taxes response:', response.data);
      return response.data;
    } catch (error) {
      // Ignore cancelled errors (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancelled') || error.message?.includes('canceled') || error.message?.includes('Duplicate request cancelled');
      if (isCanceled) {
        console.log('⏭️ Taxes request cancelled (duplicate request prevention)');
        throw error; // Still throw, but React Query will handle it gracefully
      }
      console.error('❌ Error fetching taxes:', error);
      throw error;
    }
  },

  /**
   * Create a new tax
   * @param {Object} taxData - Tax data
   * @returns {Promise<Object>} Created tax
   */
  createTax: async (taxData) => {
    try {
      console.log('📊 Creating tax:', taxData);

      const response = await apiClient.post('/v1/taxes', taxData);

      console.log('✅ Tax created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating tax:', error);
      throw error;
    }
  },

  /**
   * Update a tax
   * @param {number} id - Tax ID
   * @param {Object} taxData - Tax data
   * @returns {Promise<Object>} Updated tax
   */
  updateTax: async (id, taxData) => {
    try {
      console.log('📊 Updating tax:', id, taxData);

      const response = await apiClient.put(`/v1/taxes/${id}`, taxData);

      console.log('✅ Tax updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating tax:', error);
      throw error;
    }
  },

  /**
   * Delete a tax
   * @param {number} id - Tax ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteTax: async (id) => {
    try {
      console.log('📊 Deleting tax:', id);

      const response = await apiClient.delete(`/v1/taxes/${id}`);

      console.log('✅ Tax deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting tax:', error);
      throw error;
    }
  },
};

export default financeService;
