import {
  Calendar,
  CheckCircle,
  Download,
  Receipt,
  Share2,
  User,
  X,
} from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';

const TransactionSuccess = ({
  transaction,
  onClose,
  onPrint,
  onShare,
  showDetails = true,
}) => {
  if (!transaction) return null;

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = date => {
    return new Date(date).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodIcon = method => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return '💵';
      case 'credit_card':
        return '💳';
      case 'bank_transfer':
        return '🏦';
      case 'e_wallet':
        return '📱';
      default:
        return '💰';
    }
  };

  const getPaymentMethodName = method => {
    const methods = {
      cash: 'Tunai',
      credit_card: 'Kartu Kredit',
      bank_transfer: 'Transfer Bank',
      e_wallet: 'E-Wallet',
    };
    return methods[method?.toLowerCase()] || method || 'Tunai';
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <Card className='w-full max-w-md mx-auto bg-white shadow-2xl'>
        <CardContent className='p-6'>
          {/* Header */}
          <div className='text-center mb-6'>
            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <CheckCircle className='w-10 h-10 text-green-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              Transaksi Berhasil!
            </h2>
            <p className='text-gray-600'>
              Pembayaran telah diproses dengan sukses
            </p>
          </div>

          {/* Transaction Details */}
          {showDetails && (
            <div className='space-y-4 mb-6'>
              {/* Transaction Number */}
              <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                <div className='flex items-center space-x-2'>
                  <Receipt className='w-5 h-5 text-gray-600' />
                  <span className='font-medium text-gray-700'>
                    No. Transaksi
                  </span>
                </div>
                <span className='font-bold text-gray-900'>
                  #{transaction.id || transaction.transaction_number}
                </span>
              </div>

              {/* Amount */}
              <div className='text-center p-4 bg-green-50 rounded-lg'>
                <p className='text-sm text-gray-600 mb-1'>Total Pembayaran</p>
                <p className='text-3xl font-bold text-green-600'>
                  {formatCurrency(
                    transaction.total_amount || transaction.amount
                  )}
                </p>
              </div>

              {/* Payment Method */}
              <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                <div className='flex items-center space-x-2'>
                  <span className='text-2xl'>
                    {getPaymentMethodIcon(transaction.payment_method)}
                  </span>
                  <span className='font-medium text-gray-700'>
                    Metode Pembayaran
                  </span>
                </div>
                <span className='font-semibold text-gray-900'>
                  {getPaymentMethodName(transaction.payment_method)}
                </span>
              </div>

              {/* Date & Time */}
              <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                <div className='flex items-center space-x-2'>
                  <Calendar className='w-5 h-5 text-gray-600' />
                  <span className='font-medium text-gray-700'>Waktu</span>
                </div>
                <span className='font-semibold text-gray-900'>
                  {formatDate(transaction.created_at || transaction.date)}
                </span>
              </div>

              {/* Cashier */}
              {transaction.cashier && (
                <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <User className='w-5 h-5 text-gray-600' />
                    <span className='font-medium text-gray-700'>Kasir</span>
                  </div>
                  <span className='font-semibold text-gray-900'>
                    {transaction.cashier}
                  </span>
                </div>
              )}

              {/* Customer */}
              {transaction.customer && (
                <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <User className='w-5 h-5 text-gray-600' />
                    <span className='font-medium text-gray-700'>Pelanggan</span>
                  </div>
                  <span className='font-semibold text-gray-900'>
                    {transaction.customer}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className='space-y-3'>
            <div className='grid grid-cols-2 gap-3'>
              <Button
                variant='outline'
                className='w-full'
                onClick={onPrint}
                data-testid='print-receipt'
              >
                <Download className='w-4 h-4 mr-2' />
                Cetak
              </Button>
              <Button
                variant='outline'
                className='w-full'
                onClick={onShare}
                data-testid='share-receipt'
              >
                <Share2 className='w-4 h-4 mr-2' />
                Bagikan
              </Button>
            </div>

            <Button
              className='w-full bg-green-600 hover:bg-green-700'
              onClick={onClose}
              data-testid='close-success'
            >
              <CheckCircle className='w-4 h-4 mr-2' />
              Selesai
            </Button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors'
            data-testid='close-button'
          >
            <X className='w-6 h-6' />
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionSuccess;
