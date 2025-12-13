import { Bell, BellOff, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePushNotification } from '../../hooks/usePushNotification';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

const PushNotificationSettings = () => {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
  } = usePushNotification();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const success = await subscribe();
      if (success) {
        toast.success('Push notification berhasil diaktifkan');
      } else {
        toast.error('Gagal mengaktifkan push notification');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Terjadi kesalahan saat mengaktifkan push notification');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsProcessing(true);
    try {
      const success = await unsubscribe();
      if (success) {
        toast.success('Push notification berhasil dinonaktifkan');
      } else {
        toast.error('Gagal menonaktifkan push notification');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Terjadi kesalahan saat menonaktifkan push notification');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestPermission = async () => {
    setIsProcessing(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        toast.success('Izin notifikasi diberikan');
        // Auto subscribe after permission granted
        await handleSubscribe();
      } else {
        toast.warning('Izin notifikasi ditolak');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Terjadi kesalahan saat meminta izin');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Pengaturan notifikasi push untuk PWA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Push notifications tidak didukung di browser/perangkat ini.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Bell className='w-5 h-5' />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Terima notifikasi real-time untuk order baru, pembayaran, dan update
          penting
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Permission Status */}
        <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
          <div className='flex items-center gap-2'>
            {permission === 'granted' ? (
              <CheckCircle className='w-5 h-5 text-green-600' />
            ) : (
              <XCircle className='w-5 h-5 text-gray-400' />
            )}
            <span className='font-medium'>
              Izin Notifikasi:{' '}
              {permission === 'granted' ? 'Diberikan' : 'Belum Diberikan'}
            </span>
          </div>
        </div>

        {/* Subscription Status */}
        <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
          <div className='flex items-center gap-2'>
            {isSubscribed ? (
              <CheckCircle className='w-5 h-5 text-green-600' />
            ) : (
              <XCircle className='w-5 h-5 text-gray-400' />
            )}
            <span className='font-medium'>
              Status: {isSubscribed ? 'Aktif' : 'Tidak Aktif'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className='flex gap-2'>
          {permission !== 'granted' ? (
            <Button
              onClick={handleRequestPermission}
              disabled={isProcessing || isLoading}
              className='flex-1'
            >
              {isProcessing || isLoading ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Memproses...
                </>
              ) : (
                <>
                  <Bell className='w-4 h-4 mr-2' />
                  Minta Izin Notifikasi
                </>
              )}
            </Button>
          ) : isSubscribed ? (
            <Button
              onClick={handleUnsubscribe}
              disabled={isProcessing || isLoading}
              variant='destructive'
              className='flex-1'
            >
              {isProcessing || isLoading ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Memproses...
                </>
              ) : (
                <>
                  <BellOff className='w-4 h-4 mr-2' />
                  Nonaktifkan Notifikasi
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing || isLoading}
              className='flex-1'
            >
              {isProcessing || isLoading ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Memproses...
                </>
              ) : (
                <>
                  <Bell className='w-4 h-4 mr-2' />
                  Aktifkan Notifikasi
                </>
              )}
            </Button>
          )}
        </div>

        {/* Info */}
        <Alert>
          <AlertDescription className='text-sm'>
            <strong>Catatan:</strong> Notifikasi push memerlukan koneksi
            internet dan hanya bekerja saat aplikasi diinstall sebagai PWA.
            Pastikan browser mendukung Service Worker dan Push API.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default PushNotificationSettings;
