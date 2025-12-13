# 🔄 Refresh Data Setelah Upgrade - Tanpa Uninstall

## ❌ Masalah

Setelah upgrade paket, data tidak ter-update:
- Subscription masih menunjukkan "Trial 7 hari" padahal sudah upgrade ke Profesional
- Outlet lama masih muncul
- Harus uninstall dan install lagi baru data ter-update

## ✅ Solusi

**TIDAK PERLU UNINSTALL!** Ada cara yang lebih mudah.

---

## 🚀 Cara Refresh Data (Tanpa Uninstall)

### Option 1: Refresh Manual via Console (Cepat)

Buka browser console (F12) dan jalankan:

```javascript
// Clear semua cache
localStorage.removeItem('hasActiveSubscription');
localStorage.removeItem('subscription');
localStorage.removeItem('businesses');
localStorage.removeItem('currentBusiness');
localStorage.removeItem('currentBusinessId');
localStorage.removeItem('outlets');
localStorage.removeItem('currentOutlet');
localStorage.removeItem('currentOutletId');

// Reload halaman
location.reload();
```

### Option 2: Hard Refresh (Paling Mudah)

**Windows:**
- `Ctrl + Shift + R`
- Atau `Ctrl + F5`

**Mac:**
- `Cmd + Shift + R`

**Mobile:**
- Clear browser cache
- Atau uninstall app (hanya untuk PWA, bukan uninstall database)

### Option 3: Clear Cache via Settings

1. Buka browser settings
2. Clear browsing data
3. Pilih "Cached images and files"
4. Clear data
5. Reload halaman

---

## 🔧 Fix yang Sudah Diterapkan

### 1. Auto-Refresh Setelah Upgrade

Setelah upgrade berhasil, sistem akan:
- ✅ Clear semua cache (subscription, business, outlet)
- ✅ Refresh data dari API
- ✅ Update subscription status
- ✅ Reload businesses dan outlets

**File yang diubah:**
- `app/frontend/src/pages/PaymentSuccess.jsx`
- `app/frontend/src/components/subscription/SubscriptionSettings.jsx`

### 2. Utility Function

**File baru:** `app/frontend/src/utils/refreshData.js`

Fungsi yang tersedia:
- `clearAllCache()` - Clear semua cache
- `refreshSubscription()` - Refresh subscription status
- `refreshBusinesses()` - Refresh business data
- `refreshOutlets()` - Refresh outlet data
- `refreshAllData()` - Refresh semua data
- `refreshAndReload()` - Refresh dan reload halaman

---

## 🧪 Testing

### Test Setelah Upgrade:

1. **Upgrade paket** (dari Trial ke Profesional)
2. **Setelah payment success**, data akan auto-refresh
3. **Jika masih trial**, coba:
   - Hard refresh: `Ctrl + Shift + R`
   - Atau clear cache manual (console)

### Expected Result:

- ✅ Subscription status ter-update (Profesional, bukan Trial)
- ✅ Outlet baru muncul (bukan outlet lama)
- ✅ Business data ter-update
- ✅ Tidak perlu uninstall

---

## 🐛 Troubleshooting

### Masih Trial Setelah Upgrade?

1. **Cek Console:**
   ```javascript
   // Cek subscription cache
   localStorage.getItem('hasActiveSubscription');
   localStorage.getItem('subscription');
   ```

2. **Clear Cache Manual:**
   ```javascript
   localStorage.removeItem('hasActiveSubscription');
   localStorage.removeItem('subscription');
   location.reload();
   ```

3. **Cek API:**
   - Buka Network tab (F12)
   - Cari request ke `/api/v1/subscriptions/current`
   - Cek response - apakah status sudah "active"?

### Masih Muncul Outlet Lama?

1. **Clear Outlet Cache:**
   ```javascript
   localStorage.removeItem('currentOutlet');
   localStorage.removeItem('currentOutletId');
   localStorage.removeItem('outlets');
   location.reload();
   ```

2. **Hard Refresh:**
   - `Ctrl + Shift + R` (Windows)
   - `Cmd + Shift + R` (Mac)

---

## 📝 Checklist Setelah Upgrade

- [ ] Hard refresh halaman (`Ctrl + Shift + R`)
- [ ] Cek subscription status di header (harus Profesional, bukan Trial)
- [ ] Cek outlet di header (harus outlet baru, bukan outlet lama)
- [ ] Cek console untuk error (F12)

---

## ✅ Quick Fix

**Jika masih bermasalah setelah upgrade:**

1. **Buka Console (F12)**
2. **Jalankan:**
   ```javascript
   // Clear semua
   localStorage.clear();
   location.reload();
   ```

3. **Login lagi**
4. **Data akan ter-load fresh dari API**

---

## 💡 Tips

- **Tidak perlu uninstall** - cukup hard refresh atau clear cache
- **Setelah upgrade**, sistem akan auto-refresh (tapi kadang perlu hard refresh)
- **Jika masih bermasalah**, clear cache manual via console

---

**Setelah upgrade, cukup hard refresh (`Ctrl + Shift + R`) dan data akan ter-update!** 🚀

