# 📱 Panduan Install PWA di HP dengan Server Local (IP Address)

## ✅ Ya, Bisa Menggunakan IP Address!

Aplikasi QuickKasir bisa diinstall di HP menggunakan **IP address** dari komputer Anda, tapi ada beberapa hal yang perlu diperhatikan:

---

## ⚠️ Catatan Penting

### **PWA Install Requirements:**

1. **HTTPS Required** - PWA hanya bisa diinstall via HTTPS (kecuali localhost)
2. **Same Network** - HP dan komputer harus dalam **jaringan WiFi yang sama**
3. **Firewall** - Pastikan firewall tidak memblokir port

---

## 🚀 Metode 1: Setup HTTPS di Local (Recommended)

### **Langkah 1: Install mkcert (untuk SSL certificate lokal)**

**Windows:**

```powershell
# Install via Chocolatey
choco install mkcert

# Atau download dari: https://github.com/FiloSottile/mkcert/releases
```

**Mac:**

```bash
brew install mkcert
```

**Linux:**

```bash
# Ubuntu/Debian
sudo apt install libnss3-tools
wget -O mkcert https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64
chmod +x mkcert
sudo mv mkcert /usr/local/bin/
```

### **Langkah 2: Setup mkcert**

```bash
# Install local CA
mkcert -install

# Generate certificate untuk IP address Anda
# Ganti 192.168.1.100 dengan IP komputer Anda
mkcert 192.168.1.100 localhost 127.0.0.1 ::1
```

Ini akan menghasilkan 2 file:

- `192.168.1.100+3.pem` (certificate)
- `192.168.1.100+3-key.pem` (private key)

### **Langkah 3: Cari IP Address Komputer**

**Windows:**

```powershell
ipconfig
# Cari "IPv4 Address" di bagian WiFi adapter
```

**Mac/Linux:**

```bash
ifconfig
# Atau
ip addr show
```

**Contoh IP:** `192.168.1.100`

### **Langkah 4: Setup Backend dengan HTTPS**

**File: `app/backend/server-https.php`** (buat file baru)

```php
<?php
// Simple HTTPS server untuk development
$host = '0.0.0.0';
$port = 8000;
$cert = __DIR__ . '/192.168.1.100+3.pem';
$key = __DIR__ . '/192.168.1.100+3-key.pem';

$context = stream_context_create([
    'ssl' => [
        'local_cert' => $cert,
        'local_pk' => $key,
        'allow_self_signed' => true,
        'verify_peer' => false,
    ]
]);

$socket = stream_socket_server(
    "ssl://{$host}:{$port}",
    $errno,
    $errstr,
    STREAM_SERVER_BIND | STREAM_SERVER_LISTEN,
    $context
);

echo "Backend HTTPS server running on https://{$host}:{$port}\n";

// Handle requests (simplified - gunakan Laravel serve dengan HTTPS)
```

**Atau gunakan Laravel Valet dengan HTTPS:**

```bash
valet secure backend
```

### **Langkah 5: Setup Frontend dengan HTTPS**

**Install `https-localhost` atau gunakan `react-scripts` dengan HTTPS:**

**File: `app/frontend/package.json`** - tambahkan script:

```json
{
  "scripts": {
    "start": "react-scripts start",
    "start:https": "HTTPS=true HOST=0.0.0.0 react-scripts start"
  }
}
```

**Atau buat file `.env.local`:**

```env
HTTPS=true
HOST=0.0.0.0
REACT_APP_API_BASE_URL=https://192.168.1.100:8000
```

**Jalankan:**

```bash
npm run start:https
```

### **Langkah 6: Update CORS di Backend**

**File: `app/backend/config/cors.php`:**

```php
'allowed_origins' => [
    'https://192.168.1.100:3000',
    'https://localhost:3000',
    'http://localhost:3000', // fallback
],
```

### **Langkah 7: Akses dari HP**

1. **Pastikan HP dan komputer dalam WiFi yang sama**
2. **Buka browser di HP:** `https://192.168.1.100:3000`
3. **Accept certificate warning** (karena self-signed)
4. **Install PWA** seperti biasa

---

## 🔧 Metode 2: Menggunakan ngrok (Paling Mudah)

### **Langkah 1: Install ngrok**

**Download dari:** https://ngrok.com/download

**Atau via package manager:**

```bash
# Windows (Chocolatey)
choco install ngrok

# Mac
brew install ngrok

# Linux
# Download dari website
```

### **Langkah 2: Daftar dan Setup**

1. **Daftar di ngrok.com** (gratis)
2. **Dapatkan authtoken** dari dashboard
3. **Setup authtoken:**

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### **Langkah 3: Jalankan ngrok**

**Terminal 1 - Backend:**

```bash
cd app/backend
php artisan serve --host=0.0.0.0 --port=8000
```

**Terminal 2 - Frontend:**

```bash
cd app/frontend
npm start
```

**Terminal 3 - ngrok untuk Frontend:**

```bash
ngrok http 3000
```

**Terminal 4 - ngrok untuk Backend (opsional, jika perlu):**

```bash
ngrok http 8000
```

### **Langkah 4: Update Environment Variables**

**File: `app/frontend/.env.local`:**

```env
REACT_APP_API_BASE_URL=https://YOUR_NGROK_URL.ngrok.io
```

**Contoh ngrok URL:** `https://abc123.ngrok.io`

### **Langkah 5: Akses dari HP**

