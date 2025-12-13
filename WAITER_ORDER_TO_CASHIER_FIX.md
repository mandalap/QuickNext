# Perbaikan: Order Waiter Masuk ke Transaksi Kasir

## 🔍 Masalah

Order yang dibuat oleh **waiter** tidak masuk ke dalam transaksi di dashboard kasir karena:

1. **Order waiter tidak memiliki `shift_id`** - Waiter tidak perlu buka shift, jadi order dibuat tanpa `shift_id`
2. **Order waiter status `pending`** - Belum dibayar, jadi tidak muncul di transaksi yang sudah selesai
3. **Query transaksi filter berdasarkan `shift_id`** - Order tanpa `shift_id` tidak terhitung dalam shift kasir

## ✅ Solusi yang Sudah Diimplementasikan

### 1. Auto-Assign Shift ID saat Payment Diproses

File: `app/backend/app/Http/Controllers/Api/POSController.php`

Ketika kasir memproses payment untuk order waiter yang pending, sistem akan:

1. **Cek apakah order punya `shift_id`**
2. **Jika belum ada**, cari shift aktif kasir yang sedang login
3. **Assign `shift_id` ke order** sebelum memproses payment
4. **Simpan order** dengan `shift_id` yang baru

```php
// ✅ FIX: Jika order belum punya shift_id (dari waiter), assign ke shift kasir aktif
if (!$order->shift_id) {
    // Cari shift aktif untuk kasir
    // Assign shift_id ke order
    $order->shift_id = $shiftId;
    $order->save(); // Simpan sebelum processing payment
}
```

### 2. Logika Pencarian Shift Aktif

Sistem akan mencari shift aktif dengan prioritas:

1. **Untuk kasir**: Cari shift aktif berdasarkan `user_id` kasir dan `outlet_id`
2. **Untuk owner/admin**: 
   - Coba cari shift aktif berdasarkan `employee_id`
   - Jika tidak ketemu, cari shift aktif apa saja di outlet yang sama

## 🔄 Alur Setelah Perbaikan

### Alur Order dari Waiter

```
1. Waiter membuat order
   ↓
   Order: status='pending', payment_status='pending', shift_id=null

2. Kasir memproses payment
   ↓
   Sistem cek: order.shift_id == null?
   ↓
   ✅ Cari shift aktif kasir
   ↓
   ✅ Assign shift_id ke order
   ↓
   ✅ Simpan order dengan shift_id
   ↓
   ✅ Proses payment
   ↓
   ✅ Update payment_status = 'paid'
   ↓
   ✅ Update status = 'completed'
   ↓
   ✅ Update shift statistics
```

### Hasil Akhir

Setelah payment diproses:
- ✅ Order memiliki `shift_id` dari shift kasir aktif
- ✅ Order masuk ke transaksi shift kasir
- ✅ Shift statistics ter-update dengan order waiter
- ✅ Order muncul di dashboard kasir sebagai transaksi selesai

## 📊 Cara Verifikasi

### 1. Cek Order Waiter

```sql
SELECT id, order_number, status, payment_status, shift_id, employee_id, created_at 
FROM orders 
WHERE status = 'pending' 
  AND payment_status = 'pending' 
  AND shift_id IS NULL;
```

### 2. Setelah Payment Diproses

```sql
SELECT id, order_number, status, payment_status, shift_id, employee_id 
FROM orders 
WHERE order_number = 'ORD-XXXXX';
```

Pastikan `shift_id` sudah terisi setelah payment.

### 3. Cek Shift Statistics

```sql
SELECT 
    cs.id,
    cs.shift_name,
    cs.total_transactions,
    cs.expected_total,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_orders
FROM cashier_shifts cs
LEFT JOIN orders o ON o.shift_id = cs.id AND o.status = 'completed'
WHERE cs.status = 'open'
GROUP BY cs.id;
```

## ⚠️ Catatan Penting

1. **Order harus dibayar oleh kasir** - Order waiter tidak akan otomatis masuk ke transaksi sampai dibayar
2. **Kasir harus punya shift aktif** - Jika kasir tidak punya shift aktif, order tidak bisa di-assign ke shift
3. **Logging** - Semua proses assign shift_id di-log untuk troubleshooting

## 🎯 Kesimpulan

Dengan perbaikan ini:
- ✅ Order dari waiter akan **otomatis ter-link ke shift kasir** saat dibayar
- ✅ Order waiter akan **masuk ke transaksi shift kasir**
- ✅ **Shift statistics** akan ter-update dengan order waiter
- ✅ **Dashboard kasir** akan menampilkan order waiter setelah dibayar

**Pola urutan order melalui waiter sekarang sudah terintegrasi dengan transaksi kasir!** ✅


