import { Download, Eye, Loader2, Printer, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { shiftService } from '../../services/shift.service';
import PrintShiftReceipt from '../print/PrintShiftReceipt';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const ShiftHistoryModal = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [shiftDetail, setShiftDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (open) {
      loadShiftHistory();
    }
  }, [open]);

  const loadShiftHistory = async () => {
    setLoading(true);
    try {
      const result = await shiftService.getShiftHistory({
        status: 'closed',
        per_page: 20,
      });

      console.log('📊 Shift history full response:', result);

      if (result.success && result.data) {
        let shiftsData = [];

        // Backend response structure:
        // result.data = { success: true, data: { data: [...], total, etc } }

        if (result.data.success && result.data.data) {
          // Backend wrapped response
          const backendData = result.data.data;

          if (Array.isArray(backendData.data)) {
            // Paginated: data.data = array
            shiftsData = backendData.data;
          } else if (Array.isArray(backendData)) {
            // Simple array
            shiftsData = backendData;
          }
        } else if (Array.isArray(result.data.data)) {
          // Direct nested array
          shiftsData = result.data.data;
        } else if (Array.isArray(result.data)) {
          // Direct array
          shiftsData = result.data;
        }

        console.log('✅ Shifts data found:', shiftsData.length, 'items');
        if (shiftsData.length > 0) {
          console.log('📦 Sample shift:', shiftsData[0]);
        }

        setShifts(Array.isArray(shiftsData) ? shiftsData : []);
      } else {
        setShifts([]);
      }
    } catch (error) {
      console.error('Error loading shift history:', error);
      toast.error('Gagal memuat riwayat shift');
    } finally {
      setLoading(false);
    }
  };

  const loadShiftDetail = async (shiftId) => {
    setLoadingDetail(true);
    try {
      console.log('🔍 Loading shift detail for ID:', shiftId);
      const result = await shiftService.getShiftDetail(shiftId);
      console.log('📊 Shift detail result:', result);

      if (result.success) {
        // Backend response is { success: true, data: { shift: {...}, payment_breakdown: {...} } }
        // So we should use result.data, not result.data.data
        console.log('✅ Setting shift detail:', result.data);
        setShiftDetail(result.data);
        setSelectedShift(shiftId);
      } else {
        toast.error(result.message || 'Gagal memuat detail shift');
      }
    } catch (error) {
      console.error('❌ Error loading shift detail:', error);
      toast.error('Gagal memuat detail shift');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrint = () => {
    if (!shiftDetail) return;
    window.print();
    toast.success('Membuka dialog print...');
  };

  const handleDownloadPDF = async () => {
    if (!shiftDetail) return;

    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const { shift: shiftData, payment_breakdown } = shiftDetail;

      const pdfContent = document.createElement('div');
      pdfContent.style.padding = '20px';
      pdfContent.style.fontFamily = 'Arial, sans-serif';
      pdfContent.style.width = '210mm';

      pdfContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="font-size: 24px; margin: 0;">LAPORAN TUTUP SHIFT</h1>
          <p style="margin: 5px 0;">${shiftData.business?.name || 'POS System'}</p>
          <p style="margin: 5px 0;">${shiftData.outlet?.name || ''}</p>
        </div>

        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
          <h3 style="margin-top: 0;">INFORMASI SHIFT</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px;"><strong>Shift:</strong></td><td>${shiftData.shift_name}</td></tr>
            <tr><td style="padding: 5px;"><strong>Kasir:</strong></td><td>${shiftData.user?.name || 'N/A'}</td></tr>
            <tr><td style="padding: 5px;"><strong>ID Shift:</strong></td><td>#${shiftData.id}</td></tr>
            <tr><td style="padding: 5px;"><strong>Buka:</strong></td><td>${new Date(shiftData.opened_at).toLocaleString('id-ID')}</td></tr>
            <tr><td style="padding: 5px;"><strong>Tutup:</strong></td><td>${new Date(shiftData.closed_at || new Date()).toLocaleString('id-ID')}</td></tr>
          </table>
        </div>

        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
          <h3 style="margin-top: 0;">RINGKASAN TRANSAKSI</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px;"><strong>Total Transaksi:</strong></td><td>${shiftData.total_transactions || 0}</td></tr>
            <tr><td style="padding: 5px;"><strong>Total Penjualan:</strong></td><td>${formatCurrency(shiftData.expected_total)}</td></tr>
          </table>
        </div>

        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
          <h3 style="margin-top: 0;">RINCIAN PEMBAYARAN</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px;">Cash:</td><td>${formatCurrency(payment_breakdown.cash.cash_sales)} (${payment_breakdown.cash.transactions}x)</td></tr>
            <tr><td style="padding: 5px;">Card:</td><td>${formatCurrency(payment_breakdown.card.amount)} (${payment_breakdown.card.transactions}x)</td></tr>
            <tr><td style="padding: 5px;">Transfer:</td><td>${formatCurrency(payment_breakdown.transfer.amount)} (${payment_breakdown.transfer.transactions}x)</td></tr>
            <tr><td style="padding: 5px;">QRIS:</td><td>${formatCurrency(payment_breakdown.qris.amount)} (${payment_breakdown.qris.transactions}x)</td></tr>
            <tr style="border-top: 1px solid #ccc;"><td style="padding: 5px;"><strong>Total:</strong></td><td><strong>${formatCurrency(
              Number(payment_breakdown.cash.cash_sales || 0) +
              Number(payment_breakdown.card.amount || 0) +
              Number(payment_breakdown.transfer.amount || 0) +
              Number(payment_breakdown.qris.amount || 0)
            )}</strong></td></tr>
          </table>
        </div>

        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
          <h3 style="margin-top: 0;">PERHITUNGAN KAS</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px;">Modal Awal:</td><td>${formatCurrency(shiftData.opening_balance)}</td></tr>
            <tr><td style="padding: 5px;">Penjualan Cash:</td><td>${formatCurrency(payment_breakdown.cash.cash_sales)}</td></tr>
            <tr style="border-top: 1px solid #ccc;"><td style="padding: 5px;"><strong>Kas Seharusnya:</strong></td><td><strong>${formatCurrency(Number(shiftData.opening_balance) + Number(payment_breakdown.cash.cash_sales))}</strong></td></tr>
            <tr><td style="padding: 5px;">Kas Aktual:</td><td>${formatCurrency(shiftData.actual_cash)}</td></tr>
            <tr style="border-top: 1px solid #ccc;"><td style="padding: 5px;"><strong>Selisih:</strong></td><td><strong>${formatCurrency(Math.abs(shiftData.cash_difference))} ${shiftData.cash_difference > 0 ? '(Lebih)' : shiftData.cash_difference < 0 ? '(Kurang)' : '(Sesuai)'}</strong></td></tr>
          </table>
        </div>

        ${shiftData.closing_notes ? `
          <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
            <h3 style="margin-top: 0;">CATATAN</h3>
            <p>${shiftData.closing_notes}</p>
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
          <p>Ditutup oleh: ${shiftData.user?.name || 'N/A'}</p>
          <p>Dicetak: ${new Date().toLocaleString('id-ID')}</p>
          <p style="margin-top: 20px;">Terima kasih atas kerja keras Anda!</p>
        </div>
      `;

      document.body.appendChild(pdfContent);

      const canvas = await html2canvas(pdfContent, {
        scale: 2,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Laporan-Shift-${shiftData.shift_name}-${new Date().toLocaleDateString('id-ID')}.pdf`);

      document.body.removeChild(pdfContent);
      toast.success('PDF berhasil didownload!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal generate PDF');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleClose = () => {
    setSelectedShift(null);
    setShiftDetail(null);
    onClose();
  };

  return (
    <>
      {/* Print Receipt Component (hidden) */}
      {shiftDetail && (
        <PrintShiftReceipt
          shiftData={shiftDetail.shift}
          paymentBreakdown={shiftDetail.payment_breakdown}
          actualCash={shiftDetail.shift.actual_cash}
          closingNotes={shiftDetail.shift.closing_notes}
        />
      )}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg md:text-xl font-bold">
              Riwayat Shift Kasir
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : shifts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Belum ada riwayat shift
              </div>
            ) : (
              <div className="space-y-3">
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className={`border rounded-lg p-4 transition-all ${
                      selectedShift === shift.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{shift.shift_name}</h3>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Buka:</span> {formatDate(shift.opened_at)}
                          </div>
                          <div>
                            <span className="font-medium">Tutup:</span> {formatDate(shift.closed_at)}
                          </div>
                          <div>
                            <span className="font-medium">Total Transaksi:</span> {shift.total_transactions}
                          </div>
                          <div>
                            <span className="font-medium">Total Penjualan:</span>{' '}
                            {formatCurrency(shift.expected_total)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadShiftDetail(shift.id)}
                          disabled={loadingDetail && selectedShift === shift.id}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          {loadingDetail && selectedShift === shift.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                          <span className="ml-2">Detail</span>
                        </Button>
                      </div>
                    </div>

                    {/* Detail Section */}
                    {selectedShift === shift.id && shiftDetail && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {/* Payment Breakdown */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h4 className="font-semibold mb-2 text-sm">Rincian Pembayaran:</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Cash: {formatCurrency(shiftDetail.payment_breakdown.cash.cash_sales)} ({shiftDetail.payment_breakdown.cash.transactions}x)</div>
                            <div>Card: {formatCurrency(shiftDetail.payment_breakdown.card.amount)} ({shiftDetail.payment_breakdown.card.transactions}x)</div>
                            <div>Transfer: {formatCurrency(shiftDetail.payment_breakdown.transfer.amount)} ({shiftDetail.payment_breakdown.transfer.transactions}x)</div>
                            <div>QRIS: {formatCurrency(shiftDetail.payment_breakdown.qris.amount)} ({shiftDetail.payment_breakdown.qris.transactions}x)</div>
                          </div>
                          <div className="mt-2 pt-2 border-t font-semibold text-sm">
                            Total: {formatCurrency(
                              Number(shiftDetail.payment_breakdown.cash.cash_sales || 0) +
                              Number(shiftDetail.payment_breakdown.card.amount || 0) +
                              Number(shiftDetail.payment_breakdown.transfer.amount || 0) +
                              Number(shiftDetail.payment_breakdown.qris.amount || 0)
                            )}
                          </div>
                        </div>

                        {/* Cash Calculation */}
                        <div className="bg-green-50 rounded-lg p-3">
                          <h4 className="font-semibold mb-2 text-sm">Perhitungan Kas:</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Modal Awal:</span>
                              <span>{formatCurrency(shiftDetail.shift.opening_balance)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Penjualan Cash:</span>
                              <span>{formatCurrency(shiftDetail.payment_breakdown.cash.cash_sales)}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t">
                              <span>Kas Seharusnya:</span>
                              <span className="font-semibold">
                                {formatCurrency(
                                  Number(shiftDetail.shift.opening_balance) +
                                    Number(shiftDetail.payment_breakdown.cash.cash_sales)
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Kas Aktual:</span>
                              <span>{formatCurrency(shiftDetail.shift.actual_cash)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t font-semibold">
                              <span>Selisih:</span>
                              <span
                                className={
                                  shiftDetail.shift.cash_difference === 0
                                    ? 'text-green-600'
                                    : shiftDetail.shift.cash_difference > 0
                                    ? 'text-blue-600'
                                    : 'text-red-600'
                                }
                              >
                                {formatCurrency(Math.abs(shiftDetail.shift.cash_difference))}{' '}
                                {shiftDetail.shift.cash_difference > 0
                                  ? '(Lebih)'
                                  : shiftDetail.shift.cash_difference < 0
                                  ? '(Kurang)'
                                  : '(Sesuai)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handlePrint}
                            className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Print Struk
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDownloadPDF}
                            className="flex-1 border-green-300 text-green-600 hover:bg-green-50"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 pt-3 border-t flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShiftHistoryModal;
