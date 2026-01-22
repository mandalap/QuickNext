import { Printer, Download, X } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const PayrollSlipModal = ({ isOpen, onClose, payroll }) => {
  const printRef = useRef(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  if (!payroll) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Slip Gaji</DialogTitle>
          <DialogDescription>
            {payroll.employee?.user?.name || payroll.employee?.name || 'N/A'}
          </DialogDescription>
        </DialogHeader>

        <div ref={printRef} className="space-y-6 print:p-8">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold">SLIP GAJI</h2>
            <p className="text-sm text-gray-600 mt-1">
              Periode:{' '}
              {new Date(payroll.period_start).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              -{' '}
              {new Date(payroll.period_end).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Employee Info */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Nama:</span>
              <span className="font-medium">
                {payroll.employee?.user?.name || payroll.employee?.name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nomor Payroll:</span>
              <span className="font-medium">{payroll.payroll_number}</span>
            </div>
          </div>

          {/* Earnings */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Pendapatan</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Gaji Pokok</span>
                <span>{formatCurrency(payroll.base_salary)}</span>
              </div>
              {payroll.overtime_pay > 0 && (
                <div className="flex justify-between">
                  <span>Lembur ({payroll.overtime_hours} jam)</span>
                  <span>{formatCurrency(payroll.overtime_pay)}</span>
                </div>
              )}
              {payroll.commission > 0 && (
                <div className="flex justify-between">
                  <span>Komisi</span>
                  <span>{formatCurrency(payroll.commission)}</span>
                </div>
              )}
              {payroll.bonus > 0 && (
                <div className="flex justify-between">
                  <span>Bonus</span>
                  <span>{formatCurrency(payroll.bonus)}</span>
                </div>
              )}
              {payroll.allowance > 0 && (
                <div className="flex justify-between">
                  <span>Tunjangan</span>
                  <span>{formatCurrency(payroll.allowance)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-2 mt-2">
                <span>Total Pendapatan</span>
                <span>{formatCurrency(payroll.gross_salary)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Potongan</h3>
            <div className="space-y-1">
              {payroll.late_penalty > 0 && (
                <div className="flex justify-between">
                  <span>Denda Terlambat ({payroll.late_count}x)</span>
                  <span className="text-red-600">
                    -{formatCurrency(payroll.late_penalty)}
                  </span>
                </div>
              )}
              {payroll.absent_penalty > 0 && (
                <div className="flex justify-between">
                  <span>Denda Tidak Hadir ({payroll.absent_count} hari)</span>
                  <span className="text-red-600">
                    -{formatCurrency(payroll.absent_penalty)}
                  </span>
                </div>
              )}
              {payroll.other_deductions > 0 && (
                <div className="flex justify-between">
                  <span>Potongan Lainnya</span>
                  <span className="text-red-600">
                    -{formatCurrency(payroll.other_deductions)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-2 mt-2">
                <span>Total Potongan</span>
                <span className="text-red-600">
                  -{formatCurrency(payroll.total_deductions)}
                </span>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div className="border-t-2 pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Gaji Bersih</span>
              <span className="text-green-600">{formatCurrency(payroll.net_salary)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p>Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollSlipModal;

