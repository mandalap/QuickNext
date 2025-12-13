/**
 * Utility untuk clear semua data (cookies, localStorage, sessionStorage)
 * Digunakan untuk development/testing atau reset aplikasi
 */

/**
 * Clear semua data dari browser
 * @param {boolean} includeCookies - Clear cookies juga (default: true)
 * @param {boolean} includeCache - Clear cache juga (default: true)
 * @returns {object} Report of what was cleared
 */
export const clearAllData = (includeCookies = true, includeCache = true) => {
  const report = {
    localStorage: [],
    sessionStorage: [],
    cookies: [],
    cache: [],
    errors: [],
  };

  try {
    // 1. Clear localStorage
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        report.localStorage.push(key);
      } catch (error) {
        report.errors.push(`Failed to remove localStorage key "${key}": ${error.message}`);
      }
    });

    // 2. Clear sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        report.sessionStorage.push(key);
      } catch (error) {
        report.errors.push(`Failed to remove sessionStorage key "${key}": ${error.message}`);
      }
    });

    // 3. Clear cookies
    if (includeCookies) {
      try {
        // Get all cookies
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          
          // Clear cookie for current domain
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
          
          report.cookies.push(name);
        });
      } catch (error) {
        report.errors.push(`Failed to clear cookies: ${error.message}`);
      }
    }

    // 4. Clear cache (from cache.utils)
    if (includeCache) {
      try {
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
          if (key.startsWith('cache_') || key.includes('business') || key.includes('kasir_pos_cache_')) {
            try {
              localStorage.removeItem(key);
              report.cache.push(key);
            } catch (error) {
              report.errors.push(`Failed to remove cache key "${key}": ${error.message}`);
            }
          }
        });
      } catch (error) {
        report.errors.push(`Failed to clear cache: ${error.message}`);
      }
    }

    console.log('✅ All data cleared successfully!', report);
    return report;
  } catch (error) {
    report.errors.push(`Fatal error: ${error.message}`);
    console.error('❌ Error clearing data:', error);
    return report;
  }
};

/**
 * Clear specific data by pattern
 * @param {string} pattern - Pattern to match (e.g., 'business', 'token', 'user')
 * @returns {object} Report of what was cleared
 */
export const clearDataByPattern = (pattern) => {
  const report = {
    cleared: [],
    errors: [],
  };

  try {
    // Clear from localStorage
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
      if (key.toLowerCase().includes(pattern.toLowerCase())) {
        try {
          localStorage.removeItem(key);
          report.cleared.push(`localStorage: ${key}`);
        } catch (error) {
          report.errors.push(`Failed to remove "${key}": ${error.message}`);
        }
      }
    });

    // Clear from sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      if (key.toLowerCase().includes(pattern.toLowerCase())) {
        try {
          sessionStorage.removeItem(key);
          report.cleared.push(`sessionStorage: ${key}`);
        } catch (error) {
          report.errors.push(`Failed to remove "${key}": ${error.message}`);
        }
      }
    });

    console.log(`✅ Data matching pattern "${pattern}" cleared!`, report);
    return report;
  } catch (error) {
    report.errors.push(`Fatal error: ${error.message}`);
    console.error('❌ Error clearing data:', error);
    return report;
  }
};

/**
 * Clear auth-related data only
 * @returns {object} Report of what was cleared
 */
export const clearAuthData = () => {
  const authKeys = [
    'token',
    'user',
    'userId',
    'businesses',
    'currentBusiness',
    'currentBusinessId',
    'currentOutletId',
    'hasActiveSubscription',
  ];

  const report = {
    cleared: [],
    errors: [],
  };

  authKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      report.cleared.push(key);
    } catch (error) {
      report.errors.push(`Failed to remove "${key}": ${error.message}`);
    }
  });

  // Clear cookies
  try {
    document.cookie = 'auth_token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    report.cleared.push('auth_token cookie');
  } catch (error) {
    report.errors.push(`Failed to clear auth_token cookie: ${error.message}`);
  }

  console.log('✅ Auth data cleared!', report);
  return report;
};

/**
 * Show current stored data (for debugging)
 * @returns {object} Current data in storage
 */
export const showStoredData = () => {
  const data = {
    localStorage: {},
    sessionStorage: {},
    cookies: document.cookie.split(';').map(c => c.trim()),
  };

  // Get all localStorage
  Object.keys(localStorage).forEach(key => {
    try {
      const value = localStorage.getItem(key);
      // Try to parse JSON, if fails, use raw value
      try {
        data.localStorage[key] = JSON.parse(value);
      } catch {
        data.localStorage[key] = value;
      }
    } catch (error) {
      data.localStorage[key] = `[Error reading: ${error.message}]`;
    }
  });

  // Get all sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    try {
      const value = sessionStorage.getItem(key);
      try {
        data.sessionStorage[key] = JSON.parse(value);
      } catch {
        data.sessionStorage[key] = value;
      }
    } catch (error) {
      data.sessionStorage[key] = `[Error reading: ${error.message}]`;
    }
  });

  console.table(data.localStorage);
  console.table(data.sessionStorage);
  console.log('Cookies:', data.cookies);
  
  return data;
};

// Export untuk digunakan di console
if (typeof window !== 'undefined') {
  window.clearAllData = clearAllData;
  window.clearDataByPattern = clearDataByPattern;
  window.clearAuthData = clearAuthData;
  window.showStoredData = showStoredData;
  
  console.log('🧹 Clear Data Utilities loaded!');
  console.log('Available functions:');
  console.log('  - clearAllData() - Clear all data');
  console.log('  - clearAuthData() - Clear auth data only');
  console.log('  - clearDataByPattern("business") - Clear data by pattern');
  console.log('  - showStoredData() - Show current stored data');
}

export default {
  clearAllData,
  clearDataByPattern,
  clearAuthData,
  showStoredData,
};

