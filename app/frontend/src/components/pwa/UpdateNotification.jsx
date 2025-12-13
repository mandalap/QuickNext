import { RefreshCw, X } from 'lucide-react';
import { useServiceWorkerUpdate } from '../../hooks/useServiceWorkerUpdate';
import { Button } from '../ui/button';

/**
 * Component untuk menampilkan notifikasi update service worker
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the notification
 * @param {Function} props.onDismiss - Function to dismiss the notification
 */
const UpdateNotification = ({ show = true, onDismiss }) => {
  const { hasUpdate, isUpdating, updateServiceWorker, skipWaiting } = useServiceWorkerUpdate();

  // Don't show if no update available
  if (!hasUpdate || !show) {
    return null;
  }

  const handleUpdate = async () => {
    await skipWaiting();
    // Page will reload automatically
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-down">
      <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <RefreshCw className={`w-5 h-5 text-blue-600 ${isUpdating ? 'animate-spin' : ''}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">
            Update Tersedia
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Versi baru aplikasi tersedia. Update sekarang untuk mendapatkan fitur terbaru.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Mengupdate...' : 'Update Sekarang'}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="text-sm px-4 py-2"
              size="sm"
              disabled={isUpdating}
            >
              Nanti
            </Button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label="Close"
          disabled={isUpdating}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default UpdateNotification;

