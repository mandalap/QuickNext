/**
 * Utility untuk offline storage menggunakan IndexedDB
 * Digunakan untuk menyimpan transaksi dan data lainnya saat offline
 */

const DB_NAME = 'kasir-pos-offline';
const DB_VERSION = 1;
const STORES = {
  TRANSACTIONS: 'transactions',
  SYNC_QUEUE: 'sync_queue',
};

let dbInstance = null;

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ Error opening IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create transactions store
      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const transactionStore = db.createObjectStore(STORES.TRANSACTIONS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
        transactionStore.createIndex('status', 'status', { unique: false });
      }

      // Create sync queue store
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncQueueStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncQueueStore.createIndex('type', 'type', { unique: false });
        syncQueueStore.createIndex('status', 'status', { unique: false });
        syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

/**
 * Save transaction to offline storage
 * @param {Object} transaction - Transaction data
 * @returns {Promise<number>} - Returns the ID of saved transaction
 */
export const saveTransaction = async (transaction) => {
  try {
    const db = await initDB();
    const transactionStore = db
      .transaction([STORES.TRANSACTIONS], 'readwrite')
      .objectStore(STORES.TRANSACTIONS);

    const data = {
      ...transaction,
      timestamp: transaction.timestamp || Date.now(),
      status: 'pending',
      synced: false,
    };

    return new Promise((resolve, reject) => {
      const request = transactionStore.add(data);
      request.onsuccess = () => {
        console.log('✅ Transaction saved offline:', request.result);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('❌ Error saving transaction:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error in saveTransaction:', error);
    throw error;
  }
};

/**
 * Get all pending transactions
 * @returns {Promise<Array>}
 */
export const getPendingTransactions = async () => {
  try {
    const db = await initDB();
    const transactionStore = db
      .transaction([STORES.TRANSACTIONS], 'readonly')
      .objectStore(STORES.TRANSACTIONS);

    return new Promise((resolve, reject) => {
      const request = transactionStore.index('status').getAll('pending');
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error getting pending transactions:', error);
    return [];
  }
};

/**
 * Mark transaction as synced
 * @param {number} id - Transaction ID
 * @returns {Promise<void>}
 */
export const markTransactionSynced = async (id) => {
  try {
    const db = await initDB();
    const transactionStore = db
      .transaction([STORES.TRANSACTIONS], 'readwrite')
      .objectStore(STORES.TRANSACTIONS);

    return new Promise((resolve, reject) => {
      const getRequest = transactionStore.get(id);
      getRequest.onsuccess = () => {
        const transaction = getRequest.result;
        if (transaction) {
          transaction.synced = true;
          transaction.status = 'synced';
          const updateRequest = transactionStore.put(transaction);
          updateRequest.onsuccess = () => {
            console.log('✅ Transaction marked as synced:', id);
            resolve();
          };
          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  } catch (error) {
    console.error('❌ Error marking transaction as synced:', error);
    throw error;
  }
};

/**
 * Add item to sync queue
 * @param {Object} item - Item to sync
 * @returns {Promise<number>}
 */
export const addToSyncQueue = async (item) => {
  try {
    const db = await initDB();
    const syncQueueStore = db
      .transaction([STORES.SYNC_QUEUE], 'readwrite')
      .objectStore(STORES.SYNC_QUEUE);

    const data = {
      ...item,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const request = syncQueueStore.add(data);
      request.onsuccess = () => {
        console.log('✅ Item added to sync queue:', request.result);
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error adding to sync queue:', error);
    throw error;
  }
};

/**
 * Get all pending items from sync queue
 * @returns {Promise<Array>}
 */
export const getSyncQueue = async () => {
  try {
    const db = await initDB();
    const syncQueueStore = db
      .transaction([STORES.SYNC_QUEUE], 'readonly')
      .objectStore(STORES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = syncQueueStore.index('status').getAll('pending');
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error getting sync queue:', error);
    return [];
  }
};

/**
 * Mark sync queue item as synced
 * @param {number} id - Item ID
 * @returns {Promise<void>}
 */
export const markSyncQueueItemSynced = async (id) => {
  try {
    const db = await initDB();
    const syncQueueStore = db
      .transaction([STORES.SYNC_QUEUE], 'readwrite')
      .objectStore(STORES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const getRequest = syncQueueStore.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.status = 'synced';
          const updateRequest = syncQueueStore.put(item);
          updateRequest.onsuccess = () => {
            console.log('✅ Sync queue item marked as synced:', id);
            resolve();
          };
          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  } catch (error) {
    console.error('❌ Error marking sync queue item as synced:', error);
    throw error;
  }
};

/**
 * Get count of pending sync items
 * @returns {Promise<number>}
 */
export const getPendingSyncCount = async () => {
  try {
    const queue = await getSyncQueue();
    const transactions = await getPendingTransactions();
    return queue.length + transactions.length;
  } catch (error) {
    console.error('❌ Error getting pending sync count:', error);
    return 0;
  }
};

