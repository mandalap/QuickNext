import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Loader2, MessageCircle, Receipt, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { queryKeys } from '../../config/reactQuery';
import { useDebounce } from '../../hooks/useDebounce';
import reportService from '../../services/reportService';
import { salesService } from '../../services/salesService';
import whatsappService from '../../services/whatsapp.service';
import { retryWithBackoff } from '../../utils/performance/retry';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import SalesDetailReportSkeleton from './SalesDetailReportSkeleton';

const SalesDetailReport = ({
  dateRange = 'today',
  customDate = {},
  refreshTrigger = 0,
}) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [orderDetailModal, setOrderDetailModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(null);
  const [itemsPerPage] = useState(10);
  const [comparePrevious, setComparePrevious] = useState(false);
  const [previousSummary, setPreviousSummary] = useState(null);
  const [range, setRange] = useState(dateRange || 'today');
  const [custom, setCustom] = useState({
    start: customDate.start,
    end: customDate.end,
  });
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = 56; // px

  // ✅ OPTIMIZATION: Debounced filters untuk mengurangi API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedDateRange = useDebounce(range, 300);
  const debouncedCustomDate = useDebounce(custom, 300);

  // Sync from parent props
  useEffect(() => {
    setRange(dateRange || 'today');
    setCustom({ start: customDate.start, end: customDate.end });
  }, [dateRange, customDate.start, customDate.end]);

  // Compute previous period based on current selection
  const getPreviousRange = () => {
    if (range === 'custom' && custom.start && custom.end) {
      const start = new Date(custom.start);
      const end = new Date(custom.end);
      const diffDays = Math.max(
        1,
        Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
      );
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - (diffDays - 1));
      return {
        dateRange: 'custom',
        customStart: prevStart.toISOString().slice(0, 10),
        customEnd: prevEnd.toISOString().slice(0, 10),
      };
    }
    const map = {
      today: { dateRange: 'yesterday' },
      yesterday: { dateRange: '2-days-ago' },
      'last-7-days': {
        dateRange: 'custom',
        ...(() => {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 6);
          return {
            customStart: start.toISOString().slice(0, 10),
            customEnd: end.toISOString().slice(0, 10),
          };
        })(),
      },
      'this-month': { dateRange: 'last-month' },
      'last-month': { dateRange: '2-months-ago' },
      'this-year': { dateRange: 'last-year' },
    };
    return map[range] || { dateRange: 'last-month' };
  };

  const resolveApiRange = () => {
    if (range === 'custom' && custom.start && custom.end) {
      return {
        dateRange: 'custom',
        customStart: custom.start,
        customEnd: custom.end,
      };
    }
    if (range === 'last-7-days') {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);
      return {
        dateRange: 'custom',
        customStart: start.toISOString().slice(0, 10),
        customEnd: end.toISOString().slice(0, 10),
      };
    }
    return { dateRange: range };
  };

  // Helper function to normalize response data
  const normalizeResponseData = useCallback((response, params) => {
    if (!response || !response.success) {
      throw new Error(response?.message || 'Failed to fetch sales detail');
    }

    const payload = response.data ?? response;
    const ordersData = payload?.orders ?? {};

    // Laravel paginator structure: { data: [...], current_page, per_page, total, last_page }
    const transactionsRaw = Array.isArray(ordersData?.data)
      ? ordersData.data
      : Array.isArray(ordersData)
      ? ordersData
      : [];

    // Pagination from Laravel paginator
    const paginationRaw = {
      current_page: ordersData?.current_page ?? params.page ?? 1,
      per_page: ordersData?.per_page ?? params.perPage ?? 10,
      total: ordersData?.total ?? 0,
      last_page: ordersData?.last_page ?? 1,
    };

    // Map data according to backend structure
    const normalized = Array.isArray(transactionsRaw)
      ? transactionsRaw.map(tx => {
          const total = Number(tx.total) || 0;
          const discount = Number(tx.discount_amount) || 0;
          const tax = Number(tx.tax_amount) || 0;
          // ✅ FIX: Formula: total = subtotal + tax - discount
          // Jadi: subtotal = total - tax + discount
          const subtotal = total - tax + discount;

          return {
            id: tx.id ?? tx.order_number ?? '-',
            orderNumber: tx.order_number ?? tx.id ?? '-',
            date:
              tx.transaction_date ?? tx.created_at ?? new Date().toISOString(),
            customer: tx.customer_name ?? tx.customer?.name ?? 'Walk-in',
            items: Number(tx.items_count) || 0,
            subtotal: subtotal,
            discount: discount,
            tax: tax,
            total: total,
            paymentMethod: tx.payment_method ?? '-',
            status: tx.status ?? 'completed',
            cashier: tx.cashier_name ?? '-',
          };
        })
      : [];

    // Get summary from backend response
    const summaryRaw = payload?.summary ?? payload?.data?.summary ?? {};
    const computedSummary = {
      totalSales: Number(summaryRaw.total_sales) || 0,
      totalTransactions: Number(summaryRaw.total_transactions) || 0,
      totalDiscount: Number(summaryRaw.total_discount) || 0,
      totalTax: Number(summaryRaw.total_tax) || 0,
      netSales: Number(summaryRaw.net_sales) || 0,
    };

    return {
      salesData: normalized,
      summary: computedSummary,
      pagination: paginationRaw,
    };
  }, []);

  // ✅ REACT QUERY: Fetch sales detail data
  const baseRange = useMemo(
    () => resolveApiRange(),
    [debouncedDateRange, debouncedCustomDate]
  );

  const {
    data: reportData,
    isLoading: reportLoading,
    isFetching: reportFetching,
    error: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: queryKeys.sales.orders(
      {
        dateRange: baseRange.dateRange,
        customStart: baseRange.customStart,
        customEnd: baseRange.customEnd,
        page: currentPage,
        perPage: itemsPerPage,
        search: debouncedSearchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        paymentMethod: paymentFilter !== 'all' ? paymentFilter : undefined,
      },
      null
    ),
    queryFn: async () => {
      const params = {
        dateRange: baseRange.dateRange,
        customStart: baseRange.customStart,
        customEnd: baseRange.customEnd,
        page: currentPage,
        perPage: itemsPerPage,
        search: debouncedSearchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        paymentMethod: paymentFilter !== 'all' ? paymentFilter : undefined,
      };

      const response = await retryWithBackoff(
        () => reportService.getSalesDetail(params),
        {
          maxRetries: 3,
          baseDelay: 800,
          shouldRetry: err =>
            !err?.response ||
            err?.response?.status >= 500 ||
            err?.response?.status === 429,
        }
      );

      return normalizeResponseData(response, params);
    },
    enabled: !!debouncedDateRange,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: previousData => previousData,
  });

  // Extract data from query result
  const salesData = reportData?.salesData || [];
  const summary = reportData?.summary || {
    totalSales: 0,
    totalTransactions: 0,
    totalDiscount: 0,
    totalTax: 0,
    netSales: 0,
  };
  const pagination = reportData?.pagination || {
    current_page: 1,
    per_page: itemsPerPage,
    total: 0,
    last_page: 1,
  };
  const loading = reportLoading;

  // Fetch previous period for comparison
  useEffect(() => {
    if (comparePrevious && reportData) {
      const prevParams = {
        dateRange: baseRange.dateRange,
        customStart: baseRange.customStart,
        customEnd: baseRange.customEnd,
        page: 1,
        perPage: 100,
        ...getPreviousRange(),
      };

      reportService
        .getSalesDetail(prevParams)
        .then(prevResp => {
          const prevPayload = prevResp?.data ?? prevResp;
          const prevTx = (
            prevPayload?.transactions ??
            prevPayload?.data ??
            []
          ).map(tx => ({
            total: tx.total ?? tx.grand_total ?? tx.net_total ?? 0,
            discount: tx.discount_total ?? tx.discount ?? 0,
            tax: tx.tax_total ?? tx.tax ?? 0,
          }));
          const prevSummaryCalc = {
            totalSales: prevTx.reduce((a, t) => a + (Number(t.total) || 0), 0),
            totalTransactions: Array.isArray(prevTx) ? prevTx.length : 0,
            totalDiscount: prevTx.reduce(
              (a, t) => a + (Number(t.discount) || 0),
              0
            ),
            totalTax: prevTx.reduce((a, t) => a + (Number(t.tax) || 0), 0),
          };
          prevSummaryCalc.netSales =
            prevSummaryCalc.totalSales -
            prevSummaryCalc.totalDiscount +
            prevSummaryCalc.totalTax;
          setPreviousSummary(prevSummaryCalc);
        })
        .catch(() => {
          setPreviousSummary(null);
        });
    } else {
      setPreviousSummary(null);
    }
  }, [comparePrevious, reportData, baseRange]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [
    debouncedSearchTerm,
    statusFilter,
    paymentFilter,
    debouncedDateRange,
    debouncedCustomDate,
  ]);

  // ✅ Handle refresh dengan manual refetch
  const handleRefresh = useCallback(async () => {
    if (refreshing || reportLoading) return;

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
    const handleKeyDown = e => {
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

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = status => {
    // Normalize status to lowercase
    const normalizedStatus = (status || '').toLowerCase();

    const statusConfig = {
      pending: {
        className: 'bg-amber-100 text-amber-800 border-amber-300',
        label: 'Menunggu',
      },
      confirmed: {
        className: 'bg-blue-100 text-blue-800 border-blue-300',
        label: 'Dikonfirmasi',
      },
      preparing: {
        className: 'bg-purple-100 text-purple-800 border-purple-300',
        label: 'Diproses',
      },
      ready: {
        className: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        label: 'Siap',
      },
      completed: {
        className: 'bg-green-100 text-green-800 border-green-300',
        label: 'Selesai',
      },
      cancelled: {
        className: 'bg-red-100 text-red-800 border-red-300',
        label: 'Dibatalkan',
      },
    };

    const config = statusConfig[normalizedStatus] || {
      className: 'bg-gray-100 text-gray-800 border-gray-300',
      label: status || 'Unknown',
    };

    return `${config.className} border font-medium px-2.5 py-1 rounded-md text-xs`;
  };

  const getStatusLabel = status => {
    const normalizedStatus = (status || '').toLowerCase();

    const statusLabels = {
      pending: 'Menunggu',
      confirmed: 'Dikonfirmasi',
      preparing: 'Diproses',
      ready: 'Siap',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    };

    return statusLabels[normalizedStatus] || status || 'Unknown';
  };

  const handleViewOrderDetail = async orderId => {
    if (!orderId) return;

    setSelectedOrderId(orderId);
    setOrderDetailModal(true);
    setLoadingDetail(true);
    setOrderDetail(null);

    try {
      const response = await salesService.getOrderById(orderId);
      if (response?.success && response?.data) {
        setOrderDetail(response.data);
      } else {
        throw new Error('Failed to fetch order detail');
      }
    } catch (error) {
      console.error('Error fetching order detail:', error);
      toast.error('Gagal mengambil detail order');
      setOrderDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle open receipt online
  const handleOpenReceipt = async orderId => {
    try {
      // Fetch order detail to get receipt token
      const response = await salesService.getOrderById(orderId);
      if (response?.success && response?.data) {
        const receiptUrl =
          response.data.receipt_url || response.data.receipt_token;
        if (receiptUrl) {
          // If we have receipt_url, use it directly, otherwise construct from token
          const url = response.data.receipt_url
            ? response.data.receipt_url
            : `${window.location.origin}/receipt/${response.data.receipt_token}`;
          window.open(url, '_blank');
          toast.success('Membuka kuitansi online...');
        } else {
          throw new Error('Receipt token tidak ditemukan');
        }
      } else {
        throw new Error('Gagal mengambil data order');
      }
    } catch (error) {
      console.error('Error opening receipt:', error);
      toast.error('Gagal membuka kuitansi online');
    }
  };

  // Handle send WhatsApp receipt
  const handleSendWhatsAppReceipt = async orderId => {
    if (!orderId) return;

    setSendingWhatsApp(orderId);
    try {
      const result = await whatsappService.sendReceipt(orderId);
      if (result.success) {
        toast.success('Kuitansi berhasil dikirim via WhatsApp');
      } else {
        throw new Error(result.message || 'Gagal mengirim kuitansi');
      }
    } catch (error) {
      console.error('Error sending WhatsApp receipt:', error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Gagal mengirim kuitansi via WhatsApp';
      toast.error(errorMessage);
    } finally {
      setSendingWhatsApp(null);
    }
  };

  const getPaymentIcon = method => {
    const iconConfig = {
      Cash: '💰',
      'Bank Transfer': '🏦',
      'Credit Card': '💳',
      'E-Wallet': '📱',
    };
    return iconConfig[method] || '💳';
  };

  // Handle export
  const handleExport = async format => {
    try {
      const baseRange = resolveApiRange();
      const params = {
        dateRange: baseRange.dateRange,
        customStart: baseRange.customStart,
        customEnd: baseRange.customEnd,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        paymentMethod: paymentFilter !== 'all' ? paymentFilter : undefined,
      };

      // ✅ FIX: Use 'sales-detail' or 'sales' - both are supported by backend
      await reportService.exportReport('sales-detail', format, params);
      toast.success(
        `Laporan berhasil diekspor dalam format ${format.toUpperCase()}`
      );
    } catch (error) {
      console.error('Error exporting report:', error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Gagal mengekspor laporan';
      toast.error(errorMessage);
    }
  };

  // Use data directly from API (already filtered and paginated)
  const currentData = salesData || [];
  const totalPages = pagination?.last_page || 1;

  // Background refetch every 5 minutes (handled by React Query refetchInterval)

  const visibleCount = 12;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight));
  const endIndex = Math.min(currentData.length, startIndex + visibleCount);
  const offsetY = startIndex * rowHeight;

  // ✅ Error handling
  if (reportError && !reportData) {
    const error = reportError;
    let errorMessage = '❌ Gagal memuat data laporan';
    let errorDetails = '';

    if (error.response) {
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
          errorDetails =
            data?.message || 'Terjadi kesalahan di server. Coba lagi nanti';
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
      {loading && !reportData ? (
        <SalesDetailReportSkeleton />
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Penjualan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {formatCurrency(summary.totalSales)}
              </div>
              {previousSummary && (
                <div className='text-xs text-gray-500 mt-1'>
                  Sebelumnya: {formatCurrency(previousSummary.totalSales)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {summary.totalTransactions}
              </div>
              {previousSummary && (
                <div className='text-xs text-gray-500 mt-1'>
                  Sebelumnya: {previousSummary.totalTransactions}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Diskon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-red-600'>
                -{formatCurrency(summary.totalDiscount)}
              </div>
              {previousSummary && (
                <div className='text-xs text-gray-500 mt-1'>
                  Sebelumnya: -{formatCurrency(previousSummary.totalDiscount)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>Total Pajak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-blue-600'>
                +{formatCurrency(summary.totalTax)}
              </div>
              {previousSummary && (
                <div className='text-xs text-gray-500 mt-1'>
                  Sebelumnya: +{formatCurrency(previousSummary.totalTax)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Penjualan Bersih
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-green-600'>
                {formatCurrency(summary.netSales)}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Subtotal produk (sebelum pajak dan diskon)
              </p>
              {previousSummary && (
                <div className='text-xs text-gray-500 mt-1'>
                  Sebelumnya: {formatCurrency(previousSummary.netSales)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Table */}
      {loading ? null : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Detail Penjualan</CardTitle>
              <CardDescription>
                Menampilkan {currentData.length} dari {pagination?.total || 0}{' '}
                transaksi
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className='-mx-6 overflow-x-auto sm:mx-0'>
              <div className='min-w-full px-6 sm:px-0'>
                <table className='w-full min-w-[800px]'>
                  <thead>
                    <tr className='border-b'>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        ID Transaksi
                      </th>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        Tanggal
                      </th>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        Pelanggan
                      </th>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        Items
                      </th>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        Subtotal
                      </th>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        Diskon
                      </th>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        Pajak
                      </th>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        Total
                      </th>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        Pembayaran
                      </th>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        Status
                      </th>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        Kasir
                      </th>
                      <th className='px-4 py-3 font-medium text-left text-gray-600'>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody ref={containerRef} onScroll={() => {}}>
                    {currentData.length > 0 ? (
                      <>
                        <tr style={{ height: offsetY }}></tr>
                        {currentData.slice(startIndex, endIndex).map(item => (
                          <tr
                            key={item.id}
                            className='border-b hover:bg-gray-50'
                          >
                            <td className='px-4 py-3 font-mono text-sm'>
                              {item.orderNumber || item.id}
                            </td>
                            <td className='px-4 py-3 text-sm'>
                              {formatDate(item.date)}
                            </td>
                            <td className='px-4 py-3 text-sm'>
                              {item.customer}
                            </td>
                            <td className='px-4 py-3 text-sm'>{item.items}</td>
                            <td className='px-4 py-3 text-sm'>
                              {formatCurrency(item.subtotal)}
                            </td>
                            <td className='px-4 py-3 text-sm text-red-600'>
                              -{formatCurrency(item.discount)}
                            </td>
                            <td className='px-4 py-3 text-sm text-blue-600'>
                              +{formatCurrency(item.tax)}
                            </td>
                            <td className='px-4 py-3 text-sm font-semibold'>
                              {formatCurrency(item.total)}
                            </td>
                            <td className='px-4 py-3 text-sm'>
                              <div className='flex items-center space-x-1'>
                                <span>
                                  {getPaymentIcon(item.paymentMethod)}
                                </span>
                                <span>{item.paymentMethod}</span>
                              </div>
                            </td>
                            <td className='px-4 py-3'>
                              <Badge className={getStatusBadge(item.status)}>
                                {getStatusLabel(item.status)}
                              </Badge>
                            </td>
                            <td className='px-4 py-3 text-sm'>
                              {item.cashier}
                            </td>
                            <td className='px-4 py-3'>
                              <div className='flex items-center gap-1'>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleViewOrderDetail(item.id)}
                                  title='Lihat detail order'
                                >
                                  <Eye className='w-4 h-4' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleOpenReceipt(item.id)}
                                  title='Buka kuitansi online'
                                  className='text-blue-600 hover:text-blue-700'
                                >
                                  <Receipt className='w-4 h-4' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() =>
                                    handleSendWhatsAppReceipt(item.id)
                                  }
                                  title='Kirim kuitansi via WhatsApp'
                                  className='text-green-600 hover:text-green-700'
                                  disabled={sendingWhatsApp === item.id}
                                >
                                  {sendingWhatsApp === item.id ? (
                                    <Loader2 className='w-4 h-4 animate-spin' />
                                  ) : (
                                    <MessageCircle className='w-4 h-4' />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr
                          style={{
                            height: Math.max(
                              0,
                              (currentData.length - endIndex) * rowHeight
                            ),
                          }}
                        ></tr>
                      </>
                    ) : (
                      <tr>
                        <td
                          colSpan='12'
                          className='py-8 text-center text-gray-500'
                        >
                          Tidak ada data transaksi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='flex items-center justify-between mt-4'>
                <div className='text-sm text-gray-500'>
                  Halaman {pagination?.current_page || 1} dari {totalPages}
                </div>
                <div className='flex space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages || loading}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Detail Modal */}
      <Dialog open={orderDetailModal} onOpenChange={setOrderDetailModal}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Detail Order</DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang order ini
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className='space-y-4'>
              {/* Order Info Skeleton */}
              <div className='grid grid-cols-2 gap-4'>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className='space-y-2'>
                    <div className='h-4 w-20 bg-gray-200 rounded animate-pulse' />
                    <div className='h-5 w-32 bg-gray-300 rounded animate-pulse' />
                  </div>
                ))}
              </div>

              {/* Items Skeleton */}
              <div className='border-t pt-4 space-y-2'>
                <div className='h-6 w-40 bg-gray-200 rounded animate-pulse mb-3' />
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'
                  >
                    <div className='flex-1 space-y-2'>
                      <div className='h-5 w-48 bg-gray-200 rounded animate-pulse' />
                      <div className='h-4 w-32 bg-gray-200 rounded animate-pulse' />
                    </div>
                    <div className='h-5 w-24 bg-gray-200 rounded animate-pulse' />
                  </div>
                ))}
              </div>

              {/* Summary Skeleton */}
              <div className='border-t pt-4 space-y-2'>
                <div className='flex justify-between'>
                  <div className='h-4 w-20 bg-gray-200 rounded animate-pulse' />
                  <div className='h-4 w-32 bg-gray-200 rounded animate-pulse' />
                </div>
              </div>
            </div>
          ) : orderDetail ? (
            <div className='space-y-4'>
              {/* Order Info */}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-sm text-gray-500'>Nomor Order</p>
                  <p className='font-semibold'>{orderDetail.order_number}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-500'>Tanggal</p>
                  <p className='font-semibold'>{orderDetail.created_at}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-500'>Pelanggan</p>
                  <p className='font-semibold'>
                    {orderDetail.customer || 'Walk-in'}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-gray-500'>Kasir</p>
                  <p className='font-semibold'>{orderDetail.cashier || '-'}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-500'>Status</p>
                  <Badge className={getStatusBadge(orderDetail.status)}>
                    {getStatusLabel(orderDetail.status)}
                  </Badge>
                </div>
                <div>
                  <p className='text-sm text-gray-500'>Meja</p>
                  <p className='font-semibold'>{orderDetail.table || '-'}</p>
                </div>
              </div>

              {/* Order Items */}
              <div className='border-t pt-4'>
                <h3 className='font-semibold mb-3'>Item yang Dipesan</h3>
                <div className='space-y-2'>
                  {orderDetail.items && orderDetail.items.length > 0 ? (
                    orderDetail.items.map((item, index) => {
                      const itemNotes = item.notes || item.note || null;
                      return (
                        <div
                          key={index}
                          className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'
                        >
                          <div className='flex-1'>
                            <p className='font-medium'>
                              {item.name || 'Unknown Product'}
                            </p>
                            <p className='text-sm text-gray-500'>
                              {item.qty || item.quantity} x{' '}
                              {formatCurrency(item.price || 0)}
                            </p>
                            {/* ✅ NEW: Tampilkan catatan jika ada */}
                            {itemNotes && (
                              <p className='text-xs text-blue-600 italic mt-1'>
                                📝 {itemNotes}
                              </p>
                            )}
                          </div>
                          <div className='text-right'>
                            <p className='font-semibold'>
                              {formatCurrency(
                                (item.qty || item.quantity) * (item.price || 0)
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className='text-sm text-gray-500 text-center py-4'>
                      Tidak ada item
                    </p>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className='border-t pt-4 space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Subtotal</span>
                  <span className='font-semibold'>
                    {formatCurrency(orderDetail.subtotal || 0)}
                  </span>
                </div>
                {(orderDetail.discount_amount || 0) > 0 && (
                  <div className='flex justify-between text-red-600'>
                    <span className='text-gray-600'>Diskon</span>
                    <span className='font-semibold'>
                      -{formatCurrency(orderDetail.discount_amount || 0)}
                    </span>
                  </div>
                )}
                {(orderDetail.tax_amount || 0) > 0 && (
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Pajak</span>
                    <span className='font-semibold'>
                      {formatCurrency(orderDetail.tax_amount || 0)}
                    </span>
                  </div>
                )}
                <div className='flex justify-between pt-2 border-t'>
                  <span className='text-lg font-semibold text-gray-900'>
                    Total
                  </span>
                  <span className='text-lg font-bold text-gray-900'>
                    {formatCurrency(orderDetail.total || 0)}
                  </span>
                </div>
                {orderDetail.notes && (
                  <div className='mt-4 pt-4 border-t'>
                    <p className='text-sm text-gray-500 mb-1'>Catatan</p>
                    <p className='text-sm'>{orderDetail.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className='text-center py-8'>
              <p className='text-gray-500'>Gagal memuat detail order</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesDetailReport;
