import { Download, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { orderService } from '../../services/order.service';
import '../../styles/thermal-printer.css';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useToast } from '../ui/toast';

const PrintReceiptModal = ({ open, onClose, orderId }) => {
  const { toast } = useToast();
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
            line-height: 1.3;
            letter-spacing: 0.3pt;
          }
          
          .receipt-address,
          .receipt-contact,
          .store-address,
          .store-phone {
            font-size: 10pt;
            text-align: center;
            margin: 2pt 0;
            line-height: 1.5;
            font-weight: bold !important;
          }
          
          .store-name {
            font-weight: bold !important;
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
          
          .receipt-info-row,
          .info-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: baseline !important;
            font-size: 10pt;
            line-height: 1.0;
            margin-bottom: 1pt;
            width: 100%;
          }
          
          .receipt-info-row:last-child,
          .info-row:last-child {
            margin-bottom: 0;
          }
          
          .receipt-info-label,
          .info-label {
            font-weight: 500;
            flex-shrink: 0;
            margin-right: 8pt;
            text-align: left;
          }
          
          .receipt-info-value,
          .info-value {
            text-align: right !important;
            white-space: nowrap;
            font-weight: 400;
            margin-left: auto;
            flex-shrink: 0;
          }
          
          .receipt-items {
            margin-bottom: 8pt;
          }
          
          .items-section {
            margin: 4pt 0;
          }
          
          .item-block {
            margin-bottom: 2pt;
          }
          
          .item-name-row {
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 1pt;
            word-wrap: break-word;
            line-height: 1.0;
          }
          
          .item-details-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: baseline !important;
            font-size: 10pt;
            margin-bottom: 2pt;
            width: 100% !important;
            line-height: 1.0;
          }
          
          .item-qty-price {
            color: #000;
            font-size: 10pt;
            text-align: left !important;
            flex: 1;
            margin-right: 8pt;
            font-weight: normal;
          }
          
          .item-subtotal {
            font-weight: 600;
            text-align: right !important;
            white-space: nowrap !important;
            font-size: 10pt;
            min-width: 80pt;
            flex-shrink: 0 !important;
            margin-left: auto !important;
          }
          
          .item-divider {
            border-top: 1px dashed #ddd;
            margin: 2pt 0;
            height: 0;
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
          
          .receipt-total-row,
          .total-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: baseline !important;
            font-size: 10pt;
            line-height: 1.0;
            margin-bottom: 1pt;
            width: 100%;
          }
          
          .receipt-total-row:last-child,
          .total-row:last-child {
            margin-bottom: 0;
          }
          
          .receipt-total-label {
            font-weight: 500;
            flex: 1;
            margin-right: 8pt;
            text-align: left;
          }
          
          .receipt-total-value {
            text-align: right !important;
            font-weight: 500;
            min-width: 80pt;
            white-space: nowrap;
            flex-shrink: 0;
          }
          
          .total-row > span:first-child {
            text-align: left;
            flex: 1;
            margin-right: 8pt;
          }
          
          .total-row > span:last-child {
            text-align: right !important;
            white-space: nowrap;
            min-width: 80pt;
            flex-shrink: 0;
          }
          
          .receipt-total-final {
            border-top: 2px solid #000;
            padding-top: 2pt;
            margin-top: 2pt;
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
          
          .receipt-payment-row,
          .payment-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: baseline !important;
            font-size: 10pt;
            line-height: 1.0;
            margin-bottom: 1pt;
            width: 100%;
          }
          
          .receipt-payment-row:last-child,
          .payment-row:last-child {
            margin-bottom: 0;
          }
          
          .receipt-payment-label {
            font-weight: 500;
            flex: 1;
            margin-right: 8pt;
            text-align: left;
          }
          
          .receipt-payment-value {
            text-align: right !important;
            font-weight: 500;
            min-width: 80pt;
            white-space: nowrap;
            flex-shrink: 0;
          }
          
          .payment-row > span:first-child {
            text-align: left;
            flex: 1;
            margin-right: 8pt;
          }
          
          .payment-row > span:last-child,
          .payment-method {
            text-align: right !important;
            white-space: nowrap;
            min-width: 80pt;
            flex-shrink: 0;
            font-weight: bold;
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
          
          .receipt-footer,
          .footer {
            text-align: center !important;
            margin-top: 4pt;
            padding-top: 2pt;
          }
          
          .receipt-footer-text {
            font-size: 9pt;
            margin: 4pt 0;
            line-height: 1.6;
            font-weight: 400;
            text-align: center !important;
          }
          
          .receipt-footer-print,
          .printed-time,
          .print-time {
            font-size: 9pt !important;
            margin-top: 2pt;
            color: #000;
            padding-top: 2pt;
            border-top: 1px dashed #ccc;
            font-weight: normal;
            text-align: center !important;
            line-height: 1.0;
          }
          
          .thank-you {
            font-weight: bold;
            font-size: 10pt;
            margin: 1pt 0;
            text-align: center !important;
            line-height: 1.0;
          }
          
          .footer-message {
            font-size: 9pt;
            margin: 1pt 0;
            line-height: 1.0;
            white-space: pre-line;
            text-align: center !important;
          }
          
          .footer-message > div {
            margin: 0;
            text-align: center !important;
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
              padding: 5mm 5mm !important;
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

  const handleDownload = async () => {
    try {
      // Import jsPDF and html2canvas dynamically
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      // Get the receipt content element
      const receiptElement = document.querySelector('.receipt-content');
      if (!receiptElement) {
        throw new Error('Receipt element not found');
      }

      // Show loading state
      toast({
        title: 'Membuat PDF...',
        description: 'Sedang memproses struk menjadi PDF',
      });

      // Wait a bit to ensure all styles are applied
      await new Promise(resolve => setTimeout(resolve, 200));

      // Generate canvas from receipt element with better options
      const canvas = await html2canvas(receiptElement, {
        scale: 2, // Higher scale for better quality
        logging: false,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        windowWidth: receiptElement.scrollWidth,
        windowHeight: receiptElement.scrollHeight,
        width: receiptElement.scrollWidth,
        height: receiptElement.scrollHeight,
        onclone: (clonedDoc) => {
          // Ensure all styles are applied in cloned document
          const clonedElement = clonedDoc.querySelector('.receipt-content');
          if (clonedElement) {
            clonedElement.style.fontSize = '10pt';
            clonedElement.style.fontFamily = "'Courier New', monospace";
          }
        },
      });

      // Convert canvas to image
      const imgData = canvas.toDataURL('image/png');

      // Calculate PDF dimensions
      // Receipt width is 80mm (thermal receipt standard)
      const pdfWidth = 80; // mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = 297; // A4 height in mm (max page height)

      // Create PDF - use A4 width but custom height for first page
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4', // Use A4 as base format
      });

      // Calculate if we need multiple pages
      let heightLeft = pdfHeight;
      let position = 0;
      const pageWidth = 210; // A4 width in mm
      const margin = (pageWidth - pdfWidth) / 2; // Center the receipt

      // Add first page with receipt
      pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      // Save PDF
      const fileName = `struk-${
        receiptData?.order?.order_number || orderId || 'receipt'
      }.pdf`;
      
      // Save the PDF file
      pdf.save(fileName);

      // Show success message
      toast({
        title: 'PDF berhasil diunduh',
        description: `File ${fileName} telah disimpan`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      toast({
        title: 'Gagal membuat PDF',
        description: error.message || 'Terjadi kesalahan saat membuat PDF. Silakan coba lagi.',
        variant: 'destructive',
      });
      // Fallback to text download if PDF generation fails
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
    }
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
    content += `${outlet.phone || business.phone || ''}\n`;
    if (outlet.email || business.email) {
      content += `${outlet.email || business.email || ''}\n`;
    }
    content += `${'='.repeat(32)}\n`;
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
    // Format angka tanpa simbol mata uang (untuk kolom harga/subtotal)
    const num = Number(amount) || 0;
    return num.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatCurrencyWithRp = amount => {
    // Format angka dengan prefix Rp (untuk subtotal/total/pembayaran)
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
            {/* HEADER */}
            <div className='receipt-header'>
              <div className='store-name'>
                {receiptData.outlet?.name ||
                  receiptData.business?.name ||
                  'KOPI HARMONI'}
              </div>
              {(receiptData.outlet?.address ||
                receiptData.business?.address) && (
                <div className='store-address'>
                  {receiptData.outlet?.address ||
                    receiptData.business?.address}
                </div>
              )}
              {(receiptData.outlet?.phone || receiptData.business?.phone) && (
                <div className='store-phone'>
                  {receiptData.outlet?.phone || receiptData.business?.phone}
                </div>
              )}
            </div>

            <hr className='divider' />

            {/* TRANSACTION INFO */}
            <div className='transaction-info'>
              <div className='info-row'>
                <span className='info-label'>No. Struk</span>
                <span className='info-value'>
                  {receiptData.print_info?.receipt_number || 'N/A'}
                </span>
              </div>
              <div className='info-row'>
                <span className='info-label'>Tanggal</span>
                <span className='info-value'>
                  {receiptData.order?.ordered_at
                    ? new Date(
                        receiptData.order.ordered_at
                      ).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A'}
                </span>
              </div>
              <div className='info-row'>
                <span className='info-label'>Kasir</span>
                <span className='info-value'>
                  {receiptData.cashier?.name || 'Kasir'}
                </span>
              </div>
              <div className='info-row'>
                <span className='info-label'>Pelanggan</span>
                <span className='info-value'>
                  {receiptData.customer?.name ||
                    receiptData.order?.customer_name ||
                    'Walk-in Customer'}
                </span>
              </div>
              {receiptData.order?.queue_number && (
                <div className='info-row'>
                  <span className='info-label'>No. Antrian</span>
                  <span className='info-value'>
                    {receiptData.order.queue_number}
                  </span>
                </div>
              )}
              {receiptData.queue_number && (
                <div className='info-row'>
                  <span className='info-label'>No. Antrian</span>
                  <span className='info-value'>
                    {receiptData.queue_number}
                  </span>
                </div>
              )}
            </div>

            <hr className='divider' />

            {/* ITEMS SECTION */}
            <div className='items-section'>
              {(receiptData.items || []).map((item, index) => (
                <div key={index} className='item-block'>
                  <div className='item-name-row'>
                    {item.product_name || 'N/A'}
                  </div>
                  {/* ✅ NEW: Tampilkan catatan jika ada */}
                  {item.notes && (
                    <div className='item-notes-row' style={{ fontSize: '10pt', color: '#666', fontStyle: 'italic', marginTop: '2pt', marginBottom: '2pt' }}>
                      📝 {item.notes}
                    </div>
                  )}
                  <div className='item-details-row'>
                    <span className='item-qty-price'>
                      {item.quantity || 0}x @{formatCurrency(item.price || 0)}
                    </span>
                    <span className='item-subtotal'>
                      {formatCurrency(item.subtotal || 0)}
                    </span>
                  </div>
                  {index < (receiptData.items || []).length - 1 && (
                    <div className='item-divider'></div>
                  )}
                </div>
              ))}
            </div>

            <hr className='divider' />

            {/* TOTALS SECTION */}
            <div className='totals-section'>
              <div className='total-row'>
                <span>Subtotal</span>
                <span>{formatCurrencyWithRp(receiptData.order?.subtotal || 0)}</span>
              </div>
              {receiptData.order?.discount_amount > 0 && (
                <div className='total-row discount'>
                  <span>
                    Diskon
                    {receiptData.order?.coupon_code
                      ? ` (${receiptData.order.coupon_code})`
                      : ''}
                  </span>
                  <span>
                    -{formatCurrencyWithRp(receiptData.order.discount_amount)}
                  </span>
                </div>
              )}
              {receiptData.order?.tax_amount > 0 && (
                <div className='total-row'>
                  <span>PPN</span>
                  <span>
                    {formatCurrencyWithRp(receiptData.order?.tax_amount || 0)}
                  </span>
                </div>
              )}
              <div className='total-row grand-total'>
                <span>GRAND TOTAL</span>
                <span>
                  {formatCurrencyWithRp(receiptData.order?.total || 0)}
                </span>
              </div>
            </div>

            <hr className='divider' />

            {/* PAYMENT SECTION */}
            <div className='payment-section'>
              <div className='payment-row'>
                <span>Metode Bayar</span>
                <span className='payment-method'>
                  {(
                    (receiptData.payments || [])[0]?.method || 'N/A'
                  ).toUpperCase()}
                </span>
              </div>
              <div className='payment-row'>
                <span>Jumlah Bayar</span>
                <span>
                  {formatCurrencyWithRp(
                    (receiptData.payments || []).reduce(
                      (sum, payment) =>
                        sum + (Number(payment.amount) || 0),
                      0
                    )
                  )}
                </span>
              </div>
              <div className='payment-row'>
                <span>Kembalian</span>
                <span>
                  {formatCurrencyWithRp(
                    receiptData.order?.change_amount || 0
                  )}
                </span>
              </div>
            </div>

            <hr className='divider' />

            {/* FOOTER SECTION */}
            <div className='footer'>
              <div className='thank-you'>Terima Kasih!</div>
              {receiptData.custom_footer_message ? (
                <div className='footer-message'>
                  {receiptData.custom_footer_message
                    .split('\n')
                    .map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                </div>
              ) : (
                <div className='footer-message'>
                  Simpan struk ini sebagai bukti pembayaran
                </div>
              )}
              <div className='printed-time'>
                Dicetak:{' '}
                {receiptData.print_info?.printed_at ||
                  new Date().toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PrintReceiptModal;
