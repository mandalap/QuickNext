import React from 'react';

/**
 * Component for printing shift closing receipt (Thermal 58mm format)
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
    <div className="print-only" style={{ display: 'none' }}>
      <style>{`
        @media print {
          @page {
            size: 58mm auto;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .print-only {
            display: block !important;
            width: 58mm;
            font-family: 'Courier New', monospace;
            font-size: 9pt;
            padding: 2mm;
          }

          .print-center {
            text-align: center;
          }

          .print-bold {
            font-weight: bold;
          }

          .print-separator {
            border-top: 1px dashed #000;
            margin: 2mm 0;
          }

          .print-row {
            display: flex;
            justify-content: space-between;
            margin: 1mm 0;
          }

          .print-title {
            font-size: 11pt;
            font-weight: bold;
            margin: 2mm 0;
          }

          .print-section {
            margin: 3mm 0;
          }
        }
      `}</style>

      <div className="print-content">
        {/* Header - Focus on Outlet */}
        <div className="print-center print-title">
          LAPORAN TUTUP SHIFT
        </div>
        <div className="print-center">
          {shiftData.outlet?.name || shiftData.business?.name || 'POS System'}
        </div>
        {shiftData.outlet?.address && (
          <div className="print-center">
            {shiftData.outlet.address}
          </div>
        )}
        {shiftData.outlet?.phone && (
          <div className="print-center">
            Tel: {shiftData.outlet.phone}
          </div>
        )}
        <div className="print-separator"></div>

        {/* Shift Info */}
        <div className="print-section">
          <div className="print-bold">INFORMASI SHIFT</div>
          <div className="print-row">
            <span>Shift</span>
            <span>{shiftData.shift_name}</span>
          </div>
          <div className="print-row">
            <span>Kasir</span>
            <span>{shiftData.user?.name || 'N/A'}</span>
          </div>
          <div className="print-row">
            <span>ID Shift</span>
            <span>#{shiftData.id}</span>
          </div>
        </div>
        <div className="print-separator"></div>

        {/* Time Info */}
        <div className="print-section">
          <div className="print-row">
            <span>Buka</span>
            <span>{formatDate(shiftData.opened_at)}</span>
          </div>
          <div className="print-row">
            <span>Tutup</span>
            <span>{formatDate(shiftData.closed_at || new Date())}</span>
          </div>
          <div className="print-row">
            <span>Durasi</span>
            <span>{calculateDuration()}</span>
          </div>
        </div>
        <div className="print-separator"></div>

        {/* Transaction Summary */}
        <div className="print-section">
          <div className="print-bold">RINGKASAN TRANSAKSI</div>
          <div className="print-row">
            <span>Total Transaksi</span>
            <span>{shiftData.total_transactions || 0}x</span>
          </div>
          <div className="print-row">
            <span>Total Item</span>
            <span>{shiftData.total_items || 0}</span>
          </div>
          <div className="print-row print-bold">
            <span>Total Penjualan</span>
            <span>{formatCurrency(shiftData.expected_total)}</span>
          </div>
        </div>
        <div className="print-separator"></div>

        {/* Payment Breakdown */}
        <div className="print-section">
          <div className="print-bold">RINCIAN PEMBAYARAN</div>
          {paymentBreakdown.cash && paymentBreakdown.cash.cash_sales > 0 && (
            <div className="print-row">
              <span>Cash ({paymentBreakdown.cash.transactions}x)</span>
              <span>{formatCurrency(paymentBreakdown.cash.cash_sales)}</span>
            </div>
          )}
          {paymentBreakdown.card && paymentBreakdown.card.amount > 0 && (
            <div className="print-row">
              <span>Card ({paymentBreakdown.card.transactions}x)</span>
              <span>{formatCurrency(paymentBreakdown.card.amount)}</span>
            </div>
          )}
          {paymentBreakdown.transfer && paymentBreakdown.transfer.amount > 0 && (
            <div className="print-row">
              <span>Transfer ({paymentBreakdown.transfer.transactions}x)</span>
              <span>{formatCurrency(paymentBreakdown.transfer.amount)}</span>
            </div>
          )}
          {paymentBreakdown.qris && paymentBreakdown.qris.amount > 0 && (
            <div className="print-row">
              <span>QRIS ({paymentBreakdown.qris.transactions}x)</span>
              <span>{formatCurrency(paymentBreakdown.qris.amount)}</span>
            </div>
          )}
          <div className="print-separator"></div>
          <div className="print-row print-bold">
            <span>Total</span>
            <span>{formatCurrency(
              Number(paymentBreakdown.cash.cash_sales || 0) +
              Number(paymentBreakdown.card.amount || 0) +
              Number(paymentBreakdown.transfer.amount || 0) +
              Number(paymentBreakdown.qris.amount || 0)
            )}</span>
          </div>
        </div>
        <div className="print-separator"></div>

        {/* Cash Calculation */}
        <div className="print-section">
          <div className="print-bold">PERHITUNGAN KAS</div>
          <div className="print-row">
            <span>Modal Awal</span>
            <span>{formatCurrency(shiftData.opening_balance)}</span>
          </div>
          <div className="print-row">
            <span>Penjualan Cash</span>
            <span>{formatCurrency(paymentBreakdown.cash.cash_sales)}</span>
          </div>
          <div className="print-separator"></div>
          <div className="print-row print-bold">
            <span>Kas Seharusnya</span>
            <span>{formatCurrency(Number(shiftData.opening_balance) + Number(paymentBreakdown.cash.cash_sales))}</span>
          </div>
          <div className="print-row">
            <span>Kas Aktual</span>
            <span>{formatCurrency(actualCash)}</span>
          </div>
          <div className="print-separator"></div>
          <div className="print-row print-bold">
            <span>Selisih</span>
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
            <div className="print-separator"></div>
            <div className="print-section">
              <div className="print-bold">CATATAN</div>
              <div style={{ marginTop: '1mm', whiteSpace: 'pre-wrap' }}>
                {closingNotes}
              </div>
            </div>
          </>
        )}

        <div className="print-separator"></div>

        {/* Footer */}
        <div className="print-center" style={{ marginTop: '3mm' }}>
          <div>Ditutup oleh: {shiftData.user?.name || 'N/A'}</div>
          <div style={{ marginTop: '1mm', fontSize: '8pt' }}>
            Dicetak: {formatDate(new Date())}
          </div>
        </div>
        <div className="print-center" style={{ marginTop: '3mm', fontSize: '8pt' }}>
          Terima kasih atas kerja keras Anda!
        </div>
      </div>
    </div>
  );
};

export default PrintShiftReceipt;
