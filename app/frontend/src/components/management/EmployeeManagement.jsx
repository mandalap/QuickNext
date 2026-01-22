import {
  Award,
  Calendar,
  CheckCircle,
  Clock,
  Coffee,
  Download,
  Edit,
  Filter,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShoppingCart,
  Star,
  Trash2,
  TrendingUp,
  UtensilsCrossed,
  UserCheck,
  Users,
  UserX,
  XCircle,
  MapPin,
  LogIn,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { retryWithBackoff } from '../../utils/performance/retry';
import { useDebounce } from '../../hooks/useDebounce';
import useOptimisticUpdate from '../../hooks/useOptimisticUpdate';
import { queryKeys } from '../../config/reactQuery';
import EmployeeManagementSkeleton from './EmployeeManagementSkeleton';
import { employeeService } from '../../services/employee.service';
import attendanceService from '../../services/attendance.service';
import EmployeeFormModal from '../modals/EmployeeFormModal';
import SubscriptionLimitModal from '../subscription/SubscriptionLimitModal';
import { useSubscriptionLimit } from '../../hooks/useSubscriptionLimit';
import { Alert, AlertDescription } from '../ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useToast } from '../ui/toast';

const EmployeeManagement = () => {
  const { currentOutlet, currentBusiness } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    showLimitModal,
    limitError,
    handleLimitError,
    closeLimitModal,
    isSubscriptionLimitError,
  } = useSubscriptionLimit();

  // ✅ OPTIMIZATION: Refs untuk mencegah duplicate calls
  const fetchingRef = useRef(false);
  const requestQueueRef = useRef(new Set());

  const [selectedTab, setSelectedTab] = useState('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);

  // ✅ OPTIMIZATION: Debounced search untuk mengurangi API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Modal states
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [employeeModalMode, setEmployeeModalMode] = useState('add');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ✅ OPTIMIZATION: TanStack Query dengan retry, caching, prefetching, dan background refetch
  const {
    data: employeesData,
    isLoading: employeesLoading,
    isFetching: employeesFetching,
    error: employeesError,
    refetch: refetchEmployees,
  } = useQuery({
    queryKey: queryKeys.employees.list(currentBusiness?.id, {
      search: debouncedSearchTerm,
    }),
    queryFn: async () => {
      const requestId = 'fetchEmployees';
      if (fetchingRef.current || requestQueueRef.current.has(requestId)) {
        throw new Error('Duplicate request prevented');
      }
      fetchingRef.current = true;
      requestQueueRef.current.add(requestId);

      try {
        // ✅ DEBUG: Log request
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 EmployeeManagement: Fetching employees', {
            currentBusiness: currentBusiness?.id,
            businessName: currentBusiness?.name,
          });
        }
        
        const result = await retryWithBackoff(
          () => employeeService.getAll(),
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
        
        // ✅ DEBUG: Log result
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 EmployeeManagement: Employees result', {
            success: result.success,
            hasData: !!result.data,
            dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
            dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
            result,
          });
        }
        
        // ✅ FIX: Return data dengan struktur yang konsisten
        // Pastikan selalu return array atau object dengan struktur { success, data }
        if (result.success !== false) {
          // Jika result.success true atau undefined, cek data
          if (Array.isArray(result.data)) {
            return result.data; // Return array langsung untuk konsistensi
          } else if (Array.isArray(result)) {
            // Jika result sendiri adalah array
            return result;
          } else if (result && typeof result === 'object') {
            // Jika result adalah object, pastikan ada property data
            return result.data || result;
          }
        }
        
        // Jika error, return empty array untuk menghindari crash
        if (result.success === false) {
          console.warn('⚠️ EmployeeManagement: API returned error:', result.error || result.message);
          return [];
        }
        
        // Fallback: return empty array
        return [];
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

  // ✅ OPTIMIZATION: Prefetch related data on mount
  useEffect(() => {
    if (currentBusiness?.id) {
      // Prefetch employees dengan search yang berbeda
      queryClient.prefetchQuery({
        queryKey: queryKeys.employees.list(currentBusiness.id, {}),
        queryFn: () => employeeService.getAll(),
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [currentBusiness?.id, queryClient]);

  // ✅ OPTIMIZATION: Extract data dan pastikan selalu array
  const employees = useMemo(() => {
    if (!employeesData) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 EmployeeManagement: No employeesData');
      }
      return [];
    }

    // ✅ FIX: employeesData bisa berupa:
    // 1. Array langsung (jika queryFn return result.data)
    // 2. Object { success: true, data: [...] } (jika queryFn return result)
    // 3. Object dengan struktur nested
    let data = null;
    
    // Case 1: employeesData adalah array langsung (preferred)
    if (Array.isArray(employeesData)) {
      data = employeesData;
    }
    // Case 2: employeesData adalah object dengan property data yang array
    else if (employeesData && typeof employeesData === 'object') {
      // Cek property 'data' langsung
      if ('data' in employeesData && Array.isArray(employeesData.data)) {
        data = employeesData.data;
      }
      // Cek nested data.data
      else if (employeesData.data && typeof employeesData.data === 'object' && Array.isArray(employeesData.data.data)) {
        data = employeesData.data.data;
      }
      // Coba cari property yang berisi array
      else {
        for (const key in employeesData) {
          if (Array.isArray(employeesData[key])) {
            data = employeesData[key];
            break;
          }
          // Cek nested object
          if (employeesData[key] && typeof employeesData[key] === 'object' && Array.isArray(employeesData[key].data)) {
            data = employeesData[key].data;
            break;
          }
        }
      }
    }
    
    // Pastikan selalu array
    if (Array.isArray(data)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 EmployeeManagement: Employees loaded', {
          count: data.length,
          employees: data.map(e => ({ id: e.id, name: e.name || e.user?.name }))
        });
      }
      return data;
    }
    
    // Fallback: return empty array dengan warning
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ EmployeeManagement: Employee data is not an array:', {
        employeesData,
        data,
        type: typeof data,
        isArray: Array.isArray(data),
        keys: employeesData && typeof employeesData === 'object' ? Object.keys(employeesData) : [],
        structure: JSON.stringify(employeesData, null, 2).substring(0, 500) // Limit to first 500 chars
      });
    }
    return [];
  }, [employeesData]);

  // ✅ OPTIMIZATION: Optimistic updates untuk create/update/delete
  const {
    update: optimisticUpdateEmployee,
    isPending: isOptimisticPending,
  } = useOptimisticUpdate(
    data => {
      // Optimistic update: update UI immediately
      if (data.employees && Array.isArray(data.employees)) {
        queryClient.setQueryData(
          queryKeys.employees.list(currentBusiness?.id, {}),
          { success: true, data: data.employees }
        );
      } else if (data.employee) {
        queryClient.setQueryData(
          queryKeys.employees.list(currentBusiness?.id, {}),
          prevData => {
            // Pastikan prevData.data selalu array
            const prevEmployees = Array.isArray(prevData?.data)
              ? prevData.data
              : Array.isArray(prevData)
              ? prevData
              : [];
            
            return {
              ...prevData,
              success: true,
              data: prevEmployees.map(emp =>
                emp.id === data.employee.id ? data.employee : emp
              ),
            };
          }
        );
      } else if (data.removedId) {
        queryClient.setQueryData(
          queryKeys.employees.list(currentBusiness?.id, {}),
          prevData => {
            // Pastikan prevData.data selalu array
            const prevEmployees = Array.isArray(prevData?.data)
              ? prevData.data
              : Array.isArray(prevData)
              ? prevData
              : [];
            
            return {
              ...prevData,
              success: true,
              data: prevEmployees.filter(emp => emp.id !== data.removedId),
            };
          }
        );
      }
    },
    previousData => {
      // Rollback: restore previous state on error
      if (previousData) {
        queryClient.setQueryData(
          queryKeys.employees.list(currentBusiness?.id, {}),
          previousData
        );
      }
    }
  );

  // Attendance states
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // ✅ REACT QUERY: Fetch attendance data
  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: queryKeys.attendance.history(null, { date: attendanceDate }),
    queryFn: async () => {
      if (!currentBusiness || !currentOutlet) return [];
      const result = await attendanceService.getShifts({
        date: attendanceDate,
      });
      return result?.success && result?.data ? result.data : [];
    },
    enabled: !!currentBusiness?.id && !!currentOutlet?.id && selectedTab === 'attendance',
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData || [],
  });

  // ✅ FIX: Loading state mencakup semua data yang perlu dimuat (dipindahkan setelah attendanceLoading didefinisikan)
  const loading = employeesLoading || (selectedTab === 'attendance' && attendanceLoading);

  // ✅ REACT QUERY: Fetch today's shift
  const {
    data: todayShiftData,
    refetch: refetchTodayShift,
  } = useQuery({
    queryKey: queryKeys.attendance.todayShift(null),
    queryFn: async () => {
      if (!currentBusiness) return null;
      const result = await attendanceService.getTodayShift();
      return result?.success && result?.data ? result.data : null;
    },
    enabled: !!currentBusiness?.id && selectedTab === 'attendance',
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData,
  });

  const todayShift = todayShiftData || null;

  // ✅ REACT QUERY: Prefetch attendance for today when on employees tab
  useEffect(() => {
    if (selectedTab === 'employees' && employees.length > 0 && currentBusiness?.id && currentOutlet?.id) {
      const today = new Date().toISOString().split('T')[0];
      // Prefetch attendance for today
      queryClient.prefetchQuery({
        queryKey: queryKeys.attendance.history(null, { date: today }),
        queryFn: async () => {
          const result = await attendanceService.getShifts({ date: today });
          return result?.success && result?.data ? result.data : [];
        },
        staleTime: 30 * 1000,
      });
    }
  }, [selectedTab, employees.length, currentBusiness?.id, currentOutlet?.id, queryClient]);

  // Handle clock in
  const handleClockIn = async () => {
    if (!currentBusiness || !currentOutlet) {
      toast.error('Outlet belum dipilih');
      return;
    }

    setClockingIn(true);
    setLocationError(null);

    try {
      // ✅ NEW: Check if GPS is required for this outlet
      const gpsRequired = currentOutlet?.attendance_gps_required ?? false;
      
      // Get current location
      let location;
      try {
        location = await attendanceService.getCurrentLocation({ timeout: 20000 });
      } catch (locationError) {
        // ✅ FIX: If GPS is required, reject clock in if GPS fails
        if (gpsRequired) {
          toast.error('⚠️ GPS wajib untuk absensi di outlet ini. Pastikan GPS aktif dan izinkan akses lokasi di pengaturan browser.');
          setClockingIn(false);
          return;
        }
        
        // ✅ GPS is not required - use fallback
        console.warn('⚠️ Failed to get GPS location, using outlet location as fallback:', locationError);
        if (currentOutlet?.latitude && currentOutlet?.longitude) {
          location = {
            latitude: parseFloat(currentOutlet.latitude),
            longitude: parseFloat(currentOutlet.longitude),
          };
          toast.warning('⚠️ Lokasi GPS tidak tersedia. Menggunakan lokasi outlet sebagai fallback. Absensi tetap dapat dilakukan.');
        } else {
          // If no outlet location, still allow clock in but warn user
          location = {
            latitude: null,
            longitude: null,
          };
          toast.warning('⚠️ Lokasi GPS tidak tersedia. Absensi dilakukan tanpa validasi lokasi. Pastikan Anda berada di lokasi yang benar.');
        }
      }
      
      // Get current time for shift
      const now = new Date();
      const shiftDate = now.toISOString().split('T')[0];
      const startTime = '08:00'; // Default start time, bisa diubah sesuai kebutuhan
      const endTime = '17:00'; // Default end time, bisa diubah sesuai kebutuhan

      const result = await attendanceService.clockIn({
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (result?.success) {
        toast.success('Clock in berhasil!');
        // ✅ REACT QUERY: Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.todayShift(null) });
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.history(null, { date: attendanceDate }) });
        await Promise.all([refetchTodayShift(), refetchAttendance()]);
      } else {
        toast.error(result?.message || 'Gagal melakukan clock in');
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      const errorMessage = error.message || 'Gagal melakukan clock in';
      setLocationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setClockingIn(false);
    }
  };

  // Handle clock out
  const handleClockOut = async () => {
    if (!todayShift) {
      toast.error('Tidak ada shift aktif');
      return;
    }

    setClockingOut(true);
    setLocationError(null);

    try {
      // ✅ NEW: Check if GPS is required for this outlet
      const gpsRequired = currentOutlet?.attendance_gps_required ?? false;
      
      // Get current location
      let location;
      try {
        location = await attendanceService.getCurrentLocation({ timeout: 20000 });
      } catch (locationError) {
        // ✅ FIX: If GPS is required, reject clock out if GPS fails
        if (gpsRequired) {
          toast.error('⚠️ GPS wajib untuk absensi di outlet ini. Pastikan GPS aktif dan izinkan akses lokasi di pengaturan browser.');
          setClockingOut(false);
          return;
        }
        
        // ✅ GPS is not required - use fallback
        console.warn('⚠️ Failed to get GPS location for clock out, using outlet location as fallback:', locationError);
        if (currentOutlet?.latitude && currentOutlet?.longitude) {
          location = {
            latitude: parseFloat(currentOutlet.latitude),
            longitude: parseFloat(currentOutlet.longitude),
          };
        } else {
          location = {
            latitude: null,
            longitude: null,
          };
        }
      }

      const result = await attendanceService.clockOut(todayShift.id, {
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
      });

      if (result?.success) {
        toast.success('Clock out berhasil!');
        // ✅ REACT QUERY: Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.todayShift(null) });
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.history(null, { date: attendanceDate }) });
        await Promise.all([refetchTodayShift(), refetchAttendance()]);
      } else {
        toast.error(result?.message || 'Gagal melakukan clock out');
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      const errorMessage = error.message || 'Gagal melakukan clock out';
      setLocationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setClockingOut(false);
    }
  };

  // Format attendance data for display
  const formatAttendanceData = useMemo(() => {
    if (!attendanceData || !Array.isArray(attendanceData)) return [];
    return attendanceData.map(shift => {
      const clockIn = shift.clock_in ? new Date(`2000-01-01T${shift.clock_in}`).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null;
      const clockOut = shift.clock_out ? new Date(`2000-01-01T${shift.clock_out}`).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null;
      
      let workingHours = 0;
      if (clockIn && clockOut) {
        const inTime = new Date(`2000-01-01T${shift.clock_in}`);
        const outTime = new Date(`2000-01-01T${shift.clock_out}`);
        workingHours = (outTime - inTime) / (1000 * 60 * 60);
      }

      return {
        id: shift.id,
        employeeId: shift.user_id,
        employeeName: shift.user?.name || 'Unknown',
        date: shift.shift_date,
        checkIn: clockIn,
        checkOut: clockOut,
        workingHours: workingHours,
        status: shift.status === 'completed' ? 'present' : shift.status === 'late' ? 'late' : shift.status === 'absent' ? 'absent' : 'present',
        overtime: Math.max(0, workingHours - 8), // Assume 8 hours standard
        notes: shift.notes || '',
        shift: shift,
      };
    });
  }, [attendanceData]);

  // Fetch attendance stats for performance calculation
  const {
    data: attendanceStatsData,
    isLoading: attendanceStatsLoading,
  } = useQuery({
    queryKey: ['attendance-stats', currentBusiness?.id],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(1); // Start of current month
      const endDate = new Date();
      
      const result = await attendanceService.getStats({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      return result;
    },
    enabled: !!currentBusiness?.id && selectedTab === 'employees',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Reset filter
  const handleResetFilter = () => {
    setFilterRole('all');
    setFilterStatus('all');
    setFilterOpen(false);
  };

  // Check if filter is active
  const isFilterActive = filterRole !== 'all' || filterStatus !== 'all';

  // ✅ OPTIMIZATION: Handle refresh dengan manual refetch
  const handleRefresh = useCallback(async () => {
    if (refreshing || employeesLoading || employeesFetching || attendanceLoading) return; // Prevent multiple simultaneous refreshes

    setRefreshing(true);
    try {
      const promises = [refetchEmployees()];
      if (selectedTab === 'attendance') {
        promises.push(refetchAttendance(), refetchTodayShift());
      }
      await Promise.all(promises);
      toast({
        title: 'Berhasil!',
        description: 'Data karyawan berhasil dimuat ulang',
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to refresh:', error);
      toast({
        title: 'Error!',
        description: 'Gagal memuat ulang data karyawan',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, employeesLoading, employeesFetching, attendanceLoading, refetchEmployees, refetchAttendance, refetchTodayShift, selectedTab, toast]);

  // ✅ F5 Handler: Refresh data without full page reload
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F5 or R key (with Ctrl/Cmd or without)
      if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault(); // Prevent default browser reload
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRefresh]);

  // Employee handlers
  const handleAddEmployee = () => {
    setEmployeeModalMode('add');
    setSelectedEmployee(null);
    setEmployeeModalOpen(true);
  };

  const handleEditEmployee = employee => {
    setEmployeeModalMode('edit');
    setSelectedEmployee(employee);
    setEmployeeModalOpen(true);
  };

  // ✅ OPTIMIZATION: Handle save employee dengan optimistic update dan retry
  const handleSaveEmployee = useCallback(
    async formData => {
      const employeeName = formData.name || 'Karyawan';
      const isAdding = employeeModalMode === 'add';

      // ✅ OPTIMIZATION: Optimistic update - update UI immediately
      const previousEmployees = employees;

      return optimisticUpdateEmployee(
        {
          employees: isAdding
            ? [
                ...previousEmployees,
                {
                  id: Date.now(), // Temporary ID
                  ...formData,
                  is_active: formData.is_active !== false,
                },
              ]
            : previousEmployees.map(emp =>
                emp.id === selectedEmployee?.id
                  ? { ...emp, ...formData }
                  : emp
              ),
          employee: isAdding
            ? { id: Date.now(), ...formData }
            : { ...selectedEmployee, ...formData },
        },
        async () => {
          // ✅ OPTIMIZATION: API call dengan retry
          const result = await retryWithBackoff(
            () =>
              isAdding
                ? employeeService.create(formData)
                : employeeService.update(selectedEmployee.id, formData),
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

          if (result.success) {
            // ✅ FIX: Update query data dengan employee dari response (create atau update)
            if (result.data) {
              const employeeData = result.data.employee || result.data;
              
              // Update semua query keys yang terkait (dengan dan tanpa search)
              queryClient.setQueriesData(
                { queryKey: queryKeys.employees.list(currentBusiness?.id) },
                (oldData) => {
                  if (!oldData) return oldData;
                  
                  // Handle different data structures
                  const currentEmployees = Array.isArray(oldData) 
                    ? oldData 
                    : (oldData.data || []);
                  
                  if (isAdding) {
                    // Check if employee already exists (avoid duplicates)
                    const exists = currentEmployees.some(emp => 
                      emp.id === employeeData.id || 
                      (emp.email === employeeData.email && emp.id)
                    );
                    
                    if (!exists) {
                      // Add new employee
                      return Array.isArray(oldData)
                        ? [...currentEmployees, employeeData]
                        : { ...oldData, data: [...currentEmployees, employeeData] };
                    }
                  } else {
                    // Update existing employee
                    return Array.isArray(oldData)
                      ? currentEmployees.map(emp => 
                          emp.id === employeeData.id ? employeeData : emp
                        )
                      : { ...oldData, data: currentEmployees.map(emp => 
                          emp.id === employeeData.id ? employeeData : emp
                        ) };
                  }
                  
                  return oldData;
                }
              );
            }

            // Invalidate and refetch untuk memastikan data sync
            await queryClient.invalidateQueries({
              queryKey: queryKeys.employees.list(currentBusiness?.id),
            });
            
            // ✅ FIX: Refetch langsung untuk memastikan data terbaru
            // Jangan throw error jika refetch gagal - hanya log (non-critical)
            try {
              await refetchEmployees();
            } catch (refetchError) {
              // ✅ FIX: Jangan tampilkan error toast untuk refetch error (non-critical)
              // Hanya log untuk debugging
              console.warn('⚠️ Refetch error (non-critical):', refetchError);
            }

            // ✅ FIX: Tampilkan success toast SETELAH semua operasi selesai
            // Ini memastikan tidak ada error toast yang muncul setelah success toast
            // ✅ FIX: Hanya tampilkan 1 toast success (gabungkan info)
            toast.success(
              `✅ ${employeeName} berhasil ${
                isAdding ? 'ditambahkan' : 'diupdate'
              }! Role: ${formData.role || 'kasir'}`,
              { duration: 4000 }
            );

            setEmployeeModalOpen(false);

            return result;
          } else {
            // ✅ FIX: Check for subscription limit error
            if (result.error === 'subscription_limit_reached' || isSubscriptionLimitError({ response: { data: result } })) {
              // Handle subscription limit error
              handleLimitError(result);
              setEmployeeModalOpen(false);
              setSelectedEmployee(null);
              
              // ✅ FIX: Tampilkan toast dengan pesan yang jelas (hanya sekali)
              // Jangan tampilkan "Gagal menyimpan" toast, hanya toast subscription limit
              // ✅ FIX: Tampilkan toast dengan pesan yang persuasif dan jelas
              const errorMessage = result.message || 
                `Limit karyawan yang Anda beli sudah habis! Paket Anda hanya mencakup ${result.limits?.max_employees || 5} karyawan. Saat ini Anda sudah menggunakan ${result.limits?.current_employees || 0} karyawan. Silakan tingkatkan paket untuk menambahkan lebih banyak karyawan.`;
              
              // ✅ FIX: Tampilkan toast dengan pesan yang persuasif
              toast.error(`⚠️ ${errorMessage}`, { duration: 6000 });
              
              // Return result untuk di-handle oleh modal (jangan throw)
              // Modal akan skip error handling karena sudah ditangani di sini
              return result;
            }
            
            // ✅ FIX: Untuk error lainnya, return result tanpa menampilkan toast di sini
            // Biarkan modal menangani error tersebut
            const errorMessage =
              result.error || result.message || 'Gagal menyimpan karyawan';

            // ✅ FIX: Return error result instead of throwing
            // Error will be handled by modal component
            return result;
          }
        }
      );
    },
    [
      employeeModalMode,
      employees,
      selectedEmployee,
      optimisticUpdateEmployee,
      queryClient,
      currentBusiness?.id,
      toast,
      refetchEmployees,
      isSubscriptionLimitError,
      handleLimitError,
    ]
  );

  // ✅ NEW: Open delete confirmation modal
  const handleDeleteClick = useCallback((id) => {
    const employee = employees.find(emp => emp.id === id);
    setEmployeeToDelete(employee);
    setDeleting(false); // ✅ FIX: Ensure deleting state is false when opening modal
    setDeleteConfirmOpen(true);
  }, [employees]);

  // ✅ OPTIMIZATION: Handle delete employee dengan optimistic update dan retry
  const handleDeleteEmployee = useCallback(
    async (id) => {
      if (!id) return;

      // Find employee name
      const employee = employees.find(emp => emp.id === id);
      const employeeName = employee?.name || 'Karyawan';

      setDeleting(true);

      try {
        // ✅ OPTIMIZATION: Optimistic update - remove from UI immediately
        const previousEmployees = employees;

        const result = await optimisticUpdateEmployee(
          {
            employees: previousEmployees.filter(emp => emp.id !== id),
            removedId: id,
          },
          async () => {
            // ✅ OPTIMIZATION: API call dengan retry
            const deleteResult = await retryWithBackoff(
              () => employeeService.delete(id),
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

            if (deleteResult.success) {
              // ✅ FIX: Invalidate dan refetch secara eksplisit untuk memastikan data terbaru
              await queryClient.invalidateQueries({
                queryKey: queryKeys.employees.list(currentBusiness?.id),
              });
              
              // ✅ FIX: Refetch employees secara eksplisit
              await refetchEmployees();

              return deleteResult;
            } else {
              const errorMessage =
                deleteResult.error || deleteResult.message || 'Gagal menghapus karyawan';
              toast.error(`❌ ${errorMessage}`, { duration: 6000 });
              throw new Error(errorMessage);
            }
          }
        );

        if (result && result.success) {
          toast.success(`✅ ${employeeName} berhasil dihapus!`, {
            duration: 4000,
          });

          // ✅ FIX: Close modal after success
          setDeleteConfirmOpen(false);
          setEmployeeToDelete(null);
          
          // ✅ FIX: Reset deleting state after modal is closed
          setDeleting(false);
        } else {
          // ✅ FIX: Reset deleting state on failure
          setDeleting(false);
        }
      } catch (error) {
        // Error sudah di-handle di optimisticUpdateEmployee
        // Hanya log untuk debugging
        console.error('Error deleting employee:', error);
        // ✅ FIX: Reset deleting state on error
        setDeleting(false);
      }
    },
    [
      employees,
      optimisticUpdateEmployee,
      queryClient,
      currentBusiness?.id,
      toast,
      refetchEmployees,
    ]
  );

  const getStatusBadge = status => {
    const isActive = status === true || status === 1 || status === 'active';
    const config = isActive
      ? {
          color: 'bg-green-100 text-green-800 border-green-200',
          label: 'Aktif',
          icon: UserCheck,
        }
      : {
          color: 'bg-red-100 text-red-800 border-red-200',
          label: 'Nonaktif',
          icon: UserX,
        };

    const Icon = config.icon;

    return (
      <Badge
        className={`${config.color} border font-medium flex items-center space-x-1`}
      >
        <Icon className='w-3 h-3' />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getRoleBadge = role => {
    const roleConfig = {
      admin: {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        label: 'Admin',
        icon: Shield,
      },
      kasir: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Kasir',
        icon: ShoppingCart,
      },
      kitchen: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        label: 'Dapur',
        icon: UtensilsCrossed,
      },
      waiter: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Pelayan',
        icon: Coffee,
      },
    };

    // Default to kasir if role not found
    const config = roleConfig[role] || roleConfig.kasir;
    const Icon = config.icon;

    return (
      <Badge
        className={`${config.color} border font-medium flex items-center space-x-1`}
      >
        <Icon className='w-3 h-3' />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getAttendanceStatusBadge = status => {
    const statusConfig = {
      present: {
        color: 'bg-green-100 text-green-800',
        label: 'Hadir',
        icon: CheckCircle,
      },
      late: {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Terlambat',
        icon: Clock,
      },
      absent: {
        color: 'bg-red-100 text-red-800',
        label: 'Tidak Hadir',
        icon: XCircle,
      },
      working: {
        color: 'bg-blue-100 text-blue-800',
        label: 'Sedang Bekerja',
        icon: Clock,
      },
      overtime: {
        color: 'bg-purple-100 text-purple-800',
        label: 'Lembur',
        icon: TrendingUp,
      },
    };

    const config = statusConfig[status] || statusConfig.present;
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

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = dateString => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getActiveEmployeesCount = () => {
    return employees.filter(
      emp => emp.is_active === true || emp.is_active === 1
    ).length;
  };

  const getTotalSalary = () => {
    return employees
      .filter(emp => emp.is_active === true || emp.is_active === 1)
      .reduce((total, emp) => {
        // Handle different salary formats
        const salary = emp.salary || emp.user?.salary || 0;
        return total + (parseFloat(salary) || 0);
      }, 0);
  };

  const getPresentTodayCount = () => {
    return formatAttendanceData.filter(
      att => att.status === 'present' || att.status === 'working'
    ).length;
  };

  const getAveragePerformance = () => {
    // Calculate from attendance stats if available
    if (attendanceStatsData?.success && attendanceStatsData?.data?.employee_performance) {
      const performances = attendanceStatsData.data.employee_performance;
      if (performances.length > 0) {
        // Convert attendance_rate (0-100) to performance score (0-5)
        // attendance_rate 100% = 5.0, 80% = 4.0, etc.
        const avgAttendanceRate = performances.reduce((sum, perf) => sum + (perf.attendance_rate || 0), 0) / performances.length;
        // Convert to 0-5 scale: 100% = 5.0, 0% = 0.0
        return (avgAttendanceRate / 100) * 5;
      }
    }
    
    // Fallback: calculate from current attendance data
    if (formatAttendanceData.length > 0) {
      const presentCount = formatAttendanceData.filter(
        att => att.status === 'present' || att.status === 'working'
      ).length;
      const totalCount = formatAttendanceData.length;
      if (totalCount > 0) {
        const attendanceRate = (presentCount / totalCount) * 100;
        return (attendanceRate / 100) * 5; // Convert to 0-5 scale
      }
    }
    
    // Default fallback
    return 0;
  };

  // ✅ OPTIMIZATION: Memoized filter untuk performa
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Filter by search term
    if (debouncedSearchTerm) {
      filtered = filtered.filter(
        employee =>
          employee.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          employee.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          employee.employee_code?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(
        employee => employee.user?.role === filterRole
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      const isActive = filterStatus === 'active';
      filtered = filtered.filter(
        employee => {
          const active = employee.is_active === true || employee.is_active === 1 || employee.is_active === 'active';
          return isActive ? active : !active;
        }
      );
    }

    return filtered;
  }, [employees, debouncedSearchTerm, filterRole, filterStatus]);

  // ✅ OPTIMIZATION: Show skeleton loader until all data is loaded
  // Show skeleton if:
  // 1. Query is enabled and employees are still loading (initial load)
  // 2. Query is enabled but no employeesData has been received yet (undefined = not loaded)
  // 3. Attendance tab is selected and attendance data is loading or not yet received
  const isQueryEnabled = !!currentBusiness?.id;
  const hasEmployeesData = employeesData !== undefined; // Data has been received (can be empty array, but not undefined)
  
  // Show skeleton during initial load (when loading OR no data received yet)
  const isInitialLoad = 
    isQueryEnabled && (
      employeesLoading || // Still loading
      !hasEmployeesData || // No data received yet (undefined)
      (selectedTab === 'attendance' && (attendanceLoading || attendanceData === undefined))
    );
  
  if (isInitialLoad) {
    return <EmployeeManagementSkeleton />;
  }

  // ✅ OPTIMIZATION: Handle errors
  if (employeesError) {
    const error = employeesError;
    let errorMessage = '❌ Gagal memuat data karyawan';
    let errorDetails = '';

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          errorMessage = '❌ Business ID diperlukan';
          errorDetails = data.message || 'Pastikan business ID terkirim dengan benar';
          break;
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
    
    // ✅ DEBUG: Log error untuk debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('📋 EmployeeManagement: Error loading employees', {
        error,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
        currentBusiness: currentBusiness?.id,
      });
    }

    return (
      <div className='space-y-6'>
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4'>
          <p className='font-semibold'>{errorMessage}</p>
          {errorDetails && <p className='text-sm mt-1'>{errorDetails}</p>}
        </div>
        <Button
          onClick={handleRefresh}
          className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        >
          <RefreshCw className='w-4 h-4 inline mr-2' />
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Outlet Context Banner */}
      {currentOutlet && (
        <Alert className='bg-blue-50 border-blue-400 text-blue-800'>
          <AlertDescription className='flex items-center gap-2'>
            <Users className='w-4 h-4' />
            <span>
              <strong>Konteks Outlet:</strong> Anda sedang melihat data untuk
              outlet <strong>{currentOutlet.name}</strong>. Karyawan dapat
              diassign ke outlet tertentu di halaman{' '}
              <strong>Akses Outlet</strong>.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>
            Manajemen Karyawan
          </h2>
          <p className='text-gray-600'>
            Kelola data karyawan, absensi, dan performa
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6'>
        <Card className='card-hover'>
          <CardContent className='p-4 sm:p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex-1 min-w-0'>
                <p className='text-xs sm:text-sm font-medium text-gray-600'>
                  Karyawan Aktif
                </p>
                <p className='text-xl sm:text-2xl font-bold text-gray-900'>
                  {getActiveEmployeesCount()}
                </p>
                <p className='text-[10px] sm:text-xs text-green-600 mt-1'>
                  dari {employees.length} total
                </p>
              </div>
              <Users className='w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-4 sm:p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex-1 min-w-0'>
                <p className='text-xs sm:text-sm font-medium text-gray-600'>
                  Hadir Hari Ini
                </p>
                <p className='text-xl sm:text-2xl font-bold text-gray-900'>
                  {getPresentTodayCount()}
                </p>
                <p className='text-[10px] sm:text-xs text-green-600 mt-1'>
                  {getActiveEmployeesCount() > 0
                    ? `${(
                        (getPresentTodayCount() / getActiveEmployeesCount()) *
                        100
                      ).toFixed(0)}% attendance`
                    : '0% attendance'}
                </p>
              </div>
              <CheckCircle className='w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-4 sm:p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex-1 min-w-0'>
                <p className='text-xs sm:text-sm font-medium text-gray-600'>Total Gaji</p>
                <p className='text-lg sm:text-2xl font-bold text-gray-900'>
                  {formatCurrency(getTotalSalary())}
                </p>
                <p className='text-[10px] sm:text-xs text-gray-600 mt-1'>per bulan</p>
              </div>
              <Award className='w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Performa Rata-rata
                </p>
                <p className='text-2xl font-bold text-blue-600'>
                  {getAveragePerformance() > 0 ? getAveragePerformance().toFixed(1) : '-'}
                </p>
                {getAveragePerformance() > 0 && (
                  <div className='flex items-center mt-1'>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= getAveragePerformance()
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <Star className='w-8 h-8 text-yellow-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='employees' data-testid='employees-tab'>
                Karyawan
              </TabsTrigger>
              <TabsTrigger value='attendance' data-testid='attendance-tab'>
                Absensi
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <Tabs value={selectedTab}>
            {/* Employees Tab */}
            <TabsContent value='employees' className='space-y-4'>
              {/* Search and Filter */}
              <div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    placeholder='Cari karyawan...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='pl-10 text-sm sm:text-base'
                    data-testid='employee-search'
                  />
                </div>
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant='outline' 
                      data-testid='filter-employees'
                      className={isFilterActive ? 'bg-blue-50 border-blue-300' : ''}
                    >
                      <Filter className='w-4 h-4 mr-2' />
                      Filter
                      {isFilterActive && (
                        <span className='ml-2 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs'>
                          {(filterRole !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0)}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-80' align='end'>
                    <div className='space-y-4'>
                      <div className='flex items-center justify-between'>
                        <h4 className='font-semibold text-gray-900'>Filter Karyawan</h4>
                        {isFilterActive && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={handleResetFilter}
                            className='text-xs text-blue-600 hover:text-blue-700'
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                      
                      {/* Role Filter */}
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                          Peran/Role
                        </label>
                        <select
                          value={filterRole}
                          onChange={e => setFilterRole(e.target.value)}
                          className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
                        >
                          <option value='all'>Semua Role</option>
                          <option value='admin'>Admin</option>
                          <option value='kasir'>Kasir</option>
                          <option value='kitchen'>Dapur</option>
                          <option value='waiter'>Pelayan</option>
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                          Status
                        </label>
                        <select
                          value={filterStatus}
                          onChange={e => setFilterStatus(e.target.value)}
                          className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
                        >
                          <option value='all'>Semua Status</option>
                          <option value='active'>Aktif</option>
                          <option value='inactive'>Nonaktif</option>
                        </select>
                      </div>

                      {/* Filter Summary */}
                      {isFilterActive && (
                        <div className='pt-2 border-t'>
                          <p className='text-xs text-gray-600'>
                            Filter aktif: {filterRole !== 'all' && `Role: ${filterRole === 'admin' ? 'Admin' : filterRole === 'kasir' ? 'Kasir' : filterRole === 'kitchen' ? 'Dapur' : 'Pelayan'}`}
                            {filterRole !== 'all' && filterStatus !== 'all' && ', '}
                            {filterStatus !== 'all' && `Status: ${filterStatus === 'active' ? 'Aktif' : 'Nonaktif'}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant='outline'
                  data-testid='refresh-employees'
                  onClick={handleRefresh}
                  disabled={refreshing || employeesFetching}
                  title='Refresh data karyawan'
                  className='w-full sm:w-auto'
                  size='sm'
                >
                  <RefreshCw
                    className={`w-4 h-4 sm:mr-2 ${
                      refreshing || employeesFetching ? 'animate-spin' : ''
                    }`}
                  />
                  <span className='hidden sm:inline'>Refresh</span>
                </Button>
                <Button
                  onClick={() => {
                    setEmployeeModalMode('add');
                    setSelectedEmployee(null);
                    setEmployeeModalOpen(true);
                  }}
                  className='bg-blue-600 hover:bg-blue-700 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md active:scale-[0.98]'
                  size='sm'
                  disabled={isOptimisticPending || employeeModalOpen}
                >
                  {/* ✅ FIX: Hanya tampilkan loading jika sedang menyimpan DAN modal belum terbuka */}
                  {isOptimisticPending && !employeeModalOpen ? (
                    <span className='flex items-center'>
                      <Loader2 className='w-4 h-4 sm:mr-2 animate-spin' />
                      <span className='hidden sm:inline'>Menyimpan...</span>
                      <span className='sm:hidden'>Menyimpan...</span>
                    </span>
                  ) : (
                    <span className='flex items-center'>
                      <Plus className='w-4 h-4 sm:mr-2' />
                      <span className='hidden sm:inline'>Tambah Karyawan</span>
                      <span className='sm:hidden'>Tambah</span>
                    </span>
                  )}
                </Button>
                <Button 
                  variant='outline' 
                  data-testid='employee-report'
                  size='sm'
                  className='w-full sm:w-auto'
                >
                  <Download className='w-4 h-4 sm:mr-2' />
                  <span className='hidden sm:inline'>Export</span>
                  <span className='sm:hidden'>Export</span>
                </Button>
              </div>

              {/* Employees List */}
              <div className='space-y-4'>
                {filteredEmployees.length === 0 ? (
                  <div className='text-center py-12 text-gray-500'>
                    <Users className='w-12 h-12 mx-auto mb-4 text-gray-400' />
                    <p>Tidak ada karyawan ditemukan</p>
                  </div>
                ) : (
                  filteredEmployees.map(employee => (
                    <Card
                      key={employee.id}
                      className='card-hover'
                      data-testid={`employee-${employee.id}`}
                    >
                      <CardContent className='p-3 sm:p-4'>
                        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4'>
                          <div className='flex items-center space-x-3 flex-1 min-w-0'>
                            <div className='w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-base sm:text-lg flex-shrink-0'>
                              {employee.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className='flex-1 min-w-0'>
                              <h3 className='font-semibold text-gray-900 truncate'>
                                {employee.name}
                              </h3>
                              <p className='text-xs sm:text-sm text-gray-600 truncate'>
                                {employee.employee_code}
                              </p>
                              <div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500 mt-1'>
                                <div className='flex items-center space-x-1 min-w-0'>
                                  <Mail className='w-3 h-3 flex-shrink-0' />
                                  <span className='truncate'>{employee.email}</span>
                                </div>
                                {employee.phone && (
                                  <div className='flex items-center space-x-1 min-w-0'>
                                    <Phone className='w-3 h-3 flex-shrink-0' />
                                    <span className='truncate'>{employee.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className='flex items-center space-x-2 flex-shrink-0'>
                            {getRoleBadge(employee.user?.role)}
                            {getStatusBadge(employee.is_active)}
                          </div>
                        </div>

                        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 text-xs sm:text-sm'>
                          <div>
                            <p className='text-gray-600'>Gaji</p>
                            <p className='font-bold text-green-600'>
                              {formatCurrency(employee.salary || employee.user?.salary || 0)}
                            </p>
                          </div>
                          <div>
                            <p className='text-gray-600'>Komisi</p>
                            <p className='font-medium'>
                              {employee.commission_rate || 0}%
                            </p>
                          </div>
                          <div>
                            <p className='text-gray-600'>Bergabung</p>
                            <p className='font-medium'>
                              {formatDate(employee.hired_at || employee.user?.created_at)}
                            </p>
                          </div>
                          <div>
                            <p className='text-gray-600'>Absensi Hari Ini</p>
                            <div className='font-medium'>
                              {formatAttendanceData
                                .filter(att => att.employeeId === employee.user_id || att.employeeId === employee.id)
                                .length > 0 ? (
                                <Badge className='bg-green-100 text-green-800'>
                                  Hadir
                                </Badge>
                              ) : (
                                <Badge className='bg-gray-100 text-gray-800'>
                                  -
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className='text-gray-600'>Alamat</p>
                            <p className='font-medium text-gray-800 truncate'>
                              {employee.address || employee.user?.address || '-'}
                            </p>
                          </div>
                          <div className='flex justify-end space-x-2 col-span-2 sm:col-span-1'>
                            <Button
                              size='sm'
                              variant='outline'
                              data-testid={`edit-employee-${employee.id}`}
                              onClick={() => handleEditEmployee(employee)}
                              className='flex-1 sm:flex-initial'
                            >
                              <Edit className='w-4 h-4 sm:mr-0' />
                              <span className='sm:hidden ml-1'>Edit</span>
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              className='text-red-600 hover:text-red-700 flex-1 sm:flex-initial'
                              data-testid={`delete-employee-${employee.id}`}
                              onClick={() => handleDeleteClick(employee.id)}
                            >
                              <Trash2 className='w-4 h-4 sm:mr-0' />
                              <span className='sm:hidden ml-1'>Hapus</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value='attendance' className='space-y-4'>
              {/* Clock In/Out Section */}
              {todayShift && (
                <Card className='bg-gradient-to-r from-blue-50 to-green-50 border-blue-200'>
                  <CardContent className='p-4'>
                    <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
                      <div className='flex-1'>
                        <h3 className='font-semibold text-gray-900 mb-2'>
                          Shift Hari Ini
                        </h3>
                        <div className='grid grid-cols-2 gap-4 text-sm'>
                          <div>
                            <p className='text-gray-600'>Check In</p>
                            <p className='font-bold text-green-600'>
                              {todayShift.clock_in 
                                ? new Date(`2000-01-01T${todayShift.clock_in}`).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                : '-'}
                            </p>
                          </div>
                          <div>
                            <p className='text-gray-600'>Check Out</p>
                            <p className='font-bold text-red-600'>
                              {todayShift.clock_out 
                                ? new Date(`2000-01-01T${todayShift.clock_out}`).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                : '-'}
                            </p>
                          </div>
                        </div>
                        {locationError && (
                          <div className='mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2'>
                            <AlertCircle className='w-4 h-4' />
                            {locationError}
                          </div>
                        )}
                      </div>
                      <div className='flex gap-2'>
                        {!todayShift.clock_in ? (
                          <Button
                            onClick={handleClockIn}
                            disabled={clockingIn}
                            className='bg-green-600 hover:bg-green-700'
                          >
                            {clockingIn ? (
                              <>
                                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                                Memproses...
                              </>
                            ) : (
                              <>
                                <LogIn className='w-4 h-4 mr-2' />
                                Clock In
                              </>
                            )}
                          </Button>
                        ) : !todayShift.clock_out ? (
                          <Button
                            onClick={handleClockOut}
                            disabled={clockingOut}
                            className='bg-red-600 hover:bg-red-700'
                          >
                            {clockingOut ? (
                              <>
                                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                                Memproses...
                              </>
                            ) : (
                              <>
                                <LogOut className='w-4 h-4 mr-2' />
                                Clock Out
                              </>
                            )}
                          </Button>
                        ) : (
                          <Badge className='bg-green-100 text-green-800'>
                            <CheckCircle className='w-4 h-4 mr-1' />
                            Shift Selesai
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Date Filter */}
              <div className='flex flex-col sm:flex-row gap-4 items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <Calendar className='w-5 h-5 text-gray-500' />
                  <span className='font-medium'>
                    Tanggal:{' '}
                    {new Date(attendanceDate).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    data-testid='prev-date'
                    onClick={() => {
                      const date = new Date(attendanceDate);
                      date.setDate(date.getDate() - 1);
                      setAttendanceDate(date.toISOString().split('T')[0]);
                    }}
                  >
                    ← Kemarin
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    data-testid='today-date'
                    onClick={() => {
                      setAttendanceDate(new Date().toISOString().split('T')[0]);
                    }}
                  >
                    Hari Ini
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    data-testid='next-date'
                    onClick={() => {
                      const date = new Date(attendanceDate);
                      date.setDate(date.getDate() + 1);
                      setAttendanceDate(date.toISOString().split('T')[0]);
                    }}
                  >
                    Besok →
                  </Button>
                </div>
              </div>

              {/* Attendance List */}
              {attendanceLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
                </div>
              ) : formatAttendanceData.length === 0 ? (
                <Card>
                  <CardContent className='text-center py-12'>
                    <Calendar className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                    <p className='text-gray-600 mb-2'>Tidak ada data absensi</p>
                    <p className='text-sm text-gray-500'>
                      Belum ada absensi untuk tanggal ini
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className='space-y-3'>
                  {formatAttendanceData.map(record => (
                  <Card
                    key={record.id}
                    className='card-hover'
                    data-testid={`attendance-${record.id}`}
                  >
                    <CardContent className='p-4'>
                      <div className='flex items-center justify-between mb-3'>
                        <div className='flex items-center space-x-4'>
                          <div className='w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold'>
                            {record.employeeName.charAt(0)}
                          </div>
                          <div>
                            <h3 className='font-semibold text-gray-900'>
                              {record.employeeName}
                            </h3>
                            <p className='text-sm text-gray-600'>
                              {record.date}
                            </p>
                          </div>
                        </div>
                        {getAttendanceStatusBadge(record.status)}
                      </div>

                      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 text-xs sm:text-sm'>
                        <div>
                          <p className='text-gray-600'>Check In</p>
                          <p className='font-bold text-green-600'>
                            {record.checkIn || '-'}
                          </p>
                          {record.shift?.clock_in_latitude && (
                            <p className='text-xs text-gray-500 flex items-start gap-1 mt-1 break-all'>
                              <MapPin className='w-3 h-3 flex-shrink-0 mt-0.5' />
                              <span className='text-[10px] leading-tight'>
                                {parseFloat(record.shift.clock_in_latitude).toFixed(4)}, {parseFloat(record.shift.clock_in_longitude).toFixed(4)}
                              </span>
                            </p>
                          )}
                        </div>
                        <div>
                          <p className='text-gray-600'>Check Out</p>
                          <p className='font-bold text-red-600'>
                            {record.checkOut || '-'}
                          </p>
                          {record.shift?.clock_out_latitude && (
                            <p className='text-xs text-gray-500 flex items-start gap-1 mt-1 break-all'>
                              <MapPin className='w-3 h-3 flex-shrink-0 mt-0.5' />
                              <span className='text-[10px] leading-tight'>
                                {parseFloat(record.shift.clock_out_latitude).toFixed(4)}, {parseFloat(record.shift.clock_out_longitude).toFixed(4)}
                              </span>
                            </p>
                          )}
                        </div>
                        <div>
                          <p className='text-gray-600'>Jam Kerja</p>
                          <p className='font-medium'>
                            {record.workingHours > 0 ? `${record.workingHours.toFixed(2)} jam` : '-'}
                          </p>
                        </div>
                        <div>
                          <p className='text-gray-600'>Lembur</p>
                          <p className='font-medium text-purple-600'>
                            {record.overtime > 0
                              ? `+${record.overtime.toFixed(2)} jam`
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className='text-gray-600'>Catatan</p>
                          <p className='font-medium text-gray-800'>
                            {record.notes || '-'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))}
                </div>
              )}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
      <EmployeeFormModal
        isOpen={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
        employee={selectedEmployee}
        mode={employeeModalMode}
      />
      
      {/* Subscription Limit Modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={closeLimitModal}
        errorData={limitError}
      />

      {/* ✅ NEW: Delete Confirmation Modal */}
      <AlertDialog 
        open={deleteConfirmOpen} 
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          // ✅ FIX: Reset deleting state when modal is closed
          if (!open) {
            setDeleting(false);
            setEmployeeToDelete(null);
          }
        }}
      >
        <AlertDialogContent className='sm:max-w-[500px]'>
          <AlertDialogHeader>
            <div className='flex items-center gap-3 mb-2'>
              <div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center'>
                <Trash2 className='w-6 h-6 text-red-600' />
              </div>
              <AlertDialogTitle className='text-xl text-red-600'>
                Hapus Karyawan?
              </AlertDialogTitle>
            </div>
            <div className='text-base space-y-2'>
              <AlertDialogDescription className='font-medium text-gray-900'>
                ⚠️ PERINGATAN: Tindakan ini tidak dapat dibatalkan!
              </AlertDialogDescription>
              {employeeToDelete && (
                <div className='bg-gray-50 rounded-lg p-4 mt-3 space-y-2 border border-gray-200'>
                  <p className='text-sm text-gray-700'>
                    <span className='font-semibold'>Nama:</span>{' '}
                    {employeeToDelete.name}
                  </p>
                  <p className='text-sm text-gray-700'>
                    <span className='font-semibold'>Email:</span>{' '}
                    {employeeToDelete.email}
                  </p>
                  {employeeToDelete.employee_code && (
                    <p className='text-sm text-gray-700'>
                      <span className='font-semibold'>Kode:</span>{' '}
                      {employeeToDelete.employee_code}
                    </p>
                  )}
                  {employeeToDelete.role && (
                    <p className='text-sm text-gray-700'>
                      <span className='font-semibold'>Role:</span>{' '}
                      <Badge variant='outline' className='ml-1 capitalize'>
                        {employeeToDelete.role}
                      </Badge>
                    </p>
                  )}
                </div>
              )}
              <div className='bg-red-50 border border-red-200 rounded-lg p-3 mt-3'>
                <p className='text-sm text-red-800 font-medium'>
                  Data karyawan ini akan dihapus permanen dari sistem dan tidak dapat dikembalikan.
                </p>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-0'>
            <AlertDialogCancel disabled={deleting} className='w-full sm:w-auto'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (employeeToDelete?.id) {
                  handleDeleteEmployee(employeeToDelete.id);
                }
              }}
              disabled={deleting || !employeeToDelete?.id}
              className='bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {deleting ? (
                <span className='flex items-center gap-2'>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Menghapus...
                </span>
              ) : (
                <span className='flex items-center gap-2'>
                  <Trash2 className='w-4 h-4' />
                  Ya, Hapus
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeeManagement;
