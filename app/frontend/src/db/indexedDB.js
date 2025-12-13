import Dexie from 'dexie';

/**
 * IndexedDB configuration menggunakan Dexie
 * Untuk offline-first caching dan background sync
 */
export const db = new Dexie('KasirPOSDB');

// Define database schema
db.version(1).stores({
  // Products cache
  products: '++id, name, sku, category_id, price, stock, business_id, [business_id+category_id]',
  
  // Categories cache
  categories: '++id, name, business_id',
  
  // Customers cache
  customers: '++id, name, phone, email, business_id, [business_id+name]',
  
  // Pending transactions queue (for offline sync)
  pendingTransactions: '++id, order_data, status, created_at, synced_at, [status+created_at]',
  
  // Settings cache
  settings: 'key, value',
  
  // Sync metadata
  syncMetadata: 'key, last_sync, data_hash',
});

// Export convenience methods
export const productCache = {
  // Get all products for a business
  async getAll(businessId) {
    return await db.products.where('business_id').equals(businessId).toArray();
  },

  // Get products by category
  async getByCategory(businessId, categoryId) {
    return await db.products
      .where('[business_id+category_id]')
      .equals([businessId, categoryId])
      .toArray();
  },

  // Get single product by ID
  async get(productId) {
    return await db.products.get(productId);
  },

  // Upsert products (insert or update)
  async upsert(products) {
    return await db.products.bulkPut(products);
  },

  // Clear all products
  async clear(businessId) {
    return await db.products.where('business_id').equals(businessId).delete();
  },

  // Get product count
  async count(businessId) {
    return await db.products.where('business_id').equals(businessId).count();
  },

  // Search products
  async search(businessId, searchTerm) {
    const term = searchTerm.toLowerCase();
    return await db.products
      .where('business_id')
      .equals(businessId)
      .filter(product => 
        product.name?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term)
      )
      .toArray();
  },
};

export const categoryCache = {
  // Get all categories
  async getAll(businessId) {
    return await db.categories.where('business_id').equals(businessId).toArray();
  },

  // Get single category
  async get(categoryId) {
    return await db.categories.get(categoryId);
  },

  // Upsert categories
  async upsert(categories) {
    return await db.categories.bulkPut(categories);
  },

  // Clear all categories
  async clear(businessId) {
    return await db.categories.where('business_id').equals(businessId).delete();
  },
};

export const customerCache = {
  // Get all customers
  async getAll(businessId) {
    return await db.customers.where('business_id').equals(businessId).toArray();
  },

  // Get single customer
  async get(customerId) {
    return await db.customers.get(customerId);
  },

  // Search customers
  async search(businessId, searchTerm) {
    const term = searchTerm.toLowerCase();
    return await db.customers
      .where('business_id')
      .equals(businessId)
      .filter(customer =>
        customer.name?.toLowerCase().includes(term) ||
        customer.phone?.includes(term) ||
        customer.email?.toLowerCase().includes(term)
      )
      .toArray();
  },

  // Upsert customers
  async upsert(customers) {
    return await db.customers.bulkPut(customers);
  },

  // Clear all customers
  async clear(businessId) {
    return await db.customers.where('business_id').equals(businessId).delete();
  },
};

export const transactionQueue = {
  // Add transaction to queue
  async add(orderData) {
    return await db.pendingTransactions.add({
      order_data: orderData,
      status: 'pending', // pending, syncing, synced, failed
      created_at: new Date(),
      synced_at: null,
    });
  },

  // Get all pending transactions
  async getPending() {
    return await db.pendingTransactions
      .where('status')
      .equals('pending')
      .sortBy('created_at');
  },

  // Mark as syncing
  async markSyncing(id) {
    return await db.pendingTransactions.update(id, {
      status: 'syncing',
    });
  },

  // Mark as synced
  async markSynced(id) {
    return await db.pendingTransactions.update(id, {
      status: 'synced',
      synced_at: new Date(),
    });
  },

  // Mark as failed
  async markFailed(id, error) {
    return await db.pendingTransactions.update(id, {
      status: 'failed',
      error: error,
    });
  },

  // Get failed transactions
  async getFailed() {
    return await db.pendingTransactions
      .where('status')
      .equals('failed')
      .sortBy('created_at');
  },

  // Retry failed transaction
  async retry(id) {
    return await db.pendingTransactions.update(id, {
      status: 'pending',
      error: null,
    });
  },

  // Clear synced transactions (older than 7 days)
  async clearOld() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return await db.pendingTransactions
      .where('status')
      .equals('synced')
      .and(transaction => transaction.synced_at < sevenDaysAgo)
      .delete();
  },

  // Get queue count
  async count() {
    return await db.pendingTransactions.count();
  },
};

export const settingsCache = {
  // Get setting
  async get(key) {
    const setting = await db.settings.get(key);
    return setting?.value;
  },

  // Set setting
  async set(key, value) {
    return await db.settings.put({ key, value });
  },

  // Delete setting
  async delete(key) {
    return await db.settings.delete(key);
  },
};

export const syncMetadata = {
  // Get last sync time
  async getLastSync(key) {
    const metadata = await db.syncMetadata.get(key);
    return metadata?.last_sync;
  },

  // Update last sync
  async updateLastSync(key, dataHash = null) {
    return await db.syncMetadata.put({
      key,
      last_sync: new Date(),
      data_hash: dataHash,
    });
  },
};

// Utility: Check if online
export const isOnline = () => {
  return navigator.onLine;
};

// Utility: Clear all caches
export const clearAllCaches = async (businessId) => {
  await productCache.clear(businessId);
  await categoryCache.clear(businessId);
  await customerCache.clear(businessId);
};

// Export default db instance
export default db;

