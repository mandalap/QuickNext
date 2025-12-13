import { productCache, categoryCache, customerCache, isOnline, syncMetadata } from '../db/indexedDB';
import { categoryService } from './category.service';
import { productService } from './product.service';

/**
 * Offline-first service layer
 * Automatically caches data in IndexedDB and serves from cache when offline
 */
class OfflineService {
  // Products
  async getProducts(businessId, params = {}) {
    try {
      // If online, fetch from API and cache
      if (isOnline()) {
        const result = await productService.getAll(params);
        
        if (result.success && result.data) {
          // Cache products
          const products = Array.isArray(result.data) 
            ? result.data 
            : result.data.data || [];
          
          await productCache.upsert(
            products.map(p => ({ ...p, business_id: businessId }))
          );
          
          // Update sync metadata
          await syncMetadata.updateLastSync('products', new Date().getTime().toString());
          
          return result;
        }
      }
      
      // If offline or API failed, serve from cache
      console.log('📦 Serving products from cache');
      let products = await productCache.getAll(businessId);
      
      // Apply filters in-memory
      if (params.search) {
        const searchLower = params.search.toLowerCase();
        products = products.filter(p => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower)
        );
      }
      
      if (params.category && params.category !== 'all') {
        products = products.filter(p => p.category_id === params.category);
      }
      
      // Apply sorting
      if (params.sort_by && params.sort_order) {
        products.sort((a, b) => {
          let aVal = a[params.sort_by] || 0;
          let bVal = b[params.sort_by] || 0;
          
          if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
          }
          
          if (params.sort_order === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
          }
        });
      }
      
      // Apply pagination
      const page = params.page || 1;
      const perPage = params.per_page || 20;
      const start = (page - 1) * perPage;
      const end = start + perPage;
      const paginatedProducts = products.slice(start, end);
      
      // Return in same format as API
      return {
        success: true,
        data: {
          data: paginatedProducts,
          pagination: {
            current_page: page,
            last_page: Math.ceil(products.length / perPage),
            per_page: perPage,
            total: products.length,
          },
        },
        cached: true,
      };
    } catch (error) {
      console.error('Error in offline products service:', error);
      
      // Try to serve from cache even on error
      try {
        const products = await productCache.getAll(businessId);
        return {
          success: true,
          data: {
            data: products,
            pagination: {
              current_page: 1,
              last_page: 1,
              per_page: products.length,
              total: products.length,
            },
          },
          cached: true,
          error: error.message,
        };
      } catch (cacheError) {
        return {
          success: false,
          error: error.message,
        };
      }
    }
  }

  // Categories
  async getCategories(businessId) {
    try {
      // If online, fetch from API and cache
      if (isOnline()) {
        const result = await categoryService.getAll();
        
        if (result.success && result.data) {
          const categories = Array.isArray(result.data) 
            ? result.data 
            : result.data.data || [];
          
          await categoryCache.upsert(
            categories.map(c => ({ ...c, business_id: businessId }))
          );
          
          await syncMetadata.updateLastSync('categories', new Date().getTime().toString());
          
          return result;
        }
      }
      
      // Serve from cache
      console.log('📁 Serving categories from cache');
      const categories = await categoryCache.getAll(businessId);
      
      return {
        success: true,
        data: categories,
        cached: true,
      };
    } catch (error) {
      console.error('Error in offline categories service:', error);
      
      try {
        const categories = await categoryCache.getAll(businessId);
        return {
          success: true,
          data: categories,
          cached: true,
          error: error.message,
        };
      } catch (cacheError) {
        return {
          success: false,
          error: error.message,
        };
      }
    }
  }

  // Search products
  async searchProducts(businessId, searchTerm) {
    try {
      // Try cache first (faster)
      const cachedResults = await productCache.search(businessId, searchTerm);
      
      if (cachedResults.length > 0) {
        console.log(`📦 Serving ${cachedResults.length} search results from cache`);
        return {
          success: true,
          data: cachedResults,
          cached: true,
        };
      }
      
      // If no cache, try API if online
      if (isOnline()) {
        const result = await productService.getAll({ search: searchTerm });
        if (result.success) {
          return result;
        }
      }
      
      return {
        success: true,
        data: [],
        cached: true,
      };
    } catch (error) {
      console.error('Error searching products:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Clear cache for a business
  async clearCache(businessId) {
    try {
      await productCache.clear(businessId);
      await categoryCache.clear(businessId);
      await customerCache.clear(businessId);
      console.log('✅ Cache cleared for business:', businessId);
      return { success: true };
    } catch (error) {
      console.error('Error clearing cache:', error);
      return { success: false, error: error.message };
    }
  }

  // Preload data for a business
  async preloadData(businessId) {
    try {
      console.log(`🚀 Preloading data for business ${businessId}...`);
      
      const [productsResult, categoriesResult] = await Promise.allSettled([
        this.getProducts(businessId, { per_page: 100 }),
        this.getCategories(businessId),
      ]);
      
      if (productsResult.status === 'fulfilled' && productsResult.value.success) {
        console.log('✅ Products preloaded:', productsResult.value.data.pagination?.total || 0);
      }
      
      if (categoriesResult.status === 'fulfilled' && categoriesResult.value.success) {
        console.log('✅ Categories preloaded:', categoriesResult.value.data?.length || 0);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error preloading data:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const offlineService = new OfflineService();
export default offlineService;

