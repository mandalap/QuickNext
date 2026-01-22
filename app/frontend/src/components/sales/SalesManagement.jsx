import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    CreditCard,
    DollarSign,
    Download,
    Edit,
    Eye,
    Filter,
    Loader2,
    Mail,
    MessageCircle,
    MoreHorizontal,
    Package,
    Phone,
    Plus,
    Printer,
    Receipt,
    RefreshCw,
    RotateCw,
    Search,
    Share2,
    ShoppingCart,
    Trash2,
    TrendingDown,
    TrendingUp,
    User,
    XCircle,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useAuth } from '../../contexts/AuthContext';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { useSales } from '../../hooks/useSales';
import { useShiftOrders } from '../../hooks/useShiftOrders';
import { orderService } from '../../services/order.service';
import { salesService } from '../../services/salesService';
import { shiftService } from '../../services/shift.service';
import whatsappService from '../../services/whatsapp.service';
import CustomerFormModal from '../modals/CustomerFormModal';
import EditOrderModal from '../modals/EditOrderModal';
import PaymentModal from '../modals/PaymentModal';
import PrintReceiptModal from '../modals/PrintReceiptModal';
import MidtransPaymentModal from '../modals/QRISPaymentModal';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import SmartPagination from '../ui/SmartPagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../ui/toast';
// Debug component dihapus untuk produksi

