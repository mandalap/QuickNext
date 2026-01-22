import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import ErrorBoundary from './components/error/ErrorBoundary';
import LoadingLogo from './components/ui/LoadingLogo';
import { ToastProvider } from './components/ui/toast';
import { queryClient } from './config/reactQuery';
import { AuthProvider } from './contexts/AuthContext';
import removeConsoleLogs from './utils/removeConsoleLogs';

// ✅ FIX: Import ProtectedRoute directly (not lazy) to prevent initialization error
import ProtectedRoute from './components/routes/ProtectedRoute';
// PWA Components
import {
  InstallPrompt,
  OfflineBadge,
  OfflineIndicator,
  UpdateNotification,
} from './components/pwa';

// Lazy load components for better performance
const Login = lazy(() => import('./components/Auth/Login'));
const Register = lazy(() => import('./components/Auth/Register'));
const ForgotPassword = lazy(() => import('./components/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/Auth/ResetPassword'));
const BusinessSetup = lazy(() => import('./components/business/BusinessSetup'));
const Dashboard = lazy(() => import('./components/dashboards/Dashboard'));
const RoleBasedDashboard = lazy(() =>
  import('./components/dashboards/RoleBasedDashboard')
);
const AdminDashboard = lazy(() =>
  import('./components/dashboards/AdminDashboard')
);
const KasirDashboard = lazy(() =>
  import('./components/dashboards/KasirDashboard')
);
const KitchenDashboard = lazy(() =>
  import('./components/dashboards/KitchenDashboard')
);
const WaiterDashboard = lazy(() =>
  import('./components/dashboards/WaiterDashboard')
);
const FinancialManagement = lazy(() =>
  import('./components/financial/FinancialManagement')
);
const SalesChartReport = lazy(() =>
  import('./components/reports/SalesChartReport')
);
const InventoryRecipe = lazy(() =>
  import('./components/inventory/InventoryRecipe')
);
const StockTransferManagement = lazy(() =>
  import('./components/inventory/StockTransferManagement')
);
const Layout = lazy(() => import('./components/layout/Layout'));
const BusinessManagement = lazy(() =>
  import('./components/management/BusinessManagement')
);
const EmployeeManagement = lazy(() =>
  import('./components/management/EmployeeManagement')
);
const PayrollManagement = lazy(() =>
  import('./components/payroll/PayrollManagement')
);
const CashierMonitoring = lazy(() =>
  import('./components/monitoring/CashierMonitoring')
);
const SelfServiceOrder = lazy(() =>
  import('./components/orders/SelfServiceOrder')
);
const PublicOutletOrder = lazy(() => import('./pages/PublicOutletOrder'));
const OrderStatus = lazy(() => import('./pages/OrderStatus'));
const Receipt = lazy(() => import('./pages/Receipt'));
const PublicSelfServiceMenu = lazy(() =>
  import('./pages/PublicSelfServiceMenu')
);
const CashierPOS = lazy(() => import('./components/pos/CashierPOS'));
const WaiterPOS = lazy(() => import('./components/pos/WaiterPOS'));
const ProductManagement = lazy(() =>
  import('./components/products/ProductManagementOptimized')
);
const PromoManagement = lazy(() =>
  import('./components/promo/PromoManagement')
);
const OnlineCommission = lazy(() =>
  import('./components/sales/OnlineCommission')
);
const SalesManagement = lazy(() =>
  import('./components/sales/SalesManagement')
);
const SubscriptionPlans = lazy(() =>
  import('./components/subscription/SubscriptionPlans')
);
const SubscriptionSettings = lazy(() =>
  import('./components/subscription/SubscriptionSettings')
);
const EmployeeOutletManagement = lazy(() =>
  import('./pages/EmployeeOutletManagement')
);
const Reports = lazy(() => import('./pages/Reports'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const SubscriptionHistory = lazy(() => import('./pages/SubscriptionHistory'));
const PaymentPending = lazy(() => import('./pages/PaymentPending'));
const EmailVerification = lazy(() => import('./pages/EmailVerification'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const SSOLogin = lazy(() => import('./pages/SSOLogin'));
const PaymentFailed = lazy(() => import('./pages/PaymentFailed'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const PushNotificationSettings = lazy(() => import('./components/notifications/PushNotificationSettings'));
const Attendance = lazy(() => import('./pages/Attendance'));

// Loading component for Suspense fallback (branded)
const LoadingSpinner = () => (
  <div className='flex items-center justify-center min-h-screen bg-white'>
    <LoadingLogo size='xl' text='Memuat aplikasi…' />
  </div>
);

// Legacy PrivateRoute for backward compatibility
const PrivateRoute = ({
  children,
  requireBusiness = true,
  allowedRoles = [],
}) => {
  return (
    <ProtectedRoute
      requireBusiness={requireBusiness}
      allowedRoles={allowedRoles}
    >
      {children}
    </ProtectedRoute>
  );
};

function App() {
  // ✅ PWA: State untuk mengontrol visibility InstallPrompt
  const [showInstallPrompt, setShowInstallPrompt] = useState(() => {
    // Check localStorage untuk melihat apakah user sudah dismiss prompt
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (!dismissed) return true; // Show jika belum di-dismiss

    // Check expiry date (optional, bisa muncul lagi setelah 7 hari)
    const expiryDate = localStorage.getItem('pwa_install_dismissed_expiry');
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      if (now > expiry) {
        // Expiry sudah lewat, clear dan show lagi
        localStorage.removeItem('pwa_install_dismissed');
        localStorage.removeItem('pwa_install_dismissed_expiry');
        return true;
      }
    }

    return false; // Don't show jika sudah di-dismiss dan belum expired
  });

  // ✅ OPTIMIZATION: Remove console.logs immediately for better performance
  // This significantly improves performance, especially with 100+ console.log calls
  useEffect(() => {
    removeConsoleLogs();
  }, []);

  // ✅ OPTIMIZATION: Also remove console logs on mount (before first render)
  if (typeof window !== 'undefined') {
    removeConsoleLogs();
  }

  // ✅ PWA: Handler untuk dismiss install prompt
  const handleDismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    // Simpan preference di localStorage agar tidak muncul lagi
    localStorage.setItem('pwa_install_dismissed', 'true');
    // Set expiry 7 hari (optional, bisa dihapus jika ingin permanent)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    localStorage.setItem(
      'pwa_install_dismissed_expiry',
      expiryDate.toISOString()
    );
  };

  // ✅ PWA: Register Service Worker with proper error handling
  useEffect(() => {
    let updateInterval = null;

    if ('serviceWorker' in navigator) {
      // ✅ FIX: Check if service worker file exists before registering (development only)
      const checkAndRegister = async () => {
        let registrationTimeout = null;
        
        try {
          // In development, check if file exists first
          if (process.env.NODE_ENV === 'development') {
            const response = await fetch('/service-worker.js', { method: 'HEAD' });
            if (!response.ok) {
              console.warn('⚠️ Service Worker file not found. Skipping registration in development.');
              // Unregister any existing service workers to prevent update errors
              const registrations = await navigator.serviceWorker.getRegistrations();
              registrations.forEach(registration => {
                registration.unregister().catch(() => {
                  // Ignore unregister errors
                });
              });
              return;
            }
          }

          // ✅ FIX: Add timeout untuk service worker registration
          registrationTimeout = setTimeout(() => {
            console.warn('⚠️ Service Worker registration timeout after 10 seconds');
          }, 10000);

          navigator.serviceWorker
            .register('/service-worker.js', {
              scope: '/',
            })
        .then(registration => {
          if (registrationTimeout) {
            clearTimeout(registrationTimeout);
          }
          console.log('✅ Service Worker registered:', registration);

          // ✅ FIX: Check for updates periodically with better error handling
          // Check for updates every 5 minutes to ensure PWA gets updates faster
          updateInterval = setInterval(() => {
            try {
              // ✅ FIX: Wrap update() in try-catch and handle errors gracefully
              registration.update().catch(updateError => {
                // ✅ FIX: Silently handle update errors - they're often network-related
                // Check if it's a fetch error (file not found or network issue)
                const errorMessage = updateError?.message || String(updateError);
                if (
                  errorMessage.includes('fetch') ||
                  errorMessage.includes('Failed to update') ||
                  errorMessage.includes('unknown error') ||
                  errorMessage.includes('script')
                ) {
                  // Service worker file might not be available or network issue
                  // This is normal in development and can be safely ignored
                if (process.env.NODE_ENV === 'development') {
                    console.debug('⚠️ Service Worker update skipped (development mode)');
                  }
                    return;
                  }
                // Only log unexpected errors
                if (process.env.NODE_ENV === 'development') {
                  console.warn('⚠️ Service Worker update failed:', updateError);
                }
              });
            } catch (updateError) {
              // ✅ FIX: Silently handle errors in production
              if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ Service Worker update error:', updateError);
              }
            }
          }, 5 * 60 * 1000); // Check every 5 minutes

          // ✅ FIX: Listen for updates with error handling
          registration.addEventListener('updatefound', () => {
            try {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (
                    newWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    // New service worker available, notify user
                    console.log(
                      '🔄 New service worker available. Reload to update.'
                    );
                  }
                });

                // ✅ FIX: Handle service worker installation errors
                newWorker.addEventListener('error', error => {
                  console.error('❌ Service Worker installation error:', error);
                });
              }
            } catch (updateError) {
              console.warn(
                '⚠️ Error handling service worker update:',
                updateError
              );
            }
          });

          // ✅ FIX: Handle service worker errors with better error handling
          registration.addEventListener('error', error => {
            // ✅ FIX: Only log errors in development to avoid console spam
            if (process.env.NODE_ENV === 'development') {
              console.error('❌ Service Worker error:', error);
            }
          });
        })
        .catch(error => {
          if (registrationTimeout) {
            clearTimeout(registrationTimeout);
          }

          // ✅ FIX: Better error handling for service worker registration
          // Check if it's a fetch error (file not found)
          const errorMessage = error?.message || String(error);
          if (
            errorMessage.includes('fetch') ||
            errorMessage.includes('Failed to update') ||
            errorMessage.includes('unknown error') ||
            errorMessage.includes('script')
          ) {
            // Service worker file might not be available
            // Unregister any existing service workers to prevent update errors
            navigator.serviceWorker.getRegistrations().then(registrations => {
              registrations.forEach(reg => {
                reg.unregister().catch(() => {
                  // Ignore unregister errors
                });
              });
            });
            
            if (process.env.NODE_ENV === 'development') {
              console.debug('⚠️ Service Worker registration skipped (file not available)');
            }
            return;
          }
          
          // ✅ FIX: Only log unexpected errors in development
          if (process.env.NODE_ENV === 'development') {
            if (error.name === 'SecurityError') {
              console.error(
                '❌ Service Worker registration failed: SecurityError - HTTPS required or invalid scope'
              );
            } else if (error.name === 'TypeError') {
                console.error(
                  '❌ Service Worker registration failed: TypeError - Invalid service worker file',
                  error
                );
            } else {
              console.error('❌ Service Worker registration failed:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
              });
            }
          }

          // ✅ FIX: Don't block app if service worker fails (graceful degradation)
          // App will still work, just without offline support
        });
        } catch (checkError) {
          // File check failed, skip registration
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Service Worker check failed, skipping registration:', checkError);
          }
        }
      };

      checkAndRegister();
    } else {
      // ✅ FIX: Log if service worker not supported
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Service Worker not supported in this browser');
      }
    }

    // ✅ FIX: Cleanup function to clear interval on unmount
    return () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      {/* PWA Components */}
      <InstallPrompt
        show={showInstallPrompt}
        onDismiss={handleDismissInstallPrompt}
      />
      <UpdateNotification />
      <OfflineIndicator position='top' />
      <OfflineBadge />
      <QueryClientProvider client={queryClient}>
        <div className='App'>
          <AuthProvider>
            <ToastProvider>
              {/* Toaster for react-hot-toast (used by PaymentModal, UnpaidOrders, etc) */}
              <Toaster
                position='top-right'
                reverseOrder={false}
                gutter={8}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#fff',
                    color: '#363636',
                    padding: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    maxWidth: '500px',
                  },
                  success: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 6000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              <BrowserRouter>
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path='/login' element={<Login />} />
                    <Route path='/register' element={<Register />} />
                    <Route path='/forgot-password' element={<ForgotPassword />} />
                    <Route path='/reset-password' element={<ResetPassword />} />

                    {/* Complete Profile - Requires authentication but no business */}
                    <Route
                      path='/complete-profile'
                      element={
                        <PrivateRoute requireBusiness={false}>
                          <CompleteProfilePage />
                        </PrivateRoute>
                      }
                    />

                    {/* Subscription Plans - Can be accessed without authentication */}
                    <Route
                      path='/subscription-plans'
                      element={<SubscriptionPlans />}
                    />

                    {/* Payment Routes - No authentication required */}
                    <Route
                      path='/payment/pending'
                      element={<PaymentPending />}
                    />
                    <Route
                      path='/payment/success'
                      element={<PaymentSuccess />}
                    />
                    <Route path='/payment/failed' element={<PaymentFailed />} />

                    {/* Email Verification Route - No authentication required */}
                    <Route
                      path='/email/verify'
                      element={<EmailVerification />}
                    />

                    {/* SSO Login landing (Google) */}
                    <Route path='/login/sso' element={<SSOLogin />} />

                    {/* Public Outlet Ordering - No authentication required */}
                    <Route
                      path='/order/:outletSlug'
                      element={<PublicOutletOrder />}
                    />
                    <Route
                      path='/order-status/:orderNumber'
                      element={<OrderStatus />}
                    />
                    <Route path='/receipt/:token' element={<Receipt />} />

                    {/* Public Self-Service Menu - No authentication required (Old QR route) */}
                    <Route
                      path='/self-service/:qrCode'
                      element={<PublicSelfServiceMenu />}
                    />

                    {/* Business Setup Routes */}
                    {/* Initial setup for new users (no business) */}
                    <Route
                      path='/business-setup'
                      element={
                        <PrivateRoute requireBusiness={false}>
                          <BusinessSetup isInitialSetup={true} />
                        </PrivateRoute>
                      }
                    />

                    {/* Add new business for existing users - Only owners */}
                    <Route
                      path='/business/new'
                      element={
                        <PrivateRoute
                          requireBusiness={false}
                          allowedRoles={['super_admin', 'owner']}
                        >
                          <BusinessSetup isInitialSetup={false} />
                        </PrivateRoute>
                      }
                    />

                    {/* Protected Routes */}
                    <Route
                      path='/'
                      element={
                        <PrivateRoute>
                          <Layout />
                        </PrivateRoute>
                      }
                    >
                      {/* Dashboard Routes - Role-based */}
                      <Route
                        index
                        element={
                          <PrivateRoute
                            allowedRoles={[
                              'super_admin',
                              'owner',
                              'admin',
                              'kasir',
                            ]}
                          >
                            <RoleBasedDashboard />
                          </PrivateRoute>
                        }
                      />

                      {/* Kasir Routes */}
                      <Route
                        path='cashier'
                        element={
                          <PrivateRoute
                            allowedRoles={[
                              'super_admin',
                              'owner',
                              'admin',
                              'kasir',
                            ]}
                          >
                            <KasirDashboard />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path='cashier/pos'
                        element={
                          <PrivateRoute
                            allowedRoles={[
                              'super_admin',
                              'owner',
                              'admin',
                              'kasir',
                            ]}
                          >
                            <CashierPOS />
                          </PrivateRoute>
                        }
                      />

                      {/* Kitchen Routes */}
                      <Route
                        path='kitchen'
                        element={
                          <PrivateRoute
                            allowedRoles={[
                              'super_admin',
                              'owner',
                              'admin',
                              'kitchen',
                            ]}
                          >
                            <KitchenDashboard />
                          </PrivateRoute>
                        }
                      />

                      {/* Waiter/Table Routes */}
                      <Route
                        path='tables'
                        element={
                          <PrivateRoute
                            allowedRoles={[
                              'super_admin',
                              'owner',
                              'admin',
                              'waiter',
                            ]}
                          >
                            <WaiterDashboard />
                          </PrivateRoute>
                        }
                      />

                      {/* Waiter POS - Table-specific order creation */}
                      <Route
                        path='tables/pos'
                        element={
                          <PrivateRoute
                            allowedRoles={[
                              'super_admin',
                              'owner',
                              'admin',
                              'waiter',
                            ]}
                          >
                            <WaiterPOS />
                          </PrivateRoute>
                        }
                      />

                      {/* Sales & Orders - Admin, Kasir */}
                      <Route
                        path='sales'
                        element={
                          <PrivateRoute
                            allowedRoles={[
                              'super_admin',
                              'owner',
                              'admin',
                              'kasir',
                            ]}
                          >
                            <SalesManagement />
                          </PrivateRoute>
                        }
                      />

                      {/* Admin Dashboard - Admin/Owner/Super Admin */}
                      <Route
                        path='admin'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <AdminDashboard />
                          </PrivateRoute>
                        }
                      />

                      {/* Product Management - Admin only */}
                      <Route
                        path='products'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <ProductManagement />
                          </PrivateRoute>
                        }
                      />

                      {/* Inventory & Recipes - Admin, Kitchen */}
                      <Route
                        path='inventory'
                        element={
                          <PrivateRoute
                            allowedRoles={[
                              'super_admin',
                              'owner',
                              'admin',
                              'kitchen',
                            ]}
                          >
                            <InventoryRecipe />
                          </PrivateRoute>
                        }
                      />

                      {/* Promo Management - Admin only */}
                      <Route
                        path='promo'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <PromoManagement />
                          </PrivateRoute>
                        }
                      />

                      {/* Self Service - All staff */}
                      <Route
                        path='self-service'
                        element={
                          <PrivateRoute
                            allowedRoles={[
                              'super_admin',
                              'owner',
                              'admin',
                              'kasir',
                              'waiter',
                            ]}
                          >
                            <SelfServiceOrder />
                          </PrivateRoute>
                        }
                      />

                      {/* Commission - Admin only */}
                      <Route
                        path='commission'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <OnlineCommission />
                          </PrivateRoute>
                        }
                      />

                      {/* Business Management - Owner only */}
                      <Route
                        path='business-management'
                        element={
                          <PrivateRoute allowedRoles={['super_admin', 'owner']}>
                            <BusinessManagement />
                          </PrivateRoute>
                        }
                      />

                      {/* Stock Transfer Management - Owner, Admin */}
                      <Route
                        path='stock-transfers'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <StockTransferManagement />
                          </PrivateRoute>
                        }
                      />

                      {/* Employee Outlet Assignment - Owner, Admin */}
                      <Route
                        path='employee-outlets'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <EmployeeOutletManagement />
                          </PrivateRoute>
                        }
                      />

                      {/* Employee Management - Admin only */}
                      <Route
                        path='employees'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <EmployeeManagement />
                          </PrivateRoute>
                        }
                      />

                      {/* Payroll Management - Admin only */}
                      <Route
                        path='payroll'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <PayrollManagement />
                          </PrivateRoute>
                        }
                      />

                      {/* Attendance - All employee roles */}
                      <Route
                        path='attendance'
                        element={
                          <PrivateRoute
                            allowedRoles={[
                              'super_admin',
                              'owner',
                              'admin',
                              'kasir',
                              'kitchen',
                              'waiter',
                            ]}
                          >
                            <Attendance />
                          </PrivateRoute>
                        }
                      />

                      {/* Finance - Owner, Admin only */}
                      <Route
                        path='finance'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <FinancialManagement />
                          </PrivateRoute>
                        }
                      />

                      {/* Reports - Owner, Admin only */}
                      <Route
                        path='reports'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <Reports />
                          </PrivateRoute>
                        }
                      />

                      {/* Sales Chart Report - Owner, Admin only */}
                      <Route
                        path='reports/sales-chart'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <SalesChartReport />
                          </PrivateRoute>
                        }
                      />

                      {/* Cashier Monitoring - Owner, Admin only */}
                      <Route
                        path='monitoring'
                        element={
                          <PrivateRoute
                            allowedRoles={['super_admin', 'owner', 'admin']}
                          >
                            <CashierMonitoring />
                          </PrivateRoute>
                        }
                      />

                      {/* Subscription Settings - Owner only */}
                      <Route
                        path='subscription-settings'
                        element={
                          <PrivateRoute allowedRoles={['super_admin', 'owner']}>
                            <SubscriptionSettings />
                          </PrivateRoute>
                        }
                      />

                      {/* Subscription Page - Owner only */}
                      <Route
                        path='subscription'
                        element={
                          <PrivateRoute allowedRoles={['super_admin', 'owner']}>
                            <SubscriptionPage />
                          </PrivateRoute>
                        }
                      />
                      {/* Subscription History - Owner only */}
                      <Route
                        path='subscription-history'
                        element={
                          <PrivateRoute allowedRoles={['super_admin', 'owner']}>
                            <SubscriptionHistory />
                          </PrivateRoute>
                        }
                      />

                      {/* Settings - Profile & Password (All authenticated users) */}
                      <Route
                        path='settings/profile'
                        element={
                          <PrivateRoute>
                            <ProfilePage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path='settings/change-password'
                        element={
                          <PrivateRoute>
                            <ChangePasswordPage />
                          </PrivateRoute>
                        }
                      />
                      {/* Push Notification Settings - All authenticated users */}
                      <Route
                        path='settings/push-notifications'
                        element={
                          <PrivateRoute>
                            <PushNotificationSettings />
                          </PrivateRoute>
                        }
                      />
                    </Route>

                    {/* Redirect unknown routes to login */}
                    <Route path='*' element={<Navigate to='/login' />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ToastProvider>
          </AuthProvider>
          {/* React Query Devtools - disabled (hidden) */}
          {/* {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} position='bottom-right' />
        )} */}
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
