import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { queryKeys } from '../config/reactQuery';
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
import { Label } from '../components/ui/label';
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
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import cashierClosingService from '../services/cashierClosingService';

const CashierClosingPage = ({
  dateRange = 'today',
  customDate = {},
  refreshTrigger = 0,
}) => {
  const { user, currentOutlet } = useAuth();
  const queryClient = useQueryClient();
  
  // Calculate selectedDate based on dateRange
  const getSelectedDate = () => {
    if (dateRange === 'custom' && customDate.start) {
      return customDate.start;
    }
    return new Date().toISOString().split('T')[0];
  };
  
  const selectedDate = getSelectedDate();
  const [selectedSession, setSelectedSession] = useState(null);
  const [closingData, setClosingData] = useState({
    actual_cash_amount: '',
    closing_notes: '',
  });

  // Build query params for history and report
  const historyParams = {
    date_range: dateRange,
    custom_start: customDate.start,
    custom_end: customDate.end,
  };

  // Fetch closing summary using React Query
  const {
    data: summaryData,
    isLoading: loadingSummary,
    isFetching: isFetchingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: queryKeys.reports.cashierClosing.summary(currentOutlet?.id, selectedDate),
    queryFn: async () => {
      try {
        const result = await cashierClosingService.getClosingSummary({ date: selectedDate });
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Cashier Closing Summary Data:', result);
        }
        return result;
      } catch (error) {
        // Only log full error details in development
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Error fetching closing summary:', error);
        } else {
          console.error('❌ Error fetching closing summary');
        }
        throw error;
      }
    },
    enabled: !!currentOutlet,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  // Fetch closing history using React Query
  const {
    data: historyData,
    isLoading: loadingHistory,
    isFetching: isFetchingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: queryKeys.reports.cashierClosing.history(currentOutlet?.id, historyParams),
    queryFn: () =>
      cashierClosingService.getClosingHistory(historyParams),
    enabled: !!currentOutlet,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  // Fetch closing report using React Query
  const {
    data: reportData,
    isLoading: loadingReport,
    isFetching: isFetchingReport,
    error: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: queryKeys.reports.cashierClosing.report(currentOutlet?.id, historyParams),
    queryFn: () =>
      cashierClosingService.getClosingReport(historyParams),
    enabled: !!currentOutlet,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  // Handle refresh without full page reload
  const handleRefresh = useCallback(() => {
    refetchSummary();
    refetchHistory();
    refetchReport();
    toast.success('Data sedang dimuat ulang...', { duration: 2000 });
  }, [refetchSummary, refetchHistory, refetchReport]);

  // Keyboard shortcut F5 untuk refresh
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Skip jika sedang di input/textarea
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      // F5 untuk refresh
      if (event.key === 'F5') {
        event.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  // Show error toast if queries fail
  useEffect(() => {
    if (summaryError) {
      console.error('Error fetching closing summary:', summaryError);
      toast.error(summaryError.message || 'Terjadi kesalahan saat mengambil data ringkasan');
    }
  }, [summaryError]);

  useEffect(() => {
    if (historyError) {
      console.error('Error fetching closing history:', historyError);
      toast.error(historyError.message || 'Terjadi kesalahan saat mengambil riwayat penutupan');
    }
  }, [historyError]);

  useEffect(() => {
    if (reportError) {
      console.error('Error fetching closing report:', reportError);
      toast.error(reportError.message || 'Terjadi kesalahan saat mengambil laporan penutupan');
    }
  }, [reportError]);

  // Check if any query is fetching
  const isFetching = isFetchingSummary || isFetchingHistory || isFetchingReport;

  // Close session mutation
  const closeSessionMutation = useMutation({
    mutationFn: data => cashierClosingService.closeSession(data),
    onSuccess: () => {
      // Invalidate all cashier closing queries
      queryClient.invalidateQueries({ 
        queryKey: ['reports', 'cashier-closing'] 
      });
      setSelectedSession(null);
      setClosingData({ actual_cash_amount: '', closing_notes: '' });
      toast.success('Sesi berhasil ditutup');
    },
    onError: (error) => {
      console.error('Error closing session:', error);
      toast.error(error.message || 'Gagal menutup sesi');
    },
  });

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

  const handleCloseSession = () => {
    if (!selectedSession) return;

    closeSessionMutation.mutate({
      session_id: selectedSession.id,
      actual_cash_amount: parseFloat(closingData.actual_cash_amount) || 0,
      closing_notes: closingData.closing_notes,
    });
  };

  const getCashDifferenceColor = difference => {
    if (difference > 0) return 'text-green-600';
    if (difference < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getCashDifferenceIcon = difference => {
    if (difference > 0) return <TrendingUp className='h-4 w-4' />;
    if (difference < 0) return <TrendingDown className='h-4 w-4' />;
    return null;
  };

  return (
    <div className='space-y-6'>
      {/* Summary Cards */}
      {loadingSummary && !summaryData ? (
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
      ) : summaryData?.data?.summary ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card className='bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-blue-700'>Sesi Aktif</CardTitle>
              <Clock className='h-5 w-5 text-blue-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-blue-800'>
                {summaryData.data.summary.active_sessions ?? 0}
              </div>
              <p className='text-xs text-blue-600 mt-1'>
                Sesi yang belum ditutup
              </p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-green-700'>
                Sesi Selesai
              </CardTitle>
              <CheckCircle className='h-5 w-5 text-green-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-green-800'>
                {summaryData.data.summary.closed_sessions ?? 0}
              </div>
              <p className='text-xs text-green-600 mt-1'>
                Sesi yang sudah ditutup
              </p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-purple-700'>Total Order</CardTitle>
              <Receipt className='h-5 w-5 text-purple-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-purple-800'>
                {summaryData.data.summary.total_orders ?? 0}
              </div>
              <p className='text-xs text-purple-600 mt-1'>Order hari ini</p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-orange-700'>
                Total Revenue
              </CardTitle>
              <DollarSign className='h-5 w-5 text-orange-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-orange-800'>
                {formatCurrency(summaryData.data.summary.total_revenue ?? 0)}
              </div>
              <p className='text-xs text-orange-600 mt-1'>
                Pendapatan hari ini
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {summaryError && !summaryData && (
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg'>
          <p className='font-semibold'>❌ Gagal memuat data</p>
          <p className='text-sm mt-1'>
            {summaryError.response?.data?.message || summaryError.message || 'Terjadi kesalahan saat memuat data ringkasan'}
          </p>
        </div>
      )}

      {/* Payment Methods Summary */}
      {summaryData?.data?.summary?.payment_methods && summaryData.data.summary.payment_methods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {summaryData.data.summary.payment_methods.map(method => (
                <div
                  key={method.payment_method}
                  className='flex items-center justify-between p-3 border rounded-lg'
                >
                  <div>
                    <p className='font-medium capitalize'>
                      {method.payment_method}
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      {method.order_count} orders
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='font-semibold'>
                      {formatCurrency(method.total_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue='summary' className='space-y-4'>
        <div className='flex items-center justify-between'>
          <TabsList>
            <TabsTrigger value='summary'>Ringkasan Hari Ini</TabsTrigger>
            <TabsTrigger value='sessions'>Sesi Kasir</TabsTrigger>
            <TabsTrigger value='history'>Riwayat</TabsTrigger>
            <TabsTrigger value='report'>Laporan</TabsTrigger>
          </TabsList>
          <Button
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Memuat...' : 'Refresh'}
          </Button>
        </div>

        {/* Summary Tab */}
        <TabsContent value='summary' className='space-y-4'>
          {/* Error Display */}
          {summaryError && (
            <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg'>
              <p className='font-semibold'>❌ Gagal memuat data</p>
              <p className='text-sm mt-1'>
                {summaryError.response?.data?.message || summaryError.message || 'Terjadi kesalahan saat memuat data ringkasan'}
              </p>
            </div>
          )}

          <div className='grid gap-4 md:grid-cols-2'>
            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <AlertCircle className='h-5 w-5 text-orange-500' />
                  Sesi Aktif
                </CardTitle>
                <CardDescription>
                  Sesi kasir yang masih berjalan dan perlu ditutup
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSummary && !summaryData ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                  </div>
                ) : summaryError ? (
                  <div className='text-center py-8 text-red-500'>
                    Gagal memuat data sesi aktif
                  </div>
                ) : summaryData?.data?.active_sessions && summaryData.data.active_sessions.length > 0 ? (
                  <div className='space-y-3'>
                    {summaryData.data.active_sessions.map(session => (
                      <div
                        key={session.id}
                        className='flex items-center justify-between p-3 border rounded-lg'
                      >
                        <div>
                          <p className='font-medium'>{session.user?.name}</p>
                          <p className='text-sm text-muted-foreground'>
                            Mulai: {formatDate(session.opened_at)}
                          </p>
                        </div>
                        <Button
                          size='sm'
                          onClick={() => setSelectedSession(session)}
                        >
                          Tutup Sesi
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <p className='text-muted-foreground mb-2'>Tidak ada sesi aktif</p>
                    <p className='text-xs text-muted-foreground'>
                      {summaryData?.data ? 'Belum ada kasir yang membuka sesi hari ini' : 'Data belum dimuat'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Closed Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <CheckCircle className='h-5 w-5 text-green-500' />
                  Sesi Selesai
                </CardTitle>
                <CardDescription>
                  Sesi kasir yang sudah ditutup hari ini
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSummary && !summaryData ? (
                  <div className='space-y-3'>
                    {[1, 2].map(i => (
                      <div key={i} className='flex items-center justify-between p-3 border rounded-lg'>
                        <div className='space-y-2'>
                          <div className='h-4 w-32 bg-gray-200 rounded animate-pulse'></div>
                          <div className='h-3 w-48 bg-gray-200 rounded animate-pulse'></div>
                        </div>
                        <div className='text-right space-y-2'>
                          <div className='h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto'></div>
                          <div className='h-3 w-16 bg-gray-200 rounded animate-pulse ml-auto'></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : summaryError ? (
                  <div className='text-center py-8 text-red-500'>
                    Gagal memuat data sesi selesai
                  </div>
                ) : summaryData?.data?.closed_sessions && summaryData.data.closed_sessions.length > 0 ? (
                  <div className='space-y-3'>
                    {summaryData.data.closed_sessions.map(session => (
                      <div
                        key={session.id}
                        className='flex items-center justify-between p-3 border rounded-lg'
                      >
                        <div>
                          <p className='font-medium'>{session.user?.name}</p>
                          <p className='text-sm text-muted-foreground'>
                            Selesai: {session.closed_at ? formatDate(session.closed_at) : '-'}
                          </p>
                        </div>
                        <div className='text-right'>
                          <p className='font-semibold'>
                            {formatCurrency(session.expected_total || 0)}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            {session.total_transactions || 0} orders
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <p className='text-muted-foreground mb-2'>Belum ada sesi yang ditutup</p>
                    <p className='text-xs text-muted-foreground'>
                      {summaryData?.data ? 'Belum ada kasir yang menutup sesi hari ini' : 'Data belum dimuat'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value='sessions' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Daftar Sesi Kasir</CardTitle>
              <CardDescription>
                Semua sesi kasir untuk tanggal yang dipilih
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSummary && !summaryData ? (
                <div className='space-y-3'>
                  {[1, 2, 3].map(i => (
                    <div key={i} className='flex items-center justify-between p-4 border rounded-lg'>
                      <div className='flex items-center gap-4'>
                        <div className='h-5 w-5 bg-gray-200 rounded-full animate-pulse'></div>
                        <div className='space-y-2'>
                          <div className='h-4 w-32 bg-gray-200 rounded animate-pulse'></div>
                          <div className='h-3 w-48 bg-gray-200 rounded animate-pulse'></div>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='h-6 w-16 bg-gray-200 rounded-full animate-pulse'></div>
                        <div className='h-8 w-24 bg-gray-200 rounded animate-pulse'></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='space-y-3'>
                  {/* Active Sessions */}
                  {summaryData?.data?.active_sessions?.map(session => (
                    <div
                      key={session.id}
                      className='flex items-center justify-between p-4 border rounded-lg bg-orange-50'
                    >
                      <div className='flex items-center gap-4'>
                        <AlertCircle className='h-5 w-5 text-orange-500' />
                        <div>
                          <p className='font-medium'>{session.user?.name}</p>
                          <p className='text-sm text-muted-foreground'>
                            Mulai: {formatDate(session.opened_at)}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Badge variant='secondary'>Aktif</Badge>
                        <Button
                          size='sm'
                          onClick={() => setSelectedSession(session)}
                        >
                          Tutup Sesi
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Closed Sessions */}
                  {summaryData?.data?.closed_sessions?.map(session => (
                    <div
                      key={session.id}
                      className='flex items-center justify-between p-4 border rounded-lg bg-green-50'
                    >
                      <div className='flex items-center gap-4'>
                        <CheckCircle className='h-5 w-5 text-green-500' />
                        <div>
                          <p className='font-medium'>{session.user?.name}</p>
                          <p className='text-sm text-muted-foreground'>
                            Selesai: {session.closed_at ? formatDate(session.closed_at) : '-'}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center gap-4'>
                        <div className='text-right'>
                          <p className='font-semibold'>
                            {formatCurrency(session.expected_total || 0)}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            {session.total_transactions || 0} orders
                          </p>
                        </div>
                        <Badge variant='default'>Selesai</Badge>
                      </div>
                    </div>
                  ))}

                  {!summaryData?.data?.active_sessions?.length &&
                    !summaryData?.data?.closed_sessions?.length && (
                      <div className='text-center py-8 text-muted-foreground'>
                        Tidak ada sesi kasir untuk tanggal ini
                      </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value='history' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Penutupan</CardTitle>
              <CardDescription>Riwayat penutupan sesi kasir</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
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
              ) : historyData?.data?.data ? (
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
                        <TableHead className='text-right'>Selisih Kas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.data.data.map(session => (
                        <TableRow key={session.id} className='hover:bg-gray-50 transition-colors'>
                        <TableCell className='font-medium'>
                          {session.user?.name}
                        </TableCell>
                        <TableCell>{session.outlet?.name}</TableCell>
                        <TableCell>{formatDate(session.opened_at)}</TableCell>
                        <TableCell>
                          {session.closed_at ? formatDate(session.closed_at) : '-'}
                        </TableCell>
                        <TableCell>
                          {session.duration_hours
                            ? `${session.duration_hours}h`
                            : '-'}
                        </TableCell>
                        <TableCell className='text-right font-medium'>
                          {session.total_transactions || 0}
                        </TableCell>
                        <TableCell className='text-right font-semibold text-green-600'>
                          {formatCurrency(session.expected_total || 0)}
                        </TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center justify-end gap-1 ${getCashDifferenceColor(
                              session.cash_difference || 0
                            )}`}
                          >
                            {getCashDifferenceIcon(
                              session.cash_difference || 0
                            )}
                            <span className='font-medium'>
                              {formatCurrency(session.cash_difference || 0)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  Tidak ada riwayat penutupan
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value='report' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Laporan Penutupan</CardTitle>
              <CardDescription>
                Analisis dan laporan performa penutupan kasir
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReport ? (
                <div className='space-y-6'>
                  <div>
                    <div className='h-6 w-32 bg-gray-200 rounded animate-pulse mb-4'></div>
                    <div className='space-y-3'>
                      {[1, 2, 3].map(i => (
                        <div key={i} className='flex items-center justify-between p-4 border rounded-lg'>
                          <div className='space-y-2'>
                            <div className='h-4 w-32 bg-gray-200 rounded animate-pulse'></div>
                            <div className='h-3 w-24 bg-gray-200 rounded animate-pulse'></div>
                          </div>
                          <div className='text-right space-y-2'>
                            <div className='h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto'></div>
                            <div className='h-3 w-16 bg-gray-200 rounded animate-pulse ml-auto'></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className='h-6 w-32 bg-gray-200 rounded animate-pulse mb-4'></div>
                    <div className='space-y-3'>
                      {[1, 2, 3].map(i => (
                        <div key={i} className='flex items-center justify-between p-4 border rounded-lg'>
                          <div className='space-y-2'>
                            <div className='h-4 w-32 bg-gray-200 rounded animate-pulse'></div>
                            <div className='h-3 w-24 bg-gray-200 rounded animate-pulse'></div>
                          </div>
                          <div className='text-right space-y-2'>
                            <div className='h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto'></div>
                            <div className='h-3 w-16 bg-gray-200 rounded animate-pulse ml-auto'></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : reportData?.data ? (
                <div className='space-y-6'>
                  {/* Daily Summaries */}
                  <div>
                    <h3 className='text-lg font-semibold mb-4'>
                      Ringkasan Harian
                    </h3>
                    <div className='space-y-3'>
                      {reportData.data.daily_summaries.map(summary => (
                        <div
                          key={summary.date}
                          className='flex items-center justify-between p-4 border rounded-lg'
                        >
                          <div>
                            <p className='font-medium'>
                              {new Date(summary.date).toLocaleDateString(
                                'id-ID'
                              )}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                              {summary.sessions_count} sesi
                            </p>
                          </div>
                          <div className='text-right'>
                            <p className='font-semibold'>
                              {formatCurrency(summary.total_revenue)}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                              {summary.total_orders} orders
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cashier Performance */}
                  <div>
                    <h3 className='text-lg font-semibold mb-4'>
                      Performa Kasir
                    </h3>
                    <div className='space-y-3'>
                      {reportData.data.cashier_performance.map(performance => (
                        <div
                          key={performance.cashier_id}
                          className='flex items-center justify-between p-4 border rounded-lg'
                        >
                          <div>
                            <p className='font-medium'>
                              {performance.cashier?.name}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                              {performance.sessions_count} sesi
                            </p>
                          </div>
                          <div className='text-right'>
                            <p className='font-semibold'>
                              {formatCurrency(performance.total_revenue)}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                              {performance.total_orders} orders
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  Tidak ada data laporan
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Close Session Modal */}
      {selectedSession && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div
            className='fixed inset-0 bg-black/80'
            onClick={() => setSelectedSession(null)}
          />
          <div className='relative z-50 w-full max-w-md mx-4 bg-white rounded-lg shadow-lg'>
            <div className='flex items-center justify-between p-6 border-b'>
              <h2 className='text-lg font-semibold'>Tutup Sesi Kasir</h2>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setSelectedSession(null)}
                className='h-8 w-8 p-0'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
            <div className='p-6 space-y-4'>
              <div>
                <p className='font-medium'>{selectedSession.cashier?.name}</p>
                <p className='text-sm text-muted-foreground'>
                  Mulai: {formatDate(selectedSession.created_at)}
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='actual_cash'>Jumlah Kas Aktual</Label>
                <Input
                  id='actual_cash'
                  type='number'
                  placeholder='Masukkan jumlah kas aktual'
                  value={closingData.actual_cash_amount}
                  onChange={e =>
                    setClosingData(prev => ({
                      ...prev,
                      actual_cash_amount: e.target.value,
                    }))
                  }
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='notes'>Catatan Penutupan</Label>
                <Textarea
                  id='notes'
                  placeholder='Catatan tambahan (opsional)'
                  value={closingData.closing_notes}
                  onChange={e =>
                    setClosingData(prev => ({
                      ...prev,
                      closing_notes: e.target.value,
                    }))
                  }
                />
              </div>

              <div className='flex gap-2 pt-4'>
                <Button
                  variant='outline'
                  onClick={() => setSelectedSession(null)}
                  className='flex-1'
                >
                  Batal
                </Button>
                <Button
                  onClick={handleCloseSession}
                  disabled={closeSessionMutation.isPending}
                  className='flex-1'
                >
                  {closeSessionMutation.isPending ? 'Menutup...' : 'Tutup Sesi'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierClosingPage;
