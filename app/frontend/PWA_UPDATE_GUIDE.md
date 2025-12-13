# 🔄 PWA Update Guide - Memastikan PWA Mendapat Update Terbaru

## ❌ Masalah

Setelah update code, PWA yang sudah terinstall masih menampilkan versi lama:
- Website sudah update, tapi PWA masih versi lama
- Perlu informasi update di PWA ketika ada update baru
- Service Worker cache masih menggunakan versi lama

## ✅ Solusi

### 1. Update Cache Version ✅

**File:** `app/frontend/public/service-worker.js`

- ✅ Mengubah `CACHE_NAME` menjadi dinamis dengan version number
- ✅ Increment version number setiap kali deploy update baru
- ✅ Service Worker akan otomatis detect perubahan dan trigger update

**Cara kerja:**
- Saat ini: `CACHE_VERSION = '2'`
- Setiap update code, increment ke `'3'`, `'4'`, dst.
- Browser akan detect cache version berbeda dan trigger update

### 2. Update Check Frequency ✅

**File:** `app/frontend/src/hooks/useServiceWorkerUpdate.js` & `App.js`

- ✅ Mengubah update check dari 1 jam menjadi 5 menit
- ✅ PWA akan check update lebih sering
- ✅ User akan mendapat notifikasi update lebih cepat

### 3. Update Notification ✅

**File:** `app/frontend/src/components/pwa/UpdateNotification.jsx`

- ✅ Notifikasi akan muncul otomatis ketika ada update
- ✅ User bisa klik "Update Sekarang" untuk update
- ✅ User bisa klik "Nanti" untuk dismiss (tapi akan muncul lagi)

### 4. Better Update Detection ✅

**File:** `app/frontend/src/hooks/useServiceWorkerUpdate.js`

- ✅ Improved detection untuk waiting service worker
- ✅ Better logging untuk debug
- ✅ Auto-reload setelah update

---

## 🚀 Cara Kerja

### Flow Update PWA:

1. **Developer update code** dan deploy
2. **Service Worker detect** perubahan (cache version berbeda)
3. **New Service Worker install** di background
4. **UpdateNotification muncul** di pojok atas
5. **User klik "Update Sekarang"** → Reload dengan versi baru
6. **User klik "Nanti"** → Tetap pakai versi lama (tapi notifikasi akan muncul lagi)

---

## 📝 Cara Update Cache Version

### Setiap kali deploy update baru:

1. **Buka file:** `app/frontend/public/service-worker.js`
2. **Update CACHE_VERSION:**
   ```javascript
   const CACHE_VERSION = '3'; // Increment dari '2' ke '3'
   ```
3. **Deploy** aplikasi
4. **PWA akan otomatis detect** update dan show notification

---

## 🧪 Testing

### Test Update Flow:

1. **Install PWA** (jika belum)
2. **Update code** (misalnya ubah label "Stok *" menjadi "Stok (Opsional)")
3. **Update CACHE_VERSION** di service-worker.js (dari '2' ke '3')
4. **Deploy** atau restart dev server
5. **Buka PWA** (yang sudah terinstall)
6. **Expected:**
   - ✅ UpdateNotification muncul di pojok atas
   - ✅ Klik "Update Sekarang" → Reload dengan versi baru
   - ✅ Perubahan terlihat (label "Stok (Opsional)")

### Manual Force Update (Jika UpdateNotification tidak muncul):

1. **Buka PWA**
2. **Buka DevTools** (F12)
3. **Application tab** → **Service Workers**
4. **Klik "Update"** atau **"Unregister"** lalu reload
5. **Atau:** Clear cache dan reload

---

## 🔧 Troubleshooting

### PWA masih versi lama setelah update?

1. **Cek CACHE_VERSION:**
   - Pastikan sudah di-increment
   - Cek di `service-worker.js`

2. **Force Update:**
   ```javascript
   // Di browser console (F12)
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => {
       registration.update();
     });
   });
   ```

3. **Clear Cache:**
   ```javascript
   // Di browser console (F12)
   caches.keys().then(cacheNames => {
     cacheNames.forEach(cacheName => {
       caches.delete(cacheName);
     });
   });
   location.reload();
   ```

4. **Unregister Service Worker:**
   - Buka DevTools (F12)
   - Application tab → Service Workers
   - Klik "Unregister"
   - Reload halaman

---

## ✅ Expected Behavior

**Setelah update code:**
- ✅ UpdateNotification muncul otomatis (dalam 5 menit)
- ✅ User bisa update dengan klik "Update Sekarang"
- ✅ PWA akan reload dengan versi baru
- ✅ Semua perubahan terlihat (termasuk label "Stok (Opsional)")

---

## 📝 Checklist Setelah Update Code

- [ ] Update `CACHE_VERSION` di `service-worker.js`
- [ ] Deploy aplikasi
- [ ] Test di PWA (buka PWA yang sudah terinstall)
- [ ] Cek apakah UpdateNotification muncul
- [ ] Test update flow (klik "Update Sekarang")

---

**Setelah update CACHE_VERSION dan deploy, PWA akan otomatis detect update dan show notification!** 🚀

