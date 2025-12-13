# 🔄 Penjelasan: Fallback ke Global Config (.env)

## 📋 Pertanyaan

**"Di bagian env kenapa belum di-custom ya, masih menggunakan punya saya yang lama. Apakah itu tidak apa?"**

---

## ✅ Jawaban: **ITU NORMAL DAN AMAN**

### **1. Fallback Mechanism (By Design)**

Sistem dirancang dengan **fallback mechanism** yang aman:

```
Jika Business PUNYA config sendiri:
  ✅ Pakai config business (Server Key, Client Key, Environment dari business)
  
Jika Business TIDAK punya config:
  ✅ Fallback ke global config dari .env (config lama Anda)
```

### **2. Kenapa Ada Fallback?**

**Keuntungan Fallback:**
- ✅ **Onboarding mudah**: Business baru bisa langsung pakai tanpa setup config
- ✅ **Backward compatible**: Business yang sudah ada tetap jalan
- ✅ **Fleksibel**: Owner bisa setup config sendiri kapan saja
- ✅ **Tidak breaking**: Tidak ada business yang tiba-tiba error

### **3. Kapan Pakai Global Config?**

Business akan pakai global config dari `.env` jika:
- ❌ Belum setup Midtrans config di Business Management
- ❌ Server Key atau Client Key kosong
- ❌ Hanya isi salah satu (Server Key atau Client Key saja)

**Contoh:**
```
Business A:
- midtrans_config: null → Pakai Global Config ✅

Business B:
- midtrans_config: { server_key: "SB-...", client_key: "" } → Pakai Global Config ✅
  (karena client_key kosong)

Business C:
- midtrans_config: { server_key: "SB-...", client_key: "SB-..." } → Pakai Business Config ✅
```

---

## 🔒 Apakah Aman?

### **✅ AMAN untuk Multi-Business**

**Skenario 1: Business dengan Config Sendiri**
```
Business A setup config sendiri:
- Server Key: SB-Mid-server-AAAAA
- Client Key: SB-Mid-client-AAAAA
- Environment: Sandbox

→ Semua transaksi Business A pakai credentials AAAAA ✅
→ TIDAK pakai global config ✅
```

**Skenario 2: Business Tanpa Config**
```
Business B belum setup config:
- midtrans_config: null

→ Semua transaksi Business B pakai global config dari .env ✅
→ Ini normal dan aman ✅
```

**Skenario 3: Mixed (Beberapa Pakai Config Sendiri, Beberapa Pakai Global)**
```
Business A: Punya config sendiri → Pakai config A ✅
Business B: Tidak punya config → Pakai global config ✅
Business C: Punya config sendiri → Pakai config C ✅

→ Tidak ada konflik ✅
→ Setiap business terisolasi ✅
```

---

## 🎯 Cara Memastikan Business Pakai Config Sendiri

### **1. Setup Config di Business Management**

1. Login sebagai Owner
2. Buka **Business Management**
3. Klik **Edit Business**
4. Scroll ke **Konfigurasi Midtrans**
5. Isi:
   - ✅ **Server Key** (WAJIB)
   - ✅ **Client Key** (WAJIB)
   - ✅ **Environment Mode** (Sandbox/Production)
6. Klik **Simpan Perubahan**

### **2. Verifikasi Config Aktif**

Setelah setup, akan muncul badge:
```
✅ Konfigurasi Midtrans Aktif
Business ini sudah memiliki konfigurasi Midtrans sendiri.
Mode: [Sandbox/Production]
```

### **3. Check di Database**

```sql
SELECT id, name, midtrans_config 
FROM businesses 
WHERE id = YOUR_BUSINESS_ID;
```

Jika `midtrans_config` berisi JSON dengan `server_key` dan `client_key`, berarti sudah pakai config sendiri.

---

## ⚠️ Catatan Penting

### **1. Global Config (.env) Masih Diperlukan**

**Kenapa?**
- ✅ Fallback untuk business yang belum setup
- ✅ Default untuk business baru
- ✅ Backup jika business config error

**Jadi:**
- ✅ **TIDAK masalah** jika global config masih ada di `.env`
- ✅ **TIDAK akan konflik** dengan business config
- ✅ Business yang sudah setup config **TIDAK akan pakai** global config

### **2. Prioritas Config**

```
Priority 1: Business Config (jika lengkap)
  ↓ (jika tidak ada atau tidak lengkap)
Priority 2: Global Config (.env)
```

### **3. Isolasi Tetap Aman**

**Meskipun ada fallback:**
- ✅ Business dengan config sendiri → **TIDAK akan pakai** global config
- ✅ Business tanpa config → Pakai global config (normal)
- ✅ Tidak ada kebocoran data antar business
- ✅ Setiap business tetap terisolasi

---

## 🔍 Cara Cek Business Pakai Config Apa

### **Via Code:**

```php
$business = Business::find($businessId);

if ($business->hasCustomMidtransConfig()) {
    // Business pakai config sendiri
    $config = $business->getMidtransConfig();
    echo "Server Key: " . $config['server_key'];
    echo "Environment: " . ($config['is_production'] ? 'Production' : 'Sandbox');
} else {
    // Business pakai global config
    echo "Business pakai global config dari .env";
}
```

### **Via Database:**

```sql
-- Business dengan config sendiri
SELECT id, name, 
       JSON_EXTRACT(midtrans_config, '$.server_key') as server_key,
       JSON_EXTRACT(midtrans_config, '$.is_production') as is_production
FROM businesses 
WHERE midtrans_config IS NOT NULL 
  AND JSON_EXTRACT(midtrans_config, '$.server_key') IS NOT NULL
  AND JSON_EXTRACT(midtrans_config, '$.server_key') != '';

-- Business tanpa config (pakai global)
SELECT id, name, 'Using Global Config' as config_source
FROM businesses 
WHERE midtrans_config IS NULL 
   OR JSON_EXTRACT(midtrans_config, '$.server_key') IS NULL
   OR JSON_EXTRACT(midtrans_config, '$.server_key') = '';
```

---

## ✅ Kesimpulan

### **Apakah Normal?**
✅ **YA, SANGAT NORMAL**

### **Apakah Aman?**
✅ **YA, SANGAT AMAN**

### **Apakah Perlu Diubah?**
❌ **TIDAK PERLU**

**Alasan:**
1. ✅ Fallback mechanism adalah **by design** untuk fleksibilitas
2. ✅ Business yang sudah setup config **TIDAK akan pakai** global config
3. ✅ Business tanpa config bisa langsung jalan dengan global config
4. ✅ Tidak ada konflik atau kebocoran data
5. ✅ Setiap business tetap terisolasi dengan benar

### **Rekomendasi:**

**Untuk Business yang Ingin Pakai Config Sendiri:**
1. Setup config di Business Management
2. Isi Server Key dan Client Key
3. Pilih Environment Mode
4. Simpan

**Untuk Global Config (.env):**
- ✅ Biarkan tetap ada sebagai fallback
- ✅ Tidak akan mengganggu business yang sudah setup config
- ✅ Berguna untuk business baru atau testing

---

**Status**: ✅ **NORMAL & AMAN**  
**Last Updated**: 2025-01-27

