import { ArrowLeft, Mail, Phone, Save, User, MapPin, Image, CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
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

const CompleteProfilePage = () => {
  const { 
    user, 
    setUser, 
    token, 
    checkProfileStatus: refreshProfileStatus,
    profileComplete: authProfileComplete,
    whatsappVerified: authWhatsappVerified,
    initialLoadComplete,
    hasActiveSubscription: authHasActiveSubscription,
  } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    avatar: '',
    whatsapp_verified: false,
  });

  // ✅ FIX: Use ref to prevent duplicate calls and redirect loops
  const hasCheckedProfile = useRef(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    // ✅ FIX: Wait for initial load to complete before checking
    if (!initialLoadComplete) {
      console.log('⏳ CompleteProfile: Waiting for initial load to complete...');
      return;
    }

    // ✅ FIX: Check profile status from AuthContext first (faster than API call)
    // If profile is already complete, redirect immediately
    // ✅ FIX: Only redirect if BOTH profileComplete AND whatsappVerified are explicitly true
    // Don't redirect if they are null (still checking) or false (incomplete)
    const isProfileComplete = authProfileComplete === true && authWhatsappVerified === true;
    const cachedSubscription = localStorage.getItem('hasActiveSubscription');
    const hasActiveSub = authHasActiveSubscription || cachedSubscription === 'true';
    
    if (isProfileComplete && !hasRedirected.current) {
      console.log('✅ CompleteProfile: Profile already complete from AuthContext, redirecting...', {
        authProfileComplete,
        authWhatsappVerified,
        isProfileComplete,
        authHasActiveSubscription,
        cachedSubscription,
      });
      hasRedirected.current = true;
      
      // ✅ FIX: Use setTimeout to ensure navigation happens after render
      setTimeout(() => {
        // If user has active subscription, go to dashboard
        // Otherwise, go to subscription-plans
        if (hasActiveSub) {
          navigate('/', { replace: true });
        } else {
          navigate('/subscription-plans', { replace: true });
        }
      }, 100);
      return;
    }

    // ✅ FIX: Prevent duplicate profile checks
    if (hasCheckedProfile.current) {
      return;
    }
    hasCheckedProfile.current = true;

    // Check current profile status
    checkProfileStatus();
  }, [token, navigate, initialLoadComplete, authProfileComplete, authWhatsappVerified, authHasActiveSubscription]);

  const checkProfileStatus = async () => {
    try {
      // ✅ FIX: Use apiClient instead of hardcoded URL
      const response = await apiClient.get('/v1/user/profile/check');

      if (response.data) {
        const userData = response.data.user || user;
        // ✅ FIX: Load user's phone from registration if available
        const userPhone = userData.phone || user?.phone || '';
        // ✅ FIX: Check WhatsApp verification from multiple sources
        // 1. whatsapp_verified from API response
        // 2. whatsapp_verified_at from user data (set during registration)
        const isWhatsappVerified = response.data.whatsapp_verified || 
                                   response.data.whatsapp_verified_at || 
                                   userData.whatsapp_verified_at ||
                                   false;
        
        console.log('🔍 Profile check result:', {
          whatsapp_verified: response.data.whatsapp_verified,
          whatsapp_verified_at: response.data.whatsapp_verified_at,
          user_whatsapp_verified_at: userData.whatsapp_verified_at,
          isWhatsappVerified,
          phone: userPhone,
        });
        
        // ✅ FIX: Format phone untuk display (convert 62xxxxxxxxxx ke 0xxxxxxxxxx)
        const formatPhoneForDisplay = (phone) => {
          if (!phone) return '';
          // Jika phone dimulai dengan 62, convert ke 0
          if (phone.startsWith('62')) {
            return '0' + phone.substring(2);
          }
          return phone;
        };
        
        const displayPhone = formatPhoneForDisplay(userPhone);
        
        setProfileData({
          name: userData.name || user?.name || '', // ✅ Load dari registrasi
          email: userData.email || user?.email || '', // ✅ Load dari registrasi
          phone: displayPhone || userPhone, // ✅ Load dari registrasi, format untuk display
          address: userData.address || user?.address || '', // ✅ Load dari registrasi (jika ada)
          avatar: userData.avatar || user?.avatar || '', // ✅ Load dari registrasi (jika ada)
          whatsapp_verified: isWhatsappVerified,
        });
        
        console.log('✅ Profile data loaded from registration:', {
          name: userData.name || user?.name,
          email: userData.email || user?.email,
          phone: displayPhone,
          whatsapp_verified: isWhatsappVerified,
        });

        // ✅ FIX: If phone already verified during registration, mark as verified
        setOtpVerified(isWhatsappVerified);
        
        // ✅ FIX: If phone is already verified, show success message
        if (isWhatsappVerified && userPhone) {
          console.log('✅ WhatsApp already verified during registration:', {
            phone: userPhone,
            verified_at: response.data.whatsapp_verified_at || userData.whatsapp_verified_at,
          });
          // Show toast notification
          toast.success('Nomor WhatsApp sudah diverifikasi saat registrasi');
        }

        // ✅ FIX: Only redirect if profile is complete AND both profile_complete AND whatsapp_verified are true
        // This prevents redirect loop
        const isProfileComplete = response.data.profile_complete && response.data.whatsapp_verified;
        if (isProfileComplete && !hasRedirected.current) {
          console.log('✅ Profile already complete from API, redirecting...', {
            profile_complete: response.data.profile_complete,
            whatsapp_verified: response.data.whatsapp_verified,
            isProfileComplete,
          });
          
          // ✅ FIX: Mark as redirected immediately to prevent duplicate redirects
          hasRedirected.current = true;
          
          // ✅ FIX: Refresh profile status in AuthContext before redirect
          if (refreshProfileStatus) {
            try {
              await refreshProfileStatus();
            } catch (err) {
              console.warn('Failed to refresh profile status, continuing with redirect:', err);
            }
          }
          
          // ✅ FIX: Check subscription status before redirecting
          const cachedSubscription = localStorage.getItem('hasActiveSubscription');
          const hasActiveSub = cachedSubscription === 'true';
          
          // Small delay to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // ✅ FIX: Use setTimeout to ensure navigation happens after render
          setTimeout(() => {
            // If user has active subscription, go to dashboard
            // Otherwise, go to subscription-plans
            if (hasActiveSub) {
              console.log('✅ CompleteProfile: Has active subscription, redirecting to dashboard');
              navigate('/', { replace: true });
            } else {
              console.log('✅ CompleteProfile: No active subscription, redirecting to subscription-plans');
              navigate('/subscription-plans', { replace: true });
            }
          }, 100);
        }
      }
    } catch (err) {
      // ✅ FIX: Ignore CanceledError (duplicate request cancelled)
      if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
        console.log('Profile check cancelled (duplicate), ignoring...');
        return;
      }
      console.error('Error checking profile:', err);
      toast.error('Gagal memuat data profil');
    } finally {
      setChecking(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Reset OTP verification if phone changes
    if (field === 'phone' && otpVerified) {
      setOtpVerified(false);
      setOtpSent(false);
      setOtpCode('');
    }
  };

  const handleSendOTP = async () => {
    if (!profileData.phone || !profileData.phone.trim()) {
      toast.error('Nomor WhatsApp wajib diisi');
      return;
    }

    // Validate phone format
    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
    if (!phoneRegex.test(profileData.phone.trim())) {
      toast.error('Format nomor WhatsApp tidak valid. Gunakan format: 081234567890');
      return;
    }

    setSendingOTP(true);
    try {
      // ✅ FIX: Use apiClient instead of hardcoded URL
      const response = await apiClient.post('/whatsapp/send-otp', {
        phone: profileData.phone.trim(),
      });

      if (response.data.success) {
        setOtpSent(true);
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
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Masukkan kode OTP 6 digit');
      return;
    }

    setVerifyingOTP(true);
    try {
      // ✅ FIX: Use apiClient instead of hardcoded URL
      const response = await apiClient.post('/whatsapp/verify-otp', {
        phone: profileData.phone.trim(),
        code: otpCode.trim(),
      });

      if (response.data.success) {
        setOtpVerified(true);
        setProfileData(prev => ({ ...prev, whatsapp_verified: true }));
        toast.success('Nomor WhatsApp berhasil diverifikasi!');
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

  const handleComplete = async () => {
    // Validation
    if (!profileData.name || !profileData.name.trim()) {
      toast.error('Nama lengkap wajib diisi');
      return;
    }
    if (!profileData.email || !profileData.email.trim()) {
      toast.error('Email wajib diisi');
      return;
    }
    if (!profileData.phone || !profileData.phone.trim()) {
      toast.error('Nomor WhatsApp wajib diisi');
      return;
    }
    if (!profileData.address || !profileData.address.trim()) {
      toast.error('Alamat wajib diisi');
      return;
    }
    // ✅ FIX: If phone is the same as registered and already verified, skip OTP verification
    const phoneAlreadyVerified = profileData.whatsapp_verified || 
                                 (user?.phone === profileData.phone && user?.whatsapp_verified_at);
    
    if (!otpVerified && !phoneAlreadyVerified) {
      toast.error('Nomor WhatsApp harus diverifikasi terlebih dahulu. Silakan kirim dan verifikasi OTP.');
      return;
    }

    setLoading(true);
    try {
      // ✅ FIX: Use apiClient instead of hardcoded URL
      const response = await apiClient.post('/v1/user/profile/complete', {
        name: profileData.name.trim(),
        email: profileData.email.trim(),
        phone: profileData.phone.trim(),
        address: profileData.address.trim(),
        avatar: profileData.avatar || null,
        whatsapp_verified: otpVerified || profileData.whatsapp_verified || phoneAlreadyVerified,
      });

      if (response.data.success) {
        // Update user in context
        if (response.data.user) {
          setUser(response.data.user);
        }
        
        // ✅ FIX: Refresh profile status in AuthContext before redirect
        console.log('✅ Profile completed, refreshing profile status...');
        if (refreshProfileStatus) {
          await refreshProfileStatus();
        }
        
        toast.success('Profil berhasil dilengkapi!');
        
        // ✅ FIX: Small delay to ensure state is updated before redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Redirect to subscription plans
        navigate('/subscription-plans', { replace: true });
      } else {
        toast.error(response.data.message || 'Gagal melengkapi profil');
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.errors?.whatsapp_verified?.[0] ||
        'Terjadi kesalahan saat melengkapi profil';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: Show loading if checking profile OR if waiting for initial load
  if (checking || !initialLoadComplete) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>
            {!initialLoadComplete ? 'Memuat aplikasi...' : 'Memuat data profil...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4'>
      <div className='max-w-2xl mx-auto'>
        {/* Header */}
        <div className='mb-8 text-center'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>
            Lengkapi Profil Owner
          </h1>
          <p className='text-gray-600'>
            Silakan lengkapi informasi profil Anda sebelum memilih paket
            subscription
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Informasi Profil</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name' className='flex items-center gap-2'>
                <User className='w-4 h-4 text-gray-500' />
                Nama Lengkap <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='name'
                type='text'
                value={profileData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder='Masukkan nama lengkap'
                className='w-full'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email' className='flex items-center gap-2'>
                <Mail className='w-4 h-4 text-gray-500' />
                Email <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='email'
                type='email'
                value={profileData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                placeholder='Masukkan email'
                className='w-full'
                required
              />
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
                  value={profileData.phone || ''}
                  onChange={e => handleInputChange('phone', e.target.value)}
                  placeholder='081234567890'
                  className='flex-1'
                  required
                  disabled={otpVerified || profileData.whatsapp_verified}
                />
                {!otpVerified && !profileData.whatsapp_verified && (
                  <Button
                    type='button'
                    onClick={handleSendOTP}
                    disabled={sendingOTP || !profileData.phone}
                    variant='outline'
                    className='whitespace-nowrap'
                  >
                    {sendingOTP ? 'Mengirim...' : 'Kirim OTP'}
                  </Button>
                )}
              </div>

              {/* OTP Verification Section */}
              {otpSent && !otpVerified && !profileData.whatsapp_verified && (
                <div className='mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                  <Label htmlFor='otp' className='text-sm font-medium text-blue-900'>
                    Masukkan Kode OTP (6 digit)
                  </Label>
                  <div className='flex gap-2 mt-2'>
                    <Input
                      id='otp'
                      type='text'
                      value={otpCode}
                      onChange={e => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
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
                    Kode OTP telah dikirim ke WhatsApp Anda. Masukkan 6 digit kode
                    yang diterima.
                  </p>
                </div>
              )}

              {/* Verification Status */}
              {(otpVerified || profileData.whatsapp_verified) ? (
                <p className='text-sm text-green-600 flex items-center gap-1'>
                  <CheckCircle className='w-4 h-4' />
                  Nomor WhatsApp sudah diverifikasi {profileData.whatsapp_verified && !otpVerified ? '(saat registrasi)' : ''}
                </p>
              ) : (
                <p className='text-sm text-red-600 flex items-center gap-1'>
                  <XCircle className='w-4 h-4' />
                  Nomor WhatsApp belum diverifikasi. Klik &quot;Kirim OTP&quot; untuk
                  memverifikasi.
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='address' className='flex items-center gap-2'>
                <MapPin className='w-4 h-4 text-gray-500' />
                Alamat <span className='text-red-500'>*</span>
              </Label>
              <textarea
                id='address'
                value={profileData.address || ''}
                onChange={e => handleInputChange('address', e.target.value)}
                placeholder='Masukkan alamat lengkap'
                className='flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                rows={4}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='avatar' className='flex items-center gap-2'>
                <Image className='w-4 h-4 text-gray-500' />
                Avatar (URL)
              </Label>
              <Input
                id='avatar'
                type='url'
                value={profileData.avatar || ''}
                onChange={e => handleInputChange('avatar', e.target.value)}
                placeholder='https://example.com/avatar.jpg'
                className='w-full'
              />
              <p className='text-xs text-gray-500'>
                Opsional: Masukkan URL gambar untuk avatar Anda
              </p>
            </div>

            <div className='flex gap-3 pt-4'>
              <Button
                onClick={handleComplete}
                disabled={loading || (!otpVerified && !profileData.whatsapp_verified)}
                className='flex-1 bg-blue-600 hover:bg-blue-700'
              >
                {loading ? (
                  <>
                    <Save className='w-4 h-4 mr-2 animate-spin' />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className='w-4 h-4 mr-2' />
                    Lengkapi Profil
                  </>
                )}
              </Button>
              <Button
                variant='outline'
                onClick={() => navigate('/subscription-plans')}
              >
                <ArrowLeft className='w-4 h-4 mr-2' />
                Kembali
              </Button>
            </div>

            {!otpVerified && !profileData.whatsapp_verified && (
              <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                <p className='text-sm text-yellow-800'>
                  <strong>Penting:</strong> Nomor WhatsApp harus diverifikasi
                  sebelum bisa melengkapi profil. Klik tombol &quot;Kirim OTP&quot; di
                  atas untuk memverifikasi nomor WhatsApp Anda.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompleteProfilePage;

