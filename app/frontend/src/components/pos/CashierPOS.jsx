import {
  AlertCircle,
  Calculator,
  Clock,
  FileText,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  RotateCw,
  Scan,
  Search,
  ShoppingCart,
  Trash2,
  User,
} from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useBackgroundSync from '../../hooks/useBackgroundSync';
import { useAuth } from '../../contexts/AuthContext';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { transactionQueue, isOnline } from '../../db/indexedDB';
import { categoryService } from '../../services/category.service';
import { discountService } from '../../services/discount.service';
import { orderService } from '../../services/order.service';
import { productService } from '../../services/product.service';
import { shiftService } from '../../services/shift.service';
import offlineService from '../../services/offlineService';
import { debounce } from '../../utils/performance';
import { retryNetworkErrors } from '../../utils/retry.utils';
import CustomerSelectModal from '../modals/CustomerSelectModal';
import PaymentModal from '../modals/PaymentModal';
import PrintReceiptModal from '../modals/PrintReceiptModal';
import ReceiptModal from '../modals/ReceiptModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import OptimizedImage from '../ui/OptimizedImage';
import POSPagination from '../ui/POSPagination';
import { SkeletonProductCard } from '../ui/skeleton';
import { SkeletonPOSGrid } from '../ui/skeletons';
import UnpaidOrders from './UnpaidOrders';

