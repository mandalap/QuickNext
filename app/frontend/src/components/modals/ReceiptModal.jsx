import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Receipt, Printer, Download, X } from 'lucide-react';

const ReceiptModal = ({ open, onClose, receiptData }) => {
  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = date => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!receiptData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-blue-600" />
            Struk Pembayaran
          </DialogTitle>
        </DialogHeader>

        {/* Receipt Content - This will be printed */}
        <div
          className="bg-white p-6 print:p-8"
          style={{ fontFamily: 'monospace' }}
        >
          {/* Outlet Header - Focus on Outlet Details */}
          <div className="text-center border-b-2 border-dashed pb-4 mb-4">
            <h2 className="text-xl font-bold mb-1">
              {receiptData.outletName || receiptData.businessName || 'KASIR POS SYSTEM'}
            </h2>
            {(receiptData.outletAddress || receiptData.businessAddress) && (
              <p className="text-xs text-gray-600">
                {receiptData.outletAddress || receiptData.businessAddress || ''}
              </p>
            )}
            {(receiptData.outletPhone || receiptData.businessPhone) && (
              <p className="text-xs text-gray-600">
                Tel: {receiptData.outletPhone || receiptData.businessPhone || ''}
              </p>
            )}
            {receiptData.outletEmail && (
              <p className="text-xs text-gray-600">
                Email: {receiptData.outletEmail}
              </p>
            )}
          </div>

          {/* Transaction Info */}
          <div className="text-sm space-y-1 mb-4">
            <div className="flex justify-between">
              <span>No. Order:</span>
              <span className="font-bold">
                {receiptData.orderNumber || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal:</span>
              <span>{formatDate(receiptData.date || new Date())}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{receiptData.cashierName || '-'}</span>
            </div>
            {receiptData.customerName && (
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span>{receiptData.customerName}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="border-t-2 border-b-2 border-dashed py-3 mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Item</th>
                  <th className="text-center py-1">Qty</th>
                  <th className="text-right py-1">Harga</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {receiptData.items?.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr className="border-b">
                      <td className="py-2 text-left">
                        <div>
                          {item.name}
                          {/* ✅ NEW: Tampilkan catatan jika ada */}
                          {item.notes && (
                            <div className="text-xs text-blue-600 italic mt-1">
                              📝 {item.notes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-2 text-right font-semibold">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="text-sm space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(receiptData.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pajak (10%):</span>
              <span>{formatCurrency(receiptData.tax || 0)}</span>
            </div>
            {receiptData.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>
                  Diskon{receiptData.discountCode ? ` (${receiptData.discountCode})` : ''}:
                </span>
                <span>-{formatCurrency(receiptData.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t-2 border-dashed pt-2">
              <span>TOTAL:</span>
              <span>{formatCurrency(receiptData.total || 0)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="text-sm space-y-1 border-t-2 border-dashed pt-3 mb-4">
            <div className="flex justify-between">
              <span>Metode:</span>
              <span className="font-semibold uppercase">
                {receiptData.paymentMethod || 'CASH'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Bayar:</span>
              <span>{formatCurrency(receiptData.amountPaid || 0)}</span>
            </div>
            {receiptData.change > 0 && (
              <div className="flex justify-between font-bold">
                <span>Kembalian:</span>
                <span>{formatCurrency(receiptData.change)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs border-t-2 border-dashed pt-4 space-y-1">
            <p className="font-semibold">Terima Kasih atas Kunjungan Anda!</p>
            <p className="text-gray-600">
              {receiptData.footerMessage || 'Barang yang sudah dibeli tidak dapat dikembalikan'}
            </p>
            <p className="text-gray-500 mt-2">
              Powered by QuickKasir
            </p>
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
