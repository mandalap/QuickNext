# 🔍 Cara Melihat Error di Sistem

## 1. **Error di Browser Console** 🌐

### Cara Membuka Console:
- **Chrome/Edge**: Tekan `F12` atau `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox**: Tekan `F12` atau `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)

### Yang Harus Diperhatikan:
1. **Tab Console**: Lihat error yang berwarna merah ❌
2. **Tab Network**: Lihat request yang gagal (status 500, 404, dll)
3. Klik pada request yang error untuk melihat detail response

### Error yang Sekarang Ditampilkan:
- ✅ **Request params** yang dikirim ke backend
- ✅ **Response error** dari backend (jika ada)
- ✅ **Status code** (500, 404, dll)
- ✅ **Error message** detail

---

## 2. **Error di Backend Log** 📝

### Lokasi Log File:
```
app/backend/storage/logs/laravel.log
```

### Cara Melihat Log:

#### Windows (PowerShell):
```powershell
cd app/backend
Get-Content storage/logs/laravel.log -Tail 50
```

#### Windows (CMD):
```cmd
cd app\backend
type storage\logs\laravel.log | more
```

#### Linux/Mac:
```bash
cd app/backend
tail -f storage/logs/laravel.log
```

### Script Helper:
Jalankan script helper untuk melihat error:
```bash
cd app/backend
php check_report_error.php
```

Script ini akan menampilkan:
- ✅ Log error terakhir
- ✅ Status koneksi database
- ✅ Test query
- ✅ Test date range calculation

---

## 3. **Error di UI (Development Mode)** 🖥️

Jika error terjadi, sekarang akan ditampilkan:
- ✅ **Error message** di halaman
- ✅ **Detail error** (file, line, message) - klik "🔍 Detail Error"
- ✅ **Stack trace** untuk debugging

---

## 4. **Cara Debug Error 500** 🔧

### Step 1: Buka Browser Console
1. Tekan `F12` untuk buka DevTools
2. Buka tab **Console**
3. Lihat error yang muncul (berwarna merah)

### Step 2: Lihat Network Request
1. Buka tab **Network**
2. Refresh halaman
3. Cari request ke `/api/v1/reports/sales/summary`
4. Klik request tersebut
5. Lihat tab **Response** untuk melihat error message dari backend

### Step 3: Check Backend Log
1. Buka terminal/command prompt
2. Masuk ke folder `app/backend`
3. Jalankan: `php check_report_error.php`
4. Atau lihat log: `tail -f storage/logs/laravel.log`

### Step 4: Check Error Details
Error sekarang akan menampilkan:
- **File** tempat error terjadi
- **Line** baris error
- **Message** pesan error
- **Stack trace** untuk debugging

---

## 5. **Error yang Sering Terjadi** ⚠️

### Error 500 - Internal Server Error
**Penyebab:**
- Error di backend code
- Database connection issue
- Missing required data

**Solusi:**
1. Check log backend: `storage/logs/laravel.log`
2. Check console browser untuk detail error
3. Pastikan database running
4. Pastikan `.env` file sudah benar

### Error 400 - Bad Request
**Penyebab:**
- Missing required parameters
- Invalid data format

**Solusi:**
1. Check request params di Network tab
2. Pastikan semua required fields terisi

### Error 401 - Unauthorized
**Penyebab:**
- Token expired
- Not logged in

**Solusi:**
1. Login ulang
2. Check token di localStorage

---

## 6. **Tips Debugging** 💡

1. **Selalu buka Console** saat development
2. **Check Network tab** untuk melihat request/response
3. **Gunakan script helper** `check_report_error.php`
4. **Check log file** untuk detail error backend
5. **Gunakan breakpoint** di browser DevTools untuk debug JavaScript

---

## 7. **Error Logging yang Sudah Ditambahkan** ✅

### Backend:
- ✅ Log detail di setiap step
- ✅ Log error dengan file, line, dan trace
- ✅ Return error detail di development mode

### Frontend:
- ✅ Log request params
- ✅ Log response error detail
- ✅ Tampilkan error di UI dengan detail
- ✅ Tampilkan stack trace di development mode

---

## 8. **Quick Check** ⚡

Jalankan script ini untuk quick check:
```bash
cd app/backend
php check_report_error.php
```

Script akan menampilkan:
- ✅ Log error terakhir
- ✅ Database connection status
- ✅ Test query
- ✅ Date range calculation

---

**Selamat Debugging!** 🚀

