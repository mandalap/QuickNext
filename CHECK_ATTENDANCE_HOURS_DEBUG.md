# 🔍 Debug: Total Jam Kehadiran Menampilkan 0 Jam

## 🐛 **MASALAH**

Di halaman report absensi, kolom "Total Jam Kehadiran" menampilkan "0 jam (0.00 jam)" untuk semua karyawan.

## 🔍 **PENYEBAB YANG MUNGKIN**

### **1. Shift Belum Clock Out**
- Perhitungan jam hanya menghitung shift yang sudah **clock_in** DAN **clock_out**
- Jika shift masih **ongoing** (belum clock out), tidak akan dihitung
- Status shift harus **completed** untuk dihitung

### **2. Data Belum Ada di Database**
- Mungkin shift yang ada belum memiliki data `clock_in` dan `clock_out`
- Atau data `clock_out` masih NULL

### **3. Query Filter Salah**
- Mungkin query tidak mengambil data dengan benar karena filter date range atau outlet

## ✅ **CARA CEK**

### **1. Cek di Database**

```sql
-- Cek shift yang sudah clock_in dan clock_out
SELECT 
    user_id,
    shift_date,
    clock_in,
    clock_out,
    status,
    TIMESTAMPDIFF(MINUTE, 
        CONCAT(shift_date, ' ', clock_in), 
        CASE 
            WHEN clock_out < clock_in THEN 
                DATE_ADD(CONCAT(shift_date, ' ', clock_out), INTERVAL 1 DAY)
            ELSE 
                CONCAT(shift_date, ' ', clock_out)
        END
    ) / 60.0 AS working_hours
FROM employee_shifts
WHERE business_id = ? 
  AND shift_date BETWEEN ? AND ?
  AND clock_in IS NOT NULL
  AND clock_out IS NOT NULL
ORDER BY shift_date DESC;
```

### **2. Cek Log Backend**

Setelah request report absensi, cek log Laravel:
- `storage/logs/laravel.log`
- Cari log dengan keyword: "Shifts with hours calculation"
- Cek apakah ada data yang ditemukan

### **3. Cek di Frontend**

Buka browser console (F12) dan cek:
- Response dari API `/v1/attendance/report`
- Cek field `employee_performance[].total_working_hours`
- Apakah nilainya 0 atau null?

## 🔧 **PERBAIKAN YANG SUDAH DILAKUKAN**

1. ✅ Menambahkan logging untuk debugging
2. ✅ Memperbaiki query untuk mengambil data dengan benar
3. ✅ Memastikan query menggunakan filter yang sama dengan baseQuery

## 📝 **CATATAN PENTING**

### **Perhitungan Jam Hanya untuk Shift yang Selesai:**
- Shift harus memiliki `clock_in` DAN `clock_out`
- Shift dengan status `ongoing` tidak akan dihitung
- Shift dengan status `absent` tidak akan dihitung (karena tidak ada clock_in)

### **Format Data:**
- `clock_in`: TIME format (contoh: "08:00:00")
- `clock_out`: TIME format (contoh: "17:00:00")
- `shift_date`: DATE format (contoh: "2025-12-31")

### **Overnight Shift:**
- Jika `clock_out` < `clock_in`, dianggap shift malam (melewati tengah malam)
- Sistem akan menambahkan 1 hari ke `clock_out` untuk perhitungan

## 🚀 **CARA TESTING**

1. **Pastikan ada shift yang sudah clock_out:**
   - Clock in dan clock out untuk beberapa shift
   - Pastikan status shift menjadi "completed"

2. **Cek report absensi:**
   - Buka halaman report absensi
   - Cek apakah total jam kehadiran sudah muncul

3. **Cek log backend:**
   - Lihat log untuk memastikan data ditemukan
   - Cek apakah perhitungan jam benar

## 📊 **CONTOH DATA YANG BENAR**

```json
{
  "user_id": 1,
  "user_name": "Juli Mandala Putera",
  "total_shifts": 5,
  "completed": 3,
  "late": 1,
  "absent": 1,
  "total_working_hours": 24.5,  // ✅ Harus ada nilai, bukan 0
  "attendance_rate": 80.0
}
```

Jika `total_working_hours` masih 0, berarti:
- Tidak ada shift yang sudah clock_out
- Atau data clock_in/clock_out tidak ada di database

---

**Generated:** 2025-12-31
