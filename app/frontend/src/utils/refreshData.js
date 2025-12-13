/**
 * Utility untuk refresh semua data setelah upgrade atau perubahan subscription
 * Bisa dipanggil tanpa perlu uninstall/reinstall app
 */

import { businessService } from '../services/business.service';
import outletService from '../services/outlet.service';
import apiClient from '../utils/apiClient';
import { CACHE_KEYS, removeCache, clearAllCache as clearCacheUtils } from '../utils/cache.utils';

/**
 * Clear semua cache yang terkait dengan subscription, business, dan outlet
 */
export const clearAllCache = () => {
  console.log('🧹 Clearing all cache...');
  
  // Clear subscription cache
  localStorage.removeItem('hasActiveSubscription');
  localStorage.removeItem('subscription');
  localStorage.removeItem('subscriptionFeatures'); // ✅ NEW: Clear subscription features cache
  
  // Clear business cache
  localStorage.removeItem('businesses');
  localStorage.removeItem('currentBusiness');
  localStorage.removeItem('currentBusinessId');
  
  // Clear outlet cache
  localStorage.removeItem('outlets');
  localStorage.removeItem('currentOutlet');
  localStorage.removeItem('currentOutletId');
  
  // ✅ FIX: Clear PWA install prompt dismissal preference
  // Agar install prompt muncul lagi setelah reload/update
  localStorage.removeItem('pwa_install_dismissed');
  localStorage.removeItem('pwa_install_dismissed_expiry');
  
  // ✅ FIX: Clear cache utils cache (business service cache)
  try {
    removeCache(CACHE_KEYS.BUSINESSES);
    removeCache(CACHE_KEYS.CURRENT_BUSINESS);
    // Also clear all cache utils
    clearCacheUtils();
  } catch (e) {
    console.warn('Error clearing cache utils:', e);
  }
  
  console.log('✅ All cache cleared');
};

/**
 * Refresh subscription status dari API
 */
export const refreshSubscription = async () => {
  try {
    console.log('🔄 Refreshing subscription status...');
    const response = await apiClient.get('/v1/subscriptions/current');
    
    if (response.data.success && response.data.data) {
      const subscription = response.data.data;
      const isActive = subscription.status === 'active' || subscription.status === 'trial';
      
      // Update cache
      localStorage.setItem('hasActiveSubscription', isActive ? 'true' : 'false');
      localStorage.setItem('subscription', JSON.stringify(subscription));
      
      // ✅ NEW: Update subscription features cache
      if (response.data.plan_features) {
        localStorage.setItem('subscriptionFeatures', JSON.stringify(response.data.plan_features));
        console.log('✅ Subscription features refreshed:', response.data.plan_features);
      }
      
      console.log('✅ Subscription refreshed:', {
        status: subscription.status,
        plan: subscription.subscription_plan?.name,
        isActive,
        planFeatures: response.data.plan_features
      });
      
      return {
        success: true,
        subscription,
        isActive,
        planFeatures: response.data.plan_features
      };
    }
    
    return {
      success: false,
      isActive: false
    };
  } catch (error) {
    console.error('❌ Error refreshing subscription:', error);
    return {
      success: false,
      isActive: false,
      error: error.message
    };
  }
};

/**
 * Refresh business data dari API
 */
export const refreshBusinesses = async () => {
  try {
    console.log('🔄 Refreshing businesses...');
    // ✅ FIX: Force refresh without cache to get latest subscription_info
    const result = await businessService.getAll(false);
    
    if (result.success && result.data && result.data.length > 0) {
      // Update cache
      localStorage.setItem('businesses', JSON.stringify(result.data));
      
      // Auto-select first business if no current business
      const currentBusinessId = localStorage.getItem('currentBusinessId');
      let currentBusiness = result.data.find(b => b.id === parseInt(currentBusinessId));
      
      if (!currentBusiness && result.data.length > 0) {
        currentBusiness = result.data[0];
        localStorage.setItem('currentBusinessId', currentBusiness.id);
        localStorage.setItem('currentBusiness', JSON.stringify(currentBusiness));
      } else if (currentBusiness) {
        localStorage.setItem('currentBusiness', JSON.stringify(currentBusiness));
      }
      
      console.log('✅ Businesses refreshed:', result.data.length);
      
      return {
        success: true,
        businesses: result.data,
        currentBusiness
      };
    }
    
    return {
      success: false,
      businesses: []
    };
  } catch (error) {
    console.error('❌ Error refreshing businesses:', error);
    return {
      success: false,
      businesses: [],
      error: error.message
    };
  }
};

/**
 * Refresh outlet data dari API
 */
export const refreshOutlets = async (businessId = null) => {
  try {
    console.log('🔄 Refreshing outlets...');
    
    const businessIdToUse = businessId || localStorage.getItem('currentBusinessId');
    if (!businessIdToUse) {
      console.warn('⚠️ No business ID, skipping outlet refresh');
      return {
        success: false,
        outlets: []
      };
    }
    
    const result = await outletService.getAll();
    
    if (result.success && result.data && result.data.length > 0) {
      // Update cache
      localStorage.setItem('outlets', JSON.stringify(result.data));
      
      // Auto-select first outlet if no current outlet
      const currentOutletId = localStorage.getItem('currentOutletId');
      let currentOutlet = result.data.find(o => o.id === parseInt(currentOutletId));
      
      if (!currentOutlet && result.data.length > 0) {
        currentOutlet = result.data[0];
        localStorage.setItem('currentOutletId', currentOutlet.id);
        localStorage.setItem('currentOutlet', JSON.stringify(currentOutlet));
      } else if (currentOutlet) {
        localStorage.setItem('currentOutlet', JSON.stringify(currentOutlet));
      }
      
      console.log('✅ Outlets refreshed:', result.data.length);
      
      return {
        success: true,
        outlets: result.data,
        currentOutlet
      };
    }
    
    return {
      success: false,
      outlets: []
    };
  } catch (error) {
    console.error('❌ Error refreshing outlets:', error);
    return {
      success: false,
      outlets: [],
      error: error.message
    };
  }
};

/**
 * Refresh semua data (subscription, business, outlet)
 * Dipanggil setelah upgrade atau perubahan subscription
 */
export const refreshAllData = async () => {
  console.log('🔄 Refreshing all data...');
  
  try {
    // 1. Clear cache dulu
    clearAllCache();
    
    // 2. Refresh subscription
    const subscriptionResult = await refreshSubscription();
    
    // 3. Refresh businesses
    const businessResult = await refreshBusinesses();
    
    // 4. Refresh outlets (jika ada business)
    let outletResult = { success: false, outlets: [] };
    if (businessResult.currentBusiness) {
      outletResult = await refreshOutlets(businessResult.currentBusiness.id);
    }
    
    console.log('✅ All data refreshed:', {
      subscription: subscriptionResult.success,
      businesses: businessResult.success,
      outlets: outletResult.success
    });
    
    return {
      success: true,
      subscription: subscriptionResult,
      businesses: businessResult,
      outlets: outletResult
    };
  } catch (error) {
    console.error('❌ Error refreshing all data:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Reload halaman setelah refresh data
 */
export const refreshAndReload = async () => {
  await refreshAllData();
  // Small delay untuk ensure cache ter-update
  await new Promise(resolve => setTimeout(resolve, 500));
  window.location.reload();
};

