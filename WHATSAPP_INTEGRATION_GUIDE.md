# 📱 Panduan Integrasi WhatsApp API untuk quickKasir

## 📋 Overview

Sistem quickKasir mendukung pengiriman notifikasi WhatsApp otomatis ke pelanggan setelah pembayaran berhasil. Fitur ini menggunakan layanan pihak ketiga untuk mengirim pesan WhatsApp.

---

## ❓ Apakah Bisa Membuat QRCode untuk API WA Sendiri?

### **Jawaban Singkat: TIDAK, Harus Menggunakan Pihak Ketiga**

**Alasan:**
1. **WhatsApp Business API Resmi** memerlukan:
   - Approval dari Meta/Facebook
   - Verifikasi bisnis
   - Biaya bulanan yang mahal
   - Setup kompleks dengan server sendiri
   - Tidak bisa langsung pakai QR code seperti WhatsApp Web

2. **WhatsApp Web/Desktop API** (Unofficial):
   - Melanggar Terms of Service WhatsApp
   - Risiko akun di-ban
   - Tidak stabil dan tidak direkomendasikan

3. **Solusi Terbaik: Gunakan Layanan Pihak Ketiga**
   - ✅ Legal dan aman
   - ✅ Setup mudah
   - ✅ Harga terjangkau
   - ✅ Support terpercaya

---

## 🎯 Rekomendasi Layanan WhatsApp API Indonesia

### **1. Fonnte** ⭐ (RECOMMENDED)

**Website:** https://fonnte.com

**Keuntungan:**
- ✅ Harga terjangkau (mulai Rp 25.000/bulan)
- ✅ Setup mudah dengan API key
- ✅ Support baik
- ✅ Dokumentasi lengkap
- ✅ Bisa pakai nomor WhatsApp sendiri

**Harga:**
- Starter: Rp 25.000/bulan (500 pesan)
- Pro: Rp 75.000/bulan (2.000 pesan)
- Business: Rp 200.000/bulan (10.000 pesan)

**Setup:**
1. Daftar di https://fonnte.com
2. Dapatkan API key
3. Scan QR code dengan WhatsApp Business
4. Siap digunakan

---

### **2. Wablas**

**Website:** https://wablas.com

**Keuntungan:**
- ✅ Harga kompetitif
- ✅ Fitur lengkap (template, media, dll)
- ✅ API documentation baik

**Harga:**
- Mulai dari Rp 50.000/bulan

---

### **3. KirimWA**

**Website:** https://kirimwa.id

**Keuntungan:**
- ✅ Harga murah
- ✅ Simple API
- ✅ Pay as you go

**Harga:**
- Mulai dari Rp 0,5/pesan

---

## 🚀 Setup WhatsApp di quickKasir

### **1. Install & Konfigurasi**

File konfigurasi sudah dibuat di `app/backend/config/whatsapp.php`

### **2. Environment Variables**

Tambahkan ke file `.env`:

```env
# WhatsApp Configuration
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=fonnte
WHATSAPP_API_KEY=your_api_key_here
WHATSAPP_API_URL=https://api.fonnte.com/send
WHATSAPP_AUTO_SEND_RECEIPT=true
```

**Untuk Fonnte:**
```env
WHATSAPP_PROVIDER=fonnte
WHATSAPP_API_KEY=YOUR_FONNTE_API_KEY
WHATSAPP_API_URL=https://api.fonnte.com/send
```

**Untuk Wablas:**
```env
WHATSAPP_PROVIDER=wablas
WHATSAPP_API_KEY=YOUR_WABLAS_API_KEY
WHATSAPP_API_URL=https://api.wablas.com/api/send-message
```

**Untuk KirimWA:**
```env
WHATSAPP_PROVIDER=kirimwa
WHATSAPP_API_KEY=YOUR_KIRIMWA_API_KEY
WHATSAPP_API_URL=https://api.kirimwa.id/v1/messages
```

### **3. Clear Config Cache**

