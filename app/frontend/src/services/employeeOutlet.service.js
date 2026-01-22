import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const employeeOutletService = {
  // Get outlets assigned to current user
  getMyOutlets: async () => {
    try {
      const token = localStorage.getItem('token');
      const businessId = localStorage.getItem('currentBusinessId');

      if (!token || !businessId) {
        throw new Error('No token or business ID found');
      }

      const userId =
        localStorage.getItem('userId') || localStorage.getItem('user_id');
      console.log(
        '🔍 employeeOutletService: Getting outlets for user ID:',
        userId
      );

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/employee-outlets/employee/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Business-Id': businessId,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('🔍 employeeOutletService: API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching assigned outlets:', error);
      throw error;
    }
  },

  // Get outlets for a specific employee (admin only)
  getEmployeeOutlets: async userId => {
    try {
      const token = localStorage.getItem('token');
      const businessId = localStorage.getItem('currentBusinessId');

      if (!token || !businessId) {
        throw new Error('No token or business ID found');
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/employee-outlets/employee/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Business-Id': businessId,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching employee outlets:', error);
      throw error;
    }
  },

  // Get all employee-outlet assignments for business (admin only)
  getAllAssignments: async () => {
    try {
      const token = localStorage.getItem('token');
      const businessId = localStorage.getItem('currentBusinessId');

      if (!token || !businessId) {
        throw new Error('No token or business ID found');
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/employee-outlets/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Business-Id': businessId,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching all assignments:', error);
      throw error;
    }
  },

  // Assign employee to outlets (admin only)
  assignEmployee: async (userId, outletIds, primaryOutletId = null) => {
    try {
      const token = localStorage.getItem('token');
      const businessId = localStorage.getItem('currentBusinessId');

      if (!token || !businessId) {
        throw new Error('No token or business ID found');
      }

      // Coerce IDs to numbers to match backend validation
      const normalizedUserId = Number(userId);
      const normalizedOutletIds = (outletIds || []).map(id => Number(id));
      const normalizedPrimaryId =
        primaryOutletId != null ? Number(primaryOutletId) : null;

      const payload = {
        user_id: normalizedUserId,
        outlet_ids: normalizedOutletIds,
        primary_outlet_id: normalizedPrimaryId,
      };

      console.log('[AssignEmployee] Request payload:', payload);

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/employee-outlets/assign`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Business-Id': businessId,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );
      console.log('[AssignEmployee] Response status:', response.status);
      console.log('[AssignEmployee] Response body:', response.data);

      return (
        response.data || {
          success: false,
          message: 'No response body',
          status: response.status,
        }
      );
    } catch (error) {
      console.error('[AssignEmployee] Request error:', error);
      if (error.response) {
        console.error(
          '[AssignEmployee] Error response status:',
          error.response.status
        );
        console.error(
          '[AssignEmployee] Error response body:',
          error.response.data
        );
      }
      throw error;
    }
  },

  // Set primary outlet for employee
  setPrimaryOutlet: async (userId, outletId) => {
    try {
      const token = localStorage.getItem('token');
      const businessId = localStorage.getItem('currentBusinessId');

      if (!token || !businessId) {
        throw new Error('No token or business ID found');
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/employee-outlets/set-primary`,
        {
          user_id: userId,
          outlet_id: outletId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Business-Id': businessId,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error setting primary outlet:', error);
      throw error;
    }
  },

  // Unassign employee from outlet (called by EmployeeOutletManagement)
  unassign: async payload => {
    try {
      const token = localStorage.getItem('token');
      const businessId = localStorage.getItem('currentBusinessId');

      if (!token || !businessId) {
        throw new Error('No token or business ID found');
      }

      // ✅ FIX: Ensure payload has correct types (integers)
      const normalizedPayload = {
        user_id: Number(payload.user_id),
        outlet_id: Number(payload.outlet_id),
      };

      console.log('[Unassign] Request payload:', normalizedPayload);

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/employee-outlets/unassign`,
        normalizedPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Business-Id': businessId,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true, // Don't throw on any status
        }
      );

      console.log('[Unassign] Response status:', response.status);
      console.log('[Unassign] Response data:', response.data);

      // If status is not 2xx, throw error with response data
      if (response.status < 200 || response.status >= 300) {
        const error = new Error(response.data?.message || 'Failed to unassign');
        error.response = response;
        throw error;
      }

      return response.data;
    } catch (error) {
      console.error('Error unassigning employee from outlet:', error);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      }
      throw error;
    }
  },

  // Set primary outlet (called by EmployeeOutletManagement)
  setPrimary: async payload => {
    try {
      const token = localStorage.getItem('token');
      const businessId = localStorage.getItem('currentBusinessId');

      if (!token || !businessId) {
        throw new Error('No token or business ID found');
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/employee-outlets/set-primary`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Business-Id': businessId,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error setting primary outlet:', error);
      throw error;
    }
  },
};

export { employeeOutletService };
