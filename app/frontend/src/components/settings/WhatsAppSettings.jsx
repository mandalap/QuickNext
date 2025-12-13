import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import whatsappService from '../../services/whatsapp.service';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { useToast } from '../ui/toast';

const WhatsAppSettings = ({ outletId, outletName, onSuccess }) => {
  const { toast } = useToast();
  const { currentBusiness } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    whatsapp_provider: 'fonnte',
    whatsapp_api_key: '',
    whatsapp_phone_number: '',
    whatsapp_enabled: false,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');

  // Fetch current config
  const {
    data: configData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['whatsapp-config', outletId],
    queryFn: () => whatsappService.getConfig(outletId),
    enabled: !!outletId,
    staleTime: 0, // Always refetch when outletId changes
    refetchOnMount: true, // Refetch when component mounts
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: data => whatsappService.updateConfig(outletId, data),
    onSuccess: response => {
      toast({
        title: 'Berhasil!',
        description: 'Konfigurasi WhatsApp berhasil diperbarui',
      });
      // ✅ FIX: Invalidate and refetch to get latest data
      queryClient.invalidateQueries(['whatsapp-config', outletId]);
      
      // ✅ FIX: Always update formData with response data to ensure consistency
      if (response.data) {
        setFormData(prev => ({
          ...prev,
          whatsapp_provider: response.data.whatsapp_provider || prev.whatsapp_provider || 'fonnte',
          whatsapp_phone_number: response.data.whatsapp_phone_number || prev.whatsapp_phone_number || '',
          whatsapp_enabled: response.data.whatsapp_enabled ?? prev.whatsapp_enabled ?? false,
        }));
      }
      
      // ✅ FIX: Close modal after successful save
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500); // Small delay to show success toast
      }
    },
    onError: error => {
      toast({
        title: 'Error!',
        description:
          error.response?.data?.message ||
          'Gagal memperbarui konfigurasi WhatsApp',
        variant: 'destructive',
      });
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: phoneNumber =>
      whatsappService.testConnection(outletId, phoneNumber),
    onSuccess: response => {
      // Check if response indicates success
      if (response.success === true) {
        const message = response.message || 'Pesan test berhasil dikirim!';
        toast({
          title: 'Berhasil! ✅',
          description: `${message} Silakan cek WhatsApp Anda di nomor ${testPhoneNumber}.`,
          variant: 'success',
          duration: 6000,
        });
        setShowTestDialog(false);
        setTestPhoneNumber('');
      } else {
        // Response indicates failure
        const errorMsg =
          response.message || response.error || 'Gagal mengirim pesan test';
        toast({
          title: 'Gagal Mengirim Pesan ❌',
          description: `${errorMsg}. Periksa konfigurasi API key, nomor telepon pengirim, dan pastikan provider WhatsApp aktif.`,
          variant: 'destructive',
          duration: 7000,
        });
      }
    },
    onError: error => {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Terjadi kesalahan saat mengirim pesan test';

      let detailedMessage = errorMessage;

      // Add helpful suggestions based on error
      if (
        errorMessage.includes('API key') ||
        errorMessage.includes('api_key')
      ) {
        detailedMessage += '. Pastikan API key sudah benar dan aktif.';
      } else if (
        errorMessage.includes('phone') ||
        errorMessage.includes('nomor')
      ) {
        detailedMessage +=
          '. Pastikan nomor telepon pengirim sudah diisi dan formatnya benar.';
      } else if (
        errorMessage.includes('provider') ||
        errorMessage.includes('Wablitz')
      ) {
        detailedMessage +=
          '. Pastikan provider WhatsApp sudah dikonfigurasi dengan benar.';
      } else {
        detailedMessage +=
          '. Periksa konfigurasi API key, nomor telepon pengirim, dan pastikan provider WhatsApp aktif.';
      }

      toast({
        title: 'Error! ❌',
        description: detailedMessage,
        variant: 'destructive',
        duration: 7000,
      });

      console.error('WhatsApp test error:', {
        error,
        response: error.response?.data,
        status: error.response?.status,
        fullError: error,
      });
    },
  });

  // ✅ FIX: Refetch config when outletId changes
  useEffect(() => {
    if (outletId) {
      refetch();
    }
  }, [outletId, refetch]);

  // Load config when data is fetched
  useEffect(() => {
    // ✅ FIX: Only update formData when we have valid config data
    // Don't reset while loading to avoid showing default values
    if (isLoading) {
      return; // Don't update formData while loading
    }
    
    if (configData?.success && configData.data) {
      const config = configData.data;
      
      // ✅ FIX: Use actual provider from database
      // If provider is null/undefined, use 'fonnte' as default (for new configs)
      // But if provider exists (even if empty string), use it
      const rawProvider = config.whatsapp_provider;
      const newProvider = rawProvider && typeof rawProvider === 'string' && rawProvider.trim() 
        ? rawProvider.trim() 
        : 'fonnte';
      const newPhoneNumber = config.whatsapp_phone_number || '';
      const newEnabled = config.whatsapp_enabled ?? false;
      
      console.log('📝 Loading WhatsApp config:', {
        rawProvider: rawProvider,
        rawProviderType: typeof rawProvider,
        newProvider: newProvider,
        phone: newPhoneNumber,
        enabled: newEnabled,
        fullConfig: config
      });
      
      // ✅ FIX: Always update formData with actual data from database
      setFormData(prev => {
        // Check if we need to update
        if (
          prev.whatsapp_provider !== newProvider ||
          prev.whatsapp_phone_number !== newPhoneNumber ||
          prev.whatsapp_enabled !== newEnabled
        ) {
          console.log('✅ Updating formData with loaded config');
          return {
            whatsapp_provider: newProvider,
            whatsapp_api_key: '', // Don't load API key (it's encrypted)
            whatsapp_phone_number: newPhoneNumber,
            whatsapp_enabled: newEnabled,
          };
        } else {
          console.log('ℹ️ FormData already matches loaded config, skipping update');
        }
        return prev;
      });
    } else if (configData && !configData.success) {
      // Only reset to defaults if we're sure there's an error (not just loading)
      console.warn('⚠️ Failed to load WhatsApp config:', configData);
    }
    // Don't reset to defaults if configData is null (still loading or no data yet)
  }, [configData, isLoading]);

  const handleSubmit = e => {
    e.preventDefault();

    // Validate
    if (
      formData.whatsapp_enabled &&
      !formData.whatsapp_api_key &&
      !configData?.data?.has_api_key
    ) {
      toast({
        title: 'Error!',
        description: 'API Key wajib diisi jika WhatsApp diaktifkan',
        variant: 'destructive',
      });
      return;
    }

    // Validate phone number for Wablitz
    if (
      formData.whatsapp_provider === 'wablitz' &&
      formData.whatsapp_enabled &&
      !formData.whatsapp_phone_number &&
      !configData?.data?.whatsapp_phone_number
    ) {
      toast({
        title: 'Error!',
        description: 'Nomor telepon pengirim wajib diisi untuk Wablitz',
        variant: 'destructive',
      });
      return;
    }

    // ✅ FIX: Always send whatsapp_provider, ensure it's not empty
    const providerToSend = formData.whatsapp_provider || 'fonnte';
    
    updateMutation.mutate({
      whatsapp_provider: providerToSend, // Always send provider
      whatsapp_api_key: formData.whatsapp_api_key || undefined, // Only send if provided
      whatsapp_phone_number: formData.whatsapp_phone_number || undefined,
      whatsapp_enabled: formData.whatsapp_enabled,
    });
  };

  const providerInfo = {
    fonnte: {
      name: 'Fonnte',
      url: 'https://fonnte.com',
      description: 'Layanan WhatsApp API yang mudah dan terjangkau',
    },
    wablas: {
      name: 'Wablas',
      url: 'https://wablas.com',
      description: 'Platform WhatsApp API untuk bisnis',
    },
    kirimwa: {
      name: 'KirimWA',
      url: 'https://kirimwa.id',
      description: 'Layanan pengiriman pesan WhatsApp',
    },
    wablitz: {
      name: 'Wablitz',
      url: 'https://wablitz.web.id',
      description:
        'Layanan WhatsApp API dengan format api_key, sender, number, message',
    },
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className='pt-6'>
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='w-6 h-6 animate-spin text-gray-400' />
            <span className='ml-2 text-gray-600'>Memuat konfigurasi...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className='pt-6'>
          <div className='flex items-center justify-center py-8 text-red-600'>
            <AlertCircle className='w-6 h-6 mr-2' />
            <span>Gagal memuat konfigurasi WhatsApp</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='w-full max-w-3xl mx-auto'>
      <CardHeader className='pb-3 px-4 sm:px-6'>
        <div className='flex items-center justify-between flex-wrap gap-2'>
          <div className='flex-1 min-w-0'>
            <CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
              <MessageSquare className='w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0' />
              <span className='truncate'>Konfigurasi WhatsApp</span>
            </CardTitle>
            <CardDescription className='text-xs sm:text-sm mt-1'>
              {outletName && (
                <span className='truncate block'>Outlet: {outletName}</span>
              )}
              {!outletName &&
                'Atur API key WhatsApp untuk mengirim notifikasi otomatis'}
            </CardDescription>
          </div>
          {configData?.data?.has_api_key && (
            <div className='flex items-center gap-1.5 text-xs sm:text-sm text-green-600 flex-shrink-0'>
              <CheckCircle2 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
              <span className='whitespace-nowrap'>API Key Terkonfigurasi</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className='pt-0 px-4 sm:px-6 pb-4 sm:pb-6'>
        <form onSubmit={handleSubmit} className='space-y-3 sm:space-y-4'>
          {/* Enable/Disable Switch */}
          <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
            <div className='flex-1'>
              <Label htmlFor='whatsapp_enabled' className='text-sm font-medium'>
                Aktifkan Notifikasi WhatsApp
              </Label>
              <p className='text-xs text-gray-600 mt-0.5'>
                Kirim struk pembayaran otomatis ke pelanggan via WhatsApp
              </p>
            </div>
            <Switch
              id='whatsapp_enabled'
              checked={formData.whatsapp_enabled}
              onCheckedChange={checked =>
                setFormData(prev => ({ ...prev, whatsapp_enabled: checked }))
              }
            />
          </div>

          {/* Provider Selection */}
          <div className='space-y-1.5'>
            <Label htmlFor='whatsapp_provider' className='text-sm'>
              Provider WhatsApp
            </Label>
            <Select
              key={`provider-select-${formData.whatsapp_provider || 'default'}`} // ✅ FIX: Force re-render when provider changes
              value={formData.whatsapp_provider || 'fonnte'}
              onValueChange={value => {
                console.log('🔧 Provider changed:', value);
                setFormData(prev => ({ ...prev, whatsapp_provider: value }));
              }}
            >
              <SelectTrigger id='whatsapp_provider' className='text-sm'>
                <SelectValue placeholder={isLoading ? 'Memuat...' : 'Pilih provider'}>
                  {providerInfo[formData.whatsapp_provider]?.name || 'Pilih provider'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(providerInfo).map(([key, info]) => (
                  <SelectItem key={key} value={key} className='text-sm'>
                    <div className='flex items-center justify-between w-full'>
                      <span>{info.name}</span>
                      <a
                        href={info.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={e => e.stopPropagation()}
                        className='ml-2 text-blue-600 hover:underline'
                      >
                        <ExternalLink className='w-3 h-3' />
                      </a>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-xs text-gray-500'>
              {providerInfo[formData.whatsapp_provider]?.description}
            </p>
          </div>

          {/* API Key Input */}
          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='whatsapp_api_key' className='text-sm'>
                API Key
              </Label>
              {configData?.data?.has_api_key && (
                <span className='text-xs text-gray-500'>
                  Preview: {configData.data.api_key_preview || '***'}
                </span>
              )}
            </div>
            <div className='relative'>
              <Input
                id='whatsapp_api_key'
                type={showApiKey ? 'text' : 'password'}
                value={formData.whatsapp_api_key}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    whatsapp_api_key: e.target.value,
                  }))
                }
                placeholder={
                  configData?.data?.has_api_key
                    ? 'Kosongkan jika tidak ingin mengubah API key'
                    : 'Masukkan API key dari provider'
                }
                className='pr-10 text-sm'
              />
              <button
                type='button'
                onClick={() => setShowApiKey(!showApiKey)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700'
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
            </div>
            <p className='text-xs text-gray-500'>
              {configData?.data?.has_api_key
                ? 'Kosongkan field ini jika tidak ingin mengubah API key yang sudah ada'
                : 'Dapatkan API key dari dashboard provider Anda setelah scan QR code'}
            </p>
          </div>

          {/* Phone Number Input */}
          <div className='space-y-1.5'>
            <Label htmlFor='whatsapp_phone_number' className='text-sm'>
              Nomor Telepon WhatsApp (Pengirim)
            </Label>
            <Input
              id='whatsapp_phone_number'
              type='tel'
              value={formData.whatsapp_phone_number}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  whatsapp_phone_number: e.target.value,
                }))
              }
              placeholder='6281234567890'
              className='text-sm'
            />
            <p className='text-xs text-gray-500'>
              Format: 6281234567890 (tanpa +, spasi, atau tanda hubung)
            </p>
          </div>

          {/* Info Box */}
          <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg'>
            <h4 className='font-medium text-blue-900 mb-1.5 text-sm'>
              Cara Mendapatkan API Key:
            </h4>
            <ol className='list-decimal list-inside space-y-0.5 text-xs text-blue-800'>
              <li>
                Daftar di {providerInfo[formData.whatsapp_provider]?.name}
              </li>
              <li>
                Buat device baru dan scan QR code dengan WhatsApp Business
              </li>
              <li>Copy API key dari dashboard</li>
              <li>Paste API key di field di atas</li>
            </ol>
            <a
              href={providerInfo[formData.whatsapp_provider]?.url}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline'
            >
              Kunjungi {providerInfo[formData.whatsapp_provider]?.name}
              <ExternalLink className='w-3 h-3' />
            </a>
          </div>

          {/* Submit Button */}
          <div className='flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-3 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setShowTestDialog(true)}
              disabled={
                (!configData?.data?.has_api_key &&
                  !formData.whatsapp_api_key?.trim()) ||
                updateMutation.isPending
              }
              className='text-blue-600 border-blue-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full sm:w-auto'
            >
              <Send className='w-4 h-4 mr-2' />
              Test Pengiriman
            </Button>
            <div className='flex gap-2 sm:gap-3 w-full sm:w-auto'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  // Reset form
                  if (configData?.success && configData.data) {
                    const config = configData.data;
                    setFormData({
                      whatsapp_provider: config.whatsapp_provider || 'fonnte',
                      whatsapp_api_key: '',
                      whatsapp_phone_number: config.whatsapp_phone_number || '',
                      whatsapp_enabled: config.whatsapp_enabled ?? false,
                    });
                  }
                }}
                className='text-sm flex-1 sm:flex-none'
              >
                Reset
              </Button>
              <Button
                type='submit'
                disabled={updateMutation.isPending}
                className='text-sm flex-1 sm:flex-none'
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Konfigurasi'
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center'>
              <Send className='w-5 h-5 mr-2 text-blue-600' />
              Test Pengiriman WhatsApp
            </DialogTitle>
            <DialogDescription>
              Masukkan nomor WhatsApp tujuan untuk mengirim pesan test. Pastikan
              nomor sudah terdaftar di WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='test_phone'>Nomor WhatsApp Tujuan</Label>
              <Input
                id='test_phone'
                type='tel'
                value={testPhoneNumber}
                onChange={e => setTestPhoneNumber(e.target.value)}
                placeholder='6281234567890'
              />
              <p className='text-xs text-gray-500'>
                Format: 6281234567890 (tanpa +, spasi, atau tanda hubung)
              </p>
            </div>
            <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg'>
              <p className='text-sm text-blue-800'>
                <strong>Pesan yang akan dikirim:</strong>
              </p>
              <p className='text-sm text-blue-700 mt-1'>
                🧪 <strong>Test Message dari quickKasir</strong>
                <br />
                <br />
                Ini adalah pesan test untuk memverifikasi konfigurasi WhatsApp
                Anda.
                <br />
                <br />
                Jika Anda menerima pesan ini, berarti konfigurasi WhatsApp sudah
                benar! ✅
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowTestDialog(false);
                setTestPhoneNumber('');
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!testPhoneNumber.trim()) {
                  toast({
                    title: 'Error!',
                    description: 'Nomor WhatsApp wajib diisi',
                    variant: 'destructive',
                  });
                  return;
                }

                // Format phone number before sending
                let formattedPhone = testPhoneNumber
                  .trim()
                  .replace(/[^0-9]/g, '');
                if (formattedPhone.startsWith('0')) {
                  formattedPhone = '62' + formattedPhone.substring(1);
                } else if (!formattedPhone.startsWith('62')) {
                  formattedPhone = '62' + formattedPhone;
                }

                testMutation.mutate(formattedPhone);
              }}
              disabled={testMutation.isPending || !testPhoneNumber.trim()}
              className='bg-blue-600 hover:bg-blue-700'
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Mengirim Pesan...
                </>
              ) : (
                <>
                  <Send className='w-4 h-4 mr-2' />
                  Kirim Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WhatsAppSettings;
