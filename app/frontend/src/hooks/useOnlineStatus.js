import { useState, useEffect } from 'react';

/**
 * Custom hook untuk track online/offline status
 * 
 * @returns {Object} - { isOnline, wasOffline }
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('✅ Connection restored');
      
      // Set wasOffline to true temporarily to show reconnection message
      setWasOffline(true);
      setTimeout(() => {
        setWasOffline(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      console.log('⚠️ Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    wasOffline,
  };
};

