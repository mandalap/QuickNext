import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  Minus,
  Plus,
  X,
  Phone,
  MapPin,
  Loader2,
  CheckCircle,
  Store,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const PublicOutletOrder = () => {
  const { outletSlug } = useParams();
  const navigate = useNavigate();

  // State management
  const [outlet, setOutlet] = useState(null);
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

  // Checkout form state
  const [checkoutForm, setCheckoutForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    order_type: 'takeaway',
    payment_method: 'cash',
    delivery_address: '',
    notes: '',
  });

  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Load outlet data on mount
  useEffect(() => {
    loadOutletData();
  }, [outletSlug]);

  const loadOutletData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/public/v1/order/${outletSlug}/menu`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        // ✅ NEW: Handle 403 error (self-service disabled)
        if (response.status === 403) {
          throw new Error(data.message || 'Self Service tidak diaktifkan untuk outlet ini. Silakan hubungi administrator.');
        }
        throw new Error(data.message || 'Outlet tidak ditemukan atau tidak aktif');
      }

      setOutlet(data.data.outlet);
      setProducts(data.data.products || []);
      setCategories(data.data.categories || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data outlet');
      console.error('Failed to load outlet data:', err);
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
          product_name: product.name,
          price: product.price,
          quantity: 1,
          notes: '',
        },
      ]);
    }

    // Auto show cart on first add
    if (cart.length === 0) {
      setShowCart(true);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map(item =>
        item.product_id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const updateItemNotes = (productId, notes) => {
    setCart(
      cart.map(item =>
        item.product_id === productId ? { ...item, notes } : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Keranjang masih kosong');
      return;
    }
    setShowCheckout(true);
    setShowCart(false);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Keranjang masih kosong!');
      return;
    }

    if (!checkoutForm.customer_name || !checkoutForm.customer_phone) {
      alert('Nama dan nomor telepon harus diisi!');
      return;
    }

    try {
      setSubmitting(true);

      const orderData = {
        customer_name: checkoutForm.customer_name,
        customer_phone: checkoutForm.customer_phone,
        notes: checkoutForm.notes || '',
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: parseFloat(item.price),
        })),
      };

      const response = await fetch(
        `${API_BASE_URL}/api/public/v1/order/${outletSlug}/place`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Gagal membuat pesanan');
      }

      // Order success
      setOrderNumber(data.data.order_number);
      setOrderSuccess(true);
      setCart([]);
      setCheckoutForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        order_type: 'takeaway',
        payment_method: 'cash',
        delivery_address: '',
        notes: '',
      });
    } catch (err) {
      alert(err.message || 'Gagal membuat pesanan');
      console.error('Failed to submit order:', err);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Memuat data outlet...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !outlet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            <p className="font-semibold">Outlet Tidak Ditemukan</p>
            <p className="text-sm mt-2">{error || 'Outlet tidak tersedia atau tidak aktif'}</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="text-blue-600 hover:underline"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // Order success modal
  if (orderSuccess) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4'>
        <div className='bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center'>
          <div className='mb-6'>
            <div className='w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <CheckCircle className='w-12 h-12 text-green-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              Pesanan Berhasil!
            </h2>
            <p className='text-gray-600 mb-4'>
              Nomor pesanan Anda:
            </p>
            <div className='bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6'>
              <p className='text-3xl font-bold text-blue-600'>{orderNumber}</p>
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {outlet.logo && (
                <img
                  src={outlet.logo}
                  alt={outlet.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{outlet.name}</h1>
                {outlet.phone && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    {outlet.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ShoppingCart className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </div>

          {/* Outlet Info */}
          {outlet.description && (
            <p className="text-gray-600 text-sm mt-2">{outlet.description}</p>
          )}
          {outlet.address && (
            <p className="text-gray-500 text-sm flex items-center mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {outlet.address}
            </p>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearchQuery('');
                loadOutletData();
              }}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Semua
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.name} ({category.products_count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Tidak ada produk ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={product.image_url || `https://via.placeholder.com/300x200/3b82f6/ffffff?text=${encodeURIComponent(product.name)}`}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/300x200/3b82f6/ffffff?text=${encodeURIComponent(product.name)}`;
                    }}
                  />
                  {product.discount_percentage && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                      -{product.discount_percentage}%
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[3rem]">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      {product.discount_price ? (
                        <div>
                          <p className="text-sm text-gray-400 line-through">
                            Rp {parseFloat(product.price).toLocaleString('id-ID')}
                          </p>
                          <p className="text-lg font-bold text-red-600">
                            Rp {parseFloat(product.discount_price).toLocaleString('id-ID')}
                          </p>
                        </div>
                      ) : (
                        <p className="text-lg font-bold text-blue-600">
                          Rp {parseFloat(product.price).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => addToCart(product)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Tambah
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCart(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full md:w-96 bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Keranjang</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Keranjang masih kosong</p>
                </div>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.product_id} className="mb-4 p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold flex-1">{item.product_name}</h3>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <p className="text-blue-600 font-semibold mb-2">
                        Rp {item.price.toLocaleString('id-ID')}
                      </p>

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-bold">
                          Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <input
                        type="text"
                        placeholder="Catatan (opsional)"
                        value={item.notes}
                        onChange={(e) => updateItemNotes(item.product_id, e.target.value)}
                        className="w-full px-3 py-2 border rounded text-sm"
                      />
                    </div>
                  ))}

                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        Rp {calculateTotal().toLocaleString('id-ID')}
                      </span>
                    </div>

                    <button
                      onClick={handleCheckout}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Lanjut ke Checkout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Checkout</h2>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitOrder} className="p-6">
                {/* Customer Info */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-4">Informasi Pemesan</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nama Lengkap *
                      </label>
                      <input
                        type="text"
                        required
                        value={checkoutForm.customer_name}
                        onChange={(e) =>
                          setCheckoutForm({ ...checkoutForm, customer_name: e.target.value })
                        }
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Masukkan nama lengkap"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nomor Telepon *
                      </label>
                      <input
                        type="tel"
                        required
                        value={checkoutForm.customer_phone}
                        onChange={(e) =>
                          setCheckoutForm({ ...checkoutForm, customer_phone: e.target.value })
                        }
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="08xxxxxxxxxx"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email (opsional)
                      </label>
                      <input
                        type="email"
                        value={checkoutForm.customer_email}
                        onChange={(e) =>
                          setCheckoutForm({ ...checkoutForm, customer_email: e.target.value })
                        }
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Order Type */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-4">Jenis Pesanan</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'dine_in', label: 'Dine In' },
                      { value: 'takeaway', label: 'Takeaway' },
                      { value: 'delivery', label: 'Delivery' },
                    ].map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setCheckoutForm({ ...checkoutForm, order_type: type.value })
                        }
                        className={`py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                          checkoutForm.order_type === type.value
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Address (if delivery) */}
                {checkoutForm.order_type === 'delivery' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-1">
                      Alamat Pengiriman *
                    </label>
                    <textarea
                      required
                      value={checkoutForm.delivery_address}
                      onChange={(e) =>
                        setCheckoutForm({ ...checkoutForm, delivery_address: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Masukkan alamat lengkap"
                    />
                  </div>
                )}

                {/* Payment Method */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-4">Metode Pembayaran</h3>
                  <div className="space-y-2">
                    {[
                      { value: 'cash', label: 'Tunai / Cash' },
                      { value: 'transfer', label: 'Transfer Bank' },
                      { value: 'e-wallet', label: 'E-Wallet' },
                    ].map(method => (
                      <label
                        key={method.value}
                        className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.value}
                          checked={checkoutForm.payment_method === method.value}
                          onChange={(e) =>
                            setCheckoutForm({ ...checkoutForm, payment_method: e.target.value })
                          }
                          className="mr-3"
                        />
                        <span className="font-medium">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">
                    Catatan (opsional)
                  </label>
                  <textarea
                    value={checkoutForm.notes}
                    onChange={(e) =>
                      setCheckoutForm({ ...checkoutForm, notes: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Catatan tambahan untuk pesanan Anda"
                  />
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold mb-3">Ringkasan Pesanan</h3>
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.product_id} className="flex justify-between text-sm">
                        <span>
                          {item.product_name} x{item.quantity}
                        </span>
                        <span className="font-semibold">
                          Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-blue-600">
                          Rp {calculateTotal().toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Buat Pesanan
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicOutletOrder;
