# 📱 Panduan Custom Message WhatsApp untuk Transaksi

## ✅ Format API yang Sudah Didukung

### **1. Wablitz** (Format sesuai contoh Anda)

**Format JSON:**

```json
{
  "api_key": "eDRx58M1e0DdcqAO0fgYtV9YAbhHxT",
  "sender": "6281910570634",
  "number": "6281234567890",
  "message": "Pesan Anda di sini"
}
```

**Sudah di-support!** ✅

---

## 🎯 Custom Message untuk Transaksi

### **Cara 1: Custom Message via API**

**Endpoint:** `POST /api/v1/whatsapp/orders/{order_id}/receipt`

**Request:**

```json
{
  "custom_message": "Hai *{{nama}}*! 👋\nTerima kasih telah berbelanja di *{{bisnis}}*\n\nTotal pembayaran: Rp {{total}}\n\nTerima kasih!"
}
```

**Contoh dengan variabel:**

```php
$customMessage = "Hai *{$customer->name}*! 👋\n";
$customMessage .= "Terima kasih telah berbelanja di *{$business->name}*\n\n";
$customMessage .= "Total pembayaran: Rp " . number_format($order->total, 0, ',', '.') . "\n\n";
$customMessage .= "Terima kasih!";
```

---

### **Cara 2: Custom Template di Backend**

Edit method `generateReceiptMessage()` di `app/backend/app/Services/WhatsAppService.php`:

```php
protected function generateReceiptMessage($order)
{
    // Custom template sesuai kebutuhan
    $business = $order->business ?? null;
    $customer = $order->customer ?? null;

    $message = "Hai *{$customer->name}*! 👋\n";
    $message .= "Terima kasih telah berbelanja di *{$business->name}*\n\n";
    $message .= "Total: Rp " . number_format($order->total, 0, ',', '.') . "\n";
    $message .= "Terima kasih!";

    return $message;
}
```

---

## 🔧 Menggunakan Custom Message

### **Via API (Recommended)**

```javascript
// Frontend
const response = await apiClient.post(
  `/api/v1/whatsapp/orders/${orderId}/receipt`,
  {
    custom_message: `Hai *${customerName}*! 👋
Terima kasih telah berbelanja di *${businessName}*

Total: Rp ${total}
Terima kasih!`,
  }
);
```

### **Via Backend (Auto Send)**

Pesan otomatis terkirim setelah payment success dengan template default. Untuk custom, edit method `generateReceiptMessage()`.

---

## 📝 Variabel yang Tersedia

Saat generate message, Anda bisa akses:

- `$order->order_number` - Nomor order
- `$order->total` - Total pembayaran
- `$order->subtotal` - Subtotal
- `$order->discount_amount` - Diskon
- `$order->tax_amount` - Pajak
- `$order->paid_amount` - Jumlah dibayar
- `$order->change_amount` - Kembalian
- `$order->created_at` - Tanggal transaksi
- `$customer->name` - Nama customer
- `$customer->phone` - Nomor HP customer
- `$business->name` - Nama bisnis
- `$outlet->name` - Nama outlet
- `$outlet->address` - Alamat outlet
- `$outlet->phone` - Nomor telepon outlet
- `$order->orderItems` - Daftar item pesanan

---

## 🎨 Contoh Custom Message

### **Contoh 1: Simple Thank You**

```php
$message = "Terima kasih *{$customer->name}*!\n";
$message .= "Pembayaran Anda sebesar Rp " . number_format($order->total, 0, ',', '.') . " telah kami terima.\n\n";
$message .= "Terima kasih telah berbelanja di {$business->name}!";
```

### **Contoh 2: Dengan Detail Produk**

```php
$message = "Hai *{$customer->name}*! 👋\n\n";
$message .= "Terima kasih telah berbelanja di *{$business->name}*\n\n";
$message .= "📦 *Pesanan Anda:*\n";
foreach ($order->orderItems as $item) {
    $message .= "• {$item->product->name} x{$item->quantity}\n";
}
$message .= "\n💵 Total: Rp " . number_format($order->total, 0, ',', '.') . "\n\n";
$message .= "Terima kasih!";
```

### **Contoh 3: Dengan Link Pembayaran (jika belum bayar)**

```php
$message = "Hai *{$customer->name}*! 👋\n";
$message .= "Terima kasih telah memesan di *{$business->name}*\n\n";
$message .= "💳 *Total Pembayaran:* Rp " . number_format($order->total, 0, ',', '.') . "\n\n";
$message .= "🔗 Link pembayaran: {$paymentLink}\n\n";
$message .= "⚠️ *Pesanan akan dibatalkan jika belum dibayar dalam 24 jam.*";
```

---

## 🚀 Cara Menggunakan

### **1. Custom Message via API (Real-time)**

```bash
POST /api/v1/whatsapp/orders/{order_id}/receipt
Headers:
  Authorization: Bearer {token}
  X-Business-Id: {business_id}
  X-Outlet-Id: {outlet_id}

Body:
{
  "custom_message": "Pesan custom Anda di sini"
}
```

### **2. Edit Template Default**

Edit file: `app/backend/app/Services/WhatsAppService.php`

Method: `generateReceiptMessage()`

---

## ✅ Checklist

- [x] Support Wablitz dengan format api_key, sender, number, message
- [x] Support custom message via API
- [x] Support custom message via template
- [x] Auto send setelah payment success
- [x] Validasi nomor telepon untuk Wablitz

---

## 📞 Test Connection

**Endpoint:** `POST /api/v1/whatsapp/test`

```json
{
  "outlet_id": 1,
  "phone_number": "6281234567890"
}
```

Ini akan mengirim pesan test untuk verifikasi konfigurasi.

---

## 🎯 Kesimpulan

**Format Wablitz sudah didukung!** ✅

- Format JSON sesuai contoh Anda
- Bisa custom message untuk transaksi
- Auto send setelah payment success
- Support multiple providers

Sistem siap digunakan dengan format Wablitz!
