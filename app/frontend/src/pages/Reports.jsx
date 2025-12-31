import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Package,
  Percent,
  RefreshCw,
  Repeat,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import {
  Area,
  AreaChart,
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
import PaymentTypeReport from '../components/reports/PaymentTypeReport';
import PromoUsageReport from '../components/reports/PromoUsageReport';
import SalesChartReport from '../components/reports/SalesChartReport';
import SalesDetailReport from '../components/reports/SalesDetailReport';
import SalesSummaryReport from '../components/reports/SalesSummaryReport';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { queryKeys } from '../config/reactQuery';
import { useKeyboardRefresh } from '../hooks/useKeyboardRefresh';
import CashierClosingPage from './CashierClosingPage';
import CashierPerformancePage from './CashierPerformancePage';
// Removed Dialog import to fix initialization error
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { attendanceService } from '../services/attendance.service';
import customerReportService from '../services/customerReportService';
import { financeService } from '../services/finance.service';
import reportService from '../services/reportService';
import { useNavigate } from 'react-router-dom';
import AccessDeniedModal from '../components/modals/AccessDeniedModal';

const Reports = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { subscriptionFeatures } = useAuth();
  
  // ✅ FIX: All hooks must be called before any conditional returns
  const [selectedReport, setSelectedReport] = useState('product-sales');
  const [chartType, setChartType] = useState('daily'); // daily, weekly, monthly
  const [dateRange, setDateRange] = useState('today');
  const [customDate, setCustomDate] = useState({
    start: '',
    end: '',
  });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Sync with sidebar shortcut: /reports?category=sales|promo
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const report = params.get('report');
    if (report) {
      setSelectedReport(report);
      return;
    }
    const category = params.get('category');
    if (!category) return;
    const categoryToDefaultReport = {
      sales: 'sales-summary',
      promo: 'promo-usage',
      products: 'product-sales',
      cashier: 'cashier-performance',
      customers: 'customer-analysis',
      employees: 'attendance',
      inventory: 'inventory-status',
      tax: 'tax-report',
    };
    const target = categoryToDefaultReport[category];
    if (target) {
      setSelectedReport(target);
    }
  }, [location.search]);

  // ✅ NEW: Check subscription access (after all hooks)
  const hasReportsAccess = subscriptionFeatures?.has_reports_access ?? subscriptionFeatures?.has_advanced_reports ?? false;
  
  // ✅ NEW: Block access immediately if no subscription access (after all hooks)
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

  // Reset filters
  const handleResetFilters = () => {
    setChartType('daily');
    setDateRange('today');
    setCustomDate({ start: '', end: '' });
  };

  // Handle filter change (simplified)
  const handleFilterChange = value => {
    if (value === 'custom') {
      setChartType('daily'); // Default to daily for custom
      setDateRange('custom');
    } else {
      setChartType(value);
      // Auto set date range based on chart type
      if (value === 'daily') {
        setDateRange('today');
      } else if (value === 'weekly') {
        setDateRange('week');
      } else if (value === 'monthly') {
        setDateRange('month');
      }
      setCustomDate({ start: '', end: '' });
    }
  };

  // Get current filter value
  const getFilterValue = () => {
    if (dateRange === 'custom') {
      return 'custom';
    }
    // Map dateRange to filter value
    if (dateRange === 'today') {
      return 'daily';
    } else if (dateRange === 'week') {
      return 'weekly';
    } else if (dateRange === 'month') {
      return 'monthly';
    }
    return chartType;
  };

  const reportCategories = [
    {
      id: 'sales',
      title: 'Laporan Penjualan',
      icon: TrendingUp,
      color: 'text-green-600',
      reports: [
        {
          id: 'sales-summary',
          name: 'Ringkasan Penjualan',
          description: 'Total penjualan, transaksi, dan keuntungan',
        },
        {
          id: 'sales-detail',
          name: 'Detail Penjualan',
          description: 'Tabel data penjualan lengkap',
        },
        {
          id: 'sales-chart',
          name: 'Grafik Penjualan',
          description: 'Visualisasi penjualan berdasarkan tanggal',
        },
        {
          id: 'payment-types',
          name: 'Analisis Pembayaran',
          description: 'Analisis distribusi dan tren metode pembayaran',
        },
      ],
    },
    // Catatan: Laporan Produk dipindahkan dari sidebar ke konten utama
    {
      id: 'promo',
      title: 'Laporan Promo',
      icon: Percent,
      color: 'text-purple-600',
      reports: [
        {
          id: 'promo-usage',
          name: 'Penggunaan Promo',
          description: 'Analisis efektivitas promo dan diskon',
        },
      ],
    },
    {
      id: 'products',
      title: 'Laporan Produk',
      icon: Package,
      color: 'text-blue-600',
      reports: [
        {
          id: 'product-sales',
          name: 'Penjualan Produk',
          description: 'Analisis penjualan per produk',
        },
        {
          id: 'category-sales',
          name: 'Penjualan Kategori',
          description: 'Analisis penjualan per kategori',
        },
      ],
    },
    {
      id: 'cashier',
      title: 'Laporan Kasir',
      icon: CreditCard,
      color: 'text-orange-600',
      reports: [
        {
          id: 'cashier-performance',
          name: 'Performa Kasir',
          description: 'Laporan per kasir dan penjualan',
        },
        {
          id: 'cashier-closing',
          name: 'Tutup Kasir',
          description: 'Laporan tutup kasir harian',
        },
      ],
    },
    {
      id: 'customers',
      title: 'Laporan Pelanggan',
      icon: Users,
      color: 'text-pink-600',
      reports: [
        {
          id: 'customer-analysis',
          name: 'Analisis Pelanggan',
          description: 'Data pelanggan dan pembelian',
        },
      ],
    },
    {
      id: 'employees',
      title: 'Laporan Karyawan',
      icon: UserCheck,
      color: 'text-indigo-600',
      reports: [
        {
          id: 'attendance',
          name: 'Absensi',
          description: 'Laporan kehadiran karyawan',
        },
        {
          id: 'commission',
          name: 'Komisi',
          description: 'Perhitungan komisi karyawan',
        },
      ],
    },
    {
      id: 'inventory',
      title: 'Laporan Persediaan',
      icon: Package,
      color: 'text-cyan-600',
      reports: [
        {
          id: 'inventory-status',
          name: 'Status Persediaan',
          description: 'Status stok produk dan peringatan stok rendah',
        },
        {
          id: 'stock-movements',
          name: 'Pergerakan Stok',
          description: 'Riwayat pergerakan stok masuk dan keluar',
        },
      ],
    },
    {
      id: 'tax',
      title: 'Laporan Pajak',
      icon: FileText,
      color: 'text-red-600',
      reports: [
        {
          id: 'tax-report',
          name: 'Laporan Pajak',
          description: 'Perhitungan dan laporan pajak',
        },
      ],
    },
  ];

  const getCurrentReport = () => {
    for (const category of reportCategories) {
      const report = category.reports.find(r => r.id === selectedReport);
      if (report) return { ...report, category: category.title };
    }
    return null;
  };

  // Handle export
  const handleExport = async format => {
    setExportLoading(true);
    try {
      const params = {
        dateRange,
        customStart: customDate.start,
        customEnd: customDate.end,
      };

      // Use selectedReport instead of hardcoded 'sales'
      const reportType = selectedReport || 'sales';

      // For inventory-status, we need to get filter params from InventoryStatusReport
      // But since we can't access component state here, we'll let backend handle it
      // or we can pass additional params if needed

      await reportService.exportReport(reportType, format, params);
      toast.success(
        `Laporan berhasil diekspor dalam format ${format.toUpperCase()}`
      );
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting report:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Gagal mengekspor laporan';
      toast.error(errorMessage);
    } finally {
      setExportLoading(false);
    }
  };

  const renderReportContent = () => {
    const currentReport = getCurrentReport();
    if (!currentReport) {
      // Show message if no report selected
      return (
        <div className='text-center py-12'>
          <Package className='w-16 h-16 text-gray-400 mx-auto mb-4' />
          <h3 className='text-lg font-semibold text-gray-700 mb-2'>
            Pilih Laporan
          </h3>
          <p className='text-gray-500'>
            Pilih laporan dari sidebar untuk melihat data
          </p>
        </div>
      );
    }

    switch (selectedReport) {
      case 'sales-summary':
        return (
          <SalesSummaryReport
            chartType={chartType}
            dateRange={dateRange}
            customDate={customDate}
          />
        );
      case 'sales-detail':
        return (
          <SalesDetailReport
            refreshTrigger={refreshKey}
            dateRange={dateRange}
            customDate={customDate}
          />
        );
      case 'sales-chart':
        return (
          <SalesChartReport
            refreshTrigger={refreshKey}
            dateRange={dateRange}
            customDate={customDate}
            hideHeader={true}
          />
        );
      case 'payment-types':
        return (
          <PaymentTypeReport
            refreshTrigger={refreshKey}
            dateRange={dateRange}
            customDate={customDate}
          />
        );
      case 'product-sales':
        return (
          <ProductSalesReport dateRange={dateRange} customDate={customDate} />
        );
      case 'category-sales':
        return (
          <CategorySalesReport
            refreshTrigger={refreshKey}
            dateRange={dateRange}
            customDate={customDate}
          />
        );
      case 'promo-usage':
        return (
          <PromoUsageReport
            refreshTrigger={refreshKey}
            dateRange={dateRange}
            customDate={customDate}
          />
        );
      case 'cashier-performance':
        return (
          <CashierPerformancePage
            refreshTrigger={refreshKey}
            dateRange={dateRange}
            customDate={customDate}
          />
        );
      case 'cashier-closing':
        return (
          <CashierClosingPage
            refreshTrigger={refreshKey}
            dateRange={dateRange}
            customDate={customDate}
          />
        );
      case 'customer-analysis':
        return (
          <CustomerAnalysisReport
            refreshTrigger={refreshKey}
            dateRange={dateRange}
            customDate={customDate}
          />
        );
      case 'attendance':
        return (
          <AttendanceReport
            dateRange={dateRange}
            customDate={customDate}
            refreshTrigger={refreshKey}
          />
        );
      case 'commission':
        return (
          <CommissionReport
            dateRange={dateRange}
            customDate={customDate}
            refreshTrigger={refreshKey}
          />
        );
      case 'inventory-status':
        return (
          <InventoryStatusReport
            dateRange={dateRange}
            customDate={customDate}
            refreshTrigger={refreshKey}
          />
        );
      case 'stock-movements':
        return (
          <StockMovementsReport
            refreshTrigger={refreshKey}
            dateRange={dateRange}
            customDate={customDate}
          />
        );
      case 'tax-report':
        return (
          <TaxReport
            dateRange={dateRange}
            customDate={customDate}
            refreshTrigger={refreshKey}
          />
        );
      default:
        return <div>Laporan tidak ditemukan</div>;
    }
  };

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

  return (
    <div className='bg-gray-50 min-h-screen'>
      {/* Main Content only (internal report menu removed) */}
      <div>
        <div className='p-4 lg:p-6'>
          {/* Header - Improved Layout */}
          <Card className='mb-6 border-0 shadow-sm'>
            <CardContent className='p-6'>
              <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
                {/* Title Section */}
                <div className='flex-1'>
                  <h1 className='text-2xl lg:text-3xl font-bold text-gray-900 mb-2'>
                    {getCurrentReport()?.name || 'Pilih Laporan'}
                  </h1>
                  <p className='text-sm lg:text-base text-gray-600'>
                    {getCurrentReport()?.description ||
                      'Pilih laporan dari sidebar untuk melihat data'}
                  </p>
                </div>

                {/* Actions Section */}
                <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2'>
                  {/* Filter Section - Compact */}
                  <div className='flex items-center gap-1.5 bg-gray-50 rounded-md px-2 py-1 border border-gray-200'>
                    <Filter className='w-3.5 h-3.5 text-gray-500' />
                    <Label
                      htmlFor='filter-type'
                      className='text-xs font-medium text-gray-700 whitespace-nowrap'
                    >
                      Periode:
                    </Label>
                    <Select
                      value={dateRange || 'today'}
                      onValueChange={value => {
                        setDateRange(value);
                        if (value !== 'custom') {
                          setCustomDate({ start: '', end: '' });
                        }
                      }}
                    >
                      <SelectTrigger
                        id='filter-type'
                        className='h-8 w-[120px] bg-white border-gray-300 text-sm'
                      >
                        <SelectValue placeholder='Pilih periode' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='today'>Hari Ini</SelectItem>
                        <SelectItem value='yesterday'>Kemarin</SelectItem>
                        <SelectItem value='week'>Minggu Ini</SelectItem>
                        <SelectItem value='month'>Bulan Ini</SelectItem>
                        <SelectItem value='year'>Tahun Ini</SelectItem>
                        <SelectItem value='custom'>Custom</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Custom Date Range Input */}
                    {dateRange === 'custom' && (
                      <div className='flex items-center gap-1.5 ml-1'>
                        <Input
                          type='date'
                          value={customDate.start || ''}
                          max={
                            customDate.end ||
                            new Date().toISOString().split('T')[0]
                          }
                          onChange={e =>
                            setCustomDate({
                              ...customDate,
                              start: e.target.value,
                            })
                          }
                          className='h-8 w-[110px] bg-white border-gray-300 text-xs'
                          placeholder='Dari'
                        />
                        <span className='text-gray-400 text-xs'>-</span>
                        <Input
                          type='date'
                          value={customDate.end || ''}
                          min={customDate.start || ''}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={e =>
                            setCustomDate({
                              ...customDate,
                              end: e.target.value,
                            })
                          }
                          className='h-8 w-[110px] bg-white border-gray-300 text-xs'
                          placeholder='Sampai'
                        />
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className='flex items-center gap-2'>
                    {/* Refresh Button */}
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setRefreshKey(prev => prev + 1);
                        // ✅ FIX: Only show toast once for user action, not for each component refresh
                        toast.success('Memuat ulang data...', {
                          duration: 2000,
                          id: 'refresh-all-reports',
                        });
                      }}
                      title='Refresh data laporan'
                      className='h-8 border-gray-300 hover:bg-gray-50'
                    >
                      <RefreshCw className='w-4 h-4 mr-2' />
                      Refresh
                    </Button>

                    {/* Export Button */}
                    {selectedReport !== 'sales-summary' &&
                      selectedReport !== 'sales-chart' &&
                      selectedReport !== 'payment-types' &&
                      selectedReport !== 'promo-usage' && (
                        <div className='relative'>
                          <Button
                            size='sm'
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className='relative bg-blue-600 hover:bg-blue-700 text-white'
                            disabled={exportLoading}
                          >
                            {exportLoading ? (
                              <>
                                <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                                Exporting...
                              </>
                            ) : (
                              <>
                                <Download className='w-4 h-4 mr-2' />
                                Export
                              </>
                            )}
                          </Button>

                          {/* Export Dropdown Menu */}
                          {showExportMenu && (
                            <div className='absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden'>
                              <div className='py-1'>
                                <button
                                  className='w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                  onClick={() => handleExport('pdf')}
                                  disabled={exportLoading}
                                >
                                  <FileText className='w-4 h-4 mr-3 text-red-600' />
                                  Export PDF
                                </button>
                                <button
                                  className='w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                  onClick={() => handleExport('excel')}
                                  disabled={exportLoading}
                                >
                                  <Download className='w-4 h-4 mr-3 text-green-600' />
                                  Export Excel
                                </button>
                                <button
                                  className='w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                  onClick={() => handleExport('csv')}
                                  disabled={exportLoading}
                                >
                                  <FileText className='w-4 h-4 mr-3 text-blue-600' />
                                  Export CSV
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Close export menu when clicking outside */}
          {showExportMenu && (
            <div
              className='fixed inset-0 z-40'
              onClick={() => setShowExportMenu(false)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setShowExportMenu(false);
                }
              }}
              role='button'
              tabIndex={0}
              aria-label='Close export menu'
            ></div>
          )}

          {/* Report Content */}
          {renderReportContent()}
        </div>
      </div>
    </div>
  );
};

