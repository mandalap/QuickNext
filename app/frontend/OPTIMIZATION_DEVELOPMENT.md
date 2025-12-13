# Development Mode Optimization

## Masalah
- Bundle.js di development mode: **2.36 MB** (terlalu besar)
- Code splitting hanya aktif di production
- Loading time: **16.95 detik** (terlalu lama)

## Solusi yang Diterapkan

### 1. ✅ Enable Code Splitting di Development Mode
**File:** `app/frontend/craco.config.js`

**Perubahan:**
- Menambahkan basic code splitting untuk development mode
- Memisahkan React vendor, large libraries, dan PDF libraries
- Menggunakan `chunks: 'async'` untuk PDF libraries (lazy load)

**Expected Impact:**
- Bundle size: **2.36 MB → ~800 KB - 1.2 MB** (50-70% reduction)
- Initial load: **16.95s → ~8-10s** (40-50% faster)

### 2. ✅ Optimize Source Maps
**File:** `app/frontend/craco.config.js`

**Perubahan:**
- Dari `eval-source-map` → `eval-cheap-module-source-map`
- Lebih cepat untuk build, masih cukup untuk debugging

**Expected Impact:**
- Build time: **20-30% faster**
- Hot reload: **10-15% faster**

### 3. ✅ Production Build Script
**File:** `app/frontend/package.json`

**Script Baru:**
```bash
npm run serve:production  # Build + serve production untuk testing
```

**Cara Pakai:**
```bash
cd app/frontend
npm run serve:production
# Akan build production dan serve di http://localhost:3000
# Bundle akan ter-split jadi 30+ chunks kecil (~173 KB gzipped total)
```

## Perbandingan

| Mode | Bundle Size | Chunks | Load Time |
|------|-------------|--------|-----------|
| **Development (Before)** | 2.36 MB | 1 file | 16.95s |
| **Development (After)** | ~800 KB - 1.2 MB | 4-6 chunks | ~8-10s |
| **Production** | ~173 KB gzipped | 30+ chunks | < 2s |

## Catatan Penting

### Development Mode
- Code splitting di development akan memperlambat hot reload sedikit (~10-15%)
- Tapi initial load akan jauh lebih cepat (40-50%)
- Masih lebih besar dari production karena:
  - Source maps lebih besar
  - Tidak ada minification
  - Tidak ada tree shaking agresif

### Production Mode
- Untuk testing performa optimal, gunakan `npm run serve:production`
- Bundle akan ter-split jadi banyak chunks kecil
- Total initial load: **~173 KB gzipped** (vs 2.36 MB di dev)

## Rekomendasi

1. **Development:** Gunakan optimasi yang sudah diterapkan (code splitting basic)
2. **Testing Performance:** Gunakan `npm run serve:production` untuk melihat performa optimal
3. **Production Deploy:** Pastikan menggunakan production build dengan semua optimasi

## Monitoring

Untuk melihat bundle size:
```bash
# Development mode
npm run dev
# Check Network tab di Chrome DevTools

# Production mode
npm run serve:production
# Check Network tab - akan terlihat banyak chunks kecil
```

## Next Steps (Optional)

1. **Image Optimization:** Compress logo images (logo-qk.png, logi-qk-full.png)
2. **Lazy Load Routes:** Sudah ada di App.js, pastikan semua routes lazy loaded
3. **Service Worker:** Enable untuk caching (sudah ada di App.js)
4. **CDN:** Gunakan CDN untuk static assets di production

