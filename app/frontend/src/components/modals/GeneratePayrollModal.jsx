import { X, Loader2, Calculator, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { queryKeys } from '../../config/reactQuery';
import payrollService from '../../services/payroll.service';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const GeneratePayrollModal = ({
  isOpen,
  onClose,
  employees = [],
  employeesLoading = false,
  defaultYear,
  defaultMonth,
}) => {
  const { currentBusiness } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debug: Log employees data
  useEffect(() => {
    if (isOpen) {
      console.log('📋 GeneratePayrollModal: Employees data', {
        employeesCount: employees?.length || 0,
        employees: employees,
        isArray: Array.isArray(employees),
        currentBusiness: currentBusiness?.id,
        filteredEmployees: employees?.filter((emp) => {
          const isActive = emp.is_active;
          return isActive === true || isActive === 1 || isActive === undefined || isActive === null;
        }).length || 0,
      });
    }
  }, [isOpen, employees, currentBusiness]);

  const [formData, setFormData] = useState({
    employee_id: 'all',
    year: defaultYear || new Date().getFullYear(),
    month: defaultMonth || new Date().getMonth() + 1,
    late_penalty_per_occurrence: 50000,
    absent_penalty_per_day: 0, // Will be calculated as 1 day salary
    overtime_rate: 0, // Will be calculated as 1.5x hourly rate
    bonus: 0,
    allowance: 0,
    other_deductions: 0,
    notes: '',
  });

  const [generateForAll, setGenerateForAll] = useState(false);

  // Generate payroll mutation
  const generateMutation = useMutation({
    mutationFn: async (data) => {
      if (generateForAll) {
        const result = await payrollService.generateAllPayrolls(data);
        if (!result.success) {
          throw new Error(result.message || 'Failed to generate payrolls');
        }
        return result;
      } else {
        const result = await payrollService.generatePayroll(data);
        if (!result.success) {
          throw new Error(result.message || 'Failed to generate payroll');
        }
        return result;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payrolls.list(currentBusiness?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.payrolls.stats(currentBusiness?.id),
      });
      toast({
        title: 'Berhasil',
        description: generateForAll
          ? `Payroll berhasil digenerate untuk ${data.count || 0} karyawan`
          : 'Payroll berhasil digenerate',
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Gagal',
        description: error.message || 'Gagal generate payroll',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!generateForAll && (!formData.employee_id || formData.employee_id === 'all')) {
      toast({
        title: 'Error',
        description: 'Pilih karyawan atau pilih "Generate untuk semua karyawan"',
        variant: 'destructive',
      });
      return;
    }

    const submitData = {
      year: formData.year,
      month: formData.month,
      late_penalty_per_occurrence: formData.late_penalty_per_occurrence || undefined,
      absent_penalty_per_day: formData.absent_penalty_per_day || undefined,
      overtime_rate: formData.overtime_rate || undefined,
      bonus: formData.bonus || 0,
      allowance: formData.allowance || 0,
      other_deductions: formData.other_deductions || 0,
      notes: formData.notes || undefined,
    };

    if (!generateForAll) {
      submitData.employee_id = parseInt(formData.employee_id);
    }

    generateMutation.mutate(submitData);
  };

  // Format currency input
  const formatCurrencyInput = (value) => {
    if (!value) return '';
    const numericValue = value.toString().replace(/\D/g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleCurrencyChange = (field, value) => {
    const numericValue = value.replace(/\./g, '');
    setFormData((prev) => ({
      ...prev,
      [field]: numericValue ? parseInt(numericValue) : 0,
    }));
  };

  // Month options
  const monthOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  // Year options: 5 years back and 5 years forward
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let i = 5; i >= 0; i--) {
    yearOptions.push(currentYear - i); // Past years
  }
  for (let i = 1; i <= 5; i++) {
    yearOptions.push(currentYear + i); // Future years
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Generate Payroll
          </DialogTitle>
          <DialogDescription>
            Generate perhitungan gaji dan denda telat otomatis untuk karyawan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Generate for all toggle */}
          <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              id="generateForAll"
              checked={generateForAll}
              onChange={(e) => setGenerateForAll(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="generateForAll" className="text-sm font-medium text-gray-700">
              Generate untuk semua karyawan aktif
            </label>
          </div>

          {/* Employee selection (if not generate for all) */}
          {!generateForAll && (
            <div>
              <Label htmlFor="employee_id">Karyawan *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, employee_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // Filter active employees
                    const activeEmployees = employees?.filter((emp) => {
                      const isActive = emp.is_active;
                      // Include if is_active is true, 1, or undefined/null (assume active)
                      return isActive === true || isActive === 1 || isActive === undefined || isActive === null;
                    }) || [];

                    if (activeEmployees.length > 0) {
                      return activeEmployees.map((emp) => {
                        const employeeName = emp.name || emp.user?.name || `Karyawan #${emp.id}`;
                        return (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {employeeName}
                          </SelectItem>
                        );
                      });
                    } else {
                      return (
                        <div className="px-2 py-1.5 text-sm text-gray-500">
                          {employeesLoading 
                            ? 'Memuat data karyawan...' 
                            : employees && employees.length > 0 
                            ? 'Tidak ada karyawan aktif' 
                            : 'Tidak ada karyawan tersedia'}
                        </div>
                      );
                    }
                  })()}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Year and Month */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Tahun *</Label>
              <Select
                value={formData.year.toString()}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, year: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="month">Bulan *</Label>
              <Select
                value={formData.month.toString()}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, month: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Penalty rates */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Pengaturan Denda</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="late_penalty_per_occurrence">
                  Denda Terlambat per Kali (Rp)
                </Label>
                <Input
                  id="late_penalty_per_occurrence"
                  value={formatCurrencyInput(formData.late_penalty_per_occurrence)}
                  onChange={(e) =>
                    handleCurrencyChange('late_penalty_per_occurrence', e.target.value)
                  }
                  placeholder="50.000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kosongkan untuk menggunakan default (Rp 50.000)
                </p>
              </div>

              <div>
                <Label htmlFor="absent_penalty_per_day">
                  Denda Tidak Hadir per Hari (Rp)
                </Label>
                <Input
                  id="absent_penalty_per_day"
                  value={formatCurrencyInput(formData.absent_penalty_per_day)}
                  onChange={(e) =>
                    handleCurrencyChange('absent_penalty_per_day', e.target.value)
                  }
                  placeholder="Auto (1 hari gaji)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kosongkan untuk menggunakan default (1 hari gaji)
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="overtime_rate">Rate Lembur per Jam (Rp)</Label>
              <Input
                id="overtime_rate"
                value={formatCurrencyInput(formData.overtime_rate)}
                onChange={(e) => handleCurrencyChange('overtime_rate', e.target.value)}
                placeholder="Auto (1.5x gaji per jam)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Kosongkan untuk menggunakan default (1.5x gaji per jam)
              </p>
            </div>
          </div>

          {/* Additional earnings/deductions */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Tambahan</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bonus">Bonus (Rp)</Label>
                <Input
                  id="bonus"
                  type="text"
                  value={formatCurrencyInput(formData.bonus)}
                  onChange={(e) => handleCurrencyChange('bonus', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="allowance">Tunjangan (Rp)</Label>
                <Input
                  id="allowance"
                  type="text"
                  value={formatCurrencyInput(formData.allowance)}
                  onChange={(e) => handleCurrencyChange('allowance', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="other_deductions">Potongan Lainnya (Rp)</Label>
                <Input
                  id="other_deductions"
                  type="text"
                  value={formatCurrencyInput(formData.other_deductions)}
                  onChange={(e) => handleCurrencyChange('other_deductions', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Catatan</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Catatan tambahan (opsional)"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Generate Payroll
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GeneratePayrollModal;

