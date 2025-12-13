# 📦 Subscription Plan Seeder

## 📋 Paket Subscription yang Dibuat

Seeder ini akan membuat 4 paket subscription dengan berbagai durasi:

### 1. **Trial 7 Hari** (Gratis)
- Slug: `trial-7-days`
- Harga: **Rp 0** (Gratis)
- Durasi: 7 hari
- Fitur:
  - 1 outlet
  - 50 produk
  - 2 karyawan
  - Laporan dasar

### 2. **Basic Plan**
- Slug: `basic`
- Harga:
  - **1 bulan**: Rp 99.000
  - **3 bulan**: Rp 267.300 (hemat 10%)
  - **6 bulan**: Rp 504.900 (hemat 15%)
  - **12 bulan**: Rp 950.400 (hemat 20%)
- Fitur:
  - 1 outlet
  - 100 produk
  - 5 karyawan
  - Laporan dasar

### 3. **Professional Plan** (Paling Populer)
- Slug: `professional`
- Harga:
  - **1 bulan**: Rp 249.000
  - **3 bulan**: Rp 672.300 (hemat 10%)
  - **6 bulan**: Rp 1.269.900 (hemat 15%)
  - **12 bulan**: Rp 2.241.000 (hemat 25%)
- Fitur:
  - 3 outlet
  - 500 produk
  - 15 karyawan
  - Integrasi online
  - Laporan advanced
  - Multi lokasi

### 4. **Enterprise Plan**
- Slug: `enterprise`
- Harga:
  - **1 bulan**: Rp 499.000
  - **3 bulan**: Rp 1.347.300 (hemat 10%)
  - **6 bulan**: Rp 2.544.900 (hemat 15%)
  - **12 bulan**: Rp 4.191.600 (hemat 30%)
- Fitur:
  - Unlimited outlet
  - Unlimited produk
  - Unlimited karyawan
  - API access
  - Custom reports
  - Support 24/7

---

## 🚀 Cara Menjalankan Seeder

### Opsi 1: Menjalankan Semua Seeder (Recommended)
```bash
cd app/backend
php artisan db:seed
```

Ini akan menjalankan semua seeder termasuk:
- BusinessTypeSeeder
- SubscriptionPlanSeeder ✅
- OutletSeeder
- DummyDataSeeder
- FilamentAdminSeeder

### Opsi 2: Hanya Subscription Plan Seeder
```bash
cd app/backend
php artisan db:seed --class=SubscriptionPlanSeeder
```

### Opsi 3: Refresh Database dan Seed
```bash
cd app/backend
php artisan migrate:fresh --seed
```

⚠️ **PENTING**: `migrate:fresh` akan menghapus semua data dan membuat ulang database!

---

## ✅ Verifikasi Seeder

Setelah menjalankan seeder, verifikasi dengan:

### 1. Cek via Tinker
```bash
cd app/backend
php artisan tinker
```

```php
// Cek jumlah plans
\App\Models\SubscriptionPlan::count(); // Harus 4

// Cek plans yang aktif
\App\Models\SubscriptionPlan::where('is_active', true)->get();

// Cek prices
\App\Models\SubscriptionPlanPrice::count(); // Harus 13 (1 trial + 4 basic + 4 pro + 4 enterprise)
```

### 2. Cek via API
```bash
curl http://localhost:8000/api/v1/subscriptions/plans
```

### 3. Cek via Frontend
Buka halaman subscription plans di frontend:
```
http://localhost:5173/subscription-plans
```

---

## 🔧 Troubleshooting

### Q: Plans tidak muncul di frontend
**A**: 
1. Pastikan seeder sudah dijalankan
2. Pastikan plans `is_active = true`
3. Clear cache: `php artisan cache:clear`
4. Cek API endpoint: `GET /api/v1/subscriptions/plans`

### Q: Error "No subscription plan found"
**A**: 
- Jalankan seeder: `php artisan db:seed --class=SubscriptionPlanSeeder`
- Pastikan plans sudah dibuat dengan `is_active = true`

### Q: Plans terhapus setelah menjalankan DummyDataSeeder
**A**: 
- ✅ **FIXED**: DummyDataSeeder sekarang TIDAK menghapus subscription plans
- Subscription plans hanya dihapus jika di-truncate manual atau migrate:fresh

### Q: Ingin reset plans
**A**: 
```bash
# Hapus semua plans dan prices
php artisan tinker
```
```php
\App\Models\SubscriptionPlanPrice::truncate();
\App\Models\SubscriptionPlan::truncate();

# Jalankan seeder lagi
exit
php artisan db:seed --class=SubscriptionPlanSeeder
```

---

## 📝 Catatan Penting

⚠️ **PENTING**: 
- Subscription plans adalah data master yang penting
- Jangan hapus plans yang sudah digunakan oleh user
- Jika ingin mengubah harga, edit via Filament admin panel atau langsung di database
- Plans dengan `is_active = false` tidak akan muncul di frontend

---

## 🔗 File Terkait

- **Seeder**: `app/backend/database/seeders/SubscriptionPlanSeeder.php`
- **Model**: `app/backend/app/Models/SubscriptionPlan.php`
- **Model Price**: `app/backend/app/Models/SubscriptionPlanPrice.php`
- **Controller**: `app/backend/app/Http/Controllers/Api/SubscriptionController.php`
- **API Route**: `GET /api/v1/subscriptions/plans`

