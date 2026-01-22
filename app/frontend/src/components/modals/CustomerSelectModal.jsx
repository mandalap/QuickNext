import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Search,
  User,
  UserPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { customerService } from '../../services/customer.service';
import { Badge } from '../ui/badge';
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

const CustomerSelectModal = ({ open, onClose, onSelectCustomer }) => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      loadCustomers();
    }
  }, [open]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading customers...');
      const result = await customerService.getAll();
      console.log('🔍 Customer service result:', result);
      if (result.success) {
        // Normalisasi: backend bisa kirim { data: [...] } atau object tunggal
        const raw = result.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : raw?.customers
          ? raw.customers
          : raw
          ? [raw]
          : [];
        console.log('🔍 Processed customer list:', list);
        setCustomers(list);
      } else {
        console.error('❌ Customer service failed:', result.error);
        toast.error('Gagal memuat data pelanggan');
      }
    } catch (error) {
      console.error('❌ Error loading customers:', error);
      toast.error('Terjadi kesalahan saat memuat pelanggan');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = (customers || []).filter(
    customer =>
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = customer => {
    setSelectedCustomer(customer);
  };

  const handleConfirm = () => {
    if (selectedCustomer) {
      toast.success('Pelanggan dipilih');
      onSelectCustomer(selectedCustomer);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedCustomer(null);
    setSearchTerm('');
    setShowAddForm(false);
    setNewCustomer({ name: '', phone: '', email: '' });
    setErrors({});
    onClose();
  };

  const handleWalkInCustomer = () => {
    onSelectCustomer(null); // null = walk-in customer
    handleClose();
  };

  const validateNewCustomer = () => {
    const newErrors = {};

    if (!newCustomer.name?.trim()) {
      newErrors.name = 'Nama harus diisi';
    }

    if (!newCustomer.phone?.trim()) {
      newErrors.phone = 'Nomor telepon harus diisi';
    } else if (
      !/^[0-9]{10,15}$/.test(newCustomer.phone.replace(/[\s-]/g, ''))
    ) {
      newErrors.phone = 'Nomor telepon tidak valid (10-15 digit)';
    }

    if (
      newCustomer.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)
    ) {
      newErrors.email = 'Format email tidak valid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveNewCustomer = async () => {
    if (!validateNewCustomer()) return;

    setLoading(true);
    try {
      const result = await customerService.create(newCustomer);
      if (result.success) {
        toast.success('Pelanggan berhasil ditambahkan');
        // Masukkan segera ke daftar agar terlihat meskipun belum ada transaksi di outlet ini
        setCustomers(prev => [
          result.data,
          ...(Array.isArray(prev) ? prev : []),
        ]);
        setShowAddForm(false);
        setNewCustomer({ name: '', phone: '', email: '' });
        // Auto-select new customer
        setSelectedCustomer(result.data);
        // Info tambahan agar user tahu bisa langsung dipilih
        toast.success('Pelanggan baru siap digunakan di transaksi ini');
      } else {
        toast.error(result.error || 'Gagal menambah pelanggan');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Terjadi kesalahan saat menambah pelanggan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className='sm:max-w-[600px] max-h-[80vh]'
        aria-describedby='customer-select-desc'
      >
        <DialogHeader>
          <DialogTitle className='text-xl font-bold flex items-center'>
            {showAddForm && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowAddForm(false)}
                className='mr-2 -ml-2'
              >
                <ArrowLeft className='w-4 h-4' />
              </Button>
            )}
            <User className='w-5 h-5 mr-2 text-blue-600' />
            {showAddForm ? 'Tambah Pelanggan Baru' : 'Pilih Pelanggan'}
          </DialogTitle>
        </DialogHeader>

        <p id='customer-select-desc' className='sr-only'>
          Pilih pelanggan untuk transaksi atau tambahkan pelanggan baru.
        </p>
        <div className='space-y-4'>
          {showAddForm ? (
            /* Add Customer Form */
            <div className='space-y-4'>
              <div>
                <Label htmlFor='name'>Nama Pelanggan *</Label>
                <Input
                  id='name'
                  value={newCustomer.name}
                  onChange={e => {
                    setNewCustomer({ ...newCustomer, name: e.target.value });
                    setErrors({ ...errors, name: '' });
                  }}
                  placeholder='Masukkan nama'
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className='text-sm text-red-600 mt-1'>{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor='phone'>Nomor Telepon * (Unik)</Label>
                <div className='relative'>
                  <Phone className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    id='phone'
                    type='tel'
                    value={newCustomer.phone}
                    onChange={e => {
                      setNewCustomer({ ...newCustomer, phone: e.target.value });
                      setErrors({ ...errors, phone: '' });
                    }}
                    placeholder='08123456789'
                    className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.phone && (
                  <p className='text-sm text-red-600 mt-1'>{errors.phone}</p>
                )}
                <p className='text-xs text-gray-500 mt-1'>
                  Nomor telepon akan menjadi identitas unik
                </p>
              </div>

              <div>
                <Label htmlFor='email'>Email (Opsional)</Label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    id='email'
                    type='email'
                    value={newCustomer.email}
                    onChange={e => {
                      setNewCustomer({ ...newCustomer, email: e.target.value });
                      setErrors({ ...errors, email: '' });
                    }}
                    placeholder='email@contoh.com'
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className='text-sm text-red-600 mt-1'>{errors.email}</p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                <Input
                  placeholder='Cari nama atau telepon...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='pl-10'
                />
              </div>

              {/* Quick Actions */}
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='border-dashed border-2'
                  onClick={handleWalkInCustomer}
                >
                  <UserPlus className='w-4 h-4 mr-2' />
                  Walk-in
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50'
                  onClick={() => setShowAddForm(true)}
                >
                  <UserPlus className='w-4 h-4 mr-2' />
                  Tambah Baru
                </Button>
              </div>

              {/* Customer List */}
              <div className='border rounded-lg max-h-[400px] overflow-y-auto'>
                {loading ? (
                  <div className='flex items-center justify-center py-12'>
                    <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className='text-center py-12 text-gray-500'>
                    <User className='w-12 h-12 mx-auto mb-3 text-gray-300' />
                    <p>Tidak ada pelanggan ditemukan</p>
                    <p className='text-sm mt-1'>Coba kata kunci lain</p>
                  </div>
                ) : (
                  <div className='divide-y'>
                    {filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        type='button'
                        onClick={() => handleSelect(customer)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedCustomer?.id === customer.id
                            ? 'bg-blue-50 border-l-4 border-blue-600'
                            : ''
                        }`}
                      >
                        <div className='flex items-start justify-between'>
                          <div className='flex-1'>
                            <div className='flex items-center space-x-2 mb-1'>
                              <h4 className='font-semibold text-gray-900'>
                                {customer.name}
                              </h4>
                              {customer.is_member && (
                                <Badge className='bg-yellow-100 text-yellow-800 text-xs'>
                                  Member
                                </Badge>
                              )}
                            </div>
                            <div className='space-y-1 text-sm text-gray-600'>
                              {customer.phone && (
                                <div className='flex items-center'>
                                  <Phone className='w-3 h-3 mr-2' />
                                  {customer.phone}
                                </div>
                              )}
                              {customer.email && (
                                <div className='flex items-center'>
                                  <Mail className='w-3 h-3 mr-2' />
                                  {customer.email}
                                </div>
                              )}
                            </div>
                          </div>
                          {selectedCustomer?.id === customer.id && (
                            <div className='ml-3'>
                              <Badge className='bg-blue-600 text-white'>
                                Dipilih
                              </Badge>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className='gap-2'>
          <Button type='button' variant='outline' onClick={handleClose}>
            Batal
          </Button>
          {showAddForm ? (
            <Button
              type='button'
              onClick={handleSaveNewCustomer}
              disabled={loading}
              className='bg-green-600 hover:bg-green-700'
            >
              {loading ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Menyimpan...
                </>
              ) : (
                <>
                  <UserPlus className='w-4 h-4 mr-2' />
                  Simpan Pelanggan
                </>
              )}
            </Button>
          ) : (
            <Button
              type='button'
              onClick={handleConfirm}
              disabled={!selectedCustomer}
              className='bg-blue-600 hover:bg-blue-700'
            >
              Pilih Pelanggan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerSelectModal;
