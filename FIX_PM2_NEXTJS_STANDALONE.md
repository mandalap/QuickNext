# 🔧 Fix PM2 Next.js Standalone - Step by Step

## ❌ Masalah

PM2 masih menggunakan `npm start` yang menjalankan `next start`, padahal dengan `output: standalone` harus pakai `node .next/standalone/server.js`.

**Log menunjukkan:**
```
> next start --port 3001
⚠ "next start" does not work with "output: standalone" configuration.
```

---

## ✅ SOLUSI: Update PM2 Config

### Step 1: Cek PM2 Config Saat Ini

```bash
cd /var/www/quickkasir
cat ecosystem.config.js
```

**Cari bagian `quickkasir-landing`** - harusnya masih seperti ini:
```javascript
script: "npm",
args: "start",
```

### Step 2: Edit PM2 Config

```bash
nano ecosystem.config.js
```

**Ubah bagian `quickkasir-landing` dari:**
```javascript
{
  name: "quickkasir-landing",
  cwd: "/var/www/quickkasir/app/beranda",
  script: "npm",
  args: "start",
  env: {
    NODE_ENV: "production",
    PORT: 3001,
    NEXT_PUBLIC_API_URL: "http://api.quickkasir.com",
    NEXT_PUBLIC_APP_URL: "http://app.quickkasir.com",
  },
  error_file: "/var/log/pm2/landing-error.log",
  out_file: "/var/log/pm2/landing-out.log",
  log_date_format: "YYYY-MM-DD HH:mm:ss Z",
},
```

**Menjadi:**
```javascript
{
  name: "quickkasir-landing",
  cwd: "/var/www/quickkasir/app/beranda",
  script: "node",
  args: ".next/standalone/server.js",
  env: {
    NODE_ENV: "production",
    PORT: 3001,
    NEXT_PUBLIC_API_URL: "http://api.quickkasir.com",
    NEXT_PUBLIC_APP_URL: "http://app.quickkasir.com",
  },
  error_file: "/var/log/pm2/landing-error.log",
  out_file: "/var/log/pm2/landing-out.log",
  log_date_format: "YYYY-MM-DD HH:mm:ss Z",
},
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### Step 3: Pastikan Build Standalone Sudah Ada

```bash
cd /var/www/quickkasir/app/beranda

# Cek apakah .next/standalone/server.js ada
ls -la .next/standalone/server.js

# Jika tidak ada, rebuild
rm -rf .next
npm run build

# Verifikasi lagi
ls -la .next/standalone/server.js
```

### Step 4: Restart PM2

```bash
# Stop dan delete process lama
pm2 delete quickkasir-landing

# Start dengan config baru
pm2 start ecosystem.config.js --only quickkasir-landing

# Atau restart semua
pm2 restart ecosystem.config.js

# Save PM2 config
pm2 save
```

### Step 5: Verifikasi

```bash
# Cek status
pm2 status

# Cek logs (tidak boleh ada warning)
pm2 logs quickkasir-landing --lines 10 --nostream
```

**Expected output (tidak ada warning):**
```
/var/log/pm2/landing-out.log last 10 lines:
1|quickkas | 2026-01-15 XX:XX:XX +00:00: - Local:        http://localhost:3001
1|quickkas | 2026-01-15 XX:XX:XX +00:00: - Network:      http://10.153.75.81:3001
1|quickkas | 2026-01-15 XX:XX:XX +00:00: ✓ Ready in XXXms
```

**Tidak boleh ada:**
```
⚠ "next start" does not work with "output: standalone"
```

---

## 🔍 Troubleshooting

### Jika `.next/standalone/server.js` Tidak Ada

```bash
cd /var/www/quickkasir/app/beranda

# Pastikan next.config.js punya output: 'standalone'
grep "output:" next.config.js

# Rebuild
rm -rf .next
npm run build

# Cek lagi
ls -la .next/standalone/server.js
```

### Jika PM2 Masih Error

```bash
# Cek PM2 config sudah benar
cat /var/www/quickkasir/ecosystem.config.js | grep -A 10 "quickkasir-landing"

# Stop semua
pm2 stop all

# Delete dan start ulang
pm2 delete quickkasir-landing
pm2 start ecosystem.config.js
pm2 save
```

### Jika Port 3001 Masih Error

```bash
# Cek apakah port 3001 sudah digunakan
sudo lsof -i :3001

# Kill process jika perlu
sudo kill -9 <PID>

# Restart PM2
pm2 restart quickkasir-landing
```

---

## 📝 Checklist

- [ ] PM2 config sudah di-edit (script: "node", args: ".next/standalone/server.js")
- [ ] Build standalone sudah ada (ls -la .next/standalone/server.js)
- [ ] PM2 sudah di-restart
- [ ] Logs tidak ada warning "next start"
- [ ] Landing page masih bisa diakses (www.quickkasir.com)

---

**Jalankan command di atas step by step, lalu cek logs lagi!**