// ✅ OPTIMIZATION: Memoized OrderCardItem component untuk virtual scrolling
const OrderCardItem = memo(({ index, style, data }) => {
  // Ensure data is defined before destructuring
  if (!data || typeof data !== 'object') {
    return null;
  }

  const {
    orders = [],
    ordersByTable = {},
    getStatusBadge = () => null,
    getPaymentMethodBadge = () => null,
    getPaymentStatusBadge = () => null,
    handleViewOrder = () => {},
    handlePrintOrder = () => {},
    handlePayment = () => {},
    handleEditOrder = () => {},
    handleOpenReceipt = () => {},
    handleSendWhatsAppReceipt = () => {},
    sendingWhatsApp = null,
    canEditOrders = false,
    formatCurrency = amount => String(amount),
  } = data;

  // Ensure orders is an array
  if (!Array.isArray(orders) || !orders[index]) {
    return null;
  }

  const { order, orderCountForTable } = orders[index] || {};

  if (!order) return null;

  return (
    <div style={style} className='px-2 pb-4'>
      <div
        className='border rounded-lg p-6 hover:bg-gray-50 transition-colors shadow-sm'
        data-testid={`order-${order.id}`}
      >
        {/* Order Header */}
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center space-x-4'>
            <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg'>
              #{order.id}
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 text-lg'>
                {order.order_number ||
                  order.orderNumber ||
                  `Order #${order.id}`}
              </h3>
              <div className='flex items-center gap-2 mb-1'>
                <p className='text-sm font-medium text-gray-900'>
                  {order.customer?.name ||
                    order.customer_name ||
                    order.customer ||
                    'Walk-in Customer'}
                </p>
                {order.customer?.id || order.customer_id ? (
                  <span className='text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium'>
                    ✅ Member
                  </span>
                ) : (
                  <span className='text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium'>
                    ⚠️ Bukan Member
                  </span>
                )}
                {orderCountForTable > 1 && (
                  <span className='text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium'>
                    🔄 {orderCountForTable} Orderan
                  </span>
                )}
                {order.payment_method && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      order.payment_method === 'cash'
                        ? 'bg-green-100 text-green-700'
                        : order.payment_method === 'card'
                        ? 'bg-blue-100 text-blue-700'
                        : order.payment_method === 'qris'
                        ? 'bg-purple-100 text-purple-700'
                        : order.payment_method === 'transfer'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {order.payment_method === 'cash'
                      ? 'Cash'
                      : order.payment_method === 'card'
                      ? 'Card'
                      : order.payment_method === 'qris'
                      ? 'QRIS'
                      : order.payment_method === 'transfer'
                      ? 'Transfer'
                      : order.payment_method}
                  </span>
                )}
              </div>
              <div className='flex items-center gap-2 text-xs text-gray-600'>
                {order.table?.name || order.table_name || order.table ? (
                  <>
                    <span className='font-medium text-blue-600'>
                      🪑 Meja:{' '}
                      {order.table?.name || order.table_name || order.table}
                    </span>
                    {order.table_id && (
                      <span className='text-gray-400'>
                        (ID: {order.table_id})
                      </span>
                    )}
                  </>
                ) : order.table_id ? (
                  <span className='font-medium text-blue-600'>
                    🪑 Meja: {order.table_id}
                  </span>
                ) : (
                  <span>📦 Take Away</span>
                )}
              </div>
              {(order.customer?.phone || order.customer_phone) && (
                <p className='text-xs text-gray-500 mt-0.5'>
                  📞 {order.customer?.phone || order.customer_phone}
                </p>
              )}
            </div>
          </div>
          <div className='flex items-center space-x-3'>
            {getStatusBadge(order.status)}
            {getPaymentStatusBadge(order.payment_status)}
            {/* ✅ NEW: Payment Method Badge - Always visible if order is paid */}
            {order.payment_status === 'paid' && (() => {
              // Get payment method from order.payment_method or from payments array
              const paymentMethod = order.payment_method || 
                (order.payments && order.payments.length > 0 
                  ? order.payments[order.payments.length - 1]?.payment_method || 
                    order.payments[order.payments.length - 1]?.method
                  : null) || 
                'cash';
              return getPaymentMethodBadge(paymentMethod);
            })()}
            <div className='text-right'>
              <p className='text-xl font-bold text-gray-900'>
                {formatCurrency(
                  order.total_amount || order.amount || order.total
                )}
              </p>
              <p className='text-sm text-gray-600'>
                {order.items?.length || 0} item
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className='mb-4'>
          <h4 className='text-sm font-medium text-gray-700 mb-2'>
            Item Pesanan:
          </h4>
          <div className='space-y-1'>
            {(order.items || []).map((item, idx) => {
              const quantity = item.qty || item.quantity || 0;
              const price = item.price || 0;
              const subtotal = item.subtotal || quantity * price;
              const productName =
                item.name || item.product_name || 'Unknown Product';
              const itemNotes = item.notes || item.note || null;

              return (
                <div key={idx} className='space-y-1'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-600'>
                      {productName} x {quantity}
                    </span>
                    <span className='font-medium'>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  {itemNotes && (
                    <div className='text-xs text-gray-500 italic pl-2 border-l-2 border-yellow-300'>
                      📝 {itemNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {order.notes && (
            <div className='mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-800'>
              <strong>Catatan:</strong> {order.notes}
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className='mb-4 border-t pt-3 space-y-1'>
          {/* ✅ FIX: Calculate subtotal if not available */}
          {(() => {
            const total = Number(order.total) || 0;
            const tax = Number(order.tax_amount) || 0;
            const discount = Number(order.discount_amount) || 0;
            // Formula: total = subtotal + tax - discount
            // Jadi: subtotal = total - tax + discount
            const calculatedSubtotal = order.subtotal
              ? Number(order.subtotal)
              : total - tax + discount;

            return (
              <>
                {/* ✅ FIX: Always show subtotal */}
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600'>Subtotal</span>
                  <span className='font-medium text-gray-900'>
                    {formatCurrency(calculatedSubtotal)}
                  </span>
                </div>

                {/* ✅ FIX: Always show discount if exists */}
                {discount > 0 && (
                  <div className='flex justify-between text-sm'>
                    <span className='text-green-600'>Diskon</span>
                    <span className='font-medium text-green-600'>
                      - {formatCurrency(discount)}
                    </span>
                  </div>
                )}

                {/* ✅ FIX: Always show tax (even if 0) to avoid confusion */}
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600'>Pajak</span>
                  <span className='font-medium text-gray-900'>
                    {formatCurrency(tax)}
                  </span>
                </div>

                <div className='flex justify-between items-center pt-2 border-t mt-2'>
                  <span className='font-semibold'>Total</span>
                  <span className='font-bold text-blue-600'>
                    {formatCurrency(total)}
                  </span>
                </div>
              </>
            );
          })()}
        </div>

        {/* Order Details */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-4'>
          <div>
            <p className='text-gray-600 font-medium'>Waktu Pesan</p>
            <p className='font-medium'>
              {order.time || order.created_at || order.createdAt || '-'}
            </p>
          </div>
          <div>
            <p className='text-gray-600 font-medium'>Metode Pembayaran</p>
            <div className='mt-1'>
              {(() => {
                // Get payment method from order.payment_method or from payments array
                const paymentMethod = order.payment_method || 
                  (order.payments && order.payments.length > 0 
                    ? order.payments[order.payments.length - 1]?.payment_method || 
                      order.payments[order.payments.length - 1]?.method
                    : null) || 
                  (order.payment_status === 'paid' ? 'cash' : null);
                return paymentMethod ? getPaymentMethodBadge(paymentMethod) : (
                  <span className='text-xs text-gray-500'>Belum ditentukan</span>
                );
              })()}
            </div>
          </div>
          <div>
            <p className='text-gray-600 font-medium'>Status Bayar</p>
            <div className='mt-1'>
              {getPaymentStatusBadge(order.payment_status || 'paid')}
            </div>
          </div>
          <div>
            <p className='text-gray-600 font-medium'>Kasir</p>
            <p className='font-medium'>{order.cashier || 'Unknown'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className='flex justify-end space-x-2 border-t pt-4 mt-4 flex-wrap'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => handleViewOrder(order.id)}
            title='Lihat Detail'
            data-testid={`view-order-${order.id}`}
          >
            <Eye className='w-4 h-4' />
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => handlePrintOrder(order.id)}
            title='Print Struk'
          >
            <Printer className='w-4 h-4' />
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => handleOpenReceipt(order.id)}
            title='Buka Kuitansi Online'
            className='text-blue-600 hover:text-blue-700'
          >
            <Receipt className='w-4 h-4' />
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => handleSendWhatsAppReceipt(order.id)}
            title='Kirim Kuitansi via WhatsApp'
            className='text-green-600 hover:text-green-700'
            disabled={sendingWhatsApp === order.id}
          >
            {sendingWhatsApp === order.id ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <MessageCircle className='w-4 h-4' />
            )}
          </Button>
          {(order.payment_status === 'pending' ||
            order.payment_status === 'unpaid' ||
            order.payment_status === 'failed') && (
            <Button
              size='sm'
              variant='default'
              className='bg-green-600 hover:bg-green-700 text-white'
              onClick={() => handlePayment(order.id)}
              title='Pilih Metode Pembayaran'
            >
              <DollarSign className='w-4 h-4 mr-1' />
              Bayar
            </Button>
          )}
          {canEditOrders && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => handleEditOrder(order.id)}
              title='Edit Order'
            >
              <Edit className='w-4 h-4' />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
OrderCardItem.displayName = 'OrderCardItem';

// ✅ OPTIMIZATION: Fixed item size (400px) for FixedSizeList
// Using fixed size for better performance with react-window

const SalesManagement = () => {
  const [selectedTab, setSelectedTab] = useState('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: '',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  // ✅ FIX: Gunakan custom hook untuk orders dari shift
  const {
    shiftOrders,
    usingShiftOrders,
    loadOrdersFromShift,
    resetShiftOrders,
  } = useShiftOrders();

  // Print and Edit modals
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Customer modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Payment modal (untuk pilihan pembayaran)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);

  // Retry payment modal (untuk Midtrans dari PaymentModal)
  const [retryPaymentModalOpen, setRetryPaymentModalOpen] = useState(false);
  const [retryPaymentData, setRetryPaymentData] = useState(null);

  // ✅ NEW: Confirmation modals untuk refund dan delete
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToRefund, setOrderToRefund] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);

  // ✅ NEW: WhatsApp receipt state
  const [sendingWhatsApp, setSendingWhatsApp] = useState(null);

  // Auth context
  const { user } = useAuth();
  const { toast } = useToast();

  // ✅ FIX: State untuk active shift (jika user adalah kasir)
  const [activeShift, setActiveShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(false);

  // Use custom hook for sales data
  const {
    loading,
    error,
    stats,
    orders,
    customers,
    pagination,
    fetchStats,
    fetchOrders,
    fetchCustomers,
    updateOrderStatus,
    cancelOrder,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    exportData,
    refreshData,
    debug,
    setError,
  } = useSales();

  // Unified effect untuk load data saat mount atau filter berubah - RESPONSIF
  useEffect(() => {
    // Skip jika user belum ada
    if (!user) return;

    // Skip jika custom range dipilih tapi tanggal belum lengkap
    if (
      dateRange === 'custom' &&
      (!customDateRange.start || !customDateRange.end)
    ) {
      return;
    }

    const loadData = async () => {
      try {
        console.log('🔄 Loading data with filters...', {
          dateRange,
          customDateRange,
        });

        // Prepare date params for custom range
        let dateParams = { dateRange };
        if (
          dateRange === 'custom' &&
          customDateRange.start &&
          customDateRange.end
        ) {
          dateParams = {
            date_from: customDateRange.start,
            date_to: customDateRange.end,
          };
        }

        // ✅ FIX: Load active shift untuk kasir (jika ada)
        let currentActiveShift = null;
        if (
          user &&
          ['kasir', 'admin', 'waiter', 'kitchen'].includes(user.role)
        ) {
          try {
            setLoadingShift(true);
            const shiftResult = await shiftService.getActiveShift();
            if (shiftResult.success && shiftResult.data?.has_active_shift) {
              currentActiveShift = shiftResult.data.data;
              setActiveShift(currentActiveShift);
              console.log(
                '✅ Active shift found for sales page:',
                currentActiveShift
              );
            } else {
              setActiveShift(null);
            }
          } catch (error) {
            console.error('❌ Error loading active shift:', error);
            setActiveShift(null);
          } finally {
            setLoadingShift(false);
          }
        }

        // ✅ FIX: Jika ada shift aktif dan dateRange = 'today', gunakan data dari shift untuk stats
        // Tetap fetch stats untuk mendapatkan struktur data yang benar, lalu kita override di render
        if (
          dateRange === 'custom' &&
          customDateRange.start &&
          customDateRange.end
        ) {
          await fetchStats({
            date_from: customDateRange.start,
            date_to: customDateRange.end,
          });
        } else {
          await fetchStats(dateRange);
        }

        if (selectedTab === 'orders') {
          // ✅ FIX: Gunakan custom hook untuk load orders dari shift
          const shiftOrdersResult = await loadOrdersFromShift({
            activeShift: currentActiveShift,
            dateRange,
            searchTerm,
            statusFilter,
          });

          // ✅ FIX: Jika tidak menggunakan shift orders, gunakan fetchOrders API
          // Backend sudah diupdate untuk filter berdasarkan shift_id aktif untuk paid orders
          // dan tetap menampilkan unpaid orders dari outlet yang sama
          if (!shiftOrdersResult.fromShift || !shiftOrdersResult.success) {
            resetShiftOrders();
            // ✅ FIX: Jika ada shift aktif dan dateRange = 'today', gunakan 'today' agar backend filter berdasarkan shift_id
            // Jika custom date range, backend tetap akan filter berdasarkan shift_id jika ada shift aktif
            const finalDateParams =
              activeShift && activeShift.id && dateRange === 'today'
                ? { dateRange: 'today' } // ✅ FIX: Gunakan 'today' agar backend filter berdasarkan shift_id
                : dateParams;
            await fetchOrders({
              page: 1, // Reset to page 1 when filters change
              limit: 10, // ✅ FIX: 10 orders per page (dengan pagination)
              search: searchTerm,
              status: statusFilter,
              ...finalDateParams,
            });
          }
        } else if (selectedTab === 'customers') {
          await fetchCustomers({
            page: 1, // Reset to page 1 when filters change
            limit: 10, // ✅ FIX: 10 customers per page (dengan pagination)
            search: searchTerm,
          });
        }

        // ✅ FIX: Recalculate status counts
        // Jika ada shift aktif dan dateRange = 'today', gunakan orders dari shift untuk completedCount
        if (selectedTab === 'orders') {
          if (
            currentActiveShift &&
            currentActiveShift.id &&
            dateRange === 'today'
          ) {
            // ✅ FIX: Gunakan shift detail untuk mendapatkan orders yang sama dengan perhitungan shift
            try {
              const shiftDetailResult = await shiftService.getShiftDetail(
                currentActiveShift.id
              );

              if (shiftDetailResult.success && shiftDetailResult.data?.orders) {
                const shiftOrders = shiftDetailResult.data.orders || [];

                let pend = 0;
                let proc = 0;
                let comp = 0;

                // ✅ FIX: Orders dari shift sudah di-filter payment_status = 'paid' di backend
                // Jadi semua orders seharusnya sudah paid/completed
                shiftOrders.forEach(o => {
                  const st = (o.status || '').toLowerCase();
                  const ps = (o.payment_status || '').toLowerCase();
                  if (ps === 'paid' || st === 'completed' || st === 'success') {
                    comp += 1;
                  } else if (
                    ps === 'pending' ||
                    ps === 'unpaid' ||
                    st === 'pending'
                  ) {
                    pend += 1;
                  } else if (
                    ['processing', 'confirmed', 'preparing', 'ready'].includes(
                      st
                    )
                  ) {
                    proc += 1;
                  }
                });

                // ✅ FIX: Pastikan completedCount sama dengan total_transactions dari shift
                // Karena orders dari shift sudah filtered payment_status = 'paid'
                // Gunakan total_transactions langsung untuk memastikan konsistensi
                const finalCompletedCount =
                  currentActiveShift.total_transactions ||
                  shiftOrders.length ||
                  comp ||
                  0;

                setPendingCount(pend);
                setProcessingCount(proc);
                setCompletedCount(finalCompletedCount);

                console.log('✅ Status counts from shift:', {
                  pending: pend,
                  processing: proc,
                  completed: finalCompletedCount,
                  calculated_completed: comp,
                  total_orders: shiftOrders.length,
                  shift_total_transactions:
                    currentActiveShift.total_transactions,
                });
              } else {
                // Fallback ke method lama jika shift detail gagal
                throw new Error('Shift detail tidak berhasil');
              }
            } catch (error) {
              console.warn(
                '⚠️ Error loading shift detail, fallback ke getOrders API:',
                error
              );
              // Fallback ke method lama
              const pageSize = 50;
              let page = 1;
              let pend = 0;
              let proc = 0;
              let comp = 0;
              const extractArray = d =>
                Array.isArray(d) ? d : Array.isArray(d?.orders) ? d.orders : [];

              while (page <= 50) {
                const res = await salesService.getOrders({
                  page,
                  limit: pageSize,
                  ...dateParams,
                });
                let data = res?.data || res;
                if (data && data.data && typeof data.data === 'object')
                  data = data.data;

                const arr = extractArray(data);
                arr.forEach(o => {
                  const st = (o.status || '').toLowerCase();
                  const ps = (o.payment_status || '').toLowerCase();
                  if (ps === 'paid' || st === 'completed' || st === 'success')
                    comp += 1;
                  else if (
                    ps === 'pending' ||
                    ps === 'unpaid' ||
                    st === 'pending'
                  )
                    pend += 1;
                  else if (
                    ['processing', 'confirmed', 'preparing', 'ready'].includes(
                      st
                    )
                  )
                    proc += 1;
                });

                if (arr.length < pageSize) break;
                page += 1;
              }

              setPendingCount(pend);
              setProcessingCount(proc);
              setCompletedCount(comp);
            }
          } else {
            // Tidak ada shift aktif, gunakan method lama
            const pageSize = 50;
            let page = 1;
            let pend = 0;
            let proc = 0;
            let comp = 0;
            const extractArray = d =>
              Array.isArray(d) ? d : Array.isArray(d?.orders) ? d.orders : [];

            while (page <= 50) {
              const res = await salesService.getOrders({
                page,
                limit: pageSize,
                ...dateParams,
              });
              let data = res?.data || res;
              if (data && data.data && typeof data.data === 'object')
                data = data.data;

              const arr = extractArray(data);
              arr.forEach(o => {
                const st = (o.status || '').toLowerCase();
                const ps = (o.payment_status || '').toLowerCase();
                if (ps === 'paid' || st === 'completed' || st === 'success')
                  comp += 1;
                else if (
                  ps === 'pending' ||
                  ps === 'unpaid' ||
                  st === 'pending'
                )
                  pend += 1;
                else if (
                  ['processing', 'confirmed', 'preparing', 'ready'].includes(st)
                )
                  proc += 1;
              });

              if (arr.length < pageSize) break;
              page += 1;
            }

            setPendingCount(pend);
            setProcessingCount(proc);
            setCompletedCount(comp);
          }
        }

        console.log('✅ Data loaded successfully');
      } catch (err) {
        console.error('❌ Error loading data:', err);
        setError('Gagal memuat data. Silakan coba lagi.');
      }
    };

    // Load data immediately saat filter berubah
    loadData();
  }, [
    // Dependencies: trigger reload saat filter berubah
    user,
    selectedTab,
    searchTerm,
    statusFilter,
    dateRange,
    customDateRange.start,
    customDateRange.end,
    fetchOrders,
    fetchCustomers,
    fetchStats,
  ]);

  // Disable page-based override for status count to avoid following pagination
  useEffect(() => {
    // intentionally left blank
  }, [orders]);

  // ✅ REMOVED: useKeyboardShortcuts moved below after handleRefresh is defined

  // ✅ OPTIMIZATION: Memoize ordersByTable calculation
  const allOrders = useMemo(() => {
    return usingShiftOrders ? shiftOrders : orders || [];
  }, [usingShiftOrders, shiftOrders, orders]);

  const ordersByTable = useMemo(() => {
    const grouped = {};
    if (!Array.isArray(allOrders)) {
      return grouped;
    }

    allOrders.forEach(o => {
      if (!o) return;
      const tableId = o.table_id || o.table?.id;
      if (tableId) {
        if (!grouped[tableId]) {
          grouped[tableId] = [];
        }
        grouped[tableId].push(o);
      }
    });
    return grouped;
  }, [allOrders]);

  // ✅ OPTIMIZATION: Prepare data for virtual scrolling
  const listItemData = useMemo(() => {
    if (!Array.isArray(allOrders)) {
      return [];
    }

    const safeOrdersByTable =
      ordersByTable && typeof ordersByTable === 'object' ? ordersByTable : {};

    return allOrders.map((order, index) => {
      const tableId = order?.table_id || order?.table?.id;
      const orderCountForTable =
        tableId && safeOrdersByTable[tableId]
          ? safeOrdersByTable[tableId].filter(
              o =>
                o?.payment_status === 'pending' ||
                o?.payment_status === 'unpaid'
            ).length
          : 1;

      return {
        order: order || {},
        orderCountForTable,
        index,
      };
    });
  }, [allOrders, ordersByTable]);

  // ✅ OPTIMIZATION: Memoize getStatusBadge function
  // Moved before itemData useMemo to avoid "Cannot access before initialization" error
  const getStatusBadge = useCallback(status => {
    const statusConfig = {
      completed: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Selesai',
        icon: CheckCircle,
      },
      processing: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Diproses',
        icon: Clock,
      },
      pending: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'Menunggu',
        icon: AlertCircle,
      },
      cancelled: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Dibatalkan',
        icon: XCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge
        className={`${config.color} border font-medium flex items-center space-x-1`}
      >
        <Icon className='w-3 h-3' />
        <span>{config.label}</span>
      </Badge>
    );
  }, []);

  // ✅ OPTIMIZATION: Memoize getPaymentMethodBadge function
  // Moved before itemData useMemo to avoid "Cannot access before initialization" error
  const getPaymentMethodBadge = useCallback(method => {
    const methodConfig = {
      cash: { color: 'bg-gray-100 text-gray-800', label: 'Tunai' },
      card: { color: 'bg-blue-100 text-blue-800', label: 'Kartu' },
      midtrans: { color: 'bg-purple-100 text-purple-800', label: 'Midtrans' },
      qris: { color: 'bg-purple-100 text-purple-800', label: 'QRIS' },
      transfer: { color: 'bg-blue-100 text-blue-800', label: 'Transfer' },
      digital: { color: 'bg-purple-100 text-purple-800', label: 'Digital' },
    };

    const config = methodConfig[method] || methodConfig.cash;

    return (
      <Badge className={`${config.color} font-medium`}>{config.label}</Badge>
    );
  }, []);

  // ✅ OPTIMIZATION: Memoize getPaymentStatusBadge function
  // Moved before itemData useMemo to avoid "Cannot access before initialization" error
  const getPaymentStatusBadge = useCallback(paymentStatus => {
    const statusConfig = {
      paid: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Lunas',
        icon: CheckCircle,
      },
      pending: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'Pending',
        icon: Clock,
      },
      unpaid: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Belum Bayar',
        icon: AlertCircle,
      },
      failed: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Gagal',
        icon: XCircle,
      },
    };

    const config = statusConfig[paymentStatus] || statusConfig.unpaid;
    const Icon = config.icon;

    return (
      <Badge
        className={`${config.color} border font-medium flex items-center space-x-1`}
      >
        <Icon className='w-3 h-3' />
        <span>{config.label}</span>
      </Badge>
    );
  }, []);

  const getCustomerStatusBadge = status => {
    const statusConfig = {
      VIP: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'VIP',
      },
      Regular: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        label: 'Regular',
      },
      New: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Baru',
      },
    };

    const config = statusConfig[status] || statusConfig.Regular;

    return (
      <Badge className={`${config.color} border font-medium`}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // ✅ OPTIMIZATION: Memoize itemData for VariableSizeList
  // Print, Edit, and View handlers - moved before useMemo to avoid initialization error
  const handlePrintOrder = useCallback(orderId => {
    setSelectedOrderId(orderId);
    setPrintModalOpen(true);
  }, []);

  const handleEditOrder = useCallback(orderId => {
    setSelectedOrderId(orderId);
    setEditModalOpen(true);
  }, []);

  const handleViewOrder = useCallback(orderId => {
    setSelectedOrderId(orderId);
    setPrintModalOpen(true);
  }, []);

  // Handle payment untuk order yang belum dibayar - moved before useMemo
  const handlePayment = useCallback(
    orderId => {
      // Cari order dari list
      const orderList = usingShiftOrders ? shiftOrders : orders || [];
      const order = orderList.find(o => o.id === orderId);

      if (!order) {
        toast.error('Order tidak ditemukan');
        return;
      }

      // Set order untuk payment modal
      setSelectedOrderForPayment(order);
      setPaymentModalOpen(true);
    },
    [usingShiftOrders, shiftOrders, orders, toast]
  );

  // ✅ NEW: Handle open receipt online
  const handleOpenReceipt = useCallback(async orderId => {
    try {
      const response = await salesService.getOrderById(orderId);
      if (response?.success && response?.data) {
        const receiptUrl =
          response.data.receipt_url || response.data.receipt_token;
        if (receiptUrl) {
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
  }, []);

  // ✅ NEW: Handle send WhatsApp receipt
  const handleSendWhatsAppReceipt = useCallback(async orderId => {
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
  }, []);

  // Check if user can edit orders - moved before useMemo
  const canEditOrders = ['super_admin', 'owner', 'admin'].includes(user?.role);

  // Placed after all functions are defined to avoid "Cannot access before initialization" error
  // Always return a valid object to prevent "Cannot convert undefined or null to object" error
  // Create default fallback object to ensure itemData is always valid
  // Use object literal directly (not useMemo) to ensure it's always available
  const defaultItemData = {
    orders: [],
    ordersByTable: {},
    getStatusBadge: () => null,
    getPaymentMethodBadge: () => null,
    getPaymentStatusBadge: () => null,
    handleViewOrder: () => {},
    handlePrintOrder: () => {},
    handlePayment: () => {},
    handleEditOrder: () => {},
    handleOpenReceipt: () => {},
    handleSendWhatsAppReceipt: () => {},
    sendingWhatsApp: null,
    canEditOrders: false,
    formatCurrency: amount => String(amount || 0),
  };

  const itemData = useMemo(() => {
    // Ensure all values are defined before creating the object
    // This prevents "Cannot convert undefined or null to object" error in react-window
    const safeListItemData = Array.isArray(listItemData) ? listItemData : [];
    const safeOrdersByTable =
      ordersByTable &&
      typeof ordersByTable === 'object' &&
      !Array.isArray(ordersByTable)
        ? ordersByTable
        : {};

    // Ensure all functions are defined - use fallbacks if undefined
    const safeGetStatusBadge =
      typeof getStatusBadge === 'function'
        ? getStatusBadge
        : defaultItemData.getStatusBadge;
    const safeGetPaymentMethodBadge =
      typeof getPaymentMethodBadge === 'function'
        ? getPaymentMethodBadge
        : defaultItemData.getPaymentMethodBadge;
    const safeGetPaymentStatusBadge =
      typeof getPaymentStatusBadge === 'function'
        ? getPaymentStatusBadge
        : defaultItemData.getPaymentStatusBadge;
    const safeHandleViewOrder =
      typeof handleViewOrder === 'function'
        ? handleViewOrder
        : defaultItemData.handleViewOrder;
    const safeHandlePrintOrder =
      typeof handlePrintOrder === 'function'
        ? handlePrintOrder
        : defaultItemData.handlePrintOrder;
    const safeHandlePayment =
      typeof handlePayment === 'function'
        ? handlePayment
        : defaultItemData.handlePayment;
    const safeHandleEditOrder =
      typeof handleEditOrder === 'function'
        ? handleEditOrder
        : defaultItemData.handleEditOrder;
    const safeHandleOpenReceipt =
      typeof handleOpenReceipt === 'function'
        ? handleOpenReceipt
        : defaultItemData.handleOpenReceipt;
    const safeHandleSendWhatsAppReceipt =
      typeof handleSendWhatsAppReceipt === 'function'
        ? handleSendWhatsAppReceipt
        : defaultItemData.handleSendWhatsAppReceipt;
    const safeFormatCurrency =
      typeof formatCurrency === 'function'
        ? formatCurrency
        : defaultItemData.formatCurrency;

    // Always return a valid object - never null or undefined
    const result = {
      orders: safeListItemData,
      ordersByTable: safeOrdersByTable,
      getStatusBadge: safeGetStatusBadge,
      getPaymentMethodBadge: safeGetPaymentMethodBadge,
      getPaymentStatusBadge: safeGetPaymentStatusBadge,
      handleViewOrder: safeHandleViewOrder,
      handlePrintOrder: safeHandlePrintOrder,
      handlePayment: safeHandlePayment,
      handleEditOrder: safeHandleEditOrder,
      handleOpenReceipt: safeHandleOpenReceipt,
      handleSendWhatsAppReceipt: safeHandleSendWhatsAppReceipt,
      sendingWhatsApp: sendingWhatsApp,
      canEditOrders: Boolean(canEditOrders),
      formatCurrency: safeFormatCurrency,
    };

    // Double check - ensure result is always a valid object
    return result && typeof result === 'object' ? result : defaultItemData;
  }, [
    listItemData,
    ordersByTable,
    getStatusBadge,
    getPaymentMethodBadge,
    getPaymentStatusBadge,
    handleViewOrder,
    handlePrintOrder,
    handlePayment,
    handleEditOrder,
    handleOpenReceipt,
    handleSendWhatsAppReceipt,
    sendingWhatsApp,
    canEditOrders,
    formatCurrency,
  ]);

  // Ensure itemData is always defined - use defaultItemData as fallback
  // This is critical to prevent "Cannot convert undefined or null to object" error in react-window
  // react-window's useMemoizedObject calls Object.values() on itemData, so it must never be null/undefined
  // Use a simple check and always return a valid object
  const safeItemData = useMemo(() => {
    // CRITICAL: Always return defaultItemData if itemData is not valid
    // This ensures safeItemData is ALWAYS a valid object
    if (
      !itemData ||
      typeof itemData !== 'object' ||
      Array.isArray(itemData) ||
      itemData === null ||
      !('orders' in itemData) ||
      !('ordersByTable' in itemData) ||
      !('getStatusBadge' in itemData) ||
      !('handleViewOrder' in itemData) ||
      !('formatCurrency' in itemData)
    ) {
      // Return defaultItemData immediately if itemData is invalid
      return defaultItemData;
    }

    // If itemData is valid, merge it with defaultItemData to ensure all properties exist
    const result = { ...defaultItemData, ...itemData };

    // Final validation - ensure result is always valid
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return defaultItemData;
    }

    return result;
  }, [itemData, defaultItemData]);

  // CRITICAL: Ensure safeItemData is always defined - use defaultItemData as absolute fallback
  // This prevents any possibility of undefined/null being passed to List component
  // Use useRef to store the guaranteed value to ensure it's always available
  // Initialize with a copy of defaultItemData to ensure it's always a valid object
  const guaranteedItemDataRef = useRef({ ...defaultItemData });

  // Update ref whenever safeItemData changes, but always ensure it's a valid object
  useEffect(() => {
    if (
      safeItemData &&
      typeof safeItemData === 'object' &&
      !Array.isArray(safeItemData) &&
      safeItemData !== null &&
      safeItemData !== undefined
    ) {
      // Verify it has required properties before using it
      if ('orders' in safeItemData && 'ordersByTable' in safeItemData) {
        guaranteedItemDataRef.current = safeItemData;
      } else {
        guaranteedItemDataRef.current = { ...defaultItemData };
      }
    } else {
      guaranteedItemDataRef.current = { ...defaultItemData };
    }
  }, [safeItemData, defaultItemData]);

  // ✅ FIX: Handle pagination for orders dengan limit yang lebih besar
  const handlePageChange = page => {
    console.log('🔄 Page change requested:', page);

    // ✅ FIX: Prepare date params untuk pagination
    let dateParams = { dateRange };
    if (
      dateRange === 'custom' &&
      customDateRange.start &&
      customDateRange.end
    ) {
      dateParams = {
        date_from: customDateRange.start,
        date_to: customDateRange.end,
      };
    }

    // ✅ FIX: Jika ada shift aktif dan dateRange = 'today', gunakan date range dari shift
    if (activeShift && activeShift.id && dateRange === 'today') {
      const shiftDateParams = {
        date_from: activeShift.opened_at
          ? new Date(activeShift.opened_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        date_to: new Date().toISOString().split('T')[0],
      };

      fetchOrders({
        page,
        limit: 10, // ✅ FIX: 10 orders per page (lebih reasonable)
        search: searchTerm,
        status: statusFilter === 'all' ? undefined : statusFilter,
        ...shiftDateParams,
      });
    } else {
      fetchOrders({
        page,
        limit: 10, // ✅ FIX: 10 orders per page (lebih reasonable)
        search: searchTerm,
        status: statusFilter === 'all' ? undefined : statusFilter,
        ...dateParams,
      });
    }
  };

  // ✅ FIX: Handle pagination for customers dengan limit yang lebih besar
  const handleCustomerPageChange = page => {
    console.log('🔄 Customer page change requested:', page);
    fetchCustomers({
      page,
      limit: 10, // ✅ FIX: 10 customers per page
      search: searchTerm,
    });
  };

  // Print, Edit, and View handlers - already defined above with useCallback

  // ✅ NEW: Handle refund order - buka modal konfirmasi
  const handleRefundOrder = orderId => {
    const orderList = usingShiftOrders ? shiftOrders : orders || [];
    const order = orderList.find(o => o.id === orderId);
    setOrderToRefund(order);
    setRefundConfirmOpen(true);
  };

  // ✅ NEW: Execute refund setelah konfirmasi
  const executeRefund = async () => {
    if (!orderToRefund) return;

    try {
      const result = await orderService.refund(orderToRefund.id);
      if (result.success) {
        toast.success(
          'Order berhasil direfund. Perhitungan shift telah diupdate.'
        );
        setRefundConfirmOpen(false);
        setOrderToRefund(null);

        // ✅ FIX: Refresh stats dan orders untuk sinkronisasi
        const dateParams =
          dateRange === 'custom' && customDateRange.start && customDateRange.end
            ? { date_from: customDateRange.start, date_to: customDateRange.end }
            : { dateRange };

        await fetchStats(dateParams);
        await fetchOrders({
          page: pagination?.current_page || 1,
          limit: 10,
          search: searchTerm,
          status: statusFilter,
          ...dateParams,
        });
      } else {
        toast.error(result.error || 'Gagal me-refund order');
      }
    } catch (error) {
      console.error('Refund error:', error);
      toast.error(
        'Gagal me-refund order: ' + (error.message || 'Unknown error')
      );
    }
  };

  // ✅ NEW: Handle delete order - buka modal konfirmasi
  const handleDeleteOrder = orderId => {
    const orderList = usingShiftOrders ? shiftOrders : orders || [];
    const order = orderList.find(o => o.id === orderId);
    setOrderToDelete(order);
    setDeleteConfirmOpen(true);
  };

  // ✅ NEW: Execute delete setelah konfirmasi
  const executeDelete = async () => {
    if (!orderToDelete) return;

    try {
      const result = await orderService.delete(orderToDelete.id);
      if (result.success) {
        toast.success(
          'Order berhasil dihapus. Perhitungan shift telah diupdate.'
        );
        setDeleteConfirmOpen(false);
        setOrderToDelete(null);

        // ✅ FIX: Refresh stats dan orders untuk sinkronisasi
        const dateParams =
          dateRange === 'custom' && customDateRange.start && customDateRange.end
            ? { date_from: customDateRange.start, date_to: customDateRange.end }
            : { dateRange };

        await fetchStats(dateParams);
        await fetchOrders({
          page: pagination?.current_page || 1,
          limit: 10,
          search: searchTerm,
          status: statusFilter,
          ...dateParams,
        });
      } else {
        toast.error(result.error || 'Gagal menghapus order');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(
        'Gagal menghapus order: ' + (error.message || 'Unknown error')
      );
    }
  };

  // ✅ FIX: Handle payment untuk order yang belum dibayar - already moved above with useCallback

  // ✅ FIX: Handle payment completion dari PaymentModal
  const handlePaymentComplete = async paymentData => {
    if (!selectedOrderForPayment) return;

    try {
      const loadingToast = toast({
        message: 'Memproses pembayaran...',
        type: 'info',
        duration: 0,
      });

      // ✅ FIX: Apply discount ke order jika ada (sebelum payment)
      if (paymentData.discountCode && paymentData.discount > 0) {
        toast({
          message: 'Menerapkan diskon ke order...',
          type: 'info',
          id: loadingToast,
        });

        const { orderService } = await import('../../services/order.service');

        // Apply discount ke order
        const discountResult = await orderService.applyDiscount(
          selectedOrderForPayment.id,
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
          setSelectedOrderForPayment(updatedOrder);
          // Update paymentData.total dengan total baru
          paymentData.total = updatedOrder.total;
        }

        // ✅ FIX: Reload orders - refresh data untuk mendapatkan order terbaru dengan discount
        await refreshData();
        toast({
          message: 'Memproses pembayaran...',
          type: 'info',
          id: loadingToast,
        });
      }

      // ✅ FIX: Jika Midtrans/QRIS, PaymentModal sudah handle sendiri
      // PaymentModal akan membuka QRISPaymentModal dengan snap token
      // Kita tidak perlu process payment lagi di sini
      if (paymentData.method === 'midtrans' || paymentData.method === 'qris') {
        toast.dismiss(loadingToast);
        // PaymentModal sudah handle dan akan membuka QRISPaymentModal
        // PaymentModal masih open sampai QRISPaymentModal handle success
        return;
      }

      // ✅ FIX: Process payment untuk method lain (cash, card, transfer)
      const { orderService } = await import('../../services/order.service');

      const paymentResult = await orderService.processPayment(
        selectedOrderForPayment.id,
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

      toast.dismiss(loadingToast);

      if (!paymentResult.success) {
        const paymentError =
          paymentResult.error || 'Gagal memproses pembayaran';
        toast.error(`❌ Pembayaran gagal: ${paymentError}`, {
          duration: 5000,
        });
        return;
      }

      // ✅ FIX: Payment berhasil untuk cash/card/transfer
      toast.success('✅ Pembayaran berhasil!', { duration: 3000 });

      // Close payment modal
      setPaymentModalOpen(false);
      setSelectedOrderForPayment(null);

      // Refresh data
      await refreshData();
    } catch (error) {
      toast.dismiss();
      console.error('Payment error:', error);
      toast.error(
        error.message || 'Terjadi kesalahan saat memproses pembayaran',
        { duration: 5000 }
      );
    }
  };

  const handleOrderUpdated = async updatedOrder => {
    // ✅ FIX: Refresh orders data instead of using setOrders (not available from useSales hook)
    setEditModalOpen(false);

    // Prepare date params
    let dateParams = { dateRange };
    if (
      dateRange === 'custom' &&
      customDateRange.start &&
      customDateRange.end
    ) {
      dateParams = {
        date_from: customDateRange.start,
        date_to: customDateRange.end,
      };
    }

    // ✅ FIX: Refresh stats juga untuk sinkronisasi dengan kasir
    await fetchStats(
      dateRange === 'custom' && customDateRange.start && customDateRange.end
        ? { date_from: customDateRange.start, date_to: customDateRange.end }
        : dateRange
    );

    // Refresh orders list
    await fetchOrders({
      page: pagination?.current_page || 1,
      limit: 10, // ✅ FIX: 10 orders per page (dengan pagination)
      search: searchTerm,
      status: statusFilter,
      ...dateParams,
    });

    toast({
      title: 'Berhasil!',
      description:
        'Pesanan berhasil diperbarui. Perhitungan shift telah diupdate.',
      type: 'success',
      duration: 3000,
    });
  };

  // Customer handlers
  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setCustomerModalOpen(true);
  };

  const handleEditCustomer = customer => {
    setSelectedCustomer(customer);
    setCustomerModalOpen(true);
  };

  const handleCustomerSaved = updatedCustomer => {
    // Refresh customers list
    fetchCustomers({ search: searchTerm });
    setCustomerModalOpen(false);
  };

  // Check if user can edit orders (admin or owner only)
  // canEditOrders already moved above before useMemo

  // Handle refresh - hanya refresh data penjualan tanpa reload halaman
  const handleRefresh = async () => {
    if (loading || refreshing) {
      return; // Prevent multiple simultaneous refreshes
    }

    setRefreshing(true);
    try {
      // Prepare date params for custom range
      let dateParams = { dateRange };
      if (
        dateRange === 'custom' &&
        customDateRange.start &&
        customDateRange.end
      ) {
        dateParams = {
          date_from: customDateRange.start,
          date_to: customDateRange.end,
        };
      }

      // Fetch stats
      if (
        dateRange === 'custom' &&
        customDateRange.start &&
        customDateRange.end
      ) {
        await fetchStats({
          date_from: customDateRange.start,
          date_to: customDateRange.end,
        });
      } else {
        await fetchStats(dateRange);
      }

      // Fetch orders or customers based on selected tab
      if (selectedTab === 'orders') {
        // ✅ FIX: Jika ada shift aktif dan dateRange = 'today', gunakan date range dari shift
        if (activeShift && activeShift.id && dateRange === 'today') {
          const shiftDateParams = {
            date_from: activeShift.opened_at
              ? new Date(activeShift.opened_at).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            date_to: new Date().toISOString().split('T')[0],
          };

          await fetchOrders({
            page: pagination?.current_page || 1,
            limit: 10, // ✅ FIX: 10 orders per page (dengan pagination)
            search: searchTerm,
            status: statusFilter === 'all' ? undefined : statusFilter,
            ...shiftDateParams,
          });
        } else {
          await fetchOrders({
            page: pagination?.current_page || 1,
            limit: 10, // ✅ FIX: 10 orders per page (dengan pagination)
            search: searchTerm,
            status: statusFilter,
            ...dateParams,
          });
        }
      } else if (selectedTab === 'customers') {
        await fetchCustomers({
          page: pagination?.current_page || 1,
          limit: 10, // ✅ FIX: 10 customers per page (dengan pagination)
          search: searchTerm,
        });
      }

      toast({
        title: 'Berhasil!',
        description: 'Data penjualan berhasil dimuat ulang',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'Error!',
        description: 'Gagal memuat ulang data penjualan',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ FIX: KEYBOARD SHORTCUTS for Sales Management (moved here after handleRefresh is defined)
  useKeyboardShortcuts(
    {
      F5: () => {
        // F5: Refresh orders data - prevent default browser reload (handled by useKeyboardShortcuts)
        if (!refreshing && !loading) {
          handleRefresh();
        }
      },
      R: () => {
        // R: Refresh orders data
        if (!refreshing && !loading) {
          handleRefresh();
        }
      },
      F3: () => {
        // F3: Focus search
        const searchInput = document.querySelector('[placeholder*="Cari"]');
        if (searchInput) searchInput.focus();
      },
      Escape: () => {
        // ESC: Clear filters
        setSearchTerm('');
        setStatusFilter('all');
        setDateRange('today');
      },
    },
    [
      handleRefresh,
      refreshing,
      loading,
      selectedTab,
      dateRange,
      customDateRange,
      searchTerm,
      statusFilter,
      pagination,
      fetchOrders,
      fetchCustomers,
    ]
  );

  // Handle reset filter - kembalikan ke default
  const handleResetFilter = () => {
    setDateRange('today');
    setCustomDateRange({ start: '', end: '' });
    // Data akan auto-load karena dateRange berubah
  };

  // Handle export
  const handleExport = async () => {
    try {
      await exportData(selectedTab, 'excel', {
        search: searchTerm,
        status: statusFilter,
        date_range: dateRange,
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Date range options (RBAC)
  const allDateRangeOptions = [
    { value: 'today', label: 'Harian' }, // ✅ FIX: Label lebih jelas untuk owner
    { value: 'yesterday', label: 'Kemarin' },
    { value: 'week', label: 'Mingguan' }, // ✅ FIX: Label lebih jelas untuk owner
    { value: 'month', label: 'Bulanan' }, // ✅ FIX: Label lebih jelas untuk owner
    { value: 'custom', label: 'Custom Date' }, // ✅ FIX: Label lebih jelas untuk owner
  ];
  const isCashier = user?.role === 'kasir';
  const isOwnerOrAdmin = ['owner', 'admin', 'super_admin'].includes(user?.role);
  // ✅ FIX: Owner/Admin dapat akses semua filter, kasir hanya hari ini dan mingguan
  const dateRangeOptions = isCashier
    ? allDateRangeOptions.filter(opt => ['today', 'week'].includes(opt.value))
    : isOwnerOrAdmin
    ? allDateRangeOptions // ✅ Owner/Admin: Harian, Mingguan, Bulanan, Custom Date
    : allDateRangeOptions;

  // ✅ FIX: Helper function untuk mendapatkan label penjualan berdasarkan dateRange
  const getSalesLabel = () => {
    if (
      dateRange === 'custom' &&
      customDateRange.start &&
      customDateRange.end
    ) {
      return 'Penjualan (Custom)';
    }
    const rangeOption = allDateRangeOptions.find(
      opt => opt.value === dateRange
    );
    return rangeOption
      ? `Penjualan ${rangeOption.label}`
      : 'Penjualan Hari Ini';
  };

  // ✅ FIX: Helper function untuk mendapatkan teks perbandingan berdasarkan dateRange
  const getComparisonText = () => {
    switch (dateRange) {
      case 'today':
        return 'dari kemarin';
      case 'yesterday':
        return 'dari hari sebelumnya';
      case 'week':
        return 'dari minggu sebelumnya';
      case 'month':
        return 'dari bulan sebelumnya';
      case 'custom':
        return 'dari periode sebelumnya';
      default:
        return 'dari kemarin';
    }
  };

  // Ensure kasir's selection stays within allowed options
  useEffect(() => {
    if (isCashier && !['today', 'week'].includes(dateRange)) {
      setDateRange('today');
    }
  }, [isCashier, dateRange]);

  return (
    <div className='space-y-6'>
      {/* Error Display */}
      {error && (
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg'>
          <div className='flex items-center gap-2'>
            <AlertCircle className='w-5 h-5' />
            <div>
              <p className='font-semibold'>Error!</p>
              <p className='text-sm'>{error}</p>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setError(null)}
              className='ml-auto'
            >
              <XCircle className='w-4 h-4' />
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between'>
          <div>
            <h2 className='text-2xl font-bold text-gray-900'>
              Manajemen Penjualan
            </h2>
            <p className='text-gray-600'>Kelola pesanan dan data pelanggan</p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={handleRefresh}
              disabled={loading || refreshing}
              data-testid='refresh-data'
              title='Refresh data penjualan'
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button
              variant='outline'
              onClick={handleExport}
              data-testid='export-data'
              disabled={loading || refreshing}
            >
              <Download className='w-4 h-4 mr-2' />
              Export
            </Button>
            <Button
              variant='outline'
              onClick={debug}
              data-testid='debug-api'
              disabled={loading || refreshing}
            >
              <RefreshCw className='w-4 h-4 mr-2' />
              Debug
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card className='border-blue-100 shadow-sm'>
          <CardContent className='p-5'>
            <div className='flex flex-col gap-4'>
              {/* Header Filter */}
              <div className='flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-blue-50 rounded-lg'>
                    <Calendar className='w-5 h-5 text-blue-600' />
                  </div>
                  <div>
                    <h3 className='text-sm font-semibold text-gray-900'>
                      Filter Periode
                    </h3>
                    <p className='text-xs text-gray-500'>
                      Pilih periode untuk melihat data penjualan
                    </p>
                  </div>
                </div>
                {(dateRange !== 'today' ||
                  (dateRange === 'custom' &&
                    (customDateRange.start || customDateRange.end))) && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleResetFilter}
                    className='text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-300'
                    disabled={loading || refreshing}
                  >
                    <RotateCw className='w-4 h-4 mr-2' />
                    Reset
                  </Button>
                )}
              </div>

              {/* Filter Controls */}
              <div className='flex flex-col lg:flex-row gap-4 items-start lg:items-center'>
                <div className='flex flex-col sm:flex-row gap-3 flex-1 w-full'>
                  {/* Quick Date Buttons */}
                  <div className='flex flex-wrap gap-2'>
                    {dateRangeOptions.map(option => (
                      <Button
                        key={option.value}
                        variant={
                          dateRange === option.value ? 'default' : 'outline'
                        }
                        size='sm'
                        onClick={() => {
                          setDateRange(option.value);
                          if (option.value !== 'custom') {
                            setCustomDateRange({ start: '', end: '' });
                          }
                        }}
                        className={
                          dateRange === option.value
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'hover:bg-gray-50'
                        }
                        disabled={loading || refreshing}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>

                  {/* Custom Date Range Picker */}
                  {dateRange === 'custom' && (
                    <div className='flex flex-col sm:flex-row gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200 shadow-inner w-full'>
                      <div className='flex-1 space-y-2'>
                        <label className='text-xs font-semibold text-gray-700 flex items-center gap-2'>
                          <Calendar className='w-3 h-3 text-blue-600' />
                          Dari Tanggal
                        </label>
                        <Input
                          type='date'
                          value={customDateRange.start}
                          onChange={e => {
                            const newStart = e.target.value;
                            setCustomDateRange({
                              ...customDateRange,
                              start: newStart,
                            });
                          }}
                          max={
                            customDateRange.end ||
                            new Date().toISOString().split('T')[0]
                          }
                          className='text-sm bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                          data-testid='custom-start-date'
                        />
                      </div>
                      <div className='flex items-end pb-7 sm:pb-0'>
                        <div className='w-6 h-0.5 bg-blue-400 rounded-full' />
                      </div>
                      <div className='flex-1 space-y-2'>
                        <label className='text-xs font-semibold text-gray-700 flex items-center gap-2'>
                          <Calendar className='w-3 h-3 text-blue-600' />
                          Sampai Tanggal
                        </label>
                        <Input
                          type='date'
                          value={customDateRange.end}
                          onChange={e => {
                            const newEnd = e.target.value;
                            setCustomDateRange({
                              ...customDateRange,
                              end: newEnd,
                            });
                          }}
                          min={customDateRange.start}
                          max={new Date().toISOString().split('T')[0]}
                          className='text-sm bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                          data-testid='custom-end-date'
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Range Info Badge */}
                {(dateRange !== 'custom' ||
                  (dateRange === 'custom' &&
                    customDateRange.start &&
                    customDateRange.end)) && (
                  <div className='flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200'>
                    <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
                    <div className='text-sm'>
                      <span className='text-gray-600 font-medium'>
                        Periode:
                      </span>{' '}
                      <span className='text-gray-900 font-semibold'>
                        {dateRange === 'custom' &&
                        customDateRange.start &&
                        customDateRange.end
                          ? `${new Date(
                              customDateRange.start
                            ).toLocaleDateString('id-ID')} - ${new Date(
                              customDateRange.end
                            ).toLocaleDateString('id-ID')}`
                          : dateRange === 'today'
                          ? new Date().toLocaleDateString('id-ID', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : dateRange === 'yesterday'
                          ? new Date(Date.now() - 86400000).toLocaleDateString(
                              'id-ID',
                              {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              }
                            )
                          : dateRange === 'week'
                          ? `${new Date(
                              Date.now() - 7 * 86400000
                            ).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })} - ${new Date().toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}`
                          : dateRange === 'month'
                          ? `${new Date(
                              Date.now() - 30 * 86400000
                            ).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })} - ${new Date().toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}`
                          : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-5 gap-6'>
        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Total Pesanan
                </p>
                <p className='text-2xl font-bold text-gray-900'>
                  {activeShift && dateRange === 'today'
                    ? activeShift.total_transactions || 0
                    : stats?.total_orders || stats?.total_transactions || 0}
                </p>
                <p className='text-xs text-green-600 flex items-center mt-1'>
                  <TrendingUp className='w-3 h-3 mr-1' />
                  {stats?.orders_growth
                    ? `+${stats?.orders_growth || 0}%`
                    : '+0%'}{' '}
                  dari bulan lalu
                </p>
              </div>
              <ShoppingCart className='w-8 h-8 text-blue-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  {getSalesLabel()}
                </p>
                <p className='text-2xl font-bold text-gray-900'>
                  {activeShift && dateRange === 'today'
                    ? formatCurrency(activeShift.expected_total || 0)
                    : stats?.total_revenue
                    ? formatCurrency(stats?.total_revenue || 0)
                    : 'Rp 0'}
                </p>
                <p className='text-xs text-green-600 flex items-center mt-1'>
                  <TrendingUp className='w-3 h-3 mr-1' />
                  {stats?.revenue_growth
                    ? `+${stats?.revenue_growth || 0}%`
                    : '+0%'}{' '}
                  {getComparisonText()}
                </p>
              </div>
              <DollarSign className='w-8 h-8 text-green-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Rata-rata Per Transaksi
                </p>
                <p className='text-2xl font-bold text-gray-900'>
                  {stats?.avg_order_value
                    ? formatCurrency(stats?.avg_order_value || 0)
                    : 'Rp 0'}
                </p>
                <p className='text-xs text-red-600 flex items-center mt-1'>
                  <TrendingDown className='w-3 h-3 mr-1' />
                  {stats?.avg_order_growth
                    ? `${stats?.avg_order_growth || 0}%`
                    : '0%'}{' '}
                  dari bulan lalu
                </p>
              </div>
              <CreditCard className='w-8 h-8 text-purple-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Pelanggan Aktif
                </p>
                <p className='text-2xl font-bold text-gray-900'>
                  {stats?.active_customers || 0}
                </p>
                <p className='text-xs text-green-600 flex items-center mt-1'>
                  <TrendingUp className='w-3 h-3 mr-1' />
                  {stats?.customers_growth
                    ? `+${stats?.customers_growth || 0}%`
                    : '+0%'}{' '}
                  dari bulan lalu
                </p>
              </div>
              <User className='w-8 h-8 text-orange-600' />
            </div>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card
          className='card-hover cursor-pointer'
          onClick={() => {
            setStatusFilter('pending');
            const dateParams =
              dateRange === 'custom' &&
              customDateRange.start &&
              customDateRange.end
                ? {
                    date_from: customDateRange.start,
                    date_to: customDateRange.end,
                  }
                : { dateRange };
            fetchOrders({
              page: 1,
              limit: 10, // ✅ FIX: 10 orders per page
              status: 'pending',
              ...dateParams,
            });
          }}
        >
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Transaksi Menunggu
                </p>
                <p className='text-2xl font-bold text-gray-900'>
                  {pendingCount}
                </p>
                <p className='text-xs text-yellow-700 flex items-center mt-1'>
                  <Clock className='w-3 h-3 mr-1' />
                  Real-time hari ini
                </p>
              </div>
              <Clock className='w-8 h-8 text-yellow-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary Mini Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4'>
        <Card
          className='border-yellow-200 bg-yellow-50 cursor-pointer hover:shadow-md'
          onClick={() => {
            setStatusFilter('pending');
            const dateParams =
              dateRange === 'custom' &&
              customDateRange.start &&
              customDateRange.end
                ? {
                    date_from: customDateRange.start,
                    date_to: customDateRange.end,
                  }
                : { dateRange };
            fetchOrders({
              page: 1,
              limit: 10, // ✅ FIX: 10 orders per page
              status: 'pending',
              ...dateParams,
            });
          }}
        >
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs font-medium text-yellow-800'>Pending</p>
                <p className='text-xl font-bold text-yellow-900'>
                  {pendingCount}
                </p>
              </div>
              <Clock className='w-6 h-6 text-yellow-600' />
            </div>
          </CardContent>
        </Card>

        <Card
          className='border-blue-200 bg-blue-50 cursor-pointer hover:shadow-md'
          onClick={() => {
            setStatusFilter('processing');
            const dateParams =
              dateRange === 'custom' &&
              customDateRange.start &&
              customDateRange.end
                ? {
                    date_from: customDateRange.start,
                    date_to: customDateRange.end,
                  }
                : { dateRange };
            fetchOrders({
              page: 1,
              limit: 10, // ✅ FIX: 10 orders per page
              status: 'processing',
              ...dateParams,
            });
          }}
        >
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs font-medium text-blue-800'>Diproses</p>
                <p className='text-xl font-bold text-blue-900'>
                  {processingCount}
                </p>
              </div>
              <RefreshCw className='w-6 h-6 text-blue-600' />
            </div>
          </CardContent>
        </Card>

        <Card
          className='border-green-200 bg-green-50 cursor-pointer hover:shadow-md'
          onClick={() => {
            setStatusFilter('completed');
            const dateParams =
              dateRange === 'custom' &&
              customDateRange.start &&
              customDateRange.end
                ? {
                    date_from: customDateRange.start,
                    date_to: customDateRange.end,
                  }
                : { dateRange };
            fetchOrders({
              page: 1,
              limit: 10, // ✅ FIX: 10 orders per page
              status: 'completed',
              ...dateParams,
            });
          }}
        >
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs font-medium text-green-800'>Selesai</p>
                <p className='text-xl font-bold text-green-900'>
                  {completedCount}
                </p>
              </div>
              <CheckCircle className='w-6 h-6 text-green-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='orders' data-testid='orders-tab'>
                Pesanan
              </TabsTrigger>
              <TabsTrigger value='customers' data-testid='customers-tab'>
                Pelanggan
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <Tabs value={selectedTab}>
            {/* Orders Tab */}
            <TabsContent value='orders' className='space-y-4'>
              {/* Search and Filter */}
              <div className='flex flex-col sm:flex-row gap-4'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    placeholder='Cari pesanan atau pelanggan...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='pl-10'
                    data-testid='order-search'
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className='px-3 py-2 border border-gray-300 rounded-md bg-white'
                  data-testid='status-filter'
                >
                  <option value='all'>Semua Status</option>
                  <option value='completed'>Selesai</option>
                  <option value='processing'>Diproses</option>
                  <option value='pending'>Menunggu</option>
                  <option value='cancelled'>Dibatalkan</option>
                </select>
                <Button variant='outline' data-testid='advanced-filter'>
                  <Filter className='w-4 h-4 mr-2' />
                  Filter
                </Button>
              </div>

              {/* Orders List */}
              <div className='space-y-4'>
                {loading ? (
                  // ✅ OPTIMIZATION: Show skeleton loader instead of simple spinner
                  <div className='space-y-4'>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className='border rounded-lg p-6 space-y-4 animate-pulse'
                      >
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-4 flex-1'>
                            <div className='h-12 w-12 bg-gray-200 rounded-full' />
                            <div className='flex-1 space-y-2'>
                              <div className='h-5 w-40 bg-gray-200 rounded' />
                              <div className='h-4 w-32 bg-gray-200 rounded' />
                            </div>
                          </div>
                          <div className='flex gap-2'>
                            <div className='h-8 w-20 bg-gray-200 rounded' />
                            <div className='h-8 w-20 bg-gray-200 rounded' />
                          </div>
                        </div>
                        <div className='space-y-2 border-t pt-4'>
                          {Array.from({ length: 2 }).map((_, itemIndex) => (
                            <div
                              key={itemIndex}
                              className='flex items-center justify-between'
                            >
                              <div className='flex items-center gap-3 flex-1'>
                                <div className='h-10 w-10 bg-gray-200 rounded' />
                                <div className='flex-1 space-y-1'>
                                  <div className='h-4 w-48 bg-gray-200 rounded' />
                                  <div className='h-3 w-24 bg-gray-200 rounded' />
                                </div>
                              </div>
                              <div className='h-4 w-20 bg-gray-200 rounded' />
                            </div>
                          ))}
                        </div>
                        <div className='flex items-center justify-between pt-4 border-t'>
                          <div className='space-y-1'>
                            <div className='h-4 w-32 bg-gray-200 rounded' />
                            <div className='h-5 w-40 bg-gray-200 rounded' />
                          </div>
                          <div className='flex gap-2'>
                            <div className='h-8 w-24 bg-gray-200 rounded-full' />
                            <div className='h-8 w-8 bg-gray-200 rounded-full' />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (usingShiftOrders ? shiftOrders : orders || []).length ===
                  0 ? (
                  <div className='text-center py-8'>
                    <Package className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                    <p className='text-gray-600'>Tidak ada pesanan ditemukan</p>
                    <p className='text-sm text-gray-500 mt-2'>
                      Coba ubah filter atau pastikan outlet sudah dipilih
                    </p>
                  </div>
                ) : allOrders.length > 0 ? (
                  // ✅ NOTE: Saat ini menggunakan regular rendering untuk daftar order.
                  // Virtual scrolling dengan react-window (via OrderCardItem + List) sudah disiapkan dan bisa diaktifkan kembali jika jumlah data sangat besar.
                  <div className='space-y-4'>
                    {listItemData.map((item, index) => {
                      const { order, orderCountForTable } = item;
                      if (!order) return null;

                      return (
                        <div key={order.id || index} className='px-2 pb-4'>
                          <div className='border rounded-lg p-6 hover:bg-gray-50 transition-colors shadow-sm'>
                            {/* Order Header */}
                            <div className='flex items-center justify-between mb-4'>
                              <div className='flex items-center space-x-4'>
                                <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg'>
                                  #{order.id}
                                </div>
                                <div>
                                  <div className='font-semibold text-gray-900'>
                                    {order.customer?.name ||
                                      order.customer_name ||
                                      'Pelanggan Umum'}
                                  </div>
                                  <div className='text-sm text-gray-500'>
                                    {new Date(order.created_at).toLocaleString(
                                      'id-ID'
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className='flex items-center gap-2'>
                                {getStatusBadge(order.status)}
                                {getPaymentStatusBadge(order.payment_status)}
                                {/* ✅ NEW: Payment Method Badge - Always visible if order is paid */}
                                {order.payment_status === 'paid' && (() => {
                                  // Get payment method from order.payment_method or from payments array
                                  const paymentMethod = order.payment_method || 
                                    (order.payments && order.payments.length > 0 
                                      ? order.payments[order.payments.length - 1]?.payment_method || 
                                        order.payments[order.payments.length - 1]?.method
                                      : null) || 
                                    'cash';
                                  return getPaymentMethodBadge(paymentMethod);
                                })()}
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className='space-y-2 mb-4'>
                              {order.items?.map((item, idx) => {
                                const quantity = item.quantity || item.qty || 0;
                                const price = item.price || 0;
                                const subtotal =
                                  item.subtotal || quantity * price;
                                const productName =
                                  item.product_name ||
                                  item.name ||
                                  'Unknown Product';
                                const itemNotes = item.notes || item.note || null;

                                return (
                                  <div key={idx} className='space-y-1'>
                                    <div className='flex justify-between text-sm'>
                                      <span>
                                        {productName} x {quantity}
                                      </span>
                                      <span className='font-medium'>
                                        {formatCurrency(subtotal)}
                                      </span>
                                    </div>
                                    {/* ✅ NEW: Tampilkan catatan jika ada */}
                                    {itemNotes && (
                                      <div className='text-xs text-gray-500 italic pl-2 border-l-2 border-yellow-300'>
                                        📝 {itemNotes}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* ✅ NEW: Payment Method Info - More visible */}
                            {order.payment_status === 'paid' && (() => {
                              // Get payment method from order.payment_method or from payments array
                              const paymentMethod = order.payment_method || 
                                (order.payments && order.payments.length > 0 
                                  ? order.payments[order.payments.length - 1]?.payment_method || 
                                    order.payments[order.payments.length - 1]?.method
                                  : null) || 
                                'cash';
                              
                              const paymentMethodLabels = {
                                cash: 'Tunai',
                                card: 'Kartu',
                                qris: 'QRIS',
                                transfer: 'Transfer',
                                bank_transfer: 'Transfer Bank',
                                midtrans: 'QRIS/E-Wallet',
                                gopay: 'GoPay',
                                shopeepay: 'ShopeePay',
                                credit_card: 'Kartu Kredit',
                                pay_later: 'Bayar di Kasir',
                              };
                              
                              const methodLabel = paymentMethodLabels[paymentMethod] || paymentMethod;
                              
                              return (
                                <div className='mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                                  <div className='flex items-center justify-between'>
                                    <span className='text-sm font-medium text-gray-700'>
                                      💳 Metode Pembayaran:
                                    </span>
                                    <span className='text-sm font-semibold text-blue-700'>
                                      {methodLabel}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Payment Summary */}
                            <div className='pt-4 border-t space-y-1.5'>
                              {/* ✅ FIX: Calculate subtotal if not available */}
                              {(() => {
                                const total = Number(order.total) || 0;
                                const tax = Number(order.tax_amount) || 0;
                                const discount =
                                  Number(order.discount_amount) || 0;
                                // Formula: total = subtotal + tax - discount
                                // Jadi: subtotal = total - tax + discount
                                const calculatedSubtotal = order.subtotal
                                  ? Number(order.subtotal)
                                  : total - tax + discount;

                                return (
                                  <>
                                    {/* ✅ FIX: Always show subtotal */}
                                    <div className='flex justify-between text-sm'>
                                      <span className='text-gray-600'>
                                        Subtotal
                                      </span>
                                      <span className='font-medium text-gray-900'>
                                        {formatCurrency(calculatedSubtotal)}
                                      </span>
                                    </div>

                                    {/* ✅ FIX: Always show discount if exists */}
                                    {discount > 0 && (
                                      <div className='flex justify-between text-sm'>
                                        <span className='text-green-600'>
                                          Diskon
                                        </span>
                                        <span className='font-medium text-green-600'>
                                          - {formatCurrency(discount)}
                                        </span>
                                      </div>
                                    )}

                                    {/* ✅ FIX: Always show tax (even if 0) to avoid confusion */}
                                    <div className='flex justify-between text-sm'>
                                      <span className='text-gray-600'>
                                        Pajak
                                      </span>
                                      <span className='font-medium text-gray-900'>
                                        {formatCurrency(tax)}
                                      </span>
                                    </div>

                                    <div className='flex justify-between items-center pt-2 border-t mt-2'>
                                      <span className='font-semibold text-lg'>
                                        Total
                                      </span>
                                      <span className='font-bold text-xl text-blue-600'>
                                        {formatCurrency(total)}
                                      </span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>

                            {/* Actions */}
                            <div className='flex justify-end space-x-2 border-t pt-4 mt-4 flex-wrap'>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => handleViewOrder(order.id)}
                                title='Lihat Detail'
                              >
                                <Eye className='w-4 h-4' />
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => handlePrintOrder(order.id)}
                                title='Print Struk'
                              >
                                <Printer className='w-4 h-4' />
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => handleOpenReceipt(order.id)}
                                title='Buka Kuitansi Online'
                                className='text-blue-600 hover:text-blue-700'
                              >
                                <Receipt className='w-4 h-4' />
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() =>
                                  handleSendWhatsAppReceipt(order.id)
                                }
                                title='Kirim Kuitansi via WhatsApp'
                                className='text-green-600 hover:text-green-700'
                                disabled={sendingWhatsApp === order.id}
                              >
                                {sendingWhatsApp === order.id ? (
                                  <Loader2 className='w-4 h-4 animate-spin' />
                                ) : (
                                  <MessageCircle className='w-4 h-4' />
                                )}
                              </Button>
                              {(order.payment_status === 'pending' ||
                                order.payment_status === 'unpaid' ||
                                order.payment_status === 'failed') && (
                                <Button
                                  size='sm'
                                  variant='default'
                                  className='bg-green-600 hover:bg-green-700 text-white'
                                  onClick={() => handlePayment(order.id)}
                                  title='Pilih Metode Pembayaran'
                                >
                                  <DollarSign className='w-4 h-4 mr-1' />
                                  Bayar
                                </Button>
                              )}
                              {canEditOrders && (
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => handleEditOrder(order.id)}
                                  title='Edit Order'
                                >
                                  <Edit className='w-4 h-4' />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {/* ✅ FIX: Smart Pagination untuk Orders */}
              {pagination && pagination.totalPages > 1 && (
                <SmartPagination
                  currentPage={pagination?.currentPage || 1}
                  totalPages={pagination?.totalPages || 1}
                  onPageChange={handlePageChange}
                  itemsPerPage={pagination?.itemsPerPage || 10}
                  totalItems={pagination?.totalItems || 0}
                  isLoading={loading}
                  className='mt-6'
                />
              )}
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value='customers' className='space-y-4'>
              {/* Search and Actions */}
              <div className='flex flex-col sm:flex-row gap-4 items-center justify-between'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    placeholder='Cari pelanggan...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='pl-10'
                    data-testid='customer-search'
                  />
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='default'
                    onClick={handleAddCustomer}
                    className='bg-green-600 hover:bg-green-700'
                  >
                    <Plus className='w-4 h-4 mr-2' />
                    Tambah Pelanggan
                  </Button>
                  <Button variant='outline' onClick={handleRefresh}>
                    <RefreshCw className='w-4 h-4 mr-2' />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Customers List */}
              <div className='space-y-4'>
                {loading ? (
                  <div className='flex items-center justify-center py-8'>
                    <RefreshCw className='w-6 h-6 animate-spin text-blue-600' />
                    <span className='ml-2 text-gray-600'>Memuat data...</span>
                  </div>
                ) : (customers || []).length === 0 ? (
                  <div className='text-center py-8'>
                    <User className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                    <p className='text-gray-600'>
                      Tidak ada pelanggan ditemukan
                    </p>
                  </div>
                ) : (
                  (customers || []).map(customer => (
                    <div
                      key={customer.id}
                      className='border rounded-lg p-6 hover:bg-gray-50 transition-colors shadow-sm'
                      data-testid={`customer-${customer.id}`}
                    >
                      {/* Customer Header */}
                      <div className='flex items-center justify-between mb-4'>
                        <div className='flex items-center space-x-4'>
                          <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl'>
                            {customer.name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <h3 className='font-semibold text-gray-900 text-lg'>
                              {customer.name || 'Nama tidak tersedia'}
                            </h3>
                            <div className='flex items-center space-x-4 text-sm text-gray-600'>
                              {customer.phone && (
                                <div className='flex items-center space-x-1'>
                                  <Phone className='w-4 h-4' />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              {customer.email && (
                                <div className='flex items-center space-x-1'>
                                  <Mail className='w-4 h-4' />
                                  <span>{customer.email}</span>
                                </div>
                              )}
                            </div>
                            {customer.address && (
                              <p className='text-xs text-gray-500 mt-1'>
                                {customer.address}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className='flex items-center space-x-3'>
                          {getCustomerStatusBadge(customer.status || 'active')}
                          <div className='text-right'>
                            <p className='text-lg font-bold text-green-600'>
                              {formatCurrency(customer.total_spent || 0)}
                            </p>
                            <p className='text-sm text-gray-600'>
                              Total Belanja
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Customer Stats */}
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
                        <div className='text-center p-3 bg-blue-50 rounded-lg'>
                          <p className='text-2xl font-bold text-blue-600'>
                            {customer.total_visits || 0}
                          </p>
                          <p className='text-sm text-gray-600'>
                            Total Kunjungan
                          </p>
                        </div>
                        <div className='text-center p-3 bg-green-50 rounded-lg'>
                          <p className='text-2xl font-bold text-green-600'>
                            {formatCurrency(customer.total_spent || 0)}
                          </p>
                          <p className='text-sm text-gray-600'>Total Belanja</p>
                        </div>
                        <div className='text-center p-3 bg-purple-50 rounded-lg'>
                          <p className='text-2xl font-bold text-purple-600'>
                            {customer.outlets?.length || 0}
                          </p>
                          <p className='text-sm text-gray-600'>
                            Outlet Dikunjungi
                          </p>
                        </div>
                        <div className='text-center p-3 bg-orange-50 rounded-lg'>
                          <p className='text-sm font-bold text-orange-600'>
                            {customer.last_visit_at
                              ? new Date(
                                  customer.last_visit_at
                                ).toLocaleDateString('id-ID')
                              : 'Belum ada'}
                          </p>
                          <p className='text-xs text-gray-600'>
                            {customer.last_outlet?.name
                              ? `di ${customer.last_outlet.name}`
                              : 'Kunjungan Terakhir'}
                          </p>
                        </div>
                      </div>

                      {/* Outlet Information */}
                      {customer.outlets && customer.outlets.length > 0 && (
                        <div className='mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200'>
                          <h4 className='text-sm font-semibold text-gray-700 mb-3 flex items-center'>
                            <ShoppingCart className='w-4 h-4 mr-2 text-blue-600' />
                            Riwayat Belanja per Outlet:
                          </h4>
                          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                            {customer.outlets.map((outlet, index) => (
                              <div
                                key={index}
                                className='bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow'
                              >
                                <div className='flex items-center justify-between mb-2'>
                                  <p className='font-semibold text-gray-900 text-sm'>
                                    {outlet.name}
                                  </p>
                                  <Badge variant='outline' className='text-xs'>
                                    {outlet.visit_count}x
                                  </Badge>
                                </div>
                                <div className='space-y-1'>
                                  <div className='flex justify-between text-xs'>
                                    <span className='text-gray-600'>
                                      Total Belanja:
                                    </span>
                                    <span className='font-semibold text-green-600'>
                                      {formatCurrency(
                                        outlet.total_spent_at_outlet || 0
                                      )}
                                    </span>
                                  </div>
                                  <div className='flex justify-between text-xs'>
                                    <span className='text-gray-600'>
                                      Terakhir:
                                    </span>
                                    <span className='text-gray-700'>
                                      {new Date(
                                        outlet.last_visit
                                      ).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Favorite Items */}
                      {customer.favorite_items &&
                        customer.favorite_items.length > 0 && (
                          <div className='mb-4'>
                            <h4 className='text-sm font-medium text-gray-700 mb-2'>
                              Item Favorit:
                            </h4>
                            <div className='flex flex-wrap gap-2'>
                              {customer.favorite_items.map((item, index) => (
                                <Badge
                                  key={index}
                                  variant='outline'
                                  className='text-xs'
                                >
                                  {item.total_qty}x {item.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Customer Actions */}
                      <div className='flex justify-between items-center border-t pt-4'>
                        <div className='text-sm text-gray-600'>
                          Bergabung:{' '}
                          {customer.join_date
                            ? new Date(customer.join_date).toLocaleDateString(
                                'id-ID'
                              )
                            : customer.created_at
                            ? new Date(customer.created_at).toLocaleDateString(
                                'id-ID'
                              )
                            : 'Tidak diketahui'}
                          {customer.birthday && (
                            <span className='ml-4'>
                              Ulang Tahun:{' '}
                              {new Date(customer.birthday).toLocaleDateString(
                                'id-ID'
                              )}
                            </span>
                          )}
                        </div>
                        <div className='flex space-x-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            data-testid={`view-customer-${customer.id}`}
                            title='Lihat Detail'
                          >
                            <Eye className='w-4 h-4' />
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            title='Edit Pelanggan'
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <Edit className='w-4 h-4' />
                          </Button>
                          <Button size='sm' variant='outline' title='Bagikan'>
                            <Share2 className='w-4 h-4' />
                          </Button>
                          <Button size='sm' variant='outline' title='Lainnya'>
                            <MoreHorizontal className='w-4 h-4' />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ✅ FIX: Smart Pagination untuk Customers */}
              {pagination && pagination.totalPages > 1 && (
                <SmartPagination
                  currentPage={pagination?.currentPage || 1}
                  totalPages={pagination?.totalPages || 1}
                  onPageChange={handleCustomerPageChange}
                  itemsPerPage={pagination?.itemsPerPage || 10}
                  totalItems={pagination?.totalItems || 0}
                  isLoading={loading}
                  className='mt-6'
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Print Receipt Modal */}
      <PrintReceiptModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        orderId={selectedOrderId}
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        orderId={selectedOrderId}
        onOrderUpdated={handleOrderUpdated}
      />

      {/* Customer Form Modal */}
      <CustomerFormModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        customer={selectedCustomer}
        onCustomerSaved={handleCustomerSaved}
      />

      {/* Payment Modal - Pilihan Metode Pembayaran */}
      {paymentModalOpen && selectedOrderForPayment && (
        <PaymentModal
          open={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedOrderForPayment(null);
          }}
          cartTotal={
            selectedOrderForPayment.total ||
            selectedOrderForPayment.total_amount ||
            0
          }
          onPaymentComplete={handlePaymentComplete}
          orderId={selectedOrderForPayment.id}
          allowDeferredPayment={false}
        />
      )}

      {/* Midtrans Retry Payment Modal (untuk QRIS dari PaymentModal) */}
      {retryPaymentModalOpen && retryPaymentData && (
        <MidtransPaymentModal
          open={retryPaymentModalOpen}
          onClose={() => {
            setRetryPaymentModalOpen(false);
            setRetryPaymentData(null);
            setPaymentModalOpen(false);
            setSelectedOrderForPayment(null);
          }}
          qrisData={retryPaymentData}
          onPaymentSuccess={result => {
            // Refresh orders data
            toast.success('Pembayaran berhasil!');
            refreshData();
            setRetryPaymentModalOpen(false);
            setRetryPaymentData(null);
            setPaymentModalOpen(false);
            setSelectedOrderForPayment(null);
          }}
        />
      )}

      {/* ✅ NEW: Refund Confirmation Modal */}
      <AlertDialog open={refundConfirmOpen} onOpenChange={setRefundConfirmOpen}>
        <AlertDialogContent className='sm:max-w-[500px]'>
          <AlertDialogHeader>
            <div className='flex items-center gap-3 mb-2'>
              <div className='w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center'>
                <RotateCw className='w-6 h-6 text-orange-600' />
              </div>
              <AlertDialogTitle className='text-xl'>
                Refund Order?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className='text-base space-y-2'>
                <p className='font-medium text-gray-900'>
                  Apakah Anda yakin ingin me-refund order ini?
                </p>
                {orderToRefund && (
                  <div className='bg-gray-50 rounded-lg p-3 mt-3 space-y-1'>
                    <p className='text-sm text-gray-600'>
                      <span className='font-semibold'>Order:</span>{' '}
                      {orderToRefund.order_number || `#${orderToRefund.id}`}
                    </p>
                    <p className='text-sm text-gray-600'>
                      <span className='font-semibold'>Total:</span>{' '}
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(orderToRefund.total || 0)}
                    </p>
                  </div>
                )}
                <div className='bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3'>
                  <p className='text-sm text-orange-800 font-medium mb-1'>
                    ⚠️ Dampak Refund:
                  </p>
                  <ul className='text-sm text-orange-700 space-y-1 list-disc list-inside'>
                    <li>Stock produk akan dikembalikan</li>
                    <li>Perhitungan shift akan diupdate</li>
                    <li>Status order menjadi &quot;Refunded&quot;</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToRefund(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRefund}
              className='bg-orange-600 hover:bg-orange-700 text-white'
            >
              <RotateCw className='w-4 h-4 mr-2' />
              Ya, Refund Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ✅ NEW: Delete Confirmation Modal */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className='sm:max-w-[500px]'>
          <AlertDialogHeader>
            <div className='flex items-center gap-3 mb-2'>
              <div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center'>
                <Trash2 className='w-6 h-6 text-red-600' />
              </div>
              <AlertDialogTitle className='text-xl text-red-600'>
                Hapus Order?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className='text-base space-y-2'>
                <p className='font-medium text-gray-900'>
                  ⚠️ PERINGATAN: Tindakan ini tidak dapat dibatalkan!
                </p>
                {orderToDelete && (
                  <div className='bg-gray-50 rounded-lg p-3 mt-3 space-y-1'>
                    <p className='text-sm text-gray-600'>
                      <span className='font-semibold'>Order:</span>{' '}
                      {orderToDelete.order_number || `#${orderToDelete.id}`}
                    </p>
                    <p className='text-sm text-gray-600'>
                      <span className='font-semibold'>Total:</span>{' '}
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(orderToDelete.total || 0)}
                    </p>
                  </div>
                )}
                <div className='bg-red-50 border border-red-200 rounded-lg p-3 mt-3'>
                  <p className='text-sm text-red-800 font-medium mb-1'>
                    ⚠️ Dampak Penghapusan:
                  </p>
                  <ul className='text-sm text-red-700 space-y-1 list-disc list-inside'>
                    <li>Data order akan dihapus secara permanen</li>
                    <li>Stock produk akan dikembalikan (jika sudah dibayar)</li>
                    <li>Perhitungan shift akan diupdate</li>
                    <li>Tindakan ini tidak dapat dibatalkan</li>
                  </ul>
                </div>
                <p className='text-sm text-gray-600 mt-3'>
                  Hapus order hanya jika terjadi kesalahan input atau data
                  duplikat.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              <Trash2 className='w-4 h-4 mr-2' />
              Ya, Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SalesManagement;
