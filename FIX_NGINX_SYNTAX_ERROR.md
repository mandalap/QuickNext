# 🔧 Fix Nginx Syntax Error

## ❌ Masalah

```
unexpected "}" in /etc/nginx/sites-enabled/quickkasir-app:45
```

Ada syntax error di line 45 file Nginx config.

---

## ✅ SOLUSI: Fix Nginx Config

### Step 1: Cek Config File

```bash
sudo cat /etc/nginx/sites-available/quickkasir-app
```

**Cari line 45 dan sekitarnya untuk cek syntax error.**

### Step 2: Edit Config File

```bash
sudo nano /etc/nginx/sites-available/quickkasir-app
```

**Pastikan config lengkap dan benar seperti ini:**

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

**Catatan penting:**
- Setiap `{` harus ada `}` yang matching
- Setiap `location` block harus ditutup dengan `}`
- Setiap `server` block harus ditutup dengan `}`
- Tidak ada extra `}` yang tidak perlu

### Step 3: Test Config

```bash
sudo nginx -t
```

**Jika masih error, cek:**
- Line number yang disebutkan (line 45)
- Apakah ada `}` yang tidak matching
- Apakah ada `location` block yang tidak ditutup

### Step 4: Reload Nginx

```bash
sudo systemctl reload nginx
```

---

## 🔍 Common Syntax Errors

### Error 1: Missing Closing Brace
```nginx
location / {
    try_files $uri $uri/ /index.html;
# Missing }
```

### Error 2: Extra Closing Brace
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
}  # Extra brace
```

### Error 3: Missing Semicolon
```nginx
add_header X-Frame-Options "SAMEORIGIN" always  # Missing ;
```

---

## 📋 Quick Fix

Jika tidak yakin, copy-paste config lengkap ini:

```bash
sudo nano /etc/nginx/sites-available/quickkasir-app
```

**Hapus semua isi, lalu paste ini:**

```nginx
server {
    listen 80;
    server_name app.quickkasir.com;

    root /var/www/quickkasir/app/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /manifest.json {
        add_header Cache-Control "public, max-age=3600";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

**Test & Reload:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

**Jalankan command di atas untuk fix syntax error!**
