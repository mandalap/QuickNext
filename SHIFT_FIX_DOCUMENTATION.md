# Dokumentasi Perbaikan Shift Kasir

## 🔍 Masalah yang Ditemukan

### 1. **shift_id Tidak Terisi di Tabel Orders**
- **Root Cause**: Kolom `shift_id` tidak ada di array `$fillable` pada Model Order
- **Impact**: Saat POSController mencoba mengisi shift_id, Laravel memblokir karena mass assignment protection
- **Evidence**: 221 paid orders tidak memiliki shift_id

### 2. **Data Shift Tidak Realtime**
- **Root Cause**: Order tidak ter-link ke shift karena masalah #1
- **Impact**:
  - Total transaksi di shift = 0 (padahal ada transaksi)
  - Expected total = 0 (padanya ada revenue)
  - Cash difference tidak akurat
  - Laporan tutup kasir kosong

### 3. **Riwayat Shift Tidak Sesuai**
- **Root Cause**: Shift tidak terhubung dengan orders yang seharusnya
- **Impact**: Laporan shift tidak menampilkan transaksi yang sebenarnya terjadi

## ✅ Perbaikan yang Sudah Dilakukan

### 1. **Update Order Model** (`app/Models/Order.php`)

```php
// BEFORE
protected $fillable = [
    'order_number', 'business_id', 'outlet_id', 'customer_id',
    'table_id', 'employee_id', 'type', 'status', 'subtotal',
    ...
];

// AFTER
protected $fillable = [
    'order_number', 'business_id', 'outlet_id', 'customer_id',
    'table_id', 'employee_id', 'shift_id', 'type', 'status', 'subtotal',
    ...
];

// TAMBAHAN: Relationship
public function shift()
{
    return $this->belongsTo(CashierShift::class, 'shift_id');
}
```

### 2. **POSController Sudah Benar**
Controller sudah mengimplementasikan dengan benar:
- ✅ Mengambil shift_id dari active shift (line 73)
- ✅ Mengisi shift_id saat create order (line 141)
- ✅ Update shift statistics saat payment completed (line 287-289)

### 3. **CashierShift Model Sudah Benar**
- ✅ Method `calculateExpectedTotals()` sudah ada (line 136-179)
- ✅ Method `closeShift()` sudah ada (line 189-213)
- ✅ Relationships sudah lengkap

## 📊 Status Setelah Perbaikan

```
✅ shift_id sudah ada di fillable array
✅ POSController mengisi shift_id saat create order
✅ Shift statistics update saat order completed
✅ Calculate expected totals berfungsi dengan benar

📈 Coverage: 30.06% orders have shift_id
   - 95 orders dengan shift_id (orders baru)
   - 221 orders tanpa shift_id (orders lama sebelum sistem shift)
```

## 🧪 Cara Testing

### 1. Test Buka Shift

**Endpoint**: `POST /api/v1/shifts/open`

**Headers**:
```json
{
  "Authorization": "Bearer {token}",
  "X-Business-Id": "1",
  "X-Outlet-Id": "1"
}
```

**Body**:
```json
{
  "opening_balance": 100000,
  "shift_name": "Shift Pagi Test",
  "opening_notes": "Testing shift flow"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Shift berhasil dibuka",
  "data": {
    "id": 55,
    "shift_name": "Shift Pagi Test",
    "opened_at": "2025-10-22T...",
    "status": "open",
    ...
  }
}
```

### 2. Test Buat Transaksi

**Endpoint**: `POST /api/v1/orders`

**Headers**: (sama seperti di atas)

**Body**:
```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 50000
    }
  ],
  "discount": 0,
  "tax": 0,
  "notes": "Test order dengan shift"
}
```

**Expected**: Order created dengan shift_id terisi

### 3. Test Process Payment

**Endpoint**: `POST /api/v1/orders/{orderId}/payment`

**Body**:
```json
{
  "amount": 100000,
  "method": "cash"
}
```

**Expected**:
- Order status = "completed"
- Payment status = "paid"
- Shift statistics ter-update otomatis

### 4. Verifikasi Data Shift Realtime

