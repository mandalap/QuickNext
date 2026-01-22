// ==========================================
// 1. src/config/api.config.js
// ==========================================
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_BACKEND_URL
    ? `${process.env.REACT_APP_BACKEND_URL}/api`
    : 'http://localhost:8000/api',
  TIMEOUT: 10000, // ✅ FIX: 10 seconds default (increased for slow backend responses)
  TIMEOUT_SHORT: 5000, // ✅ FIX: 5 seconds for quick requests
  TIMEOUT_LONG: 20000, // ✅ FIX: 20 seconds for heavy requests (tables, orders, etc.)

  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: '/login',
      REGISTER: '/register',
      USER: '/user',
      LOGOUT: '/logout',
    },

    // Dashboard
    DASHBOARD: {
      STATS: '/v1/dashboard/stats',
      RECENT_ORDERS: '/v1/dashboard/recent-orders',
      TOP_PRODUCTS: '/v1/dashboard/top-products',
    },

    // Categories
    CATEGORIES: {
      LIST: '/v1/categories',
      CREATE: '/v1/categories',
      DETAIL: id => `/v1/categories/${id}`,
      UPDATE: id => `/v1/categories/${id}`,
      DELETE: id => `/v1/categories/${id}`,
    },

    // Products
    PRODUCTS: {
      LIST: '/v1/products',
      CREATE: '/v1/products',
      DETAIL: id => `/v1/products/${id}`,
      UPDATE: id => `/v1/products/${id}`,
      DELETE: id => `/v1/products/${id}`,
      STOCK_ADJUSTMENT: id => `/v1/products/${id}/stock-adjustment`,
    },

    // Customers
    CUSTOMERS: {
      LIST: '/v1/customers',
      CREATE: '/v1/customers',
      DETAIL: id => `/v1/customers/${id}`,
      UPDATE: id => `/v1/customers/${id}`,
      DELETE: id => `/v1/customers/${id}`,
      SEARCH: query => `/v1/customers/search/${query}`,
    },

    // Orders
    ORDERS: {
      LIST: '/v1/orders',
      CREATE: '/v1/orders',
      DETAIL: id => `/v1/orders/${id}`,
      UPDATE: id => `/v1/orders/${id}`,
      DELETE: id => `/v1/orders/${id}`,
      CANCEL: id => `/v1/orders/${id}/cancel`,
      REFUND: id => `/v1/orders/${id}/refund`,
      PAYMENT: id => `/v1/orders/${id}/payment`,
      RECEIPT: id => `/v1/orders/${id}/receipt`,
    },

    // Kitchen
    KITCHEN: {
      ORDERS: '/v1/kitchen/orders',
      PENDING_ORDERS: '/v1/kitchen/orders/pending',
      UPDATE_STATUS: orderId => `/v1/kitchen/orders/${orderId}/status`,
      CONFIRM_ORDER: orderId => `/v1/kitchen/orders/${orderId}/confirm`, // ✅ NEW: Manual confirm order
      NOTIFICATIONS: '/v1/kitchen/orders/notifications', // ✅ NEW: Get new order notifications
    },

    // Tables
    TABLES: {
      LIST: '/v1/tables',
      CREATE: '/v1/tables',
      UPDATE: id => `/v1/tables/${id}`,
      DELETE: id => `/v1/tables/${id}`,
      UPDATE_STATUS: id => `/v1/tables/${id}/status`,
    },

    // Employees
    EMPLOYEES: {
      LIST: '/v1/employees',
      CREATE: '/v1/employees',
      DETAIL: id => `/v1/employees/${id}`,
      UPDATE: id => `/v1/employees/${id}`,
      DELETE: id => `/v1/employees/${id}`,
      PERFORMANCE: id => `/v1/employees/${id}/performance`,
    },

    // Discounts
    DISCOUNTS: {
      LIST: '/v1/discounts',
      CREATE: '/v1/discounts',
      DETAIL: id => `/v1/discounts/${id}`,
      UPDATE: id => `/v1/discounts/${id}`,
      DELETE: id => `/v1/discounts/${id}`,
      VALIDATE: '/v1/discounts/validate',
    },

    // Inventory
    INVENTORY: {
      PRODUCTS: '/v1/inventory/products',
      INGREDIENTS: '/v1/inventory/ingredients',
      MOVEMENTS: '/v1/inventory/movements',
      LOW_STOCK_ALERTS: '/v1/inventory/low-stock-alerts',
      STOCK_ADJUSTMENT: '/v1/inventory/stock-adjustment',
    },

    // Ingredients
    INGREDIENTS: {
      LIST: '/v1/ingredients',
      CREATE: '/v1/ingredients',
      DETAIL: id => `/v1/ingredients/${id}`,
      UPDATE: id => `/v1/ingredients/${id}`,
      DELETE: id => `/v1/ingredients/${id}`,
      LOW_STOCK: '/v1/ingredients/low-stock',
      UPDATE_STOCK: id => `/v1/ingredients/${id}/stock`,
    },

    // Recipes
    RECIPES: {
      LIST: '/v1/recipes',
      CREATE: '/v1/recipes',
      DETAIL: productId => `/v1/recipes/${productId}`,
      UPDATE: productId => `/v1/recipes/${productId}`,
      DELETE: productId => `/v1/recipes/${productId}`,
      CALCULATE: productId => `/v1/recipes/${productId}/calculate`,
    },

    // Reports
    REPORTS: {
      SALES: '/v1/reports/sales',
      INVENTORY: '/v1/reports/inventory',
      FINANCIAL: '/v1/reports/financial',
      CUSTOMER_ANALYTICS: '/v1/reports/customer-analytics',
      PAYMENT_TYPES: '/v1/reports/payment-types',
      EXPORT_SALES: '/v1/reports/export/sales',
      EXPORT_INVENTORY: '/v1/reports/export/inventory',
    },

    // Online Platforms (GoFood, GrabFood, ShopeeFood)
    PLATFORMS: {
      LIST: '/platforms',
      ORDERS: platformId => `/platforms/${platformId}/orders`,
      SYNC: platformId => `/platforms/${platformId}/sync`,
      SETTINGS: platformId => `/platforms/${platformId}/settings`,
      WEBHOOK: platformId => `/platforms/${platformId}/webhook`,
    },

    // Settings
    SETTINGS: {
      BUSINESS: '/v1/settings/business',
      UPDATE_BUSINESS: '/v1/settings/business',
      OUTLETS: '/v1/settings/outlets',
      CREATE_OUTLET: '/v1/settings/outlets',
      PAYMENT_METHODS: '/v1/settings/payment-methods',
      UPDATE_PAYMENT_METHODS: '/v1/settings/payment-methods',
      RECEIPT_FOOTER_MESSAGE: '/v1/settings/receipt-footer-message',
      UPDATE_RECEIPT_FOOTER_MESSAGE: '/v1/settings/receipt-footer-message',
    },

    // Self Service (Public API)
    SELF_SERVICE: {
      GET_MENU: tableQr => `/public/self-service/menu/${tableQr}`,
      PLACE_ORDER: tableQr => `/public/self-service/order/${tableQr}`,
      ORDER_STATUS: orderNumber =>
        `/public/self-service/order/${orderNumber}/status`,
    },

    // Webhooks (Public)
    WEBHOOKS: {
      GOFOOD: '/public/webhooks/gofood',
      GRABFOOD: '/public/webhooks/grabfood',
      SHOPEEFOOD: '/public/webhooks/shopeefood',
    },
  },
};
