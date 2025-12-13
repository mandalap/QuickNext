# 🔧 Perbaikan Duplikasi Customer - Nomor HP Unik Per Outlet

## ❌ Masalah yang Ditemukan

User melaporkan di halaman pelanggan ada data customer yang double:

- Nomor HP sama tapi nama berbeda
- Seharusnya nomor HP sudah dikondisikan unik untuk setiap outlet

**Dari gambar:**

- Phone: 085652373501 muncul 3 kali dengan nama berbeda:
  1. Juli Mandala Putera (Rp 866.800 total belanja)
  2. Juli Mandala Putera (Rp 0, marked "Baru")
  3. Ita Amalia Mawaddah (Rp 0, marked "Baru")

## 🔍 Analisis Masalah

### Root Cause:

1. **Validasi tidak cukup ketat:**

   - `CustomerController::store()` tidak ada validasi unique untuk phone
   - `SalesController::createCustomer()` hanya validasi unique per business, bukan per outlet

2. **Query tidak filter per outlet:**

   - `SalesController::getCustomers()` tidak filter berdasarkan outlet yang aktif
   - Menampilkan semua customer dari business tanpa mempertimbangkan outlet

3. **Tidak ada deduplikasi:**
   - Backend tidak melakukan deduplikasi customer dengan phone yang sama
   - Frontend tidak melakukan deduplikasi saat menampilkan

## ✅ Perbaikan yang Dilakukan

### 1. **Fix Validasi Create Customer di CustomerController**

```php
// Sekarang mengecek apakah phone sudah terdaftar untuk outlet tertentu
// Melalui orders yang pernah dibuat di outlet tersebut
'phone' => [
    'required',
    'string',
    'max:20',
    function ($attribute, $value, $fail) use ($businessId, $outletId) {
        if ($outletId) {
            $existingCustomer = Customer::where('business_id', $businessId)
                ->where('phone', $value)
                ->whereHas('orders', function ($query) use ($outletId) {
                    $query->where('outlet_id', $outletId);
                })
                ->first();

            if ($existingCustomer) {
                $fail('Nomor telepon sudah terdaftar untuk outlet ini.');
紹介            }
        }
    },
],
```

### 2. **Fix Validasi Create Customer di SalesController**

```php
// Validasi yang sama untuk endpoint /v1/sales/customers
'phone' => [
    'required',
    'string',
    'max:20',
    function ($attribute, $value, $fail) use ($businessId, $outletId) {
        // Cek apakah sudah ada customer dengan phone yang sama
        // yang pernah order di outlet ini
        ...
    },
],
```

### 3. **Fix Query Get Customers dengan Deduplikasi**

```php
// Deduplikasi customer berdasarkan phone
// Untuk outlet: hanya tampilkan customer unik per phone yang pernah order di outlet tersebut
$uniqueCustomers = collect();
$seenPhones = [];

foreach ($sortedCustomers as $customer) {
    $phone = $customer->phone;
    if (!$phone) {
        $uniqueCustomers->push($customer);
        continue;
    }

    // Jika phone sudah pernah dilihat, skip
    if (isset($seenPhones[$phone])) {
        continue;
    }

    // Jika ada outlet_id, pastikan customer relevan untuk outlet tersebut
    if ($outletId) {
        $hasOrderInOutlet = $customer->orders()
            ->where('outlet_id', $outletId)
            ->exists();

        // Logika deduplikasi...
    }

    $seenPhones[$phone] = true;
    $uniqueCustomers->push($customer);
}
```

### 4. **Fix Frontend - Deduplikasi di useSales Hook**

```javascript
// Deduplikasi customer berdasarkan phone (safety net)
const seenPhones = new Map();
const uniqueCustomers = customersArray.filter((customerrific) => {
  const phone = customer.phone;
  if (!phone) return true;

  if (seenPhones.has(phone)) {
    return false; // Skip duplicate phone
  }
  seenPhones.set(phone, true);
  return true;
});
```

## 📊 Logika Unik Per Outlet

### Konsep:

1. **Customer per Business**: Customer dibuat di level business, bukan per outlet
2. **Unik per Outlet**: Nomor HP harus unik untuk outlet tertentu
3. **Cek melalui Orders**: Validasi unik dilakukan dengan mengecek apakah customer dengan phone yang sama sudah pernah membuat order di outlet tersebut

### Contoh:

```
Business A
├── Outlet 1
│   ├── Customer 1: Phone 08123 (sudah order di Outlet 1)
│   └── Customer 2: Phone 08123 ❌ TIDAK BISA (sudah ada yang order di Outlet 1)
│
└── Outlet 2
    ├── Customer 1: Phone 08123 (belum pernah order di Outlet 2)
    └── Customer 3: Phone 08123 ✅ BISA (belum ada yang order di Outlet 2)
```

## 🎯 Solusi untuk Data yang Sudah Duplikat

### Option 1: Merge Customer (Recommended)

1. Identifikasi customer dengan phone yang sama
2. Merge order dari customer duplikat ke customer utama
3. Hapus customer duplikat

### Option 2: Script Cleanup

Buat script untuk:

1. Group customer berdasarkan phone per outlet
2. Pilih customer utama (yang paling banyak order)
3. Update order.customer_id ke customer utama
4. Soft delete customer duplikat

## ✅ Status Perbaikan

- ✅ Validasi create customer sudah diperbaiki
- ✅ Query get customers sudah ada deduplikasi
- ✅ Frontend sudah ada deduplikasi
- ⚠️ Data duplikat yang sudah ada perlu dibersihkan (script cleanup)

## 📝 File yang Diperbaiki

1. **`app/backend/app/Http/Controllers/Api/CustomerController.php`**

   - Method `store()` - Validasi unique phone per outlet

2. **`app/backend/app/Http/Controllers/Api/SalesController.php`**

   - Method `createCustomer()` - Validasi unique phone per outlet
   - Method `getCustomers()` - Deduplikasi customer berdasarkan phone

3. **`app/frontend/src/hooks/useSales.js`**
   - Function `fetchCustomers()` - Deduplikasi di frontend sebagai safety net

## 🔄 Next Steps

1. **Cleanup Data Duplikat:**

   - Buat script untuk merge customer duplikat
   - Update semua order.customer_id ke customer utama
   - Soft delete customer duplikat

2. **Testing:**
   - Test create customer dengan phone yang sama di outlet berbeda
   - Test create customer dengan phone yang sama di outlet yang sama (harus gagal)
   - Test tampilan customer di halaman sales (tidak ada duplikasi)

---

**Catatan Penting:**

- Validasi unik per outlet dilakukan melalui orders
- Customer baru yang belum pernah order bisa dibuat dengan phone yang sama
- Setelah customer pertama order di outlet, customer lain dengan phone sama tidak bisa dibuat untuk outlet tersebut
- Data duplikat yang sudah ada perlu dibersihkan manual atau dengan script

