import { Calendar, Calculator, FileText, Loader2, Save, X, Percent } from 'lucide-react';
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

const TaxFormModal = ({
  isOpen,
  onClose,
  onSave,
  tax,
  mode = 'add',
}) => {
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    rate: '',
    base: '',
    due_date: '',
    period_start: '',
    period_end: '',
    period: '',
    status: 'pending',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [calculatedAmount, setCalculatedAmount] = useState(0);

  const taxTypes = [
    { value: 'PPN', label: 'PPN (Pajak Pertambahan Nilai)' },
    { value: 'PPh 21', label: 'PPh 21 (Pajak Penghasilan Karyawan)' },
    { value: 'PPh 23', label: 'PPh 23 (Pajak Penghasilan Jasa)' },
    { value: 'PPh Final', label: 'PPh Final' },
    { value: 'PPh Pasal 25', label: 'PPh Pasal 25' },
    { value: 'PBB', label: 'PBB (Pajak Bumi dan Bangunan)' },
    { value: 'Lainnya', label: 'Lainnya' },
  ];

  const statuses = [
    { value: 'pending', label: 'Belum Dibayar' },
    { value: 'paid', label: 'Sudah Dibayar' },
    { value: 'overdue', label: 'Terlambat' },
    { value: 'cancelled', label: 'Dibatalkan' },
  ];

  // Generate period string from dates
  const generatePeriod = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startMonth = start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const endMonth = end.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    
    if (startMonth === endMonth) {
      return startMonth;
    }
    
    return `${startMonth} - ${endMonth}`;
  };

  // Calculate amount when base or rate changes
  useEffect(() => {
    if (formData.base && formData.rate) {
      const base = parseFloat(formData.base) || 0;
      const rate = parseFloat(formData.rate) || 0;
      const amount = (base * rate) / 100;
      setCalculatedAmount(amount);
    } else {
      setCalculatedAmount(0);
    }
  }, [formData.base, formData.rate]);

  // Generate period when dates change
  useEffect(() => {
    if (formData.period_start && formData.period_end) {
      const period = generatePeriod(formData.period_start, formData.period_end);
      setFormData(prev => ({ ...prev, period }));
    }
  }, [formData.period_start, formData.period_end]);

  useEffect(() => {
    if (mode === 'edit' && tax) {
      setFormData({
        type: tax.type || '',
        description: tax.description || '',
        rate: tax.rate || '',
        base: tax.base || '',
        due_date: tax.due_date ? tax.due_date.split('T')[0] : '',
        period_start: tax.period_start ? tax.period_start.split('T')[0] : '',
        period_end: tax.period_end ? tax.period_end.split('T')[0] : '',
        period: tax.period || '',
        status: tax.status || 'pending',
        notes: tax.notes || '',
      });
      setCalculatedAmount(tax.amount || 0);
    } else {
      // Set default dates
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 20);
      
      setFormData({
        type: '',
        description: '',
        rate: '',
        base: '',
        due_date: nextMonth.toISOString().split('T')[0],
        period_start: startOfMonth.toISOString().split('T')[0],
        period_end: endOfMonth.toISOString().split('T')[0],
        period: generatePeriod(startOfMonth.toISOString().split('T')[0], endOfMonth.toISOString().split('T')[0]),
        status: 'pending',
        notes: '',
      });
      setCalculatedAmount(0);
    }
  }, [mode, tax, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.type) {
      newErrors.type = 'Jenis pajak harus diisi';
    }
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      newErrors.rate = 'Tarif pajak harus diisi dan lebih dari 0';
    }
    if (!formData.base || parseFloat(formData.base) <= 0) {
      newErrors.base = 'Dasar pengenaan pajak harus diisi dan lebih dari 0';
    }
    if (!formData.due_date) {
      newErrors.due_date = 'Tanggal jatuh tempo harus diisi';
    }
    if (!formData.period_start) {
      newErrors.period_start = 'Tanggal periode mulai harus diisi';
    }
    if (!formData.period_end) {
      newErrors.period_end = 'Tanggal periode akhir harus diisi';
    }
    if (formData.period_start && formData.period_end) {
      const start = new Date(formData.period_start);
      const end = new Date(formData.period_end);
      if (start > end) {
        newErrors.period_end = 'Tanggal periode akhir harus setelah tanggal mulai';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        rate: parseFloat(formData.rate),
        base: parseFloat(formData.base),
        amount: calculatedAmount,
      });
      onClose();
    } catch (error) {
      console.error('Error saving tax:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <FileText className='w-5 h-5' />
            {mode === 'edit' ? 'Edit Pajak' : 'Tambah Pajak'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Ubah informasi pajak yang sudah ada'
              : 'Tambahkan data pajak baru ke sistem'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Type */}
            <div className='md:col-span-2'>
              <Label htmlFor='type'>
                Jenis Pajak <span className='text-red-500'>*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange('type', value)}
              >
                <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                  <SelectValue placeholder='Pilih jenis pajak' />
                </SelectTrigger>
                <SelectContent>
                  {taxTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className='text-sm text-red-500 mt-1'>{errors.type}</p>
              )}
            </div>

            {/* Description */}
            <div className='md:col-span-2'>
              <Label htmlFor='description'>Deskripsi</Label>
              <Input
                id='description'
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder='Deskripsi pajak (opsional)'
              />
            </div>

            {/* Rate */}
            <div>
              <Label htmlFor='rate'>
                Tarif Pajak (%) <span className='text-red-500'>*</span>
              </Label>
              <div className='relative'>
                <Input
                  id='rate'
                  type='number'
                  step='0.01'
                  min='0'
                  max='100'
                  value={formData.rate}
                  onChange={(e) => handleChange('rate', e.target.value)}
                  placeholder='11.00'
                  className={errors.rate ? 'border-red-500' : ''}
                />
                <Percent className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
              </div>
              {errors.rate && (
                <p className='text-sm text-red-500 mt-1'>{errors.rate}</p>
              )}
            </div>

            {/* Base */}
            <div>
              <Label htmlFor='base'>
                Dasar Pengenaan Pajak <span className='text-red-500'>*</span>
              </Label>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500'>
                  Rp
                </span>
                <Input
                  id='base'
                  type='number'
                  step='0.01'
                  min='0'
                  value={formData.base}
                  onChange={(e) => handleChange('base', e.target.value)}
                  placeholder='0'
                  className={`pl-10 ${errors.base ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.base && (
                <p className='text-sm text-red-500 mt-1'>{errors.base}</p>
              )}
            </div>

            {/* Calculated Amount */}
            {calculatedAmount > 0 && (
              <div className='md:col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-blue-900'>
                    Jumlah Pajak (Otomatis):
                  </span>
                  <span className='text-lg font-bold text-blue-600'>
                    Rp {calculatedAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}

            {/* Period Start */}
            <div>
              <Label htmlFor='period_start'>
                Periode Mulai <span className='text-red-500'>*</span>
              </Label>
              <div className='relative'>
                <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                <Input
                  id='period_start'
                  type='date'
                  value={formData.period_start}
                  onChange={(e) => handleChange('period_start', e.target.value)}
                  className={`pl-10 ${errors.period_start ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.period_start && (
                <p className='text-sm text-red-500 mt-1'>{errors.period_start}</p>
              )}
            </div>

            {/* Period End */}
            <div>
              <Label htmlFor='period_end'>
                Periode Akhir <span className='text-red-500'>*</span>
              </Label>
              <div className='relative'>
                <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                <Input
                  id='period_end'
                  type='date'
                  value={formData.period_end}
                  onChange={(e) => handleChange('period_end', e.target.value)}
                  min={formData.period_start}
                  className={`pl-10 ${errors.period_end ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.period_end && (
                <p className='text-sm text-red-500 mt-1'>{errors.period_end}</p>
              )}
            </div>

            {/* Period (Auto-generated) */}
            {formData.period && (
              <div className='md:col-span-2'>
                <Label>Periode</Label>
                <Input
                  value={formData.period}
                  readOnly
                  className='bg-gray-50'
                />
              </div>
            )}

            {/* Due Date */}
            <div>
              <Label htmlFor='due_date'>
                Jatuh Tempo <span className='text-red-500'>*</span>
              </Label>
              <div className='relative'>
                <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                <Input
                  id='due_date'
                  type='date'
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  className={`pl-10 ${errors.due_date ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.due_date && (
                <p className='text-sm text-red-500 mt-1'>{errors.due_date}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <Label htmlFor='status'>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className='md:col-span-2'>
              <Label htmlFor='notes'>Catatan</Label>
              <Textarea
                id='notes'
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder='Catatan tambahan (opsional)'
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={saving}
            >
              <X className='w-4 h-4 mr-2' />
              Batal
            </Button>
            <Button type='submit' disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className='w-4 h-4 mr-2' />
                  {mode === 'edit' ? 'Simpan Perubahan' : 'Simpan'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaxFormModal;

