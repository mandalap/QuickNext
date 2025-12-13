# 🔧 Fix: Status Order Tidak Otomatis Berubah Setelah Pembayaran Midtrans Sukses

## ❌ Masalah

Setelah pembayaran Midtrans sukses, status order tidak otomatis berubah dari "Menunggu Pembayaran" menjadi "Sudah Dibayar". Perlu sync manual atau refresh halaman.

## 🔍 Root Cause

1. **Backend `checkPaymentStatus` endpoint**:
   - Hanya handle status `settlement`, tidak handle `capture`
   - Tidak refresh payment data setelah update
   - Response tidak include informasi apakah status sudah diupdate

2. **Frontend polling**:
   - Hanya handle `settlement` dan `success`, tidak handle `capture`
   - Tidak tahu apakah backend sudah update status atau belum

3. **Webhook**:
   - Mungkin tidak terpanggil karena localhost tidak bisa diakses dari internet
   - Atau webhook URL belum dikonfigurasi di Midtrans Dashboard

## ✅ Perbaikan yang Dilakukan

### 1. Backend - `checkPaymentStatus` Endpoint

**File:** `app/backend/app/Http/Controllers/Api/OrderPaymentController.php`

**Perubahan:**
- ✅ Handle status `capture` selain `settlement`
- ✅ Refresh payment dan order data setelah update
- ✅ Return `was_updated` flag untuk memberi tahu frontend bahwa status sudah diupdate
- ✅ Return order data dalam response untuk frontend bisa langsung update UI

### 2. Frontend - QRISPaymentModal

**File:** `app/frontend/src/components/modals/QRISPaymentModal.jsx`

**Perubahan:**
- ✅ Handle status `capture` dalam polling
- ✅ Cek `was_updated` flag dari backend
- ✅ Jika status sudah diupdate, tidak perlu sync lagi
- ✅ Jika status `settlement`/`capture` tapi belum diupdate, trigger sync via order sync endpoint

### 3. Webhook Handler

**File:** `app/backend/app/Http/Controllers/Api/OrderPaymentController.php`

**Perubahan:**
- ✅ Tambah logging untuk debugging payment status determination
- ✅ Handle format `ORD-{order_id}-{timestamp}` untuk payment dari POS/cashier

## 🧪 Cara Test

1. **Test Payment:**
   - Buka `http://localhost:3000/cashier/pos`
   - Buat order baru atau pilih order pending
   - Klik "Bayar" → Pilih "QRIS"
   - Selesaikan pembayaran di Midtrans

2. **Expected Behavior:**
   - Setelah payment success, frontend akan:
     - Check payment status via `checkPaymentStatus` endpoint
     - Backend akan update order status jika payment sudah `settlement` atau `capture`
     - Frontend akan tahu bahwa status sudah diupdate via `was_updated` flag
     - Modal akan close dan halaman akan reload
     - Order tidak akan muncul lagi di "Belum Dibayar"

3. **Jika Masih Belum Terupdate:**
   - Cek console browser untuk log
   - Cek Laravel log: `app/backend/storage/logs/laravel.log`
   - Gunakan tombol "Sync Payment" di halaman "Belum Dibayar"
   - Atau jalankan script sync: `php sync_order_payment.php <order_number>`

## 📋 Checklist

- [x] Backend handle status `capture` dan `settlement`
- [x] Backend refresh data setelah update
- [x] Backend return `was_updated` flag
- [x] Frontend handle status `capture`
- [x] Frontend cek `was_updated` flag
- [x] Frontend trigger sync jika perlu
- [x] Webhook handler handle format `ORD-{order_id}-{timestamp}`

## 🔍 Troubleshooting

### Masalah: Status masih tidak terupdate otomatis

**Solusi:**
1. Cek console browser untuk error
2. Cek Laravel log untuk error
3. Pastikan `checkPaymentStatus` endpoint dipanggil dengan benar
4. Pastikan payment punya `reference_number` yang valid
5. Gunakan tombol "Sync Payment" untuk sync manual

### Masalah: Webhook tidak terpanggil

**Solusi:**
1. Untuk localhost, webhook tidak bisa diakses dari internet
2. Gunakan ngrok untuk expose local server:
   ```bash
   ngrok http 8000
   ```
3. Update webhook URL di Midtrans Dashboard ke ngrok URL
4. Atau gunakan frontend polling (sudah diimplementasikan)

### Masalah: Payment status `pending` terus

**Solusi:**
1. Cek di Midtrans Dashboard apakah payment sudah benar-benar settled
2. Beberapa payment method (seperti Virtual Account) perlu waktu untuk settlement
3. Frontend akan terus polling setiap 3 detik sampai status berubah

## 📝 Catatan

- Frontend polling akan berjalan otomatis jika payment status `pending`
- Backend akan update order status otomatis saat `checkPaymentStatus` dipanggil dan payment sudah `settlement`/`capture`
- Webhook adalah cara terbaik untuk update real-time, tapi untuk localhost perlu ngrok
- Script sync manual tersedia di `app/backend/sync_order_payment.php`

---

**Last Updated:** $(date)

