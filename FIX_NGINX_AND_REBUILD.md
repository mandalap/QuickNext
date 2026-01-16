# 🔧 Fix Nginx Error & Rebuild Next.js

## ❌ Masalah

1. **Nginx syntax error** setelah hapus redirect block
2. **Next.js perlu rebuild** untuk memastikan semua file benar

---

## ✅ SOLUSI 1: Fix Nginx Config

```bash
# 1. Restore config yang benar (tanpa redirect block yang bermasalah)
sudo tee /etc/nginx/sites-available/quickkasir-landing > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name www.quickkasir.com quickkasir.com;

    # Serve static files directly (CSS, JS, fonts, images)
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

    # Serve public files (logo, images, etc)
    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp)$ {
        root /var/www/quickkasir/app/beranda/public;
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

    # Proxy semua request lainnya ke Next.js server
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
EOF

# 2. Test Nginx config
sudo nginx -t

# 3. Reload Nginx
sudo systemctl reload nginx
```

---

## ✅ SOLUSI 2: Rebuild Next.js

```bash
cd /var/www/quickkasir/app/beranda

# 1. Stop PM2
pm2 stop quickkasir-landing

# 2. Backup .next folder (optional)
echo "=== Backing up .next folder ==="
cp -r .next .next.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "No .next folder to backup"

# 3. Remove old build
echo ""
echo "=== Removing old build ==="
rm -rf .next

# 4. Rebuild Next.js
echo ""
echo "=== Rebuilding Next.js ==="
npm run build

# 5. Fix permissions
echo ""
echo "=== Fixing permissions ==="
sudo chown -R www-data:www-data .next
sudo chmod -R 755 .next

# 6. Restart PM2
echo ""
echo "=== Restarting PM2 ==="
pm2 restart quickkasir-landing

# 7. Verifikasi
echo ""
echo "=== Verification ==="
pm2 status | grep landing
sleep 3
curl -s http://127.0.0.1:3001 | grep -i "quickkasir" | head -3
```

---

## 🧪 Test Setelah Fix

```bash
# Test di browser
echo "=== Testing URLs ==="
echo "1. http://www.quickkasir.com"
echo "2. http://quickkasir.com"
echo ""
echo "Test dengan curl:"
curl -s http://www.quickkasir.com | grep -i "quickkasir" | head -3
curl -s http://quickkasir.com | grep -i "quickkasir" | head -3
```

---

**Jalankan command di atas untuk fix Nginx dan rebuild Next.js!**
