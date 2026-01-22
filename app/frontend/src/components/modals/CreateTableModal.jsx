import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
import { useToast } from '../ui/toast';

const CreateTableModal = ({ isOpen, onClose, onSuccess, table = null }) => {
  const { outlets, user, currentOutlet, currentBusiness } = useAuth();
  const { toast } = useToast();

  // Check if user can create/edit tables (only owner and admin)
  const canCreateTable = ['owner', 'admin', 'super_admin'].includes(user?.role);
  const isEditMode = !!table;
  const [formData, setFormData] = useState({
    name: '',
    capacity: 4,
    outlet_id: '',
    status: 'available',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      console.log('CreateTableModal opened, outlets available:', outlets);

      // Check permissions
      if (!canCreateTable) {
        setErrors({
          general:
            'Anda tidak memiliki izin untuk membuat/ mengedit meja. Hanya owner dan admin yang dapat membuat/ mengedit meja.',
        });
        return;
      }

      // If editing, populate form with table data
      if (isEditMode && table) {
        setFormData({
          name: table.name || '',
          capacity: table.capacity || 4,
          outlet_id:
            table.outlet_id?.toString() || currentOutlet?.id?.toString() || '',
          status: table.status || 'available',
        });
      } else {
        setFormData({
          name: '',
          capacity: 4,
          outlet_id: currentOutlet?.id?.toString() || '',
          status: 'available',
        });
      }
      setErrors({});
    }
  }, [isOpen, outlets, canCreateTable, table, isEditMode, currentOutlet]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nama meja harus diisi';
    }

    if (!formData.outlet_id || formData.outlet_id === 'no-outlet') {
      newErrors.outlet_id = 'Outlet harus dipilih';
    }

    if (formData.capacity < 1 || formData.capacity > 20) {
      newErrors.capacity = 'Kapasitas harus antara 1-20';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    // Check if outlets are available
    if (!outlets || outlets.length === 0) {
      setErrors({
        general:
          'Tidak ada outlet tersedia. Silakan buat outlet terlebih dahulu di menu Business Management.',
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Use tableService with outlet filtering instead of selfServiceApi
      const { tableService } = await import('../../services/table.service');

      let result;
      if (isEditMode && table) {
        // Update existing table
        result = await tableService.update(
          table.id,
          formData,
          currentBusiness?.id,
          currentOutlet?.id
        );
      } else {
        // Create new table
        result = await tableService.create(
          formData,
          currentBusiness?.id,
          currentOutlet?.id
        );
      }

      if (result.success) {
        if (isEditMode) {
          toast.success('✅ Meja berhasil diperbarui', {
            duration: 3000,
          });
        } else {
          toast.success('✅ Meja berhasil ditambahkan', {
            duration: 3000,
          });
        }
        // ✅ FIX: Panggil onSuccess sebelum onClose untuk memastikan refresh data
        console.log('✅ CreateTableModal: Table created/updated successfully, calling onSuccess');
        if (onSuccess) {
          try {
            await Promise.resolve(onSuccess());
          } catch (error) {
            console.error('Error in onSuccess callback:', error);
          }
        }
        onClose();
      } else {
        const errorMessage = isEditMode
          ? '❌ Gagal memperbarui meja. Silakan coba lagi.'
          : '❌ Gagal membuat meja. Silakan coba lagi.';
        toast.error(result.error || errorMessage, { duration: 5000 });
        setErrors({
          general: result.error || errorMessage,
        });
      }
    } catch (error) {
      console.error(
        `Error ${isEditMode ? 'updating' : 'creating'} table:`,
        error
      );
      const errorMessage = isEditMode
        ? '❌ Gagal memperbarui meja. Silakan coba lagi.'
        : '❌ Gagal membuat meja. Silakan coba lagi.';
      toast.error(errorMessage, {
        duration: 5000,
      });
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ general: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center justify-between'>
            <span>{isEditMode ? 'Edit Meja' : 'Buat Meja Baru'}</span>
            <Button
              variant='ghost'
              size='sm'
              onClick={onClose}
              className='h-6 w-6 p-0'
            >
              <X className='h-4 w-4' />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {errors.general && (
            <div className='bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm'>
              {errors.general}
            </div>
          )}

          <div className='space-y-2'>
            <Label htmlFor='name'>Nama Meja *</Label>
            <Input
              id='name'
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder='Contoh: Meja 1, VIP 1, dll'
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className='text-sm text-red-600'>{errors.name}</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='outlet'>Outlet *</Label>
            <Select
              value={formData.outlet_id}
              onValueChange={value => handleInputChange('outlet_id', value)}
            >
              <SelectTrigger
                className={errors.outlet_id ? 'border-red-500' : ''}
              >
                <SelectValue placeholder='Pilih outlet' />
              </SelectTrigger>
              <SelectContent>
                {outlets && outlets.length > 0 ? (
                  outlets
                    .filter(
                      outlet =>
                        !currentBusiness ||
                        outlet.business_id === currentBusiness.id
                    )
                    .map(outlet => (
                      <SelectItem key={outlet.id} value={outlet.id.toString()}>
                        {outlet.name}
                      </SelectItem>
                    ))
                ) : (
                  <SelectItem value='no-outlet' disabled>
                    {outlets === null
                      ? 'Memuat outlet...'
                      : 'Tidak ada outlet tersedia'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.outlet_id && (
              <p className='text-sm text-red-600'>{errors.outlet_id}</p>
            )}
            {(!outlets || outlets.length === 0) && (
              <p className='text-sm text-amber-600'>
                {outlets === null
                  ? 'Sedang memuat daftar outlet...'
                  : 'Tidak ada outlet tersedia. Silakan buat outlet terlebih dahulu di menu Business Management.'}
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='capacity'>Kapasitas *</Label>
            <Input
              id='capacity'
              type='number'
              min='1'
              max='20'
              value={formData.capacity}
              onChange={e =>
                handleInputChange('capacity', parseInt(e.target.value) || 1)
              }
              className={errors.capacity ? 'border-red-500' : ''}
            />
            {errors.capacity && (
              <p className='text-sm text-red-600'>{errors.capacity}</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='status'>Status Awal</Label>
            <Select
              value={formData.status}
              onValueChange={value => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='available'>Tersedia</SelectItem>
                <SelectItem value='reserved'>Dipesan</SelectItem>
                <SelectItem value='cleaning'>Dibersihkan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex justify-end space-x-2 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type='submit'
              disabled={isLoading || !outlets || outlets.length === 0}
              className='bg-blue-600 hover:bg-blue-700'
            >
              {isLoading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
              {isEditMode ? 'Simpan Perubahan' : 'Buat Meja'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTableModal;
