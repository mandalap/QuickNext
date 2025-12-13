# 🔐 Audit Laporan: Implementasi Authentication & Caching

## 📋 Status Implementasi Saat Ini

### ✅ 1. Token-based Authentication
**Status: SUDAH DIIMPLEMENTASI**

**Detail:**
- ✅ Menggunakan **Laravel Sanctum** untuk token-based authentication
- ✅ Token disimpan di `localStorage` dengan key `'token'`
- ✅ Token dikirim via `Authorization: Bearer ${token}` header
- ✅ Backend create token dengan `$user->createToken($deviceName)->plainTextToken`
- ✅ Token management: `tokens()`, `revokeToken()`, `revokeAllTokens()`, `logout()`

**File yang relevan:**
- `app/backend/app/Http/Controllers/Api/AuthController.php` (line 100-102, 214-216)
- `app/frontend/src/utils/apiClient.js` (line 107-110)
- `app/frontend/src/contexts/AuthContext.jsx` (line 1226, 1376)

**Kekurangan:**
- ❌ Token disimpan di `localStorage` (rentan XSS attack)
- ❌ Tidak ada automatic token refresh mechanism
- ❌ Tidak ada token expiration handling yang proper

---

### ❌ 2. Cookie HTTP-only Secure
**Status: TIDAK DIIMPLEMENTASI**

**Detail:**
- ❌ Tidak ada implementasi cookie HTTP-only
- ❌ Token hanya disimpan di `localStorage` (JavaScript accessible)
- ❌ Tidak ada `Set-Cookie` header dari backend
- ❌ Tidak ada `withCredentials` untuk cookie (meskipun ada di apiClient, tidak digunakan untuk auth)

**Risiko:**
- 🔴 **XSS Attack**: Token bisa diakses oleh malicious JavaScript
- 🔴 **CSRF Attack**: Tidak ada protection dari CSRF
- 🔴 **Token Theft**: Token bisa dicuri jika ada XSS vulnerability

**Rekomendasi:**
- ✅ Implementasi cookie HTTP-only untuk token storage
- ✅ Backend set cookie dengan flags: `HttpOnly`, `Secure`, `SameSite=Strict`
- ✅ Frontend tidak perlu handle token secara manual (cookie otomatis dikirim)

---

### ⚠️ 3. Cache State Setelah Fetch Pertama
**Status: SEBAGIAN DIIMPLEMENTASI**

**Detail:**
- ✅ **React Query sudah terinstall** (`@tanstack/react-query` v5.90.5)
- ✅ **QueryClientProvider sudah di-setup** di `App.js` (line 1, 10, 620)
- ✅ **React Query config sudah ada** di `config/reactQuery.js` dengan optimasi
- ✅ **React Query sudah digunakan** di `ProductManagementOptimized.jsx`
- ❌ **React Query TIDAK digunakan** di `AuthContext.jsx` (masih manual localStorage)
- ✅ **Manual caching** dengan `localStorage` (user, businesses, currentBusiness)
- ✅ **Cache utils** dengan stale-while-revalidate pattern (`cache.utils.js`)

**File yang relevan:**
- `app/frontend/package.json` (line 35-36)
- `app/frontend/src/App.js` (line 1, 10, 620) - QueryClientProvider sudah ada
- `app/frontend/src/config/reactQuery.js` - Config dengan optimasi
- `app/frontend/src/contexts/AuthContext.jsx` (manual localStorage caching)
- `app/frontend/src/utils/cache.utils.js` (stale-while-revalidate pattern)
- `app/frontend/src/components/products/ProductManagementOptimized.jsx` (menggunakan React Query)

**Kekurangan:**
- ❌ AuthContext tidak menggunakan React Query (masih manual localStorage)
- ❌ Manual cache management di AuthContext (bisa inconsistent dengan React Query)
- ❌ Tidak ada automatic cache invalidation untuk auth data
- ❌ Tidak ada background refetching untuk user/business data
- ⚠️ Dual caching system (React Query + localStorage) bisa menyebabkan inconsistency

