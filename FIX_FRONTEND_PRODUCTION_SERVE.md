# 🔧 Fix Frontend Production - Serve Build Static Files

## ❌ Masalah

Frontend masih menggunakan **development server** (`craco start`) yang:
- Stuck di "Starting the development server..."
- Tidak pernah selesai starting
- Tidak cocok untuk production

**Di production, kita harus serve build static files, bukan dev server!**

---

## ✅ SOLUSI: Serve Build dengan `serve` Package

### Step 1: Install `serve` Package

```bash
cd /var/www/quickkasir/app/frontend
npm install -g serve
# atau install lokal
npm install --save-dev serve
```

### Step 2: Update PM2 Config

```bash
cd /var/www/quickkasir
nano ecosystem.config.js
```

**Ubah bagian `quickkasir-frontend` dari:**
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

**Menjadi (Opsi 1 - Global serve):**
```javascript
{
  name: "quickkasir-frontend",
  cwd: "/var/www/quickkasir/app/frontend",
  script: "serve",
  args: "-s build -l 3000",
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

**Atau (Opsi 2 - Local serve via npx):**
```javascript
{
  name: "quickkasir-frontend",
  cwd: "/var/www/quickkasir/app/frontend",
  script: "npx",
  args: "serve -s build -l 3000",
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

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### Step 3: Pastikan Build Ada

```bash
cd /var/www/quickkasir/app/frontend
ls -la build/index.html

# Jika tidak ada, build dulu
npm run build
```

### Step 4: Restart PM2

```bash
cd /var/www/quickkasir

# Stop dan delete process lama
pm2 delete quickkasir-frontend

# Start dengan config baru
pm2 start ecosystem.config.js --only quickkasir-frontend

# Save
pm2 save
```

### Step 5: Verifikasi

```bash
# Cek status
pm2 status

# Cek logs (harus ada "Accepting connections")
pm2 logs quickkasir-frontend --lines 10 --nostream

# Test connection
curl -I http://127.0.0.1:3000

# Cek port listening
sudo ss -tlnp | grep 3000
```

**Expected output dari logs:**
```
serve: Starting up...
serve: Accepting connections at http://localhost:3000
```

---

## 🔄 Alternatif: Serve dengan Nginx (Lebih Efisien)

Jika ingin lebih efisien, serve build folder langsung dengan Nginx (tidak perlu Node.js process):

### Update Nginx Config

```bash
sudo nano /etc/nginx/sites-available/quickkasir-app
```

**Ubah dari proxy ke static files:**
```nginx
server {
    listen 80;
    server_name app.quickkasir.com;

    root /var/www/quickkasir/app/frontend/build;
    index index.html;

    # SPA routing - semua request ke index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker - no cache
    location /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Manifest - cache 1 hour
    location /manifest.json {
        add_header Cache-Control "public, max-age=3600";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Test & Reload:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Stop PM2 frontend (tidak perlu lagi):**
```bash
pm2 delete quickkasir-frontend
pm2 save
```

---

## 📋 Quick Fix (Copy-Paste)

**Opsi A: Pakai `serve` dengan PM2**
```bash
# 1. Install serve
cd /var/www/quickkasir/app/frontend
npm install -g serve

# 2. Update PM2 config
cd /var/www/quickkasir
nano ecosystem.config.js
# (Ubah quickkasir-frontend: script: "serve", args: "-s build -l 3000")

# 3. Restart
pm2 delete quickkasir-frontend
pm2 start ecosystem.config.js --only quickkasir-frontend
pm2 save

# 4. Test
sleep 3
curl -I http://127.0.0.1:3000
```

**Opsi B: Pakai Nginx (Recommended - Lebih Efisien)**
```bash
# 1. Update Nginx config
sudo nano /etc/nginx/sites-available/quickkasir-app
# (Ubah ke root /var/www/quickkasir/app/frontend/build)

# 2. Test & reload
sudo nginx -t && sudo systemctl reload nginx

# 3. Stop PM2 frontend (tidak perlu lagi)
pm2 delete quickkasir-frontend
pm2 save
```

---

## 🔍 Verifikasi

### Jika Pakai `serve`:
```bash
pm2 logs quickkasir-frontend --lines 5 --nostream
# Harus ada: "Accepting connections at http://localhost:3000"

curl -I http://127.0.0.1:3000
# Harus return 200 OK
```

### Jika Pakai Nginx:
```bash
curl -I http://app.quickkasir.com
# Harus return 200 OK
```

---

## 📝 Checklist

- [ ] `serve` sudah di-install (jika pakai opsi A)
- [ ] PM2 config sudah di-update (script: "serve", args: "-s build -l 3000")
- [ ] Build folder ada (`build/index.html` exists)
- [ ] PM2 sudah di-restart
- [ ] Port 3000 listening (jika pakai serve)
- [ ] Test connection berhasil
- [ ] Browser bisa akses `app.quickkasir.com`

---

**Rekomendasi: Pakai Opsi B (Nginx) karena lebih efisien - tidak perlu Node.js process untuk serve static files!**
