import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  Minus,
  Plus,
  X,
  Phone,
  Loader2,
  CheckCircle,
  Store,
  QrCode,
  CreditCard,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import MidtransPaymentModal from '../components/modals/QRISPaymentModal';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const PublicSelfServiceMenu = () => {
  const { qrCode } = useParams();
  const navigate = useNavigate();

  // State management
  const [menuData, setMenuData] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // ✅ NEW: State untuk mengecek apakah Midtrans aktif
  const [isMidtransEnabled, setIsMidtransEnabled] = useState(false);
  const [checkingMidtrans, setCheckingMidtrans] = useState(true);

  // Checkout form state
  const [checkoutForm, setCheckoutForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    jumlah_orang: 1, // ✅ NEW: Jumlah orang (default 1)
    notes: '',
    payment_method: 'pay_later', // Default: Bayar di Kasir (akan diubah jika Midtrans aktif)
  });

  // Customer data toggle
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  // Customer search state
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState(null);

  // Discount state
  const [discountCode, setDiscountCode] = useState('');
  const [discountData, setDiscountData] = useState(null);
  const [discountError, setDiscountError] = useState('');
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  // Midtrans payment modal state
  const [showMidtransModal, setShowMidtransModal] = useState(false);
  const [midtransData, setMidtransData] = useState(null);

  // Load menu data on mount
  useEffect(() => {
    loadMenuData();
  }, [qrCode]);

  // ✅ NEW: Check Midtrans configuration from menu data (no auth required)
  useEffect(() => {
    if (menuData) {
      // ✅ FIX: Gunakan midtrans_enabled dari response menu (tidak perlu request terpisah)
      const isEnabled = menuData.midtrans_enabled === true;
      setIsMidtransEnabled(isEnabled);

      // ✅ FIX: Set default payment method berdasarkan konfigurasi Midtrans
      if (isEnabled && checkoutForm.payment_method === 'pay_later') {
        setCheckoutForm(prev => ({ ...prev, payment_method: 'midtrans' }));
      } else if (!isEnabled && checkoutForm.payment_method === 'midtrans') {
        setCheckoutForm(prev => ({ ...prev, payment_method: 'pay_later' }));
      }

      setCheckingMidtrans(false);
    }
  }, [menuData]);

  // Auto-search customer by phone with debounce
  useEffect(() => {
    if (!showCustomerForm || !checkoutForm.customer_phone) {
      setFoundCustomer(null);
      return;
    }

    // Only search if phone number is at least 8 digits
    if (checkoutForm.customer_phone.length < 8) {
      setFoundCustomer(null);
      return;
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchCustomerByPhone(checkoutForm.customer_phone);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [checkoutForm.customer_phone, showCustomerForm]);

  const searchCustomerByPhone = async (phone) => {
    try {
      setSearchingCustomer(true);

      const response = await fetch(
        `${API_BASE_URL}/api/public/v1/self-service/customer/search/${qrCode}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone }),
        }
      );

      const data = await response.json();

      if (data.success && data.found) {
        // Customer found - auto-fill data
        setFoundCustomer(data.data);
        setCheckoutForm(prev => ({
          ...prev,
          customer_name: data.data.name,
          customer_email: data.data.email || '',
        }));
      } else {
        // Customer not found
        setFoundCustomer(null);
      }
    } catch (err) {
      console.error('Failed to search customer:', err);
      setFoundCustomer(null);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const loadMenuData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/public/v1/self-service/menu/${qrCode}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        // ✅ NEW: Handle 403 error (self-service disabled)
        if (response.status === 403) {
          throw new Error(data.message || 'Self Service tidak diaktifkan untuk outlet ini. Silakan hubungi administrator.');
        }
        throw new Error(data.message || 'QR Code tidak valid atau tidak aktif');
      }

      setMenuData(data.data);
      setProducts(data.data.products || []);
      setCategories(data.data.categories || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat menu');
      console.error('Failed to load menu data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart functions
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);

    if (existingItem) {
      setCart(
        cart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          image_url: product.image_url || null,
        },
      ]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
    } else {
      setCart(
        cart.map(item =>
          item.product_id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const calculateTax = () => {
    if (!menuData?.outlet?.tax_rate) return 0;

    const subtotal = calculateSubtotal();
    const discount = discountData?.discount_amount || 0;
    const taxableAmount = subtotal - discount;

    return taxableAmount * (menuData.outlet.tax_rate / 100);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = discountData?.discount_amount || 0;
    const tax = calculateTax();
    return subtotal - discount + tax;
  };

  const handleValidateDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError('Masukkan kode diskon terlebih dahulu');
      return;
    }

    try {
      setValidatingDiscount(true);
      setDiscountError('');

      const subtotal = calculateSubtotal();

      const response = await fetch(
        `${API_BASE_URL}/api/public/v1/self-service/validate-discount/${qrCode}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            discount_code: discountCode,
            subtotal: subtotal,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setDiscountData(data.data);
        setDiscountError('');
      } else {
        setDiscountData(null);
        setDiscountError(data.message || 'Kode diskon tidak valid');
      }
    } catch (err) {
      setDiscountData(null);
      setDiscountError('Gagal memvalidasi kode diskon');
      console.error('Failed to validate discount:', err);
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountCode('');
    setDiscountData(null);
    setDiscountError('');
  };

  // Checkout functions
  const handleCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Keranjang masih kosong!');
      return;
    }

    // Validate customer data only if form is shown
    if (showCustomerForm) {
      if (!checkoutForm.customer_name || !checkoutForm.customer_phone) {
        alert('Nama dan nomor telepon harus diisi jika mengisi data pelanggan!');
        return;
      }
    }

    try {
      setSubmitting(true);

      const orderData = {
        // Only include customer data if form is filled
        customer_name: showCustomerForm ? checkoutForm.customer_name : 'Guest',
        customer_phone: showCustomerForm ? checkoutForm.customer_phone : null,
        customer_email: showCustomerForm ? (checkoutForm.customer_email || null) : null,
        jumlah_orang: checkoutForm.jumlah_orang || 1, // ✅ NEW: Jumlah orang
        notes: checkoutForm.notes || '',
        discount_code: discountData ? discountCode : null,
        payment_method: checkoutForm.payment_method,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      const response = await fetch(
        `${API_BASE_URL}/api/public/v1/self-service/order/${qrCode}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Show detailed error message
        const errorMsg = data.error || data.message || 'Gagal membuat pesanan';
        console.error('Order submission failed:', data);
        throw new Error(errorMsg);
      }

      // Order created successfully
      const createdOrder = data.data;
      setOrderNumber(createdOrder.order_number);

      // Handle Midtrans payment
      if (checkoutForm.payment_method === 'midtrans') {
        // Request Midtrans payment
        try {
          const paymentResponse = await fetch(
            `${API_BASE_URL}/api/public/v1/self-service/order/${createdOrder.order_number}/payment/midtrans`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          const paymentData = await paymentResponse.json();

          if (!paymentResponse.ok || !paymentData.success) {
            throw new Error(paymentData.message || 'Gagal membuat pembayaran Midtrans');
          }

          // Show Midtrans payment modal
          setMidtransData({
            snap_token: paymentData.data.snap_token,
            client_key: paymentData.data.client_key,
            amount: calculateTotal(),
            order_number: createdOrder.order_number,
            payment_id: paymentData.data.payment_id,
          });
          setShowMidtransModal(true);
          setShowCheckout(false);

          // Clear cart and form
          setCart([]);
          setCheckoutForm({
            customer_name: '',
            customer_phone: '',
            customer_email: '',
            jumlah_orang: 1, // ✅ NEW: Reset jumlah orang
            notes: '',
            payment_method: 'midtrans',
          });
          setDiscountCode('');
          setDiscountData(null);
          setDiscountError('');
          setFoundCustomer(null);
        } catch (paymentErr) {
          console.error('Midtrans payment error:', paymentErr);
          alert(`Pesanan berhasil dibuat, tetapi gagal membuat pembayaran Midtrans:\n\n${paymentErr.message}\n\nSilakan hubungi kasir untuk melakukan pembayaran.`);
          setOrderSuccess(true);
        }
      } else {
        // For "Bayar di Kasir" - show success
        setOrderSuccess(true);

        setCart([]);
        setCheckoutForm({
          customer_name: '',
          customer_phone: '',
          customer_email: '',
          jumlah_orang: 1, // ✅ NEW: Reset jumlah orang
          notes: '',
          payment_method: 'midtrans',
        });
        setDiscountCode('');
        setDiscountData(null);
        setDiscountError('');
        setFoundCustomer(null);
      }
    } catch (err) {
      const errorMessage = err.message || 'Gagal membuat pesanan';
      console.error('Failed to submit order:', err);
      console.error('Error details:', errorMessage);
      alert(`Gagal membuat pesanan:\n\n${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewOrderStatus = () => {
    navigate(`/order-status/${orderNumber}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4'>
        <div className='bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center'>
          <div className='text-red-600 mb-4'>
            <QrCode className='w-12 h-12 mx-auto' />
          </div>
          <h2 className='text-lg font-semibold text-red-900 mb-2'>
            QR Code Tidak Valid
          </h2>
          <p className='text-sm text-red-700'>{error}</p>
        </div>
      </div>
    );
  }

  // Order success modal
  if (orderSuccess) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4'>
        <div className='bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center'>
          <div className='mb-6'>
            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <CheckCircle className='w-10 h-10 text-green-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              Pesanan Berhasil!
            </h2>
            <p className='text-gray-600 mb-4'>
              Nomor pesanan Anda:
            </p>
            <div className='bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6'>
              <p className='text-2xl font-bold text-blue-600'>{orderNumber}</p>
            </div>
            <p className='text-sm text-gray-500 mb-6'>
              Pesanan Anda sedang diproses. Mohon tunggu konfirmasi dari staff kami.
            </p>
          </div>
          <div className='space-y-3'>
            <Button
              onClick={handleViewOrderStatus}
              className='w-full bg-blue-600 hover:bg-blue-700 text-white'
            >
              Cek Status Pesanan
            </Button>
            <Button
              onClick={() => {
                setOrderSuccess(false);
                setShowCheckout(false);
              }}
              variant='outline'
              className='w-full'
            >
              Pesan Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white shadow-sm sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 py-4'>
          <div className='flex items-center justify-between mb-3'>
            <div>
              <h1 className='text-xl font-bold text-gray-900'>
                {menuData?.outlet?.name || 'Menu Self Service'}
              </h1>
              <p className='text-sm text-gray-600'>
                {menuData?.table?.name || 'Self Service'}
              </p>
            </div>
            <Button
              onClick={() => setShowCart(true)}
              className='relative bg-blue-600 hover:bg-blue-700 text-white'
            >
              <ShoppingCart className='w-5 h-5 mr-2' />
              Keranjang
              {cart.length > 0 && (
                <Badge className='ml-2 bg-red-500 text-white'>
                  {cart.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Search */}
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
            <input
              type='text'
              placeholder='Cari menu...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className='bg-white border-b sticky top-[120px] z-10'>
          <div className='max-w-7xl mx-auto px-4 py-3 overflow-x-auto'>
            <div className='flex space-x-2'>
              <Button
                variant={!selectedCategory ? 'default' : 'outline'}
                size='sm'
                onClick={() => setSelectedCategory(null)}
              >
                Semua
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className='max-w-7xl mx-auto px-4 py-6'>
        {filteredProducts.length === 0 ? (
          <div className='text-center py-12'>
            <p className='text-gray-500'>Tidak ada produk tersedia</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className='bg-white rounded-lg shadow hover:shadow-lg transition-all overflow-hidden flex flex-col cursor-pointer group hover:scale-[1.02] active:scale-[0.98]'
              >
                {/* Product Image */}
                <div className='relative w-full h-48 bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden'>
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  {/* Placeholder for products without image */}
                  {!product.image_url && (
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <div className='text-center'>
                        <Store className='w-16 h-16 text-blue-300 mx-auto mb-2 group-hover:scale-110 transition-transform' />
                        <p className='text-xs text-blue-400 font-medium px-4 line-clamp-2'>
                          {product.name}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Fallback element for image load errors */}
                  <div className='absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100'>
                    <div className='text-center'>
                      <Store className='w-16 h-16 text-blue-300 mx-auto mb-2' />
                      <p className='text-xs text-blue-400 font-medium px-4 line-clamp-2'>
                        {product.name}
                      </p>
                    </div>
                  </div>

                  {/* Add to cart indicator overlay */}
                  <div className='absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center'>
                    <div className='bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-200 shadow-lg'>
                      <Plus className='w-6 h-6 text-blue-600' />
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div className='p-4 flex-1 flex flex-col'>
                  <h3 className='font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors'>
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className='text-sm text-gray-600 mb-3 line-clamp-2 flex-1'>
                      {product.description}
                    </p>
                  )}
                  <div className='flex items-center justify-between mt-auto'>
                    <span className='text-lg font-bold text-blue-600'>
                      Rp {parseFloat(product.price).toLocaleString('id-ID')}
                    </span>
                    <div className='bg-blue-100 text-blue-600 rounded-full p-2 group-hover:bg-blue-600 group-hover:text-white transition-colors'>
                      <Plus className='w-4 h-4' />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div className='fixed inset-0 z-50 bg-black bg-opacity-50' onClick={() => setShowCart(false)}>
          <div
            className='absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>Keranjang</h2>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowCart(false)}
                className='h-8 w-8 p-0'
              >
                <X className='h-5 w-5' />
              </Button>
            </div>

            <div className='p-4'>
              {cart.length === 0 ? (
                <div className='text-center py-12'>
                  <ShoppingCart className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                  <p className='text-gray-500'>Keranjang masih kosong</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {cart.map(item => (
                    <div
                      key={item.product_id}
                      className='flex items-start gap-3 border-b pb-3 last:border-b-0'
                    >
                      {/* Product Image Thumbnail */}
                      <div className='flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100'>
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className='w-full h-full object-cover'
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {/* Placeholder if no image */}
                        {!item.image_url && (
                          <div className='w-full h-full flex items-center justify-center'>
                            <Store className='w-8 h-8 text-blue-300' />
                          </div>
                        )}
                        {/* Fallback for image error */}
                        <div className='w-full h-full hidden items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100'>
                          <Store className='w-8 h-8 text-blue-300' />
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className='flex-1 min-w-0'>
                        <h3 className='font-medium text-gray-900 text-sm line-clamp-2 mb-1'>
                          {item.name}
                        </h3>
                        <p className='text-sm text-blue-600 font-semibold'>
                          Rp {item.price.toLocaleString('id-ID')}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className='flex flex-col items-end gap-2'>
                        <div className='flex items-center border rounded-lg'>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className='p-1.5 hover:bg-gray-100'
                          >
                            <Minus className='w-3.5 h-3.5' />
                          </button>
                          <span className='px-2.5 font-medium text-sm min-w-[2rem] text-center'>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className='p-1.5 hover:bg-gray-100'
                          >
                            <Plus className='w-3.5 h-3.5' />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className='text-red-600 hover:text-red-700 p-1'
                        >
                          <X className='w-4 h-4' />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className='sticky bottom-0 bg-white border-t p-4'>
                <div className='flex items-center justify-between mb-4'>
                  <span className='font-semibold text-gray-900'>Total</span>
                  <span className='text-xl font-bold text-blue-600'>
                    Rp {calculateTotal().toLocaleString('id-ID')}
                  </span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className='w-full bg-blue-600 hover:bg-blue-700 text-white'
                >
                  Lanjut ke Checkout
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className='fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto'>
            <div className='sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>Checkout</h2>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowCheckout(false)}
                className='h-8 w-8 p-0'
              >
                <X className='h-5 w-5' />
              </Button>
            </div>

            <form onSubmit={handleSubmitOrder} className='p-6'>
              <div className='space-y-4 mb-6'>
                {/* Customer Data Toggle */}
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                  <div className='flex items-start justify-between mb-2'>
                    <div className='flex-1'>
                      <h4 className='text-sm font-semibold text-blue-900 mb-1'>
                        Isi Data Pelanggan (Opsional)
                      </h4>
                      <p className='text-xs text-blue-700'>
                        Dapatkan poin loyalitas dan notifikasi pesanan
                      </p>
                    </div>
                    <label className='relative inline-flex items-center cursor-pointer ml-3'>
                      <input
                        type='checkbox'
                        checked={showCustomerForm}
                        onChange={(e) => {
                          setShowCustomerForm(e.target.checked);
                          if (!e.target.checked) {
                            // Clear customer data when toggle off
                            setFoundCustomer(null);
                            setCheckoutForm(prev => ({
                              ...prev,
                              customer_name: '',
                              customer_phone: '',
                              customer_email: '',
                            }));
                          }
                        }}
                        className='sr-only peer'
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Customer Form - Collapsible */}
                {showCustomerForm && (
                  <div className='space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Nama <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='text'
                        required={showCustomerForm}
                        value={checkoutForm.customer_name}
                        onChange={(e) =>
                          setCheckoutForm({ ...checkoutForm, customer_name: e.target.value })
                        }
                        disabled={foundCustomer}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          foundCustomer ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        placeholder='Masukkan nama Anda'
                      />
                      {foundCustomer && (
                        <p className='text-xs text-gray-500 mt-1'>
                          Data otomatis terisi dari akun member Anda
                        </p>
                      )}
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Nomor Telepon <span className='text-red-500'>*</span>
                      </label>
                      <div className='relative'>
                        <input
                          type='tel'
                          required={showCustomerForm}
                          value={checkoutForm.customer_phone}
                          onChange={(e) => {
                            setCheckoutForm({ ...checkoutForm, customer_phone: e.target.value });
                          }}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10'
                          placeholder='08xxx'
                        />
                        {searchingCustomer && (
                          <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                            <Loader2 className='w-4 h-4 text-gray-400 animate-spin' />
                          </div>
                        )}
                        {foundCustomer && !searchingCustomer && (
                          <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                            <CheckCircle className='w-5 h-5 text-green-600' />
                          </div>
                        )}
                      </div>
                      {foundCustomer && (
                        <div className='mt-2 flex items-center gap-2'>
                          <Badge className='bg-green-100 text-green-800 text-xs'>
                            ✨ Member Terdaftar
                          </Badge>
                          {foundCustomer.total_visits > 0 && (
                            <span className='text-xs text-gray-600'>
                              {foundCustomer.total_visits} kali order • Rp {foundCustomer.total_spent?.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Email
                      </label>
                      <input
                        type='email'
                        value={checkoutForm.customer_email}
                        onChange={(e) =>
                          setCheckoutForm({ ...checkoutForm, customer_email: e.target.value })
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        placeholder='email@example.com (opsional)'
                      />
                    </div>
                  </div>
                )}

                {/* ✅ NEW: Jumlah Orang - Always visible */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Jumlah Orang <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='number'
                    min='1'
                    max='100'
                    required
                    value={checkoutForm.jumlah_orang}
                    onChange={(e) =>
                      setCheckoutForm({ 
                        ...checkoutForm, 
                        jumlah_orang: parseInt(e.target.value) || 1 
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder='1'
                  />
                  <p className='text-xs text-gray-500 mt-1'>
                    Berapa jumlah orang yang akan makan?
                  </p>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Kode Diskon
                  </label>
                  {discountData ? (
                    <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
                      <div className='flex items-center justify-between mb-2'>
                        <div>
                          <p className='text-sm font-medium text-green-900'>
                            {discountData.discount_name}
                          </p>
                          <p className='text-xs text-green-600'>
                            Diskon: Rp {discountData.discount_amount.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <button
                          type='button'
                          onClick={handleRemoveDiscount}
                          className='text-red-600 hover:text-red-700 text-sm'
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className='flex gap-2'>
                      <input
                        type='text'
                        value={discountCode}
                        onChange={(e) => {
                          setDiscountCode(e.target.value);
                          setDiscountError('');
                        }}
                        className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        placeholder='Masukkan kode diskon'
                      />
                      <Button
                        type='button'
                        onClick={handleValidateDiscount}
                        disabled={validatingDiscount || !discountCode.trim()}
                        className='bg-green-600 hover:bg-green-700 text-white'
                      >
                        {validatingDiscount ? (
                          <Loader2 className='w-4 h-4 animate-spin' />
                        ) : (
                          'Terapkan'
                        )}
                      </Button>
                    </div>
                  )}
                  {discountError && (
                    <p className='text-xs text-red-600 mt-1'>{discountError}</p>
                  )}
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Metode Pembayaran
                  </label>
                  {checkingMidtrans ? (
                    <div className='flex items-center justify-center p-4 border-2 rounded-lg border-gray-200 bg-gray-50'>
                      <Loader2 className='w-5 h-5 animate-spin text-gray-400 mr-2' />
                      <p className='text-sm text-gray-600'>Memuat metode pembayaran...</p>
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      {/* ✅ FIX: Midtrans Payment - hanya tampilkan jika aktif */}
                      {isMidtransEnabled && (
                        <label className='flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50'>
                          <input
                            type='radio'
                            name='payment_method'
                            value='midtrans'
                            checked={checkoutForm.payment_method === 'midtrans'}
                            onChange={(e) =>
                              setCheckoutForm({ ...checkoutForm, payment_method: e.target.value })
                            }
                            className='mr-3'
                          />
                          <CreditCard className='w-6 h-6 text-purple-600 mr-3' />
                          <div className='flex-1'>
                            <p className='font-semibold text-gray-900'>Payment - Midtrans</p>
                            <p className='text-xs text-gray-600'>E-Wallet, QRIS, Virtual Account, Credit Card</p>
                          </div>
                        </label>
                      )}

                      {/* Pay at Cashier */}
                      <label className='flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors'>
                        <input
                          type='radio'
                          name='payment_method'
                          value='pay_later'
                          checked={checkoutForm.payment_method === 'pay_later'}
                          onChange={(e) =>
                            setCheckoutForm({ ...checkoutForm, payment_method: e.target.value })
                          }
                          className='mr-3'
                        />
                        <Store className='w-6 h-6 text-blue-600 mr-3' />
                        <div className='flex-1'>
                          <p className='font-semibold text-gray-900'>Bayar di Kasir</p>
                          <p className='text-xs text-gray-600'>Bayar setelah pesanan selesai</p>
                        </div>
                      </label>
                    </div>
                  )}

                  {checkoutForm.payment_method === 'midtrans' && isMidtransEnabled && (
                    <div className='mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg'>
                      <p className='text-sm text-purple-800'>
                        💳 Anda akan diarahkan ke halaman pembayaran Midtrans untuk menyelesaikan transaksi
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Catatan
                  </label>
                  <textarea
                    value={checkoutForm.notes}
                    onChange={(e) =>
                      setCheckoutForm({ ...checkoutForm, notes: e.target.value })
                    }
                    rows={3}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder='Catatan tambahan (opsional)'
                  />
                </div>
              </div>

              <div className='bg-gray-50 rounded-lg p-4 mb-6'>
                <h3 className='font-semibold text-gray-900 mb-3'>Ringkasan Pesanan</h3>
                <div className='space-y-2'>
                  {cart.map(item => (
                    <div key={item.product_id} className='flex items-center gap-2'>
                      {/* Mini Thumbnail */}
                      <div className='flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100'>
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className='w-full h-full object-cover'
                          />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center'>
                            <Store className='w-5 h-5 text-blue-300' />
                          </div>
                        )}
                      </div>
                      {/* Item Info */}
                      <div className='flex-1 flex justify-between text-sm'>
                        <span className='text-gray-600'>
                          {item.name} x {item.quantity}
                        </span>
                        <span className='font-medium text-gray-900'>
                          Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className='border-t pt-2 mt-2'>
                    <div className='flex justify-between text-sm mb-1'>
                      <span className='text-gray-600'>Subtotal</span>
                      <span className='font-medium text-gray-900'>
                        Rp {calculateSubtotal().toLocaleString('id-ID')}
                      </span>
                    </div>
                    {discountData && (
                      <div className='flex justify-between text-sm mb-1'>
                        <span className='text-green-600'>Diskon</span>
                        <span className='font-medium text-green-600'>
                          - Rp {discountData.discount_amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                    {menuData?.outlet?.tax_rate > 0 && (
                      <div className='flex justify-between text-sm mb-1'>
                        <span className='text-gray-600'>Pajak ({menuData.outlet.tax_rate}%)</span>
                        <span className='font-medium text-gray-900'>
                          Rp {calculateTax().toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                    <div className='border-t pt-2 mt-2 flex justify-between font-semibold'>
                      <span>Total</span>
                      <span className='text-blue-600'>
                        Rp {calculateTotal().toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type='submit'
                disabled={submitting}
                className='w-full bg-blue-600 hover:bg-blue-700 text-white'
              >
                {submitting ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Memproses...
                  </>
                ) : (
                  'Konfirmasi Pesanan'
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Midtrans Payment Modal */}
      {showMidtransModal && midtransData && (
        <MidtransPaymentModal
          open={showMidtransModal}
          onClose={() => {
            setShowMidtransModal(false);
            setMidtransData(null);
            // Show order success after closing Midtrans modal
            setOrderSuccess(true);
          }}
          qrisData={midtransData}
          onPaymentSuccess={(result) => {
            console.log('Payment success:', result);
            // Navigate to order status page
            navigate(`/order-status/${midtransData.order_number}`);
          }}
        />
      )}
    </div>
  );
};

export default PublicSelfServiceMenu;
