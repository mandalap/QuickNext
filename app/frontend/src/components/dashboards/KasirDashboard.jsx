import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  History,
  LogIn,
  LogOut,
  Package,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { queryKeys } from '../../config/reactQuery';
import { useShiftOrders } from '../../hooks/useShiftOrders';
import { salesService } from '../../services/salesService';
import { shiftService } from '../../services/shift.service';
import { retryNetworkErrors } from '../../utils/retry.utils';
import CloseShiftModal from '../modals/CloseShiftModal';
import OpenShiftModal from '../modals/OpenShiftModal';
import ShiftHistoryModal from '../modals/ShiftHistoryModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Skeleton, SkeletonStats } from '../ui/skeleton';
import SmartPagination from '../ui/SmartPagination';

const KasirDashboard = () => {
  const navigate = useNavigate();
  const { currentBusiness } = useAuth();

  // Shift state
  const [activeShift, setActiveShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);

  // Transaction data state
  const [todayStats, setTodayStats] = useState({
    totalTransactions: 0,
    totalSales: 0,
    totalItems: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // ✅ FIX: Pagination state untuk "Transaksi Terakhir"
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsPagination, setTransactionsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  // ✅ FIX: Gunakan custom hook untuk orders dari shift
  const { shiftOrders, usingShiftOrders, loadOrdersFromShift } =
    useShiftOrders();

  // ✅ FIX: Load transaction data dengan pagination + OPTIMIZATION: Retry logic
  const loadTransactionData = async (page = transactionsPage) => {
    setLoadingData(true);
    try {
      console.log('🔄 Loading transaction data...', { page });

      // ✅ FIX: Jika ada shift aktif, gunakan data dari shift (sama dengan modal tutup shift)
      // Jika tidak ada shift aktif, gunakan data dari salesService.getStats
      if (activeShift && activeShift.total_transactions !== undefined) {
        console.log('✅ Using shift data for stats:', activeShift);

        // Hitung total items dari orders dalam shift (jika tersedia)
        let totalItems = 0;
        if (activeShift.orders && Array.isArray(activeShift.orders)) {
          totalItems = activeShift.orders.reduce((sum, order) => {
            if (order.items && Array.isArray(order.items)) {
              return (
                sum +
                order.items.reduce(
                  (itemSum, item) => itemSum + (item.quantity || 0),
                  0
                )
              );
            }
            return sum;
          }, 0);
        } else {
          // Fallback: gunakan data dari salesService untuk items
          const statsResult = await salesService.getStats({
            date_range: 'today',
          });
          if (statsResult.success && statsResult.data) {
            totalItems = statsResult.data.total_items || 0;
          }
        }

        setTodayStats({
          totalTransactions: activeShift.total_transactions || 0,
          totalSales: activeShift.expected_total || 0,
          totalItems: totalItems,
        });

        console.log('✅ Stats from shift:', {
          totalTransactions: activeShift.total_transactions,
          totalSales: activeShift.expected_total,
          totalItems: totalItems,
        });
      } else {
        // ✅ OPTIMIZATION: Tidak ada shift aktif, gunakan retry logic
        const statsResult = await retryNetworkErrors(
          () =>
            salesService.getStats({
              date_range: 'today',
            }),
          { maxRetries: 3, initialDelay: 1000 }
        );
        console.log('📊 Stats result:', statsResult);

        if (statsResult.success && statsResult.data) {
          const data = statsResult.data;
          console.log('✅ Stats data:', data);
          setTodayStats({
            totalTransactions: data.total_transactions || 0,
            totalSales: data.total_sales || 0,
            totalItems: data.total_items || 0,
          });
        } else {
          console.log('❌ No stats data or error:', statsResult);
        }
      }

      // ✅ FIX: Gunakan custom hook untuk load orders dari shift
      let ordersData = [];
      let ordersResult;

      // Load orders dari shift menggunakan hook
      const shiftOrdersResult = await loadOrdersFromShift({
        activeShift,
        dateRange: 'today',
        searchTerm: '',
        statusFilter: 'all',
      });

      if (shiftOrdersResult.fromShift && shiftOrdersResult.success) {
        // Menggunakan orders dari shift - client-side pagination
        const allOrdersData = shiftOrdersResult.orders || [];
        const totalItems = allOrdersData.length;
        const itemsPerPage = 10;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        // ✅ FIX: Apply client-side pagination untuk orders dari shift detail
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        ordersData = allOrdersData.slice(startIndex, endIndex);

        // ✅ FIX: Update pagination info
        setTransactionsPagination({
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
          itemsPerPage: itemsPerPage,
        });

        console.log(
          '✅ Loaded orders from shift detail (via hook) with pagination:',
          {
            shift_id: activeShift?.id,
            total_orders_count: allOrdersData.length,
            displayed_orders_count: ordersData.length,
            page: page,
            totalPages: totalPages,
            shift_total_transactions: activeShift?.total_transactions,
          }
        );
      } else {
        // ✅ FIX: Fallback ke getOrders API yang sudah di-filter berdasarkan shift_id dengan pagination
        // Backend sudah diupdate untuk filter berdasarkan shift_id aktif (untuk paid orders)
        // dan tetap menampilkan unpaid orders dari outlet yang sama
        if (activeShift && activeShift.id) {
          // ✅ FIX: Gunakan pagination untuk "Transaksi Terakhir"
          ordersResult = await salesService.getOrders({
            page: page,
            limit: 10, // ✅ FIX: 10 transactions per page
            date_range: 'today', // ✅ FIX: Gunakan 'today' agar backend filter berdasarkan shift_id
          });

          // ✅ FIX: Update pagination info dari API response
          if (ordersResult && ordersResult.success && ordersResult.data) {
            const paginationInfo = {
              currentPage: ordersResult.data.current_page || page,
              totalPages: ordersResult.data.last_page || 1,
              totalItems: ordersResult.data.total || 0,
              itemsPerPage: ordersResult.data.per_page || 10,
            };
            setTransactionsPagination(paginationInfo);
          }
        } else {
          // ✅ OPTIMIZATION: Tidak ada shift aktif, gunakan retry logic
          ordersResult = await retryNetworkErrors(
            () =>
              salesService.getOrders({
                page: page,
                limit: 10, // ✅ FIX: 10 transactions per page
                date_range: 'today',
              }),
            { maxRetries: 3, initialDelay: 1000 }
          );

          // ✅ FIX: Update pagination info dari API response
          if (ordersResult && ordersResult.success && ordersResult.data) {
            const paginationInfo = {
              currentPage: ordersResult.data.current_page || page,
              totalPages: ordersResult.data.last_page || 1,
              totalItems: ordersResult.data.total || 0,
              itemsPerPage: ordersResult.data.per_page || 10,
            };
            setTransactionsPagination(paginationInfo);
          }
        }

        // Extract orders dari hasil API
        if (ordersResult && ordersResult.success && ordersResult.data) {
          if (
            ordersResult.data.orders &&
            Array.isArray(ordersResult.data.orders)
          ) {
            ordersData = ordersResult.data.orders;
          } else if (Array.isArray(ordersResult.data)) {
            ordersData = ordersResult.data;
          }
        }
      }

      console.log('📋 Final ordersData:', {
        source:
          ordersData.length > 0 && usingShiftOrders
            ? 'shift_detail'
            : 'getOrders_API',
        count: ordersData.length,
      });

      // ✅ FIX: Proses ordersData yang sudah ter-load (baik dari shift detail atau getOrders API)
      // ✅ FIX: Backend sudah diupdate untuk filter berdasarkan shift_id aktif untuk paid orders
      // dan tetap menampilkan unpaid orders dari outlet yang sama
      if (ordersData.length > 0) {
        // ✅ FIX: Orders dari shift detail hanya berisi paid orders dari shift aktif
        // Orders dari getOrders API sudah di-filter: (shift_id AND paid) OR (unpaid AND outlet_id)
        // Jadi tidak perlu filter lagi di frontend, langsung tampilkan semua
        const normalized = (ordersData || [])
          .map(order => {
            // ✅ FIX: Gunakan waktu pembayaran (paid_at atau completed_at) bukan waktu order dibuat
            // Untuk transaksi yang sudah dibayar, gunakan waktu pembayaran terakhir
            const paymentTime =
              order.paid_at ||
              order.completed_at ||
              order.updated_at ||
              order.created_at ||
              order.time;

            return {
              ...order,
              // Override time untuk digunakan sebagai waktu pembayaran
              payment_time: paymentTime,
              time: paymentTime,
            };
          })
          // ✅ FIX: Sort berdasarkan waktu pembayaran (terbaru di atas)
          .sort((a, b) => {
            // Priority: payment_time > paid_at > completed_at > updated_at > created_at
            const getPaymentTime = order => {
              return (
                order.payment_time ||
                order.paid_at ||
                order.completed_at ||
                order.updated_at ||
                order.created_at ||
                order.time
              );
            };
            const timeA = new Date(getPaymentTime(a) || 0);
            const timeB = new Date(getPaymentTime(b) || 0);
            return timeB - timeA; // Descending (terbaru dulu)
          });

        console.log('✅ Recent transactions loaded:', {
          total: normalized.length,
          total_from_api: ordersData.length,
          shift_total_transactions: activeShift?.total_transactions,
          transactions: normalized.map(t => ({
            id: t.id,
            order_number: t.order_number || t.id,
            total: t.total_amount || t.amount || t.total,
            payment_status: t.payment_status,
            payment_time: t.payment_time || t.time,
            created_at: t.created_at,
          })),
        });

        // ✅ FIX: Warning jika jumlah transaksi yang ditampilkan berbeda dengan total transaksi shift
        if (activeShift && activeShift.total_transactions) {
          if (normalized.length < activeShift.total_transactions) {
            console.warn('⚠️ WARNING: Ada transaksi yang tidak ditampilkan!', {
              shift_total: activeShift.total_transactions,
              displayed_count: normalized.length,
              missing_count: activeShift.total_transactions - normalized.length,
            });
          }
        }

        // ✅ FIX: Update pagination jika belum di-update dari API (untuk shift detail)
        if (!transactionsPagination.totalItems && normalized.length > 0) {
          const totalItems = normalized.length;
          const itemsPerPage = 10;
          const totalPages = Math.ceil(totalItems / itemsPerPage);
          setTransactionsPagination({
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems,
            itemsPerPage: itemsPerPage,
          });
        }

        setRecentTransactions(normalized);
      } else {
        console.log('❌ No orders data found', {
          ordersData_length: ordersData.length,
          ordersResult: ordersResult,
        });
        setRecentTransactions([]);
        // ✅ FIX: Reset pagination jika tidak ada data
        setTransactionsPagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
        });
      }
    } catch (error) {
      console.error('Error loading transaction data:', error);
      toast.error('Gagal memuat data transaksi');
    } finally {
      setLoadingData(false);
    }
  };

  // ✅ FIX: Load shift on mount - React Query will handle this automatically
  // No need for manual loadActiveShift call

  // ✅ FIX: Handle page change untuk "Transaksi Terakhir"
  const handleTransactionsPageChange = newPage => {
    setTransactionsPage(newPage);
    loadTransactionData(newPage);
  };

  // ✅ FIX: Load transaction data setelah activeShift di-load atau berubah
  useEffect(() => {
    if (!loadingShift) {
      // Reset ke page 1 saat shift berubah
      setTransactionsPage(1);
      loadTransactionData(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShift?.id, loadingShift]); // ✅ FIX: Hanya trigger saat shift.id berubah

  // ✅ FIX: Load transaction data saat page berubah
  useEffect(() => {
    if (!loadingShift && activeShift) {
      loadTransactionData(transactionsPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionsPage]); // ✅ FIX: Hanya trigger saat page berubah

  // ✅ FIX: Use React Query for active shift
  const {
    data: activeShiftData,
    isLoading: loadingActiveShift,
    error: shiftError,
    refetch: refetchActiveShift,
  } = useQuery({
    queryKey: queryKeys.shifts.active(null), // Active shift for current user
    queryFn: async () => {
      const result = await retryNetworkErrors(
        () => shiftService.getActiveShift(),
        { maxRetries: 3, initialDelay: 1000 }
      );
      
      if (result.success && result.data?.has_active_shift) {
        return result.data.data;
      }
      return null;
    },
    enabled: !!currentBusiness?.id, // ✅ FIX: Only fetch when business ID is available
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchInterval: (data) => {
      // ✅ FIX: Only auto-refresh if business ID is available
      return currentBusiness?.id ? 30 * 1000 : false;
    },
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  // ✅ FIX: Update activeShift state when React Query data changes
  useEffect(() => {
    if (activeShiftData !== undefined) {
      setActiveShift(activeShiftData);
      setLoadingShift(loadingActiveShift);
    }
  }, [activeShiftData, loadingActiveShift]);

  // ✅ FIX: Handle refresh using React Query refetch
  const handleRefresh = useCallback(async () => {
    if (loadingActiveShift || loadingData) {
      return; // Prevent multiple simultaneous refreshes
    }

    try {
      await Promise.all([
        refetchActiveShift(),
        loadTransactionData(transactionsPage),
      ]);
      toast.success('Data berhasil diperbarui');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Gagal memuat ulang data');
    }
  }, [refetchActiveShift, loadTransactionData, transactionsPage, loadingActiveShift, loadingData]);

  // ✅ FIX: Keyboard shortcut F5 untuk refresh tanpa reload halaman
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Skip jika sedang di input/textarea/contentEditable
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      // F5 untuk refresh - prevent default browser reload
      if (event.key === 'F5') {
        event.preventDefault();
        event.stopPropagation();
        if (!loadingActiveShift && !loadingData) {
          handleRefresh();
        }
      }

      // R untuk refresh (optional)
      if ((event.key === 'r' || event.key === 'R') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        if (!loadingActiveShift && !loadingData) {
          handleRefresh();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh, loadingActiveShift, loadingData]);

  // ✅ FIX: loadActiveShift now uses React Query refetch
  const loadActiveShift = useCallback(async () => {
    await refetchActiveShift();
  }, [refetchActiveShift]);

  const handleOpenShiftSuccess = data => {
    setActiveShift(data.data);
    toast.success('Shift berhasil dibuka! Anda dapat mulai transaksi.');
  };

  const handleCloseShiftSuccess = () => {
    setActiveShift(null);
    toast.success(
      'Shift berhasil ditutup! Terima kasih atas kerja keras Anda.'
    );
  };

  // Format currency helper
  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Dynamic stats based on real data
  const statsCards = [
    {
      title: 'Transaksi Saya',
      value: todayStats.totalTransactions.toString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Total Penjualan',
      value: formatCurrency(todayStats.totalSales),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      title: 'Item Terjual',
      value: todayStats.totalItems.toString(),
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  ];

  // Helper function to format time ago
  const getTimeAgo = dateString => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam lalu`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} hari lalu`;
  };

  const getStatusBadge = status => {
    const statusConfig = {
      completed: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Selesai',
      },
      processing: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Diproses',
      },
    };
    const config = statusConfig[status] || statusConfig.processing;
    return (
      <Badge
        className={`${config.color} border font-medium text-[10px] md:text-xs px-2 py-0.5`}
      >
        {config.label}
      </Badge>
    );
  };

  return (
    <div className='space-y-4 md:space-y-6'>
      {/* Welcome Banner */}
      <div className='bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-lg'>
        <div className='flex items-center justify-between'>
          <div className='flex-1'>
            <h2 className='text-lg md:text-xl font-bold mb-1'>
              Dashboard Kasir
            </h2>
            <p className='text-blue-100 text-xs md:text-sm mb-2 md:mb-3'>
              Kelola transaksi dengan cepat dan mudah
            </p>
            <div className='flex flex-wrap items-center gap-1 md:gap-2 text-xs md:text-sm'>
              <Clock className='w-3 h-3 md:w-4 md:h-4' />
              <span>
                {new Date().toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                WIB
              </span>
              <span className='hidden sm:inline mx-1'>•</span>
              <span className='hidden sm:inline'>
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>
          </div>
          <div className='flex-shrink-0 ml-4 flex gap-2'>
            <Button
              onClick={async () => {
                try {
                  const loadingToast = toast.loading(
                    'Memperbarui data dashboard...'
                  );

                  // ✅ FIX: Recalculate shift data saat refresh manual
                  setLoadingShift(true);
                  try {
                    const result = await shiftService.getActiveShift(true); // true = recalculate
                    if (result.success && result.data?.has_active_shift) {
                      setActiveShift(result.data.data);
                    } else {
                      setActiveShift(null);
                    }
                  } catch (error) {
                    console.error('Error refreshing shift:', error);
                    setActiveShift(null);
                  } finally {
                    setLoadingShift(false);
                  }

                  await loadTransactionData();

                  // Tunggu sebentar untuk memastikan state sudah update
                  setTimeout(() => {
                    toast.dismiss(loadingToast);
                    toast.success('Data dashboard berhasil diperbarui', {
                      duration: 2000,
                      icon: '✅',
                    });
                  }, 500);
                } catch (error) {
                  console.error('Error refreshing data:', error);
                  toast.error('Gagal memperbarui data dashboard');
                }
              }}
              disabled={loadingShift || loadingData}
              variant='outline'
              className={`h-12 px-4 font-semibold text-sm shadow-lg border-2 bg-white text-blue-600 hover:bg-blue-50 border-blue-200 transition-all ${
                loadingShift || loadingData
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 active:scale-95'
              }`}
              title='Refresh data dashboard (tanpa reload halaman)'
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  loadingShift || loadingData ? 'animate-spin' : ''
                }`}
              />
              {loadingShift || loadingData ? 'Memuat...' : 'Refresh'}
            </Button>
            <Button
              onClick={() => navigate('/cashier/pos')}
              disabled={!activeShift}
              className={`h-12 px-6 font-semibold text-sm shadow-lg border-2 ${
                activeShift
                  ? 'bg-white text-blue-600 hover:bg-blue-50 border-white'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
              title={
                !activeShift
                  ? 'Buka shift terlebih dahulu untuk mengakses POS'
                  : 'Akses POS untuk transaksi'
              }
            >
              <CreditCard className='w-4 h-4 mr-2' />
              {activeShift ? 'Buka POS' : 'POS Tidak Tersedia'}
            </Button>
          </div>
        </div>
      </div>

      {/* Shift Status Banner - ✅ OPTIMIZATION: Show skeleton saat loading */}
      {loadingShift ? (
        <Skeleton className='h-32 md:h-40 w-full rounded-xl' />
      ) : (
        <>
          {activeShift ? (
            <Card className='border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md'>
              <CardContent className='p-4 md:p-6'>
                <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
                  <div className='flex-1 text-center sm:text-left'>
                    <div className='flex items-center gap-2 mb-2 justify-center sm:justify-start'>
                      <CheckCircle className='w-5 h-5 text-green-600' />
                      <h3 className='text-base md:text-lg font-bold text-gray-900'>
                        Shift Aktif
                      </h3>
                    </div>
                    <p className='text-xs md:text-sm text-gray-700'>
                      <strong>{activeShift.shift_name}</strong> • Modal: Rp{' '}
                      {Number(activeShift.opening_balance).toLocaleString(
                        'id-ID'
                      )}
                    </p>
                    <p className='text-xs text-gray-600 mt-1'>
                      Dibuka:{' '}
                      {new Date(activeShift.opened_at).toLocaleTimeString(
                        'id-ID',
                        { hour: '2-digit', minute: '2-digit' }
                      )}{' '}
                      WIB
                    </p>
                  </div>
                  <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
                    <Button
                      onClick={() => navigate('/cashier/pos')}
                      disabled={!activeShift}
                      className={`h-12 px-6 font-semibold text-sm shadow-lg w-full sm:w-auto ${
                        activeShift
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={
                        !activeShift
                          ? 'Buka shift terlebih dahulu untuk mengakses POS'
                          : 'Akses POS untuk transaksi'
                      }
                    >
                      <CreditCard className='w-4 h-4 mr-2' />
                      {activeShift ? 'Buka POS' : 'POS Tidak Tersedia'}
                    </Button>
                    <div className='flex gap-2'>
                      <Button
                        onClick={() => setHistoryModal(true)}
                        variant='outline'
                        className='h-12 px-4 sm:px-6 border-blue-300 text-blue-600 hover:bg-blue-50 font-semibold text-sm flex-1 sm:flex-none'
                      >
                        <History className='w-4 h-4 mr-2' />
                        Riwayat
                      </Button>
                      <Button
                        onClick={() => setCloseShiftModal(true)}
                        variant='outline'
                        className='h-12 px-4 sm:px-6 border-red-300 text-red-600 hover:bg-red-50 font-semibold text-sm flex-1 sm:flex-none'
                      >
                        <LogOut className='w-4 h-4 mr-2' />
                        Tutup Shift
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className='border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 shadow-md'>
              <CardContent className='p-4 md:p-6'>
                <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
                  <div className='flex-1 text-center sm:text-left'>
                    <div className='flex items-center gap-2 mb-2 justify-center sm:justify-start'>
                      <AlertCircle className='w-5 h-5 text-orange-600' />
                      <h3 className='text-base md:text-lg font-bold text-gray-900'>
                        Belum Buka Shift
                      </h3>
                    </div>
                    <p className='text-xs md:text-sm text-gray-700'>
                      Anda harus membuka shift terlebih dahulu sebelum melakukan
                      transaksi
                    </p>
                  </div>
                  <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
                    <Button
                      onClick={async () => {
                        // ✅ Double check: Refresh shift status sebelum buka modal
                        await loadActiveShift();
                        if (activeShift) {
                          toast.error(
                            'Anda sudah memiliki shift yang aktif. Tutup shift sebelumnya terlebih dahulu.'
                          );
                          return;
                        }
                        setOpenShiftModal(true);
                      }}
                      className='w-full sm:w-auto h-12 px-6 md:px-8 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-semibold text-sm shadow-lg'
                    >
                      <LogIn className='w-4 h-4 mr-2' />
                      Buka Shift
                    </Button>
                    <Button
                      onClick={() => setHistoryModal(true)}
                      variant='outline'
                      className='w-full sm:w-auto h-12 px-6 border-blue-300 text-blue-600 hover:bg-blue-50 font-semibold text-sm'
                    >
                      <History className='w-4 h-4 mr-2' />
                      Riwayat Shift
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Today's Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4'>
        {loadingData || loadingShift
          ? // ✅ OPTIMIZATION: Menggunakan SkeletonStats component
            Array.from({ length: 3 }).map((_, index) => (
              <SkeletonStats key={index} className='h-32 md:h-36' />
            ))
          : statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  className={`${stat.bgColor} ${stat.borderColor} border-2 shadow-sm hover:shadow-md transition-shadow`}
                >
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6'>
                    <CardTitle className='text-xs md:text-sm font-medium text-gray-700'>
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent className='px-4 pb-4 md:px-6 md:pb-6'>
                    <div className='text-xl md:text-2xl lg:text-3xl font-bold text-gray-900'>
                      {stat.value}
                    </div>
                    <p className='text-[10px] md:text-xs text-gray-600 mt-1'>
                      Hari ini
                    </p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Recent Transactions */}
      <Card className='shadow-md'>
        <CardHeader className='p-4 md:p-6'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
            <div>
              <CardTitle className='text-base md:text-lg font-semibold'>
                Transaksi Terakhir
              </CardTitle>
              <CardDescription className='text-xs md:text-sm mt-1'>
                Transaksi yang baru saja Anda selesaikan
              </CardDescription>
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => loadTransactionData(transactionsPage)}
                disabled={loadingData}
                className='text-xs md:text-sm'
              >
                <RefreshCw
                  className={`w-3 h-3 mr-1 ${
                    loadingData ? 'animate-spin' : ''
                  }`}
                />
                Refresh
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setTransactionsPage(1);
                  loadTransactionData(1);
                }}
                disabled={loadingData}
                className='text-xs md:text-sm'
              >
                Reset
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => navigate('/sales')}
                className='text-xs md:text-sm w-full sm:w-auto'
              >
                Lihat Semua
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='p-4 md:p-6 pt-0'>
          {loadingData || loadingShift ? (
            // ✅ OPTIMIZATION: Menggunakan SkeletonListItem component
            <div className='space-y-2 md:space-y-3'>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className='h-16 md:h-20 w-full rounded-lg'
                />
              ))}
            </div>
          ) : (() => {
              console.log(
                '🔍 Render check - recentTransactions:',
                recentTransactions
              );
              console.log(
                '🔍 Render check - recentTransactions.length:',
                recentTransactions.length
              );
              console.log(
                '🔍 Render check - recentTransactions type:',
                typeof recentTransactions
              );
              return recentTransactions.length > 0;
            })() ? (
            <div className='space-y-2 md:space-y-3'>
              {recentTransactions.map((transaction, index) => (
                <div
                  key={transaction.id || index}
                  className='flex items-center justify-between p-3 md:p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors'
                >
                  <div className='flex items-center gap-2 md:gap-3 flex-1 min-w-0'>
                    <div className='w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0'>
                      <CheckCircle className='w-4 h-4 md:w-5 md:h-5 text-white' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='font-medium text-gray-900 text-sm md:text-base truncate'>
                        {transaction.customer_name ||
                          transaction.customer ||
                          'Walk-in Customer'}
                      </p>
                      <div className='flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-gray-500'>
                        <span>
                          {transaction.order_number || transaction.id}
                        </span>
                        <span>•</span>
                        <span className='truncate'>
                          {getTimeAgo(
                            transaction.payment_time ||
                              transaction.completed_at ||
                              transaction.paid_at ||
                              transaction.updated_at ||
                              transaction.created_at ||
                              transaction.time
                          )}
                        </span>
                        {transaction.payment_method && (
                          <>
                            <span>•</span>
                            <span
                              className={`font-medium px-1.5 py-0.5 rounded ${
                                transaction.payment_method === 'cash'
                                  ? 'bg-green-100 text-green-700'
                                  : transaction.payment_method === 'card'
                                  ? 'bg-blue-100 text-blue-700'
                                  : transaction.payment_method === 'qris'
                                  ? 'bg-purple-100 text-purple-700'
                                  : transaction.payment_method === 'transfer'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {transaction.payment_method === 'cash'
                                ? 'Cash'
                                : transaction.payment_method === 'card'
                                ? 'Card'
                                : transaction.payment_method === 'qris'
                                ? 'QRIS'
                                : transaction.payment_method === 'transfer'
                                ? 'Transfer'
                                : transaction.payment_method}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='text-right flex-shrink-0 ml-2'>
                    <p className='font-bold text-gray-900 text-sm md:text-base mb-1'>
                      {formatCurrency(
                        transaction.total_amount || transaction.amount
                      )}
                    </p>
                    {getStatusBadge(transaction.status || 'completed')}
                  </div>
                </div>
              ))}

              {/* ✅ FIX: Smart Pagination untuk "Transaksi Terakhir" */}
              {transactionsPagination.totalPages > 1 && (
                <div className='mt-6 pt-4 border-t'>
                  <SmartPagination
                    currentPage={transactionsPagination.currentPage || 1}
                    totalPages={transactionsPagination.totalPages || 1}
                    onPageChange={handleTransactionsPageChange}
                    itemsPerPage={transactionsPagination.itemsPerPage || 10}
                    totalItems={transactionsPagination.totalItems || 0}
                    isLoading={loadingData}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className='text-center py-8'>
              <CheckCircle className='w-12 h-12 text-gray-300 mx-auto mb-3' />
              <p className='text-gray-500 text-sm'>
                Belum ada transaksi hari ini
              </p>
              <p className='text-gray-400 text-xs mt-1'>
                Transaksi akan muncul di sini setelah Anda melakukan penjualan
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions & Tips */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6'>
        {/* Quick Actions */}
        <Card className='bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-md'>
          <CardHeader className='p-4 md:p-6'>
            <CardTitle className='text-base md:text-lg font-semibold flex items-center'>
              <CreditCard className='w-4 h-4 md:w-5 md:h-5 mr-2 text-green-600' />
              Aksi Cepat
            </CardTitle>
          </CardHeader>
          <CardContent className='p-4 md:p-6 pt-0'>
            <div className='space-y-3'>
              <Button
                onClick={() => navigate('/cashier/pos')}
                disabled={!activeShift}
                className={`w-full h-12 font-semibold text-sm shadow-lg ${
                  activeShift
                    ? 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={
                  !activeShift
                    ? 'Buka shift terlebih dahulu untuk mengakses POS'
                    : 'Akses POS untuk transaksi'
                }
              >
                <CreditCard className='w-4 h-4 mr-2' />
                {activeShift
                  ? 'Buka POS - Mulai Transaksi'
                  : 'POS Tidak Tersedia - Buka Shift Dulu'}
              </Button>
              <Button
                onClick={() => navigate('/sales')}
                variant='outline'
                className='w-full h-10 border-green-300 text-green-600 hover:bg-green-50 font-medium text-sm'
              >
                <ShoppingCart className='w-4 h-4 mr-2' />
                Lihat Semua Transaksi
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card className='bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 shadow-md'>
          <CardHeader className='p-4 md:p-6'>
            <CardTitle className='text-base md:text-lg font-semibold flex items-center'>
              <AlertCircle className='w-4 h-4 md:w-5 md:h-5 mr-2 text-purple-600' />
              Tips Kasir
            </CardTitle>
          </CardHeader>
          <CardContent className='p-4 md:p-6 pt-0'>
            <ul className='space-y-2 md:space-y-3 text-xs md:text-sm text-gray-700'>
              <li className='flex items-start'>
                <CheckCircle className='w-3 h-3 md:w-4 md:h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0' />
                <span>
                  Pastikan jumlah uang yang diterima sesuai dengan total
                  transaksi
                </span>
              </li>
              <li className='flex items-start'>
                <CheckCircle className='w-3 h-3 md:w-4 md:h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0' />
                <span>
                  Selalu berikan struk kepada pelanggan setelah transaksi
                  selesai
                </span>
              </li>
              <li className='flex items-start'>
                <CheckCircle className='w-3 h-3 md:w-4 md:h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0' />
                <span>Cek stok produk jika ada notifikasi stok menipis</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Shift Modals */}
      <OpenShiftModal
        open={openShiftModal}
        onClose={() => setOpenShiftModal(false)}
        onSuccess={handleOpenShiftSuccess}
      />
      <CloseShiftModal
        open={closeShiftModal}
        onClose={() => setCloseShiftModal(false)}
        shift={activeShift}
        onSuccess={handleCloseShiftSuccess}
      />
      <ShiftHistoryModal
        open={historyModal}
        onClose={() => setHistoryModal(false)}
      />
    </div>
  );
};

export default KasirDashboard;
