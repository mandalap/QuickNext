# 🚀 Fitur Upgrade Subscription dengan 3 Opsi

## 📋 Overview

Sistem upgrade subscription dengan 3 opsi yang berbeda, memberikan fleksibilitas kepada user untuk memilih cara upgrade yang paling sesuai dengan kebutuhan mereka.

## 🎯 3 Opsi Upgrade

### **Opsi 1: Daily Value (Pro-rata Penuh)**

**Konsep:** Konversi 100% sisa nilai Basic ke Professional

**Rumus:**
```
Sisa Hari × Harga Basic/hari ÷ Harga Pro/hari = Hari Bonus
```

**Karakteristik:**
- ✅ Paling fair untuk user
- ⚠️ Paling berisiko untuk margin bisnis
- 💰 User bayar harga paket baru
- 📅 Dapat bonus hari dari konversi 100% sisa nilai

**Contoh:**
- Sisa 20 hari dari Basic (Rp 99.000/30 hari = Rp 3.300/hari)
- Upgrade ke Professional (Rp 249.000/30 hari = Rp 8.300/hari)
- Nilai sisa: 20 × Rp 3.300 = Rp 66.000
- Konversi: Rp 66.000 ÷ Rp 8.300 = 7.95 hari ≈ 8 hari bonus
- Total: 30 hari + 8 hari = 38 hari

---

### **Opsi 2: Bonus Days dengan Cap (⭐ REKOMENDASI TERBAIK)**

**Konsep:** Bayar full + bonus hari terbatas (max 60 hari), konversi hanya 30-50% dari sisa nilai Basic

**Rumus:**
```
Konversi = Sisa Nilai × 40% ÷ Harga Pro/hari
Bonus Hari = min(60 hari, Konversi)
```

**Karakteristik:**
- ✅ Sangat aman untuk margin bisnis
- ✅ User tetap dapat benefit
- 🛡️ Mencegah exploit (100 user tidak bisa jadi 13 bulan)
- 💰 User bayar harga penuh paket baru
- 📅 Dapat bonus hari maksimal 60 hari dari konversi 40% sisa nilai

**Contoh:**
- Sisa 20 hari dari Basic (Rp 3.300/hari)
- Nilai sisa: 20 × Rp 3.300 = Rp 66.000
- Konversi 40%: Rp 66.000 × 40% = Rp 26.400
- Bonus hari: Rp 26.400 ÷ Rp 8.300 = 3.18 hari ≈ 3 hari bonus
- Total: 30 hari + 3 hari = 33 hari

**Mengapa REKOMENDASI TERBAIK?**
- Melindungi margin bisnis dari exploit
- User tetap mendapat benefit yang fair
- Mencegah abuse dengan cap maksimal 60 hari

---

### **Opsi 3: Diskon Paket Baru**

**Konsep:** Diskon langsung harga (5-15%), durasi standar

**Rumus:**
```
Diskon = Harga Paket × Persentase Diskon
Harga Final = Harga Paket - Diskon
```

**Persentase Diskon:**
- 1 bulan: 5%
- 3 bulan: 8%
- 6 bulan: 12%
- 12 bulan: 15%

**Karakteristik:**
- ✅ Paling sederhana
- ✅ Cocok untuk flash sale atau user pemula
- 💰 User bayar harga diskon
- 📅 Durasi standar (tidak ada bonus hari)

**Contoh:**
- Professional 1 bulan: Rp 249.000
- Diskon 5%: Rp 249.000 × 5% = Rp 12.450
- Harga final: Rp 249.000 - Rp 12.450 = Rp 236.550
- Durasi: 30 hari (standar)

---

## 🔧 Implementasi Backend

