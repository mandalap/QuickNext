# Sistem Subscription Features

## Alur Data Subscription Features

### 1. Database (Backend)
- Data subscription plan disimpan di tabel `subscription_plans`
- Field yang relevan:
  - `has_reports_access` - Akses laporan
  - `has_promo_access` - Akses promo
  - `has_kitchen_access` - Akses dapur
  - `has_tables_access` - Akses meja
  - `has_attendance_access` - Akses absensi
  - `has_inventory_access` - Akses inventory
  - `has_stock_transfer_access` - Akses transfer stok
  - dll.

### 2. Backend API
- Endpoint: `GET /api/v1/subscriptions/current`
- Controller: `SubscriptionController@getCurrentSubscription`
- Response includes `plan_features` object dengan semua feature flags

### 3. Frontend Cache
- Data disimpan di `localStorage` dengan key `subscriptionFeatures`
- Cache ini digunakan untuk:
  - Menampilkan/menyembunyikan menu
  - Enable/disable tombol
  - Block akses ke halaman

### 4. Masalah yang Terjadi
Ketika user upgrade paket di database (via Filament), frontend masih menggunakan cache lama dari `localStorage`.

## Solusi

### Cara 1: Clear Cache Manual (Recommended)
1. Buka browser console (F12)
2. Jalankan:
   ```javascript
   localStorage.removeItem('subscriptionFeatures');
   localStorage.removeItem('hasActiveSubscription');
   location.reload();
   ```

### Cara 2: Refresh via UI
1. Buka halaman Subscription Settings
2. Klik tombol refresh (F5 atau tombol refresh)
3. Sistem akan otomatis refresh subscription features

### Cara 3: Force Refresh via Code
Fungsi `refreshSubscriptionFeatures()` sudah tersedia di `AuthContext`:
```javascript
const { refreshSubscriptionFeatures } = useAuth();
await refreshSubscriptionFeatures();
```

## Update yang Sudah Dilakukan

1. ✅ `clearAllCache()` - Sekarang juga clear `subscriptionFeatures`
2. ✅ `refreshSubscription()` - Sekarang juga update `subscriptionFeatures`
3. ✅ `refreshSubscriptionFeatures()` - Fungsi baru untuk refresh manual
4. ✅ Backend sudah mengembalikan `plan_features` dengan benar

## Cara Kerja Sistem

1. **Backend** membaca dari database `subscription_plans` table
2. **API Response** mengembalikan `plan_features` object
3. **Frontend** menyimpan ke `localStorage` sebagai cache
4. **Frontend** membaca dari cache untuk menampilkan/menyembunyikan menu

Ketika paket di-upgrade di database:
- Backend akan mengembalikan `plan_features` yang baru
- Tapi frontend masih menggunakan cache lama
- **Solusi**: Clear cache atau refresh subscription features

## Testing

Setelah upgrade paket di Filament:
1. Clear cache: `localStorage.removeItem('subscriptionFeatures')`
2. Refresh halaman
3. Menu seharusnya sudah sesuai dengan paket baru


