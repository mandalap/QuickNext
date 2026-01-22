import {
  getPendingTransactions,
  markTransactionSynced,
  getSyncQueue,
  markSyncQueueItemSynced,
  getPendingSyncCount,
} from './offlineStorage';

/**
 * Sync pending transactions and queue items to server
 * @param {Function} syncTransactionFn - Function to sync a transaction
 * @param {Function} syncQueueItemFn - Function to sync a queue item
 * @returns {Promise<Object>} - { synced: number, failed: number }
 */
export const syncPendingData = async (syncTransactionFn, syncQueueItemFn) => {
  let synced = 0;
  let failed = 0;

  try {
    // Sync pending transactions
    const pendingTransactions = await getPendingTransactions();
    console.log(`🔄 Syncing ${pendingTransactions.length} pending transactions...`);

    for (const transaction of pendingTransactions) {
      try {
        await syncTransactionFn(transaction);
        await markTransactionSynced(transaction.id);
        synced++;
        console.log(`✅ Transaction synced: ${transaction.id}`);
      } catch (error) {
        console.error(`❌ Error syncing transaction ${transaction.id}:`, error);
        failed++;
      }
    }

    // Sync queue items
    const syncQueue = await getSyncQueue();
    console.log(`🔄 Syncing ${syncQueue.length} queue items...`);

    for (const item of syncQueue) {
      try {
        await syncQueueItemFn(item);
        await markSyncQueueItemSynced(item.id);
        synced++;
        console.log(`✅ Queue item synced: ${item.id}`);
      } catch (error) {
        console.error(`❌ Error syncing queue item ${item.id}:`, error);
        failed++;
      }
    }

    return { synced, failed };
  } catch (error) {
    console.error('❌ Error in syncPendingData:', error);
    return { synced, failed };
  }
};

/**
 * Hook untuk auto-sync ketika online
 * @param {Function} syncTransactionFn - Function to sync a transaction
 * @param {Function} syncQueueItemFn - Function to sync a queue item
 * @param {boolean} isOnline - Online status
 */
export const useAutoSync = (syncTransactionFn, syncQueueItemFn, isOnline) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    if (isOnline && !isSyncing) {
      const sync = async () => {
        setIsSyncing(true);
        try {
          const result = await syncPendingData(syncTransactionFn, syncQueueItemFn);
          setLastSyncTime(new Date());
          console.log(`✅ Auto-sync completed: ${result.synced} synced, ${result.failed} failed`);
        } catch (error) {
          console.error('❌ Auto-sync error:', error);
        } finally {
          setIsSyncing(false);
        }
      };

      // Sync immediately when online
      sync();

      // Sync periodically (every 30 seconds when online)
      const interval = setInterval(sync, 30000);

      return () => clearInterval(interval);
    }
  }, [isOnline, isSyncing, syncTransactionFn, syncQueueItemFn]);

  return { isSyncing, lastSyncTime };
};

