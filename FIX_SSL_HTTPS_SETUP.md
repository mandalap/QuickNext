# 🔒 Setup SSL/HTTPS untuk app.quickkasir.com

## ❌ Masalah

HTTP sudah OK (200 OK), tapi jika mengakses via HTTPS (`https://app.quickkasir.com`), browser akan menolak karena tidak ada SSL certificate.

---

## ✅ SOLUSI: Setup SSL dengan Let's Encrypt

### Step 1: Install Certbot

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Generate SSL Certificate

```bash
# Generate certificate untuk app.quickkasir.com
sudo certbot --nginx -d app.quickkasir.com

# Atau jika ingin generate untuk semua subdomain sekaligus:
sudo certbot --nginx -d www.quickkasir.com -d quickkasir.com -d app.quickkasir.com -d admin.quickkasir.com -d api.quickkasir.com
```

**Follow prompts:**
- Email: masukkan email Anda
- Agree to terms: `Y`
- Share email: `N` (atau `Y` sesuai preferensi)
- Redirect HTTP to HTTPS: `2` (Redirect) - **PENTING!**

### Step 3: Verifikasi SSL

```bash
# Test SSL certificate
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 4: Cek Nginx Config Setelah SSL

```bash
# Cek config untuk app.quickkasir.com
sudo cat /etc/nginx/sites-available/quickkasir-app
```

**Harus ada 2 server blocks:**
1. HTTP (port 80) - redirect ke HTTPS
2. HTTPS (port 443) - serve static files

---

## 🔄 Alternatif: Setup SSL Manual (Jika Certbot Gagal)

### Step 1: Update Nginx Config untuk HTTPS

```bash
sudo nano /etc/nginx/sites-available/quickkasir-app
```

**Tambah config HTTPS:**

```nginx
# HTTP - Redirect ke HTTPS
server {
    listen 80;
    server_name app.quickkasir.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Serve static files
server {
    listen 443 ssl http2;
    server_name app.quickkasir.com;

    # SSL Certificate (akan di-generate oleh certbot)
    ssl_certificate /etc/letsencrypt/live/app.quickkasir.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.quickkasir.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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

### Step 2: Generate Certificate dengan Certbot

```bash
sudo certbot certonly --nginx -d app.quickkasir.com
```

### Step 3: Test & Reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔍 Verifikasi SSL

### Test dari Server

```bash
# Test HTTP (harus redirect ke HTTPS)
curl -I http://app.quickkasir.com

# Test HTTPS (harus 200 OK)
curl -I https://app.quickkasir.com

# Test SSL certificate
openssl s_client -connect app.quickkasir.com:443 -servername app.quickkasir.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

### Test di Browser

1. Buka: `https://app.quickkasir.com`
2. Harus ada **lock icon** di address bar
3. Tidak ada warning "Not Secure"

---

## 📋 Quick Setup (Copy-Paste)

```bash
# 1. Install certbot
echo "=== 1. Install Certbot ==="
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# 2. Generate certificate
echo ""
echo "=== 2. Generate SSL Certificate ==="
echo "Jalankan: sudo certbot --nginx -d app.quickkasir.com"
echo "Pilih: 2 (Redirect HTTP to HTTPS)"

# 3. Verifikasi
echo ""
echo "=== 3. Verify SSL ==="
sudo certbot certificates

# 4. Test
echo ""
echo "=== 4. Test HTTPS ==="
curl -I https://app.quickkasir.com
```

---

## 🔄 Auto-Renewal Setup

Certbot biasanya sudah setup auto-renewal, tapi pastikan:

```bash
# Cek cron job
sudo systemctl status certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

---

## 🐛 Troubleshooting

### Error: "Failed to obtain certificate"

**Penyebab:**
- DNS belum propagate
- Port 80/443 tidak accessible
- Domain tidak pointing ke server

**Fix:**
```bash
# Cek DNS
dig app.quickkasir.com

# Cek port
sudo netstat -tlnp | grep -E ":(80|443)"
```

### Error: "Certificate already exists"

**Fix:**
```bash
# List certificates
sudo certbot certificates

# Delete jika perlu
sudo certbot delete --cert-name app.quickkasir.com
```

---

## ✅ Checklist

- [ ] Certbot sudah di-install
- [ ] SSL certificate sudah di-generate
- [ ] Nginx config sudah di-update (HTTP redirect + HTTPS)
- [ ] Nginx sudah di-reload
- [ ] HTTPS test return 200 OK
- [ ] Browser tidak ada SSL warning
- [ ] Auto-renewal sudah setup

---

**Jalankan certbot command di atas untuk setup SSL!**
