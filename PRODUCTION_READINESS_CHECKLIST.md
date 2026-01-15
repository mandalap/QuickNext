# 🔒 Production Readiness Checklist - QuickKasir POS System

## 📋 Analisis Keamanan & Kesiapan Production

**Tanggal Analisis:** 15 Januari 2026  
**Status:** ⚠️ Perlu Perbaikan Sebelum Deploy ke VPS

---

## 🚨 PRIORITAS TINGGI (Harus Diperbaiki Sebelum Deploy)

### 1. **Environment Variables & Configuration** ⚠️

#### Backend (.env)
- [ ] **APP_DEBUG=false** - Pastikan tidak ada debug mode di production
- [ ] **APP_ENV=production** - Set environment ke production
- [ ] **APP_KEY** - Generate key baru untuk production (`php artisan key:generate`)
- [ ] **DB_PASSWORD** - Gunakan password yang kuat (min 16 karakter, mix alphanumeric + symbols)
- [ ] **MIDTRANS keys** - Pastikan menggunakan production keys (bukan sandbox)
- [ ] **VAPID keys** - Generate keys baru untuk production
- [ ] **CORS origins** - Hapus localhost, hanya allow domain production

#### Frontend (.env.production)
- [ ] **REACT_APP_BACKEND_URL** - Set ke production API URL (HTTPS)
- [ ] **NODE_ENV=production** - Pastikan production mode
- [ ] Tidak ada hardcoded localhost URLs

#### Checklist:
```bash
# Backend
cd app/backend
cp .env.example .env
php artisan key:generate
# Edit .env dan set:
# APP_DEBUG=false
# APP_ENV=production
# APP_URL=https://api.yourdomain.com
# FRONTEND_URL=https://app.yourdomain.com
# DB_PASSWORD=strong_password_here
# MIDTRANS_IS_PRODUCTION=true

# Frontend
cd app/frontend
# Buat .env.production
# REACT_APP_BACKEND_URL=https://api.yourdomain.com
# NODE_ENV=production
```

---

### 2. **Security Headers** ⚠️

#### Yang Perlu Ditambahkan:
- [ ] **X-Frame-Options: SAMEORIGIN** - Prevent clickjacking
- [ ] **X-Content-Type-Options: nosniff** - Prevent MIME sniffing
- [ ] **X-XSS-Protection: 1; mode=block** - XSS protection
- [ ] **Strict-Transport-Security (HSTS)** - Force HTTPS
- [ ] **Content-Security-Policy (CSP)** - XSS protection
- [ ] **Referrer-Policy** - Control referrer information

#### Implementation:
**Backend (Laravel Middleware):**
```php
// app/backend/app/Http/Middleware/SecurityHeaders.php
public function handle($request, Closure $next)
{
    $response = $next($request);
    
    return $response
        ->header('X-Frame-Options', 'SAMEORIGIN')
        ->header('X-Content-Type-Options', 'nosniff')
        ->header('X-XSS-Protection', '1; mode=block')
        ->header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        ->header('Referrer-Policy', 'strict-origin-when-cross-origin');
}
```

**Nginx/Apache:**
- Setup di web server level (lebih efisien)

---

### 3. **CORS Configuration** ⚠️

#### Current Issue:
- Masih allow localhost di production
- Pattern matching terlalu permissive

#### Fix:
```php
// app/backend/config/cors.php
'allowed_origins' => array_filter([
    env('FRONTEND_URL', 'https://app.yourdomain.com'),
    env('LANDING_URL', 'https://yourdomain.com'),
    // HAPUS localhost untuk production
]),
'allowed_origins_patterns' => [
    // HAPUS atau comment untuk production
    // '#^http://localhost:\d+$#',
],
```

---

### 4. **Console.log Removal** ⚠️

#### Issue:
- Banyak `console.log` di frontend yang akan expose informasi di production

#### Fix:
- [ ] Setup webpack untuk remove console.log di production build
- [ ] Atau gunakan babel plugin: `babel-plugin-transform-remove-console`

**File:** `app/frontend/craco.config.js` atau `webpack.config.js`

---

### 5. **Error Handling & Logging** ⚠️

#### Backend:
- [ ] Pastikan tidak expose stack trace di production
- [ ] Setup proper error logging (Log::error)
- [ ] Jangan log sensitive data (passwords, tokens)

#### Frontend:
- [ ] Remove console.error yang expose sensitive info
- [ ] Setup error boundary untuk catch React errors
- [ ] Setup error tracking (Sentry, LogRocket, dll)

---

## ⚠️ PRIORITAS SEDANG (Sangat Direkomendasikan)

### 6. **SSL/HTTPS Setup** 🔒

