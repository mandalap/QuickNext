import axios from 'axios';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error, already_verified
  const [message, setMessage] = useState('Memverifikasi email Anda...');

  useEffect(() => {
    const verifyEmail = async () => {
      const id = searchParams.get('id');
      const hash = searchParams.get('hash');
      const expires = searchParams.get('expires');
      const signature = searchParams.get('signature');

      if (!id || !hash) {
        setStatus('error');
        setMessage('Link verifikasi tidak valid. Parameter tidak lengkap.');
        return;
      }

      try {
        // Build verification URL with all signed parameters
        const verifyUrl = `http://localhost:8000/api/email/verify/${id}/${hash}`;
        const params = new URLSearchParams();
        if (expires) params.append('expires', expires);
        if (signature) params.append('signature', signature);

        const urlWithParams = `${verifyUrl}${
          params.toString() ? '?' + params.toString() : ''
        }`;

        const response = await axios.get(urlWithParams);

        if (response.data.success) {
          if (response.data.already_verified) {
            setStatus('already_verified');
            setMessage('Email Anda sudah terverifikasi sebelumnya.');
          } else {
            setStatus('success');
            setMessage(
              'Email berhasil diverifikasi! Akun Anda sekarang aktif.'
            );
          }
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Gagal memverifikasi email.');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(
          error.response?.data?.message ||
            'Terjadi kesalahan saat memverifikasi email. Link mungkin sudah kadaluarsa atau tidak valid.'
        );
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className='flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-green-50 to-emerald-100'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1 text-center'>
          <CardTitle className='text-2xl font-bold'>Verifikasi Email</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex justify-center py-4'>
            {status === 'verifying' && (
              <Loader2 className='w-16 h-16 text-blue-600 animate-spin' />
            )}
            {status === 'success' && (
              <div className='flex flex-col items-center space-y-2'>
                <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center'>
                  <CheckCircle className='w-10 h-10 text-green-600' />
                </div>
                <p className='text-green-600 font-medium'>Berhasil!</p>
              </div>
            )}
            {(status === 'error' || status === 'already_verified') && (
              <div className='flex flex-col items-center space-y-2'>
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    status === 'already_verified' ? 'bg-blue-100' : 'bg-red-100'
                  }`}
                >
                  {status === 'already_verified' ? (
                    <CheckCircle className='w-10 h-10 text-blue-600' />
                  ) : (
                    <XCircle className='w-10 h-10 text-red-600' />
                  )}
                </div>
                <p
                  className={`font-medium ${
                    status === 'already_verified'
                      ? 'text-blue-600'
                      : 'text-red-600'
                  }`}
                >
                  {status === 'already_verified'
                    ? 'Sudah Terverifikasi'
                    : 'Error'}
                </p>
              </div>
            )}
          </div>

          <div className='space-y-2'>
            <Button
              onClick={() => navigate('/login')}
              className='w-full'
              variant={
                status === 'success' || status === 'already_verified'
                  ? 'default'
                  : 'outline'
              }
            >
              {status === 'verifying' ? 'Menunggu...' : 'Masuk ke Sistem'}
            </Button>
            {status === 'error' && (
              <Button
                onClick={() => navigate('/register')}
                variant='outline'
                className='w-full'
              >
                Kembali ke Halaman Daftar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerification;

