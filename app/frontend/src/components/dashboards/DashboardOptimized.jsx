import { useQuery } from '@tanstack/react-query';
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
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardService } from '../../services/dashboard.service';
import { salesService } from '../../services/salesService';
import { shiftService } from '../../services/shift.service';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import AccessDeniedModal from '../modals/AccessDeniedModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

// ========================================
// MEMOIZED SUB-COMPONENTS FOR PERFORMANCE
// ========================================

// Stat Card Component - Memoized to prevent re-renders
const StatCard = memo(
  ({ title, value, icon: Icon, color, bgColor, borderColor, subtitle }) => (
    <Card className={`${bgColor} ${borderColor} border-2 card-hover`}>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium text-gray-700'>
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold text-gray-900 mb-1'>{value}</div>
        <p className='text-xs text-gray-600'>{subtitle}</p>
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
const OrderItem = memo(({ order, getStatusBadge, orderCountForTable = 1 }) => {
  // ✅ FIX: Get customer name from multiple sources
  const customerName = order.customer?.name || 
                       order.customer_name || 
                       order.customer || 
                       'Walk-in Customer';
  
  // ✅ FIX: Check if customer is member
  const isMember = order.customer?.id || order.customer_id;
  
  // ✅ FIX: Get table name (support multiple formats)
  const tableName = order.table?.name || 
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
            <p className='font-semibold text-gray-900'>
              {customerName}
            </p>
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
              {new Date(order.created_at || order.ordered_at).toLocaleTimeString('id-ID', {
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
            {order.payment_method && (
              <>
                <span className='text-xs text-gray-400'>•</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  order.payment_method === 'cash'
                    ? 'bg-green-100 text-green-700'
                    : order.payment_method === 'card'
                    ? 'bg-blue-100 text-blue-700'
                    : order.payment_method === 'qris'
                    ? 'bg-purple-100 text-purple-700'
                    : order.payment_method === 'transfer'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {order.payment_method === 'cash'
                    ? 'Cash'
                    : order.payment_method === 'card'
                    ? 'Card'
                    : order.payment_method === 'qris'
                    ? 'QRIS'
                    : order.payment_method === 'transfer'
                    ? 'Transfer'
                    : order.payment_method}
                </span>
              </>
            )}
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
          {product.total_sold || product.quantity_sold || product.sold || 0}{' '}
          terjual
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

const DashboardOptimized = () => {
  const { currentOutlet, currentBusiness, outlets, user, subscriptionFeatures } = useAuth();
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [accessDeniedFeature, setAccessDeniedFeature] = useState(null);

  // ========================================
  // REACT QUERY - Data fetching with caching
  // ========================================

  // Fetch sales stats with React Query (cached for 5 minutes)
  const {
    data: salesData,
    isLoading: loadingSales,
    refetch: refetchSales,
    error: salesError,
  } = useQuery({
    queryKey: queryKeys.sales.stats({ date_range: 'today' }),
    queryFn: async () => {
      const result = await salesService.getStats({ date_range: 'today' });
      if (result.success && result.data) {
        let data = result.data;
        if (data.data && typeof data.data === 'object') {
          data = data.data;
        }
        return data;
      }
      throw new Error('Failed to load sales stats');
    },
    enabled: Boolean(currentOutlet),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    retryDelay: 1000,
    // ✅ FIX: Suppress error notifications for 403 (subscription required) - this is normal
    retry: (failureCount, error) => {
      const is403Subscription = error?.response?.status === 403 && (
        error?.response?.data?.message?.includes('subscription') ||
        error?.response?.data?.subscription_required
      );
      // Don't retry if it's a subscription required error
      if (is403Subscription) return false;
      return failureCount < 1;
    },
  });

  // Fetch recent orders with React Query
  const {
    data: ordersData,
    isLoading: loadingOrders,
    error: ordersError,
  } = useQuery({
    queryKey: queryKeys.sales.orders({
      page: 1,
      limit: 5,
      date_range: 'today',
    }),
    queryFn: async () => {
      const result = await salesService.getOrders({
        page: 1,
        limit: 5,
        date_range: 'today',
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
    enabled: Boolean(currentOutlet),
    staleTime: 2 * 60 * 1000, // 2 minutes
    // ✅ FIX: Suppress error notifications for 403 (subscription required) - this is normal
    retry: (failureCount, error) => {
      const is403Subscription = error?.response?.status === 403 && (
        error?.response?.data?.message?.includes('subscription') ||
        error?.response?.data?.subscription_required
      );
      // Don't retry if it's a subscription required error
      if (is403Subscription) return false;
      return failureCount < 1;
    },
  });

  // Fetch top products with React Query
  const {
    data: productsData,
    isLoading: loadingProducts,
    error: productsError,
  } = useQuery({
    queryKey: queryKeys.dashboard.topProducts(),
    queryFn: async () => {
      const result = await dashboardService.getTopProducts();
      if (result && result.success && result.data) {
        if (Array.isArray(result.data)) {
          return result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          return result.data.data;
        }
      }
      return [];
    },
    enabled: Boolean(currentOutlet),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Fetch active shift for kasir
  const {
    data: activeShift,
    isLoading: loadingShift,
    error: shiftError,
  } = useQuery({
    queryKey: queryKeys.shifts.active(),
    queryFn: async () => {
      const result = await shiftService.getActiveShift();
      if (result.success && result.data?.has_active_shift) {
        return result.data.data;
      }
      return null;
    },
    enabled: Boolean(user?.role === 'kasir'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch active cashiers for admin/owner
  const {
    data: activeCashiers,
    isLoading: loadingCashiers,
    error: cashiersError,
  } = useQuery({
    queryKey: queryKeys.shifts.allActive(),
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
      ['owner', 'super_admin', 'admin'].includes(user?.role) && currentOutlet
    ),
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: 1,
  });

  // Combine loading states
  const loading = loadingSales || loadingOrders || loadingProducts;

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
  const topProducts = productsData || [];

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
      // ✅ NEW: Check reports access before navigating
      if (action === 'reports') {
        const hasReportsAccess = subscriptionFeatures?.has_reports_access ?? subscriptionFeatures?.has_advanced_reports ?? false;
        if (!hasReportsAccess) {
          setAccessDeniedFeature('advanced_reports');
          setShowAccessDeniedModal(true);
          return;
        }
      }

      // ✅ NEW: Check promo access before navigating
      if (action === 'promo') {
        const hasPromoAccess = subscriptionFeatures?.has_promo_access ?? false;
        if (!hasPromoAccess) {
          setAccessDeniedFeature('promo');
          setShowAccessDeniedModal(true);
          return;
        }
      }

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
    [navigate, subscriptionFeatures]
  );

  // Memoize refresh handler - now using React Query refetch
  const handleRefresh = useCallback(() => {
    refetchSales();
    setLastUpdated(new Date());
    toast.success('Data dashboard diperbarui');
  }, [refetchSales]);

  // ========================================
  // EFFECTS
  // ========================================

  // Update last updated time when data changes
  useEffect(() => {
    if (salesData) {
      setLastUpdated(new Date());
    }
  }, [salesData]);

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
              disabled={loading}
              className='bg-white/10 border-white/20 text-white hover:bg-white/20'
              title='Refresh data (Tekan R)'
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            <div className='hidden md:block'>
              <Activity className='w-20 h-20 text-emerald-200 dark:text-emerald-300' />
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        <StatCard
          title='Total Penjualan Hari Ini'
          value={formatCurrency(stats.totalSales)}
          icon={DollarSign}
          color='text-green-600'
          bgColor='bg-green-50'
          borderColor='border-green-200'
          subtitle='vs kemarin'
        />
        <StatCard
          title='Jumlah Transaksi'
          value={stats.totalTransactions}
          icon={ShoppingCart}
          color='text-blue-600'
          bgColor='bg-blue-50'
          borderColor='border-blue-200'
          subtitle='transaksi hari ini'
        />
        <StatCard
          title='Pelanggan Aktif'
          value={stats.activeCustomers}
          icon={Users}
          color='text-purple-600'
          bgColor='bg-purple-50'
          borderColor='border-purple-200'
          subtitle='pelanggan unik'
        />
        <StatCard
          title='Produk Terjual'
          value={stats.productsSold}
          icon={Package}
          color='text-orange-600'
          bgColor='bg-orange-50'
          borderColor='border-orange-200'
          subtitle='item terjual'
        />
        {additionalStats.map((stat, index) => (
          <TrendStatCard key={index} {...stat} />
        ))}
      </div>

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
            {loading ? (
              <div className='flex items-center justify-center py-8'>
                <div className='flex items-center space-x-2'>
                  <RefreshCw className='w-5 h-5 animate-spin' />
                  <span>Memuat pesanan...</span>
                </div>
              </div>
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

        {/* Top Products */}
        <Card className='card-hover'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='text-lg font-semibold'>
                  Produk Terlaris
                </CardTitle>
                <CardDescription>
                  Berdasarkan penjualan hari ini
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
            {loading ? (
              <div className='flex items-center justify-center py-8'>
                <div className='flex items-center space-x-2'>
                  <RefreshCw className='w-5 h-5 animate-spin' />
                  <span>Memuat produk...</span>
                </div>
              </div>
            ) : !Array.isArray(topProducts) || topProducts.length === 0 ? (
              <div className='text-center py-8'>
                <Package className='w-12 h-12 mx-auto text-gray-400 mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  Tidak ada data produk
                </h3>
                <p className='text-gray-500'>
                  Belum ada data penjualan produk hari ini.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {topProducts.map((product, index) => (
                  <ProductItem
                    key={product.id || index}
                    product={product}
                    index={index}
                  />
                ))}
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
              className={`h-20 flex flex-col items-center justify-center space-y-2 ${
                (subscriptionFeatures?.has_reports_access ?? subscriptionFeatures?.has_advanced_reports ?? false)
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
                  : 'bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white cursor-not-allowed opacity-60'
              }`}
              data-testid='quick-reports'
              onClick={() => handleQuickAction('reports')}
              disabled={!(subscriptionFeatures?.has_reports_access ?? subscriptionFeatures?.has_advanced_reports ?? false)}
              title={
                !(subscriptionFeatures?.has_reports_access ?? subscriptionFeatures?.has_advanced_reports ?? false)
                  ? 'Akses Laporan memerlukan paket Professional atau lebih tinggi'
                  : 'Buka halaman Laporan'
              }
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
              className={`h-20 flex flex-col items-center justify-center space-y-2 ${
                (subscriptionFeatures?.has_promo_access ?? false)
                  ? 'bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white'
                  : 'bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white cursor-not-allowed opacity-60'
              }`}
              data-testid='quick-promo'
              onClick={(e) => {
                const hasPromoAccess = subscriptionFeatures?.has_promo_access ?? false;
                if (!hasPromoAccess) {
                  e.preventDefault();
                  e.stopPropagation();
                  setAccessDeniedFeature('promo');
                  setShowAccessDeniedModal(true);
                  return;
                }
                handleQuickAction('promo');
              }}
              disabled={!(subscriptionFeatures?.has_promo_access ?? false)}
              title={
                !(subscriptionFeatures?.has_promo_access ?? false)
                  ? 'Akses Promo memerlukan paket Premium atau lebih tinggi'
                  : 'Buka halaman Promo'
              }
            >
              <Gift className='w-6 h-6' />
              <span className='text-xs'>Promo</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ✅ NEW: Access Denied Modal */}
      <AccessDeniedModal
        isOpen={showAccessDeniedModal}
        onClose={() => {
          setShowAccessDeniedModal(false);
          setAccessDeniedFeature(null);
        }}
        feature={accessDeniedFeature}
        requiredPlan='Professional'
      />
    </div>
  );
};

export default memo(DashboardOptimized);
