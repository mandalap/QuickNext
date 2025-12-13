# 🚀 React Query Pattern - Panduan Penerapan ke Semua Halaman

## 📋 Teknologi yang Digunakan di Dashboard

Dashboard menggunakan **React Query (TanStack Query)** dengan beberapa optimasi:

### 1. **React Query untuk Data Fetching**
- ✅ Caching otomatis - data di-cache di memory
- ✅ Background refetch - refresh data tanpa reload halaman
- ✅ Optimistic updates - UI update sebelum API response
- ✅ Request deduplication - mencegah duplicate API calls

### 2. **Keyboard Shortcut untuk F5**
- ✅ Prevent default reload (`event.preventDefault()`)
- ✅ Gunakan `refetch()` dari React Query
- ✅ Refresh data tanpa reload halaman

### 3. **Caching Strategy**
- ✅ `staleTime` - Data tetap fresh untuk beberapa menit
- ✅ `gcTime` - Data tetap di cache meskipun tidak digunakan
- ✅ `placeholderData` - Keep previous data saat refetch (smooth UX)
- ✅ `refetchOnMount: false` - Tidak refetch jika data masih fresh

---

## 🎯 Cara Menerapkan ke Halaman Lain

### Step 1: Install Dependencies (Sudah Terinstall)

```bash
npm install @tanstack/react-query
```

### Step 2: Setup QueryClient (Sudah Ada)

File: `app/frontend/src/config/reactQuery.js`

### Step 3: Wrap App dengan QueryClientProvider (Sudah Ada)

File: `app/frontend/src/App.js`

### Step 4: Gunakan useQuery di Komponen

```javascript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../config/reactQuery';

const YourComponent = () => {
  // ✅ Gunakan useQuery untuk data fetching
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.yourData.list(params),
    queryFn: async () => {
      const result = await yourService.getAll(params);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error('Failed to load data');
    },
    staleTime: 2 * 60 * 1000, // 2 menit
    gcTime: 10 * 60 * 1000, // 10 menit
    refetchOnMount: false, // ✅ Tidak refetch jika data fresh
    placeholderData: (previousData) => previousData, // ✅ Keep previous data
  });

  // ✅ Handle refresh tanpa reload halaman
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ✅ Keyboard shortcut untuk F5
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'F5') {
        event.preventDefault(); // ✅ Prevent default reload
        handleRefresh(); // ✅ Refresh data saja
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  if (isLoading && !data) {
    return <Skeleton />; // Show skeleton saat initial load
  }

  if (error) {
    return <ErrorComponent error={error} onRetry={handleRefresh} />;
  }

  return (
    <div>
      {/* Your content */}
      <Button onClick={handleRefresh}>Refresh</Button>
    </div>
  );
};
```

---

## 📝 Template Komponen dengan React Query

### Template Lengkap

```javascript
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { queryKeys } from '../../config/reactQuery';
import { yourService } from '../../services/your.service';

const YourPage = () => {
  const [params, setParams] = useState({});

  // ✅ React Query untuk data fetching
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.yourData.list(params),
    queryFn: async () => {
      const result = await yourService.getAll(params);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error('Failed to load data');
    },
    enabled: Boolean(/* conditions */), // ✅ Hanya fetch jika kondisi terpenuhi
    staleTime: 2 * 60 * 1000, // ✅ 2 menit - data tetap fresh
    gcTime: 10 * 60 * 1000, // ✅ 10 menit - cache time
    refetchOnMount: false, // ✅ Tidak refetch jika data fresh
    refetchOnWindowFocus: false, // ✅ Tidak refetch saat window focus
    placeholderData: (previousData) => previousData, // ✅ Keep previous data
    retry: 1, // ✅ Retry sekali jika gagal
  });

  // ✅ Handle refresh tanpa reload
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ✅ Keyboard shortcut F5
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Skip jika sedang di input/textarea
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // F5 untuk refresh
      if (event.key === 'F5') {
        event.preventDefault();
        handleRefresh();
      }

      // R untuk refresh (optional)
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  // ✅ Loading state - show skeleton jika initial load
  if (isLoading && !data) {
    return <YourSkeleton />;
  }

  // ✅ Error state
  if (error) {
    return (
      <ErrorComponent
        error={error}
        onRetry={handleRefresh}
      />
    );
  }

  // ✅ Render content
  return (
    <div>
      {/* Header dengan refresh button */}
      <div className="flex justify-between items-center">
        <h1>Your Page</h1>
        <Button
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      <div>
        {data?.map(item => (
          <YourItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
```

