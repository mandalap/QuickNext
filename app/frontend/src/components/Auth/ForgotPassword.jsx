import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Mail, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
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
import { authService } from '../../services/auth.service';
import { toast } from 'react-hot-toast';

const forgotPasswordSchema = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasEmail = data.email && data.email.trim() !== '';
    const hasPhone = data.phone && data.phone.trim() !== '';

    // At least one must be provided
    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email atau nomor WhatsApp harus diisi',
        path: ['email'],
      });
      return;
    }

    // Validate email if provided
    if (hasEmail) {
      const emailResult = z.string().email().safeParse(data.email);
      if (!emailResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Email tidak valid',
          path: ['email'],
        });
      }
    }

    // Validate phone if provided
    if (hasPhone) {
      const phonePattern = /^(\+62|62|0)[0-9]{9,12}$/;
      if (!phonePattern.test(data.phone.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Format nomor WhatsApp tidak valid',
          path: ['phone'],
        });
      }
    }
  });

const ForgotPassword = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [inputType, setInputType] = useState('email');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
      phone: '',
    },
  });

  const emailValue = watch('email');
  const phoneValue = watch('phone');

  const onSubmit = async data => {
    setIsSubmitting(true);
    setIsSuccess(false);

    try {
      const response = await authService.forgotPassword(
        data.email || undefined,
        data.phone || undefined
      );

      if (response.success) {
        setIsSuccess(true);
        toast.success(response.message || 'Link reset password telah dikirim');
      } else {
        // Show error message from response
        const errorMessage = response.message || response.error || 'Gagal mengirim link reset password';
        toast.error(errorMessage);
        console.error('Forgot password failed:', response);
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error.message || error.error || 'Terjadi kesalahan. Silakan coba lagi.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputTypeChange = type => {
    setInputType(type);
    // Clear the other field when switching
    if (type === 'email') {
      setValue('phone', '');
    } else {
      setValue('email', '');
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-blue-50 to-indigo-100'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-2xl font-bold text-center'>
            Lupa Password
          </CardTitle>
          <CardDescription className='text-center'>
            Masukkan email atau nomor WhatsApp Anda untuk menerima link reset
            password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className='space-y-4'>
              <Alert className='bg-green-50 border-green-200'>
                <AlertDescription className='text-green-800'>
                  <strong>Link reset password telah dikirim!</strong>
                  <br />
                  Silakan cek email atau WhatsApp Anda. Link akan berlaku
                  selama 60 menit.
                </AlertDescription>
              </Alert>
              <div className='flex flex-col gap-2'>
                <Button asChild variant='outline' className='w-full'>
                  <Link to='/login'>
                    <ArrowLeft className='w-4 h-4 mr-2' />
                    Kembali ke Login
                  </Link>
                </Button>
                <Button
                  onClick={() => {
                    setIsSuccess(false);
                    setValue('email', '');
                    setValue('phone', '');
                  }}
                  variant='ghost'
                  className='w-full'
                >
                  Kirim Ulang
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              {/* Input Type Selector */}
              <div className='flex gap-2 p-1 bg-gray-100 rounded-lg'>
                <button
                  type='button'
                  onClick={() => handleInputTypeChange('email')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    inputType === 'email'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Mail className='w-4 h-4 inline mr-2' />
                  Email
                </button>
                <button
                  type='button'
                  onClick={() => handleInputTypeChange('phone')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    inputType === 'phone'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MessageCircle className='w-4 h-4 inline mr-2' />
                  WhatsApp
                </button>
              </div>

              {/* Email Input */}
              {inputType === 'email' && (
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
                    <p className='text-sm text-red-500'>
                      {errors.email.message}
                    </p>
                  )}
                </div>
              )}

              {/* Phone Input */}
              {inputType === 'phone' && (
                <div className='space-y-2'>
                  <Label htmlFor='phone'>Nomor WhatsApp</Label>
                  <Input
                    id='phone'
                    type='tel'
                    placeholder='081234567890 atau +6281234567890'
                    {...register('phone')}
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className='text-sm text-red-500'>
                      {errors.phone.message}
                    </p>
                  )}
                  <p className='text-xs text-gray-500'>
                    Format: 081234567890, +6281234567890, atau 6281234567890
                  </p>
                </div>
              )}

              {/* General Error */}
              {errors.root && (
                <Alert variant='destructive'>
                  <AlertDescription>{errors.root.message}</AlertDescription>
                </Alert>
              )}

              <Button type='submit' className='w-full' disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Mengirim...
                  </>
                ) : (
                  'Kirim Link Reset Password'
                )}
              </Button>
            </form>
          )}

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

export default ForgotPassword;

