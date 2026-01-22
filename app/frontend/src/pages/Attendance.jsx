import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  Calendar,
  Calendar as CalendarIcon,
  Camera,
  CheckCircle,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
// FaceID feature temporarily disabled
// import FaceCapture from '../components/attendance/FaceCapture';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { useToast } from '../components/ui/toast';
import { queryKeys } from '../config/reactQuery';
import { useAuth } from '../contexts/AuthContext';
import attendanceService from '../services/attendance.service';

const Attendance = () => {
  const { currentBusiness, currentOutlet, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftType, setShiftType] = useState('pagi'); // pagi, siang, malam, custom
  const [customStartTime, setCustomStartTime] = useState('08:00');
  const [customEndTime, setCustomEndTime] = useState('17:00');
  // FaceID feature temporarily disabled
  // const [showFaceCapture, setShowFaceCapture] = useState(false);
  // const [faceCaptureMode, setFaceCaptureMode] = useState('verify');
  // const [pendingClockInData, setPendingClockInData] = useState(null);
  // const [pendingClockOutShiftId, setPendingClockOutShiftId] = useState(null);

  // Shift presets from outlet configuration (memoized to avoid recreation on every render)
  const shiftPresets = useMemo(() => {
    if (!currentOutlet) {
      // Default presets if no outlet selected
      return {
        pagi: { label: 'Shift Pagi', start: '08:00', end: '17:00', icon: '🌅' },
        siang: {
          label: 'Shift Siang',
          start: '12:00',
          end: '21:00',
          icon: '☀️',
        },
        malam: {
          label: 'Shift Malam',
          start: '20:00',
          end: '05:00',
          icon: '🌙',
        },
      };
    }

    // Get shift times from outlet configuration
    const formatTime = time => {
      if (!time) return null;
      // If time is in format "HH:mm:ss", extract just "HH:mm"
      if (time.includes(':')) {
        const parts = time.split(':');
        return `${parts[0]}:${parts[1]}`;
      }
      return time;
    };

    return {
      pagi: {
        label: 'Shift Pagi',
        start: formatTime(currentOutlet.shift_pagi_start) || '08:00',
        end: formatTime(currentOutlet.shift_pagi_end) || '17:00',
        icon: '🌅',
      },
      siang: {
        label: 'Shift Siang',
        start: formatTime(currentOutlet.shift_siang_start) || '12:00',
        end: formatTime(currentOutlet.shift_siang_end) || '21:00',
        icon: '☀️',
      },
      malam: {
        label: 'Shift Malam',
        start: formatTime(currentOutlet.shift_malam_start) || '20:00',
        end: formatTime(currentOutlet.shift_malam_end) || '05:00',
        icon: '🌙',
      },
    };
  }, [currentOutlet]);

  // ✅ REACT QUERY: Fetch today's shift
  const {
    data: todayShiftData,
    isLoading: loadingTodayShift,
    refetch: refetchTodayShift,
  } = useQuery({
    queryKey: queryKeys.attendance.todayShift(
      user?.id,
      currentBusiness?.id,
      currentOutlet?.id
    ),
    queryFn: async () => {
      // ✅ FIX: Validate business and outlet before making API call
      if (!currentBusiness || !currentBusiness.id) {
        console.warn('⚠️ Cannot fetch today shift: Business not selected');
        return null;
      }
      if (!currentOutlet || !currentOutlet.id) {
        console.warn('⚠️ Cannot fetch today shift: Outlet not selected');
        return null;
      }
      try {
        const result = await attendanceService.getTodayShift();
        return result?.success && result?.data ? result.data : null;
      } catch (error) {
        const isCanceled =
          axios.isCancel?.(error) ||
          error.name === 'CanceledError' ||
          error.message?.includes('cancelled') ||
          error.message?.includes('canceled');
        if (!isCanceled) {
          console.error('Error fetching today shift:', error);
        }
        return null;
      }
    },
    enabled: !!currentBusiness?.id && !!currentOutlet?.id && !!user?.id, // ✅ FIX: Only fetch when business, outlet, and user are available
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true, // ✅ FIX: Refetch when window regains focus (after reload)
    refetchOnReconnect: true, // ✅ FIX: Refetch when network reconnects
    placeholderData: previousData => previousData,
  });

  const todayShift = todayShiftData || null;

  // ✅ REACT QUERY: Fetch attendance history
  const {
    data: attendanceHistoryData,
    isLoading: loadingHistory,
    isFetching: isFetchingHistory,
    isRefetching: isRefetchingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: queryKeys.attendance.history(user?.id, { selectedDate }),
    queryFn: async () => {
      if (!currentBusiness || !currentOutlet) {
        console.warn('⚠️ Cannot fetch history: missing business or outlet');
        return [];
      }
      try {
        const startDate = new Date(selectedDate);
        startDate.setDate(startDate.getDate() - 7); // Last 7 days
        const endDate = new Date(selectedDate);


        const result = await attendanceService.getShifts({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        });

        const historyData = result?.success && result?.data ? result.data : [];

        // ✅ FIX: Ensure we always return an array
        if (!Array.isArray(historyData)) {
          console.warn('⚠️ History data is not an array:', historyData);
          return [];
        }

        return historyData;
      } catch (error) {
        const isCanceled =
          axios.isCancel?.(error) ||
          error.name === 'CanceledError' ||
          error.message?.includes('cancelled') ||
          error.message?.includes('canceled');
        if (!isCanceled) {
          console.error('❌ Error fetching attendance history:', error);
          console.error('❌ Error response:', error.response?.data);
        }
        // ✅ FIX: Return empty array on error but don't throw
        // This allows placeholderData to keep previous data visible
        // Only throw if it's a critical error (not timeout or network)
        const isTimeout =
          error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        if (isTimeout || isCanceled) {
          // For timeout/cancelled, return empty array and let placeholderData show previous data
          return [];
        }
        // For other errors, still return empty but log it
        return [];
      }
    },
    enabled: !!currentBusiness && !!currentOutlet && !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true, // ✅ FIX: Refetch when window regains focus
    refetchOnReconnect: true, // ✅ FIX: Refetch when network reconnects
    placeholderData: previousData => {
      // ✅ FIX: Keep previous data to prevent clearing history on refetch
      return previousData || [];
    },
    // ✅ FIX: Keep previous data during refetch to prevent UI flicker
    // Note: We'll show skeleton during refetch even with keepPreviousData
    keepPreviousData: true,
  });

  const attendanceHistory = attendanceHistoryData || [];

  // ✅ REACT QUERY: Fetch attendance stats
  const {
    data: attendanceStatsData,
    isLoading: loadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: queryKeys.attendance.stats(user?.id, {}),
    queryFn: async () => {
      if (!currentBusiness) return null;
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
        const endDate = new Date();

        const result = await attendanceService.getStats({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        });

        // ✅ FIX: Handle different result formats
        if (!result) {
          return null; // Cancelled or no data
        }

        // If result has success: false, return null (error case)
        if (result.success === false) {
          // ✅ FIX: Only log warning for non-timeout errors to avoid spam
          const isTimeout =
            result.error?.includes('timeout') ||
            result.message?.includes('timeout');
          if (!isTimeout) {
            console.warn(
              '⚠️ Attendance stats error:',
              result.error || result.message
            );
          }
          return null; // Return null for errors (non-critical)
        }

        // If result has data property, return it
        if (result.data) {
          return result.data;
        }

        // If result is the data itself (object), return it
        if (result && typeof result === 'object' && !result.success) {
          return result;
        }

        // Fallback: return null
        return null;
      } catch (error) {
        const isCanceled =
          axios.isCancel?.(error) ||
          error.name === 'CanceledError' ||
          error.message?.includes('cancelled') ||
          error.message?.includes('canceled');
        const isTimeout =
          error.code === 'ECONNABORTED' || error.message?.includes('timeout');

        if (!isCanceled && !isTimeout) {
          console.error('Error fetching attendance stats:', error);
        } else if (isTimeout) {
          console.warn(
            '⚠️ Stats query timeout - returning null (non-critical)'
          );
        }

        // ✅ FIX: Return null on timeout instead of throwing - stats is not critical
        return null;
      }
    },
    enabled: !!currentBusiness && !!user?.id,
    staleTime: 60 * 1000, // 60 seconds (increased from 30s)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 0, // ✅ FIX: Don't retry stats query (non-critical)
    refetchOnMount: false, // ✅ FIX: Don't refetch on mount (reduce load)
    refetchOnWindowFocus: false, // ✅ FIX: Don't refetch on focus (reduce load)
    placeholderData: previousData => previousData,
  });

  const attendanceStats = attendanceStatsData || null;
  const loading = loadingTodayShift || loadingHistory || loadingStats;

  // FaceID feature temporarily disabled
  // const checkCameraAvailability = async () => {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  //     if (stream) {
  //       stream.getTracks().forEach(track => track.stop());
  //     }
  //     return true;
  //   } catch (error) {
  //     console.log('Camera not available:', error.message);
  //     return false;
  //   }
  // };

  // ✅ F5 Handler: Refresh data without full page reload
  const handleRefresh = useCallback(async () => {
    if (loading) return; // Prevent multiple simultaneous refreshes

    try {
      await Promise.all([
        refetchTodayShift(),
        refetchHistory(),
        refetchStats(),
      ]);
      toast({
        title: 'Berhasil!',
        description: 'Data absensi berhasil dimuat ulang',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error refreshing attendance data:', error);
      toast({
        title: 'Error!',
        description: 'Gagal memuat ulang data absensi',
        variant: 'destructive',
      });
    }
  }, [loading, refetchTodayShift, refetchHistory, refetchStats, toast]);

  // ✅ Keyboard shortcuts: F5 and R to refresh without full page reload
  useEffect(() => {
    const handleKeyDown = e => {
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

  // Handle clock in button click - show shift selection modal
  const handleClockInClick = () => {
    if (!currentBusiness || !currentOutlet) {
      toast.error('Outlet belum dipilih');
      return;
    }
    setShowShiftModal(true);
  };

  // Handle clock in with selected shift
  const handleClockIn = async () => {
    // ✅ NEW: Validate business and outlet before proceeding
    if (!currentBusiness) {
      toast.error(
        '⚠️ Business belum dipilih. Silakan pilih Business terlebih dahulu.',
        { duration: 6000 }
      );
      return;
    }

    if (!currentOutlet) {
      toast.error(
        '⚠️ Outlet belum dipilih. Silakan pilih Outlet terlebih dahulu.',
        { duration: 6000 }
      );
      return;
    }

    // Get shift times
    let startTime, endTime;

    if (shiftType === 'custom') {
      if (!customStartTime || !customEndTime) {
        toast.error('Masukkan jam masuk dan jam keluar');
        return;
      }

      // Check if end time is after start time (handle overnight shifts)
      const start = customStartTime.split(':').map(Number);
      const end = customEndTime.split(':').map(Number);
      const startMinutes = start[0] * 60 + start[1];
      let endMinutes = end[0] * 60 + end[1];

      // If end time is earlier than start time, assume it's next day (overnight shift)
      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60; // Add 24 hours
      }

      if (endMinutes <= startMinutes) {
        toast.error('Jam keluar harus setelah jam masuk');
        return;
      }

      startTime = customStartTime;
      endTime = customEndTime;
    } else {
      // Use preset shift times
      const selectedShift = shiftPresets[shiftType];
      if (!selectedShift) {
        toast.error('Pilih shift terlebih dahulu');
        return;
      }
      startTime = selectedShift.start;
      endTime = selectedShift.end;
    }

    // ✅ FIX: Validate business and outlet before clock in
    if (!currentBusiness || !currentBusiness.id) {
      toast.error(
        '⚠️ Business belum dipilih. Silakan pilih Business terlebih dahulu.'
      );
      return;
    }

    if (!currentOutlet || !currentOutlet.id) {
      toast.error(
        '⚠️ Outlet belum dipilih. Silakan pilih Outlet terlebih dahulu.'
      );
      return;
    }

    // ✅ FIX: Ensure localStorage is updated with current business and outlet IDs
    // This is critical for PWA where state might not sync with localStorage
    localStorage.setItem('currentBusinessId', String(currentBusiness.id));
    localStorage.setItem('currentBusiness', JSON.stringify(currentBusiness));
    localStorage.setItem('currentOutletId', String(currentOutlet.id));
    localStorage.setItem('currentOutlet', JSON.stringify(currentOutlet));

    setLocationError(null);
    setShowShiftModal(false);

    try {
      // ✅ NEW: Check if GPS is required for this outlet
      const gpsRequired = currentOutlet?.attendance_gps_required ?? false;

      // Get current location
      let location;
      try {
        location = await attendanceService.getCurrentLocation({
          timeout: 20000,
        });
      } catch (locationError) {
        // ✅ FIX: If GPS is required, reject clock in if GPS fails
        if (gpsRequired) {
          toast.error(
            '⚠️ GPS wajib untuk absensi di outlet ini. Pastikan GPS aktif dan izinkan akses lokasi di pengaturan browser.'
          );
          setClockingIn(false);
          return;
        }

        // ✅ GPS is not required - use fallback
        console.warn(
          '⚠️ Failed to get GPS location, using outlet location as fallback:',
          locationError
        );
        if (currentOutlet?.latitude && currentOutlet?.longitude) {
          location = {
            latitude: parseFloat(currentOutlet.latitude),
            longitude: parseFloat(currentOutlet.longitude),
          };
          toast({
            title: '⚠️ Lokasi GPS tidak tersedia',
            description:
              'Menggunakan lokasi outlet sebagai fallback. Absensi tetap dapat dilakukan.',
            variant: 'warning',
          });
        } else {
          // If no outlet location, still allow clock in but warn user
          location = {
            latitude: null,
            longitude: null,
          };
          toast({
            title: '⚠️ Lokasi GPS tidak tersedia',
            description:
              'Absensi dilakukan tanpa validasi lokasi. Pastikan Anda berada di lokasi yang benar.',
            variant: 'warning',
          });
        }
      }

      // Get current time for shift
      const now = new Date();
      const shiftDate = now.toISOString().split('T')[0];

      // Clock in data
      const clockInData = {
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        latitude: location.latitude,
        longitude: location.longitude,
      };

      // FaceID feature temporarily disabled - proceed directly with clock in
      setClockingIn(true);
      const result = await attendanceService.clockIn(clockInData);
      await handleClockInSuccess(result);
    } catch (error) {
      console.error('Error during clock in:', error);
      setClockingIn(false);
      if (error.message?.includes('lokasi')) {
        setLocationError(error.message);
        toast.error(error.message);
      } else {
        toast.error('Gagal melakukan clock in. Silakan coba lagi.');
      }
    }
  };

  // FaceID feature temporarily disabled
  // const handleFaceCaptured = async ({ descriptor, photo, skip }) => { ... }

  // ✅ NEW: Handle clock in after face verification
  const handleClockInSuccess = async result => {
    if (result?.success) {
      toast.success('✅ Clock in berhasil!');

      // ✅ FIX: Immediately update cache with new data from response
      const queryKey = queryKeys.attendance.todayShift(
        user?.id,
        currentBusiness?.id,
        currentOutlet?.id
      );

      if (result?.data) {
        console.log('📝 Updating cache with clock-in data:', result.data);
        // ✅ FIX: Ensure data structure matches what queryFn expects
        // QueryFn returns result.data directly, so we need to match that structure
        const shiftData = result.data;
        console.log('📝 Shift data structure:', {
          id: shiftData?.id,
          clock_in: shiftData?.clock_in,
          clock_out: shiftData?.clock_out,
          status: shiftData?.status,
        });

        // Directly set the query data to immediately update UI
        queryClient.setQueryData(queryKey, shiftData);

        // ✅ FIX: Force component re-render by updating state
        // This ensures UI reflects the new data immediately
      }

      // ✅ FIX: Force immediate refetch to ensure UI updates
      // Don't use setTimeout, do it immediately and await
      try {
        // Invalidate queries first to mark them as stale
        const todayShiftKey = queryKeys.attendance.todayShift(
          user?.id,
          currentBusiness?.id,
          currentOutlet?.id
        );
        const historyKey = queryKeys.attendance.history(user?.id, {
          selectedDate,
        });
        const statsKey = queryKeys.attendance.stats(user?.id, {});

        queryClient.invalidateQueries({
          queryKey: todayShiftKey,
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: historyKey,
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: statsKey,
          exact: true,
        });

        // Then refetch all queries
        const [todayShiftResult, historyResult, statsResult] =
          await Promise.all([
            refetchTodayShift(),
            refetchHistory(),
            refetchStats(),
          ]);

        // ✅ FIX: Update history cache with fresh data
        if (historyResult?.data && Array.isArray(historyResult.data)) {
          queryClient.setQueryData(historyKey, historyResult.data);
        }

        // ✅ FIX: Force re-render by updating cache again with fresh data
        if (todayShiftResult?.data) {
          queryClient.setQueryData(queryKey, todayShiftResult.data);

          // ✅ FIX: Also invalidate to ensure all components using this query get updated
          queryClient.invalidateQueries({
            queryKey,
            exact: true,
          });
        } else {
          console.warn(
            '⚠️ No data from refetchTodayShift, using response data'
          );
          if (result?.data) {
            queryClient.setQueryData(queryKey, result.data);
          }
        }
      } catch (refetchError) {
        console.error('⚠️ Error during refetch:', refetchError);
        // Even if refetch fails, try to use the data from response
        if (result?.data) {
          queryClient.setQueryData(queryKey, result.data);
        }
      }
    } else {
      toast.error(result?.message || 'Gagal melakukan clock in');
    }
    setClockingIn(false);
  };

  // Handle clock out from history (for shifts in attendance history)
  const handleClockOutFromHistory = async shiftId => {
    setLocationError(null);

    try {
      // ✅ FIX: Get location with fallback (check GPS required)
      const gpsRequired = currentOutlet?.attendance_gps_required ?? false;
      let location;
      try {
        location = await attendanceService.getCurrentLocation({
          timeout: 20000,
        });
      } catch (locationError) {
        // ✅ If GPS is required, reject clock out if GPS fails
        if (gpsRequired) {
          toast.error(
            '⚠️ GPS wajib untuk absensi di outlet ini. Pastikan GPS aktif dan izinkan akses lokasi di pengaturan browser.'
          );
          return;
        }

        // ✅ GPS is not required - use fallback
        console.warn(
          '⚠️ Failed to get GPS location for clock out from history, using outlet location as fallback:',
          locationError
        );
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

      // FaceID feature temporarily disabled - proceed directly with clock out
      setClockingOut(true);
      const result = await attendanceService.clockOut(shiftId, {
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
      });
      await handleClockOutSuccess(result);
    } catch (error) {
      handleClockOutError(error);
    }
  };

  // Handle clock out
  const handleClockOut = async () => {
    if (!todayShift) {
      toast.error('Tidak ada shift aktif');
      return;
    }

    setLocationError(null);

    try {
      // ✅ FIX: Get location with fallback (check GPS required)
      const gpsRequired = currentOutlet?.attendance_gps_required ?? false;
      let location;
      try {
        location = await attendanceService.getCurrentLocation({
          timeout: 20000,
        });
      } catch (locationError) {
        // ✅ If GPS is required, reject clock out if GPS fails
        if (gpsRequired) {
          toast.error(
            '⚠️ GPS wajib untuk absensi di outlet ini. Pastikan GPS aktif dan izinkan akses lokasi di pengaturan browser.'
          );
          return;
        }

        // ✅ GPS is not required - use fallback
        console.warn(
          '⚠️ Failed to get GPS location for clock out, using outlet location as fallback:',
          locationError
        );
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

      // FaceID feature temporarily disabled - proceed directly with clock out
      setClockingOut(true);
      const result = await attendanceService.clockOut(todayShift.id, {
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
      });
      await handleClockOutSuccess(result);
    } catch (error) {
      handleClockOutError(error);
    }
  };

  // ✅ NEW: Handle clock out success
  const handleClockOutSuccess = async result => {
    if (result?.success) {
      toast.success('✅ Clock out berhasil!');

      // ✅ FIX: Immediately update cache with new data from response
      // This ensures UI updates instantly without waiting for refetch
      if (result?.data) {
        const queryKey = queryKeys.attendance.todayShift(
          user?.id,
          currentBusiness?.id,
          currentOutlet?.id
        );
        queryClient.setQueryData(queryKey, result.data);
      }

      // ✅ REACT QUERY: Invalidate and refetch queries to ensure UI updates
      const queryKey = queryKeys.attendance.todayShift(
        user?.id,
        currentBusiness?.id,
        currentOutlet?.id
      );
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.history(user?.id, { selectedDate }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.stats(user?.id, {}),
      });

      // ✅ FIX: Force immediate refetch to ensure UI updates
      // Wait for refetch to complete before hiding loading state
      try {
        await Promise.all([
          refetchTodayShift(),
          refetchHistory(),
          refetchStats(),
        ]);
      } catch (error) {
        console.error('Error refetching after clock out:', error);
      } finally {
        // Only set clockingOut to false after refetch completes
        setClockingOut(false);
      }
    } else {
      toast.error(result?.message || 'Gagal melakukan clock out');
      setClockingOut(false);
    }
  };

  const handleClockOutError = error => {
    console.error('Error clocking out:', error);

    // ✅ NEW: Extract error message from response
    let errorMessage = 'Gagal melakukan clock out';

    if (error.response?.data) {
      const errorData = error.response.data;
      errorMessage =
        errorData.message || errorData.error || error.message || errorMessage;

      // ✅ Check for specific error types
      if (errorData.errors) {
        // Validation errors
        const validationErrors = Object.values(errorData.errors).flat();
        errorMessage = validationErrors.join(', ');
      } else if (
        errorData.message?.includes('Business ID') ||
        errorData.message?.includes('Outlet ID')
      ) {
        errorMessage =
          '⚠️ Business atau Outlet belum dipilih. Silakan pilih Business dan Outlet terlebih dahulu.';
      } else if (errorData.message?.includes('Lokasi terlalu jauh')) {
        errorMessage = `⚠️ ${errorData.message}${
          errorData.distance ? ` (Jarak: ${errorData.distance}m)` : ''
        }`;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    setLocationError(errorMessage);
    toast.error(errorMessage, { duration: 6000 });
    setClockingOut(false);
  };

  // Format time
  const formatTime = timeString => {
    if (!timeString) return '-';

    try {
      // Handle different time formats
      let time = timeString;

      // If it's already a Date object, extract time
      if (timeString instanceof Date) {
        time = timeString.toTimeString().slice(0, 5); // HH:mm
      }
      // If it's in format "HH:mm:ss", extract just "HH:mm"
      else if (typeof timeString === 'string' && timeString.includes(':')) {
        const parts = timeString.split(':');
        time = `${parts[0]}:${parts[1]}`;
      }

      // Parse and format
      const [hours, minutes] = time.split(':');
      if (hours && minutes) {
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      }

      return time;
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
      return timeString || '-';
    }
  };

  // Format date
  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate working hours
  const calculateWorkingHours = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return 0;
    const inTime = new Date(`2000-01-01T${clockIn}`);
    const outTime = new Date(`2000-01-01T${clockOut}`);
    return ((outTime - inTime) / (1000 * 60 * 60)).toFixed(2);
  };

  // Calculate late time in minutes
  const calculateLateTime = (startTime, clockIn) => {
    if (!startTime || !clockIn) return null;

    try {
      // Parse times
      const start = new Date(`2000-01-01T${startTime}`);
      const clockInTime = new Date(`2000-01-01T${clockIn}`);

      // Add 15 minutes tolerance
      const tolerance = 15 * 60 * 1000; // 15 minutes in milliseconds
      const allowedTime = new Date(start.getTime() + tolerance);

      // If clock in is after allowed time (with tolerance), calculate delay
      if (clockInTime > allowedTime) {
        const delayMs = clockInTime.getTime() - allowedTime.getTime();
        const delayMinutes = Math.floor(delayMs / (1000 * 60));
        return delayMinutes;
      }

      return 0; // On time or early
    } catch (error) {
      console.error('Error calculating late time:', error);
      return null;
    }
  };

  // Format late time display
  const formatLateTime = minutes => {
    if (minutes === null || minutes === undefined) return null;
    if (minutes === 0) return 'Tepat Waktu';
    if (minutes < 60) return `${minutes} menit`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} jam ${mins} menit`;
  };

  // Get status badge
  const getStatusBadge = status => {
    const statusConfig = {
      completed: {
        color: 'bg-green-100 text-green-800',
        label: 'Selesai',
        icon: CheckCircle,
      },
      ongoing: {
        color: 'bg-blue-100 text-blue-800',
        label: 'Berlangsung',
        icon: Clock,
      },
      late: {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Terlambat',
        icon: AlertCircle,
      },
      absent: {
        color: 'bg-red-100 text-red-800',
        label: 'Tidak Hadir',
        icon: AlertCircle,
      },
      scheduled: {
        color: 'bg-gray-100 text-gray-800',
        label: 'Terjadwal',
        icon: CalendarIcon,
      },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} font-medium flex items-center gap-1`}>
        <Icon className='w-3 h-3' />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className='container mx-auto px-4 py-6 max-w-6xl'>
      {/* Header */}
      <div className='mb-6'>
        <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4'>
          <div>
            <h1 className='text-2xl md:text-3xl font-bold text-gray-900 mb-2'>
              Absensi Karyawan
            </h1>
            <p className='text-gray-600'>
              Kelola kehadiran dan absensi Anda di sini
            </p>
          </div>
          <Button
            variant='outline'
            onClick={handleRefresh}
            disabled={loading}
            title='Refresh data absensi (Tekan F5)'
            className='bg-white hover:bg-gray-50'
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>

        {/* Info Bisnis, Karyawan, dan Outlet */}
        <div className='flex flex-wrap gap-4 text-sm'>
          {currentBusiness && (
            <div className='flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200'>
              <span className='font-medium text-blue-900'>Bisnis:</span>
              <span className='text-blue-700'>{currentBusiness.name}</span>
            </div>
          )}
          {user && (
            <div className='flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200'>
              <span className='font-medium text-green-900'>Karyawan:</span>
              <span className='text-green-700'>{user.name || user.email}</span>
            </div>
          )}
          {currentOutlet && (
            <div className='flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200'>
              <MapPin className='w-4 h-4 text-purple-600' />
              <span className='font-medium text-purple-900'>Outlet:</span>
              <span className='text-purple-700'>{currentOutlet.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Clock In/Out Card */}
      <Card className='mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Clock className='w-5 h-5 text-blue-600' />
            Absensi Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTodayShift ? (
            <div className='space-y-4'>
              {/* Skeleton for Info Section */}
              <div className='bg-white rounded-lg p-3 border border-gray-200'>
                <div className='flex flex-wrap gap-4'>
                  <Skeleton className='h-4 w-32' />
                  <Skeleton className='h-4 w-32' />
                  <Skeleton className='h-4 w-32' />
                </div>
              </div>

              {/* Skeleton for Stats Grid */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {/* Check In Skeleton */}
                <div className='bg-white rounded-lg p-4 border'>
                  <Skeleton className='h-4 w-20 mb-2' />
                  <Skeleton className='h-8 w-24 mb-3' />
                  <Skeleton className='h-3 w-32 mb-2' />
                </div>
                {/* Check Out Skeleton */}
                <div className='bg-white rounded-lg p-4 border'>
                  <Skeleton className='h-4 w-20 mb-2' />
                  <Skeleton className='h-8 w-24' />
                </div>
                {/* Jam Kerja Skeleton */}
                <div className='bg-white rounded-lg p-4 border'>
                  <Skeleton className='h-4 w-20 mb-2' />
                  <Skeleton className='h-8 w-24' />
                </div>
              </div>

              {/* Skeleton for Button */}
              <div className='flex gap-3'>
                <Skeleton className='h-12 w-32' />
                <Skeleton className='h-12 w-24' />
              </div>
            </div>
          ) : todayShift ? (
            <div className='space-y-4'>
              {/* Info Shift Detail */}
              {(todayShift.user || todayShift.outlet) && (
                <div className='bg-white rounded-lg p-3 border border-gray-200 mb-4'>
                  <div className='flex flex-wrap gap-4 text-sm'>
                    {todayShift.user && (
                      <div className='flex items-center gap-2'>
                        <span className='text-gray-600 font-medium'>
                          Karyawan:
                        </span>
                        <span className='text-gray-900 font-semibold'>
                          {todayShift.user.name || todayShift.user.email || '-'}
                        </span>
                      </div>
                    )}
                    {todayShift.outlet && (
                      <div className='flex items-center gap-2'>
                        <MapPin className='w-4 h-4 text-gray-500' />
                        <span className='text-gray-600 font-medium'>
                          Outlet:
                        </span>
                        <span className='text-gray-900 font-semibold'>
                          {todayShift.outlet.name || '-'}
                        </span>
                      </div>
                    )}
                    {currentBusiness && (
                      <div className='flex items-center gap-2'>
                        <span className='text-gray-600 font-medium'>
                          Bisnis:
                        </span>
                        <span className='text-gray-900 font-semibold'>
                          {currentBusiness.name || '-'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='bg-white rounded-lg p-4 border'>
                  <p className='text-sm text-gray-600 mb-1'>Check In</p>
                  <p className='text-2xl font-bold text-green-600'>
                    {formatTime(todayShift.clock_in)}
                  </p>
                  {todayShift.start_time && (
                    <div className='mt-2 space-y-1'>
                      <p className='text-xs text-gray-500'>
                        Seharusnya:{' '}
                        <span className='font-medium'>
                          {formatTime(todayShift.start_time)}
                        </span>
                      </p>
                      {todayShift.status === 'late' && todayShift.clock_in && (
                        <div className='flex items-center gap-1'>
                          <AlertCircle className='w-3 h-3 text-yellow-600' />
                          <span className='text-xs font-medium text-yellow-700'>
                            Terlambat{' '}
                            {formatLateTime(
                              calculateLateTime(
                                todayShift.start_time,
                                todayShift.clock_in
                              )
                            )}
                          </span>
                        </div>
                      )}
                      {todayShift.status !== 'late' &&
                        todayShift.clock_in &&
                        calculateLateTime(
                          todayShift.start_time,
                          todayShift.clock_in
                        ) === 0 && (
                          <div className='flex items-center gap-1'>
                            <CheckCircle className='w-3 h-3 text-green-600' />
                            <span className='text-xs font-medium text-green-700'>
                              Tepat Waktu
                            </span>
                          </div>
                        )}
                    </div>
                  )}
                  {todayShift.clock_in_latitude && (
                    <p className='text-xs text-gray-500 mt-2 flex items-center gap-1'>
                      <MapPin className='w-3 h-3' />
                      GPS: {parseFloat(todayShift.clock_in_latitude).toFixed(6)}
                      , {parseFloat(todayShift.clock_in_longitude).toFixed(6)}
                    </p>
                  )}
                </div>
                <div className='bg-white rounded-lg p-4 border'>
                  <p className='text-sm text-gray-600 mb-1'>Check Out</p>
                  <p className='text-2xl font-bold text-red-600'>
                    {formatTime(todayShift.clock_out)}
                  </p>
                  {todayShift.clock_out_latitude && (
                    <p className='text-xs text-gray-500 mt-2 flex items-center gap-1'>
                      <MapPin className='w-3 h-3' />
                      GPS:{' '}
                      {parseFloat(todayShift.clock_out_latitude).toFixed(
                        6
                      )},{' '}
                      {parseFloat(todayShift.clock_out_longitude).toFixed(6)}
                    </p>
                  )}
                </div>
                <div className='bg-white rounded-lg p-4 border'>
                  <p className='text-sm text-gray-600 mb-1'>Jam Kerja</p>
                  <p className='text-2xl font-bold text-blue-600'>
                    {todayShift.clock_in && todayShift.clock_out
                      ? `${calculateWorkingHours(
                          todayShift.clock_in,
                          todayShift.clock_out
                        )} jam`
                      : '-'}
                  </p>
                  <div className='text-xs text-gray-500 mt-2'>
                    {getStatusBadge(todayShift.status)}
                  </div>
                </div>
              </div>

              {locationError && (
                <div className='p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4' />
                  {locationError}
                </div>
              )}

              <div className='flex gap-3'>
                {/* ✅ FIX: Robust check for clock_in and clock_out */}
                {(() => {
                  // Helper function to check if value exists and is not empty
                  const hasValue = val => {
                    if (val === null || val === undefined) return false;
                    if (typeof val === 'string') return val.trim() !== '';
                    // For Date objects or other types, just check if truthy
                    return !!val;
                  };

                  const hasClockIn = hasValue(todayShift.clock_in);
                  const hasClockOut = hasValue(todayShift.clock_out);

                  if (hasClockIn && !hasClockOut) {
                    // Clock in exists but clock out doesn't - show Clock Out button
                    return (
                      <Button
                        onClick={handleClockOut}
                        disabled={clockingOut}
                        size='lg'
                        className='bg-red-600 hover:bg-red-700 text-white flex-1 md:flex-none'
                      >
                        {clockingOut ? (
                          <>
                            <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                            Memproses...
                          </>
                        ) : (
                          <>
                            <LogOut className='w-5 h-5 mr-2' />
                            Clock Out
                          </>
                        )}
                      </Button>
                    );
                  } else if (hasClockIn && hasClockOut) {
                    // Both clock in and clock out exist - show completed badge
                    return (
                      <div className='flex-1'>
                        <Badge className='bg-green-100 text-green-800 text-base px-4 py-2'>
                          <CheckCircle className='w-4 h-4 mr-2' />
                          Shift Selesai
                        </Badge>
                      </div>
                    );
                  } else {
                    // No clock in - show Clock In button
                    return (
                      <Button
                        onClick={handleClockInClick}
                        disabled={clockingIn}
                        size='lg'
                        className='bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none'
                      >
                        {clockingIn ? (
                          <>
                            <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                            Memproses...
                          </>
                        ) : (
                          <>
                            <LogIn className='w-5 h-5 mr-2' />
                            Clock In
                          </>
                        )}
                      </Button>
                    );
                  }
                })()}
                <Button
                  variant='outline'
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
              </div>

              {/* ✅ NEW: Face Registration Button */}
              {/* {!user?.face_registered && (
                  <div className='mt-4 pt-4 border-t border-gray-200'>
                    <p className='text-sm text-gray-600 mb-2'>
                      💡 Aktifkan FaceID untuk absensi lebih aman
                    </p>
                    <Button
                      variant='outline'
                      onClick={() => {
                        setFaceCaptureMode('register');
                        setShowFaceCapture(true);
                      }}
                      className='w-full'
                    >
                      <Camera className='w-4 h-4 mr-2' />
                      Daftarkan Wajah (FaceID)
                    </Button>
                  </div>
                )} */}
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='text-center py-8'>
                <Clock className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                <p className='text-gray-600 text-lg mb-2'>
                  Belum ada shift untuk hari ini
                </p>
                <p className='text-sm text-gray-500 mb-6'>
                  Klik tombol di bawah untuk memulai shift Anda
                </p>
                <Button
                  onClick={handleClockInClick}
                  disabled={clockingIn}
                  size='lg'
                  className='bg-green-600 hover:bg-green-700 text-white'
                >
                  {clockingIn ? (
                    <>
                      <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <LogIn className='w-5 h-5 mr-2' />
                      Mulai Shift (Clock In)
                    </>
                  )}
                </Button>
                <Button
                  variant='outline'
                  onClick={handleRefresh}
                  disabled={loading}
                  className='mt-4'
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
                {(!currentBusiness || !currentOutlet) && (
                  <p className='text-sm text-amber-600 mt-2'>
                    ⚠️ Pastikan Business dan Outlet sudah dipilih
                  </p>
                )}

                {/* ✅ NEW: Face Registration Button */}
                {/* {!user?.face_registered && (
                  <div className='mt-4 pt-4 border-t border-gray-200'>
                    <p className='text-sm text-gray-600 mb-2'>
                      💡 Aktifkan FaceID untuk absensi lebih aman
                    </p>
                    <Button
                      variant='outline'
                      onClick={() => {
                        setFaceCaptureMode('register');
                        setShowFaceCapture(true);
                      }}
                      className='w-full'
                    >
                      <Camera className='w-4 h-4 mr-2' />
                      Daftarkan Wajah (FaceID)
                    </Button>
                  </div>
                )} */}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {loadingStats ? (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <Skeleton className='h-4 w-24 mb-2' />
                    <Skeleton className='h-8 w-16' />
                  </div>
                  <Skeleton className='h-8 w-8 rounded' />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : attendanceStats ? (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-600'>Total Shift</p>
                  <p className='text-2xl font-bold'>
                    {attendanceStats.total_shifts || 0}
                  </p>
                </div>
                <Calendar className='w-8 h-8 text-blue-600' />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-600'>Selesai</p>
                  <p className='text-2xl font-bold text-green-600'>
                    {attendanceStats.completed || 0}
                  </p>
                </div>
                <CheckCircle className='w-8 h-8 text-green-600' />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-600'>Terlambat</p>
                  <p className='text-2xl font-bold text-yellow-600'>
                    {attendanceStats.late || 0}
                  </p>
                </div>
                <AlertCircle className='w-8 h-8 text-yellow-600' />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-600'>Kehadiran</p>
                  <p className='text-2xl font-bold text-blue-600'>
                    {attendanceStats.present || 0}
                  </p>
                </div>
                <TrendingUp className='w-8 h-8 text-blue-600' />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <CalendarIcon className='w-5 h-5' />
              Riwayat Absensi (7 Hari Terakhir)
            </CardTitle>
            <div className='flex items-center gap-2'>
              <input
                type='date'
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className='border rounded-md px-3 py-1 text-sm'
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory || isFetchingHistory || isRefetchingHistory ? (
            <div className='space-y-3'>
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className='border-l-4 border-l-gray-300'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex-1'>
                        <Skeleton className='h-5 w-40 mb-2' />
                        <Skeleton className='h-4 w-32' />
                      </div>
                      <Skeleton className='h-6 w-20' />
                    </div>
                    <div className='space-y-3'>
                      {/* Info Karyawan, Outlet, dan Bisnis Skeleton */}
                      <div className='flex flex-wrap gap-3'>
                        <Skeleton className='h-4 w-24' />
                        <Skeleton className='h-4 w-32' />
                        <Skeleton className='h-4 w-28' />
                      </div>
                      {/* Waktu dan Jam Kerja Skeleton */}
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                        <div>
                          <Skeleton className='h-3 w-20 mb-1' />
                          <Skeleton className='h-5 w-16' />
                          <Skeleton className='h-3 w-32 mt-1' />
                        </div>
                        <div>
                          <Skeleton className='h-3 w-20 mb-1' />
                          <Skeleton className='h-5 w-16' />
                        </div>
                        <div>
                          <Skeleton className='h-3 w-20 mb-1' />
                          <Skeleton className='h-5 w-16' />
                        </div>
                        <div>
                          <Skeleton className='h-3 w-20 mb-1' />
                          <Skeleton className='h-5 w-16' />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : attendanceHistory.length === 0 ? (
            <div className='text-center py-12'>
              <Calendar className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-600'>Tidak ada riwayat absensi</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {attendanceHistory.map(shift => (
                <Card key={shift.id} className='border-l-4 border-l-blue-500'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between mb-3'>
                      <div>
                        <p className='font-semibold text-gray-900'>
                          {formatDate(shift.shift_date)}
                        </p>
                        <p className='text-sm text-gray-600'>
                          Shift: {formatTime(shift.start_time)} -{' '}
                          {formatTime(shift.end_time)}
                        </p>
                      </div>
                      {getStatusBadge(shift.status)}
                    </div>
                    <div className='space-y-3'>
                      {/* Info Karyawan, Outlet, dan Bisnis */}
                      <div className='flex flex-wrap gap-3 text-xs bg-gray-50 p-2 rounded border border-gray-200'>
                        {shift.user && (
                          <div className='flex items-center gap-1'>
                            <span className='text-gray-600'>Karyawan:</span>
                            <span className='font-medium text-gray-900'>
                              {shift.user.name || shift.user.email || '-'}
                            </span>
                          </div>
                        )}
                        {shift.outlet && (
                          <div className='flex items-center gap-1'>
                            <MapPin className='w-3 h-3 text-gray-500' />
                            <span className='text-gray-600'>Outlet:</span>
                            <span className='font-medium text-gray-900'>
                              {shift.outlet.name || '-'}
                            </span>
                          </div>
                        )}
                        {currentBusiness && (
                          <div className='flex items-center gap-1'>
                            <span className='text-gray-600'>Bisnis:</span>
                            <span className='font-medium text-gray-900'>
                              {currentBusiness.name || '-'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Waktu dan Jam Kerja */}
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                        <div>
                          <p className='text-gray-600'>Check In</p>
                          <p className='font-bold text-green-600'>
                            {formatTime(shift.clock_in)}
                          </p>
                          {shift.start_time && (
                            <div className='mt-1'>
                              <p className='text-xs text-gray-500'>
                                Seharusnya: {formatTime(shift.start_time)}
                              </p>
                              {shift.status === 'late' && shift.clock_in && (
                                <div className='flex items-center gap-1 mt-1'>
                                  <AlertCircle className='w-3 h-3 text-yellow-600' />
                                  <span className='text-xs font-medium text-yellow-700'>
                                    Terlambat{' '}
                                    {formatLateTime(
                                      calculateLateTime(
                                        shift.start_time,
                                        shift.clock_in
                                      )
                                    )}
                                  </span>
                                </div>
                              )}
                              {shift.status !== 'late' &&
                                shift.clock_in &&
                                calculateLateTime(
                                  shift.start_time,
                                  shift.clock_in
                                ) === 0 && (
                                  <div className='flex items-center gap-1 mt-1'>
                                    <CheckCircle className='w-3 h-3 text-green-600' />
                                    <span className='text-xs font-medium text-green-700'>
                                      Tepat Waktu
                                    </span>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className='text-gray-600'>Check Out</p>
                          <p className='font-bold text-red-600'>
                            {formatTime(shift.clock_out)}
                          </p>
                        </div>
                        <div>
                          <p className='text-gray-600'>Jam Kerja</p>
                          <p className='font-medium'>
                            {shift.clock_in && shift.clock_out
                              ? `${calculateWorkingHours(
                                  shift.clock_in,
                                  shift.clock_out
                                )} jam`
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className='text-gray-600'>Outlet</p>
                          <p className='font-medium text-gray-800'>
                            {shift.outlet?.name || '-'}
                          </p>
                        </div>
                      </div>

                      {/* ✅ NEW: Checkout Button for shifts that haven't been checked out */}
                      {(() => {
                        // Helper function to check if value exists and is not empty
                        const hasValue = val => {
                          if (val === null || val === undefined) return false;
                          if (typeof val === 'string') return val.trim() !== '';
                          return !!val;
                        };

                        return (
                          hasValue(shift.clock_in) && !hasValue(shift.clock_out)
                        );
                      })() && (
                        <div className='mt-4 pt-4 border-t border-gray-200'>
                          <Button
                            onClick={() => handleClockOutFromHistory(shift.id)}
                            disabled={clockingOut}
                            size='sm'
                            className='bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto'
                          >
                            {clockingOut ? (
                              <>
                                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                                Memproses...
                              </>
                            ) : (
                              <>
                                <LogOut className='w-4 h-4 mr-2' />
                                Checkout Manual
                              </>
                            )}
                          </Button>
                          <p className='text-xs text-gray-500 mt-2'>
                            Shift ini belum di-checkout. Klik tombol di atas
                            untuk melakukan checkout manual.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Selection Modal */}
      <Dialog open={showShiftModal} onOpenChange={setShowShiftModal}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Pilih Shift</DialogTitle>
            <DialogDescription>
              Pilih jenis shift atau masukkan jam masuk dan keluar secara manual
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            {/* Shift Type Selection */}
            <div className='space-y-2'>
              <Label>Jenis Shift</Label>
              <Select value={shiftType} onValueChange={setShiftType}>
                <SelectTrigger>
                  <SelectValue placeholder='Pilih jenis shift' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='pagi'>
                    🌅 Shift Pagi (08:00 - 17:00)
                  </SelectItem>
                  <SelectItem value='siang'>
                    ☀️ Shift Siang (12:00 - 21:00)
                  </SelectItem>
                  <SelectItem value='malam'>
                    🌙 Shift Malam (20:00 - 05:00)
                  </SelectItem>
                  <SelectItem value='custom'>
                    ⚙️ Custom (Input Manual)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show selected shift info for presets */}
            {shiftType !== 'custom' && (
              <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                <p className='text-sm font-medium text-blue-900'>
                  {shiftPresets[shiftType].label}
                </p>
                <p className='text-xs text-blue-700 mt-1'>
                  Jam Masuk: {shiftPresets[shiftType].start} | Jam Keluar:{' '}
                  {shiftPresets[shiftType].end}
                </p>
              </div>
            )}

            {/* Custom Time Inputs */}
            {shiftType === 'custom' && (
              <div className='space-y-4 p-4 bg-gray-50 rounded-lg border'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='startTime'>Jam Masuk</Label>
                    <Input
                      id='startTime'
                      type='time'
                      value={customStartTime}
                      onChange={e => setCustomStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='endTime'>Jam Keluar</Label>
                    <Input
                      id='endTime'
                      type='time'
                      value={customEndTime}
                      onChange={e => setCustomEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <p className='text-xs text-gray-500'>
                  💡 Untuk shift malam (jam keluar di hari berikutnya), masukkan
                  jam keluar seperti biasa. Sistem akan otomatis menghitung
                  durasi shift.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowShiftModal(false)}
              disabled={clockingIn}
            >
              Batal
            </Button>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FaceID feature temporarily disabled */}
      {/* {showFaceCapture && (
        <FaceCapture
          mode={faceCaptureMode}
          onCapture={handleFaceCaptured}
          onClose={() => {
            setShowFaceCapture(false);
            setPendingClockInData(null);
            setPendingClockOutShiftId(null);
            setClockingIn(false);
            setClockingOut(false);
          }}
        />
      )} */}
    </div>
  );
};

export default Attendance;
