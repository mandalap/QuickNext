import { useState, useEffect } from 'react';

/**
 * Custom hook untuk handle PWA install prompt
 * 
 * @returns {Object} - { isInstallable, isInstalled, installPrompt, promptInstall }
 */
export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      // Check if running as standalone (installed)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      
      // Check if running in standalone mode (iOS)
      if (window.navigator.standalone === true) {
        setIsInstalled(true);
        return true;
      }
      
      // Check if app is installed (Android Chrome)
      if (window.matchMedia('(display-mode: fullscreen)').matches) {
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    // Check on mount
    setIsInstalled(checkInstalled());

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Save the event so it can be triggered later
      setInstallPrompt(e);
      setIsInstallable(true);
      
      console.log('✅ PWA Install prompt available');
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      console.log('✅ PWA was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Trigger the install prompt
   * @returns {Promise<boolean>} - Returns true if user accepted, false if dismissed
   */
  const promptInstall = async () => {
    if (!installPrompt) {
      console.warn('⚠️ Install prompt not available');
      return false;
    }

    try {
      // Show the install prompt
      const result = await installPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await installPrompt.userChoice;
      
      console.log(`User response to install prompt: ${outcome}`);
      
      // Clear the prompt
      setInstallPrompt(null);
      setIsInstallable(false);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('❌ Error showing install prompt:', error);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    installPrompt,
    promptInstall,
  };
};

