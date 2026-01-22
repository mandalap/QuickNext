import { useCallback, useState } from 'react';
import { salesService } from '../services/salesService';

export const useSales = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 5,
  });

  // Fetch sales statistics
  const fetchStats = useCallback(async (dateRangeOrParams = 'today') => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching stats with date range:', dateRangeOrParams);

      let response;
      if (typeof dateRangeOrParams === 'string') {
        response = await salesService.getSalesStats(dateRangeOrParams);
      } else {
        // Custom date range dengan date_from dan date_to
        response = await salesService.getStats(dateRangeOrParams);
      }
      console.log('📊 Stats response:', response);

      let data = response.data || response;

      // Handle double nested response
      if (data.data && typeof data.data === 'object') {
        console.log('✨ Using double nested data.data for stats');
        data = data.data;
      }

      console.log('✅ Final stats data:', data);
      setStats(data);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to fetch sales statistics'
      );
      console.error('❌ Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching orders with params:', params);

      // Single request; salesService timeout already extended
      const response = await salesService.getOrders(params);

      console.log('📊 Orders response:', response);

      let data = response.data || response;

      // Handle double nested response
      if (data.data && typeof data.data === 'object') {
        console.log('✨ Using double nested data.data');
        data = data.data;
      }

      console.log('✅ Final orders data:', data);

      // Extract orders array
      let ordersArray = [];
      if (data.orders && Array.isArray(data.orders)) {
        ordersArray = data.orders;
      } else if (Array.isArray(data)) {
        ordersArray = data;
      }

      console.log('📦 Orders array:', ordersArray);
      setOrders(ordersArray);

      setPagination({
        currentPage: data.current_page || 1,
        totalPages: data.last_page || 1,
        totalItems: data.total || 0,
        itemsPerPage: data.per_page || 5,
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to fetch orders';
      setError(errorMessage);
      console.error('❌ Error fetching orders:', err);

      // Set empty data on error
      setOrders([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 5,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch customers
  const fetchCustomers = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching customers with params:', params);
      const response = await salesService.getCustomers(params);
      console.log('📊 Customers response:', response);

      let data = response.data || response;

      // Handle double nested response
      if (data.data && typeof data.data === 'object') {
        console.log('✨ Using double nested data.data for customers');
        data = data.data;
      }

      console.log('✅ Final customers data:', data);

      // Extract customers array
      let customersArray = [];
      if (data.customers && Array.isArray(data.customers)) {
        customersArray = data.customers;
      } else if (Array.isArray(data)) {
        customersArray = data;
      }

      // Deduplikasi customer berdasarkan phone (untuk menghindari duplikasi)
      const seenPhones = new Map();
      const uniqueCustomers = customersArray.filter(customer => {
        const phone = customer.phone;
        if (!phone) return true; // Include customers without phone

        if (seenPhones.has(phone)) {
          return false; // Skip duplicate phone
        }
        seenPhones.set(phone, true);
        return true;
      });

      console.log('📦 Customers array (count):', customersArray.length);
      console.log('📦 Unique customers (count):', uniqueCustomers.length);
      console.log('📦 Sample customer:', uniqueCustomers[0]);

      setCustomers(uniqueCustomers);

      // Update pagination for customers
      if (data.current_page && data.last_page && data.total && data.per_page) {
        setPagination({
          currentPage: data.current_page,
          totalPages: data.last_page,
          totalItems: data.total,
          itemsPerPage: data.per_page,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch customers');
      console.error('❌ Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId, status, notes = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesService.updateOrderStatus(
        orderId,
        status,
        notes
      );

      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status, notes: notes || order.notes }
            : order
        )
      );

      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order status');
      console.error('Error updating order status:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancel order
  const cancelOrder = useCallback(async (orderId, reason = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesService.cancelOrder(orderId, reason);

      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: 'cancelled', cancellation_reason: reason }
            : order
        )
      );

      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel order');
      console.error('Error cancelling order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create customer
  const createCustomer = useCallback(async customerData => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesService.createCustomer(customerData);

      // Add to local state
      setCustomers(prevCustomers => [response.data, ...prevCustomers]);

      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create customer');
      console.error('Error creating customer:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update customer
  const updateCustomer = useCallback(async (customerId, customerData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesService.updateCustomer(
        customerId,
        customerData
      );

      // Update local state
      setCustomers(prevCustomers =>
        prevCustomers.map(customer =>
          customer.id === customerId
            ? { ...customer, ...response.data }
            : customer
        )
      );

      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update customer');
      console.error('Error updating customer:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete customer
  const deleteCustomer = useCallback(async customerId => {
    try {
      setLoading(true);
      setError(null);
      await salesService.deleteCustomer(customerId);

      // Remove from local state
      setCustomers(prevCustomers =>
        prevCustomers.filter(customer => customer.id !== customerId)
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete customer');
      console.error('Error deleting customer:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export data
  const exportData = useCallback(
    async (type, format = 'excel', params = {}) => {
      try {
        setLoading(true);
        setError(null);
        const blob = await salesService.exportData(type, format, params);

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_export.${format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to export data');
        console.error('Error exporting data:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debug function
  const debug = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesService.debug();
      console.log('Debug response:', response);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Debug failed');
      console.error('Debug error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data
  const refreshData = useCallback(
    async (dateRange = 'today') => {
      await Promise.all([
        fetchStats(dateRange),
        fetchOrders({ page: pagination.currentPage }),
        fetchCustomers(),
      ]);
    },
    [fetchStats, fetchOrders, fetchCustomers, pagination.currentPage]
  );

  return {
    // State
    loading,
    error,
    stats,
    orders,
    customers,
    pagination,

    // Actions
    fetchStats,
    fetchOrders,
    fetchCustomers,
    updateOrderStatus,
    cancelOrder,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    exportData,
    refreshData,
    debug,

    // Utilities
    setError,
    setLoading,
  };
};

export default useSales;
