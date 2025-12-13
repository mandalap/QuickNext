# 🧪 PWA Testing Guide - Quick Start

## ✅ Prerequisites

1. **Build production version:**
   ```bash
   cd app/frontend
   npm run build
   ```

2. **Serve production build:**
   ```bash
   npm run serve:production
   # atau
   npx serve -s build -l 3000
   ```

3. **Buka di browser:**
   - Desktop: `http://localhost:3000`
   - Mobile: `http://[IP-COMPUTER]:3000` (pastikan di network yang sama)

---

## 🖥️ Testing di PC (Desktop)

### Chrome/Edge Desktop

#### 1. Test Install Prompt

**Cara 1: Browser Install Prompt**
1. Buka `http://localhost:3000`
2. Lihat icon **"+"** atau **"Install"** di address bar (kanan atas)
3. Klik icon tersebut
4. Popup "Install QuickKasir" akan muncul
5. Klik **"Install"**
6. App akan terinstall dan muncul di:
   - Windows: Start Menu
   - macOS: Applications folder
   - Linux: Applications menu

**Cara 2: Custom Install Prompt**
1. Buka app
2. Lihat banner **"Install QuickKasir"** di pojok kanan bawah
3. Klik **"Install"**
4. App akan terinstall

**Verifikasi:**
- ✅ App muncul di desktop/start menu
- ✅ App bisa dibuka sebagai standalone (tidak di browser tab)
- ✅ Window tidak punya address bar browser
- ✅ Icon app muncul dengan benar

#### 2. Test Service Worker

1. Buka Chrome DevTools (F12)
2. Tab **Application** > **Service Workers**
3. Cek:
   - ✅ Service worker ter-register
   - ✅ Status: **activated and is running**
   - ✅ Scope: `/`

#### 3. Test Manifest

1. DevTools > **Application** > **Manifest**
2. Cek:
   - ✅ Name: "QuickKasir - Kasir POS System"
   - ✅ Icons: Semua icons terdeteksi
   - ✅ Display: "standalone"
   - ✅ Start URL: "/"

#### 4. Test Offline Mode

1. DevTools > **Network** tab
2. Pilih **"Offline"** dari dropdown
3. Reload halaman (F5)
4. Cek:
   - ✅ App masih bisa diakses
   - ✅ Static assets (JS, CSS) masih load
   - ✅ Indicator "Offline" muncul
   - ✅ Transaksi bisa dibuat (disimpan lokal)

#### 5. Test Update Notification

1. Modifikasi `public/service-worker.js` (tambah comment)
2. Rebuild: `npm run build`
3. Serve lagi: `npm run serve:production`
4. Buka app di browser
5. Cek:
   - ✅ Notifikasi "Update Tersedia" muncul
   - ✅ Klik "Update Sekarang" berhasil
   - ✅ Page reload dengan versi baru

---

## 📱 Testing di Mobile

### Android (Chrome)

#### 1. Setup

1. Pastikan PC dan mobile di **network yang sama**
2. Cari IP address PC:
   - Windows: `ipconfig` (lihat IPv4)
   - macOS/Linux: `ifconfig` atau `ip addr`
3. Di mobile, buka: `http://[IP-PC]:3000`
   - Contoh: `http://192.168.1.100:3000`

#### 2. Test Install

1. Buka app di Chrome mobile
2. Banner **"Install QuickKasir"** akan muncul
3. Atau klik menu (3 dots) > **"Install app"**
4. Klik **"Install"**
5. App akan terinstall dan muncul di **app drawer**

**Verifikasi:**
- ✅ App muncul di app drawer
- ✅ Icon app benar
- ✅ Bisa dibuka sebagai standalone
- ✅ Splash screen muncul saat launch

#### 3. Test Offline

1. Buka app
2. Matikan WiFi/Data
3. Cek:
   - ✅ App masih bisa diakses
   - ✅ Indicator "Offline" muncul
   - ✅ Transaksi bisa dibuat

---

### iOS (Safari)

#### 1. Setup

1. Pastikan PC dan iPhone di **network yang sama**
2. Buka: `http://[IP-PC]:3000` di Safari

#### 2. Test Install (Add to Home Screen)

1. Buka app di Safari
2. Tap icon **Share** (kotak dengan panah)
3. Scroll ke bawah, pilih **"Add to Home Screen"**
4. Edit nama (opsional)
5. Tap **"Add"**
6. App akan muncul di **home screen**

**Verifikasi:**
- ✅ App muncul di home screen
- ✅ Icon app benar
- ✅ Bisa dibuka sebagai standalone
- ✅ Tidak ada address bar Safari

#### 3. Test Offline

1. Buka app
2. Matikan WiFi/Data
3. Cek:
   - ✅ App masih bisa diakses (dari cache)
   - ✅ Transaksi bisa dibuat

---

## 🔍 Quick Verification Checklist

### Desktop (Chrome/Edge)
- [ ] Install prompt muncul
- [ ] App terinstall
- [ ] App bisa dibuka standalone
- [ ] Service worker ter-register
- [ ] Manifest valid
- [ ] Offline mode bekerja
- [ ] Update notification bekerja

### Mobile (Android)
- [ ] Install prompt muncul
- [ ] App terinstall
- [ ] App muncul di app drawer
- [ ] Splash screen muncul
- [ ] Offline mode bekerja

### Mobile (iOS)
- [ ] "Add to Home Screen" muncul
- [ ] App muncul di home screen
- [ ] App bisa dibuka standalone
- [ ] Offline mode bekerja

---

## 🐛 Troubleshooting

### Install Prompt Tidak Muncul

**Desktop:**
- Pastikan menggunakan **HTTPS** (production) atau **localhost** (development)
- Pastikan manifest.json valid
- Cek di DevTools > Application > Manifest (harus tidak ada error)
- Pastikan service worker ter-register

**Mobile:**
- Pastikan menggunakan **HTTPS** (production)
- Atau gunakan **localhost** (development)
- Cek manifest.json valid
- Pastikan semua icons ada

### Service Worker Tidak Ter-register

1. Cek `public/service-worker.js` ada
2. Cek `src/index.js` ada kode register service worker
3. Clear cache browser
4. Reload halaman

### Offline Mode Tidak Bekerja

1. Cek service worker ter-register
2. Cek cache strategy di service-worker.js
3. Test dengan DevTools > Network > Offline
4. Reload halaman setelah offline

### Update Notification Tidak Muncul

1. Pastikan service worker di-update (modify file)
2. Rebuild: `npm run build`
3. Serve lagi
4. Buka app (bukan hard refresh, tapi normal reload)

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________
Browser: ___________
Device: ___________

Install Prompt: ✅ / ❌
Service Worker: ✅ / ❌
Manifest: ✅ / ❌
Offline Mode: ✅ / ❌
Update Notification: ✅ / ❌
Icons: ✅ / ❌

Issues Found:
___________

Notes:
___________
```

---

## 🚀 Quick Test Commands

```bash
# 1. Build
cd app/frontend
npm run build

# 2. Serve
npm run serve:production

# 3. Test di browser
# Desktop: http://localhost:3000
# Mobile: http://[IP-PC]:3000

# 4. Check Service Worker
# DevTools > Application > Service Workers

# 5. Check Manifest
# DevTools > Application > Manifest
```

---

## ✅ Expected Results

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

**Selamat Testing!** 🎉

