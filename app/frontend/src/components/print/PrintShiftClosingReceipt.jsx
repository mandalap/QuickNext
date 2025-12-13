import { Download, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { shiftService } from '../../services/shift.service';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import '../../styles/thermal-printer.css';

/**
 * Component untuk print laporan tutup kasir dengan detail barang terjual
 * Support untuk Eppos thermal printer
 */
const PrintShiftClosingReceipt = ({ open, onClose, shiftId }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && shiftId) {
      loadReportData();
    }
  }, [open, shiftId]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shiftService.getShiftClosingReport(shiftId);
      if (response.success) {
        setReportData(response.data);
      } else {
        setError('Gagal memuat data laporan');
      }
    } catch (err) {
      setError('Gagal memuat data laporan');
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = date => {
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Generate Eppos ESC/POS command for printing
  const generateEpposCommands = () => {
    if (!reportData) return '';

    const { shift, summary, payment_breakdown, sold_items } = reportData;
    
    let commands = '';
    
    // Initialize printer
    commands += '\x1B\x40'; // ESC @ (Initialize printer)
    commands += '\x1B\x61\x01'; // ESC a 1 (Center                                                   align)
    
    // Header
    commands += '\x1B\x45\x01'; // ESC E 1 (Bold on)
    commands += 'LAPORAN TUTUP KASIR\n';
    commands += 'TRANSAKSI PENJUALAN\n';
    commands += '\x1B\x45\x00'; // ESC E 0 (Bold off)
    commands += '\x1B\x61\x00'; // ESC a 0 (Left align)
    commands += '================================\n';
    
    // Shift info
    commands += `Kasir: ${shift.user.name}\n`;
    commands += `Shift: ${shift.shift_name}\n`;
    commands += `Buka: ${formatDate(shift.opened_at)}\n`;
    if (shift.closed_at) {
      commands += `Tutup: ${formatDate(shift.closed_at)}\n`;
    }
    commands += '================================\n\n';
    
    // Summary
    commands += '\x1B\x45\x01'; // Bold on
    commands += 'RINGKASAN TRANSAKSI\n';
    commands += '\x1B\x45\x00'; // Bold off
    commands += `Modal Awal: ${formatCurrency(summary.opening_balance)}\n`;
    commands += `Total Penerimaan: ${formatCurrency(summary.total_received)}\n`;
    if (summary.cash_out > 0) {
      commands += `Kas Keluar: ${formatCurrency(summary.cash_out)}\n`;
    }
    commands += `Saldo Akhir: ${formatCurrency(summary.ending_balance)}\n`;
    commands += `Transaksi Selesai: ${summary.total_transactions_completed}\n`;
    commands += `Transaksi Belum Terbayar: ${summary.total_transactions_unpaid}\n`;
    commands += `Total Tunai Sistem: ${formatCurrency(summary.system_cash_total)}\n`;
    commands += `Total Tunai Aktual: ${formatCurrency(summary.actual_cash_total)}\n`;
    commands += `Selisih: ${formatCurrency(Math.abs(summary.cash_difference))}\n`;
    commands += summary.cash_difference === 0 ? ' (Sesuai)\n' : summary.cash_difference > 0 ? ' (Lebih)\n' : ' (Kurang)\n';
    commands += '================================\n\n';
    
    // Payment breakdown
    commands += '\x1B\x45\x01'; // Bold on
    commands += 'RINCIAN PEMBAYARAN\n';
    commands += '\x1B\x45\x00'; // Bold off
    if (payment_breakdown.cash.amount > 0) {
      commands += `Cash (${payment_breakdown.cash.transactions}x): ${formatCurrency(payment_breakdown.cash.amount)}\n`;
    }
    if (payment_breakdown.card.amount > 0) {
      commands += `Card (${payment_breakdown.card.transactions}x): ${formatCurrency(payment_breakdown.card.amount)}\n`;
    }
    if (payment_breakdown.transfer.amount > 0) {
      commands += `Transfer (${payment_breakdown.transfer.transactions}x): ${formatCurrency(payment_breakdown.transfer.amount)}\n`;
    }
    if (payment_breakdown.qris.amount > 0) {
      commands += `QRIS (${payment_breakdown.qris.transactions}x): ${formatCurrency(payment_breakdown.qris.amount)}\n`;
    }
    commands += '================================\n\n';
    
    // Sold items
    commands += '\x1B\x45\x01'; // Bold on
    commands += 'PENJUALAN MENU\n';
    commands += '\x1B\x45\x00'; // Bold off
    commands += 'Produk Terjual:\n';
    commands += '--------------------------------\n';
    
    sold_items.forEach(item => {
      const variant = item.variant_name ? ` (${item.variant_name})` : '';
      commands += `${item.product_name}${variant}\n`;
      commands += `  ${item.quantity} x ${formatCurrency(item.unit_price)} = ${formatCurrency(item.total_revenue)}\n`;
    });
    
    commands += '--------------------------------\n';
    commands += `Total Penjualan Menu: ${formatCurrency(reportData.total_items_revenue)}\n`;
    commands += `Total Unit: ${reportData.total_items_sold}\n`;
    commands += '================================\n\n';
    
    // Footer
    commands += '\x1B\x61\x01'; // Center align
    commands += 'Terima kasih!\n';
    commands += `Dicetak: ${formatDate(new Date())}\n`;
    commands += '\x1B\x61\x00'; // Left align
    
    // Cut paper
    commands += '\x1D\x56\x42\x00'; // GS V B 0 (Cut paper)
    
    return commands;
  };

  // Print using Eppos printer (via browser print or direct printer)
  const handlePrintEppos = () => {
    if (!reportData) return;

    // Check if Eppos printer is available
    if (window.eppos) {
      // Direct print to Eppos printer
      const commands = generateEpposCommands();
      window.eppos.print(commands);
    } else {
      // Fallback to browser print with thermal printer CSS
      window.print();
    }
  };

  // Download as text file (for Eppos printing later)
  const handleDownload = () => {
    if (!reportData) return;
    
    const commands = generateEpposCommands();
    const blob = new Blob([commands], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-tutup-kasir-shift-${shiftId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
<|uniquepaddingtoken94|><｜tool▁call▁begin｜>
read_file
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:p-0'>
        <DialogHeader className='print:hidden'>
          <div className='flex items-center justify-between'>
            <DialogTitle>Laporan Tutup Kasir - Print Struk</DialogTitle>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleDownload}
                disabled={loading || !reportData}
              >
                <Download className='w-4 h-4 mr-2' />
                Download (Eppos)
              </Button>
              <Button
                variant='default'
                size='sm'
                onClick={handlePrintEppos}
                disabled={loading || !reportData}
              >
                <Printer className='w-4 h-4 mr-2' />
                Print (Eppos)
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            <span className='ml-2'>Memuat data laporan...</span>
          </div>
        ) : error ? (
          <div className='text-center py-8'>
            <p className='text-red-600'>{error}</p>
            <Button onClick={loadReportData} className='mt-4'>
              Coba Lagi
            </Button>
          </div>
        ) : reportData ? (
          <div className='receipt-content print:bg-white print:text-black'>
            <style>{`
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                body * {
                  visibility: hidden;
                }
                .receipt-content, .receipt-content * {
                  visibility: visible;
                }
                .receipt-content {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 80mm;
                  font-family: 'Courier New', monospace;
                  font-size: 9pt;
                  padding: 2mm;
                }
              }
            `}</style>

            {/* Header */}
            <div className='text-center mb-4 print:mb-2'>
              <h2 className='text-xl font-bold print:text-lg'>
                LAPORAN TUTUP KASIR
              </h2>
              <h3 className='text-lg font-bold print:text-base'>
                TRANSAKSI PENJUALAN
              </h3>
              <h3 className='text-lg font-bold print:text-base'>
                PENJUALAN MENU
              </h3>
            </div>

            <div className='border-t border-b py-2 print:py-1'>
              <div className='text-sm print:text-xs'>
                <div>Kasir: {reportData.shift.user.name}</div>
                <div>Shift: {reportData.shift.shift_name}</div>
                <div>Buka: {formatDate(reportData.shift.opened_at)}</div>
                {reportData.shift.closed_at && (
                  <div>Tutup: {formatDate(reportData.shift.closed_at)}</div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className='my-4 print:my-2'>
              <h3 className='font-bold mb-2'>RINGKASAN TRANSAKSI</h3>
              <div className='space-y-1 text-sm print:text-xs'>
                <div className='flex justify-between'>
                  <span>Modal Awal:</span>
                  <span>{formatCurrency(reportData.summary.opening_balance)}</span>
                </div>
                <div className='flex justify-between'>
                  <span>Total Penerimaan:</span>
                  <span>{formatCurrency(reportData.summary.total_received)}</span>
                </div>
                {reportData.summary.cash_out > 0 && (
                  <div className='flex justify-between'>
                    <span>Kas Keluar:</span>
                    <span>{formatCurrency(reportData.summary.cash_out)}</span>
                  </div>
                )}
                <div className='flex justify-between font-bold'>
                  <span>Saldo Akhir:</span>
                  <span>{formatCurrency(reportData.summary.ending_balance)}</span>
                </div>
                <div className='flex justify-between'>
                  <span>Transaksi Selesai:</span>
                  <span>{reportData.summary.total_transactions_completed}</span>
                </div>
                <div className='flex justify-between'>
                  <span>Transaksi Belum Terbayar:</span>
                  <span>{reportData.summary.total_transactions_unpaid}</span>
                </div>
                <div className='flex justify-between'>
                  <span>Total Tunai Sistem:</span>
                  <span>{formatCurrency(reportData.summary.system_cash_total)}</span>
                </div>
                <div className='flex justify-between'>
                  <span>Total Tunai Aktual:</span>
                  <span>{formatCurrency(reportData.summary.actual_cash_total)}</span>
                </div>
                <div className='flex justify-between font-bold'>
                  <span>Selisih:</span>
                  <span>
                    {formatCurrency(Math.abs(reportData.summary.cash_difference))}
                    {reportData.summary.cash_difference === 0 ? ' (Sesuai)' : 
                     reportData.summary.cash_difference > 0 ? ' (Lebih)' : ' (Kurang)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className='my-4 print:my-2 border-t pt-2'>
              <h3 className='font-bold mb-2'>RINCIAN PEMBAYARAN</h3>
              <div className='space-y-1 text-sm print:text-xs'>
                {reportData.payment_breakdown.cash.amount > 0 && (
                  <div className='flex justify-between'>
                    <span>Cash ({reportData.payment_breakdown.cash.transactions}x):</span>
                    <span>{formatCurrency(reportData.payment_breakdown.cash.amount)}</span>
                  </div>
                )}
                {reportData.payment_breakdown.card.amount > 0 && (
                  <div className='flex justify-between'>
                    <span>Card ({reportData.payment_breakdown.card.transactions}x):</span>
                    <span>{formatCurrency(reportData.payment_breakdown.card.amount)}</span>
                  </div>
                )}
                {reportData.payment_breakdown.transfer.amount > 0 && (
                  <div className='flex justify-between'>
                    <span>Transfer ({reportData.payment_breakdown.transfer.transactions}x):</span>
                    <span>{formatCurrency(reportData.payment_breakdown.transfer.amount)}</span>
                  </div>
                )}
                {reportData.payment_breakdown.qris.amount > 0 && (
                  <div className='flex justify-between'>
                    <span>QRIS ({reportData.payment_breakdown.qris.transactions}x):</span>
                    <span>{formatCurrency(reportData.payment_breakdown.qris.amount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sold Items */}
            <div className='my-4 print:my-2 border-t pt-2'>
              <h3 className='font-bold mb-2'>PENJUALAN MENU</h3>
              <div className='text-sm print:text-xs'>
                <div className='font-medium mb-1'>Produk Terjual:</div>
                <div className='space-y-1'>
                  {reportData.sold_items.map((item, index) => (
                    <div key={index} className='border-b pb-1'>
                      <div className='font-medium'>
                        {item.product_name}
                        {item.variant_name && ` (${item.variant_name})`}
                      </div>
                      <div className='flex justify-between text-gray-600 print:text-gray-800'>
                        <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                        <span className='font-medium'>{formatCurrency(item.total_revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className='mt-2 pt-2 border-t font-bold flex justify-between'>
                  <span>Total Penjualan Menu:</span>
                  <span>{formatCurrency(reportData.total_items_revenue)}</span>
                </div>
                <div className='flex justify-between'>
                  <span>Total Unit:</span>
                  <span>{reportData.total_items_sold}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className='text-center mt-4 print:mt-2 text-sm print:text-xs border-t pt-2'>
              <p>Terima kasih!</p>
              <p className='mt-1'>Dicetak: {formatDate(new Date())}</p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PrintShiftClosingReceipt;

