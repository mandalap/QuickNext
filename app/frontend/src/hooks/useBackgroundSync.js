import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { transactionQueue, isOnline } from '../db/indexedDB';
import { orderService } from '../services/order.service';

/**
 * Custom hook untuk background sync transactions
 * Auto-retry pending transactions saat online
 */
const useBackgroundSync = (enabled = true) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState(null);

  // Check pending count
  const checkPendingCount = async () => {
    const count = await transactionQueue.count();
    setPendingCount(count);
    return count;
  };

  // Sync pending transactions
  const syncPendingTransactions = async () => {
    if (!isOnline() || isSyncing) {
      return;
    }

    setIsSyncing(true);
    const pending = await transactionQueue.getPending();

    if (pending.length === 0) {
      setIsSyncing(false);
      return;
    }

    console.log(`🔄 Syncing ${pending.length} pending transactions...`);
    setSyncProgress({ total: pending.length, current: 0 });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pending.length; i++) {
      const transaction = pending[i];
      setSyncProgress({ total: pending.length, current: i + 1 });

      try {
        // Mark as syncing
        await transactionQueue.markSyncing(transaction.id);

        // Submit to backend
        const result = await orderService.create(transaction.order_data);

        if (result.success) {
          // Mark as synced
          await transactionQueue.markSynced(transaction.id);
          successCount++;
          console.log(`✅ Transaction ${transaction.id} synced successfully`);
        } else {
          // Mark as failed
          await transactionQueue.markFailed(
            transaction.id,
            result.error || 'Unknown error'
          );
          failCount++;
          console.error(`❌ Transaction ${transaction.id} failed:`, result.error);
        }
      } catch (error) {
        // Mark as failed
        await transactionQueue.markFailed(transaction.id, error.message);
        failCount++;
        console.error(`❌ Transaction ${transaction.id} error:`, error);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update pending count
    await checkPendingCount();

    // Show toast notification
    if (successCount > 0 || failCount > 0) {
      if (failCount === 0) {
        toast.success(
          `✅ ${successCount} transaksi berhasil disinkronkan`,
          { duration: 3000 }
        );
      } else if (successCount > 0) {
        toast.error(
          `⚠️ ${successCount} berhasil, ${failCount} gagal disinkronkan`,
          { duration: 4000 }
        );
      } else {
        toast.error(
          `❌ ${failCount} transaksi gagal disinkronkan`,
          { duration: 4000 }
        );
      }
    }

    setIsSyncing(false);
    setSyncProgress(null);
  };

  // Auto-sync on mount and when coming online
  useEffect(() => {
    if (!enabled) return;

    const handleOnline = async () => {
      console.log('🌐 Connection restored, starting background sync...');
      await checkPendingCount();
      await syncPendingTransactions();
    };

    const handleOffline = () => {
      console.log('🔌 Connection lost, transactions will be queued');
    };

    // Initial check
    checkPendingCount();
    
    // Setup online/offline listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-sync every 30 seconds when online
    const syncInterval = setInterval(async () => {
      if (isOnline()) {
        await syncPendingTransactions();
      }
    }, 30000);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [enabled]);

  // Manual sync function
  const manualSync = async () => {
    await syncPendingTransactions();
  };

  return {
    isSyncing,
    pendingCount,
    syncProgress,
    checkPendingCount,
    syncPendingTransactions,
    manualSync,
  };
};

export default useBackgroundSync;

