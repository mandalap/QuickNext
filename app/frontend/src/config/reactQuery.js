import { QueryClient } from '@tanstack/react-query';

/**
 * Get optimized staleTime based on query type
 * Real-time data needs frequent refresh, static data can cache longer
 */
export const getQueryStaleTime = queryKey => {
  if (!queryKey) return 5 * 60 * 1000; // Default 5 minutes

  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;

  // Real-time data (refresh lebih sering - 30 detik)
  if (['shifts', 'active-cashiers', 'orders', 'attendance'].includes(key)) {
    return 30 * 1000; // 30 detik
  }

  // Semi-static data (refresh setiap 2 menit)
  if (['sales', 'dashboard'].includes(key)) {
    return 2 * 60 * 1000; // 2 menit
  }

  // Static data (cache lebih lama - 10 menit)
  if (['categories', 'products', 'employees', 'customers'].includes(key)) {
    return 10 * 60 * 1000; // 10 menit
  }

  // Default
  return 5 * 60 * 1000; // 5 menit
};

/**
 * Get optimized gcTime (cache time) based on query type
 */
export const getQueryGcTime = queryKey => {
  if (!queryKey) return 10 * 60 * 1000; // Default 10 minutes

  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;

  // Real-time data - shorter cache
  if (['shifts', 'active-cashiers', 'orders', 'attendance'].includes(key)) {
    return 5 * 60 * 1000; // 5 menit
  }

  // Static data - longer cache
  if (['categories', 'products', 'employees', 'customers'].includes(key)) {
    return 30 * 60 * 1000; // 30 menit
  }

  // Default
  return 10 * 60 * 1000; // 10 menit
};

// Create React Query client with optimized settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ OPTIMIZATION: Increased stale time for better caching
      // Default stale time: Data stays fresh for 10 minutes (increased from 5)
      // Individual queries can override this using getQueryStaleTime()
      staleTime: 10 * 60 * 1000,

      // ✅ OPTIMIZATION: Increased cache time for better performance
      // Default cache time: Keep unused data in cache for 30 minutes (increased from 10)
      // Individual queries can override this using getQueryGcTime()
      gcTime: 30 * 60 * 1000,

      // ✅ OPTIMIZATION: Reduce retry for faster failure detection
      // Retry failed requests 0 times (no retry) for faster loading
      retry: (failureCount, error) => {
        // ✅ FIX: Don't retry for 403/404 errors (subscription required, not found) - these are normal
        const status = error?.response?.status;
        const url = error?.config?.url || '';
        const isSubscriptionEndpoint = url.includes('/subscriptions/current');
        const is403Subscription = status === 403 && (
          error?.response?.data?.message?.includes('subscription') ||
          error?.response?.data?.subscription_required
        );
        const is404Subscription = status === 404 && isSubscriptionEndpoint;
        
        // Don't retry for expected errors
        if (is403Subscription || is404Subscription) {
          return false;
        }
        
        // Default: no retry
        return false;
      },

      // Retry delay (exponential backoff)
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (disabled for POS system - prevents unnecessary API calls)
      refetchOnWindowFocus: false,

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: false,

      // ✅ OPTIMIZED: Keep previous data during refetch for smooth UX (like Facebook)
      placeholderData: previousData => previousData,

      // ✅ OPTIMIZATION: Use cached data immediately if available (instant UI)
      // This makes data appear instantly from cache while fresh data loads in background
      initialDataUpdatedAt: () => Date.now(),

      // Network mode
      networkMode: 'online',

      // Suspense mode
      suspense: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,

      // Network mode
      networkMode: 'online',
    },
  },
});

