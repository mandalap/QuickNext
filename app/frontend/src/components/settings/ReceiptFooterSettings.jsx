import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Receipt, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { settingsService } from '../../services/settings.service';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/toast';

function ReceiptFooterSettings({ outletId, outletName }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [footerMessage, setFooterMessage] = useState('');

  // Fetch current footer message
  const {
    data: footerData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['receiptFooterMessage', outletId],
    queryFn: async () => {
      const response = await settingsService.getReceiptFooterMessage(outletId);
      if (response.success) {
        return response.data || { footer_message: '' };
      }
      // Return empty message if error (don't throw, just return default)
      console.warn('Failed to load footer message:', response.message || response.error);
      return { footer_message: '' };
    },
    enabled: !!outletId,
    retry: 1,
  });

  // Update footer message mutation
  const updateMutation = useMutation({
    mutationFn: async (message) => {
      if (!outletId) {
        throw new Error('Outlet ID tidak ditemukan');
      }
      
      const response = await settingsService.updateReceiptFooterMessage(message, outletId);
      
      if (!response.success) {
        const errorMsg = response.message || 
                        response.error || 
                        'Gagal memperbarui footer message';
        throw new Error(errorMsg);
      }
      
      return response.data || response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['receiptFooterMessage', outletId]);
      toast({
        title: 'Berhasil',
        description: 'Custom footer message berhasil diperbarui',
        variant: 'success',
      });
    },
    onError: (error) => {
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          error?.error ||
                          'Gagal memperbarui footer message';
      toast({
        title: 'Gagal',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Error updating receipt footer:', error);
    },
  });

  // Set initial value when data is loaded
  useEffect(() => {
    if (footerData?.footer_message !== undefined) {
      setFooterMessage(footerData.footer_message || '');
    }
  }, [footerData]);

  const handleSave = () => {
    updateMutation.mutate(footerMessage);
  };

  const handleReset = () => {
    setFooterMessage('');
    updateMutation.mutate('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Custom Footer Struk
          </CardTitle>
          <CardDescription>
            Atur pesan custom yang akan ditampilkan di bawah struk pembayaran
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Custom Footer Struk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            <p>Gagal memuat data: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Custom Footer Struk
        </CardTitle>
        <CardDescription>
          Atur pesan custom yang akan ditampilkan di bawah struk pembayaran untuk{' '}
          <strong>{outletName || 'Outlet'}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="footer-message">
            Pesan Footer (Opsional)
          </Label>
          <Textarea
            id="footer-message"
            placeholder="Contoh:&#10;Terima kasih dan password wifi&#10;----------------------------------&#10;Min. pembelian 100k bisa cobain menu favorit"
            value={footerMessage}
            onChange={(e) => setFooterMessage(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            Pesan ini akan ditampilkan di bawah struk pembayaran. Kosongkan untuk menggunakan pesan default.
            Gunakan baris baru untuk membuat beberapa baris.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={updateMutation.isPending || !footerMessage}
          >
            Reset ke Default
          </Button>
        </div>

        {footerMessage && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <Label className="text-xs text-gray-600 mb-2 block">
              Preview:
            </Label>
            <div className="text-sm space-y-1">
              <p className="font-semibold">Terima kasih atas kunjungan Anda!</p>
              {footerMessage.split('\n').map((line, index) => (
                <p key={index}>{line || '\u00A0'}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ReceiptFooterSettings
