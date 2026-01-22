import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import apiClient from '../utils/apiClient';

const PaymentPending = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const subscription = location.state?.subscription;

  useEffect(() => {
    // Initial loading - wait a bit to ensure state is ready
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // ✅ OPTIMIZATION: Auto-check payment status every 10 seconds (reduced frequency)
    // Timeout sudah di-handle dengan baik, jadi tidak perlu terlalu sering check
    const interval = setInterval(() => {
      if (subscription?.subscription_code && !checking) {
        checkPaymentStatus();
      }
    }, 10000); // ✅ Increased from 5s to 10s to reduce server load

    return () => clearInterval(interval);
  }, [subscription, checking]);

  const checkPaymentStatus = async () => {
    if (checking) return;

    setChecking(true);
    try {
      // ✅ OPTIMIZATION: Increase timeout untuk payment status check (Midtrans API bisa lambat)
      const response = await apiClient.get(
        `/v1/payments/status/${subscription.subscription_code}`,
        {
          timeout: 15000, // 15 seconds untuk Midtrans API call
        }
      );

      if (response.data.success) {
        const status = response.data.data.transaction_status;
        const subscriptionData = response.data.data.subscription || subscription;
        console.log('📋 Payment status:', status);
        console.log('📋 Subscription data:', subscriptionData);

        // ✅ FIX: Check subscription status as well (in case transaction_status is not updated)
        const subscriptionStatus = subscriptionData?.status || subscription?.status;
        
        if (status === 'settlement' || status === 'capture' || subscriptionStatus === 'active') {
          // Payment successful - redirect to payment success page
          console.log('✅ Payment successful, redirecting to success page...');
          // ✅ Clear cache to force fresh data
          localStorage.removeItem('skipSubscriptionCheck');
          navigate('/payment/success', {
            state: { 
              paymentSuccess: true, 
              subscription: subscriptionData,
              transaction_status: status
            },
          });
        } else if (
          status === 'cancel' ||
          status === 'deny' ||
          status === 'expire' ||
          subscriptionStatus === 'cancelled'
        ) {
          // Payment failed
          console.log('❌ Payment failed, redirecting to failed page...');
          navigate('/payment/failed', {
            state: { subscription: subscriptionData },
          });
        } else if (status === 'pending') {
          // Still pending, stay on page
          console.log('⏳ Payment still pending...');
        }
      }
    } catch (error) {
      // ✅ OPTIMIZATION: Handle timeout gracefully - jangan spam error
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const is404 = error.response?.status === 404;
      
      if (isTimeout) {
        // Timeout - silent fail, akan retry di interval berikutnya
        console.log('Payment status check timeout, will retry...');
      } else if (is404) {
        // 404 - subscription mungkin tidak ditemukan atau sudah dihapus
        console.warn('Subscription not found for payment status check');
      } else {
        // Other errors - log but don't spam
        console.error('Failed to check payment status:', error.response?.status || error.message);
      }
    } finally {
      setChecking(false);
    }
  };

  const handlePayNow = async () => {
    if (!subscription?.subscription_code) {
      setPaymentError('Kode subscription tidak ditemukan');
      return;
    }

    setLoadingPayment(true);
    setPaymentError('');

    try {
      const token = localStorage.getItem('token');

      // ✅ FIX: Check if snap_token is already in location.state (from upgrade)
      const snapTokenFromState = location.state?.snap_token;
      const clientKeyFromState = location.state?.client_key;

      if (snapTokenFromState && clientKeyFromState) {
        // Use token from state (upgrade flow)
        openMidtransSnap(snapTokenFromState, clientKeyFromState);
        return;
      }

      // Get payment token from backend (for new subscription flow)
      // ✅ OPTIMIZATION: Increase timeout untuk payment token (Midtrans API bisa lambat)
      const response = await apiClient.get(
        `/v1/subscriptions/payment-token/${subscription.subscription_code}`,
        {
          timeout: 15000, // 15 seconds untuk Midtrans API call
        }
      );

      if (response.data.success && response.data.data.snap_token) {
        const { snap_token, client_key } = response.data.data;

        // Load Midtrans Snap script if not already loaded
        if (!window.snap) {
          const script = document.createElement('script');
          script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
          script.setAttribute('data-client-key', client_key);
          script.onload = () => {
            openMidtransSnap(snap_token);
          };
          script.onerror = () => {
            setPaymentError(
              'Gagal memuat Midtrans. Silakan refresh halaman dan coba lagi.'
            );
            setLoadingPayment(false);
          };
          document.body.appendChild(script);
        } else {
          openMidtransSnap(snap_token);
        }
      } else {
        setPaymentError(
          'Gagal mendapatkan token pembayaran. Silakan coba lagi.'
        );
        setLoadingPayment(false);
      }
    } catch (error) {
      console.error('Failed to get payment token:', error);

      // ✅ FIX: Handle case where payment already succeeded (400 with specific message)
      if (error.response?.status === 400) {
        const message = error.response?.data?.message || '';
        if (message.includes('Pembayaran sudah berhasil') || message.includes('already paid')) {
          // Payment already succeeded, redirect to success page
          setPaymentError('');
          navigate('/payment/success', {
            state: { 
              subscription,
              paymentSuccess: true,
              message: 'Pembayaran sudah berhasil. Subscription akan diaktifkan segera.'
            },
          });
          return;
        }
      }

      // Better error handling
      if (error.response?.status === 403) {
        setPaymentError(
          'Akses ditolak. Pastikan Anda sudah login dan subscription masih pending payment.'
        );
      } else if (error.response?.status === 404) {
        setPaymentError(
          'Subscription tidak ditemukan atau sudah dibayar. Silakan cek status pembayaran.'
        );
      } else if (error.response?.status === 500) {
        setPaymentError(
          error.response?.data?.message ||
            'Terjadi kesalahan server. Silakan coba lagi beberapa saat lagi.'
        );
      } else if (!error.response) {
        setPaymentError(
          'Tidak dapat terhubung ke server. Pastikan server backend berjalan.'
        );
      } else {
        setPaymentError(
          error.response?.data?.message ||
            'Gagal memuat halaman pembayaran. Silakan coba lagi.'
        );
      }

      setLoadingPayment(false);
    }
  };

  const openMidtransSnap = (snapToken, clientKey = null) => {
    // ✅ FIX: Load Midtrans script if not loaded or client key changed
    if (!window.snap || (clientKey && !document.querySelector(`script[data-client-key="${clientKey}"]`))) {
      const script = document.createElement('script');
      script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
      if (clientKey) {
        script.setAttribute('data-client-key', clientKey);
      } else {
        // Get client key from config or use default
        script.setAttribute('data-client-key', location.state?.client_key || '');
      }
      
      script.onload = () => {
        executeSnapPay(snapToken);
      };
      script.onerror = () => {
        setPaymentError('Gagal memuat Midtrans. Silakan refresh halaman dan coba lagi.');
        setLoadingPayment(false);
      };
      document.body.appendChild(script);
      return;
    }

    executeSnapPay(snapToken);
  };

  const executeSnapPay = (snapToken) => {
    if (!window.snap) {
      setPaymentError('Midtrans belum dimuat. Silakan refresh halaman dan coba lagi.');
      setLoadingPayment(false);
      return;
    }

    try {
      window.snap.pay(snapToken, {
        onSuccess: async function (result) {
          console.log('Payment success:', result);
          setPaymentError('');
          setLoadingPayment(false);

          // ✅ FIX: Always redirect to payment success page
          // PaymentSuccess page will handle redirect based on is_upgrade flag
          const isUpgrade = location.state?.is_upgrade || false;
          
          navigate('/payment/success', {
            state: { 
              subscription, 
              paymentResult: result,
              is_upgrade: isUpgrade, // Pass upgrade flag
            },
          });
        },
        onPending: function (result) {
          console.log('Payment pending:', result);
          setPaymentError('');
          setLoadingPayment(false);
          // Stay on this page, auto-check will handle status update
        },
        onError: function (result) {
          console.error('Payment error:', result);
          setPaymentError('Pembayaran gagal. Silakan coba lagi.');
          setLoadingPayment(false);
        },
        onClose: function () {
          console.log('Payment popup closed');
          setPaymentError('');
          setLoadingPayment(false);
        },
      });
    } catch (error) {
      // Handle postMessage errors (cross-origin communication)
      // These are usually safe to ignore in development
      if (error.message && error.message.includes('postMessage')) {
        console.warn(
          'Midtrans postMessage warning (safe to ignore in development):',
          error.message
        );
        // Don't set error message for postMessage issues - payment popup should still work
      } else {
        console.error('Error opening Midtrans payment:', error);
        setPaymentError('Gagal membuka halaman pembayaran. Silakan coba lagi.');
        setLoadingPayment(false);
      }
    }
  };

  if (initialLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center py-12 px-4'>
        <div className='max-w-md w-full bg-white rounded-lg shadow-xl p-8'>
          <div className='flex flex-col items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-yellow-600 mb-4' />
            <p className='text-gray-600'>Memuat halaman pembayaran...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center py-12 px-4'>
      <div className='max-w-md w-full bg-white rounded-lg shadow-xl p-8'>
        <div className='text-center'>
          <div className='mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4'>
            <svg
              className='h-8 w-8 text-yellow-600 animate-pulse'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>

          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Pembayaran Pending
          </h2>
          <p className='text-gray-600 mb-6'>
            Pembayaran Anda sedang diproses. Silakan selesaikan pembayaran untuk
            mengaktifkan subscription.
          </p>

          {subscription && (
            <div className='bg-gray-50 rounded-lg p-4 mb-6 text-left'>
              <h3 className='font-semibold text-gray-900 mb-3'>
                Detail Subscription
              </h3>
              <div className='text-sm text-gray-600 space-y-2'>
                <p>
                  <span className='font-medium text-gray-700'>Paket:</span>{' '}
                  <span className='text-gray-900'>
                    {subscription.subscription_plan?.name || 'N/A'}
                  </span>
                </p>
                <p>
                  <span className='font-medium text-gray-700'>
                    Kode Pembayaran:
                  </span>{' '}
                  <span className='text-gray-900 font-mono'>
                    {subscription.subscription_code}
                  </span>
                </p>
                {subscription.amount_paid > 0 && (
                  <p>
                    <span className='font-medium text-gray-700'>Jumlah:</span>{' '}
                    <span className='text-gray-900 font-semibold'>
                      Rp{' '}
                      {new Intl.NumberFormat('id-ID').format(
                        subscription.amount_paid
                      )}
                    </span>
                  </p>
                )}
                <p>
                  <span className='font-medium text-gray-700'>Status:</span>{' '}
                  <span className='text-orange-600 font-medium'>
                    Pending Payment
                  </span>
                </p>
              </div>
            </div>
          )}

          {paymentError && (
            <div className='mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm'>
              {paymentError}
            </div>
          )}

          <div className='space-y-3'>
            <button
              onClick={handlePayNow}
              disabled={loadingPayment || !subscription?.subscription_code}
              className='w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loadingPayment ? (
                <span className='flex items-center justify-center'>
                  <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2'></div>
                  Memuat Pembayaran...
                </span>
              ) : (
                'Lanjutkan Pembayaran'
              )}
            </button>

            <button
              onClick={checkPaymentStatus}
              disabled={checking}
              className='w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {checking ? (
                <span className='flex items-center justify-center'>
                  <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2'></div>
                  Mengecek Status...
                </span>
              ) : (
                'Cek Status Pembayaran'
              )}
            </button>

            <button
              onClick={() => navigate('/subscription-settings')}
              className='w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium'
            >
              Kembali ke Pengaturan Subscription
            </button>
          </div>

          <p className='text-xs text-gray-500 mt-6'>
            Status pembayaran akan dicek otomatis setiap 5 detik
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPending;
