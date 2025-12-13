import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Gift,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tag,
  Target,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';
import { discountService } from '../../services/discount.service';
import outletService from '../../services/outlet.service';
import AccessDeniedModal from '../modals/AccessDeniedModal';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { useToast } from '../ui/toast';
import PromoManagementSkeleton from './PromoManagementSkeleton';

const PromoManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentOutlet, currentBusiness, subscriptionFeatures } = useAuth();
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('discounts');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'percentage',
    value: '',
    minimum_amount: '',
    usage_limit: '',
    starts_at: '',
    ends_at: '',
    is_active: true,
    outlet_id: null, // null = business-wide, specific ID = outlet-specific
  });
  const [formErrors, setFormErrors] = useState({});

  // ✅ NEW: Check subscription access
  const hasPromoAccess = subscriptionFeatures?.has_promo_access ?? false;
  
  // Show modal immediately if no access
  useEffect(() => {
    if (!hasPromoAccess) {
      setShowAccessDeniedModal(true);
    }
  }, [hasPromoAccess]);

  // ✅ REACT QUERY: Fetch Discounts
  const {
    data: discountsData,
    isLoading: discountsLoading,
    error: discountsError,
    refetch: refetchDiscounts,
  } = useQuery({
    queryKey: queryKeys.promos.discounts(
      currentBusiness?.id,
      currentOutlet?.id
    ),
    queryFn: async () => {
      const result = await discountService.getAll();
      if (result.success) {
        return result.data || [];
      } else {
        throw new Error(result.error || 'Gagal memuat diskon');
      }
    },
    enabled: !!currentBusiness?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    placeholderData: previousData => previousData || [],
  });

  const discounts = discountsData || [];

  // ✅ REACT QUERY: Fetch Outlets
  const {
    data: outletsData,
    isLoading: outletsLoading,
    refetch: refetchOutlets,
  } = useQuery({
    queryKey: queryKeys.settings.outlets(currentBusiness?.id),
    queryFn: async () => {
      const result = await outletService.getAll();
      if (result.success) {
        return result.data || [];
      } else {
        throw new Error(result.error || 'Gagal memuat outlet');
      }
    },
    enabled: !!currentBusiness?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes (outlets don't change often)
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: true,
    placeholderData: previousData => previousData || [],
  });

  const outlets = outletsData || [];

  // Keep useApi hooks for mutations
  const { loading: saveLoading, execute: saveDiscount } = useApi(
    isEditing ? discountService.update : discountService.create
  );

  const { loading: deleteLoading, execute: deleteDiscount } = useApi(
    discountService.delete
  );

  // ✅ F5 Handler: Refresh data without full page reload
  const handleRefresh = useCallback(async () => {
    if (discountsLoading || outletsLoading) return; // Prevent multiple simultaneous refreshes

    try {
      await Promise.all([refetchDiscounts(), refetchOutlets()]);
      toast({
        title: 'Berhasil!',
        description: 'Data diskon berhasil diperbarui',
      });
    } catch (error) {
      console.error('Error refreshing promo data:', error);
      toast({
        title: 'Error!',
        description: 'Gagal memuat ulang data diskon',
        variant: 'destructive',
      });
    }
  }, [
    discountsLoading,
    outletsLoading,
    refetchDiscounts,
    refetchOutlets,
    toast,
  ]);

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

  const normalizedDiscounts = React.useMemo(() => {
    if (!discounts) return [];
    if (Array.isArray(discounts)) return discounts;
    if (discounts.data && Array.isArray(discounts.data)) return discounts.data;
    return [];
  }, [discounts]);

  const getStatusBadge = discount => {
    const now = new Date();
    const start = discount.starts_at ? new Date(discount.starts_at) : null;
    const end = discount.ends_at ? new Date(discount.ends_at) : null;

    let status = 'draft';
    if (discount.is_active) {
      if (end && end < now) {
        status = 'expired';
      } else if (start && start > now) {
        status = 'scheduled';
      } else {
        status = 'active';
      }
    }

    const statusConfig = {
      active: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Aktif',
        icon: CheckCircle,
      },
      expired: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Berakhir',
        icon: XCircle,
      },
      scheduled: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Terjadwal',
        icon: Clock,
      },
      draft: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        label: 'Nonaktif',
        icon: AlertCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.draft;
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

  const getTypeBadge = type => {
    const typeConfig = {
      percentage: {
        color: 'bg-blue-100 text-blue-800',
        label: 'Persentase',
        icon: Percent,
      },
      fixed: {
        color: 'bg-green-100 text-green-800',
        label: 'Nominal',
        icon: Tag,
      },
      bogo: {
        color: 'bg-purple-100 text-purple-800',
        label: 'BOGO',
        icon: Gift,
      },
    };

    const config = typeConfig[type] || typeConfig.fixed;
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

  const formatValue = (type, value) => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return formatCurrency(value);
  };

  // Format number with thousand separator (for display only)
  // CRITICAL: Input MUST be numeric string without dots (e.g., "50000")
  // Output: formatted string (e.g., "50.000")
  // This function is ONLY for display, never modifies the actual value
  const formatNumberInput = value => {
    // Return empty string if no value
    if (!value || value === '' || value === '0') return '';

    // Ensure value is string
    const valueStr = value.toString();

    // Remove any dots that might accidentally be there
    // formData.value should NEVER contain dots, but safety check
    const numericString = valueStr.replace(/[^\d]/g, '');

    // Return empty if not valid numeric string
    if (!numericString || numericString === '0') return '';

    // Validate: must be digits only (no dots, no letters, nothing else)
    if (!/^\d+$/.test(numericString)) {
      console.warn(
        'formatNumberInput: Invalid value detected, returning empty',
        {
          original: value,
          cleaned: numericString,
        }
      );
      return '';
    }

    // Parse to integer (always use base 10)
    const numValue = parseInt(numericString, 10);

    // Return empty if not a valid positive number
    if (isNaN(numValue) || numValue < 0) {
      return '';
    }

    // Format with thousand separator for display ONLY
    try {
      return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue);
    } catch (error) {
      console.error(
        'Error formatting number:',
        error,
        'value:',
        value,
        'numericString:',
        numericString
      );
      // Return numeric string (without dots) if formatting fails
      return numericString;
    }
  };

  // Remove formatting and get numeric value only (always returns numeric string)
  // Input: formatted string (e.g., "50.000") or numeric string (e.g., "50000")
  // Output: numeric string only (e.g., "50000")
  const getNumericValue = value => {
    if (!value || value === '') return '';
    // Remove all non-numeric characters (dots, spaces, etc)
    const numericOnly = value.toString().replace(/[^\d]/g, '');
    return numericOnly;
  };

  const handleAdd = () => {
    setFormData({
      name: '',
      code: '',
      type: 'percentage',
      value: '',
      minimum_amount: '',
      usage_limit: '',
      starts_at: '',
      ends_at: '',
      is_active: true,
      outlet_id: currentOutlet?.id || null, // Default to current outlet
    });
    setFormErrors({});
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEdit = discount => {
    // CRITICAL: Use the exact same values as displayed in the list
    // The list uses formatCurrency(discount.value) which expects the raw numeric value
    // So discount.value should already be the correct number from backend

    console.log('handleEdit - RAW DISCOUNT DATA:', {
      discount_id: discount.id,
      discount_name: discount.name,
      value: discount.value,
      valueType: typeof discount.value,
      minimum_amount: discount.minimum_amount,
      minimum_amountType: typeof discount.minimum_amount,
      usage_limit: discount.usage_limit,
      usage_limitType: typeof discount.usage_limit,
      fullDiscount: discount,
    });

    // Direct conversion: number -> string (no multiplication, no division)
    // Backend stores: 50000 = Rp 50.000
    // Form should display: 50000 (will be formatted to "50.000" by formatNumberInput)
    const cleanValue =
      discount.value != null && discount.value !== '' && discount.value !== 0
        ? String(Math.round(Number(discount.value))) // Ensure it's a whole number
        : '';
    const cleanMinimumAmount =
      discount.minimum_amount != null &&
      discount.minimum_amount !== '' &&
      discount.minimum_amount !== 0
        ? String(Math.round(Number(discount.minimum_amount))) // Ensure it's a whole number
        : '';
    const cleanUsageLimit =
      discount.usage_limit != null &&
      discount.usage_limit !== '' &&
      discount.usage_limit !== 0
        ? String(Math.round(Number(discount.usage_limit))) // Ensure it's a whole number
        : '';

    console.log('handleEdit - PROCESSED VALUES:', {
      original_value: discount.value,
      processed_value: cleanValue,
      original_minimum_amount: discount.minimum_amount,
      processed_minimum_amount: cleanMinimumAmount,
      original_usage_limit: discount.usage_limit,
      processed_usage_limit: cleanUsageLimit,
    });

    // ✅ FIX: Ensure all fields are properly set including id
    setFormData({
      id: discount.id, // ✅ CRITICAL: Ensure id is included for edit
      name: discount.name || '',
      code: discount.code || '',
      type: discount.type || 'percentage',
      value: cleanValue,
      minimum_amount: cleanMinimumAmount,
      usage_limit: cleanUsageLimit,
      starts_at: discount.starts_at ? discount.starts_at.split('T')[0] : '',
      ends_at: discount.ends_at ? discount.ends_at.split('T')[0] : '',
      is_active: discount.is_active !== undefined ? discount.is_active : true,
      outlet_id: discount.outlet_id || null,
    });
    setFormErrors({});
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async id => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus diskon ini?')) {
      return;
    }

    const result = await deleteDiscount(id);
    if (result.success) {
      toast({
        title: 'Berhasil!',
        description: 'Diskon berhasil dihapus',
      });
      // ✅ REACT QUERY: Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.promos.discounts(
          currentBusiness?.id,
          currentOutlet?.id
        ),
      });
      await refetchDiscounts();
    } else {
      toast({
        title: 'Error!',
        description: result.error || 'Gagal menghapus diskon',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    setFormErrors({});

    // Prepare data for submission - ensure numeric values are numbers, not strings with dots
    // formData.value should already be numeric string (no dots) from onChange handler
    const numericValue =
      formData.type === 'percentage' ? formData.value : formData.value || ''; // Already numeric string from onChange

    const numericMinimumAmount = formData.minimum_amount || ''; // Already numeric string from onChange
    const numericUsageLimit = formData.usage_limit || ''; // Already numeric string from onChange

    // ✅ FIX: Ensure value is properly parsed (handle empty string case)
    const parsedValue =
      formData.type === 'percentage'
        ? formData.value && formData.value !== ''
          ? parseFloat(formData.value)
          : 0
        : numericValue && numericValue !== ''
        ? parseFloat(numericValue)
        : 0;

    // ✅ FIX: Ensure minimum_amount is properly parsed
    const parsedMinimumAmount =
      numericMinimumAmount && numericMinimumAmount !== ''
        ? parseFloat(numericMinimumAmount)
        : null;

    // ✅ FIX: Ensure usage_limit is properly parsed (0 is valid for unlimited)
    const parsedUsageLimit =
      numericUsageLimit && numericUsageLimit !== ''
        ? parseInt(numericUsageLimit, 10)
        : null;

    const submitData = {
      name: formData.name,
      code: formData.code,
      type: formData.type,
      value: parsedValue,
      minimum_amount: parsedMinimumAmount,
      usage_limit: parsedUsageLimit,
      starts_at: formData.starts_at || null,
      ends_at: formData.ends_at || null,
      is_active: formData.is_active !== undefined ? formData.is_active : true,
      outlet_id: formData.outlet_id || null,
    };

    console.log('handleSave - SUBMIT DATA:', {
      isEditing,
      formData_id: formData.id,
      formData_value: formData.value,
      formData_minimum_amount: formData.minimum_amount,
      formData_usage_limit: formData.usage_limit,
      submitData_value: submitData.value,
      submitData_minimum_amount: submitData.minimum_amount,
      submitData_usage_limit: submitData.usage_limit,
      fullSubmitData: submitData,
    });

    let result;
    if (isEditing && formData.id) {
      // ✅ FIX: Ensure id is included for update
      result = await saveDiscount(formData.id, submitData);
    } else {
      result = await saveDiscount(submitData);
    }

    if (result.success) {
      toast({
        title: 'Berhasil!',
        description: isEditing
          ? 'Diskon berhasil diupdate'
          : 'Diskon berhasil ditambahkan',
      });
      setShowModal(false);
      // ✅ REACT QUERY: Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.promos.discounts(
          currentBusiness?.id,
          currentOutlet?.id
        ),
      });
      await refetchDiscounts();
    } else {
      if (result.error && typeof result.error === 'object') {
        setFormErrors(result.error);
        toast({
          title: 'Error!',
          description: 'Mohon perbaiki kesalahan pada form',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error!',
          description: result.error || 'Gagal menyimpan diskon',
          variant: 'destructive',
        });
      }
    }
  };

  const filteredDiscounts = normalizedDiscounts.filter(
    discount =>
      discount.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discount.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    active: normalizedDiscounts.filter(d => d.is_active).length,
    totalUsed: normalizedDiscounts.reduce(
      (sum, d) => sum + (d.used_count || 0),
      0
    ),
    totalLimit: normalizedDiscounts.reduce(
      (sum, d) => sum + (d.usage_limit || 0),
      0
    ),
  };

  // ✅ OPTIMIZATION: Show skeleton loader instead of simple spinner
  // ✅ OPTIMIZATION: Show skeleton loader until all data is loaded
  // Show skeleton if:
  // 1. Query is enabled but discounts are still loading
  // 2. Query is enabled but no discountsData has been received yet
  const isQueryEnabled = !!currentBusiness?.id;
  const hasDiscountsData = discountsData !== undefined; // Data has been received (can be empty array, but not undefined)
  
  // Show skeleton during initial load (when loading OR no data received yet)
  const isInitialLoad = 
    isQueryEnabled && (
      discountsLoading || // Still loading
      !hasDiscountsData // No data received yet (undefined)
    );
  
  if (isInitialLoad) {
    return <PromoManagementSkeleton />;
  }

  // ✅ NEW: Block access if no subscription access
  if (!hasPromoAccess) {
    return (
      <div className='bg-gray-50 min-h-screen flex items-center justify-center'>
        <AccessDeniedModal
          isOpen={showAccessDeniedModal}
          onClose={() => {
            setShowAccessDeniedModal(false);
            navigate('/');
          }}
          feature='promo'
          requiredPlan='Premium'
        />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Outlet Context Banner */}
      {currentOutlet && (
        <Alert className='bg-blue-50 border-blue-400 text-blue-800'>
          <AlertDescription className='flex items-center gap-2'>
            <Gift className='w-4 h-4' />
            <span>
              <strong>Konteks Outlet:</strong> Anda sedang melihat data untuk
              outlet <strong>{currentOutlet.name}</strong>. Diskon dapat dibuat
              untuk outlet spesifik atau berlaku untuk semua outlet dalam bisnis{' '}
              <strong>{currentBusiness?.name}</strong>.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>Diskon & Promo</h2>
          <p className='text-gray-600'>Kelola program diskon dan promosi</p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={handleRefresh}
            disabled={discountsLoading || saveLoading || deleteLoading}
            title='Refresh data diskon'
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${
                discountsLoading || saveLoading || deleteLoading
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </Button>
          <Button className='bg-blue-600 hover:bg-blue-700' onClick={handleAdd}>
            <Plus className='w-4 h-4 mr-2' />
            Buat Diskon
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Diskon Aktif
                </p>
                <p className='text-2xl font-bold text-gray-900'>
                  {stats.active}
                </p>
              </div>
              <Gift className='w-8 h-8 text-blue-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Total Penggunaan
                </p>
                <p className='text-2xl font-bold text-gray-900'>
                  {stats.totalUsed}
                </p>
              </div>
              <Users className='w-8 h-8 text-green-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Limit Total</p>
                <p className='text-2xl font-bold text-gray-900'>
                  {stats.totalLimit || 'Unlimited'}
                </p>
              </div>
              <Target className='w-8 h-8 text-purple-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
            <Input
              placeholder='Cari diskon...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='pl-10'
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className='space-y-4'>
            {filteredDiscounts.length === 0 ? (
              <div className='text-center py-8 text-gray-500'>
                Belum ada diskon. Klik &quot;Buat Diskon&quot; untuk
                menambahkan.
              </div>
            ) : (
              filteredDiscounts.map(discount => (
                <div
                  key={discount.id}
                  className='border rounded-lg p-4 hover:bg-gray-50 transition-colors'
                >
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center space-x-4'>
                      <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold'>
                        {discount.type === 'percentage' ? '%' : 'Rp'}
                      </div>
                      <div>
                        <h3 className='font-semibold text-gray-900'>
                          {discount.name}
                        </h3>
                        <p className='text-sm text-gray-600 font-mono'>
                          {discount.code}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center space-x-2'>
                      {getTypeBadge(discount.type)}
                      {getStatusBadge(discount)}
                    </div>
                  </div>

                  <div className='grid grid-cols-2 md:grid-cols-6 gap-4 text-sm'>
                    <div>
                      <p className='text-gray-600'>Nilai Diskon</p>
                      <p className='font-bold text-lg text-blue-600'>
                        {discount.value != null &&
                        discount.value !== '' &&
                        discount.value !== 0
                          ? formatValue(discount.type, discount.value)
                          : 'Rp 0'}
                      </p>
                    </div>
                    <div>
                      <p className='text-gray-600'>Min. Pembelian</p>
                      <p className='font-medium'>
                        {discount.minimum_amount > 0
                          ? formatCurrency(discount.minimum_amount)
                          : 'Tidak ada'}
                      </p>
                    </div>
                    <div>
                      <p className='text-gray-600'>Outlet</p>
                      <div className='font-medium text-xs'>
                        {discount.outlet ? (
                          <Badge variant='outline' className='text-xs'>
                            {discount.outlet.name}
                          </Badge>
                        ) : (
                          <Badge
                            variant='outline'
                            className='text-xs bg-blue-50 text-blue-700'
                          >
                            Semua Outlet
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className='text-gray-600'>Periode</p>
                      <p className='font-medium text-xs'>
                        {discount.starts_at
                          ? new Date(discount.starts_at).toLocaleDateString(
                              'id-ID'
                            )
                          : '-'}
                        {' - '}
                        {discount.ends_at
                          ? new Date(discount.ends_at).toLocaleDateString(
                              'id-ID'
                            )
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className='text-gray-600'>Penggunaan</p>
                      <p className='font-medium'>
                        {discount.used_count || 0}/
                        {discount.usage_limit != null &&
                        discount.usage_limit !== ''
                          ? discount.usage_limit
                          : '∞'}
                      </p>
                      {discount.usage_limit != null &&
                        discount.usage_limit !== '' &&
                        discount.usage_limit > 0 && (
                          <div className='w-full bg-gray-200 rounded-full h-2 mt-1'>
                            <div
                              className='bg-blue-600 h-2 rounded-full'
                              style={{
                                width: `${Math.min(
                                  ((discount.used_count || 0) /
                                    discount.usage_limit) *
                                    100,
                                  100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        )}
                    </div>
                    <div className='flex justify-end space-x-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleEdit(discount)}
                      >
                        <Edit className='w-4 h-4' />
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='text-red-600 hover:text-red-700'
                        onClick={() => handleDelete(discount.id)}
                        disabled={deleteLoading}
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50'>
          <Card className='w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle>
                  {isEditing ? 'Edit Diskon' : 'Tambah Diskon Baru'}
                </CardTitle>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => setShowModal(false)}
                >
                  <X className='w-4 h-4' />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      Nama Diskon <span className='text-red-500'>*</span>
                    </label>
                    <Input
                      placeholder='Misal: Diskon Weekend'
                      value={formData.name}
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className={formErrors.name ? 'border-red-500' : ''}
                    />
                    {formErrors.name && (
                      <p className='mt-1 text-xs text-red-500'>
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      Kode Diskon <span className='text-red-500'>*</span>
                    </label>
                    <Input
                      placeholder='Misal: WEEKEND20'
                      value={formData.code}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      className={formErrors.code ? 'border-red-500' : ''}
                    />
                    {formErrors.code && (
                      <p className='mt-1 text-xs text-red-500'>
                        {formErrors.code}
                      </p>
                    )}
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      Tipe <span className='text-red-500'>*</span>
                    </label>
                    <select
                      className='w-full px-3 py-2 border rounded-md'
                      value={formData.type}
                      onChange={e =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                    >
                      <option value='percentage'>Persentase</option>
                      <option value='fixed'>Nominal Tetap</option>
                      <option value='bogo'>Buy One Get One</option>
                    </select>
                  </div>

                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      Nilai <span className='text-red-500'>*</span>
                    </label>
                    {formData.type === 'fixed' ? (
                      <Input
                        type='text'
                        placeholder='50000'
                        inputMode='numeric'
                        value={
                          formData.value
                            ? formatNumberInput(formData.value)
                            : ''
                        }
                        onChange={e => {
                          // Get raw input from user (may contain dots from previous display)
                          const rawInput = e.target.value;

                          // CRITICAL: Extract ONLY digits, remove everything else (dots, spaces, etc)
                          // This MUST happen before storing in state
                          const numericOnly = rawInput.replace(/[^\d]/g, '');

                          // Only update if we have a valid numeric string (or empty)
                          // This prevents storing invalid values
                          if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
                            setFormData({
                              ...formData,
                              value: numericOnly,
                            });
                          }
                        }}
                        className={formErrors.value ? 'border-red-500' : ''}
                      />
                    ) : (
                      <Input
                        type='number'
                        placeholder='10'
                        value={formData.value}
                        onChange={e =>
                          setFormData({ ...formData, value: e.target.value })
                        }
                        className={formErrors.value ? 'border-red-500' : ''}
                      />
                    )}
                    {formErrors.value && (
                      <p className='mt-1 text-xs text-red-500'>
                        {formErrors.value}
                      </p>
                    )}
                    <p className='mt-1 text-xs text-gray-500'>
                      {formData.type === 'percentage'
                        ? 'Masukkan persentase (contoh: 20 untuk 20%)'
                        : 'Masukkan nominal rupiah (contoh: 50000 untuk Rp 50.000)'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className='block mb-2 text-sm font-medium text-gray-700'>
                    Berlaku untuk Outlet
                  </label>
                  <select
                    className='w-full px-3 py-2 border rounded-md'
                    value={formData.outlet_id || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        outlet_id: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                  >
                    <option value=''>Semua Outlet (Business-wide)</option>
                    {outlets.map(outlet => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name} ({outlet.code})
                      </option>
                    ))}
                  </select>
                  <p className='mt-1 text-xs text-gray-500'>
                    Pilih outlet spesifik atau biarkan kosong untuk berlaku di
                    semua outlet
                  </p>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      Min. Pembelian (Opsional)
                    </label>
                    <Input
                      type='text'
                      placeholder='100000'
                      inputMode='numeric'
                      value={formatNumberInput(formData.minimum_amount || '')}
                      onChange={e => {
                        // Get the raw input from user
                        const userInput = e.target.value;

                        // Remove ALL non-numeric characters immediately
                        // This ensures we NEVER store dots in formData.minimum_amount
                        const cleanedValue = userInput.replace(/[^\d]/g, '');

                        // Update state ONLY with cleaned numeric value
                        // formData.minimum_amount should ALWAYS be numeric string without dots
                        setFormData({
                          ...formData,
                          minimum_amount: cleanedValue || '',
                        });
                      }}
                    />
                    <p className='mt-1 text-xs text-gray-500'>
                      Contoh: 100000 akan ditampilkan sebagai 100.000
                    </p>
                  </div>

                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      Limit Penggunaan (Opsional)
                    </label>
                    <Input
                      type='number'
                      placeholder='100'
                      value={formData.usage_limit}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          usage_limit: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      Tanggal Mulai
                    </label>
                    <Input
                      type='date'
                      value={formData.starts_at}
                      onChange={e =>
                        setFormData({ ...formData, starts_at: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      Tanggal Berakhir
                    </label>
                    <Input
                      type='date'
                      value={formData.ends_at}
                      onChange={e =>
                        setFormData({ ...formData, ends_at: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={formData.is_active}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className='rounded'
                    />
                    <span className='text-sm font-medium text-gray-700'>
                      Aktifkan diskon
                    </span>
                  </label>
                </div>

                <div className='flex gap-2 pt-4'>
                  <Button
                    variant='outline'
                    onClick={() => setShowModal(false)}
                    className='flex-1'
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleSave}
                    className='flex-1 bg-blue-600 hover:bg-blue-700'
                    disabled={saveLoading}
                  >
                    {saveLoading ? (
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    ) : (
                      <Save className='w-4 h-4 mr-2' />
                    )}
                    Simpan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PromoManagement;
