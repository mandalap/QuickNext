import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Crown, TrendingUp } from 'lucide-react';

/**
 * Modal component to display subscription limit errors with upgrade CTA
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.errorData - Error data from API response
 * @param {string} props.errorData.message - Main error message
 * @param {string} props.errorData.upgrade_message - Upgrade call-to-action message
 * @param {Object} props.errorData.limits - Current limits object
 * @param {string} props.errorData.upgrade_url - URL to subscription settings
 */
const SubscriptionLimitModal = ({ isOpen, onClose, errorData }) => {
  const navigate = useNavigate();

  if (!isOpen || !errorData) return null;

  const handleUpgrade = () => {
    onClose();
    navigate(errorData.upgrade_url || '/subscription-settings');
  };

  const { message, upgrade_message, limits } = errorData;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
            Limit Paket Anda Sudah Habis
          </h3>

          {/* Message */}
          <p className="text-center text-gray-600 mb-4 leading-relaxed">
            {message || 'Limit yang tersedia di paket Anda sudah habis digunakan.'}
          </p>

          {/* Current Usage */}
          {limits && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700 mb-2">Penggunaan Saat Ini:</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{limits.current_outlets}</p>
                  <p className="text-xs text-gray-600">Outlet</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{limits.current_products}</p>
                  <p className="text-xs text-gray-600">Produk</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{limits.current_employees}</p>
                  <p className="text-xs text-gray-600">Karyawan</p>
                </div>
              </div>
              <div className="border-t pt-2 mt-2">
                <p className="text-xs text-gray-600 text-center">
                  Limit: {limits.max_outlets === -1 ? '∞' : limits.max_outlets} outlet,
                  {' '}{limits.max_products === -1 ? '∞' : limits.max_products} produk,
                  {' '}{limits.max_employees === -1 ? '∞' : limits.max_employees} karyawan
                </p>
              </div>
            </div>
          )}

          {/* Upgrade Message */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Tingkatkan Paket Anda
                </p>
                <p className="text-sm text-blue-700">
                  {upgrade_message || 'Upgrade untuk mendapatkan lebih banyak fitur dan kapasitas!'}
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold text-gray-700">Keuntungan Upgrade:</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>Lebih banyak outlet, produk & karyawan</span>
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>Fitur premium & laporan advanced</span>
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>Integrasi marketplace & API access</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Tutup
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Upgrade Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionLimitModal;
