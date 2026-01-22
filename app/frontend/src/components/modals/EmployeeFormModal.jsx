import { Eye, EyeOff, Loader2, Save, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../ui/toast';

// Format number with dots (thousands separator)
const formatNumber = value => {
  if (!value) return '';
  // Remove all non-digit characters
  const numericValue = value.toString().replace(/\D/g, '');
  if (!numericValue) return '';
  // Add dots as thousands separator
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Remove formatting (dots) to get numeric value
const unformatNumber = value => {
  if (!value) return '';
  return value.toString().replace(/\./g, '');
};

const EmployeeFormModal = ({
  isOpen,
  onClose,
  onSave,
  employee,
  mode = 'add',
}) => {
  const { toast } = useToast();
  const { currentBusiness, subscriptionFeatures } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    salary: '',
    commission_rate: '',
    is_active: true,
    hired_at: '',
    password: '',
    role: 'kasir', // Default role
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [salaryDisplay, setSalaryDisplay] = useState(''); // Display value with dots

  // Generate email slug from business name
  const generateEmailSlug = text => {
    if (!text) return 'toko';
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .replace(/-+/g, '') // Remove dashes
      .substring(0, 20); // Limit length
  };

  // Generate email automatically based on business name and role
  const generateEmail = () => {
    if (!currentBusiness?.name) {
      toast.error(
        '❌ Business belum dipilih. Silakan pilih business terlebih dahulu.'
      );
      return;
    }

    const businessSlug = generateEmailSlug(currentBusiness.name);
    // Role bisa dipilih bebas
    const allowedRole = formData.role || 'kasir';
    const rolePrefix = allowedRole;
    const randomNum = Math.floor(Math.random() * 10000) + 1; // ✅ FIX: Increase range to reduce collision
    const generatedEmail = `${rolePrefix}${randomNum}@${businessSlug}.local`;

    setFormData(prev => ({
      ...prev,
      email: generatedEmail,
      role: allowedRole, // ✅ FIX: Ensure role is set correctly
    }));

    // Clear email error if any
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }

    toast.success(`✅ Email otomatis dihasilkan: ${generatedEmail}`, {
      duration: 4000,
    });
  };

  useEffect(() => {
    if (mode === 'edit' && employee) {
      const salaryValue = employee.salary || '';
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        address: employee.address || '',
        salary: salaryValue,
        commission_rate: employee.commission_rate || '',
        is_active: employee.is_active !== undefined ? employee.is_active : true,
        hired_at: employee.hired_at ? employee.hired_at.split('T')[0] : '',
        password: '', // Never pre-fill password
        role: employee.user?.role || 'kasir', // Get role from user relation
      });
      // Set display value with formatting
      setSalaryDisplay(salaryValue ? formatNumber(salaryValue.toString()) : '');
    } else {
      // Default role untuk karyawan baru
      const defaultRole = 'kasir';
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        salary: '',
        commission_rate: '',
        is_active: true,
        hired_at: '',
        password: '',
        role: defaultRole, // Default role for new employee
      });
      setSalaryDisplay('');
    }
    setErrors({});
  }, [isOpen, mode, employee]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Special handler for salary field with formatting
  const handleSalaryChange = e => {
    const inputValue = e.target.value;
    // Format display value with dots
    const formatted = formatNumber(inputValue);
    setSalaryDisplay(formatted);

    // Store unformatted value in formData
    const unformatted = unformatNumber(inputValue);
    setFormData(prev => ({
      ...prev,
      salary: unformatted,
    }));

    // Clear error when user types
    if (errors.salary) {
      setErrors(prev => ({ ...prev, salary: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nama karyawan harus diisi';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email harus diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    if (mode === 'add' && !formData.password) {
      newErrors.password = 'Password harus diisi';
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }

    if (formData.salary) {
      const salaryNum = parseFloat(unformatNumber(formData.salary));
      if (isNaN(salaryNum) || salaryNum < 0) {
        newErrors.salary = 'Gaji harus >= 0';
      }
    }

    if (
      formData.commission_rate &&
      (parseFloat(formData.commission_rate) < 0 ||
        parseFloat(formData.commission_rate) > 100)
    ) {
      newErrors.commission_rate = 'Komisi harus antara 0-100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('❌ Validasi gagal. Periksa form dan coba lagi.');
      return;
    }

    // ✅ Set loading state immediately when form is submitted
    setSaving(true);
    
    try {
      // ✅ FIX: Prepare data for submission with proper format
      const submitData = {
        name: formData.name?.trim() || '',
        email: formData.email?.trim() || '',
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        // Convert salary to number or null (not empty string)
        salary: formData.salary
          ? parseFloat(unformatNumber(formData.salary))
          : null,
        commission_rate: formData.commission_rate
          ? parseFloat(formData.commission_rate)
          : null,
        is_active:
          formData.is_active !== undefined ? Boolean(formData.is_active) : true,
        hired_at: formData.hired_at || null,
        password: formData.password || '',
        // ✅ FIX: Kirim role yang dipilih user, backend akan validasi sesuai paket
        role: formData.role || 'kasir',
      };

      // ✅ DEBUG: Log data before sending
      console.log('📤 Submitting employee data:', {
        ...submitData,
        password: submitData.password ? '***' : '(empty)',
      });

      // ✅ FIX: Validate required fields before sending
      if (!submitData.name) {
        toast.error('❌ Nama karyawan wajib diisi');
        setSaving(false);
        return;
      }

      if (!submitData.email) {
        toast.error('❌ Email wajib diisi');
        setSaving(false);
        return;
      }

      if (mode === 'add' && !submitData.password) {
        toast.error('❌ Password wajib diisi');
        setSaving(false);
        return;
      }

      if (!submitData.role) {
        toast.error('❌ Role wajib dipilih');
        setSaving(false);
        return;
      }

      let result;
      try {
        result = await onSave(submitData);
        console.log('📥 Result from onSave:', result);
      } catch (saveError) {
        // ✅ FIX: Only catch actual errors, not successful responses
        // ✅ FIX: Check untuk subscription limit error di catch block
        // Error bisa dari useOptimisticUpdate (error.result) atau langsung dari API (error.response)
        if (saveError.result?.error === 'subscription_limit_reached') {
          // Error dari useOptimisticUpdate dengan result
          result = saveError.result;
        } else if (saveError.response?.status === 403 && saveError.response?.data?.error === 'subscription_limit_reached') {
          // Subscription limit error langsung dari API
          result = {
            success: false,
            error: 'subscription_limit_reached',
            message: saveError.response?.data?.message || 'Batas paket tercapai',
            limits: saveError.response?.data?.limits,
            status: 403,
            ...saveError.response?.data, // Include all error data
          };
        } else {
          console.error('❌ Error in onSave:', saveError);
          result = {
            success: false,
            error: saveError.message || 'Gagal menyimpan karyawan',
            errors: saveError.errors || saveError.response?.data?.errors || {},
            status: saveError.response?.status || 500,
          };
        }
      }

      // ✅ DEBUG: Always log result
      console.log('📥 Final result:', result);

      // ✅ FIX: Check if result is successful - only show error if truly failed
      if (result && result.success === true) {
        // ✅ FIX: Success - parent component will show success toast
        // Don't show duplicate toast here to avoid multiple toasts
        console.log('✅ Success - parent component will handle success toast');
        // Close modal will be handled by parent
        return; // ✅ FIX: Exit early to prevent error handling
      } else if (!result) {
        // ✅ FIX: Handle case when result is undefined or null
        // Tapi jangan tampilkan toast jika ini kemungkinan subscription limit error
        // (Error sudah ditangani di parent component)
        console.warn('⚠️ Result is null/undefined:', result);
        // ✅ FIX: Jangan tampilkan toast "Gagal menyimpan" jika result null
        // Biarkan parent component (EmployeeManagement) yang menangani error
        // Karena bisa jadi ini subscription limit error yang sudah di-handle
        return;
      } else {
        // ✅ FIX: Skip error handling untuk subscription limit error
        // Error sudah ditangani di parent component (EmployeeManagement)
        if (result?.error === 'subscription_limit_reached' || 
            result?.error === 'subscription_limit_reached' ||
            (result?.status === 403 && result?.error === 'subscription_limit_reached')) {
          console.log('⚠️ Subscription limit error - handled by parent component, skipping error toast');
          // Jangan tampilkan error toast di sini, sudah ditangani di parent
          // Jangan tampilkan "Gagal menyimpan" toast
          return;
        }
        
        // ✅ FIX: Handle all error cases
        // ✅ FIX: Handle error from API response
        // ✅ FIX: Jangan gunakan "Gagal menyimpan" sebagai default untuk subscription limit
        let errorMessage =
          result?.error === 'subscription_limit_reached' 
            ? result?.message || 'Batas paket tercapai'
            : (result?.error || result?.message || 'Gagal menyimpan karyawan');

        // ✅ DEBUG: Log full error details
        console.log('❌ Employee save error:', {
          result,
          errors: result?.errors,
          status: result?.status,
          submittedData: submitData,
        });

        // Extract validation errors if available
        if (result?.errors && Object.keys(result.errors).length > 0) {
          // Process all validation errors
          const errorEntries = Object.entries(result.errors);

          // Show first error as main toast
          const [firstField, firstMessages] = errorEntries[0];
          const firstMessage = Array.isArray(firstMessages)
            ? firstMessages[0]
            : firstMessages;

          // Translate common Laravel validation messages to Indonesian
          let translatedMessage = String(firstMessage)
            .replace(
              /The email has already been taken\.?/gi,
              'Email sudah digunakan oleh karyawan lain'
            )
            .replace(/The email/gi, 'Email')
            .replace(/has already been taken/gi, 'sudah digunakan')
            .replace(/is required/gi, 'wajib diisi')
            .replace(/must be/gi, 'harus')
            .replace(/must have/gi, 'harus memiliki')
            .replace(/must be a number/gi, 'harus berupa angka')
            .replace(/must be at least/gi, 'minimal')
            .replace(/characters/gi, 'karakter');

          // Show main error as toast with clear message
          console.log('🔔 Showing toast error:', translatedMessage);
          toast.error(`❌ ${translatedMessage}`, {
            duration: 6000,
            description:
              firstField === 'email'
                ? 'Email ini sudah digunakan. Silakan gunakan email lain atau klik tombol "Generate Email" untuk membuat email otomatis.'
                : `Field: ${firstField}`,
          });
          console.log('✅ Toast error called');

          // Show additional validation errors (if any) after a short delay
          if (errorEntries.length > 1) {
            setTimeout(() => {
              errorEntries.slice(1).forEach(([field, messages]) => {
                const message = Array.isArray(messages)
                  ? messages[0]
                  : messages;
                const translatedMsg = String(message)
                  .replace(/has already been taken/gi, 'sudah digunakan')
                  .replace(/is required/gi, 'wajib diisi')
                  .replace(/must be/gi, 'harus');
                toast.error(`⚠️ ${field}: ${translatedMsg}`, {
                  duration: 4000,
                });
              });
            }, 500);
          }
        } else {
          // ✅ FIX: Double check untuk subscription limit error sebelum tampilkan toast
          if (result?.error === 'subscription_limit_reached' || 
              (result?.status === 403 && result?.error === 'subscription_limit_reached')) {
            console.log('⚠️ Subscription limit error detected in else block - skipping toast');
            return; // Skip error toast, sudah ditangani di parent
          }
          
          // Show general error
          console.log('🔔 Showing general error toast:', errorMessage);
          toast.error(`❌ ${errorMessage}`, { duration: 5000 });
          console.log('✅ General error toast called');
        }

        // Keep modal open on error so user can fix issues
      }
    } catch (error) {
      console.error('Error saving employee:', error);

      // ✅ FIX: Check untuk subscription limit error di catch block juga
      if (error.response?.data?.error === 'subscription_limit_reached' ||
          (error.response?.status === 403 && error.response?.data?.error === 'subscription_limit_reached')) {
        console.log('⚠️ Subscription limit error in catch block - skipping toast');
        return; // Skip error toast, sudah ditangani di parent
      }

      // ✅ FIX: Handle different error types
      let errorMessage = 'Terjadi kesalahan saat menyimpan karyawan';

      if (error.response?.data) {
        // API error response (Laravel format)
        const apiError = error.response.data;

        // Handle Laravel validation errors (422)
        if (apiError.errors && Object.keys(apiError.errors).length > 0) {
          const firstErrorKey = Object.keys(apiError.errors)[0];
          const firstErrorValue = apiError.errors[firstErrorKey];

          if (Array.isArray(firstErrorValue)) {
            errorMessage = firstErrorValue[0];
          } else if (typeof firstErrorValue === 'string') {
            errorMessage = firstErrorValue;
          }

          // Translate to Indonesian
          errorMessage = String(errorMessage)
            .replace(
              /The email has already been taken\.?/gi,
              'Email sudah digunakan oleh karyawan lain'
            )
            .replace(/Email sudah digunakan oleh karyawan lain di bisnis ini/gi, 'Email sudah digunakan oleh karyawan lain di bisnis ini')
            .replace(/has already been taken/gi, 'sudah digunakan')
            .replace(/is required/gi, 'wajib diisi');

          // Show toast with description
          toast.error(`❌ ${errorMessage}`, {
            duration: 6000,
            description:
              firstErrorKey === 'email'
                ? 'Silakan gunakan email lain atau edit karyawan yang sudah ada.'
                : undefined,
          });
        } else {
          errorMessage = apiError.error || apiError.message || errorMessage;
          toast.error(`❌ ${errorMessage}`, { duration: 5000 });
        }
      } else if (error.message) {
        errorMessage = error.message;
        toast.error(`❌ ${errorMessage}`, { duration: 5000 });
      } else {
        toast.error(`❌ ${errorMessage}`, { duration: 5000 });
      }

      // Keep modal open on error so user can fix issues
    } finally {
      // ✅ FIX: Always reset saving state (loading will stop)
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden relative'>
        {/* ✅ IMPROVED: Loading overlay dengan animasi yang lebih halus dan menarik */}
        {saving && (
          <div className='absolute inset-0 bg-white bg-opacity-98 flex items-center justify-center z-50 rounded-lg backdrop-blur-md transition-opacity duration-200'>
            <div className='flex flex-col items-center gap-4 p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl shadow-2xl border-2 border-blue-200 max-w-sm mx-4 transform transition-all duration-300 scale-100'>
              <div className='relative'>
                <Loader2 className='w-12 h-12 animate-spin text-blue-600' />
                <div className='absolute inset-0 w-12 h-12 rounded-full border-4 border-blue-200 border-t-transparent animate-spin' style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
              </div>
              <div className='text-center space-y-1'>
                <p className='text-lg font-semibold text-gray-900'>
                  {mode === 'add' ? 'Menambahkan karyawan...' : 'Menyimpan perubahan...'}
                </p>
                <p className='text-sm text-gray-600'>Mohon tunggu sebentar</p>
              </div>
              <div className='w-full max-w-[200px] h-1.5 bg-blue-100 rounded-full overflow-hidden mt-2'>
                <div className='h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full animate-pulse' style={{ width: '60%', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b'>
          <h2 className='text-xl font-bold text-gray-900'>
            {mode === 'add' ? 'Tambah Karyawan' : 'Edit Karyawan'}
          </h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            type='button'
            disabled={saving}
          >
            <X className='w-6 h-6' />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className='overflow-y-auto max-h-[calc(90vh-140px)]'
          style={{ pointerEvents: saving ? 'none' : 'auto' }}
        >
          <div className='p-6 space-y-4'>
            {/* Nama */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Nama Lengkap <span className='text-red-500'>*</span>
              </label>
              <Input
                name='name'
                value={formData.name}
                onChange={handleChange}
                placeholder='Contoh: Siti Rahma'
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className='text-red-500 text-sm mt-1'>{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Email <span className='text-red-500'>*</span>
              </label>
              <div className='flex gap-2'>
                <Input
                  type='email'
                  name='email'
                  value={formData.email}
                  onChange={handleChange}
                  placeholder='contoh@email.com'
                  className={`flex-1 ${errors.email ? 'border-red-500' : ''}`}
                />
                {mode === 'add' && (
                  <Button
                    type='button'
                    onClick={generateEmail}
                    variant='outline'
                    className='whitespace-nowrap'
                    title='Generate email otomatis berdasarkan nama toko'
                  >
                    <Sparkles className='w-4 h-4 mr-1' />
                    Generate
                  </Button>
                )}
              </div>
              {errors.email && (
                <p className='text-red-500 text-sm mt-1'>{errors.email}</p>
              )}
              {mode === 'add' && (
                <p className='text-xs text-gray-500 mt-1'>
                  Email ini akan digunakan untuk login ke sistem.{' '}
                  {currentBusiness?.name && (
                    <span className='text-blue-600'>
                      Atau klik &quot;Generate&quot; untuk membuat email
                      otomatis berdasarkan nama toko ({currentBusiness.name})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                No. Telepon
              </label>
              <Input
                type='tel'
                name='phone'
                value={formData.phone}
                onChange={handleChange}
                placeholder='081234567890'
              />
            </div>

            {/* Password */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Password{' '}
                {mode === 'add' && <span className='text-red-500'>*</span>}
              </label>
              <div className='relative'>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name='password'
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={
                    mode === 'edit'
                      ? 'Kosongkan jika tidak ingin mengubah'
                      : 'Minimal 6 karakter'
                  }
                  className={errors.password ? 'border-red-500' : ''}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                >
                  {showPassword ? (
                    <EyeOff className='w-4 h-4' />
                  ) : (
                    <Eye className='w-4 h-4' />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className='text-red-500 text-sm mt-1'>{errors.password}</p>
              )}
              {mode === 'edit' && (
                <p className='text-xs text-gray-500 mt-1'>
                  Kosongkan jika tidak ingin mengubah password
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Peran/Role <span className='text-red-500'>*</span>
              </label>
              <select
                name='role'
                value={formData.role}
                onChange={handleChange}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value='kasir'>Kasir - Transaksi dan penjualan</option>
                <option value='admin'>Admin - Kelola seluruh sistem</option>
                <option value='kitchen'>Dapur - Kelola pesanan masakan</option>
                <option value='waiter'>Pelayan - Kelola meja dan pesanan</option>
              </select>
              <p className='text-xs text-gray-500 mt-1'>
                {formData.role === 'admin' && '✓ Akses penuh ke semua fitur'}
                {formData.role === 'kasir' &&
                  '✓ Akses: Kasir, Penjualan, Self Service'}
                {formData.role === 'kitchen' && '✓ Akses: Dapur, Bahan & Resep'}
                {formData.role === 'waiter' && '✓ Akses: Meja, Self Service'}
              </p>
            </div>

            {/* Address */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Alamat
              </label>
              <textarea
                name='address'
                value={formData.address}
                onChange={handleChange}
                placeholder='Alamat lengkap karyawan'
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                rows='3'
              />
            </div>

            {/* Salary & Commission */}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Gaji Bulanan
                </label>
                <Input
                  type='text'
                  name='salary'
                  value={salaryDisplay}
                  onChange={handleSalaryChange}
                  placeholder='0'
                  className={errors.salary ? 'border-red-500' : ''}
                />
                {errors.salary && (
                  <p className='text-red-500 text-sm mt-1'>{errors.salary}</p>
                )}
                <p className='text-xs text-gray-500 mt-1'>
                  Dalam Rupiah (contoh: 5.000.000)
                </p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Komisi (%)
                </label>
                <Input
                  type='number'
                  name='commission_rate'
                  value={formData.commission_rate}
                  onChange={handleChange}
                  placeholder='0'
                  min='0'
                  max='100'
                  step='0.1'
                  className={errors.commission_rate ? 'border-red-500' : ''}
                />
                {errors.commission_rate && (
                  <p className='text-red-500 text-sm mt-1'>
                    {errors.commission_rate}
                  </p>
                )}
                <p className='text-xs text-gray-500 mt-1'>0-100%</p>
              </div>
            </div>

            {/* Hired At */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Tanggal Bergabung
              </label>
              <Input
                type='date'
                name='hired_at'
                value={formData.hired_at}
                onChange={handleChange}
              />
              <p className='text-xs text-gray-500 mt-1'>
                Tanggal mulai bekerja
              </p>
            </div>

            {/* Status */}
            <div className='flex items-center space-x-2'>
              <input
                type='checkbox'
                id='is_active'
                name='is_active'
                checked={formData.is_active}
                onChange={handleChange}
                className='w-4 h-4 text-blue-600 rounded focus:ring-blue-500'
              />
              <label
                htmlFor='is_active'
                className='text-sm font-medium text-gray-700'
              >
                Karyawan Aktif
              </label>
            </div>
            <p className='text-xs text-gray-500 ml-6'>
              Non-aktifkan jika karyawan sudah tidak bekerja
            </p>
          </div>

          {/* Footer */}
          <div className='flex items-center justify-end gap-3 p-6 border-t bg-gray-50'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              type='submit'
              className='bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed min-w-[140px] transition-opacity'
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  <span className='font-medium'>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className='w-4 h-4 mr-2' />
                  <span>{mode === 'add' ? 'Tambah Karyawan' : 'Simpan Perubahan'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeFormModal;
