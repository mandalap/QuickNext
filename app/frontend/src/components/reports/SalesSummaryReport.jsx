import {
  BarChart3,
  DollarSign,
  Filter,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { retryWithBackoff } from '../../utils/performance/retry';
import { useDebounce } from '../../hooks/useDebounce';
import { queryKeys } from '../../config/reactQuery';
import SalesSummaryReportSkeleton from './SalesSummaryReportSkeleton';
import reportService from '../../services/reportService';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

const SalesSummaryReport = ({ chartType = 'daily', dateRange = 'today', customDate = {} }) => {
  const queryClient = useQueryClient();

  // ✅ OPTIMIZATION: Refs untuk mencegah duplicate calls
  const fetchingRef = useRef(false);
  const requestQueueRef = useRef(new Set());

  const [refreshing, setRefreshing] = useState(false);

  // ✅ OPTIMIZATION: Debounced date range untuk mengurangi API calls
  const debouncedChartType = useDebounce(chartType, 300);
  const debouncedDateRange = useDebounce(dateRange, 300);
  const debouncedCustomDate = useDebounce(customDate, 300);

  // ✅ OPTIMIZATION: TanStack Query dengan retry, caching, prefetching, dan background refetch
  const {
    data: reportData,
    isLoading: reportLoading,
    isFetching: reportFetching,
    error: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: queryKeys.sales.stats(
      {
        chart_type: debouncedChartType,
        date_range: debouncedDateRange,
        custom_start: debouncedCustomDate.start,
        custom_end: debouncedCustomDate.end,
      },
      null
    ),
    queryFn: async () => {
      const requestId = 'fetchSalesSummary';
      if (fetchingRef.current || requestQueueRef.current.has(requestId)) {
        throw new Error('Duplicate request prevented');
      }
      fetchingRef.current = true;
      requestQueueRef.current.add(requestId);

      try {
        const params = {
          chartType: debouncedChartType,
          dateRange: debouncedDateRange,
          customStart: debouncedCustomDate.start,
          customEnd: debouncedCustomDate.end,
        };

        const result = await retryWithBackoff(
          () => reportService.getSalesSummary(params),
          {
            maxRetries: 3,
            baseDelay: 1000,
            shouldRetry: error => {
              if (!error.response) return true;
              const status = error.response?.status;
              return status >= 500 || status === 429;
            },
          }
        );
        return result;
      } finally {
        fetchingRef.current = false;
        requestQueueRef.current.delete(requestId);
      }
    },
    enabled: !!debouncedDateRange,
    staleTime: 2 * 60 * 1000, // 2 minutes - cache lebih lama untuk report
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    retry: 2, // Retry 2 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Disable auto refetch on focus
    refetchOnReconnect: true, // Refetch on reconnect
    refetchInterval: 5 * 60 * 1000, // Background refetch every 5 minutes
    refetchIntervalInBackground: true, // Continue refetching in background
  });

  // ✅ OPTIMIZATION: Prefetch related data on mount
  useEffect(() => {
    if (debouncedDateRange) {
      // Prefetch dengan date range yang berbeda
      queryClient.prefetchQuery({
        queryKey: queryKeys.sales.stats({ date_range: 'yesterday' }, null),
        queryFn: () =>
          reportService.getSalesSummary({ dateRange: 'yesterday' }),
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [debouncedDateRange, queryClient]);

  // ✅ OPTIMIZATION: Extract dan transform data
  const data = useMemo(() => {
    if (!reportData || !reportData.success) {
      return {
        totalSales: 0,
        totalTransactions: 0,
        netSales: 0,
        averageTransaction: 0,
        growthRate: 0,
        paymentMethods: [],
        dailySales: [],
        topProducts: [],
      };
    }

    const apiData = reportData.data || reportData;

    // Map payment methods with colors
    const paymentMethodsWithColors = (apiData.payment_methods || []).map(
      (method, index) => {
        const colors = [
          'bg-green-500',
          'bg-blue-500',
          'bg-purple-500',
          'bg-orange-500',
        ];
        return {
          ...method,
          color: colors[index % colors.length],
        };
      }
    );

    return {
      totalSales: apiData.total_sales || 0,
      totalTransactions: apiData.total_transactions || 0,
      netSales: apiData.net_sales || 0,
      averageTransaction: apiData.average_transaction || 0,
      growthRate: apiData.growth_rate || 0,
      paymentMethods: paymentMethodsWithColors,
      dailySales: apiData.daily_sales || [],
      topProducts: apiData.top_products || [],
    };
  }, [reportData]);

  const loading = reportLoading;

  // ✅ OPTIMIZATION: Handle refresh dengan manual refetch
  const handleRefresh = useCallback(async () => {
    if (refreshing || reportLoading) return; // Prevent multiple simultaneous refreshes

    setRefreshing(true);
    try {
      await refetchReport();
      toast.success('✅ Data laporan berhasil dimuat ulang', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to refresh:', error);
      toast.error('❌ Gagal memuat ulang data laporan', { duration: 6000 });
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, reportLoading, refetchReport]);

  // ✅ F5 Handler: Refresh data without full page reload
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F5 or R key (with Ctrl/Cmd or without)
      if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault(); // Prevent default browser reload
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRefresh]);

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = number => {
    return new Intl.NumberFormat('id-ID').format(number);
  };

  // ✅ OPTIMIZATION: Show skeleton loader instead of simple spinner
  if (loading && !reportData) {
    return <SalesSummaryReportSkeleton />;
  }

  // ✅ OPTIMIZATION: Handle errors with detailed display
  if (reportError) {
    const error = reportError;
    let errorMessage = '❌ Gagal memuat data laporan';
    let errorDetails = '';
    let errorStack = null;

    // ✅ FIX: Log full error to console for debugging
    console.error('🔴 SalesSummaryReport Error:', {
      error,
      response: error.response,
      message: error.message,
      stack: error.stack,
    });

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // ✅ FIX: Show detailed error from backend
      if (data?.error) {
        errorStack = data.error;
        console.error('🔴 Backend Error Details:', data.error);
      }

      switch (status) {
        case 401:
          errorMessage = '❌ Tidak memiliki izin';
          errorDetails = 'Silakan login ulang';
          break;
        case 403:
          errorMessage = '❌ Akses ditolak';
          errorDetails = 'Anda tidak memiliki izin untuk melihat data ini';
          break;
        case 500:
          errorMessage = '❌ Server error';
          errorDetails = data?.message || 'Terjadi kesalahan di server. Coba lagi nanti';
          if (data?.error) {
            errorDetails += `\n\nFile: ${data.error.file}\nLine: ${data.error.line}`;
          }
          break;
        default:
          errorMessage = `❌ Error ${status}`;
          errorDetails = data?.message || 'Terjadi kesalahan saat memuat data';
      }
    } else {
      errorMessage = '❌ Koneksi gagal';
      errorDetails = error.message || 'Periksa koneksi internet Anda';
    }

    return (
      <div className='space-y-6'>
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg'>
          <p className='font-semibold'>{errorMessage}</p>
          {errorDetails && (
            <div className='text-sm mt-2'>
              <p className='whitespace-pre-line'>{errorDetails}</p>
            </div>
          )}
          
          {/* ✅ FIX: Show error details in development mode */}
          {errorStack && process.env.NODE_ENV === 'development' && (
            <details className='mt-3 text-xs'>
              <summary className='cursor-pointer font-semibold'>🔍 Detail Error (Development Mode)</summary>
              <div className='mt-2 p-2 bg-red-100 rounded border border-red-300 overflow-auto max-h-60'>
                <p><strong>File:</strong> {errorStack.file}</p>
                <p><strong>Line:</strong> {errorStack.line}</p>
                <p><strong>Message:</strong> {errorStack.message}</p>
                {errorStack.trace && (
                  <div className='mt-2'>
                    <strong>Stack Trace:</strong>
                    <pre className='text-xs mt-1 whitespace-pre-wrap'>{errorStack.trace.join('\n')}</pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
        <div className='flex justify-end'>
          <Button
            onClick={handleRefresh}
            className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
          >
            <RefreshCw className='w-4 h-4 inline mr-2' />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Penjualan
            </CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.totalSales)}
            </div>
            <div className='flex items-center space-x-1 text-xs text-muted-foreground'>
              <TrendingUp className='h-3 w-3 text-green-500' />
              <span className='text-green-500'>+{data.growthRate}%</span>
              <span>dari periode sebelumnya</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Transaksi
            </CardTitle>
            <ShoppingCart className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatNumber(data.totalTransactions)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {data.totalTransactions > 0
                ? `${formatNumber(data.totalTransactions)} transaksi ditemukan`
                : 'Belum ada transaksi'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Penjualan Bersih
            </CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.netSales)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Subtotal produk (sebelum pajak dan diskon)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Rata-rata per Transaksi
            </CardTitle>
            <BarChart3 className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.averageTransaction)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Nilai transaksi rata-rata
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Daily Sales Chart - Larger */}
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>
              {chartType === 'daily'
                ? 'Grafik Penjualan Harian (Per Jam)'
                : chartType === 'weekly'
                ? 'Grafik Penjualan Mingguan (7 Hari)'
                : 'Grafik Penjualan Bulanan (Per Hari)'}
            </CardTitle>
            <CardDescription>
              {data.dailySales.length > 0
                ? chartType === 'daily'
                  ? `Penjualan per jam (00:00 - 23:00)`
                  : chartType === 'weekly'
                  ? `Penjualan dalam 7 hari terakhir`
                  : `Penjualan per hari dalam bulan`
                : 'Belum ada data penjualan'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='h-[500px] w-full min-w-0' style={{ minHeight: '400px' }}>
              {data.dailySales.length > 0 ? (
                <ResponsiveContainer width='100%' height='100%' minHeight={400}>
                  <AreaChart
                    data={data.dailySales.map((day, index) => {
                      const isHourly = chartType === 'daily' && /^\d{2}:\d{2}$/.test(day.date);
                      const isToday = !isHourly && 
                        new Date(day.date).toDateString() ===
                        new Date().toDateString();
                      const isCurrentHour = isHourly && 
                        day.date === `${new Date().getHours().toString().padStart(2, '0')}:00`;
                      
                      return {
                        ...day,
                        period: isHourly 
                          ? day.date 
                          : chartType === 'weekly'
                          ? new Date(day.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
                          : new Date(day.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                        fullDate: day.date,
                        isHighlight: isToday || isCurrentHour,
                      };
                    })}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id='colorSales' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='#3B82F6' stopOpacity={0.8} />
                        <stop offset='95%' stopColor='#3B82F6' stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id='colorSalesHighlight' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='#10B981' stopOpacity={0.9} />
                        <stop offset='95%' stopColor='#10B981' stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' vertical={false} />
                    <XAxis
                      dataKey='period'
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      interval={chartType === 'daily' ? 2 : chartType === 'weekly' ? 0 : 'preserveStartEnd'}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `Rp${(value / 1000000).toFixed(1)}Jt`;
                        if (value >= 1000) return `Rp${(value / 1000).toFixed(0)}Rb`;
                        return `Rp${value}`;
                      }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const isHourly = chartType === 'daily' && /^\d{2}:\d{2}$/.test(data.fullDate);
                          return (
                            <div className='bg-white p-4 border border-gray-200 rounded-lg shadow-xl'>
                              <p className='font-semibold text-gray-800 mb-2'>
                                {isHourly
                                  ? `Jam ${data.fullDate}`
                                  : new Date(data.fullDate).toLocaleDateString('id-ID', {
                                      weekday: 'long',
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                    })}
                              </p>
                              <div className='space-y-1'>
                                <div className='flex items-center justify-between gap-4'>
                                  <span className='text-sm text-gray-600'>Penjualan:</span>
                                  <span className='text-sm font-bold text-blue-600'>
                                    {formatCurrency(data.sales || 0)}
                                  </span>
                                </div>
                                <div className='flex items-center justify-between gap-4'>
                                  <span className='text-sm text-gray-600'>Transaksi:</span>
                                  <span className='text-sm font-semibold text-gray-800'>
                                    {data.transactions || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type='monotone'
                      dataKey='sales'
                      stroke='#3B82F6'
                      strokeWidth={2.5}
                      fill='url(#colorSales)'
                      dot={false}
                      activeDot={{ 
                        r: 6, 
                        fill: '#10B981',
                        stroke: '#fff',
                        strokeWidth: 2,
                      }}
                      animationDuration={800}
                      animationEasing='ease-out'
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className='flex items-center justify-center h-full text-gray-400'>
                  <div className='text-center'>
                    <BarChart3 className='w-12 h-12 mx-auto mb-2 opacity-50' />
                    <p>Belum ada data penjualan</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Chart - Smaller */}
        <Card className='lg:col-span-1'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base'>Metode Pembayaran</CardTitle>
            <CardDescription className='text-xs'>Distribusi pembayaran</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {data.paymentMethods.map((method, index) => (
                <div key={index} className='flex items-center justify-between py-1'>
                  <div className='flex items-center space-x-2'>
                    <div
                      className={`w-3 h-3 rounded-full ${method.color}`}
                    ></div>
                    <span className='text-xs font-medium'>{method.name}</span>
                  </div>
                  <div className='text-right'>
                    <div className='text-xs font-medium'>
                      {formatCurrency(method.amount)}
                    </div>
                    <div className='text-[10px] text-gray-500'>
                      {method.percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Produk Terlaris</CardTitle>
          <CardDescription>5 produk dengan penjualan tertinggi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {data.topProducts.map((product, index) => (
              <div
                key={index}
                className='flex items-center justify-between p-4 border rounded-lg'
              >
                <div className='flex items-center space-x-4'>
                  <div className='flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm'>
                    {index + 1}
                  </div>
                  <div>
                    <div className='font-medium'>{product.name}</div>
                    <div className='text-sm text-gray-500'>
                      {product.quantity} terjual
                    </div>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='font-semibold'>
                    {formatCurrency(product.sales)}
                  </div>
                  <div className='text-sm text-gray-500'>
                    Rata-rata {formatCurrency(product.sales / product.quantity)}
                    /item
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesSummaryReport;
