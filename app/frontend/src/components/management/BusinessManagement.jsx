import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  Edit,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Store,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { queryKeys } from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import useOptimisticUpdate from '../../hooks/useOptimisticUpdate';
import { useSubscriptionLimit } from '../../hooks/useSubscriptionLimit';
import { businessTypeService } from '../../services/businessType.service';
import outletService from '../../services/outlet.service';
import { retryWithBackoff } from '../../utils/performance/retry';
import AccessDeniedModal from '../modals/AccessDeniedModal';
import PaymentGatewayConfigModal from '../modals/PaymentGatewayConfigModal';
import WhatsAppSettings from '../settings/WhatsAppSettings';
import ReceiptFooterSettings from '../settings/ReceiptFooterSettings';
import SubscriptionLimitModal from '../subscription/SubscriptionLimitModal';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import ImageUpload from '../ui/ImageUpload';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { useToast } from '../ui/toast';
import BusinessManagementSkeleton from './BusinessManagementSkeleton';

const BusinessManagement = () => {
  const {
    currentBusiness,
    user,
    loadBusinesses,
    loadOutlets,
    subscriptionFeatures,
  } = useAuth();
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

  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false); // Loading state untuk save operations

  // ✅ OPTIMIZATION: Debounced search untuk mengurangi API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // ✅ OPTIMIZATION: TanStack Query dengan retry, caching, prefetching, dan background refetch
  const {
    data: outletsData,
    isLoading: outletsLoading,
    isFetching: outletsFetching,
    error: outletsError,
    refetch: refetchOutlets,
  } = useQuery({
    queryKey: queryKeys.settings.outlets(currentBusiness?.id),
    queryFn: async () => {
      const requestId = 'fetchOutlets';
      if (fetchingRef.current || requestQueueRef.current.has(requestId)) {
        // ✅ NEW: Return cached data or empty result instead of throwing
        // Use queryClient from closure (already available in component scope)
        try {
          const cachedData = queryClient.getQueryData(
            queryKeys.settings.outlets(currentBusiness?.id)
          );
          if (cachedData) {
            return cachedData;
          }
        } catch (e) {
          // If queryClient not available, just return empty result
          console.warn('Could not get cached data:', e);
        }
        // If no cached data, return empty result instead of throwing
        return { success: true, data: [] };
      }
      fetchingRef.current = true;
      requestQueueRef.current.add(requestId);

      try {
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
      } finally {
        fetchingRef.current = false;
        requestQueueRef.current.delete(requestId);
      }
    },
    enabled: !!currentBusiness?.id,
    staleTime: 10 * 60 * 1000, // ✅ OPTIMIZATION: 10 minutes - outlets rarely change
    gcTime: 30 * 60 * 1000, // ✅ OPTIMIZATION: 30 minutes - keep in cache longer
    retry: 0, // ✅ OPTIMIZATION: No retry for faster failure detection
    refetchOnWindowFocus: false, // Disable auto refetch on focus
    refetchOnReconnect: false, // ✅ OPTIMIZATION: Disable auto refetch on reconnect
    refetchInterval: false, // ✅ OPTIMIZATION: Disable background refetch
    refetchIntervalInBackground: false, // ✅ OPTIMIZATION: Disable background refetch
    throwOnError: false, // ✅ NEW: Don't throw errors, handle them gracefully
    onError: (error) => {
      // ✅ NEW: Handle errors gracefully without throwing runtime errors
      // Only log network errors in development
      if (process.env.NODE_ENV === 'development') {
        if (error.message?.includes('Tidak dapat terhubung') || 
            error.message?.includes('Network Error') ||
            !error.response) {
          console.log('⚠️ Network error: Backend tidak tersedia');
          console.log('💡 Pastikan backend Laravel berjalan: php artisan serve');
        } else {
          console.error('❌ Error loading outlets:', error);
        }
      }
    },
  });

  // ✅ OPTIMIZATION: Prefetch related data on mount
  useEffect(() => {
    if (currentBusiness?.id) {
      // Prefetch outlets dengan search yang berbeda
      queryClient.prefetchQuery({
        queryKey: queryKeys.settings.outlets(currentBusiness.id),
        queryFn: () => outletService.getAll(),
        staleTime: 3 * 60 * 1000,
      });
    }
  }, [currentBusiness?.id, queryClient]);

  // ✅ OPTIMIZATION: Extract data dan pastikan selalu array
  const outlets = useMemo(() => {
    if (!outletsData) return [];

    // Handle berbagai struktur response
    let data = outletsData;

    // Jika ada property `data`, gunakan itu
    if (outletsData.data !== undefined) {
      data = outletsData.data;
    }

    // Pastikan selalu array
    if (Array.isArray(data)) {
      return data;
    }

    // Jika bukan array, coba ambil dari property data.data
    if (data && data.data && Array.isArray(data.data)) {
      return data.data;
    }

    // Fallback: return empty array
    console.warn('⚠️ Outlet data is not an array:', data);
    return [];
  }, [outletsData]);

  const loading = outletsLoading;

  // ✅ OPTIMIZATION: Optimistic updates untuk create/update/delete
  const { update: optimisticUpdateOutlet, isPending: isOptimisticPending } =
    useOptimisticUpdate(
      data => {
        // Optimistic update: update UI immediately
        if (data.outlets && Array.isArray(data.outlets)) {
          queryClient.setQueryData(
            queryKeys.settings.outlets(currentBusiness?.id),
            { success: true, data: data.outlets }
          );
        } else if (data.outlet) {
          queryClient.setQueryData(
            queryKeys.settings.outlets(currentBusiness?.id),
            prevData => {
              const prevOutlets = Array.isArray(prevData?.data)
                ? prevData.data
                : Array.isArray(prevData)
                ? prevData
                : [];

              return {
                ...prevData,
                success: true,
                data: prevOutlets.map(out =>
                  out.id === data.outlet.id ? data.outlet : out
                ),
              };
            }
          );
        } else if (data.removedId) {
          queryClient.setQueryData(
            queryKeys.settings.outlets(currentBusiness?.id),
            prevData => {
              const prevOutlets = Array.isArray(prevData?.data)
                ? prevData.data
                : Array.isArray(prevData)
                ? prevData
                : [];

              return {
                ...prevData,
                success: true,
                data: prevOutlets.filter(out => out.id !== data.removedId),
              };
            }
          );
        }
      },
      previousData => {
        // Rollback: restore previous state on error
        if (previousData) {
          queryClient.setQueryData(
            queryKeys.settings.outlets(currentBusiness?.id),
            previousData
          );
        }
      },
      () => {
        // ✅ FIX: Get previous data before optimistic update for rollback
        return queryClient.getQueryData(
          queryKeys.settings.outlets(currentBusiness?.id)
        );
      }
    );
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPaymentGatewayModal, setShowPaymentGatewayModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showReceiptFooterModal, setShowReceiptFooterModal] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [accessDeniedFeature, setAccessDeniedFeature] = useState(null);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [selectedOutletForWhatsApp, setSelectedOutletForWhatsApp] =
    useState(null);
  const [selectedOutletForReceiptFooter, setSelectedOutletForReceiptFooter] =
    useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    logo: '',
    is_active: true,
    self_service_enabled: false,
    // attendance_face_id_required: false, // FaceID feature temporarily disabled
    latitude: '',
    longitude: '',
    attendance_radius: 100,
    shift_pagi_start: '08:00',
    shift_pagi_end: '17:00',
    shift_siang_start: '12:00',
    shift_siang_end: '21:00',
    shift_malam_start: '20:00',
    shift_malam_end: '05:00',
    working_days: [1, 2, 3, 4, 5], // Default: Senin-Jumat (1=Senin, 2=Selasa, ..., 0=Minggu)
  });
  const [businessFormData, setBusinessFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_number: '',
    tax_rate: 0,
    logo: '',
    business_type_id: '',
    settings: {
      require_attendance_for_pos: false,
    },
  });
  const [businessTypes, setBusinessTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [errors, setErrors] = useState({});
  const [loadingLocation, setLoadingLocation] = useState(false);

  // ✅ OPTIMIZATION: Handle refresh dengan manual refetch
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    setRefreshKey(prev => prev + 1); // Force re-render outlet cards
    try {
      await Promise.all([
        refetchOutlets(),
        loadBusinesses ? loadBusinesses() : Promise.resolve(),
      ]);
      toast.success('✅ Data outlet berhasil diperbarui', { duration: 3000 });
    } catch (error) {
      console.error('Failed to refresh:', error);
      toast.error('❌ Gagal memuat ulang data outlet', { duration: 6000 });
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, refetchOutlets, loadBusinesses, toast]);

  // Helper function to convert time from "H:i:s" to "HH:mm" for input type="time"
  const formatTimeForInput = timeString => {
    if (!timeString) return '';
    // If already in "HH:mm" format, return as is
    if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString;
    }
    // If in "H:i:s" format, extract "HH:mm"
    if (typeof timeString === 'string' && timeString.includes(':')) {
      const parts = timeString.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1] || '00'}`;
    }
    return timeString || '';
  };

  // ✅ IMPROVED: Get current GPS location with retry, fallback, and watchPosition
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation tidak didukung oleh browser Anda');
      return;
    }

    setLoadingLocation(true);
    let watchId = null;
    let timeoutId = null;

    // Helper to stop watching and cleanup
    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Helper to set location and cleanup
    const setLocation = position => {
      cleanup();
      const { latitude, longitude, accuracy } = position.coords;
      setFormData({
        ...formData,
        latitude: latitude.toFixed(8),
        longitude: longitude.toFixed(8),
      });

      const accuracyMessage = accuracy
        ? ` (Akurasi: ±${Math.round(accuracy)}m)`
        : '';
      toast.success(`✅ Lokasi GPS berhasil diambil!${accuracyMessage}`, {
        duration: 4000,
      });
      setLoadingLocation(false);
    };

    // Helper to handle error
    const handleError = (error, useWatchPosition = false) => {
      let errorMessage = 'Gagal mendapatkan lokasi GPS';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage =
            'Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser, lalu coba lagi.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage =
            'Informasi lokasi tidak tersedia. Pastikan GPS aktif dan sinyal baik.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Waktu permintaan lokasi habis.';
          break;
        default:
          errorMessage = 'Terjadi kesalahan saat mendapatkan lokasi.';
          break;
      }

      // If timeout and haven't tried watchPosition, try it
      if (error.code === error.TIMEOUT && !useWatchPosition) {
        toast.info('⏳ Mencoba metode alternatif (watchPosition)...', {
          duration: 3000,
        });

        // Try watchPosition as fallback
        const watchOptions = {
          enableHighAccuracy: false, // Use lower accuracy for watchPosition
          timeout: 30000, // 30 seconds
          maximumAge: 60000, // Accept cache up to 1 minute
        };

        let watchTimeout = setTimeout(() => {
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
          }
          toast.error(
            '⚠️ Waktu permintaan lokasi habis. Silakan coba lagi atau input manual.',
            {
              duration: 6000,
            }
          );
          setLoadingLocation(false);
        }, 30000);

        watchId = navigator.geolocation.watchPosition(
          position => {
            clearTimeout(watchTimeout);
            setLocation(position);
          },
          watchError => {
            clearTimeout(watchTimeout);
            cleanup();
            toast.error(`⚠️ ${errorMessage}`, { duration: 6000 });
            setLoadingLocation(false);
          },
          watchOptions
        );
        return;
      }

      // All methods exhausted
      cleanup();
      toast.error(
        `⚠️ ${errorMessage}\n\n💡 Tips: Pastikan GPS aktif, izinkan akses lokasi, atau input koordinat secara manual.`,
        {
          duration: 8000,
        }
      );
      setLoadingLocation(false);
    };

    // Strategy 1: Try getCurrentPosition with high accuracy (longer timeout)
    const optionsHigh = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 seconds (increased from 20)
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      setLocation,
      error => {
        // If timeout, try with lower accuracy first
        if (error.code === error.TIMEOUT) {
          toast.info('⏳ Mencoba dengan akurasi lebih rendah...', {
            duration: 3000,
          });

          // Strategy 2: Try getCurrentPosition with lower accuracy
          const optionsLow = {
            enableHighAccuracy: false,
            timeout: 25000, // 25 seconds
            maximumAge: 120000, // Accept cache up to 2 minutes
          };

          navigator.geolocation.getCurrentPosition(
            setLocation,
            lowAccuracyError => {
              // If still timeout, try watchPosition
              handleError(lowAccuracyError, false);
            },
            optionsLow
          );
        } else {
          // For other errors, try watchPosition if it's a timeout-like issue
          handleError(error, false);
        }
      },
      optionsHigh
    );
  };

  const handleOpenModal = (outlet = null) => {
    if (outlet) {
      setSelectedOutlet(outlet);
      setFormData({
        name: outlet.name,
        code: outlet.code,
        address: outlet.address || '',
        phone: outlet.phone || '',
        logo: outlet.logo || '',
        is_active: outlet.is_active,
        self_service_enabled: outlet.self_service_enabled ?? false,
        // attendance_face_id_required: outlet.attendance_face_id_required ?? false, // FaceID feature temporarily disabled
        attendance_gps_required: outlet.attendance_gps_required ?? false,
        latitude: outlet.latitude || '',
        longitude: outlet.longitude || '',
        attendance_radius: outlet.attendance_radius || 100,
        shift_pagi_start:
          formatTimeForInput(outlet.shift_pagi_start) || '08:00',
        shift_pagi_end: formatTimeForInput(outlet.shift_pagi_end) || '17:00',
        shift_siang_start:
          formatTimeForInput(outlet.shift_siang_start) || '12:00',
        shift_siang_end: formatTimeForInput(outlet.shift_siang_end) || '21:00',
        shift_malam_start:
          formatTimeForInput(outlet.shift_malam_start) || '20:00',
        shift_malam_end: formatTimeForInput(outlet.shift_malam_end) || '05:00',
        working_days: outlet.working_days || [1, 2, 3, 4, 5], // Default: Senin-Jumat
      });
    } else {
      setSelectedOutlet(null);
      setFormData({
        name: '',
        code: '',
        address: '',
        phone: '',
        logo: '',
        is_active: true,
        self_service_enabled: false,
        // attendance_face_id_required: false, // FaceID feature temporarily disabled
        attendance_gps_required: false,
        latitude: '',
        longitude: '',
        attendance_radius: 100,
        shift_pagi_start: '08:00',
        shift_pagi_end: '17:00',
        shift_siang_start: '12:00',
        shift_siang_end: '21:00',
        shift_malam_start: '20:00',
        shift_malam_end: '05:00',
        working_days: [1, 2, 3, 4, 5], // Default: Senin-Jumat
      });
    }
    setErrors({});
    setShowOutletModal(true);
  };

  const handleCloseModal = () => {
    setShowOutletModal(false);
    setSelectedOutlet(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      logo: '',
      is_active: true,
      latitude: '',
      longitude: '',
      attendance_radius: 100,
      shift_pagi_start: '08:00',
      shift_pagi_end: '17:00',
      shift_siang_start: '12:00',
      shift_siang_end: '21:00',
      shift_malam_start: '20:00',
      shift_malam_end: '05:00',
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nama outlet harus diisi';
    }

    if (!formData.code?.trim()) {
      newErrors.code = 'Kode outlet harus diisi';
    }

    if (
      formData.phone &&
      !/^[0-9]{10,15}$/.test(formData.phone.replace(/[\s-]/g, ''))
    ) {
      newErrors.phone = 'Nomor telepon tidak valid (10-15 digit)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ OPTIMIZATION: Handle save outlet dengan optimistic update dan retry
  const handleSaveOutlet = useCallback(async () => {
    if (!validateForm()) return;

    // ✅ NEW: Set saving state immediately
    setSaving(true);

    try {
      const isAdding = !selectedOutlet;
      const previousOutlets = outlets;

      // ✅ OPTIMIZATION: Optimistic update - update UI immediately
      await optimisticUpdateOutlet(
        {
          outlets: isAdding
            ? [
                ...previousOutlets,
                {
                  id: Date.now(), // Temporary ID
                  ...formData,
                  is_active: formData.is_active !== false,
                },
              ]
            : previousOutlets.map(out =>
                out.id === selectedOutlet?.id ? { ...out, ...formData } : out
              ),
          outlet: isAdding
            ? { id: Date.now(), ...formData }
            : { ...selectedOutlet, ...formData },
        },
        async () => {
          // ✅ OPTIMIZATION: API call dengan retry
          const result = await retryWithBackoff(
            () =>
              selectedOutlet
                ? outletService.update(selectedOutlet.id, formData)
                : outletService.create(formData),
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
            // ✅ FIX: Update query data langsung dengan response dari API
            const savedOutlet = result.data;
            if (savedOutlet) {
              queryClient.setQueryData(
                queryKeys.settings.outlets(currentBusiness?.id),
                prevData => {
                  const prevOutlets = Array.isArray(prevData?.data)
                    ? prevData.data
                    : Array.isArray(prevData)
                    ? prevData
                    : [];

                  if (selectedOutlet) {
                    // Update existing outlet
                    return {
                      ...prevData,
                      success: true,
                      data: prevOutlets.map(out =>
                        out.id === selectedOutlet.id ? savedOutlet : out
                      ),
                    };
                  } else {
                    // Add new outlet (remove temporary ones dengan ID besar dari Date.now())
                    // Temporary outlets have ID from Date.now() which is > 1000000000000
                    const filteredOutlets = prevOutlets.filter(out => {
                      // Keep real outlets (ID is string or number < 1000000000000)
                      if (!out.id) return false;
                      if (typeof out.id === 'string') return true;
                      if (typeof out.id === 'number' && out.id < 1000000000000)
                        return true;
                      // Remove temporary outlets (ID from Date.now())
                      return false;
                    });
                    // Check if outlet already exists (avoid duplicates)
                    const exists = filteredOutlets.some(
                      out => out.id === savedOutlet.id
                    );
                    return {
                      ...prevData,
                      success: true,
                      data: exists
                        ? filteredOutlets
                        : [...filteredOutlets, savedOutlet],
                    };
                  }
                }
              );
            }

            // Force re-render to update images
            setRefreshKey(prev => prev + 1);

            // ✅ FIX: Invalidate queries untuk menandai sebagai stale
            queryClient.invalidateQueries({
              queryKey: queryKeys.settings.outlets(currentBusiness?.id),
            });

            // ✅ FIX: Refetch secara eksplisit untuk memastikan data terbaru (force refetch)
            // Jangan throw error jika refetch gagal - hanya log (non-critical)
            try {
              await refetchOutlets({ cancelRefetch: false });
              // ✅ NEW: Refresh outlets di AuthContext jika outlet yang di-update adalah currentOutlet
              if (loadOutlets && selectedOutlet && currentBusiness) {
                await loadOutlets();
              }
            } catch (refetchError) {
              // ✅ FIX: Jangan tampilkan error toast untuk refetch error (non-critical)
              // Silently handle refetch errors
            }

            // ✅ FIX: Tampilkan success toast SETELAH semua operasi selesai
            // Ini memastikan tidak ada error toast yang muncul setelah success toast
            toast.success(
              `✅ ${
                selectedOutlet
                  ? 'Outlet berhasil diperbarui'
                  : 'Outlet berhasil ditambahkan'
              }`,
              { duration: 4000 }
            );

            handleCloseModal();

            return result;
          } else {
            // ✅ FIX: Check subscription limit error FIRST, close modal, then show toast
            // Check both result.error and response.data.error
            const isLimitError =
              result.error === 'subscription_limit_reached' ||
              result.response?.data?.error === 'subscription_limit_reached' ||
              isSubscriptionLimitError({ response: { data: result } });

            if (isLimitError) {
              console.log(
                '🔔 Subscription limit error detected in else block:',
                result
              );

              // Close modal first - force close immediately
              setShowOutletModal(false);
              setSelectedOutlet(null);

              // Reset form
              setFormData({
                name: '',
                code: '',
                address: '',
                phone: '',
                logo: '',
                is_active: true,
                latitude: '',
                longitude: '',
                attendance_radius: 100,
                shift_pagi_start: '08:00',
                shift_pagi_end: '17:00',
                shift_siang_start: '12:00',
                shift_siang_end: '21:00',
                shift_malam_start: '20:00',
                shift_malam_end: '05:00',
              });
              setErrors({});

              // Then show error toast and modal after modal is closed (use double requestAnimationFrame for better timing)
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    console.log('🔔 Showing subscription limit error:', result);
                    handleLimitError(result);
                    // ✅ FIX: Use more persuasive message if API message is not available
                    const errorMessage =
                      result.message ||
                      'Limit outlet yang Anda beli sudah habis. Silakan tingkatkan paket untuk mengelola lebih banyak outlet.';
                    toast.error(`⚠️ ${errorMessage}`, { duration: 6000 });
                  }, 300);
                });
              });

              throw new Error(result.error || 'Gagal menyimpan outlet');
            }

            // Handle validation errors (non-subscription limit)
            if (result.errors) {
              const errorMessages = Object.values(result.errors).flat();
              errorMessages.forEach(msg => toast.error(`⚠️ ${msg}`));
              // Set field-specific errors
              setErrors(result.errors);
            } else {
              const errorMessage = result.error || 'Gagal menyimpan outlet';
              toast.error(`❌ ${errorMessage}`);
              console.error('Failed to save outlet:', result);
            }

            throw new Error(result.error || 'Gagal menyimpan outlet');
          }
        }
      );
    } catch (error) {
      // ✅ FIX: Jangan tampilkan error jika error berasal dari refetch atau operasi non-critical
      // Hanya tampilkan error jika benar-benar error dari API call utama (create/update)
      const isRefetchError =
        error.message?.includes('refetch') ||
        error.message?.includes('Refetch') ||
        error.code === 'ERR_CANCELED' ||
        error.name === 'CanceledError';

      if (isRefetchError) {
        // Refetch error adalah non-critical, hanya log
        console.warn('⚠️ Refetch error (non-critical):', error);
        // Jangan tampilkan error toast untuk refetch error
        return;
      }

      // ✅ SECURITY: Only log error in development, and don't expose sensitive data
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving outlet:', error);
      } else {
        // In production, only log error type, not full error object
        console.error('Error saving outlet:', error.message || 'Unknown error');
      }

      // ✅ FIX: Check for subscription limit error from rollback
      // The error.result contains the original API response
      if (error.result) {
        const result = error.result;

        // ✅ FIX: Check subscription limit error FIRST, close modal, then show toast
        if (
          result.error === 'subscription_limit_reached' ||
          isSubscriptionLimitError({ response: { data: result } })
        ) {
          // Close modal first - force close immediately
          setShowOutletModal(false);
          setSelectedOutlet(null);

          // Reset form
          setFormData({
            name: '',
            code: '',
            address: '',
            phone: '',
            logo: '',
            is_active: true,
            latitude: '',
            longitude: '',
            attendance_radius: 100,
            shift_pagi_start: '08:00',
            shift_pagi_end: '17:00',
            shift_siang_start: '12:00',
            shift_siang_end: '21:00',
            shift_malam_start: '20:00',
            shift_malam_end: '05:00',
          });
          setErrors({});

          // Then show error toast after modal is closed (use double requestAnimationFrame for better timing)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(() => {
                handleLimitError(result);
                // ✅ FIX: Use more persuasive message if API message is not available
                const errorMessage =
                  result.message ||
                  'Limit outlet yang Anda beli sudah habis. Silakan tingkatkan paket untuk mengelola lebih banyak outlet.';
                toast.error(`⚠️ ${errorMessage}`, { duration: 6000 });
              }, 300);
            });
          });
          return;
        }

        // Handle validation errors (non-subscription limit)
        if (result.errors) {
          const errorMessages = Object.values(result.errors).flat();
          errorMessages.forEach(msg => toast.error(`⚠️ ${msg}`));
          setErrors(result.errors);
        } else {
          const errorMessage =
            result.error || error.message || 'Gagal menyimpan outlet';
          toast.error(`❌ ${errorMessage}`);
        }
      } else {
        // Generic error handling - hanya tampilkan jika bukan error non-critical
        const errorMessage = error.message || 'Gagal menyimpan outlet';
        // Jangan tampilkan error untuk cancelled requests atau network errors yang sudah di-handle
        const isNonCriticalError =
          error.message?.includes('cancelled') ||
          error.message?.includes('canceled') ||
          error.code === 'ERR_CANCELED';

        if (!isNonCriticalError) {
          toast.error(`❌ ${errorMessage}`);
        }
      }
    } finally {
      // ✅ NEW: Always reset saving state
      setSaving(false);
    }
  }, [
    selectedOutlet,
    formData,
    outlets,
    optimisticUpdateOutlet,
    queryClient,
    currentBusiness?.id,
    toast,
    isSubscriptionLimitError,
    handleLimitError,
    validateForm,
    refetchOutlets,
    handleCloseModal,
  ]);

  // ✅ OPTIMIZATION: Handle delete outlet dengan optimistic update dan retry
  const handleDeleteOutlet = useCallback(async () => {
    if (!selectedOutlet) return;

    // ✅ OPTIMIZATION: Optimistic update - remove from UI immediately
    const previousOutlets = outlets;

    optimisticUpdateOutlet(
      {
        outlets: previousOutlets.filter(out => out.id !== selectedOutlet.id),
        removedId: selectedOutlet.id,
      },
      async () => {
        // ✅ OPTIMIZATION: API call dengan retry
        const result = await retryWithBackoff(
          () => outletService.delete(selectedOutlet.id),
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
          toast.success('✅ Outlet berhasil dihapus', { duration: 4000 });

          setShowDeleteDialog(false);
          setSelectedOutlet(null);

          // ✅ FIX: Invalidate dan refetch untuk memastikan data terbaru
          await queryClient.invalidateQueries({
            queryKey: queryKeys.settings.outlets(currentBusiness?.id),
          });

          // ✅ FIX: Refetch secara eksplisit untuk memastikan data terbaru (force refetch)
          await refetchOutlets({ cancelRefetch: false });

          return result;
        } else {
          const errorMessage = result.error || 'Gagal menghapus outlet';
          toast.error(`❌ ${errorMessage}`, { duration: 6000 });
          throw new Error(errorMessage);
        }
      }
    );
  }, [
    selectedOutlet,
    outlets,
    optimisticUpdateOutlet,
    queryClient,
    currentBusiness?.id,
    toast,
    refetchOutlets,
  ]);

  // ✅ OPTIMIZATION: Memoized filter untuk performa
  const filteredOutlets = useMemo(() => {
    if (!debouncedSearchTerm) {
      return outlets;
    }

    return outlets.filter(
      outlet =>
        outlet.name
          ?.toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        outlet.code
          ?.toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        outlet.address
          ?.toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase())
    );
  }, [outlets, debouncedSearchTerm]);

  // ✅ NEW: Show skeleton immediately if loading and no currentBusiness yet
  // This allows page to render faster instead of waiting for all data
  // Must be after all hooks to follow React Hooks rules
  if ((loading && !outletsData) || !currentBusiness) {
    return <BusinessManagementSkeleton />;
  }

  const handleOpenBusinessModal = async () => {
    setBusinessFormData({
      name: currentBusiness?.name || '',
      email: currentBusiness?.email || '',
      phone: currentBusiness?.phone || '',
      address: currentBusiness?.address || '',
      tax_number: currentBusiness?.tax_number || '',
      tax_rate: currentBusiness?.tax_rate || 0,
      logo: currentBusiness?.logo || '',
      business_type_id:
        currentBusiness?.business_type_id ||
        currentBusiness?.business_type?.id ||
        '',
      settings: {
        require_attendance_for_pos:
          currentBusiness?.settings?.require_attendance_for_pos || false,
      },
    });
    setErrors({});
    setShowBusinessModal(true);

    // Load business types if not already loaded
    if (businessTypes.length === 0) {
      setLoadingTypes(true);
      try {
        const result = await businessTypeService.getAll();
        console.log('Business Types Result:', result);
        if (result.success && result.data) {
          setBusinessTypes(result.data);
        } else {
          console.error('Failed to load business types:', result);
          toast.error('Gagal memuat jenis bisnis');
        }
      } catch (error) {
        console.error('Error loading business types:', error);
        toast.error('Terjadi kesalahan saat memuat jenis bisnis');
      } finally {
        setLoadingTypes(false);
      }
    }
  };

  const handleCloseBusinessModal = () => {
    setShowBusinessModal(false);
    setBusinessFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      tax_number: '',
      tax_rate: 0,
      logo: '',
      business_type_id: '',
      settings: {
        require_attendance_for_pos: false,
      },
    });
    setErrors({});
  };

  const validateBusinessForm = () => {
    const newErrors = {};

    if (!businessFormData.name?.trim()) {
      newErrors.name = 'Nama bisnis harus diisi';
    }

    if (
      businessFormData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessFormData.email)
    ) {
      newErrors.email = 'Format email tidak valid';
    }

    if (
      businessFormData.phone &&
      !/^[0-9]{10,15}$/.test(businessFormData.phone.replace(/[\s-]/g, ''))
    ) {
      newErrors.phone = 'Nomor telepon tidak valid (10-15 digit)';
    }

    if (
      businessFormData.tax_rate &&
      (businessFormData.tax_rate < 0 || businessFormData.tax_rate > 100)
    ) {
      newErrors.tax_rate = 'Tax rate harus antara 0-100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveBusiness = async () => {
    if (!validateBusinessForm()) return;

    setSaving(true);
    try {
      const API_BASE =
        process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('token');

      // Prepare data - include settings
      const updateData = {
        ...businessFormData,
        // ✅ FIX: Convert empty string to null for business_type_id
        business_type_id: businessFormData.business_type_id || null,
        settings: businessFormData.settings || {},
      };

      console.log('Updating business:', currentBusiness.id, updateData);
      console.log(
        'API URL:',
        `${API_BASE}/v1/businesses/${currentBusiness.id}`
      );

      const response = await fetch(
        `${API_BASE}/v1/businesses/${currentBusiness.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Business-Id': currentBusiness.id,
          },
          body: JSON.stringify(updateData),
        }
      );

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        toast.success('✅ Informasi bisnis berhasil diperbarui');

        // Update currentBusiness with response data (includes business_type)
        if (responseData && responseData.id) {
          console.log('✅ Business updated, response data:', responseData);
          // Force reload businesses to get fresh data including business_type
          await loadBusinesses();
        } else {
          // Fallback: reload businesses if response structure is different
          await loadBusinesses();
        }

        // Close modal
        handleCloseBusinessModal();

        // Force re-render by updating refresh key
        setRefreshKey(prev => prev + 1);
      } else {
        if (responseData.errors) {
          const errorMessages = Object.values(responseData.errors).flat();
          errorMessages.forEach(msg => toast.error(`⚠️ ${msg}`));
        } else {
          toast.error(
            `❌ ${responseData.message || 'Gagal memperbarui bisnis'}`
          );
        }
      }
    } catch (error) {
      console.error('Error updating business:', error);
      toast.error(
        '❌ Terjadi kesalahan saat memperbarui bisnis: ' + error.message
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Business Info Card */}
      <Card className='bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0'>
        <CardHeader>
          <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
            <div className='flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0'>
              {/* Business Logo */}
              <div className='w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0'>
                {currentBusiness?.logo ? (
                  <img
                    src={currentBusiness.logo}
                    alt='Business Logo'
                    className='w-full h-full object-cover rounded-lg'
                  />
                ) : (
                  <Building2 className='w-6 h-6 sm:w-8 sm:h-8 text-white/70' />
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <CardTitle className='text-xl sm:text-2xl font-bold flex items-center mb-2'>
                  <span className='truncate'>
                    {currentBusiness?.name || 'Nama Bisnis'}
                  </span>
                </CardTitle>
                {currentBusiness?.business_type?.name && (
                  <div className='flex items-center gap-2 mb-2'>
                    <Badge className='bg-white/20 text-white hover:bg-white/30 border-white/30 text-xs sm:text-sm'>
                      {currentBusiness.business_type.name}
                    </Badge>
                  </div>
                )}
                <CardDescription className='text-blue-100 text-xs sm:text-sm'>
                  {currentBusiness?.business_type?.description ||
                    'Kelola informasi bisnis dan outlet Anda'}
                </CardDescription>
              </div>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={handleOpenBusinessModal}
              className='bg-white/10 hover:bg-white/20 border-white/30 text-white w-full sm:w-auto'
            >
              <Edit className='w-4 h-4 sm:mr-2' />
              <span className='hidden sm:inline'>Edit Bisnis</span>
              <span className='sm:hidden'>Edit</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4'>
            {/* Business Type */}
            {currentBusiness?.business_type?.name && (
              <div className='flex items-start space-x-2'>
                <Building2 className='w-4 h-4 mt-1 flex-shrink-0 text-white/80' />
                <div className='flex-1 min-w-0'>
                  <p className='text-xs text-blue-100 mb-1'>Jenis Bisnis</p>
                  <p className='text-sm font-medium text-white break-words'>
                    {currentBusiness.business_type.name}
                  </p>
                  {currentBusiness.business_type.description && (
                    <p className='text-xs text-blue-100 mt-1 line-clamp-2'>
                      {currentBusiness.business_type.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Email */}
            {currentBusiness?.email && (
              <div className='flex items-start space-x-2'>
                <Mail className='w-4 h-4 mt-1 flex-shrink-0 text-white/80' />
                <div className='flex-1 min-w-0'>
                  <p className='text-xs text-blue-100 mb-1'>Email</p>
                  <p className='text-sm font-medium text-white break-words'>
                    {currentBusiness.email}
                  </p>
                </div>
              </div>
            )}

            {/* Phone */}
            {currentBusiness?.phone && (
              <div className='flex items-start space-x-2'>
                <Phone className='w-4 h-4 mt-1 flex-shrink-0 text-white/80' />
                <div className='flex-1 min-w-0'>
                  <p className='text-xs text-blue-100 mb-1'>Telepon</p>
                  <p className='text-sm font-medium text-white break-words'>
                    {currentBusiness.phone}
                  </p>
                </div>
              </div>
            )}

            {/* Address */}
            {currentBusiness?.address && (
              <div className='flex items-start space-x-2'>
                <MapPin className='w-4 h-4 mt-1 flex-shrink-0 text-white/80' />
                <div className='flex-1 min-w-0'>
                  <p className='text-xs text-blue-100 mb-1'>Alamat</p>
                  <p className='text-sm font-medium text-white break-words'>
                    {currentBusiness.address}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Outlets Section */}
      <Card>
        <CardHeader>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
            <div>
              <CardTitle className='flex items-center text-xl'>
                <Store className='w-5 h-5 mr-2 text-blue-600' />
                Daftar Outlet
              </CardTitle>
              <CardDescription>
                {outlets.length} outlet terdaftar
              </CardDescription>
            </div>
            <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
              <Button
                variant='outline'
                onClick={handleRefresh}
                disabled={loading || refreshing || outletsFetching}
                title='Refresh data outlet'
                className='w-full sm:w-auto'
                size='sm'
              >
                <RefreshCw
                  className={`w-4 h-4 sm:mr-2 ${
                    loading || refreshing || outletsFetching
                      ? 'animate-spin'
                      : ''
                  }`}
                />
                <span className='hidden sm:inline'>Refresh</span>
              </Button>
              <Button
                onClick={() => handleOpenModal()}
                className='bg-blue-600 hover:bg-blue-700 w-full sm:w-auto'
                size='sm'
              >
                <Plus className='w-4 h-4 sm:mr-2' />
                <span className='hidden sm:inline'>Tambah Outlet</span>
                <span className='sm:hidden'>Tambah</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className='mb-6'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
              <Input
                placeholder='Cari outlet...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
          </div>

          {/* Outlets Grid */}
          {/* ✅ OPTIMIZATION: Show skeleton loader instead of simple spinner */}
          {loading && outlets.length === 0 ? (
            <BusinessManagementSkeleton />
          ) : outletsError ? (
            <div className='text-center py-12'>
              <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 max-w-md mx-auto'>
                <p className='font-semibold'>❌ Gagal memuat data outlet</p>
                <p className='text-sm mt-1'>
                  {outletsError.response?.data?.message ||
                    outletsError.message ||
                    'Periksa koneksi internet Anda'}
                </p>
                {/* ✅ NEW: Show helpful message if it's a network error */}
                {(outletsError.message?.includes('Tidak dapat terhubung') ||
                  outletsError.message?.includes('Network Error') ||
                  outletsError.code === 'ECONNABORTED' ||
                  !outletsError.response) && (
                  <div className='mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-left'>
                    <p className='text-xs font-semibold text-yellow-800 mb-1'>
                      💡 Cara memperbaiki:
                    </p>
                    <ol className='text-xs text-yellow-700 list-decimal list-inside space-y-1'>
                      <li>Buka terminal/command prompt</li>
                      <li>Masuk ke folder: <code className='bg-yellow-100 px-1 rounded'>cd app/backend</code></li>
                      <li>Jalankan: <code className='bg-yellow-100 px-1 rounded'>php artisan serve</code></li>
                      <li>
                        Tunggu sampai muncul
                        {' "Laravel development server started"'}
                      </li>
                      <li>Refresh halaman ini</li>
                    </ol>
                  </div>
                )}
              </div>
              <Button
                onClick={handleRefresh}
                className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                <RefreshCw className='w-4 h-4 inline mr-2' />
                Coba Lagi
              </Button>
            </div>
          ) : filteredOutlets.length === 0 ? (
            <div className='text-center py-12'>
              <Store className='w-16 h-16 mx-auto text-gray-300 mb-4' />
              <p className='text-gray-500 mb-2'>
                {searchTerm ? 'Tidak ada outlet ditemukan' : 'Belum ada outlet'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => handleOpenModal()}
                  variant='outline'
                  className='mt-2'
                >
                  <Plus className='w-4 h-4 mr-2' />
                  Tambah Outlet Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {filteredOutlets.map(outlet => (
                <Card
                  key={`${outlet.id}-${refreshKey}`}
                  className='hover:shadow-lg transition-shadow border-2'
                >
                  <CardHeader className='pb-3'>
                    <div className='flex items-start justify-between'>
                      <div className='flex items-start space-x-3 flex-1'>
                        {/* Outlet Logo */}
                        <div className='w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                          {outlet.logo ? (
                            <img
                              src={
                                outlet.logo.startsWith('data:')
                                  ? outlet.logo
                                  : `${outlet.logo}?v=${refreshKey}`
                              }
                              alt={`${outlet.name} Logo`}
                              className='w-full h-full object-cover rounded-lg'
                              onError={e => {
                                // Fallback jika gambar gagal load
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full flex items-center justify-center ${
                              outlet.logo ? 'hidden' : 'flex'
                            }`}
                          >
                            <Store className='w-6 h-6 text-gray-400' />
                          </div>
                        </div>
                        <div className='flex-1 min-w-0'>
                          <CardTitle className='text-base sm:text-lg font-semibold flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0'>
                            <span className='truncate'>{outlet.name}</span>
                            {outlet.is_active ? (
                              <Badge className='ml-0 sm:ml-2 bg-green-100 text-green-800 border-green-200 w-fit'>
                                <CheckCircle className='w-3 h-3 mr-1' />
                                Aktif
                              </Badge>
                            ) : (
                              <Badge className='ml-0 sm:ml-2 bg-gray-100 text-gray-800 border-gray-200 w-fit'>
                                <XCircle className='w-3 h-3 mr-1' />
                                Nonaktif
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className='mt-1 space-y-1'>
                            <span className='text-xs font-mono bg-gray-100 px-2 py-1 rounded block w-fit'>
                              {outlet.code}
                            </span>
                            {(outlet.business_type ||
                              outlet.business?.business_type) && (
                              <div className='mt-2'>
                                <Badge
                                  variant='outline'
                                  className='text-xs bg-blue-50 text-blue-700 border-blue-200'
                                >
                                  {outlet.business_type?.name ||
                                    outlet.business?.business_type?.name ||
                                    'Jenis Bisnis'}
                                </Badge>
                              </div>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className='space-y-2'>
                    {outlet.address && (
                      <div className='flex items-start text-sm text-gray-600'>
                        <MapPin className='w-4 h-4 mr-2 mt-0.5 flex-shrink-0' />
                        <span className='line-clamp-2'>{outlet.address}</span>
                      </div>
                    )}
                    {outlet.phone && (
                      <div className='flex items-center text-sm text-gray-600'>
                        <Phone className='w-4 h-4 mr-2 flex-shrink-0' />
                        <span>{outlet.phone}</span>
                      </div>
                    )}

                    <div className='mt-4 pt-4 border-t space-y-2'>
                      {/* Primary Actions */}
                      <div className='flex flex-col sm:flex-row gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          className='flex-1'
                          onClick={() => handleOpenModal(outlet)}
                        >
                          <Edit className='w-3 h-3 sm:mr-1' />
                          <span className='hidden sm:inline'>Edit</span>
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          className='text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-initial'
                          onClick={() => {
                            setSelectedOutlet(outlet);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className='w-3 h-3 sm:mr-1' />
                          <span className='hidden sm:inline'>Hapus</span>
                        </Button>
                      </div>

                      {/* Payment Gateway Configuration */}
                      <Button
                        variant='outline'
                        size='sm'
                        className='w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                        onClick={() => {
                          // ✅ FIX: Check subscription feature for online integration
                          const hasOnlineIntegration =
                            subscriptionFeatures?.has_online_integration ??
                            false;
                          if (!hasOnlineIntegration) {
                            setAccessDeniedFeature('payment_gateway');
                            setShowAccessDeniedModal(true);
                            return;
                          }
                          setSelectedOutlet(outlet);
                          setShowPaymentGatewayModal(true);
                        }}
                        disabled={!subscriptionFeatures?.has_online_integration}
                        title={
                          !subscriptionFeatures?.has_online_integration
                            ? 'Fitur ini memerlukan paket Professional atau lebih tinggi'
                            : ''
                        }
                      >
                        <CreditCard className='w-3 h-3 sm:mr-1' />
                        <span className='hidden sm:inline'>
                          Konfigurasi Payment Gateway
                        </span>
                        <span className='sm:hidden'>Payment Gateway</span>
                      </Button>
                      {/* WhatsApp Configuration */}
                      <Button
                        variant='outline'
                        size='sm'
                        className='w-full text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                        onClick={() => {
                          // ✅ FIX: Check subscription feature for online integration
                          const hasOnlineIntegration =
                            subscriptionFeatures?.has_online_integration ??
                            false;
                          if (!hasOnlineIntegration) {
                            setAccessDeniedFeature('whatsapp_config');
                            setShowAccessDeniedModal(true);
                            return;
                          }
                          setSelectedOutletForWhatsApp(outlet);
                          setShowWhatsAppModal(true);
                        }}
                        disabled={!subscriptionFeatures?.has_online_integration}
                        title={
                          !subscriptionFeatures?.has_online_integration
                            ? 'Fitur ini memerlukan paket Professional atau lebih tinggi'
                            : ''
                        }
                      >
                        <MessageSquare className='w-3 h-3 sm:mr-1' />
                        <span className='hidden sm:inline'>
                          Konfigurasi WhatsApp
                        </span>
                        <span className='sm:hidden'>WhatsApp</span>
                      </Button>
                      {/* Receipt Footer Configuration */}
                      <Button
                        variant='outline'
                        size='sm'
                        className='w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 text-xs sm:text-sm'
                        onClick={() => {
                          setSelectedOutletForReceiptFooter(outlet);
                          setShowReceiptFooterModal(true);
                        }}
                      >
                        <Receipt className='w-3 h-3 sm:mr-1' />
                        <span className='hidden sm:inline'>
                          Custom Footer Struk
                        </span>
                        <span className='sm:hidden'>Footer</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outlet Modal */}
      <Dialog
        open={showOutletModal}
        onOpenChange={open => {
          if (!open) {
            handleCloseModal();
          }
        }}
      >
        <DialogContent className='sm:max-w-[500px] max-h-[90vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle className='flex items-center text-xl'>
              <Store className='w-5 h-5 mr-2 text-blue-600' />
              {selectedOutlet ? 'Edit Outlet' : 'Tambah Outlet Baru'}
            </DialogTitle>
            <DialogDescription>
              {selectedOutlet
                ? 'Perbarui informasi outlet'
                : 'Tambahkan outlet baru untuk bisnis Anda'}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 overflow-y-auto flex-1 pr-2'>
            <div>
              <Label htmlFor='name'>Nama Outlet *</Label>
              <Input
                id='name'
                value={formData.name}
                onChange={e => {
                  setFormData({ ...formData, name: e.target.value });
                  setErrors({ ...errors, name: '' });
                }}
                placeholder='Contoh: Cabang Jakarta Pusat'
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className='text-sm text-red-600 mt-1'>{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor='code'>Kode Outlet *</Label>
              <Input
                id='code'
                value={formData.code}
                onChange={e => {
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  });
                  setErrors({ ...errors, code: '' });
                }}
                placeholder='Contoh: OUT-JKT-01'
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && (
                <p className='text-sm text-red-600 mt-1'>{errors.code}</p>
              )}
              <p className='text-xs text-gray-500 mt-1'>
                Kode unik untuk identifikasi outlet
              </p>
            </div>

            <div>
              <Label htmlFor='address'>Alamat</Label>
              <Input
                id='address'
                value={formData.address}
                onChange={e =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder='Alamat lengkap outlet'
              />
            </div>

            <div>
              <Label htmlFor='phone'>Nomor Telepon</Label>
              <Input
                id='phone'
                type='tel'
                value={formData.phone}
                onChange={e => {
                  setFormData({ ...formData, phone: e.target.value });
                  setErrors({ ...errors, phone: '' });
                }}
                placeholder='08123456789'
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className='text-sm text-red-600 mt-1'>{errors.phone}</p>
              )}
            </div>

            {/* GPS Location for Attendance */}
            <div className='border-t pt-4 mt-4'>
              <div className='flex items-center gap-2 mb-3'>
                <MapPin className='w-4 h-4 text-blue-600' />
                <Label className='text-base font-semibold'>
                  Lokasi GPS untuk Absensi
                </Label>
              </div>
              <p className='text-xs text-gray-500 mb-3'>
                Koordinat GPS diperlukan untuk validasi lokasi saat karyawan
                melakukan clock in/out. Jika tidak diisi, absensi tetap
                diizinkan tanpa validasi lokasi.
              </p>

              {/* ✅ NEW: Button to get current location */}
              <div className='mb-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleGetCurrentLocation}
                  disabled={loadingLocation}
                  className='w-full sm:w-auto'
                >
                  {loadingLocation ? (
                    <>
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                      Mengambil lokasi...
                    </>
                  ) : (
                    <>
                      <MapPin className='w-4 h-4 mr-2' />
                      Ambil Lokasi GPS
                    </>
                  )}
                </Button>
                <p className='text-xs text-gray-500 mt-2'>
                  Klik tombol di atas untuk mengambil koordinat GPS dari lokasi
                  Anda saat ini.
                  <br />
                  <span className='text-orange-600 font-medium'>
                    💡 Tips: Pastikan GPS aktif, izinkan akses lokasi di
                    browser, dan gunakan di luar ruangan untuk hasil terbaik.
                  </span>
                  <br />
                  <span className='text-blue-600'>
                    Atau input manual: Buka{' '}
                    <a
                      href='https://www.google.com/maps'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='underline hover:text-blue-800'
                    >
                      Google Maps
                    </a>
                    , klik kanan pada lokasi outlet, lalu copy koordinat.
                  </span>
                </p>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='latitude'>
                    Latitude{' '}
                    <span className='text-gray-500 text-xs'>(Opsional)</span>
                  </Label>
                  <Input
                    id='latitude'
                    type='number'
                    step='any'
                    value={formData.latitude}
                    onChange={e => {
                      setFormData({ ...formData, latitude: e.target.value });
                    }}
                    placeholder='Contoh: -6.2088'
                    className='font-mono text-sm'
                  />
                  <p className='text-xs text-gray-500 mt-1'>
                    Koordinat lintang (contoh: -6.2088)
                  </p>
                </div>

                <div>
                  <Label htmlFor='longitude'>
                    Longitude{' '}
                    <span className='text-gray-500 text-xs'>(Opsional)</span>
                  </Label>
                  <Input
                    id='longitude'
                    type='number'
                    step='any'
                    value={formData.longitude}
                    onChange={e => {
                      setFormData({ ...formData, longitude: e.target.value });
                    }}
                    placeholder='Contoh: 106.8456'
                    className='font-mono text-sm'
                  />
                  <p className='text-xs text-gray-500 mt-1'>
                    Koordinat bujur (contoh: 106.8456)
                  </p>
                </div>
              </div>

              <div className='mt-4'>
                <Label htmlFor='attendance_radius'>
                  Radius Validasi (meter)
                </Label>
                <Input
                  id='attendance_radius'
                  type='number'
                  min='10'
                  max='1000'
                  value={formData.attendance_radius}
                  onChange={e => {
                    setFormData({
                      ...formData,
                      attendance_radius: parseInt(e.target.value) || 100,
                    });
                  }}
                  placeholder='100'
                />
                <p className='text-xs text-gray-500 mt-1'>
                  Jarak maksimal dari koordinat outlet untuk absensi (default:
                  100 meter)
                </p>
              </div>

              {/* ✅ NEW: Attendance Settings (Owner Only) */}
              {user &&
                (user.role === 'super_admin' || user.role === 'owner') && (
                  <div className='mt-6 space-y-4'>
                    {/* FaceID Requirement Setting - Temporarily disabled */}

                    {/* GPS Requirement Setting */}
                    <div className='p-4 bg-orange-50 rounded-lg border border-orange-200'>
                      <div className='flex items-center justify-between'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2 mb-1'>
                            <MapPin className='w-4 h-4 text-orange-600' />
                            <Label
                              htmlFor='attendance_gps_required'
                              className='text-base font-semibold text-orange-900'
                            >
                              Wajibkan Validasi GPS untuk Absensi
                            </Label>
                          </div>
                          <p className='text-xs text-gray-600 mt-1'>
                            Jika diaktifkan, karyawan harus berada di lokasi
                            outlet (dalam radius yang ditentukan) untuk bisa
                            absen. Jika GPS gagal atau lokasi tidak valid,
                            absensi tidak bisa dilakukan. Jika dinonaktifkan,
                            absensi bisa dilakukan meskipun GPS gagal (untuk
                            backward compatibility).
                          </p>
                          {formData.attendance_gps_required &&
                            (!formData.latitude || !formData.longitude) && (
                              <p className='text-xs text-orange-700 mt-2 font-medium'>
                                ⚠️ Pastikan koordinat GPS outlet sudah diisi di
                                atas!
                              </p>
                            )}
                        </div>
                        <Switch
                          id='attendance_gps_required'
                          checked={formData.attendance_gps_required}
                          onCheckedChange={checked => {
                            setFormData({
                              ...formData,
                              attendance_gps_required: checked,
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* Shift Configuration */}
            <div className='space-y-4 border-t pt-4'>
              <h3 className='text-lg font-semibold'>Konfigurasi Shift</h3>
              <p className='text-sm text-gray-600 mb-4'>
                Atur jam kerja untuk setiap shift di outlet ini
              </p>

              {/* Shift Pagi */}
              <div className='space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200'>
                <Label className='text-base font-medium text-blue-900'>
                  🌅 Shift Pagi
                </Label>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='shift_pagi_start' className='text-sm'>
                      Jam Masuk
                    </Label>
                    <Input
                      id='shift_pagi_start'
                      type='time'
                      value={formData.shift_pagi_start}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          shift_pagi_start: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor='shift_pagi_end' className='text-sm'>
                      Jam Keluar
                    </Label>
                    <Input
                      id='shift_pagi_end'
                      type='time'
                      value={formData.shift_pagi_end}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          shift_pagi_end: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Shift Siang */}
              <div className='space-y-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200'>
                <Label className='text-base font-medium text-yellow-900'>
                  ☀️ Shift Siang
                </Label>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='shift_siang_start' className='text-sm'>
                      Jam Masuk
                    </Label>
                    <Input
                      id='shift_siang_start'
                      type='time'
                      value={formData.shift_siang_start}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          shift_siang_start: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor='shift_siang_end' className='text-sm'>
                      Jam Keluar
                    </Label>
                    <Input
                      id='shift_siang_end'
                      type='time'
                      value={formData.shift_siang_end}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          shift_siang_end: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Shift Malam */}
              <div className='space-y-2 p-4 bg-purple-50 rounded-lg border border-purple-200'>
                <Label className='text-base font-medium text-purple-900'>
                  🌙 Shift Malam
                </Label>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='shift_malam_start' className='text-sm'>
                      Jam Masuk
                    </Label>
                    <Input
                      id='shift_malam_start'
                      type='time'
                      value={formData.shift_malam_start}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          shift_malam_start: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor='shift_malam_end' className='text-sm'>
                      Jam Keluar
                    </Label>
                    <Input
                      id='shift_malam_end'
                      type='time'
                      value={formData.shift_malam_end}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          shift_malam_end: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <p className='text-xs text-gray-500 mt-2'>
                  💡 Untuk shift malam yang berakhir di hari berikutnya,
                  masukkan jam keluar seperti biasa (contoh: 05:00 untuk shift
                  20:00-05:00)
                </p>
              </div>
            </div>

            {/* ✅ NEW: Working Days Configuration */}
            <div className='space-y-4 border-t pt-4 mt-4'>
              <div className='flex items-center gap-2 mb-2'>
                <Calendar className='w-5 h-5 text-green-600' />
                <h3 className='text-lg font-semibold'>Hari Kerja</h3>
              </div>
              <p className='text-sm text-gray-600 mb-4'>
                Pilih hari kerja untuk outlet ini. Gaji akan dihitung
                berdasarkan hari kerja yang ditentukan.
              </p>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                {[
                  { value: 1, label: 'Senin', short: 'Sen' },
                  { value: 2, label: 'Selasa', short: 'Sel' },
                  { value: 3, label: 'Rabu', short: 'Rab' },
                  { value: 4, label: 'Kamis', short: 'Kam' },
                  { value: 5, label: 'Jumat', short: 'Jum' },
                  { value: 6, label: 'Sabtu', short: 'Sab' },
                  { value: 0, label: 'Minggu', short: 'Min' },
                ].map(day => (
                  <label
                    key={day.value}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.working_days?.includes(day.value)
                        ? 'bg-green-50 border-green-300 text-green-900'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type='checkbox'
                      checked={
                        formData.working_days?.includes(day.value) || false
                      }
                      onChange={e => {
                        const currentDays = formData.working_days || [];
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            working_days: [...currentDays, day.value].sort(
                              (a, b) => a - b
                            ),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            working_days: currentDays.filter(
                              d => d !== day.value
                            ),
                          });
                        }
                      }}
                      className='w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500'
                    />
                    <span className='text-sm font-medium'>{day.label}</span>
                  </label>
                ))}
              </div>
              {(!formData.working_days ||
                formData.working_days.length === 0) && (
                <p className='text-sm text-orange-600 mt-2'>
                  ⚠️ Pilih minimal 1 hari kerja untuk perhitungan gaji yang
                  akurat.
                </p>
              )}
              <p className='text-xs text-gray-500 mt-2'>
                💡 Hari kerja yang dipilih akan digunakan untuk menghitung gaji
                karyawan. Jika karyawan tidak masuk pada hari kerja yang
                ditentukan, akan dihitung sebagai absen.
              </p>
            </div>

            <div>
              <Label htmlFor='logo'>Logo Outlet</Label>
              <ImageUpload
                value={formData.logo}
                onChange={logo => setFormData({ ...formData, logo })}
                onRemove={() => setFormData({ ...formData, logo: '' })}
                placeholder='Upload logo outlet...'
                aspectRatio='square'
                maxSize={2 * 1024 * 1024} // 2MB
                className='mt-2'
              />
              <p className='text-xs text-gray-500 mt-1'>
                Logo akan ditampilkan di struk dan aplikasi (opsional)
              </p>
            </div>

            <div className='flex items-center space-x-2'>
              <input
                type='checkbox'
                id='is_active'
                checked={formData.is_active}
                onChange={e =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className='w-4 h-4 text-blue-600 rounded focus:ring-blue-500'
              />
              <Label htmlFor='is_active' className='cursor-pointer'>
                Outlet Aktif
              </Label>
            </div>
          </div>

          <DialogFooter className='gap-2 flex-shrink-0 mt-4'>
            <Button variant='outline' onClick={handleCloseModal}>
              Batal
            </Button>
            <Button
              onClick={handleSaveOutlet}
              disabled={saving || loading}
              className='bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {saving || loading ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle className='w-4 h-4 mr-2' />
                  {selectedOutlet ? 'Simpan Perubahan' : 'Simpan Outlet'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Outlet?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus outlet{' '}
              <span className='font-semibold'>{selectedOutlet?.name}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOutlet}
              className='bg-red-600 hover:bg-red-700'
              disabled={saving || loading}
            >
              {saving || loading ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Business Modal */}
      <Dialog open={showBusinessModal} onOpenChange={handleCloseBusinessModal}>
        <DialogContent className='sm:max-w-[600px] max-h-[90vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle className='flex items-center text-xl'>
              <Building2 className='w-5 h-5 mr-2 text-blue-600' />
              Edit Informasi Bisnis
            </DialogTitle>
            <DialogDescription>
              Perbarui informasi bisnis Anda
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 overflow-y-auto flex-1 pr-2'>
            {/* Business Type Selection (Editable) */}
            <div>
              <Label htmlFor='business_type_id'>Jenis Bisnis</Label>
              {loadingTypes ? (
                <div className='flex items-center justify-center py-2 border rounded-md mt-1'>
                  <Loader2 className='w-4 h-4 animate-spin text-gray-400 mr-2' />
                  <span className='text-sm text-gray-500'>
                    Memuat jenis bisnis...
                  </span>
                </div>
              ) : (
                <Select
                  value={
                    businessFormData.business_type_id
                      ? String(businessFormData.business_type_id)
                      : undefined
                  }
                  onValueChange={value => {
                    setBusinessFormData({
                      ...businessFormData,
                      business_type_id: value === 'none' ? '' : value,
                    });
                    setErrors({ ...errors, business_type_id: '' });
                  }}
                >
                  <SelectTrigger className='mt-1'>
                    <SelectValue placeholder='Pilih jenis bisnis (opsional)' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Tidak dipilih</SelectItem>
                    {businessTypes.map(type => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        <div className='flex flex-col'>
                          <span>{type.name}</span>
                          {type.description && (
                            <span className='text-xs text-gray-500'>
                              {type.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className='text-xs text-gray-500 mt-1'>
                Pilih jenis bisnis untuk mengkategorikan bisnis Anda
              </p>
            </div>

            <div>
              <Label htmlFor='business_name'>Nama Bisnis *</Label>
              <Input
                id='business_name'
                value={businessFormData.name}
                onChange={e => {
                  setBusinessFormData({
                    ...businessFormData,
                    name: e.target.value,
                  });
                  setErrors({ ...errors, name: '' });
                }}
                placeholder='Nama bisnis'
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className='text-sm text-red-600 mt-1'>{errors.name}</p>
              )}
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='business_email'>Email</Label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    id='business_email'
                    type='email'
                    value={businessFormData.email}
                    onChange={e => {
                      setBusinessFormData({
                        ...businessFormData,
                        email: e.target.value,
                      });
                      setErrors({ ...errors, email: '' });
                    }}
                    placeholder='email@bisnis.com'
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className='text-sm text-red-600 mt-1'>{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor='business_phone'>Telepon</Label>
                <div className='relative'>
                  <Phone className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    id='business_phone'
                    type='tel'
                    value={businessFormData.phone}
                    onChange={e => {
                      setBusinessFormData({
                        ...businessFormData,
                        phone: e.target.value,
                      });
                      setErrors({ ...errors, phone: '' });
                    }}
                    placeholder='08123456789'
                    className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.phone && (
                  <p className='text-sm text-red-600 mt-1'>{errors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor='business_address'>Alamat</Label>
              <Input
                id='business_address'
                value={businessFormData.address}
                onChange={e =>
                  setBusinessFormData({
                    ...businessFormData,
                    address: e.target.value,
                  })
                }
                placeholder='Alamat lengkap bisnis'
              />
            </div>

            <div>
              <Label htmlFor='business_logo'>Logo Bisnis</Label>
              <ImageUpload
                value={businessFormData.logo}
                onChange={logo =>
                  setBusinessFormData({ ...businessFormData, logo })
                }
                onRemove={() =>
                  setBusinessFormData({ ...businessFormData, logo: '' })
                }
                placeholder='Upload logo bisnis...'
                aspectRatio='square'
                maxSize={2 * 1024 * 1024} // 2MB
                className='mt-2'
              />
              <p className='text-xs text-gray-500 mt-1'>
                Logo akan ditampilkan di struk, aplikasi, dan branding
                (opsional)
              </p>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='tax_number'>Nomor NPWP (Opsional)</Label>
                <Input
                  id='tax_number'
                  value={businessFormData.tax_number}
                  onChange={e =>
                    setBusinessFormData({
                      ...businessFormData,
                      tax_number: e.target.value,
                    })
                  }
                  placeholder='00.000.000.0-000.000'
                />
              </div>

              <div>
                <Label htmlFor='tax_rate'>Tax Rate (%) (Opsional)</Label>
                <Input
                  id='tax_rate'
                  type='number'
                  min='0'
                  max='100'
                  step='0.1'
                  value={businessFormData.tax_rate}
                  onChange={e => {
                    setBusinessFormData({
                      ...businessFormData,
                      tax_rate: parseFloat(e.target.value) || 0,
                    });
                    setErrors({ ...errors, tax_rate: '' });
                  }}
                  placeholder='10'
                  className={errors.tax_rate ? 'border-red-500' : ''}
                />
                {errors.tax_rate && (
                  <p className='text-sm text-red-600 mt-1'>{errors.tax_rate}</p>
                )}
              </div>
            </div>

            {/* ✅ NEW: Attendance Requirement Setting */}
            <div className='border-t pt-4 mt-4'>
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <Label
                    htmlFor='require_attendance'
                    className='text-base font-semibold'
                  >
                    Wajibkan Absensi Sebelum POS
                  </Label>
                  <p className='text-xs text-gray-500 mt-1'>
                    Jika aktif, kasir harus melakukan absensi (clock in)
                    terlebih dahulu sebelum bisa membuka shift dan menggunakan
                    POS
                  </p>
                </div>
                <Switch
                  id='require_attendance'
                  checked={
                    businessFormData.settings?.require_attendance_for_pos ||
                    false
                  }
                  onCheckedChange={checked => {
                    setBusinessFormData({
                      ...businessFormData,
                      settings: {
                        ...businessFormData.settings,
                        require_attendance_for_pos: checked,
                      },
                    });
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className='gap-2 flex-shrink-0 mt-4'>
            <Button variant='outline' onClick={handleCloseBusinessModal}>
              Batal
            </Button>
            <Button
              onClick={handleSaveBusiness}
              disabled={saving || loading}
              className='bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {saving || loading ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  <span className='animate-pulse'>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle className='w-4 h-4 mr-2' />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Limit Modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={closeLimitModal}
        errorData={limitError}
      />

      {/* Payment Gateway Configuration Modal */}
      <PaymentGatewayConfigModal
        open={showPaymentGatewayModal}
        onClose={() => {
          setShowPaymentGatewayModal(false);
          setSelectedOutlet(null);
        }}
        outlet={selectedOutlet}
        onSuccess={() => {
          // Refresh outlets data after successful config
          refetchOutlets();
          toast({
            title: 'Berhasil!',
            description: 'Konfigurasi payment gateway berhasil disimpan',
            variant: 'success',
          });
        }}
      />

      {/* WhatsApp Configuration Modal */}
      <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
        <DialogContent className='sm:max-w-[700px] max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Konfigurasi WhatsApp</DialogTitle>
            <DialogDescription>
              Atur API key WhatsApp untuk mengirim notifikasi otomatis ke
              pelanggan
            </DialogDescription>
          </DialogHeader>
          {selectedOutletForWhatsApp && (
            <WhatsAppSettings
              outletId={selectedOutletForWhatsApp.id}
              outletName={selectedOutletForWhatsApp.name}
              onSuccess={() => {
                setShowWhatsAppModal(false);
                setSelectedOutletForWhatsApp(null);
              }}
            />
          )}
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowWhatsAppModal(false);
                setSelectedOutletForWhatsApp(null);
              }}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Footer Configuration Modal */}
      <Dialog open={showReceiptFooterModal} onOpenChange={setShowReceiptFooterModal}>
        <DialogContent className='sm:max-w-[700px] max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Custom Footer Struk</DialogTitle>
            <DialogDescription>
              Atur pesan custom yang akan ditampilkan di bawah struk pembayaran
            </DialogDescription>
          </DialogHeader>
          {selectedOutletForReceiptFooter && (
            <ReceiptFooterSettings
              outletId={selectedOutletForReceiptFooter.id}
              outletName={selectedOutletForReceiptFooter.name}
            />
          )}
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowReceiptFooterModal(false);
                setSelectedOutletForReceiptFooter(null);
              }}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Denied Modal */}
      <AccessDeniedModal
        isOpen={showAccessDeniedModal}
        onClose={() => setShowAccessDeniedModal(false)}
        feature={accessDeniedFeature}
      />
    </div>
  );
};

export default BusinessManagement;
