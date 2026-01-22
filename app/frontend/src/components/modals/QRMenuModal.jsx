import { Download, Edit, Eye, Loader2, QrCode, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import selfServiceApi from '../../services/selfServiceApi';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

const QRMenuModal = ({ isOpen, onClose, qrMenu, onEdit, onDelete }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isViewing, setIsViewing] = useState(false);

  const handleDownload = async () => {
    if (!qrMenu) return;

    setIsDownloading(true);
    try {
      const blob = await selfServiceApi.generateQRCode(qrMenu.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // QR code is now in SVG format
      const filename = `qr-${qrMenu.outlet || 'outlet'}-${qrMenu.name}-${qrMenu.qr_code}.svg`;
      link.download = filename.replace(/[^A-Za-z0-9\-_.]/g, '-');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Gagal download QR code. Pastikan Anda sudah login.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleView = () => {
    if (qrMenu?.url) {
      window.open(qrMenu.url, '_blank');
    }
  };

  const getStatusBadge = status => {
    const statusConfig = {
      active: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Aktif',
      },
      inactive: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Nonaktif',
      },
      maintenance: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'Maintenance',
      },
    };

    const config = statusConfig[status] || statusConfig.active;

    return (
      <Badge className={`${config.color} border font-medium`}>
        {config.label}
      </Badge>
    );
  };

  if (!qrMenu) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Detail QR Menu</DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          {/* QR Code Preview */}
          <div className='text-center'>
            <div className='w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white mx-auto mb-4'>
              <QrCode className='w-16 h-16' />
            </div>
            <p className='text-sm text-gray-600 font-mono'>{qrMenu.qr_code}</p>
          </div>

          {/* QR Menu Info */}
          <div className='space-y-4'>
            <div>
              <h3 className='font-semibold text-lg text-gray-900'>
                {qrMenu.name}
              </h3>
              <p className='text-gray-600'>{qrMenu.table_number}</p>
              <p className='text-sm text-gray-500'>{qrMenu.outlet}</p>
            </div>

            {/* Statistics */}
            <div className='grid grid-cols-4 gap-4'>
              <div className='text-center'>
                <p className='text-2xl font-bold text-blue-600'>
                  {qrMenu.scans || 0}
                </p>
                <p className='text-sm text-gray-600'>Total Scan</p>
              </div>
              <div className='text-center'>
                <p className='text-2xl font-bold text-green-600'>
                  {qrMenu.orders || 0}
                </p>
                <p className='text-sm text-gray-600'>Pesanan</p>
              </div>
              <div className='text-center'>
                <p className='text-sm text-gray-600'>Conversion</p>
                <p className='text-lg font-bold text-purple-600'>
                  {qrMenu.conversion !== undefined
                    ? qrMenu.conversion.toFixed(1)
                    : qrMenu.scans > 0
                    ? ((qrMenu.orders / qrMenu.scans) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              {/* ✅ NEW: Jumlah Orang */}
              <div className='text-center'>
                <p className='text-2xl font-bold text-orange-600'>
                  {qrMenu.total_people || 0}
                </p>
                <p className='text-sm text-gray-600'>Jumlah Orang</p>
              </div>
            </div>

            {/* Status and Last Scan */}
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <span className='text-sm text-gray-600'>Status:</span>
                {getStatusBadge(qrMenu.status)}
              </div>
              <div className='text-sm text-gray-500'>
                Scan terakhir: {qrMenu.last_scan}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex space-x-2'>
            <Button
              variant='outline'
              onClick={handleDownload}
              disabled={isDownloading}
              className='flex-1'
            >
              {isDownloading ? (
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
              ) : (
                <Download className='w-4 h-4 mr-2' />
              )}
              Download QR
            </Button>
            <Button
              variant='outline'
              onClick={handleView}
              disabled={isViewing}
              className='flex-1'
            >
              <Eye className='w-4 h-4 mr-2' />
              Preview
            </Button>
            <Button
              variant='outline'
              onClick={() => onEdit?.(qrMenu)}
              className='px-3'
            >
              <Edit className='w-4 h-4' />
            </Button>
            <Button
              variant='outline'
              onClick={() => onDelete?.(qrMenu)}
              className='px-3 text-red-600 hover:text-red-700'
            >
              <Trash2 className='w-4 h-4' />
            </Button>
          </div>

          {/* URL Info */}
          <div className='bg-gray-50 p-3 rounded'>
            <p className='text-sm text-gray-600 mb-1'>URL Menu:</p>
            <p className='text-xs text-gray-500 font-mono break-all'>
              {qrMenu.url}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRMenuModal;
