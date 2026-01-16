// ==========================================
// src/components/products/ProductManagementOptimized.jsx - React Query Version
// ==========================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  Edit,
  Infinity,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getQueryGcTime,
  getQueryStaleTime,
  queryKeys,
} from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { categoryService } from '../../services/category.service';
import { productService } from '../../services/product.service';
import { CACHE_KEYS, removeCache } from '../../utils/cache.utils';
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
import ImageUpload from './ImageUpload';

const ProductManagementOptimized = () => {
  const { toast } = useToast();
  const { currentOutlet, currentBusiness } = useAuth();
  const queryClient = useQueryClient();

  // States
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    stock_type: 'tracked', // 'tracked' or 'untracked' (unlimited)
    stock: '',
    min_stock: '10',
    description: '',
    discount_type: 'none', // 'none', 'percentage', 'fixed'
    discount_value: '',
    discount_start_date: '',
    discount_end_date: '',
  });
  const [productImage, setProductImage] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  // Empty data fallback untuk loading state
  const emptyProductsData = useMemo(
    () => ({
      success: true,
      data: {
        data: [],
        pagination: {
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: 0,
        },
      },
    }),
    []
  );

  // React Query: Fetch Products
  const {
    data: productsResponse,
    isLoading: productsLoading,
    error: productsError,
    isFetching: productsFetching,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: queryKeys.products.list(currentBusiness?.id, {
      per_page: itemsPerPage,
      page: currentPage,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      search: searchTerm || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    }),
    queryFn: async () => {
      const result = await productService.getAll({
        per_page: itemsPerPage,
        page: currentPage,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (!result.success) {
        throw new Error(result.error || 'Gagal memuat produk');
      }
      return result;
    },
    enabled: !!currentBusiness?.id,
    placeholderData: emptyProductsData, // Empty data while loading
    staleTime: getQueryStaleTime(
      queryKeys.products.list(currentBusiness?.id, {})
    ),
    gcTime: getQueryGcTime(queryKeys.products.list(currentBusiness?.id, {})),
    retry: 1, // Kurangi retry
    retryDelay: 1000, // Fixed delay
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Jangan refetch saat reconnect
    // ✅ OPTIMIZATION: Use cached data immediately if available (instant UI like Facebook)
    refetchOnMount: false, // Don't refetch if data is fresh
    initialDataUpdatedAt: () => Date.now(), // Mark cached data as fresh
  });

  // Empty categories data fallback
  const emptyCategoriesData = useMemo(
    () => ({
      success: true,
      data: [],
    }),
    []
  );

  // React Query: Fetch Categories
  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: queryKeys.categories.list(currentBusiness?.id),
    queryFn: async () => {
      const result = await categoryService.getAll();
      if (!result.success) {
        throw new Error(result.error || 'Gagal memuat kategori');
      }
      return result;
    },
    enabled: !!currentBusiness?.id,
    placeholderData: emptyCategoriesData, // Empty data while loading
    staleTime: getQueryStaleTime(
      queryKeys.categories.list(currentBusiness?.id)
    ),
    gcTime: getQueryGcTime(queryKeys.categories.list(currentBusiness?.id)),
    retry: 1, // Kurangi retry
    retryDelay: 1000, // Fixed delay
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Jangan refetch saat reconnect
    // ✅ OPTIMIZATION: Use cached data immediately if available (instant UI like Facebook)
    refetchOnMount: false, // Don't refetch if data is fresh
    initialDataUpdatedAt: () => Date.now(), // Mark cached data as fresh
  });

  // Normalize data
  const products = useMemo(() => {
    if (!productsResponse?.data) return [];

    // Handle paginated response
    if (
      productsResponse.data?.data &&
      Array.isArray(productsResponse.data.data)
    ) {
      return productsResponse.data.data;
    }

    // Handle array response (fallback)
    if (Array.isArray(productsResponse.data)) {
      return productsResponse.data;
    }

    // Handle other response formats
    return productsResponse.data?.products || [];
  }, [productsResponse]);

  const categories = useMemo(() => {
    if (!categoriesResponse?.data) return [];
    const normalized = Array.isArray(categoriesResponse.data)
      ? categoriesResponse.data
      : categoriesResponse.data?.data ||
        categoriesResponse.data?.categories ||
        [];

    // Return full category objects with products_count normalized
    return normalized.map(cat => ({
      ...cat, // Spread all category properties (id, name, description, image, etc.)
      products_count: cat.products_count ?? cat.product_count ?? cat.count ?? 0,
    }));
  }, [categoriesResponse]);

  // Show toast when there's an error loading categories
  useEffect(() => {
    if (categoriesError) {
      const errorMessage = categoriesError.message || 'Gagal memuat kategori';
      toast({
        title: 'Error Memuat Kategori',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [categoriesError, toast]);

  // Pagination metadata
  const totalPages = productsResponse?.data?.last_page || 1;
  const totalItems = productsResponse?.data?.total || products.length;

  // Hitung jumlah produk per kategori dari data produk yang sudah di-load sebagai fallback
  const productCountByCategory = useMemo(() => {
    const countMap = {};
    products.forEach(product => {
      const catId = product.category_id || product.category?.id;
      if (catId) {
        countMap[catId] = (countMap[catId] || 0) + 1;
      }
    });
    return countMap;
  }, [products]);

  // All categories with "All" option
  const allCategories = useMemo(() => {
    // ✅ FIX: Gunakan products_count dari backend, dengan fallback ke perhitungan dari products
    // Backend mengirim products_count via withCount(['products' => function ($query) { $query->where('is_active', true); }])
    // products_count menghitung semua produk aktif per kategori di semua outlet untuk business tersebut

    const categoriesWithCount = categories.map(cat => {
      // Backend mengirim products_count via withCount
      // Field name: products_count (dari Laravel withCount)
      // Periksa semua kemungkinan field name
      let productCount = null;

      // Prioritaskan products_count dari backend
      if (cat.products_count !== undefined && cat.products_count !== null) {
        productCount = Number(cat.products_count);
      } else if (
        cat.product_count !== undefined &&
        cat.product_count !== null
      ) {
        productCount = Number(cat.product_count);
      } else if (cat.count !== undefined && cat.count !== null) {
        productCount = Number(cat.count);
      }

      // Fallback: Jika products_count tidak ada sama sekali, hitung dari products yang sudah di-load
      // Tapi JANGAN override jika products_count = 0 dari backend (bisa jadi memang 0 produk)
      // Hanya gunakan fallback jika products_count benar-benar null/undefined
      if (productCount === null) {
        const countFromProducts = productCountByCategory[cat.id] || 0;
        // Gunakan fallback jika ada produk yang ter-load untuk kategori ini
        productCount = countFromProducts;
      }


      return {
        ...cat,
        count: productCount ?? 0, // Default ke 0 jika masih null
      };
    });

    // Total semua produk = jumlah semua products_count dari kategori
    // Jika totalProductsFromCategories = 0, gunakan total dari pagination metadata
    const totalProductsFromCategories = categoriesWithCount.reduce(
      (sum, cat) => sum + (cat.count || 0),
      0
    );
    const totalProducts =
      totalProductsFromCategories > 0
        ? totalProductsFromCategories
        : productsResponse?.data?.total || products.length;

    return [
      { id: 'all', name: 'Semua Kategori', count: totalProducts },
      ...categoriesWithCount,
    ];
  }, [categories, products, productsResponse, productCountByCategory]);

  // Stats calculation - use pagination metadata for total count
  const stats = useMemo(() => {
    // Get total from pagination metadata, fallback to products.length
    const totalProducts = productsResponse?.data?.total || products.length;

    // For low stock and out of stock, we need to calculate from current page data
    // This is a limitation - ideally we'd have these stats from the backend
    // ✅ FIX: Exclude untracked products from stock calculations
    const lowStockProducts = products.filter(
      p => p.stock_type !== 'untracked' && p.stock <= (p.min_stock || 10)
    );
    const outOfStockProducts = products.filter(
      p => p.stock_type !== 'untracked' && p.stock === 0
    );
    const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

    return {
      total: totalProducts, // Use total from pagination metadata
      lowStock: lowStockProducts.length, // Current page only - will show "~X" to indicate approximation
      outOfStock: outOfStockProducts.length, // Current page only - will show "~X" to indicate approximation
      totalValue, // Current page only - will show "~X" to indicate approximation
    };
  }, [products, productsResponse]);

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
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : compareA < compareB ? -1 : 0;
      } else {
        return compareA < compareB ? 1 : compareA > compareB ? -1 : 0;
      }
    });

    return filtered;
  }, [products, selectedCategory, searchTerm, sortBy, sortOrder]);

  // Normalized categories
  const normalizedCategories = categories;

  // ✅ FIX: Define handleAddProduct BEFORE useKeyboardShortcuts to avoid "Cannot access before initialization" error
  const handleAddProduct = useCallback(() => {
    setProductFormData({
      name: '',
      category_id: '',
      sku: '',
      price: '',
      cost: '',
      stock_type: 'tracked', // ✅ FIX: Default to tracked
      stock: '',
      min_stock: '10',
      description: '',
      discount_type: 'none',
      discount_value: '',
      discount_start_date: '',
      discount_end_date: '',
    });
    setProductImage(null);
    setIsEditingProduct(false);
    setFormErrors({});
    setShowProductModal(true);
  }, []);

  // ✅ OPTIMIZATION: Handle refresh products and categories
  const handleRefresh = useCallback(async () => {
    if (productsLoading || categoriesLoading) return; // Prevent multiple simultaneous refreshes

    try {
      await Promise.all([refetchProducts(), refetchCategories()]);
      toast({
        title: 'Berhasil!',
        description: 'Data produk berhasil diperbarui',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error refreshing product data:', error);
      toast({
        title: 'Error!',
        description: 'Gagal memuat ulang data produk',
        variant: 'destructive',
      });
    }
  }, [
    productsLoading,
    categoriesLoading,
    refetchProducts,
    refetchCategories,
    toast,
  ]);

  // ✅ KEYBOARD SHORTCUTS for Product Management
  useKeyboardShortcuts(
    {
      F5: () => {
        // F5: Refresh products (use handleRefresh for consistency)
        handleRefresh();
      },
      F3: () => {
        // F3: Focus search
        const searchInput = document.querySelector(
          '[placeholder*="Cari produk"]'
        );
        if (searchInput) searchInput.focus();
      },
      'Ctrl+N': () => {
        // Ctrl+N: Add new product
        handleAddProduct();
      },
      Escape: () => {
        // ESC: Clear search
        setSearchTerm('');
      },
    },
    [
      currentBusiness,
      itemsPerPage,
      currentPage,
      selectedCategory,
      searchTerm,
      sortBy,
      sortOrder,
      queryClient,
      handleAddProduct,
      handleRefresh,
    ]
  );

  // Mutations
  const deleteProductMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: async () => {
      // Clear cache first to ensure fresh data
      removeCache(`${CACHE_KEYS.CATEGORIES}_all`);
      removeCache(`${CACHE_KEYS.PRODUCTS}_${currentBusiness?.id}`);

      // Invalidate and refetch all products queries
      await queryClient.invalidateQueries({
        queryKey: ['products'],
        exact: false,
        refetchType: 'active',
      });
      // Also invalidate categories to update products_count
      await queryClient.invalidateQueries({
        queryKey: queryKeys.categories.list(currentBusiness?.id),
      });
      // Also refetch the current query immediately
      await queryClient.refetchQueries({
        queryKey: queryKeys.products.list(currentBusiness?.id, {
          per_page: itemsPerPage,
          page: currentPage,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchTerm || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        }),
      });
      toast({ title: 'Produk berhasil dihapus' });
    },
    onError: error => {
      toast({
        title: 'Gagal menghapus produk',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: categoryService.delete,
    onSuccess: async () => {
      // Invalidate and refetch all categories queries
      await queryClient.invalidateQueries({
        queryKey: ['categories'],
        exact: false,
        refetchType: 'active',
      });
      // Also refetch the current query immediately
      await queryClient.refetchQueries({
        queryKey: queryKeys.categories.list(currentBusiness?.id),
      });
      toast({ title: 'Kategori berhasil dihapus' });
    },
    onError: error => {
      toast({
        title: 'Gagal menghapus kategori',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const saveCategoryMutation = useMutation({
    mutationFn: async data => {
      try {
        let result;
        if (isEditingCategory) {
          result = await categoryService.update(categoryFormData.id, data);
        } else {
          result = await categoryService.create(data);
        }

        // If service returned an error (not thrown), throw it so React Query can handle it
        if (!result.success) {
          const error = new Error(
            result.error || result.message || 'Gagal menyimpan kategori'
          );
          error.response = {
            status: result.status || 422,
            data: result.errors
              ? {
                  errors: result.errors,
                  message: result.error || result.message,
                }
              : { message: result.error || result.message },
          };
          // Also attach errors directly to error object for easier access
          error.errors = result.errors;
          error.status = result.status || 422;
          throw error;
        }

        return result;
      } catch (error) {
        // If error is already thrown from service (422 validation errors), re-throw it
        // Otherwise, wrap it in a proper error object
        if (error.response || error.status === 422) {
          throw error;
        }

        // For other errors, wrap them
        const wrappedError = new Error(
          error.message || 'Gagal menyimpan kategori'
        );
        wrappedError.response = error.response || {
          status: 500,
          data: {
            message:
              error.message || 'Terjadi kesalahan saat menyimpan kategori',
          },
        };
        wrappedError.status = error.status || 500;
        throw wrappedError;
      }
    },
    onSuccess: async () => {
      // Clear local cache first to ensure fresh data
      removeCache(`${CACHE_KEYS.CATEGORIES}_all`);
      if (currentBusiness?.id) {
        removeCache(`${CACHE_KEYS.CATEGORIES}_${currentBusiness.id}`);
      }

      // Invalidate all categories queries (this will mark them as stale)
      await queryClient.invalidateQueries({
        queryKey: ['categories'],
        exact: false,
      });

      // Refetch the current categories query immediately to get fresh data
      if (currentBusiness?.id) {
      await queryClient.refetchQueries({
          queryKey: queryKeys.categories.list(currentBusiness.id),
      });
      }

      // Also invalidate products queries to update category counts in product lists
      await queryClient.invalidateQueries({
        queryKey: ['products', currentBusiness?.id],
        exact: false,
      });

      setShowCategoryModal(false);
      toast({
        title: isEditingCategory
          ? 'Kategori berhasil diupdate'
          : 'Kategori berhasil ditambahkan',
      });
    },
    onError: error => {
      // Log full error details in development
      console.error('❌ Category save error:', {
        message: error.message,
        status: error.response?.status || error.status,
        data: error.response?.data,
        errors: error.response?.data?.errors || error.errors,
        fullError: error, // Log full error object for debugging
      });

      // Extract validation errors from 422 responses
      let errorMessage = 'Terjadi kesalahan saat menyimpan kategori';
      let errorTitle = 'Gagal menyimpan kategori';
      const formValidationErrors = {};

      // Check for validation errors (422 status)
      const is422Error = error.response?.status === 422 || error.status === 422;
      if (is422Error) {
        // First check if there are structured errors from Laravel
        const validationErrors = error.response?.data?.errors || error.errors;
        if (validationErrors) {
          // Map validation errors to form errors
          Object.keys(validationErrors).forEach(field => {
            const fieldErrors = validationErrors[field];
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              const translatedError = fieldErrors[0]
                .replace('has already been taken', 'sudah digunakan')
                .replace('The name', 'Nama kategori')
                .replace('required', 'wajib diisi');
              formValidationErrors[field] = translatedError;
            }
          });

          // Build error message for toast
          const errorMessages = Object.values(validationErrors)
            .flat()
            .map(msg => {
              // Translate common Laravel validation messages to Indonesian
              if (typeof msg === 'string') {
                if (
                  msg.includes('has already been taken') ||
                  msg.includes('already been taken')
                ) {
                  return 'Nama kategori sudah digunakan. Silakan gunakan nama lain.';
                }
                if (msg.includes('required')) {
                  return 'Field wajib diisi.';
                }
                if (msg.includes('max')) {
                  return 'Data terlalu panjang.';
                }
                return msg;
              }
              return String(msg);
            })
            .join(' ');
          errorMessage = errorMessages || 'Data yang dimasukkan tidak valid';
        }
        // Check for message in response data
        else if (error.response?.data?.message) {
          const msg = error.response.data.message;
          if (
            msg.includes('has already been taken') ||
            msg.includes('already been taken')
          ) {
            errorMessage =
              'Nama kategori sudah digunakan. Silakan gunakan nama lain.';
            formValidationErrors.name =
              'Nama kategori sudah digunakan. Silakan gunakan nama lain.';
          } else {
            errorMessage = msg;
            formValidationErrors.name = msg;
          }
        }
        // Check error.message directly
        else if (error.message) {
          if (
            error.message.includes('has already been taken') ||
            error.message.includes('already been taken')
          ) {
            errorMessage =
              'Nama kategori sudah digunakan. Silakan gunakan nama lain.';
            formValidationErrors.name =
              'Nama kategori sudah digunakan. Silakan gunakan nama lain.';
          } else {
            errorMessage = error.message;
            formValidationErrors.name = error.message;
          }
        } else {
          errorMessage =
            'Data yang dimasukkan tidak valid. Periksa kembali form Anda.';
        }
      }
      // Handle other error types
      else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Set form errors to display in the form
      if (Object.keys(formValidationErrors).length > 0) {
        setFormErrors(formValidationErrors);
      }

      // Always show toast with error
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
        duration: 5000, // Show for 5 seconds
      });

      // Clear cache and refetch categories to ensure we have the latest data
      // This is important especially when error is "name already taken"
      // because the category with that name should be visible in the list
      removeCache(`${CACHE_KEYS.CATEGORIES}_all`);

      // Invalidate and refetch categories query
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories.list(currentBusiness?.id),
        exact: false,
      });

      // Force refetch categories without cache to show the existing category
      // Use a small delay to ensure cache is cleared
      setTimeout(async () => {
        // First fetch without cache to ensure fresh data
        await categoryService.getAll({}, false);
        // Then refetch the query to update the UI
        await refetchCategories();
      }, 150);
    },
  });

  const saveProductMutation = useMutation({
    mutationFn: async data => {
      if (isEditingProduct) {
        return await productService.update(productFormData.id, data);
      }
      return await productService.create(data);
    },
    onSuccess: async response => {
      // Clear cache first to ensure fresh data
      removeCache(`${CACHE_KEYS.CATEGORIES}_all`);
      removeCache(`${CACHE_KEYS.PRODUCTS}_${currentBusiness?.id}`);

      // Fetch fresh categories data without cache to ensure products_count is updated
      await categoryService.getAll({}, false);

      // Invalidate and refetch all products queries
      await queryClient.invalidateQueries({
        queryKey: ['products'],
        exact: false,
        refetchType: 'active',
      });
      // Also invalidate categories to update products_count
      await queryClient.invalidateQueries({
        queryKey: queryKeys.categories.list(currentBusiness?.id),
      });
      // Also refetch categories immediately to update products_count
      await queryClient.refetchQueries({
        queryKey: queryKeys.categories.list(currentBusiness?.id),
      });
      // Also refetch the current query immediately to get fresh data with stock_type
      await queryClient.refetchQueries({
        queryKey: queryKeys.products.list(currentBusiness?.id, {
          per_page: itemsPerPage,
          page: currentPage,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchTerm || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        }),
      });
      setShowProductModal(false);
      toast({
        title: isEditingProduct
          ? 'Produk berhasil diupdate'
          : 'Produk berhasil ditambahkan',
      });
    },
    onError: error => {
      // ✅ DEBUG: Log error details untuk troubleshooting
      console.error('❌ Save product error:', {
        error: error,
        message: error.message,
        response: error.response,
        data: error.response?.data,
        errors: error.response?.data?.errors,
        debug: error.response?.data?.debug,
      });

      // Extract validation errors if available
      let errorMessage = error.message || 'Gagal menyimpan produk';
      const formValidationErrors = {};

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;

        // Map validation errors to form errors
        Object.keys(validationErrors).forEach(field => {
          if (validationErrors[field] && validationErrors[field].length > 0) {
            formValidationErrors[field] = validationErrors[field][0];
          }
        });

        // Build error message for toast
        const errorMessages = Object.values(validationErrors)
          .flat()
          .map(msg => {
            // Translate common Laravel validation messages to Indonesian
            if (typeof msg === 'string') {
              if (msg.includes('required')) {
                return msg.replace('required', 'harus diisi');
              }
              if (msg.includes('must be')) {
                return msg.replace('must be', 'harus');
              }
            }
            return msg;
          })
          .join(', ');
        errorMessage = errorMessages || 'Data yang dimasukkan tidak valid';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      // Set form errors to display in the form
      if (Object.keys(formValidationErrors).length > 0) {
        setFormErrors(formValidationErrors);
      }

      toast({
        title: 'Gagal menyimpan produk',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000, // Show for 5 seconds
      });
    },
  });

  // Handlers
  const handlePageChange = useCallback(page => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleItemsPerPageChange = useCallback(value => {
    setItemsPerPage(value);
    setCurrentPage(1);
  }, []);

  const handleAddCategory = useCallback(() => {
    setCategoryFormData({ id: '', name: '', description: '' });
    setCategoryImage(null);
    setIsEditingCategory(false);
    setFormErrors({});
    setShowCategoryModal(true);
  }, []);

  const handleEditCategory = useCallback(category => {
    setCategoryFormData({
      id: category.id,
      name: category.name || '',
      description: category.description || '',
    });
    setCategoryImage(null);
    setIsEditingCategory(true);
    setFormErrors({});
    setShowCategoryModal(true);
  }, []);

  const handleDeleteCategory = useCallback(
    categoryId => {
      if (window.confirm('Apakah Anda yakin ingin menghapus kategori ini?')) {
        deleteCategoryMutation.mutate(categoryId);
      }
    },
    [deleteCategoryMutation]
  );

  const handleSaveCategory = useCallback(() => {
    const errors = {};
    if (!categoryFormData.name.trim()) {
      errors.name = 'Nama kategori harus diisi';
    }

    // Check if business is selected
    if (!currentBusiness?.id) {
      toast({
        title: 'Gagal menyimpan kategori',
        description: 'Silakan pilih bisnis terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const formData = new FormData();
    formData.append('name', categoryFormData.name.trim());
    if (categoryFormData.description) {
      formData.append('description', categoryFormData.description.trim());
    }
    if (categoryImage) {
      formData.append('image', categoryImage);
    }

    saveCategoryMutation.mutate(formData);
  }, [
    categoryFormData,
    categoryImage,
    saveCategoryMutation,
    currentBusiness,
    toast,
  ]);

  const handleEditProduct = useCallback(product => {

    // Determine discount type based on existing discount data
    let discountType = 'none';
    let discountValue = '';

    if (
      product.discount_percentage &&
      parseFloat(product.discount_percentage) > 0
    ) {
      discountType = 'percentage';
      discountValue = product.discount_percentage;
    } else if (
      product.discount_price &&
      parseFloat(product.discount_price) > 0
    ) {
      discountType = 'fixed';
      // Convert discount_price (final price) back to discount amount
      discountValue =
        parseFloat(product.price) - parseFloat(product.discount_price);
    }

    // Convert numeric values to string (without formatting) for form state
    // Formatting will be applied in the value prop of Input components
    const cleanPrice =
      product.price != null && product.price !== ''
        ? String(Math.round(Number(product.price)))
        : '';
    const cleanCost =
      product.cost != null && product.cost !== ''
        ? String(Math.round(Number(product.cost)))
        : '';
    const cleanStock =
      product.stock != null && product.stock !== undefined
        ? String(Math.round(Number(product.stock)))
        : '';
    const cleanMinStock =
      product.min_stock != null && product.min_stock !== undefined
        ? String(Math.round(Number(product.min_stock)))
        : '10';
    const cleanDiscountValue = discountValue
      ? String(Math.round(Number(discountValue)))
      : '';

    // ✅ FIX: Ensure stock_type is correctly loaded (default to 'tracked' if not set)
    // Check multiple possible values to handle different data formats
    const stockType =
      product.stock_type === 'untracked' ||
      product.stock_type === 'Untracked' ||
      String(product.stock_type).toLowerCase() === 'untracked'
        ? 'untracked'
        : 'tracked';

    console.log('📦 Setting form data with stock_type:', {
      original: product.stock_type,
      normalized: stockType,
      productId: product.id,
      productName: product.name,
    });

    setProductFormData({
      id: product.id,
      name: product.name || '',
      category_id: product.category_id || '',
      sku: product.sku || '',
      price: cleanPrice,
      cost: cleanCost,
      stock_type: stockType, // ✅ FIX: Use explicit check
      stock: cleanStock,
      min_stock: cleanMinStock,
      description: product.description || '',
      discount_type: discountType,
      discount_value: cleanDiscountValue,
      discount_start_date: product.discount_start_date
        ? product.discount_start_date.split('T')[0]
        : '',
      discount_end_date: product.discount_end_date
        ? product.discount_end_date.split('T')[0]
        : '',
    });
    setProductImage(
      product.image ? `http://localhost:8000/${product.image}` : null
    );
    setIsEditingProduct(true);
    setFormErrors({});
    setShowProductModal(true);
  }, []);

  const handleDeleteProduct = useCallback(
    productId => {
      if (window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
        deleteProductMutation.mutate(productId);
      }
    },
    [deleteProductMutation]
  );

  const handleSaveProduct = useCallback(() => {
    // Validate form dengan menggunakan getNumericValue untuk memastikan nilai numerik
    const priceValue = getNumericValue(productFormData.price);
    const stockValue = getNumericValue(productFormData.stock);

    const errors = {};
    if (!productFormData.name.trim()) errors.name = 'Nama produk harus diisi';
    if (!productFormData.category_id)
      errors.category_id = 'Kategori harus dipilih';
    if (!priceValue || parseFloat(priceValue) <= 0)
      errors.price = 'Harga harus lebih dari 0';
    // Stock validation - optional, but if filled must be non-negative
    if (stockValue !== '' && stockValue !== null && stockValue !== undefined) {
      const stockNum = parseInt(stockValue);
      if (isNaN(stockNum) || stockNum < 0) {
        errors.stock = 'Stok harus berupa angka positif atau dikosongkan';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Prepare data dengan memastikan format numerik murni (tanpa titik)
    const submitData = {
      name: productFormData.name,
      category_id: productFormData.category_id,
      sku: productFormData.sku || '',
      price: parseFloat(getNumericValue(productFormData.price)) || 0,
      cost: productFormData.cost
        ? parseFloat(getNumericValue(productFormData.cost)) || 0
        : 0,
      stock_type: productFormData.stock_type || 'tracked', // ✅ FIX: Include stock_type
      stock:
        productFormData.stock_type === 'untracked'
          ? 0 // ✅ FIX: Always 0 for untracked
          : productFormData.stock && productFormData.stock !== ''
          ? parseInt(getNumericValue(productFormData.stock)) || 0
          : 0, // ✅ FIX: Default to 0 if empty for tracked
      min_stock: productFormData.min_stock
        ? parseInt(getNumericValue(productFormData.min_stock)) || null
        : null,
      description: productFormData.description || '',
    };

    const formData = new FormData();
    // ✅ FIX: Always append required fields (even for update, to ensure validation passes)
    formData.append('name', submitData.name);
    // ✅ FIX: category_id must be integer for validation, but FormData sends as string
    // Backend will handle the conversion
    formData.append(
      'category_id',
      String(submitData.category_id || productFormData.category_id || '')
    );
    formData.append('price', String(submitData.price || 0)); // ✅ FIX: Ensure string, default to 0

    // ✅ FIX: Always append stock_type - CRITICAL for update
    // Ensure it's always a string and never empty
    const stockTypeValue = submitData.stock_type || 'tracked';
    formData.append('stock_type', String(stockTypeValue));
    // ✅ FIX: Always append stock (0 for untracked, actual value for tracked)
    formData.append(
      'stock',
      String(
        submitData.stock !== null && submitData.stock !== undefined
          ? submitData.stock
          : 0
      )
    ); // ✅ FIX: Ensure string

    // ✅ FIX: Always append optional fields (even if empty, to avoid validation issues)
    formData.append('sku', submitData.sku || '');
    formData.append('cost', String(submitData.cost || 0)); // ✅ FIX: Always append, default to 0
    formData.append('min_stock', String(submitData.min_stock || 0)); // ✅ FIX: Always append, default to 0
    formData.append('description', submitData.description || ''); // ✅ FIX: Always append, default to empty

    // Handle discount fields
    if (
      productFormData.discount_type === 'percentage' &&
      productFormData.discount_value
    ) {
      formData.append(
        'discount_percentage',
        String(productFormData.discount_value)
      );
      // ✅ FIX: Don't append discount_price if empty (let backend handle null)
    } else if (
      productFormData.discount_type === 'fixed' &&
      productFormData.discount_value
    ) {
      // Convert discount amount to final price for backend
      const finalPrice =
        submitData.price -
        parseFloat(getNumericValue(productFormData.discount_value));
      formData.append(
        'discount_price',
        String(finalPrice > 0 ? finalPrice : 0)
      );
      // ✅ FIX: Don't append discount_percentage if empty (let backend handle null)
    } else {
      // No discount - don't append empty strings, let backend use null
      // ✅ FIX: Only append if we want to explicitly clear (use null instead of empty string)
    }

    // Add discount dates if provided
    if (productFormData.discount_start_date)
      formData.append(
        'discount_start_date',
        productFormData.discount_start_date
      );
    if (productFormData.discount_end_date)
      formData.append('discount_end_date', productFormData.discount_end_date);

    // ✅ FIX: Only append image if it's a File object (new upload), not a URL string
    // If productImage is a string (URL), it means we're keeping the existing image
    // Backend will keep the existing image if no new file is uploaded
    if (productImage && productImage instanceof File) {
      formData.append('image', productImage);
    }
    // If productImage is a string (URL), don't append it - backend will keep existing image

    saveProductMutation.mutate(formData);
  }, [productFormData, productImage, saveProductMutation]);

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format dengan titik sebagai pemisah ribuan (format Indonesia)
  // Input: numeric string (e.g., "50000") or empty string
  // Output: formatted string (e.g., "50.000") or empty string
  const formatNumberInput = value => {
    // Return empty string if no value
    if (!value || value === '' || value === '0') return '';

    // Ensure value is string
    const valueStr = value.toString();

    // Remove any dots that might accidentally be there
    const numericString = valueStr.replace(/[^\d]/g, '');

    // Return empty if not valid numeric string
    if (!numericString || numericString === '0') return '';

    // Validate: must be digits only
    if (!/^\d+$/.test(numericString)) {
      return '';
    }

    // Parse to integer
    const numValue = parseInt(numericString, 10);

    // Return empty if not a valid positive number
    if (isNaN(numValue) || numValue < 0) {
      return '';
    }

    // Format with thousand separator for display ONLY
    try {
      return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue);
    } catch (error) {
      console.error('Error formatting number:', error);
      return numericString;
    }
  };

  // Remove formatting and get numeric value only
  // Input: formatted string (e.g., "50.000") or numeric string (e.g., "50000")
  // Output: numeric string only (e.g., "50000")
  const getNumericValue = value => {
    if (!value || value === '') return '';
    // Remove all non-numeric characters (dots, spaces, etc)
    const numericOnly = value.toString().replace(/[^\d]/g, '');
    return numericOnly;
  };

  // Helper function to check if discount is active
  const hasActiveDiscount = product => {
    if (!product.discount_price && !product.discount_percentage) {
      return false;
    }

    const now = new Date();

    // Check if discount has started
    if (product.discount_start_date) {
      const startDate = new Date(product.discount_start_date);
      if (now < startDate) return false;
    }

    // Check if discount has ended
    if (product.discount_end_date) {
      const endDate = new Date(product.discount_end_date);
      if (now > endDate) return false;
    }

    return true;
  };

  // Helper function to calculate final price
  const getFinalPrice = product => {
    if (!hasActiveDiscount(product)) {
      return parseFloat(product.price);
    }

    if (product.discount_price) {
      return parseFloat(product.discount_price);
    }

    if (product.discount_percentage) {
      return (
        parseFloat(product.price) *
        (1 - parseFloat(product.discount_percentage) / 100)
      );
    }

    return parseFloat(product.price);
  };

  // Helper function to get discount label
  const getDiscountLabel = product => {
    if (product.discount_percentage) {
      return `${parseFloat(product.discount_percentage)}%`;
    }
    if (product.discount_price) {
      // Calculate discount amount (not final price)
      const discountAmount =
        parseFloat(product.price) - parseFloat(product.discount_price);
      return formatCurrency(discountAmount);
    }
    return '';
  };

  // Show loading state only in table, not full page
  const isPaginationLoading = productsLoading || productsFetching;

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
      {(productsError || categoriesError) && (
        <Alert variant='destructive'>
          <AlertDescription>
            {productsError?.message || categoriesError?.message}
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
          <Button
            variant='outline'
            className='flex-1 sm:flex-none'
            onClick={handleRefresh}
            disabled={productsLoading || productsFetching || categoriesLoading}
            title='Refresh data produk'
          >
            <RefreshCw
              className={`w-4 h-4 sm:mr-2 ${
                productsLoading || productsFetching || categoriesLoading
                  ? 'animate-spin'
                  : ''
              }`}
            />
            <span className='hidden sm:inline'>Refresh</span>
          </Button>
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
                  {stats.lowStock > 0 && stats.total > products.length
                    ? '~'
                    : ''}
                  {stats.lowStock}
                </p>
                {stats.total > products.length && (
                  <p className='text-xs text-gray-500'>Halaman ini</p>
                )}
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
                  {stats.outOfStock > 0 && stats.total > products.length
                    ? '~'
                    : ''}
                  {stats.outOfStock}
                </p>
                {stats.total > products.length && (
                  <p className='text-xs text-gray-500'>Halaman ini</p>
                )}
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
                  {stats.total > products.length ? '~' : ''}
                  {formatCurrency(stats.totalValue)}
                </p>
                {stats.total > products.length && (
                  <p className='text-xs text-gray-500'>Halaman ini</p>
                )}
              </div>
              <TrendingUp className='w-6 h-6 sm:w-8 sm:h-8 text-green-600 self-end sm:self-auto' />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-4'>
        {/* Categories Sidebar */}
        <Card className='hidden lg:block lg:col-span-1'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-lg'>Kategori</CardTitle>
              <Button
                size='sm'
                onClick={handleAddCategory}
                className='bg-blue-600 hover:bg-blue-700'
              >
                <Plus className='w-4 h-4' />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {categoriesLoading ? (
                <>
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className='px-3 py-2 rounded-lg border border-transparent'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='h-5 bg-gray-200 rounded animate-pulse w-24'></div>
                        <div className='h-5 bg-gray-200 rounded animate-pulse w-8'></div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                allCategories.map(category => (
                  <div
                    key={category.id}
                    className={`group relative w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCategory(category.id)}
                      className='w-full'
                    >
                      <div className='flex items-center justify-between'>
                        <span className='font-medium'>{category.name}</span>
                        <Badge variant='secondary' className='text-xs'>
                          {category.count}
                        </Badge>
                      </div>
                    </button>
                    {category.id !== 'all' && (
                      <div className='absolute flex gap-1 transition-opacity -translate-y-1/2 opacity-0 right-2 top-1/2 group-hover:opacity-100'>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleEditCategory(category)}
                          className='w-6 h-6 p-0'
                        >
                          <Edit className='w-3 h-3' />
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleDeleteCategory(category.id)}
                          className='w-6 h-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                          disabled={deleteCategoryMutation.isPending}
                        >
                          <Trash2 className='w-3 h-3' />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <div className='space-y-4 lg:col-span-3'>
          {/* Search and Filter */}
          <Card>
            <CardContent className='p-4'>
              <div className='flex flex-col gap-3'>
                <div className='flex gap-2 flex-wrap'>
                  <div className='relative flex-1 min-w-[200px]'>
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
                      <option value='stock-asc'>Stok Terendah</option>
                      <option value='stock-desc'>Stok Tertinggi</option>
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
            </CardContent>
          </Card>

          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Produk</CardTitle>
              <CardDescription>
                {filteredProducts.length} produk ditemukan
              </CardDescription>
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
                            <div className='flex items-center gap-2'>
                              <h3 className='font-semibold text-gray-900 truncate'>
                                {product.name}
                              </h3>
                              {hasActiveDiscount(product) && (
                                <Badge className='bg-red-500 text-white hover:bg-red-600 text-xs px-2 py-0.5'>
                                  DISKON {getDiscountLabel(product)}
                                </Badge>
                              )}
                            </div>
                            <div className='flex items-center space-x-4 text-sm text-gray-500'>
                              <span className='flex items-center space-x-1'>
                                <Tag className='w-3 h-3' />
                                <span>
                                  {normalizedCategories.find(
                                    c => c.id === product.category_id
                                  )?.name || 'Uncategorized'}
                                </span>
                              </span>
                              <span className='flex items-center space-x-1'>
                                <span>Stok:</span>
                                {(() => {
                                  // Check if product is unlimited (untracked)
                                  const isUntracked =
                                    product.stock_type === 'untracked' ||
                                    product.stock_type === 'Untracked' ||
                                    String(
                                      product.stock_type || ''
                                    ).toLowerCase() === 'untracked';

                                  if (isUntracked) {
                                    return (
                                      <span className='flex items-center space-x-1 font-semibold text-green-600'>
                                        <Infinity className='w-4 h-4' />
                                        <span>Unlimited</span>
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span>
                                        {product.stock !== null &&
                                        product.stock !== undefined
                                          ? product.stock
                                          : '-'}
                                      </span>
                                    );
                                  }
                                })()}
                              </span>
                            </div>
                            <div className='flex items-center gap-2'>
                              {hasActiveDiscount(product) ? (
                                <>
                                  <span className='text-sm text-gray-500 line-through'>
                                    {formatCurrency(product.price)}
                                  </span>
                                  <span className='text-lg font-bold text-red-600'>
                                    {formatCurrency(getFinalPrice(product))}
                                  </span>
                                </>
                              ) : (
                                <span className='text-lg font-bold text-blue-600'>
                                  {formatCurrency(product.price)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className='flex gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className='w-4 h-4' />
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={deleteProductMutation.isPending}
                            className='text-red-600 hover:text-red-700'
                          >
                            <Trash2 className='w-4 h-4' />
                          </Button>
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg shadow-xl max-w-md w-full'>
            <div className='flex items-center justify-between p-6 border-b'>
              <h2 className='text-xl font-bold text-gray-900'>
                {isEditingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
              </h2>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setFormErrors({});
                }}
                className='text-gray-400 hover:text-gray-600'
                disabled={saveCategoryMutation.isPending}
              >
                <X className='w-6 h-6' />
              </button>
            </div>

            <div className='p-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Nama Kategori <span className='text-red-500'>*</span>
                </label>
                <Input
                  value={categoryFormData.name}
                  onChange={e => {
                    setCategoryFormData({
                      ...categoryFormData,
                      name: e.target.value,
                    });
                    // Clear error when user starts typing
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: '' });
                    }
                  }}
                  placeholder='Contoh: Makanan, Minuman'
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && (
                  <p className='text-red-500 text-sm mt-1'>{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Deskripsi
                </label>
                <textarea
                  value={categoryFormData.description}
                  onChange={e =>
                    setCategoryFormData({
                      ...categoryFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder='Deskripsi kategori (opsional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  rows='3'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Gambar Kategori
                </label>
                <ImageUpload
                  value={categoryImage}
                  onChange={setCategoryImage}
                  onRemove={() => setCategoryImage(null)}
                  placeholder='Upload gambar kategori...'
                />
              </div>
            </div>

            <div className='flex items-center justify-end gap-3 p-6 border-t bg-gray-50'>
              <Button
                variant='outline'
                onClick={() => setShowCategoryModal(false)}
                disabled={saveCategoryMutation.isPending}
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveCategory}
                className='bg-blue-600 hover:bg-blue-700'
                disabled={saveCategoryMutation.isPending}
              >
                {saveCategoryMutation.isPending ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className='w-4 h-4 mr-2' />
                    Simpan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden'>
            <div className='flex items-center justify-between p-6 border-b'>
              <h2 className='text-xl font-bold text-gray-900'>
                {isEditingProduct ? 'Edit Produk' : 'Tambah Produk'}
              </h2>
              <button
                onClick={() => setShowProductModal(false)}
                className='text-gray-400 hover:text-gray-600'
                disabled={saveProductMutation.isPending}
              >
                <X className='w-6 h-6' />
              </button>
            </div>

            <div className='p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Nama Produk <span className='text-red-500'>*</span>
                </label>
                <Input
                  value={productFormData.name}
                  onChange={e =>
                    setProductFormData({
                      ...productFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder='Contoh: Nasi Goreng Spesial'
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && (
                  <p className='text-red-500 text-sm mt-1'>{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Kategori <span className='text-red-500'>*</span>
                </label>
                <select
                  value={productFormData.category_id}
                  onChange={e =>
                    setProductFormData({
                      ...productFormData,
                      category_id: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.category_id
                      ? 'border-red-500'
                      : 'border-gray-300'
                  }`}
                >
                  <option value=''>Pilih Kategori</option>
                  {normalizedCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {formErrors.category_id && (
                  <p className='text-red-500 text-sm mt-1'>
                    {formErrors.category_id}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  SKU
                </label>
                <Input
                  value={productFormData.sku}
                  onChange={e =>
                    setProductFormData({
                      ...productFormData,
                      sku: e.target.value,
                    })
                  }
                  placeholder='Contoh: NGS001'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Harga Jual <span className='text-red-500'>*</span>
                  </label>
                  <Input
                    type='text'
                    inputMode='numeric'
                    value={formatNumberInput(productFormData.price || '')}
                    onChange={e => {
                      const rawInput = e.target.value;
                      const numericOnly = rawInput.replace(/[^\d]/g, '');
                      if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
                        setProductFormData({
                          ...productFormData,
                          price: numericOnly,
                        });
                      }
                    }}
                    placeholder='0'
                    className={formErrors.price ? 'border-red-500' : ''}
                  />
                  {formErrors.price && (
                    <p className='text-red-500 text-sm mt-1'>
                      {formErrors.price}
                    </p>
                  )}
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Harga Beli
                  </label>
                  <Input
                    type='text'
                    inputMode='numeric'
                    value={formatNumberInput(productFormData.cost || '')}
                    onChange={e => {
                      const rawInput = e.target.value;
                      const numericOnly = rawInput.replace(/[^\d]/g, '');
                      if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
                        setProductFormData({
                          ...productFormData,
                          cost: numericOnly,
                        });
                      }
                    }}
                    placeholder='0'
                  />
                </div>
              </div>

              {/* ✅ FIX: Stock Type Toggle - Unlimited Stock */}
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                <div className='flex items-start'>
                  <input
                    type='checkbox'
                    id='isUnlimitedStock'
                    checked={productFormData.stock_type === 'untracked'}
                    onChange={e => {
                      const newStockType = e.target.checked
                        ? 'untracked'
                        : 'tracked';
                      console.log('📦 Checkbox changed:', {
                        checked: e.target.checked,
                        newStockType: newStockType,
                        currentStockType: productFormData.stock_type,
                      });
                      setProductFormData({
                        ...productFormData,
                        stock_type: newStockType,
                        stock: e.target.checked ? '' : productFormData.stock, // Clear stock if unlimited
                      });
                    }}
                    className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                  />
                  <label
                    htmlFor='isUnlimitedStock'
                    className='ml-3 block text-sm'
                  >
                    <span className='font-medium text-gray-700'>
                      Unlimited Stock (Stok Tidak Terbatas)
                    </span>
                    <p className='text-xs text-gray-600 mt-1'>
                      Centang ini untuk produk yang stoknya tidak terbatas.
                      Produk ini bisa dipilih berapa saja di POS tanpa batasan
                      stok.
                    </p>
                  </label>
                </div>
              </div>

              {/* Stock Fields - Only show if stock_type is tracked */}
              {productFormData.stock_type === 'tracked' && (
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Stok (Opsional)
                    </label>
                    <Input
                      type='text'
                      inputMode='numeric'
                      value={formatNumberInput(productFormData.stock || '')}
                      onChange={e => {
                        const rawInput = e.target.value;
                        const numericOnly = rawInput.replace(/[^\d]/g, '');
                        if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
                          setProductFormData({
                            ...productFormData,
                            stock: numericOnly,
                          });
                        }
                      }}
                      placeholder='0'
                      className={formErrors.stock ? 'border-red-500' : ''}
                    />
                    {formErrors.stock && (
                      <p className='text-red-500 text-sm mt-1'>
                        {formErrors.stock}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Stok Minimum
                    </label>
                    <Input
                      type='text'
                      inputMode='numeric'
                      value={formatNumberInput(productFormData.min_stock || '')}
                      onChange={e => {
                        const rawInput = e.target.value;
                        const numericOnly = rawInput.replace(/[^\d]/g, '');
                        if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
                          setProductFormData({
                            ...productFormData,
                            min_stock: numericOnly,
                          });
                        }
                      }}
                      placeholder='10'
                    />
                  </div>
                </div>
              )}

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Deskripsi
                </label>
                <textarea
                  value={productFormData.description}
                  onChange={e =>
                    setProductFormData({
                      ...productFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder='Deskripsi produk (opsional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  rows='3'
                />
              </div>

              {/* Discount Section */}
              <div className='p-4 border rounded-lg bg-gray-50'>
                <label className='block mb-3 text-sm font-semibold text-gray-700'>
                  Diskon (Opsional)
                </label>

                <div className='space-y-4'>
                  <div>
                    <label className='block mb-2 text-xs font-medium text-gray-600'>
                      Tipe Diskon
                    </label>
                    <select
                      className='w-full px-3 py-2 text-sm border rounded-md bg-white'
                      value={productFormData.discount_type}
                      onChange={e => {
                        setProductFormData({
                          ...productFormData,
                          discount_type: e.target.value,
                          discount_value:
                            e.target.value === 'none'
                              ? ''
                              : productFormData.discount_value,
                        });
                      }}
                    >
                      <option value='none'>Tidak Ada Diskon</option>
                      <option value='percentage'>Persentase (%)</option>
                      <option value='fixed'>Potongan Harga (Rp)</option>
                    </select>
                  </div>

                  {productFormData.discount_type !== 'none' && (
                    <>
                      <div>
                        <label className='block mb-2 text-xs font-medium text-gray-600'>
                          {productFormData.discount_type === 'percentage'
                            ? 'Persentase Diskon (%)'
                            : 'Jumlah Potongan (Rp)'}
                        </label>
                        <Input
                          type='number'
                          placeholder={
                            productFormData.discount_type === 'percentage'
                              ? '0-100'
                              : '0'
                          }
                          value={productFormData.discount_value}
                          onChange={e =>
                            setProductFormData({
                              ...productFormData,
                              discount_value: e.target.value,
                            })
                          }
                          min='0'
                          max={
                            productFormData.discount_type === 'percentage'
                              ? '100'
                              : undefined
                          }
                        />
                        {productFormData.discount_type === 'percentage' ? (
                          <p className='mt-1 text-xs text-gray-500'>
                            Masukkan nilai persentase (0-100)
                          </p>
                        ) : (
                          <p className='mt-1 text-xs text-gray-500'>
                            Masukkan jumlah potongan harga dalam Rupiah
                          </p>
                        )}
                      </div>

                      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div>
                          <label className='block mb-2 text-xs font-medium text-gray-600'>
                            Tanggal Mulai (Opsional)
                          </label>
                          <Input
                            type='date'
                            value={productFormData.discount_start_date}
                            onChange={e =>
                              setProductFormData({
                                ...productFormData,
                                discount_start_date: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <label className='block mb-2 text-xs font-medium text-gray-600'>
                            Tanggal Selesai (Opsional)
                          </label>
                          <Input
                            type='date'
                            value={productFormData.discount_end_date}
                            onChange={e =>
                              setProductFormData({
                                ...productFormData,
                                discount_end_date: e.target.value,
                              })
                            }
                            min={productFormData.discount_start_date}
                          />
                        </div>
                      </div>

                      {/* Preview Harga Diskon */}
                      {productFormData.price &&
                        productFormData.discount_value && (
                          <div className='p-3 bg-blue-50 border border-blue-200 rounded-md'>
                            <p className='text-xs font-medium text-blue-800 mb-1'>
                              Preview Harga:
                            </p>
                            <div className='flex items-center justify-between'>
                              <div>
                                <p className='text-xs text-gray-600 line-through'>
                                  Rp{' '}
                                  {parseFloat(
                                    productFormData.price || 0
                                  ).toLocaleString('id-ID')}
                                </p>
                                <p className='text-sm font-bold text-blue-600'>
                                  Rp{' '}
                                  {(productFormData.discount_type ===
                                  'percentage'
                                    ? parseFloat(productFormData.price) *
                                      (1 -
                                        parseFloat(
                                          productFormData.discount_value
                                        ) /
                                          100)
                                    : parseFloat(productFormData.price) -
                                      parseFloat(productFormData.discount_value)
                                  ).toLocaleString('id-ID')}
                                </p>
                              </div>
                              <div className='text-right'>
                                <p className='text-xs text-gray-600'>Hemat</p>
                                <p className='text-sm font-bold text-green-600'>
                                  Rp{' '}
                                  {(productFormData.discount_type ===
                                  'percentage'
                                    ? parseFloat(productFormData.price) *
                                      (parseFloat(
                                        productFormData.discount_value
                                      ) /
                                        100)
                                    : parseFloat(productFormData.discount_value)
                                  ).toLocaleString('id-ID')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Gambar Produk
                </label>
                <ImageUpload
                  value={productImage}
                  onChange={setProductImage}
                  onRemove={() => setProductImage(null)}
                  placeholder='Upload gambar produk...'
                />
              </div>
            </div>

            <div className='flex items-center justify-end gap-3 p-6 border-t bg-gray-50'>
              <Button
                variant='outline'
                onClick={() => setShowProductModal(false)}
                disabled={saveProductMutation.isPending}
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveProduct}
                className='bg-blue-600 hover:bg-blue-700'
                disabled={saveProductMutation.isPending}
              >
                {saveProductMutation.isPending ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className='w-4 h-4 mr-2' />
                    Simpan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagementOptimized;
