import { useCallback, useState } from 'react';
import { dashboardService } from '../services/dashboard.service';
import { salesService } from '../services/salesService';
import { shiftService } from '../services/shift.service';

// Simple cache with TTL
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const getCacheKey = (key, outletId) => `${key}_${outletId}`;

const getCachedData = (key, outletId) => {
  const cacheKey = getCacheKey(key, outletId);
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  return null;
};

const setCachedData = (key, outletId, data) => {
  const cacheKey = getCacheKey(key, outletId);
  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
};

export const useDashboardData = (currentOutlet, user) => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    activeCustomers: 0,
    productsSold: 0,
    averageTransaction: 0,
    conversionRate: 0,
    customerRating: 0,
    dailyTarget: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [activeCashiers, setActiveCashiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Load sales stats with caching
  const loadSalesStats = useCallback(async () => {
    if (!currentOutlet) return;

    const cacheKey = 'sales_stats';
    const cached = getCachedData(cacheKey, currentOutlet.id);

    if (cached) {
      console.log('📦 Using cached sales stats');
      setStats(cached);
      return cached;
    }

    try {
      console.log('🔄 Loading sales stats...');
      const salesResult = await salesService.getStats({ date_range: 'today' });

      if (salesResult.success && salesResult.data) {
        let salesData = salesResult.data;

        if (salesData.data && typeof salesData.data === 'object') {
          salesData = salesData.data;
        }

        const newStats = {
          totalSales: salesData.total_sales || salesData.total_revenue || 0,
          totalTransactions:
            salesData.total_transactions || salesData.total_orders || 0,
          activeCustomers:
            salesData.unique_customers || salesData.active_customers || 0,
          productsSold: salesData.total_items || salesData.products_sold || 0,
          averageTransaction:
            salesData.average_transaction || salesData.avg_order_value || 0,
          conversionRate: salesData.conversion_rate || 0,
          customerRating: salesData.average_rating || 0,
          dailyTarget: salesData.daily_target_percentage || 0,
        };

        setStats(newStats);
        setCachedData(cacheKey, currentOutlet.id, newStats);
        return newStats;
      }
    } catch (error) {
      console.error('Error loading sales stats:', error);
    }
  }, [currentOutlet]);

  // Load recent orders with caching
  const loadRecentOrders = useCallback(async () => {
    if (!currentOutlet) return;

    const cacheKey = 'recent_orders';
    const cached = getCachedData(cacheKey, currentOutlet.id);

    if (cached) {
      console.log('📦 Using cached recent orders');
      setRecentOrders(cached);
      return cached;
    }

    try {
      const ordersResult = await salesService.getOrders({
        page: 1,
        limit: 5,
        date_range: 'today',
      });

      let ordersData = [];
      if (ordersResult && ordersResult.success && ordersResult.data) {
        if (
          ordersResult.data.orders &&
          Array.isArray(ordersResult.data.orders)
        ) {
          ordersData = ordersResult.data.orders;
        } else if (Array.isArray(ordersResult.data)) {
          ordersData = ordersResult.data;
        }
      }

      setRecentOrders(ordersData);
      setCachedData(cacheKey, currentOutlet.id, ordersData);
      return ordersData;
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  }, [currentOutlet]);

  // Load top products with caching
  const loadTopProducts = useCallback(async () => {
    if (!currentOutlet) return;

    const cacheKey = 'top_products';
    const cached = getCachedData(cacheKey, currentOutlet.id);

    if (cached) {
      console.log('📦 Using cached top products');
      setTopProducts(cached);
      return cached;
    }

    try {
      const productsResult = await dashboardService.getTopProducts();

      let productsData = [];
      if (productsResult && productsResult.success && productsResult.data) {
        if (Array.isArray(productsResult.data)) {
          productsData = productsResult.data;
        } else if (
          productsResult.data.data &&
          Array.isArray(productsResult.data.data)
        ) {
          productsData = productsResult.data.data;
        } else if (
          productsResult.data.toArray &&
          typeof productsResult.data.toArray === 'function'
        ) {
          productsData = productsResult.data.toArray();
        } else if (
          productsResult.data.map &&
          typeof productsResult.data.map === 'function'
        ) {
          productsData = Array.from(productsResult.data);
        } else {
          const possibleArrays = Object.values(productsResult.data).filter(
            item => Array.isArray(item)
          );
          if (possibleArrays.length > 0) {
            productsData = possibleArrays[0];
          } else {
            productsData = Object.values(productsResult.data);
          }
        }
      }

      setTopProducts(productsData);
      setCachedData(cacheKey, currentOutlet.id, productsData);
      return productsData;
    } catch (error) {
      console.error('Error loading top products:', error);
    }
  }, [currentOutlet]);

  // Load active cashiers with caching
  const loadActiveCashiers = useCallback(async () => {
    if (!['owner', 'super_admin', 'admin'].includes(user?.role)) return;

    const cacheKey = 'active_cashiers';
    const cached = getCachedData(cacheKey, 'global');

    if (cached) {
      console.log('📦 Using cached active cashiers');
      setActiveCashiers(cached);
      return cached;
    }

    try {
      const result = await shiftService.getActiveShifts();

      if (result.success && result.data) {
        let cashiersData = result.data;

        if (result.data.data && Array.isArray(result.data.data)) {
          cashiersData = result.data.data;
        } else if (Array.isArray(result.data)) {
          cashiersData = result.data;
        }

        setActiveCashiers(cashiersData);
        setCachedData(cacheKey, 'global', cashiersData);
        return cashiersData;
      }
    } catch (error) {
      console.error('Error loading active cashiers:', error);
    }
  }, [user?.role]);

  // Load all dashboard data
  const loadAllData = useCallback(async () => {
    if (!currentOutlet) return;

    setLoading(true);
    try {
      await Promise.all([
        loadSalesStats(),
        loadRecentOrders(),
        loadTopProducts(),
        loadActiveCashiers(),
      ]);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [
    currentOutlet,
    loadSalesStats,
    loadRecentOrders,
    loadTopProducts,
    loadActiveCashiers,
  ]);

  // Clear cache for current outlet
  const clearCache = useCallback(() => {
    if (!currentOutlet) return;

    const keys = ['sales_stats', 'recent_orders', 'top_products'];
    keys.forEach(key => {
      const cacheKey = getCacheKey(key, currentOutlet.id);
      cache.delete(cacheKey);
    });
  }, [currentOutlet]);

  // Refresh data (clear cache and reload)
  const refreshData = useCallback(() => {
    clearCache();
    loadAllData();
  }, [clearCache, loadAllData]);

  return {
    stats,
    recentOrders,
    topProducts,
    activeCashiers,
    loading,
    lastUpdated,
    loadAllData,
    refreshData,
    clearCache,
  };
};