#### Requirements:
- [ ] Install SSL certificate (Let's Encrypt recommended)
- [ ] Setup HTTPS redirect (HTTP → HTTPS)
- [ ] Enable HSTS headers
- [ ] Test SSL dengan SSL Labs: https://www.ssllabs.com/ssltest/

#### Let's Encrypt Setup:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com
```

---

### 7. **Database Security** 🗄️

#### Checklist:
- [ ] **Strong password** untuk database user
- [ ] **Remote access disabled** (jika tidak perlu)
- [ ] **Backup automated** (daily backup recommended)
- [ ] **Database user minimal privileges** (hanya untuk app database)
- [ ] **Connection encryption** (SSL untuk MySQL jika remote)

#### Backup Script:
```bash
#!/bin/bash
# daily-backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u user -p database > /backups/db_$DATE.sql
# Keep only last 7 days
find /backups -name "db_*.sql" -mtime +7 -delete
```

---

### 8. **File Permissions** 📁

#### Recommended:
```bash
# Files
find app/backend -type f -exec chmod 644 {} \;
find app/frontend/build -type f -exec chmod 644 {} \;

# Directories
find app/backend -type d -exec chmod 755 {} \;
find app/frontend/build -type d -exec chmod 755 {} \;

# Storage & Cache (Laravel)
chmod -R 775 app/backend/storage
chmod -R 775 app/backend/bootstrap/cache
```

---

### 9. **Rate Limiting** 🛡️

#### Current Status:
- ✅ Rate limiting sudah ada
- ⚠️ Perlu review untuk production

#### Recommendations:
- [ ] Review rate limits (terlalu ketat bisa block legitimate users)
- [ ] Setup IP whitelist untuk admin endpoints
- [ ] Monitor rate limit hits

---

### 10. **Server Security** 🖥️

#### Firewall (UFW):
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

#### Fail2ban:
```bash
sudo apt install fail2ban
# Setup untuk protect SSH dan web server
```

#### SSH Security:
- [ ] Disable root login
- [ ] Use SSH keys (disable password auth)
- [ ] Change SSH port (optional)

---

## 📊 PRIORITAS RENDAH (Nice to Have)

### 11. **Performance Optimization** ⚡

#### Backend:
- [ ] Enable OPcache di PHP
- [ ] Setup Redis untuk cache & session
- [ ] Enable query caching
- [ ] Setup queue worker untuk background jobs

#### Frontend:
- [ ] Enable gzip compression
- [ ] Setup CDN untuk static assets
- [ ] Optimize images
- [ ] Code splitting (sudah ada di React)

---

### 12. **Monitoring & Logging** 📈

#### Setup:
- [ ] Error tracking (Sentry, Bugsnag)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Log aggregation (ELK, Papertrail)
- [ ] Performance monitoring (New Relic, DataDog)

---

### 13. **Backup Strategy** 💾

#### Automated Backups:
- [ ] Database backup (daily)
- [ ] File storage backup (weekly)
- [ ] Configuration backup (monthly)
- [ ] Test restore procedure

---

### 14. **Documentation** 📚

#### Checklist:
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] Runbook untuk common issues

---

## 🔍 Security Audit Points

### Input Validation ✅
- ✅ Laravel validation di semua endpoints
- ✅ SQL injection protection (Eloquent ORM)
- ⚠️ Review validation rules untuk edge cases

### Authentication ✅
- ✅ Laravel Sanctum
- ✅ Token-based auth
- ⚠️ Consider token rotation

### Authorization ✅
- ✅ Role-based access control
- ✅ Middleware protection
- ✅ Outlet access control

### Data Protection ⚠️
- ⚠️ Token di localStorage (XSS risk)
- ✅ Input sanitization
- ⚠️ Consider httpOnly cookies

---

## 📝 Pre-Deployment Checklist

### Before Deploy:
- [ ] All migrations run successfully
- [ ] Database backup created
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Security headers configured
- [ ] CORS configured for production
- [ ] Rate limiting reviewed
- [ ] Error handling tested
- [ ] Logging configured
- [ ] File permissions set
- [ ] Firewall configured
- [ ] Backup strategy in place

### After Deploy:
- [ ] Test all critical flows
- [ ] Monitor error logs
- [ ] Check performance
- [ ] Verify SSL certificate
- [ ] Test PWA installation
- [ ] Verify backups working

---

## 🎯 Quick Wins (Bisa Dilakukan Sekarang)

1. **Remove console.log dari production build**
2. **Setup security headers middleware**
3. **Update CORS untuk production**
4. **Generate APP_KEY baru**
5. **Set APP_DEBUG=false**

---

## 📞 Support & Resources

- Laravel Security: https://laravel.com/docs/security
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- SSL Labs Test: https://www.ssllabs.com/ssltest/

---

**Last Updated:** 15 Januari 2026  
**Next Review:** Setelah implementasi security headers
