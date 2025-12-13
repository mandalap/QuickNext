import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { businessService } from '../services/business.service';
import apiClient from '../utils/apiClient';
import { clearAllCache } from '../utils/refreshData';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, checkSubscription, loadBusinesses, hasActiveSubscription } =
    useAuth();
  const subscription = location.state?.subscription;
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // ✅ FIX: Verify and activate subscription immediately
    const verifyAndRedirect = async () => {
      if (!subscription?.subscription_code || !token) {
        setError('Subscription data tidak ditemukan');
        setVerifying(false);
        return;
      }

      try {
        console.log('🔄 Starting subscription verification...', {
          subscription_code: subscription.subscription_code,
          has_token: !!token,
          subscription_status: subscription.status,
        });

        // ✅ FIX: If subscription is already active, skip verification and redirect immediately
        if (subscription.status === 'active') {
          console.log(
            '✅ Subscription already active, skipping verification and redirecting...'
          );
          setVerifying(false);

          // Refresh subscription status in AuthContext to update hasActiveSubscription
          console.log('🔄 Refreshing subscription status in AuthContext...');
          await checkSubscription(null, true);

          // Wait a bit to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 500));

          // Set flag to skip subscription check in ProtectedRoute
          localStorage.setItem('skipSubscriptionCheck', 'true');
          setTimeout(() => {
            localStorage.removeItem('skipSubscriptionCheck');
          }, 15000); // Increase to 15 seconds to give more time

          // Check businesses and redirect
          try {
            console.log('🔍 Checking user businesses...');
            const businessResult = await businessService.getAll();
            console.log('📋 Business result:', businessResult);

            if (
              businessResult.success &&
              businessResult.data &&
              businessResult.data.length > 0
            ) {
              console.log(
                '✅ User has businesses, loading and redirecting to dashboard...'
              );
              await loadBusinesses();

              // Small delay to ensure businesses are loaded
              await new Promise(resolve => setTimeout(resolve, 300));

              console.log('🔄 Redirecting to dashboard...');
              navigate('/', { replace: true });
            } else {
              console.log(
                '⚠️ User has no businesses, redirecting to business setup...'
              );
              navigate('/business-setup', {
                replace: true,
                state: { paymentSuccess: true, subscription },
              });
            }
          } catch (businessError) {
            console.error('❌ Business check failed:', businessError);
            navigate('/business-setup', {
              replace: true,
              state: { paymentSuccess: true, subscription },
            });
          }
          return;
        }

        // ✅ FIX: Verify subscription payment status using correct endpoint
        const verifyResponse = await apiClient.post(
          '/v1/subscriptions/verify-activate',
          {}
        );

        console.log('📋 Verify response:', verifyResponse.data);

        if (
          verifyResponse.data.success &&
          (verifyResponse.data.activated || verifyResponse.data.already_active)
        ) {
          console.log('✅ Subscription verified and activated');

          // ✅ FIX: Refresh subscription status with forceRefresh=true to ensure state is updated
          console.log('🔄 Refreshing subscription status...');
          const subscriptionActive = await checkSubscription(null, true); // forceRefresh=true
          console.log(
            '📋 Subscription status after refresh:',
            subscriptionActive
          );

          // ✅ FIX: Poll subscription status to ensure it's updated before redirect
          // This prevents ProtectedRoute from redirecting back to subscription-plans
          let retries = 0;
          let subscriptionConfirmed = subscriptionActive;
          while (!subscriptionConfirmed && retries < 5) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const currentStatus = await checkSubscription(null, true);
            subscriptionConfirmed = currentStatus;
            console.log(
              `🔄 Subscription check retry ${retries + 1}:`,
              currentStatus
            );
            retries++;
          }

          if (!subscriptionConfirmed) {
            console.warn(
              '⚠️ Subscription status not confirmed after retries, proceeding anyway...'
            );
          }

          // ✅ FIX: Set flag in localStorage to skip subscription check temporarily
          // This prevents ProtectedRoute from redirecting back to subscription-plans
          localStorage.setItem('skipSubscriptionCheck', 'true');
          // Clear flag after 10 seconds (enough time for redirect and initial load)
          setTimeout(() => {
            localStorage.removeItem('skipSubscriptionCheck');
          }, 10000);

          // ✅ FIX: Check if this is an upgrade (from location.state)
          const isUpgrade = location.state?.is_upgrade || false;

          // Check if user has businesses
          try {
            console.log('🔍 Checking user businesses...');
            const businessResult = await businessService.getAll();
            console.log('📋 Business result:', businessResult);

            if (
              businessResult.success &&
              businessResult.data &&
              businessResult.data.length > 0
            ) {
              console.log('✅ User has businesses, loading...');

              // ✅ FIX: Clear all cache and refresh data after upgrade
              if (isUpgrade) {
                console.log(
                  '🔄 Upgrade detected, clearing cache and refreshing data...'
                );

                // ✅ FIX: Clear all cache first
                clearAllCache();

                // ✅ FIX: Force reload businesses with forceRefresh=true to get updated subscription_info
                console.log(
                  '🔄 Loading businesses with fresh data (forceRefresh=true)...'
                );
                await loadBusinesses(undefined, true);

                // ✅ FIX: Verify currentBusiness has updated subscription_info
                // Get fresh business data directly from API to ensure we have latest subscription_info
                try {
                  const freshBusinessResult = await businessService.getAll(
                    false
                  );
                  if (
                    freshBusinessResult.success &&
                    freshBusinessResult.data &&
                    freshBusinessResult.data.length > 0
                  ) {
                    const currentBusinessId =
                      localStorage.getItem('currentBusinessId');
                    const freshBusiness =
                      freshBusinessResult.data.find(
                        b => b.id === parseInt(currentBusinessId)
                      ) || freshBusinessResult.data[0];

                    console.log('🔍 Fresh business data:', freshBusiness);
                    console.log(
                      '🔍 Fresh subscription_info:',
                      freshBusiness.subscription_info
                    );

                    // ✅ FIX: Update currentBusiness in localStorage with fresh data
                    if (freshBusiness.subscription_info) {
                      localStorage.setItem(
                        'currentBusiness',
                        JSON.stringify(freshBusiness)
                      );
                      console.log(
                        '✅ Updated currentBusiness in localStorage with fresh subscription_info'
                      );
                    }
                  }
                } catch (e) {
                  console.warn('⚠️ Error getting fresh business data:', e);
                }

                // ✅ FIX: Wait longer to ensure currentBusiness state is updated in AuthContext
                // This ensures header gets the updated subscription_info
                console.log('🔄 Waiting for state update...');
                await new Promise(resolve => setTimeout(resolve, 1500));

                // ✅ FIX: Force reload page to ensure all components get updated data
                console.log(
                  '🔄 Upgrade successful, forcing page reload to refresh all data...'
                );

                // Clear cache one more time before reload
                clearAllCache();

                // Force full page reload with cache bypass
                window.location.href = '/subscription-settings?_=' + Date.now();
                return; // Exit early, page will reload
              }

              // User has business
              await loadBusinesses();

              // ✅ FIX: For new subscription (not upgrade), redirect to dashboard
              console.log('🔄 Redirecting to dashboard...');
              navigate('/', { replace: true });
            } else {
              console.log(
                '⚠️ User has no businesses, redirecting to business setup...'
              );
              // User doesn't have business, redirect to business setup
              navigate('/business-setup', {
                replace: true,
                state: {
                  paymentSuccess: true,
                  subscription: verifyResponse.data.data,
                },
              });
            }
          } catch (businessError) {
            // If business check fails (e.g., no business ID yet), redirect to business setup
            console.error(
              '❌ Business check failed, redirecting to business setup:',
              businessError
            );
            navigate('/business-setup', {
              replace: true,
              state: {
                paymentSuccess: true,
                subscription: verifyResponse.data.data,
              },
            });
          }
        } else {
          console.error('❌ Verification failed:', verifyResponse.data);
          // ✅ FIX: Even if verification fails, try to redirect if subscription exists
          const errorMsg =
            verifyResponse.data.message || 'Gagal memverifikasi pembayaran';

          // If message says "already active" or similar, still try to redirect
          if (errorMsg.includes('already') || errorMsg.includes('active')) {
            console.log(
              '⚠️ Subscription already active, attempting redirect...'
            );
            try {
              const businessResult = await businessService.getAll();
              if (
                businessResult.success &&
                businessResult.data &&
                businessResult.data.length > 0
              ) {
                await loadBusinesses();
                navigate('/', { replace: true });
              } else {
                navigate('/business-setup', {
                  replace: true,
                  state: { paymentSuccess: true },
                });
              }
            } catch (redirectError) {
              console.error('Redirect failed:', redirectError);
              setError(errorMsg);
              setVerifying(false);
            }
          } else {
            setError(errorMsg);
            setVerifying(false);
          }
        }
      } catch (error) {
        console.error('❌ Error verifying subscription:', error);
        console.error('Error details:', {
          status: error.response?.status,
          message: error.response?.data?.message,
          data: error.response?.data,
        });

        // ✅ FIX: If error is 404 with "Business not found", check if subscription is already active
        if (
          error.response?.status === 404 &&
          error.response?.data?.message?.includes('Business not found')
        ) {
          console.log(
            '⚠️ Business not found error, checking if subscription is already active...'
          );
          try {
            // Try to check current subscription
            const currentSubResponse = await apiClient.get(
              '/v1/subscriptions/current'
            );
            if (
              currentSubResponse.data.success &&
              currentSubResponse.data.data
            ) {
              const currentSub = currentSubResponse.data.data;
              console.log('✅ Found active subscription:', {
                code: currentSub.subscription_code,
                status: currentSub.status,
              });

              // If subscription is active, redirect immediately
              if (currentSub.status === 'active') {
                console.log(
                  '✅ Subscription is active, refreshing and redirecting...'
                );
                setVerifying(false);

                // Refresh subscription status
                await checkSubscription(null, true);
                await new Promise(resolve => setTimeout(resolve, 500));

                // Set flag
                localStorage.setItem('skipSubscriptionCheck', 'true');
                setTimeout(() => {
                  localStorage.removeItem('skipSubscriptionCheck');
                }, 15000);

                // Check businesses and redirect
                try {
                  const businessResult = await businessService.getAll();
                  if (
                    businessResult.success &&
                    businessResult.data &&
                    businessResult.data.length > 0
                  ) {
                    await loadBusinesses();
                    await new Promise(resolve => setTimeout(resolve, 300));
                    navigate('/', { replace: true });
                  } else {
                    console.log(
                      '⚠️ No businesses found, redirecting to business-setup...'
                    );
                    navigate('/business-setup', {
                      replace: true,
                      state: { paymentSuccess: true, subscription: currentSub },
                    });
                  }
                } catch (businessError) {
                  console.error('Business check failed:', businessError);
                  navigate('/business-setup', {
                    replace: true,
                    state: { paymentSuccess: true, subscription: currentSub },
                  });
                }
                return;
              }
            }
          } catch (checkError) {
            console.error('Failed to check current subscription:', checkError);
          }
        }

        // ✅ FIX: If error is 404 (no pending subscription), check if already active
        if (error.response?.status === 404) {
          console.log(
            '⚠️ No pending subscription found, checking if already active...'
          );
          try {
            // Try to check current subscription
            const currentSubResponse = await apiClient.get(
              '/v1/subscriptions/current'
            );
            if (
              currentSubResponse.data.success &&
              currentSubResponse.data.data
            ) {
              const currentSub = currentSubResponse.data.data;
              console.log('✅ Found subscription:', {
                code: currentSub.subscription_code,
                status: currentSub.status,
              });

              // If subscription is active, redirect immediately
              if (currentSub.status === 'active') {
                console.log(
                  '✅ Subscription is active, refreshing and redirecting...'
                );
                setVerifying(false);

                // Refresh subscription status
                await checkSubscription(null, true);
                await new Promise(resolve => setTimeout(resolve, 500));

                // Set flag
                localStorage.setItem('skipSubscriptionCheck', 'true');
                setTimeout(() => {
                  localStorage.removeItem('skipSubscriptionCheck');
                }, 15000);

                // Check businesses and redirect
                const businessResult = await businessService.getAll();
                if (
                  businessResult.success &&
                  businessResult.data &&
                  businessResult.data.length > 0
                ) {
                  await loadBusinesses();
                  await new Promise(resolve => setTimeout(resolve, 300));
                  navigate('/', { replace: true });
                } else {
                  navigate('/business-setup', {
                    replace: true,
                    state: { paymentSuccess: true, subscription: currentSub },
                  });
                }
                return;
              }
            }
          } catch (checkError) {
            console.error('Failed to check current subscription:', checkError);
          }
        }

        setError(
          error.response?.data?.message || 'Gagal memverifikasi pembayaran'
        );
        setVerifying(false);
      }
    };

    verifyAndRedirect();
  }, [subscription, token, navigate, checkSubscription, loadBusinesses]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-12 px-4'>
      <div className='max-w-md w-full bg-white rounded-lg shadow-xl p-8'>
        <div className='text-center'>
          <div className='mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4'>
            <svg
              className='h-8 w-8 text-green-600'
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
          </div>

          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Pembayaran Berhasil!
          </h2>
          <p className='text-gray-600 mb-6'>
            Subscription Anda telah aktif. Terima kasih atas pembayaran Anda.
          </p>

          {subscription && (
            <div className='bg-gray-50 rounded-lg p-4 mb-6 text-left'>
              <h3 className='font-semibold text-gray-900 mb-2'>
                Detail Subscription
              </h3>
              <div className='text-sm text-gray-600 space-y-1'>
                <p>
                  <span className='font-medium'>Paket:</span>{' '}
                  {subscription.subscription_plan?.name}
                </p>
                <p>
                  <span className='font-medium'>Kode:</span>{' '}
                  {subscription.subscription_code}
                </p>
                <p>
                  <span className='font-medium'>Status:</span>{' '}
                  <span className='text-green-600 font-medium'>Active</span>
                </p>
              </div>
            </div>
          )}

          {verifying ? (
            <div className='space-y-3'>
              <div className='flex items-center justify-center py-4'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-600'></div>
                <span className='ml-3 text-gray-600'>
                  Memverifikasi pembayaran...
                </span>
              </div>
            </div>
          ) : error ? (
            <div className='space-y-3'>
              {/* ✅ FIX: Hide "Business not found" error if subscription is active */}
              {error.includes('Business not found') &&
              subscription?.status === 'active' ? (
                <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4'>
                  <p className='text-yellow-800 text-sm'>
                    Subscription sudah aktif. Silakan buat bisnis terlebih
                    dahulu untuk melanjutkan.
                  </p>
                </div>
              ) : (
                <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-4'>
                  <p className='text-red-800 text-sm'>{error}</p>
                </div>
              )}
              <button
                onClick={async () => {
                  // ✅ FIX: Check if subscription is active, redirect to business-setup if no business
                  try {
                    const currentSubResponse = await apiClient.get(
                      '/v1/subscriptions/current'
                    );
                    if (
                      currentSubResponse.data.success &&
                      currentSubResponse.data.data
                    ) {
                      const currentSub = currentSubResponse.data.data;
                      if (currentSub.status === 'active') {
                        // Check businesses
                        const businessResult = await businessService.getAll();
                        if (
                          businessResult.success &&
                          businessResult.data &&
                          businessResult.data.length > 0
                        ) {
                          await loadBusinesses();
                          navigate('/', { replace: true });
                        } else {
                          navigate('/business-setup', {
                            replace: true,
                            state: {
                              paymentSuccess: true,
                              subscription: currentSub,
                            },
                          });
                        }
                        return;
                      }
                    }
                  } catch (checkError) {
                    console.error('Failed to check subscription:', checkError);
                  }
                  // Fallback: redirect to subscription-plans
                  navigate('/subscription-plans');
                }}
                className='w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium'
              >
                {error.includes('Business not found') &&
                subscription?.status === 'active'
                  ? 'Buat Bisnis Sekarang'
                  : 'Kembali ke Halaman Subscription'}
              </button>
            </div>
          ) : (
            <div className='space-y-3'>
              <button
                onClick={() => {
                  // Check if user has business
                  businessService.getAll().then(result => {
                    if (
                      result.success &&
                      result.data &&
                      result.data.length > 0
                    ) {
                      navigate('/', { replace: true });
                    } else {
                      navigate('/business-setup', {
                        state: { paymentSuccess: true },
                      });
                    }
                  });
                }}
                className='w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium'
              >
                Lanjutkan ke Dashboard
              </button>
            </div>
          )}

          {!verifying && !error && (
            <p className='text-xs text-gray-500 mt-6'>
              Anda akan diarahkan otomatis...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
