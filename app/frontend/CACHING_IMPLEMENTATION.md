# Implementasi Caching untuk Performa Aplikasi

## 📋 Overview

Implementasi caching dengan **localStorage** menggunakan **Stale-While-Revalidate** pattern untuk meningkatkan performa aplikasi dan mengurangi dependency pada network connection.

## 🎯 Tujuan

1. **Mengurangi loading time**: Data ditampilkan dari cache saat reload
2. **Meningkatkan responsiveness**: User tidak perlu menunggu API call untuk data yang sudah pernah di-fetch
3. **Handling network failures**: Aplikasi tetap bisa berfungsi dengan data cache saat network bermasalah
4. **Optimized data fetching**: Fresh data di-fetch di background sementara stale data ditampilkan

## 🏗️ Arsitektur

### Cache Utility (`utils/cache.utils.js`)

Utility untuk manage cache dengan fitur:

- **TTL (Time To Live)**: Setiap cache punya expiration time
- **Stale-While-Revalidate**: Return cache segera, refresh di background
- **Automatic cleanup**: Clear cache lama otomatis
- **Error handling**: Fallback ke cache saat network error

### Pattern yang Digunakan

#### 1. Stale-While-Revalidate

```
User request → Check cache → Return cache (immediate) → Fetch fresh data (background) → Update cache
```

#### 2. Cache-First dengan Fallback

```
User request → Check cache → If exists return → Else fetch → Save to cache → Return
```

## 📦 Data yang Di-Cache

| Data             | Cache Key                      | TTL      | Pattern                |
| ---------------- | ------------------------------ | -------- | ---------------------- |
| User Profile     | `user`                         | 30 menit | Stale-While-Revalidate |
| Businesses       | `businesses`                   | 10 menit | Stale-While-Revalidate |
| Current Business | `current_business`             | 10 menit | Stale-While-Revalidate |
| Products         | `products_initial_{outlet_id}` | 5 menit  | Stale-While-Revalidate |
| Categories       | `categories_{outlet_id}`       | 10 menit | Stale-While-Revalidate |

## 🔄 Cache Invalidation

Cache otomatis di-clear saat:

1. **Create/Update/Delete**: Data terkait di-clear untuk memastikan konsistensi
2. **Switch Business**: Semua cache di-clear karena data berbeda per business
3. **Logout**: User cache di-clear
4. **TTL Expired**: Cache lama di-clear otomatis

## 💡 Best Practices

### 1. Gunakan `useCache` Parameter

```javascript
// Dengan cache (default)
const result = await authService.getCurrentUser(true);

// Tanpa cache (force fresh)
const result = await authService.getCurrentUser(false);
```

### 2. Handle Stale Data

```javascript
const result = await businessService.getCurrent();

if (result.stale) {
  // Data dari cache (mungkin outdated)
  // Tapi user sudah bisa melihat UI
  // Fresh data akan update di background
}
```

### 3. Clear Cache Setelah Mutation

```javascript
// Setelah create/update/delete, clear cache terkait
const { clearCacheByPattern } = require('../utils/cache.utils');
clearCacheByPattern('product');
```

## 🚀 Impact

### Sebelum Caching

- Reload page: **3-5 detik** loading
- Network gagal: **Error**, tidak bisa menggunakan aplikasi
- Setiap action: **API call** penuh

### Setelah Caching

- Reload page: **<1 detik** (dari cache)
- Network gagal: **Masih bisa menggunakan** aplikasi dengan cache
- Setiap action: **Cache-first**, API call di background jika perlu

## 🔧 Troubleshooting

### Cache Terlalu Lama

```javascript
// Clear cache manual jika perlu
const { clearAllCache } = require('../utils/cache.utils');
clearAllCache();
```

### Cache Tidak Update

- Check TTL: Pastikan TTL tidak terlalu lama
- Check invalidation: Pastikan cache di-clear setelah mutation
- Check cache key: Pastikan key unique per context (outlet_id, dll)

### Storage Penuh

- Cache otomatis clear cache lama (>24 jam)
- Jika masih penuh, clear manual atau increase TTL

## 📝 Notes

- Cache hanya untuk **GET requests**
- **POST/PUT/DELETE** tidak di-cache (data berubah)
- Cache **per browser** (tidak sync antar device)
- Cache **clear otomatis** setelah logout

## 🔐 Security

- Cache tidak menyimpan sensitive data (password, token)
- Token tetap di `localStorage` (bukan cache system)
- Cache key menggunakan prefix untuk prevent collision
