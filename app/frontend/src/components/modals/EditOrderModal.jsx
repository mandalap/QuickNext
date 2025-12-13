import { Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { customerService } from '../../services/customer.service';
import { discountService } from '../../services/discount.service';
import { orderService } from '../../services/order.service';
import { productService } from '../../services/product.service';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';

const EditOrderModal = ({ open, onClose, orderId, onOrderUpdated }) => {
  const { user } = useAuth();

  // ✅ FIX: Check if user can edit orders (only admin/owner/super_admin)
  const canEditOrders =
    user && ['admin', 'owner', 'super_admin'].includes(user.role);

  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    status: '',
    payment_status: '',
    notes: '',
    customer_id: 'walkin',
    items: [],
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    total: 0,
  });

  // Discount / coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null); // {code, type: 'percent'|'amount', value, amount}
  const [applyingCoupon, setApplyingCoupon] = useState(false); // Loading state for apply button

  useEffect(() => {
    // ✅ FIX: Close modal immediately if user doesn't have permission
    if (open && !canEditOrders) {
      toast.error(
        'Akses ditolak. Hanya Admin atau Owner yang dapat mengedit order.'
      );
      onClose();
      return;
    }

    if (open && orderId && canEditOrders) {
      // Load products first, then order data (to ensure products are available for matching)
      loadProducts().then(() => {
        loadOrderData();
      });
      loadCustomers();
    }
  }, [open, orderId, canEditOrders, onClose]);

  const loadOrderData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderService.getById(orderId);
      if (response.success) {
        // Handle both direct data and nested data response
        const orderData = response.data?.data || response.data;
        setOrder(orderData);

        // Ensure products are loaded before setting form data
        console.log('🔍 Loading order data:', {
          orderData,
          productsCount: products.length,
          orderItems: orderData.order_items || orderData.orderItems,
        });

        setFormData({
          status: orderData.status || '',
          payment_status: orderData.payment_status || 'pending',
          notes: orderData.notes || '',
          customer_id: orderData.customer_id
            ? String(orderData.customer_id)
            : 'walkin',
          items:
            (orderData.order_items || orderData.orderItems || []).map(item => {
              const productId = item.product_id ? String(item.product_id) : '';
              const product = products.find(p => String(p.id) === productId);
              const quantity = Number(item.quantity) || 1;
              const price = Number(
                item.price || item.price_per_unit || product?.price || 0
              );
              const subtotal = Number(item.subtotal) || quantity * price;

              return {
                product_id: productId,
                product_name:
                  item.product_name || item.name || product?.name || '',
                variant_name: item.variant_name || null,
                notes: item.notes || null,
                quantity,
                price,
                subtotal,
              };
            }) || [],
          subtotal: (() => {
            const items = orderData.order_items || orderData.orderItems || [];
            return (
              items.reduce((sum, item) => {
                const quantity = Number(item.quantity) || 1;
                const price = Number(item.price || item.price_per_unit || 0);
                const itemSubtotal = Number(item.subtotal) || quantity * price;
                return sum + itemSubtotal;
              }, 0) ||
              Number(orderData.subtotal) ||
              0
            );
          })(),
          tax_amount: Number(orderData.tax_amount) || 0,
          discount_amount: Number(orderData.discount_amount) || 0,
          total: (() => {
            const items = orderData.order_items || orderData.orderItems || [];
            const subtotal =
              items.reduce((sum, item) => {
                const quantity = Number(item.quantity) || 1;
                const price = Number(item.price || item.price_per_unit || 0);
                const itemSubtotal = Number(item.subtotal) || quantity * price;
                return sum + itemSubtotal;
              }, 0) ||
              Number(orderData.subtotal) ||
              0;
            const taxAmount = Number(orderData.tax_amount) || 0;
            const discountAmount = Number(orderData.discount_amount) || 0;
            return (
              Math.max(subtotal + taxAmount - discountAmount, 0) ||
              Number(orderData.total) ||
              0
            );
          })(),
        });
      } else {
        setError('Gagal memuat data order');
      }
    } catch (err) {
      setError('Gagal memuat data order');
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productService.getAll();
      if (response.success) {
        // Handle both array and object response
        const productData = Array.isArray(response.data)
          ? response.data
          : response.data?.data || response.data?.products || [];
        setProducts(Array.isArray(productData) ? productData : []);
        console.log(
          '✅ Products loaded for EditOrderModal:',
          productData.length
        );
      } else {
        console.error('❌ Failed to load products:', response);
        setProducts([]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setProducts([]);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customerService.getAll();
      if (response.success) {
        setCustomers(response.data);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };

      // Recalculate subtotal for this item
      if (field === 'quantity' || field === 'price') {
        const quantity =
          Number(field === 'quantity' ? value : newItems[index].quantity) || 0;
        const price =
          Number(field === 'price' ? value : newItems[index].price) || 0;
        newItems[index].subtotal = quantity * price;
      }

      // Recalculate totals - ensure all values are numbers
      const subtotal = newItems.reduce((sum, item) => {
        const itemSubtotal = Number(item.subtotal) || 0;
        return sum + itemSubtotal;
      }, 0);

      const taxAmount = Number(prev.tax_amount) || 0;
      const discountAmount = calculateDiscountAmount(newItems, appliedDiscount);
      const total = Math.max(subtotal + taxAmount - discountAmount, 0);

      return {
        ...prev,
        items: newItems,
        subtotal,
        discount_amount: discountAmount,
        total,
      };
    });
  };

  // Calculate discount amount from applied discount
  const calculateDiscountAmount = (items, discount) => {
    if (!discount) return 0;

    const subtotal = items.reduce((sum, item) => {
      const itemSubtotal = Number(item.subtotal) || 0;
      return sum + itemSubtotal;
    }, 0);

    if (discount.type === 'percent') {
      return Math.round((discount.value / 100) * subtotal);
    }
    return Math.min(discount.value, subtotal);
  };

  const handleProductSelect = (index, productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      handleItemChange(index, 'product_id', productId);
      handleItemChange(index, 'product_name', product.name);
      handleItemChange(index, 'price', product.price);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: '',
          product_name: '',
          variant_name: '',
          notes: '',
          quantity: 1,
          price: 0,
          subtotal: 0,
        },
      ],
    }));
  };

  const removeItem = index => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const subtotal = newItems.reduce((sum, item) => {
        const itemSubtotal = Number(item.subtotal) || 0;
        return sum + itemSubtotal;
      }, 0);

      const taxAmount = Number(prev.tax_amount) || 0;
      const discountAmount = calculateDiscountAmount(newItems, appliedDiscount);
      const total = Math.max(subtotal + taxAmount - discountAmount, 0);

      return {
        ...prev,
        items: newItems,
        subtotal,
        discount_amount: discountAmount,
        total,
      };
    });
  };

  // Apply coupon discount
  const applyCoupon = async () => {
    console.log('🎫 applyCoupon called', {
      couponCode: couponCode.trim(),
      appliedDiscount,
      currentDiscount: formData.discount_amount,
    }); // Debug

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

    // ✅ FIX: Tidak perlu check discount manual lagi, karena sudah auto-clear di onClick button

    setApplyingCoupon(true); // Show loading state

    try {
      // Calculate current subtotal
      const subtotal = formData.items.reduce((sum, item) => {
        const itemSubtotal = Number(item.subtotal) || 0;
        return sum + itemSubtotal;
      }, 0);

      console.log('🧮 Calculated subtotal:', subtotal); // Debug

      if (subtotal === 0) {
        toast.error('Subtotal harus lebih dari 0 untuk menggunakan kupon');
        return;
      }

      // ✅ FIX: Gunakan TOTAL (subtotal + tax) bukan hanya subtotal
      // Karena backend memvalidasi minimum_amount terhadap order_total
      const taxAmount = Number(formData.tax_amount) || 0;
      const orderTotal = subtotal + taxAmount;

      console.log(
        '🔍 Calling discountService.validate with order_total:',
        orderTotal
      ); // Debug

      const res = await discountService.validate(couponCode.trim(), orderTotal);

      console.log('✅ Coupon validation result:', res); // Debug

      if (res.success) {
        const data = res.data?.data || res.data;
        console.log('📊 Discount data:', data); // Debug

        // Normalisasi: { type: 'percent'|'amount', value }
        const normalized = {
          code: couponCode.trim(),
          type: data?.type === 'percentage' ? 'percent' : 'amount',
          value: data?.value ?? data?.amount ?? 0,
        };

        console.log('📈 Normalized discount:', normalized); // Debug

        setAppliedDiscount(normalized);

        // Recalculate discount amount and total
        const discountAmount = calculateDiscountAmount(
          formData.items,
          normalized
        );
        const taxAmount = Number(formData.tax_amount) || 0;
        const total = Math.max(subtotal + taxAmount - discountAmount, 0);

        console.log('💰 Final calculation:', {
          discountAmount,
          taxAmount,
          total,
        }); // Debug

        setFormData(prev => ({
          ...prev,
          discount_amount: discountAmount,
          total,
        }));

        toast.success('✅ Kupon berhasil diterapkan');
      } else {
        console.warn('⚠️ Coupon validation failed:', res); // Debug
        setAppliedDiscount(null);
        setFormData(prev => ({
          ...prev,
          discount_amount: 0,
          total: Math.max(prev.subtotal + (Number(prev.tax_amount) || 0), 0),
        }));

        // Tampilkan pesan error yang lebih informatif
        // Backend mengembalikan response dengan struktur: { valid: false, message: "...", minimum_amount: ..., current_amount: ... }
        // Frontend service mengembalikan: { success: false, message: "...", data: null } atau { success: false, message: "...", data: { minimum_amount, current_amount } }
        let errorMessage = res.message || 'Kupon tidak valid';

        // Cek apakah ada info minimum_amount (bisa di res.data atau langsung di res)
        const minimumAmount = res.data?.minimum_amount || res.minimum_amount;
        const currentAmount = res.data?.current_amount || res.current_amount;

        if (minimumAmount && currentAmount !== undefined) {
          errorMessage = `Kupon tidak dapat digunakan.\nMinimum order: ${formatCurrency(
            minimumAmount
          )}\nOrder saat ini: ${formatCurrency(currentAmount)}`;
        } else if (minimumAmount) {
          errorMessage = `Kupon tidak dapat digunakan.\nMinimum order: ${formatCurrency(
            minimumAmount
          )}\nOrder saat ini: ${formatCurrency(orderTotal)}`;
        }

        toast.error(errorMessage, {
          duration: 6000,
          style: {
            minWidth: '450px',
            whiteSpace: 'pre-line',
          },
        });
      }
    } catch (e) {
      console.error('❌ Error applying discount:', e); // Debug
      setAppliedDiscount(null);
      toast.error('Gagal menerapkan kupon: ' + (e.message || 'Unknown error'));
    } finally {
      setApplyingCoupon(false); // Hide loading state
    }
  };

  // Remove discount
  const removeDiscount = () => {
    setAppliedDiscount(null);
    setCouponCode('');

    // Recalculate total without discount
    const subtotal = formData.items.reduce((sum, item) => {
      const itemSubtotal = Number(item.subtotal) || 0;
      return sum + itemSubtotal;
    }, 0);
    const taxAmount = Number(formData.tax_amount) || 0;
    const total = Math.max(subtotal + taxAmount, 0);

    setFormData(prev => ({
      ...prev,
      discount_amount: 0,
      total,
    }));

    toast.success('Kupon dihapus');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      console.log('💾 Saving order...', { orderId, formData }); // Debug

      // Validate form
      if (formData.items.length === 0) {
        setError('Minimal harus ada 1 item');
        toast.error('Minimal harus ada 1 item');
        return;
      }

      // Normalize payload: convert customer_id sentinel and numeric types
      // Filter out items without product_id (empty items)
      const validItems = formData.items.filter(
        it => it.product_id && it.product_id !== ''
      );

      if (validItems.length === 0) {
        setError('Minimal harus ada 1 item dengan produk yang dipilih');
        toast.error('Minimal harus ada 1 item dengan produk yang dipilih');
        return;
      }

      const payload = {
        ...formData,
        customer_id:
          formData.customer_id === 'walkin'
            ? null
            : parseInt(formData.customer_id, 10),
        items: validItems.map(it => ({
          ...it,
          product_id: parseInt(it.product_id, 10),
          quantity: parseInt(it.quantity, 10) || 1,
          price: parseFloat(it.price) || 0,
          subtotal: parseFloat(it.subtotal) || 0,
          notes: it.notes || null,
          variant_name: it.variant_name || null,
        })),
      };

      console.log('📤 Sending payload:', payload); // Debug

      const response = await orderService.update(orderId, payload);

      console.log('📥 Save response:', response); // Debug

      if (response.success) {
        toast.success('✅ Order berhasil disimpan');
        onOrderUpdated?.(response.data);
        onClose();
      } else {
        const errorMsg =
          response.message || response.error || 'Gagal menyimpan perubahan';
        setError(errorMsg);
        toast.error(errorMsg);
        console.error('❌ Save failed:', response);
      }
    } catch (err) {
      const errorMsg = err.message || 'Gagal menyimpan perubahan';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('❌ Error saving order:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = amount => {
    // Handle NaN and invalid numbers
    const numAmount = Number(amount);
    if (isNaN(numAmount) || !isFinite(numAmount)) {
      return 'Rp 0';
    }

    // Gunakan titik (.) sebagai separator ribuan (konsisten dengan CashierPOS)
    return (
      'Rp ' +
      numAmount
        .toLocaleString('id-ID', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        .replace(/,/g, '.')
    );
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Edit Order #{order?.order_number}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            <span className='ml-2'>Memuat data order...</span>
          </div>
        ) : error ? (
          <div className='text-center py-8'>
            <p className='text-red-600'>{error}</p>
            <Button onClick={loadOrderData} className='mt-4'>
              Coba Lagi
            </Button>
          </div>
        ) : order ? (
          <div className='space-y-6'>
            {/* Basic Info */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='status'>Status</Label>
                <Select
                  value={formData.status || undefined}
                  onValueChange={value => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Pilih status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='pending'>Pending</SelectItem>
                    <SelectItem value='confirmed'>Confirmed</SelectItem>
                    <SelectItem value='preparing'>Preparing</SelectItem>
                    <SelectItem value='ready'>Ready</SelectItem>
                    <SelectItem value='completed'>Completed</SelectItem>
                    <SelectItem value='cancelled'>Cancelled</SelectItem>
                    {/* Laundry specific statuses */}
                    <SelectItem value='received'>
                      Received (Diterima)
                    </SelectItem>
                    <SelectItem value='washing'>Washing (Mencuci)</SelectItem>
                    <SelectItem value='ironing'>
                      Ironing (Menyetrika)
                    </SelectItem>
                    <SelectItem value='picked_up'>
                      Picked Up (Diambil)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor='payment_status'>Payment Status</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={value =>
                    handleInputChange('payment_status', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Pilih payment status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='pending'>Pending</SelectItem>
                    <SelectItem value='partial'>Partial</SelectItem>
                    <SelectItem value='paid'>Paid</SelectItem>
                    <SelectItem value='refunded'>Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor='customer_id'>Pelanggan</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={value =>
                    handleInputChange('customer_id', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Pilih pelanggan' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='walkin'>Walk-in Customer</SelectItem>
                    {customers.map(customer => (
                      <SelectItem
                        key={customer.id}
                        value={customer.id.toString()}
                      >
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor='notes'>Catatan</Label>
                <Textarea
                  id='notes'
                  value={formData.notes}
                  onChange={e => handleInputChange('notes', e.target.value)}
                  placeholder='Catatan order...'
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-medium'>Items</h3>
                <Button onClick={addItem} size='sm'>
                  <Plus className='w-4 h-4 mr-2' />
                  Tambah Item
                </Button>
              </div>

              <div className='space-y-4'>
                {formData.items.map((item, index) => (
                  <div key={index} className='border rounded-lg p-4'>
                    <div className='grid grid-cols-1 md:grid-cols-6 gap-4 items-end'>
                      <div className='md:col-span-2'>
                        <Label>Produk</Label>
                        <Select
                          value={
                            item.product_id && item.product_id !== ''
                              ? String(item.product_id)
                              : undefined
                          }
                          onValueChange={value =>
                            handleProductSelect(index, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder='Pilih produk' />
                          </SelectTrigger>
                          <SelectContent>
                            {products.length === 0 ? (
                              <div className='px-2 py-1.5 text-sm text-gray-500'>
                                Memuat produk...
                              </div>
                            ) : (
                              products.map(product => (
                                <SelectItem
                                  key={product.id}
                                  value={product.id.toString()}
                                >
                                  {product.name} -{' '}
                                  {formatCurrency(product.price)}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Qty</Label>
                        <Input
                          type='number'
                          min='1'
                          value={item.quantity}
                          onChange={e =>
                            handleItemChange(
                              index,
                              'quantity',
                              parseInt(e.target.value) || 1
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label>Harga</Label>
                        <Input
                          type='number'
                          min='0'
                          step='0.01'
                          value={item.price}
                          onChange={e =>
                            handleItemChange(
                              index,
                              'price',
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label>Subtotal</Label>
                        <Input
                          value={formatCurrency(item.subtotal)}
                          disabled
                          className='bg-gray-50'
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <Label>Catatan Item</Label>
                        <Input
                          type='text'
                          placeholder='Catatan untuk item ini'
                          value={item.notes || ''}
                          onChange={e =>
                            handleItemChange(index, 'notes', e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => removeItem(index)}
                          className='text-red-600 hover:text-red-700'
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon Section */}
            <div className='border-t pt-4 space-y-2'>
              <div className='flex items-center justify-between'>
                <Label>Kupon Diskon</Label>
                {/* ✅ FIX: Tambahkan button untuk clear discount manual */}
                {formData.discount_amount > 0 && !appliedDiscount && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      const subtotal = formData.items.reduce((sum, item) => {
                        const itemSubtotal = Number(item.subtotal) || 0;
                        return sum + itemSubtotal;
                      }, 0);
                      const taxAmount = Number(formData.tax_amount) || 0;
                      const total = Math.max(subtotal + taxAmount, 0);

                      setFormData(prev => ({
                        ...prev,
                        discount_amount: 0,
                        total,
                      }));
                      toast.success('Diskon manual dihapus');
                    }}
                    className='text-orange-600 hover:text-orange-700 text-xs'
                  >
                    <X className='w-3 h-3 mr-1' />
                    Hapus Diskon Manual
                  </Button>
                )}
              </div>
              <div className='flex gap-2'>
                <Input
                  placeholder='Kode kupon...'
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className='flex-1'
                  disabled={!!appliedDiscount}
                  onKeyPress={e => {
                    if (
                      e.key === 'Enter' &&
                      couponCode.trim() &&
                      !appliedDiscount
                    ) {
                      // ✅ FIX: Auto-clear discount manual sebelum apply kupon
                      if (formData.discount_amount > 0 && !appliedDiscount) {
                        const subtotal = formData.items.reduce((sum, item) => {
                          const itemSubtotal = Number(item.subtotal) || 0;
                          return sum + itemSubtotal;
                        }, 0);
                        const taxAmount = Number(formData.tax_amount) || 0;
                        const total = Math.max(subtotal + taxAmount, 0);

                        setFormData(prev => ({
                          ...prev,
                          discount_amount: 0,
                          total,
                        }));
                      }
                      applyCoupon();
                    }
                  }}
                />
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    // ✅ FIX: Auto-clear discount manual sebelum apply kupon
                    if (formData.discount_amount > 0 && !appliedDiscount) {
                      const subtotal = formData.items.reduce((sum, item) => {
                        const itemSubtotal = Number(item.subtotal) || 0;
                        return sum + itemSubtotal;
                      }, 0);
                      const taxAmount = Number(formData.tax_amount) || 0;
                      const total = Math.max(subtotal + taxAmount, 0);

                      setFormData(prev => ({
                        ...prev,
                        discount_amount: 0,
                        total,
                      }));
                      toast.info('Diskon manual dihapus untuk apply kupon');
                    }
                    applyCoupon();
                  }}
                  disabled={
                    !couponCode.trim() || !!appliedDiscount || applyingCoupon
                  }
                >
                  {applyingCoupon ? 'Memvalidasi...' : 'Apply'}
                </Button>
              </div>
              {formData.discount_amount > 0 && !appliedDiscount && (
                <div className='flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded'>
                  <p className='text-xs text-orange-700'>
                    ⚠️ Order ini punya diskon manual Rp{' '}
                    {formatCurrency(formData.discount_amount)}. Klik &quot;Hapus
                    Diskon Manual&quot; atau langsung Apply kupon untuk replace.
                  </p>
                </div>
              )}
              {appliedDiscount && (
                <div className='flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded'>
                  <div className='flex items-center gap-2'>
                    <Badge className='bg-green-100 text-green-800 border-green-300'>
                      {appliedDiscount.code}
                    </Badge>
                    <span className='text-sm text-gray-600'>
                      {appliedDiscount.type === 'percent'
                        ? `${appliedDiscount.value}%`
                        : formatCurrency(appliedDiscount.value)}{' '}
                      = -{formatCurrency(formData.discount_amount)}
                    </span>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={removeDiscount}
                    className='h-6 w-6 p-0 text-red-600 hover:text-red-700'
                  >
                    <X className='w-4 h-4' />
                  </Button>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className='border-t pt-4'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div>
                  <Label htmlFor='subtotal'>Subtotal</Label>
                  <Input
                    id='subtotal'
                    value={formatCurrency(formData.subtotal)}
                    disabled
                    className='bg-gray-50'
                  />
                </div>

                <div>
                  <Label htmlFor='tax_amount'>Pajak</Label>
                  <Input
                    id='tax_amount'
                    type='number'
                    min='0'
                    step='0.01'
                    value={formData.tax_amount || 0}
                    disabled
                    readOnly
                    className='bg-gray-50'
                    title='Pajak tidak bisa diubah (Read-only)'
                  />
                </div>

                <div>
                  <Label htmlFor='discount_amount'>Diskon</Label>
                  <Input
                    id='discount_amount'
                    type='number'
                    min='0'
                    step='0.01'
                    value={formData.discount_amount || 0}
                    disabled={!!appliedDiscount}
                    onChange={e => {
                      // Manual discount entry - this will override coupon discount
                      const discount = parseFloat(e.target.value) || 0;
                      if (discount > 0 && appliedDiscount) {
                        // Remove applied discount if manual discount is entered
                        setAppliedDiscount(null);
                        setCouponCode('');
                      }

                      const subtotal = formData.items.reduce((sum, item) => {
                        const itemSubtotal = Number(item.subtotal) || 0;
                        return sum + itemSubtotal;
                      }, 0);
                      const taxAmount = Number(formData.tax_amount) || 0;
                      const total = Math.max(
                        subtotal + taxAmount - discount,
                        0
                      );

                      setFormData(prev => ({
                        ...prev,
                        discount_amount: discount,
                        total,
                      }));
                    }}
                  />
                  {appliedDiscount && (
                    <p className='text-xs text-gray-500 mt-1'>
                      Diskon dari kupon
                    </p>
                  )}
                </div>
              </div>

              <div className='mt-4'>
                <Label htmlFor='total'>Total</Label>
                <Input
                  id='total'
                  value={formatCurrency(formData.total)}
                  disabled
                  className='bg-gray-50 text-lg font-bold'
                />
              </div>
            </div>

            {/* Actions */}
            <div className='flex justify-end gap-2 pt-4 border-t'>
              <Button variant='outline' onClick={onClose} disabled={saving}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default EditOrderModal;
