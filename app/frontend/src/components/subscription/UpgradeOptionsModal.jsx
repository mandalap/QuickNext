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
  const [selectedOption, setSelectedOption] = useState('bonus_days');
  const [showFormula, setShowFormula] = useState({});

  useEffect(() => {
    if (upgradeOptions) {
      // Default ke bonus_days (REKOMENDASI TERBAIK)
      if (upgradeOptions.bonus_days) {
        setSelectedOption('bonus_days');
      } else if (upgradeOptions.daily_value) {
        setSelectedOption('daily_value');
      } else if (upgradeOptions.discount) {
        setSelectedOption('discount');
      }
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
      case 'daily_value':
        return <Clock className='w-5 h-5 text-blue-500' />;
      case 'bonus_days':
        return <Zap className='w-5 h-5 text-green-500' />;
      case 'discount':
        return <Star className='w-5 h-5 text-yellow-500' />;
      default:
        return <Check className='w-5 h-5 text-gray-500' />;
    }
  };

  const getOptionBadge = option => {
    if (option.is_recommended) {
      return (
        <Badge className='bg-green-600 text-white font-semibold'>
          ⭐ REKOMENDASI TERBAIK
        </Badge>
      );
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

  const toggleFormula = key => {
    setShowFormula(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
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
                      <div className='text-sm text-green-600 mt-1'>
                        <div>Credit: {formatPrice(option.credit_amount)}</div>
                        {option.credit_percentage > 0 && (
                          <div className='text-xs text-gray-500'>
                            ({option.credit_percentage}% dari sisa nilai)
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className='text-sm text-gray-600 space-y-1'>
                    <div>
                      <span className='font-medium'>Total Hari:</span>{' '}
                      <span className='text-blue-600 font-semibold'>
                        {option.total_days} hari
                      </span>
                    </div>
                    {option.bonus_days > 0 && (
                      <div className='text-green-600'>
                        <span className='font-medium'>Bonus:</span>{' '}
                        {option.bonus_days} hari
                        {option.max_bonus_days && (
                          <span className='text-xs text-gray-500'>
                            {' '}
                            (max {option.max_bonus_days} hari)
                          </span>
                        )}
                      </div>
                    )}
                    <div>
                      <span className='font-medium'>Berlaku hingga:</span>
                      <p className='font-semibold'>{formatDate(option.ends_at)}</p>
                    </div>
                  </div>

                  {option.savings > 0 && (
                    <div className='bg-green-100 text-green-800 text-sm p-2 rounded'>
                      <strong>Hemat {formatPrice(option.savings)}</strong>
                    </div>
                  )}

                  {option.recommendation_reason && (
                    <div className='bg-blue-50 border border-blue-200 text-blue-800 text-xs p-2 rounded'>
                      {option.recommendation_reason}
                    </div>
                  )}

                  {/* Formula Details */}
                  {option.calculation_details && (
                    <div className='border-t pt-3 mt-3'>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          toggleFormula(key);
                        }}
                        className='text-xs text-blue-600 hover:text-blue-800 font-medium w-full text-left'
                      >
                        {showFormula[key] ? '▼' : '▶'} Lihat Rumus Perhitungan
                      </button>
                      {showFormula[key] && (
                        <div className='mt-2 bg-gray-50 p-3 rounded text-xs space-y-1'>
                          <div className='font-semibold text-gray-700 mb-2'>
                            Rumus:
                          </div>
                          <div className='text-gray-600 font-mono bg-white p-2 rounded border'>
                            {option.calculation_details.formula}
                          </div>
                          {option.calculation_details.formula_explanation && (
                            <div className='text-gray-500 italic mt-1'>
                              {option.calculation_details.formula_explanation}
                            </div>
                          )}
                          {option.calculation_details.current_daily_price && (
                            <div className='mt-2 space-y-1'>
                              <div>
                                Harga Basic/hari:{' '}
                                {formatPrice(
                                  option.calculation_details.current_daily_price
                                )}
                              </div>
                              <div>
                                Harga Pro/hari:{' '}
                                {formatPrice(
                                  option.calculation_details.new_daily_price
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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












































































