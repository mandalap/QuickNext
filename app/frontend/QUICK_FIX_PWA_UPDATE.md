# ⚡ Quick Fix - PWA Update

## ❌ Masalah

Setelah update code, PWA masih menampilkan versi lama:
- Website sudah update, tapi PWA masih versi lama
- Perlu informasi update di PWA ketika ada update baru

## ✅ Solusi Cepat

### 1. Update Cache Version (PENTING!) ⭐

**File:** `app/frontend/public/service-worker.js`

**Saat ini:** `CACHE_VERSION = '2'`

**Setelah update code, increment ke:**
```javascript
const CACHE_VERSION = '3'; // Increment setiap kali deploy update
```

### 2. Force Update Manual (Jika UpdateNotification tidak muncul)

**Buka browser console (F12) dan jalankan:**

```javascript
// Force update service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    registration.update();
  });
});

// Atau unregister dan reload
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    registration.unregister();
  });
  location.reload();
});
```

### 3. Clear Cache Manual

```javascript
// Clear semua cache
caches.keys().then(cacheNames => {
  cacheNames.forEach(cacheName => {
    caches.delete(cacheName);
  });
});
location.reload();
```

---

## 🔧 Fix yang Sudah Diterapkan

### 1. Dynamic Cache Version ✅

- ✅ Cache version sekarang dinamis (`CACHE_VERSION`)
- ✅ Increment version untuk trigger update

### 2. Faster Update Check ✅

- ✅ Update check dari 1 jam → 5 menit
- ✅ PWA akan check update lebih sering

### 3. Better Update Detection ✅

- ✅ Improved detection untuk waiting service worker
- ✅ Better logging untuk debug

---

## 📝 Cara Update PWA Setelah Code Change

### Step-by-Step:

1. **Update code** (misalnya ubah label "Stok *" → "Stok (Opsional)")

2. **Update CACHE_VERSION:**
   ```javascript
   // Di app/frontend/public/service-worker.js
   const CACHE_VERSION = '3'; // Increment dari '2'
   ```

3. **Deploy** atau restart dev server

4. **Buka PWA** (yang sudah terinstall)

5. **Expected:**
   - ✅ UpdateNotification muncul di pojok atas (dalam 5 menit)
   - ✅ Klik "Update Sekarang" → Reload dengan versi baru
   - ✅ Perubahan terlihat

---

## 🧪 Testing

### Test Update Flow:

1. **Install PWA** (jika belum)
2. **Update code** + **Update CACHE_VERSION** ke '3'
3. **Deploy/restart** server
4. **Buka PWA** (yang sudah terinstall)
5. **Tunggu 5 menit** atau **force update** (console)
6. **Expected:** UpdateNotification muncul

---

## 🐛 Troubleshooting

### UpdateNotification tidak muncul?

1. **Cek CACHE_VERSION:**
   - Pastikan sudah di-increment
   - Cek di `service-worker.js`

2. **Force Update:**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => {
       registration.update();
     });
   });
   ```

3. **Clear Cache:**
   ```javascript
   caches.keys().then(cacheNames => {
     cacheNames.forEach(cacheName => {
       caches.delete(cacheName);
     });
   });
   location.reload();
   ```

---

**Setelah update CACHE_VERSION, PWA akan otomatis detect update!** 🚀

