import { Download, Eye, Loader2, Printer, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const [detailModalOpen, setDetailModalOpen] = useState(false); // ✅ NEW: State untuk modal detail
  const printReceiptRef = useRef(null); // ✅ NEW: Ref untuk trigger print struk

  useEffect(() => {
    if (open) {
      loadShiftHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setDetailModalOpen(true); // ✅ NEW: Buka modal detail setelah data dimuat
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

  // ✅ NEW: Handler untuk tutup modal detail
  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setShiftDetail(null);
    setSelectedShift(null);
  };

  const handlePrint = () => {
    if (!shiftDetail) {
      toast.error('Detail shift belum dimuat. Klik tombol Detail terlebih dahulu.');
      return;
    }

    // ✅ FIX: Gunakan pendekatan window baru seperti PrintReceiptModal
    // Tunggu sebentar untuk memastikan elemen ter-render
    setTimeout(() => {
      // Cari elemen receipt di wrapper menggunakan ref
      const wrapperElement = printReceiptRef.current;
      if (!wrapperElement) {
        toast.error('Elemen struk tidak ditemukan. Silakan coba lagi.');
        console.error('Print receipt wrapper not found');
        return;
      }

      const receiptElement = wrapperElement.querySelector('.receipt-content');
      
      if (!receiptElement) {
        toast.error('Elemen struk tidak ditemukan. Silakan coba lagi.');
        console.error('Receipt element not found in wrapper');
        return;
      }

      // Clone receipt element dengan semua child nodes dan inline styles
      const receiptClone = receiptElement.cloneNode(true);
      
      // Pastikan semua style ter-apply
      receiptClone.style.display = 'block';
      receiptClone.style.visibility = 'visible';
      receiptClone.style.position = 'relative';
      receiptClone.style.left = '0';
      receiptClone.style.top = '0';
      receiptClone.style.width = '80mm';
      receiptClone.style.maxWidth = '80mm';
      
      // Buka window baru untuk print
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Popup diblokir. Izinkan popup untuk browser ini.');
        return;
      }

    // Buat HTML dengan CSS thermal printer (inline)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Laporan Tutup Shift</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
            padding: 0;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          html, body {
            width: 80mm;
            height: auto;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
          }
          
          .receipt-content,
          .thermal-receipt {
            width: 100%;
            max-width: 80mm;
            margin: 0 auto;
            padding: 5mm 5mm;
            background: #fff;
            color: #000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
          }
          
          .receipt-header {
            margin-bottom: 8pt;
            padding-bottom: 4pt;
            text-align: center;
          }
          
          .receipt-title {
            font-size: 16pt;
            font-weight: 700;
            text-align: center;
            margin-bottom: 4pt;
            text-transform: uppercase;
          }
          
          .store-name,
          .store-address,
          .store-phone {
            font-weight: bold !important;
            font-size: 11pt;
            margin: 2pt 0;
          }
          
          .receipt-section {
            margin-bottom: 6pt;
          }
          
          .section-title {
            font-size: 11pt;
            font-weight: 700;
            margin-bottom: 4pt;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
          }
          
          .receipt-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-size: 10pt;
            line-height: 1.3;
            margin-bottom: 2pt;
          }
          
          .receipt-row > span:first-child {
            font-weight: 500;
            flex: 1;
            margin-right: 8pt;
            color: #374151;
          }
          
          .receipt-row > span:last-child {
            text-align: right;
            font-weight: 500;
            white-space: nowrap;
          }
          
          .receipt-total {
            font-weight: 700;
            font-size: 11pt;
            margin-top: 2pt;
            padding-top: 2pt;
            border-top: 1px dashed #ccc;
          }
          
          .receipt-separator {
            border-top: 1px dashed #000;
            margin: 4pt 0;
            height: 0;
            width: 100%;
          }
          
          .receipt-notes {
            margin-top: 2pt;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 9pt;
            line-height: 1.4;
            color: #374151;
          }
          
          .receipt-footer {
            text-align: center;
            margin-top: 10pt;
            padding-top: 6pt;
          }
          
          .printed-time {
            font-size: 9pt;
            margin: 2pt 0;
            color: #666;
          }
          
          .receipt-thanks {
            font-size: 9pt;
            margin-top: 4pt;
            color: #666;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        ${receiptClone.outerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      toast.success('Membuka dialog print...');
    }, 100); // Tunggu 100ms untuk memastikan elemen ter-render
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
    setDetailModalOpen(false); // ✅ Reset modal detail saat tutup
    onClose();
  };

  return (
    <>
      {/* Print Receipt Component (hidden, only visible when printing via CSS @media print) */}
      {/* ✅ FIX: Always render but with conditional data to maintain hooks order */}
      {/* Print Receipt Component - Hidden but rendered for printing */}
      <div ref={printReceiptRef} className="print-receipt-wrapper" style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '80mm', visibility: 'hidden' }}>
        {shiftDetail && (
          <PrintShiftReceipt
            shiftData={shiftDetail.shift}
            paymentBreakdown={shiftDetail.payment_breakdown}
            actualCash={shiftDetail.shift.actual_cash}
            closingNotes={shiftDetail.shift.closing_notes}
          />
        )}
      </div>

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

      {/* ✅ NEW: Modal Detail Shift - Preview sebelum cetak */}
      <Dialog open={detailModalOpen} onOpenChange={handleCloseDetailModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg md:text-xl font-bold">
              Detail Shift - {shiftDetail?.shift?.shift_name || ''}
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2">Memuat detail shift...</span>
            </div>
          ) : shiftDetail ? (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Informasi Shift */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold mb-3 text-base text-blue-900">Informasi Shift</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Kasir:</span>
                    <p className="text-gray-900">{shiftDetail.shift.user?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">ID Shift:</span>
                    <p className="text-gray-900">#{shiftDetail.shift.id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Buka:</span>
                    <p className="text-gray-900">{formatDate(shiftDetail.shift.opened_at)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Tutup:</span>
                    <p className="text-gray-900">{formatDate(shiftDetail.shift.closed_at)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Transaksi:</span>
                    <p className="text-gray-900 font-semibold">{shiftDetail.shift.total_transactions || 0}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Penjualan:</span>
                    <p className="text-gray-900 font-semibold">{formatCurrency(shiftDetail.shift.expected_total)}</p>
                  </div>
                </div>
              </div>

              {/* Rincian Pembayaran */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold mb-3 text-base">Rincian Pembayaran</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Cash:</span>
                    <span className="font-medium">
                      {formatCurrency(shiftDetail.payment_breakdown.cash.cash_sales)} ({shiftDetail.payment_breakdown.cash.transactions}x)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Card:</span>
                    <span className="font-medium">
                      {formatCurrency(shiftDetail.payment_breakdown.card.amount)} ({shiftDetail.payment_breakdown.card.transactions}x)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transfer:</span>
                    <span className="font-medium">
                      {formatCurrency(shiftDetail.payment_breakdown.transfer.amount)} ({shiftDetail.payment_breakdown.transfer.transactions}x)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>QRIS:</span>
                    <span className="font-medium">
                      {formatCurrency(shiftDetail.payment_breakdown.qris.amount)} ({shiftDetail.payment_breakdown.qris.transactions}x)
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-semibold text-base">
                    <span>Total:</span>
                    <span>
                      {formatCurrency(
                        Number(shiftDetail.payment_breakdown.cash.cash_sales || 0) +
                        Number(shiftDetail.payment_breakdown.card.amount || 0) +
                        Number(shiftDetail.payment_breakdown.transfer.amount || 0) +
                        Number(shiftDetail.payment_breakdown.qris.amount || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Perhitungan Kas */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold mb-3 text-base text-green-900">Perhitungan Kas</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Modal Awal:</span>
                    <span>{formatCurrency(shiftDetail.shift.opening_balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Penjualan Cash:</span>
                    <span>{formatCurrency(shiftDetail.payment_breakdown.cash.cash_sales)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium">Kas Seharusnya:</span>
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
                  <div className="flex justify-between pt-2 border-t font-semibold text-base">
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

              {/* Catatan */}
              {shiftDetail.shift.closing_notes && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h4 className="font-semibold mb-2 text-base text-yellow-900">Catatan</h4>
                  <p className="text-sm text-gray-700">{shiftDetail.shift.closing_notes}</p>
                </div>
              )}
            </div>
          ) : null}

          {/* Action Buttons */}
          {shiftDetail && (
            <div className="flex-shrink-0 pt-4 border-t flex gap-3">
              <Button
                variant="outline"
                onClick={handleCloseDetailModal}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Tutup
              </Button>
              <Button
                onClick={handlePrint}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Cetak Struk (Thermal)
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                className="flex-1 border-green-300 text-green-600 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShiftHistoryModal;
