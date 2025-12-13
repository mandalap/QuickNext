# Quick Fix: Blank Screen Error

**Problem:** Layar putih / blank screen setelah implementasi Kasir POS

**Root Cause:** Missing dependency `react-hot-toast`

---

## ✅ Sudah Diperbaiki:

### 1. Install react-hot-toast
```bash
cd frontend
npm install react-hot-toast
```
✅ **DONE** - Package sudah terinstall

### 2. Add Toaster to App.js
```javascript
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <div className='App'>
      <AuthProvider>
        <ToastProvider>
          <Toaster position="top-right" />  {/* ← ADDED */}
          <BrowserRouter>
            ...
```
✅ **DONE** - Toaster component sudah ditambahkan

---

## 🔧 Troubleshooting Steps:

### Step 1: Hard Refresh Browser
1. Buka browser (Chrome/Firefox)
2. Tekan **Ctrl + Shift + R** (Windows) atau **Cmd + Shift + R** (Mac)
3. Atau **F12** → Console → klik ikon 🗑️ (Clear Console) → Refresh

### Step 2: Clear Cache
```bash
# In frontend directory
rm -rf node_modules/.cache
npm start
```

### Step 3: Check Browser Console
1. Tekan **F12** untuk buka Developer Tools
2. Klik tab **Console**
3. Cek error merah (jika ada)

### Step 4: Check Network Tab
1. F12 → Network tab
2. Refresh page (F5)
3. Cek apakah ada file yang gagal load (status 404, 500, dll)

---

## 🐛 Common Errors & Solutions:

### Error: "Cannot find module 'react-hot-toast'"
**Solution:**
```bash
cd frontend
npm install react-hot-toast
npm start
```

### Error: "Module not found: Can't resolve './components/ui/dialog'"
**Solution:**
Check if dialog.jsx exists:
```bash
ls frontend/src/components/ui/dialog.jsx
```
If not exists, create shadcn/ui components:
```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add label
npx shadcn-ui@latest add input
```

### Error: "useAuth is not defined"
**Solution:**
Check AuthContext import:
```javascript
import { useAuth } from '../contexts/AuthContext';
```

### Error: WebSocket connection failed (ws://localhost:443/ws)
**This is just a warning - IGNORE IT**
- This is from webpack dev server trying to connect
- Does not affect app functionality
- Can be ignored safely

---

## 📋 Checklist Sebelum Testing:

- [x] `react-hot-toast` terinstall di package.json
- [x] `<Toaster />` component ditambahkan di App.js
- [x] All UI components exist (dialog, label, input, button, etc.)
- [x] Frontend running on port 3000
- [ ] Browser hard refresh (Ctrl+Shift+R)
- [ ] No errors in browser console

---

## 🎯 Testing CashierPOS:

### 1. Buka halaman POS
```
http://localhost:3000/cashier
```

### 2. Expected Behavior:
- ✅ Products loading dari database
- ✅ Categories tampil di atas
- ✅ Search box berfungsi
- ✅ Klik produk → masuk keranjang
- ✅ Tombol +/- untuk ubah quantity
- ✅ Total harga muncul di cart sidebar

### 3. Test Payment Flow:
1. Tambah 2-3 produk ke cart
2. Klik "Proses Pembayaran"
3. Payment modal harus muncul
4. Pilih metode (Cash)
5. Input amount (misal 100000)
6. Kembalian ter-calculate otomatis
7. Klik "Bayar Sekarang"
8. Receipt modal harus muncul
9. Klik "Cetak Struk" → print dialog muncul

---

## 🚨 If Still Blank Screen:

### Check React Error Overlay
Jika ada error, React akan tampilkan error overlay merah dengan detail error.

### Check Browser Console
```
F12 → Console tab
```
Screenshot error dan kirim ke developer.

### Check Backend API
```bash
cd backend
php artisan serve
```
Backend harus running di `http://localhost:8000`

### Check .env Frontend
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Check Business ID
```javascript
// In browser console (F12)
localStorage.getItem('currentBusinessId')
// Should return a number, not null
```

---

## ✅ Verification Commands:

```bash
# 1. Check if react-hot-toast installed
cd frontend
npm list react-hot-toast
# Should show: react-hot-toast@2.6.0

# 2. Check if frontend running
curl http://localhost:3000
# Should return HTML

# 3. Check if backend running
curl http://localhost:8000/api/v1/products
# Should return JSON

# 4. Check Toaster in App.js
grep -n "Toaster" frontend/src/App.js
# Should show: import { Toaster } from 'react-hot-toast';
```

---

## 📞 Need More Help?

Jika masih error, lakukan:

1. **Screenshot browser console** (F12 → Console tab)
2. **Screenshot error message** (jika ada)
3. **Check terminal output** dari `npm start`

Kemudian kirim screenshot ke developer untuk diagnosis lebih lanjut.

---

**Status:** ✅ Fix Applied
**Next Step:** Hard refresh browser (Ctrl+Shift+R) dan test aplikasi