// ✅ OPTIMIZATION: Memoized Product Card Component
const ProductCard = memo(({ product, onAddToCart }) => {
  // ✅ FIX: Check if product is unlimited (stock_type === 'untracked')
  const isUnlimited = product.stock_type === 'untracked';
  // ✅ FIX: Check if product is out of stock (only for tracked products)
  const isOutOfStock = !isUnlimited && (product.stock === null || product.stock === undefined || product.stock <= 0);
  
  return (
    <Card
      className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${
        isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={() => {
        if (isOutOfStock) {
          return; // Don't allow click if out of stock
        }
        onAddToCart(product);
      }}
    >
      <CardContent className='p-4'>
        <OptimizedImage
          src={
            product.image
              ? `${
                  process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'
                }/${product.image}`
              : null
          }
          alt={product.name}
          className='aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden'
          fallbackIcon={ShoppingCart}
          lazy={true}
        />
        <h3 className='font-semibold text-sm mb-2 line-clamp-2'>{product.name}</h3>
        <div className='flex items-center justify-between'>
          <span className='text-lg font-bold text-blue-600'>
            Rp{' '}
            {Number(product.price)
              .toLocaleString('id-ID', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })
              .replace(/,/g, '.')}
          </span>
          {isUnlimited ? (
            <span className='inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-semibold bg-green-500 text-white border-transparent shadow' title='Unlimited'>
              ∞
            </span>
          ) : (
            <span
              className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
                product.stock > 10
                  ? 'bg-primary text-primary-foreground border-transparent shadow'
                  : product.stock > 0
                  ? 'bg-yellow-500 text-white border-transparent shadow'
                  : 'bg-red-500 text-white border-transparent shadow'
              }`}
            >
              {product.stock ?? 0}
            </span>
          )}
        </div>
        {isOutOfStock && (
          <p className='text-xs text-red-600 mt-2 font-medium'>
            ⚠️ Stok habis
          </p>
        )}
      </CardContent>
    </Card>
  );
});
ProductCard.displayName = 'ProductCard';

const CashierPOS = () => {
  // Auth context
  const { user, currentBusiness, currentOutlet } = useAuth();
  const navigate = useNavigate();

  // Check if this is laundry business for deferred payment feature
  const isLaundryBusiness = currentBusiness?.business_type?.code === 'laundry';

  // Shift state
  const [activeShift, setActiveShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [hasNetworkError, setHasNetworkError] = useState(false); // Track network error
  const [shiftCheckComplete, setShiftCheckComplete] = useState(false); // Track if shift check completed

  // State Management
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false); // ✅ NEW: Modal untuk edit catatan
  const [editingItem, setEditingItem] = useState(null); // ✅ NEW: Item yang sedang diedit catatannya
  const [itemNote, setItemNote] = useState(''); // ✅ NEW: Catatan sementara saat edit
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'stock'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24); // ✅ OPTIMIZED: 24 products per page (reduces API calls)
  const [totalProducts, setTotalProducts] = useState(0);

  // Modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [printReceiptOpen, setPrintReceiptOpen] = useState(false);
  const [printOrderId, setPrintOrderId] = useState(null);

  // Discount / coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null); // {code, type: 'percent'|'amount', value, amount}

  // Queue number
  const [queueNumber, setQueueNumber] = useState('');

  // Barcode scanner state
  const [scanMode, setScanMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const scanInputRef = useRef(null);

  // Held orders
  const [heldOrders, setHeldOrders] = useState([]);
  const [showHeldOrders, setShowHeldOrders] = useState(false);

  // Tab state (untuk POS dan Unpaid Orders)
  const [activeTab, setActiveTab] = useState('pos');
  const [unpaidOrdersCount, setUnpaidOrdersCount] = useState(0);

  // ✅ OFFLINE-FIRST: Background sync for pending transactions
  const { pendingCount, syncProgress, manualSync } = useBackgroundSync(true);

  // ✅ OPTIMIZATION: Debounced search function
  const debouncedLoadProducts = useRef(
    debounce((page) => {
      loadProducts(page);
    }, 500) // 500ms delay
  ).current;

  // ✅ FIX: Load unpaid orders count untuk semua bisnis (bukan hanya laundry)
  // Karena tab "Belum Dibayar" mungkin muncul untuk semua bisnis
  const loadUnpaidOrdersCount = async (retryCount = 0) => {
    try {
      // ✅ OPTIMIZATION: Gunakan per_page=1 untuk count saja (lebih cepat)
      // Backend akan return pagination.total yang akurat
      const result = await orderService.getUnpaidOrders({
        per_page: 1,
        page: 1,
      });

      if (result.success) {
        // Prioritas 1: Gunakan pagination.total jika tersedia (paling akurat)
        if (result.data?.pagination?.total !== undefined) {
          const count = result.data.pagination.total;
          setUnpaidOrdersCount(count);
          // Only log if count > 0 or debug mode
          if (count > 0) {
            console.log('✅ Unpaid orders count loaded:', count);
          }
        } else {
          // Prioritas 2: Hitung dari data yang dikembalikan
          const data = result.data?.data || result.data || [];
          const count = Array.isArray(data) ? data.length : 0;
          setUnpaidOrdersCount(count);
          if (count > 0) {
            console.log('✅ Unpaid orders count (from data):', count);
          }
        }
      } else {
        // ✅ FIX: Handle timeout dengan retry (maksimal 2 kali)
        if (result.isTimeout && retryCount < 2) {
          console.log(
            `🔄 Retrying unpaid orders count load (${retryCount + 1}/2)...`
          );
          // Retry setelah 2 detik
          setTimeout(() => {
            loadUnpaidOrdersCount(retryCount + 1);
          }, 2000);
          return;
        }

        // Jika gagal setelah retry atau error lain, set ke 0 tanpa error toast (non-critical)
        // ✅ FIX: Hanya log error jika bukan timeout atau sudah retry maksimal
        if (!result.isTimeout || retryCount >= 2) {
          console.log(
            'ℹ️ Unpaid orders count: 0 (API unavailable or no unpaid orders)'
          );
        }
        setUnpaidOrdersCount(0);
      }
    } catch (error) {
      // ✅ FIX: Handle timeout dengan retry (maksimal 2 kali)
      if (
        (error?.code === 'ECONNABORTED' ||
          error?.message?.includes('timeout')) &&
        retryCount < 2
      ) {
        console.log(
          `🔄 Retrying unpaid orders count load (${retryCount + 1}/2)...`
        );
        setTimeout(() => {
          loadUnpaidOrdersCount(retryCount + 1);
        }, 2000);
        return;
      }

      // ✅ FIX: Hanya log error jika bukan timeout atau sudah retry maksimal
      if (!error?.message?.includes('timeout') || retryCount >= 2) {
        console.log('ℹ️ Unpaid orders count: 0 (Error or no unpaid orders)');
      }
      // Don't show error toast for count, just log and set to 0
      setUnpaidOrdersCount(0);
    }
  };

  // ✅ OPTIMIZATION: Load semua data secara parallel dengan retry logic
  useEffect(() => {
    const loadAllData = async () => {
      setLoadingShift(true);
      setLoading(true);

      // ✅ FIX: Load shift first separately to avoid cancellation issues
      // ✅ OPTIMIZATION: Menggunakan retry logic untuk shift loading
      let shiftResult;
      try {
        const shiftResponse = await retryNetworkErrors(
          () => shiftService.getActiveShift(),
          { maxRetries: 3, initialDelay: 1000 }
        );
        shiftResult = { status: 'fulfilled', value: shiftResponse };
      } catch (error) {
        shiftResult = { status: 'rejected', reason: error };
      }

      // ✅ OPTIMIZED: Load products first (visible data priority) then categories
      const loadInitialDataPromise = async () => {
        try {
          const params = {
            page: currentPage,
            per_page: itemsPerPage,
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            search: searchTerm || undefined,
            sort_field: sortBy,
            sort_direction: sortOrder,
            outlet_id: currentOutlet?.id,
          };

          const result = await productService.getInitialData(params, true);
          
          if (result.success && result.data) {
            // Extract products and categories from combined response
            const productsData = result.data.products || result.data;
            const categoriesData = result.data.categories || [];

            // ✅ PRIORITY 1: Set products FIRST (visible data) - instant UI update
            const productArray = Array.isArray(productsData)
              ? productsData
              : productsData?.data || productsData?.products || [];

            if (productArray.length > 0) {
              setProducts(productArray);
              setLoading(false); // ✅ Stop loading once products are visible
              if (productsData?.pagination) {
                setTotalProducts(productsData.pagination.total || productArray.length);
              } else {
                setTotalProducts(productArray.length);
              }
            }

            // ✅ PRIORITY 2: Set categories AFTER products (less critical, can appear slightly later)
            if (categoriesData.length > 0) {
              const categoryArray = Array.isArray(categoriesData) ? categoriesData : [];
              setCategories([{ id: 'all', name: 'Semua' }, ...categoryArray]);
            }

            return { success: true, fromInitialData: true };
          }
          
          // Fallback to separate calls if initial data fails
          throw new Error('Initial data failed, falling back to separate calls');
        } catch (error) {
          console.warn('⚠️ Initial data endpoint failed, using separate calls:', error);
          // ✅ OPTIMIZED: Load products FIRST (priority), then categories
          try {
            // Priority 1: Load products first (visible data)
            const productsResult = await retryNetworkErrors(() => loadProducts(currentPage), {
              maxRetries: 3,
              initialDelay: 1000,
            });
            setLoading(false); // Stop loading once products are loaded
            
            // Priority 2: Load categories in background (less critical)
            retryNetworkErrors(() => loadCategories(), {
              maxRetries: 3,
              initialDelay: 1000,
            }).catch(err => {
              // Silent fail for categories - not critical
              console.debug('Categories load failed (non-critical):', err);
              setCategories([{ id: 'all', name: 'Semua' }]); // Set default
            });
          } catch (error) {
            console.error('Failed to load products:', error);
            setLoading(false);
          }
          return { success: true, fromInitialData: false };
        }
      };

      // ✅ OPTIMIZATION: Load other data in parallel dengan retry logic
      const promises = [
        loadInitialDataPromise(),
      ];

      // ✅ FIX: Load unpaid orders count untuk semua bisnis (bukan hanya laundry)
      // Karena mungkin ada unpaid orders untuk bisnis lain juga
      promises.push(loadUnpaidOrdersCount());

      // Wait for other data (shift already handled)
      await Promise.allSettled(promises);

      // Handle shift result
      if (shiftResult.status === 'fulfilled') {
        const result = shiftResult.value;

        // Only log if not cancelled to reduce console noise
        if (!result?.cancelled) {
          console.log('🔍 Shift result:', result); // Debug log
        }

        // ✅ FIX: If request was cancelled, just wait for the original request to complete
        // Don't retry immediately - the duplicate prevention is now less aggressive
        if (result && result.cancelled) {
          // Silently wait - the original request will complete
          // Just mark loading as false and let useEffect handle the delay
          setLoadingShift(false);
          // Don't mark as complete yet - wait a bit for original request
          return;
        }

        // ✅ FIX: Hanya tampilkan error offline jika BENAR-BENAR timeout/network error
        if (result.isTimeout || result.isNetworkError) {
          // Silent - timeout/network error already handled with toast
          toast.error(
            'Tidak dapat terhubung ke server. Pastikan backend berjalan.',
            {
              duration: 3000,
            }
          );
          setActiveShift(null);
          setHasNetworkError(true);
        } 
        // ✅ FIX: Check response structure - backend returns { success: true, has_active_shift: true, data: {...} }
        // shiftService wraps it to { success: true, data: { success: true, has_active_shift: true, data: {...} } }
        else if (result.success === true) {
          // ✅ FIX: Check for nested response structure
          const hasActiveShift = result.data?.has_active_shift;
          const shiftData = result.data?.data || result.data;
          
          if (hasActiveShift === true && shiftData && (shiftData.id || shiftData.shift_id)) {
            // ✅ Shift berhasil dimuat
            setActiveShift(shiftData);
            setHasNetworkError(false);
            setShiftCheckComplete(true);
            console.log('✅ Active shift loaded:', shiftData);
          } else if (hasActiveShift === false) {
            // ✅ Tidak ada shift aktif (normal case)
            console.log('ℹ️ No active shift found - this is normal');
            setActiveShift(null);
            setHasNetworkError(false);
            setShiftCheckComplete(true);
          } else if (shiftData && (shiftData.id || shiftData.shift_id)) {
            // ✅ Fallback: Jika ada shift data meskipun has_active_shift tidak ada, gunakan shift data
            console.log('✅ Active shift loaded (fallback):', shiftData);
            setActiveShift(shiftData);
            setHasNetworkError(false);
            setShiftCheckComplete(true);
          } else {
            // ✅ No shift data found
            console.warn('⚠️ Shift data missing in response:', result);
            setActiveShift(null);
            setHasNetworkError(false);
            setShiftCheckComplete(true);
          }
        } else if (result.success === false && !result.cancelled) {
          // ✅ Error lain (bukan timeout/network/cancelled)
          console.warn(
            '⚠️ Shift check returned error:',
            result.error || result.message || 'Unknown error'
          );
          setActiveShift(null);
          setHasNetworkError(false);
          setShiftCheckComplete(true);
        } else {
          // ✅ Unexpected response format - try to extract data if possible
          if (!result.cancelled) {
            console.warn(
              '⚠️ Unexpected shift response format, attempting extraction:',
              result
            );
          }

          // Try different possible response structures
          const shiftData =
            result.data?.data ||
            result.data ||
            (result.has_active_shift ? result : null);

          if (
            shiftData &&
            (shiftData.id || shiftData.shift_id || shiftData.shift?.id)
          ) {
            // If it's nested, extract the actual shift object
            const actualShift = shiftData.shift || shiftData;
            setActiveShift(actualShift);
            setShiftCheckComplete(true); // ✅ Mark check as complete when shift extracted
            if (!result.cancelled) {
              console.log(
                '✅ Active shift extracted from unexpected response:',
                actualShift
              );
            }
          } else if (!result.cancelled) {
            // Only log and set if not cancelled
            setActiveShift(null);
            setShiftCheckComplete(true); // ✅ Mark check as complete even if extraction failed
            console.warn('⚠️ Could not extract shift data from response');
          } else {
            // Cancelled - just mark complete silently
            setShiftCheckComplete(true);
          }
          setHasNetworkError(false);
        }
      } else {
        // Promise rejected - kemungkinan network error
        console.error('❌ Shift request rejected:', shiftResult.reason);

        // ✅ FIX: Cek apakah benar network error atau error lain
        const error = shiftResult.reason;
        if (
          error?.code === 'ECONNABORTED' ||
          error?.message?.includes('timeout') ||
          error?.message?.includes('Network Error')
        ) {
          toast.error(
            'Tidak dapat terhubung ke server. Pastikan backend berjalan.',
            {
              duration: 3000,
            }
          );
          setHasNetworkError(true);
        } else {
          // Error lain (bukan network) - mungkin authentication
          setHasNetworkError(false);
        }
        setActiveShift(null);
      }

      setLoadingShift(false);
      setLoading(false);
      // ✅ Note: shiftCheckComplete will be set by useEffect or in shift result handlers
    };

    loadAllData();
  }, []);

  // Load products when sorting changes
  useEffect(() => {
    if (currentBusiness && currentOutlet) {
      loadProducts(currentPage);
    }
  }, [sortBy, sortOrder, currentBusiness, currentOutlet]);

  // ✅ FIX: Load unpaid orders count when tab changes (untuk semua bisnis)
  useEffect(() => {
    // Load count setiap kali tab berubah atau saat mount
    loadUnpaidOrdersCount();
  }, [activeTab]);

  // ✅ FIX: Auto-refresh unpaid orders count setiap 30 detik
  useEffect(() => {
    // Set interval untuk auto-refresh count unpaid orders
    const interval = setInterval(() => {
      loadUnpaidOrdersCount();
    }, 30000); // 30 detik

    return () => clearInterval(interval);
  }, []); // ✅ Hanya sekali saat mount

  // Load active shift dengan timeout dan error handling yang lebih baik
  const loadActiveShift = async () => {
    setLoadingShift(true);
    try {
      const result = await shiftService.getActiveShift();

      // Only log if not cancelled to reduce console noise
      if (!result?.cancelled) {
        console.log('🔍 loadActiveShift result:', result); // Debug log
      }

      // ✅ FIX: Check if request was cancelled
      if (result && result.cancelled) {
        // Silently skip - cancelled requests are expected (duplicate prevention)
        setLoadingShift(false);
        return; // Don't update state if request was cancelled
      }

      // ✅ FIX: Hanya tampilkan error offline jika BENAR-BENAR timeout/network error
      if (result.isTimeout || result.isNetworkError) {
        console.warn('⚠️ Shift check gagal (timeout/network), mode offline');
        toast.error(
          'Tidak dapat terhubung ke server. Pastikan backend berjalan.',
          {
            duration: 3000,
          }
        );
        setActiveShift(null);
        setHasNetworkError(true);
        return;
      }

      // ✅ Reset network error flag jika request berhasil
      setHasNetworkError(false);

      if (result.data?.has_active_shift === true) {
        // ✅ Shift berhasil dimuat (cek data langsung, bukan result.success)
        setActiveShift(result.data.data);
        setShiftCheckComplete(true); // ✅ Mark check as complete
        toast.success('Koneksi server berhasil!');
        console.log('✅ Active shift loaded');
      } else if (result.data?.has_active_shift === false) {
        // ✅ Tidak ada shift aktif (normal case) - JANGAN tampilkan error offline
        console.log('ℹ️ No active shift found - this is normal');
        setActiveShift(null);
        setShiftCheckComplete(true); // ✅ Mark check as complete
        // JANGAN redirect atau tampilkan error
      } else if (result.success === false && !result.cancelled) {
        // ✅ Error lain (bukan cancelled) - log warning, bukan error
        console.warn(
          '⚠️ Shift check returned error:',
          result.error || 'Unknown error'
        );
        setActiveShift(null);
        setShiftCheckComplete(true); // ✅ Mark check as complete
      } else {
        // ✅ Unexpected response format - try to extract data if possible
        // Only log if not cancelled to reduce console noise
        if (!result.cancelled) {
          console.warn('⚠️ Unexpected shift response format:', result);
        }
        // Try to extract shift data anyway if it exists
        if (result.data?.data) {
          setActiveShift(result.data.data);
          setShiftCheckComplete(true); // ✅ Mark check as complete
          if (!result.cancelled) {
            console.log('✅ Active shift extracted from unexpected response');
          }
        } else if (!result.cancelled) {
          // Only set and log if not cancelled
          setActiveShift(null);
          setShiftCheckComplete(true); // ✅ Mark check as complete
        } else {
          // Cancelled - just mark complete
          setShiftCheckComplete(true);
        }
      }
    } catch (error) {
      console.error('❌ Error loading active shift:', error);

      // ✅ FIX: Cek apakah benar network error
      if (
        error.message === 'Request timeout' ||
        error.code === 'ECONNABORTED' ||
        error.message?.includes('timeout') ||
        error.message?.includes('Network Error') ||
        error.message?.includes('terhubung ke server')
      ) {
        // Silent - network/timeout error already handled
        toast.error(
          'Tidak dapat terhubung ke server. Pastikan backend berjalan.',
          {
            duration: 3000,
          }
        );
        setActiveShift(null);
        setHasNetworkError(true);
      } else {
        // Error lainnya (bukan network error) - mungkin authentication
        setActiveShift(null);
        setHasNetworkError(false);
        // JANGAN redirect otomatis
      }
    } finally {
      setLoadingShift(false);
    }
  };

  // ✅ loadInitialData dihapus - logic dipindahkan ke useEffect parallel loading

  const loadProducts = async (page = 1, retryCount = 0) => {
    const maxRetries = 2;
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
      console.log('📦 Product result:', result); // DEBUG

      // Handle timeout - retry jika masih dalam batas
      if (result.isTimeout && retryCount < maxRetries) {
        console.warn(
          `⚠️ Products request timeout, retrying... (${
            retryCount + 1
          }/${maxRetries})`
        );
        // Retry setelah 1 detik
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadProducts(page, retryCount + 1);
      }

      if (result.isTimeout) {
        console.warn(
          '⚠️ Products request timeout setelah retry, using empty array'
        );
        setProducts([]);
        setTotalProducts(0);
        toast.error(
          '⚠️ Timeout saat memuat produk. Pastikan backend berjalan.',
          {
            duration: 4000,
          }
        );
        return { success: false, isTimeout: true, productsCount: 0 };
      }

      if (result.success) {
        // Handle both array and object response
        const productData = Array.isArray(result.data)
          ? result.data
          : result.data?.data || result.data?.products || [];
        // Removed excessive console.log

        if (productData.length === 0) {
          console.warn('⚠️ No products found');
          setProducts([]);
          setTotalProducts(0);
          return { success: true, productsCount: 0 };
        } else {
          setProducts(productData);

          // Set pagination info
          if (result.data?.pagination) {
            setTotalProducts(
              result.data.pagination.total || productData.length
            );
          } else {
            setTotalProducts(productData.length);
          }
          return { success: true, productsCount: productData.length };
        }
      } else {
        // Tidak tampilkan error toast untuk user experience yang lebih baik
        // Error akan ditangani oleh UI loading state
        return { success: false, error: result.error || result.message };
      }
    } catch (error) {
      console.error('Error loading products:', error);
      // Tidak tampilkan error toast untuk user experience yang lebih baik
      // Error akan ditangani oleh UI loading state
      if (retryCount < maxRetries) {
        // Retry untuk network errors
        console.warn(
          `⚠️ Network error, retrying... (${retryCount + 1}/${maxRetries})`
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadProducts(page, retryCount + 1);
      }
      return { success: false, error: error.message };
    }
  };

  // Handle refresh - ringan seperti EmployeeManagement
  const handleRefresh = async () => {
    setRefreshingData(true);
    try {
      // Reset loading states
      setProducts([]);
      setCategories([{ id: 'all', name: 'Semua' }]);

      // ✅ OPTIMIZATION: Load ulang semua data POS (products, categories, shift) secara parallel
      // Tapi jangan load unpaid count di refresh (hanya saat tab berubah)
      const [shiftResult, productsResult, categoriesResult] =
        await Promise.allSettled([
          shiftService.getActiveShift(),
          loadProducts(currentPage),
          loadCategories(),
        ]);

      // ✅ FIX: Load unpaid count untuk semua bisnis saat refresh
      // Jangan await, biarkan background load
      loadUnpaidOrdersCount().catch(err => {
        console.error('Error refreshing unpaid count:', err);
      });

      // Handle shift result
      if (shiftResult.status === 'fulfilled') {
        const result = shiftResult.value;
        if (result.isTimeout || result.isNetworkError) {
          setActiveShift(null);
          setHasNetworkError(true);
        } else if (result.data?.has_active_shift === true) {
          setActiveShift(result.data.data);
          setHasNetworkError(false);
        } else {
          setActiveShift(null);
          setHasNetworkError(false);
        }
      }

      // Check if products loaded successfully
      if (productsResult.status === 'fulfilled') {
        const productResult = productsResult.value;
        // Check if products were actually loaded
        if (productResult && productResult.success === true) {
          if (productResult.productsCount > 0) {
            toast.success(
              `✅ Data POS berhasil dimuat ulang (${productResult.productsCount} produk)`,
              {
                duration: 2000,
              }
            );
          } else {
            toast.warning('⚠️ Tidak ada produk ditemukan', {
              duration: 3000,
            });
          }
        } else {
          // Tidak tampilkan error toast untuk user experience yang lebih baik
          // Error akan ditangani oleh UI loading state
        }
      } else {
        console.error('Products refresh failed:', productsResult.reason);
        // Tidak tampilkan error toast untuk user experience yang lebih baik
        // Error akan ditangani oleh UI loading state
      }

      // Check if categories loaded successfully
      if (categoriesResult.status === 'fulfilled') {
        // loadCategories already handles the result
      } else {
        console.error('Categories refresh failed:', categoriesResult.reason);
      }
    } catch (error) {
      console.error('Error refreshing POS data:', error);
      toast.error('❌ Gagal memuat ulang data POS', { duration: 3000 });
    } finally {
      setRefreshingData(false);
    }
  };

  // Handle full page refresh
  const handleFullRefresh = () => {
    if (
      window.confirm(
        'Yakin ingin me-refresh halaman? Data yang belum tersimpan akan hilang.'
      )
    ) {
      window.location.reload();
    }
  };

  const loadCategories = async () => {
    try {
      // ✅ OPTIMIZATION: Menggunakan retry logic untuk categories
      const result = await retryNetworkErrors(() => categoryService.getAll(), {
        maxRetries: 3,
        initialDelay: 1000,
      });
      // Removed excessive console.log

      // Handle timeout
      if (result.isTimeout) {
        // Silent - timeout already handled with default categories
        setCategories([{ id: 'all', name: 'Semua' }]);
        return; // Early return, tidak tampilkan error
      }

      if (result.success) {
        // Handle both array and object response
        const categoryData = Array.isArray(result.data)
          ? result.data
          : result.data?.data || result.data?.categories || [];
        // Removed excessive console.log
        setCategories([{ id: 'all', name: 'Semua' }, ...categoryData]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Tidak tampilkan error untuk timeout
      // Set default categories jika error
      setCategories([{ id: 'all', name: 'Semua' }]);
    }
  };

  // Handle pagination with prefetching
  const handlePageChange = page => {
    setCurrentPage(page);
    loadProducts(page);
    
    // ✅ NEW: Prefetch next page in background for faster browsing
    const totalPages = Math.ceil(totalProducts / itemsPerPage);
    if (page < totalPages) {
      // Prefetch next page quietly
      const nextPageParams = {
        page: page + 1,
        per_page: itemsPerPage,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        sort_field: sortBy,
        sort_direction: sortOrder,
        outlet_id: currentOutlet?.id,
      };
      // Load in background (don't await, don't set state)
      productService.getAll(nextPageParams).catch(err => {
        // Silent fail for prefetch
        console.debug('Prefetch failed (non-critical):', err);
      });
    }
  };

  // ✅ OPTIMIZATION: Handle search with debounced loading
  const handleSearch = value => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching

    // Use debounced function
    debouncedLoadProducts(1);
  };

  // Handle category change with pagination reset - langsung tanpa debounce (user action)
  const handleCategoryChange = category => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to first page when changing category
    loadProducts(1); // Langsung load karena ini user action
  };

  // Handle sorting change - langsung tanpa debounce (user action)
  const handleSortChange = field => {
    if (sortBy === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending order
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
    loadProducts(1); // Langsung load karena ini user action
  };

  // Calculate totals with discount
  const calculateSubtotal = () =>
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (!appliedDiscount) return 0;
    if (appliedDiscount.type === 'percent') {
      return Math.round((appliedDiscount.value / 100) * subtotal);
    }
    return Math.min(appliedDiscount.value, subtotal);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscountAmount();
    const tax = subtotal * 0.1; // 10% tax
    return Math.max(subtotal - discount + tax, 0);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Masukkan kode kupon');
      return;
    }

    try {
      const subtotal = calculateSubtotal();
      const res = await discountService.validate(couponCode.trim(), subtotal);

      if (res.success) {
        const data = res.data?.data || res.data;
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
        toast.error(res.message || 'Kupon tidak valid');
      }
    } catch (e) {
      console.error('Error applying discount:', e);
      setAppliedDiscount(null);
      toast.error('Gagal menerapkan kupon');
    }
  };

  // Expose helpers for existing usages
  const getSubtotal = () => calculateSubtotal();
  const getTotalAmount = () => calculateTotal();

  // Cart Management
  // Handle barcode scan
  const handleBarcodeScan = async (barcode) => {
    if (!barcode || !barcode.trim()) return;

    try {
      // Search product by barcode/SKU
      const result = await productService.getAll({
        search: barcode.trim(),
        per_page: 10,
      });

      if (result.success) {
        const productData = Array.isArray(result.data)
          ? result.data
          : result.data?.data || result.data?.products || [];

        // Find exact match by SKU or barcode
        const foundProduct = productData.find(
          (p) =>
            p.sku?.toLowerCase() === barcode.trim().toLowerCase() ||
            p.barcode?.toLowerCase() === barcode.trim().toLowerCase() ||
            p.name?.toLowerCase().includes(barcode.trim().toLowerCase())
        );

        if (foundProduct) {
          // ✅ FIX: Check stock only for tracked products
          const isUnlimited = foundProduct.stock_type === 'untracked';
          if (!isUnlimited && (foundProduct.stock === null || foundProduct.stock === undefined || foundProduct.stock <= 0)) {
            toast.error(`⚠️ ${foundProduct.name} stok habis. Tidak bisa dipilih.`);
            return;
          }

          // Add to cart
          addToCart(foundProduct);
          
          // Clear barcode input
          setBarcodeInput('');
          
          // Auto focus kembali untuk scan berikutnya
          if (scanInputRef.current) {
            setTimeout(() => {
              scanInputRef.current?.focus();
            }, 100);
          }
        } else {
          toast.error(`Produk dengan barcode "${barcode}" tidak ditemukan`);
          setBarcodeInput('');
        }
      } else {
        toast.error('Gagal mencari produk');
        setBarcodeInput('');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      toast.error('Terjadi kesalahan saat scan barcode');
      setBarcodeInput('');
    }
  };

  // Handle scan input key press (Enter from barcode scanner)
  const handleScanKeyPress = (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      e.preventDefault();
      handleBarcodeScan(barcodeInput);
    }
  };

  // Toggle scan mode
  const toggleScanMode = () => {
    setScanMode(!scanMode);
    setBarcodeInput('');
  };

  // Auto focus scan input when scan mode is enabled
  useEffect(() => {
    if (scanMode && scanInputRef.current) {
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    }
  }, [scanMode]);

  const addToCart = product => {
    // ✅ FIX: Check if product is unlimited (stock_type === 'untracked')
    const isUnlimited = product.stock_type === 'untracked';
    
    // ✅ FIX: Only check stock for tracked products
    if (!isUnlimited) {
      if (product.stock === null || product.stock === undefined || product.stock <= 0) {
        toast.error('⚠️ Produk ini stok habis. Tidak bisa dipilih.');
        return;
      }
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      // ✅ FIX: Only check stock limit for tracked products
      if (!isUnlimited && existingItem.quantity >= product.stock) {
        toast.error('⚠️ Stok tidak mencukupi');
        return;
      }
      setCart(
        cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, note: item.note || '' }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1, note: '' }]);
    }
    toast.success(`${product.name} ditambahkan ke keranjang`);
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      const product = products.find(p => p.id === id);
      // ✅ FIX: Only check stock limit for tracked products (not unlimited)
      const isUnlimited = product?.stock_type === 'untracked';
      if (!isUnlimited && product?.stock !== null && product?.stock !== undefined && newQuantity > product.stock) {
        toast.error('⚠️ Stok tidak mencukupi');
        return;
      }
      setCart(
        cart.map(item =>
          item.id === id ? { ...item, quantity: newQuantity, note: item.note || '' } : item
        )
      );
    }
  };

  const removeFromCart = id => {
    setCart(cart.filter(item => item.id !== id));
    toast.success('Item dihapus dari keranjang');
  };

  // ✅ NEW: Fungsi untuk membuka modal edit catatan
  const openNoteModal = (item) => {
    console.log('📝 Opening note modal for item:', item);
    setEditingItem(item);
    setItemNote(item.note || item.notes || '');
    setNoteModalOpen(true);
  };

  // ✅ NEW: Fungsi untuk menyimpan catatan
  const saveItemNote = () => {
    if (!editingItem) return;
    
    setCart(
      cart.map(item =>
        item.id === editingItem.id
          ? { ...item, note: itemNote.trim() }
          : item
      )
    );
    
    setNoteModalOpen(false);
    setEditingItem(null);
    setItemNote('');
    
    if (itemNote.trim()) {
      toast.success('Catatan disimpan');
    } else {
      toast.success('Catatan dihapus');
    }
  };

  const clearCart = () => {
    if (window.confirm('Hapus semua item dari keranjang?')) {
      setCart([]);
      setSelectedCustomer(null);
      setQueueNumber('');
      toast.success('Keranjang dikosongkan');
    }
  };

  // Calculations
  const getTax = () => {
    return getSubtotal() * 0.1; // 10% tax
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // Filtering
  const filteredProducts = products.filter(product => {
    const matchesCategory =
      selectedCategory === 'all' || product.category_id === selectedCategory;
    const matchesSearch = product.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Payment Processing
  const handleOpenPayment = () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }
    setPaymentModalOpen(true);
  };

  // Helper function to create order (reusable for QRIS)
  const createOrder = async (deferredPayment = false, paymentData = null) => {
    // ✅ FIX: Use discount from paymentData if available (from PaymentModal), otherwise use appliedDiscount from cart
    const discountFromPayment = paymentData?.discount || 0;
    const discountCodeFromPayment = paymentData?.discountCode || null;
    const finalDiscount = discountFromPayment || calculateDiscountAmount();
    const finalDiscountCode =
      discountCodeFromPayment || appliedDiscount?.code || null;

    // ✅ FIX: Use customer_id from paymentData if available (from PaymentModal), otherwise use selectedCustomer from CashierPOS
    const customerFromPayment = paymentData?.customer || null;
    const customerIdFromPayment = paymentData?.customer_id || null;
    const finalCustomer = customerFromPayment || selectedCustomer;
    const finalCustomerId = customerIdFromPayment || finalCustomer?.id || null;

    const orderData = {
      customer_id: finalCustomerId,
      items: cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        notes: item.note || item.notes || null, // ✅ NEW: Kirim catatan ke backend
      })),
      discount: finalDiscount,
      coupon_code: finalDiscountCode,
      tax: getTax(),
      notes: finalCustomer
        ? `Pelanggan: ${finalCustomer.name}`
        : 'Walk-in Customer',
      // Tambahkan flag untuk deferred payment
      deferred_payment: deferredPayment,
      // Tambahkan queue number jika ada
      queue_number: queueNumber.trim() || null,
    };

    console.log('💳 Creating order:', orderData);

    // ✅ OFFLINE-FIRST: Try to create order online first
    try {
    const orderResult = await orderService.create(orderData);
    console.log('✅ Order result:', orderResult);

    if (!orderResult.success) {
      const errorMsg =
        orderResult.error || orderResult.message || 'Gagal membuat order';
      console.error('❌ Order creation failed:', errorMsg);
      throw new Error(errorMsg);
    }

    // Handle double-nested response structure
    const order = orderResult.data?.data ?? orderResult.data;
    console.log('📦 Order created:', order);
    return order;
    } catch (error) {
      // ✅ OFFLINE HANDLING: If offline or network error, queue transaction
      if (!isOnline() || error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        console.log('📦 Offline: Queuing transaction for background sync');
        
        // Add to offline queue
        const queueId = await transactionQueue.add(orderData);
        console.log('✅ Transaction queued with ID:', queueId);
        
        // Show toast
        toast.success(
          '⚠️ Mode Offline\nTransaksi disimpan dan akan disinkronkan saat online.',
          { duration: 5000 }
        );
        
        // Return a mock order object for UI
        return {
          id: `queue-${queueId}`,
          order_number: `QUEUED-${Date.now()}`,
          queued: true,
          queue_id: queueId,
        };
      }
      
      // Re-throw error if not network related
      throw error;
    }
  };

  const handlePaymentComplete = async paymentData => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Memproses order...');

      // Check if this is deferred payment (Bayar Nanti)
      const isDeferred = paymentData.method === 'deferred';

      console.log('💳 Processing payment:', {
        method: paymentData.method,
        isDeferred,
        cartTotal: getTotalAmount(),
        discount: paymentData.discount,
        discountCode: paymentData.discountCode,
      });

      // Create order (dengan flag deferred jika perlu, dan paymentData untuk discount)
      const order = await createOrder(isDeferred, paymentData);

      console.log('✅ Order created successfully:', {
        orderId: order.id,
        orderNumber: order.order_number,
        isDeferred,
      });

      // Jika deferred payment, skip payment processing
      if (isDeferred) {
        toast.dismiss(loadingToast);

        // Show success message untuk deferred payment
        const itemCount = cart.length;
        const itemText = itemCount === 1 ? 'item' : 'item';

        toast.success(
          `✅ Order Berhasil Dibuat!\nOrder #${order.order_number}\n` +
            `Pembayaran ditunda sampai pengambilan\n` +
            `Total: ${formatCurrency(getTotalAmount())}\n` +
            `${itemCount} ${itemText}`,
          {
            duration: 5000,
            style: {
              minWidth: '300px',
            },
          }
        );

        // Prepare receipt data untuk tiket pengambilan
        const receiptData = {
          orderNumber: order.order_number || `ORD-${order.id}`,
          date: new Date(),
          cashierName: user?.name || 'Kasir',
          customerName: selectedCustomer?.name || null,
          businessName: currentBusiness?.name || 'KASIR POS SYSTEM',
          businessAddress:
            currentOutlet?.address || currentBusiness?.address || '',
          businessPhone: currentOutlet?.phone || currentBusiness?.phone || '',
          outletName: currentOutlet?.name || 'Main Outlet',
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            notes: item.note || item.notes || null, // ✅ NEW: Include notes in receipt data
          })),
          subtotal: getSubtotal(),
          tax: getTax(),
          discount: calculateDiscountAmount(),
          discountCode: appliedDiscount?.code || null,
          total: getTotalAmount(),
          paymentMethod: 'deferred',
          paymentStatus: 'Belum Dibayar - Bayar Saat Pengambilan',
          footerMessage:
            'Harap simpan tiket ini untuk pengambilan. Pembayaran dilakukan saat mengambil pesanan.',
        };

        setLastReceipt(receiptData);
        setPrintOrderId(order.id);
        setPrintReceiptOpen(true);

        // Clear cart and customer
        setCart([]);
        setSelectedCustomer(null);
        setAppliedDiscount(null);
        setPaymentModalOpen(false);
        return;
      }

      // Continue with normal payment processing for non-deferred payments
      toast.dismiss(loadingToast);

      // Update loading toast
      toast.loading('Memproses pembayaran...', { id: loadingToast });

      // Process payment untuk method lain
      const paymentResult = await orderService.processPayment(order.id, {
        amount: paymentData.amount,
        method: paymentData.method,
        notes: `Kembalian: ${formatCurrency(paymentData.change)}`,
        reference_number: paymentData.reference_number || null, // ✅ NEW: Include reference number
      });

      if (!paymentResult.success) {
        toast.dismiss(loadingToast);
        const paymentError =
          paymentResult.error || 'Gagal memproses pembayaran';
        toast.error(`❌ Pembayaran gagal: ${paymentError}`, {
          duration: 5000,
        });
        throw new Error(paymentError);
      }

      // If QRIS via Midtrans, open Snap popup and wait for result
      const snapToken =
        paymentResult.data?.data?.snap_token || paymentResult.data?.snap_token;
      const clientKey =
        paymentResult.data?.data?.client_key || paymentResult.data?.client_key;
      if (paymentData.method === 'qris' && snapToken && clientKey) {
        // Ensure Snap.js loaded
        await new Promise(resolve => {
          if (window.snap) return resolve();
          const script = document.createElement('script');
          script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
          script.setAttribute('data-client-key', clientKey);
          script.onload = resolve;
          document.body.appendChild(script);
        });

        toast.loading('Menunggu pembayaran QRIS...', { id: loadingToast });

        await new Promise((resolve, reject) => {
          window.snap.pay(snapToken, {
            onSuccess: function () {
              toast.dismiss(loadingToast);
              toast.success('Pembayaran QRIS berhasil');
              resolve();
            },
            onPending: function () {
              toast.dismiss(loadingToast);
              // ✅ FIX: Cek apakah toast pending sudah pernah ditampilkan untuk order ini
              const toastKey = `qris_pending_${order.id}`;
              const hasShownToast = sessionStorage.getItem(toastKey);
              if (!hasShownToast) {
                toast('Pembayaran QRIS pending. Menunggu konfirmasi.', {
                  icon: '⏳',
                  duration: 5000,
                });
                // ✅ Simpan flag untuk mencegah toast muncul lagi saat reload
                sessionStorage.setItem(toastKey, 'true');
              }
              resolve();
            },
            onError: function () {
              toast.dismiss(loadingToast);
              toast.error('Pembayaran QRIS gagal');
              reject(new Error('QRIS payment failed'));
            },
            onClose: function () {
              toast.dismiss(loadingToast);
              toast('QRIS ditutup sebelum selesai.', { icon: '⚠️' });
              resolve();
            },
          });
        });
      } else {
        // Dismiss loading and show success
        toast.dismiss(loadingToast);
      }

      // Show detailed success message
      const itemCount = cart.length;
      const itemText = itemCount === 1 ? 'item' : 'item';
      const paymentMethodText =
        {
          cash: 'Tunai',
          card: 'Kartu',
          transfer: 'Transfer',
          qris: 'QRIS',
        }[paymentData.method] || paymentData.method;

      toast.success(
        `✅ Transaksi Berhasil!\nOrder #${
          order.order_number
        }\n${itemCount} ${itemText} • ${paymentMethodText} • ${formatCurrency(
          getTotalAmount()
        )}\nKembalian: ${formatCurrency(paymentData.change)}`,
        {
          duration: 5000,
          style: {
            minWidth: '300px',
          },
        }
      );

      // ✅ FIX: Get customer from paymentData if available (from PaymentModal), otherwise use selectedCustomer
      const customerFromPayment = paymentData?.customer || null;
      const finalCustomerForReceipt = customerFromPayment || selectedCustomer;

      // Prepare receipt data (legacy modal)
      const receiptData = {
        orderNumber: order.order_number || `ORD-${order.id}`,
        date: new Date(),
        cashierName: user?.name || 'Kasir',
        customerName: finalCustomerForReceipt?.name || null,
        businessName: currentBusiness?.name || 'KASIR POS SYSTEM',
        businessAddress:
          currentOutlet?.address || currentBusiness?.address || '',
        businessPhone: currentOutlet?.phone || currentBusiness?.phone || '',
        outletName: currentOutlet?.name || 'Main Outlet',
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.note || item.notes || null, // ✅ NEW: Include notes in receipt data
        })),
        subtotal: getSubtotal(),
        tax: getTax(),
        discount: calculateDiscountAmount(),
        discountCode: appliedDiscount?.code || null,
        total: getTotalAmount(),
        paymentMethod: paymentData.method,
        amountPaid: paymentData.amount,
        change: paymentData.change,
        footerMessage: 'Barang yang sudah dibeli tidak dapat dikembalikan',
      };

      setLastReceipt(receiptData);

      // Open detailed receipt print modal using backend data
      setPrintOrderId(order.id);
      setPrintReceiptOpen(true);

      // Clear cart and customer
      setCart([]);
      setSelectedCustomer(null);
      setQueueNumber('');

      // Reload products to update stock
      await loadProducts();

      // Optionally still allow legacy receipt modal if needed
      // setReceiptModalOpen(true);

      return true;
    } catch (error) {
      console.error('Payment error:', error);

      // Show detailed error message
      let errorMessage = 'Terjadi kesalahan saat memproses transaksi';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      // Untuk deferred payment, error bisa terjadi saat create order
      const isDeferred = error.paymentData?.method === 'deferred';
      if (isDeferred) {
        toast.error(
          `❌ Gagal membuat order untuk Bayar Nanti:\n${errorMessage}`,
          {
            duration: 5000,
          }
        );
        return; // Early return untuk deferred payment error
      }

      // Check for specific error types
      if (errorMessage.includes('shift')) {
        toast.error(
          `⚠️ Shift Belum Dibuka\n${errorMessage}\n\nSilakan buka shift terlebih dahulu di menu Shift.`,
          {
            duration: 7000,
            style: {
              minWidth: '350px',
            },
          }
        );
      } else if (
        errorMessage.includes('stock') ||
        errorMessage.includes('stok')
      ) {
        toast.error(
          `⚠️ Stok Tidak Cukup\n${errorMessage}\n\nSilakan kurangi jumlah item atau pilih produk lain.`,
          {
            duration: 6000,
            style: {
              minWidth: '350px',
            },
          }
        );
      } else {
        toast.error(
          `❌ Transaksi Gagal\n${errorMessage}\n\nSilakan coba lagi atau hubungi supervisor.`,
          {
            duration: 6000,
            style: {
              minWidth: '350px',
            },
          }
        );
      }

      throw error;
    }
  };

  // Customer Selection
  const handleSelectCustomer = customer => {
    setSelectedCustomer(customer);
    if (customer) {
      toast.success(`Pelanggan: ${customer.name}`);
    } else {
      toast.success('Pelanggan: Walk-in');
    }
  };

  // Hold Order
  const handleHoldOrder = () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }

    const heldOrder = {
      id: Date.now(),
      cart: [...cart],
      customer: selectedCustomer,
      timestamp: new Date(),
    };

    setHeldOrders([...heldOrders, heldOrder]);
    setCart([]);
    setSelectedCustomer(null);
    toast.success('Order berhasil ditahan');
  };

  const handleRecallOrder = heldOrder => {
    setCart(heldOrder.cart);
    setSelectedCustomer(heldOrder.customer);
    setHeldOrders(heldOrders.filter(order => order.id !== heldOrder.id));
    setShowHeldOrders(false); // Close held orders list after recall
    toast.success('Order berhasil dipulihkan');
  };

  const handleDeleteHeldOrder = (heldOrderId) => {
    if (window.confirm('Hapus order yang ditahan ini?')) {
      setHeldOrders(heldOrders.filter(order => order.id !== heldOrderId));
      toast.success('Order ditahan dihapus');
    }
  };

  // Calculate total for held order
  const getHeldOrderTotal = (heldOrder) => {
    return heldOrder.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Formatting
  const formatCurrency = amount => {
    // Gunakan titik (.) sebagai separator ribuan
    return (
      'Rp ' +
      Number(amount)
        .toLocaleString('id-ID', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        .replace(/,/g, '.')
    );
  };

  // ✅ FIX: Delay showing "no shift" error to allow retry to complete
  // But if shift is already loaded, mark as complete immediately
  useEffect(() => {
    if (activeShift) {
      // If shift is already loaded, mark as complete immediately
      setShiftCheckComplete(true);
    } else if (!loadingShift) {
      // If loading is done but no shift, wait a bit to allow retries
      const timer = setTimeout(() => {
        setShiftCheckComplete(true);
      }, 1500); // Wait 1.5 seconds after loading completes to allow retries
      return () => clearTimeout(timer);
    } else {
      // Still loading, reset complete flag
      setShiftCheckComplete(false);
    }
  }, [loadingShift, activeShift]);

  // ✅ KEYBOARD SHORTCUTS for POS
  useKeyboardShortcuts(
    {
      Enter: () => {
        // Enter: Open payment modal (checkout)
        if (cart.length > 0) {
          handleOpenPayment();
        }
      },
      Escape: () => {
        // ESC: Clear cart
        if (cart.length > 0) {
          clearCart();
        }
      },
      F3: () => {
        // F3: Focus search
        const searchInput = document.querySelector('[placeholder*="Cari produk"]');
        if (searchInput) searchInput.focus();
      },
      F4: () => {
        // F4: Open customer modal
        setCustomerModalOpen(true);
      },
      F5: () => {
        // F5: Refresh products - prevent default browser reload (handled by useKeyboardShortcuts)
        if (!refreshingData && !loading) {
          handleRefresh();
        }
      },
      F6: () => {
        // F6: Hold order
        if (cart.length > 0) {
          handleHoldOrder();
        }
      },
      Digit1: () => {
        // Number 1: Select first category
        if (categories.length > 0) handleCategoryChange(categories[0].id);
      },
      Digit2: () => {
        // Number 2: Select second category
        if (categories.length > 1) handleCategoryChange(categories[1].id);
      },
      Digit3: () => {
        // Number 3: Select third category
        if (categories.length > 2) handleCategoryChange(categories[2].id);
      },
    },
    [cart, categories, currentPage]
  );

  // Show loading while checking shift
  if (loadingShift || (!shiftCheckComplete && !activeShift)) {
    return (
      <div className='flex items-center justify-center h-96'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 animate-spin text-blue-600 mx-auto mb-4' />
          <p className='text-gray-600'>Memeriksa status shift...</p>
        </div>
      </div>
    );
  }

  // ✅ FIX: Show error if no active shift ONLY if:
  // 1. Not loading
  // 2. Not network error (might be offline)
  // 3. Shift check has completed (after delay)
  // 4. No active shift found
  if (!activeShift && shiftCheckComplete && !hasNetworkError) {
    return (
      <div className='flex items-center justify-center h-96'>
        <div className='text-center max-w-md mx-auto p-6'>
          <AlertCircle className='w-16 h-16 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-bold text-gray-900 mb-2'>
            Shift Belum Dibuka
          </h2>
          <p className='text-gray-600 mb-6'>
            Anda harus membuka shift terlebih dahulu sebelum dapat melakukan
            transaksi.
          </p>
          <Button
            onClick={() => navigate('/cashier')}
            className='bg-blue-600 hover:bg-blue-700 text-white'
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-96'>
        <Loader2 className='w-12 h-12 animate-spin text-blue-600' />
      </div>
    );
  }

  return (
    <>
      {/* ✅ FIX: Tab Navigation - Selalu tampil untuk semua bisnis */}
      {/* Tab "Belum Dibayar" selalu muncul agar kasir bisa melihat unpaid orders */}
      <div className='mb-4 flex space-x-2 border-b'>
        <Button
          variant={activeTab === 'pos' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('pos')}
          className='rounded-b-none'
        >
          <ShoppingCart className='w-4 h-4 mr-2' />
          POS
        </Button>
        <Button
          variant={activeTab === 'unpaid' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('unpaid')}
          className='rounded-b-none relative'
        >
          <Clock className='w-4 h-4 mr-2' />
          Belum Dibayar
          {/* ✅ FIX: Badge count selalu ditampilkan jika > 0 */}
          {unpaidOrdersCount > 0 && (
            <span className='ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[20px] h-5 px-2'>
              {unpaidOrdersCount}
            </span>
          )}
        </Button>
      </div>

      {/* ✅ FIX: Show Unpaid Orders Tab - Tampil jika tab unpaid aktif (bukan hanya laundry) */}
      {activeTab === 'unpaid' ? (
        <UnpaidOrders
          onOrderPaid={() => {
            setActiveTab('pos');
            // ✅ FIX: Reload count setelah order dibayar
            loadUnpaidOrdersCount();
          }}
          onCountChange={count => {
            // ✅ FIX: Update count dari UnpaidOrders component
            setUnpaidOrdersCount(count);
          }}
        />
      ) : (
        <>
          {/* Network Error Warning Banner - Hanya tampil jika hasNetworkError */}
          {hasNetworkError && (
            <div className='mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded'>
              <div className='flex items-center'>
                <AlertCircle className='w-5 h-5 text-yellow-400 mr-2 flex-shrink-0' />
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-yellow-800'>
                    Mode Offline - Tidak Dapat Terhubung ke Server
                  </p>
                  <p className='text-xs text-yellow-700 mt-1'>
                    Pastikan backend berjalan di http://localhost:8000. Beberapa
                    fitur mungkin tidak berfungsi.
                  </p>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setHasNetworkError(false);
                    loadActiveShift();
                  }}
                  className='ml-auto flex-shrink-0'
                >
                  <RefreshCw className='w-4 h-4 mr-2' />
                  Coba Lagi
                </Button>
              </div>
            </div>
          )}

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-6 h-full'>
            {/* Products Section */}
            <div className='lg:col-span-2 space-y-3 lg:space-y-4'>
              {/* Search and Categories */}
              <Card>
                <CardHeader className='pb-3 lg:pb-4'>
                  {/* Outlet & Shift Info */}
                  {currentOutlet && (
                    <div className='mb-3 lg:mb-4 p-2 lg:p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4'>
                        <div className='flex-1 min-w-0'>
                          <div className='flex flex-wrap items-center gap-2 mb-1 lg:mb-2'>
                            <h3 className='text-xs lg:text-sm font-semibold text-blue-800'>
                            Outlet Aktif
                          </h3>
                            {/* ✅ OFFLINE-FIRST: Connection Status */}
                            <div className='flex items-center gap-1 flex-wrap'>
                              {isOnline() ? (
                                <div className='flex items-center gap-1'>
                                  <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
                                  <span className='text-xs text-green-700'>Online</span>
                                </div>
                              ) : (
                                <div className='flex items-center gap-1'>
                                  <div className='w-2 h-2 bg-yellow-500 rounded-full'></div>
                                  <span className='text-xs text-yellow-700'>Offline</span>
                                </div>
                              )}
                              {/* Pending sync indicator */}
                              {pendingCount > 0 && (
                                <div className='flex items-center gap-1'>
                                  <div className='w-2 h-2 bg-orange-500 rounded-full animate-pulse'></div>
                                  <span className='text-xs text-orange-700'>{pendingCount} pending</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className='text-sm lg:text-lg font-bold text-blue-900 truncate'>
                            {currentOutlet.name}
                          </p>
                          {currentOutlet.address && (
                            <p className='text-xs lg:text-sm text-blue-700 line-clamp-1'>
                              {currentOutlet.address}
                            </p>
                          )}
                          {currentOutlet.phone && (
                            <p className='text-xs lg:text-sm text-blue-700'>
                              Tel: {currentOutlet.phone}
                            </p>
                          )}
                        </div>
                        <div className='text-left sm:text-right flex-shrink-0'>
                          <p className='text-xs text-blue-600'>Kasir:</p>
                          <p className='text-xs lg:text-sm font-medium text-blue-800'>
                            {user?.name || 'Kasir'}
                          </p>
                          {activeShift && (
                            <>
                              <p className='text-xs text-green-600 mt-1'>
                                Shift:
                              </p>
                              <p className='text-xs lg:text-sm font-medium text-green-800'>
                                {activeShift.shift_name}
                              </p>
                              <p className='text-xs text-green-600'>
                                Modal:{' '}
                                {formatCurrency(activeShift.opening_balance)}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className='flex flex-col gap-3'>
                    <div className='relative w-full'>
                      <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                      <Input
                        placeholder='Cari produk...'
                        value={searchTerm}
                        onChange={e => handleSearch(e.target.value)}
                        className='pl-10 text-sm lg:text-base'
                      />
                      {/* Barcode Scanner Input */}
                      {scanMode && (
                        <div className='mt-2'>
                          <div className='relative'>
                            <Scan className='absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-4 h-4' />
                            <Input
                              ref={scanInputRef}
                              placeholder='Scan barcode di sini...'
                              value={barcodeInput}
                              onChange={e => setBarcodeInput(e.target.value)}
                              onKeyPress={handleScanKeyPress}
                              className='pl-10 border-2 border-blue-500 focus:ring-2 focus:ring-blue-500 text-sm'
                      />
                    </div>
                          <p className='text-xs text-blue-600 mt-1 flex items-center gap-1'>
                            <Scan className='w-3 h-3' />
                            Mode scan aktif
                          </p>
                        </div>
                      )}
                    </div>
                    <div className='flex flex-wrap gap-2'>
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
                        className='px-2 lg:px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[120px]'
                      >
                        <option value='name-asc'>Nama A-Z</option>
                        <option value='name-desc'>Nama Z-A</option>
                        <option value='price-asc'>Harga Rendah-Tinggi</option>
                        <option value='price-desc'>Harga Tinggi-Rendah</option>
                        <option value='stock-asc'>Stok Sedikit-Banyak</option>
                        <option value='stock-desc'>Stok Banyak-Sedikit</option>
                      </select>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleRefresh}
                        disabled={refreshingData}
                        title='Refresh data POS'
                        className='flex-1 min-w-[80px] touch-manipulation'
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${refreshingData ? 'animate-spin' : ''}`}
                        />
                        <span className='hidden sm:inline ml-2'>Refresh</span>
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleFullRefresh}
                        title='Refresh halaman (Full Reload)'
                        className='flex-1 min-w-[80px] touch-manipulation'
                      >
                        <RotateCw className='w-4 h-4' />
                        <span className='hidden sm:inline ml-2'>Reload</span>
                      </Button>
                      <Button
                        variant={scanMode ? 'default' : 'outline'}
                        size='sm'
                        onClick={toggleScanMode}
                        className={`${scanMode ? 'bg-blue-600 hover:bg-blue-700' : ''} flex-1 min-w-[80px] touch-manipulation`}
                      >
                        <Scan className='w-4 h-4' />
                        <span className='hidden sm:inline ml-2'>{scanMode ? 'Aktif' : 'Scan'}</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-3 lg:p-6'>
                  <div className='flex flex-wrap gap-2'>
                    {categories.map(category => (
                      <Button
                        key={category.id}
                        variant={
                          selectedCategory === category.id
                            ? 'default'
                            : 'outline'
                        }
                        size='sm'
                        onClick={() => handleCategoryChange(category.id)}
                        className={`${
                          selectedCategory === category.id
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : ''
                        } text-xs lg:text-sm px-2 lg:px-3 py-1 lg:py-2 touch-manipulation`}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Products Grid - ✅ OPTIMIZATION: Menggunakan SkeletonPOSGrid saat loading */}
              {loading || refreshing ? (
                <SkeletonPOSGrid count={itemsPerPage} />
              ) : products.length === 0 ? (
                <div className='flex items-center justify-center py-12 text-gray-500'>
                  <div className='text-center'>
                    <ShoppingCart className='w-12 h-12 mx-auto mb-3 text-gray-300' />
                    <p>Tidak ada produk ditemukan</p>
                  </div>
                </div>
              ) : (
                <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4'>
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                    />
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
            </div>

            {/* Cart Section */}
            <div className='space-y-3 lg:space-y-4'>
              <Card className='lg:sticky lg:top-4 flex flex-col max-h-[calc(100vh-8rem)] lg:max-h-[calc(100vh-2rem)]'>
                <CardHeader className='flex-shrink-0'>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='flex items-center space-x-2'>
                      <ShoppingCart className='w-5 h-5' />
                      <span>Keranjang ({getTotalItems()})</span>
                    </CardTitle>
                    {cart.length > 0 && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={clearCart}
                        className='text-red-600 hover:text-red-700 min-h-[36px] touch-manipulation'
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    )}
                  </div>
                  {selectedCustomer && (
                    <div className='mt-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between'>
                      <div className='flex items-center space-x-2'>
                        <User className='w-4 h-4 text-blue-600' />
                        <span className='text-sm font-medium text-blue-900'>
                          {selectedCustomer.name}
                        </span>
                      </div>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setSelectedCustomer(null)}
                        className='h-6 px-2'
                      >
                        <Trash2 className='w-3 h-3' />
                      </Button>
                    </div>
                  )}
                  {/* Queue Number Input - Always visible when cart has items */}
                  {cart.length > 0 && (
                    <div className='mt-2 p-2 bg-gray-50 rounded-lg space-y-1'>
                      <label className='text-xs font-medium text-gray-700'>
                        No. Antrian / Meja
                      </label>
                      <Input
                        placeholder='Contoh: 5, A1, Meja 3...'
                        value={queueNumber}
                        onChange={e => setQueueNumber(e.target.value)}
                        className='text-sm h-8'
                        maxLength={20}
                      />
                    </div>
                  )}
                </CardHeader>

                <CardContent className='space-y-3 lg:space-y-4 flex-1 overflow-y-auto pb-4 min-h-0'>
                  {cart.length === 0 ? (
                    <div className='text-center py-8 text-gray-500'>
                      <ShoppingCart className='w-12 h-12 mx-auto mb-3 text-gray-300' />
                      <p>Keranjang kosong</p>
                      <p className='text-sm'>Pilih produk untuk memulai</p>
                    </div>
                  ) : (
                    <div className='space-y-2 lg:space-y-3'>
                      {cart.map(item => (
                        <div
                          key={item.id}
                          className='flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg gap-2'
                        >
                          <div className='flex-1 min-w-0'>
                            <h4 className='font-medium text-xs lg:text-sm truncate'>{item.name}</h4>
                            <p className='text-blue-600 font-semibold text-xs lg:text-sm'>
                              {formatCurrency(item.price)}
                            </p>
                            {/* ✅ NEW: Tampilkan catatan jika ada */}
                            {(item.note || item.notes) && (
                              <p className='text-xs text-gray-600 mt-1 italic truncate' title={item.note || item.notes}>
                                📝 {item.note || item.notes}
                              </p>
                            )}
                          </div>
                          <div className='flex items-center gap-1 lg:gap-2 flex-shrink-0'>
                            {/* ✅ NEW: Tombol edit catatan */}
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => openNoteModal(item)}
                              className={`w-8 h-8 lg:w-10 lg:h-10 p-0 touch-manipulation ${
                                (item.note || item.notes) ? 'text-blue-600 hover:text-blue-700' : 'text-gray-500 hover:text-gray-700'
                              }`}
                              title={(item.note || item.notes) ? 'Edit catatan' : 'Tambah catatan'}
                            >
                              <FileText className='w-3 h-3 lg:w-4 lg:h-4' />
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className='w-8 h-8 lg:w-10 lg:h-10 p-0 touch-manipulation'
                            >
                              <Minus className='w-3 h-3 lg:w-4 lg:h-4' />
                            </Button>
                            <span className='font-semibold w-6 lg:w-8 text-center text-xs lg:text-sm'>
                              {item.quantity}
                            </span>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className='w-8 h-8 lg:w-10 lg:h-10 p-0 touch-manipulation'
                            >
                              <Plus className='w-3 h-3 lg:w-4 lg:h-4' />
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => removeFromCart(item.id)}
                              className='w-8 h-8 lg:w-10 lg:h-10 p-0 text-red-600 hover:text-red-700 touch-manipulation'
                            >
                              <Trash2 className='w-3 h-3 lg:w-4 lg:h-4' />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {cart.length > 0 && (
                    <div className='flex flex-col'>
                      {/* Coupon Section */}
                      <div className='border-t pt-3 lg:pt-4 space-y-2'>
                        <div className='flex gap-2'>
                          <Input
                            placeholder='Kode kupon...'
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value)}
                            className='flex-1'
                          />
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={applyCoupon}
                            disabled={!couponCode.trim()}
                            className='min-h-[36px] touch-manipulation'
                          >
                            Apply
                          </Button>
                        </div>
                        {appliedDiscount && (
                          <div className='flex items-center justify-between p-2 bg-green-50 rounded-lg'>
                            <div>
                              <div className='font-medium text-sm text-green-800'>
                                {appliedDiscount.code}
                              </div>
                              <div className='text-xs text-green-600'>
                                -{formatCurrency(calculateDiscountAmount())}
                              </div>
                            </div>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                setAppliedDiscount(null);
                                setCouponCode('');
                                toast.success('Kupon dihapus');
                              }}
                              className='text-red-600 hover:text-red-700'
                            >
                              Hapus
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className='border-t pt-3 lg:pt-4 space-y-2'>
                        <div className='flex justify-between text-xs lg:text-sm'>
                          <span>Subtotal:</span>
                          <span>{formatCurrency(getSubtotal())}</span>
                        </div>
                        <div className='flex justify-between text-xs lg:text-sm'>
                          <span>Pajak (10%):</span>
                          <span>{formatCurrency(getTax())}</span>
                        </div>
                        <div className='flex justify-between font-bold text-base lg:text-lg border-t pt-2'>
                          <span>Total:</span>
                          <span className='text-blue-600'>
                            {formatCurrency(getTotalAmount())}
                          </span>
                        </div>
                      </div>

                      <div className='space-y-2 mt-3 lg:mt-4'>
                        <Button
                          className='w-full bg-green-600 hover:bg-green-700 min-h-[48px] touch-manipulation text-sm lg:text-base'
                          size='lg'
                          onClick={handleOpenPayment}
                        >
                          <Calculator className='w-4 h-4 mr-2' />
                          <span className='font-medium'>
                            Proses Pembayaran
                          </span>
                        </Button>
                      </div>

                      {/* Quick Actions */}
                      <div className='border-t pt-3 lg:pt-4 space-y-2 lg:space-y-3 mt-3 lg:mt-4'>
                        <h4 className='text-sm font-semibold text-gray-700'>
                          Aksi Cepat
                        </h4>
                        <div className='grid grid-cols-2 gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            className='min-h-[44px] touch-manipulation'
                            onClick={() => setCustomerModalOpen(true)}
                          >
                            <User className='w-4 h-4 mr-2' />
                            <span className='text-sm'>Pelanggan</span>
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            className='min-h-[44px] touch-manipulation relative'
                            onClick={handleHoldOrder}
                            disabled={cart.length === 0}
                          >
                            <Clock className='w-4 h-4 mr-2' />
                            <span className='text-sm'>Tahan</span>
                            {heldOrders.length > 0 && (
                              <span className='absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center'>
                                {heldOrders.length}
                              </span>
                            )}
                          </Button>
                        </div>

                        {/* Held Orders */}
                        {heldOrders.length > 0 && (
                          <div className='mt-3 lg:mt-4 space-y-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              className='w-full justify-between min-h-[40px] touch-manipulation'
                              onClick={() => setShowHeldOrders(!showHeldOrders)}
                            >
                              <div className='flex items-center gap-2'>
                                <Clock className='w-4 h-4 text-blue-600' />
                                <span className='text-sm font-medium'>
                              Order Ditahan ({heldOrders.length})
                                </span>
                              </div>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs text-gray-500'>
                                  {showHeldOrders ? 'Sembunyikan' : 'Lihat'}
                                </span>
                                <RotateCw className={`w-4 h-4 transition-transform ${showHeldOrders ? 'rotate-180' : ''}`} />
                              </div>
                            </Button>
                            
                            {showHeldOrders && (
                              <div className='space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2 bg-gray-50'>
                                {heldOrders.map(order => {
                                  const orderTotal = getHeldOrderTotal(order);
                                  const orderTime = new Date(order.timestamp).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });
                                  return (
                                    <div
                                      key={order.id}
                                      className='bg-white border border-gray-200 rounded-lg p-3 space-y-2'
                                    >
                                      <div className='flex items-start justify-between gap-2'>
                                        <div className='flex-1 min-w-0'>
                                          <div className='flex items-center gap-2 mb-1'>
                                            {order.customer ? (
                                              <User className='w-3 h-3 text-blue-600' />
                                            ) : null}
                                            <span className='text-xs font-semibold text-gray-700 truncate'>
                                              {order.customer?.name || 'Walk-in'}
                                            </span>
                                            <span className='text-xs text-gray-500'>
                                              • {orderTime}
                                            </span>
                                          </div>
                                          <p className='text-xs text-gray-600'>
                                            {order.cart.length} item • {formatCurrency(orderTotal)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className='flex gap-2'>
                                <Button
                                          variant='default'
                                  size='sm'
                                          className='flex-1 min-h-[36px] touch-manipulation text-xs'
                                  onClick={() => handleRecallOrder(order)}
                                >
                                          <RefreshCw className='w-3 h-3 mr-1' />
                                          Pulihkan
                                </Button>
                                        <Button
                                          variant='outline'
                                          size='sm'
                                          className='min-h-[36px] touch-manipulation text-red-600 hover:text-red-700 hover:bg-red-50'
                                          onClick={() => handleDeleteHeldOrder(order.id)}
                                        >
                                          <Trash2 className='w-3 h-3' />
                                        </Button>
                            </div>
                                    </div>
                                  );
                                })}
                          </div>
                        )}
                      </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        cartTotal={getTotalAmount()}
        onPaymentComplete={handlePaymentComplete}
        allowDeferredPayment={isLaundryBusiness}
        initialCustomer={selectedCustomer} // Pass selected customer from CashierPOS
        onCreateOrder={async () => {
          const order = await createOrder();
          return order.id;
        }}
      />

      <CustomerSelectModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelectCustomer={handleSelectCustomer}
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

      {/* ✅ NEW: Modal untuk edit catatan item */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Catatan untuk ${editingItem.name}` : 'Tambah Catatan'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Catatan (contoh: tidak pedas, ayam paha, extra pedas, dll)
              </label>
              <Textarea
                placeholder="Masukkan catatan untuk item ini..."
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                className="min-h-[100px]"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {itemNote.length}/200 karakter
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setNoteModalOpen(false);
                  setEditingItem(null);
                  setItemNote('');
                }}
              >
                Batal
              </Button>
              <Button onClick={saveItemNote}>
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CashierPOS;
