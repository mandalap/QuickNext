import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { businessService } from '../../services/business.service';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState({});
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [hasActiveTrial, setHasActiveTrial] = useState(false);
  const [trialEnded, setTrialEnded] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState(null);
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);
  const [profileComplete, setProfileComplete] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const navigate = useNavigate();
  const { 
    token, 
    checkSubscription, 
    user, 
    loadBusinesses,
    hasActiveSubscription: authHasActiveSubscription,
    subscriptionLoading: authSubscriptionLoading,
    initialLoadComplete,
    profileComplete: authProfileComplete,
    whatsappVerified: authWhatsappVerified,
  } = useAuth();
  
  // ✅ FIX: Use ref to prevent duplicate calls in React Strict Mode
  const hasInitialized = useRef(false);
  // ✅ FIX: Use ref to prevent infinite redirect loop
  const hasRedirected = useRef(false);
  // ✅ ADD: Prevent duplicate API calls
  const profileCheckDone = useRef(false);
  const trialCheckDone = useRef(false);
  const subscriptionCheckDone = useRef(false);

  // Handle redirect to dashboard - check for business and payment status first
  const handleGoToDashboard = async () => {
    try {
      // ✅ FIX: Use pendingSubscription from state if available (faster)
      if (pendingSubscription && pendingSubscription.subscription_code) {
        console.log('🔄 Redirecting to payment pending with existing subscription data');
        setRedirectingToPayment(true);
        navigate('/payment/pending', {
          state: { 
            subscription: pendingSubscription, 
            redirectAfterPayment: true 
          },
        });
        return;
      }

      // First, check subscription status again to ensure payment is complete
      // ✅ FIX: Suppress error notifications for 404 (normal if no subscription)
      let subResponse;
      try {
        subResponse = await apiClient.get('/v1/subscriptions/current');
      } catch (error) {
        // ✅ FIX: Handle 404 gracefully (user belum punya subscription - ini normal)
        if (error.response?.status === 404) {
          console.log('ℹ️ No subscription found (404) - user needs to subscribe');
          // Continue to check businesses
        } else {
          throw error; // Re-throw other errors
        }
        subResponse = null;
      }

      if (subResponse?.data?.success && subResponse.data.data) {
        const isPending =
          subResponse.data.is_pending_payment ||
          subResponse.data.data.status === 'pending_payment';

        if (isPending) {
          // If payment is pending, redirect to payment page
          const subscription = subResponse.data.data;
          
          // Try to get snap token if available
          if (subscription.subscription_code) {
            // Redirect to payment pending page or open Midtrans payment
            console.log('🔄 Redirecting to payment pending');
            setRedirectingToPayment(true);
            navigate('/payment/pending', {
              state: { subscription, redirectAfterPayment: true },
            });
          } else {
            toast.error(
              'Kode subscription tidak ditemukan. Silakan hubungi administrator untuk menyelesaikan pembayaran.'
            );
          }
          return;
        }
      }

      // Check if user has businesses
      const businessResult = await businessService.getAll();

      if (
        businessResult.success &&
        businessResult.data &&
        businessResult.data.length > 0
      ) {
        // User has business(es), reload businesses in context and go to dashboard
        await loadBusinesses();
        // Refresh subscription status after loading businesses
        await checkSubscription();
        navigate('/', { replace: true });
      } else {
        // User doesn't have business, go to business setup
        navigate('/business-setup', { replace: true });
      }
    } catch (error) {
      console.error('Error checking businesses:', error);
      // On error, try to go to business setup (safer default)
      navigate('/business-setup', { replace: true });
    }
  };

  // Check profile completion
  const checkProfileComplete = async () => {
    // ✅ Prevent duplicate calls
    if (profileCheckDone.current) {
      console.log('⏭️ Profile already checked, skipping...');
      return;
    }
    profileCheckDone.current = true;

    try {
      // ✅ FIX: Increase timeout untuk profile check (bisa lambat)
      const response = await apiClient.get('/v1/user/profile/check', {
        timeout: 10000, // 10 seconds
      });

      if (response.data) {
        const isComplete = response.data.profile_complete || false;
        const isWhatsappVerified = response.data.whatsapp_verified || false;
        
        // Profile is complete only if both profile_complete AND whatsapp_verified are true
        setProfileComplete(isComplete && isWhatsappVerified);
        
        // If not complete, redirect immediately
        if (!isComplete || !isWhatsappVerified) {
          console.log('⚠️ Profile not complete or WhatsApp not verified, redirecting...');
          navigate('/complete-profile', { replace: true });
        }
      }
    } catch (err) {
      // ✅ Handle 429 error gracefully
      if (err.response?.status === 429) {
        console.warn('⚠️ Rate limit hit on profile check, assuming complete');
        setProfileComplete(true); // Assume complete to not block
        return;
      }
      
      // ✅ FIX: Ignore CanceledError (duplicate request cancelled) - normal in React Strict Mode
      if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
        console.log('Request cancelled, ignoring...');
        profileCheckDone.current = false; // Allow retry
        return;
      }
      console.error('Error checking profile:', err);
      // Default to false if check fails - will redirect to complete-profile
      setProfileComplete(false);
    } finally {
      setCheckingProfile(false);
    }
  };

  useEffect(() => {
    // ✅ Jangan fetch jika tidak ada token - user belum login
    if (!token) {
      console.warn('No token found, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    // ✅ FIX: Wait for initial load to complete before checking subscription
    // This prevents premature redirects during reload
    if (!initialLoadComplete || authSubscriptionLoading) {
      console.log('⏳ SubscriptionPlans: Waiting for initial load to complete...', {
        initialLoadComplete,
        authSubscriptionLoading,
        authHasActiveSubscription,
      });
      return;
    }

    // ✅ FIX: Check subscription status from AuthContext AND cache first (faster than API call)
    // If user already has active subscription, redirect immediately
    const cachedSubscription = localStorage.getItem('hasActiveSubscription');
    const hasActiveSub = authHasActiveSubscription || cachedSubscription === 'true';
    
    if (hasActiveSub && !hasRedirected.current) {
      console.log('✅ SubscriptionPlans: User has active subscription (from AuthContext or cache), redirecting...', {
        authHasActiveSubscription,
        cachedSubscription,
      });
      hasRedirected.current = true;
      handleGoToDashboard();
      return;
    }

    // ✅ FIX: Check profile completion from AuthContext first
    // If profile is not complete, redirect immediately
    if (authProfileComplete === false || authWhatsappVerified === false) {
      console.log('⚠️ SubscriptionPlans: Profile not complete from AuthContext, redirecting...', {
        authProfileComplete,
        authWhatsappVerified,
      });
      navigate('/complete-profile', { replace: true });
      return;
    }

    // ✅ Prevent duplicate initialization
    if (hasInitialized.current) {
      console.log('⏭️ Already initialized, skipping...');
      return;
    }
    hasInitialized.current = true;

    // ✅ FIX: Reset redirect flag when component mounts
    hasRedirected.current = false;

    // ✅ Add delay between API calls to prevent rate limiting
    const initializeData = async () => {
      await checkProfileComplete();
      
      // Wait 300ms before next call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await fetchPlans();
      
      // Wait 300ms before next call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await checkTrialStatus();
      
      // Wait 300ms before next call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await checkCurrentSubscription();
    };

    initializeData();
  }, [token, navigate, initialLoadComplete, authSubscriptionLoading, authHasActiveSubscription, authProfileComplete, authWhatsappVerified]);

  // ✅ FIX: Redirect to complete-profile if profile is not complete
  useEffect(() => {
    // ✅ FIX: Prevent redirect loop - only redirect once
    if (!checkingProfile && !profileComplete && !hasRedirected.current) {
      console.log('⚠️ Profile not complete, redirecting to complete-profile');
      hasRedirected.current = true; // Mark as redirected to prevent loop
      navigate('/complete-profile', { replace: true });
    }
  }, [checkingProfile, profileComplete, navigate]);

  // Auto-redirect if user has active subscription or pending payment
  useEffect(() => {
    // ✅ FIX: Prevent infinite redirect loop
    if (hasRedirected.current) {
      return;
    }

    const autoRedirect = async () => {
      // ✅ Jika ada pending payment, langsung arahkan ke halaman payment dengan layar loading
      if (isPendingPayment) {
        console.log(
          '⚠️ SubscriptionPlans: Pending payment detected, redirecting to payment pending'
        );
        hasRedirected.current = true;
        setRedirectingToPayment(true);
        try {
          await handleGoToDashboard();
        } catch (e) {
          console.error('Error auto redirecting to payment pending:', e);
          setRedirectingToPayment(false);
        }
        return;
      }

      // Only redirect if subscription is active (not pending payment)
      if (hasActiveSubscription && !isPendingPayment && !loading) {
        console.log(
          '✅ SubscriptionPlans: User has active subscription, checking businesses...'
        );

        // ✅ FIX: Mark as redirected immediately to prevent loop
        hasRedirected.current = true;

        try {
          // Check if user has businesses
          const businessResult = await businessService.getAll();

          if (
            businessResult.success &&
            businessResult.data &&
            businessResult.data.length > 0
          ) {
            // User has active subscription and business, redirect to dashboard
            console.log(
              '✅ SubscriptionPlans: Has subscription and business, redirecting to dashboard'
            );
            await loadBusinesses();
            navigate('/', { replace: true });
          } else {
            // User has subscription but no business, redirect to business setup
            // ✅ FIX: Only redirect to business-setup if subscription is active (not pending)
            console.log(
              '✅ SubscriptionPlans: Has subscription but no business, redirecting to business-setup'
            );
            navigate('/business-setup', { replace: true });
          }
        } catch (error) {
          console.error(
            '❌ SubscriptionPlans: Error checking businesses:',
            error
          );
          // ✅ FIX: Reset redirect flag on error so user can retry
          hasRedirected.current = false;
          // Don't redirect on error, let user stay on subscription page
        }
      }
    };

    // Only auto-redirect after loading is complete
    if (!loading) {
      autoRedirect();
    }
  }, [hasActiveSubscription, isPendingPayment, loading, navigate]);

  // ✅ NEW: Fullscreen loading ketika sedang mengarahkan ke halaman pembayaran
  if (isPendingPayment && (redirectingToPayment || pendingSubscription)) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4'>
        <div className='flex flex-col items-center justify-center space-y-4'>
          <div className='w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center border border-blue-100'>
            <div className='w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' />
          </div>
          <div className='text-center space-y-1'>
            <p className='text-lg font-semibold text-gray-900'>
              Mengarahkan ke halaman pembayaran...
            </p>
            <p className='text-sm text-gray-600'>
              Mohon tunggu sebentar, kami sedang mengecek status pembayaran
              subscription Anda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const checkCurrentSubscription = async () => {
    // ✅ Prevent duplicate calls
    if (subscriptionCheckDone.current) {
      console.log('⏭️ Subscription already checked, skipping...');
      return;
    }
    subscriptionCheckDone.current = true;

    try {
      const response = await apiClient.get('/v1/subscriptions/current', {
        // ✅ FIX: Suppress error notifications for 404 (normal if no subscription)
        validateStatus: (status) => status < 500, // Don't throw for 4xx errors
      });

      // ✅ FIX: Handle 404 gracefully (user belum punya subscription - ini normal)
      if (response.status === 404) {
        console.log('ℹ️ No subscription found (404) - user needs to subscribe');
        setHasActiveSubscription(false);
        setIsPendingPayment(false);
        setLoading(false);
        return;
      }

      if (response.data.success && response.data.data) {
        const subscription = response.data.data;
        const isPending =
          response.data.is_pending_payment ||
          subscription.status === 'pending_payment';
        const isActive =
          response.data.has_subscription || subscription.status === 'active';
        const isTrial = response.data.is_trial || false;
        const trialEnded = response.data.trial_ended || false;

        // ✅ FIX: If subscription is pending, try to verify payment from Midtrans
        // But only once to prevent infinite loop
        if (isPending && subscription.subscription_code && !hasRedirected.current) {
          console.log('⚠️ Subscription pending, attempting to verify payment...');
          try {
            const verifyResponse = await apiClient.post(
              '/v1/subscriptions/verify-activate',
              {}
            );

            if (verifyResponse.data.success && (verifyResponse.data.activated || verifyResponse.data.already_active)) {
              console.log('✅ Payment verified, subscription activated');
              // Refresh subscription status
              await checkSubscription();
              // ✅ FIX: Don't recursively call checkCurrentSubscription - let useEffect handle it
              // Re-check current subscription will be triggered by state update
            }
          } catch (verifyError) {
            console.error('Failed to verify payment:', verifyError);
            // Continue with pending status if verification fails
          }
        }

        // Subscription is active only if: status is active, not pending, and trial hasn't ended
        const subscriptionActive =
          isActive && !isPending && !(isTrial && trialEnded);

        console.log('🔍 SubscriptionPlans - checkCurrentSubscription:', {
          isActive,
          isPending,
          isTrial,
          trialEnded,
          subscriptionActive,
          status: subscription.status,
        });

        setHasActiveSubscription(subscriptionActive);
        setIsPendingPayment(isPending);

        if (isPending) {
          setPendingSubscription(subscription);
        }
      } else {
        // No subscription found
        console.log('🔍 SubscriptionPlans - No subscription found');
        setHasActiveSubscription(false);
        setIsPendingPayment(false);
        setPendingSubscription(null);
      }
    } catch (error) {
      // ✅ Handle 429 error
      if (error.response?.status === 429) {
        console.warn('⚠️ Rate limit hit on subscription check');
        // Use cached value from AuthContext
        setHasActiveSubscription(authHasActiveSubscription);
        return;
      }
      
      // No active subscription, which is fine for this page
      setHasActiveSubscription(false);
      setIsPendingPayment(false);
      setPendingSubscription(null);
    }
  };

  const checkTrialStatus = async () => {
    // ✅ Prevent duplicate calls
    if (trialCheckDone.current) {
      console.log('⏭️ Trial already checked, skipping...');
      return;
    }
    trialCheckDone.current = true;

    try {
      // ✅ FIX: Increase timeout untuk trial status check (bisa lambat)
      const response = await apiClient.get('/v1/subscriptions/trial-status', {
        timeout: 30000, // 30 seconds for complex queries
      });

      console.log('🔍 Trial status check:', response.data);

      setHasUsedTrial(response.data.has_used_trial || false);
      setHasActiveTrial(response.data.has_active_trial || false);
      setTrialEnded(response.data.trial_ended || false);
    } catch (error) {
      // ✅ Handle 429 error
      if (error.response?.status === 429) {
        console.warn('⚠️ Rate limit hit on trial check');
        return;
      }
      
      // ✅ FIX: Ignore CanceledError (duplicate request cancelled) - normal in React Strict Mode
      if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
        console.log('Trial check cancelled');
        trialCheckDone.current = false;
        return;
      }
      console.error('Failed to check trial status:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      // ✅ FIX: Increase timeout untuk plans fetch (bisa lambat)
      const response = await apiClient.get('/subscriptions/plans', {
        timeout: 30000, // 30 seconds for complex queries
      });
      console.log('Plans response:', response.data);

      if (response.data.success) {
        setPlans(response.data.data);
        // Set default duration for each plan (first price)
        const defaultDurations = {};
        response.data.data.forEach(plan => {
          if (plan.prices && plan.prices.length > 0) {
            defaultDurations[plan.id] = plan.prices[0].id;
          }
        });
        setSelectedDuration(defaultDurations);
      }
    } catch (err) {
      // ✅ FIX: Ignore CanceledError (duplicate request cancelled) - normal in React Strict Mode
      if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
        console.log('Plans fetch cancelled (duplicate), ignoring...');
        return;
      }
      console.error('Error fetching plans:', err);
      setError(
        'Gagal memuat paket subscription: ' +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async plan => {
    setSubscribing(true);
    setError('');
    setSelectedPlan(plan.id);

    try {
      // ✅ FIX: Validate priceId before submitting
      const priceId = selectedDuration[plan.id];
      
      console.log('🔍 Subscribe attempt:', {
        planId: plan.id,
        planSlug: plan.slug,
        priceId,
        selectedDuration,
        planPrices: plan.prices,
      });
      
      if (!priceId) {
        // If no price selected, try to use first available price
        if (plan.prices && plan.prices.length > 0) {
          const firstPriceId = plan.prices[0].id;
          setSelectedDuration({
            ...selectedDuration,
            [plan.id]: firstPriceId,
          });
          // Use first price
          const response = await apiClient.post(
            '/v1/subscriptions/subscribe',
            {
              subscription_plan_id: plan.id,
              subscription_plan_price_id: firstPriceId,
            }
          );
          
          if (response.data.success) {
            // ✅ Refresh subscription status in AuthContext (non-blocking)
            checkSubscription().catch(err => {
              console.warn(
                'Subscription check failed after subscribe, but subscription was created:',
                err
              );
            });

            // ✅ FIX: Check if it's a trial (free) or paid subscription
            const isTrial = plan.slug === 'trial-7-days' || response.data.data?.is_trial || response.data.data?.subscription_plan_price?.final_price === 0;
            const requiresPayment = response.data.requires_payment !== false && !isTrial;
            const hasPrice = response.data.data?.subscription_plan_price?.final_price > 0;

            // If it's a trial (free), go directly to business creation
            if (isTrial && !hasPrice) {
              toast.success('Trial subscription diaktifkan!');
              navigate('/business-setup', { replace: true });
            } else if (requiresPayment || hasPrice) {
              // ✅ FIX: For paid subscriptions, ALWAYS require payment
              if (response.data.snap_token) {
                // If payment required and snap_token exists, open Midtrans payment
                toast.success('Subscription dibuat! Silakan selesaikan pembayaran.');
                handleMidtransPayment(
                  response.data.snap_token,
                  response.data.client_key,
                  response.data.data
                );
              } else {
                // Fallback: redirect to payment pending page
                toast.success('Subscription dibuat! Silakan selesaikan pembayaran.');
                navigate('/payment/pending', {
                  state: { 
                    subscription: response.data.data,
                    redirectAfterPayment: true,
                  },
                  replace: true,
                });
              }
            } else {
              // This should not happen, but handle gracefully
              console.error('Unexpected subscription state:', response.data);
              toast.error('Terjadi kesalahan. Silakan hubungi support.');
            }
          }
          return;
        } else {
          setError('Tidak ada harga tersedia untuk paket ini. Silakan hubungi administrator.');
          return;
        }
      }
      
      const response = await apiClient.post(
        '/v1/subscriptions/subscribe',
        {
          subscription_plan_id: plan.id,
          subscription_plan_price_id: priceId,
        }
      );

      if (response.data.success) {
        // ✅ Refresh subscription status in AuthContext (non-blocking)
        // Don't wait for it or redirect on failure - subscription was created successfully
        checkSubscription().catch(err => {
          console.warn(
            'Subscription check failed after subscribe, but subscription was created:',
            err
          );
        });

        // ✅ FIX: Check if it's a trial (free) or paid subscription
        const isTrial = plan.slug === 'trial-7-days' || response.data.data?.is_trial || response.data.data?.subscription_plan_price?.final_price === 0;
        const requiresPayment = response.data.requires_payment !== false && !isTrial;
        const hasPrice = response.data.data?.subscription_plan_price?.final_price > 0;

        // If it's a trial (free), go directly to business creation
        if (isTrial && !hasPrice) {
          toast.success('Trial subscription diaktifkan!');
          navigate('/business-setup', { replace: true });
        } else if (requiresPayment || hasPrice) {
          // ✅ FIX: For paid subscriptions, ALWAYS require payment
          if (response.data.snap_token) {
            // If payment required and snap_token exists, open Midtrans payment
            toast.success('Subscription dibuat! Silakan selesaikan pembayaran.');
            handleMidtransPayment(
              response.data.snap_token,
              response.data.client_key,
              response.data.data
            );
          } else {
            // Fallback: redirect to payment pending page
            toast.success('Subscription dibuat! Silakan selesaikan pembayaran.');
            navigate('/payment/pending', {
              state: { 
                subscription: response.data.data,
                redirectAfterPayment: true,
              },
              replace: true,
            });
          }
        } else {
          // This should not happen, but handle gracefully
          console.error('Unexpected subscription state:', response.data);
          toast.error('Terjadi kesalahan. Silakan hubungi support.');
        }
      }
    } catch (err) {
      // ✅ FIX: Better error handling with detailed messages
      let errorMsg = 'Gagal melakukan subscription';
      
      if (err.response?.data) {
        // ✅ FIX: Check for profile completion errors first (422)
        if (err.response.status === 422 && err.response.data.requires_profile_completion) {
          const profileErrors = err.response.data.errors || [];
          if (Array.isArray(profileErrors)) {
            errorMsg = profileErrors.join('\n') || err.response.data.message || errorMsg;
          } else if (typeof profileErrors === 'object') {
            const errorMessages = Object.values(profileErrors).flat();
            errorMsg = errorMessages.join('\n') || err.response.data.message || errorMsg;
          } else {
            errorMsg = err.response.data.message || errorMsg;
          }
          
          // Show toast with detailed error
          toast.error('Profil belum lengkap', {
            description: errorMsg,
            duration: 5000,
          });
          
          setError(errorMsg);
          console.error('Subscribe error (Profile incomplete):', err.response.data);
          return;
        }
        
        // Check for validation errors
        if (err.response.data.errors) {
          const errors = err.response.data.errors;
          if (typeof errors === 'object') {
            const errorMessages = Object.values(errors).flat();
            errorMsg = errorMessages.join(', ') || errorMsg;
          } else if (Array.isArray(errors)) {
            errorMsg = errors.join(', ') || errorMsg;
          }
        }
        // Check for message
        else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        }
        // Check for error field
        else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        }
      } else if (err.message) {
        errorMsg = err.message;
      } else if (err.request) {
        errorMsg = 'Network error: Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      }
      
      setError(errorMsg);
      console.error('Subscribe error:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
      });

      // ✅ FIX: Handle "already have active subscription" error
      if (
        err.response?.data?.message?.includes('already have an active subscription') ||
        err.response?.data?.message?.includes('You already have an active subscription')
      ) {
        console.log('✅ User already has active subscription, refreshing status and redirecting...');
        // Refresh subscription status
        checkSubscription(null, true).then(() => {
          // Check if user has business
          businessService.getAll().then(businessResult => {
            if (businessResult.success && businessResult.data && businessResult.data.length > 0) {
              // User has business, redirect to dashboard
              navigate('/', { replace: true });
            } else {
              // User has no business, redirect to business setup
              navigate('/business-setup', { replace: true });
            }
          }).catch(() => {
            // If business check fails, redirect to business setup
            navigate('/business-setup', { replace: true });
          });
        }).catch(() => {
          // If subscription check fails, still try to redirect
          navigate('/', { replace: true });
        });
        return;
      }

      // Check if error is due to incomplete profile
      if (
        err.response?.data?.requires_profile_completion ||
        err.response?.data?.error === 'Profil owner belum lengkap'
      ) {
        setProfileComplete(false);
        // Redirect to complete profile page
        navigate('/complete-profile', { replace: true });
      }

      // ✅ Jangan redirect ke register jika error - tetap di halaman ini
      // User bisa coba lagi atau pilih plan lain
    } finally {
      setSubscribing(false);
      setSelectedPlan(null);
    }
  };

  const handleMidtransPayment = (snapToken, clientKey, subscription) => {
    // Load Midtrans Snap script if not already loaded
    if (!window.snap) {
      const script = document.createElement('script');
      script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
      script.setAttribute('data-client-key', clientKey);
      script.onload = () => {
        openMidtransSnap(snapToken, subscription);
      };
      document.body.appendChild(script);
    } else {
      openMidtransSnap(snapToken, subscription);
    }
  };

  const openMidtransSnap = (snapToken, subscription) => {
    window.snap.pay(snapToken, {
      onSuccess: async function (result) {
        console.log('Payment success:', result);
        setError('');

        // Refresh subscription status
        await checkSubscription();

        // Redirect to business setup
        navigate('/business-setup', {
          state: { paymentSuccess: true, subscription },
        });
      },
      onPending: function (result) {
        console.log('Payment pending:', result);
        setError('Pembayaran pending. Silakan selesaikan pembayaran Anda.');

        // Navigate to pending page or show pending status
        navigate('/payment/pending', {
          state: { subscription, paymentResult: result },
        });
      },
      onError: function (result) {
        console.error('Payment error:', result);
        setError('Pembayaran gagal. Silakan coba lagi.');
      },
      onClose: function () {
        console.log('Payment popup closed');
        setError(
          'Anda menutup halaman pembayaran. Silakan selesaikan pembayaran untuk mengaktifkan subscription.'
        );
        setSubscribing(false);
        setSelectedPlan(null);
      },
    });
  };

  const getDurationLabel = (durationType, months) => {
    if (months === 0) return 'Trial 7 Hari';
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

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
        <div className='text-center'>
          <div className='w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-600'>Memuat paket subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4'>
      <div className='max-w-7xl mx-auto'>
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-gray-900 mb-4'>
            Pilih Paket Subscription
          </h1>
          <p className='text-lg text-gray-600'>
            Mulai dengan trial 7 hari gratis atau pilih paket berbayar untuk
            bisnis Anda
          </p>
        </div>

        {isPendingPayment && (
          <div className='mb-6 max-w-2xl mx-auto bg-orange-50 border-2 border-orange-300 text-orange-900 px-6 py-4 rounded-lg shadow-md'>
            <div className='flex flex-col gap-4'>
              <div className='flex items-start gap-3'>
                <svg
                  className='w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                  />
                </svg>
                <div className='flex-1'>
                  <p className='font-bold text-lg mb-1'>Pembayaran Belum Selesai</p>
                  <p className='text-sm text-orange-800'>
                    Anda memiliki pembayaran subscription yang masih pending. Silakan selesaikan pembayaran untuk mengaktifkan subscription dan mengakses semua fitur aplikasi.
                  </p>
                  {pendingSubscription?.subscription_code && (
                    <p className='text-xs text-orange-700 mt-2 font-mono'>
                      Kode: {pendingSubscription.subscription_code}
                    </p>
                  )}
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <button
                  onClick={handleGoToDashboard}
                  className='bg-orange-600 text-white px-5 py-2.5 rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-sm flex items-center gap-2'
                >
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15l1-1m4 0l1-1m-6 4h12a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z' />
                  </svg>
                  Lanjutkan Pembayaran
                </button>
                <button
                  onClick={() => navigate('/subscription-history')}
                  className='bg-white text-orange-700 border border-orange-300 px-5 py-2.5 rounded-lg hover:bg-orange-50 transition-colors font-medium shadow-sm flex items-center gap-2'
                >
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                  Lihat History Pembayaran
                </button>
              </div>
            </div>
          </div>
        )}

        {hasActiveSubscription && !isPendingPayment && (
          <div className='mb-6 max-w-2xl mx-auto bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg'>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <svg
                  className='w-5 h-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
                <div>
                  <p className='font-semibold'>
                    Anda sudah memiliki subscription aktif
                  </p>
                  <p className='text-sm'>
                    Silakan kembali ke dashboard atau pilih paket untuk upgrade
                  </p>
                </div>
              </div>
              <button
                onClick={handleGoToDashboard}
                className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap'
              >
                Ke Dashboard
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className='mb-6 max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg'>
            <div className='flex items-center justify-between gap-2'>
              <div>{error}</div>
              {error.includes('already have an active subscription') && (
                <button
                  onClick={handleGoToDashboard}
                  className='bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium whitespace-nowrap'
                >
                  Ke Dashboard
                </button>
              )}
            </div>
          </div>
        )}

        {!checkingProfile && !profileComplete && (
          <div className='mb-6 max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg'>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <svg
                  className='w-5 h-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                  />
                </svg>
                <div>
                  <p className='font-semibold'>
                    Silakan lengkapi profil Anda terlebih dahulu
                  </p>
                  <p className='text-sm'>
                    Sebelum memilih paket subscription, Anda harus melengkapi
                    profil owner terlebih dahulu (nama, email, alamat, dan
                    nomor WhatsApp yang terverifikasi).
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/complete-profile')}
                className='bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium whitespace-nowrap'
              >
                Lengkapi Profil
              </button>
            </div>
          </div>
        )}

        {trialEnded && (
          <div className='mb-6 max-w-2xl mx-auto bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg'>
            <div className='flex items-center gap-2'>
              <svg
                className='w-5 h-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                />
              </svg>
              <div>
                <p className='font-semibold'>Trial Anda sudah habis!</p>
                <p className='text-sm'>
                  Silakan pilih paket berbayar untuk melanjutkan menggunakan
                  sistem.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-lg shadow-md overflow-hidden ${
                plan.slug === 'trial-7-days'
                  ? 'border-2 border-blue-500 shadow-xl'
                  : plan.slug === 'professional'
                  ? 'border-2 border-green-500 shadow-xl'
                  : 'border border-gray-200'
              }`}
            >
              {/* Badge */}
              {plan.slug === 'trial-7-days' && (
                <div className='absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-xs font-semibold'>
                  ⚡ GRATIS
                </div>
              )}
              {plan.slug === 'professional' && (
                <div className='absolute top-0 right-0 bg-green-500 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-xs font-semibold'>
                  ⭐ POPULER
                </div>
              )}
              {plan.slug === 'trial-7-days' && hasUsedTrial && (
                <div className='absolute top-0 left-0 bg-red-500 text-white px-3 py-1 rounded-br-lg rounded-tl-lg text-xs font-semibold'>
                  {trialEnded ? '❌ TRIAL HABIS' : '❌ SUDAH DIGUNAKAN'}
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
                    {plan.slug !== 'trial-7-days' && (
                      <label className='text-sm font-medium text-gray-700 block'>
                        Pilih Durasi:
                      </label>
                    )}
                    <select
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
                      value={selectedDuration[plan.id] || ''}
                      onChange={e =>
                        setSelectedDuration({
                          ...selectedDuration,
                          [plan.id]: parseInt(e.target.value),
                        })
                      }
                      disabled={plan.slug === 'trial-7-days'}
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
                          {selectedPrice.price > 0 &&
                            selectedPrice.discount_percentage > 0 && (
                              <p className='text-sm text-gray-500 line-through'>
                                {formatPrice(selectedPrice.price)}
                              </p>
                            )}
                          <p className='text-3xl font-bold text-gray-900'>
                            {selectedPrice.final_price === 0
                              ? 'GRATIS'
                              : formatPrice(selectedPrice.final_price)}
                          </p>
                          {selectedPrice.duration_months > 0 && (
                            <p className='text-sm text-gray-600'>
                              / {selectedPrice.duration_months} bulan
                            </p>
                          )}
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
                        const featureText = typeof feature === 'string' 
                          ? feature 
                          : (feature?.feature || feature?.name || JSON.stringify(feature));
                        
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
                    plan.slug === 'trial-7-days' && hasUsedTrial
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : plan.slug === 'trial-7-days'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                  } ${
                    subscribing && selectedPlan === plan.id
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  onClick={() => handleSubscribe(plan)}
                  disabled={
                    subscribing ||
                    (plan.slug === 'trial-7-days' && hasUsedTrial)
                  }
                >
                  {subscribing && selectedPlan === plan.id ? (
                    <span className='flex items-center justify-center'>
                      <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2'></div>
                      Memproses...
                    </span>
                  ) : plan.slug === 'trial-7-days' && hasUsedTrial ? (
                    trialEnded ? (
                      'Trial Sudah Habis'
                    ) : (
                      'Sudah Pernah Trial'
                    )
                  ) : plan.slug === 'trial-7-days' ? (
                    'Coba Gratis 7 Hari'
                  ) : (
                    'Pilih Paket Ini'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {plans.length === 0 && !error && (
          <div className='text-center py-12'>
            <p className='text-gray-600'>
              Tidak ada paket subscription tersedia
            </p>
          </div>
        )}

        <div className='mt-12 text-center'>
          <p className='text-sm text-gray-600'>
            Semua paket termasuk update gratis dan support teknis
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
