# 🔄 Force Update Feature - Update Aplikasi Manual

## ✅ Fitur Baru

Tombol **"Update Aplikasi"** telah ditambahkan di dropdown menu profil (header) yang memungkinkan user untuk:
- ✅ Force update Service Worker
- ✅ Clear semua cache (localStorage, IndexedDB, Service Worker cache, React Query cache)
- ✅ Reload aplikasi dengan data terbaru
- ✅ Bekerja di website dan PWA

---

## 📍 Lokasi

**Menu:** Dropdown profil (klik avatar di header) → **"Update Aplikasi"**

**Posisi:** Setelah "Ganti Password", sebelum "Subscription" (jika owner/admin)

---

## 🚀 Cara Kerja

### Flow Update:

1. **User klik "Update Aplikasi"** di dropdown menu profil
2. **Loading toast muncul:** "🔄 Memperbarui aplikasi..."
3. **Clear semua cache:**
   - ✅ localStorage (subscription, business, outlet, dll)
   - ✅ React Query cache
   - ✅ Service Worker cache
   - ✅ IndexedDB (jika ada)
4. **Unregister Service Worker** (jika ada)
5. **Wait 1 detik** untuk memastikan semua operasi selesai
6. **Success toast:** "✅ Update selesai! Memuat ulang aplikasi..."
7. **Wait 1.5 detik** lagi
8. **Force reload** halaman dengan cache bypass

---

## 🎯 Kapan Menggunakan

### Disarankan untuk digunakan ketika:

1. **PWA tidak update otomatis** setelah ada perubahan code
2. **Data terlihat stale** (misalnya subscription status tidak update)
3. **Cache bermasalah** dan perlu di-clear
4. **Setelah upgrade subscription** dan data belum ter-refresh
5. **Setelah perubahan besar** di aplikasi

---

## ⚙️ Technical Details

### File yang Diubah:

**`app/frontend/src/components/layout/Layout.jsx`**

1. **Import baru:**
   ```javascript
   import toast from 'react-hot-toast';
   import { clearAllCache } from '../../utils/refreshData';
   import { RefreshCw } from 'lucide-react';
   ```

2. **State baru:**
   ```javascript
   const [isUpdating, setIsUpdating] = useState(false);
   ```

3. **Function baru:**
   ```javascript
   const handleForceUpdate = useCallback(async () => {
     // Clear all cache
     // Update service worker
     // Reload page
   }, [isUpdating, queryClient]);
   ```

4. **Button baru di dropdown:**
   ```jsx
   <DropdownMenuItem
     onClick={handleForceUpdate}
     disabled={isUpdating}
   >
     <RefreshCw className={isUpdating ? 'animate-spin' : ''} />
     <span>{isUpdating ? 'Memperbarui...' : 'Update Aplikasi'}</span>
   </DropdownMenuItem>
   ```

---

## 🔧 Yang Dilakukan Saat Update

### 1. Clear All Cache ✅

- **localStorage:**
  - `hasActiveSubscription`
  - `subscription`
  - `businesses`
  - `currentBusiness`
  - `currentBusinessId`
  - `outlets`
  - `currentOutlet`
  - `currentOutletId`
  - Cache utils (business service cache)

- **React Query Cache:**
  - Semua query cache di-clear
  - Data akan di-fetch ulang dari API

- **Service Worker Cache:**
  - Semua cache storage dihapus
  - Service Worker di-unregister

- **IndexedDB:**
  - Semua database dihapus (jika ada)

### 2. Update Service Worker ✅

- Unregister semua Service Worker yang terdaftar
- Service Worker baru akan di-register saat reload

### 3. Force Reload ✅

- Reload halaman dengan cache bypass
- URL ditambahkan timestamp untuk bypass cache
- Semua data akan di-load ulang dari server

---

## 🎨 UI/UX

### Loading State:

- **Button disabled** saat update berjalan
- **Icon spinning** (RefreshCw dengan `animate-spin`)
- **Text berubah** menjadi "Memperbarui..."
- **Toast loading** muncul selama proses (max 2 menit)

### Success State:

- **Success toast** muncul: "✅ Update selesai! Memuat ulang aplikasi..."
- **Auto reload** setelah 1.5 detik

### Error State:

- **Error toast** muncul jika ada masalah
- **Button enabled kembali** untuk retry

---

## 🧪 Testing

### Test Scenario:

1. **Test di Website:**
   - Klik avatar → "Update Aplikasi"
   - Pastikan loading toast muncul
   - Pastikan halaman reload setelah update
   - Pastikan data ter-load ulang

2. **Test di PWA:**
   - Install PWA
   - Klik avatar → "Update Aplikasi"
   - Pastikan Service Worker di-unregister
   - Pastikan halaman reload dengan versi baru

3. **Test dengan Cache:**
   - Simpan data di localStorage
   - Klik "Update Aplikasi"
   - Pastikan localStorage ter-clear
   - Pastikan data ter-load ulang dari API

---

## 📝 Catatan

- ⚠️ **Durasi update:** Sekitar 1-2 menit (tergantung jumlah cache)
- ⚠️ **Data akan hilang sementara** saat clear cache, tapi akan di-load ulang setelah reload
- ⚠️ **User akan logout** jika token di-clear (tapi biasanya token tidak di-clear)
- ✅ **Aman digunakan** kapan saja, tidak akan merusak data
- ✅ **Bekerja di website dan PWA**

---

## 🔄 Perbedaan dengan Auto Update

### Auto Update (UpdateNotification):
- ✅ Otomatis detect update
- ✅ Muncul notifikasi di pojok atas
- ✅ User bisa pilih "Update Sekarang" atau "Nanti"
- ⚠️ Hanya update Service Worker, tidak clear cache

### Force Update (Button di Menu):
- ✅ Manual trigger oleh user
- ✅ Clear semua cache
- ✅ Unregister Service Worker
- ✅ Force reload dengan cache bypass
- ✅ Lebih thorough untuk fix masalah cache

---

**Fitur ini memastikan user selalu mendapat versi terbaru aplikasi dan data terbaru!** 🚀

