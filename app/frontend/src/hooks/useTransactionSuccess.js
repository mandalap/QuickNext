import { useCallback, useState } from 'react';

export const useTransactionSuccess = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [transaction, setTransaction] = useState(null);

  const showSuccess = useCallback(transactionData => {
    setTransaction(transactionData);
    setIsVisible(true);
  }, []);

  const hideSuccess = useCallback(() => {
    setIsVisible(false);
    setTransaction(null);
  }, []);

  const handlePrint = useCallback(() => {
    if (transaction) {
      // Implement print functionality
      window.print();
    }
  }, [transaction]);

  const handleShare = useCallback(() => {
    if (transaction) {
      // Implement share functionality
      if (navigator.share) {
        navigator.share({
          title: `Transaksi #${
            transaction.id || transaction.transaction_number
          }`,
          text: `Transaksi berhasil sebesar ${new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(transaction.total_amount || transaction.amount)}`,
        });
      } else {
        // Fallback: copy to clipboard
        const text = `Transaksi #${
          transaction.id || transaction.transaction_number
        } berhasil sebesar ${new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(transaction.total_amount || transaction.amount)}`;

        navigator.clipboard.writeText(text).then(() => {
          alert('Link transaksi telah disalin ke clipboard');
        });
      }
    }
  }, [transaction]);

  return {
    isVisible,
    transaction,
    showSuccess,
    hideSuccess,
    handlePrint,
    handleShare,
  };
};
