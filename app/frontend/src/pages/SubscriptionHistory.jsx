import {
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  XCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { API_CONFIG } from '../config/api.config';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/apiClient';

const SubscriptionHistory = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingPayment, setProcessingPayment] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/v1/subscriptions/history', {
        // ✅ Gunakan timeout yang lebih panjang khusus untuk history
        timeout: API_CONFIG.TIMEOUT_LONG || 20000, // default 20 detik
      });

      if (response.data && response.data.success) {
        setSubscriptions(response.data.data || []);
      } else {
        const errorMessage = response.data?.message || 'Gagal memuat history subscription';
        setError(errorMessage);
        console.error('API returned unsuccessful response:', response.data);
      }
    } catch (err) {
      // ✅ FIX: Ignore cancelled / duplicate requests (React Strict Mode & dedup)
      const isCanceled =
        err?.name === 'CanceledError' ||
        err?.code === 'ERR_CANCELED' ||
        err?.message?.includes('Duplicate request cancelled');

      if (isCanceled) {
        console.warn('SubscriptionHistory: request cancelled/duplicated, ignoring error');
        return;
      }

      console.error('Error fetching subscription history:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      // Get error message from response or use default
      let errorMessage = 'Terjadi kesalahan saat memuat history subscription';

      // ✅ Tangani timeout secara khusus
      const isTimeout =
        err.code === 'ECONNABORTED' ||
        err.message?.includes('timeout of') ||
        err.message?.includes('timeout');

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (isTimeout) {
        errorMessage =
          'Permintaan memuat history subscription melebihi batas waktu. Server mungkin sedang lambat, silakan coba lagi beberapa saat lagi.';
      } else if (err.response?.status === 403) {
        errorMessage =
          'Akses ditolak. Silakan refresh halaman atau hubungi administrator.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleContinuePayment = async (subscription) => {
    if (!subscription.subscription_code) {
      setError('Kode subscription tidak ditemukan');
      return;
    }

    setProcessingPayment(subscription.id);

    try {
      // Get payment token
      const response = await apiClient.get(
        `/v1/subscriptions/payment-token/${subscription.subscription_code}`
      );

      if (response.data.success && response.data.data.snap_token) {
        const { snap_token, client_key } = response.data.data;

        // Store subscription data for payment page
        localStorage.setItem(
          'pendingSubscription',
          JSON.stringify({
            subscription: subscription,
            snap_token: snap_token,
            client_key: client_key,
            amount_to_pay: subscription.amount_paid,
          })
        );

        // Navigate to payment pending page
        navigate('/payment/pending', {
          state: {
            subscription: subscription,
            snap_token: snap_token,
            client_key: client_key,
            amount_to_pay: subscription.amount_paid,
          },
        });
      } else {
        setError('Gagal mendapatkan token pembayaran. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Error getting payment token:', err);

      // If error is 400 (already paid), redirect to payment success
      if (err.response?.status === 400) {
        const message = err.response?.data?.message || '';
        if (
          message.includes('Pembayaran sudah berhasil') ||
          message.includes('already paid')
        ) {
          navigate('/payment/success', {
            state: {
              subscription: subscription,
              paymentSuccess: true,
            },
          });
          return;
        }
      }

      setError(
        err.response?.data?.message ||
          'Gagal memuat halaman pembayaran. Silakan coba lagi.'
      );
    } finally {
      setProcessingPayment(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: {
        label: 'Aktif',
        variant: 'default',
        icon: CheckCircle,
        className: 'bg-green-500 text-white',
      },
      pending_payment: {
        label: 'Menunggu Pembayaran',
        variant: 'default',
        icon: Clock,
        className: 'bg-yellow-500 text-white',
      },
      expired: {
        label: 'Kedaluwarsa',
        variant: 'default',
        icon: XCircle,
        className: 'bg-gray-500 text-white',
      },
      cancelled: {
        label: 'Dibatalkan',
        variant: 'default',
        icon: XCircle,
        className: 'bg-red-500 text-white',
      },
      suspended: {
        label: 'Ditangguhkan',
        variant: 'default',
        icon: AlertCircle,
        className: 'bg-orange-500 text-white',
      },
    };

    const config = statusConfig[status] || {
      label: status,
      variant: 'default',
      icon: AlertCircle,
      className: 'bg-gray-500 text-white',
    };

    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className='w-3 h-3 mr-1' />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='mb-6'>
          <Button
            variant='ghost'
            onClick={() => navigate('/subscription-settings')}
            className='mb-4'
          >
            <ArrowLeft className='w-4 h-4 mr-2' />
            Kembali ke Pengaturan Subscription
          </Button>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>
            History Pembelian Paket
          </h1>
          <p className='text-gray-600'>
            Lihat semua pembelian subscription Anda dan lanjutkan pembayaran
            yang pending
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className='mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg'>
            {error}
          </div>
        )}

        {/* Loading State - Skeleton */}
        {loading ? (
          <div className='space-y-4'>
            {[1, 2, 3].map((i) => (
              <Card key={i} className='overflow-hidden animate-pulse'>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex-1 space-y-2'>
                      <Skeleton className='h-6 w-48' />
                      <Skeleton className='h-4 w-32' />
                    </div>
                    <div className='flex items-center gap-2'>
                      <Skeleton className='h-6 w-24 rounded-full' />
                      <Skeleton className='h-5 w-12 rounded' />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='pt-2'>
                  <div className='space-y-3'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div className='flex items-center gap-2'>
                        <Skeleton className='h-4 w-4 rounded' />
                        <div className='flex-1'>
                          <Skeleton className='h-4 w-24 mb-1' />
                          <Skeleton className='h-5 w-32' />
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Skeleton className='h-4 w-4 rounded' />
                        <div className='flex-1'>
                          <Skeleton className='h-4 w-24 mb-1' />
                          <Skeleton className='h-5 w-40' />
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Skeleton className='h-4 w-4 rounded' />
                        <div className='flex-1'>
                          <Skeleton className='h-4 w-20 mb-1' />
                          <Skeleton className='h-5 w-36' />
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Skeleton className='h-4 w-4 rounded' />
                        <div className='flex-1'>
                          <Skeleton className='h-4 w-24 mb-1' />
                          <Skeleton className='h-5 w-28' />
                        </div>
                      </div>
                    </div>
                    <div className='pt-4 border-t'>
                      <Skeleton className='h-10 w-full rounded-lg' />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <Card>
            <CardContent className='py-12 text-center'>
              <CreditCard className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-600'>Belum ada history subscription</p>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-4'>
            {subscriptions.map((subscription) => (
              <Card key={subscription.id}>
                <CardHeader>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <CardTitle className='flex items-center gap-2 mb-2'>
                        {subscription.subscription_plan?.name || 'Paket Tidak Ditemukan'}
                        {getStatusBadge(subscription.status)}
                        {subscription.is_trial && (
                          <Badge variant='outline' className='text-xs'>
                            Trial
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Kode: {subscription.subscription_code || 'N/A'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                      <div className='flex items-center gap-2 text-gray-600'>
                        <CreditCard className='w-4 h-4' />
                        <span>
                          Jumlah:{' '}
                          <span className='font-semibold text-gray-900'>
                            {formatCurrency(subscription.amount_paid)}
                          </span>
                        </span>
                      </div>
                      <div className='flex items-center gap-2 text-gray-600'>
                        <Calendar className='w-4 h-4' />
                        <span>
                          Dibuat:{' '}
                          <span className='font-semibold text-gray-900'>
                            {formatDate(subscription.created_at)}
                          </span>
                        </span>
                      </div>
                      {subscription.starts_at && (
                        <div className='flex items-center gap-2 text-gray-600'>
                          <CheckCircle className='w-4 h-4' />
                          <span>
                            Mulai:{' '}
                            <span className='font-semibold text-gray-900'>
                              {formatDate(subscription.starts_at)}
                            </span>
                          </span>
                        </div>
                      )}
                      {subscription.ends_at && (
                        <div className='flex items-center gap-2 text-gray-600'>
                          <XCircle className='w-4 h-4' />
                          <span>
                            Berakhir:{' '}
                            <span className='font-semibold text-gray-900'>
                              {formatDate(subscription.ends_at)}
                            </span>
                          </span>
                        </div>
                      )}
                      {subscription.status === 'active' &&
                        subscription.days_remaining !== null && (
                          <div className='flex items-center gap-2 text-gray-600'>
                            <Clock className='w-4 h-4' />
                            <span>
                              Hari Tersisa:{' '}
                              <span className='font-semibold text-green-600'>
                                {subscription.days_remaining} hari
                              </span>
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Action Button for Pending Payment */}
                    {subscription.status === 'pending_payment' && (
                      <div className='pt-4 border-t'>
                        <Button
                          onClick={() => handleContinuePayment(subscription)}
                          disabled={processingPayment === subscription.id}
                          className='w-full bg-yellow-600 hover:bg-yellow-700 text-white'
                        >
                          {processingPayment === subscription.id ? (
                            <>
                              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                              Memuat Pembayaran...
                            </>
                          ) : (
                            <>
                              <CreditCard className='w-4 h-4 mr-2' />
                              Lanjutkan Pembayaran
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionHistory;
