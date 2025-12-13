# 🧹 Panduan: Clear Semua Data Lama untuk Mulai dari Awal

## 🎯 Tujuan
Membersihkan semua data lama (cookie, localStorage, sessionStorage) agar bisa mulai dari awal tanpa data "juli mandala putera" atau data user lain.

---

## 📋 Langkah-langkah

### 1. Clear Browser Data (Chrome/Edge)

#### Cara 1: Via Developer Tools (Recommended)
1. Buka aplikasi di browser (http://localhost:3000)
2. Tekan `F12` atau `Ctrl+Shift+I` untuk buka Developer Tools
3. Klik tab **Application** (atau **Storage** di Firefox)
4. Di sidebar kiri, expand:
   - **Cookies** → `http://localhost:3000`
   - **Local Storage** → `http://localhost:3000`
   - **Session Storage** → `http://localhost:3000`
5. Klik kanan pada masing-masing → **Clear** atau **Delete All**
6. Atau klik **Clear site data** di bagian atas

#### Cara 2: Via Browser Settings
1. Tekan `Ctrl+Shift+Delete` (atau `Cmd+Shift+Delete` di Mac)
2. Pilih **Cookies and other site data**
3. Pilih **Cached images and files**
4. Time range: **All time**
5. Klik **Clear data**

#### Cara 3: Clear Specific Site (Chrome)
1. Klik icon **Lock** atau **Info** di address bar
2. Klik **Site settings**
3. Klik **Clear data**
4. Pilih semua checkbox
5. Klik **Clear**

---

### 2. Clear via Console (JavaScript)

Buka Console di Developer Tools (`F12` → Console) dan jalankan:

```javascript
// Clear all localStorage
localStorage.clear();

// Clear all sessionStorage
sessionStorage.clear();

// Clear all cookies (manual)
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// Clear specific keys
localStorage.removeItem('token');
localStorage.removeItem('user');
localStorage.removeItem('userId');
localStorage.removeItem('businesses');
localStorage.removeItem('currentBusiness');
localStorage.removeItem('currentBusinessId');
localStorage.removeItem('currentOutletId');
localStorage.removeItem('hasActiveSubscription');

// Clear cache from cache.utils
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('cache_') || key.includes('business')) {
    localStorage.removeItem(key);
  }
});

console.log('✅ All data cleared!');
```

---

### 3. Clear via Backend (Optional)

Jika ingin clear data di database juga:

#### Clear User Tokens (Laravel Tinker)
```bash
cd app/backend
php artisan tinker
```

Kemudian di tinker:
```php
// Clear all tokens untuk user tertentu
$user = \App\Models\User::where('email', 'juli23man@gmail.com')->first();
if ($user) {
    $user->tokens()->delete();
    echo "Tokens cleared for user: " . $user->email;
}

// Atau clear semua tokens
\Laravel\Sanctum\PersonalAccessToken::truncate();
echo "All tokens cleared";
```

---

### 4. Script Otomatis untuk Clear Data

Saya akan buatkan utility script untuk clear data dengan mudah.

---

## 🔧 Utility Script untuk Clear Data

Saya akan membuat script yang bisa dipanggil dari console atau sebagai bookmark.

---

## ✅ Checklist Clear Data

Setelah clear, pastikan:

- [ ] Cookies cleared (cek di Application → Cookies)
- [ ] LocalStorage cleared (cek di Application → Local Storage)
- [ ] SessionStorage cleared (cek di Application → Session Storage)
- [ ] Refresh halaman (F5)
- [ ] Cek console tidak ada error
- [ ] Login dengan user baru (Haya)
- [ ] Pastikan tidak ada data "juli mandala putera"

---

## 🚀 Quick Clear (One-Click) - RECOMMENDED

**✅ Utility script sudah dibuat dan otomatis tersedia di console!**

### Langkah-langkah:

1. **Buka aplikasi** di browser (http://localhost:3000)
2. **Buka Console** (`F12` → Console tab)
3. **Jalankan command:**

```javascript
clearAllData()
```

4. **Refresh halaman** (`F5`)
5. **Login dengan user baru** (Haya)

### Atau Clear Hanya Auth Data:

```javascript
clearAuthData()
```

### Lihat Data yang Tersimpan:

```javascript
showStoredData()
```

---

## 📝 Catatan

- Script otomatis tersedia setelah aplikasi di-load
- Tidak perlu import atau install apapun
- Bisa dipanggil kapan saja dari console
- Safe untuk development (tidak affect production)

