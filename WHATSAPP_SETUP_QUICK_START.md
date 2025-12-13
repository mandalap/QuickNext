# 🚀 Quick Start: Setup WhatsApp di quickKasir

## ⚡ Setup Cepat (5 Menit)

### **1. Pilih Provider**

Rekomendasi: **Fonnte** (paling mudah dan murah)

### **2. Daftar & Dapatkan API Key**

**Fonnte:**
1. Kunjungi https://fonnte.com
2. Daftar akun
3. Buat device baru
4. Scan QR code dengan WhatsApp Business
5. Copy API key

### **3. Setup di Backend**

**Edit file `.env` di `app/backend/`:**

```env
# WhatsApp Configuration
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=fonnte
WHATSAPP_API_KEY=YOUR_API_KEY_HERE
WHATSAPP_API_URL=https://api.fonnte.com/send
WHATSAPP_AUTO_SEND_RECEIPT=true
```

### **4. Clear Cache**

```bash
cd app/backend
php artisan config:cache
```

### **5. Test**

Lakukan transaksi pembayaran, struk akan otomatis terkirim ke WhatsApp customer!

---

## ✅ Checklist

- [ ] Daftar di Fonnte/Wablas/KirimWA
- [ ] Dapatkan API key
- [ ] Scan QR code dengan WhatsApp Business
- [ ] Update `.env` file
- [ ] Clear config cache
- [ ] Test transaksi

---

## 🧪 Test Manual

```bash
cd app/backend
php artisan tinker

# Test send message
$service = new \App\Services\WhatsAppService();
$result = $service->sendMessage('6281234567890', 'Test dari quickKasir');
dd($result);
```

---

## 📞 Support

- Dokumentasi lengkap: `WHATSAPP_INTEGRATION_GUIDE.md`
- Fonnte Docs: https://documentation.fonnte.com

