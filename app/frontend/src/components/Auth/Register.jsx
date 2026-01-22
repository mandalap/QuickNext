import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { CheckCircle, Eye, EyeOff, Loader2, Phone, XCircle } from 'lucide-react';
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


const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const registerSchema = z
  .object({
    name: z.string().min(1, 'Nama wajib diisi'),

    email: z.string().email('Email tidak valid'),
    phone: z
      .string()
      .min(10, 'Nomor WhatsApp wajib diisi')
      .regex(/^(\+62|62|0)[0-9]{9,12}$/, 'Format nomor WhatsApp tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    password_confirmation: z.string(),
  })
  .refine(data => data.password === data.password_confirmation, {
    message: 'Konfirmasi password tidak cocok',
    path: ['password_confirmation'],
  });

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const phoneValue = watch('phone');

  const handleSendOTP = async () => {
    const phoneToVerify = phoneValue || phone;
    if (!phoneToVerify || !phoneToVerify.trim()) {
      toast.error('Nomor WhatsApp wajib diisi');
      return;
    }

    // Validate phone format
    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
    if (!phoneRegex.test(phoneToVerify.trim())) {
      toast.error(
        'Format nomor WhatsApp tidak valid. Gunakan format: 081234567890'
      );
      return;
    }

    // Update phone state
    setPhone(phoneToVerify.trim());
    setValue('phone', phoneToVerify.trim());

    setSendingOTP(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/whatsapp/send-otp`,
        {
          phone: phoneToVerify.trim(),
        }
      );

      if (response.data.success) {
        setOtpSent(true);
        setOtpCode(''); // Reset OTP code
        setOtpVerified(false); // Reset verification status
        toast.success('Kode OTP telah dikirim ke WhatsApp Anda');
      } else {
        toast.error(response.data.message || 'Gagal mengirim OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      const errorMsg =
        error.response?.data?.message ||
        'Gagal mengirim OTP. Pastikan nomor WhatsApp Anda benar.';
      toast.error(errorMsg);
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    const phoneToVerify = phoneValue || phone;
    if (!phoneToVerify || !phoneToVerify.trim()) {
      toast.error('Nomor WhatsApp wajib diisi');
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      toast.error('Masukkan kode OTP 6 digit');
      return;
    }

    setVerifyingOTP(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/whatsapp/verify-otp`,
        {
          phone: phoneToVerify.trim(),
          code: otpCode.trim(),
        }
      );

      if (response.data.success) {
        setOtpVerified(true);
        toast.success(
          'Nomor WhatsApp berhasil diverifikasi! Sekarang Anda bisa mendaftar.'
        );
      } else {
        toast.error(response.data.message || 'Kode OTP tidak valid');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      const errorMsg =
        error.response?.data?.message ||
        'Kode OTP tidak valid atau sudah kedaluwarsa';
      toast.error(errorMsg);
    } finally {
      setVerifyingOTP(false);
    }
  };

  const onSubmit = async data => {
    if (!otpVerified) {
      toast.error('Nomor WhatsApp harus diverifikasi terlebih dahulu');
      return;
    }
    setError('');
    const result = await registerUser(
      data.name,
      data.email,
      data.phone,
      data.password,
      data.password_confirmation,
      true // whatsapp_verified
    );
    if (result.success) {
      // ✅ Show message jika email verifikasi dikirim
      if (result.email_verification_sent) {
        toast.success('Email verifikasi telah dikirim');
      }
      // Check if user needs to complete profile
      if (result.requires_profile_completion) {
        navigate('/complete-profile');
      } else if (result.requires_subscription) {
        // ✅ FIX: Cek apakah user sudah punya business
        if (!result.has_business) {
          console.log(
            '🏢 User has no business, redirecting to business setup...'
          );
          navigate('/business-setup');
        } else {
          console.log(
            '💳 User has business, redirecting to subscription plans...'
          );
          navigate('/subscription-plans');
        }
      } else {
        navigate('/');
      }
    } else {
      // ✅ FIX: Show detailed error messages
      const errorMsg = result.error || 'Registrasi gagal. Silakan coba lagi.';
      setError(errorMsg);
      toast.error(errorMsg);
      // ✅ FIX: Set field-specific errors if available
      if (result.errors) {
        Object.keys(result.errors).forEach(field => {
          const fieldErrors = result.errors[field];
          if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
            // Set error untuk field tertentu jika ada
            console.error(`Field ${field} error:`, fieldErrors[0]);
          }
        });
      }
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-blue-50 to-indigo-100'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-2xl font-bold text-center'>
            Buat Akun Baru
          </CardTitle>
          <CardDescription className='text-center'>
            Daftar untuk mulai menggunakan sistem POS
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
              <Label htmlFor='name'>Nama Lengkap</Label>
              <Input
                id='name'
                type='text'
                placeholder='Masukkan nama lengkap'
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className='text-sm text-red-500'>{errors.name.message}</p>
              )}
            </div>

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
              <Label htmlFor='phone' className='flex items-center gap-2'>
                <Phone className='w-4 h-4 text-gray-500' />
                Nomor WhatsApp <span className='text-red-500'>*</span>
              </Label>
              <div className='flex gap-2'>
                <Input
                  id='phone'
                  type='tel'
                  placeholder='081234567890'
                  {...register('phone')}
                  className={errors.phone ? 'border-red-500 flex-1' : 'flex-1'}
                  disabled={otpVerified}
                />
                {!otpVerified && (
                  <Button
                    type='button'
                    onClick={handleSendOTP}
                    disabled={sendingOTP || !phoneValue}
                    variant='outline'
                    className='whitespace-nowrap'
                  >
                    {sendingOTP ? 'Mengirim...' : 'Kirim OTP'}
                  </Button>
                )}
              </div>
              {errors.phone && (
                <p className='text-sm text-red-500'>{errors.phone.message}</p>
              )}

              {/* OTP Verification Section */}
              {otpSent && !otpVerified && (
                <div className='mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                  <Label
                    htmlFor='otp'
                    className='text-sm font-medium text-blue-900'
                  >
                    Masukkan Kode OTP (6 digit)
                  </Label>
                  <div className='flex gap-2 mt-2'>
                    <Input
                      id='otp'
                      type='text'
                      value={otpCode}
                      onChange={e => {
                        const value = e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 6);
                        setOtpCode(value);
                      }}
                      placeholder='123456'
                      className='flex-1 text-center text-lg tracking-widest'
                      maxLength={6}
                    />
                    <Button
                      type='button'
                      onClick={handleVerifyOTP}
                      disabled={verifyingOTP || otpCode.length !== 6}
                      className='bg-blue-600 hover:bg-blue-700'
                    >
                      {verifyingOTP ? 'Memverifikasi...' : 'Verifikasi'}
                    </Button>
                  </div>
                  <p className='text-xs text-blue-700 mt-2'>
                    Kode OTP telah dikirim ke WhatsApp Anda. Masukkan 6 digit
                    kode yang diterima.
                  </p>
                </div>
              )}

              {/* Verification Status */}
              {otpVerified ? (
                <p className='text-sm text-green-600 flex items-center gap-1'>
                  <CheckCircle className='w-4 h-4' />
                  Nomor WhatsApp sudah diverifikasi
                </p>
              ) : (
                <p className='text-sm text-red-600 flex items-center gap-1'>
                  <XCircle className='w-4 h-4' />
                  Nomor WhatsApp belum diverifikasi. Klik &quot;Kirim OTP&quot;
                  untuk memverifikasi.
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <div className='relative'>
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Minimal 8 karakter'
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

            <div className='space-y-2'>
              <Label htmlFor='password_confirmation'>Konfirmasi Password</Label>
              <div className='relative'>
                <Input
                  id='password_confirmation'
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder='Ulangi password'
                  {...register('password_confirmation')}
                  className={
                    errors.password_confirmation
                      ? 'border-red-500 pr-10'
                      : 'pr-10'
                  }
                />
                <button
                  type='button'
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className='absolute text-gray-500 transform -translate-y-1/2 right-3 top-1/2 hover:text-gray-700'
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
              {errors.password_confirmation && (
                <p className='text-sm text-red-500'>
                  {errors.password_confirmation.message}
                </p>
              )}
            </div>

            <Button
              type='submit'
              className='w-full'
              disabled={isSubmitting || !otpVerified}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Mendaftar...
                </>
              ) : (
                'Daftar'
              )}
            </Button>

            {!otpVerified && (
              <p className='text-sm text-center text-red-600'>
                Silakan verifikasi nomor WhatsApp terlebih dahulu sebelum
                mendaftar
              </p>
            )}
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
              Daftar dengan Google
            </Button>
          </div>

          <div className='mt-6 text-center'>
            <p className='text-sm text-gray-600'>
              Sudah punya akun?{' '}
              <Link
                to='/login'
                className='font-medium text-blue-600 hover:text-blue-500'
              >
                Masuk sekarang
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
