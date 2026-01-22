import { AlertTriangle, Clock, Shield } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

const DowngradeConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  loading = false,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirmChange = e => {
    const value = e.target.value;
    setConfirmText(value);
    setIsConfirmed(value.toLowerCase() === 'downgrade');
  };

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  const trialFeatures = [
    'Akses ke semua fitur dasar',
    'Maksimal 1 outlet',
    'Maksimal 10 produk',
    'Maksimal 50 transaksi per bulan',
    'Support email',
    'Berlaku selama 7 hari',
  ];

  const limitations = [
    'Fitur advanced akan dinonaktifkan',
    'Data export terbatas',
    'Custom branding tidak tersedia',
    'Priority support tidak tersedia',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='text-2xl font-bold text-red-600 flex items-center gap-2'>
            <AlertTriangle className='w-6 h-6' />
            Konfirmasi Downgrade
          </DialogTitle>
          <p className='text-gray-600'>
            Anda akan menurunkan paket dari <strong>{currentPlan}</strong> ke{' '}
            <strong>Trial 7 Hari</strong>
          </p>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Warning Box */}
          <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
            <div className='flex items-start gap-3'>
              <AlertTriangle className='w-5 h-5 text-red-500 mt-0.5 flex-shrink-0' />
              <div>
                <h3 className='font-semibold text-red-900 mb-2'>
                  ⚠️ Peringatan Penting
                </h3>
                <ul className='text-sm text-red-800 space-y-1'>
                  <li>• Downgrade akan langsung aktif</li>
                  <li>• Beberapa fitur akan dibatasi</li>
                  <li>• Data Anda tetap aman dan tersimpan</li>
                  <li>• Anda dapat upgrade kembali kapan saja</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Current vs Trial Comparison */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Current Plan */}
            <div className='border border-gray-200 rounded-lg p-4'>
              <div className='flex items-center gap-2 mb-3'>
                <Shield className='w-5 h-5 text-blue-500' />
                <h3 className='font-semibold text-gray-900'>Paket Saat Ini</h3>
                <Badge className='bg-blue-100 text-blue-800'>
                  {currentPlan}
                </Badge>
              </div>
              <ul className='text-sm text-gray-600 space-y-1'>
                <li>• Akses penuh ke semua fitur</li>
                <li>• Unlimited outlet</li>
                <li>• Unlimited produk</li>
                <li>• Unlimited transaksi</li>
                <li>• Priority support</li>
                <li>• Custom branding</li>
              </ul>
            </div>

            {/* Trial Plan */}
            <div className='border border-orange-200 rounded-lg p-4 bg-orange-50'>
              <div className='flex items-center gap-2 mb-3'>
                <Clock className='w-5 h-5 text-orange-500' />
                <h3 className='font-semibold text-gray-900'>Trial 7 Hari</h3>
                <Badge className='bg-orange-100 text-orange-800'>Gratis</Badge>
              </div>
              <ul className='text-sm text-gray-600 space-y-1'>
                {trialFeatures.map((feature, index) => (
                  <li key={index}>• {feature}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Limitations */}
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
            <h3 className='font-semibold text-yellow-900 mb-2'>
              🔒 Fitur yang Akan Dibatasi
            </h3>
            <ul className='text-sm text-yellow-800 space-y-1'>
              {limitations.map((limitation, index) => (
                <li key={index}>• {limitation}</li>
              ))}
            </ul>
          </div>

          {/* Confirmation Input */}
          <div className='space-y-3'>
            <label className='block text-sm font-medium text-gray-700'>
              Untuk melanjutkan, ketik <strong>downgrade</strong> di bawah ini:
            </label>
            <input
              type='text'
              value={confirmText}
              onChange={handleConfirmChange}
              placeholder="Ketik 'downgrade' untuk konfirmasi"
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500'
            />
            {confirmText && !isConfirmed && (
              <p className='text-sm text-red-600'>
                Harap ketik &apos;downgrade&apos; dengan benar
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className='flex justify-end gap-3 pt-4 border-t'>
            <Button variant='outline' onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isConfirmed || loading}
              className='bg-red-600 hover:bg-red-700 disabled:bg-gray-400'
            >
              {loading ? (
                <span className='flex items-center gap-2'>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  Memproses...
                </span>
              ) : (
                'Ya, Downgrade ke Trial'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DowngradeConfirmationModal;
