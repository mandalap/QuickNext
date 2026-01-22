import {
  ChevronUp,
  Clock,
  DollarSign,
  Edit,
  Eye,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { orderService } from '../../services/order.service';
import { debounce } from '../../utils/performance';
import AddItemsModal from '../modals/AddItemsModal';
import EditOrderModal from '../modals/EditOrderModal';
import PaymentModal from '../modals/PaymentModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { SkeletonOrderList } from '../ui/skeletons';
import SmartPagination from '../ui/SmartPagination';

const UnpaidOrders = ({ onOrderPaid, onCountChange }) => {
  const { user, currentBusiness, currentOutlet } = useAuth();

  // ✅ FIX: Check if user can edit orders (only admin/owner/super_admin)
  const canEditOrders =
    user && ['admin', 'owner', 'super_admin'].includes(user.role);
  // ✅ FIX: Check if user can add items (kasir can add, admin/owner can edit)
  const canAddItems =
    user && ['kasir', 'admin', 'owner', 'super_admin'].includes(user.role);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ FIX: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [orderDetailModalOpen, setOrderDetailModalOpen] = useState(false);
  const [orderToView, setOrderToView] = useState(null);
  const [editOrderModalOpen, setEditOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [addItemsModalOpen, setAddItemsModalOpen] = useState(false);
  const [orderToAddItems, setOrderToAddItems] = useState(null);
  const [syncingOrders, setSyncingOrders] = useState(new Set());

  // ✅ OPTIMIZATION: Create debounced search function
  const debouncedLoadOrders = useRef(
    debounce((searchValue, page) => {
      loadUnpaidOrdersInternal(searchValue, page);
    }, 500) // 500ms debounce delay for search
  ).current;

  // ✅ FIX: Reload data saat currentPage atau searchTerm berubah
  useEffect(() => {
    // Use debounced version for search, immediate for page change
    if (searchTerm) {
      debouncedLoadOrders(searchTerm, currentPage);
    } else {
      loadUnpaidOrders();
    }

    // Set interval untuk auto-refresh count setiap 30 detik
    const interval = setInterval(() => {
      loadUnpaidOrders();
    }, 30000); // 30 detik

    return () => {
      clearInterval(interval);
      // Cancel any pending debounced calls on unmount
      if (debouncedLoadOrders.cancel) {
        debouncedLoadOrders.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm]); // ✅ FIX: Reload saat page atau searchTerm berubah

  // Internal load function that can be debounced
  const loadUnpaidOrdersInternal = async (search = searchTerm, page = currentPage) => {
    setLoading(true);
    try {
      // ✅ FIX: Tambahkan pagination parameters
      const params = {
        page: page,
        per_page: 10, // 10 orders per page
      };

      if (search) {
        params.search = search;
      }

      const result = await orderService.getUnpaidOrders(params);
      if (result.success) {
        // ✅ FIX: Handle response structure dengan pagination
        const data = result.data?.data || result.data || [];
        const ordersArray = Array.isArray(data) ? data : [];
        setOrders(ordersArray);

        // ✅ FIX: Extract pagination info dari response
        const paginationInfo = result.data?.pagination || {};
        if (paginationInfo.current_page || paginationInfo.total !== undefined) {
          setPagination({
            current_page: paginationInfo.current_page || page,
            last_page: paginationInfo.last_page || 1,
            per_page: paginationInfo.per_page || 10,
            total: paginationInfo.total || ordersArray.length,
          });
        }

        // ✅ FIX: Notify parent component about the total count (bukan ordersArray.length)
        if (onCountChange) {
          const totalCount = paginationInfo.total || ordersArray.length;
          onCountChange(totalCount);
        }
      } else {
        // Tidak tampilkan error toast, hanya set empty state
        // Error akan ditangani oleh UI loading state
        setOrders([]);
        setPagination({
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: 0,
        });
        if (onCountChange) {
          onCountChange(0);
        }
      }
    } catch (error) {
      console.error('Error loading unpaid orders:', error);
      // Tidak tampilkan error toast, hanya set empty state
      // Error akan ditangani oleh UI loading state
      setOrders([]);
      setPagination({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
      });
      if (onCountChange) {
        onCountChange(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Wrapper function for backward compatibility
  const loadUnpaidOrders = useCallback(() => {
    loadUnpaidOrdersInternal(searchTerm, currentPage);
  }, [searchTerm, currentPage]);

  // ✅ FIX: Handle page change
  const handlePageChange = page => {
    setCurrentPage(page);
  };

  // ✅ FIX: Handle search - reset to page 1 dan trigger load
  const handleSearch = () => {
    // Reset ke page 1 saat search
    setCurrentPage(1);
    // loadUnpaidOrders akan dipanggil otomatis oleh useEffect saat currentPage berubah
  };

  // Toggle expand/collapse untuk melihat detail order
  const toggleOrderDetail = orderId => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  // View order detail in modal
  const viewOrderDetail = order => {
    setOrderToView(order);
    setOrderDetailModalOpen(true);
  };

  // Handle edit order
  const handleEditOrder = order => {
    setOrderToEdit(order);
    setEditOrderModalOpen(true);
  };

  // Handle add items to order (for kasir)
  const handleAddItems = order => {
    setOrderToAddItems(order);
    setAddItemsModalOpen(true);
  };

  // Handle order updated
  const handleOrderUpdated = async updatedOrder => {
    toast.success('✅ Order berhasil diupdate', {
      duration: 3000,
    });

    // Reload unpaid orders
    await loadUnpaidOrders();

    // Close edit modal
    setEditOrderModalOpen(false);
    setOrderToEdit(null);

    // Callback untuk parent component
    if (onOrderPaid) {
      onOrderPaid(updatedOrder);
    }
  };

  // Handle items added
  const handleItemsAdded = async updatedOrder => {
    // Reload unpaid orders
    await loadUnpaidOrders();

    // Close add items modal
    setAddItemsModalOpen(false);
    setOrderToAddItems(null);
  };

  const handlePayNow = order => {
    setSelectedOrder(order);
    setPaymentModalOpen(true);
  };

  // ✅ NEW: Sync payment status from Midtrans
  const handleSyncPayment = async order => {
    setSyncingOrders(prev => new Set(prev).add(order.id));
    try {
      const result = await orderService.syncPaymentStatus(order.id);
      if (result.success) {
        toast.success('✅ Payment status berhasil di-sync dari Midtrans!', {
          duration: 3000,
        });
        // Reload unpaid orders
        await loadUnpaidOrders();
        // Callback untuk parent component
        if (onOrderPaid) {
          onOrderPaid(order);
        }
      } else {
        toast.error(
          'Gagal sync payment status: ' + (result.error || 'Unknown error'),
          { duration: 5000 }
        );
      }
    } catch (error) {
      console.error('Error syncing payment status:', error);
      toast.error('Gagal sync payment status: ' + error.message, {
        duration: 5000,
      });
    } finally {
      setSyncingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  // ✅ NEW: Check if order has pending Midtrans payment
  const hasPendingMidtransPayment = order => {
    const payments = order.payments || [];
    const latestPayment = payments.length > 0 ? payments[payments.length - 1] : null;
    return (
      latestPayment &&
      latestPayment.status === 'pending' &&
      (latestPayment.payment_method === 'qris' ||
        latestPayment.payment_method === 'midtrans')
    );
  };

  const handlePaymentComplete = async paymentData => {
    if (!selectedOrder) return;

    try {
      const loadingToast = toast.loading('Memproses pembayaran...');

      // ✅ FIX: Apply discount ke order jika ada (sebelum payment)
      if (paymentData.discountCode && paymentData.discount > 0) {
        toast.loading('Menerapkan diskon ke order...', { id: loadingToast });

        // Apply discount ke order (using kasir-friendly endpoint)
        const discountResult = await orderService.applyDiscount(
          selectedOrder.id,
          {
            discount_amount: paymentData.discount,
            discount_code: paymentData.discountCode,
          }
        );

        if (!discountResult.success) {
          toast.dismiss(loadingToast);
          toast.error(
            discountResult.error || 'Gagal menerapkan diskon ke order'
          );
          return;
        }

        // Update selectedOrder dengan data terbaru dari discountResult
        const updatedOrder = discountResult.data?.data || discountResult.data;
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
          // Update paymentData.total dengan total baru
          paymentData.total = updatedOrder.total;
        }

        await loadUnpaidOrders();
        toast.loading('Memproses pembayaran...', { id: loadingToast });
      }

      // Process payment untuk order yang sudah ada
      const paymentResult = await orderService.processPayment(
        selectedOrder.id,
        {
          amount: paymentData.amount,
          method: paymentData.method,
          notes: `Kembalian: ${formatCurrency(paymentData.change)}${
            paymentData.discountCode
              ? ` | Diskon: ${paymentData.discountCode}`
              : ''
          }`,
        }
      );

      if (!paymentResult.success) {
        toast.dismiss(loadingToast);
        const paymentError =
          paymentResult.error || 'Gagal memproses pembayaran';
        toast.error(`❌ Pembayaran gagal: ${paymentError}`, {
          duration: 5000,
        });
        return;
      }

      toast.dismiss(loadingToast);
      toast.success(
        `✅ Pembayaran Berhasil!\nOrder #${selectedOrder.order_number}\n` +
          `Total: ${formatCurrency(paymentData.total)}\n` +
          `Kembalian: ${formatCurrency(paymentData.change)}`,
        {
          duration: 5000,
        }
      );

      // ✅ FIX: Reload unpaid orders untuk update list tanpa reload halaman
      await loadUnpaidOrders();

      // ✅ FIX: Update count setelah order dibayar
      if (onCountChange) {
        const newCount = Math.max(0, (pagination.total || orders.length) - 1);
        onCountChange(newCount);
      }

      // Callback untuk parent component
      if (onOrderPaid) {
        onOrderPaid(selectedOrder);
      }

      // Close modal
      setPaymentModalOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Gagal memproses pembayaran: ' + error.message);
    }
  };

  const formatCurrency = amount => {
    // Gunakan titik (.) sebagai separator ribuan (konsisten dengan CashierPOS)
    return (
      'Rp ' +
      Number(amount)
        .toLocaleString('id-ID', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        .replace(/,/g, '.')
    );
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusColor = status => {
    const statusColors = {
      received: 'bg-blue-100 text-blue-700',
      washing: 'bg-purple-100 text-purple-700',
      ironing: 'bg-yellow-100 text-yellow-700',
      ready: 'bg-green-100 text-green-700',
      pending: 'bg-gray-100 text-gray-700',
      completed: 'bg-green-100 text-green-700',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = status => {
    const statusLabels = {
      received: 'Diterima',
      washing: 'Mencuci',
      ironing: 'Menyetrika',
      ready: 'Siap Diambil',
      pending: 'Menunggu',
      completed: 'Selesai',
    };
    return statusLabels[status] || status;
  };

  // Get payment status info
  const getPaymentStatusInfo = (order) => {
    // Check if there are any payments
    const payments = order.payments || [];
    const latestPayment = payments.length > 0 ? payments[payments.length - 1] : null;

    if (!latestPayment) {
      return {
        label: 'Belum Bayar',
        color: 'bg-red-100 text-red-700 border-red-300',
        icon: '💳'
      };
    }

    // Check payment status
    if (latestPayment.status === 'success' || latestPayment.status === 'paid') {
      return {
        label: 'Sudah Dibayar',
        color: 'bg-green-100 text-green-700 border-green-300',
        icon: '✅'
      };
    } else if (latestPayment.status === 'pending') {
      // Check payment method to give more context
      if (latestPayment.payment_method === 'qris' || latestPayment.payment_method === 'midtrans') {
        return {
          label: 'Menunggu Pembayaran',
          color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          icon: '⏳',
          detail: 'Midtrans'
        };
      }
      return {
        label: 'Proses Pembayaran',
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: '⏳'
      };
    } else if (latestPayment.status === 'failed') {
      return {
        label: 'Pembayaran Gagal',
        color: 'bg-red-100 text-red-700 border-red-300',
        icon: '❌'
      };
    }

    return {
      label: 'Belum Bayar',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: '💳'
    };
  };

  // ✅ OPTIMIZATION: Show skeleton loaders instead of spinner
  if (loading && orders.length === 0) {
    return (
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-bold flex items-center'>
              <Clock className='w-5 h-5 mr-2 text-gray-600' />
              Order Belum Dibayar
            </h2>
            <p className='text-sm text-gray-600 mt-1'>Sedang proses menampilkan data...</p>
          </div>
          <Button variant='outline' size='sm' disabled>
            <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
            Memuat...
          </Button>
        </div>

        {/* Search skeleton */}
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
          <Input
            placeholder='Cari order number atau nama pelanggan...'
            className='pl-10'
            disabled
          />
        </div>

        {/* Orders skeleton */}
        <SkeletonOrderList count={5} />
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-xl font-bold flex items-center'>
            <Clock className='w-5 h-5 mr-2 text-gray-600' />
            Order Belum Dibayar
          </h2>
          <p className='text-sm text-gray-600 mt-1'>
            {pagination.total > 0
              ? `${pagination.total} order menunggu pembayaran`
              : orders.length > 0
              ? `${orders.length} order menunggu pembayaran`
              : '0 order menunggu pembayaran'}
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={loadUnpaidOrders}
          disabled={loading}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
        <Input
          placeholder='Cari order number atau nama pelanggan...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          className='pl-10'
        />
        <Button
          variant='outline'
          size='sm'
          onClick={handleSearch}
          className='absolute right-2 top-1/2 transform -translate-y-1/2'
        >
          Cari
        </Button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className='p-8 text-center'>
            <Clock className='w-12 h-12 text-gray-300 mx-auto mb-4' />
            <p className='text-gray-600 font-medium'>
              Tidak ada order belum dibayar
            </p>
            <p className='text-sm text-gray-500 mt-2'>
              Semua order sudah dibayar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-3'>
          {orders.map(order => {
            const isExpanded = expandedOrders.has(order.id);
            const orderItems = order.order_items || order.items || [];

            return (
              <Card
                key={order.id}
                className='hover:shadow-md transition-shadow'
              >
                <CardContent className='p-4'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-2 flex-wrap'>
                        <p className='font-bold text-lg'>
                          #{order.order_number}
                        </p>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                        {/* Payment Status Badge */}
                        {(() => {
                          const paymentStatus = getPaymentStatusInfo(order);
                          return (
                            <Badge variant='outline' className={paymentStatus.color}>
                              {paymentStatus.icon} {paymentStatus.label}
                              {paymentStatus.detail && ` (${paymentStatus.detail})`}
                            </Badge>
                          );
                        })()}
                      </div>
                      {/* ✅ FIX: Informasi Pelanggan yang lebih lengkap */}
                      <div className='mb-2'>
                        <div className='flex items-center gap-2 mb-1'>
                          <p className='text-sm font-semibold text-gray-900'>
                            {order.customer?.name || 'Walk-in Customer'}
                          </p>
                          {!order.customer?.id && (
                            <Badge
                              variant='outline'
                              className='text-xs bg-yellow-50 text-yellow-700 border-yellow-300'
                            >
                              ⚠️ Bukan Member
                            </Badge>
                          )}
                          {order.customer?.id && (
                            <Badge
                              variant='outline'
                              className='text-xs bg-green-50 text-green-700 border-green-300'
                            >
                              ✅ Member
                            </Badge>
                          )}
                        </div>
                        {/* ✅ FIX: Tampilkan nomor meja jika ada */}
                        {(order.table?.name || order.table_id) && (
                          <p className='text-xs text-blue-600 font-medium mb-0.5'>
                            🪑 Meja: {order.table?.name || `Meja ${order.table_id}`}
                          </p>
                        )}
                        {order.customer?.phone && (
                          <p className='text-xs text-gray-600 mb-0.5'>
                            📞 {order.customer.phone}
                          </p>
                        )}
                        {order.customer?.email && (
                          <p className='text-xs text-gray-600 mb-0.5'>
                            ✉️ {order.customer.email}
                          </p>
                        )}
                      </div>
                      <p className='text-xs text-gray-500 mb-2'>
                        📅 {formatDate(order.created_at)}
                      </p>
                      <div className='flex items-center gap-4'>
                        <div>
                          <p className='text-xs text-gray-500'>Total</p>
                          <p className='text-lg font-bold text-blue-600'>
                            {formatCurrency(order.total)}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs text-gray-500'>Items</p>
                          <p className='text-sm font-medium'>
                            {orderItems.length} item
                          </p>
                        </div>
                      </div>

                      {/* Expandable Order Items Detail */}
                      {isExpanded && orderItems.length > 0 && (
                        <div className='mt-4 pt-4 border-t border-gray-200'>
                          <p className='text-sm font-semibold text-gray-700 mb-2'>
                            Detail Pesanan:
                          </p>
                          <div className='space-y-2'>
                            {orderItems.map((item, index) => (
                              <div
                                key={index}
                                className='flex items-center justify-between p-2 bg-gray-50 rounded'
                              >
                                <div className='flex-1'>
                                  <p className='text-sm font-medium text-gray-900'>
                                    {item.product_name || item.name || 'Item'}
                                  </p>
                                  {item.variant_name && (
                                    <p className='text-xs text-gray-500'>
                                      Varian: {item.variant_name}
                                    </p>
                                  )}
                                  {item.notes && (
                                    <p className='text-xs text-gray-500'>
                                      Catatan: {item.notes}
                                    </p>
                                  )}
                                </div>
                                <div className='text-right ml-4'>
                                  <p className='text-sm text-gray-600'>
                                    {item.quantity} x{' '}
                                    {formatCurrency(
                                      item.price || item.price_per_unit || 0
                                    )}
                                  </p>
                                  <p className='text-sm font-semibold text-gray-900'>
                                    {formatCurrency(
                                      item.subtotal ||
                                        item.quantity *
                                          (item.price ||
                                            item.price_per_unit ||
                                            0)
                                    )}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {order.notes && (
                              <div className='mt-2 p-2 bg-blue-50 rounded'>
                                <p className='text-xs text-gray-600'>
                                  <strong>Catatan:</strong> {order.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className='flex flex-col gap-2 ml-4'>
                      <div className='flex gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => toggleOrderDetail(order.id)}
                          className='flex-1 whitespace-nowrap'
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className='w-4 h-4 mr-2' />
                              Sembunyikan
                            </>
                          ) : (
                            <>
                              <Eye className='w-4 h-4 mr-2' />
                              Lihat Detail
                            </>
                          )}
                        </Button>
                        {/* ✅ FIX: Show Add Items button for kasir, Edit button for admin/owner */}
                        {canAddItems && !canEditOrders && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleAddItems(order)}
                            className='flex-1 whitespace-nowrap border-green-300 text-green-600 hover:bg-green-50'
                            title='Tambah item ke pesanan (tidak bisa edit/hapus item yang sudah ada)'
                          >
                            <Plus className='w-4 h-4 mr-2' />
                            Tambah Item
                          </Button>
                        )}
                        {canEditOrders && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleEditOrder(order)}
                            className='flex-1 whitespace-nowrap border-blue-300 text-blue-600 hover:bg-blue-50'
                            title='Edit pesanan (tambah/edit/hapus item) - Hanya untuk Admin/Owner'
                          >
                            <Edit className='w-4 h-4 mr-2' />
                            Edit
                          </Button>
                        )}
                      </div>
                      <div className='flex flex-col gap-2'>
                        {/* ✅ NEW: Sync Payment Button for Midtrans orders */}
                        {hasPendingMidtransPayment(order) && (
                          <Button
                            onClick={() => handleSyncPayment(order)}
                            disabled={syncingOrders.has(order.id)}
                            variant='outline'
                            size='sm'
                            className='whitespace-nowrap border-blue-300 text-blue-600 hover:bg-blue-50'
                            title='Sync payment status dari Midtrans (jika sudah dibayar di Midtrans)'
                          >
                            <RefreshCw
                              className={`w-4 h-4 mr-2 ${
                                syncingOrders.has(order.id) ? 'animate-spin' : ''
                              }`}
                            />
                            {syncingOrders.has(order.id)
                              ? 'Syncing...'
                              : 'Sync Payment'}
                          </Button>
                        )}
                        <Button
                          onClick={() => handlePayNow(order)}
                          className='bg-green-600 hover:bg-green-700 whitespace-nowrap'
                        >
                          <DollarSign className='w-4 h-4 mr-2' />
                          Bayar Sekarang
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* ✅ FIX: Pagination */}
          {pagination.last_page > 1 && (
            <div className='mt-6 pt-4 border-t'>
              <SmartPagination
                currentPage={pagination.current_page}
                totalPages={pagination.last_page}
                onPageChange={handlePageChange}
                itemsPerPage={pagination.per_page}
                totalItems={pagination.total}
                isLoading={loading}
              />
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {selectedOrder && (
        <PaymentModal
          open={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedOrder(null);
          }}
          cartTotal={selectedOrder.total}
          onPaymentComplete={async (paymentData) => {
            // ✅ FIX: Handle payment complete untuk QRIS/Midtrans
            if (paymentData.method === 'qris' && paymentData.success) {
              // Untuk QRIS, payment sudah di-handle oleh QRISPaymentModal
              console.log('🔄 QRIS payment complete, updating order list...');
              
              // ✅ FIX: Optimistically remove order from list (instant UI update)
              if (selectedOrder) {
                setOrders(prevOrders => prevOrders.filter(order => order.id !== selectedOrder.id));
                
                // Update pagination count
                const newTotal = Math.max(0, (pagination.total || orders.length) - 1);
                setPagination(prev => ({
                  ...prev,
                  total: newTotal,
                }));
                
                // Update count
                if (onCountChange) {
                  onCountChange(newTotal);
                }
              }
              
              // ✅ FIX: Refresh dari API di background untuk memastikan data sync
              // Tapi tidak blocking UI (user sudah lihat order hilang)
              loadUnpaidOrders().catch(err => {
                console.error('Error refreshing order list:', err);
                // Jika error, tetap OK karena kita sudah optimistically update
              });
              
              // Callback untuk parent
              if (onOrderPaid && paymentData.order) {
                onOrderPaid(paymentData.order);
              } else if (onOrderPaid && selectedOrder) {
                onOrderPaid(selectedOrder);
              }
              
              // Close modal
              setPaymentModalOpen(false);
              setSelectedOrder(null);
              
              // Show success toast
              toast.success('✅ Pembayaran berhasil! Order sudah dihapus dari daftar.', {
                duration: 3000,
              });
            } else {
              // Untuk payment method lain, gunakan handlePaymentComplete yang sudah ada
              await handlePaymentComplete(paymentData);
            }
          }}
          orderId={selectedOrder.id}
        />
      )}

      {/* Edit Order Modal */}
      {orderToEdit && (
        <EditOrderModal
          open={editOrderModalOpen}
          onClose={() => {
            setEditOrderModalOpen(false);
            setOrderToEdit(null);
          }}
          orderId={orderToEdit.id}
          onOrderUpdated={handleOrderUpdated}
        />
      )}

      {/* Add Items Modal */}
      {orderToAddItems && (
        <AddItemsModal
          open={addItemsModalOpen}
          onClose={() => {
            setAddItemsModalOpen(false);
            setOrderToAddItems(null);
          }}
          orderId={orderToAddItems.id}
          onItemsAdded={handleItemsAdded}
        />
      )}

      {/* Order Detail Modal */}
      <Dialog
        open={orderDetailModalOpen}
        onOpenChange={setOrderDetailModalOpen}
      >
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-xl font-bold'>
              Detail Order #{orderToView?.order_number}
            </DialogTitle>
            <DialogDescription>
              Konfirmasi pesanan dengan pelanggan sebelum melakukan pembayaran
            </DialogDescription>
          </DialogHeader>

          {orderToView && (
            <div className='space-y-4'>
              {/* ✅ FIX: Customer Info dengan informasi yang lebih lengkap */}
              <div className='bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200'>
                <div className='flex items-center justify-between mb-3'>
                  <h3 className='font-semibold text-gray-900 flex items-center gap-2'>
                    <User className='w-4 h-4 text-blue-600' />
                    Informasi Pelanggan
                  </h3>
                  {!orderToView.customer?.id && (
                    <Badge
                      variant='outline'
                      className='bg-yellow-50 text-yellow-700 border-yellow-300'
                    >
                      ⚠️ Bukan Member
                    </Badge>
                  )}
                  {orderToView.customer?.id && (
                    <Badge
                      variant='outline'
                      className='bg-green-50 text-green-700 border-green-300'
                    >
                      ✅ Member
                    </Badge>
                  )}
                </div>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <User className='w-4 h-4 text-gray-500' />
                    <p className='text-sm font-medium text-gray-900'>
                      {orderToView.customer?.name || 'Walk-in Customer'}
                    </p>
                  </div>
                  {orderToView.customer?.phone && (
                    <div className='flex items-center gap-2'>
                      <Phone className='w-4 h-4 text-gray-500' />
                      <p className='text-sm text-gray-600'>
                        {orderToView.customer.phone}
                      </p>
                    </div>
                  )}
                  {orderToView.customer?.email && (
                    <div className='flex items-center gap-2'>
                      <Mail className='w-4 h-4 text-gray-500' />
                      <p className='text-sm text-gray-600'>
                        {orderToView.customer.email}
                      </p>
                    </div>
                  )}
                  {orderToView.customer?.address && (
                    <div className='mt-2 pt-2 border-t border-gray-200'>
                      <p className='text-xs text-gray-500 mb-1'>
                        <strong>Alamat:</strong>
                      </p>
                      <p className='text-xs text-gray-600'>
                        {orderToView.customer.address}
                      </p>
                    </div>
                  )}
                  {!orderToView.customer?.id && (
                    <div className='mt-3 pt-3 border-t border-yellow-200 bg-yellow-50 rounded p-2'>
                      <p className='text-xs text-yellow-800'>
                        💡 Pelanggan ini belum menjadi member. Anda dapat
                        menyarankan untuk menjadi member setelah pembayaran.
                      </p>
                    </div>
                  )}
                </div>
                <div className='mt-3 pt-3 border-t border-gray-200'>
                  <p className='text-xs text-gray-500 mb-1'>
                    <strong>Tanggal Order:</strong>{' '}
                    {formatDate(orderToView.created_at)}
                  </p>
                  <div className='mt-2'>
                    <Badge className={getStatusColor(orderToView.status)}>
                      {getStatusLabel(orderToView.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className='font-semibold text-gray-900 mb-3'>
                  Detail Pesanan
                </h3>
                <div className='space-y-2'>
                  {(orderToView.order_items || orderToView.items || []).map(
                    (item, index) => (
                      <div
                        key={index}
                        className='flex items-start justify-between p-3 bg-white border border-gray-200 rounded-lg'
                      >
                        <div className='flex-1'>
                          <p className='font-medium text-gray-900'>
                            {item.product_name || item.name || 'Item'}
                          </p>
                          {item.variant_name && (
                            <p className='text-xs text-gray-500 mt-1'>
                              Varian: {item.variant_name}
                            </p>
                          )}
                          {item.notes && (
                            <p className='text-xs text-gray-500 mt-1'>
                              Catatan: {item.notes}
                            </p>
                          )}
                        </div>
                        <div className='text-right ml-4'>
                          <p className='text-sm text-gray-600'>
                            {item.quantity} x{' '}
                            {formatCurrency(
                              item.price || item.price_per_unit || 0
                            )}
                          </p>
                          <p className='text-sm font-semibold text-gray-900 mt-1'>
                            {formatCurrency(
                              item.subtotal ||
                                item.quantity *
                                  (item.price || item.price_per_unit || 0)
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className='bg-blue-50 p-4 rounded-lg border border-blue-200'>
                <h3 className='font-semibold text-gray-900 mb-3'>Ringkasan</h3>
                <div className='space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-600'>Subtotal:</span>
                    <span className='font-medium'>
                      {formatCurrency(
                        orderToView.subtotal || orderToView.total
                      )}
                    </span>
                  </div>
                  {orderToView.tax_amount > 0 && (
                    <div className='flex justify-between text-sm'>
                      <span className='text-gray-600'>Pajak:</span>
                      <span className='font-medium'>
                        {formatCurrency(orderToView.tax_amount)}
                      </span>
                    </div>
                  )}
                  {orderToView.discount_amount > 0 && (
                    <div className='flex justify-between text-sm text-green-600'>
                      <span>Diskon:</span>
                      <span className='font-medium'>
                        -{formatCurrency(orderToView.discount_amount)}
                      </span>
                    </div>
                  )}
                  <div className='flex justify-between text-lg font-bold border-t pt-2 mt-2'>
                    <span className='text-gray-900'>Total:</span>
                    <span className='text-blue-600'>
                      {formatCurrency(orderToView.total)}
                    </span>
                  </div>
                </div>
              </div>

              {orderToView.notes && (
                <div className='bg-yellow-50 p-3 rounded-lg border border-yellow-200'>
                  <p className='text-sm text-gray-700'>
                    <strong>Catatan Order:</strong> {orderToView.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className='flex gap-2 justify-end pt-4'>
                <Button
                  variant='outline'
                  onClick={() => setOrderDetailModalOpen(false)}
                >
                  Tutup
                </Button>
                <Button
                  onClick={() => {
                    setOrderDetailModalOpen(false);
                    handlePayNow(orderToView);
                  }}
                  className='bg-green-600 hover:bg-green-700'
                >
                  <DollarSign className='w-4 h-4 mr-2' />
                  Lanjutkan Pembayaran
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnpaidOrders;
