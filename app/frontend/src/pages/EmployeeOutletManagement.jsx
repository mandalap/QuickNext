import {
  ChefHat,
  Coffee,
  Plus,
  RefreshCw,
  Shield,
  ShoppingCart,
  Star,
  Store,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { prefetchQueries } from '../utils/requestBatching';
import { useAuth } from '../contexts/AuthContext';
import { retryWithBackoff } from '../utils/performance/retry';
import { useDebounce } from '../hooks/useDebounce';
import useOptimisticUpdate from '../hooks/useOptimisticUpdate';
import { queryKeys } from '../config/reactQuery';
import EmployeeOutletManagementSkeleton from './EmployeeOutletManagementSkeleton';
import EmployeeOutletAssignModal from '../components/modals/EmployeeOutletAssignModal';
import { useToast } from '../components/ui/toast';
import { employeeService } from '../services/employee.service';
import { employeeOutletService } from '../services/employeeOutlet.service';
import outletService from '../services/outlet.service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const EmployeeOutletManagement = () => {
  const { toast } = useToast();
  const { currentBusiness } = useAuth();
  const queryClient = useQueryClient();

  // ✅ OPTIMIZATION: Refs untuk mencegah duplicate calls
  const fetchingRef = useRef(false);
  const requestQueueRef = useRef(new Set());

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filterOutlet, setFilterOutlet] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ OPTIMIZATION: Debounced filters untuk mengurangi API calls
  const debouncedFilterOutlet = useDebounce(filterOutlet, 300);
  const debouncedFilterEmployee = useDebounce(filterEmployee, 300);
  const debouncedFilterRole = useDebounce(filterRole, 300);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // ✅ OPTIMIZATION: TanStack Query dengan retry, caching, prefetching, dan background refetch
  const {
    data: assignmentsData,
    isLoading: assignmentsLoading,
    isFetching: assignmentsFetching,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: queryKeys.employeeOutlets.assignments(currentBusiness?.id, {
      filterOutlet: debouncedFilterOutlet,
      filterEmployee: debouncedFilterEmployee,
      filterRole: debouncedFilterRole,
    }),
    queryFn: async () => {
      const requestId = 'fetchAssignments';
      if (fetchingRef.current || requestQueueRef.current.has(requestId)) {
        throw new Error('Duplicate request prevented');
      }
      fetchingRef.current = true;
      requestQueueRef.current.add(requestId);

      try {
        const result = await retryWithBackoff(
          () => employeeOutletService.getAllAssignments(),
          {
            maxRetries: 3,
            baseDelay: 1000,
            shouldRetry: error => {
              if (!error.response) return true;
              const status = error.response?.status;
              return status >= 500 || status === 429;
            },
          }
        );
        return result;
      } finally {
        fetchingRef.current = false;
        requestQueueRef.current.delete(requestId);
      }
    },
    enabled: !!currentBusiness?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - cache lebih lama
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    retry: 2, // Retry 2 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Disable auto refetch on focus
    refetchOnReconnect: true, // Refetch on reconnect
    refetchInterval: 5 * 60 * 1000, // Background refetch every 5 minutes
    refetchIntervalInBackground: true, // Continue refetching in background
  });

  const {
    data: outletsData,
    isLoading: outletsLoading,
    error: outletsError,
  } = useQuery({
    queryKey: queryKeys.settings.outlets(currentBusiness?.id),
    queryFn: async () => {
      const result = await retryWithBackoff(() => outletService.getAll(), {
        maxRetries: 3,
        baseDelay: 1000,
        shouldRetry: error => {
          if (!error.response) return true;
          const status = error.response?.status;
          return status >= 500 || status === 429;
        },
      });
      return result;
    },
    enabled: !!currentBusiness?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - outlets rarely change
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const {
    data: employeesData,
    isLoading: employeesLoading,
    error: employeesError,
  } = useQuery({
    queryKey: queryKeys.employees.list(currentBusiness?.id),
    queryFn: async () => {
      const result = await retryWithBackoff(() => employeeService.getAll(), {
        maxRetries: 3,
        baseDelay: 1000,
        shouldRetry: error => {
          if (!error.response) return true;
          const status = error.response?.status;
          return status >= 500 || status === 429;
        },
      });
      return result;
    },
    enabled: !!currentBusiness?.id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // ✅ OPTIMIZATION: Prefetch related data on mount using batched requests
  useEffect(() => {
    if (currentBusiness?.id) {
      // Prefetch all related queries in parallel for better performance
      prefetchQueries(queryClient, [
        {
          queryKey: queryKeys.employeeOutlets.assignments(currentBusiness.id, {
            filterOutlet: 'all',
            filterEmployee: 'all',
            filterRole: 'all',
          }),
          queryFn: () => employeeOutletService.getAllAssignments(),
          staleTime: 2 * 60 * 1000,
        },
        {
          queryKey: queryKeys.employees.list(currentBusiness.id),
          queryFn: () => employeeService.getAll(),
          staleTime: 3 * 60 * 1000,
        },
        {
          queryKey: queryKeys.settings.outlets(currentBusiness.id),
          queryFn: () => outletService.getAll(),
          staleTime: 5 * 60 * 1000,
        },
      ]).catch(() => {
        // Silently fail prefetch - main queries will handle errors
      });
    }
  }, [currentBusiness?.id, queryClient]);

  // Extract data
  const assignments = useMemo(
    () => assignmentsData?.data || [],
    [assignmentsData]
  );
  const outlets = useMemo(
    () => outletsData?.data || outletsData || [],
    [outletsData]
  );
  // ✅ FIX: Ensure employees is always an array
  const employees = useMemo(() => {
    if (!employeesData) return [];
    // If data is an array, return it
    if (Array.isArray(employeesData)) return employeesData;
    // If data has a data property that's an array, return it
    if (employeesData.data && Array.isArray(employeesData.data)) return employeesData.data;
    // If data is an object but not an array, return empty array
    return [];
  }, [employeesData]);
  const loading = assignmentsLoading || outletsLoading || employeesLoading;

  // ✅ OPTIMIZATION: Optimistic updates untuk unassign/setPrimary
  const {
    update: optimisticUpdateAssignment,
  } = useOptimisticUpdate(
    data => {
      // Optimistic update: update UI immediately
      if (data.assignments) {
        queryClient.setQueryData(
          queryKeys.employeeOutlets.assignments(currentBusiness?.id, {}),
          { data: data.assignments }
        );
      }
    },
    previousData => {
      // Rollback: restore previous state on error
      if (previousData) {
        queryClient.setQueryData(
          queryKeys.employeeOutlets.assignments(currentBusiness?.id, {}),
          { data: previousData.assignments }
        );
      }
    }
  );

  // ✅ OPTIMIZATION: Handle refresh dengan manual refetch
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      await Promise.all([
        refetchAssignments(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.settings.outlets(currentBusiness?.id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.employees.list(currentBusiness?.id),
        }),
      ]);
      toast({
        title: 'Berhasil!',
        description: 'Data berhasil diperbarui',
      });
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, refetchAssignments, queryClient, currentBusiness?.id, toast]);

  // ✅ OPTIMIZATION: Memoized filter functions untuk performa
  const getFilteredAssignments = useMemo(() => {
    let filtered = assignments;

    // Filter by outlet
    if (debouncedFilterOutlet !== 'all') {
      filtered = filtered.filter(
        assignment => assignment.outlet_id == debouncedFilterOutlet
      );
    }

    // Filter by employee
    if (debouncedFilterEmployee !== 'all') {
      // Find the employee to get their user_id
      const selectedEmployee = employees.find(
        emp => emp.id.toString() === debouncedFilterEmployee
      );
      if (selectedEmployee) {
        filtered = filtered.filter(
          assignment => assignment.user_id == selectedEmployee.user_id
        );
      }
    }

    // Filter by role
    if (debouncedFilterRole !== 'all') {
      filtered = filtered.filter(assignment => {
        // Gunakan role dari assignment.user.role (prioritas utama)
        // Atau dari employee.user.role jika assignment.user.role tidak ada
        const userRole = assignment.user?.role;
        if (userRole) {
          return userRole === debouncedFilterRole;
        }

        // Fallback: cari employee jika assignment.user.role tidak ada
        const employee = employees.find(
          emp => emp.user_id === assignment.user_id
        );
        return employee?.user?.role === debouncedFilterRole;
      });
    }

    return filtered;
  }, [
    assignments,
    debouncedFilterOutlet,
    debouncedFilterEmployee,
    debouncedFilterRole,
    employees,
  ]);

  // ✅ OPTIMIZATION: Memoized pagination functions
  const getPaginatedAssignments = useMemo(() => {
    const filtered = getFilteredAssignments;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [getFilteredAssignments, currentPage, itemsPerPage]);

  const getTotalPages = useMemo(() => {
    return Math.ceil(getFilteredAssignments.length / itemsPerPage);
  }, [getFilteredAssignments, itemsPerPage]);

  const handlePageChange = page => {
    setCurrentPage(page);
  };

  // ✅ OPTIMIZATION: Memoized pagination numbers
  const getPaginationNumbers = useMemo(() => {
    const totalPages = getTotalPages;
    const current = currentPage;
    const delta = 2; // Number of pages to show on each side of current page

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];

    // Always show first page
    pages.push(1);

    if (current > delta + 3) {
      pages.push('...');
    }

    // Show pages around current page
    const start = Math.max(2, current - delta);
    const end = Math.min(totalPages - 1, current + delta);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < totalPages - delta - 2) {
      pages.push('...');
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }, [getTotalPages, currentPage]);

  // ✅ OPTIMIZATION: Handle filter change dengan reset pagination
  const handleFilterChange = useCallback((filterType, value) => {
    setCurrentPage(1); // Reset to first page when filter changes

    switch (filterType) {
      case 'outlet':
        setFilterOutlet(value);
        break;
      case 'employee':
        setFilterEmployee(value);
        break;
      case 'role':
        setFilterRole(value);
        break;
      default:
        break;
    }
  }, []);

  // ✅ OPTIMIZATION: Handle assign success dengan query invalidation
  const handleAssignSuccess = useCallback(() => {
    setShowAssignModal(false);
    setSelectedEmployee(null);
    // Invalidate and refetch assignments
    queryClient.invalidateQueries({
      queryKey: queryKeys.employeeOutlets.assignments(currentBusiness?.id),
    });
    toast({
      title: 'Berhasil!',
      description: 'Assignment berhasil ditambahkan',
    });
  }, [queryClient, currentBusiness?.id, toast]);

  // ✅ Handle open delete dialog
  const handleOpenDeleteDialog = useCallback(assignment => {
    setAssignmentToDelete(assignment);
    setShowDeleteDialog(true);
  }, []);

  // ✅ OPTIMIZATION: Handle unassign dengan optimistic update dan retry
  const handleUnassign = useCallback(
    async () => {
      if (!assignmentToDelete) return;

      setIsDeleting(true);
      const assignment = assignmentToDelete;

      // ✅ OPTIMIZATION: Optimistic update - remove from UI immediately
      const previousAssignments = assignments;

      try {
        await optimisticUpdateAssignment(
          {
            assignments: previousAssignments.filter(
              a =>
                !(
                  a.user_id === assignment.user_id &&
                  a.outlet_id === assignment.outlet_id
                )
            ),
          },
          async () => {
            // ✅ FIX: Ensure user_id and outlet_id are integers
            const payload = {
              user_id: Number(assignment.user_id),
              outlet_id: Number(assignment.outlet_id),
            };

            console.log('[Unassign] Sending payload:', payload);

            // ✅ OPTIMIZATION: API call dengan retry
            const result = await retryWithBackoff(
              () => employeeOutletService.unassign(payload),
              {
                maxRetries: 3,
                baseDelay: 1000,
                shouldRetry: error => {
                  if (!error.response) return true;
                  const status = error.response?.status;
                  // Don't retry on 400 (bad request) or 404 (not found)
                  if (status === 400 || status === 404) return false;
                  return status >= 500 || status === 429;
                },
              }
            );

            if (result.success !== false) {
              toast({
                title: 'Berhasil!',
                description: `${assignment.user.name} berhasil dihapus dari ${assignment.outlet.name}`,
              });

              // Invalidate and refetch
              await queryClient.invalidateQueries({
                queryKey: queryKeys.employeeOutlets.assignments(
                  currentBusiness?.id
                ),
              });

              setShowDeleteDialog(false);
              setAssignmentToDelete(null);

              return result;
            } else {
              throw new Error(result.message || 'Failed to unassign');
            }
          }
        );
      } catch (error) {
        console.error('[Unassign] Error:', error);
        
        // Handle error response
        let errorMessage = 'Gagal menghapus assignment';
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          if (status === 400) {
            errorMessage = data.message || 'Request tidak valid. Pastikan employee memiliki minimal satu outlet.';
          } else if (status === 404) {
            errorMessage = 'Assignment tidak ditemukan';
          } else if (status === 403) {
            errorMessage = 'Anda tidak memiliki izin untuk melakukan tindakan ini';
          } else {
            errorMessage = data.message || `Error ${status}: Gagal menghapus assignment`;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast({
          title: 'Error!',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [
      assignmentToDelete,
      assignments,
      optimisticUpdateAssignment,
      queryClient,
      currentBusiness?.id,
      toast,
    ]
  );

  // ✅ OPTIMIZATION: Handle setPrimary dengan optimistic update dan retry
  const handleSetPrimary = useCallback(
    async assignment => {
      // ✅ OPTIMIZATION: Optimistic update - update UI immediately
      const previousAssignments = assignments;

      optimisticUpdateAssignment(
        {
          assignments: previousAssignments.map(a => ({
            ...a,
            is_primary:
              a.user_id === assignment.user_id &&
              a.outlet_id === assignment.outlet_id,
          })),
        },
        async () => {
          // ✅ OPTIMIZATION: API call dengan retry
          const result = await retryWithBackoff(
            () =>
              employeeOutletService.setPrimary({
                user_id: assignment.user_id,
                outlet_id: assignment.outlet_id,
              }),
            {
              maxRetries: 3,
              baseDelay: 1000,
              shouldRetry: error => {
                if (!error.response) return true;
                const status = error.response?.status;
                return status >= 500 || status === 429;
              },
            }
          );

          if (result.success !== false) {
            toast({
              title: 'Berhasil!',
              description: 'Outlet utama berhasil diatur',
            });
            toast({
              title: 'Berhasil!',
              description: `${assignment.outlet.name} sekarang menjadi outlet utama untuk ${assignment.user.name}`,
            });

            // Invalidate and refetch
            await queryClient.invalidateQueries({
              queryKey: queryKeys.employeeOutlets.assignments(
                currentBusiness?.id
              ),
            });

            return result;
          } else {
            throw new Error(result.message || 'Failed to set primary');
          }
        }
      );
    },
    [
      assignments,
      optimisticUpdateAssignment,
      queryClient,
      currentBusiness?.id,
      toast,
    ]
  );

  // Get role display information
  const getRoleInfo = role => {
    const roleConfig = {
      super_admin: {
        label: 'Super Admin',
        icon: Shield,
        color: 'bg-red-100 text-red-800 border-red-200',
        description: 'Akses penuh sistem',
      },
      owner: {
        label: 'Owner',
        icon: Shield,
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        description: 'Pemilik bisnis',
      },
      admin: {
        label: 'Admin',
        icon: UserCheck,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        description: 'Kelola operasional',
      },
      kasir: {
        label: 'Kasir',
        icon: ShoppingCart,
        color: 'bg-green-100 text-green-800 border-green-200',
        description: 'Transaksi & penjualan',
      },
      kitchen: {
        label: 'Dapur',
        icon: ChefHat,
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        description: 'Kelola masakan',
      },
      waiter: {
        label: 'Pelayan',
        icon: Coffee,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        description: 'Layani pelanggan',
      },
      member: {
        label: 'Member',
        icon: Users,
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        description: 'Akses terbatas',
      },
    };

    return roleConfig[role] || roleConfig['member'];
  };

  // ✅ OPTIMIZATION: Show skeleton loader instead of simple spinner
  if (loading) {
    return <EmployeeOutletManagementSkeleton />;
  }

  // ✅ OPTIMIZATION: Handle errors
  if (assignmentsError || outletsError || employeesError) {
    const error = assignmentsError || outletsError || employeesError;
    let errorMessage = '❌ Gagal memuat data';
    let errorDetails = '';

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 401:
          errorMessage = '❌ Tidak memiliki izin';
          errorDetails = 'Silakan login ulang';
          break;
        case 403:
          errorMessage = '❌ Akses ditolak';
          errorDetails = 'Anda tidak memiliki izin untuk melihat data ini';
          break;
        case 500:
          errorMessage = '❌ Server error';
          errorDetails = 'Terjadi kesalahan di server. Coba lagi nanti';
          break;
        default:
          errorMessage = `❌ Error ${status}`;
          errorDetails = data.message || 'Terjadi kesalahan saat memuat data';
      }
    } else {
      errorMessage = '❌ Koneksi gagal';
      errorDetails = error.message || 'Periksa koneksi internet Anda';
    }

    return (
      <div className='p-6'>
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4'>
          <p className='font-semibold'>{errorMessage}</p>
          {errorDetails && <p className='text-sm mt-1'>{errorDetails}</p>}
        </div>
        <button
          onClick={handleRefresh}
          className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        >
          <RefreshCw className='w-4 h-4 inline mr-2' />
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900 mb-2'>
          Employee Outlet Assignments
        </h1>
        <p className='text-gray-600'>
          Manage which employees can access which outlets
        </p>
      </div>

      {/* Filters and Actions */}
      <div className='bg-white rounded-lg shadow-sm p-4 mb-6'>
        <div className='flex flex-wrap gap-4 items-center justify-between'>
          <div className='flex gap-4 flex-1'>
            {/* Filter by Employee */}
            <select
              value={filterEmployee}
              onChange={e => handleFilterChange('employee', e.target.value)}
              className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            >
              <option value='all'>All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id.toString()}>
                  {emp.name}
                </option>
              ))}
            </select>

            {/* Filter by Outlet */}
            <select
              value={filterOutlet}
              onChange={e => handleFilterChange('outlet', e.target.value)}
              className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            >
              <option value='all'>All Outlets</option>
              {outlets.map(outlet => (
                <option key={outlet.id} value={outlet.id.toString()}>
                  {outlet.name}
                </option>
              ))}
            </select>

            {/* Filter by Role */}
            <select
              value={filterRole}
              onChange={e => handleFilterChange('role', e.target.value)}
              className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            >
              <option value='all'>All Roles</option>
              <option value='super_admin'>Super Admin</option>
              <option value='owner'>Owner</option>
              <option value='admin'>Admin</option>
              <option value='kasir'>Kasir</option>
              <option value='kitchen'>Dapur</option>
              <option value='waiter'>Pelayan</option>
              <option value='member'>Member</option>
            </select>
          </div>

          <div className='flex gap-2'>
            {/* ✅ OPTIMIZATION: Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing || assignmentsFetching}
              className='flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              title='Refresh data'
            >
              <RefreshCw
                className={`w-5 h-5 ${
                  refreshing || assignmentsFetching ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              <Plus className='w-5 h-5' />
              Assign Employee
            </button>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
        {getPaginatedAssignments.length === 0 ? (
          <div className='p-8 text-center'>
            <Users className='w-16 h-16 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-600 mb-2'>No employee assignments found</p>
            <button
              onClick={() => setShowAssignModal(true)}
              className='text-blue-600 hover:text-blue-700 font-medium'
            >
              Assign your first employee
            </button>
          </div>
        ) : (
          <div className='divide-y divide-gray-200'>
            {getPaginatedAssignments.map(assignment => {
              const employee = employees.find(
                emp =>
                  emp.user_id === assignment.user_id ||
                  emp.id === assignment.user_id
              );
              return (
                <div
                  key={`${assignment.user_id}-${assignment.outlet_id}`}
                  className='p-6'
                >
                  {/* Employee Info */}
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center'>
                        <Users className='w-5 h-5 text-blue-600' />
                      </div>
                      <div className='flex-1'>
                        <div className='flex items-center gap-3 mb-1'>
                          <h3 className='font-semibold text-gray-900'>
                            {assignment.user.name}
                          </h3>
                          {(() => {
                            // Gunakan role dari assignment.user.role (prioritas utama)
                            // Atau dari employee.user.role jika assignment.user.role tidak ada
                            const userRole =
                              assignment.user?.role || employee?.user?.role;

                            if (userRole) {
                              const roleInfo = getRoleInfo(userRole);
                              // ✅ FIX: Ensure icon is valid before rendering
                              const RoleIcon = roleInfo?.icon || Users;
                              return (
                                <div
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${roleInfo?.color || 'bg-gray-100 text-gray-800 border-gray-200'}`}
                                >
                                  {RoleIcon && <RoleIcon className='w-3 h-3' />}
                                  <span>{roleInfo?.label || userRole}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <p className='text-sm text-gray-600'>
                          {assignment.user.email}
                        </p>
                        {(() => {
                          const userRole =
                            assignment.user?.role || employee?.user?.role;
                          if (userRole) {
                            return (
                              <p className='text-xs text-gray-500'>
                                {getRoleInfo(userRole).description}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // ✅ FIX: Find the employee object from employees array
                        // Use user_id to find the correct employee
                        const employeeToEdit = employees.find(
                          emp =>
                            emp.user_id === assignment.user_id ||
                            emp.id === assignment.user_id
                        );
                        
                        // If employee not found, create a minimal employee object from assignment.user
                        const employeeForModal = employeeToEdit || {
                          id: assignment.user_id,
                          user_id: assignment.user_id,
                          name: assignment.user.name,
                          email: assignment.user.email,
                          ...assignment.user,
                        };
                        
                        setSelectedEmployee(employeeForModal);
                        setShowAssignModal(true);
                      }}
                      className='text-sm text-blue-600 hover:text-blue-700 font-medium'
                    >
                      Edit Assignments
                    </button>
                  </div>

                  {/* Assigned Outlet */}
                  <div className='space-y-2'>
                    <h4 className='text-sm font-medium text-gray-700 mb-2'>
                      Assigned Outlet
                    </h4>
                    <div className='flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors'>
                      <div className='flex items-center gap-2'>
                        <Store className='w-4 h-4 text-gray-500' />
                        <span className='text-sm font-medium text-gray-900'>
                          {assignment.outlet.name}
                        </span>
                        {assignment.is_primary && (
                          <Star className='w-4 h-4 text-yellow-500 fill-current' />
                        )}
                      </div>
                      <div className='flex gap-1'>
                        {!assignment.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(assignment)}
                            className='p-1 text-gray-400 hover:text-yellow-600 transition-colors'
                            title='Set as primary outlet'
                          >
                            <Star className='w-4 h-4' />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDeleteDialog(assignment)}
                          className='p-1 text-gray-400 hover:text-red-600 transition-colors'
                          title='Remove from this outlet'
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {getTotalPages > 1 && (
        <div className='bg-white rounded-lg shadow-sm p-4 mt-6'>
          <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
            {/* Info - Hidden on very small screens */}
            <div className='text-sm text-gray-700 hidden xs:block'>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, getFilteredAssignments.length)}{' '}
              of {getFilteredAssignments.length} assignments
            </div>

            {/* Mobile info - Only show on very small screens */}
            <div className='text-sm text-gray-700 xs:hidden'>
              Page {currentPage} of {getTotalPages}
            </div>

            <div className='flex items-center gap-1 sm:gap-2'>
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className='px-2 sm:px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                title='Previous page'
              >
                <span className='hidden sm:inline'>Previous</span>
                <span className='sm:hidden'>‹</span>
              </button>

              {/* Page Numbers */}
              <div className='flex items-center gap-1'>
                {getPaginationNumbers.map((page, index) =>
                  page === '...' ? (
                    <span
                      key={`ellipsis-${index}`}
                      className='px-2 py-2 text-sm font-medium text-gray-500'
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-2 sm:px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === getTotalPages}
                className='px-2 sm:px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                title='Next page'
              >
                <span className='hidden sm:inline'>Next</span>
                <span className='sm:hidden'>›</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <EmployeeOutletAssignModal
          employee={selectedEmployee}
          employees={employees}
          outlets={outlets}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedEmployee(null);
          }}
          onSuccess={handleAssignSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className='sm:max-w-[500px]'>
          <AlertDialogHeader>
            <div className='flex items-center gap-3 mb-2'>
              <div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center'>
                <Trash2 className='w-6 h-6 text-red-600' />
              </div>
              <AlertDialogTitle className='text-xl text-red-600'>
                Hapus Assignment?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className='text-base space-y-2'>
                <p className='font-medium text-gray-900'>
                  ⚠️ PERINGATAN: Tindakan ini tidak dapat dibatalkan!
                </p>
                {assignmentToDelete && (
                  <div className='bg-gray-50 rounded-lg p-3 mt-3 space-y-2'>
                    <p className='text-sm text-gray-600'>
                      <span className='font-semibold'>Employee:</span>{' '}
                      {assignmentToDelete.user?.name || 'N/A'}
                    </p>
                    <p className='text-sm text-gray-600'>
                      <span className='font-semibold'>Email:</span>{' '}
                      {assignmentToDelete.user?.email || 'N/A'}
                    </p>
                    <p className='text-sm text-gray-600'>
                      <span className='font-semibold'>Outlet:</span>{' '}
                      {assignmentToDelete.outlet?.name || 'N/A'}
                    </p>
                    {assignmentToDelete.is_primary && (
                      <p className='text-sm text-yellow-600 font-medium'>
                        ⚠️ Ini adalah outlet utama. Outlet lain akan otomatis menjadi utama.
                      </p>
                    )}
                  </div>
                )}
                <div className='bg-red-50 border border-red-200 rounded-lg p-3 mt-3'>
                  <p className='text-sm font-semibold text-red-800 mb-2'>
                    ⚠️ Dampak Penghapusan:
                  </p>
                  <ul className='text-sm text-red-700 space-y-1 list-disc list-inside'>
                    <li>Employee akan kehilangan akses ke outlet ini</li>
                    <li>Jika ini outlet utama, outlet lain akan menjadi utama</li>
                    <li>Employee harus memiliki minimal satu outlet</li>
                    <li>Tindakan ini tidak dapat dibatalkan</li>
                  </ul>
                </div>
                <p className='text-sm text-gray-600 mt-3'>
                  Hapus assignment hanya jika employee tidak lagi bekerja di outlet ini.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteDialog(false);
                setAssignmentToDelete(null);
              }}
              disabled={isDeleting}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnassign}
              className='bg-red-600 hover:bg-red-700 text-white'
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className='w-4 h-4 mr-2' />
                  Ya, Hapus
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeeOutletManagement;