---

## 🔧 Utility Hook untuk Keyboard Shortcut

Buat file: `app/frontend/src/hooks/useKeyboardRefresh.js`

```javascript
import { useEffect } from 'react';

/**
 * Hook untuk handle keyboard shortcut refresh (F5)
 * Mencegah default reload dan memanggil callback refresh
 */
export const useKeyboardRefresh = (onRefresh, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event) => {
      // Skip jika sedang di input/textarea
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      // F5 untuk refresh
      if (event.key === 'F5') {
        event.preventDefault();
        onRefresh();
      }

      // R untuk refresh (optional)
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        onRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onRefresh, enabled]);
};
```

**Penggunaan:**

```javascript
import { useKeyboardRefresh } from '../../hooks/useKeyboardRefresh';

const YourComponent = () => {
  const { refetch } = useQuery(...);
  
  // ✅ Gunakan hook
  useKeyboardRefresh(() => refetch());
  
  // ...
};
```

---

## 📊 StaleTime Recommendations

| Data Type | staleTime | gcTime | Reason |
|-----------|-----------|--------|--------|
| **Real-time** (orders, shifts) | 30s | 5min | Perlu update sering |
| **Semi-static** (sales, dashboard) | 2-3min | 10min | Update beberapa menit sekali |
| **Static** (products, categories) | 10min | 30min | Jarang berubah |
| **Very static** (settings, business) | 30min | 1hour | Sangat jarang berubah |

---

## ✅ Checklist Penerapan

- [ ] Install `@tanstack/react-query` (sudah ada)
- [ ] Setup `QueryClientProvider` (sudah ada)
- [ ] Buat query keys di `config/reactQuery.js`
- [ ] Ganti `useState` + `useEffect` dengan `useQuery`
- [ ] Tambahkan `staleTime` dan `gcTime` sesuai data type
- [ ] Set `refetchOnMount: false` untuk data yang tidak perlu refetch
- [ ] Set `placeholderData` untuk smooth UX
- [ ] Tambahkan keyboard shortcut F5
- [ ] Tambahkan refresh button
- [ ] Handle loading state dengan skeleton
- [ ] Handle error state dengan retry

---

## 🎯 Contoh: Menerapkan ke Products Page

### Sebelum (Tanpa React Query):

```javascript
const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const result = await productService.getAll();
        setProducts(result.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // ❌ F5 akan reload halaman
  // ❌ Tidak ada caching
  // ❌ Duplicate requests mungkin terjadi
};
```

### Sesudah (Dengan React Query):

```javascript
import { useQuery } from '@tanstack/react-query';
import { useKeyboardRefresh } from '../../hooks/useKeyboardRefresh';
import { queryKeys } from '../../config/reactQuery';

const ProductsPage = () => {
  const {
    data: products = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.products.list(businessId, {}),
    queryFn: async () => {
      const result = await productService.getAll();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error('Failed to load products');
    },
    staleTime: 10 * 60 * 1000, // 10 menit
    gcTime: 30 * 60 * 1000, // 30 menit
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  // ✅ F5 tidak reload halaman, hanya refresh data
  useKeyboardRefresh(() => refetch());

  if (isLoading) {
    return <ProductsSkeleton />;
  }

  return (
    <div>
      <Button onClick={() => refetch()}>Refresh</Button>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
```

---

## 🚀 Benefits

1. ✅ **Tidak ada reload halaman** - F5 hanya refresh data
2. ✅ **Caching otomatis** - Data di-cache, tidak perlu fetch ulang
3. ✅ **Background refresh** - Data di-refresh di background tanpa blocking UI
4. ✅ **Smooth UX** - Previous data tetap ditampilkan saat refetch
5. ✅ **Request deduplication** - Mencegah duplicate API calls
6. ✅ **Optimistic updates** - UI update sebelum API response
7. ✅ **Error handling** - Built-in retry dan error handling
8. ✅ **Loading states** - Built-in loading states

---

## 📚 Referensi

- [React Query Documentation](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- Dashboard Implementation: `app/frontend/src/components/dashboards/Dashboard.jsx`

---

## 🎯 Next Steps

1. Buat utility hook `useKeyboardRefresh`
2. Update halaman yang belum menggunakan React Query
3. Tambahkan query keys untuk halaman baru
4. Test F5 behavior di semua halaman

