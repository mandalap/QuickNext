import { Calendar, DollarSign, FileText, Loader2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';

const ExpenseFormModal = ({
  isOpen,
  onClose,
  onSave,
  expense,
  mode = 'add',
}) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    payment_method: 'cash',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    supplier: '',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const expenseCategories = [
    { value: 'operasional', label: 'Operasional' },
    { value: 'bahan_baku', label: 'Bahan Baku' },
    { value: 'gaji', label: 'Gaji Karyawan' },
    { value: 'sewa', label: 'Sewa Tempat' },
    { value: 'listrik', label: 'Listrik & Air' },
    { value: 'internet', label: 'Internet & Telepon' },
    { value: 'pemeliharaan', label: 'Pemeliharaan' },
    { value: 'pemasaran', label: 'Pemasaran' },
    { value: 'transportasi', label: 'Transportasi' },
    { value: 'lainnya', label: 'Lainnya' },
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Tunai' },
    { value: 'transfer', label: 'Transfer Bank' },
    { value: 'card', label: 'Kartu Debit/Kredit' },
    { value: 'qris', label: 'QRIS' },
  ];

  useEffect(() => {
    if (mode === 'edit' && expense) {
      // Handle both expense_date and date fields
      const expenseDate = expense.expense_date || expense.date || expense.created_at;
      setFormData({
        description: expense.description || '',
        amount: expense.amount || '',
        category: expense.category || '',
        payment_method: expense.payment_method || 'cash',
        date: expenseDate
          ? (typeof expenseDate === 'string' ? expenseDate.split('T')[0] : new Date(expenseDate).toISOString().split('T')[0])
          : new Date().toISOString().split('T')[0],
        notes: expense.notes || '',
        supplier: expense.supplier || '',
      });
    } else {
      setFormData({
        description: '',
        amount: '',
        category: '',
        payment_method: 'cash',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        supplier: '',
      });
    }
    setErrors({});
  }, [isOpen, mode, expense]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user selects
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Deskripsi pengeluaran harus diisi';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Jumlah pengeluaran harus lebih dari 0';
    }

    if (!formData.category) {
      newErrors.category = 'Kategori pengeluaran harus dipilih';
    }

    if (!formData.date) {
      newErrors.date = 'Tanggal pengeluaran harus diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Map frontend fields to backend fields
      const expenseData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        expense_date: formData.date, // Backend expects 'expense_date', not 'date'
        payment_method: formData.payment_method,
        supplier: formData.supplier,
        notes: formData.notes,
      };

      await onSave(expenseData);
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[600px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-lg md:text-xl font-bold flex items-center'>
            <DollarSign className='w-5 h-5 mr-2 text-red-600' />
            {mode === 'edit' ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-4'>
            {/* Info Box */}
            <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
              <p className='text-xs md:text-sm text-red-800'>
                <strong>Info:</strong> Isi form untuk mencatat pengeluaran
                bisnis. Data ini akan mempengaruhi laporan keuangan.
              </p>
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <Label htmlFor='description' className='text-sm font-semibold'>
                Deskripsi Pengeluaran <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='description'
                name='description'
                type='text'
                value={formData.description}
                onChange={handleChange}
                placeholder='Contoh: Beli bahan baku, Bayar listrik, dll'
                className={`h-10 ${errors.description ? 'border-red-500' : ''}`}
              />
              {errors.description && (
                <p className='text-xs text-red-500'>{errors.description}</p>
              )}
            </div>

            {/* Amount and Category Row */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Amount */}
              <div className='space-y-2'>
                <Label htmlFor='amount' className='text-sm font-semibold'>
                  Jumlah Pengeluaran <span className='text-red-500'>*</span>
                </Label>
                <div className='relative'>
                  <DollarSign className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    id='amount'
                    name='amount'
                    type='number'
                    min='0'
                    step='100'
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder='0'
                    className={`h-10 pl-10 ${
                      errors.amount ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {formData.amount && (
                  <p className='text-xs text-gray-600'>
                    {formatCurrency(parseFloat(formData.amount) || 0)}
                  </p>
                )}
                {errors.amount && (
                  <p className='text-xs text-red-500'>{errors.amount}</p>
                )}
              </div>

              {/* Category */}
              <div className='space-y-2'>
                <Label htmlFor='category' className='text-sm font-semibold'>
                  Kategori <span className='text-red-500'>*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={value => handleSelectChange('category', value)}
                >
                  <SelectTrigger
                    className={`h-10 ${
                      errors.category ? 'border-red-500' : ''
                    }`}
                  >
                    <SelectValue placeholder='Pilih kategori' />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className='text-xs text-red-500'>{errors.category}</p>
                )}
              </div>
            </div>

            {/* Payment Method and Date Row */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Payment Method */}
              <div className='space-y-2'>
                <Label
                  htmlFor='payment_method'
                  className='text-sm font-semibold'
                >
                  Metode Pembayaran
                </Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={value =>
                    handleSelectChange('payment_method', value)
                  }
                >
                  <SelectTrigger className='h-10'>
                    <SelectValue placeholder='Pilih metode pembayaran' />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className='space-y-2'>
                <Label htmlFor='date' className='text-sm font-semibold'>
                  Tanggal Pengeluaran <span className='text-red-500'>*</span>
                </Label>
                <div className='relative'>
                  <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    id='date'
                    name='date'
                    type='date'
                    value={formData.date}
                    onChange={handleChange}
                    className={`h-10 pl-10 ${
                      errors.date ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {errors.date && (
                  <p className='text-xs text-red-500'>{errors.date}</p>
                )}
              </div>
            </div>

            {/* Supplier */}
            <div className='space-y-2'>
              <Label htmlFor='supplier' className='text-sm font-semibold'>
                Supplier/Penyedia{' '}
                <span className='text-gray-500 font-normal'>(Opsional)</span>
              </Label>
              <Input
                id='supplier'
                name='supplier'
                type='text'
                value={formData.supplier}
                onChange={handleChange}
                placeholder='Contoh: Toko ABC, PLN, dll'
                className='h-10'
              />
            </div>

            {/* Notes */}
            <div className='space-y-2'>
              <Label htmlFor='notes' className='text-sm font-semibold'>
                Catatan{' '}
                <span className='text-gray-500 font-normal'>(Opsional)</span>
              </Label>
              <div className='relative'>
                <FileText className='absolute left-3 top-3 text-gray-400 w-4 h-4' />
                <Textarea
                  id='notes'
                  name='notes'
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder='Catatan tambahan tentang pengeluaran ini...'
                  className='pl-10 min-h-[80px] resize-none'
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={saving}
              className='flex-1 sm:flex-none'
            >
              <X className='w-4 h-4 mr-2' />
              Batal
            </Button>
            <Button
              type='submit'
              disabled={saving}
              className='bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none'
            >
              {saving ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className='w-4 h-4 mr-2' />
                  {mode === 'edit'
                    ? 'Update Pengeluaran'
                    : 'Simpan Pengeluaran'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseFormModal;
