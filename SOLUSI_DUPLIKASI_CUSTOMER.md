# 🔧 Solusi Duplikasi Customer - Nomor HP Unik Per Outlet

## ❌ Masalah

Di halaman pelanggan ada data customer yang double:

- Nomor HP sama (`085652373501`) tapi nama berbeda:
  1. Juli Mandala Putera (Rp 866.800 total belanja)
  2. Juli Mandala Putera (Rp 0, marked "Baru")
  3. Ita Amalia Mawaddah (Rp 0, marked "Baru")

Seharusnya nomor HP sudah dikondisikan unik untuk setiap outlet.

## ✅ Solusi yang Diterapkan

### 1. **Validasi Create Customer - Unik Per Outlet**

#### CustomerController::store()

```php
'phone' => [
    'required',
    'string',
    'max:20',
    function ($attribute, $value, $fail) use ($businessId, $outletId) {
        if ($outletId) {
            // Cek apakah sudah ada customer dengan phone yang sama
            // yang pernah order di outlet ini
            $existingCustomer = Customer::where('business_id', $businessId)
                ->where('phone', $value)
                ->whereHas('orders', function ($query) use ($outletId) {
                    $query->where('outlet_id', $outletId);
                })
                ->first();

            if ($existingCustomer) {
                $fail('Nomor telepon sudah terdaftar untuk outlet ini.');
            }
        }
    },
],
```

#### SalesController::createCustomer()

- Validasi yang sama diterapkan

### 2. **Deduplikasi di Backend - Get Customers**

```php
// Deduplikasi customer berdasarkan phone
// Normalize phone dan ambil customer pertama per phone (yang paling baru)
$uniqueCustomers = collect();
$seenPhones = [];

$customerCollection = $customers->getCollection();
$sortedCustomers = $customerCollection->sortByDesc('created_at');

foreach ($sortedCustomers as $customer) {
    $phone = $customer->phone;

    if (!$phone || trim($phone) === '') Sequel {
        $uniqueCustomers->push($customer);
        continue;
    }

    // Normalize phone (remove spaces, dashes)
    $normalizedPhone = preg_replace('/[\s\-]/', '', $phone);

    // Jika phone sudah pernah dilihat, skip
    if (isset($seenPhones[$normalizedPhone])) {
        continue;
    }

    $seenPhones[$normalizedPhone] = true;
    $uniqueCustomers->push($customer);
}

$customers->setCollection($uniqueCustomers->values());
```

### 3. **Deduplikasi di Frontend - Safety Net**

```javascript
// Di useSales.js - fetchCustomers()
const seenPhones = new Map();
const uniqueCustomers = customersArray.filter((customer) => {
  const phone = customer.phone;
  if (!phone) return true;

  if (seenPhones.has(phone)) {
    return false; // Skip duplicate phone
  }
  seenPhones.set(phone, true);
  return true;
});
```

### 4. **Script Cleanup Data Duplikat**

File: `app/backend/fix_duplicate_customers.php`

Script ini akan:

1. Mengidentifikasi customer duplikat berdasarkan phone per outlet
2. Memilih customer utama (yang paling banyak order)
3. Memindahkan order dari customer duplikat ke customer utama
4. Menghapus (soft delete) customer duplikat

**Cara menjalankan:**

```bash
cd app/backend
php fix_duplicate_customers.php
```

##langkah Penggunaan

### 1. **Jalankan Script Cleanup (Sekali)**

```bash
cd app/backend
php fix_duplicate_customers.php
```

Ini akan membersihkan data duplikat yang sudah ada di database.

### 2. **Validasi Sekarang Bekerja**

- Ketika membuat customer baru dengan phone yang sama di outlet yang sama (yang sudah ada customer dengan phone tersebut yang pernah order), akan muncul error: "Nomor telepon sudah terdaftar untuk outlet ini."
- Customer baru dengan phone yang sama di outlet berbeda bisa dibuat (karena belum ada order di outlet tersebut)

### 3. **Display Tidak Ada Duplikasi**

- Backend sudah melakukan deduplikasi berdasarkan phone
- Frontend juga melakukan deduplikasi sebagai safety net
- Hanya customer pertama per phone yang ditampilkan

## 📋 File yang Diperbaiki

1. ✅ `app/backend/app/Http/Controllers/Api/CustomerController.php`

   - Method `store()` - Validasi unique phone per outlet

2. ✅ `app/backend/app/Http/Controllers/Api/SalesController.php`

   - Method `createCustomer()` - Validasi unique phone per outlet
   - Method `getCustomers()` - Deduplikasi customer berdasarkan phone

3. ✅ `app/frontend/src/hooks/useSales.js`

   - Function `fetchCustomers()` - Deduplikasi di frontend

4. ✅ `app/backend/fix_duplicate_customers.php` (NEW)
   - Script untuk cleanup data duplikat yang sudah ada

## 🎯 Logika Unik Per Outlet

**Konsep:**

- Customer dibuat di level **business**, bukan per outlet
- Validasi unik dilakukan berdasarkan **orders** yang pernah dibuat di outlet tertentu
- Jika customer dengan phone X sudah pernah order di Outlet A, maka tidak bisa dibuat customer baru dengan phone X untuk Outlet A
- Customer dengan phone X bisa dibuat untuk Outlet B (karena belum ada order di Outlet B)

**Contoh:**

```
Business: Restoran Bintang Lima
├── Outlet 1 (Main Outlet)
│   ├── Customer A: Phone 085652373501 (sudah order di Outlet 1) ✅
│   └── Customer B: Phone 085652373501 ❌ TIDAK BISA (sudah ada yang order)
│
└── Outlet 2 (Cabang)
    ├── Customer A: Phone 085652373501 (belum pernah order di Outlet 2)
    └── Customer C: Phone 085652373501 ✅ BISA (belum ada yang order di Outlet 2)
```

## ⚠️ Catatan

1. **Data Duplikat yang Sudah Ada:**

   - Perlu di-cleanup dengan script `fix_duplicate_customers.php`
   - Script akan merge order dan hapus customer duplikat

2. **Validasi Berbasis Orders:**

   - Customer baru yang belum pernah order bisa dibuat dengan phone yang sama
   - Setelah customer pertama order di outlet, customer lain dengan phone sama tidak bisa dibuat untuk outlet tersebut

3. **Normalisasi Phone:**
   - Phone dinormalisasi (spasi dan dash dihapus) untuk perbandingan
   - "0856-523-73501" dan "085652373501" dianggap sama

## ✅ Status

- ✅ Validasi create customer sudah diperbaiki
- ✅ Query get customers sudah ada deduplikasi
- ✅ Frontend sudah ada deduplikasi
- ✅ Script cleanup sudah dibuat
- ⚠️ **Perlu dijalankan:** `php fix_duplicate_customers.php` untuk membersihkan data duplikat yang sudah ada

