import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { RefreshCw, History } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import useOptimisticUpdate from '../../hooks/useOptimisticUpdate';
import { retryWithBackoff } from '../../utils/performance/retry';
import { clearAllCache, refreshAllData } from '../../utils/refreshData';
import {
  formatRemainingTime,
  getTimeStatusColor,
} from '../../utils/timeFormatter';
import { Button } from '../ui/button';
import DowngradeConfirmationModal from './DowngradeConfirmationModal';
import SubscriptionSettingsSkeleton from './SubscriptionSettingsSkeleton';
import UpgradeOptionsModal from './UpgradeOptionsModal';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

const SubscriptionSettings = () => {
  const navigate = useNavigate();
  const {
    token,
    loadBusinesses,
    checkSubscription,
    currentBusiness,
    loadOutlets,
  } = useAuth();
  const queryClient = useQueryClient();
  const [upgrading, setUpgrading] = useState(false);
  const [loadingUpgradeOptions, setLoadingUpgradeOptions] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [upgradeOptions, setUpgradeOptions] = useState(null);
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState({});
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgrading, setDowngrading] = useState(false);

  // ✅ REACT QUERY: Fetch Current Subscription
  const {
    data: currentSubscriptionData,
    isLoading: subscriptionLoading,
    refetch: refetchCurrentSubscription,
  } = useQuery({
    queryKey: queryKeys.subscription.current(currentBusiness?.id),
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/v1/subscriptions/current`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Gagal memuat subscription');
      }
    },
    enabled: !!token && !!currentBusiness?.id,
    staleTime: 0, // ✅ FIX: Always refetch to get latest data (no stale time)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true, // ✅ FIX: Refetch when window gains focus
    placeholderData: previousData => previousData,
  });

  // ✅ FIX: Prioritize currentBusiness.subscription_info (same source as header) over React Query cache
  // This ensures consistency between header and subscription settings page
  // If subscription_info exists and has plan_name, use it (it's the most up-to-date)
  // Otherwise, fallback to React Query data
  const getCurrentSubscription = () => {
    // Priority 1: Use currentBusiness.subscription_info if it exists and has plan_name
    // This is the same data source used by header, so it's always consistent
    if (currentBusiness?.subscription_info?.plan_name) {
      const subInfo = currentBusiness.subscription_info;
      return {
        subscription_plan: {
          name: subInfo.plan_name,
          max_outlets: subInfo.features?.max_outlets ?? 1,
          max_products: subInfo.features?.max_products ?? 100,
          max_employees: subInfo.features?.max_employees ?? 5,
        },
        is_trial: subInfo.is_trial ?? false,
        status: subInfo.status || 'active',
        subscription_code: subInfo.subscription_code || 'N/A',
        ends_at: subInfo.ends_at || new Date().toISOString(),
        daysRemaining: subInfo.days_remaining ?? 0,
        subscription_plan_id: subInfo.plan_id || null,
      };
    }
    
    // Priority 2: Use React Query data if available
    if (currentSubscriptionData) {
      return currentSubscriptionData;
    }
    
    return null;
  };

  const currentSubscription = getCurrentSubscription();

  // ✅ REACT QUERY: Fetch Plans
  const {
    data: plansData,
    isLoading: plansLoading,
    refetch: refetchPlans,
  } = useQuery({
    queryKey: queryKeys.subscription.plans(),
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/subscriptions/plans`);
      if (response.data.success) {
        // Filter out trial plan from upgrade options
        const paidPlans = response.data.data.filter(
          plan => plan.slug !== 'trial-7-days'
        );

        // Set default duration for each plan
        const defaultDurations = {};
        paidPlans.forEach(plan => {
          if (plan.prices && plan.prices.length > 0) {
            defaultDurations[plan.id] = plan.prices[0].id;
          }
        });
        setSelectedDuration(defaultDurations);

        return paidPlans;
      } else {
        throw new Error(
          response.data.message || 'Gagal memuat paket subscription'
        );
      }
    },
    enabled: true,
    staleTime: 10 * 60 * 1000, // 10 minutes (plans don't change often)
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnMount: true,
    placeholderData: previousData => previousData || [],
  });

  const plans = plansData || [];
  const loading = subscriptionLoading || plansLoading;

  // ✅ OPTIMIZATION: Optimistic updates untuk upgrade/downgrade
  const {
    update: optimisticUpdateSubscription,
    isPending: isOptimisticPending,
  } = useOptimisticUpdate(
    data => {
      // Optimistic update: update UI immediately via React Query cache
      if (data.subscription) {
        queryClient.setQueryData(
          queryKeys.subscription.current(currentBusiness?.id),
          data.subscription
        );
      }
    },
    previousData => {
      // Rollback: restore previous state on error
      if (previousData) {
        queryClient.setQueryData(
          queryKeys.subscription.current(currentBusiness?.id),
          previousData.subscription
        );
      }
    }
  );

  // ✅ OPTIMIZATION: Request deduplication sudah di-handle dengan fetchingRef dan requestQueueRef

  const handleUpgradeClick = async plan => {
    if (!token) {
      setError('Token tidak ditemukan');
      return;
    }

    // ✅ FIX: Check if price/duration is selected
    const priceId = selectedDuration[plan.id];
    if (!priceId) {
      setError('Silakan pilih durasi paket terlebih dahulu');
      return;
    }

    setSelectedPlan(plan);
    setError('');
    setSuccess('');
    setLoadingUpgradeOptions(true);
    setUpgradeOptions(null);

    try {
      // Get upgrade options first
      const response = await axios.get(
        `${API_BASE_URL}/v1/subscriptions/upgrade-options/${plan.id}/${priceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setUpgradeOptions(response.data.data);
        setShowUpgradeOptions(true);
      } else {
        setError(response.data.message || 'Gagal mendapatkan opsi upgrade');
      }
    } catch (error) {
      console.error('Error getting upgrade options:', error);
      
      // ✅ FIX: Better error handling for 404 (price not found)
      if (error.response?.status === 404) {
        setError(
          error.response?.data?.message || 
          'Paket atau durasi yang dipilih tidak ditemukan. Silakan pilih durasi yang tersedia.'
        );
      } else {
        setError(
          error.response?.data?.message ||
            'Terjadi kesalahan saat mendapatkan opsi upgrade'
        );
      }
    } finally {
      setLoadingUpgradeOptions(false);
    }
  };

  // ✅ OPTIMIZATION: Handle upgrade dengan optimistic update dan retry
  const handleSelectUpgradeOption = useCallback(
    async option => {
      if (!token || !selectedPlan) {
        setError('Data tidak lengkap');
        return;
      }

      setUpgrading(true);
      setError('');
      setSuccess('');

      try {
        const priceId = selectedDuration[selectedPlan.id];

        // Don't use optimistic update - wait for API response to check payment status
        // Optimistic update can show wrong data if payment is required
        // ✅ OPTIMIZATION: API call dengan retry
        const response = await retryWithBackoff(
          () =>
            axios.post(
              `${API_BASE_URL}/v1/subscriptions/upgrade`,
              {
                subscription_plan_id: selectedPlan.id,
                subscription_plan_price_id: priceId,
                upgrade_option: option.type,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            ),
          {
            maxRetries: 3,
            baseDelay: 1000,
            shouldRetry: error => {
              if (!error.response) return true;
              const status = error.response?.status;
              return status >= 500 || status === 429;
            },
          }
        );

        if (response.data.success) {
          // ✅ FIX: Check payment status FIRST before doing anything else
          const amountToPay = response.data.amount_to_pay || 0;
          const requiresPayment = response.data.requires_payment || false;
          const snapToken = response.data.snap_token;
          const hasPaymentRequired = requiresPayment || amountToPay > 0;

          console.log('🔍 Upgrade response:', {
            requires_payment: requiresPayment,
            amount_to_pay: amountToPay,
            has_payment_required: hasPaymentRequired,
            has_snap_token: !!snapToken,
            subscription_status: response.data.data?.status,
          });

          // ✅ FIX: If payment is required, redirect to payment page immediately
          // Don't refresh subscription data or show success message yet
          if (hasPaymentRequired) {
            setShowUpgradeOptions(false);
            setSuccess('Silakan lakukan pembayaran untuk mengaktifkan paket baru.');

            // Store subscription data for payment page
            localStorage.setItem('pendingSubscription', JSON.stringify({
              subscription: response.data.data,
              snap_token: snapToken,
              client_key: response.data.client_key,
              amount_to_pay: amountToPay,
            }));

            // Redirect to payment page
            setTimeout(() => {
              navigate('/payment/pending', {
                state: {
                  subscription: response.data.data,
                  snap_token: snapToken,
                  client_key: response.data.client_key,
                  amount_to_pay: amountToPay,
                  is_upgrade: true,
                }
              });
            }, 1500);
            
            setUpgrading(false);
            return;
          }

          // ✅ Only show success and refresh if NO payment required (free upgrade)
          setSuccess('Subscription berhasil diupgrade!');
          setShowUpgradeOptions(false);

          // Clear all cache
          clearAllCache();

          // Invalidate and refetch
          queryClient.invalidateQueries({
            queryKey: queryKeys.subscription.current(currentBusiness?.id),
          });

          // Refresh data
          await Promise.all([
            loadBusinesses(undefined, true),
            checkSubscription(null, true),
            refetchCurrentSubscription(),
          ]);

          setUpgrading(false);
        } else {
          throw new Error(
            response.data.message || 'Gagal mengupgrade subscription'
          );
        }
      } catch (error) {
        console.error('Error upgrading subscription:', error);
        setError(
          error.response?.data?.message ||
            'Terjadi kesalahan saat mengupgrade subscription'
        );
      } finally {
        setUpgrading(false);
      }
    },
    [
      token,
      selectedPlan,
      selectedDuration,
      currentSubscription,
      optimisticUpdateSubscription,
      refetchCurrentSubscription,
      loadBusinesses,
      checkSubscription,
      navigate,
      queryClient,
      currentBusiness?.id,
    ]
  );

  const handleDowngradeClick = () => {
    setShowDowngradeModal(true);
    setError('');
    setSuccess('');
  };

  // ✅ OPTIMIZATION: Handle downgrade dengan optimistic update dan retry
  const handleConfirmDowngrade = useCallback(async () => {
    if (!token) {
      setError('Token tidak ditemukan');
      return;
    }

    setDowngrading(true);
    setError('');
    setSuccess('');

    try {
      // ✅ OPTIMIZATION: Optimistic update - update UI immediately
      const previousSubscription = currentSubscription;
      const trialPlan = plans.find(plan => plan.slug === 'trial-7-days');

      optimisticUpdateSubscription(
        {
          subscription: {
            ...previousSubscription,
            subscription_plan:
              trialPlan || previousSubscription.subscription_plan,
            subscription_plan_id:
              trialPlan?.id || previousSubscription.subscription_plan_id,
            is_trial: true,
            status: 'active',
          },
        },
        async () => {
          // ✅ OPTIMIZATION: API call dengan retry
          const response = await retryWithBackoff(
            () =>
              axios.post(
                `${API_BASE_URL}/v1/subscriptions/downgrade-to-trial`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              ),
            {
              maxRetries: 3,
              baseDelay: 1000,
              shouldRetry: error => {
                if (!error.response) return true;
                const status = error.response?.status;
                return status >= 500 || status === 429;
              },
            }
          );

          if (response.data.success) {
            setSuccess(
              'Berhasil downgrade ke paket trial 7 hari! Memuat ulang...'
            );
            setShowDowngradeModal(false);

            // Force clear any cached data
            localStorage.removeItem('businesses');
            localStorage.removeItem('currentBusiness');

            // ✅ REACT QUERY: Invalidate and refetch
            queryClient.invalidateQueries({
              queryKey: queryKeys.subscription.current(currentBusiness?.id),
            });
            await Promise.all([
              loadBusinesses(),
              checkSubscription(),
              refetchCurrentSubscription(),
            ]);

            // Reload page to show updated subscription
            setTimeout(() => {
              window.location.reload();
            }, 1000);

            return response;
          } else {
            throw new Error(
              response.data.message || 'Gagal downgrade subscription'
            );
          }
        }
      );
    } catch (error) {
      console.error('Error downgrading subscription:', error);
      setError(
        error.response?.data?.message ||
          'Terjadi kesalahan saat downgrade subscription'
      );
    } finally {
      setDowngrading(false);
    }
  }, [
    token,
    currentSubscription,
    plans,
    optimisticUpdateSubscription,
    refetchCurrentSubscription,
    loadBusinesses,
    checkSubscription,
    queryClient,
    currentBusiness?.id,
  ]);

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

  // ✅ F5 Handler: Refresh data without full page reload
  const handleRefresh = useCallback(async () => {
    if (loading || subscriptionLoading || plansLoading) return; // Prevent multiple simultaneous refreshes

    try {
      // ✅ FIX: Refresh all data including subscription, business, and outlets
      console.log('🔄 Refreshing all data...');
      await refreshAllData();

      // Also refresh React Query cache
      await Promise.all([
        refetchCurrentSubscription(),
        refetchPlans(),
        loadBusinesses(),
        checkSubscription(null, true), // Force refresh subscription
        loadOutlets(), // Refresh outlets
      ]);

      setSuccess('Data subscription, business, dan outlet berhasil diperbarui');
      toast.success('Semua data berhasil diperbarui');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error refreshing subscription data:', error);
      setError('Gagal memuat ulang data subscription');
      toast.error('Gagal memuat ulang data');
      setTimeout(() => setError(''), 5000);
    }
  }, [
    loading,
    subscriptionLoading,
    plansLoading,
    refetchCurrentSubscription,
    refetchPlans,
    loadBusinesses,
    checkSubscription,
    loadOutlets,
  ]);

  // ✅ FIX: Force refresh currentBusiness and subscription data when component mounts
  // This ensures we have the latest subscription_info (same as header)
  useEffect(() => {
    if (token && currentBusiness?.id) {
      // Refresh businesses to get latest subscription_info
      loadBusinesses(undefined, true).catch(err => {
        console.warn('Error refreshing businesses in SubscriptionSettings:', err);
      });
      
      // Invalidate and refetch subscription data
      queryClient.invalidateQueries({
        queryKey: queryKeys.subscription.current(currentBusiness.id),
      });
      refetchCurrentSubscription();
    }
  }, [token, currentBusiness?.id, queryClient, refetchCurrentSubscription, loadBusinesses]);

  // ✅ Keyboard shortcuts: F5 and R to refresh without full page reload
  useEffect(() => {
    const handleKeyDown = e => {
      // F5 or R key (with Ctrl/Cmd or without)
      if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault(); // Prevent default browser reload
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRefresh]);

  // ✅ OPTIMIZATION: Show skeleton loader instead of simple spinner
  if (loading) {
    return <SubscriptionSettingsSkeleton />;
  }

  return (
    <div className='min-h-screen bg-gray-50 py-8 px-4'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8 flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              Subscription Settings
            </h1>
            <p className='text-gray-600'>Kelola paket subscription Anda</p>
          </div>
          <div className='flex items-center gap-3'>
            <Button
              onClick={() => navigate('/subscription-history')}
              variant='outline'
              className='flex items-center gap-2'
            >
              <History className='w-4 h-4' />
              Lihat History
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={loading || subscriptionLoading || plansLoading}
              variant='outline'
              className='flex items-center gap-2'
              title='Refresh semua data (F5)'
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loading || subscriptionLoading || plansLoading
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Current Subscription Card */}
        {currentSubscription && (
          <div className='bg-white rounded-lg shadow-md p-6 mb-8'>
            <div className='flex items-start justify-between mb-6'>
              <div>
                <h2 className='text-xl font-bold text-gray-900 mb-2'>
                  Subscription Aktif
                </h2>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-2xl font-bold text-blue-600'>
                      {currentSubscription.subscription_plan?.name}
                    </span>
                    {currentSubscription.is_trial && (
                      <span className='bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded'>
                        TRIAL
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        currentSubscription.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {currentSubscription.status.toUpperCase()}
                    </span>
                  </div>
                  <p className='text-gray-600'>
                    Kode: {currentSubscription.subscription_code}
                  </p>
                </div>
              </div>
              <div className='text-right'>
                <p className='text-sm text-gray-600 mb-1'>Berlaku hingga</p>
                <p className='text-lg font-semibold text-gray-900'>
                  {formatDate(currentSubscription.ends_at)}
                </p>
                <p
                  className={`text-sm mt-1 ${getTimeStatusColor(
                    currentSubscription.daysRemaining ||
                      Math.max(
                        0,
                        (new Date(currentSubscription.ends_at) - new Date()) /
                          (1000 * 60 * 60 * 24)
                      )
                  )}`}
                >
                  {formatRemainingTime(
                    currentSubscription.daysRemaining ||
                      Math.max(
                        0,
                        (new Date(currentSubscription.ends_at) - new Date()) /
                          (1000 * 60 * 60 * 24)
                      )
                  )}
                </p>
              </div>
            </div>

            {/* Current Plan Features */}
            <div className='border-t pt-4'>
              <p className='font-semibold text-sm text-gray-700 mb-3'>
                Fitur Paket Anda:
              </p>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='flex items-center gap-2'>
                  <svg
                    className='w-5 h-5 text-green-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                  <span className='text-sm'>
                    {currentSubscription.subscription_plan?.max_outlets === -1
                      ? 'Unlimited'
                      : currentSubscription.subscription_plan?.max_outlets}{' '}
                    Outlet
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <svg
                    className='w-5 h-5 text-green-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                  <span className='text-sm'>
                    {currentSubscription.subscription_plan?.max_products === -1
                      ? 'Unlimited'
                      : currentSubscription.subscription_plan
                          ?.max_products}{' '}
                    Produk
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <svg
                    className='w-5 h-5 text-green-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                  <span className='text-sm'>
                    {currentSubscription.subscription_plan?.max_employees === -1
                      ? 'Unlimited'
                      : currentSubscription.subscription_plan
                          ?.max_employees}{' '}
                    Karyawan
                  </span>
                </div>
              </div>
            </div>

            {/* Downgrade Button - Only show if not already on trial */}
            {!currentSubscription.is_trial && (
              <div className='mt-6 pt-6 border-t border-gray-200'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900 mb-1'>
                      Ingin kembali ke Trial?
                    </h3>
                    <p className='text-sm text-gray-600'>
                      Downgrade ke paket trial 7 hari gratis dengan fitur
                      terbatas
                    </p>
                  </div>
                  <button
                    onClick={handleDowngradeClick}
                    disabled={downgrading}
                    className='px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
                  >
                    {downgrading ? 'Memproses...' : 'Downgrade ke Trial'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alert Messages */}
        {error && (
          <div className='mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg'>
            {error}
          </div>
        )}

        {success && (
          <div className='mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg'>
            {success}
          </div>
        )}

        {/* Available Plans for Upgrade */}
        <div className='mb-8'>
          <h2 className='text-2xl font-bold text-gray-900 mb-4'>
            Upgrade ke Paket Berbayar
          </h2>
          <p className='text-gray-600 mb-6'>
            Pilih paket yang sesuai dengan kebutuhan bisnis Anda. Semua data
            Anda akan tetap aman.
          </p>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {plans.map(plan => {
              const isCurrentPlan =
                currentSubscription?.subscription_plan_id === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-lg shadow-md overflow-hidden ${
                    plan.slug === 'professional'
                      ? 'border-2 border-green-500 shadow-xl'
                      : 'border border-gray-200'
                  } ${isCurrentPlan ? 'opacity-60' : ''}`}
                >
                  {/* Badge */}
                  {plan.slug === 'professional' && (
                    <div className='absolute top-0 right-0 bg-green-500 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-xs font-semibold'>
                      ⭐ POPULER
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className='absolute top-0 left-0 bg-blue-500 text-white px-3 py-1 rounded-br-lg rounded-tl-lg text-xs font-semibold'>
                      PAKET AKTIF
                    </div>
                  )}

                  {/* Header */}
                  <div className='p-6 border-b'>
                    <h3 className='text-2xl font-bold text-gray-900 mb-2'>
                      {plan.name}
                    </h3>
                    <p className='text-sm text-gray-600 min-h-[40px]'>
                      {plan.description}
                    </p>
                  </div>

                  {/* Content */}
                  <div className='p-6 space-y-4'>
                    {/* Price Selection */}
                    {plan.prices && plan.prices.length > 0 && (
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-gray-700 block'>
                          Pilih Durasi:
                        </label>
                        <select
                          className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
                          value={selectedDuration[plan.id] || ''}
                          onChange={e =>
                            setSelectedDuration({
                              ...selectedDuration,
                              [plan.id]: parseInt(e.target.value),
                            })
                          }
                          disabled={isCurrentPlan}
                        >
                          {plan.prices.map(price => (
                            <option key={price.id} value={price.id}>
                              {getDurationLabel(
                                price.duration_type,
                                price.duration_months
                              )}
                              {price.discount_percentage > 0 &&
                                ` - Hemat ${price.discount_percentage}%`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Price Display */}
                    {plan.prices &&
                      plan.prices.length > 0 &&
                      (() => {
                        const selectedPrice = plan.prices.find(
                          p => p.id === selectedDuration[plan.id]
                        );
                        return (
                          selectedPrice && (
                            <div className='text-center py-4'>
                              {selectedPrice.discount_percentage > 0 && (
                                <p className='text-sm text-gray-500 line-through'>
                                  {formatPrice(selectedPrice.price)}
                                </p>
                              )}
                              <p className='text-3xl font-bold text-gray-900'>
                                {formatPrice(selectedPrice.final_price)}
                              </p>
                              <p className='text-sm text-gray-600'>
                                / {selectedPrice.duration_months} bulan
                              </p>
                              {selectedPrice.discount_percentage > 0 && (
                                <span className='inline-block mt-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded'>
                                  Hemat {selectedPrice.discount_percentage}%
                                </span>
                              )}
                            </div>
                          )
                        );
                      })()}

                    {/* Features */}
                    <div className='space-y-2 pt-4 border-t'>
                      <p className='font-semibold text-sm text-gray-700 mb-2'>
                        Fitur:
                      </p>
                      <div className='space-y-2'>
                        <div className='flex items-start gap-2 text-sm'>
                          <svg
                            className='w-4 h-4 text-green-500 mt-0.5 flex-shrink-0'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M5 13l4 4L19 7'
                            />
                          </svg>
                          <span>
                            {plan.max_outlets === -1
                              ? 'Unlimited'
                              : plan.max_outlets}{' '}
                            Outlet
                          </span>
                        </div>
                        <div className='flex items-start gap-2 text-sm'>
                          <svg
                            className='w-4 h-4 text-green-500 mt-0.5 flex-shrink-0'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M5 13l4 4L19 7'
                            />
                          </svg>
                          <span>
                            {plan.max_products === -1
                              ? 'Unlimited'
                              : plan.max_products}{' '}
                            Produk
                          </span>
                        </div>
                        <div className='flex items-start gap-2 text-sm'>
                          <svg
                            className='w-4 h-4 text-green-500 mt-0.5 flex-shrink-0'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M5 13l4 4L19 7'
                            />
                          </svg>
                          <span>
                            {plan.max_employees === -1
                              ? 'Unlimited'
                              : plan.max_employees}{' '}
                            Karyawan
                          </span>
                        </div>

                        {plan.features &&
                          Array.isArray(plan.features) &&
                          plan.features.map((feature, idx) => {
                            // Handle both string and object format {feature: "..."}
                            const featureText =
                              typeof feature === 'string'
                                ? feature
                                : feature?.feature ||
                                  feature?.name ||
                                  JSON.stringify(feature);

                            return (
                              <div
                                key={idx}
                                className='flex items-start gap-2 text-sm'
                              >
                                <svg
                                  className='w-4 h-4 text-green-500 mt-0.5 flex-shrink-0'
                                  fill='none'
                                  stroke='currentColor'
                                  viewBox='0 0 24 24'
                                >
                                  <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M5 13l4 4L19 7'
                                  />
                                </svg>
                                <span>{featureText}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className='p-6 border-t'>
                    <button
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                        isCurrentPlan
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } ${
                        (upgrading && selectedPlan === plan.id) || (loadingUpgradeOptions && selectedPlan === plan.id)
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                      onClick={() => handleUpgradeClick(plan)}
                      disabled={upgrading || loadingUpgradeOptions || isCurrentPlan}
                    >
                      {(upgrading && selectedPlan === plan.id) || (loadingUpgradeOptions && selectedPlan === plan.id) ? (
                        <span className='flex items-center justify-center'>
                          <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2'></div>
                          {loadingUpgradeOptions && selectedPlan === plan.id ? 'Memuat opsi upgrade...' : 'Memproses...'}
                        </span>
                      ) : isCurrentPlan ? (
                        'Paket Aktif'
                      ) : (
                        'Upgrade ke Paket Ini'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-6'>
          <h3 className='font-semibold text-blue-900 mb-2'>
            ℹ️ Informasi Penting
          </h3>
          <ul className='text-sm text-blue-800 space-y-2'>
            <li>
              • Semua data bisnis, produk, dan transaksi Anda akan tetap aman
              saat upgrade
            </li>
            <li>
              • Upgrade akan langsung aktif setelah pembayaran dikonfirmasi
            </li>
            <li>• Periode subscription baru dimulai dari tanggal upgrade</li>
            <li>• Hubungi support jika ada pertanyaan</li>
          </ul>
        </div>

        {/* Upgrade Options Modal */}
        <UpgradeOptionsModal
          isOpen={showUpgradeOptions}
          onClose={() => {
            setShowUpgradeOptions(false);
            setUpgradeOptions(null);
          }}
          onSelectOption={handleSelectUpgradeOption}
          upgradeOptions={upgradeOptions}
          planName={selectedPlan?.name}
          loading={upgrading}
          loadingOptions={loadingUpgradeOptions}
        />

        {/* Downgrade Confirmation Modal */}
        <DowngradeConfirmationModal
          isOpen={showDowngradeModal}
          onClose={() => setShowDowngradeModal(false)}
          onConfirm={handleConfirmDowngrade}
          currentPlan={currentSubscription?.subscription_plan?.name}
          loading={downgrading}
        />
      </div>
    </div>
  );
};

export default SubscriptionSettings;