// Query keys factory for consistent cache keys
export const queryKeys = {
  // Dashboard
  dashboard: {
    stats: (params, outletId) => ['dashboard', 'stats', outletId, params],
    topProducts: (params = {}, outletId) => [
      'dashboard',
      'top-products',
      outletId,
      { page: 1, limit: 5, ...params },
    ],
    recentOrders: (params, outletId) => [
      'dashboard',
      'recent-orders',
      outletId,
      params,
    ],
    activeCashiers: outletId => ['dashboard', 'active-cashiers', outletId],
    productManagement: (businessId, params) => [
      'dashboard',
      'productManagement',
      businessId,
      params,
    ],
  },

  // Sales
  sales: {
    stats: (params, outletId) => ['sales', 'stats', outletId, params],
    orders: (params, outletId) => ['sales', 'orders', outletId, params],
    order: orderId => ['sales', 'order', orderId],
  },

  // Products
  products: {
    list: (businessId, params) => ['products', businessId, params],
    detail: productId => ['products', productId],
    stock: (productId, outletId) => ['products', productId, 'stock', outletId],
  },

  // Categories
  categories: {
    list: businessId => ['categories', businessId],
  },

  // Inventory
  inventory: {
    movements: (outletId, params) => [
      'inventory',
      'movements',
      outletId,
      params,
    ],
    transfers: (outletId, params) => [
      'inventory',
      'transfers',
      outletId,
      params,
    ],
    ingredients: businessId => ['inventory', 'ingredients', businessId],
    recipes: businessId => ['inventory', 'recipes', businessId],
  },

  // Employees
  employees: {
    list: (businessId, params) => ['employees', businessId, params],
    detail: employeeId => ['employees', employeeId],
  },

  // Shifts
  shifts: {
    active: outletId => ['shifts', 'active', outletId],
    allActive: outletId => ['shifts', 'active-list', outletId],
    history: (userId, params) => ['shifts', 'history', userId, params],
  },

  // Kitchen
  kitchen: {
    orders: outletId => ['kitchen', 'orders', outletId],
    notifications: outletId => ['kitchen', 'notifications', outletId],
  },

  // Customers
  customers: {
    list: (businessId, params) => ['customers', businessId, params],
    detail: customerId => ['customers', customerId],
  },

  // Settings
  settings: {
    outlets: businessId => ['outlets', businessId],
    outlet: outletId => ['outlets', outletId],
    business: businessId => ['business', businessId],
    paymentMethods: outletId => ['settings', 'payment-methods', outletId],
  },

  // Tables
  tables: {
    list: (businessId, outletId, params) => [
      'tables',
      businessId,
      outletId,
      params,
    ],
  },

  // Self Service
  selfService: {
    stats: (outletId, params) => ['self-service', 'stats', outletId, params],
    orders: (outletId, params) => ['self-service', 'orders', outletId, params],
    qrMenus: outletId => ['self-service', 'qr-menus', outletId],
  },

  // Employee Outlets
  employeeOutlets: {
    assignments: (businessId, params = {}) => [
      'employee-outlets',
      'assignments',
      businessId,
      params,
    ],
    employeeOutlets: userId => ['employee-outlets', 'employee', userId],
    myOutlets: userId => ['employee-outlets', 'my-outlets', userId],
  },

  // Promos
  promos: {
    list: (outletId, params) => ['promos', outletId, params],
    active: outletId => ['promos', 'active', outletId],
    discounts: (businessId, outletId) => [
      'promos',
      'discounts',
      businessId,
      outletId,
    ],
    usage: params => ['promos', 'usage', params.outletId, params],
    effectiveness: params => [
      'promos',
      'effectiveness',
      params.outletId,
      params,
    ],
    trends: params => ['promos', 'trends', params.outletId, params],
  },

  // Finance
  finance: {
    summary: (businessId, outletId, params) => [
      'finance',
      'summary',
      businessId,
      outletId,
      params,
    ],
    cashFlow: (businessId, outletId, params) => [
      'finance',
      'cash-flow',
      businessId,
      outletId,
      params,
    ],
    profitLoss: (businessId, outletId, params) => [
      'finance',
      'profit-loss',
      businessId,
      outletId,
      params,
    ],
  },

  // Payroll
  payrolls: {
    list: (businessId, params) => ['payrolls', businessId, params],
    detail: payrollId => ['payrolls', payrollId],
    stats: (businessId, params) => ['payrolls', 'stats', businessId, params],
  },

  // Attendance
  attendance: {
    todayShift: (userId, businessId, outletId) => [
      'attendance',
      'today-shift',
      userId,
      businessId,
      outletId,
    ],
    history: (userId, params) => ['attendance', 'history', userId, params],
    stats: (userId, params) => ['attendance', 'stats', userId, params],
    report: params => ['attendance', 'report', params],
  },

  // Subscription
  subscription: {
    current: businessId => ['subscription', 'current', businessId],
    plans: () => ['subscription', 'plans'],
  },

  // Reports
  reports: {
    paymentTypes: params => ['reports', 'payment-types', params],
    salesSummary: params => ['reports', 'sales-summary', params],
    salesDetail: params => ['reports', 'sales-detail', params],
    salesChart: params => ['reports', 'sales-chart', params],
    promoUsage: params => ['reports', 'promo-usage', params],
    productSales: params => ['reports', 'product-sales', params],
    categorySales: params => ['reports', 'category-sales', params],
    customerAnalytics: params => ['reports', 'customer-analytics', params],
    topCustomers: params => ['reports', 'top-customers', params],
    productPreferences: params => ['reports', 'product-preferences', params],
    customerProductHistory: (customerId, params) => [
      'reports',
      'customer-product-history',
      customerId,
      params,
    ],
    customerDemographics: outletId => [
      'reports',
      'customer-demographics',
      outletId,
    ],
    customerList: params => ['reports', 'customer-list', params],
    inventoryStatus: params => ['reports', 'inventory-status', params],
    inventoryCategories: outletId => [
      'reports',
      'inventory-categories',
      outletId,
    ],
    taxReport: params => ['reports', 'tax-report', params],
    cashierClosing: {
      summary: (outletId, date) => [
        'reports',
        'cashier-closing',
        'summary',
        outletId,
        date,
      ],
      history: (outletId, params) => [
        'reports',
        'cashier-closing',
        'history',
        outletId,
        params,
      ],
      report: (outletId, params) => [
        'reports',
        'cashier-closing',
        'report',
        outletId,
        params,
      ],
    },
    commission: params => ['reports', 'commission', params],
    stockMovements: params => ['reports', 'stock-movements', params],
    inventoryProducts: outletId => ['reports', 'inventory-products', outletId],
  },

  // Cashier Performance
  cashierPerformance: {
    analytics: params => ['cashier-performance', 'analytics', params],
    sessions: params => ['cashier-performance', 'sessions', params],
    detail: (cashierId, params) => [
      'cashier-performance',
      'detail',
      cashierId,
      params,
    ],
  },
};

