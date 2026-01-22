import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';
import axios from 'axios';

/**
 * Attendance Service
 * Handles all attendance/employee shift API calls
 */
export const attendanceService = {
  /**
   * Get employee shifts/attendance records
   * @param {Object} params - Query parameters
   * @param {string} params.start_date - Start date (YYYY-MM-DD)
   * @param {string} params.end_date - End date (YYYY-MM-DD)
   * @param {string} params.date - Specific date (YYYY-MM-DD)
   * @param {string} params.status - Filter by status (scheduled, ongoing, completed, absent, late)
   * @param {number} params.user_id - Filter by user ID (admin only)
   * @returns {Promise<Object>} Attendance records
   */
  getShifts: async (params = {}) => {
    try {
      console.log('📊 Fetching attendance shifts with params:', params);
      // ✅ FIX: Increase timeout for shifts query (15 seconds)
      const response = await apiClient.get('/v1/attendance/shifts', { 
        params,
        timeout: 15000 // 15 seconds timeout for shifts
      });
      console.log('✅ Attendance shifts response:', response.data);
      return response.data;
    } catch (error) {
      // Ignore cancelled errors (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.message?.includes('cancelled') || error.message?.includes('canceled');
      if (!isCanceled) {
        console.error('❌ Error fetching attendance shifts:', error);
      }
      throw error;
    }
  },

  /**
   * Get today's shift for current user
   * @returns {Promise<Object>} Today's shift data
   */
  getTodayShift: async () => {
    try {
      console.log('📊 Fetching today shift');
      const response = await apiClient.get('/v1/attendance/today');
      console.log('✅ Today shift response:', response.data);
      return response.data;
    } catch (error) {
      // Ignore cancelled errors (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.message?.includes('cancelled') || error.message?.includes('canceled');
      if (!isCanceled) {
        console.error('❌ Error fetching today shift:', error);
      }
      throw error;
    }
  },

  /**
   * Get attendance statistics
   * @param {Object} params - Query parameters
   * @param {string} params.start_date - Start date (YYYY-MM-DD)
   * @param {string} params.end_date - End date (YYYY-MM-DD)
   * @param {number} params.user_id - Filter by user ID (admin only)
   * @returns {Promise<Object>} Attendance statistics
   */
  getStats: async (params = {}) => {
    try {
      console.log('📊 Fetching attendance stats with params:', params);
      // ✅ FIX: Increase timeout for stats query (15 seconds)
      const response = await apiClient.get('/v1/attendance/stats', { 
        params,
        timeout: 30000 // 30 seconds timeout for stats (increased for slow connections)
      });
      console.log('✅ Attendance stats response:', response.data);
      return response.data;
    } catch (error) {
      // Ignore cancelled errors (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.message?.includes('cancelled') || error.message?.includes('canceled');
      if (!isCanceled) {
        // ✅ FIX: Only log error if not timeout (to avoid spam)
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        if (!isTimeout) {
          console.error('❌ Error fetching attendance stats:', error);
        }
        // ✅ FIX: Return error object with success: false for consistent error handling
        const errorResult = handleApiError(error);
        // Return in format that Attendance.jsx expects: { success: false, data: null }
        return { success: false, ...errorResult, data: null };
      }
      // For cancelled errors, return null to indicate no data (non-critical)
      return null;
    }
  },

  /**
   * Clock in (check in)
   * @param {Object} data - Clock in data
   * @param {string} data.shift_date - Shift date (YYYY-MM-DD)
   * @param {string} data.start_time - Shift start time (HH:mm)
   * @param {string} data.end_time - Shift end time (HH:mm)
   * @param {number} data.latitude - GPS latitude
   * @param {number} data.longitude - GPS longitude
   * @param {string} data.notes - Optional notes
   * @returns {Promise<Object>} Clock in result
   */
  clockIn: async (data) => {
    try {
      console.log('📊 Clocking in:', data);
      const response = await apiClient.post('/v1/attendance/clock-in', data);
      console.log('✅ Clock in response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error clocking in:', error);
      throw error;
    }
  },

  /**
   * Clock out (check out)
   * @param {number} shiftId - Shift ID
   * @param {Object} data - Clock out data
   * @param {number} data.latitude - GPS latitude
   * @param {number} data.longitude - GPS longitude
   * @param {string} data.notes - Optional notes
   * @returns {Promise<Object>} Clock out result
   */
  clockOut: async (shiftId, data) => {
    try {
      console.log('📊 Clocking out:', shiftId, data);
      const response = await apiClient.post(`/v1/attendance/shifts/${shiftId}/clock-out`, data);
      console.log('✅ Clock out response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error clocking out:', error);
      throw error;
    }
  },

  /**
   * Register face descriptor for employee
   * @param {Array<number>} descriptor - Face descriptor array (128 dimensions)
   * @param {string} photo - Base64 encoded photo
   * @returns {Promise<Object>} Registration result
   */
  registerFace: async (descriptor, photo) => {
    try {
      console.log('📸 Registering face...', {
        descriptorLength: descriptor?.length,
        photoLength: photo?.length,
        photoPreview: photo?.substring(0, 50) + '...',
      });
      
      // Ensure descriptor is an array (not Float32Array)
      const descriptorArray = Array.isArray(descriptor) 
        ? descriptor 
        : Array.from(descriptor || []);
      
      const response = await apiClient.post('/v1/attendance/register-face', {
        face_descriptor: descriptorArray,
        photo: photo, // base64
      });
      
      console.log('✅ Face registered:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error registering face:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // Return error in a format that can be handled by the component
      if (error.response?.data) {
        return error.response.data;
      }
      
      throw error;
    }
  },

  /**
   * Verify face for attendance
   * @param {Array<number>} descriptor - Face descriptor array (128 dimensions)
   * @param {string} photo - Base64 encoded photo
   * @returns {Promise<Object>} Verification result with confidence score
   */
  verifyFace: async (descriptor, photo) => {
    try {
      console.log('🔍 Verifying face...');
      const response = await apiClient.post('/v1/attendance/verify-face', {
        face_descriptor: descriptor,
        photo: photo, // base64
      });
      console.log('✅ Face verified:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error verifying face:', error);
      throw error;
    }
  },

  /**
   * Get attendance report data with charts
   * @param {Object} params - Query parameters
   * @param {string} params.start_date - Start date (YYYY-MM-DD)
   * @param {string} params.end_date - End date (YYYY-MM-DD)
   * @param {number} params.user_id - Filter by user ID (admin only)
   * @returns {Promise<Object>} Attendance report data
   */
  getReport: async (params = {}) => {
    try {
      console.log('📊 Fetching attendance report with params:', params);
      const response = await apiClient.get('/v1/attendance/report', { params });
      console.log('✅ Attendance report response:', response.data);
      return response.data;
    } catch (error) {
      // Ignore cancelled errors (duplicate request prevention)
      const isCanceled = axios.isCancel?.(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancelled') || error.message?.includes('canceled') || error.message?.includes('Duplicate request cancelled');
      if (isCanceled) {
        console.log('⏭️ Attendance report request cancelled (duplicate request prevention)');
        throw error; // Still throw, but React Query will handle it gracefully
      }
      console.error('❌ Error fetching attendance report:', error);
      throw error;
    }
  },

  /**
   * Get current GPS location
   * @returns {Promise<Object>} GPS coordinates {latitude, longitude}
   */
  getCurrentLocation: (options = {}) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung oleh browser Anda'));
        return;
      }

      // ✅ FIX: Increase timeout and allow fallback to less accurate location
      const timeout = options.timeout || 20000; // 20 seconds (increased from 10)
      const enableHighAccuracy = options.enableHighAccuracy !== false; // Default true, but can be disabled

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Gagal mendapatkan lokasi GPS';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Informasi lokasi tidak tersedia.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Waktu permintaan lokasi habis.';
              break;
            default:
              errorMessage = 'Terjadi kesalahan saat mendapatkan lokasi.';
              break;
          }
          
          // ✅ NEW: If timeout and high accuracy is enabled, try again with lower accuracy
          if (error.code === error.TIMEOUT && enableHighAccuracy && !options.retryAttempted) {
            console.log('⚠️ High accuracy timeout, retrying with lower accuracy...');
            // Retry with lower accuracy
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                });
              },
              (retryError) => {
                reject(new Error(errorMessage));
              },
              {
                enableHighAccuracy: false,
                timeout: timeout,
                maximumAge: 60000, // Accept cached location up to 1 minute old
              }
            );
            return;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: enableHighAccuracy,
          timeout: timeout,
          maximumAge: enableHighAccuracy ? 0 : 60000, // Use cached location if not high accuracy
        }
      );
    });
  },
};

export default attendanceService;