```bash
cd app/backend
php artisan config:cache
```

---

## 📝 Cara Mendapatkan API Key

### **Fonnte (Contoh)**

1. **Daftar Akun:**
   - Kunjungi https://fonnte.com
   - Klik "Daftar" atau "Register"
   - Isi data lengkap

2. **Buat Device:**
   - Login ke dashboard
   - Klik "Device" → "Tambah Device"
   - Pilih "WhatsApp Business"

3. **Scan QR Code:**
   - Buka WhatsApp Business di HP
   - Scan QR code yang muncul
   - Tunggu sampai terhubung

4. **Dapatkan API Key:**
   - Setelah terhubung, copy API key
   - Paste ke file `.env`

5. **Test API:**
   ```bash
   curl -X POST https://api.fonnte.com/send \
     -H "Authorization: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "target": "6281234567890",
       "message": "Test message"
     }'
   ```

---

## 🔧 Cara Kerja di quickKasir

### **Flow Pengiriman Pesan:**

```
1. Customer melakukan pembayaran
   ↓
2. Payment status diupdate menjadi 'paid'
   ↓
3. Sistem otomatis trigger WhatsAppService
   ↓
4. Ambil nomor HP dari Customer
   ↓
5. Generate receipt message
   ↓
6. Kirim via API pihak ketiga
   ↓
7. Customer menerima struk di WhatsApp
```

### **Kode yang Sudah Terintegrasi:**

**File:** `app/backend/app/Http/Controllers/Api/POSController.php`

```php
// Setelah payment success
if ($totalPaid >= $order->total && config('whatsapp.auto_send_payment_receipt', true)) {
    try {
        $order->load(['orderItems.product', 'customer', 'business', 'outlet', 'payments']);
        $whatsappService = new \App\Services\WhatsAppService();
        $whatsappService->sendPaymentReceipt($order);
    } catch (\Exception $e) {
        // Log error, tapi jangan gagalkan payment
    }
}
```

---

## 📱 Format Pesan yang Dikirim

Pesan struk yang dikirim otomatis berisi:

```
╔═══════════════════════════╗
║   TERIMA KASIH            ║
╚═══════════════════════════╝

📋 STRUK PEMBAYARAN

🏢 Nama Bisnis
📍 Nama Outlet
   Alamat Outlet
📞 Nomor Telepon

━━━━━━━━━━━━━━━━━━━━━━━━

🆔 No. Order: ORD-12345
📅 Tanggal: 25/01/2025 14:30
👤 Pelanggan: Nama Customer

━━━━━━━━━━━━━━━━━━━━━━━━

📦 DETAIL PESANAN:

• Nama Produk
  2 x Rp 50.000
  = Rp 100.000

━━━━━━━━━━━━━━━━━━━━━━━━

💰 RINGKASAN PEMBAYARAN:

Subtotal    : Rp 100.000
Diskon      : -Rp 10.000
━━━━━━━━━━━━━━━━━━━━━━━━
💵 TOTAL : Rp 90.000
💳 Dibayar : Rp 100.000
🔄 Kembalian: Rp 10.000

━━━━━━━━━━━━━━━━━━━━━━━━

💳 Metode: Tunai: Rp 100.000

━━━━━━━━━━━━━━━━━━━━━━━━

✨ Terima kasih atas kunjungan Anda!
💬 Ada pertanyaan? Hubungi kami di nomor ini.

Pesan ini dikirim otomatis oleh sistem quickKasir
```

---

## ⚙️ Konfigurasi Lanjutan

### **Disable Auto Send (Manual Send)**

```env
WHATSAPP_AUTO_SEND_RECEIPT=false
```

Lalu kirim manual via API:

```php
use App\Services\WhatsAppService;

$whatsappService = new WhatsAppService();
$whatsappService->sendPaymentReceipt($order);
```

### **Custom Message Template**

Edit method `generateReceiptMessage()` di `app/backend/app/Services/WhatsAppService.php`

---

## 🧪 Testing

