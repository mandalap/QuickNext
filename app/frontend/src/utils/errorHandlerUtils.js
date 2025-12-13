// ==========================================
// Error Handler Utilities
// ==========================================
import axios from 'axios';

/**
 * Check if error is a network error
 */
export const isNetworkError = (error) => {
  return (
    !error.response &&
    error.request &&
    (error.code === 'ECONNABORTED' ||
      error.message?.includes('timeout') ||
      error.message?.includes('Network Error') ||
      error.message?.includes('Failed to fetch'))
  );
};

/**
 * Check if error is a timeout error
 */
export const isTimeoutError = (error) => {
  return (
    error.code === 'ECONNABORTED' ||
    error.message?.includes('timeout') ||
    error.message?.includes('aborted')
  );
};

/**
 * Check if error is a cancelled request
 */
export const isCancelledError = (error) => {
  // Check if axios is available and has isCancel method
  let isAxiosCancel = false;
  try {
    // Try to import axios dynamically if not already imported
    if (typeof axios !== 'undefined' && axios.isCancel) {
      isAxiosCancel = axios.isCancel(error);
    }
  } catch (e) {
    // Ignore if axios not available
  }
  
  return (
    error.message?.includes('cancelled') ||
    error.message?.includes('canceled') ||
    error.name === 'CanceledError' ||
    isAxiosCancel
  );
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error) => {
  // Network errors
  if (isNetworkError(error)) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  }

  // Timeout errors
  if (isTimeoutError(error)) {
    return 'Request timeout. Server mungkin sedang sibuk, silakan coba lagi.';
  }

  // Cancelled requests (not real errors)
  if (isCancelledError(error)) {
    return null; // Don't show error for cancelled requests
  }

  // Server errors
  if (error.response) {
    const { status, data } = error.response;

    // Validation errors
    if (status === 422 && data.errors) {
      const validationErrors = Object.values(data.errors).flat();
      return validationErrors.join(', ');
    }

    // Business ID error
    if (
      status === 400 &&
      data.message &&
      (data.message.includes('Business ID') ||
        data.message.includes('Business ID required'))
    ) {
      return 'Business ID tidak ditemukan. Silakan pilih business atau login ulang.';
    }

    // Unauthorized
    if (status === 401) {
      return 'Session expired. Silakan login kembali.';
    }

    // Forbidden
    if (status === 403) {
      return data.message || 'Anda tidak memiliki izin untuk melakukan aksi ini.';
    }

    // Not found
    if (status === 404) {
      return 'Data tidak ditemukan.';
    }

    // Server error
    if (status >= 500) {
      return 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
    }

    // Default server error message
    return (
      data.message ||
      data.error ||
      `Terjadi kesalahan (${status}). Silakan coba lagi.`
    );
  }

  // Unknown errors
  return error.message || 'Terjadi kesalahan. Silakan coba lagi.';
};

/**
 * Log error with appropriate level
 */
export const logError = (error, context = '') => {
  const isNetwork = isNetworkError(error);
  const isTimeout = isTimeoutError(error);
  const isCancelled = isCancelledError(error);

  // Don't log cancelled requests
  if (isCancelled) {
    return;
  }

  // Only log network/timeout errors in development
  if ((isNetwork || isTimeout) && process.env.NODE_ENV !== 'development') {
    return;
  }

  const errorInfo = {
    context,
    message: error.message,
    name: error.name,
    code: error.code,
    status: error.response?.status,
    url: error.config?.url,
    isNetwork,
    isTimeout,
  };

  if (isNetwork || isTimeout) {
    console.warn('⚠️ Network/Timeout Error:', errorInfo);
  } else {
    console.error('❌ Error:', errorInfo);
  }
};

/**
 * Handle API error with retry logic
 */
export const handleApiErrorWithRetry = async (
  apiCall,
  maxRetries = 3,
  retryDelay = 1000
) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      // Don't retry for certain errors
      if (
        error.response?.status === 401 ||
        error.response?.status === 403 ||
        error.response?.status === 404 ||
        isCancelledError(error)
      ) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retry (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Create timeout promise
 */
export const createTimeoutPromise = (timeoutMs, message = 'Request timeout') => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });
};

/**
 * Race between promise and timeout
 */
export const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  const timeoutPromise = createTimeoutPromise(timeoutMs, timeoutMessage);
  return Promise.race([promise, timeoutPromise]);
};
