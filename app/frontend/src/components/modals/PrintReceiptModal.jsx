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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Struk Pembayaran</title>
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
            padding: 5mm 3mm;
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
            line-height: 1.3;
            letter-spacing: 0.3pt;
          }
          
          .receipt-address,
          .receipt-contact {
            font-size: 10pt;
            text-align: center;
            margin: 2pt 0;
            line-height: 1.5;
          }
          
          .receipt-divider {
            border-top: 1px dashed #000;
            margin: 8pt 0;
            height: 0;
            width: 100%;
            border-bottom: none;
          }
          
          .receipt-info {
            margin-bottom: 8pt;
          }
          
          .receipt-info-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-size: 10pt;
            line-height: 1.6;
            margin-bottom: 4pt;
          }
          
          .receipt-info-row:last-child {
            margin-bottom: 0;
          }
          
          .receipt-info-label {
            font-weight: 500;
            min-width: 80pt;
            flex-shrink: 0;
            margin-right: 8pt;
          }
          
          .receipt-info-value {
            text-align: right;
            flex: 1;
            white-space: nowrap;
            font-weight: 400;
          }
          
          .receipt-items {
            margin-bottom: 8pt;
          }
          
          .receipt-items-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 10pt;
          }
          
          .receipt-table-header {
            border-bottom: 1px solid #000;
          }
          
          .receipt-table-header th {
            font-weight: 600;
            padding: 5pt 2pt;
            font-size: 10pt;
            text-align: left;
          }
          
          .receipt-table-header th.receipt-col-qty {
            text-align: center !important;
          }
          
          .receipt-table-header th.receipt-col-price,
          .receipt-table-header th.receipt-col-subtotal {
            text-align: right !important;
          }
          
          .receipt-table-row {
            border-bottom: 1px dashed #ccc;
          }
          
          .receipt-table-row:last-child {
            border-bottom: none;
          }
          
          .receipt-table-row td {
            padding: 5pt 2pt;
            vertical-align: top;
            font-size: 10pt;
            line-height: 1.5;
          }
          
          .receipt-col-item {
            width: 45% !important;
            word-wrap: break-word;
            overflow-wrap: break-word;
            padding-right: 2pt !important;
          }
          
          .receipt-col-qty {
            width: 10% !important;
            text-align: center !important;
            padding: 0 1pt !important;
          }
          
          .receipt-col-price {
            width: 22% !important;
            text-align: right !important;
            white-space: nowrap;
            padding-left: 2pt !important;
            padding-right: 2pt !important;
          }
          
          .receipt-col-subtotal {
            width: 23% !important;
            text-align: right !important;
            white-space: nowrap;
            padding-left: 2pt !important;
          }
          
          .receipt-item-name {
            font-weight: 500;
            line-height: 1.4;
            word-break: break-word;
            hyphens: auto;
          }
          
          .receipt-item-variant {
            font-size: 9pt;
            color: #555;
            line-height: 1.3;
            margin-top: 2pt;
            font-style: normal;
            font-weight: 400;
          }
          
          .receipt-text-center {
            text-align: center !important;
          }
          
          .receipt-text-right {
            text-align: right !important;
          }
          
          .receipt-text-bold {
            font-weight: 700;
          }
          
          .receipt-totals {
            margin-bottom: 8pt;
          }
          
          .receipt-total-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-size: 10pt;
            line-height: 1.6;
            margin-bottom: 4pt;
          }
          
          .receipt-total-row:last-child {
            margin-bottom: 0;
          }
          
          .receipt-total-label {
            font-weight: 500;
            flex: 1;
            margin-right: 8pt;
          }
          
          .receipt-total-value {
            text-align: right;
            font-weight: 500;
            min-width: 80pt;
            white-space: nowrap;
          }
          
          .receipt-total-final {
            border-top: 2px solid #000;
            padding-top: 4pt;
            margin-top: 4pt;
            font-weight: 700;
            font-size: 12pt;
          }
          
          .receipt-total-final .receipt-total-label,
          .receipt-total-final .receipt-total-value {
            font-weight: 700;
          }
          
          .receipt-payments {
            margin-bottom: 8pt;
          }
          
          .receipt-payment-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-size: 10pt;
            line-height: 1.6;
            margin-bottom: 4pt;
          }
          
          .receipt-payment-row:last-child {
            margin-bottom: 0;
          }
          
          .receipt-payment-label {
            font-weight: 500;
            flex: 1;
            margin-right: 8pt;
          }
          
          .receipt-payment-value {
            text-align: right;
            font-weight: 500;
            min-width: 80pt;
            white-space: nowrap;
          }
          
          .receipt-change {
            font-weight: 600;
            margin-top: 4pt;
            padding-top: 4pt;
            border-top: 1px dashed #000;
          }
          
          .receipt-change .receipt-payment-label,
          .receipt-change .receipt-payment-value {
            font-weight: 600;
          }
          
          .receipt-footer {
            text-align: center;
            margin-top: 8pt;
            padding-top: 4pt;
          }
          
          .receipt-footer-text {
            font-size: 9pt;
            margin: 4pt 0;
            line-height: 1.6;
            font-weight: 400;
          }
          
          .receipt-footer-print {
            font-size: 8pt;
            margin-top: 6pt;
            color: #666;
            padding-top: 4pt;
            border-top: 1px dashed #ccc;
            font-weight: 400;
          }
          
          .receipt-discount {
            color: #000;
          }
          
          /* Override Tailwind classes untuk print */
          .text-center {
            text-align: center !important;
          }
          
          .mb-3 {
            margin-bottom: 12pt !important;
          }
          
          .print\\:mb-2,
          [class*="print:mb-2"] {
            margin-bottom: 8pt !important;
          }
          
          .w-full {
            width: 100% !important;
          }
          
          .text-xl {
            font-size: 18pt !important;
          }
          
          .print\\:text-base,
          [class*="print:text-base"] {
            font-size: 16pt !important;
          }
          
          .font-bold {
            font-weight: 700 !important;
          }
          
          .text-sm {
            font-size: 10pt !important;
          }
          
          .print\\:text-\\[9pt\\],
          [class*="print:text-[9pt]"] {
            font-size: 9pt !important;
          }
          
          .print\\:bg-white,
          [class*="print:bg-white"] {
            background: white !important;
          }
          
          .print\\:text-black,
          [class*="print:text-black"] {
            color: black !important;
          }
          
          @media print {
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
              padding: 0;
            }
            
            .receipt-content {
              padding: 5mm 3mm !important;
            }
            
            .mb-3 {
              margin-bottom: 8pt !important;
            }
            
            .print\\:mb-2 {
              margin-bottom: 6pt !important;
            }
          }
        </style>
      </head>
      <body>
        ${receiptClone.innerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
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
    // Format untuk thermal printer dengan pemisah ribuan
    const num = Number(amount) || 0;
    return num.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatCurrencyWithRp = amount => {
    // Format dengan Rp untuk display
    const num = Number(amount) || 0;
    return `Rp ${num.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
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
            <div className='text-center mb-3 print:mb-2 receipt-header'>
              <h2 className='text-xl font-bold print:text-base receipt-title'>
                {receiptData.outlet?.name || 'KASIR POS SYSTEM'}
              </h2>
              {receiptData.outlet?.address || receiptData.business?.address ? (
                <p className='text-sm print:text-[9pt] receipt-address'>
                  {receiptData.outlet?.address ||
                    receiptData.business?.address ||
                    ''}
                </p>
              ) : null}
              {receiptData.outlet?.phone || receiptData.business?.phone ? (
                <p className='text-sm print:text-[9pt] receipt-contact'>
                  Tel: {receiptData.outlet?.phone ||
                    receiptData.business?.phone ||
                    ''}
                </p>
              ) : null}
              {receiptData.outlet?.email || receiptData.business?.email ? (
                <p className='text-sm print:text-[9pt] receipt-contact'>
                  Email: {receiptData.outlet?.email ||
                    receiptData.business?.email ||
                    ''}
                </p>
              ) : null}
            </div>

            {/* Divider */}
            <div className='receipt-divider'></div>

            {/* Transaction Info */}
            <div className='receipt-info mb-3 print:mb-2'>
              <div className='receipt-info-row'>
                <span className='receipt-info-label'>Struk:</span>
                <span className='receipt-info-value'>{receiptData.print_info?.receipt_number || 'N/A'}</span>
              </div>
              <div className='receipt-info-row'>
                <span className='receipt-info-label'>Order:</span>
                <span className='receipt-info-value'>{receiptData.order?.order_number || 'N/A'}</span>
              </div>
              <div className='receipt-info-row'>
                <span className='receipt-info-label'>Tanggal:</span>
                <span className='receipt-info-value'>
                  {receiptData.order?.ordered_at
                    ? new Date(receiptData.order.ordered_at).toLocaleString(
                        'id-ID',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )
                    : 'N/A'}
                </span>
              </div>
              <div className='receipt-info-row'>
                <span className='receipt-info-label'>Kasir:</span>
                <span className='receipt-info-value'>{receiptData.cashier?.name || 'Kasir'}</span>
              </div>
              <div className='receipt-info-row'>
                <span className='receipt-info-label'>Pelanggan:</span>
                <span className='receipt-info-value'>
                  {receiptData.customer?.name ||
                    receiptData.order?.customer_name ||
                    'Walk-in Customer'}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className='receipt-divider'></div>

            {/* Items */}
            <div className='receipt-items mb-3 print:mb-2'>
              <table className='w-full receipt-items-table'>
                <thead>
                  <tr className='receipt-table-header'>
                    <th className='receipt-col-item'>ITEM</th>
                    <th className='receipt-col-qty'>QTY</th>
                    <th className='receipt-col-price'>HARGA</th>
                    <th className='receipt-col-subtotal'>SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(receiptData.items || []).map((item, index) => (
                    <tr key={index} className='receipt-table-row'>
                      <td className='receipt-col-item'>
                        <div className='receipt-item-name'>{item.product_name || 'N/A'}</div>
                        {item.variant_name && (
                          <div className='receipt-item-variant'>({item.variant_name})</div>
                        )}
                      </td>
                      <td className='receipt-col-qty receipt-text-center'>
                        {item.quantity || 0}
                      </td>
                      <td className='receipt-col-price receipt-text-right'>
                        {formatCurrency(item.price || 0)}
                      </td>
                      <td className='receipt-col-subtotal receipt-text-right'>
                        <span className='receipt-text-bold'>{formatCurrency(item.subtotal || 0)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Divider */}
            <div className='receipt-divider'></div>

            {/* Totals */}
            <div className='receipt-totals mb-3 print:mb-2'>
              <div className='receipt-total-row'>
                <span className='receipt-total-label'>Subtotal:</span>
                <span className='receipt-total-value'>
                  {formatCurrency(receiptData.order?.subtotal || 0)}
                </span>
              </div>
              {receiptData.order?.tax_amount > 0 && (
                <div className='receipt-total-row'>
                  <span className='receipt-total-label'>Pajak:</span>
                  <span className='receipt-total-value'>
                    {formatCurrency(receiptData.order?.tax_amount || 0)}
                  </span>
                </div>
              )}
              {receiptData.order?.discount_amount > 0 && (
                <div className='receipt-total-row receipt-discount'>
                  <span className='receipt-total-label'>
                    Diskon{receiptData.order?.coupon_code
                      ? ` (${receiptData.order.coupon_code})`
                      : ''}:
                  </span>
                  <span className='receipt-total-value'>
                    -{formatCurrency(receiptData.order.discount_amount)}
                  </span>
                </div>
              )}
              <div className='receipt-total-row receipt-total-final'>
                <span className='receipt-total-label receipt-text-bold'>TOTAL:</span>
                <span className='receipt-total-value receipt-text-bold'>
                  {formatCurrency(receiptData.order?.total || 0)}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className='receipt-divider'></div>

            {/* Payments */}
            <div className='receipt-payments mb-3 print:mb-2'>
              {(receiptData.payments || []).map((payment, index) => (
                <div key={index} className='receipt-payment-row'>
                  <span className='receipt-payment-label'>
                    Pembayaran: {(payment.method || 'N/A').toUpperCase()}
                  </span>
                  <span className='receipt-payment-value'>
                    {formatCurrency(payment.amount || 0)}
                  </span>
                </div>
              ))}
              <div className='receipt-payment-row receipt-change'>
                <span className='receipt-payment-label'>Kembalian:</span>
                <span className='receipt-payment-value'>
                  {formatCurrency(receiptData.order?.change_amount || 0)}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className='receipt-divider'></div>

            {/* Footer */}
            <div className='receipt-footer'>
              <p className='receipt-footer-text'>Terima kasih atas kunjungan Anda!</p>
              {receiptData.custom_footer_message ? (
                <div className='receipt-footer-custom'>
                  {receiptData.custom_footer_message.split('\n').map((line, index) => (
                    <p key={index} className='receipt-footer-text'>
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className='receipt-footer-text'>Barang yang sudah dibeli tidak dapat dikembalikan</p>
              )}
              <p className='receipt-footer-print'>
                Dicetak: {receiptData.print_info?.printed_at || new Date().toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PrintReceiptModal;
