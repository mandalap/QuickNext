import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Gift,
  Package,
  RefreshCw,
  RotateCw,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardService } from '../../services/dashboard.service';
import { salesService } from '../../services/salesService';
import { shiftService } from '../../services/shift.service';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
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
import ProductPagination from '../ui/ProductPagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { SkeletonDashboardGrid, SkeletonTable } from '../ui/skeletons';
import { useToast } from '../ui/toast';

// ========================================
// MEMOIZED SUB-COMPONENTS FOR PERFORMANCE
// ========================================

// Stat Card Component - Memoized to prevent re-renders
const StatCard = memo(
  ({
    title,
    value,
    icon: Icon,
    color,
    bgColor,
    borderColor,
    subtitle,
    isLoading,
  }) => (
    <Card className={`${bgColor} ${borderColor} border-2 card-hover`}>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium text-gray-700'>
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <div className='h-8 bg-gray-200 rounded animate-pulse mb-1 w-3/4'></div>
            <div className='h-3 bg-gray-200 rounded animate-pulse w-1/2'></div>
          </>
        ) : (
          <>
            <div className='text-2xl font-bold text-gray-900 mb-1'>{value}</div>
            <p className='text-xs text-gray-600'>{subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
);
StatCard.displayName = 'StatCard';

// Additional Stat Card with Trend - Memoized
const TrendStatCard = memo(
  ({
    title,
    value,
    change,
    trend,
    icon: Icon,
    color,
    bgColor,
    borderColor,
  }) => {
    const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;
    const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';

    return (
      <Card
        className={`card-hover ${bgColor} ${borderColor} border transition-all duration-200 hover:shadow-md`}
      >
        <CardContent className='p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <p className='text-xs font-medium text-gray-600 mb-1'>{title}</p>
              <p className='text-xl font-bold text-gray-900 mb-1'>{value}</p>
              <div className='flex items-center space-x-1'>
                <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                <span className={`text-xs font-medium ${trendColor}`}>
                  {change}
                </span>
              </div>
            </div>
            <div className={`p-2 rounded-lg ${bgColor}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
TrendStatCard.displayName = 'TrendStatCard';

// Order Item Component - Memoized
const OrderItem = memo(({ order, getStatusBadge, orderCountForTable }) => {
  // ✅ FIX: Get customer name from multiple sources
  const customerName =
    order.customer?.name ||
    order.customer_name ||
    order.customer ||
    'Walk-in Customer';

  // ✅ FIX: Check if customer is member
  const isMember = order.customer?.id || order.customer_id;

  // ✅ FIX: Get table name (support multiple formats)
  const tableName =
    order.table?.name ||
    order.table_name ||
    (order.table_id ? `Meja ${order.table_id}` : null) ||
    'Take Away';

  // ✅ FIX: Check if order has table (dine-in order)
  const hasTable = order.table_id || order.table?.id;

  // ✅ FIX: Check if there are multiple orders for this table
  const hasMultipleOrders = hasTable && orderCountForTable > 1;

  return (
    <div
      className='flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border'
      data-testid={`order-${order.id}`}
    >
      <div className='flex items-center space-x-4'>
        <div className='w-12 h-12 bg-gradient-to-br from-emerald-500 to-slate-700 hover:from-emerald-400 hover:to-slate-600 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all duration-300'>
          #{order.order_number?.slice(-4) || order.id}
        </div>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <p className='font-semibold text-gray-900'>{customerName}</p>
            {isMember ? (
              <span className='text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium'>
                ✅ Member
              </span>
            ) : (
              <span className='text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium'>
                ⚠️ Bukan Member
              </span>
            )}
            {hasMultipleOrders && (
              <span className='text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium'>
                🔄 {orderCountForTable} Orderan
              </span>
            )}
          </div>
          <div className='flex items-center space-x-3 text-sm text-gray-500'>
            <span>
              {new Date(
                order.created_at || order.ordered_at
              ).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {hasTable && (
              <>
                <span>•</span>
                <span className='font-medium text-emerald-600 dark:text-emerald-400'>
                  🪑 {tableName}
                </span>
              </>
            )}
            {!hasTable && (
              <>
                <span>•</span>
                <span>📦 {tableName}</span>
              </>
            )}
          </div>
          <div className='flex items-center space-x-2 mt-1'>
            <span className='text-xs text-gray-600'>
              {order.order_items?.length || order.items?.length || 0} item
            </span>
            <span className='text-xs text-gray-400'>•</span>
            <span className='text-xs text-gray-600 capitalize'>
              {order.payment_method || 'cash'}
            </span>
          </div>
        </div>
      </div>
      <div className='text-right'>
        <p className='font-bold text-gray-900 text-lg'>
          {formatCurrency(order.total_amount || order.total || 0)}
        </p>
        <div className='mt-1'>{getStatusBadge(order.status)}</div>
      </div>
    </div>
  );
});
OrderItem.displayName = 'OrderItem';

// Product Item Component - Memoized
const ProductItem = memo(({ product, index }) => (
  <div
    className='flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors'
    data-testid={`product-${index}`}
  >
    <div className='flex items-center space-x-3'>
      <div className='w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center text-white font-bold text-sm'>
        {index + 1}
      </div>
      <div>
        <p className='font-medium text-gray-900'>
          {product.name || product.product_name || `Produk ${index + 1}`}
        </p>
        <p className='text-sm text-gray-500'>
          {product.total_quantity ||
            product.total_sold ||
            product.quantity_sold ||
            product.sold ||
            0}{' '}
          terjual
          {product.order_count ? ` • ${product.order_count} pesanan` : ''}
        </p>
      </div>
    </div>
    <div className='flex items-center space-x-2'>
      <span className='font-semibold text-gray-900'>
        {formatCurrency(
          product.total_revenue || product.revenue || product.total_amount || 0
        )}
      </span>
      <TrendingUp className='w-4 h-4 text-green-500' />
    </div>
  </div>
));
ProductItem.displayName = 'ProductItem';

// Cashier Card Component - Memoized
const CashierCard = memo(({ cashier }) => (
  <div className='bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow'>
    <div className='flex items-center gap-3 mb-3'>
      <div className='w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center'>
        <Users className='w-5 h-5 text-white' />
      </div>
      <div className='flex-1 min-w-0'>
        <h3 className='font-semibold text-gray-900 truncate'>
          {cashier.employee?.user?.name || 'Unknown'}
        </h3>
        <p className='text-xs text-gray-600 truncate'>{cashier.shift_name}</p>
      </div>
    </div>
    <div className='space-y-2'>
      <div className='flex justify-between text-sm'>
        <span className='text-gray-600'>Transaksi:</span>
        <span className='font-semibold text-green-600'>
          {cashier.today_transactions || 0}
        </span>
      </div>
      <div className='flex justify-between text-sm'>
        <span className='text-gray-600'>Penjualan:</span>
        <span className='font-semibold text-blue-600'>
          {formatCurrency(cashier.today_sales || 0)}
        </span>
      </div>
      <div className='flex justify-between text-sm'>
        <span className='text-gray-600'>Item:</span>
        <span className='font-semibold text-purple-600'>
          {cashier.today_items || 0}
        </span>
      </div>
    </div>
  </div>
));
CashierCard.displayName = 'CashierCard';

// ========================================
// MAIN DASHBOARD COMPONENT
// ========================================

const Dashboard = () => {
  // ✅ FIX: All hooks must be called unconditionally (Rules of Hooks)
  // Call useAuth directly without try-catch to avoid conditional hook call
  const {
    currentOutlet,
    currentBusiness,
    outlets,
    user,
    loadBusinesses,
    businesses,
    businessLoading,
  } = useAuth();

  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Date range filter state
  const [dateRange, setDateRange] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: '',
  });

  // Pagination state for top products
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  // Get date params based on dateRange
  const getDateParams = useCallback(() => {
    if (
      dateRange === 'custom' &&
      customDateRange.start &&
      customDateRange.end
    ) {
      return {
        date_from: customDateRange.start,
        date_to: customDateRange.end,
      };
    }
    return { date_range: dateRange };
  }, [dateRange, customDateRange]);

  // ========================================
  // REACT QUERY - Data fetching with caching
  // ========================================

  // Get current date params
  const dateParams = getDateParams();

  // Fetch sales stats with React Query (cached for 5 minutes)
  const {
    data: salesData,
    isLoading: loadingSales,
    refetch: refetchSales,
    error: salesError, // Show error if query fails
  } = useQuery({
    queryKey: queryKeys.sales.stats(dateParams, currentOutlet?.id),
    queryFn: async () => {
      const result = await salesService.getStats(dateParams);
      if (result.success && result.data) {
        let data = result.data;
        if (data.data && typeof data.data === 'object') {
          data = data.data;
        }
        return data;
      }
      throw new Error('Failed to load sales stats');
    },
    enabled: Boolean(
      currentBusiness &&
        (dateRange !== 'custom' ||
          (customDateRange?.start && customDateRange?.end))
    ),
    staleTime: 3 * 60 * 1000, // ✅ OPTIMIZED: Increase to 3 minutes (was 2 minutes)
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
    refetchOnMount: false, // ✅ OPTIMIZED: Don't refetch if data is fresh
    placeholderData: previousData => previousData, // ✅ OPTIMIZED: Keep previous data during refetch (React Query v5)
  });

  // Fetch recent orders with React Query
  const {
    data: ordersData,
    isLoading: loadingOrders,
    error: _ordersError, // Prefixed with _ to indicate intentionally unused
    refetch: refetchOrders,
  } = useQuery({
    queryKey: queryKeys.sales.orders(
      {
        page: 1,
        limit: 5,
        ...dateParams,
      },
      currentOutlet?.id
    ),
    queryFn: async () => {
      const result = await salesService.getOrders({
        page: 1,
        limit: 5,
        ...dateParams,
      });
      if (result && result.success && result.data) {
        if (result.data.orders && Array.isArray(result.data.orders)) {
          return result.data.orders;
        } else if (Array.isArray(result.data)) {
          return result.data;
        }
      }
      return [];
    },
    enabled: Boolean(
      currentBusiness &&
        (dateRange !== 'custom' ||
          (customDateRange?.start && customDateRange?.end))
    ),
    staleTime: 2 * 60 * 1000, // ✅ OPTIMIZED: Increase to 2 minutes
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: false, // ✅ OPTIMIZED: Don't refetch if data is fresh
    placeholderData: previousData => previousData, // ✅ OPTIMIZED: Keep previous data during refetch (React Query v5)
  });

  // Fetch top products with React Query (with pagination)
  // ✅ OPTIMIZED: Load after critical data (sales stats & orders) to reduce initial load
  const {
    data: productsData,
    isLoading: loadingProducts,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: queryKeys.dashboard.topProducts(
      {
        page: currentPage,
        limit: itemsPerPage,
        ...dateParams,
      },
      currentOutlet?.id
    ),
    retry: (failureCount, error) => {
      // Retry timeout errors up to 2 times
      const isTimeout =
        error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
      if (isTimeout && failureCount < 2) {
        return true;
      }
      // Don't retry other errors
      return false;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    queryFn: async () => {
      try {
        // ✅ OPTIMIZED: Removed console.log for better performance
        const result = await dashboardService.getTopProducts({
          page: currentPage,
          limit: itemsPerPage,
          ...dateParams,
        });

        if (result && result.success && result.data) {
          let products = [];
          let total = 0;

          if (Array.isArray(result.data)) {
            products = result.data;
            total = result.total || result.data.length;
          } else if (result.data.data && Array.isArray(result.data.data)) {
            products = result.data.data;
            total = result.data.total || result.data.data.length;
          }

          return {
            products,
            total,
            currentPage:
              result.current_page || result.data?.current_page || currentPage,
            totalPages:
              result.last_page ||
              result.data?.last_page ||
              Math.ceil(total / itemsPerPage),
          };
        }

        return {
          products: [],
          total: 0,
          currentPage: 1,
          totalPages: 1,
        };
      } catch (error) {
        // Handle error gracefully - return empty data instead of crashing
        // ✅ OPTIMIZED: Removed console.warn for better performance

        // Return empty data instead of throwing error
        return {
          products: [],
          total: 0,
          currentPage: 1,
          totalPages: 1,
        };
      }
    },
    enabled: Boolean(
      currentBusiness &&
        (dateRange !== 'custom' ||
          (customDateRange?.start && customDateRange?.end)) &&
        !loadingSales && // ✅ OPTIMIZED: Load after sales stats
        !loadingOrders // ✅ OPTIMIZED: Load after orders
    ),
    staleTime: 5 * 60 * 1000, // ✅ OPTIMIZED: Increase to 5 minutes (was 2 minutes)
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce requests
    refetchOnMount: false, // ✅ OPTIMIZED: Don't refetch if data is fresh
    keepPreviousData: true, // ✅ OPTIMIZED: Keep previous data during refetch for smooth UX
  });

  // Fetch active shift for kasir
  // ✅ OPTIMIZED: Load after critical data to reduce initial load
  const {
    data: _activeShift, // Prefixed with _ to indicate intentionally unused
    isLoading: _loadingShift, // Prefixed with _ to indicate intentionally unused
    error: _shiftError, // Prefixed with _ to indicate intentionally unused
  } = useQuery({
    queryKey: queryKeys.shifts.active(currentOutlet?.id),
    queryFn: async () => {
      const result = await shiftService.getActiveShift();
      if (result.success && result.data?.has_active_shift) {
        return result.data.data;
      }
      return null;
    },
    enabled: Boolean(
      user?.role === 'kasir' &&
        !loadingSales && // ✅ OPTIMIZED: Load after sales stats
        !loadingOrders // ✅ OPTIMIZED: Load after orders
    ),
    staleTime: 2 * 60 * 1000, // ✅ OPTIMIZED: Increase to 2 minutes
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: false, // ✅ OPTIMIZED: Don't refetch if data is fresh
  });

  // Fetch active cashiers for admin/owner
  // ✅ OPTIMIZED: Load after critical data to reduce initial load
  const {
    data: activeCashiers,
    isLoading: _loadingCashiers, // Prefixed with _ to indicate intentionally unused
    error: _cashiersError, // Prefixed with _ to indicate intentionally unused
  } = useQuery({
    queryKey: queryKeys.shifts.allActive(currentOutlet?.id),
    queryFn: async () => {
      const result = await shiftService.getActiveShifts();
      if (result.success && result.data) {
        let cashiersData = result.data;
        if (result.data.data && Array.isArray(result.data.data)) {
          cashiersData = result.data.data;
        } else if (Array.isArray(result.data)) {
          cashiersData = result.data;
        } else {
          cashiersData = [];
        }
        return cashiersData;
      }
      return [];
    },
    enabled: Boolean(
      ['owner', 'super_admin', 'admin'].includes(user?.role) &&
        currentOutlet &&
        !loadingSales && // ✅ OPTIMIZED: Load after sales stats
        !loadingOrders // ✅ OPTIMIZED: Load after orders
    ),
    staleTime: 2 * 60 * 1000, // ✅ OPTIMIZED: Increase to 2 minutes
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: false, // ✅ OPTIMIZED: Don't refetch if data is fresh
  });

  // ✅ REMOVED: Prefetch duplikat - useQuery sudah handle fetching, tidak perlu prefetch lagi

  // Combine loading states - but don't block initial render
  const loading =
    loadingSales || loadingOrders || loadingProducts || refreshing;
  
  // ✅ FIX: Show loading skeleton when data is loading or when queries are enabled but no data yet
  // This handles the case where queries are enabled but haven't returned data
  const isQueryEnabled = Boolean(
    currentBusiness &&
    (dateRange !== 'custom' ||
      (customDateRange?.start && customDateRange?.end))
  );
  
  // ✅ FIX: Improved loading state detection
  // Show skeleton when:
  // 1. Query is enabled and currently loading (first time or refetch)
  // 2. Query is enabled but no data yet (initial state before query starts or after error)
  // 3. User is manually refreshing
  const isInitialLoad =
    // Case 1: Currently loading and no data yet
    (isQueryEnabled && loadingSales && !salesData) ||
    // Case 2: Query enabled but no data and not in error state (initial load or after error cleared)
    (isQueryEnabled && !salesData && !salesError) ||
    // Case 3: Manual refresh without data
    (refreshing && !salesData);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Dashboard Debug:', {
      currentBusiness: currentBusiness?.name,
      currentOutlet: currentOutlet?.name,
      loadingSales,
      salesData: !!salesData,
      salesError: salesError?.message,
      isInitialLoad,
      enabled:
        !!currentBusiness &&
        (dateRange !== 'custom' ||
          (customDateRange.start && customDateRange.end)),
    });
  }, [
    currentBusiness,
    currentOutlet,
    loadingSales,
    salesData,
    salesError,
    isInitialLoad,
    dateRange,
    customDateRange,
  ]);

  // Transform sales data to stats
  const stats = useMemo(() => {
    if (!salesData) {
      return {
        totalSales: 0,
        totalTransactions: 0,
        activeCustomers: 0,
        productsSold: 0,
        averageTransaction: 0,
        conversionRate: 0,
      };
    }

    return {
      totalSales: salesData.total_sales || salesData.total_revenue || 0,
      totalTransactions:
        salesData.total_transactions || salesData.total_orders || 0,
      activeCustomers:
        salesData.unique_customers || salesData.active_customers || 0,
      productsSold: salesData.total_items || 0,
      averageTransaction:
        salesData.average_transaction || salesData.avg_order_value || 0,
      conversionRate: salesData.conversion_rate || 0,
    };
  }, [salesData]);

  // Set recent orders and top products from query data
  const recentOrders = ordersData || [];
  const topProducts = productsData?.products || [];
  const productsPagination = {
    currentPage: productsData?.currentPage || 1,
    totalPages: productsData?.totalPages || 1,
    total: productsData?.total || 0,
  };

  // ========================================
  // MEMOIZED VALUES - Prevent unnecessary recalculations
  // ========================================

  // Memoize additional stats configuration
  const additionalStats = useMemo(
    () => [
      {
        title: 'Rata-rata Per Transaksi',
        value: formatCurrency(stats.averageTransaction),
        change: '+3.2%',
        trend: 'up',
        icon: Target,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
      },
      {
        title: 'Konversi Pelanggan',
        value: formatPercentage(stats.conversionRate),
        change: '+4.1%',
        trend: 'up',
        icon: Zap,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
      },
    ],
    [stats]
  );

  // Memoize current date string
  const currentDateString = useMemo(
    () =>
      new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  // Memoize current time string (update every minute)
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // ========================================
  // MEMOIZED CALLBACKS - Prevent function recreation
  // ========================================

  // Memoize status badge function
  const getStatusBadge = useCallback(status => {
    const statusConfig = {
      completed: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Selesai',
      },
      processing: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Diproses',
      },
      pending: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'Menunggu',
      },
      cancelled: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Dibatalkan',
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={`${config.color} border font-medium`}>
        {config.label}
      </Badge>
    );
  }, []);

  // Memoize quick action handler
  const handleQuickAction = useCallback(
    action => {
      const actions = {
        cashier: '/cashier',
        products: '/products',
        reports: '/reports',
        inventory: '/inventory',
        employees: '/employees',
        promo: '/promo',
      };

      if (actions[action]) {
        navigate(actions[action]);
      }
    },
    [navigate]
  );

  // Memoize refresh handler - hanya refresh data dashboard tanpa reload halaman
  const handleRefresh = useCallback(async () => {
    if (refreshing || loadingSales || loadingOrders || loadingProducts) {
      return; // Prevent multiple simultaneous refreshes
    }

    setRefreshing(true);
    try {
      // ✅ FIX: Also reload businesses if currentBusiness is null
      if (!currentBusiness && loadBusinesses) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Dashboard: Reloading businesses during refresh...');
        }
        await loadBusinesses(undefined, true); // Force refresh
      }

      // ✅ FIX: Invalidate query cache first to force fresh data
      const dateParams = getDateParams();
      
      // Invalidate all related queries to mark them as stale (this is synchronous)
      queryClient.invalidateQueries({
        queryKey: queryKeys.sales.stats(dateParams, currentOutlet?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.sales.orders(
          {
            page: 1,
            limit: 5,
            ...dateParams,
          },
          currentOutlet?.id
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.topProducts(
          {
            page: currentPage,
            limit: itemsPerPage,
            ...dateParams,
          },
          currentOutlet?.id
        ),
      });

      // ✅ FIX: Force refetch all queries immediately after invalidate
      // Using cancelRefetch: false to ensure fresh data is fetched even if query is in progress
      const [salesResult, ordersResult, productsResult] = await Promise.all([
        refetchSales({ cancelRefetch: false }),
        refetchOrders({ cancelRefetch: false }),
        refetchProducts({ cancelRefetch: false }),
      ]);
      
      // Log for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Dashboard refresh completed:', {
          sales: salesResult?.data ? '✅' : '❌',
          orders: ordersResult?.data ? '✅' : '❌',
          products: productsResult?.data ? '✅' : '❌',
        });
      }
      
      setLastUpdated(new Date());
      toast({
        title: 'Berhasil!',
        description: 'Data dashboard berhasil diperbarui',
        variant: 'default',
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error refreshing dashboard:', error);
      }
      toast({
        title: 'Error!',
        description: 'Gagal memuat ulang data dashboard',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  }, [
    refetchSales,
    refetchOrders,
    refetchProducts,
    refreshing,
    currentBusiness,
    loadBusinesses,
    loadingSales,
    loadingOrders,
    loadingProducts,
    toast,
    queryClient,
    getDateParams,
    currentOutlet?.id,
    currentPage,
    itemsPerPage,
  ]);

  // Handle reset filter - kembalikan ke default
  const handleResetFilter = useCallback(() => {
    setDateRange('today');
    setCustomDateRange({ start: '', end: '' });
    // Data akan auto-refetch karena dateParams berubah
  }, []);

  // Handle pagination change
  const handlePageChange = useCallback(page => {
    setCurrentPage(page);
  }, []);

  // ========================================
  // EFFECTS
  // ========================================

  // Update last updated time when data changes
  useEffect(() => {
    if (salesData) {
      setLastUpdated(new Date());
    }
  }, [salesData]);

  // Debug: Log top products data
  useEffect(() => {
    console.log('📊 Top Products Debug:', {
      loadingProducts,
      productsError,
      productsData,
      topProducts,
      dateRange,
      customDateRange,
      dateParams,
      enabled:
        !!currentBusiness &&
        (dateRange !== 'custom' ||
          (customDateRange.start && customDateRange.end)),
    });
  }, [
    loadingProducts,
    productsError,
    productsData,
    topProducts,
    dateRange,
    customDateRange,
    dateParams,
    currentBusiness,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = event => {
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        handleRefresh();
      }

      // F5 for refresh
      if (event.key === 'F5') {
        event.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  // ========================================
  // RENDER - No outlet selected
  // ========================================

  if (!currentOutlet) {
    return (
      <div className='space-y-6'>
        <Card className='p-8 text-center'>
          <Activity className='w-16 h-16 mx-auto text-gray-400 mb-4' />
          <h3 className='text-xl font-semibold text-gray-900 mb-2'>
            Pilih Outlet Terlebih Dahulu
          </h3>
          <p className='text-gray-500 mb-4'>
            Anda perlu memilih outlet untuk mengakses dashboard.
          </p>
          {outlets && outlets.length > 0 && (
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
          )}
        </Card>
      </div>
    );
  }

  // ========================================
  // RENDER - No business selected
  // ========================================

  if (!currentBusiness) {
    // ✅ FIX: Handle case when business is loading
    if (businessLoading) {
      return (
        <div className='space-y-6'>
          <Card className='p-8 text-center'>
            <Activity className='w-16 h-16 mx-auto text-gray-400 mb-4 animate-pulse' />
            <h3 className='text-xl font-semibold text-gray-900 mb-2'>
              Memuat Data Bisnis...
            </h3>
            <p className='text-gray-500 mb-4'>
              Sedang memuat informasi bisnis Anda.
            </p>
          </Card>
        </div>
      );
    }

    // ✅ FIX: Handle case when no business found - show refresh button
    const handleRefreshBusinesses = async () => {
      setRefreshing(true);
      try {
        // Clear cache
        localStorage.removeItem('businesses');
        localStorage.removeItem('currentBusiness');
        localStorage.removeItem('currentBusinessId');

        // Reload businesses
        await loadBusinesses();
        toast.success('Data bisnis diperbarui');
      } catch (error) {
        console.error('Error refreshing businesses:', error);
        toast.error('Gagal memuat data bisnis');
      } finally {
        setRefreshing(false);
      }
    };

    return (
      <div className='space-y-6'>
        <Card className='p-8 text-center'>
          <Activity className='w-16 h-16 mx-auto text-gray-400 mb-4' />
          <h3 className='text-xl font-semibold text-gray-900 mb-2'>
            Bisnis Tidak Ditemukan
          </h3>
          <p className='text-gray-500 mb-4'>
            {businesses && businesses.length === 0
              ? 'Anda belum memiliki bisnis. Silakan buat bisnis terlebih dahulu.'
              : 'Bisnis tidak ditemukan. Coba refresh untuk memuat ulang data.'}
          </p>
          <div className='flex flex-col sm:flex-row gap-3 justify-center'>
            <Button
              onClick={handleRefreshBusinesses}
              disabled={refreshing}
              variant='outline'
              className='flex items-center gap-2'
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              />
              {refreshing ? 'Memuat...' : 'Refresh Data Bisnis'}
            </Button>
            {(!businesses || businesses.length === 0) && (
              <Button
                onClick={() => navigate('/business-setup')}
                variant='default'
              >
                Buat Bisnis Baru
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ========================================
  // MAIN RENDER
  // ========================================

  return (
    <div className='space-y-6'>
      {/* Welcome Section */}
      <div className='bg-gradient-to-r from-emerald-600 via-emerald-700 to-slate-800 dark:from-emerald-700 dark:via-slate-800 dark:to-slate-900 rounded-2xl p-6 text-white shadow-lg'>
        <div className='flex items-center justify-between'>
          <div className='flex-1'>
            <h2 className='text-2xl font-bold mb-2'>
              Selamat Datang di Dashboard
            </h2>
            <p className='text-emerald-100 dark:text-emerald-200 mb-4'>
              Kelola bisnis Anda dengan mudah dan efisien
            </p>
            <div className='flex items-center space-x-4 text-sm mb-4'>
              <div className='flex items-center space-x-2'>
                <Calendar className='w-4 h-4' />
                <span>{currentDateString}</span>
              </div>
              <div className='flex items-center space-x-2'>
                <Clock className='w-4 h-4' />
                <span>{currentTime}</span>
              </div>
              <div className='flex items-center space-x-2'>
                <RefreshCw className='w-4 h-4' />
                <span>
                  Terakhir update:{' '}
                  {lastUpdated.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {currentOutlet && (
              <div className='mt-2 text-sm text-emerald-100 dark:text-emerald-200'>
                📍 {currentOutlet.name} • {currentBusiness?.name}
              </div>
            )}
          </div>
          <div className='flex items-center space-x-4'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className='bg-white/10 border-white/20 text-white hover:bg-white/20'
              title='Refresh data (Tekan R)'
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  loading || refreshing ? 'animate-spin' : ''
                }`}
              />
              {loading || refreshing ? 'Loading...' : 'Refresh'}
            </Button>
            <div className='hidden md:block'>
              <Activity className='w-20 h-20 text-emerald-200 dark:text-emerald-300' />
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className='border-blue-100 shadow-sm'>
        <CardContent className='p-5'>
          <div className='flex flex-col gap-4'>
            {/* Header Filter */}
            <div className='flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-blue-50 rounded-lg'>
                  <Calendar className='w-5 h-5 text-blue-600' />
                </div>
                <div>
                  <h3 className='text-sm font-semibold text-gray-900'>
                    Filter Periode
                  </h3>
                  <p className='text-xs text-gray-500'>
                    Pilih periode untuk melihat data dashboard
                  </p>
                </div>
              </div>
              {(dateRange !== 'today' ||
                (dateRange === 'custom' &&
                  (customDateRange.start || customDateRange.end))) && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleResetFilter}
                  className='text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-300'
                  disabled={loading || refreshing}
                >
                  <RotateCw className='w-4 h-4 mr-2' />
                  Reset
                </Button>
              )}
            </div>

            {/* Filter Controls */}
            <div className='flex flex-col lg:flex-row gap-4 items-start lg:items-center'>
              <div className='flex flex-col sm:flex-row gap-3 flex-1 w-full'>
                {/* Quick Date Buttons */}
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant={dateRange === 'today' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setDateRange('today')}
                    className={
                      dateRange === 'today'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-gray-50'
                    }
                    disabled={loading || refreshing}
                  >
                    Hari Ini
                  </Button>
                  <Button
                    variant={dateRange === 'yesterday' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setDateRange('yesterday')}
                    className={
                      dateRange === 'yesterday'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-gray-50'
                    }
                    disabled={loading || refreshing}
                  >
                    Kemarin
                  </Button>
                  <Button
                    variant={dateRange === 'week' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setDateRange('week')}
                    className={
                      dateRange === 'week'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-gray-50'
                    }
                    disabled={loading || refreshing}
                  >
                    7 Hari
                  </Button>
                  <Button
                    variant={dateRange === 'month' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setDateRange('month')}
                    className={
                      dateRange === 'month'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-gray-50'
                    }
                    disabled={loading || refreshing}
                  >
                    Bulan Ini
                  </Button>
                  <Button
                    variant={dateRange === 'custom' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setDateRange('custom')}
                    className={
                      dateRange === 'custom'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-gray-50'
                    }
                    disabled={loading || refreshing}
                  >
                    Kustom
                  </Button>
                </div>

                {/* Custom Date Range Picker */}
                {dateRange === 'custom' && (
                  <div className='flex flex-col sm:flex-row gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200 shadow-inner w-full'>
                    <div className='flex-1 space-y-2'>
                      <label className='text-xs font-semibold text-gray-700 flex items-center gap-2'>
                        <Calendar className='w-3 h-3 text-blue-600' />
                        Dari Tanggal
                      </label>
                      <Input
                        type='date'
                        value={customDateRange.start}
                        onChange={e => {
                          const newStart = e.target.value;
                          setCustomDateRange({
                            ...customDateRange,
                            start: newStart,
                          });
                        }}
                        max={
                          customDateRange.end ||
                          new Date().toISOString().split('T')[0]
                        }
                        className='text-sm bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                        data-testid='custom-start-date'
                      />
                    </div>
                    <div className='flex items-end pb-7 sm:pb-0'>
                      <div className='w-6 h-0.5 bg-blue-400 rounded-full' />
                    </div>
                    <div className='flex-1 space-y-2'>
                      <label className='text-xs font-semibold text-gray-700 flex items-center gap-2'>
                        <Calendar className='w-3 h-3 text-blue-600' />
                        Sampai Tanggal
                      </label>
                      <Input
                        type='date'
                        value={customDateRange.end}
                        onChange={e => {
                          const newEnd = e.target.value;
                          setCustomDateRange({
                            ...customDateRange,
                            end: newEnd,
                          });
                        }}
                        min={customDateRange.start}
                        max={new Date().toISOString().split('T')[0]}
                        className='text-sm bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                        data-testid='custom-end-date'
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Date Range Info Badge */}
              {(dateRange !== 'custom' ||
                (dateRange === 'custom' &&
                  customDateRange.start &&
                  customDateRange.end)) && (
                <div className='flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200'>
                  <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
                  <div className='text-sm'>
                    <span className='text-gray-600 font-medium'>Periode:</span>{' '}
                    <span className='text-gray-900 font-semibold'>
                      {dateRange === 'custom' &&
                      customDateRange.start &&
                      customDateRange.end
                        ? `${new Date(customDateRange.start).toLocaleDateString(
                            'id-ID'
                          )} - ${new Date(
                            customDateRange.end
                          ).toLocaleDateString('id-ID')}`
                        : dateRange === 'today'
                        ? new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : dateRange === 'yesterday'
                        ? new Date(Date.now() - 86400000).toLocaleDateString(
                            'id-ID',
                            {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }
                          )
                        : dateRange === 'week'
                        ? `${new Date(
                            Date.now() - 7 * 86400000
                          ).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })} - ${new Date().toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}`
                        : dateRange === 'month'
                        ? `${new Date(
                            new Date().getFullYear(),
                            new Date().getMonth(),
                            1
                          ).toLocaleDateString('id-ID', {
                            month: 'long',
                            year: 'numeric',
                          })}`
                        : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {salesError && !loadingSales && (
        <Card className='border-red-200 bg-red-50'>
          <CardContent className='p-6'>
            <div className='flex items-center gap-4'>
              <AlertCircle className='w-8 h-8 text-red-600 flex-shrink-0' />
              <div className='flex-1'>
                <h3 className='text-lg font-semibold text-red-900 mb-1'>
                  Error Memuat Data Dashboard
                </h3>
                <p className='text-red-700 mb-4'>
                  {salesError.message ||
                    'Gagal memuat data penjualan. Silakan coba refresh halaman.'}
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    refetchSales();
                    refetchOrders();
                    refetchProducts();
                  }}
                  className='border-red-300 text-red-700 hover:bg-red-100'
                >
                  <RefreshCw className='w-4 h-4 mr-2' />
                  Coba Lagi
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Cards */}
      {(isInitialLoad || (isQueryEnabled && loadingSales)) ? (
        <SkeletonDashboardGrid cards={6} />
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          <StatCard
            title='Total Penjualan Hari Ini'
            value={formatCurrency(stats.totalSales)}
            icon={DollarSign}
            color='text-green-600'
            bgColor='bg-green-50'
            borderColor='border-green-200'
            subtitle='vs kemarin'
            isLoading={false}
          />
          <StatCard
            title='Jumlah Transaksi'
            value={stats.totalTransactions}
            icon={ShoppingCart}
            color='text-blue-600'
            bgColor='bg-blue-50'
            borderColor='border-blue-200'
            subtitle='transaksi hari ini'
            isLoading={false}
          />
          <StatCard
            title='Pelanggan Aktif'
            value={stats.activeCustomers}
            icon={Users}
            color='text-purple-600'
            bgColor='bg-purple-50'
            borderColor='border-purple-200'
            subtitle='pelanggan unik'
            isLoading={false}
          />
          <StatCard
            title='Produk Terjual'
            value={stats.productsSold}
            icon={Package}
            color='text-orange-600'
            bgColor='bg-orange-50'
            borderColor='border-orange-200'
            subtitle='item terjual'
            isLoading={false}
          />
          {additionalStats.map((stat, index) => (
            <TrendStatCard key={index} {...stat} />
          ))}
        </div>
      )}

      {/* Active Cashiers Section */}
      {['owner', 'super_admin', 'admin'].includes(user?.role) && (
        <Card className='border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='text-lg font-semibold flex items-center gap-2'>
                  <Users className='w-5 h-5 text-blue-600' />
                  Kasir yang Sedang Aktif
                </CardTitle>
                <CardDescription>
                  {Array.isArray(activeCashiers) ? activeCashiers.length : 0}{' '}
                  kasir sedang menjalankan shift
                </CardDescription>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => (window.location.href = '/monitoring')}
              >
                <Eye className='w-4 h-4 mr-2' />
                Lihat Detail
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!Array.isArray(activeCashiers) || activeCashiers.length === 0 ? (
              <div className='text-center py-8'>
                <AlertCircle className='w-12 h-12 text-gray-300 mx-auto mb-4' />
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  Tidak Ada Kasir Aktif
                </h3>
                <p className='text-gray-600'>
                  Belum ada kasir yang membuka shift saat ini
                </p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {activeCashiers.map(cashier => (
                  <CashierCard key={cashier.id} cashier={cashier} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Orders & Top Products */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Recent Orders */}
        <Card className='card-hover'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='text-lg font-semibold'>
                  Pesanan Terbaru
                </CardTitle>
                <CardDescription>5 transaksi terakhir hari ini</CardDescription>
              </div>
              <Button variant='outline' size='sm' data-testid='view-all-orders'>
                <Eye className='w-4 h-4 mr-2' />
                Lihat Semua
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(loadingOrders || isInitialLoad) && recentOrders.length === 0 ? (
              <SkeletonTable rows={5} columns={3} />
            ) : !Array.isArray(recentOrders) || recentOrders.length === 0 ? (
              <div className='text-center py-8'>
                <ShoppingCart className='w-12 h-12 mx-auto text-gray-400 mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  Tidak ada pesanan
                </h3>
                <p className='text-gray-500'>Belum ada pesanan hari ini.</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {recentOrders.map(order => {
                  // ✅ FIX: Count orders per table for grouping indicator
                  const tableId = order.table_id || order.table?.id;
                  const orderCountForTable = tableId
                    ? recentOrders.filter(
                        o =>
                          (o.table_id || o.table?.id) === tableId &&
                          (o.payment_status === 'pending' ||
                            o.payment_status === 'unpaid')
                      ).length
                    : 1;

                  return (
                    <OrderItem
                      key={order.id}
                      order={order}
                      getStatusBadge={getStatusBadge}
                      orderCountForTable={orderCountForTable}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products - With Pagination */}
        <Card className='card-hover'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='text-lg font-semibold'>
                  Produk Terlaris
                </CardTitle>
                <CardDescription>
                  Produk terlaris berdasarkan penjualan{' '}
                  {dateRange === 'today'
                    ? 'hari ini'
                    : dateRange === 'yesterday'
                    ? 'kemarin'
                    : dateRange === 'week'
                    ? '7 hari terakhir'
                    : dateRange === 'month'
                    ? 'bulan ini'
                    : dateRange === 'custom' &&
                      customDateRange.start &&
                      customDateRange.end
                    ? `periode ${new Date(
                        customDateRange.start
                      ).toLocaleDateString('id-ID')} - ${new Date(
                        customDateRange.end
                      ).toLocaleDateString('id-ID')}`
                    : 'periode terpilih'}
                </CardDescription>
              </div>
              <Button
                variant='outline'
                size='sm'
                data-testid='view-all-products'
              >
                <BarChart3 className='w-4 h-4 mr-2' />
                Analisis
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(loadingProducts || isInitialLoad) && topProducts.length === 0 ? (
              <SkeletonTable rows={5} columns={3} />
            ) : productsError ? (
              <div className='text-center py-8'>
                <AlertCircle className='w-12 h-12 mx-auto text-red-400 mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  Error Memuat Data
                </h3>
                <p className='text-gray-500 mb-4'>
                  {productsError.message || 'Gagal memuat data produk terlaris'}
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => refetchProducts()}
                >
                  <RefreshCw className='w-4 h-4 mr-2' />
                  Coba Lagi
                </Button>
              </div>
            ) : !Array.isArray(topProducts) || topProducts.length === 0 ? (
              <div className='text-center py-8'>
                <Package className='w-12 h-12 mx-auto text-gray-400 mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  Tidak ada data produk
                </h3>
                <p className='text-gray-500'>
                  Belum ada data penjualan produk untuk periode yang dipilih.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {/* Products List */}
                <div className='space-y-3'>
                  {topProducts.map((product, index) => (
                    <ProductItem
                      key={product.product_id || product.id || index}
                      product={product}
                      index={(currentPage - 1) * itemsPerPage + index}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className='pt-4 border-t'>
                  <ProductPagination
                    currentPage={productsPagination.currentPage}
                    totalPages={productsPagination.totalPages}
                    totalItems={productsPagination.total}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className='card-hover'>
        <CardHeader>
          <CardTitle className='text-lg font-semibold'>Aksi Cepat</CardTitle>
          <CardDescription>Akses fitur utama dengan cepat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
            <Button
              className='h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
              data-testid='quick-cashier'
              onClick={() => handleQuickAction('cashier')}
            >
              <DollarSign className='w-6 h-6' />
              <span className='text-xs'>Kasir</span>
            </Button>
            <Button
              className='h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
              data-testid='quick-products'
              onClick={() => handleQuickAction('products')}
            >
              <Package className='w-6 h-6' />
              <span className='text-xs'>Produk</span>
            </Button>
            <Button
              className='h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
              data-testid='quick-reports'
              onClick={() => handleQuickAction('reports')}
            >
              <BarChart3 className='w-6 h-6' />
              <span className='text-xs'>Laporan</span>
            </Button>
            <Button
              className='h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
              data-testid='quick-inventory'
              onClick={() => handleQuickAction('inventory')}
            >
              <AlertCircle className='w-6 h-6' />
              <span className='text-xs'>Stok</span>
            </Button>
            <Button
              className='h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white'
              data-testid='quick-employees'
              onClick={() => handleQuickAction('employees')}
            >
              <Users className='w-6 h-6' />
              <span className='text-xs'>Karyawan</span>
            </Button>
            <Button
              className='h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white'
              data-testid='quick-promo'
              onClick={() => handleQuickAction('promo')}
            >
              <Gift className='w-6 h-6' />
              <span className='text-xs'>Promo</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(Dashboard);