### **Test Manual via Tinker:**

```bash
cd app/backend
php artisan tinker

# Test send message
$service = new \App\Services\WhatsAppService();
$result = $service->sendMessage('6281234567890', 'Test message dari quickKasir');
dd($result);

# Test send receipt
$order = \App\Models\Order::with(['orderItems.product', 'customer', 'business', 'outlet', 'payments'])->first();
$result = $service->sendPaymentReceipt($order);
dd($result);
```

### **Test via API Endpoint:**

Buat endpoint test (opsional):

```php
// routes/api.php
Route::post('/test/whatsapp', function(Request $request) {
    $service = new \App\Services\WhatsAppService();
    $result = $service->sendMessage(
        $request->phone,
        $request->message ?? 'Test message dari quickKasir'
    );
    return response()->json($result);
})->middleware('auth:sanctum');
```

---

## 📊 Monitoring & Logs

Log WhatsApp tersimpan di:
- `storage/logs/laravel.log`

Cek log:
```bash
tail -f storage/logs/laravel.log | grep WhatsApp
```

---

## 🔒 Security & Best Practices

1. **Jangan commit API key ke Git**
   - Gunakan `.env` file
   - Tambah `.env` ke `.gitignore`

2. **Rate Limiting**
   - Jangan spam pesan
   - Respect API limits dari provider

3. **Error Handling**
   - WhatsApp failure tidak boleh gagalkan payment
   - Log semua error untuk debugging

4. **Phone Number Validation**
   - Validasi format nomor HP
   - Pastikan nomor valid sebelum kirim

---

## 💰 Estimasi Biaya

**Contoh untuk 1000 transaksi/bulan:**

- **Fonnte Pro:** Rp 75.000/bulan (2.000 pesan)
- **Wablas:** ~Rp 50.000/bulan
- **KirimWA:** Rp 500 (pay as you go)

**Rekomendasi:** Mulai dengan paket kecil, upgrade jika perlu.

---

## 🆘 Troubleshooting

### **Pesan tidak terkirim:**

1. **Cek API Key:**
   ```bash
   php artisan tinker
   config('whatsapp.api_key')
   ```

2. **Cek Logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

3. **Test API langsung:**
   ```bash
   curl -X POST https://api.fonnte.com/send \
     -H "Authorization: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"target":"6281234567890","message":"Test"}'
   ```

4. **Cek Nomor HP:**
   - Pastikan format benar (6281234567890)
   - Pastikan nomor aktif

### **Error: "WhatsApp service is disabled"**

Set `WHATSAPP_ENABLED=true` di `.env` dan clear cache:
```bash
php artisan config:cache
```

---

## 📚 Dokumentasi Provider

- **Fonnte:** https://documentation.fonnte.com
- **Wablas:** https://documentation.wablas.com
- **KirimWA:** https://docs.kirimwa.id

---

## ✅ Checklist Setup

- [ ] Daftar akun di provider (Fonnte/Wablas/KirimWA)
- [ ] Dapatkan API key
- [ ] Scan QR code dengan WhatsApp Business
- [ ] Tambahkan env variables ke `.env`
- [ ] Clear config cache
- [ ] Test kirim pesan manual
- [ ] Test payment flow
- [ ] Monitor logs untuk error

---

## 🎯 Kesimpulan

**Untuk WhatsApp API:**
- ❌ **TIDAK BISA** membuat QR code sendiri (harus pakai pihak ketiga)
- ✅ **HARUS** menggunakan layanan pihak ketiga (Fonnte/Wablas/KirimWA)
- ✅ **SUDAH TERINTEGRASI** di quickKasir
- ✅ **MUDAH SETUP** dengan API key saja

**Langkah Selanjutnya:**
1. Pilih provider (rekomendasi: Fonnte)
2. Daftar dan dapatkan API key
3. Setup di `.env`
4. Test dan deploy!

---

**Pertanyaan?** Hubungi tim development atau cek dokumentasi provider.

