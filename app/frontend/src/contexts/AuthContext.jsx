import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { API_CONFIG } from '../config/api.config';
import { businessService } from '../services/business.service';
import { employeeOutletService } from '../services/employeeOutlet.service';
import outletService from '../services/outlet.service';
import apiClient from '../utils/apiClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ✅ CRITICAL FIX: Helper function to FORCE set subscription cache
// This ensures cache is ALWAYS set before ProtectedRoute reads it
const setSubscriptionCache = value => {
  const cacheValue = value ? 'true' : 'false';

  // Set cache multiple times to ensure it's persisted
  localStorage.setItem('hasActiveSubscription', cacheValue);
  localStorage.setItem('hasActiveSubscription', cacheValue); // Set twice for safety

  // Verify it was actually set
  const verified = localStorage.getItem('hasActiveSubscription');
  console.log({
    verified,
    timestamp: Date.now(),
  });

  // If verification fails, try one more time
  if (verified !== cacheValue) {
    console.warn('⚠️ Cache set failed, retrying...');
    localStorage.setItem('hasActiveSubscription', cacheValue);
  }

  return verified === cacheValue;
};

// ✅ CRITICAL FIX: Helper to get subscription cache reliably
const getSubscriptionCache = () => {
  try {
    const cached = localStorage.getItem('hasActiveSubscription');
    return cached === 'true';
  } catch (e) {
    return false;
  }
};

