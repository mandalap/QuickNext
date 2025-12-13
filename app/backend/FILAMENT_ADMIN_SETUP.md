# 🔐 Setup Filament Admin Login

## 📋 Informasi Login Filament

### URL Admin Panel:
```
http://localhost:8000/admin
```

### Credentials Default:
- **Email**: `admin@filament.com`
- **Password**: `password`
- **Role**: `super_admin`

---

## 🚀 Cara Membuat Admin User

### Opsi 1: Menggunakan Seeder (Recommended)
```bash
cd app/backend
php artisan db:seed --class=FilamentAdminSeeder
```

### Opsi 2: Menggunakan Script PHP
```bash
cd app/backend
php create_filament_admin.php
```

### Opsi 3: Manual via Tinker
```bash
cd app/backend
php artisan tinker
```

Kemudian jalankan:
```php
$admin = \App\Models\User::create([
    'name' => 'Filament Admin',
    'email' => 'admin@filament.com',
    'password' => \Hash::make('password'),
    'role' => 'super_admin',
    'email_verified_at' => now(),
    'phone' => '081234567890',
    'is_active' => true,
]);
```

---

## ✅ Syarat untuk Akses Filament Admin

User harus memenuhi syarat berikut:
1. **Role**: `admin` atau `super_admin`
2. **Status**: `is_active = true`
3. **Email**: Harus terverifikasi (`email_verified_at` tidak null)

Method `canAccessPanel()` di User model:
```php
public function canAccessPanel(Panel $panel): bool
{
    return in_array($this->role, ['admin', 'super_admin']) && $this->is_active;
}
```

---

## 🔧 Troubleshooting

### Q: Tidak bisa login ke `/admin`
**A**: Pastikan:
1. User admin sudah dibuat (jalankan seeder)
2. Role user adalah `admin` atau `super_admin`
3. `is_active = true`
4. Email sudah terverifikasi

### Q: Error "Access Denied"
**A**: 
- Pastikan role user adalah `admin` atau `super_admin`
- Pastikan `is_active = true`
- Cek method `canAccessPanel()` di User model

### Q: Halaman `/admin` tidak muncul
**A**: 
- Pastikan `AdminPanelProvider` sudah terdaftar di `config/app.php` atau `bootstrap/providers.php`
- Pastikan route Filament sudah terdaftar
- Clear cache: `php artisan route:clear` dan `php artisan config:clear`

### Q: Lupa password admin
**A**: Reset password via Tinker:
```bash
php artisan tinker
```
```php
$admin = \App\Models\User::where('email', 'admin@filament.com')->first();
$admin->password = \Hash::make('password_baru');
$admin->save();
```

---

## 📝 Catatan Penting

⚠️ **PENTING**: 
- Ganti password default setelah login pertama kali!
- Jangan gunakan password default di production!
- Pastikan hanya user dengan role `admin` atau `super_admin` yang bisa akses admin panel

---

## 🔗 File Terkait

- **Seeder**: `app/backend/database/seeders/FilamentAdminSeeder.php`
- **Script**: `app/backend/create_filament_admin.php`
- **Panel Provider**: `app/backend/app/Providers/Filament/AdminPanelProvider.php`
- **User Model**: `app/backend/app/Models/User.php`

