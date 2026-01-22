import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calculator,
  Calendar,
  CheckCircle,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { queryKeys } from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import { employeeService } from '../../services/employee.service';
import payrollService from '../../services/payroll.service';
import GeneratePayrollModal from '../modals/GeneratePayrollModal';
import PayrollDetailModal from '../modals/PayrollDetailModal';
import PayrollSlipModal from '../modals/PayrollSlipModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useToast } from '../ui/toast';
import PayrollManagementSkeleton from './PayrollManagementSkeleton';

const PayrollManagement = () => {
  const { currentBusiness, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filter states
  // ✅ NEW: Use date range instead of year/month for more flexibility
  const getDefaultDateRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: startOfMonth.toISOString().split('T')[0],
      end: endOfMonth.toISOString().split('T')[0],
    };
  };
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [editModeOnOpen, setEditModeOnOpen] = useState(false); // ✅ NEW: Control edit mode on open

  // Get employees list
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: queryKeys.employees.list(currentBusiness?.id, {}),
    queryFn: async () => {
      try {
        const result = await employeeService.getAll();
        console.log('📋 PayrollManagement: Employees fetch result', {
          success: result.success,
          hasData: !!result.data,
          dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
          dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
          result,
        });
        
        // Handle different response structures
        if (result.success !== false) {
          // Case 1: result.data is an array
          if (Array.isArray(result.data)) {
            return result.data;
          }
          // Case 2: result itself is an array
          if (Array.isArray(result)) {
            return result;
          }
          // Case 3: result is an object with data property (but data is not array)
          if (
            result &&
            typeof result === 'object' &&
            result.data &&
            !Array.isArray(result.data)
          ) {
            // Wrap single object in array
            return [result.data];
          }
        }
        
        if (result.success === false) {
          console.warn(
            '⚠️ PayrollManagement: API returned error:',
            result.error || result.message
          );
        }
        
        return [];
      } catch (error) {
        console.error('❌ PayrollManagement: Error fetching employees', error);
        return [];
      }
    },
    enabled: !!currentBusiness?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Extract employees with proper handling
  const employees = useMemo(() => {
    if (!employeesData) return [];
    
    if (Array.isArray(employeesData)) {
      return employeesData;
    }
    
    if (employeesData && typeof employeesData === 'object') {
      if (Array.isArray(employeesData.data)) {
        return employeesData.data;
      }
    }
    
    return [];
  }, [employeesData]);

  // Get payrolls list
  const {
    data: payrollsData,
    isLoading: payrollsLoading,
    refetch: refetchPayrolls,
  } = useQuery({
    queryKey: queryKeys.payrolls.list(currentBusiness?.id, {
      start_date: dateRange.start,
      end_date: dateRange.end,
      employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
    }),
    queryFn: async () => {
      const result = await payrollService.getPayrolls({
        start_date: dateRange.start,
        end_date: dateRange.end,
        employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });
      console.log('📋 PayrollManagement: Payrolls API result', {
        success: result.success,
        hasData: !!result.data,
        dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
        dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
        result,
      });
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      }
      return [];
    },
    enabled: !!currentBusiness?.id,
  });

  // Get payroll stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.payrolls.stats(currentBusiness?.id, {
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
    queryFn: async () => {
      const result = await payrollService.getStats({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      return result.success ? result.data : null;
    },
    enabled: !!currentBusiness?.id,
  });

  // Delete payroll mutation
  const deletePayrollMutation = useMutation({
    mutationFn: async id => {
      const result = await payrollService.deletePayroll(id);
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete payroll');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payrolls.list(currentBusiness?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.payrolls.stats(currentBusiness?.id),
      });
      toast({
        title: 'Berhasil',
        description: 'Payroll berhasil dihapus',
      });
    },
    onError: error => {
      toast({
        title: 'Gagal',
        description: error.message || 'Gagal menghapus payroll',
        variant: 'destructive',
      });
    },
  });

  // Update payroll status mutation
  const updatePayrollMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await payrollService.updatePayroll(id, data);
      if (!result.success) {
        throw new Error(result.message || 'Failed to update payroll');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payrolls.list(currentBusiness?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.payrolls.stats(currentBusiness?.id),
      });
      toast({
        title: 'Berhasil',
        description: 'Status payroll berhasil diperbarui',
      });
    },
    onError: error => {
      toast({
        title: 'Gagal',
        description: error.message || 'Gagal memperbarui status payroll',
        variant: 'destructive',
      });
    },
  });

  // Check if data has been received (can be empty array, but not undefined)
  // Must be declared before use in useEffect
  const hasPayrollsData = payrollsData !== undefined;
  const hasStatsData = statsData !== undefined;
  const hasEmployeesData = employeesData !== undefined;

  // Ensure data is always available (even if empty)
  const payrolls = Array.isArray(payrollsData) ? payrollsData : [];
  const stats = statsData && typeof statsData === 'object' ? statsData : {};

  useEffect(() => {
    if (payrolls.length > 0 || payrollsLoading) {
      console.log({
        payrollsCount: payrolls.length,
        payrollsLoading,
        hasPayrollsData,
        payrolls: payrolls.slice(0, 3), // Log first 3 items
      });
    }
  }, [
    payrolls,
    payrollsLoading,
    hasPayrollsData,
    currentBusiness?.id,
    payrollsData,
  ]);

  // Filter payrolls by search term
  const filteredPayrolls = useMemo(() => {
    if (!searchTerm) return payrolls;
    const term = searchTerm.toLowerCase();
    return payrolls.filter(payroll => {
      const employeeName =
        payroll.employee?.user?.name || payroll.employee?.name || '';
      const payrollNumber = payroll.payroll_number || '';
      return (
        employeeName.toLowerCase().includes(term) ||
        payrollNumber.toLowerCase().includes(term)
      );
    });
  }, [payrolls, searchTerm]);

  // Format currency
  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Get status badge
  const getStatusBadge = status => {
    const statusConfig = {
      draft: {
        color: 'bg-gray-100 text-gray-800',
        label: 'Draft',
        icon: FileText,
      },
      calculated: {
        color: 'bg-blue-100 text-blue-800',
        label: 'Dihitung',
        icon: Calculator,
      },
      approved: {
        color: 'bg-green-100 text-green-800',
        label: 'Disetujui',
        icon: CheckCircle,
      },
      paid: {
        color: 'bg-purple-100 text-purple-800',
        label: 'Dibayar',
        icon: DollarSign,
      },
      cancelled: {
        color: 'bg-red-100 text-red-800',
        label: 'Dibatalkan',
        icon: XCircle,
      },
    };
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    return (
      <Badge
        className={`${config.color} font-medium flex items-center space-x-1`}
      >
        <Icon className='w-3 h-3' />
        <span>{config.label}</span>
      </Badge>
    );
  };

  // Handle view detail
  const handleViewDetail = payroll => {
    setSelectedPayroll(payroll);
    setEditModeOnOpen(false); // View mode
    setDetailModalOpen(true);
  };

  // ✅ NEW: Handle edit payroll
  const handleEdit = payroll => {
    setSelectedPayroll(payroll);
    setEditModeOnOpen(true); // Edit mode
    setDetailModalOpen(true);
  };

  // Handle view slip
  const handleViewSlip = payroll => {
    setSelectedPayroll(payroll);
    setSlipModalOpen(true);
  };

  // Handle delete
  const handleDelete = async payroll => {
    // Check if payroll can be deleted based on status
    if (!['draft', 'calculated', 'cancelled'].includes(payroll.status)) {
      toast({
        title: 'Tidak dapat menghapus',
        description: `Payroll dengan status "${payroll.status}" tidak dapat dihapus. Hanya payroll dengan status Draft, Dihitung, atau Dibatalkan yang dapat dihapus.`,
        variant: 'destructive',
      });
      return;
    }

    if (!window.confirm('Apakah Anda yakin ingin menghapus payroll ini?')) {
      return;
    }
    deletePayrollMutation.mutate(payroll.id);
  };

  // Handle update status
  const handleUpdateStatus = (payroll, newStatus) => {
    const updateData = { status: newStatus };
    // If status is 'paid', set paid_at to today
    if (newStatus === 'paid') {
      updateData.paid_at = new Date().toISOString().split('T')[0];
    }
    updatePayrollMutation.mutate({
      id: payroll.id,
      data: updateData,
    });
  };

  // Check if user can manage payrolls (admin/owner only)
  const canManage = useMemo(() => {
    return ['super_admin', 'owner', 'admin'].includes(user?.role);
  }, [user?.role]);

  // Loading state
  // Check if query is enabled
  const isQueryEnabled = !!currentBusiness?.id;
  
  // Show skeleton during initial load only:
  // 1. Query is enabled
  // 2. Payrolls data is still loading AND no data received yet (most important data)
  // 3. OR if no data has been received at all (first time load)
  const isLoading = payrollsLoading || employeesLoading || statsLoading;
  
  // Only show skeleton if:
  // - Query is enabled AND
  // - (Payrolls is still loading AND no payrolls data yet) OR
  // - (No data received at all - first time load)
  const isInitialLoad = 
    isQueryEnabled &&
    ((payrollsLoading && !hasPayrollsData) || // Payrolls still loading and no data yet
      (!hasPayrollsData && !hasStatsData && !hasEmployeesData)); // No data at all (first load)

  if (isInitialLoad) {
    return <PayrollManagementSkeleton />;
  }

  // ✅ REMOVED: Year and month options - now using date picker

  return (
    <div className='space-y-6 p-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>
            Hitung Gaji & Denda
          </h1>
          <p className='text-sm text-gray-600 mt-1'>
            Kelola perhitungan gaji karyawan dan denda telat otomatis
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setGenerateModalOpen(true)}
            className='bg-blue-600 hover:bg-blue-700'
          >
            <Plus className='w-4 h-4 mr-2' />
            Generate Payroll
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Total Payroll</p>
                {statsLoading && !hasStatsData ? (
                  <div className='h-8 w-20 bg-gray-200 rounded animate-pulse mt-1' />
                ) : (
                  <p className='text-2xl font-bold text-gray-900 mt-1'>
                    {stats?.total_payrolls ?? 0}
                  </p>
                )}
              </div>
              <div className='p-3 bg-blue-100 rounded-full'>
                <Users className='w-6 h-6 text-blue-600' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Total Gaji Kotor</p>
                {statsLoading && !hasStatsData ? (
                  <div className='h-8 w-24 bg-gray-200 rounded animate-pulse mt-1' />
                ) : (
                  <p className='text-2xl font-bold text-gray-900 mt-1'>
                    {formatCurrency(stats?.total_gross_salary ?? 0)}
                  </p>
                )}
              </div>
              <div className='p-3 bg-green-100 rounded-full'>
                <TrendingUp className='w-6 h-6 text-green-600' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Total Potongan</p>
                {statsLoading && !hasStatsData ? (
                  <div className='h-8 w-24 bg-gray-200 rounded animate-pulse mt-1' />
                ) : (
                  <p className='text-2xl font-bold text-gray-900 mt-1'>
                    {formatCurrency(stats?.total_deductions ?? 0)}
                  </p>
                )}
              </div>
              <div className='p-3 bg-red-100 rounded-full'>
                <TrendingDown className='w-6 h-6 text-red-600' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Total Gaji Bersih</p>
                {statsLoading && !hasStatsData ? (
                  <div className='h-8 w-24 bg-gray-200 rounded animate-pulse mt-1' />
                ) : (
                  <p className='text-2xl font-bold text-gray-900 mt-1'>
                    {formatCurrency(stats?.total_net_salary ?? 0)}
                  </p>
                )}
              </div>
              <div className='p-3 bg-purple-100 rounded-full'>
                <DollarSign className='w-6 h-6 text-purple-600' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
            <CardTitle>Filter Payroll</CardTitle>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetchPayrolls()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'>
            {/* ✅ NEW: Date Range Picker instead of Year/Month */}
            <div className='sm:col-span-2'>
              <label className='text-sm font-medium text-gray-700 mb-2 block'>
                Periode
              </label>
              <div className='flex items-end gap-2'>
                <div className='flex-1'>
                  <label className='text-xs text-gray-500 mb-1 block'>
                    Dari Tanggal
                  </label>
                  <Input
                    type='date'
                    value={dateRange.start}
                    max={
                      dateRange.end || new Date().toISOString().split('T')[0]
                    }
                    onChange={e =>
                      setDateRange({
                        ...dateRange,
                        start: e.target.value,
                      })
                    }
                    className='w-full'
                  />
            </div>
                <span className='text-gray-400 mb-2'>-</span>
                <div className='flex-1'>
                  <label className='text-xs text-gray-500 mb-1 block'>
                    Sampai Tanggal
                  </label>
                  <Input
                    type='date'
                    value={dateRange.end}
                    min={dateRange.start || ''}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e =>
                      setDateRange({
                        ...dateRange,
                        end: e.target.value,
                      })
                    }
                    className='w-full'
                  />
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    const now = new Date();
                    const startOfMonth = new Date(
                      now.getFullYear(),
                      now.getMonth(),
                      1
                    );
                    const endOfMonth = new Date(
                      now.getFullYear(),
                      now.getMonth() + 1,
                      0
                    );
                    setDateRange({
                      start: startOfMonth.toISOString().split('T')[0],
                      end: endOfMonth.toISOString().split('T')[0],
                    });
                  }}
                  title='Reset ke bulan ini'
                >
                  <Calendar className='w-4 h-4' />
                </Button>
              </div>
            </div>

            <div>
              <label className='text-sm font-medium text-gray-700 mb-2 block'>
                Karyawan
              </label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua Karyawan</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name || emp.user?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className='text-sm font-medium text-gray-700 mb-2 block'>
                Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua Status</SelectItem>
                  <SelectItem value='draft'>Draft</SelectItem>
                  <SelectItem value='calculated'>Dihitung</SelectItem>
                  <SelectItem value='approved'>Disetujui</SelectItem>
                  <SelectItem value='paid'>Dibayar</SelectItem>
                  <SelectItem value='cancelled'>Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className='text-sm font-medium text-gray-700 mb-2 block'>
                Cari
              </label>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                <Input
                  placeholder='Cari karyawan atau nomor payroll...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Payroll</CardTitle>
        </CardHeader>
        <CardContent>
          {payrollsLoading && !hasPayrollsData ? (
            <div className='space-y-4'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className='flex items-center space-x-4 p-4 border rounded-lg'
                >
                  <div className='h-10 w-10 bg-gray-200 rounded-full animate-pulse' />
                  <div className='flex-1 space-y-2'>
                    <div className='h-4 w-48 bg-gray-200 rounded animate-pulse' />
                    <div className='h-3 w-32 bg-gray-200 rounded animate-pulse' />
                  </div>
                  <div className='h-8 w-24 bg-gray-200 rounded animate-pulse' />
                </div>
              ))}
            </div>
          ) : !hasPayrollsData ? (
            <div className='text-center py-12'>
              <FileText className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-600'>Memuat data payroll...</p>
            </div>
          ) : filteredPayrolls.length === 0 ? (
            <div className='text-center py-12'>
              <FileText className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-600'>Tidak ada payroll ditemukan</p>
              {canManage && (
                <Button
                  onClick={() => setGenerateModalOpen(true)}
                  className='mt-4'
                  variant='outline'
                >
                  <Plus className='w-4 h-4 mr-2' />
                  Generate Payroll Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b'>
                    <th className='text-left p-3 text-sm font-medium text-gray-700'>
                      Karyawan
                    </th>
                    <th className='text-left p-3 text-sm font-medium text-gray-700'>
                      Periode
                    </th>
                    <th className='text-left p-3 text-sm font-medium text-gray-700'>
                      Gaji Kotor
                    </th>
                    <th className='text-left p-3 text-sm font-medium text-gray-700'>
                      Potongan
                    </th>
                    <th className='text-left p-3 text-sm font-medium text-gray-700'>
                      Gaji Bersih
                    </th>
                    <th className='text-left p-3 text-sm font-medium text-gray-700'>
                      Status
                    </th>
                    <th className='text-right p-3 text-sm font-medium text-gray-700'>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayrolls.map(payroll => {
                    const canShowDelete = canManage && ['draft', 'calculated', 'cancelled'].includes(payroll.status);
                    return (
                    <tr key={payroll.id} className='border-b hover:bg-gray-50'>
                      <td className='p-3'>
                        <div>
                          <p className='font-medium text-gray-900'>
                            {payroll.employee?.user?.name ||
                              payroll.employee?.name ||
                              'N/A'}
                          </p>
                          <p className='text-xs text-gray-500'>
                            {payroll.payroll_number}
                          </p>
                        </div>
                      </td>
                      <td className='p-3 text-sm text-gray-600'>
                        {new Date(payroll.period_start).toLocaleDateString(
                          'id-ID',
                          {
                          day: 'numeric',
                          month: 'short',
                          }
                        )}{' '}
                        -{' '}
                        {new Date(payroll.period_end).toLocaleDateString(
                          'id-ID',
                          {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          }
                        )}
                      </td>
                      <td className='p-3 text-sm font-medium text-gray-900'>
                        {formatCurrency(payroll.gross_salary)}
                      </td>
                      <td className='p-3 text-sm text-red-600'>
                        {formatCurrency(payroll.total_deductions)}
                      </td>
                      <td className='p-3 text-sm font-bold text-green-600'>
                        {formatCurrency(payroll.net_salary)}
                      </td>
                      <td className='p-3'>{getStatusBadge(payroll.status)}</td>
                      <td className='p-3'>
                        <div className='flex items-center justify-end gap-2'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleViewDetail(payroll)}
                          >
                            <Eye className='w-4 h-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleViewSlip(payroll)}
                          >
                            <Printer className='w-4 h-4' />
                          </Button>
                          {canManage && (
                            <>
                              {/* ✅ NEW: Edit button - only for draft and calculated status */}
                              {['draft', 'calculated'].includes(
                                payroll.status
                              ) && (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleEdit(payroll)}
                                  title='Edit Payroll'
                                  className='text-blue-600 hover:text-blue-700'
                                >
                                  <Edit className='w-4 h-4' />
                                </Button>
                              )}
                              {payroll.status === 'calculated' && (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() =>
                                    handleUpdateStatus(payroll, 'approved')
                                  }
                                  title='Setujui'
                                >
                                  <CheckCircle className='w-4 h-4 text-green-600' />
                                </Button>
                              )}
                              {payroll.status === 'approved' && (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() =>
                                    handleUpdateStatus(payroll, 'paid')
                                  }
                                  title='Tandai Dibayar'
                                >
                                  <DollarSign className='w-4 h-4 text-purple-600' />
                                </Button>
                              )}
                              {/* Delete button - only for draft, calculated, and cancelled status */}
                              {['draft', 'calculated', 'cancelled'].includes(
                                payroll.status
                              ) && (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleDelete(payroll)}
                                  title='Hapus Payroll'
                                  className='text-red-600 hover:text-red-700'
                                >
                                  <Trash2 className='w-4 h-4' />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {generateModalOpen && (
        <GeneratePayrollModal
          isOpen={generateModalOpen}
          onClose={() => {
            setGenerateModalOpen(false);
            refetchPayrolls();
          }}
          employees={employees}
          employeesLoading={employeesLoading}
          defaultYear={
            dateRange.start
              ? new Date(dateRange.start).getFullYear()
              : new Date().getFullYear()
          }
          defaultMonth={
            dateRange.start
              ? new Date(dateRange.start).getMonth() + 1
              : new Date().getMonth() + 1
          }
        />
      )}

      {detailModalOpen && selectedPayroll && (
        <PayrollDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedPayroll(null);
            setEditModeOnOpen(false); // ✅ Reset edit mode
          }}
          payroll={selectedPayroll}
          canManage={canManage}
          initialEditMode={editModeOnOpen} // ✅ NEW: Pass edit mode
          onUpdate={refetchPayrolls}
        />
      )}

      {slipModalOpen && selectedPayroll && (
        <PayrollSlipModal
          isOpen={slipModalOpen}
          onClose={() => {
            setSlipModalOpen(false);
            setSelectedPayroll(null);
          }}
          payroll={selectedPayroll}
        />
      )}
    </div>
  );
};

export default PayrollManagement;
