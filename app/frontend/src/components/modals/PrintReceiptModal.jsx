import { Download, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { orderService } from '../../services/order.service';
import '../../styles/thermal-printer.css';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

const PrintReceiptModal = ({ open, onClose, orderId }) => {
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && orderId) {
      loadReceiptData();
    }
  }, [open, orderId]);

  const loadReceiptData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderService.printReceipt(orderId);
      console.log('PrintReceiptModal: API response:', response);
      if (response.success) {
        console.log('PrintReceiptModal: Receipt data:', response.data);
        console.log(
          'PrintReceiptModal: Customer data:',
          response.data?.customer
        );
        setReceiptData(response.data);
      } else {
        setError('Gagal memuat data struk');
      }
    } catch (err) {
      setError('Gagal memuat data struk');
      console.error('Error loading receipt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Focus on receipt content only
    const printWindow = window.open('', '_blank');
    const receiptElement = document.querySelector('.receipt-content');
    
    if (!receiptElement) {
      console.error('Receipt element not found');
      return;
    }

    // Clone receipt element and wrap in proper HTML
    const receiptClone = receiptElement.cloneNode(true);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Struk Pembayaran</title>
        <link rel="stylesheet" href="${window.location.origin}/src/styles/thermal-printer.css">
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
            padding: 0;
          }
          * {
            margin: 0;
            padding: 0;
          }
          body {
            width: 80mm;
            margin: 0;
            padding: 0;
            font-family: 'Courier New', monospace;
          }
          .receipt-content {
            width: 100%;
            padding: 0;
          }
        </style>
      </head>
      <body>
        ${receiptClone.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownload = () => {
    // Create a downloadable receipt
    const receiptContent = generateReceiptContent();
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receiptData?.order?.order_number || orderId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReceiptContent = () => {
    if (!receiptData) return '';

    const {
      order = {},
      business = {},
      outlet = {},
      customer = null,
      cashier = {},
      items = [],
      payments = [],
      print_info = {},
    } = receiptData;

    let content = '';
    // ✅ FIX: Focus on outlet details, not business
    content += `${outlet.name || 'KASIR POS SYSTEM'}\n`;
    content += `${outlet.address || business.address || ''}\n`;
    content += `Tel: ${outlet.phone || business.phone || ''}\n`;
    if (outlet.email || business.email) {
      content += `Email: ${outlet.email || business.email || ''}\n`;
    }
    content += `${'='.repeat(32)}\n`;
    content += `Struk: ${print_info.receipt_number || 'N/A'}\n`;
    content += `Order: ${order.order_number || 'N/A'}\n`;
    content += `Tanggal: ${
      order.ordered_at
        ? new Date(order.ordered_at).toLocaleString('id-ID')
        : 'N/A'
    }\n`;
    content += `Kasir: ${cashier.name || 'Kasir'}\n`;
    content += `Pelanggan: ${
      customer?.name || order.customer_name || 'Walk-in Customer'
    }\n`;
    content += `${'='.repeat(32)}\n`;
    content += `ITEM\t\tQTY\tHARGA\tSUBTOTAL\n`;
    content += `${'-'.repeat(32)}\n`;

    items.forEach(item => {
      const name = item.variant_name
        ? `${item.product_name || 'N/A'} (${item.variant_name})`
        : item.product_name || 'N/A';
      const qty = (item.quantity || 0).toString();
      const price = formatCurrency(item.price || 0);
      const subtotal = formatCurrency(item.subtotal || 0);
      content += `${name}\n\t\t${qty}\t${price}\t${subtotal}\n`;
    });

    content += `${'-'.repeat(32)}\n`;
    content += `Subtotal:\t\t\t${formatCurrency(order.subtotal || 0)}\n`;
    content += `Pajak:\t\t\t${formatCurrency(order.tax_amount || 0)}\n`;
    if (order.discount_amount > 0) {
      const discountLabel = order.coupon_code
        ? `Diskon (${order.coupon_code})`
        : 'Diskon';
      content += `${discountLabel}:\t\t\t-${formatCurrency(
        order.discount_amount
      )}\n`;
    }
    content += `${'='.repeat(32)}\n`;
    content += `TOTAL:\t\t\t${formatCurrency(order.total || 0)}\n`;
    content += `${'='.repeat(32)}\n`;

    payments.forEach(payment => {
      content += `Pembayaran: ${(payment.method || 'N/A').toUpperCase()}\n`;
      content += `Jumlah: ${formatCurrency(payment.amount || 0)}\n`;
      if (payment.notes) {
        content += `Catatan: ${payment.notes}\n`;
      }
    });

    content += `\nKembalian: ${formatCurrency(order.change_amount || 0)}\n`;
    content += `\nTerima kasih atas kunjungan Anda!\n`;
    content += `Barang yang sudah dibeli tidak dapat dikembalikan\n`;
    content += `\nDicetak: ${print_info.printed_at || 'N/A'}\n`;

    return content;
  };

  const formatCurrency = amount => {
    // Format untuk thermal printer - lebih compact, tanpa titik pemisah ribuan
    // Contoh: 15000 -> "15.000" -> "15000" (tanpa titik untuk save space)
    const num = Number(amount) || 0;
    // Untuk thermal printer, gunakan format tanpa pemisah ribuan untuk save space
    // Atau dengan pemisah titik jika masih muat
    if (num >= 1000) {
      return num.toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }
    return num.toString();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:p-0'>
        <DialogHeader className='print:hidden'>
          <div className='flex items-center justify-between'>
            <DialogTitle>Print Struk</DialogTitle>
            <div className='flex gap-2 ml-8'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleDownload}
                disabled={loading || !receiptData}
              >
                <Download className='w-4 h-4 mr-2' />
                Download
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handlePrint}
                disabled={loading || !receiptData}
              >
                <Printer className='w-4 h-4 mr-2' />
                Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            <span className='ml-2'>Memuat data struk...</span>
          </div>
        ) : error ? (
          <div className='text-center py-8'>
            <p className='text-red-600'>{error}</p>
            <Button onClick={loadReceiptData} className='mt-4'>
              Coba Lagi
            </Button>
          </div>
        ) : receiptData ? (
          <div className='receipt-content print:bg-white print:text-black thermal-receipt'>
            {/* Receipt Header - Focus on Outlet */}
            <div className='text-center mb-4 print:mb-2'>
              <h2 className='text-xl font-bold print:text-lg'>
                {receiptData.outlet?.name || 'KASIR POS SYSTEM'}
              </h2>
              {receiptData.outlet?.address || receiptData.business?.address ? (
                <p className='text-sm print:text-xs'>
                  {receiptData.outlet?.address || receiptData.business?.address || ''}
                </p>
              ) : null}
              {receiptData.outlet?.phone || receiptData.business?.phone ? (
                <p className='text-sm print:text-xs'>
                  Tel: {receiptData.outlet?.phone || receiptData.business?.phone || ''}
                </p>
              ) : null}
              {receiptData.outlet?.email || receiptData.business?.email ? (
                <p className='text-sm print:text-xs'>
                  Email: {receiptData.outlet?.email || receiptData.business?.email || ''}
                </p>
              ) : null}
            </div>

            <div className='border-t border-b py-2 print:py-1 space-y-1 print:space-y-0.5'>
              <div className='text-sm print:text-xs'>
                Struk: {receiptData.print_info?.receipt_number || 'N/A'}
              </div>
              <div className='text-sm print:text-xs'>
                Order: {receiptData.order?.order_number || 'N/A'}
              </div>
              <div className='text-sm print:text-xs'>
                {receiptData.order?.ordered_at
                  ? new Date(receiptData.order.ordered_at).toLocaleString(
                      'id-ID'
                    )
                  : 'N/A'}
              </div>
              <div className='text-sm print:text-xs'>
                Kasir: {receiptData.cashier?.name || 'Kasir'}
              </div>
              <div className='text-sm print:text-xs'>
                Pelanggan:{' '}
                {receiptData.customer?.name ||
                  receiptData.order?.customer_name ||
                  'Walk-in Customer'}
              </div>
            </div>

            {/* Items */}
            <div className='my-4 print:my-2'>
              <table className='w-full text-sm print:text-xs border-collapse receipt-items-table'>
                <thead>
                  <tr className='border-b border-gray-800 font-medium'>
                    <th className='text-left py-1 print:py-0 pr-2'>ITEM</th>
                    <th className='text-center py-1 print:py-0 receipt-col-qty'>
                      QTY
                    </th>
                    <th className='text-right py-1 print:py-0 pr-2 receipt-col-price'>
                      HARGA
                    </th>
                    <th className='text-right py-1 print:py-0 receipt-col-subtotal'>
                      SUBTOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(receiptData.items || []).map((item, index) => (
                    <tr
                      key={index}
                      className='border-b border-dashed border-gray-300 print:border-gray-800'
                    >
                      <td className='text-left py-1 print:py-0 pr-2 receipt-col-item'>
                        <div>{item.product_name || 'N/A'}</div>
                        {item.variant_name && (
                          <div className='text-gray-600 print:text-gray-800 text-xs print:text-[8pt]'>
                            ({item.variant_name})
                          </div>
                        )}
                      </td>
                      <td className='text-center py-1 print:py-0 receipt-col-qty'>
                        {item.quantity || 0}
                      </td>
                      <td className='text-right py-1 print:py-0 pr-2 receipt-col-price'>
                        Rp {formatCurrency(item.price || 0)}
                      </td>
                      <td className='text-right py-1 print:py-0 font-medium receipt-col-subtotal'>
                        Rp {formatCurrency(item.subtotal || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className='border-t pt-2 print:pt-1'>
              <div className='flex justify-between text-sm print:text-xs'>
                <span>Subtotal:</span>
                <span>
                  Rp {formatCurrency(receiptData.order?.subtotal || 0)}
                </span>
              </div>
              <div className='flex justify-between text-sm print:text-xs'>
                <span>Pajak:</span>
                <span>
                  Rp {formatCurrency(receiptData.order?.tax_amount || 0)}
                </span>
              </div>
              {receiptData.order?.discount_amount > 0 && (
                <div className='flex justify-between text-sm print:text-xs text-red-600 print:text-red-800'>
                  <span>
                    Diskon
                    {receiptData.order?.coupon_code
                      ? ` (${receiptData.order.coupon_code})`
                      : ''}
                    :
                  </span>
                  <span>
                    -Rp {formatCurrency(receiptData.order.discount_amount)}
                  </span>
                </div>
              )}
              <div className='flex justify-between text-lg print:text-base font-bold border-t pt-1 print:pt-0'>
                <span>TOTAL:</span>
                <span>Rp {formatCurrency(receiptData.order?.total || 0)}</span>
              </div>
            </div>

            {/* Payments */}
            {(receiptData.payments || []).map((payment, index) => (
              <div
                key={index}
                className='mt-2 print:mt-1 text-sm print:text-xs'
              >
                <div className='flex justify-between'>
                  <span>
                    Pembayaran: {(payment.method || 'N/A').toUpperCase()}
                  </span>
                  <span>Rp {formatCurrency(payment.amount || 0)}</span>
                </div>
                {payment.notes && (
                  <div className='text-gray-600 print:text-gray-800'>
                    Catatan: {payment.notes}
                  </div>
                )}
              </div>
            ))}

            <div className='mt-2 print:mt-1 text-sm print:text-xs'>
              <div className='flex justify-between font-medium'>
                <span>Kembalian:</span>
                <span>
                  Rp {formatCurrency(receiptData.order?.change_amount || 0)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className='text-center mt-4 print:mt-2 text-sm print:text-xs'>
              <p>Terima kasih atas kunjungan Anda!</p>
              <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
              <p className='mt-2 print:mt-1'>
                Dicetak: {receiptData.print_info?.printed_at || 'N/A'}
              </p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PrintReceiptModal;
