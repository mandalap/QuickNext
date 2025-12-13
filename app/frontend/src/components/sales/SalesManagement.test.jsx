import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSales } from '../../hooks/useSales';
import SalesManagement from './SalesManagement';

// Mock the hooks
jest.mock('../../contexts/AuthContext');
jest.mock('../../hooks/useSales');

const mockUseAuth = useAuth;
const mockUseSales = useSales;

const renderWithRouter = component => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('SalesManagement Pagination', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'owner',
  };

  const mockPagination = {
    currentPage: 1,
    totalPages: 3,
    totalItems: 15,
    itemsPerPage: 5,
  };

  const mockOrders = [
    {
      id: 1,
      order_number: 'ORD-001',
      customer_name: 'Customer 1',
      total: 100000,
    },
    {
      id: 2,
      order_number: 'ORD-002',
      customer_name: 'Customer 2',
      total: 150000,
    },
    {
      id: 3,
      order_number: 'ORD-003',
      customer_name: 'Customer 3',
      total: 200000,
    },
    {
      id: 4,
      order_number: 'ORD-004',
      customer_name: 'Customer 4',
      total: 250000,
    },
    {
      id: 5,
      order_number: 'ORD-005',
      customer_name: 'Customer 5',
      total: 300000,
    },
  ];

  const mockSalesHook = {
    loading: false,
    error: null,
    stats: { totalSales: 1000000, totalOrders: 15 },
    orders: mockOrders,
    customers: [],
    pagination: mockPagination,
    fetchStats: jest.fn(),
    fetchOrders: jest.fn(),
    fetchCustomers: jest.fn(),
    updateOrderStatus: jest.fn(),
    cancelOrder: jest.fn(),
    createCustomer: jest.fn(),
    updateCustomer: jest.fn(),
    deleteCustomer: jest.fn(),
    exportData: jest.fn(),
    refreshData: jest.fn(),
    debug: jest.fn(),
    setError: jest.fn(),
  };

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
      currentBusiness: { id: 1, name: 'Test Business' },
      currentOutlet: { id: 1, name: 'Test Outlet' },
    });

    mockUseSales.mockReturnValue(mockSalesHook);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders pagination with correct items per page', () => {
    renderWithRouter(<SalesManagement />);

    expect(
      screen.getByText('Menampilkan 1-5 dari 15 pesanan')
    ).toBeInTheDocument();
  });

  it('calls fetchOrders with correct parameters when page changes', async () => {
    const mockFetchOrders = jest.fn();
    mockUseSales.mockReturnValue({
      ...mockSalesHook,
      fetchOrders: mockFetchOrders,
    });

    renderWithRouter(<SalesManagement />);

    // Click on page 2
    const page2Button = screen.getByText('2');
    fireEvent.click(page2Button);

    await waitFor(() => {
      expect(mockFetchOrders).toHaveBeenCalledWith({
        page: 2,
        limit: 5, // Backend menggunakan 'limit' bukan 'per_page'
        search: '',
        status: 'all',
        dateRange: 'today',
      });
    });
  });

  it('shows correct pagination for multiple pages', () => {
    const paginationWithManyPages = {
      ...mockPagination,
      totalPages: 10,
      totalItems: 50,
    };

    mockUseSales.mockReturnValue({
      ...mockSalesHook,
      pagination: paginationWithManyPages,
    });

    renderWithRouter(<SalesManagement />);

    // Should show smart pagination: 1, 2, 3, ..., 10
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('disables pagination buttons when loading', () => {
    mockUseSales.mockReturnValue({
      ...mockSalesHook,
      loading: true,
    });

    renderWithRouter(<SalesManagement />);

    const buttons = screen.getAllByRole('button');
    const paginationButtons = buttons.filter(
      button =>
        button.textContent === 'Previous' ||
        button.textContent === 'Next' ||
        /^\d+$/.test(button.textContent)
    );

    paginationButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows correct item range for different pages', () => {
    const page2Pagination = {
      ...mockPagination,
      currentPage: 2,
    };

    mockUseSales.mockReturnValue({
      ...mockSalesHook,
      pagination: page2Pagination,
    });

    renderWithRouter(<SalesManagement />);

    expect(
      screen.getByText('Menampilkan 6-10 dari 15 pesanan')
    ).toBeInTheDocument();
  });

  it('handles last page correctly', () => {
    const lastPagePagination = {
      ...mockPagination,
      currentPage: 3,
      totalItems: 15,
    };

    mockUseSales.mockReturnValue({
      ...mockSalesHook,
      pagination: lastPagePagination,
    });

    renderWithRouter(<SalesManagement />);

    expect(
      screen.getByText('Menampilkan 11-15 dari 15 pesanan')
    ).toBeInTheDocument();
  });
});
