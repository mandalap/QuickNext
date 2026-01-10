// ==========================================
// src/components/products/ProductManagement.jsx - Enhanced Version
// ==========================================
import {
  AlertTriangle,
  Archive,
  Edit,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { categoryService } from '../../services/category.service';
import { productService } from '../../services/product.service';
import { CACHE_KEYS, removeCache } from '../../utils/cache.utils';
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
import ImageUpload from './ImageUpload';

const ProductManagement = () => {
  const { currentOutlet, currentBusiness, loadBusinesses } = useAuth();

  useEffect(() => {
    // If business_type is missing but business_type_id exists, reload business data
    if (
      currentBusiness?.id &&
      currentBusiness?.business_type_id &&
      !currentBusiness?.business_type
    ) {
      // Force reload business to get business_type relationship
      loadBusinesses();
    }
  }, [currentBusiness, loadBusinesses]);

  // States
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce search untuk mengurangi API calls
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0); // Total filtered items
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);

  // Stats dari backend (tidak terpengaruh filter & pagination)
  const [backendStats, setBackendStats] = useState({
    total_all_products: 0,
    low_stock: 0,
    out_of_stock: 0,
    stock_value: 0,
  });
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
    stock_type: 'tracked', // 'tracked' or 'untracked'
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

  // API Hooks
  const {
    data: products,
    loading: productsLoading,
    error: productsError,
    execute: fetchProducts,
  } = useApi(() =>
    productService.getAll({
      per_page: itemsPerPage,
      page: currentPage,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      search: debouncedSearchTerm || undefined, // Gunakan debounced value
    })
  );

  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
    execute: fetchCategories,
  } = useApi(categoryService.getAll);

  // Helper to force refresh categories without cache
  const forceRefreshCategories = async () => {
    // Clear cache first to ensure fresh data
    removeCache(`${CACHE_KEYS.CATEGORIES}_all`);
    // Fetch fresh data without cache
    await categoryService.getAll({}, false);
    // Now fetchCategories will get fresh data since cache is cleared
    await fetchCategories();
  };

  const { loading: deleteProductLoading, execute: deleteProduct } = useApi(
    productService.delete
  );

  const { loading: deleteCategoryLoading, execute: deleteCategory } = useApi(
    categoryService.delete
  );

  const { loading: saveCategoryLoading, execute: saveCategory } = useApi(
    isEditingCategory ? categoryService.update : categoryService.create
  );

  const { loading: saveProductLoading, execute: saveProduct } = useApi(
    isEditingProduct ? productService.update : productService.create
  );

  // Fetch categories only once on mount
  useEffect(() => {
    if (!categories) {
      fetchCategories();
    }
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategory, itemsPerPage]);

  // Consolidated effect for products - handles all changes
  useEffect(() => {
    setIsPaginationLoading(true);
    fetchProducts().finally(() => setIsPaginationLoading(false));
  }, [debouncedSearchTerm, selectedCategory, itemsPerPage, currentPage]);

  // Normalize data - handle different API response structures
  const normalizedProducts = React.useMemo(() => {
    if (!products) return [];

    // If products is directly an array
    if (Array.isArray(products)) return products;

    // If products is wrapped in data property (paginated response)
    if (products.data && Array.isArray(products.data)) {
      return products.data;
    }

    // If products has products property
    if (products.products && Array.isArray(products.products))
      return products.products;

    return [];
  }, [products]);

  // Update pagination & stats when products change
  useEffect(() => {
    if (!products) return;

    if (products.data && Array.isArray(products.data)) {
      // Update pagination info from response
      if (products.current_page) {
        setCurrentPage(products.current_page);
      }
      if (products.last_page) {
        setTotalPages(products.last_page);
      }
      if (products.total) {
        setTotalItems(products.total); // Total filtered
      }
      if (products.per_page) {
        setItemsPerPage(products.per_page);
      }
      // Update stats dari backend
      if (products.stats) {
        setBackendStats(products.stats);
      }
    }
  }, [products]);

  const normalizedCategories = React.useMemo(() => {
    if (!categories) return [];

    if (Array.isArray(categories)) return categories;
    if (categories.data && Array.isArray(categories.data))
      return categories.data;
    if (categories.categories && Array.isArray(categories.categories))
      return categories.categories;

    return [];
  }, [categories]);

  // Helper Functions
  const getStatusBadge = (stock, minStock = 10) => {
    // Handle null/undefined stock
    if (stock === null || stock === undefined) {
      return (
        <Badge className='text-gray-800 bg-gray-100 border-gray-200'>
          Tidak Diketahui
        </Badge>
      );
    }
    if (stock === 0) {
      return (
        <Badge className='text-red-800 bg-red-100 border-red-200'>Habis</Badge>
      );
    }
    if (stock < minStock) {
      return (
        <Badge className='text-yellow-800 bg-yellow-100 border-yellow-200'>
          Stok Rendah
        </Badge>
      );
    }
    return (
      <Badge className='text-green-800 bg-green-100 border-green-200'>
        Aktif
      </Badge>
    );
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Validation Functions
  // Format number with thousand separator (for display only)
  // Format dengan titik sebagai pemisah ribuan (format Indonesia)
  // Sama persis dengan implementasi di PromoManagement.jsx
  const formatNumberInput = value => {
    // Return empty string if no value
    if (!value || value === '' || value === '0') return '';

    // Ensure value is string
    const valueStr = value.toString();

    // Remove any dots that might accidentally be there
    // formData.value should NEVER contain dots, but safety check
    const numericString = valueStr.replace(/[^\d]/g, '');

    // Return empty if not valid numeric string
    if (!numericString || numericString === '0') return '';

    // Validate: must be digits only (no dots, no letters, nothing else)
    if (!/^\d+$/.test(numericString)) {
      return '';
    }

    // Parse to integer (always use base 10)
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
      console.error(
        'Error formatting number:',
        error,
        'value:',
        value,
        'numericString:',
        numericString
      );
      // Return numeric string (without dots) if formatting fails
      return numericString;
    }
  };

  // Remove formatting and get numeric value only (always returns numeric string)
  // Input: formatted string (e.g., "50.000") or numeric string (e.g., "50000")
  // Output: numeric string only (e.g., "50000")
  const getNumericValue = value => {
    if (!value || value === '') return '';
    // Remove all non-numeric characters (dots, spaces, etc)
    const numericOnly = value.toString().replace(/[^\d]/g, '');
    return numericOnly;
  };

  // Check if business type requires stock
  // Stock is always required for all business types including laundry
  const requiresStock = () => {
    return true; // Stock is always required for all business types
  };

  const validateProductForm = () => {
    const errors = {};

    if (!productFormData.name.trim()) {
      errors.name = 'Nama produk harus diisi';
    }

    if (!productFormData.category_id) {
      errors.category_id = 'Kategori harus dipilih';
    }

    // Get numeric value from price (may have dots from formatting)
    const priceValue = getNumericValue(productFormData.price);
    if (!priceValue || parseFloat(priceValue) <= 0) {
      errors.price = 'Harga harus lebih dari 0';
    }

    if (productFormData.cost) {
      const costValue = getNumericValue(productFormData.cost);
      if (costValue && parseFloat(costValue) < 0) {
        errors.cost = 'Harga modal tidak boleh negatif';
      }
    }

    // Stock validation - optional, but if filled must be non-negative
    if (productFormData.stock_type === 'tracked') {
      const stockValue = getNumericValue(productFormData.stock);
      // Stok sekarang optional, hanya validasi jika diisi
      // Hanya validasi jika user mengisi nilai (bukan empty string)
      if (
        stockValue !== '' &&
        stockValue !== null &&
        stockValue !== undefined
      ) {
        const stockNum = parseInt(stockValue);
        if (isNaN(stockNum) || stockNum < 0) {
          errors.stock = 'Stok harus berupa angka positif atau dikosongkan';
        }
      }

      if (
        productFormData.min_stock !== '' &&
        parseInt(productFormData.min_stock) < 0
      ) {
        errors.min_stock = 'Stok minimum tidak boleh negatif';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCategoryForm = () => {
    const errors = {};

    if (!categoryFormData.name.trim()) {
      errors.name = 'Nama kategori harus diisi';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Computed Values
  const allCategories = [
    { id: 'all', name: 'Semua Kategori', count: normalizedProducts.length },
    ...normalizedCategories.map(cat => ({
      ...cat,
      count: normalizedProducts.filter(p => p.category_id === cat.id).length,
    })),
  ];

  // Products are already filtered by backend, so we use them directly
  const filteredProducts = normalizedProducts;

  // Gunakan stats dari backend (sudah dihitung untuk SEMUA produk, tidak terpengaruh filter & pagination)
  const stats = React.useMemo(() => {
    return {
      total: backendStats.total_all_products || 0,
      lowStock: backendStats.low_stock || 0,
      outOfStock: backendStats.out_of_stock || 0,
      stockValue: backendStats.stock_value || 0,
    };
  }, [backendStats]);

  // Pagination Handlers
  const handlePageChange = async page => {
    setIsPaginationLoading(true);
    setCurrentPage(page);
    // Loading state will be cleared when fetchProducts completes
  };

  const handleItemsPerPageChange = async newItemsPerPage => {
    setIsPaginationLoading(true);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
    // Loading state will be cleared when fetchProducts completes
  };

  // Category Handlers
  const handleAddCategory = () => {
    setCategoryFormData({ id: '', name: '', description: '' });
    setCategoryImage(null);
    setFormErrors({});
    setIsEditingCategory(false);
    setShowCategoryModal(true);
  };

  const handleEditCategory = category => {
    if (category.id === 'all') {
      toast.warning('Kategori "Semua Kategori" tidak dapat diedit');
      return;
    }
    setCategoryFormData(category);
    setCategoryImage(
      category.image ? `http://localhost:8000/${category.image}` : null
    );
    setFormErrors({});
    setIsEditingCategory(true);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async categoryId => {
    if (categoryId === 'all') {
      toast.warning('Kategori "Semua Kategori" tidak dapat dihapus');
      return;
    }

    if (!window.confirm('Apakah Anda yakin ingin menghapus kategori ini?')) {
      return;
    }

    const result = await deleteCategory(categoryId);
    if (result.success) {
      toast.success('Kategori berhasil dihapus');
      fetchCategories();
      if (selectedCategory === categoryId) {
        setSelectedCategory('all');
      }
    } else {
      toast.error(result.error || 'Gagal menghapus kategori');
    }
  };

  const handleSaveCategory = async () => {
    if (!validateCategoryForm()) {
      toast.error('Mohon perbaiki kesalahan pada form');
      return;
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('name', categoryFormData.name);
    if (categoryFormData.description) {
      formData.append('description', categoryFormData.description);
    }

    // Handle image upload
    if (categoryImage) {
      if (typeof categoryImage !== 'string') {
        // New image uploaded (File object)
        formData.append('image', categoryImage);
      }
      // If categoryImage is a string (existing image URL), we don't need to do anything
      // The backend will keep the existing image
    } else {
      // Image was removed, send empty value to remove image
      if (isEditingCategory) {
        formData.append('remove_image', '1');
      }
    }

    let result;
    if (isEditingCategory) {
      result = await saveCategory(categoryFormData.id, formData);
    } else {
      result = await saveCategory(formData);
    }

    if (result.success) {
      toast.success(
        isEditingCategory
          ? 'Kategori berhasil diupdate'
          : 'Kategori berhasil ditambahkan'
      );
      setShowCategoryModal(false);
      // Reset form
      setCategoryFormData({ id: '', name: '', description: '' });
      setCategoryImage(null);
      setIsEditingCategory(false);
      // Force refresh categories to show the new category
      await forceRefreshCategories();
    } else {
      // Handle validation errors from backend
      if (result.error && typeof result.error === 'object') {
        setFormErrors(result.error);
        toast.error('Mohon perbaiki kesalahan pada form');
      } else {
        toast.error(result.error || 'Gagal menyimpan kategori');
      }
    }
  };

  // Product Handlers
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
      discount_type: 'none',
      discount_value: '',
      discount_start_date: '',
      discount_end_date: '',
    });
    setProductImage(null);
    setFormErrors({});
    setIsEditingProduct(false);
    setShowProductModal(true);
  };

  const handleEditProduct = product => {
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
    // Form should display: 50000 (will be formatted to "50.000" by formatNumberInput)
    const cleanPrice =
      product.price != null && product.price !== ''
        ? String(Math.round(Number(product.price))) // Ensure it's a whole number
        : '';
    const cleanCost =
      product.cost != null && product.cost !== ''
        ? String(Math.round(Number(product.cost))) // Ensure it's a whole number
        : '';
    const cleanStock =
      product.stock != null && product.stock !== undefined
        ? String(Math.round(Number(product.stock))) // Ensure it's a whole number
        : '';
    const cleanMinStock =
      product.min_stock != null && product.min_stock !== undefined
        ? String(Math.round(Number(product.min_stock))) // Ensure it's a whole number
        : '';
    const cleanDiscountValue = discountValue
      ? String(Math.round(Number(discountValue))) // Ensure it's a whole number
      : '';

    setProductFormData({
      ...product,
      price: cleanPrice,
      cost: cleanCost,
      stock_type: product.stock_type || 'tracked', // Default to 'tracked' for existing products
      stock: cleanStock,
      min_stock: cleanMinStock,
      sku: product.sku || '',
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
    setFormErrors({});
    setIsEditingProduct(true);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async productId => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      return;
    }

    const result = await deleteProduct(productId);
    if (result.success) {
      toast.success('Produk berhasil dihapus');
      fetchProducts();
    } else {
      toast.error(result.error || 'Gagal menghapus produk');
    }
  };

  const handleSaveProduct = async () => {
    if (!validateProductForm()) {
      toast.error('Mohon perbaiki kesalahan pada form');
      return;
    }

    // Prepare data - convert formatted values to numeric (remove dots)
    const submitData = {
      ...productFormData,
      price: parseFloat(getNumericValue(productFormData.price)) || 0,
      cost: productFormData.cost
        ? parseFloat(getNumericValue(productFormData.cost)) || 0
        : 0,
      stock:
        productFormData.stock && productFormData.stock !== ''
          ? parseInt(getNumericValue(productFormData.stock)) || null
          : null,
      min_stock: productFormData.min_stock
        ? parseInt(getNumericValue(productFormData.min_stock)) || null
        : null,
    };

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('name', productFormData.name);
    formData.append('category_id', productFormData.category_id);
    formData.append('price', submitData.price);
    formData.append('stock_type', productFormData.stock_type || 'tracked');
    // Send null as empty string or omit if stock is null
    if (submitData.stock !== null && submitData.stock !== undefined) {
      formData.append('stock', submitData.stock);
    }

    if (productFormData.sku) formData.append('sku', productFormData.sku);
    if (submitData.cost) formData.append('cost', submitData.cost);
    if (submitData.min_stock)
      formData.append('min_stock', submitData.min_stock);
    if (productFormData.description)
      formData.append('description', productFormData.description);

    // Handle discount fields
    if (
      productFormData.discount_type === 'percentage' &&
      productFormData.discount_value
    ) {
      formData.append('discount_percentage', productFormData.discount_value);
      formData.append('discount_price', ''); // Clear fixed discount
    } else if (
      productFormData.discount_type === 'fixed' &&
      productFormData.discount_value
    ) {
      // Convert discount amount to final price for backend
      const finalPrice =
        submitData.price -
        parseFloat(getNumericValue(productFormData.discount_value));
      formData.append('discount_price', finalPrice > 0 ? finalPrice : 0);
      formData.append('discount_percentage', ''); // Clear percentage discount
    } else {
      // No discount
      formData.append('discount_price', '');
      formData.append('discount_percentage', '');
    }

    if (productFormData.discount_start_date)
      formData.append(
        'discount_start_date',
        productFormData.discount_start_date
      );
    if (productFormData.discount_end_date)
      formData.append('discount_end_date', productFormData.discount_end_date);

    // Handle image upload
    if (productImage) {
      if (typeof productImage !== 'string') {
        // New image uploaded (File object)
        formData.append('image', productImage);
      }
      // If productImage is a string (existing image URL), we don't need to do anything
      // The backend will keep the existing image
    } else {
      // Image was removed, send empty value to remove image
      if (isEditingProduct) {
        formData.append('remove_image', '1');
      }
    }

    let result;
    if (isEditingProduct) {
      result = await saveProduct(productFormData.id, formData);
    } else {
      result = await saveProduct(formData);
    }

    if (result.success) {
      toast.success(
        isEditingProduct
          ? 'Produk berhasil diupdate'
          : 'Produk berhasil ditambahkan'
      );
      setShowProductModal(false);
      fetchProducts();
    } else {
      // Handle validation errors from backend
      if (result.error && typeof result.error === 'object') {
        setFormErrors(result.error);
        toast.error('Mohon perbaiki kesalahan pada form');
      } else {
        toast.error(result.error || 'Gagal menyimpan produk');
      }
    }
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
      {(productsError || categoriesError) && (
        <Alert variant='destructive'>
          <AlertDescription>
            {productsError || categoriesError}
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
            className='flex-1 sm:flex-none border-green-300 text-green-600 hover:bg-green-50'
            onClick={handleAddCategory}
          >
            <Tag className='w-4 h-4 sm:mr-2' />
            <span className='hidden sm:inline'>Tambah Kategori</span>
            <span className='sm:hidden'>Kategori</span>
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
            <span className='sm:hidden'>Produk</span>
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
                  Habis Stok
                </p>
                <p className='text-xl sm:text-2xl font-bold text-red-600'>
                  {stats.outOfStock}
                </p>
              </div>
              <Trash2 className='w-6 h-6 sm:w-8 sm:h-8 text-red-600 self-end sm:self-auto' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-4 sm:p-6'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
              <div className='mb-2 sm:mb-0 flex-1 min-w-0'>
                <p className='text-xs sm:text-sm font-medium text-gray-600'>
                  Nilai Stok
                </p>
                <p className='text-base sm:text-2xl font-bold text-green-600 truncate'>
                  {formatCurrency(stats.stockValue)}
                </p>
              </div>
              <TrendingUp className='w-6 h-6 sm:w-8 sm:h-8 text-green-600 self-end sm:self-auto flex-shrink-0' />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-4'>
        {/* Categories Sidebar - Hidden on mobile */}
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
                // Loading skeleton for categories
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
                        : 'hover:bg-gray-50 border border-transparent'
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
                          disabled={deleteCategoryLoading}
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
                {/* Search Bar and Items Per Page */}
                <div className='flex gap-2'>
                  <div className='relative flex-1'>
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
                {/* ✅ FIX: Total produk selalu konsisten (total semua produk), tidak berubah saat pilih kategori */}
                {/* Selalu tampilkan total semua produk, bukan total filtered per kategori */}
                {`${backendStats.total_all_products} produk ditemukan`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {isPaginationLoading && filteredProducts.length === 0 ? (
                  // Show skeleton loaders for initial load
                  <>
                    {[...Array(itemsPerPage)].map((_, i) => (
                      <ProductSkeleton key={i} />
                    ))}
                  </>
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
                      {/* Desktop Layout */}
                      <div className='hidden md:flex md:items-center md:justify-between'>
                        <div className='flex items-center space-x-4 flex-1'>
                          <div className='flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0'>
                            {product.image ? (
                              <img
                                src={`http://localhost:8000/${product.image}`}
                                alt={product.name}
                                className='object-cover w-full h-full'
                              />
                            ) : (
                              <Package className='w-8 h-8 text-gray-400' />
                            )}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <h3 className='font-semibold text-gray-900 truncate'>
                              {product.name}
                            </h3>
                            <div className='flex items-center space-x-4 text-sm text-gray-500'>
                              <span className='flex items-center space-x-1'>
                                <Tag className='w-3 h-3' />
                                <span>
                                  {normalizedCategories.find(
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
                          <div className='text-center'>
                            <p className='font-semibold text-gray-900'>
                              {formatCurrency(product.price)}
                            </p>
                            <p className='text-gray-500'>Harga</p>
                          </div>

                          <div className='text-center'>
                            <p className='font-semibold text-gray-900'>
                              {product.stock !== null &&
                              product.stock !== undefined
                                ? product.stock
                                : '-'}
                            </p>
                            <p className='text-gray-500'>Stok</p>
                          </div>

                          <div className='text-center'>
                            {getStatusBadge(product.stock, product.min_stock)}
                          </div>

                          <div className='flex items-center space-x-2'>
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
                              className='text-red-600 hover:text-red-700'
                              onClick={() => handleDeleteProduct(product.id)}
                              disabled={deleteProductLoading}
                            >
                              <Trash2 className='w-4 h-4' />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className='md:hidden'>
                        <div className='flex items-start space-x-3'>
                          {/* Product Image */}
                          <div className='flex items-center justify-center w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0'>
                            {product.image ? (
                              <img
                                src={`http://localhost:8000/${product.image}`}
                                alt={product.name}
                                className='object-cover w-full h-full'
                              />
                            ) : (
                              <Package className='w-10 h-10 text-gray-400' />
                            )}
                          </div>

                          {/* Product Info */}
                          <div className='flex-1 min-w-0'>
                            <h3 className='font-semibold text-gray-900 text-base mb-1'>
                              {product.name}
                            </h3>

                            <div className='flex items-center space-x-2 mb-2'>
                              <span className='flex items-center text-xs text-gray-500'>
                                <Tag className='w-3 h-3 mr-1' />
                                {normalizedCategories.find(
                                  c => c.id === product.category_id
                                )?.name || '-'}
                              </span>
                              {product.sku && (
                                <span className='text-xs text-gray-400'>
                                  • {product.sku}
                                </span>
                              )}
                            </div>

                            {/* Price, Stock & Status */}
                            <div className='flex items-center justify-between mb-3'>
                              <div>
                                <p className='text-lg font-bold text-gray-900'>
                                  {formatCurrency(product.price)}
                                </p>
                                <p className='text-xs text-gray-500'>
                                  Stok:{' '}
                                  {product.stock_type === 'untracked' ||
                                  product.stock_type === 'Untracked' ||
                                  String(
                                    product.stock_type || ''
                                  ).toLowerCase() === 'untracked' ? (
                                    <span className='font-semibold text-green-600'>
                                      Unlimited
                                    </span>
                                  ) : product.stock !== null &&
                                    product.stock !== undefined ? (
                                    product.stock
                                  ) : (
                                    '-'
                                  )}
                                </p>
                              </div>
                              {getStatusBadge(product.stock, product.min_stock)}
                            </div>

                            {/* Action Buttons */}
                            <div className='flex gap-2'>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => handleEditProduct(product)}
                                className='flex-1'
                              >
                                <Edit className='w-4 h-4 mr-1' />
                                <span>Edit</span>
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                className='text-red-600 hover:text-red-700 flex-1'
                                onClick={() => handleDeleteProduct(product.id)}
                                disabled={deleteProductLoading}
                              >
                                <Trash2 className='w-4 h-4 mr-1' />
                                <span>Hapus</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              <div className='mt-6'>
                <ProductPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  isLoading={isPaginationLoading}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50'>
          <Card className='w-full max-w-md'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle>
                  {isEditingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                </CardTitle>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => setShowCategoryModal(false)}
                >
                  <X className='w-4 h-4' />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div>
                  <label className='block mb-2 text-sm font-medium text-gray-700'>
                    Nama Kategori <span className='text-red-500'>*</span>
                  </label>
                  <Input
                    placeholder='Masukkan nama kategori'
                    value={categoryFormData.name}
                    onChange={e =>
                      setCategoryFormData({
                        ...categoryFormData,
                        name: e.target.value,
                      })
                    }
                    className={formErrors.name ? 'border-red-500' : ''}
                  />
                  {formErrors.name && (
                    <p className='mt-1 text-xs text-red-500'>
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className='block mb-2 text-sm font-medium text-gray-700'>
                    Deskripsi (Opsional)
                  </label>
                  <Input
                    placeholder='Masukkan deskripsi'
                    value={categoryFormData.description}
                    onChange={e =>
                      setCategoryFormData({
                        ...categoryFormData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <ImageUpload
                  value={categoryImage}
                  onChange={setCategoryImage}
                  onRemove={() => setCategoryImage(null)}
                />

                <div className='flex gap-2 pt-4'>
                  <Button
                    variant='outline'
                    onClick={() => setShowCategoryModal(false)}
                    className='flex-1'
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleSaveCategory}
                    className='flex-1 bg-blue-600 hover:bg-blue-700'
                    disabled={saveCategoryLoading}
                  >
                    {saveCategoryLoading ? (
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    ) : (
                      <Save className='w-4 h-4 mr-2' />
                    )}
                    Simpan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50'>
          <Card className='w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle>
                  {isEditingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                </CardTitle>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => setShowProductModal(false)}
                >
                  <X className='w-4 h-4' />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {/* Business Type Info - Read Only */}
                {currentBusiness?.business_type && (
                  <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-blue-600 font-medium mb-1'>
                          Jenis Bisnis:
                        </p>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm font-semibold text-blue-800'>
                            {currentBusiness.business_type.name}
                          </span>
                        </div>
                        {currentBusiness.business_type.description && (
                          <p className='text-xs text-blue-600 mt-1'>
                            {currentBusiness.business_type.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Debug Info - Only show if business_type_id exists but business_type is missing */}
                {currentBusiness?.business_type_id &&
                  !currentBusiness?.business_type && (
                    <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4'>
                      <p className='text-xs text-yellow-700'>
                        ⚠️ Business type sedang dimuat... (ID:{' '}
                        {currentBusiness.business_type_id})
                      </p>
                    </div>
                  )}

                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      Nama Produk <span className='text-red-500'>*</span>
                    </label>
                    <Input
                      placeholder='Masukkan nama produk'
                      value={productFormData.name}
                      onChange={e =>
                        setProductFormData({
                          ...productFormData,
                          name: e.target.value,
                        })
                      }
                      className={formErrors.name ? 'border-red-500' : ''}
                    />
                    {formErrors.name && (
                      <p className='mt-1 text-xs text-red-500'>
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      Kategori <span className='text-red-500'>*</span>
                    </label>
                    <select
                      className={`w-full px-3 py-2 border rounded-md ${
                        formErrors.category_id ? 'border-red-500' : ''
                      }`}
                      value={productFormData.category_id}
                      onChange={e =>
                        setProductFormData({
                          ...productFormData,
                          category_id: e.target.value,
                        })
                      }
                    >
                      <option value=''>Pilih Kategori</option>
                      {normalizedCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.category_id && (
                      <p className='mt-1 text-xs text-red-500'>
                        {formErrors.category_id}
                      </p>
                    )}
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      SKU (Opsional)
                    </label>
                    <Input
                      placeholder='Auto-generate jika kosong'
                      value={productFormData.sku}
                      onChange={e =>
                        setProductFormData({
                          ...productFormData,
                          sku: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className='block mb-2 text-sm font-medium text-gray-700'>
                      Harga Jual <span className='text-red-500'>*</span>
                    </label>
                    <Input
                      type='text'
                      placeholder='0'
                      inputMode='numeric'
                      value={formatNumberInput(productFormData.price || '')}
                      onChange={e => {
                        // Get raw input from user (may contain dots from previous display)
                        const rawInput = e.target.value;

                        // CRITICAL: Extract ONLY digits, remove everything else (dots, spaces, etc)
                        // This MUST happen before storing in state
                        const numericOnly = rawInput.replace(/[^\d]/g, '');

                        // Only update if we have a valid numeric string (or empty)
                        // This prevents storing invalid values
                        if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
                          setProductFormData({
                            ...productFormData,
                            price: numericOnly,
                          });
                        }
                      }}
                      className={formErrors.price ? 'border-red-500' : ''}
                    />
                    {formErrors.price && (
                      <p className='mt-1 text-xs text-red-500'>
                        {formErrors.price}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className='block mb-2 text-sm font-medium text-gray-700'>
                    Harga Modal (Opsional)
                  </label>
                  <Input
                    type='text'
                    placeholder='0'
                    inputMode='numeric'
                    value={formatNumberInput(productFormData.cost || '')}
                    onChange={e => {
                      // Get raw input from user (may contain dots from previous display)
                      const rawInput = e.target.value;

                      // CRITICAL: Extract ONLY digits, remove everything else (dots, spaces, etc)
                      // This MUST happen before storing in state
                      const numericOnly = rawInput.replace(/[^\d]/g, '');

                      // Only update if we have a valid numeric string (or empty)
                      // This prevents storing invalid values
                      if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
                        setProductFormData({
                          ...productFormData,
                          cost: numericOnly,
                        });
                      }
                    }}
                    className={formErrors.cost ? 'border-red-500' : ''}
                  />
                  {formErrors.cost && (
                    <p className='mt-1 text-xs text-red-500'>
                      {formErrors.cost}
                    </p>
                  )}
                </div>

                {/* Stock Type Toggle */}
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                  <div className='flex items-start'>
                    <input
                      type='checkbox'
                      id='isServiceProduct'
                      checked={productFormData.stock_type === 'untracked'}
                      onChange={e => {
                        setProductFormData({
                          ...productFormData,
                          stock_type: e.target.checked
                            ? 'untracked'
                            : 'tracked',
                          stock: e.target.checked ? '0' : productFormData.stock,
                        });
                      }}
                      className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                    />
                    <label
                      htmlFor='isServiceProduct'
                      className='ml-3 block text-sm'
                    >
                      <span className='font-medium text-gray-700'>
                        Produk Jasa / Unlimited Stock
                      </span>
                      <p className='text-xs text-gray-600 mt-1'>
                        Centang ini untuk produk jasa seperti laundry, service,
                        atau konsultasi yang tidak memerlukan tracking stok
                        fisik
                      </p>
                    </label>
                  </div>
                </div>

                {/* Stock Fields - Only show if stock_type is tracked */}
                {productFormData.stock_type === 'tracked' && (
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div>
                      <label className='block mb-2 text-sm font-medium text-gray-700'>
                        Stok (Opsional)
                      </label>
                      <Input
                        type='text'
                        placeholder='0'
                        inputMode='numeric'
                        value={formatNumberInput(productFormData.stock || '')}
                        onChange={e => {
                          // Get raw input from user (may contain dots from previous display)
                          const rawInput = e.target.value;

                          // CRITICAL: Extract ONLY digits, remove everything else (dots, spaces, etc)
                          // This MUST happen before storing in state
                          const numericOnly = rawInput.replace(/[^\d]/g, '');

                          // Only update if we have a valid numeric string (or empty)
                          // This prevents storing invalid values
                          if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
                            setProductFormData({
                              ...productFormData,
                              stock: numericOnly,
                            });
                          }
                        }}
                        className={formErrors.stock ? 'border-red-500' : ''}
                      />
                      {formErrors.stock && (
                        <p className='mt-1 text-xs text-red-500'>
                          {formErrors.stock}
                        </p>
                      )}
                      {/* Debug info - show if business_type_id exists but business_type is missing */}
                      {currentBusiness?.business_type_id &&
                        !currentBusiness?.business_type && (
                          <p className='mt-1 text-xs text-yellow-600'>
                            ⚠️ Business type sedang dimuat...
                          </p>
                        )}
                    </div>

                    <div>
                      <label className='block mb-2 text-sm font-medium text-gray-700'>
                        Stok Minimum (Opsional)
                      </label>
                      <Input
                        type='text'
                        placeholder='10'
                        inputMode='numeric'
                        value={formatNumberInput(
                          productFormData.min_stock || ''
                        )}
                        onChange={e => {
                          // Get the raw input from user
                          const userInput = e.target.value;

                          // Remove ALL non-numeric characters immediately
                          // This ensures we NEVER store dots in formData.min_stock
                          const cleanedValue = userInput.replace(/[^\d]/g, '');

                          // Only update if we have a valid numeric string (or empty)
                          if (
                            cleanedValue === '' ||
                            /^\d+$/.test(cleanedValue)
                          ) {
                            setProductFormData({
                              ...productFormData,
                              min_stock: cleanedValue,
                            });
                          }
                        }}
                        className={formErrors.min_stock ? 'border-red-500' : ''}
                      />
                      {formErrors.min_stock && (
                        <p className='mt-1 text-xs text-red-500'>
                          {formErrors.min_stock}
                        </p>
                      )}
                      <p className='mt-1 text-xs text-gray-500'>
                        Produk akan ditandai "Stok Rendah" jika di bawah nilai
                        ini
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className='block mb-2 text-sm font-medium text-gray-700'>
                    Deskripsi (Opsional)
                  </label>
                  <textarea
                    className='w-full px-3 py-2 border rounded-md'
                    rows='3'
                    placeholder='Masukkan deskripsi produk'
                    value={productFormData.description}
                    onChange={e =>
                      setProductFormData({
                        ...productFormData,
                        description: e.target.value,
                      })
                    }
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
                            type='text'
                            inputMode='numeric'
                            placeholder={
                              productFormData.discount_type === 'percentage'
                                ? '0-100'
                                : '0'
                            }
                            value={
                              productFormData.discount_type === 'percentage'
                                ? productFormData.discount_value || ''
                                : formatNumberInput(
                                    productFormData.discount_value || ''
                                  )
                            }
                            onChange={e => {
                              // Get raw input from user (may contain dots from previous display)
                              const rawInput = e.target.value;

                              // CRITICAL: Extract ONLY digits, remove everything else (dots, spaces, etc)
                              // This MUST happen before storing in state
                              const numericOnly = rawInput.replace(
                                /[^\d]/g,
                                ''
                              );

                              // For percentage, limit to 100
                              if (
                                productFormData.discount_type === 'percentage'
                              ) {
                                const numVal = parseInt(numericOnly, 10);
                                if (!isNaN(numVal) && numVal > 100) {
                                  return; // Don't allow values > 100 for percentage
                                }
                              }

                              // Only update if we have a valid numeric string (or empty)
                              // This prevents storing invalid values
                              if (
                                numericOnly === '' ||
                                /^\d+$/.test(numericOnly)
                              ) {
                                setProductFormData({
                                  ...productFormData,
                                  discount_value: numericOnly,
                                });
                              }
                            }}
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
                                        parseFloat(
                                          productFormData.discount_value
                                        )
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
                                      : parseFloat(
                                          productFormData.discount_value
                                        )
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

                <ImageUpload
                  value={productImage}
                  onChange={setProductImage}
                  onRemove={() => setProductImage(null)}
                />

                <div className='flex gap-2 pt-4'>
                  <Button
                    variant='outline'
                    onClick={() => setShowProductModal(false)}
                    className='flex-1'
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleSaveProduct}
                    className='flex-1 bg-blue-600 hover:bg-blue-700'
                    disabled={saveProductLoading}
                  >
                    {saveProductLoading ? (
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    ) : (
                      <Save className='w-4 h-4 mr-2' />
                    )}
                    Simpan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
