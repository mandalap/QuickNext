# 🚀 Seeder Filament Admin - Quick Guide

## ✅ Seeder Sudah Tersedia!

Seeder untuk login Filament admin sudah tersedia dan siap digunakan.

---

## 📋 Informasi Login

### URL Admin Panel:
```
http://localhost:8000/admin
```

### Credentials Default:
- **Email**: `admin@filament.com`
- **Password**: `password`
- **Role**: `super_admin`

---

## 🚀 Cara Menjalankan Seeder

### Windows PowerShell:
```powershell
cd app/backend
php artisan db:seed --class=FilamentAdminSeeder
```

### Linux/Mac:
```bash
cd app/backend
php artisan db:seed --class=FilamentAdminSeeder
```

### Atau via DatabaseSeeder:
```bash
cd app/backend
php artisan db:seed
```
*Note: FilamentAdminSeeder sudah termasuk di DatabaseSeeder*

---

## ✅ Output yang Diharapkan

Jika berhasil, akan muncul:
```
✅ Filament Admin User created successfully!
📧 Login Credentials:
   Email: admin@filament.com
   Password: password
   Role: super_admin
🌐 Access Filament Admin Panel at: http://localhost:8000/admin
⚠️  IMPORTANT: Change the password after first login!
```

Jika admin sudah ada:
```
⚠️  Admin user already exists:
   Email: admin@filament.com
   Name: Filament Admin
   Role: super_admin
```

---

## 🔧 Fitur Seeder

1. **Prevent Duplicate**: Seeder akan cek apakah admin sudah ada sebelum membuat
2. **Auto Set Active**: Admin otomatis di-set `is_active = true`
3. **Email Verified**: Email otomatis terverifikasi
4. **Clear Output**: Menampilkan informasi login dengan jelas

---

## 📝 File Seeder

**Location**: `app/backend/database/seeders/FilamentAdminSeeder.php`

**Isi Seeder**:
- Email: `admin@filament.com`
- Password: `password` (hash dengan bcrypt)
- Role: `super_admin`
- Status: `is_active = true`
- Email: Verified

---

## ⚠️ Catatan Penting

1. **Ganti Password**: Setelah login pertama kali, ganti password default!
2. **Production**: Jangan gunakan password default di production!
3. **Security**: Pastikan hanya user dengan role `admin` atau `super_admin` yang bisa akses

---

## 🔗 Dokumentasi Lengkap

Lihat `app/backend/FILAMENT_ADMIN_SETUP.md` untuk dokumentasi lengkap termasuk troubleshooting.

---

## 🧪 Testing

1. Jalankan seeder:
   ```bash
   php artisan db:seed --class=FilamentAdminSeeder
   ```

2. Buka browser:
   ```
   http://localhost:8000/admin
   ```

3. Login dengan:
   - Email: `admin@filament.com`
   - Password: `password`

4. **Expected**: Berhasil login dan masuk ke admin panel

---

## ✅ Checklist

- [x] Seeder sudah tersedia
- [x] Seeder bisa dijalankan
- [x] Admin user dibuat dengan benar
- [x] Role `super_admin` di-set
- [x] `is_active = true` di-set
- [x] Email terverifikasi
- [x] Dokumentasi tersedia

