import { Check, Clock, Star, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

const UpgradeOptionsModal = ({
  isOpen,
  onClose,
  onSelectOption,
  upgradeOptions,
  planName,
  loading = false,
}) => {
  const [selectedOption, setSelectedOption] = useState('prorated');

  useEffect(() => {
    if (upgradeOptions && upgradeOptions.prorated) {
      setSelectedOption('prorated');
    }
  }, [upgradeOptions]);

  if (!upgradeOptions) return null;

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

  const getOptionIcon = type => {
    switch (type) {
      case 'prorated':
        return <Clock className='w-5 h-5 text-blue-500' />;
      case 'full':
        return <Zap className='w-5 h-5 text-green-500' />;
      case 'discount':
        return <Star className='w-5 h-5 text-yellow-500' />;
      default:
        return <Check className='w-5 h-5 text-gray-500' />;
    }
  };

  const getOptionBadge = option => {
    if (option.is_recommended) {
      return <Badge className='bg-blue-100 text-blue-800'>Rekomendasi</Badge>;
    }
    if (option.savings > 0) {
      return (
        <Badge className='bg-green-100 text-green-800'>
          Hemat {formatPrice(option.savings)}
        </Badge>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-2xl font-bold'>
            Pilih Opsi Upgrade ke {planName}
          </DialogTitle>
          <p className='text-gray-600'>
            Pilih cara upgrade yang paling sesuai dengan kebutuhan Anda
          </p>
        </DialogHeader>

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

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {Object.entries(upgradeOptions).map(([key, option]) => {
            if (key === 'summary') return null;

            return (
              <div
                key={key}
                className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  selectedOption === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedOption(key)}
              >
                {getOptionBadge(option)}

                <div className='flex items-center gap-3 mb-4'>
                  {getOptionIcon(option.type)}
                  <div>
                    <h3 className='font-semibold text-lg'>{option.label}</h3>
                    <p className='text-sm text-gray-600'>
                      {option.description}
                    </p>
                  </div>
                </div>

                <div className='space-y-3'>
                  <div className='text-center'>
                    <div className='text-3xl font-bold text-gray-900'>
                      {formatPrice(option.amount_to_pay)}
                    </div>
                    {option.credit_amount > 0 && (
                      <div className='text-sm text-green-600'>
                        Credit: {formatPrice(option.credit_amount)}
                      </div>
                    )}
                  </div>

                  <div className='text-sm text-gray-600'>
                    <p>Berlaku hingga:</p>
                    <p className='font-medium'>{formatDate(option.ends_at)}</p>
                  </div>

                  {option.savings > 0 && (
                    <div className='bg-green-100 text-green-800 text-sm p-2 rounded'>
                      <strong>Hemat {formatPrice(option.savings)}</strong>
                    </div>
                  )}
                </div>

                {selectedOption === key && (
                  <div className='absolute top-2 right-2'>
                    <div className='w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center'>
                      <Check className='w-4 h-4 text-white' />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className='flex justify-end gap-3 mt-6 pt-4 border-t'>
          <Button variant='outline' onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={() => onSelectOption(upgradeOptions[selectedOption])}
            disabled={loading}
            className='bg-blue-600 hover:bg-blue-700'
          >
            {loading ? 'Memproses...' : 'Pilih Opsi Ini'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeOptionsModal;












































































