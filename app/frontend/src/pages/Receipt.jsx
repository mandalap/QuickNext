import {
  Check,
  CreditCard,
  Download,
  Loader2,
  MapPin,
  Package,
  Phone,
  Receipt as ReceiptIcon,
  Share2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { publicOutletApi } from '../services/publicOutletApi';

const Receipt = () => {
  const { token } = useParams();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Helper function to format currency
  const formatCurrency = amount => {
    const number = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  };

  useEffect(() => {
    loadReceipt();
  }, [token]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await publicOutletApi.getReceipt(token);

      if (response.success) {
        setReceipt(response.data);
      } else {
        throw new Error(response.message || 'Struk tidak ditemukan');
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat struk');
      console.error('Failed to load receipt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Import jsPDF and html2canvas dynamically
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      // Get the receipt card element by ID
      const receiptElement = document.getElementById('receipt-content');
      if (!receiptElement) {
        throw new Error('Receipt element not found');
      }

      // Show loading state
      const loadingToast = toast.loading('Membuat PDF...');

      // Generate canvas from receipt element
      const canvas = await html2canvas(receiptElement, {
        scale: 1.5,
        logging: false,
        backgroundColor: '#ffffff',
        useCORS: true,
        windowWidth: receiptElement.scrollWidth,
        windowHeight: receiptElement.scrollHeight,
      });

      // Convert canvas to image
      const imgData = canvas.toDataURL('image/png');

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Calculate page height
      const pageHeight = 297; // A4 height in mm
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
      const fileName = `Kuitansi-${receipt?.order?.order_number || 'Receipt'}-${
        new Date().toISOString().split('T')[0]
      }.pdf`;

      // Save PDF
      pdf.save(fileName);

      // Dismiss loading and show success
      toast.dismiss(loadingToast);
      toast.success('PDF berhasil didownload!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal membuat PDF. Silakan coba lagi.');
    }
  };

  const handleShareLink = async () => {
    const receiptUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Kuitansi ${receipt?.order?.order_number || ''}`,
          text: `Kuitansi pembayaran dari ${receipt?.business?.name || ''}`,
          url: receiptUrl,
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(receiptUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch (err) {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(receiptUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } catch (clipboardErr) {
        console.error('Failed to copy link:', clipboardErr);
        alert('Gagal menyalin link. Silakan salin manual dari address bar.');
      }
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 animate-spin mx-auto text-blue-600 mb-4' />
          <p className='text-gray-600'>Memuat struk...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='max-w-md mx-auto px-4 text-center'>
          <div className='bg-white rounded-lg shadow-lg p-8'>
            <div className='bg-red-100 text-red-700 p-4 rounded-lg'>
              <p className='font-semibold text-lg mb-2'>
                Struk Tidak Ditemukan
              </p>
              <p className='text-sm'>
                {error || 'Link struk tidak valid atau sudah kadaluarsa'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { order, business, outlet, customer, cashier, items, payments } =
    receipt;

  return (
    <div className='min-h-screen bg-gray-50 py-8 print:py-0'>
      <div className='max-w-2xl mx-auto px-4'>
        {/* Action Buttons - Hidden when printing */}
        <div className='bg-white rounded-lg shadow-sm p-4 mb-6 print:hidden flex gap-3 justify-center'>
          <button
            onClick={handleDownloadPDF}
            className='bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center'
          >
            <Download className='w-4 h-4 mr-2' />
            Download PDF
          </button>
          <button
            onClick={handleShareLink}
            className='bg-green-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center'
          >
            {linkCopied ? (
              <>
                <Check className='w-4 h-4 mr-2' />
                Tersalin!
              </>
            ) : (
              <>
                <Share2 className='w-4 h-4 mr-2' />
                Bagikan
              </>
            )}
          </button>
        </div>

        {/* Receipt Card */}
        <div
          className='bg-white rounded-lg shadow-lg p-3 print:shadow-none'
          id='receipt-content'
        >
          {/* Header - Focus on Outlet */}
          <div className='text-center mb-2 border-b pb-2'>
            <div className='flex items-center justify-center mb-1'>
              <ReceiptIcon className='w-6 h-6 text-blue-600' />
            </div>
            <h1 className='text-base font-bold text-gray-900 mb-0.5'>
              {outlet.name || business.name}
            </h1>
            {outlet.address && (
              <div className='flex items-center justify-center mt-0.5 text-xs text-gray-600'>
                <MapPin className='w-3 h-3 mr-1' />
                <span className='text-xs'>{outlet.address}</span>
              </div>
            )}
            {(outlet.phone || business.phone) && (
              <div className='flex items-center justify-center mt-0.5 text-xs text-gray-600'>
                <Phone className='w-3 h-3 mr-1' />
                <span className='text-xs'>
                  {outlet.phone || business.phone}
                </span>
              </div>
            )}
            {outlet.email && (
              <div className='flex items-center justify-center mt-0.5 text-xs text-gray-600'>
                <span className='text-xs'>{outlet.email}</span>
              </div>
            )}
          </div>

          {/* Receipt Info */}
          <div className='mb-2 pb-2 border-b'>
            <div className='flex items-center justify-between mb-1.5'>
              <div>
                <p className='text-xs text-gray-600 mb-0.5'>Nomor Struk</p>
                <p className='text-sm font-bold text-gray-900 font-mono'>
                  {order.order_number}
                </p>
              </div>
              <div className='text-right'>
                <p className='text-xs text-gray-600 mb-0.5'>Tanggal</p>
                <p className='text-xs font-semibold text-gray-900'>
                  {new Date(order.created_at).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {customer && (
              <div className='mt-1.5 pt-1.5 border-t'>
                <div className='flex items-center mb-0.5'>
                  <User className='w-3 h-3 text-gray-600 mr-1' />
                  <p className='text-xs text-gray-600'>Pelanggan</p>
                </div>
                <p className='text-xs font-semibold text-gray-900'>
                  {customer.name}
                </p>
                {customer.phone && (
                  <p className='text-xs text-gray-600 mt-0.5'>
                    {customer.phone}
                  </p>
                )}
                {customer.email && (
                  <p className='text-xs text-gray-600'>{customer.email}</p>
                )}
              </div>
            )}

            {cashier && cashier.name && (
              <div className='mt-1.5 pt-1.5 border-t'>
                <p className='text-xs text-gray-600 mb-0.5'>Kasir</p>
                <p className='text-xs font-semibold text-gray-900'>
                  {cashier.name}
                </p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className='mb-2 pb-2 border-b'>
            <h3 className='font-semibold text-xs mb-1.5 flex items-center'>
              <Package className='w-3 h-3 mr-1 text-gray-600' />
              Detail Pesanan
            </h3>
            <div className='space-y-1'>
              {items.map((item, index) => {
                const itemNotes = item.notes || item.note || null;
                return (
                  <div key={index} className='flex justify-between items-start'>
                    <div className='flex-1'>
                      <p className='text-xs font-medium text-gray-900'>
                        {item.product_name}
                      </p>
                      {item.variant_name && (
                        <p className='text-xs text-gray-600'>
                          Varian: {item.variant_name}
                        </p>
                      )}
                      <p className='text-xs text-gray-600 mt-0.5'>
                        {item.quantity} x Rp {formatCurrency(item.price)}
                      </p>
                      {/* ✅ NEW: Tampilkan catatan jika ada */}
                      {itemNotes && (
                        <p className='text-xs text-blue-600 italic mt-0.5'>
                          📝 {itemNotes}
                        </p>
                      )}
                    </div>
                    <p className='text-xs font-semibold text-gray-900'>
                      Rp {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Summary */}
          <div className='mb-2 pb-2 border-b'>
            <h3 className='font-semibold text-xs mb-1.5 flex items-center'>
              <CreditCard className='w-3 h-3 mr-1 text-gray-600' />
              Ringkasan Pembayaran
            </h3>
            <div className='space-y-0.5'>
              <div className='flex justify-between text-xs'>
                <span className='text-gray-600'>Subtotal</span>
                <span className='font-medium text-gray-900'>
                  Rp {formatCurrency(order.subtotal)}
                </span>
              </div>

              {order.discount_amount > 0 && (
                <div className='flex justify-between text-xs'>
                  <span className='text-green-600'>
                    Diskon {order.coupon_code && `(${order.coupon_code})`}
                  </span>
                  <span className='font-medium text-green-600'>
                    - Rp {formatCurrency(order.discount_amount)}
                  </span>
                </div>
              )}

              {order.tax_amount > 0 && (
                <div className='flex justify-between text-xs'>
                  <span className='text-gray-600'>Pajak</span>
                  <span className='font-medium text-gray-900'>
                    Rp {formatCurrency(order.tax_amount)}
                  </span>
                </div>
              )}

              <div className='pt-1.5 border-t mt-1.5'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm font-semibold'>Total</span>
                  <span className='text-base font-bold text-blue-600'>
                    Rp {formatCurrency(order.total)}
                  </span>
                </div>
              </div>

              <div className='flex justify-between mt-1 text-xs'>
                <span className='text-gray-600'>Dibayar</span>
                <span className='font-medium text-gray-900'>
                  Rp {formatCurrency(order.paid_amount)}
                </span>
              </div>

              {order.change_amount > 0 && (
                <div className='flex justify-between text-xs'>
                  <span className='text-gray-600'>Kembalian</span>
                  <span className='font-medium text-green-600'>
                    Rp {formatCurrency(order.change_amount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          {payments && payments.length > 0 && (
            <div className='mb-2 pb-2 border-b'>
              <h3 className='font-semibold text-xs mb-1.5'>
                Metode Pembayaran
              </h3>
              <div className='space-y-1'>
                {payments.map((payment, index) => {
                  const methodLabels = {
                    cash: 'Tunai',
                    card: 'Kartu Debit/Kredit',
                    transfer: 'Transfer Bank',
                    qris: 'QRIS',
                    midtrans: 'Midtrans',
                  };
                  return (
                    <div
                      key={index}
                      className='flex justify-between items-center p-1.5 bg-gray-50 rounded'
                    >
                      <div>
                        <p className='text-xs font-medium text-gray-900'>
                          {methodLabels[payment.method] || payment.method}
                        </p>
                        {payment.paid_at && (
                          <p className='text-xs text-gray-600 mt-0.5'>
                            {new Date(payment.paid_at).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                      <p className='text-xs font-semibold text-gray-900'>
                        Rp {formatCurrency(payment.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className='mb-2 pb-2 border-b'>
              <p className='text-xs text-gray-600 mb-0.5'>Catatan</p>
              <p className='text-xs text-gray-900'>{order.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className='text-center pt-2 border-t'>
            <p className='text-xs text-gray-600 mb-0.5'>
              Terima kasih atas kunjungan Anda!
            </p>
            <p className='text-xs text-gray-500'>
              Struk ini adalah bukti pembayaran yang sah
            </p>
            <p className='text-xs text-gray-500 mt-0.5'>
              {new Date().toLocaleString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
