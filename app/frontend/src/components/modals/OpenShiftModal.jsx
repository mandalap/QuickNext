import { Calculator, DollarSign, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { shiftService } from '../../services/shift.service';
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

const OpenShiftModal = ({ open, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    shift_name: '',
    opening_balance: '',
    opening_notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (
      !formData.opening_balance ||
      isNaN(formData.opening_balance) ||
      Number(formData.opening_balance) < 0
    ) {
      newErrors.opening_balance = 'Modal awal harus diisi dengan angka valid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      // ✅ Double check: Cek shift aktif sebelum buka shift baru
      const activeShiftCheck = await shiftService.getActiveShift();
      if (activeShiftCheck.success && activeShiftCheck.data?.has_active_shift) {
        toast.error(
          'Anda sudah memiliki shift yang aktif. Tutup shift sebelumnya terlebih dahulu.'
        );
        setLoading(false);
        onClose();
        return;
      }

      const result = await shiftService.openShift({
        shift_name: formData.shift_name || undefined,
        opening_balance: Number(formData.opening_balance),
        opening_notes: formData.opening_notes || undefined,
      });

      if (result.success) {
        toast.success('Shift berhasil dibuka!');
        setFormData({
          shift_name: '',
          opening_balance: '',
          opening_notes: '',
        });
        onSuccess && onSuccess(result.data);
        onClose();
      } else {
        // ✅ Tampilkan pesan error yang lebih jelas
        const errorMsg = result.message || result.error || 'Gagal membuka shift';
        
        // ✅ NEW: Handle requires_attendance error - redirect ke attendance page
        if (result.requires_attendance || errorMsg.includes('absensi') || errorMsg.includes('clock in')) {
          toast.error(
            '⚠️ Anda belum melakukan absensi hari ini. Silakan lakukan absensi terlebih dahulu sebelum membuka shift.',
            {
              duration: 6000,
            }
          );
          onClose();
          // Redirect ke halaman attendance setelah 1.5 detik
          setTimeout(() => {
            navigate('/attendance');
          }, 1500);
          return;
        }
        
        if (
          errorMsg.includes('sudah memiliki shift') ||
          errorMsg.includes('shift yang terbuka')
        ) {
          toast.error(
            'Anda sudah memiliki shift yang aktif. Tutup shift sebelumnya terlebih dahulu.'
          );
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (error) {
      console.error('Error opening shift:', error);
      
      // ✅ NEW: Check if error response contains requires_attendance
      const errorResponse = error.response?.data;
      const errorMsg = errorResponse?.message || errorResponse?.error || error.message || 'Terjadi kesalahan saat membuka shift';
      
      if (
        errorResponse?.requires_attendance || 
        errorMsg.includes('absensi') || 
        errorMsg.includes('clock in') ||
        errorMsg.includes('belum melakukan absensi')
      ) {
        toast.error(
          '⚠️ Anda belum melakukan absensi hari ini. Silakan lakukan absensi terlebih dahulu sebelum membuka shift.',
          {
            duration: 6000,
          }
        );
        onClose();
        setTimeout(() => {
          navigate('/attendance');
        }, 1500);
        return;
      }
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      shift_name: '',
      opening_balance: '',
      opening_notes: '',
    });
    setErrors({});
    onClose();
  };

  const quickAmounts = [100000, 200000, 500000, 1000000];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='text-lg md:text-xl font-bold flex items-center'>
            <Calculator className='w-5 h-5 mr-2 text-blue-600' />
            Buka Shift Kasir
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-4'>
            {/* Info Box */}
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
              <p className='text-xs md:text-sm text-blue-800'>
                <strong>Info:</strong> Buka shift untuk memulai transaksi hari
                ini. Masukkan modal awal (uang kembalian) yang akan Anda
                gunakan.
              </p>
            </div>

            {/* Shift Name */}
            <div className='space-y-2'>
              <Label htmlFor='shift_name' className='text-sm font-semibold'>
                Nama Shift{' '}
                <span className='text-gray-500 font-normal'>(Opsional)</span>
              </Label>
              <Input
                id='shift_name'
                name='shift_name'
                type='text'
                value={formData.shift_name}
                onChange={handleChange}
                placeholder='Contoh: Shift Pagi'
                className='h-10'
              />
              <p className='text-xs text-gray-500'>
                Kosongkan untuk nama otomatis
              </p>
            </div>

            {/* Opening Balance */}
            <div className='space-y-2'>
              <Label
                htmlFor='opening_balance'
                className='text-sm font-semibold'
              >
                Modal Awal (Uang Kembalian){' '}
                <span className='text-red-500'>*</span>
              </Label>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium'>
                  Rp
                </span>
                <Input
                  id='opening_balance'
                  name='opening_balance'
                  type='number'
                  value={formData.opening_balance}
                  onChange={handleChange}
                  placeholder='0'
                  className={`text-right text-base md:text-lg font-semibold pl-12 h-11 ${
                    errors.opening_balance ? 'border-red-500' : ''
                  }`}
                />
              </div>
              {errors.opening_balance && (
                <p className='text-xs text-red-600'>{errors.opening_balance}</p>
              )}

              {/* Quick Amount Buttons */}
              <div className='grid grid-cols-4 gap-2 mt-2'>
                {quickAmounts.map(amount => (
                  <Button
                    key={amount}
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        opening_balance: amount.toString(),
                      }))
                    }
                    className='text-[11px] h-9'
                  >
                    {amount >= 1000000
                      ? `${amount / 1000000}jt`
                      : `${amount / 1000}rb`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Opening Notes */}
            <div className='space-y-2'>
              <Label htmlFor='opening_notes' className='text-sm font-semibold'>
                Catatan{' '}
                <span className='text-gray-500 font-normal'>(Opsional)</span>
              </Label>
              <textarea
                id='opening_notes'
                name='opening_notes'
                value={formData.opening_notes}
                onChange={handleChange}
                placeholder='Contoh: Uang pecahan lengkap, kondisi normal'
                rows={3}
                className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
              />
            </div>

            {/* Summary */}
            {formData.opening_balance && !isNaN(formData.opening_balance) && (
              <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm font-semibold text-gray-700'>
                    Modal Awal:
                  </span>
                  <span className='text-lg md:text-xl font-bold text-green-600'>
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(Number(formData.opening_balance))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className='gap-2 flex-shrink-0 pt-3 border-t'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={loading}
              className='text-sm h-10'
            >
              Batal
            </Button>
            <Button
              type='submit'
              disabled={loading || !formData.opening_balance}
              className='bg-blue-600 hover:bg-blue-700 min-w-[120px] disabled:bg-gray-400 text-sm h-10'
            >
              {loading ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Membuka...
                </>
              ) : (
                <>
                  <DollarSign className='w-4 h-4 mr-2' />
                  Buka Shift
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OpenShiftModal;