// Helper function to invalidate related queries
export const invalidateQueries = {
  dashboard: (client, outletId) => {
    client.invalidateQueries({ queryKey: ['dashboard', 'stats', outletId] });
    client.invalidateQueries({
      queryKey: ['dashboard', 'top-products', outletId],
    });
    client.invalidateQueries({
      queryKey: ['dashboard', 'recent-orders', outletId],
    });
  },

  sales: (client, outletId) => {
    client.invalidateQueries({ queryKey: ['sales', 'stats', outletId] });
    client.invalidateQueries({ queryKey: ['sales', 'orders', outletId] });
    invalidateQueries.dashboard(client, outletId);
  },

  products: (client, businessId) => {
    client.invalidateQueries({ queryKey: ['products', businessId] });
    invalidateQueries.inventory(client);
  },

  inventory: (client, outletId) => {
    client.invalidateQueries({ queryKey: ['inventory'] });
    if (outletId) {
      client.invalidateQueries({ queryKey: ['dashboard', 'stats', outletId] });
    }
  },

  shifts: (client, outletId) => {
    client.invalidateQueries({ queryKey: ['shifts'] });
    if (outletId) {
      client.invalidateQueries({
        queryKey: ['dashboard', 'active-cashiers', outletId],
      });
    }
  },
};

// Prefetch helpers for common data
export const prefetchHelpers = {
  // Prefetch dashboard data
  async prefetchDashboard(client, outletId) {
    const promises = [
      client.prefetchQuery({
        queryKey: queryKeys.dashboardStats(outletId),
        staleTime: 5 * 60 * 1000,
      }),
      client.prefetchQuery({
        queryKey: queryKeys.topProducts(outletId),
        staleTime: 5 * 60 * 1000,
      }),
    ];

    return Promise.all(promises);
  },

  // Prefetch product data
  async prefetchProducts(client, businessId) {
    return client.prefetchQuery({
      queryKey: queryKeys.products(businessId, {}),
      staleTime: 10 * 60 * 1000,
    });
  },
};
