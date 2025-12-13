import { ArrowLeft, Eye, EyeOff, Lock, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { userService } from '../services/user.service';

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validatePassword = () => {
    const newErrors = {};

    if (!passwordData.current_password) {
      newErrors.current_password = 'Password saat ini harus diisi';
    }

    if (!passwordData.new_password) {
      newErrors.new_password = 'Password baru harus diisi';
    } else if (passwordData.new_password.length < 8) {
      newErrors.new_password = 'Password baru minimal 8 karakter';
    }

    if (!passwordData.new_password_confirmation) {
      newErrors.new_password_confirmation = 'Konfirmasi password harus diisi';
    } else if (
      passwordData.new_password !== passwordData.new_password_confirmation
    ) {
      newErrors.new_password_confirmation = 'Konfirmasi password tidak sama';
    }

    if (passwordData.current_password === passwordData.new_password) {
      newErrors.new_password =
        'Password baru harus berbeda dengan password saat ini';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validatePassword()) {
      toast.error('Mohon perbaiki kesalahan pada form');
      return;
    }

    setLoading(true);
    try {
      const result = await userService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        new_password_confirmation: passwordData.new_password_confirmation,
      });

      if (result.success) {
        toast.success('Password berhasil diubah');
        // Reset form
        setPasswordData({
          current_password: '',
          new_password: '',
          new_password_confirmation: '',
        });
        // Navigate back after 1 second
        setTimeout(() => {
          navigate('/settings/profile');
        }, 1000);
      } else {
        const errorMessage =
          result.message || result.error || 'Gagal mengubah password';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Terjadi kesalahan saat mengubah password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container mx-auto px-4 py-6 max-w-2xl'>
      {/* Header */}
      <div className='flex items-center gap-4 mb-6'>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => navigate(-1)}
          className='-ml-2'
        >
          <ArrowLeft className='w-4 h-4 mr-2' />
          Kembali
        </Button>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Ganti Password</h1>
          <p className='text-sm text-gray-500'>
            Ubah password Anda untuk meningkatkan keamanan akun
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-lg flex items-center gap-2'>
            <Lock className='w-5 h-5' />
            Form Ganti Password
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label
              htmlFor='current_password'
              className='flex items-center gap-2'
            >
              <Lock className='w-4 h-4 text-gray-500' />
              Password Saat Ini
            </Label>
            <div className='relative'>
              <Input
                id='current_password'
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordData.current_password}
                onChange={e =>
                  handleInputChange('current_password', e.target.value)
                }
                placeholder='Masukkan password saat ini'
                className={`w-full pr-10 ${
                  errors.current_password ? 'border-red-500' : ''
                }`}
              />
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className='w-4 h-4 text-gray-400' />
                ) : (
                  <Eye className='w-4 h-4 text-gray-400' />
                )}
              </Button>
            </div>
            {errors.current_password && (
              <p className='text-sm text-red-600'>{errors.current_password}</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='new_password' className='flex items-center gap-2'>
              <Lock className='w-4 h-4 text-gray-500' />
              Password Baru
            </Label>
            <div className='relative'>
              <Input
                id='new_password'
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={e =>
                  handleInputChange('new_password', e.target.value)
                }
                placeholder='Masukkan password baru (min. 8 karakter)'
                className={`w-full pr-10 ${
                  errors.new_password ? 'border-red-500' : ''
                }`}
              />
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className='w-4 h-4 text-gray-400' />
                ) : (
                  <Eye className='w-4 h-4 text-gray-400' />
                )}
              </Button>
            </div>
            {errors.new_password && (
              <p className='text-sm text-red-600'>{errors.new_password}</p>
            )}
            <p className='text-xs text-gray-500'>
              Password harus minimal 8 karakter
            </p>
          </div>

          <div className='space-y-2'>
            <Label
              htmlFor='new_password_confirmation'
              className='flex items-center gap-2'
            >
              <Lock className='w-4 h-4 text-gray-500' />
              Konfirmasi Password Baru
            </Label>
            <div className='relative'>
              <Input
                id='new_password_confirmation'
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.new_password_confirmation}
                onChange={e =>
                  handleInputChange('new_password_confirmation', e.target.value)
                }
                placeholder='Masukkan ulang password baru'
                className={`w-full pr-10 ${
                  errors.new_password_confirmation ? 'border-red-500' : ''
                }`}
              />
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className='w-4 h-4 text-gray-400' />
                ) : (
                  <Eye className='w-4 h-4 text-gray-400' />
                )}
              </Button>
            </div>
            {errors.new_password_confirmation && (
              <p className='text-sm text-red-600'>
                {errors.new_password_confirmation}
              </p>
            )}
          </div>

          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4'>
            <p className='text-sm text-blue-800 font-medium mb-2'>
              Tips Keamanan Password:
            </p>
            <ul className='text-xs text-blue-700 space-y-1 list-disc list-inside'>
              <li>Gunakan minimal 8 karakter</li>
              <li>Gunakan kombinasi huruf besar, huruf kecil, dan angka</li>
              <li>Jangan gunakan informasi pribadi sebagai password</li>
              <li>Jangan bagikan password Anda kepada siapapun</li>
            </ul>
          </div>

          <div className='flex gap-3 pt-4'>
            <Button
              variant='outline'
              onClick={() => navigate(-1)}
              className='flex-1'
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={loading} className='flex-1'>
              {loading ? (
                <>
                  <Save className='w-4 h-4 mr-2 animate-spin' />
                  Mengubah...
                </>
              ) : (
                <>
                  <Save className='w-4 h-4 mr-2' />
                  Ubah Password
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;
