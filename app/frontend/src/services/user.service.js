// ==========================================
// User Service - Profile & Password Management
// ==========================================
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const userService = {
  // Get current user profile
  getProfile: async () => {
    try {
      const response = await apiClient.get('/user');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Update user profile
  updateProfile: async profileData => {
    try {
      const response = await apiClient.put('/v1/user/profile', profileData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Change password
  changePassword: async passwordData => {
    try {
      const response = await apiClient.post(
        '/v1/user/change-password',
        passwordData
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
