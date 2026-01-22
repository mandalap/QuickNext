import {
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Clock,
  Coffee,
  Edit,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { queryKeys } from '../../config/reactQuery';
import { kitchenService } from '../../services/kitchen.service';
import { tableService } from '../../services/table.service';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const WaiterDashboard = () => {
  const navigate = useNavigate();
  const { currentOutlet, currentBusiness, outlets, user } = useAuth();

  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]); // ✅ Always initialize as array
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  // ✅ FIX: Track if we've ever loaded data successfully
  const hasLoadedDataRef = useRef(false);

  // Table pagination and search states
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [tableItemsPerPage, setTableItemsPerPage] = useState(10); // 10 tables per page
  const [tableTotal, setTableTotal] = useState(0);
  const [stats, setStats] = useState({
    occupied: 0,
    available: 0,
    reserved: 0,
    totalOrders: 0,
    totalSales: 0,
  });

  // ✅ FIX: Use React Query for tables
  const {
    data: tablesData,
    isLoading: loadingTables,
    error: tablesError,
    refetch: refetchTables,
  } = useQuery({
    queryKey: queryKeys.tables.list(
      currentBusiness?.id,
      currentOutlet?.id,
      {
        search: tableSearchTerm,
        page: tableCurrentPage,
        per_page: tableItemsPerPage,
      }
    ),
    queryFn: async () => {
      if (!currentOutlet || !currentBusiness) {
        return []; // ✅ FIX: Return empty array instead of null
      }

      const params = {
        search: tableSearchTerm,
        page: tableCurrentPage,
        per_page: tableItemsPerPage,
      };
      
      try {
      const result = await tableService.getAll(
        params,
        currentBusiness.id,
        currentOutlet.id
      );

      if (result.success) {
          const data = result.data || result;
          // ✅ FIX: Ensure we always return an array, never null or undefined
          if (Array.isArray(data)) {
            return data;
          } else if (data?.data && Array.isArray(data.data)) {
            return data.data;
          } else {
            // If data structure is unexpected, return empty array
            console.warn('Unexpected table data structure:', data);
            return [];
          }
        }
        // ✅ FIX: If result.success is false, return empty array instead of throwing
        // This prevents data from disappearing on error
        const errorMsg = result.error || result.message || 'Failed to load tables';
        // ✅ FIX: Don't log as error if request was cancelled (cancelled: true)
        if (result.cancelled) {
          // Silently ignore cancelled requests - don't log
          // Return empty array - placeholderData will keep previous data visible
          return [];
      }
        
        // ✅ FIX: Handle network/timeout errors gracefully
        if (result.isNetworkError || errorMsg?.includes('timeout') || errorMsg?.includes('ECONNABORTED')) {
          console.warn('Network error loading tables:', errorMsg);
          // Return empty array - placeholderData will keep previous data visible
          return [];
        }
        
        console.error('Failed to load tables:', errorMsg, result);
        // Return empty array - placeholderData will keep previous data visible
        return [];
      } catch (error) {
        // ✅ FIX: Don't log as error if request was cancelled (AbortError, CanceledError, etc.)
        if (
          error.name === 'AbortError' ||
          error.name === 'CanceledError' ||
          error.code === 'ERR_CANCELED' ||
          error.code === 'ERR_ABORTED' ||
          error.message?.includes('cancelled') ||
          error.message?.includes('aborted') ||
          (error.isAxiosError && error.code === 'ERR_CANCELED')
        ) {
          // Silently ignore cancelled requests - don't log
          return [];
        }
        
        // ✅ FIX: Handle timeout and network errors gracefully
        if (
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT' ||
          error.message?.includes('timeout') ||
          error.message?.includes('ECONNABORTED') ||
          (error.isAxiosError && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'))
        ) {
          // Log timeout/network errors as warning, not error
          console.warn('Network timeout loading tables:', error.message || 'Unable to connect to server');
          return [];
        }
        
        console.error('Error loading tables:', error);
        // ✅ FIX: Return empty array on exception - placeholderData will keep previous data
        return [];
      }
    },
    enabled: Boolean(currentOutlet && currentBusiness),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // ✅ FIX: Retry 2 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchOnMount: true, // ✅ FIX: Always fetch on mount to ensure data is loaded
    refetchOnWindowFocus: true, // ✅ FIX: Refetch when window gains focus
    placeholderData: (previousData) => previousData || [], // ✅ FIX: Keep previous data while loading/on error
  });

  // ✅ FIX: Use React Query for active orders
  const {
    data: activeOrdersData,
    isLoading: loadingActiveOrders,
    error: activeOrdersError,
    refetch: refetchActiveOrders,
  } = useQuery({
    queryKey: queryKeys.kitchen.orders(currentOutlet?.id),
    queryFn: async () => {
      if (!currentOutlet) {
        return []; // ✅ FIX: Return empty array instead of null
      }

      try {
        const result = await kitchenService.getOrders();
        if (result.success) {
          // Handle different response formats
          let ordersData = result.data;
          
          // If data has grouped structure, extract orders
          if (ordersData?.grouped) {
            ordersData = ordersData.orders || ordersData;
          }
          
          // Ensure we have an array
          const ordersArray = Array.isArray(ordersData) 
            ? ordersData 
            : (ordersData?.data && Array.isArray(ordersData.data))
            ? ordersData.data
            : (ordersData?.orders && Array.isArray(ordersData.orders))
            ? ordersData.orders
            : [];
          
          // Filter orders that are ready or need attention
          const filteredOrders = ordersArray.filter(
            order => order && (order.status === 'ready' || order.status === 'preparing')
          );
          
          // ✅ FIX: Always return an array (never null or undefined)
          return Array.isArray(filteredOrders) ? filteredOrders : [];
        }
        // If not successful, return empty array
        return [];
      } catch (error) {
        console.error('Error loading active orders:', error);
        // ✅ FIX: Return empty array on error instead of throwing
        return [];
      }
    },
    enabled: Boolean(currentOutlet),
    staleTime: 30 * 1000, // 30 seconds - real-time data
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchOnMount: true, // ✅ FIX: Always fetch on mount to ensure data is loaded
    refetchOnWindowFocus: true, // ✅ FIX: Refetch when window gains focus
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });

  // Update stats based on tables and orders
  // ✅ FIX: Define updateStats before useEffect that uses it
  const updateStats = useCallback((tablesData) => {
    // ✅ FIX: Ensure tablesData is always an array
    const tablesArray = Array.isArray(tablesData) ? tablesData : [];
    
    // Count tables by actual status from database
    const newStats = {
      occupied: tablesArray.filter(table => table.status === 'occupied').length,
      available: tablesArray.filter(table => table.status === 'available')
        .length,
      reserved: tablesArray.filter(table => table.status === 'reserved').length,
      totalOrders: tablesArray.reduce(
        (total, table) => total + (table.active_orders_count || 0),
        0
      ),
      totalSales: 0, // Will be calculated from orders
    };
    setStats(newStats);
  }, []);

  // ✅ FIX: Update tables state when React Query data changes
  useEffect(() => {
    // ✅ FIX: Always process data, even if it's an empty array
    // tablesData will always be an array now (never null/undefined)
    if (tablesData !== undefined && tablesData !== null) {
      const tableData = tablesData;
      let tablesArray = [];
      
      // Handle different response formats
      if (Array.isArray(tableData)) {
        tablesArray = tableData;
      } else if (tableData?.data && Array.isArray(tableData.data)) {
        tablesArray = tableData.data;
      } else {
        tablesArray = [];
      }
      
      // ✅ FIX: Only update if we have data
      // If empty array and we're loading, keep previous data (placeholderData handles this)
      // If empty array and NOT loading, only update if we never loaded data before (initial load)
      if (tablesArray.length > 0) {
        // We have data, always update
        hasLoadedDataRef.current = true; // Mark that we've successfully loaded data
        setTables(tablesArray);
        setTableTotal(tablesArray.length);
      updateStats(tablesArray);
      } else if (!loadingTables && !hasLoadedDataRef.current) {
        // Empty array, not loading, and we never loaded data before - this is initial empty state
        setTables([]);
        setTableTotal(0);
        updateStats([]);
      }
      // If empty array and loading, don't update (keep previous data via placeholderData)
      // If empty array and not loading but we had data before, don't update (keep previous data)
    } else if (!loadingTables && currentOutlet && currentBusiness && !hasLoadedDataRef.current) {
      // ✅ FIX: Only set empty if we truly have no data and not loading (initial state)
      setTables([]);
      setTableTotal(0);
      updateStats([]);
    }
    
    // ✅ FIX: Only set loading to false when both queries are done
    setLoading(loadingTables || loadingActiveOrders);
  }, [tablesData, loadingTables, loadingActiveOrders, currentOutlet, currentBusiness, updateStats]);

  // ✅ FIX: Update active orders state when React Query data changes
  useEffect(() => {
    // Ensure activeOrdersData is always an array
    let ordersArray = [];
    
    if (activeOrdersData !== null && activeOrdersData !== undefined) {
      if (Array.isArray(activeOrdersData)) {
        ordersArray = activeOrdersData;
      } else if (activeOrdersData?.data && Array.isArray(activeOrdersData.data)) {
        ordersArray = activeOrdersData.data;
      } else if (activeOrdersData?.orders && Array.isArray(activeOrdersData.orders)) {
        ordersArray = activeOrdersData.orders;
      }
    }
    
    // ✅ FIX: Always set to array (never null or undefined)
    setActiveOrders(ordersArray);
  }, [activeOrdersData]);

  // ✅ FIX: loadTables now uses React Query refetch
  const loadTables = useCallback(async (page = 1) => {
    if (page !== tableCurrentPage) {
      setTableCurrentPage(page);
    }
    await refetchTables();
  }, [refetchTables, tableCurrentPage]);

  // ✅ FIX: loadActiveOrders now uses React Query refetch
  const loadActiveOrders = useCallback(async () => {
    await refetchActiveOrders();
  }, [refetchActiveOrders]);

  // Handle table search
  const handleTableSearch = value => {
    setTableSearchTerm(value);
    setTableCurrentPage(1);
    // Don't call loadTables here since we're using client-side filtering
  };

  // Handle table page change
  const handleTablePageChange = page => {
    setTableCurrentPage(page);
    // Don't call loadTables here since we're using client-side pagination
  };

  // Filter tables based on search term (client-side fallback)
  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
  );

  // Get paginated tables for display
  const getPaginatedTables = () => {
    const startIndex = (tableCurrentPage - 1) * tableItemsPerPage;
    const endIndex = startIndex + tableItemsPerPage;
    return filteredTables.slice(startIndex, endIndex);
  };

  const paginatedTables = getPaginatedTables();

  // ✅ REMOVED: loadActiveOrders - now using React Query (refetchActiveOrders)

  // Update table status
  const updateTableStatus = async (tableId, newStatus) => {
    setUpdating(prev => ({ ...prev, [tableId]: true }));
    
    // ✅ FIX: Optimistic update - update UI immediately
    const previousTables = [...tables];
    const updatedTables = tables.map(table =>
      table.id === tableId ? { ...table, status: newStatus } : table
    );
    setTables(updatedTables);
    updateStats(updatedTables);
    
    try {
      const result = await tableService.updateStatus(
        tableId,
        newStatus,
        currentBusiness?.id,
        currentOutlet?.id
      );
      
      if (result.success) {
        toast.success(
          `Status meja berhasil diubah ke ${getStatusText(newStatus)}`
        );
        // ✅ FIX: Invalidate query instead of refetch to avoid cancelled requests
        // This will trigger a refetch in the background without cancelling
        setTimeout(() => {
          refetchTables().catch(err => {
            // ✅ FIX: Don't log cancelled requests as errors
            if (err?.name !== 'AbortError' && !err?.message?.includes('cancelled')) {
              console.warn('Failed to refetch tables after status update:', err);
            }
            // If refetch fails, keep the optimistic update
          });
        }, 100); // Small delay to ensure update is complete
      } else {
        // ✅ FIX: Revert optimistic update on failure
        setTables(previousTables);
        updateStats(previousTables);
        toast.error(
          'Gagal mengubah status meja: ' + (result.error || result.message || 'Unknown error')
        );
      }
    } catch (error) {
      // ✅ FIX: Revert optimistic update on exception
      setTables(previousTables);
      updateStats(previousTables);
      console.error('Error updating table status:', error);
      toast.error('Gagal mengubah status meja: ' + (error.message || 'Unknown error'));
    } finally {
      setUpdating(prev => ({ ...prev, [tableId]: false }));
    }
  };

  // Get status text in Indonesian
  const getStatusText = status => {
    const statusMap = {
      occupied: 'Terisi',
      available: 'Tersedia',
      reserved: 'Reservasi',
    };
    return statusMap[status] || status;
  };

  // Format time ago
  const getTimeAgo = createdAt => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffMinutes = Math.floor((now - orderTime) / (1000 * 60));

    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes === 1) return '1 menit yang lalu';
    return `${diffMinutes} menit yang lalu`;
  };

  // ✅ FIX: Handle refresh using React Query refetch
  const handleRefresh = useCallback(async () => {
    if (loadingTables || loadingActiveOrders) {
      return; // Prevent multiple simultaneous refreshes
    }

    try {
      // Show loading toast
      const loadingToast = toast.loading('Memperbarui data...');
      
      await Promise.all([
        refetchTables(),
        refetchActiveOrders(),
      ]);
      
      toast.dismiss(loadingToast);
      toast.success('Data berhasil diperbarui');
    } catch (error) {
      // ✅ FIX: Don't log cancelled requests as errors
      if (error?.name === 'AbortError' || error?.message?.includes('cancelled')) {
        console.warn('Refresh was cancelled:', error);
        toast.dismiss();
        return;
      }
      console.error('Error refreshing data:', error);
      toast.error('Gagal memuat ulang data');
    }
  }, [refetchTables, refetchActiveOrders, loadingTables, loadingActiveOrders]);

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
        if (!loadingTables && !loadingActiveOrders) {
          handleRefresh();
        }
      }

      // R untuk refresh (optional)
      if ((event.key === 'r' || event.key === 'R') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        if (!loadingTables && !loadingActiveOrders) {
          handleRefresh();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh, loadingTables, loadingActiveOrders]);

  const getTableStatusBadge = status => {
    const config = {
      occupied: { color: 'bg-red-500', label: 'Terisi' },
      available: { color: 'bg-green-500', label: 'Tersedia' },
      reserved: { color: 'bg-yellow-500', label: 'Reservasi' },
    };
    const c = config[status] || config.available;
    return (
      <Badge className={`${c.color} text-white border-0`}>{c.label}</Badge>
    );
  };

  const getOrderStatusBadge = status => {
    const config = {
      ready: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Siap Diantar',
        icon: CheckCircle,
      },
      cooking: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Dimasak',
        icon: Clock,
      },
      pending: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        label: 'Menunggu',
        icon: AlertCircle,
      },
    };
    const c = config[status] || config.pending;
    const StatusIcon = c.icon;
    return (
      <Badge
        className={`${c.color} border font-medium flex items-center space-x-1`}
      >
        <StatusIcon className='w-3 h-3' />
        <span>{c.label}</span>
      </Badge>
    );
  };

  // Show message if no outlet is selected
  if (!currentOutlet) {
    return (
      <div className='space-y-6'>
        <Card className='p-8 text-center'>
          <Users className='w-16 h-16 mx-auto text-gray-400 mb-4' />
          <h3 className='text-xl font-semibold text-gray-900 mb-2'>
            Pilih Outlet Terlebih Dahulu
          </h3>
          <p className='text-gray-500 mb-4'>
            Anda perlu memilih outlet untuk mengakses dashboard pelayan.
          </p>
          {outlets && outlets.length > 0 ? (
            <div className='flex justify-center'>
              <Select
                value=''
                onValueChange={value => {
                  const outlet = outlets.find(o => o.id.toString() === value);
                  if (outlet) {
                    localStorage.setItem('currentOutletId', outlet.id);
                    window.location.reload();
                  }
                }}
              >
                <SelectTrigger className='w-64'>
                  <SelectValue placeholder='Pilih Outlet' />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map(outlet => (
                    <SelectItem key={outlet.id} value={outlet.id.toString()}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className='text-sm text-gray-400'>
              Tidak ada outlet yang tersedia.
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 p-4 md:p-6 space-y-6'>
      {/* Welcome Banner - Modern Professional Design */}
      <div className='relative bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-2xl shadow-2xl p-6 md:p-8 text-white overflow-hidden'>
        {/* Animated background pattern */}
        <div className='absolute inset-0 opacity-10'>
          <div className='absolute inset-0' style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <div className='absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl'></div>
        <div className='absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-2xl'></div>
        
        <div className='relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
          <div className='flex-1 w-full'>
            <div className='flex items-center gap-3 mb-3'>
              <div className='p-2 bg-white/20 backdrop-blur-sm rounded-xl'>
                <Users className='w-6 h-6' />
              </div>
              <h1 className='text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent'>
                Dashboard Pelayan
              </h1>
            </div>
            <p className='text-blue-100 mb-4 text-sm font-medium'>
              Kelola meja dan pesanan pelanggan dengan efisien
            </p>
            <div className='flex flex-wrap items-center gap-3 mb-4'>
              <div className='flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20'>
              <Clock className='w-4 h-4' />
                <span className='text-sm font-medium'>
                {new Date().toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                WIB
              </span>
              </div>
              <div className='flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20'>
                <span className='text-sm font-medium'>
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
              </div>
            </div>

            {/* Outlet Switcher */}
            {outlets && outlets.length > 1 && (
              <div className='flex items-center gap-3'>
                <span className='text-blue-100 text-sm font-medium'>Outlet:</span>
                <Select
                  value={currentOutlet?.id?.toString()}
                  onValueChange={value => {
                    const outlet = outlets.find(o => o.id.toString() === value);
                    if (outlet) {
                      localStorage.setItem('currentOutletId', outlet.id);
                      window.location.reload();
                    }
                  }}
                >
                  <SelectTrigger className='w-full sm:w-56 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 transition-colors'>
                    <SelectValue placeholder='Pilih Outlet' />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map(outlet => (
                      <SelectItem key={outlet.id} value={outlet.id.toString()}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentOutlet && (
              <div className='mt-3 flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 w-fit'>
                <span className='text-sm font-medium text-white'>📍 {currentOutlet.name}</span>
              </div>
            )}
          </div>
          <div className='hidden md:block relative'>
            <div className='absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl blur-xl'></div>
            <Users className='relative w-24 h-24 text-white/90' />
          </div>
        </div>
      </div>

      {/* Stats - Modern Glassmorphism Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6'>
        <Card className='group relative bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden'>
          <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl'></div>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-3 relative z-10'>
            <CardTitle className='text-sm font-medium text-gray-700'>
              Meja Terisi
            </CardTitle>
            <div className='p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg'>
              <Coffee className='h-5 w-5 text-white' />
            </div>
          </CardHeader>
          <CardContent className='relative z-10'>
            <div className='text-3xl font-bold text-gray-900 mb-1'>
              {stats.occupied}<span className='text-xl text-gray-500'>/{tables.length}</span>
            </div>
            <p className='text-xs text-gray-600 mt-1'>Saat ini</p>
          </CardContent>
        </Card>

        <Card className='group relative bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden'>
          <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl'></div>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-3 relative z-10'>
            <CardTitle className='text-sm font-medium text-gray-700'>
              Pesanan Aktif
            </CardTitle>
            <div className='p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg'>
              <ClipboardList className='h-5 w-5 text-white' />
            </div>
          </CardHeader>
          <CardContent className='relative z-10'>
            <div className='text-3xl font-bold text-gray-900 mb-1'>
              {stats.totalOrders}
            </div>
            <p className='text-xs text-gray-600 mt-1'>Siap & Dimasak</p>
          </CardContent>
        </Card>

        <Card className='group relative bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden'>
          <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-2xl'></div>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-3 relative z-10'>
            <CardTitle className='text-sm font-medium text-gray-700'>
              Meja Tersedia
            </CardTitle>
            <div className='p-2.5 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg'>
              <CheckCircle className='h-5 w-5 text-white' />
            </div>
          </CardHeader>
          <CardContent className='relative z-10'>
            <div className='text-3xl font-bold text-gray-900 mb-1'>
              {stats.available}
            </div>
            <p className='text-xs text-gray-600 mt-1'>
              Dari {tables.length} meja
            </p>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6'>
        {/* Table Status - Modern Glass Card */}
        <Card className='bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300'>
          <CardHeader className='p-6 bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-b border-gray-200/50'>
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
              <div>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg'>
                    <Coffee className='w-5 h-5 text-white' />
                  </div>
                  <CardTitle className='text-lg font-bold text-gray-900'>
                  Status Meja
                </CardTitle>
              </div>
                <CardDescription className='text-sm text-gray-600'>Kelola status meja secara real-time</CardDescription>
              </div>
              <div className='flex items-center gap-2 w-full sm:w-auto'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleRefresh}
                  disabled={loadingTables || loadingActiveOrders}
                  className='flex items-center space-x-2 border-2 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 font-semibold transition-all'
                  title='Refresh data (Tekan R)'
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loadingTables || loadingActiveOrders ? 'animate-spin' : ''}`}
                  />
                  <span className='hidden sm:inline'>Refresh</span>
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => navigate('/tables')}
                  className='border-2 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 font-semibold transition-all'
                >
                  <span className='text-sm'>Denah</span>
                </Button>
                <Button
                  variant='default'
                  size='sm'
                  onClick={() => setShowTableModal(true)}
                  className='bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transition-all'
                >
                  <span className='text-sm'>+ Tambah</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Search Input - Modern Design */}
          <div className='px-6 pb-6'>
            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                <Search className='h-5 w-5 text-gray-400' />
              </div>
              <Input
                placeholder='Cari meja... (contoh: Meja 1, VIP, A1)'
                value={tableSearchTerm}
                onChange={e => handleTableSearch(e.target.value)}
                className='pl-12 pr-10 py-3.5 w-full border-2 border-gray-200 rounded-xl bg-gray-50/50 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 text-gray-800 placeholder-gray-400 font-medium shadow-sm'
              />
              {tableSearchTerm && (
                <button
                  onClick={() => handleTableSearch('')}
                  className='absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200'
                >
                  <span className='text-2xl leading-none'>×</span>
                </button>
              )}
            </div>
          </div>

          <CardContent>
            {loadingTables && tables.length === 0 ? (
              <div className='flex items-center justify-center py-8'>
                <div className='flex items-center space-x-2'>
                  <RefreshCw className='w-5 h-5 animate-spin text-blue-600' />
                  <span className='text-gray-700'>Memuat data meja...</span>
                </div>
              </div>
            ) : tables.length === 0 ? (
              <div className='text-center py-12 px-4'>
                <div className='inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 mb-4 shadow-lg'>
                  <Coffee className='w-10 h-10 text-indigo-600' />
                </div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  Belum Ada Meja
                </h3>
                <p className='text-gray-600 mb-6 max-w-md mx-auto text-sm'>
                  Mulai dengan menambahkan meja pertama untuk outlet ini.
                </p>
                <Button
                  onClick={() => setShowTableModal(true)}
                  className='bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl px-6 py-2.5 rounded-xl transition-all text-sm'
                >
                  + Tambah Meja Pertama
                </Button>
              </div>
            ) : (
              <div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {paginatedTables.map(table => {
                    const isUpdating = updating[table.id];
                    return (
                      <div
                        key={table.id}
                        className={`group relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer overflow-hidden ${
                          table.status === 'occupied'
                            ? 'bg-gradient-to-br from-white to-red-50/50 border-red-200/50 shadow-lg hover:border-red-300'
                            : table.status === 'reserved'
                            ? 'bg-gradient-to-br from-white to-yellow-50/50 border-yellow-200/50 shadow-lg hover:border-yellow-300'
                            : 'bg-gradient-to-br from-white to-green-50/50 border-green-200/50 shadow-lg hover:border-green-300'
                        }`}
                      >
                        {/* Animated Status Bar */}
                        <div
                          className={`absolute top-0 left-0 right-0 h-1.5 ${
                            table.status === 'occupied'
                              ? 'bg-gradient-to-r from-red-500 to-red-600'
                              : table.status === 'reserved'
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                              : 'bg-gradient-to-r from-green-500 to-green-600'
                          }`}
                        ></div>

                        {/* Modern Status Badge */}
                        <div className='absolute top-4 right-4'>
                              <div
                            className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md backdrop-blur-sm ${
                                  table.status === 'occupied'
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                                    : table.status === 'reserved'
                                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                                : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                }`}
                              >
                            {table.status === 'occupied' ? '●' : table.status === 'reserved' ? '○' : '✓'}
                          </div>
                        </div>

                        <div className='mb-5 mt-2'>
                          <div className='flex items-start gap-4'>
                            <div
                              className={`p-4 rounded-xl flex-shrink-0 shadow-lg ${
                                    table.status === 'occupied'
                                  ? 'bg-gradient-to-br from-red-500 to-red-600'
                                      : table.status === 'reserved'
                                  ? 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                                  : 'bg-gradient-to-br from-green-500 to-green-600'
                                  }`}
                            >
                              <Coffee className='w-6 h-6 text-white' />
                              </div>
                            <div className='flex-1 min-w-0'>
                              <h3 className='font-bold text-base text-gray-900 mb-2 break-words'>
                                  {table.name}
                              </h3>
                                <div
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                                    table.status === 'occupied'
                                    ? 'bg-red-100 text-red-700 border-2 border-red-200'
                                      : table.status === 'reserved'
                                    ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-200'
                                    : 'bg-green-100 text-green-700 border-2 border-green-200'
                                  }`}
                                >
                                  {table.status === 'occupied'
                                    ? 'Terisi'
                                    : table.status === 'reserved'
                                    ? 'Dipesan'
                                    : 'Tersedia'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className='space-y-3 md:space-y-4'>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center space-x-2 text-xs sm:text-sm text-gray-600'>
                              <Users className='w-3 h-3 sm:w-4 sm:h-4' />
                              <span className='font-medium'>
                                {table.capacity} kursi
                              </span>
                            </div>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => {
                                setEditingTable(table);
                                setShowTableModal(true);
                              }}
                              className='h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-gray-200 rounded-full flex-shrink-0'
                            >
                              <Edit className='w-3 h-3 sm:w-4 sm:h-4' />
                            </Button>
                          </div>

                          {table.status === 'occupied' && (
                            <div className='flex flex-col gap-3 pt-4 border-t-2 border-gray-200/50'>
                              <Button
                                size='sm'
                                onClick={() =>
                                  navigate(
                                    `/tables/pos?table=${table.id}&number=${table.name}`
                                  )
                                }
                                className='w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm'
                              >
                                <div className='flex items-center justify-center space-x-2'>
                                  <Coffee className='w-4 h-4' />
                                  <span>Tambah Orderan</span>
                                </div>
                              </Button>
                              <Button
                                size='sm'
                                onClick={() =>
                                  updateTableStatus(table.id, 'available')
                                }
                                disabled={isUpdating}
                                variant='outline'
                                className='w-full border-2 border-green-500 text-green-700 hover:bg-green-50 hover:border-green-600 font-semibold py-2.5 rounded-xl transition-all duration-200 shadow-sm text-sm'
                              >
                                {isUpdating ? (
                                  <div className='flex items-center justify-center space-x-2'>
                                    <div className='w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin'></div>
                                    <span>Memproses...</span>
                                  </div>
                                ) : (
                                  <div className='flex items-center justify-center space-x-2'>
                                    <CheckCircle className='w-4 h-4' />
                                    <span>Kosongkan Meja</span>
                                  </div>
                                )}
                              </Button>
                            </div>
                          )}

                          {table.status === 'available' && (
                            <div className='flex flex-col sm:flex-row gap-2'>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() =>
                                  updateTableStatus(table.id, 'occupied')
                                }
                                disabled={isUpdating}
                                className='flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold py-2 rounded-lg transition-all duration-200 text-sm'
                              >
                                {isUpdating ? (
                                  <div className='flex items-center justify-center space-x-2'>
                                    <div className='w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin'></div>
                                    <span className='text-xs sm:text-sm'>Memproses...</span>
                                  </div>
                                ) : (
                                  <div className='flex items-center justify-center space-x-2'>
                                    <Users className='w-4 h-4' />
                                    <span className='text-xs sm:text-sm'>Terisi</span>
                                  </div>
                                )}
                              </Button>
                              <Button
                                size='sm'
                                onClick={() =>
                                  navigate(
                                    `/tables/pos?table=${table.id}&number=${table.name}`
                                  )
                                }
                                className='flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 rounded-lg transition-all duration-200 hover:shadow-lg text-sm'
                              >
                                <div className='flex items-center justify-center space-x-2'>
                                  <Coffee className='w-4 h-4' />
                                  <span className='text-xs sm:text-sm'>Pesan</span>
                                </div>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Table Pagination */}
                {filteredTables.length > tableItemsPerPage && (
                  <div className='mt-6 pt-6 border-t border-gray-200'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-start'>
                        <div className='bg-blue-50 px-2 md:px-3 py-2 rounded-lg'>
                          <span className='text-xs sm:text-sm font-medium text-blue-700'>
                            Menampilkan{' '}
                            {(tableCurrentPage - 1) * tableItemsPerPage + 1} -{' '}
                            {Math.min(
                              tableCurrentPage * tableItemsPerPage,
                              filteredTables.length
                            )}{' '}
                            dari {filteredTables.length} meja
                          </span>
                        </div>
                      </div>
                      <div className='flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-start'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            handleTablePageChange(tableCurrentPage - 1)
                          }
                          disabled={tableCurrentPage === 1}
                          className='px-3 md:px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm'
                        >
                          <div className='flex items-center space-x-1 sm:space-x-2'>
                            <span>←</span>
                            <span className='hidden sm:inline'>Sebelumnya</span>
                          </div>
                        </Button>
                        <div className='flex items-center space-x-1'>
                          {Array.from(
                            {
                              length: Math.ceil(
                                filteredTables.length / tableItemsPerPage
                              ),
                            },
                            (_, i) => i + 1
                          )
                            .filter(page => {
                              const totalPages = Math.ceil(
                                filteredTables.length / tableItemsPerPage
                              );
                              return (
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - tableCurrentPage) <= 1
                              );
                            })
                            .map((page, index, array) => {
                              const showEllipsis =
                                index > 0 && page - array[index - 1] > 1;
                              return (
                                <div key={page} className='flex items-center'>
                                  {showEllipsis && (
                                    <span className='px-2 text-gray-500'>
                                      ...
                                    </span>
                                  )}
                                  <Button
                                    variant={
                                      page === tableCurrentPage
                                        ? 'default'
                                        : 'outline'
                                    }
                                    size='sm'
                                    onClick={() => handleTablePageChange(page)}
                                    className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${
                                      page === tableCurrentPage
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                                        : 'border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700'
                                    }`}
                                  >
                                    {page}
                                  </Button>
                                </div>
                              );
                            })}
                        </div>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            handleTablePageChange(tableCurrentPage + 1)
                          }
                          disabled={
                            tableCurrentPage ===
                            Math.ceil(filteredTables.length / tableItemsPerPage)
                          }
                          className='px-3 md:px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm'
                        >
                          <div className='flex items-center space-x-1 sm:space-x-2'>
                            <span className='hidden sm:inline'>Selanjutnya</span>
                            <span>→</span>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Orders - Modern Glass Card */}
        <Card className='bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300'>
          <CardHeader className='p-6 bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-b border-gray-200/50'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg'>
                    <ClipboardList className='w-5 h-5 text-white' />
                  </div>
                  <CardTitle className='text-lg font-bold text-gray-900'>
                  Pesanan Aktif
                </CardTitle>
                </div>
                <CardDescription className='text-sm text-gray-600'>
                  Pesanan yang siap diantarkan atau sedang dimasak
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className='p-5 md:p-6'>
            {activeOrders.length === 0 ? (
              <div className='text-center py-12 px-4'>
                <div className='inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 mb-4 shadow-lg'>
                  <ClipboardList className='w-10 h-10 text-blue-600' />
                </div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  Tidak Ada Pesanan Aktif
                </h3>
                <p className='text-gray-600 mb-6 max-w-md mx-auto text-sm'>
                  Semua pesanan sudah selesai atau belum ada pesanan yang perlu diperhatikan.
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {Array.isArray(activeOrders) && activeOrders.map(order => {
                  const timeAgo = getTimeAgo(order.created_at);
                  const itemCount = order.order_items?.length || 0;

                  return (
                    <div
                      key={order.id}
                      className='group p-5 rounded-2xl bg-gradient-to-br from-white to-gray-50/50 border-2 border-gray-200/50 hover:border-blue-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5'
                    >
                      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-3 mb-2'>
                            <div className='p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md'>
                              <Coffee className='w-5 h-5 text-white' />
                            </div>
                            <p className='font-bold text-base text-gray-900'>
                            {order.table?.name || `Meja ${order.table_id}`}
                          </p>
                        </div>
                          <div className='flex items-center gap-3 text-sm text-gray-600 ml-11'>
                            <span className='font-bold px-2 py-1 bg-gray-100 rounded-md'>#{order.order_number}</span>
                            <span className='text-gray-400'>•</span>
                            <span className='font-semibold'>{itemCount} item</span>
                          </div>
                        </div>
                        <div className='flex-shrink-0'>
                        {getOrderStatusBadge(order.status)}
                      </div>
                      </div>
                      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t-2 border-gray-200/50'>
                        <div className='flex items-center gap-2 text-sm text-gray-600'>
                          <Clock className='w-4 h-4 text-gray-400' />
                          <span className='font-medium'>{timeAgo}</span>
                        </div>
                        {order.status === 'ready' && (
                          <Button
                            size='sm'
                            className='bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl w-full sm:w-auto px-6 py-2.5 rounded-xl transition-all duration-200 text-sm'
                            onClick={async () => {
                              try {
                                const res = await kitchenService.updateStatus(order.id, 'completed');
                                if (res.success) {
                                  toast.success('Pesanan berhasil diantarkan!');
                                  // ✅ FIX: Only refetch active orders, don't reload tables
                                  // Tables should remain visible - only order status changes
                                  await refetchActiveOrders();
                                  // ✅ FIX: Invalidate tables query to refresh in background
                                  // but don't wait for it to avoid blocking UI
                                  setTimeout(() => {
                                    refetchTables().catch(err => {
                                      if (err?.name !== 'AbortError' && !err?.message?.includes('cancelled')) {
                                        console.warn('Failed to refetch tables after order delivery:', err);
                                      }
                                    });
                                  }, 100);
                                } else {
                                  toast.error('Gagal mengubah status pesanan');
                                }
                              } catch (error) {
                                console.error('Failed to deliver order', error);
                                toast.error('Gagal mengantarkan pesanan');
                              }
                            }}
                          >
                            <CheckCircle className='w-4 h-4 mr-2' />
                            <span>Antarkan</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Actions */}
            <div className='mt-6 pt-6 border-t-2 border-gray-200 space-y-3'>
              <Button
                className='w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl py-2.5 rounded-xl transition-all text-sm'
                onClick={() => navigate('/tables/pos')}
              >
                <ClipboardList className='w-4 h-4 mr-2' />
                <span>Buat Pesanan Baru</span>
              </Button>
              <Button
                variant='outline'
                className='w-full border-2 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 font-semibold py-2.5 rounded-xl transition-all shadow-sm text-sm'
                onClick={() => navigate('/cashier')}
              >
                <ClipboardList className='w-4 h-4 mr-2' />
                <span>Kasir POS (Legacy)</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips - Modern Glass Card */}
      <Card className='bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl'>
        <CardHeader className='p-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b border-gray-200/50'>
          <CardTitle className='text-lg font-semibold text-gray-900 flex items-center'>
            <div className='p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mr-3 shadow-lg'>
              <AlertCircle className='w-5 h-5 text-white' />
            </div>
            <span>Tips & Panduan Pelayan</span>
          </CardTitle>
        </CardHeader>
        <CardContent className='p-6'>
          <div className='space-y-5'>
            <div className='bg-gradient-to-br from-white to-gray-50/50 rounded-2xl p-5 border-2 border-indigo-100/50 shadow-lg'>
              <h4 className='font-bold text-base text-gray-900 mb-3 flex items-center'>
                <div className='p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg mr-3'>
                  <span className='text-white'>📍</span>
                </div>
                Informasi Outlet
              </h4>
              <div className='space-y-3 text-sm'>
                <div className='flex items-center justify-between py-2 px-4 bg-white rounded-xl border border-gray-200 shadow-sm'>
                  <span className='font-semibold text-gray-600 text-sm'>Outlet Aktif:</span>
                  <span className='font-bold text-gray-900 text-sm'>{currentOutlet?.name}</span>
                </div>
                <div className='flex items-center justify-between py-2 px-4 bg-white rounded-xl border border-gray-200 shadow-sm'>
                  <span className='font-semibold text-gray-600 text-sm'>Business:</span>
                  <span className='font-bold text-gray-900 text-sm'>{currentBusiness?.name}</span>
                </div>
              </div>
            </div>

            <ul className='space-y-4'>
              <li className='flex items-start gap-4 bg-gradient-to-br from-white to-green-50/30 rounded-xl p-4 border-2 border-green-100 shadow-md hover:shadow-lg transition-all'>
                <div className='p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex-shrink-0 shadow-md'>
                  <CheckCircle className='w-5 h-5 text-white' />
                </div>
                <span className='text-sm text-gray-700 leading-relaxed font-medium pt-1'>
                  Segera antarkan pesanan yang sudah siap untuk menjaga kepuasan pelanggan
                </span>
              </li>
              <li className='flex items-start gap-4 bg-gradient-to-br from-white to-green-50/30 rounded-xl p-4 border-2 border-green-100 shadow-md hover:shadow-lg transition-all'>
                <div className='p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex-shrink-0 shadow-md'>
                  <CheckCircle className='w-5 h-5 text-white' />
                </div>
                <span className='text-sm text-gray-700 leading-relaxed font-medium pt-1'>
                  Cek status meja secara berkala untuk memastikan pelanggan terlayani dengan baik
                </span>
              </li>
              <li className='flex items-start gap-4 bg-gradient-to-br from-white to-green-50/30 rounded-xl p-4 border-2 border-green-100 shadow-md hover:shadow-lg transition-all'>
                <div className='p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex-shrink-0 shadow-md'>
                  <CheckCircle className='w-5 h-5 text-white' />
                </div>
                <span className='text-sm text-gray-700 leading-relaxed font-medium pt-1'>
                  Update status meja ketika pelanggan selesai makan untuk memudahkan manajemen
                </span>
              </li>
              <li className='flex items-start gap-4 bg-gradient-to-br from-white to-blue-50/30 rounded-xl p-4 border-2 border-blue-100 shadow-md hover:shadow-lg transition-all'>
                <div className='p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex-shrink-0 shadow-md'>
                  <CheckCircle className='w-5 h-5 text-white' />
                </div>
                <span className='text-sm text-gray-700 leading-relaxed font-medium pt-1'>
                  Tekan{' '}
                  <kbd className='px-2 py-1 bg-gray-200 rounded-lg text-xs font-bold border border-gray-300'>
                    R
                  </kbd>{' '}
                  untuk refresh data
                </span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Table Management Modal */}
      {showTableModal && (
        <TableManagementModal
          table={editingTable}
          onClose={() => {
            setShowTableModal(false);
            setEditingTable(null);
          }}
          onSave={async tableData => {
            try {
              if (editingTable) {
                // Update existing table
                const result = await tableService.update(
                  editingTable.id,
                  tableData,
                  currentBusiness.id,
                  currentOutlet.id
                );
                if (result.success) {
                  toast.success('Meja berhasil diperbarui');
                  loadTables();
                } else {
                  toast.error(
                    'Gagal memperbarui meja: ' +
                      (result.error || 'Unknown error')
                  );
                }
              } else {
                // Create new table
                const result = await tableService.create(
                  {
                    ...tableData,
                    outlet_id: currentOutlet.id,
                  },
                  currentBusiness.id,
                  currentOutlet.id
                );
                if (result.success) {
                  toast.success('Meja berhasil ditambahkan');
                  loadTables();
                } else {
                  toast.error(
                    'Gagal menambahkan meja: ' +
                      (result.error || 'Unknown error')
                  );
                }
              }
              setShowTableModal(false);
              setEditingTable(null);
            } catch (error) {
              console.error('Error saving table:', error);
              toast.error('Terjadi kesalahan saat menyimpan meja');
            }
          }}
          onDelete={async tableId => {
            try {
              const result = await tableService.delete(
                tableId,
                currentBusiness.id,
                currentOutlet.id
              );
              if (result.success) {
                toast.success('Meja berhasil dihapus');
                loadTables();
              } else {
                toast.error(
                  'Gagal menghapus meja: ' + (result.error || 'Unknown error')
                );
              }
              setShowTableModal(false);
              setEditingTable(null);
            } catch (error) {
              console.error('Error deleting table:', error);
              toast.error('Terjadi kesalahan saat menghapus meja');
            }
          }}
        />
      )}
    </div>
  );
};

// Table Management Modal Component
const TableManagementModal = ({ table, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    name: table?.name || '',
    capacity: table?.capacity || 4,
    status: table?.status || 'available',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus meja ini?')) {
      setLoading(true);
      try {
        await onDelete(table.id);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6 w-full max-w-md mx-4'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold'>
            {table ? 'Edit Meja' : 'Tambah Meja Baru'}
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Nama Meja
            </label>
            <input
              type='text'
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Contoh: Meja 1, VIP 1, dll'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Kapasitas Kursi
            </label>
            <input
              type='number'
              min='1'
              max='20'
              value={formData.capacity}
              onChange={e =>
                setFormData({ ...formData, capacity: parseInt(e.target.value) })
              }
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Status
            </label>
            <select
              value={formData.status}
              onChange={e =>
                setFormData({ ...formData, status: e.target.value })
              }
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value='available'>Tersedia</option>
              <option value='occupied'>Terisi</option>
              <option value='reserved'>Reservasi</option>
              <option value='cleaning'>Bersih-bersih</option>
            </select>
          </div>

          <div className='flex space-x-3 pt-4'>
            <button
              type='submit'
              disabled={loading}
              className='flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50'
            >
              {loading ? 'Menyimpan...' : table ? 'Perbarui' : 'Tambah'}
            </button>
            {table && (
              <button
                type='button'
                onClick={handleDelete}
                disabled={loading}
                className='bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50'
              >
                <Trash2 className='w-4 h-4' />
              </button>
            )}
            <button
              type='button'
              onClick={onClose}
              className='flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400'
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WaiterDashboard;
