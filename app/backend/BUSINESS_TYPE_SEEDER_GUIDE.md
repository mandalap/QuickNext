# 📋 Business Type Seeder - Panduan Lengkap

## ✅ Status: Sudah Diimplementasikan

Seeder untuk jenis bisnis (business types) sudah dibuat dan siap digunakan.

---

## 📁 File yang Terlibat

1. **`app/backend/database/seeders/BusinessTypeSeeder.php`** - Seeder utama
2. **`app/backend/database/seeders/DatabaseSeeder.php`** - Memanggil BusinessTypeSeeder
3. **`app/backend/app/Models/BusinessType.php`** - Model BusinessType
4. **`app/backend/database/migrations/2025_11_01_083431_create_business_types_table.php`** - Migration table

---

## 🎯 Jenis Bisnis yang Tersedia

Seeder akan membuat **8 jenis bisnis** berikut:

| No | Code | Nama | Deskripsi |
|----|------|------|-----------|
| 1 | `restaurant` | Restaurant & Cafe | Restaurant, cafe, warung makan, dan bisnis makanan minuman lainnya |
| 2 | `retail` | Retail Store | Toko retail, minimarket, supermarket, dan toko kelontong |
| 3 | `laundry` | Laundry | Usaha laundry, cuci setrika, dry cleaning |
| 4 | `salon` | Salon & Barbershop | Salon kecantikan, barbershop, spa, dan perawatan tubuh |
| 5 | `pharmacy` | Apotik & Farmasi | Apotik, toko obat, dan penjualan produk kesehatan |
| 6 | `bakery` | Bakery & Pastry | Toko roti, pastry, kue, dan produk bakery lainnya |
| 7 | `coffee` | Coffee Shop | Kedai kopi, coffee shop, dan minuman kopi |
| 8 | `general` | Bisnis Umum | Bisnis umum yang fleksibel untuk berbagai jenis usaha |

---

## 🚀 Cara Menjalankan Seeder

### 1. Menjalankan Semua Seeder (Recommended)

```bash
cd app/backend
php artisan db:seed
```

Ini akan menjalankan semua seeder termasuk:
- ✅ BusinessTypeSeeder
- ✅ SubscriptionPlanSeeder
- ✅ OutletSeeder
- ✅ DummyDataSeeder
- ✅ FilamentAdminSeeder

### 2. Menjalankan Hanya BusinessTypeSeeder

```bash
cd app/backend
php artisan db:seed --class=BusinessTypeSeeder
```

### 3. Fresh Migration + Seeder (Development)

```bash
cd app/backend
php artisan migrate:fresh --seed
```

**⚠️ WARNING:** `migrate:fresh` akan **menghapus semua data** di database dan menjalankan migration + seeder dari awal. Hanya gunakan di development!

---

## 🔧 Fitur Seeder

### ✅ Update or Create Pattern

Seeder menggunakan `updateOrCreate()` yang berarti:
- ✅ **Aman dijalankan berkali-kali** - tidak akan duplicate data
- ✅ **Update data jika sudah ada** - berdasarkan `code` sebagai unique key
- ✅ **Create jika belum ada** - insert data baru

### ✅ Data Lengkap

Setiap business type memiliki:
- `code` - Unique identifier (restaurant, retail, laundry, dll)
- `name` - Nama bisnis (Restaurant & Cafe, Retail Store, dll)
- `description` - Deskripsi lengkap
- `icon` - Icon name untuk UI
- `has_products` - Support produk
- `has_services` - Support layanan
- `requires_stock` - Perlu tracking inventory
- `requires_tables` - Perlu manajemen meja
- `requires_kitchen` - Perlu manajemen dapur
- `order_statuses` - Custom order status flow (JSON)
- `pricing_models` - Model pricing yang didukung (JSON)
- `order_fields` - Field tambahan untuk order (JSON)
- `features` - Fitur yang tersedia (JSON)
- `is_active` - Status aktif/tidak aktif
- `sort_order` - Urutan tampil

