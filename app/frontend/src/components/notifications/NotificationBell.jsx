import {
  Bell,
  Check,
  CheckCheck,
  DollarSign,
  Package,
  ShoppingCart,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import notificationService from '../../services/notification.service';
import { Badge } from '../ui/badge';

const NotificationBell = () => {
  const { currentBusiness } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const dropdownRef = useRef(null);

  // ✅ FIX: Only fetch when business ID is available
  useEffect(() => {
    if (!currentBusiness?.id) {
      return; // Don't fetch if business ID is not available
    }
    
    fetchUnreadCount();
    // Reduce polling frequency to every 2 minutes to avoid timeout issues
    const interval = setInterval(() => {
      if (currentBusiness?.id) {
        fetchUnreadCount();
      }
    }, 120000); // Poll every 2 minutes
    return () => clearInterval(interval);
  }, [currentBusiness?.id]);

  useEffect(() => {
    if (showDropdown) {
      fetchNotifications();
    }
  }, [showDropdown]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    if (!isEnabled) return;
    
    // ✅ FIX: Check if business ID is available before fetching
    if (!currentBusiness?.id) {
      return; // Don't fetch if business ID is not available
    }

    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Disable notifications after multiple failures
      if (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR') {
        console.warn(
          'Notification service unavailable, disabling notifications'
        );
        setIsEnabled(false);
      } else {
        console.error('Failed to fetch unread count:', error);
      }
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const result = await notificationService.getAll({ per_page: 10 });
      setNotifications(result.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async id => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Failed to mark as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async id => {
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      fetchUnreadCount();
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationConfig = (type, title) => {
    // Check title for payment success
    const isPaymentSuccess =
      title?.toLowerCase().includes('pembayaran berhasil') ||
      title?.toLowerCase().includes('payment success') ||
      type === 'payment_success' ||
      type === 'payment.processed';

    // Check title for new order
    const isNewOrder =
      title?.toLowerCase().includes('order baru') ||
      title?.toLowerCase().includes('new order') ||
      type === 'order_new' ||
      type === 'order_created' ||
      type === 'order.created';

    // Check for stock notifications
    const isStockLow = type === 'stock_low';
    const isOrderReady = type === 'order_ready';

    if (isPaymentSuccess) {
      return {
        icon: DollarSign,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
        badge: {
          label: 'Pembayaran',
          color: 'bg-green-100 text-green-800 border-green-300',
        },
        hoverColor: 'hover:bg-green-100',
      };
    }

    if (isNewOrder) {
      return {
        icon: ShoppingCart,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        badge: {
          label: 'Order Baru',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
        },
        hoverColor: 'hover:bg-blue-100',
      };
    }

    if (isOrderReady) {
      return {
        icon: Package,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        iconColor: 'text-orange-600',
        badge: {
          label: 'Siap',
          color: 'bg-orange-100 text-orange-800 border-orange-300',
        },
        hoverColor: 'hover:bg-orange-100',
      };
    }

    if (isStockLow) {
      return {
        icon: Package,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-600',
        badge: {
          label: 'Stok Menipis',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        },
        hoverColor: 'hover:bg-yellow-100',
      };
    }

    // Default
    return {
      icon: Bell,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      iconColor: 'text-gray-600',
      badge: {
        label: 'Notifikasi',
        color: 'bg-gray-100 text-gray-800 border-gray-300',
      },
      hoverColor: 'hover:bg-gray-100',
    };
  };

  const getNotificationIcon = (type, title) => {
    const config = getNotificationConfig(type, title);
    return config.icon;
  };

  const formatTime = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Don't render if notifications are disabled
  if (!isEnabled) {
    return null;
  }

  return (
    <div className='relative' ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className='relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
      >
        <Bell className='w-6 h-6' />
        {unreadCount > 0 && (
          <span className='absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className='absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] flex flex-col'>
          {/* Header */}
          <div className='px-4 py-3 border-b border-gray-200 flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-gray-900'>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className='text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1'
              >
                <CheckCheck className='w-4 h-4' />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className='overflow-y-auto flex-1'>
            {loading ? (
              <div className='px-4 py-8 text-center text-gray-500'>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className='px-4 py-8 text-center text-gray-500'>
                <Bell className='w-12 h-12 mx-auto mb-2 text-gray-300' />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className='divide-y divide-gray-100'>
                {notifications.map(notification => {
                  const config = getNotificationConfig(
                    notification.type,
                    notification.title
                  );
                  const IconComponent = config.icon;

                  return (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 transition-colors border-l-4 ${
                        !notification.is_read
                          ? `${config.bgColor} ${config.borderColor}`
                          : 'bg-white border-transparent'
                      } ${config.hoverColor}`}
                    >
                      <div className='flex items-start gap-3'>
                        {/* Icon with colored background */}
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center border ${config.borderColor}`}
                        >
                          <IconComponent
                            className={`w-5 h-5 ${config.iconColor}`}
                          />
                        </div>

                        {/* Content */}
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 mb-1'>
                            <p className='text-sm font-medium text-gray-900'>
                              {notification.title}
                            </p>
                            <Badge
                              className={`text-xs px-2 py-0.5 border ${config.badge.color}`}
                            >
                              {config.badge.label}
                            </Badge>
                          </div>
                          <p className='text-sm text-gray-600 mt-1'>
                            {notification.message}
                          </p>
                          <p className='text-xs text-gray-400 mt-1'>
                            {formatTime(notification.created_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className='flex items-center gap-1 flex-shrink-0'>
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className='p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors'
                              title='Mark as read'
                            >
                              <Check className='w-4 h-4' />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className='p-1 text-red-600 hover:bg-red-100 rounded transition-colors'
                            title='Delete'
                          >
                            <X className='w-4 h-4' />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className='px-4 py-3 border-t border-gray-200 text-center'>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Navigate to notifications page if exists
                }}
                className='text-sm text-blue-600 hover:text-blue-700 font-medium'
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
