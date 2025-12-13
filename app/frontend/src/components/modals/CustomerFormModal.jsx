import { useEffect, useState } from 'react';
import { customerService } from '../../services/customer.service';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/toast';

const CustomerFormModal = ({
  open,
  onClose,
  customer = null,
  onCustomerSaved,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    birthday: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (customer) {
        // Edit mode - populate form with existing data
        setFormData({
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          birthday: customer.birthday || '',
        });
      } else {
        // Add mode - reset form
        setFormData({
          name: '',
          phone: '',
          email: '',
          address: '',
          birthday: '',
        });
      }
      setErrors({});
    }
  }, [open, customer]);

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
      newErrors.name = 'Nama harus diisi';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor telepon harus diisi';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.phone)) {
      newErrors.phone = 'Format nomor telepon tidak valid';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let response;

      if (customer) {
        // Edit existing customer
        response = await customerService.update(customer.id, formData);
      } else {
        // Create new customer
        response = await customerService.create(formData);
      }

      if (response.success) {
        toast.success(
          customer
            ? 'Pelanggan berhasil diperbarui'
            : 'Pelanggan berhasil ditambahkan'
        );
        onCustomerSaved?.(response.data);
        onClose();
      } else {
        toast.error(response.message || 'Gagal menyimpan pelanggan');
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Terjadi kesalahan saat menyimpan pelanggan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {customer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* Nama */}
          <div>
            <Label htmlFor='name'>Nama *</Label>
            <Input
              id='name'
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder='Masukkan nama pelanggan'
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className='text-sm text-red-600 mt-1'>{errors.name}</p>
            )}
          </div>

          {/* Telepon */}
          <div>
            <Label htmlFor='phone'>Nomor Telepon *</Label>
            <Input
              id='phone'
              value={formData.phone}
              onChange={e => handleInputChange('phone', e.target.value)}
              placeholder='Contoh: 08123456789'
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className='text-sm text-red-600 mt-1'>{errors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor='email'>Email (Opsional)</Label>
            <Input
              id='email'
              type='email'
              value={formData.email}
              onChange={e => handleInputChange('email', e.target.value)}
              placeholder='contoh@email.com'
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className='text-sm text-red-600 mt-1'>{errors.email}</p>
            )}
          </div>

          {/* Alamat */}
          <div>
            <Label htmlFor='address'>Alamat (Opsional)</Label>
            <Textarea
              id='address'
              value={formData.address}
              onChange={e => handleInputChange('address', e.target.value)}
              placeholder='Masukkan alamat lengkap'
              rows={3}
            />
          </div>

          {/* Tanggal Lahir */}
          <div>
            <Label htmlFor='birthday'>Tanggal Lahir (Opsional)</Label>
            <Input
              id='birthday'
              type='date'
              value={formData.birthday}
              onChange={e => handleInputChange('birthday', e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className='flex justify-end gap-2 pt-4 border-t'>
          <Button variant='outline' onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className='bg-green-600 hover:bg-green-700'
          >
            {loading ? 'Menyimpan...' : customer ? 'Perbarui' : 'Simpan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerFormModal;
