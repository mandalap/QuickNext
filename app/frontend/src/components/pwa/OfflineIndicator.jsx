import { Wifi, WifiOff, CheckCircle } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useEffect, useState } from 'react';

/**
 * Component untuk menampilkan status online/offline
 * 
 * @param {Object} props
 * @param {string} props.position - Position of indicator ('top' | 'bottom')
 */
const OfflineIndicator = ({ position = 'top' }) => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline]);

  // Don't show anything if online and not recently reconnected
  if (isOnline && !showReconnected) {
    return null;
  }

  const positionClasses = position === 'top' 
    ? 'top-4 left-1/2 transform -translate-x-1/2' 
    : 'bottom-4 left-1/2 transform -translate-x-1/2';

  if (showReconnected && isOnline) {
    return (
      <div className={`fixed ${positionClasses} z-50 animate-slide-down`}>
        <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-900">
            Koneksi dipulihkan
          </span>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className={`fixed ${positionClasses} z-50 animate-slide-down`}>
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-red-600" />
          <span className="text-sm font-medium text-red-900">
            Mode Offline - Beberapa fitur mungkin tidak tersedia
          </span>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Badge component untuk menampilkan status online/offline di corner
 */
export const OfflineBadge = () => {
  const { isOnline } = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-red-600 text-white rounded-full p-2 shadow-lg flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span className="text-xs font-medium">Offline</span>
      </div>
    </div>
  );
};

export default OfflineIndicator;

