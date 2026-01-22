import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CreditCard,
  Crown,
  Loader2,
  Shield,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { useToast } from '../components/ui/toast';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/apiClient';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, currentBusiness, checkSubscription, loadBusinesses } =
    useAuth();

  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState({});

  useEffect(() => {
    fetchCurrentSubscription();
    fetchPlans();
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      const response = await apiClient.get('/v1/subscriptions/current');

      if (response.data.success) {
        setCurrentSubscription(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching current subscription:', err);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await apiClient.get('/subscriptions/plans');

      if (response.data.success) {
        setPlans(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async plan => {
    setUpgrading(true);
    setSelectedPlan(plan.id);

    try {
      // Use the first available price if no duration selected
      const priceId = selectedDuration[plan.id] || plan.prices[0]?.id;

      if (!priceId) {
        toast({
          title: 'Error',
          description: 'Silakan pilih durasi subscription',
          variant: 'error',
        });
        setUpgrading(false);
        setSelectedPlan(null);
        return;
      }

      const response = await apiClient.post(
        '/v1/subscriptions/upgrade',
        {
          subscription_plan_id: plan.id,
          subscription_plan_price_id: priceId,
        }
      );

      if (response.data.success) {
        // ✅ FIX: Check if payment is required
        if (response.data.requires_payment && response.data.snap_token) {
          // Redirect to payment page
          toast({
            title: 'Upgrade Berhasil!',
            description: 'Silakan lakukan pembayaran untuk mengaktifkan paket.',
            variant: 'success',
          });

          // Store subscription data for payment page
          localStorage.setItem('pendingSubscription', JSON.stringify({
            subscription: response.data.data,
            snap_token: response.data.snap_token,
            client_key: response.data.client_key,
            amount_to_pay: response.data.amount_to_pay,
          }));

          // Redirect to payment page
          setTimeout(() => {
            navigate('/payment/pending', {
              state: {
                subscription: response.data.data,
                snap_token: response.data.snap_token,
                client_key: response.data.client_key,
                amount_to_pay: response.data.amount_to_pay,
                is_upgrade: true, // ✅ FIX: Mark as upgrade
              }
            });
          }, 1500);
        } else {
          // No payment required (free upgrade or already paid)
          toast({
            title: 'Upgrade Berhasil!',
            description: 'Paket berhasil diupgrade dan langsung aktif! Mengalihkan ke dashboard...',
            variant: 'success',
          });

          // Refresh subscription status
          await checkSubscription();
          await loadBusinesses();
          await fetchCurrentSubscription();

          // ✅ FIX: Redirect to dashboard instead of window.location.reload()
          // This prevents infinite reload loops caused by share-modal.js errors
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1500);
        }
      }
    } catch (err) {
      toast({
        title: 'Upgrade Gagal',
        description:
          err.response?.data?.message || 'Gagal upgrade subscription',
        variant: 'error',
      });
      console.error(err);
    } finally {
      setUpgrading(false);
      setSelectedPlan(null);
    }
  };

  const getDurationLabel = (durationType, months) => {
    if (durationType === 'monthly') return '1 Bulan';
    if (durationType === 'quarterly') return '3 Bulan';
    if (durationType === 'semi_annual') return '6 Bulan';
    if (durationType === 'annual') return '1 Tahun';
    return `${months} Bulan`;
  };

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

  const getPlanIcon = slug => {
    switch (slug) {
      case 'trial-7-days':
        return <Calendar className='w-6 h-6' />;
      case 'basic':
        return <Users className='w-6 h-6' />;
      case 'professional':
        return <Star className='w-6 h-6' />;
      case 'enterprise':
        return <Crown className='w-6 h-6' />;
      default:
        return <Building2 className='w-6 h-6' />;
    }
  };

  const getPlanColor = slug => {
    switch (slug) {
      case 'trial-7-days':
        return 'text-blue-600 bg-blue-100';
      case 'basic':
        return 'text-green-600 bg-green-100';
      case 'professional':
        return 'text-purple-600 bg-purple-100';
      case 'enterprise':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-gray-900 mb-4'>
            Kelola Subscription
          </h1>
          <p className='text-xl text-gray-600'>
            Upgrade paket Anda untuk mendapatkan fitur yang lebih lengkap
          </p>
        </div>

        {/* Current Subscription */}
        {currentSubscription && (
          <Card className='mb-8'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Crown className='w-5 h-5 text-yellow-600' />
                Subscription Saat Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <div>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    {currentSubscription.subscription_plan?.name ||
                      'Trial Plan'}
                  </h3>
                  <p className='text-sm text-gray-600'>
                    {currentSubscription.subscription_plan?.description ||
                      'Paket trial 7 hari'}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-gray-600'>Status</p>
                  <Badge
                    variant={
                      currentSubscription.status === 'active'
                        ? 'success'
                        : 'warning'
                    }
                    className='mt-1'
                  >
                    {currentSubscription.status === 'active'
                      ? 'Aktif'
                      : 'Pending'}
                  </Badge>
                </div>
                <div>
                  <p className='text-sm text-gray-600'>Berakhir</p>
                  <p className='font-medium'>
                    {formatDate(currentSubscription.ends_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div className='mb-8'>
          <h2 className='text-2xl font-bold text-gray-900 mb-6 text-center'>
            Pilih Paket yang Sesuai
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {plans.map(plan => {
              const isCurrentPlan =
                currentSubscription?.subscription_plan_id === plan.id;
              const isTrial = plan.slug === 'trial-7-days';

              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden ${
                    plan.slug === 'professional'
                      ? 'border-2 border-purple-500 shadow-xl'
                      : 'border border-gray-200'
                  } ${isCurrentPlan ? 'opacity-60' : ''}`}
                >
                  {/* Badge */}
                  {plan.slug === 'professional' && (
                    <div className='absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 rounded-bl-lg text-xs font-semibold'>
                      ⭐ POPULER
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className='absolute top-0 left-0 bg-blue-500 text-white px-3 py-1 rounded-br-lg text-xs font-semibold'>
                      PAKET AKTIF
                    </div>
                  )}

                  <CardHeader className='text-center'>
                    <div
                      className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 ${getPlanColor(
                        plan.slug
                      )}`}
                    >
                      {getPlanIcon(plan.slug)}
                    </div>
                    <CardTitle className='text-xl'>{plan.name}</CardTitle>
                    <p className='text-sm text-gray-600'>{plan.description}</p>
                  </CardHeader>

                  <CardContent className='space-y-4'>
                    {/* Pricing */}
                    <div className='text-center'>
                      {plan.prices && plan.prices.length > 0 ? (
                        <div className='space-y-2'>
                          {plan.prices.map(price => (
                            <div
                              key={price.id}
                              className='flex items-center justify-between'
                            >
                              <span className='text-sm text-gray-600'>
                                {getDurationLabel(
                                  price.duration_type,
                                  price.duration_months
                                )}
                              </span>
                              <span className='font-bold text-lg'>
                                {formatPrice(price.final_price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='text-2xl font-bold text-green-600'>
                          Gratis
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div className='space-y-2'>
                      {plan.features &&
                        plan.features.map((feature, index) => {
                          // Handle both string and object format {feature: "..."}
                          const featureText = typeof feature === 'string' 
                            ? feature 
                            : (feature?.feature || feature?.name || JSON.stringify(feature));
                          
                          return (
                            <div key={index} className='flex items-center gap-2'>
                              <Check className='w-4 h-4 text-green-600 flex-shrink-0' />
                              <span className='text-sm text-gray-700'>
                                {featureText}
                              </span>
                            </div>
                          );
                        })}
                    </div>

                    {/* Action Button */}
                    <div className='pt-4'>
                      {isCurrentPlan ? (
                        <Button variant='outline' className='w-full' disabled>
                          Paket Aktif
                        </Button>
                      ) : isTrial ? (
                        <Button variant='outline' className='w-full' disabled>
                          Trial Plan
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleUpgrade(plan)}
                          disabled={upgrading}
                          className='w-full bg-purple-600 hover:bg-purple-700'
                        >
                          {upgrading && selectedPlan === plan.id ? (
                            <>
                              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                              Mengaktifkan...
                            </>
                          ) : (
                            <>
                              Aktifkan Paket Ini
                              <ArrowRight className='w-4 h-4 ml-2' />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Info Section */}
        <Card>
          <CardContent className='pt-6'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6 text-center'>
              <div>
                <Shield className='w-8 h-8 mx-auto text-green-600 mb-2' />
                <h3 className='font-semibold mb-1'>Data Aman</h3>
                <p className='text-sm text-gray-600'>
                  Semua data bisnis Anda akan tetap aman saat upgrade
                </p>
              </div>
              <div>
                <Zap className='w-8 h-8 mx-auto text-yellow-600 mb-2' />
                <h3 className='font-semibold mb-1'>Aktivasi Instan</h3>
                <p className='text-sm text-gray-600'>
                  Paket langsung aktif tanpa perlu pembayaran (untuk testing)
                </p>
              </div>
              <div>
                <CreditCard className='w-8 h-8 mx-auto text-blue-600 mb-2' />
                <h3 className='font-semibold mb-1'>Pembayaran Mudah</h3>
                <p className='text-sm text-gray-600'>
                  Proses pembayaran yang cepat dan aman
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionPage;