// ✅ FIX: Declare and export AuthProvider as function declaration to prevent hoisting issues
export function AuthProvider({ children }) {
  // ✅ OPTIMIZATION: Load user from localStorage immediately for instant UI (like Facebook)
  // ✅ SECURITY: Validate user ID to prevent cache leakage between users
  const getCachedUser = () => {
    try {
      const cachedUser = localStorage.getItem('user');
      const cachedUserId = localStorage.getItem('userId');

      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        // ✅ CRITICAL: Validate user ID matches to prevent cache leakage
        if (
          parsed.id &&
          cachedUserId &&
          String(parsed.id) === String(cachedUserId)
        ) {
          return parsed;
        } else {
          // User ID mismatch - clear stale cache
          console.warn('⚠️ Cached user ID mismatch, clearing cache');
          localStorage.removeItem('user');
          localStorage.removeItem('userId');
          return null;
        }
      }
    } catch (e) {
      console.warn('Error parsing cached user:', e);
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
    }
    return null;
  };

  // ✅ OPTIMIZATION: Load businesses from localStorage immediately
  // ✅ SECURITY: Validate businesses belong to current user
  const getCachedBusinesses = () => {
    try {
      const cachedBusinesses = localStorage.getItem('businesses');
      const cachedUserId = localStorage.getItem('userId');

      if (cachedBusinesses) {
        const parsed = JSON.parse(cachedBusinesses);
        // ✅ CRITICAL: Validate businesses belong to current user
        // ✅ FIX: Only validate if we have userId, otherwise trust cache (might be loading)
        if (Array.isArray(parsed)) {
          if (cachedUserId) {
            // Check if at least one business belongs to user
            const hasValidBusiness = parsed.some(business => {
              const ownerId = business.owner_id || business.owner?.id;
              return ownerId && String(ownerId) === String(cachedUserId);
            });

            if (hasValidBusiness || parsed.length === 0) {
              return parsed;
            } else {
              // No valid business for this user - clear cache
              // ✅ FIX: Only log warning once per session to avoid spam
              const warningKey = 'business-cache-warning-shown';
              if (!sessionStorage.getItem(warningKey)) {
                sessionStorage.setItem(warningKey, 'true');
                console.warn(
                  '⚠️ Cached businesses do not belong to current user, clearing cache'
                );
              }
              localStorage.removeItem('businesses');
              return null;
            }
          } else {
            // No userId yet - might be loading, trust cache for now
            return parsed;
          }
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Error parsing cached businesses:', e);
      localStorage.removeItem('businesses');
    }
    return null;
  };

  // ✅ OPTIMIZATION: Load current business from localStorage immediately
  const getCachedCurrentBusiness = () => {
    try {
      const cachedBusiness = localStorage.getItem('currentBusiness');
      if (cachedBusiness) {
        return JSON.parse(cachedBusiness);
      }
    } catch (e) {
      console.warn('Error parsing cached current business:', e);
    }
    return null;
  };

  // ✅ OPTIMIZATION: Load current outlet from localStorage immediately
  // ✅ FIX: Validate cached outlet belongs to current business before using
  const getCachedCurrentOutlet = () => {
    try {
      const cachedOutlet = localStorage.getItem('currentOutlet');
      const cachedBusinessId = localStorage.getItem('currentBusinessId');
      const currentBusinessId = getCachedCurrentBusiness()?.id;

      if (cachedOutlet) {
        const parsed = JSON.parse(cachedOutlet);
        // ✅ FIX: Only use cached outlet if business ID matches
        // This prevents using outlet from different business
        if (
          parsed.business_id &&
          currentBusinessId &&
          parsed.business_id === currentBusinessId
        ) {
          return parsed;
        } else if (
          cachedBusinessId &&
          currentBusinessId &&
          cachedBusinessId === String(currentBusinessId)
        ) {
          // Business ID matches, outlet might be valid
          return parsed;
        } else {
          // Business ID mismatch, clear stale cache
          console.log('⚠️ Cached outlet business ID mismatch, clearing cache');
          localStorage.removeItem('currentOutlet');
          localStorage.removeItem('currentOutletId');
        }
      }
    } catch (e) {
      console.warn('Error parsing cached current outlet:', e);
      localStorage.removeItem('currentOutlet');
      localStorage.removeItem('currentOutletId');
    }
    return null;
  };

  // ✅ OPTIMIZATION: Load outlets from localStorage immediately
  const getCachedOutlets = () => {
    try {
      const cachedOutlets = localStorage.getItem('outlets');
      const cachedBusinessId = localStorage.getItem('currentBusinessId');
      const currentBusinessId = getCachedCurrentBusiness()?.id;

      if (cachedOutlets) {
        const parsed = JSON.parse(cachedOutlets);
        // ✅ FIX: Only use cached outlets if business ID matches
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if first outlet belongs to current business
          if (parsed[0]?.business_id && currentBusinessId) {
            if (parsed[0].business_id === currentBusinessId) {
              return parsed;
            } else {
              // Business ID mismatch, clear stale cache
              console.log(
                '⚠️ Cached outlets business ID mismatch, clearing cache'
              );
              localStorage.removeItem('outlets');
              return [];
            }
          } else if (
            cachedBusinessId &&
            currentBusinessId &&
            cachedBusinessId === String(currentBusinessId)
          ) {
            // Business ID matches, outlets might be valid
            return parsed;
          }
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Error parsing cached outlets:', e);
      localStorage.removeItem('outlets');
    }
    return [];
  };

  let cachedUser = getCachedUser();
  let cachedBusinesses = getCachedBusinesses();
  let cachedCurrentBusiness = getCachedCurrentBusiness();

  // ✅ CRITICAL: Validate cached business belongs to current user
  // If cached business owner doesn't match cached user, clear cache (prevent data leakage)
  if (cachedUser && cachedCurrentBusiness) {
    const cachedUserId = cachedUser.id;
    const businessOwnerId =
      cachedCurrentBusiness.owner_id || cachedCurrentBusiness.owner?.id;

    // ✅ CRITICAL: Check user ID match (most reliable)
    if (
      cachedUserId &&
      businessOwnerId &&
      String(cachedUserId) !== String(businessOwnerId)
    ) {
      // ✅ FIX: Only log warning once per session to avoid spam
      const warningKey = 'business-owner-warning-shown';
      if (!sessionStorage.getItem(warningKey)) {
        sessionStorage.setItem(warningKey, 'true');
        console.warn(
          '⚠️ Cached business does not belong to cached user, clearing business cache'
        );
      }
      localStorage.removeItem('currentBusiness');
      localStorage.removeItem('currentBusinessId');
      cachedCurrentBusiness = null;
    } else if (cachedCurrentBusiness) {
      // ✅ FIX: Also check owner email as additional validation (if ID check passed)
      const businessOwnerEmail =
        cachedCurrentBusiness.owner?.email ||
        cachedCurrentBusiness.owner_email ||
        cachedCurrentBusiness.email;
      const userEmail = cachedUser.email;

      // Clear cache if owner email doesn't match (additional check)
      if (businessOwnerEmail && userEmail && businessOwnerEmail !== userEmail) {
        // ✅ FIX: Only log warning in development, and make it less alarming
        if (process.env.NODE_ENV === 'development') {
          console.log(
            'ℹ️ Clearing cached business from different user (email mismatch):',
            {
              cachedUserEmail: userEmail,
              cachedUserId: cachedUserId,
              businessOwnerEmail: businessOwnerEmail,
              businessOwnerId: businessOwnerId,
            }
          );
        }
        localStorage.removeItem('currentBusiness');
        localStorage.removeItem('currentBusinessId');
        localStorage.removeItem('businesses');
        // Reset cachedCurrentBusiness to null
        cachedCurrentBusiness = null;
      }
    }
  }

  // ✅ FIX: Validate cached businesses belong to current user
  if (cachedUser && cachedBusinesses && Array.isArray(cachedBusinesses)) {
    const userEmail = cachedUser.email;
    const userId = cachedUser.id;
    const invalidBusinesses = cachedBusinesses.filter(business => {
      const businessOwnerEmail =
        business.owner?.email || business.owner_email || business.email;
      const businessOwnerId = business.owner_id || business.owner?.id;

      // Check both email and ID
      const emailMismatch =
        businessOwnerEmail && userEmail && businessOwnerEmail !== userEmail;
      const idMismatch =
        businessOwnerId &&
        userId &&
        parseInt(businessOwnerId) !== parseInt(userId);

      return emailMismatch || idMismatch;
    });

    if (invalidBusinesses.length > 0) {
      // ✅ FIX: Only log warning in development, and make it less alarming
      if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ Clearing cached businesses from different user:', {
          cachedUserEmail: userEmail,
          cachedUserId: userId,
          invalidBusinesses: invalidBusinesses.map(b => ({
            id: b.id,
            name: b.name,
            ownerEmail: b.owner?.email || b.owner_email || b.email,
            ownerId: b.owner_id || b.owner?.id,
          })),
        });
      }
      localStorage.removeItem('businesses');
      localStorage.removeItem('currentBusiness');
      localStorage.removeItem('currentBusinessId');
      // Reset cachedBusinesses to empty array
      cachedBusinesses = [];
      cachedCurrentBusiness = null;
    }
  }

  // ✅ CRITICAL: Set business ID to localStorage immediately (synchronously) if we have cached business
  // This must be done BEFORE useState to ensure it's available for API calls
  if (cachedCurrentBusiness && cachedCurrentBusiness.id) {
    const existingBusinessId = localStorage.getItem('currentBusinessId');
    if (existingBusinessId !== String(cachedCurrentBusiness.id)) {
      localStorage.setItem('currentBusinessId', cachedCurrentBusiness.id);
      console.log(
        '✅ Set business ID from cache (sync):',
        cachedCurrentBusiness.id
      );
    }
  }

  const [user, setUser] = useState(cachedUser); // ✅ Load from cache immediately
  const [token, setToken] = useState(localStorage.getItem('token'));
  // ✅ OPTIMIZATION: Start with false loading if we have cached data (instant UI like Facebook)
  const [loading, setLoading] = useState(!cachedUser); // Only show loading if no cached user
  const [currentBusiness, setCurrentBusiness] = useState(cachedCurrentBusiness); // ✅ Load from cache
  const [businesses, setBusinesses] = useState(cachedBusinesses || []); // ✅ Load from cache
  // ✅ FIX: Load subscription status from cache for instant UI
  const getCachedSubscriptionStatus = () => {
    try {
      const cached = localStorage.getItem('hasActiveSubscription');
      if (cached !== null) {
        const isActive = cached === 'true';
        // ✅ DEBUG: Log only in development
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 Loaded cached subscription status:', isActive);
        }
        return isActive;
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to load cached subscription status:', e);
      }
    }
    return false;
  };

  const [hasActiveSubscription, setHasActiveSubscription] = useState(
    getCachedSubscriptionStatus()
  );
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  // ✅ NEW: Store subscription plan features (load from cache if available)
  const getCachedSubscriptionFeatures = () => {
    try {
      const cached = localStorage.getItem('subscriptionFeatures');
      if (cached) {
        const parsed = JSON.parse(cached);
        // ✅ DEBUG: Log only in development
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 Loaded cached subscription features:', parsed);
        }
        return parsed;
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to load cached subscription features:', e);
      }
    }
    // ✅ FIX: Default value harus lengkap dengan semua features
    const defaultFeatures = {
      has_advanced_reports: false,
      has_reports_access: false,
      has_online_integration: false,
      has_api_access: false,
      has_multi_location: false,
      has_kitchen_access: false,
      has_tables_access: false,
      has_attendance_access: false,
      has_inventory_access: false,
      has_promo_access: false,
      has_stock_transfer_access: false,
      has_self_service_access: false,
      max_businesses: 1,
      max_outlets: 1,
      max_products: 100,
      max_employees: 5,
    };
    // ✅ DEBUG: Log only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '📦 No cached subscription features found, using defaults:',
        defaultFeatures
      );
    }
    return defaultFeatures;
  };

  const [subscriptionFeatures, setSubscriptionFeatures] = useState(
    getCachedSubscriptionFeatures()
  );

  // ✅ NEW: Sync subscriptionFeatures state with localStorage when it changes
  useEffect(() => {
    const handleStorageChange = e => {
      if (e.key === 'subscriptionFeatures' && e.newValue) {
        try {
          const newFeatures = JSON.parse(e.newValue);
          console.log(
            '🔄 Subscription features updated from localStorage (storage event):',
            newFeatures
          );
          setSubscriptionFeatures(newFeatures);
        } catch (error) {
          console.warn(
            'Failed to parse subscription features from storage event:',
            error
          );
        }
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also check localStorage periodically (in case of same-tab updates)
    // ✅ FIX: Use ref to avoid dependency on subscriptionFeatures (prevent infinite loop)
    const interval = setInterval(() => {
      const cached = localStorage.getItem('subscriptionFeatures');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Use functional update to compare with current state
          setSubscriptionFeatures(current => {
            const currentStr = JSON.stringify(current);
            const newStr = JSON.stringify(parsed);
            if (currentStr !== newStr) {
              console.log(
                '🔄 Subscription features updated from localStorage (polling):',
                parsed
              );
              return parsed;
            }
            return current; // No change, return current state
          });
        } catch (error) {
          console.warn(
            'Failed to parse subscription features from localStorage:',
            error
          );
        }
      }
    }, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []); // ✅ FIX: Empty dependency array - only run once on mount
  const [businessLoading, setBusinessLoading] = useState(false);
  const cachedCurrentOutlet = getCachedCurrentOutlet();
  const cachedOutlets = getCachedOutlets();
  const [currentOutlet, setCurrentOutlet] = useState(cachedCurrentOutlet); // ✅ Load from cache
  const [outlets, setOutlets] = useState(cachedOutlets); // ✅ Load from cache

  // ✅ FIX: Sync currentOutlet with localStorage immediately when set
  useEffect(() => {
    if (currentOutlet && currentOutlet.id) {
      const savedOutletId = localStorage.getItem('currentOutletId');
      if (savedOutletId !== String(currentOutlet.id)) {
        localStorage.setItem('currentOutletId', currentOutlet.id);
        localStorage.setItem('currentOutlet', JSON.stringify(currentOutlet));
        console.log('✅ Set outlet ID to localStorage:', currentOutlet.id);
      }
    }
  }, [currentOutlet]);

  // ✅ FIX: Get queryClient to clear cache on logout/login
  const queryClient = useQueryClient();

  // ✅ OPTIMIZATION: Prefetch critical data for instant loading (like Facebook)
  // ✅ SECURITY: Only prefetch for current user's business
  const prefetchCriticalData = useCallback(
    async (businessId, outletId) => {
      if (!businessId) return;

      // ✅ CRITICAL: Check token availability before prefetching
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ No token available, skipping prefetch');
        return;
      }

      // ✅ CRITICAL: Validate business belongs to current user before prefetching
      const currentUserId = user?.id || localStorage.getItem('userId');
      if (!currentUserId) {
        console.warn('⚠️ No user ID, skipping prefetch');
        return;
      }

      console.log('🚀 Prefetching critical data for instant loading:', {
        businessId,
        outletId,
        userId: currentUserId,
        hasToken: !!token,
      });

      try {
        // Import services dynamically to avoid circular dependencies
        const { productService } = await import('../services/product.service');
        const { categoryService } = await import(
          '../services/category.service'
        );
        const { queryKeys } = await import('../config/reactQuery');

        // ✅ OPTIMIZATION: Use React Query prefetch for better caching
        // This ensures data is cached and ready when components need it
        // ✅ CRITICAL: Include user ID in query keys to prevent cache collision
        const userId = currentUserId;
        const prefetchPromises = [
          // Prefetch products using React Query (most important for POS)
          // ✅ Include user ID in query key to isolate cache per user
          queryClient
            .prefetchQuery({
              queryKey: [
                ...queryKeys.products.list(businessId, {
                  per_page: 50,
                  page: 1,
                }),
                userId,
              ], // Add user ID to prevent cache collision
              queryFn: async () => {
                const result = await productService.getAll({
                  per_page: 50,
                  page: 1,
                });
                return result.success ? result.data : null;
              },
              staleTime: 10 * 60 * 1000, // 10 minutes
            })
            .catch(() => null),

          // Prefetch categories using React Query
          // ✅ Include user ID in query key to isolate cache per user
          queryClient
            .prefetchQuery({
              queryKey: [...queryKeys.categories.list(businessId), userId], // Add user ID
              queryFn: async () => {
                const result = await categoryService.getAll({});
                return result.success ? result.data : null;
              },
              staleTime: 10 * 60 * 1000, // 10 minutes
            })
            .catch(() => null),
        ];

        // If outlet is available, prefetch outlet-specific data
        if (outletId) {
          // Prefetch dashboard stats if needed
          // ✅ Include user ID in query key to isolate cache per user
          prefetchPromises.push(
            queryClient
              .prefetchQuery({
                queryKey: [...queryKeys.dashboard.stats({}, outletId), userId], // Add user ID
                staleTime: 2 * 60 * 1000, // 2 minutes
              })
              .catch(() => null)
          );
        }

        // Execute all prefetches in parallel (non-blocking)
        Promise.allSettled(prefetchPromises)
          .then(() => {
            console.log('✅ Critical data prefetched and cached successfully');
          })
          .catch(() => {
            console.warn('⚠️ Some prefetches failed (non-critical)');
          });

        // Don't await - let it run in background
      } catch (error) {
        console.warn('⚠️ Prefetch setup failed (non-critical):', error);
        // Don't throw - prefetch failures shouldn't block login
      }
    },
    [queryClient, user?.id] // Include user ID in dependencies
  );

  // ✅ FIX: Don't mark initial load complete immediately - wait for subscription check
  // This prevents ProtectedRoute from redirecting before subscription status is known
  // Even if we have cached user, we need to verify subscription status first
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [profileComplete, setProfileComplete] = useState(null); // null = not checked yet
  const [whatsappVerified, setWhatsappVerified] = useState(null); // null = not checked yet
  const [profileLoading, setProfileLoading] = useState(false);

  // ✅ FIX: Sync currentBusiness with localStorage (set business ID immediately)
  useEffect(() => {
    if (currentBusiness && currentBusiness.id) {
      // ✅ CRITICAL: Set business ID to localStorage immediately when business is set
      // This ensures API calls have the business ID header
      const savedBusinessId = localStorage.getItem('currentBusinessId');
      if (savedBusinessId !== String(currentBusiness.id)) {
        localStorage.setItem('currentBusinessId', currentBusiness.id);
        console.log('✅ Set business ID to localStorage:', currentBusiness.id);
      }
    }
  }, [currentBusiness]);

  // ✅ FIX: Initialize business ID from cached business on mount
  useEffect(() => {
    if (cachedCurrentBusiness && cachedCurrentBusiness.id) {
      // Set business ID immediately from cache
      localStorage.setItem('currentBusinessId', cachedCurrentBusiness.id);
      console.log(
        '✅ Initialized business ID from cache:',
        cachedCurrentBusiness.id
      );

      // ✅ CRITICAL FIX: Only prefetch if token is available (user is logged in)
      // Don't prefetch on mount if user hasn't logged in yet
      const token = localStorage.getItem('token');
      if (token) {
        // ✅ OPTIMIZATION: Prefetch critical data from cache immediately
        const cachedOutletId = localStorage.getItem('currentOutletId');
        console.log('🚀 Prefetching critical data from cache...');
        prefetchCriticalData(
          cachedCurrentBusiness.id,
          cachedOutletId ? parseInt(cachedOutletId) : null
        ).catch(() => null);
      } else {
        console.log('⚠️ No token available, skipping prefetch on mount');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount - intentionally empty deps

  // ✅ OPTIMIZATION: Prefetch critical data when currentBusiness changes
  // This ensures data is ready immediately when business is set (like Facebook)
  useEffect(() => {
    if (currentBusiness && currentBusiness.id && initialLoadComplete) {
      // ✅ CRITICAL FIX: Check token before prefetching
      const token = localStorage.getItem('token');
      if (!token) {
        console.log(
          '⚠️ No token available, skipping prefetch on business change'
        );
        return;
      }

      const outletId =
        currentOutlet?.id || localStorage.getItem('currentOutletId');
      console.log('🚀 Business changed, prefetching critical data...', {
        businessId: currentBusiness.id,
        outletId: outletId,
      });

      // Prefetch in background (non-blocking)
      prefetchCriticalData(
        currentBusiness.id,
        outletId ? parseInt(outletId) : null
      ).catch(() => null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, initialLoadComplete]); // Only when business ID changes

  // Set axios default headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Logout function - moved before useEffect that uses it
  const logout = useCallback(async () => {
    console.log('🚪 LOGOUT CALLED - Clearing all auth data');

    // ✅ SECURITY: Call backend logout to revoke token and clear cookie
    try {
      await apiClient.post('/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn(
        'Logout API call failed, continuing with local cleanup:',
        error
      );
    }

    // ✅ FIX: Clear all React Query cache before clearing state
    console.log('🧹 Clearing React Query cache...');
    queryClient.clear();
    queryClient.removeQueries(); // Remove all queries
    queryClient.resetQueries(); // Reset all queries

    setUser(null);
    setToken(null);
    setCurrentBusiness(null);
    setBusinesses([]);
    setCurrentOutlet(null);
    setOutlets([]);
    setHasActiveSubscription(false);
    setInitialLoadComplete(false); // ✅ FIX: Reset initial load flag on logout
    // ✅ FIX: Clear all localStorage items on logout
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    localStorage.removeItem('businesses');
    localStorage.removeItem('currentBusiness');
    localStorage.removeItem('currentBusinessId');
    localStorage.removeItem('currentOutletId');
    localStorage.removeItem('hasActiveSubscription'); // ✅ FIX: Clear subscription status cache
    // ✅ FIX: Also clear cache from cache.utils if used
    try {
      localStorage.removeItem('cache_businesses');
      localStorage.removeItem('cache_current_business');
      // Clear all cache keys that might contain business data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_') || key.includes('business')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      // Ignore if keys don't exist
    }
    delete axios.defaults.headers.common['Authorization'];
    console.log('✅ All user cache cleared on logout - ready for next user');
  }, [queryClient]);

  // Add global error handler for WebSocket errors
  useEffect(() => {
    const handleWebSocketError = event => {
      if (
        event.error?.message?.includes('WebSocket') ||
        event.error?.message?.includes('socket')
      ) {
        console.log('🔌 Ignoring WebSocket error from dev server');
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleWebSocketError);
    window.addEventListener('unhandledrejection', handleWebSocketError);

    return () => {
      window.removeEventListener('error', handleWebSocketError);
      window.removeEventListener('unhandledrejection', handleWebSocketError);
    };
  }, []);

  // Add response interceptor to handle subscription expired
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        // Only handle subscription errors if user is authenticated
        if (error.response?.data?.subscription_required && user) {
          const isEmployee =
            user && ['kasir', 'kitchen', 'waiter', 'admin'].includes(user.role);
          const subscriptionExpired =
            error.response?.data?.subscription_expired;

          console.log('🚫 Subscription error detected:', {
            isEmployee,
            subscriptionExpired,
            currentPath: window.location.pathname,
            error: error.response?.data,
          });

          // ✅ FIX: Don't redirect if on public routes
          const currentPath = window.location.pathname;
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

          if (isPublicRoute) {
            // Don't redirect for public routes
            return Promise.reject(error);
          }

          if (isEmployee && subscriptionExpired) {
            // Employee's owner subscription expired - redirect to login
            console.log(
              '🚫 Employee owner subscription expired, redirecting to login'
            );
            logout();
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          } else {
            // Owner subscription required - but don't redirect if already on subscription page
            console.log(
              '🚫 Owner subscription required, current path:',
              window.location.pathname
            );
            if (window.location.pathname !== '/subscription-plans') {
              console.log('🚫 Redirecting to subscription-plans');
              window.location.href = '/subscription-plans';
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [user, logout]);

  // Check profile completion and WhatsApp verification
  const checkProfileStatus = useCallback(async () => {
    if (!token || !user) {
      return { profileComplete: true, whatsappVerified: true };
    }

    try {
      setProfileLoading(true);
      const response = await apiClient.get('/v1/user/profile/check', {
        timeout: 5000,
      });

      const profileComplete = response.data?.profile_complete || false;
      const whatsappVerified = response.data?.whatsapp_verified || false;

      setProfileComplete(profileComplete);
      setWhatsappVerified(whatsappVerified);

      // ✅ CACHE the result
      localStorage.setItem(
        'profileComplete',
        profileComplete ? 'true' : 'false'
      );
      localStorage.setItem(
        'whatsappVerified',
        whatsappVerified ? 'true' : 'false'
      );

      setProfileLoading(false);

      return { profileComplete, whatsappVerified };
    } catch (error) {
      // ✅ FIX: Ignore CanceledError (duplicate request prevention)
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log('Profile check cancelled, ignoring...');
        return { profileComplete: null, whatsappVerified: null };
      }

      // ✅ On 429 or error, use cache
      if (error.response?.status === 429) {
        const cachedProfile =
          localStorage.getItem('profileComplete') === 'true';
        const cachedWhatsapp =
          localStorage.getItem('whatsappVerified') === 'true';
        setProfileComplete(cachedProfile);
        setWhatsappVerified(cachedWhatsapp);
        setProfileLoading(false);
        return {
          profileComplete: cachedProfile,
          whatsappVerified: cachedWhatsapp,
        };
      }

      // Only log non-timeout errors to reduce console noise
      const isTimeout =
        error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      if (!isTimeout) {
        console.error('Error checking profile status:', error);
      }
      // On error, assume complete to not block access (will be checked again)
      setProfileComplete(true);
      setWhatsappVerified(true);
      setProfileLoading(false);
      return { profileComplete: true, whatsappVerified: true };
    }
  }, [token, user]);

  // Check subscription status
  const checkSubscription = useCallback(
    async (userToCheck = null, forceRefresh = false) => {
      const currentUser = userToCheck || user;
      console.log('🔍 checkSubscription called:', {
        role: currentUser?.role,
        forceRefresh,
        currentCache: getSubscriptionCache(),
      });

      if (!currentUser) {
        console.log('🔍 No user provided, skipping');
        return false;
      }

      // ✅ NEW: Clear subscription features cache if forceRefresh
      if (forceRefresh) {
        console.log(
          '🔄 Force refresh: Clearing subscription features cache...'
        );
        localStorage.removeItem('subscriptionFeatures');
      }

      // Don't skip if forceRefresh is true
      if (
        hasActiveSubscription &&
        currentUser.id === user?.id &&
        !forceRefresh &&
        !subscriptionLoading
      ) {
        console.log('🔍 Using cached result');
        return hasActiveSubscription;
      }

      setSubscriptionLoading(true);

      // For employee roles, check their business owner's subscription
      const isEmployeeRole =
        currentUser &&
        ['kasir', 'kitchen', 'waiter', 'admin'].includes(currentUser.role);
      if (isEmployeeRole) {
        try {
          const response = await apiClient.get('/v1/subscriptions/current', {
            timeout: 10000, // ✅ OPTIMIZATION: 10s timeout (increased from 5s - endpoint might be slow)
          });

          const hasActiveSubscription = response.data.has_subscription || false;
          const subscriptionExpired =
            response.data.subscription_expired || false;

          console.log('🔍 Employee subscription check result:', {
            hasActiveSubscription,
            subscriptionExpired,
            isEmployee: response.data.is_employee,
          });

          setHasActiveSubscription(hasActiveSubscription);
          setSubscriptionLoading(false);

          // ✅ NEW: Store subscription plan features for employee (from owner's subscription)
          const planFeatures = response.data.plan_features || {
            has_advanced_reports: false,
            has_reports_access: false,
            has_online_integration: false,
            has_api_access: false,
            has_multi_location: false,
            has_kitchen_access: false,
            has_tables_access: false,
            has_attendance_access: false,
            has_inventory_access: false,
            has_promo_access: false,
            has_stock_transfer_access: false,
            has_self_service_access: false,
            max_businesses: 1,
            max_outlets: 1,
            max_products: 100,
            max_employees: 5,
          };
          setSubscriptionFeatures(planFeatures);
          localStorage.setItem(
            'subscriptionFeatures',
            JSON.stringify(planFeatures)
          );

          // ✅ CRITICAL: Use helper to set cache
          setSubscriptionCache(hasActiveSubscription);

          console.log('✅ Employee subscription:', hasActiveSubscription);
          return hasActiveSubscription;
        } catch (error) {
          const isTimeout =
            error.code === 'ECONNABORTED' || error.message?.includes('timeout');
          if (isTimeout) {
            setHasActiveSubscription(true);
            setSubscriptionLoading(false);
            setSubscriptionCache(true);
            return true;
          }
          setHasActiveSubscription(false);
          setSubscriptionLoading(false);
          setSubscriptionCache(false);
          return false;
        }
      }

      try {
        const response = await apiClient.get('/v1/subscriptions/current', {
          timeout: 10000, // ✅ OPTIMIZATION: 10s timeout (increased from 5s - endpoint might be slow)
        });

        const hasActiveSubscription = response.data.has_subscription || false;
        const isPendingPayment = response.data.is_pending_payment || false;
        const subscriptionStatus = response.data.subscription_status || null;
        const isTrial = response.data.is_trial || false;
        const trialEnded = response.data.trial_ended || false;
        const subscriptionData = response.data.data || null;

        console.log('🔍 Subscription check result:', {
          hasActiveSubscription,
          isPendingPayment,
          subscriptionStatus,
          isTrial,
          trialEnded,
          daysRemaining: response.data.days_remaining,
          subscriptionData: subscriptionData
            ? {
                code: subscriptionData.subscription_code,
                status: subscriptionData.status,
                ends_at: subscriptionData.ends_at,
              }
            : null,
        });

        // ✅ FIX: Also check subscription data status directly
        // Sometimes has_subscription might be false but subscription.status is 'active'
        const isActuallyActive =
          hasActiveSubscription ||
          (subscriptionData &&
            subscriptionData.status === 'active' &&
            subscriptionData.ends_at &&
            new Date(subscriptionData.ends_at) > new Date());

        // ✅ FIX: Prioritize active subscription over pending_payment
        // If user has active subscription, use it regardless of pending_payment status
        // Only treat as pending_payment if there's NO active subscription
        const hasActiveSub = isActuallyActive || 
          (subscriptionData && 
           subscriptionData.status === 'active' && 
           subscriptionData.ends_at && 
           new Date(subscriptionData.ends_at) > new Date());

        // If it's a trial that has ended, treat as no subscription
        if (isTrial && trialEnded) {
          setHasActiveSubscription(false);
          setSubscriptionLoading(false);
          setSubscriptionCache(false);
          return false;
        }

        // ✅ FIX: Only treat as pending_payment if there's NO active subscription
        // If user has active subscription, they can still use it even if there's pending_payment
        if (hasActiveSub) {
          // User has active subscription - use it, ignore pending_payment
          // This allows user to continue using active subscription even if they have pending payment for renewal
          setHasActiveSubscription(true);
          setIsPendingPayment(false); // Don't block access even if there's pending payment
          setSubscriptionLoading(false);
          setSubscriptionCache(true);
          // Continue to set plan features below - don't return early
        } else if (
          isPendingPayment ||
          subscriptionStatus === 'pending_payment' ||
          (subscriptionData && subscriptionData.status === 'pending_payment')
        ) {
          // No active subscription, but there's pending payment
          setHasActiveSubscription(false);
          setIsPendingPayment(true);
          setSubscriptionLoading(false);
          setSubscriptionCache(false);
          return false;
        } else {
          // No active subscription and no pending payment
          setHasActiveSubscription(false);
          setIsPendingPayment(false);
          setSubscriptionLoading(false);
          setSubscriptionCache(false);
        }

        // ✅ NEW: Store subscription plan features
        const planFeatures = response.data.plan_features || {
          has_advanced_reports: false,
          has_reports_access: false,
          has_online_integration: false,
          has_api_access: false,
          has_multi_location: false,
          has_kitchen_access: false,
          has_tables_access: false,
          has_attendance_access: false,
          has_inventory_access: false,
          has_promo_access: false,
          has_stock_transfer_access: false,
          has_self_service_access: false,
          max_businesses: 1, // ✅ FIX: Include max_businesses in default
          max_outlets: 1,
          max_products: 100,
          max_employees: 5,
        };

        // ✅ DEBUG: Log plan features from API (development only)
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 Plan Features from API:', {
            raw: response.data.plan_features,
            processed: planFeatures,
            max_businesses: planFeatures.max_businesses,
            has_self_service_access: planFeatures.has_self_service_access,
          });
        }

        setSubscriptionFeatures(planFeatures);
        // Cache features to localStorage
        localStorage.setItem(
          'subscriptionFeatures',
          JSON.stringify(planFeatures)
        );

        // ✅ CRITICAL: Use helper to set cache
        const cacheSet = setSubscriptionCache(isActuallyActive);

        console.log('✅ Subscription status:', {
          isActuallyActive,
          cacheSet,
          verified: getSubscriptionCache(),
          planFeatures,
          has_self_service_access: planFeatures.has_self_service_access,
        });

        return isActuallyActive;
      } catch (error) {
        // ✅ FIX: 404 untuk subscription/current adalah normal jika user belum punya subscription
        // Jangan log sebagai error atau tampilkan notifikasi
        const is404 = error.response?.status === 404;
        const isSubscriptionEndpoint = error.config?.url?.includes(
          '/subscriptions/current'
        );

        if (is404 && isSubscriptionEndpoint) {
          // Normal case: user belum punya subscription
          console.log(
            'ℹ️ No subscription found (404) - this is normal for new users'
          );
          setHasActiveSubscription(false);
          setIsPendingPayment(false);
          setSubscriptionLoading(false);
          setSubscriptionCache(false);
          return false;
        }

        const isTimeout =
          error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        if (isTimeout) {
          const cachedStatus = getSubscriptionCache();
          const shouldAssumeActive = cachedStatus || cachedStatus === null;

          if (shouldAssumeActive) {
            setHasActiveSubscription(true);
            setSubscriptionLoading(false);
            setSubscriptionCache(true);
            return true;
          }
        }

        // ✅ FIX: Jangan log error untuk subscription check yang gagal (bisa spam console)
        if (!is404 || !isSubscriptionEndpoint) {
          console.log('⚠️ Subscription check error:', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.message,
          });
        }

        setHasActiveSubscription(false);
        setIsPendingPayment(false);
        setSubscriptionLoading(false);
        setSubscriptionCache(false);
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, hasActiveSubscription] // subscriptionLoading intentionally excluded to prevent infinite loop
  );

  // Load outlets
  const loadOutlets = useCallback(async () => {
    console.log(
      '🔍 loadOutlets called, business:',
      currentBusiness?.id,
      'user role:',
      user?.role
    );

    // ✅ FIX: Don't load outlets if no business is selected
    if (!currentBusiness) {
      console.log('🔍 No business selected, skipping outlet loading');
      setOutlets([]);
      setCurrentOutlet(null);
      // ✅ FIX: Clear saved outlet ID if no business
      localStorage.removeItem('currentOutletId');
      return;
    }

    // ✅ FIX: Validate that currentBusiness belongs to user
    // Check if business is in user's businesses list
    if (businesses.length > 0) {
      const businessBelongsToUser = businesses.some(
        b => b.id === currentBusiness.id
      );
      if (!businessBelongsToUser) {
        console.log(
          '⚠️ loadOutlets: Current business does not belong to user, clearing outlets'
        );
        setOutlets([]);
        setCurrentOutlet(null);
        localStorage.removeItem('currentOutletId');
        localStorage.removeItem('currentBusinessId');
        return;
      }
    }

    // ✅ FIX: Add timeout to prevent stuck loading
    const OUTLET_LOAD_TIMEOUT = 20000; // 20 seconds timeout (increased for slow connections)

    try {
      // For kasir role, load only assigned outlets
      if (user?.role === 'kasir') {
        // ✅ FIX: Add timeout wrapper to prevent stuck
        const loadPromise = employeeOutletService.getMyOutlets();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error('Outlet load timeout')),
            OUTLET_LOAD_TIMEOUT
          );
        });

        const result = await Promise.race([loadPromise, timeoutPromise]);

        if (result.success && result.data) {
          // Extract outlet data from assignments
          const assignedOutlets = result.data.map(
            assignment => assignment.outlet
          );
          setOutlets(assignedOutlets);
          // ✅ FIX: Cache outlets to localStorage for instant load on reload
          localStorage.setItem('outlets', JSON.stringify(assignedOutlets));

          // ✅ FIX: Clear old cached outlet first to prevent stale data
          const cachedOutlet = localStorage.getItem('currentOutlet');
          if (cachedOutlet) {
            try {
              const parsedCachedOutlet = JSON.parse(cachedOutlet);
              // Validate cached outlet exists in assigned outlets
              const cachedOutletExists = assignedOutlets.find(
                o => o.id === parsedCachedOutlet.id
              );
              if (!cachedOutletExists) {
                console.log(
                  '⚠️ Cached outlet not found in assigned outlets, clearing cache'
                );
                localStorage.removeItem('currentOutlet');
                localStorage.removeItem('currentOutletId');
              }
            } catch (e) {
              console.warn('Error parsing cached outlet, clearing:', e);
              localStorage.removeItem('currentOutlet');
              localStorage.removeItem('currentOutletId');
            }
          }

          // Check if there's a saved outlet ID
          const savedOutletId = localStorage.getItem('currentOutletId');
          console.log('🔍 loadOutlets: Saved outlet ID:', savedOutletId);

          if (savedOutletId) {
            const savedOutlet = assignedOutlets.find(
              outlet => outlet.id == savedOutletId
            );
            if (savedOutlet) {
              setCurrentOutlet(savedOutlet);
              // ✅ FIX: Cache current outlet to localStorage for instant load on reload
              localStorage.setItem(
                'currentOutlet',
                JSON.stringify(savedOutlet)
              );
              console.log(
                '🔍 loadOutlets: Restored assigned outlet from localStorage:',
                savedOutlet.name
              );
            } else {
              // ✅ FIX: Saved outlet ID not found, clear cache and use primary/first outlet
              console.log(
                '⚠️ loadOutlets: Saved outlet ID not found in assigned outlets, clearing cache'
              );
              localStorage.removeItem('currentOutletId');
              localStorage.removeItem('currentOutlet');
              // Use primary outlet or first available
              const primaryAssignment = result.data.find(
                assignment => assignment.is_primary
              );
              const fallbackOutlet =
                primaryAssignment?.outlet || assignedOutlets[0];
              if (fallbackOutlet) {
                setCurrentOutlet(fallbackOutlet);
                localStorage.setItem('currentOutletId', fallbackOutlet.id);
                // ✅ FIX: Cache current outlet to localStorage for instant load on reload
                localStorage.setItem(
                  'currentOutlet',
                  JSON.stringify(fallbackOutlet)
                );
                console.log(
                  '🔍 loadOutlets: Using primary/fallback outlet:',
                  fallbackOutlet.name
                );
              }
            }
          } else if (assignedOutlets.length > 0) {
            // Auto-select primary outlet or first available
            const primaryAssignment = result.data.find(
              assignment => assignment.is_primary
            );
            const selectedOutlet =
              primaryAssignment?.outlet || assignedOutlets[0];
            setCurrentOutlet(selectedOutlet);
            localStorage.setItem('currentOutletId', selectedOutlet.id);
            // ✅ FIX: Cache current outlet to localStorage for instant load on reload
            localStorage.setItem(
              'currentOutlet',
              JSON.stringify(selectedOutlet)
            );
            console.log(
              '🔍 loadOutlets: Auto-selecting primary/first assigned outlet:',
              selectedOutlet.name
            );
          }
        } else {
          setOutlets([]);
          setCurrentOutlet(null);
        }
      } else {
        // For other roles (owner, admin, etc), load all outlets for current business
        // ✅ FIX: Skip loading outlets if no business ID (e.g., after payment, before business setup)
        const businessId = localStorage.getItem('currentBusinessId');
        if (!businessId) {
          setOutlets([]);
          setCurrentOutlet(null);
          return;
        }

        // ✅ FIX: Add timeout wrapper to prevent stuck
        const loadPromise = outletService.getAll();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error('Outlet load timeout')),
            OUTLET_LOAD_TIMEOUT
          );
        });

        const result = await Promise.race([loadPromise, timeoutPromise]);
        console.log('🔍 loadOutlets: All outlets result:', result);

        // ✅ FIX: Handle timeout or network error from outletService
        if (result.isTimeout || result.isNetworkError) {
          const errorType = result.isTimeout ? 'Timeout' : 'Network Error';
          console.warn(`⏱️ loadOutlets: ${errorType} from outletService - using cached outlet if available`);
          const cachedOutlet = localStorage.getItem('currentOutlet');
          if (cachedOutlet) {
            try {
              const parsed = JSON.parse(cachedOutlet);
              setCurrentOutlet(parsed);
              // Try to use cached outlets if available
              const cachedOutlets = localStorage.getItem('outlets');
              if (cachedOutlets) {
                try {
                  const parsedOutlets = JSON.parse(cachedOutlets);
                  setOutlets(parsedOutlets);
                  console.log(`✅ Using cached outlets due to ${errorType.toLowerCase()}`);
                } catch (e) {
                  console.warn('Error parsing cached outlets:', e);
                }
              }
              return;
            } catch (e) {
              console.warn('Error parsing cached outlet:', e);
            }
          }
          setOutlets([]);
          setCurrentOutlet(null);
          return;
        }

        if (
          result.success &&
          Array.isArray(result.data) &&
          result.data.length > 0
        ) {
          setOutlets(result.data);
          // ✅ FIX: Cache outlets to localStorage for instant load on reload
          localStorage.setItem('outlets', JSON.stringify(result.data));

          // ✅ FIX: Clear old cached outlet first to prevent stale data
          const cachedOutlet = localStorage.getItem('currentOutlet');
          if (cachedOutlet) {
            try {
              const parsedCachedOutlet = JSON.parse(cachedOutlet);
              // Validate cached outlet exists in new outlets list
              const cachedOutletExists = result.data.find(
                o => o.id === parsedCachedOutlet.id
              );
              if (!cachedOutletExists) {
                console.log(
                  '⚠️ Cached outlet not found in new outlets, clearing cache'
                );
                localStorage.removeItem('currentOutlet');
                localStorage.removeItem('currentOutletId');
              }
            } catch (e) {
              console.warn('Error parsing cached outlet, clearing:', e);
              localStorage.removeItem('currentOutlet');
              localStorage.removeItem('currentOutletId');
            }
          }

          // Check if there's a saved outlet ID
          const savedOutletId = localStorage.getItem('currentOutletId');
          console.log('🔍 loadOutlets: Saved outlet ID:', savedOutletId);

          if (savedOutletId) {
            const outlet = result.data.find(
              o => o.id === parseInt(savedOutletId)
            );
            if (outlet) {
              setCurrentOutlet(outlet);
              // ✅ FIX: Cache current outlet to localStorage for instant load on reload
              localStorage.setItem('currentOutlet', JSON.stringify(outlet));
            } else {
              // ✅ FIX: Saved outlet ID not found, clear cache and use first outlet
              localStorage.removeItem('currentOutletId');
              localStorage.removeItem('currentOutlet');
              if (result.data.length > 0) {
                setCurrentOutlet(result.data[0]);
                localStorage.setItem('currentOutletId', result.data[0].id);
                localStorage.setItem(
                  'currentOutlet',
                  JSON.stringify(result.data[0])
                );
              }
            }
          } else if (result.data.length > 0) {
            // Auto-select first outlet for non-kasir roles
            setCurrentOutlet(result.data[0]);
            localStorage.setItem('currentOutletId', result.data[0].id);
            // ✅ FIX: Cache current outlet to localStorage for instant load on reload
            localStorage.setItem(
              'currentOutlet',
              JSON.stringify(result.data[0])
            );
          }
        } else {
          setOutlets([]);
          setCurrentOutlet(null);
        }
      }
    } catch (error) {
      // ✅ FIX: Handle timeout gracefully - use cache if available
      if (error.message === 'Outlet load timeout') {
        console.warn(
          '⏱️ loadOutlets: Timeout - using cached outlet if available'
        );
        const cachedOutlet = localStorage.getItem('currentOutlet');

        if (cachedOutlet) {
          try {
            const parsed = JSON.parse(cachedOutlet);
            setCurrentOutlet(parsed);
            // Don't set outlets array - let it be empty, but at least we have current outlet
            return;
          } catch (e) {
            console.warn('Error parsing cached outlet:', e);
          }
        }

        // If no cache, set empty and continue
        console.log(
          '⚠️ loadOutlets: Timeout and no cache, setting empty outlets'
        );
        setOutlets([]);
        setCurrentOutlet(null);
        return;
      }

      // ✅ FIX: Ignore 403/404 errors if no business ID (expected behavior)
      if (error.response?.status === 403 || error.response?.status === 404) {
        const businessId = localStorage.getItem('currentBusinessId');
        if (!businessId) {
          // Expected - user hasn't created business yet
          console.log('🔍 loadOutlets: No business ID, skipping outlet load');
          setOutlets([]);
          setCurrentOutlet(null);
          return;
        }
        // If we have business ID but still get 404, might be no outlets yet
        if (error.response?.status === 404 && businessId) {
          console.log('🔍 loadOutlets: No outlets found for business (404)');
          setOutlets([]);
          setCurrentOutlet(null);
          // ✅ FIX: Try to use cached outlet if available (might be stale but better than nothing)
          const cachedOutlet = localStorage.getItem('currentOutlet');
          if (cachedOutlet) {
            try {
              const parsed = JSON.parse(cachedOutlet);
              // Only use if business ID matches
              if (parsed.business_id === parseInt(businessId)) {
                console.log('✅ Using cached outlet despite 404:', parsed.name);
                setCurrentOutlet(parsed);
              }
            } catch (e) {
              console.warn('Error parsing cached outlet:', e);
            }
          }
          return;
        }
      }

      // ✅ FIX: For other errors, try to use cached outlet if available
      console.error('❌ loadOutlets error:', error);
      const cachedOutlet = localStorage.getItem('currentOutlet');
      const businessId = localStorage.getItem('currentBusinessId');
      if (cachedOutlet && businessId) {
        try {
          const parsed = JSON.parse(cachedOutlet);
          // Only use if business ID matches
          if (parsed.business_id === parseInt(businessId)) {
            console.log('✅ Using cached outlet due to error:', parsed.name);
            setCurrentOutlet(parsed);
            // Don't clear outlets array - keep cached outlets
            return;
          }
        } catch (e) {
          console.warn('Error parsing cached outlet:', e);
        }
      }

      // ✅ FIX: Ignore CanceledError
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log(
          '🔍 loadOutlets: Request cancelled (duplicate), ignoring...'
        );
        return;
      }

      // ✅ FIX: Final fallback - log error and clear outlets
      console.error('❌ Error loading outlets:', error);
      console.error('❌ Outlet error details:', {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url,
      });

      // If we reach here, all error handling above failed, so clear outlets
      console.log('🔍 loadOutlets: Setting empty outlets array due to error');
      setOutlets([]);
      setCurrentOutlet(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness, user?.role]); // businesses and user.id intentionally excluded

  // Load businesses
  const loadBusinesses = useCallback(
    async (userToLoad = null, forceRefresh = false) => {
      const currentUser = userToLoad || user;
      console.log(
        '🔍 loadBusinesses called, user:',
        currentUser?.id,
        currentUser?.role,
        'forceRefresh:',
        forceRefresh
      );

      // Don't load businesses if no user is authenticated
      if (!currentUser) {
        console.log('🔍 No user authenticated, skipping business loading');
        return;
      }

      setBusinessLoading(true);

      try {
        // ✅ FIX: Clear cache if explicitly requested (e.g., after creating business)
        // This ensures fresh data is loaded
        if (forceRefresh) {
          console.log('🔄 loadBusinesses: Clearing cache for fresh data...');
          localStorage.removeItem('businesses');
          localStorage.removeItem('currentBusiness');
        }

        // ✅ OPTIMIZATION: Use cache for faster loading (unless force refresh)
        const result = await businessService.getAll(!forceRefresh);

        // ✅ FIX: Skip if request was cancelled (duplicate prevention)
        if (result && result.cancelled) {
          console.log('🔍 loadBusinesses: Request was cancelled, skipping...');
          setBusinessLoading(false);
          return;
        }

        if (
          result.success &&
          Array.isArray(result.data) &&
          result.data.length > 0
        ) {
          // ✅ FIX: For employee roles (kasir, kitchen, waiter, admin), trust backend response
          // Backend already filters businesses where user is an employee
          const currentUser = userToLoad || user;
          const isEmployee = ['kasir', 'kitchen', 'waiter', 'admin'].includes(
            currentUser?.role
          );

          let validBusinesses = result.data;

          // Only validate ownership for owner/super_admin roles
          if (!isEmployee) {
            validBusinesses = result.data.filter(business => {
              const businessOwnerId = business.owner_id || business.owner?.id;
              const businessOwnerEmail =
                business.owner?.email || business.owner_email || business.email;
              const userId = currentUser?.id;
              const userEmail = currentUser?.email;

              // ✅ FIX: Business is valid if owner_id matches OR owner email matches
              // ✅ FIX: Also check if business is in business_users table (for shared businesses)
              const idMatch =
                businessOwnerId &&
                userId &&
                parseInt(businessOwnerId) === parseInt(userId);
              const emailMatch =
                businessOwnerEmail &&
                userEmail &&
                businessOwnerEmail.toLowerCase() === userEmail.toLowerCase();

              // ✅ FIX: If no match found, still include business if it's in the result
              // (backend already filtered it, so trust the backend response)
              // This fixes issue where email case mismatch causes business to disappear
              if (!idMatch && !emailMatch) {
                console.warn(
                  '⚠️ Business validation: No match found, but trusting backend response',
                  {
                    businessId: business.id,
                    businessName: business.name,
                    businessOwnerId,
                    businessOwnerEmail,
                    userId,
                    userEmail,
                  }
                );
                // Trust backend - if backend returned it, user has access
                return true;
              }

              return idMatch || emailMatch;
            });
          }

          if (validBusinesses.length === 0) {
            console.warn(
              '⚠️ loadBusinesses: No valid businesses found for user, clearing cache'
            );
            localStorage.removeItem('businesses');
            localStorage.removeItem('currentBusiness');
            localStorage.removeItem('currentBusinessId');
            setBusinesses([]);
            setCurrentBusiness(null);
            setBusinessLoading(false);
            return;
          }

          setBusinesses(validBusinesses);
          // ✅ OPTIMIZATION: Cache businesses for instant load on refresh
          localStorage.setItem('businesses', JSON.stringify(validBusinesses));
          console.log('🔍 loadBusinesses: Businesses set:', validBusinesses);

          // ✅ FIX: Check if there's a saved business ID, but validate it belongs to user
          const savedBusinessId = localStorage.getItem('currentBusinessId');
          console.log('🔍 loadBusinesses: Saved business ID:', savedBusinessId);

          if (savedBusinessId) {
            const business = validBusinesses.find(
              b => b.id === parseInt(savedBusinessId)
            );
            if (business) {
              // ✅ FIX: Validate business belongs to user (should be in validBusinesses already, but double check)
              console.log('🔍 loadBusinesses: Found saved business:', business);
              console.log(
                '🔍 loadBusinesses: Business type:',
                business.business_type
              );
              console.log(
                '🔍 loadBusinesses: Business type ID:',
                business.business_type_id
              );
              // ✅ FIX: Log subscription_info untuk debug
              console.log(
                '🔍 loadBusinesses: Subscription info:',
                business.subscription_info
              );
              setCurrentBusiness(business);
              // ✅ OPTIMIZATION: Cache current business for instant load on refresh
              localStorage.setItem('currentBusiness', JSON.stringify(business));
            } else {
              // ✅ FIX: Saved business ID doesn't belong to user, clear it and use first business
              console.log(
                '⚠️ loadBusinesses: Saved business ID does not belong to user, clearing and using first business'
              );
              localStorage.removeItem('currentBusinessId');
              localStorage.removeItem('currentBusiness');
              if (validBusinesses.length > 0) {
                setCurrentBusiness(validBusinesses[0]);
                localStorage.setItem(
                  'currentBusinessId',
                  validBusinesses[0].id
                );
                // ✅ OPTIMIZATION: Cache current business
                localStorage.setItem(
                  'currentBusiness',
                  JSON.stringify(validBusinesses[0])
                );
              }
            }
          } else if (validBusinesses.length > 0) {
            // Auto-select first business
            console.log('🔍 loadBusinesses: Auto-selecting first business');
            console.log(
              '🔍 loadBusinesses: Business type:',
              validBusinesses[0].business_type
            );
            setCurrentBusiness(validBusinesses[0]);
            localStorage.setItem('currentBusinessId', validBusinesses[0].id);
            // ✅ OPTIMIZATION: Cache current business
            localStorage.setItem(
              'currentBusiness',
              JSON.stringify(validBusinesses[0])
            );
          }

          // ✅ IMPORTANT: Force refresh subscription after loading businesses
          // This ensures subscription status is updated (e.g. after auto-activation)
          console.log(
            '🔍 loadBusinesses: Force refreshing subscription status...'
          );
          await checkSubscription(currentUser, true);

          setBusinessLoading(false);
          console.log('🔍 loadBusinesses: Completed successfully');
        } else {
          // Fallback: coba ambil current business jika list kosong/failed (khusus employee)
          console.log(
            '🔍 loadBusinesses: Fallback getCurrent (empty array or failed)...'
          );
          try {
            const currentRes = await businessService.getCurrent();
            console.log('🔍 loadBusinesses: getCurrent result:', currentRes);
            // Handle 200 response with success: false (no business found) - this is normal
            if (currentRes && currentRes.success && currentRes.data) {
              const businessObj = Array.isArray(currentRes.data)
                ? currentRes.data[0]
                : currentRes.data;
              if (businessObj) {
                setBusinesses([businessObj]);
                setCurrentBusiness(businessObj);
                localStorage.setItem('currentBusinessId', businessObj.id);
                // ✅ OPTIMIZATION: Cache businesses and current business
                localStorage.setItem(
                  'businesses',
                  JSON.stringify([businessObj])
                );
                localStorage.setItem(
                  'currentBusiness',
                  JSON.stringify(businessObj)
                );

                // ✅ Force refresh subscription in fallback path too
                console.log(
                  '🔍 loadBusinesses (fallback): Force refreshing subscription status...'
                );
                await checkSubscription(currentUser, true);

                setBusinessLoading(false);
                console.log(
                  '🔍 loadBusinesses: Fallback assigned business:',
                  businessObj
                );
                return;
              }
            }
          } catch (error) {
            // Silently ignore 404 or "no business" errors - this is expected for new users
            console.log(
              '🔍 loadBusinesses: getCurrent returned no business (this is normal for new users)'
            );
          }
          // ✅ FIX: Check if result exists before accessing result.error
          if (result && result.error) {
            console.error('❌ Failed to load businesses:', result.error);
          } else {
            console.log(
              '🔍 loadBusinesses: No businesses found (this is normal for new users or employees)'
            );
          }
          console.log(
            '🔍 loadBusinesses: Setting empty businesses array (not logging out)'
          );
          // Don't logout for business loading failure, just set empty array
          setBusinesses([]);
          setBusinessLoading(false);
        }
      } catch (error) {
        console.error('❌ Error loading businesses:', error);
        console.error('❌ Business error details:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        console.log(
          '🔍 loadBusinesses: Setting empty businesses array due to error (not logging out)'
        );
        // Don't logout for business loading failure, just set empty array
        setBusinesses([]);
        setBusinessLoading(false);
      }
    },
    [user, checkSubscription]
  );

  // ✅ FIX: Initialize outlet ID from cache on mount
  useEffect(() => {
    if (cachedCurrentOutlet && cachedCurrentOutlet.id) {
      // Set outlet ID immediately from cache
      const savedOutletId = localStorage.getItem('currentOutletId');
      if (savedOutletId !== String(cachedCurrentOutlet.id)) {
        localStorage.setItem('currentOutletId', cachedCurrentOutlet.id);
        console.log(
          '✅ Initialized outlet ID from cache:',
          cachedCurrentOutlet.id
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Load outlets when currentBusiness changes
  useEffect(() => {
    // ✅ FIX: Load outlets whenever business is selected and outlets are empty or business changed
    if (currentBusiness && currentBusiness.id && user) {
      const savedBusinessId = localStorage.getItem('currentBusinessId');
      // Load if business ID changed, or if outlets are empty (first load)
      if (
        !savedBusinessId ||
        savedBusinessId !== String(currentBusiness.id) ||
        outlets.length === 0
      ) {
        console.log(
          '🔍 currentBusiness changed or outlets empty, loading outlets...'
        );
        loadOutlets();
      } else if (cachedOutlets.length > 0 && !currentOutlet) {
        // ✅ FIX: If we have cached outlets but no current outlet, try to restore from cache
        const savedOutletId = localStorage.getItem('currentOutletId');
        if (savedOutletId) {
          const cachedOutlet = cachedOutlets.find(
            o => o.id === parseInt(savedOutletId)
          );
          if (cachedOutlet) {
            console.log('✅ Restoring outlet from cache:', cachedOutlet.name);
            setCurrentOutlet(cachedOutlet);
            localStorage.setItem('currentOutlet', JSON.stringify(cachedOutlet));
          }
        } else if (cachedOutlets.length > 0) {
          // Use first cached outlet if no saved outlet ID
          console.log('✅ Using first cached outlet:', cachedOutlets[0].name);
          setCurrentOutlet(cachedOutlets[0]);
          localStorage.setItem('currentOutletId', cachedOutlets[0].id);
          localStorage.setItem(
            'currentOutlet',
            JSON.stringify(cachedOutlets[0])
          );
        }
      }
    } else if (!currentBusiness && user) {
      // ✅ FIX: Clear outlets if no business
      setOutlets([]);
      setCurrentOutlet(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, user?.id, loadOutlets]); // currentBusiness, outlets.length, user intentionally excluded to prevent infinite loop

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      // ✅ FIX: Check localStorage directly in case token state hasn't updated yet
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const tokenToUse = token || storedToken;

      // ✅ FIX: If we have cached user and token, set user immediately (before API call)
      // This prevents redirect during reload
      if (storedUser && tokenToUse && !user) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          if (!token) {
            setToken(tokenToUse);
          }
        } catch (e) {
          console.warn('Failed to parse cached user:', e);
        }
      }

      // Only proceed if we have a token
      if (!tokenToUse) {
        setLoading(false);
        // ✅ CRITICAL: Set cache to false if no token
        setSubscriptionCache(false);
        setInitialLoadComplete(true);
        return;
      }

      // ✅ FIX: Use stored token if state token is null
      if (!token && storedToken) {
        setToken(storedToken);
        // ✅ CRITICAL: Set axios header immediately
        axios.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${storedToken}`;
      }

      // ✅ CRITICAL: Ensure token is set in axios headers before making API call
      const finalToken = token || storedToken;
      if (finalToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${finalToken}`;
      }

      // ✅ CRITICAL FIX: If we have cached user, verify cache exists FIRST
      if (user && user.id) {
        // ✅ CRITICAL: Ensure business ID is set before any API calls
        // This prevents 403 errors when API calls are made
        if (currentBusiness && currentBusiness.id) {
          localStorage.setItem('currentBusinessId', currentBusiness.id);
        }

        // ✅ STEP 1: Verify subscription cache exists
        const cachedSub = getSubscriptionCache();

        // ✅ STEP 2: If cache exists and is TRUE, use it IMMEDIATELY (no API call)
        // CRITICAL: Set state IMMEDIATELY so ProtectedRoute can use it
        // CRITICAL: This must happen BEFORE setInitialLoadComplete to prevent redirect
        if (cachedSub) {
          console.log(
            '✅ Using cached subscription status (TRUE), skipping API call'
          );
          // ✅ CRITICAL: Set cache FIRST (before state) to ensure ProtectedRoute sees it
          setSubscriptionCache(true);
          setHasActiveSubscription(true);
          setSubscriptionLoading(false);
          // Cache already set, no need to check API
        } else if (!hasActiveSubscription) {
          // Only check if cache is FALSE or missing
          console.log(
            '⚠️ Cache missing or false, checking subscription IMMEDIATELY...'
          );
          setSubscriptionLoading(true);

          try {
            const subscriptionResult = await checkSubscription(user, true);
            console.log('✅ Subscription check complete:', subscriptionResult);

            // ✅ CRITICAL: Set cache IMMEDIATELY after check
            setSubscriptionCache(subscriptionResult);
            setHasActiveSubscription(subscriptionResult);
          } catch (err) {
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
              console.log('Subscription check cancelled');
              setSubscriptionLoading(false);
            } else {
              console.warn('Subscription check failed:', err);
              // ✅ On error, use cache if available, otherwise set to false
              const fallbackCache = getSubscriptionCache();
              if (fallbackCache) {
                setHasActiveSubscription(true);
              } else {
                setSubscriptionCache(false);
                setHasActiveSubscription(false);
              }
              setSubscriptionLoading(false);
            }
          }
        }

        // ✅ STEP 3: NOW set initial load complete (after cache is verified/set)
        // CRITICAL: Ensure cache is set BEFORE initialLoadComplete to prevent redirect
        // Double-check cache is set
        const finalCacheCheck = getSubscriptionCache();
        if (finalCacheCheck) {
          setSubscriptionCache(true); // Ensure it's set
        }

        setLoading(false);
        window.__initialLoadTime = Date.now();
        setInitialLoadComplete(true);

        // ✅ OPTIMIZATION: Refresh user data in background (non-blocking)
        // This ensures data is fresh but doesn't block UI
        // ✅ FIX: Only refresh if token exists
        if (token) {
          apiClient
            .get('/user', { timeout: 5000 })
            .then(response => {
              const freshUserData = response.data;
              if (freshUserData && freshUserData.id) {
                setUser(freshUserData);
                localStorage.setItem('user', JSON.stringify(freshUserData));
                localStorage.setItem('userId', freshUserData.id);
              }
            })
            .catch(err => {
              // ✅ FIX: Only log non-cancelled errors
              if (
                err?.name !== 'CanceledError' &&
                err?.code !== 'ERR_CANCELED' &&
                err?.message !== 'No token available'
              ) {
                // Silently fail - we already have cached data
              }
            });
        }

        // ✅ STEP 4: Load other data in background (only if token exists)
        if (token) {
          setTimeout(() => {
            Promise.allSettled([
              loadBusinesses(user).catch(err => {
                // ✅ FIX: Ignore CanceledError and No token errors
                if (
                  err.name === 'CanceledError' ||
                  err.code === 'ERR_CANCELED' ||
                  err.message === 'No token available'
                ) {
                  return null;
                }
                return null;
              }),
              // ✅ SKIP profile check if cache exists (prevent rate limit)
              (function () {
                const cachedProfile = localStorage.getItem('profileComplete');
                const cachedWhatsapp = localStorage.getItem('whatsappVerified');

                if (cachedProfile === 'true' && cachedWhatsapp === 'true') {
                  console.log(
                    '⏭️ Using cached profile status, skipping API call'
                  );
                  setProfileComplete(true);
                  setWhatsappVerified(true);
                  return Promise.resolve();
                }

                // ✅ FIX: Only check profile if token exists
                if (!token) {
                  return Promise.resolve();
                }

                return checkProfileStatus().catch(err => {
                  // ✅ FIX: Ignore No token errors
                  if (err?.message === 'No token available') {
                    return null;
                  }
                  return null;
                });
              })(),
            ])
              .then(results => {
                // ✅ FIX: Filter out CanceledError and No token errors from results
                results.forEach(result => {
                  if (result.status === 'rejected') {
                    const error = result.reason;
                    if (
                      error?.name === 'CanceledError' ||
                      error?.code === 'ERR_CANCELED' ||
                      error?.message === 'No token available'
                    ) {
                      // Silently ignore CanceledError and No token errors
                      return;
                    }
                    // Log other errors
                    console.error('Background refresh failed:', error);
                  }
                });
              })
              .catch(() => null);
          }, 500);
        }

        return;
      }

      // ✅ If no cached user but we have token, load from API
      setLoading(true);

      try {
        // ✅ FIX: Use stored token if state token is null
        const tokenToUse = token || localStorage.getItem('token');
        if (tokenToUse) {
          axios.defaults.headers.common[
            'Authorization'
          ] = `Bearer ${tokenToUse}`;
        }
        const response = await apiClient.get('/user', { timeout: 5000 });
        const userData = response.data;

        if (userData && userData.id) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('userId', userData.id);

          // ✅ CRITICAL: Ensure business ID is set if we have cached business
          if (currentBusiness && currentBusiness.id) {
            localStorage.setItem('currentBusinessId', currentBusiness.id);
          }

          // ✅ CRITICAL: Check subscription IMMEDIATELY before setting initialLoadComplete
          console.log(
            '🔍 checkAuth: Checking subscription for new user data...'
          );
          setSubscriptionLoading(true);

          try {
            const subscriptionResult = await checkSubscription(userData, true);
            console.log('✅ Subscription check result:', subscriptionResult);

            // ✅ CRITICAL: Set cache IMMEDIATELY
            setSubscriptionCache(subscriptionResult);
            setHasActiveSubscription(subscriptionResult);
          } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
              console.warn('Subscription check failed:', err);
              setSubscriptionCache(false);
            }
          } finally {
            setSubscriptionLoading(false);
          }

          // ✅ NOW set initial load complete
          setLoading(false);
          window.__initialLoadTime = Date.now();
          setInitialLoadComplete(true);

          // ✅ OPTIMIZATION: Load other data IMMEDIATELY in parallel (not in setTimeout)
          // This ensures data is available as soon as possible
          Promise.allSettled([
            loadBusinesses(userData)
              .then(() => {
                // ✅ OPTIMIZATION: After businesses loaded, prefetch critical data
                // Use setTimeout to ensure business state is updated
                setTimeout(() => {
                  const businessId = localStorage.getItem('currentBusinessId');
                  const outletId = localStorage.getItem('currentOutletId');
                  if (businessId) {
                    console.log(
                      '🚀 Prefetching critical data after checkAuth...'
                    );
                    prefetchCriticalData(
                      parseInt(businessId),
                      outletId ? parseInt(outletId) : null
                    ).catch(() => null);
                  }
                }, 200);
              })
              .catch(() => null),
            checkProfileStatus().catch(() => null),
          ]).catch(() => null);
        } else {
          throw new Error('Invalid user data received');
        }
      } catch (error) {
        if (
          error.code === 'ECONNABORTED' ||
          error.message?.includes('timeout')
        ) {
          console.log('⏱️ Auth check timeout');
          setLoading(false);
          setInitialLoadComplete(true);
          return;
        }

        if (
          error.message?.includes('WebSocket') ||
          error.message?.includes('socket')
        ) {
          console.log('🔌 Ignoring WebSocket error');
          setLoading(false);
          setInitialLoadComplete(true);
          return;
        }

        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('❌ Auth error (401/403), logging out');
          logout();
          setLoading(false);
          setInitialLoadComplete(true);
        } else {
          // ✅ FIX: If token exists but checkAuth failed (network error, etc),
          // don't immediately set initialLoadComplete - wait a bit and retry
          // OR if we have cached user, use it
          const storedToken = localStorage.getItem('token');
          const cachedUser = getCachedUser();

          if (storedToken && cachedUser) {
            console.log(
              '⚠️ Auth check failed but token exists, using cached user'
            );
            setUser(cachedUser);
            setLoading(false);
            setInitialLoadComplete(true);

            // Retry auth check in background
            setTimeout(() => {
              checkAuth().catch(() => null);
            }, 1000);
          } else if (storedToken) {
            console.log('⚠️ Auth check failed but token exists, will retry');
            // Don't set initialLoadComplete yet - wait for retry
            // But set a timeout to prevent infinite loading
            setTimeout(() => {
              setLoading(false);
              setInitialLoadComplete(true);
            }, 3000);

            // Retry auth check
            setTimeout(() => {
              checkAuth().catch(() => {
                // If retry also fails, then logout
                console.log('❌ Auth retry failed, logging out');
                logout();
              });
            }, 500);
          } else {
            console.error('❌ Auth check failed, no token found');
            setLoading(false);
            setInitialLoadComplete(true);
          }
        }
      }
    };

    console.log('🔍 AuthProvider: useEffect checkAuth - calling checkAuth()');
    checkAuth().catch(err => {
      console.error('❌ checkAuth error:', err);
    });

    // ✅ OPTIMIZATION: Reduce fallback timeout for faster failure detection
    const fallbackTimeout = setTimeout(() => {
      console.log('⏱️ AuthProvider: Fallback timeout reached');
      setLoading(false);
      setInitialLoadComplete(true);
    }, 6000); // ✅ OPTIMIZATION: Reduced from 10s to 6s for faster loading

    return () => {
      clearTimeout(fallbackTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ FIX: Run only once on mount - intentionally empty deps to prevent infinite loop

  // ✅ DEBUG: Log when useEffect runs
  console.log('🔍 AuthProvider: useEffect for checkAuth registered');

  // Switch business
  const switchBusiness = business => {
    setCurrentBusiness(business);
    localStorage.setItem('currentBusinessId', business.id);
    // ✅ OPTIMIZATION: Cache current business for instant load on refresh
    localStorage.setItem('currentBusiness', JSON.stringify(business));
  };

  const login = async (email, password) => {
    try {
      // ✅ SECURITY: Only log non-sensitive data for debugging (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 Login request:', {
          email,
          hasPassword: !!password,
          passwordLength: password?.length || 0,
        });
      }

      // ✅ FIX: Validate input before sending
      if (!email || !password) {
        throw new Error('Email dan password harus diisi');
      }

      if (!email.includes('@')) {
        throw new Error('Format email tidak valid');
      }

      // ✅ FIX: Trim and normalize email (lowercase) to match backend validation
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        throw new Error('Email tidak boleh kosong');
      }

      if (!password || password.length === 0) {
        throw new Error('Password tidak boleh kosong');
      }

      // ✅ SECURITY: Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 Sending login request to:', '/login');
        console.log('🔑 API Base URL:', API_CONFIG.BASE_URL);
        console.log('🔑 Request payload:', {
          email: trimmedEmail,
          hasPassword: !!password,
          passwordLength: password.length,
        });
      }

      // ✅ FIX: Use longer timeout for login (30 seconds) to handle slow backend
      const response = await apiClient.post(
        '/login',
        {
          email: trimmedEmail,
          password: password,
        },
        {
          timeout: 30000, // 30 seconds for login
        }
      );

      console.log('✅ Login response received:', {
        status: response.status,
        hasUser: !!response.data?.user,
        hasToken: !!response.data?.token,
      });

      const {
        user: userData,
        token: newToken,
        employee_business,
        owner_subscription_status,
        subscription_status, // ✅ FIX: Subscription status for owner/super_admin
      } = response.data;

      console.log('🔑 Login response:', {
        user: userData,
        role: userData?.role,
        hasEmployeeBusiness: !!employee_business,
        employeeBusiness: employee_business,
        ownerSubscriptionStatus: owner_subscription_status,
        subscriptionStatus: subscription_status, // ✅ FIX: Log subscription status
      });
      console.log('🔑 Login response - user name:', userData?.name);
      console.log('🔑 Login response - user email:', userData?.email);

      // ✅ CRITICAL FIX: ALWAYS clear ALL cache on login to prevent data leakage
      // This ensures data from previous user/login session is completely removed
      // Even if same user logs in again, we want fresh data from server
      console.log('🧹 Clearing ALL cache on login to ensure clean data...');

      // ✅ CRITICAL: Clear React Query cache completely
      console.log('🧹 Clearing React Query cache...');
      queryClient.clear();
      queryClient.removeQueries();
      queryClient.resetQueries();

      // ✅ CRITICAL: Clear ALL localStorage items (except system items)
      // This ensures no data from previous session leaks to new session
      const keysToKeep = ['skipSubscriptionCheck']; // Keep only system flags
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // ✅ CRITICAL: Clear ALL sessionStorage items
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('⚠️ Failed to clear sessionStorage:', e);
      }

      // Clear state
      setHasActiveSubscription(false);
      setCurrentBusiness(null);
      setBusinesses([]);
      setCurrentOutlet(null);
      setOutlets([]);
      setInitialLoadComplete(false); // Reset initial load flag

      console.log('✅ All cache cleared on login - fresh session ready');

      // ✅ OPTIMIZATION: Set user and token immediately for instant UI update
      // ✅ SECURITY: Token is now stored in HTTP-only cookie (set by backend)
      // localStorage token is kept for backward compatibility during transition
      setUser(userData);
      setToken(newToken);
      localStorage.setItem('token', newToken); // Backward compatibility (will be removed later)
      localStorage.setItem('user', JSON.stringify(userData)); // ✅ Cache user data
      localStorage.setItem('userId', userData.id);

      // ✅ CRITICAL FIX: Set axios header immediately (don't wait for useEffect)
      // This ensures token is available for prefetch calls
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      // ✅ FIX: Refresh user data from API after login (not just from response)
      // This ensures we have the latest user data
      try {
        const freshUserResponse = await apiClient.get('/user', {
          timeout: 5000,
        });
        const freshUserData = freshUserResponse.data;
        if (freshUserData && freshUserData.id) {
          console.log('✅ Refreshed user data from API');
          setUser(freshUserData);
          localStorage.setItem('user', JSON.stringify(freshUserData));
          localStorage.setItem('userId', freshUserData.id);
        }
      } catch (error) {
        console.warn(
          '⚠️ Failed to refresh user data, using response data:',
          error
        );
        // Continue with response data if refresh fails
      }

      // ✅ FIX: Don't mark initial load complete immediately
      // Wait for critical data to be prefetched first
      // This ensures data is ready before rendering
      setLoading(false);
      // initialLoadComplete will be set after data is prefetched

      // Don't check subscription here - let Login component handle it
      // This prevents timing issues with redirects
      let hasActiveSubscription = false;

      // If user is an employee and has associated business
      if (employee_business) {
        console.log(
          '👔 Employee login detected, setting business:',
          employee_business
        );
        setBusinesses([employee_business]);
        setCurrentBusiness(employee_business);
        localStorage.setItem('currentBusinessId', employee_business.id);

        // Set subscription status based on owner's subscription
        const ownerHasActiveSubscription =
          owner_subscription_status?.has_active_subscription || false;
        setHasActiveSubscription(ownerHasActiveSubscription);

        // ✅ OPTIMIZATION: Load subscription and profile status in background (non-blocking)
        Promise.allSettled([
          checkSubscription(userData).catch(() => null),
          checkProfileStatus().catch(() => null),
        ]).catch(() => null);

        // ✅ OPTIMIZATION: Prefetch critical data immediately for employee
        // This ensures data is ready when user navigates (like Facebook)
        console.log('🚀 Prefetching critical data for employee...');
        // Use setTimeout to ensure business is set first AND token is available
        setTimeout(async () => {
          // ✅ FIX: Verify token is available before prefetch
          const currentToken = localStorage.getItem('token');
          if (!currentToken) {
            console.warn('⚠️ No token available for prefetch, skipping...');
            setInitialLoadComplete(true);
            return;
          }

          const outletId = localStorage.getItem('currentOutletId');
          try {
            await prefetchCriticalData(
              employee_business.id,
              outletId ? parseInt(outletId) : null
            );
            // ✅ FIX: Mark initial load complete after data is prefetched
            setInitialLoadComplete(true);
            console.log('✅ Initial load complete - data ready');
          } catch (error) {
            console.warn('⚠️ Prefetch failed, but continuing:', error);
            // Still mark complete even if prefetch fails
            setInitialLoadComplete(true);
          }
        }, 200); // ✅ FIX: Increased delay to ensure token is set

        return {
          success: true,
          hasBusinesses: true,
          user: userData,
          hasActiveSubscription: ownerHasActiveSubscription,
          owner_subscription_status: owner_subscription_status,
        };
      }

      // ✅ OPTIMIZATION: For owners, return immediately and load businesses in background
      // This allows instant redirect without waiting for business API call
      // ✅ FIX: Use loadBusinesses function which properly sets businessLoading state
      console.log('🔍 Loading businesses for owner in background...');

      // ✅ CRITICAL: Use loadBusinesses which sets businessLoading=true internally
      // This ensures ProtectedRoute knows businesses are loading
      // Note: loadBusinesses already sets businessLoading=true at start and false at end
      loadBusinesses(userData, false)
        .then(async () => {
          console.log('✅ Businesses loaded successfully after login');
          // Prefetch critical data after businesses are loaded
          const businessId = localStorage.getItem('currentBusinessId');
          const outletId = localStorage.getItem('currentOutletId');

          // ✅ FIX: Verify token is available before prefetch
          const currentToken = localStorage.getItem('token');
          if (!currentToken) {
            console.warn('⚠️ No token available for prefetch, skipping...');
            setInitialLoadComplete(true);
            return;
          }

          if (businessId) {
            console.log(
              '🚀 Prefetching critical data after businesses loaded...'
            );
            try {
              await prefetchCriticalData(
                parseInt(businessId),
                outletId ? parseInt(outletId) : null
              );
              // ✅ FIX: Mark initial load complete after data is prefetched
              setInitialLoadComplete(true);
              console.log('✅ Initial load complete - data ready');
            } catch (error) {
              console.warn('⚠️ Prefetch failed, but continuing:', error);
              // Still mark complete even if prefetch fails
              setInitialLoadComplete(true);
            }
          } else {
            // No business, but still mark complete
            setInitialLoadComplete(true);
          }
        })
        .catch(error => {
          console.error('❌ Error loading businesses in background:', error);
          // loadBusinesses already sets businessLoading=false on error
          // Still mark complete to prevent infinite loading
          setInitialLoadComplete(true);
        });

      // ✅ FIX: Check subscription status immediately (blocking) for owner/super_admin/admin
      // This ensures hasActiveSubscription is set before redirect
      // ✅ FIX: Admin juga diperlakukan seperti owner (bisa melihat semua transaksi)
      if (['owner', 'super_admin', 'admin'].includes(userData.role)) {
        console.log(
          '🔍 Checking subscription status immediately for owner/admin...'
        );

        // ✅ FIX: For admin, check if they have subscription_status (should be null, use owner's)
        // For owner/super_admin, use subscription_status from login response
        if (userData.role === 'admin') {
          // Admin uses owner_subscription_status (from employee business owner)
          // But if they have their own subscription_status, use that
          if (
            subscription_status &&
            subscription_status.has_active_subscription !== undefined
          ) {
            console.log(
              '✅ Admin has own subscription status:',
              subscription_status
            );
            hasActiveSubscription = subscription_status.has_active_subscription;
          } else if (owner_subscription_status) {
            console.log(
              '✅ Admin using owner subscription status:',
              owner_subscription_status
            );
            hasActiveSubscription =
              owner_subscription_status.has_active_subscription || false;
          } else {
            // Admin without business - check via API
            console.log(
              '⚠️ Admin without business, checking subscription via API...'
            );
            try {
              const subscriptionActive = await checkSubscription(
                userData,
                true
              );
              hasActiveSubscription = subscriptionActive;
            } catch (error) {
              console.warn('Failed to check subscription for admin:', error);
              hasActiveSubscription = false;
            }
          }
          // ✅ FIX: Set subscription status for admin
          setHasActiveSubscription(hasActiveSubscription);
          localStorage.setItem(
            'hasActiveSubscription',
            hasActiveSubscription ? 'true' : 'false'
          );
        } else {
          // Owner/super_admin: Use subscription_status from login response if available (faster)
          if (
            subscription_status &&
            subscription_status.has_active_subscription !== undefined
          ) {
            console.log(
              '✅ Using subscription status from login response:',
              subscription_status
            );
            hasActiveSubscription = subscription_status.has_active_subscription;
            setHasActiveSubscription(hasActiveSubscription);
            localStorage.setItem(
              'hasActiveSubscription',
              hasActiveSubscription ? 'true' : 'false'
            );

            // Also set pending payment status if available
            if (subscription_status.is_pending_payment !== undefined) {
              setIsPendingPayment(subscription_status.is_pending_payment);
            }
          } else {
            // Fallback: Call API if not in response
            try {
              const subscriptionActive = await checkSubscription(
                userData,
                true
              ); // forceRefresh=true
              console.log(
                '✅ Subscription check result (from API):',
                subscriptionActive
              );
              hasActiveSubscription = subscriptionActive; // Update local variable
              // ✅ FIX: Set subscription status in state and localStorage
              setHasActiveSubscription(hasActiveSubscription);
              localStorage.setItem(
                'hasActiveSubscription',
                hasActiveSubscription ? 'true' : 'false'
              );
            } catch (err) {
              console.warn('⚠️ Subscription check failed during login:', err);
              // Continue anyway - will be checked again in background
            }
          }
        }
      }

      // ✅ OPTIMIZATION: Load profile status in background (non-blocking)
      checkProfileStatus().catch(() => null);

      // ✅ OPTIMIZATION: Return immediately with hasBusinesses: null (will be set in background)
      // Login component can check businesses.length or wait for businessLoading state
      return {
        success: true,
        hasBusinesses: null, // Will be loaded in background
        user: userData,
        hasActiveSubscription,
      };
    } catch (error) {
      console.error('❌ Login failed:', error);
      console.error('❌ Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        email: email,
        hasPassword: !!password,
      });

      // ✅ FIX: Provide more detailed error message
      let errorMessage = 'Login failed';

      if (error.response) {
        // Server responded with error
        errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          error.response.statusText ||
          `Server error (${error.response.status})`;

        // Check for validation errors
        if (error.response.data?.errors) {
          const errors = error.response.data.errors;
          if (typeof errors === 'object') {
            const errorMessages = Object.values(errors).flat();
            errorMessage = errorMessages.join(', ') || errorMessage;
          } else if (Array.isArray(errors)) {
            errorMessage = errors.join(', ') || errorMessage;
          }
        }
      } else if (error.request) {
        // Request was made but no response received
        // Check for specific network error codes
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
          errorMessage =
            'Tidak dapat terhubung ke server. Pastikan backend Laravel berjalan di http://localhost:8000';
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          errorMessage =
            'Koneksi timeout. Server mungkin sedang sibuk atau tidak merespons.';
        } else {
          errorMessage =
            'Network error: Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan pastikan backend berjalan.';
        }
      } else {
        // Error setting up request
        errorMessage = error.message || 'Login failed';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const register = async (
    name,
    email,
    phone,
    password,
    password_confirmation,
    whatsapp_verified = false
  ) => {
    try {
      // ✅ FIX: Clear localStorage before registration to prevent data leakage
      localStorage.removeItem('currentBusinessId');
      localStorage.removeItem('currentOutletId');
      setCurrentBusiness(null);
      setCurrentOutlet(null);
      setOutlets([]);
      setBusinesses([]);

      // ✅ FIX: Log data yang akan dikirim untuk debugging
      const registerData = {
        name: name?.trim(),
        email: email?.trim(),
        phone: phone?.trim(),
        password,
        password_confirmation,
        whatsapp_verified: Boolean(whatsapp_verified), // Ensure boolean
      };

      console.log('[Register] Sending data:', {
        ...registerData,
        password: '***', // Don't log password
        password_confirmation: '***',
      });

      const response = await apiClient.post('/register', registerData);

      const {
        user: userData,
        token: newToken,
        requires_subscription,
        requires_profile_completion,
        has_business,
        email_verification_sent,
        whatsapp_verified: waVerified,
        profile_complete,
        message,
      } = response.data;

      setUser(userData);
      setToken(newToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('userId', userData.id);

      // ✅ FIX: Ensure no business/outlet data is set for new users
      setCurrentBusiness(null);
      setCurrentOutlet(null);
      setOutlets([]);
      setBusinesses([]);

      return {
        success: true,
        requires_subscription: requires_subscription || false,
        requires_profile_completion: requires_profile_completion || false,
        has_business: has_business || false,
        email_verification_sent: email_verification_sent || false,
        whatsapp_verified: waVerified || false,
        profile_complete: profile_complete || false,
        message: message,
      };
    } catch (error) {
      console.error('Register failed:', error);

      // ✅ FIX: Extract detailed error messages from validation errors
      let errorMessage = 'Registration failed';
      const errorData = error.response?.data;

      if (errorData) {
        // If there are validation errors, show them
        if (errorData.errors && typeof errorData.errors === 'object') {
          const errorMessages = [];
          Object.keys(errorData.errors).forEach(field => {
            const fieldErrors = errorData.errors[field];
            if (Array.isArray(fieldErrors)) {
              errorMessages.push(...fieldErrors);
            } else {
              errorMessages.push(fieldErrors);
            }
          });
          errorMessage =
            errorMessages.join('. ') || errorData.message || errorMessage;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        errors: errorData?.errors || {},
      };
    }
  };

  // Debug logging untuk troubleshooting
  console.log('🔍 AuthContext render state:', {
    user: user ? { id: user.id, name: user.name, role: user.role } : null,
    token: !!token,
    loading,
    initialLoadComplete,
    // ✅ FIX: isAuthenticated should also check token, not just user
    // During reload, user might be null temporarily while checkAuth is running
    // But if token exists, we should consider user as potentially authenticated
    isAuthenticated: !!user || !!token,
    currentBusiness: currentBusiness
      ? { id: currentBusiness.id, name: currentBusiness.name }
      : null,
    businesses: businesses.length,
    currentOutlet: currentOutlet
      ? { id: currentOutlet.id, name: currentOutlet.name }
      : null,
    outlets: outlets.length,
  });

  // ✅ FIX: Expose currentBusiness and currentOutlet to window for apiClient fallback (PWA support)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.__authContextRef) {
        window.__authContextRef = {};
      }
      window.__authContextRef.currentBusiness = currentBusiness;
      window.__authContextRef.currentOutlet = currentOutlet;
    }
  }, [currentBusiness, currentOutlet]);

  // ✅ CRITICAL FIX: Check token from localStorage directly (not just state)
  // During reload, state might not be updated yet but token exists in localStorage
  const hasTokenInStorage = !!localStorage.getItem('token');
  const hasCachedUser = !!localStorage.getItem('user');
  // ✅ FIX: Consider authenticated if we have token OR cached user (during reload)
  const isAuthenticatedValue =
    !!user || !!token || (hasTokenInStorage && hasCachedUser);

  const value = {
    user,
    setUser, // ✅ EXPOSE: Allow components to update user (for profile updates)
    token,
    loading,
    login,
    register,
    logout,
    // ✅ FIX: isAuthenticated should also check token from localStorage
    // During reload, user might be null temporarily while checkAuth is running
    // But if token exists (in state OR localStorage), we should consider user as potentially authenticated
    isAuthenticated: isAuthenticatedValue,
    currentBusiness,
    businesses,
    switchBusiness,
    loadBusinesses,
    checkSubscription,
    hasActiveSubscription,
    isPendingPayment,
    subscriptionLoading,
    subscriptionFeatures, // ✅ NEW: Include subscription plan features
    refreshSubscriptionFeatures: async () => {
      // ✅ NEW: Function to manually refresh subscription features from backend
      console.log('🔄 Refreshing subscription features...');
      try {
        // Clear cache first
        localStorage.removeItem('subscriptionFeatures');

        // Force refresh subscription (which will update features)
        await checkSubscription(user, true);

        // Get fresh features from API with increased timeout
        const response = await apiClient.get('/v1/subscriptions/current', {
          timeout: 30000, // ✅ NEW: 30 seconds timeout
        });
        if (response.data.success && response.data.plan_features) {
          const newFeatures = response.data.plan_features;
          // ✅ CRITICAL: Update state immediately
          setSubscriptionFeatures(newFeatures);
          // ✅ CRITICAL: Update localStorage
          localStorage.setItem(
            'subscriptionFeatures',
            JSON.stringify(newFeatures)
          );
          console.log('✅ Subscription features refreshed:', newFeatures);

          // ✅ NEW: Force a small delay to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 100));

          return newFeatures;
        }
        return null;
      } catch (error) {
        // ✅ NEW: Handle CanceledError and timeout gracefully
        if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
          console.log('⚠️ Subscription features refresh was canceled (likely duplicate request)');
          // Try to get cached features from localStorage
          const cachedFeatures = localStorage.getItem('subscriptionFeatures');
          if (cachedFeatures) {
            try {
              const parsed = JSON.parse(cachedFeatures);
              setSubscriptionFeatures(parsed);
              return parsed;
            } catch (e) {
              console.error('Error parsing cached features:', e);
            }
          }
          return null;
        }
        
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          console.warn('⚠️ Subscription features refresh timeout, using cached data if available');
          const cachedFeatures = localStorage.getItem('subscriptionFeatures');
          if (cachedFeatures) {
            try {
              const parsed = JSON.parse(cachedFeatures);
              setSubscriptionFeatures(parsed);
              return parsed;
            } catch (e) {
              console.error('Error parsing cached features:', e);
            }
          }
        }
        
        console.error('❌ Error refreshing subscription features:', error);
        return null;
      }
    },
    businessLoading,
    initialLoadComplete,
    hasNoBusiness: businesses.length === 0 && !loading && !!user,
    currentOutlet,
    outlets,
    loadOutlets,
    profileComplete,
    whatsappVerified,
    profileLoading,
    checkProfileStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ✅ FIX: Export default for backward compatibility
export default AuthProvider;
