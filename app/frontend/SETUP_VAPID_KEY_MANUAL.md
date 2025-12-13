# 🔑 Setup VAPID Key - Manual Instructions

## ⚡ Quick Setup (Pilih salah satu)

### **Method 1: Menggunakan Script (Termudah)**

**Windows (PowerShell):**
```powershell
cd app/frontend
.\setup-vapid-key.ps1
```

**Linux/Mac (Bash):**
```bash
cd app/frontend
chmod +x setup-vapid-key.sh
./setup-vapid-key.sh
```

---

### **Method 2: Manual (Copy-Paste)**

1. **Buka folder:** `app/frontend/`

2. **Buat file baru** dengan nama: `.env.local`
   - **Windows:** Klik kanan → New → Text Document → Rename menjadi `.env.local`
   - **VS Code:** File → New File → Save as `.env.local`

3. **Copy-paste isi berikut:**
   ```env
   REACT_APP_VAPID_PUBLIC_KEY=BKCUpjqgx0AuclTfYlmTwgliKekCHL4KgH24yddKUEjJvcv_WX7d7uM0ZKE-rqZq4uPNAwKRPFEMDdrit3hOEO8
   ```

4. **Save file**

---

## ✅ Verifikasi File

Pastikan file `.env.local` berisi:

```env
REACT_APP_VAPID_PUBLIC_KEY=BKCUpjqgx0AuclTfYlmTwgliKekCHL4KgH24yddKUEjJvcv_WX7d7uM0ZKE-rqZq4uPNAwKRPFEMDdrit3hOEO8
```

**Checklist:**
- ✅ File ada di `app/frontend/.env.local` (bukan di root)
- ✅ Menggunakan prefix `REACT_APP_`
- ✅ Tidak ada spasi sebelum/sesudah `=`
- ✅ Tidak ada tanda kutip
- ✅ Satu baris (tidak ada line break)

---

## 🔄 Restart Development Server

**SANGAT PENTING:** Restart server setelah membuat/mengedit `.env.local`

1. **Stop server:**
   - Tekan `Ctrl+C` di terminal yang menjalankan `npm start`

2. **Start server lagi:**
   ```bash
   cd app/frontend
   npm start
   ```

3. **Refresh browser:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) atau `Cmd+Shift+R` (Mac)

---

## 🧪 Test

Setelah restart:

1. Login ke aplikasi
2. Go to: **Settings → Push Notifications**
3. **Alert merah harus hilang** ✅
4. **Tombol "Aktifkan Notifikasi" harus aktif (hijau)** ✅
5. **Tombol bisa diklik** ✅

---

## 🔍 Troubleshooting

### **Masih Error "VAPID Key Belum Di-set"?**

1. ✅ **Pastikan file `.env.local` ada di `app/frontend/`**
   ```bash
   # Check file location
   ls app/frontend/.env.local
   ```

2. ✅ **Pastikan isi file benar:**
   ```bash
   # View file content
   cat app/frontend/.env.local
   ```

3. ✅ **Restart development server** (sangat penting!)
   - Stop server (Ctrl+C)
   - Start lagi (npm start)

4. ✅ **Clear browser cache:**
   - Ctrl+Shift+Delete → Clear cache
   - Atau hard refresh: Ctrl+Shift+R

5. ✅ **Cek browser console (F12):**
   - Tidak ada error `VAPID_PUBLIC_KEY not found`
   - `process.env.REACT_APP_VAPID_PUBLIC_KEY` harus terlihat di console

---

## 📝 Contoh File `.env.local` yang Benar

```
REACT_APP_VAPID_PUBLIC_KEY=BKCUpjqgx0AuclTfYlmTwgliKekCHL4KgH24yddKUEjJvcv_WX7d7uM0ZKE-rqZq4uPNAwKRPFEMDdrit3hOEO8
```

**❌ SALAH:**
```
REACT_APP_VAPID_PUBLIC_KEY = BKCUpjqgx0AuclTfYlmTwgliKekCHL4KgH24yddKUEjJvcv_WX7d7uM0ZKE-rqZq4uPNAwKRPFEMDdrit3hOEO8
# Ada spasi sebelum/sesudah =
```

```
REACT_APP_VAPID_PUBLIC_KEY="BKCUpjqgx0AuclTfYlmTwgliKekCHL4KgH24yddKUEjJvcv_WX7d7uM0ZKE-rqZq4uPNAwKRPFEMDdrit3hOEO8"
# Ada tanda kutip
```

---

**Setelah setup, push notification akan berfungsi!** 🚀

