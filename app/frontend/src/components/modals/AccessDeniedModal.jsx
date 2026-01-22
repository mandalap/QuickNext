import { X, Lock, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const AccessDeniedModal = ({ isOpen, open, onClose, feature, requiredPlan = 'Professional' }) => {
  const navigate = useNavigate();
  
  // ✅ FIX: Support both isOpen and open props for compatibility
  const modalOpen = isOpen !== undefined ? isOpen : open;

  const handleUpgrade = () => {
    onClose();
    navigate('/subscription-settings');
  };

  const getFeatureMessage = () => {
    switch (feature) {
      case 'advanced_reports':
        return {
          title: 'Akses Laporan Advanced Dibatasi',
          description: 'Fitur laporan advanced memerlukan paket Professional atau lebih tinggi untuk mengakses semua jenis laporan dan analisis mendalam.',
        };
      case 'online_integration':
        return {
          title: 'Akses Integrasi Online Dibatasi',
          description: 'Fitur integrasi online (WhatsApp, dll) memerlukan paket Professional atau lebih tinggi untuk mengaktifkan integrasi dengan platform eksternal.',
        };
      case 'payment_gateway':
        return {
          title: 'Akses Payment Gateway Dibatasi',
          description: 'Fitur konfigurasi Payment Gateway memerlukan paket Professional atau lebih tinggi untuk mengaktifkan integrasi dengan payment gateway.',
        };
      case 'whatsapp_config':
        return {
          title: 'Akses Konfigurasi WhatsApp Dibatasi',
          description: 'Fitur konfigurasi WhatsApp memerlukan paket Professional atau lebih tinggi untuk mengaktifkan integrasi WhatsApp dan mengirim notifikasi otomatis.',
        };
      case 'kitchen':
        return {
          title: 'Akses Dapur Dibatasi',
          description: 'Fitur Dapur memerlukan paket Premium untuk mengakses modul manajemen dapur dan pesanan.',
        };
      case 'tables':
        return {
          title: 'Akses Meja Dibatasi',
          description: 'Fitur Meja memerlukan paket Premium untuk mengakses modul manajemen meja dan pesanan.',
        };
      case 'attendance':
        return {
          title: 'Akses Absensi Dibatasi',
          description: 'Fitur Absensi memerlukan paket Premium untuk mengakses modul absensi dan kehadiran karyawan.',
        };
      case 'inventory':
        return {
          title: 'Akses Bahan & Resep Dibatasi',
          description: 'Fitur Bahan & Resep memerlukan paket Premium untuk mengakses modul manajemen bahan baku dan resep.',
        };
      case 'promo':
        return {
          title: 'Akses Diskon & Promo Dibatasi',
          description: 'Fitur Diskon & Promo memerlukan paket Premium untuk mengakses modul manajemen diskon dan promosi.',
        };
      case 'stock_transfer':
        return {
          title: 'Akses Transfer Stok Dibatasi',
          description: 'Fitur Transfer Stok memerlukan paket Premium untuk mengakses modul transfer stok antar outlet.',
        };
      default:
        return {
          title: 'Akses Dibatasi',
          description: 'Fitur ini memerlukan paket yang lebih tinggi untuk diakses.',
        };
    }
  };

  const message = getFeatureMessage();

  return (
    <Dialog open={modalOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-gray-900">
            {message.title}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 mt-2">
            {message.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Crown className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Upgrade ke Paket {requiredPlan}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Dapatkan akses penuh ke semua fitur advanced dengan paket {requiredPlan} atau lebih tinggi.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Tutup
            </Button>
            <Button
              onClick={handleUpgrade}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Upgrade Sekarang
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccessDeniedModal;