// Placeholder components for other reports

const ProductSalesReport = ({
  dateRange: initialDateRange = 'today',
  customDate: initialCustomDate = {},
}) => {
  const { currentOutlet } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('total_revenue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Build params for API calls
  const buildDateParams = () => {
    const params = { dateRange: initialDateRange };
    if (
      initialDateRange === 'custom' &&
      initialCustomDate.start &&
      initialCustomDate.end
    ) {
      params.customStart = initialCustomDate.start;
      params.customEnd = initialCustomDate.end;
      // Also send as start_date and end_date for backend compatibility
      params.start_date = initialCustomDate.start;
      params.end_date = initialCustomDate.end;
    }
    return params;
  };

  // Build query params
  const queryParams = {
    ...buildDateParams(),
    search: searchTerm,
    sortBy,
    sortOrder,
    page: currentPage,
    perPage: 10,
    outletId: currentOutlet?.id,
  };

  // Fetch product sales data using React Query
  const {
    data: productSalesData,
    isLoading: loadingProductSales,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.reports.productSales(queryParams),
    queryFn: () => reportService.getProductSales(queryParams),
    enabled:
      !!currentOutlet &&
      (initialDateRange !== 'custom' ||
        (initialCustomDate.start && initialCustomDate.end)),
    staleTime: 2 * 60 * 1000, // 2 menit - data tetap fresh
    gcTime: 10 * 60 * 1000, // 10 menit - cache time
    retry: 1,
    refetchOnMount: false, // Tidak refetch jika data fresh
    placeholderData: previousData => previousData, // Keep previous data during refetch
  });

  // Handle refresh without full page reload
  const handleRefresh = useCallback(
    (showToast = false) => {
      refetch();
      // Only show toast if explicitly requested (user action, not auto-refresh)
      if (showToast) {
        toast.success('Data sedang dimuat ulang...', { duration: 2000 });
      }
    },
    [refetch]
  );

  // Keyboard shortcut F5 untuk refresh
  useEffect(() => {
    const handleKeyPress = event => {
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
        handleRefresh(true); // Show toast for manual refresh
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  // Show error toast if query fails
  useEffect(() => {
    if (error) {
      console.error('Error fetching product sales data:', error);
      toast.error(
        error.message ||
          'Terjadi kesalahan saat mengambil data penjualan produk'
      );
    }
  }, [error]);

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleSearchChange = value => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleSortChange = field => {
    setSortBy(field);
    setCurrentPage(1);
  };

  return (
    <div className='space-y-6'>
      {/* Summary Cards */}
      {loadingProductSales && !productSalesData ? (
        <div className='grid gap-4 md:grid-cols-4'>
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
      ) : productSalesData?.data?.summary ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card className='bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-blue-700'>
                Total Produk
              </CardTitle>
              <Package className='h-5 w-5 text-blue-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-blue-800'>
                {productSalesData.data.summary.total_products}
              </div>
              <p className='text-xs text-blue-600 mt-1'>Produk terjual</p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-green-700'>
                Total Revenue
              </CardTitle>
              <DollarSign className='h-5 w-5 text-green-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-green-800'>
                {formatCurrency(
                  productSalesData.data.summary.total_revenue || 0
                )}
              </div>
              <p className='text-xs text-green-600 mt-1'>
                Subtotal produk (sebelum pajak)
              </p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-emerald-700'>
                Total Dibayar
              </CardTitle>
              <DollarSign className='h-5 w-5 text-emerald-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-emerald-800'>
                {formatCurrency(
                  productSalesData.data.summary.total_paid ||
                    productSalesData.data.summary.total_revenue ||
                    0
                )}
              </div>
              <p className='text-xs text-emerald-600 mt-1'>
                Total yang dibayar customer
              </p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-purple-700'>
                Total Quantity
              </CardTitle>
              <TrendingUp className='h-5 w-5 text-purple-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-purple-800'>
                {productSalesData.data.summary.total_quantity}
              </div>
              <p className='text-xs text-purple-600 mt-1'>Unit terjual</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Search and Sort Controls */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex flex-col sm:flex-row gap-4 items-center justify-between'>
            <div className='flex flex-wrap gap-2'>
              <div className='relative'>
                <Search className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Cari produk...'
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                  className='pl-9 w-64'
                />
              </div>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className='w-48'>
                  <SelectValue placeholder='Urutkan berdasarkan' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='total_revenue'>Revenue</SelectItem>
                  <SelectItem value='total_quantity'>Quantity</SelectItem>
                  <SelectItem value='product_name'>Nama Produk</SelectItem>
                  <SelectItem value='avg_price'>Harga Rata-rata</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className='w-36'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='desc'>Turun</SelectItem>
                  <SelectItem value='asc'>Naik</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Sales Table */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Package className='h-5 w-5' />
                Daftar Penjualan Produk
              </CardTitle>
              <CardDescription>
                Detail penjualan per produk dalam periode terpilih
              </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleRefresh}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
                />
                {isFetching ? 'Memuat...' : 'Refresh'}
              </Button>
              {isFetching && (
                <div className='flex items-center gap-2 text-sm text-gray-500'>
                  <span>Memuat data...</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingProductSales && !productSalesData?.data?.products ? (
            <div className='rounded-md border overflow-hidden'>
              <div className='bg-gray-50 border-b'>
                <div className='grid grid-cols-7 gap-4 p-4'>
                  <div className='h-4 w-12 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-32 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-24 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-20 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-28 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-32 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-24 bg-gray-200 rounded animate-pulse'></div>
                </div>
              </div>
              <div className='divide-y'>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div
                    key={i}
                    className='grid grid-cols-7 gap-4 p-4 items-center hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex items-center'>
                      <div className='h-6 w-12 bg-gray-200 rounded-full animate-pulse'></div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <div className='h-4 w-4 bg-gray-200 rounded animate-pulse'></div>
                      <div className='h-4 w-40 bg-gray-200 rounded animate-pulse'></div>
                    </div>
                    <div>
                      <div className='h-5 w-20 bg-gray-200 rounded-full animate-pulse'></div>
                    </div>
                    <div className='text-right'>
                      <div className='h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto'></div>
                    </div>
                    <div className='text-right'>
                      <div className='h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto'></div>
                    </div>
                    <div className='text-right'>
                      <div className='h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto'></div>
                    </div>
                    <div className='flex items-center justify-end gap-2'>
                      <div className='h-2.5 w-20 bg-gray-200 rounded-full animate-pulse'></div>
                      <div className='h-4 w-12 bg-gray-200 rounded animate-pulse'></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : productSalesData?.data?.products?.length > 0 ? (
            <>
              <div className='rounded-md border overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-gray-50'>
                      <TableHead className='w-16'>Rank</TableHead>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className='text-right'>Quantity</TableHead>
                      <TableHead className='text-right'>Revenue</TableHead>
                      <TableHead className='text-right'>
                        Harga Rata-rata
                      </TableHead>
                      <TableHead className='text-right'>% dari Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSalesData.data.products.map((product, index) => (
                      <TableRow
                        key={product.product_id}
                        className='hover:bg-gray-50 transition-colors'
                      >
                        <TableCell>
                          <Badge
                            variant={index < 3 ? 'default' : 'secondary'}
                            className={
                              index === 0
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : index === 1
                                ? 'bg-gray-400 hover:bg-gray-500'
                                : index === 2
                                ? 'bg-orange-500 hover:bg-orange-600'
                                : ''
                            }
                          >
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            <Package className='h-4 w-4 text-muted-foreground' />
                            {product.product_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline' className='font-normal'>
                            {product.category_name || 'Tanpa Kategori'}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right font-medium'>
                          {product.total_quantity.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className='text-right font-semibold text-green-600'>
                          {formatCurrency(product.total_revenue)}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatCurrency(product.avg_price)}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center justify-end gap-2'>
                            <div className='w-20 bg-gray-200 rounded-full h-2.5'>
                              <div
                                className={`h-2.5 rounded-full transition-all ${
                                  index < 3 ? 'bg-primary' : 'bg-gray-400'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    product.revenue_percentage || 0,
                                    100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                            <span className='text-sm font-medium text-muted-foreground w-12 text-right'>
                              {(product.revenue_percentage || 0).toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {(productSalesData.data.pagination?.last_page ||
                productSalesData.data.last_page) > 1 && (
                <div className='flex items-center justify-between mt-6 pt-4 border-t'>
                  <div className='text-sm text-muted-foreground'>
                    Menampilkan{' '}
                    {productSalesData.data.pagination?.from ||
                      productSalesData.data.from ||
                      0}{' '}
                    sampai{' '}
                    {productSalesData.data.pagination?.to ||
                      productSalesData.data.to ||
                      0}{' '}
                    dari{' '}
                    {productSalesData.data.pagination?.total ||
                      productSalesData.data.total ||
                      0}{' '}
                    produk
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className='h-4 w-4 mr-1' />
                      Sebelumnya
                    </Button>
                    <span className='text-sm px-3'>
                      Halaman {currentPage} dari{' '}
                      {productSalesData.data.pagination?.last_page ||
                        productSalesData.data.last_page}
                    </span>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={
                        currentPage ===
                        (productSalesData.data.pagination?.last_page ||
                          productSalesData.data.last_page)
                      }
                    >
                      Selanjutnya
                      <ChevronRight className='h-4 w-4 ml-1' />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className='text-center py-8 text-muted-foreground'>
              <Package className='w-12 h-12 mx-auto mb-2 opacity-50' />
              <p>Tidak ada data penjualan produk</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const CategorySalesReport = ({
  dateRange: initialDateRange = 'today',
  customDate: initialCustomDate = {},
  refreshTrigger = 0,
}) => {
  const { currentOutlet } = useAuth();
  const [sortBy, setSortBy] = useState('total_revenue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // Build params for API calls
  const buildDateParams = useCallback(() => {
    const params = { dateRange: initialDateRange };
    if (
      initialDateRange === 'custom' &&
      initialCustomDate.start &&
      initialCustomDate.end
    ) {
      params.customStart = initialCustomDate.start;
      params.customEnd = initialCustomDate.end;
      // Also send as start_date and end_date for backend compatibility
      params.start_date = initialCustomDate.start;
      params.end_date = initialCustomDate.end;
    }
    return params;
  }, [initialDateRange, initialCustomDate.start, initialCustomDate.end]);

  // Prepare query params
  const queryParams = useMemo(
    () => ({
      outletId: currentOutlet?.id,
      dateRange: initialDateRange,
      customStart: initialCustomDate.start,
      customEnd: initialCustomDate.end,
      sortBy,
      sortOrder,
      page: currentPage,
    }),
    [
      currentOutlet?.id,
      initialDateRange,
      initialCustomDate.start,
      initialCustomDate.end,
      sortBy,
      sortOrder,
      currentPage,
    ]
  );

  // Fetch category sales data with React Query
  const {
    data: categorySalesData,
    isLoading: loadingCategorySales,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.reports.categorySales(queryParams),
    queryFn: async () => {
      const result = await reportService.getCategorySales({
        ...buildDateParams(),
        sortBy,
        sortOrder,
        page: currentPage,
        perPage: 10,
      });

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch category sales');
      }

      return result;
    },
    enabled:
      !!currentOutlet &&
      (initialDateRange !== 'custom' ||
        (initialCustomDate.start && initialCustomDate.end)),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  });

  // Handle refresh with React Query refetch
  const handleRefresh = useCallback(
    async (showToast = true) => {
      if (refreshing || loadingCategorySales || isFetching) {
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
        console.error('Error refreshing category sales data:', error);
        // Only show error toast for user-initiated actions
        if (showToast) {
          toast.error('Gagal memuat ulang data', { duration: 3000 });
        }
      } finally {
        setRefreshing(false);
      }
    },
    [refetch, refreshing, loadingCategorySales, isFetching]
  );

  // Keyboard shortcut F5 untuk refresh tanpa full page reload
  useKeyboardRefresh(() => {
    if (!refreshing && !loadingCategorySales && !isFetching) {
      handleRefresh(true); // Show toast for manual refresh
    }
  });

  // Handle refreshTrigger prop (for compatibility with parent component)
  // ✅ FIX: Use refetch directly instead of handleRefresh to avoid toast spam
  useEffect(() => {
    if (
      refreshTrigger > 0 &&
      !refreshing &&
      !loadingCategorySales &&
      !isFetching
    ) {
      // Use refetch directly without toast (silent refresh)
      refetch().catch(err => {
        console.error('Error refetching category sales:', err);
      });
    }
  }, [refreshTrigger, refetch, refreshing, loadingCategorySales, isFetching]);

  // Handle error
  useEffect(() => {
    if (error) {
      console.error('Error fetching category sales data:', error);
      toast.error(error.message || 'Gagal mengambil data laporan kategori');
    }
  }, [error]);

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleSortChange = field => {
    setSortBy(field);
    setCurrentPage(1);
  };

  return (
    <div className='space-y-6'>
      {/* Summary Cards */}
      {loadingCategorySales && !categorySalesData ? (
        <div className='grid gap-4 md:grid-cols-4'>
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
      ) : categorySalesData?.data?.summary ? (
        <div className='grid gap-4 md:grid-cols-4'>
          <Card className='bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-blue-700'>
                Total Kategori
              </CardTitle>
              <Package className='h-5 w-5 text-blue-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-blue-800'>
                {categorySalesData.data.summary.total_categories}
              </div>
              <p className='text-xs text-blue-600 mt-1'>Kategori aktif</p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-green-700'>
                Total Revenue
              </CardTitle>
              <DollarSign className='h-5 w-5 text-green-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-green-800'>
                {formatCurrency(categorySalesData.data.summary.total_revenue)}
              </div>
              <p className='text-xs text-green-600 mt-1'>Dari semua kategori</p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-purple-700'>
                Total Produk
              </CardTitle>
              <TrendingUp className='h-5 w-5 text-purple-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-purple-800'>
                {categorySalesData.data.summary.total_products}
              </div>
              <p className='text-xs text-purple-600 mt-1'>Produk terjual</p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-orange-700'>
                Rata-rata per Kategori
              </CardTitle>
              <Target className='h-5 w-5 text-orange-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-orange-800'>
                {formatCurrency(
                  categorySalesData.data.summary.avg_revenue_per_category
                )}
              </div>
              <p className='text-xs text-orange-600 mt-1'>Revenue rata-rata</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Sort Controls */}
      <Card>
        <CardContent className='p-4'>
          {loadingCategorySales ? (
            <div className='flex gap-2'>
              <div className='h-10 w-48 bg-gray-200 rounded animate-pulse'></div>
              <div className='h-10 w-36 bg-gray-200 rounded animate-pulse'></div>
            </div>
          ) : (
            <div className='flex flex-col sm:flex-row gap-4 items-center justify-between'>
              <div className='flex flex-wrap gap-2'>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className='w-48'>
                    <SelectValue placeholder='Urutkan berdasarkan' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='total_revenue'>Revenue</SelectItem>
                    <SelectItem value='total_products'>
                      Jumlah Produk
                    </SelectItem>
                    <SelectItem value='category_name'>Nama Kategori</SelectItem>
                    <SelectItem value='avg_price'>Harga Rata-rata</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className='w-36'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='desc'>Turun</SelectItem>
                    <SelectItem value='asc'>Naik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Package className='h-5 w-5' />
            Daftar Penjualan Kategori
          </CardTitle>
          <CardDescription>
            Detail penjualan per kategori dalam periode terpilih
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCategorySales ? (
            <div className='rounded-md border overflow-hidden'>
              <div className='bg-gray-50 border-b'>
                <div className='grid grid-cols-7 gap-4 p-4'>
                  <div className='h-4 w-12 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-32 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-24 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-20 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-28 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-32 bg-gray-200 rounded animate-pulse'></div>
                  <div className='h-4 w-24 bg-gray-200 rounded animate-pulse'></div>
                </div>
              </div>
              <div className='divide-y'>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div
                    key={i}
                    className='grid grid-cols-7 gap-4 p-4 items-center hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex items-center'>
                      <div className='h-6 w-12 bg-gray-200 rounded-full animate-pulse'></div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <div className='h-4 w-40 bg-gray-200 rounded animate-pulse'></div>
                    </div>
                    <div>
                      <div className='h-5 w-20 bg-gray-200 rounded-full animate-pulse'></div>
                    </div>
                    <div className='text-right'>
                      <div className='h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto'></div>
                    </div>
                    <div className='text-right'>
                      <div className='h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto'></div>
                    </div>
                    <div className='text-right'>
                      <div className='h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto'></div>
                    </div>
                    <div className='flex items-center justify-end gap-2'>
                      <div className='h-2.5 w-20 bg-gray-200 rounded-full animate-pulse'></div>
                      <div className='h-4 w-12 bg-gray-200 rounded animate-pulse'></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : categorySalesData?.data?.categories?.length > 0 ? (
            <>
              <div className='rounded-md border overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-gray-50'>
                      <TableHead className='w-16'>Rank</TableHead>
                      <TableHead>Nama Kategori</TableHead>
                      <TableHead>Jumlah Produk</TableHead>
                      <TableHead className='text-right'>
                        Total Quantity
                      </TableHead>
                      <TableHead className='text-right'>Revenue</TableHead>
                      <TableHead className='text-right'>
                        Harga Rata-rata
                      </TableHead>
                      <TableHead className='text-right'>% dari Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorySalesData.data.categories.map(
                      (category, index) => (
                        <TableRow
                          key={category.category_id}
                          className='hover:bg-gray-50 transition-colors'
                        >
                          <TableCell>
                            <Badge
                              variant={index < 3 ? 'default' : 'secondary'}
                              className={
                                index === 0
                                  ? 'bg-yellow-500 hover:bg-yellow-600'
                                  : index === 1
                                  ? 'bg-gray-400 hover:bg-gray-500'
                                  : index === 2
                                  ? 'bg-orange-500 hover:bg-orange-600'
                                  : ''
                              }
                            >
                              #{index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell className='font-medium'>
                            <div className='flex items-center gap-2'>
                              <Package className='h-4 w-4 text-muted-foreground' />
                              {category.category_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant='outline' className='font-normal'>
                              {category.product_count} produk
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right font-medium'>
                            {category.total_quantity.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className='text-right font-semibold text-green-600'>
                            {formatCurrency(category.total_revenue)}
                          </TableCell>
                          <TableCell className='text-right'>
                            {formatCurrency(category.avg_price)}
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center justify-end gap-2'>
                              <div className='w-20 bg-gray-200 rounded-full h-2.5'>
                                <div
                                  className={`h-2.5 rounded-full transition-all ${
                                    index < 3 ? 'bg-primary' : 'bg-gray-400'
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      category.revenue_percentage || 0,
                                      100
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                              <span className='text-sm font-medium text-muted-foreground w-12 text-right'>
                                {(category.revenue_percentage || 0).toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {(categorySalesData.data.pagination?.last_page ||
                categorySalesData.data.last_page) > 1 && (
                <div className='flex items-center justify-between mt-6 pt-4 border-t'>
                  <div className='text-sm text-muted-foreground'>
                    Menampilkan{' '}
                    {categorySalesData.data.pagination?.from ||
                      categorySalesData.data.from ||
                      0}{' '}
                    sampai{' '}
                    {categorySalesData.data.pagination?.to ||
                      categorySalesData.data.to ||
                      0}{' '}
                    dari{' '}
                    {categorySalesData.data.pagination?.total ||
                      categorySalesData.data.total ||
                      0}{' '}
                    kategori
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className='h-4 w-4 mr-1' />
                      Sebelumnya
                    </Button>
                    <span className='text-sm px-3'>
                      Halaman {currentPage} dari{' '}
                      {categorySalesData.data.pagination?.last_page ||
                        categorySalesData.data.last_page}
                    </span>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={
                        currentPage ===
                        (categorySalesData.data.pagination?.last_page ||
                          categorySalesData.data.last_page)
                      }
                    >
                      Selanjutnya
                      <ChevronRight className='h-4 w-4 ml-1' />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className='text-center py-8 text-muted-foreground'>
              <Package className='w-12 h-12 mx-auto mb-2 opacity-50' />
              <p>Tidak ada data penjualan kategori</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const CashierClosingReport = () => (
  <Card>
    <CardHeader>
      <CardTitle>Tutup Kasir</CardTitle>
      <CardDescription>Laporan tutup kasir harian</CardDescription>
    </CardHeader>
    <CardContent>
      <div className='text-center py-8'>
        <Clock className='w-12 h-12 text-gray-400 mx-auto mb-2' />
        <p className='text-gray-500'>
          Laporan tutup kasir akan ditampilkan di sini
        </p>
      </div>
    </CardContent>
  </Card>
);

const CustomerAnalysisReport = ({
  dateRange: initialDateRange = 'today',
  customDate: initialCustomDate = {},
  refreshTrigger = 0,
}) => {
  const { currentOutlet, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('total_spent');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productPreferencesPage, setProductPreferencesPage] = useState(1);
  const [customerListPage, setCustomerListPage] = useState(1);

  // Handle opening product modal
  const handleViewCustomerProducts = customerId => {
    setSelectedCustomerId(customerId);
    setShowProductModal(true);
  };

  // Reset pagination when changing tabs or searching
  const handleSearchChange = value => {
    setSearchTerm(value);
    setCustomerListPage(1);
  };

  const handleSortChange = field => {
    setSortBy(field);
    setCustomerListPage(1);
  };

  // Reset filters (only for internal filters, not date range)
  const handleReset = () => {
    setSearchTerm('');
    setSortBy('total_spent');
    setSortOrder('desc');
    setCustomerListPage(1);
  };

  // Build params for API calls
  const buildDateParams = useCallback(() => {
    const params = { date_range: initialDateRange };
    if (
      initialDateRange === 'custom' &&
      initialCustomDate.start &&
      initialCustomDate.end
    ) {
      params.custom_start = initialCustomDate.start;
      params.custom_end = initialCustomDate.end;
      // Also send as start_date and end_date for backend compatibility
      params.start_date = initialCustomDate.start;
      params.end_date = initialCustomDate.end;
    }
    return params;
  }, [initialDateRange, initialCustomDate.start, initialCustomDate.end]);

  // Prepare query params
  const queryParams = useMemo(
    () => ({
      ...buildDateParams(),
      outletId: currentOutlet?.id,
      refreshTrigger,
    }),
    [buildDateParams, currentOutlet?.id, refreshTrigger]
  );

  // ✅ REACT QUERY: Fetch customer analytics
  const {
    data: analyticsData,
    isLoading: loadingAnalytics,
    isFetching: isFetchingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: queryKeys.reports.customerAnalytics(queryParams),
    queryFn: async () => {
      const result = await customerReportService.getAnalytics(
        buildDateParams()
      );
      if (!result?.success) {
        throw new Error(
          result?.message || 'Failed to fetch customer analytics'
        );
      }
      return result;
    },
    enabled:
      !!currentOutlet &&
      (initialDateRange !== 'custom' ||
        (initialCustomDate.start && initialCustomDate.end)),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry cancelled errors
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (isCanceled) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    onError: error => {
      // Suppress CanceledError logging
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (!isCanceled) {
        console.error('Error fetching customer analytics:', error);
        toast.error('Gagal memuat data analisis pelanggan');
      }
    },
  });

  // ✅ REACT QUERY: Fetch top customers
  const {
    data: topCustomersData,
    isLoading: loadingTopCustomers,
    isFetching: isFetchingTopCustomers,
    refetch: refetchTopCustomers,
  } = useQuery({
    queryKey: queryKeys.reports.topCustomers({
      ...queryParams,
      limit: 10,
    }),
    queryFn: async () => {
      const result = await customerReportService.getTopCustomers({
        ...buildDateParams(),
        limit: 10,
      });
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch top customers');
      }
      return result;
    },
    enabled:
      !!currentOutlet &&
      (initialDateRange !== 'custom' ||
        (initialCustomDate.start && initialCustomDate.end)),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (isCanceled) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    onError: error => {
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (!isCanceled) {
        console.error('Error fetching top customers:', error);
      }
    },
  });

  // ✅ REACT QUERY: Fetch product preferences
  const {
    data: productPreferencesData,
    isLoading: loadingProductPreferences,
    isFetching: isFetchingProductPreferences,
    refetch: refetchProductPreferences,
  } = useQuery({
    queryKey: queryKeys.reports.productPreferences(queryParams),
    queryFn: async () => {
      const result = await customerReportService.getProductPreferences(
        buildDateParams()
      );
      if (!result?.success) {
        throw new Error(
          result?.message || 'Failed to fetch product preferences'
        );
      }
      return result;
    },
    enabled:
      !!currentOutlet &&
      (initialDateRange !== 'custom' ||
        (initialCustomDate.start && initialCustomDate.end)),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (isCanceled) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    onError: error => {
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (!isCanceled) {
        console.error('Error fetching product preferences:', error);
      }
    },
  });

  // ✅ REACT QUERY: Fetch customer product history
  const {
    data: customerProductHistory,
    isLoading: loadingCustomerProductHistory,
    isFetching: isFetchingCustomerProductHistory,
    refetch: refetchCustomerProductHistory,
  } = useQuery({
    queryKey: queryKeys.reports.customerProductHistory(
      selectedCustomerId,
      queryParams
    ),
    queryFn: async () => {
      const result = await customerReportService.getCustomerProductHistory(
        selectedCustomerId,
        buildDateParams()
      );
      if (!result?.success) {
        throw new Error(
          result?.message || 'Failed to fetch customer product history'
        );
      }
      return result;
    },
    enabled:
      !!selectedCustomerId &&
      !!currentOutlet &&
      (initialDateRange !== 'custom' ||
        (initialCustomDate.start && initialCustomDate.end)),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (isCanceled) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    placeholderData: previousData => previousData,
  });

  // ✅ REACT QUERY: Fetch customer demographics
  const {
    data: demographicsData,
    isLoading: loadingDemographics,
    isFetching: isFetchingDemographics,
    refetch: refetchDemographics,
  } = useQuery({
    queryKey: queryKeys.reports.customerDemographics(currentOutlet?.id),
    queryFn: async () => {
      const result = await customerReportService.getDemographics();
      if (!result?.success) {
        throw new Error(
          result?.message || 'Failed to fetch customer demographics'
        );
      }
      return result;
    },
    enabled: !!currentOutlet,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (isCanceled) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    onError: error => {
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (!isCanceled) {
        console.error('Error fetching customer demographics:', error);
      }
    },
  });

  // ✅ REACT QUERY: Fetch customer list
  const {
    data: customerListData,
    isLoading: loadingCustomerList,
    isFetching: isFetchingCustomerList,
    refetch: refetchCustomerList,
  } = useQuery({
    queryKey: queryKeys.reports.customerList({
      page: customerListPage,
      search: searchTerm,
      sort_by: sortBy,
      sort_order: sortOrder,
      outletId: currentOutlet?.id,
      refreshTrigger,
    }),
    queryFn: async () => {
      const result = await customerReportService.getCustomerList({
        page: customerListPage,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 5,
      });
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch customer list');
      }
      return result;
    },
    enabled: !!currentOutlet,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (isCanceled) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    onError: error => {
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (!isCanceled) {
        console.error('Error fetching customer list:', error);
      }
    },
  });

  // Handle refresh without full page reload
  const handleRefresh = useCallback(
    (showToast = false) => {
      refetchAnalytics();
      refetchTopCustomers();
      refetchProductPreferences();
      refetchDemographics();
      refetchCustomerList();
      if (selectedCustomerId) {
        refetchCustomerProductHistory();
      }
      // Only show toast if explicitly requested (user action, not auto-refresh)
      if (showToast) {
        toast.success('Data sedang dimuat ulang...', { duration: 2000 });
      }
    },
    [
      refetchAnalytics,
      refetchTopCustomers,
      refetchProductPreferences,
      refetchDemographics,
      refetchCustomerList,
      refetchCustomerProductHistory,
      selectedCustomerId,
    ]
  );

  // Keyboard shortcut F5 untuk refresh
  useEffect(() => {
    const handleKeyPress = event => {
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
        handleRefresh(true); // Show toast for manual refresh
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  // Trigger refetch when refreshTrigger changes (silent, no toast)
  useEffect(() => {
    if (refreshTrigger > 0) {
      // Use handleRefresh without toast to avoid spam
      handleRefresh(false);
    }
  }, [refreshTrigger, handleRefresh]);

  const handleExport = async () => {
    try {
      await customerReportService.exportCustomers({
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = dateString => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDateRangeLabel = range => {
    if (
      range === 'custom' &&
      initialCustomDate.start &&
      initialCustomDate.end
    ) {
      const start = new Date(initialCustomDate.start).toLocaleDateString(
        'id-ID',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }
      );
      const end = new Date(initialCustomDate.end).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return `${start} - ${end}`;
    }
    const labels = {
      today: 'Hari Ini',
      daily: 'Hari Ini',
      week: '7 Hari Terakhir',
      weekly: '7 Hari Terakhir',
      month: '30 Hari Terakhir',
      monthly: '30 Hari Terakhir',
      quarter: '3 Bulan Terakhir',
      year: '1 Tahun Terakhir',
    };
    return labels[range] || range;
  };

  return (
    <div className='space-y-6'>
      {/* Analytics Cards */}
      {loadingAnalytics ? (
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
      ) : analyticsData?.success ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card className='bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-blue-700'>
                Total Pelanggan
              </CardTitle>
              <Users className='h-5 w-5 text-blue-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-blue-800'>
                {analyticsData.data.total_customers}
              </div>
              <p className='text-xs text-blue-600 mt-1'>
                Semua pelanggan terdaftar
              </p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-green-700'>
                Pelanggan Aktif
              </CardTitle>
              <TrendingUp className='h-5 w-5 text-green-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-green-800'>
                {analyticsData.data.active_customers}
              </div>
              <p className='text-xs text-green-600 mt-1'>
                {getDateRangeLabel(initialDateRange)}
              </p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-purple-700'>
                Pelanggan Baru
              </CardTitle>
              <UserPlus className='h-5 w-5 text-purple-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-purple-800'>
                {analyticsData.data.new_customers}
              </div>
              <p className='text-xs text-purple-600 mt-1'>
                {getDateRangeLabel(initialDateRange)}
              </p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-orange-700'>
                Retention Rate
              </CardTitle>
              <Repeat className='h-5 w-5 text-orange-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-orange-800'>
                {analyticsData.data.retention_rate}%
              </div>
              <p className='text-xs text-orange-600 mt-1'>
                Pelanggan yang kembali
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue='overview' className='space-y-4'>
        <div className='flex items-center justify-between'>
          <TabsList>
            <TabsTrigger value='overview'>Ringkasan</TabsTrigger>
            <TabsTrigger value='top-customers'>Pelanggan Teratas</TabsTrigger>
            <TabsTrigger value='demographics'>Demografi</TabsTrigger>
            <TabsTrigger value='product-preferences'>
              Preferensi Produk
            </TabsTrigger>
            <TabsTrigger value='customer-list'>Daftar Pelanggan</TabsTrigger>
          </TabsList>
          <div className='flex items-center gap-2'>
            <Button
              onClick={handleRefresh}
              variant='outline'
              size='sm'
              disabled={
                isFetchingAnalytics ||
                isFetchingTopCustomers ||
                isFetchingProductPreferences ||
                isFetchingDemographics ||
                isFetchingCustomerList
              }
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  isFetchingAnalytics ||
                  isFetchingTopCustomers ||
                  isFetchingProductPreferences ||
                  isFetchingDemographics ||
                  isFetchingCustomerList
                    ? 'animate-spin'
                    : ''
                }`}
              />
              {isFetchingAnalytics ||
              isFetchingTopCustomers ||
              isFetchingProductPreferences ||
              isFetchingDemographics ||
              isFetchingCustomerList
                ? 'Memuat...'
                : 'Refresh'}
            </Button>
            {(isFetchingAnalytics ||
              isFetchingTopCustomers ||
              isFetchingProductPreferences ||
              isFetchingDemographics ||
              isFetchingCustomerList) && (
              <div className='flex items-center gap-2 text-sm text-gray-500'>
                <span>Memuat data...</span>
              </div>
            )}
          </div>
        </div>

        {/* Overview Tab */}
        <TabsContent value='overview' className='space-y-4'>
          {loadingAnalytics ? (
            <div className='grid gap-4 md:grid-cols-2'>
              <Card>
                <CardHeader>
                  <div className='h-5 w-32 bg-gray-200 rounded animate-pulse mb-2'></div>
                  <div className='h-4 w-48 bg-gray-200 rounded animate-pulse'></div>
                </CardHeader>
                <CardContent>
                  <div className='h-10 w-40 bg-gray-200 rounded animate-pulse'></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className='h-5 w-32 bg-gray-200 rounded animate-pulse mb-2'></div>
                  <div className='h-4 w-48 bg-gray-200 rounded animate-pulse'></div>
                </CardHeader>
                <CardContent>
                  <div className='h-10 w-40 bg-gray-200 rounded animate-pulse mb-2'></div>
                  <div className='h-4 w-32 bg-gray-200 rounded animate-pulse'></div>
                </CardContent>
              </Card>
            </div>
          ) : analyticsError ? (
            <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg'>
              <p className='font-semibold'>❌ Gagal memuat data</p>
              <p className='text-sm mt-1'>
                {analyticsError.response?.data?.message ||
                  analyticsError.message ||
                  'Terjadi kesalahan saat memuat data analisis'}
              </p>
            </div>
          ) : (
            <div className='grid gap-4 md:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Rata-rata Nilai Order</CardTitle>
                  <CardDescription>
                    Nilai rata-rata per order pelanggan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='text-3xl font-bold text-green-600'>
                    {analyticsData?.data?.avg_order_value
                      ? formatCurrency(analyticsData.data.avg_order_value)
                      : 'Rp 0'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pelanggan yang Kembali</CardTitle>
                  <CardDescription>
                    Pelanggan yang melakukan order berulang
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='text-3xl font-bold'>
                    {analyticsData?.data?.returning_customers || 0}
                  </div>
                  <p className='text-sm text-muted-foreground mt-2'>
                    {analyticsData?.data?.retention_rate || 0}% dari pelanggan
                    aktif
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Top Customers Tab */}
        <TabsContent value='top-customers' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Pelanggan Teratas Berdasarkan Pengeluaran</CardTitle>
              <CardDescription>
                {getDateRangeLabel(initialDateRange)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTopCustomers ? (
                <div className='rounded-md border overflow-hidden'>
                  <div className='bg-gray-50 border-b'>
                    <div className='grid grid-cols-7 gap-4 p-4'>
                      {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div
                          key={i}
                          className='h-4 bg-gray-200 rounded animate-pulse'
                        ></div>
                      ))}
                    </div>
                  </div>
                  <div className='divide-y'>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className='grid grid-cols-7 gap-4 p-4'>
                        {[1, 2, 3, 4, 5, 6, 7].map(j => (
                          <div
                            key={j}
                            className='h-4 bg-gray-200 rounded animate-pulse'
                          ></div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : topCustomersData?.data?.length > 0 ? (
                <div className='rounded-md border overflow-hidden'>
                  <Table>
                    <TableHeader>
                      <TableRow className='bg-gray-50'>
                        <TableHead>Rank</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className='text-right'>
                          Total Pengeluaran
                        </TableHead>
                        <TableHead className='text-right'>
                          Jumlah Order
                        </TableHead>
                        <TableHead className='text-right'>
                          Rata-rata Order
                        </TableHead>
                        <TableHead>Order Terakhir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCustomersData.data.map((customer, index) => (
                        <TableRow
                          key={customer.id}
                          className='hover:bg-gray-50 transition-colors'
                        >
                          <TableCell>
                            <Badge
                              variant={index < 3 ? 'default' : 'secondary'}
                              className={
                                index === 0
                                  ? 'bg-yellow-500 hover:bg-yellow-600'
                                  : index === 1
                                  ? 'bg-gray-400 hover:bg-gray-500'
                                  : index === 2
                                  ? 'bg-orange-500 hover:bg-orange-600'
                                  : ''
                              }
                            >
                              #{index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell className='font-medium'>
                            {customer.name}
                          </TableCell>
                          <TableCell>{customer.email || '-'}</TableCell>
                          <TableCell className='text-right font-semibold text-green-600'>
                            {formatCurrency(customer.total_spent)}
                          </TableCell>
                          <TableCell className='text-right font-medium'>
                            {customer.total_orders}
                          </TableCell>
                          <TableCell className='text-right'>
                            {formatCurrency(customer.avg_order_value)}
                          </TableCell>
                          <TableCell>
                            {formatDate(customer.last_order_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  Tidak ada data pelanggan
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value='demographics' className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Gender</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDemographics ? (
                  <div className='flex items-center justify-center h-32'>
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {Object.entries(
                      demographicsData?.data?.gender_distribution || {}
                    ).map(([gender, count]) => (
                      <div
                        key={gender}
                        className='flex items-center justify-between'
                      >
                        <span className='capitalize'>
                          {gender === 'male'
                            ? 'Laki-laki'
                            : gender === 'female'
                            ? 'Perempuan'
                            : gender}
                        </span>
                        <Badge variant='outline'>{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kelompok Usia</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDemographics ? (
                  <div className='flex items-center justify-center h-32'>
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {Object.entries(
                      demographicsData?.data?.age_groups || {}
                    ).map(([ageGroup, count]) => (
                      <div
                        key={ageGroup}
                        className='flex items-center justify-between'
                      >
                        <span>{ageGroup}</span>
                        <Badge variant='outline'>{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Product Preferences Tab */}
        <TabsContent value='product-preferences' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Produk Paling Populer</CardTitle>
              <CardDescription>
                Produk yang paling sering dipesan oleh pelanggan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProductPreferences ? (
                <div className='flex items-center justify-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                </div>
              ) : productPreferencesData?.data?.top_products ? (
                <div className='space-y-4'>
                  {productPreferencesData.data.top_products
                    .slice(
                      (productPreferencesPage - 1) * 5,
                      productPreferencesPage * 5
                    )
                    .map((product, index) => (
                      <div
                        key={product.product_id}
                        className='flex items-center justify-between p-4 border rounded-lg'
                      >
                        <div className='flex items-center gap-4'>
                          <div className='flex items-center justify-center w-8 h-8 bg-primary/10 text-primary font-semibold rounded-full'>
                            {(productPreferencesPage - 1) * 5 + index + 1}
                          </div>
                          <div>
                            <h4 className='font-medium'>
                              {product.product_name}
                            </h4>
                            <p className='text-sm text-muted-foreground'>
                              {product.unique_customers} pelanggan •{' '}
                              {product.total_orders} orders
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className='font-semibold'>
                            {product.total_quantity} pcs
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            Rp {product.total_revenue.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    ))}

                  {/* Pagination for Product Preferences */}
                  {productPreferencesData.data.top_products.length > 5 && (
                    <div className='flex items-center justify-between pt-4'>
                      <p className='text-sm text-muted-foreground'>
                        Menampilkan {(productPreferencesPage - 1) * 5 + 1} -{' '}
                        {Math.min(
                          productPreferencesPage * 5,
                          productPreferencesData.data.top_products.length
                        )}{' '}
                        dari {productPreferencesData.data.top_products.length}{' '}
                        produk
                      </p>
                      <div className='flex items-center gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setProductPreferencesPage(
                              productPreferencesPage - 1
                            )
                          }
                          disabled={productPreferencesPage === 1}
                        >
                          Sebelumnya
                        </Button>
                        <span className='text-sm text-muted-foreground'>
                          Halaman {productPreferencesPage} dari{' '}
                          {Math.ceil(
                            productPreferencesData.data.top_products.length / 5
                          )}
                        </span>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setProductPreferencesPage(
                              productPreferencesPage + 1
                            )
                          }
                          disabled={
                            productPreferencesPage >=
                            Math.ceil(
                              productPreferencesData.data.top_products.length /
                                5
                            )
                          }
                        >
                          Selanjutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  Tidak ada data produk
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Segments */}
          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Pelanggan Baru</CardTitle>
                <CardDescription>Produk favorit pelanggan baru</CardDescription>
              </CardHeader>
              <CardContent>
                {productPreferencesData?.data?.customer_segments?.new_customers
                  ?.length > 0 ? (
                  <div className='space-y-2'>
                    {productPreferencesData.data.customer_segments.new_customers
                      .slice(0, 3)
                      .map((product, index) => (
                        <div
                          key={product.product_id}
                          className='flex items-center justify-between text-sm'
                        >
                          <span className='truncate'>
                            {product.product_name}
                          </span>
                          <span className='font-medium'>
                            {product.total_quantity}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    Tidak ada data
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Pelanggan Setia</CardTitle>
                <CardDescription>
                  Produk favorit pelanggan setia
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productPreferencesData?.data?.customer_segments
                  ?.frequent_customers?.length > 0 ? (
                  <div className='space-y-2'>
                    {productPreferencesData.data.customer_segments.frequent_customers
                      .slice(0, 3)
                      .map(product => (
                        <div
                          key={product.product_id}
                          className='flex items-center justify-between text-sm'
                        >
                          <span className='truncate'>
                            {product.product_name}
                          </span>
                          <span className='font-medium'>
                            {product.total_quantity}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    Tidak ada data
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Pelanggan VIP</CardTitle>
                <CardDescription>Produk favorit pelanggan VIP</CardDescription>
              </CardHeader>
              <CardContent>
                {productPreferencesData?.data?.customer_segments
                  ?.high_value_customers?.length > 0 ? (
                  <div className='space-y-2'>
                    {productPreferencesData.data.customer_segments.high_value_customers
                      .slice(0, 3)
                      .map(product => (
                        <div
                          key={product.product_id}
                          className='flex items-center justify-between text-sm'
                        >
                          <span className='truncate'>
                            {product.product_name}
                          </span>
                          <span className='font-medium'>
                            {product.total_quantity}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    Tidak ada data
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customer List Tab */}
        <TabsContent value='customer-list' className='space-y-4'>
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Daftar Pelanggan</CardTitle>
                  <CardDescription>Semua pelanggan terdaftar</CardDescription>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='relative'>
                    <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                    <Input
                      placeholder='Cari pelanggan...'
                      value={searchTerm}
                      onChange={e => handleSearchChange(e.target.value)}
                      className='pl-8 w-64'
                    />
                  </div>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className='w-40'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='total_spent'>
                        Total Pengeluaran
                      </SelectItem>
                      <SelectItem value='total_visits'>
                        Jumlah Kunjungan
                      </SelectItem>
                      <SelectItem value='name'>Nama</SelectItem>
                      <SelectItem value='created_at'>Tanggal Daftar</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className='w-32'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='desc'>Desc</SelectItem>
                      <SelectItem value='asc'>Asc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCustomerList ? (
                <div className='flex items-center justify-center h-32'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telepon</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Total Pengeluaran</TableHead>
                        <TableHead>Jumlah Kunjungan</TableHead>
                        <TableHead>Rata-rata Order</TableHead>
                        <TableHead>Order Terakhir</TableHead>
                        <TableHead>Tanggal Daftar</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerListData?.data?.data?.map(customer => (
                        <TableRow key={customer.id}>
                          <TableCell className='font-medium'>
                            {customer.name}
                          </TableCell>
                          <TableCell>{customer.email || '-'}</TableCell>
                          <TableCell>{customer.phone || '-'}</TableCell>
                          <TableCell>
                            {customer.gender ? (
                              <Badge variant='outline' className='capitalize'>
                                {customer.gender === 'male'
                                  ? 'Laki-laki'
                                  : 'Perempuan'}
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(customer.total_spent)}
                          </TableCell>
                          <TableCell>{customer.total_visits}</TableCell>
                          <TableCell>
                            {formatCurrency(customer.avg_order_value)}
                          </TableCell>
                          <TableCell>
                            {formatDate(customer.last_order_at)}
                          </TableCell>
                          <TableCell>
                            {formatDate(customer.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() =>
                                handleViewCustomerProducts(customer.id)
                              }
                              className='h-8 w-8 p-0'
                            >
                              <Eye className='h-4 w-4' />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {customerListData?.data?.last_page > 1 && (
                    <div className='flex items-center justify-between mt-4'>
                      <div className='text-sm text-muted-foreground'>
                        Menampilkan {customerListData.data.from || 0} sampai{' '}
                        {customerListData.data.to || 0} dari{' '}
                        {customerListData.data.total || 0} pelanggan
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setCustomerListPage(customerListPage - 1)
                          }
                          disabled={customerListPage === 1}
                        >
                          Sebelumnya
                        </Button>
                        <span className='text-sm'>
                          Halaman {customerListPage} dari{' '}
                          {customerListData.data.last_page}
                        </span>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setCustomerListPage(customerListPage + 1)
                          }
                          disabled={
                            customerListPage === customerListData.data.last_page
                          }
                        >
                          Selanjutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customer Product History Modal */}
      {showProductModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          {/* Overlay */}
          <div
            className='fixed inset-0 bg-black/80'
            onClick={() => setShowProductModal(false)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setShowProductModal(false);
              }
            }}
            role='button'
            tabIndex={0}
            aria-label='Close modal'
          />

          {/* Modal Content */}
          <div className='relative z-50 w-full max-w-4xl max-h-[80vh] mx-4 bg-white rounded-lg shadow-lg overflow-hidden'>
            {/* Header */}
            <div className='flex items-center justify-between p-6 border-b'>
              <div>
                <h2 className='text-lg font-semibold'>
                  Detail Produk yang Dibeli
                </h2>
                <p className='text-sm text-muted-foreground'>
                  {customerProductHistory?.data?.customer_summary
                    ?.customer_name && (
                    <>
                      Produk yang pernah dibeli oleh{' '}
                      <span className='font-semibold'>
                        {
                          customerProductHistory.data.customer_summary
                            .customer_name
                        }
                      </span>
                    </>
                  )}
                </p>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowProductModal(false)}
                className='h-8 w-8 p-0'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>

            {/* Content */}
            <div className='p-6 overflow-y-auto max-h-[calc(80vh-120px)]'>
              {loadingCustomerProductHistory ? (
                <div className='flex items-center justify-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                </div>
              ) : customerProductHistory?.data?.product_history ? (
                <div className='space-y-4'>
                  {/* Customer Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='text-lg'>
                        Ringkasan Pelanggan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                        <div className='text-center'>
                          <p className='text-2xl font-bold text-primary'>
                            {
                              customerProductHistory.data.customer_summary
                                .total_products_purchased
                            }
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            Produk Dibeli
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className='text-2xl font-bold text-primary'>
                            {
                              customerProductHistory.data.customer_summary
                                .total_quantity
                            }
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            Total Quantity
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className='text-2xl font-bold text-primary'>
                            Rp{' '}
                            {customerProductHistory.data.customer_summary.total_spent.toLocaleString(
                              'id-ID'
                            )}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            Total Pengeluaran
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className='text-2xl font-bold text-primary'>
                            {
                              customerProductHistory.data.customer_summary
                                .total_orders
                            }
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            Total Orders
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Product List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Daftar Produk</CardTitle>
                      <CardDescription>
                        Produk yang pernah dibeli dengan detail jumlah dan
                        pengeluaran
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        {customerProductHistory.data.product_history.map(
                          (product, index) => (
                            <div
                              key={product.product_id}
                              className='flex items-center justify-between p-4 border rounded-lg'
                            >
                              <div className='flex items-center gap-4'>
                                <div className='flex items-center justify-center w-8 h-8 bg-primary/10 text-primary font-semibold rounded-full'>
                                  {index + 1}
                                </div>
                                <div>
                                  <h4 className='font-medium'>
                                    {product.product_name}
                                  </h4>
                                  {product.variant_name && (
                                    <p className='text-sm text-muted-foreground'>
                                      Variant: {product.variant_name}
                                    </p>
                                  )}
                                  <p className='text-sm text-muted-foreground'>
                                    Dibeli {product.order_count} kali
                                  </p>
                                </div>
                              </div>
                              <div className='text-right'>
                                <p className='font-semibold'>
                                  {product.total_quantity} pcs
                                </p>
                                <p className='text-sm text-muted-foreground'>
                                  Rp{' '}
                                  {product.total_spent.toLocaleString('id-ID')}
                                </p>
                                <p className='text-xs text-muted-foreground'>
                                  Rata-rata: {product.avg_quantity_per_order}{' '}
                                  pcs/order
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  Tidak ada data produk untuk pelanggan ini
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AttendanceReport = ({ dateRange, customDate, refreshTrigger = 0 }) => {
  const { currentBusiness, currentOutlet } = useAuth();
  const [showAllEmployees, setShowAllEmployees] = useState(false); // ✅ NEW: State untuk show all employees

  // Helper to get date range
  const getDateParams = useCallback(() => {
    if (dateRange === 'custom' && customDate?.start && customDate?.end) {
      return {
        start_date: customDate.start,
        end_date: customDate.end,
      };
    }

    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        );
        break;
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        startDate = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate()
        );
        endDate = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          23,
          59,
          59
        );
        break;
      }
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
    }

    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
  }, [dateRange, customDate]);

  // Prepare query params
  const queryParams = useMemo(() => {
    const dateParams = getDateParams();
    return {
      ...dateParams,
      businessId: currentBusiness?.id,
      refreshTrigger,
      employee_limit: showAllEmployees ? 'all' : 10, // ✅ NEW: Add employee limit parameter
    };
  }, [getDateParams, currentBusiness?.id, refreshTrigger, showAllEmployees]);

  // ✅ REACT QUERY: Fetch attendance report data
  const {
    data: attendanceResponse,
    isLoading: loadingData,
    isFetching: isFetchingData,
    error: attendanceError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.attendance.report(queryParams),
    queryFn: async () => {
      const params = getDateParams();
      // ✅ NEW: Add employee_limit to params
      const result = await attendanceService.getReport({
        ...params,
        employee_limit: showAllEmployees ? 'all' : 10,
      });
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch attendance report');
      }
      return result;
    },
    enabled: !!currentBusiness?.id, // ✅ Only fetch when business is selected
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry cancelled errors
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (isCanceled) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    onError: error => {
      // Suppress CanceledError logging
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (!isCanceled) {
        console.error('Error fetching attendance report:', error);
        toast.error('Gagal memuat data absensi');
      }
    },
  });

  // Handle refresh without full page reload
  const handleRefresh = useCallback(
    (showToast = false) => {
      refetch();
      // Only show toast if explicitly requested (user action, not auto-refresh)
      if (showToast) {
        toast.success('Data sedang dimuat ulang...', { duration: 2000 });
      }
    },
    [refetch]
  );

  // Keyboard shortcut F5 untuk refresh
  useEffect(() => {
    const handleKeyPress = event => {
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
        handleRefresh(true); // Show toast for manual refresh
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  // Trigger refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Extract report data from response
  const reportData = attendanceResponse?.data;

  if (loadingData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laporan Absensi</CardTitle>
          <CardDescription>Laporan kehadiran karyawan</CardDescription>
        </CardHeader>
        <CardContent className='py-12'>
          <div className='flex items-center justify-center'>
            <RefreshCw className='w-8 h-8 animate-spin text-blue-600' />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (attendanceError && !attendanceError?.name?.includes('Canceled')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laporan Absensi</CardTitle>
          <CardDescription>Laporan kehadiran karyawan</CardDescription>
        </CardHeader>
        <CardContent className='py-12'>
          <div className='text-center'>
            <AlertCircle className='w-12 h-12 text-red-400 mx-auto mb-2' />
            <p className='text-red-500 mb-4'>
              {attendanceError?.message || 'Gagal memuat data absensi'}
            </p>
            <Button
              onClick={handleRefresh}
              variant='outline'
              disabled={isFetchingData}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  isFetchingData ? 'animate-spin' : ''
                }`}
              />
              Coba Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reportData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laporan Absensi</CardTitle>
          <CardDescription>Laporan kehadiran karyawan</CardDescription>
        </CardHeader>
        <CardContent className='py-12'>
          <div className='text-center'>
            <Clock className='w-12 h-12 text-gray-400 mx-auto mb-2' />
            <p className='text-gray-500'>Tidak ada data absensi</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { stats, daily_trends, status_distribution, employee_performance } =
    reportData;

  return (
    <div className='space-y-6'>
      {/* Statistics Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Total Shift</p>
                <p className='text-2xl font-bold text-gray-900'>
                  {stats.total_shifts || 0}
                </p>
              </div>
              <Calendar className='w-8 h-8 text-blue-600' />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Selesai</p>
                <p className='text-2xl font-bold text-green-600'>
                  {stats.completed || 0}
                </p>
              </div>
              <CheckCircle className='w-8 h-8 text-green-600' />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Terlambat</p>
                <p className='text-2xl font-bold text-yellow-600'>
                  {stats.late || 0}
                </p>
              </div>
              <AlertCircle className='w-8 h-8 text-yellow-600' />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Tidak Hadir</p>
                <p className='text-2xl font-bold text-red-600'>
                  {stats.absent || 0}
                </p>
              </div>
              <X className='w-8 h-8 text-red-600' />
            </div>
          </CardContent>
        </Card>
        {/* ✅ NEW: Total Jam Kehadiran */}
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Total Jam Kehadiran</p>
                <p className='text-2xl font-bold text-purple-600'>
                  {stats.total_working_hours 
                    ? (() => {
                        const hours = Math.floor(stats.total_working_hours);
                        const minutes = Math.round((stats.total_working_hours - hours) * 60);
                        if (minutes === 0) {
                          return `${hours} jam`;
                        } else if (hours === 0) {
                          return `${minutes} menit`;
                        } else {
                          return `${hours}j ${minutes}m`;
                        }
                      })()
                    : '0 jam'}
                </p>
                {stats.total_working_hours && stats.total_working_hours > 0 && (
                  <p className='text-xs text-gray-500 mt-1'>
                    {stats.total_working_hours.toFixed(2)} jam
                  </p>
                )}
              </div>
              <Clock className='w-8 h-8 text-purple-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Daily Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tren Harian</CardTitle>
            <CardDescription>Grafik kehadiran harian</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <AreaChart data={daily_trends || []}>
                <defs>
                  <linearGradient
                    id='colorCompleted'
                    x1='0'
                    y1='0'
                    x2='0'
                    y2='1'
                  >
                    <stop offset='5%' stopColor='#10b981' stopOpacity={0.8} />
                    <stop offset='95%' stopColor='#10b981' stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id='colorLate' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#f59e0b' stopOpacity={0.8} />
                    <stop offset='95%' stopColor='#f59e0b' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='label' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type='monotone'
                  dataKey='completed'
                  stackId='1'
                  stroke='#10b981'
                  fillOpacity={1}
                  fill='url(#colorCompleted)'
                  name='Selesai'
                />
                <Area
                  type='monotone'
                  dataKey='late'
                  stackId='1'
                  stroke='#f59e0b'
                  fillOpacity={1}
                  fill='url(#colorLate)'
                  name='Terlambat'
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Status</CardTitle>
            <CardDescription>Persentase status absensi</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <PieChart>
                <Pie
                  data={status_distribution || []}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill='#8884d8'
                  dataKey='value'
                >
                  {(status_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Employee Performance Table */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Performa Karyawan</CardTitle>
              <CardDescription>
                {showAllEmployees 
                  ? 'Semua karyawan berdasarkan kehadiran'
                  : 'Top 10 karyawan berdasarkan kehadiran'}
              </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                onClick={() => setShowAllEmployees(!showAllEmployees)}
                variant='outline'
                size='sm'
                disabled={isFetchingData}
              >
                {showAllEmployees ? (
                  <>
                    <Users className='w-4 h-4 mr-2' />
                    Tampilkan Top 10
                  </>
                ) : (
                  <>
                    <Users className='w-4 h-4 mr-2' />
                    Tampilkan Semua
                  </>
                )}
              </Button>
              <Button
                onClick={handleRefresh}
                variant='outline'
                size='sm'
                disabled={isFetchingData}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    isFetchingData ? 'animate-spin' : ''
                  }`}
                />
                {isFetchingData ? 'Memuat...' : 'Refresh'}
              </Button>
              {isFetchingData && (
                <div className='flex items-center gap-2 text-sm text-gray-500'>
                  <span>Memuat data...</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {employee_performance && employee_performance.length > 0 ? (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Karyawan</TableHead>
                    <TableHead>Total Shift</TableHead>
                    <TableHead>Selesai</TableHead>
                    <TableHead>Terlambat</TableHead>
                    <TableHead>Tidak Hadir</TableHead>
                    <TableHead>Total Jam Kehadiran</TableHead>
                    <TableHead>Rate Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee_performance.map(emp => (
                    <TableRow key={emp.user_id}>
                      <TableCell className='font-medium'>
                        {emp.user_name}
                      </TableCell>
                      <TableCell>{emp.total_shifts}</TableCell>
                      <TableCell>
                        <Badge className='bg-green-100 text-green-800'>
                          {emp.completed}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className='bg-yellow-100 text-yellow-800'>
                          {emp.late}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className='bg-red-100 text-red-800'>
                          {emp.absent}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {emp.total_working_hours 
                          ? (() => {
                              const hours = Math.floor(emp.total_working_hours);
                              const minutes = Math.round((emp.total_working_hours - hours) * 60);
                              if (minutes === 0) {
                                return `${hours} jam`;
                              } else if (hours === 0) {
                                return `${minutes} menit`;
                              } else {
                                return `${hours}j ${minutes}m`;
                              }
                            })()
                          : '0 jam'}
                        <span className='text-xs text-gray-500 ml-2'>
                          ({emp.total_working_hours?.toFixed(2) || '0.00'} jam)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            emp.attendance_rate >= 80
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {emp.attendance_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className='text-center py-8'>
              <Users className='w-12 h-12 text-gray-400 mx-auto mb-2' />
              <p className='text-gray-500'>Tidak ada data performa karyawan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const CommissionReport = ({ dateRange, customDate, refreshTrigger = 0 }) => {
  const { currentOutlet } = useAuth();

  // Prepare query params
  const queryParams = useMemo(
    () => ({
      outletId: currentOutlet?.id,
      dateRange,
      customStart: customDate?.start,
      customEnd: customDate?.end,
    }),
    [currentOutlet?.id, dateRange, customDate?.start, customDate?.end]
  );

  // ✅ REACT QUERY: Fetch commission data
  const {
    data: commissionResponse,
    isLoading: loadingData,
    isFetching: isFetchingData,
    error: commissionError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.reports.commission({ ...queryParams, refreshTrigger }),
    queryFn: async () => {
      const result = await reportService.getCommissionReport({
        dateRange,
        customStart: customDate?.start,
        customEnd: customDate?.end,
      });
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch commission report');
      }
      return result;
    },
    enabled: !!currentOutlet,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry cancelled errors
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (isCanceled) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    onError: error => {
      // Suppress CanceledError logging
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (!isCanceled) {
        console.error('Error fetching commission report:', error);
        toast.error('Gagal memuat data komisi');
      }
    },
  });

  // Handle refresh without full page reload
  const handleRefresh = useCallback(
    (showToast = false) => {
      refetch();
      // Only show toast if explicitly requested (user action, not auto-refresh)
      if (showToast) {
        toast.success('Data sedang dimuat ulang...', { duration: 2000 });
      }
    },
    [refetch]
  );

  // Keyboard shortcut F5 untuk refresh
  useEffect(() => {
    const handleKeyPress = event => {
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
        handleRefresh(true); // Show toast for manual refresh
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  // Trigger refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Extract commission data from response
  const commissionData = commissionResponse?.data;

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatPercent = value => {
    return `${parseFloat(value || 0).toFixed(2)}%`;
  };

  if (loadingData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laporan Komisi</CardTitle>
          <CardDescription>Perhitungan komisi karyawan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8'>
            <RefreshCw className='w-12 h-12 text-gray-400 mx-auto mb-2 animate-spin' />
            <p className='text-gray-500'>Memuat data komisi...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (commissionError && !commissionError?.name?.includes('Canceled')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laporan Komisi</CardTitle>
          <CardDescription>Perhitungan komisi karyawan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8'>
            <AlertCircle className='w-12 h-12 text-red-400 mx-auto mb-2' />
            <p className='text-red-500 mb-4'>
              {commissionError?.message || 'Gagal memuat data komisi'}
            </p>
            <Button
              onClick={handleRefresh}
              variant='outline'
              disabled={isFetchingData}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  isFetchingData ? 'animate-spin' : ''
                }`}
              />
              Coba Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (
    !commissionData ||
    !commissionData.commission_data ||
    commissionData.commission_data.length === 0
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laporan Komisi</CardTitle>
          <CardDescription>Perhitungan komisi karyawan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8'>
            <DollarSign className='w-12 h-12 text-gray-400 mx-auto mb-2' />
            <p className='text-gray-500'>
              Tidak ada data komisi untuk periode ini
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { commission_data, summary } = commissionData;

  return (
    <div className='space-y-6'>
      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Total Karyawan
                </p>
                <p className='text-2xl font-bold text-gray-900'>
                  {summary.total_employees}
                </p>
              </div>
              <Users className='w-8 h-8 text-blue-600' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Total Order</p>
                <p className='text-2xl font-bold text-gray-900'>
                  {summary.total_orders}
                </p>
              </div>
              <FileText className='w-8 h-8 text-green-600' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Total Penjualan
                </p>
                <p className='text-2xl font-bold text-gray-900'>
                  {formatCurrency(summary.total_sales)}
                </p>
              </div>
              <DollarSign className='w-8 h-8 text-green-600' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Total Komisi
                </p>
                <p className='text-2xl font-bold text-red-600'>
                  {formatCurrency(summary.total_commission)}
                </p>
                <p className='text-xs text-gray-500 mt-1'>
                  Rata-rata: {formatPercent(summary.average_commission_rate)}
                </p>
              </div>
              <Percent className='w-8 h-8 text-red-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Table */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Detail Komisi Karyawan</CardTitle>
              <CardDescription>
                Periode: {commissionData.date_range?.start} -{' '}
                {commissionData.date_range?.end}
              </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                onClick={handleRefresh}
                variant='outline'
                size='sm'
                disabled={isFetchingData}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    isFetchingData ? 'animate-spin' : ''
                  }`}
                />
                {isFetchingData ? 'Memuat...' : 'Refresh'}
              </Button>
              {isFetchingData && (
                <div className='flex items-center gap-2 text-sm text-gray-500'>
                  <span>Memuat data...</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className='text-right'>Tingkat Komisi</TableHead>
                  <TableHead className='text-right'>Total Order</TableHead>
                  <TableHead className='text-right'>Total Penjualan</TableHead>
                  <TableHead className='text-right'>Total Komisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commission_data.map((item, index) => (
                  <TableRow key={item.employee_id || index}>
                    <TableCell className='font-medium'>
                      {item.employee_code}
                    </TableCell>
                    <TableCell>{item.employee_name}</TableCell>
                    <TableCell className='text-gray-600'>
                      {item.employee_email}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Badge variant='outline'>
                        {formatPercent(item.commission_rate)}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      {item.total_orders}
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {formatCurrency(item.total_sales)}
                    </TableCell>
                    <TableCell className='text-right font-bold text-red-600'>
                      {formatCurrency(item.total_commission)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary Footer */}
          <div className='mt-6 pt-6 border-t'>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
              <div className='text-center md:text-left'>
                <p className='text-sm text-gray-600'>Total Karyawan</p>
                <p className='text-lg font-semibold'>
                  {summary.total_employees}
                </p>
              </div>
              <div className='text-center md:text-left'>
                <p className='text-sm text-gray-600'>Total Order</p>
                <p className='text-lg font-semibold'>{summary.total_orders}</p>
              </div>
              <div className='text-center md:text-left'>
                <p className='text-sm text-gray-600'>Total Penjualan</p>
                <p className='text-lg font-semibold'>
                  {formatCurrency(summary.total_sales)}
                </p>
              </div>
              <div className='text-center md:text-left'>
                <p className='text-sm text-gray-600'>Total Komisi</p>
                <p className='text-lg font-semibold text-red-600'>
                  {formatCurrency(summary.total_commission)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const InventoryStatusReport = ({
  dateRange: _dateRange,
  customDate: _customDate,
  refreshTrigger = 0,
}) => {
  const { currentOutlet } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState([]);

  // Prepare query params
  const queryParams = useMemo(
    () => ({
      outletId: currentOutlet?.id,
      search: searchTerm,
      categoryId,
      stockStatus,
      sortBy,
      sortOrder,
      page: currentPage,
      perPage: 10,
    }),
    [
      currentOutlet?.id,
      searchTerm,
      categoryId,
      stockStatus,
      sortBy,
      sortOrder,
      currentPage,
    ]
  );

  // ✅ REACT QUERY: Fetch inventory status data
  const {
    data: inventoryData,
    isLoading: loadingInventory,
    isFetching: isFetchingInventory,
    error: inventoryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.reports.inventoryStatus({
      ...queryParams,
      refreshTrigger,
    }),
    queryFn: async () => {
      const result = await reportService.getInventoryStatus({
        search: searchTerm,
        categoryId,
        stockStatus,
        sortBy,
        sortOrder,
        page: currentPage,
        perPage: 10,
      });
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch inventory status');
      }
      return result;
    },
    enabled: !!currentOutlet,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry cancelled errors
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (isCanceled) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    onError: error => {
      // Suppress CanceledError logging
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (!isCanceled) {
        console.error('Error fetching inventory status:', error);
        toast.error('Gagal memuat data status persediaan');
      }
    },
  });

  // Handle refresh without full page reload
  const handleRefresh = useCallback(
    (showToast = false) => {
      refetch();
      // Only show toast if explicitly requested (user action, not auto-refresh)
      if (showToast) {
        toast.success('Data sedang dimuat ulang...', { duration: 2000 });
      }
    },
    [refetch]
  );

  // Keyboard shortcut F5 untuk refresh
  useEffect(() => {
    const handleKeyPress = event => {
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
        handleRefresh(true); // Show toast for manual refresh
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  // Trigger refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.reports.inventoryCategories(currentOutlet?.id),
    queryFn: () => reportService.getInventoryCategories(),
    enabled: !!currentOutlet,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (categoriesData?.data) {
      setCategories(categoriesData.data);
    }
  }, [categoriesData]);

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleSearchChange = value => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (field, value) => {
    if (field === 'category') setCategoryId(value);
    if (field === 'stock_status') setStockStatus(value);
    if (field === 'sort_by') setSortBy(value);
    if (field === 'sort_order') setSortOrder(value);
    setCurrentPage(1);
  };

  const getStockStatusBadge = (status, color) => {
    const colors = {
      red: 'bg-red-100 text-red-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
    };
    return (
      <Badge className={colors[color] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  // Debug logging
  useEffect(() => {
    console.log('InventoryStatusReport Debug:', {
      hasInventoryData: !!inventoryData,
      hasData: !!inventoryData?.data,
      hasSummary: !!inventoryData?.data?.summary,
      hasProducts: !!inventoryData?.data?.products,
      productsCount: inventoryData?.data?.products?.length || 0,
      loading: loadingInventory,
      currentOutlet: currentOutlet?.id,
    });
  }, [inventoryData, loadingInventory, currentOutlet]);

  return (
    <div className='space-y-6'>
      {/* Summary Cards */}
      {loadingInventory ? (
        <div className='grid gap-4 md:grid-cols-4'>
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <div className='h-4 w-24 bg-gray-200 rounded animate-pulse'></div>
                <div className='h-5 w-5 bg-gray-200 rounded animate-pulse'></div>
              </CardHeader>
              <CardContent>
                <div className='h-8 w-32 bg-gray-200 rounded animate-pulse mb-2'></div>
                <div className='h-3 w-20 bg-gray-200 rounded animate-pulse'></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : inventoryData?.data?.summary !== undefined ? (
        <div className='grid gap-4 md:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Produk
              </CardTitle>
              <Package className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {inventoryData.data.summary.total_products}
              </div>
              <p className='text-xs text-muted-foreground'>Produk aktif</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Stok Rendah</CardTitle>
              <AlertCircle className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-yellow-600'>
                {inventoryData.data.summary.low_stock_count}
              </div>
              <p className='text-xs text-muted-foreground'>Perlu restock</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Habis Stok</CardTitle>
              <X className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-red-600'>
                {inventoryData.data.summary.out_of_stock_count}
              </div>
              <p className='text-xs text-muted-foreground'>Tidak tersedia</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Nilai Inventori
              </CardTitle>
              <DollarSign className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {formatCurrency(
                  inventoryData.data.summary.total_inventory_value || 0
                )}
              </div>
              <p className='text-xs text-muted-foreground'>Total nilai stok</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Produk
              </CardTitle>
              <Package className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>0</div>
              <p className='text-xs text-muted-foreground'>Produk aktif</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Stok Rendah</CardTitle>
              <AlertCircle className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-yellow-600'>0</div>
              <p className='text-xs text-muted-foreground'>Perlu restock</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Habis Stok</CardTitle>
              <X className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-red-600'>0</div>
              <p className='text-xs text-muted-foreground'>Tidak tersedia</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Nilai Inventori
              </CardTitle>
              <DollarSign className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{formatCurrency(0)}</div>
              <p className='text-xs text-muted-foreground'>Total nilai stok</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex flex-col sm:flex-row gap-4 items-center justify-between'>
            <div className='flex gap-2'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Cari produk...'
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                  className='pl-8 w-64'
                />
              </div>
              <Select
                value={categoryId || 'all'}
                onValueChange={value =>
                  handleFilterChange('category', value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className='w-48'>
                  <SelectValue placeholder='Semua Kategori' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua Kategori</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={stockStatus}
                onValueChange={value =>
                  handleFilterChange('stock_status', value)
                }
              >
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua Status</SelectItem>
                  <SelectItem value='available'>Tersedia</SelectItem>
                  <SelectItem value='low'>Stok Rendah</SelectItem>
                  <SelectItem value='out'>Habis</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={value => handleFilterChange('sort_by', value)}
              >
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='name'>Nama Produk</SelectItem>
                  <SelectItem value='stock'>Stok</SelectItem>
                  <SelectItem value='min_stock'>Min Stok</SelectItem>
                  <SelectItem value='price'>Harga</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortOrder}
                onValueChange={value => handleFilterChange('sort_order', value)}
              >
                <SelectTrigger className='w-32'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='asc'>Asc</SelectItem>
                  <SelectItem value='desc'>Desc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Status Table */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Daftar Produk</CardTitle>
              <CardDescription>
                Detail status stok produk dalam sistem
              </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleRefresh}
                disabled={isFetchingInventory}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    isFetchingInventory ? 'animate-spin' : ''
                  }`}
                />
                {isFetchingInventory ? 'Memuat...' : 'Refresh'}
              </Button>
              {isFetchingInventory && (
                <div className='flex items-center gap-2 text-sm text-gray-500'>
                  <span>Memuat data...</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingInventory ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </div>
          ) : inventoryData?.data?.products &&
            inventoryData.data.products.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Stok Saat Ini</TableHead>
                    <TableHead>Min Stok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Nilai Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryData.data.products.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className='font-medium'>
                        {product.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{product.sku}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{product.category_name}</Badge>
                      </TableCell>
                      <TableCell className='font-semibold'>
                        {product.stock}
                      </TableCell>
                      <TableCell>{product.min_stock}</TableCell>
                      <TableCell>
                        {getStockStatusBadge(
                          product.stock_status_label,
                          product.stock_status_color
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell className='font-semibold'>
                        {formatCurrency(
                          product.stock_value ||
                            product.stock * (product.cost || product.price || 0)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {inventoryData.data.pagination.last_page > 1 && (
                <div className='flex items-center justify-between mt-4'>
                  <div className='text-sm text-muted-foreground'>
                    Menampilkan {inventoryData.data.pagination.from || 0} sampai{' '}
                    {inventoryData.data.pagination.to || 0} dari{' '}
                    {inventoryData.data.pagination.total || 0} produk
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Sebelumnya
                    </Button>
                    <span className='text-sm'>
                      Halaman {currentPage} dari{' '}
                      {inventoryData.data.pagination.last_page}
                    </span>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={
                        currentPage === inventoryData.data.pagination.last_page
                      }
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className='text-center py-8 text-muted-foreground'>
              <Package className='w-12 h-12 mx-auto mb-2 opacity-50' />
              <p>Tidak ada data persediaan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StockMovementsReport = ({
  dateRange: initialDateRange = 'this-month',
  customDate: initialCustomDate = {},
  refreshTrigger = 0,
}) => {
  const { currentOutlet } = useAuth();
  const [type, setType] = useState('all');
  const [reason, setReason] = useState('all');
  const [productId, setProductId] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState([]);

  // Build params for API calls
  const buildDateParams = useCallback(() => {
    const params = { dateRange: initialDateRange };
    if (
      initialDateRange === 'custom' &&
      initialCustomDate.start &&
      initialCustomDate.end
    ) {
      params.customStart = initialCustomDate.start;
      params.customEnd = initialCustomDate.end;
      // Also send as start_date and end_date for backend compatibility
      params.start_date = initialCustomDate.start;
      params.end_date = initialCustomDate.end;
    }
    return params;
  }, [initialDateRange, initialCustomDate.start, initialCustomDate.end]);

  // Prepare query params
  const queryParams = useMemo(
    () => ({
      ...buildDateParams(),
      type,
      reason,
      productId,
      sortBy,
      sortOrder,
      page: currentPage,
      perPage: 10,
      outletId: currentOutlet?.id,
    }),
    [
      buildDateParams,
      type,
      reason,
      productId,
      sortBy,
      sortOrder,
      currentPage,
      currentOutlet?.id,
    ]
  );

  // ✅ REACT QUERY: Fetch stock movements data
  const {
    data: movementsData,
    isLoading: loadingMovements,
    isFetching: isFetchingMovements,
    error: movementsError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.reports.stockMovements({
      ...queryParams,
      refreshTrigger,
    }),
    queryFn: async () => {
      const result = await reportService.getStockMovements(queryParams);
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch stock movements');
      }
      return result;
    },
    enabled:
      !!currentOutlet &&
      (initialDateRange !== 'custom' ||
        (initialCustomDate.start && initialCustomDate.end)),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry cancelled errors
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (isCanceled) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    onError: error => {
      // Suppress CanceledError logging
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (!isCanceled) {
        console.error('Error fetching stock movements:', error);
        toast.error('Gagal memuat data pergerakan stok');
      }
    },
  });

  // Handle refresh without full page reload
  const handleRefresh = useCallback(
    (showToast = false) => {
      refetch();
      // Only show toast if explicitly requested (user action, not auto-refresh)
      if (showToast) {
        toast.success('Data sedang dimuat ulang...', { duration: 2000 });
      }
    },
    [refetch]
  );

  // Keyboard shortcut F5 untuk refresh
  useEffect(() => {
    const handleKeyPress = event => {
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
        handleRefresh(true); // Show toast for manual refresh
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  // Trigger refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Fetch products for filter
  const { data: productsData } = useQuery({
    queryKey: ['inventory-products', currentOutlet?.id],
    queryFn: () => reportService.getInventoryProducts(),
    enabled: !!currentOutlet,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (productsData?.data) {
      setProducts(productsData.data);
    }
  }, [productsData]);

  const handleFilterChange = (field, value) => {
    if (field === 'type') setType(value);
    if (field === 'reason') setReason(value);
    if (field === 'product_id') setProductId(value);
    if (field === 'sort_by') setSortBy(value);
    if (field === 'sort_order') setSortOrder(value);
    setCurrentPage(1);
  };

  const getTypeBadge = (type, color) => {
    const colors = {
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      blue: 'bg-blue-100 text-blue-800',
    };
    return (
      <Badge className={colors[color] || 'bg-gray-100 text-gray-800'}>
        {type}
      </Badge>
    );
  };

  // Prepare chart data from movements
  const prepareChartData = () => {
    if (
      !movementsData?.data?.movements ||
      !Array.isArray(movementsData.data.movements)
    )
      return [];

    // Group by date
    const grouped = movementsData.data.movements.reduce((acc, movement) => {
      const dateObj = new Date(movement.created_at);
      const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD for sorting
      const dateLabel = dateObj.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
      });

      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateLabel, dateKey, masuk: 0, keluar: 0 };
      }

      // Handle different movement types
      if (movement.type === 'in' || movement.type === 'masuk') {
        // Stock masuk
        acc[dateKey].masuk += movement.quantity;
      } else if (movement.type === 'out' || movement.type === 'keluar') {
        // Stock keluar
        acc[dateKey].keluar += movement.quantity;
      } else if (movement.type === 'adjustment') {
        // Adjustment: jika stock_after > stock_before, berarti masuk, sebaliknya keluar
        const stockChange =
          (movement.stock_after || 0) - (movement.stock_before || 0);
        if (stockChange > 0) {
          acc[dateKey].masuk += Math.abs(stockChange);
        } else if (stockChange < 0) {
          acc[dateKey].keluar += Math.abs(stockChange);
        }
        // Jika stockChange === 0, tidak perlu ditambahkan ke grafik
      }

      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey)
    );
  };

  const chartData = prepareChartData();

  // Debug logging
  useEffect(() => {
    if (movementsData) {
      console.log('Stock Movements Data:', {
        hasData: !!movementsData,
        hasSummary: !!movementsData?.data?.summary,
        hasMovements: !!movementsData?.data?.movements,
        movementsCount: movementsData?.data?.movements?.length || 0,
        summary: movementsData?.data?.summary,
        loading: loadingMovements,
      });
    }
  }, [movementsData, loadingMovements]);

  return (
    <div className='space-y-6'>
      {/* Summary Cards */}
      {loadingMovements ? (
        <div className='grid gap-4 md:grid-cols-4'>
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
          <Card className='bg-gradient-to-br from-red-50 to-red-100 border-red-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <div className='h-4 w-24 bg-red-200 rounded animate-pulse'></div>
              <div className='h-5 w-5 bg-red-200 rounded animate-pulse'></div>
            </CardHeader>
            <CardContent>
              <div className='h-8 w-32 bg-red-200 rounded animate-pulse mb-2'></div>
              <div className='h-3 w-20 bg-red-200 rounded animate-pulse'></div>
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
        </div>
      ) : movementsData?.data?.summary ? (
        <div className='grid gap-4 md:grid-cols-4'>
          <Card className='bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-blue-700'>
                Total Pergerakan
              </CardTitle>
              <TrendingUp className='h-5 w-5 text-blue-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-blue-800'>
                {movementsData.data.summary.total_movements}
              </div>
              <p className='text-xs text-blue-600 mt-1'>Transaksi stok</p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-green-700'>
                Stok Masuk
              </CardTitle>
              <TrendingUp className='h-5 w-5 text-green-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-green-800'>
                {movementsData.data.summary.total_in}
              </div>
              <p className='text-xs text-green-600 mt-1'>Unit masuk</p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-red-50 to-red-100 border-red-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-red-700'>
                Stok Keluar
              </CardTitle>
              <TrendingDown className='h-5 w-5 text-red-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-red-800'>
                {movementsData.data.summary.total_out}
              </div>
              <p className='text-xs text-red-600 mt-1'>Unit keluar</p>
            </CardContent>
          </Card>

          <Card className='bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-purple-700'>
                Produk Terpengaruh
              </CardTitle>
              <Package className='h-5 w-5 text-purple-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-purple-800'>
                {movementsData.data.summary.products_affected}
              </div>
              <p className='text-xs text-purple-600 mt-1'>Produk berbeda</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Grafik Pergerakan Stok</CardTitle>
            <CardDescription>
              Tren stok masuk dan keluar berdasarkan tanggal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='h-[400px] w-full'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id='colorMasuk' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#10b981' stopOpacity={0.8} />
                      <stop offset='95%' stopColor='#10b981' stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id='colorKeluar'
                      x1='0'
                      y1='0'
                      x2='0'
                      y2='1'
                    >
                      <stop offset='5%' stopColor='#ef4444' stopOpacity={0.8} />
                      <stop offset='95%' stopColor='#ef4444' stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    className='stroke-gray-200'
                  />
                  <XAxis
                    dataKey='date'
                    className='text-xs'
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis
                    className='text-xs'
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={value => {
                      if (value >= 1000) {
                        return `${(value / 1000).toFixed(1)}k`;
                      }
                      return value.toString();
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value, name) => {
                      return [value.toLocaleString('id-ID'), name];
                    }}
                    labelFormatter={label => `Tanggal: ${label}`}
                  />
                  <Area
                    type='monotone'
                    dataKey='masuk'
                    stroke='#10b981'
                    fillOpacity={1}
                    fill='url(#colorMasuk)'
                    name='Stok Masuk'
                  />
                  <Area
                    type='monotone'
                    dataKey='keluar'
                    stroke='#ef4444'
                    fillOpacity={1}
                    fill='url(#colorKeluar)'
                    name='Stok Keluar'
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex flex-col sm:flex-row gap-4 items-center justify-between'>
            <div className='flex gap-2'>
              <Select
                value={type}
                onValueChange={value => handleFilterChange('type', value)}
              >
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua Tipe</SelectItem>
                  <SelectItem value='in'>Masuk</SelectItem>
                  <SelectItem value='out'>Keluar</SelectItem>
                  <SelectItem value='adjustment'>Penyesuaian</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={reason}
                onValueChange={value => handleFilterChange('reason', value)}
              >
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua Alasan</SelectItem>
                  <SelectItem value='purchase'>Pembelian</SelectItem>
                  <SelectItem value='sale'>Penjualan</SelectItem>
                  <SelectItem value='waste'>Pembuangan</SelectItem>
                  <SelectItem value='adjustment'>Penyesuaian</SelectItem>
                  <SelectItem value='transfer'>Transfer</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={productId || 'all'}
                onValueChange={value =>
                  handleFilterChange('product_id', value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className='w-48'>
                  <SelectValue placeholder='Semua Produk' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua Produk</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={value => handleFilterChange('sort_by', value)}
              >
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='created_at'>Tanggal</SelectItem>
                  <SelectItem value='quantity'>Quantity</SelectItem>
                  <SelectItem value='product_name'>Nama Produk</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortOrder}
                onValueChange={value => handleFilterChange('sort_order', value)}
              >
                <SelectTrigger className='w-32'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='desc'>Desc</SelectItem>
                  <SelectItem value='asc'>Asc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Movements Table */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Riwayat Pergerakan Stok</CardTitle>
              <CardDescription>
                Detail pergerakan stok dalam periode terpilih
              </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleRefresh}
                disabled={isFetchingMovements}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    isFetchingMovements ? 'animate-spin' : ''
                  }`}
                />
                {isFetchingMovements ? 'Memuat...' : 'Refresh'}
              </Button>
              {isFetchingMovements && (
                <div className='flex items-center gap-2 text-sm text-gray-500'>
                  <span>Memuat data...</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMovements && !movementsData ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </div>
          ) : movementsData?.data?.movements &&
            movementsData.data.movements.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Stok Sebelum</TableHead>
                    <TableHead>Stok Sesudah</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsData.data.movements.map(movement => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {new Date(movement.created_at).toLocaleDateString(
                          'id-ID'
                        )}
                      </TableCell>
                      <TableCell className='font-medium'>
                        {movement.product_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>
                          {movement.category_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(movement.type_label, movement.type_color)}
                      </TableCell>
                      <TableCell>{movement.reason_label}</TableCell>
                      <TableCell className='font-semibold'>
                        {movement.quantity}
                      </TableCell>
                      <TableCell>{movement.stock_before}</TableCell>
                      <TableCell className='font-semibold'>
                        {movement.stock_after}
                      </TableCell>
                      <TableCell className='text-sm text-muted-foreground'>
                        {movement.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {movementsData.data.pagination.last_page > 1 && (
                <div className='flex items-center justify-between mt-4'>
                  <div className='text-sm text-muted-foreground'>
                    Menampilkan {movementsData.data.pagination.from || 0} sampai{' '}
                    {movementsData.data.pagination.to || 0} dari{' '}
                    {movementsData.data.pagination.total || 0} pergerakan
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Sebelumnya
                    </Button>
                    <span className='text-sm'>
                      Halaman {currentPage} dari{' '}
                      {movementsData.data.pagination.last_page}
                    </span>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={
                        currentPage === movementsData.data.pagination.last_page
                      }
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className='text-center py-8 text-muted-foreground'>
              <TrendingUp className='w-12 h-12 mx-auto mb-2 opacity-50' />
              <p>Tidak ada data pergerakan stok</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const TaxReport = ({
  dateRange: initialDateRange = 'month',
  customDate: initialCustomDate = {},
  refreshTrigger = 0,
}) => {
  const { currentBusiness } = useAuth();

  // Build date params
  const buildDateParams = useCallback(() => {
    const params = {};
    if (
      initialDateRange === 'custom' &&
      initialCustomDate.start &&
      initialCustomDate.end
    ) {
      params.start_date = initialCustomDate.start;
      params.end_date = initialCustomDate.end;
    } else if (initialDateRange !== 'custom') {
      params.date_range = initialDateRange;
    }
    return params;
  }, [initialDateRange, initialCustomDate.start, initialCustomDate.end]);

  // Prepare query params
  const queryParams = useMemo(() => buildDateParams(), [buildDateParams]);

  // ✅ REACT QUERY: Fetch taxes data
  const {
    data: taxesData,
    isLoading: loading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.reports.taxReport({ ...queryParams, refreshTrigger }),
    queryFn: async () => {
      const result = await financeService.getTaxes(queryParams);
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch tax data');
      }
      return result.data || [];
    },
    enabled:
      !!currentBusiness &&
      (initialDateRange !== 'custom' ||
        (initialCustomDate.start && initialCustomDate.end)),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    retry: (failureCount, error) => {
      // Don't retry cancelled errors
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (isCanceled) {
        return false;
      }
      return failureCount < 1;
    },
    onError: error => {
      // Suppress CanceledError logging
      const isCanceled =
        error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (!isCanceled) {
        console.error('Error fetching tax report:', error);
        toast.error('Gagal memuat data pajak');
      }
    },
  });

  // Handle refresh without full page reload
  const handleRefresh = useCallback(
    (showToast = false) => {
      refetch();
      // Only show toast if explicitly requested (user action, not auto-refresh)
      if (showToast) {
        toast.success('Data sedang dimuat ulang...', { duration: 2000 });
      }
    },
    [refetch]
  );

  // Keyboard shortcut F5 untuk refresh
  useEffect(() => {
    const handleKeyPress = event => {
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
        handleRefresh(true); // Show toast for manual refresh
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  // Trigger refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Calculate stats from data
  const stats = useMemo(() => {
    if (!taxesData || !Array.isArray(taxesData)) {
      return {
        total: 0,
        pending: 0,
        paid: 0,
        overdue: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
      };
    }

    const total = taxesData.length;
    const pending = taxesData.filter(t => t.status === 'pending').length;
    const paid = taxesData.filter(t => t.status === 'paid').length;
    const overdue = taxesData.filter(t => t.status === 'overdue').length;
    const totalAmount = taxesData.reduce(
      (sum, t) => sum + (parseFloat(t.amount) || 0),
      0
    );
    const paidAmount = taxesData
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const pendingAmount = taxesData
      .filter(t => t.status === 'pending' || t.status === 'overdue')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    return {
      total,
      pending,
      paid,
      overdue,
      totalAmount,
      paidAmount,
      pendingAmount,
    };
  }, [taxesData]);

  const taxes = taxesData || [];

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = dateString => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = status => {
    const configs = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Belum Dibayar',
      },
      paid: { color: 'bg-green-100 text-green-800', label: 'Sudah Dibayar' },
      overdue: { color: 'bg-red-100 text-red-800', label: 'Terlambat' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Dibatalkan' },
    };
    const config = configs[status] || configs.pending;
    return (
      <Badge className={`${config.color} font-medium`}>{config.label}</Badge>
    );
  };

  const getDateRangeLabel = () => {
    if (
      initialDateRange === 'custom' &&
      initialCustomDate.start &&
      initialCustomDate.end
    ) {
      const start = formatDate(initialCustomDate.start);
      const end = formatDate(initialCustomDate.end);
      return `${start} - ${end}`;
    }
    const labels = {
      today: 'Hari Ini',
      week: '7 Hari Terakhir',
      month: 'Bulan Ini',
      year: 'Tahun Ini',
    };
    return labels[initialDateRange] || initialDateRange;
  };

  return (
    <div className='space-y-6'>
      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Total Pajak</p>
                <p className='text-2xl font-bold text-gray-900'>
                  {stats.total}
                </p>
              </div>
              <FileText className='w-8 h-8 text-blue-600' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Belum Dibayar</p>
                <p className='text-2xl font-bold text-yellow-600'>
                  {stats.pending}
                </p>
                <p className='text-xs text-gray-500'>
                  {formatCurrency(stats.pendingAmount)}
                </p>
              </div>
              <Clock className='w-8 h-8 text-yellow-600' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Sudah Dibayar</p>
                <p className='text-2xl font-bold text-green-600'>
                  {stats.paid}
                </p>
                <p className='text-xs text-gray-500'>
                  {formatCurrency(stats.paidAmount)}
                </p>
              </div>
              <CheckCircle className='w-8 h-8 text-green-600' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Total Jumlah</p>
                <p className='text-2xl font-bold text-red-600'>
                  {formatCurrency(stats.totalAmount)}
                </p>
                <p className='text-xs text-gray-500'>{getDateRangeLabel()}</p>
              </div>
              <DollarSign className='w-8 h-8 text-red-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax List */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Daftar Pajak</CardTitle>
              <CardDescription>Periode: {getDateRangeLabel()}</CardDescription>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
              />
              {isFetching ? 'Memuat...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && taxes.length === 0 ? (
            <div className='flex items-center justify-center py-12'>
              <RefreshCw className='w-8 h-8 animate-spin text-blue-600' />
            </div>
          ) : taxes.length === 0 ? (
            <div className='text-center py-12'>
              <FileText className='w-12 h-12 text-gray-400 mx-auto mb-2' />
              <p className='text-gray-500'>
                Tidak ada data pajak untuk periode ini
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis Pajak</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Dasar Pengenaan</TableHead>
                    <TableHead>Tarif</TableHead>
                    <TableHead>Jumlah Pajak</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxes.map(tax => (
                    <TableRow key={tax.id}>
                      <TableCell>
                        <div>
                          <p className='font-semibold'>{tax.type}</p>
                          {tax.description && (
                            <p className='text-sm text-gray-500'>
                              {tax.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{tax.period || '-'}</TableCell>
                      <TableCell>{formatCurrency(tax.base)}</TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className='bg-blue-50 text-blue-700'
                        >
                          {tax.rate}%
                        </Badge>
                      </TableCell>
                      <TableCell className='font-semibold text-red-600'>
                        {formatCurrency(tax.amount)}
                      </TableCell>
                      <TableCell>
                        {tax.due_date ? formatDate(tax.due_date) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(tax.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary by Type */}
      {taxes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan per Jenis Pajak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {Object.entries(
                taxes.reduce((acc, tax) => {
                  if (!acc[tax.type]) {
                    acc[tax.type] = {
                      count: 0,
                      totalAmount: 0,
                      paidAmount: 0,
                      pendingAmount: 0,
                    };
                  }
                  acc[tax.type].count++;
                  acc[tax.type].totalAmount += parseFloat(tax.amount) || 0;
                  if (tax.status === 'paid') {
                    acc[tax.type].paidAmount += parseFloat(tax.amount) || 0;
                  } else {
                    acc[tax.type].pendingAmount += parseFloat(tax.amount) || 0;
                  }
                  return acc;
                }, {})
              ).map(([type, summary]) => (
                <div
                  key={type}
                  className='flex items-center justify-between p-4 border rounded-lg'
                >
                  <div>
                    <p className='font-semibold'>{type}</p>
                    <p className='text-sm text-gray-500'>
                      {summary.count} pajak
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='font-semibold text-red-600'>
                      {formatCurrency(summary.totalAmount)}
                    </p>
                    <div className='flex gap-4 text-xs text-gray-500 mt-1'>
                      <span className='text-green-600'>
                        Dibayar: {formatCurrency(summary.paidAmount)}
                      </span>
                      <span className='text-yellow-600'>
                        Pending: {formatCurrency(summary.pendingAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
