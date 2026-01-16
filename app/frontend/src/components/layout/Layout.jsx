import {
  Activity,
  ArrowRightLeft,
  Bell,
  Building2,
  Calculator,
  ChevronDown,
  ChefHat,
  CreditCard,
  Crown,
  FileBarChart,
  Gift,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Package,
  QrCode,
  RefreshCw,
  Search,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  User,
  Users,
  X,
  Clock,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import AccessDeniedModal from '../modals/AccessDeniedModal';
import { queryKeys } from '../../config/reactQuery';
import { clearAllCache } from '../../utils/refreshData';
import BusinessSwitcher from '../business/BusinessSwitcher';
import OutletSwitcher from '../business/OutletSwitcher';
import NotificationBell from '../notifications/NotificationBell';
import SubscriptionBadge from '../subscription/SubscriptionBadge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import SyncIndicator from '../pwa/SyncIndicator';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [accessDeniedFeature, setAccessDeniedFeature] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout, currentBusiness, currentOutlet, loadBusinesses, subscriptionFeatures, subscriptionLoading, refreshSubscriptionFeatures, checkSubscription } = useAuth();
  
  // ✅ FIX: Force refresh subscription features on mount to ensure fresh data after reload
  // This prevents sidebar from being locked incorrectly after browser reload
  useEffect(() => {
    if (user?.id && currentBusiness?.id && !subscriptionLoading) {
      // Force refresh subscription to get latest features from API after reload
      // This ensures sidebar menu access is correctly determined
      console.log('🔄 Layout: Refreshing subscription features on mount to prevent sidebar lock...');
      checkSubscription(user, true).catch(err => {
        console.warn('Error refreshing subscription in Layout:', err);
      });
    }
  }, [user?.id, currentBusiness?.id, checkSubscription]); // Include checkSubscription in dependencies
  
  // ✅ FIX: Force refresh currentBusiness from localStorage if subscription_info seems stale
  // This ensures header always shows latest subscription status
  useEffect(() => {
    if (currentBusiness?.id) {
      const cachedBusiness = localStorage.getItem('currentBusiness');
      if (cachedBusiness) {
        try {
          const parsed = JSON.parse(cachedBusiness);
          // If cached business has newer subscription_info, update currentBusiness
          if (parsed.id === currentBusiness.id && parsed.subscription_info) {
            // Check if subscription_info is different (might be stale)
            const cachedPlanName = parsed.subscription_info?.plan_name;
            const currentPlanName = currentBusiness.subscription_info?.plan_name;
            
            if (cachedPlanName && cachedPlanName !== currentPlanName) {
              console.log('🔄 Layout: Detected stale subscription_info, refreshing...');
              console.log('🔍 Cached plan:', cachedPlanName);
              console.log('🔍 Current plan:', currentPlanName);
              // Force reload businesses to get fresh data
              loadBusinesses(undefined, true).catch(err => {
                console.warn('Error refreshing businesses in Layout:', err);
              });
            }
          }
        } catch (e) {
          console.warn('Error parsing cached business:', e);
        }
      }
    }
  }, [currentBusiness?.subscription_info?.plan_name, currentBusiness?.id, loadBusinesses]);

  // PWA Install Prompt Handler
  useEffect(() => {
    // Check if PWA is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = window.navigator.standalone === true;
    const isInstalled = isStandalone || isIOSStandalone;
    setIsPWAInstalled(isInstalled);

    if (isInstalled) {
      console.log('✅ PWA already installed');
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('✅ beforeinstallprompt event received');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e);
      console.log('✅ Deferred prompt saved');
    };

    // Check if event is already available (for debugging)
    if (window.deferredPrompt) {
      console.log('✅ Using existing deferredPrompt');
      setDeferredPrompt(window.deferredPrompt);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('✅ PWA was installed');
      setIsPWAInstalled(true);
      setDeferredPrompt(null);
      toast.success('Aplikasi berhasil diinstall!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // ✅ FIX: Check periodically if PWA can be installed (for debugging)
    const checkPWAInstallability = () => {
      // Check if manifest.json exists
      fetch('/manifest.json')
        .then(res => {
          if (res.ok) {
            console.log('✅ manifest.json found');
          } else {
            console.warn('⚠️ manifest.json not found');
          }
        })
        .catch(err => console.warn('⚠️ Error checking manifest.json:', err));

      // Check if service worker is registered
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          if (registrations.length > 0) {
            console.log('✅ Service worker registered');
          } else {
            console.warn('⚠️ Service worker not registered');
          }
        });
      }
    };

    // Check after a delay to allow page to fully load
    const timeoutId = setTimeout(checkPWAInstallability, 2000);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle PWA Install
  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast.error('Aplikasi sudah terinstall atau tidak dapat diinstall di browser ini');
      return;
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        toast.success('Menginstall aplikasi...');
      } else {
        toast('Installasi dibatalkan', { icon: 'ℹ️' });
      }

      // Clear the deferredPrompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing PWA:', error);
      toast.error('Terjadi kesalahan saat menginstall aplikasi');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ✅ NEW: Handle refresh subscription features
  const handleRefreshSubscriptionFeatures = useCallback(async () => {
    try {
      toast.loading('🔄 Memperbarui akses fitur...', { id: 'refresh-features' });
      
      // Clear subscription features cache
      localStorage.removeItem('subscriptionFeatures');
      
      // Force refresh subscription (which will update features)
      await checkSubscription(null, true);
      
      // Also explicitly refresh features
      if (refreshSubscriptionFeatures) {
        await refreshSubscriptionFeatures();
      }
      
      toast.success('✅ Akses fitur berhasil diperbarui!', { id: 'refresh-features' });
      
      // Small delay then reload to ensure UI updates
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error refreshing subscription features:', error);
      toast.error('❌ Gagal memperbarui akses fitur', { id: 'refresh-features' });
    }
  }, [checkSubscription, refreshSubscriptionFeatures]);

  // ✅ Handle Force Update - Clear cache, update service worker, reload
  const handleForceUpdate = useCallback(async () => {
    if (isUpdating) return; // Prevent multiple clicks
    
    setIsUpdating(true);
    const updateToast = toast.loading('🔄 Memperbarui aplikasi...', {
      duration: 120000, // 2 minutes max
    });

    try {
      console.log('🔄 Starting force update...');

      // 1. Clear all cache (localStorage, cache utils) - includes subscriptionFeatures
      console.log('🧹 Clearing all cache...');
      clearAllCache();
      
      // ✅ FIX: Clear PWA install prompt dismissal preference
      // Agar install prompt muncul lagi setelah reload
      console.log('🧹 Clearing PWA install prompt dismissal...');
      localStorage.removeItem('pwa_install_dismissed');
      localStorage.removeItem('pwa_install_dismissed_expiry');

      // 2. Clear React Query cache
      console.log('🧹 Clearing React Query cache...');
      queryClient.clear();

      // 3. Clear Service Worker cache
      if ('caches' in window) {
        console.log('🧹 Clearing Service Worker cache...');
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`🗑️ Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      }

      // 4. Force update Service Worker
      if ('serviceWorker' in navigator) {
        console.log('🔄 Updating Service Worker...');
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          // Unregister old service worker
          await registration.unregister();
          console.log('✅ Service Worker unregistered');
        }
      }

      // 5. Clear IndexedDB (if exists)
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                console.log(`🗑️ Deleting IndexedDB: ${db.name}`);
                return new Promise((resolve, reject) => {
                  const deleteReq = indexedDB.deleteDatabase(db.name);
                  deleteReq.onsuccess = () => resolve();
                  deleteReq.onerror = () => reject(deleteReq.error);
                  deleteReq.onblocked = () => {
                    console.warn(`⚠️ IndexedDB ${db.name} is blocked, skipping...`);
                    resolve();
                  };
                });
              }
            })
          );
        } catch (error) {
          console.warn('⚠️ Error clearing IndexedDB:', error);
        }
      }

      // 6. Wait a bit to ensure all operations complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 7. Update toast
      toast.dismiss(updateToast);
      toast.success('✅ Update selesai! Memuat ulang aplikasi...', {
        duration: 2000,
      });

      // 8. Wait a bit more, then reload
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 9. Force reload with cache bypass
      console.log('🔄 Reloading page...');
      window.location.href = window.location.href.split('#')[0] + '?t=' + Date.now();
    } catch (error) {
      console.error('❌ Error during force update:', error);
      toast.dismiss(updateToast);
      toast.error('❌ Gagal memperbarui aplikasi. Silakan refresh manual.', {
        duration: 5000,
      });
      setIsUpdating(false);
    }
  }, [isUpdating, queryClient]);

  // ✅ Handle navigation to business-management with React Query refetch
  const handleNavigateToBusinessManagement = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
    }
    
    // Navigate first
    navigate('/business-management');
    
    // Refetch business-management related data without full page reload
    if (currentBusiness?.id) {
      try {
        await Promise.all([
          // Refetch outlets data
          queryClient.refetchQueries({
            queryKey: queryKeys.settings.outlets(currentBusiness.id),
          }),
          // Refetch business data if loadBusinesses is available
          loadBusinesses ? loadBusinesses() : Promise.resolve(),
        ]);
      } catch (error) {
        console.error('Error refetching business-management data:', error);
      }
    }
  }, [navigate, queryClient, currentBusiness?.id, loadBusinesses]);

  // ✅ Handle navigation to employee-outlets with React Query refetch
  const handleNavigateToEmployeeOutlets = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
    }
    
    // Navigate first
    navigate('/employee-outlets');
    
    // Refetch employee-outlets related data without full page reload
    if (currentBusiness?.id) {
      try {
        await Promise.all([
          // Invalidate and refetch all employee-outlet assignments (including different filters)
          queryClient.invalidateQueries({
            queryKey: ['employee-outlets', 'assignments', currentBusiness.id],
            exact: false,
          }),
          // Refetch employees list
          queryClient.refetchQueries({
            queryKey: queryKeys.employees.list(currentBusiness.id),
          }),
          // Invalidate outlets to ensure fresh data
          queryClient.invalidateQueries({
            queryKey: queryKeys.settings.outlets(currentBusiness.id),
          }),
        ]);
      } catch (error) {
        console.error('Error refetching employee-outlets data:', error);
      }
    }
  }, [navigate, queryClient, currentBusiness?.id]);

  // ✅ Handle navigation to stock-transfers with React Query refetch
  const handleNavigateToStockTransfers = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
    }
    
    // Navigate first
    navigate('/stock-transfers');
    
    // Refetch stock-transfers related data without full page reload
    if (currentBusiness?.id && currentOutlet?.id) {
      try {
        await Promise.all([
          // Invalidate and refetch all stock transfers (including different filters and search params)
          queryClient.invalidateQueries({
            queryKey: queryKeys.inventory.transfers(currentOutlet.id, {}),
            exact: false,
          }),
          // Optionally invalidate inventory movements if related
          queryClient.invalidateQueries({
            queryKey: queryKeys.inventory.movements(currentOutlet.id, {}),
            exact: false,
          }),
        ]);
      } catch (error) {
        console.error('Error refetching stock-transfers data:', error);
      }
    }
  }, [navigate, queryClient, currentBusiness?.id, currentOutlet?.id]);

  // Menu groups with categorization for better UX
  const menuGroups = [
    {
      name: 'Overview & Analitik',
      items: [
        {
          path: '/',
          label: 'Dashboard',
          icon: LayoutDashboard,
          color: 'text-blue-600',
          roles: ['super_admin', 'owner', 'admin'],
        },
        {
          path: '/monitoring',
          label: 'Monitoring Kasir',
          icon: Activity,
          color: 'text-green-600',
          roles: ['super_admin', 'owner', 'admin'],
        },
        {
          path: '/reports',
          label: 'Laporan',
          icon: FileBarChart,
          color: 'text-red-600',
          roles: ['super_admin', 'owner', 'admin'],
          children: [
            { type: 'heading', label: 'Penjualan' },
            { path: '/reports?report=sales-summary', label: 'Ringkasan Penjualan' },
            { path: '/reports?report=sales-detail', label: 'Detail Penjualan' },
            { path: '/reports?report=sales-chart', label: 'Grafik Penjualan' },
            { path: '/reports?report=payment-types', label: 'Analisis Pembayaran' },

            { type: 'heading', label: 'Promo' },
            { path: '/reports?report=promo-usage', label: 'Penggunaan Promo' },

            { type: 'heading', label: 'Produk' },
            { path: '/reports?report=product-sales', label: 'Penjualan Produk' },
            { path: '/reports?report=category-sales', label: 'Penjualan Kategori' },

            { type: 'heading', label: 'Kasir' },
            { path: '/reports?report=cashier-performance', label: 'Performa Kasir' },
            { path: '/reports?report=cashier-closing', label: 'Tutup Kasir' },

            { type: 'heading', label: 'Pelanggan' },
            { path: '/reports?report=customer-analysis', label: 'Analisis Pelanggan' },

            { type: 'heading', label: 'Karyawan' },
            { path: '/reports?report=attendance', label: 'Absensi' },
            { path: '/reports?report=commission', label: 'Komisi' },

            { type: 'heading', label: 'Persediaan' },
            { path: '/reports?report=inventory-status', label: 'Status Persediaan' },
            { path: '/reports?report=stock-movements', label: 'Pergerakan Stok' },

            { type: 'heading', label: 'Pajak' },
            { path: '/reports?report=tax-report', label: 'Laporan Pajak' },
          ],
        },
        {
          path: '/finance',
          label: 'Keuangan',
          icon: TrendingUp,
          color: 'text-emerald-600',
          roles: ['super_admin', 'owner', 'admin'],
        },
      ],
    },
    {
      name: 'Operasional Harian',
      items: [
        {
          path: '/cashier',
          label: 'Kasir',
          icon: CreditCard,
          color: 'text-green-600',
          roles: ['super_admin', 'owner', 'admin', 'kasir'],
        },
        {
          path: '/kitchen',
          label: 'Dapur',
          icon: ChefHat,
          color: 'text-orange-600',
          roles: ['super_admin', 'owner', 'admin', 'kitchen'],
        },
        {
          path: '/tables',
          label: 'Meja',
          icon: Users,
          color: 'text-purple-600',
          roles: ['super_admin', 'owner', 'admin', 'waiter'],
        },
        {
          path: '/sales',
          label: 'Penjualan',
          icon: ShoppingCart,
          color: 'text-purple-600',
          roles: ['super_admin', 'owner', 'admin', 'kasir'],
        },
        {
          path: '/attendance',
          label: 'Absensi',
          icon: Clock,
          color: 'text-blue-600',
          roles: ['super_admin', 'owner', 'admin', 'kasir', 'kitchen', 'waiter'],
        },
      ],
    },
    {
      name: 'Manajemen Produk',
      items: [
        {
          path: '/products',
          label: 'Produk',
          icon: Package,
          color: 'text-indigo-600',
          roles: ['super_admin', 'owner', 'admin'],
        },
        {
          path: '/inventory',
          label: 'Bahan & Resep',
          icon: ChefHat,
          color: 'text-yellow-600',
          roles: ['super_admin', 'owner', 'admin', 'kitchen'],
        },
        {
          path: '/promo',
          label: 'Diskon & Promo',
          icon: Gift,
          color: 'text-pink-600',
          roles: ['super_admin', 'owner', 'admin'],
        },
      ],
    },
    {
      name: 'Channel Penjualan',
      items: [
        {
          path: '/self-service',
          label: 'Self Service',
          icon: QrCode,
          color: 'text-orange-600',
          roles: ['super_admin', 'owner', 'admin', 'kasir', 'waiter'],
        },
        {
          path: '/commission',
          label: 'Komisi Online',
          icon: Smartphone,
          color: 'text-teal-600',
          roles: ['super_admin', 'owner', 'admin'],
          hidden: true, // Hidden for now, not yet used
        },
      ],
    },
    {
      name: 'Manajemen Bisnis',
      items: [
        {
          path: '/business-management',
          label: 'Bisnis & Outlet',
          icon: Building2,
          color: 'text-blue-600',
          roles: ['super_admin', 'owner'],
        },
        {
          path: '/employees',
          label: 'Karyawan',
          icon: Users,
          color: 'text-cyan-600',
          roles: ['super_admin', 'owner', 'admin'],
        },
        {
          path: '/payroll',
          label: 'Hitung Gaji & Denda',
          icon: Calculator,
          color: 'text-green-600',
          roles: ['super_admin', 'owner', 'admin'],
        },
        {
          path: '/employee-outlets',
          label: 'Akses Outlet',
          icon: Building2,
          color: 'text-indigo-600',
          roles: ['super_admin', 'owner', 'admin'],
        },
        {
          path: '/stock-transfers',
          label: 'Transfer Stok',
          icon: ArrowRightLeft,
          color: 'text-purple-600',
          roles: ['super_admin', 'owner', 'admin'],
        },
        {
          path: '/subscription-settings',
          label: 'Subscription',
          icon: Crown,
          color: 'text-yellow-600',
          roles: ['super_admin', 'owner'],
        },
      ],
    },
  ];

  // Filter and flatten menu items based on user role
  const menuItems = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        // Hide items marked as hidden
        if (item.hidden) return false;
        const userRole = user?.role;
        if (userRole === 'super_admin') return true;
        return item.roles.includes(userRole);
      }),
    }))
    .filter(group => group.items.length > 0); // Only show groups with accessible items

  // ✅ PWA: Show back button when not on dashboard/home (commented out for now)
  // const shouldShowBackButton = location.pathname !== '/' && window.history.length > 1;

  // Auto-open dropdown for active items on mount and route change
  useEffect(() => {
    menuItems.forEach(group => {
      group.items.forEach(item => {
        if (Array.isArray(item.children) && item.children.length > 0) {
          const isActive = location.pathname === item.path || 
            (location.pathname.startsWith('/reports') && item.path === '/reports');
          if (isActive) {
            setOpenDropdowns(prev => {
              // Only update if not already set to avoid unnecessary re-renders
              if (prev[item.path]) return prev;
              return {
                ...prev,
                [item.path]: true,
              };
            });
          }
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  
  return (
    <div className='flex h-screen bg-gray-50'>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden'
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
        ${mobileMenuOpen ? 'w-64' : 'hidden'}
        lg:flex lg:${sidebarOpen ? 'w-64' : 'w-20'}
        transition-all duration-300 bg-white shadow-xl border-r border-gray-200 flex flex-col
        ${mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50' : ''}
        lg:relative`}
      >
        {/* Logo */}
        <div
          className={`flex items-center ${
            mobileMenuOpen || sidebarOpen
              ? 'justify-between'
              : 'justify-center flex-col space-y-3'
          } p-4 border-b border-gray-200`}
        >
          {mobileMenuOpen || sidebarOpen ? (
            <>
              <div className='flex items-center space-x-3'>
                <img
                  src='/logo-qk.png'
                  alt='QuickKasir Logo'
                  className='w-8 h-8 object-contain'
                  loading='eager' // ✅ OPTIMIZATION: Eager load critical logo (above fold)
                  decoding='async' // ✅ OPTIMIZATION: Async decoding
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div className='hidden items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600'>
                  <LayoutDashboard className='w-4 h-4 text-white' />
                </div>
                <span className='text-xl font-bold'>
                  <span className='text-blue-900'>Quick</span>
                  <span className='text-green-600'>Kasir</span>
                </span>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setMobileMenuOpen(false);
                  } else {
                    setSidebarOpen(!sidebarOpen);
                  }
                }}
                className='hover:bg-gray-100'
                data-testid='sidebar-toggle'
              >
                <X className='w-4 h-4' />
              </Button>
            </>
          ) : (
            <>
              <img
                src='/logo-qk.png'
                alt='QuickKasir Logo'
                className='w-10 h-10 object-contain'
                loading='eager' // ✅ OPTIMIZATION: Eager load critical logo (above fold)
                decoding='async' // ✅ OPTIMIZATION: Async decoding
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className='hidden items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600'>
                <LayoutDashboard className='w-5 h-5 text-white' />
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setMobileMenuOpen(false);
                  } else {
                    setSidebarOpen(!sidebarOpen);
                  }
                }}
                className='hover:bg-gray-100 p-2'
                data-testid='sidebar-toggle'
              >
                <Menu className='w-5 h-5' />
              </Button>
            </>
          )}
        </div>

        {/* ✅ Business/Outlet Switcher for Mobile - Show in sidebar ONLY on mobile */}
        {(mobileMenuOpen || sidebarOpen) && (
          <div className='px-4 py-3 border-b border-gray-200 space-y-2 lg:hidden'>
            <div className='text-xs font-semibold text-gray-500 uppercase mb-2'>
              Pilih Bisnis & Outlet
            </div>
            <div className='space-y-2'>
              <BusinessSwitcher />
              {currentBusiness && <OutletSwitcher />}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={`flex-1 ${
            mobileMenuOpen || sidebarOpen ? 'p-4' : 'p-2'
          } space-y-1 overflow-y-auto`}
        >
          {menuItems.map((group, groupIndex) => {
            const isExpanded = mobileMenuOpen || sidebarOpen;

            return (
              <div key={group.name} className={groupIndex > 0 ? 'mt-4' : ''}>
                {/* Group Label - Only show when expanded */}
                {isExpanded && (
                  <div className='px-3 mb-2'>
                    <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>
                      {group.name}
                    </p>
                  </div>
                )}

                {/* Group Separator - Show when minimized */}
                {!isExpanded && groupIndex > 0 && (
                  <div className='my-3 border-t border-gray-200'></div>
                )}

                {/* Menu Items */}
                <div className='space-y-1'>
                  {group.items.map(item => {
                    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                    const isActive = location.pathname === item.path || (hasChildren && location.pathname.startsWith('/reports'));
                    const Icon = item.icon;

                    // ✅ FIX: Check premium feature access
                    // Wait for subscription loading to complete before checking access
                    // This prevents menu from being locked incorrectly after reload
                    const isKitchenMenu = item.path === '/kitchen';
                    const isTablesMenu = item.path === '/tables';
                    const isAttendanceMenu = item.path === '/attendance';
                    const isInventoryMenu = item.path === '/inventory';
                    const isPromoMenu = item.path === '/promo';
                    const isStockTransferMenu = item.path === '/stock-transfers';
                    
                    // ✅ FIX: Only check access if subscription is not loading (to prevent false locks after reload)
                    const hasKitchenAccess = subscriptionLoading ? true : (subscriptionFeatures?.has_kitchen_access ?? false);
                    const hasTablesAccess = subscriptionLoading ? true : (subscriptionFeatures?.has_tables_access ?? false);
                    const hasAttendanceAccess = subscriptionLoading ? true : (subscriptionFeatures?.has_attendance_access ?? false);
                    const hasInventoryAccess = subscriptionLoading ? true : (subscriptionFeatures?.has_inventory_access ?? false);
                    const hasPromoAccess = subscriptionLoading ? true : (subscriptionFeatures?.has_promo_access ?? false);
                    const hasStockTransferAccess = subscriptionLoading ? true : (subscriptionFeatures?.has_stock_transfer_access ?? false);
                    
                    const shouldBlockKitchen = isKitchenMenu && !hasKitchenAccess;
                    const shouldBlockTables = isTablesMenu && !hasTablesAccess;
                    const shouldBlockAttendance = isAttendanceMenu && !hasAttendanceAccess;
                    const shouldBlockInventory = isInventoryMenu && !hasInventoryAccess;
                    const shouldBlockPromo = isPromoMenu && !hasPromoAccess;
                    const shouldBlockStockTransfer = isStockTransferMenu && !hasStockTransferAccess;
                    
                    const shouldBlockPremiumFeature = shouldBlockKitchen || shouldBlockTables || 
                      shouldBlockAttendance || shouldBlockInventory || shouldBlockPromo || shouldBlockStockTransfer;
                    
                    const getFeatureName = () => {
                      if (shouldBlockKitchen) return 'kitchen';
                      if (shouldBlockTables) return 'tables';
                      if (shouldBlockAttendance) return 'attendance';
                      if (shouldBlockInventory) return 'inventory';
                      if (shouldBlockPromo) return 'promo';
                      if (shouldBlockStockTransfer) return 'stock_transfer';
                      return null;
                    };

                    if (!hasChildren) {
                      // Special handling for business-management, employee-outlets, and stock-transfers to use React Query refetch
                      const isBusinessManagement = item.path === '/business-management';
                      const isEmployeeOutlets = item.path === '/employee-outlets';
                      const isStockTransfers = item.path === '/stock-transfers';
                      const onClickHandler = (e) => {
                        setMobileMenuOpen(false);
                        if (isBusinessManagement) {
                          handleNavigateToBusinessManagement(e);
                        } else if (isEmployeeOutlets) {
                          handleNavigateToEmployeeOutlets(e);
                        } else if (isStockTransfers) {
                          handleNavigateToStockTransfers(e);
                        }
                      };

                      // ✅ FIX: Block premium features if no access
                      if (shouldBlockPremiumFeature) {
                        return (
                          <div
                            key={item.path}
                            onClick={() => {
                              setAccessDeniedFeature(getFeatureName());
                              setShowAccessDeniedModal(true);
                            }}
                            className={`flex items-center ${
                              isExpanded
                                ? 'space-x-3 px-3 py-2.5'
                                : 'justify-center p-3'
                            } rounded-xl transition-all duration-200 group cursor-pointer opacity-60 ${
                              isActive
                                ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-sm'
                                : 'hover:bg-gray-50 hover:shadow-sm'
                            }`}
                            title={!isExpanded ? item.label : undefined}
                          >
                            <Icon
                              className={`${isExpanded ? 'w-5 h-5' : 'w-6 h-6'} ${
                                isActive
                                  ? item.color
                                  : 'text-gray-500 group-hover:text-gray-700'
                              } transition-all`}
                            />
                            {isExpanded && (
                              <>
                                <span
                                  className={`font-medium ${
                                    isActive
                                      ? 'text-gray-900'
                                      : 'text-gray-600 group-hover:text-gray-900'
                                  }`}
                                >
                                  {item.label}
                                </span>
                                <Lock className="w-4 h-4 text-gray-400 ml-auto" />
                              </>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={onClickHandler}
                          className={`flex items-center ${
                            isExpanded
                              ? 'space-x-3 px-3 py-2.5'
                              : 'justify-center p-3'
                          } rounded-xl transition-all duration-200 group ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-sm'
                              : 'hover:bg-gray-50 hover:shadow-sm'
                          }`}
                          data-testid={`nav-${
                            item.path.replace('/', '') || 'dashboard'
                          }`}
                          title={!isExpanded ? item.label : undefined}
                        >
                          <Icon
                            className={`${isExpanded ? 'w-5 h-5' : 'w-6 h-6'} ${
                              isActive
                                ? item.color
                                : 'text-gray-500 group-hover:text-gray-700'
                            } transition-all`}
                          />
                          {isExpanded && (
                            <span
                              className={`font-medium ${
                                isActive
                                  ? 'text-gray-900'
                                  : 'text-gray-600 group-hover:text-gray-900'
                              }`}
                            >
                              {item.label}
                            </span>
                          )}
                          {isActive && isExpanded && (
                            <div className='w-2 h-2 ml-auto bg-blue-500 rounded-full'></div>
                          )}
                        </Link>
                      );
                    }

                    // ✅ FIX: Check if reports menu and user doesn't have reports access
                    // Check has_reports_access first (configurable from Filament), fallback to has_advanced_reports
                    const isReportsMenu = item.path === '/reports';
                    const hasReportsAccess = subscriptionFeatures?.has_reports_access ?? subscriptionFeatures?.has_advanced_reports ?? false;
                    const shouldBlockReports = isReportsMenu && !hasReportsAccess;
                    
                    const isDropdownOpen = openDropdowns[item.path] ?? (isExpanded && isActive);
                    
                    return (
                      <div key={item.path} className='space-y-1'>
                        <div
                          onClick={() => {
                            if (shouldBlockReports) {
                              // ✅ FIX: Show modal instead of opening dropdown
                              setAccessDeniedFeature('advanced_reports');
                              setShowAccessDeniedModal(true);
                              return;
                            }
                            
                            if (isExpanded) {
                              setOpenDropdowns(prev => ({
                                ...prev,
                                [item.path]: !prev[item.path],
                              }));
                            }
                          }}
                          className={`flex items-center ${
                            isExpanded
                              ? 'space-x-3 px-3 py-2.5'
                              : 'justify-center p-3'
                          } rounded-xl transition-all duration-200 group ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-sm'
                              : 'hover:bg-gray-50 hover:shadow-sm'
                          } ${isExpanded ? 'cursor-pointer' : 'cursor-default'}`}
                          title={!isExpanded ? item.label : undefined}
                        >
                          <Icon
                            className={`${isExpanded ? 'w-5 h-5' : 'w-6 h-6'} ${
                              isActive
                                ? item.color
                                : 'text-gray-500 group-hover:text-gray-700'
                            } transition-all`}
                          />
                          {isExpanded && (
                            <>
                              <span
                                className={`font-medium flex-1 ${
                                  isActive
                                    ? 'text-gray-900'
                                    : 'text-gray-600 group-hover:text-gray-900'
                                }`}
                              >
                                {item.label}
                              </span>
                              {isExpanded && (
                                <ChevronDown
                                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                    isDropdownOpen ? 'rotate-180' : ''
                                  }`}
                                />
                              )}
                            </>
                          )}
                        </div>

                        {isExpanded && isDropdownOpen && (
                          <div className='ml-9 space-y-1'>
                            {item.children.map((child, idx) => {
                              if (child.type === 'heading') {
                                // Get badge color based on heading label
                                const getHeadingBadgeColor = (label) => {
                                  const colorMap = {
                                    'Penjualan': 'bg-green-100 text-green-700 border-green-200',
                                    'Promo': 'bg-purple-100 text-purple-700 border-purple-200',
                                    'Produk': 'bg-blue-100 text-blue-700 border-blue-200',
                                    'Kasir': 'bg-orange-100 text-orange-700 border-orange-200',
                                    'Pelanggan': 'bg-cyan-100 text-cyan-700 border-cyan-200',
                                    'Karyawan': 'bg-yellow-100 text-yellow-700 border-yellow-200',
                                    'Persediaan': 'bg-indigo-100 text-indigo-700 border-indigo-200',
                                    'Pajak': 'bg-red-100 text-red-700 border-red-200',
                                  };
                                  return colorMap[label] || 'bg-gray-100 text-gray-700 border-gray-200';
                                };

                                return (
                                  <div key={`heading-${idx}`} className='mt-3 mb-2 px-3'>
                                    <Badge 
                                      variant="outline" 
                                      className={`${getHeadingBadgeColor(child.label)} text-xs font-semibold px-2 py-0.5`}
                                    >
                                      {child.label}
                                    </Badge>
                                  </div>
                                );
                              }

                              const isChildActive =
                                (location.pathname + location.search) === child.path ||
                                (child.path.startsWith('/reports') && location.pathname.startsWith('/reports') && location.search === child.path.replace('/reports', ''));

                              return (
                                <Link
                                  key={child.path}
                                  to={child.path}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={`flex items-center px-3 py-2 rounded-lg text-sm transition ${
                                    isChildActive
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className='p-4 border-t border-gray-200'>
          <div
            className={`flex items-center ${
              mobileMenuOpen || sidebarOpen ? 'space-x-3' : 'justify-center'
            }`}
          >
            <Avatar
              className={`${
                mobileMenuOpen || sidebarOpen ? 'w-10 h-10' : 'w-12 h-12'
              }`}
            >
              <AvatarImage src='/api/placeholder/40/40' />
              <AvatarFallback className='font-semibold text-white bg-gradient-to-br from-green-500 to-green-700'>
                {user?.name
                  ? user.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'U'}
              </AvatarFallback>
            </Avatar>
            {(mobileMenuOpen || sidebarOpen) && (
              <div className='flex-1'>
                <p className='text-sm font-semibold text-gray-900'>
                  {user?.name || 'User'}
                </p>
                <p className='text-xs text-gray-500'>{user?.email || ''}</p>
                {user?.role && (
                  <Badge className='mt-1 text-xs bg-blue-100 text-blue-800 border-blue-200'>
                    {user.role === 'super_admin'
                      ? 'Super Admin'
                      : user.role === 'owner'
                      ? 'Owner'
                      : user.role === 'admin'
                      ? 'Admin'
                      : user.role === 'kasir'
                      ? 'Kasir'
                      : user.role === 'kitchen'
                      ? 'Kitchen'
                      : user.role === 'waiter'
                      ? 'Waiter'
                      : 'Member'}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex flex-col flex-1 overflow-hidden'>
        {/* Header */}
        <header className='px-4 lg:px-6 py-4 bg-white border-b border-gray-200 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              {/* Mobile Menu Button */}
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className='lg:hidden hover:bg-gray-100 p-2'
              >
                <Menu className='w-5 h-5' />
              </Button>

              {/* ✅ PWA: Back Button - Show when not on dashboard */}
              {/* Temporarily disabled */}
              {/* {shouldShowBackButton && (
                <BackButton
                  fallbackPath='/'
                  variant='ghost'
                  size='sm'
                  className='hidden sm:flex'
                />
              )} */}

              <h1 className='text-lg md:text-2xl font-bold text-gray-900'>
                {menuItems
                  .flatMap(group => group.items)
                  .find(item => item.path === location.pathname)?.label ||
                  'Dashboard'}
              </h1>
            </div>

            <div className='flex items-center space-x-2 md:space-x-4'>
              {/* Subscription Badge - Hidden on small mobile */}
              {currentBusiness?.subscription_info && (
                <div className='hidden sm:block'>
                  <SubscriptionBadge
                    subscription={currentBusiness.subscription_info}
                  />
                </div>
              )}

              {/* Business/Outlet Switcher - Desktop/Tablet ONLY (hidden on mobile, shown in sidebar instead) */}
              <div className='hidden lg:flex items-center gap-2'>
                <BusinessSwitcher />
                {/* Show OutletSwitcher for all roles when business is selected */}
                {currentBusiness && <OutletSwitcher />}
              </div>

              {/* Search - Hidden on mobile */}
              <div className='relative hidden md:block'>
                <Search className='absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2' />
                <Input
                  placeholder='Cari...'
                  className='w-64 pl-10 border-gray-200 bg-gray-50 focus:bg-white'
                  data-testid='search-input'
                />
              </div>

              {/* Notifications */}
              <NotificationBell />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    className='relative w-8 h-8 rounded-full'
                    data-testid='user-menu'
                  >
                    <Avatar className='w-8 h-8'>
                      <AvatarImage src='/api/placeholder/32/32' alt='Admin' />
                      <AvatarFallback className='text-sm text-white bg-gradient-to-br from-green-500 to-green-700'>
                        {user?.name
                          ? user.name
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)
                          : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-56' align='end' forceMount>
                  <DropdownMenuLabel className='font-normal'>
                    <div className='flex flex-col space-y-1'>
                      <p className='text-sm font-medium leading-none'>
                        {user?.name || 'Admin User'}
                      </p>
                      <p className='text-xs leading-none text-muted-foreground'>
                        {user?.email || 'admin@quickkasir.com'}
                      </p>
                    </div>
                  </DropdownMenuLabel>

                  {/* Mobile-only: Business/Outlet Info */}
                  {currentBusiness && (
                    <>
                      <DropdownMenuSeparator className='sm:hidden' />
                      <DropdownMenuLabel className='font-normal sm:hidden'>
                        <div className='flex flex-col space-y-1'>
                          {user?.role === 'kasir' ? (
                            <>
                              <p className='text-xs text-muted-foreground'>
                                Outlet Aktif
                              </p>
                              <p className='text-sm font-medium'>
                                {currentOutlet?.name || 'Belum ada outlet'}
                              </p>
                              <p className='text-xs text-gray-500'>
                                {currentBusiness.name}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className='text-xs text-muted-foreground'>
                                Bisnis Aktif
                              </p>
                              <p className='text-sm font-medium'>
                                {currentBusiness.name}
                              </p>
                              {currentBusiness.subscription_info && (
                                <p className='text-xs text-blue-600'>
                                  {currentBusiness.subscription_info.plan_name}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </DropdownMenuLabel>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate('/settings/profile')}
                    data-testid='profile-menu'
                  >
                    <User className='w-4 h-4 mr-2' />
                    <span>Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/settings/change-password')}
                    data-testid='change-password-menu'
                  >
                    <Lock className='w-4 h-4 mr-2' />
                    <span>Ganti Password</span>
                  </DropdownMenuItem>
                  
                  {/* Push Notification Settings - All authenticated users */}
                  <DropdownMenuItem
                    onClick={() => navigate('/settings/push-notifications')}
                    data-testid='push-notifications-menu'
                  >
                    <Bell className='w-4 h-4 mr-2' />
                    <span>Push Notifications</span>
                  </DropdownMenuItem>
                  
                  {/* Refresh Subscription Features Button - Only for Owner/Super Admin */}
                  {(user?.role === 'owner' || user?.role === 'super_admin') && (
                    <DropdownMenuItem
                      onClick={handleRefreshSubscriptionFeatures}
                      data-testid='refresh-features-menu'
                    >
                      <RefreshCw className='w-4 h-4 mr-2' />
                      <span>Refresh Akses Fitur</span>
                    </DropdownMenuItem>
                  )}

                  {/* Force Update Button */}
                  <DropdownMenuItem
                    onClick={handleForceUpdate}
                    disabled={isUpdating}
                    data-testid='force-update-menu'
                    className={isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
                    <span>{isUpdating ? 'Memperbarui...' : 'Update Aplikasi'}</span>
                  </DropdownMenuItem>

                  {/* Mobile-only: Business Management Link */}
                  {(user?.role === 'owner' || user?.role === 'super_admin') && (
                    <DropdownMenuItem
                      onClick={handleNavigateToBusinessManagement}
                      className='sm:hidden'
                    >
                      <Building2 className='w-4 h-4 mr-2' />
                      <span>Kelola Bisnis</span>
                    </DropdownMenuItem>
                  )}

                  {/* Mobile-only: Business Switcher for Kasir */}
                  {user?.role === 'kasir' && (
                    <DropdownMenuItem
                      onClick={() => {
                        // Trigger business switcher dropdown
                        const businessSwitcher = document.querySelector(
                          '[data-testid="business-switcher"]'
                        );
                        if (businessSwitcher) {
                          businessSwitcher.click();
                        }
                      }}
                      className='sm:hidden'
                    >
                      <Building2 className='w-4 h-4 mr-2' />
                      <span>Pilih Bisnis</span>
                    </DropdownMenuItem>
                  )}

                  {(user?.role === 'owner' || user?.role === 'super_admin') && (
                    <DropdownMenuItem
                      onClick={() => navigate('/subscription-settings')}
                      data-testid='subscription-menu'
                    >
                      <Crown className='w-4 h-4 mr-2' />
                      <span>Subscription</span>
                    </DropdownMenuItem>
                  )}
                  
                  {/* PWA Install Button - Show if not installed */}
                  {!isPWAInstalled && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleInstallPWA}
                        data-testid='install-pwa-menu'
                        className={`${deferredPrompt ? 'text-green-600 focus:text-green-700' : 'text-gray-500'}`}
                        disabled={!deferredPrompt}
                      >
                        <Smartphone className='w-4 h-4 mr-2' />
                        <span>
                          {deferredPrompt ? 'Install Aplikasi' : 'Install Aplikasi (Tidak Tersedia)'}
                        </span>
                      </DropdownMenuItem>
                      {!deferredPrompt && (
                        <div className='px-2 py-1 text-xs text-gray-500'>
                          Pastikan menggunakan HTTPS dan manifest.json valid
                        </div>
                      )}
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    data-testid='logout-menu'
                  >
                    <LogOut className='w-4 h-4 mr-2' />
                    <span>Keluar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className='flex-1 p-6 overflow-auto'>
          <div className='fade-in'>
            <Outlet />
          </div>
        </main>
        
        {/* PWA Sync Indicator */}
        <SyncIndicator />
      </div>

      {/* Access Denied Modal */}
      <AccessDeniedModal
        open={showAccessDeniedModal}
        onClose={() => {
          setShowAccessDeniedModal(false);
          setAccessDeniedFeature(null);
        }}
        feature={accessDeniedFeature}
        requiredPlan="Professional"
      />
    </div>
  );
};

export default Layout;
