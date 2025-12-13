# 🔧 Troubleshooting Monitoring Kasir - Data Tidak Tampil

## 🚨 **Masalah: Dashboard Owner Tidak Menampilkan Data Kasir Aktif**

### **Gejala:**

- Halaman monitoring kasir menunjukkan "Tidak Ada Kasir Aktif"
- Semua statistik menunjukkan 0 (Kasir Aktif: 0, Total Transaksi: 0, Total Penjualan: Rp 0)
- Padahal kasir sudah melakukan transaksi dan terlihat di dashboard kasir

---

## 🔍 **Langkah Debugging:**

### **1. Check Browser Network Tab**

1. Buka halaman monitoring kasir sebagai owner/admin
2. Tekan F12 untuk buka Developer Tools
3. Go to **Network** tab
4. Refresh halaman
5. Cari request ke `/api/v1/shifts/active-all`
6. Klik request tersebut dan lihat:
   - **Request Headers**: Pastikan ada `X-Business-Id` dan `Authorization`
   - **Response**: Lihat data yang dikembalikan

### **2. Check Laravel Logs**

```bash
# Di terminal backend
tail -f storage/logs/laravel.log
```

Kemudian akses halaman monitoring dan lihat log yang muncul.

### **3. Test Database Langsung**

```bash
# Di terminal backend
php artisan tinker
```

Kemudian jalankan query berikut:

```php
// Check active shifts
$activeShifts = \App\Models\CashierShift::with(['employee.user', 'outlet'])->where('status', 'open')->get();
echo 'Active shifts count: ' . $activeShifts->count() . "\n";

// Check today's orders
$today = \Carbon\Carbon::today();
$todayOrders = \App\Models\Order::whereDate('created_at', $today)->where('status', 'completed')->get();
echo 'Today orders count: ' . $todayOrders->count() . "\n";

// Check employees
$employees = \App\Models\Employee::with('user')->get();
echo 'Employees count: ' . $employees->count() . "\n";
```

### **4. Test API Endpoint**

Gunakan script `test_api_endpoint.php` yang sudah dibuat:

```bash
php test_api_endpoint.php
```

---

## 🐛 **Kemungkinan Penyebab:**

### **1. Tidak Ada Shift Aktif**

- **Penyebab**: Kasir belum membuka shift atau shift sudah ditutup
- **Solusi**: Pastikan kasir membuka shift terlebih dahulu

### **2. Business ID Tidak Sesuai**

- **Penyebab**: Header `X-Business-Id` tidak dikirim atau salah
- **Solusi**: Check apakah business_id di header sesuai dengan database

### **3. User Role Bukan Owner/Admin**

- **Penyebab**: User yang login bukan owner/admin
- **Solusi**: Login dengan akun owner atau admin

### **4. Employee Relationship Tidak Ada**

- **Penyebab**: CashierShift tidak memiliki employee_id atau employee tidak memiliki user
- **Solusi**: Check relationship di database

### **5. Order Tidak Memiliki Employee ID**

- **Penyebab**: Order dibuat tanpa employee_id
- **Solusi**: Pastikan order dibuat dengan employee_id yang benar

### **6. Date/Timezone Issue**

- **Penyebab**: Perbedaan timezone antara frontend dan backend
- **Solusi**: Check timezone configuration

### **7. Order Status Bukan 'completed'**

- **Penyebab**: Order masih dalam status 'pending' atau 'processing'
- **Solusi**: Pastikan order sudah completed

---

## 🔧 **Solusi Step-by-Step:**

### **Step 1: Verify Shift Status**

```php
// Di php artisan tinker
$shifts = \App\Models\CashierShift::where('status', 'open')->get();
foreach($shifts as $shift) {
    echo "Shift ID: {$shift->id}, Business: {$shift->business_id}, Employee: {$shift->employee_id}\n";
}
```

### **Step 2: Verify Employee Data**

```php
// Di php artisan tinker
$employees = \App\Models\Employee::with('user')->get();
foreach($employees as $employee) {
    echo "Employee ID: {$employee->id}, Name: {$employee->name}, User: " . ($employee->user ? $employee->user->name : 'No user') . "\n";
}
```

### **Step 3: Verify Today's Orders**

```php
// Di php artisan tinker
$today = \Carbon\Carbon::today();
$orders = \App\Models\Order::whereDate('created_at', $today)->where('status', 'completed')->get();
foreach($orders as $order) {
    echo "Order ID: {$order->id}, Employee: {$order->employee_id}, Total: {$order->total}\n";
}
```

### **Step 4: Check API Response**

1. Buka browser dev tools
2. Go to Network tab
3. Akses halaman monitoring
4. Lihat response dari `/api/v1/shifts/active-all`
5. Check apakah ada error atau data kosong

### **Step 5: Check Laravel Logs**

```bash
# Di terminal backend
tail -f storage/logs/laravel.log
```

Akses halaman monitoring dan lihat log yang muncul.

---

## 🚀 **Quick Fixes:**

### **Fix 1: Pastikan Shift Aktif**

1. Login sebagai kasir
2. Buka shift terlebih dahulu
3. Lakukan transaksi
4. Login sebagai owner/admin
5. Check halaman monitoring

### **Fix 2: Check Business ID**

1. Buka browser dev tools
2. Check request headers
3. Pastikan `X-Business-Id` sesuai dengan database

### **Fix 3: Check User Role**

1. Pastikan login dengan akun owner/admin
2. Check user role di database

### **Fix 4: Check Database Relationships**

1. Pastikan CashierShift memiliki employee_id
2. Pastikan Employee memiliki user_id
3. Pastikan Order memiliki employee_id

---

## 📋 **Checklist Debugging:**

- [ ] Shift status = 'open'
- [ ] Business ID header dikirim
- [ ] User role = owner/admin
- [ ] Employee relationship ada
- [ ] Order memiliki employee_id
- [ ] Order status = 'completed'
- [ ] Date calculation benar
- [ ] API response tidak error
- [ ] Laravel logs tidak ada error

---

## 🆘 **Jika Masih Bermasalah:**

1. **Check Laravel Logs**: `storage/logs/laravel.log`
2. **Check Browser Console**: F12 > Console tab
3. **Check Network Tab**: F12 > Network tab
4. **Test Database**: `php artisan tinker`
5. **Test API**: Gunakan Postman atau curl

### **Contact Support:**

Jika masalah masih berlanjut, berikan informasi berikut:

- Screenshot error di browser
- Laravel log error
- Database query results
- API response

---

**Dibuat oleh**: AI Assistant  
**Tanggal**: 18 Oktober 2025  
**Versi**: 1.0.0
