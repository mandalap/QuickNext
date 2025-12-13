import { Calendar, DollarSign, FileText, Loader2, Save, X, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const BudgetFormModal = ({
  isOpen,
  onClose,
  onSave,
  budget,
  mode = 'add',
}) => {
  const [formData, setFormData] = useState({
    category: '',
    name: '',
    description: '',
    budgeted_amount: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    period: 'monthly',
    status: 'active',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const budgetCategories = [
    { value: 'Bahan Baku', label: 'Bahan Baku' },
    { value: 'Gaji Karyawan', label: 'Gaji Karyawan' },
    { value: 'Utilitas', label: 'Utilitas' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Operasional', label: 'Operasional' },
    { value: 'Sewa', label: 'Sewa Tempat' },
    { value: 'Transportasi', label: 'Transportasi' },
    { value: 'Lainnya', label: 'Lainnya' },
  ];

  const periods = [
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
    { value: 'yearly', label: 'Tahunan' },
    { value: 'custom', label: 'Kustom' },
  ];

  const statuses = [
    { value: 'active', label: 'Aktif' },
    { value: 'completed', label: 'Selesai' },
    { value: 'cancelled', label: 'Dibatalkan' },
  ];

  useEffect(() => {
    if (mode === 'edit' && budget) {
      setFormData({
        category: budget.category || '',
        name: budget.name || '',
        description: budget.description || '',
        budgeted_amount: budget.budgeted_amount || '',
        start_date: budget.start_date
          ? budget.start_date.split('T')[0]
          : new Date().toISOString().split('T')[0],
        end_date: budget.end_date
          ? budget.end_date.split('T')[0]
          : '',
        period: budget.period || 'monthly',
        status: budget.status || 'active',
      });
    } else {
      // Set default end_date to end of current month
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      setFormData({
        category: '',
        name: '',
        description: '',
        budgeted_amount: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: endOfMonth.toISOString().split('T')[0],
        period: 'monthly',
        status: 'active',
      });
    }
    setErrors({});
  }, [isOpen, mode, budget]);

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

    if (!formData.category) {
      newErrors.category = 'Kategori budget harus dipilih';
    }

    if (!formData.budgeted_amount || parseFloat(formData.budgeted_amount) <= 0) {
      newErrors.budgeted_amount = 'Jumlah budget harus lebih dari 0';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Tanggal mulai harus diisi';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'Tanggal akhir harus diisi';
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        newErrors.end_date = 'Tanggal akhir harus setelah tanggal mulai';
      }
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
      const budgetData = {
        category: formData.category,
        name: formData.name || null,
        description: formData.description || null,
        budgeted_amount: parseFloat(formData.budgeted_amount),
        start_date: formData.start_date,
        end_date: formData.end_date,
        period: formData.period,
        status: formData.status,
      };

      await onSave(budgetData);
      onClose();
    } catch (error) {
      console.error('Error saving budget:', error);
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
            <Target className='w-5 h-5 mr-2 text-purple-600' />
            {mode === 'edit' ? 'Edit Budget' : 'Tambah Budget'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Edit informasi budget untuk tracking pengeluaran' 
              : 'Buat budget baru untuk tracking pengeluaran per kategori'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-4'>
            {/* Info Box */}
            <div className='bg-purple-50 border border-purple-200 rounded-lg p-3'>
              <p className='text-xs md:text-sm text-purple-800'>
                <strong>Info:</strong> Buat budget untuk kategori pengeluaran tertentu. 
                Budget akan digunakan untuk tracking pengeluaran aktual vs yang direncanakan.
              </p>
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
                  <SelectValue placeholder='Pilih kategori budget' />
                </SelectTrigger>
                <SelectContent>
                  {budgetCategories.map(category => (
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

            {/* Name (Optional) */}
            <div className='space-y-2'>
              <Label htmlFor='name' className='text-sm font-semibold'>
                Nama Budget{' '}
                <span className='text-gray-500 font-normal'>(Opsional)</span>
              </Label>
              <Input
                id='name'
                name='name'
                type='text'
                value={formData.name}
                onChange={handleChange}
                placeholder='Contoh: Budget Marketing Q1 2024'
                className='h-10'
              />
            </div>

            {/* Budgeted Amount and Period Row */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Budgeted Amount */}
              <div className='space-y-2'>
                <Label htmlFor='budgeted_amount' className='text-sm font-semibold'>
                  Jumlah Budget <span className='text-red-500'>*</span>
                </Label>
                <div className='relative'>
                  <DollarSign className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    id='budgeted_amount'
                    name='budgeted_amount'
                    type='number'
                    min='0'
                    step='1000'
                    value={formData.budgeted_amount}
                    onChange={handleChange}
                    placeholder='0'
                    className={`h-10 pl-10 ${
                      errors.budgeted_amount ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {formData.budgeted_amount && (
                  <p className='text-xs text-gray-600'>
                    {formatCurrency(parseFloat(formData.budgeted_amount) || 0)}
                  </p>
                )}
                {errors.budgeted_amount && (
                  <p className='text-xs text-red-500'>{errors.budgeted_amount}</p>
                )}
              </div>

              {/* Period */}
              <div className='space-y-2'>
                <Label htmlFor='period' className='text-sm font-semibold'>
                  Periode
                </Label>
                <Select
                  value={formData.period}
                  onValueChange={value => handleSelectChange('period', value)}
                >
                  <SelectTrigger className='h-10'>
                    <SelectValue placeholder='Pilih periode' />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map(period => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start Date and End Date Row */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Start Date */}
              <div className='space-y-2'>
                <Label htmlFor='start_date' className='text-sm font-semibold'>
                  Tanggal Mulai <span className='text-red-500'>*</span>
                </Label>
                <div className='relative'>
                  <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    id='start_date'
                    name='start_date'
                    type='date'
                    value={formData.start_date}
                    onChange={handleChange}
                    max={formData.end_date || undefined}
                    className={`h-10 pl-10 ${
                      errors.start_date ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {errors.start_date && (
                  <p className='text-xs text-red-500'>{errors.start_date}</p>
                )}
              </div>

              {/* End Date */}
              <div className='space-y-2'>
                <Label htmlFor='end_date' className='text-sm font-semibold'>
                  Tanggal Akhir <span className='text-red-500'>*</span>
                </Label>
                <div className='relative'>
                  <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    id='end_date'
                    name='end_date'
                    type='date'
                    value={formData.end_date}
                    onChange={handleChange}
                    min={formData.start_date || undefined}
                    className={`h-10 pl-10 ${
                      errors.end_date ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {errors.end_date && (
                  <p className='text-xs text-red-500'>{errors.end_date}</p>
                )}
              </div>
            </div>

            {/* Status */}
            <div className='space-y-2'>
              <Label htmlFor='status' className='text-sm font-semibold'>
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={value => handleSelectChange('status', value)}
              >
                <SelectTrigger className='h-10'>
                  <SelectValue placeholder='Pilih status' />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <Label htmlFor='description' className='text-sm font-semibold'>
                Deskripsi{' '}
                <span className='text-gray-500 font-normal'>(Opsional)</span>
              </Label>
              <div className='relative'>
                <FileText className='absolute left-3 top-3 text-gray-400 w-4 h-4' />
                <Textarea
                  id='description'
                  name='description'
                  value={formData.description}
                  onChange={handleChange}
                  placeholder='Deskripsi atau catatan tentang budget ini...'
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
              className='bg-purple-600 hover:bg-purple-700 text-white flex-1 sm:flex-none'
            >
              {saving ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className='w-4 h-4 mr-2' />
                  {mode === 'edit' ? 'Update Budget' : 'Simpan Budget'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetFormModal;

