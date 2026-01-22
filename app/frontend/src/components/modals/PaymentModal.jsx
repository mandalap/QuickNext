import {
  Banknote,
  Calculator,
  Clock,
  DollarSign,
  Loader2,
  QrCode,
  Smartphone,
  Tag,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { discountService } from '../../services/discount.service';
import outletService from '../../services/outlet.service';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import CustomerSelectModal from './CustomerSelectModal';
import MidtransPaymentModal from './QRISPaymentModal';
import { orderService } from '../../services/order.service';

const PaymentModal = ({
  open,
  onClose,
  cartTotal,
  onPaymentComplete,
  orderId,
  onCreateOrder,
  allowDeferredPayment = false,
  initialCustomer = null, // Customer yang sudah dipilih sebelumnya (opsional)
}) => {
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [referenceNumber, setReferenceNumber] = useState(''); // ✅ NEW: Reference number for QRIS toko / Transfer
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [qrisData, setQrisData] = useState(null);
  const [isMidtransEnabled, setIsMidtransEnabled] = useState(false);
  const { currentOutlet } = useAuth();

  // Debug: Log when showQrisModal or qrisData changes
  useEffect(() => {
    if (showQrisModal) {
      console.log('🔍 showQrisModal is true');
      console.log('🔍 qrisData:', qrisData);
    }
  }, [showQrisModal, qrisData]);

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomer);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  // Update selectedCustomer when initialCustomer changes or modal opens
  useEffect(() => {
    if (open && initialCustomer !== selectedCustomer) {
      setSelectedCustomer(initialCustomer);
    }
  }, [open, initialCustomer]);

  // Check if Midtrans is enabled for current outlet
  useEffect(() => {
    const checkMidtransConfig = async () => {
      if (!open || !currentOutlet?.id) {
        setIsMidtransEnabled(false);
        // Reset to cash if midtrans was selected
        if (selectedMethod === 'midtrans') {
          setSelectedMethod('cash');
        }
        return;
      }

      try {
        const result = await outletService.getPaymentGatewayConfig(
          currentOutlet.id,
          'midtrans'
        );

        if (result.success && result.data?.config) {
          const config = result.data.config;
          // Check if config is enabled and has required keys
          const isEnabled =
            config.enabled === true &&
            config.has_server_key &&
            config.client_key;
          setIsMidtransEnabled(isEnabled);

          // If midtrans was selected but now disabled, reset to cash
          if (selectedMethod === 'midtrans' && !isEnabled) {
            setSelectedMethod('cash');
          }
        } else {
          setIsMidtransEnabled(false);
          // If midtrans was selected but config not found, reset to cash
          if (selectedMethod === 'midtrans') {
            setSelectedMethod('cash');
          }
        }
      } catch (error) {
        console.error('Error checking Midtrans config:', error);
        setIsMidtransEnabled(false);
        // If midtrans was selected but error occurred, reset to cash
        if (selectedMethod === 'midtrans') {
          setSelectedMethod('cash');
        }
      }
    };

    checkMidtransConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentOutlet?.id]);

  // Discount/Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null); // {code, type: 'percent'|'amount', value}
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Calculate discount amount
  const calculateDiscountAmount = () => {
    if (!appliedDiscount || !cartTotal) return 0;

    if (appliedDiscount.type === 'percent') {
      return Math.round((appliedDiscount.value / 100) * cartTotal);
    }
    return Math.min(appliedDiscount.value, cartTotal);
  };

  // Calculate total after discount
  const calculateTotalAfterDiscount = () => {
    const discount = calculateDiscountAmount();
    return Math.max((cartTotal || 0) - discount, 0);
  };

  // Apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Masukkan kode kupon');
      return;
    }

    if (appliedDiscount) {
      toast.error(
        'Kupon sudah diterapkan. Hapus kupon terlebih dahulu untuk apply kupon baru.'
      );
      return;
    }

    setApplyingCoupon(true);

    try {
      const orderTotal = cartTotal || 0;
      const res = await discountService.validate(couponCode.trim(), orderTotal);

      if (res.success) {
        const data = res.data?.data || res.data;
        const normalized = {
          code: couponCode.trim(),
          type: data?.type === 'percentage' ? 'percent' : 'amount',
          value: data?.value ?? data?.amount ?? 0,
        };

        setAppliedDiscount(normalized);

        // Auto-update amount paid if it was set to exact total
        if (amountPaid && parseFloat(parseFormattedNumber(amountPaid)) === cartTotal) {
          const newTotal = calculateTotalAfterDiscount();
          setAmountPaid(formatNumber(newTotal.toString()));
        }

        // Calculate discount amount for toast
        const discountAmount = calculateDiscountAmount();
        const discountTypeText =
          normalized.type === 'percent'
            ? `${normalized.value}% dari subtotal`
            : `Tetap ${formatCurrency(normalized.value)}`;

        toast.success(
          `✅ KUPON BERHASIL DITERAPKAN!\n\n📝 Kode: ${
            normalized.code
          }\n💰 Tipe: ${discountTypeText}\n💵 Total Diskon: ${formatCurrency(
            discountAmount
          )}\n\nTotal pembayaran telah diupdate.`,
          {
            duration: 5000,
            style: {
              minWidth: '400px',
              whiteSpace: 'pre-line',
              backgroundColor: '#d1fae5',
              color: '#065f46',
              border: '2px solid #10b981',
            },
          }
        );
      } else {
        // Handle error with detailed info
        let errorMessage = res.message || res.error || 'Kupon tidak valid';
        let errorTitle = '❌ Kupon Tidak Dapat Digunakan';
        const minimumAmount = res.data?.minimum_amount || res.minimum_amount;
        const currentAmount = res.data?.current_amount || res.current_amount;

        console.log('❌ Coupon validation failed:', {
          res,
          errorMessage,
          minimumAmount,
          currentAmount,
        });

        // Check for specific error types
        if (minimumAmount && currentAmount !== undefined) {
          const shortfall = minimumAmount - currentAmount;
          errorTitle = '⚠️ Minimum Belanja Belum Terpenuhi';
          errorMessage = `Kupon "${couponCode.trim()}" membutuhkan minimum belanja ${formatCurrency(
            minimumAmount
          )}.\n\nBelanja saat ini: ${formatCurrency(
            currentAmount
          )}\nKurang: ${formatCurrency(
            shortfall
          )}\n\nTambahkan item senilai ${formatCurrency(
            shortfall
          )} untuk bisa menggunakan kupon ini.`;
        } else if (minimumAmount) {
          errorTitle = '⚠️ Minimum Belanja Belum Terpenuhi';
          errorMessage = `Kupon "${couponCode.trim()}" membutuhkan minimum belanja ${formatCurrency(
            minimumAmount
          )}.\n\nBelanja saat ini: ${formatCurrency(orderTotal)}`;
        } else if (
          errorMessage.toLowerCase().includes('invalid') ||
          errorMessage.toLowerCase().includes('tidak valid') ||
          errorMessage.toLowerCase().includes('tidak ditemukan')
        ) {
          errorTitle = '❌ Kupon Tidak Ditemukan';
          errorMessage = `Kode kupon "${couponCode.trim()}" tidak ditemukan atau tidak aktif.\n\nPastikan kode kupon benar atau hubungi admin untuk bantuan.`;
        } else if (
          errorMessage.toLowerCase().includes('expired') ||
          errorMessage.toLowerCase().includes('habis') ||
          errorMessage.toLowerCase().includes('berakhir') ||
          errorMessage.toLowerCase().includes('expire')
        ) {
          errorTitle = '⏰ Kupon Sudah Berakhir';
          errorMessage = `Kupon "${couponCode.trim()}" sudah tidak berlaku.\n\nPeriode promo telah berakhir.`;
        } else if (errorMessage.toLowerCase().includes('minimum')) {
          errorTitle = '⚠️ Minimum Belanja Belum Terpenuhi';
          // errorMessage already set, no need to reassign
        }

        toast.error(`${errorTitle}\n\n${errorMessage}`, {
          duration: 8000,
          style: {
            minWidth: '450px',
            whiteSpace: 'pre-line',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            border: '2px solid #ef4444',
          },
        });
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error(
        '❌ Gagal Memvalidasi Kupon\n\nTerjadi kesalahan saat memvalidasi kupon. Silakan coba lagi atau hubungi admin.\n\nError: ' +
          (error.message || 'Unknown error'),
        {
          duration: 6000,
          style: {
            minWidth: '400px',
            whiteSpace: 'pre-line',
          },
        }
      );
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Remove discount
  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setCouponCode('');

    // Reset amount paid to new total if it was set
    if (amountPaid) {
      const newTotal = calculateTotalAfterDiscount();
      setAmountPaid(formatNumber(newTotal.toString()));
    }

    toast.success('Kupon dihapus');
  };

  const basePaymentMethods = [
    {
      id: 'cash',
      name: 'Tunai',
      icon: Banknote,
      color: 'bg-green-100 text-green-700 hover:bg-green-200',
      activeColor: 'bg-green-600 text-white',
    },
    // Only include Midtrans if enabled
    ...(isMidtransEnabled
      ? [
          {
            id: 'midtrans',
            name: 'E-Wallet & VA',
            icon: QrCode,
            color: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
            activeColor: 'bg-purple-600 text-white',
          },
        ]
      : []),
    {
      id: 'transfer',
      name: 'Transfer Bank',
      icon: Smartphone,
      color: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
      activeColor: 'bg-orange-600 text-white',
    },
  ];

  // Tambahkan opsi "Bayar Nanti" jika allowed (untuk laundry)
  const deferredPaymentMethod = allowDeferredPayment
    ? [
        {
          id: 'deferred',
          name: 'Bayar Nanti',
          icon: Clock,
          color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          activeColor: 'bg-gray-600 text-white',
          description: 'Pembayaran saat pengambilan',
        },
      ]
    : [];

  const paymentMethods = [...basePaymentMethods, ...deferredPaymentMethod];

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format number with thousand separator (dot)
  const formatNumber = (num) => {
    if (!num && num !== 0) return '';
    // Remove any non-digit characters first
    const cleaned = num.toString().replace(/[^\d]/g, '');
    if (!cleaned) return '';
    // Add thousand separator
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Parse formatted number back to number
  const parseFormattedNumber = (formatted) => {
    if (!formatted) return '';
    // Remove dots (thousand separators)
    return formatted.replace(/\./g, '');
  };

  const getChange = () => {
    const paid = parseFloat(parseFormattedNumber(amountPaid)) || 0;
    const total = calculateTotalAfterDiscount();
    return paid - total;
  };

  const handleQuickAmount = amount => {
    setAmountPaid(formatNumber(amount.toString()));
    setErrors({});
  };

  const handleExactAmount = () => {
    const total = calculateTotalAfterDiscount();
    setAmountPaid(formatNumber(total.toString()));
    setErrors({});
  };

  const validatePayment = () => {
    const newErrors = {};

    // Untuk deferred payment (Bayar Nanti), tidak perlu validasi amount
    if (selectedMethod === 'deferred') {
      setErrors(newErrors);
      return true;
    }

    const paid = parseFloat(parseFormattedNumber(amountPaid));
    const total = calculateTotalAfterDiscount();

    // Untuk Midtrans, tidak perlu input manual; jumlah otomatis = total
    if (selectedMethod !== 'midtrans') {
      if (!amountPaid || isNaN(paid) || paid === 0) {
        newErrors.amount = 'Jumlah pembayaran harus diisi';
      } else if (paid < total) {
        newErrors.amount = `Jumlah pembayaran kurang dari total. Kurang: ${formatCurrency(
          total - paid
        )}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDeferredPayment = async () => {
    setProcessing(true);
    try {
      // Untuk deferred payment, langsung panggil onPaymentComplete
      // dengan flag deferred, biarkan handlePaymentComplete yang membuat order
      await onPaymentComplete({
        method: 'deferred',
        amount: 0,
        change: 0,
        total: cartTotal,
        orderId: null, // Belum dibuat, akan dibuat di handlePaymentComplete
        customer_id: selectedCustomer?.id || null,
        customer: selectedCustomer, // Include full customer object
      });

      handleClose();
    } catch (error) {
      console.error('Deferred payment error:', error);
      setErrors({ general: error.message || 'Gagal membuat order' });
    } finally {
      setProcessing(false);
    }
  };

  // Helper function to get order ID from order number
  const getOrderIdFromOrderNumber = async (orderNumber) => {
    try {
      const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/v1/orders?order_number=${orderNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Business-Id': localStorage.getItem('currentBusinessId'),
            'X-Outlet-Id': localStorage.getItem('currentOutletId'),
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          return data.data[0].id;
        }
      }
    } catch (error) {
      console.error('Error getting order ID:', error);
    }
    return null;
  };

  const handleProcessPayment = async () => {
    if (!validatePayment()) return;

    // Handle deferred payment (Bayar Nanti)
    if (selectedMethod === 'deferred') {
      await handleDeferredPayment();
      return;
    }

    setProcessing(true);
    try {
      // Handle Midtrans payment (E-Wallet, VA, QRIS, etc)
      if (selectedMethod === 'midtrans' || selectedMethod === 'qris') {
        let currentOrderId = orderId;

        console.log('🔄 Processing Midtrans payment, orderId:', currentOrderId);

        // If no orderId and onCreateOrder callback provided, create order first
        if (!currentOrderId && onCreateOrder) {
          try {
            console.log('📝 Creating new order for Midtrans payment...');
            currentOrderId = await onCreateOrder();
            console.log('✅ Order created:', currentOrderId);
          } catch (error) {
            console.error('❌ Error creating order:', error);
            setErrors({ general: 'Gagal membuat order: ' + error.message });
            setProcessing(false);
            return;
          }
        }

        if (!currentOrderId) {
          console.error('❌ Order ID tidak ditemukan');
          setErrors({ general: 'Order ID tidak ditemukan. Silakan buat order terlebih dahulu.' });
          setProcessing(false);
          return;
        }

        // ✅ FIX: Untuk existing order, gunakan orderService.processPayment
        // Ini akan handle QRIS/Midtrans dengan benar
        if (orderId) {
          // Existing order - process payment via orderService
          console.log('💳 Processing payment for existing order:', currentOrderId);
          const { orderService } = await import('../../services/order.service');

          const paymentResult = await orderService.processPayment(
            currentOrderId,
            {
              method: 'qris',
              amount: calculateTotalAfterDiscount(),
            }
          );

          console.log('📦 Payment result:', paymentResult);

          if (!paymentResult.success) {
            console.error('❌ Payment failed:', paymentResult.error);
            throw new Error(
              paymentResult.error || paymentResult.message || 'Gagal membuat pembayaran Midtrans'
            );
          }

          // Check if paymentResult has snap_token
          const snapToken =
            paymentResult.data?.data?.snap_token ||
            paymentResult.data?.snap_token ||
            paymentResult.data?.snapToken;
          const clientKey =
            paymentResult.data?.data?.client_key ||
            paymentResult.data?.client_key ||
            paymentResult.data?.clientKey;

          console.log('🔑 Snap token:', snapToken ? 'Found' : 'Not found');
          console.log('🔑 Client key:', clientKey ? 'Found' : 'Not found');

          if (snapToken && clientKey) {
            // Show Midtrans modal with snap token
            console.log('✅ Opening Midtrans payment modal...');
            console.log('📦 Setting qrisData:', { snap_token: snapToken ? 'exists' : 'missing', client_key: clientKey ? 'exists' : 'missing' });
            setQrisData({
              snap_token: snapToken,
              client_key: clientKey,
              payment_id: paymentResult.data?.payment_id || paymentResult.data?.data?.payment_id,
              order_number: paymentResult.data?.order_number || paymentResult.data?.data?.order_number,
              payment_reference: paymentResult.data?.payment_reference || paymentResult.data?.data?.payment_reference,
            });
            console.log('🔄 Setting showQrisModal to true');
            setShowQrisModal(true);
            console.log('✅ State updated, Midtrans modal should appear');
            // Don't close PaymentModal - let Midtrans modal appear on top
            // PaymentModal will be closed when Midtrans modal closes
            setProcessing(false);
            return;
          } else {
            console.warn('⚠️ Snap token or client key missing, trying fallback API...');
            // Fallback: Call API directly
            const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
            console.log('🔄 Calling fallback API:', `${API_BASE}/v1/orders/payment/qris`);
            
            const response = await fetch(
              `${API_BASE}/v1/orders/payment/qris`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                  'X-Business-Id': localStorage.getItem('currentBusinessId'),
                  'X-Outlet-Id': localStorage.getItem('currentOutletId'),
                },
                body: JSON.stringify({
                  order_id: currentOrderId,
                }),
              }
            );

            const result = await response.json();
            console.log('📦 Fallback API result:', result);

            if (!result.success) {
              console.error('❌ Fallback API failed:', result.message || result.error);
              throw new Error(
                result.message || result.error || 'Gagal membuat pembayaran Midtrans'
              );
            }

            // Extract snap token and client key from result
            const fallbackSnapToken = result.data?.snap_token || result.data?.snapToken || result.snap_token;
            const fallbackClientKey = result.data?.client_key || result.data?.clientKey || result.client_key;

            if (!fallbackSnapToken || !fallbackClientKey) {
              console.error('❌ Snap token or client key missing in fallback response');
              throw new Error('Data pembayaran Midtrans tidak lengkap. Silakan coba lagi.');
            }

            // Show Midtrans modal with snap token
            console.log('✅ Opening Midtrans payment modal from fallback...');
            console.log('📦 Setting qrisData:', { snap_token: fallbackSnapToken ? 'exists' : 'missing', client_key: fallbackClientKey ? 'exists' : 'missing' });
            setQrisData({
              snap_token: fallbackSnapToken,
              client_key: fallbackClientKey,
              payment_id: result.data?.payment_id || result.payment_id,
              order_number: result.data?.order_number || result.order_number,
              payment_reference: result.data?.payment_reference || result.payment_reference,
            });
            console.log('🔄 Setting showQrisModal to true');
            setShowQrisModal(true);
            console.log('✅ State updated, Midtrans modal should appear');
            // Don't close PaymentModal - let Midtrans modal appear on top
            setProcessing(false);
            return;
          }
        } else {
          // New order - call API directly
          const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
          console.log('📝 Processing payment for new order:', currentOrderId);
          console.log('🔄 Calling API:', `${API_BASE}/v1/orders/payment/qris`);
          
          const response = await fetch(
            `${API_BASE}/v1/orders/payment/qris`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'X-Business-Id': localStorage.getItem('currentBusinessId'),
                'X-Outlet-Id': localStorage.getItem('currentOutletId'),
              },
              body: JSON.stringify({
                order_id: currentOrderId,
              }),
            }
          );

          const result = await response.json();
          console.log('📦 API result:', result);

          if (!result.success) {
            console.error('❌ API failed:', result.message || result.error);
            throw new Error(
              result.message || result.error || 'Gagal membuat pembayaran Midtrans'
            );
          }

          // Extract snap token and client key from result
          const newOrderSnapToken = result.data?.snap_token || result.data?.snapToken || result.snap_token;
          const newOrderClientKey = result.data?.client_key || result.data?.clientKey || result.client_key;

          if (!newOrderSnapToken || !newOrderClientKey) {
            console.error('❌ Snap token or client key missing in response');
            throw new Error('Data pembayaran Midtrans tidak lengkap. Silakan coba lagi.');
          }

          // Show Midtrans modal with snap token
          console.log('✅ Opening Midtrans payment modal for new order...');
          console.log('📦 Setting qrisData:', { snap_token: newOrderSnapToken ? 'exists' : 'missing', client_key: newOrderClientKey ? 'exists' : 'missing' });
          setQrisData({
            snap_token: newOrderSnapToken,
            client_key: newOrderClientKey,
            payment_id: result.data?.payment_id || result.payment_id,
            order_number: result.data?.order_number || result.order_number,
            payment_reference: result.data?.payment_reference || result.payment_reference,
          });
          console.log('🔄 Setting showQrisModal to true');
          setShowQrisModal(true);
          console.log('✅ State updated, Midtrans modal should appear');
          // Don't close PaymentModal - let Midtrans modal appear on top
          setProcessing(false);
          return;
        }
      }

      // Handle other payment methods (cash, card, transfer)
      const finalTotal = calculateTotalAfterDiscount();
      const discountAmount = calculateDiscountAmount();

      // ✅ FIX: Parse amountPaid correctly (remove thousand separators first)
      const paidAmount = parseFloat(parseFormattedNumber(amountPaid)) || 0;

      const paymentData = {
        method: selectedMethod,
        amount: paidAmount,
        change: getChange(),
        total: finalTotal,
        originalTotal: cartTotal,
        discount: discountAmount,
        discountCode: appliedDiscount?.code || null,
        customer_id: selectedCustomer?.id || null,
        customer: selectedCustomer, // Include full customer object
        reference_number: referenceNumber?.trim() || null, // ✅ NEW: Reference number for QRIS toko / Transfer
      };

      await onPaymentComplete(paymentData);
      handleClose();
    } catch (error) {
      console.error('❌ Payment error:', error);
      const errorMessage = error.message || error.response?.data?.message || error.response?.data?.error || 'Gagal memproses pembayaran';
      setErrors({ general: errorMessage });
      
      // Show toast for better visibility
      toast.error(`❌ ${errorMessage}`, {
        duration: 5000,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedMethod('cash');
    setAmountPaid('');
    setReferenceNumber(''); // ✅ NEW: Reset reference number
    setErrors({});
    setCouponCode('');
    setAppliedDiscount(null);
    setIsMidtransEnabled(false);
    // Reset customer to initialCustomer if provided, otherwise null
    setSelectedCustomer(initialCustomer);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className='sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col'>
          <DialogHeader className='flex-shrink-0'>
            <DialogTitle className='text-lg md:text-xl font-bold flex items-center'>
              <DollarSign className='w-5 h-5 mr-2 text-blue-600' />
              Proses Pembayaran
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-3 py-2 overflow-y-auto flex-1'>
            {/* Total Amount */}
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2'>
              <div className='flex justify-between items-center text-sm'>
                <span className='text-gray-600'>Subtotal:</span>
                <span className='font-medium'>
                  {formatCurrency(cartTotal || 0)}
                </span>
              </div>
              {appliedDiscount && (
                <div className='flex justify-between items-center text-sm bg-green-50 -mx-1 px-3 py-1.5 rounded border border-green-200'>
                  <span className='text-gray-700 flex items-center font-medium'>
                    <Tag className='w-3.5 h-3.5 mr-1.5 text-green-600' />
                    Diskon ({appliedDiscount.code}):
                  </span>
                  <span className='font-semibold text-red-600'>
                    -{formatCurrency(calculateDiscountAmount())}
                  </span>
                </div>
              )}
              <div className='flex justify-between items-center pt-2 border-t border-blue-300'>
                <span className='text-sm md:text-base font-semibold text-gray-700'>
                  Total Pembayaran:
                </span>
                <span className='text-xl md:text-2xl font-bold text-blue-600'>
                  {formatCurrency(calculateTotalAfterDiscount())}
                </span>
              </div>
              {appliedDiscount && (
                <div className='text-xs text-green-600 pt-1 font-medium'>
                  💰 Hemat: {formatCurrency(calculateDiscountAmount())}
                </div>
              )}
            </div>

            {/* Customer Selection Section */}
            <div className='space-y-2'>
              <Label className='text-sm font-semibold flex items-center'>
                <User className='w-4 h-4 mr-2 text-blue-600' />
                Pelanggan (Opsional)
              </Label>
              {selectedCustomer ? (
                <div className='flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-1'>
                      <User className='w-4 h-4 text-blue-600' />
                      <span className='font-semibold text-sm text-gray-800'>
                        {selectedCustomer.name}
                      </span>
                    </div>
                    {selectedCustomer.phone && (
                      <p className='text-xs text-gray-600'>
                        📞 {selectedCustomer.phone}
                      </p>
                    )}
                    {selectedCustomer.email && (
                      <p className='text-xs text-gray-600'>
                        ✉️ {selectedCustomer.email}
                      </p>
                    )}
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => setSelectedCustomer(null)}
                    className='text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0'
                    title='Hapus pelanggan'
                  >
                    <X className='w-4 h-4' />
                  </Button>
                </div>
              ) : (
                <div className='space-y-2'>
                  <Button
                    type='button'
                    variant='outline'
                    className='w-full'
                    onClick={() => setCustomerModalOpen(true)}
                  >
                    <User className='w-4 h-4 mr-2' />
                    Pilih atau Tambah Pelanggan
                  </Button>
                  <p className='text-xs text-gray-500 text-center'>
                    Kosongkan jika walk-in customer
                  </p>
                </div>
              )}
            </div>

            {/* Coupon/Discount Section */}
            <div className='space-y-2'>
              <Label className='text-sm font-semibold'>
                Kode Kupon / Diskon
              </Label>
              {appliedDiscount ? (
                <div className='space-y-2'>
                  {/* Applied Discount Info */}
                  <div className='bg-green-50 border-2 border-green-300 rounded-lg p-3'>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='flex items-center gap-2'>
                        <Tag className='w-5 h-5 text-green-600' />
                        <div>
                          <p className='text-sm font-bold text-green-800'>
                            ✅ Kupon Aktif: {appliedDiscount.code}
                          </p>
                          <p className='text-xs text-green-600'>
                            Tipe:{' '}
                            {appliedDiscount.type === 'percent'
                              ? `Diskon ${appliedDiscount.value}%`
                              : `Diskon Tetap ${formatCurrency(
                                  appliedDiscount.value
                                )}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={handleRemoveDiscount}
                        className='text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0'
                        title='Hapus kupon'
                      >
                        <X className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>

                  {/* Discount Amount Display */}
                  <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
                    <Label className='text-xs font-semibold text-gray-600 mb-1 block'>
                      Jumlah Diskon yang Diterapkan:
                    </Label>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm text-gray-700'>
                          {appliedDiscount.type === 'percent' ? (
                            <>
                              <span className='font-semibold'>
                                {appliedDiscount.value}%
                              </span>
                              <span className='text-xs text-gray-500 ml-1'>
                                dari subtotal ({formatCurrency(cartTotal || 0)})
                              </span>
                            </>
                          ) : (
                            <>
                              <span className='font-semibold'>
                                {formatCurrency(appliedDiscount.value)}
                              </span>
                              <span className='text-xs text-gray-500 ml-1'>
                                (Diskon tetap)
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                      <span className='text-lg font-bold text-red-600'>
                        -{formatCurrency(calculateDiscountAmount())}
                      </span>
                    </div>
                    <div className='mt-2 pt-2 border-t border-blue-300'>
                      <div className='flex justify-between text-xs'>
                        <span className='text-gray-600'>Total Diskon:</span>
                        <span className='font-semibold text-red-600'>
                          {formatCurrency(calculateDiscountAmount())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='space-y-2'>
                  <div className='flex gap-2'>
                    <Input
                      type='text'
                      value={couponCode}
                      onChange={e =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      placeholder='Masukkan kode kupon (contoh: OPENMS)'
                      className='flex-1'
                      onKeyPress={e => {
                        if (e.key === 'Enter' && couponCode.trim()) {
                          handleApplyCoupon();
                        }
                      }}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleApplyCoupon();
                      }}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className='px-4 min-w-[100px]'
                    >
                      {applyingCoupon ? (
                        <>
                          <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                          Validasi...
                        </>
                      ) : (
                        <>
                          <Tag className='w-4 h-4 mr-2' />
                          Apply
                        </>
                      )}
                    </Button>
                  </div>
                  <p className='text-xs text-gray-500'>
                    💡 Tekan Enter atau klik Apply untuk memvalidasi kupon
                  </p>
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className='space-y-2'>
              <Label className='text-sm font-semibold'>Metode Pembayaran</Label>
              <div className='grid grid-cols-2 gap-2'>
                {paymentMethods.map(method => {
                  const Icon = method.icon;
                  const isSelected = selectedMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type='button'
                      onClick={() => setSelectedMethod(method.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border-2 transition-all ${
                        isSelected
                          ? `${method.activeColor} border-transparent`
                          : `${method.color} border-gray-200`
                      }`}
                    >
                      <Icon className='w-6 h-6 mb-1' />
                      <span className='text-[11px] md:text-xs font-medium text-center leading-tight'>
                        {method.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reference Number Input - Only for cash/transfer */}
            {(selectedMethod === 'cash' || selectedMethod === 'transfer') && (
              <div className='space-y-2'>
                <Label htmlFor='reference_number' className='text-sm font-semibold'>
                  Nomor Referensi / Kode Unik (Opsional)
                </Label>
                <Input
                  id='reference_number'
                  type='text'
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value.toUpperCase())}
                  placeholder='Masukkan nomor referensi pembayaran (contoh: QRIS123456)'
                  className='text-sm'
                />
                <p className='text-xs text-gray-500'>
                  💡 Gunakan untuk mencatat nomor referensi QRIS toko atau bukti transfer bank
                </p>
              </div>
            )}

            {/* Amount Input - Hide untuk deferred payment */}
            {selectedMethod !== 'deferred' && (
              <div className='space-y-2'>
                <Label htmlFor='amount' className='text-sm font-semibold'>
                  Jumlah Dibayar
                </Label>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium'>
                    Rp
                  </span>
                  <Input
                    id='amount'
                    type='text'
                    value={amountPaid}
                    onChange={e => {
                      // Format input with thousand separator
                      const formatted = formatNumber(e.target.value);
                      setAmountPaid(formatted);
                      setErrors({});
                    }}
                    placeholder='0'
                    className={`text-right text-base md:text-lg font-semibold pl-12 h-11 ${
                      errors.amount ? 'border-red-500' : ''
                    }`}
                    disabled={selectedMethod === 'midtrans'}
                  />
                </div>
                {selectedMethod === 'midtrans' && (
                  <p className='text-xs text-gray-600'>
                    Pembayaran Midtrans otomatis sebesar total transaksi.
                  </p>
                )}
                {errors.amount && (
                  <p className='text-xs text-red-600'>{errors.amount}</p>
                )}

                {/* Quick Amount Buttons */}
                <div className='grid grid-cols-4 gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleExactAmount}
                    className='text-[11px] h-9'
                  >
                    Pas
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => handleQuickAmount(50000)}
                    className='text-[11px] h-9'
                  >
                    50K
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => handleQuickAmount(100000)}
                    className='text-[11px] h-9'
                  >
                    100K
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => handleQuickAmount(200000)}
                    className='text-[11px] h-9'
                  >
                    200K
                  </Button>
                </div>
              </div>
            )}

            {/* Info untuk Bayar Nanti */}
            {selectedMethod === 'deferred' && (
              <div className='bg-gray-50 border border-gray-200 rounded-lg p-3'>
                <div className='flex items-start'>
                  <Clock className='w-5 h-5 text-gray-600 mr-2 mt-0.5' />
                  <div className='flex-1'>
                    <p className='text-sm font-semibold text-gray-700'>
                      Pembayaran Ditunda
                    </p>
                    <p className='text-xs text-gray-600 mt-1'>
                      Order akan dibuat tanpa pembayaran. Pelanggan dapat
                      membayar saat mengambil pesanan.
                    </p>
                    <p className='text-xs font-semibold text-gray-800 mt-2'>
                      Total: {formatCurrency(cartTotal || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Change Calculation */}
            {selectedMethod !== 'midtrans' &&
              selectedMethod !== 'deferred' &&
              amountPaid &&
              parseFloat(parseFormattedNumber(amountPaid)) >= calculateTotalAfterDiscount() && (
                <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-semibold text-gray-700'>
                      Kembalian:
                    </span>
                    <span className='text-lg md:text-xl font-bold text-green-600'>
                      {formatCurrency(getChange())}
                    </span>
                  </div>
                </div>
              )}

            {/* Insufficient Payment Warning */}
            {selectedMethod !== 'midtrans' &&
              selectedMethod !== 'deferred' &&
              amountPaid &&
              parseFloat(parseFormattedNumber(amountPaid)) < calculateTotalAfterDiscount() && (
                <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-semibold text-gray-700'>
                      Kurang Bayar:
                    </span>
                    <span className='text-lg md:text-xl font-bold text-red-600'>
                      {formatCurrency(
                        calculateTotalAfterDiscount() - parseFloat(parseFormattedNumber(amountPaid))
                      )}
                    </span>
                  </div>
                  <p className='text-xs text-red-600 mt-1.5'>
                    Pembayaran tidak dapat diproses karena kurang dari total
                  </p>
                </div>
              )}

            {errors.general && (
              <div className='bg-red-50 border border-red-200 rounded-lg p-2.5'>
                <p className='text-xs text-red-600'>{errors.general}</p>
              </div>
            )}
          </div>

          <DialogFooter className='gap-2 flex-shrink-0 pt-3 border-t'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={processing}
              className='text-sm h-10'
            >
              Batal
            </Button>
            <Button
              type='button'
              onClick={handleProcessPayment}
              disabled={
                processing ||
                (selectedMethod !== 'midtrans' &&
                  selectedMethod !== 'deferred' &&
                  (!amountPaid ||
                    parseFloat(parseFormattedNumber(amountPaid)) < calculateTotalAfterDiscount()))
              }
              className={`min-w-[120px] disabled:bg-gray-400 text-sm h-10 ${
                selectedMethod === 'deferred'
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {processing ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Memproses...
                </>
              ) : selectedMethod === 'deferred' ? (
                <>
                  <Clock className='w-4 h-4 mr-2' />
                  Buat Order
                </>
              ) : (
                <>
                  <Calculator className='w-4 h-4 mr-2' />
                  Bayar Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Select Modal */}
      <CustomerSelectModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelectCustomer={customer => {
          setSelectedCustomer(customer);
          setCustomerModalOpen(false);
          if (customer) {
            toast.success(`Pelanggan "${customer.name}" dipilih`);
          } else {
            toast.success('Walk-in customer dipilih');
          }
        }}
      />

      {/* Midtrans Payment Modal - Render even if PaymentModal is closing */}
      {showQrisModal && qrisData && (
        <MidtransPaymentModal
          open={showQrisModal}
          onClose={() => {
            console.log('🔒 Closing Midtrans payment modal');
            setShowQrisModal(false);
            setQrisData(null);
            // Also close PaymentModal if it's still open
            handleClose();
          }}
          qrisData={qrisData}
          onPaymentSuccess={async result => {
            console.log('✅ Payment success:', result);
            
            // ✅ FIX: Sync payment status dari Midtrans sebelum reload
            try {
              // Use orderId prop or get order from qrisData.order_number
              const orderIdToSync = orderId || (qrisData?.order_number ? await getOrderIdFromOrderNumber(qrisData.order_number) : null);
              
              if (orderIdToSync) {
                const syncResult = await orderService.syncPaymentStatus(orderIdToSync);
                console.log('🔄 Payment status synced:', syncResult);
              } else if (qrisData?.payment_id) {
                // Fallback: check payment status which will also update order
                const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
                const token = localStorage.getItem('token');
                await fetch(
                  `${API_BASE}/v1/orders/payment/${qrisData.payment_id}/status`,
                  {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'X-Business-Id': localStorage.getItem('currentBusinessId'),
                      'X-Outlet-Id': localStorage.getItem('currentOutletId'),
                    },
                  }
                );
              }
            } catch (syncError) {
              console.error('⚠️ Failed to sync payment status:', syncError);
              // Continue anyway - webhook will update it later
            }
            
            // Close both modals
            setShowQrisModal(false);
            setQrisData(null);
            handleClose();
            
            // ✅ FIX: Show success toast
            toast.success('✅ Pembayaran berhasil!', {
              duration: 2000,
            });
            
            // ✅ FIX: Trigger payment complete callback untuk refresh order list tanpa reload
            if (onPaymentComplete) {
              try {
                // Get updated order data
                const orderIdToSync = orderId || (qrisData?.order_number ? await getOrderIdFromOrderNumber(qrisData.order_number) : null);
                if (orderIdToSync) {
                  // Get fresh order data
                  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
                  const token = localStorage.getItem('token');
                  const orderResponse = await fetch(
                    `${API_BASE}/v1/orders/${orderIdToSync}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-Business-Id': localStorage.getItem('currentBusinessId'),
                        'X-Outlet-Id': localStorage.getItem('currentOutletId'),
                      },
                    }
                  );
                  
                  if (orderResponse.ok) {
                    const orderData = await orderResponse.json();
                    if (orderData.success && orderData.data) {
                      // Trigger callback dengan order data yang sudah di-update
                      await onPaymentComplete({
                        method: 'qris',
                        order: orderData.data,
                        success: true,
                      });
                    }
                  }
                } else {
                  // Fallback: trigger callback tanpa order data
                  await onPaymentComplete({
                    method: 'qris',
                    success: true,
                  });
                }
              } catch (error) {
                console.error('Error triggering payment complete:', error);
                // Still trigger callback even if error
                if (onPaymentComplete) {
                  await onPaymentComplete({
                    method: 'qris',
                    success: true,
                  });
                }
              }
            }
          }}
        />
      )}
      
      {/* Debug overlay - shows when modal should appear */}
      {process.env.NODE_ENV === 'development' && showQrisModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: '10px', 
            right: '10px', 
            background: 'rgba(255, 255, 0, 0.9)', 
            padding: '10px', 
            zIndex: 10000,
            border: '2px solid red',
            fontSize: '12px'
          }}
        >
          <div>showQrisModal: {String(showQrisModal)}</div>
          <div>qrisData: {qrisData ? 'exists' : 'null'}</div>
          <div>snap_token: {qrisData?.snap_token ? 'exists' : 'missing'}</div>
          <div>client_key: {qrisData?.client_key ? 'exists' : 'missing'}</div>
        </div>
      )}
    </>
  );
};

export default PaymentModal;
