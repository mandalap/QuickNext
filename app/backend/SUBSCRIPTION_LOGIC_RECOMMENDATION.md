# Rekomendasi Logika Subscription Change

## Masalah Saat Ini

Saat ini, ketika user melakukan upgrade/downgrade subscription:
- Paket baru langsung aktif (`starts_at = Carbon::now()`)
- Paket lama langsung di-cancel atau di-mark sebagai `upgraded`
- User kehilangan sisa waktu dari paket lama

## Rekomendasi: Scheduled Subscription Change

### Konsep
Ketika user memilih paket baru sementara paket lama masih aktif:
1. **Paket lama tetap aktif** sampai habis
2. **Paket baru dijadwalkan** untuk aktif setelah paket lama berakhir
3. **Sistem otomatis mengaktifkan** paket baru ketika paket lama habis

### Contoh Skenario

**Skenario 1: Upgrade dengan Sisa Waktu**
- Paket saat ini: Enterprise (sisa 5 hari)
- User memilih: Professional
- **Hasil:**
  - Enterprise tetap aktif selama 5 hari
  - Professional dijadwalkan aktif setelah 5 hari
  - Setelah 5 hari, sistem otomatis switch ke Professional

**Skenario 2: Downgrade dengan Sisa Waktu**
- Paket saat ini: Enterprise (sisa 16 hari)
- User memilih: Basic
- **Hasil:**
  - Enterprise tetap aktif selama 16 hari
  - Basic dijadwalkan aktif setelah 16 hari
  - Setelah 16 hari, sistem otomatis switch ke Basic

### Keuntungan
1. ✅ User tidak kehilangan sisa waktu yang sudah dibayar
2. ✅ Transisi lebih fair dan transparan
3. ✅ User bisa merencanakan perubahan paket lebih baik
4. ✅ Mengurangi komplain tentang kehilangan waktu

## Implementasi yang Diperlukan

### 1. Database Schema Changes

Tambahkan field ke tabel `user_subscriptions`:
```sql
ALTER TABLE user_subscriptions ADD COLUMN scheduled_change_to_subscription_id INT NULL;
ALTER TABLE user_subscriptions ADD COLUMN scheduled_change_at DATETIME NULL;
ALTER TABLE user_subscriptions ADD COLUMN scheduled_change_status ENUM('pending', 'cancelled', 'completed') NULL;
```

### 2. Logic Changes

**Upgrade/Downgrade Flow:**
1. Check apakah paket saat ini masih aktif
2. Jika masih aktif:
   - Buat subscription baru dengan status `scheduled`
   - Set `scheduled_change_at` = `current_subscription.ends_at`
   - Set `scheduled_change_to_subscription_id` = new subscription ID
   - Jangan cancel paket saat ini
3. Jika paket sudah habis:
   - Langsung aktifkan paket baru (behavior saat ini)

**Auto-Activation Job:**
- Buat scheduled job yang berjalan setiap hari
- Check semua subscription dengan `scheduled_change_status = 'pending'`
- Jika `scheduled_change_at <= now()`:
  - Aktifkan subscription baru
  - Cancel subscription lama
  - Update business subscription

### 3. UI Changes

**Frontend:**
- Tampilkan informasi: "Paket baru akan aktif setelah [X] hari"
- Tampilkan countdown: "Enterprise aktif selama 5 hari lagi, kemudian akan beralih ke Professional"
- Tampilkan opsi: "Aktifkan Sekarang" atau "Jadwalkan Setelah Paket Habis"

## Alternatif: Immediate Change dengan Credit

Jika ingin tetap menggunakan immediate change, bisa menggunakan prorated credit:
- Hitung sisa waktu paket lama
- Konversi ke credit (proportional)
- Kurangi harga paket baru dengan credit
- Aktifkan paket baru sekarang dengan harga yang sudah dikurangi

**Contoh:**
- Enterprise sisa 5 hari dari 30 hari = 16.67% credit
- Harga Enterprise: Rp 500.000
- Credit: Rp 83.350
- Professional: Rp 300.000
- Harga yang harus dibayar: Rp 300.000 - Rp 83.350 = Rp 216.650

## Rekomendasi Final

**Untuk sistem yang lebih fair dan user-friendly, saya rekomendasikan:**

✅ **Scheduled Subscription Change** (menunggu paket habis)
- Lebih fair untuk user
- User tidak kehilangan waktu yang sudah dibayar
- Transisi lebih smooth

❌ **Immediate Change** (langsung aktif)
- User kehilangan sisa waktu
- Bisa menimbulkan komplain
- Kurang fair

## Next Steps

1. Diskusikan dengan tim tentang preferensi
2. Jika setuju dengan scheduled change, saya bisa implementasikan:
   - Database migration
   - Backend logic changes
   - Scheduled job untuk auto-activation
   - Frontend UI updates















