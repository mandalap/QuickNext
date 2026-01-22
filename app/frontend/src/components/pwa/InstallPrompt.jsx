import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Button } from '../ui/button';

/**
 * Component untuk menampilkan install prompt PWA
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the prompt
 * @param {Function} props.onDismiss - Function to dismiss the prompt
 */
const InstallPrompt = ({ show = true, onDismiss }) => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable || !show) {
    return null;
  }

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      console.log('✅ User accepted install prompt');
      if (onDismiss) {
        onDismiss();
      }
    }
  };

  const handleDismiss = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-xl border border-blue-200 p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-blue-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">
            Install QuickKasir
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Install aplikasi untuk akses lebih cepat dan bekerja offline
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="text-sm px-4 py-2"
              size="sm"
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
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;

