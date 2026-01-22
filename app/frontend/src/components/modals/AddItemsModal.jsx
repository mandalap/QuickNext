import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { orderService } from '../../services/order.service';
import { productService } from '../../services/product.service';
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

const AddItemsModal = ({ open, onClose, orderId, onItemsAdded }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([
    {
      product_id: '',
      product_name: '',
      quantity: 1,
      price: 0,
      subtotal: 0,
    },
  ]);

  useEffect(() => {
    if (open && orderId) {
      loadProducts();
      // Reset items when modal opens
      setItems([
        {
          product_id: '',
          product_name: '',
          quantity: 1,
          price: 0,
          subtotal: 0,
        },
      ]);
    }
  }, [open, orderId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await productService.getAll({ per_page: 1000 });
      if (result.success) {
        const productData = Array.isArray(result.data)
          ? result.data
          : result.data?.data || result.data?.products || [];
        setProducts(productData);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (index, productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        product_id: productId,
        product_name: product.name,
        price: product.price,
        subtotal: (newItems[index].quantity || 1) * product.price,
      };
      setItems(newItems);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'quantity') {
      const quantity = parseInt(value) || 1;
      newItems[index] = {
        ...newItems[index],
        quantity,
        subtotal: quantity * (newItems[index].price || 0),
      };
    } else if (field === 'price') {
      const price = parseFloat(value) || 0;
      newItems[index] = {
        ...newItems[index],
        price,
        subtotal: (newItems[index].quantity || 1) * price,
      };
    }
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        product_id: '',
        product_name: '',
        quantity: 1,
        price: 0,
        subtotal: 0,
      },
    ]);
  };

  const removeItemRow = index => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const formatCurrency = amount => {
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

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Filter valid items (must have product_id)
      const validItems = items
        .filter(item => item.product_id && item.product_id !== '')
        .map(item => ({
          product_id: parseInt(item.product_id, 10),
          quantity: parseInt(item.quantity, 10) || 1,
          price: parseFloat(item.price) || 0,
        }));

      if (validItems.length === 0) {
        toast.error('Minimal harus ada 1 item dengan produk yang dipilih');
        return;
      }

      const response = await orderService.addItems(orderId, validItems);

      if (response.success) {
        toast.success('✅ Item berhasil ditambahkan ke order');
        onItemsAdded?.(response.data);
        onClose();
      } else {
        toast.error(response.error || 'Gagal menambah item ke order');
      }
    } catch (error) {
      console.error('Error adding items:', error);
      toast.error('Gagal menambah item ke order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Tambah Item ke Order #{orderId}</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3'>
            <p className='text-sm text-yellow-800'>
              <strong>Catatan:</strong> Anda hanya dapat menambah item baru ke
              order ini. Item yang sudah ada tidak dapat diubah atau dihapus.
            </p>
          </div>

          {/* Items List */}
          <div className='space-y-4'>
            {items.map((item, index) => (
              <div key={index} className='border rounded-lg p-4'>
                <div className='grid grid-cols-1 md:grid-cols-5 gap-4 items-end'>
                  <div className='md:col-span-2'>
                    <Label>Produk</Label>
                    <Select
                      value={
                        item.product_id && item.product_id !== ''
                          ? String(item.product_id)
                          : undefined
                      }
                      onValueChange={value => handleProductSelect(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Pilih produk' />
                      </SelectTrigger>
                      <SelectContent>
                        {loading ? (
                          <div className='px-2 py-1.5 text-sm text-gray-500'>
                            Memuat produk...
                          </div>
                        ) : products.length === 0 ? (
                          <div className='px-2 py-1.5 text-sm text-gray-500'>
                            Tidak ada produk
                          </div>
                        ) : (
                          products.map(product => (
                            <SelectItem
                              key={product.id}
                              value={product.id.toString()}
                            >
                              {product.name} - {formatCurrency(product.price)}
                              {product.stock !== undefined &&
                                ` (Stok: ${product.stock})`}
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
                        handleItemChange(index, 'quantity', e.target.value)
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
                        handleItemChange(index, 'price', e.target.value)
                      }
                    />
                  </div>

                  <div className='flex items-end gap-2'>
                    <div className='flex-1'>
                      <Label>Subtotal</Label>
                      <div className='p-2 bg-gray-50 rounded border text-sm font-medium'>
                        {formatCurrency(item.subtotal)}
                      </div>
                    </div>
                    {items.length > 1 && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => removeItemRow(index)}
                        className='text-red-600 hover:text-red-700'
                      >
                        <X className='w-4 h-4' />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Item Button */}
          <Button variant='outline' onClick={addItemRow} className='w-full'>
            <Plus className='w-4 h-4 mr-2' />
            Tambah Item Lain
          </Button>

          {/* Total */}
          <div className='border-t pt-4'>
            <div className='flex justify-between items-center'>
              <span className='text-lg font-semibold'>Total Tambahan:</span>
              <span className='text-2xl font-bold text-blue-600'>
                {formatCurrency(calculateTotal())}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button variant='outline' onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Menyimpan...' : 'Tambah Item'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemsModal;