---

## 📊 Contoh Data

### Restaurant & Cafe
```php
[
    'code' => 'restaurant',
    'name' => 'Restaurant & Cafe',
    'description' => 'Restaurant, cafe, warung makan, dan bisnis makanan minuman lainnya',
    'icon' => 'utensils',
    'has_products' => true,
    'has_services' => false,
    'requires_stock' => true,
    'requires_tables' => true,
    'requires_kitchen' => true,
    'order_statuses' => ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
    'pricing_models' => ['per_unit'],
    'order_fields' => [],
    'features' => ['tables', 'kitchen', 'waiter', 'takeaway', 'delivery'],
    'is_active' => true,
    'sort_order' => 1,
]
```

### Laundry
```php
[
    'code' => 'laundry',
    'name' => 'Laundry',
    'description' => 'Usaha laundry, cuci setrika, dry cleaning',
    'icon' => 'tshirt',
    'has_products' => false,
    'has_services' => true,
    'requires_stock' => false,
    'requires_tables' => false,
    'requires_kitchen' => false,
    'order_statuses' => ['received', 'washing', 'ironing', 'ready', 'completed', 'picked_up'],
    'pricing_models' => ['per_kg', 'per_item', 'package'],
    'order_fields' => ['weight', 'item_type', 'special_notes', 'pickup_date'],
    'features' => ['weight_tracking', 'pickup_notification', 'express_service'],
    'is_active' => true,
    'sort_order' => 3,
]
```

---

## 🔍 Verifikasi Data

### Cek via Tinker

```bash
cd app/backend
php artisan tinker
```

```php
// Cek semua business types
\App\Models\BusinessType::all();

// Cek jumlah business types
\App\Models\BusinessType::count();

// Cek business type tertentu
\App\Models\BusinessType::where('code', 'restaurant')->first();
```

### Cek via API

```bash
# Get all business types
curl http://localhost:8000/api/business-types

# Get specific business type
curl http://localhost:8000/api/business-types/restaurant
```

---

## ➕ Menambahkan Business Type Baru

Untuk menambahkan business type baru, edit file `BusinessTypeSeeder.php`:

```php
$businessTypes = [
    // ... existing types ...
    
    [
        'code' => 'new_type',
        'name' => 'New Business Type',
        'description' => 'Deskripsi bisnis baru',
        'icon' => 'icon-name',
        'has_products' => true,
        'has_services' => false,
        'requires_stock' => true,
        'requires_tables' => false,
        'requires_kitchen' => false,
        'order_statuses' => ['pending', 'processing', 'completed', 'cancelled'],
        'pricing_models' => ['per_unit'],
        'order_fields' => [],
        'features' => ['feature1', 'feature2'],
        'is_active' => true,
        'sort_order' => 10,
    ],
];
```

Kemudian jalankan seeder lagi:
```bash
php artisan db:seed --class=BusinessTypeSeeder
```

---

## ✅ Checklist

- [x] BusinessTypeSeeder sudah dibuat
- [x] Data business types sudah lengkap (8 jenis)
- [x] Seeder dipanggil di DatabaseSeeder
- [x] Menggunakan updateOrCreate (aman dijalankan berkali-kali)
- [x] Success message ditambahkan
- [x] Data sudah di-test dan berhasil

---

## 🎯 Next Steps

1. ✅ Seeder sudah siap digunakan
2. ✅ Data sudah di-seed ke database
3. ✅ API endpoint sudah tersedia di `/api/business-types`
4. ✅ Frontend bisa fetch business types untuk ditampilkan di form

---

## 📝 Catatan

- Seeder menggunakan `updateOrCreate()` berdasarkan `code`, jadi aman dijalankan berkali-kali
- Data akan di-update jika sudah ada (berdasarkan code)
- Data akan di-create jika belum ada
- Tidak akan ada duplicate data karena `code` adalah unique

