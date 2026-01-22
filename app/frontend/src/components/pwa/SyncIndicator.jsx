import { RefreshCw, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { transactionQueue } from '../../db/indexedDB';
import useBackgroundSync from '../../hooks/useBackgroundSync';

/**
 * Component untuk menampilkan indicator sync status
 * Menggunakan transactionQueue dari indexedDB dan useBackgroundSync hook
 * 
 * @param {Object} props
 * @param {boolean} props.isOnline - Online status (optional, will use hook if not provided)
 */
const SyncIndicator = ({ isOnline: isOnlineProp }) => {
  const { isSyncing, pendingCount, syncPendingTransactions, manualSync } = useBackgroundSync();
  const [lastSynced, setLastSynced] = useState(null);

  // Use prop if provided, otherwise use hook's online detection
  const isOnline = isOnlineProp !== undefined ? isOnlineProp : navigator.onLine;

  // Update last synced time when sync completes
  useEffect(() => {
    if (!isSyncing && pendingCount === 0 && lastSynced === null) {
      // Initial check - if no pending, consider as synced
      setLastSynced(new Date());
    }
  }, [isSyncing, pendingCount, lastSynced]);

  const handleSync = async () => {
    if (!isOnline || isSyncing) {
      return;
    }

    try {
      await manualSync();
      setLastSynced(new Date());
    } catch (error) {
      console.error('❌ Error syncing:', error);
    }
  };

  // Don't show if no pending items and online
  if (pendingCount === 0 && isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 flex items-center gap-3">
        {!isOnline ? (
          <>
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-900">
                {pendingCount} item menunggu sync
              </p>
              <p className="text-xs text-gray-500">
                Menunggu koneksi...
              </p>
            </div>
          </>
        ) : pendingCount > 0 ? (
          <>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <div>
              <p className="text-xs font-medium text-gray-900">
                {pendingCount} item menunggu sync
              </p>
              <p className="text-xs text-gray-500">
                {isSyncing ? 'Menyinkronkan...' : 'Klik untuk sync'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-900">
                Semua data tersinkronkan
              </p>
              {lastSynced && (
                <p className="text-xs text-gray-500">
                  Terakhir: {lastSynced.toLocaleTimeString()}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SyncIndicator;

