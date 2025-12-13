import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook untuk handle Push Notifications di PWA
 *
 * @returns {Object} - {
 *   isSupported,
 *   permission,
 *   isSubscribed,
 *   subscription,
 *   requestPermission,
 *   subscribe,
 *   unsubscribe
 * }
 */
export const usePushNotification = () => {
  const { user, currentBusiness } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      setIsSupported(supported);

      if (supported) {
        // Check current permission
        if ('Notification' in window) {
          setPermission(Notification.permission);
        }

        // Check if already subscribed
        checkSubscription();
      }
    };

    checkSupport();
  }, []);

  // Check existing subscription
  const checkSubscription = useCallback(async () => {
    if (!isSupported || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        setSubscription(sub);
        setIsSubscribed(true);
        console.log('✅ Push notification subscription found');
      } else {
        setIsSubscribed(false);
        setSubscription(null);
      }
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      setIsSubscribed(false);
      setSubscription(null);
    }
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      console.log('✅ Notification permission:', result);
      return result === 'granted';
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      return false;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !user || !currentBusiness) {
      console.warn('⚠️ Cannot subscribe: Missing requirements');
      return false;
    }

    setIsLoading(true);

    try {
      // 1. Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        console.warn('⚠️ Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // 2. Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // 3. Subscribe to push manager
      // ✅ FIX: Check if VAPID key is available
      const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('❌ VAPID_PUBLIC_KEY not found in environment variables');
        toast.error(
          'Push notification tidak dapat diaktifkan: VAPID key tidak ditemukan'
        );
        setIsLoading(false);
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setSubscription(subscription);
      setIsSubscribed(true);

      // 4. Send subscription to backend
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
        user_id: user.id,
        business_id: currentBusiness.id,
      };

      const response = await apiClient.post(
        '/v1/notifications/subscribe',
        subscriptionData
      );

      if (response.data.success) {
        console.log('✅ Push notification subscription saved to backend');
        setIsLoading(false);
        return true;
      } else {
        console.error('❌ Failed to save subscription to backend');
        // Unsubscribe if backend save failed
        await subscription.unsubscribe();
        setSubscription(null);
        setIsSubscribed(false);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('❌ Error subscribing to push notifications:', error);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, user, currentBusiness, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      console.warn('⚠️ No subscription to unsubscribe');
      return false;
    }

    setIsLoading(true);

    try {
      // 1. Unsubscribe from push manager
      const successful = await subscription.unsubscribe();

      if (successful) {
        // 2. Remove from backend
        await apiClient.post('/v1/notifications/unsubscribe', {
          endpoint: subscription.endpoint,
          user_id: user?.id,
        });

        setSubscription(null);
        setIsSubscribed(false);
        console.log('✅ Unsubscribed from push notifications');
        setIsLoading(false);
        return true;
      } else {
        console.error('❌ Failed to unsubscribe');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('❌ Error unsubscribing:', error);
      setIsLoading(false);
      return false;
    }
  }, [subscription, user]);

  // Re-check subscription when user or business changes
  useEffect(() => {
    if (user && currentBusiness && isSupported) {
      checkSubscription();
    }
  }, [user, currentBusiness, isSupported, checkSubscription]);

  // ✅ AUTO-SUBSCRIBE: Auto-subscribe to push notifications after login (if permission granted)
  useEffect(() => {
    const autoSubscribe = async () => {
      // Only auto-subscribe if:
      // 1. Push notifications are supported
      // 2. User is logged in
      // 3. Business is selected
      // 4. Permission is already granted (don't prompt automatically)
      // 5. Not already subscribed
      if (
        isSupported &&
        user &&
        currentBusiness &&
        permission === 'granted' &&
        !isSubscribed &&
        !isLoading
      ) {
        console.log('🔄 Auto-subscribing to push notifications...');
        try {
          await subscribe();
          console.log('✅ Auto-subscribed to push notifications');
        } catch (error) {
          console.warn('⚠️ Auto-subscribe failed:', error);
          // Don't show error toast for auto-subscribe (non-intrusive)
        }
      }
    };

    // Delay auto-subscribe slightly to avoid blocking initial render
    const timeoutId = setTimeout(autoSubscribe, 2000);
    return () => clearTimeout(timeoutId);
  }, [isSupported, user, currentBusiness, permission, isSubscribed, isLoading, subscribe]);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
};

// Helper: Convert VAPID key from base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper: Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
