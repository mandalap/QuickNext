import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import * as z from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const {
    login,
    checkSubscription,
    businesses,
    businessLoading,
    loadBusinesses,
  } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async data => {
    console.log('🔐 Login attempt:', { email: data.email });
    console.log('🔐 Login attempt - email input:', data.email);

    // Clear any existing cache before login
    console.log('🧹 Clearing localStorage cache...');
    localStorage.removeItem('token');
    localStorage.removeItem('currentBusinessId');
    localStorage.removeItem('user');

    setError('');

    try {
      const result = await login(data.email, data.password);
      console.log('📩 Login result:', result);
      console.log('📩 Login result - user data:', result.user);
      console.log('📩 Login result - user name:', result.user?.name);
      console.log('📩 Login result - user email:', result.user?.email);

      if (result.success) {
        console.log('✅ Login successful, redirecting...');

        const userRole = result.user?.role;
        const userName = result.user?.name || 'User';
        let redirectPath = '/';

        // Employee roles (kasir, kitchen, waiter, admin) - cek subscription owner business
        if (['kasir', 'kitchen', 'waiter', 'admin'].includes(userRole)) {
          // Cek apakah owner business masih punya subscription aktif
          const ownerSubscriptionStatus = result.owner_subscription_status;

          if (
            !ownerSubscriptionStatus ||
            !ownerSubscriptionStatus.has_active_subscription
          ) {
            // Owner business subscription sudah habis, employee tidak bisa login
            const errorMsg =
              'Subscription bisnis sudah habis. Silakan hubungi pemilik bisnis untuk memperbarui subscription.';
            setError(errorMsg);
            toast.error(errorMsg, {
              duration: 6000,
            });
            return;
          }

          // Owner masih punya subscription aktif, employee bisa login
          switch (userRole) {
            case 'kasir':
              redirectPath = '/cashier';
              break;
            case 'kitchen':
              redirectPath = '/kitchen';
              break;
            case 'waiter':
              redirectPath = '/tables';
              break;
            case 'admin':
              redirectPath = '/';
              break;
          }

          // Show success toast for employee
          toast.success(`Selamat datang, ${userName}!`, {
            duration: 3000,
          });

          console.log(`🎯 Redirecting employee ${userRole} to ${redirectPath}`);
          navigate(redirectPath, { replace: true });
          return;
        }

        // Untuk owner, super_admin - cek status subscription DAN business
        if (['owner', 'super_admin'].includes(userRole)) {
          const hasActiveSubscription = result.hasActiveSubscription;
          const hasBusiness = result.has_business || (businesses && businesses.length > 0);
          // ✅ FIX: Check pending payment status from login result or subscription_status
          const isPendingPayment = result.isPendingPayment || 
                                  result.subscription_status?.is_pending_payment || 
                                  false;
          
          console.log('🔍 Owner login - subscription status:', hasActiveSubscription);
          console.log('🔍 Owner login - pending payment:', isPendingPayment);
          console.log('🔍 Owner login - has_business:', hasBusiness);
          console.log('🔍 Owner login - businesses state:', businesses);
          
          // ✅ FIX: Priority 0: Cek pending payment - jika ada pending payment, redirect ke subscription-plans
          if (isPendingPayment) {
            redirectPath = '/subscription-plans';
            console.log('⚠️ Owner has pending payment, redirecting to subscription-plans');
          }
          // ✅ FIX: Priority 1: Business harus ada dulu - langsung ke business-setup (trial gratis otomatis)
          // Tidak perlu cek subscription dulu untuk trial
          else if (!hasBusiness) {
            redirectPath = '/business-setup';
            console.log('🏢 Owner has no business, redirecting to business-setup (trial gratis otomatis)');
          }
          // ✅ Priority 2: Jika sudah punya business dan subscription aktif, ke dashboard
          else if (hasActiveSubscription) {
            redirectPath = '/';
            console.log('✅ Owner has business and subscription, redirecting to dashboard');
          }
          // ✅ FIX: Jika sudah punya business tapi belum ada subscription aktif, tetap ke dashboard
          // Trial gratis sudah diberikan saat create business, atau bisa upgrade dari dashboard
          else {
            redirectPath = '/';
            console.log('✅ Owner has business (trial gratis), redirecting to dashboard');
          }
        } else {
          // Default untuk role lain
          redirectPath = '/';
        }

        // Show success toast for owner/super_admin
        toast.success(`Selamat datang, ${userName}!`, {
          duration: 3000,
        });

        console.log(`🎯 Redirecting ${userRole} to ${redirectPath}`);
        navigate(redirectPath, { replace: true });
      } else {
        console.error('❌ Login failed:', result.error);
        const errorMsg = result.error || 'Login gagal. Silakan coba lagi.';
        setError(errorMsg);
        toast.error(`Login gagal: ${errorMsg}`, {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('💥 Login exception:', error);
      
      // ✅ FIX: Better error handling for timeout and network errors
      let errorMsg = 'Terjadi kesalahan. Silakan coba lagi.';
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMsg = 'Koneksi timeout. Server mungkin sedang sibuk atau tidak merespons. Silakan coba lagi dalam beberapa saat.';
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        errorMsg = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      } else if (error.response?.status === 401) {
        errorMsg = 'Email atau password salah. Silakan periksa kembali.';
      } else if (error.response?.status === 422) {
        // ✅ FIX: Check for validation errors first
        if (error.response?.data?.errors) {
          const errors = error.response.data.errors;
          if (typeof errors === 'object') {
            const errorMessages = Object.values(errors).flat();
            errorMsg = errorMessages.join(', ') || error.response?.data?.message || 'Data yang dimasukkan tidak valid.';
          } else if (Array.isArray(errors)) {
            errorMsg = errors.join(', ') || error.response?.data?.message || 'Data yang dimasukkan tidak valid.';
          } else {
            errorMsg = error.response?.data?.message || 'Data yang dimasukkan tidak valid.';
          }
        } else {
          errorMsg = error.response?.data?.message || 'Email atau password salah. Silakan periksa kembali.';
        }
      } else if (error.response?.status === 500) {
        errorMsg = 'Server mengalami masalah. Silakan coba lagi nanti.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      toast.error(`Login gagal: ${errorMsg}`, {
        duration: 6000,
      });
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-blue-50 to-indigo-100'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-2xl font-bold text-center'>
            Masuk ke Akun
          </CardTitle>
          <CardDescription className='text-center'>
            Masukkan email dan password Anda untuk melanjutkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                placeholder='nama@email.com'
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className='text-sm text-red-500'>{errors.email.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <div className='relative'>
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Masukkan password'
                  {...register('password')}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute text-gray-500 transform -translate-y-1/2 right-3 top-1/2 hover:text-gray-700'
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className='text-sm text-red-500'>
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type='submit' className='w-full' disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

          {/* Google OAuth */}
          <div className='mt-4'>
            <Button
              type='button'
              variant='outline'
              className='w-full'
              onClick={() => {
                const backendUrl =
                  process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
                window.location.href = `${backendUrl}/auth/google/redirect`;
              }}
            >
              Lanjutkan dengan Google
            </Button>
          </div>

          <div className='mt-6 space-y-2 text-center'>
            <p className='text-sm text-gray-600'>
              <Link
                to='/forgot-password'
                className='font-medium text-blue-600 hover:text-blue-500'
              >
                Lupa password?
              </Link>
            </p>
            <p className='text-sm text-gray-600'>
              Belum punya akun?{' '}
              <Link
                to='/register'
                className='font-medium text-blue-600 hover:text-blue-500'
              >
                Daftar sekarang
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
