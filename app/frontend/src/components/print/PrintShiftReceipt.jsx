import React from 'react';
import '../../styles/thermal-printer.css';

/**
 * Component for printing shift closing receipt (Thermal 80mm format)
 * Menggunakan thermal-printer.css untuk konsistensi dengan receipt biasa
 */
const PrintShiftReceipt = ({ shiftData, paymentBreakdown, actualCash, closingNotes }) => {
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

  const calculateDuration = () => {
    const opened = new Date(shiftData.opened_at);
    const closed = new Date(shiftData.closed_at || new Date());
    const diffMs = closed - opened;
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHrs} jam ${diffMins} menit`;
  };

  const calculateDifference = () => {
    const expected = Number(shiftData.opening_balance) + Number(paymentBreakdown.cash.cash_sales);
    const actual = Number(actualCash);
    return actual - expected;
  };

  return (
    <div className="receipt-content thermal-receipt">
      {/* Header - Focus on Outlet/Business */}
      <div className="receipt-header">
        <div className="receipt-title">LAPORAN TUTUP SHIFT</div>
        <div className="store-name">
          {shiftData.outlet?.name || shiftData.business?.name || 'POS System'}
        </div>
        {shiftData.outlet?.address && (
          <div className="store-address">
            {shiftData.outlet.address}
          </div>
        )}
        {shiftData.outlet?.phone && (
          <div className="store-phone">
            {shiftData.outlet.phone}
          </div>
        )}
      </div>
      <div className="receipt-separator"></div>

      {/* Shift Info */}
      <div className="receipt-section">
        <div className="section-title">INFORMASI SHIFT</div>
        <div className="receipt-row">
          <span>Shift:</span>
          <span>{shiftData.shift_name}</span>
        </div>
        <div className="receipt-row">
          <span>Kasir:</span>
          <span>{shiftData.user?.name || 'N/A'}</span>
        </div>
        <div className="receipt-row">
          <span>ID Shift:</span>
          <span>#{shiftData.id}</span>
        </div>
      </div>
      <div className="receipt-separator"></div>

      {/* Time Info */}
      <div className="receipt-section">
        <div className="receipt-row">
          <span>Buka:</span>
          <span>{formatDate(shiftData.opened_at)}</span>
        </div>
        <div className="receipt-row">
          <span>Tutup:</span>
          <span>{formatDate(shiftData.closed_at || new Date())}</span>
        </div>
        <div className="receipt-row">
          <span>Durasi:</span>
          <span>{calculateDuration()}</span>
        </div>
      </div>
      <div className="receipt-separator"></div>

      {/* Transaction Summary */}
      <div className="receipt-section">
        <div className="section-title">RINGKASAN TRANSAKSI</div>
        <div className="receipt-row">
          <span>Total Transaksi:</span>
          <span>{shiftData.total_transactions || 0}x</span>
        </div>
        <div className="receipt-row">
          <span>Total Item:</span>
          <span>{shiftData.total_items || 0}</span>
        </div>
        <div className="receipt-row receipt-total">
          <span>Total Penjualan:</span>
          <span>{formatCurrency(shiftData.expected_total)}</span>
        </div>
      </div>
      <div className="receipt-separator"></div>

      {/* Payment Breakdown */}
      <div className="receipt-section">
        <div className="section-title">RINCIAN PEMBAYARAN</div>
        {paymentBreakdown.cash && paymentBreakdown.cash.cash_sales > 0 && (
          <div className="receipt-row">
            <span>Cash ({paymentBreakdown.cash.transactions}x):</span>
            <span>{formatCurrency(paymentBreakdown.cash.cash_sales)}</span>
          </div>
        )}
        {paymentBreakdown.card && paymentBreakdown.card.amount > 0 && (
          <div className="receipt-row">
            <span>Card ({paymentBreakdown.card.transactions}x):</span>
            <span>{formatCurrency(paymentBreakdown.card.amount)}</span>
          </div>
        )}
        {paymentBreakdown.transfer && paymentBreakdown.transfer.amount > 0 && (
          <div className="receipt-row">
            <span>Transfer ({paymentBreakdown.transfer.transactions}x):</span>
            <span>{formatCurrency(paymentBreakdown.transfer.amount)}</span>
          </div>
        )}
        {paymentBreakdown.qris && paymentBreakdown.qris.amount > 0 && (
          <div className="receipt-row">
            <span>QRIS ({paymentBreakdown.qris.transactions}x):</span>
            <span>{formatCurrency(paymentBreakdown.qris.amount)}</span>
          </div>
        )}
        <div className="receipt-separator"></div>
        <div className="receipt-row receipt-total">
          <span>Total:</span>
          <span>{formatCurrency(
            Number(paymentBreakdown.cash.cash_sales || 0) +
            Number(paymentBreakdown.card.amount || 0) +
            Number(paymentBreakdown.transfer.amount || 0) +
            Number(paymentBreakdown.qris.amount || 0)
          )}</span>
        </div>
      </div>
      <div className="receipt-separator"></div>

      {/* Cash Calculation */}
      <div className="receipt-section">
        <div className="section-title">PERHITUNGAN KAS</div>
        <div className="receipt-row">
          <span>Modal Awal:</span>
          <span>{formatCurrency(shiftData.opening_balance)}</span>
        </div>
        <div className="receipt-row">
          <span>Penjualan Cash:</span>
          <span>{formatCurrency(paymentBreakdown.cash.cash_sales)}</span>
        </div>
        <div className="receipt-separator"></div>
        <div className="receipt-row receipt-total">
          <span>Kas Seharusnya:</span>
          <span>{formatCurrency(Number(shiftData.opening_balance) + Number(paymentBreakdown.cash.cash_sales))}</span>
        </div>
        <div className="receipt-row">
          <span>Kas Aktual:</span>
          <span>{formatCurrency(actualCash)}</span>
        </div>
        <div className="receipt-separator"></div>
        <div className="receipt-row receipt-total">
          <span>Selisih:</span>
          <span>
            {calculateDifference() === 0 ? '✓ ' : ''}
            {formatCurrency(Math.abs(calculateDifference()))}
            {calculateDifference() > 0 ? ' (Lebih)' : calculateDifference() < 0 ? ' (Kurang)' : ' (Sesuai)'}
          </span>
        </div>
      </div>

      {/* Closing Notes */}
      {closingNotes && (
        <>
          <div className="receipt-separator"></div>
          <div className="receipt-section">
            <div className="section-title">CATATAN</div>
            <div className="receipt-notes">
              {closingNotes}
            </div>
          </div>
        </>
      )}

      <div className="receipt-separator"></div>

      {/* Footer */}
      <div className="receipt-footer">
        <div className="receipt-row">
          <span>Ditutup oleh:</span>
          <span>{shiftData.user?.name || 'N/A'}</span>
        </div>
        <div className="printed-time">
          Dicetak: {formatDate(new Date())}
        </div>
        <div className="receipt-thanks">
          Terima kasih atas kerja keras Anda!
        </div>
      </div>
    </div>
  );
};

export default PrintShiftReceipt;
