// ==========================================
// src/components/business/BusinessSetup.jsx
// ==========================================
import {
  Building2,
  CheckCircle,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Percent,
  Phone,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscriptionLimit } from '../../hooks/useSubscriptionLimit';
import { businessService } from '../../services/business.service';
import { businessTypeService } from '../../services/businessType.service';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { useToast } from '../ui/toast';

const BusinessSetup = ({ onBusinessCreated, isInitialSetup = true }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loadBusinesses, businesses, subscriptionFeatures, checkSubscription, hasActiveSubscription, isPendingPayment } = useAuth();
  const {
    showLimitModal,
    limitError,
    handleLimitError,
    closeLimitModal,
    isSubscriptionLimitError,
  } = useSubscriptionLimit();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_number: '',
    tax_rate: '10',
    business_type_id: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  // Lazy load SubscriptionLimitModal only when needed
  const [SubscriptionLimitModalComponent, setSubscriptionLimitModalComponent] =
    useState(null);

  useEffect(() => {
    if (showLimitModal && !SubscriptionLimitModalComponent) {
      import('../subscription/SubscriptionLimitModal').then(module => {
        setSubscriptionLimitModalComponent(() => module.default);
      });
    }
  }, [showLimitModal, SubscriptionLimitModalComponent]);

  // Load business types on mount
  useEffect(() => {
    const loadBusinessTypes = async () => {
      setLoadingTypes(true);
      const result = await businessTypeService.getAll();
      if (result.success && result.data) {
        setBusinessTypes(result.data);
      }
      setLoadingTypes(false);
    };
    loadBusinessTypes();
  }, []);

  // ✅ FIX: Check pending payment on mount - redirect to subscription-plans if pending
  useEffect(() => {
    if (isPendingPayment) {
      console.log('⚠️ BusinessSetup: Pending payment detected, redirecting to subscription-plans');
      toast.error('Pembayaran belum selesai. Silakan selesaikan pembayaran terlebih dahulu.');
      navigate('/subscription-plans', { replace: true });
      return;
    }
  }, [isPendingPayment, navigate, toast]);

  // ✅ NEW: Refresh subscription features on mount to ensure latest max_businesses
  useEffect(() => {
    // ✅ FIX: Don't refresh if pending payment (will redirect anyway)
    if (isPendingPayment) {
      return;
    }
    
    const refreshSubscription = async () => {
      try {
        // Force refresh subscription to get latest plan_features including max_businesses
        await checkSubscription(undefined, true);
        // ✅ DEBUG: Log only in development
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ BusinessSetup: Subscription features refreshed');
        }
      } catch (error) {
        // ✅ Keep error logging for production debugging
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ BusinessSetup: Failed to refresh subscription:', error);
        }
      }
    };
    refreshSubscription();
  }, [checkSubscription, isPendingPayment]);

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Nama bisnis harus diisi';
    }

    if (!formData.business_type_id) {
      errors.business_type_id = 'Jenis bisnis harus dipilih';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email tidak valid';
    }

    if (
      formData.tax_rate &&
      (parseFloat(formData.tax_rate) < 0 || parseFloat(formData.tax_rate) > 100)
    ) {
      errors.tax_rate = 'Tarif pajak harus antara 0-100';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Mohon perbaiki kesalahan pada form');
      return;
    }

    // ✅ NEW: Check subscription limit for businesses before submitting
    const maxBusinesses = subscriptionFeatures?.max_businesses ?? 1;
    const currentBusinessCount = businesses?.length || 0;
    
    // ✅ DEBUG: Log limit check (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 BusinessSetup: Limit check before submit:', {
        maxBusinesses,
        currentBusinessCount,
        subscriptionFeatures: subscriptionFeatures,
        canCreate: maxBusinesses === -1 || currentBusinessCount < maxBusinesses,
      });
    }
    
    if (maxBusinesses !== -1 && currentBusinessCount >= maxBusinesses) {
      toast.error(
        `Batas paket tercapai! Anda hanya bisa membuat maksimal ${maxBusinesses} bisnis. Saat ini Anda sudah memiliki ${currentBusinessCount} bisnis. Silakan upgrade paket untuk menambahkan lebih banyak bisnis.`,
        { duration: 6000 }
      );
      return;
    }

    setLoading(true);

    const result = await businessService.create(formData);

    setLoading(false);

    if (result.success) {
      // ✅ FIX: Clear cache untuk memastikan data fresh
      localStorage.removeItem('businesses');
      localStorage.removeItem('currentBusiness');

      // Save business ID to localStorage
      localStorage.setItem('currentBusinessId', result.data.id);

      toast.success('Bisnis berhasil dibuat!');

      // ✅ FIX: Reload businesses dengan force refresh (skip cache)
      // ✅ DEBUG: Log only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 BusinessSetup: Reloading businesses after create...');
      }
      // ✅ FIX: Pass true as second parameter to force refresh (clear cache)
      await loadBusinesses(undefined, true);

      // ✅ FIX: Tunggu sebentar untuk memastikan state ter-update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call callback if provided
      if (onBusinessCreated) {
        onBusinessCreated(result.data);
      }

      // ✅ FIX: Setelah create business, langsung ke dashboard
      // Trial gratis akan diberikan otomatis oleh backend setelah business dibuat
      // User bisa upgrade subscription nanti dari dashboard jika perlu
      console.log('🏢 BusinessSetup: Business created, redirecting to dashboard...', {
        hasActiveSubscription,
        isInitialSetup,
      });

      // ✅ FIX: Langsung redirect ke dashboard (trial gratis otomatis)
      navigate('/', { replace: true });
      
      // ✅ FIX: Force refresh setelah navigate untuk memastikan bisnis muncul
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      // ✅ FIX: Check for subscription limit error
      if (isSubscriptionLimitError({ response: { data: result } })) {
        handleLimitError(result);
        // Don't show generic error toast, subscription limit modal will show
        return;
      }

      if (result.error && typeof result.error === 'object') {
        setFormErrors(result.error);
        toast.error('Mohon perbaiki kesalahan pada form');
      } else {
        toast.error(result.error || result.message || 'Gagal membuat bisnis');
      }
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <>
      {SubscriptionLimitModalComponent && (
        <SubscriptionLimitModalComponent
          isOpen={showLimitModal}
          onClose={closeLimitModal}
          errorData={limitError}
        />
      )}
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4'>
        <div className='w-full max-w-2xl'>
          {/* Header */}
          <div className='text-center mb-8'>
            <div className='flex justify-center mb-4'>
              <div className='w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center'>
                <Building2 className='w-8 h-8 text-white' />
              </div>
            </div>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              {isInitialSetup ? 'Selamat Datang!' : 'Tambah Bisnis Baru'}
            </h1>
            <p className='text-gray-600'>
              {isInitialSetup
                ? 'Mari kita mulai dengan membuat bisnis pertama Anda'
                : 'Tambahkan bisnis baru ke akun Anda'}
            </p>
          </div>

          {/* Form Card */}
          <Card className='shadow-xl'>
            <CardHeader>
              <CardTitle>Informasi Bisnis</CardTitle>
              <CardDescription>
                Isi data bisnis Anda. Anda dapat mengubahnya nanti di
                pengaturan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className='space-y-6'>
                {/* Business Type Selection */}
                <div>
                  <label
                    htmlFor='business_type_id'
                    className='flex items-center gap-2 mb-2 text-sm font-medium text-gray-700'
                  >
                    <Building2 className='w-4 h-4' />
                    Jenis Bisnis <span className='text-red-500'>*</span>
                  </label>
                  {loadingTypes ? (
                    <div className='flex items-center gap-2 text-sm text-gray-500 py-2'>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      Memuat jenis bisnis...
                    </div>
                  ) : (
                    <select
                      id='business_type_id'
                      name='business_type_id'
                      value={formData.business_type_id}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.business_type_id ? 'border-red-500' : ''
                      }`}
                    >
                      <option value=''>Pilih Jenis Bisnis</option>
                      {businessTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {formErrors.business_type_id && (
                    <p className='mt-1 text-xs text-red-500'>
                      {formErrors.business_type_id}
                    </p>
                  )}
                  {formData.business_type_id && (
                    <p className='mt-1 text-xs text-gray-500'>
                      {businessTypes.find(
                        t => t.id === parseInt(formData.business_type_id)
                      )?.description || ''}
                    </p>
                  )}
                </div>

                {/* Business Name */}
                <div>
                  <label
                    htmlFor='name'
                    className='flex items-center gap-2 mb-2 text-sm font-medium text-gray-700'
                  >
                    <Building2 className='w-4 h-4' />
                    Nama Bisnis <span className='text-red-500'>*</span>
                  </label>
                  <Input
                    id='name'
                    name='name'
                    placeholder='Contoh: Warung Makan Sederhana'
                    value={formData.name}
                    onChange={handleChange}
                    className={formErrors.name ? 'border-red-500' : ''}
                  />
                  {formErrors.name && (
                    <p className='mt-1 text-xs text-red-500'>
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Email & Phone */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label
                      htmlFor='email'
                      className='flex items-center gap-2 mb-2 text-sm font-medium text-gray-700'
                    >
                      <Mail className='w-4 h-4' />
                      Email (Opsional)
                    </label>
                    <Input
                      id='email'
                      type='email'
                      name='email'
                      placeholder='email@bisnis.com'
                      value={formData.email}
                      onChange={handleChange}
                      className={formErrors.email ? 'border-red-500' : ''}
                    />
                    {formErrors.email && (
                      <p className='mt-1 text-xs text-red-500'>
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor='phone'
                      className='flex items-center gap-2 mb-2 text-sm font-medium text-gray-700'
                    >
                      <Phone className='w-4 h-4' />
                      Telepon (Opsional)
                    </label>
                    <Input
                      id='phone'
                      name='phone'
                      placeholder='08123456789'
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label
                    htmlFor='address'
                    className='flex items-center gap-2 mb-2 text-sm font-medium text-gray-700'
                  >
                    <MapPin className='w-4 h-4' />
                    Alamat (Opsional)
                  </label>
                  <textarea
                    id='address'
                    name='address'
                    className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    rows='3'
                    placeholder='Jl. Contoh No. 123, Jakarta'
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>

                {/* Tax Info */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label
                      htmlFor='tax_number'
                      className='flex items-center gap-2 mb-2 text-sm font-medium text-gray-700'
                    >
                      <FileText className='w-4 h-4' />
                      NPWP (Opsional)
                    </label>
                    <Input
                      id='tax_number'
                      name='tax_number'
                      placeholder='00.000.000.0-000.000'
                      value={formData.tax_number}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor='tax_rate'
                      className='flex items-center gap-2 mb-2 text-sm font-medium text-gray-700'
                    >
                      <Percent className='w-4 h-4' />
                      Tarif Pajak (%)
                    </label>
                    <Input
                      id='tax_rate'
                      type='number'
                      name='tax_rate'
                      placeholder='10'
                      value={formData.tax_rate}
                      onChange={handleChange}
                      min='0'
                      max='100'
                      step='0.01'
                      className={formErrors.tax_rate ? 'border-red-500' : ''}
                    />
                    {formErrors.tax_rate && (
                      <p className='mt-1 text-xs text-red-500'>
                        {formErrors.tax_rate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Info Box */}
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                  <div className='flex items-start gap-3'>
                    <CheckCircle className='w-5 h-5 text-blue-600 mt-0.5' />
                    <div className='text-sm text-blue-800'>
                      <p className='font-medium mb-1'>
                        Yang akan Anda dapatkan:
                      </p>
                      <ul className='list-disc list-inside space-y-1 text-blue-700'>
                        <li>Dashboard lengkap untuk monitoring bisnis</li>
                        <li>Manajemen produk dan kategori</li>
                        <li>Sistem kasir (POS) yang mudah digunakan</li>
                        <li>Laporan penjualan dan inventori</li>
                        <li>Dan masih banyak lagi...</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className='flex gap-3'>
                  {!isInitialSetup && (
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => navigate('/')}
                      className='flex-1 py-6'
                    >
                      Batal
                    </Button>
                  )}
                  <Button
                    type='submit'
                    className={`${
                      isInitialSetup ? 'w-full' : 'flex-1'
                    } bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg`}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                        Membuat Bisnis...
                      </>
                    ) : (
                      <>
                        <Building2 className='w-5 h-5 mr-2' />
                        {isInitialSetup
                          ? 'Buat Bisnis & Mulai'
                          : 'Tambah Bisnis'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className='text-center text-sm text-gray-600 mt-6'>
            Anda dapat mengelola pengaturan bisnis nanti di menu Pengaturan
          </p>
        </div>
      </div>
    </>
  );
};

export default BusinessSetup;
