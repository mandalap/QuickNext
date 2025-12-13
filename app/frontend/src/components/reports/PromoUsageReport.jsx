import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Percent,
  RefreshCw,
  ShoppingCart,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { queryKeys } from '../../config/reactQuery';
import promoUsageService from '../../services/promoUsageService';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const PromoUsageReport = ({ dateRange = 'month', customDate = {}, refreshTrigger = 0 }) => {
  const { user, currentOutlet } = useAuth();
  const queryClient = useQueryClient();

  // ✅ OPTIMIZATION: Debounced date range untuk mengurangi API calls
  const debouncedDateRange = useDebounce(dateRange, 300);
  const debouncedCustomDate = useDebounce(customDate, 300);
  
  // ✅ FIX: Ensure dateRange is valid (default to 'month' if invalid)
  const validDateRange = ['today', 'yesterday', 'week', 'month', 'year'].includes(debouncedDateRange) 
    ? debouncedDateRange 
    : 'month';

  // ✅ REACT QUERY: Fetch promo usage analytics
  const {
    data: analyticsData,
    isLoading: loadingAnalytics,
    isFetching: fetchingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: queryKeys.promos.usage({
      outletId: currentOutlet?.id,
      dateRange: validDateRange,
      customStart: debouncedCustomDate.start,
      customEnd: debouncedCustomDate.end,
    }),
    queryFn: () =>
      promoUsageService.getPromoUsageAnalytics({ 
        date_range: validDateRange,
        custom_start: debouncedCustomDate.start,
        custom_end: debouncedCustomDate.end,
      }),
    enabled: !!currentOutlet?.id && !!validDateRange,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });

  // ✅ REACT QUERY: Fetch discount effectiveness
  const {
    data: effectivenessData,
    isLoading: loadingEffectiveness,
    isFetching: fetchingEffectiveness,
    error: effectivenessError,
    refetch: refetchEffectiveness,
  } = useQuery({
    queryKey: queryKeys.promos.effectiveness({
      outletId: currentOutlet?.id,
      dateRange: validDateRange,
      customStart: debouncedCustomDate.start,
      customEnd: debouncedCustomDate.end,
    }),
    queryFn: () =>
      promoUsageService.getDiscountEffectiveness({ 
        date_range: validDateRange,
        custom_start: debouncedCustomDate.start,
        custom_end: debouncedCustomDate.end,
      }),
    enabled: !!currentOutlet?.id && !!validDateRange,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });

  // ✅ REACT QUERY: Fetch discount trends
  const {
    data: trendsData,
    isLoading: loadingTrends,
    isFetching: fetchingTrends,
    error: trendsError,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: queryKeys.promos.trends({
      outletId: currentOutlet?.id,
      dateRange: validDateRange,
      customStart: debouncedCustomDate.start,
      customEnd: debouncedCustomDate.end,
    }),
    queryFn: () =>
      promoUsageService.getDiscountTrends({ 
        date_range: validDateRange,
        custom_start: debouncedCustomDate.start,
        custom_end: debouncedCustomDate.end,
      }),
    enabled: !!currentOutlet?.id && !!validDateRange,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });

  // ✅ Handle refresh dengan manual refetch
  const handleRefresh = useCallback(async () => {
    if (loadingAnalytics || loadingEffectiveness || loadingTrends) return;

    try {
      await Promise.all([
        refetchAnalytics(),
        refetchEffectiveness(),
        refetchTrends(),
      ]);
      toast.success('✅ Data laporan berhasil dimuat ulang', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to refresh:', error);
      toast.error('❌ Gagal memuat ulang data laporan', { duration: 6000 });
    }
  }, [loadingAnalytics, loadingEffectiveness, loadingTrends, refetchAnalytics, refetchEffectiveness, refetchTrends]);

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

  const formatPercentage = value => {
    return `${value.toFixed(2)}%`;
  };

  const getTrendIcon = value => {
    if (value > 0) return <TrendingUp className='h-4 w-4 text-green-500' />;
    if (value < 0) return <TrendingDown className='h-4 w-4 text-red-500' />;
    return <BarChart3 className='h-4 w-4 text-gray-500' />;
  };

  const getTrendColor = value => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // ✅ Error handling
  const hasError = analyticsError || effectivenessError || trendsError;
  const isLoading = loadingAnalytics || loadingEffectiveness || loadingTrends;
  const isFetching = fetchingAnalytics || fetchingEffectiveness || fetchingTrends;

  if (hasError && !analyticsData && !effectivenessData && !trendsData) {
    const error = analyticsError || effectivenessError || trendsError;
    let errorMessage = '❌ Gagal memuat data laporan';
    let errorDetails = '';

    if (error?.response) {
      const status = error.response.status;
      const data = error.response.data;

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
          break;
        default:
          errorMessage = `❌ Error ${status}`;
          errorDetails = data?.message || 'Terjadi kesalahan saat memuat data';
      }
    } else {
      errorMessage = '❌ Koneksi gagal';
      errorDetails = error?.message || 'Periksa koneksi internet Anda';
    }

    return (
      <div className='space-y-6'>
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg'>
          <p className='font-semibold'>{errorMessage}</p>
          {errorDetails && (
            <div className='text-sm mt-2'>
              <p>{errorDetails}</p>
            </div>
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
      {analyticsData?.data?.summary && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Total Order</CardTitle>
              <ShoppingCart className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {analyticsData.data.summary.total_orders}
              </div>
              <p className='text-xs text-muted-foreground'>
                Semua order dalam periode
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Order dengan Diskon
              </CardTitle>
              <Percent className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {analyticsData.data.summary.total_orders_with_discounts}
              </div>
              <p className='text-xs text-muted-foreground'>
                {formatPercentage(
                  analyticsData.data.summary.discount_usage_rate
                )}{' '}
                dari total order
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Diskon
              </CardTitle>
              <DollarSign className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {formatCurrency(
                  analyticsData.data.summary.total_discount_amount
                )}
              </div>
              <p className='text-xs text-muted-foreground'>
                Rata-rata:{' '}
                {formatCurrency(
                  analyticsData.data.summary.average_discount_amount
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Dampak pada Revenue
              </CardTitle>
              <Target className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${getTrendColor(
                  analyticsData.data.summary.discount_impact_on_revenue
                )}`}
              >
                {formatPercentage(
                  analyticsData.data.summary.discount_impact_on_revenue
                )}
              </div>
              <p className='text-xs text-muted-foreground'>
                Persentase dari total revenue
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue='analytics' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='analytics'>Analisis Penggunaan</TabsTrigger>
          <TabsTrigger value='effectiveness'>Efektivitas Diskon</TabsTrigger>
          <TabsTrigger value='trends'>Trend Penggunaan</TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value='analytics' className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            {/* Discount Types */}
            <Card>
              <CardHeader>
                <CardTitle>Jenis Diskon</CardTitle>
                <CardDescription>
                  Breakdown penggunaan berdasarkan jenis diskon
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAnalytics ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                  </div>
                ) : analyticsData?.data?.discount_types?.length > 0 ? (
                  <div className='space-y-3'>
                    {analyticsData.data.discount_types.map(type => (
                      <div
                        key={type.discount_type}
                        className='flex items-center justify-between p-3 border rounded-lg'
                      >
                        <div>
                          <p className='font-medium'>
                            {type.discount_type_name}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            {type.usage_count} penggunaan
                          </p>
                        </div>
                        <div className='text-right'>
                          <p className='font-semibold'>
                            {formatCurrency(type.total_discount_amount)}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            Rata-rata:{' '}
                            {formatCurrency(type.avg_discount_amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-muted-foreground'>
                    Tidak ada data jenis diskon
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Discount Amounts */}
            <Card>
              <CardHeader>
                <CardTitle>Top Diskon</CardTitle>
                <CardDescription>
                  Diskon dengan penggunaan terbanyak
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAnalytics ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                  </div>
                ) : analyticsData?.data?.top_discounts?.length > 0 ? (
                  <div className='space-y-3'>
                    {analyticsData.data.top_discounts.map((discount, index) => (
                      <div
                        key={index}
                        className='flex items-center justify-between p-3 border rounded-lg'
                      >
                        <div className='flex items-center gap-3'>
                          <div className='flex items-center justify-center w-8 h-8 bg-primary/10 text-primary font-semibold rounded-full'>
                            {index + 1}
                          </div>
                          <div>
                            <p className='font-medium'>
                              {formatCurrency(discount.discount_amount)}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                              {discount.usage_count} kali digunakan
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className='font-semibold'>
                            {formatCurrency(discount.total_revenue)}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            Total revenue
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-muted-foreground'>
                    Tidak ada data top diskon
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Penggunaan Harian</CardTitle>
              <CardDescription>
                Trend penggunaan diskon per hari
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAnalytics ? (
                <div className='flex items-center justify-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                </div>
              ) : analyticsData?.data?.daily_usage?.length > 0 ? (
                <div className='space-y-3'>
                  {analyticsData.data.daily_usage.map(day => (
                    <div
                      key={day.date}
                      className='flex items-center justify-between p-4 border rounded-lg'
                    >
                      <div>
                        <p className='font-medium'>
                          {new Date(day.date).toLocaleDateString('id-ID')}
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          {day.orders_count} order dengan diskon
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='font-semibold'>
                          {formatCurrency(day.total_discount)}
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          Revenue: {formatCurrency(day.total_revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  Tidak ada data penggunaan harian
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Effectiveness Tab */}
        <TabsContent value='effectiveness' className='space-y-4'>
          {loadingEffectiveness ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </div>
          ) : effectivenessData?.data?.effectiveness ? (
            <div className='space-y-6'>
              {/* Comparison Cards */}
              <div className='grid gap-4 md:grid-cols-2'>
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <Award className='h-5 w-5 text-green-500' />
                      Order dengan Diskon
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2'>
                      <div className='flex justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          Jumlah Order:
                        </span>
                        <span className='font-semibold'>
                          {
                            effectivenessData.data.effectiveness.with_discounts
                              .order_count
                          }
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          Rata-rata Order:
                        </span>
                        <span className='font-semibold'>
                          {formatCurrency(
                            effectivenessData.data.effectiveness.with_discounts
                              .avg_order_value
                          )}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          Total Revenue:
                        </span>
                        <span className='font-semibold'>
                          {formatCurrency(
                            effectivenessData.data.effectiveness.with_discounts
                              .total_revenue
                          )}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          Rata-rata Diskon:
                        </span>
                        <span className='font-semibold'>
                          {formatCurrency(
                            effectivenessData.data.effectiveness.with_discounts
                              .avg_discount
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <ShoppingCart className='h-5 w-5 text-blue-500' />
                      Order tanpa Diskon
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2'>
                      <div className='flex justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          Jumlah Order:
                        </span>
                        <span className='font-semibold'>
                          {
                            effectivenessData.data.effectiveness
                              .without_discounts.order_count
                          }
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          Rata-rata Order:
                        </span>
                        <span className='font-semibold'>
                          {formatCurrency(
                            effectivenessData.data.effectiveness
                              .without_discounts.avg_order_value
                          )}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          Total Revenue:
                        </span>
                        <span className='font-semibold'>
                          {formatCurrency(
                            effectivenessData.data.effectiveness
                              .without_discounts.total_revenue
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Impact Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <BarChart3 className='h-5 w-5 text-purple-500' />
                    Analisis Dampak
                  </CardTitle>
                  <CardDescription>
                    Perbandingan efektivitas diskon terhadap revenue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <div className='flex items-center justify-between p-4 border rounded-lg'>
                      <div>
                        <p className='text-sm text-muted-foreground'>
                          Selisih Rata-rata Order
                        </p>
                        <p className='text-lg font-semibold'>
                          {formatCurrency(
                            effectivenessData.data.effectiveness.comparison
                              .order_value_difference
                          )}
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        {getTrendIcon(
                          effectivenessData.data.effectiveness.comparison
                            .order_value_difference
                        )}
                        <Badge
                          variant={
                            effectivenessData.data.effectiveness.comparison
                              .order_value_difference > 0
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {effectivenessData.data.effectiveness.comparison
                            .order_value_difference > 0
                            ? 'Positif'
                            : 'Negatif'}
                        </Badge>
                      </div>
                    </div>

                    <div className='flex items-center justify-between p-4 border rounded-lg'>
                      <div>
                        <p className='text-sm text-muted-foreground'>
                          Dampak pada Revenue
                        </p>
                        <p
                          className={`text-lg font-semibold ${getTrendColor(
                            effectivenessData.data.effectiveness.comparison
                              .revenue_impact
                          )}`}
                        >
                          {formatPercentage(
                            effectivenessData.data.effectiveness.comparison
                              .revenue_impact
                          )}
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        {getTrendIcon(
                          effectivenessData.data.effectiveness.comparison
                            .revenue_impact
                        )}
                        <Badge
                          variant={
                            effectivenessData.data.effectiveness.comparison
                              .revenue_impact > 0
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {effectivenessData.data.effectiveness.comparison
                            .revenue_impact > 0
                            ? 'Meningkat'
                            : 'Menurun'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className='text-center py-8 text-muted-foreground'>
              Tidak ada data efektivitas diskon
            </div>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value='trends' className='space-y-4'>
          {loadingTrends ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </div>
          ) : trendsData?.data ? (
            <div className='space-y-6'>
              {/* Daily Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Calendar className='h-5 w-5 text-blue-500' />
                    Trend Harian
                  </CardTitle>
                  <CardDescription>
                    Perkembangan penggunaan diskon per hari
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trendsData.data.daily_trends?.length > 0 ? (
                    <div className='space-y-3'>
                      {trendsData.data.daily_trends.map(trend => (
                        <div
                          key={trend.date}
                          className='flex items-center justify-between p-4 border rounded-lg'
                        >
                          <div>
                            <p className='font-medium'>
                              {new Date(trend.date).toLocaleDateString('id-ID')}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                              {trend.orders_with_discounts} dari{' '}
                              {trend.total_orders} order menggunakan diskon
                            </p>
                          </div>
                          <div className='text-right'>
                            <p className='font-semibold'>
                              {formatCurrency(trend.total_discount_amount)}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                              {trend.avg_discount_amount
                                ? `Rata-rata: ${formatCurrency(
                                    trend.avg_discount_amount
                                  )}`
                                : 'Tidak ada diskon'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      Tidak ada data trend harian
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hourly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Clock className='h-5 w-5 text-green-500' />
                    Trend Per Jam (Hari Ini)
                  </CardTitle>
                  <CardDescription>
                    Penggunaan diskon per jam pada hari ini
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trendsData.data.hourly_trends?.length > 0 ? (
                    <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
                      {trendsData.data.hourly_trends.map(trend => (
                        <div
                          key={trend.hour}
                          className='flex items-center justify-between p-3 border rounded-lg'
                        >
                          <div>
                            <p className='font-medium'>{trend.hour}:00</p>
                            <p className='text-sm text-muted-foreground'>
                              {trend.orders_with_discounts} dari{' '}
                              {trend.total_orders} order
                            </p>
                          </div>
                          <div className='text-right'>
                            <p className='font-semibold'>
                              {formatCurrency(trend.total_discount_amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      Tidak ada data trend per jam
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className='text-center py-8 text-muted-foreground'>
              Tidak ada data trend
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PromoUsageReport;
