import {
  AlertCircle,
  Bell,
  CheckCircle,
  ChefHat,
  Clock,
  Flame,
  RefreshCw,
  Timer,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { queryKeys } from '../../config/reactQuery';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { kitchenService } from '../../services/kitchen.service';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const KitchenDashboard = () => {
  const { currentOutlet, currentBusiness, outlets, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState({
    pending_paid: [],
    pending_dine_in: [],
    pending_self_service: [],
    confirmed: [],
    preparing: [],
    ready: [],
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [notifications, setNotifications] = useState({
    count: 0,
    has_new_orders: false,
    recent_orders: [],
  });
  const [stats, setStats] = useState({
    pending: 0,
    cooking: 0,
    completed: 0,
  });

  // ✅ FIX: Use React Query for kitchen orders
  const {
    data: ordersData,
    isLoading: loadingOrders,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: queryKeys.kitchen.orders(currentOutlet?.id),
    queryFn: async () => {
      if (!currentOutlet) {
        return null;
      }

      const result = await kitchenService.getOrders();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to load orders');
    },
    enabled: Boolean(currentOutlet),
    staleTime: 30 * 1000, // 30 seconds - real-time data
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  // ✅ FIX: Update orders state when React Query data changes
  useEffect(() => {
    if (ordersData) {
      const data = ordersData;
      if (data.grouped) {
        setGroupedOrders(data.grouped);
        setOrders(data.orders || []);
        updateStats(data.orders || []);
      } else {
        setOrders(data || []);
        updateStats(data || []);
      }
    }
    setLoading(loadingOrders);
  }, [ordersData, loadingOrders]);

  // ✅ FIX: Load orders function now uses React Query refetch
  const loadOrders = useCallback(async () => {
    await refetchOrders();
  }, [refetchOrders]);

  // ✅ NEW: Load notifications
  const loadNotifications = async () => {
    if (!currentOutlet) return;

    try {
      const result = await kitchenService.getNewOrderNotifications();
      if (result.success) {
        setNotifications(result.data || {
          count: 0,
          has_new_orders: false,
          recent_orders: [],
        });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdating(prev => ({ ...prev, [orderId]: true }));
    try {
      const result = await kitchenService.updateStatus(orderId, newStatus);
      if (result.success) {
        toast.success(
          `Status pesanan berhasil diubah ke ${getStatusText(newStatus)}`
        );
        loadOrders(); // Reload orders
        loadNotifications(); // Reload notifications
      } else {
        toast.error(
          'Gagal mengubah status: ' + (result.error || 'Unknown error')
        );
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Gagal mengubah status pesanan');
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // ✅ NEW: Confirm order manually (for pending orders that are already paid)
  const confirmOrder = async orderId => {
    setUpdating(prev => ({ ...prev, [orderId]: true }));
    try {
      const result = await kitchenService.confirmOrder(orderId);
      if (result.success) {
        toast.success('Pesanan berhasil dikonfirmasi');
        loadOrders(); // Reload orders
        loadNotifications(); // Reload notifications
      } else {
        toast.error(
          'Gagal mengonfirmasi pesanan: ' + (result.error || 'Unknown error')
        );
      }
    } catch (error) {
      console.error('Error confirming order:', error);
      toast.error('Gagal mengonfirmasi pesanan');
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Update stats based on orders
  const updateStats = ordersData => {
    const newStats = {
      pending:
        ordersData.filter(order => order.status === 'confirmed').length +
        ordersData.filter(
          order =>
            order.status === 'pending' &&
            (order.payment_status === 'paid' || 
             order.type === 'dine_in' || 
             (order.type === 'self_service' && order.payment_status === 'pending'))
        ).length,
      cooking: ordersData.filter(order => order.status === 'preparing').length,
      completed: ordersData.filter(order => order.status === 'ready').length,
    };
    setStats(newStats);
  };

  // Get status text in Indonesian
  const getStatusText = status => {
    const statusMap = {
      confirmed: 'Menunggu',
      preparing: 'Sedang Dimasak',
      ready: 'Siap',
      completed: 'Selesai',
    };
    return statusMap[status] || status;
  };

  // Get priority based on order age
  const getOrderPriority = createdAt => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffMinutes = (now - orderTime) / (1000 * 60);

    if (diffMinutes > 15) return 'high';
    if (diffMinutes > 10) return 'medium';
    return 'low';
  };

  // Format time ago
  const getTimeAgo = createdAt => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffMinutes = Math.floor((now - orderTime) / (1000 * 60));

    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes === 1) return '1 menit yang lalu';
    return `${diffMinutes} menit yang lalu`;
  };

  // Load orders on component mount and when outlet changes
  // ✅ FIX: Load notifications on mount and when outlet changes
  // Orders are handled by React Query automatically
  useEffect(() => {
    loadNotifications();
  }, [currentOutlet]);

  // ✅ FIX: Auto-refresh notifications every 30 seconds (orders handled by React Query)
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentOutlet) {
        loadNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentOutlet]);

  // ✅ FIX: Handle refresh using React Query refetch
  const handleRefresh = useCallback(async () => {
    if (loadingOrders) {
      return; // Prevent multiple simultaneous refreshes
    }

    try {
      // Show loading toast
      const loadingToast = toast.loading('Memperbarui data...');
      
      await Promise.all([
        refetchOrders(),
        loadNotifications(),
      ]);
      
      toast.dismiss(loadingToast);
      toast.success('Data berhasil diperbarui');
    } catch (error) {
      // ✅ FIX: Don't log cancelled requests as errors
      if (error?.name === 'AbortError' || error?.message?.includes('cancelled')) {
        console.warn('Refresh was cancelled:', error);
        toast.dismiss();
        return;
      }
      console.error('Error refreshing data:', error);
      toast.error('Gagal memuat ulang data');
    }
  }, [refetchOrders, loadNotifications, loadingOrders]);

  // ✅ KEYBOARD SHORTCUTS for Kitchen Dashboard
  useKeyboardShortcuts(
    {
      F5: () => {
        // F5: Refresh orders - prevent default browser reload (handled by useKeyboardShortcuts)
        if (!loadingOrders) {
          handleRefresh();
        }
      },
      'R': () => {
        // R: Refresh orders
        if (!loadingOrders) {
          handleRefresh();
        }
      },
    },
    [handleRefresh, loadingOrders]
  );

  const statsCards = [
    {
      title: 'Pesanan Menunggu',
      value: stats.pending.toString(),
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      badge:
        notifications.count > 0 ? (
          <Badge className='ml-2 bg-red-500 text-white'>
            {notifications.count} Baru
          </Badge>
        ) : null,
    },
    {
      title: 'Sedang Dimasak',
      value: stats.cooking.toString(),
      icon: Flame,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    {
      title: 'Siap Diambil',
      value: stats.completed.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  ];

  const getPriorityBadge = priority => {
    const config = {
      high: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Prioritas Tinggi',
      },
      medium: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'Normal',
      },
      low: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        label: 'Rendah',
      },
    };
    const c = config[priority] || config.medium;
    return <Badge className={`${c.color} border font-medium`}>{c.label}</Badge>;
  };

  const getStatusBadge = status => {
    const config = {
      pending: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        label: 'Menunggu',
        icon: Clock,
      },
      cooking: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Sedang Dimasak',
        icon: Flame,
      },
      ready: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Siap',
        icon: CheckCircle,
      },
    };
    const c = config[status] || config.pending;
    const StatusIcon = c.icon;
    return (
      <Badge
        className={`${c.color} border font-medium flex items-center space-x-1`}
      >
        <StatusIcon className='w-3 h-3' />
        <span>{c.label}</span>
      </Badge>
    );
  };

  // Show message if no outlet is selected
  if (!currentOutlet) {
    return (
      <div className='space-y-6'>
        <Card className='p-8 text-center'>
          <ChefHat className='w-16 h-16 mx-auto text-gray-400 mb-4' />
          <h3 className='text-xl font-semibold text-gray-900 mb-2'>
            Pilih Outlet Terlebih Dahulu
          </h3>
          <p className='text-gray-500 mb-4'>
            Anda perlu memilih outlet untuk mengakses dashboard dapur.
          </p>
          {outlets && outlets.length > 0 ? (
            <div className='flex justify-center'>
              <Select
                value=''
                onValueChange={value => {
                  const outlet = outlets.find(o => o.id.toString() === value);
                  if (outlet) {
                    localStorage.setItem('currentOutletId', outlet.id);
                    window.location.reload();
                  }
                }}
              >
                <SelectTrigger className='w-64'>
                  <SelectValue placeholder='Pilih Outlet' />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map(outlet => (
                    <SelectItem key={outlet.id} value={outlet.id.toString()}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className='text-sm text-gray-400'>
              Tidak ada outlet yang tersedia.
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Welcome Banner */}
      <div className='bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 text-white'>
        <div className='flex items-center justify-between'>
          <div className='flex-1'>
            <h2 className='text-2xl font-bold mb-2'>Dashboard Dapur</h2>
            <p className='text-orange-100 mb-4'>
              Kelola pesanan masakan dengan efisien
            </p>
            <div className='flex items-center space-x-2 text-sm mb-4'>
              <Clock className='w-4 h-4' />
              <span>
                {new Date().toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                WIB
              </span>
              <span className='mx-2'>•</span>
              <span>
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>

            {/* Outlet Switcher */}
            {outlets && outlets.length > 1 && (
              <div className='flex items-center space-x-2'>
                <span className='text-orange-100 text-sm'>Outlet:</span>
                <Select
                  value={currentOutlet?.id?.toString()}
                  onValueChange={value => {
                    const outlet = outlets.find(o => o.id.toString() === value);
                    if (outlet) {
                      localStorage.setItem('currentOutletId', outlet.id);
                      window.location.reload(); // Simple reload to refresh data
                    }
                  }}
                >
                  <SelectTrigger className='w-48 bg-white/20 border-white/30 text-white'>
                    <SelectValue placeholder='Pilih Outlet' />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map(outlet => (
                      <SelectItem key={outlet.id} value={outlet.id.toString()}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentOutlet && (
              <div className='mt-2 text-sm text-orange-100'>
                📍 {currentOutlet.name}
              </div>
            )}
          </div>
          <ChefHat className='w-20 h-20 text-orange-200' />
        </div>
      </div>

      {/* ✅ NEW: Notifications Banner */}
      {notifications.has_new_orders && (
        <Card className='bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <Bell className='w-6 h-6 text-red-600 animate-pulse' />
                <div>
                  <h4 className='font-semibold text-red-900'>
                    Ada {notifications.count} Pesanan Baru!
                  </h4>
                  <p className='text-sm text-red-700 mt-1'>
                    {(() => {
                      const dineInCount = groupedOrders.pending_dine_in?.length || 0;
                      const selfServiceCount = groupedOrders.pending_self_service?.length || 0;
                      const paidCount = groupedOrders.pending_paid?.length || 0;
                      const parts = [];

                      if (dineInCount > 0) {
                        parts.push(`${dineInCount} pesanan dine-in (belum dibayar)`);
                      }
                      if (selfServiceCount > 0) {
                        parts.push(`${selfServiceCount} pesanan self-service (pay later)`);
                      }
                      if (paidCount > 0) {
                        parts.push(`${paidCount} pesanan online/takeaway (sudah dibayar)`);
                      }

                      if (parts.length === 0) {
                        return 'Tidak ada pesanan baru';
                      }

                      return parts.join(', ') + ' menunggu konfirmasi';
                    })()}
                  </p>
                </div>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  document
                    .getElementById('pending-orders-section')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                className='border-red-300 text-red-700 hover:bg-red-100'
              >
                Lihat Pesanan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className={`${stat.bgColor} ${stat.borderColor} border-2`}
            >
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-gray-700 flex items-center'>
                  {stat.title}
                  {stat.badge}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className='text-3xl font-bold text-gray-900'>
                  {stat.value}
                </div>
                <p className='text-xs text-gray-600 mt-1'>Pesanan</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ✅ NEW: Pending Orders (Dine-in dan Self-Service yang belum dibayar) */}
      {(groupedOrders.pending_dine_in?.length > 0 ||
        groupedOrders.pending_self_service?.length > 0) && (
          <div className='space-y-4' id='pending-orders-section'>
            {/* Dine-in Orders */}
            {groupedOrders.pending_dine_in?.length > 0 && (
              <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Pesanan Dine-In Baru
                </h3>
                <Badge className='bg-blue-500 text-white'>
                  {groupedOrders.pending_dine_in.length}
                </Badge>
              </div>
            </div>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {groupedOrders.pending_dine_in.map(order => {
                const timeAgo = getTimeAgo(order.created_at);
                const isUpdating = updating[order.id];

                return (
                  <Card
                    key={order.id}
                    className='border-2 border-blue-300 bg-blue-50'
                  >
                    <CardHeader>
                      <div className='flex items-start justify-between'>
                        <div>
                          <CardTitle className='text-lg font-bold flex items-center space-x-2'>
                            <span>#{order.order_number}</span>
                            <Badge className='bg-blue-500 text-white'>
                              Dine-In
                            </Badge>
                            {order.payment_status === 'pending' && (
                              <Badge className='bg-yellow-500 text-white'>
                                Belum Dibayar
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className='flex items-center space-x-2 mt-1'>
                            <Timer className='w-4 h-4' />
                            <span>{timeAgo}</span>
                            {order.table && (
                              <>
                                <span className='mx-2'>•</span>
                                <span>Meja: {order.table.name}</span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3 mb-4'>
                        {(order.order_items || order.orderItems)?.map(
                          (item, idx) => (
                            <div
                              key={idx}
                              className='flex items-start justify-between p-3 bg-white rounded-lg'
                            >
                              <div className='flex items-start space-x-3'>
                                <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold'>
                                  {item.quantity}x
                                </div>
                                <div>
                                  <p className='font-medium text-gray-900'>
                                    {item.product?.name}
                                  </p>
                                  {item.notes && (
                                    <p className='text-sm text-blue-600 mt-1'>
                                      <span className='font-medium'>
                                        Catatan:
                                      </span>{' '}
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      <Button
                        className='w-full bg-green-600 hover:bg-green-700'
                        onClick={() => confirmOrder(order.id)}
                        disabled={isUpdating}
                      >
                        <CheckCircle className='w-4 h-4 mr-2' />
                        {isUpdating ? 'Mengonfirmasi...' : 'Terima Pesanan'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
            )}

            {/* Self-Service Orders (Pay Later) */}
            {groupedOrders.pending_self_service?.length > 0 && (
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-2'>
                    <h3 className='text-lg font-semibold text-gray-900'>
                      Pesanan Self-Service Baru (Pay Later)
                    </h3>
                    <Badge className='bg-purple-500 text-white'>
                      {groupedOrders.pending_self_service.length}
                    </Badge>
                  </div>
                </div>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  {groupedOrders.pending_self_service.map(order => {
                    const timeAgo = getTimeAgo(order.created_at);
                    const isUpdating = updating[order.id];

                    return (
                      <Card
                        key={order.id}
                        className='border-2 border-purple-300 bg-purple-50'
                      >
                        <CardHeader>
                          <div className='flex items-start justify-between'>
                            <div>
                              <CardTitle className='text-lg font-bold flex items-center space-x-2'>
                                <span>#{order.order_number}</span>
                                <Badge className='bg-purple-500 text-white'>
                                  Self-Service
                                </Badge>
                                {order.payment_status === 'pending' && (
                                  <Badge className='bg-yellow-500 text-white'>
                                    Pay Later
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription className='flex items-center space-x-2 mt-1'>
                                <Timer className='w-4 h-4' />
                                <span>{timeAgo}</span>
                                {order.table && (
                                  <>
                                    <span className='mx-2'>•</span>
                                    <span>Meja: {order.table.name}</span>
                                  </>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className='space-y-3 mb-4'>
                            {(order.order_items || order.orderItems)?.map(
                              (item, idx) => (
                                <div
                                  key={idx}
                                  className='flex items-start justify-between p-3 bg-white rounded-lg'
                                >
                                  <div className='flex items-start space-x-3'>
                                    <div className='w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold'>
                                      {item.quantity}x
                                    </div>
                                    <div>
                                      <p className='font-medium text-gray-900'>
                                        {item.product?.name}
                                      </p>
                                      {item.notes && (
                                        <p className='text-sm text-purple-600 mt-1'>
                                          <span className='font-medium'>
                                            Catatan:
                                          </span>{' '}
                                          {item.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                          <Button
                            className='w-full bg-green-600 hover:bg-green-700'
                            onClick={() => confirmOrder(order.id)}
                            disabled={isUpdating}
                          >
                            <CheckCircle className='w-4 h-4 mr-2' />
                            {isUpdating ? 'Mengonfirmasi...' : 'Terima Pesanan'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      {/* ✅ NEW: Pending Orders (Paid but not confirmed - Online/Takeaway) */}
      {groupedOrders.pending_paid &&
        groupedOrders.pending_paid.length > 0 && (
          <div className='space-y-4' id='pending-paid-orders-section'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Pesanan Baru (Perlu Konfirmasi)
                </h3>
                <Badge className='bg-red-500 text-white'>
                  {groupedOrders.pending_paid.length}
                </Badge>
              </div>
            </div>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {groupedOrders.pending_paid.map(order => {
                const timeAgo = getTimeAgo(order.created_at);
                const isUpdating = updating[order.id];

                return (
                  <Card
                    key={order.id}
                    className='border-2 border-orange-300 bg-orange-50'
                  >
                    <CardHeader>
                      <div className='flex items-start justify-between'>
                        <div>
                          <CardTitle className='text-lg font-bold flex items-center space-x-2'>
                            <span>#{order.order_number}</span>
                            <Badge className='bg-orange-500 text-white'>
                              Sudah Dibayar
                            </Badge>
                          </CardTitle>
                          <CardDescription className='flex items-center space-x-2 mt-1'>
                            <Timer className='w-4 h-4' />
                            <span>{timeAgo}</span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3 mb-4'>
                        {(order.order_items || order.orderItems)?.map((item, idx) => (
                          <div
                            key={idx}
                            className='flex items-start justify-between p-3 bg-white rounded-lg'
                          >
                            <div className='flex items-start space-x-3'>
                              <div className='w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white font-bold'>
                                {item.quantity}x
                              </div>
                              <div>
                                <p className='font-medium text-gray-900'>
                                  {item.product?.name}
                                </p>
                                {item.notes && (
                                  <p className='text-sm text-orange-600 mt-1'>
                                    <span className='font-medium'>Catatan:</span>{' '}
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        className='w-full bg-green-600 hover:bg-green-700'
                        onClick={() => confirmOrder(order.id)}
                        disabled={isUpdating}
                      >
                        <CheckCircle className='w-4 h-4 mr-2' />
                        {isUpdating ? 'Mengonfirmasi...' : 'Terima Pesanan'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

      {/* Active Orders */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900'>Pesanan Aktif</h3>
          <Button
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            disabled={loadingOrders}
            className='flex items-center space-x-2'
            title='Refresh pesanan (Tekan R)'
          >
            <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {loadingOrders ? (
          <div className='flex items-center justify-center py-12'>
            <div className='flex flex-col items-center space-y-3'>
              <RefreshCw className='w-8 h-8 animate-spin text-blue-600' />
              <span className='text-gray-600 font-medium'>Memproses data...</span>
              <p className='text-sm text-gray-500'>Mohon tunggu sebentar</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <Card className='p-8 text-center'>
            <ChefHat className='w-12 h-12 mx-auto text-gray-400 mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              Tidak ada pesanan
            </h3>
            <p className='text-gray-500'>
              Belum ada pesanan yang perlu diproses saat ini.
            </p>
          </Card>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {orders.map(order => {
              const priority = getOrderPriority(order.created_at);
              const timeAgo = getTimeAgo(order.created_at);
              const isUpdating = updating[order.id];

              return (
                <Card
                  key={order.id}
                  className={`border-2 ${
                    priority === 'high'
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <CardHeader>
                    <div className='flex items-start justify-between'>
                      <div>
                        <CardTitle className='text-lg font-bold flex items-center space-x-2'>
                          <span>#{order.order_number}</span>
                          <span className='text-gray-500'>•</span>
                          <span className='text-base font-medium text-gray-600'>
                            {order.table?.name || 'Take Away'}
                          </span>
                        </CardTitle>
                        <CardDescription className='flex items-center space-x-2 mt-1'>
                          <Timer className='w-4 h-4' />
                          <span>{timeAgo}</span>
                        </CardDescription>
                      </div>
                      <div className='flex flex-col items-end space-y-2'>
                        {getPriorityBadge(priority)}
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3 mb-4'>
                      {(order.order_items || order.orderItems)?.map((item, idx) => (
                        <div
                          key={idx}
                          className='flex items-start justify-between p-3 bg-white rounded-lg'
                        >
                          <div className='flex items-start space-x-3'>
                            <div className='w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white font-bold'>
                              {item.quantity}x
                            </div>
                            <div>
                              <p className='font-medium text-gray-900'>
                                {item.product?.name}
                              </p>
                              {item.notes && (
                                <p className='text-sm text-orange-600 mt-1'>
                                  <span className='font-medium'>Catatan:</span>{' '}
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className='flex space-x-2'>
                      {order.status === 'confirmed' && (
                        <Button
                          className='flex-1 bg-blue-600 hover:bg-blue-700'
                          onClick={() =>
                            updateOrderStatus(order.id, 'preparing')
                          }
                          disabled={isUpdating}
                        >
                          <Flame className='w-4 h-4 mr-2' />
                          {isUpdating ? 'Memproses...' : 'Mulai Masak'}
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button
                          className='flex-1 bg-green-600 hover:bg-green-700'
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          disabled={isUpdating}
                        >
                          <CheckCircle className='w-4 h-4 mr-2' />
                          {isUpdating ? 'Memproses...' : 'Tandai Siap'}
                        </Button>
                      )}
                      {order.status === 'ready' && (
                        <div className='flex-1 flex items-center justify-center p-2 bg-green-100 text-green-800 rounded-lg'>
                          <CheckCircle className='w-4 h-4 mr-2' />
                          Siap Diambil
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Kitchen Tips */}
      <Card className='bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200'>
        <CardHeader>
          <CardTitle className='text-lg font-semibold flex items-center'>
            <ChefHat className='w-5 h-5 mr-2 text-orange-600' />
            Tips Dapur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='bg-white/50 rounded-lg p-3'>
              <h4 className='font-medium text-gray-900 mb-2'>
                📍 Informasi Outlet
              </h4>
              <p className='text-sm text-gray-700'>
                <strong>Outlet Aktif:</strong> {currentOutlet?.name}
                <br />
                <strong>Business:</strong> {currentBusiness?.name}
              </p>
            </div>

            <ul className='space-y-2 text-sm text-gray-700'>
              <li className='flex items-start'>
                <CheckCircle className='w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0' />
                <span>
                  Prioritaskan pesanan dengan waktu tunggu yang lebih lama
                </span>
              </li>
              <li className='flex items-start'>
                <CheckCircle className='w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0' />
                <span>
                  Perhatikan catatan khusus dari pelanggan pada setiap pesanan
                </span>
              </li>
              <li className='flex items-start'>
                <CheckCircle className='w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0' />
                <span>
                  Update status pesanan secara real-time agar pelayan tahu kapan
                  siap diantar
                </span>
              </li>
              <li className='flex items-start'>
                <CheckCircle className='w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0' />
                <span>
                  Tekan{' '}
                  <kbd className='px-1 py-0.5 bg-gray-200 rounded text-xs'>
                    R
                  </kbd>{' '}
                  untuk refresh pesanan
                </span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KitchenDashboard;
