import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as z from 'zod';
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
import apiClient from '../../utils/apiClient';
import { toast } from 'react-hot-toast';

const resetPasswordSchema = z
  .object({
    email: z.string().email('Email tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    password_confirmation: z.string().min(8, 'Password konfirmasi minimal 8 karakter'),
  })
  .refine(data => data.password === data.password_confirmation, {
    message: 'Password dan konfirmasi password tidak sama',
    path: ['password_confirmation'],
  });

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailParam || '',
      password: '',
      password_confirmation: '',
    },
  });

  useEffect(() => {
    // Set email from URL parameter
    if (emailParam) {
      setValue('email', decodeURIComponent(emailParam));
    }

    // Validate token and email are present
    if (!token || !emailParam) {
      setError('Link reset password tidak valid. Token atau email tidak ditemukan.');
    }
  }, [token, emailParam, setValue]);

  const onSubmit = async data => {
    if (!token) {
      setError('Token reset password tidak ditemukan.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiClient.post('/reset-password', {
        token,
        email: data.email,
        password: data.password,
        password_confirmation: data.password_confirmation,
      });

      if (response.data.success) {
        setIsSuccess(true);
        toast.success('Password berhasil direset. Silakan login dengan password baru Anda.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.data.message || 'Gagal mereset password. Silakan coba lagi.');
        toast.error(response.data.message || 'Gagal mereset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Terjadi kesalahan. Silakan coba lagi.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className='flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-blue-50 to-indigo-100'>
        <Card className='w-full max-w-md'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-2xl font-bold text-center'>
              Password Berhasil Direset
            </CardTitle>
            <CardDescription className='text-center'>
              Password Anda telah berhasil direset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className='bg-green-50 border-green-200'>
              <AlertDescription className='text-green-800'>
                <strong>Berhasil!</strong>
                <br />
                Password Anda telah berhasil direset. Anda akan diarahkan ke halaman login dalam beberapa detik.
              </AlertDescription>
            </Alert>
            <div className='mt-6'>
              <Button asChild className='w-full'>
                <Link to='/login'>
                  Masuk ke Akun
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || !emailParam) {
    return (
      <div className='flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-blue-50 to-indigo-100'>
        <Card className='w-full max-w-md'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-2xl font-bold text-center'>
              Link Tidak Valid
            </CardTitle>
            <CardDescription className='text-center'>
              Link reset password tidak valid atau sudah kadaluarsa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant='destructive'>
              <AlertDescription>
                {error || 'Link reset password tidak valid. Token atau email tidak ditemukan.'}
              </AlertDescription>
            </Alert>
            <div className='mt-6 space-y-2'>
              <Button asChild variant='outline' className='w-full'>
                <Link to='/forgot-password'>
                  Request Link Baru
                </Link>
              </Button>
              <Button asChild variant='ghost' className='w-full'>
                <Link to='/login'>
                  <ArrowLeft className='w-4 h-4 mr-2' />
                  Kembali ke Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-blue-50 to-indigo-100'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-2xl font-bold text-center'>
            Reset Password
          </CardTitle>
          <CardDescription className='text-center'>
            Masukkan password baru untuk akun Anda
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
                disabled
                className='bg-gray-100'
              />
              <p className='text-xs text-gray-500'>
                Email tidak dapat diubah
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Password Baru</Label>
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
                <p className='text-sm text-red-500'>{errors.password.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password_confirmation'>Konfirmasi Password</Label>
              <div className='relative'>
                <Input
                  id='password_confirmation'
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder='Ulangi password baru'
                  {...register('password_confirmation')}
                  className={errors.password_confirmation ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type='button'
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className='absolute text-gray-500 transform -translate-y-1/2 right-3 top-1/2 hover:text-gray-700'
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password_confirmation && (
                <p className='text-sm text-red-500'>
                  {errors.password_confirmation.message}
                </p>
              )}
            </div>

            <Button type='submit' className='w-full' disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Memproses...
                </>
              ) : (
                <>
                  <Lock className='w-4 h-4 mr-2' />
                  Reset Password
                </>
              )}
            </Button>
          </form>

          <div className='mt-6 text-center'>
            <Link
              to='/login'
              className='text-sm text-gray-600 hover:text-blue-600 flex items-center justify-center gap-2'
            >
              <ArrowLeft className='w-4 h-4' />
              Kembali ke Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