**Rekomendasi:**
- ✅ Setup QueryClientProvider di root App
- ✅ Migrate AuthContext ke React Query hooks (`useQuery`, `useMutation`)
- ✅ Gunakan React Query untuk semua data fetching (user, businesses, outlets)
- ✅ Automatic cache invalidation dan background refetching

---

### ⚠️ 4. Selalu Cek Token Sebelum Fetch
**Status: SEBAGIAN DIIMPLEMENTASI**

**Detail:**
- ✅ Token diambil dari `localStorage` di request interceptor
- ✅ Token ditambahkan ke header jika ada
- ❌ **TIDAK ada pengecekan** apakah token ada sebelum request
- ❌ Request tetap dikirim meskipun token tidak ada
- ✅ 401 handling di response interceptor (redirect ke login)

**File yang relevan:**
- `app/frontend/src/utils/apiClient.js` (line 107-110, 308-331)

**Kode saat ini:**
```javascript
// apiClient.js line 107-110
const token = localStorage.getItem('token');
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}
// ❌ Request tetap dikirim meskipun token tidak ada
```

**Kekurangan:**
- ❌ Request dikirim meskipun token tidak ada (wasteful)
- ❌ Tidak ada early return untuk unauthenticated requests
- ❌ Tidak ada queue mechanism untuk requests yang menunggu token

**Rekomendasi:**
- ✅ Check token sebelum request
- ✅ Cancel request jika token tidak ada (kecuali public endpoints)
- ✅ Queue requests jika token sedang di-refresh
- ✅ Retry request setelah token refresh

---

### ❌ 5. Refresh Token Strategy
**Status: TIDAK DIIMPLEMENTASI**

**Detail:**
- ❌ Tidak ada refresh token mechanism
- ❌ Tidak ada automatic token refresh
- ❌ Hanya ada 401 handling (redirect ke login)
- ❌ Token expiration tidak di-handle dengan baik
- ❌ User harus login ulang jika token expired

**File yang relevan:**
- `app/frontend/src/utils/apiClient.js` (line 308-331) - hanya 401 handling

**Kode saat ini:**
```javascript
// apiClient.js line 308-331
if (error.response?.status === 401) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Redirect to login
  window.location.href = '/login';
}
// ❌ Tidak ada token refresh, langsung logout
```

**Kekurangan:**
- ❌ Tidak ada refresh token endpoint
- ❌ Tidak ada automatic token refresh sebelum expiration
- ❌ Tidak ada retry mechanism setelah token refresh
- ❌ User experience buruk (harus login ulang)

**Rekomendasi:**
- ✅ Implementasi refresh token di backend
- ✅ Automatic token refresh sebelum expiration
- ✅ Retry failed requests setelah token refresh
- ✅ Token rotation (refresh token juga di-rotate)

---

## 📊 Summary

| Fitur | Status | Prioritas Perbaikan |
|-------|--------|---------------------|
| Token-based Authentication | ✅ Sudah | - |
| Cookie HTTP-only Secure | ❌ Tidak | 🔴 **HIGH** |
| Cache State (React Query) | ⚠️ Sebagian | 🟡 **MEDIUM** |
| Cek Token Sebelum Fetch | ⚠️ Sebagian | 🟡 **MEDIUM** |
| Refresh Token Strategy | ❌ Tidak | 🔴 **HIGH** |

---

## 🎯 Rekomendasi Perbaikan

### Prioritas 1: Security (HIGH)
1. **Implementasi Cookie HTTP-only Secure**
   - Backend: Set cookie dengan `HttpOnly`, `Secure`, `SameSite=Strict`
   - Frontend: Hapus manual token management, gunakan cookie otomatis
   - Benefit: Protection dari XSS dan CSRF attacks

2. **Implementasi Refresh Token Strategy**
   - Backend: Endpoint `/refresh-token` untuk refresh access token
   - Frontend: Automatic token refresh sebelum expiration
   - Benefit: Better UX, tidak perlu login ulang

