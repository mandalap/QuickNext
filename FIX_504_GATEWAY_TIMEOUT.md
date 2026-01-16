# 🔧 Fix 504 Gateway Timeout & Next.js Standalone Warning

## ❌ Masalah

1. **Next.js Warning:** `"next start" does not work with "output: standalone"`
2. **504 Gateway Timeout:** `app.quickkasir.com` tidak bisa connect ke port 3000

---

## ✅ SOLUSI 1: Fix Next.js Standalone Server

Next.js dengan `output: standalone` harus menggunakan `node .next/standalone/server.js`, bukan `npm start`.

### Update PM2 Config

Jalankan di VPS:

```bash
cd /var/www/quickkasir

# Edit PM2 ecosystem config
nano ecosystem.config.js
```

**Update bagian `quickkasir-landing` menjadi:**

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

**Restart PM2:**

```bash
pm2 restart quickkasir-landing
pm2 save
```

---

## ✅ SOLUSI 2: Fix 504 Gateway Timeout (Frontend App)

### 2.1 Cek Status Frontend App

```bash
# Cek apakah frontend running
pm2 status

# Cek logs frontend
pm2 logs quickkasir-frontend --lines 20 --nostream
```

### 2.2 Jika Frontend Tidak Running

```bash
cd /var/www/quickkasir/app/frontend

# Pastikan build sudah ada
ls -la build/ | head -5

# Jika belum ada build, build dulu
npm run build

# Start dengan PM2
pm2 restart quickkasir-frontend
# atau
pm2 start ecosystem.config.js --only quickkasir-frontend
```

### 2.3 Cek Port 3000

```bash
# Cek apakah port 3000 listening
sudo netstat -tlnp | grep 3000
# atau
sudo ss -tlnp | grep 3000

# Cek apakah ada process di port 3000
sudo lsof -i :3000
```

### 2.4 Test Connection dari Nginx

```bash
# Test apakah Nginx bisa connect ke port 3000
curl -I http://127.0.0.1:3000

# Jika error, cek Nginx config
sudo nginx -t
sudo cat /etc/nginx/sites-available/quickkasir-app
```

### 2.5 Update Nginx Config (Jika Perlu)

```bash
sudo nano /etc/nginx/sites-available/quickkasir-app
```

**Pastikan config seperti ini:**

```nginx
server {
    listen 80;
    server_name app.quickkasir.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Reload Nginx:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔍 Verifikasi

### 1. Cek PM2 Status

```bash
pm2 status
```

**Expected output:**

```
┌────┬────────────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id │ name                   │ status      │ cpu     │ mem     │ uptime   │
├────┼────────────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0  │ quickkasir-frontend    │ online      │ 0%      │ 50mb    │ 5m       │
│ 1  │ quickkasir-landing     │ online      │ 0%      │ 60mb    │ 2m       │
└────┴────────────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

### 2. Cek Logs (Tidak Ada Warning)

```bash
pm2 logs quickkasir-landing --lines 10 --nostream
```

**Tidak boleh ada warning:** `"next start" does not work with "output: standalone"`

### 3. Test di Browser

- ✅ `https://www.quickkasir.com` - Landing page harus load
- ✅ `https://app.quickkasir.com` - Frontend app harus load (tidak 504)
- ✅ Klik "Login" di landing page - harus redirect ke `app.quickkasir.com/login`

---

## 📝 Checklist

- [ ] PM2 config untuk `quickkasir-landing` sudah di-update (pakai `node .next/standalone/server.js`)
- [ ] PM2 sudah di-restart (`pm2 restart quickkasir-landing`)
- [ ] Frontend app running di port 3000 (`pm2 status` menunjukkan `online`)
- [ ] Port 3000 listening (`netstat` atau `ss` menunjukkan port 3000)
- [ ] Nginx config sudah benar (proxy ke `127.0.0.1:3000`)
- [ ] Nginx sudah di-reload (`sudo systemctl reload nginx`)
- [ ] Test di browser - tidak ada 504 error

---

## 🐛 Troubleshooting

### Masih 504 Error?

1. **Cek apakah frontend benar-benar running:**

   ```bash
   curl http://127.0.0.1:3000
   ```

2. **Cek Nginx error logs:**

   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Cek firewall:**

   ```bash
   sudo ufw status
   sudo ufw allow 3000/tcp  # Jika belum allow
   ```

4. **Restart semua:**
   ```bash
   pm2 restart all
   sudo systemctl restart nginx
   ```

---

**Jalankan command di atas, lalu test lagi di browser!**
