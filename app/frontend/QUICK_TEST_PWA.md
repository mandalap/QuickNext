# 🚀 Quick Test PWA - Langkah Cepat

## ✅ Build Sudah Selesai!

Build production sudah berhasil. Sekarang kita test PWA!

---

## 📋 Langkah 1: Serve Production Build

```bash
cd app/frontend
npm run serve:production
```

**Atau:**
```bash
npx serve -s build -l 3000
```

App akan berjalan di: **http://localhost:3000**

---

## 🖥️ Test di PC (Desktop) - Chrome/Edge

### 1. Buka App
- Buka browser Chrome atau Edge
- Buka: `http://localhost:3000`

### 2. Cek Install Prompt

**Cara 1: Browser Install Prompt**
- Lihat icon **"+"** atau **"Install"** di **address bar** (kanan atas)
- Klik icon tersebut
- Popup "Install QuickKasir" akan muncul
- Klik **"Install"**

**Cara 2: Custom Install Prompt**
- Lihat banner **"Install QuickKasir"** di pojok kanan bawah
- Klik **"Install"**

### 3. Verifikasi Install
- ✅ App muncul di **Start Menu** (Windows) atau **Applications** (macOS)
- ✅ App bisa dibuka sebagai **standalone window** (tidak di browser tab)
- ✅ Window tidak punya address bar browser

### 4. Test Service Worker
1. Buka **Chrome DevTools** (F12)
2. Tab **Application** > **Service Workers**
3. Cek: Status harus **"activated and is running"**

### 5. Test Manifest
1. DevTools > **Application** > **Manifest**
2. Cek: Semua icons terdeteksi, tidak ada error

### 6. Test Offline Mode
1. DevTools > **Network** tab
2. Pilih **"Offline"** dari dropdown
3. Reload halaman (F5)
4. Cek: App masih bisa diakses, indicator "Offline" muncul

---

## 📱 Test di Mobile (Android)

### Setup:
1. Pastikan PC dan mobile di **network yang sama** (WiFi yang sama)
2. Cari IP address PC:
   - Windows: Buka CMD, ketik `ipconfig`, lihat **IPv4 Address**
   - Contoh: `192.168.1.100`
3. Di mobile, buka Chrome
4. Buka: `http://[IP-PC]:3000`
   - Contoh: `http://192.168.1.100:3000`

### Test Install:
1. Banner **"Install QuickKasir"** akan muncul
2. Atau klik menu (3 dots) > **"Install app"**
3. Klik **"Install"**
4. App akan terinstall dan muncul di **app drawer**

### Verifikasi:
- ✅ App muncul di app drawer
- ✅ Icon app benar
- ✅ Bisa dibuka sebagai standalone
- ✅ Splash screen muncul saat launch

---

## 📱 Test di Mobile (iOS - iPhone/iPad)

### Setup:
1. Pastikan PC dan iPhone di **network yang sama**
2. Cari IP address PC (sama seperti Android)
3. Di iPhone, buka **Safari**
4. Buka: `http://[IP-PC]:3000`

### Test Install (Add to Home Screen):
1. Tap icon **Share** (kotak dengan panah)
2. Scroll ke bawah, pilih **"Add to Home Screen"**
3. Edit nama (opsional)
4. Tap **"Add"**
5. App akan muncul di **home screen**

### Verifikasi:
- ✅ App muncul di home screen
- ✅ Icon app benar
- ✅ Bisa dibuka sebagai standalone
- ✅ Tidak ada address bar Safari

---

## ✅ Checklist Cepat

### Desktop (Chrome/Edge)
- [ ] Install prompt muncul
- [ ] App terinstall
- [ ] App bisa dibuka standalone
- [ ] Service worker ter-register
- [ ] Manifest valid
- [ ] Offline mode bekerja

### Mobile (Android)
- [ ] Install prompt muncul
- [ ] App terinstall
- [ ] App muncul di app drawer
- [ ] Splash screen muncul

### Mobile (iOS)
- [ ] "Add to Home Screen" muncul
- [ ] App muncul di home screen
- [ ] App bisa dibuka standalone

---

## 🐛 Troubleshooting

### Install Prompt Tidak Muncul?
- Pastikan menggunakan **localhost** (development) atau **HTTPS** (production)
- Cek di DevTools > Application > Manifest (harus tidak ada error)
- Pastikan service worker ter-register

### Service Worker Tidak Ter-register?
- Clear cache browser
- Reload halaman
- Cek console untuk error

### Offline Mode Tidak Bekerja?
- Cek service worker ter-register
- Test dengan DevTools > Network > Offline
- Reload halaman setelah offline

---

## 🎯 Expected Results

### Desktop
- ✅ Install prompt muncul di address bar
- ✅ Custom install prompt muncul di bottom-right
- ✅ App terinstall dan muncul di start menu
- ✅ App bisa dibuka sebagai standalone window

### Mobile (Android)
- ✅ Install banner muncul
- ✅ App terinstall dan muncul di app drawer
- ✅ Splash screen muncul saat launch
- ✅ App bekerja seperti native app

### Mobile (iOS)
- ✅ "Add to Home Screen" muncul di share menu
- ✅ App muncul di home screen
- ✅ App bisa dibuka sebagai standalone
- ✅ Tidak ada Safari UI

---

## 📝 Test Results

Setelah testing, catat hasilnya:

```
Date: ___________
Browser: ___________
Device: ___________

Install Prompt: ✅ / ❌
Service Worker: ✅ / ❌
Manifest: ✅ / ❌
Offline Mode: ✅ / ❌

Issues: ___________
```

---

**Selamat Testing!** 🎉

Jika ada masalah, cek `PWA_TESTING_GUIDE.md` untuk panduan lengkap.