### Prioritas 2: Performance & UX (MEDIUM)
3. **Migrate ke React Query**
   - Setup QueryClientProvider di root App
   - Migrate AuthContext ke React Query hooks
   - Benefit: Automatic caching, background refetching, cache invalidation

4. **Improve Token Check Before Fetch**
   - Check token sebelum request
   - Cancel request jika token tidak ada
   - Queue requests jika token sedang di-refresh
   - Benefit: Reduce unnecessary requests, better error handling

---

## 🔧 Implementasi yang Disarankan

### 1. Cookie HTTP-only Secure (Backend)

```php
// app/backend/app/Http/Controllers/Api/AuthController.php

public function login(Request $request)
{
    // ... existing code ...
    
    $token = $user->createToken($deviceName)->plainTextToken;
    
    // ✅ Set cookie dengan HTTP-only, Secure, SameSite
    $cookie = cookie(
        'auth_token',
        $token,
        60 * 24 * 7, // 7 days
        '/',
        null,
        true, // Secure (HTTPS only)
        true, // HttpOnly
        false,
        'Strict' // SameSite
    );
    
    return response()->json([
        'user' => $user,
        'token' => $token, // Keep for backward compatibility
    ])->cookie($cookie);
}
```

### 2. Refresh Token Strategy (Backend)

```php
// app/backend/app/Http/Controllers/Api/AuthController.php

public function refreshToken(Request $request)
{
    $user = $request->user();
    
    // Revoke old token
    $request->user()->currentAccessToken()->delete();
    
    // Create new token
    $newToken = $user->createToken('Web Browser')->plainTextToken;
    
    // Set new cookie
    $cookie = cookie(
        'auth_token',
        $newToken,
        60 * 24 * 7,
        '/',
        null,
        true,
        true,
        false,
        'Strict'
    );
    
    return response()->json([
        'token' => $newToken,
    ])->cookie($cookie);
}
```

### 3. React Query Setup (Frontend)

```javascript
// app/frontend/src/index.js

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

### 4. Token Check Before Fetch (Frontend)

```javascript
// app/frontend/src/utils/apiClient.js

apiClient.interceptors.request.use(
  config => {
    // ✅ Check token sebelum request
    const token = localStorage.getItem('token');
    
    // ✅ Skip untuk public endpoints
    const publicEndpoints = ['/login', '/register', '/public'];
    const isPublicEndpoint = publicEndpoints.some(ep => config.url?.includes(ep));
    
    if (!isPublicEndpoint && !token) {
      // ✅ Cancel request jika token tidak ada
      return Promise.reject(new Error('No token available'));
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  }
);
```

### 5. Refresh Token Strategy (Frontend)

```javascript
// app/frontend/src/utils/apiClient.js

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // ✅ Handle 401 dengan refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // ✅ Queue request jika token sedang di-refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        // ✅ Refresh token
        const response = await apiClient.post('/refresh-token');
        const { token: newToken } = response.data;
        
        localStorage.setItem('token', newToken);
        processQueue(null, newToken);
        
        // ✅ Retry original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // ✅ Logout jika refresh gagal
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);
```

---

## 📝 Checklist Implementasi

### Phase 1: Security (HIGH Priority)
- [ ] Implementasi Cookie HTTP-only Secure di backend
- [ ] Update frontend untuk menggunakan cookie (hapus manual token management)
- [ ] Implementasi Refresh Token Strategy di backend
- [ ] Implementasi Automatic Token Refresh di frontend
- [ ] Test XSS protection
- [ ] Test CSRF protection

### Phase 2: Performance & UX (MEDIUM Priority)
- [ ] Setup QueryClientProvider di root App
- [ ] Migrate AuthContext ke React Query
- [ ] Migrate business service ke React Query
- [ ] Migrate outlet service ke React Query
- [ ] Implementasi Token Check Before Fetch
- [ ] Test cache invalidation
- [ ] Test background refetching

---

## 🔗 Referensi

- [Laravel Sanctum Documentation](https://laravel.com/docs/sanctum)
- [React Query Documentation](https://tanstack.com/query/latest)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [HTTP-only Cookies Security](https://owasp.org/www-community/HttpOnly)