### Endpoint: `GET /v1/subscriptions/upgrade-options/{planId}/{priceId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "daily_value": {
      "type": "daily_value",
      "label": "Opsi 1: Daily Value (Pro-rata Penuh)",
      "description": "...",
      "amount_to_pay": 249000,
      "credit_amount": 66000,
      "credit_percentage": 100,
      "ends_at": "2026-02-15T00:00:00Z",
      "total_days": 38,
      "bonus_days": 8,
      "calculation_details": {
        "formula": "...",
        "formula_explanation": "..."
      }
    },
    "bonus_days": {
      "type": "bonus_days",
      "label": "Opsi 2: Bonus Days dengan Cap (REKOMENDASI TERBAIK)",
      "is_recommended": true,
      "max_bonus_days": 60,
      ...
    },
    "discount": {
      "type": "discount",
      "label": "Opsi 3: Diskon Paket Baru",
      "savings": 12450,
      ...
    },
    "summary": {
      "current_plan": "Basic",
      "new_plan": "Professional",
      "remaining_days": 20,
      "remaining_value": 66000,
      ...
    }
  }
}
```

### Endpoint: `POST /v1/subscriptions/upgrade`

**Request:**
```json
{
  "subscription_plan_id": 2,
  "subscription_plan_price_id": 3,
  "upgrade_option": "bonus_days" // daily_value, bonus_days, discount
}
```

---

## 🎨 Implementasi Frontend

### Component: `UpgradeOptionsModal.jsx`

**Fitur:**
- ✅ Menampilkan 3 opsi upgrade dengan card
- ✅ Badge "REKOMENDASI TERBAIK" untuk opsi 2
- ✅ Detail perhitungan dengan rumus
- ✅ Toggle untuk melihat rumus lengkap
- ✅ Informasi credit, bonus days, dan savings

**Default Selection:**
- Opsi 2 (Bonus Days) dipilih secara default karena REKOMENDASI TERBAIK

---

## 📊 Perbandingan Opsi

| Aspek | Opsi 1: Daily Value | Opsi 2: Bonus Days | Opsi 3: Diskon |
|-------|-------------------|-------------------|----------------|
| **Konversi Sisa Nilai** | 100% | 40% | 0% |
| **Bonus Hari** | Tidak terbatas | Max 60 hari | 0 hari |
| **Harga yang Dibayar** | Harga paket baru | Harga paket baru | Harga diskon |
| **Risiko Margin** | ⚠️ Tinggi | ✅ Rendah | ✅ Rendah |
| **Fair untuk User** | ✅ Sangat fair | ✅ Fair | ✅ Fair |
| **Rekomendasi** | ❌ | ⭐ **YA** | ❌ |

---

## 🔒 Proteksi dari Exploit

**Masalah:** User bisa exploit dengan upgrade di akhir periode untuk mendapatkan durasi panjang tanpa bayar.

**Solusi Opsi 2:**
- Cap maksimal 60 hari bonus
- Konversi hanya 40% dari sisa nilai
- Mencegah 100 user exploit jadi 13 bulan

**Contoh Kasus:**
- User dengan 100 hari sisa Basic
- Tanpa cap: 100 hari × 100% = 100 hari bonus (exploit!)
- Dengan cap: min(60 hari, 100 hari × 40%) = 40 hari bonus (aman)

---

## 🚀 Cara Menggunakan

1. User membuka halaman Subscription Settings
2. Klik tombol "Upgrade" pada paket yang diinginkan
3. Sistem menampilkan 3 opsi upgrade dengan perhitungan lengkap
4. User memilih opsi (default: Opsi 2 - REKOMENDASI TERBAIK)
5. User dapat melihat rumus perhitungan dengan klik "Lihat Rumus Perhitungan"
6. User klik "Pilih Opsi Ini" untuk melanjutkan
7. Sistem membuat subscription baru dengan status `pending_payment`
8. User melakukan pembayaran melalui Midtrans
9. Setelah pembayaran dikonfirmasi, subscription menjadi `active`

---

## 📝 Catatan Penting

1. **Opsi 2 (Bonus Days) adalah REKOMENDASI TERBAIK** karena:
   - Melindungi margin bisnis
   - User tetap mendapat benefit yang fair
   - Mencegah exploit dengan cap maksimal

2. **Konversi rate (40%) dan cap (60 hari)** dapat disesuaikan di:
   ```php
   $bonusDaysConversionRate = 0.40; // 30-50%
   $maxBonusDays = 60;
   ```

3. **Diskon persentase** disesuaikan berdasarkan durasi:
   - 1 bulan: 5%
   - 3 bulan: 8%
   - 6 bulan: 12%
   - 12 bulan: 15%

---

## ✅ Testing

1. Test dengan berbagai sisa hari (5, 20, 50, 100 hari)
2. Test dengan berbagai paket (Basic → Professional, Professional → Enterprise)
3. Test dengan berbagai durasi (1, 3, 6, 12 bulan)
4. Verify cap 60 hari bekerja dengan benar
5. Verify konversi 40% bekerja dengan benar
6. Verify rumus perhitungan ditampilkan dengan benar di UI

---

## 🔄 Update History

- **2026-01-16**: Implementasi 3 opsi upgrade dengan rumus lengkap
  - Opsi 1: Daily Value (100% konversi)
  - Opsi 2: Bonus Days dengan Cap (40% konversi, max 60 hari) - REKOMENDASI
  - Opsi 3: Diskon Paket Baru (5-15% berdasarkan durasi)
