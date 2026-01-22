import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { publicOutletApi } from '../services/publicOutletApi';
import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  ShoppingBag,
  Loader2,
  RefreshCw,
  Home,
  Phone,
  MapPin,
  Store,
  StickyNote,
  CreditCard,
  DollarSign,
  AlertCircle,
  XCircle,
  User,
} from 'lucide-react';

const OrderStatus = () => {
  const { orderNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load from navigation state if available (just after placing order)
  const initialOrderData = location.state?.orderData;

  // Helper function to format currency
  const formatCurrency = (amount) => {
    const number = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  };

  useEffect(() => {
    if (initialOrderData) {
      // Use initial data, then fetch full details
      loadOrderStatus();
    } else {
      loadOrderStatus();
    }
  }, [orderNumber]);

  // ✅ NEW: Auto-refresh if payment is still pending
  useEffect(() => {
    if (!order || order.payment_status !== 'pending') {
      return;
    }

    const refreshInterval = setInterval(() => {
      loadOrderStatus();
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(refreshInterval);
    };
  }, [order?.payment_status]);

  const loadOrderStatus = async () => {
    try {
      // Don't set loading to true on auto-refresh to avoid UI flicker
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);

      const response = await publicOutletApi.checkOrderStatus(orderNumber);

      if (response.success) {
        // ✅ FIX: Log data untuk debugging
        console.log('Order Status Data:', response.data);
        console.log('Outlet Data:', response.data?.outlet);
        setOrder(response.data);
      } else {
        throw new Error(response.message || 'Pesanan tidak ditemukan');
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat status pesanan');
      console.error('Failed to load order status:', err);
    } finally {
      if (!refreshing) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrderStatus();
    setRefreshing(false);
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: {
        icon: Clock,
        label: 'Menunggu Konfirmasi',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        description: 'Pesanan Anda sedang menunggu konfirmasi dari penjual',
      },
      confirmed: {
        icon: CheckCircle,
        label: 'Dikonfirmasi',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        description: 'Pesanan Anda telah dikonfirmasi',
      },
      preparing: {
        icon: Package,
        label: 'Sedang Diproses',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        description: 'Pesanan Anda sedang diproses',
      },
      ready: {
        icon: ShoppingBag,
        label: 'Siap Diambil',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        description: 'Pesanan Anda sudah siap untuk diambil atau dikirim',
      },
      completed: {
        icon: CheckCircle,
        label: 'Selesai',
        color: 'text-green-700',
        bgColor: 'bg-green-200',
        description: 'Pesanan telah selesai. Terima kasih!',
      },
      cancelled: {
        icon: Clock,
        label: 'Dibatalkan',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        description: 'Pesanan telah dibatalkan',
      },
    };

    return statusMap[status] || statusMap.pending;
  };

  const getPaymentStatusInfo = (paymentStatus) => {
    const statusMap = {
      pending: {
        label: 'Belum Dibayar',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: AlertCircle,
        description: 'Menunggu pembayaran dari pelanggan'
      },
      paid: {
        label: 'Sudah Dibayar',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: CheckCircle,
        description: 'Pembayaran telah diterima'
      },
      failed: {
        label: 'Pembayaran Gagal',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: XCircle,
        description: 'Pembayaran ditolak atau gagal diproses'
      },
    };

    return statusMap[paymentStatus] || statusMap.pending;
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      cash: 'Tunai',
      card: 'Kartu Debit/Kredit',
      transfer: 'Transfer Bank',
      qris: 'QRIS',
      midtrans: 'Midtrans',
      pay_later: 'Bayar di Kasir',
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Memuat status pesanan...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
              <p className="font-semibold text-lg mb-2">Pesanan Tidak Ditemukan</p>
              <p className="text-sm">{error || 'Nomor pesanan tidak valid'}</p>
            </div>

            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:underline flex items-center justify-center mx-auto"
            >
              <Home className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;
  const paymentInfo = getPaymentStatusInfo(order.payment_status);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Success Banner (if just placed order) */}
        {initialOrderData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 animate-fade-in">
            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-green-900 text-lg mb-1">
                  Pesanan Berhasil Dibuat!
                </h3>
                <p className="text-green-700 text-sm">
                  Nomor pesanan Anda adalah <strong>{order.order_number}</strong>
                </p>
                <p className="text-green-600 text-sm mt-1">
                  Simpan nomor ini untuk melacak pesanan Anda
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: Payment Success Banner */}
        {order.payment_status === 'paid' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 mb-6 animate-fade-in">
            <div className="flex items-start">
              <CheckCircle className="w-8 h-8 text-green-600 mr-4 flex-shrink-0 mt-1 animate-pulse" />
              <div className="flex-1">
                <h3 className="font-bold text-green-900 text-xl mb-2">
                  ✅ Pembayaran Berhasil!
                </h3>
                <p className="text-green-800 text-base mb-2">
                  Pembayaran Anda telah berhasil diterima dan diproses.
                </p>
                {order.payments && order.payments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-sm text-green-700">
                      <strong>Metode:</strong> {getPaymentMethodLabel(order.payments[order.payments.length - 1].payment_method)}
                    </p>
                    {order.payments[order.payments.length - 1].paid_at && (
                      <p className="text-sm text-green-700 mt-1">
                        <strong>Waktu:</strong>{' '}
                        {new Date(order.payments[order.payments.length - 1].paid_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Status Pesanan</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh status"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* ✅ NEW: Table and Customer Info - Always visible if available */}
          {(order.table || (order.customer_name && order.customer_name !== 'Guest')) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Table Info */}
              {order.table && (
                <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-blue-600 font-medium mb-0.5">Meja</p>
                    <p className="text-base font-semibold text-blue-900">{order.table.name}</p>
                  </div>
                </div>
              )}

              {/* Customer Info */}
              {order.customer_name && order.customer_name !== 'Guest' && (
                <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <User className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-green-600 font-medium mb-0.5">Pelanggan</p>
                    <p className="text-base font-semibold text-green-900">{order.customer_name}</p>
                    {order.customer_phone && (
                      <p className="text-xs text-green-700 mt-0.5">{order.customer_phone}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600 mb-1">Nomor Pesanan</p>
              <p className="text-xl font-bold text-gray-900">{order.order_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Total Pembayaran</p>
              <p className="text-2xl font-bold text-blue-600">
                Rp {formatCurrency(order.total)}
              </p>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${statusInfo.bgColor} mb-4`}>
              <StatusIcon className={`w-10 h-10 ${statusInfo.color}`} />
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${statusInfo.color}`}>
              {statusInfo.label}
            </h2>
            <p className="text-gray-600">{statusInfo.description}</p>
          </div>

          {/* Status Timeline */}
          <div className="space-y-4">
            {[
              { status: 'pending', label: 'Pesanan Dibuat' },
              { status: 'confirmed', label: 'Dikonfirmasi' },
              { status: 'preparing', label: 'Sedang Diproses' },
              { status: 'ready', label: 'Siap' },
            ].map((step, index) => {
              const isActive =
                ['pending', 'confirmed', 'preparing', 'ready'].indexOf(order.status) >= index;
              const isCurrent = order.status === step.status;

              return (
                <div key={step.status} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-blue-200' : ''}`}
                  >
                    {isActive ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Status */}
        <div className={`bg-white rounded-lg shadow-sm p-6 mb-6 border-2 ${paymentInfo.borderColor}`}>
          <h3 className="font-semibold text-lg mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
            Status Pembayaran
          </h3>

          <div className={`${paymentInfo.bgColor} rounded-lg p-6 mb-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                {React.createElement(paymentInfo.icon, {
                  className: `w-8 h-8 ${paymentInfo.color} mr-3`,
                })}
                <div>
                  <h4 className={`text-xl font-bold ${paymentInfo.color}`}>
                    {paymentInfo.label}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {paymentInfo.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            {order.payment_status === 'paid' && order.payments && order.payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Metode Pembayaran</p>
                    <p className="font-semibold text-gray-900">
                      {getPaymentMethodLabel(order.payments[order.payments.length - 1].payment_method)}
                    </p>
                  </div>
                  {order.payments[order.payments.length - 1].paid_at && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Waktu Pembayaran</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(order.payments[order.payments.length - 1].paid_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending Payment Info */}
            {order.payment_status === 'pending' && order.payments && order.payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-yellow-200">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 mb-1">
                      Menunggu Konfirmasi Pembayaran
                    </p>
                    <p className="text-xs text-yellow-700">
                      Metode: {getPaymentMethodLabel(order.payments[order.payments.length - 1].payment_method)}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Pembayaran Anda sedang diproses. Halaman ini akan otomatis terupdate.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* No Payment Info */}
            {order.payment_status === 'pending' && (!order.payments || order.payments.length === 0) && (
              <div className="mt-4 pt-4 border-t border-yellow-200">
                <div className="flex items-start">
                  <DollarSign className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 mb-1">
                      Silakan Lakukan Pembayaran
                    </p>
                    <p className="text-xs text-yellow-700">
                      Total yang harus dibayar: <span className="font-bold">Rp {formatCurrency(order.total)}</span>
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Silakan hubungi kasir atau lakukan pembayaran sesuai metode yang dipilih.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Failed Payment Info */}
            {order.payment_status === 'failed' && (
              <div className="mt-4 pt-4 border-t border-red-200">
                <div className="flex items-start">
                  <XCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800 mb-1">
                      Pembayaran Tidak Berhasil
                    </p>
                    <p className="text-xs text-red-700">
                      Silakan hubungi kasir atau coba lakukan pembayaran ulang.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4">Detail Pesanan</h3>

          {/* Outlet Info - Always show if outlet data exists */}
          {order.outlet && (
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center mb-3">
                <Store className="w-5 h-5 text-blue-600 mr-2" />
                <p className="text-sm font-semibold text-gray-700">Outlet</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-bold text-lg text-gray-900 mb-2">
                  {order.outlet.name || 'Outlet'}
                </p>
                {order.outlet.address && (
                  <div className="flex items-start mt-2">
                    <MapPin className="w-4 h-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {order.outlet.address}
                    </p>
                  </div>
                )}
                {order.outlet.phone && (
                  <div className="flex items-center mt-3 text-sm text-gray-700">
                    <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="font-medium">{order.outlet.phone}</span>
                  </div>
                )}
                {!order.outlet.address && !order.outlet.phone && (
                  <p className="text-sm text-gray-500 italic mt-2">
                    Informasi outlet tidak tersedia
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ✅ FIX: Customer Info - Always show if available (moved from duplicate section) */}
          {order.customer_name && order.customer_name !== 'Guest' && (
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center mb-2">
                <User className="w-4 h-4 text-gray-600 mr-2" />
                <p className="text-sm text-gray-600">Informasi Pelanggan</p>
              </div>
              <p className="font-semibold text-gray-900 text-lg">{order.customer_name}</p>
              {order.customer_phone && (
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-1" />
                  {order.customer_phone}
                </div>
              )}
              {order.customer_email && (
                <p className="text-sm text-gray-600 mt-1">{order.customer_email}</p>
              )}
            </div>
          )}

          {/* Items */}
          <div className="mb-6 pb-6 border-b">
            <p className="text-sm text-gray-600 mb-3">Items</p>
            <div className="space-y-3">
              {order.items.map((item, index) => {
                const itemNotes = item.notes || item.note || null;
                return (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} x Rp {formatCurrency(item.price)}
                      </p>
                      {/* ✅ NEW: Tampilkan catatan jika ada */}
                      {itemNotes && (
                        <p className="text-xs text-blue-600 italic mt-1">
                          📝 {itemNotes}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900">
                      Rp {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-start">
                <StickyNote className="w-4 h-4 text-gray-600 mr-2 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Catatan</p>
                  <p className="text-gray-900">{order.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">
                Rp {formatCurrency(order.subtotal || 0)}
              </span>
            </div>

            {/* Discount */}
            {order.discount_amount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">
                  Diskon {order.discount_code && `(${order.discount_code})`}
                </span>
                <span className="font-medium text-green-600">
                  - Rp {formatCurrency(order.discount_amount)}
                </span>
              </div>
            )}

            {/* Tax */}
            {order.tax_amount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pajak</span>
                <span className="font-medium text-gray-900">
                  Rp {formatCurrency(order.tax_amount)}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Pembayaran</span>
                <span className="text-2xl font-bold text-blue-600">
                  Rp {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4">Informasi Tambahan</h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Nomor Pesanan</span>
              <span className="font-medium font-mono">{order.order_number}</span>
            </div>

            {order.type && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tipe Pesanan</span>
                <span className="font-medium">
                  {order.type === 'self_service' ? 'Self Service' :
                   order.type === 'dine_in' ? 'Dine In' :
                   order.type === 'takeaway' ? 'Take Away' :
                   order.type === 'delivery' ? 'Delivery' :
                   order.type === 'online' ? 'Online' : order.type}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">Tanggal Pesanan</span>
              <span className="font-medium">
                {new Date(order.created_at).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Kembali
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
          >
            {refreshing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Memuat...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh Status
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Simpan nomor pesanan Anda untuk melacak status pesanan
          </p>
          {order.outlet && (
            <p className="text-sm text-gray-500 mt-2">
              Jika ada pertanyaan, hubungi outlet kami
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderStatus;