**Endpoint**: `GET /api/v1/shifts/active`

**Expected Response**:
```json
{
  "success": true,
  "has_active_shift": true,
  "data": {
    "id": 55,
    "total_transactions": 1,        // ✅ Harus terisi
    "expected_total": 100000,        // ✅ Harus terisi
    "expected_cash": 100000,         // ✅ Harus terisi
    "cash_transactions": 1,          // ✅ Harus terisi
    ...
  }
}
```

### 5. Test Tutup Shift

**Endpoint**: `POST /api/v1/shifts/{shiftId}/close`

**Body**:
```json
{
  "actual_cash": 200000,
  "closing_notes": "Shift ditutup dengan baik"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Shift berhasil ditutup",
  "data": {
    "id": 55,
    "status": "closed",
    "closed_at": "2025-10-22T...",
    "total_transactions": 1,
    "expected_cash": 100000,
    "actual_cash": 200000,
    "cash_difference": 100000,      // ✅ Selisih harus benar
    ...
  }
}
```

### 6. Test Riwayat Shift

**Endpoint**: `GET /api/v1/shifts/history`

**Query Params** (optional):
- `start_date`: 2025-10-22
- `end_date`: 2025-10-22
- `status`: closed
- `per_page`: 20

**Expected**: List of shifts dengan data lengkap

## 🔧 Troubleshooting

### Jika shift_id masih NULL pada order baru:

1. **Clear cache Laravel**:
   ```bash
   cd app/backend
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   ```

2. **Restart server** (jika menggunakan PHP built-in server)

3. **Verify Model**:
   ```php
   php -r "require 'app/backend/vendor/autoload.php';
   \$app = require 'app/backend/bootstrap/app.php';
   \$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
   \$order = new App\Models\Order();
   var_dump(in_array('shift_id', \$order->getFillable()));"
   ```

   Expected output: `bool(true)`

### Jika data shift tidak update realtime:

1. **Trigger manual recalculate**:
   ```
   POST /api/v1/shifts/{shiftId}/recalculate
   ```

2. **Check logs**:
   ```bash
   tail -f app/backend/storage/logs/laravel.log
   ```

3. **Verify orders linked**:
   ```php
   // Run check script
   php test_shift_flow.php
   ```

## 📝 Notes Penting

1. **Orders Lama (221 orders)**:
   - Dibuat sebelum sistem shift ada
   - Tidak memiliki shift_id (ini normal)
   - Tidak akan mempengaruhi transaksi baru
   - Jika ingin assign shift ke orders lama, gunakan script: `fix_orders_shift_id.php`

2. **Employee ID vs User ID**:
   - Shift bisa memiliki `employee_id = NULL` untuk owner/admin
   - Matching dilakukan berdasarkan `user_id` dan `outlet_id`
   - Orders harus memiliki `employee_id` untuk kasir yang benar di receipt

3. **Role-based Shift Requirement**:
   - **Kasir/Waiter**: WAJIB buka shift sebelum transaksi
   - **Owner/Admin**: Opsional, bisa transaksi tanpa shift

4. **Calculation Flow**:
   ```
   Create Order → shift_id assigned
   ↓
   Process Payment → order.status = completed
   ↓
   Auto trigger → shift.calculateExpectedTotals()
   ↓
   Shift data updated realtime
   ```

## ✅ Checklist Setelah Deploy

- [ ] Test buka shift
- [ ] Test create order (verifikasi shift_id terisi)
- [ ] Test process payment (verifikasi shift stats update)
- [ ] Test get active shift (verifikasi data realtime)
- [ ] Test tutup shift (verifikasi calculation benar)
- [ ] Test riwayat shift (verifikasi data historical)
- [ ] Verify logs tidak ada error
- [ ] Test dengan berbagai payment methods (cash, card, transfer, qris)
- [ ] Test dengan multiple cashiers di outlet yang sama

## 📞 Support

Jika masih ada masalah:
1. Check file logs: `app/backend/storage/logs/laravel.log`
2. Run test script: `php test_shift_flow.php`
3. Check database directly untuk verifikasi data
