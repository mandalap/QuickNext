import {
  Activity,
  BarChart3,
  DollarSign,
  Download,
  PieChart as PieChartIcon,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queryKeys } from '../../config/reactQuery';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import reportService from '../../services/reportService';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AccessDeniedModal from '../modals/AccessDeniedModal';
/**
 * Sales Chart Report Component
 * Displays comprehensive sales analytics with multiple chart types
 * @param {boolean} hideHeader - Whether to hide the header section
 * @param {string} dateRange - Date range filter from parent
 * @param {object} customDate - Custom date range from parent
 */
const SalesChartReport = ({ hideHeader = false, dateRange = 'today', customDate = {}, refreshTrigger = 0 }) => {
  const navigate = useNavigate();
  const { subscriptionFeatures } = useAuth();
  
  /**
   * Determine chart type based on date range
   * - today/daily -> hourly (per jam)
   * - weekly -> daily (per 7 hari)
   * - monthly -> daily (per tanggal dalam bulan)
   * - custom -> disesuaikan dengan range
   */
  const getChartTypeFromDateRange = (range, custom) => {
    switch (range) {
      case 'today':
        return 'hourly'; // Per jam untuk hari ini
      case 'week':
        return 'daily'; // Per hari untuk 7 hari terakhir
      case 'month':
        return 'daily'; // Per hari untuk 30 hari terakhir
      case 'custom':
        // Untuk custom, hitung selisih hari
        if (custom?.start && custom?.end) {
          const start = new Date(custom.start);
          const end = new Date(custom.end);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 karena termasuk hari terakhir
          
          if (diffDays <= 1) {
            return 'hourly'; // 1 hari -> per jam
          } else if (diffDays <= 7) {
            return 'daily'; // 2-7 hari -> per hari
          } else if (diffDays <= 31) {
            return 'daily'; // 8-31 hari -> per hari
          } else {
            return 'daily'; // Lebih dari 31 hari -> per hari
          }
        }
        return 'daily'; // Default untuk custom
      default:
        return 'daily';
    }
  };
  
  // Use dateRange and customDate from parent (header filters)
  const chartType = getChartTypeFromDateRange(dateRange, customDate);
  const [viewType, setViewType] = useState('sales');

  // Query parameters
  const queryParams = {
    date_range: dateRange,
    custom_start: customDate.start || null,
    custom_end: customDate.end || null,
    chart_type: chartType,
  };

  // Fetch sales chart data using React Query
  const {
    data: queryData,
    isLoading: loading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.reports.salesChart(queryParams),
    queryFn: async () => {
      const response = await reportService.getSalesChartData(queryParams);
      
      if (response.success) {
        // Map backend field names to frontend expectations
        return {
          ...response.data,
          summary: {
            ...response.data.summary,
            growth_percentage: response.data.summary.growth_rate || response.data.summary.growth_percentage || 0
          },
          category_data: (response.data.category_data || []).map(item => ({
            ...item,
            name: item.category_name || item.name
          })),
          top_products: (response.data.top_products || []).map(item => ({
            ...item,
            product_name: item.name || item.product_name
          }))
        };
      }
      throw new Error(response.message || 'Gagal mengambil data grafik');
    },
    enabled: Boolean(dateRange && (dateRange !== 'custom' || (customDate.start && customDate.end))),
    staleTime: 2 * 60 * 1000, // 2 menit - data tetap fresh
    gcTime: 10 * 60 * 1000, // 10 menit - cache time
    retry: 1,
    refetchOnMount: false, // Tidak refetch jika data fresh
    placeholderData: (previousData) => previousData, // Keep previous data during refetch
  });

  // Default data structure
  const data = queryData || {
    chart_data: [],
    category_data: [],
    payment_data: [],
    top_products: [],
    summary: {
      total_sales: 0,
      total_transactions: 0,
      average_transaction: 0,
      growth_percentage: 0,
      growth_rate: 0,
    },
  };

  // Handle refresh without full page reload
  const handleRefresh = useCallback(() => {
    refetch();
    toast.success('Data sedang dimuat ulang...', { duration: 2000 });
  }, [refetch]);

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

  // Show error toast if query fails
  useEffect(() => {
    if (error) {
      console.error('Error fetching chart data:', error);
      toast.error(error.message || 'Terjadi kesalahan saat mengambil data grafik');
    }
  }, [error]);

  // ✅ NEW: Check subscription access (after all hooks)
  const hasReportsAccess = subscriptionFeatures?.has_reports_access ?? subscriptionFeatures?.has_advanced_reports ?? false;
  
  // ✅ NEW: Block access if no subscription access
  if (!hasReportsAccess) {
    return (
      <div className='bg-gray-50 min-h-screen flex items-center justify-center'>
        <AccessDeniedModal
          isOpen={true}
          onClose={() => {
            navigate('/');
          }}
          feature='advanced_reports'
          requiredPlan='Professional'
        />
      </div>
    );
  }

  /**
   * Format currency to Indonesian Rupiah
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
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

  /**
   * Helper function to get ISO week number
   * @param {Date} date - The date to get week number from
   * @returns {number} The ISO week number
   */
  const getWeekNumber = date => {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };

  /**
   * Format date based on chart type
   * @param {string} dateString - The date string to format
   * @returns {string} Formatted date string
   */
  const formatDate = dateString => {
    const date = new Date(dateString);
    switch (chartType) {
      case 'hourly':
        return date.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'daily':
        return date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
        });
      case 'weekly':
        return `Minggu ${getWeekNumber(date)}`;
      case 'monthly':
        return date.toLocaleDateString('id-ID', {
          month: 'short',
          year: 'numeric',
        });
      default:
        return date.toLocaleDateString('id-ID');
    }
  };

  /**
   * Custom tooltip component for charts
   * Displays formatted data on hover
   */
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white p-3 border border-gray-200 rounded-lg shadow-lg'>
          <p className='font-semibold text-gray-800'>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className='text-sm' style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Colors for charts
  const COLORS = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#06B6D4',
    '#84CC16',
    '#F97316',
  ];

  /**
   * Main Sales Chart Component
   * Displays sales data as Area Chart (for sales) or Bar Chart (for transactions)
   * @returns {JSX.Element} Chart component
   */
  const SalesChart = () => {
    if (!data.chart_data || data.chart_data.length === 0) {
      return (
        <div className='flex items-center justify-center h-64 text-gray-500'>
          <div className='text-center'>
            <BarChart3 className='w-12 h-12 mx-auto mb-2 opacity-50' />
            <p>Tidak ada data untuk ditampilkan</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width='100%' height={400}>
        {viewType === 'sales' ? (
          <AreaChart data={data.chart_data}>
            <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
            <XAxis
              dataKey='period'
              tick={{ fontSize: 12 }}
              tickFormatter={formatDate}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={value => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type='monotone'
              dataKey='sales'
              stroke='#3B82F6'
              fill='#3B82F6'
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        ) : (
          <BarChart data={data.chart_data}>
            <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
            <XAxis
              dataKey='period'
              tick={{ fontSize: 12 }}
              tickFormatter={formatDate}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={value => formatNumber(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey='transactions' fill='#10B981' radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    );
  };

  /**
   * Category Sales Chart Component
   * Displays sales distribution by product categories as Pie Chart
   * @returns {JSX.Element} Pie chart component
   */
  const CategoryChart = () => {
    if (!data.category_data || data.category_data.length === 0) {
      return (
        <div className='flex items-center justify-center h-64 text-gray-500'>
          <div className='text-center'>
            <PieChartIcon className='w-12 h-12 mx-auto mb-2 opacity-50' />
            <p>Tidak ada data kategori</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width='100%' height={300}>
        <PieChart>
          <Pie
            data={data.category_data}
            cx='50%'
            cy='50%'
            labelLine={false}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill='#8884d8'
            dataKey='sales'
          >
            {data.category_data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={value => formatCurrency(value)} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  /**
   * Payment Methods Chart Component
   * Displays sales distribution by payment methods as horizontal Bar Chart
   * @returns {JSX.Element} Bar chart component
   */
  const PaymentChart = () => {
    if (!data.payment_data || data.payment_data.length === 0) {
      return (
        <div className='flex items-center justify-center h-64 text-gray-500'>
          <div className='text-center'>
            <PieChartIcon className='w-12 h-12 mx-auto mb-2 opacity-50' />
            <p>Tidak ada data pembayaran</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width='100%' height={300}>
        <BarChart data={data.payment_data} layout='horizontal'>
          <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
          <XAxis type='number' tick={{ fontSize: 12 }} />
          <YAxis
            dataKey='payment_method'
            type='category'
            tick={{ fontSize: 12 }}
            width={100}
          />
          <Tooltip formatter={value => formatCurrency(value)} />
          <Bar dataKey='sales' fill='#8B5CF6' radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /**
   * Top Products Chart Component
   * Displays top selling products as vertical Bar Chart
   * @returns {JSX.Element} Bar chart component
   */
  const TopProductsChart = () => {
    if (!data.top_products || data.top_products.length === 0) {
      return (
        <div className='flex items-center justify-center h-64 text-gray-500'>
          <div className='text-center'>
            <BarChart3 className='w-12 h-12 mx-auto mb-2 opacity-50' />
            <p>Tidak ada data produk</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width='100%' height={400}>
        <BarChart data={data.top_products}>
          <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
          <XAxis
            dataKey='product_name'
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor='end'
            height={100}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={value => formatCurrency(value)}
          />
          <Tooltip formatter={value => formatCurrency(value)} />
          <Bar dataKey='sales' fill='#F59E0B' radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Show loading state only on initial load (not during refetch)
  if (loading && !data.chart_data?.length) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Memuat data grafik...</p>
        </div>
      </div>
    );
  }

  // Main component render
  return (
    <div className='space-y-6'>
      {/* Header (optional) */}
      {!hideHeader && (
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>
              Grafik Penjualan
            </h1>
            <p className='text-gray-600 mt-1'>
              Analisis visual data penjualan dan performa bisnis
            </p>
          </div>
          <div className='flex items-center space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Memuat...' : 'Refresh'}
            </Button>
            <Button>
              <Download className='w-4 h-4 mr-2' />
              Export
            </Button>
          </div>
        </div>
      )}

      {/* View Controls */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Tampilan Grafik</CardTitle>
              <CardDescription>Pilih jenis visualisasi data</CardDescription>
            </div>
            <div className='flex items-center space-x-4'>
              <Select value={viewType} onValueChange={setViewType}>
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='sales'>Penjualan</SelectItem>
                  <SelectItem value='transactions'>Transaksi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center'>
              <DollarSign className='w-4 h-4 mr-2 text-green-600' />
              Total Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.summary.total_sales)}
            </div>
            <div className='flex items-center space-x-1 text-xs'>
              {data.summary.growth_percentage >= 0 ? (
                <>
                  <TrendingUp className='h-3 w-3 text-green-500' />
                  <span className='text-green-500'>
                    +{data.summary.growth_percentage}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className='h-3 w-3 text-red-500' />
                  <span className='text-red-500'>
                    {data.summary.growth_percentage}%
                  </span>
                </>
              )}
              <span className='text-gray-500'>dari periode sebelumnya</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center'>
              <ShoppingCart className='w-4 h-4 mr-2 text-blue-600' />
              Total Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatNumber(data.summary.total_transactions)}
            </div>
            <p className='text-xs text-gray-500'>
              Rata-rata {formatCurrency(data.summary.average_transaction)} per
              transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center'>
              <Activity className='w-4 h-4 mr-2 text-purple-600' />
              Rata-rata Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.summary.average_transaction)}
            </div>
            <p className='text-xs text-gray-500'>Nilai transaksi rata-rata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center'>
              <Users className='w-4 h-4 mr-2 text-orange-600' />
              Pertumbuhan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.growth_percentage >= 0 ? '+' : ''}
              {data.summary.growth_percentage}%
            </div>
            <p className='text-xs text-gray-500'>
              Dibanding periode sebelumnya
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <Tabs defaultValue='sales' className='space-y-4'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='sales'>Penjualan</TabsTrigger>
          <TabsTrigger value='categories'>Kategori</TabsTrigger>
          <TabsTrigger value='payments'>Pembayaran</TabsTrigger>
          <TabsTrigger value='products'>Produk</TabsTrigger>
        </TabsList>

        <TabsContent value='sales' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Trend Penjualan</CardTitle>
              <CardDescription>
                Grafik{' '}
                {chartType === 'hourly'
                  ? 'per jam'
                  : chartType === 'daily'
                  ? 'harian'
                  : chartType === 'weekly'
                  ? 'mingguan'
                  : 'bulanan'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='categories' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Penjualan per Kategori</CardTitle>
              <CardDescription>
                Distribusi penjualan berdasarkan kategori produk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='payments' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Metode Pembayaran</CardTitle>
              <CardDescription>
                Distribusi pembayaran berdasarkan metode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='products' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Produk Terlaris</CardTitle>
              <CardDescription>
                Top produk dengan penjualan tertinggi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TopProductsChart />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data Tables */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Top Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Produk</CardTitle>
            <CardDescription>Produk dengan penjualan tertinggi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {data.top_products?.slice(0, 5).map((product, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                >
                  <div className='flex items-center space-x-3'>
                    <Badge
                      variant='secondary'
                      className='w-6 h-6 rounded-full flex items-center justify-center text-xs'
                    >
                      {index + 1}
                    </Badge>
                    <div>
                      <p className='font-medium text-sm'>
                        {product.product_name}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {product.quantity_sold} terjual
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='font-semibold text-sm'>
                      {formatCurrency(product.sales)}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {product.order_count} pesanan
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Table */}
        <Card>
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
            <CardDescription>Distribusi pembayaran</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {data.payment_data?.map((payment, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                >
                  <div className='flex items-center space-x-3'>
                    <div
                      className='w-4 h-4 rounded-full'
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div>
                      <p className='font-medium text-sm'>
                        {payment.payment_method}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {payment.transactions} transaksi
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='font-semibold text-sm'>
                      {formatCurrency(payment.sales)}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {payment.sales_percentage}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesChartReport;
