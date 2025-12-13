# 🌐 Konfigurasi Nginx untuk quickKasir

## 📋 Overview

Konfigurasi Nginx untuk 3 subdomain:
- `quickkasir.com` - Landing Page
- `app.quickkasir.com` - POS Application  
- `api.quickkasir.com` - Backend API

---

## 🔧 1. Landing Page (quickkasir.com)

**File:** `/etc/nginx/sites-available/quickkasir.com`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name quickkasir.com www.quickkasir.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name quickkasir.com www.quickkasir.com;
    
    root /var/www/quickkasir.com/.next;
    index index.html;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/quickkasir.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quickkasir.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Static Files
    location /_next/static {
        alias /var/www/quickkasir.com/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /public {
        alias /var/www/quickkasir.com/public;
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # Next.js
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Logging
    access_log /var/log/nginx/quickkasir.com.access.log;
    error_log /var/log/nginx/quickkasir.com.error.log;
}
```

---

## 💻 2. POS Application (app.quickkasir.com)

**File:** `/etc/nginx/sites-available/app.quickkasir.com`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name app.quickkasir.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.quickkasir.com;
    
    root /var/www/app.quickkasir.com/build;
    index index.html;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.quickkasir.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.quickkasir.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Static Assets (CSS, JS, Images)
    location /static {
        alias /var/www/app.quickkasir.com/build/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /public {
        alias /var/www/app.quickkasir.com/build/public;
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # React Router - semua route ke index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Logging
    access_log /var/log/nginx/app.quickkasir.com.access.log;
    error_log /var/log/nginx/app.quickkasir.com.error.log;
}
```

---

## 🔌 3. Backend API (api.quickkasir.com)

**File:** `/etc/nginx/sites-available/api.quickkasir.com`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.quickkasir.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.quickkasir.com;
    
    root /var/www/api.quickkasir.com/public;
    index index.php;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.quickkasir.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.quickkasir.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Increase upload size
    client_max_body_size 20M;
    
    # Laravel - All requests to index.php
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    # PHP-FPM Configuration
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
        
        # Timeout settings
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Deny access to storage and bootstrap
    location ~ ^/(storage|bootstrap) {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Logging
    access_log /var/log/nginx/api.quickkasir.com.access.log;
    error_log /var/log/nginx/api.quickkasir.com.error.log;
}
```

---

## 🚀 Setup Nginx

### **1. Enable Sites**

```bash
# Create symlinks
sudo ln -s /etc/nginx/sites-available/quickkasir.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/app.quickkasir.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.quickkasir.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### **2. Setup SSL dengan Let's Encrypt**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate SSL untuk semua subdomain
sudo certbot --nginx -d quickkasir.com -d www.quickkasir.com
sudo certbot --nginx -d app.quickkasir.com
sudo certbot --nginx -d api.quickkasir.com

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## 📊 Performance Optimization

### **Enable Gzip di `/etc/nginx/nginx.conf`:**

```nginx
http {
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript 
               image/svg+xml;
    gzip_min_length 1000;
}
```

### **Enable Caching:**

```nginx
# Di dalam server block
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 🔒 Security Hardening

### **Rate Limiting:**

```nginx
# Di dalam http block di nginx.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

# Di dalam api.quickkasir.com server block
location /api/login {
    limit_req zone=login_limit burst=3 nodelay;
    try_files $uri $uri/ /index.php?$query_string;
}

location /api {
    limit_req zone=api_limit burst=20 nodelay;
    try_files $uri $uri/ /index.php?$query_string;
}
```

---

## 📝 Checklist

- [ ] Semua konfigurasi sudah dibuat
- [ ] Symlinks sudah dibuat
- [ ] `nginx -t` tidak ada error
- [ ] SSL certificate sudah di-install
- [ ] Nginx sudah di-reload
- [ ] Semua subdomain bisa diakses
- [ ] HTTPS redirect bekerja
- [ ] Static files bisa di-load
- [ ] API endpoints bisa diakses

---

## 🐛 Troubleshooting

### **Check Nginx Status:**
```bash
sudo systemctl status nginx
```

### **Check Error Logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

### **Test Configuration:**
```bash
sudo nginx -t
```

### **Reload Nginx:**
```bash
sudo systemctl reload nginx
```

