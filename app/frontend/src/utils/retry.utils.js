// ==========================================
// Retry Utility - Exponential Backoff untuk Network Failures
// ==========================================

/**
 * Retry function dengan exponential backoff
 * @param {Function} fn - Function yang akan di-retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {number} options.multiplier - Delay multiplier (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if should retry (default: retry on any error)
 * @returns {Promise} - Promise dengan hasil atau error setelah semua retry
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    multiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      // Jika berhasil, return result
      if (attempt > 0) {
        console.log(`✅ Retry successful after ${attempt} attempts`);
      }
      return result;
    } catch (error) {
      lastError = error;

      // Check jika harus retry
      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      // Jika sudah max retries, throw error
      if (attempt >= maxRetries) {
        console.warn(`❌ Max retries (${maxRetries}) reached, giving up`);
        throw lastError;
      }

      // Calculate next delay dengan exponential backoff
      const nextDelay = Math.min(delay * multiplier, maxDelay);

      console.warn(
        `⚠️ Attempt ${
          attempt + 1
        }/${maxRetries} failed, retrying in ${nextDelay}ms...`,
        error.message
      );

      // Wait sebelum retry
      await new Promise(resolve => setTimeout(resolve, nextDelay));
      delay = nextDelay;
    }
  }

  throw lastError;
};

/**
 * Retry untuk network errors saja (timeout, network error, 5xx)
 * @param {Function} fn - Function yang akan di-retry
 * @param {Object} options - Retry options
 */
export const retryNetworkErrors = async (fn, options = {}) => {
  return retryWithBackoff(fn, {
    ...options,
    shouldRetry: (error, attempt) => {
      // Retry hanya untuk network errors
      const isNetworkError =
        error.code === 'ECONNABORTED' || // Timeout
        error.code === 'ERR_NETWORK' || // Network error
        error.message?.includes('timeout') ||
        error.message?.includes('Network Error') ||
        (error.response?.status >= 500 && error.response?.status < 600); // 5xx errors

      // Jangan retry untuk 4xx errors (client errors)
      const isClientError =
        error.response?.status >= 400 && error.response?.status < 500;

      return isNetworkError && !isClientError;
    },
  });
};

/**
 * Retry untuk critical operations (lebih banyak retries)
 * @param {Function} fn - Function yang akan di-retry
 * @param {Object} options - Retry options
 */
export const retryCritical = async (fn, options = {}) => {
  return retryWithBackoff(fn, {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 20000,
    multiplier: 2,
    ...options,
  });
};

/**
 * Quick retry untuk non-critical operations (lebih sedikit retries)
 * @param {Function} fn - Function yang akan di-retry
 * @param {Object} options - Retry options
 */
export const retryQuick = async (fn, options = {}) => {
  return retryWithBackoff(fn, {
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 3000,
    multiplier: 1.5,
    ...options,
  });
};
