import {
  ArrowLeft,
  ClipboardList,
  Coffee,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { queryKeys } from '../../config/reactQuery';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { categoryService } from '../../services/category.service';
import { discountService } from '../../services/discount.service';
import { orderService } from '../../services/order.service';
import { productService } from '../../services/product.service';
import { tableService } from '../../services/table.service';
import CustomerSelectModal from '../modals/CustomerSelectModal';
import PrintReceiptModal from '../modals/PrintReceiptModal';
import ReceiptModal from '../modals/ReceiptModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import LoadingLogo from '../ui/LoadingLogo';
import OptimizedImage from '../ui/OptimizedImage';
import POSPagination from '../ui/POSPagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const WaiterPOS = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, currentBusiness, currentOutlet } = useAuth();
  const queryClient = useQueryClient();

  // Get table ID from URL params
  const tableId = searchParams.get('table');
  const tableNumber = searchParams.get('number');

  // State Management
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'stock'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12); // 12 products per page
  const [totalProducts, setTotalProducts] = useState(0);

  // Table management
  const [selectedTable, setSelectedTable] = useState(null);
  const [tables, setTables] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  // Table pagination and search states
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [tableItemsPerPage, setTableItemsPerPage] = useState(12); // 12 tables per page
  const [tableTotal, setTableTotal] = useState(0);

  // Modal states
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [printReceiptOpen, setPrintReceiptOpen] = useState(false);
  const [printOrderId, setPrintOrderId] = useState(null);
  const [tableChangeModalOpen, setTableChangeModalOpen] = useState(false);

  // Discount / coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  // Define all load functions first
  const loadProducts = useCallback(
    async (page = 1) => {
      try {
        const params = {
          page: page,
          per_page: itemsPerPage,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchTerm || undefined,
          sort_field: sortBy,
          sort_direction: sortOrder,
        };

        const result = await productService.getAll(params);
        if (result.success) {
          const productData = Array.isArray(result.data)
            ? result.data
            : result.data?.data || result.data?.products || [];
          setProducts(productData);

          // Set pagination info
          if (result.data?.pagination) {
            setTotalProducts(
              result.data.pagination.total || productData.length
            );
          } else {
            setTotalProducts(productData.length);
          }
        } else {
          toast.error('Gagal memuat produk');
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error loading products:', error);
        }
        toast.error('Terjadi kesalahan saat memuat produk');
      }
    },
    [itemsPerPage, selectedCategory, searchTerm, sortBy, sortOrder]
  );

  const loadCategories = useCallback(async () => {
    try {
      const result = await categoryService.getAll();
      if (result.success) {
        setCategories(result.data || []);
      } else {
        toast.error('Gagal memuat kategori');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading categories:', error);
      }
      toast.error('Terjadi kesalahan saat memuat kategori');
    }
  }, []);

  const loadTables = useCallback(async () => {
    if (!currentOutlet || !currentBusiness) {
      return;
    }

    setTableLoading(true);
    try {
      const result = await tableService.getAll(
        {},
        currentBusiness.id,
        currentOutlet.id
      );

      if (result.success) {
        const tableData = result.data || [];
        setTables(tableData);
        setTableTotal(tableData.length);

        // If tableId is provided, find and set the table
        if (tableId) {
          const table = tableData.find(t => t.id.toString() === tableId);
          if (table) {
            setSelectedTable(table);
          }
        }
      } else {
        // Set empty tables instead of showing error
        setTables([]);
      }
    } catch (error) {
      // Only log in development mode for debugging
      if (process.env.NODE_ENV === 'development') {
        const isCanceled = error.message?.includes('cancelled') || error.message?.includes('canceled');
        const isNetworkError = !error.response && error.request;
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        
        if (!isCanceled && !isNetworkError && !isTimeout) {
          console.error('Error loading tables:', error);
        }
      }
      
      // Set empty tables instead of showing error
      setTables([]);
    } finally {
      setTableLoading(false);
    }
  }, [tableId, currentOutlet, currentBusiness]);

  // Handle URL parameter changes
  useEffect(() => {
    if (tableId && tables.length > 0) {
      const table = tables.find(t => t.id.toString() === tableId);
      if (table && (!selectedTable || selectedTable.id !== table.id)) {
        setSelectedTable(table);
      }
    }
  }, [tableId, tables, selectedTable]);

  // Handle table search
  const handleTableSearch = value => {
    setTableSearchTerm(value);
    setTableCurrentPage(1);
  };

  // Handle table page change
  const handleTablePageChange = page => {
    setTableCurrentPage(page);
  };

  // Filter tables based on search term
  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
  );

  // Get paginated tables for display
  const getPaginatedTables = () => {
    const startIndex = (tableCurrentPage - 1) * tableItemsPerPage;
    const endIndex = startIndex + tableItemsPerPage;
    return filteredTables.slice(startIndex, endIndex);
  };

  const paginatedTables = getPaginatedTables();

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProducts(currentPage),
        loadCategories(),
        loadTables(),
      ]);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading initial data:', error);
      }
      toast.error('Gagal memuat data awal');
    } finally {
      setLoading(false);
    }
  }, [loadProducts, loadCategories, loadTables, currentPage]);

  const loadTableData = useCallback(async () => {
    if (!tableId) return;

    try {
      const result = await tableService.getAll();
      if (result.success) {
        const table = result.data.find(t => t.id.toString() === tableId);
        if (table) {
          setSelectedTable(table);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading table data:', error);
      }
    }
  }, [tableId]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load table data when tableId changes
  useEffect(() => {
    if (tableId) {
      loadTableData();
    }
  }, [tableId, loadTableData]);

  // Reload tables when outlet changes
  useEffect(() => {
    if (currentOutlet) {
      loadTables();
    }
  }, [currentOutlet, loadTables]);

  // Handle pagination
  const handlePageChange = useCallback(
    page => {
      setCurrentPage(page);
      loadProducts(page);
    },
    [loadProducts]
  );

  // Handle search with pagination reset
  const handleSearch = useCallback(
    value => {
      setSearchTerm(value);
      setCurrentPage(1); // Reset to first page when searching
      loadProducts(1);
    },
    [loadProducts]
  );

  // Handle category change with pagination reset
  const handleCategoryChange = useCallback(
    category => {
      setSelectedCategory(category);
      setCurrentPage(1); // Reset to first page when changing category
      loadProducts(1);
    },
    [loadProducts]
  );

  // Cart functions
  const addToCart = product => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} ditambahkan ke keranjang`);
  };

  const removeFromCart = productId => {
    setCart(cart.filter(item => item.id !== productId));
    toast.success('Item dihapus dari keranjang');
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(
      cart.map(item => (item.id === productId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedDiscount(null);
    setCouponCode('');
    toast.success('Keranjang dikosongkan');
  };

  // Calculate totals
  const getSubtotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getDiscountAmount = () => {
    if (!appliedDiscount) return 0;
    if (
      appliedDiscount.type === 'percent' ||
      appliedDiscount.type === 'percentage'
    ) {
      return (getSubtotal() * parseFloat(appliedDiscount.value)) / 100;
    }
    return parseFloat(appliedDiscount.value) || 0;
  };

  const getTax = () => {
    const subtotal = getSubtotal();
    const discountAmount = getDiscountAmount();
    const taxableAmount = subtotal - discountAmount;
    return (taxableAmount * 10) / 100; // 10% tax
  };

  const getTotal = () => {
    const subtotal = getSubtotal();
    const discountAmount = getDiscountAmount();
    const tax = getTax();
    const total = subtotal - discountAmount + tax;
    return Math.max(total, 0); // Ensure non-negative total
  };

  // Format currency
  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  // Apply discount
  const applyDiscount = async () => {
    if (!couponCode.trim()) {
      toast.error('Masukkan kode kupon');
      return;
    }

    try {
      const subtotal = getSubtotal();
      const result = await discountService.validateCoupon(
        couponCode.trim(),
        subtotal
      );
      if (result.success) {
        const data = result.data?.data || result.data;
        // Normalisasi: { type: 'percent'|'amount', value }
        const normalized = {
          code: couponCode.trim(),
          type: data?.type === 'percentage' ? 'percent' : 'amount',
          value: data?.value ?? data?.amount ?? 0,
        };
        setAppliedDiscount(normalized);
        toast.success('Kupon berhasil diterapkan');
      } else {
        setAppliedDiscount(null);
        toast.error(result.error || 'Kupon tidak valid');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error applying discount:', error);
      }
      setAppliedDiscount(null);
      toast.error('Gagal menerapkan kupon');
    }
  };

  // Remove discount
  const removeDiscount = () => {
    setAppliedDiscount(null);
    setCouponCode('');
    toast.success('Kupon dihapus');
  };

  // Handle save order (waiter workflow)
  const handleSaveOrder = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }

    try {
      // Prepare order data with table information
      const orderData = {
        customer_id: selectedCustomer?.id || null,
        table_id: selectedTable?.id || null,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        })),
        subtotal: getSubtotal(),
        discount_amount: appliedDiscount ? getDiscountAmount() : 0,
        discount_code: appliedDiscount?.code || null,
        tax_amount: getTax(),
        total_amount: getTotal(),
        status: 'pending', // Status pending untuk waiter
        notes: `Pesanan dari meja ${selectedTable?.name}`,
      };

      // Call order service to save pending order
      const result = await orderService.create(orderData);

      if (result.success) {
        toast.success('Pesanan berhasil disimpan! Akan diproses di kasir.');

        // ✅ FIX: Update table status to occupied immediately (optimistic update)
        if (selectedTable) {
          // Update in tables array
          setTables(prevTables =>
            prevTables.map(table =>
              table.id === selectedTable.id
                ? { ...table, status: 'occupied' }
                : table
            )
          );
          
          // Update selectedTable status
          setSelectedTable(prev => ({
            ...prev,
            status: 'occupied',
          }));
        }

        // ✅ FIX: Refresh tables to get latest status from backend
        await loadTables();

        // ✅ FIX: Invalidate React Query cache for tables so WaiterDashboard will refetch
        if (currentBusiness && currentOutlet) {
          // Invalidate all table queries for this business/outlet (with any params)
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return (
                Array.isArray(key) &&
                key[0] === 'tables' &&
                key[1] === currentBusiness.id &&
                key[2] === currentOutlet.id
              );
            },
          });
        }

        // Clear cart and reset form
        setCart([]);
        setSelectedCustomer(null);
        setAppliedDiscount(null);
        setCouponCode('');

        // Navigate back to dashboard or show success message
        navigate('/tables');
      } else {
        // Check if error is about shift requirement
        if (result.error && result.error.includes('shift')) {
          toast.error(
            'Anda harus membuka shift terlebih dahulu. Silakan hubungi admin untuk membuka shift.',
            { duration: 5000 }
          );
        } else {
          toast.error(
            'Gagal menyimpan pesanan: ' + (result.error || 'Unknown error')
          );
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving order:', error);
      }

      // Check if error response contains shift requirement
      if (error.response?.data?.error?.includes('shift')) {
        toast.error(
          'Anda harus membuka shift terlebih dahulu. Silakan hubungi admin untuk membuka shift.',
          { duration: 5000 }
        );
      } else {
        toast.error('Gagal menyimpan pesanan');
      }
    }
  };

  // ✅ FIX: Handle refresh using useCallback
  const handleRefresh = useCallback(async () => {
    if (refreshing || loading) {
      return; // Prevent multiple simultaneous refreshes
    }

    setRefreshing(true);
    try {
      await Promise.all([loadProducts(currentPage), loadCategories(), loadTables()]);
      toast.success('Data berhasil diperbarui');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error refreshing data:', error);
      }
      toast.error('Gagal memperbarui data');
    } finally {
      setRefreshing(false);
    }
  }, [loadProducts, loadCategories, loadTables, currentPage, refreshing, loading]);

  // ✅ FIX: Keyboard shortcut F5 untuk refresh tanpa reload halaman
  useKeyboardShortcuts(
    {
      F5: () => {
        // F5: Refresh data - prevent default browser reload (handled by useKeyboardShortcuts)
        if (!refreshing && !loading) {
          handleRefresh();
        }
      },
      'R': () => {
        // R: Refresh data
        if (!refreshing && !loading) {
          handleRefresh();
        }
      },
    },
    [handleRefresh, refreshing, loading]
  );

  // Handle table selection
  const handleTableSelect = (tableId) => {
    // Prevent errors if tables array is empty or invalid
    if (!tables || tables.length === 0) {
      toast.error('Tidak ada meja tersedia. Silakan refresh halaman.');
      return;
    }

    // Handle both string and number IDs
    const tableIdStr = String(tableId);
    const tableIdNum = Number(tableId);
    
    const table = tables.find(
      t => String(t.id) === tableIdStr || Number(t.id) === tableIdNum
    );

    if (!table) {
      toast.error('Meja tidak ditemukan');
      return;
    }

    // ✅ FIX: Check if table is available
    if (table.status === 'available') {
      setSelectedTable(table);

      // Update URL parameters without navigation
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('table', table.id);
      newUrl.searchParams.set('number', table.name || table.number || '');
      window.history.replaceState({}, '', newUrl);

      toast.success(`Berhasil memilih ${table.name || table.number || 'Meja'}`);
    } else if (table.status === 'occupied') {
      toast.error(`Meja ${table.name || table.number} sedang terisi`);
    } else if (table.status === 'reserved') {
      toast.error(`Meja ${table.name || table.number} sedang dipesan`);
    } else {
      toast.error(`Meja ${table.name || table.number} tidak tersedia`);
    }
  };

  // If no table selected, show table selection
  if (!selectedTable) {
    return (
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Button
              variant='outline'
              onClick={() => navigate('/tables')}
              className='flex items-center space-x-2'
            >
              <ArrowLeft className='w-4 h-4' />
              <span>Kembali ke Dashboard</span>
            </Button>
            <div>
              <h2 className='text-2xl font-bold text-gray-900'>
                Waiter POS - Pilih Meja
              </h2>
              <p className='text-gray-600'>Pilih meja untuk membuat pesanan</p>
            </div>
          </div>
        </div>

        {/* Table Selection */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Coffee className='w-5 h-5' />
              <span>Pilih Meja</span>
            </CardTitle>
          </CardHeader>

          {/* Search Input */}
          <div className='px-6 pb-6'>
            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <Search className='h-5 w-5 text-gray-400' />
              </div>
              <Input
                placeholder='Cari meja... (contoh: Meja 1, VIP, A1)'
                value={tableSearchTerm}
                onChange={e => handleTableSearch(e.target.value)}
                className='pl-10 pr-4 py-3 w-full border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-700 placeholder-gray-500'
              />
              {tableSearchTerm && (
                <button
                  onClick={() => handleTableSearch('')}
                  className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200'
                >
                  <span className='text-xl'>×</span>
                </button>
              )}
            </div>
          </div>

          <CardContent>
            {tableLoading ? (
              <div className='flex items-center justify-center py-8'>
                <LoadingLogo size='small' text='Memuat data meja...' />
              </div>
            ) : tables.length === 0 ? (
              <div className='text-center py-8'>
                <Coffee className='w-12 h-12 mx-auto text-gray-400 mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  Tidak ada meja
                </h3>
                <p className='text-gray-500'>
                  Belum ada meja yang dikonfigurasi untuk outlet ini.
                </p>
              </div>
            ) : (
              <div>
                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                  {paginatedTables.map(table => (
                    <div
                      key={table.id}
                      className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 ${
                        table.status === 'available'
                          ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300 hover:shadow-green-200 hover:scale-105 hover:shadow-xl cursor-pointer'
                          : table.status === 'occupied'
                          ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300 hover:shadow-red-200 opacity-60 cursor-not-allowed'
                          : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300 hover:shadow-yellow-200 opacity-60 cursor-not-allowed'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // ✅ FIX: Only allow click if table is available
                        if (table.status === 'available') {
                          handleTableSelect(table.id);
                        } else {
                          toast.error(
                            `Meja ${table.name} sedang ${
                              table.status === 'occupied' ? 'terisi' : 'dipesan'
                            }`
                          );
                        }
                      }}
                      style={{
                        pointerEvents: table.status === 'available' ? 'auto' : 'none',
                        zIndex: 1,
                      }}
                    >
                      {/* Status Indicator */}
                      <div
                        className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                          table.status === 'occupied'
                            ? 'bg-red-500 animate-pulse'
                            : table.status === 'reserved'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      ></div>

                      <div className='flex flex-col items-center space-y-3'>
                        <div
                          className={`p-3 rounded-xl ${
                            table.status === 'occupied'
                              ? 'bg-red-200'
                              : table.status === 'reserved'
                              ? 'bg-yellow-200'
                              : 'bg-green-200'
                          }`}
                        >
                          <Coffee
                            className={`w-6 h-6 ${
                              table.status === 'occupied'
                                ? 'text-red-600'
                                : table.status === 'reserved'
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          />
                        </div>

                        <div className='text-center'>
                          <div className='font-bold text-lg text-gray-900 mb-1'>
                            {table.name}
                          </div>
                          <div
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mb-2 ${
                              table.status === 'occupied'
                                ? 'bg-red-100 text-red-800'
                                : table.status === 'reserved'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {table.status === 'occupied'
                              ? 'Terisi'
                              : table.status === 'reserved'
                              ? 'Reservasi'
                              : 'Tersedia'}
                          </div>
                          <div className='flex items-center space-x-1 text-sm text-gray-600'>
                            <Users className='w-4 h-4' />
                            <span>{table.capacity} kursi</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table Pagination */}
                {filteredTables.length > tableItemsPerPage && (
                  <div className='mt-6 pt-6 border-t border-gray-200'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-2'>
                        <div className='bg-blue-50 px-3 py-2 rounded-lg'>
                          <span className='text-sm font-medium text-blue-700'>
                            Menampilkan{' '}
                            {(tableCurrentPage - 1) * tableItemsPerPage + 1} -{' '}
                            {Math.min(
                              tableCurrentPage * tableItemsPerPage,
                              filteredTables.length
                            )}{' '}
                            dari {filteredTables.length} meja
                          </span>
                        </div>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            handleTablePageChange(tableCurrentPage - 1)
                          }
                          disabled={tableCurrentPage === 1}
                          className='px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          <div className='flex items-center space-x-2'>
                            <span>←</span>
                            <span>Sebelumnya</span>
                          </div>
                        </Button>
                        <div className='flex items-center space-x-1'>
                          {Array.from(
                            {
                              length: Math.ceil(
                                filteredTables.length / tableItemsPerPage
                              ),
                            },
                            (_, i) => i + 1
                          )
                            .filter(page => {
                              const totalPages = Math.ceil(
                                filteredTables.length / tableItemsPerPage
                              );
                              return (
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - tableCurrentPage) <= 1
                              );
                            })
                            .map((page, index, array) => {
                              const showEllipsis =
                                index > 0 && page - array[index - 1] > 1;
                              return (
                                <div key={page} className='flex items-center'>
                                  {showEllipsis && (
                                    <span className='px-2 text-gray-500'>
                                      ...
                                    </span>
                                  )}
                                  <Button
                                    variant={
                                      page === tableCurrentPage
                                        ? 'default'
                                        : 'outline'
                                    }
                                    size='sm'
                                    onClick={() => handleTablePageChange(page)}
                                    className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${
                                      page === tableCurrentPage
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                                        : 'border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700'
                                    }`}
                                  >
                                    {page}
                                  </Button>
                                </div>
                              );
                            })}
                        </div>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            handleTablePageChange(tableCurrentPage + 1)
                          }
                          disabled={
                            tableCurrentPage ===
                            Math.ceil(filteredTables.length / tableItemsPerPage)
                          }
                          className='px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          <div className='flex items-center space-x-2'>
                            <span>Selanjutnya</span>
                            <span>→</span>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <Button
            variant='outline'
            onClick={() => navigate('/tables')}
            className='flex items-center space-x-2'
          >
            <ArrowLeft className='w-4 h-4' />
            <span>Kembali</span>
          </Button>
          <div>
            <h2 className='text-2xl font-bold text-gray-900'>
              Waiter POS - Meja {selectedTable?.name}
            </h2>
            <p className='text-gray-600'>
              Buat pesanan untuk meja {selectedTable?.name}
            </p>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            onClick={handleRefresh}
            disabled={refreshing}
            className='flex items-center space-x-1'
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Table Info */}
      <Card className='bg-blue-50 border-blue-200'>
        <CardContent className='p-3 sm:p-4'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0'>
            <div className='flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4'>
              <div className='flex items-center space-x-2'>
                <Coffee className='w-4 h-4 sm:w-5 sm:h-5 text-blue-600' />
                <span className='font-semibold text-sm sm:text-base text-blue-900'>
                  {selectedTable?.name}
                </span>
                <Badge
                  className={`text-xs ${
                    selectedTable?.status === 'occupied'
                      ? 'bg-red-500 text-white'
                      : selectedTable?.status === 'reserved'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {selectedTable?.status === 'occupied'
                    ? 'Terisi'
                    : selectedTable?.status === 'reserved'
                    ? 'Reservasi'
                    : 'Tersedia'}
                </Badge>
              </div>
              <div className='flex items-center space-x-2 text-xs sm:text-sm text-blue-700'>
                <Users className='w-3 h-3 sm:w-4 sm:h-4' />
                <span>{selectedTable?.capacity} kursi</span>
              </div>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setTableChangeModalOpen(true)}
              className='bg-white hover:bg-gray-50 border-gray-300'
            >
              <RefreshCw className='w-4 h-4 mr-2' />
              Ganti Meja
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Product Selection */}
        <div className='lg:col-span-2 space-y-4'>
          {/* Search and Category Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Menu</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-col sm:flex-row gap-4'>
                <div className='flex-1'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                    <Input
                      placeholder='Cari produk...'
                      value={searchTerm}
                      onChange={e => handleSearch(e.target.value)}
                      className='pl-10'
                    />
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Select
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger className='w-48'>
                      <SelectValue placeholder='Pilih kategori' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Semua Kategori</SelectItem>
                      {categories.map(category => (
                        <SelectItem
                          key={category.id}
                          value={category.id.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Sorting Dropdown */}
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={e => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order);
                      setCurrentPage(1);
                      loadProducts(1);
                    }}
                    className='px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='name-asc'>Nama A-Z</option>
                    <option value='name-desc'>Nama Z-A</option>
                    <option value='price-asc'>Harga Rendah-Tinggi</option>
                    <option value='price-desc'>Harga Tinggi-Rendah</option>
                    <option value='stock-asc'>Stok Sedikit-Banyak</option>
                    <option value='stock-desc'>Stok Banyak-Sedikit</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          <Card>
            <CardContent className='p-4'>
              {loading ? (
                <div className='flex items-center justify-center py-8'>
                  <LoadingLogo size='small' text='Memuat produk...' />
                </div>
              ) : products.length === 0 ? (
                <div className='text-center py-8'>
                  <ShoppingCart className='w-12 h-12 mx-auto text-gray-400 mb-4' />
                  <h3 className='text-lg font-medium text-gray-900 mb-2'>
                    Tidak ada produk
                  </h3>
                  <p className='text-gray-500'>
                    {searchTerm
                      ? 'Tidak ada produk yang sesuai dengan pencarian'
                      : 'Belum ada produk yang tersedia'}
                  </p>
                </div>
              ) : (
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4'>
                  {products.map(product => (
                    <div
                      key={product.id}
                      className='group cursor-pointer'
                      onClick={() => addToCart(product)}
                    >
                      <div className='bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden'>
                        {/* Product Image */}
                        <div className='relative'>
                          <OptimizedImage
                            src={
                              product.image || product.image_url
                                ? `http://localhost:8000/${
                                    product.image || product.image_url
                                  }`
                                : null
                            }
                            alt={product.name}
                            className='h-24 sm:h-32 bg-gradient-to-br from-gray-50 to-gray-100 group-hover:scale-105 transition-transform duration-200'
                            fallbackIcon={Coffee}
                            lazy={true}
                          />

                          {/* Stock Badge */}
                          {product.stock !== undefined && (
                            <div
                              className={`absolute top-2 right-2 text-white text-xs px-1.5 py-0.5 rounded-full font-bold ${
                                product.stock <= 5
                                  ? 'bg-red-500'
                                  : product.stock <= 10
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                            >
                              {product.stock}
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className='p-2 sm:p-3'>
                          <h3 className='font-semibold text-xs sm:text-sm text-gray-900 mb-1 line-clamp-2'>
                            {product.name}
                          </h3>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm sm:text-lg font-bold text-blue-600'>
                              {formatCurrency(product.price)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalProducts > itemsPerPage && (
                <POSPagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalProducts / itemsPerPage)}
                  onPageChange={handlePageChange}
                  totalItems={totalProducts}
                  itemsPerPage={itemsPerPage}
                  className='mt-6'
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart and Checkout */}
        <div className='space-y-4'>
          {/* Cart */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='flex items-center space-x-2'>
                  <ShoppingCart className='w-5 h-5' />
                  <span>Keranjang</span>
                </CardTitle>
                {cart.length > 0 && (
                  <Button variant='outline' size='sm' onClick={clearCart}>
                    <Trash2 className='w-4 h-4 mr-1' />
                    Kosongkan
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className='text-center py-8'>
                  <ShoppingCart className='w-12 h-12 mx-auto text-gray-400 mb-4' />
                  <p className='text-gray-500'>Keranjang kosong</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {cart.map(item => (
                    <div
                      key={item.id}
                      className='group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-200'
                    >
                      {/* Product Image */}
                      <div className='relative w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mr-4'>
                        {item.image || item.image_url ? (
                          <img
                            src={`http://localhost:8000/${
                              item.image || item.image_url
                            }`}
                            alt={item.name}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                            onError={e => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className='absolute inset-0 flex items-center justify-center text-gray-400'
                          style={{
                            display:
                              item.image || item.image_url ? 'none' : 'flex',
                          }}
                        >
                          <Coffee className='w-8 h-8' />
                        </div>

                        {/* Quantity Badge */}
                        <div className='absolute -top-2 -right-2 bg-blue-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold'>
                          {item.quantity}
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className='flex-1 min-w-0'>
                        <h3 className='font-semibold text-gray-900 text-xs sm:text-sm mb-1 truncate'>
                          {item.name}
                        </h3>
                        <div className='flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 text-xs text-gray-500'>
                          <span>{formatCurrency(item.price)}</span>
                          <span className='hidden sm:inline'>•</span>
                          <span className='font-semibold text-blue-600'>
                            Total: {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className='flex items-center space-x-2'>
                        <div className='flex items-center space-x-1 bg-gray-100 rounded-lg p-1'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            className='h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600'
                          >
                            <Minus className='w-3 h-3' />
                          </Button>
                          <span className='w-8 text-center text-sm font-semibold'>
                            {item.quantity}
                          </span>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            className='h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600'
                          >
                            <Plus className='w-3 h-3' />
                          </Button>
                        </div>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => removeFromCart(item.id)}
                          className='h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50'
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center space-x-2'>
                <User className='w-5 h-5' />
                <span>Pelanggan (Opsional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCustomer ? (
                <div className='flex items-center justify-between p-2 bg-blue-50 rounded-lg'>
                  <div>
                    <div className='font-medium text-sm'>
                      {selectedCustomer.name}
                    </div>
                    <div className='text-xs text-gray-500'>
                      {selectedCustomer.phone}
                    </div>
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Hapus
                  </Button>
                </div>
              ) : (
                <div className='space-y-2'>
                  <Button
                    variant='outline'
                    className='w-full'
                    onClick={() => setCustomerModalOpen(true)}
                  >
                    <User className='w-4 h-4 mr-2' />
                    Pilih Pelanggan
                  </Button>
                  <p className='text-xs text-gray-500 text-center'>
                    Kosongkan jika walk-in customer
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discount */}
          <Card>
            <CardHeader>
              <CardTitle>Diskon</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {appliedDiscount ? (
                <div className='flex items-center justify-between p-2 bg-green-50 rounded-lg'>
                  <div>
                    <div className='font-medium text-sm text-green-800'>
                      {appliedDiscount.code}
                    </div>
                    <div className='text-xs text-green-600'>
                      -{formatCurrency(getDiscountAmount())}
                    </div>
                  </div>
                  <Button variant='outline' size='sm' onClick={removeDiscount}>
                    Hapus
                  </Button>
                </div>
              ) : (
                <div className='flex space-x-2'>
                  <Input
                    placeholder='Kode kupon'
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                  />
                  <Button onClick={applyDiscount}>Apply</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Pesanan</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 sm:space-y-3'>
              <div className='flex justify-between text-xs sm:text-sm'>
                <span>Subtotal:</span>
                <span className='font-medium'>
                  {formatCurrency(getSubtotal())}
                </span>
              </div>
              {appliedDiscount && (
                <div className='flex justify-between text-xs sm:text-sm text-green-600'>
                  <span>Diskon:</span>
                  <span className='font-medium'>
                    -{formatCurrency(getDiscountAmount())}
                  </span>
                </div>
              )}
              <div className='flex justify-between text-xs sm:text-sm'>
                <span>Pajak (10%):</span>
                <span className='font-medium'>{formatCurrency(getTax())}</span>
              </div>
              <div className='border-t pt-2 sm:pt-3'>
                <div className='flex justify-between font-bold text-base sm:text-lg'>
                  <span>Total:</span>
                  <span className='text-blue-600'>
                    {formatCurrency(getTotal())}
                  </span>
                </div>
              </div>
              <div className='space-y-2'>
                <Button
                  className='w-full bg-green-600 hover:bg-green-700'
                  onClick={handleSaveOrder}
                  disabled={cart.length === 0}
                >
                  <ClipboardList className='w-4 h-4 mr-2' />
                  Simpan Pesanan
                </Button>
                <p className='text-xs text-gray-500 text-center'>
                  Pesanan akan diproses pembayaran di kasir
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CustomerSelectModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelectCustomer={setSelectedCustomer}
      />

      <ReceiptModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receiptData={lastReceipt}
      />

      <PrintReceiptModal
        open={printReceiptOpen}
        onClose={() => setPrintReceiptOpen(false)}
        orderId={printOrderId}
      />

      {/* Table Change Modal */}
      <Dialog
        open={tableChangeModalOpen}
        onOpenChange={setTableChangeModalOpen}
      >
        <DialogContent className='sm:max-w-[900px] max-h-[90vh]'>
          <DialogHeader>
            <DialogTitle className='flex items-center space-x-3 text-xl'>
              <div className='p-2 bg-blue-100 rounded-lg'>
                <RefreshCw className='w-6 h-6 text-blue-600' />
              </div>
              <div>
                <span className='text-2xl font-bold text-gray-900'>
                  Ganti Meja
                </span>
                <p className='text-sm text-gray-500 font-normal mt-1'>
                  Pilih meja baru untuk melanjutkan pesanan
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-6'>
            {/* Current Order Info */}
            <div className='bg-blue-50 border border-blue-200 rounded-xl p-4'>
              <div className='flex items-center space-x-3'>
                <div className='p-2 bg-blue-100 rounded-lg'>
                  <Coffee className='w-5 h-5 text-blue-600' />
                </div>
                <div>
                  <h3 className='font-semibold text-blue-900'>
                    Pesanan Saat Ini
                  </h3>
                  <p className='text-sm text-blue-700'>
                    Meja:{' '}
                    <span className='font-semibold'>{selectedTable?.name}</span>{' '}
                    • Pesanan akan dipindahkan ke meja yang dipilih
                  </p>
                </div>
              </div>
            </div>

            {/* Tables Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto'>
              {tables.map(table => (
                <div
                  key={table.id}
                  className={`group cursor-pointer transition-all duration-200 ${
                    table.id === selectedTable?.id
                      ? 'ring-2 ring-blue-500 ring-offset-2'
                      : table.status === 'occupied'
                      ? 'opacity-60 cursor-not-allowed'
                      : table.status === 'reserved'
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:scale-105'
                  }`}
                  onClick={() => {
                    if (
                      table.status === 'available' &&
                      table.id !== selectedTable?.id
                    ) {
                      setSelectedTable(table);
                      setTableChangeModalOpen(false);
                      // Update URL
                      const newUrl = new URL(window.location);
                      newUrl.searchParams.set('table', table.id);
                      newUrl.searchParams.set('number', table.name);
                      window.history.replaceState({}, '', newUrl);
                      toast.success(`Berhasil pindah ke ${table.name}`);
                    }
                  }}
                >
                  <div
                    className={`relative rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                      table.id === selectedTable?.id
                        ? 'bg-blue-50 border-blue-300'
                        : table.status === 'occupied'
                        ? 'bg-red-50 border-red-200'
                        : table.status === 'reserved'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200 hover:border-green-300 hover:shadow-lg'
                    }`}
                  >
                    {/* Table Image */}
                    <div className='relative h-32 bg-gradient-to-br from-gray-100 to-gray-200'>
                      {table.image || table.image_url ? (
                        <img
                          src={`http://localhost:8000/${
                            table.image || table.image_url
                          }`}
                          alt={table.name}
                          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                          onError={e => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className='absolute inset-0 flex items-center justify-center text-gray-400'
                        style={{
                          display:
                            table.image || table.image_url ? 'none' : 'flex',
                        }}
                      >
                        <Coffee className='w-16 h-16' />
                      </div>

                      {/* Status Badge */}
                      <div className='absolute top-3 right-3'>
                        {table.id === selectedTable?.id ? (
                          <div className='bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-semibold'>
                            Saat Ini
                          </div>
                        ) : table.status === 'occupied' ? (
                          <div className='bg-red-500 text-white text-xs px-3 py-1 rounded-full font-semibold'>
                            Terisi
                          </div>
                        ) : table.status === 'reserved' ? (
                          <div className='bg-yellow-500 text-white text-xs px-3 py-1 rounded-full font-semibold'>
                            Reservasi
                          </div>
                        ) : (
                          <div className='bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold'>
                            Tersedia
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Table Info */}
                    <div className='p-4'>
                      <h3 className='font-bold text-lg text-gray-900 mb-2'>
                        {table.name}
                      </h3>
                      <div className='flex items-center justify-between text-sm text-gray-600'>
                        <div className='flex items-center space-x-1'>
                          <Users className='w-4 h-4' />
                          <span>{table.capacity} kursi</span>
                        </div>
                        <div className='text-xs'>
                          {table.status === 'available'
                            ? 'Siap digunakan'
                            : table.status === 'occupied'
                            ? 'Sedang digunakan'
                            : table.status === 'reserved'
                            ? 'Sudah dipesan'
                            : 'Tidak tersedia'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className='pt-6'>
            <Button
              variant='outline'
              onClick={() => setTableChangeModalOpen(false)}
              className='px-6 py-2'
            >
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaiterPOS;
