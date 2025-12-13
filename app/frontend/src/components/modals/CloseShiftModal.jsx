import {
  AlertCircle,
  Calculator,
  CheckCircle,
  Download,
  Loader2,
  Printer,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { shiftService } from '../../services/shift.service';
import PrintShiftReceipt from '../print/PrintShiftReceipt';
import { Button } from '../ui/button';
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

const CloseShiftModal = ({ open, onClose, shift, onSuccess }) => {
  const [actualCash, setActualCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [shiftDetail, setShiftDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const printRef = useRef();

  console.log('🎯 CloseShiftModal rendered with props:', {
    open,
    shift,
    onClose,
    onSuccess,
  });

  console.log('🔍 Shift ID yang akan digunakan:', shift?.id);
  console.log('🔍 Shift data yang diterima:', shift);

  console.log('🎯 Current shiftDetail state at render:', shiftDetail);

  useEffect(() => {
    console.log('🔄 CloseShiftModal useEffect triggered');
    console.log('🔄 Open:', open);
    console.log('🔄 Shift:', shift);
    console.log('🔄 Shift ID:', shift?.id);

    if (open && shift?.id) {
      console.log('✅ Conditions met, calling loadShiftDetail');
      loadShiftDetail();
    } else {
      console.log('❌ Conditions not met for loadShiftDetail');
    }
  }, [open, shift]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = e => {
      if (!open) return;

      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!loading && actualCash) {
          handleSubmit(e);
        }
      }

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [open, loading, actualCash]);

  const loadShiftDetail = async () => {
    setLoadingDetail(true);
    try {
      console.log('🔍 Loading shift detail for shift ID:', shift.id);
      console.log('🔍 Shift object:', shift);
      console.log('🔍 Current user token:', localStorage.getItem('token'));

      // First recalculate the shift to get latest data
      console.log('🔄 Recalculating shift data first...');
      try {
        await shiftService.recalculateShift(shift.id);
        console.log('✅ Shift recalculated successfully');
      } catch (recalcError) {
        console.warn('⚠️ Failed to recalculate shift:', recalcError);
        // Continue anyway, maybe the data is already up to date
      }

      const result = await shiftService.getById(shift.id);
      console.log('📊 Shift detail API response:', result);
      console.log('📊 Response success:', result.success);
      console.log('📊 Response data:', result.data);

      if (result.success && result.data) {
        // Backend returns { success: true, data: { shift, summary, payment_breakdown, orders } }
        let shiftData = result.data;

        console.log('📦 Processed shift data:', shiftData);
        console.log('💰 Payment breakdown:', shiftData.payment_breakdown);
        console.log('📈 Shift summary:', shiftData.shift);
        console.log(
          '🔍 Full data structure:',
          JSON.stringify(shiftData, null, 2)
        );

        // Validate that we have the required shift data
        if (!shiftData.shift) {
          console.error(
            '❌ Shift data is missing from API response:',
            shiftData
          );
          console.error('❌ Available keys in data:', Object.keys(shiftData));
          toast.error('Data shift tidak lengkap dari server');
          return;
        }

        // Check if shift is already closed
        if (shiftData.shift.status === 'closed') {
          console.warn('⚠️ Shift is already closed:', shiftData.shift);
          toast.error('Shift sudah ditutup sebelumnya');
          handleClose();
          return;
        }

        // Set initial data first to prevent undefined errors
        setShiftDetail(shiftData);

        // Pre-fill expected cash from initial data
        // Expected cash should be opening_balance + cash sales (cash from payment breakdown)
        const openingBalance = Number(shiftData.shift?.opening_balance || 0);
        // Expected cash sudah termasuk modal awal, jadi tidak perlu ditambahkan lagi
        const initialExpectedCash = Number(
          shiftData.payment_breakdown?.cash?.expected ??
            shiftData.shift?.expected_cash ??
            openingBalance +
              (shiftData.payment_breakdown?.cash?.cash_sales ?? 0)
        );

        console.log('💵 Cash calculation:', {
          openingBalance,
          cashSales: shiftData.payment_breakdown?.cash?.cash_sales,
          expectedCash:
            shiftData.payment_breakdown?.cash?.expected ??
            shiftData.shift?.expected_cash,
          calculatedExpected: initialExpectedCash,
        });

        // Only set if the value is reasonable (less than 1 billion)
        if (initialExpectedCash > 0 && initialExpectedCash < 1000000000) {
          setActualCash(initialExpectedCash.toString());
        } else {
          console.warn(
            '⚠️ Expected cash value seems unreasonable:',
            initialExpectedCash
          );
          setActualCash('');
        }

        // Data sudah di-recalculate di awal, tidak perlu recalculate lagi
      } else {
        console.error('❌ Failed to load shift detail:', result);
        console.error('❌ Result success:', result.success);
        console.error('❌ Result message:', result.message);
        console.error('❌ Result data:', result.data);

        // Handle specific error cases
        if (result.message?.includes('tidak memiliki akses')) {
          toast.error('Anda tidak memiliki akses ke shift ini');
        } else if (result.message?.includes('not found')) {
          toast.error('Shift tidak ditemukan');
        } else {
          toast.error(
            `Gagal memuat detail shift: ${result.message || 'Unknown error'}`
          );
        }

        // Close modal on error
        handleClose();
      }
    } catch (error) {
      console.error('💥 Error loading shift detail:', error);
      console.error('💥 Error message:', error.message);
      console.error('💥 Error response:', error.response);

      // Handle network errors
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        toast.error('Tidak ada koneksi internet. Periksa koneksi Anda.');
      } else if (error.response?.status === 404) {
        toast.error('Shift tidak ditemukan');
      } else if (error.response?.status === 403) {
        toast.error('Anda tidak memiliki akses ke shift ini');
      } else if (error.response?.status >= 500) {
        toast.error('Server sedang bermasalah. Coba lagi nanti.');
      } else {
        toast.error(
          `Terjadi kesalahan saat memuat detail shift: ${error.message}`
        );
      }

      // Close modal on error
      handleClose();
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const calculateDifference = () => {
    if (!shiftDetail || !shiftDetail.shift || !actualCash) return 0;

    // Expected cash sudah termasuk modal awal dari backend
    // payment_breakdown.cash.expected = expected_cash (opening_balance + cash_sales)
    const expected = Number(
      shiftDetail.payment_breakdown?.cash?.expected ??
        shiftDetail.shift?.expected_cash ??
        0
    );

    // Remove formatting from actualCash for calculation
    const actual = Number(actualCash.replace(/[^\d]/g, '') || 0);
    return actual - expected;
  };

  const getDifferenceColor = () => {
    const diff = calculateDifference();
    if (diff === 0) return 'text-green-600';
    if (diff > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getDifferenceLabel = () => {
    const diff = calculateDifference();
    if (diff === 0) return '✓ Sesuai';
    if (diff > 0) return '↑ Lebih';
    return '↓ Kurang';
  };

  const validate = () => {
    const newErrors = {};

    if (!actualCash || actualCash.trim() === '') {
      newErrors.actualCash = 'Jumlah uang tunai akhir harus diisi';
    } else {
      // Remove formatting for validation
      const numericValue = Number(actualCash.replace(/[^\d]/g, '') || 0);

      if (numericValue <= 0) {
        newErrors.actualCash = 'Jumlah uang tunai harus lebih dari 0';
      } else if (numericValue > 100000000) {
        newErrors.actualCash =
          'Jumlah uang tunai terlalu besar (maksimal 100 juta)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      // Remove formatting from actualCash for API call
      const numericActualCash = Number(actualCash.replace(/[^\d]/g, '') || 0);

      console.log('🔄 Closing shift with data:', {
        shiftId: shift.id,
        actual_cash: numericActualCash,
        closing_notes: closingNotes,
      });

      const result = await shiftService.closeShift(shift.id, {
        actual_cash: numericActualCash,
        closing_notes: closingNotes || undefined,
      });

      console.log('📊 Close shift result:', result);

      if (result.success) {
        toast.success(
          'Shift berhasil ditutup! Anda bisa cetak ulang dari menu Riwayat Shift.'
        );
        handleClose();
        onSuccess && onSuccess(result.data);
      } else {
        console.error('❌ Close shift failed:', result);
        toast.error(result.message || 'Gagal menutup shift');
      }
    } catch (error) {
      console.error('💥 Error closing shift:', error);

      // Handle specific error cases
      if (error.response?.status === 404) {
        toast.error('Shift tidak ditemukan atau sudah ditutup');
      } else if (error.response?.status === 403) {
        toast.error('Anda tidak memiliki akses untuk menutup shift ini');
      } else if (error.response?.status === 422) {
        const errors = error.response.data?.errors;
        if (errors) {
          const errorMessages = Object.values(errors).flat();
          toast.error(errorMessages.join(', '));
        } else {
          toast.error('Data yang dimasukkan tidak valid');
        }
      } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        toast.error('Tidak ada koneksi internet. Periksa koneksi Anda.');
      } else if (error.response?.status >= 500) {
        toast.error('Server sedang bermasalah. Coba lagi nanti.');
      } else {
        toast.error(`Terjadi kesalahan saat menutup shift: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActualCash('');
    setClosingNotes('');
    setErrors({});
    setShiftDetail(null);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      // Import jsPDF and html2canvas dynamically
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      // Create a temporary container for PDF content
      const pdfContent = document.createElement('div');
      pdfContent.style.padding = '20px';
      pdfContent.style.fontFamily = 'Arial, sans-serif';
      pdfContent.style.width = '210mm'; // A4 width

      pdfContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="font-size: 24px; margin: 0;">LAPORAN TUTUP SHIFT</h1>
          <p style="margin: 5px 0;">${
            shiftData.business?.name || 'POS System'
          }</p>
          <p style="margin: 5px 0;">${shiftData.outlet?.name || ''}</p>
        </div>

        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
          <h3 style="margin-top: 0;">INFORMASI SHIFT</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px;"><strong>Shift:</strong></td><td>${
              shiftData.shift_name
            }</td></tr>
            <tr><td style="padding: 5px;"><strong>Kasir:</strong></td><td>${
              shiftData.employee?.user?.name || 'N/A'
            }</td></tr>
            <tr><td style="padding: 5px;"><strong>ID Shift:</strong></td><td>#${
              shiftData.id
            }</td></tr>
            <tr><td style="padding: 5px;"><strong>Buka:</strong></td><td>${new Date(
              shiftData.opened_at
            ).toLocaleString('id-ID')}</td></tr>
            <tr><td style="padding: 5px;"><strong>Tutup:</strong></td><td>${new Date(
              shiftData.closed_at || new Date()
            ).toLocaleString('id-ID')}</td></tr>
          </table>
        </div>

        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
          <h3 style="margin-top: 0;">RINGKASAN TRANSAKSI</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px;"><strong>Total Transaksi:</strong></td><td>${
              shiftData.total_transactions || 0
            }</td></tr>
            <tr><td style="padding: 5px;"><strong>Total Penjualan:</strong></td><td>${formatCurrency(
              shiftData.expected_total
            )}</td></tr>
          </table>
        </div>

        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
          <h3 style="margin-top: 0;">RINCIAN PEMBAYARAN</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px;">Cash:</td><td>${formatCurrency(
              payment_breakdown.cash?.cash_sales ??
                Number(payment_breakdown.cash.expected || 0) -
                  Number(shiftData.opening_balance || 0)
            )} (${payment_breakdown.cash.transactions}x)</td></tr>
            <tr><td style="padding: 5px;">Card:</td><td>${formatCurrency(
              payment_breakdown.card.amount
            )} (${payment_breakdown.card.transactions}x)</td></tr>
            <tr><td style="padding: 5px;">Transfer:</td><td>${formatCurrency(
              payment_breakdown.transfer.amount
            )} (${payment_breakdown.transfer.transactions}x)</td></tr>
            <tr><td style="padding: 5px;">QRIS:</td><td>${formatCurrency(
              payment_breakdown.qris.amount
            )} (${payment_breakdown.qris.transactions}x)</td></tr>
          </table>
        </div>

        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
          <h3 style="margin-top: 0;">PERHITUNGAN KAS</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px;">Modal Awal:</td><td>${formatCurrency(
              shiftData.opening_balance
            )}</td></tr>
            <tr><td style="padding: 5px;">Penjualan Cash:</td><td>${formatCurrency(
              payment_breakdown.cash?.cash_sales ??
                Number(payment_breakdown.cash.expected || 0) -
                  Number(shiftData.opening_balance || 0)
            )}</td></tr>
            <tr style="border-top: 1px solid #ccc;"><td style="padding: 5px;"><strong>Kas Seharusnya:</strong></td><td><strong>${formatCurrency(
              Number(payment_breakdown.cash.expected || 0)
            )}</strong></td></tr>
            <tr><td style="padding: 5px;">Kas Aktual:</td><td>${formatCurrency(
              actualCash
            )}</td></tr>
            <tr style="border-top: 1px solid #ccc;"><td style="padding: 5px;"><strong>Selisih:</strong></td><td><strong>${formatCurrency(
              Math.abs(calculateDifference())
            )} ${
        calculateDifference() > 0
          ? '(Lebih)'
          : calculateDifference() < 0
          ? '(Kurang)'
          : '(Sesuai)'
      }</strong></td></tr>
          </table>
        </div>

        ${
          closingNotes
            ? `
          <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
            <h3 style="margin-top: 0;">CATATAN</h3>
            <p>${closingNotes}</p>
          </div>
        `
            : ''
        }

        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
          <p>Ditutup oleh: ${shiftData.employee?.user?.name || 'N/A'}</p>
          <p>Dicetak: ${new Date().toLocaleString('id-ID')}</p>
          <p style="margin-top: 20px;">Terima kasih atas kerja keras Anda!</p>
        </div>
      `;

      document.body.appendChild(pdfContent);

      // Generate PDF
      const canvas = await html2canvas(pdfContent, {
        scale: 2,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(
        `Laporan-Shift-${shiftData.shift_name}-${new Date().toLocaleDateString(
          'id-ID'
        )}.pdf`
      );

      // Clean up
      document.body.removeChild(pdfContent);

      toast.success('PDF berhasil didownload!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal generate PDF');
    }
  };

  if (loadingDetail) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className='sm:max-w-[600px]'>
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!shiftDetail) {
    console.log('⚠️ shiftDetail is null, returning null');
    return null;
  }

  // Check if shiftDetail has the expected structure
  if (!shiftDetail || !shiftDetail.shift) {
    console.error(
      '❌ shiftDetail or shiftDetail.shift is missing:',
      shiftDetail
    );
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className='p-4 text-center'>
            <p className='text-red-600'>
              Data shift tidak lengkap. Silakan tutup dan coba lagi.
            </p>
            <Button onClick={handleClose} className='mt-4'>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Additional safety check
  if (!shiftDetail.shift || typeof shiftDetail.shift !== 'object') {
    console.error(
      '❌ shiftDetail.shift is not a valid object:',
      shiftDetail.shift
    );
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className='p-4 text-center'>
            <p className='text-red-600'>
              Struktur data shift tidak valid. Silakan tutup dan coba lagi.
            </p>
            <Button onClick={handleClose} className='mt-4'>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { shift: shiftData, payment_breakdown } = shiftDetail;

  // Fallback data if payment_breakdown is missing or empty
  const safePaymentBreakdown = payment_breakdown || {
    cash: { expected: 0, transactions: 0 },
    card: { amount: 0, transactions: 0 },
    transfer: { amount: 0, transactions: 0 },
    qris: { amount: 0, transactions: 0 },
  };

  // Debug log untuk memastikan data yang diterima
  console.log('🔍 Payment breakdown data:', payment_breakdown);
  console.log('🔍 Safe payment breakdown:', safePaymentBreakdown);
  console.log('🔍 Shift data:', shiftData);

  return (
    <>
      {/* Print Receipt Component (hidden, only for printing) */}
      <PrintShiftReceipt
        shiftData={shiftData}
        paymentBreakdown={payment_breakdown}
        actualCash={actualCash}
        closingNotes={closingNotes}
      />

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className='sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col'>
          <DialogHeader className='flex-shrink-0'>
            <DialogTitle className='text-lg md:text-xl font-bold flex items-center'>
              <Calculator className='w-5 h-5 mr-2 text-blue-600' />
              Tutup Shift Kasir
            </DialogTitle>
            <DialogDescription>
              Masukkan jumlah uang tunai aktual untuk menutup shift dan
              menyelesaikan laporan penjualan.
              <br />
              <span className='text-xs text-gray-500 mt-1 block'>
                💡 Tips: Gunakan Ctrl+Enter untuk menutup shift, Escape untuk
                batal
              </span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className='flex-1 overflow-y-auto'>
            <div className='space-y-3 py-2'>
              {/* Shift Info */}
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
                <div className='grid grid-cols-2 gap-2 text-xs md:text-sm'>
                  <div>
                    <p className='text-gray-600'>Nama Shift:</p>
                    <p className='font-semibold text-blue-900'>
                      {shiftData.shift_name ||
                        (shiftData.opened_at
                          ? (() => {
                              const openDate = new Date(shiftData.opened_at);
                              const hour = openDate.getHours();
                              let shiftName = '';

                              if (hour >= 6 && hour < 12) {
                                shiftName = 'Shift Pagi';
                              } else if (hour >= 12 && hour < 18) {
                                shiftName = 'Shift Siang';
                              } else if (hour >= 18 && hour < 24) {
                                shiftName = 'Shift Malam';
                              } else {
                                shiftName = 'Shift Tengah Malam';
                              }

                              return `${shiftName} - ${openDate.toLocaleDateString(
                                'id-ID'
                              )}`;
                            })()
                          : 'Shift Baru')}
                    </p>
                  </div>
                  <div>
                    <p className='text-gray-600'>Total Transaksi:</p>
                    <p className='font-semibold text-blue-900'>
                      {shiftData.total_transactions ||
                        (safePaymentBreakdown.cash?.transactions || 0) +
                          (safePaymentBreakdown.card?.transactions || 0) +
                          (safePaymentBreakdown.transfer?.transactions || 0) +
                          (safePaymentBreakdown.qris?.transactions || 0)}{' '}
                      order
                    </p>
                  </div>
                </div>
              </div>

              {/* Expected Summary */}
              <div className='space-y-2'>
                <Label className='text-sm font-semibold text-gray-900'>
                  Ringkasan Transaksi (Expected)
                </Label>
                <div className='bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2'>
                  <div className='flex justify-between text-xs md:text-sm'>
                    <span>Tunai:</span>
                    <span className='font-semibold'>
                      {formatCurrency(
                        safePaymentBreakdown.cash?.cash_sales ??
                          Number(safePaymentBreakdown.cash?.expected || 0) -
                            Number(shiftData.opening_balance || 0)
                      )}{' '}
                      ({safePaymentBreakdown.cash.transactions}x)
                    </span>
                  </div>
                  <div className='flex justify-between text-xs md:text-sm'>
                    <span>Kartu:</span>
                    <span className='font-semibold'>
                      {formatCurrency(safePaymentBreakdown.card.amount)} (
                      {safePaymentBreakdown.card.transactions}x)
                    </span>
                  </div>
                  <div className='flex justify-between text-xs md:text-sm'>
                    <span>Transfer:</span>
                    <span className='font-semibold'>
                      {formatCurrency(safePaymentBreakdown.transfer.amount)} (
                      {safePaymentBreakdown.transfer.transactions}x)
                    </span>
                  </div>
                  <div className='flex justify-between text-xs md:text-sm'>
                    <span>QRIS:</span>
                    <span className='font-semibold'>
                      {formatCurrency(safePaymentBreakdown.qris.amount)} (
                      {safePaymentBreakdown.qris.transactions}x)
                    </span>
                  </div>
                  <div className='border-t pt-2 flex justify-between text-sm md:text-base font-bold'>
                    <span>Total Penjualan:</span>
                    <span className='text-blue-600'>
                      {formatCurrency(
                        shiftData.expected_total ||
                          Number(
                            safePaymentBreakdown.cash?.cash_sales ??
                              Number(safePaymentBreakdown.cash?.expected || 0) -
                                Number(shiftData.opening_balance || 0)
                          ) +
                            Number(safePaymentBreakdown.card.amount || 0) +
                            Number(safePaymentBreakdown.transfer.amount || 0) +
                            Number(safePaymentBreakdown.qris.amount || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash Calculation */}
              <div className='space-y-2'>
                <Label className='text-sm font-semibold text-gray-900'>
                  Perhitungan Kas
                </Label>
                <div className='bg-green-50 border border-green-200 rounded-lg p-3 space-y-2'>
                  <div className='flex justify-between text-xs md:text-sm'>
                    <span>Modal Awal:</span>
                    <span className='font-semibold'>
                      {formatCurrency(shiftData.opening_balance || 0)}
                    </span>
                  </div>
                  <div className='flex justify-between text-xs md:text-sm'>
                    <span>Penjualan Tunai:</span>
                    <span className='font-semibold'>
                      {formatCurrency(
                        safePaymentBreakdown.cash?.cash_sales ??
                          Number(safePaymentBreakdown.cash?.expected || 0) -
                            Number(
                              shiftData.opening_balance ||
                                shiftData.shift?.opening_balance ||
                                0
                            )
                      )}
                    </span>
                  </div>
                  <div className='border-t pt-2 flex justify-between text-sm md:text-base font-bold'>
                    <span>Kas Seharusnya:</span>
                    <span className='text-green-600'>
                      {formatCurrency(safePaymentBreakdown.cash?.expected || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actual Cash Input */}
              <div className='space-y-2'>
                <Label htmlFor='actualCash' className='text-sm font-semibold'>
                  Uang Tunai Akhir (Actual){' '}
                  <span className='text-red-500'>*</span>
                </Label>
                <p className='text-xs text-gray-600'>
                  Hitung dan masukkan total uang tunai fisik yang ada di kasir
                </p>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium'>
                    Rp
                  </span>
                  <Input
                    id='actualCash'
                    type='text'
                    value={actualCash}
                    onChange={e => {
                      // Remove non-numeric characters except decimal point
                      let value = e.target.value.replace(/[^\d]/g, '');

                      // Format with thousand separators
                      if (value) {
                        const formatted = new Intl.NumberFormat('id-ID').format(
                          parseInt(value)
                        );
                        setActualCash(formatted);
                      } else {
                        setActualCash('');
                      }

                      if (errors.actualCash) setErrors({});
                    }}
                    onBlur={e => {
                      // Convert back to number for calculations
                      const numericValue = e.target.value.replace(/[^\d]/g, '');
                      if (numericValue) {
                        setActualCash(numericValue);
                      }
                    }}
                    placeholder='0'
                    className={`text-right text-base md:text-lg font-semibold pl-12 h-11 ${
                      errors.actualCash ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {errors.actualCash && (
                  <p className='text-xs text-red-600'>{errors.actualCash}</p>
                )}
              </div>

              {/* Difference Calculation */}
              {actualCash && !isNaN(actualCash) && (
                <div
                  className={`${
                    calculateDifference() === 0
                      ? 'bg-green-50 border-green-200'
                      : calculateDifference() > 0
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-red-50 border-red-200'
                  } border rounded-lg p-3`}
                >
                  <div className='flex justify-between items-center'>
                    <div className='flex items-center gap-2'>
                      {calculateDifference() === 0 ? (
                        <CheckCircle className='w-5 h-5 text-green-600' />
                      ) : (
                        <AlertCircle
                          className={`w-5 h-5 ${getDifferenceColor()}`}
                        />
                      )}
                      <span className='text-sm font-semibold'>Selisih:</span>
                    </div>
                    <div className='text-right'>
                      <p
                        className={`text-lg md:text-xl font-bold ${getDifferenceColor()}`}
                      >
                        {formatCurrency(Math.abs(calculateDifference()))}
                      </p>
                      <p className={`text-xs ${getDifferenceColor()}`}>
                        {getDifferenceLabel()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Closing Notes */}
              <div className='space-y-2'>
                <Label htmlFor='closingNotes' className='text-sm font-semibold'>
                  Catatan Penutupan{' '}
                  <span className='text-gray-500 font-normal'>(Opsional)</span>
                </Label>
                <textarea
                  id='closingNotes'
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                  placeholder='Contoh: Ada uang kembalian salah Rp 5.000'
                  rows={3}
                  className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
                />
              </div>
            </div>

            <DialogFooter className='gap-2 flex-shrink-0 pt-3 border-t'>
              <div className='flex flex-col sm:flex-row gap-2 w-full'>
                {/* Preview Print & Download Buttons */}
                <div className='flex gap-2 flex-1'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handlePrint}
                    disabled={!actualCash}
                    className='flex-1 text-sm h-10 border-blue-300 text-blue-600 hover:bg-blue-50'
                    title='Preview/Cetak Struk Thermal'
                  >
                    <Printer className='w-4 h-4 mr-2' />
                    Preview Print
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleDownloadPDF}
                    disabled={!actualCash}
                    className='flex-1 text-sm h-10 border-green-300 text-green-600 hover:bg-green-50'
                    title='Download PDF Laporan'
                  >
                    <Download className='w-4 h-4 mr-2' />
                    Download PDF
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleClose}
                    disabled={loading}
                    className='text-sm h-10'
                  >
                    Batal
                  </Button>
                  <Button
                    type='submit'
                    disabled={loading || !actualCash || loadingDetail}
                    className='bg-red-600 hover:bg-red-700 min-w-[120px] disabled:bg-gray-400 text-sm h-10'
                  >
                    {loading ? (
                      <>
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                        Menutup...
                      </>
                    ) : (
                      <>
                        <CheckCircle className='w-4 h-4 mr-2' />
                        Tutup Shift
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CloseShiftModal;
