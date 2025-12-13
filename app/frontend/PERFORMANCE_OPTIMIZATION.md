# Performance Optimization Guide

## Masalah yang Ditemukan
- **77 requests** - Terlalu banyak HTTP requests
- **15.2 MB resources** - File size terlalu besar
- **1.2 min load time** - Waktu loading terlalu lama

## Optimasi yang Sudah Diterapkan

### 1. ✅ Removed Duplicate Prefetch
- **Masalah**: Prefetch di `useEffect` duplikat dengan `useQuery` yang sudah fetch data
- **Solusi**: Hapus prefetch yang tidak perlu
- **Impact**: Mengurangi ~2-3 requests yang duplikat

### 2. ✅ Removed Console.log
- **Masalah**: Console.log memperlambat performa, terutama di production
- **Solusi**: Hapus semua console.log/warn/error yang tidak perlu
- **Impact**: Meningkatkan performa rendering

### 3. ✅ Added refetchOnMount: false
- **Masalah**: Query refetch setiap mount meskipun data masih fresh
- **Solusi**: Tambahkan `refetchOnMount: false` untuk query yang sudah cached
- **Impact**: Mengurangi API calls yang tidak perlu

### 4. ✅ Fixed React Query enabled
- **Masalah**: `enabled` tidak selalu return boolean yang valid
- **Solusi**: Wrap dengan `Boolean()` untuk memastikan selalu boolean
- **Impact**: Mencegah error dan re-render yang tidak perlu

### 5. ✅ Sequential Loading (Priority-based)
- **Masalah**: Semua query berjalan bersamaan saat mount, menyebabkan 5-6 requests paralel
- **Solusi**: Query non-critical (top products, shifts, cashiers) menunggu query critical (sales stats, orders) selesai
- **Impact**: Mengurangi initial load dari 5-6 requests menjadi 2 requests pertama, lalu sisanya load bertahap

### 6. ✅ Increased staleTime
- **Masalah**: Data terlalu sering di-refetch meskipun masih fresh
- **Solusi**: 
  - Sales stats: 3 menit (dari 2 menit)
  - Orders: 2 menit
  - Top products: 5 menit (dari 2 menit)
  - Shifts: 2 menit
- **Impact**: Mengurangi refetch yang tidak perlu, mengurangi total requests

### 7. ✅ Added placeholderData
- **Masalah**: UI blank saat refetch data
- **Solusi**: Gunakan `placeholderData` untuk keep previous data selama refetch
- **Impact**: UX lebih smooth, tidak ada blank screen saat refetch

### 8. ✅ Optimized Query Dependencies
- **Masalah**: Query non-critical load bersamaan dengan critical data
- **Solusi**: Top products, shifts, dan cashiers hanya load setelah sales stats & orders selesai
- **Impact**: Initial load lebih cepat, user melihat data penting lebih dulu

## Saran Optimasi Lanjutan

### 1. Code Splitting & Lazy Loading
```javascript
// Lazy load heavy components
const Dashboard = lazy(() => import('./components/dashboards/Dashboard'));
const SalesManagement = lazy(() => import('./components/sales/SalesManagement'));
```

### 2. Bundle Size Optimization
- Gunakan dynamic imports untuk routes
- Tree-shake unused dependencies
- Optimize images (WebP format, lazy loading)
- Minify CSS dan JS di production

### 3. Reduce API Calls
- Combine multiple API calls menjadi satu endpoint
- Gunakan React Query `keepPreviousData` untuk pagination
- Implement request batching untuk multiple queries

### 4. Caching Strategy
- Increase `staleTime` untuk data yang jarang berubah
- Use Service Worker untuk offline caching
- Implement HTTP cache headers di backend

### 5. Optimize Images & Assets
- Compress images (TinyPNG, ImageOptim)
- Use WebP format dengan fallback
- Lazy load images below the fold
- Use CDN untuk static assets

### 6. Reduce Re-renders
- Use `React.memo` untuk expensive components
- Use `useMemo` dan `useCallback` untuk expensive calculations
- Avoid inline object/function creation in render

### 7. Network Optimization
- Enable HTTP/2
- Use compression (gzip/brotli)
- Implement request prioritization
- Use CDN untuk static assets

## Monitoring Performance

### Tools yang Bisa Digunakan:
1. **Chrome DevTools Performance Tab**
   - Record performance saat reload
   - Identifikasi bottleneck
   - Analyze bundle size

2. **React DevTools Profiler**
   - Identify slow components
   - Find unnecessary re-renders
   - Optimize component tree

3. **Lighthouse**
   - Run audit untuk performance score
   - Get specific recommendations
   - Track improvements over time

4. **Webpack Bundle Analyzer**
   ```bash
   npm install --save-dev webpack-bundle-analyzer
   npm run build -- --analyze
   ```

## Target Performance
- **Requests**: < 30 requests
- **Bundle Size**: < 5 MB (gzipped < 1.5 MB)
- **Load Time**: < 3 seconds
- **First Contentful Paint**: < 1.5 seconds
- **Time to Interactive**: < 3.5 seconds

## Quick Wins (High Impact, Low Effort)
1. ✅ Remove console.log (DONE)
2. ✅ Remove duplicate prefetch (DONE)
3. ✅ Add refetchOnMount: false (DONE)
4. ⏳ Enable production build optimizations
5. ⏳ Compress images
6. ⏳ Enable gzip compression di backend
7. ⏳ Use React.lazy untuk route-based code splitting

