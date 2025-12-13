import { ArrowLeft, Mail, Phone, Save, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/user.service';

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await userService.updateProfile(profileData);
      if (result.success) {
        // Update user in AuthContext
        if (result.data?.user) {
          setUser(result.data.user);
        }
        toast.success('Profil berhasil diperbarui');
      } else {
        toast.error(result.message || 'Gagal memperbarui profil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Terjadi kesalahan saat memperbarui profil');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  return (
    <div className='container mx-auto px-4 py-6 max-w-4xl'>
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
          <h1 className='text-2xl font-bold text-gray-900'>Profil Saya</h1>
          <p className='text-sm text-gray-500'>Kelola informasi profil Anda</p>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Informasi Profil</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex flex-col items-center justify-center py-4'>
              <Avatar className='w-24 h-24 mb-4'>
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className='text-2xl text-white bg-gradient-to-br from-blue-500 to-purple-600'>
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <h2 className='text-xl font-bold text-gray-900'>{user?.name}</h2>
              <p className='text-sm text-gray-500'>{user?.email}</p>
              {user?.role && (
                <span className='mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800'>
                  {user.role === 'super_admin'
                    ? 'Super Admin'
                    : user.role === 'owner'
                    ? 'Owner'
                    : user.role === 'admin'
                    ? 'Admin'
                    : user.role === 'kasir'
                    ? 'Kasir'
                    : user.role === 'kitchen'
                    ? 'Kitchen'
                    : user.role === 'waiter'
                    ? 'Waiter'
                    : 'Member'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Form */}
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle className='text-lg'>Edit Profil</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name' className='flex items-center gap-2'>
                <User className='w-4 h-4 text-gray-500' />
                Nama Lengkap
              </Label>
              <Input
                id='name'
                type='text'
                value={profileData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder='Masukkan nama lengkap'
                className='w-full'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email' className='flex items-center gap-2'>
                <Mail className='w-4 h-4 text-gray-500' />
                Email
              </Label>
              <Input
                id='email'
                type='email'
                value={profileData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                placeholder='Masukkan email'
                className='w-full'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='phone' className='flex items-center gap-2'>
                <Phone className='w-4 h-4 text-gray-500' />
                Nomor Telepon
              </Label>
              <Input
                id='phone'
                type='tel'
                value={profileData.phone || ''}
                onChange={e => handleInputChange('phone', e.target.value)}
                placeholder='Masukkan nomor telepon'
                className='w-full'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='address'>Alamat</Label>
              <textarea
                id='address'
                value={profileData.address || ''}
                onChange={e => handleInputChange('address', e.target.value)}
                placeholder='Masukkan alamat'
                className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                rows={3}
              />
            </div>

            <div className='flex gap-3 pt-4'>
              <Button
                onClick={handleSave}
                disabled={loading}
                className='flex-1'
              >
                {loading ? (
                  <>
                    <Save className='w-4 h-4 mr-2 animate-spin' />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className='w-4 h-4 mr-2' />
                    Simpan Perubahan
                  </>
                )}
              </Button>
              <Button
                variant='outline'
                onClick={() => navigate('/settings/change-password')}
              >
                Ganti Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
