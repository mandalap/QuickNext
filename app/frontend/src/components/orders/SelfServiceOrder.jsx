import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Coffee,
  CreditCard,
  Download,
  Edit,
  Eye,
  Loader2,
  Mail,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Smartphone,
  Store,
  Trash2,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import outletService from '../../services/outlet.service';
import selfServiceApi from '../../services/selfServiceApi';
import { debugAuth, forceReloadOutlets } from '../../utils/debugAuth';
import CreateTableModal from '../modals/CreateTableModal';
import QRMenuModal from '../modals/QRMenuModal';
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
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import SelfServiceOrderSkeleton from './SelfServiceOrderSkeleton';

// ✅ FIX: Define component with proper structure for HMR
function SelfServiceOrder() {
  const { user, currentOutlet, currentBusiness, subscriptionFeatures, refreshSubscriptionFeatures, loadOutlets } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // ✅ NEW: Check if self-service is enabled for current outlet AND subscription has access
  const hasSubscriptionAccess = subscriptionFeatures?.has_self_service_access ?? false;
  const isOutletEnabled = currentOutlet?.self_service_enabled ?? false;
  const isSelfServiceEnabled = hasSubscriptionAccess && isOutletEnabled;
  
  // ✅ NEW: State for enabling outlet
  const [enablingOutlet, setEnablingOutlet] = useState(false);

  // ✅ DEBUG: Log subscription features for debugging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 SelfServiceOrder Debug:', {
        hasSubscriptionAccess,
        isOutletEnabled,
        isSelfServiceEnabled,
        subscriptionFeatures: subscriptionFeatures ? {
          has_self_service_access: subscriptionFeatures.has_self_service_access,
          has_tables_access: subscriptionFeatures.has_tables_access,
        } : null,
        currentOutlet: currentOutlet ? {
          id: currentOutlet.id,
          name: currentOutlet.name,
          self_service_enabled: currentOutlet.self_service_enabled,
        } : null,
      });
    }
  }, [hasSubscriptionAccess, isOutletEnabled, isSelfServiceEnabled, subscriptionFeatures, currentOutlet]);

  // ✅ NEW: Auto-refresh subscription features on mount if subscription access is missing
  useEffect(() => {
    if (!hasSubscriptionAccess && subscriptionFeatures && refreshSubscriptionFeatures) {
      console.log('🔄 Subscription access missing, refreshing features...');
      // Only refresh once on mount
      const hasRefreshed = sessionStorage.getItem('selfServiceFeaturesRefreshed');
      if (!hasRefreshed) {
        sessionStorage.setItem('selfServiceFeaturesRefreshed', 'true');
        refreshSubscriptionFeatures().then(() => {
          // Clear flag after 5 seconds to allow refresh on next visit
          setTimeout(() => {
            sessionStorage.removeItem('selfServiceFeaturesRefreshed');
          }, 5000);
        });
      }
    }
  }, [hasSubscriptionAccess, subscriptionFeatures, refreshSubscriptionFeatures]);

  // ✅ NEW: Auto-enable self-service for outlet if subscription has access but outlet is not enabled
  useEffect(() => {
    const autoEnableSelfService = async () => {
      // Only auto-enable if:
      // 1. Subscription has access (has_self_service_access = true)
      // 2. Outlet exists and is not enabled yet
      // 3. Not already enabling (prevent duplicate calls)
      // 4. User is owner/admin (only they can enable)
      if (
        hasSubscriptionAccess &&
        currentOutlet?.id &&
        !isOutletEnabled &&
        !enablingOutlet &&
        ['owner', 'admin', 'super_admin'].includes(user?.role)
      ) {
        // Check if we've already tried to auto-enable in this session
        const autoEnableKey = `selfServiceAutoEnabled_${currentOutlet.id}`;
        const hasAutoEnabled = sessionStorage.getItem(autoEnableKey);
        
        if (!hasAutoEnabled) {
          console.log('✅ Auto-enabling self-service for outlet:', currentOutlet.name);
          sessionStorage.setItem(autoEnableKey, 'true');
          
          try {
            setEnablingOutlet(true);
            const result = await outletService.update(currentOutlet.id, {
              self_service_enabled: true,
            });
            
            if (result.success) {
              console.log('✅ Self-service auto-enabled successfully');
              
              // Optimistically update localStorage
              const updatedOutlet = {
                ...currentOutlet,
                self_service_enabled: true,
              };
              localStorage.setItem('currentOutlet', JSON.stringify(updatedOutlet));
              
              // Refresh outlets to update state
              if (loadOutlets) {
                await loadOutlets();
              }
              
              // Show success toast
              toast({
                title: 'Berhasil',
                description: 'Fitur Self Service otomatis diaktifkan untuk outlet ini.',
                duration: 3000,
              });
            } else {
              console.warn('⚠️ Failed to auto-enable self-service:', result.error);
              // Remove flag so it can retry on next visit
              sessionStorage.removeItem(autoEnableKey);
            }
          } catch (error) {
            console.error('❌ Error auto-enabling self-service:', error);
            // Remove flag so it can retry on next visit
            sessionStorage.removeItem(autoEnableKey);
          } finally {
            setEnablingOutlet(false);
          }
        }
      }
    };

    // Only run auto-enable if all conditions are met
    if (hasSubscriptionAccess && currentOutlet?.id && !isOutletEnabled) {
      // Small delay to ensure all data is loaded
      const timer = setTimeout(() => {
        autoEnableSelfService();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [hasSubscriptionAccess, currentOutlet, isOutletEnabled, enablingOutlet, user?.role, loadOutlets, toast]);

  // ✅ NEW: Date range filter untuk owner/admin
  const isOwnerOrAdmin = ['owner', 'admin', 'super_admin'].includes(user?.role);
  const [dateRange, setDateRange] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: '',
  });

  // Check if user can create tables (only owner and admin)
  const canCreateTable = ['owner', 'admin', 'super_admin'].includes(user?.role);

  // Orders pagination states
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const [orderItemsPerPage] = useState(9); // ✅ FIX: 9 order per page

  // Table pagination states
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [tableItemsPerPage, setTableItemsPerPage] = useState(12); // 12 tables per page

  // ✅ REACT QUERY: Prepare date params untuk owner/admin
  const getDateParams = useCallback(() => {
    let dateParams = {};
    if (isOwnerOrAdmin) {
      if (
        dateRange === 'custom' &&
        customDateRange.start &&
        customDateRange.end
      ) {
        dateParams = {
          date_from: customDateRange.start,
          date_to: customDateRange.end,
        };
      } else if (dateRange !== 'today') {
        dateParams = {
          date_range: dateRange,
        };
      }
    }
    return dateParams;
  }, [isOwnerOrAdmin, dateRange, customDateRange.start, customDateRange.end]);

  // ✅ REACT QUERY: Fetch Stats
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: queryKeys.selfService.stats(currentOutlet?.id, getDateParams()),
    queryFn: async () => {
      const dateParams = getDateParams();
      const response = await selfServiceApi.getStats(dateParams);
      return response && typeof response === 'object' ? response : {};
    },
    enabled: !!currentOutlet?.id,
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchInterval: 30000, // Auto-refetch stats every 30 seconds
    placeholderData: previousData => previousData || {},
  });

  const stats = statsData || {};

  // ✅ REACT QUERY: Fetch Orders
  const {
    data: ordersData,
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: queryKeys.selfService.orders(currentOutlet?.id, {
      search: searchTerm || undefined,
      status: filterStatus === 'all' ? undefined : filterStatus,
      page: orderCurrentPage,
      per_page: orderItemsPerPage,
      ...getDateParams(),
    }),
    queryFn: async () => {
      const dateParams = getDateParams();
      const params = {
        search: searchTerm || undefined,
        status: filterStatus === 'all' ? undefined : filterStatus,
        page: orderCurrentPage,
        per_page: orderItemsPerPage,
        ...dateParams,
      };

      const response = await selfServiceApi.getOrders(params);

      if (response && response.data) {
        const ordersData = Array.isArray(response.data) ? response.data : [];
        return {
          orders: ordersData,
          total: response.total || 0,
          last_page: response.last_page || 1,
          current_page: response.current_page || orderCurrentPage,
        };
      } else if (Array.isArray(response)) {
        return {
          orders: response,
          total: response.length,
          last_page: 1,
          current_page: 1,
        };
      } else {
        return {
          orders: [],
          total: 0,
          last_page: 1,
          current_page: 1,
        };
      }
    },
    enabled: !!currentOutlet?.id, // Always enabled, not just when tab is active
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchInterval: selectedTab === 'orders' ? 30000 : false, // Auto-refetch every 30s when orders tab is active
    placeholderData: previousData =>
      previousData || { orders: [], total: 0, last_page: 1, current_page: 1 },
  });

  const orders = ordersData?.orders || [];
  const orderTotal = ordersData?.total || 0;
  const orderLastPage = ordersData?.last_page || 1;

  // ✅ REACT QUERY: Fetch Tables
  const {
    data: tablesData,
    isLoading: tablesLoading,
    refetch: refetchTables,
  } = useQuery({
    queryKey: queryKeys.tables.list(currentBusiness?.id, currentOutlet?.id, {
      search: tableSearchTerm,
      page: tableCurrentPage,
      per_page: tableItemsPerPage,
    }),
    queryFn: async () => {
      if (!currentOutlet || !currentBusiness) {
        return { tables: [], total: 0 };
      }

      const { tableService } = await import('../../services/table.service');
      const params = {
        search: tableSearchTerm,
        page: tableCurrentPage,
        per_page: tableItemsPerPage,
      };

      const result = await tableService.getAll(
        params,
        currentBusiness.id,
        currentOutlet.id
      );

      if (result.success) {
        const tableData = result.data;
        if (Array.isArray(tableData)) {
          return { tables: tableData, total: tableData.length };
        } else {
          return {
            tables: tableData.data || [],
            total: tableData.total || tableData.data?.length || 0,
          };
        }
      } else {
        return { tables: [], total: 0 };
      }
    },
    enabled: !!currentBusiness?.id && !!currentOutlet?.id,
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchInterval: selectedTab === 'tables' ? 30000 : false, // Auto-refetch every 30s when tables tab is active
    placeholderData: previousData => previousData || { tables: [], total: 0 },
  });

  const tables = tablesData?.tables || [];
  const tableTotal = tablesData?.total || 0;

  // ✅ Auto-refetch all data when business/outlet changes (silent, no toast)
  useEffect(() => {
    if (currentBusiness?.id && currentOutlet?.id) {
      // Invalidate all queries to trigger refetch silently (no toast notification)
      queryClient.invalidateQueries({
        queryKey: queryKeys.selfService.stats(currentOutlet.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.selfService.orders(currentOutlet.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.list(currentBusiness.id, currentOutlet.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.selfService.qrMenus(currentOutlet.id),
      });
      // No toast here - this is automatic background refresh
    }
  }, [currentBusiness?.id, currentOutlet?.id, queryClient]);

  // ✅ REACT QUERY: Fetch QR Menus
  const {
    data: qrMenusData,
    isLoading: qrMenusLoading,
    refetch: refetchQRMenus,
  } = useQuery({
    queryKey: queryKeys.selfService.qrMenus(currentOutlet?.id),
    queryFn: async () => {
      const response = await selfServiceApi.getQRMenuStats();
      if (response && response.data) {
        return Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        return response;
      } else {
        return [];
      }
    },
    enabled: !!currentOutlet?.id, // Always enabled, not just when tab is active
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchInterval: selectedTab === 'qrmenus' ? 30000 : false, // Auto-refetch every 30s when qrmenus tab is active
    placeholderData: previousData => previousData || [],
  });

  const qrMenus = qrMenusData || [];
  const isLoading =
    statsLoading || ordersLoading || tablesLoading || qrMenusLoading;

  // Modal states
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  const [selectedQRMenu, setSelectedQRMenu] = useState(null);
  const [isQRMenuModalOpen, setIsQRMenuModalOpen] = useState(false);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ✅ F5 Handler: Refresh data without full page reload using React Query
  const handleRefresh = useCallback(
    async (showToast = true) => {
      if (isLoading) return; // Prevent multiple simultaneous refreshes

      try {
        // ✅ REACT QUERY: Invalidate all queries to trigger refetch
        queryClient.invalidateQueries({
          predicate: query => {
            const queryKey = query.queryKey;
            return (
              Array.isArray(queryKey) &&
              (queryKey[0] === 'selfService' ||
                queryKey[0] === 'tables' ||
                (Array.isArray(queryKey[0]) &&
                  queryKey[0][0] === 'selfService'))
            );
          },
        });

        // Also invalidate specific queries to ensure all data refreshes
        if (currentOutlet?.id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.selfService.stats(currentOutlet.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.selfService.orders(currentOutlet.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.selfService.qrMenus(currentOutlet.id),
          });
        }

        if (currentBusiness?.id && currentOutlet?.id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.tables.list(
              currentBusiness.id,
              currentOutlet.id
            ),
          });
        }

        // React Query will automatically refetch all invalidated queries
        // Only show toast if explicitly requested (user action, not auto-refetch)
        if (showToast) {
          toast({
            title: 'Berhasil',
            description: 'Data sedang diperbarui...',
            duration: 2000, // Auto-dismiss after 2 seconds
          });
        }
      } catch (error) {
        console.error('Error refreshing self-service data:', error);
        // Only show error toast for user-initiated actions
        if (showToast) {
          toast({
            title: 'Error',
            description: 'Gagal memperbarui data. Silakan coba lagi.',
            variant: 'destructive',
            duration: 3000,
          });
        }
      }
    },
    [isLoading, queryClient, currentOutlet?.id, currentBusiness?.id, toast]
  );

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

  // Filter orders based on search term and status (client-side fallback)
  // Note: Server-side filtering is preferred, this is just a fallback
  const filteredOrders = orders.filter(order => {
    if (!order) return false;
    const matchesSearch =
      !searchTerm ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.table?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Handle table search
  const handleTableSearch = value => {
    setTableSearchTerm(value);
    setTableCurrentPage(1);
    // React Query will automatically refetch when tableSearchTerm changes
  };

  // Handle table page change
  const handleTablePageChange = page => {
    setTableCurrentPage(page);
    // React Query will automatically refetch when tableCurrentPage changes
  };

  // Filter tables based on search term (client-side fallback)
  const filteredTables = tables.filter(table =>
    table.name?.toLowerCase().includes(tableSearchTerm.toLowerCase())
  );

  // ✅ Calculate active tables (occupied or have active orders)
  const activeTablesCount = useMemo(() => {
    // Define active order statuses (exclude completed and cancelled)
    const activeOrderStatuses = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'processing',
    ];

    // Get unique table IDs from active orders (only non-completed orders)
    const activeOrderTableIds = new Set(
      orders
        .filter(
          order =>
            order &&
            activeOrderStatuses.includes(order.status?.toLowerCase()) &&
            (order.table_id || order.table?.id)
        )
        .map(order => order.table_id || order.table?.id)
        .filter(Boolean)
    );

    // Count tables that are either:
    // 1. Status is "occupied"
    // 2. Have active orders (not completed/cancelled)
    const activeTables = tables.filter(table => {
      const hasActiveOrder = activeOrderTableIds.has(table.id);
      const isOccupied = table.status === 'occupied';
      return hasActiveOrder || isOccupied;
    });

    return activeTables.length;
  }, [tables, orders]);

  const getStatusBadge = status => {
    const statusConfig = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'Menunggu',
      },
      confirmed: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Dikonfirmasi',
      },
      preparing: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Diproses',
      },
      ready: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Siap',
      },
      completed: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        label: 'Selesai',
      },
      cancelled: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Dibatalkan',
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Badge className={`${config.color} border font-medium`}>
        {config.label}
      </Badge>
    );
  };

  const getTableStatusBadge = status => {
    const statusConfig = {
      available: { color: 'bg-green-100 text-green-800', label: 'Tersedia' },
      occupied: { color: 'bg-red-100 text-red-800', label: 'Terisi' },
      reserved: { color: 'bg-blue-100 text-blue-800', label: 'Dipesan' },
      cleaning: {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Dibersihkan',
      },
    };

    const config = statusConfig[status] || statusConfig.available;

    return (
      <Badge className={`${config.color} font-medium text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const getQRStatusBadge = status => {
    const statusConfig = {
      active: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Aktif',
      },
      inactive: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Nonaktif',
      },
      maintenance: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'Maintenance',
      },
    };

    const config = statusConfig[status] || statusConfig.active;

    return (
      <Badge className={`${config.color} border font-medium`}>
        {config.label}
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

  const handleOrderAction = async (orderId, action) => {
    try {
      if (action === 'view') {
        // ✅ NEW: Tampilkan modal detail order
        const order = orders.find(o => o.id === orderId);
        if (order) {
          // ✅ DEBUG: Log customer data untuk debugging
          if (process.env.NODE_ENV === 'development') {
            console.log('👤 Customer data for order:', {
              order_id: order.id,
              order_number: order.order_number,
              customer_name: order.customer_name,
              customer_phone: order.customer_phone,
              customer_email: order.customer_email,
            });
          }
          setSelectedOrder(order);
          setIsOrderDetailModalOpen(true);
        }
      } else if (action === 'serve') {
        await selfServiceApi.updateOrderStatus(orderId, 'completed');
        // ✅ REACT QUERY: Invalidate and auto-refetch (no manual refetch needed)
        queryClient.invalidateQueries({
          queryKey: queryKeys.selfService.orders(currentOutlet?.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.selfService.stats(currentOutlet?.id),
        });
        // React Query will automatically refetch invalidated queries
        toast({
          title: 'Berhasil',
          description: 'Status pesanan berhasil diperbarui.',
        });
      }
    } catch (error) {
      // ✅ FIX: Suppress CanceledError and network errors from console spam
      const isCanceled =
        axios.isCancel?.(error) ||
        error.message?.includes('cancelled') ||
        error.message?.includes('canceled');
      const isNetworkError = !error.response && error.request;
      const isTimeout =
        error.code === 'ECONNABORTED' || error.message?.includes('timeout');

      if (
        !isCanceled &&
        !isNetworkError &&
        !isTimeout &&
        process.env.NODE_ENV === 'development'
      ) {
        console.log('⚠️ Error updating order:', error.message);
      }

      // Only show toast for actual errors
      if (!isCanceled && !isTimeout) {
        toast({
          title: 'Error',
          description: 'Gagal memperbarui status pesanan. Silakan coba lagi.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleTableAction = async (tableId, action) => {
    try {
      if (action === 'delete') {
        await selfServiceApi.deleteTable(tableId);
        // ✅ REACT QUERY: Invalidate and auto-refetch (no manual refetch needed)
        queryClient.invalidateQueries({
          queryKey: queryKeys.tables.list(
            currentBusiness?.id,
            currentOutlet?.id
          ),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.selfService.stats(currentOutlet?.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.selfService.qrMenus(currentOutlet?.id),
        });
        // React Query will automatically refetch invalidated queries
        toast({
          title: 'Berhasil',
          description: 'Meja berhasil dihapus.',
        });
      }
    } catch (error) {
      // ✅ FIX: Suppress CanceledError and network errors from console spam
      const isCanceled =
        axios.isCancel?.(error) ||
        error.message?.includes('cancelled') ||
        error.message?.includes('canceled');
      const isNetworkError = !error.response && error.request;
      const isTimeout =
        error.code === 'ECONNABORTED' || error.message?.includes('timeout');

      if (
        !isCanceled &&
        !isNetworkError &&
        !isTimeout &&
        process.env.NODE_ENV === 'development'
      ) {
        console.log('⚠️ Error with table action:', error.message);
      }

      // Only show toast for actual errors
      if (!isCanceled && !isTimeout) {
        const errorMessage =
          error.response?.data?.error ||
          'Gagal menghapus meja. Silakan coba lagi.';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  };

  const handleQRMenuAction = async (qrId, action) => {
    try {
      if (action === 'view') {
        const qrMenu = qrMenus.find(qr => qr.id === qrId);
        if (qrMenu) {
          setSelectedQRMenu(qrMenu);
          setIsQRMenuModalOpen(true);
        }
      } else if (action === 'download') {
        const blob = await selfServiceApi.generateQRCode(qrId);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const qrMenu = qrMenus.find(qr => qr.id === qrId);
        link.download = `qr-${qrMenu?.qr_code || qrId}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({
          title: 'Berhasil',
          description: 'QR code berhasil diunduh.',
        });
      } else if (action === 'delete') {
        // Handle delete action
        toast({
          title: 'Info',
          description: 'Fitur hapus QR menu akan segera tersedia.',
        });
      } else if (action === 'edit') {
        // Handle edit action
        const qrMenu = qrMenus.find(qr => qr.id === qrId);
        if (qrMenu) {
          setSelectedQRMenu(qrMenu);
          setIsQRMenuModalOpen(true);
        }
      }
    } catch (error) {
      // ✅ FIX: Suppress CanceledError and network errors from console spam
      const isCanceled =
        axios.isCancel?.(error) ||
        error.message?.includes('cancelled') ||
        error.message?.includes('canceled');
      const isNetworkError = !error.response && error.request;
      const isTimeout =
        error.code === 'ECONNABORTED' || error.message?.includes('timeout');

      if (
        !isCanceled &&
        !isNetworkError &&
        !isTimeout &&
        process.env.NODE_ENV === 'development'
      ) {
        console.log('⚠️ Error with QR menu action:', error.message);
      }

      // Only show toast for actual errors
      if (!isCanceled && !isTimeout) {
        toast({
          title: 'Error',
          description: 'Gagal melakukan aksi. Silakan coba lagi.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleTableCreated = async () => {
    try {
      // ✅ FIX: Reset ke halaman pertama agar meja baru terlihat
      setTableCurrentPage(1);
      
      // ✅ FIX: Invalidate semua query tables (tanpa exact match) untuk semua pagination params
      queryClient.invalidateQueries({
        queryKey: ['tables', currentBusiness?.id, currentOutlet?.id],
        exact: false, // Invalidate semua query yang dimulai dengan key ini
      });
      
      // ✅ FIX: Invalidate query lainnya
      queryClient.invalidateQueries({
        queryKey: queryKeys.selfService.qrMenus(currentOutlet?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.selfService.stats(currentOutlet?.id),
      });
      
      // ✅ FIX: Langsung refetch untuk memastikan data ter-update
      await refetchTables();
      
      toast({
        title: 'Berhasil',
        description: 'Meja berhasil dibuat.',
      });
    } catch (error) {
      console.error('Error refreshing tables after create:', error);
      // Tetap tampilkan toast success meskipun refetch error
      toast({
        title: 'Berhasil',
        description: 'Meja berhasil dibuat. Silakan refresh halaman jika tidak muncul.',
      });
    }
  };

  const handleTableUpdated = async () => {
    try {
      // ✅ FIX: Invalidate semua query tables (tanpa exact match) untuk semua pagination params
      queryClient.invalidateQueries({
        queryKey: ['tables', currentBusiness?.id, currentOutlet?.id],
        exact: false, // Invalidate semua query yang dimulai dengan key ini
      });
      
      // ✅ FIX: Invalidate query lainnya
      queryClient.invalidateQueries({
        queryKey: queryKeys.selfService.qrMenus(currentOutlet?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.selfService.stats(currentOutlet?.id),
      });
      
      // ✅ FIX: Langsung refetch untuk memastikan data ter-update
      await refetchTables();
      
      setEditingTable(null);
      setIsEditTableModalOpen(false);
    } catch (error) {
      console.error('Error refreshing tables after update:', error);
      setEditingTable(null);
      setIsEditTableModalOpen(false);
    }
  };

  const handleEditTable = table => {
    setEditingTable(table);
    setIsEditTableModalOpen(true);
  };

  // Handle order page change
  const handleOrderPageChange = page => {
    setOrderCurrentPage(page);
    // React Query will automatically refetch when orderCurrentPage changes
  };

  // ✅ OPTIMIZATION: Show skeleton loader until all data is loaded
  // Show skeleton if:
  // 1. Self service is enabled and query is enabled but data is still loading
  // 2. Self service is enabled and query is enabled but no data has been received yet
  const isQueryEnabled = !!currentOutlet?.id && !!currentBusiness?.id;
  const hasStatsData = statsData !== undefined;
  const hasOrdersData = ordersData !== undefined;
  
  // Show skeleton during initial load (when loading OR no data received yet)
  // Only show if self-service is enabled (otherwise show error message)
  const isInitialLoad = 
    isSelfServiceEnabled && 
    isQueryEnabled && (
      (statsLoading && !hasStatsData) || 
      (ordersLoading && !hasOrdersData) || 
      (!hasStatsData && !hasOrdersData) // No data received yet
    );
  
  // ✅ NEW: Show skeleton if initial load
  if (isInitialLoad) {
    return <SelfServiceOrderSkeleton />;
  }

  // ✅ NEW: Show error message if self-service is not enabled
  if (!isSelfServiceEnabled) {
    // Determine the reason for blocking
    const noSubscriptionAccess = !hasSubscriptionAccess;
    const noOutletEnabled = !isOutletEnabled;
    
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] space-y-4'>
        <AlertCircle className='w-16 h-16 text-yellow-500' />
        <h2 className='text-2xl font-bold text-gray-900'>
          Self Service Tidak Diaktifkan
        </h2>
        {noSubscriptionAccess ? (
          <>
            <p className='text-gray-600 text-center max-w-md'>
              Fitur Self Service hanya tersedia untuk paket <strong>Professional</strong> atau lebih tinggi.
            </p>
            <p className='text-sm text-gray-500 text-center max-w-md mt-2'>
              Upgrade ke paket Professional untuk mengakses fitur Self Service dan fitur premium lainnya yang akan membantu bisnis Anda berkembang lebih cepat.
            </p>
            <div className='flex flex-col gap-2 mt-4'>
              <Button
                onClick={() => navigate('/subscription-settings')}
                className='bg-blue-600 hover:bg-blue-700'
              >
                <Store className='w-4 h-4 mr-2' />
                Lihat Paket Professional
              </Button>
              <Button
                onClick={async () => {
                  // Clear cache and refresh both outlet and subscription data
                  console.log('🔄 Refreshing outlet and subscription data...');
                  try {
                    // Clear caches
                    localStorage.removeItem('subscriptionFeatures');
                    localStorage.removeItem('hasActiveSubscription');
                    localStorage.removeItem('currentOutlet');
                    localStorage.removeItem('currentOutletId');
                    
                    // Invalidate React Query cache
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.settings.outlets(currentBusiness?.id),
                    });
                    
                    // Refresh subscription features
                    if (refreshSubscriptionFeatures) {
                      await refreshSubscriptionFeatures();
                    }
                    
                    // Refresh outlets
                    if (loadOutlets) {
                      await loadOutlets();
                    }
                    
                    toast({
                      title: 'Data berhasil diperbarui',
                      description: 'Silakan refresh halaman untuk melihat perubahan.',
                    });
                    
                    // Force reload to get fresh data
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  } catch (error) {
                    console.error('Error refreshing data:', error);
                    toast({
                      title: 'Gagal memperbarui data',
                      description: 'Silakan coba lagi atau refresh halaman secara manual.',
                      variant: 'destructive',
                    });
                  }
                }}
                variant='outline'
                size='sm'
              >
                <RefreshCw className='w-4 h-4 mr-2' />
                Refresh Data
              </Button>
            </div>
          </>
        ) : noOutletEnabled ? (
          <>
            <p className='text-gray-600 text-center max-w-md'>
              {hasSubscriptionAccess 
                ? 'Mengaktifkan fitur Self Service untuk outlet ini...'
                : 'Fitur Self Service belum diaktifkan untuk outlet ini.'}
            </p>
            <p className='text-sm text-gray-500 text-center max-w-md mt-2'>
              {hasSubscriptionAccess 
                ? 'Fitur Self Service sedang diaktifkan secara otomatis. Halaman akan dimuat ulang dalam beberapa detik.'
                : 'Untuk mengaktifkan fitur Self Service, pastikan paket subscription Anda memiliki akses ke fitur ini. Upgrade ke paket Professional untuk mengaktifkan fitur Self Service dan fitur premium lainnya.'}
            </p>
            {hasSubscriptionAccess && (
              <div className='flex items-center justify-center mt-4'>
                <Loader2 className='w-6 h-6 animate-spin text-blue-600' />
                <span className='ml-2 text-sm text-gray-600'>Mengaktifkan...</span>
              </div>
            )}
            {!hasSubscriptionAccess && (
              <div className='flex flex-col gap-2 mt-4'>
                <Button
                  onClick={() => navigate('/subscription-settings')}
                  className='bg-blue-600 hover:bg-blue-700'
                >
                  Upgrade ke Paket Professional
                </Button>
              </div>
            )}
            {hasSubscriptionAccess && !enablingOutlet && (
              <div className='flex flex-col gap-2 mt-4'>
                <Button
                  onClick={async () => {
                    if (!currentOutlet?.id) {
                      toast({
                        title: 'Error',
                        description: 'Outlet tidak ditemukan. Silakan pilih outlet terlebih dahulu.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    
                    setEnablingOutlet(true);
                    try {
                      const result = await outletService.update(currentOutlet.id, {
                        self_service_enabled: true,
                      });
                      
                      if (result.success) {
                        toast({
                          title: 'Berhasil',
                          description: 'Fitur Self Service berhasil diaktifkan untuk outlet ini.',
                        });
                        
                        // ✅ NEW: Wait a bit before refreshing to ensure backend has processed
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // ✅ NEW: Optimistically update currentOutlet in localStorage immediately
                        const updatedOutlet = {
                          ...currentOutlet,
                          self_service_enabled: true,
                        };
                        localStorage.setItem('currentOutlet', JSON.stringify(updatedOutlet));
                        console.log('✅ Optimistically updated outlet in localStorage');
                        
                        // ✅ NEW: Wait a bit for backend to process
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // ✅ NEW: Verify outlet was updated by fetching it again (with retry)
                        let verifiedOutlet = null;
                        let retries = 0;
                        const maxRetries = 3;
                        
                        while (!verifiedOutlet && retries < maxRetries) {
                          try {
                            const verifyResult = await outletService.getById(currentOutlet.id);
                            if (verifyResult.success && verifyResult.data?.data?.self_service_enabled) {
                              verifiedOutlet = verifyResult.data.data;
                              console.log('✅ Outlet verified as enabled');
                              // Update localStorage with verified data
                              localStorage.setItem('currentOutlet', JSON.stringify(verifiedOutlet));
                              break;
                            } else {
                              retries++;
                              if (retries < maxRetries) {
                                console.log(`⚠️ Outlet not yet enabled, retrying... (${retries}/${maxRetries})`);
                                await new Promise(resolve => setTimeout(resolve, 1000));
                              }
                            }
                          } catch (verifyError) {
                            retries++;
                            console.warn(`⚠️ Could not verify outlet update (attempt ${retries}/${maxRetries}):`, verifyError);
                            if (retries < maxRetries) {
                              await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                          }
                        }
                        
                        // Refresh outlets to get updated data (this will update currentOutlet state)
                        if (loadOutlets) {
                          try {
                            await loadOutlets();
                            console.log('✅ Outlets reloaded');
                          } catch (loadError) {
                            console.warn('⚠️ Could not reload outlets:', loadError);
                          }
                        }
                        
                        // ✅ NEW: Also refresh subscription features to ensure consistency
                        if (refreshSubscriptionFeatures) {
                          try {
                            await refreshSubscriptionFeatures();
                            console.log('✅ Subscription features refreshed');
                          } catch (refreshError) {
                            console.warn('⚠️ Could not refresh subscription features:', refreshError);
                          }
                        }
                        
                        // ✅ NEW: Clear session storage flag to allow refresh
                        sessionStorage.removeItem('selfServiceFeaturesRefreshed');
                        
                        // ✅ NEW: Final verification - check if outlet is enabled in localStorage
                        const finalOutlet = JSON.parse(localStorage.getItem('currentOutlet') || '{}');
                        if (finalOutlet.self_service_enabled) {
                          console.log('✅ Final verification: Outlet is enabled in localStorage');
                        }
                        
                        // Force reload to show self-service page
                        setTimeout(() => {
                          window.location.reload();
                        }, 1000);
                      } else {
                        // ✅ NEW: Handle timeout specifically
                        if (result.isTimeout) {
                          toast({
                            title: 'Timeout',
                            description: 'Request timeout. Silakan coba lagi atau periksa koneksi internet Anda.',
                            variant: 'destructive',
                          });
                        } else {
                          toast({
                            title: 'Gagal',
                            description: result.error || 'Gagal mengaktifkan fitur Self Service.',
                            variant: 'destructive',
                          });
                        }
                      }
                    } catch (error) {
                      console.error('Error enabling self-service:', error);
                      
                      // ✅ NEW: Handle timeout errors
                      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                        toast({
                          title: 'Timeout',
                          description: 'Request timeout. Silakan coba lagi atau periksa koneksi internet Anda.',
                          variant: 'destructive',
                        });
                      } else {
                        toast({
                          title: 'Gagal',
                          description: 'Terjadi kesalahan saat mengaktifkan fitur Self Service.',
                          variant: 'destructive',
                        });
                      }
                    } finally {
                      setEnablingOutlet(false);
                    }
                  }}
                  className='bg-green-600 hover:bg-green-700'
                  disabled={enablingOutlet}
                >
                  {enablingOutlet ? (
                    <>
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                      Mengaktifkan...
                    </>
                  ) : (
                    <>
                      <CheckCircle className='w-4 h-4 mr-2' />
                      Aktifkan Self Service
                    </>
                  )}
                </Button>
              </div>
            )}
            <div className='flex flex-col gap-2 mt-4'>
              <Button
                onClick={async () => {
                  // Clear cache and refresh both outlet and subscription data
                  console.log('🔄 Refreshing outlet and subscription data...');
                  try {
                    // Clear caches
                    localStorage.removeItem('subscriptionFeatures');
                    localStorage.removeItem('hasActiveSubscription');
                    localStorage.removeItem('currentOutlet');
                    localStorage.removeItem('currentOutletId');
                    
                    // Invalidate React Query cache
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.settings.outlets(currentBusiness?.id),
                    });
                    
                    // Refresh subscription features
                    if (refreshSubscriptionFeatures) {
                      await refreshSubscriptionFeatures();
                    }
                    
                    // Refresh outlets
                    if (loadOutlets) {
                      await loadOutlets();
                    }
                    
                    toast({
                      title: 'Data berhasil diperbarui',
                      description: 'Silakan refresh halaman untuk melihat perubahan.',
                    });
                    
                    // Force reload to get fresh data
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  } catch (error) {
                    console.error('Error refreshing data:', error);
                    toast({
                      title: 'Gagal memperbarui data',
                      description: 'Silakan coba lagi atau refresh halaman secara manual.',
                      variant: 'destructive',
                    });
                  }
                }}
                variant='outline'
                size='sm'
              >
                <RefreshCw className='w-4 h-4 mr-2' />
                Refresh Data
              </Button>
            </div>
          </>
        ) : (
          <p className='text-gray-600 text-center max-w-md'>
            Fitur Self Service tidak dapat diakses. Silakan hubungi administrator.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>
            Self Service Order
          </h2>
          <p className='text-gray-600'>
            Kelola pesanan mandiri dan QR code menu
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid='refresh-button'
          >
            {isLoading ? (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <RefreshCw className='w-4 h-4 mr-2' />
            )}
            Refresh
          </Button>
          <Button variant='outline' data-testid='qr-settings'>
            <Settings className='w-4 h-4 mr-2' />
            Pengaturan
          </Button>
          {canCreateTable && (
            <Button
              className='bg-blue-600 hover:bg-blue-700'
              data-testid='create-qr'
              onClick={() => setIsCreateTableModalOpen(true)}
            >
              <Plus className='w-4 h-4 mr-2' />
              Buat Meja & QR
            </Button>
          )}
          <Button
            variant='outline'
            onClick={() => {
              debugAuth();
              forceReloadOutlets().then(() => window.location.reload());
            }}
            className='text-xs'
          >
            Debug Outlets
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {statsLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className='border-gray-200'>
                <CardContent className='p-4'>
                  <div className='flex items-center justify-between'>
                    <div className='flex-1'>
                      <Skeleton className='h-4 w-32 mb-2' />
                      <Skeleton className='h-8 w-20 mb-2' />
                      <Skeleton className='h-3 w-24' />
                    </div>
                    <Skeleton className='w-8 h-8 rounded' />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className='card-hover'>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>
                      Total Scan Hari Ini
                    </p>
                    <p className='text-2xl font-bold text-gray-900'>
                      {stats.total_scans_today || 0}
                    </p>
                    <p className='text-xs text-green-600 mt-1'>
                      {stats.scans_growth && stats.scans_growth > 0 ? '+' : ''}
                      {stats.scans_growth || 0}% dari kemarin
                    </p>
                  </div>
                  <QrCode className='w-8 h-8 text-blue-600' />
                </div>
              </CardContent>
            </Card>

            <Card className='card-hover'>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>
                      Pesanan Self Service
                    </p>
                    <p className='text-2xl font-bold text-gray-900'>
                      {stats.self_service_orders || 0}
                    </p>
                    <p className='text-xs text-green-600 mt-1'>
                      {stats.conversion_rate || 0}% conversion
                    </p>
                  </div>
                  <Smartphone className='w-8 h-8 text-green-600' />
                </div>
              </CardContent>
            </Card>

            <Card className='card-hover'>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>
                      Meja Tersedia
                    </p>
                    <p className='text-2xl font-bold text-gray-900'>
                      {stats.available_tables || 0}/{stats.total_tables || 0}
                    </p>
                    <p className='text-xs text-blue-600 mt-1'>
                      {stats.occupancy_rate || 0}% occupancy
                    </p>
                  </div>
                  <Coffee className='w-8 h-8 text-purple-600' />
                </div>
              </CardContent>
            </Card>

            <Card className='card-hover'>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>
                      Waktu Rata-rata
                    </p>
                    <p className='text-2xl font-bold text-gray-900'>
                      {stats.avg_prep_time || 0} min
                    </p>
                    <p className='text-xs text-orange-600 mt-1'>
                      Order to ready
                    </p>
                  </div>
                  <Clock className='w-8 h-8 text-orange-600' />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ✅ NEW: Date Range Filter untuk Owner/Admin */}
      {isOwnerOrAdmin && selectedTab === 'orders' && (
        <Card className='border-blue-100 shadow-sm'>
          <CardContent className='p-5'>
            <div className='flex flex-col gap-4'>
              {/* Header Filter */}
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-blue-50 rounded-lg'>
                  <Calendar className='w-5 h-5 text-blue-600' />
                </div>
                <div>
                  <h3 className='text-sm font-semibold text-gray-900'>
                    Filter Periode
                  </h3>
                  <p className='text-xs text-gray-500'>
                    Pilih periode untuk melihat pesanan self service
                  </p>
                </div>
              </div>

              {/* Filter Controls */}
              <div className='flex flex-col lg:flex-row gap-4 items-start lg:items-center'>
                <div className='flex flex-col sm:flex-row gap-3 flex-1 w-full'>
                  {/* Quick Date Buttons */}
                  <div className='flex flex-wrap gap-2'>
                    {[
                      { value: 'today', label: 'Harian' },
                      { value: 'yesterday', label: 'Kemarin' },
                      { value: 'week', label: 'Mingguan' },
                      { value: 'month', label: 'Bulanan' },
                      { value: 'custom', label: 'Custom Date' },
                    ].map(option => (
                      <Button
                        key={option.value}
                        variant={
                          dateRange === option.value ? 'default' : 'outline'
                        }
                        size='sm'
                        onClick={() => {
                          setDateRange(option.value);
                          if (option.value !== 'custom') {
                            setCustomDateRange({ start: '', end: '' });
                          }
                          setOrderCurrentPage(1); // Reset to page 1
                        }}
                        className={
                          dateRange === option.value
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'hover:bg-gray-50'
                        }
                        disabled={isLoading}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>

                  {/* Custom Date Range Picker */}
                  {dateRange === 'custom' && (
                    <div className='flex flex-col sm:flex-row gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200 shadow-inner w-full'>
                      <div className='flex-1 space-y-2'>
                        <label className='text-xs font-semibold text-gray-700 flex items-center gap-2'>
                          <Calendar className='w-3 h-3 text-blue-600' />
                          Dari Tanggal
                        </label>
                        <Input
                          type='date'
                          value={customDateRange.start}
                          onChange={e => {
                            setCustomDateRange({
                              ...customDateRange,
                              start: e.target.value,
                            });
                            setOrderCurrentPage(1); // Reset to page 1
                          }}
                          max={
                            customDateRange.end ||
                            new Date().toISOString().split('T')[0]
                          }
                          className='text-sm bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                        />
                      </div>
                      <div className='flex items-end pb-7 sm:pb-0'>
                        <div className='w-6 h-0.5 bg-blue-400 rounded-full' />
                      </div>
                      <div className='flex-1 space-y-2'>
                        <label className='text-xs font-semibold text-gray-700 flex items-center gap-2'>
                          <Calendar className='w-3 h-3 text-blue-600' />
                          Sampai Tanggal
                        </label>
                        <Input
                          type='date'
                          value={customDateRange.end}
                          onChange={e => {
                            setCustomDateRange({
                              ...customDateRange,
                              end: e.target.value,
                            });
                            setOrderCurrentPage(1); // Reset to page 1
                          }}
                          min={customDateRange.start}
                          max={new Date().toISOString().split('T')[0]}
                          className='text-sm bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Range Info Badge */}
                {(dateRange !== 'custom' ||
                  (dateRange === 'custom' &&
                    customDateRange.start &&
                    customDateRange.end)) && (
                  <div className='flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200'>
                    <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
                    <span className='text-xs text-gray-600'>
                      {dateRange === 'custom' &&
                      customDateRange.start &&
                      customDateRange.end
                        ? `${new Date(customDateRange.start).toLocaleDateString(
                            'id-ID'
                          )} - ${new Date(
                            customDateRange.end
                          ).toLocaleDateString('id-ID')}`
                        : dateRange === 'today'
                        ? 'Hari Ini'
                        : dateRange === 'yesterday'
                        ? 'Kemarin'
                        : dateRange === 'week'
                        ? '7 Hari Terakhir'
                        : dateRange === 'month'
                        ? '30 Hari Terakhir'
                        : 'Semua Periode'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
              <Input
                placeholder='Cari pesanan, meja, atau customer...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='pl-10'
                data-testid='search-input'
              />
            </div>
            {selectedTab === 'orders' && (
              <div className='flex gap-2'>
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setFilterStatus('all')}
                >
                  Semua
                </Button>
                <Button
                  variant={filterStatus === 'preparing' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setFilterStatus('preparing')}
                >
                  Diproses
                </Button>
                <Button
                  variant={filterStatus === 'ready' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setFilterStatus('ready')}
                >
                  Siap
                </Button>
                <Button
                  variant={filterStatus === 'pending' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setFilterStatus('pending')}
                >
                  Menunggu
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className='overflow-hidden'>
        <CardHeader className='pb-3'>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className='grid w-full grid-cols-3 gap-1'>
              <TabsTrigger
                value='orders'
                data-testid='orders-tab'
                className='text-xs sm:text-sm px-2 sm:px-4'
              >
                <span className='truncate'>
                  Pesanan ({orderTotal || filteredOrders.length})
                </span>
                {!isOwnerOrAdmin && (
                  <span className='hidden sm:inline ml-1 text-xs text-gray-500'>
                    (Hari Ini)
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value='tables'
                data-testid='tables-tab'
                className='text-xs sm:text-sm px-2 sm:px-4'
              >
                <span className='truncate'>
                  Meja (
                  {(() => {
                    if (
                      tablesLoading &&
                      tables.length === 0 &&
                      tableTotal === 0
                    ) {
                      return '...';
                    }
                    return tableTotal > 0 ? tableTotal : tables.length || 0;
                  })()}
                  )
                </span>
              </TabsTrigger>
              <TabsTrigger
                value='qrmenus'
                data-testid='qrmenus-tab'
                className='text-xs sm:text-sm px-2 sm:px-4'
              >
                <span className='truncate'>QR Menu ({qrMenus.length})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className='overflow-x-auto'>
          <div className='min-w-0'>
            <Tabs value={selectedTab}>
              {/* Orders Tab */}
              <TabsContent value='orders' className='space-y-4 min-w-0'>
                {ordersLoading ? (
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Card key={index} className='border-gray-200'>
                        <CardHeader className='pb-3'>
                          <div className='flex items-center justify-between'>
                            <div className='flex-1'>
                              <Skeleton className='h-6 w-32 mb-2' />
                              <Skeleton className='h-4 w-48' />
                            </div>
                            <Skeleton className='h-6 w-20 rounded-full' />
                          </div>
                        </CardHeader>
                        <CardContent className='space-y-3'>
                          <div className='space-y-2'>
                            <Skeleton className='h-4 w-full' />
                            <Skeleton className='h-4 w-3/4' />
                            <Skeleton className='h-4 w-1/2' />
                          </div>
                          <div className='border-t pt-3'>
                            <div className='flex justify-between'>
                              <Skeleton className='h-5 w-16' />
                              <Skeleton className='h-5 w-24' />
                            </div>
                          </div>
                          <div className='flex items-center justify-between'>
                            <Skeleton className='h-4 w-32' />
                            <Skeleton className='h-9 w-24 rounded' />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className='text-center py-8'>
                    <AlertCircle className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                    <h3 className='text-lg font-medium text-gray-900 mb-2'>
                      Tidak ada pesanan
                    </h3>
                    <p className='text-gray-600'>
                      {searchTerm
                        ? 'Tidak ada pesanan yang sesuai dengan pencarian'
                        : 'Belum ada pesanan self service'}
                    </p>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {filteredOrders.map(order => (
                      <Card
                        key={order.id}
                        className='card-hover overflow-hidden'
                        data-testid={`order-${order.id}`}
                      >
                        <CardHeader className='pb-3'>
                          <div className='flex items-start sm:items-center justify-between gap-2'>
                            <div className='min-w-0 flex-1'>
                              <CardTitle className='text-base sm:text-lg font-semibold truncate'>
                                {order.table?.name || 'Meja Tidak Diketahui'}
                              </CardTitle>
                              <CardDescription className='text-xs sm:text-sm truncate'>
                                {order.customer_name} •{' '}
                                {order.customer_phone || 'Tidak ada telepon'}
                              </CardDescription>
                            </div>
                            <div className='flex-shrink-0'>
                              {getStatusBadge(order.status)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className='space-y-3'>
                          <div className='space-y-2'>
                            {order.items?.map((item, index) => (
                              <div
                                key={index}
                                className='flex justify-between text-sm'
                              >
                                <span>
                                  {item.quantity}x{' '}
                                  {item.product?.name ||
                                    'Produk tidak diketahui'}
                                </span>
                                <span className='font-medium'>
                                  {formatCurrency(item.subtotal || 0)}
                                </span>
                              </div>
                            )) || (
                              <div className='text-sm text-gray-500'>
                                Tidak ada item pesanan
                              </div>
                            )}
                          </div>

                          <div className='border-t pt-3'>
                            <div className='flex justify-between font-semibold'>
                              <span>Total:</span>
                              <span className='text-blue-600'>
                                {formatCurrency(order.total || 0)}
                              </span>
                            </div>
                          </div>

                          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-gray-600'>
                            <div className='flex items-center space-x-1 text-xs sm:text-sm'>
                              <Clock className='w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0' />
                              <span className='truncate'>
                                {new Date(order.created_at).toLocaleTimeString(
                                  'id-ID',
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </span>
                            </div>
                            <div className='flex items-center gap-2 w-full sm:w-auto'>
                              <Badge
                                className={`text-xs ${
                                  order.payment_status === 'paid'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {order.payment_status === 'paid'
                                  ? 'Dibayar'
                                  : 'Belum Bayar'}
                              </Badge>
                              <Button
                                size='sm'
                                variant='outline'
                                className='flex-1 sm:flex-initial'
                                data-testid={`view-order-${order.id}`}
                                onClick={() =>
                                  handleOrderAction(order.id, 'view')
                                }
                              >
                                <Eye className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                                Detail
                              </Button>
                              {order.status === 'ready' && (
                                <Button
                                  size='sm'
                                  className='flex-1 bg-green-600 hover:bg-green-700'
                                  data-testid={`serve-order-${order.id}`}
                                  onClick={() =>
                                    handleOrderAction(order.id, 'serve')
                                  }
                                >
                                  <CheckCircle className='w-4 h-4 mr-1' />
                                  Sajikan
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Orders Pagination */}
                {orderTotal > orderItemsPerPage && (
                  <Card>
                    <CardContent className='py-4'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-2'>
                          <span className='text-sm text-gray-600'>
                            Menampilkan{' '}
                            {(orderCurrentPage - 1) * orderItemsPerPage + 1} -{' '}
                            {Math.min(
                              orderCurrentPage * orderItemsPerPage,
                              orderTotal
                            )}{' '}
                            dari {orderTotal} pesanan
                          </span>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              handleOrderPageChange(orderCurrentPage - 1)
                            }
                            disabled={orderCurrentPage === 1 || isLoading}
                          >
                            Sebelumnya
                          </Button>
                          <div className='flex items-center space-x-1'>
                            {Array.from(
                              { length: orderLastPage },
                              (_, i) => i + 1
                            )
                              .filter(page => {
                                // Show first page, last page, current page, and pages around current
                                return (
                                  page === 1 ||
                                  page === orderLastPage ||
                                  Math.abs(page - orderCurrentPage) <= 1
                                );
                              })
                              .map((page, index, array) => {
                                // Add ellipsis if there's a gap
                                const showEllipsis =
                                  index > 0 && page - array[index - 1] > 1;
                                return (
                                  <div key={page} className='flex items-center'>
                                    {showEllipsis && (
                                      <span className='px-2 text-gray-500'>
                                        ...
                                      </span>
                                    )}
                                    <Button
                                      variant={
                                        orderCurrentPage === page
                                          ? 'default'
                                          : 'outline'
                                      }
                                      size='sm'
                                      onClick={() =>
                                        handleOrderPageChange(page)
                                      }
                                      disabled={isLoading}
                                      className={
                                        orderCurrentPage === page
                                          ? 'bg-blue-600 hover:bg-blue-700'
                                          : ''
                                      }
                                    >
                                      {page}
                                    </Button>
                                  </div>
                                );
                              })}
                          </div>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              handleOrderPageChange(orderCurrentPage + 1)
                            }
                            disabled={
                              orderCurrentPage === orderLastPage || isLoading
                            }
                          >
                            Selanjutnya
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tables Tab */}
              <TabsContent value='tables' className='space-y-4 min-w-0'>
                {/* Table Search and Controls */}
                <Card>
                  <CardHeader>
                    <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
                      <div>
                        <CardTitle className='text-lg'>Daftar Meja</CardTitle>
                        <CardDescription>
                          Kelola meja dan status reservasi
                        </CardDescription>
                      </div>
                      <div className='flex gap-2 w-full sm:w-auto'>
                        <div className='relative flex-1 sm:flex-none'>
                          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                          <Input
                            placeholder='Cari meja...'
                            value={tableSearchTerm}
                            onChange={e => handleTableSearch(e.target.value)}
                            className='pl-10 w-full sm:w-64'
                          />
                        </div>
                        <Button
                          variant='outline'
                          onClick={() => {
                            // ✅ REACT QUERY: Invalidate tables query to trigger auto-refetch
                            if (currentBusiness?.id && currentOutlet?.id) {
                              queryClient.invalidateQueries({
                                queryKey: queryKeys.tables.list(
                                  currentBusiness.id,
                                  currentOutlet.id
                                ),
                              });
                            }
                          }}
                          disabled={tablesLoading}
                        >
                          <RefreshCw
                            className={`w-4 h-4 mr-2 ${
                              tablesLoading ? 'animate-spin' : ''
                            }`}
                          />
                          Refresh
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Tables Grid */}
                {tablesLoading ? (
                  <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3'>
                    {Array.from({ length: 8 }).map((_, index) => (
                      <Card
                        key={index}
                        className='border-gray-200 animate-pulse bg-gray-50'
                      >
                        <CardContent className='p-2 sm:p-3'>
                          <div className='flex items-start justify-between mb-2 gap-1'>
                            <Skeleton className='h-5 sm:h-6 w-16 flex-1 mx-auto' />
                            <Skeleton className='h-5 w-5 sm:h-6 sm:w-6 rounded flex-shrink-0' />
                          </div>
                          <div className='space-y-1 sm:space-y-2'>
                            <div className='flex justify-center'>
                              <Skeleton className='h-5 w-20 rounded-full' />
                            </div>
                            <div className='flex items-center justify-center space-x-1'>
                              <Skeleton className='h-3 w-3 rounded-full' />
                              <Skeleton className='h-3 w-6' />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredTables.length === 0 ? (
                  <Card>
                    <CardContent className='py-12 text-center'>
                      <Coffee className='w-16 h-16 mx-auto text-gray-400 mb-4' />
                      <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                        Tidak Ada Meja
                      </h3>
                      <p className='text-gray-600 mb-4'>
                        {currentOutlet
                          ? `Belum ada meja untuk outlet ${currentOutlet.name}`
                          : 'Pilih outlet terlebih dahulu untuk melihat meja'}
                      </p>
                      {canCreateTable && currentOutlet && (
                        <Button
                          className='bg-blue-600 hover:bg-blue-700'
                          onClick={() => setIsCreateTableModalOpen(true)}
                        >
                          <Plus className='w-4 h-4 mr-2' />
                          Buat Meja Pertama
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3'>
                    {filteredTables.map(table => (
                      <Card
                        key={table.id}
                        className={`card-hover transition-all duration-200 ${
                          table.status === 'available'
                            ? 'border-green-200 bg-green-50 hover:bg-green-100'
                            : table.status === 'occupied'
                            ? 'border-red-200 bg-red-50 hover:bg-red-100'
                            : table.status === 'reserved'
                            ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                            : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                        }`}
                        data-testid={`table-${table.name}`}
                      >
                        <CardContent className='p-2 sm:p-3'>
                          <div className='flex items-start justify-between mb-2 gap-1'>
                            <div className='text-base sm:text-xl font-bold text-gray-900 flex-1 text-center truncate px-1'>
                              {table.name}
                            </div>
                            {canCreateTable && (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-gray-200 flex-shrink-0'
                                onClick={e => {
                                  e.stopPropagation();
                                  handleEditTable(table);
                                }}
                                title='Edit meja'
                              >
                                <Edit className='w-3 h-3 text-gray-600' />
                              </Button>
                            )}
                          </div>
                          <div className='space-y-1 sm:space-y-2'>
                            <div className='flex justify-center'>
                              {getTableStatusBadge(table.status)}
                            </div>
                            <div className='text-xs text-gray-600'>
                              <div className='flex items-center justify-center space-x-1'>
                                <Users className='w-3 h-3' />
                                <span>{table.capacity}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Table Pagination */}
                {tables.length > 0 && (
                  <Card>
                    <CardContent className='py-4'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-2'>
                          <span className='text-sm text-gray-600'>
                            Menampilkan{' '}
                            {(tableCurrentPage - 1) * tableItemsPerPage + 1} -{' '}
                            {Math.min(
                              tableCurrentPage * tableItemsPerPage,
                              tableTotal || tables.length
                            )}{' '}
                            dari {tableTotal || tables.length} meja
                          </span>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              handleTablePageChange(tableCurrentPage - 1)
                            }
                            disabled={tableCurrentPage === 1}
                          >
                            Sebelumnya
                          </Button>
                          <div className='flex items-center space-x-1'>
                            {Array.from(
                              {
                                length: Math.ceil(
                                  (tableTotal || tables.length) /
                                    tableItemsPerPage
                                ),
                              },
                              (_, i) => i + 1
                            )
                              .filter(page => {
                                // Show first page, last page, current page, and pages around current
                                const totalPages = Math.ceil(
                                  (tableTotal || tables.length) /
                                    tableItemsPerPage
                                );
                                return (
                                  page === 1 ||
                                  page === totalPages ||
                                  Math.abs(page - tableCurrentPage) <= 1
                                );
                              })
                              .map((page, index, array) => {
                                // Add ellipsis if there's a gap
                                const showEllipsis =
                                  index > 0 && page - array[index - 1] > 1;
                                return (
                                  <div key={page} className='flex items-center'>
                                    {showEllipsis && (
                                      <span className='px-2 text-gray-500'>
                                        ...
                                      </span>
                                    )}
                                    <Button
                                      variant={
                                        tableCurrentPage === page
                                          ? 'default'
                                          : 'outline'
                                      }
                                      size='sm'
                                      onClick={() =>
                                        handleTablePageChange(page)
                                      }
                                      className={
                                        tableCurrentPage === page
                                          ? 'bg-blue-600 hover:bg-blue-700'
                                          : ''
                                      }
                                    >
                                      {page}
                                    </Button>
                                  </div>
                                );
                              })}
                          </div>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              handleTablePageChange(tableCurrentPage + 1)
                            }
                            disabled={
                              tableCurrentPage ===
                              Math.ceil(
                                (tableTotal || tables.length) /
                                  tableItemsPerPage
                              )
                            }
                          >
                            Selanjutnya
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Table Legend */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-sm'>
                      Keterangan Status Meja
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                      <div className='flex items-center space-x-2'>
                        <div className='w-4 h-4 bg-green-200 rounded border border-green-300'></div>
                        <span>Tersedia</span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div className='w-4 h-4 bg-red-200 rounded border border-red-300'></div>
                        <span>Terisi</span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div className='w-4 h-4 bg-blue-200 rounded border border-blue-300'></div>
                        <span>Dipesan</span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div className='w-4 h-4 bg-yellow-200 rounded border border-yellow-300'></div>
                        <span>Dibersihkan</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* QR Menus Tab */}
              <TabsContent value='qrmenus' className='space-y-4 min-w-0'>
                {qrMenusLoading ? (
                  <div className='space-y-4'>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Card key={index} className='border-gray-200'>
                        <CardContent className='p-6'>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center space-x-4'>
                              <Skeleton className='w-16 h-16 rounded-lg' />
                              <div>
                                <Skeleton className='h-6 w-32 mb-2' />
                                <Skeleton className='h-4 w-24 mb-1' />
                                <Skeleton className='h-3 w-40' />
                              </div>
                            </div>
                            <div className='flex items-center space-x-6'>
                              <div className='text-center'>
                                <Skeleton className='h-8 w-12 mb-1' />
                                <Skeleton className='h-3 w-16' />
                              </div>
                              <div className='text-center'>
                                <Skeleton className='h-8 w-12 mb-1' />
                                <Skeleton className='h-3 w-16' />
                              </div>
                              <div className='text-center'>
                                <Skeleton className='h-5 w-16 mb-1' />
                                <Skeleton className='h-5 w-12' />
                              </div>
                              <div className='text-center'>
                                <Skeleton className='h-8 w-12 mb-1' />
                                <Skeleton className='h-3 w-20' />
                              </div>
                            </div>
                            <Skeleton className='h-6 w-20 rounded-full' />
                          </div>
                          <div className='mt-4 flex items-center justify-between'>
                            <Skeleton className='h-4 w-32' />
                            <div className='flex space-x-2'>
                              <Skeleton className='h-9 w-24 rounded' />
                              <Skeleton className='h-9 w-24 rounded' />
                              <Skeleton className='h-9 w-9 rounded' />
                              <Skeleton className='h-9 w-9 rounded' />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {qrMenus.map(qr => (
                      <Card
                        key={qr.id}
                        className='card-hover overflow-hidden'
                        data-testid={`qr-menu-${qr.id}`}
                      >
                        <CardContent className='p-4 sm:p-6'>
                          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                            <div className='flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0'>
                              <div className='w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white flex-shrink-0'>
                                <QrCode className='w-6 h-6 sm:w-8 sm:h-8' />
                              </div>
                              <div className='min-w-0 flex-1'>
                                <h3 className='font-semibold text-gray-900 text-base sm:text-lg truncate'>
                                  {qr.name}
                                </h3>
                                <p className='text-gray-600 text-sm sm:text-base truncate'>
                                  {qr.table_number}
                                </p>
                                <p className='text-xs sm:text-sm text-gray-500 font-mono truncate'>
                                  {qr.qr_code}
                                </p>
                              </div>
                            </div>

                            <div className='flex items-center space-x-3 sm:space-x-6 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-between sm:justify-end'>
                              <div className='text-center'>
                                <p className='text-2xl font-bold text-blue-600'>
                                  {qr.scans || 0}
                                </p>
                                <p className='text-sm text-gray-600'>
                                  Total Scan
                                </p>
                              </div>
                              <div className='text-center'>
                                <p className='text-2xl font-bold text-green-600'>
                                  {qr.orders || 0}
                                </p>
                                <p className='text-sm text-gray-600'>Pesanan</p>
                              </div>
                              <div className='text-center'>
                                <p className='text-sm text-gray-600'>
                                  Conversion
                                </p>
                                <p className='text-lg font-bold text-purple-600'>
                                  {qr.conversion !== undefined
                                    ? qr.conversion.toFixed(1)
                                    : qr.scans > 0
                                    ? ((qr.orders / qr.scans) * 100).toFixed(1)
                                    : 0}
                                  %
                                </p>
                              </div>
                              {/* ✅ NEW: Jumlah Orang */}
                              <div className='text-center'>
                                <p className='text-2xl font-bold text-orange-600'>
                                  {qr.total_people || 0}
                                </p>
                                <p className='text-sm text-gray-600'>
                                  Jumlah Orang
                                </p>
                              </div>
                            </div>

                            <div className='flex items-center space-x-2'>
                              {getQRStatusBadge(qr.status)}
                            </div>
                          </div>

                          <div className='mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full'>
                            <div className='text-xs sm:text-sm text-gray-500 truncate'>
                              <span>
                                Scan terakhir: {qr.last_scan || 'Belum ada'}
                              </span>
                            </div>

                            <div className='flex flex-wrap gap-2 w-full sm:w-auto'>
                              <Button
                                size='sm'
                                variant='outline'
                                data-testid={`download-qr-${qr.id}`}
                                onClick={() =>
                                  handleQRMenuAction(qr.id, 'download')
                                }
                              >
                                <Download className='w-4 h-4 mr-1' />
                                Download
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                data-testid={`view-qr-${qr.id}`}
                                onClick={() =>
                                  handleQRMenuAction(qr.id, 'view')
                                }
                              >
                                <Eye className='w-4 h-4 mr-1' />
                                Preview
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                data-testid={`edit-qr-${qr.id}`}
                                onClick={() =>
                                  handleQRMenuAction(qr.id, 'edit')
                                }
                              >
                                <Edit className='w-4 h-4' />
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                className='text-red-600 hover:text-red-700'
                                data-testid={`delete-qr-${qr.id}`}
                                onClick={() =>
                                  handleQRMenuAction(qr.id, 'delete')
                                }
                              >
                                <Trash2 className='w-4 h-4' />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateTableModal
        isOpen={isCreateTableModalOpen}
        onClose={() => setIsCreateTableModalOpen(false)}
        onSuccess={handleTableCreated}
      />

      <CreateTableModal
        isOpen={isEditTableModalOpen}
        onClose={() => {
          setIsEditTableModalOpen(false);
          setEditingTable(null);
        }}
        onSuccess={handleTableUpdated}
        table={editingTable}
      />

      <QRMenuModal
        isOpen={isQRMenuModalOpen}
        onClose={() => setIsQRMenuModalOpen(false)}
        qrMenu={selectedQRMenu}
        onEdit={qrMenu => {
          console.log('Edit QR Menu:', qrMenu);
        }}
        onDelete={qrMenu => {
          console.log('Delete QR Menu:', qrMenu);
        }}
      />

      {/* ✅ NEW: Order Detail Modal */}
      <Dialog
        open={isOrderDetailModalOpen}
        onOpenChange={setIsOrderDetailModalOpen}
      >
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-xl font-bold'>
              Detail Pesanan #{selectedOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang pesanan ini
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className='space-y-6'>
              {/* Customer Info - ✅ FIX: Tampilkan jika ada customer_name, customer_phone, atau customer_email */}
              {(selectedOrder.customer_name ||
                selectedOrder.customer_phone ||
                selectedOrder.customer_email) && (
                <div className='bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200'>
                  <div className='flex items-center mb-3'>
                    <User className='w-5 h-5 text-blue-600 mr-2' />
                    <h3 className='font-semibold text-gray-900'>
                      Informasi Pelanggan
                    </h3>
                  </div>
                  <div className='space-y-2'>
                    {selectedOrder.customer_name && (
                      <p className='font-semibold text-gray-900 text-lg'>
                        {selectedOrder.customer_name}
                      </p>
                    )}
                    {selectedOrder.customer_phone && (
                      <div className='flex items-center text-sm text-gray-600'>
                        <Phone className='w-4 h-4 mr-2' />
                        {selectedOrder.customer_phone}
                      </div>
                    )}
                    {selectedOrder.customer_email && (
                      <div className='flex items-center text-sm text-gray-600'>
                        <Mail className='w-4 h-4 mr-2' />
                        {selectedOrder.customer_email}
                      </div>
                    )}
                    {!selectedOrder.customer_name &&
                      !selectedOrder.customer_phone &&
                      !selectedOrder.customer_email && (
                        <p className='text-sm text-gray-500 italic'>
                          Informasi pelanggan tidak tersedia
                        </p>
                      )}
                  </div>
                </div>
              )}

              {/* Table Info */}
              {selectedOrder.table && (
                <div className='bg-gray-50 p-4 rounded-lg border border-gray-200'>
                  <div className='flex items-center mb-2'>
                    <Coffee className='w-5 h-5 text-gray-600 mr-2' />
                    <h3 className='font-semibold text-gray-900'>Meja</h3>
                  </div>
                  <p className='text-lg font-medium text-gray-900'>
                    {selectedOrder.table.name}
                  </p>
                </div>
              )}

              {/* Order Items */}
              <div className='border-t pt-4'>
                <h3 className='font-semibold text-gray-900 mb-4 flex items-center'>
                  <span className='mr-2'>Item Pesanan</span>
                  <Badge variant='outline' className='ml-2'>
                    {
                      (selectedOrder.items || selectedOrder.orderItems || [])
                        .length
                    }{' '}
                    item
                  </Badge>
                </h3>
                <div className='space-y-3'>
                  {(() => {
                    // ✅ FIX: Gunakan items atau orderItems sebagai fallback
                    const items =
                      selectedOrder.items || selectedOrder.orderItems || [];
                    if (items.length > 0) {
                      return items.map((item, index) => (
                        <div
                          key={item.id || index}
                          className='flex justify-between items-start p-3 bg-gray-50 rounded-lg border border-gray-200'
                        >
                          <div className='flex-1'>
                            <p className='font-medium text-gray-900'>
                              {item.product?.name ||
                                item.product_name ||
                                'Produk tidak diketahui'}
                            </p>
                            <p className='text-sm text-gray-600 mt-1'>
                              {item.quantity} x{' '}
                              {formatCurrency(item.price || 0)}
                            </p>
                          </div>
                          <div className='text-right'>
                            <p className='font-semibold text-gray-900'>
                              {formatCurrency(
                                item.subtotal || item.quantity * item.price || 0
                              )}
                            </p>
                          </div>
                        </div>
                      ));
                    } else {
                      return (
                        <div className='text-center py-8 text-gray-500'>
                          <AlertCircle className='w-12 h-12 mx-auto mb-2 text-gray-400' />
                          <p>Tidak ada item pesanan</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* Order Summary */}
              <div className='border-t pt-4 space-y-2'>
                <div className='flex justify-between text-sm text-gray-600'>
                  <span>Subtotal:</span>
                  <span>
                    {formatCurrency(
                      selectedOrder.subtotal || selectedOrder.total || 0
                    )}
                  </span>
                </div>
                {selectedOrder.tax_amount > 0 && (
                  <div className='flex justify-between text-sm text-gray-600'>
                    <span>Pajak:</span>
                    <span>{formatCurrency(selectedOrder.tax_amount || 0)}</span>
                  </div>
                )}
                {selectedOrder.discount_amount > 0 && (
                  <div className='flex justify-between text-sm text-green-600'>
                    <span>Diskon:</span>
                    <span>
                      -{formatCurrency(selectedOrder.discount_amount || 0)}
                    </span>
                  </div>
                )}
                <div className='flex justify-between items-center pt-2 border-t border-gray-300'>
                  <span className='text-lg font-bold text-gray-900'>
                    Total:
                  </span>
                  <span className='text-xl font-bold text-blue-600'>
                    {formatCurrency(selectedOrder.total || 0)}
                  </span>
                </div>
              </div>

              {/* Order Status & Payment */}
              <div className='grid grid-cols-2 gap-4 pt-4 border-t'>
                <div>
                  <p className='text-sm text-gray-600 mb-1'>Status Pesanan</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className='text-sm text-gray-600 mb-1'>
                    Status Pembayaran
                  </p>
                  <Badge
                    className={`text-xs ${
                      selectedOrder.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : selectedOrder.payment_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'bg-gray-100 text-gray-800 border-gray-200'
                    }`}
                  >
                    {selectedOrder.payment_status === 'paid'
                      ? 'Dibayar'
                      : selectedOrder.payment_status === 'pending'
                      ? 'Menunggu Pembayaran'
                      : 'Belum Dibayar'}
                  </Badge>
                </div>
              </div>

              {/* ✅ NEW: Metode Pembayaran */}
              {selectedOrder.payment_method_label && (
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                  <div className='flex items-center mb-2'>
                    {(() => {
                      const method =
                        selectedOrder.payment_method?.toLowerCase() || '';
                      if (method.includes('qris') || method === 'qris') {
                        return (
                          <QrCode className='w-5 h-5 text-blue-600 mr-2' />
                        );
                      } else if (
                        method.includes('transfer') ||
                        method === 'bank_transfer'
                      ) {
                        return (
                          <CreditCard className='w-5 h-5 text-blue-600 mr-2' />
                        );
                      } else if (
                        method.includes('midtrans') ||
                        method.includes('gopay') ||
                        method.includes('shopeepay') ||
                        method.includes('wallet')
                      ) {
                        return (
                          <Wallet className='w-5 h-5 text-blue-600 mr-2' />
                        );
                      } else if (
                        method === 'pay_later' ||
                        method.includes('kasir')
                      ) {
                        return <Store className='w-5 h-5 text-blue-600 mr-2' />;
                      } else if (method === 'cash') {
                        return (
                          <CreditCard className='w-5 h-5 text-blue-600 mr-2' />
                        );
                      } else {
                        return (
                          <CreditCard className='w-5 h-5 text-blue-600 mr-2' />
                        );
                      }
                    })()}
                    <h3 className='font-semibold text-gray-900'>
                      Metode Pembayaran
                    </h3>
                  </div>
                  <p className='text-base font-medium text-gray-900'>
                    {selectedOrder.payment_method_label}
                  </p>
                  {selectedOrder.payment_method === 'pay_later' &&
                    selectedOrder.payment_status === 'paid' && (
                      <p className='text-sm text-gray-600 mt-1'>
                        Pembayaran dilakukan di kasir
                      </p>
                    )}
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
                  <p className='text-sm font-semibold text-yellow-800 mb-1'>
                    Catatan:
                  </p>
                  <p className='text-sm text-yellow-700'>
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              {/* Timestamp */}
              <div className='flex items-center text-sm text-gray-500 pt-2 border-t'>
                <Clock className='w-4 h-4 mr-2' />
                <span>
                  Dibuat:{' '}
                  {new Date(selectedOrder.created_at).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SelfServiceOrder;
