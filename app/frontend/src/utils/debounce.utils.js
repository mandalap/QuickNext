// ==========================================
// Debounce & Throttle Utility - Untuk Mencegah Duplicate Requests
// ==========================================

/**
 * Debounce function - Menunda eksekusi sampai tidak ada call baru dalam delay
 * @param {Function} fn - Function yang akan di-debounce
 * @param {number} delay - Delay in ms
 * @returns {Function} - Debounced function
 */
export const debounce = (fn, delay = 300) => {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * Throttle function - Membatasi eksekusi maksimal sekali per delay
 * @param {Function} fn - Function yang akan di-throttle
 * @param {number} delay - Delay in ms
 * @returns {Function} - Throttled function
 */
export const throttle = (fn, delay = 300) => {
  let lastExecTime = 0;
  let timeoutId;

  return function (...args) {
    const currentTime = Date.now();

    if (currentTime - lastExecTime >= delay) {
      // Execute immediately jika sudah cukup lama
      fn.apply(this, args);
      lastExecTime = currentTime;
    } else {
      // Schedule untuk execute setelah delay
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

/**
 * Debounce untuk API calls - Mencegah duplicate requests
 * @param {Function} apiCall - API function
 * @param {number} delay - Delay in ms (default: 500ms)
 * @returns {Function} - Debounced API function
 */
export const debounceApiCall = (apiCall, delay = 500) => {
  const pendingCalls = new Map();

  return async (...args) => {
    // Create unique key dari arguments
    const key = JSON.stringify(args);

    // Jika ada pending call untuk key yang sama, cancel dan buat yang baru
    if (pendingCalls.has(key)) {
      clearTimeout(pendingCalls.get(key));
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        try {
          const result = await apiCall(...args);
          pendingCalls.delete(key);
          resolve(result);
        } catch (error) {
          pendingCalls.delete(key);
          reject(error);
        }
      }, delay);

      pendingCalls.set(key, timeoutId);
    });
  };
};

/**
 * Request deduplication - Mencegah multiple calls dengan params yang sama
 */
export class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Deduplicate request - Jika request dengan key yang sama sedang pending, return promise yang sama
   * @param {string} key - Unique key untuk request
   * @param {Function} fn - Function yang akan di-execute
   * @returns {Promise} - Promise dari request (existing atau baru)
   */
  async deduplicate(key, fn) {
    // Jika ada pending request dengan key yang sama, return promise yang sama
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 Deduplicating request: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Buat promise baru
    const promise = fn()
      .then(result => {
        this.pendingRequests.delete(key);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }

  /**
   * Clear specific request
   */
  clearRequest(key) {
    this.pendingRequests.delete(key);
  }
}

// Singleton instance untuk global deduplication
export const globalDeduplicator = new RequestDeduplicator();
