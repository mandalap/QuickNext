# 🔧 Fix quickkasir.com Masih Menampilkan Laravel

## ❌ Masalah

`quickkasir.com` menampilkan halaman Laravel default (dengan logo Laravel), padahal seharusnya menampilkan landing page Next.js QuickKasir.

**Kemungkinan penyebab:**
1. Nginx config untuk `quickkasir.com` masih mengarah ke backend Laravel
2. Ada config lain yang override config landing page
3. Config landing page tidak aktif atau tidak di-enable

---

## ✅ SOLUSI: Cek & Fix Nginx Config

### Step 1: Cek Semua Config yang Handle quickkasir.com

```bash
# Cek semua config yang ada
sudo ls -la /etc/nginx/sites-available/
sudo ls -la /etc/nginx/sites-enabled/

# Cek config yang handle quickkasir.com
sudo grep -r "quickkasir.com" /etc/nginx/sites-available/
sudo grep -r "quickkasir.com" /etc/nginx/sites-enabled/
```

---

### Step 2: Cek Config Landing Page

```bash
# Cek apakah config landing page ada dan benar
sudo cat /etc/nginx/sites-available/quickkasir-landing

# Cek apakah sudah di-enable
ls -la /etc/nginx/sites-enabled/ | grep landing
```

**Pastikan:**
- Config ada di `/etc/nginx/sites-available/quickkasir-landing`
- Config sudah di-enable (ada symlink di `/etc/nginx/sites-enabled/`)
- Config mengarah ke `proxy_pass http://127.0.0.1:3001` (Next.js), bukan ke Laravel

---

### Step 3: Cek Apakah Ada Config Lain yang Override

```bash
# Cek config admin dan api
sudo cat /etc/nginx/sites-available/quickkasir-admin | grep -A 5 "server_name"
sudo cat /etc/nginx/sites-available/quickkasir-api | grep -A 5 "server_name"
```

**Pastikan config admin dan api TIDAK handle `quickkasir.com`**, hanya handle:
- `admin.quickkasir.com`
- `api.quickkasir.com`

---

### Step 4: Update Config Landing Page (Jika Perlu)

```bash
sudo nano /etc/nginx/sites-available/quickkasir-landing
```

**Pastikan config seperti ini:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name www.quickkasir.com quickkasir.com;

    # Redirect non-www to www
    if ($host = quickkasir.com) {
        return 301 http://www.quickkasir.com$request_uri;
    }

    # Serve static files directly
    location /_next/static {
        alias /var/www/quickkasir/app/beranda/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        
        types {
            text/css css;
            application/javascript js;
            font/woff2 woff2;
            font/woff woff;
            font/ttf ttf;
            image/png png;
            image/jpeg jpg jpeg;
            image/svg+xml svg;
        }
        default_type application/octet-stream;
    }

    # Serve public files
    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp)$ {
        root /var/www/quickkasir/app/beranda/public;
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

    # Proxy ke Next.js server (port 3001)
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
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

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

---

### Step 5: Enable Config Landing Page (Jika Belum)

```bash
# Enable config
sudo ln -sf /etc/nginx/sites-available/quickkasir-landing /etc/nginx/sites-enabled/quickkasir-landing

# Verifikasi
ls -la /etc/nginx/sites-enabled/ | grep landing
```

---

### Step 6: Test & Reload Nginx

```bash
# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

---

### Step 7: Verifikasi Next.js Server Running

```bash
# Cek PM2 status
pm2 status | grep landing

# Cek apakah port 3001 listening
sudo netstat -tlnp | grep 3001

# Test direct access ke Next.js
curl -I http://127.0.0.1:3001
```

**Expected:** HTTP 200 OK

---

## 🔍 Troubleshooting

### Masih Menampilkan Laravel?

1. **Cek apakah ada default config yang masih aktif:**
   ```bash
   ls -la /etc/nginx/sites-enabled/ | grep default
   # Jika ada, hapus: sudo rm /etc/nginx/sites-enabled/default
   ```

2. **Cek apakah config admin/api handle quickkasir.com:**
   ```bash
   sudo grep "server_name.*quickkasir.com" /etc/nginx/sites-available/*
   # Harusnya hanya ada di quickkasir-landing
   ```

3. **Cek Nginx error log:**
   ```bash
   sudo tail -20 /var/log/nginx/error.log
   ```

4. **Restart Nginx (bukan reload):**
   ```bash
   sudo systemctl restart nginx
   ```

---

## ✅ Checklist

- [ ] Config landing page ada di `/etc/nginx/sites-available/quickkasir-landing`
- [ ] Config sudah di-enable (ada symlink di sites-enabled)
- [ ] Config mengarah ke `proxy_pass http://127.0.0.1:3001` (Next.js)
- [ ] Config admin/api TIDAK handle `quickkasir.com`
- [ ] Next.js server running di port 3001
- [ ] Nginx config test berhasil
- [ ] Nginx reloaded/restarted
- [ ] Test di browser - harus menampilkan landing page QuickKasir

---

**Jalankan command di atas untuk fix masalah!**
