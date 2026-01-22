// src/components/products/ProductManagementOptimizedV2.jsx - Optimized with Combined API
// ==========================================
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  Edit,
  Package,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { queryKeys } from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { dashboardService } from '../../services/dashboard.service';
import OptimizedImage from '../ui/OptimizedImage';
import ProductPagination from '../ui/ProductPagination';
import ProductSkeleton from '../ui/ProductSkeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { useToast } from '../ui/toast';

const ProductManagementOptimizedV2 = () => {
  const { toast } = useToast();
  const { currentOutlet, currentBusiness } = useAuth();
  const queryClient = useQueryClient();

  // States
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // Debounced search term to prevent too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Form states
  const [categoryFormData, setCategoryFormData] = useState({
    id: '',
    name: '',
    description: '',
  });
  const [categoryImage, setCategoryImage] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    category_id: '',
    sku: '',
    price: '',
    cost: '',
    stock: '',
    min_stock: '10',
    description: '',
  });
  const [productImage, setProductImage] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  // Empty data fallback for combined API
  const emptyCombinedData = useMemo(
    () => ({
      success: true,
      data: {
        business: null,
        outlets: [],
        current_outlet: null,
        categories: [],
        products: {
          data: [],
          pagination: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0,
          },
        },
        stats: {
          total_products: 0,
          low_stock_products: 0,
          out_of_stock_products: 0,
          total_value: 0,
        },
      },
    }),
    []
  );

  // React Query: Fetch Combined Data (Products + Categories + Stats) - SINGLE API CALL
  const {
    data: combinedResponse,
    isLoading: combinedLoading,
    error: combinedError,
    isFetching: combinedFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.productManagement(currentBusiness?.id, {
      per_page: itemsPerPage,
      page: currentPage,
      search: debouncedSearchTerm,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      sort_field: sortBy,
      sort_direction: sortOrder,
      outlet_id: currentOutlet?.id,
    }),
    queryFn: async () => {
      const result = await dashboardService.getProductManagementData({
        per_page: itemsPerPage,
        page: currentPage,
        search: debouncedSearchTerm || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        sort_field: sortBy,
        sort_direction: sortOrder,
        outlet_id: currentOutlet?.id,
      });
      return result;
    },
    enabled: !!currentBusiness?.id,
    placeholderData: emptyCombinedData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Extract data from combined response
  const products = useMemo(() => {
    if (!combinedResponse?.data?.products?.data) return [];
    return combinedResponse.data.products.data;
  }, [combinedResponse]);

  const categories = useMemo(() => {
    if (!combinedResponse?.data?.categories) return [];
    return combinedResponse.data.categories;
  }, [combinedResponse]);

  const stats = useMemo(() => {
    if (!combinedResponse?.data?.stats) {
      return {
        total: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0,
      };
    }
    return {
      total: combinedResponse.data.stats.total_products,
      lowStock: combinedResponse.data.stats.low_stock_products,
      outOfStock: combinedResponse.data.stats.out_of_stock_products,
      totalValue: combinedResponse.data.stats.total_value,
    };
  }, [combinedResponse]);

  // Pagination metadata
  const totalPages = combinedResponse?.data?.products?.last_page || 1;
  const totalItems = combinedResponse?.data?.products?.total || 0;

  // All categories with "All" option
  const allCategories = useMemo(() => {
    // Use products_count from backend for each category
    const categoriesWithCount = categories.map(category => ({
      ...category,
      count: category.products_count || 0, // Use count from backend
    }));

    // Total products count from stats (all products, not filtered)
    const totalProductsCount = stats.total || 0;

    return [
      { id: 'all', name: 'Semua Kategori', count: totalProductsCount }, // Use total from stats
      ...categoriesWithCount,
    ];
  }, [categories, stats]);

  // Filtered products (client-side filtering and sorting for current page)
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower)
      );
    }

    // Client-side sorting as fallback
    filtered = [...filtered].sort((a, b) => {
      let compareA, compareB;

      if (sortBy === 'name') {
        compareA = (a.name || '').toLowerCase();
        compareB = (b.name || '').toLowerCase();
      } else if (sortBy === 'price') {
        compareA = parseFloat(a.price) || 0;
        compareB = parseFloat(b.price) || 0;
      } else if (sortBy === 'stock') {
        compareA = parseInt(a.stock) || 0;
        compareB = parseInt(b.stock) || 0;
      } else {
        compareA = a.created_at || '';
        compareB = b.created_at || '';
      }

      if (sortOrder === 'asc') {
        return compareA < compareB ? -1 : compareA > compareB ? 1 : 0;
      } else {
        return compareA > compareB ? -1 : compareA < compareB ? 1 : 0;
      }
    });

    return filtered;
  }, [products, selectedCategory, searchTerm, sortBy, sortOrder]);

  // Handlers
  const handlePageChange = useCallback(page => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback(newItemsPerPage => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  const handleAddCategory = () => {
    setCategoryFormData({ id: '', name: '', description: '' });
    setCategoryImage(null);
    setFormErrors({});
    setIsEditingCategory(false);
    setShowCategoryModal(true);
  };

  const handleAddProduct = () => {
    setProductFormData({
      name: '',
      category_id: '',
      sku: '',
      price: '',
      cost: '',
      stock: '',
      min_stock: '10',
      description: '',
    });
    setProductImage(null);
    setFormErrors({});
    setIsEditingProduct(false);
    setShowProductModal(true);
  };

  // Show loading state only in table, not full page
  const isPaginationLoading = combinedLoading || combinedFetching;

  // Format currency
  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className='space-y-6'>
      {/* Outlet Context Banner */}
      {currentOutlet && (
        <Alert className='bg-blue-50 border-blue-400 text-blue-800'>
          <AlertDescription className='flex items-center gap-2'>
            <Package className='w-4 h-4' />
            <span>
              <strong>Konteks Outlet:</strong> Anda sedang melihat data untuk
              outlet <strong>{currentOutlet.name}</strong>. Produk dan kategori
              berlaku untuk semua outlet dalam bisnis{' '}
              <strong>{currentBusiness?.name}</strong>. Stok ditampilkan khusus
              untuk outlet ini.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {combinedError && (
        <Alert className='bg-red-50 border-red-400 text-red-800'>
          <AlertTriangle className='w-4 h-4' />
          <AlertDescription>
            Gagal memuat data: {combinedError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Header Actions */}
      <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          <h2 className='text-xl sm:text-2xl font-bold text-gray-900'>
            Manajemen Produk
          </h2>
          <p className='text-sm sm:text-base text-gray-600'>
            Kelola produk, stok, dan harga
          </p>
        </div>
        <div className='flex gap-2 w-full sm:w-auto'>
          <Button variant='outline' className='flex-1 sm:flex-none'>
            <Archive className='w-4 h-4 sm:mr-2' />
            <span className='hidden sm:inline'>Import</span>
          </Button>
          <Button
            className='bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none'
            onClick={handleAddProduct}
          >
            <Plus className='w-4 h-4 sm:mr-2' />
            <span className='hidden sm:inline'>Tambah Produk</span>
            <span className='sm:hidden'>Tambah</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 md:grid-cols-4'>
        <Card className='card-hover'>
          <CardContent className='p-4 sm:p-6'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
              <div className='mb-2 sm:mb-0'>
                <p className='text-xs sm:text-sm font-medium text-gray-600'>
                  Total Produk
                </p>
                <p className='text-xl sm:text-2xl font-bold text-gray-900'>
                  {stats.total}
                </p>
              </div>
              <Package className='w-6 h-6 sm:w-8 sm:h-8 text-blue-600 self-end sm:self-auto' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-4 sm:p-6'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
              <div className='mb-2 sm:mb-0'>
                <p className='text-xs sm:text-sm font-medium text-gray-600'>
                  Stok Rendah
                </p>
                <p className='text-xl sm:text-2xl font-bold text-yellow-600'>
                  {stats.lowStock}
                </p>
              </div>
              <AlertTriangle className='w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 self-end sm:self-auto' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-4 sm:p-6'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
              <div className='mb-2 sm:mb-0'>
                <p className='text-xs sm:text-sm font-medium text-gray-600'>
                  Stok Habis
                </p>
                <p className='text-xl sm:text-2xl font-bold text-red-600'>
                  {stats.outOfStock}
                </p>
              </div>
              <AlertTriangle className='w-6 h-6 sm:w-8 sm:h-8 text-red-600 self-end sm:self-auto' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-4 sm:p-6'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
              <div className='mb-2 sm:mb-0'>
                <p className='text-xs sm:text-sm font-medium text-gray-600'>
                  Nilai Total
                </p>
                <p className='text-lg sm:text-xl font-bold text-green-600'>
                  {formatCurrency(stats.totalValue)}
                </p>
              </div>
              <TrendingUp className='w-6 h-6 sm:w-8 sm:h-8 text-green-600 self-end sm:self-auto' />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-4'>
        {/* Filters Sidebar - Desktop Only */}
        <div className='hidden lg:block'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Filter & Kategori</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Kategori
                </label>
                <div className='space-y-2'>
                  {allCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className='flex items-center justify-between'>
                        <span>{category.name}</span>
                        <Badge variant='secondary' className='text-xs'>
                          {category.count}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className='lg:col-span-3'>
          <Card>
            <CardHeader>
              <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>Daftar Produk</CardTitle>
                  <CardDescription>
                    {filteredProducts.length} produk ditemukan
                  </CardDescription>
                </div>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                  <div className='relative'>
                    <Search className='absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2' />
                    <Input
                      placeholder='Cari produk...'
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      disabled={isPaginationLoading}
                      className='pl-10'
                    />
                  </div>
                  <div className='flex items-center gap-2'>
                    <label className='text-sm text-gray-600 whitespace-nowrap'>
                      Urutkan:
                    </label>
                    <select
                      className='px-3 py-2 border rounded-md bg-white text-sm'
                      value={`${sortBy}-${sortOrder}`}
                      disabled={isPaginationLoading}
                      onChange={e => {
                        const [by, order] = e.target.value.split('-');
                        setSortBy(by);
                        setSortOrder(order);
                        setCurrentPage(1);
                      }}
                    >
                      <option value='name-asc'>Nama A-Z</option>
                      <option value='name-desc'>Nama Z-A</option>
                      <option value='price-asc'>Harga Terendah</option>
                      <option value='price-desc'>Harga Tertinggi</option>
                      <option value='stock-asc'>Stok Sedikit</option>
                      <option value='stock-desc'>Stok Banyak</option>
                    </select>
                  </div>
                  <div className='flex items-center gap-2'>
                    <label className='text-sm text-gray-600 whitespace-nowrap'>
                      Tampilkan:
                    </label>
                    <select
                      className='px-3 py-2 border rounded-md bg-white text-sm'
                      value={itemsPerPage}
                      disabled={isPaginationLoading}
                      onChange={e =>
                        handleItemsPerPageChange(Number(e.target.value))
                      }
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {/* Category Filter - Mobile Only */}
                <div className='lg:hidden'>
                  <select
                    className='w-full px-3 py-2 border rounded-md bg-white text-sm'
                    value={selectedCategory}
                    disabled={isPaginationLoading}
                    onChange={e => setSelectedCategory(e.target.value)}
                  >
                    {allCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({category.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {isPaginationLoading ? (
                  <div className='space-y-4'>
                    {Array.from({ length: itemsPerPage }).map((_, index) => (
                      <ProductSkeleton key={index} />
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className='py-8 text-center text-gray-500'>
                    Tidak ada produk ditemukan
                  </div>
                ) : (
                  filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className='p-4 transition-colors border rounded-lg hover:bg-gray-50'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-4 flex-1'>
                          <OptimizedImage
                            src={
                              product.image
                                ? `http://localhost:8000/${product.image}`
                                : null
                            }
                            alt={product.name}
                            className='w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0'
                            fallbackIcon={Package}
                            lazy={true}
                          />
                          <div className='flex-1 min-w-0'>
                            <h3 className='font-semibold text-gray-900 truncate'>
                              {product.name}
                            </h3>
                            <div className='flex items-center space-x-4 text-sm text-gray-500'>
                              <span className='flex items-center space-x-1'>
                                <Package className='w-3 h-3' />
                                <span>
                                  {categories.find(
                                    c => c.id === product.category_id
                                  )?.name || '-'}
                                </span>
                              </span>
                              {product.sku && (
                                <span className='text-xs'>
                                  SKU: {product.sku}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className='flex items-center space-x-6 text-sm'>
                          <div className='text-right'>
                            <p className='font-semibold text-gray-900'>
                              {formatCurrency(product.price)}
                            </p>
                            <p className='text-gray-500'>
                              Stok:{' '}
                              {product.stock_type === 'untracked' ||
                              product.stock_type === 'Untracked' ||
                              String(product.stock_type || '').toLowerCase() ===
                                'untracked' ? (
                                <span className='font-semibold text-green-600'>
                                  Unlimited
                                </span>
                              ) : product.stock !== null &&
                                product.stock !== undefined ? (
                                product.stock
                              ) : (
                                0
                              )}
                            </p>
                          </div>
                          <div className='flex items-center space-x-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                // Handle edit
                              }}
                            >
                              <Edit className='w-4 h-4' />
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                // Handle delete
                              }}
                            >
                              <Trash2 className='w-4 h-4' />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {!isPaginationLoading && filteredProducts.length > 0 && (
                <div className='mt-6'>
                  <ProductPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductManagementOptimizedV2;
