import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  LineChart,
  Package,
  PieChart,
  Printer,
  RefreshCw,
  Share,
  ShoppingCart,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { reportService } from '../../services/report.service';
// Removed PaymentTypeReport tab as requested
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

const Reports = () => {
  const { currentOutlet, currentBusiness } = useAuth();
  const [selectedTab, setSelectedTab] = useState('sales');
  const [dateRange, setDateRange] = useState('today');
  const [reportPeriod, setReportPeriod] = useState('daily');
  const [loading, setLoading] = useState(false);

  // Data states
  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [customerData, setCustomerData] = useState(null);

  // Helper function to get date range
  const getDateRange = range => {
    const now = new Date();
    switch (range) {
      case 'today':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59
          ),
        };
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return { start: weekStart, end: now };
      case 'month':
        const monthStart = new Date(now);
        monthStart.setDate(1);
        return { start: monthStart, end: now };
      default:
        return { start: now, end: now };
    }
  };

  // Load sales data
  const loadSalesData = async () => {
    if (!currentBusiness) return;

    setLoading(true);
    try {
      const dateRangeObj = getDateRange(dateRange);
      const result = await reportService.getSales({
        start_date: dateRangeObj.start.toISOString().split('T')[0],
        end_date: dateRangeObj.end.toISOString().split('T')[0],
        period: reportPeriod,
      });

      if (result.success) {
        setSalesData(result.data);
      } else {
        toast.error('Gagal memuat data penjualan');
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
      toast.error('Gagal memuat data penjualan');
    } finally {
      setLoading(false);
    }
  };

  // Load inventory data
  const loadInventoryData = async () => {
    if (!currentBusiness) return;

    setLoading(true);
    try {
      const result = await reportService.getInventory();

      if (result.success) {
        setInventoryData(result.data);
      } else {
        toast.error('Gagal memuat data inventori');
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast.error('Gagal memuat data inventori');
    } finally {
      setLoading(false);
    }
  };

  // Load financial data
  const loadFinancialData = async () => {
    if (!currentBusiness) return;

    setLoading(true);
    try {
      const dateRangeObj = getDateRange(dateRange);
      const result = await reportService.getFinancial({
        start_date: dateRangeObj.start.toISOString().split('T')[0],
        end_date: dateRangeObj.end.toISOString().split('T')[0],
      });

      if (result.success) {
        setFinancialData(result.data);
      } else {
        toast.error('Gagal memuat data keuangan');
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  };

  // Load customer data
  const loadCustomerData = async () => {
    if (!currentBusiness) return;

    setLoading(true);
    try {
      const dateRangeObj = getDateRange(dateRange);
      const result = await reportService.getCustomerAnalytics({
        start_date: dateRangeObj.start.toISOString().split('T')[0],
        end_date: dateRangeObj.end.toISOString().split('T')[0],
      });

      if (result.success) {
        setCustomerData(result.data);
      } else {
        toast.error('Gagal memuat data pelanggan');
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
      toast.error('Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (!currentBusiness) return;

    switch (selectedTab) {
      case 'sales':
        loadSalesData();
        break;
      case 'inventory':
        loadInventoryData();
        break;
      case 'financial':
        loadFinancialData();
        break;
      case 'customer':
        loadCustomerData();
        break;
    }
  }, [selectedTab, dateRange, reportPeriod, currentBusiness]);

  // Helper function to format currency
  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Helper function to format percentage
  const formatPercentage = value => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const reports = [
    {
      id: 1,
      name: 'Laporan Penjualan Harian',
      type: 'sales',
      period: '15 Januari 2024',
      status: 'ready',
      size: '2.3 MB',
      generatedAt: '2024-01-15 16:30',
      format: 'PDF',
    },
    {
      id: 2,
      name: 'Laporan Inventori Mingguan',
      type: 'inventory',
      period: '8-14 Januari 2024',
      status: 'ready',
      size: '1.8 MB',
      generatedAt: '2024-01-15 09:00',
      format: 'Excel',
    },
    {
      id: 3,
      name: 'Laporan Keuangan Bulanan',
      type: 'financial',
      period: 'Desember 2023',
      status: 'processing',
      size: '-',
      generatedAt: '-',
      format: 'PDF',
    },
    {
      id: 4,
      name: 'Analisis Pelanggan',
      type: 'customer',
      period: 'Q4 2023',
      status: 'ready',
      size: '3.1 MB',
      generatedAt: '2024-01-10 14:20',
      format: 'PDF',
    },
  ];

  const getStatusBadge = status => {
    const statusConfig = {
      ready: {
        color: 'bg-green-100 text-green-800',
        label: 'Siap',
        icon: CheckCircle,
      },
      processing: {
        color: 'bg-blue-100 text-blue-800',
        label: 'Diproses',
        icon: RefreshCw,
      },
      failed: {
        color: 'bg-red-100 text-red-800',
        label: 'Gagal',
        icon: AlertCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.ready;
    const Icon = config.icon;

    return (
      <Badge
        className={`${config.color} font-medium flex items-center space-x-1`}
      >
        <Icon className='w-3 h-3' />
        <span>{config.label}</span>
      </Badge>
    );
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>Laporan Lengkap</h2>
          <p className='text-gray-600'>Analisis komprehensif performa bisnis</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' data-testid='schedule-report'>
            <Calendar className='w-4 h-4 mr-2' />
            Jadwalkan
          </Button>
          <Button variant='outline' data-testid='export-all'>
            <Download className='w-4 h-4 mr-2' />
            Export Semua
          </Button>
          <Button
            className='bg-blue-600 hover:bg-blue-700'
            data-testid='generate-report'
          >
            <FileText className='w-4 h-4 mr-2' />
            Generate Laporan
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex flex-col sm:flex-row gap-4 items-center justify-between'>
            <div className='flex gap-2'>
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                className='px-3 py-2 border border-gray-300 rounded-md bg-white text-sm'
                data-testid='date-range-select'
              >
                <option value='today'>Hari Ini</option>
                <option value='week'>Minggu Ini</option>
                <option value='month'>Bulan Ini</option>
                <option value='quarter'>Kuartal Ini</option>
                <option value='year'>Tahun Ini</option>
                <option value='custom'>Kustom</option>
              </select>
              <select
                value={reportPeriod}
                onChange={e => setReportPeriod(e.target.value)}
                className='px-3 py-2 border border-gray-300 rounded-md bg-white text-sm'
                data-testid='report-period-select'
              >
                <option value='daily'>Harian</option>
                <option value='weekly'>Mingguan</option>
                <option value='monthly'>Bulanan</option>
                <option value='quarterly'>Kuartalan</option>
              </select>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' data-testid='filter-reports'>
                <Filter className='w-4 h-4 mr-2' />
                Filter
              </Button>
              <Button variant='outline' data-testid='refresh-data'>
                <RefreshCw className='w-4 h-4 mr-2' />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className='grid w-full grid-cols-5'>
              <TabsTrigger value='sales' data-testid='sales-tab'>
                Penjualan
              </TabsTrigger>
              <TabsTrigger value='inventory' data-testid='inventory-tab'>
                Inventori
              </TabsTrigger>
              <TabsTrigger value='customer' data-testid='customer-tab'>
                Pelanggan
              </TabsTrigger>
              <TabsTrigger value='financial' data-testid='financial-tab'>
                Keuangan
              </TabsTrigger>
              <TabsTrigger value='generated' data-testid='generated-tab'>
                Laporan
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <Tabs value={selectedTab}>
            {/* Sales Reports */}
            <TabsContent value='sales' className='space-y-6'>
              {loading ? (
                <div className='flex items-center justify-center py-8'>
                  <RefreshCw className='w-6 h-6 animate-spin mr-2' />
                  <span>Memuat data penjualan...</span>
                </div>
              ) : salesData ? (
                <>
                  {/* Sales Overview */}
                  <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
                    <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-medium text-green-700'>
                              Total Revenue
                            </p>
                            <p className='text-xl font-bold text-green-800'>
                              {formatCurrency(salesData.summary?.total_revenue)}
                            </p>
                            <p className='text-xs text-green-600'>
                              periode terpilih
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
                              Total Orders
                            </p>
                            <p className='text-xl font-bold text-blue-800'>
                              {salesData.summary?.total_orders || 0}
                            </p>
                            <p className='text-xs text-blue-600'>transaksi</p>
                          </div>
                          <ShoppingCart className='w-8 h-8 text-blue-600' />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className='bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-medium text-purple-700'>
                              Customers
                            </p>
                            <p className='text-xl font-bold text-purple-800'>
                              {salesData.summary?.unique_customers || 0}
                            </p>
                            <p className='text-xs text-purple-600'>
                              pelanggan unik
                            </p>
                          </div>
                          <Users className='w-8 h-8 text-purple-600' />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className='bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-medium text-orange-700'>
                              Avg Order Value
                            </p>
                            <p className='text-xl font-bold text-orange-800'>
                              {formatCurrency(
                                salesData.summary?.avg_order_value
                              )}
                            </p>
                            <p className='text-xs text-orange-600'>
                              per transaksi
                            </p>
                          </div>
                          <Target className='w-8 h-8 text-orange-600' />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Top Products */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center'>
                        <BarChart3 className='w-5 h-5 mr-2' />
                        Produk Terlaris
                      </CardTitle>
                      <CardDescription>
                        Berdasarkan jumlah penjualan periode terpilih
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-4'>
                        {salesData.top_products &&
                        salesData.top_products.length > 0 ? (
                          salesData.top_products.map((product, index) => (
                            <div
                              key={product.name}
                              className='flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors'
                            >
                              <div className='flex items-center space-x-4'>
                                <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm'>
                                  {index + 1}
                                </div>
                                <div>
                                  <p className='font-semibold text-gray-900'>
                                    {product.name}
                                  </p>
                                  <p className='text-sm text-gray-600'>
                                    {product.total_sold} terjual
                                  </p>
                                </div>
                              </div>
                              <div className='text-right'>
                                <p className='font-bold text-green-600'>
                                  {formatCurrency(product.total_revenue)}
                                </p>
                                <p className='text-xs text-gray-500'>revenue</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className='text-center py-8 text-gray-500'>
                            <Package className='w-12 h-12 mx-auto mb-2 opacity-50' />
                            <p>Tidak ada data produk</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <BarChart3 className='w-12 h-12 mx-auto mb-2 opacity-50' />
                  <p>Tidak ada data penjualan</p>
                </div>
              )}
            </TabsContent>

            {/* Inventory Reports */}
            <TabsContent value='inventory' className='space-y-6'>
              {loading ? (
                <div className='flex items-center justify-center py-8'>
                  <RefreshCw className='w-6 h-6 animate-spin mr-2' />
                  <span>Memuat data inventori...</span>
                </div>
              ) : inventoryData ? (
                <>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                    <Card className='bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-medium text-blue-700'>
                              Total Items
                            </p>
                            <p className='text-xl font-bold text-blue-800'>
                              {inventoryData.summary?.total_products || 0}
                            </p>
                            <p className='text-xs text-blue-600'>
                              produk aktif
                            </p>
                          </div>
                          <Package className='w-8 h-8 text-blue-600' />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className='bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-medium text-yellow-700'>
                              Low Stock
                            </p>
                            <p className='text-xl font-bold text-yellow-800'>
                              {inventoryData.summary?.low_stock_products || 0}
                            </p>
                            <p className='text-xs text-yellow-600'>
                              perlu restock
                            </p>
                          </div>
                          <AlertCircle className='w-8 h-8 text-yellow-600' />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-medium text-green-700'>
                              Stock Value
                            </p>
                            <p className='text-xl font-bold text-green-800'>
                              {formatCurrency(
                                inventoryData.summary?.total_value
                              )}
                            </p>
                            <p className='text-xs text-green-600'>
                              total nilai stok
                            </p>
                          </div>
                          <DollarSign className='w-8 h-8 text-green-600' />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Inventory by Category */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center'>
                        <PieChart className='w-5 h-5 mr-2' />
                        Inventori per Kategori
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-4'>
                        {inventoryData.by_category &&
                        inventoryData.by_category.length > 0 ? (
                          inventoryData.by_category.map((category, index) => (
                            <div
                              key={index}
                              className='flex items-center justify-between p-3 rounded-lg bg-gray-50'
                              data-testid={`inventory-category-${index}`}
                            >
                              <div className='flex items-center space-x-4'>
                                <div className='w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold'>
                                  <Package className='w-5 h-5' />
                                </div>
                                <div>
                                  <p className='font-semibold text-gray-900'>
                                    {category.category_name}
                                  </p>
                                  <p className='text-sm text-gray-600'>
                                    {category.total_items} items •{' '}
                                    {category.low_stock_count} low stock
                                  </p>
                                </div>
                              </div>
                              <div className='text-right'>
                                <p className='font-bold text-gray-900'>
                                  {formatCurrency(category.total_value)}
                                </p>
                                <Badge
                                  className={`font-medium ${
                                    category.low_stock_count > 0
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {category.low_stock_count > 0
                                    ? 'Perhatian'
                                    : 'Baik'}
                                </Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className='text-center py-8 text-gray-500'>
                            <Package className='w-12 h-12 mx-auto mb-2 opacity-50' />
                            <p>Tidak ada data kategori</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <Package className='w-12 h-12 mx-auto mb-2 opacity-50' />
                  <p>Tidak ada data inventori</p>
                </div>
              )}
            </TabsContent>

            {/* Customer Reports */}
            <TabsContent value='customer' className='space-y-6'>
              {loading ? (
                <div className='flex items-center justify-center py-8'>
                  <RefreshCw className='w-6 h-6 animate-spin mr-2' />
                  <span>Memuat data pelanggan...</span>
                </div>
              ) : customerData ? (
                <>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                    <Card className='bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-medium text-purple-700'>
                              Total Customers
                            </p>
                            <p className='text-xl font-bold text-purple-800'>
                              {customerData.summary?.total_customers || 0}
                            </p>
                            <p className='text-xs text-purple-600'>terdaftar</p>
                          </div>
                          <Users className='w-8 h-8 text-purple-600' />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-medium text-green-700'>
                              Active Customers
                            </p>
                            <p className='text-xl font-bold text-green-800'>
                              {customerData.summary?.active_customers || 0}
                            </p>
                            <p className='text-xs text-green-600'>
                              periode terpilih
                            </p>
                          </div>
                          <TrendingUp className='w-8 h-8 text-green-600' />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className='bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-medium text-yellow-700'>
                              New Customers
                            </p>
                            <p className='text-xl font-bold text-yellow-800'>
                              {customerData.summary?.new_customers || 0}
                            </p>
                            <p className='text-xs text-yellow-600'>
                              periode terpilih
                            </p>
                          </div>
                          <Star className='w-8 h-8 text-yellow-600' />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Customer Metrics */}
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <Card>
                      <CardHeader>
                        <CardTitle>Customer Analytics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='space-y-4'>
                          <div className='flex justify-between items-center'>
                            <span className='text-gray-600'>
                              Average Order Value
                            </span>
                            <span className='font-bold text-blue-600'>
                              {formatCurrency(
                                customerData.summary?.avg_order_value
                              )}
                            </span>
                          </div>
                          <div className='flex justify-between items-center'>
                            <span className='text-gray-600'>Total Revenue</span>
                            <span className='font-bold text-green-600'>
                              {formatCurrency(
                                customerData.summary?.total_revenue
                              )}
                            </span>
                          </div>
                          <div className='flex justify-between items-center'>
                            <span className='text-gray-600'>Active Rate</span>
                            <span className='font-bold text-yellow-600'>
                              {customerData.summary?.total_customers > 0
                                ? (
                                    (customerData.summary?.active_customers /
                                      customerData.summary?.total_customers) *
                                    100
                                  ).toFixed(1)
                                : 0}
                              %
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Customer Segments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='space-y-3'>
                          {customerData.segments &&
                          customerData.segments.length > 0 ? (
                            customerData.segments.map((segment, index) => (
                              <div
                                key={index}
                                className='flex justify-between items-center p-2 bg-gray-50 rounded'
                              >
                                <span className='text-gray-700 font-medium'>
                                  {segment.segment} Customers
                                </span>
                                <Badge className='bg-blue-100 text-blue-800'>
                                  {segment.customer_count}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <div className='text-center py-4 text-gray-500'>
                              <p>Tidak ada data segment</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <Users className='w-12 h-12 mx-auto mb-2 opacity-50' />
                  <p>Tidak ada data pelanggan</p>
                </div>
              )}
            </TabsContent>

            {/* Financial Reports */}
            <TabsContent value='financial' className='space-y-6'>
              {loading ? (
                <div className='flex items-center justify-center py-8'>
                  <RefreshCw className='w-6 h-6 animate-spin mr-2' />
                  <span>Memuat data keuangan...</span>
                </div>
              ) : financialData ? (
                <>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                    <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-medium text-green-700'>
                              Net Profit
                            </p>
                            <p className='text-xl font-bold text-green-800'>
                              {formatCurrency(financialData.net_profit)}
                            </p>
                            <p className='text-xs text-green-600'>
                              periode terpilih
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
                              Profit Margin
                            </p>
                            <p className='text-xl font-bold text-blue-800'>
                              {formatPercentage(financialData.profit_margin)}
                            </p>
                            <p className='text-xs text-blue-600'>
                              margin keuntungan
                            </p>
                          </div>
                          <TrendingUp className='w-8 h-8 text-blue-600' />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className='bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-medium text-purple-700'>
                              Revenue Growth
                            </p>
                            <p className='text-xl font-bold text-purple-800'>
                              {financialData.revenue_growth > 0 ? '+' : ''}
                              {formatPercentage(financialData.revenue_growth)}
                            </p>
                            <p className='text-xs text-purple-600'>
                              pertumbuhan
                            </p>
                          </div>
                          <LineChart className='w-8 h-8 text-purple-600' />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Financial Breakdown */}
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue vs Expenses</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='space-y-4'>
                          <div className='flex justify-between items-center p-3 bg-green-50 rounded-lg'>
                            <span className='font-medium text-green-700'>
                              Total Revenue
                            </span>
                            <span className='font-bold text-green-800'>
                              {formatCurrency(financialData.revenue)}
                            </span>
                          </div>
                          <div className='flex justify-between items-center p-3 bg-red-50 rounded-lg'>
                            <span className='font-medium text-red-700'>
                              Total Expenses
                            </span>
                            <span className='font-bold text-red-800'>
                              {formatCurrency(financialData.expenses)}
                            </span>
                          </div>
                          <div className='flex justify-between items-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200'>
                            <span className='font-bold text-blue-700'>
                              Net Profit
                            </span>
                            <span className='font-bold text-blue-800 text-lg'>
                              {formatCurrency(financialData.net_profit)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Key Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='space-y-4'>
                          <div className='flex justify-between items-center'>
                            <span className='text-gray-600'>
                              Fixed Expenses
                            </span>
                            <span className='font-bold text-orange-600'>
                              {formatCurrency(
                                financialData.fixed_expenses || 0
                              )}
                            </span>
                          </div>
                          <div className='flex justify-between items-center'>
                            <span className='text-gray-600'>
                              Variable Expenses
                            </span>
                            <span className='font-bold text-purple-600'>
                              {formatCurrency(
                                financialData.variable_expenses || 0
                              )}
                            </span>
                          </div>
                          <div className='flex justify-between items-center'>
                            <span className='text-gray-600'>Profit Growth</span>
                            <span
                              className={`font-bold ${
                                financialData.profit_growth >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {financialData.profit_growth >= 0 ? '+' : ''}
                              {formatPercentage(
                                financialData.profit_growth || 0
                              )}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Expense Breakdown */}
                  {financialData.expense_breakdown &&
                    financialData.expense_breakdown.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className='flex items-center'>
                            <PieChart className='w-5 h-5 mr-2' />
                            Breakdown Pengeluaran
                          </CardTitle>
                          <CardDescription>
                            Rincian pengeluaran berdasarkan kategori
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className='space-y-3'>
                            {financialData.expense_breakdown.map(
                              (expense, index) => {
                                const percentage =
                                  financialData.expenses > 0
                                    ? (expense.total_amount /
                                        financialData.expenses) *
                                      100
                                    : 0;
                                return (
                                  <div
                                    key={index}
                                    className='flex items-center justify-between p-3 rounded-lg bg-gray-50'
                                  >
                                    <div className='flex-1'>
                                      <div className='flex items-center justify-between mb-2'>
                                        <div>
                                          <p className='font-semibold text-gray-900'>
                                            {expense.category}
                                          </p>
                                          <p className='text-sm text-gray-600'>
                                            {expense.transaction_count}{' '}
                                            transaksi
                                          </p>
                                        </div>
                                        <div className='text-right'>
                                          <p className='font-bold text-red-600'>
                                            {formatCurrency(
                                              expense.total_amount
                                            )}
                                          </p>
                                          <p className='text-sm text-gray-600'>
                                            {percentage.toFixed(1)}%
                                          </p>
                                        </div>
                                      </div>
                                      <div className='w-full bg-gray-200 rounded-full h-2'>
                                        <div
                                          className='bg-red-500 h-2 rounded-full transition-all'
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <DollarSign className='w-12 h-12 mx-auto mb-2 opacity-50' />
                  <p>Tidak ada data keuangan</p>
                </div>
              )}
            </TabsContent>

            {/* Payment Types Reports removed */}

            {/* Generated Reports */}
            <TabsContent value='generated' className='space-y-6'>
              <div className='space-y-4'>
                {reports.map(report => (
                  <Card
                    key={report.id}
                    className='card-hover'
                    data-testid={`report-${report.id}`}
                  >
                    <CardContent className='p-4'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-4'>
                          <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white'>
                            <FileText className='w-6 h-6' />
                          </div>
                          <div>
                            <h3 className='font-semibold text-gray-900'>
                              {report.name}
                            </h3>
                            <p className='text-sm text-gray-600'>
                              {report.period}
                            </p>
                            <div className='flex items-center space-x-4 text-xs text-gray-500 mt-1'>
                              <span>Format: {report.format}</span>
                              {report.size !== '-' && (
                                <span>Size: {report.size}</span>
                              )}
                              {report.generatedAt !== '-' && (
                                <span>Generated: {report.generatedAt}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className='flex items-center space-x-4'>
                          {getStatusBadge(report.status)}

                          <div className='flex space-x-2'>
                            {report.status === 'ready' && (
                              <>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  data-testid={`view-report-${report.id}`}
                                >
                                  <Eye className='w-4 h-4' />
                                </Button>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  data-testid={`download-report-${report.id}`}
                                >
                                  <Download className='w-4 h-4' />
                                </Button>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  data-testid={`share-report-${report.id}`}
                                >
                                  <Share className='w-4 h-4' />
                                </Button>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  data-testid={`print-report-${report.id}`}
                                >
                                  <Printer className='w-4 h-4' />
                                </Button>
                              </>
                            )}
                            {report.status === 'processing' && (
                              <Button size='sm' variant='outline' disabled>
                                <RefreshCw className='w-4 h-4 animate-spin' />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
