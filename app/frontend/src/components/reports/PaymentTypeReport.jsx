import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CreditCard,
  DollarSign,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { queryKeys } from '../../config/reactQuery';
import { useKeyboardRefresh } from '../../hooks/useKeyboardRefresh';
import reportService from '../../services/reportService';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import SmartPagination from '../ui/SmartPagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const PaymentTypeReport = ({
  dateRange = 'today',
  customDate = {},
  refreshTrigger = 0,
}) => {
  const [viewType, setViewType] = useState('chart');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  // Prepare query params
  const queryParams = useMemo(
    () => ({
      dateRange: dateRange || 'today',
      customStart: customDate.start,
      customEnd: customDate.end,
    }),
    [dateRange, customDate.start, customDate.end]
  );

  // React Query: Fetch payment type report data
  const {
    data: queryData,
    isLoading: loading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.reports.paymentTypes(queryParams),
    queryFn: async () => {
      const params = {
        dateRange: queryParams.dateRange,
        customStart: queryParams.customStart,
        customEnd: queryParams.customEnd,
      };

      const result = await reportService.getPaymentTypeReport(params);

      if (!result?.success) {
        throw new Error(
          result?.message || 'Failed to fetch payment type report'
        );
      }

      // Map backend response structure
      return {
        summary: result.data?.summary || {
          total_amount: 0,
          total_transactions: 0,
          average_transaction: 0,
          payment_methods_count: 0,
        },
        payment_methods: Array.isArray(result.data?.payment_methods)
          ? result.data.payment_methods
          : [],
        daily_trends: result.data?.daily_trends || {},
        hourly_trends: result.data?.hourly_trends || {},
        top_transactions: Array.isArray(result.data?.top_transactions)
          ? result.data.top_transactions
          : [],
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  });

  // Normalize data with fallback
  const data = useMemo(() => {
    if (queryData) {
      return queryData;
    }
    return {
      summary: {
        total_amount: 0,
        total_transactions: 0,
        average_transaction: 0,
        payment_methods_count: 0,
      },
      payment_methods: [],
      daily_trends: {},
      hourly_trends: {},
      top_transactions: [],
    };
  }, [queryData]);

  // Handle refresh with React Query refetch
  const handleRefresh = useCallback(
    async (showToast = false) => {
      if (refreshing || loading || isFetching) {
        return; // Prevent multiple simultaneous refreshes
      }

      setRefreshing(true);
      try {
        await refetch();
        // Only show toast if explicitly requested (user action, not auto-refresh)
        if (showToast) {
          toast.success('Data berhasil diperbarui', { duration: 2000 });
        }
      } catch (error) {
        console.error('Error refreshing payment type data:', error);
        // Only show error toast for user-initiated actions
        if (showToast) {
          toast.error('Gagal memuat ulang data', { duration: 3000 });
        }
      } finally {
        setRefreshing(false);
      }
    },
    [refetch, refreshing, loading, isFetching]
  );

  // Keyboard shortcut F5 untuk refresh tanpa full page reload
  useKeyboardRefresh(() => {
    if (!refreshing && !loading && !isFetching) {
      handleRefresh(true); // Show toast for manual refresh
    }
  });

  // Handle refreshTrigger prop (for compatibility with parent component)
  useEffect(() => {
    if (refreshTrigger > 0 && !refreshing && !loading && !isFetching) {
      handleRefresh();
    }
  }, [refreshTrigger, handleRefresh, refreshing, loading, isFetching]);

  // Handle error
  useEffect(() => {
    if (error) {
      console.error('Error fetching payment type data:', error);
      toast.error(error.message || 'Gagal mengambil data laporan pembayaran');
    }
  }, [error]);

  // Reset pagination when tab changes or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab, data.top_transactions]);

  // Debug logging for hourly trends
  useEffect(() => {
    if (data.hourly_trends) {
      console.log('📊 Hourly Trends Data:', {
        hasData: !!data.hourly_trends,
        keys: Object.keys(data.hourly_trends || {}),
        keysCount: Object.keys(data.hourly_trends || {}).length,
        dateRange,
      });
    }
  }, [data.hourly_trends, dateRange]);

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

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = dateString => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentIcon = method => {
    const iconConfig = {
      Tunai: DollarSign,
      QRIS: CreditCard,
      GoPay: CreditCard,
      OVO: CreditCard,
      DANA: CreditCard,
      ShopeePay: CreditCard,
      'Transfer Bank': CreditCard,
      'Kartu Kredit': CreditCard,
      'Kartu Debit': CreditCard,
    };
    return iconConfig[method] || CreditCard;
  };

  const getPaymentColor = index => {
    const colors = [
      'bg-green-500',
      'bg-blue-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
    ];
    return colors[index % colors.length];
  };

  // Chart colors for Recharts
  const getChartColors = () => {
    return [
      { fill: '#10b981', stroke: '#059669' }, // green
      { fill: '#3b82f6', stroke: '#2563eb' }, // blue
      { fill: '#8b5cf6', stroke: '#7c3aed' }, // purple
      { fill: '#f59e0b', stroke: '#d97706' }, // orange
      { fill: '#ef4444', stroke: '#dc2626' }, // red
      { fill: '#ec4899', stroke: '#db2777' }, // pink
      { fill: '#6366f1', stroke: '#4f46e5' }, // indigo
      { fill: '#eab308', stroke: '#ca8a04' }, // yellow
    ];
  };

  const chartColors = getChartColors();

  // Custom Tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white p-3 border border-gray-200 rounded-lg shadow-lg'>
          <p className='font-semibold text-gray-900 mb-2'>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className='text-sm' style={{ color: entry.color }}>
              <span className='font-medium'>{entry.name}:</span>{' '}
              {formatCurrency(entry.value || 0)}
              {entry.payload?.transaction_count && (
                <span className='text-gray-500 ml-2'>
                  ({entry.payload.transaction_count} transaksi)
                </span>
              )}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Chart component with Recharts
  const PaymentChart = ({ data, type = 'bar' }) => {
    if (!data || data.length === 0) {
      return (
        <div className='flex items-center justify-center h-64 text-gray-500'>
          <p>Tidak ada data untuk ditampilkan</p>
        </div>
      );
    }

    // Prepare data for charts
    const chartData = data.map((item, index) => ({
      name: item.payment_method || 'N/A',
      value: item.total_amount || 0,
      transactions: item.transaction_count || 0,
      percentage: item.percentage_amount || 0,
      color: chartColors[index % chartColors.length].fill,
    }));

    if (type === 'pie') {
      return (
        <div className='space-y-6'>
          <ResponsiveContainer width='100%' height={400}>
            <PieChart>
              <defs>
                {chartData.map((entry, index) => (
                  <linearGradient
                    key={`gradient-${index}`}
                    id={`gradient-${index}`}
                    x1='0'
                    y1='0'
                    x2='0'
                    y2='1'
                  >
                    <stop
                      offset='0%'
                      stopColor={chartColors[index].fill}
                      stopOpacity={1}
                    />
                    <stop
                      offset='100%'
                      stopColor={chartColors[index].stroke}
                      stopOpacity={0.8}
                    />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={chartData}
                cx='50%'
                cy='50%'
                labelLine={false}
                label={({ name, percentage }) =>
                  `${name}: ${percentage.toFixed(1)}%`
                }
                outerRadius={120}
                fill='#8884d8'
                dataKey='value'
                animationBegin={0}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#gradient-${index})`}
                    stroke={chartColors[index].stroke}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign='bottom'
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend with details */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mt-4'>
            {chartData.map((item, index) => {
              const Icon = getPaymentIcon(item.name);
              return (
                <div
                  key={index}
                  className='flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors'
                >
                  <div
                    className='p-2 rounded-full'
                    style={{ backgroundColor: item.color }}
                  >
                    <Icon className='w-4 h-4 text-white' />
                  </div>
                  <div className='flex-1'>
                    <div className='font-medium'>{item.name}</div>
                    <div className='text-sm text-gray-500'>
                      {formatCurrency(item.value)} ({item.percentage.toFixed(1)}
                      %)
                    </div>
                    <div className='text-xs text-gray-400'>
                      {item.transactions} transaksi
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Bar chart with gradient
    return (
      <ResponsiveContainer width='100%' height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <defs>
            {chartData.map((entry, index) => (
              <linearGradient
                key={`barGradient-${index}`}
                id={`barGradient-${index}`}
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop
                  offset='0%'
                  stopColor={chartColors[index].fill}
                  stopOpacity={1}
                />
                <stop
                  offset='100%'
                  stopColor={chartColors[index].stroke}
                  stopOpacity={0.7}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
          <XAxis
            dataKey='name'
            angle={-45}
            textAnchor='end'
            height={80}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={value => {
              if (value >= 1000000) {
                return `Rp ${(value / 1000000).toFixed(1)}M`;
              }
              if (value >= 1000) {
                return `Rp ${(value / 1000).toFixed(0)}K`;
              }
              return `Rp ${value}`;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey='value'
            radius={[8, 8, 0, 0]}
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`url(#barGradient-${index})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Daily Trends Chart
  const DailyTrendsChart = () => {
    if (!data.daily_trends || Object.keys(data.daily_trends).length === 0) {
      return (
        <div className='flex items-center justify-center h-64 text-gray-500'>
          <p>Tidak ada data tren harian</p>
        </div>
      );
    }

    // Prepare data for line chart
    const dailyData = Object.entries(data.daily_trends).map(
      ([date, payments]) => {
        const dayData = {
          date: formatDate(date),
          dateKey: date,
        };
        payments.forEach((payment, index) => {
          dayData[payment.payment_method] = payment.total_amount || 0;
        });
        return dayData;
      }
    );

    // Get all payment methods
    const paymentMethods = [
      ...new Set(
        Object.values(data.daily_trends)
          .flat()
          .map(p => p.payment_method)
      ),
    ];

    return (
      <ResponsiveContainer width='100%' height={400}>
        <AreaChart
          data={dailyData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            {paymentMethods.map((method, index) => (
              <linearGradient
                key={`areaGradient-${index}`}
                id={`areaGradient-${index}`}
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop
                  offset='5%'
                  stopColor={chartColors[index % chartColors.length].fill}
                  stopOpacity={0.8}
                />
                <stop
                  offset='95%'
                  stopColor={chartColors[index % chartColors.length].fill}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
          <XAxis dataKey='date' tick={{ fill: '#6b7280', fontSize: 12 }} />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={value => {
              if (value >= 1000000) {
                return `Rp ${(value / 1000000).toFixed(1)}M`;
              }
              if (value >= 1000) {
                return `Rp ${(value / 1000).toFixed(0)}K`;
              }
              return `Rp ${value}`;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {paymentMethods.map((method, index) => (
            <Area
              key={method}
              type='monotone'
              dataKey={method}
              stackId='1'
              stroke={chartColors[index % chartColors.length].stroke}
              fill={`url(#areaGradient-${index})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className='space-y-6'>
      {/* Loading State - Only show on initial load */}
      {loading && !queryData && (
        <div className='flex items-center justify-center h-64'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
        </div>
      )}

      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-green-700'>
                  Total Nilai
                </p>
                <p className='text-xl font-bold text-green-800'>
                  {formatCurrency(data.summary?.total_amount || 0)}
                </p>
                <p className='text-xs text-green-600'>
                  semua metode pembayaran
                </p>
              </div>
              <DollarSign className='w-8 h-8 text-green-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-blue-700'>
                  Total Transaksi
                </p>
                <p className='text-xl font-bold text-blue-800'>
                  {formatNumber(data.summary?.total_transactions || 0)}
                </p>
                <p className='text-xs text-blue-600'>transaksi berhasil</p>
              </div>
              <Users className='w-8 h-8 text-blue-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-purple-700'>
                  Rata-rata Transaksi
                </p>
                <p className='text-xl font-bold text-purple-800'>
                  {formatCurrency(data.summary?.average_transaction || 0)}
                </p>
                <p className='text-xs text-purple-600'>per transaksi</p>
              </div>
              <TrendingUp className='w-8 h-8 text-purple-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-orange-700'>
                  Metode Aktif
                </p>
                <p className='text-xl font-bold text-orange-800'>
                  {data.summary?.payment_methods_count || 0}
                </p>
                <p className='text-xs text-orange-600'>jenis pembayaran</p>
              </div>
              <CreditCard className='w-8 h-8 text-orange-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='trends'>Tren Harian</TabsTrigger>
              <TabsTrigger value='hourly'>Tren Jam</TabsTrigger>
              <TabsTrigger value='transactions'>Transaksi Besar</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <Tabs value={selectedTab}>
            {/* Overview Tab */}
            <TabsContent value='overview' className='space-y-6'>
              {/* Chart Controls */}
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-semibold'>
                    Distribusi Metode Pembayaran
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Analisis pembayaran berdasarkan metode
                  </p>
                </div>
                <div className='flex items-center space-x-2'>
                  <Button
                    onClick={handleRefresh}
                    disabled={refreshing || loading || isFetching}
                    variant='outline'
                    size='sm'
                    className='flex items-center space-x-2'
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        refreshing || isFetching ? 'animate-spin' : ''
                      }`}
                    />
                    <span>Refresh</span>
                  </Button>
                  <Select value={viewType} onValueChange={setViewType}>
                    <SelectTrigger className='w-32'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='chart'>Chart</SelectItem>
                      <SelectItem value='table'>Tabel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {viewType === 'chart' ? (
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  <Card className='border-2 border-blue-100 shadow-lg'>
                    <CardHeader className='bg-gradient-to-r from-blue-50 to-indigo-50 border-b'>
                      <CardTitle className='text-lg font-semibold flex items-center'>
                        <BarChart3 className='w-5 h-5 mr-2 text-blue-600' />
                        Bar Chart
                      </CardTitle>
                      <p className='text-sm text-gray-600 mt-1'>
                        Perbandingan nilai pembayaran per metode
                      </p>
                    </CardHeader>
                    <CardContent className='pt-6'>
                      <PaymentChart data={data.payment_methods} type='bar' />
                    </CardContent>
                  </Card>
                  <Card className='border-2 border-purple-100 shadow-lg'>
                    <CardHeader className='bg-gradient-to-r from-purple-50 to-pink-50 border-b'>
                      <CardTitle className='text-lg font-semibold flex items-center'>
                        <PieChartIcon className='w-5 h-5 mr-2 text-purple-600' />
                        Pie Chart
                      </CardTitle>
                      <p className='text-sm text-gray-600 mt-1'>
                        Distribusi persentase metode pembayaran
                      </p>
                    </CardHeader>
                    <CardContent className='pt-6'>
                      <PaymentChart data={data.payment_methods} type='pie' />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b'>
                        <th className='text-left py-3 px-4 font-medium text-gray-600'>
                          Metode Pembayaran
                        </th>
                        <th className='text-left py-3 px-4 font-medium text-gray-600'>
                          Jumlah Transaksi
                        </th>
                        <th className='text-left py-3 px-4 font-medium text-gray-600'>
                          Total Nilai
                        </th>
                        <th className='text-left py-3 px-4 font-medium text-gray-600'>
                          Persentase Nilai
                        </th>
                        <th className='text-left py-3 px-4 font-medium text-gray-600'>
                          Rata-rata/Transaksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payment_methods &&
                      data.payment_methods.length > 0 ? (
                        data.payment_methods.map((item, index) => {
                          const Icon = getPaymentIcon(item.payment_method);
                          return (
                            <tr
                              key={index}
                              className='border-b hover:bg-gray-50'
                            >
                              <td className='py-3 px-4'>
                                <div className='flex items-center space-x-2'>
                                  <Icon className='w-4 h-4 text-gray-600' />
                                  <span className='font-medium'>
                                    {item.payment_method || 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td className='py-3 px-4'>
                                <div className='flex items-center space-x-2'>
                                  <span>
                                    {formatNumber(item.transaction_count || 0)}
                                  </span>
                                  <div
                                    className={`w-3 h-3 rounded-full ${getPaymentColor(
                                      index
                                    )}`}
                                  ></div>
                                </div>
                              </td>
                              <td className='py-3 px-4 font-semibold'>
                                {formatCurrency(item.total_amount || 0)}
                              </td>
                              <td className='py-3 px-4'>
                                <div className='flex items-center space-x-2'>
                                  <div className='w-16 bg-gray-200 rounded-full h-2'>
                                    <div
                                      className={`${getPaymentColor(
                                        index
                                      )} h-2 rounded-full`}
                                      style={{
                                        width: `${
                                          item.percentage_amount || 0
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                  <span className='text-sm text-gray-600'>
                                    {(item.percentage_amount || 0).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className='py-3 px-4 text-gray-600'>
                                {formatCurrency(item.average_amount || 0)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className='py-8 text-center text-gray-500'
                          >
                            Tidak ada data metode pembayaran
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Daily Trends Tab */}
            <TabsContent value='trends' className='space-y-6'>
              <div>
                <h3 className='text-lg font-semibold mb-4 flex items-center'>
                  <TrendingUp className='w-5 h-5 mr-2 text-blue-600' />
                  Tren Harian Pembayaran
                </h3>
                <Card>
                  <CardContent className='pt-6'>
                    <DailyTrendsChart />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Hourly Trends Tab */}
            <TabsContent value='hourly' className='space-y-6'>
              <div>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold'>Tren Per Jam</h3>
                  <Badge
                    variant='outline'
                    className='text-blue-600 border-blue-300'
                  >
                    {dateRange === 'today'
                      ? 'Hari Ini'
                      : dateRange === 'yesterday'
                      ? 'Kemarin'
                      : dateRange === 'week'
                      ? '7 Hari Terakhir'
                      : dateRange === 'month'
                      ? '30 Hari Terakhir'
                      : 'Rentang Kustom'}
                  </Badge>
                </div>
                {data.hourly_trends &&
                Object.keys(data.hourly_trends).length > 0 ? (
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                    {Object.entries(data.hourly_trends)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([hour, payments]) => {
                        const hourTotal = Array.isArray(payments)
                          ? payments.reduce(
                              (sum, p) => sum + (p.total_amount || 0),
                              0
                            )
                          : 0;
                        const hourTransactions = Array.isArray(payments)
                          ? payments.reduce(
                              (sum, p) => sum + (p.transaction_count || 0),
                              0
                            )
                          : 0;
                        return (
                          <Card
                            key={hour}
                            className='hover:shadow-md transition-shadow'
                          >
                            <CardHeader className='pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b'>
                              <div className='flex items-center justify-between'>
                                <CardTitle className='text-base font-bold'>
                                  {String(hour).padStart(2, '0')}:00
                                </CardTitle>
                                <div className='text-right'>
                                  <p className='text-xs font-semibold text-green-600'>
                                    {formatCurrency(hourTotal)}
                                  </p>
                                  <p className='text-xs text-gray-500'>
                                    {hourTransactions} transaksi
                                  </p>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className='pt-4'>
                              <div className='space-y-2'>
                                {Array.isArray(payments) &&
                                payments.length > 0 ? (
                                  payments.map((payment, index) => (
                                    <div
                                      key={index}
                                      className='flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors'
                                    >
                                      <div className='flex items-center space-x-2 flex-1 min-w-0'>
                                        <div
                                          className={`w-3 h-3 rounded-full flex-shrink-0 ${getPaymentColor(
                                            index
                                          )}`}
                                        ></div>
                                        <span className='text-sm font-medium truncate'>
                                          {payment.payment_method || 'N/A'}
                                        </span>
                                      </div>
                                      <div className='text-right flex-shrink-0 ml-2'>
                                        <div className='text-sm font-semibold text-gray-900'>
                                          {formatCurrency(
                                            payment.total_amount || 0
                                          )}
                                        </div>
                                        <div className='text-xs text-gray-500'>
                                          {payment.transaction_count || 0} tx
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className='text-xs text-gray-400 text-center py-2'>
                                    Tidak ada transaksi
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className='text-center py-8'>
                      <p className='text-gray-500 mb-2'>
                        Tidak ada data tren per jam untuk hari ini
                      </p>
                      <p className='text-sm text-gray-400'>
                        Belum ada transaksi yang tercatat hari ini
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Top Transactions Tab */}
            <TabsContent value='transactions' className='space-y-6'>
              <div>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold'>Transaksi Terbesar</h3>
                  {data.top_transactions &&
                    data.top_transactions.length > 0 && (
                      <p className='text-sm text-gray-600'>
                        Total: {data.top_transactions.length} transaksi
                      </p>
                    )}
                </div>
                {data.top_transactions && data.top_transactions.length > 0 ? (
                  <>
                    <div className='space-y-4'>
                      {data.top_transactions
                        .slice(
                          (currentPage - 1) * itemsPerPage,
                          currentPage * itemsPerPage
                        )
                        .map((transaction, index) => {
                          const globalIndex =
                            (currentPage - 1) * itemsPerPage + index;
                          return (
                            <Card
                              key={globalIndex}
                              className='hover:shadow-md transition-shadow'
                            >
                              <CardContent className='p-4'>
                                <div className='flex items-center justify-between'>
                                  <div className='flex items-center space-x-4'>
                                    <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm'>
                                      {globalIndex + 1}
                                    </div>
                                    <div>
                                      <p className='font-semibold text-gray-900'>
                                        {transaction.order_number || 'N/A'}
                                      </p>
                                      <p className='text-sm text-gray-600'>
                                        {transaction.customer_name || 'Walk-in'}{' '}
                                        • {transaction.cashier_name || 'N/A'}
                                      </p>
                                      <p className='text-xs text-gray-500'>
                                        {formatTime(transaction.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className='text-right'>
                                    <div className='flex items-center space-x-2'>
                                      <Badge className='bg-blue-100 text-blue-800'>
                                        {transaction.payment_method || 'N/A'}
                                      </Badge>
                                      <div>
                                        <p className='font-bold text-green-600'>
                                          {formatCurrency(
                                            transaction.amount || 0
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>

                    {/* Pagination */}
                    {data.top_transactions.length > itemsPerPage && (
                      <div className='mt-6'>
                        <SmartPagination
                          currentPage={currentPage}
                          totalPages={Math.ceil(
                            data.top_transactions.length / itemsPerPage
                          )}
                          onPageChange={setCurrentPage}
                          itemsPerPage={itemsPerPage}
                          totalItems={data.top_transactions.length}
                          isLoading={loading}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className='text-center py-8'>
                      <p className='text-gray-500'>
                        Tidak ada data transaksi besar
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentTypeReport;
