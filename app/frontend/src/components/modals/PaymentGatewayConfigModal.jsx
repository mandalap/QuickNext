import { useState, useEffect } from 'react';
import { CreditCard, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import outletService from '../../services/outlet.service';

/**
 * Payment Gateway Configuration Modal
 * Allows users to configure Midtrans (or other payment gateways) for each outlet
 *
 * @param {boolean} open - Whether the modal is open
 * @param {function} onClose - Callback when modal closes
 * @param {object} outlet - The outlet to configure
 * @param {function} onSuccess - Callback on successful save
 */
const PaymentGatewayConfigModal = ({ open, onClose, outlet, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [showServerKey, setShowServerKey] = useState(false);
  const [showClientKey, setShowClientKey] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    gateway: 'midtrans',
    server_key: '',
    client_key: '',
    is_production: false,
    is_sanitized: true,
    is_3ds: true,
    enabled: true,
    hasExistingConfig: false, // Track if config already exists
    hasServerKey: false, // Track if server key exists in database
  });

  // Load existing config when modal opens
  useEffect(() => {
    if (open && outlet) {
      loadConfig();
    }
  }, [open, outlet]);

  const loadConfig = async () => {
    setLoadingConfig(true);
    setError(null);

    try {
      const result = await outletService.getPaymentGatewayConfig(outlet.id, 'midtrans');

      if (result.success && result.data.config) {
        setFormData({
          gateway: 'midtrans',
          server_key: '', // Don't prefill for security
          client_key: result.data.config.client_key || '',
          is_production: result.data.config.is_production || false,
          is_sanitized: result.data.config.is_sanitized !== undefined ? result.data.config.is_sanitized : true,
          is_3ds: result.data.config.is_3ds !== undefined ? result.data.config.is_3ds : true,
          enabled: result.data.config.enabled !== undefined ? result.data.config.enabled : true,
          hasExistingConfig: true, // Mark that config already exists
          hasServerKey: result.data.config.has_server_key || false, // Track if server key exists
        });
      } else {
        // No existing config
        setFormData(prev => ({
          ...prev,
          hasExistingConfig: false,
          hasServerKey: false,
        }));
      }
    } catch (err) {
      console.error('Error loading config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
    setSuccess(false);
  };

  const validateForm = () => {
    // Check if this is a new config (no existing config) or update (has existing config)
    const isNewConfig = !formData.hasExistingConfig;
    
    // Server key is only required for new configs
    if (isNewConfig && (!formData.server_key || formData.server_key.trim() === '')) {
      setError('Server Key wajib diisi untuk konfigurasi baru');
      return false;
    }
    
    // If server key is provided, validate its length
    if (formData.server_key && formData.server_key.trim() !== '' && formData.server_key.trim().length < 10) {
      setError('Server Key terlalu pendek');
      return false;
    }
    
    if (!formData.client_key || formData.client_key.trim() === '') {
      setError('Client Key wajib diisi');
      return false;
    }
    if (formData.client_key.trim().length < 10) {
      setError('Client Key terlalu pendek');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await outletService.updatePaymentGatewayConfig(outlet.id, formData);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 1500);
      } else {
        if (typeof result.error === 'object') {
          // Handle validation errors
          const errorMessages = Object.values(result.error).flat();
          setError(errorMessages.join(', '));
        } else {
          setError(result.error || 'Gagal menyimpan konfigurasi');
        }
      }
    } catch (err) {
      console.error('Error saving config:', err);
      setError('Terjadi kesalahan saat menyimpan konfigurasi');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        gateway: 'midtrans',
        server_key: '',
        client_key: '',
        is_production: false,
        is_sanitized: true,
        is_3ds: true,
        enabled: true,
        hasExistingConfig: false,
        hasServerKey: false,
      });
      setError(null);
      setSuccess(false);
      setShowServerKey(false);
      setShowClientKey(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-2xl max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <CreditCard className='h-5 w-5' />
            Konfigurasi Payment Gateway
          </DialogTitle>
          <DialogDescription>
            Atur konfigurasi Midtrans untuk outlet <strong>{outlet?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {loadingConfig ? (
          <div className='py-8 text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
            <p className='text-sm text-gray-500 mt-2'>Memuat konfigurasi...</p>
          </div>
        ) : (
          <div className='space-y-4 overflow-y-auto flex-1 pr-2'>
            {/* Success Message */}
            {success && (
              <Alert className='bg-green-50 border-green-200'>
                <CheckCircle2 className='h-4 w-4 text-green-600' />
                <AlertDescription className='text-green-800'>
                  Konfigurasi berhasil disimpan!
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant='destructive'>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Gateway Selection (for future expansion) */}
            <div>
              <Label>Payment Gateway</Label>
              <div className='mt-2 p-3 bg-gray-50 rounded-md flex items-center gap-2'>
                <CreditCard className='h-5 w-5 text-blue-600' />
                <span className='font-medium'>Midtrans</span>
                <span className='text-xs text-gray-500 ml-auto'>
                  (Sandbox & Production supported)
                </span>
              </div>
            </div>

            {/* Server Key */}
            <div>
              <Label htmlFor='server_key'>Server Key *</Label>
              <div className='relative mt-1'>
                <Input
                  id='server_key'
                  type={showServerKey ? 'text' : 'password'}
                  value={formData.server_key}
                  onChange={(e) => handleInputChange('server_key', e.target.value)}
                  placeholder='SB-Mid-server-XXXXX atau Mid-server-XXXXX'
                  className='pr-10'
                  disabled={loading}
                />
                <button
                  type='button'
                  onClick={() => setShowServerKey(!showServerKey)}
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700'
                  disabled={loading}
                >
                  {showServerKey ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              </div>
              <p className='text-xs text-gray-500 mt-1'>
                Server Key dari Midtrans Dashboard{' '}
                {formData.is_production
                  ? '(Production)'
                  : '(Sandbox - dimulai dengan SB-Mid-)'}
                {' '}(akan dienkripsi)
                {formData.hasServerKey && !formData.server_key && (
                  <span className='block text-yellow-600 mt-1 font-medium'>
                    ⚠️ Server Key sudah tersimpan. Kosongkan jika tidak ingin mengubah.
                  </span>
                )}
              </p>
            </div>

            {/* Client Key */}
            <div>
              <Label htmlFor='client_key'>Client Key *</Label>
              <div className='relative mt-1'>
                <Input
                  id='client_key'
                  type={showClientKey ? 'text' : 'password'}
                  value={formData.client_key}
                  onChange={(e) => handleInputChange('client_key', e.target.value)}
                  placeholder={
                    formData.is_production
                      ? 'Mid-client-XXXXX (Production)'
                      : 'SB-Mid-client-XXXXX (Sandbox)'
                  }
                  className='pr-10'
                  disabled={loading}
                />
                <button
                  type='button'
                  onClick={() => setShowClientKey(!showClientKey)}
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700'
                  disabled={loading}
                >
                  {showClientKey ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              </div>
              <p className='text-xs text-gray-500 mt-1'>
                Client Key dari Midtrans Dashboard{' '}
                {formData.is_production
                  ? '(Production)'
                  : '(Sandbox - dimulai dengan SB-Mid-)'}
              </p>
            </div>

            {/* Environment Selection: Sandbox or Production */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <div>
                  <Label className='text-sm font-medium block'>
                    Environment Mode
                  </Label>
                  <p className='text-xs text-gray-500 mt-0.5'>
                    {formData.is_production
                      ? 'Menggunakan akun Midtrans Production'
                      : 'Menggunakan akun Midtrans Sandbox (Testing)'}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <span
                    className={`text-xs font-medium ${
                      !formData.is_production
                        ? 'text-yellow-700'
                        : 'text-gray-400'
                    }`}
                  >
                    Sandbox
                  </span>
                  <Switch
                    checked={formData.is_production}
                    onCheckedChange={(checked) =>
                      handleInputChange('is_production', checked)
                    }
                    disabled={loading}
                  />
                  <span
                    className={`text-xs font-medium ${
                      formData.is_production
                        ? 'text-green-700'
                        : 'text-gray-400'
                    }`}
                  >
                    Production
                  </span>
                </div>
              </div>
              <div className='mt-2 space-y-1'>
                {formData.is_production ? (
                  <div className='p-2 bg-green-50 border border-green-200 rounded-md'>
                    <p className='text-xs text-green-700'>
                      <strong>Production Mode:</strong> Menggunakan akun Midtrans Production.
                      Transaksi akan menggunakan uang asli. Pastikan credentials yang diisi
                      adalah dari akun Production.
                    </p>
                  </div>
                ) : (
                  <div className='p-2 bg-yellow-50 border border-yellow-200 rounded-md'>
                    <p className='text-xs text-yellow-700'>
                      <strong>Sandbox Mode:</strong> Mode uji coba untuk testing. Transaksi
                      tidak menggunakan uang asli. Gunakan credentials dari akun Sandbox
                      (dimulai dengan SB-Mid-).
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Settings */}
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label htmlFor='is_sanitized'>Sanitized Input</Label>
                  <p className='text-xs text-gray-500'>
                    Enable input sanitization (recommended)
                  </p>
                </div>
                <Switch
                  id='is_sanitized'
                  checked={formData.is_sanitized !== false}
                  onCheckedChange={(checked) =>
                    handleInputChange('is_sanitized', checked)
                  }
                  disabled={loading}
                />
              </div>

              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label htmlFor='is_3ds'>3D Secure</Label>
                  <p className='text-xs text-gray-500'>
                    Enable 3D Secure authentication (recommended)
                  </p>
                </div>
                <Switch
                  id='is_3ds'
                  checked={formData.is_3ds !== false}
                  onCheckedChange={(checked) =>
                    handleInputChange('is_3ds', checked)
                  }
                  disabled={loading}
                />
              </div>

              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label htmlFor='enabled'>Aktifkan Payment Gateway</Label>
                  <p className='text-xs text-gray-500'>
                    Nonaktifkan jika tidak ingin menerima pembayaran digital
                  </p>
                </div>
                <Switch
                  id='enabled'
                  checked={formData.enabled}
                  onCheckedChange={(checked) =>
                    handleInputChange('enabled', checked)
                  }
                  disabled={loading}
                />
              </div>
            </div>

            {/* Info Box */}
            <Alert>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                <strong>Tips Keamanan:</strong>
                <ul className='text-xs mt-2 space-y-1 list-disc list-inside'>
                  <li>Server Key akan dienkripsi sebelum disimpan</li>
                  <li>Gunakan Sandbox (SB-) untuk testing, Production untuk live</li>
                  <li>Jangan bagikan credentials ini kepada siapapun</li>
                  <li>Dapatkan credentials dari <a href='https://dashboard.midtrans.com' target='_blank' rel='noopener noreferrer' className='text-blue-600 underline'>Midtrans Dashboard</a></li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className='flex-shrink-0 mt-4'>
          <Button
            variant='outline'
            onClick={handleClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || loadingConfig || success}
          >
            {loading ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                Menyimpan...
              </>
            ) : (
              'Simpan Konfigurasi'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentGatewayConfigModal;
