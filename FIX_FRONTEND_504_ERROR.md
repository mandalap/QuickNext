# 🔧 Fix Frontend React App 504 Gateway Timeout

## ❌ Masalah

- ✅ Next.js landing page sudah OK (tidak ada warning)
- ❌ Frontend React app (`app.quickkasir.com`) tidak bisa diakses - **504 Gateway Timeout**

---

## ✅ SOLUSI: Diagnose & Fix Frontend App

### Step 1: Cek PM2 Status Frontend

```bash
pm2 status
```

**Cek apakah `quickkasir-frontend` status `online` atau `errored`/`stopped`.**

### Step 2: Cek Logs Frontend

```bash
pm2 logs quickkasir-frontend --lines 20 --nostream
```

**Cari error messages:**
- Port already in use?
- Build not found?
- Module not found?
- Other errors?

### Step 3: Cek Port 3000

```bash
# Cek apakah port 3000 listening
sudo netstat -tlnp | grep 3000
# atau
sudo ss -tlnp | grep 3000

# Cek process di port 3000
sudo lsof -i :3000
```

**Jika port 3000 tidak listening, berarti frontend tidak running.**

### Step 4: Test Connection ke Port 3000

```bash
# Test dari server sendiri
curl -I http://127.0.0.1:3000

# Jika error "Connection refused", berarti frontend tidak running
```

### Step 5: Cek Build Directory

```bash
cd /var/www/quickkasir/app/frontend
ls -la build/

# Cek apakah build/index.html ada
ls -la build/index.html
```

**Jika build tidak ada atau kosong, perlu rebuild.**

---

## 🔧 FIX: Restart Frontend App

### Opsi 1: Jika Frontend Tidak Running

```bash
cd /var/www/quickkasir/app/frontend

# Pastikan build ada
if [ ! -f "build/index.html" ]; then
    echo "Build tidak ada, rebuilding..."
    npm run build
fi

# Start dengan PM2
cd /var/www/quickkasir
pm2 restart quickkasir-frontend

# Atau jika tidak ada di PM2
pm2 start ecosystem.config.js --only quickkasir-frontend
pm2 save
```

### Opsi 2: Jika Port 3000 Terpakai oleh Process Lain

```bash
# Cek process di port 3000
sudo lsof -i :3000

# Kill process jika perlu (ganti <PID> dengan PID yang ditemukan)
sudo kill -9 <PID>

# Restart frontend
pm2 restart quickkasir-frontend
```

### Opsi 3: Rebuild Frontend

```bash
cd /var/www/quickkasir/app/frontend

# Clear build lama
rm -rf build

# Rebuild
npm run build

# Verifikasi build
ls -la build/index.html

# Restart PM2
cd /var/www/quickkasir
pm2 restart quickkasir-frontend
```

### Opsi 4: Cek PM2 Config untuk Frontend

```bash
cd /var/www/quickkasir
cat ecosystem.config.js | grep -A 15 "quickkasir-frontend"
```

**Pastikan config seperti ini:**
```javascript
{
  name: "quickkasir-frontend",
  cwd: "/var/www/quickkasir/app/frontend",
  script: "npm",
  args: "start",
  env: {
    NODE_ENV: "production",
    PORT: 3000,
    REACT_APP_BACKEND_URL: "http://api.quickkasir.com",
    REACT_APP_API_BASE_URL: "http://api.quickkasir.com/api",
  },
  error_file: "/var/log/pm2/frontend-error.log",
  out_file: "/var/log/pm2/frontend-out.log",
  log_date_format: "YYYY-MM-DD HH:mm:ss Z",
},
```

---

## 🔍 Verifikasi Nginx Config

### Cek Nginx Config untuk app.quickkasir.com

```bash
sudo cat /etc/nginx/sites-available/quickkasir-app
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
}
```

### Test & Reload Nginx

```bash
# Test config
sudo nginx -t

# Reload jika OK
sudo systemctl reload nginx

# Cek Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📋 Quick Diagnostic Commands

Jalankan semua command ini untuk diagnose:

```bash
echo "=== 1. PM2 Status ==="
pm2 status

echo ""
echo "=== 2. Frontend Logs ==="
pm2 logs quickkasir-frontend --lines 10 --nostream

echo ""
echo "=== 3. Port 3000 Check ==="
sudo netstat -tlnp | grep 3000 || echo "Port 3000 tidak listening"

echo ""
echo "=== 4. Test Connection ==="
curl -I http://127.0.0.1:3000 2>&1 | head -5

echo ""
echo "=== 5. Build Check ==="
ls -la /var/www/quickkasir/app/frontend/build/index.html 2>/dev/null || echo "Build tidak ada"

echo ""
echo "=== 6. Nginx Config ==="
sudo cat /etc/nginx/sites-available/quickkasir-app | grep -A 5 "proxy_pass"
```

---

## 🔧 Quick Fix (Copy-Paste)

Jika frontend tidak running, jalankan:

```bash
# 1. Cek status
pm2 status

# 2. Jika frontend tidak running, start
cd /var/www/quickkasir/app/frontend

# 3. Pastikan build ada
if [ ! -f "build/index.html" ]; then
    echo "Building frontend..."
    npm run build
fi

# 4. Start/restart dengan PM2
cd /var/www/quickkasir
pm2 restart quickkasir-frontend || pm2 start ecosystem.config.js --only quickkasir-frontend
pm2 save

# 5. Verifikasi
sleep 3
curl -I http://127.0.0.1:3000

# 6. Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📝 Checklist

- [ ] PM2 status menunjukkan `quickkasir-frontend` online
- [ ] Port 3000 listening (netstat/ss menunjukkan port 3000)
- [ ] `curl http://127.0.0.1:3000` mengembalikan response (bukan Connection refused)
- [ ] Build directory ada (`build/index.html` exists)
- [ ] Nginx config benar (proxy_pass ke 127.0.0.1:3000)
- [ ] Nginx sudah di-reload
- [ ] Test di browser - `app.quickkasir.com` bisa diakses

---

**Jalankan diagnostic commands di atas, lalu kirim hasilnya untuk analisis lebih lanjut!**
