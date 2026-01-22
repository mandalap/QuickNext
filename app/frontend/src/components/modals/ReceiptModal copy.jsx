import JsBarcode from 'jsbarcode';
import { Printer, Receipt, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import '../../styles/thermal-printer.css';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const ReceiptModal = ({ open, onClose, receiptData }) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (open && receiptData && barcodeRef.current) {
      try {
        const barcodeValue = receiptData.orderNumber || 'N/A';
        if (barcodeValue !== 'N/A') {
          JsBarcode(barcodeRef.current, barcodeValue, {
            format: 'CODE128',
            width: 2,
            height: 50,
            displayValue: false,
            margin: 0,
          });
        }
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [open, receiptData]);

  const handlePrint = () => {
    window.print();
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

  if (!receiptData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:p-0">
        <DialogHeader className="print:hidden">
          <DialogTitle className="text-xl font-bold flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-blue-600" />
            Struk Pembayaran
          </DialogTitle>
        </DialogHeader>

        {/* Receipt Content - Thermal Design */}
        <div className="receipt-content print:bg-white print:text-black thermal-receipt">
          {/* HEADER */}
          <div className="receipt-header">
            <div className="store-name">
              {receiptData.outletName || receiptData.businessName || 'KASIR POS SYSTEM'}
            </div>
            {(receiptData.outletAddress || receiptData.businessAddress) && (
              <div className="store-address">
                {receiptData.outletAddress || receiptData.businessAddress}
              </div>
            )}
            {(receiptData.outletPhone || receiptData.businessPhone) && (
              <div className="store-phone">
                {receiptData.outletPhone || receiptData.businessPhone}
              </div>
            )}
          </div>

          <hr className="divider" />

          {/* TRANSACTION INFO */}
          <div className="transaction-info">
            <div className="info-row">
              <span className="info-label">No. Struk</span>
              <span className="info-value">{receiptData.orderNumber || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Tanggal</span>
              <span className="info-value">
                {new Date(receiptData.date || new Date()).toLocaleString('id-ID', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Kasir</span>
              <span className="info-value">{receiptData.cashierName || 'Kasir'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Pelanggan</span>
              <span className="info-value">
                {receiptData.customerName || 'Walk-in Customer'}
              </span>
            </div>
            {receiptData.queueNumber && (
              <div className="info-row">
                <span className="info-label">No. Antrian</span>
                <span className="info-value">{receiptData.queueNumber}</span>
              </div>
            )}
          </div>

          <hr className="divider" />

          {/* ITEMS SECTION */}
          <div className="items-section">
            {(receiptData.items || []).map((item, index) => (
              <div key={index} className="item-block">
                <div className="item-name-row">{item.name || 'N/A'}</div>
                {/* ✅ Tampilkan catatan jika ada */}
                {item.notes && (
                  <div
                    className="item-notes-row"
                    style={{
                      fontSize: '10pt',
                      color: '#666',
                      fontStyle: 'italic',
                      marginTop: '2pt',
                      marginBottom: '2pt',
                    }}
                  >
                    📝 {item.notes}
                  </div>
                )}
                <div className="item-details-row">
                  <span className="item-qty-price">
                    {item.quantity || 0}x @{formatCurrency(item.price || 0)}
                  </span>
                  <span className="item-subtotal">
                    {formatCurrency((item.price || 0) * (item.quantity || 0))}
                  </span>
                </div>
                {index < (receiptData.items || []).length - 1 && (
                  <div className="item-divider"></div>
                )}
              </div>
            ))}
          </div>

          <hr className="divider" />

          {/* TOTALS SECTION */}
          <div className="totals-section">
            <div className="total-row">
              <span>Subtotal</span>
              <span>{formatCurrencyWithRp(receiptData.subtotal || 0)}</span>
            </div>
            {receiptData.discount > 0 && (
              <div className="total-row discount">
                <span>
                  Diskon
                  {receiptData.discountCode ? ` (${receiptData.discountCode})` : ''}
                </span>
                <span>-{formatCurrencyWithRp(receiptData.discount)}</span>
              </div>
            )}
            {receiptData.tax > 0 && (
              <div className="total-row">
                <span>PPN</span>
                <span>{formatCurrencyWithRp(receiptData.tax || 0)}</span>
              </div>
            )}
            <div className="total-row grand-total">
              <span>GRAND TOTAL</span>
              <span>{formatCurrencyWithRp(receiptData.total || 0)}</span>
            </div>
          </div>

          <hr className="divider" />

          {/* PAYMENT SECTION */}
          <div className="payment-section">
            <div className="payment-row">
              <span>Metode Bayar</span>
              <span className="payment-method">
                {(receiptData.paymentMethod || 'CASH').toUpperCase()}
              </span>
            </div>
            <div className="payment-row">
              <span>Jumlah Bayar</span>
              <span>{formatCurrencyWithRp(receiptData.amountPaid || 0)}</span>
            </div>
            <div className="payment-row">
              <span>Kembalian</span>
              <span>{formatCurrencyWithRp(receiptData.change || 0)}</span>
            </div>
          </div>

          <hr className="divider" />

          {/* FOOTER SECTION */}
          <div className="footer">
            <div className="barcode-placeholder">
              {/* Scannable barcode generated from receipt number */}
              <div className="barcode-svg-container">
                <svg ref={barcodeRef}></svg>
              </div>
              <div className="receipt-number-barcode">
                {receiptData.orderNumber || ''}
              </div>
            </div>
            <div className="thank-you">Terima Kasih!</div>
            <div className="footer-message">
              {receiptData.footerMessage ||
                'Simpan struk ini sebagai bukti pembayaran'}
            </div>
            <div className="printed-time">
              Dicetak: {new Date().toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 print:hidden">
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Tutup
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Cetak Struk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptModal;
