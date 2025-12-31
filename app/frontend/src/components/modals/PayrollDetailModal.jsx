import { X, Loader2, DollarSign, TrendingUp, TrendingDown, Edit, Save, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { queryKeys } from '../../config/reactQuery';
import payrollService from '../../services/payroll.service';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const PayrollDetailModal = ({ isOpen, onClose, payroll, canManage, onUpdate, initialEditMode = false }) => {
  const { currentBusiness } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [formData, setFormData] = useState({
    bonus: 0,
    allowance: 0,
    other_deductions: 0,
    notes: '',
    status: 'draft',
  });

  // Initialize form data when payroll changes
  useEffect(() => {
    if (payroll) {
      setFormData({
        bonus: payroll.bonus || 0,
        allowance: payroll.allowance || 0,
        other_deductions: payroll.other_deductions || 0,
        notes: payroll.notes || '',
        status: payroll.status || 'draft',
      });
      setIsEditing(initialEditMode);
    }
  }, [payroll, initialEditMode]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => payrollService.updatePayroll(id, data),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Berhasil',
          description: 'Payroll berhasil diperbarui',
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.payrolls.list(currentBusiness?.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.payrolls.detail(payroll.id),
        });
        if (onUpdate) onUpdate();
        setIsEditing(false);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Gagal memperbarui payroll',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal memperbarui payroll',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (!payroll) return;

    const updateData = {
      bonus: parseFloat(formData.bonus) || 0,
      allowance: parseFloat(formData.allowance) || 0,
      other_deductions: parseFloat(formData.other_deductions) || 0,
      notes: formData.notes || '',
      status: formData.status,
    };

    // If status is 'paid', set paid_at to today
    if (formData.status === 'paid' && payroll.status !== 'paid') {
      updateData.paid_at = new Date().toISOString().split('T')[0];
    }

    updateMutation.mutate({
      id: payroll.id,
      data: updateData,
    });
  };

  const handleCancel = () => {
    if (payroll) {
      setFormData({
        bonus: payroll.bonus || 0,
        allowance: payroll.allowance || 0,
        other_deductions: payroll.other_deductions || 0,
        notes: payroll.notes || '',
        status: payroll.status || 'draft',
      });
    }
    setIsEditing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatNumber = (value) => {
    // Remove non-numeric characters except decimal point
    const num = value.toString().replace(/[^\d.]/g, '');
    // Format with thousand separators
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseNumber = (value) => {
    return parseFloat(value.toString().replace(/\./g, '')) || 0;
  };

  // Calculate preview totals when editing
  const calculatePreview = () => {
    if (!payroll || !isEditing) return null;

    const bonus = parseFloat(formData.bonus) || 0;
    const allowance = parseFloat(formData.allowance) || 0;
    const otherDeductions = parseFloat(formData.other_deductions) || 0;

    const grossSalary = payroll.base_salary + payroll.overtime_pay + payroll.commission + bonus + allowance;
    const totalDeductions = payroll.late_penalty + payroll.absent_penalty + otherDeductions;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    return {
      grossSalary,
      totalDeductions,
      netSalary,
    };
  };

  const preview = calculatePreview();

  if (!payroll) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Payroll</DialogTitle>
          <DialogDescription>
            {payroll.employee?.user?.name || payroll.employee?.name || 'N/A'} -{' '}
            {new Date(payroll.period_start).toLocaleDateString('id-ID', {
              month: 'long',
              year: 'numeric',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Gaji Kotor</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(isEditing && preview ? preview.grossSalary : payroll.gross_salary)}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Potongan</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(isEditing && preview ? preview.totalDeductions : payroll.total_deductions)}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Gaji Bersih</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(isEditing && preview ? preview.netSalary : payroll.net_salary)}
              </p>
            </div>
          </div>

          {/* Earnings */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Pendapatan
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>Gaji Pokok</span>
                <span className="font-medium">{formatCurrency(payroll.base_salary)}</span>
              </div>
              {payroll.overtime_pay > 0 && (
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Lembur ({payroll.overtime_hours} jam)</span>
                  <span className="font-medium">{formatCurrency(payroll.overtime_pay)}</span>
                </div>
              )}
              {payroll.commission > 0 && (
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Komisi</span>
                  <span className="font-medium">{formatCurrency(payroll.commission)}</span>
                </div>
              )}
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bonus">Bonus (Rp)</Label>
                    <Input
                      id="bonus"
                      type="text"
                      value={formatNumber(formData.bonus.toString())}
                      onChange={(e) => {
                        const value = parseNumber(e.target.value);
                        setFormData({ ...formData, bonus: value });
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allowance">Tunjangan (Rp)</Label>
                    <Input
                      id="allowance"
                      type="text"
                      value={formatNumber(formData.allowance.toString())}
                      onChange={(e) => {
                        const value = parseNumber(e.target.value);
                        setFormData({ ...formData, allowance: value });
                      }}
                      placeholder="0"
                    />
                  </div>
                </>
              ) : (
                <>
                  {payroll.bonus > 0 && (
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Bonus</span>
                      <span className="font-medium">{formatCurrency(payroll.bonus)}</span>
                    </div>
                  )}
                  {payroll.allowance > 0 && (
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Tunjangan</span>
                      <span className="font-medium">{formatCurrency(payroll.allowance)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              Potongan
            </h3>
            <div className="space-y-2">
              {payroll.late_penalty > 0 && (
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Denda Terlambat ({payroll.late_count}x)</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(payroll.late_penalty)}
                  </span>
                </div>
              )}
              {payroll.absent_penalty > 0 && (
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Denda Tidak Hadir ({payroll.absent_count} hari)</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(payroll.absent_penalty)}
                  </span>
                </div>
              )}
              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="other_deductions">Potongan Lainnya (Rp)</Label>
                  <Input
                    id="other_deductions"
                    type="text"
                    value={formatNumber(formData.other_deductions.toString())}
                    onChange={(e) => {
                      const value = parseNumber(e.target.value);
                      setFormData({ ...formData, other_deductions: value });
                    }}
                    placeholder="0"
                  />
                </div>
              ) : (
                payroll.other_deductions > 0 && (
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Potongan Lainnya</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(payroll.other_deductions)}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Attendance Stats */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Statistik Kehadiran</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Hari Kerja</p>
                <p className="text-xl font-bold">{payroll.total_working_days} hari</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Hadir</p>
                <p className="text-xl font-bold text-green-600">{payroll.present_days} hari</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Tidak Hadir</p>
                <p className="text-xl font-bold text-red-600">{payroll.absent_days} hari</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Total Jam Kerja</p>
                <p className="text-xl font-bold">{payroll.total_working_hours} jam</p>
              </div>
            </div>
          </div>

          {/* Notes and Status */}
          <div className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="calculated">Dihitung</SelectItem>
                      <SelectItem value="approved">Disetujui</SelectItem>
                      <SelectItem value="paid">Dibayar</SelectItem>
                      <SelectItem value="cancelled">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Catatan tambahan..."
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                {payroll.notes && (
                  <div>
                    <Label>Catatan</Label>
                    <p className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                      {payroll.notes}
                    </p>
                  </div>
                )}
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge
                      className={
                        payroll.status === 'paid'
                          ? 'bg-purple-100 text-purple-800'
                          : payroll.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : payroll.status === 'calculated'
                          ? 'bg-blue-100 text-blue-800'
                          : payroll.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {payroll.status === 'paid'
                        ? 'Dibayar'
                        : payroll.status === 'approved'
                        ? 'Disetujui'
                        : payroll.status === 'calculated'
                        ? 'Dihitung'
                        : payroll.status === 'cancelled'
                        ? 'Dibatalkan'
                        : 'Draft'}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Batal
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Simpan
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>
                  Tutup
                </Button>
                {canManage && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollDetailModal;

