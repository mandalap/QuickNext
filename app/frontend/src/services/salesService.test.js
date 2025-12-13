import { salesService } from './salesService';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

describe('salesService', () => {
  let mockAxios;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get the mocked axios instance
    const axios = require('axios');
    mockAxios = axios.create();
  });

  describe('getOrders', () => {
    it('should send correct parameters to backend', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [],
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 5,
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      const params = {
        page: 2,
        limit: 5,
        search: 'test',
        status: 'completed',
        dateRange: 'today',
      };

      await salesService.getOrders(params);

      expect(mockAxios.get).toHaveBeenCalledWith('/v1/sales/orders', {
        params: {
          page: 2,
          limit: 5, // Backend menggunakan 'limit'
          status: 'completed',
          search: 'test',
          sort_by: 'created_at',
          sort_order: 'desc',
          date_range: 'today',
        },
      });
    });

    it('should use default values when parameters are not provided', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [],
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 5,
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      await salesService.getOrders();

      expect(mockAxios.get).toHaveBeenCalledWith('/v1/sales/orders', {
        params: {
          page: 1,
          limit: 5, // Default limit
          status: undefined,
          search: undefined,
          sort_by: 'created_at',
          sort_order: 'desc',
        },
      });
    });

    it('should handle dateRange parameter correctly', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [],
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 5,
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      await salesService.getOrders({
        dateRange: 'this_week',
        limit: 5,
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/v1/sales/orders', {
        params: {
          page: 1,
          limit: 5,
          status: undefined,
          search: undefined,
          sort_by: 'created_at',
          sort_order: 'desc',
          date_range: 'this_week',
        },
      });
    });

    it('should handle date_from and date_to parameters', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [],
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 5,
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      await salesService.getOrders({
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        limit: 5,
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/v1/sales/orders', {
        params: {
          page: 1,
          limit: 5,
          status: undefined,
          search: undefined,
          sort_by: 'created_at',
          sort_order: 'desc',
          date_from: '2025-01-01',
          date_to: '2025-01-31',
        },
      });
    });

    it('should prioritize limit over per_page', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [],
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 5,
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      await salesService.getOrders({
        per_page: 10,
        limit: 5,
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/v1/sales/orders', {
        params: {
          page: 1,
          limit: 5, // limit should be used, not per_page
          status: undefined,
          search: undefined,
          sort_by: 'created_at',
          sort_order: 'desc',
        },
      });
    });
  });
});







































































