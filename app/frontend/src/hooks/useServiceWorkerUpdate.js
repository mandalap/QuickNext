import { useState, useEffect } from 'react';

/**
 * Custom hook untuk handle service worker updates
 * 
 * @returns {Object} - { hasUpdate, isUpdating, updateServiceWorker, skipWaiting }
 */
export const useServiceWorkerUpdate = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    let registrationInstance = null;

    const checkForUpdates = async () => {
      if ('serviceWorker' in navigator) {
        try {
          registrationInstance = await navigator.serviceWorker.ready;
          setRegistration(registrationInstance);

          // ✅ FIX: Check for waiting service worker on mount
          if (registrationInstance.waiting) {
            setWaitingWorker(registrationInstance.waiting);
            setHasUpdate(true);
            console.log('🔄 Waiting service worker found on mount');
          }

          // ✅ FIX: Listen for new service worker installing
          registrationInstance.addEventListener('updatefound', () => {
            const newWorker = registrationInstance.installing;
            
            if (newWorker) {
              // ✅ FIX: Set waiting worker immediately when found
              setWaitingWorker(newWorker);
              
              newWorker.addEventListener('statechange', () => {
                console.log(`🔄 Service worker state changed: ${newWorker.state}`);
                
                if (newWorker.state === 'installed') {
                  // New service worker installed and waiting
                  if (navigator.serviceWorker.controller) {
                    // There's a new service worker available
                    setWaitingWorker(newWorker);
                    setHasUpdate(true);
                    console.log('🔄 New service worker available - Update notification will show');
                  } else {
                    // First time installation
                    console.log('✅ Service worker installed for the first time');
                  }
                } else if (newWorker.state === 'activated') {
                  // Service worker activated
                  setHasUpdate(false);
                  setWaitingWorker(null);
                }
              });
            }
          });

          // Listen for controller change (service worker activated)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('✅ Service worker activated');
            setHasUpdate(false);
            setWaitingWorker(null);
            // Reload page to get new version
            window.location.reload();
          });
        } catch (error) {
          console.error('❌ Error checking for service worker updates:', error);
        }
      }
    };

    checkForUpdates();

    // ✅ FIX: Check for updates more frequently (every 5 minutes)
    // This ensures PWA gets updates faster
    const updateInterval = setInterval(() => {
      if (registrationInstance) {
        registrationInstance.update();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes instead of 1 hour

    return () => {
      clearInterval(updateInterval);
    };
  }, []);

  /**
   * Update service worker by skipping waiting
   */
  const updateServiceWorker = async () => {
    if (!waitingWorker) {
      console.warn('⚠️ No waiting service worker found');
      return;
    }

    setIsUpdating(true);

    try {
      // Send skip waiting message to waiting service worker
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      
      console.log('🔄 Service worker update initiated');
    } catch (error) {
      console.error('❌ Error updating service worker:', error);
      setIsUpdating(false);
    }
  };

  /**
   * Skip waiting and activate new service worker immediately
   */
  const skipWaiting = async () => {
    if (!waitingWorker) {
      return;
    }

    try {
      // Send skip waiting message
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait a bit for the message to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reload page
      window.location.reload();
    } catch (error) {
      console.error('❌ Error skipping waiting:', error);
    }
  };

  return {
    hasUpdate,
    isUpdating,
    updateServiceWorker,
    skipWaiting,
  };
};