1. **Buka browser di HP:** `https://YOUR_NGROK_URL.ngrok.io`
2. **Install PWA** seperti biasa
3. **HTTPS sudah otomatis** dari ngrok!

---

## 📱 Metode 3: USB Debugging (Android) / Safari Web Inspector (iOS)

### **Android dengan Chrome DevTools:**

1. **Enable USB Debugging** di HP Android:

   - Settings > About Phone > Tap "Build Number" 7x
   - Settings > Developer Options > Enable "USB Debugging"

2. **Connect HP ke komputer via USB**

3. **Buka Chrome di komputer:**

   - `chrome://inspect`
   - Klik "Port forwarding"
   - Add port: `3000` → `localhost:3000`

4. **Buka Chrome di HP:**
   - Buka `localhost:3000` (akan ter-forward ke komputer)
   - Install PWA seperti biasa

### **iOS dengan Safari Web Inspector:**

1. **Enable Web Inspector** di iPhone:

   - Settings > Safari > Advanced > Enable "Web Inspector"

2. **Connect iPhone ke Mac via USB**

3. **Buka Safari di Mac:**

   - Develop > [Your iPhone] > localhost:3000
   - HP akan otomatis membuka halaman

4. **Install PWA** dari Safari di iPhone

---

## 🔍 Metode 4: Localhost dengan Port Forwarding (Android)

### **Setup Port Forwarding di Android:**

1. **Enable USB Debugging** (seperti di atas)

2. **Install ADB:**

```bash
# Windows (Chocolatey)
choco install adb

# Mac
brew install android-platform-tools
```

3. **Forward port:**

```bash
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8000 tcp:8000
```

4. **Buka di HP:** `http://localhost:3000`

**Note:** PWA install mungkin tidak berfungsi dengan HTTP, gunakan metode HTTPS.

---

## ⚙️ Konfigurasi Environment Variables

### **File: `app/frontend/.env.local`**

**Untuk IP Address:**

```env
HTTPS=true
HOST=0.0.0.0
REACT_APP_API_BASE_URL=https://192.168.1.100:8000
```

**Untuk ngrok:**

```env
REACT_APP_API_BASE_URL=https://abc123.ngrok.io
```

**Untuk localhost (USB Debugging):**

```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

### **File: `app/backend/.env`**

**Update CORS:**

```env
APP_URL=https://192.168.1.100:8000
FRONTEND_URL=https://192.168.1.100:3000
```

---

## 🔥 Quick Start (Paling Mudah - ngrok)

```bash
# 1. Install ngrok
# Download dari https://ngrok.com/download

# 2. Setup authtoken
ngrok config add-authtoken YOUR_TOKEN

# 3. Start backend
cd app/backend
php artisan serve --host=0.0.0.0 --port=8000

# 4. Start frontend
cd app/frontend
npm start

# 5. Start ngrok (terminal baru)
ngrok http 3000

# 6. Update .env.local dengan ngrok URL
# REACT_APP_API_BASE_URL=https://abc123.ngrok.io

# 7. Buka di HP: https://abc123.ngrok.io
```

---

## ⚠️ Troubleshooting

### **Certificate Error di HP?**

**Solusi:**

- **Android Chrome:** Klik "Advanced" > "Proceed to site"
- **iOS Safari:** Settings > General > About > Certificate Trust Settings > Enable certificate

### **Tidak Bisa Connect dari HP?**

**Cek:**

1. ✅ HP dan komputer dalam WiFi yang sama
2. ✅ Firewall tidak memblokir port 3000 dan 8000
3. ✅ IP address benar
4. ✅ Server sudah running

### **CORS Error?**

**Update `app/backend/config/cors.php`:**

```php
'allowed_origins' => [
    'https://192.168.1.100:3000',
    'https://YOUR_NGROK_URL.ngrok.io',
    'http://localhost:3000',
],
```

### **PWA Install Tidak Muncul?**

**Cek:**

1. ✅ Menggunakan HTTPS (kecuali localhost)
2. ✅ Service Worker ter-register
3. ✅ Manifest.json ter-load
4. ✅ Browser support PWA (Chrome/Safari)

---

## 📋 Checklist

- [ ] HP dan komputer dalam **WiFi yang sama**
- [ ] **HTTPS setup** (mkcert atau ngrok)
- [ ] **CORS dikonfigurasi** dengan benar
- [ ] **Environment variables** sudah di-update
- [ ] **Firewall** tidak memblokir port
- [ ] **Service Worker** ter-register
- [ ] **Manifest.json** ter-load

---

## 🎯 Rekomendasi

**Untuk Development:**

- ✅ **Gunakan ngrok** - Paling mudah dan cepat
- ✅ **Gratis** dengan batasan (1 tunnel)
- ✅ **HTTPS otomatis**

**Untuk Production:**

- ✅ **Setup HTTPS** dengan certificate yang valid
- ✅ **Domain name** yang proper
- ✅ **SSL certificate** dari Let's Encrypt atau provider lain

---

## ✅ Kesimpulan

**Ya, bisa menggunakan IP address!**

- ✅ **Metode 1:** Setup HTTPS lokal dengan mkcert (complex)
- ✅ **Metode 2:** Gunakan ngrok (paling mudah) ⭐
- ✅ **Metode 3:** USB Debugging (Android/iOS)
- ✅ **Metode 4:** Port forwarding (Android)

**Rekomendasi: Gunakan ngrok untuk development - paling mudah dan cepat! 🚀**




