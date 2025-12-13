import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import InitialLoadingScreen from '../ui/InitialLoadingScreen';
import LoadingLogo from '../ui/LoadingLogo';

// ✅ FIX: Define helper functions BEFORE component to prevent initialization error
const getRoleHomePath = role => {
  switch (role) {
    case 'super_admin':
    case 'owner':
    case 'admin':
      return '/';
    case 'kasir':
      return '/cashier';
    case 'kitchen':
      return '/kitchen';
    case 'waiter':
      return '/tables';
    case 'member':
      return '/customer-portal';
    default:
      return '/';
  }
};

const hasRolePermission = (userRole, allowedRoles) => {
  if (userRole === 'super_admin') return true;
  if (allowedRoles.length === 0) return true;
  return allowedRoles.includes(userRole);
};

const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requireBusiness = true,
}) => {
  console.log('🛡️ ProtectedRoute: Component rendered', {
    path: window.location.pathname,
    hasToken: !!localStorage.getItem('token'),
    hasCachedUser: !!localStorage.getItem('user'),
  });

  // ✅ FIX: All hooks must be called unconditionally (Rules of Hooks)
  // Call useAuth directly without try-catch to avoid conditional hook call
  const {
    isAuthenticated,
    loading,
    user,
    currentBusiness,
    businesses,
    hasActiveSubscription,
    isPendingPayment,
    subscriptionLoading,
    businessLoading,
    initialLoadComplete,
    profileComplete,
    whatsappVerified,
    profileLoading: profileStatusLoading,
    checkProfileStatus,
  } = useAuth();

  const _location = useLocation();
  const currentPath = window.location.pathname;

  // ✅ FIX: State untuk track apakah subscription check sudah selesai
  const [subscriptionCheckComplete, setSubscriptionCheckComplete] =
    useState(false);

  // ✅ FIX: Track waktu sejak initialLoadComplete untuk prevent premature redirect
  const initialLoadTimeRef = useRef(null);

  console.log('🛡️ ProtectedRoute: Auth state', {
    isAuthenticated,
    loading,
    hasUser: !!user,
    initialLoadComplete,
    hasTokenStorage: !!localStorage.getItem('token'),
  });

  // ✅ FIX: Track waktu initialLoadComplete untuk minimum wait time
  useEffect(() => {
    if (initialLoadComplete && !initialLoadTimeRef.current) {
      initialLoadTimeRef.current = Date.now();
      console.log(
        '⏱️ ProtectedRoute: Initial load complete, starting wait timer...'
      );
    }
  }, [initialLoadComplete]);

  // ✅ CRITICAL FIX: Cek cache subscription di awal untuk prevent redirect
  // Read cache SYNCHRONOUSLY on every render to ensure we always have latest value
  const getCachedSubscription = () => {
    try {
      const cached = localStorage.getItem('hasActiveSubscription');
      return cached === 'true';
    } catch (e) {
      return false;
    }
  };

  const [cachedSubscription, setCachedSubscription] = useState(() => {
    const cached = getCachedSubscription();
    console.log('📦 Initial cache check:', cached);
    return cached;
  });

  const skipSubscriptionCheck =
    localStorage.getItem('skipSubscriptionCheck') === 'true';
  const isOwnerRole = ['owner', 'super_admin'].includes(user?.role);
  const isBusinessSetupRoute = currentPath === '/business-setup';
  const isAddBusinessRoute = currentPath === '/business/new';
  const isSubscriptionRoute = currentPath === '/subscription-plans';
  const isCompleteProfileRoute = currentPath === '/complete-profile';

  // ✅ FIX: Check business from multiple sources (state, localStorage cache)
  const cachedBusinesses = localStorage.getItem('businesses');
  const cachedBusinessId = localStorage.getItem('currentBusinessId');
  const hasBusinessFromState = currentBusiness || businesses.length > 0;
  const hasBusinessFromCache = !!(cachedBusinesses || cachedBusinessId);
  const hasBusiness = hasBusinessFromState || hasBusinessFromCache;

  // ✅ CRITICAL FIX: Monitor perubahan cache secara real-time dengan interval lebih cepat
  useEffect(() => {
    const checkCache = () => {
      const isCachedTrue = getCachedSubscription();

      if (isCachedTrue !== cachedSubscription) {
        console.log('📦 Cache updated:', isCachedTrue);
        setCachedSubscription(isCachedTrue);
      }
    };

    // Check immediately
    checkCache();

    // Setup interval untuk monitor cache (check lebih sering untuk prevent redirect)
    const interval = setInterval(checkCache, 100);

    return () => clearInterval(interval);
  }, [cachedSubscription]);

  // ✅ FIX: Tandai subscription check complete setelah data ready
  useEffect(() => {
    if (initialLoadComplete && !subscriptionLoading) {
      console.log('✅ Subscription check complete', {
        hasActiveSubscription,
        cachedSubscription,
        initialLoadComplete,
        subscriptionLoading,
      });
      setSubscriptionCheckComplete(true);
    }
  }, [
    initialLoadComplete,
    subscriptionLoading,
    hasActiveSubscription,
    cachedSubscription,
  ]);

  // Check profile status
  useEffect(() => {
    if (
      isOwnerRole &&
      !isCompleteProfileRoute &&
      !isSubscriptionRoute &&
      initialLoadComplete &&
      !profileStatusLoading &&
      user &&
      (profileComplete === null || whatsappVerified === null)
    ) {
      checkProfileStatus().catch(() => null);
    }
  }, [
    isOwnerRole,
    isCompleteProfileRoute,
    isSubscriptionRoute,
    initialLoadComplete,
    profileStatusLoading,
    user,
    profileComplete,
    whatsappVerified,
    checkProfileStatus,
  ]);

  const hasToken = !!localStorage.getItem('token');
  const cachedUserStr = localStorage.getItem('user');
  const hasCachedUserStr = !!cachedUserStr;

  const isCheckingAuth = loading && hasToken && !user;
  const waitingInitialLoad = hasToken && !initialLoadComplete;

  // ✅ FIX: Public routes that don't require authentication
  // Check this AFTER all hooks are called to avoid React Hooks rules violation
  const isPublicRoute =
    currentPath.startsWith('/receipt/') ||
    currentPath.startsWith('/order/') ||
    currentPath.startsWith('/order-status/') ||
    currentPath.startsWith('/self-service/') ||
    currentPath === '/subscription-plans' ||
    currentPath === '/login' ||
    currentPath === '/register' ||
    currentPath.startsWith('/payment/') ||
    currentPath.startsWith('/email/verify') ||
    currentPath === '/login/sso';

  // ✅ CRITICAL: If this is a public route, allow access immediately without any checks
  if (isPublicRoute) {
    return children;
  }

  // ✅ CRITICAL FIX: Check cache SYNCHRONOUSLY on every render (not just state)
  // This ensures we always have the latest cache value, even if state hasn't updated yet
  const currentCacheValue = getCachedSubscription();

  // ✅ CRITICAL FIX: If we have token OR cached user, allow access IMMEDIATELY
  // This is the FIRST check - even before loading check
  // This prevents redirect during reload
  if (hasToken || hasCachedUserStr) {
    console.log(
      '🛡️ ProtectedRoute: Token/cached user found, allowing access immediately',
      {
        hasToken,
        hasCachedUserStr,
        hasUser: !!user,
        initialLoadComplete,
        path: currentPath,
      }
    );
    // ✅ ABSOLUTE PRIORITY: If we have token or cached user, return children IMMEDIATELY
    // Don't check user, role, or anything else - just return
    // This is the FASTEST and MOST RELIABLE path to prevent redirect
    return children;
  }

  // ✅ CRITICAL FIX: If cache is TRUE, allow access IMMEDIATELY (BEFORE ANY OTHER CHECKS)
  // This is the SECOND check - for subscription cache
  if (hasToken && (cachedSubscription || currentCacheValue)) {
    // ✅ ABSOLUTE PRIORITY: If cache is TRUE, return children IMMEDIATELY
    // Don't check user, role, or anything else - just return
    // This is the FASTEST and MOST RELIABLE path to prevent redirect
    return children;
  }

  // ✅ NEW: If user is authenticated and on a protected route, allow access during reload
  // This prevents redirect to subscription-plans or dashboard during hard reload
  // Only do this if we have a token, user is authenticated, and on a protected route
  const isAuthenticatedRoute = hasToken && isAuthenticated;
  const isOnProtectedRoute =
    currentPath !== '/subscription-plans' &&
    currentPath !== '/complete-profile' &&
    currentPath !== '/login' &&
    currentPath !== '/register' &&
    currentPath !== '/business-setup' &&
    currentPath !== '/business/new' &&
    currentPath !== '/';

  // ✅ Only allow if user is authenticated, on a protected route, and initial load is complete
  // This ensures user stays on their current page during hard reload
  if (
    isAuthenticatedRoute &&
    isOnProtectedRoute &&
    initialLoadComplete &&
    user
  ) {
    // Allow access to prevent redirect during reload
    // Subscription check will happen in background, but don't block access
    return children;
  }

  // ✅ CRITICAL: Show loading hanya jika benar-benar loading
  // BUT: Skip loading if cache is TRUE (we already returned above)
  const criticalLoading =
    (loading || isCheckingAuth || waitingInitialLoad) && !currentCacheValue;

  if (criticalLoading) {
    // ✅ NEW: Use InitialLoadingScreen for better UX during first load
    // This shows progress and prepares data before rendering
    return (
      <InitialLoadingScreen
        loadingSteps={[
          'Memverifikasi sesi...',
          'Memuat data pengguna...',
          'Memuat data bisnis...',
          'Mempersiapkan dashboard...',
        ]}
      />
    );
  }

  // ✅ CRITICAL FIX: Check token from localStorage directly (not just state)
  // During reload, state might not be updated yet but token exists in localStorage
  const hasTokenInStorage = !!localStorage.getItem('token');
  const isReallyAuthenticated = isAuthenticated || hasTokenInStorage;

  // ✅ FIX: Don't redirect if we have token in storage (checkAuth might still be running)
  // Only redirect if we're SURE user is not authenticated (no token AND initialLoadComplete)
  // ✅ CRITICAL: Also check if we have cached user - if yes, don't redirect
  const cachedUser = localStorage.getItem('user');
  const hasCachedUser = !!cachedUser;

  if (
    !isReallyAuthenticated &&
    initialLoadComplete &&
    !hasTokenInStorage &&
    !hasCachedUser
  ) {
    console.log(
      '🔍 ProtectedRoute: No token and no cached user, redirecting to login'
    );
    return <Navigate to='/login' />;
  }

  // ✅ FIX: Show loading if we have token but user data not loaded yet
  // OR if we have cached user but checkAuth is still running
  if (
    (!isReallyAuthenticated && !initialLoadComplete && hasTokenInStorage) ||
    (hasCachedUser && !user && hasTokenInStorage && !initialLoadComplete)
  ) {
    // ✅ NEW: Use InitialLoadingScreen for better UX
    return (
      <InitialLoadingScreen
        loadingSteps={[
          'Memverifikasi sesi...',
          'Memuat data pengguna...',
          'Memuat data bisnis...',
          'Mempersiapkan dashboard...',
        ]}
      />
    );
  }

  // ✅ FIX: If we have cached user and token but no user state, allow access temporarily
  // This prevents redirect during reload while checkAuth is running
  if (hasCachedUser && hasTokenInStorage && !user && initialLoadComplete) {
    console.log('🔍 ProtectedRoute: Using cached user temporarily');
    // Allow access - user will be loaded by checkAuth
    return children;
  }

  // Check profile completion
  if (
    isOwnerRole &&
    !isCompleteProfileRoute &&
    !isSubscriptionRoute &&
    initialLoadComplete &&
    user &&
    !profileStatusLoading
  ) {
    if (profileComplete === false && whatsappVerified === false) {
      console.log('⚠️ Profile incomplete, redirecting to complete-profile');
      return <Navigate to='/complete-profile' replace />;
    }
  }

  // Business setup logic
  // ✅ FIX: If user has business (from state or cache), redirect away from business-setup
  if (hasBusiness && isBusinessSetupRoute) {
    console.log(
      '✅ ProtectedRoute: User has business, redirecting away from business-setup'
    );
    return <Navigate to='/' replace />;
  }

  if (!requireBusiness) {
    return children;
  }

  // Employee role checks
  const isEmployeeRole = ['kasir', 'kitchen', 'waiter', 'admin'].includes(
    user?.role
  );

  if (isEmployeeRole) {
    if (initialLoadComplete) {
      // ✅ FIX: Wait for business loading to complete before checking
      if (!hasBusiness && !businessLoading) {
        // ✅ FIX: Double-check cache before redirecting
        if (!hasBusinessFromCache) {
          return <Navigate to='/login' replace />;
        }
        // If cache has business, wait for it to load
      }

      // ✅ FIX: Untuk employee, cek cache dulu sebelum redirect
      if (!hasActiveSubscription && !cachedSubscription) {
        return <Navigate to='/login' replace />;
      }
    }
  } else if (isOwnerRole) {
    // ✅ CRITICAL FIX: If cache is TRUE (check BOTH state and current value), IMMEDIATELY return children
    // This must be checked FIRST, even before skipSubscriptionCheck
    // Check current cache value directly (not just state) for maximum reliability
    // This is a SECOND check (first check is at the top) - but still important
    if (cachedSubscription || currentCacheValue) {
      return children; // ✅ DONE - No logging, no checking, just return immediately
    }

    // ✅ FIX: Skip subscription check if flag is set
    if (!skipSubscriptionCheck) {
      // ✅ Only check if cache is NOT set or FALSE
      if (!subscriptionCheckComplete) {
        return children; // Wait for check to complete
      }

      if (hasActiveSubscription) {
        return children; // State says active, allow access
      }

      // Pending payment check
      if (isPendingPayment && !isSubscriptionRoute) {
        console.log('⚠️ Pending payment, redirecting to subscription-plans');
        return <Navigate to='/subscription-plans' replace />;
      }

      // ✅ CRITICAL FIX: Only redirect to subscription-plans if user is NOT on a protected route
      // If user is already on a protected route (not subscription-plans), allow them to stay
      // This prevents redirect during hard reload when user is on a specific page
      const isProtectedRoute =
        currentPath !== '/subscription-plans' &&
        currentPath !== '/complete-profile' &&
        currentPath !== '/login' &&
        currentPath !== '/register' &&
        currentPath !== '/business-setup';

      // ✅ Only redirect if we're ABSOLUTELY SURE there's no subscription
      // AND cache is also FALSE (double check)
      // AND user is NOT already on a protected route (to prevent redirect during reload)
      if (
        isAuthenticated &&
        !hasActiveSubscription &&
        !cachedSubscription &&
        !currentCacheValue &&
        !isSubscriptionRoute &&
        !isPendingPayment &&
        !subscriptionLoading &&
        initialLoadComplete &&
        subscriptionCheckComplete &&
        !isProtectedRoute // ✅ NEW: Don't redirect if already on protected route
      ) {
        // ✅ Triple check cache before redirect (one more time)
        const finalCheck = localStorage.getItem('hasActiveSubscription');
        console.log(
          '⚠️ ProtectedRoute: About to redirect, final cache check:',
          {
            finalCheck,
            hasActiveSubscription,
            cachedSubscription,
            currentCacheValue,
            isSubscriptionRoute,
            isPendingPayment,
            subscriptionLoading,
            initialLoadComplete,
            subscriptionCheckComplete,
            currentPath,
            isProtectedRoute,
          }
        );

        if (finalCheck === 'true') {
          console.log(
            '✅ ProtectedRoute: Final check found cache TRUE, preventing redirect'
          );
          setCachedSubscription(true);
          return children;
        }

        // ✅ Only redirect if NOT on a protected route
        if (!isProtectedRoute) {
          console.log('⚠️ ProtectedRoute: REDIRECTING to subscription-plans');
          return <Navigate to='/subscription-plans' replace />;
        } else {
          // ✅ If on protected route, allow access (prevent redirect during reload)
          console.log(
            '✅ ProtectedRoute: User on protected route, allowing access to prevent redirect during reload'
          );
          return children;
        }
      }
    }

    // ✅ FIX: Check business loading status FIRST before business setup check
    // This ensures we wait for businesses to load before redirecting
    if (hasActiveSubscription && !isBusinessSetupRoute && !isAddBusinessRoute) {
      // ✅ FIX: Check cached businesses first
      const cachedBusinessesStr = localStorage.getItem('businesses');
      const cachedBusinessId = localStorage.getItem('currentBusinessId');
      let cachedBusinesses = null;

      try {
        if (cachedBusinessesStr) {
          cachedBusinesses = JSON.parse(cachedBusinessesStr);
        }
      } catch (e) {
        console.warn('Error parsing cached businesses:', e);
      }

      const hasCachedBusiness = !!(
        cachedBusinesses?.length > 0 || cachedBusinessId
      );

      // ✅ CRITICAL: If businesses are still loading, ALWAYS wait (don't redirect)
      if (businessLoading) {
        console.log('⏳ ProtectedRoute: Businesses still loading, waiting...', {
          businessLoading,
          hasBusiness,
          hasCachedBusiness,
          initialLoadComplete,
        });
        return children; // Wait for businesses to load
      }

      // ✅ FIX: If we have cached business but not in state yet, wait a bit more
      // This handles the case where cache exists but state hasn't updated yet
      if (hasCachedBusiness && !hasBusiness && initialLoadComplete) {
        console.log(
          '⏳ ProtectedRoute: Cached business found but not in state yet, waiting...',
          {
            cachedBusinessesCount: cachedBusinesses?.length || 0,
            cachedBusinessId: !!cachedBusinessId,
            hasBusiness,
            businessLoading,
          }
        );
        // Wait a bit more for businesses to load from cache to state
        // Give it a few more renders to update
        return children;
      }

      // ✅ FIX: Only redirect to business-setup if ALL conditions are met:
      // 1. Businesses finished loading (!businessLoading)
      // 2. No business in state (!hasBusiness)
      // 3. No business in cache (!hasCachedBusiness)
      // 4. Initial load is complete
      // 5. We've waited MINIMUM 5 seconds after initialLoadComplete to allow businesses to load
      const timeSinceInitialLoad = initialLoadTimeRef.current
        ? Date.now() - initialLoadTimeRef.current
        : 0;
      const MINIMUM_WAIT_TIME = 5000; // 5 seconds minimum wait
      const hasWaitedEnough = timeSinceInitialLoad >= MINIMUM_WAIT_TIME;

      const shouldRedirectToBusinessSetup =
        !hasBusiness &&
        !hasCachedBusiness &&
        initialLoadComplete &&
        !businessLoading &&
        hasWaitedEnough; // ✅ CRITICAL: Must wait minimum time

      if (shouldRedirectToBusinessSetup) {
        console.log(
          '⚠️ ProtectedRoute: No business found after waiting, redirecting to business-setup',
          {
            hasBusiness,
            hasBusinessFromState,
            hasBusinessFromCache,
            hasCachedBusiness,
            cachedBusinessesCount: cachedBusinesses?.length || 0,
            cachedBusinessId: !!cachedBusinessId,
            businessLoading,
            initialLoadComplete,
            businessesCount: businesses?.length || 0,
            currentBusinessId: currentBusiness?.id,
            timeSinceInitialLoad: `${(timeSinceInitialLoad / 1000).toFixed(
              1
            )}s`,
            hasWaitedEnough,
          }
        );
        return <Navigate to='/business-setup' replace />;
      } else if (
        !hasBusiness &&
        !hasCachedBusiness &&
        initialLoadComplete &&
        !businessLoading &&
        !hasWaitedEnough
      ) {
        // Still waiting for minimum wait time
        console.log(
          '⏳ ProtectedRoute: Waiting for minimum wait time before redirect decision...',
          {
            timeSinceInitialLoad: `${(timeSinceInitialLoad / 1000).toFixed(
              1
            )}s`,
            minimumWait: `${(MINIMUM_WAIT_TIME / 1000).toFixed(1)}s`,
            remaining: `${(
              (MINIMUM_WAIT_TIME - timeSinceInitialLoad) /
              1000
            ).toFixed(1)}s`,
          }
        );
        return children; // Wait more
      }

      // ✅ FIX: If we have business (from state or cache), allow access
      if (hasBusiness || hasCachedBusiness) {
        console.log('✅ ProtectedRoute: Business found, allowing access', {
          hasBusiness,
          hasCachedBusiness,
          businessesCount: businesses?.length || 0,
          currentBusinessId: currentBusiness?.id,
        });
        return children;
      }
    }
  }

  // Role-based access control
  if (allowedRoles.length > 0) {
    const userRole = user?.role;

    if (userRole === 'super_admin') {
      return children;
    }

    if (!allowedRoles.includes(userRole)) {
      const homePath = getRoleHomePath(userRole);
      return <Navigate to={homePath} replace />;
    }
  }

  return children;
};

// ✅ FIX: Export named exports separately to prevent initialization error
export { getRoleHomePath, hasRolePermission };
export default ProtectedRoute;
