# Debug Subscription Features

## Masalah
Menu yang dikunci masih belum bisa diakses setelah upgrade paket.

## Langkah Debug

### 1. Cek Console Browser
Buka browser console (F12) dan cek:
```javascript
// Cek subscription features di localStorage
JSON.parse(localStorage.getItem('subscriptionFeatures'))

// Cek subscription features di state (via window)
// (jika ada debug mode)
```

### 2. Cek API Response
Buka Network tab di browser, cari request ke `/api/v1/subscriptions/current`, dan cek response:
- Apakah `plan_features` ada?
- Apakah `has_reports_access` atau `has_promo_access` sudah `true`?

### 3. Cek State di React DevTools
Jika menggunakan React DevTools:
- Cari component `AuthProvider`
- Cek state `subscriptionFeatures`
- Apakah nilainya sudah sesuai dengan API response?

### 4. Test Manual Refresh
1. Klik avatar di navbar
2. Pilih "Refresh Akses Fitur"
3. Cek console log: `✅ Subscription features refreshed:`
4. Cek apakah menu sudah bisa diakses

### 5. Test Clear Cache Manual
Jalankan di browser console:
```javascript
// Clear cache
localStorage.removeItem('subscriptionFeatures');
localStorage.removeItem('hasActiveSubscription');

// Reload halaman
location.reload();
```

### 6. Cek Backend Database
Pastikan di database:
- Tabel `subscription_plans` sudah memiliki field `has_reports_access` atau `has_promo_access` = `true`
- Tabel `user_subscriptions` sudah terhubung dengan plan yang benar

## Perbaikan yang Sudah Dilakukan

1. ✅ Default value `subscriptionFeatures` sudah lengkap dengan semua features
2. ✅ Auto-sync state dengan localStorage (polling setiap 2 detik)
3. ✅ Auto-refresh saat upgrade paket
4. ✅ Tombol refresh di dropdown profil
5. ✅ Integrasi dengan update aplikasi

## Jika Masih Tidak Bisa

1. **Cek apakah paket di database sudah benar:**
   ```sql
   SELECT * FROM subscription_plans WHERE id = [plan_id];
   ```

2. **Cek apakah subscription user sudah benar:**
   ```sql
   SELECT * FROM user_subscriptions WHERE user_id = [user_id] AND status = 'active';
   ```

3. **Cek API response langsung:**
   ```bash
   curl -H "Authorization: Bearer [token]" http://localhost:8000/api/v1/subscriptions/current
   ```

4. **Force refresh dengan reload:**
   - Clear semua cache
   - Reload halaman
   - Cek console log untuk melihat subscription features yang di-load


