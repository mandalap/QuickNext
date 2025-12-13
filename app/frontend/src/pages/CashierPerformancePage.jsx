import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Award,
  DollarSign,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import cashierPerformanceService from '../services/cashierPerformanceService';
import { queryKeys } from '../config/reactQuery';
import { useDebounce } from '../hooks/useDebounce';
import toast from 'react-hot-toast';

// Helper function to get error message
const getErrorMessage = (error) => {
  if (!error) return 'Terjadi kesalahan';
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return 'Gagal memuat data. Silakan coba lagi.';
};

const CashierPerformancePage = ({
  dateRange = 'today',
  customDate = {},
  refreshTrigger = 0,
}) => {
  const { user, currentOutlet } = useAuth();
  const queryClient = useQueryClient();

  const [sessionDateRange, setSessionDateRange] = useState('week');
  const [selectedCashierId, setSelectedCashierId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('performance');

  // Debounce date range and custom date to prevent too many API calls
  const debouncedDateRange = useDebounce(dateRange, 300);
  const debouncedCustomDate = useDebounce(customDate, 300);
  const debouncedSessionDateRange = useDebounce(sessionDateRange, 300);

  // Build query params
  const performanceParams = {
    outletId: currentOutlet?.id,
    dateRange: debouncedDateRange,
    customStart: debouncedCustomDate.start,
    customEnd: debouncedCustomDate.end,
  };

  const sessionParams = {
    outletId: currentOutlet?.id,
    dateRange: debouncedSessionDateRange,
    customStart: debouncedCustomDate.start,
    customEnd: debouncedCustomDate.end,
  };

  const detailParams = {
    dateRange: debouncedDateRange,
    customStart: debouncedCustomDate.start,
    customEnd: debouncedCustomDate.end,
  };

  // Fetch performance analytics
  const {
    data: performanceData,
    isLoading: loadingPerformance,
    isFetching: fetchingPerformance,
    error: performanceError,
    refetch: refetchPerformance,
  } = useQuery({
    queryKey: queryKeys.cashierPerformance.analytics(performanceParams),
    queryFn: async () => {
      const result = await cashierPerformanceService.getPerformanceAnalytics({
        dateRange: debouncedDateRange,
        date_range: debouncedDateRange,
        customStart: debouncedCustomDate.start,
        customEnd: debouncedCustomDate.end,
      });
      if (!result || !result.success) {
        throw new Error(result?.message || 'Failed to fetch cashier performance analytics');
      }
      return result;
    },
    enabled: !!currentOutlet?.id && (debouncedDateRange !== 'custom' || (debouncedCustomDate.start && debouncedCustomDate.end)),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });

  // Fetch session history
  const {
    data: sessionData,
    isLoading: loadingSessions,
    isFetching: fetchingSessions,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: queryKeys.cashierPerformance.sessions(sessionParams),
    queryFn: async () => {
      const result = await cashierPerformanceService.getSessionHistory({
        dateRange: debouncedSessionDateRange,
        date_range: debouncedSessionDateRange,
        customStart: debouncedCustomDate.start,
        customEnd: debouncedCustomDate.end,
      });
      if (!result || !result.success) {
        throw new Error(result?.message || 'Failed to fetch session history');
      }
      return result;
    },
    enabled: !!currentOutlet?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });

  // Fetch cashier detail
  const {
    data: cashierDetailData,
    isLoading: loadingCashierDetail,
    isFetching: fetchingCashierDetail,
    error: cashierDetailError,
    refetch: refetchCashierDetail,
  } = useQuery({
    queryKey: queryKeys.cashierPerformance.detail(selectedCashierId, detailParams),
    queryFn: async () => {
      const result = await cashierPerformanceService.getCashierDetail(selectedCashierId, {
        dateRange: debouncedDateRange,
        date_range: debouncedDateRange,
        customStart: debouncedCustomDate.start,
        customEnd: debouncedCustomDate.end,
      });
      if (!result || !result.success) {
        throw new Error(result?.message || 'Failed to fetch cashier detail');
      }
      return result;
    },
    enabled: !!selectedCashierId && !!currentOutlet?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });

  // Handle manual refresh (F5)
  const handleRefresh = useCallback(async () => {
    const fetching = fetchingPerformance || fetchingSessions || fetchingCashierDetail;
    if (fetching) return;

    try {
      const promises = [refetchPerformance()];
      if (activeTab === 'sessions') {
        promises.push(refetchSessions());
      }
      if (activeTab === 'detail' && selectedCashierId) {
        promises.push(refetchCashierDetail());
      }
      await Promise.all(promises);
      toast.success('✅ Data performa kasir berhasil dimuat ulang', { duration: 3000 });
    } catch (err) {
      console.error('Failed to refresh cashier performance:', err);
      toast.error('❌ Gagal memuat ulang data performa kasir', { duration: 6000 });
    }
  }, [fetchingPerformance, fetchingSessions, fetchingCashierDetail, refetchPerformance, refetchSessions, refetchCashierDetail, activeTab, selectedCashierId]);

  // F5 handler for manual refetch
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
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

  const formatDate = date => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPerformanceColor = score => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = score => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Filter cashiers based on search term
  const filteredCashiers =
    performanceData?.data?.performance_data?.filter(cashier =>
      cashier.cashier_name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <div className='space-y-6'>

      {/* Error Messages */}
      {performanceError && (
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between'>
          <div>
            <p className='font-semibold'>❌ Gagal memuat data performa kasir</p>
            <p className='text-sm mt-1'>
              {getErrorMessage(performanceError)}
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetchPerformance()}
            className='ml-4'
          >
            <RefreshCw className='w-4 h-4 mr-2' /> Coba Lagi
          </Button>
        </div>
      )}
      {sessionsError && activeTab === 'sessions' && (
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between'>
          <div>
            <p className='font-semibold'>❌ Gagal memuat riwayat sesi</p>
            <p className='text-sm mt-1'>
              {getErrorMessage(sessionsError)}
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetchSessions()}
            className='ml-4'
          >
            <RefreshCw className='w-4 h-4 mr-2' /> Coba Lagi
          </Button>
        </div>
      )}
      {cashierDetailError && activeTab === 'detail' && (
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between'>
          <div>
            <p className='font-semibold'>❌ Gagal memuat detail kasir</p>
            <p className='text-sm mt-1'>
              {getErrorMessage(cashierDetailError)}
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetchCashierDetail()}
            className='ml-4'
          >
            <RefreshCw className='w-4 h-4 mr-2' /> Coba Lagi
          </Button>
        </div>
      )}

      {/* Loading State */}
      {(loadingPerformance || fetchingPerformance) && (
        <div className='flex items-center justify-center py-8'>
          <Loader2 className='w-6 h-6 animate-spin text-primary mr-2' />
          <span className='text-muted-foreground'>
            {fetchingPerformance ? 'Memuat ulang data...' : 'Memuat data...'}
          </span>
        </div>
      )}

      {/* Empty State */}
      {!loadingPerformance && !performanceError && (!performanceData?.data?.summary || !performanceData?.data?.performance_data?.length) && (
        <div className='bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded'>
          <p className='font-semibold'>Tidak ada data</p>
          <p className='text-sm'>
            Tidak ada data performa kasir untuk periode yang dipilih. Coba pilih periode lain atau gunakan custom range.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      {loadingPerformance ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card className='bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <div className='h-4 w-24 bg-blue-200 rounded animate-pulse'></div>
              <div className='h-5 w-5 bg-blue-200 rounded animate-pulse'></div>
            </CardHeader>
            <CardContent>
              <div className='h-8 w-32 bg-blue-200 rounded animate-pulse mb-2'></div>
              <div className='h-3 w-20 bg-blue-200 rounded animate-pulse'></div>
            </CardContent>
          </Card>
          <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <div className='h-4 w-24 bg-green-200 rounded animate-pulse'></div>
              <div className='h-5 w-5 bg-green-200 rounded animate-pulse'></div>
            </CardHeader>
            <CardContent>
              <div className='h-8 w-32 bg-green-200 rounded animate-pulse mb-2'></div>
              <div className='h-3 w-20 bg-green-200 rounded animate-pulse'></div>
            </CardContent>
          </Card>
          <Card className='bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <div className='h-4 w-24 bg-purple-200 rounded animate-pulse'></div>
              <div className='h-5 w-5 bg-purple-200 rounded animate-pulse'></div>
            </CardHeader>
            <CardContent>
              <div className='h-8 w-32 bg-purple-200 rounded animate-pulse mb-2'></div>
              <div className='h-3 w-20 bg-purple-200 rounded animate-pulse'></div>
            </CardContent>
          </Card>
          <Card className='bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <div className='h-4 w-24 bg-orange-200 rounded animate-pulse'></div>
              <div className='h-5 w-5 bg-orange-200 rounded animate-pulse'></div>
            </CardHeader>
            <CardContent>
              <div className='h-8 w-32 bg-orange-200 rounded animate-pulse mb-2'></div>
              <div className='h-3 w-20 bg-orange-200 rounded animate-pulse'></div>
            </CardContent>
          </Card>
        </div>
      ) : performanceData?.data?.summary ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card className='bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-blue-700'>Total Kasir</CardTitle>
              <Users className='h-5 w-5 text-blue-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-blue-800'>
                {performanceData.data.summary.total_cashiers}
              </div>
              <p className='text-xs text-blue-600 mt-1'>Kasir aktif</p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-green-700'>Total Order</CardTitle>
              <Target className='h-5 w-5 text-green-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-green-800'>
                {performanceData.data.summary.total_orders}
              </div>
              <p className='text-xs text-green-600 mt-1'>
                Order dalam periode
              </p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-purple-700'>
                Total Revenue
              </CardTitle>
              <DollarSign className='h-5 w-5 text-purple-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-purple-800'>
                {formatCurrency(performanceData.data.summary.total_revenue)}
              </div>
              <p className='text-xs text-purple-600 mt-1'>Pendapatan total</p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-orange-700'>
                Rata-rata Skor
              </CardTitle>
              <TrendingUp className='h-5 w-5 text-orange-600' />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold text-orange-800 ${getPerformanceColor(
                  performanceData.data.summary.avg_performance_score
                )}`}
              >
                {performanceData.data.summary.avg_performance_score}
              </div>
              <p className='text-xs text-orange-600 mt-1'>
                Skor performa rata-rata
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Top Performer */}
      {loadingPerformance ? (
        <Card>
          <CardHeader>
            <div className='h-5 w-32 bg-gray-200 rounded animate-pulse'></div>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div className='space-y-2'>
                <div className='h-6 w-48 bg-gray-200 rounded animate-pulse'></div>
                <div className='h-4 w-40 bg-gray-200 rounded animate-pulse'></div>
              </div>
              <div className='h-6 w-24 bg-gray-200 rounded-full animate-pulse'></div>
            </div>
          </CardContent>
        </Card>
      ) : performanceData?.data?.summary?.top_performer ? (
        <Card className='bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Award className='h-5 w-5 text-yellow-500' />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-lg font-semibold text-gray-900'>
                  {performanceData.data.summary.top_performer}
                </p>
                <p className='text-sm text-gray-600'>
                  Kasir dengan performa terbaik
                </p>
              </div>
              <Badge
                className={getPerformanceBadge(
                  performanceData.data.summary.avg_performance_score
                )}
              >
                Skor: {performanceData.data.summary.avg_performance_score}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='space-y-4'
      >
        <TabsList>
          <TabsTrigger value='performance'>Performa Kasir</TabsTrigger>
          <TabsTrigger value='sessions'>Riwayat Sesi</TabsTrigger>
          <TabsTrigger value='detail'>Detail Kasir</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value='performance' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Daftar Performa Kasir</CardTitle>
              <CardDescription>
                Ranking performa kasir berdasarkan skor dan metrik lainnya
              </CardDescription>
              <div className='flex items-center gap-2 mt-4'>
                <div className='relative'>
                  <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                  <Input
                    placeholder='Cari kasir...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='pl-8 w-[300px]'
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPerformance ? (
                <div className='space-y-4'>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className='flex items-center justify-between p-4 border rounded-lg'>
                      <div className='flex items-center gap-4'>
                        <div className='h-8 w-8 bg-gray-200 rounded-full animate-pulse'></div>
                        <div className='space-y-2'>
                          <div className='h-4 w-32 bg-gray-200 rounded animate-pulse'></div>
                          <div className='h-3 w-48 bg-gray-200 rounded animate-pulse'></div>
                        </div>
                      </div>
                      <div className='flex items-center gap-6'>
                        {[1, 2, 3, 4].map(j => (
                          <div key={j} className='text-center space-y-1'>
                            <div className='h-3 w-16 bg-gray-200 rounded animate-pulse'></div>
                            <div className='h-4 w-12 bg-gray-200 rounded animate-pulse'></div>
                          </div>
                        ))}
                        <div className='h-8 w-8 bg-gray-200 rounded animate-pulse'></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCashiers.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  {searchTerm ? (
                    <p>
                      Tidak ada kasir yang sesuai dengan pencarian &quot;{searchTerm}&quot;
                    </p>
                  ) : (
                    <p>Tidak ada data performa kasir untuk periode ini</p>
                  )}
                </div>
              ) : (
                <div className='space-y-3'>
                  {filteredCashiers.map((cashier, index) => (
                    <div
                      key={cashier.cashier_id}
                      className='flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors'
                    >
                      <div className='flex items-center gap-4'>
                        <Badge 
                          variant={index < 3 ? 'default' : 'secondary'}
                          className={index === 0 ? 'bg-yellow-500 hover:bg-yellow-600' : index === 1 ? 'bg-gray-400 hover:bg-gray-500' : index === 2 ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        >
                          #{index + 1}
                        </Badge>
                        <div>
                          <h4 className='font-medium text-gray-900'>
                            {cashier.cashier_name}
                          </h4>
                          <p className='text-sm text-gray-500'>
                            {cashier.cashier_email}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center gap-6'>
                        <div className='text-center'>
                          <p className='text-xs text-gray-500 mb-1'>Order</p>
                          <p className='font-semibold text-gray-900'>
                            {cashier.total_orders}
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className='text-xs text-gray-500 mb-1'>
                            Revenue
                          </p>
                          <p className='font-semibold text-green-600'>
                            {formatCurrency(cashier.total_revenue)}
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className='text-xs text-gray-500 mb-1'>
                            Order/Jam
                          </p>
                          <p className='font-semibold text-gray-900'>
                            {cashier.orders_per_hour}
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className='text-xs text-gray-500 mb-1'>Skor</p>
                          <Badge
                            className={getPerformanceBadge(
                              cashier.performance_score
                            )}
                          >
                            {cashier.performance_score}
                          </Badge>
                        </div>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setSelectedCashierId(cashier.cashier_id);
                            setActiveTab('detail');
                          }}
                          className='hover:bg-primary hover:text-primary-foreground'
                        >
                          <Eye className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value='sessions' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Sesi Kasir</CardTitle>
              <CardDescription>
                Daftar sesi kerja kasir dan performa mereka
              </CardDescription>
              <div className='flex items-center gap-2 mt-4'>
                <Select
                  value={sessionDateRange}
                  onValueChange={setSessionDateRange}
                >
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue placeholder='Pilih periode' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='today'>Hari Ini</SelectItem>
                    <SelectItem value='week'>Minggu Ini</SelectItem>
                    <SelectItem value='month'>Bulan Ini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {(loadingSessions || fetchingSessions) ? (
                <div className='rounded-md border overflow-hidden'>
                  <div className='bg-gray-50 border-b'>
                    <div className='grid grid-cols-8 gap-4 p-4'>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className='h-4 bg-gray-200 rounded animate-pulse'></div>
                      ))}
                    </div>
                  </div>
                  <div className='divide-y'>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className='grid grid-cols-8 gap-4 p-4'>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                          <div key={j} className='h-4 bg-gray-200 rounded animate-pulse'></div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : sessionData?.data?.data ? (
                <div className='rounded-md border overflow-hidden'>
                  <Table>
                    <TableHeader>
                      <TableRow className='bg-gray-50'>
                        <TableHead>Kasir</TableHead>
                        <TableHead>Outlet</TableHead>
                        <TableHead>Mulai</TableHead>
                        <TableHead>Selesai</TableHead>
                        <TableHead>Durasi</TableHead>
                        <TableHead className='text-right'>Order</TableHead>
                        <TableHead className='text-right'>Revenue</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionData.data.data.map(session => (
                        <TableRow key={session.id} className='hover:bg-gray-50 transition-colors'>
                        <TableCell className='font-medium'>
                          {session.user?.name}
                        </TableCell>
                        <TableCell>{session.outlet?.name}</TableCell>
                        <TableCell>{formatDate(session.opened_at)}</TableCell>
                        <TableCell>
                          {session.closed_at
                            ? formatDate(session.closed_at)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {session.closed_at
                            ? `${
                                session.opened_at
                                  ? Math.round(
                                      (new Date(session.closed_at) -
                                        new Date(session.opened_at)) /
                                        (1000 * 60 * 60)
                                    )
                                  : 0
                              }h`
                            : '-'}
                        </TableCell>
                        <TableCell className='text-right font-medium'>
                          {session.total_transactions || 0}
                        </TableCell>
                        <TableCell className='text-right font-semibold text-green-600'>
                          {formatCurrency(session.expected_total || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              session.status === 'closed'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {session.status === 'closed' ? 'Selesai' : 'Aktif'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  Tidak ada data sesi kasir
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detail Tab */}
        <TabsContent value='detail' className='space-y-4'>
          {selectedCashierId ? (
            <div className='space-y-4'>
              {(loadingCashierDetail || fetchingCashierDetail) ? (
                <div className='space-y-4'>
                  <Card>
                    <CardHeader>
                      <div className='h-5 w-32 bg-gray-200 rounded animate-pulse'></div>
                    </CardHeader>
                    <CardContent>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                          <div className='h-3 w-16 bg-gray-200 rounded animate-pulse'></div>
                          <div className='h-5 w-40 bg-gray-200 rounded animate-pulse'></div>
                        </div>
                        <div className='space-y-2'>
                          <div className='h-3 w-16 bg-gray-200 rounded animate-pulse'></div>
                          <div className='h-5 w-48 bg-gray-200 rounded animate-pulse'></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className='grid gap-4 md:grid-cols-3'>
                    {[1, 2, 3].map(i => (
                      <Card key={i}>
                        <CardHeader className='pb-2'>
                          <div className='h-4 w-24 bg-gray-200 rounded animate-pulse'></div>
                        </CardHeader>
                        <CardContent>
                          <div className='h-8 w-32 bg-gray-200 rounded animate-pulse'></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : cashierDetailData?.data ? (
                <>
                  {/* Cashier Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Informasi Kasir</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <p className='text-sm text-muted-foreground'>Nama</p>
                          <p className='font-semibold'>
                            {cashierDetailData.data.cashier.name}
                          </p>
                        </div>
                        <div>
                          <p className='text-sm text-muted-foreground'>Email</p>
                          <p className='font-semibold'>
                            {cashierDetailData.data.cashier.email}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary */}
                  <div className='grid gap-4 md:grid-cols-3'>
                    <Card>
                      <CardHeader className='pb-2'>
                        <CardTitle className='text-sm font-medium'>
                          Total Order
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='text-2xl font-bold'>
                          {cashierDetailData.data.summary.total_orders}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className='pb-2'>
                        <CardTitle className='text-sm font-medium'>
                          Total Revenue
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='text-2xl font-bold'>
                          {formatCurrency(
                            cashierDetailData.data.summary.total_revenue
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className='pb-2'>
                        <CardTitle className='text-sm font-medium'>
                          Rata-rata Order
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='text-2xl font-bold'>
                          {formatCurrency(
                            cashierDetailData.data.summary.avg_order_value
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Payment Methods */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Metode Pembayaran</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-2'>
                        {cashierDetailData.data.payment_methods.map(method => (
                          <div
                            key={method.payment_method}
                            className='flex items-center justify-between'
                          >
                            <span className='capitalize'>
                              {method.payment_method}
                            </span>
                            <div className='text-right'>
                              <p className='font-semibold'>
                                {method.order_count} orders
                              </p>
                              <p className='text-sm text-muted-foreground'>
                                {formatCurrency(method.revenue)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  Tidak ada data detail kasir
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className='text-center py-8'>
                <Activity className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                <p className='text-muted-foreground'>
                  Pilih kasir untuk melihat detail performa
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CashierPerformancePage;
