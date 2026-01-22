// ==========================================
// 4. src/utils/errorHandler.js
// ==========================================
import { API_CONFIG } from '../config/api.config';

export const handleApiError = error => {
  console.log('🔍 Error details:', {
    hasResponse: !!error.response,
    hasRequest: !!error.request,
    message: error.message,
    response: error.response?.data,
    status: error.response?.status,
  });

  if (error.response) {
    const { data, status } = error.response;

    // Laravel validation errors
    if (status === 422 && data.errors) {
      const validationErrors = Object.values(data.errors).flat();
      console.log('⚠️ Validation errors:', validationErrors);
      return {
        success: false,
        error: validationErrors.join(', '),
        errors: data.errors,
        status,
      };
    }

    // Business ID missing error
    if (
      status === 400 &&
      data.message &&
      (data.message.includes('Business ID') || data.message.includes('Business ID required'))
    ) {
      console.error('❌ Business ID error:', data.message);
      
      // ✅ FIX: Try to reload business from AuthContext if available
      // This will be handled by the component that receives this error
      return {
        success: false,
        error: 'Business ID tidak ditemukan. Silakan pilih business atau login ulang.',
        message: 'Business ID tidak ditemukan. Silakan pilih business atau login ulang.',
        status,
        requires_business_reload: true, // Flag untuk trigger business reload
      };
    }

    const errorMessage =
      data.message || data.error || 'Terjadi kesalahan pada server';
    
    // ✅ FIX: Jangan log subscription limit error sebagai error (403)
    // Ini adalah expected behavior, bukan error yang perlu di-log
    if (status === 403 && data.error === 'subscription_limit_reached') {
      console.log('⚠️ Subscription limit reached:', errorMessage);
    } else {
      console.error('❌ Server error:', errorMessage);
    }
    
    // ✅ NEW: Preserve requires_attendance flag and other metadata from backend
    return {
      success: false,
      error: errorMessage,
      message: errorMessage, // Also include as 'message' for consistency
      requires_attendance: data.requires_attendance || false,
      status,
      ...data, // Include all other data from backend response
    };
  }

  if (error.request) {
    // ✅ FIX: Only log network errors in development and not for cancelled requests
    if (process.env.NODE_ENV === 'development' && !error.message?.includes('cancelled')) {
      // Use console.log instead of console.error to reduce noise
      console.log('⚠️ Network error: Tidak dapat terhubung ke server');
      console.log('🔍 Backend URL:', API_CONFIG?.BASE_URL || 'http://localhost:8000/api');
      console.log('💡 Pastikan backend Laravel berjalan: php artisan serve');
    }
    
    // ✅ FIX: More helpful error message
    const backendUrl = API_CONFIG?.BASE_URL || 'http://localhost:8000/api';
    return {
      success: false,
      error:
        'Tidak dapat terhubung ke server. Pastikan server backend berjalan.',
      message: `Tidak dapat terhubung ke ${backendUrl}. Pastikan backend Laravel berjalan dengan perintah: php artisan serve`,
      isNetworkError: true,
      backendUrl,
    };
  }

  // ✅ FIX: Ignore cancelled requests (intentional cancellation for duplicate prevention)
  if (
    error.message &&
    (error.message.includes('cancelled') ||
      error.message.includes('canceled') ||
      error.message === 'Duplicate request cancelled')
  ) {
    // Silently ignore cancelled requests
    return {
      success: false,
      error: null, // Mark as cancelled, not a real error
      cancelled: true,
    };
  }

  // ✅ FIX: Only log if it's not a cancelled request or timeout
  const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
  const isCancelled = error.message?.includes('cancelled') || error.message?.includes('canceled');
  
  if (!isCancelled && !isTimeout && process.env.NODE_ENV === 'development') {
    // Use console.log instead of console.error for less noise
    console.log('⚠️ Unknown error:', error.message);
  }
  return {
    success: false,
    error: error.message || 'Terjadi kesalahan',
  };
};
