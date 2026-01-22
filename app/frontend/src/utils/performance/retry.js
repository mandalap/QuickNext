/**
 * Retry utility with exponential backoff
 * Automatically retries failed API calls with increasing delays
 */

/**
 * Sleep utility for delays
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @param {number} maxDelay - Maximum delay in ms (default: 30000)
 */
const calculateBackoffDelay = (attempt, baseDelay = 1000, maxDelay = 30000) => {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
  return Math.min(exponentialDelay + jitter, maxDelay);
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 30000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried
 * @param {Function} options.onRetry - Callback on each retry
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = defaultShouldRetry,
    onRetry = null,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay and wait before retry
      const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);

      console.log(
        `⚠️ Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay / 1000)}s...`,
        error.message
      );

      if (onRetry) {
        onRetry(attempt, delay, error);
      }

      await sleep(delay);
    }
  }

  throw lastError;
};

/**
 * Default function to determine if an error should be retried
 * Retries network errors and 5xx server errors, but not 4xx client errors
 */
const defaultShouldRetry = (error, attempt) => {
  // Don't retry if no response (network error) - these should be retried
  if (!error.response) {
    return true;
  }

  const status = error.response?.status;

  // Retry 5xx server errors
  if (status >= 500 && status < 600) {
    return true;
  }

  // Retry 429 (Too Many Requests) with backoff
  if (status === 429) {
    return true;
  }

  // Retry timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return true;
  }

  // Don't retry 4xx client errors (except 429)
  if (status >= 400 && status < 500) {
    return false;
  }

  return false;
};

/**
 * Wrap an async function with retry logic
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Retry options
 */
export const withRetry = (fn, options = {}) => {
  return async (...args) => {
    return retryWithBackoff(() => fn(...args), options);
  };
};

/**
 * Retry hook for React Query
 * Can be used in queryClient defaultOptions
 */
export const queryRetryConfig = {
  retry: (failureCount, error) => {
    // Don't retry on 4xx errors (except 429)
    const status = error?.response?.status;
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }

    // Retry up to 3 times
    return failureCount < 3;
  },
  retryDelay: attemptIndex => {
    return calculateBackoffDelay(attemptIndex, 1000, 10000);
  },
};

export default retryWithBackoff;
