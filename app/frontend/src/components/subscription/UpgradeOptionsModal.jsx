import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

const UpgradeOptionsModal = ({
  isOpen,
  onClose,
  onSelectOption,
  upgradeOptions,
  planName,
  loading = false,
  loadingOptions = false,
}) => {
  const formatPrice = price => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-2xl font-bold'>
            Upgrade ke {planName}
          </DialogTitle>
        </DialogHeader>

        {loadingOptions ? (
          <div className='flex flex-col items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-blue-600 mb-4' />
            <p className='text-gray-600'>Memuat opsi upgrade...</p>
          </div>
        ) : !upgradeOptions || !upgradeOptions.upgrade_option ? (
          <div className='flex flex-col items-center justify-center py-12'>
            <p className='text-gray-600'>Tidak ada opsi upgrade tersedia</p>
          </div>
        ) : (
          <>
            {upgradeOptions.summary && (
              <div className='bg-gray-50 rounded-lg p-4 mb-6'>
            <h3 className='font-semibold text-gray-900 mb-2'>
              Ringkasan Upgrade
            </h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
              <div>
                <span className='text-gray-600'>Dari:</span>
                <p className='font-medium'>
                  {upgradeOptions.summary.current_plan}
                </p>
              </div>
              <div>
                <span className='text-gray-600'>Ke:</span>
                <p className='font-medium'>{upgradeOptions.summary.new_plan}</p>
              </div>
              <div>
                <span className='text-gray-600'>Sisa Waktu:</span>
                <p className='font-medium'>
                  {upgradeOptions.summary.remaining_days} hari
                </p>
              </div>
              <div>
                <span className='text-gray-600'>Harga Baru:</span>
                <p className='font-medium'>
                  {formatPrice(upgradeOptions.summary.new_plan_price)}
                </p>
              </div>
              </div>
            </div>
            )}

            <div className='border-2 border-blue-500 rounded-lg p-6 bg-blue-50'>
              <div className='space-y-4'>
                <div className='text-center'>
                  <div className='text-3xl font-bold text-gray-900'>
                    {formatPrice(upgradeOptions.upgrade_option.amount_to_pay)}
                  </div>
                  {upgradeOptions.upgrade_option.credit_amount > 0 && (
                <div className='text-sm text-green-600 mt-1'>
                    <div>Credit: {formatPrice(upgradeOptions.upgrade_option.credit_amount)}</div>
                    {upgradeOptions.upgrade_option.credit_percentage > 0 && (
                      <div className='text-xs text-gray-500'>
                        ({upgradeOptions.upgrade_option.credit_percentage}% dari sisa nilai)
                      </div>
                    )}
                  </div>
                  )}
                </div>

                <div className='text-sm text-gray-600 space-y-1'>
                  <div>
                    <span className='font-medium'>Total Hari:</span>{' '}
                    <span className='text-blue-600 font-semibold'>
                      {upgradeOptions.upgrade_option.total_days} hari
                    </span>
                  </div>
                  {upgradeOptions.upgrade_option.bonus_days > 0 && (
                    <div className='text-green-600'>
                      <span className='font-medium'>Bonus:</span>{' '}
                      {upgradeOptions.upgrade_option.bonus_days} hari
                      {upgradeOptions.upgrade_option.max_bonus_days && (
                        <span className='text-xs text-gray-500'>
                          {' '}
                          (max {upgradeOptions.upgrade_option.max_bonus_days} hari)
                        </span>
                      )}
                    </div>
                  )}
                  <div>
                    <span className='font-medium'>Berlaku hingga:</span>
                    <p className='font-semibold'>{formatDate(upgradeOptions.upgrade_option.ends_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex justify-end gap-3 mt-6 pt-4 border-t'>
              <Button variant='outline' onClick={onClose}>
                Batal
              </Button>
              <Button
                onClick={() => onSelectOption(upgradeOptions.upgrade_option)}
            disabled={loading}
            className='bg-blue-600 hover:bg-blue-700'
          >
                {loading ? 'Memproses...' : 'Lanjutkan Upgrade'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeOptionsModal;












































































