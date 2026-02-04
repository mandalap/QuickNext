# 🖨️ QuickKasir Print Server

Local print server untuk sistem POS QuickKasir yang memungkinkan **silent printing** (cetak otomatis tanpa dialog) ke thermal printer.

## 📋 Fitur

- ✅ **Silent Printing** - Cetak langsung tanpa dialog browser
- ✅ **Auto-detect Printer** - Deteksi otomatis USB thermal printer
- ✅ **Network Printer Support** - Support printer via jaringan
- ✅ **Flexible Width** - Auto-adjust untuk printer 58mm & 80mm 🆕
- ✅ **Auto-start Service** - Jalan otomatis saat Windows boot
- ✅ **Fallback to Browser** - Otomatis pakai browser print jika server offline
- ✅ **ESC/POS Commands** - Support thermal printer 58mm & 80mm
- ✅ **REST API** - Mudah diintegrasikan dengan aplikasi web
- ✅ **Word Wrapping** - Text panjang otomatis wrap sesuai lebar printer 🆕

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd print-server
npm install
```

### 2. Setup Configuration

Copy file `.env.example` menjadi `.env`:

```bash
copy .env.example .env
```

Edit `.env` sesuai kebutuhan:

```env
# Server Port
PORT=3001

# Printer Type: usb atau network
PRINTER_TYPE=usb

# USB Printer (opsional - kosongkan untuk auto-detect)
PRINTER_VID=
PRINTER_PID=

# Network Printer (hanya jika PRINTER_TYPE=network)
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
```

### 3. Cek Printer Anda

Untuk melihat printer USB yang tersedia:

```bash
npm run test
```

atau

```bash
node list-printers.js
```

Output akan menampilkan VID dan PID printer Anda:

```
✅ Found 1 printer(s):

Printer #1:
  VID (Vendor ID):  1234
  PID (Product ID): 5678
  Manufacturer: EPSON
  Product: TM-T82
```

Jika ingin menggunakan printer tertentu, masukkan VID/PID ke `.env`.

### 4. Jalankan Server

**Development mode:**
```bash
npm start
```

**Install sebagai Windows Service** (recommended untuk production):
```bash
npm run install-service
```

Service akan otomatis jalan saat Windows boot.

---

## 🔧 Konfigurasi Printer

### USB Thermal Printer

1. Pastikan printer terhubung via USB
2. Install driver printer (jika diperlukan)
3. Set `PRINTER_TYPE=usb` di `.env`
4. Jalankan `node list-printers.js` untuk cek
5. Start server

### Network Thermal Printer

1. Pastikan printer terhubung ke jaringan yang sama
2. Cari IP address printer (biasanya ada di settings printer)
3. Set konfigurasi di `.env`:
   ```env
   PRINTER_TYPE=network
   PRINTER_IP=192.168.1.100
   PRINTER_PORT=9100
   ```
4. Start server

---

## 📡 API Endpoints

### Health Check
```http
GET http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "service": "QuickKasir Print Server",
  "version": "1.0.0",
  "printer": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Printer Status
```http
GET http://localhost:3001/printer/status
```

Response:
```json
{
  "connected": true,
  "type": "usb",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Print
```http
POST http://localhost:3001/printer/test
```

Response:
```json
{
  "success": true,
  "message": "Test print successful"
}
```

### Print Receipt
```http
POST http://localhost:3001/print/receipt
Content-Type: application/json

{
  "order": { ... },
  "business": { ... },
  "outlet": { ... },
  "items": [ ... ],
  "payments": [ ... ]
}
```

Response:
```json
{
  "success": true,
  "message": "Receipt printed successfully"
}
```

---

## 🎯 Integrasi dengan React PWA

Print server sudah terintegrasi dengan aplikasi React PWA Anda.

### Cara Kerja:

1. **Auto-detect**: Saat modal print dibuka, aplikasi akan cek apakah print server tersedia
2. **Silent Print**: Jika tersedia, tombol "Print (Thermal)" akan muncul dan cetak langsung tanpa dialog
3. **Fallback**: Jika server offline, otomatis pakai browser print dengan dialog

### Status Indicator:

- 🟢 **Thermal printer connected** - Print server aktif, siap cetak
- 🔴 **Using browser print** - Print server offline, pakai browser

### Environment Variable (React):

Tambahkan di `.env` atau `.env.local` di folder `app/frontend`:

```env
REACT_APP_PRINT_SERVER_URL=http://localhost:3001
```

---

## 🛠️ Troubleshooting

### Printer tidak terdeteksi

**Solusi:**
1. Pastikan printer nyala dan terhubung
2. Coba cabut dan pasang ulang kabel USB
3. Install driver printer
4. Jalankan `node list-printers.js` untuk cek
5. Restart print server

### Print server tidak bisa start

**Solusi:**
1. Cek apakah port 3001 sudah dipakai:
   ```bash
   netstat -ano | findstr :3001
   ```
2. Ganti port di `.env` jika perlu
3. Cek log error di `error.log`

### Struk tidak keluar

**Solusi:**
1. Test print dulu: `npm run test` atau POST ke `/printer/test`
2. Cek apakah kertas habis
3. Cek koneksi printer
4. Restart printer dan print server

### Service tidak auto-start

**Solusi:**
1. Buka Services (tekan Win+R, ketik `services.msc`)
2. Cari "QuickKasir Print Server"
3. Klik kanan → Properties
4. Set "Startup type" ke "Automatic"
5. Klik "Start"

---

## 📦 Windows Service Management

### Install Service
```bash
npm run install-service
```

### Uninstall Service
```bash
npm run uninstall-service
```

### Check Service Status
1. Tekan `Win + R`
2. Ketik `services.msc`
3. Cari "QuickKasir Print Server"

### View Logs
Log tersimpan di:
- `error.log` - Error logs
- `combined.log` - All logs

---

## 🔒 Security Notes

Print server hanya listen di `localhost` (127.0.0.1) untuk keamanan.

Jika ingin akses dari komputer lain (misalnya tablet kasir):
1. Ubah di `server.js`:
   ```javascript
   app.listen(PORT, '0.0.0.0', () => { ... })
   ```
2. Tambahkan firewall rule untuk port 3001
3. Update `REACT_APP_PRINT_SERVER_URL` di PWA dengan IP komputer server

---

## 📝 Supported Printers

Print server support semua thermal printer yang compatible dengan ESC/POS:

**Tested:**
- EPSON TM-T82, TM-T88
- Star TSP100, TSP650
- Xprinter XP-80C, XP-N160
- Rongta RP80, RP326
- Bixolon SRP-350

**Thermal Printer Size:**
- 58mm (2 inch)
- 80mm (3 inch)

---

## 🆘 Support

Jika ada masalah:

1. Cek log di `error.log` dan `combined.log`
2. Test printer dengan `npm run test`
3. Pastikan printer driver terinstall
4. Restart print server dan printer

---

## 📄 License

MIT License - QuickKasir © 2024
