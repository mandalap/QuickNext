# Cara Build Production untuk PWA

## Metode 1: Menggunakan Script PowerShell (Recommended)

Jalankan script yang sudah dibuat:

```powershell
cd e:\development\kasir-pos-system\app\frontend
powershell -ExecutionPolicy Bypass -File build-production.ps1
```

## Metode 2: Manual Build dengan PowerShell

```powershell
# Masuk ke folder frontend
cd e:\development\kasir-pos-system\app\frontend

# Set environment variables untuk production
$env:NODE_ENV = "production"
$env:GENERATE_SOURCEMAP = "false"

# Jalankan build
npm run build
```

## Metode 3: Menggunakan npm script (Windows)

```powershell
cd e:\development\kasir-pos-system\app\frontend
npm run build
```

**Catatan:** Script `build:production` di package.json menggunakan syntax Linux/Mac (`NODE_ENV=production`), jadi di Windows gunakan metode 1 atau 2.

## Verifikasi Build

Setelah build selesai, pastikan file-file berikut ada di folder `build/`:

- ✅ `index.html` - File HTML utama
- ✅ `manifest.json` - Konfigurasi PWA
- ✅ `service-worker.js` - Service worker untuk offline support
- ✅ `icon-*.png` - Icons untuk PWA (berbagai ukuran)
- ✅ `static/js/` - JavaScript files yang sudah di-minify
- ✅ `static/css/` - CSS files yang sudah di-minify
- ✅ `*.gz` - File yang sudah di-compress dengan gzip

## Test Build Production Lokal

Untuk test build production di local:

```powershell
# Install serve (jika belum)
npm install -g serve

# Serve build folder
npx serve -s build -l 3000
```

Atau gunakan script yang sudah ada:

```powershell
npm run serve:production
```

## Optimasi Build

Build production sudah dioptimasi dengan:

1. **Code Splitting** - File JavaScript dibagi menjadi chunks untuk loading yang lebih cepat
2. **Minification** - Semua kode di-minify untuk mengurangi ukuran
3. **Compression** - File besar di-compress dengan gzip
4. **Tree Shaking** - Hanya kode yang digunakan yang di-include
5. **Console Removal** - Semua console.log dihapus di production
6. **Source Maps Disabled** - Source maps dinonaktifkan untuk keamanan dan ukuran

## Deploy Build

Setelah build selesai, folder `build/` berisi semua file yang siap untuk di-deploy ke server production.

### Deploy ke Server

1. Upload seluruh isi folder `build/` ke web server
2. Pastikan server mengkonfigurasi:
   - MIME types untuk `.js`, `.css`, `.json`
   - Compression (gzip) untuk file `.gz`
   - HTTPS (diperlukan untuk PWA)
   - Service worker support

### Deploy ke Static Hosting

Build ini bisa di-deploy ke:
- **Netlify** - Drag & drop folder `build/`
- **Vercel** - Connect repository atau upload folder
- **GitHub Pages** - Upload ke gh-pages branch
- **AWS S3 + CloudFront** - Upload ke S3 bucket
- **Firebase Hosting** - Deploy dengan Firebase CLI

## Troubleshooting

### Build Gagal

1. Pastikan semua dependencies terinstall:
   ```powershell
   npm install
   ```

2. Clear cache:
   ```powershell
   npm run clean
   ```

3. Rebuild:
   ```powershell
   npm run build
   ```

### PWA Tidak Bekerja

1. Pastikan menggunakan HTTPS (atau localhost untuk development)
2. Check browser console untuk error
3. Pastikan `manifest.json` dan `service-worker.js` ada di root build folder
4. Clear browser cache dan service worker

### Ukuran Build Terlalu Besar

1. Analisis bundle:
   ```powershell
   npm run analyze
   ```

2. Check file besar di folder `build/static/js/`
3. Pertimbangkan lazy loading untuk komponen besar

## Checklist Sebelum Deploy

- [ ] Build berhasil tanpa error
- [ ] Semua file PWA ada (manifest.json, service-worker.js, icons)
- [ ] Test di local dengan `serve`
- [ ] Test PWA install di mobile device
- [ ] Test offline functionality
- [ ] Check ukuran build (ideal < 5MB total)
- [ ] Test di berbagai browser (Chrome, Firefox, Safari)
- [ ] Verify HTTPS configuration
- [ ] Check console untuk error

## Informasi Build

- **Build Tool:** CRACO (Create React App Configuration Override)
- **Framework:** React 19
- **Bundler:** Webpack (via CRA)
- **PWA:** Service Worker + Web App Manifest
- **Optimization:** Code splitting, minification, compression
